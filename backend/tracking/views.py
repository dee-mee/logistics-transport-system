from rest_framework import viewsets, generics, permissions
from django_filters.rest_framework import DjangoFilterBackend
from .models import ShipmentStatusEvent, VehicleLocationPing
from .serializers import ShipmentStatusEventSerializer, VehicleLocationPingSerializer, PublicTrackingSerializer
from orders.models import Shipment


class ShipmentStatusEventViewSet(viewsets.ModelViewSet):
    queryset = ShipmentStatusEvent.objects.select_related("shipment").all()
    serializer_class = ShipmentStatusEventSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["shipment", "status"]


class VehicleLocationPingViewSet(viewsets.ModelViewSet):
    queryset = VehicleLocationPing.objects.select_related("vehicle").all()
    serializer_class = VehicleLocationPingSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["vehicle"]

    def get_queryset(self):
        qs = super().get_queryset()
        # Default to the most recent pings only, unless a vehicle filter narrows it down
        if not self.request.query_params.get("vehicle"):
            qs = qs[:200]
        return qs


class PublicShipmentTrackingView(generics.RetrieveAPIView):
    """Public endpoint: GET /api/tracking/track/<tracking_code>/ — no auth required."""

    queryset = Shipment.objects.prefetch_related("status_events")
    serializer_class = PublicTrackingSerializer
    lookup_field = "tracking_code"
    permission_classes = [permissions.AllowAny]
