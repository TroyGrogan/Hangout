import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getChatSession, renameChatSession } from '../../services/aiService'; // Adjust path as needed
import MarkdownRenderer from './MarkdownRenderer';
import LoadingIndicator from './LoadingIndicator';
import PaperAirplane from './PaperAirplane'; // Ensure this path is correct
import './Chat.css'; // Ensure Chat.css exists and styles are appropriate

const ChatSession = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [session, setSession] = useState(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [title, setTitle] = useState('');
  
  // Fetch chat session data
  useEffect(() => {
    const fetchChatSession = async () => {
      try {
        setLoading(true);
        setError('');
        // Ensure getChatSession handles API calls and auth correctly
        const data = await getChatSession(sessionId);
        if (data) {
          setSession(data);
          setTitle(data.title || 'Untitled Chat'); // Default title
        } else {
          setError('Chat session not found or could not be loaded.');
        }
      } catch (err) {
        console.error('Error fetching chat session:', err);
        setError('Failed to load chat session. Please ensure the backend is running and the session ID is correct.');
      } finally {
        setLoading(false);
      }
    };
    
    if (sessionId) {
      fetchChatSession();
    }
  }, [sessionId]);
  
  // Handle session rename
  const handleRename = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      // Optionally set an error message for empty title
      return;
    }
    
    try {
      // Ensure renameChatSession handles API calls and auth correctly
      await renameChatSession(sessionId, trimmedTitle);
      setSession(prev => prev ? { ...prev, title: trimmedTitle } : null);
      setIsRenaming(false);
    } catch (err) {
      console.error('Error renaming chat session:', err);
      setError('Failed to rename chat. Please try again.');
      // Optionally revert title or keep the input field open
    }
  };
  
  // Format timestamp for display
  const formatTimestamp = (timestampStr) => {
    try {
      const date = new Date(timestampStr);
      if (isNaN(date)) return timestampStr; // Return original if invalid
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      console.error("Error formatting timestamp:", e);
      return timestampStr;
    }
  };
  
  // Go back to the main chat/suggester page
  const goToChat = () => {
    // Navigate with state to indicate we're returning from a chat session
    navigate('/suggester', { 
      state: { fromChatSession: true } 
    }); 
  };

  const goToHistory = () => {
    // Navigate back to history with state indicating we came from a chat session
    navigate('/chat-history', { 
      state: { fromChatSession: true }
    });
  }
  
  // Render loading state
  if (loading) {
    return (
      <div className="chat-container">
        <div className="chat-header">
          <h2>Loading Chat...</h2>
        </div>
        <div className="messages-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <LoadingIndicator />
        </div>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className="chat-container">
        <div className="chat-header">
          <h2>Error</h2>
          <div className="header-buttons">
            <button onClick={goToHistory} className="history-btn">Back to History</button>
            <button onClick={goToChat} className="history-btn">Back to Suggester</button>
          </div>
        </div>
        <div className="messages-container">
          <div className="error-message" style={{ textAlign: 'center', padding: '20px' }}>{error}</div>
        </div>
      </div>
    );
  }
  
  // Render session not found state
  if (!session) {
    // This case might be covered by the error state if the API returns an error for not found
    return (
      <div className="chat-container">
        <div className="chat-header">
          <h2>Chat Not Found</h2>
          <div className="header-buttons">
            <button onClick={goToHistory} className="history-btn">Back to History</button>
            <button onClick={goToChat} className="history-btn">Back to Suggester</button>
          </div>
        </div>
        <div className="messages-container">
          <div className="error-message" style={{ textAlign: 'center', padding: '20px' }}>The requested chat session could not be found.</div>
        </div>
      </div>
    );
  }
  
  // Render the chat session
  return (
    <div className="chat-container chat-session-view">
      <div className="chat-header">
        {isRenaming ? (
          <div className="rename-section" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter chat title"
              className="rename-input" // Add class for styling
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleRename()} // Allow saving with Enter key
            />
            <button onClick={handleRename} className="rename-save-btn">Save</button>
            <button onClick={() => { setIsRenaming(false); setTitle(session.title || 'Untitled Chat'); }} className="rename-cancel-btn">Cancel</button>
          </div>
        ) : (
          <h2 className="chat-title" style={{ marginRight: 'auto' }}>
            {session.title || 'Untitled Chat'}
          </h2>
        )}
        <div className="header-buttons">
          {!isRenaming && (
             <button onClick={() => setIsRenaming(true)} className="history-btn rename-start-btn">Rename</button>
          )}
          <button onClick={goToHistory} className="history-btn back-to-history-btn">Back to History</button>
          <button onClick={goToChat} className="history-btn back-to-suggester-btn">Back to Suggester</button>
        </div>
      </div>
      
      <div className="messages-container" /* Add ref for scrolling if needed */>
        {session.messages && session.messages.length > 0 ? (
          session.messages.map((chat, index) => (
            <React.Fragment key={session.id + '-' + index}> {/* More robust key */} 
              {/* User message */}
              {chat.message && (
                <div className="message user">
                  <div className="message-content">
                    <div className="message-header">
                      <span className="message-sender">You</span>
                      {/* Ensure timestamp exists and is valid */}
                      <span className="message-time">{chat.timestamp ? formatTimestamp(chat.timestamp) : ''}</span>
                    </div>
                    {/* Use pre-wrap to preserve formatting like newlines */}
                    <p style={{ whiteSpace: 'pre-wrap' }}>{chat.message}</p>
                  </div>
                </div>
              )}
              
              {/* AI response */}
              {chat.response && (
                <div className="message ai">
                  <div className="message-content">
                    <div className="message-header">
                      <span className="message-sender">AI</span>
                      {/* Ensure timestamp exists and is valid */}
                      <span className="message-time">{chat.timestamp ? formatTimestamp(chat.timestamp) : ''}</span>
                    </div>
                    <MarkdownRenderer content={chat.response} />
                  </div>
                </div>
              )}
            </React.Fragment>
          ))
        ) : (
          <div style={{ textAlign: 'center', color: '#888', marginTop: '20px' }}>No messages in this session yet.</div>
        )}
      </div>
      {/* Note: This component only displays history, it doesn't include an input box for new messages */}
    </div>
  );
};

export default ChatSession; 