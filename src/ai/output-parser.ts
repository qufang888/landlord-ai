/**
 * 输出解析器
 * JSON 解析 → 合法性校验 → 降级信号
 */
import { Card, BidDecision, PlayDecision, CardTypeResult } from '../core/types';
import { identifyCardType, canBeat } from '../core/rules';
import { parseJsonResponse } from '../llm/provider';

// 花色符号映射
const SUIT_MAP: Record<string, Card['suit']> = {
  '♠': 'spade',
  '♥': 'heart',
  '♣': 'club',
  '♦': 'diamond',
};

// 点数映射
const RANK_MAP: Record<string, number> = {
  '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15,
};

export class OutputParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OutputParseError';
  }
}

/**
 * 解析牌字符串（如 "♠3", "♥K", "小王", "大王"）为 Card 对象
 */
export function parseCardString(str: string): Card {
  const s = str.trim();

  // 大小王
  if (s === '小王') return { suit: 'joker', rank: 16 };
  if (s === '大王') return { suit: 'joker', rank: 17 };

  // 普通牌：花色符号 + 点数
  const suitChar = s[0];
  const rankStr = s.slice(1);

  const suit = SUIT_MAP[suitChar];
  if (!suit) throw new OutputParseError(`无法识别花色: ${suitChar}`);

  const rank = RANK_MAP[rankStr.toUpperCase()] ?? RANK_MAP[rankStr];
  if (!rank) throw new OutputParseError(`无法识别点数: ${rankStr}`);

  return { suit, rank };
}

/**
 * 解析叫分决策
 */
export function parseBidDecision(content: string): BidDecision {
  const parsed = parseJsonResponse<{
    action?: string;
    score?: number;
    reasoning?: string;
  }>(content);

  if (!parsed.action || (parsed.action !== 'bid' && parsed.action !== 'pass')) {
    throw new OutputParseError('action 必须是 bid 或 pass');
  }

  if (parsed.action === 'bid') {
    if (!parsed.score || ![1, 2, 3].includes(parsed.score)) {
      throw new OutputParseError('叫分时 score 必须是 1、2 或 3');
    }
  }

  return {
    action: parsed.action as 'bid' | 'pass',
    score: parsed.score ?? 0,
    reasoning: parsed.reasoning ?? '',
  };
}

/**
 * 解析出牌决策 + 完整合法性校验
 */
export function parsePlayDecision(
  content: string,
  hand: Card[],
  lastPlay: CardTypeResult | null,
  isFreePlay: boolean  // 是否自由出牌
): PlayDecision {
  const parsed = parseJsonResponse<{
    action?: string;
    cards?: string[];
    reasoning?: string;
  }>(content);

  if (!parsed.action || (parsed.action !== 'play' && parsed.action !== 'pass')) {
    throw new OutputParseError('action 必须是 play 或 pass');
  }

  // Pass 情况
  if (parsed.action === 'pass') {
    if (isFreePlay) {
      throw new OutputParseError('自由出牌时不能 pass');
    }
    return {
      action: 'pass',
      cards: [],
      reasoning: parsed.reasoning ?? '',
    };
  }

  // Play 情况
  if (!parsed.cards || !Array.isArray(parsed.cards) || parsed.cards.length === 0) {
    throw new OutputParseError('出牌时 cards 不能为空');
  }

  // 解析每张牌
  const cards: Card[] = parsed.cards.map(parseCardString);

  // 校验牌都在手牌中
  const handCopy = [...hand];
  for (const card of cards) {
    const idx = handCopy.findIndex(c => c.suit === card.suit && c.rank === card.rank);
    if (idx === -1) {
      throw new OutputParseError(`牌 ${parsed.cards[cards.indexOf(card)]} 不在手牌中`);
    }
    handCopy.splice(idx, 1);
  }

  // 校验牌型合法
  const typeResult = identifyCardType(cards);
  if (!typeResult) {
    throw new OutputParseError('非法牌型');
  }

  // 校验能打过上家
  if (lastPlay && !isFreePlay) {
    if (!canBeat(typeResult, lastPlay)) {
      throw new OutputParseError('出牌不能打过上家');
    }
  }

  return {
    action: 'play',
    cards,
    reasoning: parsed.reasoning ?? '',
  };
}
