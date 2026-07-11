import React, { useRef, useEffect, useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { SEVERITY_SCALE, VERIFICATION_CONFIG } from '@shared/constants.js';
import { buildMarkerElement, updateMarkerSelection } from '@shared/marker-builder.js';
import { useTheme } from '@shared/useTheme.js';
import ZoneSvgOverlay from '@shared/components/ZoneSvgOverlay.jsx';
import { ringArea, smallestZoneFeature } from '@shared/utils/zoneGeometry.js';
import { format } from 'date-fns';

// Tile coverage: z0-14 tiles exist inside HOT_BBOX, only z0-10 outside it.
// We allow unrestricted zoom (up to MapLibre's default) inside the hot zone
// and keep the outside world capped at z10.
const TILE_BBOX = [25.3125, 4.7626, 105.1831, 42.5531];
const HOT_BBOX = [26.3125, 5.7626, 104.1831, 41.5531]; // 1° inset

// ─── Pixel-distance helpers for reliable vertex/edge hit-testing ───
// queryRenderedFeatures with tiny circle radii is too hard for users to hit.
// These project geo coords to screen pixels and compute distance directly.

function findNearestDrawVertex(point, vertices, mapInstance, tolerance = 12) {
  let nearestIdx = -1;
  let nearestDist = Infinity;
  vertices.forEach((coord, idx) => {
    const pixel = mapInstance.project(coord);
    const dist = Math.sqrt(Math.pow(pixel.x - point.x, 2) + Math.pow(pixel.y - point.y, 2));
    if (dist < tolerance && dist < nearestDist) {
      nearestDist = dist;
      nearestIdx = idx;
    }
  });
  return nearestIdx;
}

function screenDistanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

function findNearestEditEdge(point, vertices, mapInstance, tolerance = 10) {
  let nearestIdx = -1;
  let nearestDist = Infinity;
  vertices.forEach((coord, idx) => {
    const a = mapInstance.project(coord);
    const b = mapInstance.project(vertices[(idx + 1) % vertices.length]);
    const dist = screenDistanceToSegment(point.x, point.y, a.x, a.y, b.x, b.y);
    if (dist < tolerance && dist < nearestDist) {
      nearestDist = dist;
      nearestIdx = idx;
    }
  });
  return nearestIdx;
}

function getMaxZoomForCenter(lng, lat) {
  const [minLng, minLat, maxLng, maxLat] = HOT_BBOX;
  const inside = lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
  return inside ? 22 : 10;
}

const AdminMap = forwardRef(function AdminMap({
  incidents = [],
  zones = [],
  selectedEventId,
  selectedZoneId,
  onEventClick,
  onZoneClick,
  onMapDblClick,
  onViewportChange,
  flyToCoords,
  initialViewport,
  markerCoords,
  ghostIncident,
  ghostZone,
  newIncidentIds = new Set(),
  mapMode = 'pan',
  drawVertices = [],
  isPolygonClosed = false,
  onDrawVertexAdd,
  onDrawClose,
  onDrawCancel,
  selectedDrawVertexIndex = null,
  onDrawVertexSelect,
  onDrawVertexMove,
  onDrawVertexDragEnd,
  onContextMenu,
  onMarkerContextMenu,
  onZoneContextMenu,
  onMapContextMenu,
  onDrawVertexDelete,
  onDrawUndo,
  onDrawRedo,
  editingZoneId = null,
  editingZoneVertices = [],
  selectedEditVertexIndex = null,
  onVertexDrag,
  onVertexDragEnd,
  onMidpointClick,
  onVertexDoubleClick,
  onEditVertexSelect,
  onEditVertexDelete,
  onEditUndo,
  onEditCancel,
  showZones = true,
  autoZoomEnabled = true,
}, ref) {
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
  const onEventClickRef = useRef(onEventClick);
  const onZoneClickRef = useRef(onZoneClick);
  const rubberBandCoords = useRef(null);
  const mapModeRef = useRef(mapMode);
  const drawVerticesRef = useRef(drawVertices);
  const isPolygonClosedRef = useRef(isPolygonClosed);
  const editingZoneIdRef = useRef(editingZoneId);
  const editingZoneVerticesRef = useRef(editingZoneVertices);
  const isDraggingVertex = useRef(false);
  const draggedVertexIndex = useRef(null);
  const didDragVertex = useRef(false);
  const dragStartPixelVertex = useRef({ x: 0, y: 0 });
  const selectedEditVertexIndexRef = useRef(selectedEditVertexIndex);
  const onDrawCloseRef = useRef(onDrawClose);
  const onMapDblClickRef = useRef(onMapDblClick);
  const onVertexDragRef = useRef(onVertexDrag);
  const onVertexDragEndRef = useRef(onVertexDragEnd);
  const onMidpointClickRef = useRef(onMidpointClick);
  const onVertexDoubleClickRef = useRef(onVertexDoubleClick);
  const onEditVertexSelectRef = useRef(onEditVertexSelect);
  const onEditVertexDeleteRef = useRef(onEditVertexDelete);
  const onEditUndoRef = useRef(onEditUndo);
  const onEditCancelRef = useRef(onEditCancel);
  onViewportChangeRef.current = onViewportChange;
  onEventClickRef.current = onEventClick;
  onZoneClickRef.current = onZoneClick;
  mapModeRef.current = mapMode;
  drawVerticesRef.current = drawVertices;
  isPolygonClosedRef.current = isPolygonClosed;
  editingZoneIdRef.current = editingZoneId;
  editingZoneVerticesRef.current = editingZoneVertices;
  onDrawCloseRef.current = onDrawClose;
  onMapDblClickRef.current = onMapDblClick;
  onVertexDragRef.current = onVertexDrag;
  onVertexDragEndRef.current = onVertexDragEnd;
  onMidpointClickRef.current = onMidpointClick;
  onVertexDoubleClickRef.current = onVertexDoubleClick;
  onEditVertexSelectRef.current = onEditVertexSelect;
  onEditVertexDeleteRef.current = onEditVertexDelete;
  onEditUndoRef.current = onEditUndo;
  onEditCancelRef.current = onEditCancel;
  selectedEditVertexIndexRef.current = selectedEditVertexIndex;

  const currentStyleUrlRef = useRef(null);
  const [styleVersion, setStyleVersion] = useState(0);

  const [hoveredDrawVertexIndex, setHoveredDrawVertexIndex] = useState(null);
  const [hoveredZoneId, setHoveredZoneId] = useState(null);
  const isDraggingDrawVertex = useRef(false);
  const draggedDrawVertexIndex = useRef(null);
  const didDragDrawVertex = useRef(false);
  const dragStartPixel = useRef({ x: 0, y: 0 });
  const onDrawVertexSelectRef = useRef(onDrawVertexSelect);
  const onDrawVertexMoveRef = useRef(onDrawVertexMove);
  const onDrawVertexDragEndRef = useRef(onDrawVertexDragEnd);
  const onContextMenuRef = useRef(onContextMenu);
  const onMarkerContextMenuRef = useRef(onMarkerContextMenu);
  const onZoneContextMenuRef = useRef(onZoneContextMenu);
  const onMapContextMenuRef = useRef(onMapContextMenu);
  const onDrawVertexDeleteRef = useRef(onDrawVertexDelete);
  const onDrawUndoRef = useRef(onDrawUndo);
  const onDrawRedoRef = useRef(onDrawRedo);
  const selectedDrawVertexIndexRef = useRef(selectedDrawVertexIndex);
  const hoveredDrawVertexIndexRef = useRef(hoveredDrawVertexIndex);
  onDrawVertexSelectRef.current = onDrawVertexSelect;
  onDrawVertexMoveRef.current = onDrawVertexMove;
  onDrawVertexDragEndRef.current = onDrawVertexDragEnd;
  onContextMenuRef.current = onContextMenu;
  onMarkerContextMenuRef.current = onMarkerContextMenu;
  onZoneContextMenuRef.current = onZoneContextMenu;
  onMapContextMenuRef.current = onMapContextMenu;
  onDrawVertexDeleteRef.current = onDrawVertexDelete;
  onDrawUndoRef.current = onDrawUndo;
  onDrawRedoRef.current = onDrawRedo;
  selectedDrawVertexIndexRef.current = selectedDrawVertexIndex;
  hoveredDrawVertexIndexRef.current = hoveredDrawVertexIndex;

  // Expose imperative map actions to the parent for context-menu commands
  useImperativeHandle(ref, () => ({
    getMap: () => map.current,
    centerAt: (lng, lat) => {
      if (!map.current) return;
      map.current.easeTo({ center: [lng, lat], duration: 300 });
    },
    resetView: () => {
      if (!map.current) return;
      map.current.easeTo({ pitch: 0, bearing: 0, duration: 500 });
    },
  }));

  // Attach right-click + long-press handlers to a marker element
  const attachMarkerMenu = (element, incidentData) => {
    const fireMenu = (clientX, clientY) => {
      onMarkerContextMenuRef.current?.(incidentData, { x: clientX, y: clientY });
    };

    const onContextMenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      fireMenu(e.clientX, e.clientY);
    };

    // Long-press for touch devices
    let longPressTimer = null;
    let touchStartPos = null;
    const onTouchStart = (e) => {
      const touch = e.touches?.[0];
      if (!touch) return;
      touchStartPos = { x: touch.clientX, y: touch.clientY };
      longPressTimer = setTimeout(() => {
        longPressTimer = null;
        touchStartPos = null;
        fireMenu(touch.clientX, touch.clientY);
      }, 500);
    };
    const onTouchMove = (e) => {
      if (!longPressTimer || !touchStartPos) return;
      const touch = e.touches?.[0];
      if (!touch) return;
      const dx = touch.clientX - touchStartPos.x;
      const dy = touch.clientY - touchStartPos.y;
      if (Math.sqrt(dx * dx + dy * dy) > 10) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        touchStartPos = null;
      }
    };
    const onTouchEnd = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      touchStartPos = null;
    };

    element.addEventListener('contextmenu', onContextMenu);
    element.addEventListener('touchstart', onTouchStart, { passive: true });
    element.addEventListener('touchmove', onTouchMove, { passive: true });
    element.addEventListener('touchend', onTouchEnd);
    element.addEventListener('touchcancel', onTouchEnd);

    return () => {
      element.removeEventListener('contextmenu', onContextMenu);
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
      element.removeEventListener('touchend', onTouchEnd);
      element.removeEventListener('touchcancel', onTouchEnd);
    };
  };

  // Initialize map once
  useEffect(() => {
    const styleUrl = document.documentElement.getAttribute('data-theme') === 'light'
      ? '/map-style-light.json'
      : '/map-style-dark.json';
    currentStyleUrlRef.current = styleUrl;

    const ensureLayers = (mapInstance) => {
      if (!mapInstance || !mapInstance.getStyle()) return;

      // Zone layers
      if (!mapInstance.getSource('zones')) {
        mapInstance.addSource('zones', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
          promoteId: 'id',
        });
      }
      // Invisible hit layer for zone hover/click detection.
      // Visuals are rendered via the ZoneSvgOverlay component.
      if (!mapInstance.getLayer('zone-hit')) {
        mapInstance.addLayer({
          id: 'zone-hit',
          type: 'fill',
          source: 'zones',
          paint: {
            'fill-color': '#000',
            'fill-opacity': 0,
          },
        });
      }

      // Drawing preview layers
      if (!mapInstance.getSource('draw-preview')) {
        mapInstance.addSource('draw-preview', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }
      if (!mapInstance.getLayer('draw-preview-fill')) {
        mapInstance.addLayer({
          id: 'draw-preview-fill',
          type: 'fill',
          source: 'draw-preview',
          paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.06 },
        });
      }
      if (!mapInstance.getLayer('draw-preview-line')) {
        mapInstance.addLayer({
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
      }
      if (!mapInstance.getLayer('draw-preview-vertices')) {
        mapInstance.addLayer({
          id: 'draw-preview-vertices',
          type: 'circle',
          source: 'draw-preview',
          filter: ['==', ['get', 'isVertex'], true],
          paint: {
            'circle-radius': [
              'case',
              ['boolean', ['get', 'isSelected'], false], 10,
              ['boolean', ['get', 'isHovered'], false], 9,
              ['boolean', ['get', 'isFirst'], false], 9,
              8,
            ],
            'circle-color': [
              'case',
              ['boolean', ['get', 'isSelected'], false], '#f59e0b',
              ['boolean', ['get', 'isHovered'], false], '#fff',
              ['boolean', ['get', 'isFirst'], false], '#3b82f6',
              '#fff',
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#3b82f6',
          },
        });
      }
      if (!mapInstance.getLayer('draw-preview-rubber')) {
        mapInstance.addLayer({
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
      }

      // Zone edit layers
      if (!mapInstance.getSource('edit-zone')) {
        mapInstance.addSource('edit-zone', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }
      if (!mapInstance.getLayer('edit-zone-fill')) {
        mapInstance.addLayer({
          id: 'edit-zone-fill',
          type: 'fill',
          source: 'edit-zone',
          paint: { 'fill-color': '#f59e0b', 'fill-opacity': 0.12 },
        });
      }
      if (!mapInstance.getLayer('edit-zone-outline')) {
        mapInstance.addLayer({
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
      }
      if (!mapInstance.getLayer('edit-zone-hit-line')) {
        mapInstance.addLayer({
          id: 'edit-zone-hit-line',
          type: 'line',
          source: 'edit-zone',
          paint: { 'line-width': 12, 'line-opacity': 0 },
        });
      }

      if (!mapInstance.getSource('edit-vertices')) {
        mapInstance.addSource('edit-vertices', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }
      if (!mapInstance.getLayer('edit-vertices')) {
        mapInstance.addLayer({
          id: 'edit-vertices',
          type: 'circle',
          source: 'edit-vertices',
          paint: {
            'circle-radius': ['case', ['boolean', ['get', 'isSelected'], false], 9, 6],
            'circle-color': ['case', ['boolean', ['get', 'isSelected'], false], '#f59e0b', '#fff'],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#f59e0b',
          },
        });
      }

      if (!mapInstance.getSource('edit-midpoints')) {
        mapInstance.addSource('edit-midpoints', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }
      if (!mapInstance.getLayer('edit-midpoints')) {
        mapInstance.addLayer({
          id: 'edit-midpoints',
          type: 'circle',
          source: 'edit-midpoints',
          paint: { 'circle-radius': 4, 'circle-color': 'rgba(245, 158, 11, 0.6)' },
        });
      }
    };

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: styleUrl,
      center: initialViewport?.center ?? [20, 30],
      zoom: initialViewport?.zoom ?? 2,
      attributionControl: false,
      doubleClickZoom: false,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    // ResizeObserver keeps the WebGL canvas in sync with the container while
    // CSS transitions (e.g. the right detail panel opening) are running. Without
    // this the canvas stays at its old size and the map appears to snap thinner.
    const resizeObserver = new ResizeObserver((entries) => {
      if (!map.current) return;
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      const canvas = map.current.getCanvas();
      if (canvas && (canvas.clientWidth !== width || canvas.clientHeight !== height)) {
        map.current.resize();
      }
    });
    if (mapContainer.current) {
      resizeObserver.observe(mapContainer.current);
    }

    // Expose map instance in dev so verification scripts can read zoom/center.
    if (import.meta.env.DEV) {
      window.__geowatchAdminMap = map.current;
    }

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
      reportViewport();
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

    const reportViewport = () => {
      if (!map.current || !onViewportChangeRef.current) return;
      const bounds = map.current.getBounds();
      const center = map.current.getCenter();
      const zoom = map.current.getZoom();
      onViewportChangeRef.current({
        bounds: `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`,
        center: { lat: center.lat, lng: center.lng },
        zoom,
      });
    };

    // Report initial bounds once the map is loaded
    map.current.on('load', () => {
      if (!map.current) return;
      ensureLayers(map.current);
      setStyleVersion((v) => v + 1);

      reportViewport();
      // Set initial maxZoom based on starting center
      const center = map.current.getCenter();
      map.current.setMaxZoom(getMaxZoomForCenter(center.lng, center.lat));
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
      resizeObserver.disconnect();
      markers.current.forEach((m) => m.remove());
      tempMarker.current?.remove();
      popupRef.current?.remove();
      if (import.meta.env.DEV) {
        delete window.__geowatchAdminMap;
      }
      map.current?.remove();
    };
  }, []);

  // Fly to coordinates
  useEffect(() => {
    if (
      !flyToCoords ||
      !map.current ||
      !Number.isFinite(flyToCoords.lng) ||
      !Number.isFinite(flyToCoords.lat)
    ) {
      return;
    }

    isProgrammaticMove.current = true;
    const currentZoom = map.current.getZoom();
    const maxZoom = getMaxZoomForCenter(flyToCoords.lng, flyToCoords.lat);
    const { type, source, bounds, padding } = flyToCoords;
    const mapInstance = map.current;

    // Comfort-fit constants for polygon selections.
    // COMFORT_FACTOR = 0.55 means the zone occupies ~55% of the visible viewport
    // (45% margin on each side). MIN/MAX clamps prevent tiny zones from zooming
    // to street level and huge zones from zooming to world view.
    const ZONE_COMFORT_FACTOR = 0.55;
    const MIN_ZONE_ZOOM = 4;
    const MAX_ZONE_ZOOM = 14;

    // Compute visible area after layout padding (sidebars / panels).
    const container = mapInstance.getContainer();
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const padLeft = padding?.left || 0;
    const padRight = padding?.right || 0;
    const padTop = padding?.top || 0;
    const padBottom = padding?.bottom || 0;
    const visibleWidth = Math.max(1, containerWidth - padLeft - padRight);
    const visibleHeight = Math.max(1, containerHeight - padTop - padBottom);

    // Helpers for fitting a polygon bounding box into the visible map area.
    const doesFitAtZoom = (bbox, zoom) => {
      const camera = mapInstance.cameraForBounds(bbox, { padding, maxZoom: 22 });
      return camera ? zoom >= camera.zoom : true;
    };

    const computeFittingZoom = (bbox, comfortFactor = 1.0) => {
      // Add extra padding so the zone occupies only `comfortFactor` of the
      // visible rectangle. 1.0 means an exact fit; 0.55 means 45% total margin.
      const extraHoriz = visibleWidth * (1 - comfortFactor) / 2;
      const extraVert = visibleHeight * (1 - comfortFactor) / 2;
      const fittedPadding = {
        top: padTop + extraVert,
        bottom: padBottom + extraVert,
        left: padLeft + extraHoriz,
        right: padRight + extraHoriz,
      };
      // MapLibre warns/returns null when the padded visible area is extremely
      // small relative to a wide bbox. Skip the padded call in that case.
      const minVisible = 300;
      const usePadding = visibleWidth >= minVisible && visibleHeight >= minVisible;
      let camera = usePadding
        ? mapInstance.cameraForBounds(bbox, { padding: fittedPadding, maxZoom: 22 })
        : null;
      // Fallback: fit without padding (or retry if the padded call failed).
      if (!camera) {
        camera = mapInstance.cameraForBounds(bbox, { padding: 0, maxZoom: 22 });
      }
      return camera ? camera.zoom : currentZoom;
    };

    let targetZoom;

    // When auto-zoom is disabled we still pan to the feature so the user can
    // see what was selected, but we preserve their manually-set zoom level.
    // Deep-links are the exception: opening a shared URL is an explicit
    // navigation intent and should always comfort-fit the target.
    const panOnly = !autoZoomEnabled && source !== 'deep-link';

    if (panOnly) {
      targetZoom = currentZoom;
    } else if (type === 'incident') {
      if (source === 'map') {
        // Map click: small nudge to keep the transition feeling alive.
        targetZoom = currentZoom + 0.05;
      } else {
        // Non-map selection (search, drawer, notification, deep-link, etc.):
        // fly to a fixed, readable zoom level.
        targetZoom = 7;
      }
    } else if (type === 'zone' && bounds) {
      if (source === 'map' && doesFitAtZoom(bounds, currentZoom + 0.02)) {
        // Map click: if the zone already fits, nudge slightly and pan to the
        // centroid so repeated clicks don't feel like nothing happened.
        targetZoom = currentZoom + 0.02;
      } else {
        // Comfort-fit the zone bounding box with a 30% margin, then clamp to
        // sane limits so small zones keep context and large zones stay usable.
        const fittingZoom = computeFittingZoom(bounds, ZONE_COMFORT_FACTOR);
        targetZoom = Math.max(MIN_ZONE_ZOOM, Math.min(MAX_ZONE_ZOOM, fittingZoom));
      }
    } else {
      // Location search or legacy requests: preserve current zoom and just pan.
      targetZoom = Number.isFinite(flyToCoords.zoom) ? flyToCoords.zoom : currentZoom;
    }

    targetZoom = Math.min(targetZoom, maxZoom);

    // Force a resize so flyTo uses the current container size after layout
    // changes (e.g. right panel opening) instead of the previous size.
    mapInstance.resize();
    // Defer flyTo one frame so the resize has been applied; this makes the
    // very first selection (which also opens the right panel) smooth.
    requestAnimationFrame(() => {
      if (!map.current) return;
      map.current.flyTo({
        center: [flyToCoords.lng, flyToCoords.lat],
        zoom: targetZoom,
        padding,
        duration: 800,
      });
    });
  }, [flyToCoords]);

  // Switch map style when theme changes
  useEffect(() => {
    if (!map.current) return;
    const newStyle = theme === 'light' ? '/map-style-light.json' : '/map-style-dark.json';
    if (newStyle === currentStyleUrlRef.current) return;
    currentStyleUrlRef.current = newStyle;
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

      // Skip polygon incidents or rows with invalid coordinates
      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        if (existing) {
          existing.remove();
          markers.current.delete(incident.id);
        }
        return;
      }

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
        onEventClickRef.current?.(incident);
      });

      // Right-click / long-press context menu
      attachMarkerMenu(el, incident);

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

      // Polygon incidents and rows with invalid coordinates cannot be shown as markers
      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        return;
      }

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
        onEventClickRef.current?.(ghostIncident);
      });

      attachMarkerMenu(el, ghostIncident);

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

    const features = showZones
      ? zones
          .filter((zone) => zone.id !== editingZoneId)
          .map((zone) => {
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
                strokeWidth: 1.5,
                opacity: 0.06,
              },
            };
          })
      : [];

    source.setData({ type: 'FeatureCollection', features });
  }, [zones, editingZoneId, showZones, styleVersion]);

  // ─── Zone hover / click interaction ───
  useEffect(() => {
    if (!map.current) return;
    const mapInstance = map.current;
    const zoneLayers = ['zone-hit'];
    let currentHoverId = null;

    const layersReady = () => mapInstance.getLayer('zone-hit');

    const onMouseMove = (e) => {
      // Skip zone hover when in polygon drawing mode or editing mode
      if (mapModeRef.current === 'polygon' || editingZoneIdRef.current) {
        if (currentHoverId !== null) {
          setHoveredZoneId(null);
          currentHoverId = null;
        }
        return;
      }

      if (!layersReady()) return;

      let features = [];
      try {
        features = mapInstance.queryRenderedFeatures(e.point, { layers: zoneLayers });
      } catch {
        return;
      }

      const topFeature = smallestZoneFeature(features);
      if (topFeature) {
        const featureId = String(topFeature.id);
        if (currentHoverId !== featureId) {
          currentHoverId = featureId;
          setHoveredZoneId(featureId);
          mapInstance.getCanvas().style.cursor = 'pointer';
        }
      } else {
        if (currentHoverId !== null) {
          currentHoverId = null;
          setHoveredZoneId(null);
        }
        mapInstance.getCanvas().style.cursor = '';
      }
    };

    const onClick = (e) => {
      // Skip zone clicks when in polygon drawing mode or editing mode
      if (mapModeRef.current === 'polygon' || editingZoneIdRef.current) return;
      // Ignore clicks that originated on a point marker so incidents inside zones open first
      if (e.originalEvent?.target?.closest('.maplibregl-marker')) return;
      if (!layersReady()) return;
      let features = [];
      try {
        features = mapInstance.queryRenderedFeatures(e.point, { layers: zoneLayers });
      } catch {
        return;
      }
      const topFeature = smallestZoneFeature(features);
      if (topFeature) {
        const zoneId = String(topFeature.id || topFeature.properties?.id);
        if (zoneId && zoneId !== 'undefined') {
          onZoneClickRef.current?.(zoneId);
        }
      }
    };

    mapInstance.on('mousemove', onMouseMove);
    mapInstance.on('click', onClick);

    return () => {
      mapInstance.off('mousemove', onMouseMove);
      mapInstance.off('click', onClick);
    };
  }, [onZoneClick]);

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
          properties: { index: idx, isSelected: idx === selectedEditVertexIndex },
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
  }, [editingZoneId, editingZoneVertices, selectedEditVertexIndex, styleVersion]);

  // ─── Drawing preview data update ───
  useEffect(() => {
    if (!map.current) return;
    const source = map.current.getSource('draw-preview');
    if (!source) return;

    const features = [];
    const hoveredIdx = hoveredDrawVertexIndex;
    const selectedIdx = selectedDrawVertexIndex;

    if (mapMode === 'polygon' && drawVertices.length > 0) {
      // Vertex dots
      drawVertices.forEach((coord, idx) => {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: coord },
          properties: {
            isVertex: true,
            index: idx,
            isHovered: idx === hoveredIdx,
            isSelected: idx === selectedIdx,
            isFirst: idx === 0,
          },
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
  }, [mapMode, drawVertices, isPolygonClosed, hoveredDrawVertexIndex, selectedDrawVertexIndex, styleVersion]);

  // ─── Drawing click handler ───
  useEffect(() => {
    if (!map.current) return;
    const mapInstance = map.current;

    const onClick = (e) => {
      if (mapModeRef.current !== 'polygon') return;

      // Suppress click if we just dragged a vertex
      if (didDragDrawVertex.current) {
        didDragDrawVertex.current = false;
        return;
      }

      // Check if user clicked on any vertex (12px tolerance)
      const nearestIdx = findNearestDrawVertex(e.point, drawVerticesRef.current, mapInstance, 12);
      if (nearestIdx !== -1) {
        if (nearestIdx === 0 && drawVerticesRef.current.length >= 3 && !isPolygonClosedRef.current) {
          // Clicked first vertex with enough vertices → close polygon
          onDrawClose?.();
          return;
        }
        if (nearestIdx !== 0) {
          // Clicked non-first vertex → select it
          onDrawVertexSelect?.(nearestIdx);
          return;
        }
        // Clicked first vertex but already closed or < 3 vertices → do nothing
        return;
      }

      // Clicked empty map → add new vertex (only if not already closed)
      if (!isPolygonClosedRef.current) {
        const { lng, lat } = e.lngLat;
        onDrawVertexAdd?.({ lat, lng });
      }
    };

    mapInstance.on('click', onClick);
    return () => {
      mapInstance.off('click', onClick);
    };
  }, [onDrawVertexAdd, onDrawClose, onDrawVertexSelect]);

  // ─── Rubber band mousemove ───
  useEffect(() => {
    if (!map.current) return;
    const mapInstance = map.current;

    const onMouseMove = (e) => {
      if (mapModeRef.current !== 'polygon') return;
      if (isPolygonClosedRef.current) return;
      if (drawVerticesRef.current.length === 0) return;
      if (isDraggingDrawVertex.current) return;

      rubberBandCoords.current = [e.lngLat.lng, e.lngLat.lat];
      // Trigger re-render of draw-preview source
      const source = mapInstance.getSource('draw-preview');
      if (!source) return;

      const features = [];
      const hoveredIdx = hoveredDrawVertexIndexRef.current;
      const selectedIdx = selectedDrawVertexIndexRef.current;

      // Rebuild all features with updated rubber band
      drawVerticesRef.current.forEach((coord, idx) => {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: coord },
          properties: {
            isVertex: true,
            index: idx,
            isHovered: idx === hoveredIdx,
            isSelected: idx === selectedIdx,
            isFirst: idx === 0,
          },
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

  // ─── Keyboard shortcuts for drawing and edit modes ───
  useEffect(() => {
    const onKeyDown = (e) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') return;

      if (mapModeRef.current === 'polygon') {
        if (e.key === 'Escape') {
          onDrawCancelRef.current?.();
          return;
        }

        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedDrawVertexIndexRef.current !== null) {
          onDrawVertexDeleteRef.current?.(selectedDrawVertexIndexRef.current);
          return;
        }

        // Ctrl+Z / Cmd+Z → undo
        if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
          e.preventDefault();
          onDrawUndoRef.current?.();
          return;
        }

        // Ctrl+Y / Ctrl+Shift+Z / Cmd+Shift+Z → redo
        if ((e.key === 'y' || e.key === 'Y') && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
          e.preventDefault();
          onDrawRedoRef.current?.();
          return;
        }
        if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && e.shiftKey) {
          e.preventDefault();
          onDrawRedoRef.current?.();
          return;
        }
      }

      if (editingZoneIdRef.current) {
        if (e.key === 'Escape') {
          onEditCancelRef.current?.();
          return;
        }

        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEditVertexIndexRef.current !== null) {
          onEditVertexDeleteRef.current?.(selectedEditVertexIndexRef.current);
          return;
        }

        if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
          e.preventDefault();
          onEditUndoRef.current?.();
          return;
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // ─── Cursor change for drawing mode ───
  useEffect(() => {
    if (!map.current) return;
    map.current.getCanvas().style.cursor = mapMode === 'polygon' ? 'crosshair' : '';
  }, [mapMode]);

  // ─── Clear rubber band when polygon is closed (prevents stale line after undo) ───
  useEffect(() => {
    if (isPolygonClosed) {
      rubberBandCoords.current = null;
    }
  }, [isPolygonClosed]);

  // ─── Clear drawing preview when leaving polygon mode ───
  useEffect(() => {
    if (!map.current) return;
    const source = map.current.getSource('draw-preview');
    if (!source) return;
    if (mapMode !== 'polygon') {
      rubberBandCoords.current = null;
      source.setData({ type: 'FeatureCollection', features: [] });
    }
  }, [mapMode, styleVersion]);

  // ─── Right-click context menu for drawing mode ───
  useEffect(() => {
    if (!map.current) return;
    const mapInstance = map.current;

    const onContextMenuEvent = (e) => {
      // Drawing mode — custom context menu only available after polygon is closed
      if (mapModeRef.current === 'polygon') {
        if (!isPolygonClosedRef.current) {
          return; // Let browser default show while drawing
        }
        e.preventDefault();
        const nearestIdx = findNearestDrawVertex(e.point, drawVerticesRef.current, mapInstance, 12);
        if (nearestIdx !== -1) {
          onContextMenuRef.current?.({ x: e.point.x, y: e.point.y, lng: e.lngLat.lng, lat: e.lngLat.lat, type: 'vertex', index: nearestIdx });
          return;
        }
        // Closed polygon: insert on nearest edge
        if (drawVerticesRef.current.length >= 3) {
          const nearestEdgeIdx = findNearestEditEdge(e.point, drawVerticesRef.current, mapInstance, 12);
          if (nearestEdgeIdx !== -1) {
            onContextMenuRef.current?.({ x: e.point.x, y: e.point.y, lng: e.lngLat.lng, lat: e.lngLat.lat, type: 'empty', insertIndex: nearestEdgeIdx });
            return;
          }
        }
        onContextMenuRef.current?.({ x: e.point.x, y: e.point.y, lng: e.lngLat.lng, lat: e.lngLat.lat, type: 'empty' });
        return;
      }

      // Edit mode
      if (editingZoneIdRef.current) {
        e.preventDefault();
        const nearestEdgeIdx = findNearestEditEdge(e.point, editingZoneVerticesRef.current, mapInstance, 10);
        if (nearestEdgeIdx !== -1) {
          onContextMenuRef.current?.({ x: e.point.x, y: e.point.y, lng: e.lngLat.lng, lat: e.lngLat.lat, type: 'edge', index: nearestEdgeIdx });
          return;
        }
      }

      // Normal mode — zones or empty map
      e.preventDefault();
      const clientX = e.originalEvent?.clientX ?? e.point?.x;
      const clientY = e.originalEvent?.clientY ?? e.point?.y;
      const point = e.point;
      const box = [
        [point.x - 5, point.y - 5],
        [point.x + 5, point.y + 5],
      ];
      let zoneFeatures = [];
      try {
        zoneFeatures = mapInstance.queryRenderedFeatures(box, { layers: ['zone-hit'] });
      } catch {
        zoneFeatures = [];
      }
      const topZoneFeature = smallestZoneFeature(zoneFeatures);
      if (topZoneFeature) {
        onZoneContextMenuRef.current?.(topZoneFeature, { x: clientX, y: clientY }, { lng: e.lngLat.lng, lat: e.lngLat.lat });
      } else {
        onMapContextMenuRef.current?.({ x: clientX, y: clientY }, { lng: e.lngLat.lng, lat: e.lngLat.lat });
      }
    };

    mapInstance.on('contextmenu', onContextMenuEvent);
    return () => {
      mapInstance.off('contextmenu', onContextMenuEvent);
    };
  }, []);

  // ─── Vertex drag, midpoint click, and vertex double-click interactions ───
  useEffect(() => {
    if (!map.current) return;
    const mapInstance = map.current;

    const onMouseDown = (e) => {
      // Edit mode takes priority
      if (editingZoneIdRef.current) {
        const features = mapInstance.queryRenderedFeatures(e.point, { layers: ['edit-vertices'] });
        if (features.length > 0) {
          const idx = features[0].properties.index;
          isDraggingVertex.current = true;
          draggedVertexIndex.current = idx;
          didDragVertex.current = false;
          dragStartPixelVertex.current = { x: e.point.x, y: e.point.y };
          mapInstance.dragPan.disable();
          mapInstance.getCanvas().style.cursor = 'grabbing';
        }
        return;
      }

      // Drawing mode vertex drag
      if (mapModeRef.current === 'polygon') {
        const nearestIdx = findNearestDrawVertex(e.point, drawVerticesRef.current, mapInstance, 12);
        if (nearestIdx !== -1) {
          isDraggingDrawVertex.current = true;
          draggedDrawVertexIndex.current = nearestIdx;
          didDragDrawVertex.current = false;
          dragStartPixel.current = { x: e.point.x, y: e.point.y };
          rubberBandCoords.current = null; // Hide rubber band during drag
          mapInstance.dragPan.disable();
          mapInstance.getCanvas().style.cursor = 'grabbing';
        }
      }
    };

    const onMouseMove = (e) => {
      // Edit mode drag
      if (isDraggingVertex.current) {
        const dx = e.point.x - dragStartPixelVertex.current.x;
        const dy = e.point.y - dragStartPixelVertex.current.y;
        if (!didDragVertex.current && Math.sqrt(dx * dx + dy * dy) > 3) {
          didDragVertex.current = true;
        }
        const idx = draggedVertexIndex.current;
        if (idx !== null) {
          onVertexDragRef.current?.(idx, { lng: e.lngLat.lng, lat: e.lngLat.lat });
        }
        return;
      }

      // Drawing mode drag
      if (isDraggingDrawVertex.current) {
        const dx = e.point.x - dragStartPixel.current.x;
        const dy = e.point.y - dragStartPixel.current.y;
        if (!didDragDrawVertex.current && Math.sqrt(dx * dx + dy * dy) > 3) {
          didDragDrawVertex.current = true;
        }
        if (didDragDrawVertex.current) {
          const idx = draggedDrawVertexIndex.current;
          if (idx !== null) {
            onDrawVertexMoveRef.current?.(idx, { lng: e.lngLat.lng, lat: e.lngLat.lat });
          }
        }
      }
    };

    const onMouseUp = () => {
      if (isDraggingVertex.current) {
        const idx = draggedVertexIndex.current;
        const wasDrag = didDragVertex.current;
        isDraggingVertex.current = false;
        draggedVertexIndex.current = null;
        didDragVertex.current = false;
        mapInstance.dragPan.enable();
        mapInstance.getCanvas().style.cursor = '';
        if (wasDrag && idx !== null) {
          onVertexDragEndRef.current?.(idx);
        }
      }

      if (isDraggingDrawVertex.current) {
        const idx = draggedDrawVertexIndex.current;
        const wasDrag = didDragDrawVertex.current;
        isDraggingDrawVertex.current = false;
        draggedDrawVertexIndex.current = null;
        mapInstance.dragPan.enable();
        mapInstance.getCanvas().style.cursor = '';
        if (wasDrag && idx !== null) {
          onDrawVertexDragEndRef.current?.(idx);
        }
      }
    };

    const onClick = (e) => {
      if (!editingZoneIdRef.current) return;
      if (isDraggingVertex.current) return;
      if (didDragVertex.current) { didDragVertex.current = false; return; }

      const midpointFeatures = mapInstance.queryRenderedFeatures(e.point, { layers: ['edit-midpoints'] });
      if (midpointFeatures.length > 0) {
        const edgeIndex = midpointFeatures[0].properties.edgeIndex;
        onMidpointClickRef.current?.(edgeIndex);
        return;
      }

      const vertexFeatures = mapInstance.queryRenderedFeatures(e.point, { layers: ['edit-vertices'] });
      if (vertexFeatures.length > 0) {
        const idx = vertexFeatures[0].properties.index;
        onEditVertexSelectRef.current?.(idx);
        return;
      }

      // Clicked empty map while editing → deselect
      onEditVertexSelectRef.current?.(null);
    };

    const onMouseMoveCursor = (e) => {
      // Edit mode cursor
      if (editingZoneIdRef.current) {
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
        return;
      }

      // Drawing mode cursor
      if (mapModeRef.current === 'polygon') {
        if (isDraggingDrawVertex.current) {
          mapInstance.getCanvas().style.cursor = 'grabbing';
          return;
        }

        const nearestIdx = findNearestDrawVertex(e.point, drawVerticesRef.current, mapInstance, 12);
        if (nearestIdx !== -1) {
          setHoveredDrawVertexIndex(prev => prev !== nearestIdx ? nearestIdx : prev);
          mapInstance.getCanvas().style.cursor = 'grab';
          return;
        } else {
          setHoveredDrawVertexIndex(prev => prev !== null ? null : prev);
        }

        mapInstance.getCanvas().style.cursor = 'crosshair';
        return;
      }

      // In normal pan mode let the dedicated zone hover handler manage the cursor.
      return;
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
      <ZoneSvgOverlay
        mapInstance={map.current}
        zones={zones}
        selectedZoneId={selectedZoneId}
        hoveredZoneId={hoveredZoneId}
        ghostZone={ghostZone}
        showZones={showZones}
      />

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
});

export default AdminMap;

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
