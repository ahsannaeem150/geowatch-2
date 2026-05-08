import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { Button } from '@shared/components/Button.jsx';
import { Badge } from '@shared/components/Badge.jsx';
import { CATEGORY_LABELS } from '@shared/constants.js';

export default function EventTable({ onSelect, onEdit, onRefresh, refreshKey, selectedDate }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = selectedDate ? `?date=${selectedDate}` : '';
    api
      .getEvents(params)
      .then((res) => setEvents(res.data.events))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [refreshKey, selectedDate]);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      await api.deleteEvent(id);
      setEvents(events.filter((e) => e.id !== id));
      onRefresh?.(id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResolve = async (id) => {
    if (!confirm('Mark this event as resolved?')) return;
    try {
      await api.resolveEvent(id);
      setEvents(events.map((e) => (e.id === id ? { ...e, status: 'resolved' } : e)));
      onRefresh?.(id);
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center' }}>
        Loading events...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'var(--danger)', fontSize: '13px', textAlign: 'center' }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto', padding: '0 16px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <th style={thStyle}>Title</th>
            <th style={thStyle}>Category</th>
            <th style={{ ...thStyle, width: '60px' }}>Sev</th>
            <th style={thStyle}>Status</th>
            <th style={{ ...thStyle, width: '100px' }}>Start Date</th>
            <th style={{ ...thStyle, textAlign: 'right', width: '180px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr
              key={event.id}
              style={{
                borderBottom: '1px solid rgba(42, 46, 59, 0.5)',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <td style={tdStyle} onClick={() => onSelect?.(event)}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{event.title}</span>
              </td>
              <td style={tdStyle} onClick={() => onSelect?.(event)}>
                <Badge category={event.category}>{CATEGORY_LABELS[event.category]}</Badge>
              </td>
              <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: '12px' }} onClick={() => onSelect?.(event)}>
                {event.severity}
              </td>
              <td style={tdStyle} onClick={() => onSelect?.(event)}>
                <Badge status={event.status}>{event.status}</Badge>
              </td>
              <td
                style={{ ...tdStyle, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}
                onClick={() => onSelect?.(event)}
              >
                {event.start_date?.slice(0, 10)}
              </td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                  <Button variant="ghost" size="sm" onClick={() => onEdit?.(event)}>
                    Edit
                  </Button>
                  {event.status !== 'resolved' && (
                    <Button variant="secondary" size="sm" onClick={() => handleResolve(event.id)}>
                      Resolve
                    </Button>
                  )}
                  <Button variant="danger" size="sm" onClick={() => handleDelete(event.id)}>
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {events.length === 0 && (
        <p style={{ color: 'var(--text-muted)', padding: '32px', textAlign: 'center', fontSize: '13px' }}>
          No events found for this date.
        </p>
      )}
    </div>
  );
}

const thStyle = {
  padding: '10px 8px',
  color: 'var(--text-muted)',
  fontWeight: 600,
  fontSize: '10px',
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  textAlign: 'left',
};

const tdStyle = {
  padding: '10px 8px',
  verticalAlign: 'middle',
};
