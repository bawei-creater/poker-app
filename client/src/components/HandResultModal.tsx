import type { HandResult } from 'shared';

interface Props {
  result: HandResult;
  myPlayerId: string;
  onClose: () => void;
  onReady: () => void;
}

export function HandResultModal({ result, myPlayerId, onClose, onReady }: Props) {
  const myProfit = result.playerProfits.find(p => p.playerId === myPlayerId);

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>本局结果</h2>
        <div className="result-pot">底池: {result.pot.toLocaleString()}</div>

        {/* My profit/loss */}
        {myProfit && (
          <div className={`my-profit ${myProfit.profit >= 0 ? 'profit-positive' : 'profit-negative'}`}>
            {myProfit.profit >= 0 ? '+' : ''}{myProfit.profit}
          </div>
        )}

        {/* Winners */}
        <div className="result-winners">
          {result.winners.map((w, i) => (
            <div key={i} className="winner-row">
              <span className="winner-name">
                {result.playerProfits.find(p => p.playerId === w.playerId)?.name ?? w.playerId.slice(0, 6)}
              </span>
              <span className="winner-hand">{w.handName}</span>
              <span className="winner-amount">+{w.winnings.toLocaleString()}</span>
            </div>
          ))}
        </div>

        {/* All player profits */}
        {result.playerProfits.length > 0 && (
          <div className="final-hands">
            <h3>本轮得失</h3>
            {result.playerProfits.map((pp, i) => (
              <div key={i} className="profit-row">
                <span className="profit-name">{pp.name}</span>
                <span className={pp.profit >= 0 ? 'profit-positive' : 'profit-negative'}>
                  {pp.profit >= 0 ? '+' : ''}{pp.profit}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Show hands at showdown */}
        {result.finalHands.length > 0 && (
          <div className="final-hands">
            <h3>摊牌手牌</h3>
            {result.finalHands.map((fh, i) => (
              <div key={i} className="hand-row">
                <span>
                  {result.playerProfits.find(p => p.playerId === fh.playerId)?.name ?? fh.playerId.slice(0, 6)}
                </span>
                <span>{fh.handName}</span>
              </div>
            ))}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn-primary btn-ready" onClick={onReady}>
            准备下一局
          </button>
        </div>
      </div>
    </div>
  );
}
