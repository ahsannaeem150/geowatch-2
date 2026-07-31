import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { SEVERITY_SCALE, VERIFICATION_CONFIG } from '@shared/constants.js';
import { getBadgeColors, getSeverityBadgeColors } from '@shared/utils/themeColors.js';
import { buildMarkerElement, updateMarkerSelection } from '@shared/marker-builder.js';
import { useTheme } from '@shared/useTheme.js';
import ZoneSvgOverlay from '@shared/components/ZoneSvgOverlay.jsx';
import { smallestZoneFeature } from '@shared/utils/zoneGeometry.js';
import { getSelectionCamera, selectionSignature, zoneComfortFactor } from '@shared/utils/selectionCamera.js';
import { format } from 'date-fns';

// Tile coverage: z0-14 tiles exist inside HOT_BBOX, only z0-10 outside it.
// We allow unrestricted zoom (up to MapLibre's default) inside the hot zone
// and keep the outside world capped at z10.
const TILE_BBOX = [25.3125, 4.7626, 105.1831, 42.5531];
const HOT_BBOX = [26.3125, 5.7626, 104.1831, 41.5531]; // 1° inset

function getMaxZoomForCenter(lng, lat) {
  const [minLng, minLat, maxLng, maxLat] = HOT_BBOX;
  const inside = lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
  return inside ? 22 : 10;
}

function paddingEquals(a, b) {
  if (!a || !b) return false;
  return a.top === b.top && a.right === b.right && a.bottom === b.bottom && a.left === b.left;
}

// Zone fitting guards: below this padded visible size the comfort-padded
// cameraForBounds call is skipped in favor of the layout-padded exact fit.
const MIN_FIT_VISIBLE_PX = 160;
// Zoom-out bias applied when only the exact layout-padded fit is available, so
// the zone isn't flush against the chrome.
const ZONE_FALLBACK_ZOOM_MARGIN = 0.5;

const UserMap = forwardRef(function UserMap({
  incidents,
  zones = [],
  selectedEventId,
  selectedZoneId,
  onEventClick,
  onZoneClick,
  onViewportChange,
  flyToCoords,
  initialViewport,
  ghostIncident,
  ghostZone,
  showZones = true,
  onMarkerContextMenu,
  onZoneContextMenu,
  onMapContextMenu,
  autoZoomEnabled = true,
  getMapPadding,
}, ref) {
  const { theme } = useTheme();
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef(new Map());
  const ghostMarkerRef = useRef(null);
  const popupRef = useRef(null);
  const popupTimeoutRef = useRef(null);
  const isProgrammaticMove = useRef(false);
  const markerClickedRef = useRef(false);
  const lastSelectionFlightRef = useRef(null);
  const fitRetryRef = useRef(false);
  const [fitRetryTick, setFitRetryTick] = useState(0);
  const onZoneClickRef = useRef(onZoneClick);
  onZoneClickRef.current = onZoneClick;
  const isClamping = useRef(false);
  const onViewportChangeRef = useRef(onViewportChange);
  onViewportChangeRef.current = onViewportChange;
  const onMarkerContextMenuRef = useRef(onMarkerContextMenu);
  const onZoneContextMenuRef = useRef(onZoneContextMenu);
  const onMapContextMenuRef = useRef(onMapContextMenu);
  onMarkerContextMenuRef.current = onMarkerContextMenu;
  onZoneContextMenuRef.current = onZoneContextMenu;
  onMapContextMenuRef.current = onMapContextMenu;

  const currentStyleUrlRef = useRef(null);

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

  const zonesRef = useRef(zones);
  zonesRef.current = zones;
  const showZonesRef = useRef(showZones);
  showZonesRef.current = showZones;
  const [styleVersion, setStyleVersion] = useState(0);
  const [hoveredZoneId, setHoveredZoneId] = useState(null);

  // Initialize map once
  useEffect(() => {
    if (map.current) return;

    const styleUrl = document.documentElement.getAttribute('data-theme') === 'light'
      ? '/map-style-light.json'
      : '/map-style-dark.json';
    currentStyleUrlRef.current = styleUrl;

    const ensureLayers = (mapInstance) => {
      if (!mapInstance || !mapInstance.getStyle()) return;

      // Zone source — visuals are rendered via ZoneSvgOverlay; this source
      // only provides an invisible hit layer for hover/click detection.
      if (!mapInstance.getSource('zones')) {
        mapInstance.addSource('zones', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
          promoteId: 'id',
        });
      }

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
    };

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: styleUrl,
      center: initialViewport?.center ?? [69.3451, 30.3753],
      zoom: initialViewport?.zoom ?? 4.5,
      attributionControl: false,
    });

    map.current.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.current.addControl(new maplibregl.NavigationControl(), 'bottom-right');

    // Expose map instance in dev so verification scripts can read zoom/center.
    if (import.meta.env.DEV) {
      window.__geowatchUserMap = map.current;
    }

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

    return () => {
      markers.current.forEach((m) => m.remove());
      ghostMarkerRef.current?.remove();
      if (import.meta.env.DEV) {
        delete window.__geowatchUserMap;
      }
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Fly to coordinates — smart selection camera (shared policy decides zoom/duration)
  useEffect(() => {
    if (
      !flyToCoords ||
      !map.current ||
      !Number.isFinite(flyToCoords.lng) ||
      !Number.isFinite(flyToCoords.lat)
    ) {
      return;
    }

    const { type, source, bounds } = flyToCoords;
    const mapInstance = map.current;

    // Padding is measured LIVE at flight time (after the scheduleFlyTo delay
    // and any panel/drawer transitions) so the fit always matches the chrome
    // actually on screen. flyToCoords.padding is only a legacy fallback.
    const padding = getMapPadding
      ? getMapPadding()
      : (flyToCoords.padding || { top: 0, right: 0, bottom: 0, left: 0 });

    const currentZoom = mapInstance.getZoom();
    const currentCenter = mapInstance.getCenter();
    const maxZoom = getMaxZoomForCenter(flyToCoords.lng, flyToCoords.lat);

    // Repeat-click guard: skip only when an identical (type, source, lng, lat)
    // selection would repeat the last flight AND neither the camera nor the
    // layout chrome has meaningfully changed since. Re-clicking after the user
    // pans/zooms or toggles the drawer/panel re-flies and re-fits.
    const signature = selectionSignature({ type, source, lng: flyToCoords.lng, lat: flyToCoords.lat });
    const lastFlight = lastSelectionFlightRef.current;
    if (lastFlight && lastFlight.signature === signature) {
      const mapBounds = mapInstance.getBounds();
      const viewportSpan = Math.hypot(
        mapBounds.getEast() - mapBounds.getWest(),
        mapBounds.getNorth() - mapBounds.getSouth()
      );
      const centerDrift = Math.hypot(
        currentCenter.lng - lastFlight.center.lng,
        currentCenter.lat - lastFlight.center.lat
      );
      const sameCamera =
        Math.abs(currentZoom - lastFlight.zoom) <= 0.3 && centerDrift <= viewportSpan * 0.05;
      if (sameCamera && paddingEquals(padding, lastFlight.padding)) return;
    }

    // MapLibre persists the previous flyTo's padding on the transform, and
    // cameraForBounds ADDS it to the padding we pass (see
    // _cameraForBoxAndBearing: `edgePadding = tr.padding`) — a second fit
    // would double-count the chrome. Neutralize it ONLY around the zone
    // measurement below (reset → measure → restore synchronously, so no paint
    // can show the intermediate state); incident flights never touch padding.

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

    // Exact fit against the real layout padding (never unpadded).
    const layoutPaddedCamera = (bbox) => mapInstance.cameraForBounds(bbox, { padding, maxZoom: 22 });

    // Helpers for fitting a polygon bounding box into the visible map area.
    const doesFitAtZoom = (bbox, zoom) => {
      const camera = layoutPaddedCamera(bbox);
      // Unknown (null camera) → assume it does NOT fit so the flight isn't skipped.
      return camera ? zoom >= camera.zoom : false;
    };

    // Returns { zoom } or { deferred: true } when MapLibre can't produce a
    // camera this frame (flaky null) — the caller retries once on the next rAF.
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
      const usePadding = visibleWidth >= MIN_FIT_VISIBLE_PX && visibleHeight >= MIN_FIT_VISIBLE_PX;
      let camera = usePadding
        ? mapInstance.cameraForBounds(bbox, { padding: fittedPadding, maxZoom: 22 })
        : null;
      if (camera) return { zoom: camera.zoom, deferred: false };
      // Fallback: exact fit against the layout padding (never padding: 0),
      // biased slightly out so the zone isn't flush with the chrome.
      camera = layoutPaddedCamera(bbox);
      if (camera) return { zoom: camera.zoom - ZONE_FALLBACK_ZOOM_MARGIN, deferred: false };
      return { zoom: null, deferred: true };
    };

    // Precompute the map-dependent inputs the shared policy needs.
    const isZone = type === 'zone' && bounds;
    let fitZoom;
    let fitsAtCurrentZoom = false;
    if (isZone) {
      // Reset persistent padding only for the measurement, synchronously —
      // no paint can show the intermediate state (no camera snap).
      const previousPadding = mapInstance.getPadding();
      mapInstance.setPadding({ top: 0, right: 0, bottom: 0, left: 0 });
      try {
        const fit = computeFittingZoom(bounds, zoneComfortFactor(bounds));
        if (fit.deferred) {
          if (!fitRetryRef.current) {
            // MapLibre returned no camera this frame — retry once on the next
            // frame (re-runs this effect via fitRetryTick).
            fitRetryRef.current = true;
            requestAnimationFrame(() => setFitRetryTick((t) => t + 1));
          } else {
            fitRetryRef.current = false;
          }
          return;
        }
        fitRetryRef.current = false;
        fitZoom = fit.zoom;
        fitsAtCurrentZoom = doesFitAtZoom(bounds, currentZoom);
      } finally {
        mapInstance.setPadding(previousPadding);
      }
    }
    let isVisibleInViewport = false;
    if (type === 'incident' && source === 'power-search') {
      const pt = mapInstance.project([flyToCoords.lng, flyToCoords.lat]);
      isVisibleInViewport =
        pt.x >= padLeft && pt.x <= containerWidth - padRight &&
        pt.y >= padTop && pt.y <= containerHeight - padBottom;
    }

    let decision;
    if (type === 'incident' || isZone) {
      decision = getSelectionCamera({
        type,
        source,
        bounds,
        currentZoom,
        isVisibleInViewport,
        fitsAtCurrentZoom,
        autoZoomEnabled,
        fitZoom,
      });
    } else {
      // Location search or legacy requests: preserve current zoom and just pan.
      decision = {
        zoom: Number.isFinite(flyToCoords.zoom) ? flyToCoords.zoom : currentZoom,
        duration: 800,
        panOnly: true,
        skip: false,
      };
    }

    const targetZoom = Math.min(decision.zoom, maxZoom);
    // Pan-only and equal-zoom results go through easeTo: flyTo's van Wijk arc
    // zooms out mid-flight on long pans, which reads as stutter/chaos when no
    // zoom change is intended.
    const zoomUnchanged = decision.panOnly || Math.abs(targetZoom - currentZoom) < 0.001;

    // Force a resize so the camera move uses the current container size after
    // layout changes (e.g. right panel opening) instead of the previous size.
    mapInstance.resize();
    // Defer one frame so the resize has been applied; this makes the
    // very first selection (which also opens the right panel) smooth.
    requestAnimationFrame(() => {
      if (!map.current) return;
      isProgrammaticMove.current = true;
      lastSelectionFlightRef.current = {
        signature,
        zoom: targetZoom,
        center: { lng: flyToCoords.lng, lat: flyToCoords.lat },
        padding,
      };
      const camera = {
        center: [flyToCoords.lng, flyToCoords.lat],
        zoom: targetZoom,
        padding,
        duration: decision.duration,
      };
      if (zoomUnchanged) {
        map.current.easeTo(camera);
      } else {
        map.current.flyTo(camera);
      }
    });
  }, [flyToCoords, fitRetryTick]);

  // Update zone source data when zones prop changes
  // Only the invisible hit layer reads from this source; visuals are handled
  // by ZoneSvgOverlay.
  useEffect(() => {
    if (!map.current) return;
    const source = map.current.getSource('zones');
    if (!source) return;

    const features = showZones
      ? zones.map((zone) => ({
          type: 'Feature',
          id: String(zone.id),
          geometry: zone.geometry,
          properties: {
            id: zone.id,
            name: zone.title || zone.name,
          },
        }))
      : [];

    source.setData({ type: 'FeatureCollection', features });
  }, [zones, showZones, styleVersion]);

  // Zone hover and click interactions
  // The invisible `zone-hit` layer is queried; visuals are rendered by ZoneSvgOverlay.
  useEffect(() => {
    if (!map.current) return;
    const mapInstance = map.current;
    const zoneLayers = ['zone-hit'];
    let currentHoverId = null;

    const layersReady = () => mapInstance.getLayer('zone-hit');

    const onMouseMove = (e) => {
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

  // Right-click / long-press context menu for zones and empty map
  useEffect(() => {
    if (!map.current) return;
    const mapInstance = map.current;

    const onContextMenuEvent = (e) => {
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
          .setHTML(buildPopupHTML(data, theme))
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

      // Click: flag so the map-level zone click handler can ignore this event
      el.addEventListener('click', () => {
        markerClickedRef.current = true;
        hidePopup();
        onEventClick?.(incident);
      });

      // Right-click / long-press context menu
      attachMarkerMenu(el, incident);

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
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
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
        markerClickedRef.current = true;
        onEventClick?.(ghostIncident);
      });

      attachMarkerMenu(el, ghostIncident);

      ghostMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lng, lat])
        .addTo(map.current);
    }
  }, [ghostIncident, onEventClick]);

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
});

export default UserMap;

function buildPopupHTML(incident, theme) {
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

  const domainBadge = getBadgeColors(incident.domain_color || '#6b7280', theme);
  const sevBadge = getSeverityBadgeColors(sevCfg.color, theme);
  const verBadge = vCfg ? getBadgeColors(vCfg.color, theme) : null;

  const badgeStyle = (badge) =>
    `font-size: 10px; font-weight: 700; color: ${badge.color}; background: ${badge.background}; ${badge.border ? `border: ${badge.border};` : ''} padding: 2px 8px; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px;`;

  return `
    <div style="padding: 12px;">
      <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px; flex-wrap: wrap;">
        <span style="${badgeStyle(domainBadge)}">
          ${incident.domain_name || 'Unknown'}
        </span>
        <span style="${badgeStyle(sevBadge)}">
          ${sevCfg.label}
        </span>
        ${verBadge ? `<span style="${badgeStyle(verBadge)}">${vCfg.icon} ${vCfg.label}</span>` : ''}
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
