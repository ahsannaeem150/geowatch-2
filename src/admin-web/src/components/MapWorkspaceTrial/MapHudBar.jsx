import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hexagon, Plus, Map as MapIcon, LogOut, ChevronDown, Zap, Search, Radio } from 'lucide-react';
import Omnibox from './Omnibox.jsx';

const styles = {
  header: {
    height: '54px',
    background: 'var(--bg-surface)',
    borderBottom: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 12px',
    flexShrink: 0,
    zIndex: 100,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logo: {
    width: '28px',
    height: '28px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--text-on-accent)',
    boxShadow: '0 0 20px var(--accent-glow-strong)',
  },
  brandText: {
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.3px',
  },
  rolePill: {
    fontSize: '9px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '1.2px',
    color: 'var(--text-muted)',
    padding: '2px 8px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
  },
  modePill: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '5px 8px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '1px',
  },
  dateGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  dateInput: {
    background: 'var(--bg-input)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    padding: '5px 8px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    outline: 'none',
    cursor: 'pointer',
    width: '124px',
  },
  todayBtn: {
    padding: '5px 10px',
    fontSize: '10px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-subtle)',
    background: 'var(--bg-input)',
    color: 'var(--accent-light)',
    cursor: 'pointer',
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '5px 8px',
    fontSize: '11px',
    fontWeight: 700,
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-subtle)',
    background: 'var(--bg-input)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  primaryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '5px 10px',
    fontSize: '11px',
    fontWeight: 700,
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--accent)',
    background: 'var(--accent)',
    color: 'var(--text-on-accent)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  userPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 12px',
    background: 'var(--bg-input)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    cursor: 'pointer',
  },
};

export default function MapHudBar({
  onToggleFocusMode,
  isFocusMode,
  onAddIncident,
  onAddZone,
  onOpenZones,
  incidents,
  savedIds,
  onSelectIncident,
  activeCount = 0,
  overdueCount = 0,
  onOpenActiveDrawer,
}) {
  const navigate = useNavigate();
  const [isLive] = useState(true);
  const [dateRange, setDateRange] = useState({ from: '2026-06-27', to: '2026-06-27' });
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header style={styles.header}>
      {/* Left: brand + search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={styles.brand}>
          <div style={styles.logo}>G</div>
          <span style={styles.brandText}>GeoWatch</span>
          <span style={styles.rolePill}>Admin</span>
        </div>

        <Omnibox
          incidents={incidents}
          savedIds={savedIds}
          onSelectIncident={onSelectIncident}
          onAddIncident={onAddIncident}
          onAddZone={onAddZone}
          onOpenLayers={onOpenZones}
          onToggleFocusMode={onToggleFocusMode}
          onOpenAdvancedSearch={() => navigate('/trial/power-search')}
        />

        <button
          onClick={() => navigate('/trial/power-search')}
          title="Open advanced search"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 8px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-secondary)',
            fontSize: '11px',
            fontWeight: 700,
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
          <Search size={13} />
          <span>Advanced</span>
        </button>

        {onOpenActiveDrawer && (
          <button
            onClick={onOpenActiveDrawer}
            title={`${activeCount} active${overdueCount > 0 ? ` · ${overdueCount} overdue` : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '5px 10px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 700,
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
            <Radio size={13} />
            <span>Active</span>
            <span
              style={{
                minWidth: '20px',
                height: '18px',
                padding: '0 6px',
                borderRadius: '999px',
                background: 'var(--accent-subtle-bg)',
                border: '1px solid var(--accent-subtle-border)',
                color: 'var(--accent-light)',
                fontSize: '10px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {activeCount > 99 ? '99+' : activeCount}
            </span>
          </button>
        )}
      </div>

      {/* Center: mode + date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            ...styles.modePill,
            background: isLive ? 'var(--alert-error-bg)' : 'var(--alert-warning-bg)',
            border: `1px solid ${isLive ? 'var(--alert-error-border)' : 'var(--alert-warning-border)'}`,
            color: isLive ? 'var(--badge-red-text)' : 'var(--warning)',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'currentColor',
              boxShadow: isLive ? '0 0 10px currentColor' : 'none',
              animation: isLive ? 'pulse 2s ease-in-out infinite' : 'none',
            }}
          />
          {isLive ? 'LIVE MODE' : 'HISTORIC MODE'}
        </div>

        <div style={styles.dateGroup}>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange((p) => ({ ...p, from: e.target.value }))}
            style={styles.dateInput}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>→</span>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange((p) => ({ ...p, to: e.target.value }))}
            style={styles.dateInput}
          />
          <button style={styles.todayBtn}>Today</button>
        </div>
      </div>

      {/* Right: actions + user */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={onToggleFocusMode}
          title="Toggle focus mode"
          style={{
            ...styles.actionBtn,
            color: isFocusMode ? 'var(--accent-light)' : 'var(--text-secondary)',
            borderColor: isFocusMode ? 'var(--accent-light)' : 'var(--border-subtle)',
          }}
        >
          <Zap size={14} />
          {isFocusMode ? 'Exit Focus' : 'Focus'}
        </button>

        <button style={styles.actionBtn} onClick={onOpenZones}>
          <MapIcon size={13} />
          Zones
        </button>
        <button style={styles.actionBtn} onClick={onAddZone}>
          <Hexagon size={13} />
          Add Zone
        </button>
        <button style={styles.primaryBtn} onClick={onAddIncident}>
          <Plus size={13} />
          Add Incident
        </button>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setUserMenuOpen((p) => !p)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 2px 2px 10px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-hover)';
              e.currentTarget.style.background = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.background = 'var(--bg-input)';
            }}
          >
            <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>System Administrator</span>
            <ChevronDown
              size={12}
              style={{
                transition: 'transform 0.15s ease',
                transform: userMenuOpen ? 'rotate(180deg)' : 'none',
              }}
            />
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '9px',
                fontWeight: 700,
                color: 'var(--text-on-accent)',
                border: '2px solid var(--border-subtle)',
              }}
            >
              SA
            </div>
          </button>
          {userMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '240px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 200,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--text-on-accent)',
                    border: '2px solid var(--border-subtle)',
                    flexShrink: 0,
                  }}
                >
                  SA
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>System Administrator</div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      marginTop: '2px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    admin@geowatch.local
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: 'var(--success)',
                        boxShadow: '0 0 6px var(--success)',
                      }}
                    />
                    <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 700 }}>Online</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--badge-amber-bg)',
                    color: 'var(--badge-amber-text)',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  Admin
                </span>
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--badge-purple-bg)',
                    color: 'var(--badge-purple-text)',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  Staff
                </span>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                <button
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-hover)';
                    e.currentTarget.style.borderColor = 'var(--border-hover)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bg-input)';
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  <LogOut size={14} />
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
