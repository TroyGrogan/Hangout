import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'

// Create a client
const queryClient = new QueryClient()

// Make QueryClient globally accessible for manual cache clearing
window.__REACT_QUERY_CLIENT__ = queryClient;

createRoot(document.getElementById('root')).render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
)
