// src/contexts/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useQueryClient } from '@tanstack/react-query';
import axiosInstance, { setQueryClient } from '../services/axios';
import { clearChatState, clearAllUserStorage } from '../utils/chatStateUtils';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const queryClient = useQueryClient();

  // Enhanced logout function for seamless account switching
  const logout = useCallback((shouldRedirect = true) => {
    console.log('[AuthContext] Logout called - clearing all user data');
    
    // Clear ALL storage (tokens, cache, preferences, etc.)
    clearAllUserStorage();
    
    // Clear React Query cache completely to prevent data leaks between accounts
    queryClient.clear();
    
    // Clear axios headers
    delete axiosInstance.defaults.headers.common['Authorization'];
    
    // Clear any browser-stored credentials
    if (navigator.credentials) {
      navigator.credentials.preventSilentAccess();
    }
    
    // Clear any cached authentication state
    if (window.caches) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('auth') || name.includes('user')) {
            caches.delete(name);
          }
        });
      });
    }
    
    // Reset auth state to clean initial state
    setUser(null);
    setIsGuest(false);
    setLoading(false);
    setAuthInitialized(true);
    
    console.log('[AuthContext] Logout complete - app ready for new user login');
  }, [queryClient]);

  // Simplified guest login function
  const guestLogin = useCallback(() => {
    console.log('[AuthContext] Setting up guest mode');
    
    // Clear any existing tokens
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    delete axiosInstance.defaults.headers.common['Authorization'];
    
    // Set guest mode
    localStorage.setItem('guestMode', 'true');
    setIsGuest(true);
    setUser({ isGuest: true, username: 'Guest' });
    setLoading(false);
    setAuthInitialized(true);
    
    return true;
  }, []);

  // Simplified authentication check - runs only on mount
  const initializeAuth = useCallback(() => {
    console.log('[AuthContext] Initializing authentication state');
    setLoading(true);
    setAuthInitialized(false);
    
    const token = localStorage.getItem('accessToken');
    const guestMode = localStorage.getItem('guestMode');
    
    // Priority 1: Check for valid access token
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 > Date.now()) {
          console.log('[AuthContext] Valid token found - setting authenticated user');
          setUser(decoded);
          setIsGuest(false);
          axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          setLoading(false);
          setAuthInitialized(true);
          return;
        } else {
          console.log('[AuthContext] Token expired - clearing storage');
          clearAllUserStorage();
          queryClient.clear();
          delete axiosInstance.defaults.headers.common['Authorization'];
        }
      } catch (error) {
        console.log('[AuthContext] Token decode error - clearing storage');
        clearAllUserStorage();
        queryClient.clear();
        delete axiosInstance.defaults.headers.common['Authorization'];
      }
    }
    
    // Priority 2: Check for explicit guest mode
    if (guestMode === 'true') {
      console.log('[AuthContext] Guest mode found - setting guest user');
      setIsGuest(true);
      setUser({ isGuest: true, username: 'Guest' });
      setLoading(false);
      setAuthInitialized(true);
      return;
    }
    
    // Priority 3: Default state - neither guest nor authenticated
    // This allows the Home component to show the guest interface by default
    console.log('[AuthContext] No auth state found - showing guest interface');
    setUser(null);
    setIsGuest(false);
    setLoading(false);
    setAuthInitialized(true);
  }, [queryClient]);

  // Run initialization only once on mount
  useEffect(() => {
    initializeAuth();
  }, []); // Empty dependency array is safe since initializeAuth is memoized

  // Set QueryClient instance in axios service
  useEffect(() => {
    setQueryClient(queryClient);
  }, [queryClient]);

  // Simplified storage event listener - only for logout events
  useEffect(() => {
    const handleStorageChange = (e) => {
      // Only handle when access token is explicitly removed (logout)
      if (e.key === 'accessToken' && e.newValue === null) {
        console.log('[AuthContext] Access token removed - triggering logout');
        setUser(null);
        setIsGuest(false);
        setLoading(false);
        setAuthInitialized(true);
      }
    };

    // Listen for storage events from other tabs
    window.addEventListener('storage', handleStorageChange);
    
    // Listen for custom events from axios interceptor
    const handleCustomStorageChange = (e) => {
      handleStorageChange(e.detail);
    };
    window.addEventListener('localStorageChange', handleCustomStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageChange', handleCustomStorageChange);
    };
  }, []);

  const login = async (username, password) => {
    try {
      setLoading(true);
      setAuthInitialized(false);
      console.log('[AuthContext] Login attempt started');
      
      // Complete cleanup before login
      clearAllUserStorage();
      queryClient.clear();
      delete axiosInstance.defaults.headers.common['Authorization'];

      // Make login request
      const response = await axiosInstance.post('/token/', {
        username: username.trim(),
        password: password.trim()
      });

      if (!response.data.access || !response.data.refresh) {
        throw new Error('Invalid token response');
      }

      const { access, refresh } = response.data;
      
      // Store tokens
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);
      
      // Set auth header
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      
      // Decode and set user
      const decoded = jwtDecode(access);
      setUser(decoded);
      setIsGuest(false);
      setLoading(false);
      setAuthInitialized(true);
      
      console.log('[AuthContext] Login successful');
      return true;
    } catch (error) {
      console.error('[AuthContext] Login failed:', error);
      setLoading(false);
      setAuthInitialized(true);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      setAuthInitialized(false);
      const registerResponse = await axiosInstance.post('/users/register/', userData);
      
      try {
        await login(userData.username, userData.password);
        return { ...registerResponse.data, autoLoginSuccess: true };
      } catch (loginError) {
        console.error('Auto-login failed:', loginError);
        setLoading(false);
        setAuthInitialized(true);
        return { ...registerResponse.data, autoLoginSuccess: false };
      }
    } catch (error) {
      console.error('Registration error:', error?.response?.data || error.message);
      setLoading(false);
      setAuthInitialized(true);
      throw error;
    }
  };

  const value = {
    user,
    isGuest,
    login,
    guestLogin,
    logout,
    register,
    loading,
    authInitialized, // New flag for PageStateManager to use
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};