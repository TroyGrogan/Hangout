from django.db import models
from django.conf import settings

class Chat(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    chat_session = models.CharField(max_length=50) # Consider using UUIDField for session IDs
    message = models.TextField() # User's message
    response = models.TextField() # AI's response
    created_at = models.DateTimeField(auto_now_add=True)
    title = models.CharField(max_length=255, blank=True, null=True) # Title for the session
    bookmarked = models.BooleanField(default=False) # Not used in current frontend?
    remaining_messages = models.IntegerField(default=5) # Not used in current frontend?
    model_mode = models.CharField(max_length=20, default="Default") # Not used in current frontend?
    is_automatic = models.BooleanField(default=True) # Not used in current frontend?

    def __str__(self):
        return f"Chat with {self.user.username} ({self.chat_session}) - {self.created_at}"

    class Meta:
        # Ensure correct ordering for retrieving messages within a session
        ordering = ['chat_session', 'created_at'] 
        # Add index for faster session lookup?
        # indexes = [
        #     models.Index(fields=['user', 'chat_session']),
        # ] 