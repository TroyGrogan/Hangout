import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Trash2, Edit, ArrowLeft, AlertCircle } from 'lucide-react';
import axiosInstance from '../../services/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import './EventDashboard.css';

// Separate data fetching functions for React Query
const fetchEvents = async () => {
  const { data } = await axiosInstance.get('/events/');
  return data;
};

const deleteEvent = async (eventId) => {
  await axiosInstance.delete(`/events/${eventId}/`);
  return eventId;
};

const EventDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Use React Query for data fetching with caching
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: fetchEvents,
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
    onError: (err) => {
      console.error('Error fetching events:', err);
      setError('Failed to load your events. Please try again.');
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteEvent,
    onSuccess: (deletedEventId) => {
      // Update the cache by removing the deleted event
      queryClient.setQueryData(['events'], (oldEvents) => 
        oldEvents.filter(event => event.id !== deletedEventId)
      );
      setDeleteConfirm(null);
    },
    onError: (err) => {
      console.error('Error deleting event:', err);
      setError('Failed to delete event. Please try again.');
      setDeleteConfirm(null);
    }
  });

  // Filter events on the client side (avoids re-fetching)
  const createdEvents = events.filter(
    event => event.host?.id === user?.user_id
  );
  
  const attendingEvents = events.filter(
    event => event.is_user_attending
  );

  const handleEditEvent = (eventId) => {
    navigate(`/events/edit/${eventId}`);
  };

  const handleDeleteEvent = async (eventId) => {
    if (deleteConfirm !== eventId) {
      // First click - confirm deletion
      setDeleteConfirm(eventId);
      return;
    }
    
    // Use mutation to delete
    deleteMutation.mutate(eventId);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <Link to="/home" className="back-link">
          <ArrowLeft size={20} /> Back Home
        </Link>
      </nav>

      <div className="dashboard-content">
        <h1 className="dashboard-title">Event Management Dashboard</h1>

        {error && (
          <div className="dashboard-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Events Created Section */}
        <div className="dashboard-section">
          <h2 className="section-title">Events You've Created</h2>
          
          {createdEvents.length === 0 ? (
            <div className="empty-state">
              <Calendar size={32} />
              <p>You haven't created any events yet.</p>
              <Link to="/events/create" className="create-event-button">
                Create Your First Event
              </Link>
            </div>
          ) : (
            <div className="events-table-container">
              <table className="events-table">
                <thead>
                  <tr>
                    <th>Event Name</th>
                    <th>Date</th>
                    <th>Location</th>
                    <th>Attendees</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {createdEvents.map(event => (
                    <tr key={event.id}>
                      <td>
                        <Link to={`/events/${event.id}?from=dashboard`} className="event-name-link">
                          {event.name}
                        </Link>
                      </td>
                      <td>{formatDate(event.start_time)}</td>
                      <td>{event.location_name}</td>
                      <td>{event.attendee_count || 0}</td>
                      <td className="actions-cell">
                        <button 
                          className="action-button edit-button"
                          onClick={() => handleEditEvent(event.id)}
                          aria-label="Edit event"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          className={`action-button delete-button ${deleteConfirm === event.id ? 'confirm' : ''}`}
                          onClick={() => handleDeleteEvent(event.id)}
                          aria-label={deleteConfirm === event.id ? "Confirm delete" : "Delete event"}
                        >
                          <Trash2 size={18} />
                          {deleteConfirm === event.id && <span className="confirm-text">Confirm</span>}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Events Attending Section */}
        <div className="dashboard-section">
          <h2 className="section-title">Events You're Attending</h2>
          
          {attendingEvents.length === 0 ? (
            <div className="empty-state">
              <Calendar size={32} />
              <p>You're not attending any events yet.</p>
              <Link to="/#events-near-you" className="browse-events-button">
                Browse Events
              </Link>
            </div>
          ) : (
            <div className="attending-events-grid">
              {attendingEvents.map(event => (
                <Link 
                  to={`/events/${event.id}?from=dashboard`} 
                  key={event.id}
                  className="attending-event-card"
                >
                  <div className="event-date">{formatDate(event.start_time)}</div>
                  
                  {/* Event Image */}
                  {event.image_url && (
                    <div className="event-image-container">
                      <img 
                        src={event.image_url} 
                        alt={event.name}
                        className="event-image"
                        loading="lazy"
                      />
                    </div>
                  )}
                  
                  <h3 className="event-title">{event.name}</h3>
                  <div className="event-location">{event.location_name}</div>
                  
                  {/* Event Description */}
                  {event.description && (
                    <div className="event-description">{event.description}</div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDashboard;