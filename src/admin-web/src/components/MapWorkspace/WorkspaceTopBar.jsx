import React, { useState, useMemo } from 'react';
import {
  Hexagon,
  Plus,
  Map as MapIcon,
  LogOut,
  ChevronDown,
  Zap,
  Search,
  Radio,
  Command,
} from 'lucide-react';

function getInitials(user) {
  const full = user?.fullName || user?.full_name || '';
  if (full) {
    const parts = full.trim().split(/\s+/);
    const first = parts[0]?.[0] || '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return `${first}${last}`.toUpperCase() || 'U';
  }
  const email = user?.email || '';
  return email ? email[0].toUpperCase() : 'U';
}

function getDisplayName(user) {
  return user?.fullName || user?.full_name || user?.email || 'User';
}

function getRoleLabel(role) {
  if (role === 'super_admin') return 'Super Admin';
  if (role === 'admin') return 'Admin';
  return role || 'Staff';
}

export default function WorkspaceTopBar({
  dateRange,
  onDateRangeChange,
  onResetToToday,
  onOpenSearch,
  onOpenAdvancedSearch,
  activeCount = 0,
  overdueCount = 0,
  onOpenActiveDrawer,
  onToggleFocusMode,
  isFocusMode,
  onAddIncident,
  onAddZone,
  onOpenZones,
  user,
  onLogout,
}) {
  const isLive = true;
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const displayName = useMemo(() => getDisplayName(user), [user]);
  const initials = useMemo(() => getInitials(user), [user]);
  const roleLabel = useMemo(() => getRoleLabel(user?.role), [user?.role]);

  const actionBtn = {
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
  };

  const primaryBtn = {
    ...actionBtn,
    border: '1px solid var(--accent)',
    background: 'var(--accent)',
    color: 'var(--text-on-accent)',
  };

  return (
    <header
      style={{
        height: '54px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        flexShrink: 0,
        zIndex: 100,
      }}
    >
      {/* Left: brand + search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
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
              flexShrink: 0,
            }}
          >
            G
          </div>
          <span
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.3px',
            }}
          >
            GeoWatch
          </span>
          <span
            style={{
              fontSize: '9px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1.2px',
              color: 'var(--text-muted)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              flexShrink: 0,
            }}
          >
            Admin
          </span>
        </div>

        {/* Search trigger */}
        <button
          onClick={() => onOpenSearch?.()}
          title="Search incidents (⌘K)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 10px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-muted)',
            fontSize: '13px',
            cursor: 'pointer',
            minWidth: '220px',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent-light)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
            e.currentTarget.style.color = 'var(--text-muted)';
          }}
        >
          <Search size={15} />
          <span style={{ flex: 1, textAlign: 'left' }}>Search incidents and locations…</span>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              background: 'var(--bg-surface)',
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <Command size={10} />
            <span>K</span>
          </span>
        </button>

        <button
          onClick={() => onOpenAdvancedSearch?.()}
          title="Open advanced search page"
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
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 8px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '1px',
            background: 'var(--alert-error-bg)',
            border: '1px solid var(--alert-error-border)',
            color: 'var(--badge-red-text)',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'currentColor',
              boxShadow: '0 0 10px currentColor',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
          LIVE MODE
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) =>
              onDateRangeChange?.({ from: e.target.value, to: dateRange.to })
            }
            style={{
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
            }}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>→</span>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) =>
              onDateRangeChange?.({ from: dateRange.from, to: e.target.value })
            }
            style={{
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
            }}
          />
          <button
            onClick={onResetToToday}
            style={{
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
            }}
          >
            Today
          </button>
        </div>
      </div>

      {/* Right: actions + user */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={onToggleFocusMode}
          title="Toggle focus mode"
          style={{
            ...actionBtn,
            color: isFocusMode ? 'var(--accent-light)' : 'var(--text-secondary)',
            borderColor: isFocusMode ? 'var(--accent-light)' : 'var(--border-subtle)',
          }}
        >
          <Zap size={14} />
          {isFocusMode ? 'Exit Focus' : 'Focus'}
        </button>

        <button style={actionBtn} onClick={onOpenZones}>
          <MapIcon size={13} />
          Zones
        </button>
        <button style={actionBtn} onClick={onAddZone}>
          <Hexagon size={13} />
          Add Zone
        </button>
        <button style={primaryBtn} onClick={onAddIncident}>
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
            <span
              style={{
                maxWidth: '160px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {displayName}
            </span>
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
                flexShrink: 0,
              }}
            >
              {initials}
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
                  {initials}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {displayName}
                  </div>
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
                    {user?.email || ''}
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
                  {roleLabel}
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
                  onClick={() => {
                    setUserMenuOpen(false);
                    onLogout?.();
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
