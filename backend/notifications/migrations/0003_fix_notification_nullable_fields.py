# Fix Notification nullable fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0002_update_notification_model'),
    ]

    operations = [
        migrations.AlterField(
            model_name='notification',
            name='error_message',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='notification',
            name='related_object_type',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
    ]