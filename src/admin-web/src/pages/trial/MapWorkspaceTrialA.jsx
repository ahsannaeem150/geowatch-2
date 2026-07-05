import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Layers,
  List,
  Activity,
  Bell,
  Bookmark,
  Settings,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  AlertCircle,
  Radio,
  Eye,
  EyeOff,
  MapPin,
  X,
  Plus,
  Check,
  CheckCircle2,
  Hexagon,
  Info,
  Monitor,
  Palette,
} from 'lucide-react';
import ThemeToggle from '@shared/components/ThemeToggle.jsx';
import { SeverityBadge } from '@shared/components/SeverityBadge.jsx';
import { useStyle } from '@shared/useStyle.js';
import { useTheme } from '@shared/useTheme.js';
import { getDomainColor } from '@shared/utils/themeColors.js';
import {
  LAST_LOGOUT_HOURS_AGO,
  DOMAIN_COLORS,
  SEVERITY_LABEL,
  timeAgo,
  makeId,
  generateInitialData,
  enrichIncident,
  EVENT_META,
} from './dummyData.js';
import { DOMAINS, DOMAIN_BY_CATEGORY_NAME, DOMAIN_BY_NAME, ZONE_CATEGORIES } from './taxonomyData.js';
import { getLayerIcon } from './layerIcons.js';
import MapHudBar from '../../components/MapWorkspaceTrial/MapHudBar.jsx';
import MapCanvas from '../../components/MapWorkspaceTrial/MapCanvas.jsx';
import MapGeocoder from '../../components/MapWorkspaceTrial/MapGeocoder.jsx';

const DRAWER_WIDTH = 360;
const RIGHT_PANEL_WIDTH = 630;

function getLayerTint(layer, theme) {
  if (layer.domain) return getDomainColor(layer.domain, theme);
  if (layer.zone) return getDomainColor(layer.zone, theme);
  return '#888';
}

function IncidentCard({ incident, now, animate, lastLogout, animatedIds, setAnimatedIds, onClick, timeLabel }) {
  const { theme } = useTheme();
  const newIncident = incident.createdAt > lastLogout;
  const updatedIncident = incident.updatedAt > incident.createdAt && incident.updatedAt > lastLogout;
  const shouldPlay = animate && (newIncident || updatedIncident) && !animatedIds.has(incident.id);
  const [playing, setPlaying] = useState(shouldPlay);

  useEffect(() => {
    if (!playing) return;
    setAnimatedIds((prev) => new Set(prev).add(incident.id));
    const duration = newIncident ? 8000 : 2000;
    const timer = setTimeout(() => setPlaying(false), duration);
    return () => clearTimeout(timer);
  }, [playing, incident.id, newIncident, setAnimatedIds]);

  const domain = DOMAIN_BY_CATEGORY_NAME[incident.category] || { name: incident.category, color: '#888', lightColor: '#6b7280' };
  const categoryColor = getDomainColor(domain, theme);

  return (
    <div
      onClick={() => onClick(incident)}
      className={playing ? (newIncident ? 'gw-pulse-card' : 'gw-ring-card') : ''}
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
      {/* Thin left category accent bar, attached to the left edge */}
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
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
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
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
            {newIncident && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '3px 7px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--badge-red-bg)',
                  color: 'var(--badge-red-text)',
                  border: '1px solid var(--badge-red-bg)',
                }}
              >
                New
              </span>
            )}
            {updatedIncident && !newIncident && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '3px 7px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--badge-amber-bg)',
                  color: 'var(--badge-amber-text)',
                  border: '1px solid var(--badge-amber-bg)',
                }}
              >
                Updated
              </span>
            )}
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
            {incident.location}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-secondary)' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: categoryColor }} />
            {incident.category}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {timeLabel || timeAgo(incident.createdAt, now)}
          </span>
        </div>
      </div>
    </div>
  );
}

function ActivityRow({ event, now, activityLastSeenAt, animatedActivityIds, setAnimatedActivityIds, acknowledgedActivityIds, onIncidentClick, onAcknowledge }) {
  const isUnseen = event.createdAt > activityLastSeenAt && !acknowledgedActivityIds.has(event.id);
  const shouldAnimate = isUnseen && !animatedActivityIds.has(event.id);
  const [playing, setPlaying] = useState(shouldAnimate);
  const meta = EVENT_META[event.type] || EVENT_META.new;
  const Icon = meta.icon;

  useEffect(() => {
    if (!playing) return;
    setAnimatedActivityIds((prev) => new Set(prev).add(event.id));
    const timer = setTimeout(() => setPlaying(false), 4000);
    return () => clearTimeout(timer);
  }, [playing, event.id, setAnimatedActivityIds]);

  // Stop the pulse immediately when the user acknowledges this event
  useEffect(() => {
    if (!isUnseen && playing) {
      setPlaying(false);
    }
  }, [isUnseen, playing]);

  const baseBorder = 'var(--border-default)';
  const leftBorder = isUnseen ? meta.color : baseBorder;

  return (
    <div
      onClick={() => {
        if (onAcknowledge) onAcknowledge(event.id);
        if (event.incidentId && onIncidentClick) onIncidentClick(event.incidentId);
      }}
      className={playing ? 'gw-activity-pulse' : ''}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 12px',
        background: isUnseen ? 'var(--accent-subtle-bg)' : 'var(--bg-input)',
        borderWidth: '1px 1px 1px 3px',
        borderStyle: 'solid',
        borderColor: `${baseBorder} ${baseBorder} ${baseBorder} ${leftBorder}`,
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
        e.currentTarget.style.borderTopColor = baseBorder;
        e.currentTarget.style.borderRightColor = baseBorder;
        e.currentTarget.style.borderBottomColor = baseBorder;
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
        <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{event.message}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          {meta.label} · {timeAgo(event.createdAt, now)}
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

function NotificationRow({ notification, now, incidents, onOpen, onMarkRead }) {
  const incident = notification.incidentId ? incidents.find((i) => i.id === notification.incidentId) : null;

  return (
    <div
      onClick={() => {
        onMarkRead(notification.id);
        if (incident) onOpen(incident);
      }}
      style={{
        padding: '12px',
        background: notification.read ? 'var(--bg-input)' : 'var(--accent-subtle-bg)',
        border: `1px solid ${notification.read ? 'var(--border-default)' : 'var(--accent-subtle-border)'}`,
        borderRadius: 'var(--radius-sm)',
        boxShadow: 'var(--shadow-sm)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
      }}
    >
      <Bell size={16} color={notification.read ? 'var(--text-secondary)' : 'var(--danger-light)'} style={{ flexShrink: 0, marginTop: '2px' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '12px', fontWeight: notification.read ? 500 : 700, color: notification.read ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
          {notification.title}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{notification.message}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          {timeAgo(notification.createdAt, now)}
        </div>
      </div>
      {!notification.read && (
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

function DetailPlaceholder({ incident, now }) {
  const { theme } = useTheme();
  const domain = DOMAIN_BY_CATEGORY_NAME[incident.category] || { name: incident.category, color: '#888', lightColor: '#6b7280' };
  const categoryColor = getDomainColor(domain, theme);
  return (
    <div style={{ padding: '24px' }}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 10px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-sm)',
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
        }}
      >
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: categoryColor }} />
        {incident.category}
      </div>

      <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', margin: '16px 0 8px' }}>
        {incident.title}
      </h2>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
        <span style={{ color: incident.severity >= 4 ? 'var(--danger-light)' : 'inherit', fontWeight: 700 }}>
          SEV {incident.severity} · {SEVERITY_LABEL[incident.severity]}
        </span>
        <span>·</span>
        <span>Status: {incident.status}</span>
        <span>·</span>
        <span>{timeAgo(incident.createdAt, now)}</span>
      </div>

      <div
        style={{
          padding: '14px',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-sm)',
          color: 'var(--text-secondary)',
          fontSize: '13px',
          lineHeight: 1.6,
          marginBottom: '20px',
        }}
      >
        {incident.description}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 12px',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-sm)',
          fontSize: '12px',
          color: 'var(--text-secondary)',
          marginBottom: '20px',
        }}
      >
        <MapPin size={14} />
        LAT {incident.lat.toFixed(4)} · LNG {incident.lng.toFixed(4)}
      </div>

      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
        Media & Sources
      </div>
      <div
        style={{
          height: '160px',
          background: 'var(--bg-input)',
          border: '1px dashed var(--border-default)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: '12px',
          marginBottom: '24px',
        }}
      >
        Media gallery placeholder
      </div>

      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
        Timeline
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {[1, 2, 3].map((n) => (
          <div key={n} style={{ height: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', width: `${60 + n * 15}%` }} />
        ))}
      </div>
    </div>
  );
}

function FormPlaceholder({ type, viewport, onCreate, onCancel }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Conflict');
  const [severity, setSeverity] = useState(3);
  const [description, setDescription] = useState('');

  function submit(e) {
    e.preventDefault();
    onCreate({
      title: title || 'Untitled incident',
      category,
      severity: Number(severity),
      description: description || 'No description provided.',
      lat: viewport.south + (viewport.north - viewport.south) * 0.5,
      lng: viewport.west + (viewport.east - viewport.west) * 0.5,
      location: 'Viewport center',
    });
  }

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px' }}>
        {type === 'zone' ? 'Create Zone' : 'Create Incident'}
      </h2>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Incident title"
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none',
            }}
          />
        </div>

        {type !== 'zone' && (
          <>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              >
                {Object.keys(DOMAIN_COLORS)
                  .filter((k) => k !== 'Zones')
                  .map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              >
                {[1, 2, 3, 4, 5].map((s) => (
                  <option key={s} value={s}>
                    {s} — {SEVERITY_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="Add details..."
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none',
              resize: 'vertical',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '10px 14px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{
              flex: 1,
              padding: '10px 14px',
              background: 'var(--accent)',
              border: '1px solid var(--accent)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-on-accent)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Create {type === 'zone' ? 'Zone' : 'Incident'}
          </button>
        </div>
      </form>
    </div>
  );
}

function LayerSection({ title, active, total, onShowAll, onHideAll, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)' }}>
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

function LayerRow({ layer, theme, onToggle }) {
  const data = layer.domain || layer.zone;
  const tint = getLayerTint(layer, theme);
  const Icon = getLayerIcon(data.icon);
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
        border: `1px solid ${layer.active ? softTint : 'var(--border-default)'}`,
        borderRadius: 'var(--radius-sm)',
        boxShadow: 'var(--shadow-sm)',
        cursor: 'pointer',
        textAlign: 'left',
        opacity: layer.active ? 1 : 0.85,
        transition: 'all 0.15s ease',
        width: '100%',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent-light)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = layer.active ? softTint : 'var(--border-default)';
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
        <Icon size={12} strokeWidth={2} />
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
      <span style={{ display: 'flex', alignItems: 'center', color: layer.active ? 'var(--accent-light)' : 'var(--text-muted)', flexShrink: 0 }}>
        {layer.active ? <Eye size={14} /> : <EyeOff size={14} />}
      </span>
    </button>
  );
}

export default function MapWorkspaceTrialA() {
  const [baseline] = useState(() => generateInitialData(Date.now()));
  const { style, setStyle } = useStyle();
  const { theme } = useTheme();
  const [now, setNow] = useState(baseline.now);
  const [incidents, setIncidents] = useState(baseline.incidents);
  const [feed, setFeed] = useState(baseline.feed);
  const [notifications, setNotifications] = useState(baseline.notifications);
  const [viewedIds, setViewedIds] = useState(baseline.viewedIds);
  const viewedIdsRef = useRef(baseline.viewedIds);
  const [savedIds, setSavedIds] = useState(baseline.savedIds);
  const [activityLastSeenAt, setActivityLastSeenAt] = useState(baseline.now);
  const [animatedActivityIds, setAnimatedActivityIds] = useState(new Set());
  const [acknowledgedActivityIds, setAcknowledgedActivityIds] = useState(new Set());
  const [animatedIds, setAnimatedIds] = useState(new Set());
  const [activeDrawer, setActiveDrawer] = useState('incidents');
  const [rightPanel, setRightPanel] = useState(null);
  const [recentlyOpened, setRecentlyOpened] = useState({});
  const [focusMode, setFocusMode] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [confirmResolveId, setConfirmResolveId] = useState(null);
  const [resolveToast, setResolveToast] = useState(null);
  const resolveToastTimeoutRef = useRef(null);
  const [viewport, setViewport] = useState({ north: 39, south: 27, east: 60, west: 40 });
  const [layers, setLayers] = useState(() => [
    ...DOMAINS.map((d) => ({ id: d.name, name: d.name, active: true, isDomain: true, domain: d })),
    ...ZONE_CATEGORIES.map((z) => ({ id: z.slug, name: z.name, active: true, isZone: true, zone: z })),
  ]);

  useEffect(() => {
    viewedIdsRef.current = viewedIds;
  }, [viewedIds]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  function acknowledgeActivityEvent(id) {
    setAcknowledgedActivityIds((prev) => new Set(prev).add(id));
  }

  function markAllActivitySeen() {
    setActivityLastSeenAt(Date.now());
    setAcknowledgedActivityIds(new Set());
  }

  useEffect(() => {
    const interval = setInterval(() => {
      const eventTime = Date.now();
      const typeRoll = Math.random();

      if (typeRoll < 0.45) {
        const categories = Object.keys(DOMAIN_COLORS).filter((k) => k !== 'Zones');
        const category = categories[Math.floor(Math.random() * categories.length)];
        const severity = Math.floor(Math.random() * 5) + 1;
        const newIncident = enrichIncident({
          id: makeId('i'),
          title: `${category} event in sector ${Math.floor(Math.random() * 900) + 100}`,
          category,
          severity,
          lat: 24 + Math.random() * 16,
          lng: 35 + Math.random() * 35,
          status: 'active',
          createdAt: eventTime,
          updatedAt: eventTime,
          location: `${category} sector ${Math.floor(Math.random() * 900) + 100}`,
          description: 'Automatically generated trial event.',
        });

        setIncidents((prev) => [newIncident, ...prev]);
        setFeed((prev) => [
          {
            id: makeId('evt'),
            type: 'new',
            message: `New incident: ${newIncident.title}`,
            incidentId: newIncident.id,
            severity: newIncident.severity,
            createdAt: eventTime,
          },
          ...prev,
        ]);

        if (severity >= 4) {
          setNotifications((prev) => [
            {
              id: makeId('ntf'),
              type: 'new_incident',
              title: 'New severe incident',
              message: newIncident.title,
              incidentId: newIncident.id,
              read: false,
              createdAt: eventTime,
            },
            ...prev,
          ]);
          setToasts((prev) => [
            ...prev,
            {
              id: makeId('toast'),
              title: 'New severe incident',
              message: newIncident.title,
              severity,
            },
          ]);
        }
      } else if (typeRoll < 0.8) {
        setIncidents((prev) => {
          if (prev.length === 0) return prev;
          const idx = Math.floor(Math.random() * prev.length);
          const inc = prev[idx];
          const updated = { ...inc, updatedAt: eventTime };
          const next = [...prev];
          next[idx] = updated;

          setFeed((f) => [
            {
              id: makeId('evt'),
              type: 'update',
              message: `Update on ${inc.title}`,
              incidentId: inc.id,
              severity: inc.severity,
              createdAt: eventTime,
            },
            ...f,
          ]);

          if (viewedIdsRef.current.has(inc.id)) {
            setNotifications((n) => [
              {
                id: makeId('ntf'),
                type: 'incident_update',
                title: 'Incident updated',
                message: inc.title,
                incidentId: inc.id,
                read: false,
                createdAt: eventTime,
              },
              ...n,
            ]);
          }

          return next;
        });
      } else {
        setFeed((prev) => [
          {
            id: makeId('evt'),
            type: 'zone',
            message: 'Zone activity detected in trial sector',
            createdAt: eventTime,
          },
          ...prev,
        ]);
      }
    }, 18000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => setToasts((prev) => prev.slice(1)), 5000);
    return () => clearTimeout(timer);
  }, [toasts]);

  const activeLayerIds = useMemo(() => new Set(layers.filter((l) => l.active).map((l) => l.id)), [layers]);

  const visibleIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (!activeLayerIds.has(inc.category)) return false;
      return (
        inc.lat <= viewport.north &&
        inc.lat >= viewport.south &&
        inc.lng <= viewport.east &&
        inc.lng >= viewport.west
      );
    });
  }, [incidents, activeLayerIds, viewport]);

  const savedIncidents = useMemo(() => {
    return incidents.filter((inc) => savedIds.has(inc.id)).sort((a, b) => b.createdAt - a.createdAt);
  }, [incidents, savedIds]);

  const activityBadgeCount = useMemo(
    () => feed.filter((e) => e.createdAt > activityLastSeenAt && !acknowledgedActivityIds.has(e.id)).length,
    [feed, activityLastSeenAt, acknowledgedActivityIds]
  );
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const activeIncidents = useMemo(() => incidents.filter((inc) => inc.status === 'active'), [incidents]);
  const activeIncidentCount = activeIncidents.length;
  const overdueIncidentCount = useMemo(
    () => activeIncidents.filter((inc) => now - inc.createdAt > 24 * 60 * 60 * 1000).length,
    [activeIncidents, now]
  );

  function openDetail(incident) {
    setRightPanel({ mode: 'detail', incident });
    setViewedIds((prev) => new Set(prev).add(incident.id));
    setRecentlyOpened((prev) => ({ ...prev, [incident.id]: Date.now() }));
    markReadForIncident(incident.id);
  }

  function openDetailById(incidentId) {
    const incident = incidents.find((i) => i.id === incidentId);
    if (incident) openDetail(incident);
  }

  function openForm(type) {
    setRightPanel({ mode: 'form', type });
  }

  function closeRightPanel() {
    setRightPanel(null);
  }

  function markRead(id) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  function markReadForIncident(incidentId) {
    setNotifications((prev) =>
      prev.map((n) => (n.incidentId === incidentId && !n.read ? { ...n, read: true } : n))
    );
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function toggleSaved(id) {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function resolveIncident(id) {
    const incident = incidents.find((inc) => inc.id === id);
    if (!incident) return;
    setIncidents((prev) =>
      prev.map((inc) => (inc.id === id ? { ...inc, status: 'resolved', resolvedAt: Date.now() } : inc))
    );
    if (resolveToastTimeoutRef.current) clearTimeout(resolveToastTimeoutRef.current);
    const timeoutId = setTimeout(() => {
      setResolveToast(null);
      resolveToastTimeoutRef.current = null;
    }, 5000);
    resolveToastTimeoutRef.current = timeoutId;
    setResolveToast({ incidentId: id, timeoutId });
  }

  function undoResolve() {
    if (!resolveToast) return;
    clearTimeout(resolveToast.timeoutId);
    resolveToastTimeoutRef.current = null;
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === resolveToast.incidentId ? { ...inc, status: 'active', resolvedAt: null } : inc
      )
    );
    setResolveToast(null);
  }

  function panViewport(dLat, dLng) {
    setViewport((v) => ({
      north: v.north + dLat,
      south: v.south + dLat,
      east: v.east + dLng,
      west: v.west + dLng,
    }));
  }

  function toggleLayer(id) {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, active: !l.active } : l)));
  }

  function setAllLayers(value) {
    setLayers((prev) => prev.map((l) => ({ ...l, active: value })));
  }

  function handleCreateIncident(payload) {
    const eventTime = Date.now();
    const newIncident = enrichIncident({
      id: makeId('i'),
      ...payload,
      status: 'active',
      createdAt: eventTime,
      updatedAt: eventTime,
      location: payload.location || 'Viewport center',
    });
    setIncidents((prev) => [newIncident, ...prev]);
    setFeed((prev) => [
      {
        id: makeId('evt'),
        type: 'new',
        message: `New incident: ${newIncident.title}`,
        incidentId: newIncident.id,
        severity: newIncident.severity,
        createdAt: eventTime,
      },
      ...prev,
    ]);
    if (newIncident.severity >= 4) {
      setNotifications((prev) => [
        {
          id: makeId('ntf'),
          type: 'new_incident',
          title: 'New severe incident',
          message: newIncident.title,
          incidentId: newIncident.id,
          read: false,
          createdAt: eventTime,
        },
        ...prev,
      ]);
      setToasts((prev) => [
        ...prev,
        {
          id: makeId('toast'),
          title: 'New severe incident',
          message: newIncident.title,
          severity: newIncident.severity,
        },
      ]);
    }
    closeRightPanel();
  }

  const railItems = [
    { id: 'layers', icon: Layers, label: 'Layers' },
    { id: 'incidents', icon: List, label: 'Incidents' },
    { id: 'active', icon: Radio, label: 'Active', badge: activeIncidentCount, overdue: overdueIncidentCount > 0 },
    { id: 'activity', icon: Activity, label: 'Activity', badge: activityBadgeCount },
    { id: 'notifications', icon: Bell, label: 'Notifications', badge: unreadCount },
    { id: 'saved', icon: Bookmark, label: 'Saved' },
    { id: 'recents', icon: Clock, label: 'Recents' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];


  function renderDrawerContent() {
    if (activeDrawer === 'layers') {
      const domainLayers = layers.filter((l) => l.isDomain);
      const zoneLayers = layers.filter((l) => l.isZone);

      return (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', overflowY: 'auto' }} className="pw-filter-scroll">
          <LayerSection
            title="Incident Domains"
            active={domainLayers.filter((l) => l.active).length}
            total={domainLayers.length}
            onShowAll={() => setLayers((prev) => prev.map((l) => (l.isDomain ? { ...l, active: true } : l)))}
            onHideAll={() => setLayers((prev) => prev.map((l) => (l.isDomain ? { ...l, active: false } : l)))}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {domainLayers.map((layer) => (
                <LayerRow key={layer.id} layer={layer} theme={theme} onToggle={() => toggleLayer(layer.id)} />
              ))}
            </div>
          </LayerSection>

          <div style={{ height: '1px', background: 'var(--border-default)', margin: '2px 0' }} />

          <LayerSection
            title="Zone Overlays"
            active={zoneLayers.filter((l) => l.active).length}
            total={zoneLayers.length}
            onShowAll={() => setLayers((prev) => prev.map((l) => (l.isZone ? { ...l, active: true } : l)))}
            onHideAll={() => setLayers((prev) => prev.map((l) => (l.isZone ? { ...l, active: false } : l)))}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {zoneLayers.map((layer) => (
                <LayerRow key={layer.id} layer={layer} theme={theme} onToggle={() => toggleLayer(layer.id)} />
              ))}
            </div>
          </LayerSection>
        </div>
      );
    }

    if (activeDrawer === 'incidents') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '12px 12px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {visibleIncidents.length} visible in viewport
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={11} />
              Filtered by active layers
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 18px' }}>
            {visibleIncidents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                <AlertCircle size={28} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                No incidents in current viewport.
              </div>
            ) : (
              visibleIncidents.map((incident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  now={now}
                  animate
                  lastLogout={baseline.lastLogout}
                  animatedIds={animatedIds}
                  setAnimatedIds={setAnimatedIds}
                  onClick={openDetail}
                />
              ))
            )}
          </div>
        </div>
      );
    }

    if (activeDrawer === 'active') {
      const sorted = [...activeIncidents].sort((a, b) => a.createdAt - b.createdAt);
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
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>
              Active Incidents
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {overdueIncidentCount > 0 && (
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
                  {overdueIncidentCount} overdue
                </span>
              )}
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{activeIncidentCount} total</span>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sorted.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                <CheckCircle2 size={28} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                No active incidents.
              </div>
            ) : (
              sorted.map((incident) => {
                const overdue = now - incident.createdAt > 24 * 60 * 60 * 1000;
                const domain = DOMAIN_BY_CATEGORY_NAME[incident.category] || { name: incident.category, color: '#888', lightColor: '#6b7280' };
                const categoryColor = getDomainColor(domain, theme);
                return (
                  <div
                    key={incident.id}
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
                        onClick={() => openDetail(incident)}
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
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{incident.location}</span>
                        <span>·</span>
                        <span>{timeAgo(incident.createdAt, now)}</span>
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
                          {incident.category}
                        </span>
                        <SeverityBadge level={incident.severity} style={{ transform: 'scale(0.78)', transformOrigin: 'right center', flexShrink: 0 }} />
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmResolveId(incident.id);
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
              })
            )}
          </div>
        </div>
      );
    }

    if (activeDrawer === 'activity') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)' }}>
              Live Activity
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{feed.length} events</span>
              {activityBadgeCount > 0 && (
                <button
                  onClick={markAllActivitySeen}
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
            {feed.map((event) => (
              <ActivityRow
                key={event.id}
                event={event}
                now={now}
                activityLastSeenAt={activityLastSeenAt}
                animatedActivityIds={animatedActivityIds}
                setAnimatedActivityIds={setAnimatedActivityIds}
                acknowledgedActivityIds={acknowledgedActivityIds}
                onIncidentClick={openDetailById}
                onAcknowledge={acknowledgeActivityEvent}
              />
            ))}
          </div>
        </div>
      );
    }

    if (activeDrawer === 'notifications') {
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
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)' }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
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
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                <Bell size={28} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                No notifications.
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  now={now}
                  incidents={incidents}
                  onOpen={openDetail}
                  onMarkRead={markRead}
                />
              ))
            )}
          </div>

          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--border-default)',
              fontSize: '11px',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
            }}
          >
            <Info size={12} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            Notification rules are documented in <strong>docs/trial-activity-notifications-design.md</strong> for real-web integration.
          </div>
        </div>
      );
    }

    if (activeDrawer === 'saved') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-default)' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)' }}>
              Saved Incidents
            </span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 18px' }}>
            {savedIncidents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                <Bookmark size={28} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                No saved incidents yet.
              </div>
            ) : (
              savedIncidents.map((incident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  now={now}
                  animate={false}
                  lastLogout={baseline.lastLogout}
                  animatedIds={animatedIds}
                  setAnimatedIds={setAnimatedIds}
                  onClick={openDetail}
                />
              ))
            )}
          </div>
        </div>
      );
    }

    if (activeDrawer === 'recents') {
      const recentList = Object.entries(recentlyOpened)
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => incidents.find((inc) => inc.id === id))
        .filter(Boolean);

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
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)' }}>
              Recently Viewed
            </span>
            {recentList.length > 0 && (
              <button
                onClick={() => setRecentlyOpened({})}
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
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 18px' }}>
            {recentList.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 16px', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' }}>
                <Clock size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                <div>No recently viewed incidents.</div>
                <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '6px' }}>Open an incident from the map or list to see it here.</div>
              </div>
            ) : (
              recentList.map((incident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  now={now}
                  animate={false}
                  lastLogout={baseline.lastLogout}
                  animatedIds={animatedIds}
                  setAnimatedIds={setAnimatedIds}
                  onClick={openDetail}
                  timeLabel={`viewed ${timeAgo(recentlyOpened[incident.id], now)}`}
                />
              ))
            )}
          </div>
        </div>
      );
    }

    if (activeDrawer === 'settings') {
      return (
        <div style={{ padding: '16px' }}>
          <div
            style={{
              marginTop: '24px',
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
                    onClick={() => setStyle(opt.key)}
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
            Activity and notification behavior is documented in{' '}
            <strong>docs/trial-activity-notifications-design.md</strong>.
          </div>
        </div>
      );
    }

    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg-surface)' }}>
      <style>{`
        @keyframes gw-pulse {
          0% { box-shadow: 0 0 0 0 var(--danger-glow); }
          70% { box-shadow: 0 0 0 12px transparent; }
          100% { box-shadow: 0 0 0 0 transparent; }
        }
        .gw-pulse-card { animation: gw-pulse 1.5s ease-out 5; }
        @keyframes gw-ring {
          0% { box-shadow: 0 0 0 0 var(--warning-glow); }
          100% { box-shadow: 0 0 0 10px transparent; }
        }
        .gw-ring-card { animation: gw-ring 0.6s ease-out 3; }
        @keyframes gw-activity-pulse {
          0% { background: var(--accent-subtle-bg); }
          50% { background: var(--accent-hover-bg); }
          100% { background: var(--accent-subtle-bg); }
        }
        .gw-activity-pulse { animation: gw-activity-pulse 1.6s ease-in-out 2; }
        @keyframes gw-dot-pulse {
          0% { box-shadow: 0 0 0 0 var(--danger-glow); }
          70% { box-shadow: 0 0 0 6px transparent; }
          100% { box-shadow: 0 0 0 0 transparent; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pw-toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>

      <MapHudBar
        onToggleFocusMode={() => setFocusMode((p) => !p)}
        isFocusMode={focusMode}
        onAddIncident={() => openForm('incident')}
        onAddZone={() => openForm('zone')}
        onOpenZones={() => setActiveDrawer('layers')}
        incidents={incidents}
        savedIds={savedIds}
        onSelectIncident={openDetail}
        activeCount={activeIncidentCount}
        overdueCount={overdueIncidentCount}
        onOpenActiveDrawer={() => setActiveDrawer('active')}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Left icon rail */}
        {!focusMode && (
          <div
            style={{
              width: '64px',
              background: 'var(--bg-surface)',
              borderRight: '1px solid var(--border-default)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '12px 0',
              gap: '8px',
              zIndex: 50,
            }}
          >
            {railItems.map((item) => {
              const Icon = item.icon;
              const active = activeDrawer === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveDrawer((p) => (p === item.id ? null : item.id))}
                  title={item.label}
                  style={{
                    position: 'relative',
                    width: '44px',
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: active ? 'var(--accent-subtle-bg)' : 'transparent',
                    color: active ? 'var(--accent-light)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'var(--bg-hover)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }
                  }}
                >
                  <Icon size={20} />
                  {item.badge > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        minWidth: '16px',
                        height: '16px',
                        padding: '0 4px',
                        borderRadius: '8px',
                        background: 'var(--accent-light)',
                        color: 'var(--text-on-accent)',
                        fontSize: '10px',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 0 2px var(--bg-surface)',
                      }}
                    >
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                  {item.overdue && item.badge === 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '6px',
                        right: '6px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'var(--accent-light)',
                        boxShadow: '0 0 0 2px var(--bg-surface)',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Drawer panel overlay */}
        {!focusMode && activeDrawer && (
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
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {activeDrawer === 'layers'
                  ? 'Map Layers'
                  : {
                      incidents: 'Incidents in Viewport',
                      active: 'Active Incidents',
                      activity: 'Live Activity',
                      notifications: 'Notifications',
                      saved: 'Saved',
                      recents: 'Recents',
                      settings: 'Settings',
                    }[activeDrawer]}
              </span>
              <button
                onClick={() => setActiveDrawer(null)}
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
            <div style={{ flex: 1, overflow: 'hidden' }}>{renderDrawerContent()}</div>
          </div>
        )}

        {/* Map canvas */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          <MapCanvas label="Layout A: Rail + Drawer + Tabs" hint="Left rail opens drawers over the map" />
          <MapGeocoder />

          {/* Viewport controls */}
          {!focusMode && (
            <div
              style={{
                position: 'absolute',
                top: '12px',
                right: rightPanel ? `${RIGHT_PANEL_WIDTH + 12}px` : '12px',
                zIndex: 30,
                padding: '12px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                transition: 'right 0.25s ease',
                minWidth: '160px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Simulated Viewport
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                N {viewport.north.toFixed(1)} · S {viewport.south.toFixed(1)}
                <br />
                E {viewport.east.toFixed(1)} · W {viewport.west.toFixed(1)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
                <div />
                <button onClick={() => panViewport(2, 0)} style={controlBtnStyle}>▲</button>
                <div />
                <button onClick={() => panViewport(0, -2)} style={controlBtnStyle}>◀</button>
                <button onClick={() => setViewport({ north: 39, south: 27, east: 60, west: 40 })} style={controlBtnStyle}>⌂</button>
                <button onClick={() => panViewport(0, 2)} style={controlBtnStyle}>▶</button>
                <div />
                <button onClick={() => panViewport(-2, 0)} style={controlBtnStyle}>▼</button>
                <div />
              </div>
              <div style={{ fontSize: '11px', color: 'var(--accent-light)', textAlign: 'center' }}>
                {visibleIncidents.length} visible
              </div>
            </div>
          )}

          {/* Floating right panel toggle */}
          {!focusMode && (
            <button
              onClick={() => setRightPanel((p) => (p ? null : { mode: 'detail', incident: incidents[0] }))}
              style={{
                position: 'absolute',
                top: '12px',
                right: rightPanel ? `${RIGHT_PANEL_WIDTH + 12}px` : '12px',
                zIndex: 30,
                padding: '8px 12px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'right 0.25s ease',
                marginTop: '148px',
              }}
            >
              {rightPanel ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
              {rightPanel ? 'Hide Panel' : 'Show Panel'}
            </button>
          )}
        </div>

        {/* Right panel */}
        {!focusMode && rightPanel && (
          <div
            style={{
              width: `${RIGHT_PANEL_WIDTH}px`,
              flexShrink: 0,
              background: 'var(--bg-surface)',
              borderLeft: '1px solid var(--border-default)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 50,
            }}
          >
            <div
              style={{
                height: '48px',
                borderBottom: '1px solid var(--border-default)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 16px',
              }}
            >
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {rightPanel.mode === 'detail' ? 'Incident Detail' : `Create ${rightPanel.type === 'zone' ? 'Zone' : 'Incident'}`}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {rightPanel.mode === 'detail' && rightPanel.incident.status === 'active' && (
                  <button
                    onClick={() => setConfirmResolveId(rightPanel.incident.id)}
                    style={{
                      padding: '5px 10px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-secondary)',
                      fontSize: '11px',
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
                )}
                {rightPanel.mode === 'detail' && (
                  <button
                    onClick={() => toggleSaved(rightPanel.incident.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: savedIds.has(rightPanel.incident.id) ? 'var(--accent-light)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title={savedIds.has(rightPanel.incident.id) ? 'Unsave' : 'Save'}
                  >
                    <Bookmark size={18} fill={savedIds.has(rightPanel.incident.id) ? 'currentColor' : 'none'} />
                  </button>
                )}
                <button
                  onClick={closeRightPanel}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {rightPanel.mode === 'detail' ? (
                <DetailPlaceholder incident={rightPanel.incident} now={now} />
              ) : (
                <FormPlaceholder type={rightPanel.type} viewport={viewport} onCreate={handleCreateIncident} onCancel={closeRightPanel} />
              )}
            </div>
          </div>
        )}
      </div>



      {confirmResolveId && (
        <ResolveConfirmModal
          incident={incidents.find((inc) => inc.id === confirmResolveId)}
          onCancel={() => setConfirmResolveId(null)}
          onConfirm={() => {
            resolveIncident(confirmResolveId);
            setConfirmResolveId(null);
          }}
        />
      )}

      {resolveToast && (
        <ResolveToast
          onUndo={undoResolve}
          onDismiss={() => {
            clearTimeout(resolveToast.timeoutId);
            resolveToastTimeoutRef.current = null;
            setResolveToast(null);
          }}
        />
      )}

      {/* Toasts */}
      <div style={{ position: 'fixed', top: '72px', right: '20px', zIndex: 200, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              width: '320px',
              padding: '14px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-default)',
              borderLeft: `4px solid ${toast.severity >= 4 ? 'var(--danger)' : 'var(--accent)'}`,
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              animation: 'slideIn 0.25s ease-out',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{toast.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{toast.message}</div>
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResolveConfirmModal({ incident, onCancel, onConfirm }) {
  if (!incident) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--backdrop)',
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '360px',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)',
          padding: '18px',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Resolve incident?</div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
          “{incident.title}” will be marked as resolved. It will remain visible on the map for 24 hours.
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '6px 12px',
              background: 'transparent',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '6px 12px',
              background: 'var(--danger)',
              border: '1px solid var(--danger)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-on-accent)',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Resolve
          </button>
        </div>
      </div>
    </div>
  );
}

function ResolveToast({ onUndo, onDismiss }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 300,
      }}
    >
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 14px',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}
      >
        <CheckCircle2 size={14} color="var(--accent-light)" />
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Incident resolved</span>
        <button
          onClick={onUndo}
          style={{
            padding: '3px 8px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Undo
        </button>
        <button
          onClick={onDismiss}
          style={{
            width: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          <X size={12} />
        </button>
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'var(--accent-light)',
            animation: 'pw-toast-progress 5s linear forwards',
          }}
        />
      </div>
    </div>
  );
}

const controlBtnStyle = {
  padding: '6px 0',
  fontSize: '12px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
};
