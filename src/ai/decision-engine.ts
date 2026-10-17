/**
 * AI 决策引擎主类
 * 流程: 构建Prompt → 调用LLM → 解析JSON → 合法性校验 → 执行/兜底
 *
 * 错误分两类：
 * - 模型调用失败（网络/超时/鉴权/HTTP错误）：直接抛出，由上层弹窗并暂停游戏
 * - 模型返回非法内容（JSON/牌型不合法）：静默走兜底AI，连续3次后本局降级
 */
import { LLMProvider } from '../llm/provider';
import { PromptBuilder, BidPromptContext, PlayPromptContext } from './prompt-builder';
import { parseBidDecision, parsePlayDecision } from './output-parser';
import { FallbackAI } from './fallback-ai';
import { BidDecision, PlayDecision, CardTypeResult } from '../core/types';

export interface DecisionEngineConfig {
  maxConsecutiveFailures: number;  // 连续非法输出几次后永久降级
  timeout: number;                 // 单次模型调用超时（毫秒）
}

export class DecisionEngine {
  private provider: LLMProvider;
  private consecutiveFailures = 0;
  private degraded = false;
  private config: DecisionEngineConfig;

  constructor(provider: LLMProvider, config?: Partial<DecisionEngineConfig>) {
    this.provider = provider;
    this.config = {
      maxConsecutiveFailures: 3,
      timeout: 120000,
      ...config,
    };
  }

  get isDegraded(): boolean {
    return this.degraded;
  }

  resetFailures(): void {
    this.consecutiveFailures = 0;
    this.degraded = false;
  }

  setTimeout(ms: number): void {
    this.config.timeout = ms;
  }

  // ---------- 叫分决策 ----------
  async decideBid(ctx: BidPromptContext): Promise<BidDecision> {
    if (this.degraded) {
      return FallbackAI.decideBid(ctx.hand, ctx.currentHighestBid);
    }

    // 模型调用失败 → 直接抛出（弹窗暂停）
    const response = await this.provider.chat({
      systemPrompt: PromptBuilder.buildBidSystemPrompt(),
      userPrompt: PromptBuilder.buildBidUserPrompt(ctx),
      jsonSchema: { type: 'object' },
      temperature: 0.5,
      timeout: this.config.timeout,
    });

    // 输出非法 → 静默兜底
    try {
      const decision = parseBidDecision(response.content);
      this.consecutiveFailures = 0;
      return decision;
    } catch (err) {
      return this.handleInvalidOutput('叫分', err, () =>
        FallbackAI.decideBid(ctx.hand, ctx.currentHighestBid));
    }
  }

  // ---------- 出牌决策 ----------
  async decidePlay(
    ctx: PlayPromptContext,
    lastPlayType: CardTypeResult | null
  ): Promise<PlayDecision> {
    const isFreePlay = ctx.lastPlayedCards.length === 0;

    if (this.degraded) {
      return FallbackAI.decidePlay(ctx.hand, lastPlayType, isFreePlay);
    }

    // 模型调用失败 → 直接抛出（弹窗暂停）
    const response = await this.provider.chat({
      systemPrompt: PromptBuilder.buildPlaySystemPrompt(),
      userPrompt: PromptBuilder.buildPlayUserPrompt(ctx),
      jsonSchema: { type: 'object' },
      temperature: 0.6,
      timeout: this.config.timeout,
    });

    // 输出非法 → 静默兜底
    try {
      const decision = parsePlayDecision(response.content, ctx.hand, lastPlayType, isFreePlay);
      this.consecutiveFailures = 0;
      return decision;
    } catch (err) {
      return this.handleInvalidOutput('出牌', err, () =>
        FallbackAI.decidePlay(ctx.hand, lastPlayType, isFreePlay));
    }
  }

  /** 非法输出处理：计数、必要时降级，返回兜底决策 */
  private handleInvalidOutput<T>(scene: string, err: unknown, fallback: () => T): T {
    this.consecutiveFailures++;
    console.warn(`[AI] ${scene}返回非法内容 (${this.consecutiveFailures}/${this.config.maxConsecutiveFailures}):`, err);

    if (this.consecutiveFailures >= this.config.maxConsecutiveFailures) {
      this.degraded = true;
      console.warn('[AI] 连续非法输出次数过多，本局降级为规则AI');
    }
    return fallback();
  }
}
