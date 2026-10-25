import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { ChevronDown, ChevronLeft, ChevronUp } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useMap } from '../../context/MapContext';
import { useSelection } from '../../context/SelectionContext';
import Reanimated, { useSharedValue } from 'react-native-reanimated';
import DetentSheet from '../sheets/DetentSheet';
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

  const [level, setLevel] = useState('half');
  // Keep the context's live detent ref in sync — closeEvidence reads it to
  // return to the detail at the SAME detent the user left evidence at.
  useEffect(() => {
    if (sheetLevelRef) sheetLevelRef.current = level;
  }, [level, sheetLevelRef]);
  const pos = useSharedValue(hiddenTy);

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
  // relEpoch bumps on every edge flip so the handoff pans re-resolve their
  // scroll-view relation AFTER a freshly mounted pane's ref has attached
  // (at the mount render eviScrollRef is still null, so the first relation
  // would silently miss the evidence ScrollView — the scrollable flip fires
  // one commit later, once onLayout/onContentSizeChange have run).
  const [relEpoch, bumpRelEpoch] = useState(0);
  // Refs to the panes' HandoffScrollViews — the handoff pans block these
  // natively (useReanimatedSheetGesture scrollRefs) so the scroll waits for the pan,
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

  const chooseTarget = ({ dy, vyMs, projected, restTy }) => {
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
  };

  const evidenceScrollHandlers = useMemo(
    () => ({
      scrollEnabled: eviEdge.scrollableNow,
      onScroll: eviEdge.onScroll,
      onScrollEndDrag: eviEdge.onScrollEndDrag,
      onMomentumScrollBegin: eviEdge.onMomentumScrollBegin,
      onMomentumScrollEnd: eviEdge.onMomentumScrollEnd,
      onLayout: eviEdge.onLayout,
      onContentSizeChange: eviEdge.onContentSizeChange,
    }),
    [
      eviEdge.scrollableNow,
      eviEdge.onScroll,
      eviEdge.onScrollEndDrag,
      eviEdge.onMomentumScrollBegin,
      eviEdge.onMomentumScrollEnd,
      eviEdge.onLayout,
      eviEdge.onContentSizeChange,
    ],
  );

  if (!item) {
    return null;
  }

  // tailPad stays 0 (the hook default): the expand handoff may fire ONLY at
  // the true pixel end. Any early-fire window lets the gesture start with the
  // scroll offset short of maxY, and because the bottom pad shrinks 1:1 with
  // the sheet's rise, the native clamp doesn't engage until maxY falls to the
  // stop offset — the content first rides UP with the sheet by that shortfall
  // (slow drag: visible few-px shift; fast flick: one-frame snap), then pins.
  // With the offset pinned at maxY from frame one, the clamp tracks the pad
  // shrink exactly and the content stays stationary at every speed
  // (device-verified).
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
  return (
    <DetentSheet
      active={active}
      targetTy={targetTy}
      hiddenTy={hiddenTy}
      pos={pos}
      getClamp={() => ({ top: 0, bottom: live.current.hiddenTy })}
      getRestTy={() => (live.current.level === 'full' ? 0 : live.current.halfTy)}
      chooseTarget={chooseTarget}
      dragDownEnabled={
        (level === 'full' || level === 'half') &&
        (inEvidence ? eviEdge.atTopNow : detailEdge.atTopNow)
      }
      dragUpEnabled={
        level === 'half' &&
        (inEvidence ? eviEdge.atEndNow : detailEdge.atEndNow)
      }
      scrollRefs={[detailScrollRef, eviScrollRef]}
      handoffEpoch={`${inEvidence ? 'e' : 'd'}${relEpoch}`}
      onTargetChange={() => setLevel(targetTy === 0 ? 'full' : 'half')}
      onMotionEnd={() =>
        (inEvidence ? eviEdge : detailEdge).onSheetMotionEnd()
      }
      fadeStart={halfTy}
      style={{
        height: fullH,
        paddingBottom: insets.bottom,
        backgroundColor: theme.bgSurface,
        borderColor: theme.borderSubtle,
      }}
      renderHeader={() => (
        <View
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
      )}>
      {(bottomPadStyle) => (
        <>
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
              onScrollEndDrag={detailEdge.onScrollEndDrag}
              onMomentumScrollBegin={detailEdge.onMomentumScrollBegin}
              onMomentumScrollEnd={detailEdge.onMomentumScrollEnd}
              onLayout={detailEdge.onLayout}
              onContentSizeChange={detailEdge.onContentSizeChange}>
              {isZone ? <ZoneBody item={item} /> : <DrawerBody item={item} />}
              <Reanimated.View style={bottomPadStyle} />
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
                bottomPadStyle={bottomPadStyle}
                scrollRef={eviScrollRef}
                scrollHandlers={evidenceScrollHandlers}
              />
            </Animated.View>
          ) : null}
        </>
      )}
    </DetentSheet>
  );
}

const styles = StyleSheet.create({
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
