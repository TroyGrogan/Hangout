import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  storeCurrentFullUrl, 
  getPathToRestore, 
  shouldRestoreRoute, 
  isPageRefresh,
  cleanupRouteData 
} from '../../utils/pageStateUtils';
import { useAuth } from '../../contexts/AuthContext';

const PageStateManager = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isGuest, loading: authLoading, authInitialized } = useAuth();
  const hasAttemptedRestore = useRef(false);

  // Store current page whenever location changes (for future restoration)
  useEffect(() => {
    // Store the current URL for potential future restoration
    // Only store non-home pages
    if (location.pathname !== '/') {
      storeCurrentFullUrl();
      console.log('[PageStateManager] Stored current location:', location.pathname + location.search + location.hash);
    }
  }, [location]);

  // Handle route restoration after auth initialization
  useEffect(() => {
    // Wait for auth to be fully initialized
    if (authLoading || !authInitialized) {
      console.log('[PageStateManager] Waiting for auth initialization...');
      return;
    }

    // Only attempt restoration once
    if (hasAttemptedRestore.current) {
      console.log('[PageStateManager] Route restoration already attempted');
      return;
    }

    hasAttemptedRestore.current = true;

    const handleRouteRestoration = () => {
      const currentPath = location.pathname;
      const isRefreshNavigation = isPageRefresh();
      const pathToRestore = getPathToRestore();

      console.log('[PageStateManager] Route restoration evaluation:', {
        currentPath,
        isRefreshNavigation,
        pathToRestore,
        user: !!user,
        isGuest,
        userIsGuest: user?.isGuest
      });

      // If we're already on the home page, handle initial load logic
      if (currentPath === '/') {
        // On refresh from a non-home page, restore to that page
        if (isRefreshNavigation && pathToRestore) {
          const shouldRestore = shouldRestoreRoute({
            isRefresh: isRefreshNavigation,
            user,
            isGuest,
            currentPath: pathToRestore
          });

          if (shouldRestore) {
            console.log('[PageStateManager] Restoring route after refresh:', pathToRestore);
            
            // Navigate to the restored path
            navigate(pathToRestore, { replace: true });
            
            // Clean up restoration data after successful restore
            cleanupRouteData();
            return;
          }
        }

        // If no restoration needed, clean up any stale data
        console.log('[PageStateManager] No route restoration needed - staying on home page');
        cleanupRouteData();
        return;
      }

      // If we're not on home page, we likely got here through direct navigation
      // or successful restoration - just clean up
      console.log('[PageStateManager] On non-home page - cleaning up restoration data');
      cleanupRouteData();
    };

    // Small delay to ensure React Router is fully ready
    const timer = setTimeout(handleRouteRestoration, 50);
    
    return () => clearTimeout(timer);
  }, [navigate, location.pathname, user, isGuest, authLoading, authInitialized]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Clean up when component unmounts
      cleanupRouteData();
    };
  }, []);

  return children;
};

export default PageStateManager; 