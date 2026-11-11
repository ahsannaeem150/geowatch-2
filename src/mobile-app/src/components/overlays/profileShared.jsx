import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Reanimated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { AlertTriangle, ChevronRight, Hexagon, MapPin } from 'lucide-react-native';
import { Defs, LinearGradient, Rect, Stop, Svg } from 'react-native-svg';
import { SheetScrollView } from './SheetContainer';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { listSavedIncidents } from '../../services/incidents.service';
import { locationLine, severityOf } from '../selection/PreviewCard';

// Shared bits for the profile cluster (drawer / page / side panel /
// bookmarks & history sheets) and their empty states.

export function kindOfItem(item) {
  return item?.geometry_type === 'polygon' ? 'zone' : 'incident';
}

export function itemColor(theme, kind, item) {
  return kind === 'zone'
    ? item.zone_category_color || theme.accentLight
    : item.domain_color || theme[`sev${severityOf(item)}`];
}

// Saved incidents + zones (same table) for the signed-in user.
export function useSavedIncidents() {
  const { signedIn } = useAuth();
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const reload = useCallback(() => {
    if (!signedIn) {
      setSaved([]);
      setError(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    listSavedIncidents()
      .then((rows) => setSaved(Array.isArray(rows) ? rows : rows?.data || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [signedIn]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { saved, loading, error, reload };
}

export function SavedItemRow({ kind, item, metaSuffix, highlighted, last = false, glow = false, onPress }) {
  const { theme } = useTheme();
  const isZone = kind === 'zone';
  const color = itemColor(theme, kind, item);
  const sev = severityOf(item);
  const category = isZone
    ? item.zone_category_name || 'Zone'
    : item.domain_name || item.category_name || item.category || 'Incident';
  const location = locationLine(item);
  const time = (metaSuffix || '').replace(/^ · /, '');
  const TypeIcon = isZone ? Hexagon : AlertTriangle;
  const gradientId = `saved-glow-${item.id}`;
  const rowStyle = {
    backgroundColor: theme.bgElevated,
    borderColor: highlighted ? theme.accentLight : theme.borderSubtle,
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${isZone ? 'Zone' : 'Incident'}: ${item.title}. ${category}. ${location}`}
      onPress={onPress}
      style={[styles.row, rowStyle, last && styles.rowLast]}>
      {glow ? (
        <Svg
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          viewBox="0 0 100 100"
          preserveAspectRatio="none">
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity="0.05" />
              <Stop offset="0.55" stopColor={color} stopOpacity="0.01" />
              <Stop offset="1" stopColor={color} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height="100" fill={`url(#${gradientId})`} />
        </Svg>
      ) : null}
      <View style={[styles.accent, { backgroundColor: color }]} />
      <View style={styles.rowBody}>
        <Text numberOfLines={2} style={[styles.rowTitle, { color: theme.textPrimary }]}>
          {item.title}
        </Text>
        <View style={styles.rowMeta}>
          <View style={styles.rowCategory}>
            <TypeIcon size={10} color={color} />
            <Text numberOfLines={1} style={[styles.rowMetaText, { color, fontFamily: theme.fontMono }]}>
              {category} · S{sev}
            </Text>
          </View>
          {time ? (
            <Text style={[styles.rowTime, { color: theme.textMuted, fontFamily: theme.fontMono }]}>
              {time}
            </Text>
          ) : null}
        </View>
        <View style={styles.rowLocation}>
          <MapPin size={10} color={theme.textMuted} />
          <Text numberOfLines={1} style={[styles.rowLocationText, { color: theme.textSecondary }]}>
            {location}
          </Text>
          <ChevronRight size={12} color={theme.textMuted} />
        </View>
      </View>
    </Pressable>
  );
}

function savedEntryKey(entry) {
  return `${entry.kind}-${entry.id}`;
}

function AnimatedSavedItemRow({ entry, index, visible, highlighted, last, onLayout, onOpen }) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      progress.value = 1;
      return;
    }
    if (visible) {
      const delay = Math.min(index, 5) * 70;
      progress.value = withDelay(
        delay,
        withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }),
      );
    } else {
      progress.value = 0;
    }
  }, [index, progress, reducedMotion, visible]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateX: interpolate(progress.value, [0, 1], [36, 0]) }],
  }), [progress]);

  return (
    <Reanimated.View onLayout={onLayout} style={style}>
      <SavedItemRow
        kind={entry.kind}
        item={entry.item}
        metaSuffix={entry.metaSuffix}
        highlighted={highlighted}
        last={last}
        glow
        onPress={() => onOpen(entry.kind, entry.item)}
      />
    </Reanimated.View>
  );
}

export function SavedEntries({ history, selectedId, onOpen, bodyStyle, contentStyle }) {
  const [visibleIds, setVisibleIds] = useState(() => new Set());
  const historyRef = useRef(history);
  historyRef.current = history;
  const layoutsRef = useRef(new Map());
  const viewportRef = useRef(0);
  const scrollYRef = useRef(0);

  const reveal = useCallback(() => {
    if (!viewportRef.current) return;
    const y = scrollYRef.current;
    const viewport = viewportRef.current;
    setVisibleIds((previous) => {
      const next = new Set(previous);
      let changed = false;
      historyRef.current.forEach((entry) => {
        const key = savedEntryKey(entry);
        const layout = layoutsRef.current.get(key);
        if (
          layout
          && layout.y < y + viewport + 96
          && layout.y + layout.height > y - 96
          && !next.has(key)
        ) {
          next.add(key);
          changed = true;
        }
      });
      return changed ? next : previous;
    });
  }, []);

  return (
    <SheetScrollView
      style={bodyStyle}
      contentContainerStyle={contentStyle}
      showsVerticalScrollIndicator={false}
      onLayout={(event) => {
        viewportRef.current = event.nativeEvent.layout.height;
        reveal();
      }}
      onContentSizeChange={reveal}
      onScroll={(event) => {
        scrollYRef.current = event.nativeEvent.contentOffset.y;
        reveal();
      }}>
      {history.map((entry, index) => {
        const key = savedEntryKey(entry);
        return (
          <AnimatedSavedItemRow
            key={key}
            entry={entry}
            index={index}
            visible={visibleIds.has(key)}
            highlighted={selectedId === entry.id}
            last={index === history.length - 1}
            onLayout={(event) => {
              layoutsRef.current.set(key, event.nativeEvent.layout);
              reveal();
            }}
            onOpen={onOpen}
          />
        );
      })}
    </SheetScrollView>
  );
}

// bm-empty port: icon + title + sub + optional CTA button.
export function PanelEmpty({ icon, title, sub, ctaLabel, onCta }) {
  const { theme } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { borderColor: theme.borderSubtle }]}>
        {icon}
      </View>
      <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
        {title}
      </Text>
      <Text style={[styles.emptySub, { color: theme.textMuted }]}>{sub}</Text>
      {ctaLabel ? (
        <Pressable
          onPress={onCta}
          style={[styles.emptyCta, { backgroundColor: theme.accent }]}>
          <Text style={styles.emptyCtaText}>{ctaLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    paddingLeft: 12,
    marginHorizontal: 14,
    marginBottom: 8,
    overflow: 'hidden',
  },
  rowLast: {
    marginBottom: 0,
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 1,
  },
  rowMetaText: {
    flexShrink: 1,
    fontSize: 9.5,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  rowTime: {
    flexShrink: 0,
    fontSize: 9,
  },
  rowLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  rowLocationText: {
    flex: 1,
    fontSize: 10.5,
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 42,
    gap: 10,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  emptySub: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  emptyCtaText: {
    color: '#f2f2f2',
    fontSize: 12.5,
    fontWeight: '600',
  },
});
