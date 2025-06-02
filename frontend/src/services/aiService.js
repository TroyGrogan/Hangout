import axiosInstance from './axiosInstance'; // Use the re-exported instance

// Base URL for AI API endpoints (relative to the axiosInstance baseURL)
// Since axiosInstance baseURL is e.g., 'http://localhost:8000/api',
// this path will target 'http://localhost:8000/api/ai/'
const AI_API_BASE = '/ai';

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
 * Fetches the chat history summary.
 * @param {string} [searchQuery=''] - Optional search term.
 * @returns {Promise<Array<object>>} - Promise resolving to an array of session summaries.
 */
export const getChatHistory = async (searchQuery = '') => {
  try {
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery); // Use 'search' param name if backend expects it
    
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