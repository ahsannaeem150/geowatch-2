import React, { forwardRef } from 'react';
import { ScrollView as RNScrollView } from 'react-native';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';

// ScrollView that joins a sheet's scroll-edge handoff (Google Maps pattern).
// The sheet's handoff pan (useSheetGesture) lives on an ANCESTOR
// GestureDetector; this scroll view waits for the pan's per-touch decision
// via `waitFor`: at the scroll edge the pan activates (the native scroll
// cancels and the sheet drags), anywhere else the pan fails and scrolling
// proceeds natively.
//
// Two earlier wirings failed on-device:
// - RNGH ScrollView with NO relation: its preapplied native handler
//   activates immediately and cancels the pan before it can decide.
// - Plain RN ScrollView + Gesture.Native().requireExternalGestureToFail(pan):
//   the pan's fail lets the Native gesture activate, which steals the touch
//   stream from RN's own scroll responder mid-drag on some panes (scroll
//   begins, then dies after ~25dp with no endDrag — verified on-device).
// `waitFor={pan}` gets the same "scroll waits for the pan" semantics through
// RNGH's own native handler, which coordinates the cancellation cleanly.
const HandoffScrollView = forwardRef(function HandoffScrollView(
  { handoffGesture, children, ...props },
  ref,
) {
  if (!handoffGesture) {
    return (
      <RNScrollView ref={ref} overScrollMode="never" {...props}>
        {children}
      </RNScrollView>
    );
  }
  return (
    <GHScrollView
      ref={ref}
      overScrollMode="never"
      waitFor={handoffGesture}
      {...props}>
      {children}
    </GHScrollView>
  );
});

export default HandoffScrollView;
