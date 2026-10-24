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
  jsSprings = false, // run programmatic springs on the JS thread. Needed when
  // a caller feeds pos into a LAYOUT prop through a derived node (PeekSheet's
  // bottom pad is Animated.add(pos, 62) → a spacer's height): a layout prop
  // can only be JS-driven, and a native-driven pos would force the pad to
  // chase it over coalesced listener hops — landing late in visible clamp
  // snaps (verified on-device). With JS springs, pos and its derived pad
  // commit in one batch on every rendered frame. Sheets without a synced
  // layout prop keep the native driver.
  handoff, // optional { dragDownEnabled: bool, dragUpEnabled: bool,
  // scrollRefs: ref[], epoch: any } — when set, a SECOND gesture
  // (handoffGesture, RNGH pan pair) is returned for the sheet body: it steals
  // a vertical drag from the inner scroll view while the scroll view is
  // pinned at the edge the gesture would cross (scroll-top + drag down,
  // scroll-end + drag up) — the Google Maps scroll-into-sheet handoff. The
  // enable flags must already be correct when the touch starts (re-rendered
  // from scroll-edge state), because a per-touch JS decision loses the
  // activation race against the native scroll view. scrollRefs must point at
  // the body's HandoffScrollViews — the pans block them NATIVELY
  // (blocksExternalGesture) so the scroll waits for the pan to fail before
  // it may activate. epoch must change whenever the set of live scroll views
  // changes (pane switches, scroll mounts) so the relations re-resolve.
  onMotionChange, // optional (moving: bool) — fired when the sheet starts /
  // stops moving (grabs, handoff pans, springs incl. programmatic). Callers
  // use it to promote the sheet to a hardware texture layer while it moves,
  // so a translate costs a GPU texture move instead of a display-list
  // re-record of the pane subtree.
}) {
  const startTy = useRef(0);
  const moveSamples = useRef([]);
  const pendingVy = useRef(0);
  const launchedTy = useRef(null);
  // The pan responder is created once, so every config callback is read
  // through this ref — stale closures were the source of grabber jumpiness.
  const cfg = useRef({});
  cfg.current = {
    getClamp,
    getRestTy,
    chooseTarget,
    canClaim,
    handoff,
    onMotionChange,
  };
  // Overlapping motion sources (a grab interrupting a spring, a handoff pan
  // rolling into its settle spring) nest, so "is the sheet moving" is a
  // counter, not a flag — every +1 has exactly one matching -1.
  const motionCount = useRef(0);
  const motionBump = (d) => {
    const next = Math.max(0, motionCount.current + d);
    if (next === motionCount.current) return;
    motionCount.current = next;
    cfg.current.onMotionChange?.(next > 0);
  };

  const springTo = (ty, velocity = 0, onDone, params) => {
    motionBump(+1);
    return Animated.spring(pos, {
      toValue: ty,
      damping: 22,
      stiffness: 260,
      mass: 0.9,
      velocity,
      overshootClamping: true,
      ...params,
      useNativeDriver: !jsSprings,
    }).start(({ finished }) => {
      // Every spring start has exactly one completion callback (interrupted
      // springs fire it with finished=false), so the decrement balances
      // unconditionally.
      motionBump(-1);
      if (!finished) return;
      if (launchedTy.current === ty) launchedTy.current = null;
      if (onDone) onDone();
    });
  };

  // Shared release/settle for every drag source (grabber PanResponder, RNGH
  // handoff pan, JS pull-down): samples → clamped velocity → projected rest →
  // caller's chooseTarget → one spring launched WITH the finger's velocity.
  const finishDrag = (dy, vyMsRaw) => {
    const restTy = cfg.current.getRestTy();
    if (Math.abs(dy) < 12 && Math.abs(vyMsRaw) < 0.75) {
      pendingVy.current = 0;
      springTo(restTy);
      return;
    }
    const vyMs = Math.max(-3.5, Math.min(3.5, vyMsRaw));
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
    // The state commit (after) runs at SPRING COMPLETION, not at launch:
    // firing it here triggers a heavy context re-render that blocks the JS
    // thread for ~150ms, and a JS-driven spring then catches up over the
    // stalled wall-time in ONE frame — the sheet teleports (verified
    // on-device). The caller's detent effect already guards the late arrival
    // via launchedTy / pos≈target, so the commit is invisible at the end.
    springTo(ty, vy, () => {
      if (onDone) onDone();
      if (after) after();
    });
  };

  const verticalClaim = (_e, g) =>
    Math.abs(g.dy) > 3 && Math.abs(g.dy) > Math.abs(g.dx);

  // Shared gesture handlers — the head responder and the optional body
  // handoff responder run the exact same physics; only the claim differs.
  const handlers = {
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      motionBump(+1);
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
        motionBump(-1);
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
        // after is deferred to spring completion — see finishDrag.
        springTo(ty, vy, () => {
          if (onDone) onDone();
          if (after) after();
        });
      },
      onPanResponderTerminate: () => {
        motionBump(-1);
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

  // Body handoff gestures (react-native-gesture-handler, already a dep):
  // a PanResponder capture CANNOT steal a drag from Android's ScrollView —
  // the native side intercepts the stream and JS gets onResponderTerminate
  // 20ms after grant (verified on-device). RNGH coordinates with the native
  // scroll view instead: each pan blocks the sheet's scroll views natively
  // (blocksExternalGesture on the scroll view refs), so the scroll handler
  // goes AWAITING and may only activate once the pan FAILS.
  //
  // The decision is made NATIVELY, not in JS: two direction-gated pans with
  // activeOffsetY, each .enabled() only while the caller reports its edge
  // pinned (handoff.dragDownEnabled / dragUpEnabled, re-rendered from
  // scroll-edge state between touches). A manualActivation pan deciding in
  // JS loses the race — by the time activate() crosses the bridge the
  // ScrollView has already claimed + disallowed interception, and the pan is
  // cancelled instantly (verified on-device). Enabled-state gating is set
  // before the finger lands, so there is no race.
  //
  // The symmetric failOffsetY (+ failOffsetX) is what makes the blocking
  // safe: a drag in the wrong direction (or a horizontal one) fails the pan
  // within a few px, releasing the blocked scroll view to scroll natively —
  // without it the pans would only fail on finger-up and the scroll view
  // would freeze at a pinned edge.
  //
  // Do NOT move the relation onto the scroll view instead: RNGH 3.x's
  // legacy-component waitFor resolves only string ids and handler refs
  // (transformIntoHandlerTags), so waitFor={gesture objects} is silently
  // IGNORED — the scroll handler then races the pans to activation and
  // cancels them ~50% of the time (verified on-device with an instrumented
  // orchestrator). blocksExternalGesture on the pans resolves refs at
  // detector attach time and registers reliably.
  //
  // The relation is applied PER PAN and only while that pan is enabled.
  // Edge flips arrive from scroll events, i.e. mid-fling; recreating the
  // pans then is only a config+relation UPDATE (same native handler tags —
  // needsToReattach checks count/name/thread only), but a DISABLED pan that
  // keeps a blocksExternalGesture relation never resolves its awaiting
  // scroll handler — the pane's scroll deadlocks until remount (verified
  // on-device: freeze after the first scroll's atTop flip, scroll dead until
  // a pill cycle). An enabled pan always resolves (fails within a few px on
  // a wrong-direction drag), so only enabled pans may block.
  //
  // RNGH reports translation/velocity reliably on Android, so no sampling.
  const dragDownEnabled = !!handoff?.dragDownEnabled;
  const dragUpEnabled = !!handoff?.dragUpEnabled;
  const handoffEpoch = handoff?.epoch ?? 0;
  const onHandoffStart = () => {
    motionBump(+1);
    pos.stopAnimation();
    startTy.current = pos.__getValue();
    pendingVy.current = 0;
  };
  // Fires after onEnd OR on cancel — the pan's own +1 always returns here;
  // the settle spring launched from onEnd carries its own +1 meanwhile.
  const onHandoffFinalize = () => motionBump(-1);
  const onHandoffUpdate = (e) => {
    const { top, bottom } = cfg.current.getClamp();
    const abs = startTy.current + e.translationY;
    const clamped =
      abs < top ? top + (abs - top) * 0.3 : Math.min(abs, bottom);
    pos.setValue(clamped);
  };
  const onHandoffEnd = (e) => {
    finishDrag(e.translationY, e.velocityY / 1000);
  };
  const handoffPans = useMemo(() => {
    const scrollRefs = (handoff?.scrollRefs ?? []).filter(Boolean);
    const down = Gesture.Pan()
      .enabled(dragDownEnabled)
      .activeOffsetY(4)
      .failOffsetY(-4)
      .failOffsetX([-16, 16])
      .onStart(onHandoffStart)
      .onUpdate(onHandoffUpdate)
      .onEnd(onHandoffEnd)
      .onFinalize(onHandoffFinalize);
    const up = Gesture.Pan()
      .enabled(dragUpEnabled)
      .activeOffsetY(-4)
      .failOffsetY(4)
      .failOffsetX([-16, 16])
      .onStart(onHandoffStart)
      .onUpdate(onHandoffUpdate)
      .onEnd(onHandoffEnd)
      .onFinalize(onHandoffFinalize);
    if (scrollRefs.length) {
      // Only an ENABLED pan may block the scroll views — a disabled pan's
      // relation would deadlock their native handler (see comment above).
      if (dragDownEnabled) down.blocksExternalGesture(...scrollRefs);
      if (dragUpEnabled) up.blocksExternalGesture(...scrollRefs);
    }
    return [down, up];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragDownEnabled, dragUpEnabled, handoffEpoch]);
  const handoffGesture = useMemo(
    () => Gesture.Race(...handoffPans),
    [handoffPans],
  );

  return {
    panResponder,
    handoffGesture,
    springTo,
    pendingVy,
    launchedTy,
    // Live "is the sheet moving" counter — callers launching their own
    // springs via springTo read this to avoid double-counting motion.
    motionRef: motionCount,
  };
}
