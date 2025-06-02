import mainCategoriesData from '../data/mainCategories.json';
import { getAllCategoriesFlat, getSubcategories, getMainCategoryById } from '../utils/categoryDataUtils';

// Fetches ONLY top-level parent categories (for initial load)
export const fetchMainCategories = async () => {
  console.log("Fetching top-level categories from local JSON...");
  
  try {
    // Return the main categories directly from the JSON file
    console.log(`Fetched ${mainCategoriesData.length} top-level categories.`);
    return mainCategoriesData;
  } catch (error) {
    console.error("Error fetching top-level categories:", error);
    throw new Error("Failed to fetch top-level categories");
  }
};

// Fetches subcategories for a specific parent category
export const fetchSubcategories = async (parentId) => {
  console.log(`Fetching subcategories for parent ID: ${parentId} from local JSON`);
  
  try {
    // Get the main category by ID
    const mainCategory = getMainCategoryById(parentId);
    
    if (!mainCategory) {
      console.error(`No main category found with ID: ${parentId}`);
      return [];
    }
    
    // Get subcategories for this main category
    const subcategories = await getSubcategories(parentId);
    
    if (subcategories.length > 0) {
      console.log(`Found ${subcategories.length} subcategories for ${mainCategory.name}`);
      
      // Convert subcategories to the expected format (adding parent references)
      return subcategories.map(subcat => ({
        ...subcat,
        parent: parentId,
        parent_id: parentId
      }));
    } else {
      console.log(`No subcategories found for ${mainCategory.name}`);
      return [];
    }
  } catch (error) {
    console.error(`Error fetching subcategories for parent ID: ${parentId}:`, error);
    throw new Error(`Failed to fetch subcategories for parent ID: ${parentId}`);
  }
};

// Fetches all categories (flattened) 
export const fetchAllCategories = async () => {
  console.log("Fetching all categories from local JSON...");
  
  try {
    // Get all categories in a flat structure
    const allCategories = await getAllCategoriesFlat();
    console.log(`Fetched a total of ${allCategories.length} categories.`);
    
    // Just in case there's an error, return an empty array instead of throwing
    if (!allCategories || allCategories.length === 0) {
      console.warn("Warning: No categories were found. Returning main categories as fallback.");
      // Return just the main categories as a fallback
      return mainCategoriesData.map(cat => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        parent: null,
        parent_id: null
      }));
    }
    
    return allCategories;
  } catch (error) {
    console.error("Error fetching all categories:", error);
    console.warn("Returning main categories as fallback due to error.");
    // Return just the main categories as a fallback
    return mainCategoriesData.map(cat => ({
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      parent: null,
      parent_id: null
    }));
  }
};
