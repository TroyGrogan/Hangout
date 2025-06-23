-- ==================================================
-- Custom App Tables RLS Setup for Django + Supabase
-- This script enables RLS on your custom application tables
-- Run this AFTER running supabase_rls_fix.sql

-- Also, before running this SQL script, 
-- make sure you have ran your Django Backend Migrations first:
--   cd backend
--   python setup_rls_simple.py

-- ==================================================

-- Enable RLS on custom application tables with proper security policies

DO $$ 
BEGIN
    -- USERS TABLE
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
        
        -- Users can view all user profiles (for finding friends, viewing event hosts)
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Users can view all profiles') THEN
            CREATE POLICY "Users can view all profiles" ON users
            FOR SELECT USING (auth.role() = 'authenticated');
        END IF;
        
        -- Users can only update their own profile
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Users can update own profile') THEN
            CREATE POLICY "Users can update own profile" ON users
            FOR UPDATE USING (auth.uid()::text = id::text);
        END IF;
        
        -- Users can insert their own profile (for registration)
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Users can create own profile') THEN
            CREATE POLICY "Users can create own profile" ON users
            FOR INSERT WITH CHECK (auth.uid()::text = id::text);
        END IF;
        
        RAISE NOTICE 'RLS enabled on users table';
    ELSE
        RAISE NOTICE 'Table users does not exist yet';
    END IF;
    
    -- USER_PREFERENCES TABLE
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_preferences') THEN
        ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
        
        -- Users can only manage their own preferences
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_preferences' AND policyname = 'Users manage own preferences') THEN
            CREATE POLICY "Users manage own preferences" ON user_preferences
            FOR ALL USING (user_id::text = auth.uid()::text);
        END IF;
        
        RAISE NOTICE 'RLS enabled on user_preferences table';
    ELSE
        RAISE NOTICE 'Table user_preferences does not exist yet';
    END IF;
    
    -- FRIENDSHIPS TABLE
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'friendships') THEN
        ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
        
        -- Users can view friendships they're involved in
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'friendships' AND policyname = 'Users view own friendships') THEN
            CREATE POLICY "Users view own friendships" ON friendships
            FOR SELECT USING (user_id::text = auth.uid()::text OR friend_id::text = auth.uid()::text);
        END IF;
        
        -- Users can create friendship requests
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'friendships' AND policyname = 'Users create friendships') THEN
            CREATE POLICY "Users create friendships" ON friendships
            FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);
        END IF;
        
        -- Users can update friendships they're involved in (accept/reject)
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'friendships' AND policyname = 'Users update own friendships') THEN
            CREATE POLICY "Users update own friendships" ON friendships
            FOR UPDATE USING (user_id::text = auth.uid()::text OR friend_id::text = auth.uid()::text);
        END IF;
        
        RAISE NOTICE 'RLS enabled on friendships table';
    ELSE
        RAISE NOTICE 'Table friendships does not exist yet';
    END IF;
    
    -- EVENTS TABLE
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'events') THEN
        ALTER TABLE events ENABLE ROW LEVEL SECURITY;
        
        -- All authenticated users can view events (public events)
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Authenticated users can view events') THEN
            CREATE POLICY "Authenticated users can view events" ON events
            FOR SELECT USING (auth.role() = 'authenticated');
        END IF;
        
        -- Users can create events
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Users can create events') THEN
            CREATE POLICY "Users can create events" ON events
            FOR INSERT WITH CHECK (auth.uid()::text = host_id::text);
        END IF;
        
        -- Only event hosts can update their events
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Hosts can update own events') THEN
            CREATE POLICY "Hosts can update own events" ON events
            FOR UPDATE USING (auth.uid()::text = host_id::text);
        END IF;
        
        -- Only event hosts can delete their events
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Hosts can delete own events') THEN
            CREATE POLICY "Hosts can delete own events" ON events
            FOR DELETE USING (auth.uid()::text = host_id::text);
        END IF;
        
        RAISE NOTICE 'RLS enabled on events table';
    ELSE
        RAISE NOTICE 'Table events does not exist yet';
    END IF;
    
    -- EVENT_ATTENDEES TABLE
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'event_attendees') THEN
        ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
        
        -- Users can view event attendees for events they're attending or hosting
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'event_attendees' AND policyname = 'Users view event attendees') THEN
            CREATE POLICY "Users view event attendees" ON event_attendees
            FOR SELECT USING (
                auth.role() = 'authenticated' AND (
                    user_id::text = auth.uid()::text OR
                    event_id IN (SELECT id FROM events WHERE host_id::text = auth.uid()::text)
                )
            );
        END IF;
        
        -- Users can RSVP to events (create attendance record)
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'event_attendees' AND policyname = 'Users can RSVP to events') THEN
            CREATE POLICY "Users can RSVP to events" ON event_attendees
            FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
        END IF;
        
        -- Users can update their own RSVP status
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'event_attendees' AND policyname = 'Users update own RSVP') THEN
            CREATE POLICY "Users update own RSVP" ON event_attendees
            FOR UPDATE USING (auth.uid()::text = user_id::text);
        END IF;
        
        -- Users can delete their own attendance (cancel RSVP)
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'event_attendees' AND policyname = 'Users can cancel own RSVP') THEN
            CREATE POLICY "Users can cancel own RSVP" ON event_attendees
            FOR DELETE USING (auth.uid()::text = user_id::text);
        END IF;
        
        RAISE NOTICE 'RLS enabled on event_attendees table';
    ELSE
        RAISE NOTICE 'Table event_attendees does not exist yet';
    END IF;
    
    -- AI_CHAT_CHAT TABLE
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_chat_chat') THEN
        ALTER TABLE ai_chat_chat ENABLE ROW LEVEL SECURITY;
        
        -- Users can only view their own chat sessions
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_chat_chat' AND policyname = 'Users view own chats') THEN
            CREATE POLICY "Users view own chats" ON ai_chat_chat
            FOR SELECT USING (auth.uid()::text = user_id::text);
        END IF;
        
        -- Users can create their own chat messages
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_chat_chat' AND policyname = 'Users create own chats') THEN
            CREATE POLICY "Users create own chats" ON ai_chat_chat
            FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
        END IF;
        
        -- Users can update their own chat messages (bookmarks, etc.)
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_chat_chat' AND policyname = 'Users update own chats') THEN
            CREATE POLICY "Users update own chats" ON ai_chat_chat
            FOR UPDATE USING (auth.uid()::text = user_id::text);
        END IF;
        
        -- Users can delete their own chat sessions
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_chat_chat' AND policyname = 'Users delete own chats') THEN
            CREATE POLICY "Users delete own chats" ON ai_chat_chat
            FOR DELETE USING (auth.uid()::text = user_id::text);
        END IF;
        
        RAISE NOTICE 'RLS enabled on ai_chat_chat table';
    ELSE
        RAISE NOTICE 'Table ai_chat_chat does not exist yet';
    END IF;
    
END $$;

-- Verification - Check RLS status on custom app tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'users',
    'user_preferences',
    'friendships', 
    'events',
    'event_attendees',
    'ai_chat_chat'
)
ORDER BY tablename;

-- Show all policies created
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd as operation
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN (
    'users',
    'user_preferences', 
    'friendships',
    'events',
    'event_attendees',
    'ai_chat_chat'
)
ORDER BY tablename, policyname;

SELECT '✅ Custom App RLS Setup Complete! Your application tables are now secure.' as status;