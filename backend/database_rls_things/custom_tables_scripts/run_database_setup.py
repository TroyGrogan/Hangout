#!/usr/bin/env python3
"""
Database setup script that uses Django's existing database configuration
to connect to Supabase and run SQL commands.
"""

import os
import sys
import django
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.db import connection
from django.core.management import execute_from_command_line


def run_sql_file(sql_file_path):
    """Run SQL commands from a file using Django's database connection."""
    try:
        with open(sql_file_path, 'r') as file:
            sql_content = file.read()
        
        print(f"Executing SQL from: {sql_file_path}")
        
        with connection.cursor() as cursor:
            # Split the SQL content into individual statements
            statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
            
            for i, statement in enumerate(statements, 1):
                if statement:
                    print(f"Executing statement {i}/{len(statements)}...")
                    try:
                        cursor.execute(statement)
                        print(f"✓ Statement {i} executed successfully")
                    except Exception as e:
                        print(f"✗ Error in statement {i}: {e}")
                        print(f"Statement: {statement[:100]}...")
                        continue
        
        print(f"✓ Successfully executed SQL from {sql_file_path}")
        
    except FileNotFoundError:
        print(f"✗ SQL file not found: {sql_file_path}")
        return False
    except Exception as e:
        print(f"✗ Error executing SQL: {e}")
        return False
    
    return True


def test_connection():
    """Test the database connection."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT version();")
            result = cursor.fetchone()
            print(f"✓ Database connection successful!")
            print(f"PostgreSQL version: {result[0]}")
            return True
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        return False


def run_migrations():
    """Run Django migrations."""
    try:
        print("Running Django migrations...")
        execute_from_command_line(['manage.py', 'migrate'])
        print("✓ Migrations completed successfully")
        return True
    except Exception as e:
        print(f"✗ Error running migrations: {e}")
        return False


def main():
    """Main function to set up the database."""
    print("=== Database Setup Script ===")
    print("Using Django's database configuration from settings.py")
    
    # Test database connection
    print("\n1. Testing database connection...")
    if not test_connection():
        print("Please check your database configuration in settings.py and .env file")
        return
    
    # Run migrations first
    print("\n2. Running Django migrations...")
    if not run_migrations():
        print("Migration failed. Please check for errors.")
        return
    
    # Check if SQL setup file exists and run it
    sql_file = backend_dir / 'supabase_sql_setup.sql'
    if sql_file.exists():
        print(f"\n3. Running SQL setup from {sql_file}...")
        if run_sql_file(sql_file):
            print("✓ Database setup completed successfully!")
        else:
            print("✗ SQL setup failed. Check the errors above.")
    else:
        print(f"\n3. SQL setup file not found: {sql_file}")
        print("✓ Basic database setup completed (migrations only)")
    
    print("\n=== Setup Complete ===")


if __name__ == '__main__':
    main() 