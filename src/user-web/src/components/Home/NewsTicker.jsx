import React from 'react';

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
      <div className="home-ticker__track">
        {allItems.map((incident, i) => (
          <span key={`${incident.id}-${i}`} className="home-ticker__item">
            <span
              className="home-ticker__dot"
              style={{ background: getSeverityColor(incident.severity) }}
            />
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
              {incident.title}
            </span>
            <span style={{ color: 'var(--text-muted)' }}>
              {incident.location_context || `${parseFloat(incident.latitude).toFixed(2)}, ${parseFloat(incident.longitude).toFixed(2)}`}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
