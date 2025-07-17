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
 * Check if the current navigation is a page refresh
 * @returns {boolean} True if this appears to be a page refresh
 */
export const isPageRefresh = () => {
  // Check if we have stored path data and we're on the home page
  const hasStoredPath = sessionStorage.getItem('lastVisitedPath');
  const isOnHomePage = window.location.pathname === '/';
  
  return hasStoredPath && isOnHomePage;
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
 * Store the current full URL
 */
export const storeCurrentFullUrl = () => {
  const fullUrl = getFullUrl(window.location.pathname);
  if (window.location.pathname !== '/') {
    sessionStorage.setItem('lastVisitedPath', fullUrl);
    console.log('[PageStateUtils] Stored full URL:', fullUrl);
  }
}; 