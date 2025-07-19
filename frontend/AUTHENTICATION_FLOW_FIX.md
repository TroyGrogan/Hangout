# Authentication Flow Documentation

## Overview
This document explains the authentication flow fixes implemented to ensure consistent guest/authenticated behavior across all pages.

## Key Changes Made

### 1. **Unified Authentication Logic**
- **Before**: Mixed usage of `isGuest` flag and `user` object checks
- **After**: Consistent use of `!user` to determine guest state
- **Reason**: Simplified logic and eliminated conflicting states

### 2. **Components Updated**
- ✅ `Home.jsx` - Fixed navigation and feature access
- ✅ `Suggester.jsx` - Fixed navigation display
- ✅ `Calendar.jsx` - Fixed navigation and toggle functionality
- ✅ `ProtectedRoute.jsx` - Simplified authentication check
- ✅ `Login.jsx` - Removed redundant guest checks

### 3. **Enhanced Logout Functionality**
- Complete storage cleanup (tokens, cache, preferences)
- React Query cache clearing to prevent data leaks
- Browser credential clearing for security
- Cache clearing for seamless account switching

## Authentication States

### Guest User (Default)
- **State**: `user = null`
- **Navigation**: Shows "Sign Up" and "Login" buttons
- **Access**: Can view public content (events, categories, AI chat)
- **Restrictions**: Cannot create events, view profile, or access user-specific features

### Authenticated User
- **State**: `user = {valid user object}`
- **Navigation**: Shows "Create Event", "My Events", "Profile", "Logout"
- **Access**: Full access to all features
- **Data**: Can access personal events, preferences, friends, etc.

## Flow Diagram

```
App Startup
    ↓
Initialize Auth State
    ↓
Check for Valid Token
    ↓
┌─────────────────┬─────────────────┐
│   Token Valid   │   No/Invalid    │
│       ↓         │     Token       │
│ Set user object │       ↓         │
│       ↓         │  user = null    │
│ Show Auth UI    │       ↓         │
│                 │ Show Guest UI   │
└─────────────────┴─────────────────┘
    ↓
User Interacts with App
    ↓
┌─────────────────┬─────────────────┐
│    Login        │     Logout      │
│       ↓         │       ↓         │
│ Set user object │ Clear all data  │
│       ↓         │       ↓         │
│ Show Auth UI    │ user = null     │
│                 │       ↓         │
│                 │ Show Guest UI   │
└─────────────────┴─────────────────┘
```

## Key Benefits

1. **Consistent Experience**: All pages now show the same guest interface when not authenticated
2. **Seamless Account Switching**: Complete cleanup allows switching between different user accounts
3. **Security**: Proper data isolation between users and sessions
4. **Simplified Logic**: Single source of truth for authentication state (`!user`)
5. **Better UX**: No more authentication loops or conflicting states

## Testing the Flow

### Guest Experience
1. Visit base URL → Should see guest interface
2. Navigate to any page → Should consistently see "Sign Up/Login" options
3. Try accessing protected routes → Should redirect to login

### Authenticated Experience
1. Login with valid credentials → Should see authenticated interface
2. Navigate between pages → Should see "Create Event/My Events/Profile/Logout"
3. Access protected features → Should work without issues

### Account Switching
1. Login with Account A → Access A's data
2. Logout → Return to clean guest state
3. Login with Account B → Access B's data (no data bleed from Account A)

## Error Handling

- **ErrorBoundary**: Catches any rendering errors and shows friendly error page
- **Loading States**: Proper loading indicators during auth state determination
- **Network Errors**: Graceful handling of backend connectivity issues
- **Token Expiry**: Automatic logout and cleanup when tokens expire 