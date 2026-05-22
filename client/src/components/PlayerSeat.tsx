import type { PlayerState } from 'shared';
import { Card } from './Card';
import { ChipDisplay } from './ChipDisplay';

interface Props {
  player: PlayerState | null;
  isMe: boolean;
  isCurrentPlayer: boolean;
  style?: React.CSSProperties;
}

export function PlayerSeat({ player, isMe, isCurrentPlayer, style }: Props) {
  if (!player) {
    return (
      <div className="player-seat empty" style={style}>
        <div className="player-avatar empty-avatar">+</div>
      </div>
    );
  }

  return (
    <div
      className={`player-seat ${isCurrentPlayer ? 'active' : ''} ${isMe ? 'me' : ''} ${player.folded ? 'folded' : ''}`}
      style={style}
    >
      {player.isDealer && <span className="dealer-chip">D</span>}

      <div className="player-info">
        <div className={`player-avatar ${isMe ? 'my-avatar' : ''}`}>
          {player.name[0].toUpperCase()}
        </div>
        <div className="player-name">{player.name}</div>
        <ChipDisplay amount={player.chips} small />
      </div>

      <div className="hole-cards">
        {player.holeCards.length > 0 ? (
          player.holeCards.map((card, i) => (
            <Card key={i} card={card} faceUp small />
          ))
        ) : (
          !player.folded && player.isActive && (
            <>
              <Card faceUp={false} small />
              <Card faceUp={false} small />
            </>
          )
        )}
      </div>

      {player.bet > 0 && (
        <div className="player-bet-chip">
          <ChipDisplay amount={player.bet} small isBet />
        </div>
      )}

      {player.folded && <div className="folded-label">弃牌</div>}
      {player.isAllIn && <div className="allin-label">全下</div>}
    </div>
  );
}
