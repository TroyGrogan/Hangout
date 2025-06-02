from rest_framework import status, viewsets, permissions
from rest_framework.decorators import action, permission_classes, api_view
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth.hashers import check_password
from .models import User, UserPreference, Friendship
from .serializers import (
    UserSerializer, 
    UserPreferenceSerializer, 
    UserRegistrationSerializer,
    FriendshipSerializer
)
from django.db.models import Exists, OuterRef
from apps.events.models import Event, EventAttendee
from apps.utils.supabase import upload_image, delete_image
import uuid
import os


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing user profiles
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None  # Disable pagination for this ViewSet

    def get_queryset(self):
        if self.request.user.is_staff:
            return User.objects.all()
        return User.objects.filter(id=self.request.user.id)

    @action(detail=False, methods=['get', 'patch'], url_path='me')
    def me(self, request):
        """
        Handle GET and PATCH requests for the current user's profile
        """
        user = request.user
        
        if request.method == 'GET':
            serializer = self.get_serializer(user)
            return Response(serializer.data)
        
        elif request.method == 'PATCH':
            data = request.data.copy()
            image_file = request.FILES.get('profile_image')
            image_url = None
            image_path = None
            old_image_path = user.profile_image

            if image_file:
                try:
                    # Generate a unique file path within the profile-images bucket
                    file_ext = os.path.splitext(image_file.name)[1]
                    # Use user ID for organization, ensure uniqueness with uuid
                    file_path = f"user_{user.id}/{uuid.uuid4()}{file_ext}" 

                    upload_result = upload_image(
                        'profile-images', 
                        image_file.read(), 
                        file_path
                    )
                    
                    if upload_result['success']:
                        image_url = upload_result['url']
                        data['profile_image'] = image_url 
                        
                        # Delete old image if it exists and is different
                        if old_image_path and old_image_path != image_url:
                            try:
                                # Extract the path part from the URL
                                path_to_delete = old_image_path.split('/profile-images/')[-1]
                                if path_to_delete != old_image_path:
                                    delete_image('profile-images', path_to_delete)
                            except Exception as delete_err:
                                print(f"Error deleting old profile image: {delete_err}")
                                # Continue even if deletion fails
                                
                    else:
                        # Handle upload failure
                        return Response(
                            {"error": f"Failed to upload profile image: {upload_result.get('error')}"},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR
                        )
                except Exception as upload_err:
                    # Handle exceptions during file processing/upload
                    return Response(
                        {"error": f"Error processing profile image: {str(upload_err)}"},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
            else:
                # If no new image is uploaded, ensure the existing one isn't overwritten by mistake
                if 'profile_image' in data: 
                    del data['profile_image']

            # Proceed with serializer validation and saving
            serializer = self.get_serializer(user, data=data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        

    @action(detail=False, methods=['get', 'put'], url_path='preferences')
    def preferences(self, request):
        """
        Get or update user category preferences
        """
        user = request.user
        try:
            # Get or create user preferences if they don't exist
            user_preference, created = UserPreference.objects.get_or_create(user=user)
            
            if request.method == 'GET':
                serializer = UserPreferenceSerializer(user_preference)
                return Response(serializer.data)
                
            elif request.method == 'PUT':
                serializer = UserPreferenceSerializer(user_preference, data=request.data, partial=True)
                if serializer.is_valid():
                    serializer.save()
                    return Response(serializer.data)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    @action(detail=False, methods=['get'], url_path='friends')
    def friends(self, request):
        """
        Get the current user's friends (only accepted friendships)
        """
        friendships = Friendship.objects.filter(user=request.user, status='accepted')
        serializer = FriendshipSerializer(friendships, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='friend-requests')
    def friend_requests(self, request):
        """
        Get both incoming and outgoing friend requests
        """
        # Get incoming friend requests (where current user is the friend and status is pending)
        incoming = Friendship.objects.filter(friend=request.user, status='pending')
        incoming_serializer = FriendshipSerializer(incoming, many=True)
        
        # Get outgoing friend requests (where current user is the user and status is pending)
        outgoing = Friendship.objects.filter(user=request.user, status='pending')
        outgoing_serializer = FriendshipSerializer(outgoing, many=True)
        
        return Response({
            'incoming': incoming_serializer.data,
            'outgoing': outgoing_serializer.data
        })

    @action(detail=True, methods=['post'], url_path='add-friend')
    def add_friend(self, request, pk=None):
        """
        Send a friend request to a user
        """
        try:
            friend = User.objects.get(pk=pk)
            
            # Don't allow adding yourself
            if friend == request.user:
                return Response(
                    {"error": "You cannot add yourself as a friend"},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Check if already friends or request pending
            existing = Friendship.objects.filter(user=request.user, friend=friend).first()
            if existing:
                if existing.status == 'accepted':
                    return Response(
                        {"error": "Already friends with this user"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                elif existing.status == 'pending':
                    return Response(
                        {"error": "Friend request already sent"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                elif existing.status == 'rejected':
                    # If previously rejected, allow to send a new request by updating status
                    existing.status = 'pending'
                    existing.save()
                    serializer = FriendshipSerializer(existing)
                    return Response(serializer.data, status=status.HTTP_200_OK)
            
            # Check if there's already an incoming request from this user
            if Friendship.objects.filter(user=friend, friend=request.user, status='pending').exists():
                return Response(
                    {"error": "This user has already sent you a friend request", "action": "accept"},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Create friendship with pending status
            friendship = Friendship.objects.create(
                user=request.user, 
                friend=friend,
                status='pending'
            )
            
            serializer = FriendshipSerializer(friendship)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            # Log the full error for debugging
            import traceback
            print(f"Error adding friend: {str(e)}")
            traceback.print_exc()
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='accept-friend')
    def accept_friend(self, request, pk=None):
        """
        Accept a friend request
        """
        try:
            user = User.objects.get(pk=pk)
            
            # Find the pending friendship
            friendship = Friendship.objects.filter(
                user=user, 
                friend=request.user,
                status='pending'
            ).first()
            
            if not friendship:
                return Response(
                    {"error": "No pending friend request found from this user"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Update the status to accepted
            friendship.status = 'accepted'
            friendship.save()
            
            # Create the reverse friendship
            reverse_friendship, created = Friendship.objects.get_or_create(
                user=request.user,
                friend=user,
                defaults={'status': 'accepted'}
            )
            
            # If the reverse friendship already existed but wasn't accepted, update it
            if not created and reverse_friendship.status != 'accepted':
                reverse_friendship.status = 'accepted'
                reverse_friendship.save()
            
            serializer = FriendshipSerializer(friendship)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='reject-friend')
    def reject_friend(self, request, pk=None):
        """
        Reject a friend request
        """
        try:
            user = User.objects.get(pk=pk)
            
            # Find the pending friendship
            friendship = Friendship.objects.filter(
                user=user, 
                friend=request.user,
                status='pending'
            ).first()
            
            if not friendship:
                return Response(
                    {"error": "No pending friend request found from this user"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Update the status to rejected
            friendship.status = 'rejected'
            friendship.save()
            
            serializer = FriendshipSerializer(friendship)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='cancel-request')
    def cancel_request(self, request, pk=None):
        """
        Cancel a sent friend request
        """
        try:
            friend = User.objects.get(pk=pk)
            
            # Find the pending friendship initiated by the current user
            friendship = Friendship.objects.filter(
                user=request.user, 
                friend=friend,
                status='pending'
            ).first()
            
            if not friendship:
                return Response(
                    {"error": "No pending friend request found to this user"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Delete the friend request
            friendship.delete()
            
            return Response(status=status.HTTP_204_NO_CONTENT)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['delete'], url_path='remove-friend')
    def remove_friend(self, request, pk=None):
        """
        Remove a user from friends
        """
        try:
            friend = User.objects.get(pk=pk)
            
            # Remove both directions of friendship
            Friendship.objects.filter(user=request.user, friend=friend).delete()
            Friendship.objects.filter(user=friend, friend=request.user).delete()
            
            return Response(status=status.HTTP_204_NO_CONTENT)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'], url_path='friends-events')
    def friends_events(self, request):
        """
        Get events that friends are attending
        """
        # Get current user's friends (only accepted friendships)
        friends = Friendship.objects.filter(
            user=request.user, 
            status='accepted'
        ).values_list('friend', flat=True)
        
        # Find events where friends are attending
        friend_attendees = EventAttendee.objects.filter(
            user__in=friends,
            rsvp_status='going'
        ).values_list('event', flat=True)
        
        events = Event.objects.filter(id__in=friend_attendees).order_by('-start_time')
        
        from apps.events.serializers import EventSerializer
        serializer = EventSerializer(events, many=True, context={'request': request})
        
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='search')
    def search_users(self, request):
        """
        Search for users by username
        """
        query = request.query_params.get('q', '').lower()
        if not query:
            return Response(
                {"error": "Search query parameter 'q' is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Exclude current user from results
        users = User.objects.filter(
            username__icontains=query
        ).exclude(
            id=request.user.id
        )[:10]  # Limit to 10 results for performance
        
        # Check if each user is already a friend or has a pending request
        results = []
        for user in users:
            # Check for any existing friendship relation between the users
            friendship_from_me = Friendship.objects.filter(
                user=request.user, 
                friend=user
            ).first()
            
            friendship_to_me = Friendship.objects.filter(
                user=user, 
                friend=request.user
            ).first()
            
            friendship_status = None
            if friendship_from_me and friendship_from_me.status == 'accepted':
                friendship_status = 'friend'
            elif friendship_from_me and friendship_from_me.status == 'pending':
                friendship_status = 'request_sent'
            elif friendship_to_me and friendship_to_me.status == 'pending':
                friendship_status = 'request_received'
                
            user_data = UserSerializer(user).data
            user_data['friendship_status'] = friendship_status
            results.append(user_data)
        
        return Response(results)

@permission_classes([AllowAny])
class RegisterView(APIView):
    """
    View for handling user registration
    """    
    def post(self, request):
        print("Received registration request:", request.data)
        serializer = UserRegistrationSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                # Get the validated data
                validated_data = serializer.validated_data
                password = validated_data.pop('password')
                validated_data.pop('confirm_password', None)
                
                # Create user instance but don't save yet
                user = User(**validated_data)
                # Set password properly to ensure it's hashed
                user.set_password(password)
                user.save()
                
                # Create user preferences
                UserPreference.objects.create(user=user)
                
                return Response(
                    {
                        'message': 'User registered successfully',
                        'username': user.username,
                        'email': user.email
                    },
                    status=status.HTTP_201_CREATED
                )
            except Exception as e:
                print("Registration error:", str(e))
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        print("Validation errors:", serializer.errors)
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )
class ChangePasswordView(APIView):
    """
    API endpoint for changing the user's password
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')

        # Validate password confirmation
        if new_password != confirm_password:
            return Response(
                {"error": "Passwords do not match"},
                status=400,
            )

        # Set the new password
        user.set_password(new_password)
        user.save()

        return Response(
            {"message": "Password updated successfully"},
            status=200,
        )

@api_view(['POST'])
@permission_classes([AllowAny])
def debug_credentials(request):
    """
    Debug view to check credentials without actually logging in
    """
    username = request.data.get('username')
    password = request.data.get('password')
    
    try:
        user = User.objects.get(username=username)
        password_valid = check_password(password, user.password)
        
        return Response({
            'user_found': True,
            'password_valid': password_valid,
            'password_hash': user.password[:20] + '...',  # Only show part of the hash for security
            'username': user.username,
            'received_password': password,
        })
    except User.DoesNotExist:
        return Response({
            'user_found': False,
            'error': 'User not found',
            'received_username': username,
        })