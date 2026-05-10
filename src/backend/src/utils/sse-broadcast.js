/**
 * SSE Broadcast Manager
 * Maintains active SSE connections and broadcasts events to all clients.
 */

const clients = new Set();

export function addClient(res) {
  clients.add(res);
}

export function removeClient(res) {
  clients.delete(res);
}

export function broadcastEvent(data) {
  const payload = JSON.stringify(data);
  const message = `data: ${payload}\n\n`;

  clients.forEach((client) => {
    try {
      client.write(message);
    } catch {
      // Client disconnected, remove on next cleanup
      clients.delete(client);
    }
  });
}

export function getClientCount() {
  return clients.size;
}
