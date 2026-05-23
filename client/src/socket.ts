import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from 'shared';

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const devServerUrl = `${window.location.protocol}//${window.location.hostname}:3001`;
const serverUrl = import.meta.env.PROD ? window.location.origin : devServerUrl;

export const socket: TypedSocket = io(serverUrl, {
  autoConnect: false,
});
