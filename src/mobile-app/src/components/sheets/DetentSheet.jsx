import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  Extrapolate,
  interpolate,
  scrollTo,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import useReanimatedSheetGesture from '../../hooks/useReanimatedSheetGesture';

export default function DetentSheet({
  active,
  keepMounted = false,
  entryKey,
  entryPaused = false,
  targetTy,
  hiddenTy,
  pos,
  getClamp,
  getRestTy,
  chooseTarget,
  dragDownEnabled,
  dragUpEnabled,
  scrollRefs,
  handoffEpoch,
  activeScrollEdge,
  evidenceActive = false,
  mapOptimizations = false,
  onTargetChange,
  onMotionEnd,
  bottomPadOffset = 62,
  fadeStart,
  entryStiffness = 220,
  closeDamping = 26,
  style,
  bodyProps,
  renderHeader,
  overlay,
  controllerRef,
  children,
}) {
  const [mounted, setMounted] = useState(active && !entryPaused);
  const [moving, setMoving] = useState(false);
  const [entryPending, setEntryPending] = useState(active);
  const motionActive = useSharedValue(0);
  const motionStartPos = useSharedValue(0);
  const motionStartScrollY = useSharedValue(0);
  const motionAnchorEnd = useSharedValue(0);
  const motionMode = useSharedValue(0);
  const animatedScrollRef = activeScrollEdge?.scrollRef.current?.current?.animatedRef;
  const onMotionChange = useCallback(
    (value, startPos = pos.value) => {
      if (value && !motionActive.value) {
        activeScrollEdge?.onSheetMotionStart(evidenceActive);
        motionStartPos.value = startPos;
        motionStartScrollY.value = activeScrollEdge?.dims.current.y || 0;
        motionAnchorEnd.value =
          evidenceActive &&
          activeScrollEdge?.atEnd.current &&
          !activeScrollEdge?.atTop.current
            ? 1
            : 0;
        motionMode.value = 0;
      }
      motionActive.value = value ? 1 : 0;
      if (!value) {
        motionMode.value = 0;
        setEntryPending(false);
      }
      setMoving(value);
    },
    [activeScrollEdge, evidenceActive, motionActive, motionAnchorEnd, motionMode, motionStartPos, motionStartScrollY, pos],
  );
  useAnimatedReaction(
    () => ({
      motionOn: motionActive.value,
      anchorEnd: motionAnchorEnd.value,
      mode: motionMode.value,
      sheetPos: pos.value,
      startPos: motionStartPos.value,
    }),
    ({ motionOn, anchorEnd, mode, sheetPos, startPos }) => {
      'worklet';
      if (!motionOn || !anchorEnd) return;
      if (mode === 0) {
        const delta = sheetPos - startPos;
        if (Math.abs(delta) < 0.01) return;
        motionMode.value = delta > 0 ? 2 : 1;
      }
      if (motionMode.value !== 2 || !animatedScrollRef) return;
      const nextY = Math.max(
        0,
        motionStartScrollY.value + sheetPos - startPos,
      );
      scrollTo(animatedScrollRef, 0, nextY, false);
    },
    [animatedScrollRef, motionActive, motionAnchorEnd, motionMode, motionStartPos, motionStartScrollY, pos],
  );
  const wantOpen = useRef(true);
  const justMounted = useRef(active);
  const sheetLaidOut = useRef(false);
  const wasMoving = useRef(false);
  const entryKeyRef = useRef(entryKey);
  const motionEndRef = useRef(onMotionEnd);
  motionEndRef.current = onMotionEnd;

  const bottomPadStyle = useAnimatedStyle(() => ({
    height:
      (motionActive.value && evidenceActive ? motionStartPos.value : pos.value) +
      bottomPadOffset,
  }));
  const evidencePadStyle = useAnimatedStyle(() => ({
    height:
      (motionActive.value ? hiddenTy : pos.value) + bottomPadOffset,
  }));
  const evidenceContentStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          motionActive.value && motionAnchorEnd.value && motionMode.value === 1
            ? Math.min(
                motionStartPos.value - pos.value,
                motionStartScrollY.value,
              )
            : 0,
      },
    ],
  }));
  const evidenceMotion = useMemo(
    () => ({ padStyle: evidencePadStyle, contentStyle: evidenceContentStyle }),
    [evidencePadStyle, evidenceContentStyle],
  );
  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pos.value }],
    opacity:
      fadeStart === undefined
        ? 1
        : interpolate(pos.value, [fadeStart, hiddenTy], [1, 0.25], Extrapolate.CLAMP),
  }));
  const headerContent = useMemo(() => renderHeader?.(), [renderHeader]);
  const bodyContent = useMemo(
    () =>
      typeof children === 'function'
        ? children(bottomPadStyle, evidenceMotion, entryPending)
        : children,
    [children, bottomPadStyle, evidenceMotion, entryPending],
  );

  useEffect(() => {
    if (entryKeyRef.current === entryKey) return;
    entryKeyRef.current = entryKey;
    if (!wantOpen.current) {
      justMounted.current = true;
      sheetLaidOut.current = true;
      setEntryPending(true);
    }
  }, [entryKey]);

  useEffect(() => {
    if (wasMoving.current && !moving) {
      activeScrollEdge?.onSheetMotionEnd();
      motionEndRef.current?.();
    }
    wasMoving.current = moving;
  }, [moving, activeScrollEdge]);

  const { headGesture, handoffGesture, springTo, pendingVy, launchedTy, motionRef } =
    useReanimatedSheetGesture({
      pos,
      onMotionChange,
      getClamp,
      getRestTy,
      chooseTarget,
      handoff: {
        dragDownEnabled:
          (mapOptimizations && evidenceActive && moving) || dragDownEnabled,
        dragUpEnabled:
          (mapOptimizations && evidenceActive && moving) || dragUpEnabled,
        scrollRefs,
        epoch: handoffEpoch,
      },
    });
  if (controllerRef) controllerRef.current = springTo;

  useEffect(() => {
    if (active) {
      wantOpen.current = true;
      onTargetChange?.();
      if (entryPaused) return;
      if (!mounted) {
        pos.value = hiddenTy;
        justMounted.current = true;
        sheetLaidOut.current = false;
        setEntryPending(true);
        setMounted(true);
        return;
      }
      if (
        launchedTy.current === targetTy ||
        Math.abs(pos.value - targetTy) < 1
      ) {
        launchedTy.current = null;
        pendingVy.current = 0;
        return;
      }
      const launchEntry = () => {
        if (motionRef.current !== 0) return;
        springTo(
          targetTy,
          mapOptimizations ? 0 : pendingVy.current,
          undefined,
          {
            stiffness: entryStiffness,
            ...(mapOptimizations ? { duration: 300 } : {}),
          },
        );
        pendingVy.current = 0;
      };
      if (justMounted.current) {
        justMounted.current = false;
        let cancelled = false;
        let laidOutAt = -1;
        let frames = 0;
        const tick = () => {
          if (cancelled) return;
          if (sheetLaidOut.current && laidOutAt < 0) laidOutAt = frames;
          frames += 1;
          const ready = laidOutAt >= 0 && frames - laidOutAt >= 3;
          if (ready || frames > 12) {
            launchEntry();
            return;
          }
          requestAnimationFrame(tick);
        };
        const raf = requestAnimationFrame(tick);
        return () => {
          cancelled = true;
          cancelAnimationFrame(raf);
        };
      }
      launchEntry();
    } else if (mounted) {
      wantOpen.current = false;
      if (launchedTy.current === hiddenTy) {
        launchedTy.current = null;
        pendingVy.current = 0;
        return;
      }
      if (Math.abs(pos.value - hiddenTy) < 1) {
        pendingVy.current = 0;
        if (!keepMounted) setMounted(false);
        return;
      }
      springTo(
        hiddenTy,
        pendingVy.current,
        () => {
          if (!wantOpen.current && !keepMounted) setMounted(false);
        },
        { damping: closeDamping },
      );
      pendingVy.current = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, keepMounted, targetTy, mounted, entryPaused]);

  if (!mounted) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Reanimated.View
        renderToHardwareTextureAndroid={moving && !evidenceActive}
        onLayout={() => {
          sheetLaidOut.current = true;
        }}
        style={[styles.sheet, style, sheetAnimatedStyle]}>
        {renderHeader ? (
          <GestureDetector gesture={headGesture}>
            <View>{headerContent}</View>
          </GestureDetector>
        ) : null}
        <GestureDetector gesture={handoffGesture}>
          <View style={styles.bodyWrap} {...bodyProps}>
            {bodyContent}
          </View>
        </GestureDetector>
        {overlay}
      </Reanimated.View>
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
  bodyWrap: {
    flex: 1,
  },
});
