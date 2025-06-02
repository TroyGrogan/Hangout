import mainCategoriesData from '../data/mainCategories.json';

// Import all required JSON files directly
import relationships from '../data/sub_categories/1_relationships.json';
import community from '../data/sub_categories/2_community.json';
import financial from '../data/sub_categories/3_financial.json';
import career from '../data/sub_categories/4_career.json';
import time from '../data/sub_categories/5_time.json';
import pets from '../data/sub_categories/6_pets.json';
import health from '../data/sub_categories/7_health.json';
import sports from '../data/sub_categories/8_sports.json';
import technology from '../data/sub_categories/9_technology.json';
import personal from '../data/sub_categories/10_personal.json';
import spirituality from '../data/sub_categories/11_spirituality.json';
import recreation from '../data/sub_categories/12_recreation.json';
import home from '../data/sub_categories/13_home.json';
import travel from '../data/sub_categories/14_travel.json';
import food from '../data/sub_categories/15_food.json';
import art from '../data/sub_categories/16_art.json';

// Cache for loaded subcategory data
const categoryCache = {};

// Direct mapping of subcategory files to JSON data 
// The keys match the fileName property in mainCategories.json
const subcategoryMap = {
  'sub_categories/1_relationships.json': relationships,
  'sub_categories/2_community.json': community,
  'sub_categories/3_financial.json': financial,
  'sub_categories/4_career.json': career,
  'sub_categories/5_time.json': time,
  'sub_categories/6_pets.json': pets,
  'sub_categories/7_health.json': health,
  'sub_categories/8_sports.json': sports,
  'sub_categories/9_technology.json': technology,
  'sub_categories/10_personal.json': personal,
  'sub_categories/11_spirituality.json': spirituality,
  'sub_categories/12_recreation.json': recreation,
  'sub_categories/13_home.json': home,
  'sub_categories/14_travel.json': travel,
  'sub_categories/15_food.json': food,
  'sub_categories/16_art.json': art
};

/**
 * Load a category file directly from imports
 * @param {string} fileName - The file name to load
 * @returns {Promise<Object>} The category data
 */
export const loadCategoryFile = async (fileName) => {
  if (categoryCache[fileName]) {
    console.log(`Using cached data for ${fileName}`);
    return categoryCache[fileName];
  }

  try {
    console.log(`Looking for category file with key: ${fileName}`);
    
    // The fileName might be "sub_categories/1_relationships.json" but our map keys match this
    // so we should be able to look it up directly
    const categoryData = subcategoryMap[fileName];
    
    if (!categoryData) {
      console.error(`No data found for category file: ${fileName}`);
      console.log('Available keys in subcategoryMap:', Object.keys(subcategoryMap));
      return { subcategories: [] };
    }
    
    console.log(`Successfully loaded category data for ${fileName}`);
    
    // Cache and return the data
    categoryCache[fileName] = categoryData;
    return categoryData;
  } catch (error) {
    console.error(`Error loading category file ${fileName}:`, error);
    return { subcategories: [] };
  }
};

/**
 * Get all main categories from the JSON data
 * @returns {Array} Array of main category objects
 */
export const getMainCategories = () => {
  return mainCategoriesData;
};

/**
 * Get a main category by ID
 * @param {number} id - The ID of the main category to find
 * @returns {Object|null} The category object or null if not found
 */
export const getMainCategoryById = (id) => {
  const categoryId = parseInt(id, 10); // Ensure ID is a number
  return mainCategoriesData.find(category => category.id === categoryId) || null;
};

/**
 * Get subcategories for a main category
 * @param {number} mainCategoryId - The ID of the main category
 * @returns {Promise<Array>} Promise that resolves to an array of subcategory objects
 */
export const getSubcategories = async (mainCategoryId) => {
  const mainCategory = getMainCategoryById(mainCategoryId);
  console.log(`Getting subcategories for main category ID: ${mainCategoryId}`, mainCategory);
  
  if (!mainCategory || !mainCategory.fileName) {
    console.error(`No main category found with ID ${mainCategoryId} or missing fileName`);
    return [];
  }
  
  console.log(`Loading subcategories from file: ${mainCategory.fileName}`);
  const categoryData = await loadCategoryFile(mainCategory.fileName);
  console.log(`Loaded category data:`, categoryData);
  
  if (!categoryData || !categoryData.subcategories) {
    console.error(`No subcategories found in file ${mainCategory.fileName}`);
    return [];
  }
  
  console.log(`Found ${categoryData.subcategories.length} subcategories for ${mainCategory.name}`);
  return categoryData.subcategories || [];
};

/**
 * Find a subcategory by name within a specified main category
 * @param {number} mainCategoryId - The ID of the main category to search in
 * @param {string} subcategoryName - The name of the subcategory to find
 * @returns {Promise<Object|null>} Promise that resolves to the subcategory object or null
 */
export const findSubcategoryByName = async (mainCategoryId, subcategoryName) => {
  const subcategories = await getSubcategories(mainCategoryId);
  
  // Recursive function to search through nested subcategories
  const findInSubcategories = (categories, name) => {
    for (const category of categories) {
      if (category.name === name) {
        return category;
      }
      
      if (category.subcategories && category.subcategories.length > 0) {
        const found = findInSubcategories(category.subcategories, name);
        if (found) return found;
      }
    }
    return null;
  };
  
  return findInSubcategories(subcategories, subcategoryName);
};

/**
 * Get all categories in a flat structure for compatibility with the existing code
 * @returns {Promise<Array>} All categories in a flat array
 */
export const getAllCategoriesFlat = async () => {
  console.log("Starting getAllCategoriesFlat...");
  const allCategories = [];
  let nextId = 1000;
  
  // Helper function to process subcategories recursively
  const processSubcategories = (subcats, parentId) => {
    if (!subcats || !Array.isArray(subcats) || subcats.length === 0) {
      return [];
    }
    
    console.log(`Processing ${subcats.length} subcategories for parent ID: ${parentId}`);
    const result = [];
    
    for (const subcat of subcats) {
      try {
        if (!subcat || typeof subcat !== 'object' || !subcat.name) {
          console.warn(`Skipping invalid subcategory for parent ${parentId}`);
          continue;
        }
        
        const id = nextId++;
        
        // Create a flattened subcategory
        const flatSubcat = {
          id,
          name: subcat.name,
          icon: subcat.icon || '🧩', // Default icon if missing
          parent: parentId,
          parent_id: parentId
        };
        
        // Add to results
        result.push(flatSubcat);
        allCategories.push(flatSubcat);
        
        // Process children recursively
        if (subcat.subcategories && Array.isArray(subcat.subcategories) && subcat.subcategories.length > 0) {
          console.log(`Category ${flatSubcat.name} has ${subcat.subcategories.length} children`);
          processSubcategories(subcat.subcategories, id);
        }
      } catch (err) {
        console.error(`Error processing subcategory:`, err);
      }
    }
    
    return result;
  };
  
  try {
    console.log(`Processing ${mainCategoriesData.length} main categories...`);
    
    // First add all main categories
    for (const mainCategory of mainCategoriesData) {
      try {
        console.log(`Processing main category: ${mainCategory.name} (ID: ${mainCategory.id}, fileName: ${mainCategory.fileName})`);
        
        // Add the main category
        const formattedMainCategory = {
          id: mainCategory.id,
          name: mainCategory.name,
          icon: mainCategory.icon,
          parent: null,
          parent_id: null
        };
        allCategories.push(formattedMainCategory);
        
        // Load the category data file
        const fileName = mainCategory.fileName;
        console.log(`Looking up subcategory data for ${fileName}`);
        const categoryData = subcategoryMap[fileName];
        
        if (categoryData && categoryData.subcategories && Array.isArray(categoryData.subcategories)) {
          console.log(`Found ${categoryData.subcategories.length} subcategories for ${mainCategory.name}`);
          // Process subcategories recursively
          processSubcategories(categoryData.subcategories, mainCategory.id);
        } else {
          console.warn(`No subcategories found for ${mainCategory.name} (${fileName})`);
          if (!categoryData) console.error(`categoryData is null/undefined for ${fileName}`);
          else if (!categoryData.subcategories) console.error(`categoryData.subcategories is null/undefined for ${fileName}`);
        }
      } catch (err) {
        console.error(`Error processing main category ${mainCategory.name}:`, err);
      }
    }
    
    console.log(`Total flattened categories: ${allCategories.length}`);
    
    // If we somehow ended up with no categories, return at least the main categories
    if (allCategories.length === 0) {
      console.warn("No categories were processed successfully. Falling back to main categories only.");
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
    console.error("Error in getAllCategoriesFlat:", error);
    // Return at least the main categories
    console.warn("Falling back to main categories only due to error.");
    return mainCategoriesData.map(cat => ({
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      parent: null,
      parent_id: null
    }));
  }
};

/**
 * Search for categories by keyword across all categories
 * @param {string} keyword - The search term
 * @returns {Promise<Array>} Promise that resolves to an array of matching category objects
 */
export const searchCategories = async (keyword) => {
  if (!keyword || keyword.trim() === '') return [];
  
  const searchTerm = keyword.toLowerCase().trim();
  const results = [];
  
  // Search in each main category
  for (const mainCategory of mainCategoriesData) {
    // Check if main category name matches
    if (mainCategory.name.toLowerCase().includes(searchTerm)) {
      results.push({
        ...mainCategory,
        mainCategoryId: mainCategory.id,
        path: [mainCategory.name]
      });
    }
    
    // Load subcategories and search
    const categoryData = subcategoryMap[mainCategory.fileName];
    if (categoryData && categoryData.subcategories) {
      // Recursive function to search through categories
      const searchInCategories = (categories, mainCat, parentPath = []) => {
        for (const category of categories) {
          const currentPath = [...parentPath, category.name];
          
          if (category.name.toLowerCase().includes(searchTerm)) {
            results.push({
              ...category,
              mainCategoryId: mainCat.id,
              path: currentPath
            });
          }
          
          if (category.subcategories && category.subcategories.length > 0) {
            searchInCategories(category.subcategories, mainCat, currentPath);
          }
        }
      };
      
      searchInCategories(categoryData.subcategories, mainCategory, [mainCategory.name]);
    }
  }
  
  return results;
};

/**
 * Get hierarchical path for a category
 * @param {number} mainCategoryId - The ID of the main category
 * @param {string} targetCategoryName - The name of the target category
 * @returns {Promise<Array>} Promise that resolves to an array of category names
 */
export const getCategoryPath = async (mainCategoryId, targetCategoryName) => {
  const mainCategory = getMainCategoryById(mainCategoryId);
  if (!mainCategory) return [];
  
  const categoryData = subcategoryMap[mainCategory.fileName];
  if (!categoryData) return [mainCategory.name];
  
  const findPath = (categories, targetName, currentPath = []) => {
    for (const category of categories) {
      const newPath = [...currentPath, category.name];
      
      if (category.name === targetName) {
        return newPath;
      }
      
      if (category.subcategories && category.subcategories.length > 0) {
        const foundPath = findPath(category.subcategories, targetName, newPath);
        if (foundPath.length > 0) return foundPath;
      }
    }
    
    return [];
  };
  
  const path = findPath(categoryData.subcategories || [], targetCategoryName, [mainCategory.name]);
  return path;
}; 