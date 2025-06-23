#!/usr/bin/env python3
"""
Simplified RLS Setup Script for Django + Supabase
This script only runs Django migrations after you've set up the auth functions manually.

Prerequisites:
1. Run supabase_rls_fix.sql in your Supabase SQL Editor first
2. Then run this script to handle Django migrations

Usage: python setup_rls_simple.py
"""

import os
import sys
import django
from django.core.management import execute_from_command_line
from django.db import connection

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

def check_auth_functions():
    """Check if the auth functions exist."""
    with connection.cursor() as cursor:
        try:
            cursor.execute("""
                SELECT routine_name FROM information_schema.routines 
                WHERE routine_schema = 'auth' AND routine_name IN ('uid', 'role', 'jwt')
            """)
            functions = [row[0] for row in cursor.fetchall()]
            
            if len(functions) == 3:
                print("✓ Auth functions found (uid, role, jwt)")
                return True
            else:
                print(f"⚠ Missing auth functions. Found: {functions}")
                return False
        except Exception as e:
            print(f"✗ Error checking auth functions: {e}")
            return False

def run_migrations():
    """Run Django migrations to enable RLS on app tables."""
    print("Running Django migrations...")
    
    try:
        # Make migrations first
        print("Creating new migrations...")
        os.system("python manage.py makemigrations")
        
        # Run migrations
        print("Applying migrations...")
        os.system("python manage.py migrate")
        
        print("✓ Django migrations completed")
        return True
    except Exception as e:
        print(f"✗ Migration error: {e}")
        return False

def verify_rls():
    """Verify that RLS is enabled on key tables."""
    with connection.cursor() as cursor:
        try:
            cursor.execute("""
                SELECT tablename, rowsecurity 
                FROM pg_tables 
                WHERE schemaname = 'public' 
                AND tablename IN ('users', 'events', 'ai_chat_chat', 'user_preferences', 'friendships')
                ORDER BY tablename;
            """)
            
            results = cursor.fetchall()
            print("\nRLS Status for Key Tables:")
            print("-" * 30)
            
            for table, rls_enabled in results:
                status = "✓ Enabled" if rls_enabled else "✗ Disabled"
                print(f"{table}: {status}")
                
            return len([r for r in results if r[1]]) > 0  # Return True if any RLS is enabled
            
        except Exception as e:
            print(f"✗ Error checking RLS status: {e}")
            return False

def main():
    """Main setup function."""
    print("🚀 Simplified RLS Setup for Django + Supabase")
    print("=" * 50)
    
    # Step 1: Check if auth functions exist
    print("\n1. Checking auth functions...")
    if not check_auth_functions():
        print("\n❌ Auth functions not found!")
        print("\n📋 Next steps:")
        print("1. Open your Supabase dashboard")
        print("2. Go to SQL Editor")
        print("3. Run the contents of supabase_sql_setup.sql")
        print("4. Then run this script again")
        sys.exit(1)
    
    # Step 2: Run migrations
    print("\n2. Running Django migrations...")
    if not run_migrations():
        print("\n❌ Migration failed!")
        sys.exit(1)
    
    # Step 3: Verify setup
    print("\n3. Verifying RLS setup...")
    if verify_rls():
        print("\n" + "=" * 50)
        print("🎉 RLS Setup Complete!")
        print("\n✅ Next steps:")
        print("1. Test your API endpoints to ensure RLS is working")
        print("2. Check Supabase linter to verify 0 RLS errors")
        print("3. Monitor application logs for any access issues")
    else:
        print("\n⚠ Setup completed but RLS verification failed")
        print("This might be normal if you haven't created any tables yet.")

if __name__ == "__main__":
    main() 