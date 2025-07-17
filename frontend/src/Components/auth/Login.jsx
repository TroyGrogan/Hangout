import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Login.css';

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, guestLogin, user, isGuest, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Always redirect to home page after login instead of previous location
  const redirectTo = '/';

  useEffect(() => {
    if (location.state?.message) {
      setSuccess(location.state.message);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Add effect to handle authenticated users - redirect only real authenticated users, not guests
  useEffect(() => {
    if (user && !authLoading && !isGuest) {
      console.log('Login: Authenticated user detected, redirecting to home');
      navigate(redirectTo, { replace: true });
    }
  }, [user, authLoading, isGuest, navigate, redirectTo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await login(username, password);
      // Navigation will be handled by the useEffect above
    } catch (err) {
      console.error('Login error:', err?.response?.data || err.message);
      setError(
        err.response?.data?.detail || 
        'Failed to login. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    try {
      guestLogin();
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Guest login error:', err);
      setError('Failed to start guest session');
    }
  };

  // Show loading state while auth is being checked
  if (authLoading) {
    return (
      <div className="container">
        <header>
          Hangout
        </header>
        <div className="card">
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header>
        Hangout
      </header>

      <div className="card">
        <h2>Welcome Back</h2>

        {success && <div className="success">{success}</div>}
        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p>
            Don't have an account?{' '}
            <Link to="/signup">Sign up here!</Link>
            <br></br>
            Want to just preview the app?{' '}
            <span 
              onClick={handleGuestLogin}
              className="guest-link"
            >
              Click Here!
            </span>
          </p>
        </form>
      </div>
    </div>
  );
};