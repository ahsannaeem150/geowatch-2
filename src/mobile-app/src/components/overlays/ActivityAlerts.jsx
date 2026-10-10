// Real bodies for the Live Activity + Alerts sheets (prototype #sheet-activity
// / #sheet-alerts, renderActivity/renderAlerts). Live rows come from
// LiveContext (SSE feed + local alert store); the activity sheet backfills
// recent incidents/zones from the list endpoint on open.

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { format, isValid, parseISO, subDays } from 'date-fns';
import { Bell, CircleCheck, Hexagon, Plus, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useLive } from '../../context/LiveContext';
import { useSelection } from '../../context/SelectionContext';
import { useOverlay } from '../../context/OverlayContext';
import { listIncidents, listZones } from '../../services/incidents.service';
import { compactAgo, nextId } from '../../services/live-utils';
import { PanelEmpty } from './profileShared';

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
  const inner = (
    <>
      <View
        style={[
          styles.actDot,
          { backgroundColor: dot, shadowColor: dot },
        ]}
      />
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

export function ActivitySheetBody() {
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
      previewItemOnMap(entry.kind, entry.item, {
        type: 'sheet',
        id: 'activity',
      });
    }
  };

  let body;
  if (loading && !activity.length) {
    body = [0, 1, 2, 3].map((i) => (
      <View
        key={i}
        style={[styles.skRow, { backgroundColor: theme.bgElevated }]}
      />
    ));
  } else {
    body = (
      <>
        {activity.map((entry) => (
          <FeedRow
            key={entry.id}
            entry={entry}
            onPress={() => openItem(entry)}
          />
        ))}
        {activity.length && backfill.length ? (
          <Text
            style={[
              styles.divider,
              { color: theme.textMuted, fontFamily: theme.fontMono },
            ]}>
            — EARLIER · FROM BACKEND —
          </Text>
        ) : null}
        {backfill.map((entry) => (
          <FeedRow
            key={entry.id}
            entry={entry}
            onPress={() => openItem(entry)}
          />
        ))}
        {!activity.length && !backfill.length ? (
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
        ) : null}
      </>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={[styles.metaRow, { borderBottomColor: theme.borderSubtle }]}>
        <PulseDot
          color={meta.live ? theme.danger : theme.textMuted}
          pulsing={meta.live}
        />
        <Text
          style={[
            styles.metaText,
            {
              color: meta.live ? theme.danger : theme.textMuted,
              fontFamily: theme.fontMono,
            },
          ]}>
          {meta.label}
        </Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>{body}</ScrollView>
    </View>
  );
}

export function AlertsSheetBody() {
  const { theme } = useTheme();
  const { alerts, unreadCount, markAllRead, markRead } = useLive();
  const { previewItemOnMap } = useSelection();

  const openAlert = (alert) => {
    markRead(alert.id);
    if (alert.item && alert.item.title && alert.itemId) {
      previewItemOnMap(alert.kind, alert.item, {
        type: 'sheet',
        id: 'alerts',
      });
    }
  };

  return (
    <View style={styles.flex}>
      <View style={[styles.metaRow, { borderBottomColor: theme.borderSubtle }]}>
        <Text
          style={[
            styles.metaText,
            {
              color: unreadCount ? theme.accentLight : theme.textMuted,
              fontFamily: theme.fontMono,
            },
          ]}>
          {unreadCount ? `${unreadCount} UNREAD` : 'ALL CAUGHT UP'}
        </Text>
        <View style={styles.metaSpacer} />
        {unreadCount ? (
          <Pressable onPress={markAllRead} hitSlop={8}>
            <Text
              style={[
                styles.metaText,
                { color: theme.accentLight, fontFamily: theme.fontMono },
              ]}>
              MARK ALL READ
            </Text>
          </Pressable>
        ) : null}
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {alerts.length ? (
          alerts.map((alert) => {
            const color = theme[TYPE_COLORS[alert.type]] || theme.textMuted;
            const Icon = TYPE_ICONS[alert.type] || Bell;
            return (
              <Pressable
                key={alert.id}
                onPress={() => openAlert(alert)}
                style={({ pressed }) => [
                  styles.alCard,
                  { borderBottomColor: theme.borderSubtle },
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
                    style={[styles.alTitle, { color: theme.textPrimary }]}
                    numberOfLines={2}>
                    {alert.title}
                  </Text>
                  <Text
                    style={[styles.alSub, { color: theme.textSecondary }]}
                    numberOfLines={1}>
                    {alert.sub}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.alTime,
                    { color: theme.textMuted, fontFamily: theme.fontMono },
                  ]}>
                  {compactAgo(alert.timeISO)}
                </Text>
              </Pressable>
            );
          })
        ) : (
          <PanelEmpty
            icon={<Bell size={26} color={theme.textMuted} />}
            title="No alerts yet"
            sub="New incidents, updates and zone changes land here."
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  metaSpacer: {
    flex: 1,
  },
  metaText: {
    fontSize: 9.5,
    letterSpacing: 1.4,
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
  actDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOpacity: 0.9,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
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
  divider: {
    fontSize: 9,
    letterSpacing: 1.6,
    textAlign: 'center',
    paddingVertical: 10,
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
  alSub: {
    fontSize: 11,
  },
  alTime: {
    fontSize: 9.5,
  },
});
