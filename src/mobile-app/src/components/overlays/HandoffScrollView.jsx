import React, { forwardRef, useMemo } from 'react';
import { ScrollView } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

// ScrollView that joins a sheet's scroll-edge handoff (Google Maps pattern).
// The sheet's handoff pan (useSheetGesture) lives on an ANCESTOR
// GestureDetector; here a Native gesture wrapping a PLAIN RN ScrollView is
// related to that pan via requireExternalGestureToFail — the native scroll
// WAITS for the pan's per-touch decision instead of cancelling it: at the
// scroll edge the pan activates (sheet drags), anywhere else the pan fails
// and scrolling proceeds natively.
//
// RNGH's own ScrollView must NOT be used for this — it ships a preapplied
// native handler that activates immediately and cancels the pan before its
// onTouchesMove can even decide (verified on-device).
const HandoffScrollView = forwardRef(function HandoffScrollView(
  { handoffGesture, children, ...props },
  ref,
) {
  const nativeGesture = useMemo(
    () =>
      handoffGesture
        ? Gesture.Native().requireExternalGestureToFail(handoffGesture)
        : null,
    [handoffGesture],
  );
  if (!nativeGesture) {
    return (
      <ScrollView ref={ref} {...props}>
        {children}
      </ScrollView>
    );
  }
  return (
    <GestureDetector gesture={nativeGesture}>
      <ScrollView ref={ref} {...props}>
        {children}
      </ScrollView>
    </GestureDetector>
  );
});

export default HandoffScrollView;
