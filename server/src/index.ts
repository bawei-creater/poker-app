import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import type { ClientToServerEvents, ServerToClientEvents } from 'shared';
import { registerSocketHandlers } from './socket';
import { RoomManager } from './rooms/RoomManager';

const isProd = process.env.NODE_ENV === 'production';
const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: isProd ? true : 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

const roomManager = new RoomManager();
registerSocketHandlers(io, roomManager);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

if (isProd) {
  const publicDir = path.join(__dirname, '..', 'public');
  app.use(express.static(publicDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
