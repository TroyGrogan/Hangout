// src/utils/chatStateUtils.js

// localStorage keys for chat state - must match Chat.jsx
const STORAGE_KEYS = {
  SELECTED_CATEGORY: 'hangout_selected_category',
  SUGGESTION_TYPES: 'hangout_suggestion_types'
};

// sessionStorage keys for guest users
const GUEST_STORAGE_KEYS = {
  MESSAGES: 'hangout_guest_messages',
  SELECTED_CATEGORY: 'hangout_guest_selected_category',
  SUGGESTION_TYPES: 'hangout_guest_suggestion_types'
};

// Function to clear chat state (works for both authenticated and guest users)
export const clearChatState = (isGuest = false) => {
  try {
    if (isGuest) {
      // Clear guest sessionStorage
      sessionStorage.removeItem(GUEST_STORAGE_KEYS.MESSAGES);
      sessionStorage.removeItem(GUEST_STORAGE_KEYS.SELECTED_CATEGORY);
      sessionStorage.removeItem(GUEST_STORAGE_KEYS.SUGGESTION_TYPES);
    } else {
      // Clear authenticated user localStorage
      localStorage.removeItem(STORAGE_KEYS.SELECTED_CATEGORY);
      localStorage.removeItem(STORAGE_KEYS.SUGGESTION_TYPES);
    }
  } catch (error) {
    console.warn('Failed to clear chat state:', error);
  }
};

// Comprehensive function to clear all user-related storage
export const clearAllUserStorage = () => {
  try {
    // Clear all localStorage items related to authentication and user data
    const keysToRemove = [
      'accessToken',
      'refreshToken', 
      'guestMode',
      'selectedChatSessionId',
      STORAGE_KEYS.SELECTED_CATEGORY,
      STORAGE_KEYS.SUGGESTION_TYPES
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Clear all sessionStorage
    sessionStorage.clear();
    
    // Clear any cached data
    if (window.caches) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
  } catch (error) {
    console.warn('Failed to clear all user storage:', error);
  }
};

// Function to save chat state (works for both authenticated and guest users)
export const saveChatState = (selectedCategory, suggestionTypes, isGuest = false) => {
  try {
    if (isGuest) {
      // Save to guest sessionStorage
      if (selectedCategory) {
        sessionStorage.setItem(GUEST_STORAGE_KEYS.SELECTED_CATEGORY, JSON.stringify(selectedCategory));
      } else {
        sessionStorage.removeItem(GUEST_STORAGE_KEYS.SELECTED_CATEGORY);
      }
      sessionStorage.setItem(GUEST_STORAGE_KEYS.SUGGESTION_TYPES, JSON.stringify(suggestionTypes));
    } else {
      // Save to authenticated user localStorage
      if (selectedCategory) {
        localStorage.setItem(STORAGE_KEYS.SELECTED_CATEGORY, JSON.stringify(selectedCategory));
      } else {
        localStorage.removeItem(STORAGE_KEYS.SELECTED_CATEGORY);
      }
      localStorage.setItem(STORAGE_KEYS.SUGGESTION_TYPES, JSON.stringify(suggestionTypes));
    }
  } catch (error) {
    console.warn('Failed to save chat state:', error);
  }
};

// Function to load chat state (works for both authenticated and guest users)
export const loadChatState = (isGuest = false) => {
  try {
    if (isGuest) {
      // Load from guest sessionStorage
      const savedCategory = sessionStorage.getItem(GUEST_STORAGE_KEYS.SELECTED_CATEGORY);
      const savedSuggestionTypes = sessionStorage.getItem(GUEST_STORAGE_KEYS.SUGGESTION_TYPES);
      
      return {
        selectedCategory: savedCategory ? JSON.parse(savedCategory) : null,
        suggestionTypes: savedSuggestionTypes ? JSON.parse(savedSuggestionTypes) : { talk: false, do: false }
      };
    } else {
      // Load from authenticated user localStorage
      const savedCategory = localStorage.getItem(STORAGE_KEYS.SELECTED_CATEGORY);
      const savedSuggestionTypes = localStorage.getItem(STORAGE_KEYS.SUGGESTION_TYPES);
      
      return {
        selectedCategory: savedCategory ? JSON.parse(savedCategory) : null,
        suggestionTypes: savedSuggestionTypes ? JSON.parse(savedSuggestionTypes) : { talk: false, do: false }
      };
    }
  } catch (error) {
    console.warn('Failed to load chat state:', error);
    return {
      selectedCategory: null,
      suggestionTypes: { talk: false, do: false }
    };
  }
};

// Guest-specific functions for message storage
export const saveGuestMessages = (messages) => {
  try {
    sessionStorage.setItem(GUEST_STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
  } catch (error) {
    console.warn('Failed to save guest messages to sessionStorage:', error);
  }
};

export const loadGuestMessages = () => {
  try {
    const savedMessages = sessionStorage.getItem(GUEST_STORAGE_KEYS.MESSAGES);
    return savedMessages ? JSON.parse(savedMessages) : [];
  } catch (error) {
    console.warn('Failed to load guest messages from sessionStorage:', error);
    return [];
  }
};

export const clearGuestMessages = () => {
  try {
    sessionStorage.removeItem(GUEST_STORAGE_KEYS.MESSAGES);
  } catch (error) {
    console.warn('Failed to clear guest messages from sessionStorage:', error);
  }
}; 