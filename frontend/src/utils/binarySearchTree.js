// Binary Search Tree implementation for category searching
class BSTNode {
  constructor(data) {
    this.data = data;
    this.left = null;
    this.right = null;
  }
}

class BinarySearchTree {
  constructor() {
    this.root = null;
  }

  // Insert a category into the BST
  insert(category) {
    const newNode = new BSTNode(category);
    
    if (!this.root) {
      this.root = newNode;
      return;
    }
    
    this.insertNode(this.root, newNode);
  }
  
  insertNode(node, newNode) {
    // Compare by category name (case-insensitive)
    const comparison = newNode.data.name.toLowerCase().localeCompare(node.data.name.toLowerCase());
    
    if (comparison < 0) {
      if (node.left === null) {
        node.left = newNode;
      } else {
        this.insertNode(node.left, newNode);
      }
    } else {
      if (node.right === null) {
        node.right = newNode;
      } else {
        this.insertNode(node.right, newNode);
      }
    }
  }

  // Search for categories containing the search term
  search(searchTerm) {
    if (!searchTerm || !this.root) return [];
    
    const results = [];
    const term = searchTerm.toLowerCase().trim();
    
    this.searchNode(this.root, term, results);
    
    // Sort results by relevance (exact matches first, then partial matches)
    return results.sort((a, b) => {
      const aExact = a.name.toLowerCase() === term;
      const bExact = b.name.toLowerCase() === term;
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // If both are exact or both are partial, sort alphabetically
      return a.name.localeCompare(b.name);
    });
  }
  
  searchNode(node, searchTerm, results) {
    if (!node) return;
    
    // Check if current node matches
    if (node.data.name.toLowerCase().includes(searchTerm)) {
      results.push(node.data);
    }
    
    // Search both subtrees since we're doing partial matching
    this.searchNode(node.left, searchTerm, results);
    this.searchNode(node.right, searchTerm, results);
  }

  // Build BST from categories array
  buildFromCategories(categories) {
    this.root = null; // Reset the tree
    
    if (!categories || !Array.isArray(categories)) return;
    
    categories.forEach(category => {
      if (category && category.name) {
        this.insert(category);
      }
    });
  }

  // Get all categories in sorted order (in-order traversal)
  getAllSorted() {
    const result = [];
    this.inOrderTraversal(this.root, result);
    return result;
  }
  
  inOrderTraversal(node, result) {
    if (node) {
      this.inOrderTraversal(node.left, result);
      result.push(node.data);
      this.inOrderTraversal(node.right, result);
    }
  }
}

export default BinarySearchTree; 