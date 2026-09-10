import React, { useEffect, useRef } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useOverlay } from '../../context/OverlayContext';

const SWIPE_CLOSE_DISTANCE = 60;

// Bottom sheet container: grabber handle, title row, swipe-down-to-close
// (>60px drag on the head/grabber closes, mirroring the prototype).
export default function SheetContainer({ overlay, children }) {
  const { theme } = useTheme();
  const { closeOverlay } = useOverlay();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const height = Math.round(
    windowHeight * (overlay.props?.heightFraction ?? 0.6),
  );

  const enter = useRef(new Animated.Value(height)).current;
  const drag = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 0,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [enter]);

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
            toValue: height,
            duration: 160,
            useNativeDriver: true,
          }).start(() => closeOverlay(overlay.id));
        } else {
          Animated.spring(drag, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start();
      },
    }),
  ).current;

  const translateY = Animated.add(enter, drag);

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.sheet,
          {
            height,
            paddingBottom: insets.bottom,
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
              style={[
                styles.title,
                { color: theme.textPrimary, fontFamily: theme.fontHead },
              ]}>
              {overlay.props?.title}
            </Text>
            <Pressable
              onPress={() => closeOverlay(overlay.id)}
              hitSlop={8}
              style={({ pressed }) => [
                styles.closeBtn,
                { backgroundColor: pressed ? theme.bgHover : 'transparent' },
              ]}>
              <X size={16} color={theme.textSecondary} />
            </Pressable>
          </View>
          {overlay.props?.meta ? (
            <View style={styles.metaRow}>
              <Text
                style={[
                  styles.meta,
                  { color: theme.textMuted, fontFamily: theme.fontMono },
                ]}>
                {overlay.props.meta}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.body}>{children}</View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
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
  metaRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  meta: {
    fontSize: 9.5,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  body: {
    flex: 1,
  },
});
