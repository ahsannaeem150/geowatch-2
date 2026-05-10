import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api.js';
import UserMap from '../components/Map/UserMap.jsx';
import EventSidebar from '../components/EventList/EventSidebar.jsx';

export default function MapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const eventIdFromUrl = searchParams.get('event');

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [flyToCoords, setFlyToCoords] = useState(null);
  const [filters, setFilters] = useState({ category: '' });
  const [viewportBounds, setViewportBounds] = useState(null);

  // Fetch events
  useEffect(() => {
    setLoading(true);
    const params = {};
    if (filters.category) params.category = filters.category;
    if (viewportBounds) params.viewport = viewportBounds;

    api
      .getEvents(params)
      .then((res) => {
        setEvents(res.data.events || []);
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [filters.category, viewportBounds]);

  // Handle event ID from URL
  useEffect(() => {
    if (eventIdFromUrl && events.length > 0) {
      const event = events.find((e) => e.id === parseInt(eventIdFromUrl));
      if (event) {
        handleSelectEvent(event);
      }
    }
  }, [eventIdFromUrl, events]);

  const handleSelectEvent = useCallback((event) => {
    setSelectedEvent(event);
    setFlyToCoords({
      lat: parseFloat(event.latitude),
      lng: parseFloat(event.longitude),
      zoom: 10,
    });
    setSearchParams({});
  }, [setSearchParams]);

  const handleBack = useCallback(() => {
    setSelectedEvent(null);
  }, []);

  const handleViewportChange = useCallback((bounds) => {
    setViewportBounds(bounds);
  }, []);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)' }}>
      {/* Map */}
      <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
        <UserMap
          events={events}
          selectedEventId={selectedEvent?.id}
          onEventClick={handleSelectEvent}
          onViewportChange={handleViewportChange}
          flyToCoords={flyToCoords}
        />

        {/* Event counter overlay */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            background: 'var(--bg-surface)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 14px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            zIndex: 10,
          }}
        >
          <span style={{ color: 'var(--accent-light)', fontWeight: 700 }}>{events.length}</span>
          {' events visible'}
        </div>
      </div>

      {/* Sidebar */}
      <div style={{ width: '400px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <EventSidebar
          events={events}
          selectedEvent={selectedEvent}
          onSelectEvent={handleSelectEvent}
          onBack={handleBack}
          loading={loading}
          filters={filters}
          onFilterChange={setFilters}
        />
      </div>
    </div>
  );
}
