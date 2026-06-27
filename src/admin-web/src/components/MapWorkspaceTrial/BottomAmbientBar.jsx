import React, { useState, useEffect } from 'react';
import { Activity, Radio, ChevronUp, ChevronDown, Bell } from 'lucide-react';

const dummyFeed = [
  { id: 1, text: 'New incident reported in Kabul', time: '2m ago', type: 'new' },
  { id: 2, text: 'Air strike status updated to verified', time: '5m ago', type: 'update' },
  { id: 3, text: 'Zone "Eastern Border" perimeter expanded', time: '12m ago', type: 'zone' },
  { id: 4, text: 'Civil unrest flagged in Damascus', time: '18m ago', type: 'new' },
  { id: 5, text: 'Timeline update added to fuel shortage', time: '24m ago', type: 'update' },
  { id: 6, text: 'Maritime incident resolved', time: '31m ago', type: 'resolved' },
  { id: 7, text: 'New zone created in Red Sea corridor', time: '45m ago', type: 'zone' },
];

export default function BottomAmbientBar() {
  const [expanded, setExpanded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (expanded) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % dummyFeed.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [expanded]);

  const currentItem = dummyFeed[currentIndex];

  return (
    <div
      style={{
        height: expanded ? '240px' : '40px',
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        transition: 'height 0.25s ease',
        overflow: 'hidden',
      }}
    >
      {/* Collapsed ticker row */}
      <div
        style={{
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--danger-light)',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}
        >
          <Radio size={14} />
          <span>Live</span>
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            overflow: 'hidden',
          }}
        >
          <Bell size={14} color="var(--text-muted)" />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              animation: 'slideUp 0.4s ease-out',
            }}
            key={currentItem.id}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background:
                  currentItem.type === 'new'
                    ? 'var(--danger)'
                    : currentItem.type === 'resolved'
                    ? 'var(--success)'
                    : 'var(--accent-light)',
              }}
            />
            <span>{currentItem.text}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>— {currentItem.time}</span>
          </div>
        </div>

        <button
          onClick={() => setExpanded((p) => !p)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--text-muted)',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
          }}
        >
          <Activity size={12} />
          {expanded ? 'Hide Feed' : 'Activity Feed'}
          {expanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        </button>
      </div>

      {/* Expanded feed list */}
      {expanded && (
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 16px',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '10px',
            }}
          >
            {dummyFeed.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '10px 12px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-light)';
                  e.currentTarget.style.background = 'var(--bg-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.background = 'var(--bg-input)';
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background:
                      item.type === 'new'
                        ? 'var(--danger)'
                        : item.type === 'resolved'
                        ? 'var(--success)'
                        : 'var(--accent-light)',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.text}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {item.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
