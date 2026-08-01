import React from 'react';
import { Link } from 'react-router-dom';

export default function NewsTicker({ incidents = [] }) {
  if (incidents.length === 0) return null;

  const items = incidents.slice(0, 10);
  // Duplicate for seamless loop
  const allItems = [...items, ...items];

  const getSeverityColor = (sev) => {
    const map = {
      1: 'var(--sev-1)',
      2: 'var(--sev-2)',
      3: 'var(--sev-3)',
      4: 'var(--sev-4)',
      5: 'var(--sev-5)',
    };
    return map[sev] || 'var(--text-muted)';
  };

  return (
    <div className="home-ticker">
      <span className="home-ticker__live">
        <span className="home-ticker__live-dot" />
        LIVE
      </span>
      <div className="home-ticker__viewport">
        <div className="home-ticker__track">
          {allItems.map((incident, i) => (
            <Link
              key={`${incident.id}-${i}`}
              to={`/map?incident=${incident.id}`}
              className="home-ticker__item"
              title={`${incident.title} — open on the map`}
            >
              <span
                className="home-ticker__dot"
                style={{ background: getSeverityColor(incident.severity) }}
              />
              <span className="home-ticker__title">
                {incident.title}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {incident.location_context || `${parseFloat(incident.latitude).toFixed(2)}, ${parseFloat(incident.longitude).toFixed(2)}`}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
