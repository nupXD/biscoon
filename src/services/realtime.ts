import jwt from 'jsonwebtoken';
import { Server as SocketIOServer } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { CORS_ORIGINS, JWT_SECRET } from '../config/env';

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

  io.use((socket, next) => {
    const token = String(socket.handshake.auth?.token || socket.handshake.query?.token || '');
    if (!token) {
      next(new Error('Missing authentication token.'));
      return;
    }
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { id: string };
      socket.data.userId = payload.id;
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
  });

  return io;
}

function emitToUser(userId: string, event: string, payload: unknown): void {
  if (!io || !userId) return;
  io.to(userRoom(userId)).emit(event, payload);
}

export {
  initRealtime,
  emitToUser,
};
