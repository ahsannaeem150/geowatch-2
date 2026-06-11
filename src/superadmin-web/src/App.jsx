import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import LoginPage from './components/Login/LoginPage.jsx';
import Layout from './components/Layout/Layout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import PublicUsersPage from './pages/PublicUsersPage.jsx';
import MapPage from './pages/MapPage.jsx';
import SystemActivityPage from './pages/SystemActivityPage.jsx';
import PublicActivityPage from './pages/PublicActivityPage.jsx';
import DomainsPage from './pages/DomainsPage.jsx';
import ZoneCategoriesPage from './pages/ZoneCategoriesPage.jsx';
import SystemPage from './pages/SystemPage.jsx';
import ExportPage from './pages/ExportPage.jsx';
import RecycleBinPage from './pages/RecycleBinPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        background: 'var(--bg-base)',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          border: '3px solid var(--border-default)',
          borderTopColor: 'var(--navy-500)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading console...</p>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function RequireSuperAdmin() {
  const { isLoading, isAuthenticated, isSuperAdmin } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isSuperAdmin) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          background: 'var(--bg-base)',
          padding: 24,
        }}
      >
        <div
          style={{
            padding: '24px 32px',
            background: 'var(--alert-error-bg)',
            border: '1px solid var(--alert-error-border)',
            borderRadius: 12,
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--danger)', marginBottom: 8 }}>
            Access Denied
          </p>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            Superadmin privileges are required to access the console.
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

function RedirectIfAuthenticated() {
  const { isLoading, isAuthenticated, isSuperAdmin } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated && isSuperAdmin) {
    return <Navigate to="/superadmin" replace />;
  }

  return <LoginPage />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<RedirectIfAuthenticated />} />

      <Route element={<RequireSuperAdmin />}>
        <Route element={<Layout />}>
          <Route path="/superadmin" element={<DashboardPage />} />
          <Route path="/superadmin/users" element={<UsersPage />} />
          <Route path="/superadmin/public-users" element={<PublicUsersPage />} />
          <Route path="/superadmin/map" element={<MapPage />} />
          <Route path="/superadmin/audit" element={<SystemActivityPage />} />
          <Route path="/superadmin/public-activity" element={<PublicActivityPage />} />
          <Route path="/superadmin/domains" element={<DomainsPage />} />
          <Route path="/superadmin/zone-categories" element={<ZoneCategoriesPage />} />
          <Route path="/superadmin/system" element={<SystemPage />} />
          <Route path="/superadmin/export" element={<ExportPage />} />
          <Route path="/superadmin/recycle-bin" element={<RecycleBinPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/superadmin" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
