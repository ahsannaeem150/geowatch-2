import React from 'react';
import {
  ChevronLeft,
  Eye,
  EyeOff,
  MapPin,
  Bell,
  Bookmark,
  Clock,
  Check,
  CheckCircle2,
  AlertCircle,
  Filter,
  Info,
  Monitor,
  Palette,
  Plus,
  RefreshCw,
  Trash2,
  FileText,
  Activity as ActivityIcon,
  Hexagon,
} from 'lucide-react';
import ThemeToggle from '@shared/components/ThemeToggle.jsx';
import { SeverityBadge } from '@shared/components/SeverityBadge.jsx';
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

function LayerSection({ title, active, total, onShowAll, onHideAll, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: 'var(--text-secondary)',
            }}
          >
            {title}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {active}/{total}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
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
  padding: '3px 8px',
  fontSize: '10px',
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
    return <span style={{ fontSize: '10px', fontWeight: 700 }}>{icon.slice(0, 2)}</span>;
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
        gap: '8px',
        padding: '6px 8px',
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
          width: '20px',
          height: '20px',
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
          fontSize: '12px',
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
  const categoryColor = getIncidentDomainColor(incident, theme);
  const categoryName = incident.domain_name || incident.category_name || incident.category || 'Unknown';
  const location = incident.location_context || incident.location || 'Unknown location';
  const createdAt = incident.created_at || incident.createdAt;

  return (
    <div
      onClick={() => onClick(incident)}
      style={{
        display: 'flex',
        gap: '12px',
        padding: '14px',
        background: 'var(--bg-input)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        overflow: 'hidden',
        flexShrink: 0,
        marginBottom: '8px',
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
          width: '2px',
          borderRadius: '2px',
          background: categoryColor,
          flexShrink: 0,
          alignSelf: 'stretch',
          marginLeft: '-15px',
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <div
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              lineHeight: 1.35,
              wordBreak: 'break-word',
            }}
          >
            {incident.title}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '6px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
          }}
        >
          <MapPin size={13} color="var(--text-secondary)" />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {location}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-secondary)' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: categoryColor }} />
            {categoryName}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{timeAgo(createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

function ActiveRow({ incident, now, onOpen, onResolve }) {
  const { theme } = useTheme();
  const categoryColor = getIncidentDomainColor(incident, theme);
  const categoryName = incident.domain_name || incident.category_name || incident.category || 'Unknown';
  const location = incident.location_context || incident.location || 'Unknown location';
  const createdAt = incident.created_at || incident.createdAt;
  const overdue = now - (typeof createdAt === 'number' ? createdAt : new Date(createdAt).getTime()) > 24 * 60 * 60 * 1000;

  return (
    <div
      style={{
        display: 'flex',
        gap: '10px',
        padding: '10px',
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
          width: '2px',
          borderRadius: '2px',
          background: categoryColor,
          flexShrink: 0,
          alignSelf: 'stretch',
          marginLeft: '-11px',
        }}
      />
      <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <div
          onClick={() => onOpen(incident)}
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1.35,
            wordBreak: 'break-word',
            cursor: 'pointer',
          }}
        >
          {incident.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
          <MapPin size={11} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{location}</span>
          <span>·</span>
          <span>{timeAgo(createdAt, now)}</span>
          {overdue && (
            <>
              <span>·</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: '9px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'var(--badge-red-text)',
                }}
                title="Active for more than 24 hours"
              >
                <AlertCircle size={9} />
                Overdue
              </span>
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: 'var(--text-secondary)' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: categoryColor }} />
            {categoryName}
          </span>
          <SeverityBadge level={incident.severity} style={{ transform: 'scale(0.78)', transformOrigin: 'right center', flexShrink: 0 }} />
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onResolve(incident.id);
          }}
          style={{
            alignSelf: 'flex-start',
            marginTop: '2px',
            padding: '3px 8px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: '10px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--danger)';
            e.currentTarget.style.color = 'var(--danger)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-default)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          Resolve
        </button>
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

function ActivityRow({ event, activityLastSeenAt, onSelectIncident }) {
  const isUnseen = event.timestamp > activityLastSeenAt;
  const meta = ActivityMeta(event.type);
  const Icon = meta.icon;

  return (
    <div
      onClick={() => onSelectIncident(event.incidentId)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 12px',
        background: isUnseen ? 'var(--accent-subtle-bg)' : 'var(--bg-input)',
        borderWidth: '1px 1px 1px 3px',
        borderStyle: 'solid',
        borderColor: `var(--border-default) var(--border-default) var(--border-default) ${isUnseen ? meta.color : 'var(--border-default)'}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        transition: 'all 0.15s ease',
        cursor: event.incidentId ? 'pointer' : 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderTopColor = 'var(--accent-light)';
        e.currentTarget.style.borderRightColor = 'var(--accent-light)';
        e.currentTarget.style.borderBottomColor = 'var(--accent-light)';
        e.currentTarget.style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderTopColor = 'var(--border-default)';
        e.currentTarget.style.borderRightColor = 'var(--border-default)';
        e.currentTarget.style.borderBottomColor = 'var(--border-default)';
        e.currentTarget.style.background = isUnseen ? 'var(--accent-subtle-bg)' : 'var(--bg-input)';
      }}
    >
      <div
        style={{
          width: '30px',
          height: '30px',
          borderRadius: 'var(--radius-sm)',
          background: meta.bg,
          color: meta.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={14} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
          {event.incident?.title ? `${event.type === 'incident_created' ? 'New' : 'Update'}: ${event.incident.title}` : event.type}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          {meta.label} · {timeAgo(event.timestamp)}
          {isUnseen && (
            <span
              style={{
                marginLeft: '8px',
                padding: '1px 6px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '10px',
                fontWeight: 800,
                textTransform: 'uppercase',
                background: 'var(--alert-error-bg)',
                color: 'var(--badge-red-text)',
              }}
            >
              New
            </span>
          )}
        </div>
      </div>
      {isUnseen && (
        <span
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: 'var(--danger)',
            boxShadow: '0 0 0 0 var(--danger-glow)',
            animation: 'gw-dot-pulse 1.5s ease-out infinite',
            flexShrink: 0,
          }}
        />
      )}
    </div>
  );
}

function NotificationRow({ notification, onOpen, onMarkRead }) {
  const isUnread = !(notification.is_read || notification.read);
  const createdAt = notification.created_at || notification.createdAt;
  return (
    <div
      onClick={() => {
        onMarkRead(notification.id);
        if (notification.incident_id || notification.incidentId) {
          onOpen(notification.incident_id || notification.incidentId);
        }
      }}
      style={{
        padding: '12px',
        background: isUnread ? 'var(--accent-subtle-bg)' : 'var(--bg-input)',
        border: `1px solid ${isUnread ? 'var(--accent-subtle-border)' : 'var(--border-default)'}`,
        borderRadius: 'var(--radius-sm)',
        boxShadow: 'var(--shadow-sm)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
      }}
    >
      <Bell
        size={16}
        color={isUnread ? 'var(--danger-light)' : 'var(--text-secondary)'}
        style={{ flexShrink: 0, marginTop: '2px' }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '12px',
            fontWeight: isUnread ? 700 : 500,
            color: isUnread ? 'var(--text-primary)' : 'var(--text-secondary)',
          }}
        >
          {notification.title}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{notification.message}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>{timeAgo(createdAt)}</div>
      </div>
      {isUnread && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMarkRead(notification.id);
          }}
          style={{
            flexShrink: 0,
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
          title="Mark read"
        >
          <Check size={14} />
        </button>
      )}
    </div>
  );
}

function SavedRow({ incident, onOpen, onUnsave }) {
  const { theme } = useTheme();
  const categoryColor = getIncidentDomainColor(incident, theme);
  const categoryName = incident.domain_name || incident.category_name || incident.category || 'Unknown';
  const createdAt = incident.created_at || incident.createdAt;

  return (
    <div
      style={{
        display: 'flex',
        gap: '10px',
        padding: '10px',
        background: 'var(--bg-input)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div
        style={{
          width: '2px',
          borderRadius: '2px',
          background: categoryColor,
          flexShrink: 0,
          alignSelf: 'stretch',
          marginLeft: '-11px',
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          onClick={() => onOpen(incident)}
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            cursor: 'pointer',
            lineHeight: 1.35,
            wordBreak: 'break-word',
          }}
        >
          {incident.title}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          {categoryName} · {timeAgo(createdAt)}
        </div>
      </div>
      <button
        onClick={() => onUnsave(incident.id)}
        title="Unsave"
        style={{
          flexShrink: 0,
          width: '26px',
          height: '26px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          background: 'transparent',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
        }}
      >
        <Bookmark size={14} />
      </button>
    </div>
  );
}

function RecentRow({ recent, onOpen }) {
  const payload = recent.payload || {};
  const title = payload.title || 'Untitled incident';
  const openedAt = recent.created_at || recent.createdAt;

  return (
    <div
      onClick={() => onOpen({ id: payload.incidentId || recent.id, title })}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px',
        background: 'var(--bg-input)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        cursor: 'pointer',
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
      <Clock size={16} color="var(--text-secondary)" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>viewed {timeAgo(openedAt)}</div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, children }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
      <Icon size={28} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
      <div style={{ fontWeight: 600 }}>{title}</div>
      {children && <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>{children}</div>}
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
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', overflowY: 'auto' }}>
      <LayerSection
        title="Incident Domains"
        active={domains.filter((d) => activeDomainSlugs.has(d.slug)).length}
        total={domains.length}
        onShowAll={onShowAllDomains}
        onHideAll={onHideAllDomains}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
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

      <div style={{ height: '1px', background: 'var(--border-default)', margin: '2px 0' }} />

      <LayerSection
        title="Zone Overlays"
        active={zoneCategories.filter((z) => activeZoneSlugs.has(z.slug)).length}
        total={zoneCategories.length}
        onShowAll={onShowAllZones}
        onHideAll={onHideAllZones}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
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
      <div style={{ padding: '12px 12px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{visibleIncidents.length} visible</span>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Filter size={11} />
          Filtered by active layers
        </span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 18px' }}>
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
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: 'var(--text-muted)',
          }}
        >
          Active Incidents
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {overdueCount > 0 && (
            <span
              style={{
                height: '18px',
                padding: '0 7px',
                borderRadius: '999px',
                background: 'var(--badge-red-bg)',
                border: '1px solid var(--badge-red-bg)',
                color: 'var(--badge-red-text)',
                fontSize: '10px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {overdueCount} overdue
            </span>
          )}
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{activeIncidents.length} total</span>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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

function ActivityDrawer({ activities, activityLastSeenAt, onMarkAllActivitySeen, onSelectActivityIncident }) {
  const unreadCount = activities.filter((a) => a.timestamp > activityLastSeenAt).length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: 'var(--text-secondary)',
          }}
        >
          Live Activity
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{activities.length} events</span>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllActivitySeen}
              style={{
                fontSize: '11px',
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
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {activities.length === 0 ? (
          <EmptyState icon={ActivityIcon} title="No recent activity." />
        ) : (
          activities.map((event) => (
            <ActivityRow
              key={`${event.type}-${event.timestamp}-${event.incidentId || Math.random()}`}
              event={event}
              activityLastSeenAt={activityLastSeenAt}
              onSelectIncident={onSelectActivityIncident}
            />
          ))
        )}
      </div>
    </div>
  );
}

function NotificationsDrawer({ notifications, notificationUnreadCount, onMarkNotificationRead, onMarkAllNotificationsRead, onSelectNotificationIncident }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: '12px',
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
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--accent-light)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Mark all read
          </button>
        )}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-default)' }}>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: 'var(--text-secondary)',
          }}
        >
          Saved Incidents
        </span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: '12px',
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
              fontSize: '11px',
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
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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

function SettingsDrawer({ theme, style, onToggleTheme, onSetStyle }) {
  return (
    <div style={{ padding: '16px' }}>
      <div
        style={{
          marginBottom: '14px',
          fontSize: '12px',
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
          padding: '12px',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Monitor size={16} color="var(--text-secondary)" />
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Theme</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Toggle light or dark mode</div>
          </div>
        </div>
        <ThemeToggle size={18} />
      </div>

      <div
        style={{
          padding: '12px',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <Palette size={16} color="var(--text-secondary)" />
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Interface style</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Choose a visual treatment</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { key: 'tactical', label: 'Tactical', short: 'T' },
            { key: 'saas', label: 'SaaS', short: 'S' },
            { key: 'glass', label: 'Glass', short: 'G' },
          ].map((opt) => {
            const active = style === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => onSetStyle(opt.key)}
                style={{
                  flex: 1,
                  padding: '10px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid',
                  borderColor: active ? 'var(--accent-light)' : 'var(--border-default)',
                  background: active ? 'var(--accent-subtle-bg)' : 'var(--bg-input)',
                  color: active ? 'var(--accent-light)' : 'var(--text-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: 'var(--radius-sm)',
                    background: active ? 'var(--accent)' : 'var(--bg-elevated)',
                    color: active ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 800,
                  }}
                >
                  {opt.short}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700 }}>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          padding: '12px',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-sm)',
          fontSize: '12px',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
        }}
      >
        <Info size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
        Theme and style preferences are stored locally in your browser.
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
        return <SettingsDrawer theme={theme} style={style} onToggleTheme={toggleTheme} onSetStyle={setStyle} />;
      default:
        return null;
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: '64px',
        top: 0,
        bottom: 0,
        width: `${DRAWER_WIDTH}px`,
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
          height: '48px',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px 0 12px',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{drawerTitles[activeDrawer] || ''}</span>
        <button
          onClick={onClose}
          style={{
            width: '28px',
            height: '28px',
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
