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
import { Register } from './Components/auth/Register';
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
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected routes */}
            <Route
              path="/"
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
              element={
                <ProtectedRoute>
                  <ChatSession />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat-history"
              element={
                <ProtectedRoute>
                  <ChatHistory />
                </ProtectedRoute>
              }
            />
            
            {/* Fallback route for any unmatched paths */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
