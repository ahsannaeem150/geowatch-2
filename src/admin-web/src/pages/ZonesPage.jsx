import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle,
  ArrowUpDown,
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Hexagon,
  Loader2,
  Map as MapIcon,
  MapPin,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Badge } from '@shared/components/Badge.jsx';
import { SeverityBadge } from '@shared/components/SeverityBadge.jsx';
import { ConfirmDialog } from '@shared/components/ConfirmDialog.jsx';
import { useZoneCategories } from '@shared/hooks/useZoneCategories.js';
import { useTheme } from '@shared/useTheme.js';
import { getBadgeColors } from '@shared/utils/themeColors.js';
import { SEVERITY_SCALE, VERIFICATION_CONFIG } from '@shared/constants.js';
import TableDropdown from '../components/TableUI/TableDropdown.jsx';
import TableDateFilter, { ALL_TIME_FILTER, getDateFilterLabel } from '../components/TableUI/TableDateFilter.jsx';
import '../components/TableUI/table-ui.css';

const PAGE_SIZE = 25;

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'area_desc', label: 'Area ↓' },
  { value: 'area_asc', label: 'Area ↑' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'resolved', label: 'Resolved' },
];

const VERIFICATION_OPTIONS = [
  { value: '', label: 'All verifications' },
  ...Object.entries(VERIFICATION_CONFIG).map(([key, cfg]) => ({
    value: key,
    label: cfg.label,
    color: cfg.color,
  })),
];

const SEVERITY_OPTIONS = [
  { value: '', label: 'All severities' },
  ...SEVERITY_SCALE.map((sev) => ({
    value: String(sev.value),
    label: `${sev.value} · ${sev.label}`,
    color: sev.color,
  })),
];

function getInitials(user) {
  const full = user?.fullName || user?.full_name || '';
  if (full) {
    const parts = full.trim().split(/\s+/);
    const first = parts[0]?.[0] || '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return `${first}${last}`.toUpperCase() || 'U';
  }
  const email = user?.email || '';
  return email ? email[0].toUpperCase() : 'U';
}

function getDisplayName(user) {
  return user?.fullName || user?.full_name || user?.email || 'User';
}

function formatAreaKm2(areaSqM) {
  const n = Number(areaSqM);
  if (!Number.isFinite(n) || n <= 0) return null;
  const km2 = n / 1e6;
  if (km2 >= 1000) return km2.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (km2 >= 10) return km2.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return km2.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatRelative(iso) {
  if (!iso) return '—';
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return '—';
  }
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return format(new Date(iso), 'MMM d, yyyy');
  } catch {
    return '—';
  }
}

export default function ZonesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { categories } = useZoneCategories();

  const [zones, setZones] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [dateFilter, setDateFilter] = useState(ALL_TIME_FILTER);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [categoryIds, setCategoryIds] = useState([]);
  const [status, setStatus] = useState('');
  const [verification, setVerification] = useState('');
  const [severity, setSeverity] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(0);

  const [pendingDelete, setPendingDelete] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const requestSeq = useRef(0);

  // Debounce the search box before it hits the API
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(searchInput.trim());
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError('');
    api
      .searchIncidentsAdvanced({
        q: query || undefined,
        geometryType: 'polygon',
        dateFrom: dateFilter.from || undefined,
        dateTo: dateFilter.to || undefined,
        zoneCategoryIds: categoryIds.length > 0 ? categoryIds : undefined,
        status: status || undefined,
        verificationStatus: verification || undefined,
        severity: severity ? Number(severity) : undefined,
        sort,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      })
      .then((res) => {
        if (seq !== requestSeq.current) return;
        setZones(res.data?.incidents || []);
        setTotal(res.data?.count ?? 0);
      })
      .catch((err) => {
        if (seq !== requestSeq.current) return;
        setError(err.message || 'Failed to load zones');
        setZones([]);
        setTotal(0);
      })
      .finally(() => {
        if (seq !== requestSeq.current) return;
        setLoading(false);
      });
  }, [query, dateFilter, categoryIds, status, verification, severity, sort, page, refreshKey]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Clamp the page when the result set shrinks (e.g. after deletes)
  useEffect(() => {
    if (!loading && page > totalPages - 1) {
      setPage(totalPages - 1);
    }
  }, [loading, page, totalPages]);

  const resetFilters = () => {
    setDateFilter(ALL_TIME_FILTER);
    setSearchInput('');
    setQuery('');
    setCategoryIds([]);
    setStatus('');
    setVerification('');
    setSeverity('');
    setPage(0);
  };

  const hasActiveFilters = !!(
    dateFilter.preset !== 'all' ||
    query ||
    categoryIds.length > 0 ||
    status ||
    verification ||
    severity
  );

  const toggleCategory = (id) => {
    setCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setPage(0);
  };

  const activeChips = useMemo(() => {
    const chips = [];
    if (dateFilter.preset !== 'all') {
      chips.push({
        id: 'date',
        label: getDateFilterLabel(dateFilter),
        onRemove: () => { setDateFilter(ALL_TIME_FILTER); setPage(0); },
      });
    }
    if (query) {
      chips.push({
        id: 'q',
        label: `"${query}"`,
        onRemove: () => { setSearchInput(''); setQuery(''); setPage(0); },
      });
    }
    categoryIds.forEach((id) => {
      const cat = categories.find((c) => String(c.id) === id);
      chips.push({
        id: `category-${id}`,
        label: cat?.name || `Category ${id}`,
        color: cat?.color,
        onRemove: () => { setCategoryIds((prev) => prev.filter((x) => x !== id)); setPage(0); },
      });
    });
    if (status) {
      chips.push({
        id: 'status',
        label: `Status: ${status === 'active' ? 'Active' : 'Resolved'}`,
        onRemove: () => { setStatus(''); setPage(0); },
      });
    }
    if (verification) {
      chips.push({
        id: 'verification',
        label: VERIFICATION_CONFIG[verification]?.label || verification,
        color: VERIFICATION_CONFIG[verification]?.color,
        onRemove: () => { setVerification(''); setPage(0); },
      });
    }
    if (severity) {
      const sev = SEVERITY_SCALE.find((s) => s.value === Number(severity));
      chips.push({
        id: 'severity',
        label: `Severity: ${sev?.label || severity}`,
        color: sev?.color,
        onRemove: () => { setSeverity(''); setPage(0); },
      });
    }
    return chips;
  }, [dateFilter, query, categoryIds, status, verification, severity, categories]);

  const handleResolve = async (zone) => {
    setBusyId(zone.id);
    setActionError('');
    try {
      await api.resolveIncident(zone.id, { resolvedAt: new Date().toISOString() });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setActionError(err.message || 'Failed to resolve zone');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setBusyId(pendingDelete.id);
    setActionError('');
    try {
      await api.deleteIncident(pendingDelete.id);
      setPendingDelete(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setActionError(err.message || 'Failed to delete zone');
    } finally {
      setBusyId(null);
    }
  };

  const initials = getInitials(user);
  const displayName = getDisplayName(user);

  return (
    <div className="tui-page">
      {/* ─── Top bar ─── */}
      <header className="tui-topbar">
        <div className="tui-topbar-left">
          <div className="tui-brand">
            <div className="tui-brand-mark">G</div>
            <span className="tui-brand-name">GeoWatch</span>
            <span className="tui-brand-pill">Zones</span>
          </div>
          <span className="tui-total">
            <span className="tui-total-num">{loading && zones.length === 0 ? '—' : total.toLocaleString()}</span>
            {' '}zone{total === 1 ? '' : 's'}
          </span>
        </div>

        <div className="tui-topbar-right">
          <button className="tui-btn" onClick={() => navigate('/')}>
            <MapIcon size={13} />
            View on map
          </button>
          <div className="tui-user" title={user?.email || ''}>
            <span className="tui-user-name">{displayName}</span>
            <div className="tui-avatar">{initials}</div>
          </div>
        </div>
      </header>

      {/* ─── Toolbar ─── */}
      <div className="tui-toolbar">
        <div className="tui-toolbar-row">
          <TableDateFilter
            value={dateFilter}
            onChange={(next) => { setDateFilter(next); setPage(0); }}
          />

          <div className="tui-search">
            <Search size={14} className="tui-search-icon" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search zones by title or location…"
              className="tui-search-input"
            />
            {searchInput && (
              <button className="tui-search-clear" onClick={() => setSearchInput('')} title="Clear search">
                <X size={12} />
              </button>
            )}
          </div>

          <div className="tui-seg">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`tui-seg-btn${status === opt.value ? ' active' : ''}`}
                onClick={() => { setStatus(opt.value); setPage(0); }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <TableDropdown
            value={verification}
            options={VERIFICATION_OPTIONS}
            onChange={(v) => { setVerification(v); setPage(0); }}
            title="Verification status"
          />

          <TableDropdown
            value={severity}
            options={SEVERITY_OPTIONS}
            onChange={(v) => { setSeverity(v); setPage(0); }}
            title="Severity"
          />

          <div className="tui-sort">
            <TableDropdown
              value={sort}
              options={SORT_OPTIONS}
              onChange={(v) => { setSort(v); setPage(0); }}
              icon={<ArrowUpDown size={12} className="tui-sort-icon" />}
              title="Sort zones"
              align="right"
            />
          </div>
        </div>

        <div className="tui-cat-row">
          <button
            className={`tui-cat-chip${categoryIds.length === 0 ? ' active' : ''}`}
            onClick={() => { setCategoryIds([]); setPage(0); }}
          >
            All categories
          </button>
          {categories.map((cat) => {
            const id = String(cat.id);
            const active = categoryIds.includes(id);
            const colors = active ? getBadgeColors(cat.color || '#6b7280', theme) : null;
            return (
              <button
                key={cat.id}
                className={`tui-cat-chip${active ? ' active' : ''}`}
                style={
                  active
                    ? {
                        background: colors.background,
                        borderColor: colors.border.replace('1px solid ', ''),
                        color: colors.color,
                      }
                    : undefined
                }
                onClick={() => toggleCategory(id)}
                title={active ? 'Remove from filter' : 'Add to filter'}
              >
                <span className="tui-cat-dot" style={{ background: cat.color || '#6b7280' }} />
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Active filter chips ─── */}
      {hasActiveFilters && (
        <div className="tui-chips-bar">
          <span className="tui-chips-label">
            <Filter size={11} />
            Filters
            <span className="tui-chips-count">{activeChips.length}</span>
          </span>
          {activeChips.map((chip) => {
            const chipColors = chip.color ? getBadgeColors(chip.color, theme) : null;
            return (
              <button
                key={chip.id}
                className="tui-chip"
                style={
                  chipColors
                    ? {
                        background: chipColors.background,
                        borderColor: chipColors.border.replace('1px solid ', ''),
                        color: chipColors.color,
                      }
                    : undefined
                }
                onClick={chip.onRemove}
                title="Remove filter"
              >
                {chip.label}
                <X size={10} />
              </button>
            );
          })}
          <button className="tui-chip-reset" onClick={resetFilters}>
            <RotateCcw size={10} />
            Reset
          </button>
        </div>
      )}

      {/* ─── Action error banner ─── */}
      {actionError && (
        <div className="tui-banner">
          <AlertTriangle size={13} />
          <span>{actionError}</span>
          <button className="tui-banner-close" onClick={() => setActionError('')}>
            <X size={12} />
          </button>
        </div>
      )}

      {/* ─── Table ─── */}
      <div className="tui-content">
        <div className="tui-table-wrap">
          {error ? (
            <div className="tui-state">
              <AlertTriangle size={26} className="tui-state-icon tui-state-icon-error" />
              <p className="tui-state-title">Failed to load zones</p>
              <p className="tui-state-sub">{error}</p>
              <button className="tui-btn" onClick={() => setRefreshKey((k) => k + 1)}>
                <RotateCcw size={12} />
                Retry
              </button>
            </div>
          ) : (
            <table className="tui-table">
              <colgroup>
                <col />
                <col style={{ width: '150px' }} />
                <col style={{ width: '120px' }} />
                <col style={{ width: '110px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '115px' }} />
                <col style={{ width: '125px' }} />
                <col style={{ width: '165px' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Zone</th>
                  <th>Category</th>
                  <th>Severity</th>
                  <th className="tui-th-num">Area</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Updated</th>
                  <th className="tui-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={`skel-${i}`} className="tui-row-skel">
                      <td>
                        <div className="tui-skel-cell">
                          <div className="tui-skel tui-skel-glyph" />
                          <div className="tui-skel-lines">
                            <div className="tui-skel tui-skel-line" style={{ width: `${55 + (i % 3) * 12}%` }} />
                            <div className="tui-skel tui-skel-line tui-skel-line-sub" style={{ width: `${30 + (i % 4) * 8}%` }} />
                          </div>
                        </div>
                      </td>
                      <td><div className="tui-skel tui-skel-pill" /></td>
                      <td><div className="tui-skel tui-skel-pill" style={{ width: '88px' }} /></td>
                      <td><div className="tui-skel tui-skel-line" style={{ width: '64px', marginLeft: 'auto' }} /></td>
                      <td><div className="tui-skel tui-skel-pill" style={{ width: '64px' }} /></td>
                      <td><div className="tui-skel tui-skel-line" style={{ width: '78px' }} /></td>
                      <td><div className="tui-skel tui-skel-line" style={{ width: '72px' }} /></td>
                      <td><div className="tui-skel tui-skel-line" style={{ width: '96px', marginLeft: 'auto' }} /></td>
                    </tr>
                  ))
                ) : zones.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="tui-cell-state">
                      <div className="tui-state">
                        <Hexagon size={26} className="tui-state-icon" />
                        <p className="tui-state-title">
                          {hasActiveFilters ? 'No zones match these filters' : 'No zones yet'}
                        </p>
                        <p className="tui-state-sub">
                          {hasActiveFilters
                            ? 'Try widening the search or clearing some filters.'
                            : 'Draw a zone on the map to see it listed here.'}
                        </p>
                        {hasActiveFilters && (
                          <button className="tui-btn" onClick={resetFilters}>
                            <RotateCcw size={12} />
                            Reset filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  zones.map((zone) => {
                    const area = formatAreaKm2(zone.area_sq_m);
                    const busy = busyId === zone.id;
                    return (
                      <tr
                        key={zone.id}
                        className="tui-row"
                        onClick={() => navigate(`/zone/${zone.id}`)}
                      >
                        <td>
                          <div className="tui-tcell">
                            <Hexagon
                              size={15}
                              className="tui-tcell-glyph"
                              style={{ color: zone.zone_category_color || 'var(--text-muted)' }}
                            />
                            <div className="tui-tcell-text">
                              <span className="tui-tcell-title">{zone.title}</span>
                              {zone.location_context && (
                                <span className="tui-tcell-sub">{zone.location_context}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          {zone.zone_category_name ? (
                            <Badge color={zone.zone_category_color || '#6366f1'} size="sm" title={zone.zone_category_name}>
                              {zone.zone_category_name}
                            </Badge>
                          ) : (
                            <span className="tui-dash">—</span>
                          )}
                        </td>
                        <td>
                          <SeverityBadge level={zone.severity} size="sm" />
                        </td>
                        <td className="tui-num tui-mono">
                          {area ? (
                            <>
                              {area}
                              <span className="tui-unit"> km²</span>
                            </>
                          ) : (
                            <span className="tui-dash">—</span>
                          )}
                        </td>
                        <td>
                          <Badge status={zone.status} size="sm">{zone.status}</Badge>
                        </td>
                        <td className="tui-muted-nowrap" title={zone.created_at ? new Date(zone.created_at).toLocaleString() : ''}>
                          {formatDate(zone.created_at)}
                        </td>
                        <td className="tui-muted-nowrap" title={zone.updated_at ? new Date(zone.updated_at).toLocaleString() : ''}>
                          {formatRelative(zone.updated_at || zone.created_at)}
                        </td>
                        <td className="tui-cell-actions" onClick={(e) => e.stopPropagation()}>
                          <div className="tui-actions">
                            {zone.status === 'active' && (
                              <button
                                className="tui-icon-btn tui-icon-btn-resolve"
                                title="Mark resolved"
                                disabled={busy}
                                onClick={() => handleResolve(zone)}
                              >
                                {busy ? <Loader2 size={14} className="tui-spin" /> : <CheckCircle2 size={14} />}
                              </button>
                            )}
                            <button
                              className="tui-icon-btn"
                              title="View on map"
                              onClick={() => navigate(`/?zone=${zone.id}`)}
                            >
                              <MapPin size={14} />
                            </button>
                            <button
                              className="tui-icon-btn"
                              title="Full details"
                              onClick={() => navigate(`/zone/${zone.id}`)}
                            >
                              <ArrowUpRight size={14} />
                            </button>
                            <button
                              className="tui-icon-btn tui-icon-btn-danger"
                              title="Delete zone"
                              disabled={busy}
                              onClick={() => setPendingDelete(zone)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* ─── Pagination ─── */}
        {!error && (
          <div className="tui-pagination">
            <span className="tui-page-info">
              {total === 0
                ? 'No results'
                : `${page * PAGE_SIZE + 1}–${Math.min(total, (page + 1) * PAGE_SIZE)} of ${total.toLocaleString()} zones`}
            </span>
            <div className="tui-page-controls">
              <button
                className="tui-icon-btn"
                disabled={page === 0 || loading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                title="Previous page"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="tui-page-num">
                Page {page + 1} / {totalPages}
              </span>
              <button
                className="tui-icon-btn"
                disabled={page >= totalPages - 1 || loading}
                onClick={() => setPage((p) => p + 1)}
                title="Next page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!pendingDelete}
        title="Delete zone"
        message={`Delete "${pendingDelete?.title || 'this zone'}"? It will be moved to the recycle bin.`}
        confirmText="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
