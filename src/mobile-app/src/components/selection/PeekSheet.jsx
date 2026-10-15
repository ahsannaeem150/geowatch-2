import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
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
import useSheetGesture from '../../hooks/useSheetGesture';
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
  const wantOpen = useRef(true);

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
    origin,
    evidenceFrom,
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

  // Shared gesture engine (src/hooks/useSheetGesture.js) — the reference
  // implementation every sheet in the app uses. launchedTy lets the detent
  // effect above skip re-firing a spring the gesture release already
  // launched (double-push glitch on heavy screens).
  const { panResponder, pendingVy, launchedTy } = useSheetGesture({
    pos,
    getClamp: () => ({ top: 0, bottom: live.current.hiddenTy }),
    getRestTy: () => (live.current.level === 'full' ? 0 : live.current.halfTy),
    chooseTarget: ({ dy, vyMs, projected, restTy }) => {
      const s = live.current;
      const H = s.halfTy;
      // A clear flick snaps in its direction even over a short distance —
      // projection handles long drags, this handles fast short swipes.
      const flickUp = vyMs < -1.0 && dy < -10;
      const flickDown = vyMs > 1.0 && dy > 10;
      if (s.view === 'evidence') {
        const backTy = s.evidenceFrom === 'drawer' ? 0 : H;
        if (flickDown || projected > restTy + 120) {
          return { ty: backTy, after: s.closeEvidence };
        }
        if ((flickUp || projected < H * 0.5) && restTy !== 0) {
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

  // Bottom padding must clear BOTH the off-screen tail at the half detent
  // (halfTy) and the floating tab bar (62 + safe-area inset) that overlays
  // the sheet at every level — otherwise the last rows (e.g. X posts) hide
  // under the tab bar and feel "cut off".
  const halfBottomPad =
    (level === 'half' ? halfTy : 0) + 62 + insets.bottom + 16;
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
