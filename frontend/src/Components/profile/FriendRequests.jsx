import React, { useState } from 'react';
import { User, UserPlus, UserCheck, UserX, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../services/axios';
import './FriendRequests.css';

const fetchFriendRequests = async () => {
  const { data } = await axiosInstance.get('/users/friend-requests/');
  return data;
};

const FriendRequests = () => {
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // React Query for friend requests data
  const { 
    data = { incoming: [], outgoing: [] }, 
    isLoading, 
    isError 
  } = useQuery({
    queryKey: ['friendRequests'],
    queryFn: fetchFriendRequests,
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
  });

  const { incoming, outgoing } = data;

  const handleAccept = async (userId) => {
    try {
      setActionLoading(true);
      setError('');
      await axiosInstance.post(`/users/${userId}/accept-friend/`);
      
      setSuccess('Friend request accepted');
      setTimeout(() => setSuccess(''), 3000);
      
      // Refresh data
      queryClient.invalidateQueries(['friendRequests']);
      queryClient.invalidateQueries(['friends']);
    } catch (err) {
      setError('Failed to accept request. Please try again.');
      console.error('Error accepting friend request:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (userId) => {
    try {
      setActionLoading(true);
      setError('');
      await axiosInstance.post(`/users/${userId}/reject-friend/`);
      
      setSuccess('Friend request rejected');
      setTimeout(() => setSuccess(''), 3000);
      
      // Refresh friend requests data
      queryClient.invalidateQueries(['friendRequests']);
    } catch (err) {
      setError('Failed to reject request. Please try again.');
      console.error('Error rejecting friend request:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (userId) => {
    try {
      setActionLoading(true);
      setError('');
      await axiosInstance.post(`/users/${userId}/cancel-request/`);
      
      setSuccess('Friend request canceled');
      setTimeout(() => setSuccess(''), 3000);
      
      // Refresh friend requests data
      queryClient.invalidateQueries(['friendRequests']);
    } catch (err) {
      setError('Failed to cancel request. Please try again.');
      console.error('Error canceling friend request:', err);
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return <div className="requests-loading">Loading friend requests...</div>;
  }

  if (isError) {
    return <div className="requests-error">Could not load friend requests. Please try again later.</div>;
  }

  const hasRequests = incoming.length > 0 || outgoing.length > 0;

  return (
    <div className="requests-container">
      <h2 className="requests-title">Friend Requests</h2>
      
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      {!hasRequests ? (
        <div className="empty-requests">
          <UserPlus size={48} />
          <p>No friend requests</p>
          <p>When you send or receive friend requests, they'll appear here</p>
        </div>
      ) : (
        <>
          {/* Incoming Requests Section */}
          {incoming.length > 0 && (
            <div className="requests-section">
              <h3 className="section-title">
                <UserCheck size={18} />
                <span>Incoming Requests ({incoming.length})</span>
              </h3>
              
              <div className="requests-list">
                {incoming.map((request) => (
                  <div key={request.id} className="request-item">
                    <div className="request-info">
                      {request.user_profile_image ? (
                        <img 
                          src={request.user_profile_image} 
                          alt={request.user_username} 
                          className="request-avatar" 
                        />
                      ) : (
                        <div className="request-avatar-placeholder">
                          <User size={24} />
                        </div>
                      )}
                      <span className="request-name">{request.user_username} wants to be friends</span>
                    </div>
                    
                    <div className="request-actions">
                      <button 
                        className="accept-button"
                        onClick={() => handleAccept(request.user)}
                        disabled={actionLoading}
                      >
                        <UserCheck size={16} />
                        <span>Accept</span>
                      </button>
                      
                      <button 
                        className="reject-button"
                        onClick={() => handleReject(request.user)}
                        disabled={actionLoading}
                      >
                        <UserX size={16} />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Outgoing Requests Section */}
          {outgoing.length > 0 && (
            <div className="requests-section">
              <h3 className="section-title">
                <UserPlus size={18} />
                <span>Sent Requests ({outgoing.length})</span>
              </h3>
              
              <div className="requests-list">
                {outgoing.map((request) => (
                  <div key={request.id} className="request-item">
                    <div className="request-info">
                      {request.friend_profile_image ? (
                        <img 
                          src={request.friend_profile_image} 
                          alt={request.friend_username} 
                          className="request-avatar" 
                        />
                      ) : (
                        <div className="request-avatar-placeholder">
                          <User size={24} />
                        </div>
                      )}
                      <span className="request-name">Request sent to {request.friend_username}</span>
                    </div>
                    
                    <button 
                      className="cancel-button"
                      onClick={() => handleCancel(request.friend)}
                      disabled={actionLoading}
                    >
                      <X size={16} />
                      <span>Cancel</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FriendRequests; 