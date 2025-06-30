import BinarySearchTree from '../utils/binarySearchTree';
import { getAllCategoriesFlat, getMainCategoryById } from '../utils/categoryDataUtils';

class CategorySearchService {
  constructor() {
    this.bst = new BinarySearchTree();
    this.categoriesLoaded = false;
    this.allCategories = [];
  }

  // Initialize the BST with all categories
  async initialize() {
    if (this.categoriesLoaded) return;
    
    try {
      console.log('Initializing category search service...');
      this.allCategories = await getAllCategoriesFlat();
      this.bst.buildFromCategories(this.allCategories);
      this.categoriesLoaded = true;
      console.log(`Category search service initialized with ${this.allCategories.length} categories`);
    } catch (error) {
      console.error('Error initializing category search service:', error);
      throw error;
    }
  }

  // Search for categories using BST
  async searchCategories(searchTerm) {
    if (!this.categoriesLoaded) {
      await this.initialize();
    }

    if (!searchTerm || searchTerm.trim() === '') {
      return { results: [], mainCategories: [] };
    }

    const results = this.bst.search(searchTerm);
    
    // Group results by main category
    const mainCategoryGroups = new Map();
    
    for (const category of results) {
      let mainCategoryId;
      let mainCategory;
      
      // If this is a main category (no parent)
      if (!category.parent_id && !category.parent) {
        mainCategoryId = category.id;
        mainCategory = category;
      } else {
        // Find the root main category
        mainCategoryId = this.findRootMainCategory(category);
        mainCategory = getMainCategoryById(mainCategoryId);
      }
      
      if (mainCategory) {
        if (!mainCategoryGroups.has(mainCategoryId)) {
          mainCategoryGroups.set(mainCategoryId, {
            mainCategory,
            matches: []
          });
        }
        
        mainCategoryGroups.get(mainCategoryId).matches.push(category);
      }
    }

    // Convert to array and sort by main category name
    const mainCategories = Array.from(mainCategoryGroups.values())
      .sort((a, b) => a.mainCategory.name.localeCompare(b.mainCategory.name));

    return {
      results,
      mainCategories,
      totalMatches: results.length
    };
  }

  // Find the root main category for a given category
  findRootMainCategory(category) {
    if (!category.parent_id && !category.parent) {
      return category.id;
    }

    // Find the category in our flat list and traverse up
    let current = category;
    let attempts = 0;
    const maxAttempts = 10; // Prevent infinite loops
    
    while ((current.parent_id || current.parent) && attempts < maxAttempts) {
      const parentId = current.parent_id || current.parent;
      const parent = this.allCategories.find(cat => cat.id === parentId);
      
      if (!parent) break;
      
      current = parent;
      attempts++;
    }
    
    return current.id;
  }

  // Get the path to a specific category
  getCategoryPath(targetCategory) {
    const path = [];
    let current = targetCategory;
    let attempts = 0;
    const maxAttempts = 10;
    
    // Build path from target to root
    while (current && attempts < maxAttempts) {
      path.unshift(current);
      
      if (!current.parent_id && !current.parent) break;
      
      const parentId = current.parent_id || current.parent;
      current = this.allCategories.find(cat => cat.id === parentId);
      attempts++;
    }
    
    return path;
  }

  // Get categories by main category ID
  getCategoriesByMainCategory(mainCategoryId) {
    return this.allCategories.filter(cat => {
      if (cat.id === mainCategoryId) return true;
      return this.findRootMainCategory(cat) === mainCategoryId;
    });
  }
}

// Create a singleton instance
const categorySearchService = new CategorySearchService();

export default categorySearchService; 