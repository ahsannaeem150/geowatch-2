import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  ArrowLeft,
  Download,
  Bookmark,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Calendar,
  ArrowUpDown,
  Save,
  Clock,
  MapPin,
  Star,
  Navigation,
  Trash2,
  Filter,
  PanelLeft,
  PanelRight,
  Check,
  ChevronRight,
  Tags,
  CheckCircle2,
  Shield,
  FileText,
  Hexagon,
  Settings2,
} from 'lucide-react';
import { SeverityBadge } from '@shared/components/SeverityBadge.jsx';
import { Badge } from '@shared/components/Badge.jsx';
import { generateInitialData, timeAgo } from './dummyData.js';
import { SEVERITY_SCALE } from '@shared/constants.js';
import { getSeverityBadgeColors, getDomainColor, getIncidentDomainColor, getBadgeColors } from '@shared/utils/themeColors.js';
import { useTheme } from '@shared/useTheme.js';
import {
  DOMAINS,
  VERIFICATION_STATUSES,
  SOURCE_TYPES,
  GEOMETRY_TYPES,
} from './taxonomyData.js';
import MapCanvas from '../../components/MapWorkspaceTrial/MapCanvas.jsx';

const STATUSES = ['active', 'resolved'];
const STATUS_META = {
  active: { label: 'Active', status: 'active' },
  resolved: { label: 'Resolved', status: 'resolved' },
};

const SORT_OPTIONS = [
  { key: 'relevance', label: 'Relevance' },
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'severity-desc', label: 'Severity · High to low' },
  { key: 'severity-asc', label: 'Severity · Low to high' },
  { key: 'name', label: 'Name A–Z' },
];

const INITIAL_FILTERS = {
  dateFrom: '',
  dateTo: '',
  domainSlugs: [],
  categoryNames: [],
  severities: [],
  statuses: [],
  verificationStatuses: [],
  sourceTypes: [],
  geometryType: '',
  savedOnly: false,
  inViewport: false,
};

const SAVED_SEARCHES_KEY = 'gw-trial-power-searches';
const INITIAL_VIEWPORT = { north: 39, south: 27, east: 60, west: 40 };

const FILTER_RAIL_WIDTH = 260;
const FILTER_RAIL_COLLAPSED = 44;
const RESULTS_RAIL_WIDTH = 300;
const DETAIL_WIDTH = 630;
const PAGE_SIZE = 25;

const LOCATIONS = [
  { id: 'loc1', name: 'Kabul, Afghanistan', detail: 'Capital city', lat: 34.52, lng: 69.18 },
  { id: 'loc2', name: 'Eastern Province, Iraq', detail: 'Province', lat: 30.05, lng: 47.95 },
  { id: 'loc3', name: 'Damascus, Syria', detail: 'Capital city', lat: 33.51, lng: 36.28 },
  { id: 'loc4', name: 'Red Sea corridor', detail: 'Maritime route', lat: 20.35, lng: 38.5 },
  { id: 'loc5', name: 'Tehran, Iran', detail: 'Capital city', lat: 35.7, lng: 51.4 },
  { id: 'loc6', name: 'Najaf, Iraq', detail: 'City', lat: 31.95, lng: 44.35 },
  { id: 'loc7', name: 'Doha, Qatar', detail: 'Capital city', lat: 25.28, lng: 51.53 },
  { id: 'loc8', name: 'Benghazi, Libya', detail: 'City', lat: 32.11, lng: 20.06 },
];

function formatDateInput(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function PowerSearchTrial() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const baseline = useMemo(() => generateInitialData(Date.now()), []);
  const [incidents] = useState(baseline.incidents);
  const [savedIds, setSavedIds] = useState(baseline.savedIds);
  const [now] = useState(Date.now());
  const [viewport] = useState(INITIAL_VIEWPORT);

  const [scope, setScope] = useState('incidents');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [sortBy, setSortBy] = useState('relevance');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [selectedLocationId, setSelectedLocationId] = useState(null);

  const [filterCollapsed, setFilterCollapsed] = useState(false);
  const [resultsCollapsed, setResultsCollapsed] = useState(false);

  const [savedSearches, setSavedSearches] = useState([]);
  const [saveName, setSaveName] = useState('');
  const [showSavePopover, setShowSavePopover] = useState(false);
  const [showSavedMenu, setShowSavedMenu] = useState(false);

  const savePopoverRef = useRef(null);
  const savedMenuRef = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_SEARCHES_KEY);
      if (raw) setSavedSearches(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    function onClick(e) {
      if (savePopoverRef.current && !savePopoverRef.current.contains(e.target)) setShowSavePopover(false);
      if (savedMenuRef.current && !savedMenuRef.current.contains(e.target)) setShowSavedMenu(false);
    }
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [scope, query, filters, sortBy]);

  const q = query.trim().toLowerCase();

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (q) {
        const hay = `${inc.title} ${inc.location} ${inc.domain} ${inc.categoryName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.dateFrom && inc.createdAt < new Date(filters.dateFrom).getTime()) return false;
      if (filters.dateTo) {
        const end = new Date(filters.dateTo);
        end.setHours(23, 59, 59, 999);
        if (inc.createdAt > end.getTime()) return false;
      }
      if (filters.domainSlugs.length || filters.categoryNames.length) {
        const inDomain = filters.domainSlugs.includes(inc.domainSlug);
        const inCategory = filters.categoryNames.includes(inc.categoryName);
        if (!inDomain && !inCategory) return false;
      }
      if (filters.severities.length && !filters.severities.includes(inc.severity)) return false;
      if (filters.statuses.length && !filters.statuses.includes(inc.status)) return false;
      if (filters.verificationStatuses.length && !filters.verificationStatuses.includes(inc.verificationStatus)) return false;
      if (filters.sourceTypes.length && !filters.sourceTypes.some((st) => inc.sourceTypes?.includes(st))) return false;
      if (filters.geometryType && inc.geometryType !== filters.geometryType) return false;
      if (filters.savedOnly && !savedIds.has(inc.id)) return false;
      if (filters.inViewport) {
        if (inc.lat > viewport.north || inc.lat < viewport.south || inc.lng > viewport.east || inc.lng < viewport.west)
          return false;
      }
      return true;
    });
  }, [incidents, q, filters, savedIds, viewport]);

  const sortedIncidents = useMemo(() => {
    const arr = [...filteredIncidents];
    switch (sortBy) {
      case 'newest':
        return arr.sort((a, b) => b.createdAt - a.createdAt);
      case 'oldest':
        return arr.sort((a, b) => a.createdAt - b.createdAt);
      case 'severity-desc':
        return arr.sort((a, b) => b.severity - a.severity);
      case 'severity-asc':
        return arr.sort((a, b) => a.severity - b.severity);
      case 'name':
        return arr.sort((a, b) => a.title.localeCompare(b.title));
      default:
        return arr.sort((a, b) => {
          let sa = 0;
          let sb = 0;
          if (q) {
            const aTitle = a.title.toLowerCase();
            const bTitle = b.title.toLowerCase();
            const aLoc = `${a.title} ${a.location}`.toLowerCase();
            const bLoc = `${b.title} ${b.location}`.toLowerCase();
            sa += aTitle.startsWith(q) ? 12 : aTitle.includes(q) ? 6 : aLoc.includes(q) ? 3 : 0;
            sb += bTitle.startsWith(q) ? 12 : bTitle.includes(q) ? 6 : bLoc.includes(q) ? 3 : 0;
          }
          sa += a.severity * 3;
          sb += b.severity * 3;
          sa += a.createdAt / 1e10;
          sb += b.createdAt / 1e10;
          return sb - sa;
        });
    }
  }, [filteredIncidents, sortBy, q]);

  const visibleIncidents = useMemo(() => sortedIncidents.slice(0, visibleCount), [sortedIncidents, visibleCount]);
  const hasMoreIncidents = visibleCount < sortedIncidents.length;

  const filteredLocations = useMemo(() => {
    if (!q) return LOCATIONS;
    return LOCATIONS.filter((l) => l.name.toLowerCase().includes(q) || l.detail.toLowerCase().includes(q));
  }, [q]);

  const visibleLocations = useMemo(() => filteredLocations.slice(0, visibleCount), [filteredLocations, visibleCount]);
  const hasMoreLocations = visibleCount < filteredLocations.length;

  const selectedIncident = useMemo(
    () => incidents.find((i) => i.id === selectedIncidentId) || null,
    [incidents, selectedIncidentId]
  );
  const selectedLocation = useMemo(
    () => LOCATIONS.find((l) => l.id === selectedLocationId) || null,
    [selectedLocationId]
  );

  const activeFilterCount = useMemo(() => {
    let count = filters.domainSlugs.length + filters.categoryNames.length + filters.statuses.length;
    count += filters.verificationStatuses.length;
    count += filters.sourceTypes.length;
    if (filters.severities.length) count += 1;
    if (filters.dateFrom || filters.dateTo) count += 1;
    if (filters.geometryType) count += 1;
    if (filters.savedOnly) count += 1;
    if (filters.inViewport) count += 1;
    return count;
  }, [filters]);

  function getDomainState(slug, prev = filters) {
    const domain = DOMAINS.find((d) => d.slug === slug);
    if (!domain) return { total: 0, selected: 0, fully: false, partial: false, none: true };
    const fully = prev.domainSlugs.includes(slug);
    const selectedCats = domain.categories.filter((c) => prev.categoryNames.includes(c)).length;
    const selected = fully ? domain.categories.length : selectedCats;
    return {
      total: domain.categories.length,
      selected,
      fully,
      partial: !fully && selectedCats > 0,
      none: !fully && selectedCats === 0,
    };
  }

  function toggleDomain(slug) {
    setFilters((prev) => {
      const state = getDomainState(slug, prev);
      const domain = DOMAINS.find((d) => d.slug === slug);
      const domainCategories = domain?.categories || [];
      if (state.fully || state.partial) {
        // deselect everything for this domain
        return {
          ...prev,
          domainSlugs: prev.domainSlugs.filter((s) => s !== slug),
          categoryNames: prev.categoryNames.filter((c) => !domainCategories.includes(c)),
        };
      }
      // select all -> represent as domain slug
      return {
        ...prev,
        domainSlugs: [...prev.domainSlugs, slug],
        categoryNames: prev.categoryNames.filter((c) => !domainCategories.includes(c)),
      };
    });
  }

  function toggleCategory(categoryName) {
    setFilters((prev) => {
      const domain = DOMAINS.find((d) => d.categories.includes(categoryName));
      if (!domain) return prev;
      const domainCategories = domain.categories;
      const wasFully = prev.domainSlugs.includes(domain.slug);

      if (wasFully) {
        // remove domain slug and select all except this category
        return {
          ...prev,
          domainSlugs: prev.domainSlugs.filter((s) => s !== domain.slug),
          categoryNames: domainCategories.filter((c) => c !== categoryName),
        };
      }

      const nextCategoryNames = prev.categoryNames.includes(categoryName)
        ? prev.categoryNames.filter((c) => c !== categoryName)
        : [...prev.categoryNames, categoryName];

      // promote to full-domain selection if every category is now selected
      const allSelected = domainCategories.every((c) => nextCategoryNames.includes(c));
      if (allSelected) {
        return {
          ...prev,
          domainSlugs: [...prev.domainSlugs, domain.slug],
          categoryNames: nextCategoryNames.filter((c) => !domainCategories.includes(c)),
        };
      }

      return { ...prev, categoryNames: nextCategoryNames };
    });
  }

  function toggleStatus(status) {
    setFilters((prev) => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter((s) => s !== status)
        : [...prev.statuses, status],
    }));
  }

  function toggleVerification(status) {
    setFilters((prev) => ({
      ...prev,
      verificationStatuses: prev.verificationStatuses.includes(status)
        ? prev.verificationStatuses.filter((s) => s !== status)
        : [...prev.verificationStatuses, status],
    }));
  }

  function toggleSourceType(type) {
    setFilters((prev) => ({
      ...prev,
      sourceTypes: prev.sourceTypes.includes(type)
        ? prev.sourceTypes.filter((t) => t !== type)
        : [...prev.sourceTypes, type],
    }));
  }

  function resetFilters() {
    setFilters(INITIAL_FILTERS);
  }

  function toggleSaved(id) {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectIncident(id) {
    setSelectedIncidentId(id);
    setSelectedLocationId(null);
  }

  function selectLocation(id) {
    setSelectedLocationId(id);
    setSelectedIncidentId(null);
  }

  function clearSelection() {
    setSelectedIncidentId(null);
    setSelectedLocationId(null);
  }

  function saveSearch() {
    const name = saveName.trim() || `Search ${savedSearches.length + 1}`;
    const payload = {
      id: `${Date.now()}`,
      name,
      query,
      filters,
      sortBy,
      scope,
      createdAt: Date.now(),
    };
    const next = [payload, ...savedSearches].slice(0, 20);
    setSavedSearches(next);
    try {
      localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(next));
    } catch {}
    setSaveName('');
    setShowSavePopover(false);
  }

  function applySearch(saved) {
    setQuery(saved.query || '');
    setFilters(saved.filters || INITIAL_FILTERS);
    setSortBy(saved.sortBy || 'relevance');
    setScope(saved.scope || 'incidents');
    setShowSavedMenu(false);
  }

  function deleteSearch(id) {
    const next = savedSearches.filter((s) => s.id !== id);
    setSavedSearches(next);
    try {
      localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(next));
    } catch {}
  }

  function exportResults() {
    const headers = ['id', 'title', 'domain', 'category', 'severity', 'status', 'verification', 'location', 'lat', 'lng', 'createdAt'];
    const rows = sortedIncidents.map((inc) => [
      inc.id,
      `"${String(inc.title).replace(/"/g, '""')}"`,
      inc.domain,
      inc.categoryName,
      inc.severity,
      inc.status,
      inc.verificationStatus,
      `"${String(inc.location).replace(/"/g, '""')}"`,
      inc.lat,
      inc.lng,
      new Date(inc.createdAt).toISOString(),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `geowatch-search-${formatDateInput(Date.now())}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const activeChips = useMemo(() => {
    const chips = [];
    if (filters.dateFrom || filters.dateTo) {
      chips.push({
        id: 'date',
        label: `${filters.dateFrom || '…'} → ${filters.dateTo || '…'}`,
        onRemove: () => setFilters((p) => ({ ...p, dateFrom: '', dateTo: '' })),
      });
    }
    filters.domainSlugs.forEach((slug) => {
      const domain = DOMAINS.find((d) => d.slug === slug);
      chips.push({
        id: `dom-${slug}`,
        label: domain?.name || slug,
        color: getDomainColor(domain, theme),
        onRemove: () => toggleDomain(slug),
      });
    });
    const categoriesByDomain = {};
    filters.categoryNames.forEach((name) => {
      const domain = DOMAINS.find((d) => d.categories.includes(name));
      if (!domain) return;
      if (!categoriesByDomain[domain.slug]) categoriesByDomain[domain.slug] = { domain, names: [] };
      categoriesByDomain[domain.slug].names.push(name);
    });
    Object.values(categoriesByDomain).forEach(({ domain, names }) => {
      chips.push({
        id: `catgrp-${domain.slug}`,
        label: `${domain.name} · ${names.length} categor${names.length === 1 ? 'y' : 'ies'}`,
        color: getDomainColor(domain, theme),
        onRemove: () => {
          setFilters((p) => ({
            ...p,
            categoryNames: p.categoryNames.filter((c) => !domain.categories.includes(c)),
          }));
        },
      });
    });
    if (filters.severities.length) {
      const labels = filters.severities
        .map((s) => SEVERITY_SCALE.find((sev) => sev.value === s)?.label || s)
        .join(', ');
      chips.push({
        id: 'sev',
        label: `Severity: ${labels}`,
        onRemove: () => setFilters((p) => ({ ...p, severities: [] })),
      });
    }
    filters.statuses.forEach((status) => {
      const meta = STATUS_META[status];
      chips.push({
        id: `status-${status}`,
        label: meta?.label || status,
        onRemove: () => toggleStatus(status),
      });
    });
    filters.verificationStatuses.forEach((status) => {
      const meta = VERIFICATION_STATUSES.find((v) => v.value === status);
      chips.push({
        id: `verif-${status}`,
        label: meta?.label || status,
        color: meta?.color,
        onRemove: () => toggleVerification(status),
      });
    });
    filters.sourceTypes.forEach((type) => {
      const meta = SOURCE_TYPES.find((s) => s.value === type);
      chips.push({
        id: `src-${type}`,
        label: meta?.label || type,
        onRemove: () => toggleSourceType(type),
      });
    });
    if (filters.geometryType) {
      const meta = GEOMETRY_TYPES.find((g) => g.value === filters.geometryType);
      chips.push({
        id: 'geom',
        label: meta?.label || filters.geometryType,
        onRemove: () => setFilters((p) => ({ ...p, geometryType: '' })),
      });
    }
    if (filters.savedOnly) {
      chips.push({ id: 'saved', label: 'Saved only', onRemove: () => setFilters((p) => ({ ...p, savedOnly: false })) });
    }
    if (filters.inViewport) {
      chips.push({ id: 'viewport', label: 'Viewport only', onRemove: () => setFilters((p) => ({ ...p, inViewport: false })) });
    }
    return chips;
  }, [filters]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-surface)',
        color: 'var(--text-primary)',
        zIndex: 50,
        height: '100vh',
      }}
    >
      <TopBar
        scope={scope}
        onScopeChange={(next) => {
          setScope(next);
          setSelectedIncidentId(null);
          setSelectedLocationId(null);
        }}
        query={query}
        onQueryChange={setQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
        savedSearches={savedSearches}
        onApplySearch={applySearch}
        onDeleteSearch={deleteSearch}
        onSaveSearch={() => setShowSavePopover(true)}
        showSavePopover={showSavePopover}
        setShowSavePopover={setShowSavePopover}
        showSavedMenu={showSavedMenu}
        setShowSavedMenu={setShowSavedMenu}
        saveName={saveName}
        setSaveName={setSaveName}
        onConfirmSave={saveSearch}
        onExport={exportResults}
        savePopoverRef={savePopoverRef}
        savedMenuRef={savedMenuRef}
        onNavigateBack={() => navigate('/trial/map-workspace-a')}
      />

      {scope === 'incidents' && (
        <ActiveChipsBar activeFilterCount={activeFilterCount} activeChips={activeChips} onReset={resetFilters} />
      )}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        <FilterRail
          scope={scope}
          collapsed={filterCollapsed}
          onToggleCollapse={() => setFilterCollapsed((p) => !p)}
          filters={filters}
          onToggleDomain={toggleDomain}
          onToggleCategory={toggleCategory}
          onToggleStatus={toggleStatus}
          onToggleVerification={toggleVerification}
          onToggleSourceType={toggleSourceType}
          onToggleSeverity={(v) =>
            setFilters((p) => ({
              ...p,
              severities: p.severities.includes(v)
                ? p.severities.filter((s) => s !== v)
                : [...p.severities, v],
            }))
          }
          onSetDateFrom={(v) => setFilters((p) => ({ ...p, dateFrom: v }))}
          onSetDateTo={(v) => setFilters((p) => ({ ...p, dateTo: v }))}
          onSetGeometryType={(v) => setFilters((p) => ({ ...p, geometryType: v }))}
          onToggleSavedOnly={(v) => setFilters((p) => ({ ...p, savedOnly: v }))}
          onToggleViewportOnly={(v) => setFilters((p) => ({ ...p, inViewport: v }))}
          onReset={resetFilters}
        />

        <ResultsRail
          scope={scope}
          collapsed={resultsCollapsed}
          onToggleCollapse={() => setResultsCollapsed((p) => !p)}
          query={query}
          incidents={visibleIncidents}
          totalIncidents={sortedIncidents.length}
          locations={visibleLocations}
          totalLocations={filteredLocations.length}
          hasMore={scope === 'incidents' ? hasMoreIncidents : hasMoreLocations}
          onLoadMore={() => setVisibleCount((c) => c + PAGE_SIZE)}
          savedIds={savedIds}
          now={now}
          selectedIncidentId={selectedIncidentId}
          selectedLocationId={selectedLocationId}
          onSelectIncident={selectIncident}
          onSelectLocation={selectLocation}
          onToggleSaved={toggleSaved}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />

        <MapStage
          scope={scope}
          resultCount={scope === 'incidents' ? sortedIncidents.length : filteredLocations.length}
          selectedIncident={selectedIncident}
          selectedLocation={selectedLocation}
          onClearSelection={clearSelection}
        >
          {selectedIncident && (
            <DetailPanel
              incident={selectedIncident}
              saved={savedIds.has(selectedIncident.id)}
              now={now}
              onClose={clearSelection}
              onToggleSaved={() => toggleSaved(selectedIncident.id)}
            />
          )}
          {selectedLocation && <LocationDetailCard location={selectedLocation} onClose={clearSelection} />}
        </MapStage>
      </div>

      <style>{`
        @keyframes pw-map-marker-pulse {
          0% { box-shadow: 0 0 0 0 currentColor; }
          70% { box-shadow: 0 0 0 12px transparent; }
          100% { box-shadow: 0 0 0 0 transparent; }
        }
        @keyframes pw-detail-slide {
          from { opacity: 0; transform: translateX(16px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .pw-filter-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .pw-filter-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .pw-filter-scroll::-webkit-scrollbar-thumb {
          background: var(--border-hover);
          border-radius: 999px;
        }
        .pw-filter-scroll::-webkit-scrollbar-thumb:hover {
          background: var(--text-muted);
        }
      `}</style>
    </div>
  );
}

function TopBar({
  scope,
  onScopeChange,
  query,
  onQueryChange,
  sortBy,
  onSortChange,
  savedSearches,
  onApplySearch,
  onDeleteSearch,
  onSaveSearch,
  showSavePopover,
  setShowSavePopover,
  showSavedMenu,
  setShowSavedMenu,
  saveName,
  setSaveName,
  onConfirmSave,
  onExport,
  savePopoverRef,
  savedMenuRef,
  onNavigateBack,
}) {
  return (
    <header
      style={{
        flexShrink: 0,
        height: '52px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '0 16px',
      }}
    >
      <button onClick={onNavigateBack} style={iconButtonStyle} title="Back to workspace">
        <ArrowLeft size={15} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '140px' }}>
        <div
          style={{
            width: '26px',
            height: '26px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 700,
            color: 'var(--text-on-accent)',
          }}
        >
          G
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Power Search</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Explore everything</div>
        </div>
      </div>

      <SegmentedControl
        options={[
          { key: 'incidents', label: 'Incidents' },
          { key: 'locations', label: 'Locations' },
        ]}
        value={scope}
        onChange={onScopeChange}
      />

      <div style={{ flex: 1, maxWidth: '480px', position: 'relative' }}>
        <Search size={15} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={scope === 'incidents' ? 'Search incidents…' : 'Search places…'}
          style={{
            width: '100%',
            padding: '8px 34px 8px 36px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontFamily: 'var(--font-sans)',
            outline: 'none',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-light)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-default)')}
        />
        {query && (
          <button
            onClick={() => onQueryChange('')}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '20px',
              height: '20px',
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
            <X size={12} />
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
        {scope === 'incidents' && (
          <div style={{ position: 'relative' }}>
            <ArrowUpDown size={13} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              style={{
                padding: '6px 24px 6px 26px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '11px',
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer',
                appearance: 'none',
              }}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown size={12} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          </div>
        )}

        <div style={{ position: 'relative' }} ref={savedMenuRef}>
          <button onClick={() => setShowSavedMenu((p) => !p)} style={ghostButtonStyle} title="Saved searches">
            <Bookmark size={14} />
            <ChevronDown size={12} />
          </button>
          {showSavedMenu && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                width: '240px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 100,
                padding: '6px',
              }}
            >
              {savedSearches.length === 0 ? (
                <div style={{ padding: '14px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  No saved searches yet.
                </div>
              ) : (
                savedSearches.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 8px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <button
                      onClick={() => onApplySearch(s)}
                      style={{
                        flex: 1,
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {s.name}
                    </button>
                    <button onClick={() => onDeleteSearch(s.id)} style={iconButtonStyle} title="Delete saved search">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }} ref={savePopoverRef}>
          <button onClick={() => setShowSavePopover((p) => !p)} style={ghostButtonStyle} title="Save current search">
            <Save size={14} />
          </button>
          {showSavePopover && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                width: '240px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 100,
                padding: '12px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Name this search
              </div>
              <input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="e.g. Red Sea severe incidents"
                autoFocus
                style={{
                  width: '100%',
                  padding: '7px 9px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  outline: 'none',
                  marginBottom: '10px',
                }}
                onKeyDown={(e) => e.key === 'Enter' && onConfirmSave()}
              />
              <button
                onClick={onConfirmSave}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  background: 'var(--accent)',
                  border: '1px solid var(--accent)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-on-accent)',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Save search
              </button>
            </div>
          )}
        </div>

        <button onClick={onExport} style={ghostButtonStyle} title="Export results as CSV">
          <Download size={14} />
        </button>
      </div>
    </header>
  );
}

function ActiveChipsBar({ activeFilterCount, activeChips, onReset }) {
  const { theme } = useTheme();
  return (
    <div
      style={{
        flexShrink: 0,
        height: '38px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '0 16px',
        borderBottom: '1px solid var(--border-default)',
        background: 'var(--bg-surface)',
        overflowX: 'auto',
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '10px',
          color: 'var(--text-muted)',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          flexShrink: 0,
        }}
      >
        <Filter size={11} />
        Filters
        {activeFilterCount > 0 && (
          <span
            style={{
              minWidth: '16px',
              height: '16px',
              padding: '0 4px',
              borderRadius: '999px',
              background: 'var(--accent-light)',
              color: 'var(--text-on-accent)',
              fontSize: '9px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {activeFilterCount}
          </span>
        )}
      </span>

      {activeChips.length === 0 ? (
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No active filters</span>
      ) : (
        activeChips.map((chip) => {
          const chipColors = chip.color ? getBadgeColors(chip.color, theme) : null;
          const bg = chipColors ? chipColors.background : 'var(--bg-input)';
          const border = chipColors ? chipColors.border.replace('1px solid ', '') : 'var(--border-default)';
          const color = chipColors ? chipColors.color : 'var(--text-secondary)';
          return (
            <button
              key={chip.id}
              onClick={chip.onRemove}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 8px',
                background: bg,
                border: `1px solid ${border}`,
                borderRadius: 'var(--radius-pill)',
                color: color,
                fontSize: '10px',
                fontWeight: 700,
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--danger-light)';
                e.currentTarget.style.color = 'var(--danger-light)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = border;
                e.currentTarget.style.color = color;
              }}
            >
              {chip.label}
              <X size={10} />
            </button>
          );
        })
      )}

      {activeFilterCount > 0 && (
        <button
          onClick={onReset}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            background: 'transparent',
            border: '1px solid transparent',
            borderRadius: 'var(--radius-pill)',
            color: 'var(--text-muted)',
            fontSize: '10px',
            fontWeight: 700,
            cursor: 'pointer',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--danger-light)';
            e.currentTarget.style.background = 'var(--alert-error-bg)';
            e.currentTarget.style.borderColor = 'var(--alert-error-border)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'transparent';
          }}
        >
          <RotateCcw size={10} />
          Reset
        </button>
      )}
    </div>
  );
}

function FilterRail({
  scope,
  collapsed,
  onToggleCollapse,
  filters,
  onToggleDomain,
  onToggleCategory,
  onToggleStatus,
  onToggleVerification,
  onToggleSourceType,
  onToggleSeverity,
  onSetDateFrom,
  onSetDateTo,
  onSetGeometryType,
  onToggleSavedOnly,
  onToggleViewportOnly,
  onReset,
}) {
  const { theme } = useTheme();
  const [expandedDomains, setExpandedDomains] = useState(new Set());

  const toggleExpandDomain = (slug) => {
    setExpandedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const getDomainState = (domain) => {
    const fully = filters.domainSlugs.includes(domain.slug);
    const selectedCats = domain.categories.filter((c) => filters.categoryNames.includes(c)).length;
    return {
      total: domain.categories.length,
      selected: fully ? domain.categories.length : selectedCats,
      fully,
      partial: !fully && selectedCats > 0,
      none: !fully && selectedCats === 0,
    };
  };

  const activeDomainFilterCount =
    filters.domainSlugs.length + filters.categoryNames.length;

  return (
    <aside
      style={{
        width: collapsed ? FILTER_RAIL_COLLAPSED : FILTER_RAIL_WIDTH,
        flexShrink: 0,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-default)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
        overflow: 'hidden',
        minHeight: 0,
      }}
    >
      <div
        style={{
          height: '46px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: collapsed ? '0 12px' : '0 14px',
          borderBottom: '1px solid var(--border-default)',
          flexShrink: 0,
        }}
      >
        {!collapsed && (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: 'var(--text-muted)',
            }}
          >
            Filters
            {activeDomainFilterCount > 0 && (
              <span
                style={{
                  minWidth: '16px',
                  height: '16px',
                  padding: '0 4px',
                  borderRadius: '999px',
                  background: 'var(--accent-light)',
                  color: 'var(--text-on-accent)',
                  fontSize: '9px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {activeDomainFilterCount}
              </span>
            )}
          </span>
        )}
        <button onClick={onToggleCollapse} style={iconButtonStyle} title={collapsed ? 'Expand filters' : 'Collapse filters'}>
          {collapsed ? <PanelRight size={15} /> : <PanelLeft size={15} />}
        </button>
      </div>

      {!collapsed && (
        <div
          className="pw-filter-scroll"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {scope === 'incidents' ? (
            <>
              <FilterSection title="Date range" icon={Calendar} defaultOpen>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => onSetDateFrom(e.target.value)}
                    style={smallInputStyle}
                  />
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => onSetDateTo(e.target.value)}
                    style={smallInputStyle}
                  />
                </div>
              </FilterSection>

              <FilterSection title="Domains & Categories" icon={Tags} defaultOpen scrollable>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {DOMAINS.map((domain) => {
                    const state = getDomainState(domain);
                    const expanded = expandedDomains.has(domain.slug);
                    return (
                      <div
                        key={domain.slug}
                        style={{
                          borderRadius: 'var(--radius-sm)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          onClick={() => toggleExpandDomain(domain.slug)}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px',
                            padding: '7px 8px',
                            cursor: 'pointer',
                            borderRadius: 'var(--radius-sm)',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleDomain(domain.slug);
                            }}
                            style={{ display: 'flex', alignItems: 'flex-start', flexShrink: 0, paddingTop: '1px' }}
                          >
                            <IndeterminateCheckbox
                              state={state.fully ? 'full' : state.partial ? 'partial' : 'none'}
                              color={getDomainColor(domain, theme)}
                            />
                          </span>
                          <span
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              background: getDomainColor(domain, theme),
                              flexShrink: 0,
                              marginTop: '3px',
                            }}
                          />
                          <span
                            style={{
                              flex: 1,
                              fontSize: '11px',
                              fontWeight: 600,
                              color: 'var(--text-secondary)',
                              lineHeight: 1.3,
                            }}
                          >
                            {domain.name}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              color: 'var(--text-muted)',
                              fontWeight: 700,
                              fontFamily: 'var(--font-mono)',
                              marginTop: '2px',
                            }}
                          >
                            {state.selected}/{state.total}
                          </span>
                          <ChevronRight
                            size={12}
                            color="var(--text-muted)"
                            style={{
                              transition: 'transform 0.15s ease',
                              transform: expanded ? 'rotate(90deg)' : 'none',
                              flexShrink: 0,
                              marginTop: '2px',
                            }}
                          />
                        </div>

                        {expanded && (
                          <div
                            style={{
                              marginLeft: '13px',
                              paddingLeft: '10px',
                              borderLeft: `2px solid ${getDomainColor(domain, theme)}30`,
                            }}
                          >
                            <div
                              style={{
                                maxHeight: '200px',
                                overflowY: 'auto',
                                padding: '2px 0',
                              }}
                            >
                              {domain.categories.map((cat) => {
                                const checked = state.fully || filters.categoryNames.includes(cat);
                                return (
                                  <label
                                    key={cat}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      padding: '5px 6px',
                                      cursor: 'pointer',
                                      borderRadius: 'var(--radius-sm)',
                                      transition: 'background 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => onToggleCategory(cat)}
                                      style={{ display: 'none' }}
                                    />
                                    <span
                                      style={{
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '3px',
                                        border: `1.5px solid ${checked ? getDomainColor(domain, theme) : 'var(--border-hover)'}`,
                                        background: checked ? getDomainColor(domain, theme) : 'transparent',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.15s ease',
                                        flexShrink: 0,
                                      }}
                                    >
                                      {checked && <Check size={8} color="var(--text-on-accent)" strokeWidth={3} />}
                                    </span>
                                    <span
                                      style={{
                                        width: '4px',
                                        height: '4px',
                                        borderRadius: '50%',
                                        background: getDomainColor(domain, theme),
                                        opacity: 0.7,
                                        flexShrink: 0,
                                      }}
                                    />
                                    <span
                                      style={{
                                        flex: 1,
                                        fontSize: '10px',
                                        fontWeight: 500,
                                        color: 'var(--text-secondary)',
                                        lineHeight: 1.3,
                                      }}
                                    >
                                      {cat}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </FilterSection>

              <FilterSection title="Severity" icon={Star} defaultOpen>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {SEVERITY_SCALE.map((sev) => {
                    const active = filters.severities.includes(sev.value);
                    const colors = getSeverityBadgeColors(sev.color, theme);
                    return (
                      <label
                        key={sev.value}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '5px 7px',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          background: active ? colors.background : 'transparent',
                          border: `1px solid ${active ? colors.border : 'transparent'}`,
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!active) e.currentTarget.style.background = 'var(--bg-hover)';
                        }}
                        onMouseLeave={(e) => {
                          if (!active) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => onToggleSeverity(sev.value)}
                          style={{ display: 'none' }}
                        />
                        <span
                          style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '3px',
                            border: `1.5px solid ${active ? sev.color : 'var(--border-hover)'}`,
                            background: active ? sev.color : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                            flexShrink: 0,
                          }}
                        >
                          {active && <Check size={8} color="var(--text-on-accent)" strokeWidth={3} />}
                        </span>
                        <span
                          style={{
                            width: '14px',
                            textAlign: 'center',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: active ? colors.color : 'var(--text-secondary)',
                            fontFamily: 'var(--font-mono)',
                            flexShrink: 0,
                          }}
                        >
                          {sev.value}
                        </span>
                        <span
                          style={{
                            flex: 1,
                            fontSize: '11px',
                            fontWeight: 600,
                            color: active ? colors.color : 'var(--text-secondary)',
                          }}
                        >
                          {sev.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </FilterSection>

              <FilterSection title="Status" icon={CheckCircle2} defaultOpen>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {STATUSES.map((status) => {
                    const active = filters.statuses.includes(status);
                    const meta = STATUS_META[status];
                    return (
                      <button
                        key={status}
                        onClick={() => onToggleStatus(status)}
                        style={{
                          padding: '5px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'capitalize',
                          color: active ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                          background: active ? 'var(--accent-light)' : 'var(--bg-input)',
                          border: `1px solid ${active ? 'var(--accent-light)' : 'var(--border-default)'}`,
                          borderRadius: 'var(--radius-pill)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </FilterSection>

              <FilterSection title="Verification" icon={Shield}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {VERIFICATION_STATUSES.map((v) => {
                    const active = filters.verificationStatuses.includes(v.value);
                    const vColors = getBadgeColors(v.color, theme);
                    return (
                      <button
                        key={v.value}
                        onClick={() => onToggleVerification(v.value)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '5px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: active ? vColors.color : 'var(--text-secondary)',
                          background: active ? vColors.background : 'var(--bg-input)',
                          border: active ? vColors.border : '1px solid var(--border-default)',
                          borderRadius: 'var(--radius-pill)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: active ? vColors.color : v.color,
                          }}
                        />
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              </FilterSection>

              <FilterSection title="Source type" icon={FileText}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {SOURCE_TYPES.map((s) => {
                    const active = filters.sourceTypes.includes(s.value);
                    return (
                      <button
                        key={s.value}
                        onClick={() => onToggleSourceType(s.value)}
                        style={{
                          padding: '5px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: active ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                          background: active ? 'var(--accent-light)' : 'var(--bg-input)',
                          border: `1px solid ${active ? 'var(--accent-light)' : 'var(--border-default)'}`,
                          borderRadius: 'var(--radius-pill)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </FilterSection>

              <FilterSection title="Geometry" icon={Hexagon}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {GEOMETRY_TYPES.map((g) => {
                    const active = filters.geometryType === g.value;
                    return (
                      <button
                        key={g.value}
                        onClick={() => onSetGeometryType(active ? '' : g.value)}
                        style={{
                          padding: '5px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: active ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                          background: active ? 'var(--accent-light)' : 'var(--bg-input)',
                          border: `1px solid ${active ? 'var(--accent-light)' : 'var(--border-default)'}`,
                          borderRadius: 'var(--radius-pill)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              </FilterSection>

              <FilterSection title="Options" icon={Settings2} defaultOpen>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <ToggleRow label="Saved only" checked={filters.savedOnly} onChange={onToggleSavedOnly} />
                  <ToggleRow label="Viewport only" checked={filters.inViewport} onChange={onToggleViewportOnly} />
                </div>
              </FilterSection>

              <button onClick={onReset} style={resetButtonStyle}>
                <RotateCcw size={13} />
                Reset all filters
              </button>
            </>
          ) : (
            <div
              style={{
                padding: '12px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-secondary)',
                fontSize: '11px',
                lineHeight: 1.5,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '6px',
                  color: 'var(--text-primary)',
                  fontWeight: 700,
                }}
              >
                <Navigation size={12} />
                Location search
              </div>
              Search places by name or region. Selecting a location centers the map and shows its details.
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
function ResultsRail({
  scope,
  collapsed,
  onToggleCollapse,
  query,
  incidents,
  totalIncidents,
  locations,
  totalLocations,
  hasMore,
  onLoadMore,
  savedIds,
  now,
  selectedIncidentId,
  selectedLocationId,
  onSelectIncident,
  onSelectLocation,
  onToggleSaved,
  sortBy,
  onSortChange,
}) {
  const selectedRef = useRef(null);

  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedIncidentId, selectedLocationId]);

  const count = scope === 'incidents' ? totalIncidents : totalLocations;
  const showing = scope === 'incidents' ? incidents.length : locations.length;

  return (
    <div
      style={{
        width: collapsed ? 0 : RESULTS_RAIL_WIDTH,
        flexShrink: 0,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-default)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'width 0.2s ease',
        minHeight: 0,
      }}
    >
      {!collapsed && (
        <>
          <div
            style={{
              height: '46px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 12px',
              borderBottom: '1px solid var(--border-default)',
              background: 'var(--bg-surface)',
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
              {showing} / {count}
            </span>
            <button onClick={onToggleCollapse} style={iconButtonStyle} title="Hide results">
              <PanelRight size={15} />
            </button>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px' }}>
            {count === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '48px 20px',
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                }}
              >
                <Search size={32} strokeWidth={1.2} style={{ opacity: 0.35, marginBottom: '14px' }} />
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  No {scope} match
                </div>
                <div style={{ fontSize: '11px', marginTop: '6px' }}>
                  {query ? 'Try a different query or adjust filters.' : 'Start typing to search.'}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {scope === 'incidents'
                  ? incidents.map((inc) => (
                      <IncidentCard
                        key={inc.id}
                        ref={inc.id === selectedIncidentId ? selectedRef : null}
                        incident={inc}
                        selected={selectedIncidentId === inc.id}
                        saved={savedIds.has(inc.id)}
                        now={now}
                        onClick={() => onSelectIncident(inc.id)}
                        onToggleSaved={() => onToggleSaved(inc.id)}
                      />
                    ))
                  : locations.map((loc) => (
                      <LocationCard
                        key={loc.id}
                        ref={loc.id === selectedLocationId ? selectedRef : null}
                        location={loc}
                        selected={selectedLocationId === loc.id}
                        onClick={() => onSelectLocation(loc.id)}
                      />
                    ))}

                {hasMore && (
                  <button
                    onClick={onLoadMore}
                    style={{
                      marginTop: '4px',
                      padding: '8px 10px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-secondary)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-light)';
                      e.currentTarget.style.color = 'var(--accent-light)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-default)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    Load more
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const IncidentCard = React.forwardRef(function IncidentCard(
  { incident, selected, saved, now, onClick, onToggleSaved },
  ref
) {
  const { theme } = useTheme();
  const status = STATUS_META[incident.status] || STATUS_META.active;
  const verification = VERIFICATION_STATUSES.find((v) => v.value === incident.verificationStatus) || VERIFICATION_STATUSES[0];
  const sev = SEVERITY_SCALE.find((s) => s.value === incident.severity) || SEVERITY_SCALE[2];
  const sevColors = getSeverityBadgeColors(sev.color, theme);

  const statusDotColor = status.status === 'active' ? 'var(--success)' : 'var(--text-muted)';

  return (
    <div
      ref={ref}
      onClick={onClick}
      style={{
        position: 'relative',
        display: 'flex',
        gap: '8px',
        padding: '9px',
        background: selected ? 'var(--accent-subtle-bg)' : 'var(--bg-input)',
        border: `1px solid ${selected ? 'var(--accent-light)' : 'var(--border-default)'}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.borderColor = 'var(--border-hover)';
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.borderColor = 'var(--border-default)';
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '2px',
          background: selected ? 'var(--accent-light)' : getIncidentDomainColor(incident, theme),
          opacity: selected ? 1 : 0.7,
        }}
      />

      <div style={{ width: '6px', flexShrink: 0 }} />

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.35, wordBreak: 'break-word' }}>
            {incident.title}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSaved();
            }}
            style={{
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              color: saved ? 'var(--warning)' : 'var(--text-muted)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            title={saved ? 'Unsave' : 'Save'}
          >
            <Star size={11} fill={saved ? 'var(--warning)' : 'transparent'} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-muted)' }}>
          <MapPin size={9} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{incident.location}</span>
          <span style={{ margin: '0 3px' }}>·</span>
          <Clock size={9} />
          <span>{timeAgo(incident.createdAt, now)}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: 'var(--text-secondary)',
            }}
          >
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: getIncidentDomainColor(incident, theme), flexShrink: 0 }} />
            {incident.domain}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '1px 5px',
                borderRadius: 'var(--radius-sm)',
                background: sevColors.background,
                border: sevColors.border,
                fontSize: '10px',
                fontWeight: 700,
                color: sevColors.color,
              }}
            >
              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: sevColors.color, flexShrink: 0 }} />
              {sev.value} {sev.label}
            </span>

            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-secondary)' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: statusDotColor, flexShrink: 0 }} />
              {status.label}
            </span>

            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-secondary)' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: verification.color, flexShrink: 0 }} />
              {verification.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

const LocationCard = React.forwardRef(function LocationCard({ location, selected, onClick }, ref) {
  return (
    <div
      ref={ref}
      onClick={onClick}
      style={{
        position: 'relative',
        display: 'flex',
        gap: '8px',
        padding: '10px',
        background: selected ? 'var(--accent-subtle-bg)' : 'var(--bg-input)',
        border: `1px solid ${selected ? 'var(--accent-light)' : 'var(--border-default)'}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.borderColor = 'var(--border-hover)';
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.borderColor = 'var(--border-default)';
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '2px',
          background: selected ? 'var(--accent-light)' : 'var(--info)',
          opacity: selected ? 1 : 0.7,
        }}
      />
      <div style={{ width: '6px', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-default)',
              color: 'var(--info)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Navigation size={10} />
          </div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.35 }}>{location.name}</div>
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{location.detail}</div>
        <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
        </div>
      </div>
    </div>
  );
});

function MapStage({ scope, resultCount, selectedIncident, selectedLocation, onClearSelection, children }) {
  return (
    <div style={{ flex: 1, position: 'relative', minWidth: 0, minHeight: 0, background: 'var(--bg-deep)' }}>
      <MapCanvas label="Search map" hint="Selected results are highlighted" />

      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '5px 10px',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)',
          fontSize: '10px',
          fontWeight: 700,
          color: 'var(--text-secondary)',
          boxShadow: 'var(--shadow-md)',
          pointerEvents: 'none',
        }}
      >
        {scope === 'incidents' ? <MapPin size={11} color="var(--accent-light)" /> : <Navigation size={11} color="var(--info)" />}
        {resultCount} {scope === 'incidents' ? 'incident' + (resultCount !== 1 ? 's' : '') : 'location' + (resultCount !== 1 ? 's' : '')}
      </div>

      {(selectedIncident || selectedLocation) && (() => {
        const markerColor = selectedIncident ? selectedIncident.domainColor || '#888' : '#3b82f6';
        return (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: markerColor,
              color: markerColor,
              boxShadow: `0 0 0 5px ${markerColor}30, 0 0 24px ${markerColor}`,
              animation: 'pw-map-marker-pulse 1.8s ease-out infinite',
            }}
          />
          <span
            style={{
              padding: '4px 8px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              fontSize: '10px',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              boxShadow: 'var(--shadow-md)',
              whiteSpace: 'nowrap',
            }}
          >
            {selectedIncident ? selectedIncident.location : selectedLocation.name}
          </span>
        </div>
        );
      })()}

      {children}
    </div>
  );
}

function DetailPanel({ incident, saved, now, onClose, onToggleSaved }) {
  const status = STATUS_META[incident.status] || STATUS_META.active;
  const verification = VERIFICATION_STATUSES.find((v) => v.value === incident.verificationStatus) || VERIFICATION_STATUSES[0];

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: DETAIL_WIDTH,
        height: '100%',
        background: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        animation: 'pw-detail-slide 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>
          Incident detail
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button onClick={onToggleSaved} style={iconButtonStyle} title={saved ? 'Unsave' : 'Save'}>
            <Star size={13} fill={saved ? 'var(--warning)' : 'transparent'} color={saved ? 'var(--warning)' : 'var(--text-muted)'} />
          </button>
          <button onClick={onClose} style={iconButtonStyle}>
            <X size={13} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <Badge color={incident.domainColor} style={{ padding: '2px 8px', fontSize: '10px' }}>
            {incident.domain}
          </Badge>
          <Badge style={{ padding: '2px 8px', fontSize: '10px', background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
            {incident.categoryName}
          </Badge>
          <span style={{ transform: 'scale(0.88)', transformOrigin: 'left center' }}>
            <SeverityBadge level={incident.severity} />
          </span>
          <Badge status={status.status} style={{ padding: '2px 8px', fontSize: '10px' }}>
            {status.label}
          </Badge>
          <Badge color={verification.color} style={{ padding: '2px 8px', fontSize: '10px' }}>
            {verification.label}
          </Badge>
        </div>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: '10px' }}>
          {incident.title}
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '14px' }}>
          <Clock size={12} />
          {timeAgo(incident.createdAt, now)}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            marginBottom: '14px',
          }}
        >
          <MapPin size={12} color="var(--accent-light)" />
          <span style={{ flex: 1 }}>{incident.location}</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            {incident.lat.toFixed(4)}, {incident.lng.toFixed(4)}
          </span>
        </div>

        <div
          style={{
            padding: '12px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            lineHeight: 1.6,
            marginBottom: '16px',
          }}
        >
          {incident.description}
        </div>

        <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: '8px' }}>
          Sources
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
          {(incident.sourceTypes || []).map((st) => {
            const meta = SOURCE_TYPES.find((s) => s.value === st);
            return (
              <Badge key={st} style={{ padding: '2px 8px', fontSize: '10px', background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
                {meta?.label || st}
              </Badge>
            );
          })}
        </div>

        <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: '8px' }}>
          Media
        </div>
        <div
          style={{
            height: '130px',
            background: 'var(--bg-input)',
            border: '1px dashed var(--border-default)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            fontSize: '11px',
            marginBottom: '16px',
          }}
        >
          Media gallery placeholder
        </div>

        <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: '8px' }}>
          Timeline
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[1, 2, 3].map((n) => (
            <div key={n} style={{ height: '10px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', width: `${60 + n * 15}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LocationDetailCard({ location, onClose }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        width: '260px',
        background: 'var(--bg-input)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 30,
        padding: '14px',
        animation: 'pw-detail-slide 0.2s ease-out',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-default)',
              color: 'var(--info)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Navigation size={14} />
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{location.name}</div>
        </div>
        <button onClick={onClose} style={iconButtonStyle}>
          <X size={12} />
        </button>
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>{location.detail}</div>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        LAT {location.lat.toFixed(4)} · LNG {location.lng.toFixed(4)}
      </div>
    </div>
  );
}

function SegmentedControl({ options, value, onChange }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--bg-input)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        padding: '2px',
      }}
    >
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            style={{
              padding: '5px 12px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: active ? 'var(--accent)' : 'transparent',
              color: active ? 'var(--text-on-accent)' : 'var(--text-muted)',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function FilterSection({ title, icon: Icon, defaultOpen = false, scrollable = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      style={{
        background: 'var(--bg-input)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '9px 11px',
          background: 'transparent',
          border: 'none',
          color: 'var(--text-secondary)',
          fontSize: '10px',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          cursor: 'pointer',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {Icon && <Icon size={11} />}
          {title}
        </span>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && (
        <div
          className={scrollable ? 'pw-filter-scroll' : undefined}
          style={{
            padding: '0 11px 11px',
            ...(scrollable ? { maxHeight: '260px', overflowY: 'auto' } : {}),
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function IndeterminateCheckbox({ state, color }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === 'partial';
  }, [state]);

  const checked = state === 'full';
  return (
    <span
      style={{
        position: 'relative',
        width: '14px',
        height: '14px',
        borderRadius: '3px',
        border: `1.5px solid ${checked || state === 'partial' ? color : 'var(--border-hover)'}`,
        background: checked || state === 'partial' ? color : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s ease',
        flexShrink: 0,
      }}
    >
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        readOnly
        style={{
          position: 'absolute',
          opacity: 0,
          width: '14px',
          height: '14px',
          cursor: 'pointer',
        }}
      />
      {checked && <Check size={9} color="var(--text-on-accent)" strokeWidth={3} />}
    </span>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '7px 9px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
      <span
        style={{
          width: '30px',
          height: '17px',
          borderRadius: '999px',
          background: checked ? 'var(--accent-light)' : 'var(--border-default)',
          position: 'relative',
          transition: 'background 0.15s ease',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '2px',
            left: checked ? '15px' : '2px',
            width: '13px',
            height: '13px',
            borderRadius: '50%',
            background: 'var(--text-on-accent)',
            transition: 'left 0.15s ease',
            boxShadow: 'var(--shadow-sm)',
          }}
        />
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ display: 'none' }} />
    </label>
  );
}

const iconButtonStyle = {
  width: '26px',
  height: '26px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  flexShrink: 0,
};

const ghostButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '4px',
  width: '28px',
  height: '28px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
};

const smallSelectStyle = {
  flex: 1,
  padding: '5px 6px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontSize: '10px',
  fontWeight: 600,
  outline: 'none',
  boxSizing: 'border-box',
  minWidth: 0,
};

const smallInputStyle = {
  width: '100%',
  padding: '5px 6px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontSize: '10px',
  fontFamily: 'var(--font-mono)',
  outline: 'none',
  boxSizing: 'border-box',
};

const resetButtonStyle = {
  marginTop: 'auto',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  padding: '7px 9px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-secondary)',
  fontSize: '11px',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
};
