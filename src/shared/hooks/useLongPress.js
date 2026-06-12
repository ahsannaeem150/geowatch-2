import { useRef, useCallback } from 'react';

/**
 * Hook for detecting a long-press on touch devices.
 *
 * Props:
 *   onLongPress    — callback({ x, y, target, event }) fired after the press is held.
 *   duration       — ms to wait before firing (default 500).
 *   moveThreshold  — px of movement that cancels the press (default 10).
 *
 * Returns touch event handlers to spread on the target element:
 *   { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel }
 */
export function useLongPress({
  onLongPress,
  duration = 500,
  moveThreshold = 10,
}) {
  const timerRef = useRef(null);
  const startPosRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPosRef.current = null;
  }, []);

  const handleStart = useCallback(
    (e) => {
      const touch = e.touches?.[0];
      if (!touch) return;

      startPosRef.current = { x: touch.clientX, y: touch.clientY };

      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        startPosRef.current = null;
        onLongPress?.({
          x: touch.clientX,
          y: touch.clientY,
          target: e.target,
          event: e,
        });
      }, duration);
    },
    [duration, onLongPress]
  );

  const handleMove = useCallback(
    (e) => {
      if (!startPosRef.current || !timerRef.current) return;
      const touch = e.touches?.[0];
      if (!touch) return;

      const dx = touch.clientX - startPosRef.current.x;
      const dy = touch.clientY - startPosRef.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > moveThreshold) {
        clearTimer();
      }
    },
    [clearTimer, moveThreshold]
  );

  return {
    onTouchStart: handleStart,
    onTouchMove: handleMove,
    onTouchEnd: clearTimer,
    onTouchCancel: clearTimer,
  };
}
