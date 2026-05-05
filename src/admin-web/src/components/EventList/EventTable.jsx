import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { Button } from '@shared/components/Button.jsx';
import { Badge } from '@shared/components/Badge.jsx';
import { CATEGORY_LABELS } from '@shared/constants.js';

export default function EventTable({ onSelect, onEdit, refreshKey }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api
      .getEvents('')
      .then((res) => setEvents(res.data.events))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      await api.deleteEvent(id);
      setEvents(events.filter((e) => e.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResolve = async (id) => {
    if (!confirm('Mark this event as resolved?')) return;
    try {
      await api.resolveEvent(id);
      setEvents(events.map((e) => (e.id === id ? { ...e, status: 'resolved' } : e)));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <p style={{ color: 'var(--text-secondary)', padding: '16px' }}>Loading events...</p>;
  if (error) return <p style={{ color: 'var(--danger)', padding: '16px' }}>{error}</p>;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
            <th style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Title</th>
            <th style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Category</th>
            <th style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Severity</th>
            <th style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Status</th>
            <th style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Start Date</th>
            <th style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontWeight: 500, textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr
              key={event.id}
              style={{
                borderBottom: '1px solid var(--border-subtle)',
                cursor: 'pointer',
                transition: 'background var(--transition-fast)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <td style={{ padding: '10px 12px', color: 'var(--text-primary)', fontWeight: 500 }} onClick={() => onSelect?.(event)}>
                {event.title}
              </td>
              <td style={{ padding: '10px 12px' }} onClick={() => onSelect?.(event)}>
                <Badge category={event.category}>{CATEGORY_LABELS[event.category]}</Badge>
              </td>
              <td style={{ padding: '10px 12px', color: 'var(--text-primary)' }} onClick={() => onSelect?.(event)}>
                {event.severity}
              </td>
              <td style={{ padding: '10px 12px' }} onClick={() => onSelect?.(event)}>
                <Badge status={event.status}>{event.status}</Badge>
              </td>
              <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '12px' }} onClick={() => onSelect?.(event)}>
                {event.start_date?.slice(0, 10)}
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
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
        <p style={{ color: 'var(--text-muted)', padding: '24px', textAlign: 'center' }}>No events found.</p>
      )}
    </div>
  );
}
