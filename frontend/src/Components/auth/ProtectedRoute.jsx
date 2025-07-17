// src/components/auth/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const ProtectedRoute = ({ children }) => {
  const { user, isGuest, loading } = useAuth();

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

  // If no user or user is guest, redirect to login page
  if (!user || isGuest) {
    console.log('ProtectedRoute: Redirecting to login - guest user or no user found');
    return <Navigate to="/login" replace />;
  }

  return children;
};