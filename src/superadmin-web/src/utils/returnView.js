/**
 * Return-view helper for the map ↔ full-page detail navigation.
 *
 * When the user leaves /superadmin/map for a full-page incident/zone view,
 * MapPage saves a `intelmap24_superadmin_return_view` payload in sessionStorage
 * (camera + layout context). Back navigation targets the URL built here so the
 * map mounts with the camera already in the URL: `initialViewport` then
 * initializes the map directly at the saved view (no fly-from-default) and the
 * mount-time viewport snapshot makes the deep-link selection skip its flight
 * entirely.
 */
export function buildReturnMapUrl() {
  try {
    const raw = sessionStorage.getItem('intelmap24_superadmin_return_view');
    if (!raw) return '/superadmin/map';
    const payload = JSON.parse(raw);
    const { lat, lng, zoom, selectedIncidentId, selectedZoneId } = payload || {};
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(zoom)) {
      return '/superadmin/map';
    }
    const params = new URLSearchParams();
    params.set('lat', Number(lat).toFixed(6));
    params.set('lng', Number(lng).toFixed(6));
    params.set('zoom', Number(zoom).toFixed(2));
    if (selectedZoneId) params.set('zone', selectedZoneId);
    else if (selectedIncidentId) params.set('incident', selectedIncidentId);
    return `/superadmin/map?${params.toString()}`;
  } catch {
    return '/superadmin/map';
  }
}
