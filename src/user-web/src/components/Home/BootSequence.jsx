import React, { useEffect, useState } from 'react';

const LINES = [
  { text: 'GEOWATCH v1.0.4', status: 'ok', delay: 0 },
  { text: 'ESTABLISHING UPLINK', status: 'ok', delay: 180 },
  { text: 'AGGREGATING SOURCE FEEDS', status: 'ok', delay: 360 },
  { text: 'MONITORING 6 COUNTRIES', status: 'active', delay: 540 },
  { text: 'ALL SYSTEMS OPERATIONAL', status: 'ok', delay: 720 },
];

export default function BootSequence({ onComplete }) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timers = LINES.map((line, i) =>
      setTimeout(() => setVisibleCount(i + 1), line.delay)
    );

    const exitTimer = setTimeout(() => {
      setExiting(true);
      setTimeout(onComplete, 600);
    }, 1400);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(exitTimer);
    };
  }, [onComplete]);

  return (
    <div
      className="boot-sequence"
      style={{
        opacity: exiting ? 0 : 1,
        transition: 'opacity 0.6s ease',
        pointerEvents: exiting ? 'none' : 'auto',
      }}
    >
      <div className="boot-sequence__terminal">
        {LINES.map((line, i) => (
          <div
            key={i}
            className={`boot-sequence__line boot-sequence__line--${line.status}`}
            style={{
              opacity: i < visibleCount ? 1 : 0,
              transition: 'opacity 0.15s ease',
            }}
          >
            <span style={{ color: 'var(--text-muted)' }}>&gt;</span>
            <span>{line.text}</span>
            <span style={{ marginLeft: 'auto', color: line.status === 'ok' ? 'var(--success)' : 'var(--info)' }}>
              {line.status === 'ok' ? '[OK]' : '[ACTIVE]'}
            </span>
            {i === visibleCount - 1 && i < LINES.length - 1 && (
              <span className="boot-sequence__cursor" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
