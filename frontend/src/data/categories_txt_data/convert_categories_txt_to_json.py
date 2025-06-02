#!/usr/bin/env python3
import os
import re
import json

# Update source path to the new location
SOURCE_DIR = "frontend/src/data/subcategories_txt_file_data"
DEST_DIR = "frontend/src/data/sub_categories"

# Mapping from file name to ID and main category details
CATEGORY_MAPPING = {
    "1.)": {"id": 79, "name": "Relationships and Social Life", "icon": "👥", "output": "1_relationships.json"},
    "2.)": {"id": 80, "name": "Community Engagement and Civic Life", "icon": "🏛️", "output": "2_community.json"},
    "3.)": {"id": 81, "name": "Financial Understanding, Economics, and Politics", "icon": "💰", "output": "3_financial.json"},
    "4.)": {"id": 82, "name": "Career, Work, and Productivity", "icon": "💼", "output": "4_career.json"},
    "5.)": {"id": 83, "name": "Time, Habits, and Life Organization", "icon": "⏳", "output": "5_time.json"},
    "6.)": {"id": 84, "name": "Pets, Animals, and Nature Care", "icon": "🐾", "output": "6_pets.json"},
    "7.)": {"id": 85, "name": "Health, Wellness, and Mindfulness", "icon": "🧘‍♀️", "output": "7_health.json"},
    "8.)": {"id": 86, "name": "Sports, Exercise, and Physical Activities", "icon": "🏃‍♂️", "output": "8_sports.json"},
    "9.)": {"id": 87, "name": "Technology Balance and Innovation", "icon": "💻", "output": "9_technology.json"},
    "10.)": {"id": 88, "name": "Personal Growth, Education, and Learning", "icon": "📚", "output": "10_personal.json"},
    "11.)": {"id": 89, "name": "Spirituality, Religion, and Philosophy", "icon": "🧠", "output": "11_spirituality.json"},
    "12.)": {"id": 90, "name": "Recreation, Hobbies, Entertainment, and Games", "icon": "🎮", "output": "12_recreation.json"},
    "13.)": {"id": 91, "name": "Home and Environment Elevation", "icon": "🏠", "output": "13_home.json"},
    "14.)": {"id": 92, "name": "Travel, Nature, and Adventure", "icon": "🌍", "output": "14_travel.json"},
    "15.)": {"id": 93, "name": "Food, Cooking, and Nutrition", "icon": "🍳", "output": "15_food.json"},
    "16.)": {"id": 94, "name": "Art, Creativity, and Expression", "icon": "🎨", "output": "16_art.json"},
}

def parse_txt_line(line):
    """Parse a line of text into emoji and name components."""
    # Match the emoji at the beginning of the line and the remaining text
    match = re.match(r'^\s*([^\s]+)\s+(.+)$', line.strip())
    if match:
        emoji = match.group(1)
        name = match.group(2)
        return emoji, name
    return None, None

def build_category_tree(lines):
    """Convert indented text lines into a hierarchical category structure."""
    # Initialize the root list that will contain all top-level categories
    categories = []
    # Stack to keep track of the current path in the tree
    # Each element is (indent_level, category_dict) where category_dict contains
    # the category data (name, icon, subcategories)
    stack = [(-1, {"subcategories": categories})]  # Start with a dummy root

    for line in lines:
        if not line.strip():
            continue  # Skip empty lines

        # Calculate indentation level
        # We'll normalize by replacing 4 spaces with a tab character
        # for consistency across files
        normalized_line = line.replace("    ", "\t")
        indent_level = normalized_line.count('\t')

        # Parse the emoji and name from the line
        emoji, name = parse_txt_line(line.strip())
        if not emoji or not name:
            continue  # Skip lines that can't be parsed properly

        # Create the new category object
        new_category = {"name": name, "icon": emoji, "subcategories": []}

        # Find the appropriate parent in the stack
        while stack and indent_level <= stack[-1][0]:
            stack.pop()
        
        if not stack:
            # This should not happen with well-formed input, but just in case
            stack = [(-1, {"subcategories": categories})]

        # Add the new category to its parent's subcategories
        parent_level, parent = stack[-1]
        parent["subcategories"].append(new_category)
        
        # Add the new category to the stack
        stack.append((indent_level, new_category))

    return categories

def process_file(file_path):
    """Process a single text file and extract its category structure."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        return build_category_tree(lines)
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return []

def main():
    # Ensure the destination directory exists
    os.makedirs(DEST_DIR, exist_ok=True)
    
    # Check if source directory exists
    if not os.path.exists(SOURCE_DIR):
        print(f"Source directory {SOURCE_DIR} does not exist!")
        return
        
    print(f"Reading files from: {SOURCE_DIR}")
    print(f"Writing JSON to: {DEST_DIR}")
    
    # Process each file in the source directory
    for filename in os.listdir(SOURCE_DIR):
        # Find the category key matching this file
        category_key = None
        for key in CATEGORY_MAPPING:
            if filename.startswith(key):
                category_key = key
                break
        
        if not category_key:
            print(f"Skipping {filename} - no matching category found")
            continue
        
        # Get the full source file path
        source_path = os.path.join(SOURCE_DIR, filename)
        
        # Process the file to get the subcategories
        subcategories = process_file(source_path)
        
        # Create the output JSON structure
        category_info = CATEGORY_MAPPING[category_key]
        json_data = {
            "id": category_info["id"],
            "name": category_info["name"],
            "icon": category_info["icon"],
            "subcategories": subcategories
        }
        
        # Write the JSON to the destination file
        dest_path = os.path.join(DEST_DIR, category_info["output"])
        try:
            with open(dest_path, 'w', encoding='utf-8') as f:
                json.dump(json_data, f, ensure_ascii=False, indent=2)
            print(f"Successfully converted {filename} to {category_info['output']}")
        except Exception as e:
            print(f"Error writing {dest_path}: {e}")

if __name__ == "__main__":
    main() 