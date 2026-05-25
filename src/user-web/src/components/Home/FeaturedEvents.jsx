import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { Badge } from '@shared/components/Badge.jsx';
import { SeverityBadge } from '@shared/components/SeverityBadge.jsx';

import { format } from 'date-fns';

export default function FeaturedEvents() {
  const [incidents, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getIncidents({ status: 'active' })
      .then((res) => {
        const active = res.data.incidents || [];
        // Sort by severity desc, then date desc
        active.sort((a, b) => {
          if (b.severity !== a.severity) return b.severity - a.severity;
          return new Date(b.start_date) - new Date(a.start_date);
        });
        setEvents(active.slice(0, 6));
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section style={{ padding: '48px 24px', background: 'var(--bg-deep)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading featured incidents...
        </div>
      </section>
    );
  }

  if (incidents.length === 0) {
    return null;
  }

  return (
    <section style={{ padding: '48px 24px', background: 'var(--bg-deep)' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
          }}
        >
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Critical Events
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
              Most severe active conflicts right now
            </p>
          </div>
          <Link
            to="/map"
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--accent-light)',
              textDecoration: 'none',
            }}
          >
            View all →
          </Link>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '14px',
          }}
        >
          {incidents.map((incident) => (
            <Link
              key={incident.id}
              to={`/map?incident=${incident.id}`}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '18px',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-hover)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <Badge color={incident.domain_color}>{incident.domain_name}</Badge>
                <SeverityBadge level={incident.severity} />
              </div>
              <h3
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: 0,
                  lineHeight: 1.4,
                }}
              >
                {incident.title}
              </h3>
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  margin: 0,
                  lineHeight: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {incident.description || 'No description available.'}
              </p>
              <div
                style={{
                  marginTop: 'auto',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--border-subtle)',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {incident.location_context || `${parseFloat(incident.latitude).toFixed(2)}, ${parseFloat(incident.longitude).toFixed(2)}`}
                {' · '}
                {incident.start_date ? format(new Date(incident.start_date), 'MMM d, yyyy') : 'Unknown date'}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
