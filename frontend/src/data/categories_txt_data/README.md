# Category Data Structure

This directory contains the JSON data structure for all life categories used in the application. The data was migrated from the backend database to static JSON files for easier maintenance and faster loading.

## Structure

- `mainCategories.json`: Contains all 16 main life categories with their IDs, names, icons, and references to their subcategory files
- `sub_categories/`: Directory containing all subcategory JSON files
  - `1_relationships.json`, `2_community.json`, etc.: Individual JSON files for each main category's subcategories
  - `index.js`: Helper file that exports all subcategory data for easy importing

## Format

Each subcategory JSON file follows this structure:

```json
{
  "id": 79,  // Main category ID (matches the ID in mainCategories.json)
  "name": "Relationships and Social Life",  // Main category name
  "icon": "👥",  // Main category icon emoji
  "subcategories": [  // Array of subcategories
    {
      "name": "Dating",  // Subcategory name
      "icon": "💘",  // Subcategory icon emoji
      "subcategories": [  // Nested subcategories (can be multiple levels deep)
        {
          "name": "First Dates",
          "icon": "🤝",
          "subcategories": []  // Empty array for leaf nodes
        },
        // ...more subcategories
      ]
    },
    // ...more subcategories
  ]
}
```

## Usage

The data is loaded and processed by utility functions in:

- `src/utils/categoryDataUtils.js`: Main utility functions for working with category data
- `src/services/categoryService.js`: Service that mimics the backend API for categories

To get main categories:

```javascript
import { getMainCategories } from '../utils/categoryDataUtils';

const mainCategories = getMainCategories();
```

To get subcategories for a main category:

```javascript
import { getSubcategories } from '../utils/categoryDataUtils';

const subcategories = await getSubcategories(mainCategoryId);
```

## Migration

The categories were migrated from the backend database to static JSON files using the `convert_txt_to_json.py` script, which converts indented text files to properly structured JSON hierarchies. 