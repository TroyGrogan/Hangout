import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Chat from './Chat';
import './Suggester.css';
import { useAuth } from '../../contexts/AuthContext';

const Suggester = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, loading: authLoading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Check if the current path matches a given path for active tab styling
  const isActive = (path) => {
    return location.pathname === path;
  };

  // Show loading state while auth is being determined
  if (authLoading) {
    return (
      <div className="page-container suggester-page" style={{
        backgroundColor: '#00B488',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh'
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

  return (
    <div className="page-container suggester-page">
      {/* Main Navigation */}
      <nav className="main-nav">
        <Link to="/" className="nav-brand">
          Hangout
        </Link>
        <div className="nav-links-desktop">
          {!user ? (
            <>
              <Link to="/signup" className="nav-link">Sign Up</Link>
              <Link to="/login" className="logout-btn">Login</Link>
            </>
          ) : (
            <>
              <Link to="/events/create" className="nav-link">Create Event</Link>
              <Link to="/dashboard" className="nav-link">My Events</Link>
              <Link to="/profile" className="nav-link">Profile</Link>
              <button onClick={() => {
                logout();
                navigate('/login');
              }} className="logout-btn">Logout</button>
            </>
          )}
        </div>
        <button className="hamburger-icon" onClick={() => setIsMenuOpen(true)}>
          <Menu size={28} />
        </button>
      </nav>

      {/* Secondary Navigation */}
      <div className="secondary-nav" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%'
      }}>
        <div className="nav-links" style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          flexGrow: 1,
          textAlign: 'center'
        }}>
          <Link to="/" className={isActive('/') ? 'active' : ''} style={{
            flex: '1',
            textAlign: 'center',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>Home</Link>
          <Link to="/suggester" className={isActive('/suggester') ? 'active' : ''} style={{
            flex: '1',
            textAlign: 'center',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>Suggester</Link>
          <Link to="/calendar" className={isActive('/calendar') ? 'active' : ''} style={{
            flex: '1',
            textAlign: 'center',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>Calendar</Link>
        </div>
      </div>

      {/* Side Menu */}
      <div className={`side-menu ${isMenuOpen ? 'open' : ''}`}>
        <div className="side-menu-header">
          <span className="nav-brand">
            Hangout
          </span>
          <button className="close-btn" onClick={() => setIsMenuOpen(false)}>
            <X size={28} />
          </button>
        </div>
                <div className="side-menu-links">
          {!user ? (
            <>
              <Link to="/signup" className="nav-link" onClick={() => setIsMenuOpen(false)}>Sign Up</Link>
              <Link to="/login" className="logout-btn" onClick={() => setIsMenuOpen(false)}>Login</Link>
            </>
          ) : (
            <>
              <Link to="/events/create" className="nav-link" onClick={() => setIsMenuOpen(false)}>Create Event</Link>
              <Link to="/dashboard" className="nav-link" onClick={() => setIsMenuOpen(false)}>My Events</Link>
              <Link to="/profile" className="nav-link" onClick={() => setIsMenuOpen(false)}>Profile</Link>
              <button onClick={() => {
                logout();
                navigate('/login');
                setIsMenuOpen(false);
              }} className="logout-btn">Logout</button>
            </>
          )}
        </div>
      </div>
      {isMenuOpen && <div className="overlay" onClick={() => setIsMenuOpen(false)}></div>}

      {/* Content container */}
      <div className="content-container">
        <Chat />
      </div>
    </div>
  );
};

export default Suggester; 