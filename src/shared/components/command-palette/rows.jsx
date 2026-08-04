import React from 'react';
import {
  Search,
  Clock,
  Star,
  MapPin,
  Navigation,
  AlertCircle,
  ChevronRight,
  ArrowRight,
  Hexagon,
  Loader2,
} from 'lucide-react';
import { SeverityBadge } from '../SeverityBadge.jsx';
import { Badge } from '../Badge.jsx';
import { useTheme } from '../../useTheme.js';
import { getIncidentDomainColor } from '../../utils/themeColors.js';
import { formatArea } from '../../utils/zoneGeometry.js';
import { escapeRegExp, timeAgoLabel } from './utils.js';

export const kbdStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '22px',
  height: '22px',
  padding: '0 5px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-sm)',
  fontSize: '11px',
  fontWeight: 700,
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-mono)',
};

export function highlight(text, query) {
  if (!query.trim()) return <span>{text}</span>;
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            style={{
              background: 'var(--accent)',
              color: 'var(--text-on-accent)',
              borderRadius: '2px',
              padding: '0 2px',
              fontWeight: 700,
            }}
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

const rowButtonStyle = (active) => ({
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px 14px',
  background: active ? 'var(--accent-subtle-bg)' : 'transparent',
  border: `1px solid ${active ? 'var(--accent-light)' : 'transparent'}`,
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'all 0.12s ease',
  outline: 'none',
});

const rowHoverHandlers = (active) => ({
  onMouseEnter: (e) => {
    if (!active) e.currentTarget.style.background = 'var(--bg-hover)';
  },
  onMouseLeave: (e) => {
    if (!active) e.currentTarget.style.background = 'transparent';
  },
});

export function EmptyState({ query, onAdvanced, advancedLabel }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '72px 24px',
        color: 'var(--text-muted)',
        textAlign: 'center',
      }}
    >
      <Search size={38} strokeWidth={1.2} style={{ opacity: 0.35, marginBottom: '16px' }} />
      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
        {query ? 'No matching results' : 'Start typing to search'}
      </div>
      <div
        style={{
          fontSize: '13px',
          marginTop: '8px',
          opacity: 0.8,
          maxWidth: '340px',
          lineHeight: 1.5,
        }}
      >
        {query
          ? 'Try a different query, or use advanced filters for deeper searches.'
          : 'Find incidents, locations, or commands. Press ⌘K anytime.'}
      </div>
      {onAdvanced && (
        <button
          onClick={onAdvanced}
          style={{
            marginTop: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            background: 'var(--accent-subtle-bg)',
            border: '1px solid var(--accent-subtle-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--accent-light)',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {advancedLabel}
          <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}

export function ResultGroup({ label, icon: Icon, style }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '14px 10px 8px',
        fontSize: '10px',
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '1px',
        color: 'var(--text-muted)',
        ...style,
      }}
    >
      <Icon size={12} />
      {label}
    </div>
  );
}

export function ActionItem({ action, active, onClick, query }) {
  const Icon = action.icon;
  const hint = action.hint ?? action.shortcut;
  const subtitle = action.path ?? action.subtitle;
  return (
    <button
      onClick={onClick}
      className="omnibox-result-item"
      style={rowButtonStyle(active)}
      {...rowHoverHandlers(active)}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {Icon ? <Icon size={15} /> : <Search size={15} />}
      </div>
      <div style={{ flex: 1, minWidth: 0, fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
        {highlight(action.label, query)}
      </div>
      {subtitle && (
        <span
          style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            flexShrink: 0,
          }}
        >
          {subtitle}
        </span>
      )}
      {hint && <kbd style={kbdStyle}>{hint}</kbd>}
    </button>
  );
}

export function IncidentItem({ incident, active, saved, onClick, query, showRecentLabel }) {
  const { theme } = useTheme();
  const categoryColor = getIncidentDomainColor(incident, theme);
  return (
    <button
      onClick={onClick}
      className="omnibox-result-item"
      style={rowButtonStyle(active)}
      {...rowHoverHandlers(active)}
    >
      <div
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: categoryColor,
          boxShadow: `0 0 10px ${categoryColor}`,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '15px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            lineHeight: 1.35,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {highlight(incident.title, query)}
          {saved && <Star size={12} fill="var(--warning)" color="var(--warning)" />}
          {showRecentLabel && (
            <Badge style={{ padding: '1px 6px', fontSize: '10px', letterSpacing: '0.5px' }}>Recent</Badge>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginTop: '7px',
            fontSize: '12px',
            color: 'var(--text-muted)',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MapPin size={11} />
            {highlight(incident._location, query)}
          </span>
          <Badge color={categoryColor} style={{ padding: '2px 8px', fontSize: '10px' }}>
            {incident._category}
          </Badge>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={11} />
            {timeAgoLabel(incident.created_at)}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
        <span style={{ transform: 'scale(0.85)', transformOrigin: 'right center' }}>
          <SeverityBadge level={incident.severity} />
        </span>
      </div>
    </button>
  );
}

export function ZoneItem({ zone, active, saved, onClick, query }) {
  const { theme } = useTheme();
  const categoryColor = zone.zone_category_color || getIncidentDomainColor(zone, theme);
  const areaLabel = zone.area_sq_m != null ? formatArea(parseFloat(zone.area_sq_m)) : '';
  return (
    <button
      onClick={onClick}
      className="omnibox-result-item"
      style={rowButtonStyle(active)}
      {...rowHoverHandlers(active)}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-subtle)',
          color: categoryColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Hexagon size={17} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '15px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            lineHeight: 1.35,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {highlight(zone.title, query)}
          {saved && <Star size={12} fill="var(--warning)" color="var(--warning)" />}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginTop: '7px',
            fontSize: '12px',
            color: 'var(--text-muted)',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MapPin size={11} />
            {highlight(zone._location, query)}
          </span>
          {zone._category && (
            <Badge color={categoryColor} style={{ padding: '2px 8px', fontSize: '10px' }}>
              {zone._category}
            </Badge>
          )}
          {areaLabel && <span>{areaLabel}</span>}
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={11} />
            {timeAgoLabel(zone.created_at)}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
        <span style={{ transform: 'scale(0.85)', transformOrigin: 'right center' }}>
          <SeverityBadge level={zone.severity} />
        </span>
      </div>
    </button>
  );
}

export function LocationItem({ location, active, onClick, query }) {
  return (
    <button
      onClick={onClick}
      className="omnibox-result-item"
      style={rowButtonStyle(active)}
      {...rowHoverHandlers(active)}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--info)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Navigation size={17} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
          {highlight(location.name, query)}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{location.detail}</div>
      </div>
      <ChevronRight size={16} color="var(--text-muted)" />
    </button>
  );
}

export function StatusRow({ kind, message, hint }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 14px',
        fontSize: '13px',
        color: 'var(--text-muted)',
      }}
    >
      {kind === 'loading' ? (
        <Loader2 size={14} className="omnibox-spin" />
      ) : (
        <AlertCircle size={14} color="var(--warning)" />
      )}
      <span>{message}</span>
      {hint && <span style={{ opacity: 0.65 }}>· {hint}</span>}
    </div>
  );
}

export function BridgeItem({ active, onClick, title, hint }) {
  return (
    <button
      onClick={onClick}
      className="omnibox-result-item"
      style={{
        ...rowButtonStyle(active),
        marginTop: '4px',
        border: `1px solid ${active ? 'var(--accent-light)' : 'var(--border-subtle)'}`,
      }}
      {...rowHoverHandlers(active)}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--accent-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Search size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-light)' }}>{title}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>{hint}</div>
      </div>
      <kbd style={kbdStyle}>↵</kbd>
    </button>
  );
}
