// Base-map styles for the mobile MapLibre view.
// Copied from the repo-root assets/map-style-{dark,light}.json (the web apps'
// source of truth) with two rewrites for the Android emulator:
//   sources.openmaptiles.url → http://10.0.2.2:8080/tiles  (Martin on the host)
//   glyphs → http://10.0.2.2:5173/fonts/{fontstack}/{range}.pbf
// DEV ONLY: the glyphs URL is served by user-web's Vite dev server (it copies
// assets/fonts into its public dir). For production both URLs must point at
// real hosted origins (tile server + font glyphs) — 10.0.2.2 only resolves
// from the Android emulator to the dev host.

import dark from '../../../assets/map/map-style-dark.json';
import light from '../../../assets/map/map-style-light.json';

export const MAP_STYLES = { dark, light };
