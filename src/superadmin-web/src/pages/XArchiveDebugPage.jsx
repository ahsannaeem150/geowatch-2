import React, { useEffect, useState, useCallback } from 'react';
import {
  Loader2,
  RefreshCw,
  Camera,
  Archive,
  ArchiveRestore,
  ExternalLink,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  getXArchiveDebug,
  setAccountSuspended,
  checkXArchiveSource,
  snapshotXArchiveSource,
  archiveXArchiveSource,
} from '../services/api.js';



function Badge({ children, color = 'var(--text-muted)', bg = 'rgba(255,255,255,0.08)' }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        padding: '3px 8px',
        borderRadius: 4,
        background: bg,
        color,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

function Section({ title, children }) {
  return (
    <div
      style={{
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        marginBottom: 24,
      }}
    >
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text-primary)',
        }}
      >
        {title}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

export default function XArchiveDebugPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ accountId: '', archived: '', archiveReason: '' });
  const [actionLoading, setActionLoading] = useState({});
  const [preview, setPreview] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getXArchiveDebug(filters);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load X archive debug data');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function runAction(key, fn) {
    setActionLoading((prev) => ({ ...prev, [key]: true }));
    try {
      await fn();
      await fetchData();
    } catch (err) {
      setError(err.message || 'Action failed');
    } finally {
      setActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  }

  async function handleToggleSuspended(account) {
    await runAction(`account-${account.id}`, () =>
      setAccountSuspended(account.id, !account.is_suspended)
    );
  }

  async function handleCheck(source) {
    await runAction(`check-${source.id}`, () => checkXArchiveSource(source.id));
  }

  async function handleSnapshot(source) {
    await runAction(`snapshot-${source.id}`, async () => {
      const res = await snapshotXArchiveSource(source.id);
      setPreview(res?.media || null);
    });
  }

  async function handleArchiveToggle(source) {
    const next = !source.archived;
    const body = next
      ? { archived: true, archiveReason: 'manual' }
      : { archived: false };
    await runAction(`archive-${source.id}`, () => archiveXArchiveSource(source.id, body));
  }

  const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: 12 };
  const thStyle = {
    padding: '10px 12px',
    textAlign: 'left',
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    borderBottom: '1px solid var(--border-subtle)',
    whiteSpace: 'nowrap',
  };
  const tdStyle = {
    padding: '10px 12px',
    borderBottom: '1px solid var(--border-subtle)',
    color: 'var(--text-secondary)',
    verticalAlign: 'top',
  };

  return (
    <div style={{ padding: 24, maxWidth: 1600, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>X Archive Debug</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
            Inspect source accounts, X post sources, archive status, and manually trigger checks / snapshots.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239,68,68,0.12)',
            color: '#ef4444',
            marginBottom: 24,
            fontSize: 13,
          }}
        >
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
            <StatCard label="Accounts" value={data.stats.totalAccounts} />
            <StatCard label="X Posts" value={data.stats.totalXPostSources} />
            <StatCard label="Archived" value={data.stats.archivedCount} />
            <StatCard label="Deleted" value={data.stats.deletedCount} />
            <StatCard label="Suspended" value={data.stats.suspendedCount} />
            <StatCard label="Unavailable" value={data.stats.unavailableCount} />
          </div>

          <Section title={`Source Accounts (${data.accounts.length})`}>
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    {['Username', 'Display Name', 'Suspended', 'Last Fetched', 'Profile'].map((h) => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.accounts.map((account) => (
                    <tr key={account.id}>
                      <td style={tdStyle}>
                        <button
                          onClick={() => setFilters((f) => ({ ...f, accountId: account.id }))}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--navy-400)',
                            cursor: 'pointer',
                            padding: 0,
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          @{account.username}
                        </button>
                      </td>
                      <td style={tdStyle}>{account.display_name || '—'}</td>
                      <td style={tdStyle}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={account.is_suspended}
                            onChange={() => handleToggleSuspended(account)}
                            disabled={actionLoading[`account-${account.id}`]}
                          />
                          <span style={{ fontSize: 11 }}>{account.is_suspended ? 'Suspended' : 'Active'}</span>
                        </label>
                      </td>
                      <td style={tdStyle}>
                        {account.last_fetched_at
                          ? formatDistanceToNow(new Date(account.last_fetched_at), { addSuffix: true })
                          : '—'}
                      </td>
                      <td style={tdStyle}>
                        <a
                          href={account.profile_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: 'var(--navy-400)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <ExternalLink size={12} />
                          Open
                        </a>
                      </td>
                    </tr>
                  ))}
                  {data.accounts.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                        No source accounts found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title={`X Post Sources (${data.sources.length})`}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
              <select
                value={filters.accountId}
                onChange={(e) => setFilters((f) => ({ ...f, accountId: e.target.value }))}
                style={selectStyle}
              >
                <option value="">All accounts</option>
                {data.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    @{a.username}
                  </option>
                ))}
              </select>

              <select
                value={filters.archived}
                onChange={(e) => setFilters((f) => ({ ...f, archived: e.target.value }))}
                style={selectStyle}
              >
                <option value="">All statuses</option>
                <option value="true">Archived</option>
                <option value="false">Not archived</option>
              </select>

              <select
                value={filters.archiveReason}
                onChange={(e) => setFilters((f) => ({ ...f, archiveReason: e.target.value }))}
                style={selectStyle}
              >
                <option value="">All reasons</option>
                <option value="deleted">deleted</option>
                <option value="suspended">suspended</option>
                <option value="unavailable">unavailable</option>
                <option value="manual">manual</option>
              </select>

              <button onClick={() => setFilters({ accountId: '', archived: '', archiveReason: '' })} style={buttonStyle}>
                Clear filters
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    {[
                      'Incident',
                      'Account',
                      'Tweet URL',
                      'Status',
                      'Reason',
                      'Last Checked',
                      'Snapshot',
                      'Actions',
                    ].map((h) => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.sources.map((source) => (
                    <tr key={source.id}>
                      <td style={tdStyle}>{source.incident_title || source.incident_id}</td>
                      <td style={tdStyle}>
                        {source.account_username ? (
                          <span style={{ fontWeight: 500 }}>@{source.account_username}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={tdStyle}>
                        <a
                          href={source.source_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: 'var(--navy-400)', wordBreak: 'break-all' }}
                        >
                          {source.source_url}
                        </a>
                      </td>
                      <td style={tdStyle}>
                        {source.archived ? (
                          <Badge color="#ef4444" bg="rgba(239,68,68,0.12)">
                            <Archive size={10} /> Archived
                          </Badge>
                        ) : (
                          <Badge color="#22c55e" bg="rgba(34,197,94,0.12)">
                            <CheckCircle size={10} /> Live
                          </Badge>
                        )}
                      </td>
                      <td style={tdStyle}>{source.archive_reason || '—'}</td>
                      <td style={tdStyle}>
                        {source.last_checked_at
                          ? formatDistanceToNow(new Date(source.last_checked_at), { addSuffix: true })
                          : '—'}
                      </td>
                      <td style={tdStyle}>
                        {source.archive_media_url ? (
                          <button
                            onClick={() =>
                              setPreview({
                                sourceId: source.id,
                                url: source.archive_media_url,
                              })
                            }
                            style={buttonStyle}
                          >
                            Preview
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-disabled)' }}>—</span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <ActionBtn
                            onClick={() => handleCheck(source)}
                            loading={actionLoading[`check-${source.id}`]}
                            icon={<RefreshCw size={12} />}
                            label="Check"
                          />
                          <ActionBtn
                            onClick={() => handleSnapshot(source)}
                            loading={actionLoading[`snapshot-${source.id}`]}
                            icon={<Camera size={12} />}
                            label="Snapshot"
                          />
                          <ActionBtn
                            onClick={() => handleArchiveToggle(source)}
                            loading={actionLoading[`archive-${source.id}`]}
                            icon={source.archived ? <ArchiveRestore size={12} /> : <Archive size={12} />}
                            label={source.archived ? 'Unarchive' : 'Archive'}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {data.sources.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                        No X post sources found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>

          {preview && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: 24,
              }}
              onClick={() => setPreview(null)}
            >
              <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
                <button
                  onClick={() => setPreview(null)}
                  style={{
                    position: 'absolute',
                    top: -32,
                    right: 0,
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    fontSize: 20,
                    cursor: 'pointer',
                  }}
                >
                  ×
                </button>
                <img
                  src={preview.url}
                  alt="Archived snapshot"
                  style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 8, display: 'block' }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}
        </>
      )}

      {loading && !data && (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px', display: 'block' }} />
          Loading debug data…
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div
      style={{
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '14px 16px',
        background: 'var(--bg-surface)',
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
    </div>
  );
}

function ActionBtn({ onClick, loading, icon, label }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '5px 8px',
        borderRadius: 6,
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-elevated)',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        fontSize: 11,
        whiteSpace: 'nowrap',
      }}
    >
      {loading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : icon}
      {label}
    </button>
  );
}

const selectStyle = {
  padding: '6px 10px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-subtle)',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  fontSize: 12,
};

const buttonStyle = {
  padding: '6px 10px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-subtle)',
  background: 'var(--bg-surface)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  fontSize: 12,
};
