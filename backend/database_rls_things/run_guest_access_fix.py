#!/usr/bin/env python3
"""
Script to fix RLS policies for guest access to events.
This allows guest users to view events and attendees while maintaining
security for write operations.
"""

import os
import sys
from pathlib import Path

# Add the parent directory to Python path so we can import Django settings
sys.path.append(str(Path(__file__).resolve().parent.parent))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

import django
django.setup()

from django.db import connection
from django.core.management.base import BaseCommand

def run_guest_access_fix():
    """Run the SQL script to enable guest access to events."""
    
    script_dir = Path(__file__).parent
    sql_file = script_dir / 'fix_guest_access.sql'
    
    if not sql_file.exists():
        print(f"❌ SQL file not found: {sql_file}")
        return False
    
    try:
        # Read the SQL script
        with open(sql_file, 'r') as f:
            sql_script = f.read()
        
        print("🔧 Running guest access fix...")
        print(f"📁 Using SQL file: {sql_file}")
        
        # Execute the SQL script
        with connection.cursor() as cursor:
            cursor.execute(sql_script)
        
        print("✅ Guest access fix completed successfully!")
        print("🎉 Guest users can now view events and attendees!")
        print()
        print("📋 Summary of changes:")
        print("   • Events: Public read access enabled")
        print("   • Event Attendees: Public read access enabled") 
        print("   • Write operations: Still require authentication")
        print()
        print("🧪 Test the changes by:")
        print("   1. Opening your app without logging in")
        print("   2. Navigating to the Calendar page")
        print("   3. Checking if events are visible")
        
        return True
        
    except Exception as e:
        print(f"❌ Error running guest access fix: {str(e)}")
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("🔓 GUEST ACCESS FIX FOR EVENTS")
    print("=" * 60)
    print()
    
    success = run_guest_access_fix()
    
    if success:
        print()
        print("=" * 60)
        print("✅ Setup completed successfully!")
        print("=" * 60)
        sys.exit(0)
    else:
        print()
        print("=" * 60) 
        print("❌ Setup failed!")
        print("=" * 60)
        sys.exit(1) 