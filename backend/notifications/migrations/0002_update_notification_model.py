# Generated migration for notification model updates

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0001_initial'),
        ('accounts', '0001_initial'),
    ]

    operations = [
        # Add new fields to Notification model
        migrations.AddField(
            model_name='notification',
            name='channel',
            field=models.CharField(
                choices=[
                    ('in_app', 'In-App'),
                    ('email', 'Email'),
                    ('sms', 'SMS')
                ],
                default='in_app',
                max_length=10
            ),
        ),
        migrations.AddField(
            model_name='notification',
            name='delivery_status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pending'),
                    ('sent', 'Sent'),
                    ('delivered', 'Delivered'),
                    ('failed', 'Failed'),
                    ('retrying', 'Retrying')
                ],
                default='pending',
                max_length=10
            ),
        ),
        migrations.AddField(
            model_name='notification',
            name='external_message_id',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='notification',
            name='sent_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='notification',
            name='delivered_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='notification',
            name='error_message',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='notification',
            name='retry_count',
            field=models.IntegerField(default=0),
        ),
        
        # Update notification type choices
        migrations.AlterField(
            model_name='notification',
            name='type',
            field=models.CharField(
                choices=[
                    ('alert', 'Alert'),
                    ('success', 'Success'),
                    ('info', 'Info'),
                    ('warning', 'Warning'),
                    ('shipment_status', 'Shipment Status'),
                    ('dispatch_assignment', 'Dispatch Assignment'),
                    ('gps_alert', 'GPS Alert'),
                    ('maintenance_due', 'Maintenance Due'),
                    ('fuel_anomaly', 'Fuel Anomaly'),
                    ('password_reset', 'Password Reset'),
                    ('account_verification', 'Account Verification')
                ],
                default='info',
                max_length=30
            ),
        ),
        
        # Add new indexes with names
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['user', '-created_at'], name='notif_user_created_idx'),
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['user', 'read'], name='notif_user_read_idx'),
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['delivery_status'], name='notif_delivery_status_idx'),
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['channel'], name='notif_channel_idx'),
        ),
        
        # Create NotificationPreference model
        migrations.CreateModel(
            name='NotificationPreference',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('email_shipment_status', models.BooleanField(default=True)),
                ('email_dispatch_assignment', models.BooleanField(default=True)),
                ('email_gps_alert', models.BooleanField(default=True)),
                ('email_maintenance_due', models.BooleanField(default=True)),
                ('email_fuel_anomaly', models.BooleanField(default=True)),
                ('email_password_reset', models.BooleanField(default=True)),
                ('email_account_verification', models.BooleanField(default=True)),
                ('sms_shipment_status', models.BooleanField(default=False)),
                ('sms_dispatch_assignment', models.BooleanField(default=True)),
                ('sms_gps_alert', models.BooleanField(default=True)),
                ('sms_maintenance_due', models.BooleanField(default=False)),
                ('sms_fuel_anomaly', models.BooleanField(default=False)),
                ('sms_password_reset', models.BooleanField(default=False)),
                ('sms_account_verification', models.BooleanField(default=False)),
                ('in_app_shipment_status', models.BooleanField(default=True)),
                ('in_app_dispatch_assignment', models.BooleanField(default=True)),
                ('in_app_gps_alert', models.BooleanField(default=True)),
                ('in_app_maintenance_due', models.BooleanField(default=True)),
                ('in_app_fuel_anomaly', models.BooleanField(default=True)),
                ('in_app_password_reset', models.BooleanField(default=True)),
                ('in_app_account_verification', models.BooleanField(default=True)),
                ('daily_digest_enabled', models.BooleanField(default=True)),
                ('daily_digest_time', models.TimeField(default='08:00')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='notification_preferences', to='accounts.user')),
            ],
            options={
                'verbose_name': 'Notification Preference',
                'verbose_name_plural': 'Notification Preferences',
            },
        ),
    ]