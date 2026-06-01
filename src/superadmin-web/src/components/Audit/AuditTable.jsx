import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronDown, ChevronRight, Loader2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { getAuditActionColor, getAuditActionShortLabel } from '../../utils/audit-colors.js';

function ActionBadge({ action }) {
  const color = getAuditActionColor(action);
  const prefix = action.split('_')[0];
  const shortLabel = getAuditActionShortLabel(action);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
        padding: '3px 8px',
        borderRadius: 4,
        background: `${color}18`,
        color,
        fontFamily: 'var(--font-mono)',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }}
      />
      {prefix} {shortLabel}
    </span>
  );
}

function DetailsCell({ details }) {
  const [expanded, setExpanded] = useState(false);
  if (!details || Object.keys(details).length === 0) {
    return <span style={{ color: 'var(--text-disabled)', fontSize: 12 }}>—</span>;
  }

  const text = JSON.stringify(details, null, 2);
  const isLong = text.length > 80;
  const display = expanded ? text : text.slice(0, 80);

  return (
    <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'inherit' }}>
        {display}{isLong && !expanded && '...'}
      </pre>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--navy-400)',
            fontSize: 10,
            cursor: 'pointer',
            padding: '2px 0',
            fontFamily: 'var(--font-sans)',
            fontWeight: 500,
          }}
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      )}
    </div>
  );
}

export default function AuditTable({
  logs,
  pagination,
  loading,
  onPageChange,
  onUserClick,
  onTargetClick,
}) {
  return (
    <div>
      {/* Table */}
      <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
              {['Time', 'User', 'Action', 'Target', 'Details', 'IP'].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px', display: 'block' }} />
                  Loading audit logs...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  No audit logs match the current filters
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr
                  key={log.id}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    transition: 'background var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Time */}
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 11 }}>{format(new Date(log.created_at), 'MMM d, HH:mm:ss')}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-disabled)', marginTop: 1 }}>
                      {format(new Date(log.created_at), 'yyyy')}
                    </div>
                  </td>

                  {/* User */}
                  <td style={{ padding: '10px 12px' }}>
                    {log.user_id ? (
                      <button
                        onClick={() => onUserClick?.(log.user_id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-sans)',
                        }}
                        title="Filter by this user"
                      >
                        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {log.user_full_name || log.user_email || 'Unknown'}
                          {log.actor_type === 'public_user' && (
                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                                padding: '1px 5px',
                                borderRadius: 3,
                                background: 'rgba(139, 92, 246, 0.12)',
                                color: '#8b5cf6',
                              }}
                            >
                              Public
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--navy-400)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{log.user_email}</span>
                          <ExternalLink size={10} />
                        </div>
                      </button>
                    ) : (
                      <span style={{ color: 'var(--text-disabled)', fontSize: 12 }}>System</span>
                    )}
                  </td>

                  {/* Action */}
                  <td style={{ padding: '10px 12px' }}>
                    <ActionBadge action={log.action} />
                  </td>

                  {/* Target */}
                  <td style={{ padding: '10px 12px' }}>
                    {log.target_type ? (
                      <button
                        onClick={() => onTargetClick?.(log.target_type, log.target_id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-sans)',
                        }}
                        title="View target"
                      >
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                          {log.target_type}
                        </div>
                        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--navy-400)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <span>{log.target_id?.slice(0, 12)}...</span>
                          <ExternalLink size={10} />
                        </div>
                      </button>
                    ) : (
                      <span style={{ color: 'var(--text-disabled)', fontSize: 12 }}>—</span>
                    )}
                  </td>

                  {/* Details */}
                  <td style={{ padding: '10px 12px', maxWidth: 280 }}>
                    <DetailsCell details={log.details} />
                  </td>

                  {/* IP */}
                  <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: 11 }}>
                    {log.ip_address || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 4px',
            marginTop: 4,
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PageButton disabled={pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)}>
              <ArrowLeft size={14} />
            </PageButton>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
              <PageButton key={page} active={page === pagination.page} onClick={() => onPageChange(page)}>
                {page}
              </PageButton>
            ))}
            <PageButton disabled={pagination.page >= pagination.totalPages} onClick={() => onPageChange(pagination.page + 1)}>
              <ArrowRight size={14} />
            </PageButton>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function PageButton({ children, onClick, disabled, active }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 30,
        height: 30,
        padding: '0 8px',
        borderRadius: 6,
        border: 'none',
        background: active ? 'var(--navy-600)' : 'transparent',
        color: active ? '#fff' : disabled ? 'var(--text-disabled)' : 'var(--text-secondary)',
        fontSize: 13,
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--font-sans)',
        transition: 'all var(--transition-fast)',
      }}
      onMouseEnter={(e) => {
        if (!disabled && !active) {
          e.currentTarget.style.background = 'var(--bg-hover)';
          e.currentTarget.style.color = 'var(--text-primary)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !active) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }
      }}
    >
      {children}
    </button>
  );
}
