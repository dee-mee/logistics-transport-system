from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Customer, Shipment
from .serializers import CustomerSerializer, ShipmentSerializer


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by("-created_at")
    serializer_class = CustomerSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["company_name", "contact_name", "contact_phone"]


class ShipmentViewSet(viewsets.ModelViewSet):
    queryset = Shipment.objects.select_related("customer").all().order_by("-created_at")
    serializer_class = ShipmentSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["status", "priority", "customer"]
    search_fields = ["tracking_code", "pickup_address", "dropoff_address"]
