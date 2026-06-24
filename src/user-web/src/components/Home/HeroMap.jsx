import React, { useRef, useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { api } from '../../services/api.js';
import { useTheme } from '@shared/useTheme.js';
import { getIncidentDomainColor } from '@shared/utils/themeColors.js';

function getMapStyleUrl() {
  return document.documentElement.getAttribute('data-theme') === 'light'
    ? '/map-style-light.json'
    : '/map-style-dark.json';
}

export default function HeroMap() {
  const { theme } = useTheme();
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef([]);
  const driftFrameRef = useRef(null);
  const [incidents, setIncidents] = useState([]);
  const [mapTheme, setMapTheme] = useState(document.documentElement.getAttribute('data-theme') || 'dark');

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
        const lat = parseFloat(incident.latitude);
        const lng = parseFloat(incident.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        const el = document.createElement('div');
        const size = 6 + incident.severity * 2;
        const color = getIncidentDomainColor(incident, theme) || '#ef4444';
        const glowOpacity = theme === 'light' ? '45' : '80';
        const glowCoreOpacity = theme === 'light' ? '25' : '40';
        const ringOpacity = theme === 'light' ? '40' : '60';
        const border = theme === 'light' ? '1px solid rgba(255,255,255,0.6)' : 'none';

        el.style.cssText = `
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background: ${color};
          border: ${border};
          box-shadow: 0 0 ${size * 2}px ${color}${glowOpacity}, 0 0 ${size}px ${color}${glowCoreOpacity};
          cursor: pointer;
          transition: transform 0.3s ease;
        `;

        // Add pulse ring
        const ring = document.createElement('div');
        ring.style.cssText = `
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 1px solid ${color}${ringOpacity};
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

      // Slow auto-drift within a tight bounds box so it bounces instead of stopping at edges
      const BOUNDS = { lngMin: 30, lngMax: 80, latMin: 12, latMax: 42 };
      let vx = 0.004;
      let vy = 0.002;

      const drift = () => {
        if (!map.current) return;
        const center = map.current.getCenter();
        let lng = center.lng + vx;
        let lat = center.lat + vy;

        if (lng <= BOUNDS.lngMin || lng >= BOUNDS.lngMax) {
          vx = -vx;
          lng = Math.max(BOUNDS.lngMin, Math.min(BOUNDS.lngMax, lng));
        }
        if (lat <= BOUNDS.latMin || lat >= BOUNDS.latMax) {
          vy = -vy;
          lat = Math.max(BOUNDS.latMin, Math.min(BOUNDS.latMax, lat));
        }

        map.current.setCenter([lng, lat]);
        driftFrameRef.current = requestAnimationFrame(drift);
      };
      driftFrameRef.current = requestAnimationFrame(drift);
    });

    return () => {
      if (driftFrameRef.current) {
        cancelAnimationFrame(driftFrameRef.current);
        driftFrameRef.current = null;
      }
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.current?.remove();
      map.current = null;
    };
  }, [incidents, theme]);

  // Watch for theme changes and update map style
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const newTheme = document.documentElement.getAttribute('data-theme');
      if (newTheme !== mapTheme) {
        setMapTheme(newTheme);
        if (map.current) {
          map.current.setStyle(getMapStyleUrl());
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, [mapTheme]);

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
