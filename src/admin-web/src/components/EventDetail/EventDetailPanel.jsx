import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { Button } from '@shared/components/Button.jsx';
import { Badge } from '@shared/components/Badge.jsx';
import { CATEGORY_LABELS, SEVERITY_SCALE, CATEGORY_COLORS } from '@shared/constants.js';
import { format } from 'date-fns';

export default function EventDetailPanel({ eventId, onEdit, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api
      .getEvent(eventId)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) {
    return (
      <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>
        Loading event details...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px', color: 'var(--danger)' }}>
        {error}
      </div>
    );
  }

  if (!data) return null;

  const { event, sources, timeline } = data;
  const severityLabel = SEVERITY_SCALE.find((s) => s.value === event.severity)?.label || event.severity;
  const catColor = CATEGORY_COLORS[event.category];

  const sectionTitle = (text) => (
    <h4
      style={{
        fontSize: '12px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '1px',
        color: 'var(--text-muted)',
        marginBottom: '10px',
        marginTop: '20px',
      }}
    >
      {text}
    </h4>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div
        style={{
          padding: '16px',
          background: 'rgba(26, 29, 41, 0.6)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          borderLeft: `3px solid ${catColor}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <Badge category={event.category}>{CATEGORY_LABELS[event.category]}</Badge>
          <Badge status={event.status}>{event.status}</Badge>
        </div>
        <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
          {event.title}
        </h2>
        <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)' }}>
          {parseFloat(event.latitude ?? 0).toFixed(4)}, {parseFloat(event.longitude ?? 0).toFixed(4)}
        </p>
      </div>

      {/* Meta */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          padding: '14px',
          background: 'var(--bg-input)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <MetaItem label="Severity" value={`${event.severity} — ${severityLabel}`} color={catColor} />
        <MetaItem label="Start Date" value={format(new Date(event.start_date), 'MMM dd, yyyy')} />
        <MetaItem label="End Date" value={event.end_date ? format(new Date(event.end_date), 'MMM dd, yyyy') : 'Ongoing'} />
        <MetaItem label="Created" value={format(new Date(event.created_at), 'MMM dd, yyyy')} />
      </div>

      {/* Description */}
      {event.description && (
        <div>
          {sectionTitle('Description')}
          <p
            style={{
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
              fontSize: '13px',
              background: 'var(--bg-input)',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {event.description}
          </p>
        </div>
      )}

      {/* Sources */}
      {sources.length > 0 && (
        <div>
          {sectionTitle('Sources')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sources.map((src) => (
              <SourceItem key={src.id} source={src} />
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      {timeline.length > 0 && (
        <div>
          {sectionTitle('Timeline')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', paddingLeft: '16px' }}>
            {/* Vertical line */}
            <div
              style={{
                position: 'absolute',
                left: '5px',
                top: '6px',
                bottom: '6px',
                width: '2px',
                background: 'var(--border-subtle)',
              }}
            />
            {timeline.map((update, i) => (
              <div key={update.id} style={{ position: 'relative' }}>
                {/* Dot */}
                <div
                  style={{
                    position: 'absolute',
                    left: '-14px',
                    top: '6px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: i === timeline.length - 1 ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                    boxShadow: i === timeline.length - 1 ? '0 0 6px var(--accent-cyan)' : 'none',
                  }}
                />
                <div
                  style={{
                    background: 'var(--bg-input)',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <p style={{ color: 'var(--text-primary)', fontSize: '13px', marginBottom: '4px' }}>
                    {update.summary}
                  </p>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span>{format(new Date(update.update_date), 'MMM dd, yyyy HH:mm')}</span>
                    {update.created_by_name && <span>by {update.created_by_name}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
        <Button variant="primary" onClick={() => onEdit?.(event)}>
          Edit Event
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

function MetaItem({ label, value, color }) {
  return (
    <div>
      <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </span>
      <p style={{ fontSize: '13px', fontWeight: 600, color: color || 'var(--text-primary)', marginTop: '2px' }}>
        {value}
      </p>
    </div>
  );
}

function SourceItem({ source }) {
  if (source.embed_html) {
    return (
      <div
        style={{
          background: 'var(--bg-input)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{ padding: '12px' }}
          dangerouslySetInnerHTML={{ __html: source.embed_html }}
        />
        {source.description && (
          <p style={{ padding: '0 12px 12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            {source.description}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--bg-input)',
        padding: '12px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <Badge category={source.source_type === 'x_post' ? 'diplomacy' : source.source_type === 'news_article' ? 'info' : 'other'}>
          {source.source_type}
        </Badge>
        {source.source_url && (
          <a
            href={source.source_url}
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--accent-cyan)', fontSize: '12px', textDecoration: 'none' }}
          >
            View source →
          </a>
        )}
      </div>
      {source.description && (
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{source.description}</p>
      )}
    </div>
  );
}
