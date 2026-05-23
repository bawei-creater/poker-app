import type { RoomState } from 'shared';
import { DEFAULT_STARTING_CHIPS } from 'shared';
import { Player } from '../game/Player';
import { PokerGame } from '../game/PokerGame';

export class Room {
  public id: string;
  public name: string;
  public players: Player[] = [];
  private game: PokerGame | null = null;
  private smallBlind: number;
  private bigBlind: number;
  private onStateChange: (() => void) | null = null;

  constructor(id: string, name: string, smallBlind: number, bigBlind: number) {
    this.id = id;
    this.name = name;
    this.smallBlind = smallBlind;
    this.bigBlind = bigBlind;
  }

  setStateChangeCallback(cb: () => void) {
    this.onStateChange = cb;
  }

  addPlayer(socketId: string, playerName: string): Player | null {
    if (this.players.length >= 9) return null;
    const seatIndex = this.findOpenSeat();
    if (seatIndex === -1) return null;
    const player = new Player(socketId, playerName, DEFAULT_STARTING_CHIPS, seatIndex);
    this.players.push(player);
    return player;
  }

  removePlayer(socketId: string): void {
    const idx = this.players.findIndex(p => p.id === socketId);
    if (idx === -1) return;
    const player = this.players[idx];

    if (this.game && !player.folded) {
      player.folded = true;
      const activeInHand = this.players.filter(p => p.isActive && !p.folded);
      if (activeInHand.length === 1) {
        this.game.awardLastPlayer(activeInHand[0]);
        this.onStateChange?.();
      }
    }

    this.players.splice(idx, 1);

    if (this.game && this.game.getPhase() !== 'waiting') {
      const playersWithChips = this.players.filter(p => p.chips > 0);
      if (playersWithChips.length < 2) {
        this.game = null;
      }
    }
  }

  startGame(): void {
    if (this.players.length < 2) throw new Error('至少需要2名玩家');
    this.game = new PokerGame(this.players, this.smallBlind, this.bigBlind);
    this.game.startHand();
  }

  setPlayerReady(socketId: string): void {
    const player = this.players.find(p => p.id === socketId);
    if (!player) return;
    player.isReady = true;

    // Check if all active players are ready
    const activePlayers = this.players.filter(p => p.isActive);
    const allReady = activePlayers.every(p => p.isReady);

    if (allReady && activePlayers.length >= 2) {
      // Start new hand
      if (this.game) {
        this.game.startHand();
      } else {
        this.startGame();
      }
      this.onStateChange?.();
    }
  }

  handleAction(playerId: string, type: string, amount?: number): void {
    if (!this.game) throw new Error('游戏未开始');
    this.game.processAction(playerId, { playerId, type: type as any, amount });
  }

  getStateForPlayer(playerId: string): RoomState {
    return {
      roomId: this.id,
      roomName: this.name,
      players: this.players.map(p =>
        p.id === playerId ? p.toState(false) : p.toState(true)
      ),
      communityCards: this.game?.getCommunityCards() ?? [],
      pot: this.game?.getPot() ?? 0,
      sidePots: this.game?.getSidePots() ?? [],
      phase: this.game?.getPhase() ?? 'waiting',
      currentPlayerId: this.game?.getCurrentPlayerId() ?? null,
      dealerIndex: this.players.findIndex(p => p.isDealer),
      smallBlind: this.smallBlind,
      bigBlind: this.bigBlind,
      minRaise: this.game?.getMinRaise() ?? 0,
      lastAction: this.game?.getLastAction() ?? null,
    };
  }

  getLastHandResult() {
    return this.game?.getLastHandResult() ?? null;
  }

  getPhase() {
    return this.game?.getPhase() ?? 'waiting';
  }

  private findOpenSeat(): number {
    const taken = new Set(this.players.map(p => p.seatIndex));
    for (let i = 0; i < 9; i++) {
      if (!taken.has(i)) return i;
    }
    return -1;
  }
}
