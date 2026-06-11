import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Eye, EyeOff, Hexagon } from 'lucide-react';
import { getMarkerIcon } from '../marker-icons.js';

const LS_KEY = 'geowatch_legend_collapsed';

export default function MapLegend({
  domains = [],
  activeDomainFilters = new Set(),
  onToggleDomain,
  onShowAll,
  onHideAll,
  position = 'bottom-left',
  showZones = true,
  onToggleZones,
}) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(LS_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, String(collapsed));
    } catch {
      // ignore
    }
  }, [collapsed]);

  const posStyle =
    position === 'bottom-left'
      ? { left: '12px', bottom: '36px' }
      : { right: '12px', bottom: '36px' };

  if (domains.length === 0) return null;

  const allActive = activeDomainFilters.size === 0;
  const someActive = activeDomainFilters.size > 0 && activeDomainFilters.size < domains.length;

  return (
    <div
      style={{
        position: 'absolute',
        zIndex: 50,
        ...posStyle,
        maxWidth: '260px',
        width: 'max-content',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          padding: '8px 12px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: collapsed ? '8px' : '8px 8px 0 0',
          borderBottom: collapsed ? '1px solid var(--border-subtle)' : '1px solid var(--border-default)',
          color: 'var(--text-primary)',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: someActive ? '#f59e0b' : '#22c55e',
            }}
          />
          Legend
          {someActive && (
            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
              ({activeDomainFilters.size}/{domains.length})
            </span>
          )}
        </span>
        {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {/* Body */}
      {!collapsed && (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderTop: 'none',
            borderRadius: '0 0 8px 8px',
            padding: '8px 0',
            maxHeight: '320px',
            overflowY: 'auto',
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* Zones toggle (only when wired) */}
          {onToggleZones && (
            <button
              onClick={() => onToggleZones?.()}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '6px 12px 10px',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--border-subtle)',
                color: showZones ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                textAlign: 'left',
                opacity: showZones ? 1 : 0.5,
                transition: 'opacity 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <span
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '4px',
                  background: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Hexagon size={12} color="#fff" />
              </span>
              <span style={{ flex: 1 }}>Zones</span>
              {showZones ? (
                <Eye size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              ) : (
                <EyeOff size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              )}
            </button>
          )}

          {/* Bulk actions */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              padding: '0 12px 8px',
              borderBottom: '1px solid var(--border-subtle)',
              marginBottom: '4px',
            }}
          >
            <button
              onClick={onShowAll}
              style={{
                flex: 1,
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '4px',
                border: '1px solid var(--border-default)',
                background: allActive ? 'var(--bg-hover)' : 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Show all
            </button>
            <button
              onClick={onHideAll}
              style={{
                flex: 1,
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '4px',
                border: '1px solid var(--border-default)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Hide all
            </button>
          </div>

          {/* Domain list */}
          {domains.map((domain) => {
            const isActive = !activeDomainFilters.has(domain.slug);
            const icon = getMarkerIcon(domain.slug);
            return (
              <button
                key={domain.slug}
                onClick={() => onToggleDomain?.(domain.slug)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '6px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  textAlign: 'left',
                  opacity: isActive ? 1 : 0.5,
                  transition: 'opacity 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {/* Color + Icon */}
                <span
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: domain.color || '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: isActive ? `0 0 6px ${domain.color}80` : 'none',
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox={icon.viewBox}
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ overflow: 'visible' }}
                  >
                    <path d={icon.path} />
                  </svg>
                </span>

                {/* Name */}
                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {domain.name}
                </span>

                {/* Eye toggle */}
                {isActive ? (
                  <Eye size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                ) : (
                  <EyeOff size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
