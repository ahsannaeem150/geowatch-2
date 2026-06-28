import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hexagon, Plus, Map as MapIcon, Shield, LogOut, ChevronDown, Zap } from 'lucide-react';
import Omnibox from './Omnibox.jsx';

const styles = {
  header: {
    height: '60px',
    background: 'var(--bg-surface)',
    borderBottom: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    flexShrink: 0,
    zIndex: 100,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logo: {
    width: '32px',
    height: '32px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 700,
    color: '#f2f2f2',
    boxShadow: '0 0 20px var(--accent-glow-strong)',
  },
  brandText: {
    fontSize: '17px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.3px',
  },
  rolePill: {
    fontSize: '10px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '1.2px',
    color: 'var(--text-muted)',
    padding: '3px 10px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
  },
  modePill: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 16px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '12px',
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
    padding: '6px 10px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    outline: 'none',
    cursor: 'pointer',
    width: '120px',
  },
  todayBtn: {
    padding: '6px 12px',
    fontSize: '11px',
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
    gap: '6px',
    padding: '6px 12px',
    fontSize: '12px',
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
    gap: '6px',
    padding: '6px 14px',
    fontSize: '12px',
    fontWeight: 700,
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--accent)',
    background: 'var(--accent)',
    color: '#fff',
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
    fontSize: '13px',
    cursor: 'pointer',
  },
};

export default function MapHudBar({
  layoutLabel = 'Layout A',
  onToggleFocusMode,
  isFocusMode,
  onAddIncident,
  onAddZone,
  onOpenZones,
}) {
  const navigate = useNavigate();
  const [isLive] = useState(true);
  const [dateRange, setDateRange] = useState({ from: '2026-06-27', to: '2026-06-27' });
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header style={styles.header}>
      {/* Left: brand + search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={styles.brand}>
          <div style={styles.logo}>G</div>
          <span style={styles.brandText}>GeoWatch</span>
          <span style={styles.rolePill}>Admin</span>
        </div>

        <Omnibox />
      </div>

      {/* Center: mode + date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div
          style={{
            ...styles.modePill,
            background: isLive ? 'rgba(90, 1, 28, 0.2)' : 'var(--alert-warning-bg)',
            border: `1px solid ${isLive ? 'rgba(159, 18, 57, 0.5)' : 'var(--alert-warning-border)'}`,
            color: isLive ? 'var(--danger-light)' : 'var(--warning)',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
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
          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>→</span>
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span
          style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            padding: '4px 10px',
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {layoutLabel}
        </span>

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
          <MapIcon size={14} />
          Zones
        </button>
        <button style={styles.actionBtn} onClick={onAddZone}>
          <Hexagon size={14} />
          Add Zone
        </button>
        <button style={styles.primaryBtn} onClick={onAddIncident}>
          <Plus size={14} />
          Add Incident
        </button>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setUserMenuOpen((p) => !p)}
            style={styles.userPill}
          >
            <Shield size={14} />
            <span>System Administrator</span>
            <ChevronDown size={14} />
          </button>
          {userMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                padding: '6px',
                minWidth: '160px',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 200,
              }}
            >
              <div
                style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                Signed in as admin
              </div>
              <button
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
