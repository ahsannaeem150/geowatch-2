import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dimensions } from 'react-native';
import { STORAGE_KEYS } from '../constants';
import { getIncident } from '../services/incidents.service';
import { subscribeSse } from '../services/sse.service';
import { zoneBBox, zoneCentroid } from '../utils/zoneGeometry';
import { useMap } from './MapContext';
import { useOverlay } from './OverlayContext';

// Selection state machine — the ONLY place peek/pill/drawer transitions live.
// RN port of the prototype flow (focusIncident/renderPeek/openDrawerFromPeek/
// closePeekToPill/closeDrawer/showSelPill/expandSelection/ghostSelected/
// previewItemOnMap/openEmbMap/closeEmbMap), with the prototype's global-flag
// overrides (maybeReturnToProfile, hideSelPill monkey-patches) replaced by an
// explicit origin stack.
//
// States (view):
//   idle      — nothing on screen (a selection ring may linger after a
//               preview closes; the next map tap clears it)
//   peek      — 46% bottom sheet with the preview card
//   pill      — compact selection bar above the tab bar
//   drawer    — full-detent sheet (incidents AND zones) / fullscreen page
//               (direct-mode incidents only)
//   evidence  — evidence sub-view, inline in the sheet (sheet flow) or
//               fullscreen (direct mode); back returns to the drawer
//
// Detail cache: the drawer's GET /incidents/:id result is kept per incident
// id so the peek upgrades to detail data once fetched and reopening the
// drawer is instant (prototype refetches every renderDrawer — wasteful).
//
// Origin stack (previewItemOnMap): previewing an item from a list surface
// opens EmbeddedMapPanel + PeekSheet ABOVE that surface. Fullscreen origins
// stay mounted underneath; sheet origins are closed and reopened on restore.
// Chain while an origin is active: drawer → peek+emb → origin
// surface (the pill stage is skipped — prototype closePeekToPill's 500ms
// pill flash is a known bug-farm and intentionally not ported).

const SelectionContext = createContext(null);

export const SEL_MODES = ['peek', 'compact', 'direct'];
const SEL_MODE_LABELS = {
  peek: 'Peek panel',
  compact: 'Compact bar',
  direct: 'Direct panel',
};

export function SelectionProvider({ children }) {
  const {
    incidents,
    zones,
    selectedId,
    selectedKind,
    selectItem,
    clearSelection,
    ghostItem,
    flyToSelection,
  } = useMap();
  const { openOverlay, closeOverlay, closeAll, showToast } = useOverlay();

  const [selMode, setSelModeState] = useState('peek');
  const [view, setView] = useState('idle');
  const [item, setItem] = useState(null);
  const [origin, setOrigin] = useState(null); // { type:'fullscreen' } | { type:'sheet', id }
  const [evidenceUpdate, setEvidenceUpdate] = useState(null);
  // View the evidence panel was opened from ('drawer' | 'peek') — back
  // returns there instead of hardcoding the drawer.
  const [evidenceFrom, setEvidenceFrom] = useState(null);
  // Live sheet detent ('half' | 'full'), written by PeekSheet. closeEvidence
  // reads it so back keeps the sheet where the user left it instead of
  // jumping to the detent the panel was originally opened at.
  const sheetLevelRef = useRef('half');
  // View history (prototype pushHistory): newest-first, deduped, cap 20,
  // persisted. Entries: { kind, id, when, item } — item is the full list-row
  // snapshot so preview-on-map works even after the date range moves on.
  const [history, setHistory] = useState([]);
  // incidentId → { incident, timeline } detail cache (drawer fetch, peek reads)
  const detailCache = useRef(new Map());

  // ─── Mode setting (persisted; surfaced in the Settings screen later) ───
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.SEL_MODE)
      .then((v) => {
        if (v && SEL_MODES.includes(v)) {
          setSelModeState(v);
        }
      })
      .catch(() => {});
  }, []);

  const setSelMode = useCallback(
    (mode) => {
      if (!SEL_MODES.includes(mode)) {
        return;
      }
      setSelModeState(mode);
      AsyncStorage.setItem(STORAGE_KEYS.SEL_MODE, mode).catch(() => {});
      showToast(`Selection: ${SEL_MODE_LABELS[mode]}`);
    },
    [showToast],
  );

  // ─── Detail cache ───

  // Fetch (or return cached) GET /incidents/:id → { incident, timeline }.
  // Errors propagate — the drawer owns its error/retry state.
  const fetchDetail = useCallback(async (id) => {
    const hit = detailCache.current.get(id);
    if (hit) {
      return hit;
    }
    const detail = await getIncident(id);
    detailCache.current.set(id, detail);
    return detail;
  }, []);

  const getCachedDetail = useCallback(
    (id) => detailCache.current.get(id) || null,
    [],
  );

  // SSE invalidation: an incident/timeline mutation drops the cached detail
  // so the next open (or a live drawer refetch) sees the fresh payload.
  useEffect(
    () =>
      subscribeSse((evt) => {
        if (!evt || typeof evt.type !== 'string') return;
        if (!evt.type.startsWith('incident_') && !evt.type.startsWith('timeline_')) return;
        const id = evt.incident?.id || evt.incident_id;
        if (id) {
          detailCache.current.delete(id);
        } else {
          detailCache.current.clear();
        }
      }),
    [],
  );

  // ─── View history (prototype pushHistory/clearHistory) ───
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.HISTORY)
      .then((raw) => {
        const parsed = raw ? JSON.parse(raw) : null;
        if (Array.isArray(parsed)) {
          setHistory(parsed.slice(0, 20));
        }
      })
      .catch(() => {});
  }, []);

  // Record on full-detail open (dedupe-to-front, cap 20).
  useEffect(() => {
    if (view !== 'drawer' || !item?.id) {
      return;
    }
    const entry = {
      kind: selectedKind === 'zone' ? 'zone' : 'incident',
      id: item.id,
      when: new Date().toISOString(),
      item,
    };
    setHistory((prev) => {
      const next = [
        entry,
        ...prev.filter((h) => !(h.kind === entry.kind && h.id === entry.id)),
      ].slice(0, 20);
      AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(next)).catch(
        () => {},
      );
      return next;
    });
  }, [view, item, selectedKind]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    AsyncStorage.setItem(STORAGE_KEYS.HISTORY, '[]').catch(() => {});
    showToast('History cleared');
  }, [showToast]);

  // ─── Evidence panel (prototype openEvidence/closeEvi) ───
  // Reachable from the drawer (incidents) and the zone sheet; back returns
  // to whichever surface opened it.
  const openEvidence = useCallback(
    (update) => {
      // Remember the surface the evidence was opened from so back lands
      // there again (peek half/full stays inside the bottom sheet).
      setEvidenceFrom(view);
      setEvidenceUpdate(update);
      setView('evidence');
    },
    [view],
  );

  const closeEvidence = useCallback(() => {
    // Return to the surface the panel came from, but at the CURRENT detent —
    // a user who dragged evidence to half and hits back lands on the detail
    // at half, not back at full.
    const lvl = sheetLevelRef.current;
    setView(lvl === 'half' ? 'peek' : 'drawer');
    setEvidenceFrom(null);
  }, []);

  // ─── Transitions ───

  // Smart selection camera (web parity): fly to the just-selected item.
  // source: 'map' (marker tap) | 'power-search' | 'list' (directories,
  // palette, bookmarks, history…). Padding mirrors the chrome about to open
  // so the target lands in the visible area (web measures the settled layout;
  // the mobile chrome is deterministic — top bar, and the sheet detent when
  // the selection opens one).
  const flyToItem = useCallback(
    (kind, selItem, source, nextView) => {
      if (!selItem) {
        return;
      }
      const { height: vh } = Dimensions.get('window');
      const padding = {
        top: 116, // top bar + LIVE pill row
        right: 24,
        left: 24,
        bottom:
          nextView === 'pill'
            ? 120 // compact bar height + margin
            : Math.round(vh * 0.46), // peek half-detent sheet
      };
      if (kind === 'zone') {
        const centroid = zoneCentroid(selItem.geometry);
        if (centroid) {
          flyToSelection({
            type: 'zone',
            source,
            lng: centroid[0],
            lat: centroid[1],
            bounds: zoneBBox(selItem.geometry),
            padding,
          });
        }
        return;
      }
      const lat = parseFloat(selItem.latitude);
      const lng = parseFloat(selItem.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        flyToSelection({ type: 'incident', source, lng, lat, padding });
      }
    },
    [flyToSelection],
  );

  // Map tap on a marker/zone. Ends any preview context and closes open
  // surfaces first (prototype focusIncident closes sheets/directories).
  // `itemObj` is an optional fallback for callers whose result set isn't the
  // map's currently-fetched range (command palette searches all time).
  const selectFromMap = useCallback(
    (id, kind, itemObj) => {
      const list = kind === 'zone' ? zones : incidents;
      const sel = list.find((i) => i.id === id) || itemObj || null;
      setItem(sel);
      setOrigin(null);
      setEvidenceUpdate(null);
      setEvidenceFrom(null);
      closeAll();
      selectItem(id, kind);
      let nextView;
      if (kind === 'zone') {
        nextView = 'peek'; // zones take the multi-detent sheet, mode-independent
      } else if (selMode === 'direct') {
        nextView = 'drawer';
      } else if (selMode === 'compact') {
        nextView = 'pill';
      } else {
        nextView = 'peek';
      }
      setView(nextView);
      flyToItem(kind, sel, 'map', nextView);
    },
    [incidents, zones, selMode, selectItem, closeAll, flyToItem],
  );

  // Preview a list item on the map from a directory/power-search/profile
  // surface. origin: { type: 'fullscreen' } | { type: 'sheet', id }.
  // source feeds the selection-camera policy ('list' default; the power
  // search screen passes 'power-search' for its pan-only rule).
  const previewItemOnMap = useCallback(
    (kind, previewItem, from, source = 'list') => {
      const orig = from ?? null;
      if (orig?.type === 'sheet') {
        closeOverlay(orig.id); // remembered — reopened on restore
      }
      setOrigin(orig);
      setItem(previewItem);
      setEvidenceUpdate(null);
      setEvidenceFrom(null);
      selectItem(previewItem.id, kind);
      setView('peek');
      flyToItem(kind, previewItem, source, 'peek');
    },
    [closeOverlay, selectItem, flyToItem],
  );

  // Preview close: emb + peek/drawer chain ends; the origin
  // surface is restored with the item still selected (ring + row highlight).
  const closePreview = useCallback(() => {
    setView('idle');
    setEvidenceUpdate(null);
    setEvidenceFrom(null);
    if (origin?.type === 'sheet') {
      openOverlay({ id: origin.id, type: 'sheet' });
    }
    setOrigin(null);
  }, [origin, openOverlay]);

  // "View on map" from the embedded panel: end the preview (no origin
  // restore) but keep the item selected as the map pill — the caller closes
  // the overlay stack, leaving the ring + pill on the main map.
  const sendPreviewToMap = useCallback(() => {
    setOrigin(null);
    setEvidenceUpdate(null);
    setEvidenceFrom(null);
    setView('pill');
  }, []);

  // Peek drag-down → collapse to the pill (same target as a map tap).
  const collapsePeek = useCallback(() => {
    setView('pill');
  }, []);

  // Sheet full detent drag-down → back to the half detent (peek).
  const collapseToPeek = useCallback(() => {
    setEvidenceUpdate(null);
    setEvidenceFrom(null);
    setView('peek');
  }, []);

  // Peek tap / drag-up → full-detent sheet (incidents and zones alike).
  const expandFromPeek = useCallback(() => {
    setView('drawer');
  }, []);

  // Pill tap → half-detent bottom sheet (prototype expandSelection). A pill
  // reached FROM the evidence panel restores that panel — the pill is a
  // minimize, not a reset to the timeline.
  const expandFromPill = useCallback(() => {
    setView(evidenceUpdate ? 'evidence' : 'peek');
  }, [evidenceUpdate]);

  // Full-detent back (also the evidence ✕ — closes both layers):
  // preview → peek+emb; plain selection → pill.
  const closeDrawer = useCallback(() => {
    setEvidenceUpdate(null);
    setEvidenceFrom(null);
    setView(origin ? 'peek' : 'pill');
  }, [origin]);

  // Clear: pill back / empty-map tap with pill → deselect, ring removed.
  const dismissSelection = useCallback(() => {
    setView('idle');
    setItem(null);
    setEvidenceUpdate(null);
    setEvidenceFrom(null);
    clearSelection();
  }, [clearSelection]);

  // Map press (not a marker/pill): the collapse/clear step of the chain.
  const handleMapPress = useCallback(() => {
    switch (view) {
      case 'peek':
        if (origin) {
          closePreview();
        } else {
          setView('pill');
        }
        break;
      case 'pill':
        dismissSelection();
        break;
      case 'drawer':
      case 'evidence':
        break; // full sheet stays put — gestures/back handle it
      default:
        clearSelection(); // idle: clears a lingering post-preview ring
    }
  }, [view, origin, closePreview, dismissSelection, clearSelection]);

  // Hardware back walks the chain before falling through to the overlay
  // stack (MapScreen consults this first).
  const handleBack = useCallback(() => {
    switch (view) {
      case 'evidence':
        closeEvidence();
        return true;
      case 'drawer':
        // Sheet flow steps back to the half detent; direct mode uses the
        // fullscreen drawer's own back (→ pill/peek).
        if (selMode === 'direct' || origin) {
          closeDrawer();
        } else {
          collapseToPeek();
        }
        return true;
      case 'peek':
        if (origin) {
          closePreview();
        } else {
          setView('pill');
        }
        return true;
      case 'pill':
        dismissSelection();
        return true;
      default:
        return false;
    }
  }, [view, origin, selMode, closeEvidence, closeDrawer, collapseToPeek, closePreview, dismissSelection]);

  // Embedded map panel is open for the whole preview except the resting
  // state (it stays mounted under the drawer, prototype keeps it open).
  const previewActive = !!origin && view !== 'idle';
  // Prototype ghostSelected(): pill title reflects the out-of-range state.
  const isGhost = !!ghostItem && ghostItem.id === selectedId;

  const value = useMemo(
    () => ({
      selMode,
      setSelMode,
      view,
      item,
      origin,
      evidenceUpdate,
      evidenceFrom,
      previewActive,
      isGhost,
      selectFromMap,
      previewItemOnMap,
      closePreview,
      sendPreviewToMap,
      expandFromPeek,
      collapsePeek,
      collapseToPeek,
      expandFromPill,
      closeDrawer,
      dismissSelection,
      handleMapPress,
      handleBack,
      fetchDetail,
      getCachedDetail,
      openEvidence,
      closeEvidence,
      sheetLevelRef,
      history,
      clearHistory,
    }),
    [
      selMode,
      setSelMode,
      view,
      item,
      origin,
      evidenceUpdate,
      evidenceFrom,
      previewActive,
      isGhost,
      selectFromMap,
      previewItemOnMap,
      closePreview,
      sendPreviewToMap,
      expandFromPeek,
      collapsePeek,
      collapseToPeek,
      expandFromPill,
      closeDrawer,
      dismissSelection,
      handleMapPress,
      handleBack,
      fetchDetail,
      getCachedDetail,
      openEvidence,
      closeEvidence,
      history,
      clearHistory,
    ],
  );

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) {
    throw new Error('useSelection must be used within SelectionProvider');
  }
  return ctx;
}

export default SelectionContext;
