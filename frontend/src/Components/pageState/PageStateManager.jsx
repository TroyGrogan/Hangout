import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { storeCurrentFullUrl, getStoredPage, clearStoredPage } from '../../utils/pageStateUtils';
import { useAuth } from '../../contexts/AuthContext';

const PageStateManager = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isGuest, loading: authLoading } = useAuth();

  useEffect(() => {
    // Store the current page whenever the location changes (but not for base URL)
    if (location.pathname !== '/') {
      storeCurrentFullUrl();
    }
  }, [location]);

  useEffect(() => {
    // Only attempt path restoration after auth state is determined
    if (authLoading) {
      return; // Wait for auth to finish loading
    }

    const handlePageStateRestoration = () => {
      // Get stored paths
      const initialPath = window.__INITIAL_PATH__;
      const sessionPath = getStoredPage();
      const isDirectNavigation = window.__DIRECT_NAVIGATION__;
      
      console.log('[PageStateManager] Auth state determined:', {
        user: !!user,
        isGuest,
        currentLocation: location.pathname,
        initialPath,
        sessionPath,
        isDirectNavigation
      });

      // IMPORTANT: Base URL should ALWAYS show guest interface initially
      // Don't restore any paths when user visits base URL - let them see guest view
      if (location.pathname === '/') {
        console.log('[PageStateManager] Base URL accessed - showing guest interface, clearing stored paths');
        
        // Clean up stored paths
        delete window.__INITIAL_PATH__;
        delete window.__DIRECT_NAVIGATION__;
        clearStoredPage();
        
        // Don't navigate anywhere - let Home component show guest interface
        return;
      }

      // Handle direct navigation to specific routes
      if (isDirectNavigation && location.pathname !== '/') {
        console.log('[PageStateManager] Direct navigation to specific route - letting React Router handle it');
        delete window.__DIRECT_NAVIGATION__;
        delete window.__INITIAL_PATH__;
        return;
      }

      // Only restore paths for authenticated users who are returning to the app
      if (user && !isGuest && (initialPath || sessionPath)) {
        const targetPath = initialPath || sessionPath;
        
        // Only navigate if the target path is different from current and not base URL
        if (targetPath !== location.pathname && targetPath !== '/') {
          console.log('[PageStateManager] Authenticated user - restoring path:', targetPath);
          
          // Clean up stored paths
          delete window.__INITIAL_PATH__;
          delete window.__DIRECT_NAVIGATION__;
          clearStoredPage();
          
          // Navigate to the stored path
          navigate(targetPath, { replace: true });
          return;
        }
      }

      // Clean up any remaining stored paths
      delete window.__INITIAL_PATH__;
      delete window.__DIRECT_NAVIGATION__;
      clearStoredPage();
    };

    // Small delay to ensure React Router and auth are fully initialized
    const timer = setTimeout(handlePageStateRestoration, 100);
    
    return () => clearTimeout(timer);
  }, [navigate, location.pathname, user, isGuest, authLoading]);

  return children;
};

export default PageStateManager; 