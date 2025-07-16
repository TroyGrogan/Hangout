import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Login.css';

export const AutoGuestLogin = () => {
  const { guestLogin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleAutoGuestLogin = () => {
      try {
        guestLogin();
        navigate('/', { replace: true });
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
    <div className="container">
      <header>
        Hangout
      </header>
      <div className="card">
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
        <p style={{ textAlign: 'center', marginTop: '10px', color: '#3B5998' }}>
          Welcome to Hangout! Setting up your experience...
        </p>
      </div>
    </div>
  );
}; 