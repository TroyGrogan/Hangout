from django.db import migrations

class Migration(migrations.Migration):
    
    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        # Enable RLS on users table
        migrations.RunSQL(
            "ALTER TABLE users ENABLE ROW LEVEL SECURITY;",
            reverse_sql="ALTER TABLE users DISABLE ROW LEVEL SECURITY;"
        ),
        
        # Enable RLS on user_preferences table
        migrations.RunSQL(
            "ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;",
            reverse_sql="ALTER TABLE user_preferences DISABLE ROW LEVEL SECURITY;"
        ),
        
        # Enable RLS on friendships table
        migrations.RunSQL(
            "ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;",
            reverse_sql="ALTER TABLE friendships DISABLE ROW LEVEL SECURITY;"
        ),
        
        # Create RLS policy for users - users can only see their own data
        migrations.RunSQL(
            """
            CREATE POLICY "Users can view their own profile" ON users
            FOR SELECT USING (auth.uid()::text = id::text);
            """,
            reverse_sql="DROP POLICY IF EXISTS \"Users can view their own profile\" ON users;"
        ),
        
        migrations.RunSQL(
            """
            CREATE POLICY "Users can update their own profile" ON users
            FOR UPDATE USING (auth.uid()::text = id::text);
            """,
            reverse_sql="DROP POLICY IF EXISTS \"Users can update their own profile\" ON users;"
        ),
        
        # Create RLS policy for user_preferences
        migrations.RunSQL(
            """
            CREATE POLICY "Users can manage their own preferences" ON user_preferences
            FOR ALL USING (auth.uid()::text = user_id::text);
            """,
            reverse_sql="DROP POLICY IF EXISTS \"Users can manage their own preferences\" ON user_preferences;"
        ),
        
        # Create RLS policy for friendships - users can see friendships they're part of
        migrations.RunSQL(
            """
            CREATE POLICY "Users can view their friendships" ON friendships
            FOR SELECT USING (auth.uid()::text = user_id::text OR auth.uid()::text = friend_id::text);
            """,
            reverse_sql="DROP POLICY IF EXISTS \"Users can view their friendships\" ON friendships;"
        ),
        
        migrations.RunSQL(
            """
            CREATE POLICY "Users can manage their own friendships" ON friendships
            FOR ALL USING (auth.uid()::text = user_id::text);
            """,
            reverse_sql="DROP POLICY IF EXISTS \"Users can manage their own friendships\" ON friendships;"
        ),
    ] 