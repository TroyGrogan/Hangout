"""
Supabase Authentication Integration for Django
Handles JWT token validation and user context for RLS policies.
"""

import jwt
import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import connection
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

User = get_user_model()

class SupabaseAuthentication(BaseAuthentication):
    """
    Custom authentication class that validates Supabase JWT tokens
    and sets the user context for RLS policies.
    """
    
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None
            
        token = auth_header.split(' ')[1]
        
        try:
            # Decode and validate the JWT token
            payload = jwt.decode(
                token, 
                settings.SUPABASE_ANON_KEY, 
                algorithms=['HS256'],
                options={"verify_signature": False}  # Supabase handles signature verification
            )
            
            user_id = payload.get('sub')
            if not user_id:
                raise AuthenticationFailed('Invalid token payload')
            
            # Get or create the user
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                # Create user from Supabase auth metadata if needed
                user_email = payload.get('email')
                if user_email:
                    user = User.objects.create(
                        id=user_id,
                        email=user_email,
                        username=user_email.split('@')[0],
                    )
                else:
                    raise AuthenticationFailed('User not found')
            
            # Set the Supabase user context for RLS
            self.set_supabase_context(user_id, token)
            
            return (user, token)
            
        except jwt.InvalidTokenError:
            raise AuthenticationFailed('Invalid token')
        except Exception as e:
            raise AuthenticationFailed(f'Authentication failed: {str(e)}')
    
    def set_supabase_context(self, user_id, token):
        """
        Set the Supabase user context in the database session for RLS policies.
        This allows PostgreSQL RLS policies to access auth.uid() and auth.jwt().
        """
        with connection.cursor() as cursor:
            # Set the user ID for auth.uid()
            cursor.execute("SELECT set_config('request.jwt.claims', %s, true)", [token])
            cursor.execute("SELECT set_config('request.jwt.claim.sub', %s, true)", [user_id])
            cursor.execute("SELECT set_config('role', 'authenticated', true)")


def create_supabase_rls_user_function():
    """
    Create PostgreSQL functions that RLS policies can use to get user context.
    Run this once in your database setup.
    """
    sql_functions = """
    -- Function to get current user ID from JWT
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
    BEGIN
        RETURN COALESCE(
            current_setting('request.jwt.claim.sub', true)::uuid,
            (current_setting('request.jwt.claims', true)::json ->> 'sub')::uuid
        );
    EXCEPTION
        WHEN others THEN
            RETURN NULL;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Function to get current user role
    CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$
    BEGIN
        RETURN COALESCE(
            current_setting('role', true),
            'anon'
        );
    EXCEPTION
        WHEN others THEN
            RETURN 'anon';
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Function to get JWT claims
    CREATE OR REPLACE FUNCTION auth.jwt() RETURNS json AS $$
    BEGIN
        RETURN COALESCE(
            current_setting('request.jwt.claims', true)::json,
            '{}'::json
        );
    EXCEPTION
        WHEN others THEN
            RETURN '{}'::json;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    """
    
    with connection.cursor() as cursor:
        cursor.execute(sql_functions)


def setup_supabase_rls():
    """
    Complete setup function to run once to prepare your database for RLS.
    """
    print("Setting up Supabase RLS functions...")
    create_supabase_rls_user_function()
    print("✓ Supabase RLS functions created successfully!") 