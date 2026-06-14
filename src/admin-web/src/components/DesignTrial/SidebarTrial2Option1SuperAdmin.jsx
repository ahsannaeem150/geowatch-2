import React, { useState } from 'react';
import SidebarTrial2Option1Base from './SidebarTrial2Option1Base.jsx';
import { AuditLogPanel, UserProfileDrawer, Drawer } from './SidebarTrial2Option1SuperAdminAudit.jsx';
import { INCIDENT, TIMELINE } from './SidebarTrialShared.jsx';

/* Option 1 Superadmin — polished audit-drawer layout */

export default function SidebarTrial2Option1SuperAdmin() {
  const [auditOpen, setAuditOpen] = useState(false);
  const [userId, setUserId] = useState(null);

  const topBarExtra = (
    <button type="button" className="opt1-topbar-btn" onClick={() => setAuditOpen(true)}>
      📋 Audit log
    </button>
  );

  return (
    <>
      <SidebarTrial2Option1Base mode="superadmin" topBarExtra={topBarExtra} />
      <Drawer open={auditOpen} onClose={() => setAuditOpen(false)} title="Audit log" zIndex={10500}>
        <AuditLogPanel incident={INCIDENT} events={TIMELINE} onUserClick={setUserId} />
      </Drawer>
      {userId && (
        <UserProfileDrawer userId={userId} onClose={() => setUserId(null)} zIndex={10600} />
      )}
    </>
  );
}
