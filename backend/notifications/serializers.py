from rest_framework import serializers
from .models import Notification, NotificationPreference


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'user', 'type', 'title', 'message', 'read', 
                  'channel', 'delivery_status', 'external_message_id', 
                  'sent_at', 'delivered_at', 'error_message', 'retry_count',
                  'related_object_type', 'related_object_id', 'created_at']
        read_only_fields = ['id', 'created_at', 'sent_at', 'delivered_at']


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            'id', 'user',
            'email_shipment_status', 'email_dispatch_assignment', 
            'email_gps_alert', 'email_maintenance_due', 'email_fuel_anomaly',
            'email_password_reset', 'email_account_verification',
            'sms_shipment_status', 'sms_dispatch_assignment', 
            'sms_gps_alert', 'sms_maintenance_due', 'sms_fuel_anomaly',
            'sms_password_reset', 'sms_account_verification',
            'in_app_shipment_status', 'in_app_dispatch_assignment',
            'in_app_gps_alert', 'in_app_maintenance_due', 'in_app_fuel_anomaly',
            'in_app_password_reset', 'in_app_account_verification',
            'daily_digest_enabled', 'daily_digest_time',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']