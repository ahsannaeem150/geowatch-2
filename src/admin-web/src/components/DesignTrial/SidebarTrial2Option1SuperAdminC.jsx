import React, { useState } from 'react';
import SidebarTrial2Option1Base from './SidebarTrial2Option1Base.jsx';
import { AuditLogPanel, UserProfileDrawer } from './SidebarTrial2Option1SuperAdminAudit.jsx';
import { INCIDENT, TIMELINE } from './SidebarTrialShared.jsx';

/* Option C — Audit log is a fixed third column on the right */

export default function SidebarTrial2Option1SuperAdminC() {
  const [userId, setUserId] = useState(null);

  const rightSidebar = (
    <AuditLogPanel incident={INCIDENT} events={TIMELINE} onUserClick={setUserId} />
  );

  return (
    <>
      <SidebarTrial2Option1Base mode="superadmin" rightSidebar={rightSidebar} />
      {userId && <UserProfileDrawer userId={userId} onClose={() => setUserId(null)} />}
    </>
  );
}
