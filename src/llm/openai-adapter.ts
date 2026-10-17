/**
 * OpenAI 兼容适配器
 * 支持 OpenAI 原生 + Ollama / vLLM / LM Studio 等 OpenAI 兼容服务
 */
import {
  LLMProvider, LLMRequest, LLMResponse, LLMConfig, parseJsonResponse,
} from './provider';

export class OpenAIAdapter implements LLMProvider {
  name = 'openai';
  model: string;
  private apiKey: string;
  private baseUrl: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;
  private defaultTimeout: number;

  constructor(config: LLMConfig) {
    this.model = config.model;
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
    this.defaultTemperature = config.temperature ?? 0.5;
    this.defaultMaxTokens = config.maxTokens ?? 2000;
    this.defaultTimeout = config.timeout ?? 15000;
  }

  async chat(params: LLMRequest): Promise<LLMResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), params.timeout || this.defaultTimeout);

    try {
      const body: Record<string, unknown> = {
        model: this.model,
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userPrompt },
        ],
        temperature: params.temperature ?? this.defaultTemperature,
        max_tokens: params.maxTokens ?? this.defaultMaxTokens,
      };

      // 启用 JSON 模式
      if (params.jsonSchema) {
        body.response_format = { type: 'json_object' };
      }

      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenAI API 错误 ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const content: string = data.choices?.[0]?.message?.content ?? '';

      let parsed: object | undefined;
      if (params.jsonSchema) {
        try {
          parsed = parseJsonResponse(content);
        } catch {
          parsed = undefined;
        }
      }

      return {
        content,
        parsed,
        usage: data.usage ? {
          inputTokens: data.usage.prompt_tokens ?? 0,
          outputTokens: data.usage.completion_tokens ?? 0,
        } : undefined,
        provider: this.name,
        model: this.model,
      };
    } catch (err) {
      if (err && (err as Error).name === 'AbortError') {
        const sec = Math.round((params.timeout || this.defaultTimeout) / 1000);
        throw new Error(`OpenAI 请求超时（${sec} 秒无响应），请检查网络、Base URL 或更换模型`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}
