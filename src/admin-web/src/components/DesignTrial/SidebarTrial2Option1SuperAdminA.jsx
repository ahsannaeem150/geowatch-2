import React, { useMemo, useState } from 'react';
import SidebarTrial2Option1Base from './SidebarTrial2Option1Base.jsx';
import { AuditLogPanel, UserProfileDrawer, generateAuditData } from './SidebarTrial2Option1SuperAdminAudit.jsx';
import { INCIDENT, TIMELINE } from './SidebarTrialShared.jsx';

/* Option A — Audit as an extra tab inside the sticky evidence rail */

export default function SidebarTrial2Option1SuperAdminA() {
  const [userId, setUserId] = useState(null);
  const audit = useMemo(() => generateAuditData(INCIDENT, TIMELINE), []);

  const auditTab = {
    key: 'audit',
    label: 'Audit',
    icon: '📋',
    count: audit.logs.length,
    render: () => <AuditLogPanel incident={INCIDENT} events={TIMELINE} onUserClick={setUserId} />,
  };

  return (
    <>
      <SidebarTrial2Option1Base mode="superadmin" railExtraTabs={[auditTab]} />
      {userId && <UserProfileDrawer userId={userId} onClose={() => setUserId(null)} />}
    </>
  );
}
