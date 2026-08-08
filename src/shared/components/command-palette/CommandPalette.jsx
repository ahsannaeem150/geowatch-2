import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Command, X, AlertCircle, MapPin, Hexagon, ArrowRight } from 'lucide-react';
import { API_BASE_URL } from '../../constants.js';
import {
  parseCoordinates,
  getZoomForLocation,
  formatLocationName,
  formatLocationDetail,
  normalizeIncident,
} from './utils.js';
import {
  kbdStyle,
  EmptyState,
  ResultGroup,
  ActionItem,
  IncidentItem,
  ZoneItem,
  LocationItem,
  StatusRow,
  BridgeItem,
} from './rows.jsx';

const SCOPES = [
  { key: 'all', label: 'All', icon: Search },
  { key: 'incidents', label: 'Incidents', icon: AlertCircle },
  { key: 'zones', label: 'Zones', icon: Hexagon },
  { key: 'locations', label: 'Locations', icon: MapPin },
  { key: 'actions', label: 'Actions', icon: Command },
];

const DEFAULT_PLACEHOLDERS = {
  all: 'Search incidents, zones and locations…',
  incidents: 'Search incidents…',
  zones: 'Search zones…',
  locations: 'Search locations…',
  actions: 'Search commands…',
};

// Bridge row title per scope; '{query}' is interpolated at render time.
const DEFAULT_BRIDGE_LABELS = {
  all: 'Search all incidents for “{query}”',
  incidents: 'Search all incidents for “{query}”',
  zones: 'Search all zones for “{query}”',
  locations: 'Search all locations for “{query}”',
  actions: 'Search all incidents for “{query}”',
};

const DEFAULT_RECENTS_KEY = 'intelmap24_command_palette_recents';

/**
 * Shared ⌘K command palette (map workspace search).
 *
 * Props:
 * - open (bool, required) — visibility; the parent owns the ⌘K shortcut that opens it
 * - onClose () => void
 * - incidents (array, default []) — map-loaded incidents for the instant client filter
 * - savedIds (Set|array, default empty) — renders the saved star on matching rows
 * - actions (array, default []) — quick actions for the Actions scope:
 *     { id, label, icon?, hint?, keywords?, path?|subtitle?, group?, onSelect(action, query) }
 *     path/subtitle renders as small trailing mono text on the row; group
 *     clusters rows under small headers in the Actions scope (first-appearance
 *     order — the flat keyboard list follows the same grouped order).
 * - onSelectIncident (fn) — called with the raw incident/zone row (points AND polygon zones)
 * - onSelectLocation (fn) — called with { lat, lng, zoom }
 * - onOpenAdvanced (fn(query), optional) — advanced-search bridge; when omitted the
 *   bridge row and advanced CTAs are hidden
 * - recentsKey (string, default 'intelmap24_command_palette_recents') — localStorage key
 * - legacyRecentsKey (string, optional) — migrated when recentsKey has no value yet
 * - placeholder (string, optional) — overrides every scope's input placeholder
 * - bridgeLabel (string, optional) — bridge row title; '{query}' is interpolated.
 *   Defaults follow the active scope (zones → "…all zones…", locations →
 *   "…all locations…", otherwise incidents); an explicit value always wins.
 * - bridgeHint (string, optional) — bridge row subtitle
 * - advancedLabel (string, optional) — label for the advanced-search CTAs
 */
export default function CommandPalette({
  open,
  onClose,
  incidents = [],
  savedIds = new Set(),
  actions = [],
  onSelectIncident,
  onSelectLocation,
  onOpenAdvanced,
  recentsKey = DEFAULT_RECENTS_KEY,
  legacyRecentsKey,
  placeholder,
  bridgeLabel,
  bridgeHint = 'Open Power Search with this query',
  advancedLabel = 'Open advanced search',
}) {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('all');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [recents, setRecents] = useState({ searches: [], incidentIds: [] });
  const [locationResults, setLocationResults] = useState([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [backendResults, setBackendResults] = useState([]);
  const [backendLoading, setBackendLoading] = useState(false);
  const [backendError, setBackendError] = useState(false);
  const inputRef = useRef(null);
  const savedSet = useMemo(() => (savedIds instanceof Set ? savedIds : new Set(savedIds)), [savedIds]);

  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(recentsKey);
      if (raw) {
        setRecents(JSON.parse(raw));
      } else if (legacyRecentsKey) {
        const legacy = localStorage.getItem(legacyRecentsKey);
        if (legacy) {
          const parsed = JSON.parse(legacy);
          const migrated = Array.isArray(parsed) ? { searches: parsed.slice(0, 5), incidentIds: [] } : parsed;
          setRecents(migrated);
        }
      }
    } catch {
      // ignore
    }
  }, [open, recentsKey, legacyRecentsKey]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open, scope]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, scope]);

  function saveRecents(next) {
    setRecents(next);
    try {
      localStorage.setItem(recentsKey, JSON.stringify(next));
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
  const coordinateHit = useMemo(() => parseCoordinates(query), [query]);

  const normalizedIncidents = useMemo(() => incidents.map(normalizeIncident), [incidents]);

  const filteredActions = useMemo(
    () => actions.filter((a) => `${a.label} ${a.keywords || ''}`.toLowerCase().includes(q)),
    [actions, q]
  );

  // Actions-scope grouping: actions carrying `group` cluster under small group
  // headers in first-appearance order (ungrouped actions form a headerless
  // block wherever they first appear). `orderedActions` — the flattened
  // grouped order — drives BOTH the render and the flat keyboard list, so
  // ↑/↓ indices always match the rows on screen; with no groups present the
  // order is identical to filteredActions.
  const { actionGroups, orderedActions } = useMemo(() => {
    const groups = [];
    const byKey = new Map();
    for (const a of filteredActions) {
      const key = a.group || '';
      if (!byKey.has(key)) {
        const g = { key, items: [] };
        byKey.set(key, g);
        groups.push(g);
      }
      byKey.get(key).items.push(a);
    }
    return { actionGroups: groups, orderedActions: groups.flatMap((g) => g.items) };
  }, [filteredActions]);

  // Flat render list for the Actions scope: group headers + action rows with
  // their keyboard indices precomputed in grouped order.
  const actionRows = useMemo(() => {
    const rows = [];
    let idx = 0;
    actionGroups.forEach((g, gIdx) => {
      if (g.key) rows.push({ type: 'group', key: `group-${g.key}`, label: g.key, spaced: gIdx > 0 });
      g.items.forEach((action) => {
        rows.push({ type: 'action', key: action.id, action, idx });
        idx += 1;
      });
    });
    return rows;
  }, [actionGroups]);

  // Instant client-side filter over the incidents already loaded on the map.
  const filteredIncidents = useMemo(() => {
    if (!q) return normalizedIncidents.slice().sort((a, b) => b._createdAtMs - a._createdAtMs);
    return normalizedIncidents
      .filter((inc) => {
        const hay = `${inc.title} ${inc._location} ${inc._category}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => b._createdAtMs - a._createdAtMs);
  }, [normalizedIncidents, q]);

  // Backend search rows (arrive after the debounce) are appended after the
  // client-filtered results and deduped by id, then split by geometry type.
  const mergedIncidents = useMemo(() => {
    if (!q) return filteredIncidents;
    const seen = new Set(filteredIncidents.map((i) => i.id));
    const extra = backendResults.filter((i) => !seen.has(i.id));
    return [...filteredIncidents, ...extra];
  }, [q, filteredIncidents, backendResults]);

  const pointResults = useMemo(
    () => mergedIncidents.filter((i) => i.geometry_type !== 'polygon'),
    [mergedIncidents]
  );
  const zoneResults = useMemo(
    () => mergedIncidents.filter((i) => i.geometry_type === 'polygon'),
    [mergedIncidents]
  );

  const recentIncidents = useMemo(() => {
    const byId = new Map(normalizedIncidents.map((i) => [i.id, i]));
    return recents.incidentIds
      .map((id) => byId.get(id))
      .filter(Boolean)
      .slice(0, 4);
  }, [normalizedIncidents, recents.incidentIds]);

  // Incidents section: recents + latest points when idle, top matches when querying.
  const incidentResults = useMemo(() => {
    if (q) return pointResults.slice(0, 8);
    const recentPoints = recentIncidents.filter((i) => i.geometry_type !== 'polygon');
    const seen = new Set(recentPoints.map((i) => i.id));
    const extra = pointResults.filter((i) => !seen.has(i.id)).slice(0, 6 - recentPoints.length);
    return [...recentPoints, ...extra].slice(0, 6);
  }, [q, pointResults, recentIncidents]);

  // Zones section (All scope): latest zones when idle, top matches when querying.
  const zoneSectionResults = useMemo(() => zoneResults.slice(0, q ? 6 : 4), [q, zoneResults]);

  // Zones scope shows a longer list than the grouped All view.
  const scopeZoneResults = useMemo(() => zoneResults.slice(0, 12), [zoneResults]);

  // ─── Location search (via backend geocode proxy) ───
  useEffect(() => {
    if (!open) return;
    if (!q || coordinateHit || q.length < 2) {
      setLocationResults([]);
      setLocationError(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLocationLoading(true);
      setLocationError(false);
      try {
        const res = await fetch(
          `${API_BASE_URL}/geocode/search?q=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error(`Geocode proxy responded ${res.status}`);
        const json = await res.json();
        setLocationResults(Array.isArray(json.data) ? json.data : []);
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.warn('[CommandPalette] Location search unavailable:', err);
        setLocationResults([]);
        setLocationError(true);
      } finally {
        if (!controller.signal.aborted) setLocationLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, q, coordinateHit, open]);

  // ─── Backend incident/zone search (full database, not just map-loaded) ───
  useEffect(() => {
    if (!open) return;
    if (!q || q.length < 2 || coordinateHit) {
      setBackendResults([]);
      setBackendError(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBackendLoading(true);
      setBackendError(false);
      try {
        const res = await fetch(
          `${API_BASE_URL}/incidents/search?q=${encodeURIComponent(query.trim())}&limit=20`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error(`Incident search responded ${res.status}`);
        const json = await res.json();
        setBackendResults((json.data?.incidents || []).map(normalizeIncident));
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.warn('[CommandPalette] Incident search unavailable:', err);
        setBackendResults([]);
        setBackendError(true);
      } finally {
        if (!controller.signal.aborted) setBackendLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, q, coordinateHit, open]);

  const filteredLocations = useMemo(() => {
    const list = [];
    if (coordinateHit) {
      list.push({
        id: 'coordinate-hit',
        name: `${coordinateHit.lat.toFixed(5)}, ${coordinateHit.lng.toFixed(5)}`,
        detail: 'Go to coordinates',
        lat: coordinateHit.lat,
        lng: coordinateHit.lng,
        zoom: 16,
        type: 'coordinates',
      });
    }
    locationResults.forEach((loc, idx) => {
      list.push({
        id: `loc-${idx}`,
        name: formatLocationName(loc),
        detail: formatLocationDetail(loc),
        lat: parseFloat(loc.lat),
        lng: parseFloat(loc.lon),
        locationType: loc.type,
        locationClass: loc.class,
      });
    });
    return list;
  }, [coordinateHit, locationResults]);

  const resultCounts = {
    all: incidentResults.length + zoneSectionResults.length + filteredLocations.length,
    incidents: incidentResults.length,
    zones: scopeZoneResults.length,
    locations: filteredLocations.length,
    actions: filteredActions.length,
  };

  // Bridge row to advanced search — appended to the flat keyboard navigation
  // list so ↑/↓/Enter traverses it like any other row.
  const showBridge = !!onOpenAdvanced && !!q && scope !== 'actions' && scope !== 'locations';

  const flatResults = useMemo(() => {
    const list = [];
    if (scope === 'actions') {
      orderedActions.forEach((a) => list.push({ type: 'action', data: a }));
    } else if (scope === 'incidents') {
      incidentResults.forEach((i) => list.push({ type: 'incident', data: i }));
    } else if (scope === 'zones') {
      scopeZoneResults.forEach((z) => list.push({ type: 'zone', data: z }));
    } else if (scope === 'locations') {
      filteredLocations.forEach((l) => list.push({ type: 'location', data: l }));
    } else {
      incidentResults.forEach((i) => list.push({ type: 'incident', data: i }));
      zoneSectionResults.forEach((z) => list.push({ type: 'zone', data: z }));
      filteredLocations.slice(0, 4).forEach((l) => list.push({ type: 'location', data: l }));
    }
    if (showBridge) list.push({ type: 'bridge' });
    return list;
  }, [scope, orderedActions, incidentResults, scopeZoneResults, zoneSectionResults, filteredLocations, showBridge]);

  function close() {
    onClose?.();
    setTimeout(() => {
      setQuery('');
      setScope('all');
      setHighlightedIndex(0);
      setLocationResults([]);
      setLocationLoading(false);
      setLocationError(false);
      setBackendResults([]);
      setBackendLoading(false);
      setBackendError(false);
    }, 0);
  }

  function handleSelect(item) {
    if (!item) return;
    if (item.type === 'incident' || item.type === 'zone') {
      // Zones are incidents with polygon geometry — the app's selection
      // handler is expected to open the zone view and fit the map.
      pushRecentIncident(item.data.id);
      if (q) pushRecentSearch(query);
      onSelectIncident?.(item.data);
      close();
    } else if (item.type === 'action') {
      if (q) pushRecentSearch(query);
      item.data.onSelect?.(item.data, query);
      close();
    } else if (item.type === 'location') {
      const loc = item.data;
      pushRecentSearch(loc.name);
      const zoom = loc.zoom ?? getZoomForLocation(loc.locationType, loc.locationClass);
      onSelectLocation?.({ lat: loc.lat, lng: loc.lng, zoom });
      close();
    } else if (item.type === 'bridge') {
      pushRecentSearch(query);
      close();
      onOpenAdvanced?.(query);
    }
  }

  function handleKeyDown(e) {
    if (!open) return;
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
    const forwarded = query;
    close();
    onOpenAdvanced?.(forwarded);
  }

  const placeholderByScope = placeholder
    ? { all: placeholder, incidents: placeholder, zones: placeholder, locations: placeholder, actions: placeholder }
    : DEFAULT_PLACEHOLDERS;

  // Status rows (non-selectable): live fetch progress + distinct error rows.
  const recentPointCount = useMemo(
    () => recentIncidents.filter((i) => i.geometry_type !== 'polygon').length,
    [recentIncidents]
  );
  const incidentScopes = scope === 'all' || scope === 'incidents' || scope === 'zones';
  const locationScopes = scope === 'all' || scope === 'locations';
  const isSearching =
    (incidentScopes && backendLoading) || (locationScopes && locationLoading && !!q);
  const showIncidentError = incidentScopes && backendError && !backendLoading;
  const showLocationError = locationScopes && locationError && !locationLoading;

  const bridgeTitle = (bridgeLabel ?? DEFAULT_BRIDGE_LABELS[scope] ?? DEFAULT_BRIDGE_LABELS.all)
    .replace('{query}', query);

  if (!open) return null;

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
          {/* Non-selectable status rows: fetch progress + distinct errors */}
          {isSearching && <StatusRow kind="loading" message="Searching incidents, zones and places…" />}
          {showIncidentError && (
            <StatusRow kind="error" message="Incident search unavailable" hint="edit the query to retry" />
          )}
          {showLocationError && (
            <StatusRow kind="error" message="Location search unavailable" hint="edit the query to retry" />
          )}

          {flatResults.length === 0 ? (
            !isSearching && (
              <EmptyState
                query={query}
                onAdvanced={onOpenAdvanced ? openAdvanced : undefined}
                advancedLabel={advancedLabel}
              />
            )
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {scope === 'actions' &&
                actionRows.map((row) =>
                  row.type === 'group' ? (
                    <ResultGroup
                      key={row.key}
                      label={row.label}
                      icon={Command}
                      style={row.spaced ? { marginTop: '6px' } : undefined}
                    />
                  ) : (
                    <ActionItem
                      key={row.key}
                      action={row.action}
                      active={highlightedIndex === row.idx}
                      onClick={() => handleSelect({ type: 'action', data: row.action })}
                      query={query}
                    />
                  )
                )}

              {scope === 'incidents' && (
                <>
                  {incidentResults.map((inc, idx) => (
                    <IncidentItem
                      key={inc.id}
                      incident={inc}
                      active={highlightedIndex === idx}
                      saved={savedSet.has(inc.id)}
                      onClick={() => handleSelect({ type: 'incident', data: inc })}
                      query={query}
                      showRecentLabel={!q && idx < recentPointCount}
                    />
                  ))}
                  {showBridge && (
                    <BridgeItem
                      active={highlightedIndex === incidentResults.length}
                      onClick={() => handleSelect({ type: 'bridge' })}
                      title={bridgeTitle}
                      hint={bridgeHint}
                    />
                  )}
                </>
              )}

              {scope === 'zones' && (
                <>
                  {scopeZoneResults.map((zone, idx) => (
                    <ZoneItem
                      key={zone.id}
                      zone={zone}
                      active={highlightedIndex === idx}
                      saved={savedSet.has(zone.id)}
                      onClick={() => handleSelect({ type: 'zone', data: zone })}
                      query={query}
                    />
                  ))}
                  {showBridge && (
                    <BridgeItem
                      active={highlightedIndex === scopeZoneResults.length}
                      onClick={() => handleSelect({ type: 'bridge' })}
                      title={bridgeTitle}
                      hint={bridgeHint}
                    />
                  )}
                </>
              )}

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
                      showRecentLabel={!q && idx < recentPointCount}
                    />
                  ))}

                  {zoneSectionResults.length > 0 && (
                    <ResultGroup label={q ? 'Zones' : 'Recent zones'} icon={Hexagon} style={{ marginTop: '6px' }} />
                  )}
                  {zoneSectionResults.map((zone, idx) => {
                    const offset = incidentResults.length;
                    return (
                      <ZoneItem
                        key={zone.id}
                        zone={zone}
                        active={highlightedIndex === offset + idx}
                        saved={savedSet.has(zone.id)}
                        onClick={() => handleSelect({ type: 'zone', data: zone })}
                        query={query}
                      />
                    );
                  })}

                  {filteredLocations.length > 0 && (
                    <ResultGroup label="Locations" icon={MapPin} style={{ marginTop: '6px' }} />
                  )}
                  {filteredLocations.slice(0, 4).map((loc, idx) => {
                    const offset = incidentResults.length + zoneSectionResults.length;
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

                  {showBridge && (
                    <BridgeItem
                      active={highlightedIndex === flatResults.length - 1}
                      onClick={() => handleSelect({ type: 'bridge' })}
                      title={bridgeTitle}
                      hint={bridgeHint}
                    />
                  )}
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

          {onOpenAdvanced && (
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
              {advancedLabel}
              <ArrowRight size={14} />
            </button>
          )}
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
        @keyframes omnibox-spin-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .omnibox-result-item {
          animation: omnibox-item-in 0.16s ease-out both;
        }
        .omnibox-spin {
          animation: omnibox-spin-rotate 0.9s linear infinite;
        }
      `}</style>
    </div>
  );
}
