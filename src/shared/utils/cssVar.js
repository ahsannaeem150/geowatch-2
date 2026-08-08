// Read a CSS custom property from the document root — for JS/canvas contexts that
// cannot consume var() in styles (e.g. <canvas> painting). Returns the fallback
// when the var is unset or when running outside a browser.
export function getCssVar(name, fallback = '') {
  if (typeof window === 'undefined' || typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}
