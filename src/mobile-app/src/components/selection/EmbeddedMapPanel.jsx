import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, X } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useMap } from '../../context/MapContext';
import { useSelection } from '../../context/SelectionContext';
import { locationLine, severityOf } from './PreviewCard';

const GRID_STEP = 34;

// Embedded map panel (prototype #emb-map): slides from the top over the
// origin surface during a list-driven preview. Stylized canvas (grid +
// radar rings + pin), NOT a live map — the real map stays behind.
export default function EmbeddedMapPanel() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { previewActive, item, closePreview } = useSelection();
  const { selectedKind } = useMap();
  const { width, height: windowHeight } = useWindowDimensions();
  const height = Math.round(windowHeight * 0.54);
  const visible = previewActive && !!item;
  const enter = useRef(new Animated.Value(0)).current;
  const pinDrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      enter.setValue(0);
      pinDrop.setValue(0);
      Animated.parallel([
        Animated.timing(enter, {
          toValue: 1,
          duration: 360,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(pinDrop, {
          toValue: 1,
          duration: 450,
          delay: 120,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, enter, pinDrop]);

  if (!visible) {
    return null;
  }

  const pinColor =
    selectedKind === 'zone'
      ? item.zone_category_color || theme.accentLight
      : theme[`sev${severityOf(item)}`];

  const cols = Math.ceil(width / GRID_STEP);
  const rows = Math.ceil(height / GRID_STEP);

  return (
    <Animated.View
      style={[
        styles.panel,
        {
          height,
          backgroundColor: theme.bgElevated,
          borderBottomColor: theme.borderSubtle,
          transform: [
            {
              translateY: enter.interpolate({
                inputRange: [0, 1],
                outputRange: [-height, 0],
              }),
            },
          ],
        },
      ]}>
      <View style={[styles.head, { paddingTop: insets.top + 10 }]}>
        <Pressable
          onPress={closePreview}
          hitSlop={8}
          style={[
            styles.headBtn,
            {
              backgroundColor: theme.bgGlass,
              borderColor: theme.borderSubtle,
            },
          ]}>
          <ChevronLeft size={17} color={theme.textPrimary} />
        </Pressable>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: theme.accentSubtleBg,
              borderColor: theme.accentLight,
            },
          ]}>
          <Text
            style={[
              styles.badgeText,
              { color: theme.accentLight, fontFamily: theme.fontMono },
            ]}>
            {selectedKind === 'zone' ? 'ZONE' : 'INCIDENT'}
          </Text>
        </View>
        <Text
          numberOfLines={1}
          style={[styles.loc, { color: theme.textSecondary }]}>
          {locationLine(item)}
        </Text>
        <Pressable
          onPress={closePreview}
          hitSlop={8}
          style={[styles.headBtn, { backgroundColor: theme.bgHover }]}>
          <X size={13} color={theme.textSecondary} />
        </Pressable>
      </View>
      <View style={styles.canvas}>
        {Array.from({ length: cols + 1 }).map((_, i) => (
          <View
            key={`v${i}`}
            style={[
              styles.gridV,
              { left: i * GRID_STEP, backgroundColor: theme.borderDefault },
            ]}
          />
        ))}
        {Array.from({ length: rows + 1 }).map((_, i) => (
          <View
            key={`h${i}`}
            style={[
              styles.gridH,
              { top: i * GRID_STEP, backgroundColor: theme.borderDefault },
            ]}
          />
        ))}
        <View style={styles.center} pointerEvents="none">
          <View
            style={[
              styles.ring,
              styles.ringOuter,
              { borderColor: theme.accentSubtleBorder },
            ]}
          />
          <View
            style={[styles.ring, { borderColor: theme.accentSubtleBorder }]}
          />
          <Animated.View
            style={[
              styles.pin,
              {
                opacity: pinDrop,
                transform: [
                  {
                    translateY: pinDrop.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-60, 0],
                    }),
                  },
                ],
              },
            ]}>
            <View
              style={[
                styles.pinDot,
                { backgroundColor: pinColor, shadowColor: pinColor },
              ]}
            />
            <View style={styles.pinBase} />
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 14,
    paddingBottom: 10,
    zIndex: 4,
  },
  headBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.4,
  },
  loc: {
    flex: 1,
    fontSize: 11,
  },
  canvas: {
    flex: 1,
  },
  gridV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
  },
  gridH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
  },
  ringOuter: {
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.5,
  },
  pin: {
    alignItems: 'center',
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderBottomRightRadius: 0,
    transform: [{ rotate: '-45deg' }],
    elevation: 6,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
  },
  pinBase: {
    width: 26,
    height: 8,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,.4)',
    marginTop: 4,
  },
});
