-- ==================================================
-- Disable Custom App Tables RLS Setup for Django + Supabase
-- This script disables RLS on your custom application tables
-- Run this in Supabase SQL Editor to restore normal access
-- ==================================================

-- Disable RLS on custom application tables

DO $$ 
BEGIN
    -- USERS TABLE
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        ALTER TABLE users DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS disabled on users table';
    ELSE
        RAISE NOTICE 'Table users does not exist';
    END IF;
    
    -- USER_PREFERENCES TABLE
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_preferences') THEN
        ALTER TABLE user_preferences DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS disabled on user_preferences table';
    ELSE
        RAISE NOTICE 'Table user_preferences does not exist';
    END IF;
    
    -- FRIENDSHIPS TABLE
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'friendships') THEN
        ALTER TABLE friendships DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS disabled on friendships table';
    ELSE
        RAISE NOTICE 'Table friendships does not exist';
    END IF;
    
    -- EVENTS TABLE
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'events') THEN
        ALTER TABLE events DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS disabled on events table';
    ELSE
        RAISE NOTICE 'Table events does not exist';
    END IF;
    
    -- EVENT_ATTENDEES TABLE
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'event_attendees') THEN
        ALTER TABLE event_attendees DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS disabled on event_attendees table';
    ELSE
        RAISE NOTICE 'Table event_attendees does not exist';
    END IF;
    
    -- AI_CHAT_CHAT TABLE
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_chat_chat') THEN
        ALTER TABLE ai_chat_chat DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS disabled on ai_chat_chat table';
    ELSE
        RAISE NOTICE 'Table ai_chat_chat does not exist';
    END IF;
    
END $$;

-- Optional: Drop all policies created by the setup script
-- (Policies are automatically disabled when RLS is disabled, but this cleans them up)

DO $$
BEGIN
    -- Drop policies for users table
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Users can view all profiles') THEN
        DROP POLICY "Users can view all profiles" ON users;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Users can update own profile') THEN
        DROP POLICY "Users can update own profile" ON users;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Users can create own profile') THEN
        DROP POLICY "Users can create own profile" ON users;
    END IF;
    
    -- Drop policies for user_preferences table
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_preferences' AND policyname = 'Users manage own preferences') THEN
        DROP POLICY "Users manage own preferences" ON user_preferences;
    END IF;
    
    -- Drop policies for friendships table
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'friendships' AND policyname = 'Users view own friendships') THEN
        DROP POLICY "Users view own friendships" ON friendships;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'friendships' AND policyname = 'Users create friendships') THEN
        DROP POLICY "Users create friendships" ON friendships;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'friendships' AND policyname = 'Users update own friendships') THEN
        DROP POLICY "Users update own friendships" ON friendships;
    END IF;
    
    -- Drop policies for events table
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Authenticated users can view events') THEN
        DROP POLICY "Authenticated users can view events" ON events;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Users can create events') THEN
        DROP POLICY "Users can create events" ON events;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Hosts can update own events') THEN
        DROP POLICY "Hosts can update own events" ON events;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Hosts can delete own events') THEN
        DROP POLICY "Hosts can delete own events" ON events;
    END IF;
    
    -- Drop policies for event_attendees table
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'event_attendees' AND policyname = 'Users view event attendees') THEN
        DROP POLICY "Users view event attendees" ON event_attendees;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'event_attendees' AND policyname = 'Users can RSVP to events') THEN
        DROP POLICY "Users can RSVP to events" ON event_attendees;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'event_attendees' AND policyname = 'Users update own RSVP') THEN
        DROP POLICY "Users update own RSVP" ON event_attendees;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'event_attendees' AND policyname = 'Users can cancel own RSVP') THEN
        DROP POLICY "Users can cancel own RSVP" ON event_attendees;
    END IF;
    
    -- Drop policies for ai_chat_chat table
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_chat_chat' AND policyname = 'Users view own chats') THEN
        DROP POLICY "Users view own chats" ON ai_chat_chat;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_chat_chat' AND policyname = 'Users create own chats') THEN
        DROP POLICY "Users create own chats" ON ai_chat_chat;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_chat_chat' AND policyname = 'Users update own chats') THEN
        DROP POLICY "Users update own chats" ON ai_chat_chat;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_chat_chat' AND policyname = 'Users delete own chats') THEN
        DROP POLICY "Users delete own chats" ON ai_chat_chat;
    END IF;
    
    RAISE NOTICE 'All custom app RLS policies have been dropped';
END $$;

-- Verification - Check RLS status on custom app tables (should all be false now)
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

-- Verify no policies remain
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

SELECT '✅ Custom App RLS Disabled! Your application should now have normal access to tables.' as status; 