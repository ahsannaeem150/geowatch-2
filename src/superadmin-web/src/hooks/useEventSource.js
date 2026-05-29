import { useEffect, useRef, useState, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

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
    const url = `${API_BASE}/incidents/stream`;

    // EventSource does not support custom headers, so we append token as query param
    const fullUrl = token ? `${url}?token=${encodeURIComponent(token)}` : url;

    const es = new EventSource(fullUrl);
    esRef.current = es;

    es.onopen = () => {
      setConnected(true);
      setReconnectAttempt(0);
      onConnect?.();
    };

    es.onmessage = (e) => {
      if (!e.data || e.data.startsWith(':')) return; // heartbeat
      try {
        const data = JSON.parse(e.data);
        onEvent?.(data);
      } catch (err) {
        console.warn('SSE parse error:', err);
      }
    };

    es.onerror = () => {
      setConnected(false);
      onDisconnect?.();
      es.close();

      // Exponential backoff reconnect
      if (reconnectAttempt < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(RECONNECT_DELAY * (reconnectAttempt + 1), 30000);
        const timer = setTimeout(() => {
          setReconnectAttempt((a) => a + 1);
          connect();
        }, delay);
        timersRef.current.push(timer);
      }
    };
  }, [onEvent, onConnect, onDisconnect, reconnectAttempt, clearTimers]);

  useEffect(() => {
    connect();
    return () => {
      clearTimers();
      if (esRef.current) {
        try { esRef.current.close(); } catch { /* ignore */ }
        esRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Connect once on mount; reconnect logic is internal

  return { connected, reconnectAttempt };
}
