import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, GeoJSONSource, Layer, Map } from '@maplibre/maplibre-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useOverlay } from '../../context/OverlayContext';
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  useMap,
} from '../../context/MapContext';
import { useSelection } from '../../context/SelectionContext';
import { ZONE_OVERLAYS } from '../../constants';
import { MAP_STYLES } from './mapStyles';
import TopBar from './components/TopBar';
import TimeStrip from './components/TimeStrip';
import SideControls from './components/SideControls';
import TabBar from './components/TabBar';

function severityColor(theme, sev) {
  const n = Math.min(Math.max(parseInt(sev, 10) || 3, 1), 5);
  return theme[`sev${n}`];
}

// Zone rows carry no category slug — match on zone_category_name (the mobile
// constants mirror the backend zone_categories names 1:1).
function zoneOverlayFor(name) {
  return ZONE_OVERLAYS.find((z) => z.name === name) || null;
}

function zoneCode(name) {
  const overlay = zoneOverlayFor(name);
  if (overlay) {
    return overlay.code;
  }
  return (name || '??')
    .split(/[\s-]+/)
    .map((w) => w[0] || '')
    .join('')
    .slice(0, 3)
    .toLowerCase();
}

// Filter expression matching the selected feature on a layer of the same
// source (mirrors the web rule: selection styling is a separate layer/effect).
function selectedFilter(selectedId, selectedKind, kind) {
  return [
    '==',
    ['get', 'id'],
    selectedKind === kind && selectedId ? selectedId : '__none__',
  ];
}

// Loading skeleton: three pulsing blocks + mono label, floats under TimeStrip.
function LoadingPill() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const pulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View
      style={[
        styles.loadingPill,
        {
          top: insets.top + 112,
          backgroundColor: theme.bgGlass,
          borderColor: theme.borderSubtle,
        },
      ]}
      pointerEvents="none">
      <Animated.View style={[styles.loadingBars, { opacity: pulse }]}>
        <View
          style={[styles.loadingBar, { backgroundColor: theme.accentLight }]}
        />
        <View
          style={[styles.loadingBar, { backgroundColor: theme.accentLight }]}
        />
        <View
          style={[styles.loadingBar, { backgroundColor: theme.accentLight }]}
        />
      </Animated.View>
      <Text
        style={[
          styles.loadingText,
          { color: theme.textMuted, fontFamily: theme.fontMono },
        ]}>
        LOADING
      </Text>
    </View>
  );
}

// Large-range gate hint (mirrors the web "zoom in to load incidents" banner).
function GateHint() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.gateHint,
        {
          bottom: insets.bottom + 104,
          backgroundColor: theme.bgGlass,
          borderColor: theme.accentSubtleBorder,
        },
      ]}
      pointerEvents="none">
      <Text
        style={[
          styles.gateText,
          { color: theme.accentLight, fontFamily: theme.fontMono },
        ]}>
        ZOOM IN TO LOAD INCIDENTS
      </Text>
    </View>
  );
}

export default function MapScreen() {
  const { mode, theme } = useTheme();
  const { topOverlay, closeOverlay, stack } = useOverlay();
  const {
    incidents,
    zones,
    loading,
    isRangeGated,
    selectedId,
    selectedKind,
    ghostItem,
    layerVisibility,
    cameraRef,
    handleRegionChange,
  } = useMap();
  const {
    handleBack: handleSelectionBack,
    handleMapPress,
    selectFromMap,
    view: selectionView,
  } = useSelection();

  // Android hardware back goes to whatever is visually topmost (mirrors the
  // prototype z-order): modal (80) > drawer/zoneSheet/peek (65–70) > stack
  // overlays (55–66) > pill (32). The selection chain walks drawer →
  // peek/pill → deselect-or-restore-origin before the app exits.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const hasModal = stack.some((o) => o.type === 'modal');
      const selectionOnTop =
        !hasModal &&
        (selectionView === 'drawer' ||
          selectionView === 'zoneSheet' ||
          selectionView === 'peek');
      if (selectionOnTop && handleSelectionBack()) {
        return true;
      }
      if (topOverlay) {
        closeOverlay(topOverlay.id);
        return true;
      }
      return handleSelectionBack();
    });
    return () => sub.remove();
  }, [topOverlay, closeOverlay, handleSelectionBack, stack, selectionView]);

  // Client-side layer filters: fetch everything permitted, hide by
  // domain/zone-category per the Layers sheet toggles.
  const incidentsFC = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: incidents
        .filter((i) => layerVisibility.domains[i.domain_slug] !== false)
        .filter(
          (i) =>
            Number.isFinite(parseFloat(i.latitude)) &&
            Number.isFinite(parseFloat(i.longitude)),
        )
        .map((i) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [parseFloat(i.longitude), parseFloat(i.latitude)],
          },
          properties: {
            id: i.id,
            kind: 'incident',
            severity: i.severity,
            color: severityColor(theme, i.severity),
          },
        })),
    }),
    [incidents, layerVisibility, theme],
  );

  const zonesFC = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: zones
        .filter(
          (z) =>
            z.geometry &&
            (z.geometry.type === 'Polygon' ||
              z.geometry.type === 'MultiPolygon'),
        )
        .filter((z) => {
          const overlay = zoneOverlayFor(z.zone_category_name);
          return overlay ? layerVisibility.zones[overlay.slug] !== false : true;
        })
        .map((z) => ({
          type: 'Feature',
          geometry: z.geometry,
          properties: {
            id: z.id,
            kind: 'zone',
            color: z.zone_category_color || theme.accentLight,
            code: zoneCode(z.zone_category_name),
          },
        })),
    }),
    [zones, layerVisibility, theme],
  );

  // Ghosted selection: the item fell out of the fetched date range — keep it
  // rendered greyed until the selection changes (prototype ghostSelected()).
  const ghostFC = useMemo(() => {
    if (!ghostItem) {
      return null;
    }
    const isZone = ghostItem.__kind === 'zone';
    let geometry = null;
    if (isZone) {
      geometry = ghostItem.geometry || null;
    } else if (
      Number.isFinite(parseFloat(ghostItem.latitude)) &&
      Number.isFinite(parseFloat(ghostItem.longitude))
    ) {
      geometry = {
        type: 'Point',
        coordinates: [
          parseFloat(ghostItem.longitude),
          parseFloat(ghostItem.latitude),
        ],
      };
    }
    if (!geometry) {
      return null;
    }
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry,
          properties: { id: ghostItem.id, kind: isZone ? 'zone' : 'incident' },
        },
      ],
    };
  }, [ghostItem]);

  // One press handler per source (NOT per feature): reads current context
  // state at event time — no stale closures. Selection flow lives entirely
  // in SelectionContext (peek/pill/drawer by mode, zones → sheet).
  const handleIncidentPress = useCallback(
    (event) => {
      event.stopPropagation?.();
      const id = event.nativeEvent?.features?.[0]?.properties?.id;
      if (id) {
        selectFromMap(id, 'incident');
      }
    },
    [selectFromMap],
  );

  const handleZonePress = useCallback(
    (event) => {
      event.stopPropagation?.();
      const id = event.nativeEvent?.features?.[0]?.properties?.id;
      if (id) {
        selectFromMap(id, 'zone');
      }
    },
    [selectFromMap],
  );

  const handleRegionDidChange = useCallback(
    (event) => {
      handleRegionChange(event.nativeEvent);
    },
    [handleRegionChange],
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.bgDeep }]}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
      />
      <Map
        style={styles.map}
        mapStyle={MAP_STYLES[mode]}
        // GLSurfaceView ("surface") renders corrupt tiles/text under the
        // emulator's SwiftShader GL stack; TextureView + the Vulkan variant
        // (gradle.properties nativeVariant=vulkan) renders correctly.
        androidView="texture"
        onRegionDidChange={handleRegionDidChange}
        onPress={handleMapPress}
        attributionPosition={{ bottom: 6, right: 6 }}
        logoPosition={{ bottom: 6, left: 6 }}>
        <Camera
          ref={cameraRef}
          initialViewState={{ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM }}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
        />
        <GeoJSONSource id="zones" data={zonesFC} onPress={handleZonePress}>
          <Layer
            id="zone-fill"
            type="fill"
            paint={{ 'fill-color': ['get', 'color'], 'fill-opacity': 0.15 }}
          />
          <Layer
            id="zone-line"
            type="line"
            paint={{
              'line-color': ['get', 'color'],
              'line-width': 1.5,
              'line-dasharray': [2, 2],
            }}
          />
          <Layer
            id="zone-selected"
            type="line"
            filter={selectedFilter(selectedId, selectedKind, 'zone')}
            paint={{ 'line-color': theme.accentLight, 'line-width': 3 }}
          />
          <Layer
            id="zone-label"
            type="symbol"
            layout={{
              'text-field': ['get', 'code'],
              'text-font': ['Noto Sans Bold'],
              'text-size': 10,
              'text-allow-overlap': true,
            }}
            paint={{
              'text-color': ['get', 'color'],
              'text-halo-color': theme.bgDeep,
              'text-halo-width': 1.5,
            }}
          />
        </GeoJSONSource>
        <GeoJSONSource
          id="incidents"
          data={incidentsFC}
          onPress={handleIncidentPress}>
          <Layer
            id="incident-circle"
            type="circle"
            paint={{
              'circle-color': ['get', 'color'],
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                2,
                3,
                6,
                5,
                12,
                8,
              ],
              'circle-opacity': 0.9,
              'circle-stroke-width': 1,
              'circle-stroke-color': theme.bgDeep,
            }}
          />
          <Layer
            id="incident-selected-ring"
            type="circle"
            filter={selectedFilter(selectedId, selectedKind, 'incident')}
            paint={{
              'circle-color': 'rgba(0,0,0,0)',
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                2,
                7,
                6,
                9,
                12,
                13,
              ],
              'circle-stroke-width': 2,
              'circle-stroke-color': theme.accentLight,
            }}
          />
        </GeoJSONSource>
        {ghostFC ? (
          <GeoJSONSource id="ghost" data={ghostFC}>
            <Layer
              id="ghost-fill"
              type="fill"
              filter={['==', ['get', 'kind'], 'zone']}
              paint={{ 'fill-color': theme.textMuted, 'fill-opacity': 0.08 }}
            />
            <Layer
              id="ghost-line"
              type="line"
              filter={['==', ['get', 'kind'], 'zone']}
              paint={{
                'line-color': theme.textMuted,
                'line-width': 1.5,
                'line-dasharray': [2, 2],
                'line-opacity': 0.6,
              }}
            />
            <Layer
              id="ghost-circle"
              type="circle"
              filter={['==', ['get', 'kind'], 'incident']}
              paint={{
                'circle-color': theme.textMuted,
                'circle-radius': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  2,
                  3,
                  6,
                  5,
                  12,
                  8,
                ],
                'circle-opacity': 0.5,
                'circle-stroke-width': 1,
                'circle-stroke-color': theme.bgDeep,
              }}
            />
          </GeoJSONSource>
        ) : null}
      </Map>
      {loading ? <LoadingPill /> : null}
      {isRangeGated ? <GateHint /> : null}
      <TopBar />
      <TimeStrip />
      <SideControls />
      <TabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingPill: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    borderWidth: 1,
    zIndex: 35,
  },
  loadingBars: {
    flexDirection: 'row',
    gap: 3,
  },
  loadingBar: {
    width: 10,
    height: 3,
    borderRadius: 2,
  },
  loadingText: {
    fontSize: 9,
    letterSpacing: 1.6,
  },
  gateHint: {
    position: 'absolute',
    alignSelf: 'center',
    height: 30,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 15,
    borderWidth: 1,
    zIndex: 35,
  },
  gateText: {
    fontSize: 9,
    letterSpacing: 1.6,
  },
});
