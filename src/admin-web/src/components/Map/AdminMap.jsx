import React, { useRef, useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { CATEGORY_COLORS, SEVERITY_SCALE } from '@shared/constants.js';

const MAP_STYLE_URL = '/map-style-dark.json';

export default function AdminMap({
  events = [],
  selectedEventId,
  onEventClick,
  onMapDblClick,
  flyToCoords,
  markerCoords,
}) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef(new Map());
  const tempMarker = useRef(null);

  // Initialize map once
  useEffect(() => {
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE_URL,
      center: [20, 30],
      zoom: 2,
      attributionControl: false,
    });

    map.current.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.current.on('dblclick', (e) => {
      const { lng, lat } = e.lngLat;
      onMapDblClick?.({ lat, lng });
    });

    return () => {
      markers.current.forEach((m) => m.remove());
      tempMarker.current?.remove();
      map.current?.remove();
    };
  }, []);

  // Fly to coordinates
  useEffect(() => {
    if (flyToCoords && map.current) {
      map.current.flyTo({
        center: [flyToCoords.lng, flyToCoords.lat],
        zoom: 10,
        duration: 800,
      });
    }
  }, [flyToCoords]);

  // Create / remove / update markers when events change
  useEffect(() => {
    if (!map.current) return;

    const currentIds = new Set(events.map((e) => e.id));
    const existingIds = Array.from(markers.current.keys());

    // Remove markers for events that no longer exist
    existingIds.forEach((id) => {
      if (!currentIds.has(id)) {
        markers.current.get(id)?.remove();
        markers.current.delete(id);
      }
    });

    // Add new markers, update existing ones
    events.forEach((event) => {
      const existing = markers.current.get(event.id);
      const lat = parseFloat(event.latitude);
      const lng = parseFloat(event.longitude);

      if (existing) {
        // Update position if changed
        existing.setLngLat([lng, lat]);
        // Store current data for selection styling
        existing._eventData = event;
        return;
      }

      // Create new marker
      const severityConfig = SEVERITY_SCALE.find((s) => s.value === event.severity) || SEVERITY_SCALE[2];
      const color = CATEGORY_COLORS[event.category] || '#778ca3';
      const size = severityConfig.radius;

      // Parent: MapLibre positions this via translate3d — DO NOT touch its transform
      const el = document.createElement('div');
      el.style.width = '0';
      el.style.height = '0';
      el.style.position = 'relative';
      el.dataset.eventId = event.id;
      el.dataset.color = color;
      el.dataset.size = String(size);

      // Child: handles all visual styling + hover scale — safe to transform
      const visual = document.createElement('div');
      visual.style.position = 'absolute';
      visual.style.left = `-${size}px`;
      visual.style.top = `-${size}px`;
      visual.style.width = `${size * 2}px`;
      visual.style.height = `${size * 2}px`;
      visual.style.borderRadius = '50%';
      visual.style.background = color;
      visual.style.border = '1.5px solid rgba(255,255,255,0.3)';
      visual.style.boxShadow = `0 0 ${size}px ${color}80`;
      visual.style.cursor = 'pointer';
      visual.style.transition = 'transform 0.15s ease, box-shadow 0.15s ease';
      visual.style.willChange = 'transform';

      // Hover: scale the CHILD only, never the parent
      visual.addEventListener('mouseenter', () => {
        visual.style.transform = 'scale(1.5)';
        visual.style.boxShadow = `0 0 ${size * 3}px ${color}`;
        visual.style.zIndex = '10';
      });
      visual.addEventListener('mouseleave', () => {
        visual.style.transform = 'scale(1)';
        visual.style.boxShadow = `0 0 ${size}px ${color}80`;
        visual.style.zIndex = '';
      });

      // Click: NO stopPropagation — let MapLibre clean up properly
      el.addEventListener('click', () => {
        onEventClick?.(event);
      });

      el.appendChild(visual);

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lng, lat])
        .addTo(map.current);

      marker._eventData = event;
      markers.current.set(event.id, marker);
    });
  }, [events]);

  // Update selection styles WITHOUT recreating markers
  useEffect(() => {
    markers.current.forEach((marker) => {
      const el = marker.getElement();
      const visual = el.firstChild;
      if (!visual) return;

      const color = el.dataset.color;
      const size = parseInt(el.dataset.size, 10);
      const isSelected = el.dataset.eventId === selectedEventId;

      if (isSelected) {
        visual.style.border = '2px solid #fff';
        visual.style.boxShadow = `0 0 0 4px ${color}40, 0 0 ${size * 2}px ${color}`;
      } else {
        visual.style.border = '1.5px solid rgba(255,255,255,0.3)';
        visual.style.boxShadow = `0 0 ${size}px ${color}80`;
      }
    });
  }, [selectedEventId]);

  // Render temporary marker (for create mode)
  useEffect(() => {
    if (!map.current) return;

    if (tempMarker.current) {
      tempMarker.current.remove();
      tempMarker.current = null;
    }

    if (markerCoords) {
      const el = document.createElement('div');
      el.style.width = '0';
      el.style.height = '0';
      el.style.position = 'relative';

      const visual = document.createElement('div');
      visual.style.position = 'absolute';
      visual.style.left = '-10px';
      visual.style.top = '-10px';
      visual.style.width = '20px';
      visual.style.height = '20px';
      visual.style.borderRadius = '50%';
      visual.style.background = 'var(--accent-cyan)';
      visual.style.border = '3px solid #fff';
      visual.style.boxShadow = '0 0 12px rgba(0, 212, 255, 0.8)';

      const ring = document.createElement('div');
      ring.style.position = 'absolute';
      ring.style.left = '-18px';
      ring.style.top = '-18px';
      ring.style.width = '44px';
      ring.style.height = '44px';
      ring.style.borderRadius = '50%';
      ring.style.border = '2px solid var(--accent-cyan)';
      ring.style.animation = 'marker-pulse 1.5s infinite';
      ring.style.pointerEvents = 'none';

      el.appendChild(visual);
      el.appendChild(ring);

      tempMarker.current = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([markerCoords.lng, markerCoords.lat])
        .addTo(map.current);
    }
  }, [markerCoords]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      <style>{`
        @keyframes marker-pulse {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
