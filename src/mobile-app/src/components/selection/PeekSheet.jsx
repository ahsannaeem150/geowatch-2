import React, { useEffect, useRef, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, ChevronLeft, ChevronUp } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useMap } from '../../context/MapContext';
import { useSelection } from '../../context/SelectionContext';
import { ZoneBody } from './ZoneSheet';
import { DrawerBody } from './IncidentDrawer';
import { EvidenceBody } from './EvidencePanel';

// Multi-detent bottom sheet (replaces the old peek → fullscreen-page jump):
//   peek (half, ~46%) → drag up / chevron → full (~94%) with the COMPLETE
//   detail (incident: description/actions/timeline; zone: stats/window/
//   restriction timeline) inline; INSPECT on a timeline node switches the
//   sheet body to the evidence sub-view in place (← returns to the detail).
//   Drag down walks full → half → pill.
// Evidence opens at the CURRENT detent — it never forces full on its own.
// Incidents AND zones share this sheet (zones are mode-independent); only
// DIRECT-mode incidents keep the fullscreen IncidentDrawer/EvidencePanel.
export default function PeekSheet() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    view,
    item,
    selMode,
    expandFromPeek,
    collapsePeek,
    collapseToPeek,
    closeEvidence,
    evidenceUpdate,
    evidenceFrom,
  } = useSelection();
  const { selectedKind } = useMap();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const fullH = Math.round(windowHeight - insets.top - 8);
  const halfVisible = Math.round(windowHeight * 0.46);
  const halfTy = fullH - halfVisible;
  const hiddenTy = fullH;

  const isZone = selectedKind === 'zone';
  const sheetActive = isZone
    ? view === 'peek' || view === 'drawer' || view === 'evidence'
    : view === 'peek' ||
      ((view === 'drawer' || view === 'evidence') && selMode !== 'direct');
  const active = !!item && sheetActive;
  const inEvidence = view === 'evidence';

  const [mounted, setMounted] = useState(active);
  const [level, setLevel] = useState('half');
  const pos = useRef(new Animated.Value(hiddenTy)).current;
  const startTy = useRef(halfTy);
  const pendingVy = useRef(0);
  const wantOpen = useRef(true);
  // Target of the spring launched by the gesture release, if any. When the
  // follow-up context update re-runs the open/detent effect with the SAME
  // target, restarting the spring there would visibly re-accelerate the sheet
  // (the effect can fire hundreds of ms later on heavy screens like Power
  // Search) — so the effect skips the duplicate and lets the in-flight
  // spring finish.
  const launchedTy = useRef(null);

  const targetTy =
    view === 'drawer'
      ? 0
      : view === 'evidence'
        ? level === 'full'
          ? 0
          : halfTy
        : halfTy;

  // The pan responder is created once, so it reads live state through this
  // ref — stale closures were the source of the grabber jumpiness.
  const live = useRef({});
  live.current = {
    view,
    level,
    halfTy,
    hiddenTy,
    evidenceFrom,
    expandFromPeek,
    collapsePeek,
    collapseToPeek,
    closeEvidence,
  };

  // Open / detent-change / close animations. If the change came from a
  // fling release, the spring inherits the finger's release velocity
  // (pendingVy) so the sheet never visibly "stops then re-accelerates".
  useEffect(() => {
    if (active) {
      wantOpen.current = true;
      if (!mounted) {
        pos.setValue(hiddenTy);
      }
      // Unconditional: a queued setMounted(false) from a just-finished exit
      // spring can otherwise apply AFTER a reopen and strand the sheet
      // unmounted. With `mounted` in the deps below, that case re-runs this
      // effect and the sheet re-enters instead of disappearing for good.
      setMounted(true);
      setLevel(targetTy === 0 ? 'full' : 'half');
      if (launchedTy.current === targetTy) {
        // The gesture release already started this exact spring — don't
        // restart it late (double-push glitch).
        launchedTy.current = null;
        pendingVy.current = 0;
        return;
      }
      Animated.spring(pos, {
        toValue: targetTy,
        damping: 22,
        stiffness: 220,
        mass: 0.9,
        velocity: pendingVy.current,
        overshootClamping: true,
        useNativeDriver: true,
      }).start();
      pendingVy.current = 0;
    } else if (mounted) {
      wantOpen.current = false;
      if (launchedTy.current === hiddenTy) {
        launchedTy.current = null;
        pendingVy.current = 0;
        return;
      }
      Animated.spring(pos, {
        toValue: hiddenTy,
        damping: 26,
        stiffness: 260,
        mass: 0.9,
        velocity: pendingVy.current,
        useNativeDriver: true,
      }).start(() => {
        if (!wantOpen.current) setMounted(false);
      });
      pendingVy.current = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, targetTy, mounted]);

  // Detail ↔ evidence cinematic cross-slide: progress 0 = detail, 1 =
  // evidence. Detail parallax-slides left + fades out while evidence slides
  // in from the right; back plays the exact reverse. The detail body stays
  // MOUNTED underneath during evidence (scroll position + fetched data kept).
  const bodyAnim = useRef(new Animated.Value(inEvidence ? 1 : 0)).current;
  const [showEvidence, setShowEvidence] = useState(inEvidence);
  useEffect(() => {
    if (inEvidence) {
      setShowEvidence(true);
      Animated.timing(bodyAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (showEvidence) {
      Animated.timing(bodyAnim, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setShowEvidence(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inEvidence, bodyAnim]);

  const springTo = (ty, velocity = 0, onDone) =>
    Animated.spring(pos, {
      toValue: ty,
      damping: 22,
      stiffness: 260,
      mass: 0.9,
      velocity,
      overshootClamping: true,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && onDone) onDone();
    });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dy) > 3 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        // Fire-and-forget stop (NO callback wait — that native round-trip
        // was the ~1s response delay), then switch to RELATIVE dragging:
        // extractOffset folds the current on-screen position into the offset
        // so setValue(dy) tracks the finger 1:1 with zero bridge latency.
        // __getValue() (NOT a listener-synced ref) is the source of truth:
        // native-driver listener forwarding silently drops updates across a
        // dismiss/reopen cycle, which used to freeze down-drags from full.
        pos.stopAnimation();
        startTy.current = pos.__getValue();
        pendingVy.current = 0;
        pos.extractOffset();
      },
      onPanResponderMove: (_e, g) => {
        const abs = startTy.current + g.dy;
        // resist past the full detent, clamp past the hidden offset
        const clamped =
          abs < 0 ? abs * 0.3 : Math.min(abs, live.current.hiddenTy);
        pos.setValue(clamped - startTy.current);
      },
      onPanResponderRelease: (_e, g) => {
        const s = live.current;
        pos.flattenOffset(); // merge offset back → absolute value again
        const restTy = s.level === 'full' ? 0 : s.halfTy;
        const H = s.halfTy;
        // A plain tap / tiny jitter must NEVER change the detent — a quick
        // tap can carry a big velocity spike, which used to dismiss the
        // sheet. Velocity only counts when the finger actually travelled.
        if (Math.abs(g.dy) < 12 && Math.abs(g.vy) < 0.75) {
          pendingVy.current = 0;
          springTo(restTy);
          return;
        }
        // Clamp the inherited velocity (px/ms), then convert to px/s for
        // RN springs — SpringAnimation's frame time is in SECONDS (unlike
        // decay which uses ms), so a raw g.vy is ~1000x too small.
        const vyMs = Math.max(-3.5, Math.min(3.5, g.vy));
        const vy = vyMs * 1000;
        const endTy = Math.max(
          0,
          Math.min(startTy.current + g.dy, s.hiddenTy),
        );
        const projected = endTy + vyMs * 220; // ~220ms of coast
        // A clear flick snaps in its direction even over a short distance —
        // projection handles long drags, this handles fast short swipes.
        const flickUp = vyMs < -1.0 && g.dy < -10;
        const flickDown = vyMs > 1.0 && g.dy > 10;

        // Decide the target detent + any state change. THE KEY: the spring
        // starts RIGHT HERE with the finger's velocity (motion never stops),
        // and the context update happens after — when it re-renders and the
        // effect re-fires a spring to the SAME target, pendingVy hands the
        // velocity over so the restart is invisible.
        let target = restTy;
        let after = null;
        if (s.view === 'evidence') {
          const backTy = s.evidenceFrom === 'drawer' ? 0 : H;
          if (flickDown || projected > restTy + 120) {
            target = backTy;
            after = s.closeEvidence;
          } else if ((flickUp || projected < H * 0.5) && restTy !== 0) {
            target = 0;
            after = () => setLevel('full');
          }
        } else if (s.level === 'full') {
          if (flickDown || projected > H * 0.45) {
            target = H;
            after = s.collapseToPeek;
          } else {
            target = 0;
          }
        } else if (flickDown || projected > H + (s.hiddenTy - H) * 0.35) {
          // Collapse IMMEDIATELY: the pill springs in while this sheet keeps
          // sliding down and fading — overlapping motion, no vanish-then-pop.
          target = s.hiddenTy;
          after = s.collapsePeek;
        } else if (flickUp || projected < H * 0.55) {
          target = 0;
          after = s.expandFromPeek;
        }
        pendingVy.current = vy;
        launchedTy.current = target;
        // Dismiss: the effect skips its duplicate spring, so the unmount must
        // ride on THIS spring's completion instead.
        springTo(
          target,
          vy,
          target === s.hiddenTy
            ? () => {
                if (!wantOpen.current) setMounted(false);
              }
            : undefined,
        );
        if (after) {
          after();
        }
      },
      onPanResponderTerminate: () => {
        const s = live.current;
        pos.flattenOffset();
        springTo(s.level === 'full' ? 0 : s.halfTy);
      },
    }),
  ).current;

  if (!mounted || !item) {
    return null;
  }

  const halfBottomPad = level === 'half' ? halfTy + 16 : 16;
  const detailTranslate = bodyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -windowWidth * 0.35],
  });
  const detailOpacity = bodyAnim.interpolate({
    inputRange: [0, 0.7],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const evidenceTranslate = bodyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [windowWidth, 0],
  });
  const evidenceOpacity = bodyAnim.interpolate({
    inputRange: [0.15, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  // Subtle fade as the sheet travels below the half detent toward dismissal,
  // so it visually hands off to the incoming pill instead of hard-cutting.
  const sheetOpacity = pos.interpolate({
    inputRange: [halfTy, hiddenTy],
    outputRange: [1, 0.25],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.sheet,
          {
            height: fullH,
            paddingBottom: insets.bottom,
            backgroundColor: theme.bgSurface,
            borderColor: theme.borderSubtle,
            transform: [{ translateY: pos }],
            opacity: sheetOpacity,
          },
        ]}>
        <View
          {...panResponder.panHandlers}
          style={[
            styles.head,
            inEvidence ? styles.headEvidence : null,
          ]}>
          <View style={styles.grabberRow}>
            <View
              style={[styles.grabber, { backgroundColor: theme.borderSubtle }]}
            />
          </View>
          {inEvidence ? (
            <Pressable
              onPress={closeEvidence}
              hitSlop={10}
              style={({ pressed }) => [
                styles.headBtn,
                styles.headBtnLeft,
                { backgroundColor: pressed ? theme.bgHover : theme.bgElevated },
              ]}>
              <ChevronLeft size={16} color={theme.textSecondary} />
            </Pressable>
          ) : (
            <Pressable
              onPress={level === 'full' ? collapseToPeek : expandFromPeek}
              hitSlop={10}
              style={({ pressed }) => [
                styles.headBtn,
                { backgroundColor: pressed ? theme.bgHover : theme.bgElevated },
              ]}>
              {level === 'full' ? (
                <ChevronDown size={16} color={theme.textSecondary} />
              ) : (
                <ChevronUp size={16} color={theme.textSecondary} />
              )}
            </Pressable>
          )}
          {inEvidence ? (
            <Text
              style={[
                styles.headTitle,
                { color: theme.textMuted, fontFamily: theme.fontMono },
              ]}
              numberOfLines={1}>
              UPDATE EVIDENCE
            </Text>
          ) : null}
        </View>
        <View style={styles.bodyWrap}>
          <Animated.View
            pointerEvents={inEvidence ? 'none' : 'auto'}
            style={[
              styles.bodyFill,
              {
                transform: [{ translateX: detailTranslate }],
                opacity: detailOpacity,
              },
            ]}>
            <ScrollView
              style={styles.body}
              contentContainerStyle={{ paddingBottom: halfBottomPad }}
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}>
              {isZone ? <ZoneBody item={item} /> : <DrawerBody item={item} />}
            </ScrollView>
          </Animated.View>
          {showEvidence ? (
            <Animated.View
              pointerEvents={inEvidence ? 'auto' : 'none'}
              style={[
                styles.bodyOverlay,
                {
                  backgroundColor: theme.bgSurface,
                  transform: [{ translateX: evidenceTranslate }],
                  opacity: evidenceOpacity,
                },
              ]}>
              <EvidenceBody
                key={evidenceUpdate?.id}
                bottomPad={halfBottomPad}
              />
            </Animated.View>
          ) : null}
        </View>
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
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  head: {
    paddingTop: 6,
    paddingBottom: 8,
  },
  // Evidence mode adds a button+title row under the grabber (absolutely
  // positioned at top:30/39), so the head needs room for it.
  headEvidence: {
    paddingBottom: 30,
  },
  grabberRow: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  grabber: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  headBtn: {
    position: 'absolute',
    right: 14,
    top: 4,
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headBtnLeft: {
    right: undefined,
    left: 14,
    // Evidence header sits BELOW the grabber row (grabber band ends ~y=35)
    // so the back button and title never overlap the grabber handle.
    top: 30,
  },
  headTitle: {
    position: 'absolute',
    left: 54,
    right: 54,
    top: 39,
    textAlign: 'center',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  bodyWrap: {
    flex: 1,
  },
  bodyFill: {
    flex: 1,
  },
  bodyOverlay: {
    ...StyleSheet.absoluteFill,
  },
  body: {
    flex: 1,
  },
});
