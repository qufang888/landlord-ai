/**
 * Claude 适配器（Anthropic 原生 API）
 */
import {
  LLMProvider, LLMRequest, LLMResponse, LLMConfig, parseJsonResponse,
} from './provider';
import { electronFetch } from '../lib/electron-http';

export class ClaudeAdapter implements LLMProvider {
  name = 'claude';
  model: string;
  private apiKey: string;
  private baseUrl: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;
  private defaultTimeout: number;

  constructor(config: LLMConfig) {
    this.model = config.model;
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || 'https://api.anthropic.com/v1').replace(/\/+$/, '');
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
        system: params.systemPrompt,
        messages: [
          { role: 'user', content: params.userPrompt },
        ],
        temperature: params.temperature ?? this.defaultTemperature,
        max_tokens: params.maxTokens ?? this.defaultMaxTokens,
      };

      const res = await electronFetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
        timeout: params.timeout || this.defaultTimeout,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Claude API 错误 ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const content: string = data.content?.[0]?.text ?? '';

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
          inputTokens: data.usage.input_tokens ?? 0,
          outputTokens: data.usage.output_tokens ?? 0,
        } : undefined,
        provider: this.name,
        model: this.model,
      };
    } catch (err) {
      if (err && (err as Error).name === 'AbortError') {
        const sec = Math.round((params.timeout || this.defaultTimeout) / 1000);
        throw new Error(`Claude 请求超时（${sec} 秒无响应），请检查网络、Base URL 或更换模型`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}
