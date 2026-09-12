import React from 'react';
import ReactDOM from 'react-dom/client';
import ErrorBoundary from './components/shared/ErrorBoundary';
import App from './App';
import './index.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';

const queryClient = new QueryClient();

// Use a placeholder or environment variable for the client ID
const GOOGLE_CLIENT_ID = '251310558499-b6eoi15mfeobf6qcf9def4co6p7tq7mp.apps.googleusercontent.com';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <ErrorBoundary><App /></ErrorBoundary>
      </GoogleOAuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
