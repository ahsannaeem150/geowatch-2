import React, { useEffect, useMemo } from 'react';
import {
  BackHandler,
  StatusBar,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useOverlay } from '../../context/OverlayContext';
import TopBar from './components/TopBar';
import TimeStrip from './components/TimeStrip';
import SideControls from './components/SideControls';
import TabBar from './components/TabBar';

const GRID_GAP = 48;

// Placeholder map: dark surface with a subtle grid until MapLibre lands.
function MapGrid() {
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();

  const lines = useMemo(() => {
    const cols = Math.ceil(width / GRID_GAP);
    const rows = Math.ceil(height / GRID_GAP);
    const out = [];
    for (let i = 1; i < cols; i += 1) {
      out.push({ key: `v${i}`, left: i * GRID_GAP, top: 0, w: 1, h: height });
    }
    for (let j = 1; j < rows; j += 1) {
      out.push({ key: `h${j}`, left: 0, top: j * GRID_GAP, w: width, h: 1 });
    }
    return out;
  }, [width, height]);

  return (
    <View style={[styles.map, { backgroundColor: theme.bgDeep }]}>
      {lines.map((l) => (
        <View
          key={l.key}
          style={[
            styles.gridLine,
            {
              left: l.left,
              top: l.top,
              width: l.w,
              height: l.h,
              backgroundColor: theme.borderSubtle,
            },
          ]}
        />
      ))}
    </View>
  );
}

export default function MapScreen() {
  const { mode, theme } = useTheme();
  const { topOverlay, closeOverlay } = useOverlay();

  // Android hardware back closes the topmost overlay first; the app exits
  // only when the overlay stack is empty.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (topOverlay) {
        closeOverlay(topOverlay.id);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [topOverlay, closeOverlay]);

  return (
    <View style={[styles.root, { backgroundColor: theme.bgDeep }]}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
      />
      <MapGrid />
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
    ...StyleSheet.absoluteFillObject,
  },
  gridLine: {
    position: 'absolute',
    opacity: 0.5,
  },
});
