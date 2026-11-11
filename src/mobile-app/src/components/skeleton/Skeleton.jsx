import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Reanimated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';

const SkeletonMotionContext = createContext(null);

export function SkeletonGroup({ children, label = 'Loading content', style }) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(-1.2);

  useEffect(() => {
    if (reducedMotion) {
      cancelAnimation(progress);
      progress.value = -1.2;
      return undefined;
    }
    progress.value = -1.2;
    progress.value = withRepeat(
      withTiming(3.2, { duration: 1450, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
    return () => cancelAnimation(progress);
  }, [progress, reducedMotion]);

  const motion = useMemo(() => ({ progress, reducedMotion }), [progress, reducedMotion]);
  return (
    <SkeletonMotionContext.Provider value={motion}>
      <View
        style={style}
        accessible
        accessibilityLabel={label}
        accessibilityState={{ busy: true }}>
        {children}
      </View>
    </SkeletonMotionContext.Provider>
  );
}

export function Skeleton({ style }) {
  const { theme } = useTheme();
  const motion = useContext(SkeletonMotionContext);
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: motion ? `${motion.progress.value * 100}%` : '-120%',
      },
    ],
  }), [motion]);

  return (
    <View
      importantForAccessibility="no"
      style={[styles.base, { backgroundColor: theme.skeletonBase }, style]}>
      {motion?.reducedMotion ? null : (
        <Reanimated.View pointerEvents="none" style={[styles.shimmer, shimmerStyle]}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="skeleton-shimmer" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor={theme.skeletonHighlight} stopOpacity={0} />
                <Stop offset="50%" stopColor={theme.skeletonHighlight} stopOpacity={1} />
                <Stop offset="100%" stopColor={theme.skeletonHighlight} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#skeleton-shimmer)" />
          </Svg>
        </Reanimated.View>
      )}
    </View>
  );
}

export function SkeletonImage({ source, style, imageStyle, onLoad, onError, ...props }) {
  const [loadedUri, setLoadedUri] = useState(null);
  const [failedUri, setFailedUri] = useState(null);
  const uri = source?.uri;
  const loading = !!uri && loadedUri !== uri && failedUri !== uri;

  return (
    <View style={[styles.imageContainer, style]}>
      {loading ? (
        <SkeletonGroup label="Loading media" style={StyleSheet.absoluteFill}>
          <Skeleton style={StyleSheet.absoluteFill} />
        </SkeletonGroup>
      ) : null}
      <Image
        {...props}
        source={source}
        style={[StyleSheet.absoluteFill, imageStyle]}
        onLoad={(event) => {
          setLoadedUri(uri);
          onLoad?.(event);
        }}
        onError={(event) => {
          setFailedUri(uri);
          onError?.(event);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    overflow: 'hidden',
  },
  base: {
    overflow: 'hidden',
    borderRadius: 5,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '45%',
  },
});
