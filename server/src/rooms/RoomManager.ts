import { Room } from './Room';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();

  createRoom(roomName: string, smallBlind: number, bigBlind: number): Room {
    const id = this.generateRoomId();
    const room = new Room(id, roomName, smallBlind, bigBlind);
    this.rooms.set(id, room);
    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  removeRoom(roomId: string): void {
    this.rooms.delete(roomId);
  }

  listRooms(): { id: string; name: string; playerCount: number }[] {
    return Array.from(this.rooms.values()).map(r => ({
      id: r.id,
      name: r.name,
      playerCount: r.players.length,
    }));
  }

  findRoomByPlayer(socketId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.players.some(p => p.id === socketId)) return room;
    }
    return undefined;
  }

  removeEmptyRooms(): string[] {
    const removed: string[] = [];
    for (const [id, room] of this.rooms) {
      if (room.players.length === 0) {
        this.rooms.delete(id);
        removed.push(id);
      }
    }
    return removed;
  }

  private generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
}
