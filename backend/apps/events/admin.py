from django.contrib import admin
from .models import Event, EventAttendee

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('name', 'host', 'start_time', 'location_name', 'is_recurring')
    list_filter = ('is_recurring',)
    search_fields = ('name', 'description', 'location_name')
    date_hierarchy = 'start_time'

@admin.register(EventAttendee)
class EventAttendeeAdmin(admin.ModelAdmin):
    list_display = ('event', 'user', 'rsvp_status', 'created_at')
    list_filter = ('rsvp_status',)
    search_fields = ('event__name', 'user__username')