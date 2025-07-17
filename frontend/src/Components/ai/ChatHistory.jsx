import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getChatHistory, deleteChatSession, renameChatSession, getGuestChatHistory, deleteGuestChatSession, renameGuestChatSession } from '../../services/aiService'; // Adjust path as needed
import LoadingIndicator from './LoadingIndicator';
import { useAuth } from '../../contexts/AuthContext';
import './ChatHistory.css';

// Simple cache for chat history data
const chatHistoryCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Scroll position storage
const scrollPositionStorage = {
  position: 0,
  chatSessions: [],
  searchQuery: '',
  totalCount: 0,
  currentPage: 1,
  hasMore: true,
  
  save(position, sessions, query, count, page, hasMoreData) {
    this.position = position;
    this.chatSessions = [...sessions]; // Create a copy
    this.searchQuery = query;
    this.totalCount = count;
    this.currentPage = page;
    this.hasMore = hasMoreData;
    console.log(`[ChatHistory] Saved scroll position: ${position}px with ${sessions.length} sessions`);
  },
  
  restore() {
    console.log(`[ChatHistory] Restoring scroll position: ${this.position}px with ${this.chatSessions.length} sessions`);
    return {
      position: this.position,
      chatSessions: this.chatSessions,
      searchQuery: this.searchQuery,
      totalCount: this.totalCount,
      currentPage: this.currentPage,
      hasMore: this.hasMore
    };
  },
  
  clear() {
    this.position = 0;
    this.chatSessions = [];
    this.searchQuery = '';
    this.totalCount = 0;
    this.currentPage = 1;
    this.hasMore = true;
  }
};

// Simple performance monitoring
const performanceMonitor = {
  startTime: null,
  start() {
    this.startTime = performance.now();
  },
  end(operation) {
    if (this.startTime) {
      const duration = performance.now() - this.startTime;
      console.log(`[ChatHistory] ${operation} took ${duration.toFixed(2)}ms`);
      this.startTime = null;
    }
  }
};

// Debounce utility
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const ChatHistory = () => {
  const [chatSessions, setChatSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isRestoringPosition, setIsRestoringPosition] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState(null); // Track selected session
  const [renamingSessionId, setRenamingSessionId] = useState(null); // Track which session is being renamed
  const [renameTitle, setRenameTitle] = useState(''); // Track the new title being entered
  const [hoveredSessionId, setHoveredSessionId] = useState(null); // Track hovered session for scroll-aware hover
  const [isScrolling, setIsScrolling] = useState(false); // Track if currently scrolling
  
  const navigate = useNavigate();
  const location = useLocation();
  const observer = useRef();
  const scrollContainerRef = useRef();
  const mousePositionRef = useRef({ x: 0, y: 0 });
  const scrollTimeoutRef = useRef();
  const scrollStartTimeoutRef = useRef();
  
  // Get auth context to check if user is guest
  const { user, isGuest, loading: authLoading } = useAuth();
  
  // Debounce search query to avoid excessive API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  // Check if we're returning from a chat session
  const isReturningFromChat = location.state?.fromChatSession;
  
  // Debug mode for scroll restoration
  const DEBUG_SCROLL = false; // Set to true for debugging
  
  // Computed values for accurate pagination display
  const actualLoadedCount = chatSessions.length;
  const displayTotalCount = Math.max(totalCount, actualLoadedCount);
  const isAllLoaded = !hasMore;
  
  // Debug pagination counts
  if (DEBUG_SCROLL && actualLoadedCount > 0) {
    console.log(`[ChatHistory] Pagination - Loaded: ${actualLoadedCount}, Total: ${totalCount}, Display: ${displayTotalCount}, HasMore: ${hasMore}, Page: ${currentPage}`);
  }
  
  // Function to clear cache when data changes
  const clearCache = useCallback(() => {
    chatHistoryCache.clear();
  }, []);

  // Function to find which session is under the mouse cursor
  const findSessionUnderMouse = useCallback((mouseX, mouseY) => {
    if (!scrollContainerRef.current) return null;
    
    const sessionsList = scrollContainerRef.current.querySelector('.sessions-list');
    if (!sessionsList) return null;
    
    const sessionElements = sessionsList.querySelectorAll('.session-item');
    
    for (let element of sessionElements) {
      const rect = element.getBoundingClientRect();
      const containerRect = scrollContainerRef.current.getBoundingClientRect();
      
      // Check if mouse is within the session item bounds and within the visible scroll area
      if (mouseX >= rect.left && mouseX <= rect.right && 
          mouseY >= Math.max(rect.top, containerRect.top) && 
          mouseY <= Math.min(rect.bottom, containerRect.bottom)) {
        return element.getAttribute('data-session-id');
      }
    }
    
    return null;
  }, []);

  // Handle mouse movement tracking
  const handleMouseMove = useCallback((e) => {
    mousePositionRef.current = { x: e.clientX, y: e.clientY };
    
    // Only update hover if not actively scrolling to avoid conflicts
    if (!isScrolling) {
      const sessionId = findSessionUnderMouse(e.clientX, e.clientY);
      setHoveredSessionId(sessionId);
    }
  }, [findSessionUnderMouse, isScrolling]);

  // Handle scroll events to update hover during scrolling
  const handleScroll = useCallback(() => {
    // IMMEDIATELY clear hover state and mark as scrolling - this prevents any sticky hover
    setHoveredSessionId(null);
    setIsScrolling(true);
    
    // Clear any existing timeouts
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    if (scrollStartTimeoutRef.current) {
      clearTimeout(scrollStartTimeoutRef.current);
    }
    
    // Update hover state immediately during scroll using requestAnimationFrame for smooth performance
    requestAnimationFrame(() => {
      const sessionId = findSessionUnderMouse(mousePositionRef.current.x, mousePositionRef.current.y);
      setHoveredSessionId(sessionId);
    });
    
    // Set a short timeout to mark scrolling as finished
    scrollStartTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 100);
    
    // Set a shorter timeout to ensure hover state is accurate after scrolling stops
    scrollTimeoutRef.current = setTimeout(() => {
      requestAnimationFrame(() => {
        const currentSessionId = findSessionUnderMouse(mousePositionRef.current.x, mousePositionRef.current.y);
        setHoveredSessionId(currentSessionId);
      });
    }, 150); // Slightly longer to ensure scrolling has completely stopped
  }, [findSessionUnderMouse]);

  // Set up mouse and scroll event listeners
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    
    if (scrollContainer) {
      // Add mouse move listener to the scroll container
      scrollContainer.addEventListener('mousemove', handleMouseMove, { passive: true });
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
      
      // Add mouse leave listener to clear hover state
      const handleMouseLeave = () => {
        setHoveredSessionId(null);
        setIsScrolling(false);
      };
      scrollContainer.addEventListener('mouseleave', handleMouseLeave);
      
      return () => {
        scrollContainer.removeEventListener('mousemove', handleMouseMove);
        scrollContainer.removeEventListener('scroll', handleScroll);
        scrollContainer.removeEventListener('mouseleave', handleMouseLeave);
        
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        if (scrollStartTimeoutRef.current) {
          clearTimeout(scrollStartTimeoutRef.current);
        }
      };
    }
  }, [handleMouseMove, handleScroll]);
  
  // Ref for the last session item (for infinite scroll)
  const lastSessionElementRef = useCallback(node => {
    if (loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreSessions();
      }
    });
    if (node) observer.current.observe(node);
  }, [loadingMore, hasMore]);
  
  // Fetch chat history on component mount or restore from saved state
  useEffect(() => {
    if (isReturningFromChat) {
      // Restore saved state
      const savedState = scrollPositionStorage.restore();
      if (savedState.chatSessions.length > 0) {
        if (DEBUG_SCROLL) console.log('[ChatHistory] Restoring saved state', savedState);
        setChatSessions(savedState.chatSessions);
        setSearchQuery(savedState.searchQuery);
        // Important: Use the actual length of restored sessions, not the saved totalCount
        // The saved totalCount might be outdated if sessions were deleted
        setTotalCount(Math.max(savedState.totalCount, savedState.chatSessions.length));
        setCurrentPage(savedState.currentPage);
        setHasMore(savedState.hasMore);
        setLoading(false);
        setIsRestoringPosition(true);
        
        // Restore the selected session ID from localStorage
        const savedSelectedId = localStorage.getItem('selectedChatSessionId');
        if (savedSelectedId) {
          setSelectedSessionId(savedSelectedId);
        }
        
        return;
      }
    }
    
    // Normal initial load
    fetchChatHistory(true);
    
    // Load selected session ID from localStorage on initial load
    const savedSelectedId = localStorage.getItem('selectedChatSessionId');
    if (savedSelectedId) {
      setSelectedSessionId(savedSelectedId);
    }
  }, [isReturningFromChat]);
  
  // Separate effect to handle scroll restoration after DOM is ready
  useEffect(() => {
    if (isRestoringPosition && chatSessions.length > 0) {
      const restoreScrollPosition = () => {
        const savedState = scrollPositionStorage.restore();
        const targetPosition = savedState.position;
        
        if (scrollContainerRef.current && targetPosition > 0) {
          if (DEBUG_SCROLL) console.log(`[ChatHistory] Attempting to restore scroll position to ${targetPosition}px`);
          
          // Check if the scroll container has the expected content height
          const scrollHeight = scrollContainerRef.current.scrollHeight;
          const clientHeight = scrollContainerRef.current.clientHeight;
          const maxScrollTop = scrollHeight - clientHeight;
          
          if (DEBUG_SCROLL) console.log(`[ChatHistory] Scroll metrics - height: ${scrollHeight}, client: ${clientHeight}, max: ${maxScrollTop}, target: ${targetPosition}`);
          
          // Adjust target position if it exceeds the maximum scrollable area
          const adjustedPosition = Math.min(targetPosition, maxScrollTop);
          
          if (adjustedPosition > 0) {
            // Method 1: Direct scroll
            scrollContainerRef.current.scrollTop = adjustedPosition;
            
            // Method 2: Verify and retry with requestAnimationFrame
            requestAnimationFrame(() => {
              if (scrollContainerRef.current && Math.abs(scrollContainerRef.current.scrollTop - adjustedPosition) > 5) {
                if (DEBUG_SCROLL) console.log(`[ChatHistory] First attempt failed, retrying scroll restoration`);
                scrollContainerRef.current.scrollTop = adjustedPosition;
                
                // Method 3: Final verification
                requestAnimationFrame(() => {
                  if (scrollContainerRef.current) {
                    const finalPosition = scrollContainerRef.current.scrollTop;
                    if (DEBUG_SCROLL) console.log(`[ChatHistory] Scroll restored to ${finalPosition}px (target was ${adjustedPosition}px)`);
                    
                    // Verify success
                    if (Math.abs(finalPosition - adjustedPosition) <= 5) {
                      if (DEBUG_SCROLL) console.log(`[ChatHistory] ✅ Scroll restoration successful!`);
                    } else {
                      if (DEBUG_SCROLL) console.warn(`[ChatHistory] ⚠️ Scroll restoration may have failed - off by ${Math.abs(finalPosition - adjustedPosition)}px`);
                    }
                  }
                });
              } else if (DEBUG_SCROLL) {
                console.log(`[ChatHistory] ✅ Scroll restoration successful on first attempt!`);
              }
            });
          }
          
          // Hide the restoration indicator after a short delay
          setTimeout(() => {
            setIsRestoringPosition(false);
          }, 300);
        } else {
          if (DEBUG_SCROLL) console.log(`[ChatHistory] Skipping scroll restoration - no container or zero position`);
          setIsRestoringPosition(false);
        }
      };

      // Wait for the sessions list to be rendered
      const waitForDOMReady = () => {
        if (scrollContainerRef.current) {
          const sessionsList = scrollContainerRef.current.querySelector('.sessions-list');
          if (sessionsList && sessionsList.children.length === chatSessions.length) {
            // DOM is ready, restore scroll position
            if (DEBUG_SCROLL) console.log(`[ChatHistory] DOM ready - found ${sessionsList.children.length} session items`);
            restoreScrollPosition();
          } else {
            // DOM not ready yet, wait a bit more
            if (DEBUG_SCROLL && sessionsList) {
              console.log(`[ChatHistory] DOM not ready - expected ${chatSessions.length} items, found ${sessionsList.children.length}`);
            }
            setTimeout(waitForDOMReady, 10);
          }
        } else {
          if (DEBUG_SCROLL) console.log(`[ChatHistory] Scroll container not ready, waiting...`);
          setTimeout(waitForDOMReady, 10);
        }
      };

      // Start the DOM readiness check
      setTimeout(waitForDOMReady, 0);
      
      // Fallback timeout in case DOM check fails
      setTimeout(() => {
        if (isRestoringPosition) {
          if (DEBUG_SCROLL) console.log(`[ChatHistory] Fallback scroll restoration triggered`);
          restoreScrollPosition();
        }
      }, 500);
    }
  }, [isRestoringPosition, chatSessions.length]);
  
  // Trigger search when debounced search query changes (but not on restoration)
  useEffect(() => {
    if (!isRestoringPosition && debouncedSearchQuery !== searchQuery) {
      // Search query changed, reset and fetch
      scrollPositionStorage.clear(); // Clear saved position on new search
      fetchChatHistory(true);
    }
  }, [debouncedSearchQuery, isRestoringPosition]);
  
  // Fetch chat history from the backend
  const fetchChatHistory = async (isInitialLoad = false, pageToLoad = 1) => {
    performanceMonitor.start();
    
    try {
      if (isInitialLoad) {
        setLoading(true);
        setChatSessions([]);
        setCurrentPage(1);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }
      setError('');
      
      // Use debounced search query for API calls
      const queryToUse = isInitialLoad ? debouncedSearchQuery : searchQuery;
      
      // For guest users, always use sessionStorage - skip cache and API calls
      if (isGuest) {
        const response = await getGuestChatHistory(queryToUse, pageToLoad, 20);
        
        // Handle guest response
        const sessions = response.results || response.data || response;
        const totalCount = response.count || response.total || sessions.length;
        const nextPage = response.next;
        
        if (isInitialLoad) {
          setChatSessions(sessions);
          setTotalCount(totalCount);
        } else {
          // For infinite scroll, append new sessions
          setChatSessions(prev => {
            const newSessions = [...prev, ...sessions];
            setTotalCount(prevTotal => Math.max(prevTotal, totalCount, newSessions.length));
            return newSessions;
          });
        }
        
        const calculatedHasMore = !!nextPage || (sessions.length === 20 && pageToLoad * 20 < totalCount);
        setHasMore(calculatedHasMore);
        setCurrentPage(pageToLoad);
        
        performanceMonitor.end(`Guest sessionStorage fetch for ${sessions.length} sessions (page ${pageToLoad})`);
        
      } else {
        // For authenticated users, use cache and API
        const currentCacheKey = `${queryToUse}-page-${pageToLoad}`;
        
        // Check cache for this specific page
        const cachedData = chatHistoryCache.get(currentCacheKey);
        if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION && isInitialLoad) {
          // Use cached data only for initial loads to avoid pagination issues
          const sessions = cachedData.data.results || cachedData.data;
          const totalCount = cachedData.data.count || sessions.length;
          const nextPage = cachedData.data.next;
          
          setChatSessions(sessions);
          // Ensure totalCount is consistent with loaded sessions
          setTotalCount(Math.max(totalCount, sessions.length));
          setHasMore(!!nextPage);
          setCurrentPage(pageToLoad);
          
          performanceMonitor.end(`Cache hit for ${sessions.length} sessions`);
          
        } else {
          // Call the backend API for authenticated users
          const response = await getChatHistory(queryToUse, pageToLoad, 20);
        
        // Handle both paginated and non-paginated responses for backward compatibility
        const sessions = response.results || response.data || response;
        const totalCount = response.count || response.total || sessions.length;
        const nextPage = response.next;
        
        if (isInitialLoad) {
          setChatSessions(sessions);
          setTotalCount(totalCount);
        } else {
          // For infinite scroll, append new sessions
          setChatSessions(prev => {
            const newSessions = [...prev, ...sessions];
            // Ensure totalCount is at least as large as our current loaded sessions
            setTotalCount(prevTotal => Math.max(prevTotal, totalCount, newSessions.length));
            return newSessions;
          });
        }
        
        // Determine hasMore based on response and logical checks
        const calculatedHasMore = !!nextPage || (sessions.length === 20 && pageToLoad * 20 < totalCount);
        setHasMore(calculatedHasMore);
        setCurrentPage(pageToLoad);
        
        // Cache the result
        chatHistoryCache.set(currentCacheKey, {
          data: response,
          timestamp: Date.now()
        });
        
        // Clear old cache entries to prevent memory leaks
        if (chatHistoryCache.size > 50) {
          const oldestKey = chatHistoryCache.keys().next().value;
          chatHistoryCache.delete(oldestKey);
        }
        
        performanceMonitor.end(`API fetch for ${sessions.length} sessions (page ${pageToLoad})`);
        }
      }
      
    } catch (err) {
      console.error('Error fetching chat history:', err);
      setError('Failed to load chat history. Please ensure the backend is running and accessible.');
      performanceMonitor.end('API fetch with error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };
  
  // Load more sessions for infinite scroll
  const loadMoreSessions = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchChatHistory(false, currentPage + 1);
    }
  }, [loadingMore, hasMore, currentPage]);
  
  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    fetchChatHistory(true); // Reset and search from page 1
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
    // Save the selected session ID to state and localStorage
    setSelectedSessionId(sessionId);
    localStorage.setItem('selectedChatSessionId', sessionId);
    
    // Save current scroll position and state before navigating
    const scrollPosition = scrollContainerRef.current ? scrollContainerRef.current.scrollTop : 0;
    scrollPositionStorage.save(
      scrollPosition,
      chatSessions,
      searchQuery,
      totalCount,
      currentPage,
      hasMore
    );
    
    // Navigate to chat session with state indicating we came from history
    navigate(`/chat/${sessionId}`, {
      state: { fromChatHistory: true }
    });
  };
  
  // Handle deleting a chat session
  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation(); // Prevent triggering the onClick of the parent div
    
    if (window.confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
      try {
        // Use appropriate delete function based on user type
        if (isGuest) {
          await deleteGuestChatSession(sessionId);
        } else {
          await deleteChatSession(sessionId);
        }
        
        // Remove session from state optimistically and update counts
        setChatSessions(prevSessions => {
          const filteredSessions = prevSessions.filter(session => session.id !== sessionId);
          // Update total count to reflect the deletion
          setTotalCount(prev => Math.max(prev - 1, filteredSessions.length));
          return filteredSessions;
        });
        
        // Clear cache since data has changed
        clearCache();
        
      } catch (err) {
        console.error('Error deleting chat session:', err);
        setError('Failed to delete chat. Please try again.');
        // Refresh data on error to ensure consistency
        fetchChatHistory(true);
      }
    }
  };
  
  // Handle starting rename for a chat session
  const handleStartRename = (e, sessionId, currentTitle) => {
    e.stopPropagation(); // Prevent triggering the onClick of the parent div
    setRenamingSessionId(sessionId);
    setRenameTitle(currentTitle || 'Untitled Chat');
  };
  
  // Handle saving the renamed title
  const handleSaveRename = async (e, sessionId) => {
    e.stopPropagation(); // Prevent triggering the onClick of the parent div
    
    const trimmedTitle = renameTitle.trim();
    if (!trimmedTitle) {
      setError('Chat title cannot be empty.');
      return;
    }
    
    try {
      // Use appropriate rename function based on user type
      if (isGuest) {
        await renameGuestChatSession(sessionId, trimmedTitle);
      } else {
        await renameChatSession(sessionId, trimmedTitle);
      }
      
      // Update the session in state
      setChatSessions(prevSessions => 
        prevSessions.map(session => 
          session.id === sessionId 
            ? { ...session, title: trimmedTitle }
            : session
        )
      );
      
      // Clear cache since data has changed
      clearCache();
      
      // Reset rename state
      setRenamingSessionId(null);
      setRenameTitle('');
      
    } catch (err) {
      console.error('Error renaming chat session:', err);
      setError('Failed to rename chat. Please try again.');
    }
  };
  
  // Handle canceling rename
  const handleCancelRename = (e) => {
    e.stopPropagation(); // Prevent triggering the onClick of the parent div
    setRenamingSessionId(null);
    setRenameTitle('');
  };
  
  // Go back to the main chat/suggester page
  const goToChat = () => {
    // Clear saved scroll position when going to a different page, but preserve chat state
    scrollPositionStorage.clear();
    // Optionally clear selected session when leaving chat history
    // Comment out the next two lines if you want to preserve selection across page navigation
    // setSelectedSessionId(null);
    // localStorage.removeItem('selectedChatSessionId');
    
    // Navigate with state to indicate we're returning from chat history
    navigate('/suggester', { 
      state: { fromChatHistory: true } 
    }); 
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
      
      {authLoading ? (
        <div className="loading-container">
          <LoadingIndicator />
          <p>Loading authentication status...</p>
        </div>
      ) : (
        <>
          {isGuest && (
            <div className="guest-warning-wrapper">
              <div className="chat-history-guest-warning">
                You are in guest mode. If you refresh or close the website, your chat history will be wiped out completely.
              </div>
            </div>
          )}
          
          {error && <div className="error-message">{error}</div>}
          
          <div className={`chat-sessions ${isScrolling ? 'scrolling' : ''}`} ref={scrollContainerRef}>
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
              <>
                {isRestoringPosition && (
                  <div className="restoring-position-indicator">
                    <p>Restoring your position...</p>
                  </div>
                )}
                <div className="sessions-list">
                  {chatSessions.map((session, index) => (
                    <div 
                      key={session.id} 
                      className={`session-item ${selectedSessionId === session.id ? 'selected' : ''} ${hoveredSessionId === session.id ? 'hovered' : ''}`}
                      data-session-id={session.id}
                      onClick={() => viewChatSession(session.id)}
                      ref={index === chatSessions.length - 1 ? lastSessionElementRef : null}
                    >
                      <div className="session-info">
                        {renamingSessionId === session.id ? (
                          <div className="rename-section">
                            <input
                              type="text"
                              value={renameTitle}
                              onChange={(e) => setRenameTitle(e.target.value)}
                              className="rename-input"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveRename(e, session.id);
                                } else if (e.key === 'Escape') {
                                  handleCancelRename(e);
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        ) : (
                          <h3 className="session-title">
                            {session.title || 'Untitled Chat'}
                          </h3>
                        )}
                        <p className="session-timestamp">{formatTimestamp(session.timestamp)}</p>
                        {/* Ensure message_count is provided by the backend */}
                        <p className="message-count">
                          {session.message_count || 0} {(session.message_count || 0) === 1 ? 'message' : 'messages'}
                        </p>
                      </div>
                      <div className="session-actions">
                        {renamingSessionId === session.id ? (
                          <>
                            <button 
                              onClick={(e) => handleSaveRename(e, session.id)}
                              className="save-rename-button"
                              title="Save"
                            >
                              ✓
                            </button>
                            <button 
                              onClick={handleCancelRename}
                              className="cancel-rename-button"
                              title="Cancel"
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={(e) => handleStartRename(e, session.id, session.title)}
                              className="rename-button"
                              title="Rename chat"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button 
                              onClick={(e) => handleDeleteSession(e, session.id)}
                              className="delete-button"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Loading indicator for infinite scroll */}
                {loadingMore && (
                  <div className="loading-more-container">
                    <LoadingIndicator />
                    <p>Loading more chats...</p>
                  </div>
                )}
                
                {/* Pagination info */}
                {totalCount > 0 && (
                  <div className="pagination-info">
                    <p>
                      Showing {actualLoadedCount} of {displayTotalCount} chat sessions
                      {isAllLoaded ? ' (all loaded)' : ''}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ChatHistory;