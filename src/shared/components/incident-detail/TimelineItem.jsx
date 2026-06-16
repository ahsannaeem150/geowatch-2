import { Icons } from './IncidentIcons.jsx';
import { VerificationBadge } from './IncidentBadges.jsx';
import { formatTime, relativeTime } from './IncidentUtils.js';

export function TimelineItem({ event, index, total, children }) {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  return (
    <div className="id-timeline-item">
      <div className="id-timeline-spine">
        {!isFirst && <div className="id-timeline-line" />}
        <div className={`id-timeline-dot ${isFirst ? 'id-timeline-dot--latest' : ''}`} />
        {!isLast && <div className="id-timeline-line" />}
      </div>
      <div className="id-timeline-content">{children}</div>
    </div>
  );
}

export function UpdateHeader({ event }) {
  const typeColor = event.type === 'report' ? 'var(--accent-light)' : 'var(--text-muted)';
  const typeLabel = event.type === 'report' ? 'Initial report' : 'Update';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
      <span
        style={{
          fontSize: 10,
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          color: typeColor,
        }}
      >
        {typeLabel}
      </span>
      <span style={{ fontSize: 12, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
        {formatTime(event.timestamp || event.updateDate)}
      </span>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        · {relativeTime(event.timestamp || event.updateDate)}
      </span>
      <span style={{ marginLeft: 'auto' }}>
        <VerificationBadge status={event.verification || event.verificationStatus} />
      </span>
    </div>
  );
}
