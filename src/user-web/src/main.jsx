import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import '@shared/media-components.css';
import '@shared/styles/incident-detail.css';
import { ThemeProvider } from '@shared/theme-context.jsx';
import { PublicAuthProvider } from './contexts/PublicAuthContext.jsx';
import { SignInModalProvider } from './contexts/SignInModalContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <PublicAuthProvider>
        <SignInModalProvider>
          <App />
        </SignInModalProvider>
      </PublicAuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
