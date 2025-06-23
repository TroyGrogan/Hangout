from django.db import migrations

class Migration(migrations.Migration):
    
    dependencies = [
        ('ai_chat', '0001_initial'),
    ]

    operations = [
        # Enable RLS on ai_chat_chat table
        migrations.RunSQL(
            "ALTER TABLE ai_chat_chat ENABLE ROW LEVEL SECURITY;",
            reverse_sql="ALTER TABLE ai_chat_chat DISABLE ROW LEVEL SECURITY;"
        ),
        
        # Create RLS policy for ai_chat_chat - users can only see their own chats
        migrations.RunSQL(
            """
            CREATE POLICY "Users can view their own chats" ON ai_chat_chat
            FOR SELECT USING (auth.uid()::text = user_id::text);
            """,
            reverse_sql="DROP POLICY IF EXISTS \"Users can view their own chats\" ON ai_chat_chat;"
        ),
        
        # Create RLS policy for ai_chat_chat - users can manage their own chats
        migrations.RunSQL(
            """
            CREATE POLICY "Users can manage their own chats" ON ai_chat_chat
            FOR ALL USING (auth.uid()::text = user_id::text);
            """,
            reverse_sql="DROP POLICY IF EXISTS \"Users can manage their own chats\" ON ai_chat_chat;"
        ),
    ] 