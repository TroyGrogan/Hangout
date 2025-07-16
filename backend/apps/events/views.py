from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q
from .models import Event, EventAttendee
from .serializers import EventSerializer, EventAttendeeSerializer, EventAttendeeListSerializer
from apps.utils.supabase import upload_image, delete_image
import uuid
import os
import logging
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError

logger = logging.getLogger(__name__)

class EventViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing events
    """
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]  # Allow read access for guests
    pagination_class = None  # Disable pagination for this ViewSet
    
    def get_permissions(self):
        """
        Override permissions to allow public access for reading events and popular events.
        Require authentication for creating, updating, and deleting events.
        """
        if self.action in ['list', 'retrieve', 'popular']:
            # Allow anyone to view events and popular events
            permission_classes = [permissions.AllowAny]
        else:
            # Require authentication for create, update, delete
            permission_classes = [permissions.IsAuthenticated]
        
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """
        Configures queryset based on request parameters.
        Supports filtering by location, category, and date range.
        """
        queryset = Event.objects.all()
    
        # Get location query parameters
        location = self.request.query_params.get('location')
        lat = self.request.query_params.get('lat')
        lng = self.request.query_params.get('lng')
        radius = self.request.query_params.get('radius', 20)  # Default 20 miles
   
        # Handle direct lat/lng coordinates
        if lat and lng:
            try:
                target_lat = float(lat)
                target_lon = float(lng)
                logger.info(f"Using provided coordinates: {target_lat}, {target_lon}")
                
                # Filter events within radius
                filtered_event_ids = []

                for event in queryset:
                    distance = event.distance_from(target_lat, target_lon)
                    if distance <= float(radius):
                        filtered_event_ids.append(event.id)
                
                # Apply the filter to the queryset
                if filtered_event_ids:
                    queryset = queryset.filter(id__in=filtered_event_ids)
                else:
                    # No events found within radius
                    queryset = Event.objects.none()
                    
                logger.info(f"Found {queryset.count()} events within {radius} miles of coordinates")
                
            except Exception as e:
                logger.error(f"Error processing coordinates: {str(e)}")
                # In case of errors, continue with unfiltered results
                
        # Handle location name
        elif location:
            try:
                # Set up geocoder with appropriate user agent
                geolocator = Nominatim(user_agent="hangout_app")
                
                # Get coordinates for the location
                location_info = geolocator.geocode(location, timeout=10)
                
                if location_info:
                    target_lat = location_info.latitude
                    target_lon = location_info.longitude
                    logger.info(f"Found coordinates for '{location}': {target_lat}, {target_lon}")
                    
                    # Filter events within radius
                    filtered_event_ids = []

                    for event in queryset:
                        distance = event.distance_from(target_lat, target_lon)
                        if distance <= float(radius):
                            filtered_event_ids.append(event.id)
                    
                    # Apply the filter to the queryset
                    if filtered_event_ids:
                        queryset = queryset.filter(id__in=filtered_event_ids)
                    else:
                        # No events found within radius
                        queryset = Event.objects.none()
                        
                    logger.info(f"Found {queryset.count()} events within {radius} miles of '{location}'")
                else:
                    # Location not found
                    logger.warning(f"Could not geocode location: {location}")
                    queryset = Event.objects.none()
                    
            except (GeocoderTimedOut, GeocoderServiceError) as e:
                logger.error(f"Geocoding service error: {str(e)}")
                # In case of geocoding errors, continue with unfiltered results
            except Exception as e:
                logger.error(f"Unexpected error in location filtering: {str(e)}")
                # In case of unexpected errors, continue with unfiltered results
        
        # Apply any existing filters
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
            
        return queryset

    def create(self, request, *args, **kwargs):
        """Create a new event with enhanced error handling"""
        try:
            logger.info("=== Creating Event ===")
            logger.info(f"Raw data: {request.data}")
            logger.info(f"Files: {request.FILES}")
            logger.info(f"Content type: {request.content_type}")
            logger.info(f"User: {request.user}")
            
            # Create serializer instance
            serializer = self.get_serializer(data=request.data)
            
            # Validate the data
            if not serializer.is_valid():
                logger.error(f"Validation failed: {serializer.errors}")
                return Response(
                    {'error': serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Perform the creation
            self.perform_create(serializer)
            
            headers = self.get_success_headers(serializer.data)
            return Response(
                serializer.data, 
                status=status.HTTP_201_CREATED, 
                headers=headers
            )
            
        except Exception as e:
            logger.error(f"Error creating event: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def perform_create(self, serializer):
        """Sets the host to the current user when creating an event"""
        try:
            # Handle image upload if present
            image = self.request.FILES.get('image')
            image_url = None
            image_path = None
            
            if image:
                # Generate a unique filename
                file_ext = os.path.splitext(image.name)[1]
                file_path = f"{uuid.uuid4()}{file_ext}"
                
                # Upload to Supabase
                upload_result = upload_image(
                    'event-images', image.read(), file_path
                )
                
                if upload_result['success']:
                    image_url = upload_result['url']
                    image_path = upload_result['path']
                else:
                    logger.error(f"Image upload failed: {upload_result.get('error')}")
                    raise Exception('Failed to upload image')
            
            # Save the event
            serializer.save(
                host=self.request.user,
                image_url=image_url,
                image_path=image_path
            )
            
        except Exception as e:
            logger.error(f"Error in perform_create: {str(e)}")
            raise
    
    def perform_update(self, serializer):
        """Handle updates, including image changes"""
        try:
            # Handle image update
            image = self.request.FILES.get('image')
            instance = self.get_object()
            
            if image:
                # Delete old image if it exists
                if instance.image_path:
                    delete_image('event-images', instance.image_path)
                
                # Upload new image
                file_ext = os.path.splitext(image.name)[1]
                file_path = f"{uuid.uuid4()}{file_ext}"
                upload_result = upload_image(
                    'event-images', image.read(), file_path
                )
                
                if upload_result['success']:
                    serializer.save(
                        image_url=upload_result['url'],
                        image_path=upload_result['path']
                    )
                else:
                    logger.error(f"Image update failed: {upload_result.get('error')}")
                    raise Exception('Failed to update image')
            else:
                serializer.save()
        except Exception as e:
            logger.error(f"Error in perform_update: {str(e)}")
            raise
    
    def perform_destroy(self, instance):
        """Clean up images when deleting an event"""
        try:
            # Delete image from Supabase if it exists
            if instance.image_path:
                if not delete_image('event-images', instance.image_path):
                    logger.error(f"Failed to delete image {instance.image_path}")
            instance.delete()
        except Exception as e:
            logger.error(f"Error in perform_destroy: {str(e)}")
            raise
        
    @action(detail=True, methods=['post'])
    def rsvp(self, request, pk=None):
        """
        Handles RSVP operations for an event
        """
        # TODO: Implement RSVP logic
        pass
    
    @action(detail=False, methods=['get'])
    def popular(self, request):
        """
        Returns popular events based on RSVP count.
        Events are ordered by number of 'going' RSVPs.
        """
        try:
            events = Event.objects.annotate(
                attendee_count=Count(
                    'attendees',
                    filter=Q(attendees__rsvp_status='going')
                )
            ).order_by('-attendee_count')[:3]
            
            serializer = self.get_serializer(events, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error fetching popular events: {str(e)}")
            return Response(
                {'error': 'Failed to fetch popular events'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
class EventAttendeeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing event attendees and RSVPs
    """
    serializer_class = EventAttendeeSerializer
    permission_classes = [permissions.IsAuthenticated]  # Default: require authentication
    pagination_class = None  # Disable pagination for this ViewSet
    
    def get_permissions(self):
        """
        Override permissions to allow public access for viewing attendees.
        Require authentication for creating, updating, and deleting RSVPs.
        """
        if self.action in ['list', 'retrieve']:
            # Allow anyone to view attendee lists
            permission_classes = [permissions.AllowAny]
        else:
            # Require authentication for RSVP operations
            permission_classes = [permissions.IsAuthenticated]
        
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        event_id = self.request.query_params.get('event')
        queryset = EventAttendee.objects.all()
        
        if event_id:
            # If filtering by event, allow public access to see attendees
            queryset = queryset.filter(event_id=event_id)
        else:
            # If no event specified, filter by user (only for authenticated users)
            if self.request.user.is_authenticated:
                queryset = queryset.filter(user=self.request.user)
            else:
                # For unauthenticated users without event filter, return empty queryset
                queryset = EventAttendee.objects.none()
            
        return queryset.select_related('user', 'event')
    
    def create(self, request, *args, **kwargs):
        """Handle RSVP creation/update"""
        try:
            event_id = request.data.get('event')
            if not event_id:
                return Response(
                    {'error': 'Event ID is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            rsvp_status = request.data.get('rsvp_status')
            if rsvp_status not in ['going', 'not_going', 'maybe']:
                return Response(
                    {'error': 'Invalid RSVP status'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            attendee, created = EventAttendee.objects.get_or_create(
                event_id=event_id,
                user=request.user,
                defaults={'rsvp_status': rsvp_status}
            )
            
            if not created:
                # Update existing RSVP
                attendee.rsvp_status = rsvp_status
                attendee.save()
            
            serializer = self.get_serializer(attendee)
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
            )
            
        except Event.DoesNotExist:
            return Response(
                {'error': 'Event not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    def list(self, request, *args, **kwargs):
        """List attendees with filtering"""
        queryset = self.get_queryset()

        rsvp_status = request.query_params.get('status')
        if rsvp_status:
            queryset = queryset.filter(rsvp_status=rsvp_status)

        event_id = request.query_params.get('event')
        if event_id:
            serializer = EventAttendeeListSerializer(queryset, many=True)
        else:
            serializer = self.get_serializer(queryset, many=True)
            
        return Response(serializer.data)