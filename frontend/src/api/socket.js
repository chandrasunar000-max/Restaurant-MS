import { io } from 'socket.io-client';

let socket;

export function getSocket() {
  if (!socket) {
    // Prefer explicit env var (VITE_SOCKET_URL) else fallback to current origin or localhost
    let base = '/';
    try {
      // eslint-disable-next-line no-undef
      if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SOCKET_URL) {
        // eslint-disable-next-line no-undef
        base = import.meta.env.VITE_SOCKET_URL;
      } else if (typeof window !== 'undefined' && window.location && window.location.origin) {
        base = window.location.origin;
      }
    } catch (_) {}
    socket = io(base, { transports: ['websocket'] });
  }
  return socket;
}

export function joinRestaurant(restaurantId) {
  const s = getSocket();
  s.emit("join", { restaurantId });
}

export function joinTable(restaurantId, tableNumber, isRoom = false) {
  const s = getSocket();
  s.emit("join", { restaurantId, tableNumber, isRoom });
}
