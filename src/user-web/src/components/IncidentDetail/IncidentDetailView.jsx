import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { Badge } from '@shared/components/Badge.jsx';
import { SeverityBadge } from '@shared/components/SeverityBadge.jsx';
import TimelineEntry from '@shared/components/TimelineEntry.jsx';
import { SEVERITY_SCALE } from '@shared/constants.js';
import { format } from 'date-fns';

export default function IncidentDetailView({ incidentId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedUpdateId, setExpandedUpdateId] = useState(null);

  useEffect(() => {
    setLoading(true);
    api
      .getIncident(incidentId)
      .then((res) => {
        setData(res.data);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [incidentId]);

  if (loading) {
    return (
      <div style={{ padding: '24px', color: 'var(--text-secondary)', fontSize: '13px' }}>
        Loading incident details...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px', color: 'var(--danger)', fontSize: '13px' }}>
        {error}
      </div>
    );
  }

  if (!data) return null;

  const { incident, sources, timeline } = data;
  const catColor = incident.domain_color || '#6b7280';

  const dateStr = incident.start_date
    ? format(new Date(incident.start_date), 'MMM d, yyyy · h:mm a')
    : 'Unknown';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0',
          width: 'fit-content',
        }}
      >
        ← Back to results
      </button>

      {/* Header card */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: '16px',
            bottom: '16px',
            width: '3px',
            borderRadius: '0 2px 2px 0',
            background: catColor,
            opacity: 0.7,
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <Badge color={incident.domain_color}>{incident.category_name}</Badge>
          <Badge status={incident.status}>{incident.status}</Badge>
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px', lineHeight: 1.3 }}>
          {incident.title}
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', margin: 0 }}>
          📍 {incident.location_context || `${parseFloat(incident.latitude).toFixed(4)}, ${parseFloat(incident.longitude).toFixed(4)}`}
        </p>
      </div>

      {/* Meta grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <MetaCard label="Severity" value={<SeverityBadge level={incident.severity} wide />} />
        <MetaCard label="Start" value={dateStr} />
        <MetaCard label="Status" value={incident.status} color={incident.status === 'active' ? 'var(--success)' : 'var(--text-muted)'} />
        <MetaCard
          label="End"
          value={incident.end_date ? format(new Date(incident.end_date), 'MMM d, yyyy · h:mm a') : 'Ongoing'}
        />
      </div>

      {/* Description */}
      {incident.description && (
        <div>
          <SectionLabel>Description</SectionLabel>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
              background: 'var(--bg-elevated)',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              margin: 0,
            }}
          >
            {incident.description}
          </p>
        </div>
      )}

      {/* Sources */}
      {sources.length > 0 && (
        <div>
          <SectionLabel>Sources</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sources.map((src) => (
              <SourceCard key={src.id} source={src} />
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      {timeline.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <SectionLabel style={{ marginBottom: 0 }}>Updates</SectionLabel>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--accent-light)',
                background: 'rgba(159, 18, 57, 0.12)',
                padding: '2px 8px',
                borderRadius: '10px',
              }}
            >
              {timeline.length}
            </span>
          </div>
          <div>
            {[...timeline].reverse().map((update, index) => (
              <TimelineEntry
                key={update.id}
                update={update}
                isLatest={index === 0}
                isExpanded={expandedUpdateId === update.id}
                onToggle={() =>
                  setExpandedUpdateId(expandedUpdateId === update.id ? null : update.id)
                }
                isAdmin={false}
                isFirst={index === 0}
                isLast={index === timeline.length - 1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetaCard({ label, value, color }) {
  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '14px',
      }}
    >
      <div
        style={{
          fontSize: '10px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '1.2px',
          color: 'var(--text-muted)',
          marginBottom: '8px',
        }}
      >
        {label}
      </div>
      {typeof value === 'string' ? (
        <div style={{ fontSize: '13px', fontWeight: 600, color: color || 'var(--text-primary)' }}>
          {value}
        </div>
      ) : (
        value
      )}
    </div>
  );
}

function SectionLabel({ children, style = {} }) {
  return (
    <h4
      style={{
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '1.2px',
        color: 'var(--text-muted)',
        marginBottom: '10px',
        marginTop: '4px',
        ...style,
      }}
    >
      {children}
    </h4>
  );
}

function SourceCard({ source }) {
  const embedRef = React.useRef(null);

  const darkEmbedHtml = source.embed_html
    ? source.embed_html.replace(/class="twitter-tweet"/g, 'class="twitter-tweet" data-theme="dark"')
    : null;

  React.useEffect(() => {
    if (darkEmbedHtml && embedRef.current && window.twttr?.widgets) {
      window.twttr.widgets.load(embedRef.current);
    }
  }, [darkEmbedHtml]);

  if (darkEmbedHtml) {
    return (
      <div
        ref={embedRef}
        style={{
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden',
          padding: '12px',
        }}
        dangerouslySetInnerHTML={{ __html: darkEmbedHtml }}
      />
    );
  }

  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        padding: '12px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <Badge>
          {source.source_type}
        </Badge>
        {source.source_url && (
          <a
            href={source.source_url}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: '12px', color: 'var(--accent-light)', textDecoration: 'none' }}
          >
            View source →
          </a>
        )}
      </div>
      {source.description && (
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{source.description}</p>
      )}
    </div>
  );
}
