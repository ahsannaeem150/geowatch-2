import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';
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
//   drawer    — fullscreen incident details (stub body for now)
//   zoneSheet — 62% bottom sheet with zone stats
//
// Origin stack (previewItemOnMap): previewing an item from a list surface
// opens EmbeddedMapPanel + PeekSheet ABOVE that surface. Fullscreen origins
// stay mounted underneath; sheet origins are closed and reopened on restore.
// Chain while an origin is active: drawer/zoneSheet → peek+emb → origin
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
  } = useMap();
  const { openOverlay, closeOverlay, closeAll, showToast } = useOverlay();

  const [selMode, setSelModeState] = useState('peek');
  const [view, setView] = useState('idle');
  const [item, setItem] = useState(null);
  const [origin, setOrigin] = useState(null); // { type:'fullscreen' } | { type:'sheet', id }

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

  // ─── Transitions ───

  // Map tap on a marker/zone. Ends any preview context and closes open
  // surfaces first (prototype focusIncident closes sheets/directories).
  const selectFromMap = useCallback(
    (id, kind) => {
      const list = kind === 'zone' ? zones : incidents;
      setItem(list.find((i) => i.id === id) || null);
      setOrigin(null);
      closeAll();
      selectItem(id, kind);
      if (kind === 'zone') {
        setView('zoneSheet'); // zones always take the sheet, mode-independent
      } else if (selMode === 'direct') {
        setView('drawer');
      } else if (selMode === 'compact') {
        setView('pill');
      } else {
        setView('peek');
      }
    },
    [incidents, zones, selMode, selectItem, closeAll],
  );

  // Preview a list item on the map from a directory/power-search/profile
  // surface. origin: { type: 'fullscreen' } | { type: 'sheet', id }.
  const previewItemOnMap = useCallback(
    (kind, previewItem, from) => {
      const orig = from ?? null;
      if (orig?.type === 'sheet') {
        closeOverlay(orig.id); // remembered — reopened on restore
      }
      setOrigin(orig);
      setItem(previewItem);
      selectItem(previewItem.id, kind);
      setView('peek');
    },
    [closeOverlay, selectItem],
  );

  // Preview close: emb + peek/drawer/zoneSheet chain ends; the origin
  // surface is restored with the item still selected (ring + row highlight).
  const closePreview = useCallback(() => {
    setView('idle');
    if (origin?.type === 'sheet') {
      openOverlay({ id: origin.id, type: 'sheet' });
    }
    setOrigin(null);
  }, [origin, openOverlay]);

  // Peek tap → full details (drawer for incidents, the bigger sheet zones).
  const expandFromPeek = useCallback(() => {
    setView(selectedKind === 'zone' ? 'zoneSheet' : 'drawer');
  }, [selectedKind]);

  // Pill tap → full details (all modes; prototype expandSelection).
  const expandFromPill = useCallback(() => {
    setView(selectedKind === 'zone' ? 'zoneSheet' : 'drawer');
  }, [selectedKind]);

  // Drawer/zoneSheet back: preview → peek+emb; plain selection → pill.
  const closeDrawer = useCallback(() => {
    setView(origin ? 'peek' : 'pill');
  }, [origin]);

  const closeZoneSheet = useCallback(() => {
    setView(origin ? 'peek' : 'pill');
  }, [origin]);

  // Clear: pill back / empty-map tap with pill → deselect, ring removed.
  const dismissSelection = useCallback(() => {
    setView('idle');
    setItem(null);
    clearSelection();
  }, [clearSelection]);

  // Map press (not a marker/pill): the collapse/clear step of the chain.
  const handleMapPress = useCallback(() => {
    switch (view) {
      case 'peek':
      case 'zoneSheet':
        if (origin) {
          closePreview();
        } else {
          setView('pill');
        }
        break;
      case 'pill':
        dismissSelection();
        break;
      default:
        clearSelection(); // idle: clears a lingering post-preview ring
    }
  }, [view, origin, closePreview, dismissSelection, clearSelection]);

  // Hardware back walks the chain before falling through to the overlay
  // stack (MapScreen consults this first).
  const handleBack = useCallback(() => {
    switch (view) {
      case 'drawer':
        closeDrawer();
        return true;
      case 'zoneSheet':
        closeZoneSheet();
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
  }, [view, origin, closeDrawer, closeZoneSheet, closePreview, dismissSelection]);

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
      previewActive,
      isGhost,
      selectFromMap,
      previewItemOnMap,
      closePreview,
      expandFromPeek,
      expandFromPill,
      closeDrawer,
      closeZoneSheet,
      dismissSelection,
      handleMapPress,
      handleBack,
    }),
    [
      selMode,
      setSelMode,
      view,
      item,
      origin,
      previewActive,
      isGhost,
      selectFromMap,
      previewItemOnMap,
      closePreview,
      expandFromPeek,
      expandFromPill,
      closeDrawer,
      closeZoneSheet,
      dismissSelection,
      handleMapPress,
      handleBack,
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
