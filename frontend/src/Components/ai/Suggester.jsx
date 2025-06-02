import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Chat from './Chat';
import './Suggester.css';
import { useAuth } from '../../contexts/AuthContext';

const Suggester = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  // Check if the current path matches a given path for active tab styling
  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="page-container">
      {/* Main Navigation (Dark Blue) */}
      <nav className="main-nav">
        <Link to="/" className="nav-brand">
          Hangout
        </Link>
        <div className="nav-links">
          <Link to="/events/create" className="nav-link">Create Event</Link>
          <Link to="/dashboard" className="nav-link">My Events</Link>
          <Link to="/profile" className="nav-link">Profile</Link>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </nav>

      {/* Secondary Navigation (White) */}
      <div className="secondary-nav">
        <div className="nav-links">
          <Link to="/" className={isActive('/') ? 'active' : ''}>Home</Link>
          <Link to="/suggester" className={isActive('/suggester') ? 'active' : ''}>Suggester</Link>
          <Link to="/calendar" className={isActive('/calendar') ? 'active' : ''}>Calendar</Link>
        </div>
      </div>

      {/* Content container */}
      <div className="content-container">
        <Chat />
      </div>
    </div>
  );
};

export default Suggester; 