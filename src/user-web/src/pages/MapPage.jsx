import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api.js';
import UserMap from '../components/Map/UserMap.jsx';
import MapControls from '../components/Map/MapControls.jsx';
import LocationSearch from '../components/LocationSearch/LocationSearch.jsx';
import EventSidebar from '../components/EventList/EventSidebar.jsx';

export default function MapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const eventIdFromUrl = searchParams.get('event');

  // Date range (local timezone)
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const [dateRange, setDateRange] = useState({ from: today, to: today });
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [flyToCoords, setFlyToCoords] = useState(null);
  const [filters, setFilters] = useState({ category: '', severity: '' });
  const [viewportBounds, setViewportBounds] = useState(null);

  // Fetch events
  useEffect(() => {
    setLoading(true);
    const params = {
      dateFrom: dateRange.from,
      dateTo: dateRange.to,
    };
    if (filters.category) params.category = filters.category;
    if (filters.severity) params.severity = filters.severity;
    if (viewportBounds) params.viewport = viewportBounds;

    api
      .getEvents(params)
      .then((res) => {
        setEvents(res.data.events || []);
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [dateRange.from, dateRange.to, filters.category, filters.severity, viewportBounds]);

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

  const handleResetToToday = useCallback(() => {
    setDateRange({ from: today, to: today });
  }, [today]);

  const handleLocationSelect = useCallback((result) => {
    const zoom = getZoomForLocation(result.type, result.class);
    setFlyToCoords({
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      zoom,
    });
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

        {/* Map controls overlay — top center */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
          }}
        >
          <MapControls
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onResetToToday={handleResetToToday}
          />
        </div>

        {/* Location search overlay — top left */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            width: '320px',
            zIndex: 15,
          }}
        >
          <LocationSearch
            onSelect={handleLocationSelect}
            viewbox={(() => {
              if (!viewportBounds) return null;
              const [minLng, minLat, maxLng, maxLat] = viewportBounds.split(',').map(Number);
              return `${minLng},${maxLat},${maxLng},${minLat}`;
            })()}
          />
        </div>

        {/* Event counter overlay */}
        <div
          style={{
            position: 'absolute',
            top: '72px',
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
      <div style={{ width: '580px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
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

function getZoomForLocation(type, cls) {
  const t = (type || '').toLowerCase();
  const c = (cls || '').toLowerCase();

  if (t === 'coordinates') return 16;
  if (t === 'continent') return 3;
  if (t === 'country') return 5;
  if (['state', 'province', 'region'].includes(t)) return 7;
  if (['county', 'district'].includes(t)) return 9;
  if (t === 'city') return 11;
  if (t === 'town') return 13;
  if (t === 'village') return 14;
  if (['suburb', 'neighbourhood', 'neighborhood', 'quarter'].includes(t)) return 15;
  if (['street', 'road', 'square', 'farm', 'allotments'].includes(t)) return 16;
  if (['house', 'building', 'place_of_worship', 'museum', 'hospital', 'school', 'university', 'college'].includes(t)) return 17;
  if (['river', 'lake', 'water', 'reservoir', 'pond'].includes(t)) return 12;
  if (['mountain', 'peak', 'volcano', 'ridge'].includes(t)) return 13;
  if (['airport', 'station', 'bus_station', 'railway_station'].includes(t)) return 14;

  if (c === 'boundary') return 9;
  if (c === 'place') return 12;
  if (c === 'highway') return 16;

  return 11;
}
