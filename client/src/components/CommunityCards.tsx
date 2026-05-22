import type { Card as CardType, GamePhase } from 'shared';
import { Card } from './Card';

interface Props {
  cards: CardType[];
  phase: GamePhase;
}

const PHASE_LABELS: Record<GamePhase, string> = {
  waiting: '等待中',
  preflop: '翻牌前',
  flop: '翻牌',
  turn: '转牌',
  river: '河牌',
  showdown: '摊牌',
};

export function CommunityCards({ cards, phase }: Props) {
  return (
    <div className="community-cards">
      <div className="community-cards-row">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="card-slot">
            {cards[i] ? (
              <Card card={cards[i]} />
            ) : (
              <div className="card-placeholder" />
            )}
          </div>
        ))}
      </div>
      {phase !== 'waiting' && (
        <div className="phase-label">{PHASE_LABELS[phase]}</div>
      )}
    </div>
  );
}
