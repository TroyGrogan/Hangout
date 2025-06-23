# Row Level Security (RLS) Setup for Django + Supabase

This document explains how to resolve the Supabase RLS security issues identified in your database linter report.

## 🔐 What is Row Level Security (RLS)?

Row Level Security (RLS) is a PostgreSQL feature that allows you to control which users can access which rows in your database tables. When RLS is enabled, users can only see and modify data that they're explicitly allowed to access through security policies.

## 🚨 Current Issues

Your Supabase linter identified that RLS is disabled on **16 tables**:

### Django System Tables
- `django_migrations`
- `django_content_type`
- `auth_permission`
- `auth_group`
- `auth_group_permissions`
- `django_admin_log`
- `django_session`

### Application Tables
- `users`
- `users_groups`
- `users_user_permissions`
- `user_preferences`
- `user_preferences_preferred_categories`
- `ai_chat_chat`
- `events`
- `event_attendees`
- `friendships`

## 🛠️ Solution Implementation

### Step 1: Set Up Auth Functions in Supabase (Required First)

**⚠️ Important:** Due to database permissions, you need to run the privileged operations in Supabase first.

1. **Open your Supabase Dashboard**
2. **Go to SQL Editor**
3. **Copy and run the entire contents of `supabase_sql_setup.sql`**

This will:
- ✅ Create the `auth` schema and functions (`auth.uid()`, `auth.role()`, `auth.jwt()`)
- ✅ Enable RLS on Django system tables
- ✅ Set up proper permissions

### Step 2: Run Django Migrations

After Step 1 is complete, run the Django setup:

```bash
cd backend
python setup_rls_simple.py
```

This will:
- ✅ Verify auth functions are set up
- ✅ Run Django migrations to enable RLS on your app tables
- ✅ Verify the setup worked correctly

### Alternative: Manual Django Migration

If you prefer to run migrations manually:

```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

## 🔧 Understanding the RLS Policies Created

#### User Tables
- **users**: Users can only view and edit their own profile
- **user_preferences**: Users can only manage their own preferences
- **friendships**: Users can view friendships they're part of, manage their own friend requests

#### Event Tables
- **events**: All authenticated users can view events, only hosts can modify their own events
- **event_attendees**: Users can view event attendees and manage their own attendance

#### AI Chat Tables
- **ai_chat_chat**: Users can only view and manage their own chat sessions

#### System Tables
- **django_migrations, django_content_type, auth_permission, auth_group**: Read-only for authenticated users
- **django_admin_log**: Only accessible to superusers
- **django_session**: Users can only access their own sessions
- **Many-to-many tables**: Users can view their own related data

## 🧪 Testing Your Setup

### 1. Verify RLS Functions

Run this in your Supabase SQL Editor:

```sql
-- Test auth functions
SELECT auth.uid(), auth.role();

-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;
```

### 2. Test API Endpoints

1. **Test API Endpoints**: Ensure your existing API endpoints still work
2. **Test Authentication**: Verify that users can only access their own data
3. **Test Permissions**: Check that unauthorized access is properly blocked

### 3. Check Supabase Linter

After setup, your Supabase linter should show **0 RLS errors**.

## 🔧 Configuration Details

### Supabase Authentication Integration

The solution includes a custom Django authentication class (`SupabaseAuthentication`) that:
- Validates Supabase JWT tokens
- Sets the proper user context for RLS policies
- Integrates seamlessly with Django REST Framework

### Policy Examples

```sql
-- Example policy for users table
CREATE POLICY "Users can view their own profile" ON users
FOR SELECT USING (auth.uid()::text = id::text);

-- Example policy for events table
CREATE POLICY "Authenticated users can view events" ON events
FOR SELECT USING (auth.role() = 'authenticated');
```

## 🔍 Troubleshooting

### Common Issues

1. **"permission denied for schema auth"**
   - ✅ **Solution**: Run `supabase_sql_setup.sql` in Supabase SQL Editor first
   - This gives you the proper privileges to create auth functions

2. **"auth.uid() function not found"**
   - ✅ **Solution**: Complete Step 1 (Supabase SQL setup) before Step 2

3. **"Permission denied for table"**
   - Check that RLS policies are correctly applied
   - Verify that your authentication is working

4. **"Users can't access their own data"**
   - Ensure your Supabase JWT tokens are being properly set
   - Check that the user context is being established

### Debugging Commands

```sql
-- Check if RLS is enabled on a table
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;

-- View all RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';

-- Test auth functions
SELECT auth.uid(), auth.role();
```

## 🚀 Next Steps

### 1. Test Everything
- Test all your API endpoints
- Verify users can only access their own data
- Check that public data (like events) is still accessible

### 2. Monitor Supabase Logs
- Watch for RLS policy violations
- Adjust policies if needed for your specific use case

### 3. Optional: Hide System Tables from PostgREST

If you don't need direct PostgREST access to Django system tables:

```sql
-- Run this in Supabase SQL editor to hide system tables from PostgREST
COMMENT ON TABLE django_migrations IS 'Hidden from PostgREST';
COMMENT ON TABLE django_content_type IS 'Hidden from PostgREST';
-- ... etc for other system tables
```

## 📋 Files Overview

- **`supabase_sql_setup.sql`** - Run in Supabase SQL Editor (Step 1)
- **`setup_rls_simple.py`** - Django setup script (Step 2)
- **`setup_rls.py`** - Original script (use `setup_rls_simple.py` instead)
- **Migration files** - Django migrations for app tables

## ✅ Summary

This solution provides comprehensive RLS protection for your Django + Supabase application by:

✅ **Securing user data**: Users can only access their own profiles, preferences, and chats  
✅ **Protecting system tables**: Django system tables have appropriate read-only policies  
✅ **Maintaining functionality**: Public data like events remains accessible to authenticated users  
✅ **Following best practices**: Uses Supabase-standard auth functions and JWT validation  

Your Supabase security linter should now show **0 RLS errors** after implementing this solution! 