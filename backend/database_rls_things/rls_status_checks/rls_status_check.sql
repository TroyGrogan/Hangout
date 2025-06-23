-- Check RLS status for all your tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity = true THEN '✅ ENABLED'
        ELSE '❌ DISABLED'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    -- Django system tables
    'django_migrations',
    'django_content_type', 
    'auth_permission',
    'auth_group',
    'auth_group_permissions',
    'django_admin_log',
    'django_session',
    'users_groups',
    'users_user_permissions',
    'user_preferences_preferred_categories',
    -- Your custom app tables
    'users',
    'user_preferences',
    'friendships', 
    'events',
    'event_attendees',
    'ai_chat_chat'
)
ORDER BY tablename;