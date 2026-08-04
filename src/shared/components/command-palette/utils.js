import { formatDistanceToNow } from 'date-fns';

// ─── Pure helpers for the shared command palette ───

export function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function timeAgoLabel(dateValue) {
  if (!dateValue) return '';
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return '';
  return formatDistanceToNow(d, { addSuffix: true });
}

export function parseCoordinates(query) {
  const match = query.match(/^\s*(-?\d+(?:\.\d+)?)\s*[|,\s]\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!match) return null;
  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export function getZoomForLocation(type, cls) {
  const t = (type || '').toLowerCase();
  const c = (cls || '').toLowerCase();
  if (t === 'coordinates') return 16;
  if (t === 'continent') return 3;
  if (t === 'country') return 5;
  if (['state', 'province', 'region'].includes(t)) return 7;
  if (['county', 'district'].includes(t)) return 9;
  if (t === 'city') return 11;
  if (t === 'town') return 13;
  if (t === 'village') return 14;
  if (['suburb', 'neighbourhood', 'neighborhood', 'quarter'].includes(t)) return 15;
  if (['street', 'road', 'square', 'farm', 'allotments'].includes(t)) return 16;
  if (['house', 'building', 'place_of_worship', 'museum', 'hospital', 'school', 'university', 'college'].includes(t)) return 17;
  if (['river', 'lake', 'water', 'reservoir', 'pond'].includes(t)) return 12;
  if (['mountain', 'peak', 'volcano', 'ridge'].includes(t)) return 13;
  if (['airport', 'station', 'bus_station', 'railway_station'].includes(t)) return 14;
  if (c === 'boundary') return 9;
  if (c === 'place') return 12;
  if (c === 'highway') return 16;
  return 11;
}

export function formatLocationName(loc) {
  const addr = loc.address || {};
  const name =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.suburb ||
    addr.district ||
    addr.county ||
    addr.state ||
    loc.display_name?.split(',')[0]?.trim() ||
    loc.display_name;
  const region = addr.state || addr.province || addr.region;
  const country = addr.country;
  const parts = [name];
  if (region && region !== name) parts.push(region);
  if (country && country !== name && country !== region) parts.push(country);
  if (parts.length > 1) return parts.join(', ');
  return loc.display_name || name;
}

export function formatLocationDetail(loc) {
  const type = loc.type ? loc.type.charAt(0).toUpperCase() + loc.type.slice(1) : '';
  const cls = loc.class ? loc.class.charAt(0).toUpperCase() + loc.class.slice(1) : '';
  if (type && cls && type !== cls) return `${type} · ${cls}`;
  return type || cls || '';
}

// Same display fields for map-loaded incidents and backend search rows.
export function normalizeIncident(inc) {
  return {
    ...inc,
    _location: inc.location_context || inc.location || '',
    _category: inc.category_name || inc.domain_name || inc.zone_category_name || '',
    _createdAtMs: inc.created_at ? new Date(inc.created_at).getTime() : 0,
  };
}
