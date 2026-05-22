import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from 'shared';

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const serverUrl = import.meta.env.PROD ? window.location.origin : 'http://localhost:3001';

export const socket: TypedSocket = io(serverUrl, {
  autoConnect: false,
});
