import React from 'react';
import { motion } from 'framer-motion';
import { useHomeData } from '../../hooks/useHomeData.js';
import { useCountUp } from './useCountUp.js';
import { useInView } from './useInView.js';
import { useReducedMotion } from '@shared/hooks/useReducedMotion.js';
import { Skeleton } from '@shared/components/Skeleton.jsx';

const EASE = [0.16, 1, 0.3, 1];

function LedgerCell({ value, label, color, delay }) {
  const { ref, isInView } = useInView();
  const count = useCountUp(value, 1400, isInView);
  const reduced = useReducedMotion();

  const inner = (
    <div ref={ref}>
      <div className="home-ledger__value">{count.toLocaleString()}</div>
      <div className="home-ledger__label">
        <span className="home-ledger__tick" style={{ background: color }} />
        {label}
      </div>
    </div>
  );

  if (reduced) {
    return <div className="home-ledger__cell">{inner}</div>;
  }
  return (
    <motion.div
      className="home-ledger__cell"
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay, ease: EASE }}
    >
      {inner}
    </motion.div>
  );
}

export default function StatsSection() {
  const { stats, loading } = useHomeData();
  const reduced = useReducedMotion();

  const items = [
    { label: 'Active Events', value: stats.active, color: 'var(--danger)', delay: 0 },
    { label: 'Events Today', value: stats.today, color: 'var(--success)', delay: 0.07 },
    { label: 'Countries Monitored', value: stats.countries, color: 'var(--info)', delay: 0.14 },
    { label: 'Data Sources', value: stats.sources, color: 'var(--warning)', delay: 0.21 },
  ];

  const band = (
    <div className="home-ledger">
      {loading
        ? [0, 1, 2, 3].map((i) => (
            <div key={i} className="home-ledger__cell">
              <Skeleton width="52%" height="30px" style={{ marginBottom: '10px' }} />
              <Skeleton width="70%" height="11px" />
            </div>
          ))
        : items.map((item) => <LedgerCell key={item.label} {...item} />)}
    </div>
  );

  return (
    <section className="home-stats">
      {reduced ? (
        band
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.55, ease: EASE }}
        >
          {band}
        </motion.div>
      )}
    </section>
  );
}
