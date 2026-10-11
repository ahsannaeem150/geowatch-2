import { useRef } from 'react';
import { Animated, PanResponder } from 'react-native';

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
  canClaim, // capture mode only: (gestureState) => bool
}) {
  const startTy = useRef(0);
  const moveSamples = useRef([]);
  const pendingVy = useRef(0);
  const launchedTy = useRef(null);
  // The pan responder is created once, so every config callback is read
  // through this ref — stale closures were the source of grabber jumpiness.
  const cfg = useRef({});
  cfg.current = { getClamp, getRestTy, chooseTarget, canClaim };

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

  const panResponder = useRef(
    PanResponder.create({
      ...(mode === 'capture'
        ? {
            onMoveShouldSetPanResponderCapture: (e, g) =>
              verticalClaim(e, g) && (!cfg.current.canClaim || cfg.current.canClaim(g)),
            onMoveShouldSetPanResponder: () => false,
          }
        : {
            onMoveShouldSetPanResponder: verticalClaim,
          }),
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
    }),
  ).current;

  return { panResponder, springTo, pendingVy, launchedTy };
}
