import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import LoginPage from './components/Login/LoginPage.jsx';
import DashboardLayout from './components/Layout/DashboardLayout.jsx';
import DesignTrial from './components/DesignTrial/DesignTrial.jsx';
import SidebarTrial from './components/DesignTrial/SidebarTrial.jsx';
import SidebarTrial2 from './components/DesignTrial/SidebarTrial2.jsx';
import SidebarTrial2Option1 from './components/DesignTrial/SidebarTrial2Option1.jsx';
import SidebarTrial2Option2 from './components/DesignTrial/SidebarTrial2Option2.jsx';
import SidebarTrial2Option3 from './components/DesignTrial/SidebarTrial2Option3.jsx';
import SidebarTrial2Option4 from './components/DesignTrial/SidebarTrial2Option4.jsx';
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
      <Route path="/sidebarTrial2/option1" element={<SidebarTrial2Option1 />} />
      <Route path="/sidebarTrial2/option2" element={<SidebarTrial2Option2 />} />
      <Route path="/sidebarTrial2/option3" element={<SidebarTrial2Option3 />} />
      <Route path="/sidebarTrial2/option4" element={<SidebarTrial2Option4 />} />
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
