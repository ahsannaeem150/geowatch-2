import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useOverlay } from '../../context/OverlayContext';
import { useSelection } from '../../context/SelectionContext';
import { ZoneInfo, formatItemDate } from './PreviewCard';
import { TimelineNode } from './IncidentDrawer';

const SWIPE_CLOSE_DISTANCE = 60;

// Zone sheet: 62% bottom sheet for polygon selections (any mode). Body is
// real backend data — stats/window render from list data instantly, the
// Restriction Timeline fetches GET /incidents/:id on open (SelectionContext
// cache → instant reopen, same pattern as IncidentDrawer). Grabber swipe-down
// or ✕ → pill (plain) or peek+emb (preview), via closeZoneSheet().
export default function ZoneSheet() {
  const { theme } = useTheme();
  const { showToast } = useOverlay();
  const {
    view,
    item,
    closeZoneSheet,
    openEvidence,
    fetchDetail,
    getCachedDetail,
  } = useSelection();
  const { height: windowHeight } = useWindowDimensions();
  const height = Math.round(windowHeight * 0.62);
  const visible = view === 'zoneSheet' && !!item;
  const enter = useRef(new Animated.Value(0)).current;
  const drag = useRef(new Animated.Value(0)).current;

  const [detail, setDetail] = useState(null);
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
    if (visible && item?.id) {
      const cached = getCachedDetail(item.id);
      setDetail(cached);
      if (!cached) {
        load(item.id);
      }
    }
  }, [visible, item?.id, getCachedDetail, load]);

  useEffect(() => {
    if (visible) {
      enter.setValue(0);
      Animated.timing(enter, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, enter]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => g.dy > 4,
      onPanResponderMove: (_e, g) => {
        if (g.dy > 0) {
          drag.setValue(g.dy);
        }
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dy > SWIPE_CLOSE_DISTANCE) {
          Animated.timing(drag, {
            toValue: 1,
            duration: 160,
            useNativeDriver: true,
          }).start(() => {
            drag.setValue(0);
            closeZoneSheetRef.current();
          });
        } else {
          Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start();
      },
    }),
  ).current;
  // PanResponder callbacks are created once — always close through the ref.
  const closeZoneSheetRef = useRef(closeZoneSheet);
  closeZoneSheetRef.current = closeZoneSheet;

  if (!visible) {
    return null;
  }

  const translateY = Animated.add(
    enter.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }),
    drag.interpolate({ inputRange: [0, 1], outputRange: [0, height] }),
  );

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
    <View style={styles.wrap} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.sheet,
          {
            height,
            backgroundColor: theme.bgSurface,
            borderColor: theme.borderSubtle,
            transform: [{ translateY }],
          },
        ]}>
        <View {...panResponder.panHandlers}>
          <View style={styles.grabberRow}>
            <View
              style={[styles.grabber, { backgroundColor: theme.borderSubtle }]}
            />
          </View>
          <View style={styles.titleRow}>
            <Text
              numberOfLines={1}
              style={[
                styles.title,
                { color: theme.textPrimary, fontFamily: theme.fontHead },
              ]}>
              {item.title}
            </Text>
            <Pressable
              onPress={closeZoneSheet}
              hitSlop={8}
              style={({ pressed }) => [
                styles.closeBtn,
                { backgroundColor: pressed ? theme.bgHover : 'transparent' },
              ]}>
              <X size={16} color={theme.textSecondary} />
            </Pressable>
          </View>
        </View>
        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          <ZoneInfo item={zone} />
          <View
            style={[
              styles.window,
              {
                backgroundColor: theme.bgElevated,
                borderColor: theme.borderSubtle,
              },
            ]}>
            <View
              style={[styles.windowDot, { backgroundColor: theme.success }]}
            />
            <View style={styles.windowBody}>
              <Text style={[styles.windowTitle, { color: theme.textPrimary }]}>
                {endDate ? `Until ${endDate}` : 'Indefinite'}
              </Text>
              <Text
                style={[
                  styles.windowSub,
                  { color: theme.textMuted, fontFamily: theme.fontMono },
                ]}>
                {endDate
                  ? 'Scheduled expiry'
                  : 'Until further notice · no expiry'}
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
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  grabberRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  grabber: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
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
