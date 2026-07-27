from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from datetime import timedelta
import math
from .models import Route, RouteStop, RouteOptimization, RouteTemplate
from .serializers import (
    RouteSerializer, RouteListSerializer, RouteStopSerializer, RouteStopCreateSerializer,
    RouteOptimizationSerializer, RouteOptimizationCreateSerializer, RouteTemplateSerializer,
    RouteFromTemplateSerializer
)


class RouteViewSet(viewsets.ModelViewSet):
    """ViewSet for managing routes."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Route.objects.filter(
            organization=self.request.user.current_organization
        ).select_related('vehicle', 'driver').prefetch_related('stops').order_by('-planned_start_time')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return RouteListSerializer
        return RouteSerializer
    
    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.current_organization)
    
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["route_type", "status", "optimization_level", "vehicle", "driver"]
    search_fields = ["name", "description"]
    
    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        """Assign vehicle and driver to route."""
        route = self.get_object()
        vehicle_id = request.data.get('vehicle_id')
        driver_id = request.data.get('driver_id')
        
        if vehicle_id:
            from fleet.models import Vehicle
            try:
                vehicle = Vehicle.objects.get(
                    id=vehicle_id,
                    organization=self.request.user.current_organization
                )
                route.vehicle = vehicle
            except Vehicle.DoesNotExist:
                return Response(
                    {'error': 'Vehicle not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        if driver_id:
            from fleet.models import Driver
            try:
                driver = Driver.objects.get(
                    id=driver_id,
                    organization=self.request.user.current_organization
                )
                route.driver = driver
            except Driver.DoesNotExist:
                return Response(
                    {'error': 'Driver not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        route.status = Route.Status.ASSIGNED
        route.save()
        return Response(RouteSerializer(route).data)
    
    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """Start route execution."""
        route = self.get_object()
        if route.status not in [Route.Status.PLANNED, Route.Status.ASSIGNED]:
            return Response(
                {'error': 'Route cannot be started in current status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        route.status = Route.Status.IN_PROGRESS
        route.actual_start_time = timezone.now()
        route.save()
        return Response(RouteSerializer(route).data)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Complete route execution."""
        route = self.get_object()
        if route.status != Route.Status.IN_PROGRESS:
            return Response(
                {'error': 'Route is not in progress'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        route.status = Route.Status.COMPLETED
        route.actual_end_time = timezone.now()
        
        # Calculate actual duration
        if route.actual_start_time:
            duration = route.actual_end_time - route.actual_start_time
            route.actual_duration_minutes = int(duration.total_seconds() / 60)
        
        route.save()
        return Response(RouteSerializer(route).data)
    
    @action(detail=True, methods=['post'])
    def add_stop(self, request, pk=None):
        """Add a stop to the route."""
        route = self.get_object()
        serializer = RouteStopCreateSerializer(data=request.data)
        
        if serializer.is_valid():
            # Auto-increment sequence number
            last_stop = route.stops.order_by('-sequence_number').first()
            sequence_number = (last_stop.sequence_number + 1) if last_stop else 1
            
            route_stop = serializer.save(route=route, sequence_number=sequence_number)
            return Response(RouteStopSerializer(route_stop).data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def optimize(self, request, pk=None):
        """Trigger route optimization."""
        route = self.get_object()
        
        # Create optimization request
        optimization_data = request.data.copy()
        optimization_data['route'] = route.id
        
        serializer = RouteOptimizationCreateSerializer(data=optimization_data)
        if serializer.is_valid():
            optimization = serializer.save(
                organization=self.request.user.current_organization,
                status=RouteOptimization.Status.RUNNING,
                started_at=timezone.now()
            )
            
            # Trigger optimization (simplified version)
            self._run_optimization(optimization)
            
            return Response(RouteOptimizationSerializer(optimization).data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _run_optimization(self, optimization):
        """Simplified route optimization using nearest neighbor algorithm."""
        try:
            route = optimization.route
            stops = list(route.stops.all())
            
            if len(stops) < 2:
                optimization.status = RouteOptimization.Status.FAILED
                optimization.error_message = "Need at least 2 stops for optimization"
                optimization.completed_at = timezone.now()
                optimization.save()
                return
            
            # Simple nearest neighbor optimization
            original_order = [stop.id for stop in stops]
            optimized_order = self._nearest_neighbor_optimization(stops)
            
            # Calculate distances (simplified)
            original_distance = self._calculate_total_distance(stops)
            optimized_distance = self._calculate_total_distance(
                [stop for stop in stops if stop.id in optimized_order]
            )
            
            # Update optimization results
            optimization.original_distance_km = original_distance
            optimization.optimized_distance_km = optimized_distance
            optimization.distance_savings_km = original_distance - optimized_distance
            optimization.distance_savings_percent = (
                (optimization.distance_savings_km / original_distance * 100) 
                if original_distance > 0 else 0
            )
            optimization.optimized_stop_order = optimized_order
            optimization.status = RouteOptimization.Status.COMPLETED
            optimization.completed_at = timezone.now()
            optimization.save()
            
        except Exception as e:
            optimization.status = RouteOptimization.Status.FAILED
            optimization.error_message = str(e)
            optimization.completed_at = timezone.now()
            optimization.save()
    
    def _nearest_neighbor_optimization(self, stops):
        """Simple nearest neighbor algorithm for route optimization."""
        if not stops:
            return []
        
        unvisited = stops.copy()
        route = [unvisited.pop(0)]
        
        while unvisited:
            last_stop = route[-1]
            nearest = min(unvisited, key=lambda stop: self._calculate_distance(last_stop, stop))
            route.append(nearest)
            unvisited.remove(nearest)
        
        return [stop.id for stop in route]
    
    def _calculate_distance(self, stop1, stop2):
        """Calculate distance between two stops using Haversine formula."""
        if not stop1 or not stop2:
            return 0
        
        lat1, lon1 = float(stop1.lat), float(stop1.lng)
        lat2, lon2 = float(stop2.lat), float(stop2.lng)
        
        # Haversine formula
        R = 6371  # Earth's radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat/2)**2 + 
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * 
             math.sin(dlon/2)**2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        distance = R * c
        
        return distance
    
    def _calculate_total_distance(self, stops):
        """Calculate total distance for a list of stops."""
        total_distance = 0
        for i in range(len(stops) - 1):
            total_distance += self._calculate_distance(stops[i], stops[i+1])
        return total_distance


class RouteStopViewSet(viewsets.ModelViewSet):
    """ViewSet for managing route stops."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = RouteStopSerializer
    
    def get_queryset(self):
        return RouteStop.objects.filter(
            route__organization=self.request.user.current_organization
        ).select_related('route', 'shipment').order_by('route', 'sequence_number')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return RouteStopCreateSerializer
        return RouteStopSerializer
    
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["route", "stop_type", "status", "shipment"]
    search_fields = ["name", "address"]
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update stop status and times."""
        stop = self.get_object()
        new_status = request.data.get('status')
        
        if new_status not in dict(RouteStop.Status.choices):
            return Response(
                {'error': 'Invalid status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        stop.status = new_status
        
        # Update times based on status
        if new_status == RouteStop.Status.ARRIVED:
            stop.actual_arrival_time = timezone.now()
        elif new_status == RouteStop.Status.COMPLETED:
            stop.actual_departure_time = timezone.now()
        
        stop.save()
        return Response(RouteStopSerializer(stop).data)


class RouteOptimizationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing route optimizations."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = RouteOptimizationSerializer
    
    def get_queryset(self):
        return RouteOptimization.objects.filter(
            organization=self.request.user.current_organization
        ).select_related('route').order_by('-created_at')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return RouteOptimizationCreateSerializer
        return RouteOptimizationSerializer
    
    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.current_organization)
    
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["route", "method", "status"]
    search_fields = ["route__name"]


class RouteTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for managing route templates."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = RouteTemplateSerializer
    
    def get_queryset(self):
        return RouteTemplate.objects.filter(
            organization=self.request.user.current_organization
        ).order_by('name')
    
    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.current_organization)
    
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["template_type", "is_active"]
    search_fields = ["name", "description"]
    
    @action(detail=True, methods=['post'])
    def create_route(self, request, pk=None):
        """Create a route from this template."""
        template = self.get_object()
        serializer = RouteFromTemplateSerializer(data=request.data)
        
        if serializer.is_valid():
            # Create route from template
            route = Route.objects.create(
                organization=self.request.user.current_organization,
                name=serializer.validated_data['route_name'],
                planned_start_time=serializer.validated_data['planned_start_time'],
                optimization_level=Route.OptimizationLevel.NONE,
                route_type=Route.RouteType.DELIVERY
            )
            
            # Assign vehicle and driver if provided
            if serializer.validated_data.get('vehicle_id'):
                from fleet.models import Vehicle
                try:
                    route.vehicle = Vehicle.objects.get(
                        id=serializer.validated_data['vehicle_id'],
                        organization=self.request.user.current_organization
                    )
                except Vehicle.DoesNotExist:
                    pass
            
            if serializer.validated_data.get('driver_id'):
                from fleet.models import Driver
                try:
                    route.driver = Driver.objects.get(
                        id=serializer.validated_data['driver_id'],
                        organization=self.request.user.current_organization
                    )
                except Driver.DoesNotExist:
                    pass
            
            route.save()
            
            # Add stops from template or custom stops
            stops_data = serializer.validated_data.get('stops', [])
            if stops_data:
                for idx, stop_data in enumerate(stops_data, 1):
                    RouteStop.objects.create(
                        route=route,
                        sequence_number=idx,
                        **stop_data
                    )
            
            # Increment template usage count
            template.usage_count += 1
            template.save()
            
            return Response(RouteSerializer(route).data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)