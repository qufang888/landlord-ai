/**
 * 计分系统
 * 基础分 × 叫分倍数 × 炸弹倍数 × 春天倍数
 */
import { CardType, SettlementResult } from './types';
import { isBombOrRocket } from './rules';

export interface ScorerConfig {
  baseScore: number;      // 基础分（默认1）
  bidScore: number;      // 叫分 1/2/3
  bombMultiplier: number; // 炸弹倍数（累乘）
  spring: boolean;       // 春天
  antiSpring: boolean;    // 反春天
}

export class Scorer {
  /** 计算最终结算 */
  static calculate(config: ScorerConfig): SettlementResult {
    const bidMultiplier = config.bidScore;
    const bombMultiplier = config.bombMultiplier;

    let springMultiplier = 1;
    let springReason = '';
    if (config.spring) {
      springMultiplier = 2;
      springReason = '春天';
    } else if (config.antiSpring) {
      springMultiplier = 2;
      springReason = '反春天';
    }

    const totalMultiplier = bidMultiplier * bombMultiplier * springMultiplier;
    const finalScore = config.baseScore * totalMultiplier;

    const reasons: string[] = [];
    reasons.push(`叫分×${bidMultiplier}`);
    if (bombMultiplier > 1) reasons.push(`炸弹×${bombMultiplier}`);
    if (springMultiplier > 1) reasons.push(`${springReason}×${springMultiplier}`);

    return {
      landlordScore: finalScore,
      farmerScore: -finalScore,
      baseScore: config.baseScore,
      bidMultiplier,
      bombMultiplier,
      springMultiplier,
      totalMultiplier,
      reason: reasons.join('，'),
    };
  }

  /** 根据本局打出的炸弹/火箭数量计算炸弹倍数 */
  static calculateBombMultiplier(playTypes: CardType[]): number {
    let multiplier = 1;
    for (const type of playTypes) {
      if (type === CardType.Rocket) {
        multiplier *= 4; // 火箭 = 两个炸弹
      } else if (type === CardType.Bomb) {
        multiplier *= 2;
      }
    }
    return multiplier;
  }

  /** 判断是否春天：地主出完牌时农民一张牌都没出（pass 不计） */
  static checkSpring(landlordId: number, playHistory: { playerId: number; cards?: unknown[] }[]): boolean {
    const farmerActualPlays = playHistory.filter(
      p => p.playerId !== landlordId && p.cards && p.cards.length > 0
    );
    return farmerActualPlays.length === 0;
  }

  /** 判断是否反春天：农民出完牌时地主只出过一手牌（首张由地主出） */
  static checkAntiSpring(landlordId: number, playHistory: { playerId: number; cards?: unknown[] }[]): boolean {
    const landlordActualPlays = playHistory.filter(
      p => p.playerId === landlordId && p.cards && p.cards.length > 0
    );
    // 地主只出过一手牌，且本局第一手实际出牌由地主打出（地主先手）
    if (landlordActualPlays.length !== 1) return false;
    const firstActual = playHistory.find(p => p.cards && p.cards.length > 0);
    return firstActual?.playerId === landlordId;
  }
}
