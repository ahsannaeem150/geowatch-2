import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import LoginPage from './components/Login/LoginPage.jsx';
import DashboardLayout from './components/Layout/DashboardLayout.jsx';
import DesignTrial from './components/DesignTrial/DesignTrial.jsx';
import SidebarTrial from './components/DesignTrial/SidebarTrial.jsx';
import SidebarTrial2 from './components/DesignTrial/SidebarTrial2.jsx';
import SidebarTrial2Option1User from './components/DesignTrial/SidebarTrial2Option1User.jsx';
import SidebarTrial2Option1Admin from './components/DesignTrial/SidebarTrial2Option1Admin.jsx';
import SidebarTrial2Option1SuperAdmin from './components/DesignTrial/SidebarTrial2Option1SuperAdmin.jsx';
import SidebarTrial2Option1SuperAdminA from './components/DesignTrial/SidebarTrial2Option1SuperAdminA.jsx';
import SidebarTrial2Option1SuperAdminB from './components/DesignTrial/SidebarTrial2Option1SuperAdminB.jsx';
import SidebarTrial2Option1SuperAdminC from './components/DesignTrial/SidebarTrial2Option1SuperAdminC.jsx';
import ZonesPage from './pages/ZonesPage.jsx';

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
      <Route path="/sidebarTrial2" element={<SidebarTrial2 />} />
      <Route path="/sidebarTrial2/option1user" element={<SidebarTrial2Option1User />} />
      <Route path="/sidebarTrial2/option1admin" element={<SidebarTrial2Option1Admin />} />
      <Route path="/sidebarTrial2/option1superadmin" element={<SidebarTrial2Option1SuperAdmin />} />
      <Route path="/sidebarTrial2/option1superadmin-a" element={<SidebarTrial2Option1SuperAdminA />} />
      <Route path="/sidebarTrial2/option1superadmin-b" element={<SidebarTrial2Option1SuperAdminB />} />
      <Route path="/sidebarTrial2/option1superadmin-c" element={<SidebarTrial2Option1SuperAdminC />} />
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
