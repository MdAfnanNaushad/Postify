const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/user');
const Post = require('./models/post');
const { getJwtSecret } = require('./middleware/auth');

let io = global.__postify_io__ || null;

/**
 * Parse cookie string to extract token
 */
function parseCookie(cookieString, key) {
  if (!cookieString) return null;
  const match = cookieString.match(new RegExp(`(?:^|; )${key}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Initialize Socket.IO with HTTP server
 */
function initSocket(httpServer) {
  const allowedOrigins = [
    process.env.CLIENT_URL || 'http://localhost:5173',
    process.env.CANONICAL_APP_URL,
    process.env.RENDER_EXTERNAL_URL,
    'http://127.0.0.1:5173',
    'http://localhost:5000'
  ].filter(Boolean);

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST']
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  global.__postify_io__ = io;

  // Authentication Middleware for Socket Connections
  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      const token =
        parseCookie(cookieHeader, 'token') ||
        socket.handshake.auth?.token ||
        socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');

      if (!token) {
        // Allow unauthenticated guest connections for public real-time reads
        socket.user = null;
        socket.userId = null;
        return next();
      }

      const secret = getJwtSecret();
      const decoded = jwt.verify(token, secret);

      const user = await User.findById(decoded.userid || decoded.id).select('-password');
      if (!user || user.isSuspended) {
        // Token belongs to deleted or suspended user
        socket.user = null;
        socket.userId = null;
        return next();
      }

      socket.user = user;
      socket.userId = user._id.toString();
      next();
    } catch (err) {
      // Invalid/expired token: treat as guest or pass error if strictly required
      socket.user = null;
      socket.userId = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    const clientId = socket.userId || 'guest_' + socket.id.slice(0, 6);

    // Automatically join private authenticated user room for real-time notification delivery
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // Join Post Room with strict existence validation
    socket.on('join:post', async (data) => {
      const postId = typeof data === 'object' ? data.postId : data;
      if (!postId || !/^[0-9a-fA-F]{24}$/.test(postId)) {
        return socket.emit('error', { message: 'Invalid post identifier.' });
      }

      try {
        const postExists = await Post.exists({ _id: postId });
        if (!postExists) {
          return socket.emit('error', { message: 'Cannot join room: Post not found.' });
        }

        const roomName = `post:${postId}`;
        socket.join(roomName);
        socket.emit('joined:post', { postId, room: roomName });
      } catch (err) {
        socket.emit('error', { message: 'Failed to join post room.' });
      }
    });

    // Leave Post Room
    socket.on('leave:post', (data) => {
      const postId = typeof data === 'object' ? data.postId : data;
      if (postId) {
        socket.leave(`post:${postId}`);
        socket.emit('left:post', { postId });
      }
    });

    // Join Global Feed Room
    socket.on('join:feed', () => {
      socket.join('feed');
      socket.emit('joined:feed');
    });

    // Leave Global Feed Room
    socket.on('leave:feed', () => {
      socket.leave('feed');
      socket.emit('left:feed');
    });

    // Join Admin Events Channel (requires role === 'admin')
    socket.on('join:admin', () => {
      if (!socket.user || socket.user.role !== 'admin') {
        return socket.emit('error', { message: 'Unauthorized: Admin privileges required.' });
      }
      socket.join('admin_events');
      socket.emit('joined:admin', { message: 'Subscribed to live administrative events.' });
    });

    socket.on('leave:admin', () => {
      socket.leave('admin_events');
      socket.emit('left:admin');
    });

    socket.on('disconnect', () => {
      // Clean up socket references automatically handled by Socket.IO
    });
  });

  return io;
}

/**
 * Access the initialized Socket.IO instance
 */
function getIO() {
  const activeIO = io || global.__postify_io__;
  if (!activeIO) {
    throw new Error('Socket.IO has not been initialized. Call initSocket(httpServer) first.');
  }
  return activeIO;
}

/**
 * Safe broadcaster for real-time post like updates
 */
function broadcastLikeUpdate(postId, { likesCount, likedUserId, action }) {
  const activeIO = io || global.__postify_io__;
  if (!activeIO) return;
  const payload = {
    postId: postId.toString(),
    likesCount,
    likedUserId: likedUserId ? likedUserId.toString() : null,
    action: action || 'like',
    timestamp: new Date().toISOString()
  };

  // Broadcast to clients viewing the post detail and clients viewing the feed
  activeIO.to(`post:${postId}`).emit('post:like_updated', payload);
  activeIO.to('feed').emit('post:like_updated', payload);
}

/**
 * Safe broadcaster for newly created replies
 */
function broadcastNewReply(postId, reply) {
  const activeIO = io || global.__postify_io__;
  if (!activeIO) return;
  activeIO.to(`post:${postId}`).emit('reply:created', {
    postId: postId.toString(),
    reply
  });
}

/**
 * Safe broadcaster for updated replies
 */
function broadcastUpdatedReply(postId, reply) {
  const activeIO = io || global.__postify_io__;
  if (!activeIO) return;
  activeIO.to(`post:${postId}`).emit('reply:updated', {
    postId: postId.toString(),
    reply
  });
}

/**
 * Safe broadcaster for deleted replies
 */
function broadcastDeletedReply(postId, replyId) {
  const activeIO = io || global.__postify_io__;
  if (!activeIO) return;
  activeIO.to(`post:${postId}`).emit('reply:deleted', {
    postId: postId.toString(),
    replyId: replyId.toString()
  });
}

/**
 * Safe broadcaster for administrative events (moderation, system alerts)
 */
function broadcastAdminEvent(eventType, payload) {
  const activeIO = io || global.__postify_io__;
  if (!activeIO) return;
  activeIO.to('admin_events').emit('admin:event', {
    type: eventType,
    payload,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  initSocket,
  getIO,
  broadcastLikeUpdate,
  broadcastNewReply,
  broadcastUpdatedReply,
  broadcastDeletedReply,
  broadcastAdminEvent
};

