import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  cancelAnimation,
  runOnJS,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

export default function useReanimatedSheetGesture({
  pos,
  getClamp,
  getRestTy,
  chooseTarget,
  handoff,
  onMotionChange,
}) {
  const startTy = useSharedValue(0);
  const clamp = useSharedValue(getClamp());
  const pendingVy = useRef(0);
  const launchedTy = useRef(null);
  const motionCount = useRef(0);
  const cfg = useRef({});
  cfg.current = { getRestTy, chooseTarget, onMotionChange };

  useEffect(() => {
    clamp.value = getClamp();
  });

  const motionBump = useCallback((delta) => {
    const next = Math.max(0, motionCount.current + delta);
    if (next === motionCount.current) return;
    motionCount.current = next;
    cfg.current.onMotionChange?.(next > 0);
  }, []);

  const springTo = useCallback(
    (ty, velocity = 0, onDone, params) => {
      launchedTy.current = ty;
      motionBump(1);
      const complete = (finished) => {
        motionBump(-1);
        if (!finished) return;
        if (launchedTy.current === ty) launchedTy.current = null;
        onDone?.();
      };
      pos.value = withSpring(
        ty,
        {
          damping: 22,
          stiffness: 260,
          mass: 0.9,
          velocity,
          overshootClamping: true,
          ...params,
        },
        (finished) => {
          'worklet';
          runOnJS(complete)(finished);
        },
      );
    },
    [motionBump, pos],
  );

  const finishDrag = useCallback(
    (dy, vyMsRaw) => {
      const restTy = cfg.current.getRestTy();
      if (Math.abs(dy) < 12 && Math.abs(vyMsRaw) < 0.75) {
        pendingVy.current = 0;
        springTo(restTy);
        return;
      }
      const vyMs = Math.max(-3.5, Math.min(3.5, vyMsRaw));
      const vy = vyMs * 1000;
      const { top, bottom } = clamp.value;
      const endTy = Math.max(top, Math.min(startTy.value + dy, bottom));
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
      springTo(ty, vy, () => {
        onDone?.();
        after?.();
      });
    },
    [clamp, springTo, startTy],
  );

  const beginMotion = useCallback(() => {
    motionBump(1);
    pendingVy.current = 0;
  }, [motionBump]);

  const begin = useCallback(() => {
    'worklet';
    runOnJS(beginMotion)();
    cancelAnimation(pos);
    startTy.value = pos.value;
  }, [beginMotion, pos, startTy]);

  const update = useCallback(
    (event) => {
      'worklet';
      const { top, bottom } = clamp.value;
      const absolute = startTy.value + event.translationY;
      pos.value =
        absolute < top
          ? top + (absolute - top) * 0.3
          : Math.min(absolute, bottom);
    },
    [clamp, pos, startTy],
  );

  const end = useCallback(
    (event) => {
      'worklet';
      runOnJS(finishDrag)(event.translationY, event.velocityY / 1000);
    },
    [finishDrag],
  );

  const finalize = useCallback(() => {
    'worklet';
    runOnJS(motionBump)(-1);
  }, [motionBump]);

  const headGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-4, 4])
        .failOffsetX([-16, 16])
        .onStart(begin)
        .onUpdate(update)
        .onEnd(end)
        .onFinalize(finalize),
    [begin, end, finalize, update],
  );

  const dragDownEnabled = !!handoff?.dragDownEnabled;
  const dragUpEnabled = !!handoff?.dragUpEnabled;
  const handoffEpoch = handoff?.epoch ?? 0;
  const handoffPans = useMemo(() => {
    const scrollRefs = (handoff?.scrollRefs ?? []).filter(Boolean);
    const down = Gesture.Pan()
      .enabled(dragDownEnabled)
      .activeOffsetY(4)
      .failOffsetY(-4)
      .failOffsetX([-16, 16])
      .onStart(begin)
      .onUpdate(update)
      .onEnd(end)
      .onFinalize(finalize);
    const up = Gesture.Pan()
      .enabled(dragUpEnabled)
      .activeOffsetY(-4)
      .failOffsetY(4)
      .failOffsetX([-16, 16])
      .onStart(begin)
      .onUpdate(update)
      .onEnd(end)
      .onFinalize(finalize);
    if (scrollRefs.length) {
      if (dragDownEnabled) down.blocksExternalGesture(...scrollRefs);
      if (dragUpEnabled) up.blocksExternalGesture(...scrollRefs);
    }
    return [down, up];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragDownEnabled, dragUpEnabled, handoffEpoch, begin, update, end, finalize]);
  const handoffGesture = useMemo(
    () => Gesture.Race(...handoffPans),
    [handoffPans],
  );

  return {
    headGesture,
    handoffGesture,
    springTo,
    pendingVy,
    launchedTy,
    motionRef: motionCount,
  };
}
