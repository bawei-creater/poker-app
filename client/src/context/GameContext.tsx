import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import type { RoomState, HandResult, ChatMessage, GameAction, GamePhase } from 'shared';
import { socket } from '../socket';
import { playDeal, playReveal, playYourTurn, playWin, playActionSound } from '../utils/sounds';

interface GameState {
  connected: boolean;
  roomId: string | null;
  roomState: RoomState | null;
  handResult: HandResult | null;
  chatMessages: ChatMessage[];
  error: string | null;
  rooms: { id: string; name: string; playerCount: number }[];
}

type ActionType =
  | { type: 'CONNECTED' }
  | { type: 'DISCONNECTED' }
  | { type: 'ROOM_JOINED'; roomId: string }
  | { type: 'ROOM_LEFT' }
  | { type: 'STATE_UPDATE'; state: RoomState }
  | { type: 'HAND_RESULT'; result: HandResult }
  | { type: 'CLEAR_HAND_RESULT' }
  | { type: 'CHAT_MESSAGE'; message: ChatMessage }
  | { type: 'ERROR'; message: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'ROOMS_LIST'; rooms: { id: string; name: string; playerCount: number }[] };

const initialState: GameState = {
  connected: false,
  roomId: null,
  roomState: null,
  handResult: null,
  chatMessages: [],
  error: null,
  rooms: [],
};

function gameReducer(state: GameState, action: ActionType): GameState {
  switch (action.type) {
    case 'CONNECTED':
      return { ...state, connected: true };
    case 'DISCONNECTED':
      return { ...state, connected: false };
    case 'ROOM_JOINED':
      return { ...state, roomId: action.roomId, error: null };
    case 'ROOM_LEFT':
      return { ...state, roomId: null, roomState: null, handResult: null, chatMessages: [] };
    case 'STATE_UPDATE':
      return { ...state, roomState: action.state, roomId: action.state.roomId };
    case 'HAND_RESULT':
      return { ...state, handResult: action.result };
    case 'CLEAR_HAND_RESULT':
      return { ...state, handResult: null };
    case 'CHAT_MESSAGE':
      return { ...state, chatMessages: [...state.chatMessages, action.message] };
    case 'ERROR':
      return { ...state, error: action.message };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'ROOMS_LIST':
      return { ...state, rooms: action.rooms };
    default:
      return state;
  }
}

interface GameContextValue {
  state: GameState;
  createRoom: (roomName: string, playerName: string) => void;
  joinRoom: (roomId: string, playerName: string) => void;
  leaveRoom: () => void;
  startGame: () => void;
  readyForNext: () => void;
  performAction: (type: GameAction['type'], amount?: number) => void;
  sendMessage: (message: string) => void;
  clearHandResult: () => void;
  clearError: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const prevPhaseRef = useRef<GamePhase>('waiting');
  const prevPlayerRef = useRef<string | null>(null);

  useEffect(() => {
    socket.connect();

    socket.on('connect', () => dispatch({ type: 'CONNECTED' }));
    socket.on('disconnect', () => dispatch({ type: 'DISCONNECTED' }));

    socket.on('room:created', ({ roomId }) => {
      dispatch({ type: 'ROOM_JOINED', roomId });
    });

    socket.on('room:error', ({ message }) => {
      dispatch({ type: 'ERROR', message });
    });

    socket.on('game:state', (roomState) => {
      console.log(`[Client] phase=${roomState.phase} currentPlayer=${roomState.currentPlayerId} myId=${socket.id} players=${roomState.players.length}`);
      const prevPhase = prevPhaseRef.current;
      const prevPlayer = prevPlayerRef.current;

      // Phase changed -> cards revealed
      if (roomState.phase !== prevPhase) {
        if (roomState.phase === 'preflop') {
          playDeal();
        } else if (roomState.phase !== 'waiting' && roomState.phase !== 'showdown') {
          playReveal();
        }
        prevPhaseRef.current = roomState.phase;
      }

      // Current player changed and it's now my turn
      if (roomState.currentPlayerId !== prevPlayer) {
        if (roomState.currentPlayerId === socket.id) {
          playYourTurn();
        }
        prevPlayerRef.current = roomState.currentPlayerId;
      }

      dispatch({ type: 'STATE_UPDATE', state: roomState });
    });

    socket.on('game:handResult', (result) => {
      // Check if I'm a winner
      const isWinner = result.winners.some(w => w.playerId === socket.id);
      if (isWinner) playWin();
      dispatch({ type: 'HAND_RESULT', result });
    });

    socket.on('game:error', ({ message }) => {
      dispatch({ type: 'ERROR', message });
    });

    socket.on('chat:message', (message) => {
      dispatch({ type: 'CHAT_MESSAGE', message });
    });

    socket.on('rooms:list', (rooms) => {
      dispatch({ type: 'ROOMS_LIST', rooms });
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, []);

  const createRoom = useCallback((roomName: string, playerName: string) => {
    socket.emit('room:create', { roomName, playerName });
  }, []);

  const joinRoom = useCallback((roomId: string, playerName: string) => {
    socket.emit('room:join', { roomId, playerName });
  }, []);

  const leaveRoom = useCallback(() => {
    socket.emit('room:leave');
    dispatch({ type: 'ROOM_LEFT' });
  }, []);

  const startGame = useCallback(() => {
    playDeal();
    socket.emit('game:start');
  }, []);

  const readyForNext = useCallback(() => {
    socket.emit('game:ready');
  }, []);

  const performAction = useCallback((type: GameAction['type'], amount?: number) => {
    playActionSound(type);
    socket.emit('game:action', { type, amount });
  }, []);

  const sendMessage = useCallback((message: string) => {
    socket.emit('chat:send', { message });
  }, []);

  const clearHandResult = useCallback(() => dispatch({ type: 'CLEAR_HAND_RESULT' }), []);
  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);

  return (
    <GameContext.Provider value={{
      state, createRoom, joinRoom, leaveRoom, startGame, readyForNext,
      performAction, sendMessage, clearHandResult, clearError,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
