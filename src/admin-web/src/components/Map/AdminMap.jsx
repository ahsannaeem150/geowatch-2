import React, { useRef, useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { SEVERITY_SCALE } from '@shared/constants.js';

const MAP_STYLE_URL = '/map-style-dark.json';

// Hard boundary for z14 tile coverage.
// Inset by 1° from the actual tile boundary so that even at z14 the entire
// viewport stays inside the region where tiles exist. No smooth transition:
// tiles are either present (z0-14) or not (z0-10 only), so the allowed zoom
// must switch cleanly between 14 and 10.
const TILE_BBOX = [25.3125, 4.7626, 105.1831, 42.5531];
const HOT_BBOX = [26.3125, 5.7626, 104.1831, 41.5531]; // 1° inset

function getMaxZoomForCenter(lng, lat) {
  const [minLng, minLat, maxLng, maxLat] = HOT_BBOX;
  const inside = lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
  return inside ? 14 : 10;
}

export default function AdminMap({
  incidents = [],
  selectedEventId,
  onEventClick,
  onMapDblClick,
  onViewportChange,
  flyToCoords,
  markerCoords,
  ghostIncident,
  newIncidentIds = new Set(),
}) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef(new Map());
  const tempMarker = useRef(null);
  const ghostMarkerRef = useRef(null);
  const pulseMarkers = useRef(new Map());
  const isProgrammaticMove = useRef(false);
  const isClamping = useRef(false);
  const onViewportChangeRef = useRef(onViewportChange);
  onViewportChangeRef.current = onViewportChange;

  // Initialize map once
  useEffect(() => {
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE_URL,
      center: [20, 30],
      zoom: 2,
      attributionControl: false,
      doubleClickZoom: false,
    });

    map.current.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.current.on('dblclick', (e) => {
      const { lng, lat } = e.lngLat;
      onMapDblClick?.({ lat, lng });
    });

    // Report viewport bounds on user-initiated map moves
    map.current.on('moveend', () => {
      if (isProgrammaticMove.current) {
        isProgrammaticMove.current = false;
        return;
      }
      if (!map.current) return;
      const bounds = map.current.getBounds();
      const viewport = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
      onViewportChangeRef.current?.(viewport);
    });

    // Mouse-wheel and double-click zoom don't always fire moveend; clamp here too
    map.current.on('zoomend', () => {
      if (isProgrammaticMove.current) {
        isProgrammaticMove.current = false;
        return;
      }
      if (!map.current) return;
      const center = map.current.getCenter();
      const newMaxZoom = getMaxZoomForCenter(center.lng, center.lat);
      map.current.setMaxZoom(newMaxZoom);
      if (map.current.getZoom() > newMaxZoom) {
        isProgrammaticMove.current = true;
        map.current.flyTo({
          center: [center.lng, center.lat],
          zoom: newMaxZoom,
          duration: 500,
          essential: true,
        });
      }
    });

    // Report initial bounds once the map is loaded
    map.current.on('load', () => {
      if (!map.current) return;
      const bounds = map.current.getBounds();
      const viewport = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
      onViewportChangeRef.current?.(viewport);
      // Set initial maxZoom based on starting center
      const center = map.current.getCenter();
      map.current.setMaxZoom(getMaxZoomForCenter(center.lng, center.lat));
    });

    // During active pan, update maxZoom and clamp immediately if over-zoomed.
    // jumpTo is used instead of flyTo so we don't fight the user's gesture;
    // it snaps the zoom instantly before the viewport can drift into no-tile land.
    map.current.on('move', () => {
      if (!map.current || isProgrammaticMove.current || isClamping.current) return;
      const center = map.current.getCenter();
      const newMaxZoom = getMaxZoomForCenter(center.lng, center.lat);
      map.current.setMaxZoom(newMaxZoom);

      const currentZoom = map.current.getZoom();
      if (currentZoom > newMaxZoom) {
        isClamping.current = true;
        map.current.jumpTo({ zoom: newMaxZoom });
        setTimeout(() => {
          isClamping.current = false;
        }, 0);
      }
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
      isProgrammaticMove.current = true;
      map.current.flyTo({
        center: [flyToCoords.lng, flyToCoords.lat],
        zoom: flyToCoords.zoom ?? 10,
        duration: 800,
      });
    }
  }, [flyToCoords]);

  // Create / remove / update markers when incidents change
  useEffect(() => {
    if (!map.current) return;

    const currentIds = new Set(incidents.map((i) => i.id));
    const existingIds = Array.from(markers.current.keys());

    // Remove markers for incidents that no longer exist
    existingIds.forEach((id) => {
      if (!currentIds.has(id)) {
        markers.current.get(id)?.remove();
        markers.current.delete(id);
      }
    });

    // Add new markers, update existing ones
    incidents.forEach((incident) => {
      const existing = markers.current.get(incident.id);
      const lat = parseFloat(incident.latitude);
      const lng = parseFloat(incident.longitude);

      if (existing) {
        // Update position if changed
        existing.setLngLat([lng, lat]);
        // Store current data for selection styling
        existing._incidentData = incident;
        return;
      }

      // Create new marker
      const severityConfig = SEVERITY_SCALE.find((s) => s.value === incident.severity) || SEVERITY_SCALE[2];
      const color = incident.domain_color || '#6b7280';
      const size = severityConfig.radius;

      // Parent: MapLibre positions this via translate3d — DO NOT touch its transform
      const el = document.createElement('div');
      el.style.width = '0';
      el.style.height = '0';
      el.style.position = 'relative';
      el.dataset.incidentId = incident.id;
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
        onEventClick?.(incident);
      });

      el.appendChild(visual);

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lng, lat])
        .addTo(map.current);

      marker._incidentData = incident;
      markers.current.set(incident.id, marker);
    });

    // Handle new incident pulse animations
    if (newIncidentIds.size > 0) {
      incidents.forEach((incident) => {
        if (!newIncidentIds.has(incident.id)) return;
        const existingPulse = pulseMarkers.current.get(incident.id);
        if (existingPulse) return; // already pulsing

        const lat = parseFloat(incident.latitude);
        const lng = parseFloat(incident.longitude);
        const color = incident.domain_color || '#6b7280';

        const el = document.createElement('div');
        el.style.width = '0';
        el.style.height = '0';
        el.style.position = 'relative';

        const ring = document.createElement('div');
        ring.style.position = 'absolute';
        ring.style.left = '-24px';
        ring.style.top = '-24px';
        ring.style.width = '48px';
        ring.style.height = '48px';
        ring.style.borderRadius = '50%';
        ring.style.border = `2px solid ${color}`;
        ring.style.animation = 'new-pulse 1.8s ease-out 2';
        ring.style.pointerEvents = 'none';
        ring.style.opacity = '0.8';

        el.appendChild(ring);

        const pulseMarker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([lng, lat])
          .addTo(map.current);

        pulseMarkers.current.set(incident.id, pulseMarker);

        // Remove after animation completes
        setTimeout(() => {
          pulseMarker.remove();
          pulseMarkers.current.delete(incident.id);
        }, 3600);
      });
    }
  }, [incidents, newIncidentIds]);

  // Update selection styles WITHOUT recreating markers
  useEffect(() => {
    markers.current.forEach((marker) => {
      const el = marker.getElement();
      const visual = el.firstChild;
      if (!visual) return;

      const color = el.dataset.color;
      const size = parseInt(el.dataset.size, 10);
      const isSelected = el.dataset.incidentId === selectedEventId;

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
      visual.style.background = 'var(--accent-light)';
      visual.style.border = '3px solid #fff';
      visual.style.boxShadow = '0 0 12px var(--accent-glow-strong)';

      const ring = document.createElement('div');
      ring.style.position = 'absolute';
      ring.style.left = '-18px';
      ring.style.top = '-18px';
      ring.style.width = '44px';
      ring.style.height = '44px';
      ring.style.borderRadius = '50%';
      ring.style.border = '2px solid var(--accent-light)';
      ring.style.animation = 'marker-pulse 1.5s infinite';
      ring.style.pointerEvents = 'none';

      el.appendChild(visual);
      el.appendChild(ring);

      tempMarker.current = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([markerCoords.lng, markerCoords.lat])
        .addTo(map.current);
    }
  }, [markerCoords]);

  // Render ghost marker for search-selected incidents outside current date range
  useEffect(() => {
    if (!map.current) return;

    if (ghostMarkerRef.current) {
      ghostMarkerRef.current.remove();
      ghostMarkerRef.current = null;
    }

    if (ghostIncident) {
      const lat = parseFloat(ghostIncident.latitude);
      const lng = parseFloat(ghostIncident.longitude);
      const color = ghostIncident.domain_color || '#6b7280';
      const size = 10;

      const el = document.createElement('div');
      el.style.width = '0';
      el.style.height = '0';
      el.style.position = 'relative';

      const visual = document.createElement('div');
      visual.style.position = 'absolute';
      visual.style.left = `-${size}px`;
      visual.style.top = `-${size}px`;
      visual.style.width = `${size * 2}px`;
      visual.style.height = `${size * 2}px`;
      visual.style.borderRadius = '50%';
      visual.style.background = color;
      visual.style.opacity = '0.5';
      visual.style.border = '2px dashed rgba(255,255,255,0.6)';
      visual.style.boxShadow = `0 0 ${size}px ${color}60`;
      visual.style.cursor = 'pointer';
      visual.style.transition = 'transform 0.15s ease, opacity 0.15s ease';

      // Pulsing ring
      const ring = document.createElement('div');
      ring.style.position = 'absolute';
      ring.style.left = `-${size + 6}px`;
      ring.style.top = `-${size + 6}px`;
      ring.style.width = `${size * 2 + 12}px`;
      ring.style.height = `${size * 2 + 12}px`;
      ring.style.borderRadius = '50%';
      ring.style.border = `1.5px dashed ${color}`;
      ring.style.opacity = '0.4';
      ring.style.animation = 'ghost-pulse 2s ease-in-out infinite';
      ring.style.pointerEvents = 'none';

      visual.addEventListener('mouseenter', () => {
        visual.style.transform = 'scale(1.4)';
        visual.style.opacity = '0.8';
      });
      visual.addEventListener('mouseleave', () => {
        visual.style.transform = 'scale(1)';
        visual.style.opacity = '0.5';
      });

      el.addEventListener('click', () => {
        onEventClick?.(ghostIncident);
      });

      el.appendChild(visual);
      el.appendChild(ring);

      ghostMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lng, lat])
        .addTo(map.current);
    }
  }, [ghostIncident, onEventClick]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      <style>{`
        @keyframes marker-pulse {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes ghost-pulse {
          0% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.15); opacity: 0.2; }
          100% { transform: scale(1); opacity: 0.4; }
        }
        @keyframes new-pulse {
          0% { transform: scale(0.5); opacity: 0.8; }
          100% { transform: scale(3); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
