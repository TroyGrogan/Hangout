import React, { useState } from 'react';
import { User, UserMinus } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../services/axios';
import './FriendsList.css';

const fetchFriends = async () => {
  const { data } = await axiosInstance.get('/users/friends/');
  return data;
};

const FriendsList = () => {
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // React Query for friends data
  const { 
    data: friends = [], 
    isLoading: isLoadingFriends, 
    isError: isFriendsError 
  } = useQuery({
    queryKey: ['friends'],
    queryFn: fetchFriends,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const handleRemoveFriend = async (friendId) => {
    try {
      setActionLoading(true);
      setError('');
      await axiosInstance.delete(`/users/${friendId}/remove-friend/`);
      
      setSuccess('Friend removed successfully');
      setTimeout(() => setSuccess(''), 3000);
      
      // Refresh friends list
      queryClient.invalidateQueries(['friends']);
    } catch (err) {
      setError('Failed to remove friend. Please try again.');
      console.error('Error removing friend:', err);
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoadingFriends) {
    return <div className="friends-loading">Loading your friends...</div>;
  }

  if (isFriendsError) {
    return <div className="friends-error">Could not load your friends. Please try again later.</div>;
  }

  return (
    <div className="friends-container">
      <h2 className="friends-title">Your Friends</h2>
      
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      {friends.length === 0 ? (
        <div className="empty-friends">
          <User size={48} />
          <p>You don't have any friends yet.</p>
          <p>Add friends from event attendees to connect with them.</p>
        </div>
      ) : (
        <div className="friends-list">
          {friends.map((friendship) => (
            <div key={friendship.id} className="friend-item">
              <div className="friend-info">
                {friendship.friend_profile_image ? (
                  <img 
                    src={friendship.friend_profile_image} 
                    alt={friendship.friend_username} 
                    className="friend-avatar" 
                  />
                ) : (
                  <div className="friend-avatar-placeholder">
                    <User size={24} />
                  </div>
                )}
                <span className="friend-name">{friendship.friend_username}</span>
              </div>
              
              <button 
                className="remove-friend-button"
                onClick={() => handleRemoveFriend(friendship.friend)}
                disabled={actionLoading}
              >
                <UserMinus size={16} />
                <span>Remove</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FriendsList; 