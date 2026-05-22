import type { Card, Rank } from 'shared';

const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

const HAND_NAMES = [
  '高牌', '一对', '两对', '三条',
  '顺子', '同花', '葫芦', '四条',
  '同花顺', '皇家同花顺',
];

export interface HandScore {
  rank: number;      // 0-9
  values: number[];  // tiebreaker values, most significant first
  handName: string;
  bestFive: Card[];
}

export class HandEvaluator {
  static evaluate(holeCards: Card[], communityCards: Card[]): HandScore {
    const allCards = [...holeCards, ...communityCards];
    const combos = HandEvaluator.combinations(allCards, 5);
    let best: HandScore | null = null;
    for (const five of combos) {
      const score = HandEvaluator.evaluateFive(five);
      if (!best || HandEvaluator.compare(score, best) > 0) {
        best = score;
      }
    }
    return best!;
  }

  static evaluateFive(cards: Card[]): HandScore {
    const values = cards.map(c => RANK_VALUES[c.rank]).sort((a, b) => b - a);
    const isFlush = cards.every(c => c.suit === cards[0].suit);
    const straightHigh = HandEvaluator.getStraightHigh(values);
    const groups = HandEvaluator.getGroups(values);

    // Straight Flush / Royal Flush
    if (isFlush && straightHigh !== null) {
      if (straightHigh === 14) {
        return { rank: 9, values: [14], handName: HAND_NAMES[9], bestFive: cards };
      }
      return { rank: 8, values: [straightHigh], handName: HAND_NAMES[8], bestFive: cards };
    }

    // Group by count, then by rank value descending
    const groupEntries = Array.from(groups.entries())
      .sort((a, b) => b[1] - a[1] || b[0] - a[0]);

    // Four of a Kind
    if (groupEntries[0][1] === 4) {
      const quadRank = groupEntries[0][0];
      const kicker = groupEntries[1][0];
      return { rank: 7, values: [quadRank, kicker], handName: HAND_NAMES[7], bestFive: cards };
    }

    // Full House
    if (groupEntries[0][1] === 3 && groupEntries[1][1] >= 2) {
      const tripRank = groupEntries[0][0];
      const pairRank = groupEntries[1][0];
      return { rank: 6, values: [tripRank, pairRank], handName: HAND_NAMES[6], bestFive: cards };
    }

    // Flush
    if (isFlush) {
      return { rank: 5, values, handName: HAND_NAMES[5], bestFive: cards };
    }

    // Straight
    if (straightHigh !== null) {
      return { rank: 4, values: [straightHigh], handName: HAND_NAMES[4], bestFive: cards };
    }

    // Three of a Kind
    if (groupEntries[0][1] === 3) {
      const tripRank = groupEntries[0][0];
      const kickers = groupEntries.slice(1).map(e => e[0]).sort((a, b) => b - a);
      return { rank: 3, values: [tripRank, ...kickers], handName: HAND_NAMES[3], bestFive: cards };
    }

    // Two Pair
    if (groupEntries[0][1] === 2 && groupEntries[1][1] === 2) {
      const pair1 = groupEntries[0][0];
      const pair2 = groupEntries[1][0];
      const kicker = groupEntries[2][0];
      return { rank: 2, values: [pair1, pair2, kicker], handName: HAND_NAMES[2], bestFive: cards };
    }

    // One Pair
    if (groupEntries[0][1] === 2) {
      const pairRank = groupEntries[0][0];
      const kickers = groupEntries.slice(1).map(e => e[0]).sort((a, b) => b - a);
      return { rank: 1, values: [pairRank, ...kickers], handName: HAND_NAMES[1], bestFive: cards };
    }

    // High Card
    return { rank: 0, values, handName: HAND_NAMES[0], bestFive: cards };
  }

  static compare(a: HandScore, b: HandScore): number {
    if (a.rank !== b.rank) return a.rank - b.rank;
    for (let i = 0; i < Math.max(a.values.length, b.values.length); i++) {
      const av = a.values[i] ?? 0;
      const bv = b.values[i] ?? 0;
      if (av !== bv) return av - bv;
    }
    return 0;
  }

  static combinations<T>(arr: T[], k: number): T[][] {
    if (k === 0) return [[]];
    if (arr.length < k) return [];
    const [first, ...rest] = arr;
    const withFirst = HandEvaluator.combinations(rest, k - 1).map(c => [first, ...c]);
    const withoutFirst = HandEvaluator.combinations(rest, k);
    return [...withFirst, ...withoutFirst];
  }

  private static getStraightHigh(values: number[]): number | null {
    const unique = [...new Set(values)].sort((a, b) => b - a);
    // Normal straight check
    if (unique.length >= 5) {
      for (let i = 0; i <= unique.length - 5; i++) {
        if (unique[i] - unique[i + 4] === 4) {
          return unique[i];
        }
      }
    }
    // Wheel: A-2-3-4-5 (Ace acts as 1)
    const hasWheel = unique.includes(14) && unique.includes(2) && unique.includes(3) &&
                     unique.includes(4) && unique.includes(5);
    if (hasWheel) return 5;
    return null;
  }

  private static getGroups(values: number[]): Map<number, number> {
    const groups = new Map<number, number>();
    for (const v of values) {
      groups.set(v, (groups.get(v) ?? 0) + 1);
    }
    return groups;
  }
}
