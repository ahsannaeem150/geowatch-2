import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, X } from 'lucide-react-native';
import { Camera, GeoJSONSource, Layer, Map } from '@maplibre/maplibre-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useMap } from '../../context/MapContext';
import { useSelection } from '../../context/SelectionContext';
import { MAP_STYLES } from '../../screens/map/mapStyles';
import { locationLine, severityOf } from './PreviewCard';

// Embedded map panel (prototype #emb-map): slides from the top over the
// origin surface during a list-driven preview. Real non-interactive mini
// MapLibre map (same bundled style as the main map): point incidents get a
// severity-colored marker at zoom ~10, zones render their polygon fitted to
// its bbox. All gestures + ornaments off; the real map stays behind.

function zoneBBox(geometry) {
  const pts = [];
  if (geometry?.type === 'Polygon') {
    pts.push(...(geometry.coordinates?.[0] || []));
  } else if (geometry?.type === 'MultiPolygon') {
    geometry.coordinates.forEach((p) => pts.push(...(p[0] || [])));
  }
  if (!pts.length) {
    return null;
  }
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  pts.forEach(([x, y]) => {
    west = Math.min(west, x);
    south = Math.min(south, y);
    east = Math.max(east, x);
    north = Math.max(north, y);
  });
  return [west, south, east, north];
}

export default function EmbeddedMapPanel() {
  const { mode, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { previewActive, item, closePreview } = useSelection();
  const { selectedKind } = useMap();
  const { height: windowHeight } = useWindowDimensions();
  const height = Math.round(windowHeight * 0.54);
  const visible = previewActive && !!item;
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      enter.setValue(0);
      Animated.timing(enter, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, enter]);

  if (!visible) {
    return null;
  }

  const isZone = selectedKind === 'zone';
  const pinColor = isZone
    ? item.zone_category_color || theme.accentLight
    : theme[`sev${severityOf(item)}`];

  const lat = parseFloat(item.latitude);
  const lng = parseFloat(item.longitude);
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lng);
  const bbox = isZone ? zoneBBox(item.geometry) : null;

  const viewState = bbox
    ? { bounds: bbox, padding: { top: 48, right: 48, bottom: 48, left: 48 } }
    : hasPoint
      ? { center: [lng, lat], zoom: 10 }
      : { center: [0, 20], zoom: 1 };

  const zoneFC =
    isZone && item.geometry
      ? {
          type: 'FeatureCollection',
          features: [{ type: 'Feature', geometry: item.geometry, properties: {} }],
        }
      : null;
  const pointFC =
    !isZone && hasPoint
      ? {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [lng, lat] },
              properties: {},
            },
          ],
        }
      : null;

  return (
    <Animated.View
      style={[
        styles.panel,
        {
          height,
          backgroundColor: theme.bgElevated,
          borderBottomColor: theme.borderSubtle,
          transform: [
            {
              translateY: enter.interpolate({
                inputRange: [0, 1],
                outputRange: [-height, 0],
              }),
            },
          ],
        },
      ]}>
      <View style={[styles.head, { paddingTop: insets.top + 10 }]}>
        <Pressable
          onPress={closePreview}
          hitSlop={8}
          style={[
            styles.headBtn,
            {
              backgroundColor: theme.bgGlass,
              borderColor: theme.borderSubtle,
            },
          ]}>
          <ChevronLeft size={17} color={theme.textPrimary} />
        </Pressable>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: theme.accentSubtleBg,
              borderColor: theme.accentLight,
            },
          ]}>
          <Text
            style={[
              styles.badgeText,
              { color: theme.accentLight, fontFamily: theme.fontMono },
            ]}>
            {isZone ? 'ZONE' : 'INCIDENT'}
          </Text>
        </View>
        <Text
          numberOfLines={1}
          style={[styles.loc, { color: theme.textSecondary }]}>
          {locationLine(item)}
        </Text>
        <Pressable
          onPress={closePreview}
          hitSlop={8}
          style={[styles.headBtn, { backgroundColor: theme.bgHover }]}>
          <X size={13} color={theme.textSecondary} />
        </Pressable>
      </View>
      <View style={styles.canvas}>
        <Map
          key={item.id}
          style={styles.miniMap}
          mapStyle={MAP_STYLES[mode]}
          // TextureView: same SwiftShader workaround as the main map.
          androidView="texture"
          attribution={false}
          logo={false}
          compass={false}
          scaleBar={false}
          dragPan={false}
          touchZoom={false}
          doubleTapZoom={false}
          doubleTapHoldZoom={false}
          touchRotate={false}
          touchPitch={false}>
          <Camera initialViewState={viewState} />
          {zoneFC ? (
            <GeoJSONSource id="emb-zone" data={zoneFC}>
              <Layer
                id="emb-zone-fill"
                type="fill"
                paint={{ 'fill-color': pinColor, 'fill-opacity': 0.2 }}
              />
              <Layer
                id="emb-zone-line"
                type="line"
                paint={{ 'line-color': pinColor, 'line-width': 2 }}
              />
            </GeoJSONSource>
          ) : null}
          {pointFC ? (
            <GeoJSONSource id="emb-point" data={pointFC}>
              <Layer
                id="emb-point-circle"
                type="circle"
                paint={{
                  'circle-color': pinColor,
                  'circle-radius': 7,
                  'circle-stroke-width': 2,
                  'circle-stroke-color': theme.bgDeep,
                }}
              />
            </GeoJSONSource>
          ) : null}
        </Map>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 14,
    paddingBottom: 10,
    zIndex: 4,
  },
  headBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.4,
  },
  loc: {
    flex: 1,
    fontSize: 11,
  },
  canvas: {
    flex: 1,
  },
  miniMap: {
    flex: 1,
  },
});
