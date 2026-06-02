import React, { useRef, useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { api } from '../../services/api.js';

function getMapStyleUrl() {
  return document.documentElement.getAttribute('data-theme') === 'light'
    ? '/map-style-light.json'
    : '/map-style-dark.json';
}

export default function HeroMap() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef([]);
  const [incidents, setIncidents] = useState([]);
  const [theme, setTheme] = useState(document.documentElement.getAttribute('data-theme') || 'dark');

  // Fetch active incidents
  useEffect(() => {
    api
      .getIncidents({ status: 'active' })
      .then((res) => {
        const data = res.data || {};
        setIncidents(data.incidents || []);
      })
      .catch((err) => {
        console.error('HeroMap: failed to fetch incidents', err);
      });
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || incidents.length === 0) return;
    if (map.current) return;

    const mapInstance = new maplibregl.Map({
      container: mapContainer.current,
      style: getMapStyleUrl(),
      center: [55, 25],
      zoom: 2.8,
      bearing: 0,
      pitch: 0,
      attributionControl: false,
      interactive: false,
      renderWorldCopies: false,
    });

    map.current = mapInstance;

    mapInstance.on('load', () => {
      // Add incident markers
      incidents.forEach((incident) => {
        const el = document.createElement('div');
        const size = 6 + incident.severity * 2;
        const color = incident.domain_color || '#ef4444';

        el.style.cssText = `
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background: ${color};
          box-shadow: 0 0 ${size * 2}px ${color}80, 0 0 ${size}px ${color}40;
          cursor: pointer;
          transition: transform 0.3s ease;
        `;

        // Add pulse ring
        const ring = document.createElement('div');
        ring.style.cssText = `
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 1px solid ${color}60;
          animation: pulse-ring 2.5s ease-out infinite;
          pointer-events: none;
        `;
        el.appendChild(ring);

        const marker = new maplibregl.Marker({
          element: el,
          anchor: 'center',
        })
          .setLngLat([parseFloat(incident.longitude), parseFloat(incident.latitude)])
          .addTo(mapInstance);

        markersRef.current.push(marker);

        // Hover scale
        el.addEventListener('mouseenter', () => {
          el.style.transform = 'scale(1.5)';
        });
        el.addEventListener('mouseleave', () => {
          el.style.transform = 'scale(1)';
        });

        // Click → full map
        el.addEventListener('click', () => {
          window.location.href = `/map?incident=${incident.id}`;
        });
      });

      // Very slow auto-drift
      let angle = 0;
      const drift = () => {
        if (!map.current) return;
        angle += 0.0003;
        const center = map.current.getCenter();
        const lng = center.lng + Math.sin(angle) * 0.008;
        const lat = center.lat + Math.cos(angle * 0.7) * 0.004;
        map.current.setCenter([lng, lat]);
        requestAnimationFrame(drift);
      };
      requestAnimationFrame(drift);
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.current?.remove();
      map.current = null;
    };
  }, [incidents]);

  // Watch for theme changes and update map style
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const newTheme = document.documentElement.getAttribute('data-theme');
      if (newTheme !== theme) {
        setTheme(newTheme);
        if (map.current) {
          map.current.setStyle(getMapStyleUrl());
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, [theme]);

  return (
    <div
      ref={mapContainer}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        width: '100%',
        height: '100%',
      }}
    />
  );
}
