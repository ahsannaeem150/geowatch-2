import React, { useState } from 'react';
import SidebarTrial2Option1Base from './SidebarTrial2Option1Base.jsx';
import { AuditLogPanel, UserProfileDrawer, Drawer } from './SidebarTrial2Option1SuperAdminAudit.jsx';
import { INCIDENT, TIMELINE } from './SidebarTrialShared.jsx';

/* Option B — Audit log opens in a right-hand drawer */

export default function SidebarTrial2Option1SuperAdminB() {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState(null);

  const topBarExtra = (
    <button type="button" className="opt1-topbar-btn" onClick={() => setOpen(true)}>
      📋 Audit log
    </button>
  );

  return (
    <>
      <SidebarTrial2Option1Base mode="superadmin" topBarExtra={topBarExtra} />
      <Drawer open={open} onClose={() => setOpen(false)} title="Audit log">
        <AuditLogPanel incident={INCIDENT} events={TIMELINE} onUserClick={setUserId} />
      </Drawer>
      {userId && <UserProfileDrawer userId={userId} onClose={() => setUserId(null)} />}
    </>
  );
}
