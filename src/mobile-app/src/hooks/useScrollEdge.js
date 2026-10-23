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
    const { y, viewH, contentH } = dims.current;
    // Re-pin a stale scroll offset when the content height SHRINKS beneath
    // the offset. Sheets pad their body with a position-animated bottom
    // spacer that shrinks during an expand; RN does not reliably re-clamp
    // scrollY when the shrink lands under an in-flight momentum fling — the
    // native scroller keeps writing its pre-computed finalY and the pane
    // lands deep inside the pad: a blank white sheet whose content only
    // reappears after scrolling back (verified on-device). A non-animated
    // scrollTo cancels the fling AND clamps. The 40dp deadband is deliberate:
    // per-frame pad shrink overshoots by ≤ ~27dp, which RN's own
    // content-size clamp absorbs invisibly — instant-correcting those tiny
    // lags from JS lands a frame late and reads as a jerk (verified); only
    // fling-scale overshoots (hundreds of dp) are forced back.
    const ref = scrollRefRef.current;
    if (ref?.current && viewH > 0 && contentH > 0) {
      const maxY = Math.max(0, contentH - viewH);
      if (y > maxY + 40) {
        ref.current.scrollTo?.({ y: maxY, animated: false });
      }
    }
    const top = y <= 1;
    // Content shorter than the viewport counts as BOTH edges reached.
    // tailPad: bottom padding that exists only to compensate the sheet's
    // off-screen tail at a partial detent — scrolling INTO it already feels
    // like "the end" to the user, so the handoff fires there, not at the
    // pixel-perfect content end.
    const end =
      contentH > 0 &&
      viewH > 0 &&
      y + viewH >= contentH - tailPad.current - 8;
    // Whether the content actually overflows the viewport. A NON-scrollable
    // ScrollView still activates its RNGH native gesture instantly on touch
    // (nothing to wait for), which cancels the sheet's handoff pans before
    // they can fire — callers must pass scrollEnabled={scrollableNow} so the
    // dead scroll view stops competing (verified on-device).
    const scrollable = contentH > 0 && viewH > 0 && contentH > viewH + 8;
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
  const onSettle = useCallback(
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

  const onLayout = useCallback(
    (e) => {
      dims.current = { ...dims.current, viewH: e.nativeEvent.layout.height };
      recompute();
    },
    [recompute],
  );

  const onContentSizeChange = useCallback(
    (_w, h) => {
      dims.current = { ...dims.current, contentH: h };
      recompute();
    },
    [recompute],
  );

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
      onScrollEndDrag: onSettle,
      onMomentumScrollEnd: onSettle,
      onLayout,
      onContentSizeChange,
      reset,
    }),
    [edges, onScroll, onSettle, onLayout, onContentSizeChange, reset],
  );
}
