const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

let source = null;
let reconnectTimer = null;
const listeners = new Set();

export function connect() {
  if (source) return;

  source = new EventSource(`${API_BASE}/events/stream`);

  source.onopen = () => {
    // console.log('[SSE] Connected');
  };

  source.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      listeners.forEach((cb) => cb(data));
    } catch {
      // ignore parse errors
    }
  };

  source.onerror = () => {
    source.close();
    source = null;
    // Auto-reconnect after 5s
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => connect(), 5000);
  };
}

export function disconnect() {
  clearTimeout(reconnectTimer);
  if (source) {
    source.close();
    source = null;
  }
}

export function subscribe(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
