/**
 * Compute MapLibre padding options so that flyTo/easeTo/fitBounds target the
 * visible map rectangle inside admin-web's map viewport.
 *
 * IMPORTANT: The map container is already narrowed by the flex-layout chrome
 * (left rail and right detail panel). This function therefore returns only the
 * widths of elements that ABSOLUTELY OVERLAY the map container:
 *   - the left workspace drawer
 *   - the power-search filter + results rails
 *
 * Values are in CSS pixels.
 */
export function computeMapPadding({
  scale = 1,
  powerSearchMode = false,
  psFilterCollapsed = false,
  psResultsCollapsed = false,
  activeDrawer = null,
  focusMode = false,
  isPanelOpen = false,
  rightPanelCollapsed = false,
}) {
  // Base widths before compact-mode scaling.
  const DRAWER_WIDTH = 360;
  const PS_FILTER_WIDTH = 260;
  const PS_FILTER_COLLAPSED = 44;
  const PS_RESULTS_WIDTH = 300;
  const RIGHT_PANEL_WIDTH = 630;

  let left = 0;

  if (powerSearchMode) {
    const filterWidth = psFilterCollapsed ? PS_FILTER_COLLAPSED : PS_FILTER_WIDTH;
    const resultsWidth = psResultsCollapsed ? 0 : PS_RESULTS_WIDTH;
    left = (filterWidth + resultsWidth) * scale;
  } else if (!focusMode && activeDrawer) {
    left = DRAWER_WIDTH * scale;
  }

  // The right detail panel is now rendered as an absolute overlay that slides
  // in with transform. The map container itself no longer shrinks, so we tell
  // MapLibre to treat the panel area as right padding instead.
  const right = isPanelOpen && !rightPanelCollapsed ? RIGHT_PANEL_WIDTH * scale : 0;

  return {
    top: 0,
    right,
    bottom: 0,
    left,
  };
}

/**
 * Full visible-area padding relative to the outer dashboard container. Used for
 * floating overlays like the ghost-incident banner that live at the dashboard
 * root and must account for both flex-layout chrome and absolute overlays.
 */
export function computeOuterContainerPadding({
  scale = 1,
  powerSearchMode = false,
  psFilterCollapsed = false,
  psResultsCollapsed = false,
  activeDrawer = null,
  focusMode = false,
  isPanelOpen = false,
  rightPanelCollapsed = false,
}) {
  const RAIL_WIDTH = 64;
  const RIGHT_PANEL_WIDTH = 630;

  const mapPadding = computeMapPadding({
    scale,
    powerSearchMode,
    psFilterCollapsed,
    psResultsCollapsed,
    activeDrawer,
    focusMode,
  });

  // Rail is only visible outside power-search mode.
  const rail = powerSearchMode ? 0 : RAIL_WIDTH * scale;
  const rightPanel = isPanelOpen && !rightPanelCollapsed ? RIGHT_PANEL_WIDTH * scale : 0;

  return {
    top: 0,
    right: rightPanel,
    bottom: 0,
    left: rail + mapPadding.left,
  };
}
