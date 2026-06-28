import React, { useState, useEffect } from 'react';
import {
  Radio,
  Bell,
  ChevronUp,
  ChevronDown,
  Activity,
  AlertCircle,
  RefreshCw,
  MapPin,
  CheckCircle2,
  Hexagon,
} from 'lucide-react';

const dummyFeed = [
  { id: 1, text: 'New incident reported in Kabul', time: '2m ago', type: 'new' },
  { id: 2, text: 'Air strike status updated to verified', time: '5m ago', type: 'update' },
  { id: 3, text: 'Zone "Eastern Border" perimeter expanded', time: '12m ago', type: 'zone' },
  { id: 4, text: 'Civil unrest flagged in Damascus', time: '18m ago', type: 'new' },
  { id: 5, text: 'Timeline update added to fuel shortage', time: '24m ago', type: 'update' },
  { id: 6, text: 'Maritime incident resolved', time: '31m ago', type: 'resolved' },
  { id: 7, text: 'New zone created in Red Sea corridor', time: '45m ago', type: 'zone' },
];

const TYPE_META = {
  new: { icon: AlertCircle, color: 'var(--danger)', bg: 'rgba(239, 68, 68, 0.12)', label: 'New' },
  update: { icon: RefreshCw, color: 'var(--warning)', bg: 'rgba(245, 158, 11, 0.12)', label: 'Update' },
  resolved: { icon: CheckCircle2, color: 'var(--success)', bg: 'rgba(34, 197, 94, 0.12)', label: 'Resolved' },
  zone: { icon: Hexagon, color: 'var(--accent-light)', bg: 'rgba(56, 189, 248, 0.12)', label: 'Zone' },
};

function timeAgo(dateMs) {
  if (!dateMs) return '';
  const diffMin = Math.floor((Date.now() - dateMs) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

export default function BottomAmbientBar({ feed: feedProp }) {
  const [expanded, setExpanded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const feed = feedProp && feedProp.length > 0 ? feedProp : dummyFeed;

  useEffect(() => {
    if (expanded) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % feed.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [expanded, feed.length]);

  const currentItem = feed[currentIndex % feed.length];
  const meta = TYPE_META[currentItem?.type] || TYPE_META.new;
  const currentTime = currentItem?.time || timeAgo(currentItem?.createdAt);

  return (
    <div
      style={{
        height: expanded ? '260px' : '44px',
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        transition: 'height 0.25s ease',
        overflow: 'hidden',
      }}
    >
      {/* Collapsed / control row */}
      <div
        onClick={() => setExpanded((p) => !p)}
        style={{
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: '14px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--bg-hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        {/* LIVE pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(90, 1, 28, 0.25)',
            border: '1px solid rgba(159, 18, 57, 0.45)',
            color: 'var(--danger-light)',
            fontSize: '11px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
          }}
        >
          <Radio size={12} />
          <span>Live</span>
        </div>

        {/* Ticker area */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          <Bell size={14} color="var(--text-muted)" />
          <div
            key={currentItem.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              minWidth: 0,
              animation: 'fadeIn 0.35s ease-out',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: meta.color,
                flexShrink: 0,
              }}
            />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentItem.text || currentItem.message}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '11px', flexShrink: 0 }}>
              {currentTime}
            </span>
          </div>
        </div>

        {/* Expand / collapse button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((p) => !p);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--text-secondary)',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent-light)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <Activity size={12} />
          {expanded ? 'Collapse' : 'Activity Feed'}
          {expanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        </button>
      </div>

      {/* Expanded feed list */}
      {expanded && (
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '10px 16px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          {feed.slice(0, 30).map((item) => {
            const itemMeta = TYPE_META[item.type] || TYPE_META.new;
            const Icon = itemMeta.icon;
            const itemTime = item.time || timeAgo(item.createdAt);
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
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
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: 'var(--radius-sm)',
                    background: itemMeta.bg,
                    color: itemMeta.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={14} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.4,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.text || item.message}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                    {itemMeta.label} · {itemTime}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
