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

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Root path redirects to welcome for auto guest login */}
            <Route path="/" element={<Navigate to="/welcome" replace />} />
            
            {/* Auto guest login route - default landing page */}
            <Route path="/welcome" element={<AutoGuestLogin />} />
            
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Protected routes */}
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
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
              element={
                <ProtectedRoute>
                  <EventDetails />
                </ProtectedRoute>
              }
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
              element={
                <ProtectedRoute>
                  <Calendar />
                </ProtectedRoute>
              }
            />
            
            {/* AI Chat routes - Added */}
            <Route
              path="/suggester"
              element={
                <ProtectedRoute>
                  <Suggester />
                </ProtectedRoute>
              }
            />
            {/* Optional: Route /chat to /suggester if needed */}
            {/* <Route 
              path="/chat" 
              element={
                <ProtectedRoute>
                  <Suggester /> 
                </ProtectedRoute>
              } 
            /> */}
            <Route
              path="/chat/:sessionId"
              element={<ChatSession />}
            />
            <Route
              path="/chat-history"
              element={<ChatHistory />}
            />
            
            {/* Fallback route for any unmatched paths - redirect to welcome/guest login */}
            <Route path="*" element={<Navigate to="/welcome" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
