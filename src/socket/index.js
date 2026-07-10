const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const logger = require('../utils/logger');

/**
 * Bootstraps the Socket.IO layer. Channel event structures for individual
 * domains (orders, notifications, ...) register themselves under here as
 * those services are built; this wires the shared auth handshake only.
 */
function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('AUTH_004'));
    try {
      socket.user = jwt.verify(token, env.auth.accessSecret);
      next();
    } catch (_err) {
      next(new Error('AUTH_004'));
    }
  });

  io.on('connection', (socket) => {
    const room = `company:${socket.user.companyId}`;
    socket.join(room);
    logger.info(`Socket connected: user=${socket.user.sub} room=${room}`);
  });

  return io;
}

module.exports = initSocket;
