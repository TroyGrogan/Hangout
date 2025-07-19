// THIS PAGE IS THE HOME PAGE OF THE APP.
// IT WAS PREVIOUSLY WRONGLY NAMED "EventList.jsx"
// AND STUFF GOT IMPLEMENTED ON TOP OF IT OVER TIME.
// NOW IT HAS BEEN PROPERLY REFACTORED TO BE NAMED "Home.jsx".

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User, Calendar, MapPin, Users, Search, Menu, X, ChevronDown, ChevronUp, LocateFixed } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axiosInstance from '../../services/axios';
import { useAuth } from '../../contexts/AuthContext';
// import { fetchAllCategoriesWithPagination, fetchSubcategories } from '../../services/categoryService';
// ^^Dynamically fetches subcategories on click. Is very stuttery and stiff.^^
import { fetchAllCategories } from '../../services/categoryService';
import categorySearchService from '../../services/categorySearchService';
import './Home.css';

// Configure Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Map marker component for location selection
function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position} />
  );
}

// Calendar helper functions
const formatDateForDisplay = (date) => {
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
};

const getWeekendDates = () => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  // Calculate days until Friday (5)
  let daysUntilFriday = (5 - dayOfWeek + 7) % 7;
  if (daysUntilFriday === 0 && dayOfWeek !== 5) {
    daysUntilFriday = 7; // If today is not Friday, get next Friday
  }
  
  const friday = new Date(today);
  friday.setDate(today.getDate() + daysUntilFriday);
  
  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);
  
  return { start: friday, end: sunday };
};

const isSameDay = (date1, date2) => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

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
      {/* Event Image */}
      {event.image_url && (
        <div className="event-image-container">
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
          <img 
            src={event.image_url} 
            alt={event.name}
            className="event-image"
            loading="lazy"
          />
        </div>
      )}
      
      {/* For events without images, show badges in original position */}
      {!event.image_url && (
        <>
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
        </>
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
  const { user, isGuest, logout, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // --- Component State (excluding fetched data) ---
  const [categoryHierarchy, setCategoryHierarchy] = useState({ root: [] });
  const [categoryMap, setCategoryMap] = useState(new Map());
  const [displayedCategoryLevels, setDisplayedCategoryLevels] = useState([]);
  const [selectionPath, setSelectionPath] = useState([]);
  const [showPreferredOnly, setShowPreferredOnly] = useState(false); // Keep this for filtering main categories
  const [hidePastEvents, setHidePastEvents] = useState(false);
  const [eventsWithFriends, setEventsWithFriends] = useState(new Set()); // Initialize as Set
  const [searchLocation, setSearchLocation] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLocationFiltered, setIsLocationFiltered] = useState(false);
  const [searchRadius, setSearchRadius] = useState(20);
  const [userLocation, setUserLocation] = useState(null); // State for user's coordinates
  const [isCurrentLocationUsed, setIsCurrentLocationUsed] = useState(false); // Track if current location button was used
  const [scrollToLevel, setScrollToLevel] = useState(null);
  const categorySectionsContainerRef = useRef(null);
  const categoryDetailSectionRef = useRef(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // --- Map-related state ---
  const [showMap, setShowMap] = useState(false);
  const [mapPosition, setMapPosition] = useState({ lat: 33.9937, lng: -81.0299 }); // Default to Columbia, SC
  const [geocoding, setGeocoding] = useState(false);
  const [searchingField, setSearchingField] = useState(null);
  const [locationFound, setLocationFound] = useState(false);
  
  // State for location validation errors
  const [locationError, setLocationError] = useState(null);
  const [locationErrorType, setLocationErrorType] = useState(null); // 'location' or 'zip'

  // --- Calendar-related state ---
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedStartDate, setSelectedStartDate] = useState(null);
  const [selectedEndDate, setSelectedEndDate] = useState(null);
  const [calendarMode, setCalendarMode] = useState('select'); // 'today', 'weekend', 'select'
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [isSelectingRange, setIsSelectingRange] = useState(false);
  const [datesAvailableText, setDatesAvailableText] = useState('');
  const [isMultiYearRange, setIsMultiYearRange] = useState(false);

  // --- Error state for backend connectivity ---
  const [backendConnected, setBackendConnected] = useState(true);

  // --- Category Search State ---
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [isCategorySearching, setIsCategorySearching] = useState(false);
  const [categorySearchResults, setCategorySearchResults] = useState(null);
  const [categorySearchFound, setCategorySearchFound] = useState(false);
  const [selectedCategoryBubble, setSelectedCategoryBubble] = useState(null);
  const [cameFromCategorySearch, setCameFromCategorySearch] = useState(false);

  // --- New Search Mode State ---
  const [searchMode, setSearchMode] = useState('none'); // 'none', 'dates', 'location', 'category'
  const [eventSearchTerm, setEventSearchTerm] = useState(''); // For category-based event search
  const [isEventSearchActive, setIsEventSearchActive] = useState(false);

  // --- Refs ---
  const calendarRef = useRef(null);
  const categorySearchSectionRef = useRef(null);
  const eventsNearYouRef = useRef(null);
  const eventsAnchorRef = useRef(null);

  // --- React Query Data Fetching ---

  // Events query - now public for all users including guests
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

  // Query for Friends - only for authenticated users
  const friendsQuery = useQuery({ 
    queryKey: ['friends'], 
    queryFn: fetchFriends,
    enabled: Boolean(user && !authLoading), // Only fetch for authenticated users after auth is loaded
    staleTime: 1000 * 60 * 15, // 15 minutes
    cacheTime: 1000 * 60 * 30,  // 30 minutes
    // Don't fail hard on errors
    retry: 1,
    onError: () => setBackendConnected(false)
  });

  // Query for User Preferences - only for authenticated users
  const preferencesQuery = useQuery({ 
    queryKey: ['preferences'], 
    queryFn: fetchPreferences,
    enabled: Boolean(user && !authLoading), // Only fetch for authenticated users after auth is loaded
    staleTime: 1000 * 60 * 30, // 30 minutes
    cacheTime: 1000 * 60 * 60,  // 60 minutes
    // Don't fail hard on errors
    retry: 1,
    onError: () => setBackendConnected(false)
  });

  // Query for Friends' Events - only for authenticated users
  const friendEventsQuery = useQuery({ 
    queryKey: ['friendEvents'], 
    queryFn: fetchFriendEvents,
    enabled: Boolean(user && !authLoading), // Only fetch for authenticated users after auth is loaded
    staleTime: 1000 * 60 * 10, // 10 minutes
    cacheTime: 1000 * 60 * 30,  // 30 minutes
    // Don't fail hard on errors 
    retry: 1,
    onError: () => setBackendConnected(false)
  });

  // Query for Popular Events - now public for all users including guests
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
    // Enable if geolocation available OR text search active (now public for guests too)
    enabled: !!userLocation || (isLocationFiltered && !!searchLocation.trim()),
    staleTime: 1000 * 60 * 5, // 5 minutes - shorter for location-based data
    cacheTime: 1000 * 60 * 15, // 15 minutes
    // Don't fail hard on errors
    retry: 1,
    onError: () => setBackendConnected(false)
  });

  // --- Derived Data and State Updates from Queries ---

  // Update set of events friends are attending
  useEffect(() => {
    if (friendEventsQuery.data) {
      const friendEventIds = new Set(friendEventsQuery.data.map(event => event.id));
      setEventsWithFriends(friendEventIds);
    }
  }, [friendEventsQuery.data]);


  // Removed automatic geolocation - now handled by user button click


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
        
        // Initialize category search service
        categorySearchService.initialize().catch(error => {
          console.error('Failed to initialize category search service:', error);
        });
        
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
          let element = null;
          let scrollOptions = { behavior: 'smooth', block: 'center' };
          
          // Special handling for events-section-anchor to use ref and custom positioning
          if (elementId === 'events-section-anchor' && eventsAnchorRef.current) {
            element = eventsAnchorRef.current;
            scrollOptions = { behavior: 'smooth', block: 'start' };
            console.log('Using ref for events-section-anchor scroll');
          } else {
            element = document.getElementById(elementId);
          }
          
          if (element) {
            console.log(`Found element with ID: ${elementId}, scrolling...`);
            element.scrollIntoView(scrollOptions);
          } else {
            console.log(`Element with ID: ${elementId} not found`);
          }
        }, 150); // Slightly longer timeout to ensure rendering
      }
    };

    // Handle hash on initial load and when location changes
    handleHashScroll();
  }, [location.hash]); // Dependency on location.hash

  // Effect: Handle clicking outside calendar to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    };

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showCalendar]);

  // Effect: Load search values from sessionStorage on component mount
  useEffect(() => {
    try {
      // Load search location
      const savedSearchLocation = sessionStorage.getItem('hangout_searchLocation');
      const savedIsLocationFiltered = sessionStorage.getItem('hangout_isLocationFiltered');
      
      if (savedSearchLocation) {
        setSearchLocation(savedSearchLocation);
      }
      if (savedIsLocationFiltered) {
        setIsLocationFiltered(JSON.parse(savedIsLocationFiltered));
      }

      // Load user location (coordinates)
      const savedUserLocation = sessionStorage.getItem('hangout_userLocation');
      if (savedUserLocation) {
        setUserLocation(JSON.parse(savedUserLocation));
      }

      // Load dates
      const savedStartDate = sessionStorage.getItem('hangout_selectedStartDate');
      const savedEndDate = sessionStorage.getItem('hangout_selectedEndDate');
      
      if (savedStartDate) {
        setSelectedStartDate(new Date(savedStartDate));
      }
      if (savedEndDate) {
        setSelectedEndDate(new Date(savedEndDate));
      }

      // Load search term
      const savedEventSearchTerm = sessionStorage.getItem('hangout_eventSearchTerm');
      if (savedEventSearchTerm) {
        setEventSearchTerm(savedEventSearchTerm);
        setIsEventSearchActive(true);
      }

      // Load dates available text
      const savedDatesAvailableText = sessionStorage.getItem('hangout_datesAvailableText');
      if (savedDatesAvailableText) {
        setDatesAvailableText(savedDatesAvailableText);
      }

      // Load search radius
      const savedSearchRadius = sessionStorage.getItem('hangout_searchRadius');
      if (savedSearchRadius) {
        setSearchRadius(parseInt(savedSearchRadius, 10));
      }

      console.log('Search values loaded from sessionStorage');
    } catch (error) {
      console.error('Error loading search values from sessionStorage:', error);
    }
  }, []); // Run only on component mount

  // Effect: Save search location to sessionStorage when it changes
  useEffect(() => {
    try {
      sessionStorage.setItem('hangout_searchLocation', searchLocation);
    } catch (error) {
      console.error('Error saving searchLocation to sessionStorage:', error);
    }
  }, [searchLocation]);

  // Effect: Save location filtered state to sessionStorage when it changes
  useEffect(() => {
    try {
      sessionStorage.setItem('hangout_isLocationFiltered', JSON.stringify(isLocationFiltered));
    } catch (error) {
      console.error('Error saving isLocationFiltered to sessionStorage:', error);
    }
  }, [isLocationFiltered]);

  // Effect: Save user location to sessionStorage when it changes
  useEffect(() => {
    try {
      if (userLocation) {
        sessionStorage.setItem('hangout_userLocation', JSON.stringify(userLocation));
      } else {
        sessionStorage.removeItem('hangout_userLocation');
      }
    } catch (error) {
      console.error('Error saving userLocation to sessionStorage:', error);
    }
  }, [userLocation]);

  // Effect: Save selected dates to sessionStorage when they change
  useEffect(() => {
    try {
      if (selectedStartDate) {
        sessionStorage.setItem('hangout_selectedStartDate', selectedStartDate.toISOString());
      } else {
        sessionStorage.removeItem('hangout_selectedStartDate');
      }
    } catch (error) {
      console.error('Error saving selectedStartDate to sessionStorage:', error);
    }
  }, [selectedStartDate]);

  useEffect(() => {
    try {
      if (selectedEndDate) {
        sessionStorage.setItem('hangout_selectedEndDate', selectedEndDate.toISOString());
      } else {
        sessionStorage.removeItem('hangout_selectedEndDate');
      }
    } catch (error) {
      console.error('Error saving selectedEndDate to sessionStorage:', error);
    }
  }, [selectedEndDate]);

  // Effect: Save event search term to sessionStorage when it changes
  useEffect(() => {
    try {
      if (eventSearchTerm.trim()) {
        sessionStorage.setItem('hangout_eventSearchTerm', eventSearchTerm);
      } else {
        sessionStorage.removeItem('hangout_eventSearchTerm');
      }
    } catch (error) {
      console.error('Error saving eventSearchTerm to sessionStorage:', error);
    }
  }, [eventSearchTerm]);

  // Effect: Save dates available text to sessionStorage when it changes
  useEffect(() => {
    try {
      if (datesAvailableText.trim()) {
        sessionStorage.setItem('hangout_datesAvailableText', datesAvailableText);
      } else {
        sessionStorage.removeItem('hangout_datesAvailableText');
      }
    } catch (error) {
      console.error('Error saving datesAvailableText to sessionStorage:', error);
    }
  }, [datesAvailableText]);

  // Effect: Save search radius to sessionStorage when it changes
  useEffect(() => {
    try {
      sessionStorage.setItem('hangout_searchRadius', searchRadius.toString());
    } catch (error) {
      console.error('Error saving searchRadius to sessionStorage:', error);
    }
  }, [searchRadius]);

  // Check if friends are attending an event
  const hasFriendsAttending = (eventId) => {
    return eventsWithFriends.has(eventId);
  };

  // --- Enhanced Search Filtering Functions ---
  const getFilteredEventsBySearch = useCallback(() => {
    let filteredEvents = eventsQuery.data || [];
    
    // Check which search inputs are active
    const hasDateFilter = !!selectedStartDate;
    const hasLocationFilter = !!(userLocation || isLocationFiltered);
    const hasCategoryFilter = !!eventSearchTerm.trim();
    
    // Start with location filtering if location is specified
    if (hasLocationFilter) {
      filteredEvents = nearbyEventsQuery.data || [];
    }
    
    // Apply date filtering
    if (hasDateFilter && selectedStartDate) {
      filteredEvents = filteredEvents.filter(event => {
        const eventDate = new Date(event.start_time);
        if (selectedEndDate && !isSameDay(selectedStartDate, selectedEndDate)) {
          // Date range
          return eventDate >= selectedStartDate && eventDate <= selectedEndDate;
        } else {
          // Single date
          return isSameDay(eventDate, selectedStartDate);
        }
      });
    }
    
    // Apply category filtering
    if (hasCategoryFilter) {
      filteredEvents = filteredEvents.filter(event => 
        event.name && event.name.toLowerCase().includes(eventSearchTerm.toLowerCase())
      );
    }
    
    // If no filters are active, show location-based events or empty array
    if (!hasDateFilter && !hasLocationFilter && !hasCategoryFilter) {
      if (userLocation || isLocationFiltered) {
        return nearbyEventsQuery.data || [];
      }
      return []; // Return empty array when no location is selected
    }
    
    return filteredEvents;
  }, [selectedStartDate, selectedEndDate, eventSearchTerm, nearbyEventsQuery.data, eventsQuery.data, userLocation, isLocationFiltered]);

  const getEventsTitle = () => {
    // Check which search inputs are active
    const hasDateFilter = !!selectedStartDate;
    const hasLocationFilter = !!(userLocation || isLocationFiltered);
    const hasCategoryFilter = !!eventSearchTerm.trim();
    
    // Helper function to format dates
    const formatDate = (date) => {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    };
    
    // Generate date text
    let dateText = '';
    if (hasDateFilter) {
      if (selectedEndDate && !isSameDay(selectedStartDate, selectedEndDate)) {
        // Date range
        dateText = `from "${formatDate(selectedStartDate)} to ${formatDate(selectedEndDate)}"`;
      } else {
        // Single date
        dateText = `on "${formatDate(selectedStartDate)}"`;
      }
    }
    
    // Generate location text
    const locationText = hasLocationFilter ? 
      (searchLocation.trim() ? `"${searchLocation}"` : "your current location") : '';
    
    // Generate category text
    const categoryText = hasCategoryFilter ? `"${eventSearchTerm.trim()}"` : '';
    
    // Handle all combinations
    if (hasDateFilter && hasLocationFilter && hasCategoryFilter) {
      // All 3: Date + Location + Category
      return `Showing ${categoryText} Events occurring ${dateText}, Located in: ${locationText}`;
    } else if (hasDateFilter && hasCategoryFilter) {
      // Date + Category
      return `Showing All ${categoryText} Events that occur ${dateText}`;
    } else if (hasDateFilter && hasLocationFilter) {
      // Date + Location
      return `Showing All Events that occur ${dateText}, Located in: ${locationText}`;
    } else if (hasLocationFilter && hasCategoryFilter) {
      // Location + Category
      return `Showing all ${categoryText} events that are Located in: ${locationText}`;
    } else if (hasDateFilter) {
      // Date only
      return `Showing All Events Occurring ${dateText.charAt(0).toUpperCase() + dateText.slice(1)}`;
    } else if (hasLocationFilter) {
      // Location only
      return `Showing All Events Located In ${locationText}`;
    } else if (hasCategoryFilter) {
      // Category only
      return `Showing All Events Related To ${categoryText}`;
    } else {
      // No filters
      return isCurrentLocationUsed ? "Events Near You" : "Events";
    }
  };

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

    // Reset the flag when user navigates categories manually (not through search)
    setCameFromCategorySearch(false);

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

  // --- Map and Geocoding Functions ---
  const geocodeAddress = async (address) => {
    if (!address.trim()) return;
    
    setGeocoding(true);
    setSearchingField('location');
    setLocationFound(false); // Reset location found state
    setLocationError(null); // Reset error state
    setLocationErrorType(null);
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'HangoutWebApp/1.0'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const newPosition = {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        };
        setMapPosition(newPosition);
        
        // Update the nearby events query with the new coordinates
        setUserLocation(newPosition);
        setLocationFound(true);
        setIsLocationFiltered(true); // Enable location filtering for manual location entry
        setIsCurrentLocationUsed(false); // Mark that manual location entry was used
        
        // Hide the success message after 1.5 seconds
        setTimeout(() => {
          setLocationFound(false);
        }, 1500);
      } else {
        // Determine if it's a ZIP code or location based on input format
        const isZipCode = /^\d{5}(-\d{4})?$/.test(address.trim());
        
        if (isZipCode) {
          setLocationError(address.trim());
          setLocationErrorType('zip');
        } else {
          setLocationError(address.trim());
          setLocationErrorType('location');
        }
        
        // Hide the error message after 1.5 seconds
        setTimeout(() => {
          setLocationError(null);
          setLocationErrorType(null);
        }, 1500);
        
        console.warn('Address not found');
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      // On network error, show generic location error
      setLocationError(address.trim());
      setLocationErrorType('location');
      
      // Hide the error message after 1.5 seconds
      setTimeout(() => {
        setLocationError(null);
        setLocationErrorType(null);
      }, 1500);
    } finally {
      setGeocoding(false);
      setSearchingField(null);
    }
  };

  const handleAddressKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const searchValue = e.target.value;
      if (searchValue.trim()) {
        geocodeAddress(searchValue);
      }
    }
  };

  const toggleMap = () => {
    setShowMap(!showMap);
  };

  const handleLocationSearch = async (e) => {
    e.preventDefault();
    const trimmedLocation = searchLocation.trim();
    
    // If location is empty, clear the events box and return to original state
    if (!trimmedLocation) {
      clearLocationFilter();
      return;
    }

    // Update state to trigger queryKey change and refetch
    setIsSearching(true);
    setIsLocationFiltered(true);
    setSearchLocation(trimmedLocation);
    
    // Mark that manual location entry was used (not current location button)
    setIsCurrentLocationUsed(false);
    
    // Reset isSearching state when the query completes
    nearbyEventsQuery.refetch().finally(() => {
      setIsSearching(false);
    });
  };

  const clearLocationFilter = async () => {
    setSearchLocation('');
    setIsLocationFiltered(false);
    setLocationFound(false);
    setLocationError(null); // Clear error state
    setLocationErrorType(null);
    setIsCurrentLocationUsed(false); // Reset current location flag
    setUserLocation(null); // Clear user location to return to original state
    
    // Reset isSearching state when the query completes
    setTimeout(() => {
      setIsSearching(false);
    }, 500);
  };

  const handleCurrentLocation = async () => {
    console.log("🎯 LOCATION BUTTON CLICKED - Enhanced mobile support");
    
    // Check if we're on mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    console.log("📱 Mobile device detected:", isMobile);
    
    if ("geolocation" in navigator) {
      // Check current permission state first
      let permissionState = 'unknown';
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        permissionState = permission.state;
        console.log("🔍 Current permission state:", permissionState);
      } catch (e) {
        console.log("❌ Permissions API not supported (common on mobile)");
      }

      // If permission is already denied, provide helpful guidance
      if (permissionState === 'denied') {
        console.log("🚫 Permission is cached as denied");
        
        // Focus on the manual input field to guide user
        const locationInput = document.querySelector('input[placeholder*="Location"]');
        if (locationInput) {
          locationInput.focus();
        }
        
        // Show mobile-specific message
        const message = isMobile 
          ? 'You can type your current location above.'
          : 'You can type your current location above.';
        
        setLocationError(message);
        setLocationErrorType('location');
        
        setTimeout(() => {
          setLocationError(null);
          setLocationErrorType(null);
        }, 5000); // Longer timeout for mobile users to read
        
        return;
      }

      // If permission is granted, proceed normally
      if (permissionState === 'granted') {
        console.log("✅ Permission already granted, getting location");
        
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              resolve,
              reject,
              {
                enableHighAccuracy: isMobile, // Use GPS on mobile for better accuracy
                timeout: isMobile ? 20000 : 8000, // Longer timeout for mobile
                maximumAge: 60000 // Allow 1 minute cache for granted permissions
              }
            );
          });
          
          await processLocationSuccess(position);
          return;
        } catch (error) {
          console.log("❌ Location request failed despite granted permission:", error);
          // Fall through to permission request
        }
      }

      // For 'prompt' state or unknown, attempt to get location
      console.log("🔄 Attempting location request with mobile optimizations...");
      
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              enableHighAccuracy: isMobile, // Use GPS on mobile for better accuracy  
              timeout: isMobile ? 25000 : 10000, // Much longer timeout for mobile
              maximumAge: 0 // Always get fresh location
            }
          );
        });
        
        console.log("✅ Location request successful");
        await processLocationSuccess(position);
        
      } catch (error) {
        console.log("⚠️ Location request failed:", error);
        
        if (error.code === error.PERMISSION_DENIED) {
          console.log("🚫 User denied permission");
          
          // Focus on manual input as fallback
          const locationInput = document.querySelector('input[placeholder*="Location"]');
          if (locationInput) {
            locationInput.focus();
            locationInput.setAttribute('placeholder', 'Enter your location manually');
          }
          
          // Show encouraging message about manual input
          const message = isMobile 
            ? 'You can type your current location above.'
            : 'You can type your current location above.';
          
          setLocationError(message);
          setLocationErrorType('location');
          
          setTimeout(() => {
            setLocationError(null);
            setLocationErrorType(null);
            // Reset placeholder
            if (locationInput) {
              locationInput.setAttribute('placeholder', 'Enter Location or ZIP Code');
            }
          }, 4000);
          
        } else if (error.code === error.TIMEOUT) {
          console.log("⏱️ Request timed out");
          const message = isMobile 
            ? 'You can type your current location above.'
            : 'You can type your current location above.';
          
          setLocationError(message);
          setLocationErrorType('location');
          
          setTimeout(() => {
            setLocationError(null);
            setLocationErrorType(null);
          }, 4000);
          
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          console.log("📍 Position unavailable");
          const message = isMobile 
            ? 'You can type your current location above.'
            : 'You can type your current location above.';
          
          setLocationError(message);
          setLocationErrorType('location');
          
          setTimeout(() => {
            setLocationError(null);
            setLocationErrorType(null);
          }, 4000);
          
        } else {
          console.log("❓ Unknown error occurred");
          const message = isMobile 
            ? 'You can type your current location above.'
            : 'You can type your current location above.';
          
          setLocationError(message);
          setLocationErrorType('location');
          
          setTimeout(() => {
            setLocationError(null);
            setLocationErrorType(null);
          }, 4000);
        }
      }

    } else {
      console.log("❌ Geolocation not available");
      const message = isMobile 
        ? 'You can type your current location above.'
        : 'You can type your current location above.';
      
      setLocationError(message);
      setLocationErrorType('location');
      
      setTimeout(() => {
        setLocationError(null);
        setLocationErrorType(null);
      }, 4000);
    }
  };

  const processLocationSuccess = async (position) => {
    const { latitude, longitude } = position.coords;
    
    // Set user location for the map
    setUserLocation({
      latitude,
      longitude,
    });
    
    // Mark that current location button was used
    setIsCurrentLocationUsed(true);
    
    // Update map position
    setMapPosition({
      lat: latitude,
      lng: longitude
    });
    
    // Reverse geocode to get the address
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'HangoutWebApp/1.0'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        const address = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        
        // Set the location in the input field
        setSearchLocation(address);
        
        // Trigger location search automatically
        setIsSearching(true);
        setIsLocationFiltered(true);
        setLocationFound(true);
        
        // Hide the success message after 1.5 seconds
        setTimeout(() => {
          setLocationFound(false);
        }, 1500);
        
        // Reset isSearching state when the query completes
        nearbyEventsQuery.refetch().finally(() => {
          setIsSearching(false);
        });
      } else {
        throw new Error('Reverse geocoding failed');
      }
    } catch (error) {
      console.error('Error getting address:', error);
      // Fall back to coordinates if reverse geocoding fails
      const coordsString = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      setSearchLocation(coordsString);
      setIsSearching(true);
      setIsLocationFiltered(true);
      setLocationFound(true);
      
       setTimeout(() => {
        setLocationFound(false);
      }, 1500);
      
      nearbyEventsQuery.refetch().finally(() => {
        setIsSearching(false);
      });
    }
  };

  const handleLocationError = (err) => {
    console.warn(`ERROR(${err.code}): ${err.message}`);
    // Handle location error
    setLocationError('Unable to get current location');
    setLocationErrorType('location');
    
    // Hide the error message after 1.5 seconds
    setTimeout(() => {
      setLocationError(null);
      setLocationErrorType(null);
    }, 1500);
  };

  // Category search handler functions
  const handleCategorySearch = async (e) => {
    e.preventDefault();
    
    if (!categorySearchTerm.trim()) {
      setCategorySearchResults(null);
      setCategorySearchFound(false);
      return;
    }

    setIsCategorySearching(true);
    setCategorySearchFound(false);

    try {
      console.log(`Searching categories for: "${categorySearchTerm}"`);
      const searchResults = await categorySearchService.searchCategories(categorySearchTerm.trim());
      
      console.log('Search results:', searchResults);
      
      if (searchResults.totalMatches > 0) {
        setCategorySearchResults(searchResults);
        setCategorySearchFound(true);
      } else {
        setCategorySearchResults({ results: [], mainCategories: [], totalMatches: 0 });
        setCategorySearchFound(false);
        
        // Hide the "No categories found" message after 1.5 seconds
        setTimeout(() => {
          setCategorySearchResults(null);
        }, 1500);
      }
    } catch (error) {
      console.error('Error searching categories:', error);
      setCategorySearchResults(null);
      setCategorySearchFound(false);
    } finally {
      setIsCategorySearching(false);
    }
  };

  const handleCategoryResultClick = async (mainCategory, targetCategory) => {
    console.log('Category result clicked:', { mainCategory, targetCategory });
    
    try {
      // Set the selected bubble state
      setSelectedCategoryBubble(mainCategory.id);
      
      // Set flag to indicate user came from category search
      setCameFromCategorySearch(true);
      
      // Get the full path to the target category
      const path = categorySearchService.getCategoryPath(targetCategory);
      console.log('Category path:', path);
      
      // Build selection path with IDs
      const selectionIds = path.map(cat => cat.id);
      setSelectionPath(selectionIds);
      
      // Build the displayed levels - we need to show each level in the hierarchy
      const levels = [];
      
      // Start with main categories
      levels.push(categoryHierarchy.root);
      
      // For each level in the path (except the main category which is already shown)
      for (let i = 1; i < path.length; i++) {
        const parentCategory = categoryMap.get(path[i - 1].id);
        if (parentCategory && parentCategory.children) {
          levels.push(parentCategory.children);
        }
      }
      
      setDisplayedCategoryLevels(levels);
      
      // Keep search results and found status visible after navigation
      // Note: NOT clearing search results or found status to preserve the search UI
      
      // Scroll to position the category detail section in the center of the viewport
      // This provides better visual focus and user experience
      setTimeout(() => {
        if (categoryDetailSectionRef.current) {
          categoryDetailSectionRef.current.scrollIntoView({ 
            behavior: 'smooth',
            block: 'center' // Center the category detail section in the viewport
          });
        }
      }, 100);
      
    } catch (error) {
      console.error('Error navigating to category:', error);
    }
  };

  const clearCategorySearch = () => {
    setCategorySearchTerm('');
    setCategorySearchResults(null);
    setCategorySearchFound(false);
    setSelectedCategoryBubble(null);
    setCameFromCategorySearch(false);
    
    // Also clear event search since they're connected
    setEventSearchTerm('');
    setIsEventSearchActive(false);
  };

  // Handler for event search (searching within event titles)
  const handleEventSearch = async (e) => {
    e.preventDefault();
    
    if (!categorySearchTerm.trim()) {
      // Clear event search if term is empty
      setEventSearchTerm('');
      setIsEventSearchActive(false);
      return;
    }

    // Update search term
    setEventSearchTerm(categorySearchTerm.trim());
    setIsEventSearchActive(true);
  };

  // Combined search handler that does both category and event search
  const handleCombinedSearch = async (e) => {
    e.preventDefault();
    
    if (!categorySearchTerm.trim()) {
      // Clear both searches if term is empty
      setCategorySearchResults(null);
      setCategorySearchFound(false);
      setEventSearchTerm('');
      setIsEventSearchActive(false);
      return;
    }

    // Do both category search and event search
    await handleCategorySearch(e);
    await handleEventSearch(e);
  };

  const clearEventSearch = () => {
    setCategorySearchTerm('');
    setEventSearchTerm('');
    setIsEventSearchActive(false);
  };

  const clearCombinedSearch = () => {
    // Clear category search
    setCategorySearchTerm('');
    setCategorySearchResults(null);
    setCategorySearchFound(false);
    setSelectedCategoryBubble(null);
    setCameFromCategorySearch(false);
    
    // Clear event search
    setEventSearchTerm('');
    setIsEventSearchActive(false);
  };

  const handleBackToCategorySearch = () => {
    // Scroll back to the category search section, centered in the viewport
    if (categorySearchSectionRef.current) {
      categorySearchSectionRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'center'
      });
    }
  };

  const handleBackToSearch = () => {
    // Scroll back to the search section, centered in the viewport
    if (categorySearchSectionRef.current) {
      categorySearchSectionRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'center'
      });
    }
  };

  // Check if any search input has content
  const hasAnySearchInput = () => {
    return !!(
      selectedStartDate || 
      (userLocation || isLocationFiltered) || 
      eventSearchTerm.trim()
    );
  };

  // Handle main search button click - works for all 3 search types
  const handleMainSearch = async (e) => {
    e.preventDefault();
    
    // If no search inputs, do nothing
    if (!hasAnySearchInput()) {
      return;
    }

    // Execute the appropriate search based on what inputs are filled
    if (categorySearchTerm.trim()) {
      await handleCombinedSearch(e);
    }
    
    if (searchLocation.trim()) {
      await handleLocationSearch(e);
    }
    
    // Dates search is already handled by the calendar functionality
    
    // Scroll to the events section
    setTimeout(() => {
      if (eventsNearYouRef.current) {
        eventsNearYouRef.current.scrollIntoView({ 
          behavior: 'smooth',
          block: 'center'
        });
      }
    }, 100);
  };

  // Calendar handler functions
  const toggleCalendar = () => {
    setShowCalendar(!showCalendar);
  };

  const handleCalendarDateClick = (date) => {
    if (calendarMode === 'select') {
      if (!isSelectingRange) {
        // First click - set start date
        setSelectedStartDate(date);
        setSelectedEndDate(null);
        setIsSelectingRange(true);
      } else {
        // Second click - set end date
        if (date < selectedStartDate) {
          // If clicked date is before start, swap them
          setSelectedEndDate(selectedStartDate);
          setSelectedStartDate(date);
        } else {
          setSelectedEndDate(date);
        }
        setIsSelectingRange(false);
      }
    }
  };

  const handleTodayClick = () => {
    const today = new Date();
    setSelectedStartDate(today);
    setSelectedEndDate(null);
    setCalendarMode('today');
    setIsSelectingRange(false);
    // Navigate calendar to current month/year
    setCalendarMonth(today.getMonth());
    setCalendarYear(today.getFullYear());
    
    // Update display text and multi-year state
    const displayText = formatDateForDisplay(today);
    setDatesAvailableText(displayText);
    setIsMultiYearRange(false); // Single date is never multi-year
  };

  const handleWeekendClick = () => {
    const { start, end } = getWeekendDates();
    setSelectedStartDate(start);
    setSelectedEndDate(end);
    setCalendarMode('weekend');
    setIsSelectingRange(false);
    // Navigate calendar to current month/year
    const today = new Date();
    setCalendarMonth(today.getMonth());
    setCalendarYear(today.getFullYear());
    
    // Update display text and multi-year state
    let displayText = '';
    let isMultiYear = false;
    
    if (start.getFullYear() === end.getFullYear()) {
      // Same year - show year only at the end
      const startDateWithoutYear = start.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric'
      });
      const endDateWithYear = formatDateForDisplay(end);
      displayText = `From ${startDateWithoutYear} to ${endDateWithYear}`;
      isMultiYear = false;
    } else {
      // Different years - show year for both dates
      displayText = `From ${formatDateForDisplay(start)} to ${formatDateForDisplay(end)}`;
      isMultiYear = true;
    }
    
    setDatesAvailableText(displayText);
    setIsMultiYearRange(isMultiYear);
  };

  const handleSelectMultipleClick = () => {
    setCalendarMode('select');
    setSelectedStartDate(null);
    setSelectedEndDate(null);
    setIsSelectingRange(false);
  };

  const handleCalendarClear = () => {
    // Clear all date selections
    setSelectedStartDate(null);
    setSelectedEndDate(null);
    setDatesAvailableText('');
    setIsMultiYearRange(false);
    setIsSelectingRange(false);
    setCalendarMode('select'); // Reset to select mode
  };

  const handleSetClick = () => {
    if (selectedStartDate) {
      let displayText = '';
      let isMultiYear = false;
      
      if (selectedEndDate && !isSameDay(selectedStartDate, selectedEndDate)) {
        // Multiple dates - check if they span different years
        if (selectedStartDate.getFullYear() === selectedEndDate.getFullYear()) {
          // Same year - show year only at the end
          const startDateWithoutYear = selectedStartDate.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric'
          });
          const endDateWithYear = formatDateForDisplay(selectedEndDate);
          displayText = `From ${startDateWithoutYear} to ${endDateWithYear}`;
          isMultiYear = false;
        } else {
          // Different years - show year for both dates
          displayText = `From ${formatDateForDisplay(selectedStartDate)} to ${formatDateForDisplay(selectedEndDate)}`;
          isMultiYear = true;
        }
      } else {
        // Single date
        displayText = formatDateForDisplay(selectedStartDate);
        isMultiYear = false;
      }
      
      setDatesAvailableText(displayText);
      setIsMultiYearRange(isMultiYear);
      setShowCalendar(false);
    }
  };

  const navigateCalendar = (direction) => {
    if (direction === 'prev') {
      if (calendarMonth === 0) {
        setCalendarMonth(11);
        setCalendarYear(calendarYear - 1);
      } else {
        setCalendarMonth(calendarMonth - 1);
      }
    } else {
      if (calendarMonth === 11) {
        setCalendarMonth(0);
        setCalendarYear(calendarYear + 1);
      } else {
        setCalendarMonth(calendarMonth + 1);
      }
    }
  };

  const renderCalendar = () => {
    if (!showCalendar) return null;

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const daysOfWeekShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDate = new Date(startDate);
    
    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const today = new Date();
    
    const isDateInRange = (date) => {
      if (!selectedStartDate) return false;
      if (!selectedEndDate) return isSameDay(date, selectedStartDate);
      return date >= selectedStartDate && date <= selectedEndDate;
    };

    const isDateSelected = (date) => {
      return (selectedStartDate && isSameDay(date, selectedStartDate)) ||
             (selectedEndDate && isSameDay(date, selectedEndDate));
    };

    return (
      <div className="calendar-dropdown" ref={calendarRef}>
        <div className="calendar-header">
          <button type="button" onClick={() => navigateCalendar('prev')} className="calendar-nav-btn">
            &#8249;
          </button>
          <h3 className="calendar-month-year">
            {monthNames[calendarMonth]} {calendarYear}
          </h3>
          <button type="button" onClick={() => navigateCalendar('next')} className="calendar-nav-btn">
            &#8250;
          </button>
        </div>
        
        <div className="calendar-controls">
          <button 
            type="button" 
            onClick={handleTodayClick}
            className={`calendar-control-btn ${calendarMode === 'today' ? 'active' : ''}`}
          >
            Today
          </button>
          <button 
            type="button" 
            onClick={handleWeekendClick}
            className={`calendar-control-btn ${calendarMode === 'weekend' ? 'active' : ''}`}
          >
            This Weekend
          </button>
          <button 
            type="button" 
            onClick={handleSelectMultipleClick}
            className={`calendar-control-btn ${calendarMode === 'select' ? 'active' : ''}`}
          >
            Select
          </button>
          <button 
            type="button" 
            onClick={handleCalendarClear}
            className="calendar-clear-btn"
          >
            Clear
          </button>
          <button 
            type="button" 
            onClick={handleSetClick}
            className="calendar-set-btn"
            disabled={!selectedStartDate}
          >
            Set
          </button>
        </div>

        <div className="calendar-grid">
          <div className="calendar-weekdays">
            {daysOfWeek.map((day, index) => (
              <div key={day} className="calendar-weekday">
                <span className="weekday-full">{day}</span>
                <span className="weekday-short">{daysOfWeekShort[index]}</span>
              </div>
            ))}
          </div>
          <div className="calendar-days">
            {days.map((date, index) => {
              const isCurrentMonth = date.getMonth() === calendarMonth;
              const isToday = isSameDay(date, today);
              const inRange = isDateInRange(date);
              const selected = isDateSelected(date);
              
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleCalendarDateClick(date)}
                  className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${inRange ? 'in-range' : ''} ${selected ? 'selected' : ''}`}
                  disabled={!isCurrentMonth}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
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
  const isLoadingEssential = categoriesQuery.isLoading || authLoading;

  // Show loading state while auth is being determined or categories are loading
  if (isLoadingEssential) {
    return (
      <div className="page-container home-page" style={{ 
        backgroundColor: '#00B488',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '2px solid transparent',
          borderTop: '2px solid #3B5998',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
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

  // --- Data Extraction (use default values with safety checks) ---
  const allCategories = Array.isArray(categoriesQuery.data) ? categoriesQuery.data : [];
  const userPreferences = Array.isArray(preferencesQuery.data?.preferred_categories) ? preferencesQuery.data.preferred_categories : [];
  // Use friendEventsQuery.data directly where needed, same for popularEventsQuery.data
  const nearbyEventsData = Array.isArray(nearbyEventsQuery.data) ? nearbyEventsQuery.data : [];
  const friendEventsData = Array.isArray(friendEventsQuery.data) ? friendEventsQuery.data.slice(0, 5) : [];
  const popularEventsData = Array.isArray(popularEventsQuery.data) ? popularEventsQuery.data.slice(0, 5) : [];


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
    <div className="page-container home-page" style={{ backgroundColor: '#00B488' }}>
      {/* 1. Main Navigation */}
      <nav className="main-nav">
        <Link to="/" className="nav-brand">
          Hangout
        </Link>
        <div className="nav-links-desktop">
          {!user ? (
            <>
              <Link to="/signup" className="nav-link">Sign Up</Link>
              <Link to="/login" className="logout-btn">Login</Link>
            </>
          ) : (
            <>
              <Link to="/events/create" className="nav-link">Create Event</Link>
              <Link to="/dashboard" className="nav-link">My Events</Link>
              <Link to="/profile" className="nav-link">Profile</Link>
              <button onClick={() => {
                logout();
                navigate('/login');
                setIsMenuOpen(false);
              }} className="logout-btn">Logout</button>
            </>
          )}
        </div>
        <button className="hamburger-icon" onClick={() => setIsMenuOpen(true)}>
          <Menu size={28} />
        </button>
      </nav>

      {/* Secondary Navigation */}
      <div className="secondary-nav" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%'
      }}>
        <div className="nav-links" style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          flexGrow: 1,
          textAlign: 'center'
        }}>
          <Link to="/" className={isActive('/') ? 'active' : ''} style={{
            flex: '1',
            textAlign: 'center',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>Home</Link>
          <Link to="/suggester" className={isActive('/suggester') ? 'active' : ''} style={{
            flex: '1',
            textAlign: 'center',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>Suggester</Link>
          <Link to="/calendar" className={isActive('/calendar') ? 'active' : ''} style={{
            flex: '1',
            textAlign: 'center',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>Calendar</Link>
        </div>
      </div>

      {/* Side Menu */}
      <div className={`side-menu ${isMenuOpen ? 'open' : ''}`}>
        <div className="side-menu-header">
          <span className="nav-brand">
            Hangout
          </span>
          <button className="close-btn" onClick={() => setIsMenuOpen(false)}>
            <X size={28} />
          </button>
        </div>
        <div className="side-menu-links">
          {!user ? (
            <>
              <Link to="/signup" className="nav-link" onClick={() => setIsMenuOpen(false)}>Sign Up</Link>
              <Link to="/login" className="logout-btn" onClick={() => setIsMenuOpen(false)}>Login</Link>
            </>
          ) : (
            <>
              <Link to="/events/create" className="nav-link" onClick={() => setIsMenuOpen(false)}>Create Event</Link>
              <Link to="/dashboard" className="nav-link" onClick={() => setIsMenuOpen(false)}>My Events</Link>
              <Link to="/profile" className="nav-link" onClick={() => setIsMenuOpen(false)}>Profile</Link>
              <button onClick={() => {
                  logout();
                  navigate('/login');
                  setIsMenuOpen(false);
                }} className="logout-btn">Logout</button>
            </>
          )}
        </div>
      </div>
      {isMenuOpen && <div className="overlay" onClick={() => setIsMenuOpen(false)}></div>}

      {/* Display connection warning if backend is not connected */}
      {renderBackendConnectionWarning()}

      {/* SEARCH SECTION */}
      {/* Extra spacer div for consistent vertical spacing */}
      <div className="toggle-spacer calendar-spacer"></div>

      <div className="location-search-container" ref={categorySearchSectionRef}>
        <form className="search-form-wrapper" onSubmit={handleLocationSearch}>
          <div className="search-row">
            <Calendar size={20} className="calendar-icon" />
            <div className="dates-input-container">
              <input
                type="text"
                placeholder="Dates Available"
                className={`dates-input ${isMultiYearRange ? 'multi-year-range' : ''}`}
                value={datesAvailableText}
                onClick={toggleCalendar}
                readOnly
                onKeyDown={(e) => {
                  // Allow users to clear with backspace/delete
                  if (e.key === 'Backspace' || e.key === 'Delete') {
                    setSelectedStartDate(null);
                    setSelectedEndDate(null);
                    setDatesAvailableText('');
                  }
                }}
              />
              {/* Calendar dropdown */}
              {renderCalendar()}
            </div>
          </div>
          
          <div className="search-row location-row">
            <MapPin size={20} className="location-pin-icon" />
            <div className="location-input-container">
              <input
                type="text"
                placeholder="Enter Location or ZIP Code"
                value={searchLocation}
                onChange={(e) => {
                  setSearchLocation(e.target.value);
                  setLocationFound(false); // Reset location found state when user starts typing
                  setLocationError(null); // Clear error state when user starts typing
                  setLocationErrorType(null);
                }}
                onKeyDown={handleAddressKeyPress}
                className="location-search-input"
                disabled={geocoding}
              />
              <button
                type="button"
                onClick={handleCurrentLocation}
                onTouchStart={() => {}} // Ensure touch events are handled properly
                className="current-location-button"
                title="Use current location"
                disabled={geocoding}
                aria-label="Use current location"
              >
                <LocateFixed size={20} />
              </button>
            </div>
            <button
              type="button"
              onClick={toggleMap}
              className="see-map-button"
            >
              {showMap ? <ChevronUp size={20} className="see-map-arrow" /> : <ChevronDown size={20} className="see-map-arrow" />}
              <span className="see-map-text">{showMap ? 'Close Map' : 'See Map'}</span>
            </button>
          </div>
          
          {/* Geocoding indicator */}
          {geocoding && searchingField === 'location' && (
            <div className="geocoding-indicator">
              <span>🔍 Searching for location...</span>
            </div>
          )}
          
          {/* Location found success indicator */}
          {locationFound && !geocoding && (
            <div className="location-found-indicator">
              <span>✅ Location Found!</span>
            </div>
          )}
          
          {/* Location error message */}
          {locationError && !geocoding && (
            <div className="location-error">
              <span>
                                  {locationErrorType === 'zip' 
                    ? `❌ Invalid ZIP Code. Please enter a valid ZIP Code.`
                    : locationError.includes('❌') 
                      ? locationError
                      : `💡 ${locationError}`
                  }
              </span>
            </div>
          )}
          
          {/* Location search results when map is closed */}
          {!showMap && isLocationFiltered && (userLocation || searchLocation.trim()) && (
            <>
              <div className="search-results-summary">
                Showing events within {searchRadius} miles of "{searchLocation}"
              </div>
              <button
                type="button"
                onClick={clearLocationFilter}
                className="clear-search-button"
              >
                Clear Search
              </button>
            </>
          )}
          
          {/* Expandable Map Section */}
          {showMap && (
            <div className="map-section">
              <h2 className="section-title map-title">Map</h2>
              <div className="map-container">
                <MapContainer
                  center={mapPosition}
                  zoom={13}
                  style={{ height: "100%", width: "100%" }}
                  key={`${mapPosition.lat}-${mapPosition.lng}`}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <LocationMarker position={mapPosition} setPosition={setMapPosition} />
                </MapContainer>
              </div>
              
              {/* Location search results when map is open */}
              {isLocationFiltered && (userLocation || searchLocation.trim()) && (
                <>
                  <div className="search-results-summary">
                    Showing events within {searchRadius} miles of "{searchLocation}"
                  </div>
                  <button
                    type="button"
                    onClick={clearLocationFilter}
                    className="clear-search-button"
                  >
                    Clear Search
                  </button>
                </>
              )}
            </div>
          )}
          
          <div className="search-row">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Search Categories For Events"
              className="search-categories-input"
              value={categorySearchTerm}
              onChange={(e) => setCategorySearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCombinedSearch(e);
                }
              }}
            />
          </div>
          
          {/* Category search indicator */}
          {isCategorySearching && (
            <div className="category-searching-indicator">
              <span>🔍 Searching Categories for "{categorySearchTerm}"...</span>
            </div>
          )}
          
          {/* Category search results */}
          {categorySearchFound && categorySearchResults && (
            <div className="category-search-found-indicator">
              <span>✅ Search Term Found!</span>
            </div>
          )}
          
          {/* Category search results display */}
          {categorySearchResults && categorySearchResults.mainCategories.length > 0 && (
            <div className="category-search-results">
              {categorySearchResults.mainCategories.length === 1 ? (
                <div className="category-search-result-text">
                  <p>Found "{categorySearchTerm}" in the following Life Category:</p>
                </div>
              ) : (
                <div className="category-search-result-text">
                  <p>Found "{categorySearchTerm}" in the following Life Categories:</p>
                </div>
              )}
              
              <div className="category-search-bubbles">
                {categorySearchResults.mainCategories.map((categoryGroup, index) => (
                  <button
                    key={index}
                    className={`category-search-bubble ${selectedCategoryBubble === categoryGroup.mainCategory.id ? 'selected' : ''}`}
                    onClick={() => {
                      // Find the best match in this category group
                      const bestMatch = categoryGroup.matches[0]; // First match is usually most relevant
                      handleCategoryResultClick(categoryGroup.mainCategory, bestMatch);
                    }}
                  >
                    <span className="category-icon">{categoryGroup.mainCategory.icon}</span>
                    <span className="category-name">{categoryGroup.mainCategory.name}</span>
                  </button>
                ))}
              </div>
              
              <button 
                type="button" 
                onClick={clearCombinedSearch}
                className="clear-category-search-button"
              >
                Clear Search
              </button>
            </div>
          )}
          
          {/* No results message */}
          {categorySearchResults && categorySearchResults.totalMatches === 0 && categorySearchTerm.trim() && (
            <div className="category-no-results">
              <span>❌ No categories found for "{categorySearchTerm}"</span>
            </div>
          )}
          
          {/* Event search active indicator and clear button */}
          {isEventSearchActive && eventSearchTerm.trim() && (
            <div className="event-search-active">
              <div className="event-search-active-text">
                <span>🔍 Searched for "{eventSearchTerm}" events</span>
              </div>
                             <button 
                 type="button" 
                 onClick={clearCombinedSearch}
                 className="clear-event-search-button"
               >
                 Clear Search
               </button>
            </div>
          )}
          
          <div className="search-row">
            <button
              type="button"
              className={`search-button ${hasAnySearchInput() ? 'active' : ''}`}
              onClick={handleMainSearch}
              disabled={isCategorySearching || !hasAnySearchInput()}
            >
              {isCategorySearching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>
      </div>

      {/* Show Preferred Categories Toggle - Positioned above Life Categories */}
      {user && userPreferences.length > 0 && ( 
        <div className="centered-checkbox-container">
          <div className="preferences-toggle category-preferences-toggle">
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
        </div>
      )}

      {/* LIFE CATEGORIES SECTION */}
      {/* Add the ref to this container which holds the category sections */}
      <div className="categories-container" ref={categorySectionsContainerRef}>
        {/* Categories Section - Render based on displayedCategoryLevels */}
        {displayedCategoryLevels.map((categoriesForLevel, index) =>
          renderCategoryLevel(categoriesForLevel, index)
        )}

        {/* Category-Specific Events - Only show events if backend is connected */}
        {selectionPath.length > 0 && ( // Show only if a category path is selected
          <section className="section full-width-section category-events-section" ref={categoryDetailSectionRef}>
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
              {/* Back to Category Search button - only show if user came from category search */}
              {cameFromCategorySearch && (
                <button 
                  className="category-action-button back-button"
                  onClick={handleBackToCategorySearch}
                >
                  <span className="action-icon">⏪</span>
                  Back To Categories Search
                </button>
              )}
              {/* Only show Create Event button for logged-in users */}
              {user && (
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
              )}
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

      {/* Navigation anchor for "Back to Events" button */}
      <div id="events-section-anchor" ref={eventsAnchorRef} style={{ paddingTop: '10px', marginBottom: '5px' }}></div>
      
      {/* Hide Past Events Toggle - Positioned above Events Near You */}
      <div className="centered-checkbox-container">
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

      {/* EVENTS SECTIONS - STAYS AT BOTTOM */}
      <div className="horizontal-events-container">
        {/* Only show events sections if backend is connected */}
        {backendConnected && (
          <>
            {/* Nearby Events Section */}
            <section className="horizontal-section" id="events-near-you" ref={eventsNearYouRef}>
              <h2 className="section-title">
                {getEventsTitle()}
              </h2>
              {/* Handle loading/error states */}
              {(eventsQuery.isLoading || nearbyEventsQuery.isLoading) && <p>Loading events...</p>}
              {(eventsQuery.isError || nearbyEventsQuery.isError) && <p>Could not load events.</p>}
              
              {/* Show events */}
              {!(eventsQuery.isLoading || nearbyEventsQuery.isLoading) && 
               !(eventsQuery.isError || nearbyEventsQuery.isError) && (
                <div className="horizontal-event-grid">
                  {(() => {
                    const filteredEvents = getFilteredEventsBySearch();
                    const finalEvents = filterEvents(filteredEvents.slice(0, 5)); // Apply past events filter and limit
                    
                    if (finalEvents.length > 0) {
                      return finalEvents.map(event => (
                        <Link to={`/events/${event.id}?from=home`} key={event.id} className="horizontal-event-card">
                          <EventCard event={event} 
                            friendsAttending={hasFriendsAttending(event.id)}
                          />
                        </Link>
                      ));
                    } else {
                      // Show appropriate empty state
                      if (!userLocation && !isLocationFiltered && !selectedStartDate && !eventSearchTerm.trim()) {
                        return (
                          <div className="empty-state">
                            <MapPin size={32} />
                            <p>No Events Found. <br></br>Please enter a Location to Search for.</p>
                          </div>
                        );
                      } else {
                        return (
                          <div className="empty-state">
                            <Calendar size={32} />
                            <p>No events found for your search criteria</p>
                            <p>Try adjusting your search or check back later.</p>
                          </div>
                        );
                      }
                    }
                  })()}
                </div>
              )}
              
              {/* Back To Search Button - only show when there are active search filters */}
              {hasAnySearchInput() && (
                <div className="events-actions">
                  <button 
                    className="category-action-button back-button"
                    onClick={handleBackToSearch}
                  >
                    <span className="action-icon">⏪</span>
                    Back To Search
                  </button>
                </div>
              )}
            </section>

            {/* Friends' Events Section - Hidden for guest users */}
            {user && (
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
            )}

            {/* Popular Events Section */}
            <section className="horizontal-section popular-events-section">
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