require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const http = require('http');
const { initSocket } = require('./socket');

const PORT = process.env.PORT || 5000;

// Security startup validation: Ensure JWT_SECRET is configured
if (process.env.NODE_ENV === 'production') {
  if (
    !process.env.JWT_SECRET ||
    process.env.JWT_SECRET === 'your_jwt_secret_key_here' ||
    process.env.JWT_SECRET.length < 32 ||
    process.env.JWT_SECRET.includes('super_secure')
  ) {
    console.error('\x1b[31m%s\x1b[0m', 'FATAL SECURITY ERROR: JWT_SECRET is missing, insecure, or using the default placeholder in production.');
    console.error('\x1b[31m%s\x1b[0m', 'Postify will not start with insecure credentials in production mode. Set a strong secret (32+ chars).');
    process.exit(1);
  }
} else if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your_jwt_secret_key_here') {
  console.warn('[SECURITY WARNING]: JWT_SECRET is using default placeholder or is undefined. In production, configure a 32+ character entropy secret.');
}

const HOST = process.env.HOST || '0.0.0.0';

// Connect to MongoDB
connectDB().then(() => {
  const httpServer = http.createServer(app);
  const io = initSocket(httpServer);

  const server = httpServer.listen(PORT, HOST, () => {
    console.log(`[Postify Server running in ${process.env.NODE_ENV || 'development'} mode on ${HOST}:${PORT}]`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[PORT CONFLICT]: Port ${PORT} is already in use by another running process or previous nodemon session.`);
      console.error(`[PORT CONFLICT]: Please terminate the zombie process or choose another PORT in your .env file.`);
      process.exit(1);
    } else {
      console.error('[Server Error]:', err);
    }
  });

  // Graceful shutdown handling for Render zero-downtime deploys and process lifecycle
  const gracefulShutdown = (signal) => {
    console.log(`[Process] ${signal} signal received: closing HTTP server and database connections.`);
    server.close(async () => {
      console.log('[Process] HTTP server closed.');
      try {
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 0) {
          await mongoose.disconnect();
          console.log('[Process] MongoDB disconnected cleanly.');
        }
      } catch (err) {
        console.error('[Process] Error disconnecting MongoDB:', err.message);
      }
      process.exit(0);
    });

    // Force shutdown after 10s if ongoing requests hang
    setTimeout(() => {
      console.error('[Process] Forced shutdown: connections did not close in time.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
});
