import { SEVERITY_LABELS, VERIFICATION } from './IncidentUtils.js';

export function Badge({ children, color, className = 'id-badge' }) {
  const preset = color
    ? { background: `${color}18`, color, border: `1px solid ${color}40` }
    : { background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' };
  return (
    <span
      className={className}
      style={{
        ...preset,
        boxSizing: 'border-box',
      }}
    >
      {color && <span className="id-status-dot" style={{ background: preset.color }} />}
      {children}
    </span>
  );
}

export function SeverityBadge({ level }) {
  const cfg = SEVERITY_LABELS[level] || SEVERITY_LABELS[3];
  return (
    <span
      className="id-badge--severity"
      style={{ background: `${cfg.color}10`, border: `1px solid ${cfg.color}30`, color: cfg.color }}
    >
      <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.5px' }}>{level}</span>
      <span style={{ width: 1, height: 12, background: `${cfg.color}40`, borderRadius: 1 }} />
      <span>{cfg.label}</span>
    </span>
  );
}

export function VerificationBadge({ status }) {
  const cfg = VERIFICATION[status] || VERIFICATION.unverified;
  return <Badge color={cfg.color}>{cfg.label}</Badge>;
}

export function StatusBadge({ status }) {
  const color = status === 'active' ? '#22c55e' : '#6b7280';
  return <Badge color={color}>{status}</Badge>;
}
