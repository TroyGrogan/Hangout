import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const AutoGuestLogin = () => {
  const { guestLogin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Set background colors immediately
    document.body.style.backgroundColor = '#00B488';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.documentElement.style.backgroundColor = '#00B488';
    
    const handleAutoGuestLogin = () => {
      try {
        guestLogin();
        navigate('/home', { replace: true });
      } catch (err) {
        console.error('Auto guest login error:', err);
        // If guest login fails, fallback to login page
        navigate('/login', { replace: true });
      }
    };

    // Small delay to ensure smooth transition
    const timer = setTimeout(handleAutoGuestLogin, 100);
    return () => clearTimeout(timer);
  }, [guestLogin, navigate]);

  return (
    <div style={{
      backgroundColor: '#00B488',
      minHeight: '100vh',
      width: '100vw',
      position: 'fixed',
      top: 0,
      left: 0,
      margin: 0,
      padding: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
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
}; 