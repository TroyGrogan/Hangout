// src/contexts/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import axiosInstance from '../services/axios';
import { clearChatState } from '../utils/chatStateUtils'; // Import from utility file instead

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    const token = localStorage.getItem('accessToken');
    const guestMode = localStorage.getItem('guestMode');
    
    if (guestMode === 'true') {
      setIsGuest(true);
      setUser({ isGuest: true, username: 'Guest' });
      setLoading(false);
      return;
    }
    
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 > Date.now()) {
          setUser(decoded);
          setIsGuest(false);
          axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
          logout();
        }
      } catch (error) {
        logout();
      }
    }
    setLoading(false);
  };

  const login = async (username, password) => {
    try {
      console.log('Login attempt with:', { username, password });
      
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

      console.log('Token endpoint response:', response.data);

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
        console.log('Decoded token:', decoded);
        setUser(decoded);
        setIsGuest(false); // Ensure guest mode is cleared for real users
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
      throw error;
    }
  };

  const guestLogin = () => {
    // Clear any existing tokens
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    delete axiosInstance.defaults.headers.common['Authorization'];
    
    // Set guest mode
    localStorage.setItem('guestMode', 'true');
    setIsGuest(true);
    setUser({ isGuest: true, username: 'Guest' });
    
    console.log('Guest login successful');
    return true;
  };

  const register = async (userData) => {
    try {
      // Only handle registration, no auto-login
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
      throw error;
    }
  };
  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('guestMode');
    delete axiosInstance.defaults.headers.common['Authorization'];
    setUser(null);
    setIsGuest(false);
    clearChatState();
    console.log('[AuthContext] User logged out, chat state cleared');
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