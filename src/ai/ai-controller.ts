/**
 * AI 玩家控制器
 * 驱动所有 AI 座位自动决策，支持速度控制、暂停、逐步执行
 */
import { GameStateMachine } from '../core/state-machine';
import { DecisionEngine } from './decision-engine';
import { FallbackAI } from './fallback-ai';
import { createLLMProvider, llmConfigManager } from '../llm';
import { CardTypeResult, GamePhase } from '../core/types';
import { identifyCardType } from '../core/rules';
import { pickPhrase, ActionType } from '../game/interactions';

export interface AIThinkingInfo {
  playerId: number;
  reasoning: string;
  action: string;
  timestamp: number;
}

export interface AIControllerEvents {
  onAIThinkStart?: (playerId: number) => void;
  onAIThinkEnd?: (info: AIThinkingInfo) => void;
  onAIDegraded?: (playerId: number, degraded: boolean) => void;
  onSpeedChange?: (speed: number) => void;
  onModelError?: (playerId: number, message: string) => void;
  /** 返回 true 表示该座位由人类操控，AI 不自动行动 */
  isHumanControlled?: (playerId: number) => boolean;
  /** 互动：催促（15s 未出牌时触发） */
  onUrge?: (from: number, to: number, text: string) => void;
  /** 互动：嘲讽（打得臭时触发） */
  onTaunt?: (from: number, to: number) => void;
  /** 互动：动作（番茄/水/花） */
  onAction?: (from: number, to: number, action: ActionType) => void;
  /** 获取 AI 互动频率 0~100 */
  getInteractionFreq?: () => number;
}

export class AIController {
  private machine: GameStateMachine;
  private engines: Map<number, DecisionEngine> = new Map();
  private events: AIControllerEvents;

  private speed: number = 1;        // 1x / 2x / 4x
  private paused: boolean = false;
  private stepMode: boolean = false;
  private waitingStep: boolean = false;
  private requestTimeout: number = 120000;  // 120秒超时

  private running = false;
  private processing = false;       // 防止并发处理同一回合
  private timers: NodeJS.Timeout[] = [];
  private urgeTimer: ReturnType<typeof setTimeout> | null = null;  // 15 秒催促计时器

  constructor(machine: GameStateMachine, events: AIControllerEvents = {}) {
    this.machine = machine;
    this.events = events;
    this.buildEngines();
  }

  /** 为全部三个座位构建决策引擎（座位0仅观战模式使用） */
  private buildEngines() {
    for (const seatId of [0, 1, 2]) {
      const config = llmConfigManager.getSeatConfig(seatId);
      const provider = createLLMProvider(config);
      this.engines.set(seatId, new DecisionEngine(provider, { timeout: this.requestTimeout }));
    }
  }

  // ---------- 速度控制 ----------
  setSpeed(speed: number) {
    this.speed = speed;
    this.events.onSpeedChange?.(speed);
  }

  getSpeed() {
    return this.speed;
  }

  /** 设置 LLM 请求超时（毫秒） */
  setTimeout(ms: number) {
    this.requestTimeout = ms;
    this.engines.forEach(e => e.setTimeout(ms));
  }

  /** 重新加载某个座位的模型引擎 */
  reloadEngine(playerId: number) {
    const config = llmConfigManager.getSeatConfig(playerId);
    const provider = createLLMProvider(config);
    this.engines.set(playerId, new DecisionEngine(provider, { timeout: this.requestTimeout }));
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    if (!paused) {
      this.waitingStep = false;
      // 恢复时重新驱动当前回合（覆盖模型报错重载后继续的场景）
      this.scheduleProcess();
      this.armUrgeTimer();
    } else {
      this.clearUrgeTimer();
    }
  }

  setStepMode(step: boolean) {
    this.stepMode = step;
  }

  stepOnce() {
    if (this.waitingStep) {
      this.waitingStep = false;
      this.processNext();
    }
  }

  /**
   * 模型报错时跳过当前 AI 的本轮行动：直接用规则兜底动作（不调用 LLM），
   * 完成本回合后由状态机事件驱动后续玩家。
   */
  async forceFallbackStep() {
    if (!this.running || this.processing) return;
    const state = this.machine.getGameState();
    if (state.phase === GamePhase.SETTLING) return;

    const currentPlayer = state.players[state.currentPlayerIndex];
    if (this.events.isHumanControlled?.(currentPlayer.id)) return;

    this.processing = true;
    this.events.onAIThinkStart?.(currentPlayer.id);
    try {
      if (state.phase === GamePhase.BIDDING) {
        const d = FallbackAI.decideBid(currentPlayer.hand, state.highestBid);
        this.machine.bid(d.action, d.score);
        this.events.onAIThinkEnd?.({
          playerId: currentPlayer.id, reasoning: d.reasoning,
          action: d.action === 'bid' ? `bid:${d.score}` : 'bid:pass', timestamp: Date.now(),
        });
      } else if (state.phase === GamePhase.PLAYING) {
        const lastType = state.lastPlayedCards.length > 0
          ? identifyCardType(state.lastPlayedCards) : null;
        const d = FallbackAI.decidePlay(currentPlayer.hand, lastType, state.lastPlayedCards.length === 0);
        if (d.action === 'pass') this.machine.playCards(null);
        else this.machine.playCards(d.cards);
        this.events.onAIThinkEnd?.({
          playerId: currentPlayer.id, reasoning: d.reasoning,
          action: d.action === 'pass' ? 'play:pass' : `play:${d.cards.length}`, timestamp: Date.now(),
        });
      }
    } catch (err) {
      console.error('[AI] 跳过本轮失败:', err);
    } finally {
      this.processing = false;
    }
  }

  // ---------- 启动 / 停止 ----------
  start() {
    if (this.running) return;
    this.running = true;

    // 订阅状态机事件，回合切换时驱动 AI
    this.machine.on((event) => {
      if (event === 'turnChange' || event === 'landlordAssigned'
          || event === 'dealt' || event === 'nextBidder') {
        this.scheduleProcess();
        this.armUrgeTimer();
      }
    });

    // 初始触发
    this.scheduleProcess();
  }

  stop() {
    this.running = false;
    this.clearTimers();
  }

  private clearTimers() {
    this.timers.forEach(t => clearTimeout(t));
    this.timers = [];
  }

  private clearUrgeTimer() {
    if (this.urgeTimer) {
      clearTimeout(this.urgeTimer);
      this.urgeTimer = null;
    }
  }

  /**
   * 武装 15 秒催促计时器：
   * 当轮到"人类接管"的座位且 15 秒内未出牌，按 AI 互动频率概率触发催促
   * （音效 + AI "码字"后弹出固定话术）。AI 座位因自身秒级行动不会触发。
   */
  private armUrgeTimer() {
    this.clearUrgeTimer();
    if (!this.running || this.paused) return;
    const state = this.machine.getGameState();
    if (state.phase !== GamePhase.PLAYING && state.phase !== GamePhase.BIDDING) return;
    const current = state.players[state.currentPlayerIndex];
    if (!current) return;
    if (!this.events.isHumanControlled?.(current.id)) return;  // 仅对人类拖延的座位催促
    const freq = this.events.getInteractionFreq?.() ?? 0;
    if (freq <= 0) return;

    const stallingIndex = state.currentPlayerIndex;
    this.urgeTimer = setTimeout(() => {
      const st = this.machine.getGameState();
      // 仍是同一玩家、仍未行动 → 触发催促
      if (st.currentPlayerIndex !== stallingIndex) return;
      if (st.phase !== GamePhase.PLAYING && st.phase !== GamePhase.BIDDING) return;
      if (!this.events.isHumanControlled?.(st.players[st.currentPlayerIndex].id)) return;
      const staller = st.players[st.currentPlayerIndex];
      const urger = st.players.find(p => p.id !== staller.id && p.isAI)
        ?? st.players.find(p => p.id !== staller.id);
      if (!urger) return;
      this.events.onUrge?.(urger.id, staller.id, pickPhrase('urge'));
    }, 15000);
  }

  private scheduleProcess() {
    if (!this.running) return;
    const baseDelay = 1200 / this.speed;
    const timer = setTimeout(() => this.processNext(), baseDelay);
    this.timers.push(timer);
  }

  // ---------- 核心：处理下一个 AI 行动 ----------
  private async processNext() {
    if (!this.running || this.processing) return;

    const state = this.machine.getGameState();

    // 游戏结束
    if (state.phase === GamePhase.SETTLING) return;

    // 暂停中：等待恢复或单步
    if (this.paused) {
      this.waitingStep = true;
      return;
    }

    const currentPlayer = state.players[state.currentPlayerIndex];

    // 被人类接管的座位（含普通模式座位0）不自动行动
    if (this.events.isHumanControlled?.(currentPlayer.id)) {
      return;
    }

    const engine = this.engines.get(currentPlayer.id);
    if (!engine) return;

    this.processing = true;
    this.events.onAIThinkStart?.(currentPlayer.id);

    try {
      if (state.phase === GamePhase.BIDDING) {
        const decision = await engine.decideBid({
          hand: currentPlayer.hand,
          bidHistory: state.bidRecords,
          currentHighestBid: state.highestBid,
          playerName: currentPlayer.name,
        });

        await this.delay(400 / this.speed);
        this.machine.bid(decision.action, decision.score);

        this.events.onAIThinkEnd?.({
          playerId: currentPlayer.id,
          reasoning: decision.reasoning,
          action: decision.action === 'bid' ? `bid:${decision.score}` : 'bid:pass',
          timestamp: Date.now(),
        });

      } else if (state.phase === GamePhase.PLAYING) {
        const lastPlayType = state.lastPlayedCards.length > 0
          ? identifyCardType(state.lastPlayedCards)
          : null;

        const opponentCounts: Record<number, number> = {};
        for (const p of state.players) {
          if (p.id !== currentPlayer.id) {
            opponentCounts[p.id] = p.hand.length;
          }
        }

        const decision = await engine.decidePlay({
          hand: currentPlayer.hand,
          role: currentPlayer.role as 'landlord' | 'farmer',
          lastPlayedCards: state.lastPlayedCards,
          lastPlayedBy: state.lastPlayedBy,
          playHistory: state.playHistory,
          myRemainingCount: currentPlayer.hand.length,
          opponentCounts,
          playerId: currentPlayer.id,
        }, lastPlayType);

        await this.delay(600 / this.speed);

        if (decision.action === 'pass') {
          this.machine.playCards(null);
        } else {
          this.machine.playCards(decision.cards);
        }

        this.events.onAIThinkEnd?.({
          playerId: currentPlayer.id,
          reasoning: decision.reasoning,
          action: decision.action === 'pass' ? 'play:pass' : `play:${decision.cards.length}`,
          timestamp: Date.now(),
        });
      }

      if (engine.isDegraded) {
        this.events.onAIDegraded?.(currentPlayer.id, true);
      }

    } catch (err) {
      // 模型调用错误（网络/超时/鉴权）：弹窗并暂停；非法牌型已在决策引擎内部兜底，不会走到这里
      console.error(`[AI Controller] 玩家 ${currentPlayer.id} 决策失败:`, err);
      this.events.onModelError?.(currentPlayer.id, String(err && (err as Error).message || err));
    } finally {
      this.processing = false;
    }
  }

  // ---------- 工具 ----------
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /** 获取某个 AI 的降级状态 */
  isAIDegraded(playerId: number): boolean {
    return this.engines.get(playerId)?.isDegraded ?? false;
  }
}
