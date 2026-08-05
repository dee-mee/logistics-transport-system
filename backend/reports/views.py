from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q, Count, Sum, Avg, F
from django.http import FileResponse, HttpResponse
from django.core.files.base import ContentFile
from datetime import datetime, timedelta
import csv
import io
import logging

from .models import Report, ReportSchedule
from .serializers import ReportSerializer, ReportScheduleSerializer
from permissions.permissions import HasModuleAccess
from permissions.models import PermissionGroup

logger = logging.getLogger(__name__)


class ReportViewSet(viewsets.ModelViewSet):
    """ViewSet for Report model with real data generation."""
    
    module = PermissionGroup.Module.REPORTS
    permission_classes = [HasModuleAccess]
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['report_type', 'status', 'entity_type']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter reports based on user permissions."""
        queryset = super().get_queryset()
        user = self.request.user
        
        # Filter by organization
        queryset = queryset.filter(organization=user.current_organization)
        
        # Non-admin users can only see their own reports
        if not user.is_superuser and not user.is_staff:
            queryset = queryset.filter(generated_by=user)
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.current_organization)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get report statistics based on real data."""
        queryset = self.get_queryset()
        
        # Count by status
        stats = queryset.aggregate(
            total_reports=Count('id'),
            ready_reports=Count('id', filter=Q(status=Report.Status.READY)),
            pending_reports=Count('id', filter=Q(status=Report.Status.PENDING)),
            generating_reports=Count('id', filter=Q(status=Report.Status.GENERATING)),
            failed_reports=Count('id', filter=Q(status=Report.Status.FAILED)),
        )
        
        # Count by report type
        reports_by_type = queryset.values('report_type').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Today's generation count
        today = timezone.now().date()
        generated_today = queryset.filter(
            generated_at__date=today
        ).count()
        
        # Week's download count
        week_ago = timezone.now() - timedelta(days=7)
        downloads_week = queryset.filter(
            last_downloaded__gte=week_ago
        ).aggregate(total=Sum('download_count'))['total'] or 0
        
        # Active schedules for current organization
        active_schedules = ReportSchedule.objects.filter(
            organization=request.user.current_organization,
            is_active=True,
            next_run__lte=timezone.now() + timedelta(days=30)
        ).count()
        
        return Response({
            'total_reports': stats['total_reports'],
            'ready_reports': stats['ready_reports'],
            'pending_reports': stats['pending_reports'],
            'generating_reports': stats['generating_reports'],
            'failed_reports': stats['failed_reports'],
            'generated_today': generated_today,
            'downloads_week': downloads_week,
            'active_schedules': active_schedules,
            'reports_by_type': {
                item['report_type']: item['count'] 
                for item in reports_by_type
            }
        })
    
    @action(detail=True, methods=['post'])
    def generate(self, request, pk=None):
        """Generate a report with real data."""
        report = self.get_object()
        
        try:
            report.status = Report.Status.GENERATING
            report.generated_by = request.user
            report.save()
            
            # Generate the actual report based on type
            report_data = self._generate_report_data(report)
            
            # Create CSV file
            csv_file = self._create_csv_file(report, report_data)
            
            # Update report with generated file
            report.file.save(f"{report.name}_{report.id}.csv", csv_file)
            report.status = Report.Status.READY
            report.generated_at = timezone.now()
            report.row_count = len(report_data)
            report.save()
            
            return Response(ReportSerializer(report).data)
        
        except Exception as e:
            logger.error(f"Report generation failed: {e}")
            report.status = Report.Status.FAILED
            report.save()
            return Response(
                {'error': f'Report generation failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _generate_report_data(self, report):
        """Generate real data based on report type."""
        from documents.models import Document
        from accounts.models import User
        from fleet.models import Vehicle, Driver
        
        start_date = report.start_date or (timezone.now().date() - timedelta(days=30))
        end_date = report.end_date or timezone.now().date()
        
        if report.report_type == Report.ReportType.DOCUMENT_COMPLIANCE:
            # Document compliance report
            documents = Document.objects.filter(
                created_at__date__range=[start_date, end_date]
            ).values(
                'document_type', 'status', 'entity_type', 'expiry_date'
            )
            
            return [
                {
                    'Document Type': doc['document_type'],
                    'Status': doc['status'],
                    'Entity Type': doc['entity_type'],
                    'Expiry Date': doc['expiry_date'] or 'N/A',
                    'Report Generated': timezone.now().date()
                }
                for doc in documents
            ]
        
        elif report.report_type == Report.ReportType.EXPIRY_TRACKING:
            # Expiry tracking report
            expiring_documents = Document.objects.filter(
                expiry_date__lte=end_date,
                expiry_date__gte=start_date
            ).values(
                'document_type', 'entity_type', 'entity_id', 'expiry_date', 'status'
            )
            
            return [
                {
                    'Document Type': doc['document_type'],
                    'Entity Type': doc['entity_type'],
                    'Entity ID': str(doc['entity_id']),
                    'Expiry Date': doc['expiry_date'],
                    'Status': doc['status'],
                    'Report Generated': timezone.now().date()
                }
                for doc in expiring_documents
            ]
        
        elif report.report_type == Report.ReportType.VERIFICATION_STATUS:
            # Verification status report
            pending_documents = Document.objects.filter(
                status='pending',
                created_at__date__range=[start_date, end_date]
            ).values(
                'document_type', 'entity_type', 'entity_id', 'created_at'
            )
            
            return [
                {
                    'Document Type': doc['document_type'],
                    'Entity Type': doc['entity_type'],
                    'Entity ID': str(doc['entity_id']),
                    'Created At': doc['created_at'],
                    'Status': 'Pending Verification',
                    'Report Generated': timezone.now().date()
                }
                for doc in pending_documents
            ]
        
        elif report.report_type == Report.ReportType.FLEET_UTILIZATION:
            # Fleet utilization report
            vehicles = Vehicle.objects.filter(
                created_at__date__range=[start_date, end_date]
            ).values(
                'plate_number', 'vehicle_type', 'status', 'current_odometer'
            )
            
            return [
                {
                    'Plate Number': v['plate_number'],
                    'Vehicle Type': v['vehicle_type'],
                    'Status': v['status'],
                    'Current Odometer': v['current_odometer'],
                    'Report Generated': timezone.now().date()
                }
                for v in vehicles
            ]
        
        elif report.report_type == Report.ReportType.DRIVER_PERFORMANCE:
            # Driver performance report
            drivers = Driver.objects.filter(
                created_at__date__range=[start_date, end_date]
            ).values(
                'user__username', 'license_number', 'status', 'total_trips',
                'total_distance_km', 'safety_score', 'on_time_performance'
            )
            
            return [
                {
                    'Driver Name': d['user__username'],
                    'License Number': d['license_number'],
                    'Status': d['status'],
                    'Total Trips': d['total_trips'],
                    'Total Distance (km)': d['total_distance_km'],
                    'Safety Score': d['safety_score'] or 'N/A',
                    'On-Time Performance (%)': d['on_time_performance'] or 'N/A',
                    'Report Generated': timezone.now().date()
                }
                for d in drivers
            ]
        
        else:
            # Default empty data for unimplemented report types
            return [{
                'Message': 'Report type not yet implemented',
                'Report Type': report.report_type,
                'Generated Date': timezone.now().date()
            }]
    
    def _create_csv_file(self, report, data):
        """Create CSV file from report data."""
        if not data:
            data = [{'Message': 'No data available for this report'}]
        
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)
        
        csv_content = output.getvalue()
        return ContentFile(csv_content.encode('utf-8'))
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download a generated report."""
        report = self.get_object()
        
        if not report.file:
            return Response(
                {'error': 'Report file not available. Generate the report first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update download tracking
        report.download_count += 1
        report.last_downloaded = timezone.now()
        report.save(update_fields=['download_count', 'last_downloaded'])
        
        # Return file response
        response = FileResponse(
            report.file.open('rb'),
            content_type='text/csv'
        )
        response['Content-Disposition'] = f'attachment; filename="{report.file_name}"'
        return response


class ReportScheduleViewSet(viewsets.ModelViewSet):
    """ViewSet for ReportSchedule model."""
    
    module = PermissionGroup.Module.REPORTS
    permission_classes = [HasModuleAccess]
    queryset = ReportSchedule.objects.all()
    serializer_class = ReportScheduleSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['report_type', 'frequency', 'is_active']
    ordering = ['next_run']
    
    def get_queryset(self):
        """Filter schedules based on user permissions."""
        queryset = super().get_queryset()
        user = self.request.user
        
        # Filter by organization
        queryset = queryset.filter(organization=user.current_organization)
        
        # Non-admin users can only see their own schedules
        if not user.is_superuser and not user.is_staff:
            queryset = queryset.filter(created_by=user)
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.current_organization)