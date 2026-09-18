import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
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
import { severityOf } from './PreviewCard';

// Selection pill (prototype #sel-pill): compact bar shown when the peek /
// drawer / zone sheet collapses. Tap → full details (expandSelection).
export default function SelectionPill() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { view, item, isGhost, expandFromPill } = useSelection();
  const { selectedKind } = useMap();
  const visible = view === 'pill' && !!item;
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      enter.setValue(0);
      Animated.timing(enter, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, enter]);

  if (!visible) {
    return null;
  }

  const color =
    selectedKind === 'zone'
      ? item.zone_category_color || theme.accentLight
      : theme[`sev${severityOf(item)}`];
  const cat = (
    (selectedKind === 'zone'
      ? item.zone_category_name
      : item.category_name || item.domain_name) || '—'
  ).toUpperCase();
  const d = item.start_date ? parseISO(item.start_date) : null;
  const ago = d && isValid(d) ? `${formatDistanceToNow(d)} ago` : '';
  // ghostSelected(): out-of-range selection gets a suffix chip next to the
  // (truncating) title so it stays visible.

  return (
    <Animated.View
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
              {ago ? ` · ${ago}` : ''}
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
