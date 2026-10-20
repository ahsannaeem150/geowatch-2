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

  // Bottom content pad that TRACKS the sheet's live position. The pad is
  // (off-screen sheet tail) + (tab-bar clearance): the tab bar (zIndex 60)
  // overlays the sheet's bottom at BOTH detents, so the content end should
  // rest just above the tab bar's top edge. Keying the pad to the committed
  // detent used to swap it in one shot at gesture release — Android then
  // clamped the scroll offset instantly and the content SNAPPED (the flick
  // on half→full expands). Tracking pos instead makes the pad shrink in sync
  // with the sheet's rise, so the upper content reveals smoothly and the end
  // update stays glued in place the whole way. pad = pos + 62 keeps the end
  // pinned at y = fullH - 62 (tab bar's top edge) at every sheet position.
  //
  // The listener is reliable ONLY because every pos animation runs on the JS
  // thread (jsSprings in useSheetGesture + useNativeDriver:false below): a
  // JS-driven value's listener fires synchronously every frame, so pad and
  // pos commit in the same batch — no cross-thread race. With native-driven
  // pos the listener's updates arrived coalesced (bursts with 100-170ms
  // gaps → the scroll offset clamped in visible jumps) and the listener
  // silently DIED after an unmount/remount cycle (pad stuck at a stale
  // value → runaway scroll into the pad, or a mis-measured non-scrollable
  // body — all verified on-device). Do not reintroduce native springs here.
  const padAnim = useRef(new Animated.Value(hiddenTy + 62)).current;
  useEffect(() => {
    const applyPad = (v) => padAnim.setValue(Math.max(0, v + 62));
    applyPad(pos.__getValue());
    const sub = pos.addListener(({ value }) => applyPad(value));
    return () => pos.removeListener(sub);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos]);

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
  // relEpoch bumps on every edge flip so the handoff pans re-resolve their
  // scroll-view relation AFTER a freshly mounted pane's ref has attached
  // (at the mount render eviScrollRef is still null, so the first relation
  // would silently miss the evidence ScrollView — the scrollable flip fires
  // one commit later, once onLayout/onContentSizeChange have run).
  const [relEpoch, bumpRelEpoch] = useState(0);
  // Refs to the panes' HandoffScrollViews — the handoff pans block these
  // natively (useSheetGesture scrollRefs) so the scroll waits for the pan,
  // and useScrollEdge re-pins a stale offset through them when the animated
  // bottom pad shrinks the content mid-fling. Declared before the edge hooks
  // (TDZ) since they are passed straight in.
  const detailScrollRef = useRef(null);
  const eviScrollRef = useRef(null);
  const detailEdge = useScrollEdge(
    () => bumpRelEpoch((c) => c + 1),
    detailScrollRef,
  );
  const eviEdge = useScrollEdge(
    () => bumpRelEpoch((c) => c + 1),
    eviScrollRef,
  );
  const itemId = item?.id;
  useEffect(() => {
    detailEdge.reset();
    eviEdge.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  // The evidence pane UNMOUNTS when it slides out (showEvidence) — e.g. on a
  // collapse to the pill — and remounts fresh (scroll offset 0) on restore.
  // A fresh ScrollView emits no onScroll at offset 0, so without this resync
  // the edge tracker keeps the pre-unmount offset and atTopNow stays stuck
  // false (dead down-drag handoff after a pill restore — verified on-device).
  useEffect(() => {
    if (inEvidence) eviEdge.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inEvidence, evidenceUpdate?.id]);

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
        padAnim.setValue(hiddenTy + 62);
        setMounted(true);
        return;
      }
      // Skip when the gesture release already launched this exact spring
      // (launchedTy) OR when the sheet is already AT the target — the detent
      // effect's render→effect pass (~250ms on this heavy screen) can lose
      // the race to the gesture spring's completion, which clears launchedTy;
      // the late effect then fired a duplicate spring with the stale
      // pendingVy, which was the visible land-then-jolt glitch on scroll
      // handoffs. pos≈target means there is genuinely nothing to animate.
      if (
        launchedTy.current === targetTy ||
        Math.abs(pos.__getValue() - targetTy) < 1
      ) {
        // Gesture-driven skips own the pad spring already; the pos≈target
        // path can still hold a stale pad (e.g. after a dev reload) — snap
        // it to the committed detent.
        if (
          launchedTy.current !== targetTy &&
          Math.abs(padAnim.__getValue() - (targetTy + 62)) > 1
        ) {
          padAnim.setValue(Math.max(0, targetTy + 62));
        }
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
        useNativeDriver: false,
      }).start();
      pendingVy.current = 0;
    } else if (mounted) {
      wantOpen.current = false;
      // Same late-effect race guard as the open branch above. Two cases:
      // - the gesture spring owns the slide (launchedTy) — its completion
      //   commits the state change (deferred after), which re-runs this
      //   effect and lands in the second case;
      // - the slide already finished (pos≈hidden, nothing owns it) — unmount
      //   right here. This case OWNS the unmount: the gesture's deferred
      //   after only commits the view state, so without it a dismissed sheet
      //   would stay mounted invisibly off-screen.
      if (launchedTy.current === hiddenTy) {
        launchedTy.current = null;
        pendingVy.current = 0;
        return;
      }
      if (Math.abs(pos.__getValue() - hiddenTy) < 1) {
        if (Math.abs(padAnim.__getValue() - (hiddenTy + 62)) > 1) {
          padAnim.setValue(hiddenTy + 62);
        }
        pendingVy.current = 0;
        setMounted(false);
        return;
      }
      Animated.spring(pos, {
        toValue: hiddenTy,
        damping: 26,
        stiffness: 260,
        mass: 0.9,
        velocity: pendingVy.current,
        useNativeDriver: false,
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
      // JS-thread springs keep the listener-synced bottom pad frame-locked
      // to the sheet (see the padAnim comment above).
      jsSprings: true,
      getClamp: () => ({ top: 0, bottom: live.current.hiddenTy }),
      getRestTy: () => (live.current.level === 'full' ? 0 : live.current.halfTy),
      // Scroll-edge handoff: at FULL detent with the pane scrolled to its top,
      // a down-drag on the body pulls the sheet down; at HALF with the pane
      // scrolled to its end, an up-drag expands the sheet. Between the edges
      // the pane scrolls natively.
      handoff: {
        // Render-time enable flags (see useSheetGesture): at FULL or HALF
        // with the pane scrolled to its top, a body down-drag steps the
        // sheet down; at HALF with the pane scrolled to its end, an up-drag
        // expands it. Between the edges the pane scrolls natively.
        dragDownEnabled:
          (level === 'full' || level === 'half') &&
          (inEvidence ? eviEdge.atTopNow : detailEdge.atTopNow),
        dragUpEnabled:
          level === 'half' &&
          (inEvidence ? eviEdge.atEndNow : detailEdge.atEndNow),
        scrollRefs: [detailScrollRef, eviScrollRef],
        epoch: `${inEvidence ? 'e' : 'd'}${relEpoch}`,
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
          return { ty: s.hiddenTy, after: s.collapsePeek };
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
        // to the pill as before. The commit (after) fires at this spring's
        // completion; the detent effect then lands on pos≈hidden and unmounts.
        return {
          ty: s.hiddenTy,
          after: s.origin ? s.closePreview : s.collapsePeek,
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

  // Scrolling into the visible tail (the pad's on-screen part) already feels
  // like "the end" — the handoff fires there, not far early. The pad itself
  // is the animated padAnim spacer above (tracks the live sheet position).
  detailEdge.tailPad.current = 62 + insets.bottom;
  eviEdge.tailPad.current = 62 + insets.bottom;
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
              ref={detailScrollRef}
              style={styles.body}
              showsVerticalScrollIndicator={false}
              scrollEnabled={detailEdge.scrollableNow}
              scrollEventThrottle={16}
              onScroll={detailEdge.onScroll}
              onLayout={detailEdge.onLayout}
              onContentSizeChange={detailEdge.onContentSizeChange}>
              {isZone ? <ZoneBody item={item} /> : <DrawerBody item={item} />}
              <Animated.View style={{ height: padAnim }} />
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
                bottomPad={padAnim}
                scrollRef={eviScrollRef}
                scrollHandlers={{
                  scrollEnabled: eviEdge.scrollableNow,
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
