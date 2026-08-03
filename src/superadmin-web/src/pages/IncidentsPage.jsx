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
  Loader2,
  Map as MapIcon,
  MapPin,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { searchIncidentsAdvanced, resolveIncident, deleteIncident } from '../services/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Badge } from '@shared/components/Badge.jsx';
import { SeverityBadge } from '@shared/components/SeverityBadge.jsx';
import { ConfirmDialog } from '@shared/components/ConfirmDialog.jsx';
import CategoryMultiSelect from '@shared/components/CategoryMultiSelect.jsx';
import { useCategories } from '@shared/hooks/useCategories.js';
import { useTheme } from '@shared/useTheme.js';
import { getBadgeColors } from '@shared/utils/themeColors.js';
import { SEVERITY_SCALE, VERIFICATION_CONFIG } from '@shared/constants.js';
import TableDropdown from '../components/TableUI/TableDropdown.jsx';
import TableDateFilter, { ALL_TIME_FILTER, getDateFilterLabel } from '../components/TableUI/TableDateFilter.jsx';
import { buildReturnMapUrl } from '../utils/returnView.js';
import '../components/TableUI/table-ui.css';
import './IncidentsPage.css';
import './DirectoryPages.css';

const PAGE_SIZE = 25;

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'severity_desc', label: 'Severity ↓' },
  { value: 'severity_asc', label: 'Severity ↑' },
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

export default function IncidentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { categories } = useCategories();

  const [incidents, setIncidents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [dateFilter, setDateFilter] = useState(ALL_TIME_FILTER);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [categorySlugs, setCategorySlugs] = useState([]);
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
    searchIncidentsAdvanced({
      q: query || undefined,
      geometryType: 'point',
      dateFrom: dateFilter.from || undefined,
      dateTo: dateFilter.to || undefined,
      categorySlugs: categorySlugs.length > 0 ? categorySlugs : undefined,
      status: status || undefined,
      verificationStatus: verification || undefined,
      severity: severity ? Number(severity) : undefined,
      sort,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    })
      .then((data) => {
        if (seq !== requestSeq.current) return;
        setIncidents(data?.incidents || []);
        setTotal(data?.count ?? 0);
      })
      .catch((err) => {
        if (seq !== requestSeq.current) return;
        setError(err.message || 'Failed to load incidents');
        setIncidents([]);
        setTotal(0);
      })
      .finally(() => {
        if (seq !== requestSeq.current) return;
        setLoading(false);
      });
  }, [query, dateFilter, categorySlugs, status, verification, severity, sort, page, refreshKey]);

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
    setCategorySlugs([]);
    setStatus('');
    setVerification('');
    setSeverity('');
    setPage(0);
  };

  const hasActiveFilters = !!(
    dateFilter.preset !== 'all' ||
    query ||
    categorySlugs.length > 0 ||
    status ||
    verification ||
    severity
  );

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
    categorySlugs.forEach((slug) => {
      const cat = categories.find((c) => c.slug === slug);
      chips.push({
        id: `category-${slug}`,
        label: cat?.name || slug,
        color: cat?.domain_color,
        onRemove: () => { setCategorySlugs((prev) => prev.filter((s) => s !== slug)); setPage(0); },
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
  }, [dateFilter, query, categorySlugs, status, verification, severity, categories]);

  const handleResolve = async (incident) => {
    setBusyId(incident.id);
    setActionError('');
    try {
      await resolveIncident(incident.id, { resolvedAt: new Date().toISOString() });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setActionError(err.message || 'Failed to resolve incident');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setBusyId(pendingDelete.id);
    setActionError('');
    try {
      await deleteIncident(pendingDelete.id);
      setPendingDelete(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setActionError(err.message || 'Failed to delete incident');
    } finally {
      setBusyId(null);
    }
  };

  const initials = getInitials(user);
  const displayName = getDisplayName(user);

  return (
    <>
      {/* ─── Detail-style top bar: back chip + breadcrumb trail (same
          structure/classes as the incident/zone full-page top bars) ─── */}
      <div className="opt1-topbar">
        <div className="opt1-topbar-inner">
          <div className="opt1-topbar-left">
            <button
              type="button"
              className="opt1-back-link"
              onClick={() => navigate(buildReturnMapUrl())}
              title="Back to the map"
            >
              <ChevronLeft size={14} />
              Map
            </button>
            <nav className="opt1-crumbs" aria-label="Breadcrumb">
              <button
                type="button"
                className="opt1-crumbs__item tui-crumb-link"
                onClick={() => navigate(buildReturnMapUrl())}
              >
                Map
              </button>
              <span className="opt1-crumbs__sep">›</span>
              <span className="opt1-crumbs__title">Incidents</span>
            </nav>
          </div>
        </div>
      </div>

    <div className="tui-page">
      {/* ─── Top bar ─── */}
      <header className="tui-topbar">
        <div className="tui-topbar-left">
          <div className="tui-brand">
            <div className="tui-brand-mark">G</div>
            <span className="tui-brand-name">GeoWatch</span>
            <span className="tui-brand-pill">Incidents</span>
          </div>
          <span className="tui-total">
            <span className="tui-total-num">{loading && incidents.length === 0 ? '—' : total.toLocaleString()}</span>
            {' '}incident{total === 1 ? '' : 's'}
          </span>
        </div>

        <div className="tui-topbar-right">
          <button className="tui-btn" onClick={() => navigate('/superadmin/map')}>
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
              placeholder="Search incidents by title or location…"
              className="tui-search-input"
            />
            {searchInput && (
              <button className="tui-search-clear" onClick={() => setSearchInput('')} title="Clear search">
                <X size={12} />
              </button>
            )}
          </div>

          <CategoryMultiSelect
            categories={categories}
            selectedIds={categorySlugs}
            onChange={(next) => { setCategorySlugs(next); setPage(0); }}
          />

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
              title="Sort incidents"
              align="right"
            />
          </div>
        </div>
      </div>

      {/* ─── Active filter chips ─── */}
      {hasActiveFilters && (
        <div className="tui-chips-bar tui-chips-scroll">
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
              <p className="tui-state-title">Failed to load incidents</p>
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
                <col style={{ width: '220px' }} />
                <col style={{ width: '120px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '115px' }} />
                <col style={{ width: '125px' }} />
                <col style={{ width: '165px' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Incident</th>
                  <th>Domain / Category</th>
                  <th>Severity</th>
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
                      <td>
                        <div className="tui-skel-cell">
                          <div className="tui-skel tui-skel-glyph" style={{ width: '7px', height: '7px' }} />
                          <div className="tui-skel-lines">
                            <div className="tui-skel tui-skel-line" style={{ width: '62%' }} />
                            <div className="tui-skel tui-skel-line tui-skel-line-sub" style={{ width: '40%' }} />
                          </div>
                        </div>
                      </td>
                      <td><div className="tui-skel tui-skel-pill" style={{ width: '88px' }} /></td>
                      <td><div className="tui-skel tui-skel-pill" style={{ width: '64px' }} /></td>
                      <td><div className="tui-skel tui-skel-line" style={{ width: '78px' }} /></td>
                      <td><div className="tui-skel tui-skel-line" style={{ width: '72px' }} /></td>
                      <td><div className="tui-skel tui-skel-line" style={{ width: '96px', marginLeft: 'auto' }} /></td>
                    </tr>
                  ))
                ) : incidents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="tui-cell-state">
                      <div className="tui-state">
                        <MapPin size={26} className="tui-state-icon" />
                        <p className="tui-state-title">
                          {hasActiveFilters ? 'No incidents match these filters' : 'No incidents yet'}
                        </p>
                        <p className="tui-state-sub">
                          {hasActiveFilters
                            ? 'Try widening the search or clearing some filters.'
                            : 'Create an incident on the map to see it listed here.'}
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
                  incidents.map((incident) => {
                    const categoryLabel = incident.category_name || incident.domain_name || null;
                    const busy = busyId === incident.id;
                    return (
                      <tr
                        key={incident.id}
                        className="tui-row"
                        onClick={() => navigate(`/superadmin/incident/${incident.id}`)}
                      >
                        <td>
                          <div className="tui-tcell">
                            <MapPin
                              size={15}
                              className="tui-tcell-glyph"
                              style={{ color: incident.domain_color || 'var(--text-muted)' }}
                            />
                            <div className="tui-tcell-text">
                              <span className="tui-tcell-title">{incident.title}</span>
                              {incident.location_context && (
                                <span className="tui-tcell-sub">{incident.location_context}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          {categoryLabel ? (
                            <div
                              className="ip-domcell"
                              title={
                                incident.domain_name && incident.category_name
                                  ? `${incident.domain_name} › ${incident.category_name}`
                                  : categoryLabel
                              }
                            >
                              <span
                                className="ip-domdot"
                                style={{ background: incident.domain_color || '#6b7280' }}
                              />
                              <div className="ip-domcell-text">
                                <span className="ip-domcat">{categoryLabel}</span>
                                {incident.category_name && incident.domain_name && (
                                  <span className="ip-domname">{incident.domain_name}</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="tui-dash">—</span>
                          )}
                        </td>
                        <td>
                          <SeverityBadge level={incident.severity} size="sm" />
                        </td>
                        <td>
                          <Badge status={incident.status} size="sm">{incident.status}</Badge>
                        </td>
                        <td className="tui-muted-nowrap" title={incident.created_at ? new Date(incident.created_at).toLocaleString() : ''}>
                          {formatDate(incident.created_at)}
                        </td>
                        <td className="tui-muted-nowrap" title={incident.updated_at ? new Date(incident.updated_at).toLocaleString() : ''}>
                          {formatRelative(incident.updated_at || incident.created_at)}
                        </td>
                        <td className="tui-cell-actions" onClick={(e) => e.stopPropagation()}>
                          <div className="tui-actions">
                            {incident.status === 'active' && (
                              <button
                                className="tui-icon-btn tui-icon-btn-resolve"
                                title="Mark resolved"
                                disabled={busy}
                                onClick={() => handleResolve(incident)}
                              >
                                {busy ? <Loader2 size={14} className="tui-spin" /> : <CheckCircle2 size={14} />}
                              </button>
                            )}
                            <button
                              className="tui-icon-btn"
                              title="View on map"
                              onClick={() => navigate(`/superadmin/map?incident=${incident.id}`)}
                            >
                              <MapPin size={14} />
                            </button>
                            <button
                              className="tui-icon-btn"
                              title="Full details"
                              onClick={() => navigate(`/superadmin/incident/${incident.id}`)}
                            >
                              <ArrowUpRight size={14} />
                            </button>
                            <button
                              className="tui-icon-btn tui-icon-btn-danger"
                              title="Delete incident"
                              disabled={busy}
                              onClick={() => setPendingDelete(incident)}
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
                : `${page * PAGE_SIZE + 1}–${Math.min(total, (page + 1) * PAGE_SIZE)} of ${total.toLocaleString()} incidents`}
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
        title="Delete incident"
        message={`Delete "${pendingDelete?.title || 'this incident'}"? It will be moved to the recycle bin.`}
        confirmText="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
    </>
  );
}
