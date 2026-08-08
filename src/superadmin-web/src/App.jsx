import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
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
import XArchiveDebugPage from './pages/XArchiveDebugPage.jsx';
import IncidentDetailPage from './components/IncidentDetail/IncidentDetailPage.jsx';
import ZoneDetailPage from './components/ZoneDetail/ZoneDetailPage.jsx';
import ZonesPage from './pages/ZonesPage.jsx';
import IncidentsPage from './pages/IncidentsPage.jsx';
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
        {/* Map workspace, table directories + detail pages render bare (no sidebar layout) */}
        <Route path="/superadmin/map" element={<MapPage />} />
        <Route path="/superadmin/zones" element={<ZonesPage />} />
        <Route path="/superadmin/incidents" element={<IncidentsPage />} />
        <Route path="/superadmin/incident/:id" element={<IncidentDetailPage />} />
        <Route path="/superadmin/zone/:id" element={<ZoneDetailPage />} />
        <Route element={<Layout />}>
          <Route path="/superadmin" element={<DashboardPage />} />
          <Route path="/superadmin/users" element={<UsersPage />} />
          <Route path="/superadmin/public-users" element={<PublicUsersPage />} />
          <Route path="/superadmin/audit" element={<SystemActivityPage />} />
          <Route path="/superadmin/public-activity" element={<PublicActivityPage />} />
          <Route path="/superadmin/domains" element={<DomainsPage />} />
          <Route path="/superadmin/zone-categories" element={<ZoneCategoriesPage />} />
          <Route path="/superadmin/system" element={<SystemPage />} />
          <Route path="/superadmin/export" element={<ExportPage />} />
          <Route path="/superadmin/recycle-bin" element={<RecycleBinPage />} />
          <Route path="/superadmin/x-archive-debug" element={<XArchiveDebugPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/superadmin" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

// Per-route document titles (first match wins)
const ROUTE_TITLES = [
  { match: /^\/login$/, title: 'Login — Superadmin' },
  { match: /^\/superadmin$/, title: 'Dashboard — Superadmin' },
  { match: /^\/superadmin\/map$/, title: 'Map — Superadmin' },
  { match: /^\/superadmin\/incidents$/, title: 'Incidents — Superadmin' },
  { match: /^\/superadmin\/zones$/, title: 'Zones — Superadmin' },
  { match: /^\/superadmin\/users$/, title: 'Users — Superadmin' },
  { match: /^\/superadmin\/public-users$/, title: 'Public Users — Superadmin' },
  { match: /^\/superadmin\/audit$/, title: 'Audit — Superadmin' },
  { match: /^\/superadmin\/domains$/, title: 'Domains — Superadmin' },
  { match: /^\/superadmin\/zone-categories$/, title: 'Zone Categories — Superadmin' },
  { match: /^\/superadmin\/system$/, title: 'System — Superadmin' },
  { match: /^\/superadmin\/export$/, title: 'Export — Superadmin' },
  { match: /^\/superadmin\/recycle-bin$/, title: 'Recycle Bin — Superadmin' },
  { match: /^\/superadmin\/incident\//, title: 'Incident — Superadmin' },
  { match: /^\/superadmin\/zone\//, title: 'Zone — Superadmin' },
  { match: /.*/, title: 'IntelMap24 Superadmin' },
];

function RouteTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const hit = ROUTE_TITLES.find((r) => r.match.test(pathname));
    if (hit) document.title = hit.title;
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RouteTitle />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
