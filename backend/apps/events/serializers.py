from rest_framework import serializers
from decimal import Decimal
from .models import Event, EventAttendee
from apps.users.serializers import BasicUserSerializer
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
import logging

logger = logging.getLogger(__name__)

class EventSerializer(serializers.ModelSerializer):
    attendee_count = serializers.IntegerField(read_only=True)
    is_user_attending = serializers.SerializerMethodField()
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, coerce_to_string=False)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, coerce_to_string=False)
    host = BasicUserSerializer(read_only=True)

    class Meta:
        model = Event
        fields = [
            'id', 'name', 'description', 'host', 'category',
            'location_name', 'event_address', 'latitude', 'longitude',
            'start_time', 'end_time', 'is_recurring',
            'image_url', 'price', 'max_attendees',
            'attendee_count', 'is_user_attending',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['host', 'created_at', 'updated_at', 'image_url']

    def get_is_user_attending(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return EventAttendee.objects.filter(
                event=obj,
                user=request.user,
                rsvp_status='going'
            ).exists()
        return False

    def validate_location_name(self, value):
        """Validate that the location name can be geocoded"""
        if not value or not value.strip():
            raise serializers.ValidationError("Location name is required.")
        
        try:
            geolocator = Nominatim(user_agent="hangout_app")
            location_info = geolocator.geocode(value.strip(), timeout=10)
            
            if not location_info:
                raise serializers.ValidationError(
                    "Invalid location name. Please provide a valid location that can be found on the map."
                )
            
            return value.strip()
            
        except (GeocoderTimedOut, GeocoderServiceError) as e:
            logger.error(f"Geocoding service error for location_name '{value}': {str(e)}")
            raise serializers.ValidationError(
                "Unable to validate location name due to service error. Please try again."
            )
        except Exception as e:
            logger.error(f"Unexpected error validating location_name '{value}': {str(e)}")
            raise serializers.ValidationError(
                "Unable to validate location name. Please try again."
            )

    def validate_event_address(self, value):
        """Validate that the event address can be geocoded"""
        if not value or not value.strip():
            raise serializers.ValidationError("Event address is required.")
        
        try:
            geolocator = Nominatim(user_agent="hangout_app")
            location_info = geolocator.geocode(value.strip(), timeout=10)
            
            if not location_info:
                raise serializers.ValidationError(
                    "Invalid event address. Please provide a valid address that can be found on the map."
                )
            
            return value.strip()
            
        except (GeocoderTimedOut, GeocoderServiceError) as e:
            logger.error(f"Geocoding service error for event_address '{value}': {str(e)}")
            raise serializers.ValidationError(
                "Unable to validate event address due to service error. Please try again."
            )
        except Exception as e:
            logger.error(f"Unexpected error validating event_address '{value}': {str(e)}")
            raise serializers.ValidationError(
                "Unable to validate event address. Please try again."
            )

    def validate(self, data):
        # Validate end_time is after start_time
        if 'end_time' in data and 'start_time' in data:
            if data['end_time'] <= data['start_time']:
                raise serializers.ValidationError({
                    'end_time': 'End time must be after start time'
                })

        # Convert string coordinates to Decimal if necessary
        if 'latitude' in data and isinstance(data['latitude'], str):
            try:
                data['latitude'] = Decimal(data['latitude'])
            except:
                raise serializers.ValidationError({
                    'latitude': 'Invalid latitude value'
                })

        if 'longitude' in data and isinstance(data['longitude'], str):
            try:
                data['longitude'] = Decimal(data['longitude'])
            except:
                raise serializers.ValidationError({
                    'longitude': 'Invalid longitude value'
                })

        return data
    
class EventAttendeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventAttendee
        fields = ['id', 'event', 'user', 'rsvp_status', 'created_at']
        read_only_fields = ['user', 'created_at']

class EventAttendeeListSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for listing event attendees
    """
    username = serializers.CharField(source='user.username')
    full_name = serializers.SerializerMethodField()
    profile_image = serializers.URLField(source='user.profile_image', default='')
    id = serializers.IntegerField(source='user.id')
    
    class Meta:
        model = EventAttendee
        fields = ['id', 'username', 'full_name', 'profile_image', 'rsvp_status']
        
    def get_full_name(self, obj):
        if obj.user.first_name or obj.user.last_name:
            return f"{obj.user.first_name} {obj.user.last_name}".strip()
        return obj.user.username