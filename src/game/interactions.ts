/**
 * 互动系统 —— 领域层
 *
 * 严格还原《欢乐斗地主》的「表情 / 文字表情 / 互动道具」体系：
 * - 交流只能使用「固定的几个话语」（urge / taunt / praise 话术库），绝无自由文本聊天。
 * - 互动动作只有三种：扔番茄 🍅、倒水桶 🪣、送鲜花 🌹（对应欢乐斗地主的三种互动物品）。
 * 话术与动作均取自《欢乐斗地主》已知的公开表情/文字表情集合，不自行杜撰。
 */
import { Card, CardType, PlayRecord, CardTypeResult } from '../core/types';
import { identifyCardType, canBeat } from '../core/rules';
import { GameStateMachine } from '../core/state-machine';

export type InteractionKind = 'phrase' | 'action';
export type ActionType = 'tomato' | 'water' | 'flower';
export type PhraseCategory = 'urge' | 'taunt' | 'praise';

export interface InteractionEvent {
  id: string;
  from: number;       // 发起座位（-1 表示系统/环境）
  to: number;         // 目标座位
  kind: InteractionKind;
  category?: PhraseCategory;   // phrase 专用
  action?: ActionType;         // action 专用
  text?: string;               // 话术文本
  ts: number;
}

/** 固定话术库：AI 与玩家之间、AI 之间只能使用这些话术交流（参考欢乐斗地主文字表情） */
export const PHRASE_BANK: Record<PhraseCategory, string[]> = {
  urge: [
    '快一点呀',
    '该你出牌啦',
    '快点吧，我等到花儿都谢了',
    '别愣着呀',
    '轮到你咯，麻利点',
  ],
  taunt: [
    '你的牌打得也太臭了',
    '这牌也能打出来？',
    '要不起就别勉强嘛',
    '你这操作我看不懂',
    '就这？',
    '赶紧出吧，别磨蹭',
  ],
  praise: [
    '这把打得漂亮',
    '不愧是你',
    '好牌！',
    '配合得不错',
    '可以可以，有点东西',
  ],
};

/** 三种互动动作（严格对应欢乐斗地主：扔番茄 / 倒水 / 送花） */
export const ACTION_META: Record<ActionType, { label: string; emoji: string; sentiment: 'negative' | 'positive'; sound: string }> = {
  tomato: { label: '扔番茄', emoji: '🍅', sentiment: 'negative', sound: 'tomato' },
  water: { label: '倒水桶', emoji: '🪣', sentiment: 'negative', sound: 'water' },
  flower: { label: '送鲜花', emoji: '🌹', sentiment: 'positive', sound: 'flower' },
};

export function pickPhrase(cat: PhraseCategory): string {
  const arr = PHRASE_BANK[cat];
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomNegativeAction(): ActionType {
  return Math.random() < 0.5 ? 'tomato' : 'water';
}

let _seq = 0;
export function newInteractionId(): string {
  _seq += 1;
  return `it_${Date.now().toString(36)}_${_seq}`;
}

export interface BadPlayResult {
  bad: boolean;
  reason?: 'missed_beat' | 'waste_bomb';
}

/**
 * 判定某次出牌是否「打得臭」。
 * - missed_beat：面对非炸弹的小牌领出，明明能压却选择了不出（pass）。
 * - waste_bomb：用炸弹/王炸去压一个很小的牌（明显浪费）。
 * 仅在较确定的情形下判负，避免误伤。
 */
export function detectBadPlay(
  hand: Card[],
  record: PlayRecord,
  beatenCards: Card[] | null,
  beatenType: CardTypeResult | null,
): BadPlayResult {
  if (record.type === CardType.Pass) {
    if (beatenType && beatenType.type !== 'bomb' && beatenType.type !== 'rocket') {
      const mainRank = (beatenType as any).mainRank ?? 99;
      if (mainRank <= 14) {
        const candidates = GameStateMachine.getAllValidPlays(hand, beatenType);
        for (const cand of candidates) {
          const ct = identifyCardType(cand);
          if (ct && canBeat(ct, beatenType)) {
            return { bad: true, reason: 'missed_beat' };
          }
        }
      }
    }
    return { bad: false };
  }

  if (record.type === CardType.Bomb || record.type === CardType.Rocket) {
    if (beatenType && beatenType.type !== 'bomb' && beatenType.type !== 'rocket') {
      const mainRank = (beatenType as any).mainRank ?? 99;
      // 用炸弹去压一张很小的牌（单/对/三，点数 <= 10），视为浪费
      if (mainRank <= 10) {
        return { bad: true, reason: 'waste_bomb' };
      }
    }
  }

  return { bad: false };
}
