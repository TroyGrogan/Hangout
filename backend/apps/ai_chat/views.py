# views.py

import logging
import traceback
import uuid

from django.db.models import Q, Max, Count
from django.shortcuts import get_object_or_404
from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Chat
from .serializers import ChatSerializer, ChatSessionSerializer
# Import LlamaCPP-specific functions and status - USING DEPLOYMENT HANDLER
from .llm_handler_deployment import (
    generate_chat_response, 
    clear_chat_history, 
    load_history_from_database, 
    initialize_model as initialize_llm, # Rename for clarity
    is_model_initialized, 
    initialization_status, 
    generate_new_session_id
)

logger = logging.getLogger(__name__)

# --- Core Chat Interaction Views --- #

class SendMessageView(APIView):
    """Handles sending a user message and getting an AI response."""
    permission_classes = []  # Allow both authenticated and guest users

    def post(self, request):
        # Check if user is authenticated, allow guests
        user = request.user if request.user.is_authenticated else None
        
        message_text = request.data.get('message', '')
        session_id = request.data.get('chat_session', None) # Expect session ID from frontend
        model_mode = request.data.get('model_mode', 'default') # Keep model_mode if used

        if not message_text:
            return Response({'error': 'Message is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if not session_id:
            return Response({'error': 'Chat session ID is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate model_mode (if you use it for different model settings)
        # if model_mode not in ['default', 'creative', 'technical']:
        #     model_mode = 'default'
        
        # --- Optional: Message Limit Check (Example) --- #
        # max_messages_per_session = getattr(settings, 'MAX_MESSAGES_PER_SESSION', 50) 
        # current_message_count = Chat.objects.filter(user=user, chat_session=session_id).count()
        # if current_message_count >= max_messages_per_session:
        #     return Response({
        #         'error': f'Chat limit of {max_messages_per_session} messages reached. Please start a new chat.',
        #         'limit_reached': True
        #     }, status=status.HTTP_400_BAD_REQUEST)
        # --- End Message Limit Check --- #

        try:
            # Ensure history is loaded before generating response
            # load_history_from_database(user, session_id)
            
            # Generate AI response using the handler
            ai_response_text = generate_chat_response(message_text, session_id, user, model_mode)
            
            # Check if the response indicates an error from the handler
            if ai_response_text.startswith("Error:") or ai_response_text.startswith("Sorry, I encountered an error"): 
                 # Log the error and return an appropriate server error status
                 logger.error(f"LLM generation error for session {session_id}: {ai_response_text}")
                 # Return the error message from the handler to the frontend
                 return Response({'error': ai_response_text}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Only save to database if user is authenticated (skip for guest users)
            if user and user.is_authenticated:
                # Determine title (only for the very first message pair in a session)
                title = None
                is_first_message = not Chat.objects.filter(user=user, chat_session=session_id).exists()
                if is_first_message:
                    title = message_text[:50] + ('...' if len(message_text) > 50 else '')

                # Save the user message and AI response to the database
                chat_instance = Chat.objects.create(
                    user=user,
                    chat_session=session_id,
                    message=message_text,
                    response=ai_response_text,
                    title=title if is_first_message else None, # Only set title on first message
                    model_mode=model_mode, # Save if used
                    # is_automatic=(model_mode == 'default') # Save if used
                    # remaining_messages = max_messages_per_session - current_message_count - 1 # If using limit
                )
                
                # If it was the first message, update previous null titles for this session
                # This ensures the session gets the title even if created slightly earlier
                if is_first_message and title:
                     Chat.objects.filter(user=user, chat_session=session_id, title__isnull=True).update(title=title)
            else:
                # For guest users, create a mock chat instance for consistent response format
                from datetime import datetime
                chat_instance = type('MockChat', (), {
                    'id': None,
                    'message': message_text,
                    'response': ai_response_text,
                    'created_at': datetime.now(),
                    'chat_session': session_id,
                    'user': None,
                    'title': None,
                    'model_mode': model_mode
                })()

            # Serialize the created chat instance for the response
            serializer = ChatSerializer(chat_instance)
            
            # Return the successful response including the AI message details
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error processing chat message for session {session_id}: {e}", exc_info=True)
            return Response({'error': 'An unexpected error occurred processing your message.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# --- Session Management Views --- #

@api_view(['POST'])
@permission_classes([])  # Allow guest users to create session IDs
def new_chat_session_view(request):
    """API endpoint to explicitly create a new chat session ID."""
    try:
        new_session_id = generate_new_session_id()
        logger.info(f"Generated new chat session ID: {new_session_id}")
        # We don't save anything to DB here, just return the ID
        # The first message sent with this ID will create the DB entry
        return Response({'chat_session_id': new_session_id}, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error generating new session ID: {e}", exc_info=True)
        return Response({'error': 'Failed to create new session ID.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ChatHistoryView(APIView):
    """Retrieves a paginated summary of chat sessions for the logged-in user with optimized queries."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Use the authenticated user
        user = request.user
            
        # Get pagination parameters
        page = int(request.query_params.get('page', 1))
        page_size = min(int(request.query_params.get('page_size', 20)), 100)  # Max 100 per page
        search_query = request.query_params.get('search', None)
        
        try:
            # Build base query with optimized joins and annotations
            base_query = Chat.objects.filter(user=user).values('chat_session').annotate(
                latest_message_time=Max('created_at'),
                message_count=Count('id'),
                # Get the title from the first message (more efficient than separate queries)
                first_title=Max('title', filter=Q(title__isnull=False)),
                latest_id=Max('id')  # To get the latest message for fallback title
            ).order_by('-latest_message_time')
            
            # Apply search filter if provided
            if search_query:
                # More efficient search - use full-text search if available, otherwise icontains
                search_filter = Q(message__icontains=search_query) | Q(response__icontains=search_query)
                matching_sessions = Chat.objects.filter(
                    user=user
                ).filter(search_filter).values_list('chat_session', flat=True).distinct()
                
                base_query = base_query.filter(chat_session__in=list(matching_sessions))

            # Get total count for pagination
            total_count = base_query.count()
            
            # Calculate pagination
            start_index = (page - 1) * page_size
            end_index = start_index + page_size
            
            # Get the paginated sessions
            sessions_page = base_query[start_index:end_index]
            
            # Build response data efficiently
            chat_sessions_summary = []
            for session_info in sessions_page:
                session_id = session_info['chat_session']
                session_title = session_info['first_title']
                
                # Only query for fallback title if needed (reduces DB queries significantly)
                if not session_title:
                    latest_chat = Chat.objects.filter(
                        user=user, 
                        id=session_info['latest_id']
                    ).only('created_at').first()
                    
                    if latest_chat:
                        session_title = f"Chat from {latest_chat.created_at.strftime('%Y-%m-%d')}"
                    else:
                        session_title = "Untitled Chat"
                        
                chat_sessions_summary.append({
                    'id': session_id,
                    'title': session_title,
                    'timestamp': session_info['latest_message_time'].isoformat(),
                    'message_count': session_info['message_count'],
                })
            
            # Calculate pagination metadata
            has_next = end_index < total_count
            has_previous = page > 1
            next_page = page + 1 if has_next else None
            previous_page = page - 1 if has_previous else None
            
            # Return paginated response
            return Response({
                'results': chat_sessions_summary,
                'count': total_count,
                'next': next_page,
                'previous': previous_page,
                'page': page,
                'page_size': page_size,
                'total_pages': (total_count + page_size - 1) // page_size,
                'has_next': has_next,
                'has_previous': has_previous
            })

        except Exception as e:
            logger.error(f"Error retrieving chat history for user {user.id}: {e}", exc_info=True)
            return Response({'error': 'Failed to retrieve chat history.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ChatSessionDetailView(APIView):
    """Retrieves all messages for a specific chat session."""
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        # Use the authenticated user
        user = request.user
            
        try:
            # Get all messages for this specific session, ordered chronologically
            messages = Chat.objects.filter(user=user, chat_session=session_id).order_by('created_at')
            
            if not messages.exists():
                return Response({'error': 'Chat session not found.'}, status=status.HTTP_404_NOT_FOUND)
            
            # Determine session title (from latest message with a title, or first message)
            session_title = None
            latest_with_title = messages.filter(title__isnull=False).last()
            if latest_with_title:
                 session_title = latest_with_title.title
            else:
                 first_message = messages.first()
                 if first_message:
                      session_title = first_message.title # Could still be null
                      
            # Use the ChatSerializer for individual messages
            message_serializer = ChatSerializer(messages, many=True)
            
            # Construct the session detail response
            session_data = {
                'id': session_id,
                'title': session_title or f"Chat from {messages.first().created_at.strftime('%Y-%m-%d')}", # Fallback title
                'messages': message_serializer.data,
                # Add other session-level details if needed
                # 'timestamp': messages.last().created_at.isoformat(),
                # 'message_count': messages.count(),
            }
            
            return Response(session_data)

        except Exception as e:
            logger.error(f"Error retrieving chat session {session_id}: {e}", exc_info=True)
            return Response({'error': 'Failed to retrieve chat session.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# --- Utility Views --- #

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_chat_session_view(request, session_id):
    """API endpoint to delete an entire chat session."""
    # Use the authenticated user
    user = request.user
        
    try:
        # Delete all messages in the specified session for the user
        deleted_count, _ = Chat.objects.filter(user=user, chat_session=session_id).delete()
        
        if deleted_count == 0:
            return Response({'error': 'Chat session not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        logger.info(f"Deleted chat session {session_id} with {deleted_count} messages")
        return Response({'message': f'Chat session deleted successfully. {deleted_count} messages removed.'}, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error deleting chat session {session_id}: {e}", exc_info=True)
        return Response({'error': 'Failed to delete chat session.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def rename_chat_session_view(request, session_id):
    """API endpoint to rename/retitle a chat session."""
    # Use the authenticated user
    user = request.user
        
    new_title = request.data.get('title', '').strip()
    
    if not new_title:
        return Response({'error': 'Title is required.'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Update the title for all messages in this session
        updated_count = Chat.objects.filter(user=user, chat_session=session_id).update(title=new_title)
        
        if updated_count == 0:
            return Response({'error': 'Chat session not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        logger.info(f"Renamed chat session {session_id} to '{new_title}' ({updated_count} messages updated)")
        return Response({'message': 'Chat session renamed successfully.', 'title': new_title}, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error renaming chat session {session_id}: {e}", exc_info=True)
        return Response({'error': 'Failed to rename chat session.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# --- Model Initialization View --- #

class InitializeModelView(APIView):
    """API endpoint to trigger LLM initialization (e.g., on server start or manually)."""
    permission_classes = []  # Allow guest users to initialize the model

    def post(self, request):
        logger.info(f"Received request to initialize LLM model.")
        
        if is_model_initialized():
            return Response({'message': 'Model already initialized.', 'status': initialization_status}, status=status.HTTP_200_OK)
            
        if initialization_status["initializing"]:
             return Response({'message': 'Model initialization already in progress.', 'status': initialization_status}, status=status.HTTP_202_ACCEPTED)
             
        # Run initialization in a background thread to avoid blocking the request?
        # For simplicity here, running synchronously.
        success = initialize_llm()
        
        if success:
            return Response({'message': 'Model initialization successful.', 'status': initialization_status}, status=status.HTTP_200_OK)
        else:
            return Response({
                'error': 'Model initialization failed.',
                'details': initialization_status['error'],
                'status': initialization_status
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 