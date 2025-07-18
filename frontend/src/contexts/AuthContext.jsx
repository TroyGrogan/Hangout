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
  const queryClient = useQueryClient();

  // Memoized logout function to prevent recreation on every render
  const logout = useCallback((shouldRedirect = true) => {
    // Clear ALL storage using comprehensive utility
    clearAllUserStorage();
    
    // Clear React Query cache completely
    queryClient.clear();
    
    // Clear axios headers
    delete axiosInstance.defaults.headers.common['Authorization'];
    
    // Force browser to clear any stored credentials
    if (navigator.credentials) {
      navigator.credentials.preventSilentAccess();
    }
    
    // Reset auth state to null (not guest mode)
    setUser(null);
    setIsGuest(false);
    
    // Don't automatically redirect - let components handle navigation with React Router
    // This prevents the black screen issue caused by window.location.href
    // Components calling logout should handle their own navigation
  }, [queryClient]);

  // Memoized guest login function
  const guestLogin = useCallback(() => {
    // Clear any existing tokens
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    delete axiosInstance.defaults.headers.common['Authorization'];
    
    // Set guest mode
    localStorage.setItem('guestMode', 'true');
    setIsGuest(true);
    setUser({ isGuest: true, username: 'Guest' });
    setLoading(false);
    
    return true;
  }, []);

  // Simplified checkAuth function without useCallback to prevent dependency issues
  const checkAuth = () => {
    setLoading(true);
    
    const token = localStorage.getItem('accessToken');
    const guestMode = localStorage.getItem('guestMode');
    
    // If explicitly in guest mode, set up guest user
    if (guestMode === 'true') {
      setIsGuest(true);
      setUser({ isGuest: true, username: 'Guest' });
      setLoading(false);
      return;
    }
    
    // If we have a token, validate it
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 > Date.now()) {
          setUser(decoded);
          setIsGuest(false);
          axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          setLoading(false);
          return;
        } else {
          // Token expired - clear everything completely
          clearAllUserStorage();
          queryClient.clear();
          delete axiosInstance.defaults.headers.common['Authorization'];
          setUser(null);
          setIsGuest(false);
          setLoading(false);
          return;
        }
      } catch (error) {
        // Token decode error - clear everything completely
        clearAllUserStorage();
        queryClient.clear();
        delete axiosInstance.defaults.headers.common['Authorization'];
        setUser(null);
        setIsGuest(false);
        setLoading(false);
        return;
      }
    } else {
      // No token - establish guest mode for first-time visitors
      localStorage.setItem('guestMode', 'true');
      setIsGuest(true);
      setUser({ isGuest: true, username: 'Guest' });
      setLoading(false);
      return;
    }
  };

  // Run checkAuth only once on mount
  useEffect(() => {
    checkAuth();
  }, []); // Empty dependency array is safe now since checkAuth doesn't use useCallback

  // Set QueryClient instance in axios service for cache clearing
  useEffect(() => {
    setQueryClient(queryClient);
  }, [queryClient]);

  // Listen for localStorage changes (e.g., from axios interceptor)
  useEffect(() => {
    const handleStorageChange = (e) => {
      // If guestMode was set by axios interceptor, update auth state
      if (e.key === 'guestMode' && e.newValue === 'true') {
        setIsGuest(true);
        setUser({ isGuest: true, username: 'Guest' });
        setLoading(false);
      }
      // If tokens were cleared, update auth state
      if (e.key === 'accessToken' && e.newValue === null) {
        if (localStorage.getItem('guestMode') === 'true') {
          setIsGuest(true);
          setUser({ isGuest: true, username: 'Guest' });
        } else {
          setUser(null);
          setIsGuest(false);
        }
        setLoading(false);
      }
    };

    // Listen for storage events from other tabs/windows or programmatic changes
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events we can dispatch when localStorage changes in the same tab
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
      
      // Complete cleanup before login - clear everything
      clearAllUserStorage();
      
      // Clear React Query cache completely
      queryClient.clear();
      
      delete axiosInstance.defaults.headers.common['Authorization'];

      // Make login request
      const response = await axiosInstance.post('/token/', {
        username: username.trim(),
        password: password.trim()
      });

      // Check if we got the tokens
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
      try {
        const decoded = jwtDecode(access);
        setUser(decoded);
        setIsGuest(false);
        setLoading(false);
      } catch (decodeError) {
        console.error('Token decode error:', decodeError);
        throw new Error('Invalid token format');
      }

      return true;
    } catch (error) {
      console.error('Login failed:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setLoading(false);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      const registerResponse = await axiosInstance.post('/users/register/', userData);
      
      try {
        await login(userData.username, userData.password);
        return { ...registerResponse.data, autoLoginSuccess: true };
      } catch (loginError) {
        console.error('Auto-login failed:', loginError);
        return { ...registerResponse.data, autoLoginSuccess: false };
      }
    } catch (error) {
      console.error('Registration error:', error?.response?.data || error.message);
      setLoading(false);
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