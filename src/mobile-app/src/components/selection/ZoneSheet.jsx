import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useOverlay } from '../../context/OverlayContext';
import { useSelection } from '../../context/SelectionContext';
import { ZoneInfo, formatItemDate } from './PreviewCard';
import { TimelineNode } from './IncidentDrawer';

// Zone detail body (stats + window card + restriction timeline) — rendered
// inside the multi-detent PeekSheet, sharing the incident sheet's grabber,
// fling, and inline evidence mechanics. Real backend data: stats/window
// render from list data instantly, the timeline fetches GET /incidents/:id
// (SelectionContext cache → instant reopen). No own ScrollView — the sheet
// supplies it.
export const ZoneBody = React.memo(function ZoneBody({ item }) {
  const { theme } = useTheme();
  const { showToast } = useOverlay();
  const { openEvidence, fetchDetail, getCachedDetail } = useSelection();
  // Lazy-init from the detail cache (same pattern as DrawerBody) so returning
  // from evidence never paints an empty body first.
  const [detail, setDetail] = useState(() =>
    item?.id ? getCachedDetail(item.id) : null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(
    (id) => {
      setLoading(true);
      setError(false);
      fetchDetail(id)
        .then((d) => setDetail(d))
        .catch(() => {
          setError(true);
          showToast('Failed to load zone details');
        })
        .finally(() => setLoading(false));
    },
    [fetchDetail, showToast],
  );

  useEffect(() => {
    if (item?.id) {
      const cached = getCachedDetail(item.id);
      setDetail(cached);
      if (!cached) {
        load(item.id);
      }
    }
  }, [item?.id, getCachedDetail, load]);

  // Detail payload wins over list data once fetched.
  const zone = detail?.incident ? { ...item, ...detail.incident } : item;
  const endDate = formatItemDate(zone.end_date);
  const timeline = [...(detail?.timeline || [])].sort(
    (a, b) => new Date(a.update_date) - new Date(b.update_date),
  );
  const declared = timeline.find((u) => u.type === 'report') || timeline[0];
  const updates = timeline.filter((u) => u !== declared);
  const skeletonBlock = [styles.skBlock, { backgroundColor: theme.bgElevated }];

  return (
    <View>
      <ZoneInfo item={zone} />
      <View
        style={[
          styles.window,
          {
            backgroundColor: theme.bgElevated,
            borderColor: theme.borderSubtle,
          },
        ]}>
        <View style={[styles.windowDot, { backgroundColor: theme.success }]} />
        <View style={styles.windowBody}>
          <Text style={[styles.windowTitle, { color: theme.textPrimary }]}>
            {endDate ? `Until ${endDate}` : 'Indefinite'}
          </Text>
          <Text
            style={[
              styles.windowSub,
              { color: theme.textMuted, fontFamily: theme.fontMono },
            ]}>
            {endDate ? 'Scheduled expiry' : 'Until further notice · no expiry'}
          </Text>
        </View>
      </View>

      <Text
        style={[
          styles.secLabel,
          { color: theme.textMuted, fontFamily: theme.fontMono },
        ]}>
        RESTRICTION TIMELINE
      </Text>

      {loading && !detail ? (
        <View style={styles.skWrap}>
          <View style={[...skeletonBlock, styles.skNode]} />
          <View style={[...skeletonBlock, styles.skNode]} />
        </View>
      ) : null}

      {error && !detail ? (
        <View
          style={[
            styles.errBox,
            {
              backgroundColor: theme.bgElevated,
              borderColor: theme.borderSubtle,
            },
          ]}>
          <Text style={[styles.errText, { color: theme.textSecondary }]}>
            Could not load the restriction timeline.
          </Text>
          <Pressable
            onPress={() => load(item.id)}
            style={[styles.retryBtn, { backgroundColor: theme.accent }]}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {declared ? (
        <View style={styles.timeline}>
          <TimelineNode
            update={declared}
            label="DECLARED"
            onInspect={() => openEvidence(declared)}
          />
          {updates.map((u) => (
            <TimelineNode
              key={u.id}
              update={u}
              label={`UPDATE ${formatItemDate(u.update_date)}`}
              onInspect={() => openEvidence(u)}
            />
          ))}
        </View>
      ) : null}
      <View style={styles.tailPad} />
    </View>
  );
});

export default ZoneBody;

const styles = StyleSheet.create({
  window: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  windowDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  windowBody: {
    flex: 1,
    gap: 2,
  },
  windowTitle: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  windowSub: {
    fontSize: 10.5,
  },
  secLabel: {
    fontSize: 9.5,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  timeline: {
    paddingLeft: 22,
    paddingRight: 16,
  },
  skWrap: {
    paddingHorizontal: 16,
    gap: 12,
  },
  skBlock: {
    borderRadius: 8,
  },
  skNode: {
    height: 110,
  },
  errBox: {
    marginHorizontal: 16,
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },
  errText: {
    fontSize: 12.5,
  },
  retryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 9,
  },
  retryText: {
    color: '#f2f2f2',
    fontSize: 12.5,
    fontWeight: '600',
  },
  tailPad: {
    height: 28,
  },
});
