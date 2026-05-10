import React from 'react';
import { Link } from 'react-router-dom';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@shared/constants.js';

const categoryIcons = {
  conflict: '⚔️',
  protest: '📢',
  disaster: '🌊',
  diplomacy: '🤝',
  humanitarian: '🏥',
  other: '📌',
};

export default function CategoryGrid() {
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
          Filter events by type to focus on what matters to you
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
          }}
        >
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
            const color = CATEGORY_COLORS[key];
            return (
              <Link
                key={key}
                to={`/map?category=${key}`}
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
                <span style={{ fontSize: '28px' }}>{categoryIcons[key]}</span>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color,
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                  }}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
