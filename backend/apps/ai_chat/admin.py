from django.contrib import admin
from .models import Chat

@admin.register(Chat)
class ChatAdmin(admin.ModelAdmin):
    list_display = ('user', 'chat_session', 'message', 'title', 'created_at') # Removed fields likely unused by frontend
    list_filter = ('user', 'created_at') # Simplified filters
    search_fields = ('message', 'response', 'chat_session', 'title', 'user__username') # Added user search
    readonly_fields = ('created_at', 'user', 'chat_session', 'message', 'response') # Make core fields read-only in admin
    list_per_page = 25
    
    # Optional: Add date hierarchy for easier navigation
    # date_hierarchy = 'created_at' 