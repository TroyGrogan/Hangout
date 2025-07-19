import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Import components
import Calendar from './Components/calendar/Calendar';
import Home from './Components/home/Home';
import EventDetails from './Components/events/EventDetails';
import EventCreate from './Components/events/EventCreate';
import EventEdit from './Components/events/EventEdit';
import EventDashboard from './Components/dashboard/EventDashboard';
import Profile from './Components/profile/Profile';
import CategoryPreferences from './Components/profile/CategoryPreferences';
import { Login } from './Components/auth/Login';
import { Signup } from './Components/auth/Signup';
import { AutoGuestLogin } from './Components/auth/AutoGuestLogin';
import { ProtectedRoute } from './Components/auth/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import Suggester from './Components/ai/Suggester';
import ChatHistory from './Components/ai/ChatHistory';
import ChatSession from './Components/ai/ChatSession';
import PageStateManager from './Components/pageState/PageStateManager';
import ErrorBoundary from './Components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <PageStateManager>
            <div className="App">
              <Routes>
              {/* Main home route - handles both guest and authenticated users */}
              <Route path="/" element={<Home />} />
              
              {/* Auto guest login route - fallback for any auth issues */}
              <Route path="/welcome" element={<AutoGuestLogin />} />
              
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              
              {/* Protected routes */}
              <Route
                path="/events/create"
                element={
                  <ProtectedRoute>
                    <EventCreate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/create-event"
                element={
                  <ProtectedRoute>
                    <EventCreate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/events/:id"
                element={<EventDetails />}
              />
              <Route
                path="/events/edit/:id"
                element={
                  <ProtectedRoute>
                    <EventEdit />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <EventDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/preferences"
                element={
                  <ProtectedRoute>
                    <CategoryPreferences isOnboarding={false} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/onboarding/preferences"
                element={
                  <ProtectedRoute>
                    <CategoryPreferences isOnboarding={true} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/calendar"
                element={<Calendar />}
              />
              
              {/* AI Chat routes */}
              <Route
                path="/suggester"
                element={<Suggester />}
              />
              <Route
                path="/chat/:sessionId"
                element={<ChatSession />}
              />
              <Route
                path="/chat-history"
                element={<ChatHistory />}
              />
              
              {/* Legacy /home route - redirect to main home */}
              <Route path="/home" element={<Navigate to="/" replace />} />
              
              {/* Fallback route for any unmatched paths - redirect to main home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </div>
          </PageStateManager>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
