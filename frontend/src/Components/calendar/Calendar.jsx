import React, { useState, useEffect } from 'react';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import axiosInstance from '../../services/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './Calendar.css';

const localizer = momentLocalizer(moment);

// Helper function to generate recurring event instances
const generateRecurringEvents = (event, monthsToGenerate = 6) => {
  if (!event.is_recurring) {
    return [];
  }

  const recurringEvents = [];
  const originalStart = new Date(event.start_time);
  const originalEnd = new Date(event.end_time);
  const dayOfWeek = originalStart.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Calculate the duration of the original event
  const eventDuration = originalEnd.getTime() - originalStart.getTime();
  
  // Start from the week after the original event
  let currentDate = new Date(originalStart);
  currentDate.setDate(currentDate.getDate() + 7);
  
  // Generate recurring events for the specified number of months
  const endDate = new Date(originalStart);
  endDate.setMonth(endDate.getMonth() + monthsToGenerate);
  
  while (currentDate <= endDate) {
    // Ensure we're on the correct day of the week
    while (currentDate.getDay() !== dayOfWeek) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    if (currentDate <= endDate) {
      const recurringStart = new Date(currentDate);
      const recurringEnd = new Date(recurringStart.getTime() + eventDuration);
      
      recurringEvents.push({
        id: `${event.id}-recurring-${recurringStart.getTime()}`,
        title: `${event.name} (Recurring)`,
        start: recurringStart,
        end: recurringEnd,
        originalEvent: {
          ...event,
          start_time: recurringStart.toISOString(),
          end_time: recurringEnd.toISOString(),
          is_recurring_instance: true,
          original_event_id: event.id
        }
      });
      
      // Move to next week
      currentDate.setDate(currentDate.getDate() + 7);
    }
  }
  
  return recurringEvents;
};

const Calendar = () => {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [events, setEvents] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [displayedEvents, setDisplayedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showOnlyMyEvents, setShowOnlyMyEvents] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Check if the current path matches a given path for active tab styling
  const isActive = (path) => {
    return location.pathname === path;
  };

  // Fetch events - only for authenticated users
  useEffect(() => {
    // Wait for auth loading to complete before fetching events
    if (!authLoading) {
      fetchEvents();
    }
  }, [user, authLoading]); // Add authLoading as dependency

  // Update displayed events when toggle changes
  useEffect(() => {
    if (user) {
      if (showOnlyMyEvents) {
        setDisplayedEvents(myEvents);
      } else {
        setDisplayedEvents(events);
      }
    } else {
      // For guests, always show all events (toggle is disabled)
      setDisplayedEvents(events);
    }
  }, [showOnlyMyEvents, events, myEvents, user]);

  const fetchEvents = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Get all events - both for authenticated users and guests
      const response = await axiosInstance.get('/events/');
      console.log('All events:', response.data);
      
      // Format event dates and prepare for calendar display
      const formattedEvents = response.data.map(event => ({
        id: event.id,
        title: event.name,
        start: new Date(event.start_time),
        end: new Date(event.end_time),
        originalEvent: event
      }));

      // Generate recurring event instances
      const allEventsWithRecurring = [];
      
      formattedEvents.forEach(event => {
        // Add the original event
        allEventsWithRecurring.push(event);
        
        // Add recurring instances if the event is recurring
        if (event.originalEvent.is_recurring) {
          const recurringInstances = generateRecurringEvents(event.originalEvent);
          allEventsWithRecurring.push(...recurringInstances);
        }
      });
      
      // Save all events (including recurring instances)
      setEvents(allEventsWithRecurring);
      
      // Only filter for user events if authenticated
      if (user) {
        // For debugging
        if (allEventsWithRecurring.length > 0) {
          console.log('First event structure:', JSON.stringify(allEventsWithRecurring[0].originalEvent, null, 2));
          console.log('User object:', user);
          console.log(`Total events with recurring: ${allEventsWithRecurring.length}`);
        }
        
        // Filter for user events (including recurring instances)
        const userEvents = allEventsWithRecurring.filter(event => {
          const original = event.originalEvent;
          
          // For recurring instances, check the original event permissions
          const eventToCheck = original.is_recurring_instance ? 
            response.data.find(e => e.id === original.original_event_id) || original : 
            original;
          
          // Check if user is host
          let isHost = false;
          if (eventToCheck.host) {
            // If host is an object with id
            if (typeof eventToCheck.host === 'object' && eventToCheck.host !== null) {
              isHost = eventToCheck.host.id === user.id || eventToCheck.host.id === user.user_id;
            } 
            // If host is directly the ID
            else if (typeof eventToCheck.host === 'number' || typeof eventToCheck.host === 'string') {
              isHost = eventToCheck.host.toString() === user.id?.toString() || 
                      eventToCheck.host.toString() === user.user_id?.toString();
            }
          }
          
          // Check if user is attending
          let isAttending = eventToCheck.is_user_attending === true;
          
          if (!isAttending && eventToCheck.attendees && Array.isArray(eventToCheck.attendees)) {
            isAttending = eventToCheck.attendees.some(attendee => {
              const attendeeId = attendee.user?.id || attendee.user_id || attendee.id;
              const userId = user.id || user.user_id;
              return attendeeId === userId && attendee.rsvp_status === 'going';
            });
          }
          
          // Debug output for each event
          console.log(`Event ${event.id} "${event.title}": isHost=${isHost}, isAttending=${isAttending}`);
          
          return isHost || isAttending;
        });
        
        // Log counts for debugging
        console.log(`Total events: ${allEventsWithRecurring.length}`);
        console.log(`My events: ${userEvents.length}`);
        
        // Save filtered events
        setMyEvents(userEvents);
        
        // Set initial display based on toggle state
        setDisplayedEvents(showOnlyMyEvents ? userEvents : allEventsWithRecurring);
      } else {
        // For guests, always show all events and set myEvents to empty
        setMyEvents([]);
        setDisplayedEvents(allEventsWithRecurring);
      }
      
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (event) => {
    // For recurring instances, navigate to the original event
    const eventId = event.originalEvent.is_recurring_instance ? 
      event.originalEvent.original_event_id : 
      event.id;
    navigate(`/events/${eventId}`);
  };

  const handleToggleChange = () => {
    // Only allow toggle for authenticated users
    if (user) {
      const newValue = !showOnlyMyEvents;
      console.log(`Switching to ${newValue ? 'My Events' : 'All Events'}`);
      setShowOnlyMyEvents(newValue);
    }
  };

  return (
    <div className="page-container calendar-page">
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

      <div className="content-container">
        <div className="calendar-container">
          <h2 className="calendar-title">Events Calendar</h2>
          
          {/* Toggle switch with mode indicator - disabled for guests */}
          <div className="calendar-toggle">
            <label className={`toggle-switch ${!user ? 'disabled' : ''}`}>
              <input 
                type="checkbox" 
                checked={showOnlyMyEvents} 
                onChange={handleToggleChange}
                disabled={!user}
              />
              <span className={`toggle-slider ${!user ? 'disabled' : ''}`}></span>
            </label>
            <span className="toggle-label">
              {!user 
                ? 'Showing all events'
                : (showOnlyMyEvents ? 'Showing my events only' : 'Showing all events')
              }
            </span>
          </div>

          {/* Loading state */}
          {(loading || authLoading) && (
            <div className="loading-message">
              {authLoading ? "Loading..." : "Loading events..."}
            </div>
          )}
          
          {/* Error state */}
          {!authLoading && error && (
            <div className="error-message">{error}</div>
          )}
          
          {/* Empty state */}
          {!loading && !authLoading && !error && displayedEvents.length === 0 && (
            <div className="empty-message">
              {!user 
                ? "Sign up or log in to view and create events!"
                : (showOnlyMyEvents 
                  ? "You don't have any events. Try creating one or RSVPing to others' events!"
                  : "No events available.")
              }
            </div>
          )}

          {/* Calendar */}
          {!loading && !authLoading && !error && displayedEvents.length > 0 && (
            <BigCalendar
              localizer={localizer}
              events={displayedEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 600 }}
              onSelectEvent={handleEventClick}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Calendar;