import { useMemo, useRef } from 'react';
import { Animated, PanResponder } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';

// Shared bottom-sheet gesture engine — extracted from the map PeekSheet (the
// reference "Google Maps feel" implementation) so every sheet in the app
// drags, flicks and settles identically.
//
// What the engine owns:
// - grant: fire-and-forget stopAnimation + pos.__getValue() (never a
//   listener-synced ref — native-driver forwarding drops updates across a
//   dismiss/reopen cycle) + extractOffset for 1:1 relative dragging.
// - move: rubber-band past the top clamp, hard clamp at the bottom clamp,
//   plus move sampling — the release velocity is measured from our own last
//   ~100ms of samples because a capture-claimed responder's g.vy reads ~0 on
//   Android (the "stops dead, then re-accelerates" bug).
// - release: tap guard (tiny jitter never changes the detent), velocity
//   clamp px/ms → px/s for RN springs, projected resting point, flick
//   detection, then one spring that starts WITH the finger's velocity.
// - launchedTy: records the gesture-launched spring target so the caller's
//   detent effect can skip re-firing the same spring late (double-push
//   glitch); auto-clears when that spring finishes.
//
// The caller owns detent semantics via chooseTarget — it maps the release
// physics to a target translateY plus any state change (after) and an
// optional spring-completion callback (onDone, e.g. unmount on dismiss).
export default function useSheetGesture({
  pos, // Animated.Value driving the sheet's translateY
  getClamp, // () => ({ top, bottom }) — rubber-band above top, hard-stop at bottom
  getRestTy, // () => number — current detent's translateY (tap-settle + terminate)
  chooseTarget, // ({ dy, vyMs, endTy, projected, restTy }) => { ty, after?, onDone? }
  mode = 'head', // 'head': responder claims on move | 'capture': whole-sheet capture
  canClaim, // capture mode only: (gestureState, event) => bool
  handoff, // optional { canDragDown: () => bool, canDragUp: () => bool } —
  // when set, a SECOND gesture (handoffGesture, RNGH pan) is returned for the
  // sheet body: it steals a vertical drag from the inner scroll view only
  // when the scroll view is pinned at the edge the gesture would cross
  // (scroll-top + drag down, scroll-end + drag up) — the Google Maps
  // scroll-into-sheet handoff. Between the edges the ScrollView wins.
  // Wire the body's scroll views with HandoffScrollView (RN ScrollView +
  // Gesture.Native().requireExternalGestureToFail(handoffGesture)) so the
  // native scroll waits for the pan's per-touch decision.
}) {
  const startTy = useRef(0);
  const moveSamples = useRef([]);
  const pendingVy = useRef(0);
  const launchedTy = useRef(null);
  // The pan responder is created once, so every config callback is read
  // through this ref — stale closures were the source of grabber jumpiness.
  const cfg = useRef({});
  cfg.current = { getClamp, getRestTy, chooseTarget, canClaim, handoff };

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
      if (!finished) return;
      if (launchedTy.current === ty) launchedTy.current = null;
      if (onDone) onDone();
    });

  const verticalClaim = (_e, g) =>
    Math.abs(g.dy) > 3 && Math.abs(g.dy) > Math.abs(g.dx);

  // Shared gesture handlers — the head responder and the optional body
  // handoff responder run the exact same physics; only the claim differs.
  const handlers = {
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      pos.stopAnimation();
      startTy.current = pos.__getValue();
      pendingVy.current = 0;
      moveSamples.current = [{ t: Date.now(), y: startTy.current }];
      pos.extractOffset();
    },
    onPanResponderMove: (_e, g) => {
      const { top, bottom } = cfg.current.getClamp();
      const abs = startTy.current + g.dy;
      const clamped =
        abs < top ? top + (abs - top) * 0.3 : Math.min(abs, bottom);
      pos.setValue(clamped - startTy.current);
      const samples = moveSamples.current;
      samples.push({ t: Date.now(), y: clamped });
      if (samples.length > 8) samples.shift();
    },
    onPanResponderRelease: (_e, g) => {
        pos.flattenOffset(); // merge offset back → absolute value again
        const restTy = cfg.current.getRestTy();
        // Release velocity from our own samples (px/ms): slope across the
        // last ~100ms of finger movement, g.vy as fallback.
        const samples = moveSamples.current;
        const last = samples[samples.length - 1];
        let first = samples[0];
        if (last) {
          for (let i = samples.length - 1; i >= 0; i -= 1) {
            if (last.t - samples[i].t > 100) break;
            first = samples[i];
          }
        }
        let vyMsRaw = g.vy;
        if (last && first && last.t > first.t) {
          vyMsRaw = (last.y - first.y) / (last.t - first.t);
        }
        moveSamples.current = [];
        // A plain tap / tiny jitter must NEVER change the detent — a quick
        // tap can carry a big velocity spike. Velocity only counts when the
        // finger actually travelled.
        if (Math.abs(g.dy) < 12 && Math.abs(vyMsRaw) < 0.75) {
          pendingVy.current = 0;
          springTo(restTy);
          return;
        }
        // Clamp the inherited velocity (px/ms), then convert to px/s for
        // RN springs — SpringAnimation's frame time is in SECONDS (unlike
        // decay which uses ms), so a raw px/ms value is ~1000x too small.
        const vyMs = Math.max(-3.5, Math.min(3.5, vyMsRaw));
        const vy = vyMs * 1000;
        const { top, bottom } = cfg.current.getClamp();
        const endTy = Math.max(top, Math.min(startTy.current + g.dy, bottom));
        const projected = endTy + vyMs * 220; // ~220ms of coast
        const { ty, after, onDone } = cfg.current.chooseTarget({
          dy: g.dy,
          vyMs,
          endTy,
          projected,
          restTy,
        });
        pendingVy.current = vy;
        launchedTy.current = ty;
        springTo(ty, vy, onDone);
        if (after) after();
      },
      onPanResponderTerminate: () => {
        pos.flattenOffset();
        moveSamples.current = [];
        springTo(cfg.current.getRestTy());
      },
  };

  const panResponder = useRef(
    PanResponder.create({
      ...(mode === 'capture'
        ? {
            onMoveShouldSetPanResponderCapture: (e, g) =>
              verticalClaim(e, g) &&
              (!cfg.current.canClaim || cfg.current.canClaim(g, e)),
            onMoveShouldSetPanResponder: () => false,
          }
        : {
            onMoveShouldSetPanResponder: verticalClaim,
          }),
      ...handlers,
    }),
  ).current;

  // Body handoff gesture (react-native-gesture-handler, already a dep):
  // a PanResponder capture CANNOT steal a drag from Android's ScrollView —
  // the native side intercepts the stream and JS gets onResponderTerminate
  // 20ms after grant (verified on-device). RNGH coordinates with the native
  // scroll view instead: manualActivation + fail() leaves scrolling fully
  // native, and activate() cleanly cancels the scroll and hands the stream
  // to the sheet — the Google Maps scroll-into-sheet handoff.
  //
  // Claim rule: a vertical drag is activated ONLY when the inner scroll view
  // is pinned at the edge the gesture would cross (scroll-top + drag down,
  // scroll-end + drag up) via the caller's handoff.canDragDown/canDragUp.
  // RNGH reports translation/velocity reliably on Android, so no sampling.
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const handoffGesture = useMemo(
    () =>
      Gesture.Pan()
        .manualActivation(true)
        .onTouchesDown((e) => {
          const t = e.changedTouches[0];
          if (t) {
            touchStartY.current = t.absoluteY;
            touchStartX.current = t.absoluteX;
          }
        })
        .onTouchesMove((e, sm) => {
          const h = cfg.current.handoff;
          if (!h) {
            sm.fail();
            return;
          }
          const t = e.changedTouches[0];
          if (!t) return;
          const dy = t.absoluteY - touchStartY.current;
          const dx = t.absoluteX - touchStartX.current;
          if (Math.abs(dy) < 4 || Math.abs(dy) < Math.abs(dx)) return; // undecided
          const allow =
            dy > 0
              ? h.canDragDown
                ? h.canDragDown()
                : false
              : h.canDragUp
                ? h.canDragUp()
                : false;
          if (allow) sm.activate();
          else sm.fail();
        })
        .onStart(() => {
          pos.stopAnimation();
          startTy.current = pos.__getValue();
          pendingVy.current = 0;
        })
        .onUpdate((e) => {
          const { top, bottom } = cfg.current.getClamp();
          const abs = startTy.current + e.translationY;
          const clamped =
            abs < top ? top + (abs - top) * 0.3 : Math.min(abs, bottom);
          pos.setValue(clamped);
        })
        .onEnd((e) => {
          const restTy = cfg.current.getRestTy();
          let vyMs = e.velocityY / 1000; // RNGH velocity: px/s, reliable
          const dy = e.translationY;
          if (Math.abs(dy) < 12 && Math.abs(vyMs) < 0.75) {
            springTo(restTy);
            return;
          }
          vyMs = Math.max(-3.5, Math.min(3.5, vyMs));
          const vy = vyMs * 1000;
          const { top, bottom } = cfg.current.getClamp();
          const endTy = Math.max(top, Math.min(startTy.current + dy, bottom));
          const projected = endTy + vyMs * 220;
          const { ty, after, onDone } = cfg.current.chooseTarget({
            dy,
            vyMs,
            endTy,
            projected,
            restTy,
          });
          pendingVy.current = vy;
          launchedTy.current = ty;
          springTo(ty, vy, onDone);
          if (after) after();
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return { panResponder, handoffGesture, springTo, pendingVy, launchedTy };
}
