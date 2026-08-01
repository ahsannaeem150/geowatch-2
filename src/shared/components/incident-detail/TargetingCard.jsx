import React from 'react';
import './TargetingCard.css';

/**
 * TargetingCard — procedural hero shown for incidents without uploaded media.
 * Pure CSS/SVG tactical "targeting" panel: hairline grid, centered reticle,
 * domain-color tint, coordinates in mono. Always-dark imagery panel that reads
 * identically in light and dark themes; animations are pure CSS keyframes and
 * are neutralized globally by the reduced-motion rules in design-tokens.css.
 *
 * Props:
 *   latitude, longitude — incident coords (string or number; parseFloat-safe)
 *   color               — domain/category tint color
 *   label               — corner tag (default "GW · TARGETING"), '' hides
 *   compact             — thumbnail mode: hides coords + corner label
 *   className, style    — container overrides
 */
export default function TargetingCard({
  latitude,
  longitude,
  color = '#9f1239',
  label = 'GW · TARGETING',
  compact = false,
  className = '',
  style = {},
}) {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const coordText = hasCoords
    ? `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'} · ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`
    : null;

  return (
    <div
      className={`tc${compact ? ' tc--compact' : ''}${className ? ` ${className}` : ''}`}
      style={{ ...style, '--tc-color': color }}
      aria-hidden="true"
    >
      <div className="tc__vignette" />
      <div className="tc__grid" />
      <div className="tc__scan" />

      <div className="tc__center">
        <svg className="tc__reticle" viewBox="0 0 120 120" fill="none">
          <circle className="tc__ping" cx="60" cy="60" r="34" />
          <circle cx="60" cy="60" r="34" />
          <circle cx="60" cy="60" r="18" />
          <line x1="60" y1="6" x2="60" y2="30" />
          <line x1="60" y1="90" x2="60" y2="114" />
          <line x1="6" y1="60" x2="30" y2="60" />
          <line x1="90" y1="60" x2="114" y2="60" />
          <circle className="tc__dot" cx="60" cy="60" r="3" />
        </svg>
        {!compact && coordText && <div className="tc__coords">{coordText}</div>}
      </div>

      {!compact && label && <div className="tc__label">{label}</div>}
      {!compact && <div className="tc__label tc__label--right">NO IMAGERY</div>}
    </div>
  );
}
