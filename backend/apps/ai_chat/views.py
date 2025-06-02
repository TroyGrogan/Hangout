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
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
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

            # Serialize the created chat instance for the response
            serializer = ChatSerializer(chat_instance)
            
            # Return the successful response including the AI message details
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error processing chat message for session {session_id}: {e}", exc_info=True)
            return Response({'error': 'An unexpected error occurred processing your message.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# --- Session Management Views --- #

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def new_chat_session_view(request):
    """API endpoint to explicitly create a new chat session ID."""
    try:
        new_session_id = generate_new_session_id()
        logger.info(f"Generated new chat session ID: {new_session_id} for user {request.user.id}")
        # We don't save anything to DB here, just return the ID
        # The first message sent with this ID will create the DB entry
        return Response({'chat_session_id': new_session_id}, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error generating new session ID: {e}", exc_info=True)
        return Response({'error': 'Failed to create new session ID.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ChatHistoryView(APIView):
    """Retrieves a summary of chat sessions for the logged-in user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        search_query = request.query_params.get('search', None)
        
        try:
            # Get all unique chat session IDs for the user, ordered by the latest message in each session
            sessions_query = Chat.objects.filter(user=user).values('chat_session').annotate(
                latest_message_time=Max('created_at'),
                message_count=Count('id') # Count messages per session
            ).order_by('-latest_message_time')
            
            # Apply search filter if provided (searches message content within sessions)
            if search_query:
                 # Find sessions that contain the search query in message or response
                 matching_sessions = Chat.objects.filter(
                      user=user,
                      message__icontains=search_query
                 ).values_list('chat_session', flat=True).distinct()
                 
                 # Filter the main sessions query
                 sessions_query = sessions_query.filter(chat_session__in=list(matching_sessions))

            chat_sessions_summary = []
            for session_info in sessions_query:
                session_id = session_info['chat_session']
                # Get the latest message to retrieve the title
                latest_message = Chat.objects.filter(
                    user=user, 
                    chat_session=session_id
                ).order_by('-created_at').first()
                
                if latest_message:
                     # Try to get title from the latest message, or the first if latest is null
                     session_title = latest_message.title
                     if not session_title:
                          first_message = Chat.objects.filter(user=user, chat_session=session_id).order_by('created_at').first()
                          if first_message:
                               session_title = first_message.title # Might still be null
                               
                     chat_sessions_summary.append({
                        'id': session_id,
                        'title': session_title or f"Chat from {latest_message.created_at.strftime('%Y-%m-%d')}", # Fallback title
                        'timestamp': session_info['latest_message_time'].isoformat(), # Use ISO format
                        'message_count': session_info['message_count'],
                        # Add other fields needed by ChatHistory.jsx if necessary
                        # 'bookmarked': latest_message.bookmarked, 
                        # 'remaining_messages': latest_message.remaining_messages,
                    })
            
            # Use ChatSessionSerializer (adjust if needed) or return the list directly
            # serializer = ChatSessionSerializer(chat_sessions_summary, many=True)
            # return Response(serializer.data)
            return Response(chat_sessions_summary)

        except Exception as e:
            logger.error(f"Error retrieving chat history for user {user.id}: {e}", exc_info=True)
            return Response({'error': 'Failed to retrieve chat history.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ChatSessionDetailView(APIView):
    """Retrieves all messages for a specific chat session."""
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
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
            logger.error(f"Error retrieving chat session {session_id} for user {user.id}: {e}", exc_info=True)
            return Response({'error': 'Failed to retrieve chat session details.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_chat_session_view(request, session_id):
    """Deletes all messages associated with a specific chat session for the user."""
    user = request.user
    try:
        # Find messages to delete
        chats_to_delete = Chat.objects.filter(user=user, chat_session=session_id)
        
        if not chats_to_delete.exists():
            return Response({'error': 'Chat session not found.'}, status=status.HTTP_404_NOT_FOUND)
            
        count, _ = chats_to_delete.delete()
        logger.info(f"Deleted {count} messages for session {session_id} for user {user.id}.")
        
        # Clear history from memory cache as well
        clear_chat_history(session_id)
        
        return Response({'message': f'Chat session {session_id} deleted successfully.'}, status=status.HTTP_204_NO_CONTENT)
        
    except Exception as e:
        logger.error(f"Error deleting chat session {session_id} for user {user.id}: {e}", exc_info=True)
        return Response({'error': 'Failed to delete chat session.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def rename_chat_session_view(request, session_id):
    """Renames a chat session by updating the title on relevant messages."""
    user = request.user
    new_title = request.data.get('title', None)

    if new_title is None or not isinstance(new_title, str):
        return Response({'error': 'New title is required and must be a string.'}, status=status.HTTP_400_BAD_REQUEST)
        
    trimmed_title = new_title.strip()[:255] # Max length from model
    if not trimmed_title:
        return Response({'error': 'Title cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Find messages in the session for this user
        session_chats = Chat.objects.filter(user=user, chat_session=session_id)
        
        if not session_chats.exists():
            return Response({'error': 'Chat session not found.'}, status=status.HTTP_404_NOT_FOUND)
            
        # Update the title on all messages in the session
        # Alternatively, only update the first/last message if that's preferred
        updated_count = session_chats.update(title=trimmed_title)
        
        logger.info(f"Renamed session {session_id} to '{trimmed_title}' for user {user.id}. Updated {updated_count} messages.")
        
        # Update title in history cache? The cache stores individual messages without explicit session title.
        # Reloading history on next request will pick up the new title from DB.
        
        return Response({'message': f'Chat session renamed to "{trimmed_title}".'}, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error renaming chat session {session_id} for user {user.id}: {e}", exc_info=True)
        return Response({'error': 'Failed to rename chat session.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# --- Model Initialization View --- #

class InitializeModelView(APIView):
    """API endpoint to trigger LLM initialization (e.g., on server start or manually)."""
    # Consider restricting access (e.g., admin only) depending on use case
    # permission_classes = [IsAdminUser] 
    permission_classes = [IsAuthenticated] # Or allow any authenticated user?

    def post(self, request):
        logger.info(f"Received request to initialize LLM model from user {request.user.id}.")
        
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