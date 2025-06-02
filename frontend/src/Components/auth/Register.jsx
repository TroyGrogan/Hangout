import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../../services/axios';
import './Login.css';

export const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirm_password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirm_password) {
      return setError('Passwords do not match');
    }

    try {
      setError('');
      setLoading(true);

      const response = await axiosInstance.post('/users/register/', formData);
      console.log('Registration successful:', response.data);

    // Attempt to log in the user automatically
    try {
      await axiosInstance.post('/token/', {
        username: formData.username,
        password: formData.password
      }).then(res => {
        const { access, refresh } = res.data;
        
        // Store tokens
        localStorage.setItem('accessToken', access);
        localStorage.setItem('refreshToken', refresh);
        
        // Set auth header
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${access}`;
        
        // Redirect to onboarding preferences
        navigate('/onboarding/preferences');
      });
    } catch (loginErr) {
      console.error('Auto-login failed after registration:', loginErr);
      // If auto-login fails, redirect to login page with success message
      navigate('/login', {
        state: {
          message: 'Registration successful! Please log in with your credentials.',
        },
      });
    }
  } catch (err) {
    console.error('Registration error:', err);

    if (err.response) {
      const { status, data } = err.response;

      // Check for common status codes or error patterns
      const errorMessage = data?.message || data?.error || JSON.stringify(data);

      if (errorMessage.includes('username already exists')) {
        setError('This username is already taken. Please choose a different one.');
      } else if (errorMessage.toLowerCase().includes('email') && errorMessage.toLowerCase().includes('exists')) {
        setError('This email is already registered. Please use a different one.');
      } else {
        setError(errorMessage || 'There was an error processing your request.');
      }
    }  
   // setError(
   //   err.response?.data?.error ||
   //   err.response?.data?.message ||
   //   'Failed to create account'
   // );
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="container">
      <header>
        Hangout
      </header>

      <div className="card">
        <h2>Register</h2>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label htmlFor="confirm_password">Confirm Password</label>
            <input
              id="confirm_password"
              name="confirm_password"
              type="password"
              value={formData.confirm_password}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Creating Account...' : 'Register'}
          </button>
           <p>
                      Alreagy have an account?{' '}
                      <Link to="/login">Login!</Link>
                    </p>
        </form>
      </div>
    </div>
  );
};