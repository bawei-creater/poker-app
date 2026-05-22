import type { Card as CardType } from 'shared';
import './Card.css';

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

interface CardProps {
  card?: CardType;
  faceUp?: boolean;
  small?: boolean;
}

export function Card({ card, faceUp = true, small = false }: CardProps) {
  const sizeClass = small ? 'card-small' : 'card-normal';

  if (!faceUp || !card) {
    return <div className={`playing-card card-back ${sizeClass}`} />;
  }

  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';

  return (
    <div className={`playing-card ${isRed ? 'red' : 'black'} ${sizeClass}`}>
      <div className="card-corner top-left">
        <div className="card-rank">{card.rank}</div>
        <div className="card-suit-symbol">{SUIT_SYMBOLS[card.suit]}</div>
      </div>
      <div className="card-center">{SUIT_SYMBOLS[card.suit]}</div>
      <div className="card-corner bottom-right">
        <div className="card-rank">{card.rank}</div>
        <div className="card-suit-symbol">{SUIT_SYMBOLS[card.suit]}</div>
      </div>
    </div>
  );
}
