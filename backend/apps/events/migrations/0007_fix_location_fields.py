# Generated manually to fix location field requirements

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('events', '0006_fix_foreign_key_cascade'),
    ]

    operations = [
        # First, make event_address non-null by updating any null values
        migrations.RunSQL(
            "UPDATE events SET event_address = COALESCE(location_name, 'TBD') WHERE event_address IS NULL OR event_address = '';",
            reverse_sql="SELECT 1;"  # No reverse needed
        ),
        
        # Now alter the fields
        migrations.AlterField(
            model_name='event',
            name='location_name',
            field=models.CharField(blank=True, max_length=200, null=True),
        ),
        migrations.AlterField(
            model_name='event',
            name='event_address',
            field=models.CharField(max_length=255),
        ),
    ] 