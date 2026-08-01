import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import './styles/map-workspace.css';
import '@shared/media-components.css';
import '@shared/styles/incident-detail.css';
import { ThemeProvider } from '@shared/theme-context.jsx';

// Apply the persisted reduce-motion preference before first paint
try {
  if (localStorage.getItem('geowatch_superadmin_reduce_motion') === 'true') {
    document.documentElement.classList.add('reduce-motion');
  }
} catch {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
