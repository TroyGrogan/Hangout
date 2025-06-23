from django.db import migrations

class Migration(migrations.Migration):
    
    dependencies = [
        ('events', '0001_initial'),
    ]

    operations = [
        # Enable RLS on events table
        migrations.RunSQL(
            "ALTER TABLE events ENABLE ROW LEVEL SECURITY;",
            reverse_sql="ALTER TABLE events DISABLE ROW LEVEL SECURITY;"
        ),
        
        # Enable RLS on event_attendees table
        migrations.RunSQL(
            "ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;",
            reverse_sql="ALTER TABLE event_attendees DISABLE ROW LEVEL SECURITY;"
        ),
        
        # Create RLS policy for events - all authenticated users can view events
        migrations.RunSQL(
            """
            CREATE POLICY "Authenticated users can view events" ON events
            FOR SELECT USING (auth.role() = 'authenticated');
            """,
            reverse_sql="DROP POLICY IF EXISTS \"Authenticated users can view events\" ON events;"
        ),
        
        # Create RLS policy for events - only hosts can modify their events
        migrations.RunSQL(
            """
            CREATE POLICY "Hosts can manage their events" ON events
            FOR ALL USING (auth.uid()::text = host_id::text);
            """,
            reverse_sql="DROP POLICY IF EXISTS \"Hosts can manage their events\" ON events;"
        ),
        
        # Create RLS policy for event_attendees - users can view attendees of events they're involved with
        migrations.RunSQL(
            """
            CREATE POLICY "Users can view event attendees" ON event_attendees
            FOR SELECT USING (
                auth.uid()::text = user_id::text OR 
                EXISTS(SELECT 1 FROM events WHERE events.id = event_attendees.event_id AND events.host_id::text = auth.uid()::text)
            );
            """,
            reverse_sql="DROP POLICY IF EXISTS \"Users can view event attendees\" ON event_attendees;"
        ),
        
        # Create RLS policy for event_attendees - users can manage their own attendance
        migrations.RunSQL(
            """
            CREATE POLICY "Users can manage their own attendance" ON event_attendees
            FOR ALL USING (auth.uid()::text = user_id::text);
            """,
            reverse_sql="DROP POLICY IF EXISTS \"Users can manage their own attendance\" ON event_attendees;"
        ),
    ] 