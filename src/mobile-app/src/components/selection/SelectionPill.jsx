import React, { useEffect, useRef } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { useTheme } from '../../context/ThemeContext';
import { useMap } from '../../context/MapContext';
import { useSelection } from '../../context/SelectionContext';
import { useOverlay } from '../../context/OverlayContext';
import { formatKm2, severityOf } from './PreviewCard';

// Selection pill (prototype #sel-pill): compact bar shown when the peek /
// drawer / zone sheet collapses. Tap → full details (expandSelection).
export default function SelectionPill() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { view, item, isGhost, expandFromPill, origin } = useSelection();
  const { selectedKind } = useMap();
  const { stack } = useOverlay();
  // Power Search owns the screen (and its own result sheet) — the map's
  // selection pill must not linger on top of it. Same for any open overlay
  // (Incidents/Activity/Alerts tabs, drawers, sheets): a PLAIN map
  // selection's pill belongs to the map and leaves with it. Preview pills
  // (origin set) stay — they are how the user reopens a dismissed preview.
  const psOpen = stack.some((o) => o.id === 'powerSearch');
  const coveredByOverlay = !origin && stack.length > 0;
  const visible = view === 'pill' && !!item && !psOpen && !coveredByOverlay;
  const [mounted, setMounted] = React.useState(visible);
  const enter = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      enter.setValue(0);
      Animated.spring(enter, {
        toValue: 1,
        damping: 22,
        stiffness: 240,
        mass: 0.9,
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      // Slightly longer exit (240ms) so the rising sheet overtakes the pill
      // mid-motion — a 160ms pop-out left a visible gap at the bottom.
      Animated.timing(enter, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }).start(() => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // An upward swipe on the pill expands it too (same as tap) — claimed early
  // so a fling starting on the pill never scrolls the map underneath.
  const expandRef = useRef(expandFromPill);
  expandRef.current = expandFromPill;
  const swipeUp = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => g.dy < -12 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
      onPanResponderRelease: (_e, g) => {
        if (g.dy < -12 || g.vy < -0.4) expandRef.current();
      },
    }),
  ).current;

  if (!mounted || !item) {
    return null;
  }

  const color =
    selectedKind === 'zone'
      ? item.zone_category_color || theme.accentLight
      : theme[`sev${severityOf(item)}`];  const cat = (
    (selectedKind === 'zone'
      ? item.zone_category_name
      : item.category_name || item.domain_name) || '—'
  ).toUpperCase();
  const d = item.start_date ? parseISO(item.start_date) : null;
  const ago = d && isValid(d) ? `${formatDistanceToNow(d)} ago` : '';
  // Zone pill meta shows category · area (prototype pill is cat · time; zones
  // have no meaningful "ago" — area is the useful at-a-glance stat).
  const areaKm2 = selectedKind === 'zone' ? formatKm2(item.area_sq_m) : null;
  const detail =
    selectedKind === 'zone' ? (areaKm2 ? `${areaKm2} km²` : '') : ago;
  // ghostSelected(): out-of-range selection gets a suffix chip next to the
  // (truncating) title so it stays visible.

  return (
    <Animated.View
      {...swipeUp.panHandlers}
      style={[
        styles.pill,
        {
          bottom: insets.bottom + 96,
          backgroundColor: theme.bgGlass,
          borderColor: theme.borderSubtle,
          opacity: enter,
          transform: [
            { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [120, 0] }) },
          ],
        },
      ]}>
      <Pressable onPress={expandFromPill} style={styles.row}>
        <View style={[styles.accent, { backgroundColor: color }]} />
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text
              numberOfLines={1}
              style={[
                styles.title,
                styles.titleFlex,
                { color: theme.textPrimary },
              ]}>
              {item.title}
            </Text>
            {isGhost ? (
              <Text
                numberOfLines={1}
                style={[styles.ghostSuffix, { color: theme.textMuted }]}>
                {'  (out of current range)'}
              </Text>
            ) : null}
          </View>
          <View style={styles.meta}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text
              style={[
                styles.metaText,
                { color: theme.textMuted, fontFamily: theme.fontMono },
              ]}>
              {cat}
              {detail ? ` · ${detail}` : ''}
            </Text>
          </View>
        </View>
        <View style={[styles.expand, { backgroundColor: theme.bgHover }]}>
          <Text style={[styles.expandText, { color: theme.textSecondary }]}>
            ▴
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    left: 12,
    right: 74,
    borderRadius: 14,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  accent: {
    width: 3,
    height: 30,
    borderRadius: 2,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 3,
  },
  titleFlex: {
    flexShrink: 1,
  },
  ghostSuffix: {
    fontSize: 10,
    flexShrink: 0,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  metaText: {
    fontSize: 9,
  },
  expand: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandText: {
    fontSize: 13,
  },
});
