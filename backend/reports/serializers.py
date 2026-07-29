from rest_framework import serializers
from .models import Report, ReportSchedule


class ReportSerializer(serializers.ModelSerializer):
    """Serializer for Report model."""
    
    report_type_display = serializers.CharField(source='get_report_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    generated_by_name = serializers.CharField(source='generated_by.username', read_only=True)
    file_size_display = serializers.SerializerMethodField()
    
    class Meta:
        model = Report
        fields = [
            'id', 'report_type', 'report_type_display', 'name', 'description',
            'entity_type', 'entity_id', 'start_date', 'end_date',
            'file', 'file_name', 'file_size', 'file_size_display', 'file_format',
            'status', 'status_display', 'generated_by', 'generated_by_name',
            'generated_at', 'last_generated', 'parameters', 'row_count',
            'download_count', 'last_downloaded', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'file_name', 'file_size', 'generated_at', 'last_generated',
            'download_count', 'last_downloaded', 'created_at', 'updated_at'
        ]
    
    def get_file_size_display(self, obj):
        """Convert file size to human-readable format."""
        if not obj.file_size:
            return None
        for unit in ['B', 'KB', 'MB', 'GB']:
            if obj.file_size < 1024.0:
                return f"{obj.file_size:.2f} {unit}"
            obj.file_size /= 1024.0
        return f"{obj.file_size:.2f} TB"


class ReportScheduleSerializer(serializers.ModelSerializer):
    """Serializer for ReportSchedule model."""
    
    report_type_display = serializers.CharField(source='get_report_type_display', read_only=True)
    frequency_display = serializers.CharField(source='get_frequency_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = ReportSchedule
        fields = [
            'id', 'report_type', 'report_type_display', 'name',
            'frequency', 'frequency_display', 'next_run', 'last_run',
            'is_active', 'recipients', 'parameters',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'last_run', 'created_at', 'updated_at'
        ]