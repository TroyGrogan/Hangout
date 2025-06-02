from django.db import models
from django.conf import settings
from geopy.distance import geodesic

class Event(models.Model):
    """
    Core event model for storing event information
    """
    name = models.CharField(max_length=200)
    description = models.TextField()
    host = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='hosted_events')
    
    # Category field - stores the category ID as integer
    category = models.IntegerField(null=True, blank=True)
    
    # Location fields
    location_name = models.CharField(max_length=200)
    event_address = models.CharField(max_length=255, blank=True, null=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    
    # Time fields
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    is_recurring = models.BooleanField(default=False)

    # Image field - store Supabase URL
    image_url = models.URLField(blank=True, null=True)  # Added null=True
    image_path = models.CharField(max_length=255, blank=True, null=True)  # Added null=True
    
    # Additional fields
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    max_attendees = models.PositiveIntegerField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'events'
        indexes = [
            models.Index(fields=['latitude', 'longitude']),
            models.Index(fields=['start_time']),
            models.Index(fields=['category']),
        ]

    def distance_from(self, lat, lng):
        """
        Calculate distance in miles from given coordinates to event location
        """
        from geopy.distance import geodesic
        
        event_location = (float(self.latitude), float(self.longitude))
        target_location = (float(lat), float(lng))
        
        return geodesic(event_location, target_location).miles

class EventAttendee(models.Model):
    """
    Tracks event attendance and RSVP status
    """
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='attendees')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='attending_events')
    rsvp_status = models.CharField(max_length=20, choices=[
        ('going', 'Going'),
        ('maybe', 'Maybe'),
        ('not_going', 'Not Going'),
    ])
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'event_attendees'
        unique_together = ['event', 'user']