from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models import JSONField

class User(AbstractUser):
    """
    Custom user model extending Django's AbstractUser.
    Adds additional fields needed for the Hangout app.
    """
    # Add related_name to avoid clashes with auth.User
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name='groups',
        blank=True,
        related_name='custom_user_set',
        help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.'
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name='user permissions',
        blank=True,
        related_name='custom_user_set',
        help_text='Specific permissions for this user.'
    )
    
    # Additional fields beyond AbstractUser
    bio = models.TextField(max_length=500, blank=True)
    location = models.CharField(max_length=100, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    profile_image = models.URLField(blank=True)  # Stored in Supabase storage
    
    def save(self, *args, **kwargs):
        # Convert username to lowercase before saving
        self.username = self.username.lower()
        return super().save(*args, **kwargs)
    
    # TODO: Add methods for location-based queries
    def get_events_within_radius(self, radius_miles=20):
        """Returns events within specified radius of user's location"""
        pass

    class Meta:
        db_table = 'users'
        
class UserPreference(models.Model):
    """
    Stores user preferences including preferred categories and notification settings
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='preferences')
    preferred_categories = JSONField(default=list, blank=True)
    notification_enabled = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'user_preferences'

class Friendship(models.Model):
    """
    Tracks friendship between users
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    ]
    
    user = models.ForeignKey(User, related_name='friendships', on_delete=models.CASCADE)
    friend = models.ForeignKey(User, related_name='friend_of', on_delete=models.CASCADE)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='accepted')  # Add this line
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'friendships'
        unique_together = ('user', 'friend')
        
    def __str__(self):
        return f"{self.user.username} -> {self.friend.username}"