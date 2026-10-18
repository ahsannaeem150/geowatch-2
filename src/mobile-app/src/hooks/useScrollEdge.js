import { useCallback, useMemo, useRef } from 'react';

// Scroll-edge tracker for the nested-scroll handoff (Google Maps pattern):
// a sheet's body ScrollView reports whether it is pinned at its top / bottom
// edge, and the sheet's capture responder only steals a vertical drag when
// the gesture would push PAST that edge (content top + drag down → collapse
// the sheet; content end + drag up → expand it). Between the edges the
// ScrollView keeps the gesture natively, so content scrolls untouched.
//
// atTop/atEnd are kept accurate from three sources because onScroll alone
// never fires for content shorter than the viewport.
export default function useScrollEdge() {
  const atTop = useRef(true);
  const atEnd = useRef(false);
  const tailPad = useRef(0);
  const dims = useRef({ y: 0, viewH: 0, contentH: 0 });

  const recompute = useCallback(() => {
    const { y, viewH, contentH } = dims.current;
    atTop.current = y <= 1;
    // Content shorter than the viewport counts as BOTH edges reached.
    // tailPad: bottom padding that exists only to compensate the sheet's
    // off-screen tail at a partial detent — scrolling INTO it already feels
    // like "the end" to the user, so the handoff fires there, not at the
    // pixel-perfect content end.
    atEnd.current =
      contentH > 0 &&
      viewH > 0 &&
      y + viewH >= contentH - tailPad.current - 8;
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
  }, []);

  // Stable identity — SheetScrollView registers this object with the sheet's
  // registry in an effect, so a fresh object per render would churn it.
  return useMemo(
    () => ({
      atTop,
      atEnd,
      tailPad,
      dims,
      onScroll,
      onLayout,
      onContentSizeChange,
      reset,
    }),
    [onScroll, onLayout, onContentSizeChange, reset],
  );
}
