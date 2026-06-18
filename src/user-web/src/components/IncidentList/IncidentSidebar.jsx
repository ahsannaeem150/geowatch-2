import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SEVERITY_SCALE } from '@shared/constants.js';
import { useCategories } from '@shared/hooks/useCategories.js';
import IncidentListItem from './IncidentListItem.jsx';
import { IncidentDetailSidebar } from '@shared';
import { api, mapIncidentForShared } from '../../services/api.js';

export default function IncidentSidebar({
  incidents,
  selectedIncident,
  onSelectEvent,
  onBack,
  onNavigateToFullPage,
  loading,
  filters,
  onFilterChange,
  detailRefreshKey,
  tab = 'events',
  onTabChange,
  savedIds,
  onSaveChange,
  savedCount = 0,
}) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const { domains, getCategoriesByDomain } = useCategories();

  const fetchDetail = async (incidentId, opts = {}) => {
    if (!incidentId) return;
    if (!opts.silent) setDetailLoading(true);
    setDetailError('');
    try {
      const res = await api.getIncident(incidentId);
      setDetail(mapIncidentForShared(res.data));
    } catch (err) {
      if (!opts.silent) {
        setDetailError(err.message || 'Failed to load incident details');
        setDetail(null);
      }
    } finally {
      if (!opts.silent) setDetailLoading(false);
    }
  };

  const handleCheckSource = async (eventId, item) => {
    if (!selectedIncident?.id) return;
    try {
      await api.checkSource(selectedIncident.id, item.id);
      await fetchDetail(selectedIncident.id, { silent: true });
    } catch (err) {
      console.error('[handleCheckSource] failed:', err);
    }
  };

  useEffect(() => {
    if (selectedIncident?.id) {
      fetchDetail(selectedIncident.id);
    } else {
      setDetail(null);
      setDetailError('');
    }
  }, [selectedIncident?.id]);

  useEffect(() => {
    if (selectedIncident?.id && detailRefreshKey > 0) {
      fetchDetail(selectedIncident.id);
    }
  }, [detailRefreshKey, selectedIncident?.id]);

  const handleCopyIncidentLink = async (incidentId) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/incident/${incidentId}`);
    } catch {}
  };

  const handleNavigateToFullPage = (incidentId) => {
    if (onNavigateToFullPage) {
      onNavigateToFullPage(incidentId);
    } else {
      navigate(`/incident/${incidentId}`);
    }
  };

  const filteredIncidents = searchQuery.trim()
    ? incidents.filter((i) =>
        i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (i.description && i.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : incidents;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {selectedIncident ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'var(--bg-elevated)',
              flexShrink: 0,
            }}
          >
            <button
              onClick={onBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 10px',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--text-secondary)',
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.borderColor = 'var(--accent-light)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
              }}
            >
              ← Back to results
            </button>
          </div>
          {detailLoading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Loading incident details…
            </div>
          ) : detailError ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--danger)', fontSize: 13 }}>
              {detailError}
            </div>
          ) : detail ? (
            <IncidentDetailSidebar
              mode="user"
              incident={detail.incident}
              timeline={detail.timeline}
              onNavigateToFullPage={handleNavigateToFullPage}
              onCopyIncidentLink={handleCopyIncidentLink}
              onAutoCheck={handleCheckSource}
            />
          ) : null}
        </div>
      ) : (
        <>
          {/* Tab bar + Search & filters header */}
          <div
            style={{
              padding: '16px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {/* Tabs */}
            {onTabChange && (
              <div
                style={{
                  display: 'flex',
                  gap: '4px',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '3px',
                }}
              >
                <button
                  onClick={() => onTabChange('events')}
                  style={{
                    flex: 1,
                    padding: '5px 0',
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderRadius: '4px',
                    border: 'none',
                    background: tab === 'events' ? 'var(--bg-surface)' : 'transparent',
                    color: tab === 'events' ? 'var(--text-primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: tab === 'events' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  Events
                </button>
                <button
                  onClick={() => onTabChange('saved')}
                  style={{
                    flex: 1,
                    padding: '5px 0',
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderRadius: '4px',
                    border: 'none',
                    background: tab === 'saved' ? 'var(--bg-surface)' : 'transparent',
                    color: tab === 'saved' ? 'var(--text-primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: tab === 'saved' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  Saved
                  {savedCount > 0 && (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: 'var(--accent-light)',
                        background: 'var(--accent-subtle-bg)',
                        padding: '1px 6px',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      {savedCount}
                    </span>
                  )}
                </button>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: 'var(--text-muted)',
                  margin: 0,
                }}
              >
                {tab === 'saved' ? 'Saved' : 'Events'}
              </h3>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--accent-light)',
                  background: 'var(--accent-subtle-bg)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                {incidents.length}
              </span>
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search incidents..."
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontFamily: 'var(--font-sans)',
                outline: 'none',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent-light)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border-subtle)')}
            />

            {/* Domain filter chips */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                onClick={() => onFilterChange?.({ ...filters, categoryId: '' })}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid',
                  borderColor: !filters?.categoryId ? 'var(--accent-light)' : 'var(--border-subtle)',
                  background: !filters?.categoryId ? 'var(--accent-subtle-bg)' : 'transparent',
                  color: !filters?.categoryId ? 'var(--accent-light)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                All
              </button>
              {domains.map((domain) => {
                const domainCategories = getCategoriesByDomain(domain.id);
                const firstCategoryId = domainCategories[0]?.id;
                if (!firstCategoryId) return null;
                const isActive = String(filters?.categoryId) === String(firstCategoryId);
                const color = domain.color || 'var(--accent-light)';
                return (
                  <button
                    key={domain.slug}
                    onClick={() =>
                      onFilterChange?.({
                        ...filters,
                        categoryId: isActive ? '' : String(firstCategoryId),
                      })
                    }
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.6px',
                      borderRadius: 'var(--radius-pill)',
                      border: '1px solid',
                      borderColor: isActive ? color : 'var(--border-subtle)',
                      background: isActive ? `${color}15` : 'transparent',
                      color: isActive ? color : 'var(--text-muted)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {domain.name}
                  </button>
                );
              })}
            </div>

            {/* Severity filter chips */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                onClick={() => onFilterChange?.({ ...filters, severity: '' })}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid',
                  borderColor: !filters?.severity ? 'var(--accent-light)' : 'var(--border-subtle)',
                  background: !filters?.severity ? 'var(--accent-subtle-bg)' : 'transparent',
                  color: !filters?.severity ? 'var(--accent-light)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Any Severity
              </button>
              {SEVERITY_SCALE.map((s) => (
                <button
                  key={s.value}
                  onClick={() => onFilterChange?.({ ...filters, severity: String(s.value) })}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    borderRadius: 'var(--radius-pill)',
                    border: '1px solid',
                    borderColor:
                      filters?.severity === String(s.value) ? s.color : 'var(--border-subtle)',
                    background:
                      filters?.severity === String(s.value) ? `${s.color}15` : 'transparent',
                    color:
                      filters?.severity === String(s.value) ? s.color : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {s.value} {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Incident list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                Loading incidents...
              </div>
            ) : filteredIncidents.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.5 }}>{tab === 'saved' ? '⭐' : '🗺️'}</div>
                <div>{tab === 'saved' ? 'No saved incidents yet.' : 'No incidents found.'}</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  {tab === 'saved' ? 'Save incidents from the Events tab to see them here.' : 'Try adjusting your filters.'}
                </div>
              </div>
            ) : (
              filteredIncidents.map((incident) => (
                <IncidentListItem
                  key={incident.id}
                  incident={incident}
                  isSelected={false}
                  onClick={() => onSelectEvent?.(incident)}
                  isSaved={savedIds?.has(incident.id)}
                  onSaveChange={(saved) => onSaveChange?.(incident.id, saved)}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
