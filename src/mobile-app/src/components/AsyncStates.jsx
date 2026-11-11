import React, { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, RotateCcw } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { registerRecoveryRetry, retryFailedRequests } from '../services/recovery';
import { Skeleton as ShimmerBlock, SkeletonGroup } from './skeleton/Skeleton';

function useRecoveryRetry(onRetry, retryScope) {
  const coordinated = retryScope !== 'local';
  useEffect(() => {
    if (!onRetry || !coordinated) return undefined;
    return registerRecoveryRetry(onRetry);
  }, [onRetry, coordinated]);

  return useCallback(() => {
    if (coordinated) return retryFailedRequests(onRetry);
    return onRetry?.();
  }, [onRetry, coordinated]);
}

export function ErrorState({ title, message, onRetry, retryScope = 'coordinated', style, inline = false }) {
  const { theme } = useTheme();
  const handleRetry = useRecoveryRetry(onRetry, retryScope);
  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.errorCard,
        inline && styles.errorInline,
        { backgroundColor: theme.bgElevated, borderColor: theme.borderSubtle },
        style,
      ]}>
      <View style={[styles.errorIcon, { backgroundColor: theme.dangerBg, borderColor: theme.dangerBorder }]}>
        <AlertTriangle size={18} color={theme.danger} />
      </View>
      <View style={[styles.errorBody, inline && styles.errorBodyInline]}>
        <Text style={[styles.errorTitle, { color: theme.textPrimary }]}>{title}</Text>
        <Text style={[styles.errorMessage, { color: theme.textSecondary }]}>{message}</Text>
        {onRetry ? (
          <Pressable onPress={handleRetry} style={[styles.retryButton, { backgroundColor: theme.accent }]}>
            <RotateCcw size={12} color="#f2f2f2" />
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function ErrorBanner({ message, onRetry, retryScope = 'coordinated', style }) {
  const { theme } = useTheme();
  const handleRetry = useRecoveryRetry(onRetry, retryScope);
  return (
    <View
      accessibilityRole="alert"
      style={[styles.banner, { backgroundColor: theme.dangerBg, borderColor: theme.dangerBorder }, style]}>
      <AlertTriangle size={14} color={theme.danger} />
      <Text style={[styles.bannerText, { color: theme.textSecondary }]}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={handleRetry} hitSlop={6} style={[styles.bannerRetry, { borderColor: theme.borderSubtle }]}>
          <RotateCcw size={11} color={theme.textPrimary} />
          <Text style={[styles.bannerRetryText, { color: theme.textPrimary }]}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function FilterRowsSkeleton({ rows = 6, label = 'Loading filters' }) {
  return (
    <SkeletonGroup label={label} style={styles.filterSkeleton}>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={styles.filterRow}>
          <ShimmerBlock style={styles.filterCheckbox} />
          <ShimmerBlock style={styles.filterLine} />
        </View>
      ))}
    </SkeletonGroup>
  );
}

function DirectoryResultRow({ theme, twoLines }) {
  return (
    <View style={[styles.resultRow, { backgroundColor: theme.bgElevated, borderColor: theme.borderSubtle }]}>
      <View style={[styles.resultAccent, { backgroundColor: theme.borderSubtle }]} />
      <View style={styles.resultBody}>
        <ShimmerBlock style={styles.resultTitle} />
        {twoLines ? <ShimmerBlock style={styles.resultTitleSecond} /> : null}
        <View style={styles.resultCategory}>
          <ShimmerBlock style={styles.resultCategoryDot} />
          <ShimmerBlock style={styles.resultCategoryLine} />
        </View>
        <View style={styles.resultPillRow}>
          <ShimmerBlock style={styles.resultPill} />
          <ShimmerBlock style={styles.resultPillSecond} />
          <ShimmerBlock style={styles.resultDate} />
        </View>
        <View style={styles.resultLocationRow}>
          <ShimmerBlock style={styles.resultLocationIcon} />
          <ShimmerBlock style={styles.resultLocation} />
        </View>
      </View>
    </View>
  );
}

function SavedResultRow({ theme, twoLines, last }) {
  return (
    <View style={[styles.savedRow, last && styles.savedRowLast, { backgroundColor: theme.bgElevated, borderColor: theme.borderSubtle }]}>
      <View style={[styles.savedAccent, { backgroundColor: theme.borderSubtle }]} />
      <View style={styles.savedBody}>
        <ShimmerBlock style={styles.savedTitle} />
        {twoLines ? <ShimmerBlock style={styles.savedTitleSecond} /> : null}
        <View style={styles.savedMeta}>
          <ShimmerBlock style={styles.savedMetaLeft} />
          <ShimmerBlock style={styles.resultTime} />
        </View>
        <View style={[styles.resultLocationRow, styles.savedLocationRow]}>
          <ShimmerBlock style={styles.resultLocationIcon} />
          <ShimmerBlock style={styles.savedLocation} />
        </View>
      </View>
    </View>
  );
}

export function ResultRowsSkeleton({ rows = 6, label = 'Loading results', saved = false }) {
  const { theme } = useTheme();
  return (
    <SkeletonGroup label={label} style={saved ? styles.savedSkeleton : styles.resultSkeleton}>
      {Array.from({ length: rows }, (_, i) => (
        saved ? (
          <SavedResultRow key={i} theme={theme} twoLines={i % 3 === 0} last={i === rows - 1} />
        ) : (
          <DirectoryResultRow key={i} theme={theme} twoLines={i % 3 === 0} />
        )
      ))}
    </SkeletonGroup>
  );
}

export function CommandRowsSkeleton({ rows = 5, label = 'Searching incidents, zones and locations' }) {
  return (
    <SkeletonGroup label={label} style={styles.commandSkeleton}>
      <ShimmerBlock style={styles.commandSection} />
      {Array.from({ length: rows }, (_, i) => (
        <View key={i}>
          {i === 4 ? <ShimmerBlock style={styles.commandSection} /> : null}
          <View style={styles.commandRow}>
            <ShimmerBlock style={styles.commandDot} />
            <View style={styles.commandBody}>
              <ShimmerBlock style={styles.commandTitle} />
              <ShimmerBlock style={styles.commandSubtitle} />
            </View>
            <ShimmerBlock style={styles.commandKind} />
          </View>
        </View>
      ))}
    </SkeletonGroup>
  );
}

function TimelineSectionSkeleton({ updates = false }) {
  return (
    <View style={[styles.timelineSection, updates && styles.timelineSectionUpdates]}>
      <ShimmerBlock style={[styles.timelineSectionLine, updates && styles.timelineSectionLineUpdates]} />
    </View>
  );
}

function TimelineNodeSkeleton({ theme, detailed = false }) {
  return (
    <View style={styles.timelineNode}>
      <View style={[styles.timelineDot, { borderColor: theme.accentLight }]} />
      <View style={styles.timelineMeta}>
        <ShimmerBlock style={styles.timelineTime} />
        <ShimmerBlock style={styles.timelineVerified} />
      </View>
      <View style={[styles.timelineCard, { backgroundColor: theme.bgElevated, borderColor: theme.borderSubtle }]}>
        <ShimmerBlock style={styles.timelineTitle} />
        {detailed ? <ShimmerBlock style={styles.timelineTitleSecond} /> : null}
        {detailed ? <ShimmerBlock style={styles.timelineText} /> : null}
        <View style={styles.timelineFoot}>
          <View />
          <ShimmerBlock style={styles.timelineInspect} />
        </View>
      </View>
    </View>
  );
}

export function TimelineSkeleton({ updates = 3, zone = false }) {
  const { theme } = useTheme();
  const nodes = Array.from({ length: updates }, (_, i) => (
    <TimelineNodeSkeleton key={i} theme={theme} detailed={i === 1} />
  ));
  return (
    <SkeletonGroup label={zone ? 'Loading zone timeline' : 'Loading incident timeline'} style={styles.timelineSkeleton}>
      {!zone ? <TimelineSectionSkeleton /> : null}
      <View style={styles.timeline}>{zone ? nodes : nodes[0]}</View>
      {!zone ? (
        <>
          <TimelineSectionSkeleton updates />
          <View style={styles.timeline}>{nodes.slice(1)}</View>
        </>
      ) : null}
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  errorCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    gap: 12,
  },
  errorInline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
  },
  errorIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBody: {
    alignItems: 'center',
    gap: 7,
  },
  errorBodyInline: {
    flex: 1,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 9,
    paddingHorizontal: 15,
    paddingVertical: 9,
    marginTop: 4,
  },
  retryText: {
    color: '#f2f2f2',
    fontSize: 12,
    fontWeight: '600',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 11,
    padding: 10,
  },
  bannerText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
  bannerRetry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  bannerRetryText: {
    fontSize: 10,
    fontWeight: '600',
  },
  filterSkeleton: {
    paddingVertical: 0,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 32,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  filterCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  filterLine: {
    height: 12,
    width: '62%',
  },
  resultSkeleton: {},
  resultRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  resultAccent: {
    width: 3,
  },
  resultBody: {
    flex: 1,
    paddingVertical: 13,
    paddingRight: 16,
    paddingLeft: 13,
  },
  resultTitle: {
    height: 14,
    width: '82%',
    marginBottom: 5,
  },
  resultTitleSecond: {
    height: 14,
    width: '62%',
    marginBottom: 5,
  },
  resultCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  resultCategoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  resultCategoryLine: {
    height: 11,
    width: '34%',
  },
  resultPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultPill: {
    width: 78,
    height: 18,
    borderRadius: 4,
  },
  resultPillSecond: {
    width: 72,
    height: 18,
    borderRadius: 4,
  },
  resultDate: {
    height: 9,
    width: 48,
    marginLeft: 'auto',
  },
  resultLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 7,
  },
  resultLocationIcon: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  resultLocation: {
    height: 11,
    width: '66%',
  },
  resultTime: {
    height: 9,
    width: 34,
  },
  savedSkeleton: {},
  savedRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    paddingLeft: 12,
    marginHorizontal: 14,
    marginBottom: 8,
    overflow: 'hidden',
  },
  savedRowLast: {
    marginBottom: 0,
  },
  savedAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  savedBody: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  savedTitle: {
    height: 14,
    width: '84%',
  },
  savedTitleSecond: {
    height: 14,
    width: '61%',
  },
  savedMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  savedMetaLeft: {
    height: 10,
    width: '42%',
  },
  savedLocationRow: {
    marginTop: 1,
  },
  savedLocation: {
    height: 11,
    width: '58%',
  },
  commandSkeleton: {
    paddingTop: 4,
  },
  commandSection: {
    height: 9,
    width: 96,
    marginLeft: 4,
    marginTop: 6,
    marginBottom: 8,
  },
  commandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 4,
  },
  commandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  commandBody: {
    flex: 1,
  },
  commandTitle: {
    height: 11,
    width: '72%',
  },
  commandSubtitle: {
    height: 9,
    width: '48%',
    marginTop: 4,
  },
  commandKind: {
    height: 8,
    width: 38,
  },
  timelineSkeleton: {},
  timelineSection: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 10,
  },
  timelineSectionZone: {
    paddingTop: 14,
  },
  timelineSectionUpdates: {
    paddingTop: 18,
  },
  timelineSectionLine: {
    width: 108,
    height: 9,
  },
  timelineSectionLineUpdates: {
    width: 58,
  },
  timeline: {
    paddingLeft: 22,
    paddingRight: 16,
  },
  timelineNode: {
    marginBottom: 10,
    paddingLeft: 16,
  },
  timelineDot: {
    position: 'absolute',
    left: 0,
    top: 3,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 2,
  },
  timelineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 7,
  },
  timelineTime: {
    width: 138,
    height: 9,
  },
  timelineVerified: {
    width: 42,
    height: 8,
  },
  timelineCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
  },
  timelineTitle: {
    height: 14,
    width: '86%',
    marginBottom: 5,
  },
  timelineTitleSecond: {
    height: 14,
    width: '62%',
    marginBottom: 5,
  },
  timelineText: {
    height: 11,
    width: '76%',
  },
  timelineFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 11,
  },
  timelineCount: {
    width: 30,
    height: 10,
  },
  timelineInspect: {
    width: 58,
    height: 9,
  },
});
