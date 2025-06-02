// THIS PAGE IS THE HOME PAGE OF THE APP.
// IT WAS PREVIOUSLY WRONGLY NAMED "EventList.jsx"
// AND STUFF GOT IMPLEMENTED ON TOP OF IT OVER TIME.
// NOW IT HAS BEEN PROPERLY REFACTORED TO BE NAMED "Home.jsx".

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User, Calendar, MapPin, Users, Search } from 'lucide-react';
import axiosInstance from '../../services/axios';
import { useAuth } from '../../contexts/AuthContext';
// import { fetchAllCategoriesWithPagination, fetchSubcategories } from '../../services/categoryService';
// ^^Dynamically fetches subcategories on click. Is very stuttery and stiff.^^
import { fetchAllCategories } from '../../services/categoryService';
import './Home.css';

// --- Fetcher Functions ---
const fetchEvents = async () => {
  console.log("Fetching all events"); 
  try {
    const { data } = await axiosInstance.get(`/events/`); // Request without page param
    // Expecting direct array of events or handle if backend still sends object
    return Array.isArray(data) ? data : (data.results || []); // Adjust based on actual backend response now
  } catch (error) {
    console.error("Error fetching events:", error);
    return []; // Return empty array on error instead of throwing
  }
};

const fetchFriends = async () => {
  try {
    const { data } = await axiosInstance.get('/users/friends/');
    return data;
  } catch (error) {
    console.error("Error fetching friends:", error);
    return []; // Return empty array on error
  }
};

const fetchPreferences = async () => {
  // Handle potential 404 or other errors gracefully
  try {
    const { data } = await axiosInstance.get('/users/preferences/');
    return data;
  } catch (error) {
    console.error('Failed to fetch user preferences:', error);
    // Return a default structure or null if preferences aren't critical
    return { preferred_categories: [] }; 
  }
};

const fetchFriendEvents = async () => {
  try {
    const { data } = await axiosInstance.get('/users/friends-events/');
    // Slice here or let the component decide? Let component decide.
    return data; 
  } catch (error) {
    console.error("Error fetching friend events:", error);
    return []; // Return empty array on error
  }
};

const fetchPopularEvents = async () => {
  try {
    const { data } = await axiosInstance.get('/events/popular/');
    // Slice here or let the component decide? Let component decide.
    return data; 
  } catch (error) {
    console.error("Error fetching popular events:", error);
    return []; // Return empty array on error
  }
};

const fetchNearbyEvents = async ({ queryKey }) => {
  const [_key, params] = queryKey;
  console.log("fetchNearbyEvents called with params:", params);

  let apiParams = { radius: params.radius || 20 };
  let fetchEnabled = false;

  if (params.location) {
      apiParams.location = params.location;
      fetchEnabled = true;
      console.log(`fetchNearbyEvents: Using location search: ${params.location}`);
  } else if (params.latitude && params.longitude) {
      apiParams.lat = params.latitude;
      apiParams.lng = params.longitude;
      fetchEnabled = true;
      console.log(`fetchNearbyEvents: Using coordinates: ${params.latitude}, ${params.longitude}`);
  }

  if (!fetchEnabled) {
      console.log("fetchNearbyEvents: No valid parameters provided, returning empty.");
      return [];
  }

  try {
      const { data } = await axiosInstance.get('/events/', { params: apiParams });
      console.log("fetchNearbyEvents received data:", data);
      return data;
  } catch (error) {
      console.error("Failed to fetch nearby events:", error);
      return []; // Return empty array on error instead of re-throwing
  }
};


const EventCard = ({ event, friendsAttending = false }) => {
  const isPastEvent = new Date(event.start_time) < new Date();
  
  return (
    <div className={`event-card ${friendsAttending ? 'friends-attending' : ''} ${isPastEvent ? 'past-event' : ''}`}>
      {friendsAttending && (
        <div className="friends-badge">
          <Users size={16} /> Friends attending
        </div>
      )}
      {isPastEvent && (
        <div className="past-event-badge">
          <Calendar size={16} /> Past event
        </div>
      )}
      <h3>{event.name}</h3>
      <div className="event-date">{new Date(event.start_time).toLocaleDateString()}</div>
      <p className="event-description">{event.description}</p>
    </div>
  );
};

// --- Helper Functions for Hierarchy ---
const buildHierarchy = (categories) => {
  console.log("Building hierarchy with categories:", categories.length);
  
  // Create a default hierarchy with empty root array
  const hierarchy = { root: [] };
  const map = new Map();
  
  try {
    // Filter out any potentially bad data
    const validCategories = categories.filter(category => 
      category && typeof category === 'object' && category.id !== undefined
    );
    
    console.log(`${validCategories.length} valid categories after filtering`);
    
    if (validCategories.length === 0) {
      console.error("No valid categories found after filtering");
      return { hierarchy, map };
    }
    
    // First pass: Add all categories to the map
    validCategories.forEach(category => {
      try {
        // Ensure category.parent is handled consistently. Use parent_id if present, else parent.
        const parentId = category.parent_id !== undefined ? category.parent_id : category.parent;
        
        // Create a new object with children array explicitly
        const categoryWithChildren = { 
          ...category, 
          children: [], 
          parentId 
        };
        
        map.set(category.id, categoryWithChildren);
      } catch (err) {
        console.error(`Error processing category in first pass:`, err, category);
      }
    });
    
    // Second pass: Build the hierarchy by connecting parents and children
    console.log("Map size before building connections:", map.size);
    
    // Process all entries in the map
    map.forEach(categoryNode => {
      try {
        const parentId = categoryNode.parentId;
        
        if (parentId === null) {
          // This is a root category
          console.log(`Adding root category: ${categoryNode.name} (ID: ${categoryNode.id})`);
          hierarchy.root.push(categoryNode);
        } else if (parentId && map.has(parentId)) {
          // This is a child category and we have its parent in our map
          const parentNode = map.get(parentId);
          console.log(`Adding ${categoryNode.name} (ID: ${categoryNode.id}) as child of ${parentNode.name} (ID: ${parentId})`);
          
          // Add this node to its parent's children array
          if (!parentNode.children) {
            parentNode.children = []; // Ensure children array exists
          }
          parentNode.children.push(categoryNode);
        } else if (parentId) {
          // Log if parentId exists but isn't found in the map
          console.warn(`Category ${categoryNode.id} (${categoryNode.name}) has parentId ${parentId}, but parent not found in map. Adding to root.`);
          // Add to root as a fallback
          hierarchy.root.push(categoryNode);
        }
      } catch (err) {
        console.error(`Error processing category in second pass:`, err, categoryNode);
      }
    });

    // Make sure we have at least something in root
    if (hierarchy.root.length === 0 && map.size > 0) {
      console.warn("No root categories found, creating fallback root categories from map");
      // Use first few items from the map as fallback root categories
      const fallbackRoots = Array.from(map.values()).slice(0, 5);
      hierarchy.root = fallbackRoots;
    }

    // Debug: Count total categories in the hierarchy
    let totalCategories = 0;
    const countCategories = (categories) => {
      if (!categories || !Array.isArray(categories)) return;
      totalCategories += categories.length;
      categories.forEach(category => {
        if (category && category.children && category.children.length > 0) {
          countCategories(category.children);
        }
      });
    };
    
    countCategories(hierarchy.root);
    
    // Print hierarchy statistics
    console.log(`Built hierarchy with ${hierarchy.root.length} root categories and ${totalCategories} total categories`);
    if (hierarchy.root.length > 0) {
      console.log("Root categories:", hierarchy.root.map(c => ({ id: c.id, name: c.name })));
      console.log("First-level children counts:", hierarchy.root.map(c => ({ 
        id: c.id, 
        name: c.name, 
        childrenCount: c.children ? c.children.length : 0 
      })));
    }
  } catch (error) {
    console.error("Error in buildHierarchy:", error);
    // Provide a fallback valid hierarchy if all else fails
    hierarchy.root = categories
      .filter(cat => cat && typeof cat === 'object' && cat.parent === null)
      .map(cat => ({...cat, children: []}));
    
    if (hierarchy.root.length === 0) {
      // Create an absolute backup if no valid parent categories exist
      hierarchy.root = categories
        .slice(0, 10)
        .filter(cat => cat && typeof cat === 'object')
        .map(cat => ({...cat, children: [], parentId: null}));
    }
    
    console.log(`Using fallback hierarchy with ${hierarchy.root.length} root categories`);
  }

  return { hierarchy, map };
};

const getDescendantIds = (categoryId, categoryMap) => {
  const descendantIds = new Set();
  const queue = [categoryId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (categoryMap.has(currentId)) {
      const categoryNode = categoryMap.get(currentId);
      categoryNode.children.forEach(child => {
        if (!descendantIds.has(child.id)) {
          descendantIds.add(child.id);
          queue.push(child.id);
        }
      });
    }
  }
  return descendantIds;
};
// --- End Helper Functions ---

const Home = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  // --- Component State (excluding fetched data) ---
  const [categoryHierarchy, setCategoryHierarchy] = useState({ root: [] });
  const [categoryMap, setCategoryMap] = useState(new Map());
  const [displayedCategoryLevels, setDisplayedCategoryLevels] = useState([]);
  const [selectionPath, setSelectionPath] = useState([]);
  const [showPreferredOnly, setShowPreferredOnly] = useState(true); // Keep this for filtering main categories
  const [hidePastEvents, setHidePastEvents] = useState(true);
  const [eventsWithFriends, setEventsWithFriends] = useState(new Set()); // Initialize as Set
  const [searchLocation, setSearchLocation] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLocationFiltered, setIsLocationFiltered] = useState(false);
  const [searchRadius, setSearchRadius] = useState(20);
  const [userLocation, setUserLocation] = useState(null); // State for user's coordinates
  const [scrollToLevel, setScrollToLevel] = useState(null);
  const categorySectionsContainerRef = useRef(null);

  // --- Error state for backend connectivity ---
  const [backendConnected, setBackendConnected] = useState(true);

  // --- React Query Data Fetching ---

  // Revert Events query to useQuery
  const eventsQuery = useQuery({ 
    queryKey: ['events'], 
    queryFn: fetchEvents,
    staleTime: 1000 * 60 * 10, // 10 minutes
    cacheTime: 1000 * 60 * 30,  // 30 minutes
    // Don't fail hard on errors
    retry: 1,
    onError: () => setBackendConnected(false)
  });

  // Update to fetch ALL categories using the paginated fetcher
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: fetchAllCategories, // Use the function that fetches all categories
    staleTime: 1000 * 60 * 30, // 30 minutes
    cacheTime: 1000 * 60 * 60  // 60 minutes
  });

  // Query for Friends
  const friendsQuery = useQuery({ 
    queryKey: ['friends'], 
    queryFn: fetchFriends,
    staleTime: 1000 * 60 * 15, // 15 minutes
    cacheTime: 1000 * 60 * 30,  // 30 minutes
    // Don't fail hard on errors
    retry: 1,
    onError: () => setBackendConnected(false)
  });

  // Query for User Preferences
  const preferencesQuery = useQuery({ 
    queryKey: ['preferences'], 
    queryFn: fetchPreferences,
    staleTime: 1000 * 60 * 30, // 30 minutes
    cacheTime: 1000 * 60 * 60,  // 60 minutes
    // Don't fail hard on errors
    retry: 1,
    onError: () => setBackendConnected(false)
  });

  // Query for Friends' Events
  const friendEventsQuery = useQuery({ 
    queryKey: ['friendEvents'], 
    queryFn: fetchFriendEvents,
    staleTime: 1000 * 60 * 10, // 10 minutes
    cacheTime: 1000 * 60 * 30,  // 30 minutes
    // Don't fail hard on errors 
    retry: 1,
    onError: () => setBackendConnected(false)
  });

  // Query for Popular Events
  const popularEventsQuery = useQuery({ 
    queryKey: ['popularEvents'], 
    queryFn: fetchPopularEvents,
    staleTime: 1000 * 60 * 10, // 10 minutes
    cacheTime: 1000 * 60 * 30,  // 30 minutes
    // Don't fail hard on errors
    retry: 1,
    onError: () => setBackendConnected(false)
  });

  // Refactored Query for Nearby Events - Handles both geolocation and text search
  const nearbyEventsQuery = useQuery({
    queryKey: [
        'nearbyEvents',
        isLocationFiltered && searchLocation.trim()
            ? { location: searchLocation.trim(), radius: searchRadius } // Text location key
            : userLocation
            ? { latitude: userLocation.latitude, longitude: userLocation.longitude, radius: searchRadius } // Geolocation key
            : { disabled: true } // Disabled key
    ],
    queryFn: fetchNearbyEvents,
    // Enable if geolocation available OR text search active
    enabled: !!userLocation || (isLocationFiltered && !!searchLocation.trim()),
    staleTime: 1000 * 60 * 5, // 5 minutes - shorter for location-based data
    cacheTime: 1000 * 60 * 15, // 15 minutes
    // Don't fail hard on errors
    retry: 1,
    onError: () => setBackendConnected(false)
  });

  // --- Derived Data and State Updates from Queries ---

  // Update state based on preferences query
  useEffect(() => {
    if (preferencesQuery.data?.preferred_categories) {
      setShowPreferredOnly(preferencesQuery.data.preferred_categories.length > 0);
    }
    // No need to set userPreferences state directly if we use preferencesQuery.data.preferred_categories
  }, [preferencesQuery.data]);

  // Update set of events friends are attending
  useEffect(() => {
    if (friendEventsQuery.data) {
      const friendEventIds = new Set(friendEventsQuery.data.map(event => event.id));
      setEventsWithFriends(friendEventIds);
    }
  }, [friendEventsQuery.data]);


  // Effect: Get Geolocation
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (err) => {
          console.warn(`ERROR(${err.code}): ${err.message}`);
          // Handle location error - maybe disable nearby section or show message
        },
        {
          enableHighAccuracy: false, // Lower accuracy is often faster and sufficient
          timeout: 10000,          // Wait 10 seconds
          maximumAge: 1000 * 60 * 15 // Accept cached position up to 15 mins old
        }
      );
    } else {
      console.log("Geolocation is not available");
      // Handle case where geolocation is not supported
    }
  }, []); // Run only once on mount


  // Effect: Process categories into hierarchy once fetched
  useEffect(() => {
    // Use categoriesQuery.data instead of allCategories state
    if (categoriesQuery.data && categoriesQuery.data.length > 0) { 
      console.log("Processing categories data:", categoriesQuery.data.length, "categories");
      console.log('-------- DEBUGGING CATEGORY DATA --------');
      
      if (categoriesQuery.isError) {
        console.error('Categories Query Error:', categoriesQuery.error);
      }
      
      try {
        // Additional debug: Print the first few categories for debugging
        console.log('First 3 categories sample:', categoriesQuery.data.slice(0, 3));
        
        // Count categories by parent
        const parentCounts = {};
        categoriesQuery.data.forEach(cat => {
          const parentId = cat.parent_id !== undefined ? cat.parent_id : cat.parent;
          parentCounts[parentId || 'null'] = (parentCounts[parentId || 'null'] || 0) + 1;
        });
        
        console.log('Category counts by parent ID:', parentCounts);
        
        // Build hierarchy as before
        const { hierarchy, map } = buildHierarchy(categoriesQuery.data);
        setCategoryHierarchy(hierarchy);
        setCategoryMap(map);
        
        // Initially display only the main categories (level 0)
        setDisplayedCategoryLevels([hierarchy.root]);
        setSelectionPath([]); // Reset selection on new data
        
        console.log("Hierarchy and map set successfully");
        
        // Log main categories and their immediate children
        if (map.size > 0) {
          console.log("Category map size:", map.size);
          
          const mainCategories = Array.from(map.values())
            .filter(cat => cat.parentId === null);
          
          console.log("Main categories count:", mainCategories.length);
          
          mainCategories.forEach(mainCat => {
            const childCount = mainCat.children ? mainCat.children.length : 0;
            console.log(`Main category "${mainCat.name}" (ID: ${mainCat.id}) has ${childCount} direct children`);
            
            if (childCount > 0) {
              console.log(`Children of "${mainCat.name}":`, 
                mainCat.children.map(child => `${child.name} (ID: ${child.id})`));
            }
          });
        }
        console.log('-------- END DEBUGGING --------');
      } catch (error) {
        console.error("Error processing category hierarchy:", error);
        // If there's an error processing the hierarchy, at least show the main categories
        if (categoriesQuery.data.filter(cat => cat.parent === null || cat.parent_id === null).length > 0) {
          console.log("Falling back to showing only main categories");
          const mainCats = categoriesQuery.data.filter(cat => cat.parent === null || cat.parent_id === null);
          setCategoryHierarchy({ root: mainCats });
          setCategoryMap(new Map(mainCats.map(cat => [cat.id, { ...cat, children: [] }])));
          setDisplayedCategoryLevels([mainCats]);
        }
      }
    } else if (categoriesQuery.data) {
      console.warn("No categories data found or empty array");
    }
  }, [categoriesQuery.data, categoriesQuery.isError, categoriesQuery.error]); // Updated dependencies

  // Effect 3: Handle scrolling when scrollToLevel changes
  useEffect(() => {
    // Check if scrollToLevel is a valid number (not null, undefined, etc.)
    if (typeof scrollToLevel === 'number' && categorySectionsContainerRef.current) {
      // Find the section element using the data-level attribute
      const targetSection = categorySectionsContainerRef.current.querySelector(`[data-level="${scrollToLevel}"]`);
      if (targetSection) {
        console.log(`useEffect Scrolling: Attempting to scroll to section with data-level=${scrollToLevel}`);
        // Use 'center' to bring it into the middle, 'smooth' for animation
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
         console.log(`useEffect Scrolling: Could not find section with data-level=${scrollToLevel}`);
      }
      // Reset the trigger after attempting the scroll
      setScrollToLevel(null);
    }
  }, [scrollToLevel]); // Dependency array includes scrollToLevel

  // Effect 4: Handle hash scrolling for navigation from external links (like Browse Events button)
  useEffect(() => {
    const handleHashScroll = () => {
      const hash = location.hash;
      if (hash) {
        // Remove the # from the hash
        const elementId = hash.substring(1);
        console.log(`Attempting to scroll to element with ID: ${elementId}`);
        
        // Wait a bit for the component to render
        setTimeout(() => {
          const element = document.getElementById(elementId);
          if (element) {
            console.log(`Found element with ID: ${elementId}, scrolling...`);
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            console.log(`Element with ID: ${elementId} not found`);
          }
        }, 100);
      }
    };

    // Handle hash on initial load and when location changes
    handleHashScroll();
  }, [location.hash]); // Dependency on location.hash

  // Filter events based on the DEEPEST selected category in the path
  const getFilteredEvents = useCallback(() => {
    const deepestSelectedCategoryId = selectionPath.length > 0 ? selectionPath[selectionPath.length - 1] : null;
    
    // Use simple data array from useQuery
    const allFetchedEvents = eventsQuery.data || []; 
    
    const userPreferences = preferencesQuery.data?.preferred_categories || []; // Use data from query

    // If no category is selected, show all (potentially filtered by preference toggle)
    if (!deepestSelectedCategoryId) {
      let baseEvents = allFetchedEvents; // Use simple array
       // Apply preference filter ONLY if no category path is selected
      if (showPreferredOnly && userPreferences.length > 0 && selectionPath.length === 0 && categoryHierarchy.root.length > 0) {
           const preferredMainCategoryNodes = categoryHierarchy.root.filter(cat => userPreferences.includes(cat.id));
           const allPreferredOrDescendantIds = new Set();
           preferredMainCategoryNodes.forEach(cat => {
               allPreferredOrDescendantIds.add(cat.id);
               getDescendantIds(cat.id, categoryMap).forEach(id => allPreferredOrDescendantIds.add(id));
           });
           // Filter based on event.category (assuming it's the ID)
           baseEvents = baseEvents.filter(event => event.category && allPreferredOrDescendantIds.has(event.category.id || event.category)); 
       }
       return filterEvents(baseEvents); // Apply past event filter
    }

    // Find all descendants of the deepest selected category
    const categoryAndDescendantIds = new Set([deepestSelectedCategoryId]);
    getDescendantIds(deepestSelectedCategoryId, categoryMap).forEach(id => categoryAndDescendantIds.add(id));

    // Filter based on event.category (assuming it's the ID)
    const filtered = allFetchedEvents.filter(event => event.category && categoryAndDescendantIds.has(event.category.id || event.category)); // Use simple array

    return filterEvents(filtered); // Apply past event filter

  }, [
      eventsQuery.data, // Depend on simple query data
      selectionPath, 
      categoryMap, 
      hidePastEvents, 
      preferencesQuery.data, // Depend on query data
      showPreferredOnly, 
      categoryHierarchy.root
  ]); // Updated dependencies

  const filterEvents = (eventsList) => {
    if (hidePastEvents) {
      return eventsList.filter(event => new Date(event.start_time) >= new Date());
    }
    return eventsList;
  };

  const displayEvents = getFilteredEvents();

  // Handle clicking a category card at a specific level
  const handleCategorySelect = (category, level) => {
    const clickedCategoryId = category ? category.id : null; // Handle "All" click
    const currentSelectedId = selectionPath[level];

    let newPath;
    let newDisplayedLevels;
    let targetScrollLevel = null; // Explicitly track scroll target for this action

    if (clickedCategoryId === currentSelectedId) {
      // Case 1: Re-selecting the same category - close children and scroll UP to PARENT level
      newPath = selectionPath.slice(0, level);
      newDisplayedLevels = displayedCategoryLevels.slice(0, level + 1);
      // Scroll up to the parent level (level - 1) if it exists, otherwise stay at level 0
      targetScrollLevel = Math.max(0, level - 1);
      console.log(`handleCategorySelect: Re-selected category ${clickedCategoryId} at level ${level}. Closing children. Scrolling UP to level ${targetScrollLevel}.`);

    } else if (clickedCategoryId === null && level > 0) { // Ensure "All" is not at level 0
      // Case 2: Clicking "All" (in a subcategory level) - close children and scroll UP to PARENT level
      newPath = selectionPath.slice(0, level);
      newDisplayedLevels = displayedCategoryLevels.slice(0, level + 1);
      // Scroll up to the parent level (level - 1)
      targetScrollLevel = level - 1;
      console.log(`handleCategorySelect: Clicked 'All' at level ${level}. Closing children. Scrolling UP to level ${targetScrollLevel}.`);

    } else if (clickedCategoryId !== null) {
      // Case 3: Selecting a new category at this level
      newPath = [...selectionPath.slice(0, level), clickedCategoryId];
      newDisplayedLevels = [...displayedCategoryLevels.slice(0, level + 1)]; // Start with current levels up to the clicked level

      const categoryNode = categoryMap.get(clickedCategoryId);
      console.log("Selected category node:", categoryNode); // Log the selected category node

      // Enhanced logging for debugging subcategories
      if (categoryNode) {
        console.log(`Category node details for ID ${clickedCategoryId}:`, {
          name: categoryNode.name,
          icon: categoryNode.icon,
          hasChildren: categoryNode.children && categoryNode.children.length > 0,
          childrenCount: categoryNode.children ? categoryNode.children.length : 0,
          children: categoryNode.children ? categoryNode.children.map(c => ({ id: c.id, name: c.name })) : []
        });
      }

      // Check if the category has children from the already loaded hierarchy
      if (categoryNode && categoryNode.children && categoryNode.children.length > 0) {
        // If the category has children (already processed by buildHierarchy), display them
        console.log("Category already has children:", categoryNode.children.length);
        console.log("Children:", categoryNode.children.map(child => ({ id: child.id, name: child.name })));
        newDisplayedLevels.push(categoryNode.children);
        targetScrollLevel = level + 1; // Scroll to the newly added child section (level + 1)
        console.log(`handleCategorySelect: Selected new category ${clickedCategoryId} at level ${level}. Displaying children. Scrolling to level ${targetScrollLevel}.`);
      } else {
        // If the category has no children, just update the path and scroll to current level
        console.log(`handleCategorySelect: Selected new category ${clickedCategoryId} at level ${level}. No children found in map. Scrolling to level ${targetScrollLevel}.`);
        targetScrollLevel = level;
      }
    } else {
        console.log(`handleCategorySelect: Unhandled case - Clicked Category ID: ${clickedCategoryId}, Level: ${level}`);
        return; // Exit if it's an unexpected case
    }

    // Update state
    setSelectionPath(newPath);
    setDisplayedCategoryLevels(newDisplayedLevels); // Update displayed levels directly

    // Trigger the scroll effect by setting the target level state
    // The useEffect hook will handle the actual scrolling after the render
    if (targetScrollLevel !== null) {
        setScrollToLevel(targetScrollLevel);
    }
  };

  // Check if friends are attending an event
  const hasFriendsAttending = (eventId) => {
    return eventsWithFriends.has(eventId);
  };

  const handleLocationSearch = async (e) => {
    e.preventDefault();
    const trimmedLocation = searchLocation.trim();
    if (!trimmedLocation) return;

    // Update state to trigger queryKey change and refetch
    setIsSearching(true);
    setIsLocationFiltered(true);
    setSearchLocation(trimmedLocation);
    
    // Reset isSearching state when the query completes
    nearbyEventsQuery.refetch().finally(() => {
      setIsSearching(false);
    });
  };

  const clearLocationFilter = async () => {
    // Update state to trigger queryKey change and refetch
    setIsSearching(true);
    setSearchLocation('');
    setIsLocationFiltered(false);
    
    // Reset isSearching state when the query completes
    setTimeout(() => {
      setIsSearching(false);
    }, 500);
  };

  // Get appropriate description for category (Mainly for Level 0)
  const getCategoryDescription = (name) => {
    const descriptionMap = {
      "Relationships and Social Life": "Connect with others and build meaningful relationships through events focused on social interactions and relationship development.",
      "Community Engagement and Civic Life": "Get involved in your community, engage with civic initiatives, and make a positive impact on society.",
      "Financial Understanding, Economics, and Politics": "Broaden your financial knowledge, understand economic principles, and engage with political discourse.",
      "Career, Work, and Productivity": "Advance your career, improve work skills, and boost productivity through focused events and activities.",
      "Time, Habits, and Life Organization": "Develop better habits, manage your time effectively, and create more structure in your daily life.",
      "Pets, Animals, and Nature Care": "Connect with animals, learn about pet care, and engage with nature conservation efforts.",
      "Health, Wellness, and Mindfulness": "Take care of your physical and mental health through wellness activities and mindfulness practices.",
      "Sports, Exercise, and Physical Activities": "Stay active, participate in sports, and engage in physical activities that promote fitness and well-being.",
      "Technology Balance and Innovation": "Explore technological innovations while maintaining a healthy balance with digital tools in your life.",
      "Personal Growth, Education, and Learning": "Continue learning, pursue education, and focus on personal development through various growth opportunities.",
      "Spirituality, Religion, and Philosophy": "Explore spiritual practices, religious traditions, and philosophical ideas to deepen your understanding of life.",
      "Recreation, Hobbies, Entertainment, and Games": "Enjoy recreational activities, develop hobbies, and experience entertainment options for a more fulfilling life.",
      "Home and Environment Elevation": "Improve your living space, create a better home environment, and learn sustainable living practices.",
      "Travel, Nature, and Adventure": "Explore new places, connect with nature, and embark on adventures that broaden your horizons.",
      "Food, Cooking, and Nutrition": "Discover culinary experiences, improve cooking skills, and learn about nutrition for better health.",
      "Art, Creativity and Expression": "Express yourself through various art forms, develop creative skills, and appreciate artistic endeavors."
    };
    // For subcategories, generate a generic description or use one from the category object if available
    const categoryData = categoryMap.get(selectionPath[selectionPath.length - 1]);
    if(categoryData && categoryData.description) {
        return categoryData.description;
    }
    return descriptionMap[name] || "Explore events in this category.";
  };

  // Check if the current path matches a given path for active tab styling
  const isActive = (path) => {
    return location.pathname === path;
  };

  // Helper function to determine if a category name is long
  const isLongCategoryName = (name) => {
    return name.length > 25 || name.includes('Recreation') || name.includes('Entertainment') || name.includes('Environment');
  };

  // Check if the essential queries are loading (using simple isLoading)
  // Modified to ONLY check the categories query, as it's the only one we absolutely need
  const isLoadingEssential = categoriesQuery.isLoading;

  if (isLoadingEssential) { // Updated loading check
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  // --- Error Handling (updated for better UX) ---
  if (categoriesQuery.isError) {
    return (
      <div className="error-container">
        <p>Error loading category data. Please try refreshing the page.</p>
        <p>Error: {categoriesQuery.error.message}</p>
      </div>
    );
  }

  // --- If backend is not connected, show a warning but still display categories ---
  const renderBackendConnectionWarning = () => {
    if (!backendConnected) {
      return (
        <div className="connection-warning">
          <p>Unable to connect to the backend server. Some features may be unavailable.</p>
          <p>You can still browse categories, but events will not be displayed until connection is restored.</p>
        </div>
      );
    }
    return null;
  };

  // --- Data Extraction (use default values) ---
  const allCategories = categoriesQuery.data || [];
  const userPreferences = preferencesQuery.data?.preferred_categories || [];
  // Use friendEventsQuery.data directly where needed, same for popularEventsQuery.data
  const nearbyEventsData = nearbyEventsQuery.data || []; // Use data from query
  const friendEventsData = friendEventsQuery.data?.slice(0, 5) || []; // Slice here if needed
  const popularEventsData = popularEventsQuery.data?.slice(0, 5) || []; // Slice here if needed


  // --- Render Logic (minor updates to use query data) ---
  const renderCategoryLevel = (categoriesToDisplay, level) => {
    console.log(`Rendering category level ${level} with ${categoriesToDisplay?.length || 0} categories`);
    
    if (!categoriesToDisplay || categoriesToDisplay.length === 0) {
      console.log(`No categories to display at level ${level}`);
      return null;
    }

    // Debug output of categories being rendered
    try {
      console.log(`Level ${level} categories:`, categoriesToDisplay.map(c => ({
        id: c.id,
        name: c.name,
        parent: c.parent || c.parent_id,
        hasChildren: c.children && c.children.length > 0,
        childCount: c.children ? c.children.length : 0
      })));
    } catch (err) {
      console.error(`Error logging level ${level} categories:`, err);
    }

    const parentCategory = level > 0 && selectionPath.length >= level
        ? categoryMap.get(selectionPath[level - 1])
        : null;

    // Get parent icon IF NEEDED for title (use parentCategory.icon if available)
    const parentIcon = parentCategory ? parentCategory.icon : null;

    const sectionTitle = level === 0
        ? "Life Categories"
        // Prepend parent icon to title for subcategory sections
        : <><span style={{ marginRight: '8px' }}>{parentIcon || '🧩'}</span>{`${parentCategory?.name || 'Sub'} Categories`}</>; 

    const gridClass = level === 0 ? "categories-grid" : "subcategories-grid"; // Reuse or create new class

    // Filter by preference only at level 0 IF toggle is on
    let displayList = categoriesToDisplay;
    if (level === 0 && showPreferredOnly && userPreferences.length > 0) {
        displayList = categoriesToDisplay.filter(cat => userPreferences.includes(cat.id));
    }

    // --- Filter out "Talking Suggestions" specifically at level 0 --- 
    if (level === 0) {
        displayList = displayList.filter(cat => cat.name !== "Talking Suggestions");
    }
    // --- End Filter ---

    // --- Log the list being rendered ---
    console.log(`renderCategoryLevel - Level: ${level}, Display List:`, displayList.map(c => ({id: c.id, name: c.name, parent: c.parent?.id || c.parent})));
    // --- End Log ---

    // Empty state when subcategories array is empty (only for levels > 0)
    const showEmptySubcategories = level > 0 && displayList.length === 0;

    return (
        <section key={`level-${level}`} data-level={level} className="section full-width-section category-level-section">
            <h2 className="section-title">{sectionTitle}</h2>
            {showEmptySubcategories ? (
              <div className="subcategories-loading">
                <div style={{ fontSize: '24px', marginBottom: '10px' }}>🔎</div>
                <span>No subcategories found for this category.</span>
              </div>
            ) : (
            <div className={gridClass}>
                {/* "All" option for levels > 0 */}
                {level > 0 && parentCategory && (
                    <div
                        className={`subcategory-card all-card ${selectionPath.length === level ? 'selected' : ''} ${
                          isLongCategoryName(parentCategory.name) ? 'specific-long-parent' : ''
                        }`}
                        onClick={() => handleCategorySelect(null, level)} // Pass null for "All"
                    >
                        {/* Use a default icon for 'All' */}
                        <div className="category-icon">🔍</div>
                        <div className="category-name">All {parentCategory.name}</div>
                    </div>
                )}

                {/* Regular category cards */}
                {displayList.map(category => {
                    const isSelected = selectionPath[level] === category.id;
                    const isPreferred = userPreferences.includes(category.id); // Check preference status
                    // Use category.icon directly, provide fallback
                    const icon = category.icon || (level === 0 ? '📌' : '🧩');
                    const isLongText = isLongCategoryName(category.name);
                    // Determine the base class based on the level
                    const baseCardClass = level === 0 ? 'category-card' : 'subcategory-card';
                    
                    // --- DEBUG LOG --- 
                    const finalClassName = `${baseCardClass} ${isSelected ? 'selected' : ''} ${isPreferred ? 'preferred' : ''} ${isLongText ? 'long-text' : ''}`;
                    if (level === 0) {
                        console.log(`Level 0 Card: ${category.name}, Is Selected: ${isSelected}, Classes: ${finalClassName}`);
                    }
                    // --- END DEBUG LOG ---

                    return (
                        <div
                            key={category.id}
                            // Use the finalClassName determined above
                            className={finalClassName}
                            onClick={() => handleCategorySelect(category, level)}
                        >
                            {/* Conditionally render indicator for preferred categories at level 0 */}
                            {level === 0 && userPreferences.includes(category.id) && (
                              <span className="selected-indicator">🎯</span>
                            )}
                            {/* Use the category.icon field */}
                            <div className="category-icon">{icon}</div>
                            <div className="category-name">{category.name}</div>
                        </div>
                    );
                })}
            </div>
            )}
        </section>
    );
  };

   const renderCategoryDetailHeader = () => {
       const deepestSelectedId = selectionPath.length > 0 ? selectionPath[selectionPath.length - 1] : null;
       if (!deepestSelectedId) return null; // Don't show if no category selected

       const category = categoryMap.get(deepestSelectedId);
       if (!category) return null; // Should not happen if map is correct

       // Debug logging to see what data we have
       console.log("DEBUG - Category Detail Header:", {
           categoryId: deepestSelectedId,
           categoryName: category.name,
           categoryIcon: category.icon,
           selectionPath: selectionPath,
           fullCategory: category
       });

       // Use category.icon directly from the data (which comes from JSON files)
       // This should have the correct emoji since it's loaded from mainCategories.json or subcategory files
       const icon = category.icon || '🧩'; // Only use fallback if icon is missing
       const description = getCategoryDescription(category.name); // Uses name or category.description

       console.log("DEBUG - Final icon being used:", icon);

       return (
             <div className="category-detail-header">
                 <div className="category-detail-title">
                     {/* Combine emoji and text in a single h2 element, similar to how category cards work */}
                     <h2 className="section-title">{icon} {category.name}</h2>
                 </div>
                 <p className="category-description">{description}</p>
             </div>
       );
   };

  return (
    <div className="page-container" style={{ backgroundColor: '#00B488' }}>
      {/* Main Navigation */}
      <nav className="main-nav">
        <Link to="/" className="nav-brand">
          Hangout
        </Link>
        <div className="nav-links">
          <Link to="/events/create" className="nav-link">Create Event</Link>
          <Link to="/dashboard" className="nav-link">My Events</Link>
          <Link to="/profile" className="nav-link">Profile</Link>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </nav>

      {/* Secondary Navigation */}
      <div className="secondary-nav">
        <div className="nav-links">
          <Link to="/" className={isActive('/') ? 'active' : ''}>Home</Link>
          <Link to="/suggester" className={isActive('/suggester') ? 'active' : ''}>Suggester</Link>
          <Link to="/calendar" className={isActive('/calendar') ? 'active' : ''}>Calendar</Link>
        </div>
      </div>

      {/* Display connection warning if backend is not connected */}
      {renderBackendConnectionWarning()}

      {/* LIFE CATEGORIES SECTION - MOVED TO TOP */}
      {/* Add the ref to this container which holds the category sections */}
      <div className="categories-container" ref={categorySectionsContainerRef}>
        {/* Preferred Categories Toggle */}
        {/* Use userPreferences from query */}
        {userPreferences.length > 0 && ( 
          <div className="category-preferences-toggle">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={showPreferredOnly}
                onChange={() => setShowPreferredOnly(!showPreferredOnly)}
              />
              <span className="toggle-text">
                Show Preferred Categories
              </span>
            </label>
          </div>
        )}
        
        {/* Categories Section - Render based on displayedCategoryLevels */}
        {displayedCategoryLevels.map((categoriesForLevel, index) =>
          renderCategoryLevel(categoriesForLevel, index)
        )}

        {/* Category-Specific Events - Only show events if backend is connected */}
        {selectionPath.length > 0 && ( // Show only if a category path is selected
          <section className="section full-width-section category-events-section">
            {renderCategoryDetailHeader()} {/* Render the header */}

            {backendConnected && (
              <div className="category-events-container">
                <h3 className="events-section-title">Events</h3>
                {/* Render events from simple filtered list */}
                <div className={`horizontal-event-grid category-events-grid ${displayEvents.length === 0 ? 'empty-events-grid' : ''}`}> 
                  {displayEvents.length > 0 ? (
                    displayEvents.map(event => (
                      <Link to={`/events/${event.id}?from=home`} key={event.id} className="horizontal-event-card">
                        <EventCard 
                          event={event} 
                          friendsAttending={hasFriendsAttending(event.id)}
                        />
                      </Link>
                    ))
                  ) : (
                    <div className="empty-state">
                      <Calendar size={32} />
                      <p>No events found for this selection</p>
                       <p>Try broadening your category selection or check back later.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="category-actions">
              <button 
                className="category-action-button create-button"
                onClick={() => {
                  const deepestSelectedId = selectionPath.length > 0 ? selectionPath[selectionPath.length - 1] : null;
                  if (deepestSelectedId) {
                    const category = categoryMap.get(deepestSelectedId);
                    if (category) {
                      // Find the root main category by traversing up the hierarchy
                      let currentCategory = category;
                      let mainCategoryId = currentCategory.id;
                      
                      // Traverse up until we find a category with null parentId (root category)
                      while (currentCategory && currentCategory.parentId !== null) {
                        // Get the parent category
                        currentCategory = categoryMap.get(currentCategory.parentId);
                        if (currentCategory) {
                          mainCategoryId = currentCategory.id;
                        }
                      }
                      
                      navigate(`/create-event?categoryId=${mainCategoryId}&subcategoryId=${deepestSelectedId}&categoryName=${encodeURIComponent(category.name)}&icon=${encodeURIComponent(category.icon || '🧩')}`);
                    }
                  }
                }}
                disabled={!backendConnected}
              >
                <span className="action-icon">📝</span>
                Create Event Based On The Category
              </button>
              <button 
                className="category-action-button talk-button"
                onClick={() => {
                  const deepestSelectedId = selectionPath.length > 0 ? selectionPath[selectionPath.length - 1] : null;
                  if (deepestSelectedId) {
                    const category = categoryMap.get(deepestSelectedId);
                    if (category) {
                      let categoryText = '';
                      
                      // Determine if this is a main category (no parent) or subcategory
                      if (category.parentId === null || category.parentId === undefined) {
                        // This is a main life category - include emoji
                        categoryText = category.icon ? 
                          `${category.icon} ${category.name}` : 
                          category.name;
                      } else {
                        // This is a subcategory - need to include parent information
                        const parentCategory = categoryMap.get(category.parentId);
                        if (parentCategory) {
                          // Include parent icon if it exists, otherwise use category icon
                          const parentDisplayName = parentCategory.icon ? 
                            `${parentCategory.icon} ${parentCategory.name}` : 
                            parentCategory.name;
                          // Include subcategory icon if it exists
                          const subcategoryDisplayName = category.icon ?
                            `${category.icon} ${category.name}` :
                            category.name;
                          categoryText = `${subcategoryDisplayName} in regard to ${parentDisplayName}`;
                        } else {
                          // Fallback if parent not found - still include subcategory icon if available
                          categoryText = category.icon ? 
                            `${category.icon} ${category.name}` : 
                            category.name;
                        }
                      }
                      
                      // Navigate to the suggester page with the appropriate category text
                      navigate(`/suggester?category=${encodeURIComponent(categoryText)}`);
                    }
                  }
                }}
              >
                <span className="action-icon">💬</span>
                Ask AI About The Category
              </button>
            </div>
          </section>
        )}
      </div>

      {/* TOGGLES AND SEARCH SECTION - MOVED TO MIDDLE */}
      {/* Extra spacer div for consistent vertical spacing */}
      <div className="toggle-spacer calendar-spacer"></div>

      <div className="preferences-container">
        <div className="preferences-toggle past-events-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={hidePastEvents}
              onChange={() => setHidePastEvents(!hidePastEvents)}
            />
            <span className="toggle-text">
              Hide Past Events
            </span>
          </label>
        </div>
      </div>

      <div className="location-search-container">
        <div className="search-form-wrapper">
          <div className="search-input-row">
            <MapPin size={24} className="location-pin-icon" />
            <input
              type="text"
              placeholder="Search By Location (Example: Columbia, SC)"
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              className="location-search-input"
            />
          </div>
          <button
            type="submit"
            className="search-button"
            onClick={handleLocationSearch}
            disabled={isSearching || !backendConnected}
          >
            Search
          </button>
          {isLocationFiltered && (
            <button
              type="button"
              onClick={clearLocationFilter}
              className="clear-search-button"
            >
              Clear
            </button>
          )}
        </div>
        {isLocationFiltered && (
          <div className="search-results-summary">
            Showing events within {searchRadius} miles of "{searchLocation}"
          </div>
        )}
      </div>

      {/* Main Content Wrapper */}
      <div className="content-wrapper">
        <main className="main-content">
          {/* EVENTS SECTIONS - STAYS AT BOTTOM */}
          <div className="horizontal-events-container">
            {/* Only show events sections if backend is connected */}
            {backendConnected && (
              <>
                {/* Nearby Events Section */}
                <section className="horizontal-section" id="events-near-you">
                  <h2 className="section-title">Events Near You</h2>
                  {/* Handle nearby loading/error states */}
                  {nearbyEventsQuery.isLoading && <p>Loading nearby events...</p>}
                  {nearbyEventsQuery.isError && <p>Could not load nearby events.</p>}
                  {!userLocation && !nearbyEventsQuery.isLoading && <p>Enable location services to see nearby events.</p>}
                  {userLocation && !nearbyEventsQuery.isLoading && !nearbyEventsQuery.isError && (
                    <div className="horizontal-event-grid">
                      {/* Use nearbyEventsData */}
                      {nearbyEventsData.length > 0 ? ( 
                        filterEvents(nearbyEventsData.slice(0, 5)).map(event => ( // Slice here if needed
                          <Link to={`/events/${event.id}?from=home`} key={event.id} className="horizontal-event-card">
                            <EventCard event={event} 
                              friendsAttending={hasFriendsAttending(event.id)}
                            />
                          </Link>
                        ))
                      ) : (
                        <div className="empty-state">
                          <MapPin size={32} />
                          <p>No nearby events found</p>
                           {isLocationFiltered && <p>within {searchRadius} miles of "{searchLocation}"</p>}
                        </div>
                      )}
                    </div>
                  )}
                </section>

                {/* Friends' Events Section */}
                <section className="horizontal-section friends-events-section">
                  <h2 className="section-title">Events Your Friends Are Attending</h2>
                   {friendEventsQuery.isLoading && <p>Loading friends' events...</p>}
                   {friendEventsQuery.isError && <p>Could not load friends' events.</p>}
                   {!friendEventsQuery.isLoading && !friendEventsQuery.isError && (
                    <div className="horizontal-event-grid">
                      {/* Use friendEventsData */}
                      {friendEventsData.length > 0 ? ( 
                        filterEvents(friendEventsData).map(event => (
                          <Link to={`/events/${event.id}?from=home`} key={event.id} className="horizontal-event-card">
                            <EventCard event={event} friendsAttending={true} />
                          </Link>
                        ))
                      ) : (
                        <div className="friends-empty-state">
                          <Users size={32} />
                          <p>No events with friends attending yet</p>
                          <p>When your friends RSVP to events, they'll appear here</p>
                        </div>
                      )}
                    </div>
                   )}
                </section>

                {/* Popular Events Section */}
                <section className="horizontal-section">
                  <h2 className="section-title">Popular Events</h2>
                  {popularEventsQuery.isLoading && <p>Loading popular events...</p>}
                  {popularEventsQuery.isError && <p>Could not load popular events.</p>}
                  {!popularEventsQuery.isLoading && !popularEventsQuery.isError && (
                      <div className="horizontal-event-grid">
                        {/* Use popularEventsData */}
                        {popularEventsData.length > 0 ? (
                          filterEvents(popularEventsData).map(event => (
                            <Link to={`/events/${event.id}?from=home`} key={event.id} className="horizontal-event-card">
                              <EventCard event={event}
                                friendsAttending={hasFriendsAttending(event.id)} />
                            </Link>
                          ))
                        ) : (
                          <div className="empty-state">
                            <Calendar size={32} />
                            <p>No popular events yet</p>
                            <p>Check back later for popular events</p>
                          </div>
                        )}
                      </div>
                  )}
                </section>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="footer">
        <Link to="/" onClick={(e) => {
          if (location.pathname === '/') {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}>Hangout</Link>
      </footer>
    </div>
  );
};

export default Home;