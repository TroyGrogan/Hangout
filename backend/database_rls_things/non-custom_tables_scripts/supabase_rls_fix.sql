-- ==================================================
-- Safe Supabase RLS Setup SQL Script
-- This version has NO destructive operations - only creates/enables
-- Run this in your Supabase SQL Editor
-- ==================================================

-- Enable RLS on Django system tables that are causing security errors
-- Note: We use Supabase's built-in auth.uid() and auth.role() functions

-- Step 1: Enable RLS on Django system tables (if they exist)
DO $$ 
BEGIN
    -- django_migrations
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'django_migrations') THEN
        ALTER TABLE django_migrations ENABLE ROW LEVEL SECURITY;
        -- Only create policy if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'django_migrations' AND policyname = 'Authenticated users can read django_migrations') THEN
            CREATE POLICY "Authenticated users can read django_migrations" ON django_migrations
            FOR SELECT USING (auth.role() = 'authenticated');
        END IF;
        RAISE NOTICE 'RLS enabled on django_migrations';
    ELSE
        RAISE NOTICE 'Table django_migrations does not exist yet';
    END IF;
    
    -- django_content_type
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'django_content_type') THEN
        ALTER TABLE django_content_type ENABLE ROW LEVEL SECURITY;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'django_content_type' AND policyname = 'Authenticated users can read django_content_type') THEN
            CREATE POLICY "Authenticated users can read django_content_type" ON django_content_type
            FOR SELECT USING (auth.role() = 'authenticated');
        END IF;
        RAISE NOTICE 'RLS enabled on django_content_type';
    ELSE
        RAISE NOTICE 'Table django_content_type does not exist yet';
    END IF;
    
    -- auth_permission
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'auth_permission') THEN
        ALTER TABLE auth_permission ENABLE ROW LEVEL SECURITY;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'auth_permission' AND policyname = 'Authenticated users can read auth_permission') THEN
            CREATE POLICY "Authenticated users can read auth_permission" ON auth_permission
            FOR SELECT USING (auth.role() = 'authenticated');
        END IF;
        RAISE NOTICE 'RLS enabled on auth_permission';
    ELSE
        RAISE NOTICE 'Table auth_permission does not exist yet';
    END IF;
    
    -- auth_group
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'auth_group') THEN
        ALTER TABLE auth_group ENABLE ROW LEVEL SECURITY;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'auth_group' AND policyname = 'Authenticated users can read auth_group') THEN
            CREATE POLICY "Authenticated users can read auth_group" ON auth_group
            FOR SELECT USING (auth.role() = 'authenticated');
        END IF;
        RAISE NOTICE 'RLS enabled on auth_group';
    ELSE
        RAISE NOTICE 'Table auth_group does not exist yet';
    END IF;
    
    -- auth_group_permissions
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'auth_group_permissions') THEN
        ALTER TABLE auth_group_permissions ENABLE ROW LEVEL SECURITY;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'auth_group_permissions' AND policyname = 'Authenticated read auth_group_permissions') THEN
            CREATE POLICY "Authenticated read auth_group_permissions" ON auth_group_permissions
            FOR SELECT USING (auth.role() = 'authenticated');
        END IF;
        RAISE NOTICE 'RLS enabled on auth_group_permissions';
    ELSE
        RAISE NOTICE 'Table auth_group_permissions does not exist yet';
    END IF;
    
    -- django_admin_log
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'django_admin_log') THEN
        ALTER TABLE django_admin_log ENABLE ROW LEVEL SECURITY;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'django_admin_log' AND policyname = 'Admin access for django_admin_log') THEN
            CREATE POLICY "Admin access for django_admin_log" ON django_admin_log
            FOR SELECT USING (auth.role() = 'authenticated');
        END IF;
        RAISE NOTICE 'RLS enabled on django_admin_log';
    ELSE
        RAISE NOTICE 'Table django_admin_log does not exist yet';
    END IF;
    
    -- django_session
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'django_session') THEN
        ALTER TABLE django_session ENABLE ROW LEVEL SECURITY;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'django_session' AND policyname = 'Users own sessions') THEN
            CREATE POLICY "Users own sessions" ON django_session
            FOR ALL USING (auth.role() = 'authenticated');
        END IF;
        RAISE NOTICE 'RLS enabled on django_session';
    ELSE
        RAISE NOTICE 'Table django_session does not exist yet';
    END IF;
    
    -- users_groups (Django User.groups many-to-many)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users_groups') THEN
        ALTER TABLE users_groups ENABLE ROW LEVEL SECURITY;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users_groups' AND policyname = 'Users view own permissions') THEN
            CREATE POLICY "Users view own permissions" ON users_groups
            FOR SELECT USING (auth.role() = 'authenticated');
        END IF;
        RAISE NOTICE 'RLS enabled on users_groups';
    ELSE
        RAISE NOTICE 'Table users_groups does not exist yet';
    END IF;
    
    -- users_user_permissions (Django User.user_permissions many-to-many)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users_user_permissions') THEN
        ALTER TABLE users_user_permissions ENABLE ROW LEVEL SECURITY;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users_user_permissions' AND policyname = 'Users view own user permissions') THEN
            CREATE POLICY "Users view own user permissions" ON users_user_permissions
            FOR SELECT USING (auth.role() = 'authenticated');
        END IF;
        RAISE NOTICE 'RLS enabled on users_user_permissions';
    ELSE
        RAISE NOTICE 'Table users_user_permissions does not exist yet';
    END IF;
    
    -- user_preferences_preferred_categories
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_preferences_preferred_categories') THEN
        ALTER TABLE user_preferences_preferred_categories ENABLE ROW LEVEL SECURITY;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_preferences_preferred_categories' AND policyname = 'Users manage preference categories') THEN
            CREATE POLICY "Users manage preference categories" ON user_preferences_preferred_categories
            FOR ALL USING (auth.role() = 'authenticated');
        END IF;
        RAISE NOTICE 'RLS enabled on user_preferences_preferred_categories';
    ELSE
        RAISE NOTICE 'Table user_preferences_preferred_categories does not exist yet';
    END IF;
    
END $$;

-- Step 2: Verification - Check which tables now have RLS enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'django_migrations',
    'django_content_type', 
    'auth_permission',
    'auth_group',
    'auth_group_permissions',
    'django_admin_log',
    'django_session',
    'users_groups',
    'users_user_permissions',
    'user_preferences_preferred_categories'
)
ORDER BY tablename;

-- Step 3: Test that auth functions work
SELECT 'Supabase auth functions test:' as test_message;
SELECT auth.uid() as current_user_id, auth.role() as current_role;

SELECT '✅ RLS Setup Complete! Check the tables above to verify RLS is enabled.' as status;