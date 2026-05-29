/**
 * Domain-specific marker icons as SVG path data (viewBox 0 0 24 24).
 * Rendered as white icons inside colored marker circles.
 */

export const DOMAIN_MARKER_ICONS = {
  // Conflict & Violence
  'conflict': {
    path: 'M14.5 17.5L3 6V3h3l11.5 11.5M10 10l4 4M14.5 6.5L3 18v3h3l11.5-11.5',
    viewBox: '0 0 24 24',
  },
  'terrorism-asymmetric': {
    path: 'M12 2a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1zm0 15a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM6.34 6.34a1 1 0 0 1 0 1.42l-1.42 1.41a1 1 0 0 1-1.41-1.41l1.41-1.42a1 1 0 0 1 1.42 0zm12.73 0a1 1 0 0 1 1.41 0l1.42 1.41a1 1 0 1 1-1.41 1.42l-1.42-1.41a1 1 0 0 1 0-1.42zM4 13H2a1 1 0 1 1 0-2h2a1 1 0 1 1 0 2zm16 0h-2a1 1 0 1 1 0-2h2a1 1 0 1 1 0 2z',
    viewBox: '0 0 24 24',
  },

  // Civil & Political
  'civil-unrest': {
    path: 'M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2M8 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8.5c0 1.7 1.3 3.2 3 3.4h7c1.7-.2 3-1.7 3-3.4V10.5z',
    viewBox: '0 0 24 24',
  },
  'political': {
    path: 'M12 3l9 4.5v3L12 15l-9-4.5v-3L12 3zm0 13.5l7.5-3.75L12 18l-7.5-5.25L12 16.5zM12 21l7.5-3.75L12 22.5l-7.5-5.25L12 21z',
    viewBox: '0 0 24 24',
  },

  // Security & Military
  'counter-terrorism': {
    path: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    viewBox: '0 0 24 24',
  },
  'military-posture': {
    path: 'M2 12h4l2-9 4 18 4-18 2 9h4',
    viewBox: '0 0 24 24',
  },
  'intelligence': {
    path: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    viewBox: '0 0 24 24',
  },

  // CBRN / WMD
  'cbrn-wmd': {
    path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
    viewBox: '0 0 24 24',
  },

  // Cyber
  'cyber': {
    path: 'M4 17h16v2H4zm0-4h10v2H4zm0-4h16v2H4zm0-4h10v2H4zm12 8v-2h4v2h-4zm0-8V3h4v2h-4z',
    viewBox: '0 0 24 24',
  },

  // Environment & Health
  'natural-hazard': {
    path: 'M12 2L2 22h20L12 2zm0 4l6 12H6l6-12z',
    viewBox: '0 0 24 24',
  },
  'environmental': {
    path: 'M12 22c4.97 0 9-4.03 9-9-4.5 0-9-4.5-9-9-4.5 4.5-9 4.5-9 9 0 4.97 4.03 9 9 9z',
    viewBox: '0 0 24 24',
  },
  'health-emergency': {
    path: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z',
    viewBox: '0 0 24 24',
  },

  // Humanitarian
  'humanitarian': {
    path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
    viewBox: '0 0 24 24',
  },

  // Economic & Infrastructure
  'economic': {
    path: 'M3 3v18h18V3H3zm16 16H5V5h14v14zM7 17h2v-2H7v2zm0-4h2v-2H7v2zm0-4h2V7H7v2zm4 8h2v-2h-2v2zm0-4h2v-2h-2v2zm0-4h2V7h-2v2zm4 8h2v-2h-2v2zm0-4h2v-2h-2v2zm0-4h2V7h-2v2z',
    viewBox: '0 0 24 24',
  },
  'infrastructure': {
    path: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    viewBox: '0 0 24 24',
  },

  // Transport & Maritime
  'transport': {
    path: 'M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z',
    viewBox: '0 0 24 24',
  },
  'maritime': {
    path: 'M12 2c-4 4-8 6-8 10a8 8 0 0 0 16 0c0-4-4-6-8-10zM6 14c0-2.5 2.5-4.5 6-7.5 3.5 3 6 5 6 7.5a6 6 0 0 1-12 0z',
    viewBox: '0 0 24 24',
  },
};

/**
 * Get the SVG icon config for a domain slug.
 * Falls back to a circle dot if no icon is defined.
 */
export function getMarkerIcon(domainSlug) {
  return DOMAIN_MARKER_ICONS[domainSlug] || {
    path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z',
    viewBox: '0 0 24 24',
  };
}

/**
 * Build the inner SVG element for a marker icon.
 * Returns an SVG string that can be set as innerHTML.
 */
export function buildMarkerIconSVG(domainSlug, size) {
  const icon = getMarkerIcon(domainSlug);
  const iconSize = Math.max(size * 1.2, 8);
  return `
    <svg
      width="${iconSize}" height="${iconSize}"
      viewBox="${icon.viewBox}"
      fill="none"
      stroke="white"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      style="pointer-events: none;"
    >
      <path d="${icon.path}" />
    </svg>
  `;
}
