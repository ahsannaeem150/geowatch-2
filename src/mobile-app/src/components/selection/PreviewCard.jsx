import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MapPin, Star } from 'lucide-react-native';
import { format, isValid, parseISO } from 'date-fns';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useOverlay } from '../../context/OverlayContext';
import {
  isIncidentSaved,
  saveIncident,
  unsaveIncident,
} from '../../services/incidents.service';
import { SEVERITIES, ZONE_OVERLAYS } from '../../constants';

// Shared selection bodies — RN port of the prototype renderPeek() card
// (badge row, title + star, meta, description box) and the zone stats
// block. Peek renders from list data; the drawer passes the fetched detail
// (SelectionContext cache) for full-fidelity content.

export function severityOf(item) {
  return Math.min(Math.max(parseInt(item?.severity, 10) || 3, 1), 5);
}

export function formatItemDate(iso) {
  const d = iso ? parseISO(iso) : null;
  return d && isValid(d) ? format(d, 'dd MMM yyyy') : '';
}

export function locationLine(item) {
  if (item?.location_context) {
    return item.location_context;
  }
  const lat = parseFloat(item?.latitude);
  const lng = parseFloat(item?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng)
    ? `${lat.toFixed(2)}, ${lng.toFixed(2)}`
    : '—';
}

export function zoneOverlayFor(name) {
  return ZONE_OVERLAYS.find((z) => z.name === name) || null;
}

// Thousands-separated km² ("44,181 km²" prototype style). Input is the
// backend's area_sq_m string (PostGIS computes it for polygons).
export function formatKm2(areaSqM) {
  const km2 = parseFloat(areaSqM) / 1e6;
  if (!Number.isFinite(km2)) {
    return null;
  }
  const rounded = km2 >= 100 ? Math.round(km2) : km2 >= 10 ? km2.toFixed(1) : km2.toFixed(2);
  return String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatKm(perimeterM) {
  const km = parseFloat(perimeterM) / 1000;
  if (!Number.isFinite(km)) {
    return null;
  }
  const rounded = km >= 100 ? Math.round(km) : km.toFixed(1);
  return String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Corner count of the zone outline (excludes the closing duplicate point).
export function zoneVertexCount(geometry) {
  const rings =
    geometry?.type === 'Polygon'
      ? [geometry.coordinates?.[0]]
      : geometry?.type === 'MultiPolygon'
        ? geometry.coordinates.map((p) => p[0])
        : [];
  let count = 0;
  rings.forEach((ring) => {
    if (!Array.isArray(ring)) {
      return;
    }
    const first = ring[0];
    const last = ring[ring.length - 1];
    const closed =
      ring.length > 1 && first && last && first[0] === last[0] && first[1] === last[1];
    count += closed ? ring.length - 1 : ring.length;
  });
  return count || null;
}

// Verification badge renders only when status ≠ unverified (web parity).
export function verificationTag(theme, status) {
  switch (status) {
    case 'verified':
      return { color: theme.success, label: '✓ Verified' };
    case 'disputed':
      return { color: theme.sev2, label: '⚠ Disputed' };
    case 'debunked':
      return { color: theme.danger, label: '✕ Debunked' };
    default:
      return null;
  }
}

// b-tag port: mono 9px uppercase chip. `dot` renders the leading b-dot.
export function Tag({ color, label, dot }) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: `${color}24`, borderColor: `${color}59` },
      ]}>
      {dot ? (
        <View style={[styles.badgeDot, { backgroundColor: color }]} />
      ) : null}
      <Text style={[styles.badgeText, { color, fontFamily: theme.fontMono }]}>
        {label}
      </Text>
    </View>
  );
}

// Real bookmark star: checks saved state when signed in, toggles
// save/unsave; signed out → requireSignIn gate (sign-in sheet).
export function StarButton({ itemId }) {
  const { theme } = useTheme();
  const { signedIn, requireSignIn } = useAuth();
  const { showToast } = useOverlay();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    setSaved(false);
    if (signedIn && itemId) {
      isIncidentSaved(itemId)
        .then((res) => {
          if (alive) {
            setSaved(!!res?.saved);
          }
        })
        .catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, [signedIn, itemId]);

  const toggle = async () => {
    if (!itemId || busy) {
      return;
    }
    if (!requireSignIn('save incidents')) {
      return;
    }
    const next = !saved;
    setSaved(next); // optimistic
    setBusy(true);
    try {
      if (next) {
        await saveIncident(itemId);
      } else {
        await unsaveIncident(itemId);
      }
      showToast(next ? 'Saved to bookmarks' : 'Removed from bookmarks');
    } catch {
      setSaved(!next);
      showToast('Could not update bookmark');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable onPress={toggle} hitSlop={8} style={styles.starBtn}>
      <Star
        size={17}
        color={saved ? theme.sev2 : theme.textMuted}
        fill={saved ? theme.sev2 : 'transparent'}
      />
    </Pressable>
  );
}

// Incident preview card (peek + drawer body).
export function IncidentCard({ item }) {
  const { theme } = useTheme();
  if (!item) {
    return null;
  }
  const sev = severityOf(item);
  const sevColor = theme[`sev${sev}`];
  const sevName = SEVERITIES[sev - 1]?.name || 'Moderate';
  const typeLabel = (item.category_name || item.domain_name || 'Incident').toUpperCase();
  const typeColor = item.domain_color || theme.sev4;
  const verTag = verificationTag(theme, item.verification_status);
  const date = formatItemDate(item.start_date);

  return (
    <View style={styles.card}>
      <View style={styles.badgeRow}>
        <Tag color={typeColor} label={typeLabel} dot />
        {item.status === 'active' ? (
          <Tag color={theme.success} label="Active" dot />
        ) : null}
        {verTag ? <Tag color={verTag.color} label={verTag.label} /> : null}
        <Tag color={sevColor} label={`S${sev} | ${sevName}`} />
      </View>
      <View style={styles.titleRow}>
        <Text
          style={[
            styles.title,
            { color: theme.textPrimary, fontFamily: theme.fontHead },
          ]}>
          {item.title}
        </Text>
        <StarButton itemId={item.id} />
      </View>
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <MapPin size={12} color={theme.textSecondary} />
          <Text style={[styles.metaText, { color: theme.textSecondary }]}>
            {locationLine(item)}
            {date ? ` · ${date}` : ''}
          </Text>
        </View>
      </View>
      <View
        style={[
          styles.descBox,
          {
            backgroundColor: theme.bgElevated,
            borderColor: theme.borderSubtle,
          },
        ]}>
        <Text style={[styles.descText, { color: theme.textSecondary }]}>
          {item.description?.trim() || 'No description provided.'}
        </Text>
      </View>
    </View>
  );
}

// Zone info block (zone peek in preview mode + ZoneSheet body).
// Stats follow the prototype .zn-stats: value on top, label below.
export function ZoneInfo({ item }) {
  const { theme } = useTheme();
  if (!item) {
    return null;
  }
  const color = item.zone_category_color || theme.accentLight;
  const sev = severityOf(item);
  const verTag = verificationTag(theme, item.verification_status);
  const areaKm2 = formatKm2(item.area_sq_m);
  const periKm = formatKm(item.perimeter_m);
  const vertices = zoneVertexCount(item.geometry);

  return (
    <View style={styles.card}>
      <View style={styles.badgeRow}>
        <Tag
          color={color}
          label={(item.zone_category_name || 'Zone').toUpperCase()}
          dot
        />
        {item.status === 'active' ? (
          <Tag color={theme.success} label="Active" dot />
        ) : null}
        {verTag ? <Tag color={verTag.color} label={verTag.label} /> : null}
        <Tag
          color={theme[`sev${sev}`]}
          label={`S${sev} | ${SEVERITIES[sev - 1]?.name || 'Moderate'}`}
        />
      </View>
      <View style={styles.titleRow}>
        <Text
          style={[
            styles.title,
            { color: theme.textPrimary, fontFamily: theme.fontHead },
          ]}>
          {item.title}
        </Text>
        <StarButton itemId={item.id} />
      </View>
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <MapPin size={12} color={theme.textSecondary} />
          <Text style={[styles.metaText, { color: theme.textSecondary }]}>
            {locationLine(item)}
            {formatItemDate(item.start_date)
              ? ` · ${formatItemDate(item.start_date)}`
              : ''}
          </Text>
        </View>
      </View>
      <View
        style={[
          styles.statsRow,
          {
            backgroundColor: theme.bgElevated,
            borderColor: theme.borderSubtle,
          },
        ]}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: theme.textPrimary }]}>
            {areaKm2 ? `${areaKm2} km²` : '—'}
          </Text>
          <Text
            style={[
              styles.statLabel,
              { color: theme.textMuted, fontFamily: theme.fontMono },
            ]}>
            AREA
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: theme.textPrimary }]}>
            {periKm ? `${periKm} km` : '—'}
          </Text>
          <Text
            style={[
              styles.statLabel,
              { color: theme.textMuted, fontFamily: theme.fontMono },
            ]}>
            PERIMETER
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: theme.textPrimary }]}>
            {vertices ?? '—'}
          </Text>
          <Text
            style={[
              styles.statLabel,
              { color: theme.textMuted, fontFamily: theme.fontMono },
            ]}>
            VERTICES
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    paddingTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    borderWidth: 1,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 23,
    paddingRight: 8,
  },
  starBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    gap: 7,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 12.5,
  },
  descBox: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 14,
  },
  descText: {
    fontSize: 12.5,
    lineHeight: 20.5,
  },
  statsRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  stat: {
    flex: 1,
    gap: 4,
  },
  statLabel: {
    fontSize: 8.5,
    letterSpacing: 1.4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});
