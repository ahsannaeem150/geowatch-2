import IncidentDetailOptionF from './IncidentDetailOptionF.jsx';
import CreateIncidentTrialPanel from './CreateIncidentTrialPanel.jsx';

export default function SidebarTrial2Admin() {
  return (
    <IncidentDetailOptionF
      mode="admin"
      leftPanel={<CreateIncidentTrialPanel />}
    />
  );
}
