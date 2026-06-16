import { Icons } from './IncidentIcons.jsx';
import { Badge, SeverityBadge, VerificationBadge, StatusBadge } from './IncidentBadges.jsx';
import { formatDate, formatTime } from './IncidentUtils.js';

function SaveButton({ saved = false }) {
  return (
    <button type="button" title={saved ? 'Saved' : 'Save incident'} className={`id-save ${saved ? 'saved' : ''}`}>
      {saved ? '★' : '☆'}
    </button>
  );
}

export default function SummaryCard({ incident, children, onTitleClick, mode = 'user' }) {
  const roleMeta =
    mode === 'superadmin'
      ? { label: 'Superadmin', color: '#6366f1' }
      : mode === 'admin'
      ? { label: 'Admin', color: '#9f1239' }
      : null;
  return (
    <div className="id-summary">
      <div className="id-summary__row">
        <Badge color={incident.domainColor || incident.categoryColor || '#9f1239'}>{incident.domain || incident.categoryName || incident.category}</Badge>
        <StatusBadge status={incident.status} />
        <VerificationBadge status={incident.verification} />
        <SeverityBadge level={incident.severity} />
        {roleMeta && <Badge color={roleMeta.color}>{roleMeta.label}</Badge>}
      </div>

      <div className="id-summary__title-row">
        <h1 className="id-summary__title">
          {onTitleClick ? (
            <button onClick={onTitleClick} className="id-summary__title-link">
              {incident.title}
            </button>
          ) : (
            incident.title
          )}
        </h1>
        <SaveButton saved />
      </div>

      <div className="id-summary__meta">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          {Icons.mapPin} {incident.locationContext || incident.location}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          {Icons.calendar} {formatDate(incident.startDate)} · {formatTime(incident.startDate)}
        </span>
      </div>

      <p className="id-summary__desc">{incident.description}</p>

      {children}
    </div>
  );
}
