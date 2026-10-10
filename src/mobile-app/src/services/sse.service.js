// SSE transport for the incident stream (GET /api/v1/incidents/stream).
// Auth: JWT via ?token= query param (EventSource can't send headers).
// react-native-sse handles the SSE framing; the server writes a
// ": connected" comment heartbeat on connect and `data: <json>\n\n` events.
//
// Lifecycle is driven by LiveContext (connect when signed in, disconnect on
// sign-out/background). This module owns: connection state, auto-reconnect
// with capped backoff (1s → 2s → 5s → 15s), event parsing, fan-out to
// subscribers. It never throws into the app — failures flip the state to
// 'offline' and keep retrying silently.

import EventSource from 'react-native-sse';
import { API_BASE_URL } from '../constants';

const BACKOFF_STEPS_MS = [1000, 2000, 5000, 15000];

let es = null;
let token = null;
let state = 'idle'; // 'idle' | 'connecting' | 'live' | 'offline'
let backoffStep = 0;
let retryTimer = null;
let outageNotified = false;

const eventSubs = new Set();
const stateSubs = new Set();
const outageSubs = new Set();

function setState(next) {
  if (state === next) {
    return;
  }
  state = next;
  stateSubs.forEach((fn) => {
    try {
      fn(state);
    } catch {
      // subscriber errors must not break the loop
    }
  });
}

function clearRetry() {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

function scheduleRetry() {
  clearRetry();
  const delay = BACKOFF_STEPS_MS[Math.min(backoffStep, BACKOFF_STEPS_MS.length - 1)];
  backoffStep = Math.min(backoffStep + 1, BACKOFF_STEPS_MS.length - 1);
  retryTimer = setTimeout(() => {
    retryTimer = null;
    if (token) {
      open();
    }
  }, delay);
}

function open() {
  if (!token) {
    return;
  }
  try {
    es?.close();
  } catch {
    // stale socket — ignore
  }
  const url = `${API_BASE_URL}/incidents/stream?token=${encodeURIComponent(token)}`;
  setState('connecting');
  es = new EventSource(url);

  es.addEventListener('open', () => {
    backoffStep = 0;
    outageNotified = false;
    setState('live');
  });

  es.addEventListener('message', (e) => {
    if (!e || typeof e.data !== 'string') {
      return;
    }
    let parsed = null;
    try {
      parsed = JSON.parse(e.data);
    } catch {
      return; // heartbeat comments / malformed frames are ignored
    }
    eventSubs.forEach((fn) => {
      try {
        fn(parsed);
      } catch {
        // subscriber errors must not break the stream
      }
    });
  });

  es.addEventListener('error', () => {
    setState('offline');
    if (!outageNotified) {
      outageNotified = true;
      outageSubs.forEach((fn) => {
        try {
          fn();
        } catch {
          // ignore
        }
      });
    }
    scheduleRetry();
  });
}

export function connectSse(nextToken) {
  token = nextToken || null;
  clearRetry();
  if (!token) {
    setState('idle');
    return;
  }
  backoffStep = 0;
  open();
}

export function disconnectSse() {
  token = null;
  clearRetry();
  try {
    es?.close();
  } catch {
    // ignore
  }
  es = null;
  setState('idle');
}

export function subscribeSse(fn) {
  eventSubs.add(fn);
  return () => eventSubs.delete(fn);
}

export function subscribeSseState(fn) {
  stateSubs.add(fn);
  return () => stateSubs.delete(fn);
}

// Fires once per outage (first error after a live session) — for the
// one-time "connection lost" toast. Resets on the next successful open.
export function subscribeSseOutage(fn) {
  outageSubs.add(fn);
  return () => outageSubs.delete(fn);
}

export function getSseState() {
  return state;
}
