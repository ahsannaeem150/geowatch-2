import React, { useEffect, useRef } from 'react';
import {
  Animated,
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
import useSheetGesture from '../../hooks/useSheetGesture';

// Bottom sheet container: grabber handle, title row, swipe-down-to-close.
// Gesture runs on the shared engine (src/hooks/useSheetGesture.js) so every
// overlay sheet (Layers/Settings/Activity/Alerts/Saved/Support…) drags 1:1
// with the finger and closes with fling momentum exactly like the map
// PeekSheet — no more stop-then-drop timing close.
export default function SheetContainer({ overlay, children }) {
  const { theme } = useTheme();
  const { closeOverlay } = useOverlay();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const height = Math.round(
    windowHeight * (overlay.props?.heightFraction ?? 0.6),
  );

  // pos: 0 = resting (open), height = fully off-screen (dismissed).
  const pos = useRef(new Animated.Value(height)).current;
  const heightRef = useRef(height);
  heightRef.current = height;
  const closeRef = useRef(() => {});
  closeRef.current = () => closeOverlay(overlay.id);

  const { panResponder, springTo } = useSheetGesture({
    pos,
    getClamp: () => ({ top: 0, bottom: heightRef.current }),
    getRestTy: () => 0,
    chooseTarget: ({ dy, vyMs, projected }) => {
      const H = heightRef.current;
      const flickDown = vyMs > 1.0 && dy > 10;
      if (flickDown || projected > H * 0.35) {
        // Slide all the way off WITH the finger's velocity, then close —
        // the user sees the full exit motion instead of a timing-cut.
        return { ty: H, onDone: () => closeRef.current() };
      }
      return { ty: 0 };
    },
  });

  // Entry: rise from off-screen once mounted.
  useEffect(() => {
    springTo(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hideHeader = overlay.props?.hideHeader;
  const topRadius = overlay.props?.topRadius ?? 18;

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
            borderTopLeftRadius: topRadius,
            borderTopRightRadius: topRadius,
            transform: [{ translateY: pos }],
          },
        ]}>
        {hideHeader ? null : (
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
        )}
        <View style={styles.body}>{children}</View>
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
