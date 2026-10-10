// "While you were away" banner (prototype #away-banner) — slides in under the
// TimeStrip after a >15min absence that gained alerts. View → dismiss + open
// the Activity sheet; ✕ → dismiss. Shown from MapScreen via LiveContext.

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RefreshCw, X } from 'lucide-react-native';
import { useTheme } from '../../../context/ThemeContext';
import { useLive } from '../../../context/LiveContext';

export default function AwayBanner() {
  const { theme } = useTheme();
  const { awayBanner, dismissAway } = useLive();
  const insets = useSafeAreaInsets();
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter]);

  if (!awayBanner) {
    return null;
  }

  const parts = [];
  if (awayBanner.newCount) {
    parts.push(`${awayBanner.newCount} NEW INCIDENT${awayBanner.newCount > 1 ? 'S' : ''}`);
  }
  if (awayBanner.updateCount) {
    parts.push(`${awayBanner.updateCount} UPDATE${awayBanner.updateCount > 1 ? 'S' : ''}`);
  }

  const translateY = enter.interpolate({
    inputRange: [0, 1],
    outputRange: [-90, 0],
  });

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          top: insets.top + 112,
          backgroundColor: theme.accent,
          borderColor: theme.accentLight,
          opacity: enter,
          transform: [{ translateY }],
        },
      ]}>
      <View style={styles.iconTile}>
        <RefreshCw size={17} color={theme.accentLight} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          While you were away
        </Text>
        <Text
          style={[styles.sub, { color: theme.accentLight, fontFamily: theme.fontMono }]}
          numberOfLines={1}>
          {parts.join(' · ')}
        </Text>
      </View>
      <Pressable
        onPress={() => dismissAway(true)}
        style={({ pressed }) => [
          styles.viewBtn,
          { backgroundColor: theme.accent },
          pressed && { opacity: 0.85 },
        ]}>
        <Text style={[styles.viewText, { fontFamily: theme.fontHead }]}>
          View
        </Text>
      </Pressable>
      <Pressable
        onPress={() => dismissAway(false)}
        hitSlop={8}
        style={({ pressed }) => [
          styles.xBtn,
          pressed && { backgroundColor: theme.bgHover },
        ]}>
        <X size={13} color={theme.textSecondary} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 13,
  },
  iconTile: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: 2,
  },
  sub: {
    fontSize: 9.5,
    letterSpacing: 0.4,
  },
  viewBtn: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  xBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
