-- Fix RLS policies to allow guest users to view events
-- This script updates the existing policies to allow public read access

DO $$
BEGIN
    -- Drop existing restrictive policy for events
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Authenticated users can view events') THEN
        DROP POLICY "Authenticated users can view events" ON events;
        RAISE NOTICE 'Dropped restrictive events view policy';
    END IF;
    
    -- Create new public read policy for events
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Public can view events') THEN
        CREATE POLICY "Public can view events" ON events
        FOR SELECT USING (true);  -- Allow all users (including anonymous) to view events
        RAISE NOTICE 'Created public events view policy';
    END IF;
    
    -- Update event_attendees policy to allow public viewing of attendee lists
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'event_attendees' AND policyname = 'Users view event attendees') THEN
        DROP POLICY "Users view event attendees" ON event_attendees;
        RAISE NOTICE 'Dropped restrictive event_attendees view policy';
    END IF;
    
    -- Create new public read policy for event attendees
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'event_attendees' AND policyname = 'Public can view event attendees') THEN
        CREATE POLICY "Public can view event attendees" ON event_attendees
        FOR SELECT USING (true);  -- Allow all users to view attendee lists
        RAISE NOTICE 'Created public event_attendees view policy';
    END IF;
    
    -- Ensure write operations still require authentication for events
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Users can create events') THEN
        CREATE POLICY "Users can create events" ON events
        FOR INSERT WITH CHECK (auth.uid()::text = host_id::text);
        RAISE NOTICE 'Created events create policy';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Hosts can update own events') THEN
        CREATE POLICY "Hosts can update own events" ON events
        FOR UPDATE USING (auth.uid()::text = host_id::text);
        RAISE NOTICE 'Created events update policy';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Hosts can delete own events') THEN
        CREATE POLICY "Hosts can delete own events" ON events
        FOR DELETE USING (auth.uid()::text = host_id::text);
        RAISE NOTICE 'Created events delete policy';
    END IF;
    
    -- Ensure RSVP operations still require authentication
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'event_attendees' AND policyname = 'Users can RSVP to events') THEN
        CREATE POLICY "Users can RSVP to events" ON event_attendees
        FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
        RAISE NOTICE 'Created event_attendees create policy';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'event_attendees' AND policyname = 'Users can update own RSVP') THEN
        CREATE POLICY "Users can update own RSVP" ON event_attendees
        FOR UPDATE USING (auth.uid()::text = user_id::text);
        RAISE NOTICE 'Created event_attendees update policy';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'event_attendees' AND policyname = 'Users can delete own RSVP') THEN
        CREATE POLICY "Users can delete own RSVP" ON event_attendees
        FOR DELETE USING (auth.uid()::text = user_id::text);
        RAISE NOTICE 'Created event_attendees delete policy';
    END IF;
    
    RAISE NOTICE 'Guest access fix completed successfully!';
END $$; 