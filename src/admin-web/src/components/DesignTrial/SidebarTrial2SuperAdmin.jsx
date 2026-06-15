import React from 'react';
import './IncidentDetailTrial.css';

export default function SidebarTrial2SuperAdmin() {
  return (
    <div className="id-trial-page">
      <div className="id-fake-map">
        <div className="id-fake-map-grid" />
        <div className="id-fake-map-label">Selected incident</div>
      </div>

      <aside className="id-sidebar">
        <div className="id-sidebar__scroll">
          <div className="id-summary">
            <div className="id-summary__row">
              <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                Superadmin
              </span>
            </div>
            <h1 className="id-summary__title">Superadmin sidebar</h1>
            <p className="id-summary__desc">
              This view is under construction. Incident-level audit, role management, and global moderation tools will appear here.
            </p>
            <div className="id-summary__actions">
              <button className="id-btn" onClick={() => window.history.back()}>
                Go back
              </button>
            </div>
          </div>
          <div style={{ height: 40 }} />
        </div>
      </aside>
    </div>
  );
}
