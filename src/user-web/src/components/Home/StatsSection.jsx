import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';

export default function StatsSection() {
  const [stats, setStats] = useState({ active: 0, today: 0, countries: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    Promise.all([
      api.getIncidents({ status: 'active' }),
      api.getIncidents({ dateFrom: today, dateTo: today }),
      api.getIncidents({}),
    ])
      .then(([activeRes, todayRes, allRes]) => {
        const incidents = allRes.data.incidents || [];
        const countries = new Set(incidents.map((i) => i.location_context?.split(',').pop()?.trim()).filter(Boolean)).size;
        setStats({
          active: activeRes.data.count || 0,
          today: todayRes.data.count || 0,
          countries: countries || 0,
        });
      })
      .catch(() => setStats({ active: 0, today: 0, countries: 0 }))
      .finally(() => setLoading(false));
  }, []);

  const items = [
    { label: 'Active Events', value: stats.active, color: 'var(--danger-light)' },
    { label: 'Events Today', value: stats.today, color: 'var(--success)' },
    { label: 'Countries Monitored', value: stats.countries, color: 'var(--info)' },
  ];

  return (
    <section style={{ padding: '48px 24px', background: 'var(--bg-deep)' }}>
      <div
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        {items.map((item) => (
          <div
            key={item.label}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              textAlign: 'center',
              transition: 'all 0.2s ease',
            }}
          >
            <div
              style={{
                fontSize: '36px',
                fontWeight: 700,
                color: item.color,
                lineHeight: 1,
                marginBottom: '8px',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '-2px',
              }}
            >
              {loading ? '—' : item.value.toLocaleString()}
            </div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '1.2px',
                color: 'var(--text-muted)',
              }}
            >
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
