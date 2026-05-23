import { useState, useEffect } from 'react';
import type { GameAction, GamePhase } from 'shared';

interface Props {
  isMyTurn: boolean;
  phase: GamePhase;
  myBet: number;
  currentBet: number;
  myChips: number;
  minRaise: number;
  hasAnyAllIn: boolean;
  onAction: (type: GameAction['type'], amount?: number) => void;
}

export function ActionBar({ isMyTurn, phase, myBet, currentBet, myChips, minRaise, hasAnyAllIn, onAction }: Props) {
  const effectiveMinRaise = currentBet + 1;
  const maxRaise = Math.min(myChips + myBet, 100);
  const [raiseAmount, setRaiseAmount] = useState(effectiveMinRaise);

  const canCheck = myBet >= currentBet;
  const callAmount = currentBet - myBet;
  const canCall = callAmount > 0 && callAmount <= myChips;

  useEffect(() => {
    setRaiseAmount(effectiveMinRaise);
  }, [effectiveMinRaise]);

  if (!isMyTurn || phase === 'waiting' || phase === 'showdown') {
    return (
      <div className="action-bar">
        <div className="action-waiting">
          {phase === 'waiting' ? '等待游戏开始...' : '等待其他玩家操作...'}
        </div>
      </div>
    );
  }

  const handleRaise = () => {
    if (raiseAmount > currentBet && raiseAmount <= maxRaise) {
      onAction('raise', raiseAmount);
    }
  };

  const clampRaise = (v: number) => {
    const clamped = Math.max(effectiveMinRaise, Math.min(maxRaise, v));
    setRaiseAmount(clamped);
  };

  // When any player is all-in, others can only fold or all-in
  if (hasAnyAllIn) {
    return (
      <div className="action-bar">
        <button className="btn-action btn-fold" onClick={() => onAction('fold')}>
          弃牌
        </button>
        <button className="btn-action btn-allin" onClick={() => onAction('all-in', myChips)}>
          全下 ({myChips})
        </button>
      </div>
    );
  }

  return (
    <div className="action-bar">
      <button className="btn-action btn-fold" onClick={() => onAction('fold')}>
        弃牌
      </button>

      {canCheck && (
        <button className="btn-action btn-check" onClick={() => onAction('check')}>
          过牌
        </button>
      )}

      {canCall && (
        <button className="btn-action btn-call" onClick={() => onAction('call')}>
          跟注 {callAmount}
        </button>
      )}

      {/* Raise area */}
      <div className="raise-group">
        <span className="raise-label">加注到:</span>
        <div className="raise-input-wrap">
          <button className="raise-step-btn step-minus-big" onClick={() => clampRaise(raiseAmount - 5)}>-5</button>
          <button className="raise-step-btn step-minus" onClick={() => clampRaise(raiseAmount - 1)}>-1</button>
          <input
            type="number"
            className="raise-input"
            value={raiseAmount}
            onChange={e => clampRaise(Number(e.target.value))}
          />
          <button className="raise-step-btn step-plus" onClick={() => clampRaise(raiseAmount + 1)}>+1</button>
          <button className="raise-step-btn step-plus-big" onClick={() => clampRaise(raiseAmount + 5)}>+5</button>
        </div>
        <button
          className="btn-action btn-raise"
          onClick={handleRaise}
          disabled={raiseAmount <= currentBet || raiseAmount > maxRaise}
        >
          加注
        </button>
      </div>

      <button className="btn-action btn-allin" onClick={() => onAction('all-in', myChips)}>
        全下 ({myChips})
      </button>
    </div>
  );
}
