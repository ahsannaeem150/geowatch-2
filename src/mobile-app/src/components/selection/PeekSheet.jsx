import React, { useEffect, useRef, useState } from 'react';
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
import { GestureDetector } from 'react-native-gesture-handler';
import { ChevronDown, ChevronLeft, ChevronUp } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useMap } from '../../context/MapContext';
import { useSelection } from '../../context/SelectionContext';
import useSheetGesture from '../../hooks/useSheetGesture';
import useScrollEdge from '../../hooks/useScrollEdge';
import HandoffScrollView from '../overlays/HandoffScrollView';
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
    origin,
    expandFromPeek,
    collapsePeek,
    collapseToPeek,
    closeEvidence,
    closePreview,
    evidenceUpdate,
    evidenceFrom,
    sheetLevelRef,
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
  // Keep the context's live detent ref in sync — closeEvidence reads it to
  // return to the detail at the SAME detent the user left evidence at.
  useEffect(() => {
    if (sheetLevelRef) sheetLevelRef.current = level;
  }, [level, sheetLevelRef]);
  const pos = useRef(new Animated.Value(hiddenTy)).current;
  const wantOpen = useRef(true);

  const targetTy =
    view === 'drawer'
      ? 0
      : view === 'evidence'
        ? level === 'full'
          ? 0
          : halfTy
        : halfTy;

  // Scroll-edge trackers for the nested-scroll handoff: the body capture
  // responder below only steals a drag when the visible pane's ScrollView is
  // pinned at the edge the gesture would cross (Google Maps pattern).
  // tailPad is assigned at render time next to halfBottomPad below.
  const detailEdge = useScrollEdge();
  const eviEdge = useScrollEdge();
  const itemId = item?.id;
  useEffect(() => {
    detailEdge.reset();
    eviEdge.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  // The pan responder is created once, so it reads live state through this
  // ref — stale closures were the source of the grabber jumpiness.
  const live = useRef({});
  live.current = {
    view,
    level,
    halfTy,
    hiddenTy,
    origin,
    evidenceFrom,
    inEvidence,
    detailEdge,
    eviEdge,
    expandFromPeek,
    collapsePeek,
    collapseToPeek,
    closeEvidence,
    closePreview,
  };

  // Open / detent-change / close animations. If the change came from a
  // fling release, the spring inherits the finger's release velocity
  // (pendingVy) so the sheet never visibly "stops then re-accelerates".
  useEffect(() => {
    if (active) {
      wantOpen.current = true;
      // Level tracks the detent on EVERY active run — not only on mount.
      // Keeping it inside the !mounted branch left it stale ('half') after a
      // drag to full, so the next down-swipe was read as "half → dismiss"
      // and the sheet fell straight to the pill.
      setLevel(targetTy === 0 ? 'full' : 'half');
      if (!mounted) {
        // Mount FIRST at the hidden position and return — the effect re-runs
        // (deps include `mounted`) and starts the entry spring on the already
        // attached view. Starting the spring in the same pass as setMounted
        // fired it on an unmounted view and then restarted it a frame later,
        // which was the visible jump/glitch on the pill → sheet handoff.
        pos.setValue(hiddenTy);
        setMounted(true);
        return;
      }
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

  // Safety net: a reverse animation interrupted by the sheet unmounting (or
  // by a new selection) never fires its completion callback, which used to
  // leave bodyAnim stuck near 1 — detail pane invisible and an EMPTY white
  // evidence overlay on top (every sheet opened afterwards rendered blank
  // white until an app restart). Whenever there is no live evidence context,
  // snap the cross-slide back to the detail pane unconditionally.
  useEffect(() => {
    if (!inEvidence && !evidenceUpdate) {
      bodyAnim.stopAnimation();
      bodyAnim.setValue(0);
      setShowEvidence(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inEvidence, evidenceUpdate, itemId]);

  // Shared gesture engine (src/hooks/useSheetGesture.js) — the reference
  // implementation every sheet in the app uses. launchedTy lets the detent
  // effect above skip re-firing a spring the gesture release already
  // launched (double-push glitch on heavy screens).
  const { panResponder, handoffGesture, pendingVy, launchedTy } =
    useSheetGesture({
      pos,
      getClamp: () => ({ top: 0, bottom: live.current.hiddenTy }),
      getRestTy: () => (live.current.level === 'full' ? 0 : live.current.halfTy),
      // Scroll-edge handoff: at FULL detent with the pane scrolled to its top,
      // a down-drag on the body pulls the sheet down; at HALF with the pane
      // scrolled to its end, an up-drag expands the sheet. Between the edges
      // the pane scrolls natively.
      handoff: {
        // At FULL + pane top a down-drag steps to half; at HALF + pane top it
        // continues to the pill (Google Maps: dragging down past the content
        // top always moves the sheet one detent down).
        canDragDown: () => {
          const s = live.current;
          if (s.level !== 'full' && s.level !== 'half') return false;
          const e = s.inEvidence ? s.eviEdge : s.detailEdge;
          return e.atTop.current;
        },
        canDragUp: () => {
          const s = live.current;
          if (s.level !== 'half') return false;
          const e = s.inEvidence ? s.eviEdge : s.detailEdge;
          return e.atEnd.current;
        },
      },
      chooseTarget: ({ dy, vyMs, projected, restTy }) => {
      const s = live.current;
      const H = s.halfTy;
      // A clear flick snaps in its direction even over a short distance —
      // projection handles long drags, this handles fast short swipes.
      const flickUp = vyMs < -1.0 && dy < -10;
      const flickDown = vyMs > 1.0 && dy > 10;
      if (s.view === 'evidence') {
        // Evidence obeys the SAME detents as the detail view: full → half,
        // half → pill. The pill keeps evidenceUpdate mounted, so a pill tap
        // restores the evidence panel exactly where the user left it.
        if (restTy === 0) {
          if (flickDown || projected > H * 0.45) {
            return { ty: H, after: () => setLevel('half') };
          }
          return { ty: 0 };
        }
        if (flickDown || projected > H + (s.hiddenTy - H) * 0.35) {
          return {
            ty: s.hiddenTy,
            after: s.collapsePeek,
            onDone: () => {
              if (!wantOpen.current) setMounted(false);
            },
          };
        }
        if (flickUp || projected < H * 0.5) {
          return { ty: 0, after: () => setLevel('full') };
        }
        return { ty: restTy };
      }
      if (s.level === 'full') {
        if (flickDown || projected > H * 0.45) {
          return { ty: H, after: s.collapseToPeek };
        }
        return { ty: 0 };
      }
      if (flickDown || projected > H + (s.hiddenTy - H) * 0.35) {
        // Collapse IMMEDIATELY: the sheet keeps sliding down and fading. A
        // PREVIEW (origin set — directory/profile) exits straight back to its
        // list instead of resting as a pill; a plain map selection collapses
        // to the pill as before. The detent effect skips its duplicate spring
        // (launchedTy), so the unmount rides on THIS spring's completion.
        return {
          ty: s.hiddenTy,
          after: s.origin ? s.closePreview : s.collapsePeek,
          onDone: () => {
            if (!wantOpen.current) setMounted(false);
          },
        };
      }
      if (flickUp || projected < H * 0.55) {
        return { ty: 0, after: s.expandFromPeek };
      }
      return { ty: restTy };
    },
  });

  if (!mounted || !item) {
    return null;
  }

  // Bottom padding, derived analytically from the sheet geometry. The body
  // ScrollView's bottom sits at (windowHeight + targetTy - insets.bottom), so
  // the off-screen overflow is exactly targetTy - insets.bottom. Pad by that
  // overflow plus the floating tab bar (62 + inset) which only overlays the
  // sheet at HALF — at full the sheet covers it, so no allowance there.
  // The old fixed formula (halfTy + 62 + inset + 16) overshot the real
  // overflow, leaving a long dead tail the user could fling into (~20% empty
  // screen), and its matching tailPad fired the expand handoff ~1300px before
  // the real content end. Both now use the exact numbers, and because the pad
  // is keyed to the COMMITTED detent it swaps at gesture release — the
  // content-size change hides inside the sheet's own spring instead of
  // flicking after the sheet settles.
  const atFull = targetTy === 0;
  const tailAllowance = atFull ? 16 : 62 + insets.bottom + 16;
  const offscreenTail = Math.max(0, targetTy - insets.bottom);
  const halfBottomPad = offscreenTail + tailAllowance;
  // Scrolling into the visible tail (pad minus the off-screen part) already
  // feels like "the end" — the handoff fires there, not far early.
  detailEdge.tailPad.current = tailAllowance;
  eviEdge.tailPad.current = tailAllowance;
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
        <GestureDetector gesture={handoffGesture}>
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
            <HandoffScrollView
              handoffGesture={handoffGesture}
              style={styles.body}
              contentContainerStyle={{ paddingBottom: halfBottomPad }}
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={detailEdge.onScroll}
              onLayout={detailEdge.onLayout}
              onContentSizeChange={detailEdge.onContentSizeChange}>
              {isZone ? <ZoneBody item={item} /> : <DrawerBody item={item} />}
            </HandoffScrollView>
          </Animated.View>
          {showEvidence && evidenceUpdate ? (
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
                handoffGesture={handoffGesture}
                scrollHandlers={{
                  onScroll: eviEdge.onScroll,
                  onLayout: eviEdge.onLayout,
                  onContentSizeChange: eviEdge.onContentSizeChange,
                }}
              />
            </Animated.View>
          ) : null}
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
