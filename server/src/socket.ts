import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from 'shared';
import { DEFAULT_SMALL_BLIND, DEFAULT_BIG_BLIND } from 'shared';
import { RoomManager } from './rooms/RoomManager';
import type { Room } from './rooms/Room';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function registerSocketHandlers(io: TypedServer, roomManager: RoomManager) {
  io.on('connection', (socket: TypedSocket) => {
    console.log(`Player connected: ${socket.id}`);
    socket.emit('rooms:list', roomManager.listRooms());

    socket.on('room:create', ({ roomName, playerName, smallBlind, bigBlind }) => {
      const room = roomManager.createRoom(
        roomName || '新房间',
        smallBlind ?? DEFAULT_SMALL_BLIND,
        bigBlind ?? DEFAULT_BIG_BLIND
      );
      room.addPlayer(socket.id, playerName);
      socket.join(room.id);
      socket.emit('room:created', { roomId: room.id });
      broadcastRoomState(io, room, roomManager);
    });

    socket.on('room:join', ({ roomId, playerName }) => {
      const normalizedRoomId = roomId.trim().toUpperCase();
      const room = roomManager.getRoom(normalizedRoomId);
      if (!room) {
        socket.emit('room:error', { message: '房间不存在，请检查房间号' });
        return;
      }
      const currentRoom = roomManager.findRoomByPlayer(socket.id);
      if (currentRoom?.id === room.id) {
        socket.join(room.id);
        socket.emit('room:joined', { roomId: room.id });
        broadcastRoomState(io, room, roomManager);
        return;
      }
      if (currentRoom && currentRoom.id !== room.id) {
        currentRoom.removePlayer(socket.id);
        socket.leave(currentRoom.id);
        if (currentRoom.players.length === 0) {
          roomManager.removeRoom(currentRoom.id);
        } else {
          broadcastRoomState(io, currentRoom, roomManager);
        }
      }
      const player = room.addPlayer(socket.id, playerName);
      if (!player) {
        socket.emit('room:error', { message: '房间已满' });
        return;
      }
      socket.join(room.id);
      socket.emit('room:joined', { roomId: room.id });
      broadcastRoomState(io, room, roomManager);
    });

    socket.on('room:leave', () => {
      handlePlayerLeave(socket, io, roomManager);
    });

    socket.on('game:start', () => {
      const room = roomManager.findRoomByPlayer(socket.id);
      if (!room) return;
      try {
        room.startGame();
        broadcastRoomState(io, room, roomManager);
      } catch (e: any) {
        socket.emit('game:error', { message: e.message });
      }
    });

    socket.on('game:ready', () => {
      const room = roomManager.findRoomByPlayer(socket.id);
      if (!room) return;
      room.setPlayerReady(socket.id);
      broadcastRoomState(io, room, roomManager);
    });

    socket.on('game:action', ({ type, amount }) => {
      const room = roomManager.findRoomByPlayer(socket.id);
      if (!room) return;
      try {
        room.handleAction(socket.id, type, amount);

        if (room.getLastHandResult()) {
          broadcastRoomState(io, room, roomManager);
          io.to(room.id).emit('game:handResult', room.getLastHandResult()!);
          // Do NOT auto-start next hand - players must ready up
        } else {
          broadcastRoomState(io, room, roomManager);
        }
      } catch (e: any) {
        socket.emit('game:error', { message: e.message });
      }
    });

    socket.on('chat:send', ({ message }) => {
      const room = roomManager.findRoomByPlayer(socket.id);
      if (!room) return;
      const player = room.players.find(p => p.id === socket.id);
      if (!player) return;
      io.to(room.id).emit('chat:message', {
        playerId: socket.id,
        playerName: player.name,
        message,
        timestamp: Date.now(),
      });
    });

    socket.on('disconnect', () => {
      console.log(`Player disconnected: ${socket.id}`);
      handlePlayerLeave(socket, io, roomManager);
    });
  });
}

function handlePlayerLeave(socket: TypedSocket, io: TypedServer, roomManager: RoomManager) {
  const room = roomManager.findRoomByPlayer(socket.id);
  if (!room) return;
  room.removePlayer(socket.id);
  socket.leave(room.id);

  if (room.players.length === 0) {
    roomManager.removeRoom(room.id);
  } else {
    broadcastRoomState(io, room, roomManager);
  }
  io.emit('rooms:list', roomManager.listRooms());
}

function broadcastRoomState(io: TypedServer, room: Room, roomManager: RoomManager) {
  for (const player of room.players) {
    const state = room.getStateForPlayer(player.id);
    console.log(`[Broadcast] To ${player.id.slice(0,6)} phase=${state.phase} currentPlayer=${state.currentPlayerId?.slice(0,6)} players=${state.players.length}`);
    io.to(player.id).emit('game:state', state);
  }
  io.emit('rooms:list', roomManager.listRooms());
}
