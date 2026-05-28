import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, AlertCircle } from 'lucide-react';
import { api } from '../../services/api.js';
import { Badge } from '@shared/components/Badge.jsx';
import { SeverityBadge } from '@shared/components/SeverityBadge.jsx';
import { Skeleton } from '@shared/components/Skeleton.jsx';
import FadeIn from './FadeIn.jsx';
import { format } from 'date-fns';

function EventSkeleton() {
  return (
    <section className="home-events">
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <Skeleton width="180px" height="24px" style={{ marginBottom: '8px' }} />
          <Skeleton width="260px" height="14px" />
        </div>
        <div className="home-events__grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '18px',
                minHeight: '160px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', gap: '8px' }}>
                <Skeleton width="70px" height="20px" />
                <Skeleton width="50px" height="20px" />
              </div>
              <Skeleton width="90%" height="18px" />
              <Skeleton width="100%" height="14px" />
              <Skeleton width="80%" height="14px" />
              <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
                <Skeleton width="60%" height="12px" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const SEVERITY_COLORS = {
  1: 'var(--sev-1)',
  2: 'var(--sev-2)',
  3: 'var(--sev-3)',
  4: 'var(--sev-4)',
  5: 'var(--sev-5)',
};

export default function FeaturedEvents() {
  const [incidents, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .getIncidents({ status: 'active' })
      .then((res) => {
        const data = res.data || {};
        const active = data.incidents || [];
        active.sort((a, b) => {
          if (b.severity !== a.severity) return b.severity - a.severity;
          return new Date(b.start_date) - new Date(a.start_date);
        });
        setEvents(active.slice(0, 6));
      })
      .catch((err) => {
        console.error('FeaturedEvents: failed to fetch incidents', err);
        setError(err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <EventSkeleton />;
  }

  return (
    <section className="home-events">
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <FadeIn>
          <div className="home-events__header">
            <div>
              <div className="home-section-label" style={{ textAlign: 'left', marginBottom: '8px' }}>
                Real-Time Feed
              </div>
              <h2 className="home-section-title" style={{ textAlign: 'left' }}>
                Critical Events
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
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
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'gap 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.gap = '8px';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.gap = '4px';
              }}
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
        </FadeIn>

        {error && (
          <FadeIn>
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '40px 24px',
                textAlign: 'center',
                color: 'var(--text-muted)',
              }}
            >
              <AlertCircle size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
              <p>Unable to load incidents. Please try again later.</p>
            </div>
          </FadeIn>
        )}

        {!error && incidents.length === 0 && (
          <FadeIn>
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '40px 24px',
                textAlign: 'center',
                color: 'var(--text-muted)',
              }}
            >
              <AlertCircle size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
              <p>No active incidents at the moment.</p>
            </div>
          </FadeIn>
        )}

        {!error && incidents.length > 0 && (
          <div className="home-events__grid">
            {incidents.map((incident, index) => {
              const domainColor = incident.domain_color || '#6b7280';
              const severityColor = SEVERITY_COLORS[incident.severity] || 'var(--text-muted)';

              return (
                <FadeIn key={incident.id} delay={index * 80}>
                  <Link
                    to={`/map?incident=${incident.id}`}
                    className="home-event-card"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = `${domainColor}40`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    }}
                  >
                    <div
                      className="home-event-card__top-border"
                      style={{ background: domainColor }}
                    />
                    <div
                      className="home-event-card__severity-strip"
                      style={{ background: severityColor }}
                    />
                    <div className="home-event-card__content">
                      <div className="home-event-card__badges">
                        <Badge color={domainColor}>{incident.domain_name}</Badge>
                        <SeverityBadge level={incident.severity} />
                      </div>
                      <h3 className="home-event-card__title">{incident.title}</h3>
                      <p className="home-event-card__desc">
                        {incident.description || 'No description available.'}
                      </p>
                      <div className="home-event-card__meta">
                        <span>
                          {incident.location_context ||
                            `${parseFloat(incident.latitude).toFixed(2)}, ${parseFloat(incident.longitude).toFixed(2)}`}
                        </span>
                        <span>
                          {incident.start_date
                            ? format(new Date(incident.start_date), 'MMM d, yyyy')
                            : 'Unknown date'}
                        </span>
                      </div>
                    </div>
                  </Link>
                </FadeIn>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
