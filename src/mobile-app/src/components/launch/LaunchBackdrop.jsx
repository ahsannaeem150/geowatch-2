import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Line, RadialGradient, Stop } from 'react-native-svg';

export default function LaunchBackdrop({ theme, mode }) {
  const gridOpacity = mode === 'dark' ? 0.62 : 0.34;
  const crossGridOpacity = mode === 'dark' ? 0.5 : 0.28;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg height="420" width="100%" style={styles.auraSvg}>
        <Defs>
          <RadialGradient id="launch-aura">
            <Stop offset="0" stopColor={theme.accentLight} stopOpacity="0.16" />
            <Stop offset="0.55" stopColor={theme.accentLight} stopOpacity="0.07" />
            <Stop offset="1" stopColor={theme.accentLight} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx="50%" cy="-40" r="380" fill="url(#launch-aura)" />
      </Svg>
      <Svg width="100%" height="100%" style={styles.grid}>
        {[56, 116, 176, 236, 296, 356].map((x) => (
          <Line
            key={`x-${x}`}
            x1={x}
            y1="0"
            x2={x - 100}
            y2="100%"
            stroke={theme.borderSubtle}
            strokeWidth="0.6"
            opacity={gridOpacity}
          />
        ))}
        {[120, 260, 400, 540, 680, 820].map((y) => (
          <Line
            key={`y-${y}`}
            x1="0"
            y1={y}
            x2="100%"
            y2={y + 90}
            stroke={theme.borderSubtle}
            strokeWidth="0.6"
            opacity={crossGridOpacity}
          />
        ))}
      </Svg>
      <View style={[styles.vignette, { backgroundColor: theme.bgDeep }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  auraSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  grid: {
    position: 'absolute',
    inset: 0,
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.18,
  },
});
