# Add audit log and additional user fields

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_merge_20260729_0649'),
        ('organizations', '0001_initial'),
    ]

    operations = [
        # Add new fields to User model
        migrations.AddField(
            model_name='user',
            name='email_verified',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='user',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True),
        ),
        migrations.AddField(
            model_name='user',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        
        # Add indexes to User model
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['email'], name='user_email_idx'),
        ),
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['role'], name='user_role_idx'),
        ),
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['current_organization'], name='user_org_idx'),
        ),
        
        # Create AuditLog model
        migrations.CreateModel(
            name='AuditLog',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ('action_type', models.CharField(
                    choices=[
                        ('login', 'Login'),
                        ('logout', 'Logout'),
                        ('failed_login', 'Failed Login'),
                        ('password_change', 'Password Change'),
                        ('password_reset', 'Password Reset'),
                        ('role_change', 'Role Change'),
                        ('permission_change', 'Permission Change'),
                        ('user_create', 'User Create'),
                        ('user_delete', 'User Delete'),
                        ('organization_create', 'Organization Create'),
                        ('organization_update', 'Organization Update'),
                        ('shipment_create', 'Shipment Create'),
                        ('shipment_update', 'Shipment Update'),
                        ('trip_create', 'Trip Create'),
                        ('trip_update', 'Trip Update'),
                        ('notification_send', 'Notification Send'),
                        ('api_access', 'API Access')
                    ],
                    max_length=30
                )),
                ('description', models.TextField()),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.TextField(blank=True)),
                ('related_object_type', models.CharField(blank=True, max_length=50)),
                ('related_object_id', models.UUIDField(blank=True, null=True)),
                ('changes', models.JSONField(blank=True, default=dict)),
                ('status', models.CharField(default='success', max_length=20)),
                ('error_message', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('organization', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='audit_logs',
                    to='organizations.organization'
                )),
                ('user', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='audit_logs',
                    to='accounts.user'
                )),
            ],
            options={
                'ordering': ['-created_at'],
                'indexes': [
                    models.Index(fields=['user', '-created_at'], name='audit_user_created_idx'),
                    models.Index(fields=['organization', '-created_at'], name='audit_org_created_idx'),
                    models.Index(fields=['action_type'], name='audit_action_type_idx'),
                    models.Index(fields=['status'], name='audit_status_idx'),
                    models.Index(fields=['created_at'], name='audit_created_idx'),
                ],
            },
        ),
    ]