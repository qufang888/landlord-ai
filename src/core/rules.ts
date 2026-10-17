/**
 * 牌型识别器 + 大小比较器
 * 覆盖全部牌型：火箭、炸弹、单牌、对子、三张、三带一、三带对、
 * 顺子、连对、飞机、飞机带翅膀、四带二单、四带二对
 */
import { Card, CardType, CardTypeResult } from './types';

/** 统计每个 rank 的牌数 */
function countByRank(cards: Card[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const c of cards) {
    map.set(c.rank, (map.get(c.rank) || 0) + 1);
  }
  return map;
}

/** 获取排序后的唯一 rank 列表（升序） */
function sortedRanks(countMap: Map<number, number>): number[] {
  return [...countMap.keys()].sort((a, b) => a - b);
}

/** 检查是否连续（不含 2 和王，即 rank ≤ 14） */
function isConsecutive(ranks: number[]): boolean {
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] !== ranks[i - 1] + 1) return false;
  }
  return true;
}

// ============================================================
// 牌型识别
// ============================================================

export function identifyCardType(cards: Card[]): CardTypeResult | null {
  if (cards.length === 0) return null;

  const countMap = countByRank(cards);
  const ranks = sortedRanks(countMap);
  const n = cards.length;

  // --- 1. 火箭（双王） ---
  if (n === 2 && countMap.has(16) && countMap.has(17)) {
    return { type: CardType.Rocket, mainRank: 17, length: 2, mainRanks: [16, 17] };
  }

  // --- 2. 炸弹（四张同点） ---
  if (n === 4) {
    for (const [rank, count] of countMap) {
      if (count === 4) {
        return { type: CardType.Bomb, mainRank: rank, length: 4, mainRanks: [rank] };
      }
    }
  }

  // --- 单牌 ---
  if (n === 1) {
    return { type: CardType.Single, mainRank: cards[0].rank, length: 1, mainRanks: [cards[0].rank] };
  }

  // --- 对子 ---
  if (n === 2 && countMap.get(ranks[0]) === 2) {
    return { type: CardType.Pair, mainRank: ranks[0], length: 2, mainRanks: [ranks[0]] };
  }

  // --- 三张 ---
  if (n === 3) {
    for (const [rank, count] of countMap) {
      if (count === 3) {
        return { type: CardType.Triple, mainRank: rank, length: 3, mainRanks: [rank] };
      }
    }
  }

  // --- 三带一 (3+1) ---
  if (n === 4) {
    for (const [rank, count] of countMap) {
      if (count === 3) {
        return { type: CardType.TripleWithOne, mainRank: rank, length: 4, mainRanks: [rank] };
      }
    }
  }

  // --- 三带对 (3+2) ---
  if (n === 5) {
    let tripleRank = -1;
    let pairCount = 0;
    for (const [rank, count] of countMap) {
      if (count === 3) tripleRank = rank;
      if (count === 2) pairCount++;
    }
    if (tripleRank !== -1 && pairCount === 1) {
      return { type: CardType.TripleWithPair, mainRank: tripleRank, length: 5, mainRanks: [tripleRank] };
    }
  }

  // --- 顺子 (≥5 张连续单牌，不含 2 和王) ---
  if (n >= 5 && ranks.every(r => r <= 14)) {
    if (ranks.length === n && isConsecutive(ranks)) {
      return { type: CardType.Straight, mainRank: ranks[ranks.length - 1], length: n, mainRanks: ranks };
    }
  }

  // --- 连对 (≥3 对连续，不含 2 和王) ---
  if (n >= 6 && n % 2 === 0 && ranks.every(r => r <= 14)) {
    const pairRanks: number[] = [];
    let allPairs = true;
    for (const [rank, count] of countMap) {
      if (count === 2) pairRanks.push(rank);
      else { allPairs = false; break; }
    }
    if (allPairs && pairRanks.length >= 3 && isConsecutive(pairRanks)) {
      return { type: CardType.DoubleStraight, mainRank: pairRanks[pairRanks.length - 1], length: n, mainRanks: pairRanks };
    }
  }

  // --- 飞机（纯飞机：≥2 组连续三张，不含 2 和王） ---
  if (n >= 6 && n % 3 === 0 && ranks.every(r => r <= 14)) {
    const tripleRanks: number[] = [];
    let allTriples = true;
    for (const [rank, count] of countMap) {
      if (count === 3) tripleRanks.push(rank);
      else { allTriples = false; break; }
    }
    if (allTriples && tripleRanks.length >= 2 && isConsecutive(tripleRanks)) {
      return { type: CardType.Plane, mainRank: tripleRanks[tripleRanks.length - 1], length: n, mainRanks: tripleRanks };
    }
  }

  // --- 飞机带翅膀 ---
  // 形式：N 组连续三张 + N 张单牌翅膀 或 N 组连续三张 + N 组对子翅膀
  // 不含 2 和王在飞机主体中
  if (n >= 8 && ranks.every(r => r <= 14)) {
    // 收集三张组
    const tripleRanks: number[] = [];
    const otherCards: Card[] = [];
    const tripleCountMap = new Map<number, number>();

    for (const [rank, count] of countMap) {
      if (count === 3) tripleRanks.push(rank);
    }

    if (tripleRanks.length >= 2 && isConsecutive(tripleRanks)) {
      const numTriples = tripleRanks.length;
      const tripleSet = new Set(tripleRanks);

      // 剩余牌 = 总牌 - 3*numTriples
      const remainingCount = n - 3 * numTriples;

      // 翅膀形式1：带等量单牌（remainingCount === numTriples）
      if (remainingCount === numTriples) {
        // 检查剩余牌是否都是单张（不在 triple 中的牌）
        const wingCards: number[] = [];
        let valid = true;
        for (const [rank, count] of countMap) {
          if (!tripleSet.has(rank)) {
            if (count === 1) wingCards.push(rank);
            else { valid = false; break; }
          }
        }
        if (valid && wingCards.length === numTriples) {
          return {
            type: CardType.PlaneWithWings,
            mainRank: tripleRanks[tripleRanks.length - 1],
            length: n,
            mainRanks: tripleRanks,
          };
        }
      }

      // 翅膀形式2：带等量对子（remainingCount === 2 * numTriples）
      if (remainingCount === 2 * numTriples) {
        let valid = true;
        let pairCount = 0;
        for (const [rank, count] of countMap) {
          if (!tripleSet.has(rank)) {
            if (count === 2) pairCount++;
            else { valid = false; break; }
          }
        }
        if (valid && pairCount === numTriples) {
          return {
            type: CardType.PlaneWithWings,
            mainRank: tripleRanks[tripleRanks.length - 1],
            length: n,
            mainRanks: tripleRanks,
          };
        }
      }
    }
  }

  // --- 四带二单 (4 + 1 + 1) ---
  if (n === 6) {
    let fourRank = -1;
    let singles = 0;
    for (const [rank, count] of countMap) {
      if (count === 4) fourRank = rank;
      if (count === 1) singles++;
    }
    if (fourRank !== -1 && singles === 2) {
      return { type: CardType.FourWithTwoSingles, mainRank: fourRank, length: 6, mainRanks: [fourRank] };
    }
  }

  // --- 四带二对 (4 + 2 + 2) ---
  if (n === 8) {
    let fourRank = -1;
    let pairCount = 0;
    for (const [rank, count] of countMap) {
      if (count === 4) fourRank = rank;
      if (count === 2) pairCount++;
    }
    if (fourRank !== -1 && pairCount === 2) {
      return { type: CardType.FourWithTwoPairs, mainRank: fourRank, length: 8, mainRanks: [fourRank] };
    }
  }

  return null; // 非法牌型
}

// ============================================================
// 大小比较
// ============================================================

/**
 * candidate 是否能压过 current
 * @param candidate 出的牌
 * @param current 上家出的牌（null 表示自由出牌）
 */
export function canBeat(
  candidate: CardTypeResult,
  current: CardTypeResult | null
): boolean {
  // 自由出牌（没人出牌），任何合法牌型都可以
  if (current === null) {
    return candidate.type !== CardType.Pass;
  }

  // 火箭最大
  if (candidate.type === CardType.Rocket) return true;

  // 当前是火箭，什么都压不过
  if (current.type === CardType.Rocket) return false;

  // 炸弹可以压普通牌型
  if (candidate.type === CardType.Bomb && current.type !== CardType.Bomb) {
    return true;
  }

  // 两个炸弹比大小
  if (candidate.type === CardType.Bomb && current.type === CardType.Bomb) {
    return candidate.mainRank > current.mainRank;
  }

  // 普通牌型：必须同型同张数
  if (candidate.type === current.type && candidate.length === current.length) {
    // 顺子、连对、飞机：比较最大主牌点即可（因为长度相同）
    return candidate.mainRank > current.mainRank;
  }

  return false;
}

// ============================================================
// 工具函数
// ============================================================

/** 判断是否是炸弹或火箭（用于倍数计算） */
export function isBombOrRocket(type: CardType): boolean {
  return type === CardType.Bomb || type === CardType.Rocket;
}

/** 获取牌型中文名 */
export function getTypeName(type: CardType): string {
  const names: Record<CardType, string> = {
    [CardType.Rocket]: '王炸',
    [CardType.Bomb]: '炸弹',
    [CardType.Single]: '单牌',
    [CardType.Pair]: '对子',
    [CardType.Triple]: '三张',
    [CardType.TripleWithOne]: '三带一',
    [CardType.TripleWithPair]: '三带一对',
    [CardType.Straight]: '顺子',
    [CardType.DoubleStraight]: '连对',
    [CardType.Plane]: '飞机',
    [CardType.PlaneWithWings]: '飞机带翅膀',
    [CardType.FourWithTwoSingles]: '四带二',
    [CardType.FourWithTwoPairs]: '四带二对',
    [CardType.Pass]: '不出',
  };
  return names[type] || '未知';
}
