import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { SEVERITY_SCALE, VERIFICATION_CONFIG } from '@shared/constants.js';
import { buildMarkerElement, updateMarkerSelection } from '@shared/marker-builder.js';
import { useTheme } from '@shared/useTheme.js';
import { format } from 'date-fns';

const TILE_BBOX = [25.3125, 4.7626, 105.1831, 42.5531];
const HOT_BBOX = [26.3125, 5.7626, 104.1831, 41.5531];

function getMaxZoomForCenter(lng, lat) {
  const [minLng, minLat, maxLng, maxLat] = HOT_BBOX;
  const inside = lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
  return inside ? 14 : 10;
}

export default function SuperadminMap({
  incidents,
  selectedEventId,
  onEventClick,
  onViewportChange,
  flyToCoords,
  ghostIncident,
  adminMode = false,
}) {
  const { theme } = useTheme();
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef(new Map());
  const ghostMarkerRef = useRef(null);
  const popupRef = useRef(null);
  const popupTimeoutRef = useRef(null);
  const isProgrammaticMove = useRef(false);
  const isClamping = useRef(false);
  const onViewportChangeRef = useRef(onViewportChange);
  onViewportChangeRef.current = onViewportChange;

  const [showDebug, setShowDebug] = useState(false);

  // Initialize map once
  useEffect(() => {
    if (map.current) return;

    const styleUrl = document.documentElement.getAttribute('data-theme') === 'light'
      ? '/map-style-light.json'
      : '/map-style-dark.json';
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: styleUrl,
      center: [69.3451, 30.3753],
      zoom: 4.5,
      attributionControl: false,
    });

    map.current.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.current.addControl(new maplibregl.NavigationControl(), 'bottom-right');

    map.current.on('load', () => {
      if (!map.current) return;
      const bounds = map.current.getBounds();
      const viewport = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
      onViewportChangeRef.current?.(viewport);
      const center = map.current.getCenter();
      map.current.setMaxZoom(getMaxZoomForCenter(center.lng, center.lat));
    });

    map.current.on('move', () => {
      if (!map.current || isProgrammaticMove.current || isClamping.current) return;
      const center = map.current.getCenter();
      const newMaxZoom = getMaxZoomForCenter(center.lng, center.lat);
      map.current.setMaxZoom(newMaxZoom);
      const currentZoom = map.current.getZoom();
      if (currentZoom > newMaxZoom) {
        isClamping.current = true;
        map.current.jumpTo({ zoom: newMaxZoom });
        setTimeout(() => { isClamping.current = false; }, 0);
      }
    });

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

  // Switch map style when theme changes
  useEffect(() => {
    if (!map.current) return;
    const newStyle = theme === 'light' ? '/map-style-light.json' : '/map-style-dark.json';
    map.current.setStyle(newStyle);
  }, [theme]);

  // Create / remove / update marker positions when incidents change
  useEffect(() => {
    if (!map.current) return;

    const currentIds = new Set(incidents.map((i) => i.id));
    const existingIds = Array.from(markers.current.keys());

    existingIds.forEach((id) => {
      if (!currentIds.has(id)) {
        markers.current.get(id)?.remove();
        markers.current.delete(id);
      }
    });

    incidents.forEach((incident) => {
      const existing = markers.current.get(incident.id);
      const lat = parseFloat(incident.latitude);
      const lng = parseFloat(incident.longitude);

      if (existing) {
        existing.setLngLat([lng, lat]);
        existing._incidentData = incident;
        return;
      }

      const severityConfig = SEVERITY_SCALE.find((s) => s.value === incident.severity) || SEVERITY_SCALE[2];
      const size = severityConfig.radius;

      const el = buildMarkerElement(incident, { size });
      const visual = el.firstChild;
      const color = incident.domain_color || '#6b7280';

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
          .setHTML(buildPopupHTML(data, showDebug && adminMode))
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
  }, [incidents, showDebug, adminMode]);

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

  const adminUrl = typeof window !== 'undefined'
    ? window.location.origin.replace(':5175', ':5174')
    : 'http://localhost:5174';

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      {/* Admin Mode Debug Toggle */}
      {adminMode && (
        <button
          onClick={() => setShowDebug((s) => !s)}
          style={{
            position: 'absolute',
            bottom: '80px',
            left: '12px',
            zIndex: 50,
            padding: '6px 12px',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            borderRadius: '6px',
            border: `1px solid ${showDebug ? '#f59e0b' : 'var(--border-subtle)'}`,
            background: showDebug ? 'var(--hover-strong)' : 'var(--bg-surface)',
            color: showDebug ? '#f59e0b' : 'var(--text-muted)',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.2s ease',
          }}
        >
          {showDebug ? '🔍 Debug On' : '🔍 Debug Off'}
        </button>
      )}

      {/* New Incident button (adminMode only) */}
      {adminMode && (
        <a
          href={`${adminUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position: 'absolute',
            bottom: '80px',
            right: '12px',
            zIndex: 50,
            padding: '8px 14px',
            fontSize: '12px',
            fontWeight: 700,
            borderRadius: '8px',
            border: '1px solid var(--navy-500)',
            background: 'linear-gradient(135deg, var(--navy-600), var(--navy-700))',
            color: '#fff',
            textDecoration: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 14px var(--alert-info-border)',
            transition: 'all 0.2s ease',
          }}
        >
          + New Incident
        </a>
      )}

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
          max-width: 320px;
        }
        .geowatch-popup .maplibregl-popup-tip {
          border-top-color: var(--bg-surface);
        }
      `}</style>
    </div>
  );
}

function buildPopupHTML(incident, showDebug) {
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

  const adminUrl = typeof window !== 'undefined'
    ? window.location.origin.replace(':5175', ':5174')
    : 'http://localhost:5174';

  let debugSection = '';
  if (showDebug) {
    debugSection = `
      <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed var(--border-subtle);">
        <div style="font-size: 10px; color: var(--text-muted); font-family: var(--font-mono); line-height: 1.6;">
          <div>ID: ${incident.id?.slice(0, 8)}...</div>
          <div>Created: ${incident.created_by || 'unknown'}</div>
          <div>Category: ${incident.category_name || '—'}</div>
          <div>Verification: ${incident.verification_status || '—'}</div>
        </div>
      </div>
    `;
  }

  const adminLink = adminMode ? `
    <div style="margin-top: 8px;">
      <a href="${adminUrl}" target="_blank" style="font-size: 11px; color: var(--navy-400); font-weight: 600; text-decoration: none;">Open in Admin →</a>
    </div>
  ` : '';

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
      ${debugSection}
      ${adminLink}
    </div>
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
