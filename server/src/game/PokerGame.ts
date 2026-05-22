import type { Card, GamePhase, GameAction, HandResult, SidePot } from 'shared';
import { MAX_BET_PER_HAND } from 'shared';
import { Deck } from './Deck';
import { HandEvaluator, type HandScore } from './HandEvaluator';
import { Player } from './Player';

export class PokerGame {
  private deck!: Deck;
  private phase: GamePhase = 'waiting';
  private communityCards: Card[] = [];
  private pot: number = 0;
  private dealerIndex: number = 0;
  private currentPlayerIndex: number = -1;
  private smallBlind: number;
  private bigBlind: number;
  private minRaise: number;
  private players: Player[];
  private currentBet: number = 0;
  private lastHandResult: HandResult | null = null;
  // Tracks which players still need to act this betting round
  private playersToAct: Set<string> = new Set();

  constructor(players: Player[], smallBlind: number, bigBlind: number) {
    this.players = players;
    this.smallBlind = smallBlind;
    this.bigBlind = bigBlind;
    this.minRaise = bigBlind;
  }

  startHand(): void {
    this.deck = new Deck();
    this.communityCards = [];
    this.pot = 0;
    this.phase = 'preflop';
    this.minRaise = this.bigBlind;
    this.currentBet = 0;
    this.lastHandResult = null;
    this.playersToAct = new Set();

    for (const p of this.players) {
      if (p.isActive) {
        p.resetForNewHand();
      }
    }

    const active = this.activePlayers();
    if (active.length < 2) throw new Error('没有足够的玩家');

    this.advanceDealer();
    this.postBlinds();

    for (const p of active) {
      p.holeCards = this.deck.deal(2);
    }

    // Preflop: everyone except SB and BB needs to act
    // BB gets option (added to set)
    const bbIdx = this.bigBlindIndex();
    const sbIdx = this.nextActivePlayerIndex(this.dealerIndex);

    this.playersToAct.clear();
    for (const p of active) {
      if (p.isActive && !p.folded && !p.isAllIn) {
        // Everyone needs to act preflop (including BB for option)
        this.playersToAct.add(p.id);
      }
    }

    // Action starts left of big blind
    this.currentPlayerIndex = this.nextActivePlayerIndex(bbIdx);
    this.phase = 'preflop';
  }

  processAction(playerId: string, action: GameAction): void {
    if (this.phase === 'waiting' || this.phase === 'showdown') {
      throw new Error('当前不在下注轮次');
    }

    const player = this.players.find(p => p.id === playerId);
    if (!player) throw new Error('玩家不存在');
    if (this.currentPlayerIndex < 0 || this.players[this.currentPlayerIndex]?.id !== playerId) {
      throw new Error('还没轮到你');
    }

    switch (action.type) {
      case 'fold':
        player.folded = true;
        break;
      case 'check':
        if (player.bet < this.currentBet) {
          throw new Error('不能过牌，必须跟注或加注');
        }
        break;
      case 'call': {
        const toCall = this.currentBet - player.bet;
        player.placeBet(toCall);
        break;
      }
      case 'raise': {
        if (!action.amount || action.amount <= this.currentBet) {
          throw new Error('加注金额必须高于当前注额');
        }
        const raiseTotal = Math.min(action.amount, MAX_BET_PER_HAND);
        const needed = raiseTotal - player.bet;
        if (needed <= 0) throw new Error('加注金额太低');
        player.placeBet(needed);
        this.minRaise = raiseTotal - this.currentBet;
        this.currentBet = raiseTotal;

        // Raise: all other active players need to act again
        this.playersToAct.clear();
        for (const p of this.activeInHand()) {
          if (p.id !== playerId && !p.isAllIn) {
            this.playersToAct.add(p.id);
          }
        }
        break;
      }
      case 'all-in': {
        const allInAmount = player.chips;
        player.placeBet(allInAmount);
        if (player.bet > this.currentBet) {
          this.minRaise = player.bet - this.currentBet;
          this.currentBet = player.bet;

          // All-in that raises: others need to act
          this.playersToAct.clear();
          for (const p of this.activeInHand()) {
            if (p.id !== playerId && !p.isAllIn) {
              this.playersToAct.add(p.id);
            }
          }
        }
        break;
      }
    }

    // Remove current player from "needs to act" set
    this.playersToAct.delete(playerId);

    // Check if betting round is complete
    if (this.isBettingRoundComplete()) {
      this.advancePhase();
    } else {
      this.advanceToNextPlayer();
    }
  }

  private isBettingRoundComplete(): boolean {
    const active = this.activeInHand();
    if (active.length <= 1) return true;

    const activeNonAllIn = active.filter(p => !p.isAllIn);
    if (activeNonAllIn.length <= 1) return true;

    // All active non-all-in players must have matched the current bet
    const allMatched = activeNonAllIn.every(p => p.bet === this.currentBet);
    if (!allMatched) return false;

    // Round is complete when no one is left to act
    return this.playersToAct.size === 0;
  }

  private advancePhase(): void {
    this.collectBets();

    const active = this.activeInHand();
    if (active.length === 1) {
      this.awardPotToWinner(active[0]);
      return;
    }

    const activeNonAllIn = active.filter(p => !p.isAllIn);
    if (activeNonAllIn.length === 0) {
      while (this.communityCards.length < 5) {
        if (this.communityCards.length === 0) {
          this.communityCards.push(...this.deck.deal(3));
        } else {
          this.communityCards.push(...this.deck.deal(1));
        }
      }
      this.phase = 'showdown';
      this.showdown();
      return;
    }

    switch (this.phase) {
      case 'preflop':
        this.phase = 'flop';
        this.communityCards.push(...this.deck.deal(3));
        break;
      case 'flop':
        this.phase = 'turn';
        this.communityCards.push(...this.deck.deal(1));
        break;
      case 'turn':
        this.phase = 'river';
        this.communityCards.push(...this.deck.deal(1));
        break;
      case 'river':
        this.phase = 'showdown';
        this.showdown();
        return;
    }

    // Reset for new betting round
    this.currentBet = 0;
    this.minRaise = this.bigBlind;
    for (const p of this.players) p.bet = 0;

    // Post-flop: all active non-all-in players need to act
    this.playersToAct.clear();
    for (const p of this.activeInHand()) {
      if (!p.isAllIn) {
        this.playersToAct.add(p.id);
      }
    }

    // First to act: first active player left of dealer
    this.currentPlayerIndex = this.nextActivePlayerIndex(this.dealerIndex);
  }

  private showdown(): void {
    this.collectBets();
    const active = this.activeInHand();

    const hands: { player: Player; score: HandScore }[] = active.map(p => ({
      player: p,
      score: HandEvaluator.evaluate(p.holeCards, this.communityCards),
    }));

    hands.sort((a, b) => HandEvaluator.compare(b.score, a.score));

    const pots = this.calculateSidePots();
    const finalHands = hands.map(h => ({
      playerId: h.player.id,
      cards: h.player.holeCards,
      handName: h.score.handName,
    }));

    const winners: HandResult['winners'] = [];

    for (const pot of pots) {
      const eligibleHands = hands.filter(h => pot.eligiblePlayerIds.includes(h.player.id));
      if (eligibleHands.length === 0) continue;

      const bestScore = eligibleHands[0].score;
      const potWinners = eligibleHands.filter(h => HandEvaluator.compare(h.score, bestScore) === 0);
      const share = Math.floor(pot.amount / potWinners.length);

      for (const w of potWinners) {
        w.player.chips += share;
        winners.push({ playerId: w.player.id, handName: w.score.handName, winnings: share });
      }
      const remainder = pot.amount - share * potWinners.length;
      if (remainder > 0 && potWinners.length > 0) {
        potWinners[0].player.chips += remainder;
      }
    }

    const playerProfits = this.players.map(p => ({
      playerId: p.id,
      name: p.name,
      profit: p.chips - MAX_BET_PER_HAND,
    }));

    for (const p of this.players) {
      p.profit = p.chips - MAX_BET_PER_HAND;
      p.totalProfit += p.profit;
    }

    this.lastHandResult = { winners, pot: this.pot, finalHands, playerProfits };
  }

  private awardPotToWinner(winner: Player): void {
    this.collectBets();
    winner.chips += this.pot;

    const playerProfits = this.players.map(p => ({
      playerId: p.id,
      name: p.name,
      profit: p.chips - MAX_BET_PER_HAND,
    }));

    for (const p of this.players) {
      p.profit = p.chips - MAX_BET_PER_HAND;
      p.totalProfit += p.profit;
    }

    this.lastHandResult = {
      winners: [{ playerId: winner.id, handName: '赢（其他人弃牌）', winnings: this.pot }],
      pot: this.pot,
      finalHands: [],
      playerProfits,
    };
  }

  awardLastPlayer(winner: Player): void {
    this.collectBets();
    winner.chips += this.pot;
    this.phase = 'showdown';

    const playerProfits = this.players.map(p => ({
      playerId: p.id,
      name: p.name,
      profit: p.chips - MAX_BET_PER_HAND,
    }));

    for (const p of this.players) {
      p.profit = p.chips - MAX_BET_PER_HAND;
      p.totalProfit += p.profit;
    }

    this.lastHandResult = {
      winners: [{ playerId: winner.id, handName: '赢（其他人离开）', winnings: this.pot }],
      pot: this.pot,
      finalHands: [],
      playerProfits,
    };
  }

  private calculateSidePots(): SidePot[] {
    const contributing = this.players
      .filter(p => p.totalBet > 0)
      .sort((a, b) => a.totalBet - b.totalBet);

    if (contributing.length === 0) return [{ amount: this.pot, eligiblePlayerIds: this.activeInHand().map(p => p.id) }];

    const pots: SidePot[] = [];
    let processedBet = 0;

    for (const player of contributing) {
      const betLevel = player.totalBet;
      if (betLevel <= processedBet) continue;

      const layerAmount = betLevel - processedBet;
      const contributorsAtLevel = this.players.filter(p => p.totalBet >= betLevel).length;
      const eligible = this.players
        .filter(p => p.totalBet >= betLevel && !p.folded)
        .map(p => p.id);

      const potAmount = layerAmount * contributorsAtLevel;
      if (eligible.length > 0 && potAmount > 0) {
        pots.push({ amount: potAmount, eligiblePlayerIds: eligible });
      }
      processedBet = betLevel;
    }

    const totalInPots = pots.reduce((sum, p) => sum + p.amount, 0);
    if (totalInPots < this.pot) {
      const active = this.activeInHand().map(p => p.id);
      if (pots.length > 0) {
        pots[0].amount += this.pot - totalInPots;
      } else {
        pots.push({ amount: this.pot, eligiblePlayerIds: active });
      }
    }

    return pots;
  }

  private collectBets(): void {
    for (const p of this.players) {
      this.pot += p.bet;
      p.bet = 0;
    }
    this.currentBet = 0;
  }

  private advanceToNextPlayer(): void {
    this.currentPlayerIndex = this.nextActivePlayerIndex(this.currentPlayerIndex);
  }

  private nextActivePlayerIndex(fromIndex: number): number {
    let idx = (fromIndex + 1) % this.players.length;
    for (let guard = 0; guard < this.players.length; guard++) {
      const p = this.players[idx];
      if (p.isActive && !p.folded && !p.isAllIn) return idx;
      idx = (idx + 1) % this.players.length;
    }
    return -1;
  }

  private advanceDealer(): void {
    const active = this.activePlayers();
    active.forEach(p => p.isDealer = false);
    const currentPos = active.findIndex(p => p.seatIndex === this.players[this.dealerIndex]?.seatIndex);
    const nextPos = ((currentPos < 0 ? 0 : currentPos) + 1) % active.length;
    active[nextPos].isDealer = true;
    this.dealerIndex = this.players.indexOf(active[nextPos]);
  }

  private postBlinds(): void {
    const sbIndex = this.nextActivePlayerIndex(this.dealerIndex);
    const bbIndex = this.nextActivePlayerIndex(sbIndex);
    this.players[sbIndex].placeBet(this.smallBlind);
    this.players[bbIndex].placeBet(this.bigBlind);
    this.currentBet = this.bigBlind;
  }

  private bigBlindIndex(): number {
    const sbIndex = this.nextActivePlayerIndex(this.dealerIndex);
    return this.nextActivePlayerIndex(sbIndex);
  }

  private activePlayers(): Player[] {
    return this.players.filter(p => p.isActive);
  }

  private activeInHand(): Player[] {
    return this.players.filter(p => p.isActive && !p.folded);
  }

  // Getters
  getPhase(): GamePhase { return this.phase; }
  getCommunityCards(): Card[] { return [...this.communityCards]; }
  getPot(): number { return this.pot; }
  getSidePots(): SidePot[] { return []; }
  getCurrentPlayerId(): string | null {
    return this.currentPlayerIndex >= 0 ? this.players[this.currentPlayerIndex]?.id ?? null : null;
  }
  getMinRaise(): number { return this.currentBet + 1; }
  getCurrentBet(): number { return this.currentBet; }
  getLastHandResult(): HandResult | null { return this.lastHandResult; }
}
