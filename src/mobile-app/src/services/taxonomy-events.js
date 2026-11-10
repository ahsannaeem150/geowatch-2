import EventSource from 'react-native-sse';
import { API_BASE_URL } from '../constants';

const listeners = new Set();
let source = null;
let reconnectTimer = null;

function connect() {
  if (source) return;
  source = new EventSource(`${API_BASE_URL}/taxonomy/stream`);
  source.addEventListener('message', (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload.type === 'taxonomy_updated') {
        listeners.forEach((listener) => listener(payload));
      }
    } catch {
      // Ignore malformed frames and heartbeat comments.
    }
  });
  source.addEventListener('error', () => {
    source?.close();
    source = null;
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, 5000);
  });
}

export function subscribeTaxonomyEvents(listener) {
  listeners.add(listener);
  connect();
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      clearTimeout(reconnectTimer);
      source?.close();
      source = null;
    }
  };
}
