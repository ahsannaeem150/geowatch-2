import { useCallback, useMemo, useRef, useState } from 'react';

// Scroll-edge tracker for the nested-scroll handoff (Google Maps pattern):
// a sheet's body ScrollView reports whether it is pinned at its top / bottom
// edge, and the sheet's handoff pans are ENABLED only while the edge the
// gesture would cross is pinned (scroll-top + drag down → collapse the
// sheet; scroll-end + drag up → expand it). Between the edges the ScrollView
// keeps the gesture natively, so content scrolls untouched.
//
// atTop/atEnd exist in two forms:
// - refs (atTop/atEnd) — synchronous reads inside gesture-time code;
// - state (atTopNow/atEndNow) — render-time values used to enable/disable
//   the RNGH handoff pans. Enabling must be set BETWEEN touches (a per-touch
//   JS decision loses the activation race against the native scroll view —
//   verified on-device), so edge changes re-render the sheet.
export default function useScrollEdge(onFlip, scrollRef) {
  const atTop = useRef(true);
  const atEnd = useRef(false);
  const tailPad = useRef(0);
  const dims = useRef({ y: 0, viewH: 0, contentH: 0 });
  const scrollableRef = useRef(false);
  const momentumActive = useRef(false);
  const [edges, setEdges] = useState({
    atTopNow: true,
    atEndNow: false,
    scrollableNow: false,
  });
  const onFlipRef = useRef(onFlip);
  onFlipRef.current = onFlip;
  const scrollRefRef = useRef(scrollRef);
  scrollRefRef.current = scrollRef;

  const recompute = useCallback(() => {
    let { y } = dims.current;
    const { viewH, contentH } = dims.current;
    // Re-pin a stale scroll offset ONLY while a momentum fling owns the
    // scroller. That is the case that needs it: RN does not reliably re-clamp
    // scrollY when the pad shrink lands mid-fling — the native scroller keeps
    // writing its pre-computed finalY and the pane lands deep inside the pad
    // (blank white sheet until scrolled back — verified on-device). The
    // non-animated scrollTo cancels the fling AND clamps; the 40dp deadband
    // keeps it to fling-scale overshoots.
    //
    // When NO fling is active the re-pin must stay silent: Android's layout
    // clamp already tracks a shrinking pad EXACTLY on every committed frame
    // (the smooth slow-drag expand), while a JS scrollTo computed from this
    // dims snapshot is 1-2 frames stale — it lands late and FIGHTS the native
    // clamp: one-frame content down-then-up oscillation on fast flick expands,
    // plus a residual few-px end offset at rest (both verified on-device).
    //
    // The programmatic scrollTo's onScroll can itself be dropped/coalesced,
    // and NO scroll-end event fires for programmatic scrolls — so record the
    // corrected offset ourselves. On a pane that just became non-scrollable
    // (short content at FULL: scrollEnabled=false) nothing else ever will:
    // a stale y there strands atTop=false forever, the down-drag handoff
    // stays disabled, and ownerless drags fall through to child pressables
    // (a "scroll" ending inside the tall timeline card fires its INSPECT
    // onPress — phantom evidence opens, verified on-device).
    const ref = scrollRefRef.current;
    if (momentumActive.current && ref?.current && viewH > 0 && contentH > 0) {
      const maxY = Math.max(0, contentH - viewH);
      if (y > maxY + 40) {
        // scrollToEnd, not scrollTo(maxY): the end offset must come from the
        // NATIVE current sizes — a JS-computed maxY from this dims snapshot
        // can overshoot the true native bound by a few px, and a programmatic
        // offset beyond the bound is never auto-corrected (leaves a residual
        // shift the next detent change inherits — verified on-device).
        ref.current.scrollToEnd?.({ animated: false });
        y = maxY;
        dims.current = { ...dims.current, y };
      }
    }
    const scrollable = contentH > 0 && viewH > 0 && contentH > viewH + 8;
    // A NON-scrollable pane is definitionally pinned at its top (maxY = 0 —
    // RN clamps the offset and the re-pin above enforces it). Never trust a
    // possibly-stale y here: with scrollEnabled=false no future scroll event
    // can correct it. A non-scrollable ScrollView also still activates its
    // RNGH native gesture instantly on touch (nothing to wait for), which
    // cancels the sheet's handoff pans before they can fire — callers pass
    // scrollEnabled={scrollableNow} so the dead scroll view stops competing
    // (verified on-device).
    const top = scrollable ? y <= 1 : true;
    // Content shorter than the viewport counts as BOTH edges reached.
    // tailPad: optional early-fire allowance for the end edge. Keep it 0 on
    // sheets whose bottom pad SHRINKS during the expand (PeekSheet's derived
    // pad): an early-fired expand starts with the offset short of maxY, and
    // the pad-shrink clamp only engages once maxY falls to that stop offset —
    // the content rides up with the sheet by the shortfall first (slow drag:
    // visible px shift; fast flick: one-frame snap — device-verified). At the
    // true pixel end the clamp tracks the pad exactly and content stays
    // stationary at any speed. The 2dp slack is float-rounding fuzz only —
    // any larger window reintroduces the shortfall.
    const end =
      contentH > 0 &&
      viewH > 0 &&
      y + viewH >= contentH - tailPad.current - 2;
    if (
      top !== atTop.current ||
      end !== atEnd.current ||
      scrollable !== scrollableRef.current
    ) {
      atTop.current = top;
      atEnd.current = end;
      scrollableRef.current = scrollable;
      setEdges({ atTopNow: top, atEndNow: end, scrollableNow: scrollable });
      if (onFlipRef.current) onFlipRef.current();
    }
  }, []);

  const onScroll = useCallback(
    (e) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      dims.current = {
        y: contentOffset.y,
        viewH: layoutMeasurement.height,
        contentH: contentSize.height,
      };
      recompute();
    },
    [recompute],
  );

  // Drag/fling END events are one-shot — not a coalesced stream like onScroll
  // — so the final settle offset always lands here even when the last
  // onScroll frame (y→0) is dropped by Fabric event coalescing. Without this
  // a stale y of a few px at the VISUAL top strands atTop=false permanently
  // (recompute has no top-side self-heal and nothing re-fires until the next
  // real scroll): the down-drag handoff pan stays disabled, the drag then has
  // no owner at all (scroll-top + overScrollMode=never → the ScrollView
  // doesn't intercept either), and the touch falls through to child
  // pressables — a "stuck" drag ending inside the tall timeline card fires
  // its INSPECT onPress on finger-lift (phantom evidence open seconds after
  // the gesture, verified on-device).
  //
  // Both settle paths ALSO run the exact end clamp: even with
  // overScrollMode="never" a fast release can leave the offset a few px PAST
  // the content end and RN never pulls it back (verified on-device: content
  // stuck 16px into overscroll after an up-flick at the end) — and the next
  // detent change then inherits the residue as a visible content shift.
  const settleWithClamp = useCallback(
    (e) => {
      // A settle event ends any momentum phase (a fling that follows a drag
      // re-arms the flag via onMomentumScrollBegin afterwards).
      momentumActive.current = false;
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      dims.current = {
        y: contentOffset.y,
        viewH: layoutMeasurement.height,
        contentH: contentSize.height,
      };
      const ref = scrollRefRef.current;
      const { y, viewH, contentH } = dims.current;
      if (ref?.current && viewH > 0 && contentH > 0) {
        const maxY = Math.max(0, contentH - viewH);
        if (y > maxY + 1) {
          // scrollToEnd lands on the true native end offset (see recompute).
          ref.current.scrollToEnd?.({ animated: false });
          dims.current = { ...dims.current, y: maxY };
        }
      }
      recompute();
    },
    [recompute],
  );

  const onMomentumScrollBegin = useCallback(() => {
    momentumActive.current = true;
  }, []);

  const onLayout = useCallback(
    (e) => {
      dims.current = { ...dims.current, viewH: e.nativeEvent.layout.height };
      recompute();
    },
    [recompute],
  );

  const onContentSizeChange = useCallback(
    (_w, h) => {
      // "Was the pane pinned at its end BEFORE this commit?" — captured from
      // the pre-update dims. The native clamp only ever pulls the offset DOWN
      // (pad shrink); nothing pushes it UP when the pad RE-GROWS (bounce-back
      // settle to half, full→half drag, half→pill collapse). Without a
      // growth-side re-pin a failed expand leaves the offset ~100dp above the
      // end: the last card visibly sits lower than before the gesture, atEnd
      // flips off, the next up-swipe scrolls content instead of expanding the
      // sheet, and the NEXT expand inherits the shortfall as a content snap
      // (device-verified). Pinned-at-end is a stable identity here: tracking
      // the growth keeps the content visually stationary through the whole
      // bounce and preserves the end state across pill round-trips.
      // The scrollable guard is load-bearing: a NON-scrollable pane has
      // maxY = 0, so y = 0 satisfies "at end" trivially — without the guard
      // the NEXT tall content commit (incident A short → incident B tall on
      // the same mounted ScrollView) would re-pin a fresh pane to its BOTTOM.
      const { y: prevY, viewH: prevViewH, contentH: prevContentH } =
        dims.current;
      const wasAtEnd =
        prevViewH > 0 &&
        prevContentH > prevViewH + 8 &&
        prevY >= Math.max(0, prevContentH - prevViewH) - 2;
      dims.current = { ...dims.current, contentH: h };
      // Shrinking is left to Android's native clamp. A JS correction on every
      // content-size commit uses an older offset and visibly fights the clamp.
      if (!momentumActive.current) {
        const { y, viewH, contentH } = dims.current;
        if (viewH > 0 && contentH > 0) {
          const maxY = Math.max(0, contentH - viewH);
          if (wasAtEnd && maxY > y + 1) {
            scrollRefRef.current?.current?.scrollToEnd?.({
              animated: false,
            });
            dims.current = { ...dims.current, y: maxY };
          }
        }
      }
      recompute();
    },
    [recompute],
  );

  const onSheetMotionEnd = useCallback(() => {
    const { y, viewH, contentH } = dims.current;
    if (!scrollRefRef.current?.current || viewH <= 0 || contentH <= 0) return;
    const maxY = Math.max(0, contentH - viewH);
    if ((atEnd.current || y > maxY + 1) && Math.abs(y - maxY) > 1) {
      scrollRefRef.current.current.scrollToEnd?.({ animated: false });
      dims.current = { ...dims.current, y: maxY };
      recompute();
    }
  }, [recompute]);

  const reset = useCallback(() => {
    // Force the edge flags back to a fresh-scroll-top state, but PRESERVE the
    // measurements: on a same-mount content swap (incident A → B at the same
    // detent) onLayout does NOT re-fire (the view's layout is unchanged), so
    // zeroing viewH/contentH strands scrollable=false → scrollEnabled stuck
    // false → dead scroll until a full remount (pill → reopen "fixed" it —
    // verified on-device). Stale dims self-correct via the next
    // onScroll/onContentSizeChange; a fresh pane mount re-reports both anyway.
    dims.current = { ...dims.current, y: 0 };
    atTop.current = true;
    atEnd.current = false;
    const { viewH, contentH } = dims.current;
    const scrollable = contentH > 0 && viewH > 0 && contentH > viewH + 8;
    scrollableRef.current = scrollable;
    setEdges({ atTopNow: true, atEndNow: false, scrollableNow: scrollable });
    if (onFlipRef.current) onFlipRef.current();
  }, []);

  // Stable identity for the handler set — SheetScrollView registers this
  // object with the sheet's registry in an effect, so a fresh object per
  // render would churn it. Edge state values ride along (cheap re-creations
  // only when an edge actually flips).
  return useMemo(
    () => ({
      atTop,
      atEnd,
      atTopNow: edges.atTopNow,
      atEndNow: edges.atEndNow,
      scrollableNow: edges.scrollableNow,
      tailPad,
      // Live {y, viewH, contentH} — sheets with a position-animated bottom
      // pad read this to clamp a stale scroll offset while the pad shrinks.
      dims,
      onScroll,
      onScrollEndDrag: settleWithClamp,
      onMomentumScrollBegin,
      onMomentumScrollEnd: settleWithClamp,
      onLayout,
      onContentSizeChange,
      onSheetMotionEnd,
      reset,
    }),
    [
      edges,
      onScroll,
      settleWithClamp,
      onMomentumScrollBegin,
      onLayout,
      onContentSizeChange,
      onSheetMotionEnd,
      reset,
    ],
  );
}
