import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Eye,
  EyeOff,
  MapPin,
  Bell,
  Bookmark,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Filter,
  Info,
  Monitor,
  Minimize2,
  Palette,
  Plus,
  Crosshair,
  RefreshCw,
  Trash2,
  FileText,
  Activity as ActivityIcon,
  Hexagon,
  ZapOff,
} from 'lucide-react';
import ThemeToggle from '@shared/components/ThemeToggle.jsx';
import { SEVERITY_SCALE } from '@shared/constants.js';
import { useTheme } from '@shared/useTheme.js';
import { useStyle } from '@shared/useStyle.js';
import { getIncidentDomainColor, getDomainColor } from '@shared/utils/themeColors.js';

const DRAWER_WIDTH = 360;

function timeAgo(dateValue, nowMs = Date.now()) {
  if (!dateValue) return '';
  const dateMs = typeof dateValue === 'number' ? dateValue : new Date(dateValue).getTime();
  if (!Number.isFinite(dateMs)) return '';
  const diffMin = Math.floor((nowMs - dateMs) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

// Compact variant for single-line meta rows: "15d" instead of "15d ago".
// Post-processes timeAgo so all other consumers keep the long form.
function timeAgoCompact(dateValue, nowMs) {
  return timeAgo(dateValue, nowMs).replace(/ ago$/, '');
}

function LayerSection({ title, active, total, onShowAll, onHideAll, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(10px * var(--admin-ui-scale))' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'calc(8px * var(--admin-ui-scale))' }}>
          <span
            style={{
              fontSize: 'calc(12px * var(--admin-ui-scale))',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: 'var(--text-secondary)',
            }}
          >
            {title}
          </span>
          <span style={{ fontSize: 'calc(10px * var(--admin-ui-scale))', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {active}/{total}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 'calc(6px * var(--admin-ui-scale))' }}>
          <button onClick={onShowAll} style={layerActionBtnStyle}>
            Show all
          </button>
          <button onClick={onHideAll} style={layerActionBtnStyle}>
            Hide all
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}

const layerActionBtnStyle = {
  padding: 'calc(3px * var(--admin-ui-scale)) calc(8px * var(--admin-ui-scale))',
  fontSize: 'calc(10px * var(--admin-ui-scale))',
  fontWeight: 700,
  background: 'var(--bg-input)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  boxShadow: 'var(--shadow-sm)',
};

function LayerIcon({ icon }) {
  if (!icon) return <Hexagon size={12} strokeWidth={2} />;
  // Map a few common icon names to Lucide components if needed.
  // For now render the supplied icon component directly.
  if (typeof icon === 'function') {
    const Icon = icon;
    return <Icon size={12} strokeWidth={2} />;
  }
  if (typeof icon === 'string') {
    return <span style={{ fontSize: 'calc(10px * var(--admin-ui-scale))', fontWeight: 700 }}>{icon.slice(0, 2)}</span>;
  }
  return <Hexagon size={12} strokeWidth={2} />;
}

function LayerRow({ data, active, theme, onToggle }) {
  const tint = getDomainColor(data, theme);
  const softTint = `${tint}66`;
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'calc(8px * var(--admin-ui-scale))',
        padding: 'calc(6px * var(--admin-ui-scale)) calc(8px * var(--admin-ui-scale))',
        background: 'var(--bg-input)',
        border: `1px solid ${active ? softTint : 'var(--border-default)'}`,
        borderRadius: 'var(--radius-sm)',
        boxShadow: 'var(--shadow-sm)',
        cursor: 'pointer',
        textAlign: 'left',
        opacity: active ? 1 : 0.85,
        transition: 'all 0.15s ease',
        width: '100%',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent-light)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = active ? softTint : 'var(--border-default)';
      }}
    >
      <span
        style={{
          width: 'calc(20px * var(--admin-ui-scale))',
          height: 'calc(20px * var(--admin-ui-scale))',
          borderRadius: 'var(--radius-sm)',
          background: tint,
          color: 'var(--text-on-accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <LayerIcon icon={data.icon} />
      </span>
      <span
        style={{
          flex: 1,
          fontSize: 'calc(12px * var(--admin-ui-scale))',
          fontWeight: 600,
          color: 'var(--text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {data.name}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', color: active ? 'var(--accent-light)' : 'var(--text-muted)', flexShrink: 0 }}>
        {active ? <Eye size={14} /> : <EyeOff size={14} />}
      </span>
    </button>
  );
}

function IncidentCard({ incident, onClick }) {
  const { theme } = useTheme();
  // Polygon incidents (zones) have no domain/category — use the zone category
  const isZone = incident.geometry_type === 'polygon';
  const categoryColor = isZone ? incident.zone_category_color || '#6366f1' : getIncidentDomainColor(incident, theme);
  const categoryName = isZone ? incident.zone_category_name || 'Zone' : incident.domain_name || incident.category_name || incident.category || 'Unknown';
  const location = incident.location_context || incident.location || 'Unknown location';
  const createdAt = incident.created_at || incident.createdAt;

  return (
    <div
      onClick={() => onClick(incident)}
      style={{
        display: 'flex',
        gap: 'calc(10px * var(--admin-ui-scale))',
        padding: 'calc(10px * var(--admin-ui-scale))',
        background: 'var(--bg-input)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        cursor: 'pointer',
        transition: 'border-color 0.15s ease, background 0.15s ease',
        overflow: 'hidden',
        flexShrink: 0,
        marginBottom: 'calc(8px * var(--admin-ui-scale))',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent-light)';
        e.currentTarget.style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-default)';
        e.currentTarget.style.background = 'var(--bg-input)';
      }}
    >
      <div
        style={{
          width: 'calc(2px * var(--admin-ui-scale))',
          borderRadius: '2px',
          background: categoryColor,
          flexShrink: 0,
          alignSelf: 'stretch',
          marginLeft: '-11px',
        }}
      />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'calc(4px * var(--admin-ui-scale))' }}>
        {/* Row 1: clamped title */}
        <div
          style={{
            fontSize: 'calc(13px * var(--admin-ui-scale))',
            fontWeight: 650,
            color: 'var(--text-primary)',
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {incident.title}
        </div>
        {/* Row 2: category micro-label left, compact time pinned right */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'calc(8px * var(--admin-ui-scale))' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'calc(4px * var(--admin-ui-scale))',
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: 'calc(10px * var(--admin-ui-scale))',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              color: categoryColor,
            }}
          >
            {isZone && <Hexagon size={10} style={{ flexShrink: 0 }} />}
            {categoryName}
          </span>
          {createdAt && (
            <span style={{ fontSize: 'calc(10px * var(--admin-ui-scale))', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>{timeAgoCompact(createdAt)}</span>
          )}
        </div>
        {/* Row 3: location */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(4px * var(--admin-ui-scale))', fontSize: 'calc(10px * var(--admin-ui-scale))', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden' }}>
          <MapPin size={11} style={{ flexShrink: 0 }} />
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{location}</span>
        </div>
      </div>
    </div>
  );
}

function ActiveRow({ incident, now, onOpen, onResolve }) {
  const { theme } = useTheme();
  // Polygon incidents (zones) have no domain/category — use the zone category
  const isZone = incident.geometry_type === 'polygon';
  const categoryColor = isZone ? incident.zone_category_color || '#6366f1' : getIncidentDomainColor(incident, theme);
  const categoryName = isZone ? incident.zone_category_name || 'Zone' : incident.domain_name || incident.category_name || incident.category || 'Unknown';
  const location = incident.location_context || incident.location || 'Unknown location';
  const createdAt = incident.created_at || incident.createdAt;
  const overdue = now - (typeof createdAt === 'number' ? createdAt : new Date(createdAt).getTime()) > 24 * 60 * 60 * 1000;

  return (
    <div
      style={{
        display: 'flex',
        gap: 'calc(10px * var(--admin-ui-scale))',
        padding: 'calc(10px * var(--admin-ui-scale))',
        background: 'var(--bg-input)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: 'calc(2px * var(--admin-ui-scale))',
          borderRadius: '2px',
          background: categoryColor,
          flexShrink: 0,
          alignSelf: 'stretch',
          marginLeft: '-11px',
        }}
      />
      <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'calc(4px * var(--admin-ui-scale))' }}>
        {/* Row 1: clamped title */}
        <div
          onClick={() => onOpen(incident)}
          style={{
            fontSize: 'calc(13px * var(--admin-ui-scale))',
            fontWeight: 650,
            color: 'var(--text-primary)',
            lineHeight: 1.3,
            cursor: 'pointer',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {incident.title}
        </div>
        {/* Row 2: category micro-label left, compact time + overdue flag pinned right */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'calc(8px * var(--admin-ui-scale))' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'calc(4px * var(--admin-ui-scale))',
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: 'calc(10px * var(--admin-ui-scale))',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              color: categoryColor,
            }}
          >
            {isZone && <Hexagon size={10} style={{ flexShrink: 0 }} />}
            {categoryName}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(5px * var(--admin-ui-scale))', fontSize: 'calc(10px * var(--admin-ui-scale))', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {/* Fixed-width right-aligned time slot keeps 24H+ at the same x on
                every card; overdue items are always "Xd" so 26px covers 1–3 digits */}
            <span style={{ color: 'var(--text-muted)', minWidth: 'calc(26px * var(--admin-ui-scale))', textAlign: 'right' }}>{timeAgoCompact(createdAt, now)}</span>
            {overdue && (
              <span
                style={{
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'var(--badge-red-text)',
                }}
                title="Active for more than 24 hours"
              >
                24h+
              </span>
            )}
          </div>
        </div>
        {/* Row 3: location left, ghost resolve button right */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'calc(8px * var(--admin-ui-scale))', marginTop: 'calc(1px * var(--admin-ui-scale))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(4px * var(--admin-ui-scale))', minWidth: 0, fontSize: 'calc(10px * var(--admin-ui-scale))', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden' }}>
            <MapPin size={11} style={{ flexShrink: 0 }} />
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{location}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onResolve(incident.id);
            }}
            style={{
              flexShrink: 0,
              padding: 'calc(2px * var(--admin-ui-scale)) calc(7px * var(--admin-ui-scale))',
              background: 'transparent',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-muted)',
              fontSize: 'calc(10px * var(--admin-ui-scale))',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.color = 'var(--accent-light)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-default)';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            Resolve
          </button>
        </div>
      </div>
    </div>
  );
}

function ActivityMeta(type) {
  switch (type) {
    case 'incident_created':
      return { icon: Plus, color: 'var(--success)', bg: 'var(--success-bg, rgba(34,197,94,0.15))', label: 'New incident' };
    case 'incident_updated':
    case 'timeline_added':
    case 'timeline_updated':
    case 'timeline_deleted':
      return { icon: RefreshCw, color: 'var(--warning)', bg: 'var(--badge-amber-bg)', label: 'Updated' };
    case 'incident_deleted':
      return { icon: Trash2, color: 'var(--danger)', bg: 'var(--alert-error-bg)', label: 'Deleted' };
    default:
      return { icon: ActivityIcon, color: 'var(--accent-light)', bg: 'var(--accent-subtle-bg)', label: 'Activity' };
  }
}

function ActivityRow({ event, isUnseen, onOpen }) {
  const meta = ActivityMeta(event.type);
  const Icon = meta.icon;
  const isZone = (event.geometryType || event.incident?.geometry_type) === 'polygon';
  const title = event.incident?.title || event.title || meta.label;
  const summary = event.update?.summary || null;

  return (
    <div
      onClick={() => onOpen(event)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'calc(10px * var(--admin-ui-scale))',
        padding: 'calc(10px * var(--admin-ui-scale))',
        background: isUnseen ? 'var(--accent-subtle-bg)' : 'var(--bg-input)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        transition: 'border-color 0.15s ease, background 0.15s ease',
        cursor: event.incidentId ? 'pointer' : 'default',
        overflow: 'hidden',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent-light)';
        if (!isUnseen) e.currentTarget.style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-default)';
        e.currentTarget.style.background = isUnseen ? 'var(--accent-subtle-bg)' : 'var(--bg-input)';
      }}
    >
      {/* Slim per-type icon tile */}
      <div
        style={{
          width: 'calc(22px * var(--admin-ui-scale))',
          height: 'calc(22px * var(--admin-ui-scale))',
          borderRadius: 'var(--radius-sm)',
          background: meta.bg,
          color: meta.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={12} />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'calc(2px * var(--admin-ui-scale))' }}>
        {/* Primary line: incident title */}
        <div
          style={{
            fontSize: 'calc(12px * var(--admin-ui-scale))',
            fontWeight: 650,
            color: 'var(--text-primary)',
            lineHeight: 1.3,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </div>
        {/* Timeline update summary when the payload carries it */}
        {summary && (
          <div
            style={{
              fontSize: 'calc(11px * var(--admin-ui-scale))',
              color: 'var(--text-muted)',
              lineHeight: 1.35,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {summary}
          </div>
        )}
        {/* Micro-label: event type + zone indication */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(4px * var(--admin-ui-scale))', fontSize: 'calc(10px * var(--admin-ui-scale))', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden' }}>
          <span>{meta.label}</span>
          {isZone && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'calc(3px * var(--admin-ui-scale))', color: 'var(--text-secondary)' }}>
              · <Hexagon size={9} /> Zone
            </span>
          )}
        </div>
      </div>
      {/* Fixed right slot: compact time + subtle unseen pulse */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(6px * var(--admin-ui-scale))', flexShrink: 0 }}>
        {isUnseen && (
          <span
            style={{
              width: 'calc(6px * var(--admin-ui-scale))',
              height: 'calc(6px * var(--admin-ui-scale))',
              borderRadius: '50%',
              background: 'var(--danger)',
              boxShadow: '0 0 0 0 var(--danger-glow)',
              animation: 'gw-dot-pulse 1.5s ease-out infinite',
              flexShrink: 0,
            }}
          />
        )}
        <span style={{ fontSize: 'calc(10px * var(--admin-ui-scale))', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{timeAgoCompact(event.timestamp)}</span>
      </div>
    </div>
  );
}

function NotificationMeta(type) {
  switch (type) {
    case 'incident_created':
      return { icon: AlertTriangle, color: 'var(--danger)' };
    case 'timeline_added':
    case 'timeline_updated':
    case 'timeline_deleted':
      return { icon: FileText, color: 'var(--warning)' };
    case 'incident_resolved':
      return { icon: CheckCircle2, color: 'var(--success)' };
    case 'incident_updated':
      return { icon: RefreshCw, color: 'var(--accent-light)' };
    default:
      return { icon: Bell, color: 'var(--text-secondary)' };
  }
}

// Notification rows link to incidents via payload.incidentId or link_path
// ("/incident/<uuid>") — resolve either to a plain incident id.
function linkPathIncidentId(linkPath) {
  if (typeof linkPath !== 'string') return null;
  const m = linkPath.match(/\/incidents?\/([0-9a-f-]{36})/i);
  return m ? m[1] : null;
}

function NotificationRow({ notification, onOpen, onMarkRead }) {
  const isUnread = !(notification.is_read || notification.read);
  const createdAt = notification.created_at || notification.createdAt;
  const type = notification.type || '';
  const payload = notification.payload || {};
  const meta = NotificationMeta(type);
  const Icon = meta.icon;
  // incident_created rows accent with the severity color when the payload carries it
  const sev = type === 'incident_created' ? SEVERITY_SCALE.find((s) => s.value === payload.severity) : null;
  const accent = sev?.color || meta.color;
  const body = notification.body || notification.message || notification.title;
  const targetId = payload.incidentId ?? linkPathIncidentId(notification.link_path);

  return (
    <div
      onClick={() => {
        onMarkRead(notification.id);
        if (targetId) onOpen(targetId);
      }}
      style={{
        display: 'flex',
        gap: 'calc(10px * var(--admin-ui-scale))',
        padding: 'calc(10px * var(--admin-ui-scale))',
        background: isUnread ? 'var(--accent-subtle-bg)' : 'var(--bg-input)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        cursor: targetId ? 'pointer' : 'default',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 'calc(2px * var(--admin-ui-scale))',
          borderRadius: '2px',
          background: accent,
          flexShrink: 0,
          alignSelf: 'stretch',
          marginLeft: '-11px',
        }}
      />
      <Icon size={14} color={accent} style={{ flexShrink: 0, marginTop: 'calc(1px * var(--admin-ui-scale))' }} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'calc(2px * var(--admin-ui-scale))' }}>
        <div
          style={{
            fontSize: 'calc(12px * var(--admin-ui-scale))',
            fontWeight: isUnread ? 700 : 600,
            color: isUnread ? 'var(--text-primary)' : 'var(--text-secondary)',
            lineHeight: 1.3,
          }}
        >
          {notification.title}
        </div>
        <div
          style={{
            fontSize: 'calc(11px * var(--admin-ui-scale))',
            color: 'var(--text-secondary)',
            lineHeight: 1.35,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {body}
        </div>
        <div style={{ fontSize: 'calc(10px * var(--admin-ui-scale))', color: 'var(--text-muted)', marginTop: 'calc(2px * var(--admin-ui-scale))' }}>{timeAgoCompact(createdAt)}</div>
      </div>
    </div>
  );
}

function SavedRow({ incident, onOpen, onUnsave }) {
  const { theme } = useTheme();
  // Polygon incidents (zones) have no domain/category — use the zone category
  const isZone = incident.geometry_type === 'polygon';
  const categoryColor = isZone ? incident.zone_category_color || '#6366f1' : getIncidentDomainColor(incident, theme);
  const categoryName = isZone ? incident.zone_category_name || 'Zone' : incident.domain_name || incident.category_name || incident.category || 'Unknown';
  const location = incident.location_context || incident.location || 'Unknown location';
  const createdAt = incident.created_at || incident.createdAt;

  return (
    <div
      style={{
        display: 'flex',
        gap: 'calc(10px * var(--admin-ui-scale))',
        padding: 'calc(10px * var(--admin-ui-scale))',
        background: 'var(--bg-input)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 'calc(2px * var(--admin-ui-scale))',
          borderRadius: '2px',
          background: categoryColor,
          flexShrink: 0,
          alignSelf: 'stretch',
          marginLeft: '-11px',
        }}
      />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'calc(4px * var(--admin-ui-scale))' }}>
        {/* Row 1: clamped title */}
        <div
          onClick={() => onOpen(incident)}
          style={{
            fontSize: 'calc(13px * var(--admin-ui-scale))',
            fontWeight: 650,
            color: 'var(--text-primary)',
            cursor: 'pointer',
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {incident.title}
        </div>
        {/* Row 2: category micro-label left, compact time pinned right */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'calc(8px * var(--admin-ui-scale))' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'calc(4px * var(--admin-ui-scale))',
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: 'calc(10px * var(--admin-ui-scale))',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              color: categoryColor,
            }}
          >
            {isZone && <Hexagon size={10} style={{ flexShrink: 0 }} />}
            {categoryName}
          </span>
          <span style={{ fontSize: 'calc(10px * var(--admin-ui-scale))', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>{timeAgoCompact(createdAt)}</span>
        </div>
        {/* Row 3: location left, ghost unsave icon-button right */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'calc(8px * var(--admin-ui-scale))', marginTop: 'calc(1px * var(--admin-ui-scale))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(4px * var(--admin-ui-scale))', minWidth: 0, fontSize: 'calc(10px * var(--admin-ui-scale))', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden' }}>
            <MapPin size={11} style={{ flexShrink: 0 }} />
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{location}</span>
          </div>
          <button
            onClick={() => onUnsave(incident.id)}
            title="Unsave"
            style={{
              flexShrink: 0,
              width: 'calc(22px * var(--admin-ui-scale))',
              height: 'calc(22px * var(--admin-ui-scale))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.color = 'var(--accent-light)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-default)';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            <Bookmark size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

function RecentRow({ recent, onOpen }) {
  const { theme } = useTheme();
  // Enriched recents carry the incident snapshot; fall back to payload for
  // incidents deleted since they were viewed.
  const incident = recent.incident || null;
  const payload = recent.payload || {};
  const isZone = incident?.geometry_type === 'polygon';
  const categoryColor = isZone ? incident.zone_category_color || '#6366f1' : getIncidentDomainColor(incident, theme);
  const categoryName = isZone
    ? incident.zone_category_name || 'Zone'
    : incident?.domain_name || incident?.category_name || payload.domain_name || payload.category_name || 'Unknown';
  const title = incident?.title || payload.title || 'Untitled incident';
  const location = incident?.location_context || payload.location_context || null;
  const viewedAt = recent.viewed_at || recent.occurred_at || recent.created_at || recent.createdAt;

  return (
    <div
      onClick={() => onOpen(recent)}
      style={{
        display: 'flex',
        gap: 'calc(10px * var(--admin-ui-scale))',
        padding: 'calc(10px * var(--admin-ui-scale))',
        background: 'var(--bg-input)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        cursor: 'pointer',
        transition: 'border-color 0.15s ease, background 0.15s ease',
        overflow: 'hidden',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent-light)';
        e.currentTarget.style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-default)';
        e.currentTarget.style.background = 'var(--bg-input)';
      }}
    >
      <div
        style={{
          width: 'calc(2px * var(--admin-ui-scale))',
          borderRadius: '2px',
          background: categoryColor,
          flexShrink: 0,
          alignSelf: 'stretch',
          marginLeft: '-11px',
        }}
      />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'calc(3px * var(--admin-ui-scale))' }}>
        {/* Row 1: clamped title */}
        <div
          style={{
            fontSize: 'calc(13px * var(--admin-ui-scale))',
            fontWeight: 650,
            color: 'var(--text-primary)',
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {title}
        </div>
        {/* Row 2: category micro-label left (zones clearly marked), viewed time right */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'calc(8px * var(--admin-ui-scale))' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'calc(4px * var(--admin-ui-scale))',
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: 'calc(10px * var(--admin-ui-scale))',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              color: categoryColor,
            }}
          >
            {isZone && <Hexagon size={10} style={{ flexShrink: 0 }} />}
            {categoryName}
          </span>
          <span style={{ fontSize: 'calc(10px * var(--admin-ui-scale))', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }} title="Last viewed">
            {timeAgoCompact(viewedAt)}
          </span>
        </div>
        {/* Row 3: location when known */}
        {location && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(4px * var(--admin-ui-scale))', fontSize: 'calc(10px * var(--admin-ui-scale))', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden' }}>
            <MapPin size={11} style={{ flexShrink: 0 }} />
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{location}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, children }) {
  return (
    <div style={{ textAlign: 'center', padding: 'calc(40px * var(--admin-ui-scale)) 0', color: 'var(--text-muted)', fontSize: 'calc(13px * var(--admin-ui-scale))' }}>
      <Icon size={28} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
      <div style={{ fontWeight: 600 }}>{title}</div>
      {children && <div style={{ fontSize: 'calc(12px * var(--admin-ui-scale))', opacity: 0.8, marginTop: 'calc(4px * var(--admin-ui-scale))' }}>{children}</div>}
    </div>
  );
}

function LayersDrawer({
  domains,
  zoneCategories,
  activeDomainSlugs,
  activeZoneSlugs,
  onToggleDomain,
  onToggleZone,
  onShowAllDomains,
  onHideAllDomains,
  onShowAllZones,
  onHideAllZones,
}) {
  const { theme } = useTheme();
  return (
    <div style={{ padding: 'calc(16px * var(--admin-ui-scale))', display: 'flex', flexDirection: 'column', gap: 'calc(14px * var(--admin-ui-scale))', height: '100%', overflowY: 'auto' }}>
      <LayerSection
        title="Incident Domains"
        active={domains.filter((d) => activeDomainSlugs.has(d.slug)).length}
        total={domains.length}
        onShowAll={onShowAllDomains}
        onHideAll={onHideAllDomains}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(5px * var(--admin-ui-scale))' }}>
          {domains.map((domain) => (
            <LayerRow
              key={domain.slug}
              data={domain}
              active={activeDomainSlugs.has(domain.slug)}
              theme={theme}
              onToggle={() => onToggleDomain(domain.slug)}
            />
          ))}
        </div>
      </LayerSection>

      <div style={{ height: 'calc(1px * var(--admin-ui-scale))', background: 'var(--border-default)', margin: '2px 0' }} />

      <LayerSection
        title="Zone Overlays"
        active={zoneCategories.filter((z) => activeZoneSlugs.has(z.slug)).length}
        total={zoneCategories.length}
        onShowAll={onShowAllZones}
        onHideAll={onHideAllZones}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(5px * var(--admin-ui-scale))' }}>
          {zoneCategories.map((zone) => (
            <LayerRow
              key={zone.slug}
              data={zone}
              active={activeZoneSlugs.has(zone.slug)}
              theme={theme}
              onToggle={() => onToggleZone(zone.slug)}
            />
          ))}
        </div>
      </LayerSection>
    </div>
  );
}

function IncidentsDrawer({ visibleIncidents, onSelectIncident }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: 'calc(12px * var(--admin-ui-scale)) calc(12px * var(--admin-ui-scale)) 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 'calc(11px * var(--admin-ui-scale))', color: 'var(--text-secondary)' }}>{visibleIncidents.length} visible</span>
        <span style={{ fontSize: 'calc(11px * var(--admin-ui-scale))', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 'calc(4px * var(--admin-ui-scale))' }}>
          <Filter size={11} />
          Filtered by active layers
        </span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 'calc(12px * var(--admin-ui-scale)) calc(12px * var(--admin-ui-scale)) calc(18px * var(--admin-ui-scale))' }}>
        {visibleIncidents.length === 0 ? (
          <EmptyState icon={AlertCircle} title="No incidents visible." />
        ) : (
          visibleIncidents.map((incident) => <IncidentCard key={incident.id} incident={incident} onClick={onSelectIncident} />)
        )}
      </div>
    </div>
  );
}

function ActiveDrawer({ activeIncidents, overdueCount, now, onSelectIncident, onResolveIncident }) {
  const sorted = [...activeIncidents].sort((a, b) => {
    const aT = a.created_at || a.createdAt;
    const bT = b.created_at || b.createdAt;
    return new Date(aT).getTime() - new Date(bT).getTime();
  });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          padding: 'calc(12px * var(--admin-ui-scale)) calc(16px * var(--admin-ui-scale))',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: 'calc(12px * var(--admin-ui-scale))',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: 'var(--text-muted)',
          }}
        >
          Active Incidents
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(6px * var(--admin-ui-scale))', fontSize: 'calc(11px * var(--admin-ui-scale))', whiteSpace: 'nowrap' }}>
          <span style={{ color: 'var(--text-secondary)' }}>{activeIncidents.length} total</span>
          {overdueCount > 0 && (
            <span style={{ color: 'var(--badge-red-text)' }}>
              · {overdueCount === activeIncidents.length ? 'all' : overdueCount} older than 24h
            </span>
          )}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 'calc(12px * var(--admin-ui-scale))', display: 'flex', flexDirection: 'column', gap: 'calc(8px * var(--admin-ui-scale))' }}>
        {sorted.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="No active incidents." />
        ) : (
          sorted.map((incident) => (
            <ActiveRow
              key={incident.id}
              incident={incident}
              now={now}
              onOpen={onSelectIncident}
              onResolve={onResolveIncident}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ActivityDrawer({ activities, activityLastSeenAt, activitySeenIds, onMarkAllActivitySeen, onSelectActivityIncident }) {
  const navigate = useNavigate();
  // Unseen iff newer than the lastSeen baseline AND not individually clicked-seen
  const isUnseenRow = (a) => a.timestamp > activityLastSeenAt && !activitySeenIds?.has(a.id);
  const unreadCount = activities.filter(isUnseenRow).length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          padding: 'calc(12px * var(--admin-ui-scale)) calc(16px * var(--admin-ui-scale))',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: 'calc(12px * var(--admin-ui-scale))',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: 'var(--text-secondary)',
          }}
        >
          Live Activity
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(12px * var(--admin-ui-scale))' }}>
          <span style={{ fontSize: 'calc(11px * var(--admin-ui-scale))', color: 'var(--text-secondary)' }}>{activities.length} events</span>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllActivitySeen}
              style={{
                fontSize: 'calc(11px * var(--admin-ui-scale))',
                fontWeight: 700,
                color: 'var(--accent-light)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Mark all seen
            </button>
          )}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 'calc(12px * var(--admin-ui-scale))', display: 'flex', flexDirection: 'column', gap: 'calc(8px * var(--admin-ui-scale))' }}>
        {activities.length === 0 ? (
          <EmptyState icon={ActivityIcon} title="No recent activity." />
        ) : (
          activities.map((event) => (
            <ActivityRow
              key={event.id || `${event.type}-${event.timestamp}-${event.incidentId || Math.random()}`}
              event={event}
              isUnseen={isUnseenRow(event)}
              onOpen={onSelectActivityIncident}
            />
          ))
        )}
      </div>
      <div
        style={{
          padding: 'calc(10px * var(--admin-ui-scale)) calc(16px * var(--admin-ui-scale))',
          borderTop: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => navigate('/superadmin/audit')}
          style={{
            fontSize: 'calc(11px * var(--admin-ui-scale))',
            fontWeight: 700,
            color: 'var(--accent-light)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          View full audit log →
        </button>
      </div>
    </div>
  );
}

function NotificationsDrawer({ notifications, notificationUnreadCount, onMarkNotificationRead, onMarkAllNotificationsRead, onSelectNotificationIncident }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          padding: 'calc(12px * var(--admin-ui-scale)) calc(16px * var(--admin-ui-scale))',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: 'calc(12px * var(--admin-ui-scale))',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: 'var(--text-secondary)',
          }}
        >
          Notifications
        </span>
        {notificationUnreadCount > 0 && (
          <button
            onClick={onMarkAllNotificationsRead}
            style={{
              fontSize: 'calc(11px * var(--admin-ui-scale))',
              fontWeight: 700,
              color: 'var(--accent-light)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Mark all as seen
          </button>
        )}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 'calc(12px * var(--admin-ui-scale))', display: 'flex', flexDirection: 'column', gap: 'calc(8px * var(--admin-ui-scale))' }}>
        {notifications.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications." />
        ) : (
          notifications.map((n) => (
            <NotificationRow
              key={n.id}
              notification={n}
              onOpen={onSelectNotificationIncident}
              onMarkRead={onMarkNotificationRead}
            />
          ))
        )}
      </div>
    </div>
  );
}

function SavedDrawer({ savedIncidents, onSelectSavedIncident, onUnsaveIncident }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: 'calc(12px * var(--admin-ui-scale)) calc(16px * var(--admin-ui-scale))', borderBottom: '1px solid var(--border-default)' }}>
        <span
          style={{
            fontSize: 'calc(12px * var(--admin-ui-scale))',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: 'var(--text-secondary)',
          }}
        >
          Saved Incidents
        </span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 'calc(12px * var(--admin-ui-scale))', display: 'flex', flexDirection: 'column', gap: 'calc(8px * var(--admin-ui-scale))' }}>
        {savedIncidents.length === 0 ? (
          <EmptyState icon={Bookmark} title="No saved incidents yet." />
        ) : (
          savedIncidents.map((incident) => (
            <SavedRow key={incident.id} incident={incident} onOpen={onSelectSavedIncident} onUnsave={onUnsaveIncident} />
          ))
        )}
      </div>
    </div>
  );
}

function RecentsDrawer({ recents, onClearRecents, onSelectRecentIncident }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          padding: 'calc(12px * var(--admin-ui-scale)) calc(16px * var(--admin-ui-scale))',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: 'calc(12px * var(--admin-ui-scale))',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: 'var(--text-secondary)',
          }}
        >
          Recently Viewed
        </span>
        {recents.length > 0 && (
          <button
            onClick={onClearRecents}
            style={{
              fontSize: 'calc(11px * var(--admin-ui-scale))',
              fontWeight: 700,
              color: 'var(--accent-light)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        )}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 'calc(12px * var(--admin-ui-scale))', display: 'flex', flexDirection: 'column', gap: 'calc(8px * var(--admin-ui-scale))' }}>
        {recents.length === 0 ? (
          <EmptyState icon={Clock} title="No recently viewed incidents.">
            Open an incident from the map or list to see it here.
          </EmptyState>
        ) : (
          recents.map((recent) => <RecentRow key={recent.id} recent={recent} onOpen={onSelectRecentIncident} />)
        )}
      </div>
    </div>
  );
}

function SettingsDrawer({ theme, style, onToggleTheme, onSetStyle, autoZoomEnabled, onToggleAutoZoom, compactMode, onToggleCompactMode }) {
  // Reduce motion is app-global (class on <html>) but self-contained here —
  // boot-time application happens in main.jsx, this switch owns live toggling.
  const [reduceMotion, setReduceMotion] = useState(() => {
    try {
      return localStorage.getItem('intelmap24_superadmin_reduce_motion') === 'true';
    } catch {
      return false;
    }
  });
  const toggleReduceMotion = () => {
    setReduceMotion((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('intelmap24_superadmin_reduce_motion', String(next));
      } catch {}
      document.documentElement.classList.toggle('reduce-motion', next);
      return next;
    });
  };

  return (
    <div style={{ padding: 'calc(16px * var(--admin-ui-scale))' }}>
      <div
        style={{
          marginBottom: 'calc(14px * var(--admin-ui-scale))',
          fontSize: 'calc(12px * var(--admin-ui-scale))',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          color: 'var(--text-secondary)',
        }}
      >
        Appearance
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'calc(12px * var(--admin-ui-scale))',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: 'calc(10px * var(--admin-ui-scale))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(10px * var(--admin-ui-scale))' }}>
          <Monitor size={16} color="var(--text-secondary)" />
          <div>
            <div style={{ fontSize: 'calc(13px * var(--admin-ui-scale))', color: 'var(--text-primary)' }}>Theme</div>
            <div style={{ fontSize: 'calc(11px * var(--admin-ui-scale))', color: 'var(--text-secondary)', marginTop: 'calc(2px * var(--admin-ui-scale))' }}>Toggle light or dark mode</div>
          </div>
        </div>
        <ThemeToggle size={18} />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'calc(12px * var(--admin-ui-scale))',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: 'calc(10px * var(--admin-ui-scale))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(10px * var(--admin-ui-scale))' }}>
          <Crosshair size={16} color="var(--text-secondary)" />
          <div>
            <div style={{ fontSize: 'calc(13px * var(--admin-ui-scale))', color: 'var(--text-primary)' }}>Auto-zoom on selection</div>
            <div style={{ fontSize: 'calc(11px * var(--admin-ui-scale))', color: 'var(--text-secondary)', marginTop: 'calc(2px * var(--admin-ui-scale))' }}>Zoom map to selected incidents and zones</div>
          </div>
        </div>
        <button
          onClick={onToggleAutoZoom}
          aria-checked={autoZoomEnabled}
          role="switch"
          style={{
            width: 'calc(40px * var(--admin-ui-scale))',
            height: 'calc(22px * var(--admin-ui-scale))',
            borderRadius: 'calc(11px * var(--admin-ui-scale))',
            border: 'none',
            background: autoZoomEnabled ? 'var(--accent)' : 'var(--border-strong)',
            position: 'relative',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 'calc(2px * var(--admin-ui-scale))',
              left: autoZoomEnabled ? 'calc(20px * var(--admin-ui-scale))' : 'calc(2px * var(--admin-ui-scale))',
              width: 'calc(18px * var(--admin-ui-scale))',
              height: 'calc(18px * var(--admin-ui-scale))',
              borderRadius: '50%',
              background: '#fff',
              transition: 'left 0.15s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
            }}
          />
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'calc(12px * var(--admin-ui-scale))',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: 'calc(10px * var(--admin-ui-scale))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(10px * var(--admin-ui-scale))' }}>
          <Minimize2 size={16} color="var(--text-secondary)" />
          <div>
            <div style={{ fontSize: 'calc(13px * var(--admin-ui-scale))', color: 'var(--text-primary)' }}>Compact mode</div>
            <div style={{ fontSize: 'calc(11px * var(--admin-ui-scale))', color: 'var(--text-secondary)', marginTop: 'calc(2px * var(--admin-ui-scale))' }}>Reduce workspace UI density</div>
          </div>
        </div>
        <button
          onClick={onToggleCompactMode}
          aria-checked={compactMode}
          role="switch"
          style={{
            width: 'calc(40px * var(--admin-ui-scale))',
            height: 'calc(22px * var(--admin-ui-scale))',
            borderRadius: 'calc(11px * var(--admin-ui-scale))',
            border: 'none',
            background: compactMode ? 'var(--accent)' : 'var(--border-strong)',
            position: 'relative',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 'calc(2px * var(--admin-ui-scale))',
              left: compactMode ? 'calc(20px * var(--admin-ui-scale))' : 'calc(2px * var(--admin-ui-scale))',
              width: 'calc(18px * var(--admin-ui-scale))',
              height: 'calc(18px * var(--admin-ui-scale))',
              borderRadius: '50%',
              background: '#fff',
              transition: 'left 0.15s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
            }}
          />
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'calc(12px * var(--admin-ui-scale))',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: 'calc(10px * var(--admin-ui-scale))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(10px * var(--admin-ui-scale))' }}>
          <ZapOff size={16} color="var(--text-secondary)" />
          <div>
            <div style={{ fontSize: 'calc(13px * var(--admin-ui-scale))', color: 'var(--text-primary)' }}>Reduce motion</div>
            <div style={{ fontSize: 'calc(11px * var(--admin-ui-scale))', color: 'var(--text-secondary)', marginTop: 'calc(2px * var(--admin-ui-scale))' }}>Minimize animations and transitions</div>
          </div>
        </div>
        <button
          onClick={toggleReduceMotion}
          aria-checked={reduceMotion}
          role="switch"
          style={{
            width: 'calc(40px * var(--admin-ui-scale))',
            height: 'calc(22px * var(--admin-ui-scale))',
            borderRadius: 'calc(11px * var(--admin-ui-scale))',
            border: 'none',
            background: reduceMotion ? 'var(--accent)' : 'var(--border-strong)',
            position: 'relative',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 'calc(2px * var(--admin-ui-scale))',
              left: reduceMotion ? 'calc(20px * var(--admin-ui-scale))' : 'calc(2px * var(--admin-ui-scale))',
              width: 'calc(18px * var(--admin-ui-scale))',
              height: 'calc(18px * var(--admin-ui-scale))',
              borderRadius: '50%',
              background: '#fff',
              transition: 'left 0.15s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
            }}
          />
        </button>
      </div>

      <div
        style={{
          padding: 'calc(12px * var(--admin-ui-scale))',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: 'calc(16px * var(--admin-ui-scale))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(10px * var(--admin-ui-scale))', marginBottom: 'calc(10px * var(--admin-ui-scale))' }}>
          <Palette size={16} color="var(--text-secondary)" />
          <div>
            <div style={{ fontSize: 'calc(13px * var(--admin-ui-scale))', color: 'var(--text-primary)' }}>Interface style</div>
            <div style={{ fontSize: 'calc(11px * var(--admin-ui-scale))', color: 'var(--text-secondary)', marginTop: 'calc(2px * var(--admin-ui-scale))' }}>Choose a visual treatment</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'calc(8px * var(--admin-ui-scale))' }}>
          {[
            { key: 'tactical', label: 'Tactical', short: 'T' },
            { key: 'saas', label: 'SaaS', short: 'S' },
          ].map((opt) => {
            const active = style === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => onSetStyle(opt.key)}
                style={{
                  flex: 1,
                  padding: 'calc(10px * var(--admin-ui-scale)) calc(8px * var(--admin-ui-scale))',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid',
                  borderColor: active ? 'var(--accent-light)' : 'var(--border-default)',
                  background: active ? 'var(--accent-subtle-bg)' : 'var(--bg-input)',
                  color: active ? 'var(--accent-light)' : 'var(--text-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 'calc(6px * var(--admin-ui-scale))',
                  transition: 'all 0.15s ease',
                }}
              >
                <span
                  style={{
                    width: 'calc(24px * var(--admin-ui-scale))',
                    height: 'calc(24px * var(--admin-ui-scale))',
                    borderRadius: 'var(--radius-sm)',
                    background: active ? 'var(--accent)' : 'var(--bg-elevated)',
                    color: active ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 'calc(11px * var(--admin-ui-scale))',
                    fontWeight: 800,
                  }}
                >
                  {opt.short}
                </span>
                <span style={{ fontSize: 'calc(11px * var(--admin-ui-scale))', fontWeight: 700 }}>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          padding: 'calc(12px * var(--admin-ui-scale))',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-sm)',
          fontSize: 'calc(12px * var(--admin-ui-scale))',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
        }}
      >
        <Info size={14} style={{ display: 'inline', marginRight: 'calc(6px * var(--admin-ui-scale))', verticalAlign: 'middle' }} />
        Preferences are stored locally in your browser.
      </div>
    </div>
  );
}

const drawerTitles = {
  layers: 'Map Layers',
  incidents: 'Incidents in Viewport',
  active: 'Active Incidents',
  activity: 'Live Activity',
  notifications: 'Notifications',
  saved: 'Saved',
  recents: 'Recents',
  settings: 'Settings',
};

export default function WorkspaceDrawer(props) {
  const { activeDrawer, onClose } = props;
  const { theme, toggleTheme } = useTheme();
  const { style, setStyle } = useStyle();

  const now = Date.now();

  function renderContent() {
    switch (activeDrawer) {
      case 'layers':
        return <LayersDrawer {...props} />;
      case 'incidents':
        return <IncidentsDrawer visibleIncidents={props.visibleIncidents} onSelectIncident={props.onSelectIncident} />;
      case 'active':
        return (
          <ActiveDrawer
            activeIncidents={props.activeIncidents}
            overdueCount={props.overdueCount}
            now={now}
            onSelectIncident={props.onSelectIncident}
            onResolveIncident={props.onResolveIncident}
          />
        );
      case 'activity':
        return (
          <ActivityDrawer
            activities={props.activities}
            activityLastSeenAt={props.activityLastSeenAt}
            activitySeenIds={props.activitySeenIds}
            onMarkAllActivitySeen={props.onMarkAllActivitySeen}
            onSelectActivityIncident={props.onSelectActivityIncident}
          />
        );
      case 'notifications':
        return (
          <NotificationsDrawer
            notifications={props.notifications}
            notificationUnreadCount={props.notificationUnreadCount}
            onMarkNotificationRead={props.onMarkNotificationRead}
            onMarkAllNotificationsRead={props.onMarkAllNotificationsRead}
            onSelectNotificationIncident={props.onSelectNotificationIncident}
          />
        );
      case 'saved':
        return (
          <SavedDrawer
            savedIncidents={props.savedIncidents}
            onSelectSavedIncident={props.onSelectSavedIncident}
            onUnsaveIncident={props.onUnsaveIncident}
          />
        );
      case 'recents':
        return (
          <RecentsDrawer
            recents={props.recents}
            onClearRecents={props.onClearRecents}
            onSelectRecentIncident={props.onSelectRecentIncident}
          />
        );
      case 'settings':
        return <SettingsDrawer theme={theme} style={style} onToggleTheme={toggleTheme} onSetStyle={setStyle} autoZoomEnabled={props.autoZoomEnabled} onToggleAutoZoom={props.onToggleAutoZoom} compactMode={props.compactMode} onToggleCompactMode={props.onToggleCompactMode} />;
      default:
        return null;
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: 'var(--admin-rail-width)',
        top: 0,
        bottom: 0,
        width: 'var(--admin-drawer-width)',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          height: 'calc(48px * var(--admin-ui-scale))',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 calc(8px * var(--admin-ui-scale)) 0 calc(12px * var(--admin-ui-scale))',
        }}
      >
        <span style={{ fontSize: 'calc(13px * var(--admin-ui-scale))', fontWeight: 700, color: 'var(--text-primary)' }}>{drawerTitles[activeDrawer] || ''}</span>
        <button
          onClick={onClose}
          style={{
            width: 'calc(28px * var(--admin-ui-scale))',
            height: 'calc(28px * var(--admin-ui-scale))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <ChevronLeft size={18} />
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>{renderContent()}</div>
    </div>
  );
}
