import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getChatHistory, deleteChatSession } from '../../services/aiService'; // Adjust path as needed
import LoadingIndicator from './LoadingIndicator';
import './ChatHistory.css';

const ChatHistory = () => {
  const [chatSessions, setChatSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const navigate = useNavigate();
  
  // Fetch chat history on component mount
  useEffect(() => {
    fetchChatHistory();
  }, []);
  
  // Fetch chat history from the backend
  const fetchChatHistory = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Make sure to pass the correct API key or token if required by getChatHistory
      const response = await getChatHistory(searchQuery, false);
      setChatSessions(response);
    } catch (err) {
      console.error('Error fetching chat history:', err);
      setError('Failed to load chat history. Please ensure the backend is running and accessible.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    fetchChatHistory();
  };
  
  // Format timestamp for display
  const formatTimestamp = (timestampStr) => {
    try {
      const date = new Date(timestampStr);
      if (isNaN(date)) return timestampStr; // Return original if invalid
      
      const today = new Date();
      const isToday = date.toDateString() === today.toDateString();
      
      if (isToday) {
        return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = date.toDateString() === yesterday.toDateString();
      
      if (isYesterday) {
        return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
      
      return date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      }) + ' at ' + date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (e) {
      console.error("Error formatting timestamp:", e);
      return timestampStr;
    }
  };
  
  // Handle viewing a chat session
  const viewChatSession = (sessionId) => {
    // Assuming the route for a specific chat session is /chat/:sessionId
    // Adjust if your routing is different
    navigate(`/chat/${sessionId}`); 
  };
  
  // Handle deleting a chat session
  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation(); // Prevent triggering the onClick of the parent div
    
    if (window.confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
      try {
        // Make sure deleteChatSession is correctly implemented and handles authentication
        await deleteChatSession(sessionId);
        
        // Remove session from state optimistically or after confirmation
        setChatSessions(prevSessions => prevSessions.filter(session => session.id !== sessionId));
      } catch (err) {
        console.error('Error deleting chat session:', err);
        setError('Failed to delete chat. Please try again.');
      }
    }
  };
  
  // Go back to the main chat/suggester page
  const goToChat = () => {
    // Adjust the path if your suggester/chat page is different
    navigate('/suggester'); 
  };
  
  return (
    <div className="chat-history-container">
      <div className="history-header">
        <div className="header-title">
          <h1>Chat History</h1>
          <button onClick={goToChat} className="back-to-chat-button">Back to Suggester</button>
        </div>
        
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            className="search-input"
          />
          <button type="submit" className="search-button">Search</button>
        </form>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="chat-sessions">
        {loading ? (
          <div className="loading-container">
            <LoadingIndicator />
          </div>
        ) : chatSessions.length === 0 ? (
          <div className="empty-state">
            <p>No chat sessions found{searchQuery ? ' matching your search' : ''}.</p>
            <button onClick={goToChat} className="start-chat-button">Start a New Chat</button>
          </div>
        ) : (
          <div className="sessions-list">
            {chatSessions.map(session => (
              <div 
                key={session.id} 
                className="session-item"
                onClick={() => viewChatSession(session.id)}
              >
                <div className="session-info">
                  <h3 className="session-title">
                    {session.title || 'Untitled Chat'}
                  </h3>
                  <p className="session-timestamp">{formatTimestamp(session.timestamp)}</p>
                  {/* Ensure message_count is provided by the backend */}
                  <p className="message-count">
                    {session.message_count || 0} {(session.message_count || 0) === 1 ? 'message' : 'messages'}
                  </p>
                </div>
                <div className="session-actions">
                  <button 
                    onClick={(e) => handleDeleteSession(e, session.id)}
                    className="delete-button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatHistory; 