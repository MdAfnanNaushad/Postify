import { io } from 'socket.io-client';

const SOCKET_SERVER_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (typeof window !== 'undefined' && window.location.port === '5173'
    ? 'http://localhost:5000'
    : typeof window !== 'undefined'
    ? window.location.origin
    : 'http://localhost:5000');

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.postRoomRefs = new Map();
  }

  connect() {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_SERVER_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      autoConnect: true
    });

    this.socket.on('connect', () => {
      this.connected = true;
      // Re-join any active post rooms after reconnection
      for (const postId of this.postRoomRefs.keys()) {
        this.socket.emit('join:post', { postId });
      }
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
    });

    this.socket.on('connect_error', (err) => {
      // Graceful fallback: app remains 100% operational via standard REST API
    });

    return this.socket;
  }

  getSocket() {
    if (!this.socket) {
      return this.connect();
    }
    return this.socket;
  }

  joinPost(postId) {
    if (!postId) return;
    const strId = postId.toString();
    const count = this.postRoomRefs.get(strId) || 0;
    this.postRoomRefs.set(strId, count + 1);

    const s = this.getSocket();
    if (s) {
      if (s.connected) {
        s.emit('join:post', { postId: strId });
      } else {
        s.once('connect', () => {
          s.emit('join:post', { postId: strId });
        });
      }
    }
  }

  leavePost(postId) {
    if (!postId) return;
    const strId = postId.toString();
    const count = this.postRoomRefs.get(strId) || 0;
    if (count <= 1) {
      this.postRoomRefs.delete(strId);
      const s = this.getSocket();
      if (s && s.connected) {
        s.emit('leave:post', { postId: strId });
      }
    } else {
      this.postRoomRefs.set(strId, count - 1);
    }
  }

  joinFeed() {
    const s = this.getSocket();
    if (s) {
      if (s.connected) {
        s.emit('join:feed');
      } else {
        s.once('connect', () => {
          s.emit('join:feed');
        });
      }
    }
  }

  leaveFeed() {
    const s = this.getSocket();
    if (s && s.connected) {
      s.emit('leave:feed');
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.postRoomRefs.clear();
    }
  }
}

export const socketService = new SocketService();
export default socketService;
