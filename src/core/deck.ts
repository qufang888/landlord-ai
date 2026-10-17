/**
 * 牌堆创建、洗牌、发牌
 */
import { Card, Suit } from './types';

const SUITS: Suit[] = ['spade', 'heart', 'club', 'diamond'];

/** 创建一副完整的 54 张牌 */
export function createDeck(): Card[] {
  const deck: Card[] = [];

  // 3 ~ 15 (即 3~2)，每种花色 13 张
  for (let rank = 3; rank <= 15; rank++) {
    for (const suit of SUITS) {
      deck.push({ suit, rank });
    }
  }

  // 小王 (16) 和 大王 (17)
  deck.push({ suit: 'joker', rank: 16 });
  deck.push({ suit: 'joker', rank: 17 });

  return deck;
}

/** Fisher-Yates 洗牌 */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 发牌：3 家各 17 张，剩余 3 张为底牌 */
export function dealCards(deck: Card[]): {
  hands: Card[][];
  bottomCards: Card[];
} {
  const shuffled = shuffle(deck);
  const hands: Card[][] = [[], [], []];

  for (let i = 0; i < 51; i++) {
    hands[i % 3].push(shuffled[i]);
  }

  const bottomCards = shuffled.slice(51, 54);

  // 每家手牌按 rank 排序，方便展示和 AI 分析
  hands.forEach(sortHand);

  return { hands, bottomCards };
}

/** 手牌按 rank 从大到小排序（同 rank 按花色排序） */
export function sortHand(hand: Card[]): Card[] {
  return hand.sort((a, b) => {
    if (b.rank !== a.rank) return b.rank - a.rank;
    // 同点数按花色：黑桃 > 红桃 > 梅花 > 方块
    const order: Record<Suit, number> = { spade: 4, heart: 3, club: 2, diamond: 1, joker: 0 };
    return order[b.suit] - order[a.suit];
  });
}

/** 卡牌转字符串表示（用于 Prompt） */
export function cardToString(card: Card): string {
  const suitMap: Record<string, string> = {
    spade: '♠', heart: '♥', club: '♣', diamond: '♦', joker: '',
  };
  const rankMap: Record<number, string> = {
    3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
    11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2', 16: '小王', 17: '大王',
  };
  if (card.suit === 'joker') return rankMap[card.rank];
  return `${suitMap[card.suit]}${rankMap[card.rank]}`;
}

/** 手牌数组转可读字符串 */
export function handToString(hand: Card[]): string {
  return hand.map(cardToString).join(' ');
}
