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

export function ResultRowsSkeleton({ rows = 6, label = 'Loading results', saved = false }) {
  const { theme } = useTheme();
  return (
    <SkeletonGroup label={label} style={styles.resultSkeleton}>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={[styles.resultRow, { backgroundColor: theme.bgElevated, borderColor: theme.borderSubtle }]}>
          <View style={[styles.resultAccent, { backgroundColor: theme.borderSubtle }]} />
          <View style={styles.resultBody}>
            <ShimmerBlock style={styles.resultTitle} />
            <View style={styles.resultMeta}>
              <ShimmerBlock style={styles.resultMetaLeft} />
              <ShimmerBlock style={styles.resultTime} />
            </View>
            <ShimmerBlock style={saved ? styles.resultLocationSaved : styles.resultLocation} />
          </View>
        </View>
      ))}
    </SkeletonGroup>
  );
}

export function TimelineSkeleton({ updates = 3, zone = false }) {
  const { theme } = useTheme();
  return (
    <SkeletonGroup label={zone ? 'Loading zone timeline' : 'Loading incident timeline'} style={styles.timelineSkeleton}>
      {Array.from({ length: updates }, (_, i) => (
        <View key={i} style={styles.timelineNode}>
          <View style={styles.timelineSpine}>
            <View style={[styles.timelineDot, { borderColor: theme.accentLight }]} />
            {i < updates - 1 ? <View style={[styles.timelineLine, { backgroundColor: theme.borderSubtle }]} /> : null}
          </View>
          <View style={[styles.timelineCard, { backgroundColor: theme.bgElevated, borderColor: theme.borderSubtle }]}>
            <View style={styles.timelineHead}>
              <ShimmerBlock style={styles.timelineType} />
              <ShimmerBlock style={styles.timelineBadge} />
            </View>
            <ShimmerBlock style={styles.timelineTitle} />
            <ShimmerBlock style={styles.timelineTitleSecond} />
            <ShimmerBlock style={styles.timelineText} />
            <View style={styles.timelineMediaGrid}>
              {[0, 1, 2, 3].map((cell) => (
                <ShimmerBlock key={cell} style={styles.timelineMedia} />
              ))}
            </View>
          </View>
        </View>
      ))}
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
    gap: 12,
    paddingVertical: 4,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterCheckbox: {
    width: 15,
    height: 15,
    borderRadius: 3,
  },
  filterLine: {
    height: 11,
    width: '62%',
  },
  resultTitle: {
    height: 14,
    width: '82%',
    marginBottom: 8,
  },
  resultMetaLeft: {
    height: 10,
    width: '42%',
  },
  resultTime: {
    height: 9,
    width: 34,
  },
  resultLocation: {
    height: 10,
    width: '66%',
    marginTop: 7,
  },
  resultLocationSaved: {
    height: 10,
    width: '58%',
    marginTop: 7,
  },
  timelineType: {
    height: 10,
    width: '42%',
  },
  timelineBadge: {
    height: 16,
    width: 54,
  },
  timelineTitle: {
    height: 15,
    width: '86%',
    marginBottom: 8,
  },
  timelineTitleSecond: {
    height: 15,
    width: '62%',
    marginBottom: 12,
  },
  timelineText: {
    height: 11,
    width: '76%',
    marginBottom: 12,
  },
  resultSkeleton: {
    gap: 8,
  },
  resultRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 11,
    overflow: 'hidden',
  },
  resultAccent: {
    width: 3,
    alignSelf: 'stretch',
    marginLeft: -11,
    marginVertical: -11,
    marginRight: 10,
  },
  resultBody: {
    flex: 1,
  },
  resultMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  timelineSkeleton: {
    gap: 12,
  },
  timelineNode: {
    flexDirection: 'row',
    gap: 10,
  },
  timelineSpine: {
    alignItems: 'center',
    paddingTop: 18,
    gap: 4,
  },
  timelineDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 12,
  },
  timelineCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  timelineHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timelineMediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  timelineMedia: {
    width: '48%',
    height: 72,
    borderRadius: 8,
  },
});
