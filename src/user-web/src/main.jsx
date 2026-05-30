import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { ThemeProvider } from '@shared/theme-context.jsx';
import { PublicAuthProvider } from './contexts/PublicAuthContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <PublicAuthProvider>
        <App />
      </PublicAuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
