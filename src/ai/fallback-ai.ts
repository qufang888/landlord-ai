/**
 * 规则兜底 AI
 * 当 LLM 返回非法响应时，用简单规则保证游戏不卡死
 * 策略：自由出牌出最小牌，跟牌出刚好能压过的最小牌
 */
import { Card, CardTypeResult, PlayDecision, BidDecision } from '../core/types';
import { identifyCardType, canBeat } from '../core/rules';

export class FallbackAI {
  /** 叫分兜底：手牌强就叫2分，弱就不叫 */
  static decideBid(hand: Card[], currentHighest: number): BidDecision {
    // 简单评估：统计大牌数量
    let bigCards = 0;
    let hasBomb = false;
    let hasRocket = false;

    const rankCount = new Map<number, number>();
    for (const c of hand) {
      rankCount.set(c.rank, (rankCount.get(c.rank) || 0) + 1);
      if (c.rank >= 14) bigCards++; // A 以上
    }

    for (const [, count] of rankCount) {
      if (count === 4) hasBomb = true;
    }
    if (rankCount.has(16) && rankCount.has(17)) hasRocket = true;

    let score = 0;
    if (hasRocket) score = 3;
    else if (hasBomb && bigCards >= 4) score = 3;
    else if (hasBomb || bigCards >= 6) score = 2;
    else if (bigCards >= 3) score = 1;
    else score = 0;

    // 如果叫分必须高于当前最高分
    if (score <= currentHighest) {
      return { action: 'pass', score: 0, reasoning: 'fbWeakPass' };
    }

    return {
      action: 'bid',
      score,
      reasoning: `fbEvalBid:${bigCards}:${hasBomb ? 1 : 0}:${score}`,
    };
  }

  /** 出牌兜底 */
  static decidePlay(
    hand: Card[],
    lastPlay: CardTypeResult | null,
    isFreePlay: boolean
  ): PlayDecision {
    // 自由出牌：出最小的单牌
    if (isFreePlay || !lastPlay) {
      const sorted = [...hand].sort((a, b) => a.rank - b.rank);
      return {
        action: 'play',
        cards: [sorted[0]],
        reasoning: 'fbFreePlay',
      };
    }

    // 跟牌：找刚好能压过的最小牌型
    const candidate = this.findMinBeat(hand, lastPlay);
    if (candidate) {
      return {
        action: 'play',
        cards: candidate,
        reasoning: 'fbMinBeat',
      };
    }

    // 压不过就 pass
    return {
      action: 'pass',
      cards: [],
      reasoning: 'fbCannotBeat',
    };
  }

  /** 找到刚好能压过上家的最小牌 */
  private static findMinBeat(hand: Card[], lastPlay: CardTypeResult): Card[] | null {
    // 按 rank 分组
    const byRank = new Map<number, Card[]>();
    for (const c of hand) {
      if (!byRank.has(c.rank)) byRank.set(c.rank, []);
      byRank.get(c.rank)!.push(c);
    }

    const sortedRanks = [...byRank.keys()].sort((a, b) => a - b);

    // 尝试同型同张数压牌
    switch (lastPlay.type) {
      case 'single':
        for (const rank of sortedRanks) {
          if (rank > lastPlay.mainRank && byRank.get(rank)!.length >= 1) {
            return [byRank.get(rank)![0]];
          }
        }
        break;

      case 'pair':
        for (const rank of sortedRanks) {
          if (rank > lastPlay.mainRank && byRank.get(rank)!.length >= 2) {
            return [byRank.get(rank)![0], byRank.get(rank)![1]];
          }
        }
        break;

      case 'triple':
        for (const rank of sortedRanks) {
          if (rank > lastPlay.mainRank && byRank.get(rank)!.length >= 3) {
            return [byRank.get(rank)![0], byRank.get(rank)![1], byRank.get(rank)![2]];
          }
        }
        break;

      default:
        // 其他牌型简化处理：直接出炸弹压
        for (const rank of sortedRanks) {
          if (byRank.get(rank)!.length === 4) {
            return [...byRank.get(rank)!];
          }
        }
        // 王炸
        if (byRank.has(16) && byRank.has(17)) {
          return [byRank.get(16)![0], byRank.get(17)![0]];
        }
        return null;
    }

    // 同型压不过，试试炸弹
    for (const rank of sortedRanks) {
      if (byRank.get(rank)!.length === 4) {
        return [...byRank.get(rank)!];
      }
    }

    // 试试王炸
    if (byRank.has(16) && byRank.has(17)) {
      return [byRank.get(16)![0], byRank.get(17)![0]];
    }

    return null;
  }
}
