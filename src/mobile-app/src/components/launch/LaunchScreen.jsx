import React, { useEffect, useRef } from 'react';
import { NativeModules, StatusBar, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Reanimated, {
  cancelAnimation,
  Easing,
  Extrapolate,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { IntelMapLockup, IntelMapMark, StudioCredit } from './Brand';
import LaunchBackdrop from './LaunchBackdrop';

export default function LaunchScreen({ ready, firstRun, onComplete }) {
  const { mode, theme } = useTheme();
  const { height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const completionRef = useRef(onComplete);
  completionRef.current = onComplete;

  useEffect(() => {
    if (ready) NativeModules.LaunchPreferences?.setReady(true);
  }, [ready]);

  useEffect(() => {
    if (!ready) return undefined;
    if (reducedMotion) {
      progress.value = 1;
      const timer = setTimeout(() => completionRef.current(), firstRun ? 450 : 220);
      return () => clearTimeout(timer);
    }
    progress.value = 0;
    progress.value = withTiming(
      1,
      {
        duration: firstRun ? 1600 : 600,
        easing: Easing.inOut(Easing.cubic),
      },
      (finished) => {
        'worklet';
        if (finished) runOnJS(completionRef.current)();
      },
    );
    return () => cancelAnimation(progress);
  }, [ready, firstRun, reducedMotion, progress]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: ready
      ? interpolate(progress.value, [0, 0.35, 1], [0.35, 1, 1], Extrapolate.CLAMP)
      : 0.65,
  }));

  const markStyle = useAnimatedStyle(() => {
    if (!ready) return { opacity: 1, transform: [{ scale: 1 }] };
    const input = firstRun ? [0, 0.22, 0.5, 1] : [0, 0.55, 1];
    return {
      opacity: interpolate(
        progress.value,
        input,
        firstRun ? [0, 0, 1, 1] : [0, 1, 1],
        Extrapolate.CLAMP,
      ),
      transform: [
        {
          translateY: interpolate(
            progress.value,
            input,
            firstRun ? [20, 20, 0, 0] : [12, 0, 0],
            Extrapolate.CLAMP,
          ),
        },
        {
          scale: interpolate(
            progress.value,
            input,
            firstRun ? [0.9, 0.9, 1, 1] : [0.96, 1, 1],
            Extrapolate.CLAMP,
          ),
        },
      ],
    };
  });

  const lockupStyle = useAnimatedStyle(() => {
    if (!ready) return { opacity: 0 };
    const input = firstRun ? [0, 0.34, 0.58, 1] : [0, 0.6, 1];
    return {
      opacity: interpolate(
        progress.value,
        input,
        firstRun ? [0, 0, 1, 1] : [0, 1, 1],
        Extrapolate.CLAMP,
      ),
      transform: [
        {
          translateY: interpolate(
            progress.value,
            input,
            firstRun ? [12, 12, 0, 0] : [8, 0, 0],
            Extrapolate.CLAMP,
          ),
        },
      ],
    };
  });

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: ready
      ? interpolate(
          progress.value,
          firstRun ? [0, 0.52, 0.7, 1] : [0, 0.65, 1],
          firstRun ? [0, 0, 1, 1] : [0, 1, 1],
          Extrapolate.CLAMP,
        )
      : 0,
  }));

  const studioStyle = useAnimatedStyle(() => {
    if (!ready) {
      return { opacity: 0.55, transform: [{ translateY: height * 0.36 }] };
    }
    if (!firstRun) {
      return {
        opacity: interpolate(progress.value, [0, 0.6, 1], [0, 0.62, 0.62], Extrapolate.CLAMP),
        transform: [{ translateY: height * 0.36 }],
      };
    }
    return {
      opacity: interpolate(
        progress.value,
        [0, 0.08, 0.24, 0.58, 1],
        [0, 0, 1, 0.64, 0.64],
        Extrapolate.CLAMP,
      ),
      transform: [
        {
          translateY: interpolate(
            progress.value,
            [0, 0.28, 0.58, 1],
            [0, 0, height * 0.36, height * 0.36],
            Extrapolate.CLAMP,
          ),
        },
        {
          scale: interpolate(
            progress.value,
            [0, 0.28, 0.58, 1],
            [1, 1, 0.88, 0.88],
            Extrapolate.CLAMP,
          ),
        },
      ],
    };
  });

  return (
    <View style={[styles.root, { backgroundColor: theme.bgDeep }]}>
      <StatusBar
        backgroundColor={theme.bgDeep}
        barStyle={mode === 'light' ? 'dark-content' : 'light-content'}
      />
      <Reanimated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
        <LaunchBackdrop theme={theme} mode={mode} />
      </Reanimated.View>

      <View style={styles.product}>
        <Reanimated.View style={markStyle}>
          <IntelMapMark size={96} dotColor={theme.textPrimary} />
        </Reanimated.View>
        <Reanimated.View style={[styles.lockup, lockupStyle]}>
          <IntelMapLockup mode={mode} width={218} />
        </Reanimated.View>
        <Reanimated.View style={[styles.taglineRow, taglineStyle]}>
          <View style={[styles.liveDot, { backgroundColor: theme.accentLight }]} />
          <Text style={[styles.tagline, { color: theme.textMuted }]}>LIVE MONITORING</Text>
        </Reanimated.View>
      </View>

      <Reanimated.View style={[styles.studio, { top: height * 0.42 }, studioStyle]}>
        <StudioCredit theme={theme} />
      </Reanimated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  product: {
    position: 'absolute',
    top: '31%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  lockup: {
    marginTop: 12,
  },
  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tagline: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    letterSpacing: 3.2,
  },
  studio: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
