import { useGame } from '../context/GameContext';
import { PokerTable } from '../components/PokerTable';
import { ActionBar } from '../components/ActionBar';
import { HandResultModal } from '../components/HandResultModal';
import { ChatBox } from '../components/ChatBox';
import { socket } from '../socket';
import { testVoice } from '../utils/sounds';

function handleVoiceTest() {
  const status = testVoice();
  if (!status.supported || !status.hasChineseVoice) {
    alert(status.message);
  }
}

export function GameRoom() {
  const { state, leaveRoom, startGame, readyForNext, performAction, sendMessage, clearHandResult } = useGame();

  if (!state.roomState) {
    return (
      <div className="game-room">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  const roomState = state.roomState;
  const myPlayerId = socket.id ?? '';
  const me = roomState.players.find(p => p.id === myPlayerId);
  const maxBet = Math.max(0, ...roomState.players.map(p => p.bet));
  const isMyTurn = roomState.currentPlayerId === myPlayerId;
  const hasAnyAllIn = roomState.players.some(p => p.isAllIn && !p.folded);
  const canStart = roomState.phase === 'waiting' && roomState.players.length >= 2;
  console.log(`[GameRoom] phase=${roomState.phase} isMyTurn=${isMyTurn} current=${roomState.currentPlayerId} me=${myPlayerId} n=${roomState.players.length}`);
  const isShowdown = roomState.phase === 'showdown';
  const myReady = me?.isReady ?? false;
  const allReady = roomState.players.filter(p => p.isActive).every(p => p.isReady);

  return (
    <div className="game-room">
      <div className="game-header">
        <div className="room-info">
          房间: <span className="room-name">{roomState.roomName}</span>
          {' | '}
          房间号: <span
            className="room-code"
            onClick={() => navigator.clipboard?.writeText(roomState.roomId)}
            title="点击复制房间号"
          >
            {roomState.roomId}
          </span>
        </div>
        <div className="header-actions">
          <button className="btn-voice" onClick={handleVoiceTest}>语音</button>
          {canStart && (
            <button className="btn-start" onClick={startGame}>
              开始游戏
            </button>
          )}
          <button className="btn-leave" onClick={leaveRoom}>离开</button>
        </div>
      </div>

      {/* Player profit/loss bar */}
      <div className="player-stats-bar">
        {roomState.players.map(p => (
          <div key={p.id} className="player-stat">
            <span className="stat-name">{p.name}</span>
            <span className={`stat-profit ${p.totalProfit >= 0 ? 'profit-positive' : 'profit-negative'}`}>
              {p.totalProfit >= 0 ? '+' : ''}{p.totalProfit}
            </span>
          </div>
        ))}
      </div>

      <PokerTable roomState={roomState} myPlayerId={myPlayerId} />

      <ActionBar
        isMyTurn={isMyTurn}
        phase={roomState.phase}
        myBet={me?.bet ?? 0}
        currentBet={maxBet}
        myChips={me?.chips ?? 0}
        minRaise={roomState.minRaise}
        hasAnyAllIn={hasAnyAllIn}
        onAction={performAction}
      />

      <ChatBox messages={state.chatMessages} onSend={sendMessage} />

      {/* Hand result modal with ready button */}
      {state.handResult && (
        <HandResultModal
          result={state.handResult}
          myPlayerId={myPlayerId}
          onClose={clearHandResult}
          onReady={() => {
            clearHandResult();
            readyForNext();
          }}
        />
      )}

      {/* Ready status during showdown */}
      {isShowdown && !state.handResult && (
        <div className="ready-overlay">
          <div className="ready-box">
            <h3>等待玩家准备...</h3>
            {roomState.players.filter(p => p.isActive).map(p => (
              <div key={p.id} className={`ready-player ${p.isReady ? 'ready' : ''}`}>
                <span>{p.name}</span>
                <span>{p.isReady ? '已准备' : '未准备'}</span>
              </div>
            ))}
            {!myReady && (
              <button className="btn-primary btn-ready" onClick={readyForNext}>
                准备下一局
              </button>
            )}
          </div>
        </div>
      )}

      {state.error && (
        <div className="error-toast">
          {state.error}
        </div>
      )}
    </div>
  );
}
