import { SEVERITY_LABELS, VERIFICATION } from './IncidentUtils.js';
import { useTheme } from '@shared/useTheme.js';
import { getBadgeColors, getSeverityBadgeColors } from '@shared/utils/themeColors.js';

export function Badge({ children, color, className = 'id-badge' }) {
  const { theme } = useTheme();
  const preset = color
    ? getBadgeColors(color, theme)
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
  const { theme } = useTheme();
  const cfg = SEVERITY_LABELS[level] || SEVERITY_LABELS[3];
  const sev = getSeverityBadgeColors(cfg.color, theme);
  return (
    <span
      className="id-badge--severity"
      style={{ background: sev.background, border: sev.border, color: sev.color }}
    >
      <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.5px' }}>{level}</span>
      <span style={{ width: 1, height: 12, background: sev.divider, borderRadius: 1 }} />
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
