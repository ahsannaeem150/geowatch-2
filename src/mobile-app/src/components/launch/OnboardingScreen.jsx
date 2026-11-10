import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Reanimated, {
  Extrapolate,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
} from 'react-native-reanimated';
import { ArrowRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { IntelMapLockup } from './Brand';
import LaunchBackdrop from './LaunchBackdrop';
import { EvidenceScene, MapScene, PersonalizeScene, TemporalZoneScene } from './OnboardingScenes';

const PAGES = [
  {
    eyebrow: '01 · LIVE GLOBAL MAP',
    title: 'The world, mapped as it happens.',
    body: 'Explore conflicts, natural hazards and major events on one global map.',
  },
  {
    eyebrow: '02 · TIMELINE & EVIDENCE',
    title: 'Understand the story behind the pin.',
    body: 'Follow incident timelines and review available sources, photos and videos—all in one place.',
  },
  {
    eyebrow: '03 · SEARCH & PERSONALIZE',
    title: 'Focus on what matters to you.',
    body: 'Search by location, filter by category or severity, and bookmark incidents and zones for quick access.',
  },
  {
    eyebrow: '04 · TIME-AWARE ZONES',
    title: 'Know what’s active, where, and when.',
    body: 'Track upcoming and active NOTAMs and NOTMARs with countdowns, then review their complete active periods after they expire.',
  },
];

function ProgressDot({ index, progress, theme, reducedMotion }) {
  const style = useAnimatedStyle(() => ({
    transform: [
      {
        scaleX: reducedMotion
          ? 1
          : interpolate(
              progress.value,
              [index - 1, index, index + 1],
              [1, 22 / 7, 1],
              Extrapolate.CLAMP,
            ),
      },
    ],
    opacity: interpolate(
      progress.value,
      [index - 1, index, index + 1],
      [0.3, 1, 0.3],
      Extrapolate.CLAMP,
    ),
  }), [index, reducedMotion]);
  return (
    <View style={styles.progressDotSlot}>
      <Reanimated.View
        style={[styles.progressDot, { backgroundColor: theme.accentLight }, style]}
      />
    </View>
  );
}

export default function OnboardingScreen({ onDone }) {
  const { mode, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const scrollRef = useRef(null);
  const progress = useSharedValue(0);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  indexRef.current = index;
  const sceneHeight = height < 800
    ? Math.max(200, Math.min(260, height * 0.3))
    : Math.min(470, height * 0.5);

  const goTo = useCallback((next, animated = true) => {
    const bounded = Math.max(0, Math.min(PAGES.length - 1, next));
    setIndex(bounded);
    scrollRef.current?.scrollTo({
      x: bounded * width,
      animated: animated && !reducedMotion,
    });
  }, [width, reducedMotion]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (indexRef.current > 0) {
        goTo(indexRef.current - 1);
      } else {
        onDone();
      }
      return true;
    });
    return () => subscription.remove();
  }, [goTo, onDone]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      progress.value = width ? event.contentOffset.x / width : 0;
    },
  });

  const onMomentumEnd = (event) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    setIndex(Math.max(0, Math.min(PAGES.length - 1, next)));
  };

  const onScrollEndDrag = useCallback((event) => {
    const offset = event.nativeEvent.contentOffset.x;
    const velocity = event.nativeEvent.velocity?.x || 0;
    const delta = offset - indexRef.current * width;
    const flick = Math.abs(velocity) > 0.35 && Math.abs(delta) > 12;
    const dragged = Math.abs(delta) > width * 0.18;
    const direction = flick ? -Math.sign(velocity) : dragged ? Math.sign(delta) : 0;
    goTo(indexRef.current + direction);
  }, [goTo, width]);

  const finish = () => {
    if (index === PAGES.length - 1) onDone();
    else goTo(index + 1);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bgDeep }]}>
      <StatusBar
        backgroundColor={theme.bgDeep}
        barStyle={mode === 'light' ? 'dark-content' : 'light-content'}
      />
      <LaunchBackdrop theme={theme} mode={mode} />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <IntelMapLockup mode={mode} width={146} />
        {index < PAGES.length - 1 ? (
          <Pressable
            testID="onboarding-skip"
            accessibilityLabel="Skip onboarding"
            accessibilityRole="button"
            onPress={onDone}
            hitSlop={8}
            style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}>
            <Text style={[styles.skipText, { color: theme.textSecondary }]}>Skip</Text>
          </Pressable>
        ) : (
          <View style={styles.skipButton} />
        )}
      </View>

      <Reanimated.ScrollView
        ref={scrollRef}
        horizontal
        bounces={false}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={onMomentumEnd}
        style={styles.pager}>
        {PAGES.map((page, pageIndex) => (
          <View
            key={page.eyebrow}
            testID={`onboarding-page-${pageIndex}`}
            style={[styles.page, { width }]}>
            <View style={styles.sceneWrap}>
              {pageIndex === 0 ? (
                <MapScene
                  progress={progress}
                  index={pageIndex}
                  reducedMotion={reducedMotion}
                  mode={mode}
                  theme={theme}
                  height={sceneHeight}
                />
              ) : null}
              {pageIndex === 1 ? (
                <EvidenceScene
                  progress={progress}
                  index={pageIndex}
                  reducedMotion={reducedMotion}
                  theme={theme}
                  height={sceneHeight}
                />
              ) : null}
              {pageIndex === 2 ? (
                <PersonalizeScene
                  progress={progress}
                  index={pageIndex}
                  reducedMotion={reducedMotion}
                  theme={theme}
                  height={sceneHeight}
                />
              ) : null}
              {pageIndex === 3 ? (
                <TemporalZoneScene
                  progress={progress}
                  index={pageIndex}
                  reducedMotion={reducedMotion}
                  mode={mode}
                  theme={theme}
                  height={sceneHeight}
                />
              ) : null}
            </View>
            <View style={styles.copyBlock}>
              <Text style={[styles.eyebrow, { color: theme.accentLight }]}>
                {page.eyebrow}
              </Text>
              <Text style={[styles.title, { color: theme.textPrimary }]}>
                {page.title}
              </Text>
              <Text style={[styles.body, { color: theme.textSecondary }]}>
                {page.body}
              </Text>
            </View>
          </View>
        ))}
      </Reanimated.ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.progressRow}>
          {PAGES.map((page, dotIndex) => (
            <ProgressDot
              key={page.eyebrow}
              index={dotIndex}
              progress={progress}
              theme={theme}
              reducedMotion={reducedMotion}
            />
          ))}
        </View>
        <Pressable
          testID="onboarding-next"
          accessibilityRole="button"
          accessibilityLabel={index === PAGES.length - 1 ? 'Start exploring' : 'Next onboarding screen'}
          onPress={finish}
          style={({ pressed }) => [
            styles.nextButton,
            { backgroundColor: theme.accent },
            pressed && styles.nextPressed,
          ]}>
          <Text style={styles.nextText}>
            {index === PAGES.length - 1 ? 'Start exploring' : 'Next'}
          </Text>
          <ArrowRight size={18} color="#f2f2f2" />
        </Pressable>
        <View style={styles.footerNoteWrap}>
          {index === PAGES.length - 1 ? (
            <Text style={[styles.footerNote, { color: theme.textMuted }]}>
              No account needed to explore.
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  header: {
    minHeight: 64,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipButton: {
    minWidth: 48,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.6,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 22,
  },
  sceneWrap: {
    width: '100%',
  },
  copyBlock: {
    marginTop: 26,
  },
  eyebrow: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    letterSpacing: 1.6,
    marginBottom: 12,
  },
  title: {
    fontFamily: 'Space Grotesk',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
    maxWidth: 340,
  },
  footer: {
    paddingHorizontal: 22,
    paddingTop: 8,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 22,
    marginBottom: 12,
  },
  progressDotSlot: {
    width: 22,
    alignItems: 'center',
  },
  progressDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  nextButton: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  nextPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  nextText: {
    color: '#f2f2f2',
    fontSize: 15,
    fontWeight: '600',
  },
  footerNoteWrap: {
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerNote: {
    fontSize: 11,
  },
});
