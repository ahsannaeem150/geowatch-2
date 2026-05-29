import { useEffect, useRef, useState, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * React hook for Server-Sent Events (SSE)
 * Connects to the backend event stream and calls onEvent for each message.
 *
 * @param {object} options
 * @param {function} options.onEvent - Called with parsed event data { type, ... }
 * @param {function} options.onConnect - Called when connection opens
 * @param {function} options.onDisconnect - Called when connection closes
 */
export function useEventSource({ onEvent, onConnect, onDisconnect }) {
  const [connected, setConnected] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const esRef = useRef(null);
  const timersRef = useRef([]);

  // Use refs for callbacks so connect() doesn't recreate on every render
  const onEventRef = useRef(onEvent);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  const reconnectAttemptRef = useRef(reconnectAttempt);

  // Keep refs in sync with latest props/state
  onEventRef.current = onEvent;
  onConnectRef.current = onConnect;
  onDisconnectRef.current = onDisconnect;
  reconnectAttemptRef.current = reconnectAttempt;

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const connect = useCallback(() => {
    clearTimers();

    if (esRef.current) {
      try { esRef.current.close(); } catch { /* ignore */ }
      esRef.current = null;
    }

    const token = localStorage.getItem('superadmin_token');
    if (!token) {
      // No token available — skip connection, will retry on next render if token appears
      return;
    }
    const url = `${API_BASE}/incidents/stream`;
    const fullUrl = `${url}?token=${encodeURIComponent(token)}`;

    const es = new EventSource(fullUrl);
    esRef.current = es;

    es.onopen = () => {
      setConnected(true);
      setReconnectAttempt(0);
      onConnectRef.current?.();
    };

    es.onmessage = (e) => {
      if (!e.data || e.data.startsWith(':')) return; // heartbeat
      try {
        const data = JSON.parse(e.data);
        onEventRef.current?.(data);
      } catch (err) {
        console.warn('SSE parse error:', err);
      }
    };

    es.onerror = () => {
      setConnected(false);
      onDisconnectRef.current?.();
      es.close();

      const attempt = reconnectAttemptRef.current;
      if (attempt < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(RECONNECT_DELAY * (attempt + 1), 30000);
        const timer = setTimeout(() => {
          setReconnectAttempt((a) => a + 1);
          connect();
        }, delay);
        timersRef.current.push(timer);
      }
    };
  }, [clearTimers]);

  // Connect on mount, cleanup on unmount
  useEffect(() => {
    connect();
    return () => {
      clearTimers();
      if (esRef.current) {
        try { esRef.current.close(); } catch { /* ignore */ }
        esRef.current = null;
      }
    };
  }, [connect, clearTimers]);

  return { connected, reconnectAttempt };
}
