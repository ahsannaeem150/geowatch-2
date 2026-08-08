import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import '@shared/media-components.css';
import '@shared/styles/incident-detail.css';
import '@shared/styles/table-chips.css';
import { ThemeProvider } from '@shared/theme-context.jsx';
import { PublicAuthProvider } from './contexts/PublicAuthContext.jsx';
import { SignInModalProvider } from './contexts/SignInModalContext.jsx';

// Apply the persisted reduce-motion preference before first paint
try {
  if (localStorage.getItem('intelmap24_user_reduce_motion') === 'true') {
    document.documentElement.classList.add('reduce-motion');
  }
} catch {}

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
