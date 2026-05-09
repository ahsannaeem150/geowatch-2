import React, { useState, useCallback, useEffect } from 'react';
import TopBar from './TopBar.jsx';
import AdminMap from '../Map/AdminMap.jsx';
import EventForm from '../EventForm/EventForm.jsx';
import EventTable from '../EventList/EventTable.jsx';
import EventDetailPanel from '../EventDetail/EventDetailPanel.jsx';
import { api } from '../../services/api.js';

export default function DashboardLayout() {
  const today = new Date().toISOString().slice(0, 10);

  const [dateRange, setDateRange] = useState({ from: today, to: today });
  const [events, setEvents] = useState([]);
  const [panelMode, setPanelMode] = useState('empty'); // 'empty' | 'detail' | 'form'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [markerCoords, setMarkerCoords] = useState(null);
  const [flyToCoords, setFlyToCoords] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState(null);

  // Fetch events whenever date range changes
  useEffect(() => {
    api
      .getEvents({ dateFrom: dateRange.from, dateTo: dateRange.to })
      .then((res) => setEvents(res.data.events))
      .catch(() => setEvents([]));
  }, [dateRange.from, dateRange.to, refreshKey]);

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleMapDblClick = useCallback((coords) => {
    setMarkerCoords(coords);
    setSelectedEvent(null);
    setIsEditing(false);
    setPanelMode('form');
  }, []);

  const handleEventClick = useCallback((event) => {
    setSelectedEvent(event);
    setIsEditing(false);
    setPanelMode('detail');
    setFlyToCoords({ lat: parseFloat(event.latitude), lng: parseFloat(event.longitude) });
    setMarkerCoords(null);
  }, []);

  const handleAddEvent = () => {
    setMarkerCoords(null);
    setSelectedEvent(null);
    setIsEditing(false);
    setPanelMode('form');
  };

  const handleResetToToday = () => {
    setDateRange({ from: today, to: today });
  };

  const handleEditFromDetail = (event) => {
    setIsEditing(true);
    setPanelMode('form');
  };

  const handleClosePanel = () => {
    setPanelMode('empty');
    setSelectedEvent(null);
    setMarkerCoords(null);
    setIsEditing(false);
  };

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    try {
      if (isEditing && selectedEvent) {
        await api.updateEvent(selectedEvent.id, payload);
        setSelectedEvent((prev) => ({ ...prev, ...payload, start_date: payload.startDate, end_date: payload.endDate }));
        setIsEditing(false);
        setPanelMode('detail');
      } else {
        const res = await api.createEvent(payload);
        const newEvent = res.data.event;
        setSelectedEvent(newEvent);
        setPanelMode('detail');
        setMarkerCoords(null);

        // Notify admin if the event has already ended (grace period expired)
        if (newEvent.end_date) {
          const graceEnd = new Date(new Date(newEvent.end_date).getTime() + 24 * 60 * 60 * 1000);
          if (graceEnd < new Date()) {
            setToast({
              message: 'Event added successfully. It has already ended — use the date range picker to view it on the map.',
              type: 'info',
            });
          }
        }
      }
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectFromTable = (event) => {
    handleEventClick(event);
  };

  const handleEditFromTable = (event) => {
    setSelectedEvent(event);
    setIsEditing(true);
    setPanelMode('form');
    setFlyToCoords({ lat: parseFloat(event.latitude), lng: parseFloat(event.longitude) });
    setMarkerCoords(null);
  };

  const handleTableAction = (eventId) => {
    setRefreshKey((k) => k + 1);
    if (selectedEvent?.id === eventId) {
      setSelectedEvent(null);
      setPanelMode('empty');
    }
  };

  // Determine what to show in the right panel
  const renderPanel = () => {
    if (panelMode === 'detail' && selectedEvent) {
      return (
        <EventDetailPanel
          eventId={selectedEvent.id}
          onEdit={handleEditFromDetail}
          onClose={handleClosePanel}
        />
      );
    }

    if (panelMode === 'form') {
      return (
        <EventForm
          initialCoords={markerCoords}
          initialData={isEditing ? selectedEvent : null}
          onSubmit={handleSubmit}
          onCancel={handleClosePanel}
          submitting={submitting}
        />
      );
    }

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: '16px',
          color: 'var(--text-muted)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: '2px dashed var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
          }}
        >
          🗺️
        </div>
        <div>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
            No Event Selected
          </p>
          <p style={{ fontSize: '13px' }}>
            Double-click the map to create an event
            <br />
            or click an existing marker to view details
          </p>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-deep)' }}>
      <TopBar onAddEvent={handleAddEvent} dateRange={dateRange} onDateRangeChange={setDateRange} onResetToToday={handleResetToToday} />

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2000,
            background: 'rgba(15, 17, 23, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--accent-cyan)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 24px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 12px rgba(0, 212, 255, 0.15)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 500,
            maxWidth: '480px',
            textAlign: 'center',
            lineHeight: 1.5,
            animation: 'slideUp 0.3s ease-out',
          }}
        >
          {toast.message}
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Map */}
        <div
          style={{
            width: '60%',
            position: 'relative',
            borderRight: '1px solid var(--border-subtle)',
          }}
        >
          <AdminMap
            events={events}
            selectedEventId={selectedEvent?.id}
            onEventClick={handleEventClick}
            onMapDblClick={handleMapDblClick}
            flyToCoords={flyToCoords}
            markerCoords={markerCoords}
          />

          {/* Event counter overlay */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              background: 'rgba(15, 17, 23, 0.8)',
              backdropFilter: 'blur(8px)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 14px',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              zIndex: 10,
            }}
          >
            <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>{events.length}</span> events visible
          </div>
        </div>

        {/* Right Panel */}
        <div
          style={{
            width: '40%',
            overflowY: 'auto',
            padding: '20px',
            background: 'rgba(26, 29, 41, 0.6)',
            backdropFilter: 'blur(12px)',
            borderLeft: '1px solid var(--border-subtle)',
          }}
        >
          {renderPanel()}
        </div>
      </div>

      {/* Event Table */}
      <div
        style={{
          height: '220px',
          flexShrink: 0,
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          overflowY: 'auto',
        }}
      >
        <EventTable
          onSelect={handleSelectFromTable}
          onEdit={handleEditFromTable}
          onRefresh={handleTableAction}
          refreshKey={refreshKey}
          dateRange={dateRange}
        />
      </div>
    </div>
  );
}
