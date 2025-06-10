import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MarkdownRenderer from './MarkdownRenderer';
import LoadingIndicator from './LoadingIndicator';
import PaperAirplane from './PaperAirplane';
import './Chat.css';
import { sendMessage, createNewChatSession } from '../../services/aiService'; // Adjust path as needed
import axiosInstance from '../../services/axiosInstance'; // Adjust path as needed
import { HARDCODED_MAIN_CATEGORIES } from '../../utils/categoryUtils'; 
import { getRandomTalkSuggestions, getRandomDoSuggestions, getMixedSuggestions } from '../../utils/suggestionUtils';
import { useAuth } from '../../contexts/AuthContext'; // Import useAuth
import { clearChatState, saveChatState, loadChatState } from '../../utils/chatStateUtils'; // Import utility functions

// --- Model Initialization --- //
// Using a simple flag approach. Consider a more robust state management if needed.
let modelInitializing = false;
let modelInitialized = false;
let initializationPromise = null;

const initializeModel = async () => {
  if (modelInitialized) {
    console.log('Model already initialized.');
    return true;
  }
  if (modelInitializing) {
    console.log('Model initialization already in progress.');
    return initializationPromise; // Return the ongoing promise
  }
  
  console.log('Initializing LLM model...');
  modelInitializing = true;
  initializationPromise = (async () => {
    try {
      // Ensure aiService/initialize-model endpoint exists and works
      const response = await axiosInstance.post('/ai/initialize-model/');
      console.log('Model initialization successful:', response.data);
      modelInitialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing model:', error.response ? error.response.data : error.message);
      modelInitialized = false; // Ensure flag is reset on failure
      return false;
    } finally {
      modelInitializing = false;
    }
  })();
  return initializationPromise;
};
// --- End Model Initialization --- //

// --- Constants ---
// IMPORTANT: This ID must match the "Talking Suggestions" category ID in your database.
// When running "python manage.py populate_suggestions", it will output the correct ID to use here.
// Update this value based on that output.
const TALKING_SUGGESTIONS_CATEGORY_ID = 22572; 
// Always display exactly 6 suggestions - hardcoded constant
const SUGGESTIONS_TO_SHOW = 6; // This must be exactly 6 - not more, not less

// localStorage keys for persisting state
const STORAGE_KEYS = {
  SELECTED_CATEGORY: 'hangout_selected_category',
  SUGGESTION_TYPES: 'hangout_suggestion_types'
};

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [showCategoriesDropdown, setShowCategoriesDropdown] = useState(false);
  const [suggestionTypes, setSuggestionTypes] = useState({ talk: false, do: false }); // Start with neither selected
  const [suggestions, setSuggestions] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null); // Store the selected category object from HARDCODED list
  const [categoryFromUrl, setCategoryFromUrl] = useState(null); // Store category from URL
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false); // New state for loading suggestions
  const [isTyping, setIsTyping] = useState(false); // Add this state
  
  const messagesEndRef = useRef(null);
  const prevMessagesLengthRef = useRef(0); // Ref to track previous message count
  const navigate = useNavigate();
  const location = useLocation(); // Access URL location including query parameters
  const { user } = useAuth(); // Access user information

  // --- Effects --- //
  
  // Detect user logout and clear localStorage state
  useEffect(() => {
    if (!user) {
      // User has logged out or is not authenticated
      console.log("[Chat.jsx] User logged out, clearing category and suggestion type state");
      clearChatState();
      setSelectedCategory(null);
      setSuggestionTypes({ talk: false, do: false });
    }
  }, [user]); // Dependency on user to detect login/logout changes

  // Load state from localStorage on component mount (MUST BE AFTER logout detection)
  useEffect(() => {
    if (user) {
      // Only load state if user is authenticated
      const { selectedCategory: savedCategory, suggestionTypes: savedSuggestionTypes } = loadChatState();
      if (savedCategory) {
        setSelectedCategory(savedCategory);
      }
      setSuggestionTypes(savedSuggestionTypes);
    }
  }, [user]); // Run when user changes (login/logout)

  // Save state to localStorage whenever selectedCategory or suggestionTypes change
  useEffect(() => {
    if (user) {
      // Only save state if user is authenticated
      saveChatState(selectedCategory, suggestionTypes);
    }
  }, [selectedCategory, suggestionTypes, user]);

  useEffect(() => {
    const initializeAndLoad = async () => {
      await initializeModel();

      let currentSessionId = sessionId;
      if (!currentSessionId) {
        console.log("[Chat.jsx useEffect[sessionId, location.search]] No session, creating new one.");
        currentSessionId = await createNewChatSession();
        if (!currentSessionId) {
          console.error("[Chat.jsx useEffect[sessionId, location.search]] Failed to create session.");
          // Potentially set an error state here
          return;
        }
        // Session ID state update will trigger re-run if needed.
        // No explicit call to updateSuggestions here to avoid race conditions.
      }

      const queryParams = new URLSearchParams(location.search);
      const categoryParam = queryParams.get('category');

      if (categoryParam && !categoryFromUrl) {
        console.log("[Chat.jsx useEffect[sessionId, location.search]] URL Category Param found:", categoryParam);
        const decodedCategory = decodeURIComponent(categoryParam);
        setCategoryFromUrl(decodedCategory); // Mark as processed

        const matchedCategory = HARDCODED_MAIN_CATEGORIES.find(cat => {
          return cat.textName === decodedCategory;
        });

        if (matchedCategory) {
          setSelectedCategory(matchedCategory); // This will trigger the other useEffect
        }
        
        // Generate appropriate prompt - both main categories and subcategories use same format
        const promptText = `Can you please tell me about ${decodedCategory}? Please explain this to me in detail.`;
        setInput(promptText);
      } else if (!categoryParam && currentSessionId && !selectedCategory && !suggestionTypes.talk && !suggestionTypes.do) {
        // Only fetch default/mixed suggestions if:
        // 1. Session exists
        // 2. No category is selected (neither from URL nor user click)
        // 3. No suggestion type (talk/do) is active
        console.log("[Chat.jsx useEffect[sessionId, location.search]] Fetching initial/default suggestions (CLEAN SLATE).");
        updateSuggestions(false, "useEffect[initialDefault_CLEAN]");
      } else {
        console.log("[Chat.jsx useEffect[sessionId, location.search]] Skipping initial/default suggestions as filters/category are active or session issue (CLEAN SLATE).");
      }
    };

    initializeAndLoad();

  }, [sessionId, location.search, categoryFromUrl]); // Keep dependencies

  useEffect(() => {
    // This is the PRIMARY effect for updating suggestions based on user interaction
    console.log("[Chat.jsx useEffect[suggestionTypes, selectedCategory]] Filters changed. Updating (CLEAN SLATE).", { suggestionTypes, selectedCategoryName: selectedCategory?.name });
    
    // Do not run if an initial category is still being processed from the URL
    // to prevent double-calls when selectedCategory is set by the other effect.
    if (categoryFromUrl && selectedCategory && !input.startsWith("Can you please tell me about")) {
        // This condition tries to identify if selectedCategory was JUST set by the URL effect.
        // It's a bit heuristic. A more robust way might involve a separate state like `isCategoryFromUrlProcessed`.
        // For now, we assume that if `input` was set to the category question, the URL processing is fresh.
        console.log("[Chat.jsx useEffect[suggestionTypes, selectedCategory]] Skipping update, waiting for URL category processing to settle or input to change.");
       // return; // Let's try without this return first, to see if the flow is okay.
    }

    setIsFetchingSuggestions(true);
    updateSuggestions(false, "useEffect[userFilters_CLEAN]")
      .catch((err) => {
        console.error("[Chat.jsx useEffect[userFilters_CLEAN]] Error during updateSuggestions:", err);
      })
      .finally(() => {
        setIsFetchingSuggestions(false);
      });
  }, [suggestionTypes, selectedCategory]); // Primary trigger

  useEffect(() => {
    // Scroll to bottom only if the number of messages increased
    if (messages.length > prevMessagesLengthRef.current) {
      scrollToBottom();
    }
    // Update the ref for the next render
    prevMessagesLengthRef.current = messages.length;
  }, [messages]); // Dependency remains on messages

  // --- Core Functions --- //
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const createNewSession = async () => {
    console.log('Attempting to create new chat session...');
    setMessages([]); // Clear messages for the new chat
    setError(null);
    try {
      // Ensure createNewChatSession works and returns a valid session ID
      const newSessionId = await createNewChatSession(); 
      if (newSessionId) {
        setSessionId(newSessionId);
        console.log('Created new chat session:', newSessionId);
      } else {
        throw new Error("createNewChatSession returned null or undefined");
      }
    } catch (err) {
      console.error('Error creating new chat session:', err);
      setError('Failed to start a new chat session. Please try again.');
      setSessionId(null); // Ensure sessionId is null if creation fails
    }
  };

  const handleSendMessage = async (messageContent = input) => {
    if (!messageContent.trim() || isLoading) return;

    const userMessage = { type: 'user', content: messageContent, timestamp: new Date().toISOString() };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    
    const aiPlaceholder = { type: 'ai', content: '', timestamp: new Date().toISOString(), id: `ai-placeholder-${Date.now()}` };
    setMessages(prevMessages => [...prevMessages, aiPlaceholder]);

    setInput('');
    setIsLoading(true);
    setError(null);
    setIsTyping(true);

    const initialized = await initializeModel();
    if (!initialized) {
      setError("AI Model is not ready. Please try again later.");
      setIsLoading(false);
      setIsTyping(false);
      setMessages(prev => prev.filter(m => m.id !== aiPlaceholder.id));
      return;
    }

    let currentSessionId = sessionId;
    if (!currentSessionId) {
      try {
        currentSessionId = await createNewChatSession();
        if (!currentSessionId) throw new Error("Failed to get session ID");
        setSessionId(currentSessionId);
      } catch (err) {
        setError('Could not start chat session. Please refresh and try again.');
        setIsLoading(false);
        setIsTyping(false);
        setMessages(prev => prev.filter(m => m.id !== aiPlaceholder.id));
        return;
      }
    }

    try {
      // Correctly handle the complete response from the AI service.
      const aiResponseData = await sendMessage(userMessage.content, currentSessionId);
      
      let responseText = '';
      // Check for different possible response structures.
      if (typeof aiResponseData === 'string') {
        responseText = aiResponseData;
      } else if (aiResponseData && typeof aiResponseData.response === 'string') {
        responseText = aiResponseData.response;
      } else {
        console.error("Unexpected AI response structure:", aiResponseData);
        throw new Error('Received an unexpected response format from the AI service.');
      }

      // Update the placeholder with the final, complete message.
      const finalAiMessage = { ...aiPlaceholder, content: responseText };
      setMessages(prev => prev.map(msg => 
        msg.id === aiPlaceholder.id ? finalAiMessage : msg
      ));

    } catch (err) {
      console.error('Error sending message:', err);
      const errorMessage = { ...aiPlaceholder, content: `Sorry, an error occurred: ${err.message}`, isError: true };
      setMessages(prev => prev.map(msg => msg.id === aiPlaceholder.id ? errorMessage : msg));
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  // --- Event Handlers --- //
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleViewHistory = () => {
    // Navigate to chat history page, ensure the route exists
    navigate('/chat-history'); 
  };

  const handleNewChat = () => {
    console.log("[Chat.jsx handleNewChat] Creating new chat while preserving category state (CLEAN SLATE).");
    createNewSession(); // This will set sessionId to null then new ID, triggering the first useEffect
    setMessages([]);
    setError(null);
    setInput('');
    // PRESERVE the selected category and suggestion types - don't reset them
    // setSelectedCategory(null); // REMOVED - keep the current category
    // setSuggestionTypes({ talk: false, do: false }); // REMOVED - keep current suggestion types
    setCategoryFromUrl(null); // Still reset this as it's URL-specific
    // The useEffects will handle updating suggestions based on the preserved state
  };

  const toggleCategoriesDropdown = () => {
    setShowCategoriesDropdown(prev => !prev);
  };

  const handleCategorySelect = (category) => {
    console.log("Category selected:", category); 
    if (selectedCategory?.id === category.id) {
      setSelectedCategory(null); 
      // Clear localStorage when deselecting category
      clearChatState();
    } else {
      setSelectedCategory(category); // Set the object from the hardcoded list
      // localStorage will be updated by the useEffect
    }
    setShowCategoriesDropdown(false);
  };

  const handleSuggestionClick = (suggestion) => {
    // console.log("[handleSuggestionClick] Received suggestion object:", JSON.stringify(suggestion, null, 2));
    // console.log("[handleSuggestionClick] Direct suggestion.prompt:", suggestion.prompt);
    // console.log("[handleSuggestionClick] Type of suggestion.prompt:", typeof suggestion.prompt);

    const textToSet = suggestion.prompt;
    // console.log("[handleSuggestionClick] 'textToSet' variable before setInput:", textToSet);
    // console.log("[handleSuggestionClick] Type of 'textToSet':", typeof textToSet);

    setInput(textToSet);

    // Forcing a re-read from the input's value after a short delay,
    // though this might show the value before React fully re-renders the controlled component.
    setTimeout(() => {
      const textarea = document.querySelector('.chat-input-form textarea');
      if (textarea) {
        textarea.focus(); // Restore focus
        // console.log("[handleSuggestionClick] Textarea value after 100ms (focus commented out):", textarea.value);
      }
      // Also log the 'input' state variable itself after the update cycle, if possible to capture.
      // This is tricky because setInput is async. We can log 'input' at the start of the next render cycle.
    }, 100); // Increased delay slightly

    // Test with a completely hardcoded string to see if setInput itself is working as expected
    // Uncomment the next line to test this. If this works, the issue is with 'textToSet'.
    // setInput("HARDCODED TEST STRING");
  };

  const handleCheckboxChange = async (type) => {
    // Toggle behavior: Only one checkbox can be active at a time
    setSuggestionTypes(prev => {
      const newState = { talk: false, do: false };
      if (!prev[type]) { // If it wasn't active, make it active
        newState[type] = true;
      }
      // If it *was* active, clicking again makes newState all false, effectively deselecting
      return newState;
    });
    // updateSuggestions will be triggered by the useEffect dependency change
  };

  // --- Update Suggestions Logic --- //
  const updateSuggestions = async (animate = false, caller = "unknown_CLEAN") => {
    if (animate) setIsRefreshing(true);
    setIsFetchingSuggestions(true); // Ensure this is set
    setError(null);
    setSuggestions([]); // Explicitly clear

    console.log(`[Chat.jsx updateSuggestions CLEAN] CALLER: ${caller}, Types:`, JSON.parse(JSON.stringify(suggestionTypes)), 'Category:', selectedCategory?.textName);

    try {
      const EXACT_COUNT = 6;
      let finalSuggestions = [];
      let categoryName = null;

      if (selectedCategory) {
        categoryName = selectedCategory.textName;
        console.log(`[Chat.jsx updateSuggestions CLEAN] Extracted Category Name for fetching: ${categoryName}`);
      }

      // Using simplified utils that return hardcoded data for now
      if (suggestionTypes.talk) {
        console.log('[Chat.jsx updateSuggestions CLEAN] BRANCH: Getting TALK');
        finalSuggestions = await getRandomTalkSuggestions(EXACT_COUNT, categoryName);
      } else if (suggestionTypes.do) {
        console.log('[Chat.jsx updateSuggestions CLEAN] BRANCH: Getting DO');
        finalSuggestions = await getRandomDoSuggestions(EXACT_COUNT, categoryName);
      } else {
        console.log('[Chat.jsx updateSuggestions CLEAN] BRANCH: Getting MIXED');
        finalSuggestions = await getMixedSuggestions(EXACT_COUNT, categoryName);
      }

      console.log(`[Chat.jsx updateSuggestions CLEAN] Suggestions from util BEFORE padding:`, JSON.stringify(finalSuggestions, null, 2)); // Added log

      // Ensure finalSuggestions is an array
      if (!Array.isArray(finalSuggestions)) { // Safety check
          console.error("[Chat.jsx updateSuggestions CLEAN] finalSuggestions is not an array!", finalSuggestions);
          finalSuggestions = [];
      }

      // If more than EXACT_COUNT suggestions are returned, slice to EXACT_COUNT
      if (finalSuggestions.length > EXACT_COUNT) {
        finalSuggestions = finalSuggestions.slice(0, EXACT_COUNT);
      }
      
      // Pad with placeholders if fewer than EXACT_COUNT suggestions are available
      let suggestionTypeForPlaceholder = 'mixed';
      if (suggestionTypes.talk) suggestionTypeForPlaceholder = 'talk';
      if (suggestionTypes.do) suggestionTypeForPlaceholder = 'do';

      while (finalSuggestions.length < EXACT_COUNT) {
        const placeholderId = `placeholder-${suggestionTypeForPlaceholder}-${finalSuggestions.length}-${Date.now()}`;
        let placeholderDisplayText = "💡 Discover something new";
        let placeholderPrompt = "Can you suggest something interesting?";

        if (suggestionTypeForPlaceholder === 'talk') {
            placeholderDisplayText = "💬 Explore a new topic";
            placeholderPrompt = "Give me a conversation starter.";
        } else if (suggestionTypeForPlaceholder === 'do') {
            placeholderDisplayText = "🎯 Try a new activity";
            placeholderPrompt = "Suggest something fun to do.";
        }

        finalSuggestions.push({
          id: placeholderId,
          prompt: placeholderPrompt,
          displayText: placeholderDisplayText,
          type: suggestionTypeForPlaceholder,
          isPlaceholder: true // Flag to identify these if needed
        });
      }
      
      console.log(`[Chat.jsx updateSuggestions CLEAN] Setting ${finalSuggestions.length} suggestions:`, JSON.parse(JSON.stringify(finalSuggestions)));
      setSuggestions(finalSuggestions);

    } catch (err) {
      console.error("[updateSuggestions CLEAN] Error:", err);
      setError("Failed to load suggestions. Please try again or check your connection."); // Updated error message
      setSuggestions([]); // Ensure suggestions are cleared on error
    } finally {
      setIsFetchingSuggestions(false); // Ensure this is reset
      if (animate) {
        setTimeout(() => setIsRefreshing(false), 500);
      }
    }
  };
  
  // --- Utility --- //
  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date)) return '';
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Update hasValidDisplayText function to use displayText
  const hasValidDisplayText = (suggestion) => {
    return suggestion && suggestion.displayText;
  };

  // --- Render Logic --- //
  const showLoadingSpinner = isLoading || isFetchingSuggestions || isRefreshing;
  
  // Update the code that checks for valid suggestions
  const noSuggestionsToShow = !suggestions || suggestions.length === 0 || 
    suggestions.every(s => !hasValidDisplayText(s));

  console.log("[Render] State before render:", { isLoading, isFetchingSuggestions, error, suggestions });

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>AI Suggester</h2>
        <div className="header-buttons">

        <div className="categories-dropdown-container">
            <button className="categories-btn" onClick={toggleCategoriesDropdown}>
              Suggest Based On Life Categories
            </button>
            {showCategoriesDropdown && (
              <div className="categories-dropdown">
                {HARDCODED_MAIN_CATEGORIES.map((category) => (
                  <div 
                    key={category.id}
                    className={`chat-category-item ${selectedCategory?.id === category.id ? 'selected' : ''}`}
                    onClick={() => handleCategorySelect(category)}
                  >
                    {selectedCategory?.id === category.id && <span className="bullseye">🎯</span>}
                    {category.icon && <span className="category-icon">{category.icon}</span>}
                    {/* Display only the textName in the dropdown list item */}
                    {category.textName}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="button-wrapper">
            <button className="history-btn" onClick={handleViewHistory}>Chat History</button>
          </div>

          <div className="button-wrapper">
            <button className="new-chat-btn" onClick={handleNewChat}>New Chat</button>
          </div>

        </div>

      </div>

      <div className="messages-container" style={{ backgroundColor: '#FFFFF0' }}>
        {messages.length === 0 && !isLoading && (
           // Show suggestions view only if chat is empty and not loading first message
           <div className={`empty-chat ${selectedCategory ? 'chat-category-selected-view' : ''}`} style={{ backgroundColor: '#FFFFF0' }}>
              {selectedCategory ? (
                <div className="chat-selected-category-header">
                  <h3>Suggest Based On:</h3>
                  <div className="chat-selected-category-box">
                    {/* Display selected category icon and textName with a space */}
                    {selectedCategory.icon && <span className="selected-category-icon">{selectedCategory.icon}</span>} 
                    {selectedCategory.icon && ' '}{/* Add a space if icon exists */}
                    {selectedCategory.textName} 
                  </div>
                </div>
              ) : (
                <>
                  <h3>Start a conversation with your AI assistant</h3>
                  <p>Ask for suggestions, advice, or any questions about life, events, recipes, and more.</p>
                </>
              )}
              
              <div className="suggestions chat-category-suggestions"> 
                  <div className="suggestion-type-checkboxes">
                    <h4 className="suggestion-heading">Suggest:</h4>
                    <div className="suggestion-options">
                      <label className={suggestionTypes.talk ? 'active' : ''}>
                        <input 
                          type="checkbox" 
                          checked={suggestionTypes.talk}
                          onChange={() => handleCheckboxChange('talk')}
                        />
                        Things To Talk About?
                      </label>
                      
                      <span className="checkbox-divider">OR</span>
                      
                      <label className={suggestionTypes.do ? 'active' : ''}>
                        <input 
                          type="checkbox" 
                          checked={suggestionTypes.do}
                          onChange={() => handleCheckboxChange('do')}
                        />
                        Things To Do?
                      </label>
                    </div>
                  </div>
                  
                  {/* Loading/Error/Suggestions Display */} 
                  <div className="suggestions-content-area">
                      {(() => {
                          let suggestionsToRender = [];
                          
                          if (suggestions && suggestions.length > 0) {
                              // Directly use the suggestions state, which should be EXACT_COUNT or less
                              suggestionsToRender = suggestions;
                          }
                          
                          // REMOVED: while (suggestionsToRender.length < 6) { ... }
                          // No longer padding with UI-level placeholders here.
                          
                          // console.log("RENDER DEBUG - Displaying suggestions:", suggestionsToRender); 
                          
                          if (isFetchingSuggestions) {
                              return (
                                  <div className="suggestions-loading-spinner">
                                      <LoadingIndicator size="small" />
                                  </div>
                              );
                          }
                          
                          if (error) { 
                              return <div className="error-message">{error}</div>;
                          }
                          
                          // Updated condition for no suggestions
                          if (!suggestionsToRender || suggestionsToRender.length === 0) { 
                              return <p>No suggestions available. Try refreshing or changing filters!</p>;
                          }
                          
                          // Render available suggestion buttons
                          return suggestionsToRender.map((suggestion, index) => {
                              const displayText = suggestion.displayText || 
                                  (suggestion.type === 'talk' ? "💬 Talk about something interesting" : "🎯 Try this activity");
                              
                              return (
                                  <button 
                                      key={`sugg-${suggestion.type || 'unknown'}-${suggestion.id || `fixed-${index}`}`}
                                      onClick={() => handleSuggestionClick(suggestion)}
                                  >
                                      {displayText}
                                  </button>
                              );
                          });
                      })()}
                  </div>
                  
                  {/* Refresh Button */} 
                  {!isFetchingSuggestions && (
                      <button 
                        className={`refresh-button ${isRefreshing ? 'rotating' : ''}`}
                        onClick={() => updateSuggestions(true, "refreshButton")}
                        disabled={isRefreshing || isFetchingSuggestions}
                      >
                        Refresh Suggestions <span>↻</span>
                      </button>
                  )}
              </div>
           </div>
        )}

        {messages.map((message, index) => (
          <div key={message.id || index} className={`message ${message.type} ${message.isError ? 'error' : ''}`}>
            <div className="message-content">
              <div className="message-header">
                <span className="message-sender">{message.type === 'user' ? 'You' : 'AI'}</span>
                <span className="message-time">{formatTimestamp(message.timestamp)}</span>
              </div>
              {message.type === 'user' ? (
                <p className="user-message-text">{message.content}</p>
              ) : (
                <MarkdownRenderer content={message.content} isTyping={isTyping && message.content === ''} />
              )}
            </div>
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={(e) => {e.preventDefault(); handleSendMessage();}} className="chat-input-form">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message here..."
          rows="1"
        />
        <button 
          type="submit" 
          className={`send-button ${showLoadingSpinner ? 'loading' : ''}`}
          disabled={showLoadingSpinner || !input.trim()}
        >
          {showLoadingSpinner ? <LoadingIndicator size="small" /> : <PaperAirplane />}
        </button>
      </form>
    </div>
  );
};

export default Chat; 