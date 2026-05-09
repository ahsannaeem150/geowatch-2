/**
 * Parse coordinate strings in DD, DDM, or DMS format.
 * Returns { lat, lng, format } or null.
 */

function normalize(input) {
  return input
    .replace(/[()\[\]{}]/g, ' ')     // brackets to spaces
    .replace(/[""]/g, '"')            // fancy double quotes
    .replace(/['']/g, "'")            // fancy single quotes
    .replace(/[°º]/g, '°')            // degree symbols
    .replace(/[′']/g, "'")            // minute symbols
    .replace(/[″"]/g, '"')            // second symbols
    .replace(/[,;]/g, ' ')            // separators to spaces
    .replace(/\s+/g, ' ')             // normalize spaces
    .trim();
}

function toDecimal(degrees, minutes = 0, seconds = 0, direction = '') {
  let decimal = Math.abs(degrees) + minutes / 60 + seconds / 3600;
  const dir = direction.toUpperCase();
  if (dir === 'S' || dir === 'W' || degrees < 0) {
    decimal = -decimal;
  }
  return decimal;
}

function isValid(lat, lng) {
  return (
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

// ─── DMS: 40° 26' 46.3" N 79° 58' 56" W ───
function tryParseDMS(input) {
  // With symbols: 40° 26' 46.3" N 79° 58' 56" W
  const symPattern =
    /^(\d+)\s*°\s*(\d+)\s*'\s*(\d+(?:\.\d+)?)\s*"?\s*([NS])\s+(\d+)\s*°\s*(\d+)\s*'\s*(\d+(?:\.\d+)?)\s*"?\s*([EW])$/i;

  // With colons: 40:26:46.3N 79:58:56W
  const colonPattern =
    /^(\d+):(\d+):(\d+(?:\.\d+)?)\s*([NS])\s+(\d+):(\d+):(\d+(?:\.\d+)?)\s*([EW])$/i;

  // Plain spaces: 40 26 46.3 N 79 58 56 W
  const plainPattern =
    /^(\d+)\s+(\d+)\s+(\d+(?:\.\d+)?)\s*([NS])\s+(\d+)\s+(\d+)\s+(\d+(?:\.\d+)?)\s*([EW])$/i;

  for (const pattern of [symPattern, colonPattern, plainPattern]) {
    const m = input.match(pattern);
    if (m) {
      const lat = toDecimal(parseInt(m[1], 10), parseInt(m[2], 10), parseFloat(m[3]), m[4]);
      const lng = toDecimal(parseInt(m[5], 10), parseInt(m[6], 10), parseFloat(m[7]), m[8]);
      if (isValid(lat, lng)) return { lat, lng };
    }
  }

  // Prefix directions: N 40° 26' 46.3" W 79° 58' 56"
  const prefixSymPattern =
    /^([NS])\s*(\d+)\s*°\s*(\d+)\s*'\s*(\d+(?:\.\d+)?)\s*"?\s+([EW])\s*(\d+)\s*°\s*(\d+)\s*'\s*(\d+(?:\.\d+)?)\s*"?$/i;

  const prefixColonPattern =
    /^([NS])\s*(\d+):(\d+):(\d+(?:\.\d+)?)\s+([EW])\s*(\d+):(\d+):(\d+(?:\.\d+)?)$/i;

  const prefixPlainPattern =
    /^([NS])\s*(\d+)\s+(\d+)\s+(\d+(?:\.\d+)?)\s+([EW])\s*(\d+)\s+(\d+)\s+(\d+(?:\.\d+)?)$/i;

  for (const pattern of [prefixSymPattern, prefixColonPattern, prefixPlainPattern]) {
    const m = input.match(pattern);
    if (m) {
      const lat = toDecimal(parseInt(m[2], 10), parseInt(m[3], 10), parseFloat(m[4]), m[1]);
      const lng = toDecimal(parseInt(m[6], 10), parseInt(m[7], 10), parseFloat(m[8]), m[5]);
      if (isValid(lat, lng)) return { lat, lng };
    }
  }

  return null;
}

// ─── DDM: 40° 26.7717' N 79° 58.9317' W ───
function tryParseDDM(input) {
  // With symbols: 40° 26.7717' N 79° 58.9317' W
  const symPattern =
    /^(\d+)\s*°\s*(\d+(?:\.\d+)?)\s*'?\s*([NS])\s+(\d+)\s*°\s*(\d+(?:\.\d+)?)\s*'?\s*([EW])$/i;

  // Plain spaces: 40 26.7717 N 79 58.9317 W
  const plainPattern =
    /^(\d+)\s+(\d+(?:\.\d+)?)\s*([NS])\s+(\d+)\s+(\d+(?:\.\d+)?)\s*([EW])$/i;

  for (const pattern of [symPattern, plainPattern]) {
    const m = input.match(pattern);
    if (m) {
      const lat = toDecimal(parseInt(m[1], 10), parseFloat(m[2]), 0, m[3]);
      const lng = toDecimal(parseInt(m[4], 10), parseFloat(m[5]), 0, m[6]);
      if (isValid(lat, lng)) return { lat, lng };
    }
  }

  // Prefix directions: N 40° 26.7717' W 79° 58.9317'
  const prefixSymPattern =
    /^([NS])\s*(\d+)\s*°\s*(\d+(?:\.\d+)?)\s*'?\s+([EW])\s*(\d+)\s*°\s*(\d+(?:\.\d+)?)\s*'?$/i;

  const prefixPlainPattern =
    /^([NS])\s*(\d+)\s+(\d+(?:\.\d+)?)\s+([EW])\s*(\d+)\s+(\d+(?:\.\d+)?)$/i;

  for (const pattern of [prefixSymPattern, prefixPlainPattern]) {
    const m = input.match(pattern);
    if (m) {
      const lat = toDecimal(parseInt(m[2], 10), parseFloat(m[3]), 0, m[1]);
      const lng = toDecimal(parseInt(m[5], 10), parseFloat(m[6]), 0, m[4]);
      if (isValid(lat, lng)) return { lat, lng };
    }
  }

  return null;
}

// ─── DD: 40.446195°N 79.982195°W ───
function tryParseDD(input) {
  // With suffix directions and optional °: 40.446195°N 79.982195°W
  const suffixPattern =
    /^([+-]?\d+\.?\d*)\s*°?\s*([NS])\s+([+-]?\d+\.?\d*)\s*°?\s*([EW])$/i;

  const m1 = input.match(suffixPattern);
  if (m1) {
    const lat = toDecimal(parseFloat(m1[1]), 0, 0, m1[2]);
    const lng = toDecimal(parseFloat(m1[3]), 0, 0, m1[4]);
    if (isValid(lat, lng)) return { lat, lng };
  }

  // With prefix directions: N 40.446195° W 79.982195°
  const prefixPattern =
    /^([NS])\s*([+-]?\d+\.?\d*)\s*°?\s+([EW])\s*([+-]?\d+\.?\d*)\s*°?$/i;

  const m2 = input.match(prefixPattern);
  if (m2) {
    const lat = toDecimal(parseFloat(m2[2]), 0, 0, m2[1]);
    const lng = toDecimal(parseFloat(m2[4]), 0, 0, m2[3]);
    if (isValid(lat, lng)) return { lat, lng };
  }

  // Plain numbers: must look like coordinates (no letters, mostly numbers)
  // Only match if the entire input is just two numbers separated by space
  const plainPattern = /^([+-]?\d+\.?\d*)\s+([+-]?\d+\.?\d*)$/;

  const m3 = input.match(plainPattern);
  if (m3) {
    const lat = parseFloat(m3[1]);
    const lng = parseFloat(m3[2]);
    if (isValid(lat, lng)) return { lat, lng };
  }

  return null;
}

// ─── Main entry point ───
export function parseCoordinates(input) {
  if (!input || typeof input !== 'string') return null;

  const normalized = normalize(input);
  if (!normalized) return null;

  // Try most specific first
  const dms = tryParseDMS(normalized);
  if (dms) return { lat: dms.lat, lng: dms.lng, format: 'DMS' };

  const ddm = tryParseDDM(normalized);
  if (ddm) return { lat: ddm.lat, lng: ddm.lng, format: 'DDM' };

  const dd = tryParseDD(normalized);
  if (dd) return { lat: dd.lat, lng: dd.lng, format: 'DD' };

  return null;
}

export default parseCoordinates;
