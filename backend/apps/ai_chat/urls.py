# urls.py for ai_chat app

from django.urls import path
from .views import (
    SendMessageView, 
    ChatHistoryView, 
    ChatSessionDetailView, 
    new_chat_session_view, 
    delete_chat_session_view, 
    rename_chat_session_view, 
    InitializeModelView
    # Add imports for ChatListCreate, ChatDetail if used from reference code
)

# Define app_name if you use namespacing (optional but good practice)
# app_name = 'ai_chat'

urlpatterns = [
    # Core chat endpoints
    path('send-message/', SendMessageView.as_view(), name='send_message'),
    path('history/', ChatHistoryView.as_view(), name='chat_history'),
    path('session/<str:session_id>/', ChatSessionDetailView.as_view(), name='chat_session_detail'),
    
    # Session management endpoints
    path('new-session/', new_chat_session_view, name='new_chat_session'),
    path('session/delete/<str:session_id>/', delete_chat_session_view, name='delete_chat_session'),
    path('session/rename/<str:session_id>/', rename_chat_session_view, name='rename_chat_session'),
    
    # Model initialization endpoint
    path('initialize-model/', InitializeModelView.as_view(), name='initialize_model'),
    
    # --- Endpoints from reference code not directly mapped yet --- #
    # path('chat/', views.ChatView.as_view(), name='chat'), # Covered by send-message?
    # path('chats/', views.ChatListCreate.as_view(), name='chat-list'), # Generic list/create
    # path('chats/<int:pk>/', views.ChatDetail.as_view(), name='chat-detail'), # Generic detail
    # path('chat-session/<str:session_id>/', views.ChatSessionView.as_view(), name='chat-session'), # Covered by session/<id>
    # --- Add bookmark endpoints if needed ---
    # path('bookmark/<int:chat_id>/', views.bookmark_chat, name='bookmark_chat'),
    # path('unbookmark/<int:chat_id>/', views.unbookmark_chat, name='unbookmark_chat'),
] 