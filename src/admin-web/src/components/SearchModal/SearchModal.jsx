import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';
import { Badge } from '@shared/components/Badge.jsx';
import { SEVERITY_SCALE } from '@shared/constants.js';
import { useCategories } from '@shared/hooks/useCategories.js';
import { format } from 'date-fns';

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance', api: 'relevance' },
  { value: 'date_desc', label: 'Date: Newest first', api: 'newest' },
  { value: 'date_asc', label: 'Date: Oldest first', api: 'oldest' },
  { value: 'severity_desc', label: 'Severity: High to Low', api: 'severity_desc' },
  { value: 'severity_asc', label: 'Severity: Low to High', api: 'severity_asc' },
];

const STATUSES = ['all', 'active', 'resolved'];

export default function SearchModal({ initialQuery, isOpen, onClose, onSelectEvent }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialQuery || '');
  const [results, setResults] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pagination
  const [offset, setOffset] = useState(0);
  const limit = 25;

  // Filters
  const [sortBy, setSortBy] = useState('relevance');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { categories, loading: catLoading } = useCategories();

  const searchTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  // Sync query with initialQuery when modal opens/reopens
  useEffect(() => {
    if (isOpen && initialQuery) {
      setQuery(initialQuery);
    }
  }, [isOpen, initialQuery]);

  const handleSelect = useCallback((incident) => {
    onSelectEvent?.(incident);
    onClose?.();
  }, [onSelectEvent, onClose]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Keyboard navigation for result list
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const resultRowRefs = useRef([]);

  useEffect(() => {
    setSelectedIndex(-1);
    resultRowRefs.current = [];
  }, [results]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (results.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => {
          const next = i < results.length - 1 ? i + 1 : 0;
          resultRowRefs.current[next]?.scrollIntoView({ block: 'nearest' });
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => {
          const next = i > 0 ? i - 1 : results.length - 1;
          resultRowRefs.current[next]?.scrollIntoView({ block: 'nearest' });
          return next;
        });
      } else if (e.key === 'Enter') {
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          e.preventDefault();
          handleSelect(results[selectedIndex]);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, results, selectedIndex, handleSelect]);

  const fetchResults = useCallback(
    async (searchQuery, currentOffset = 0) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setTotalCount(0);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const sortApi = SORT_OPTIONS.find((s) => s.value === sortBy)?.api || 'relevance';
        const params = {
          q: searchQuery.trim(),
          limit,
          offset: currentOffset,
          sort: sortApi,
        };
        if (categoryFilter !== 'all') params.categoryId = parseInt(categoryFilter, 10);
        if (severityFilter !== 'all') params.severity = parseInt(severityFilter, 10);
        if (statusFilter !== 'all') params.status = statusFilter;
        if (dateFrom) params.dateFrom = dateFrom;
        if (dateTo) params.dateTo = dateTo;

        const res = await api.searchIncidentsAdvanced(params);

        setResults(res.data.incidents || []);
        setTotalCount(res.data.count || 0);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [sortBy, categoryFilter, severityFilter, statusFilter, dateFrom, dateTo]
  );

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setOffset(0);
      fetchResults(query, 0);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [query, sortBy, categoryFilter, severityFilter, statusFilter, dateFrom, dateTo, fetchResults]);

  const totalPages = Math.ceil(totalCount / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const handlePrevPage = () => {
    if (offset > 0) {
      const newOffset = Math.max(0, offset - limit);
      setOffset(newOffset);
      fetchResults(query, newOffset);
    }
  };

  const handleNextPage = () => {
    if (offset + limit < totalCount) {
      const newOffset = offset + limit;
      setOffset(newOffset);
      fetchResults(query, newOffset);
    }
  };

  // Only sync dateTo to dateFrom when the user has finalized the 'From' selection
  // (onBlur fires after the date picker closes / focus leaves the input).
  // If dateTo already has a value, respect the user's custom range.
  const handleDateFromBlur = () => {
    if (dateFrom && !dateTo) {
      setDateTo(dateFrom);
    }
  };

  const getSeverityColor = (severity) => {
    if (severity >= 5) return '#dc2626';
    if (severity >= 4) return '#f87171';
    if (severity >= 3) return '#fb923c';
    if (severity >= 2) return '#fbbf24';
    return '#4ade80';
  };

  const highlightText = (text, queryText) => {
    if (!queryText || !text) return text;
    const escaped = queryText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === queryText.toLowerCase() ? (
        <mark
          key={i}
          style={{
            background: 'var(--accent-subtle-border)',
            color: 'var(--accent-light)',
            padding: '0 2px',
            borderRadius: '2px',
            fontWeight: 700,
          }}
        >
          {part}
        </mark>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  const selectBase = {
    background: 'var(--bg-input)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    padding: '6px 10px',
    color: 'var(--text-primary)',
    fontSize: '12px',
    outline: 'none',
    cursor: 'pointer',
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'var(--backdrop)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          width: '900px',
          maxWidth: '92vw',
          height: '80vh',
          maxHeight: '700px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 64px var(--backdrop)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with search */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '18px' }}>🔍</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search incidents across all time..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '16px',
                fontWeight: 600,
                outline: 'none',
                fontFamily: 'var(--font-sans)',
              }}
            />
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '4px 8px',
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          {/* Filters bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={selectBase}>
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={selectBase}
              disabled={catLoading}
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.domain_name} › {c.name}
                </option>
              ))}
            </select>

            <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} style={selectBase}>
              <option value="all">All Severities</option>
              {SEVERITY_SCALE.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.value} — {s.label}
                </option>
              ))}
            </select>

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectBase}>
              <option value="all">All Statuses</option>
              {STATUSES.filter((s) => s !== 'all').map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {/* Date range filters */}
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              onBlur={handleDateFromBlur}
              placeholder="From"
              style={{
                ...selectBase,
                fontFamily: 'var(--font-mono)',
                width: '130px',
              }}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>→</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To"
              style={{
                ...selectBase,
                fontFamily: 'var(--font-mono)',
                width: '130px',
              }}
            />

            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  padding: '2px 6px',
                }}
              >
                Clear dates
              </button>
            )}

            {totalCount > 0 && (
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  fontWeight: 500,
                }}
              >
                {totalCount} result{totalCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Results area */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0' }}>
          {loading && results.length === 0 && (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  border: '2px solid var(--border-subtle)',
                  borderTopColor: 'var(--accent-light)',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  margin: '0 auto 16px',
                }}
              />
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Searching across all incidents...</p>
            </div>
          )}

          {error && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--danger)', fontSize: '14px' }}>
              {error}
            </div>
          )}

          {!loading && !error && results.length === 0 && query.trim() && (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginBottom: '8px' }}>
                No incidents found matching "{query}"
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', opacity: 0.7 }}>
                Try different keywords or clear filters
              </p>
            </div>
          )}

          {!loading && !error && results.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={thStyle}>Title</th>
                  <th style={{ ...thStyle, width: '110px' }}>Category</th>
                  <th style={{ ...thStyle, width: '60px' }}>Sev</th>
                  <th style={{ ...thStyle, width: '90px' }}>Status</th>
                  <th style={{ ...thStyle, width: '120px' }}>Start Date</th>
                  <th style={{ ...thStyle, width: '140px' }}>Location</th>
                </tr>
              </thead>
              <tbody>
                {results.map((incident, idx) => {
                  const catColor = incident.domain_color;
                  const dateStr = incident.start_date
                    ? format(new Date(incident.start_date), 'MMM dd, yyyy')
                    : '';
                  const isSelected = idx === selectedIndex;

                  return (
                    <tr
                      key={incident.id}
                      ref={(el) => (resultRowRefs.current[idx] = el)}
                      onClick={() => handleSelect(incident)}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        transition: 'background 0.12s ease',
                        background: isSelected ? 'var(--bg-hover)' : 'transparent',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = isSelected ? 'var(--bg-hover)' : 'transparent')}
                    >
                      <td style={tdStyle}>
                        <div
                          style={{
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            marginBottom: '3px',
                          }}
                        >
                          {highlightText(incident.title, query)}
                        </div>
                        {incident.description && (
                          <div
                            style={{
                              fontSize: '11px',
                              color: 'var(--text-muted)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '300px',
                            }}
                          >
                            {incident.description}
                          </div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <Badge
                          color={incident.domain_color}
                          style={{
                            fontSize: '10px',
                            padding: '2px 8px',
                          }}
                        >
                          {incident.domain_name}
                        </Badge>
                      </td>
                      <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        <span style={{ color: getSeverityColor(incident.severity), fontWeight: 700 }}>
                          {incident.severity}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <Badge status={incident.status}>{incident.status}</Badge>
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          color: 'var(--text-muted)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12px',
                        }}
                      >
                        {dateStr}
                      </td>
                      <td style={tdStyle}>
                        {incident.location_context && (
                          <div
                            style={{
                              fontSize: '12px',
                              color: 'var(--text-secondary)',
                              marginBottom: '2px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '160px',
                            }}
                          >
                            {incident.location_context}
                          </div>
                        )}
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {parseFloat(incident.latitude ?? 0).toFixed(3)},{' '}
                          {parseFloat(incident.longitude ?? 0).toFixed(3)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination footer */}
        {totalCount > 0 && (
          <div
            style={{
              padding: '14px 24px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => {
                onClose?.();
                navigate('/search');
              }}
              style={{
                fontSize: '12px',
                color: 'var(--accent-light)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Open advanced search →
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handlePrevPage}
                disabled={offset === 0}
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: offset === 0 ? 'var(--bg-deep)' : 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: offset === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
                  cursor: offset === 0 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                ← Previous
              </button>
              <button
                onClick={handleNextPage}
                disabled={offset + limit >= totalCount}
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: offset + limit >= totalCount ? 'var(--bg-deep)' : 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: offset + limit >= totalCount ? 'var(--text-muted)' : 'var(--text-primary)',
                  cursor: offset + limit >= totalCount ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const thStyle = {
  padding: '12px 14px',
  color: 'var(--text-muted)',
  fontWeight: 600,
  fontSize: '10px',
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  textAlign: 'left',
  background: 'var(--bg-deep)',
  position: 'sticky',
  top: 0,
};

const tdStyle = {
  padding: '12px 14px',
  verticalAlign: 'middle',
};
