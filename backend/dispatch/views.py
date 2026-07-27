from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from .models import Trip, TripStop
from .serializers import TripSerializer, TripStopSerializer


class TripViewSet(viewsets.ModelViewSet):
    queryset = Trip.objects.select_related("vehicle", "driver__user").prefetch_related("stops").order_by("-created_at")
    serializer_class = TripSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status", "vehicle", "driver"]


class TripStopViewSet(viewsets.ModelViewSet):
    queryset = TripStop.objects.select_related("trip", "shipment").all()
    serializer_class = TripStopSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["trip", "stop_type"]
