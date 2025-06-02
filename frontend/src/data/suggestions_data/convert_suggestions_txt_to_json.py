#!/usr/bin/env python3
import os
import json
import re

# Paths for the input and output files
TALK_DIR = "things_to_talk_about_suggestions"
DO_DIR = "things_to_do_suggestions"

def parse_talk_file(file_path):
    """Parse a talk suggestions text file into structured data."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Split the content into prompt/displayText pairs
    pairs = re.split(r'\n\n(?=prompt:)', content.strip())
    suggestions = []
    
    for i, pair in enumerate(pairs):
        lines = pair.strip().split('\n')
        
        # Handle different formats
        if lines[0].lower().startswith('prompt:'):
            # Skip the 'prompt:' line and get the actual prompt
            prompt_line = 1
            while prompt_line < len(lines) and not lines[prompt_line].strip().startswith('displayText:'):
                prompt_line += 1
            
            prompt = '\n'.join(lines[1:prompt_line]).strip()
            
            # Get the displayText
            display_text_line = prompt_line
            if display_text_line < len(lines) and lines[display_text_line].startswith('displayText:'):
                display_text = lines[display_text_line].replace('displayText:', '').strip().strip('"')
                
                # Create the suggestion object
                suggestion = {
                    "id": i + 1,  # Assign sequential IDs
                    "prompt": prompt,
                    "displayText": display_text,
                    "type": "talk"
                }
                
                # Check if this is a template (contains <INSERT CATEGORY>)
                suggestion["isTemplate"] = "<INSERT CATEGORY>" in prompt or "<INSERT CATEGORY>" in display_text
                
                suggestions.append(suggestion)
    
    return suggestions

def parse_do_file(file_path):
    """Parse a 'things to do' suggestions text file into structured data."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Split by double newlines to get prompt/displayText pairs
    pairs = content.strip().split('\n\n')
    suggestions = []
    
    for i, pair in enumerate(pairs):
        lines = pair.strip().split('\n')
        if len(lines) >= 2:
            prompt = lines[0].strip('"')
            display_text = lines[1].strip('"')
            
            suggestion = {
                "id": i + 1,  # Assign sequential IDs
                "prompt": prompt,
                "displayText": display_text,
                "isTemplate": False,  # These are not templates
                "type": "do"
            }
            suggestions.append(suggestion)
    
    return suggestions

def convert_talk_files():
    """Convert talk suggestion text files to JSON."""
    # Process the general file
    general_file = os.path.join(TALK_DIR, "No selected categories THINGS TO TALK ABOUT.txt")
    general_suggestions = parse_talk_file(general_file)
    
    # Process the template file
    template_file = os.path.join(TALK_DIR, "THINGS TO TALK ABOUT ~ PLUG IN CATEGORIES.txt")
    template_suggestions = parse_talk_file(template_file)
    
    # Create output JSON files
    general_output = os.path.join(TALK_DIR, "general_talk_suggestions.json")
    with open(general_output, 'w', encoding='utf-8') as f:
        json.dump(general_suggestions, f, indent=2)
    
    template_output = os.path.join(TALK_DIR, "template_talk_suggestions.json")
    with open(template_output, 'w', encoding='utf-8') as f:
        json.dump(template_suggestions, f, indent=2)
    
    print(f"Created {general_output} with {len(general_suggestions)} suggestions")
    print(f"Created {template_output} with {len(template_suggestions)} suggestions")

def convert_do_files():
    """Convert 'things to do' suggestion text files to JSON."""
    do_files = [f for f in os.listdir(DO_DIR) if f.endswith('.txt')]
    do_files.sort()  # Sort to process in order
    
    for file_name in do_files:
        file_path = os.path.join(DO_DIR, file_name)
        suggestions = parse_do_file(file_path)
        
        # Create JSON file with same base name
        base_name = os.path.splitext(file_name)[0]
        output_path = os.path.join(DO_DIR, f"{base_name}.json")
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(suggestions, f, indent=2)
        
        print(f"Created {output_path} with {len(suggestions)} suggestions")

def create_index_files():
    """Create index.js files to export all the JSON files."""
    # Create index.js for talk suggestions
    talk_index_path = os.path.join(TALK_DIR, "index.js")
    with open(talk_index_path, 'w', encoding='utf-8') as f:
        f.write("// This file exports all talk suggestion files for easy importing\n\n")
        f.write("import generalTalkSuggestions from './general_talk_suggestions.json';\n")
        f.write("import templateTalkSuggestions from './template_talk_suggestions.json';\n\n")
        f.write("export {\n")
        f.write("  generalTalkSuggestions,\n")
        f.write("  templateTalkSuggestions\n")
        f.write("};\n")
    
    # Create index.js for do suggestions
    do_files = [f for f in os.listdir(DO_DIR) if f.endswith('.json')]
    do_files.sort()
    
    do_index_path = os.path.join(DO_DIR, "index.js")
    with open(do_index_path, 'w', encoding='utf-8') as f:
        f.write("// This file exports all 'things to do' suggestion files for easy importing\n\n")
        
        # Import statements
        for file_name in do_files:
            base_name = os.path.splitext(file_name)[0]
            var_name = f"suggestion{base_name.split(')')[0].replace('.', '')}"
            f.write(f"import {var_name} from './{file_name}';\n")
        
        f.write("\nexport {\n")
        
        # Export statements
        for file_name in do_files:
            base_name = os.path.splitext(file_name)[0]
            var_name = f"suggestion{base_name.split(')')[0].replace('.', '')}"
            f.write(f"  {var_name},\n")
        
        f.write("};\n")
    
    # Create main index.js for all suggestions
    main_index_path = "index.js"
    with open(main_index_path, 'w', encoding='utf-8') as f:
        f.write("// This file exports all suggestion data for easy importing\n\n")
        f.write("import * as talkSuggestions from './things_to_talk_about_suggestions';\n")
        f.write("import * as doSuggestions from './things_to_do_suggestions';\n\n")
        f.write("export {\n")
        f.write("  talkSuggestions,\n")
        f.write("  doSuggestions\n")
        f.write("};\n")
        
    print(f"Created index files: {talk_index_path}, {do_index_path}, and {main_index_path}")

def main():
    print("Starting conversion of suggestion text files to JSON...")
    convert_talk_files()
    convert_do_files()
    create_index_files()
    print("Conversion complete!")

if __name__ == "__main__":
    main() 