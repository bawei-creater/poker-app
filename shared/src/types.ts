// Card types
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

// Player types
export interface PlayerState {
  id: string;
  name: string;
  chips: number;
  bet: number;
  totalBet: number;
  holeCards: Card[];
  folded: boolean;
  isAllIn: boolean;
  isDealer: boolean;
  isActive: boolean;
  seatIndex: number;
  isReady: boolean;
  profit: number;     // +/- from last hand
  totalProfit: number; // cumulative across hands
}

// Game phases
export type GamePhase = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

// Room state
export interface RoomState {
  roomId: string;
  roomName: string;
  players: PlayerState[];
  communityCards: Card[];
  pot: number;
  sidePots: SidePot[];
  phase: GamePhase;
  currentPlayerId: string | null;
  dealerIndex: number;
  smallBlind: number;
  bigBlind: number;
  minRaise: number;
  lastAction: GameAction | null;
}

export interface SidePot {
  amount: number;
  eligiblePlayerIds: string[];
}

export interface GameAction {
  playerId: string;
  type: 'fold' | 'check' | 'call' | 'raise' | 'all-in';
  amount?: number;
}

// Hand result
export interface HandResult {
  winners: { playerId: string; handName: string; winnings: number }[];
  pot: number;
  finalHands: { playerId: string; cards: Card[]; handName: string }[];
  playerProfits: { playerId: string; name: string; profit: number }[];
}

// Chat message
export interface ChatMessage {
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

// Socket events: Client -> Server
export interface ClientToServerEvents {
  'room:create': (data: { roomName: string; playerName: string; smallBlind?: number; bigBlind?: number }) => void;
  'room:join': (data: { roomId: string; playerName: string }) => void;
  'room:leave': () => void;
  'game:start': () => void;
  'game:ready': () => void;
  'game:action': (data: { type: GameAction['type']; amount?: number }) => void;
  'chat:send': (data: { message: string }) => void;
}

// Socket events: Server -> Client
export interface ServerToClientEvents {
  'room:created': (data: { roomId: string }) => void;
  'room:error': (data: { message: string }) => void;
  'game:state': (data: RoomState) => void;
  'game:handResult': (data: HandResult) => void;
  'game:error': (data: { message: string }) => void;
  'chat:message': (data: ChatMessage) => void;
  'rooms:list': (data: { id: string; name: string; playerCount: number }[]) => void;
}
