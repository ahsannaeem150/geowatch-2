import React, { forwardRef } from 'react';
import { LegacyScrollView } from 'react-native-gesture-handler';

// ScrollView used by every sheet body that joins the scroll-edge handoff
// (Google Maps pattern). The handoff relation itself lives on the sheet's
// direction-gated pans: useSheetGesture points blocksExternalGesture at a
// ref to this view, so the native scroll handler goes AWAITING and may only
// activate once the pan FAILS — an edge-crossing drag is handed to the
// sheet cleanly in EITHER direction, while mid-content drags fail the pan
// within a few px (failOffsetY/failOffsetX) and scroll natively.
// overScrollMode="never" keeps Android's edge-glow from swallowing
// downward edge-drags.
//
// Why the LEGACY (v2) component: RNGH v3's ScrollView surfaces a v3-native
// gesture object that cannot be composed with v2 Gesture.Pan() objects
// (toGestureArray crash), and its Intercepting detector cancels foreign
// pans before they activate (finalize(false), no onStart — verified
// on-device). The legacy wrapper exposes handlerTag on its ref, which is
// what the pans' blocksExternalGesture relation resolves.
//
// Wirings that failed on-device (do not resurrect):
// - Plain RN ScrollView + ancestor pan: RN's scroll responder claims the
//   stream at ~10px and its requestDisallowInterceptTouchEvent cancels the
//   pan the instant it tries to activate.
// - LegacyScrollView waitFor={handoffGestures}: RNGH 3.x resolves waitFor
//   entries only via string ids or refs (transformIntoHandlerTags) — v2
//   gesture objects map to -1 and are silently dropped, so the wait never
//   registered and the scroll handler raced the pans to activation
//   (~50% cancellation at the FULL detent, instrumented-orchestrator
//   verified). This is why the relation lives on the pans instead.
// - manualActivation pan deciding per-touch in JS: activate() crosses the
//   bridge too late; the ScrollView has already claimed and the pan is
//   cancelled instantly. Enabled-state gating (set between touches) avoids
//   the race entirely.
// - v3 ScrollView + requireToFail(pans): pans cancelled instantly anyway.
// - A JS responder-capture pull-down around this view: Android's ScrollView
//   intercepts the stream natively and JS gets onResponderTerminate ~20dp
//   after grant — a JS responder can never win against it.
const HandoffScrollView = forwardRef(function HandoffScrollView(
  { children, ...props },
  ref,
) {
  return (
    <LegacyScrollView ref={ref} overScrollMode="never" {...props}>
      {children}
    </LegacyScrollView>
  );
});

export default HandoffScrollView;
