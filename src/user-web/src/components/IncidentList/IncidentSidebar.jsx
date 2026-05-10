import React, { useState } from 'react';
import { SEVERITY_SCALE } from '@shared/constants.js';
import IncidentListItem from './IncidentListItem.jsx';
import IncidentDetailView from '../IncidentDetail/IncidentDetailView.jsx';

export default function IncidentSidebar({
  incidents,
  selectedIncident,
  onSelectEvent,
  onBack,
  loading,
  filters,
  onFilterChange,
}) {
  const [searchQuery, setSearchQuery] = useState('');

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
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <IncidentDetailView incidentId={selectedIncident.id} onBack={onBack} />
        </div>
      ) : (
        <>
          {/* Search & filters header */}
          <div
            style={{
              padding: '16px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
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
                Events
              </h3>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--accent-light)',
                  background: 'rgba(159, 18, 57, 0.12)',
                  padding: '2px 8px',
                  borderRadius: '10px',
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

            {/* Category filter chips */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['all', 'conflict', 'protest', 'disaster', 'diplomacy'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => onFilterChange?.({ ...filters, category: cat === 'all' ? '' : cat })}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    borderRadius: 'var(--radius-pill)',
                    border: '1px solid',
                    borderColor:
                      (cat === 'all' && !filters?.category) || filters?.category === cat
                        ? 'var(--accent-light)'
                        : 'var(--border-subtle)',
                    background:
                      (cat === 'all' && !filters?.category) || filters?.category === cat
                        ? 'rgba(159, 18, 57, 0.12)'
                        : 'transparent',
                    color:
                      (cat === 'all' && !filters?.category) || filters?.category === cat
                        ? 'var(--accent-light)'
                        : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {cat}
                </button>
              ))}
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
                  background: !filters?.severity ? 'rgba(159, 18, 57, 0.12)' : 'transparent',
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
                <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.5 }}>🗺️</div>
                <div>No incidents found.</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>Try adjusting your filters.</div>
              </div>
            ) : (
              filteredIncidents.map((incident) => (
                <IncidentListItem
                  key={incident.id}
                  incident={incident}
                  isSelected={false}
                  onClick={() => onSelectEvent?.(incident)}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
