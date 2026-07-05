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
import ZoneDetailPage from './pages/ZoneDetailPage.jsx';
import MapWorkspaceTrialA from './pages/trial/MapWorkspaceTrialA.jsx';
import PowerSearchTrial from './pages/trial/PowerSearchTrial.jsx';
import LayerDrawerOptionsTrial from './pages/trial/LayerDrawerOptionsTrial.jsx';

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

const loginRoute = <Route path="/login" element={<LoginPage />} />;
const trialRoute = <Route path="/trial" element={<DesignTrial />} />;
const sidebarTrialRoute = <Route path="/sidebarTrial" element={<SidebarTrial />} />;
const sidebarTrial2Route = <Route path="/sidebarTrial2" element={<IncidentDetailOptionF />} />;
const sidebarTrial2OptionFRoute = <Route path="/sidebarTrial2/optionF" element={<IncidentDetailOptionF />} />;
const sidebarTrial2XGalleryRoute = <Route path="/sidebarTrial2/xGallery" element={<IncidentDetailOptionFXGallery />} />;
const sidebarTrial2AdminRoute = <Route path="/sidebarTrial2/admin" element={<SidebarTrial2Admin />} />;
const sidebarTrial2SuperadminRoute = <Route path="/sidebarTrial2/superadmin" element={<SidebarTrial2SuperAdmin />} />;
const xPostOptionsRoute = <Route path="/xPostOptions" element={<XPostOptionsPage />} />;
const incidentTrialUserRoute = <Route path="/incident-trial/user" element={<SidebarTrial2Option1User />} />;
const incidentTrialAdminRoute = <Route path="/incident-trial/admin" element={<SidebarTrial2Option1Admin />} />;
const incidentTrialSuperadminRoute = <Route path="/incident-trial/superadmin" element={<SidebarTrial2Option1SuperAdmin />} />;
const incidentRoute = (
  <Route path="/incident/:id" element={<ProtectedRoute><IncidentDetailPage /></ProtectedRoute>} />
);
const zonesRoute = (
  <Route path="/zones" element={<ProtectedRoute><ZonesPage /></ProtectedRoute>} />
);
const zoneRoute = (
  <Route path="/zone/:id" element={<ProtectedRoute><ZoneDetailPage /></ProtectedRoute>} />
);
const mapWorkspaceTrialARoute = <Route path="/trial/map-workspace-a" element={<MapWorkspaceTrialA />} />;
const powerSearchTrialRoute = <Route path="/trial/power-search" element={<PowerSearchTrial />} />;
const layerDrawerOptionsTrialRoute = <Route path="/trial/layer-drawer-options" element={<LayerDrawerOptionsTrial />} />;

const dashboardRoute = (
  <Route path="/*" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>} />
);

const AppRoutes = React.memo(function AppRoutes() {
  return (
    <Routes>
      {loginRoute}
      {trialRoute}
      {sidebarTrialRoute}
      {sidebarTrial2Route}
      {sidebarTrial2OptionFRoute}
      {sidebarTrial2XGalleryRoute}
      {sidebarTrial2AdminRoute}
      {sidebarTrial2SuperadminRoute}
      {xPostOptionsRoute}
      {incidentTrialUserRoute}
      {incidentTrialAdminRoute}
      {incidentTrialSuperadminRoute}
      {mapWorkspaceTrialARoute}
      {powerSearchTrialRoute}
      {layerDrawerOptionsTrialRoute}
      {incidentRoute}
      {zonesRoute}
      {zoneRoute}
      {dashboardRoute}
    </Routes>
  );
});

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
