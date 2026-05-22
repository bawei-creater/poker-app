import { useState } from 'react';
import { useGame } from '../context/GameContext';

export function Lobby() {
  const { state, createRoom, joinRoom, clearError } = useGame();
  const [playerName, setPlayerName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const handleCreate = () => {
    if (!playerName.trim()) { alert('请输入昵称'); return; }
    if (!roomName.trim()) { alert('请输入房间名'); return; }
    createRoom(roomName.trim(), playerName.trim());
  };

  const handleJoin = () => {
    if (!playerName.trim()) { alert('请输入昵称'); return; }
    if (!joinCode.trim()) { alert('请输入房间号'); return; }
    joinRoom(joinCode.trim().toUpperCase(), playerName.trim());
  };

  return (
    <div className="lobby">
      <div className="lobby-container">
        <h1 className="lobby-title">Texas Hold'em</h1>
        <p className="lobby-subtitle">德州扑克</p>

        {state.error && (
          <div className="error-banner">
            {state.error}
            <button onClick={clearError}>&times;</button>
          </div>
        )}

        <div className="lobby-form">
          <input
            className="lobby-input"
            placeholder="你的昵称"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            maxLength={12}
          />

          <div className="lobby-section">
            <h3>创建房间</h3>
            <input
              className="lobby-input"
              placeholder="房间名称"
              value={roomName}
              onChange={e => setRoomName(e.target.value)}
            />
            <button className="btn-primary" onClick={handleCreate}>创建</button>
          </div>

          <div className="lobby-divider">或者</div>

          <div className="lobby-section">
            <h3>加入房间</h3>
            <input
              className="lobby-input"
              placeholder="房间号 (如 ABC123)"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
              maxLength={6}
            />
            <button className="btn-primary" onClick={handleJoin}>加入</button>
          </div>
        </div>

        {state.rooms.length > 0 && (
          <div className="room-list">
            <h3>可用房间</h3>
            {state.rooms.map(room => (
              <div key={room.id} className="room-item">
                <span>{room.name}</span>
                <span>{room.playerCount}/9 人</span>
                <button
                  className="btn-join"
                  onClick={() => {
                    if (!playerName.trim()) { alert('请先输入昵称'); return; }
                    joinRoom(room.id, playerName.trim());
                  }}
                >
                  加入
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
