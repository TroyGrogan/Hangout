-- Comprehensive RLS Security Audit

WITH table_rls AS (
    SELECT 
        tablename,
        rowsecurity as rls_enabled
    FROM pg_tables 
    WHERE schemaname = 'public'
    AND tablename NOT LIKE 'pg_%'
    AND tablename NOT LIKE 'sql_%'
),
policy_count AS (
    SELECT 
        tablename,
        COUNT(*) as policy_count
    FROM pg_policies 
    WHERE schemaname = 'public'
    GROUP BY tablename
)
SELECT 
    t.tablename,
    CASE 
        WHEN t.rls_enabled = true THEN '✅ ENABLED'
        ELSE '❌ DISABLED'
    END as rls_status,
    COALESCE(p.policy_count, 0) as policies_count,
    CASE 
        WHEN t.rls_enabled = true AND COALESCE(p.policy_count, 0) > 0 THEN '🔒 SECURE'
        WHEN t.rls_enabled = true AND COALESCE(p.policy_count, 0) = 0 THEN '⚠️ RLS ON BUT NO POLICIES'
        ELSE '🚨 NOT SECURE'
    END as security_status
FROM table_rls t
LEFT JOIN policy_count p ON t.tablename = p.tablename
ORDER BY 
    CASE 
        WHEN t.rls_enabled = true AND COALESCE(p.policy_count, 0) > 0 THEN 1
        WHEN t.rls_enabled = true AND COALESCE(p.policy_count, 0) = 0 THEN 2
        ELSE 3
    END,
    t.tablename;