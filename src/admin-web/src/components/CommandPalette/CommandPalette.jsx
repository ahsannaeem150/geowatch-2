import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Command,
  X,
  Clock,
  Star,
  MapPin,
  Navigation,
  Plus,
  Hexagon,
  Layers,
  Zap,
  AlertCircle,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { SeverityBadge } from '@shared/components/SeverityBadge.jsx';
import { Badge } from '@shared/components/Badge.jsx';
import { useTheme } from '@shared/useTheme.js';
import { getIncidentDomainColor } from '@shared/utils/themeColors.js';
import { formatDistanceToNow } from 'date-fns';

const SCOPES = [
  { key: 'all', label: 'All', icon: Search },
  { key: 'incidents', label: 'Incidents', icon: AlertCircle },
  { key: 'locations', label: 'Locations', icon: MapPin },
  { key: 'actions', label: 'Actions', icon: Zap },
];

const QUICK_ACTIONS = [
  { id: 'add-incident', label: 'Add new incident', icon: Plus, shortcut: 'A', action: 'add-incident' },
  { id: 'add-zone', label: 'Add new zone', icon: Hexagon, shortcut: 'Z', action: 'add-zone' },
  { id: 'open-layers', label: 'Open layers panel', icon: Layers, shortcut: 'L', action: 'open-layers' },
  { id: 'toggle-focus', label: 'Toggle focus mode', icon: Zap, shortcut: 'F', action: 'toggle-focus' },
];

const LOCATIONS = [
  { id: 'loc1', name: 'Kabul, Afghanistan', detail: 'Capital city', lat: 34.52, lng: 69.18 },
  { id: 'loc2', name: 'Eastern Province, Iraq', detail: 'Province', lat: 30.05, lng: 47.95 },
  { id: 'loc3', name: 'Damascus, Syria', detail: 'Capital city', lat: 33.51, lng: 36.28 },
  { id: 'loc4', name: 'Red Sea corridor', detail: 'Maritime route', lat: 20.35, lng: 38.5 },
  { id: 'loc5', name: 'Tehran, Iran', detail: 'Capital city', lat: 35.7, lng: 51.4 },
  { id: 'loc6', name: 'Najaf, Iraq', detail: 'City', lat: 31.95, lng: 44.35 },
];

const RECENT_KEY = 'geowatch_admin_command_palette_recents';

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlight(text, query) {
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

function timeAgoLabel(dateValue) {
  if (!dateValue) return '';
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return '';
  return formatDistanceToNow(d, { addSuffix: true });
}

export default function CommandPalette({
  isOpen,
  onClose,
  incidents = [],
  savedIds = new Set(),
  onSelectIncident,
  onSelectLocation,
  onAddIncident,
  onAddZone,
  onOpenLayers,
  onToggleFocusMode,
  onOpenAdvancedSearch,
}) {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('all');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [recents, setRecents] = useState({ searches: [], incidentIds: [] });
  const inputRef = useRef(null);
  const savedSet = useMemo(() => (savedIds instanceof Set ? savedIds : new Set(savedIds)), [savedIds]);

  useEffect(() => {
    if (!isOpen) return;
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecents(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, scope]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, scope]);

  function saveRecents(next) {
    setRecents(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  function pushRecentIncident(id) {
    saveRecents({
      ...recents,
      incidentIds: [id, ...recents.incidentIds.filter((x) => x !== id)].slice(0, 6),
    });
  }

  function pushRecentSearch(term) {
    if (!term.trim()) return;
    saveRecents({
      ...recents,
      searches: [term, ...recents.searches.filter((x) => x !== term)].slice(0, 5),
    });
  }

  const q = query.trim().toLowerCase();

  const normalizedIncidents = useMemo(
    () =>
      incidents.map((inc) => ({
        ...inc,
        _location: inc.location_context || inc.location || '',
        _category: inc.category_name || inc.domain_name || '',
        _createdAtMs: inc.created_at ? new Date(inc.created_at).getTime() : 0,
      })),
    [incidents]
  );

  const filteredActions = useMemo(
    () => QUICK_ACTIONS.filter((a) => a.label.toLowerCase().includes(q)),
    [q]
  );

  const filteredLocations = useMemo(
    () =>
      LOCATIONS.filter(
        (l) => l.name.toLowerCase().includes(q) || l.detail.toLowerCase().includes(q)
      ),
    [q]
  );

  const recentIncidents = useMemo(() => {
    const byId = new Map(normalizedIncidents.map((i) => [i.id, i]));
    return recents.incidentIds
      .map((id) => byId.get(id))
      .filter(Boolean)
      .slice(0, 4);
  }, [normalizedIncidents, recents.incidentIds]);

  const filteredIncidents = useMemo(() => {
    if (!q) return normalizedIncidents.slice().sort((a, b) => b._createdAtMs - a._createdAtMs);
    return normalizedIncidents
      .filter((inc) => {
        const hay = `${inc.title} ${inc._location} ${inc._category}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => b._createdAtMs - a._createdAtMs);
  }, [normalizedIncidents, q]);

  const incidentResults = useMemo(() => {
    if (q) return filteredIncidents.slice(0, 8);
    const seen = new Set(recentIncidents.map((i) => i.id));
    const extra = filteredIncidents.filter((i) => !seen.has(i.id)).slice(0, 6 - recentIncidents.length);
    return [...recentIncidents, ...extra].slice(0, 6);
  }, [q, filteredIncidents, recentIncidents]);

  const resultCounts = {
    all: incidentResults.length + filteredLocations.length,
    incidents: incidentResults.length,
    locations: filteredLocations.length,
    actions: filteredActions.length,
  };

  const flatResults = useMemo(() => {
    const list = [];
    if (scope === 'actions') {
      filteredActions.forEach((a) => list.push({ type: 'action', data: a }));
    } else if (scope === 'incidents') {
      incidentResults.forEach((i) => list.push({ type: 'incident', data: i }));
    } else if (scope === 'locations') {
      filteredLocations.forEach((l) => list.push({ type: 'location', data: l }));
    } else {
      incidentResults.forEach((i) => list.push({ type: 'incident', data: i }));
      filteredLocations.slice(0, 4).forEach((l) => list.push({ type: 'location', data: l }));
    }
    return list;
  }, [scope, filteredActions, incidentResults, filteredLocations]);

  function close() {
    onClose?.();
    setTimeout(() => {
      setQuery('');
      setScope('all');
      setHighlightedIndex(0);
    }, 0);
  }

  function handleSelect(item) {
    if (item.type === 'incident') {
      pushRecentIncident(item.data.id);
      if (q) pushRecentSearch(query);
      onSelectIncident?.(item.data);
      close();
    } else if (item.type === 'action') {
      if (q) pushRecentSearch(query);
      const a = item.data;
      if (a.action === 'add-incident') onAddIncident?.();
      if (a.action === 'add-zone') onAddZone?.();
      if (a.action === 'open-layers') onOpenLayers?.();
      if (a.action === 'toggle-focus') onToggleFocusMode?.();
      close();
    } else if (item.type === 'location') {
      pushRecentSearch(item.data.name);
      onSelectLocation?.(item.data);
      close();
    }
  }

  function handleKeyDown(e) {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (flatResults.length ? (prev + 1) % flatResults.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        flatResults.length ? (prev - 1 + flatResults.length) % flatResults.length : 0
      );
    } else if (e.key === 'Enter' && flatResults.length > 0) {
      e.preventDefault();
      handleSelect(flatResults[highlightedIndex]);
    }
  }

  function openAdvanced() {
    close();
    onOpenAdvancedSearch?.();
  }

  const placeholderByScope = {
    all: 'Search incidents and locations…',
    incidents: 'Search incidents…',
    locations: 'Search locations…',
    actions: 'Search commands…',
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--backdrop)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '8vh',
        animation: 'omnibox-fade-in 0.2s ease-out',
      }}
      onClick={close}
    >
      <div
        style={{
          width: 'min(640px, 92vw)',
          maxHeight: 'min(720px, calc(88vh - 40px))',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg), 0 0 0 1px var(--border-subtle)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'omnibox-scale-in 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '18px 22px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <Search size={22} color="var(--text-muted)" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholderByScope[scope]}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '16px',
              fontFamily: 'var(--font-sans)',
              letterSpacing: '-0.3px',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-hover)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <X size={14} />
            </button>
          )}
          <button
            onClick={close}
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--text-muted)',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 10px',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
            }}
          >
            ESC
          </button>
        </div>

        {/* Scope tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 22px 0',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          {SCOPES.map((s) => {
            const Icon = s.icon;
            const active = scope === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setScope(s.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${active ? 'var(--accent-light)' : 'transparent'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  marginBottom: '-1px',
                }}
              >
                <Icon size={15} />
                {s.label}
                <span
                  style={{
                    fontSize: '11px',
                    color: active ? 'var(--accent-light)' : 'var(--text-muted)',
                    opacity: 0.7,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {resultCounts[s.key]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Results */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '6px 12px 14px',
          }}
        >
          {flatResults.length === 0 ? (
            <EmptyState query={query} onAdvanced={openAdvanced} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {scope === 'actions' &&
                filteredActions.map((action, idx) => (
                  <ActionItem
                    key={action.id}
                    action={action}
                    active={highlightedIndex === idx}
                    onClick={() => handleSelect({ type: 'action', data: action })}
                    query={query}
                  />
                ))}

              {scope === 'incidents' &&
                incidentResults.map((inc, idx) => (
                  <IncidentItem
                    key={inc.id}
                    incident={inc}
                    active={highlightedIndex === idx}
                    saved={savedSet.has(inc.id)}
                    onClick={() => handleSelect({ type: 'incident', data: inc })}
                    query={query}
                    showRecentLabel={!q && idx < recentIncidents.length}
                  />
                ))}

              {scope === 'locations' &&
                filteredLocations.map((loc, idx) => (
                  <LocationItem
                    key={loc.id}
                    location={loc}
                    active={highlightedIndex === idx}
                    onClick={() => handleSelect({ type: 'location', data: loc })}
                    query={query}
                  />
                ))}

              {scope === 'all' && (
                <>
                  {incidentResults.length > 0 && (
                    <ResultGroup label={q ? 'Incidents' : 'Recent incidents'} icon={AlertCircle} />
                  )}
                  {incidentResults.map((inc, idx) => (
                    <IncidentItem
                      key={inc.id}
                      incident={inc}
                      active={highlightedIndex === idx}
                      saved={savedSet.has(inc.id)}
                      onClick={() => handleSelect({ type: 'incident', data: inc })}
                      query={query}
                      showRecentLabel={!q && idx < recentIncidents.length}
                    />
                  ))}

                  {filteredLocations.length > 0 && (
                    <ResultGroup label="Locations" icon={MapPin} style={{ marginTop: '6px' }} />
                  )}
                  {filteredLocations.slice(0, 4).map((loc, idx) => {
                    const offset = incidentResults.length;
                    return (
                      <LocationItem
                        key={loc.id}
                        location={loc}
                        active={highlightedIndex === offset + idx}
                        onClick={() => handleSelect({ type: 'location', data: loc })}
                        query={query}
                      />
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 22px',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '12px',
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <kbd style={kbdStyle}>↑</kbd>
              <kbd style={kbdStyle}>↓</kbd>
              <span>Navigate</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <kbd style={kbdStyle}>↵</kbd>
              <span>Select</span>
            </span>
          </div>

          <button
            onClick={openAdvanced}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'transparent',
              border: '1px solid transparent',
              borderRadius: 'var(--radius-md)',
              color: 'var(--accent-light)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--accent-subtle-bg)';
              e.currentTarget.style.borderColor = 'var(--accent-subtle-border)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'transparent';
            }}
          >
            Open advanced search
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes omnibox-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes omnibox-scale-in {
          from { opacity: 0; transform: translateY(-16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes omnibox-item-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .omnibox-result-item {
          animation: omnibox-item-in 0.16s ease-out both;
        }
      `}</style>
    </div>
  );
}

function EmptyState({ query, onAdvanced }) {
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
        Open advanced search
        <ArrowRight size={14} />
      </button>
    </div>
  );
}

function ResultGroup({ label, icon: Icon, style }) {
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

function ActionItem({ action, active, onClick, query }) {
  const Icon = action.icon;
  return (
    <button
      onClick={onClick}
      className="omnibox-result-item"
      style={{
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
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
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
        <Icon size={15} />
      </div>
      <div style={{ flex: 1, fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
        {highlight(action.label, query)}
      </div>
      <kbd style={kbdStyle}>{action.shortcut}</kbd>
    </button>
  );
}

function IncidentItem({ incident, active, saved, onClick, query, showRecentLabel }) {
  const { theme } = useTheme();
  const categoryColor = getIncidentDomainColor(incident, theme);
  return (
    <button
      onClick={onClick}
      className="omnibox-result-item"
      style={{
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
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
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
            <Badge style={{ padding: '1px 6px', fontSize: '9px', letterSpacing: '0.5px' }}>Recent</Badge>
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

function LocationItem({ location, active, onClick, query }) {
  return (
    <button
      onClick={onClick}
      className="omnibox-result-item"
      style={{
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
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
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

const kbdStyle = {
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
