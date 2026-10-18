// Live Activity + Alerts fullscreen tab pages (prototype #sheet-activity /
// #sheet-alerts, renderActivity/renderAlerts — promoted from 60% sheets to
// tab destinations like the directories). Live rows come from LiveContext
// (SSE feed + local alert store); activity backfills recent incidents/zones
// from the list endpoint on open. Both feeds are day-grouped; alerts carry
// All/Unread/Incidents/Zones filter chips.

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { SheetScrollView } from './SheetContainer';
import { format, isToday, isValid, isYesterday, parseISO, subDays } from 'date-fns';
import { Bell, ChevronLeft, CircleCheck, Hexagon, Plus, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useLive } from '../../context/LiveContext';
import { useSelection } from '../../context/SelectionContext';
import { useOverlay } from '../../context/OverlayContext';
import { listIncidents, listZones } from '../../services/incidents.service';
import { compactAgo, nextId } from '../../services/live-utils';
import { PanelEmpty } from './profileShared';

// ─── Shared fullscreen header (directory pattern: back ‹ + title/subtitle) ───
function ScreenHeader({ title, subtitle, overlay, right }) {
  const { theme } = useTheme();
  const { closeOverlay } = useOverlay();
  return (
    <View style={styles.headRow}>
      <Pressable
        onPress={() => closeOverlay(overlay.id)}
        hitSlop={6}
        style={({ pressed }) => [
          styles.backBtn,
          { backgroundColor: pressed ? theme.bgElevated : theme.bgHover },
        ]}>
        <ChevronLeft size={17} color={theme.textPrimary} />
      </Pressable>
      <View style={styles.headTitles}>
        <Text
          style={[
            styles.headTitle,
            { color: theme.textPrimary, fontFamily: theme.fontHead },
          ]}>
          {title}
        </Text>
        <Text style={[styles.headSub, { color: theme.textSecondary }]}>
          {subtitle}
        </Text>
      </View>
      {right || null}
    </View>
  );
}

// Day grouping for feeds (newest first — group order follows first hit).
function dayLabel(iso) {
  const d = iso ? parseISO(iso) : null;
  if (!d || !isValid(d)) return 'EARLIER';
  if (isToday(d)) return 'TODAY';
  if (isYesterday(d)) return 'YESTERDAY';
  return format(d, 'dd MMM yyyy').toUpperCase();
}

function groupByDay(entries) {
  const groups = [];
  const idx = new Map();
  entries.forEach((e) => {
    const label = dayLabel(e.timeISO);
    if (!idx.has(label)) {
      idx.set(label, groups.length);
      groups.push({ label, items: [] });
    }
    groups[idx.get(label)].items.push(e);
  });
  return groups;
}

function DayHeader({ label }) {
  const { theme } = useTheme();
  return (
    <View style={styles.dayHead}>
      <View style={[styles.dayRule, { backgroundColor: theme.borderSubtle }]} />
      <Text
        style={[
          styles.dayLabel,
          { color: theme.textMuted, fontFamily: theme.fontMono },
        ]}>
        {label}
      </Text>
      <View style={[styles.dayRule, { backgroundColor: theme.borderSubtle }]} />
    </View>
  );
}

// Activity action → icon (type color comes from the entry's colorToken).
function actionIcon(action) {
  const a = (action || '').toLowerCase();
  if (a.includes('zone')) return Hexagon;
  if (a.includes('update')) return RefreshCw;
  if (a.includes('resolv')) return CircleCheck;
  return Plus;
}

const TYPE_COLORS = {
  new: 'success',
  update: 'sev2',
  zone: 'catMaritime',
  resolved: 'textMuted',
};

const TYPE_ICONS = {
  new: Plus,
  update: RefreshCw,
  zone: Hexagon,
  resolved: CircleCheck,
};

// Small pulsing dot for the LIVE meta (mirrors the prototype live-pulse).
function PulseDot({ color, pulsing }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!pulsing) {
      pulse.setValue(1);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.3,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, pulsing]);
  return (
    <Animated.View
      style={[styles.pulseDot, { backgroundColor: color, opacity: pulse }]}
    />
  );
}

function FeedRow({ entry, onPress }) {
  const { theme } = useTheme();
  const dot = theme[entry.colorToken] || theme.textMuted;
  const Icon = actionIcon(entry.action);
  const inner = (
    <>
      <View style={[styles.feedIcon, { backgroundColor: `${dot}1F` }]}>
        <Icon size={15} color={dot} />
      </View>
      <Text style={styles.actTxt} numberOfLines={2}>
        <Text style={[styles.actAction, { color: theme.textPrimary }]}>
          {entry.action}
        </Text>
        <Text style={{ color: theme.textSecondary }}>{` — ${entry.title}`}</Text>
      </Text>
      <Text
        style={[
          styles.actTime,
          { color: theme.textMuted, fontFamily: theme.fontMono },
        ]}>
        {compactAgo(entry.timeISO)}
      </Text>
    </>
  );
  if (!onPress) {
    return (
      <View style={[styles.actRow, { borderBottomColor: theme.borderSubtle }]}>
        {inner}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actRow,
        { borderBottomColor: theme.borderSubtle },
        pressed && { backgroundColor: theme.bgHover },
      ]}>
      {inner}
    </Pressable>
  );
}

export function ActivitySheetBody({ overlay }) {
  const { theme } = useTheme();
  const { signedIn } = useAuth();
  const { connState, activity } = useLive();
  const { previewItemOnMap } = useSelection();
  const { showToast } = useOverlay();

  const [backfill, setBackfill] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Backfill: latest incidents + zones (last 7 days) as "New …" rows so the
  // feed isn't empty before the first SSE event arrives.
  const loadBackfill = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const from = format(subDays(new Date(), 6), 'yyyy-MM-dd');
      const to = format(new Date(), 'yyyy-MM-dd');
      const [pointRes, zoneRes] = await Promise.all([
        listIncidents({ dateFrom: from, dateTo: to }),
        listZones({ dateFrom: from, dateTo: to }),
      ]);
      const rows = [
        ...(pointRes?.incidents || []).map((r) => ({ row: r, zone: false })),
        ...(zoneRes?.incidents || []).map((r) => ({ row: r, zone: true })),
      ];
      rows.sort((a, b) =>
        String(b.row.created_at || '').localeCompare(
          String(a.row.created_at || ''),
        ),
      );
      setBackfill(
        rows.slice(0, 20).map(({ row, zone }) => ({
          id: nextId('bf'),
          action: zone ? 'New zone' : 'New incident',
          colorToken: zone ? 'catMaritime' : 'success',
          title: row.title || 'Untitled',
          timeISO:
            row.created_at && isValid(parseISO(row.created_at))
              ? row.created_at
              : null,
          kind: zone ? 'zone' : 'incident',
          itemId: row.id || null,
          item: row,
        })),
      );
    } catch {
      setError(true);
      showToast('Could not load recent activity');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadBackfill();
  }, [loadBackfill]);

  const meta = useMemo(() => {
    if (connState === 'live') {
      return { label: 'LIVE · REAL-TIME VIA SSE', live: true };
    }
    if (signedIn) {
      return { label: 'RECONNECTING · RETRYING IN BACKGROUND', live: false };
    }
    return { label: 'OFFLINE · SIGN IN FOR LIVE STREAM', live: false };
  }, [connState, signedIn]);

  const openItem = (entry) => {
    if (entry.item && entry.item.title) {
      previewItemOnMap(entry.kind, entry.item, { type: 'fullscreen' });
    }
  };

  const feed = useMemo(
    () => groupByDay([...activity, ...backfill]),
    [activity, backfill],
  );

  let body;
  if (loading && !activity.length) {
    body = [0, 1, 2, 3].map((i) => (
      <View
        key={i}
        style={[styles.skRow, { backgroundColor: theme.bgElevated }]}
      />
    ));
  } else if (feed.length) {
    body = feed.map((g) => (
      <View key={g.label}>
        <DayHeader label={g.label} />
        {g.items.map((entry) => (
          <FeedRow
            key={entry.id}
            entry={entry}
            onPress={() => openItem(entry)}
          />
        ))}
      </View>
    ));
  } else {
    body = (
      <PanelEmpty
        icon={<Bell size={26} color={theme.textMuted} />}
        title={error ? 'Could not load activity' : 'No activity yet'}
        sub={
          error
            ? 'Check the connection and try again.'
            : 'New incidents, updates and zone changes land here live.'
        }
        ctaLabel={error ? 'Retry' : undefined}
        onCta={error ? loadBackfill : undefined}
      />
    );
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader
        overlay={overlay}
        title="Live Activity"
        subtitle="Real-time incident stream"
        right={
          <View
            style={[
              styles.liveChip,
              {
                backgroundColor: meta.live
                  ? theme.accentSubtleBg
                  : theme.bgElevated,
                borderColor: meta.live ? theme.danger : theme.borderSubtle,
              },
            ]}>
            <PulseDot
              color={meta.live ? theme.danger : theme.textMuted}
              pulsing={meta.live}
            />
            <Text
              style={[
                styles.liveChipText,
                {
                  color: meta.live ? theme.danger : theme.textMuted,
                  fontFamily: theme.fontMono,
                },
              ]}>
              {meta.live ? 'LIVE' : signedIn ? 'RECONNECTING' : 'OFFLINE'}
            </Text>
          </View>
        }
      />
      <SheetScrollView
        style={styles.flex}
        contentContainerStyle={styles.listPad}
        showsVerticalScrollIndicator={false}>
        {body}
      </SheetScrollView>
    </View>
  );
}

const ALERT_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'incident', label: 'Incidents' },
  { key: 'zone', label: 'Zones' },
];

export function AlertsSheetBody({ overlay }) {
  const { theme } = useTheme();
  const { alerts, unreadCount, markAllRead, markRead } = useLive();
  const { previewItemOnMap } = useSelection();
  const [filter, setFilter] = useState('all');

  const openAlert = (alert) => {
    markRead(alert.id);
    if (alert.item && alert.item.title && alert.itemId) {
      previewItemOnMap(alert.kind, alert.item, { type: 'fullscreen' });
    }
  };

  const filtered = useMemo(
    () =>
      alerts.filter((a) => {
        if (filter === 'unread') return !a.read;
        if (filter === 'incident') return a.kind === 'incident';
        if (filter === 'zone') return a.kind === 'zone';
        return true;
      }),
    [alerts, filter],
  );
  const groups = useMemo(() => groupByDay(filtered), [filtered]);

  return (
    <View style={styles.flex}>
      <ScreenHeader
        overlay={overlay}
        title="Alerts"
        subtitle={
          unreadCount
            ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
            : 'All caught up'
        }
        right={
          unreadCount ? (
            <Pressable
              onPress={markAllRead}
              hitSlop={6}
              style={({ pressed }) => [
                styles.markReadBtn,
                {
                  borderColor: theme.accentSubtleBorder,
                  backgroundColor: pressed
                    ? theme.bgHover
                    : theme.accentSubtleBg,
                },
              ]}>
              <Text
                style={[
                  styles.markReadText,
                  { color: theme.accentLight, fontFamily: theme.fontMono },
                ]}>
                MARK READ
              </Text>
            </Pressable>
          ) : null
        }
      />
      {/* filter chips */}
      <View style={styles.chipRow}>
        {ALERT_FILTERS.map((f) => {
          const on = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[
                styles.fChip,
                {
                  borderColor: on ? theme.accentLight : theme.borderSubtle,
                  backgroundColor: on ? theme.accentSubtleBg : theme.bgElevated,
                },
              ]}>
              <Text
                style={[
                  styles.fChipText,
                  { fontFamily: theme.fontMono },
                  { color: on ? theme.accentLight : theme.textSecondary },
                ]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <SheetScrollView
        style={styles.flex}
        contentContainerStyle={styles.listPad}
        showsVerticalScrollIndicator={false}>
        {groups.length ? (
          groups.map((g) => (
            <View key={g.label}>
              <DayHeader label={g.label} />
              {g.items.map((alert) => {
                const color = theme[TYPE_COLORS[alert.type]] || theme.textMuted;
                const Icon = TYPE_ICONS[alert.type] || Bell;
                const unread = !alert.read;
                return (
                  <Pressable
                    key={alert.id}
                    onPress={() => openAlert(alert)}
                    style={({ pressed }) => [
                      styles.alCard,
                      { borderBottomColor: theme.borderSubtle },
                      unread && {
                        backgroundColor: theme.accentSubtleBg,
                        borderLeftWidth: 2,
                        borderLeftColor: theme.accentLight,
                      },
                      alert.read && styles.alRead,
                      pressed && { backgroundColor: theme.bgHover },
                    ]}>
                    <View
                      style={[
                        styles.alIcon,
                        { backgroundColor: `${color}1F` },
                      ]}>
                      <Icon size={16} color={color} />
                    </View>
                    <View style={styles.alBody}>
                      <Text
                        style={[
                          styles.alTitle,
                          { color: theme.textPrimary },
                          unread && styles.alTitleUnread,
                        ]}
                        numberOfLines={2}>
                        {alert.title}
                      </Text>
                      <Text
                        style={[styles.alSub, { color: theme.textSecondary }]}
                        numberOfLines={1}>
                        {alert.sub}
                      </Text>
                    </View>
                    {unread ? (
                      <View
                        style={[
                          styles.unreadDot,
                          { backgroundColor: theme.accentLight },
                        ]}
                      />
                    ) : null}
                    <Text
                      style={[
                        styles.alTime,
                        { color: theme.textMuted, fontFamily: theme.fontMono },
                      ]}>
                      {compactAgo(alert.timeISO)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))
        ) : (
          <PanelEmpty
            icon={<Bell size={26} color={theme.textMuted} />}
            title={filter === 'all' ? 'No alerts yet' : 'Nothing here'}
            sub={
              filter === 'all'
                ? 'New incidents, updates and zone changes land here.'
                : 'Try a different filter.'
            }
          />
        )}
      </SheetScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headTitles: { flex: 1 },
  headTitle: { fontSize: 17, fontWeight: '600', letterSpacing: -0.1 },
  headSub: { fontSize: 10.5, marginTop: 1 },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    borderWidth: 1,
  },
  liveChipText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  fChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  fChipText: { fontSize: 10 },
  markReadBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  markReadText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  listPad: { paddingBottom: 24 },
  dayHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  dayRule: { flex: 1, height: StyleSheet.hairlineWidth },
  dayLabel: {
    fontSize: 9,
    letterSpacing: 1.6,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  actRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  feedIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actTxt: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  actAction: {
    fontWeight: '600',
  },
  actTime: {
    fontSize: 9.5,
  },
  skRow: {
    height: 40,
    borderRadius: 10,
    marginHorizontal: 14,
    marginTop: 10,
  },
  alCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  alRead: {
    opacity: 0.55,
  },
  alIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alBody: {
    flex: 1,
    minWidth: 0,
  },
  alTitle: {
    fontSize: 12.5,
    fontWeight: '600',
    lineHeight: 17,
    marginBottom: 3,
  },
  alTitleUnread: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  alSub: {
    fontSize: 11,
  },
  alTime: {
    fontSize: 9.5,
  },
});
