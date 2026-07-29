from django.core.management.base import BaseCommand
from documents.models import DocumentRequirement


class Command(BaseCommand):
    help = 'Initialize default document requirements for different entity types and roles'

    def handle(self, *args, **options):
        # Default requirements for drivers
        driver_requirements = [
            {'document_type': 'national_id', 'is_required': True, 'is_expirable': False},
            {'document_type': 'kra_pin', 'is_required': True, 'is_expirable': False},
            {'document_type': 'kra_certificate', 'is_required': True, 'is_expirable': True},
            {'document_type': 'driving_license', 'is_required': True, 'is_expirable': True},
            {'document_type': 'profile_photo', 'is_required': True, 'is_expirable': False},
            {'document_type': 'certificate_of_good_conduct', 'is_required': True, 'is_expirable': True},
            {'document_type': 'medical_certificate', 'is_required': True, 'is_expirable': True},
        ]
        
        # Default requirements for vehicles
        vehicle_requirements = [
            {'document_type': 'insurance', 'is_required': True, 'is_expirable': True},
            {'document_type': 'registration', 'is_required': True, 'is_expirable': True},
            {'document_type': 'number_plate', 'is_required': True, 'is_expirable': False},
            {'document_type': 'inspection_certificate', 'is_required': True, 'is_expirable': True},
            {'document_type': 'road_worthiness', 'is_required': True, 'is_expirable': True},
        ]
        
        created_count = 0
        updated_count = 0
        
        # Create driver requirements
        for req in driver_requirements:
            obj, created = DocumentRequirement.objects.get_or_create(
                entity_type='user',
                user_role='driver',
                document_type=req['document_type'],
                defaults={
                    'is_required': req['is_required'],
                    'is_expirable': req['is_expirable'],
                    'description': f'Required document for drivers: {req["document_type"]}'
                }
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'Created driver requirement: {req["document_type"]}'))
            else:
                updated_count += 1
                self.stdout.write(self.style.WARNING(f'Updated driver requirement: {req["document_type"]}'))
        
        # Create vehicle requirements
        for req in vehicle_requirements:
            obj, created = DocumentRequirement.objects.get_or_create(
                entity_type='vehicle',
                user_role='all',
                document_type=req['document_type'],
                defaults={
                    'is_required': req['is_required'],
                    'is_expirable': req['is_expirable'],
                    'description': f'Required document for vehicles: {req["document_type"]}'
                }
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'Created vehicle requirement: {req["document_type"]}'))
            else:
                updated_count += 1
                self.stdout.write(self.style.WARNING(f'Updated vehicle requirement: {req["document_type"]}'))
        
        self.stdout.write(self.style.SUCCESS(f'\nSuccessfully initialized {created_count} new requirements, updated {updated_count} existing requirements'))