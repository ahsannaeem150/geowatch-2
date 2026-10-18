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
export default function useScrollEdge(onFlip) {
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

  const recompute = useCallback(() => {
    const { y, viewH, contentH } = dims.current;
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
    dims.current = { y: 0, viewH: 0, contentH: 0 };
    atTop.current = true;
    atEnd.current = false;
    scrollableRef.current = false;
    setEdges({ atTopNow: true, atEndNow: false, scrollableNow: false });
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
      onScroll,
      onLayout,
      onContentSizeChange,
      reset,
    }),
    [edges, onScroll, onLayout, onContentSizeChange, reset],
  );
}
