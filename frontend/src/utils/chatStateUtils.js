// src/utils/chatStateUtils.js

// localStorage keys for chat state - must match Chat.jsx
const STORAGE_KEYS = {
  SELECTED_CATEGORY: 'hangout_selected_category',
  SUGGESTION_TYPES: 'hangout_suggestion_types'
};

// Function to clear chat state from localStorage
export const clearChatState = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.SELECTED_CATEGORY);
    localStorage.removeItem(STORAGE_KEYS.SUGGESTION_TYPES);
    console.log('[ChatStateUtils] Chat state cleared from localStorage');
  } catch (error) {
    console.warn('Failed to clear chat state from localStorage:', error);
  }
};

// Function to save chat state to localStorage
export const saveChatState = (selectedCategory, suggestionTypes) => {
  try {
    if (selectedCategory) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_CATEGORY, JSON.stringify(selectedCategory));
    } else {
      localStorage.removeItem(STORAGE_KEYS.SELECTED_CATEGORY);
    }
    localStorage.setItem(STORAGE_KEYS.SUGGESTION_TYPES, JSON.stringify(suggestionTypes));
  } catch (error) {
    console.warn('Failed to save chat state to localStorage:', error);
  }
};

// Function to load chat state from localStorage
export const loadChatState = () => {
  try {
    const savedCategory = localStorage.getItem(STORAGE_KEYS.SELECTED_CATEGORY);
    const savedSuggestionTypes = localStorage.getItem(STORAGE_KEYS.SUGGESTION_TYPES);
    
    return {
      selectedCategory: savedCategory ? JSON.parse(savedCategory) : null,
      suggestionTypes: savedSuggestionTypes ? JSON.parse(savedSuggestionTypes) : { talk: false, do: false }
    };
  } catch (error) {
    console.warn('Failed to load chat state from localStorage:', error);
    return {
      selectedCategory: null,
      suggestionTypes: { talk: false, do: false }
    };
  }
}; 