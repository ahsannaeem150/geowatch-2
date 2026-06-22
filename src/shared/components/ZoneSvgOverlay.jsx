import React, { useEffect, useMemo, useState } from 'react';
import { buildZoneScreenPath } from '@shared/utils/zoneGeometry.js';

function normalizeGeometry(geometry) {
  if (!geometry) return null;
  if (typeof geometry === 'string') {
    try {
      const parsed = JSON.parse(geometry);
      return parsed && Array.isArray(parsed.coordinates) ? parsed : null;
    } catch {
      return null;
    }
  }
  if (Array.isArray(geometry.coordinates)) return geometry;
  if (Array.isArray(geometry)) return { type: 'Polygon', coordinates: geometry };
  return null;
}

/**
 * GeoWatch shared zone SVG overlay.
 *
 * Renders polygon zones with the approved "neon-fade-no-shadow" style:
 *   - subtle radial-gradient fill
 *   - glowing own-color border
 *
 * Also renders a dashed "ghost" zone (selected zone outside the current date range).
 *
 * The overlay is pointer-events-none; interaction hit-testing must be handled
 * separately via an invisible MapLibre layer.
 */
export default function ZoneSvgOverlay({
  mapInstance,
  zones = [],
  selectedZoneId,
  hoveredZoneId,
  ghostZone,
  showZones = true,
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!mapInstance) return;
    const onMove = () => setTick((t) => t + 1);
    mapInstance.on('move', onMove);
    mapInstance.on('resize', onMove);
    return () => {
      mapInstance.off('move', onMove);
      mapInstance.off('resize', onMove);
    };
  }, [mapInstance]);

  const uniqueZones = useMemo(() => {
    const seen = new Set();
    return zones.filter((zone) => {
      if (!zone || !zone.id || seen.has(zone.id)) return false;
      seen.add(zone.id);
      return true;
    });
  }, [zones]);

  const renderedZones = useMemo(() => {
    if (!mapInstance || !showZones) return [];
    return uniqueZones
      .map((zone) => {
        const d = buildZoneScreenPath(mapInstance, normalizeGeometry(zone.geometry));
        if (!d) return null;
        return {
          id: String(zone.id),
          d,
          color: zone.zone_category_color || '#6366f1',
        };
      })
      .filter(Boolean);
  }, [mapInstance, zones, tick]);

  const ghostPath = useMemo(() => {
    if (!mapInstance || !ghostZone?.geometry) return null;
    const d = buildZoneScreenPath(mapInstance, normalizeGeometry(ghostZone.geometry));
    if (!d) return null;
    return {
      d,
      color: ghostZone.zone_category_color || '#6366f1',
    };
  }, [mapInstance, ghostZone, tick]);

  return (
    <svg
      width="100%"
      height="100%"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      <style>{`
        @keyframes zone-ghost-dash {
          to { stroke-dashoffset: -20; }
        }
        .zone-ghost path:nth-child(2) {
          animation: zone-ghost-dash 1s linear infinite;
        }
      `}</style>
      <defs>
        <filter id="zone-neon-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {renderedZones.map((zone) => (
          <radialGradient
            key={`grad-${zone.id}`}
            id={`zone-neon-grad-${zone.id}`}
            cx="50%"
            cy="50%"
            r="50%"
            fx="50%"
            fy="50%"
          >
            <stop offset="0%" stopColor={zone.color} stopOpacity="0" />
            <stop offset="55%" stopColor={zone.color} stopOpacity="0.04" />
            <stop offset="85%" stopColor={zone.color} stopOpacity="0.09" />
            <stop offset="100%" stopColor={zone.color} stopOpacity="0.12" />
          </radialGradient>
        ))}
      </defs>

      {renderedZones.map((zone) => {
        const isSelected = String(selectedZoneId) === zone.id;
        const isHovered = String(hoveredZoneId) === zone.id;
        const fillOpacity = isSelected ? 1 : isHovered ? 0.9 : 0.75;
        const strokeOpacity = isSelected ? 0.95 : isHovered ? 0.85 : 0.7;
        return (
          <g key={zone.id}>
            <path
              d={zone.d}
              fill={`url(#zone-neon-grad-${zone.id})`}
              stroke="none"
              opacity={fillOpacity}
            />
            <path
              d={zone.d}
              fill="none"
              stroke={zone.color}
              strokeWidth="1.5"
              strokeLinejoin="round"
              filter="url(#zone-neon-glow)"
              opacity={strokeOpacity}
            />
          </g>
        );
      })}

      {ghostPath && (
        <g className="zone-ghost">
          <path d={ghostPath.d} fill={ghostPath.color} fillOpacity="0.06" stroke="none" />
          <path
            d={ghostPath.d}
            fill="none"
            stroke={ghostPath.color}
            strokeWidth="2"
            strokeDasharray="6 4"
            strokeOpacity="0.6"
            strokeLinejoin="round"
          />
        </g>
      )}
    </svg>
  );
}
