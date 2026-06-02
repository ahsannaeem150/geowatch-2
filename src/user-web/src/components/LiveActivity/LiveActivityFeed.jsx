import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Badge } from '@shared/components/Badge.jsx';
import { SeverityBadge } from '@shared/components/SeverityBadge.jsx';

import { formatDistanceToNow } from 'date-fns';

export default function LiveActivityFeed({
  activities,
  onSelectEvent,
  isCollapsed,
  onToggleCollapse,
  unreadCount,
  onMarkAllRead,
}) {
  const scrollRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to top on new activity
  useEffect(() => {
    if (autoScroll && scrollRef.current && !isCollapsed) {
      scrollRef.current.scrollTop = 0;
    }
  }, [activities.length, autoScroll, isCollapsed]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop } = scrollRef.current;
    setAutoScroll(scrollTop < 10);
  }, []);

  // Collapsed state — thin vertical bar
  if (isCollapsed) {
    return (
      <div
        style={{
          width: '44px',
          height: '100%',
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '12px 0',
          gap: '12px',
          cursor: 'pointer',
          flexShrink: 0,
          position: 'relative',
        }}
        onClick={onToggleCollapse}
      >
        {/* Live pulse */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: 'var(--danger-light)',
              boxShadow: '0 0 8px var(--accent-glow-strong)',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
          {unreadCount > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                minWidth: '16px',
                height: '16px',
                borderRadius: '50%',
                background: 'var(--danger)',
                color: '#fff',
                fontSize: '9px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
              }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </div>

        {/* Vertical text */}
        <span
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '2px',
            color: 'var(--text-muted)',
            transform: 'rotate(180deg)',
          }}
        >
          Live Activity
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '300px',
        height: '100%',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--danger-light)',
              boxShadow: '0 0 8px var(--accent-glow-strong)',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: 'var(--text-primary)',
            }}
          >
            Live Activity
          </span>
          {unreadCount > 0 && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: 'var(--danger-light)',
                background: 'rgba(220, 38, 38, 0.12)',
                padding: '2px 8px',
                borderRadius: '10px',
              }}
            >
              {unreadCount} new
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {unreadCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkAllRead?.();
              }}
              style={{
                fontSize: '10px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              Mark seen
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse?.();
            }}
            style={{
              fontSize: '16px',
              color: 'var(--text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              lineHeight: 1,
            }}
          >
            ◀
          </button>
        </div>
      </div>

      {/* Activity list */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', position: 'relative' }}
      >
        {activities.length === 0 ? (
          <div
            style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '13px',
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.5 }}>📡</div>
            <div>Waiting for activity...</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>New incidents will appear here in real time.</div>
          </div>
        ) : (
          activities.map((activity, index) => (
            <ActivityItem
              key={`${activity.type}-${activity.incidentId}-${activity.timestamp}-${index}`}
              activity={activity}
              onClick={() => onSelectEvent?.(activity.incidentId, activity.incident)}
              isUnread={activity.isUnread}
            />
          ))
        )}
      </div>

      {/* New activity indicator (when scrolled down) */}
      {unreadCount > 0 && !autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true);
            if (scrollRef.current) scrollRef.current.scrollTop = 0;
          }}
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '8px 16px',
            background: 'var(--accent)',
            color: '#f2f2f2',
            fontSize: '12px',
            fontWeight: 700,
            borderRadius: 'var(--radius-pill)',
            border: 'none',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-md)',
            zIndex: 10,
          }}
        >
          ↑ {unreadCount} new
        </button>
      )}
    </div>
  );
}

function ActivityItem({ activity, onClick, isUnread }) {
  const { type, incident, timestamp } = activity;

  const config = {
    incident_created: { icon: '⚠️', label: 'New Incident', color: 'var(--danger-light)' },
    incident_updated: { icon: '📝', label: 'Updated', color: 'var(--info)' },
    incident_deleted: { icon: '🗑️', label: 'Deleted', color: 'var(--text-muted)' },
    incident_resolved: { icon: '✅', label: 'Resolved', color: 'var(--success)' },
    timeline_added: { icon: '📢', label: 'New Update', color: 'var(--warning)' },
    timeline_updated: { icon: '✎', label: 'Edit', color: 'var(--info)' },
    timeline_deleted: { icon: '🗑️', label: 'Removed', color: 'var(--text-muted)' },
  }[type] || { icon: '•', label: 'Activity', color: 'var(--text-muted)' };

  const timeAgo = timestamp
    ? formatDistanceToNow(new Date(timestamp), { addSuffix: true })
    : 'just now';

  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        borderLeft: isUnread ? `3px solid ${config.color}` : '3px solid transparent',
        background: isUnread ? 'var(--hover-subtle)' : 'transparent',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = isUnread ? 'var(--hover-subtle)' : 'transparent';
      }}
    >
      {/* Meta row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <span style={{ fontSize: '12px' }}>{config.icon}</span>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            color: config.color,
          }}
        >
          {config.label}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {timeAgo}
        </span>
      </div>

      {/* Incident title */}
      {incident && (
        <div>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              lineHeight: 1.4,
              marginBottom: '4px',
            }}
          >
            {incident.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {incident.domain_name && (
              <Badge color={incident.domain_color}>{incident.domain_name}</Badge>
            )}
            {incident.severity && <SeverityBadge level={Number(incident.severity)} />}
          </div>
        </div>
      )}
    </div>
  );
}
