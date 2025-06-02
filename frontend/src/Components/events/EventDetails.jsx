import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  Calendar, MapPin, Clock, Users, DollarSign, 
  User, ArrowLeft, Tag, Check, X, HelpCircle, UserPlus, UserMinus, Clock3, RotateCw 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import axiosInstance from '../../services/axios';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './EventDetails.css';
import L from 'leaflet';
import { getCategoryById } from '../../utils/categoryUtils';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [attendees, setAttendees] = useState({
    going: [],
    maybe: [],
    not_going: []
  });
  const [rsvpStatus, setRsvpStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [resolvedCategory, setResolvedCategory] = useState(null);

  // Determine the source page from URL search params or referrer
  const getBackNavigation = () => {
    const searchParams = new URLSearchParams(location.search);
    const source = searchParams.get('from');
    
    if (source === 'dashboard') {
      return {
        to: '/dashboard',
        text: 'Back to Dashboard'
      };
    } else {
      return {
        to: '/#events-near-you',
        text: 'Back to Events'
      };
    }
  };

  const backNavigation = getBackNavigation();

  useEffect(() => {
    const fetchEventData = async () => {
      try {
        setLoading(true);
        
        // Fetch friends list
        const friendsResponse = await axiosInstance.get('/users/friends/');
        setFriends(friendsResponse.data.map(friendship => friendship.friend));
        
        // Fetch pending friend requests
        const requestsResponse = await axiosInstance.get('/users/friend-requests/');
        const outgoingRequests = requestsResponse.data.outgoing.map(req => req.friend);
        setPendingRequests(outgoingRequests);
        
        const eventResponse = await axiosInstance.get(`/events/${id}/`);
        setEvent(eventResponse.data);

        // Resolve category using the imported helper
        if (eventResponse.data.category) {
          const category = getCategoryById(eventResponse.data.category);
          setResolvedCategory(category);
        }
        
        // Fetch all attendees for the event
        const attendeesResponse = await axiosInstance.get('/event-attendees/', {
          params: { event: id }
        });
        
        // Group attendees by RSVP status
        const grouped = {
          going: [],
          maybe: [],
          not_going: []
        };

        attendeesResponse.data.forEach(attendee => {
          if (grouped[attendee.rsvp_status]) {
            grouped[attendee.rsvp_status].push(attendee);
          }
          
          // Set current user's RSVP status if found
          if (attendee.username === user?.username) {
            setRsvpStatus(attendee.rsvp_status);
          }
        });
        
        setAttendees(grouped);
        
      } catch (err) {
        console.error('Error fetching event data:', err);
        setError('Failed to load event details');
      } finally {
        setLoading(false);
      }
    };

    fetchEventData();
  }, [id, user]);

  // Handle RSVP actions
  const handleRSVP = async (status) => {
    try {
      const response = await axiosInstance.post('/event-attendees/', {
        event: id,
        rsvp_status: status
      });

      // Update RSVP status
      setRsvpStatus(status);
      
      // Refresh attendees list to show updated groupings
      const attendeesResponse = await axiosInstance.get('/event-attendees/', {
        params: { event: id }
      });
      
      // Group attendees by RSVP status
      const grouped = {
        going: [],
        maybe: [],
        not_going: []
      };

      attendeesResponse.data.forEach(attendee => {
        if (grouped[attendee.rsvp_status]) {
          grouped[attendee.rsvp_status].push(attendee);
        }
      });
      
      setAttendees(grouped);
      
    } catch (err) {
      console.error('Error updating RSVP:', err);
    }
  };

  // Check if a user is a friend
  const isFriend = (userId) => {
    return friends.some(friendId => friendId === userId);
  };

  // Check if a friend request is pending
  const isPendingRequest = (userId) => {
    return pendingRequests.some(friendId => friendId === userId);
  };

  // Handle adding a friend
  const handleAddFriend = async (userId) => {
    try {
      setActionLoading(true);
      await axiosInstance.post(`/users/${userId}/add-friend/`);
      
      // Refresh friend requests
      const requestsResponse = await axiosInstance.get('/users/friend-requests/');
      const outgoingRequests = requestsResponse.data.outgoing.map(req => req.friend);
      setPendingRequests(outgoingRequests);
      
    } catch (err) {
      console.error('Error sending friend request:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle canceling a friend request
  const handleCancelRequest = async (userId) => {
    try {
      setActionLoading(true);
      await axiosInstance.post(`/users/${userId}/cancel-request/`);
      
      // Refresh friend requests
      const requestsResponse = await axiosInstance.get('/users/friend-requests/');
      const outgoingRequests = requestsResponse.data.outgoing.map(req => req.friend);
      setPendingRequests(outgoingRequests);
    } catch (err) {
      console.error('Error canceling friend request:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle removing a friend
  const handleRemoveFriend = async (userId) => {
    try {
      setActionLoading(true);
      await axiosInstance.delete(`/users/${userId}/remove-friend/`);
      // Update friends list
      const friendsResponse = await axiosInstance.get('/users/friends/');
      setFriends(friendsResponse.data.map(friendship => friendship.friend));
    } catch (err) {
      console.error('Error removing friend:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Render the friend action button based on relationship status
  const renderFriendButton = (attendee) => {
    if (isFriend(attendee.id)) {
      return (
        <button 
          className="friend-button friend-remove"
          onClick={() => handleRemoveFriend(attendee.id)}
          disabled={actionLoading}
        >
          <UserMinus size={16} />
          <span>Remove Friend</span>
        </button>
      );
    } else if (isPendingRequest(attendee.id)) {
      return (
        <button 
          className="friend-button friend-pending"
          onClick={() => handleCancelRequest(attendee.id)}
          disabled={actionLoading}
        >
          <Clock3 size={16} />
          <span>Cancel Request</span>
        </button>
      );
    } else {
      return (
        <button 
          className="friend-button friend-add"
          onClick={() => handleAddFriend(attendee.id)}
          disabled={actionLoading}
        >
          <UserPlus size={16} />
          <span>Add Friend</span>
        </button>
      );
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  // Error state
  if (error || !event) {
    return (
      <div className="error-screen">
        <div className="error-card">
          <h2 className="error-title">Error</h2>
          <p className="error-message">{error || 'Event not found'}</p>
          <Link to={backNavigation.to} className="back-link">{backNavigation.text}</Link>
        </div>
      </div>
    );
  }

  return (
    <div id="event-details-page">
      <nav className="nav-bar">
        <Link to={backNavigation.to} className="nav-back">
         <ArrowLeft></ArrowLeft>
         {backNavigation.text}
        </Link>
      </nav>

      <div className="event-card">
        {/* Event Image */}
        {event.image_url && (
          <div className="event-image">
            <img src={event.image_url} alt={event.name} />
          </div>
        )}

        <div className="event-info">
          <h1 className="event-title">{event.name}</h1>
          
          {/* Event Details (now includes Host Info) */}
          <div className="event-details">
            {/* Host Info - Moved here and changed to use .detail structure */}
            <div className="detail">
              <User className="icon" />
              <div className="hosted-by-content-wrapper">
                <span className="hosted-by-text">Hosted by:</span>
                <div className="host-info">
                  {event.host && typeof event.host === 'object' && event.host.profile_image ? (
                    <img 
                      src={event.host.profile_image} 
                      alt={event.host.username || 'Host'} 
                      className="host-avatar"
                    />
                  ) : (
                    <User className="host-avatar-placeholder" />
                  )}
                  <span className="host-username">
                    {event.host && typeof event.host === 'object' && event.host.username ? event.host.username : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Date Detail */}
            <div className="detail">
              <Calendar className="icon" />
              <div className="date-time-info">
                <div className="date-info">
                  {new Date(event.start_time).toLocaleDateString()}
                  {event.end_time && (() => {
                    const startDate = new Date(event.start_time);
                    const endDate = new Date(event.end_time);
                    const isSameDay = startDate.toDateString() === endDate.toDateString();
                    
                    if (!isSameDay) {
                      return ` - ${endDate.toLocaleDateString()}`;
                    }
                    return '';
                  })()}
                </div>
              </div>
            </div>

            <div className="detail">
              <Clock className="icon" />
              <div className="time-info">
                {new Date(event.start_time).toLocaleTimeString()}
                {event.end_time && (() => {
                  const startDate = new Date(event.start_time);
                  const endDate = new Date(event.end_time);
                  const isSameDay = startDate.toDateString() === endDate.toDateString();
                  
                  if (isSameDay) {
                    return ` - ${endDate.toLocaleTimeString()}`;
                  } else {
                    return ` - ${endDate.toLocaleString()}`;
                  }
                })()}
              </div>
            </div>

            {/* Recurring Event Indicator */}
            {event.is_recurring && (
              <div className="detail">
                <RotateCw className="icon" />
                <span>This event recurs every {new Date(event.start_time).toLocaleDateString('en-US', { weekday: 'long' })}</span>
              </div>
            )}

            <div className="detail">
              <MapPin className="icon" />
              <div className="location-info">
                <div>{event.location_name}</div>
                {event.event_address && (
                  <div className="event-address">{event.event_address}</div>
                )}
              </div>
            </div>

            {/* Display resolved category name with emoji */}
            {resolvedCategory && (
              <div className="detail">
                <Tag className="icon" />
                <span className="event-category-tag">
                  <span className="event-category-icon">{resolvedCategory.icon}</span>
                  {resolvedCategory.textName}
                </span>
              </div>
            )}

            <div className="detail">
              <Users className="icon" />
              <span>
                {attendees.going.length} attending
                {event.max_attendees && ` · ${event.max_attendees} spots total`}
              </span>
            </div>

            {event.price !== null && event.price !== undefined && Number(event.price) > 0 && (
              <div className="detail">
                <DollarSign className="icon" />
                <span>${Number(event.price).toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="event-description">
            <h3 className="description-header">Description</h3>
            <p>{event.description}</p>
          </div>

          {/* Map */}
          {event.latitude && event.longitude && (
            <div className="event-map-section">
              <h3 className="map-header">Map Location</h3>
              <div className="event-map">
                <MapContainer
                  center={[event.latitude, event.longitude]}
                  zoom={13}
                  style={{ height: '400px', width: '100%' }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[event.latitude, event.longitude]} />
                </MapContainer>
              </div>
            </div>
          )}

          {/* Enhanced RSVP Section */}
          <div className="rsvp-section">
            <h2>Will you attend this event?</h2>
            <div className="rsvp-buttons">
              <button
                className={`rsvp-button going ${rsvpStatus === 'going' ? 'active' : ''}`}
                onClick={() => handleRSVP('going')}
              >
                <Check size={18} />
                Going
              </button>
              <button
                className={`rsvp-button maybe ${rsvpStatus === 'maybe' ? 'active' : ''}`}
                onClick={() => handleRSVP('maybe')}
              >
                <HelpCircle size={18} />
                Maybe
              </button>
              <button
                className={`rsvp-button not-going ${rsvpStatus === 'not_going' ? 'active' : ''}`}
                onClick={() => handleRSVP('not_going')}
              >
                <X size={18} />
                Not Going
              </button>
            </div>
          </div>

          {/* Grouped Attendees Lists */}
          <div className="attendees-section">
            <h2>Attendees</h2>
            
            {/* Going Section */}
            {attendees.going.length > 0 && (
              <div className="attendee-group">
                <h3 className="attendee-group-title">
                  <Check size={16} className="attendee-group-icon going" />
                  Going ({attendees.going.length})
                </h3>
                <div className="attendees-list">
                  {attendees.going.map((attendee) => (
                    <div key={attendee.id} className="attendee-item">
                      {attendee.profile_image ? (
                        <img 
                          src={attendee.profile_image} 
                          alt={attendee.username} 
                          className="attendee-avatar"
                        />
                      ) : (
                        <User className="attendee-avatar-placeholder" />
                      )}
                      <span>{attendee.username || attendee.full_name}</span>
                      
                      {/* Don't show friend buttons for yourself */}
                      {attendee.id !== user.user_id && (
                        <div className="friend-action">
                          {renderFriendButton(attendee)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Maybe Section */}
            {attendees.maybe.length > 0 && (
              <div className="attendee-group">
                <h3 className="attendee-group-title">
                  <HelpCircle size={16} className="attendee-group-icon maybe" />
                  Maybe ({attendees.maybe.length})
                </h3>
                <div className="attendees-list">
                  {attendees.maybe.map((attendee) => (
                    <div key={attendee.id} className="attendee-item">
                      {attendee.profile_image ? (
                        <img 
                          src={attendee.profile_image} 
                          alt={attendee.username} 
                          className="attendee-avatar"
                        />
                      ) : (
                        <User className="attendee-avatar-placeholder" />
                      )}
                      <span>{attendee.username || attendee.full_name}</span>
                      
                      {/* Don't show friend buttons for yourself */}
                      {attendee.id !== user.user_id && (
                        <div className="friend-action">
                          {renderFriendButton(attendee)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Not Going Section */}
            {attendees.not_going.length > 0 && (
              <div className="attendee-group">
                <h3 className="attendee-group-title">
                  <X size={16} className="attendee-group-icon not-going" />
                  Not Going ({attendees.not_going.length})
                </h3>
                <div className="attendees-list">
                  {attendees.not_going.map((attendee) => (
                    <div key={attendee.id} className="attendee-item">
                      {attendee.profile_image ? (
                        <img 
                          src={attendee.profile_image} 
                          alt={attendee.username} 
                          className="attendee-avatar"
                        />
                      ) : (
                        <User className="attendee-avatar-placeholder" />
                      )}
                      <span>{attendee.username || attendee.full_name}</span>
                      
                      {/* Don't show friend buttons for yourself */}
                      {attendee.id !== user.user_id && (
                        <div className="friend-action">
                          {renderFriendButton(attendee)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* No attendees case */}
            {attendees.going.length === 0 && attendees.maybe.length === 0 && attendees.not_going.length === 0 && (
              <div className="no-attendees">
                <p>No one has responded to this event yet. Be the first!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;