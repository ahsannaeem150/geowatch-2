import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../services/api.js';
import { Badge } from '@shared/components/Badge.jsx';
import { CATEGORY_LABELS, CATEGORY_COLORS, SEVERITY_SCALE } from '@shared/constants.js';
import { format } from 'date-fns';

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'date_desc', label: 'Date: Newest first' },
  { value: 'date_asc', label: 'Date: Oldest first' },
  { value: 'severity_desc', label: 'Severity: High to Low' },
  { value: 'severity_asc', label: 'Severity: Low to High' },
];

const CATEGORIES = ['all', 'conflict', 'protest', 'disaster', 'diplomacy', 'humanitarian', 'other'];
const STATUSES = ['all', 'active', 'resolved'];

export default function SearchModal({ initialQuery, isOpen, onClose, onSelectEvent }) {
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

  const searchTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  // Sync query with initialQuery when modal opens/reopens
  useEffect(() => {
    if (isOpen && initialQuery) {
      setQuery(initialQuery);
    }
  }, [isOpen, initialQuery]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

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
        const params = {
          q: searchQuery.trim(),
          limit,
          offset: currentOffset,
        };
        if (categoryFilter !== 'all') params.category = categoryFilter;
        if (severityFilter !== 'all') params.severity = parseInt(severityFilter, 10);
        if (statusFilter !== 'all') params.status = statusFilter;
        if (dateFrom) params.dateFrom = dateFrom;
        if (dateTo) params.dateTo = dateTo;

        const res = await api.searchEvents(params);

        // Client-side sort for options not supported by backend
        let events = res.data.events;
        if (sortBy === 'date_desc') {
          events = events.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
        } else if (sortBy === 'date_asc') {
          events = events.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
        } else if (sortBy === 'severity_desc') {
          events = events.sort((a, b) => b.severity - a.severity);
        } else if (sortBy === 'severity_asc') {
          events = events.sort((a, b) => a.severity - b.severity);
        }
        // relevance is already sorted by backend

        setResults(events);
        setTotalCount(res.data.count);
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

  const handleSelect = (event) => {
    onSelectEvent?.(event);
    onClose?.();
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
    if (severity >= 4) return '#ff4757';
    if (severity >= 3) return '#ffa502';
    if (severity >= 2) return '#1e90ff';
    return '#26de81';
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
            background: 'rgba(0, 212, 255, 0.2)',
            color: 'var(--accent-cyan)',
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
        background: 'rgba(0, 0, 0, 0.7)',
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
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6)',
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
              placeholder="Search events across all time..."
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

            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={selectBase}>
              <option value="all">All Categories</option>
              {CATEGORIES.filter((c) => c !== 'all').map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
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
                  borderTopColor: 'var(--accent-cyan)',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  margin: '0 auto 16px',
                }}
              />
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Searching across all events...</p>
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
                No events found matching "{query}"
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
                {results.map((event) => {
                  const catColor = CATEGORY_COLORS[event.category];
                  const dateStr = event.start_date
                    ? format(new Date(event.start_date), 'MMM dd, yyyy')
                    : '';

                  return (
                    <tr
                      key={event.id}
                      onClick={() => handleSelect(event)}
                      style={{
                        borderBottom: '1px solid rgba(42, 46, 59, 0.4)',
                        cursor: 'pointer',
                        transition: 'background 0.12s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={tdStyle}>
                        <div
                          style={{
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            marginBottom: '3px',
                          }}
                        >
                          {highlightText(event.title, query)}
                        </div>
                        {event.description && (
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
                            {event.description}
                          </div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <Badge
                          category={event.category}
                          style={{
                            fontSize: '10px',
                            padding: '2px 8px',
                            background: `${catColor}18`,
                            borderColor: `${catColor}40`,
                            color: catColor,
                          }}
                        >
                          {CATEGORY_LABELS[event.category]}
                        </Badge>
                      </td>
                      <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        <span style={{ color: getSeverityColor(event.severity), fontWeight: 700 }}>
                          {event.severity}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <Badge status={event.status}>{event.status}</Badge>
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
                      <td
                        style={{
                          ...tdStyle,
                          color: 'var(--text-muted)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11px',
                        }}
                      >
                        {parseFloat(event.latitude ?? 0).toFixed(3)},{' '}
                        {parseFloat(event.longitude ?? 0).toFixed(3)}
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
