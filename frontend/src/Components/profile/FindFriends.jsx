import React, { useState } from 'react';
import { Search, UserPlus, UserCheck, User, Clock } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../services/axios';
import './FindFriends.css';

const FindFriends = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  
  const queryClient = useQueryClient();
  
  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      return;
    }
    
    setIsSearching(true);
    setError('');
    
    try {
      const { data } = await axiosInstance.get(`/users/search/?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(data);
    } catch (err) {
      console.error('Error searching for users:', err);
      setError('Failed to search for users. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleAddFriend = async (userId) => {
    setActionLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await axiosInstance.post(`/users/${userId}/add-friend/`);
      
      // Update the friendship status in the local results
      setSearchResults(prevResults => 
        prevResults.map(user => 
          user.id === userId 
            ? { ...user, friendship_status: 'request_sent' } 
            : user
        )
      );
      
      setSuccess('Friend request sent');
      setTimeout(() => setSuccess(''), 3000);
      
      // Refresh friend requests data
      queryClient.invalidateQueries(['friendRequests']);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to send friend request';
      setError(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };
  
  const renderActionButton = (user) => {
    if (user.friendship_status === 'friend') {
      return (
        <button className="already-friends-button" disabled>
          <UserCheck size={16} />
          <span>Friends</span>
        </button>
      );
    } else if (user.friendship_status === 'request_sent') {
      return (
        <button className="request-sent-button" disabled>
          <Clock size={16} />
          <span>Request Sent</span>
        </button>
      );
    } else if (user.friendship_status === 'request_received') {
      return (
        <button className="request-received-button" disabled>
          <Clock size={16} />
          <span>Request Received</span>
        </button>
      );
    } else {
      return (
        <button 
          className="add-friend-button"
          onClick={() => handleAddFriend(user.id)}
          disabled={actionLoading}
        >
          <UserPlus size={16} />
          <span>Add Friend</span>
        </button>
      );
    }
  };
  
  return (
    <div className="find-friends-container">
      <h2 className="find-friends-title">Find Friends</h2>
      
      <form onSubmit={handleSearch} className="search-form">
        <div className="search-input-container">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by username..."
            className="search-input"
          />
          <button type="submit" className="search-button" disabled={isSearching}>
            <Search size={18} />
            Search
          </button>
        </div>
      </form>
      
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      {isSearching ? (
        <div className="search-loading">Searching...</div>
      ) : searchResults.length > 0 ? (
        <div className="search-results">
          {searchResults.map(user => (
            <div key={user.id} className="user-result">
              <div className="user-info">
                {user.profile_image ? (
                  <img 
                    src={user.profile_image} 
                    alt={user.username} 
                    className="user-avatar" 
                  />
                ) : (
                  <div className="user-avatar-placeholder">
                    <User size={24} />
                  </div>
                )}
                <span className="username">{user.username}</span>
              </div>
              
              <div className="user-actions">
                {renderActionButton(user)}
              </div>
            </div>
          ))}
        </div>
      ) : searchQuery && !isSearching ? (
        <div className="no-results">
          <p>No users found matching "{searchQuery}"</p>
        </div>
      ) : (
        <div className="search-prompt">
          <UserPlus size={48} />
          <p>Search for users to add as friends</p>
        </div>
      )}
    </div>
  );
};

export default FindFriends; 