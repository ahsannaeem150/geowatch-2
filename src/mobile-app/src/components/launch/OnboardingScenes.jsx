import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Reanimated, {
  Extrapolate,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import Svg, { Defs, Path, Polygon, RadialGradient, Stop } from 'react-native-svg';
import {
  Bookmark,
  Check,
  CheckCircle2,
  FileText,
  MapPin,
  Search,
  SlidersHorizontal,
} from 'lucide-react-native';
import { LAUNCH_IMAGES } from './launchAssets';

function useSceneStyle(progress, index, reducedMotion) {
  return useAnimatedStyle(() => {
    if (reducedMotion) return { opacity: 1 };
    const input = [index - 1, index, index + 1];
    return {
      opacity: interpolate(progress.value, input, [0.2, 1, 0.2], Extrapolate.CLAMP),
      transform: [
        {
          translateY: interpolate(progress.value, input, [22, 0, -14], Extrapolate.CLAMP),
        },
        {
          scale: interpolate(progress.value, input, [0.96, 1, 0.98], Extrapolate.CLAMP),
        },
      ],
    };
  }, [index, reducedMotion]);
}

function MapMarker({ source, style, progress, index, delay = 0 }) {
  const animatedStyle = useAnimatedStyle(() => {
    const arrive = index - 0.65 + delay;
    return {
      opacity: interpolate(
        progress.value,
        [index - 1, arrive, index, index + 1],
        [0, 0, 1, 0],
        Extrapolate.CLAMP,
      ),
      transform: [
        {
          scale: interpolate(
            progress.value,
            [arrive, index, index + 1],
            [0.55, 1, 0.85],
            Extrapolate.CLAMP,
          ),
        },
      ],
    };
  }, [index, delay]);
  return (
    <Reanimated.View style={[styles.mapMarker, style, animatedStyle]}>
      <Image source={source} style={styles.mapMarkerImage} />
    </Reanimated.View>
  );
}

function NeonZone({ id, points, color, fillOpacity = 0.75, strokeOpacity = 0.7 }) {
  const gradientId = `${id}-gradient`;
  return (
    <>
      <Defs>
        <RadialGradient id={gradientId} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <Stop offset={0} stopColor={color} stopOpacity="0" />
          <Stop offset={0.55} stopColor={color} stopOpacity="0.04" />
          <Stop offset={0.85} stopColor={color} stopOpacity="0.09" />
          <Stop offset={1} stopColor={color} stopOpacity="0.12" />
        </RadialGradient>
      </Defs>
      <Polygon
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeOpacity="0.32"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <Polygon
        points={points}
        fill={`url(#${gradientId})`}
        stroke="none"
        opacity={fillOpacity}
      />
      <Polygon
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        opacity={strokeOpacity}
      />
    </>
  );
}

function GhostZone({ points, color }) {
  return (
    <Polygon
      points={points}
      fill={color}
      fillOpacity="0.06"
      stroke={color}
      strokeWidth="1.25"
      strokeDasharray="6 4"
      strokeOpacity="0.6"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
    />
  );
}

export function MapScene({ progress, index, reducedMotion, mode, theme, height }) {
  const sceneStyle = useSceneStyle(progress, index, reducedMotion);
  const zoneColor = '#e01b24';
  return (
    <Reanimated.View
      collapsable={false}
      renderToHardwareTextureAndroid
      style={[styles.scene, sceneStyle]}>
      <View
        style={[
          styles.mapFrame,
          { height, borderColor: theme.borderSubtle, backgroundColor: theme.bgSurface },
        ]}>
        <Image
          source={mode === 'light' ? LAUNCH_IMAGES.mapLight : LAUNCH_IMAGES.mapDark}
          style={styles.mapImage}
          resizeMode="cover"
        />
        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none">
          <NeonZone
            id="onboarding-map-notam"
            points="52,43 57,42 60,46 57,51 53,52 50,47"
            color={zoneColor}
          />
        </Svg>
        <View
          style={[
            styles.mapLivePill,
            { backgroundColor: theme.bgGlass, borderColor: theme.borderSubtle },
          ]}>
          <View style={[styles.liveDot, { backgroundColor: theme.accentLight }]} />
          <Text style={[styles.mapLiveText, { color: theme.textSecondary }]}>
            GLOBAL MONITORING
          </Text>
        </View>
        <View
          style={[
            styles.notamBadge,
            { backgroundColor: theme.bgGlassStrong, borderColor: `${zoneColor}55` },
          ]}>
          <Text style={[styles.notamText, { color: zoneColor }]}>
            PAKISTAN AIRSPACE · NOTAM
          </Text>
        </View>
        <MapMarker
          source={LAUNCH_IMAGES.conflictMarker}
          progress={progress}
          index={index}
          style={styles.markerPakistan}
        />
        <MapMarker
          source={LAUNCH_IMAGES.militaryMarker}
          progress={progress}
          index={index}
          delay={0.1}
          style={styles.markerBorderNorth}
        />
        <MapMarker
          source={LAUNCH_IMAGES.conflictMarker}
          progress={progress}
          index={index}
          delay={0.2}
          style={styles.markerBorderSouth}
        />
        <View
          style={[
            styles.mapFooter,
            { backgroundColor: theme.bgGlassStrong, borderTopColor: theme.accentSubtleBorder },
          ]}>
          <Text style={[styles.mapFooterText, { color: theme.textSecondary }]}>
            GLOBAL COVERAGE
          </Text>
          <Text style={[styles.mapFooterText, { color: theme.accentLight }]}>
            LIVE UPDATES
          </Text>
        </View>
      </View>
      <View style={[styles.cornerTick, styles.tickTopLeft, { borderColor: theme.accentLight }]} />
      <View style={[styles.cornerTick, styles.tickBottomRight, { borderColor: theme.accentLight }]} />
    </Reanimated.View>
  );
}

export function EvidenceScene({ progress, index, reducedMotion, theme, height }) {
  const sceneStyle = useSceneStyle(progress, index, reducedMotion);
  const evidenceStyle = useAnimatedStyle(() => ({
    opacity: reducedMotion
      ? 1
      : interpolate(
          progress.value,
          [index - 0.45, index, index + 0.4],
          [0, 1, 0.4],
          Extrapolate.CLAMP,
        ),
    transform: [
      {
        translateY: reducedMotion
          ? 0
          : interpolate(
              progress.value,
              [index - 0.45, index, index + 0.4],
              [18, 0, -8],
              Extrapolate.CLAMP,
            ),
      },
    ],
  }), [index, reducedMotion]);

  return (
    <Reanimated.View
      collapsable={false}
      renderToHardwareTextureAndroid
      style={[styles.scene, sceneStyle]}>
      <View
        style={[
          styles.evidenceCard,
          { height, backgroundColor: theme.bgSurface, borderColor: theme.borderSubtle },
        ]}>
        <View style={styles.grabberWrap}>
          <View style={[styles.grabber, { backgroundColor: theme.borderSubtle }]} />
        </View>
        <View style={styles.evidenceHead}>
          <View style={styles.evidenceTitleWrap}>
            <Text style={[styles.evidenceKicker, { color: theme.accentLight }]}>
              CONFLICT · VERIFIED
            </Text>
            <Text style={[styles.evidenceTitle, { color: theme.textPrimary }]} numberOfLines={2}>
              Rafale fighter jet shot down — Bathinda airspace
            </Text>
            <View style={styles.locationRow}>
              <MapPin size={11} color={theme.textMuted} />
              <Text style={[styles.locationText, { color: theme.textMuted }]}>
                Bathinda, Punjab · 07 MAY 2025
              </Text>
            </View>
          </View>
          <CheckCircle2 size={25} color={theme.success} />
        </View>

        <View style={styles.timelineRow}>
          <View style={[styles.timelineDot, { backgroundColor: theme.accentLight }]} />
          <View style={[styles.timelineLine, { backgroundColor: theme.borderSubtle }]} />
          <View style={styles.timelineCopy}>
            <Text style={[styles.timelineLabel, { color: theme.accentLight }]}>
              EVIDENCE UPDATE
            </Text>
            <Text style={[styles.timelineText, { color: theme.textSecondary }]}>
              Wreckage images and source records reviewed.
            </Text>
          </View>
        </View>

        <Reanimated.View style={[styles.evidenceGrid, evidenceStyle]}>
          <Image source={LAUNCH_IMAGES.evidenceTail} style={styles.evidenceImage} />
          <Image source={LAUNCH_IMAGES.evidenceWreck} style={styles.evidenceImage} />
        </Reanimated.View>
        <View style={styles.sourceRow}>
          <View style={[styles.sourcePill, { backgroundColor: theme.accentSubtleBg }]}>
            <FileText size={11} color={theme.accentLight} />
            <Text style={[styles.sourceText, { color: theme.accentLight }]}>2 SOURCES</Text>
          </View>
          <Text style={[styles.sourceText, { color: theme.textMuted }]}>2 MEDIA FILES</Text>
        </View>
      </View>
    </Reanimated.View>
  );
}

function FilterChip({ label, selected, theme }) {
  return (
    <View
      style={[
        styles.filterChip,
        {
          backgroundColor: selected ? theme.accentSubtleBg : theme.bgElevated,
          borderColor: selected ? theme.accentLight : theme.borderSubtle,
        },
      ]}>
      {selected ? <Check size={11} color={theme.accentLight} /> : null}
      <Text
        style={[
          styles.filterText,
          { color: selected ? theme.accentLight : theme.textSecondary },
        ]}>
        {label}
      </Text>
    </View>
  );
}

export function PersonalizeScene({ progress, index, reducedMotion, theme, height }) {
  const sceneStyle = useSceneStyle(progress, index, reducedMotion);
  const bookmarkStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: reducedMotion
          ? 1
          : interpolate(
              progress.value,
              [index - 0.35, index, index + 0.25, index + 0.55],
              [0.85, 1.12, 1, 1],
              Extrapolate.CLAMP,
            ),
      },
    ],
  }), [index, reducedMotion]);
  const results = [
    {
      id: 'kabul-2025-10-15',
      title: 'Explosions reported in Kabul during border escalation',
      location: 'Kabul, Afghanistan',
      date: '15 OCT 2025',
    },
    {
      id: 'kabul-2025-10-09',
      title: 'Pakistan airstrike reported in Kabul',
      location: 'Kabul, Afghanistan',
      date: '09 OCT 2025',
    },
  ];
  const compactResults = height < 340;

  return (
    <Reanimated.View
      collapsable={false}
      renderToHardwareTextureAndroid
      style={[styles.scene, sceneStyle]}>
      <View
        style={[
          styles.searchCard,
          { height, backgroundColor: theme.bgSurface, borderColor: theme.borderSubtle },
        ]}>
        <View style={styles.searchTitleRow}>
          <Text style={[styles.searchTitle, { color: theme.textPrimary }]}>Power Search</Text>
          <SlidersHorizontal size={17} color={theme.textSecondary} />
        </View>
        <View
          style={[
            styles.searchInput,
            { backgroundColor: theme.bgInput, borderColor: theme.accentLight },
          ]}>
          <Search size={16} color={theme.accentLight} />
          <Text style={[styles.searchInputText, { color: theme.textPrimary }]}>Kabul</Text>
          <View style={[styles.searchCursor, { backgroundColor: theme.accentLight }]} />
        </View>
        <View style={styles.filterRow}>
          <FilterChip label="Conflict" selected theme={theme} />
          <FilterChip label="S3+" selected={false} theme={theme} />
          <FilterChip label="Verified" selected theme={theme} />
        </View>
        <Text style={[styles.resultMeta, { color: theme.textMuted }]}>2 MATCHES · NEWEST FIRST</Text>
        {results.map((result) => (
          <View
            key={result.id}
            style={[
              styles.resultCard,
              compactResults ? styles.resultCardCompact : styles.resultCardLarge,
              { backgroundColor: theme.bgElevated, borderColor: theme.borderSubtle },
            ]}>
            <View style={[styles.resultAccent, { backgroundColor: theme.catConflict }]} />
            <View
              style={[
                styles.resultBody,
                compactResults ? styles.resultBodyCompact : styles.resultBodyLarge,
              ]}>
              <Text style={[styles.resultCategory, { color: theme.catConflict }]}>
                CONFLICT / AIRSTRIKE
              </Text>
              <Text style={[styles.resultTitle, { color: theme.textPrimary }]} numberOfLines={2}>
                {result.title}
              </Text>
              <Text style={[styles.resultLocation, { color: theme.textMuted }]}>
                {result.location}
              </Text>
              {!compactResults ? (
                <View style={[styles.resultFooter, { borderTopColor: theme.borderSubtle }]}>
                  <Text style={[styles.resultFooterText, { color: theme.accentLight }]}>
                    VERIFIED · REPORTED
                  </Text>
                  <Text style={[styles.resultFooterText, { color: theme.textMuted }]}>
                    {result.date}
                  </Text>
                </View>
              ) : null}
            </View>
            <Reanimated.View style={bookmarkStyle}>
              <Bookmark size={23} color={theme.accentLight} fill={theme.accentLight} />
            </Reanimated.View>
          </View>
        ))}
        <View style={[styles.savedNotice, { backgroundColor: theme.accentSubtleBg }]}>
          <Bookmark size={14} color={theme.accentLight} />
          <Text style={[styles.savedNoticeText, { color: theme.accentLight }]}>
            Bookmark incidents to revisit them later
          </Text>
        </View>
      </View>
    </Reanimated.View>
  );
}

export function TemporalZoneScene({ progress, index, reducedMotion, mode, theme, height }) {
  const sceneStyle = useSceneStyle(progress, index, reducedMotion);
  const notamColor = '#e01b24';
  const notmarColor = '#0ea5e9';
  return (
    <Reanimated.View
      collapsable={false}
      renderToHardwareTextureAndroid
      style={[styles.scene, sceneStyle]}>
      <View
        style={[
          styles.temporalCard,
          { height, backgroundColor: theme.bgSurface, borderColor: theme.borderSubtle },
        ]}>
        <View style={styles.temporalMap}>
          <Image
            source={mode === 'light' ? LAUNCH_IMAGES.mapLight : LAUNCH_IMAGES.mapDark}
            style={styles.mapImage}
            resizeMode="cover"
          />
          <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none">
            <NeonZone
              id="onboarding-temporal-notam"
              points="50,42 56,41 58,45 56,52 51,54 47,49"
              color={notamColor}
            />
            <GhostZone
              points="38,60 45,58 50,62 48,71 42,73 36,67"
              color={notmarColor}
            />
            <Path
              d="M49 29 L49 32 Q49 35 52 35 L54 41"
              fill="none"
              stroke={notamColor}
              strokeWidth="1.2"
              strokeOpacity="0.7"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            <Path
              d="M44 75 Q44 78 46 78 L46 88"
              fill="none"
              stroke={notmarColor}
              strokeWidth="1.2"
              strokeOpacity="0.7"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </Svg>
          <View
            style={[
              styles.temporalMapBadge,
              styles.activeCallout,
              { backgroundColor: theme.bgGlassStrong, borderColor: `${notamColor}55` },
            ]}>
            <View style={[styles.liveDot, { backgroundColor: notamColor }]} />
            <Text style={[styles.temporalMapBadgeText, { color: notamColor }]}>ACTIVE</Text>
          </View>
          <View
            style={[
              styles.temporalMapBadge,
              styles.upcomingCallout,
              { backgroundColor: theme.bgGlassStrong, borderColor: `${notmarColor}55` },
            ]}>
            <View style={[styles.liveDot, { backgroundColor: notmarColor }]} />
            <Text style={[styles.temporalMapBadgeText, { color: notmarColor }]}>UPCOMING</Text>
          </View>
        </View>

        <View style={styles.activeBlock}>
          <View style={styles.activeTopRow}>
            <View>
              <Text style={[styles.activeKicker, { color: notamColor }]}>ACTIVE NOW</Text>
              <Text style={[styles.activeCaption, { color: theme.textMuted }]}>ENDS IN</Text>
            </View>
            <Text style={[styles.activeCountdown, { color: theme.textPrimary }]}>06:42:18</Text>
          </View>
          <View style={[styles.activeTrack, { backgroundColor: theme.bgElevated }]}>
            <View style={[styles.activeTrackFill, { backgroundColor: notamColor }]} />
          </View>
          <View style={styles.activeDates}>
            <Text style={[styles.activeDateText, { color: theme.textMuted }]}>14:00 UTC</Text>
            <Text style={[styles.activeDateText, { color: theme.textMuted }]}>22:00 UTC</Text>
          </View>
        </View>

        <View style={[styles.stateRow, { borderTopColor: theme.borderSubtle }]}>
          <View style={[styles.stateDot, { backgroundColor: notmarColor }]} />
          <View style={styles.stateCopy}>
            <Text style={[styles.stateTitle, { color: notmarColor }]}>UPCOMING · NOTMAR</Text>
            <Text style={[styles.stateSub, { color: theme.textSecondary }]}>Arabian Sea</Text>
          </View>
          <Text style={[styles.stateValue, { color: theme.textPrimary }]}>Starts in{`\n`}02:18</Text>
        </View>

      </View>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  scene: {
    width: '100%',
  },
  mapFrame: {
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 22,
  },
  mapImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  mapLivePill: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  mapLiveText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9.5,
    letterSpacing: 1.1,
  },
  notamBadge: {
    position: 'absolute',
    right: 12,
    bottom: 54,
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  notamText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  mapMarker: {
    position: 'absolute',
    width: 34,
    height: 34,
    marginLeft: -17,
    marginTop: -17,
  },
  markerPakistan: {
    left: '63%',
    top: '32%',
  },
  markerBorderNorth: {
    left: '56%',
    top: '29%',
  },
  markerBorderSouth: {
    left: '45%',
    top: '43%',
  },
  mapMarkerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  mapFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  mapFooterText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9.5,
    letterSpacing: 1,
  },
  cornerTick: {
    position: 'absolute',
    width: 20,
    height: 20,
  },
  tickTopLeft: {
    top: -5,
    left: -5,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopLeftRadius: 7,
  },
  tickBottomRight: {
    right: -5,
    bottom: -5,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderBottomRightRadius: 7,
  },
  evidenceCard: {
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  grabberWrap: {
    alignItems: 'center',
    paddingTop: 8,
  },
  grabber: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },
  evidenceHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 10,
  },
  evidenceTitleWrap: {
    flex: 1,
  },
  evidenceKicker: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9.5,
    letterSpacing: 0.9,
    marginBottom: 6,
  },
  evidenceTitle: {
    fontFamily: 'Space Grotesk',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  locationText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9.5,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 14,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 3,
  },
  timelineLine: {
    position: 'absolute',
    left: 3.5,
    top: 13,
    width: 1,
    height: 18,
  },
  timelineCopy: {
    marginLeft: 10,
    flex: 1,
  },
  timelineLabel: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9.5,
    letterSpacing: 0.8,
  },
  timelineText: {
    fontSize: 10,
    marginTop: 3,
  },
  evidenceGrid: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    minHeight: 132,
  },
  evidenceImage: {
    flex: 1,
    height: '100%',
    borderRadius: 10,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingBottom: 6,
  },
  sourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  sourceText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9.5,
    letterSpacing: 0.5,
  },
  searchCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    paddingBottom: 88,
  },
  searchTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchTitle: {
    fontFamily: 'Space Grotesk',
    fontSize: 17,
    fontWeight: '600',
  },
  searchInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
    marginTop: 16,
  },
  searchInputText: {
    fontSize: 13,
  },
  searchCursor: {
    width: 1,
    height: 17,
    marginLeft: -5,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  filterText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9.5,
  },
  resultMeta: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9.5,
    letterSpacing: 0.8,
    marginTop: 18,
    marginBottom: 8,
  },
  resultCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 10,
    minHeight: 100,
    overflow: 'hidden',
  },
  resultCardCompact: {
    minHeight: 0,
  },
  resultCardLarge: {
    minHeight: 108,
    paddingVertical: 12,
  },
  resultAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  resultBody: {
    flex: 1,
    flexShrink: 1,
    alignSelf: 'stretch',
    justifyContent: 'space-between',
    paddingRight: 10,
    paddingVertical: 4,
  },
  resultBodyCompact: {
    paddingBottom: 4,
    justifyContent: 'center',
  },
  resultBodyLarge: {
    paddingBottom: 12,
    justifyContent: 'space-between',
  },
  resultCategory: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9.5,
    letterSpacing: 0.5,
  },
  resultTitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 17,
    marginTop: 5,
  },
  resultLocation: {
    fontSize: 10,
    marginTop: 6,
  },
  resultFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    marginTop: 8,
  },
  resultFooterText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9.5,
    letterSpacing: 0.4,
  },
  savedNotice: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 9,
    paddingVertical: 7,
    marginTop: 0,
    marginBottom: 0,
  },
  savedNoticeText: {
    fontSize: 9.5,
    fontWeight: '500',
  },
  temporalCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 12,
    overflow: 'hidden',
  },
  temporalMap: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  temporalMapBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  temporalMapBadgeText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9.5,
    letterSpacing: 0.5,
  },
  activeCallout: {
    left: '42%',
    top: '20%',
    borderTopLeftRadius: 3,
  },
  upcomingCallout: {
    left: '46%',
    top: undefined,
    bottom: 8,
    borderTopLeftRadius: 3,
  },
  activeBlock: {
    marginTop: 10,
  },
  activeTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  activeKicker: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9.5,
    letterSpacing: 0.8,
  },
  activeCaption: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9.5,
    letterSpacing: 0.7,
    marginTop: 3,
  },
  activeCountdown: {
    fontFamily: 'Space Grotesk',
    fontSize: 26,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  activeTrack: {
    height: 4,
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  activeTrackFill: {
    width: '68%',
    height: 4,
    borderRadius: 2,
  },
  activeDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  activeDateText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9.5,
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 9,
    marginTop: 9,
  },
  stateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stateCopy: {
    flex: 1,
    marginLeft: 8,
  },
  stateTitle: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9.5,
    letterSpacing: 0.5,
  },
  stateSub: {
    fontSize: 10,
    marginTop: 2,
  },
  stateValue: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '600',
    textAlign: 'right',
    marginLeft: 8,
  },
});
