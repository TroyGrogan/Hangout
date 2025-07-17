import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { storeCurrentFullUrl, getStoredPage, clearStoredPage } from '../../utils/pageStateUtils';

const PageStateManager = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Store the current page whenever the location changes
    storeCurrentFullUrl();
  }, [location]);

  useEffect(() => {
    // Only run this once when the component mounts
    const handlePageStateRestoration = () => {
      // Check if we have a stored path from the SPA routing script
      const initialPath = window.__INITIAL_PATH__;
      const sessionPath = getStoredPage();
      const isDirectNavigation = window.__DIRECT_NAVIGATION__;
      
      console.log('[PageStateManager] Checking for stored paths:', {
        initialPath,
        sessionPath,
        isDirectNavigation,
        currentLocation: location.pathname
      });

      // If we're on the home page and have a stored path, navigate to it
      if (location.pathname === '/' && (initialPath || sessionPath)) {
        const targetPath = initialPath || sessionPath;
        
        // Clean up the stored paths
        delete window.__INITIAL_PATH__;
        delete window.__DIRECT_NAVIGATION__;
        clearStoredPage();
        
        console.log('[PageStateManager] Navigating to stored path:', targetPath);
        
        // Navigate to the stored path
        navigate(targetPath, { replace: true });
        return;
      }

      // If this is a direct navigation (user typed URL directly), 
      // we don't need to do anything - React Router will handle it
      if (isDirectNavigation) {
        console.log('[PageStateManager] Direct navigation detected, letting React Router handle it');
        delete window.__DIRECT_NAVIGATION__;
        return;
      }

      // Clean up any stored paths if we're not using them
      delete window.__INITIAL_PATH__;
      delete window.__DIRECT_NAVIGATION__;
      clearStoredPage();
    };

    // Small delay to ensure React Router is fully initialized
    const timer = setTimeout(handlePageStateRestoration, 100);
    
    return () => clearTimeout(timer);
  }, [navigate, location.pathname]);

  // This component doesn't render anything, it just manages navigation
  return children;
};

export default PageStateManager; 