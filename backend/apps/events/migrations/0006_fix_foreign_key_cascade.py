# Generated migration to fix foreign key cascade behavior

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('events', '0005_merge_20250618_1725'),
    ]

    operations = [
        migrations.RunSQL(
            # Drop the existing foreign key constraint and recreate it with CASCADE
            sql="""
            -- Drop the existing foreign key constraint
            ALTER TABLE event_attendees 
            DROP CONSTRAINT IF EXISTS event_attendees_event_id_8c4f0b6b_fk_events_id;
            
            -- Recreate the foreign key constraint with CASCADE delete
            ALTER TABLE event_attendees 
            ADD CONSTRAINT event_attendees_event_id_8c4f0b6b_fk_events_id 
            FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
            """,
            reverse_sql="""
            -- Reverse: Drop CASCADE and recreate without CASCADE (original behavior)
            ALTER TABLE event_attendees 
            DROP CONSTRAINT IF EXISTS event_attendees_event_id_8c4f0b6b_fk_events_id;
            
            ALTER TABLE event_attendees 
            ADD CONSTRAINT event_attendees_event_id_8c4f0b6b_fk_events_id 
            FOREIGN KEY (event_id) REFERENCES events(id);
            """
        ),
    ] 