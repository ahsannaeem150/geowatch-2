import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Badge } from '@shared/components/Badge.jsx';
import { CATEGORY_LABELS, CATEGORY_COLORS, SEVERITY_SCALE } from '@shared/constants.js';
import { format } from 'date-fns';

export default function SearchDropdown({
  query,
  results,
  totalCount,
  loading,
  onSelect,
  onViewAll,
  onClose,
  highlightedIndex,
  onHighlightChange,
}) {
  const containerRef = useRef(null);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
      if (!results || results.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        onHighlightChange?.(Math.min((highlightedIndex ?? -1) + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        onHighlightChange?.(Math.max((highlightedIndex ?? 0) - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightedIndex != null && highlightedIndex >= 0 && highlightedIndex < results.length) {
          onSelect?.(results[highlightedIndex]);
        }
      } else if (e.key === 'Escape') {
        onClose?.();
      }
    },
    [results, highlightedIndex, onHighlightChange, onSelect, onClose]
  );

  // Attach keyboard listener to document for global capture
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const getSeverityColor = (severity) => {
    const s = SEVERITY_SCALE.find((x) => x.value === severity);
    if (!s) return 'var(--text-muted)';
    if (severity >= 4) return '#ff4757';
    if (severity >= 3) return '#ffa502';
    if (severity >= 2) return '#1e90ff';
    return '#26de81';
  };

  const highlightText = (text, query) => {
    if (!query || !text) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark
          key={i}
          style={{
            background: 'rgba(0, 212, 255, 0.25)',
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

  if (!query) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 'calc(100% + 6px)',
        left: 0,
        right: 0,
        maxHeight: '420px',
        overflowY: 'auto',
        background: 'rgba(15, 17, 23, 0.97)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        zIndex: 200,
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid rgba(42, 46, 59, 0.5)',
          fontSize: '11px',
          color: 'var(--text-muted)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
        }}
      >
        {loading
          ? 'Searching across all events...'
          : `${totalCount} result${totalCount !== 1 ? 's' : ''} found`}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <span
            style={{
              display: 'inline-block',
              width: '16px',
              height: '16px',
              border: '2px solid var(--border-subtle)',
              borderTopColor: 'var(--accent-cyan)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        </div>
      )}

      {/* Results */}
      {!loading && results.length === 0 && (
        <div
          style={{
            padding: '24px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '13px',
          }}
        >
          No events found matching "{query}"
        </div>
      )}

      {!loading &&
        results.map((event, index) => {
          const isHighlighted = highlightedIndex === index;
          const catColor = CATEGORY_COLORS[event.category];
          const dateStr = event.start_date
            ? format(new Date(event.start_date), 'MMM dd, yyyy')
            : '';

          return (
            <div
              key={event.id}
              onClick={() => onSelect?.(event)}
              onMouseEnter={() => onHighlightChange?.(index)}
              style={{
                padding: '10px 14px',
                borderBottom: '1px solid rgba(42, 46, 59, 0.4)',
                cursor: 'pointer',
                background: isHighlighted ? 'var(--bg-hover)' : 'transparent',
                transition: 'background 0.12s ease',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              {/* Severity dot */}
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: getSeverityColor(event.severity),
                  marginTop: '5px',
                  flexShrink: 0,
                  boxShadow: `0 0 6px ${getSeverityColor(event.severity)}40`,
                }}
              />

              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Line 1: Title */}
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginBottom: '4px',
                  }}
                >
                  {highlightText(event.title, query)}
                </div>
                {/* Line 2: Date · Location context */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    flexWrap: 'wrap',
                  }}
                >
                  <span>{dateStr}</span>
                  {event.location_context && (
                    <>
                      <span style={{ color: 'var(--border-subtle)' }}>·</span>
                      <span>{event.location_context}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Badges column */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: '4px',
                  flexShrink: 0,
                }}
              >
                <Badge
                  category={event.category}
                  style={{
                    fontSize: '9px',
                    padding: '2px 8px',
                    background: `${catColor}18`,
                    borderColor: `${catColor}40`,
                    color: catColor,
                  }}
                >
                  {CATEGORY_LABELS[event.category]}
                </Badge>
                <Badge
                  status={event.status}
                  style={{
                    fontSize: '9px',
                    padding: '2px 8px',
                  }}
                >
                  {event.status}
                </Badge>
              </div>
            </div>
          );
        })}

      {/* View all footer */}
      {!loading && totalCount > 5 && (
        <div
          onClick={() => onViewAll?.()}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 212, 255, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
          style={{
            padding: '10px 12px',
            textAlign: 'center',
            cursor: 'pointer',
            borderTop: '1px solid rgba(42, 46, 59, 0.5)',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--accent-cyan)',
            transition: 'background 0.15s ease',
          }}
        >
          View all {totalCount} results →
        </div>
      )}
    </div>
  );
}
