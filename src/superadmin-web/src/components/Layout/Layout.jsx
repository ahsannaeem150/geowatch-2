import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';

export default function Layout() {
  const location = useLocation();
  const isMapPage = location.pathname === '/superadmin/map';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-gradient)' }}>
      <Sidebar />
      <div
        style={{
          flex: 1,
          marginLeft: 'var(--sidebar-width)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          transition: 'margin-left var(--transition-base)',
        }}
      >
        <TopBar />
        <main
          style={{
            flex: 1,
            padding: isMapPage ? 0 : '24px 28px',
            overflowY: isMapPage ? 'hidden' : 'auto',
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
