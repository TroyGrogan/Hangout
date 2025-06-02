import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axiosInstance from '../../services/axios';
import { Camera, User, Users, UserPlus, Search, Lock } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import FriendsList from './FriendsList';
import FriendRequests from './FriendRequests';
import FindFriends from './FindFriends';
import './Profile.css';
import { getMainCategories } from '../../utils/categoryDataUtils';

const fetchUserProfile = async () => {
  const { data } = await axiosInstance.get('/users/me/');
  return data;
};

const fetchUserPreferences = async () => {
  try {
    const { data } = await axiosInstance.get('/users/preferences/');
    return data;
  } catch (error) {
    console.error('Failed to fetch user preferences:', error);
    return { preferred_categories: [] };
  }
};

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  
  // React Query hooks with caching
  const { data: profileData = {}, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: fetchUserProfile,
    onSuccess: (data) => {
      if (data.profile_image) {
        setImagePreview(data.profile_image);
      }
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
  
  const { data: preferencesData = { preferred_categories: [] } } = useQuery({
    queryKey: ['preferences'],
    queryFn: fetchUserPreferences,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
  
  // Compute preferred categories
  const allMainCategories = getMainCategories();

  const preferredCategories = preferencesData.preferred_categories && preferencesData.preferred_categories.length > 0 && allMainCategories.length > 0
    ? allMainCategories.filter(category => preferencesData.preferred_categories.includes(category.id))
    : [];

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setError('Please select a valid image file (JPG, PNG, GIF, or WebP).');
        return;
      }
      
      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        setError('Image file is too large. Please choose an image smaller than 5MB.');
        return;
      }
      
      // Clear any previous errors
      setError('');
      
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    // Update client-side state without unnecessary re-renders
    queryClient.setQueryData(['profile'], (oldData) => ({
      ...oldData,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      const formData = new FormData();
      
      // Only add fields that exist in profileData
      const currentProfileData = queryClient.getQueryData(['profile']);
      Object.keys(currentProfileData).forEach(key => {
        if (currentProfileData[key] !== null && currentProfileData[key] !== '') {
          formData.append(key, currentProfileData[key]);
        }
      });
      
      if (imageFile) {
        formData.append('profile_image', imageFile);
      }

      // Handle password change first if needed
      if (showPasswordFields && newPassword) {
        if (newPassword !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        try {
          await axiosInstance.post('/users/change-password/', {
            new_password: newPassword,
            confirm_password: confirmPassword,
          });
        } catch (passwordErr) {
          setError('Failed to update password. Please try again.');
          return;
        }
      }
  
      // Update profile
      await axiosInstance.patch('/users/me/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
  
      // Clear password fields and show success
      setSuccess('Profile updated successfully');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordFields(false);
      
      // Refresh data
      queryClient.invalidateQueries(['profile']);
      // Reset local preview state after successful upload
      setImagePreview(''); 
      setImageFile(null);
    } catch (err) {
      console.error('Profile update error:', err);
      
      // Handle specific error cases
      if (err.response?.status === 500 && imageFile) {
        setError('Profile information updated, but image upload failed due to server configuration. Please try uploading the image again later.');
        // Still refresh profile data in case other fields were updated
        queryClient.invalidateQueries(['profile']);
        setImageFile(null);
        setImagePreview('');
      } else if (err.response?.status === 413) {
        setError('Image file is too large. Please choose a smaller image.');
      } else if (err.response?.status === 400 && err.response?.data?.profile_image) {
        setError('Invalid image format. Please upload a valid image file (JPG, PNG, etc.).');
      } else {
        setError(err.response?.data?.message || 'Failed to update profile. Please try again.');
      }
    }
  };

  if (profileLoading) {
    return (
      <div className="profile-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header-actions">
          <nav
            className="back-button"
            onClick={() => navigate('/')}
          >
            Back Home
          </nav>
        </div>

        {/* Tab Navigation */}
        <div className="profile-tabs">
          <button 
            className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={18} />
            <span>Profile</span>
          </button>
          
          <button 
            className={`tab-button ${activeTab === 'find' ? 'active' : ''}`}
            onClick={() => setActiveTab('find')}
          >
            <Search size={18} />
            <span>Find Friends</span>
          </button>
          
          <button 
            className={`tab-button ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            <UserPlus size={18} />
            <span>Requests</span>
          </button>
          
          <button 
            className={`tab-button ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => setActiveTab('friends')}
          >
            <Users size={18} />
            <span>Friends</span>
          </button>
        </div>

        {/* Profile Tab Content */}
        {activeTab === 'profile' && (
          <>
            {error && (
              <div className="alert alert-error">{error}</div>
            )}

            {success && (
              <div className="alert alert-success">{success}</div>
            )}

            <form onSubmit={handleSubmit}>
              <div 
                className="profile-image-container"
                onClick={() => document.getElementById('profile-image-upload').click()}
              >
                {/* Conditionally render based on preview or fetched data */}
                {imagePreview ? (
                  // Show local preview if a new image was selected
                  <img
                    src={imagePreview}
                    alt="Profile Preview"
                    className="profile-image"
                    loading="lazy"
                  />
                ) : profileData?.profile_image ? (
                  // Otherwise, show the fetched profile image URL
                  <img
                    src={profileData.profile_image}
                    alt="Profile"
                    className="profile-image"
                    loading="lazy"
                  />
                ) : (
                  // Fallback placeholder
                  <Camera className="w-8 h-8 text-gray-400" />
                )}
                <div className="image-upload-label">
                  <Camera className="w-4 h-4" />
                </div>
                <input
                  id="profile-image-upload"
                  type="file"
                  className="image-upload-input"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </div>

              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  name="username"
                  value={profileData.username || ''}
                  onChange={handleFormChange}
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={profileData.email || ''}
                  onChange={handleFormChange}
                />
              </div>

              <div className="form-group">
                <label>Bio</label>
                <textarea
                  name="bio"
                  value={profileData.bio || ''}
                  onChange={handleFormChange}
                />
              </div>

              <div className="form-group password-section">
                <div className="password-header">
                  <h3>Change Password</h3>
                  <div className="password-toggle">
                    <button 
                      type="button"
                      className={`toggle-button ${showPasswordFields ? 'active' : ''}`}
                      onClick={() => setShowPasswordFields(!showPasswordFields)}
                    >
                      <Lock size={16} />
                      {showPasswordFields ? 'Cancel' : 'Update Password'}
                    </button>
                  </div>
                </div>
                
                {showPasswordFields && (
                  <>
                    <div className="form-group">
                      <label>New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                      />
                    </div>
                    <div className="form-group">
                      <label>Confirm New Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="form-group">
                <h3>Category Preferences</h3>
                <p className="preferences-description">
                  Customize your event feed by selecting categories you're interested in.
                </p>
                {preferredCategories.length > 0 ? (
                  <div className="preferences-preview">
                    {preferredCategories.map(category => (
                      <span key={category.id} className="preference-tag">
                        <span className="preference-icon">{category.icon || '🎯'}</span>
                        {category.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="no-preferences">No preferred categories selected yet.</p>
                )}
                
                <Link
                  to="/preferences"
                  className="preferences-link update-button purple-button"
                >
                  Manage Category Preferences
                </Link>
              </div>

              <div className="form-actions">
                <button type="submit" className="update-button">
                  Update Profile
                </button>
              </div>
            </form>
          </>
        )}
        
        {/* Find Friends Tab Content */}
        {activeTab === 'find' && (
          <FindFriends />
        )}
        
        {/* Friend Requests Tab Content */}
        {activeTab === 'requests' && (
          <FriendRequests />
        )}
        
        {/* Friends List Tab Content */}
        {activeTab === 'friends' && (
          <FriendsList />
        )}
      </div>
    </div>
  );
};

export default Profile;
