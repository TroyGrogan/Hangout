// src/contexts/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import axiosInstance from '../services/axios';
import { clearChatState } from '../utils/chatStateUtils';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  // Memoized logout function to prevent recreation on every render
  const logout = useCallback((shouldRedirect = true) => {
    console.log('[AuthContext] Logout called, shouldRedirect:', shouldRedirect);
    
    // Clear authenticated user tokens
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    delete axiosInstance.defaults.headers.common['Authorization'];
    clearChatState();
    
    // Clear user state
    setUser(null);
    setIsGuest(false);
    
    console.log('[AuthContext] User logged out');
    
    // Redirect to login page as requested by user
    if (shouldRedirect) {
      window.location.href = '/login';
    }
  }, []);

  // Memoized guest login function
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
    
    console.log('[AuthContext] Guest mode established');
    return true;
  }, []);

  // Simplified checkAuth function without useCallback to prevent dependency issues
  const checkAuth = () => {
    console.log('[AuthContext] checkAuth called');
    setLoading(true);
    
    const token = localStorage.getItem('accessToken');
    const guestMode = localStorage.getItem('guestMode');
    
    // If explicitly in guest mode, set up guest user
    if (guestMode === 'true') {
      console.log('[AuthContext] Setting guest mode from localStorage');
      setIsGuest(true);
      setUser({ isGuest: true, username: 'Guest' });
      setLoading(false);
      return;
    }
    
    // If we have a token, validate it
    if (token) {
      console.log('[AuthContext] Found token, validating...');
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 > Date.now()) {
          console.log('[AuthContext] Token valid, setting authenticated user');
          setUser(decoded);
          setIsGuest(false);
          axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          setLoading(false);
          return;
        } else {
          console.log('[AuthContext] Token expired, setting up guest mode');
          // Token expired - clear everything and set guest mode
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          delete axiosInstance.defaults.headers.common['Authorization'];
          clearChatState();
          localStorage.setItem('guestMode', 'true');
          setIsGuest(true);
          setUser({ isGuest: true, username: 'Guest' });
          setLoading(false);
          return;
        }
      } catch (error) {
        console.log('[AuthContext] Token decode error, setting up guest mode');
        // Token decode error - clear everything and set guest mode
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        delete axiosInstance.defaults.headers.common['Authorization'];
        clearChatState();
        localStorage.setItem('guestMode', 'true');
        setIsGuest(true);
        setUser({ isGuest: true, username: 'Guest' });
        setLoading(false);
        return;
      }
    } else {
      console.log('[AuthContext] No token found, establishing guest mode');
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

  const login = async (username, password) => {
    try {
      console.log('Login attempt with:', { username });
      setLoading(true);
      
      // Clear any existing tokens and guest mode
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('guestMode');
      delete axiosInstance.defaults.headers.common['Authorization'];

      // Make login request
      const response = await axiosInstance.post('/token/', {
        username: username.trim(),
        password: password.trim()
      });

      console.log('Token endpoint response received');

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
        console.log('Decoded token, setting authenticated user');
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
      console.log('Attempting to register with:', userData);
      const registerResponse = await axiosInstance.post('/users/register/', userData);
      console.log('Registration response:', registerResponse.data);
      
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