import { Server as SocketIOServer } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { CORS_ORIGINS } from '../config/env';
import { authenticateSession } from '../utils/sessions';

let io: SocketIOServer | null = null;

function allowedOrigins(): string[] {
  return CORS_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean);
}

function userRoom(userId: string): string {
  return `user:${userId}`;
}

function initRealtime(server: HttpServer): SocketIOServer {
  const origins = allowedOrigins();
  io = new SocketIOServer(server, {
    cors: {
      origin(origin, callback) {
        if (!origin || !origins.length || origins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error('Origin is not allowed by Socket.IO CORS.'));
      },
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    const token = String(socket.handshake.auth?.token || socket.handshake.query?.token || '');
    if (!token) {
      next(new Error('Missing authentication token.'));
      return;
    }
    try {
      const { user, expiresAt } = await authenticateSession(token);
      socket.data.userId = user.id;
      socket.data.expiresAt = expiresAt;
      next();
    } catch {
      next(new Error('Invalid authentication token.'));
    }
  });

  io.on('connection', socket => {
    const userId = String(socket.data.userId || '');
    if (!userId) return;
    socket.join(userRoom(userId));
    socket.emit('realtime:ready', { userId });
    if (socket.data.expiresAt) {
      const timeout = setTimeout(() => socket.disconnect(true), Math.max(0, socket.data.expiresAt * 1000 - Date.now()));
      timeout.unref();
      socket.on('disconnect', () => clearTimeout(timeout));
    }
  });

  return io;
}

function emitToUser(userId: string, event: string, payload: unknown): void {
  if (!io || !userId) return;
  io.to(userRoom(userId)).emit(event, payload);
}

function disconnectUserSessions(userId: string): void {
  io?.in(userRoom(userId)).disconnectSockets(true);
}

export {
  initRealtime,
  emitToUser,
  disconnectUserSessions,
};
