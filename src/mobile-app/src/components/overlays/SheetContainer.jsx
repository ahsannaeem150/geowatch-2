import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Pressable,

  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureDetector } from 'react-native-gesture-handler';
import { X } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useOverlay } from '../../context/OverlayContext';
import useSheetGesture from '../../hooks/useSheetGesture';
import useScrollEdge from '../../hooks/useScrollEdge';
import HandoffScrollView from './HandoffScrollView';

// Registry of the sheet body's scroll-edge trackers plus their scroll view
// refs. SheetScrollView (below) registers itself here; the container's
// handoff pan pulls the sheet closed on a body down-drag only when EVERY
// registered scroll view is pinned at its top (an empty registry = no
// scrollable body = always allow), and blocks the registered scroll views
// natively (useSheetGesture scrollRefs) so they wait for the pan.
export const SheetHandoffContext = createContext(null);

export const SheetScrollView = forwardRef(function SheetScrollView(
  { onScroll, onLayout, onContentSizeChange, ...props },
  ref,
) {
  const ctx = useContext(SheetHandoffContext);
  const registry = ctx?.registry ?? null;
  const bump = ctx?.bump ?? null;
  const edge = useScrollEdge(bump ?? undefined);
  const innerRef = useRef(null);
  useImperativeHandle(ref, () => innerRef.current);
  useEffect(() => {
    if (!registry) return undefined;
    // atTop is a stable ref across renders, so one entry per mount is enough
    // (edge state flips re-render the container via bump, not re-registry).
    const entry = { atTop: edge.atTop, ref: innerRef };
    registry.add(entry);
    if (bump) bump();
    return () => {
      registry.delete(entry);
      if (bump) bump();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registry, bump]);
  return (
    <HandoffScrollView
      ref={innerRef}
      {...props}
      scrollEnabled={edge.scrollableNow}
      scrollEventThrottle={props.scrollEventThrottle ?? 16}
      onScroll={(e) => {
        edge.onScroll(e);
        if (onScroll) onScroll(e);
      }}
      onLayout={(e) => {
        edge.onLayout(e);
        if (onLayout) onLayout(e);
      }}
      onContentSizeChange={(w, h) => {
        edge.onContentSizeChange(w, h);
        if (onContentSizeChange) onContentSizeChange(w, h);
      }}
    />
  );
});

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

  const edgeRegistry = useRef(new Set()).current;
  // Registry edges live in child SheetScrollViews — their flips (and mounts)
  // don't re-render this component on their own, so each child bumps this
  // version via the context and the handoff enable flag + scroll relations
  // below stay honest.
  const [edgeVersion, setEdgeVersion] = useState(0);
  const bumpEdges = useCallback(() => setEdgeVersion((v) => v + 1), []);
  let allAtTop = edgeVersion >= 0; // edgeVersion re-renders on registry flips
  edgeRegistry.forEach((e) => {
    if (!e.atTop.current) allAtTop = false;
  });
  const { panResponder, handoffGesture, springTo } = useSheetGesture({
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
    // Scroll-edge handoff: body down-drag closes the sheet only when the
    // sheet's scrollable content (SheetScrollView) is pinned at its top.
    handoff: {
      dragDownEnabled: allAtTop,
      scrollRefs: [...edgeRegistry].map((e) => e.ref),
      epoch: edgeVersion,
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
        <GestureDetector gesture={handoffGesture}>
          <View style={styles.body}>
            <SheetHandoffContext.Provider
              value={{ registry: edgeRegistry, bump: bumpEdges }}>
              {children}
            </SheetHandoffContext.Provider>
          </View>
        </GestureDetector>
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
