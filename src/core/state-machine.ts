/**
 * 游戏状态机
 * 流程: DEALING → BIDDING → PLAYING → SETTLING
 */
import {
  Card, GameState, GamePhase, Player, PlayRecord,
  BidRecord, CardType, CardTypeResult, SettlementResult,
} from './types';
import { createDeck, dealCards, sortHand } from './deck';
import { identifyCardType, canBeat } from './rules';
import { Scorer } from './scorer';

type EventCallback = (event: string, data: unknown) => void;

export class GameStateMachine {
  private state: GameState;
  private listeners: EventCallback[] = [];
  /** 禁止成为地主的玩家（人类农民模式：人类固定为农民） */
  private bannedLandlordIds: number[] = [];

  constructor(playerNames: string[] = ['玩家', 'AI-下家', 'AI-上家']) {
    this.state = this.initState(playerNames);
  }

  /** 设置某个玩家是否为 AI（观战模式下座位0也是AI） */
  setPlayerAI(playerId: number, isAI: boolean): void {
    const player = this.state.players.find(p => p.id === playerId);
    if (player) player.isAI = isAI;
  }

  /** 设置禁止成为地主的玩家（人类固定农民模式下传入 [0]） */
  setBannedLandlord(ids: number[]): void {
    this.bannedLandlordIds = ids;
  }

  private initState(playerNames: string[]): GameState {
    const players: Player[] = playerNames.map((name, i) => ({
      id: i,
      name,
      isAI: i !== 0,
      role: null,
      hand: [],
      playedCards: [],
    }));

    return {
      phase: GamePhase.DEALING,
      players,
      bottomCards: [],
      currentPlayerIndex: 0,
      bidRecords: [],
      highestBid: 0,
      landlordId: null,
      playHistory: [],
      lastPlayedCards: [],
      lastPlayedBy: -1,
      multiplier: 1,
      bombCount: 0,
      spring: false,
      antiSpring: false,
      landlordPlayedFirst: false,
      finishedPlayers: [],
    };
  }

  // ---------- 事件订阅 ----------
  on(callback: EventCallback): void {
    this.listeners.push(callback);
  }

  private emit(event: string, data: unknown): void {
    this.listeners.forEach(cb => cb(event, data));
  }

  // ---------- 获取状态快照 ----------
  getGameState(): GameState {
    return JSON.parse(JSON.stringify(this.state));
  }

  // ---------- 发牌 ----------
  deal(): void {
    const deck = createDeck();
    const { hands, bottomCards } = dealCards(deck);

    this.state.players.forEach((p, i) => {
      p.hand = hands[i];
      p.playedCards = [];
    });
    this.state.bottomCards = bottomCards;
    this.state.phase = GamePhase.BIDDING;
    this.state.currentPlayerIndex = Math.floor(Math.random() * 3); // 随机首家叫分

    this.emit('dealt', { bottomCards, firstBidder: this.state.currentPlayerIndex });
  }

  // ---------- 叫分 ----------
  bid(action: 'bid' | 'pass', score: number = 0): BidRecord | null {
    if (this.state.phase !== GamePhase.BIDDING) return null;

    const playerIdx = this.state.currentPlayerIndex;
    const currentId = this.state.players[playerIdx].id;

    // 人类固定农民模式：被禁止当地主的玩家强制不叫
    if (this.bannedLandlordIds.includes(currentId)) {
      action = 'pass';
      score = 0;
    }

    const record: BidRecord = {
      playerId: currentId,
      action,
      score: action === 'bid' ? score : 0,
    };

    // 校验：叫分必须比当前最高分高
    if (action === 'bid' && score <= this.state.highestBid) {
      throw new Error(`叫分${score}必须高于当前最高分${this.state.highestBid}`);
    }

    this.state.bidRecords.push(record);

    if (action === 'bid') {
      this.state.highestBid = score;
    }

    this.emit('bid', record);

    // 检查叫分是否结束
    this.checkBidEnd();

    return record;
  }

  private checkBidEnd(): void {
    const totalBids = this.state.bidRecords.length;
    const lastRecord = this.state.bidRecords[totalBids - 1];

    // 有人叫 3 分，立即结束，叫3分者为地主
    if (lastRecord.action === 'bid' && lastRecord.score === 3) {
      this.state.highestBid = 3;
      this.assignLandlord(lastRecord.playerId);
      return;
    }

    // 三家都已叫过一轮
    if (totalBids >= 3) {
      if (this.state.highestBid === 0) {
        // 三家都不叫：按叫分顺序选第一个允许成为地主的玩家强制叫 1 分
        const forced = this.state.bidRecords
          .map(r => r.playerId)
          .find(id => !this.bannedLandlordIds.includes(id)) ?? this.state.bidRecords[0].playerId;
        this.state.highestBid = 1;
        this.assignLandlord(forced);
        return;
      }
      // 地主 = 叫出最高分的玩家
      const highest = this.state.bidRecords
        .filter(r => r.action === 'bid')
        .reduce((a, b) => (b.score > a.score ? b : a));
      this.assignLandlord(highest.playerId);
      return;
    }

    // 下一家叫分
    this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % 3;
    this.emit('nextBidder', { playerId: this.state.players[this.state.currentPlayerIndex].id });
  }

  private assignLandlord(landlordId: number): void {
    this.state.landlordId = landlordId;
    // 分配角色
    this.state.players.forEach(p => {
      p.role = p.id === landlordId ? 'landlord' : 'farmer';
    });

    // 底牌给地主
    const landlord = this.state.players.find(p => p.id === landlordId)!;
    landlord.hand = sortHand([...landlord.hand, ...this.state.bottomCards]);

    this.state.phase = GamePhase.PLAYING;
    this.state.currentPlayerIndex = landlordId; // 地主先出牌
    this.state.multiplier = this.state.highestBid;

    this.emit('landlordAssigned', {
      landlordId,
      bottomCards: this.state.bottomCards,
    });
  }

  // ---------- 出牌 ----------
  playCards(cards: Card[] | null, reasoning?: string): PlayRecord {
    if (this.state.phase !== GamePhase.PLAYING) {
      throw new Error('当前不在出牌阶段');
    }

    const playerIdx = this.state.currentPlayerIndex;
    const player = this.state.players[playerIdx];

    // Pass 情况
    if (cards === null || cards.length === 0) {
      // 自由出牌时不能 pass
      if (this.state.lastPlayedBy === player.id || this.state.lastPlayedBy === -1) {
        if (this.state.lastPlayedCards.length === 0) {
          throw new Error('自由出牌时不能不出');
        }
      }

      const record: PlayRecord = {
        playerId: player.id,
        cards: [],
        type: CardType.Pass,
        reasoning,
        timestamp: Date.now(),
      };
      this.state.playHistory.push(record);
      this.emit('play', record);

      // 轮转到下一家
      this.nextPlayer();
      return record;
    }

    // 校验牌是否在手牌中
    const handCopy = [...player.hand];
    for (const card of cards) {
      const idx = handCopy.findIndex(c => c.suit === card.suit && c.rank === card.rank);
      if (idx === -1) {
        throw new Error(`牌 ${card.suit}${card.rank} 不在手牌中`);
      }
      handCopy.splice(idx, 1);
    }

    // 识别牌型
    const typeResult = identifyCardType(cards);
    if (!typeResult) {
      throw new Error('非法牌型');
    }

    // 校验能否打过上家
    if (this.state.lastPlayedCards.length > 0 && this.state.lastPlayedBy !== player.id) {
      const lastType = identifyCardType(this.state.lastPlayedCards);
      if (lastType && !canBeat(typeResult, lastType)) {
        throw new Error('出牌不能打过上家');
      }
    }

    // 从手牌移除
    for (const card of cards) {
      const idx = player.hand.findIndex(c => c.suit === card.suit && c.rank === card.rank);
      if (idx !== -1) player.hand.splice(idx, 1);
    }

    // 记录出牌
    const record: PlayRecord = {
      playerId: player.id,
      cards,
      type: typeResult.type,
      reasoning,
      timestamp: Date.now(),
    };
    this.state.playHistory.push(record);
    this.state.lastPlayedCards = cards;
    this.state.lastPlayedBy = player.id;

    // 炸弹/火箭翻倍
    if (typeResult.type === CardType.Bomb) {
      this.state.multiplier *= 2;
      this.state.bombCount++;
      this.emit('bomb', { playerId: player.id });
    } else if (typeResult.type === CardType.Rocket) {
      this.state.multiplier *= 4;
      this.state.bombCount++;
      this.emit('rocket', { playerId: player.id });
    }

    // 地主是否已出过第一手
    if (player.role === 'landlord' && !this.state.landlordPlayedFirst) {
      this.state.landlordPlayedFirst = true;
    }

    this.emit('play', record);

    // 检查是否出完牌
    if (player.hand.length === 0) {
      this.state.finishedPlayers.push(player.id);
      this.checkGameEnd();
    } else {
      this.nextPlayer();
    }

    return record;
  }

  private nextPlayer(): void {
    this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % 3;

    // 如果一圈都 pass 了（即回到出牌者本人），清空 lastPlayedCards
    const playerId = this.state.players[this.state.currentPlayerIndex].id;
    if (playerId === this.state.lastPlayedBy) {
      this.state.lastPlayedCards = [];
      this.state.lastPlayedBy = -1;
    }

    this.emit('turnChange', { playerId });
  }

  private checkGameEnd(): void {
    if (this.state.finishedPlayers.length === 0) return;

    const winnerId = this.state.finishedPlayers[0];
    const winner = this.state.players.find(p => p.id === winnerId)!;

    // 春天/反春天判断
    this.state.spring = winner.role === 'landlord'
      ? Scorer.checkSpring(winnerId, this.state.playHistory)
      : false;
    this.state.antiSpring = winner.role !== 'landlord'
      ? Scorer.checkAntiSpring(this.state.landlordId!, this.state.playHistory)
      : false;

    // 计算炸弹倍数
    const playTypes = this.state.playHistory.map(p => p.type);
    const bombMult = Scorer.calculateBombMultiplier(playTypes);

    // 最终计分
    const result = Scorer.calculate({
      baseScore: 1,
      bidScore: this.state.highestBid,
      bombMultiplier: bombMult,
      spring: this.state.spring,
      antiSpring: this.state.antiSpring,
    });

    this.state.phase = GamePhase.SETTLING;
    this.emit('gameOver', { winnerId, result });
  }

  // ---------- 工具方法 ----------
  getCurrentPlayer(): Player {
    return this.state.players[this.state.currentPlayerIndex];
  }

  getPlayerById(id: number): Player | undefined {
    return this.state.players.find(p => p.id === id);
  }

  /** 获取玩家手牌中所有可出的牌型组合（用于兜底AI） */
  static getAllValidPlays(hand: Card[], lastPlay: CardTypeResult | null): Card[][] {
    // 简化版：返回所有单牌、对子、三张、炸弹
    // 完整实现需要枚举所有组合，这里先做基础版
    const results: Card[][] = [];

    // 按 rank 分组
    const byRank = new Map<number, Card[]>();
    for (const c of hand) {
      if (!byRank.has(c.rank)) byRank.set(c.rank, []);
      byRank.get(c.rank)!.push(c);
    }

    for (const [, cards] of byRank) {
      // 单牌
      if (cards.length >= 1) results.push([cards[0]]);
      // 对子
      if (cards.length >= 2) results.push([cards[0], cards[1]]);
      // 三张
      if (cards.length >= 3) results.push([cards[0], cards[1], cards[2]]);
      // 炸弹
      if (cards.length === 4) results.push([...cards]);
    }

    return results;
  }
}
