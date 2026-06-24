/**
 * Theme-aware color helpers.
 * Used to pick domain / severity colors that stay readable in both dark and light modes.
 */

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function rgbToHex(r, g, b) {
  const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function getLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Returns true if the color is visually light (better for dark backgrounds).
 */
export function isLightColor(hex) {
  return getLuminance(hex) > 0.55;
}

/**
 * Darken a hex color by a factor (0..1).
 */
export function darken(hex, factor = 0.35) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * (1 - factor), g * (1 - factor), b * (1 - factor));
}

/**
 * Mix a color with white.
 */
export function tint(hex, factor = 0.9) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * factor, g + (255 - g) * factor, b + (255 - b) * factor);
}

/**
 * Pick the color to use for a domain object based on current theme.
 */
export function getDomainColor(domain, theme) {
  if (!domain) return '#6b7280';
  if (theme === 'light') {
    return domain.light_color || domain.lightColor || domain.color || '#6b7280';
  }
  return domain.color || '#6b7280';
}

/**
 * Pick the color to use for an incident based on current theme.
 */
export function getIncidentDomainColor(incident, theme) {
  if (!incident) return '#6b7280';
  if (theme === 'light') {
    return incident.domain_light_color || incident.domainLightColor || incident.domain_color || incident.domainColor || '#6b7280';
  }
  return incident.domain_color || incident.domainColor || '#6b7280';
}

/**
 * Build colors for a domain category card.
 */
export function getDomainCardColors(color, theme) {
  const base = color || '#6b7280';

  if (theme === 'light') {
    const text = isLightColor(base) ? darken(base, 0.35) : base;
    const border = tint(base, 0.75);
    const hoverBorder = isLightColor(base) ? darken(base, 0.25) : base;
    return { color: text, border, hoverBorder };
  }

  return {
    color: base,
    border: `${base}20`,
    hoverBorder: `${base}50`,
  };
}

/**
 * Build badge background / border / text colors that are readable on the
 * current surface. In light mode we use opaque tints instead of alpha overlays.
 */
export function getBadgeColors(color, theme) {
  const base = color || '#6b7280';

  if (theme === 'light') {
    const text = isLightColor(base) ? darken(base, 0.35) : base;
    const bg = tint(base, 0.88);
    const border = tint(base, 0.55);
    return { background: bg, color: text, border: `1px solid ${border}` };
  }

  return {
    background: `${base}18`,
    color: base,
    border: `1px solid ${base}40`,
  };
}

/**
 * Build colors for a severity badge.
 */
export function getSeverityBadgeColors(color, theme) {
  const base = color || '#6b7280';

  if (theme === 'light') {
    const text = isLightColor(base) ? darken(base, 0.35) : base;
    const bg = tint(base, 0.88);
    const border = tint(base, 0.55);
    const divider = tint(base, 0.45);
    return { background: bg, color: text, border: `1px solid ${border}`, divider };
  }

  return {
    background: `${base}10`,
    color: base,
    border: `1px solid ${base}30`,
    divider: `${base}40`,
  };
}
