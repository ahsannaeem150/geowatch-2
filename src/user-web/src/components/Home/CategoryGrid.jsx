import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Bomb,
  Target,
  Flame,
  Swords,
  Waves,
  Factory,
  HeartPulse,
  Users,
  Landmark,
  Globe,
  Anchor,
  TrendingDown,
  Leaf,
  AlertTriangle,
  Plane,
  Eye,
  Zap,
  Radio,
  Wifi,
  Activity,
  BarChart3,
  MapPin,
  Navigation,
  HelpCircle,
} from 'lucide-react';
import { api } from '../../services/api.js';
import FadeIn from './FadeIn.jsx';
import { Skeleton } from '@shared/components/Skeleton.jsx';

const ICON_MAP = {
  shield: Shield,
  bomb: Bomb,
  target: Target,
  crosshair: Target,
  flame: Flame,
  'flame-kindling': Flame,
  swords: Swords,
  sword: Swords,
  waves: Waves,
  factory: Factory,
  'heart-pulse': HeartPulse,
  users: Users,
  landmark: Landmark,
  globe: Globe,
  anchor: Anchor,
  'trending-down': TrendingDown,
  leaf: Leaf,
  radiation: AlertTriangle,
  plane: Plane,
  eye: Eye,
  zap: Zap,
  radio: Radio,
  wifi: Wifi,
  activity: Activity,
  'bar-chart': BarChart3,
  'bar-chart-3': BarChart3,
  'map-pin': MapPin,
  navigation: Navigation,
};

function CategoryIcon({ name, size = 32, color }) {
  const Icon = ICON_MAP[name] || HelpCircle;
  return <Icon size={size} strokeWidth={1.5} color={color} />;
}

function CategorySkeleton() {
  return (
    <section className="home-categories">
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <Skeleton width="140px" height="12px" style={{ margin: '0 auto 12px' }} />
          <Skeleton width="240px" height="24px" style={{ margin: '0 auto 8px' }} />
          <Skeleton width="320px" height="14px" style={{ margin: '0 auto' }} />
        </div>
        <div className="home-categories__grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                background: 'var(--bg-deep)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '28px 20px',
                minHeight: '160px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '14px',
              }}
            >
              <Skeleton width="32px" height="32px" style={{ borderRadius: '50%' }} />
              <Skeleton width="100px" height="14px" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function CategoryGrid() {
  const [domains, setDomains] = useState([]);
  const [categories, setCategories] = useState([]);
  const [incidentCounts, setIncidentCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDomains = api.getDomains().catch((err) => {
      console.error('CategoryGrid: failed to fetch domains', err);
      return { data: { domains: [] } };
    });

    const fetchCategories = api.getCategories().catch((err) => {
      console.error('CategoryGrid: failed to fetch categories', err);
      return { data: { categories: [] } };
    });

    const fetchIncidents = api.getIncidents({ status: 'active' }).catch((err) => {
      console.error('CategoryGrid: failed to fetch incidents', err);
      return { data: { incidents: [] } };
    });

    Promise.all([fetchDomains, fetchCategories, fetchIncidents])
      .then(([domainsRes, categoriesRes, incidentsRes]) => {
        const doms = domainsRes.data?.domains || [];
        const cats = categoriesRes.data?.categories || [];
        const incidents = incidentsRes.data?.incidents || [];

        // Count incidents per domain
        const counts = {};
        incidents.forEach((inc) => {
          const cat = cats.find((c) => c.id === inc.category_id);
          if (cat) {
            counts[cat.domain_id] = (counts[cat.domain_id] || 0) + 1;
          }
        });

        setDomains(doms);
        setCategories(cats);
        setIncidentCounts(counts);
      })
      .catch((err) => {
        console.error('CategoryGrid: unexpected error', err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <CategorySkeleton />;
  }

  if (domains.length === 0) {
    return (
      <section className="home-categories">
        <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center', color: 'var(--text-muted)', padding: '40px 24px' }}>
          No categories available.
        </div>
      </section>
    );
  }

  return (
    <section className="home-categories">
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <FadeIn>
          <div className="home-section-label">Browse by Category</div>
        </FadeIn>
        <FadeIn delay={100}>
          <h2 className="home-section-title">Filter by Domain</h2>
        </FadeIn>
        <FadeIn delay={200}>
          <p className="home-section-subtitle">
            Filter incidents by type to focus on what matters to you
          </p>
        </FadeIn>

        <div className="home-categories__grid">
          {domains.map((domain, index) => {
            const color = domain.color || '#6b7280';
            const firstCategory = categories.find((c) => c.domain_id === domain.id);
            const categoryId = firstCategory?.id;
            const count = incidentCounts[domain.id] || 0;

            return (
              <FadeIn key={domain.slug} delay={100 + index * 60}>
                <Link
                  to={categoryId ? `/map?categoryId=${categoryId}` : '/map'}
                  className="home-category-card"
                  style={{
                    color,
                    borderColor: `${color}20`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = `${color}50`;
                    e.currentTarget.style.boxShadow = `0 8px 32px ${color}10`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = `${color}20`;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div className="home-category-card__icon">
                    <CategoryIcon name={domain.icon} size={32} color={color} />
                  </div>
                  <span className="home-category-card__name" style={{ color }}>
                    {domain.name}
                  </span>
                  <span className="home-category-card__meta">
                    {count > 0 ? `${count} active` : 'No active'}
                  </span>
                </Link>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
