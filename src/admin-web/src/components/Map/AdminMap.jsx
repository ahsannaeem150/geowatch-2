import React, { useRef, useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const MARTIN_URL = import.meta.env.VITE_MARTIN_URL || 'http://localhost:8080';

const MAP_STYLE = {
  version: 8,
  sources: {
    openmaptiles: {
      type: 'vector',
      url: `${MARTIN_URL}/tiles`,
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#0f1117' },
    },
    {
      id: 'water',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'water',
      paint: { 'fill-color': '#14161f', 'fill-outline-color': '#1a1d29' },
    },
    {
      id: 'boundary-land-level-2',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'boundary',
      filter: ['==', 'admin_level', 2],
      paint: { 'line-color': '#3a3e4b', 'line-width': 1.5 },
    },
    {
      id: 'transportation-motorway',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['all', ['==', '$type', 'LineString'], ['==', 'class', 'motorway']],
      paint: { 'line-color': '#2a2e3b', 'line-width': 1 },
    },
  ],
};

export default function AdminMap({ onMapClick, flyToCoords, markerCoords }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);

  useEffect(() => {
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: [20, 30],
      zoom: 2,
      attributionControl: false,
    });

    map.current.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.current.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      onMapClick?.({ lat, lng });
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (flyToCoords && map.current) {
      map.current.flyTo({
        center: [flyToCoords.lng, flyToCoords.lat],
        zoom: 10,
        duration: 800,
      });
    }
  }, [flyToCoords]);

  useEffect(() => {
    if (!map.current) return;

    if (marker.current) {
      marker.current.remove();
      marker.current = null;
    }

    if (markerCoords) {
      const el = document.createElement('div');
      el.style.width = '16px';
      el.style.height = '16px';
      el.style.borderRadius = '50%';
      el.style.background = 'var(--accent-cyan)';
      el.style.border = '2px solid #fff';
      el.style.boxShadow = '0 0 8px rgba(0, 212, 255, 0.6)';
      el.style.cursor = 'pointer';

      marker.current = new maplibregl.Marker({ element: el })
        .setLngLat([markerCoords.lng, markerCoords.lat])
        .addTo(map.current);
    }
  }, [markerCoords]);

  return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />;
}
