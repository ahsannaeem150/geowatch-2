import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import LoginPage from './components/Login/LoginPage.jsx';
import DashboardLayout from './components/Layout/DashboardLayout.jsx';
import DesignTrial from './components/DesignTrial/DesignTrial.jsx';
import SidebarTrial from './components/DesignTrial/SidebarTrial.jsx';
import IncidentDetailOptionF from './components/DesignTrial/IncidentDetailOptionF.jsx';
import IncidentDetailOptionFXGallery from './components/DesignTrial/IncidentDetailOptionFXGallery.jsx';
import XPostOptionsPage from './components/DesignTrial/XPostOptionsPage.jsx';
import SidebarTrial2Option1User from './components/DesignTrial/SidebarTrial2Option1User.jsx';
import SidebarTrial2Option1Admin from './components/DesignTrial/SidebarTrial2Option1Admin.jsx';
import SidebarTrial2Option1SuperAdmin from './components/DesignTrial/SidebarTrial2Option1SuperAdmin.jsx';
import SidebarTrial2Admin from './components/DesignTrial/SidebarTrial2Admin.jsx';
import SidebarTrial2SuperAdmin from './components/DesignTrial/SidebarTrial2SuperAdmin.jsx';

import ZonesPage from './pages/ZonesPage.jsx';
import IncidentDetailPage from './components/IncidentDetail/IncidentDetailPage.jsx';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-deep)',
          color: 'var(--text-secondary)',
        }}
      >
        Loading...
      </div>
    );
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/trial" element={<DesignTrial />} />
      <Route path="/sidebarTrial" element={<SidebarTrial />} />
      <Route path="/sidebarTrial2" element={<IncidentDetailOptionF />} />
      <Route path="/sidebarTrial2/optionF" element={<IncidentDetailOptionF />} />
      <Route path="/sidebarTrial2/xGallery" element={<IncidentDetailOptionFXGallery />} />
      <Route path="/sidebarTrial2/admin" element={<SidebarTrial2Admin />} />
      <Route path="/sidebarTrial2/superadmin" element={<SidebarTrial2SuperAdmin />} />

      <Route path="/xPostOptions" element={<XPostOptionsPage />} />
      <Route path="/incident-trial/user" element={<SidebarTrial2Option1User />} />
      <Route path="/incident-trial/admin" element={<SidebarTrial2Option1Admin />} />
      <Route path="/incident-trial/superadmin" element={<SidebarTrial2Option1SuperAdmin />} />
      <Route
        path="/incident/:id"
        element={
          <ProtectedRoute>
            <IncidentDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/zones"
        element={
          <ProtectedRoute>
            <ZonesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
