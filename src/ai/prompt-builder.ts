/**
 * Prompt 构建器
 * 针对叫分和出牌场景分别构建系统/用户 Prompt
 */
import { Card, Player, PlayRecord } from '../core/types';
import { cardToString, handToString } from '../core/deck';
import { getTypeName, identifyCardType } from '../core/rules';

export interface BidPromptContext {
  hand: Card[];
  bidHistory: { playerId: number; action: string; score: number }[];
  currentHighestBid: number;
  playerName: string;
}

export interface PlayPromptContext {
  hand: Card[];
  role: 'landlord' | 'farmer';
  lastPlayedCards: Card[];      // 上家出的牌
  lastPlayedBy: number;          // 上家 ID
  playHistory: PlayRecord[];
  myRemainingCount: number;
  opponentCounts: Record<number, number>;  // 各对手剩余牌数
  playerId: number;
}

export class PromptBuilder {
  // ---------- 叫分 Prompt ----------
  static buildBidSystemPrompt(): string {
    return `你是一个专业的斗地主AI玩家，正在决定是否叫分。

规则说明：
- 你可以选择叫1分、2分、3分，或者不叫
- 必须叫比当前最高分更高的分
- 手牌强度参考：炸弹、王炸、2、A 越多，手牌越强
- 春天/反春天风险也要考虑

请严格按照 JSON 格式输出，不要输出任何其他内容：
{"action": "bid" 或 "pass", "score": 1或2或3, "reasoning": "你的简要推理"}`;
  }

  static buildBidUserPrompt(ctx: BidPromptContext): string {
    const bidHistoryText = ctx.bidHistory.length > 0
      ? ctx.bidHistory.map(b => `玩家${b.playerId}: ${b.action === 'bid' ? `叫${b.score}分` : '不叫'}`).join('，')
      : '暂无叫分记录';

    return `你的手牌：${handToString(ctx.hand)}
手牌数量：${ctx.hand.length} 张
已叫分记录：${bidHistoryText}
当前最高分：${ctx.currentHighestBid}

请决定你是叫分还是不叫。如果叫分，分数必须大于当前最高分。`;
  }

  // ---------- 出牌 Prompt ----------
  static buildPlaySystemPrompt(): string {
    return `你是一个专业的斗地主AI玩家，正在出牌决策。

牌型说明：
- 单牌、对子、三张、三带一、三带一对
- 顺子（5张以上连续，不含2和王）
- 连对（3对以上连续）
- 飞机（2组以上连续三张）、飞机带翅膀
- 炸弹（四张同点）、王炸（双王）
- 四带二

出牌规则：
- 自由出牌时可以出任何合法牌型
- 跟牌时必须出相同牌型且更大，或者出炸弹/王炸
- 如果无法或不想出牌，选择 pass
- 自由出牌时不能 pass

策略提示：
- 地主目标：尽快出完牌，农民合作对抗地主
- 优先拆掉小牌型，保留炸弹作为威慑
- 对手剩牌少时要谨慎，防止对方一波流

请严格按照 JSON 格式输出：
{
  "action": "play" 或 "pass",
  "cards": ["♠3", "♥3", "♣3"],
  "reasoning": "简要推理"
}

cards 用花色符号+点数表示，例如：♠3 ♥5 ♦K ♣10 小王 大王。
只输出 JSON，不要输出其他内容。`;
  }

  static buildPlayUserPrompt(ctx: PlayPromptContext): string {
    const roleText = ctx.role === 'landlord' ? '地主' : '农民';

    const lastPlayText = ctx.lastPlayedCards.length > 0
      ? `上家（玩家${ctx.lastPlayedBy}）出牌：${ctx.lastPlayedCards.map(cardToString).join(' ')}（${(() => {
          const t = identifyCardType(ctx.lastPlayedCards);
          return t ? getTypeName(t.type) : '';
        })()}）`
      : '你可以自由出牌（上家pass）';

    const historyText = ctx.playHistory.slice(-10).map(p => {
      const cardsText = p.cards.length > 0 ? p.cards.map(cardToString).join(' ') : '不出';
      return `玩家${p.playerId}: ${cardsText}`;
    }).join('\n');

    const opponentText = Object.entries(ctx.opponentCounts)
      .map(([id, count]) => `玩家${id}: ${count}张`)
      .join('，');

    return `你的角色：${roleText}
你的手牌：${handToString(ctx.hand)}
你剩余 ${ctx.myRemainingCount} 张
${lastPlayText}
对手剩余牌数：${opponentText}

最近出牌历史：
${historyText || '暂无'}

请决定出什么牌。注意：跟牌时必须能打过上家。`;
  }
}
