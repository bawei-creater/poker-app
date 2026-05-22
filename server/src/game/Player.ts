import type { Card, PlayerState } from 'shared';
import { MAX_BET_PER_HAND } from 'shared';

export class Player {
  public id: string;
  public name: string;
  public chips: number;
  public bet: number = 0;
  public totalBet: number = 0;
  public holeCards: Card[] = [];
  public folded: boolean = false;
  public isAllIn: boolean = false;
  public isDealer: boolean = false;
  public isActive: boolean = true;
  public seatIndex: number;
  public isReady: boolean = false;
  public profit: number = 0;
  public totalProfit: number = 0;

  constructor(id: string, name: string, chips: number, seatIndex: number) {
    this.id = id;
    this.name = name;
    this.chips = chips;
    this.seatIndex = seatIndex;
  }

  resetForNewHand(): void {
    this.bet = 0;
    this.totalBet = 0;
    this.holeCards = [];
    this.folded = false;
    this.isAllIn = false;
    this.isReady = false;
    this.profit = 0;
    this.chips = MAX_BET_PER_HAND; // Reset chips to 100 each hand
  }

  placeBet(amount: number): number {
    const maxCanBet = Math.min(amount, this.chips, MAX_BET_PER_HAND - this.totalBet);
    const actual = Math.max(0, maxCanBet);
    this.chips -= actual;
    this.bet += actual;
    this.totalBet += actual;
    if (this.chips === 0 || this.totalBet >= MAX_BET_PER_HAND) this.isAllIn = true;
    return actual;
  }

  toState(hideCards: boolean = false): PlayerState {
    return {
      id: this.id,
      name: this.name,
      chips: this.chips,
      bet: this.bet,
      totalBet: this.totalBet,
      holeCards: hideCards ? [] : [...this.holeCards],
      folded: this.folded,
      isAllIn: this.isAllIn,
      isDealer: this.isDealer,
      isActive: this.isActive,
      seatIndex: this.seatIndex,
      isReady: this.isReady,
      profit: this.profit,
      totalProfit: this.totalProfit,
    };
  }
}
