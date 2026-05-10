import React, { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { CATEGORY_COLORS, SEVERITY_SCALE } from '@shared/constants.js';

const MAP_STYLE_URL = '/map-style-dark.json';

export default function UserMap({
  events,
  selectedEventId,
  onEventClick,
  onViewportChange,
  flyToCoords,
}) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef(new Map());

  // Initialize map
  useEffect(() => {
    if (map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE_URL,
      center: [69.3451, 30.3753],
      zoom: 4.5,
      attributionControl: false,
    });

    map.current.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.current.addControl(new maplibregl.NavigationControl(), 'bottom-right');

    map.current.on('load', () => {
      if (onViewportChange) {
        const b = map.current.getBounds();
        onViewportChange(`${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`);
      }
    });

    map.current.on('moveend', () => {
      if (onViewportChange) {
        const b = map.current.getBounds();
        onViewportChange(`${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`);
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Fly to coordinates
  useEffect(() => {
    if (!map.current || !flyToCoords) return;
    map.current.flyTo({
      center: [flyToCoords.lng, flyToCoords.lat],
      zoom: flyToCoords.zoom || 10,
      essential: true,
    });
  }, [flyToCoords]);

  // Create/update markers
  useEffect(() => {
    if (!map.current) return;

    const currentIds = new Set();

    events.forEach((event) => {
      currentIds.add(event.id);

      const existing = markers.current.get(event.id);
      if (existing) {
        // Update position if changed
        existing.marker.setLngLat([parseFloat(event.longitude), parseFloat(event.latitude)]);
        // Update selection state
        const visual = existing.element.querySelector('.marker-visual');
        if (visual) {
          const isSelected = selectedEventId === event.id;
          visual.style.borderColor = isSelected ? '#fff' : 'transparent';
          visual.style.boxShadow = isSelected
            ? `0 0 0 3px ${CATEGORY_COLORS[event.category]}80, 0 0 12px ${CATEGORY_COLORS[event.category]}60`
            : `0 0 6px ${CATEGORY_COLORS[event.category]}40`;
          visual.style.transform = isSelected ? 'scale(1.3)' : 'scale(1)';
        }
        return;
      }

      // Create new marker
      const severityConfig = SEVERITY_SCALE.find((s) => s.value === event.severity) || SEVERITY_SCALE[2];
      const color = CATEGORY_COLORS[event.category] || '#6b7280';
      const size = severityConfig.radius;

      const el = document.createElement('div');
      el.style.width = '0';
      el.style.height = '0';
      el.style.position = 'relative';
      el.style.cursor = 'pointer';

      const visual = document.createElement('div');
      visual.className = 'marker-visual';
      visual.style.position = 'absolute';
      visual.style.left = `-${size}px`;
      visual.style.top = `-${size}px`;
      visual.style.width = `${size * 2}px`;
      visual.style.height = `${size * 2}px`;
      visual.style.borderRadius = '50%';
      visual.style.background = color;
      visual.style.border = selectedEventId === event.id ? '2px solid #fff' : '2px solid transparent';
      visual.style.boxShadow = selectedEventId === event.id
        ? `0 0 0 3px ${color}80, 0 0 12px ${color}60`
        : `0 0 6px ${color}40`;
      visual.style.transition = 'all 0.2s ease';
      visual.style.transform = selectedEventId === event.id ? 'scale(1.3)' : 'scale(1)';

      el.appendChild(visual);

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([parseFloat(event.longitude), parseFloat(event.latitude)])
        .addTo(map.current);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onEventClick?.(event);
      });

      markers.current.set(event.id, { marker, element: el });
    });

    // Remove markers for events no longer in list
    markers.current.forEach((data, id) => {
      if (!currentIds.has(id)) {
        data.marker.remove();
        markers.current.delete(id);
      }
    });
  }, [events, selectedEventId]);

  return (
    <div
      ref={mapContainer}
      style={{ width: '100%', height: '100%', background: 'var(--bg-deep)' }}
    />
  );
}
