import React, { useState, useCallback } from 'react';
import TopBar from './TopBar.jsx';
import AdminMap from '../Map/AdminMap.jsx';
import EventForm from '../EventForm/EventForm.jsx';
import EventTable from '../EventList/EventTable.jsx';
import { api } from '../../services/api.js';

export default function DashboardLayout() {
  const [markerCoords, setMarkerCoords] = useState(null);
  const [flyToCoords, setFlyToCoords] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [formMode, setFormMode] = useState('create'); // 'create' | 'edit'
  const [successMsg, setSuccessMsg] = useState('');

  const handleMapClick = useCallback((coords) => {
    setMarkerCoords(coords);
    setEditingEvent(null);
    setFormMode('create');
  }, []);

  const handleAddEvent = () => {
    setMarkerCoords(null);
    setEditingEvent(null);
    setFormMode('create');
  };

  const handleFlyTo = (lat, lng) => {
    setFlyToCoords({ lat: parseFloat(lat), lng: parseFloat(lng) });
  };

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setSuccessMsg('');
    try {
      if (formMode === 'edit' && editingEvent) {
        await api.updateEvent(editingEvent.id, payload);
        setSuccessMsg('Event updated successfully');
      } else {
        await api.createEvent(payload);
        setSuccessMsg('Event created successfully');
        setMarkerCoords(null);
      }
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectEvent = (event) => {
    handleFlyTo(event.latitude, event.longitude);
    setMarkerCoords({ lat: parseFloat(event.latitude), lng: parseFloat(event.longitude) });
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setFormMode('edit');
    setMarkerCoords({ lat: parseFloat(event.latitude), lng: parseFloat(event.longitude) });
    handleFlyTo(event.latitude, event.longitude);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-deep)' }}>
      <TopBar onAddEvent={handleAddEvent} />

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Map — 60% */}
        <div style={{ width: '60%', position: 'relative', borderRight: '1px solid var(--border-subtle)' }}>
          <AdminMap
            onMapClick={handleMapClick}
            flyToCoords={flyToCoords}
            markerCoords={markerCoords}
          />
        </div>

        {/* Form Panel — 40% */}
        <div
          style={{
            width: '40%',
            overflowY: 'auto',
            padding: '20px',
            background: 'var(--bg-surface)',
          }}
        >
          {successMsg && (
            <div
              style={{
                background: 'rgba(46, 213, 115, 0.1)',
                border: '1px solid rgba(46, 213, 115, 0.3)',
                color: '#2ed573',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '16px',
                fontSize: '13px',
              }}
            >
              {successMsg}
            </div>
          )}

          <EventForm
            initialCoords={markerCoords}
            initialData={editingEvent}
            onSubmit={handleSubmit}
            onCancel={formMode === 'edit' ? () => setEditingEvent(null) || setFormMode('create') : undefined}
            submitting={submitting}
          />
        </div>
      </div>

      {/* Event Table — bottom strip */}
      <div
        style={{
          height: '240px',
          flexShrink: 0,
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          overflowY: 'auto',
        }}
      >
        <EventTable
          onSelect={handleSelectEvent}
          onEdit={handleEditEvent}
          refreshKey={refreshKey}
        />
      </div>
    </div>
  );
}
