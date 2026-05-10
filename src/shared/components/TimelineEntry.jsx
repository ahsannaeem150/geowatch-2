import React, { useEffect, useRef } from 'react';
import { format, isToday, isYesterday } from 'date-fns';

export default function TimelineEntry({
  update,
  isLatest,
  isExpanded,
  onToggle,
  isAdmin,
  onEdit,
  onDelete,
}) {
  const embedRef = useRef(null);
  const date = new Date(update.update_date);
  let dateLabel;
  if (isToday(date)) {
    dateLabel = 'Today';
  } else if (isYesterday(date)) {
    dateLabel = 'Yesterday';
  } else {
    dateLabel = format(date, 'MMM d');
  }
  const timeLabel = format(date, 'h:mm a');

  const summaryPreview = update.summary.length > 100
    ? update.summary.slice(0, 100) + '…'
    : update.summary;

  // Force dark theme on Twitter embeds
  const darkEmbedHtml = update.embed_html
    ? update.embed_html.replace(
        /class="twitter-tweet"/g,
        'class="twitter-tweet" data-theme="dark"'
      )
    : null;

  useEffect(() => {
    if (isExpanded && darkEmbedHtml && embedRef.current && window.twttr?.widgets) {
      window.twttr.widgets.load(embedRef.current);
    }
  }, [isExpanded, darkEmbedHtml]);

  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: `1px solid ${isExpanded ? 'var(--border-hover)' : 'var(--border-subtle)'}`,},{
        borderRadius: 'var(--radius-sm)',
        overflow: 'hidden',
        transition: 'border-color 0.15s ease',
      }}
    >
      {/* Collapsed / Header row */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          padding: '12px 14px',
          background: 'none',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {/* Dot */}
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isLatest ? 'var(--accent-light)' : 'var(--border-subtle)',
            boxShadow: isLatest ? '0 0 6px var(--accent-glow-strong)' : 'none',
            marginTop: '5px',
            flexShrink: 0,
          }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Date + Time + Chevron */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              marginBottom: '4px',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {dateLabel} · {timeLabel}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0 }}>
              {isExpanded ? '▲' : '▼'}
            </span>
          </div>

          {/* Summary text */}
          <p
            style={{
              fontSize: '13px',
              color: 'var(--text-primary)',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {isExpanded ? update.summary : summaryPreview}
          </p>
        </div>
      </button>

      {/* Expanded extras */}
      {isExpanded && (
        <div style={{ padding: '0 14px 12px 34px' }}>
          {update.created_by_name && (
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>
              by {update.created_by_name}
            </p>
          )}

          {/* Embedded tweet */}
          {darkEmbedHtml && (
            <div
              ref={embedRef}
              style={{ marginBottom: '12px' }}
              dangerouslySetInnerHTML={{ __html: darkEmbedHtml }}
            />
          )}

          {isAdmin && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.();
                }}
                style={{
                  fontSize: '12px',
                  color: 'var(--accent-light)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.();
                }}
                style={{
                  fontSize: '12px',
                  color: 'var(--danger)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
