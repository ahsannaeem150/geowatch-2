import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBarModePill from './TopBarModePill.jsx';
import TopBarDateControl from './TopBarDateControl.jsx';
import BrandLogo from '../Brand/BrandLogo.jsx';
import {
  Hexagon,
  Plus,
  List,
  LogOut,
  ChevronDown,
  Zap,
  Search,
  Radio,
  Command,
  LayoutDashboard,
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
  user,
  onLogout,
  compactMode,
  isLiveMode = true,
  onSaveReturnView,
}) {
  const isLive = true;
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const iconSize = (n) => (compactMode ? Math.round(n * 0.9) : n);

  // Slim mode: below ~1860px viewport the full bar would overflow (this bar
  // carries a Dashboard button + Incidents/Zones links), so the search box
  // narrows, Dashboard/Advanced go icon-only, the decorative LIVE pill, the
  // Active label, the Today shortcut, and the user name hide, and the date
  // inputs shrink.
  const [slim, setSlim] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1860px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1860px)');
    const onChange = (e) => setSlim(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const displayName = useMemo(() => getDisplayName(user), [user]);
  const initials = useMemo(() => getInitials(user), [user]);

  const actionBtn = {
    display: 'flex',
    alignItems: 'center',
    gap: 'calc(5px * var(--admin-ui-scale))',
    padding: 'calc(5px * var(--admin-ui-scale)) calc(8px * var(--admin-ui-scale))',
    fontSize: 'calc(11px * var(--admin-ui-scale))',
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
        height: 'calc(54px * var(--admin-ui-scale))',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 calc(12px * var(--admin-ui-scale))',
        flexShrink: 0,
        zIndex: 100,
      }}
    >
      {/* Left: brand + search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(8px * var(--admin-ui-scale))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(10px * var(--admin-ui-scale))' }}>
          <BrandLogo
            variant="mark"
            height={32}
            style={{
              height: 'calc(32px * var(--admin-ui-scale))',
              flexShrink: 0,
              borderRadius: 'var(--radius-md)',
              filter: 'drop-shadow(0 0 6px rgba(34, 211, 238, 0.45))',
            }}
          />
          <span
            style={{
              fontSize: 'calc(15px * var(--admin-ui-scale))',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.3px',
            }}
          >
            IntelMap24
          </span>
          <span
            style={{
              fontSize: 'calc(9px * var(--admin-ui-scale))',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1.2px',
              color: 'var(--text-muted)',
              padding: 'calc(2px * var(--admin-ui-scale)) calc(8px * var(--admin-ui-scale))',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              flexShrink: 0,
            }}
          >
            Super Admin
          </span>
        </div>

        {/* Back to console */}
        <button
          onClick={() => navigate('/superadmin')}
          title="Back to console"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'calc(6px * var(--admin-ui-scale))',
            padding: 'calc(5px * var(--admin-ui-scale)) calc(8px * var(--admin-ui-scale))',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-secondary)',
            fontSize: 'calc(11px * var(--admin-ui-scale))',
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
          <LayoutDashboard size={iconSize(13)} />
          {!slim && <span>Dashboard</span>}
        </button>

        {/* Search trigger */}
        <button
          onClick={() => onOpenSearch?.()}
          title="Search incidents (⌘K)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'calc(8px * var(--admin-ui-scale))',
            padding: 'calc(6px * var(--admin-ui-scale)) calc(10px * var(--admin-ui-scale))',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-muted)',
            fontSize: 'calc(13px * var(--admin-ui-scale))',
            cursor: 'pointer',
            minWidth: slim ? 'calc(150px * var(--admin-ui-scale))' : 'calc(190px * var(--admin-ui-scale))',
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
          <Search size={iconSize(15)} />
          <span style={{ flex: 1, textAlign: 'left' }}>Search incidents and locations…</span>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'calc(2px * var(--admin-ui-scale))',
              fontSize: 'calc(11px * var(--admin-ui-scale))',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              background: 'var(--bg-surface)',
              padding: 'calc(2px * var(--admin-ui-scale)) calc(6px * var(--admin-ui-scale))',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <Command size={iconSize(10)} />
            <span>K</span>
          </span>
        </button>

        <button
          onClick={() => onOpenAdvancedSearch?.()}
          title="Open advanced search page"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'calc(6px * var(--admin-ui-scale))',
            padding: 'calc(5px * var(--admin-ui-scale)) calc(8px * var(--admin-ui-scale))',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-secondary)',
            fontSize: 'calc(11px * var(--admin-ui-scale))',
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
          <Search size={iconSize(13)} />
          {!slim && <span>Advanced</span>}
        </button>

        {onOpenActiveDrawer && (
          <button
            onClick={onOpenActiveDrawer}
            title={`${activeCount} active${overdueCount > 0 ? ` · ${overdueCount} 24h+` : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'calc(7px * var(--admin-ui-scale))',
              padding: 'calc(5px * var(--admin-ui-scale)) calc(10px * var(--admin-ui-scale))',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-secondary)',
              fontSize: 'calc(11px * var(--admin-ui-scale))',
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
            <Radio size={iconSize(13)} />
            {!slim && <span>Active</span>}
            <span
              style={{
                minWidth: 'calc(20px * var(--admin-ui-scale))',
                height: 'calc(18px * var(--admin-ui-scale))',
                padding: '0 calc(6px * var(--admin-ui-scale))',
                borderRadius: '999px',
                background: 'var(--accent-subtle-bg)',
                border: '1px solid var(--accent-subtle-border)',
                color: 'var(--accent-light)',
                fontSize: 'calc(10px * var(--admin-ui-scale))',
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

      {/* Center: mode pill + date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(12px * var(--admin-ui-scale))' }}>
        <TopBarModePill
          slim={slim}
          isLiveMode={isLiveMode}
          dateRange={dateRange}
          onResetToToday={onResetToToday}
        />

        <TopBarDateControl
          slim={slim}
          dateRange={dateRange}
          onDateRangeChange={onDateRangeChange}
          onResetToToday={onResetToToday}
        />
      </div>

      {/* Right: actions + user */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(10px * var(--admin-ui-scale))' }}>
        <button
          onClick={onToggleFocusMode}
          title="Toggle focus mode"
          style={{
            ...actionBtn,
            color: isFocusMode ? 'var(--accent-light)' : 'var(--text-secondary)',
            borderColor: isFocusMode ? 'var(--accent-light)' : 'var(--border-subtle)',
          }}
        >
          <Zap size={iconSize(14)} />
          {isFocusMode ? 'Exit Focus' : 'Focus'}
        </button>

        <button
          style={actionBtn}
          onClick={() => {
            // Save the return view so the directory's Back control restores
            // this exact map state (camera/selection/dateRange).
            onSaveReturnView?.();
            navigate('/superadmin/incidents');
          }}
          title="Incidents directory"
        >
          <List size={iconSize(13)} />
          Incidents
        </button>
        <button
          style={actionBtn}
          onClick={() => {
            onSaveReturnView?.();
            navigate('/superadmin/zones');
          }}
          title="Zones directory"
        >
          <Hexagon size={iconSize(13)} />
          Zones
        </button>

        <button style={actionBtn} onClick={onAddZone}>
          <Hexagon size={iconSize(13)} />
          Add Zone
        </button>
        <button style={primaryBtn} onClick={onAddIncident}>
          <Plus size={iconSize(13)} />
          Add Incident
        </button>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setUserMenuOpen((p) => !p)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'calc(6px * var(--admin-ui-scale))',
              padding: slim
                ? 'calc(2px * var(--admin-ui-scale))'
                : 'calc(2px * var(--admin-ui-scale)) calc(2px * var(--admin-ui-scale)) calc(2px * var(--admin-ui-scale)) calc(10px * var(--admin-ui-scale))',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-secondary)',
              fontSize: 'calc(11px * var(--admin-ui-scale))',
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
            {!slim && (
              <span
                style={{
                  maxWidth: 'calc(120px * var(--admin-ui-scale))',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {displayName}
              </span>
            )}
            <ChevronDown
              size={iconSize(12)}
              style={{
                transition: 'transform 0.15s ease',
                transform: userMenuOpen ? 'rotate(180deg)' : 'none',
              }}
            />
            <div
              style={{
                width: 'calc(24px * var(--admin-ui-scale))',
                height: 'calc(24px * var(--admin-ui-scale))',
                borderRadius: '50%',
                background: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'calc(9px * var(--admin-ui-scale))',
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
                width: 'calc(240px * var(--admin-ui-scale))',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                padding: 'calc(14px * var(--admin-ui-scale))',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 200,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(12px * var(--admin-ui-scale))', marginBottom: 'calc(14px * var(--admin-ui-scale))' }}>
                <div
                  style={{
                    width: 'calc(34px * var(--admin-ui-scale))',
                    height: 'calc(34px * var(--admin-ui-scale))',
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 'calc(11px * var(--admin-ui-scale))',
                    fontWeight: 700,
                    color: 'var(--text-on-accent)',
                    border: '2px solid var(--border-subtle)',
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 'calc(12px * var(--admin-ui-scale))', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {displayName}
                  </div>
                  <div
                    style={{
                      fontSize: 'calc(11px * var(--admin-ui-scale))',
                      color: 'var(--text-muted)',
                      marginTop: 'calc(2px * var(--admin-ui-scale))',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {user?.email || ''}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(6px * var(--admin-ui-scale))', marginTop: 'calc(6px * var(--admin-ui-scale))' }}>
                    <span
                      style={{
                        width: 'calc(7px * var(--admin-ui-scale))',
                        height: 'calc(7px * var(--admin-ui-scale))',
                        borderRadius: '50%',
                        background: 'var(--success)',
                        boxShadow: '0 0 6px var(--success)',
                      }}
                    />
                    <span style={{ fontSize: 'calc(11px * var(--admin-ui-scale))', color: 'var(--success)', fontWeight: 700 }}>Online</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'calc(8px * var(--admin-ui-scale))', marginBottom: 'calc(14px * var(--admin-ui-scale))' }}>
                <span
                  style={{
                    padding: 'calc(3px * var(--admin-ui-scale)) calc(8px * var(--admin-ui-scale))',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--badge-amber-bg)',
                    color: 'var(--badge-amber-text)',
                    fontSize: 'calc(11px * var(--admin-ui-scale))',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  Super Admin
                </span>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                <button
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 'calc(8px * var(--admin-ui-scale))',
                    padding: 'calc(8px * var(--admin-ui-scale)) calc(12px * var(--admin-ui-scale))',
                    fontSize: 'calc(13px * var(--admin-ui-scale))',
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
                  <LogOut size={iconSize(14)} />
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
