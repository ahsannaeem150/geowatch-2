const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = 'GeoWatch/1.0 (https://geowatch.local)';

/**
 * Reverse geocode lat/lng to a human-readable location context.
 * Returns "State, Country" or null on failure.
 */
export async function reverseGeocode(lat, lng) {
  try {
    const url = `${NOMINATIM_REVERSE_URL}?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&format=json&addressdetails=1&zoom=10`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) return null;
    const data = await res.json();

    if (!data.address) return null;

    const addr = data.address;
    const parts = [];

    // State / Province / Region
    if (addr.state) parts.push(addr.state);
    else if (addr.province) parts.push(addr.province);
    else if (addr.region) parts.push(addr.region);
    else if (addr.county) parts.push(addr.county);

    // Country
    if (addr.country) parts.push(addr.country);

    if (parts.length === 0) return null;
    return parts.join(', ');
  } catch {
    return null;
  }
}
