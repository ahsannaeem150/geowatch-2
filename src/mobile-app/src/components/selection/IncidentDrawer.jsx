import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Clipboard,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  FileText,
  Link2,
} from 'lucide-react-native';
import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { useTheme } from '../../context/ThemeContext';
import { useOverlay } from '../../context/OverlayContext';
import { useSelection } from '../../context/SelectionContext';
import { mediaUrl } from '../../services/api';
import { IncidentCard } from './PreviewCard';

// Incident drawer (prototype #drawer / renderDrawer): fullscreen details
// surface. Fetches GET /incidents/:id on open (cached in SelectionContext so
// reopening is instant and the peek can upgrade without a refetch).
// Back → pill (plain selection) or peek+emb (preview), via closeDrawer().

function fmtDate(iso) {
  const d = iso ? parseISO(iso) : null;
  return d && isValid(d) ? format(d, 'dd MMM yyyy') : '';
}

function ago(iso) {
  const d = iso ? parseISO(iso) : null;
  return d && isValid(d) ? formatDistanceToNow(d, { addSuffix: true }) : '';
}

// Counts for a timeline node: 𝕏 posts + attached media (prototype tl-counts).
function updateCounts(update) {
  const xCount = (update?.sources?.x_post || []).length;
  const camCount = (update?.media || []).length;
  return { xCount, camCount };
}

function TimelineNode({ update, label, onInspect }) {
  const { theme } = useTheme();
  const { xCount, camCount } = updateCounts(update);
  const thumb = mediaUrl(
    update?.media?.[0]?.thumbnail_url || update?.media?.[0]?.file_url,
  );
  const verified = update?.verification_status === 'verified';
  return (
    <View style={styles.tlNode}>
      <View style={[styles.tlDot, { borderColor: theme.accentLight }]} />
      <View style={styles.tlMeta}>
        <Text
          style={[styles.tlTime, { color: theme.textMuted, fontFamily: theme.fontMono }]}>
          <Text style={[styles.tlTimeBold, { color: theme.textSecondary }]}>
            {label}
          </Text>
          {` · ${ago(update?.update_date)}`}
        </Text>
        {verified ? (
          <View style={styles.tlVerifRow}>
            <View style={[styles.tlVerifDot, { backgroundColor: theme.success }]} />
            <Text
              style={[
                styles.tlVerif,
                { color: theme.success, fontFamily: theme.fontMono },
              ]}>
              VERIFIED
            </Text>
          </View>
        ) : null}
      </View>
      <Pressable
        onPress={onInspect}
        style={[
          styles.tlCard,
          { backgroundColor: theme.bgElevated, borderColor: theme.borderSubtle },
        ]}>
        <Text style={[styles.tlHeadline, { color: theme.textPrimary }]}>
          {update?.summary || '—'}
        </Text>
        {update?.details ? (
          <Text style={[styles.tlSummary, { color: theme.textSecondary }]}>
            {update.details}
          </Text>
        ) : null}
        {thumb ? (
          <Image
            source={{ uri: thumb }}
            style={[styles.tlThumb, { backgroundColor: theme.bgHover }]}
            resizeMode="cover"
          />
        ) : null}
        <View style={styles.tlFoot}>
          <View style={styles.tlCounts}>
            {xCount ? (
              <View style={styles.tlCount}>
                <Text
                  style={[
                    styles.tlCountX,
                    { color: theme.textSecondary, fontFamily: theme.fontMono },
                  ]}>
                  𝕏
                </Text>
                <Text style={[styles.tlCountText, { color: theme.textMuted }]}>
                  {xCount}
                </Text>
              </View>
            ) : null}
            {camCount ? (
              <View style={styles.tlCount}>
                <Camera size={11} color={theme.textMuted} />
                <Text style={[styles.tlCountText, { color: theme.textMuted }]}>
                  {camCount}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.inspectBtn} pointerEvents="none">
            <Text
              style={[
                styles.inspectText,
                { color: theme.accentLight, fontFamily: theme.fontMono },
              ]}>
              INSPECT
            </Text>
            <ChevronRight size={12} color={theme.accentLight} />
          </View>
        </View>
      </Pressable>
    </View>
  );
}

function Skeleton({ theme }) {
  const block = [styles.skBlock, { backgroundColor: theme.bgElevated }];
  return (
    <View style={styles.skWrap}>
      <View style={[...block, styles.skBadgeRow]} />
      <View style={[...block, styles.skTitle]} />
      <View style={[...block, styles.skMeta]} />
      <View style={[...block, styles.skDesc]} />
      <View style={[...block, styles.skNode]} />
      <View style={[...block, styles.skNode]} />
    </View>
  );
}

export default function IncidentDrawer() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useOverlay();
  const {
    view,
    item,
    closeDrawer,
    openEvidence,
    fetchDetail,
    getCachedDetail,
  } = useSelection();
  const { width } = useWindowDimensions();
  const visible = view === 'drawer' && !!item;
  const enter = useRef(new Animated.Value(0)).current;

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(
    (id) => {
      setLoading(true);
      setError(false);
      fetchDetail(id)
        .then((d) => setDetail(d))
        .catch(() => {
          setError(true);
          showToast('Failed to load incident details');
        })
        .finally(() => setLoading(false));
    },
    [fetchDetail, showToast],
  );

  useEffect(() => {
    if (visible && item?.id) {
      const cached = getCachedDetail(item.id);
      setDetail(cached); // instant paint on reopen; null → skeleton
      if (!cached) {
        load(item.id);
      }
    }
  }, [visible, item?.id, getCachedDetail, load]);

  useEffect(() => {
    if (visible) {
      enter.setValue(0);
      Animated.timing(enter, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, enter]);

  if (!visible) {
    return null;
  }

  // Detail payload wins over list data once fetched (full description etc.).
  const inc = detail?.incident ? { ...item, ...detail.incident } : item;
  const timeline = [...(detail?.timeline || [])].sort(
    (a, b) => new Date(a.update_date) - new Date(b.update_date),
  );
  const report = timeline.find((u) => u.type === 'report') || timeline[0];
  const updates = timeline.filter((u) => u !== report);

  const copyLink = () => {
    Clipboard.setString(`http://localhost:5173/incident/${item.id}`);
    showToast('Link copied');
  };

  return (
    <Animated.View
      style={[
        styles.drawer,
        {
          backgroundColor: theme.bgSurface,
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom,
          transform: [
            {
              translateX: enter.interpolate({
                inputRange: [0, 1],
                outputRange: [width, 0],
              }),
            },
          ],
        },
      ]}>
      <View style={[styles.head, { borderBottomColor: theme.borderSubtle }]}>
        <Pressable
          onPress={closeDrawer}
          hitSlop={8}
          style={[styles.backBtn, { backgroundColor: theme.bgHover }]}>
          <ChevronLeft size={18} color={theme.textPrimary} />
        </Pressable>
        <Text
          style={[
            styles.title,
            { color: theme.textMuted, fontFamily: theme.fontMono },
          ]}>
          INCIDENT DETAILS
        </Text>
      </View>
      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <IncidentCard item={inc} />
        <View style={styles.actionRow}>
          <Pressable
            onPress={() => showToast('Full detail page arrives in a later prompt')}
            style={[styles.actBtn, styles.actPrimary, { backgroundColor: theme.accent }]}>
            <FileText size={13} color="#f2f2f2" />
            <Text style={[styles.actText, styles.actTextPrimary]}>Full details</Text>
          </Pressable>
          <Pressable
            onPress={copyLink}
            style={[
              styles.actBtn,
              { backgroundColor: theme.bgElevated, borderColor: theme.borderSubtle },
            ]}>
            <Link2 size={13} color={theme.textSecondary} />
            <Text style={[styles.actText, { color: theme.textSecondary }]}>
              Copy link
            </Text>
          </Pressable>
        </View>

        {loading && !detail ? <Skeleton theme={theme} /> : null}

        {error && !detail ? (
          <View
            style={[
              styles.errBox,
              { backgroundColor: theme.bgElevated, borderColor: theme.borderSubtle },
            ]}>
            <Text style={[styles.errText, { color: theme.textSecondary }]}>
              Could not load the incident timeline.
            </Text>
            <Pressable
              onPress={() => load(item.id)}
              style={[styles.retryBtn, { backgroundColor: theme.accent }]}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {report ? (
          <>
            <Text
              style={[
                styles.secLabel,
                { color: theme.textMuted, fontFamily: theme.fontMono },
              ]}>
              INITIAL REPORT
            </Text>
            <View style={styles.timeline}>
              <TimelineNode
                update={report}
                label="INITIAL REPORT"
                onInspect={() => openEvidence(report)}
              />
            </View>
          </>
        ) : null}

        {updates.length ? (
          <>
            <Text
              style={[
                styles.secLabel,
                { color: theme.textMuted, fontFamily: theme.fontMono },
              ]}>
              UPDATES
            </Text>
            <View style={styles.timeline}>
              {updates.map((u) => (
                <TimelineNode
                  key={u.id}
                  update={u}
                  label={`UPDATE ${fmtDate(u.update_date)}`}
                  onInspect={() => openEvidence(u)}
                />
              ))}
            </View>
          </>
        ) : null}
        <View style={styles.tailPad} />
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  drawer: {
    ...StyleSheet.absoluteFill,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 11,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  body: {
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  actBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  actPrimary: {
    borderColor: 'transparent',
  },
  actText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  actTextPrimary: {
    color: '#f2f2f2',
  },
  secLabel: {
    fontSize: 9.5,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 10,
  },
  timeline: {
    paddingLeft: 22,
    paddingRight: 16,
  },
  tlNode: {
    marginBottom: 14,
    paddingLeft: 16,
  },
  tlDot: {
    position: 'absolute',
    left: 0,
    top: 3,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 2,
  },
  tlMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 7,
  },
  tlTime: {
    fontSize: 9.5,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  tlTimeBold: {
    fontWeight: '700',
  },
  tlVerifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tlVerifDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  tlVerif: {
    fontSize: 8.5,
    letterSpacing: 1.2,
  },
  tlCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
  },
  tlHeadline: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
    marginBottom: 5,
  },
  tlSummary: {
    fontSize: 12.5,
    lineHeight: 19,
  },
  tlThumb: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginTop: 10,
  },
  tlFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 11,
  },
  tlCounts: {
    flexDirection: 'row',
    gap: 12,
  },
  tlCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tlCountX: {
    fontSize: 11,
    fontWeight: '700',
  },
  tlCountText: {
    fontSize: 11,
  },
  inspectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  inspectText: {
    fontSize: 9.5,
    letterSpacing: 1.2,
    fontWeight: '600',
  },
  skWrap: {
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 6,
  },
  skBlock: {
    borderRadius: 8,
  },
  skBadgeRow: {
    height: 22,
    width: '70%',
  },
  skTitle: {
    height: 26,
    width: '90%',
  },
  skMeta: {
    height: 14,
    width: '55%',
  },
  skDesc: {
    height: 84,
  },
  skNode: {
    height: 110,
    marginTop: 8,
  },
  errBox: {
    marginHorizontal: 16,
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },
  errText: {
    fontSize: 12.5,
  },
  retryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 9,
  },
  retryText: {
    color: '#f2f2f2',
    fontSize: 12.5,
    fontWeight: '600',
  },
  tailPad: {
    height: 28,
  },
});
