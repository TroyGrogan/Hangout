// src/components/auth/ProtectedRoute.jsx
import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Defensive check for auth failures - fallback redirect
  useEffect(() => {
    // If not loading and no user, ensure we redirect (defensive measure)
    if (!loading && !user) {
      console.log('ProtectedRoute: No user detected, ensuring redirect to home');
      // Use window.location as fallback for mobile/PWA compatibility
      setTimeout(() => {
        if (!user) {
          window.location.href = '/';
        }
      }, 100);
    }
  }, [user, loading]);

  // Show loading state with consistent styling
  if (loading) {
    return (
      <div style={{
        backgroundColor: '#00B488',
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
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

  // If no user, redirect to home
  if (!user) {
    console.log('ProtectedRoute: Redirecting to home - no user found');
    return <Navigate to="/" replace />;
  }

  return children;
};