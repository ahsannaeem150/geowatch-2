import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { SEVERITY_SCALE } from '@shared/constants.js';
import { buildMarkerElement, updateMarkerSelection } from '@shared/marker-builder.js';
import { useTheme } from '@shared/useTheme.js';
import { format } from 'date-fns';

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

export default function UserMap({
  incidents,
  zones = [],
  selectedEventId,
  selectedZoneId,
  onEventClick,
  onZoneClick,
  onViewportChange,
  flyToCoords,
  fitBounds,
  ghostIncident,
  showZones = true,
}) {
  const { theme } = useTheme();
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef(new Map());
  const ghostMarkerRef = useRef(null);
  const popupRef = useRef(null);
  const popupTimeoutRef = useRef(null);
  const isProgrammaticMove = useRef(false);
  const onZoneClickRef = useRef(onZoneClick);
  onZoneClickRef.current = onZoneClick;
  const isClamping = useRef(false);
  const onViewportChangeRef = useRef(onViewportChange);
  onViewportChangeRef.current = onViewportChange;

  const currentStyleUrlRef = useRef(null);
  const zonesRef = useRef(zones);
  zonesRef.current = zones;
  const showZonesRef = useRef(showZones);
  showZonesRef.current = showZones;
  const [styleVersion, setStyleVersion] = useState(0);

  // Initialize map once
  useEffect(() => {
    if (map.current) return;

    const styleUrl = document.documentElement.getAttribute('data-theme') === 'light'
      ? '/map-style-light.json'
      : '/map-style-dark.json';
    currentStyleUrlRef.current = styleUrl;

    const ensureLayers = (mapInstance) => {
      if (!mapInstance || !mapInstance.getStyle()) return;

      if (!mapInstance.getSource('zones')) {
        mapInstance.addSource('zones', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
          promoteId: 'id',
        });
      }

      if (!mapInstance.getLayer('zone-fills')) {
        mapInstance.addLayer({
          id: 'zone-fills',
          type: 'fill',
          source: 'zones',
          paint: {
            'fill-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#f59e0b', ['get', 'fillColor']],
            'fill-opacity': [
              'case',
              ['boolean', ['feature-state', 'hover'], false], 0.12,
              ['boolean', ['feature-state', 'selected'], false], 0.10,
              ['get', 'opacity'],
            ],
          },
        });
      }

      if (!mapInstance.getLayer('zone-outlines')) {
        mapInstance.addLayer({
          id: 'zone-outlines',
          type: 'line',
          source: 'zones',
          paint: {
            'line-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#f59e0b', ['get', 'strokeColor']],
            'line-width': ['get', 'strokeWidth'],
            'line-opacity': [
              'case',
              ['boolean', ['feature-state', 'hover'], false], 0.8,
              ['boolean', ['feature-state', 'selected'], false], 0.9,
              0.6,
            ],
          },
        });
      }
    };

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: styleUrl,
      center: [69.3451, 30.3753],
      zoom: 4.5,
      attributionControl: false,
    });

    map.current.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.current.addControl(new maplibregl.NavigationControl(), 'bottom-right');

    // Report initial bounds once the map is loaded
    map.current.on('load', () => {
      if (!map.current) return;
      ensureLayers(map.current);
      setStyleVersion((v) => v + 1);

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

    // Re-add custom layers after a style change
    map.current.on('style.load', () => {
      if (!map.current) return;
      ensureLayers(map.current);
      setStyleVersion((v) => v + 1);
    });

    // If the map is already loaded (cached style), add layers now
    if (map.current.loaded()) {
      ensureLayers(map.current);
      setStyleVersion((v) => v + 1);
    }

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

    return () => {
      markers.current.forEach((m) => m.remove());
      ghostMarkerRef.current?.remove();
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Fly to coordinates
  useEffect(() => {
    if (!map.current || !flyToCoords) return;
    isProgrammaticMove.current = true;
    map.current.flyTo({
      center: [flyToCoords.lng, flyToCoords.lat],
      zoom: flyToCoords.zoom || 10,
      essential: true,
    });
  }, [flyToCoords]);

  // Fit to bounds (for zone selection)
  useEffect(() => {
    if (!map.current || !fitBounds) return;
    isProgrammaticMove.current = true;
    map.current.fitBounds(fitBounds.bounds, {
      padding: fitBounds.padding ?? 40,
      duration: fitBounds.duration ?? 800,
      essential: true,
    });
  }, [fitBounds]);

  // Update zone source data when zones prop changes
  useEffect(() => {
    if (!map.current) return;
    const source = map.current.getSource('zones');
    if (!source) return;

    const features = showZones
      ? zones.map((zone) => {
          const color = zone.zone_category_color || '#6366f1';
          return {
            type: 'Feature',
            id: String(zone.id),
            geometry: zone.geometry,
            properties: {
              id: zone.id,
              name: zone.title || zone.name,
              fillColor: color,
              strokeColor: color,
              strokeWidth: 2,
              opacity: 0.08,
            },
          };
        })
      : [];

    source.setData({ type: 'FeatureCollection', features });
  }, [zones, showZones, styleVersion]);

  // Zone hover and click interactions
  useEffect(() => {
    if (!map.current) return;
    const mapInstance = map.current;
    const zoneLayers = ['zone-fills', 'zone-outlines'];
    let hoveredZoneId = null;

    const layersReady = () =>
      mapInstance.getLayer('zone-fills') && mapInstance.getLayer('zone-outlines');

    const onMouseMove = (e) => {
      if (!layersReady()) return;
      let features = [];
      try {
        features = mapInstance.queryRenderedFeatures(e.point, { layers: zoneLayers });
      } catch {
        // layers not ready yet
        return;
      }

      if (features.length > 0) {
        const featureId = String(features[0].id);
        if (hoveredZoneId !== featureId) {
          if (hoveredZoneId !== null) {
            try {
              mapInstance.setFeatureState({ source: 'zones', id: hoveredZoneId }, { hover: false });
            } catch {}
          }
          hoveredZoneId = featureId;
          try {
            mapInstance.setFeatureState({ source: 'zones', id: hoveredZoneId }, { hover: true });
          } catch {}
          mapInstance.getCanvas().style.cursor = 'pointer';
        }
      } else {
        if (hoveredZoneId !== null) {
          try {
            mapInstance.setFeatureState({ source: 'zones', id: hoveredZoneId }, { hover: false });
          } catch {}
          hoveredZoneId = null;
        }
        mapInstance.getCanvas().style.cursor = '';
      }
    };

    const onClick = (e) => {
      if (!layersReady()) return;
      let features = [];
      try {
        features = mapInstance.queryRenderedFeatures(e.point, { layers: zoneLayers });
      } catch {
        return;
      }
      if (features.length > 0) {
        const zoneId = String(features[0].id || features[0].properties?.id);
        const zone = zones.find((z) => String(z.id) === zoneId);
        if (zone) onZoneClickRef.current?.(zone);
      }
    };

    mapInstance.on('mousemove', onMouseMove);
    mapInstance.on('click', onClick);

    return () => {
      mapInstance.off('mousemove', onMouseMove);
      mapInstance.off('click', onClick);
    };
  }, [zones]);

  // Update zone selection state
  useEffect(() => {
    if (!map.current) return;
    const source = map.current.getSource('zones');
    if (!source) return;

    zones.forEach((zone) => {
      map.current.setFeatureState(
        { source: 'zones', id: String(zone.id) },
        { selected: String(zone.id) === String(selectedZoneId) }
      );
    });
  }, [selectedZoneId, zones, styleVersion]);

  // Switch map style when theme changes
  useEffect(() => {
    if (!map.current) return;
    const newStyle = theme === 'light' ? '/map-style-light.json' : '/map-style-dark.json';
    if (newStyle === currentStyleUrlRef.current) return;
    currentStyleUrlRef.current = newStyle;
    map.current.setStyle(newStyle);
  }, [theme]);

  // Create / remove / update marker positions when incidents change
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
        existing._incidentData = incident;
        return;
      }

      // Create new marker with domain icon
      const severityConfig = SEVERITY_SCALE.find((s) => s.value === incident.severity) || SEVERITY_SCALE[2];
      const size = severityConfig.radius;

      const el = buildMarkerElement(incident, { size });
      const visual = el.firstChild;
      const color = incident.domain_color || '#6b7280';

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

      // Hover popup
      const showPopup = () => {
        const data = marker._incidentData;
        if (!data) return;
        if (popupRef.current) popupRef.current.remove();
        popupRef.current = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 12,
          className: 'geowatch-popup',
        })
          .setLngLat([parseFloat(data.longitude), parseFloat(data.latitude)])
          .setHTML(buildPopupHTML(data))
          .addTo(map.current);
      };

      const hidePopup = () => {
        clearTimeout(popupTimeoutRef.current);
        if (popupRef.current) {
          popupRef.current.remove();
          popupRef.current = null;
        }
      };

      visual.addEventListener('mouseenter', () => {
        clearTimeout(popupTimeoutRef.current);
        popupTimeoutRef.current = setTimeout(showPopup, 200);
      });
      visual.addEventListener('mouseleave', hidePopup);

      // Click: NO stopPropagation — let MapLibre clean up properly
      el.addEventListener('click', () => {
        hidePopup();
        onEventClick?.(incident);
      });

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lng, lat])
        .addTo(map.current);

      marker._incidentData = incident;
      markers.current.set(incident.id, marker);
    });
  }, [incidents]);

  // Update selection styles WITHOUT recreating markers
  useEffect(() => {
    markers.current.forEach((marker) => {
      const el = marker.getElement();
      const isSelected = el.dataset.incidentId === selectedEventId;
      updateMarkerSelection(el, isSelected);
    });
  }, [selectedEventId]);

  // Render ghost marker for out-of-range selected incidents
  useEffect(() => {
    if (!map.current) return;

    if (ghostMarkerRef.current) {
      ghostMarkerRef.current.remove();
      ghostMarkerRef.current = null;
    }

    if (ghostIncident) {
      const lat = parseFloat(ghostIncident.latitude);
      const lng = parseFloat(ghostIncident.longitude);
      const size = 10;

      const el = buildMarkerElement(ghostIncident, { size, isGhost: true });
      const visual = el.firstChild;

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

      ghostMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lng, lat])
        .addTo(map.current);
    }
  }, [ghostIncident, onEventClick]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      <style>{`
        @keyframes ghost-pulse {
          0% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.15); opacity: 0.2; }
          100% { transform: scale(1); opacity: 0.4; }
        }
        @keyframes marker-pulse-new {
          0% { transform: scale(0.8); opacity: 0.7; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .geowatch-popup .maplibregl-popup-content {
          background: var(--bg-surface);
          color: var(--text-primary);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-subtle);
          padding: 0;
          box-shadow: var(--shadow-lg);
          font-family: var(--font-sans);
          max-width: 280px;
        }
        .geowatch-popup .maplibregl-popup-tip {
          border-top-color: var(--bg-surface);
        }
      `}</style>
    </div>
  );
}

function buildPopupHTML(incident) {
  const vCfg = incident.verification_status ? VERIFICATION_CONFIG[incident.verification_status] : null;
  const sevCfg = SEVERITY_SCALE.find((s) => s.value === incident.severity) || SEVERITY_SCALE[2];
  const dateStr = incident.start_date
    ? format(new Date(incident.start_date), 'MMM d, yyyy · h:mm a')
    : '';
  const desc = incident.description
    ? incident.description.length > 100
      ? incident.description.slice(0, 100) + '...'
      : incident.description
    : '';

  return `
    <div style="padding: 12px;">
      <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px; flex-wrap: wrap;">
        <span style="font-size: 10px; font-weight: 700; color: ${incident.domain_color || '#6b7280'}; background: ${(incident.domain_color || '#6b7280') + '15'}; padding: 2px 8px; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
          ${incident.domain_name || 'Unknown'}
        </span>
        <span style="font-size: 10px; font-weight: 700; color: ${sevCfg.color}; background: ${sevCfg.color + '15'}; padding: 2px 8px; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
          ${sevCfg.label}
        </span>
        ${vCfg ? `<span style="font-size: 10px; font-weight: 700; color: ${vCfg.color}; background: ${vCfg.color + '15'}; padding: 2px 8px; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px;">${vCfg.icon} ${vCfg.label}</span>` : ''}
      </div>
      <div style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px; line-height: 1.3;">
        ${escapeHtml(incident.title)}
      </div>
      ${desc ? `<div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px; line-height: 1.4;">${escapeHtml(desc)}</div>` : ''}
      <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">
        <span>📍 ${incident.location_context ? escapeHtml(incident.location_context) : `${parseFloat(incident.latitude).toFixed(3)}, ${parseFloat(incident.longitude).toFixed(3)}`}</span>
      </div>
      ${dateStr ? `<div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); margin-top: 4px;">📅 ${dateStr}</div>` : ''}
      <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border-subtle);">
        <span style="font-size: 11px; color: var(--accent-light); font-weight: 600;">Click for details →</span>
      </div>
    </div>
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
