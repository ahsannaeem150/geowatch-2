import React, { useEffect, useRef, useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';

function isTwitterUrl(url) {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname === 'twitter.com' || hostname === 'www.twitter.com' || hostname === 'x.com' || hostname === 'www.x.com';
  } catch {
    return false;
  }
}

function darkThemeTwitterHtml(html) {
  if (!html) return html;
  return html.replace(/class="twitter-tweet"/g, 'class="twitter-tweet" data-theme="dark"');
}

export default function TimelineEntry({
  update,
  isLatest,
  isExpanded,
  onToggle,
  isAdmin,
  onEdit,
  onDelete,
  isFirst,
  isLast,
  fetchOEmbed,
}) {
  const embedRef = useRef(null);
  const [fetchedHtml, setFetchedHtml] = useState('');
  const [embedLoading, setEmbedLoading] = useState(false);
  const date = new Date(update.update_date);

  let dateLabel;
  if (isToday(date)) {
    dateLabel = 'Today';
  } else if (isYesterday(date)) {
    dateLabel = 'Yesterday';
  } else {
    dateLabel = format(date, 'MMM d, yyyy');
  }
  const timeLabel = format(date, 'h:mm a');

  const summaryPreview = update.summary.length > 140
    ? update.summary.slice(0, 140) + '…'
    : update.summary;

  // Force dark theme on Twitter embeds
  const darkEmbedHtml = update.embed_html
    ? darkThemeTwitterHtml(update.embed_html)
    : fetchedHtml
    ? darkThemeTwitterHtml(fetchedHtml)
    : null;

  useEffect(() => {
    if (isExpanded && darkEmbedHtml && embedRef.current && window.twttr?.widgets) {
      window.twttr.widgets.load(embedRef.current);
    }
  }, [isExpanded, darkEmbedHtml]);

  // Lazy-load oEmbed for Twitter/X URLs when expanded
  useEffect(() => {
    if (!isExpanded || update.embed_html || fetchedHtml || !fetchOEmbed || !update.source_url) return;
    if (!isTwitterUrl(update.source_url)) return;

    let cancelled = false;
    setEmbedLoading(true);
    fetchOEmbed(update.source_url)
      .then((res) => {
        if (cancelled) return;
        setFetchedHtml(res?.html || '');
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setEmbedLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isExpanded, update.embed_html, update.source_url, fetchOEmbed, fetchedHtml]);

  return (
    <div style={{ display: 'flex', position: 'relative' }}>
      {/* ─── Left spine: connector line + dot ─── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '28px',
          flexShrink: 0,
          position: 'relative',
        }}
      >
        {/* Top connector segment (hidden for first item) */}
        {!isFirst && (
          <div
            style={{
              width: '2px',
              flex: 1,
              minHeight: '8px',
              background: 'var(--border-subtle)',
            }}
          />
        )}
        {isFirst && <div style={{ height: '10px' }} />}

        {/* Dot */}
        <div
          style={{
            width: isLatest ? '12px' : '8px',
            height: isLatest ? '12px' : '8px',
            borderRadius: '50%',
            background: isLatest ? 'var(--accent-light)' : 'var(--border-hover)',
            border: isLatest ? '2px solid var(--accent)' : '2px solid var(--border-subtle)',
            boxShadow: isLatest
              ? '0 0 10px var(--accent-glow-strong)'
              : 'none',
            flexShrink: 0,
            zIndex: 2,
            transition: 'all 0.2s ease',
          }}
        />

        {/* Bottom connector segment (hidden for last item) */}
        {!isLast && (
          <div
            style={{
              width: '2px',
              flex: 1,
              minHeight: '8px',
              background: 'var(--border-subtle)',
            }}
          />
        )}
        {isLast && <div style={{ height: '10px' }} />}
      </div>

      {/* ─── Right: content card ─── */}
      <div style={{ flex: 1, minWidth: 0, paddingBottom: isLast ? '0' : '14px' }}>
        <div
          style={{
            background: isExpanded ? 'var(--bg-elevated)' : 'transparent',
            border: `1px solid ${isExpanded ? 'var(--border-hover)' : 'transparent'}`,
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            transition: 'all 0.2s ease',
          }}
        >
          {/* Header row — always visible */}
          <button
            onClick={onToggle}
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              padding: isExpanded ? '14px 14px 10px' : '8px 14px 10px',
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            {/* Meta row: date + badge + chevron */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.3px',
                }}
              >
                {dateLabel} · {timeLabel}
              </span>

              {isLatest && (
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    color: 'var(--accent-light)',
                    background: 'rgba(159, 18, 57, 0.12)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid rgba(159, 18, 57, 0.25)',
                  }}
                >
                  Latest
                </span>
              )}

              <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)' }}>
                {isExpanded ? '▲' : '▼'}
              </span>
            </div>

            {/* Summary */}
            <p
              style={{
                fontSize: '14px',
                color: 'var(--text-primary)',
                lineHeight: 1.6,
                margin: 0,
                fontWeight: 400,
              }}
            >
              {isExpanded ? update.summary : summaryPreview}
            </p>
          </button>

          {/* Expanded extras */}
          {isExpanded && (
            <div style={{ padding: '0 14px 14px' }}>
              {/* Author */}
              {update.created_by_name && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px',
                  }}
                >
                  <div
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#f2f2f2',
                    }}
                  >
                    {update.created_by_name.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {update.created_by_name}
                  </span>
                </div>
              )}

              {/* Embedded tweet */}
              {embedLoading && (
                <div style={{ padding: 10, color: 'var(--text-muted)', fontSize: 12, marginBottom: 12 }}>
                  Loading embed…
                </div>
              )}
              {darkEmbedHtml && (
                <div
                  ref={embedRef}
                  style={{
                    marginBottom: '14px',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                  }}
                  dangerouslySetInnerHTML={{ __html: darkEmbedHtml }}
                />
              )}

              {/* Source URL */}
              {update.source_url && (
                <a
                  href={update.source_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    color: 'var(--accent-light)',
                    textDecoration: 'none',
                    marginBottom: '12px',
                    padding: '6px 12px',
                    background: 'rgba(159, 18, 57, 0.08)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgba(159, 18, 57, 0.18)',
                  }}
                >
                  <span>🔗</span>
                  <span style={{ fontWeight: 500 }}>View Source</span>
                </a>
              )}

              {/* Admin actions */}
              {isAdmin && (
                <div
                  style={{
                    display: 'flex',
                    gap: '4px',
                    paddingTop: '10px',
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit?.();
                    }}
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-sm)',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-hover)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'none';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    ✎ Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.();
                    }}
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-sm)',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(220, 38, 38, 0.1)';
                      e.currentTarget.style.color = 'var(--danger)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'none';
                      e.currentTarget.style.color = 'var(--text-muted)';
                    }}
                  >
                    🗑 Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
