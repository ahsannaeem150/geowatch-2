// Live layer (P11): SSE connection lifecycle, local alert store, activity
// feed, away banner — client-side only, no backend changes (owner decision).
//
// - Connects to /incidents/stream ONLY when signed in (JWT from Keychain);
//   disconnects on sign-out and while backgrounded (battery).
// - Alerts persist to AsyncStorage (cap ALERT_CAP) and also accrue from a
//   list-diff on app foreground (signed-out fallback; for signed-in users it
//   heals the gap left while the stream was disconnected in background).
// - Away banner: foreground after >AWAY_THRESHOLD_MS with alerts gained since
//   LAST_ACTIVE → "While you were away" (never on first launch).

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { useMap } from './MapContext';
import { useOverlay } from './OverlayContext';
import { getStoredToken } from '../services/api';
import { listIncidents, listZones } from '../services/incidents.service';
import {
  connectSse,
  disconnectSse,
  subscribeSse,
  subscribeSseOutage,
  subscribeSseState,
} from '../services/sse.service';
import {
  ALERT_CAP,
  AWAY_THRESHOLD_MS,
  awayCounts,
  capList,
  DEFAULT_NOTIF_PREFS,
  DIFF_ALERT_CAP,
  diffNewRows,
  diffRowToAlert,
  FEED_CAP,
  mapSseEvent,
  shouldAlert,
} from '../services/live-utils';
import { STORAGE_KEYS } from '../constants';

const LiveContext = createContext(null);
const MIN_DIFF_INTERVAL_MS = 30000;

export function LiveProvider({ children }) {
  const { signedIn } = useAuth();
  const { incidents, zones } = useMap();
  const { showToast, openOverlay, closeOverlay } = useOverlay();

  const [connState, setConnState] = useState('idle');
  const [activity, setActivity] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertsLoaded, setAlertsLoaded] = useState(false);
  const [awayBanner, setAwayBanner] = useState(null); // { newCount, updateCount }
  const [notifPrefs, setNotifPrefs] = useState(DEFAULT_NOTIF_PREFS);

  const alertsRef = useRef(alerts);
  const incidentsRef = useRef(incidents);
  const zonesRef = useRef(zones);
  const notifPrefsRef = useRef(notifPrefs);
  const lastDiffAtRef = useRef(0);
  useEffect(() => {
    alertsRef.current = alerts;
  }, [alerts]);
  useEffect(() => {
    incidentsRef.current = incidents;
  }, [incidents]);
  useEffect(() => {
    zonesRef.current = zones;
  }, [zones]);
  useEffect(() => {
    notifPrefsRef.current = notifPrefs;
  }, [notifPrefs]);

  // ─── Notification prefs (persisted; gate alert creation — P12) ───
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.NOTIF_PREFS)
      .then((raw) => {
        if (raw) {
          setNotifPrefs({ ...DEFAULT_NOTIF_PREFS, ...JSON.parse(raw) });
        }
      })
      .catch(() => {});
  }, []);

  const setNotifPref = useCallback((key, value) => {
    setNotifPrefs((prev) => {
      const next = { ...prev, [key]: value };
      AsyncStorage.setItem(STORAGE_KEYS.NOTIF_PREFS, JSON.stringify(next)).catch(
        () => {},
      );
      return next;
    });
  }, []);

  const lookupIncident = useCallback((id) => {
    return (
      incidentsRef.current.find((i) => i.id === id) ||
      zonesRef.current.find((z) => z.id === id) ||
      null
    );
  }, []);

  // ─── Alert store (persisted) ───
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEYS.ALERTS)
      .then((raw) => {
        if (!cancelled && raw) {
          setAlerts(capList(JSON.parse(raw), ALERT_CAP));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setAlertsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (alertsLoaded) {
      AsyncStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(alerts)).catch(
        () => {},
      );
    }
  }, [alerts, alertsLoaded]);

  const addAlerts = useCallback((entries) => {
    if (!entries.length) {
      return;
    }
    setAlerts((prev) => {
      const keys = new Set(
        prev.map((a) => a.dedupeKey).filter(Boolean),
      );
      const fresh = entries.filter(
        (a) => !a.dedupeKey || !keys.has(a.dedupeKey),
      );
      return capList([...fresh, ...prev], ALERT_CAP);
    });
  }, []);

  const markAllRead = useCallback(() => {
    setAlerts((prev) =>
      prev.some((a) => !a.read) ? prev.map((a) => ({ ...a, read: true })) : prev,
    );
  }, []);

  const markRead = useCallback((id) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id && !a.read ? { ...a, read: true } : a)),
    );
  }, []);

  const unreadCount = useMemo(
    () => alerts.reduce((n, a) => n + (a.read ? 0 : 1), 0),
    [alerts],
  );

  // ─── SSE connection lifecycle ───
  useEffect(() => subscribeSseState(setConnState), []);

  useEffect(() => {
    if (!signedIn) {
      disconnectSse();
      return undefined;
    }
    let cancelled = false;
    getStoredToken().then((token) => {
      if (!cancelled && token) {
        connectSse(token);
      }
    });
    return () => {
      cancelled = true;
      disconnectSse();
    };
  }, [signedIn]);

  // One toast per outage; reconnects keep happening silently (service).
  useEffect(
    () =>
      subscribeSseOutage(() =>
        showToast('Live connection lost — retrying in background'),
      ),
    [showToast],
  );

  // SSE events → activity feed + alerts.
  useEffect(
    () =>
      subscribeSse((evt) => {
        const mapped = mapSseEvent(evt, lookupIncident);
        if (!mapped) {
          return;
        }
        if (mapped.feed) {
          setActivity((prev) => capList([mapped.feed, ...prev], FEED_CAP));
        }
        if (mapped.alert && shouldAlert(mapped.alert, notifPrefsRef.current)) {
          addAlerts([mapped.alert]);
        }
      }),
    [lookupIncident, addAlerts],
  );

  // ─── Foreground routine: list-diff + away banner ───
  const runForeground = useCallback(async () => {
    const now = Date.now();
    if (now - lastDiffAtRef.current < MIN_DIFF_INTERVAL_MS) {
      return;
    }
    lastDiffAtRef.current = now;

    const lastActive = await AsyncStorage.getItem(
      STORAGE_KEYS.LAST_ACTIVE,
    ).catch(() => null);
    let freshAlerts = [];

    // List-diff: default list window = currently-visible incidents/zones.
    try {
      const [pointRes, zoneRes] = await Promise.all([
        listIncidents({}),
        listZones({}),
      ]);
      const rows = [
        ...(pointRes?.incidents || []).map((r) => ({ row: r, zone: false })),
        ...(zoneRes?.incidents || []).map((r) => ({ row: r, zone: true })),
      ];
      const rawSnapshot = await AsyncStorage.getItem(
        STORAGE_KEYS.SEEN_SNAPSHOT,
      ).catch(() => null);
      const snapshot = rawSnapshot ? JSON.parse(rawSnapshot) : null;
      await AsyncStorage.setItem(
        STORAGE_KEYS.SEEN_SNAPSHOT,
        JSON.stringify({ ids: rows.map((r) => r.row.id), at: new Date().toISOString() }),
      ).catch(() => {});

      if (snapshot && Array.isArray(snapshot.ids)) {
        // First launch has no snapshot → take it silently, no alerts/banner.
        freshAlerts = diffNewRows(
          rows.map((r) => ({ ...r.row, __zone: r.zone })),
          snapshot.ids,
        )
          .slice(0, DIFF_ALERT_CAP)
          .map((r) => diffRowToAlert(r, r.__zone))
          .filter((a) => shouldAlert(a, notifPrefsRef.current));
        addAlerts(freshAlerts);
      }
    } catch {
      // offline / backend down — diff simply skips this cycle
    }

    // Away banner (never on first launch — no LAST_ACTIVE yet). Just-added
    // diff alerts are included explicitly — setState hasn't flushed yet.
    if (lastActive && now - Date.parse(lastActive) > AWAY_THRESHOLD_MS) {
      const counts = awayCounts(
        [...freshAlerts, ...alertsRef.current],
        lastActive,
      );
      if (counts.newCount + counts.updateCount > 0) {
        setAwayBanner(counts);
      }
    }
  }, [addAlerts]);

  useEffect(() => {
    if (!alertsLoaded) {
      return undefined;
    }
    // LAST_ACTIVE heartbeat: written only while the app is foreground-active
    // (gated on AppState.currentState — a live-but-backgrounded JS runtime
    // must not keep stamping, or away time never accumulates). A
    // 'background'-time write is unreliable on Android — with JS suspended
    // the event is delivered on RESUME, stamping the resume time and
    // destroying the away measurement.
    const stampActive = () => {
      if (AppState.currentState === 'active') {
        AsyncStorage.setItem(
          STORAGE_KEYS.LAST_ACTIVE,
          new Date().toISOString(),
        ).catch(() => {});
      }
    };
    runForeground().finally(stampActive); // cold start counts as a foreground
    const heartbeat = setInterval(stampActive, 20000);
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        if (signedIn) {
          getStoredToken().then((token) => {
            if (token) connectSse(token);
          });
        }
        // Stamp AFTER the away check has read the previous LAST_ACTIVE.
        runForeground().finally(stampActive);
      } else if (next === 'background') {
        disconnectSse();
      }
    });
    return () => {
      sub.remove();
      clearInterval(heartbeat);
    };
  }, [alertsLoaded, signedIn, runForeground]);

  const dismissAway = useCallback(
    (view) => {
      setAwayBanner(null);
      if (view) {
        closeOverlay('alerts');
        openOverlay({ id: 'activity', type: 'sheet' });
      }
    },
    [openOverlay, closeOverlay],
  );

  const value = useMemo(
    () => ({
      connState,
      activity,
      alerts,
      unreadCount,
      markAllRead,
      markRead,
      addAlerts,
      awayBanner,
      dismissAway,
      notifPrefs,
      setNotifPref,
    }),
    [
      connState,
      activity,
      alerts,
      unreadCount,
      markAllRead,
      markRead,
      addAlerts,
      awayBanner,
      dismissAway,
      notifPrefs,
      setNotifPref,
    ],
  );

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLive() {
  const ctx = useContext(LiveContext);
  if (!ctx) {
    throw new Error('useLive must be used within LiveProvider');
  }
  return ctx;
}

export default LiveContext;
