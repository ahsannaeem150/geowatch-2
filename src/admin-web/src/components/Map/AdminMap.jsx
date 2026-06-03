import React, { useRef, useEffect } from 'react';
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

export default function AdminMap({
  incidents = [],
  zones = [],
  selectedEventId,
  selectedZoneId,
  onEventClick,
  onZoneClick,
  onMapDblClick,
  onViewportChange,
  flyToCoords,
  fitBounds,
  markerCoords,
  ghostIncident,
  newIncidentIds = new Set(),
  mapMode = 'pan',
  drawVertices = [],
  isPolygonClosed = false,
  onDrawVertexAdd,
  onDrawClose,
  onDrawCancel,
  editingZoneId = null,
  editingZoneVertices = [],
  onVertexDrag,
  onMidpointClick,
  onVertexDoubleClick,
}) {
  const { theme } = useTheme();
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef(new Map());
  const tempMarker = useRef(null);
  const ghostMarkerRef = useRef(null);
  const popupRef = useRef(null);
  const popupTimeoutRef = useRef(null);
  const isProgrammaticMove = useRef(false);
  const isClamping = useRef(false);
  const onViewportChangeRef = useRef(onViewportChange);
  const rubberBandCoords = useRef(null);
  const mapModeRef = useRef(mapMode);
  const drawVerticesRef = useRef(drawVertices);
  const isPolygonClosedRef = useRef(isPolygonClosed);
  const editingZoneIdRef = useRef(editingZoneId);
  const isDraggingVertex = useRef(false);
  const draggedVertexIndex = useRef(null);
  const onDrawCloseRef = useRef(onDrawClose);
  const onMapDblClickRef = useRef(onMapDblClick);
  const onVertexDragRef = useRef(onVertexDrag);
  const onMidpointClickRef = useRef(onMidpointClick);
  const onVertexDoubleClickRef = useRef(onVertexDoubleClick);
  onViewportChangeRef.current = onViewportChange;
  mapModeRef.current = mapMode;
  drawVerticesRef.current = drawVertices;
  isPolygonClosedRef.current = isPolygonClosed;
  editingZoneIdRef.current = editingZoneId;
  onDrawCloseRef.current = onDrawClose;
  onMapDblClickRef.current = onMapDblClick;
  onVertexDragRef.current = onVertexDrag;
  onMidpointClickRef.current = onMidpointClick;
  onVertexDoubleClickRef.current = onVertexDoubleClick;

  // Initialize map once
  useEffect(() => {
    const styleUrl = document.documentElement.getAttribute('data-theme') === 'light'
      ? '/map-style-light.json'
      : '/map-style-dark.json';
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: styleUrl,
      center: [20, 30],
      zoom: 2,
      attributionControl: false,
      doubleClickZoom: false,
    });

    map.current.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.current.on('dblclick', (e) => {
      // Editing mode: delete vertex on double-click (ignore empty area and midpoints)
      if (editingZoneIdRef.current) {
        const midpointFeatures = map.current.queryRenderedFeatures(e.point, { layers: ['edit-midpoints'] });
        if (midpointFeatures.length > 0) return;

        const features = map.current.queryRenderedFeatures(e.point, { layers: ['edit-vertices'] });
        if (features.length > 0) {
          const idx = features[0].properties.index;
          onVertexDoubleClickRef.current?.(idx);
        }
        return;
      }

      // Drawing mode: close polygon
      if (mapModeRef.current === 'polygon' && drawVerticesRef.current.length >= 2) {
        onDrawCloseRef.current?.();
        return;
      }

      const { lng, lat } = e.lngLat;
      onMapDblClickRef.current?.({ lat, lng });
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

      // ─── Zone layers (added BEFORE markers so markers render on top) ───
      map.current.addSource('zones', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        promoteId: 'id',
      });

      map.current.addLayer({
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

      map.current.addLayer({
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

      // ─── Drawing preview layers ───
      map.current.addSource('draw-preview', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.current.addLayer({
        id: 'draw-preview-fill',
        type: 'fill',
        source: 'draw-preview',
        paint: {
          'fill-color': '#3b82f6',
          'fill-opacity': 0.06,
        },
      });

      map.current.addLayer({
        id: 'draw-preview-line',
        type: 'line',
        source: 'draw-preview',
        paint: {
          'line-color': '#3b82f6',
          'line-width': 2,
          'line-dasharray': [4, 3],
          'line-opacity': 0.7,
        },
      });

      map.current.addLayer({
        id: 'draw-preview-vertices',
        type: 'circle',
        source: 'draw-preview',
        filter: ['==', ['get', 'isVertex'], true],
        paint: {
          'circle-radius': 5,
          'circle-color': '#fff',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#3b82f6',
        },
      });

      map.current.addLayer({
        id: 'draw-preview-rubber',
        type: 'line',
        source: 'draw-preview',
        filter: ['==', ['get', 'isRubberBand'], true],
        paint: {
          'line-color': '#3b82f6',
          'line-width': 2,
          'line-dasharray': [2, 2],
          'line-opacity': 0.5,
        },
      });

      // ─── Zone edit layers ───
      map.current.addSource('edit-zone', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.current.addLayer({
        id: 'edit-zone-fill',
        type: 'fill',
        source: 'edit-zone',
        paint: {
          'fill-color': '#f59e0b',
          'fill-opacity': 0.12,
        },
      });

      map.current.addLayer({
        id: 'edit-zone-outline',
        type: 'line',
        source: 'edit-zone',
        paint: {
          'line-color': '#f59e0b',
          'line-width': 2,
          'line-dasharray': [4, 3],
          'line-opacity': 0.9,
        },
      });

      map.current.addSource('edit-vertices', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.current.addLayer({
        id: 'edit-vertices',
        type: 'circle',
        source: 'edit-vertices',
        paint: {
          'circle-radius': 6,
          'circle-color': '#fff',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#f59e0b',
        },
      });

      map.current.addSource('edit-midpoints', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.current.addLayer({
        id: 'edit-midpoints',
        type: 'circle',
        source: 'edit-midpoints',
        paint: {
          'circle-radius': 4,
          'circle-color': 'rgba(245, 158, 11, 0.6)',
        },
      });

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
      popupRef.current?.remove();
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

  // Fit to bounds (for zone selection)
  useEffect(() => {
    if (fitBounds && map.current) {
      isProgrammaticMove.current = true;
      map.current.fitBounds(fitBounds.bounds, {
        padding: fitBounds.padding ?? 40,
        duration: fitBounds.duration ?? 800,
      });
    }
  }, [fitBounds]);

  // Switch map style when theme changes
  useEffect(() => {
    if (!map.current) return;
    const newStyle = theme === 'light' ? '/map-style-light.json' : '/map-style-dark.json';
    map.current.setStyle(newStyle);
  }, [theme]);

  // Create / remove / update markers when incidents change
  useEffect(() => {
    if (!map.current) return;

    const currentIds = new Set(incidents.map((i) => i.id));
    const existingIds = Array.from(markers.current.keys());

    // Remove markers for incidents that no longer exist
    let didRemoveAny = false;
    existingIds.forEach((id) => {
      if (!currentIds.has(id)) {
        markers.current.get(id)?.remove();
        markers.current.delete(id);
        didRemoveAny = true;
      }
    });

    // If any marker was removed, also remove any open popup to prevent it getting stuck
    if (didRemoveAny) {
      popupRef.current?.remove();
      popupRef.current = null;
      clearTimeout(popupTimeoutRef.current);
    }

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

      // Create new marker with domain icon
      const severityConfig = SEVERITY_SCALE.find((s) => s.value === incident.severity) || SEVERITY_SCALE[2];
      const size = severityConfig.radius;
      const isNew = newIncidentIds.has(incident.id);

      const el = buildMarkerElement(incident, { size, isNew });
      const visual = el.firstChild;

      // Hover: scale the CHILD only, never the parent
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
          .setHTML(buildPopupHTML(data, true))
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

  }, [incidents, newIncidentIds]);

  // Update selection styles WITHOUT recreating markers
  useEffect(() => {
    markers.current.forEach((marker) => {
      const el = marker.getElement();
      const isSelected = el.dataset.incidentId === selectedEventId;
      updateMarkerSelection(el, isSelected);
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

  // ─── Update zone source data when zones prop changes ───
  useEffect(() => {
    if (!map.current) return;
    const source = map.current.getSource('zones');
    if (!source) return;

    const features = zones
      .filter((zone) => zone.id !== editingZoneId)
      .map((zone) => ({
        type: 'Feature',
        id: zone.id,
        geometry: zone.geometry,
        properties: {
          name: zone.name,
          fillColor: zone.fill_color || '#9f1239',
          strokeColor: zone.stroke_color || '#9f1239',
          strokeWidth: zone.stroke_width ?? 2,
          opacity: parseFloat(zone.opacity ?? 0.08),
        },
      }));

    source.setData({ type: 'FeatureCollection', features });
  }, [zones, editingZoneId]);

  // ─── Zone hover interaction ───
  useEffect(() => {
    if (!map.current) return;
    const mapInstance = map.current;
    let hoveredZoneId = null;

    const onMouseMove = (e) => {
      // Skip zone hover when in polygon drawing mode or editing mode
      if (mapModeRef.current === 'polygon' || editingZoneIdRef.current) {
        if (hoveredZoneId !== null) {
          mapInstance.setFeatureState({ source: 'zones', id: hoveredZoneId }, { hover: false });
          hoveredZoneId = null;
        }
        return;
      }

      const features = mapInstance.queryRenderedFeatures(e.point, { layers: ['zone-fills'] });
      if (features.length > 0) {
        const feature = features[0];
        if (hoveredZoneId !== feature.id) {
          if (hoveredZoneId !== null) {
            mapInstance.setFeatureState({ source: 'zones', id: hoveredZoneId }, { hover: false });
          }
          hoveredZoneId = feature.id;
          mapInstance.setFeatureState({ source: 'zones', id: hoveredZoneId }, { hover: true });
          mapInstance.getCanvas().style.cursor = 'pointer';
        }
      } else {
        if (hoveredZoneId !== null) {
          mapInstance.setFeatureState({ source: 'zones', id: hoveredZoneId }, { hover: false });
          hoveredZoneId = null;
        }
        mapInstance.getCanvas().style.cursor = '';
      }
    };

    const onClick = (e) => {
      // Skip zone clicks when in polygon drawing mode or editing mode
      if (mapModeRef.current === 'polygon' || editingZoneIdRef.current) return;
      const features = mapInstance.queryRenderedFeatures(e.point, { layers: ['zone-fills'] });
      if (features.length > 0) {
        const zoneId = features[0].id;
        onZoneClick?.(zoneId);
      }
    };

    mapInstance.on('mousemove', onMouseMove);
    mapInstance.on('click', onClick);

    return () => {
      mapInstance.off('mousemove', onMouseMove);
      mapInstance.off('click', onClick);
    };
  }, [onZoneClick]);

  // ─── Zone selection state ───
  useEffect(() => {
    if (!map.current) return;
    const source = map.current.getSource('zones');
    if (!source) return;

    zones.forEach((zone) => {
      if (zone.id === editingZoneId) return;
      map.current.setFeatureState(
        { source: 'zones', id: zone.id },
        { selected: zone.id === selectedZoneId }
      );
    });
  }, [selectedZoneId, zones, editingZoneId]);

  // ─── Update edit zone sources when editing ───
  useEffect(() => {
    if (!map.current) return;

    const zoneSource = map.current.getSource('edit-zone');
    const vertexSource = map.current.getSource('edit-vertices');
    const midpointSource = map.current.getSource('edit-midpoints');

    if (!zoneSource || !vertexSource || !midpointSource) return;

    if (editingZoneId && editingZoneVertices.length >= 3) {
      const closedRing = [...editingZoneVertices, editingZoneVertices[0]];

      zoneSource.setData({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [closedRing] },
          properties: {},
        }],
      });

      vertexSource.setData({
        type: 'FeatureCollection',
        features: editingZoneVertices.map((coord, idx) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: coord },
          properties: { index: idx },
        })),
      });

      const midpoints = [];
      for (let i = 0; i < editingZoneVertices.length; i++) {
        const a = editingZoneVertices[i];
        const b = editingZoneVertices[(i + 1) % editingZoneVertices.length];
        midpoints.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] },
          properties: { edgeIndex: i },
        });
      }

      midpointSource.setData({
        type: 'FeatureCollection',
        features: midpoints,
      });
    } else {
      zoneSource.setData({ type: 'FeatureCollection', features: [] });
      vertexSource.setData({ type: 'FeatureCollection', features: [] });
      midpointSource.setData({ type: 'FeatureCollection', features: [] });
    }
  }, [editingZoneId, editingZoneVertices]);

  // ─── Drawing preview data update ───
  useEffect(() => {
    if (!map.current) return;
    const source = map.current.getSource('draw-preview');
    if (!source) return;

    const features = [];

    if (mapMode === 'polygon' && drawVertices.length > 0) {
      // Vertex dots
      drawVertices.forEach((coord, idx) => {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: coord },
          properties: { isVertex: true, index: idx },
        });
      });

      // Polygon line connecting vertices
      if (drawVertices.length >= 2) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: isPolygonClosed
              ? [...drawVertices, drawVertices[0]]
              : drawVertices,
          },
          properties: { isLine: true },
        });
      }

      // Polygon fill if >= 3 vertices
      if (drawVertices.length >= 3) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[...drawVertices, drawVertices[0]]],
          },
          properties: { isFill: true },
        });
      }

      // Rubber band line from last vertex to cursor
      if (!isPolygonClosed && rubberBandCoords.current) {
        const last = drawVertices[drawVertices.length - 1];
        features.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [last, rubberBandCoords.current],
          },
          properties: { isRubberBand: true },
        });
      }
    }

    source.setData({ type: 'FeatureCollection', features });
  }, [mapMode, drawVertices, isPolygonClosed]);

  // ─── Drawing click handler ───
  useEffect(() => {
    if (!map.current) return;
    const mapInstance = map.current;

    const onClick = (e) => {
      if (mapModeRef.current !== 'polygon') return;
      if (isPolygonClosedRef.current) return;

      const { lng, lat } = e.lngLat;

      // Check if user clicked on the first vertex to close the polygon
      if (drawVerticesRef.current.length >= 3) {
        const first = drawVerticesRef.current[0];
        // Use a small pixel tolerance for vertex click detection
        const firstPixel = mapInstance.project(first);
        const clickPixel = e.point;
        const dist = Math.sqrt(
          Math.pow(firstPixel.x - clickPixel.x, 2) +
          Math.pow(firstPixel.y - clickPixel.y, 2)
        );
        if (dist < 15) {
          onDrawClose?.();
          return;
        }
      }

      onDrawVertexAdd?.({ lat, lng });
    };

    mapInstance.on('click', onClick);
    return () => {
      mapInstance.off('click', onClick);
    };
  }, [onDrawVertexAdd, onDrawClose]);

  // ─── Rubber band mousemove ───
  useEffect(() => {
    if (!map.current) return;
    const mapInstance = map.current;

    const onMouseMove = (e) => {
      if (mapModeRef.current !== 'polygon') return;
      if (isPolygonClosedRef.current) return;
      if (drawVerticesRef.current.length === 0) return;

      rubberBandCoords.current = [e.lngLat.lng, e.lngLat.lat];
      // Trigger re-render of draw-preview source
      const source = mapInstance.getSource('draw-preview');
      if (!source) return;

      const features = [];

      // Rebuild all features with updated rubber band
      drawVerticesRef.current.forEach((coord, idx) => {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: coord },
          properties: { isVertex: true, index: idx },
        });
      });

      if (drawVerticesRef.current.length >= 2) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: drawVerticesRef.current,
          },
          properties: { isLine: true },
        });
      }

      if (drawVerticesRef.current.length >= 3) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[...drawVerticesRef.current, drawVerticesRef.current[0]]],
          },
          properties: { isFill: true },
        });
      }

      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            drawVerticesRef.current[drawVerticesRef.current.length - 1],
            [e.lngLat.lng, e.lngLat.lat],
          ],
        },
        properties: { isRubberBand: true },
      });

      source.setData({ type: 'FeatureCollection', features });
    };

    mapInstance.on('mousemove', onMouseMove);
    return () => {
      mapInstance.off('mousemove', onMouseMove);
    };
  }, []);

  // ─── Escape key to cancel drawing ───
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && mapModeRef.current === 'polygon') {
        onDrawCancel?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onDrawCancel]);

  // ─── Cursor change for drawing mode ───
  useEffect(() => {
    if (!map.current) return;
    map.current.getCanvas().style.cursor = mapMode === 'polygon' ? 'crosshair' : '';
  }, [mapMode]);

  // ─── Clear drawing preview when leaving polygon mode ───
  useEffect(() => {
    if (!map.current) return;
    const source = map.current.getSource('draw-preview');
    if (!source) return;
    if (mapMode !== 'polygon') {
      rubberBandCoords.current = null;
      source.setData({ type: 'FeatureCollection', features: [] });
    }
  }, [mapMode]);

  // ─── Vertex drag, midpoint click, and vertex double-click interactions ───
  useEffect(() => {
    if (!map.current) return;
    const mapInstance = map.current;

    const onMouseDown = (e) => {
      if (!editingZoneIdRef.current) return;

      const features = mapInstance.queryRenderedFeatures(e.point, { layers: ['edit-vertices'] });
      if (features.length > 0) {
        const idx = features[0].properties.index;
        isDraggingVertex.current = true;
        draggedVertexIndex.current = idx;
        mapInstance.dragPan.disable();
        mapInstance.getCanvas().style.cursor = 'grabbing';
      }
    };

    const onMouseMove = (e) => {
      if (!isDraggingVertex.current) return;
      const idx = draggedVertexIndex.current;
      if (idx !== null) {
        onVertexDragRef.current?.(idx, { lng: e.lngLat.lng, lat: e.lngLat.lat });
      }
    };

    const onMouseUp = () => {
      if (isDraggingVertex.current) {
        isDraggingVertex.current = false;
        draggedVertexIndex.current = null;
        mapInstance.dragPan.enable();
        mapInstance.getCanvas().style.cursor = '';
      }
    };

    const onClick = (e) => {
      if (!editingZoneIdRef.current) return;
      if (isDraggingVertex.current) return;

      const midpointFeatures = mapInstance.queryRenderedFeatures(e.point, { layers: ['edit-midpoints'] });
      if (midpointFeatures.length > 0) {
        const edgeIndex = midpointFeatures[0].properties.edgeIndex;
        onMidpointClickRef.current?.(edgeIndex);
        return;
      }
    };

    const onMouseMoveCursor = (e) => {
      if (!editingZoneIdRef.current) return;
      if (isDraggingVertex.current) {
        mapInstance.getCanvas().style.cursor = 'grabbing';
        return;
      }

      const vertexFeatures = mapInstance.queryRenderedFeatures(e.point, { layers: ['edit-vertices'] });
      if (vertexFeatures.length > 0) {
        mapInstance.getCanvas().style.cursor = 'grab';
        return;
      }

      const midpointFeatures = mapInstance.queryRenderedFeatures(e.point, { layers: ['edit-midpoints'] });
      if (midpointFeatures.length > 0) {
        mapInstance.getCanvas().style.cursor = 'crosshair';
        return;
      }

      mapInstance.getCanvas().style.cursor = '';
    };

    mapInstance.on('mousedown', onMouseDown);
    mapInstance.on('mousemove', onMouseMove);
    mapInstance.on('mouseup', onMouseUp);
    mapInstance.on('click', onClick);
    mapInstance.on('mousemove', onMouseMoveCursor);

    return () => {
      mapInstance.off('mousedown', onMouseDown);
      mapInstance.off('mousemove', onMouseMove);
      mapInstance.off('mouseup', onMouseUp);
      mapInstance.off('click', onClick);
      mapInstance.off('mousemove', onMouseMoveCursor);
    };
  }, []);

  // ─── Area calculator helper ───
  const calculateDrawArea = () => {
    if (drawVertices.length < 3) return 0;
    const coords = isPolygonClosed
      ? drawVertices
      : drawVertices;
    let area = 0;
    for (let i = 0; i < coords.length; i++) {
      const j = (i + 1) % coords.length;
      area += coords[i][0] * coords[j][1];
      area -= coords[j][0] * coords[i][1];
    }
    return Math.abs(area) / 2 * 111.32 * 111.32;
  };

  const drawAreaKm2 = mapMode === 'polygon' ? calculateDrawArea() : 0;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      {/* Drawing area indicator */}
      {mapMode === 'polygon' && drawVertices.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            background: 'var(--bg-surface)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 16px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            boxShadow: 'var(--shadow-lg)',
            pointerEvents: 'none',
          }}
        >
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            {drawVertices.length} vertex{drawVertices.length !== 1 ? 'es' : ''}
          </span>
          {drawVertices.length >= 3 && (
            <span style={{ marginLeft: '12px' }}>
              Area: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {drawAreaKm2 < 1
                  ? `~${(drawAreaKm2 * 100).toFixed(1)} ha`
                  : drawAreaKm2 < 1000
                    ? `~${drawAreaKm2.toFixed(1)} km²`
                    : `~${(drawAreaKm2 / 1000).toFixed(1)}k km²`}
              </span>
            </span>
          )}
          <span style={{ marginLeft: '12px', color: 'var(--text-muted)', fontSize: '11px' }}>
            {isPolygonClosed ? 'Polygon closed — click Save' : 'Double-click or click first vertex to close'}
          </span>
        </div>
      )}

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

function buildPopupHTML(incident, isAdmin) {
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

  const adminActions = isAdmin
    ? `<div style="display: flex; gap: 6px; margin-top: 8px;">
        <span style="font-size: 11px; color: var(--accent-light); font-weight: 600; cursor: pointer;">Click to edit →</span>
      </div>`
    : `<div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border-subtle);">
        <span style="font-size: 11px; color: var(--accent-light); font-weight: 600;">Click for details →</span>
      </div>`;

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
      ${adminActions}
    </div>
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
