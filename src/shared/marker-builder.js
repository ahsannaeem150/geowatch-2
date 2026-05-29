import { buildMarkerIconSVG } from './marker-icons.js';

/**
 * Build a MapLibre marker DOM element with a domain-icon marker.
 *
 * @param {object} incident - The incident object (needs domain_slug, domain_color, severity)
 * @param {object} options
 * @param {number} [options.size] - Override radius (default from SEVERITY_SCALE)
 * @param {boolean} [options.isGhost] - Render as ghost marker (semi-transparent, dashed)
 * @param {boolean} [options.isSelected] - Apply selection highlight
 * @param {boolean} [options.isNew] - Apply new-incident pulse ring
 * @returns {HTMLElement} - The marker root element (attach to MapLibre Marker)
 */
export function buildMarkerElement(incident, options = {}) {
  const { size, isGhost = false, isSelected = false, isNew = false } = options;
  const color = incident.domain_color || '#6b7280';
  const radius = size || 10;

  // Parent: MapLibre positions this via translate3d — DO NOT touch its transform
  const el = document.createElement('div');
  el.style.width = '0';
  el.style.height = '0';
  el.style.position = 'relative';
  el.dataset.incidentId = incident.id;
  el.dataset.color = color;
  el.dataset.size = String(radius);

  // Visual circle
  const visual = document.createElement('div');
  visual.style.position = 'absolute';
  visual.style.left = `-${radius}px`;
  visual.style.top = `-${radius}px`;
  visual.style.width = `${radius * 2}px`;
  visual.style.height = `${radius * 2}px`;
  visual.style.borderRadius = '50%';
  visual.style.background = color;
  visual.style.cursor = 'pointer';
  visual.style.transition = 'transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease';
  visual.style.willChange = 'transform';
  visual.style.display = 'flex';
  visual.style.alignItems = 'center';
  visual.style.justifyContent = 'center';

  if (isGhost) {
    visual.style.opacity = '0.5';
    visual.style.border = '2px dashed rgba(255,255,255,0.6)';
    visual.style.boxShadow = `0 0 ${radius}px ${color}60`;
  } else if (isSelected) {
    visual.style.border = '2px solid #fff';
    visual.style.boxShadow = `0 0 0 4px ${color}40, 0 0 ${radius * 2}px ${color}`;
  } else {
    visual.style.border = '1.5px solid rgba(255,255,255,0.3)';
    visual.style.boxShadow = `0 0 ${radius}px ${color}80`;
  }

  // Inner icon
  const iconWrapper = document.createElement('div');
  iconWrapper.style.width = '100%';
  iconWrapper.style.height = '100%';
  iconWrapper.style.display = 'flex';
  iconWrapper.style.alignItems = 'center';
  iconWrapper.style.justifyContent = 'center';
  iconWrapper.innerHTML = buildMarkerIconSVG(incident.domain_slug || incident.domain_slug, radius);
  visual.appendChild(iconWrapper);

  el.appendChild(visual);

  // New-incident pulse ring
  if (isNew && !isGhost) {
    const ring = document.createElement('div');
    ring.style.position = 'absolute';
    ring.style.left = `-${radius + 4}px`;
    ring.style.top = `-${radius + 4}px`;
    ring.style.width = `${radius * 2 + 8}px`;
    ring.style.height = `${radius * 2 + 8}px`;
    ring.style.borderRadius = '50%';
    ring.style.border = `2px solid ${color}`;
    ring.style.opacity = '0.6';
    ring.style.animation = 'marker-pulse-new 1.8s ease-out infinite';
    ring.style.pointerEvents = 'none';
    el.appendChild(ring);
  }

  // Ghost pulsing ring
  if (isGhost) {
    const ring = document.createElement('div');
    ring.style.position = 'absolute';
    ring.style.left = `-${radius + 6}px`;
    ring.style.top = `-${radius + 6}px`;
    ring.style.width = `${radius * 2 + 12}px`;
    ring.style.height = `${radius * 2 + 12}px`;
    ring.style.borderRadius = '50%';
    ring.style.border = `1.5px dashed ${color}`;
    ring.style.opacity = '0.4';
    ring.style.animation = 'ghost-pulse 2s ease-in-out infinite';
    ring.style.pointerEvents = 'none';
    el.appendChild(ring);
  }

  return el;
}

/**
 * Apply selection highlight styles to an existing marker element.
 */
export function updateMarkerSelection(el, isSelected) {
  const visual = el.firstChild;
  if (!visual) return;
  const color = el.dataset.color;
  const size = parseInt(el.dataset.size, 10);

  if (isSelected) {
    visual.style.border = '2px solid #fff';
    visual.style.boxShadow = `0 0 0 4px ${color}40, 0 0 ${size * 2}px ${color}`;
  } else {
    visual.style.border = '1.5px solid rgba(255,255,255,0.3)';
    visual.style.boxShadow = `0 0 ${size}px ${color}80`;
  }
}
