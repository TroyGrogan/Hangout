import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'

// Create a client
const queryClient = new QueryClient()

// Make QueryClient globally accessible for manual cache clearing
window.__REACT_QUERY_CLIENT__ = queryClient;

// Capture the initial route for refresh restoration
const currentPath = window.location.pathname + window.location.search + window.location.hash;
const isRefresh = performance.navigation?.type === 1 || performance.getEntriesByType('navigation')[0]?.type === 'reload';

// Store initial path for the PageStateManager to use
window.__INITIAL_PATH__ = currentPath;
window.__IS_REFRESH__ = isRefresh;

console.log('[main.jsx] App initialization:', {
  initialPath: currentPath,
  isRefresh: isRefresh,
  navigationType: performance.navigation?.type || 'unknown'
});

createRoot(document.getElementById('root')).render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
)
