interface Props {
  amount: number;
  small?: boolean;
  isBet?: boolean;
}

export function ChipDisplay({ amount, small = false, isBet = false }: Props) {
  if (amount <= 0 && !isBet) return null;

  return (
    <div className={`chip-display ${small ? 'chip-small' : ''} ${isBet ? 'chip-bet' : ''}`}>
      <span className="chip-icon">◉</span>
      <span className="chip-amount">{amount.toLocaleString()}</span>
    </div>
  );
}
