// Base-map styles for the mobile MapLibre view.
// Copied from the repo-root assets/map-style-{dark,light}.json (the web apps'
// source of truth) with rewritten URLs:
//   sources.openmaptiles.url → Martin tiles (:8080)
//   glyphs → backend static /fonts (:3100 — Express serves assets/fonts, so no
//            user-web dependency; production: same route on the deployed API)
// The bundled JSONs keep the emulator host (10.0.2.2); rewrite it to DEV_HOST
// at load time so physical devices (adb reverse → 127.0.0.1) work too.

import darkJson from '../../../assets/map/map-style-dark.json';
import lightJson from '../../../assets/map/map-style-light.json';
import { DEV_HOST } from '../../constants';

function rehost(style) {
  return JSON.parse(JSON.stringify(style).replaceAll('10.0.2.2', DEV_HOST));
}

export const MAP_STYLES = { dark: rehost(darkJson), light: rehost(lightJson) };
