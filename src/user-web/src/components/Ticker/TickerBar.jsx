import React, { useRef, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

export default function TickerBar({ activities, onSelectEvent }) {
  const scrollRef = useRef(null);
  const animationRef = useRef(null);

  // Auto-scroll the ticker
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let pos = el.scrollLeft;
    const speed = 0.8; // pixels per frame

    const animate = () => {
      pos += speed;
      if (pos >= el.scrollWidth - el.clientWidth) {
        pos = 0;
      }
      el.scrollLeft = pos;
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    // Pause on hover
    const handleMouseEnter = () => cancelAnimationFrame(animationRef.current);
    const handleMouseLeave = () => {
      animationRef.current = requestAnimationFrame(animate);
    };

    el.addEventListener('mouseenter', handleMouseEnter);
    el.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      cancelAnimationFrame(animationRef.current);
      el.removeEventListener('mouseenter', handleMouseEnter);
      el.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [activities.length]);

  const config = {
    event_created: { icon: '⚠️', color: 'var(--danger-light)' },
    event_updated: { icon: '📝', color: 'var(--info)' },
    event_resolved: { icon: '✅', color: 'var(--success)' },
    timeline_added: { icon: '📢', color: 'var(--warning)' },
    timeline_updated: { icon: '✎', color: 'var(--info)' },
  };

  if (activities.length === 0) return null;

  const items = activities;

  return (
    <div
      style={{
        height: '36px',
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Label */}
      <div
        style={{
          padding: '0 14px',
          fontSize: '10px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          color: 'var(--text-muted)',
          borderRight: '1px solid var(--border-subtle)',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          background: 'var(--bg-surface)',
          zIndex: 2,
        }}
      >
        Latest
      </div>

      {/* Scrolling items */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: '0',
          maskImage: 'linear-gradient(to right, transparent 0px, black 20px, black calc(100% - 20px), transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0px, black 20px, black calc(100% - 20px), transparent 100%)',
        }}
      >
        {items.map((activity, index) => {
          const c = config[activity.type] || { icon: '•', color: 'var(--text-muted)' };
          const timeAgo = activity.timestamp
            ? formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })
            : 'just now';

          return (
            <button
              key={`${activity.type}-${activity.eventId}-${activity.timestamp}-${index}`}
              onClick={() => onSelectEvent?.(activity.eventId, activity.event)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 20px',
                background: 'none',
                border: 'none',
                borderRight: '1px solid var(--border-subtle)',
                color: 'inherit',
                cursor: 'pointer',
                height: '100%',
                flexShrink: 0,
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none';
              }}
            >
              <span style={{ fontSize: '12px' }}>{c.icon}</span>
              <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>
                {activity.event?.title || 'Unknown event'}
              </span>
              <span style={{ fontSize: '10px', color: c.color, fontWeight: 600 }}>
                {timeAgo}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
