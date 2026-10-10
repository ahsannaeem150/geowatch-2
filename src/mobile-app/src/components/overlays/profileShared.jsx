import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { listSavedIncidents } from '../../services/incidents.service';
import { severityOf } from '../selection/PreviewCard';

// Shared bits for the profile cluster (drawer / page / side panel /
// bookmarks & history sheets) — RN port of the prototype's prItemHTML row
// (accent bar + title + KIND · S# meta + .pii-thumb) and bm-empty states.

export function kindOfItem(item) {
  return item?.geometry_type === 'polygon' ? 'zone' : 'incident';
}

export function itemColor(theme, kind, item) {
  return kind === 'zone'
    ? item.zone_category_color || theme.accentLight
    : theme[`sev${severityOf(item)}`];
}

// Saved incidents + zones (same table) for the signed-in user.
export function useSavedIncidents() {
  const { signedIn } = useAuth();
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const reload = useCallback(() => {
    if (!signedIn) {
      setSaved([]);
      setError(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    listSavedIncidents()
      .then((rows) => setSaved(Array.isArray(rows) ? rows : rows?.data || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [signedIn]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { saved, loading, error, reload };
}

// .pii-thumb port: stylized mini-map tile (grid + target ring + pin), NOT a
// real map — one per row would be far too heavy.
function RowThumb({ color }) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.thumb,
        { backgroundColor: theme.bgDeep, borderColor: theme.borderSubtle },
      ]}
      pointerEvents="none">
      <View style={[styles.thumbGridV, { backgroundColor: theme.borderDefault }]} />
      <View style={[styles.thumbGridH, { backgroundColor: theme.borderDefault }]} />
      <View style={[styles.thumbRing, { borderColor: color }]} />
      <View style={[styles.thumbPin, { backgroundColor: color }]} />
    </View>
  );
}

// prItemHTML port: accent bar, title, `KIND · S#` meta (+ optional suffix),
// thumb. `highlighted` = prototype's .active state after preview restore.
export function SavedItemRow({ kind, item, metaSuffix, highlighted, onPress }) {
  const { theme } = useTheme();
  const color = itemColor(theme, kind, item);
  const sev = severityOf(item);
  const rowStyle = {
    backgroundColor: theme.bgElevated,
    borderColor: highlighted ? theme.accentLight : theme.borderSubtle,
  };
  return (
    <Pressable onPress={onPress} style={[styles.row, rowStyle]}>
      <View style={[styles.accent, { backgroundColor: color }]} />
      <View style={styles.rowBody}>
        <Text
          numberOfLines={2}
          style={[styles.rowTitle, { color: theme.textPrimary }]}>
          {item.title}
        </Text>
        <View style={styles.rowMeta}>
          <View style={[styles.metaDot, { backgroundColor: color }]} />
          <Text
            style={[
              styles.rowMetaText,
              { color: theme.textMuted, fontFamily: theme.fontMono },
            ]}>
            {`${kind.toUpperCase()} · S${sev}${metaSuffix || ''}`}
          </Text>
        </View>
      </View>
      <RowThumb color={color} />
    </Pressable>
  );
}

// bm-empty port: icon + title + sub + optional CTA button.
export function PanelEmpty({ icon, title, sub, ctaLabel, onCta }) {
  const { theme } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { borderColor: theme.borderSubtle }]}>
        {icon}
      </View>
      <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
        {title}
      </Text>
      <Text style={[styles.emptySub, { color: theme.textMuted }]}>{sub}</Text>
      {ctaLabel ? (
        <Pressable
          onPress={onCta}
          style={[styles.emptyCta, { backgroundColor: theme.accent }]}>
          <Text style={styles.emptyCtaText}>{ctaLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    paddingLeft: 12,
    marginHorizontal: 14,
    marginBottom: 8,
    overflow: 'hidden',
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 17,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  rowMetaText: {
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  thumb: {
    width: 46,
    height: 46,
    borderRadius: 9,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbGridV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 1,
  },
  thumbGridH: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 1,
  },
  thumbRing: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    opacity: 0.5,
  },
  thumbPin: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 42,
    gap: 10,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  emptySub: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  emptyCtaText: {
    color: '#f2f2f2',
    fontSize: 12.5,
    fontWeight: '600',
  },
});
