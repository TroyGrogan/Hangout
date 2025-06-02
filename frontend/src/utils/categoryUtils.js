// frontend/src/utils/categoryUtils.js
import mainCategoriesData from '../data/mainCategories.json';

// Hardcoded Main Categories with Correct Numeric IDs and Emojis
// Now importing from JSON file instead of hardcoding here
export const HARDCODED_MAIN_CATEGORIES = mainCategoriesData.map(category => {
  // Example category.name from JSON: "💰 Financial Understanding, Economics, and Politics"
  // Example category.icon from JSON: "💰"
  
  const nameParts = category.name.split(' ');
  // Extract the textual part of the name. If the first part is the icon, skip it.
  // This assumes the icon is always the first part if present in the name string from JSON.
  let textualName = category.name;
  if (nameParts.length > 1 && nameParts[0] === category.icon) {
    textualName = nameParts.slice(1).join(' ');
  } else if (nameParts.length > 1 && !nameParts[0].match(/\p{Emoji}/u) && category.name.startsWith(category.icon)) {
    // Fallback for cases where icon might not be space-separated but is at the start
    // e.g. name: "💰Financial...", icon: "💰"
    textualName = category.name.substring(category.icon.length).trimStart();
  }


  return {
    id: category.id,
    fullName: category.name, // The original name from JSON, e.g., "💰 Financial..."
    textName: textualName,   // Just the text part, e.g., "Financial..."
    icon: category.icon      // The standalone icon, e.g., "💰"
  };
});

// Function to get category details by ID
export const getCategoryById = (id) => {
  const categoryId = parseInt(id, 10); // Ensure ID is a number
  return HARDCODED_MAIN_CATEGORIES.find(category => category.id === categoryId);
}; 