import React, { useId, useMemo, useState } from 'react';
import './ZoneSidebarAnimationTrial.css';
import { MOCK_ZONE, MOCK_ZONE_NO_END } from './zoneTrialData.js';
import { buildPolygonSvgProjection } from '@shared/utils/zoneGeometry.js';
import { Radio } from 'lucide-react';

function PulsePreview({ zone }) {
  const uid = useId().replace(/:/g, '');
  const ring = zone.geometry?.coordinates?.[0];
  const projection = useMemo(
    () => (ring ? buildPolygonSvgProjection(ring, 900, 540, 60) : null),
    [ring]
  );

  if (!projection) return null;

  const pathId = `pulse-path-${uid}`;
  const gradId = `pulse-grad-${uid}`;
  const glowId = `pulse-glow-${uid}`;
  const [centroidX, centroidY] = projection.centroid;

  return (
    <div className="zone-pulse-stage">
      <svg
        className="zone-pulse-svg"
        viewBox={projection.viewBox}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <path id={pathId} d={projection.path} />
          <radialGradient
            id={gradId}
            cx="50%"
            cy="50%"
            r="50%"
            fx="50%"
            fy="50%"
          >
            <stop offset="0%" stopColor={zone.zoneCategoryColor} stopOpacity="0" />
            <stop offset="35%" stopColor={zone.zoneCategoryColor} stopOpacity="0.02" />
            <stop offset="60%" stopColor={zone.zoneCategoryColor} stopOpacity="0.06" />
            <stop offset="85%" stopColor={zone.zoneCategoryColor} stopOpacity="0.10" />
            <stop offset="100%" stopColor={zone.zoneCategoryColor} stopOpacity="0.14" />
          </radialGradient>
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Full black background */}
        <rect width="100%" height="100%" fill="#000" />

        {/* Neon-fade base polygon — fill only, no stroke */}
        <use href={`#${pathId}`} fill={`url(#${gradId})`} stroke="none" />

        {/* Neon-fade base polygon — thin stroke with glow, no fill */}
        <use
          href={`#${pathId}`}
          fill="none"
          stroke={zone.zoneCategoryColor}
          strokeWidth={1}
          strokeLinejoin="round"
          filter={`url(#${glowId})`}
          className="zone-pulse-base"
        />

        {/* Inward-traveling pulse rings */}
        {[0, 1, 2].map((i) => (
          <use
            key={i}
            href={`#${pathId}`}
            fill="none"
            stroke={zone.zoneCategoryColor}
            strokeWidth={2}
            strokeLinejoin="round"
            filter={`url(#${glowId})`}
            className="zone-pulse-ring"
            style={{
              '--pulse-delay': `${i * 6}s`,
              transformOrigin: `${centroidX}px ${centroidY}px`,
            }}
          />
        ))}
      </svg>
    </div>
  );
}

export default function ZoneSidebarAnimationTrialPage() {
  const [demoMode, setDemoMode] = useState('notam');
  const zone = demoMode === 'notam' ? MOCK_ZONE : MOCK_ZONE_NO_END;

  return (
    <div className="zone-sidebar-animation-page">
      <header className="zone-sidebar-animation-header">
        <div>
          <h1 className="zone-sidebar-animation-title">Sidebar mini-map pulse</h1>
          <p className="zone-sidebar-animation-subtitle">
            Neon-fade polygon with inward-traveling edge pulses. No centroid dot.
          </p>
        </div>
        <div className="zone-sidebar-animation-demo">
          <span className="zone-sidebar-animation-demo__label">
            <Radio size={12} />
            Trial data
          </span>
          <div className="zone-sidebar-animation-demo__toggle">
            <button className={demoMode === 'notam' ? 'active' : ''} onClick={() => setDemoMode('notam')}>
              NOTAM
            </button>
            <button className={demoMode === 'curfew' ? 'active' : ''} onClick={() => setDemoMode('curfew')}>
              Curfew
            </button>
          </div>
        </div>
      </header>

      <PulsePreview zone={zone} />
    </div>
  );
}
