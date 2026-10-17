/**
 * 弈牌AI - 斗地主游戏核心类型定义
 * 纯逻辑，零 UI 依赖
 */

// ---------- 牌 ----------
export type Suit = 'spade' | 'heart' | 'club' | 'diamond' | 'joker';

/**
 * rank 范围: 3~17
 * 3=3, 4=4, ..., 10=10, 11=J, 12=Q, 13=K, 14=A, 15=2, 16=小王, 17=大王
 */
export interface Card {
  suit: Suit;
  rank: number;
}

export const RANK_NAMES: Record<number, string> = {
  3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
  11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2', 16: '小王', 17: '大王',
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  spade: '♠',
  heart: '♥',
  club: '♣',
  diamond: '♦',
  joker: '',
};

// ---------- 牌型 ----------
export enum CardType {
  Rocket = 'rocket',           // 火箭（双王）
  Bomb = 'bomb',               // 炸弹（四张同点）
  Single = 'single',           // 单牌
  Pair = 'pair',               // 对子
  Triple = 'triple',           // 三张
  TripleWithOne = 'triple_with_one',     // 三带一
  TripleWithPair = 'triple_with_pair',  // 三带对
  Straight = 'straight',       // 顺子（≥5张连续）
  DoubleStraight = 'double_straight',   // 连对（≥3对连续）
  Plane = 'plane',             // 飞机（≥2组连续三张）
  PlaneWithWings = 'plane_with_wings',  // 飞机带翅膀
  FourWithTwoSingles = 'four_with_two_singles', // 四带二单
  FourWithTwoPairs = 'four_with_two_pairs',     // 四带二对
  Pass = 'pass',               // 不出
}

export interface CardTypeResult {
  type: CardType;
  /** 用于比较大小的主牌点（如顺子取最大那张，飞机取最大三张的最小那张） */
  mainRank: number;
  /** 牌张数量（用于同型比较） */
  length: number;
  /** 主牌组的 rank 列表（如连对的所有对子 rank） */
  mainRanks: number[];
}

// ---------- 玩家 ----------
export type PlayerRole = 'landlord' | 'farmer';

export interface Player {
  id: number;           // 0=人类, 1/2=AI
  name: string;
  isAI: boolean;
  role: PlayerRole | null;
  hand: Card[];         // 手牌
  playedCards: Card[];  // 已打出的牌
}

// ---------- 叫分 ----------
export type BidAction = 'bid' | 'pass';

export interface BidRecord {
  playerId: number;
  action: BidAction;
  score: number;  // 0=不叫
}

// ---------- 出牌 ----------
export interface PlayRecord {
  playerId: number;
  cards: Card[];
  type: CardType;
  reasoning?: string;  // AI 的推理过程
  timestamp: number;
}

// ---------- 游戏状态 ----------
export enum GamePhase {
  DEALING = 'dealing',
  BIDDING = 'bidding',
  PLAYING = 'playing',
  SETTLING = 'settling',
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  bottomCards: Card[];       // 3 张底牌
  currentPlayerIndex: number; // 当前行动玩家
  bidRecords: BidRecord[];
  highestBid: number;
  landlordId: number | null;
  playHistory: PlayRecord[];
  lastPlayedCards: Card[];    // 上一家出的牌（用于跟牌判断）
  lastPlayedBy: number;       // 上一家出牌者
  multiplier: number;         // 当前总倍数
  bombCount: number;          // 炸弹数量（用于计分）
  spring: boolean;            // 春天
  antiSpring: boolean;        // 反春天
  landlordPlayedFirst: boolean; // 地主是否已出过第一手牌
  finishedPlayers: number[];  // 已出完牌的玩家顺序
}

// ---------- 计分 ----------
export interface SettlementResult {
  landlordScore: number;   // 地主最终得分
  farmerScore: number;     // 每个农民得分（正负）
  baseScore: number;
  bidMultiplier: number;
  bombMultiplier: number;
  springMultiplier: number;
  totalMultiplier: number;
  reason: string;
}

// ---------- LLM 决策 ----------
export interface BidDecision {
  action: 'bid' | 'pass';
  score: number;
  reasoning: string;
}

export interface PlayDecision {
  action: 'play' | 'pass';
  cards: Card[];
  reasoning: string;
}
