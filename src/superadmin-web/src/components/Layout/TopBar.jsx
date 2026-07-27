import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  LogOut,
  Palette,
  Map,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  Clock,
  X,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import ThemeToggle from '@shared/components/ThemeToggle.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useStyle } from '@shared/useStyle.js';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  getSystemHealth,
} from '../../services/api.js';

const STYLES = [
  { key: 'tactical', label: 'Tac', short: 'T' },
  { key: 'saas', label: 'SaaS', short: 'S' },
  { key: 'glass', label: 'Glass', short: 'G' },
];

const ROUTE_LABELS = [
  { match: /^\/superadmin$/, label: 'Dashboard' },
  { match: /^\/superadmin\/users/, label: 'Staff Users' },
  { match: /^\/superadmin\/public-users/, label: 'Public Users' },
  { match: /^\/superadmin\/audit/, label: 'System Activity' },
  { match: /^\/superadmin\/public-activity/, label: 'Public Activity' },
  { match: /^\/superadmin\/recycle-bin/, label: 'Recycle Bin' },
  { match: /^\/superadmin\/domains/, label: 'Domains' },
  { match: /^\/superadmin\/zone-categories/, label: 'Zone Categories' },
  { match: /^\/superadmin\/system/, label: 'System' },
  { match: /^\/superadmin\/export/, label: 'Export' },
  { match: /^\/superadmin\/x-archive-debug/, label: 'X Archive Debug' },
  { match: /^\/superadmin\/incident\//, label: 'Incident Detail' },
  { match: /^\/superadmin\/zone\//, label: 'Zone Detail' },
];

const NOTIF_TYPE_META = {
  incident_created: { Icon: AlertTriangle, color: 'var(--danger)' },
  incident_updated: { Icon: RefreshCw, color: 'var(--warning)' },
  incident_resolved: { Icon: CheckCircle, color: 'var(--success)' },
  timeline_added: { Icon: Clock, color: 'var(--navy-400)' },
  timeline_updated: { Icon: Clock, color: 'var(--navy-400)' },
  timeline_deleted: { Icon: Clock, color: 'var(--text-muted)' },
};

const HEALTH_COLORS = {
  healthy: 'var(--success)',
  degraded: 'var(--warning)',
  unhealthy: 'var(--danger)',
  unknown: 'var(--text-muted)',
};

const NOTIF_PAGE_SIZE = 10;

export default function TopBar() {
  const { user, logout } = useAuth();
  const { style, setStyle } = useStyle();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [styleMenuOpen, setStyleMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const styleMenuRef = useRef(null);

  // System health
  const [health, setHealth] = useState('unknown');

  // Notifications
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef(null);

  const pageLabel =
    ROUTE_LABELS.find((r) => r.match.test(location.pathname))?.label || 'Console';

  // ─── Dropdown close handling (outside click + Escape) ───
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
      if (styleMenuRef.current && !styleMenuRef.current.contains(e.target)) {
        setStyleMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    }
    function handleKey(e) {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setStyleMenuOpen(false);
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  // ─── System health polling (60s) ───
  useEffect(() => {
    let cancelled = false;
    async function checkHealth() {
      try {
        const res = await getSystemHealth();
        if (!cancelled) setHealth(res?.status || 'unknown');
      } catch (err) {
        // The API returns 503 for "unhealthy" — that payload still carries a status.
        if (!cancelled) setHealth(err?.data?.status || 'unknown');
      }
    }
    checkHealth();
    const timer = setInterval(checkHealth, 60000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  // ─── Unread count polling (60s, lightweight fetch) ───
  const refreshUnreadCount = useCallback(async () => {
    try {
      const res = await getNotifications({ limit: 1 });
      setUnreadCount(res?.unreadCount || 0);
    } catch {
      // fail silently — badge just stays stale
    }
  }, []);

  useEffect(() => {
    refreshUnreadCount();
    const timer = setInterval(refreshUnreadCount, 60000);
    return () => clearInterval(timer);
  }, [refreshUnreadCount]);

  // ─── Notification list fetching ───
  const fetchNotifications = useCallback(async (offset = 0, append = false) => {
    setNotifLoading(true);
    try {
      const res = await getNotifications({ limit: NOTIF_PAGE_SIZE, offset });
      const rows = res?.notifications || [];
      setNotifications((prev) => (append ? [...prev, ...rows] : rows));
      setHasMore(!!res?.hasMore);
      if (typeof res?.unreadCount === 'number') setUnreadCount(res.unreadCount);
    } catch {
      if (!append) setNotifications([]);
    } finally {
      setNotifLoading(false);
    }
  }, []);

  useEffect(() => {
    if (notifOpen) fetchNotifications(0, false);
  }, [notifOpen, fetchNotifications]);

  async function handleOpenNotification(n) {
    if (!n.is_read) {
      try {
        await markNotificationRead(n.id);
        setNotifications((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // still navigate even if the mark-read call fails
      }
    }
    setNotifOpen(false);
    const link = n.link_path || '';
    if (link.startsWith('/incident/') || link.startsWith('/zone/')) {
      navigate(`/superadmin${link}`);
    } else if (link) {
      navigate(link);
    }
  }

  async function handleDeleteNotification(e, id) {
    e.stopPropagation();
    const target = notifications.find((n) => n.id === id);
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (target && !target.is_read) setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  }

  const roleLabel = user?.role === 'super_admin' ? 'Super Admin' : 'Admin';
  const roleColor = user?.role === 'super_admin' ? 'var(--navy-400)' : 'var(--text-muted)';

  return (
    <header
      style={{
        height: 'var(--topbar-height)',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Breadcrumb / page title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
        <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Console</span>
        <span style={{ color: 'var(--text-muted)' }}>›</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{pageLabel}</span>
      </div>

      {/* Right section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Map doorway */}
        <button
          onClick={() => navigate('/superadmin/map')}
          title="Open map workspace"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '7px 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--primary)',
            background: 'var(--primary)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            transition: 'filter var(--transition-fast)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.12)')}
          onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
        >
          <Map size={15} />
          <span>Map</span>
        </button>

        {/* System health dot */}
        <button
          onClick={() => navigate('/superadmin/system')}
          title={`System: ${health} — click for details`}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 6,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: HEALTH_COLORS[health] || HEALTH_COLORS.unknown,
              boxShadow: `0 0 6px ${HEALTH_COLORS[health] || HEALTH_COLORS.unknown}`,
            }}
          />
        </button>

        {/* Style toggle */}
        <div ref={styleMenuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setStyleMenuOpen(!styleMenuOpen)}
            title="Interface style"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              textTransform: 'capitalize',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-strong)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <Palette size={14} />
            <span>{STYLES.find((s) => s.key === style)?.label || style}</span>
          </button>

          {styleMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                width: 140,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                padding: '4px',
                zIndex: 200,
                animation: 'fadeIn 0.15s ease forwards',
              }}
            >
              {STYLES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => {
                    setStyle(s.key);
                    setStyleMenuOpen(false);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: style === s.key ? 'var(--bg-active)' : 'transparent',
                    border: 'none',
                    color: style === s.key ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    textTransform: 'capitalize',
                    transition: 'background var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    if (style !== s.key) e.currentTarget.style.background = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    if (style !== s.key) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      fontWeight: 700,
                      background: style === s.key ? 'var(--primary)' : 'var(--bg-hover)',
                      color: style === s.key ? '#fff' : 'var(--text-muted)',
                    }}
                  >
                    {s.short}
                  </span>
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Notification bell */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            title="Notifications"
            style={{
              position: 'relative',
              background: 'transparent',
              border: 'none',
              color: notifOpen ? 'var(--text-primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => {
              if (!notifOpen) e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -4,
                  minWidth: 16,
                  height: 16,
                  padding: '0 4px',
                  background: 'var(--danger)',
                  borderRadius: 8,
                  border: '2px solid var(--bg-base)',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 700,
                  lineHeight: '12px',
                  textAlign: 'center',
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: 360,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 200,
                animation: 'fadeIn 0.15s ease forwards',
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Notifications
                </span>
                <button
                  onClick={handleMarkAllRead}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--navy-400)',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    padding: 0,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  Mark all read
                </button>
              </div>

              {/* List */}
              <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                {notifications.length === 0 && !notifLoading && (
                  <div
                    style={{
                      padding: '32px 14px',
                      textAlign: 'center',
                      fontSize: 13,
                      color: 'var(--text-muted)',
                    }}
                  >
                    No notifications yet
                  </div>
                )}
                {notifications.map((n) => {
                  const meta = NOTIF_TYPE_META[n.type] || NOTIF_TYPE_META.timeline_updated;
                  const TypeIcon = meta.Icon;
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleOpenNotification(n)}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        padding: '10px 14px',
                        cursor: 'pointer',
                        background: n.is_read ? 'transparent' : 'var(--badge-blue-bg)',
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background var(--transition-fast)',
                        position: 'relative',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--bg-hover)';
                        const btn = e.currentTarget.querySelector('[data-notif-delete]');
                        if (btn) btn.style.opacity = '1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = n.is_read
                          ? 'transparent'
                          : 'var(--badge-blue-bg)';
                        const btn = e.currentTarget.querySelector('[data-notif-delete]');
                        if (btn) btn.style.opacity = '0';
                      }}
                    >
                      <TypeIcon
                        size={16}
                        style={{ color: meta.color, flexShrink: 0, marginTop: 2 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          {!n.is_read && (
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: 'var(--badge-blue-text)',
                                flexShrink: 0,
                              }}
                            />
                          )}
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: n.is_read ? 500 : 600,
                              color: 'var(--text-primary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {n.title}
                          </span>
                        </div>
                        {n.body && (
                          <div
                            style={{
                              fontSize: 12,
                              color: 'var(--text-secondary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              marginTop: 2,
                            }}
                          >
                            {n.body}
                          </div>
                        )}
                        <div
                          style={{
                            fontSize: 11,
                            color: 'var(--text-muted)',
                            marginTop: 3,
                          }}
                        >
                          {n.created_at
                            ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true })
                            : ''}
                        </div>
                      </div>
                      <button
                        data-notif-delete
                        onClick={(e) => handleDeleteNotification(e, n.id)}
                        title="Delete notification"
                        style={{
                          opacity: 0,
                          transition: 'opacity var(--transition-fast)',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: 2,
                          borderRadius: 4,
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--danger)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
                {notifLoading && (
                  <div
                    style={{
                      padding: '14px',
                      textAlign: 'center',
                      fontSize: 12,
                      color: 'var(--text-muted)',
                    }}
                  >
                    Loading…
                  </div>
                )}
              </div>

              {/* Footer — load more */}
              {hasMore && (
                <button
                  onClick={() => fetchNotifications(notifications.length, true)}
                  disabled={notifLoading}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'transparent',
                    border: 'none',
                    borderTop: '1px solid var(--border-subtle)',
                    color: 'var(--navy-400)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    transition: 'background var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  Load more
                </button>
              )}
            </div>
          )}
        </div>

        {/* User dropdown */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--navy-600), var(--navy-800))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {user?.full_name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div style={{ textAlign: 'left', lineHeight: 1.3 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{user?.full_name || 'Admin'}</div>
              <div style={{ fontSize: 11, color: roleColor, fontWeight: 500 }}>{roleLabel}</div>
            </div>
            <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
          </button>

          {menuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: 200,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                padding: '6px',
                zIndex: 200,
                animation: 'fadeIn 0.15s ease forwards',
              }}
            >
              <div
                style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid var(--border-subtle)',
                  marginBottom: 4,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 500 }}>{user?.full_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user?.email}</div>
              </div>
              <button
                onClick={logout}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 6,
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--danger)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  transition: 'background var(--transition-fast)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--alert-error-bg)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
