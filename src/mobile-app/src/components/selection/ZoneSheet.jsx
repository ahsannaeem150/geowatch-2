import React, { useEffect, useRef } from 'react';
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
import { useSelection } from '../../context/SelectionContext';
import { ZoneInfo } from './PreviewCard';

const SWIPE_CLOSE_DISTANCE = 60;

// Zone sheet: 62% bottom sheet for polygon selections (any mode). Grabber
// swipe-down or ✕ → pill (plain) or peek+emb (preview), via closeZoneSheet().
export default function ZoneSheet() {
  const { theme } = useTheme();
  const { view, item, closeZoneSheet } = useSelection();
  const { height: windowHeight } = useWindowDimensions();
  const height = Math.round(windowHeight * 0.62);
  const visible = view === 'zoneSheet' && !!item;
  const enter = useRef(new Animated.Value(0)).current;
  const drag = useRef(new Animated.Value(0)).current;

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
          <ZoneInfo item={item} />
          <View
            style={[
              styles.stub,
              {
                backgroundColor: theme.bgElevated,
                borderColor: theme.borderSubtle,
              },
            ]}>
            <Text
              style={[
                styles.stubText,
                { color: theme.textMuted, fontFamily: theme.fontMono },
              ]}>
              FULL ZONE DETAILS ARRIVE IN A LATER PROMPT
            </Text>
          </View>
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
  stub: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
  },
  stubText: {
    fontSize: 9.5,
    letterSpacing: 1.2,
  },
});
