import axiosInstance from './axiosInstance'; // Use the re-exported instance

// Base URL for AI API endpoints (relative to the axiosInstance baseURL)
// Since axiosInstance baseURL is e.g., 'http://localhost:8000/api',
// this path will target 'http://localhost:8000/api/ai/'
const AI_API_BASE = '/ai';

// Guest chat history storage key
const GUEST_CHAT_HISTORY_KEY = 'hangout_guest_chat_history';

const SUGGESTIONS_API_BASE = '/suggestions'; // Corresponds to api/suggestions/
const TALKING_SUGGESTIONS_CATEGORY_ID = 22572; // Placeholder Category ID

/**
 * Sends a message to the AI backend for a given session.
 * @param {string} message - The user's message.
 * @param {string | null} chatSessionId - The ID of the current chat session.
 * @param {string} [modelMode='default'] - Optional model mode parameter.
 * @returns {Promise<object>} - Promise resolving to the API response data (e.g., { id, message, response, ... }).
 */
export const sendMessage = async (message, chatSessionId, modelMode = 'default') => {
  if (!chatSessionId) {
    console.error('sendMessage error: chatSessionId is required.');
    throw new Error('Chat session ID is missing.');
  }
  try {
    // Corresponds to path('send-message/', ...) in ai_chat/urls.py
    const response = await axiosInstance.post(`${AI_API_BASE}/send-message/`, {
      message,
      chat_session: chatSessionId,
      model_mode: modelMode // Include if your backend uses it
    });
    return response.data;
  } catch (error) {
    console.error('Error sending message to AI:', error.response?.data || error.message);
    // Re-throw the error so the component can handle it (e.g., display error message)
    throw error; 
  }
};

/**
 * Requests a new chat session ID from the backend.
 * @returns {Promise<string>} - Promise resolving to the new chat session ID.
 */
export const createNewChatSession = async () => {
  try {
    // Corresponds to path('new-session/', ...) in ai_chat/urls.py
    const response = await axiosInstance.post(`${AI_API_BASE}/new-session/`);
    if (!response.data || !response.data.chat_session_id) {
        throw new Error('Invalid response structure from new-session endpoint');
    }
    return response.data.chat_session_id;
  } catch (error) {
    console.error('Error creating new chat session:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Fetches the chat history summary with pagination support.
 * @param {string} [searchQuery=''] - Optional search term.
 * @param {number} [page=1] - Page number for pagination.
 * @param {number} [pageSize=20] - Number of items per page.
 * @returns {Promise<object>} - Promise resolving to paginated session summaries with metadata.
 */
export const getChatHistory = async (searchQuery = '', page = 1, pageSize = 20) => {
  try {
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);
    params.append('page', page.toString());
    params.append('page_size', pageSize.toString());
    
    // Corresponds to path('history/', ...) in ai_chat/urls.py
    const response = await axiosInstance.get(`${AI_API_BASE}/history/?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching chat history:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Fetches the detailed messages for a specific chat session.
 * @param {string} sessionId - The ID of the chat session.
 * @returns {Promise<object>} - Promise resolving to the session details object (including messages).
 */
export const getChatSession = async (sessionId) => {
  if (!sessionId) {
    console.error('getChatSession error: sessionId is required.');
    throw new Error('Chat session ID is missing.');
  }
  try {
    // Corresponds to path('session/<str:session_id>/', ...) in ai_chat/urls.py
    const response = await axiosInstance.get(`${AI_API_BASE}/session/${sessionId}/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching chat session ${sessionId}:`, error.response?.data || error.message);
    throw error;
  }
};

/**
 * Deletes a specific chat session.
 * @param {string} sessionId - The ID of the chat session to delete.
 * @returns {Promise<object>} - Promise resolving to the success message (or empty on 204).
 */
export const deleteChatSession = async (sessionId) => {
  if (!sessionId) {
    console.error('deleteChatSession error: sessionId is required.');
    throw new Error('Chat session ID is missing.');
  }
  try {
    // Corresponds to path('session/delete/<str:session_id>/', ...) in ai_chat/urls.py
    const response = await axiosInstance.delete(`${AI_API_BASE}/session/delete/${sessionId}/`);
    // DELETE often returns 204 No Content, check for that or specific success message
    return response.data || { message: 'Deletion successful' }; 
  } catch (error) {
    console.error(`Error deleting chat session ${sessionId}:`, error.response?.data || error.message);
    throw error;
  }
};

/**
 * Renames a specific chat session.
 * @param {string} sessionId - The ID of the chat session to rename.
 * @param {string} title - The new title for the session.
 * @returns {Promise<object>} - Promise resolving to the success message.
 */
export const renameChatSession = async (sessionId, title) => {
  if (!sessionId || title === undefined || title === null) {
    console.error('renameChatSession error: sessionId and title are required.');
    throw new Error('Missing session ID or title for renaming.');
  }
  try {
    // Corresponds to path('session/rename/<str:session_id>/', ...) in ai_chat/urls.py
    const response = await axiosInstance.put(`${AI_API_BASE}/session/rename/${sessionId}/`, {
      title
    });
    return response.data;
  } catch (error) {
    console.error(`Error renaming chat session ${sessionId}:`, error.response?.data || error.message);
    throw error;
  }
};

/**
 * Sends a request to the backend to initialize the LLM.
 * (Use with caution, maybe only for admin or specific triggers)
 * @returns {Promise<object>} - Promise resolving to the initialization status message.
 */
export const initializeAiModel = async () => {
     try {
          // Corresponds to path('initialize-model/', ...) in ai_chat/urls.py
          const response = await axiosInstance.post(`${AI_API_BASE}/initialize-model/`);
          console.log('AI model initialization requested:', response.data);
          return response.data;
     } catch (error) {
          console.error('Error requesting AI model initialization:', error.response?.data || error.message);
          throw error;
     }
};

/**
 * Fetches suggestions based on provided criteria.
 * @param {object} params - The query parameters.
 * @param {number | string} [params.category] - The ID of the category (use 22572 for generic/template talk).
 * @param {'talk' | 'do' | undefined} [params.suggestion_type] - The type of suggestion ('talk' or 'do').
 * @param {boolean | undefined} [params.is_template] - Filter for template suggestions (for talk type).
 * @param {number} [params.limit] - Optional: Limit the number of results (backend needs to support this).
 * @returns {Promise<Array<object>>} - Promise resolving to an array of suggestion objects.
 */
export const getSuggestions = async (params = {}) => {
    const queryParams = new URLSearchParams();

    if (params.category !== undefined) {
        queryParams.append('category', params.category);
    }
    if (params.suggestion_type) {
        queryParams.append('suggestion_type', params.suggestion_type);
    }
    if (params.is_template !== undefined) {
        queryParams.append('is_template', String(params.is_template)); // Convert boolean to string
    }

    const queryString = queryParams.toString();
    const url = `${SUGGESTIONS_API_BASE}/${queryString ? '?' + queryString : ''}`;

    console.log(`[aiService] Fetching suggestions from: ${url}`);

    try {
        const response = await axiosInstance.get(url);
        return response.data || []; 
    } catch (error) {
        console.error(`Error fetching suggestions with params ${JSON.stringify(params)}:`, error.response?.data || error.message);
        throw error;
    }
};

/**
 * Updates the AI's system prompt on the backend.
 * @param {string} newPrompt - The new system prompt content.
 * @returns {Promise<object>} - Promise resolving to the API response.
 */
export const updateSystemPrompt = async (newPrompt) => {
  try {
    // This endpoint must be created on the backend (e.g., in ai_chat/urls.py and views.py)
    // It should accept a POST request with the new prompt content.
    const response = await axiosInstance.post(`${AI_API_BASE}/update-system-prompt/`, {
      system_prompt: newPrompt,
    });
    console.log("System prompt updated successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error('Error updating system prompt:', error.response?.data || error.message);
    throw error;
  }
};

/* // Comment out or remove the unused function
/**
 * Fetches the main categories (those without a parent).
 * @returns {Promise<Array<object>>} - Promise resolving to an array of category objects.
 */
/*
export const getMainCategories = async () => {
     try {
          // Fetch categories, ensuring pagination is off and filtering for top-level
          // Corresponds to path('api/categories/', ...) viewset with query params
          const response = await axiosInstance.get('/categories/?paginate=false&parent__isnull=true');
          // The viewset likely returns the data directly as an array when pagination is off
          return response.data;
     } catch (error) {
          console.error('Error fetching main categories:', error.response?.data || error.message);
          throw error;
     }
};
*/

// ===== GUEST CHAT HISTORY FUNCTIONS =====
// These functions handle chat history for guest users using sessionStorage

/**
 * Gets the guest chat history from sessionStorage
 */
const getGuestChatHistoryData = () => {
  try {
    const data = sessionStorage.getItem(GUEST_CHAT_HISTORY_KEY);
    return data ? JSON.parse(data) : { sessions: {}, sessionOrder: [] };
  } catch (error) {
    console.warn('Failed to load guest chat history:', error);
    return { sessions: {}, sessionOrder: [] };
  }
};

/**
 * Saves the guest chat history to sessionStorage
 */
const saveGuestChatHistoryData = (data) => {
  try {
    sessionStorage.setItem(GUEST_CHAT_HISTORY_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save guest chat history:', error);
  }
};

/**
 * Adds or updates a message in a guest chat session
 */
export const addGuestChatMessage = (sessionId, userMessage, aiResponse) => {
  const data = getGuestChatHistoryData();
  
  if (!data.sessions[sessionId]) {
    // Create new session
    const title = userMessage.length > 50 ? userMessage.substring(0, 50) + '...' : userMessage;
    data.sessions[sessionId] = {
      id: sessionId,
      title,
      messages: [],
      timestamp: new Date().toISOString(),
      message_count: 0
    };
    data.sessionOrder.unshift(sessionId); // Add to beginning for reverse chronological order
  }
  
  // Add the message pair
  const messageId = Date.now() + Math.random(); // Simple unique ID
  data.sessions[sessionId].messages.push({
    id: messageId,
    message: userMessage,
    response: aiResponse,
    created_at: new Date().toISOString(),
    chat_session: sessionId,
    user: null,
    title: data.sessions[sessionId].title
  });
  
  // Update session metadata
  data.sessions[sessionId].message_count = data.sessions[sessionId].messages.length;
  data.sessions[sessionId].timestamp = new Date().toISOString();
  
  // Move session to front of order (most recent first)
  data.sessionOrder = data.sessionOrder.filter(id => id !== sessionId);
  data.sessionOrder.unshift(sessionId);
  
  saveGuestChatHistoryData(data);
};

/**
 * Guest version of getChatHistory - returns paginated sessions from sessionStorage
 */
export const getGuestChatHistory = async (searchQuery = '', page = 1, pageSize = 20) => {
  const data = getGuestChatHistoryData();
  let sessions = data.sessionOrder.map(id => data.sessions[id]).filter(Boolean);
  
  // Apply search filter if provided
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    sessions = sessions.filter(session => 
      session.title?.toLowerCase().includes(query) ||
      session.messages.some(msg => 
        msg.message?.toLowerCase().includes(query) || 
        msg.response?.toLowerCase().includes(query)
      )
    );
  }
  
  // Calculate pagination
  const total = sessions.length;
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedSessions = sessions.slice(startIndex, endIndex);
  
  // Return data in the same format as the backend API
  return {
    results: paginatedSessions,
    count: total,
    next: endIndex < total ? page + 1 : null,
    previous: page > 1 ? page - 1 : null
  };
};

/**
 * Guest version of getChatSession - returns session details from sessionStorage
 */
export const getGuestChatSession = async (sessionId) => {
  const data = getGuestChatHistoryData();
  const session = data.sessions[sessionId];
  
  if (!session) {
    throw new Error(`Guest chat session ${sessionId} not found`);
  }
  
  return session;
};

/**
 * Guest version of deleteChatSession - removes session from sessionStorage
 */
export const deleteGuestChatSession = async (sessionId) => {
  const data = getGuestChatHistoryData();
  delete data.sessions[sessionId];
  data.sessionOrder = data.sessionOrder.filter(id => id !== sessionId);
  saveGuestChatHistoryData(data);
  return { success: true };
};

/**
 * Guest version of renameChatSession - updates session title in sessionStorage
 */
export const renameGuestChatSession = async (sessionId, newTitle) => {
  const data = getGuestChatHistoryData();
  if (data.sessions[sessionId]) {
    data.sessions[sessionId].title = newTitle;
    // Update title in all messages of this session
    data.sessions[sessionId].messages.forEach(msg => {
      msg.title = newTitle;
    });
    saveGuestChatHistoryData(data);
    return { success: true, title: newTitle };
  }
  throw new Error(`Guest chat session ${sessionId} not found`);
};

// Optional: Export functions individually or as a default object
// export default {
//   sendMessage,
//   createNewChatSession,
//   getChatHistory,
//   getChatSession,
//   deleteChatSession,
//   renameChatSession,
//   initializeAiModel,
//   getSuggestions,
//   getMainCategories
// }; 