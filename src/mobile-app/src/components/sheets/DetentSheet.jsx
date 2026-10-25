import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  Extrapolate,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import useReanimatedSheetGesture from '../../hooks/useReanimatedSheetGesture';

export default function DetentSheet({
  active,
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
  onTargetChange,
  onMotionEnd,
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
  const [mounted, setMounted] = useState(active);
  const [moving, setMoving] = useState(false);
  const onMotionChange = useCallback((value) => setMoving(value), []);
  const wantOpen = useRef(true);
  const justMounted = useRef(false);
  const sheetLaidOut = useRef(false);
  const wasMoving = useRef(false);
  const motionEndRef = useRef(onMotionEnd);
  motionEndRef.current = onMotionEnd;

  const bottomPadStyle = useAnimatedStyle(() => ({
    height: pos.value + 62,
  }));
  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pos.value }],
    opacity:
      fadeStart === undefined
        ? 1
        : interpolate(pos.value, [fadeStart, hiddenTy], [1, 0.25], Extrapolate.CLAMP),
  }));

  useEffect(() => {
    if (wasMoving.current && !moving) motionEndRef.current?.();
    wasMoving.current = moving;
  }, [moving]);

  const { headGesture, handoffGesture, springTo, pendingVy, launchedTy, motionRef } =
    useReanimatedSheetGesture({
      pos,
      onMotionChange,
      getClamp,
      getRestTy,
      chooseTarget,
      handoff: {
        dragDownEnabled,
        dragUpEnabled,
        scrollRefs,
        epoch: handoffEpoch,
      },
    });
  if (controllerRef) controllerRef.current = springTo;

  useEffect(() => {
    if (active) {
      wantOpen.current = true;
      onTargetChange?.();
      if (!mounted) {
        pos.value = hiddenTy;
        justMounted.current = true;
        sheetLaidOut.current = false;
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
        springTo(targetTy, pendingVy.current, undefined, {
          stiffness: entryStiffness,
        });
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
        setMounted(false);
        return;
      }
      springTo(
        hiddenTy,
        pendingVy.current,
        () => {
          if (!wantOpen.current) setMounted(false);
        },
        { damping: closeDamping },
      );
      pendingVy.current = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, targetTy, mounted]);

  if (!mounted) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Reanimated.View
        renderToHardwareTextureAndroid={moving}
        onLayout={() => {
          sheetLaidOut.current = true;
        }}
        style={[styles.sheet, style, sheetAnimatedStyle]}>
        {renderHeader ? (
          <GestureDetector gesture={headGesture}>
            <View>{renderHeader()}</View>
          </GestureDetector>
        ) : null}
        <GestureDetector gesture={handoffGesture}>
          <View style={styles.bodyWrap} {...bodyProps}>
            {typeof children === 'function' ? children(bottomPadStyle) : children}
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
