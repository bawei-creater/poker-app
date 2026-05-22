import type { SidePot } from 'shared';

interface Props {
  pot: number;
  sidePots: SidePot[];
}

export function PotDisplay({ pot, sidePots }: Props) {
  if (pot <= 0) return null;

  return (
    <div className="pot-display">
      <div className="pot-main">
        <span className="pot-label">底池</span>
        <span className="pot-amount">{pot.toLocaleString()}</span>
      </div>
      {sidePots.length > 1 && sidePots.map((sp, i) => (
        <div key={i} className="pot-side">
          Side Pot {i + 1}: {sp.amount.toLocaleString()}
        </div>
      ))}
    </div>
  );
}
