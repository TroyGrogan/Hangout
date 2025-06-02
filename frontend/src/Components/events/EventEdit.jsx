import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import axiosInstance from '../../services/axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './EventCreate.css';
import mainCategoriesData from '../../data/mainCategories.json';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position} />
  );
}

export default function EventEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [searchingField, setSearchingField] = useState(null);
  const [position, setPosition] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location_name: '',
    event_address: '',
    start_time: '',
    end_time: '',
    is_recurring: false,
    price: 0,
    max_attendees: '',
    category: '',
    image: null
  });
  const [currentImageUrl, setCurrentImageUrl] = useState('');

  const geocodeAddress = async (address) => {
    if (!address.trim()) return;
    
    setGeocoding(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'HangoutWebApp/1.0'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const newPosition = {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        };
        setPosition(newPosition);
        
        setError('');
      } else {
        setError('Address not found. Please try a different search term or be more specific.');
        setTimeout(() => setError(''), 4000);
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      setError('Failed to search for address. Please check your internet connection and try again.');
      setTimeout(() => setError(''), 4000);
    } finally {
      setGeocoding(false);
      setSearchingField(null);
    }
  };

  const handleAddressKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Use the value from whichever field triggered the event
      const searchValue = e.target.value;
      if (searchValue.trim()) {
        // Set which field is being searched based on the field name
        setSearchingField(e.target.name);
        geocodeAddress(searchValue);
      }
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch only event data, not categories
        const eventResponse = await axiosInstance.get(`/events/${id}/`);
        
        const eventData = eventResponse.data;
        
        // Format dates for the datetime-local input
        const formatDateForInput = (dateString) => {
          const date = new Date(dateString);
          return date.toISOString().slice(0, 16);
        };

        // Set form data from event
        setFormData({
          name: eventData.name,
          description: eventData.description,
          location_name: eventData.location_name,
          event_address: eventData.event_address || '',
          start_time: formatDateForInput(eventData.start_time),
          end_time: formatDateForInput(eventData.end_time),
          is_recurring: eventData.is_recurring,
          price: eventData.price,
          max_attendees: eventData.max_attendees || '',
          category: eventData.category
        });

        // Set position for map
        if (eventData.latitude && eventData.longitude) {
          setPosition({ 
            lat: parseFloat(eventData.latitude), 
            lng: parseFloat(eventData.longitude) 
          });
        }

        // Set current image URL
        if (eventData.image_url) {
          setCurrentImageUrl(eventData.image_url);
        }

      } catch (err) {
        console.error('Failed to fetch event data:', err);
        setError('Failed to load event data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : 
              type === 'file' ? files[0] : 
              type === 'number' ? parseFloat(value) : 
              value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const eventData = new FormData();

      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== '') {
          switch(key) {
            case 'price':
              eventData.append(key, parseFloat(formData[key]).toFixed(2));
              break;
            case 'max_attendees':
              eventData.append(key, parseInt(formData[key]));
              break;
            case 'is_recurring':
              eventData.append(key, formData[key] ? 'true' : 'false');
              break;
            case 'start_time':
            case 'end_time':
              // Ensure proper ISO format with timezone
              const date = new Date(formData[key]);
              eventData.append(key, date.toISOString());
              break;
            default:
              eventData.append(key, formData[key]);
          }
        }
      });
      
      // Add coordinates
      if (position) {
        eventData.append('latitude', position.lat.toFixed(6));
        eventData.append('longitude', position.lng.toFixed(6));
      }

      // Log the final form data for debugging
      const formDataObj = {};
      eventData.forEach((value, key) => {
        formDataObj[key] = value;
      });
      console.log('Submitting data:', formDataObj);

      const response = await axiosInstance.patch(`/events/${id}/`, eventData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      navigate(`/events/${response.data.id}`);
    } catch (err) {
      console.error('Failed to update event:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          'Failed to update event';
      setError(typeof errorMessage === 'object' ? 
              JSON.stringify(errorMessage, null, 2) : 
              errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="event-create-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="event-create-container">
      <div className="event-create-card">
        <div className="profile-header-actions" style={{ marginBottom: '1rem' }}> 
          <button 
            className="back-button"
            onClick={() => navigate('/dashboard')}
          >
            Back
          </button>
        </div>

        <h2 className="event-create-title">Edit Event</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="name-recurring-group">
            <div className="form-group">
              <label className="form-label" htmlFor="name">Event Name</label>
              <input
                className="form-input"
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="checkbox-group">
              <div>
                <input
                  className="checkbox-input"
                  type="checkbox"
                  id="is_recurring"
                  name="is_recurring"
                  checked={formData.is_recurring}
                  onChange={handleChange}
                />
                <label className="form-label" htmlFor="is_recurring" style={{ display: 'inline', marginLeft: '8px' }}>
                  This is a recurring event
                </label>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="description">Description</label>
            <textarea
              className="form-input form-textarea"
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="category">Life Category</label>
            <select
              className="form-input form-select"
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
            >
              <option value="">Select A Life Category</option>
              {mainCategoriesData.map(category => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="datetime-group">
            <div className="form-group">
              <label className="form-label" htmlFor="start_time">Start Time</label>
              <input
                className="form-input"
                type="datetime-local"
                id="start_time"
                name="start_time"
                value={formData.start_time}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="end_time">End Time</label>
              <input
                className="form-input"
                type="datetime-local"
                id="end_time"
                name="end_time"
                value={formData.end_time}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <p className="input-help">
            💡 Type an Address or Location Name and press Enter to automatically locate it on the map
          </p>

          <div className="location-group">
            <div className="form-group">
              <label className="form-label" htmlFor="location_name">Location Name</label>
              <input
                className="form-input"
                type="text"
                id="location_name"
                name="location_name"
                value={formData.location_name}
                onChange={handleChange}
                onKeyDown={handleAddressKeyPress}
                placeholder={geocoding && searchingField === 'location_name' ? "Searching..." : "Enter location name and press Enter to locate on map"}
                disabled={geocoding && searchingField === 'location_name'}
                required
              />
              {geocoding && searchingField === 'location_name' && (
                <div className="geocoding-indicator location-geocoding">
                  <span>🔍 Searching for location...</span>
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="event_address">Event Address</label>
              <input
                className="form-input"
                type="text"
                id="event_address"
                name="event_address"
                value={formData.event_address}
                onChange={handleChange}
                onKeyDown={handleAddressKeyPress}
                placeholder={geocoding && searchingField === 'event_address' ? "Searching..." : "Enter address"}
                disabled={geocoding && searchingField === 'event_address'}
                required
              />
              {geocoding && searchingField === 'event_address' && (
                <div className="geocoding-indicator address-geocoding">
                  <span>🔍 Searching for address...</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Select Location on Map</label>
            <div className="map-container">
              {position && (
                <MapContainer
                  center={position}
                  zoom={13}
                  style={{ height: "100%", width: "100%" }}
                  key={`${position.lat}-${position.lng}`}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <LocationMarker position={position} setPosition={setPosition} />
                </MapContainer>
              )}
            </div>
          </div>

          <div className="price-attendees-group">
            <div className="form-group">
              <label className="form-label" htmlFor="price">Price ($)</label>
              <input
                className="form-input"
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                min="0"
                step="0.01"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="max_attendees">Maximum Attendees</label>
              <input
                className="form-input"
                type="number"
                id="max_attendees"
                name="max_attendees"
                value={formData.max_attendees}
                onChange={handleChange}
                min="1"
              />
            </div>
          </div>

          <div className="file-input-group">
            <label className="form-label form-label-large" htmlFor="image">Event Image</label>
            {currentImageUrl && (
              <div className="current-image">
                <img 
                  src={currentImageUrl} 
                  alt="Current event" 
                  style={{ maxWidth: '100%', maxHeight: '200px', marginBottom: '10px' }}
                />
                <p>Current image</p>
              </div>
            )}
            <div 
              className="file-input-container"
              onClick={() => document.getElementById('image').click()}
              style={{cursor: 'pointer'}}
            >
              <div className="file-input-placeholder" style={{cursor: 'pointer'}}>
                <svg className="upload-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{cursor: 'pointer'}}>
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                {formData.image ? formData.image.name : "Click to select a new file"}
              </div>
              <input
                className="file-input"
                type="file"
                id="image"
                name="image"
                onChange={handleChange}
                accept="image/*"
                style={{cursor: 'pointer'}}
              />
            </div>
            <p className="input-help">Upload a new image to replace the current one</p>
          </div>

          <div className="submit-button-group">
            <button
              type="button"
              className="cancel-button"
              onClick={() => navigate('/dashboard')}
              disabled={loading}
              style={{
                fontFamily: 'inherit',
                fontSize: '1rem',
                fontWeight: '500'
              }}
            >
              Cancel
            </button>
            <button
              className="submit-button"
              type="submit"
              disabled={loading}
              style={{
                fontFamily: 'inherit',
                fontSize: '1rem',
                fontWeight: '500'
              }}
            >
              {loading ? "Updating Event..." : "Update Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}