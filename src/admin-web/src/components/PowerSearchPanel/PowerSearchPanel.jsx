import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  X,
  ArrowLeft,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Calendar,
  ArrowUpDown,
  Clock,
  MapPin,
  Star,
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
import { SEVERITY_SCALE } from '@shared/constants.js';
import { getSeverityBadgeColors, getDomainColor, getIncidentDomainColor, getBadgeColors } from '@shared/utils/themeColors.js';
import { useTheme } from '@shared/useTheme.js';
import { formatDistanceToNow } from 'date-fns';

const STATUSES = ['active', 'resolved'];
const STATUS_META = {
  active: { label: 'Active', status: 'active' },
  resolved: { label: 'Resolved', status: 'resolved' },
};

const VERIFICATION_STATUSES = [
  { value: 'unverified', label: 'Unverified', color: '#9ca3af' },
  { value: 'verified', label: 'Verified', color: '#22c55e' },
  { value: 'disputed', label: 'Disputed', color: '#f59e0b' },
  { value: 'debunked', label: 'Debunked', color: '#ef4444' },
];

const SOURCE_TYPES = [
  { value: 'x_post', label: 'X Post' },
  { value: 'news_article', label: 'News Article' },
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'admin_note', label: 'Admin Note' },
];

const GEOMETRY_TYPES = [
  { value: 'point', label: 'Point' },
  { value: 'polygon', label: 'Polygon / Zone' },
];

const SORT_OPTIONS = [
  { key: 'relevance', label: 'Relevance', api: 'relevance' },
  { key: 'newest', label: 'Newest first', api: 'newest' },
  { key: 'oldest', label: 'Oldest first', api: 'oldest' },
  { key: 'severity-desc', label: 'Severity · High to low', api: 'severity_desc' },
  { key: 'severity-asc', label: 'Severity · Low to high', api: 'severity_asc' },
  { key: 'name', label: 'Name A–Z', api: 'name_asc' },
];

const FILTER_RAIL_WIDTH = 'var(--admin-ps-filter-width)';
const FILTER_RAIL_COLLAPSED = 'var(--admin-ps-filter-collapsed)';
const RESULTS_RAIL_WIDTH = 'var(--admin-ps-results-width)';

function formatDateInput(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function timeAgoLabel(dateValue) {
  if (!dateValue) return '';
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return '';
  return formatDistanceToNow(d, { addSuffix: true });
}

export default function PowerSearchPanel({
  isOpen,
  onClose,
  query,
  onQueryChange,
  filters,
  onFiltersChange,
  sortBy,
  onSortChange,
  results,
  total,
  loading,
  error,
  hasMore,
  onLoadMore,
  savedIds,
  domains,
  categories,
  onSelectIncident,
  onToggleSaved,
  onResetFilters,
  compactMode,
  filterCollapsed = false,
  onFilterCollapsedChange,
  resultsCollapsed = false,
  onResultsCollapsedChange,
}) {
  const { theme } = useTheme();
  const isFilterControlled = onFilterCollapsedChange !== undefined;
  const isResultsControlled = onResultsCollapsedChange !== undefined;
  const [internalFilterCollapsed, setInternalFilterCollapsed] = useState(false);
  const [internalResultsCollapsed, setInternalResultsCollapsed] = useState(false);

  const filterCollapsedState = isFilterControlled ? filterCollapsed : internalFilterCollapsed;
  const setFilterCollapsedState = isFilterControlled
    ? onFilterCollapsedChange
    : setInternalFilterCollapsed;
  const resultsCollapsedState = isResultsControlled ? resultsCollapsed : internalResultsCollapsed;
  const setResultsCollapsedState = isResultsControlled
    ? onResultsCollapsedChange
    : setInternalResultsCollapsed;

  const savedSet = useMemo(() => (savedIds instanceof Set ? savedIds : new Set(savedIds || [])), [savedIds]);

  function getDomainState(slug, prev = filters) {
    const domain = domains.find((d) => d.slug === slug);
    if (!domain) return { total: 0, selected: 0, fully: false, partial: false, none: true };
    const fully = prev.domainSlugs.includes(slug);
    const domainCategorySlugs = (domain.categories || []).map((c) => c.slug);
    const selectedCats = domainCategorySlugs.filter((s) => prev.categorySlugs.includes(s)).length;
    const selected = fully ? domainCategorySlugs.length : selectedCats;
    return {
      total: domainCategorySlugs.length,
      selected,
      fully,
      partial: !fully && selectedCats > 0,
      none: !fully && selectedCats === 0,
    };
  }

  function updateFilters(next) {
    onFiltersChange?.(next);
  }

  function toggleDomain(slug) {
    const state = getDomainState(slug);
    const domain = domains.find((d) => d.slug === slug);
    const domainCategorySlugs = new Set((domain?.categories || []).map((c) => c.slug));
    if (state.fully || state.partial) {
      updateFilters({
        ...filters,
        domainSlugs: filters.domainSlugs.filter((s) => s !== slug),
        categorySlugs: filters.categorySlugs.filter((s) => !domainCategorySlugs.has(s)),
      });
    } else {
      updateFilters({
        ...filters,
        domainSlugs: [...filters.domainSlugs, slug],
        categorySlugs: filters.categorySlugs.filter((s) => !domainCategorySlugs.has(s)),
      });
    }
  }

  function toggleCategory(categorySlug) {
    const domain = domains.find((d) => (d.categories || []).some((c) => c.slug === categorySlug));
    if (!domain) return;
    const domainCategorySlugs = (domain.categories || []).map((c) => c.slug);
    const wasFully = filters.domainSlugs.includes(domain.slug);

    let nextCategorySlugs;
    if (wasFully) {
      nextCategorySlugs = domainCategorySlugs.filter((s) => s !== categorySlug);
    } else {
      nextCategorySlugs = filters.categorySlugs.includes(categorySlug)
        ? filters.categorySlugs.filter((s) => s !== categorySlug)
        : [...filters.categorySlugs, categorySlug];
    }

    const allSelected = domainCategorySlugs.every((s) => nextCategorySlugs.includes(s));
    if (allSelected) {
      updateFilters({
        ...filters,
        domainSlugs: [...filters.domainSlugs, domain.slug],
        categorySlugs: nextCategorySlugs.filter((s) => !domainCategorySlugs.includes(s)),
      });
      return;
    }

    if (wasFully) {
      updateFilters({
        ...filters,
        domainSlugs: filters.domainSlugs.filter((s) => s !== domain.slug),
        categorySlugs: nextCategorySlugs,
      });
      return;
    }

    updateFilters({ ...filters, categorySlugs: nextCategorySlugs });
  }

  function toggleStatus(status) {
    updateFilters({
      ...filters,
      statuses: filters.statuses.includes(status)
        ? filters.statuses.filter((s) => s !== status)
        : [...filters.statuses, status],
    });
  }

  function toggleVerification(status) {
    updateFilters({
      ...filters,
      verificationStatuses: filters.verificationStatuses.includes(status)
        ? filters.verificationStatuses.filter((s) => s !== status)
        : [...filters.verificationStatuses, status],
    });
  }

  function toggleSourceType(type) {
    updateFilters({
      ...filters,
      sourceTypes: filters.sourceTypes.includes(type)
        ? filters.sourceTypes.filter((t) => t !== type)
        : [...filters.sourceTypes, type],
    });
  }

  function toggleSeverity(v) {
    updateFilters({
      ...filters,
      severities: filters.severities.includes(v)
        ? filters.severities.filter((s) => s !== v)
        : [...filters.severities, v],
    });
  }

  function toggleGeometryType(v) {
    updateFilters({
      ...filters,
      geometryTypes: filters.geometryTypes.includes(v)
        ? filters.geometryTypes.filter((g) => g !== v)
        : [...filters.geometryTypes, v],
    });
  }

  function toggleSavedOnly(v) {
    updateFilters({ ...filters, savedOnly: v });
  }

  function setDateFrom(v) {
    updateFilters({ ...filters, dateFrom: v });
  }

  function setDateTo(v) {
    updateFilters({ ...filters, dateTo: v });
  }

  const activeFilterCount = useMemo(() => {
    let count = filters.domainSlugs.length + filters.categorySlugs.length + filters.statuses.length;
    count += filters.verificationStatuses.length;
    count += filters.sourceTypes.length;
    if (filters.severities.length) count += 1;
    if (filters.dateFrom || filters.dateTo) count += 1;
    if (filters.geometryTypes.length) count += 1;
    if (filters.savedOnly) count += 1;
    return count;
  }, [filters]);

  const activeChips = useMemo(() => {
    const chips = [];
    if (filters.dateFrom || filters.dateTo) {
      chips.push({
        id: 'date',
        label: `${filters.dateFrom || '…'} → ${filters.dateTo || '…'}`,
        onRemove: () => updateFilters({ ...filters, dateFrom: '', dateTo: '' }),
      });
    }
    filters.domainSlugs.forEach((slug) => {
      const domain = domains.find((d) => d.slug === slug);
      chips.push({
        id: `dom-${slug}`,
        label: domain?.name || slug,
        color: getDomainColor(domain, theme),
        onRemove: () => toggleDomain(slug),
      });
    });
    const categoriesByDomain = {};
    filters.categorySlugs.forEach((slug) => {
      const domain = domains.find((d) => (d.categories || []).some((c) => c.slug === slug));
      if (!domain) return;
      if (!categoriesByDomain[domain.slug]) categoriesByDomain[domain.slug] = { domain, slugs: [] };
      categoriesByDomain[domain.slug].slugs.push(slug);
    });
    Object.values(categoriesByDomain).forEach(({ domain, slugs }) => {
      chips.push({
        id: `catgrp-${domain.slug}`,
        label: `${domain.name} · ${slugs.length} categor${slugs.length === 1 ? 'y' : 'ies'}`,
        color: getDomainColor(domain, theme),
        onRemove: () => {
          updateFilters({
            ...filters,
            categorySlugs: filters.categorySlugs.filter((s) => !domain.categories.some((c) => c.slug === s)),
          });
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
        onRemove: () => updateFilters({ ...filters, severities: [] }),
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
    if (filters.geometryTypes.length) {
      const labels = filters.geometryTypes
        .map((g) => GEOMETRY_TYPES.find((gt) => gt.value === g)?.label || g)
        .join(', ');
      chips.push({
        id: 'geom',
        label: `Geometry: ${labels}`,
        onRemove: () => updateFilters({ ...filters, geometryTypes: [] }),
      });
    }
    if (filters.savedOnly) {
      chips.push({ id: 'saved', label: 'Saved only', onRemove: () => updateFilters({ ...filters, savedOnly: false }) });
    }
    return chips;
  }, [filters, domains, theme]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 60,
        pointerEvents: 'none',
      }}
    >
      <div style={{ pointerEvents: 'auto' }}>
        <TopBar
          query={query}
          onQueryChange={onQueryChange}
          onClose={onClose}
          compactMode={compactMode}
        />
      </div>

      <ActiveChipsBar activeFilterCount={activeFilterCount} activeChips={activeChips} onReset={onResetFilters} />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        <FilterRail
          collapsed={filterCollapsedState}
          onToggleCollapse={() => setFilterCollapsedState((p) => !p)}
          filters={filters}
          domains={domains}
          onToggleDomain={toggleDomain}
          onToggleCategory={toggleCategory}
          onToggleStatus={toggleStatus}
          onToggleVerification={toggleVerification}
          onToggleSourceType={toggleSourceType}
          onToggleSeverity={toggleSeverity}
          onSetDateFrom={setDateFrom}
          onSetDateTo={setDateTo}
          onToggleGeometryType={toggleGeometryType}
          onToggleSavedOnly={toggleSavedOnly}
          onReset={onResetFilters}
        />

        <ResultsRail
          collapsed={resultsCollapsedState}
          onToggleCollapse={() => setResultsCollapsedState((p) => !p)}
          query={query}
          incidents={results}
          totalIncidents={total}
          hasMore={hasMore}
          onLoadMore={onLoadMore}
          savedIds={savedSet}
          selectedIncidentId={null}
          onSelectIncident={onSelectIncident}
          onToggleSaved={onToggleSaved}
          loading={loading}
          error={error}
          sortBy={sortBy}
          onSortChange={onSortChange}
        />

        <div style={{ flex: 1, position: 'relative', minWidth: 0, minHeight: 0, background: 'transparent', pointerEvents: 'none' }} />
      </div>

      <style>{`
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

const INITIAL_FILTERS = {
  dateFrom: '',
  dateTo: '',
  domainSlugs: [],
  categorySlugs: [],
  severities: [],
  statuses: [],
  verificationStatuses: [],
  sourceTypes: [],
  geometryTypes: [],
  savedOnly: false,
};

function TopBar({ query, onQueryChange, onClose, compactMode }) {
  return (
    <header
      style={{
        flexShrink: 0,
        height: 'calc(52px * var(--admin-ui-scale))',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex',
        alignItems: 'center',
        gap: 'calc(14px * var(--admin-ui-scale))',
        padding: '0 calc(16px * var(--admin-ui-scale))',
      }}
    >
      <button onClick={onClose} style={iconButtonStyle} title="Back to workspace">
        <ArrowLeft size={15} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(8px * var(--admin-ui-scale))', minWidth: 'calc(140px * var(--admin-ui-scale))' }}>
        <div
          style={{
            width: 'calc(26px * var(--admin-ui-scale))',
            height: 'calc(26px * var(--admin-ui-scale))',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'calc(12px * var(--admin-ui-scale))',
            fontWeight: 700,
            color: 'var(--text-on-accent)',
          }}
        >
          G
        </div>
        <div>
          <div style={{ fontSize: 'calc(13px * var(--admin-ui-scale))', fontWeight: 700, color: 'var(--text-primary)' }}>Power Search</div>
          <div style={{ fontSize: 'calc(10px * var(--admin-ui-scale))', color: 'var(--text-muted)' }}>Explore everything</div>
        </div>
      </div>

      <div style={{ flex: 1, maxWidth: 'calc(480px * var(--admin-ui-scale))', position: 'relative' }}>
        <Search size={15} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search incidents…"
          style={{
            width: '100%',
            padding: 'calc(8px * var(--admin-ui-scale)) calc(34px * var(--admin-ui-scale)) calc(8px * var(--admin-ui-scale)) calc(36px * var(--admin-ui-scale))',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--text-primary)',
            fontSize: 'calc(13px * var(--admin-ui-scale))',
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
              width: 'calc(20px * var(--admin-ui-scale))',
              height: 'calc(20px * var(--admin-ui-scale))',
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

      <div style={{ width: 'calc(1px * var(--admin-ui-scale))' }} />
    </header>
  );
}

function ActiveChipsBar({ activeFilterCount, activeChips, onReset }) {
  const { theme } = useTheme();
  return (
    <div
      style={{
        flexShrink: 0,
        height: 'calc(38px * var(--admin-ui-scale))',
        display: 'flex',
        alignItems: 'center',
        gap: 'calc(10px * var(--admin-ui-scale))',
        padding: '0 calc(16px * var(--admin-ui-scale))',
        borderBottom: '1px solid var(--border-default)',
        background: 'var(--bg-surface)',
        overflowX: 'auto',
        pointerEvents: 'auto',
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'calc(6px * var(--admin-ui-scale))',
          fontSize: 'calc(10px * var(--admin-ui-scale))',
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
              minWidth: 'calc(16px * var(--admin-ui-scale))',
              height: 'calc(16px * var(--admin-ui-scale))',
              padding: '0 calc(4px * var(--admin-ui-scale))',
              borderRadius: '999px',
              background: 'var(--accent-light)',
              color: 'var(--text-on-accent)',
              fontSize: 'calc(9px * var(--admin-ui-scale))',
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
        <span style={{ fontSize: 'calc(11px * var(--admin-ui-scale))', color: 'var(--text-muted)', fontStyle: 'italic' }}>No active filters</span>
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
                gap: 'calc(5px * var(--admin-ui-scale))',
                padding: 'calc(3px * var(--admin-ui-scale)) calc(8px * var(--admin-ui-scale))',
                background: bg,
                border: `1px solid ${border}`,
                borderRadius: 'var(--radius-pill)',
                color: color,
                fontSize: 'calc(10px * var(--admin-ui-scale))',
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
            gap: 'calc(4px * var(--admin-ui-scale))',
            padding: 'calc(3px * var(--admin-ui-scale)) calc(8px * var(--admin-ui-scale))',
            background: 'transparent',
            border: '1px solid transparent',
            borderRadius: 'var(--radius-pill)',
            color: 'var(--text-muted)',
            fontSize: 'calc(10px * var(--admin-ui-scale))',
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
  collapsed,
  onToggleCollapse,
  filters,
  domains,
  onToggleDomain,
  onToggleCategory,
  onToggleStatus,
  onToggleVerification,
  onToggleSourceType,
  onToggleSeverity,
  onSetDateFrom,
  onSetDateTo,
  onToggleGeometryType,
  onToggleSavedOnly,
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
    const selectedCats = domain.categories.filter((c) => filters.categorySlugs.includes(c.slug)).length;
    return {
      total: domain.categories.length,
      selected: fully ? domain.categories.length : selectedCats,
      fully,
      partial: !fully && selectedCats > 0,
      none: !fully && selectedCats === 0,
    };
  };

  const activeDomainFilterCount = filters.domainSlugs.length + filters.categorySlugs.length;

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
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          height: 'calc(46px * var(--admin-ui-scale))',
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
              gap: 'calc(8px * var(--admin-ui-scale))',
              fontSize: 'calc(11px * var(--admin-ui-scale))',
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
                  minWidth: 'calc(16px * var(--admin-ui-scale))',
                  height: 'calc(16px * var(--admin-ui-scale))',
                  padding: '0 calc(4px * var(--admin-ui-scale))',
                  borderRadius: '999px',
                  background: 'var(--accent-light)',
                  color: 'var(--text-on-accent)',
                  fontSize: 'calc(9px * var(--admin-ui-scale))',
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
            padding: 'calc(12px * var(--admin-ui-scale))',
            display: 'flex',
            flexDirection: 'column',
            gap: 'calc(10px * var(--admin-ui-scale))',
          }}
        >
          <FilterSection title="Date range" icon={Calendar} defaultOpen>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(8px * var(--admin-ui-scale))' }}>
              <input type="date" value={filters.dateFrom} onChange={(e) => onSetDateFrom(e.target.value)} style={smallInputStyle} />
              <input type="date" value={filters.dateTo} onChange={(e) => onSetDateTo(e.target.value)} style={smallInputStyle} />
            </div>
          </FilterSection>

          <FilterSection title="Domains & Categories" icon={Tags} defaultOpen scrollable>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(2px * var(--admin-ui-scale))' }}>
              {domains.map((domain) => {
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
                        gap: 'calc(8px * var(--admin-ui-scale))',
                        padding: 'calc(7px * var(--admin-ui-scale)) calc(8px * var(--admin-ui-scale))',
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
                        <IndeterminateCheckbox state={state.fully ? 'full' : state.partial ? 'partial' : 'none'} color={getDomainColor(domain, theme)} />
                      </span>
                      <span
                        style={{
                          width: 'calc(7px * var(--admin-ui-scale))',
                          height: 'calc(7px * var(--admin-ui-scale))',
                          borderRadius: '50%',
                          background: getDomainColor(domain, theme),
                          flexShrink: 0,
                          marginTop: 'calc(3px * var(--admin-ui-scale))',
                        }}
                      />
                      <span
                        style={{
                          flex: 1,
                          fontSize: 'calc(11px * var(--admin-ui-scale))',
                          fontWeight: 600,
                          color: 'var(--text-secondary)',
                          lineHeight: 1.3,
                        }}
                      >
                        {domain.name}
                      </span>
                      <span
                        style={{
                          fontSize: 'calc(10px * var(--admin-ui-scale))',
                          color: 'var(--text-muted)',
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          marginTop: 'calc(2px * var(--admin-ui-scale))',
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
                          marginTop: 'calc(2px * var(--admin-ui-scale))',
                        }}
                      />
                    </div>

                    {expanded && (
                      <div
                        style={{
                          marginLeft: 'calc(13px * var(--admin-ui-scale))',
                          paddingLeft: '10px',
                          borderLeft: `2px solid ${getDomainColor(domain, theme)}30`,
                        }}
                      >
                        <div
                          style={{
                            maxHeight: '200px',
                            overflowY: 'auto',
                            padding: 'calc(2px * var(--admin-ui-scale)) 0',
                          }}
                        >
                          {domain.categories.map((cat) => {
                            const checked = state.fully || filters.categorySlugs.includes(cat.slug);
                            return (
                              <label
                                key={cat.slug}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 'calc(8px * var(--admin-ui-scale))',
                                  padding: 'calc(5px * var(--admin-ui-scale)) calc(6px * var(--admin-ui-scale))',
                                  cursor: 'pointer',
                                  borderRadius: 'var(--radius-sm)',
                                  transition: 'background 0.15s ease',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                              >
                                <input type="checkbox" checked={checked} onChange={() => onToggleCategory(cat.slug)} style={{ display: 'none' }} />
                                <span
                                  style={{
                                    width: 'calc(12px * var(--admin-ui-scale))',
                                    height: 'calc(12px * var(--admin-ui-scale))',
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
                                    width: 'calc(4px * var(--admin-ui-scale))',
                                    height: 'calc(4px * var(--admin-ui-scale))',
                                    borderRadius: '50%',
                                    background: getDomainColor(domain, theme),
                                    opacity: 0.7,
                                    flexShrink: 0,
                                  }}
                                />
                                <span
                                  style={{
                                    flex: 1,
                                    fontSize: 'calc(10px * var(--admin-ui-scale))',
                                    fontWeight: 500,
                                    color: 'var(--text-secondary)',
                                    lineHeight: 1.3,
                                  }}
                                >
                                  {cat.name}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(3px * var(--admin-ui-scale))' }}>
              {SEVERITY_SCALE.map((sev) => {
                const active = filters.severities.includes(sev.value);
                const colors = getSeverityBadgeColors(sev.color, theme);
                return (
                  <label
                    key={sev.value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'calc(8px * var(--admin-ui-scale))',
                      padding: 'calc(5px * var(--admin-ui-scale)) calc(7px * var(--admin-ui-scale))',
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
                    <input type="checkbox" checked={active} onChange={() => onToggleSeverity(sev.value)} style={{ display: 'none' }} />
                    <span
                      style={{
                        width: 'calc(14px * var(--admin-ui-scale))',
                        height: 'calc(14px * var(--admin-ui-scale))',
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
                        width: 'calc(14px * var(--admin-ui-scale))',
                        textAlign: 'center',
                        fontSize: 'calc(11px * var(--admin-ui-scale))',
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
                        fontSize: 'calc(11px * var(--admin-ui-scale))',
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(6px * var(--admin-ui-scale))' }}>
              {STATUSES.map((status) => {
                const active = filters.statuses.includes(status);
                const meta = STATUS_META[status];
                return (
                  <button
                    key={status}
                    onClick={() => onToggleStatus(status)}
                    style={{
                      padding: 'calc(5px * var(--admin-ui-scale)) calc(10px * var(--admin-ui-scale))',
                      fontSize: 'calc(11px * var(--admin-ui-scale))',
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(6px * var(--admin-ui-scale))' }}>
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
                      gap: 'calc(5px * var(--admin-ui-scale))',
                      padding: 'calc(5px * var(--admin-ui-scale)) calc(10px * var(--admin-ui-scale))',
                      fontSize: 'calc(11px * var(--admin-ui-scale))',
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
                        width: 'calc(6px * var(--admin-ui-scale))',
                        height: 'calc(6px * var(--admin-ui-scale))',
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(6px * var(--admin-ui-scale))' }}>
              {SOURCE_TYPES.map((s) => {
                const active = filters.sourceTypes.includes(s.value);
                return (
                  <button
                    key={s.value}
                    onClick={() => onToggleSourceType(s.value)}
                    style={{
                      padding: 'calc(5px * var(--admin-ui-scale)) calc(10px * var(--admin-ui-scale))',
                      fontSize: 'calc(11px * var(--admin-ui-scale))',
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(6px * var(--admin-ui-scale))' }}>
              {GEOMETRY_TYPES.map((g) => {
                const active = filters.geometryTypes.includes(g.value);
                return (
                  <button
                    key={g.value}
                    onClick={() => onToggleGeometryType(g.value)}
                    style={{
                      padding: 'calc(5px * var(--admin-ui-scale)) calc(10px * var(--admin-ui-scale))',
                      fontSize: 'calc(11px * var(--admin-ui-scale))',
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(8px * var(--admin-ui-scale))' }}>
              <ToggleRow label="Saved only" checked={filters.savedOnly} onChange={onToggleSavedOnly} />
            </div>
          </FilterSection>

          <button onClick={onReset} style={resetButtonStyle}>
            <RotateCcw size={13} />
            Reset all filters
          </button>
        </div>
      )}
    </aside>
  );
}

function SortDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const active = SORT_OPTIONS.find((o) => o.key === value) || SORT_OPTIONS[0];
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 'calc(6px * var(--admin-ui-scale))',
          padding: 'calc(5px * var(--admin-ui-scale)) calc(8px * var(--admin-ui-scale))',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-secondary)',
          fontSize: 'calc(11px * var(--admin-ui-scale))',
          fontWeight: 700,
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        <ArrowUpDown size={12} />
        <span style={{ flex: 1, minWidth: 0, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
          {active.label}
        </span>
        <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.15s ease' }} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'var(--bg-input)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 100,
            padding: 'calc(4px * var(--admin-ui-scale))',
          }}
        >
          {SORT_OPTIONS.map((opt) => {
            const selected = opt.key === value;
            return (
              <button
                key={opt.key}
                onClick={() => {
                  onChange(opt.key);
                  setOpen(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'calc(8px * var(--admin-ui-scale))',
                  padding: 'calc(6px * var(--admin-ui-scale)) calc(8px * var(--admin-ui-scale))',
                  background: selected ? 'var(--accent-subtle-bg)' : 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: 'calc(11px * var(--admin-ui-scale))',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  if (!selected) e.currentTarget.style.background = 'var(--bg-hover)';
                }}
                onMouseLeave={(e) => {
                  if (!selected) e.currentTarget.style.background = 'transparent';
                }}
              >
                {opt.label}
                {selected && <Check size={12} color="var(--accent-light)" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ResultsRail({
  collapsed,
  onToggleCollapse,
  query,
  incidents,
  totalIncidents,
  hasMore,
  onLoadMore,
  savedIds,
  selectedIncidentId,
  onSelectIncident,
  onToggleSaved,
  loading,
  error,
  sortBy,
  onSortChange,
}) {
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
        pointerEvents: 'auto',
      }}
    >
      {!collapsed && (
        <>
          <div
            style={{
              height: 'calc(46px * var(--admin-ui-scale))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'calc(8px * var(--admin-ui-scale))',
              padding: '0 calc(12px * var(--admin-ui-scale))',
              borderBottom: '1px solid var(--border-default)',
              background: 'var(--bg-surface)',
            }}
          >
            <SortDropdown value={sortBy} onChange={onSortChange} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(8px * var(--admin-ui-scale))', flexShrink: 0 }}>
              <span style={{ fontSize: 'calc(11px * var(--admin-ui-scale))', fontWeight: 700, color: 'var(--text-secondary)' }}>
                {incidents.length} / {totalIncidents}
              </span>
              <button onClick={onToggleCollapse} style={iconButtonStyle} title="Hide results">
                <PanelRight size={15} />
              </button>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'calc(8px * var(--admin-ui-scale))' }}>
            {!loading && !error && incidents.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 'calc(48px * var(--admin-ui-scale)) calc(20px * var(--admin-ui-scale))',
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                }}
              >
                <Search size={32} strokeWidth={1.2} style={{ opacity: 0.35, marginBottom: 'calc(14px * var(--admin-ui-scale))' }} />
                <div style={{ fontSize: 'calc(13px * var(--admin-ui-scale))', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  No incidents match
                </div>
                <div style={{ fontSize: 'calc(11px * var(--admin-ui-scale))', marginTop: 'calc(6px * var(--admin-ui-scale))' }}>
                  {query ? 'Try a different query or adjust filters.' : 'Start typing to search.'}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(6px * var(--admin-ui-scale))' }}>
                {incidents.map((inc) => (
                  <IncidentCard
                    key={inc.id}
                    incident={inc}
                    selected={selectedIncidentId === inc.id}
                    saved={savedIds.has(inc.id)}
                    onClick={() => onSelectIncident(inc)}
                    onToggleSaved={(e) => onToggleSaved(e, inc.id)}
                  />
                ))}

                {hasMore && (
                  <button
                    onClick={onLoadMore}
                    style={{
                      marginTop: 'calc(4px * var(--admin-ui-scale))',
                      padding: 'calc(8px * var(--admin-ui-scale)) calc(10px * var(--admin-ui-scale))',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-secondary)',
                      fontSize: 'calc(11px * var(--admin-ui-scale))',
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
  { incident, selected, saved, onClick, onToggleSaved },
  ref
) {
  const { theme } = useTheme();
  const status = STATUS_META[incident.status] || STATUS_META.active;
  const verification = VERIFICATION_STATUSES.find((v) => v.value === incident.verification_status) || VERIFICATION_STATUSES[0];
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
        gap: 'calc(8px * var(--admin-ui-scale))',
        padding: 'calc(9px * var(--admin-ui-scale))',
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
          width: 'calc(2px * var(--admin-ui-scale))',
          background: selected ? 'var(--accent-light)' : getIncidentDomainColor(incident, theme),
          opacity: selected ? 1 : 0.7,
        }}
      />

      <div style={{ width: 'calc(6px * var(--admin-ui-scale))', flexShrink: 0 }} />

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'calc(5px * var(--admin-ui-scale))' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'calc(8px * var(--admin-ui-scale))' }}>
          <div style={{ fontSize: 'calc(13px * var(--admin-ui-scale))', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.35, wordBreak: 'break-word' }}>
            {incident.title}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSaved(e);
            }}
            style={{
              width: 'calc(20px * var(--admin-ui-scale))',
              height: 'calc(20px * var(--admin-ui-scale))',
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(4px * var(--admin-ui-scale))', fontSize: 'calc(10px * var(--admin-ui-scale))', color: 'var(--text-muted)' }}>
          <MapPin size={9} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{incident.location_context}</span>
          <span style={{ margin: '0 3px' }}>·</span>
          <Clock size={9} />
          <span>{timeAgoLabel(incident.created_at)}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(4px * var(--admin-ui-scale))' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'calc(4px * var(--admin-ui-scale))',
              fontSize: 'calc(10px * var(--admin-ui-scale))',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: 'var(--text-secondary)',
            }}
          >
            <span style={{ width: 'calc(4px * var(--admin-ui-scale))', height: 'calc(4px * var(--admin-ui-scale))', borderRadius: '50%', background: getIncidentDomainColor(incident, theme), flexShrink: 0 }} />
            {incident.domain_name}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(6px * var(--admin-ui-scale))', flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'calc(4px * var(--admin-ui-scale))',
                padding: 'calc(1px * var(--admin-ui-scale)) calc(5px * var(--admin-ui-scale))',
                borderRadius: 'var(--radius-sm)',
                background: sevColors.background,
                border: sevColors.border,
                fontSize: 'calc(10px * var(--admin-ui-scale))',
                fontWeight: 700,
                color: sevColors.color,
              }}
            >
              <span style={{ width: 'calc(4px * var(--admin-ui-scale))', height: 'calc(4px * var(--admin-ui-scale))', borderRadius: '50%', background: sevColors.color, flexShrink: 0 }} />
              {sev.value} {sev.label}
            </span>

            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'calc(4px * var(--admin-ui-scale))', fontSize: 'calc(10px * var(--admin-ui-scale))', color: 'var(--text-secondary)' }}>
              <span style={{ width: 'calc(5px * var(--admin-ui-scale))', height: 'calc(5px * var(--admin-ui-scale))', borderRadius: '50%', background: statusDotColor, flexShrink: 0 }} />
              {status.label}
            </span>

            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'calc(4px * var(--admin-ui-scale))', fontSize: 'calc(10px * var(--admin-ui-scale))', color: 'var(--text-secondary)' }}>
              <span style={{ width: 'calc(5px * var(--admin-ui-scale))', height: 'calc(5px * var(--admin-ui-scale))', borderRadius: '50%', background: verification.color, flexShrink: 0 }} />
              {verification.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

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
          padding: 'calc(9px * var(--admin-ui-scale)) calc(11px * var(--admin-ui-scale))',
          background: 'transparent',
          border: 'none',
          color: 'var(--text-secondary)',
          fontSize: 'calc(10px * var(--admin-ui-scale))',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          cursor: 'pointer',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 'calc(6px * var(--admin-ui-scale))' }}>
          {Icon && <Icon size={11} />}
          {title}
        </span>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && (
        <div
          className={scrollable ? 'pw-filter-scroll' : undefined}
          style={{
            padding: '0 calc(11px * var(--admin-ui-scale)) calc(11px * var(--admin-ui-scale))',
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
        width: 'calc(14px * var(--admin-ui-scale))',
        height: 'calc(14px * var(--admin-ui-scale))',
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
          width: 'calc(14px * var(--admin-ui-scale))',
          height: 'calc(14px * var(--admin-ui-scale))',
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
        padding: 'calc(7px * var(--admin-ui-scale)) calc(9px * var(--admin-ui-scale))',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: 'calc(11px * var(--admin-ui-scale))', color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
      <span
        style={{
          width: 'calc(30px * var(--admin-ui-scale))',
          height: 'calc(17px * var(--admin-ui-scale))',
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
            width: 'calc(13px * var(--admin-ui-scale))',
            height: 'calc(13px * var(--admin-ui-scale))',
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
  width: 'calc(26px * var(--admin-ui-scale))',
  height: 'calc(26px * var(--admin-ui-scale))',
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
  gap: 'calc(4px * var(--admin-ui-scale))',
  width: 'calc(28px * var(--admin-ui-scale))',
  height: 'calc(28px * var(--admin-ui-scale))',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
};

const smallInputStyle = {
  width: '100%',
  padding: 'calc(5px * var(--admin-ui-scale)) calc(6px * var(--admin-ui-scale))',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontSize: 'calc(10px * var(--admin-ui-scale))',
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
  gap: 'calc(6px * var(--admin-ui-scale))',
  padding: 'calc(7px * var(--admin-ui-scale)) calc(9px * var(--admin-ui-scale))',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-secondary)',
  fontSize: 'calc(11px * var(--admin-ui-scale))',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
};
