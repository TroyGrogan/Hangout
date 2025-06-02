// Remove or comment out existing imports for mainCategoriesData, categoryFileMap, etc. if they are not used by the simplified functions below.
// Keep talkSuggestions and doSuggestions imports if the top-level objects are still referenced, even if their content isn't deeply used yet.
// For a true clean slate, we could even remove those and hardcode everything, but let's start by simplifying the functions.

// Original imports - comment out what's not strictly needed by the simplified versions below
// import { talkSuggestions, doSuggestions } from '../data/suggestions_data'; // This was incorrect, talkSuggestions doesn't exist at this path in this way
import mainCategoriesData from '../data/mainCategories.json';
import { HARDCODED_MAIN_CATEGORIES } from './categoryUtils.js';
// import { categoryFileMap } from '../data/sub_categories'; // Not directly used now, mainCategoriesData has fileNames

// Import the specific talk suggestion JSON files
import generalTalkSuggestionsData from '../data/suggestions_data/things_to_talk_about_suggestions/general_talk_suggestions.json';
import templateTalkSuggestionsData from '../data/suggestions_data/things_to_talk_about_suggestions/template_talk_suggestions.json';

const TOTAL_SUGGESTIONS = 6;
const SUB_CATEGORY_PATH_PREFIX = '../data/sub_categories/';

// --- Glob Imports for Dynamic Data Loading ---
// For "Things to Talk About" template insertions (uses sub-categories)
const subCategoryModules = import.meta.glob('../data/sub_categories/*.json');
// For "Things to Do" suggestions (uses new dedicated JSON files)
const thingsToDoModules = import.meta.glob('../data/suggestions_data/things_to_do_suggestions/*.json');

// --- Caching ---
const suggestionsCache = new Map(); // Generic cache for loaded JSON file contents (keyed by full path)
let allCategoryInsertionsPool = null; // Cache for "icon name" pairs from main and sub_categories for talk templates
let allThingsToDoPool = null; // Cache for all suggestions from all "*.) THINGS TO DO.json" files.

// --- Helper Functions ---
function shuffleArray(array) {
  if (!Array.isArray(array)) return [];
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// New helper function to select unique items
function selectUnique(items, count, getId = item => item.id) {
  if (!Array.isArray(items) || items.length === 0) return [];
  
  const shuffled = shuffleArray([...items]);
  const selectedItems = [];
  const seenIds = new Set();

  for (const item of shuffled) {
    if (selectedItems.length >= count) break;
    const itemId = getId(item);
    if (!seenIds.has(itemId)) {
      selectedItems.push(item);
      seenIds.add(itemId);
    }
  }
  // If not enough unique items, pad with placeholders (or decide on other strategy)
  while (selectedItems.length < count && selectedItems.length < items.length) {
      // This padding might not be ideal if we strictly want only original items
      // For now, it ensures 'count' items if possible from unique source items.
      // This loop might not be reached if 'items' itself had fewer unique items than 'count'.
      // Consider if we should pad with generic placeholders if source is exhausted.
      const remainingItems = items.filter(item => !seenIds.has(getId(item)));
      if (remainingItems.length > 0) {
          const nextItem = remainingItems[0]; // just take the first available unique one
          selectedItems.push(nextItem);
          seenIds.add(getId(nextItem));
      } else {
          break; // No more unique items to add
      }
  }
  return selectedItems;
}

// Helper to extract "name" and "icon" from nested sub_category JSONs
function extractActivities(data, sourceFile) {
  console.log(`[extractActivities] ENTRY - sourceFile: ${sourceFile}, data type: ${typeof data}, has name: ${data && data.name ? 'YES' : 'NO'}`);
  let activities = [];
  
  // Extract the current level's data if it has name and icon
  if (data && typeof data.name === 'string') {
    if (data.icon) {
      console.log("[extractActivities] Processing data.name:", data.name, "data.icon:", data.icon, "from file:", sourceFile);
      activities.push({
        name: data.name.trim(),
        icon: data.icon,
        sourceFile
      });
    } else {
      console.log("[extractActivities] Skipping item without icon:", data.name, "from file:", sourceFile);
    }
  }
  
  // Recursively extract from subcategories
  if (data && Array.isArray(data.subcategories) && data.subcategories.length > 0) {
    console.log(`[extractActivities] Processing ${data.subcategories.length} subcategories from ${sourceFile}`);
    for (const subcat of data.subcategories) {
      const subActivities = extractActivities(subcat, sourceFile);
      activities = activities.concat(subActivities);
      console.log(`[extractActivities] Added ${subActivities.length} activities from subcategory: ${subcat.name || 'unnamed'}`);
    }
  } else {
    console.log(`[extractActivities] No subcategories found for ${data && data.name ? data.name : 'unnamed item'} in ${sourceFile}`);
  }
  
  console.log(`[extractActivities] Total activities extracted at this level: ${activities.length} for ${data && data.name ? data.name : 'unnamed item'}`);
  return activities;
}

// Helper to load a single sub-category JSON
async function loadSubCategoryFile(fileNameOnly) {
  const fullPath = `../data/sub_categories/${fileNameOnly}`;
  if (suggestionsCache.has(fullPath)) {
    return suggestionsCache.get(fullPath);
  }
  try {
    const moduleLoader = subCategoryModules[fullPath];
    if (!moduleLoader) {
      console.error(`No module loader found for ${fullPath} in subCategoryModules.`);
      return null;
    }
    const module = await moduleLoader();
    const data = module.default;
    suggestionsCache.set(fullPath, data);
    return data;
  } catch (error) {
    console.error(`Error loading sub-category file ${fileNameOnly}:`, error);
    return null;
  }
}

// Helper to load a single "Things to Do" JSON file
async function loadThingsToDoFile(fileName) {
  const fullPath = `../data/suggestions_data/things_to_do_suggestions/${fileName}`;
  console.log(`[loadThingsToDoFile] Attempting to load: ${fullPath}`);
  console.log("[loadThingsToDoFile] Available keys in thingsToDoModules:", Object.keys(thingsToDoModules));
  
  if (suggestionsCache.has(fullPath)) {
    console.log(`[loadThingsToDoFile] Returning cached data for ${fullPath}`);
    return suggestionsCache.get(fullPath);
  }
  try {
    const moduleLoader = thingsToDoModules[fullPath];
    if (!moduleLoader) {
      console.error(`[loadThingsToDoFile] No module loader found for key: ${fullPath}. Check glob pattern and file path construction.`);
      return null;
    }
    console.log(`[loadThingsToDoFile] Module loader found for ${fullPath}. Loading...`);
    const module = await moduleLoader();
    const data = module.default;
    console.log(`[loadThingsToDoFile] Successfully loaded data for ${fullPath}:`, data ? `Array with ${data.length} items` : "null/undefined");
    suggestionsCache.set(fullPath, data);
    return data;
  } catch (error) {
    console.error(`[loadThingsToDoFile] Error loading file ${fileName} (path: ${fullPath}):`, error);
    return null;
  }
}

// Helper to load all category insertions for talk templates (when NO category is selected)
async function getAllCategoryInsertions() {
  if (allCategoryInsertionsPool) return allCategoryInsertionsPool;
  let insertions = [];
  if (Array.isArray(mainCategoriesData)) {
    mainCategoriesData.forEach(category => {
      if (category.name && category.icon) {
        insertions.push({ name: category.name.split(' ').slice(1).join(' ').trim(), icon: category.icon });
      }
    });
  }
  const subCategoryFileNames = Object.keys(subCategoryModules).map(path => path.substring(path.lastIndexOf('/') + 1));
  for (const fileNameOnly of subCategoryFileNames) {
    const moduleData = await loadSubCategoryFile(fileNameOnly);
    if (moduleData) {
      const activitiesFromFile = extractActivities(moduleData, fileNameOnly);
      activitiesFromFile.forEach(activity => {
        if (activity.name && activity.icon) {
          insertions.push({ name: activity.name.trim(), icon: activity.icon });
        }
      });
    }
  }
  const uniqueInsertionsMap = new Map();
  insertions.forEach(item => {
      if(item.name && item.icon) { 
        uniqueInsertionsMap.set(`${item.icon}-${item.name}`, item);
      }
  });
  let uniqueInsertions = Array.from(uniqueInsertionsMap.values());

  if (uniqueInsertions.length === 0) {
    uniqueInsertions.push({ name: "interesting topics", icon: "✨" }); 
  }
  allCategoryInsertionsPool = uniqueInsertions;
  return allCategoryInsertionsPool;
}

// NEW Helper to get category insertions for a SPECIFIC category only
async function getSpecificCategoryInsertions(categoryNameFromUI) {
  console.log(`[getSpecificCategoryInsertions] Getting insertions for category: ${categoryNameFromUI}`);
  
  // Find the specific category info from HARDCODED_MAIN_CATEGORIES
  // The categoryNameFromUI should match the "textName" field from HARDCODED_MAIN_CATEGORIES
  const categoryInfo = HARDCODED_MAIN_CATEGORIES.find(cat => {
    return cat.textName.trim() === categoryNameFromUI.trim();
  });

  if (!categoryInfo) {
    console.warn(`[getSpecificCategoryInsertions] Category not found: ${categoryNameFromUI}`);
    console.log(`[getSpecificCategoryInsertions] Available textNames:`, HARDCODED_MAIN_CATEGORIES.map(cat => cat.textName));
    return [];
  }

  console.log(`[getSpecificCategoryInsertions] Found categoryInfo:`, categoryInfo);
  
  let insertions = [];
  
  // Add the main category itself as an insertion option
  // Use the textName (what user sees) and its icon
  insertions.push({ 
    name: categoryInfo.textName.trim(), 
    icon: categoryInfo.icon 
  });

  // Find the corresponding entry in mainCategoriesData to get the fileName
  const mainCategoryData = mainCategoriesData.find(cat => cat.id === categoryInfo.id);
  if (!mainCategoryData) {
    console.warn(`[getSpecificCategoryInsertions] Could not find mainCategoryData for ID: ${categoryInfo.id}`);
    return insertions; // Return just the main category
  }

  // Load the specific sub-category file for this category
  const fileNameNumberMatch = mainCategoryData.fileName.match(/(\d+)_/);
  if (fileNameNumberMatch && fileNameNumberMatch[1]) {
    const fileNumber = fileNameNumberMatch[1];
    // Extract the actual filename from the full path
    // mainCategoryData.fileName is like "sub_categories/1_relationships.json"
    // We want just "1_relationships.json"
    const fullFileName = mainCategoryData.fileName.split('/').pop(); // Gets "1_relationships.json"
    
    console.log(`[getSpecificCategoryInsertions] Loading sub-category file: ${fullFileName}`);
    
    const moduleData = await loadSubCategoryFile(fullFileName);
    console.log(`[getSpecificCategoryInsertions] moduleData loaded:`, moduleData ? 'SUCCESS' : 'FAILED');
    console.log(`[getSpecificCategoryInsertions] moduleData type:`, typeof moduleData);
    console.log(`[getSpecificCategoryInsertions] moduleData keys:`, moduleData ? Object.keys(moduleData) : 'N/A');
    
    if (moduleData) {
      console.log(`[getSpecificCategoryInsertions] Raw moduleData structure:`, {
        id: moduleData.id,
        name: moduleData.name,
        icon: moduleData.icon,
        subcategoriesCount: moduleData.subcategories ? moduleData.subcategories.length : 0,
        firstSubcategory: moduleData.subcategories && moduleData.subcategories[0] ? {
          name: moduleData.subcategories[0].name,
          icon: moduleData.subcategories[0].icon,
          hasSubcategories: moduleData.subcategories[0].subcategories ? moduleData.subcategories[0].subcategories.length : 0
        } : null,
        secondSubcategory: moduleData.subcategories && moduleData.subcategories[1] ? {
          name: moduleData.subcategories[1].name,
          icon: moduleData.subcategories[1].icon,
          hasSubcategories: moduleData.subcategories[1].subcategories ? moduleData.subcategories[1].subcategories.length : 0
        } : null
      });
      
      const activitiesFromFile = extractActivities(moduleData, fullFileName);
      console.log(`[getSpecificCategoryInsertions] All extracted activities:`, activitiesFromFile);
      
      activitiesFromFile.forEach(activity => {
        if (activity.name && activity.icon) {
          insertions.push({ name: activity.name.trim(), icon: activity.icon });
        }
      });
      console.log(`[getSpecificCategoryInsertions] Extracted ${activitiesFromFile.length} activities from sub-category file`);
      console.log(`[getSpecificCategoryInsertions] Total insertions after adding subcategories:`, insertions.length);
    } else {
      console.warn(`[getSpecificCategoryInsertions] Could not load sub-category file: ${fullFileName}`);
    }
  }

  // Remove duplicates
  const uniqueInsertionsMap = new Map();
  insertions.forEach(item => {
    if (item.name && item.icon) {
      uniqueInsertionsMap.set(`${item.icon}-${item.name}`, item);
    }
  });
  
  const uniqueInsertions = Array.from(uniqueInsertionsMap.values());
  console.log(`[getSpecificCategoryInsertions] Returning ${uniqueInsertions.length} unique insertions for category: ${categoryNameFromUI}`);
  console.log(`[getSpecificCategoryInsertions] Sample insertions:`, uniqueInsertions.slice(0, 3));
  console.log(`[getSpecificCategoryInsertions] ALL insertions:`, uniqueInsertions);
  
  return uniqueInsertions;
}

// NEW Helper to load ALL "Things to Do" suggestions from all files
async function getAllThingsToDoSuggestions() {
  if (allThingsToDoPool) {
    // console.log("[getAllThingsToDoSuggestions] Returning cached pool");
    return allThingsToDoPool;
  }
  // console.log("[getAllThingsToDoSuggestions] Building new pool...");
  let comprehensivePool = [];
  const allDoFilePaths = Object.keys(thingsToDoModules);
  const timestamp = Date.now();

  for (const filePath of allDoFilePaths) {
    const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
    let itemCategoryIcon = '🎯'; // Default icon for this item

    const fileNumberMatch = fileName.match(/^(\d+)\.\)/);
    if (fileNumberMatch && fileNumberMatch[1]) {
      const mainCatMatch = mainCategoriesData.find(cat => cat.fileName.startsWith(`sub_categories/${fileNumberMatch[1]}_`));
      if (mainCatMatch && mainCatMatch.icon) {
        itemCategoryIcon = mainCatMatch.icon;
      }
    }

    const suggestionsFromFile = await loadThingsToDoFile(fileName);
    if (Array.isArray(suggestionsFromFile)) {
      suggestionsFromFile.forEach((item, index) => {
        comprehensivePool.push({
          id: `do-${fileName.replace(/[^a-zA-Z0-9]/g, '-')}-${item.id || index}-${timestamp}`,
          prompt: item.prompt.trim(), // Raw prompt, no icon here
          displayText: item.displayText || item.prompt, // Raw display text, icon will be added later for display
          type: 'do',
          icon: itemCategoryIcon, // Store the specific icon for this item
          sourceFile: fileName // For debugging or potential future use
        });
      });
    }
  }

  if (comprehensivePool.length === 0) {
    console.warn("[getAllThingsToDoSuggestions] No 'Do' suggestions found in any file. Returning emergency placeholder.");
    // Return a single placeholder if absolutely nothing is found.
    // getRandomDoSuggestions will handle padding if this list is used and is too short.
    allThingsToDoPool = [{
        id: `placeholder-do-emergency-${timestamp}`,
        prompt: "Try something new today!",
        displayText: "Try something new today!",
        type: 'do',
        icon: '✨'
    }];
    return allThingsToDoPool;
  }
  
  allThingsToDoPool = comprehensivePool;
  // console.log(`[getAllThingsToDoSuggestions] Pool created with ${allThingsToDoPool.length} items.`);
  return allThingsToDoPool;
}

// --- Main Suggestion Functions ---

export const getRandomTalkSuggestions = async (count = TOTAL_SUGGESTIONS, categoryNameFromUI = null) => {
  console.log(`[getRandomTalkSuggestions] count: ${count}, categoryFromUI: ${categoryNameFromUI}`);
  let processedSuggestions = [];
  const timestamp = Date.now();

  if (categoryNameFromUI) {
    // CATEGORY-SPECIFIC MODE: Only use template suggestions with specific category insertions
    console.log(`[getRandomTalkSuggestions] CATEGORY-SPECIFIC MODE for: ${categoryNameFromUI}`);
    
    // Get insertions only from the selected category and its subcategories
    const specificCategoryInsertions = await getSpecificCategoryInsertions(categoryNameFromUI);
    
    if (specificCategoryInsertions.length === 0) {
      console.warn(`[getRandomTalkSuggestions] No insertions found for category: ${categoryNameFromUI}`);
      // Return fallback suggestions for this category
      return Array(count).fill(null).map((_, i) => ({
        id: `placeholder-talk-category-${i}-${timestamp}`,
        prompt: `Let's discuss something about ${categoryNameFromUI}.`,
        displayText: `💬 Let's discuss something about ${categoryNameFromUI}`,
        type: 'talk',
        isGeneralTalk: false,
        icon: '💬'
      }));
    }

    // Process ONLY template talk suggestions for the specific category
    if (Array.isArray(templateTalkSuggestionsData)) {
      // Create multiple variations by using different templates and insertions
      const templatesNeeded = Math.min(count, templateTalkSuggestionsData.length);
      const shuffledTemplates = shuffleArray([...templateTalkSuggestionsData]);
      
      console.log(`[getRandomTalkSuggestions] Available insertions for category:`, specificCategoryInsertions);
      
      // Shuffle insertions to ensure variety
      const shuffledInsertions = shuffleArray([...specificCategoryInsertions]);
      let insertionIndex = 0;
      
      for (let i = 0; i < templatesNeeded; i++) {
        const template = shuffledTemplates[i % shuffledTemplates.length];
        
        // For each template, create multiple variations if we need more suggestions
        const variationsPerTemplate = Math.ceil(count / templatesNeeded);
        
        for (let j = 0; j < variationsPerTemplate && processedSuggestions.length < count; j++) {
          // Use different insertions for variety instead of completely random
          const selectedInsertion = shuffledInsertions[insertionIndex % shuffledInsertions.length];
          insertionIndex++;
          
          console.log(`[getRandomTalkSuggestions] Selected insertion:`, selectedInsertion);
          
          const replacementTextWithEmoji = `${selectedInsertion.icon} ${selectedInsertion.name.trim()}`;
          
          // Fill in the template with the category-specific insertion
          let filledPrompt = template.prompt.replace(/<INSERT CATEGORY>/g, replacementTextWithEmoji);
          let filledDisplayText = template.displayText.replace(/<INSERT CATEGORY>/g, replacementTextWithEmoji);
          
          processedSuggestions.push({
            id: `template-talk-cat-${template.id || i}-${selectedInsertion.name.replace(/\s+/g, '-')}-${j}-${timestamp}`,
            prompt: filledPrompt.trim(),
            displayText: filledDisplayText.trim(),
            type: 'talk',
            isGeneralTalk: false,
            icon: selectedInsertion.icon,
            categorySpecific: true
          });
        }
      }
    }
    
  } else {
    // NO CATEGORY SELECTED MODE: Use both general and template suggestions
    console.log(`[getRandomTalkSuggestions] NO CATEGORY MODE - using general + template suggestions with PURE RANDOMNESS`);
    
    // Create one large pool of ALL possible suggestions (general + template)
    let allPossibleSuggestions = [];
    
    // Add UP TO 2 randomly selected general talk suggestions to the pool
    if (Array.isArray(generalTalkSuggestionsData)) {
      // Randomly select up to 2 general suggestions
      const maxGeneralSuggestions = 2;
      const selectedGeneralSuggestions = selectUnique(
        generalTalkSuggestionsData, 
        Math.min(maxGeneralSuggestions, generalTalkSuggestionsData.length),
        item => item.id
      );
      
      selectedGeneralSuggestions.forEach((item, index) => {
        allPossibleSuggestions.push({
          id: `general-talk-${item.id || index}-${timestamp}`,
          prompt: item.prompt.trim(), // Emoji NOT included in prompt
          displayText: `💬 ${item.displayText || item.prompt}`.trim(), // Emoji IS included in displayText
          type: 'talk',
          isGeneralTalk: true, // Flag for potential specific handling
          icon: '💬' // Store the icon used for display
        });
      });
      console.log(`[getRandomTalkSuggestions] Added ${selectedGeneralSuggestions.length} general suggestions to pool (max ${maxGeneralSuggestions})`);
    }

    // Add ALL template talk suggestions with random insertions to the pool
    if (Array.isArray(templateTalkSuggestionsData)) {
      const categoryInsertions = await getAllCategoryInsertions();
      if (categoryInsertions.length > 0) {
        templateTalkSuggestionsData.forEach((template, index) => {
          const randomInsertion = categoryInsertions[Math.floor(Math.random() * categoryInsertions.length)];
          const replacementTextWithEmoji = `${randomInsertion.icon} ${randomInsertion.name.trim()}`;
          
          // The prompt for template should include the emoji from the category item
          let filledPrompt = template.prompt.replace(/<INSERT CATEGORY>/g, replacementTextWithEmoji);
          // The displayText also includes the emoji
          let filledDisplayText = template.displayText.replace(/<INSERT CATEGORY>/g, replacementTextWithEmoji);
          
          allPossibleSuggestions.push({
            id: `template-talk-${template.id || index}-${randomInsertion.name.replace(/\s+/g, '-')}-${timestamp}`,
            prompt: filledPrompt.trim(), // Emoji IS included in prompt for templates
            displayText: filledDisplayText.trim(), // Emoji IS included in displayText
            type: 'talk',
            isGeneralTalk: false,
            icon: randomInsertion.icon // Store the icon used for display and prompt
          });
        });
        console.log(`[getRandomTalkSuggestions] Added ${templateTalkSuggestionsData.length} template suggestions to pool`);
      } else {
        // Fallback if no category insertions available
        templateTalkSuggestionsData.forEach((template, index) => {
          const fallbackText = "a cool topic ✨";
          allPossibleSuggestions.push({
            id: `template-talk-fallback-${template.id || index}-${timestamp}`,
            prompt: template.prompt.replace(/<INSERT CATEGORY>/g, fallbackText).trim(),
            displayText: template.displayText.replace(/<INSERT CATEGORY>/g, fallbackText).trim(),
            type: 'talk',
            isGeneralTalk: false,
            icon: "✨"
          });
        });
        console.log(`[getRandomTalkSuggestions] Added ${templateTalkSuggestionsData.length} fallback template suggestions to pool`);
      }
    }
    
    console.log(`[getRandomTalkSuggestions] Total pool size: ${allPossibleSuggestions.length} suggestions (up to 2 general + ${templateTalkSuggestionsData?.length || 0} template)`);
    
    // Now randomly select from the entire pool using selectUnique for true randomness
    processedSuggestions = selectUnique(allPossibleSuggestions, count, item => item.id);
    console.log(`[getRandomTalkSuggestions] Randomly selected ${processedSuggestions.length} suggestions from total pool`);
    
    // Log the distribution for debugging
    const generalCount = processedSuggestions.filter(s => s.isGeneralTalk).length;
    const templateCount = processedSuggestions.filter(s => !s.isGeneralTalk).length;
    console.log(`[getRandomTalkSuggestions] Random distribution: ${generalCount} general + ${templateCount} template = ${processedSuggestions.length} total`);
  }
  
  if (processedSuggestions.length === 0) {
    console.warn("[getRandomTalkSuggestions] No suggestions processed. Returning placeholders.");
    return Array(count).fill(null).map((_, i) => ({
      id: `placeholder-talk-${i}-${timestamp}`,
      prompt: "Let's discuss something intriguing.",
      displayText: "💬 Let's discuss something intriguing.",
      type: 'talk',
      isGeneralTalk: true,
      icon: '💬'
    }));
  }
  
  // For category-specific mode, we still use selectUnique for final randomization
  // For no-category mode, we already randomly selected from the pool
  console.log(`[getRandomTalkSuggestions] Processed ${processedSuggestions.length} suggestions`);
  
  if (categoryNameFromUI) {
    // Category-specific: use selectUnique for final randomization
    const uniqueSuggestions = selectUnique(processedSuggestions, count, item => item.id);
    console.log(`[getRandomTalkSuggestions] Category mode - Final unique suggestions: ${uniqueSuggestions.length}`);
    return uniqueSuggestions;
  } else {
    // No-category mode: we already randomly selected from the pool, just return them
    console.log(`[getRandomTalkSuggestions] No-category mode - Returning randomly selected suggestions: ${processedSuggestions.length}`);
    return processedSuggestions.slice(0, count); // Ensure we don't exceed count
  }
};

export const getRandomDoSuggestions = async (count = TOTAL_SUGGESTIONS, categoryNameFromUI = null) => {
  let suggestionsToProcess = [];
  let specificCategoryIcon = '🎯';
  console.log(`[getRandomDoSuggestions] START - categoryNameFromUI: ${categoryNameFromUI}, count: ${count}`);

  if (categoryNameFromUI) {
    console.log(`[getRandomDoSuggestions] SPECIFIC CATEGORY MODE for: '${categoryNameFromUI}'`);
    
    const categoryInfo = mainCategoriesData.find(cat => {
      // cat.name is like "💰 Financial Understanding...", cat.icon is like "💰"
      // categoryNameFromUI is the pure text part like "Financial Understanding..."
      let textualNameFromCat = cat.name; // Default to full name
      if (cat.icon && cat.name.startsWith(cat.icon)) {
        // If icon is present and name starts with it, extract the text part
        textualNameFromCat = cat.name.substring(cat.icon.length).trimStart();
      }
      // Fallback for names that might not start with their defined icon but have a leading emoji
      // This is less likely if mainCategories.json is consistent, but adds robustness.
      else if (cat.name.match(/^\p{Emoji}/u)) {
        const nameParts = cat.name.split(' ');
        if (nameParts.length > 1) {
            textualNameFromCat = nameParts.slice(1).join(' ');
        }
      }
      return textualNameFromCat.trim() === categoryNameFromUI.trim();
    });
    console.log('[getRandomDoSuggestions] categoryInfo found:', categoryInfo);

    if (categoryInfo) {
      console.log(`[getRandomDoSuggestions] Found categoryInfo for '${categoryNameFromUI}':`, JSON.stringify(categoryInfo));
      specificCategoryIcon = categoryInfo.icon || '🎯';
      const fileNameNumberMatch = categoryInfo.fileName.match(/(\d+)_/);
      console.log('[getRandomDoSuggestions] fileNameNumberMatch result:', fileNameNumberMatch);

      if (fileNameNumberMatch && fileNameNumberMatch[1]) {
        const fileNumber = fileNameNumberMatch[1];
        console.log(`[getRandomDoSuggestions] Extracted fileNumber: ${fileNumber}`);
        
        let actualModuleKey = null;
        const expectedFilePrefix = `${fileNumber}.)`; // e.g., "3.)"

        for (const key of Object.keys(thingsToDoModules)) {
            const keyFileName = key.substring(key.lastIndexOf('/') + 1);
            if (keyFileName.startsWith(expectedFilePrefix)) {
                actualModuleKey = key;
                break;
            }
        }

        if (actualModuleKey) {
            console.log(`[getRandomDoSuggestions] Found actual module key: ${actualModuleKey} for file number prefix: ${expectedFilePrefix}`);
            const actualFileNameForLoader = actualModuleKey.substring(actualModuleKey.lastIndexOf('/') + 1);
            const specificDoData = await loadThingsToDoFile(actualFileNameForLoader);
            
            console.log(`[getRandomDoSuggestions] Loaded specificDoData using actual file name ${actualFileNameForLoader}:`, specificDoData ? `Array with ${specificDoData.length} items` : "null/undefined/empty");

            if (Array.isArray(specificDoData) && specificDoData.length > 0) {
              let itemsToMap = [];
              if (specificDoData.length > count) {
                // If more items than needed, shuffle and take 'count'
                itemsToMap = shuffleArray([...specificDoData]).slice(0, count);
                console.log(`[getRandomDoSuggestions] Shuffled and sliced to ${count} items from ${specificDoData.length} available.`);
              } else {
                // If fewer or equal items than needed, use all of them
                itemsToMap = [...specificDoData]; // Use a copy
                console.log(`[getRandomDoSuggestions] Using all ${specificDoData.length} available items (less than or equal to count of ${count}).`);
              }

              suggestionsToProcess = itemsToMap.map((item, index) => ({
                ...item, 
                id: `do-cat-${fileNumber}-${item.id || 'gen'}-${index}-${Date.now()}`, // Simplified ID generation
                icon: specificCategoryIcon, 
                type: 'do',
                sourceFile: actualFileNameForLoader 
              }));
              // NEW DETAILED LOG IMMEDIATELY AFTER MAP
              console.log(`[getRandomDoSuggestions] IMMEDIATELY AFTER MAP: suggestionsToProcess.length: ${suggestionsToProcess ? suggestionsToProcess.length : 'N/A'}, IsArray: ${Array.isArray(suggestionsToProcess)}, First item: ${suggestionsToProcess && suggestionsToProcess.length > 0 ? JSON.stringify(suggestionsToProcess[0]) : 'N/A'}`);
              console.log(`[getRandomDoSuggestions] Processed ${suggestionsToProcess.length} suggestions for specific category.`);
            } else {
              console.warn(`[getRandomDoSuggestions] No data or empty array from specific file (key: ${actualModuleKey}). suggestionsToProcess will be empty.`);
              suggestionsToProcess = []; 
            }
        } else {
            console.warn(`[getRandomDoSuggestions] No 'Do' file found in thingsToDoModules starting with prefix: ${expectedFilePrefix}. Available keys:`, Object.keys(thingsToDoModules));
            suggestionsToProcess = [];
        }
      } else {
        console.warn(`[getRandomDoSuggestions] Could not extract file number for category: ${categoryNameFromUI}. suggestionsToProcess will be empty.`);
        suggestionsToProcess = []; 
      }
    } else {
      console.warn(`[getRandomDoSuggestions] Category info not found for UI name: ${categoryNameFromUI}. suggestionsToProcess will be empty.`);
      suggestionsToProcess = []; 
    }

  } else {
    // --- GLOBAL POOL MODE --- 
    console.log("[getRandomDoSuggestions] GLOBAL POOL MODE");
    const allDoItemsFromMasterPool = await getAllThingsToDoSuggestions();
    let prioritizedSuggestions = [];
    if (allDoItemsFromMasterPool && allDoItemsFromMasterPool.length > 0) {
      const shuffledMasterPool = shuffleArray([...allDoItemsFromMasterPool]);
      const categoryDiverseSelection = [];
      const usedCategoryPrefixes = new Set();
      for (const item of shuffledMasterPool) {
        const prefixMatch = item.sourceFile ? item.sourceFile.match(/^(\d+)\.\)/) : null;
        const categoryPrefix = prefixMatch ? prefixMatch[1] : null;
        if (categoryPrefix && !usedCategoryPrefixes.has(categoryPrefix)) {
          categoryDiverseSelection.push(item);
          usedCategoryPrefixes.add(categoryPrefix);
        }
      }
      prioritizedSuggestions = selectUnique(categoryDiverseSelection, count, item => item.id || item.prompt);
      if (prioritizedSuggestions.length < count) {
        const remainingNeeded = count - prioritizedSuggestions.length;
        const alreadySelectedIds = new Set(prioritizedSuggestions.map(s => s.id || s.prompt));
        const remainingPoolItems = allDoItemsFromMasterPool.filter(item => 
            !alreadySelectedIds.has(item.id || item.prompt)
        );
        const additionalItems = selectUnique(remainingPoolItems, remainingNeeded, item => item.id || item.prompt);
        prioritizedSuggestions.push(...additionalItems);
      }
    }
    suggestionsToProcess = prioritizedSuggestions; 
  }

  // ADDED DIAGNOSTIC LOG
  console.log('[getRandomDoSuggestions] Checkpoint. suggestionsToProcess content overview. Length:', 
              suggestionsToProcess ? suggestionsToProcess.length : 'N/A', 
              'IsArray:', Array.isArray(suggestionsToProcess),
              'First item if exists:', suggestionsToProcess && suggestionsToProcess.length > 0 ? JSON.stringify(suggestionsToProcess[0]) : 'N/A');

  if (!suggestionsToProcess || suggestionsToProcess.length === 0) {
    console.warn(`[getRandomDoSuggestions] FINAL: No suggestions available (suggestionsToProcess length is ${suggestionsToProcess ? suggestionsToProcess.length : 'N/A'}). Returning empty array.`);
    return [];
  }

  const finalSuggestions = suggestionsToProcess.map(item => ({
    id: item.id,
    prompt: item.prompt.trim(), 
    displayText: `${item.icon} ${item.displayText || item.prompt}`.trim(), 
    type: 'do',
    icon: item.icon 
  }));
  
  console.log(`[getRandomDoSuggestions] FINAL: Returning ${finalSuggestions.length} suggestions. First item:`, finalSuggestions[0]);
  return finalSuggestions.slice(0, count); 
};

export const getMixedSuggestions = async (totalCount = TOTAL_SUGGESTIONS, categoryNameFromUI = null) => {
  // console.log(`[getMixedSuggestions] totalCount: ${totalCount}, category: ${categoryNameFromUI}`);
  
  // Ensure an even split for the default case of 6 suggestions
  const talkCount = Math.floor(totalCount / 2);
  const doCount = totalCount - talkCount;

  // Fetch exactly the required number of unique suggestions for each type
  const talkItems = await getRandomTalkSuggestions(talkCount, categoryNameFromUI); 
  const doItems = await getRandomDoSuggestions(doCount, categoryNameFromUI);

  // console.log("[getMixedSuggestions] Fetched talkItems:", JSON.stringify(talkItems, null, 2));
  // console.log("[getMixedSuggestions] Fetched doItems:", JSON.stringify(doItems, null, 2));

  const combinedSuggestions = [...talkItems, ...doItems];
  
  // Shuffle the combined list of exactly totalCount items
  const finalMixedSuggestions = shuffleArray(combinedSuggestions);
  
  // console.log("[getMixedSuggestions] Final mixed suggestions (after shuffle):", JSON.stringify(finalMixedSuggestions, null, 2));
  return finalMixedSuggestions;
};

// --- Keep console logs for debugging during development --- //
// You might want to remove or reduce them for production builds.
// Example: A global DEBUG flag could control logging verbosity.
const DEBUG_SUGGESTIONS = true; // Set to false to reduce console output

if (!DEBUG_SUGGESTIONS) {
    console.log = () => {}; // Simple way to disable logs; consider a more robust logger for production
    console.warn = () => {};
    console.error = () => {}; // Be careful with disabling error logs
}