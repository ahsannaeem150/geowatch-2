import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { API_BASE_URL } from '@shared/constants.js';
import UserMap from '../components/Map/UserMap.jsx';
import MapControls from '../components/Map/MapControls.jsx';
import LocationSearch from '../components/LocationSearch/LocationSearch.jsx';
import EventSidebar from '../components/EventList/EventSidebar.jsx';
import LiveActivityFeed from '../components/LiveActivity/LiveActivityFeed.jsx';
import TickerBar from '../components/Ticker/TickerBar.jsx';
import AwayBanner from '../components/AwayBanner/AwayBanner.jsx';

const LS_KEY = 'geowatch_last_seen';
const MAX_ACTIVITIES = 50;

function getLastSeen() {
  const raw = localStorage.getItem(LS_KEY);
  return raw ? parseInt(raw, 10) : Date.now();
}

function setLastSeen(ts) {
  localStorage.setItem(LS_KEY, String(ts));
}

export default function MapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const eventIdFromUrl = searchParams.get('event');

  // ─── Date & filters ───
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const [dateRange, setDateRange] = useState({ from: today, to: today });
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [flyToCoords, setFlyToCoords] = useState(null);
  const [filters, setFilters] = useState({ category: '', severity: '' });
  const [viewportBounds, setViewportBounds] = useState(null);

  // ─── Live Activity ───
  const [activities, setActivities] = useState([]);
  const [feedCollapsed, setFeedCollapsed] = useState(false);
  const [lastSeenTimestamp, setLastSeenTimestamp] = useState(getLastSeen());
  const [showAwayBanner, setShowAwayBanner] = useState(false);
  const [awayStats, setAwayStats] = useState({ newEvents: 0, updatedEvents: 0 });

  const esRef = useRef(null);

  // ─── Fetch events ───
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

  // ─── Handle event ID from URL ───
  useEffect(() => {
    if (eventIdFromUrl && events.length > 0) {
      const event = events.find((e) => e.id === eventIdFromUrl);
      if (event) {
        handleSelectEvent(event);
      }
    }
  }, [eventIdFromUrl, events]);

  // ─── SSE Connection ───
  useEffect(() => {
    if (typeof EventSource === 'undefined') return;

    const url = `${API_BASE_URL}/events/stream`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => {
      console.log('[SSE] Connected to GeoWatch stream');
    };

    es.onmessage = (e) => {
      if (!e.data) return;
      try {
        const payload = JSON.parse(e.data);

        // Skip initial comment/heartbeat
        if (!payload.type) return;

        const activity = {
          type: payload.type,
          eventId: payload.eventId || payload.event?.id,
          event: payload.event || null,
          update: payload.update || null,
          updateId: payload.updateId || null,
          timestamp: Date.now(),
          isUnread: true,
        };

        setActivities((prev) => {
          const next = [activity, ...prev].slice(0, MAX_ACTIVITIES);
          return next;
        });

        // If the activity is about an event we know, refresh it in our list
        if (payload.event) {
          setEvents((prev) => {
            const exists = prev.find((ev) => ev.id === payload.event.id);
            if (exists) {
              return prev.map((ev) => (ev.id === payload.event.id ? payload.event : ev));
            }
            return [payload.event, ...prev];
          });
        }

        // If event deleted, remove from list
        if (payload.type === 'event_deleted') {
          setEvents((prev) => prev.filter((ev) => ev.id !== payload.eventId));
        }
      } catch (err) {
        console.warn('[SSE] Failed to parse message:', err);
      }
    };

    es.onerror = (err) => {
      console.warn('[SSE] Connection error, will retry:', err);
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, []);

  // ─── Mark unread items based on lastSeenTimestamp ───
  useEffect(() => {
    setActivities((prev) =>
      prev.map((a) => ({
        ...a,
        isUnread: a.timestamp > lastSeenTimestamp,
      }))
    );
  }, [lastSeenTimestamp]);

  const unreadCount = activities.filter((a) => a.isUnread).length;

  // ─── "While you were away" banner on tab focus ───
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const lastSeen = getLastSeen();
        const nowTs = Date.now();
        if (nowTs - lastSeen > 30000) {
          // Only show if away > 30s
          const newEvents = activities.filter(
            (a) => a.timestamp > lastSeen && a.type === 'event_created'
          ).length;
          const updatedEvents = activities.filter(
            (a) => a.timestamp > lastSeen && (a.type === 'event_updated' || a.type === 'timeline_added')
          ).length;
          if (newEvents > 0 || updatedEvents > 0) {
            setAwayStats({ newEvents, updatedEvents });
            setShowAwayBanner(true);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [activities]);

  // ─── Handlers ───
  const handleSelectEvent = useCallback(
    (event) => {
      setSelectedEvent(event);
      setFlyToCoords({
        lat: parseFloat(event.latitude),
        lng: parseFloat(event.longitude),
        zoom: 10,
      });
      setSearchParams({});
    },
    [setSearchParams]
  );

  const handleSelectEventFromActivity = useCallback(
    (eventId, eventData) => {
      if (eventData && eventData.latitude && eventData.longitude) {
        handleSelectEvent(eventData);
        return;
      }
      // Try to find in current events list
      const found = events.find((e) => e.id === eventId);
      if (found) {
        handleSelectEvent(found);
        return;
      }
      // Fetch from API as fallback
      api
        .getEvent(eventId)
        .then((res) => {
          if (res.data?.event) handleSelectEvent(res.data.event);
        })
        .catch(() => {
          console.warn('Could not fetch event', eventId);
        });
    },
    [events, handleSelectEvent]
  );

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

  const handleMarkAllRead = useCallback(() => {
    const nowTs = Date.now();
    setLastSeenTimestamp(nowTs);
    setLastSeen(nowTs);
  }, []);

  const handleDismissAway = useCallback(() => {
    handleMarkAllRead();
    setShowAwayBanner(false);
  }, [handleMarkAllRead]);

  const handleJumpToNew = useCallback(() => {
    setFeedCollapsed(false);
    handleMarkAllRead();
    setShowAwayBanner(false);
    // Scroll to top of feed is handled by LiveActivityFeed autoScroll
  }, [handleMarkAllRead]);

  const handleToggleCollapse = useCallback(() => {
    setFeedCollapsed((prev) => !prev);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)' }}>
      {/* Main content row */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left — Live Activity Feed */}
        <LiveActivityFeed
          activities={activities}
          onSelectEvent={handleSelectEventFromActivity}
          isCollapsed={feedCollapsed}
          onToggleCollapse={handleToggleCollapse}
          unreadCount={unreadCount}
          onMarkAllRead={handleMarkAllRead}
        />

        {/* Center — Map */}
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
              top: feedCollapsed ? '72px' : '72px',
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

          {/* Away banner */}
          {showAwayBanner && (
            <AwayBanner
              newEventsCount={awayStats.newEvents}
              updatedEventsCount={awayStats.updatedEvents}
              onJumpToNew={handleJumpToNew}
              onDismiss={handleDismissAway}
            />
          )}
        </div>

        {/* Right — Event sidebar */}
        <div style={{ width: '480px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
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

      {/* Bottom — Ticker bar */}
      <TickerBar activities={activities} onSelectEvent={handleSelectEventFromActivity} />
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
