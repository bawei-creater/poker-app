import type { RoomState } from 'shared';
import { PlayerSeat } from './PlayerSeat';
import { CommunityCards } from './CommunityCards';
import { PotDisplay } from './PotDisplay';

interface Props {
  roomState: RoomState;
  myPlayerId: string;
}

export function PokerTable({ roomState, myPlayerId }: Props) {
  const getSeatPosition = (index: number) => {
    const angle = (2 * Math.PI * index) / 9 - Math.PI / 2;
    const rx = 360;
    const ry = 200;
    return {
      left: `calc(50% + ${rx * Math.cos(angle)}px)`,
      top: `calc(50% + ${ry * Math.sin(angle)}px)`,
    };
  };

  return (
    <div className="poker-table-container">
      <div className="table-surface">
        <CommunityCards cards={roomState.communityCards} phase={roomState.phase} />
        <PotDisplay pot={roomState.pot} sidePots={roomState.sidePots} />

        {Array.from({ length: 9 }, (_, i) => {
          const player = roomState.players.find(p => p.seatIndex === i);
          return (
            <PlayerSeat
              key={i}
              player={player ?? null}
              isMe={player?.id === myPlayerId}
              isCurrentPlayer={player?.id === roomState.currentPlayerId}
              style={getSeatPosition(i)}
            />
          );
        })}
      </div>
    </div>
  );
}
