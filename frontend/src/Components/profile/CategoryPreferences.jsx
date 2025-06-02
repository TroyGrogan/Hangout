import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../services/axios';
import { getMainCategories } from '../../utils/categoryDataUtils';
import { useQueryClient } from '@tanstack/react-query';
import './CategoryPreferences.css';

const CategoryPreferences = ({ isOnboarding = false }) => {
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Get categories from the new JSON structure
    const mainCategories = getMainCategories();
    setCategories(mainCategories);
    
    const fetchUserPreferences = async () => {
      if (!isOnboarding) {
        try {
          setLoading(true);
          setError('');
          const prefsResponse = await axiosInstance.get('/users/preferences/');
          setSelectedCategories(prefsResponse.data.preferred_categories || []);
        } catch (prefsErr) {
          console.error('Failed to fetch user preferences:', prefsErr);
          setError('Could not load your current preferences.');
          setSelectedCategories([]); 
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchUserPreferences();
  }, [isOnboarding]);

  const toggleCategory = (categoryId) => {
    setSelectedCategories(prevSelected => {
      if (prevSelected.includes(categoryId)) {
        return prevSelected.filter(id => id !== categoryId);
      } else {
        return [...prevSelected, categoryId];
      }
    });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');

      await axiosInstance.put('/users/preferences/', {
        preferred_categories: selectedCategories
      });
      
      // Invalidate the preferences cache so it will be refetched
      queryClient.invalidateQueries(['preferences']);
      
      setSuccessMessage('Save was successful');

      if (isOnboarding) {
        setTimeout(() => navigate('/'), 1500);
      } else {
        setLoading(false);
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      console.error('Failed to save preferences:', err);
      setError('Failed to save your preferences. Please try again.');
      setSuccessMessage('');
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="category-preferences-container">
        <div className="category-preferences-card">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="category-preferences-container">
      <div className="category-preferences-card">
        {!isOnboarding && (
          <div className="profile-header-actions">
            <button 
              className="back-button"
              onClick={() => navigate('/profile')}
            >
              Back to Profile
            </button>
          </div>
        )}
        <h2 className="preferences-title">
          {isOnboarding ? 'What are you interested in?' : 'Update Your Interests'}
        </h2>
        
        {error && <div className="preferences-error">{error}</div>}
        
        <p className="preferences-subtitle">
          Select categories you're interested in to personalize your event feed.
        </p>

        {successMessage && (
          <div className="preferences-success">
            {successMessage}
          </div>
        )}

        <div className="categories-grid">
          {categories.map(category => {
              const longNames = [
                  "Recreation, Hobbies, Entertainment, and Games",
                  "Financial Understanding, Economics, and Politics"
              ];
              
              const isLong = longNames.includes(category.name);
              const itemClassName = `category-item ${selectedCategories.includes(category.id) ? 'selected' : ''} ${isLong ? 'long-pref-name' : ''}`;

              return (
                  <div 
                      key={category.id}
                      className={itemClassName}
                      onClick={() => toggleCategory(category.id)}
                  >
                      {selectedCategories.includes(category.id) && (
                          <span className="selected-indicator">🎯</span>
                      )}
                      <div className="category-icon">{category.icon}</div> 
                      <div className="category-name">{category.name}</div> 
                  </div>
              );
          })}
        </div>
        
        <div className="preferences-actions">
          {isOnboarding && (
            <button 
              className="skip-button" 
              onClick={handleSkip}
              disabled={loading}
            >
              Skip for Now
            </button>
          )}
          
          <button 
            className="save-button" 
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Saving...' : (isOnboarding ? 'Continue' : 'Save Preferences')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryPreferences;