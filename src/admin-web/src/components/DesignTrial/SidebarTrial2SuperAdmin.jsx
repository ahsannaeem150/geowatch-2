import React, { useState } from 'react';
import IncidentDetailOptionF from './IncidentDetailOptionF.jsx';
import { AuditLogPanel, UserProfileDrawer, Drawer } from './SidebarTrial2Option1SuperAdminAudit.jsx';
import { INCIDENT, TIMELINE } from './SidebarTrialShared.jsx';

/* ─────────────────────────────────────────────────────────────────────────────
   Superadmin sidebar trial — Option F shell with full superadmin controls.
   Route: /sidebarTrial2/superadmin
   ───────────────────────────────────────────────────────────────────────────── */

export default function SidebarTrial2SuperAdmin() {
  const [auditOpen, setAuditOpen] = useState(false);
  const [userId, setUserId] = useState(null);

  return (
    <>
      <IncidentDetailOptionF
        mode="superadmin"
        onOpenAudit={() => setAuditOpen(true)}
        onViewCreator={(id) => setUserId(id || INCIDENT.createdBy)}
      />
      <Drawer open={auditOpen} onClose={() => setAuditOpen(false)} title="Audit log" zIndex={10500}>
        <AuditLogPanel
          incident={INCIDENT}
          events={TIMELINE}
          onUserClick={(id) => setUserId(id)}
        />
      </Drawer>
      {userId && (
        <UserProfileDrawer userId={userId} onClose={() => setUserId(null)} zIndex={10600} />
      )}
    </>
  );
}
