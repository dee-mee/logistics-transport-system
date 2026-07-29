# Fix AuditLog nullable fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_alter_user_options_alter_auditlog_id_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='auditlog',
            name='user_agent',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='auditlog',
            name='ip_address',
            field=models.GenericIPAddressField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='auditlog',
            name='related_object_type',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AlterField(
            model_name='auditlog',
            name='related_object_id',
            field=models.UUIDField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='auditlog',
            name='changes',
            field=models.JSONField(blank=True, default=dict, null=True),
        ),
        migrations.AlterField(
            model_name='auditlog',
            name='error_message',
            field=models.TextField(blank=True, null=True),
        ),
    ]