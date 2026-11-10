import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Mask,
  Path,
  Polygon,
  Rect,
  Stop,
} from 'react-native-svg';
import { FONTS } from '../../theme/tokens';
import { LAUNCH_IMAGES } from './launchAssets';

export function IntelMapMark({ size = 80, dotColor = '#f8fafc' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 240 240">
      <Defs>
        <LinearGradient id="brand" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#0e4f4a" />
          <Stop offset="1" stopColor="#14b8a6" />
        </LinearGradient>
      </Defs>
      <G fill="url(#brand)">
        <Rect x="70" y="76" width="44" height="8" rx="3.6" />
        <Rect x="106" y="76" width="8" height="42" rx="3.6" />
        <Rect x="70" y="114" width="44" height="8" rx="3.6" />
        <Rect x="70" y="118" width="8" height="42" rx="3.6" />
        <Rect x="70" y="152" width="44" height="8" rx="3.6" />
        <Rect x="126" y="76" width="8" height="42" rx="3.6" />
        <Rect x="162" y="76" width="8" height="42" rx="3.6" />
        <Rect x="126" y="114" width="44" height="8" rx="3.6" />
        <Rect x="162" y="118" width="8" height="42" rx="3.6" />
      </G>
      <Circle cx="186" cy="156" r="7" fill={dotColor} />
    </Svg>
  );
}

export function GlassGhostMark({ size = 22, color = '#f8fafc' }) {
  return (
    <Svg
      width={size * 1.46}
      height={size}
      viewBox="440 222 140 96">
      <Defs>
        <Mask
          id="slits"
          maskUnits="userSpaceOnUse"
          x="440"
          y="222"
          width="140"
          height="96">
          <Rect x="440" y="222" width="140" height="96" fill="#fff" />
          <Rect x="440" y="262" width="140" height="1.5" fill="#000" />
          <Rect x="440" y="269" width="140" height="2.5" fill="#000" />
          <Rect x="440" y="277" width="140" height="3.5" fill="#000" />
          <Rect x="440" y="285" width="140" height="4.5" fill="#000" />
          <Rect x="440" y="294" width="140" height="6" fill="#000" />
        </Mask>
        <G id="gg">
          <Path
            d="M21.448 -18.002 A28 28 0 1 0 28 0"
            fill="none"
            stroke={color}
            strokeWidth="10"
          />
          <Rect x="3.92" y="-5" width="24.08" height="10" fill={color} />
          <Polygon
            points="14,4.5 28.5,4.5 28.5,7 26,9 22,10.2 18,9 14,7"
            fill={color}
          />
        </G>
      </Defs>
      <G mask="url(#slits)">
        <G transform="translate(488 270)">
          <Path
            d="M21.448 -18.002 A28 28 0 1 0 28 0"
            fill="none"
            stroke={color}
            strokeWidth="10"
          />
          <Rect x="3.92" y="-5" width="24.08" height="10" fill={color} />
          <Polygon
            points="14,4.5 28.5,4.5 28.5,7 26,9 22,10.2 18,9 14,7"
            fill={color}
          />
        </G>
        <G transform="translate(532 270)">
          <Path
            d="M21.448 -18.002 A28 28 0 1 0 28 0"
            fill="none"
            stroke={color}
            strokeWidth="10"
          />
          <Rect x="3.92" y="-5" width="24.08" height="10" fill={color} />
          <Polygon
            points="14,4.5 28.5,4.5 28.5,7 26,9 22,10.2 18,9 14,7"
            fill={color}
          />
        </G>
      </G>
    </Svg>
  );
}

export function IntelMapLockup({ mode, width = 154, style }) {
  return (
    <Image
      source={mode === 'light' ? LAUNCH_IMAGES.lockupLight : LAUNCH_IMAGES.lockupDark}
      resizeMode="contain"
      style={[{ width, height: (width * 75) / 437 }, style]}
    />
  );
}

export function StudioCredit({ theme, compact = false }) {
  return (
    <View style={styles.studioRow}>
      <GlassGhostMark size={compact ? 16 : 20} color={theme.textPrimary} />
      <Text
        style={[
          styles.studioName,
          compact ? styles.studioNameCompact : styles.studioNameRegular,
          { color: theme.textPrimary },
        ]}>
        GLASSGHOST SOFTWARES
      </Text>
      <View style={[styles.studioDivider, { backgroundColor: theme.borderSubtle }]} />
      <Text style={[styles.studioTag, { color: theme.textSecondary }]}>
        PRESENTS
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  studioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  studioName: {
    fontFamily: FONTS.company,
    letterSpacing: 1.6,
  },
  studioNameCompact: {
    fontSize: 11,
  },
  studioNameRegular: {
    fontSize: 13,
  },
  studioDivider: {
    width: 1,
    height: 14,
    marginLeft: 2,
  },
  studioTag: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 1.6,
  },
});
