// Utility functions for managing page state and navigation

/**
 * Store the current page path for refresh restoration
 * @param {string} path - The current path to store
 */
export const storeCurrentPage = (path) => {
  if (path && path !== '/') {
    sessionStorage.setItem('lastVisitedPath', path);
    console.log('[PageStateUtils] Stored current page:', path);
  }
};

/**
 * Get the stored page path
 * @returns {string|null} The stored path or null if not found
 */
export const getStoredPage = () => {
  const storedPath = sessionStorage.getItem('lastVisitedPath');
  console.log('[PageStateUtils] Retrieved stored page:', storedPath);
  return storedPath;
};

/**
 * Clear the stored page path
 */
export const clearStoredPage = () => {
  sessionStorage.removeItem('lastVisitedPath');
  console.log('[PageStateUtils] Cleared stored page');
};

/**
 * Store the current full URL for route restoration
 * This includes pathname, search params, and hash
 */
export const storeCurrentFullUrl = () => {
  const fullUrl = getFullUrl(window.location.pathname);
  if (window.location.pathname !== '/') {
    sessionStorage.setItem('lastVisitedPath', fullUrl);
    localStorage.setItem('lastVisitedPath', fullUrl); // Also store in localStorage for persistence
    console.log('[PageStateUtils] Stored full URL:', fullUrl);
  }
};

/**
 * Get the full URL including search params and hash
 * @param {string} path - The path to get the full URL for
 * @returns {string} The full URL
 */
export const getFullUrl = (path) => {
  const search = window.location.search;
  const hash = window.location.hash;
  return path + search + hash;
};

/**
 * Check if the current navigation is a page refresh
 * @returns {boolean} True if this appears to be a page refresh
 */
export const isPageRefresh = () => {
  return window.__IS_REFRESH__ || false;
};

/**
 * Get the path that should be restored after refresh
 * Prioritizes initial path from main.jsx, then falls back to stored paths
 * @returns {string|null} The path to restore or null
 */
export const getPathToRestore = () => {
  // Priority 1: Initial path captured at load time (most reliable for refreshes)
  const initialPath = window.__INITIAL_PATH__;
  if (initialPath && initialPath !== '/') {
    return initialPath;
  }
  
  // Priority 2: Session storage (for browser navigation)
  const sessionPath = getStoredPage();
  if (sessionPath && sessionPath !== '/') {
    return sessionPath;
  }
  
  // Priority 3: Local storage (for more persistent restoration)
  const localPath = localStorage.getItem('lastVisitedPath');
  if (localPath && localPath !== '/') {
    return localPath;
  }
  
  return null;
};

/**
 * Should route restoration happen for this user/situation?
 * @param {Object} params - Parameters for decision making
 * @param {boolean} params.isRefresh - Whether this is a page refresh
 * @param {Object} params.user - Current user object
 * @param {boolean} params.isGuest - Whether user is in guest mode
 * @param {string} params.currentPath - Current pathname
 * @returns {boolean} Whether to proceed with restoration
 */
export const shouldRestoreRoute = ({ isRefresh, user, isGuest, currentPath }) => {
  // Never restore to home page
  if (currentPath === '/') {
    return false;
  }
  
  // Only restore if user has some form of authentication state
  if (!user && !isGuest) {
    return false;
  }
  
  // Restore for authenticated users on refresh
  if (user && !user.isGuest && isRefresh) {
    return true;
  }
  
  // Restore for guest users on refresh (they may have been using the app)
  if (isGuest && isRefresh) {
    return true;
  }
  
  return false;
};

/**
 * Clean up all route restoration data
 */
export const cleanupRouteData = () => {
  // Clear window variables
  delete window.__INITIAL_PATH__;
  delete window.__IS_REFRESH__;
  
  // Clear stored paths
  clearStoredPage();
  localStorage.removeItem('lastVisitedPath');
  
  console.log('[PageStateUtils] Cleaned up all route restoration data');
}; 