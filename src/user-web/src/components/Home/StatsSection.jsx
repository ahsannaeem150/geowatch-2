import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useCountUp } from './useCountUp.js';
import { useInView } from './useInView.js';
import FadeIn from './FadeIn.jsx';

function StatCard({ value, label, color, delay }) {
  const { ref, isInView } = useInView();
  const count = useCountUp(value, 1400, isInView);

  return (
    <FadeIn delay={delay}>
      <div
        ref={ref}
        className="home-stat-card"
        style={{ color }}
      >
        <div className="home-stat-card__value">{count.toLocaleString()}</div>
        <div className="home-stat-card__label" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </div>
      </div>
    </FadeIn>
  );
}

function StatSkeleton() {
  return (
    <div className="home-skeleton-grid">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="home-skeleton-card">
          <div className="home-skeleton-card__number" />
          <div className="home-skeleton-card__label" />
        </div>
      ))}
    </div>
  );
}

export default function StatsSection() {
  const [stats, setStats] = useState({ active: 0, today: 0, countries: 0, sources: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);

    const fetchActive = api.getIncidents({ status: 'active' }).catch((err) => {
      console.error('Stats: failed to fetch active incidents', err);
      return { data: { incidents: [], count: 0 } };
    });

    const fetchToday = api.getIncidents({ dateFrom: today, dateTo: today }).catch((err) => {
      console.error('Stats: failed to fetch today incidents', err);
      return { data: { incidents: [], count: 0 } };
    });

    const fetchAll = api.getIncidents({}).catch((err) => {
      console.error('Stats: failed to fetch all incidents', err);
      return { data: { incidents: [], count: 0 } };
    });

    Promise.all([fetchActive, fetchToday, fetchAll])
      .then(([activeRes, todayRes, allRes]) => {
        const activeData = activeRes.data || {};
        const todayData = todayRes.data || {};
        const allData = allRes.data || {};

        const incidents = allData.incidents || [];
        const countries = new Set(
          incidents
            .map((i) => i.location_context?.split(',').pop()?.trim())
            .filter(Boolean)
        ).size;

        const sourceNames = new Set(
          incidents.map((i) => i.source_name).filter(Boolean)
        );

        setStats({
          active: activeData.count ?? activeData.incidents?.length ?? 0,
          today: todayData.count ?? todayData.incidents?.length ?? 0,
          countries: countries || 0,
          sources: sourceNames.size || 0,
        });
      })
      .catch((err) => {
        console.error('Stats: unexpected error', err);
        setStats({ active: 0, today: 0, countries: 0, sources: 0 });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="home-stats">
        <StatSkeleton />
      </section>
    );
  }

  const items = [
    { label: 'Active Events', value: stats.active, color: 'var(--danger)', delay: 0 },
    { label: 'Events Today', value: stats.today, color: 'var(--success)', delay: 100 },
    { label: 'Countries Monitored', value: stats.countries, color: 'var(--info)', delay: 200 },
    { label: 'Data Sources', value: stats.sources, color: 'var(--warning)', delay: 300 },
  ];

  return (
    <section className="home-stats">
      <div className="home-stats__grid">
        {items.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>
    </section>
  );
}
