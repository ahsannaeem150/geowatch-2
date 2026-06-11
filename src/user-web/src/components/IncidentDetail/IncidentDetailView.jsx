import React, { useState, useEffect } from 'react';
import { Link, Copy, Check, Hexagon } from 'lucide-react';
import { api } from '../../services/api.js';
import SaveButton from '../SaveButton/SaveButton.jsx';
import { Badge } from '@shared/components/Badge.jsx';
import { SeverityBadge } from '@shared/components/SeverityBadge.jsx';
import TimelineEntry from '@shared/components/TimelineEntry.jsx';
import { MediaGallery } from '@shared/components/MediaGallery.jsx';
import { SEVERITY_SCALE, VERIFICATION_CONFIG, SOURCE_VERIFICATION_CONFIG } from '@shared/constants.js';
import { format } from 'date-fns';

export default function IncidentDetailView({ incidentId, onBack, refreshKey, isSaved, onSaveChange }) {
  const [data, setData] = useState(null);
  const [media, setMedia] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedUpdateId, setExpandedUpdateId] = useState(null);
  const [justUpdated, setJustUpdated] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchData = () => {
    setLoading(true);
    api
      .getIncident(incidentId)
      .then((res) => {
        setData(res.data);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const fetchMedia = () => {
    setMediaLoading(true);
    api
      .listMedia(incidentId)
      .then((res) => setMedia(res.data?.media || []))
      .catch(() => setMedia([]))
      .finally(() => setMediaLoading(false));
  };

  useEffect(() => {
    fetchData();
    fetchMedia();
  }, [incidentId]);

  // Re-fetch when refreshKey changes (SSE-driven live update)
  useEffect(() => {
    if (refreshKey && refreshKey > 0) {
      fetchData();
      setJustUpdated(true);
      const timer = setTimeout(() => setJustUpdated(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [refreshKey]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/map?incident=${incidentId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

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
  const isPolygon = incident.geometry_type === 'polygon';
  const catColor = isPolygon
    ? incident.zone_category_color || '#6366f1'
    : incident.domain_color || '#6b7280';

  const ring = incident.geometry?.coordinates?.[0] || [];
  const vertexCount = Math.max(0, ring.length - 1);
  const areaKm2 = (() => {
    if (ring.length < 3) return 0;
    let a = 0;
    for (let i = 0; i < ring.length; i++) {
      const j = (i + 1) % ring.length;
      a += ring[i][0] * ring[j][1];
      a -= ring[j][0] * ring[i][1];
    }
    a = Math.abs(a) / 2 * 111.32 * 111.32;
    if (a < 1) return `${(a * 100).toFixed(1)} ha`;
    if (a < 1000) return `${a.toFixed(1)} km²`;
    return `${(a / 1000).toFixed(1)}k km²`;
  })();

  const dateStr = incident.start_date
    ? format(new Date(incident.start_date), 'MMM d, yyyy · h:mm a')
    : 'Unknown';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
      {/* Back + Share row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SaveButton
            incidentId={incidentId}
            initialSaved={isSaved}
            onChange={(saved) => onSaveChange?.(incidentId, saved)}
            size={16}
          />
          <button
            onClick={handleCopyLink}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 600,
              color: copied ? 'var(--success)' : 'var(--text-muted)',
              background: copied ? 'var(--alert-success-bg)' : 'var(--bg-elevated)',
              border: `1px solid ${copied ? 'var(--alert-success-border)' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              padding: '6px 12px',
              transition: 'all 0.2s ease',
            }}
            title="Copy shareable link"
          >
            {copied ? <Check size={14} /> : <Link size={14} />}
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      </div>

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
          {isPolygon && incident.zone_category_name ? (
            <Badge color={incident.zone_category_color || '#6366f1'}>
              <Hexagon size={10} /> {incident.zone_category_name}
            </Badge>
          ) : (
            <Badge color={incident.domain_color}>{incident.category_name}</Badge>
          )}
          <Badge status={incident.status}>{incident.status}</Badge>
          {incident.verification_status && (
            <VerificationBadge status={incident.verification_status} />
          )}
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px', lineHeight: 1.3 }}>
          {incident.title}
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', margin: 0 }}>
          {isPolygon
            ? `⬡ ${areaKm2} · ${vertexCount} vertices`
            : `📍 ${incident.location_context || `${parseFloat(incident.latitude).toFixed(4)}, ${parseFloat(incident.longitude).toFixed(4)}`}`}
        </p>
      </div>

      {/* Live update indicator */}
      {justUpdated && (
        <div
          style={{
            background: 'var(--alert-success-bg)',
            border: '1px solid var(--alert-success-border)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeInOut 3s ease-out forwards',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#22c55e',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--success)' }}>
            Updated just now
          </span>
        </div>
      )}

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

      {/* Media */}
      {media.length > 0 && (
        <div>
          <SectionLabel>Media</SectionLabel>
          <MediaGallery media={media} canEdit={false} />
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
                background: 'var(--accent-subtle-bg)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-md)',
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

      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(-4px); }
          10% { opacity: 1; transform: translateY(0); }
          80% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}

function VerificationBadge({ status }) {
  const cfg = VERIFICATION_CONFIG[status] || VERIFICATION_CONFIG.unverified;
  return (
    <span
      style={{
        fontSize: '10px',
        fontWeight: 700,
        color: cfg.color,
        background: `${cfg.color}15`,
        padding: '2px 8px',
        borderRadius: 'var(--radius-pill)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}
    >
      {cfg.icon} {cfg.label}
    </span>
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
  const vConfig = SOURCE_VERIFICATION_CONFIG[source.verification_status] || SOURCE_VERIFICATION_CONFIG.unverified;

  const darkEmbedHtml = source.embed_html
    ? source.embed_html.replace(/class="twitter-tweet"/g, 'class="twitter-tweet" data-theme="dark"')
    : null;

  React.useEffect(() => {
    if (darkEmbedHtml && embedRef.current && window.twttr?.widgets) {
      window.twttr.widgets.load(embedRef.current);
    }
  }, [darkEmbedHtml]);

  const VerificationLabel = () => (
    <span
      style={{
        fontSize: '10px',
        fontWeight: 700,
        color: vConfig.color,
        background: `${vConfig.color}15`,
        padding: '2px 8px',
        borderRadius: 'var(--radius-pill)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}
    >
      {vConfig.icon} {vConfig.label}
    </span>
  );

  if (darkEmbedHtml) {
    return (
      <div
        style={{
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-input)',
          }}
        >
          <Badge>
            {source.source_type}
          </Badge>
          <VerificationLabel />
        </div>
        <div
          ref={embedRef}
          style={{ padding: '12px' }}
          dangerouslySetInnerHTML={{ __html: darkEmbedHtml }}
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
        background: 'var(--bg-elevated)',
        padding: '12px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
        <Badge>
          {source.source_type}
        </Badge>
        <VerificationLabel />
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
