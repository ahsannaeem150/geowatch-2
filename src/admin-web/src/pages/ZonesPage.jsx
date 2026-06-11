import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api.js';
import { Button } from '@shared/components/Button.jsx';
import { Badge } from '@shared/components/Badge.jsx';
import { SeverityBadge } from '@shared/components/SeverityBadge.jsx';
import { useZoneCategories } from '@shared/hooks/useZoneCategories.js';
import DatePicker from '../components/DatePicker/DatePicker.jsx';
import { ArrowLeft, Hexagon, MapPin, Search, Trash2 } from 'lucide-react';

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(
    d.getHours()
  ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function ZonesPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;

  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { categories } = useZoneCategories();

  useEffect(() => {
    setLoading(true);
    setError('');
    api
      .getIncidents({ geometryType: 'polygon', dateFrom, dateTo, zoneCategoryId: categoryId, status })
      .then((res) => setZones(res.data.incidents || []))
      .catch((err) => setError(err.message || 'Failed to load zones'))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo, categoryId, status, refreshKey]);

  const filteredZones = useMemo(() => {
    if (!searchQuery.trim()) return zones;
    const q = searchQuery.trim().toLowerCase();
    return zones.filter((z) => (z.title || '').toLowerCase().includes(q));
  }, [zones, searchQuery]);

  const handleViewOnMap = (zone) => {
    navigate('/', { state: { focusZone: zone } });
  };

  const handleNewZone = () => {
    navigate('/', { state: { drawZone: true } });
  };

  const handleResolve = async (id) => {
    if (!confirm('Resolve this zone?')) return;
    try {
      await api.resolveIncident(id, { resolvedAt: new Date().toISOString() });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err.message || 'Failed to resolve zone');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this zone permanently?')) return;
    try {
      await api.deleteIncident(id);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err.message || 'Failed to delete zone');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-gradient)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <header
        style={{
          height: '60px',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={16} /> Back to map
          </button>
          <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f2f2f2',
                fontWeight: 700,
              }}
            >
              G
            </div>
            <h1 style={{ fontSize: '17px', fontWeight: 700, margin: 0 }}>GeoWatch</h1>
          </div>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1.2px',
              color: 'var(--text-muted)',
              padding: '3px 10px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            Zones
          </span>
        </div>

        <Button variant="secondary" size="sm" onClick={handleNewZone}>
          <Hexagon size={14} /> Add Zone
        </Button>
      </header>

      {/* Toolbar */}
      <div
        style={{
          padding: '16px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>From</label>
          <DatePicker value={dateFrom} onSelect={setDateFrom} placeholder="From" />
          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>→</span>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>To</label>
          <DatePicker value={dateTo} onSelect={setDateTo} placeholder="To" />
        </div>

        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 10px',
            color: 'var(--text-primary)',
            fontSize: '13px',
            outline: 'none',
          }}
        >
          <option value="">All categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={String(cat.id)}>
              {cat.name}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 10px',
            color: 'var(--text-primary)',
            fontSize: '13px',
            outline: 'none',
          }}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="resolved">Resolved</option>
        </select>

        <div style={{ position: 'relative', flex: 1, minWidth: '220px', maxWidth: '360px' }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title..."
            style={{
              width: '100%',
              padding: '8px 10px 8px 32px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)' }}>
          {filteredZones.length} zone{filteredZones.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '24px', overflow: 'auto' }}>
        {loading ? (
          <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>Loading zones…</div>
        ) : error ? (
          <div style={{ color: 'var(--danger)', textAlign: 'center', padding: '40px' }}>{error}</div>
        ) : (
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                    <th style={thStyle}>Title</th>
                    <th style={thStyle}>Category</th>
                    <th style={{ ...thStyle, width: '120px' }}>Severity</th>
                    <th style={{ ...thStyle, width: '100px' }}>Status</th>
                    <th style={{ ...thStyle, width: '140px' }}>Start</th>
                    <th style={{ ...thStyle, width: '140px' }}>End</th>
                    <th style={{ ...thStyle, textAlign: 'right', width: '200px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredZones.map((zone) => (
                    <tr
                      key={zone.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        transition: 'background var(--transition-fast)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      onClick={() => handleViewOnMap(zone)}
                    >
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{zone.title}</span>
                      </td>
                      <td style={tdStyle}>
                        {zone.zone_category_name ? (
                          <Badge color={zone.zone_category_color || '#6366f1'}>{zone.zone_category_name}</Badge>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <SeverityBadge level={zone.severity} />
                      </td>
                      <td style={tdStyle}>
                        <Badge status={zone.status}>{zone.status}</Badge>
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        {formatDateTime(zone.start_date)}
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        {formatDateTime(zone.end_date)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <Button variant="ghost" size="sm" onClick={() => handleViewOnMap(zone)}>
                            <MapPin size={14} /> View
                          </Button>
                          {zone.status !== 'resolved' && (
                            <Button variant="secondary" size="sm" onClick={() => handleResolve(zone.id)}>
                              Resolve
                            </Button>
                          )}
                          <Button variant="danger" size="sm" onClick={() => handleDelete(zone.id)}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredZones.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                {searchQuery.trim() ? 'No zones match your search.' : 'No zones found for the selected filters.'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const thStyle = {
  padding: '12px 10px',
  color: 'var(--text-muted)',
  fontWeight: 600,
  fontSize: '10px',
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  textAlign: 'left',
};

const tdStyle = {
  padding: '12px 10px',
  verticalAlign: 'middle',
};
