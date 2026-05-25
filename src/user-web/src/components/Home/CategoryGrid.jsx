import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';

export default function CategoryGrid() {
  const [domains, setDomains] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getDomains(), api.getCategories()])
      .then(([domainsRes, categoriesRes]) => {
        setDomains(domainsRes.data?.domains || []);
        setCategories(categoriesRes.data?.categories || []);
      })
      .catch(() => {
        setDomains([]);
        setCategories([]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section style={{ padding: '48px 24px', background: 'var(--bg-surface)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading categories...
        </div>
      </section>
    );
  }

  return (
    <section style={{ padding: '48px 24px', background: 'var(--bg-surface)' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h2
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '8px',
            textAlign: 'center',
          }}
        >
          Browse by Category
        </h2>
        <p
          style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            textAlign: 'center',
            marginBottom: '32px',
          }}
        >
          Filter incidents by type to focus on what matters to you
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
          }}
        >
          {domains.map((domain) => {
            const color = domain.color || '#6b7280';
            const firstCategory = categories.find((c) => c.domain_id === domain.id);
            const categoryId = firstCategory?.id;
            return (
              <Link
                key={domain.slug}
                to={categoryId ? `/map?categoryId=${categoryId}` : '/map'}
                style={{
                  background: `${color}08`,
                  border: `1px solid ${color}25`,
                  borderRadius: 'var(--radius-md)',
                  padding: '20px 16px',
                  textAlign: 'center',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${color}12`;
                  e.currentTarget.style.borderColor = `${color}40`;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = `${color}08`;
                  e.currentTarget.style.borderColor = `${color}25`;
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <span style={{ fontSize: '28px' }}>{domain.icon || '📌'}</span>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color,
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                  }}
                >
                  {domain.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
