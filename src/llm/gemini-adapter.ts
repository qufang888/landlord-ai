/**
 * Google Gemini 适配器
 */
import {
  LLMProvider, LLMRequest, LLMResponse, LLMConfig, parseJsonResponse,
} from './provider';
import { electronFetch } from '../lib/electron-http';

export class GeminiAdapter implements LLMProvider {
  name = 'gemini';
  model: string;
  private apiKey: string;
  private baseUrl: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;
  private defaultTimeout: number;

  constructor(config: LLMConfig) {
    this.model = config.model;
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
    this.defaultTemperature = config.temperature ?? 0.5;
    this.defaultMaxTokens = config.maxTokens ?? 2000;
    this.defaultTimeout = config.timeout ?? 15000;
  }

  async chat(params: LLMRequest): Promise<LLMResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), params.timeout || this.defaultTimeout);

    try {
      const body: Record<string, unknown> = {
        contents: [
          {
            role: 'user',
            parts: [{ text: `${params.systemPrompt}\n\n${params.userPrompt}` }],
          },
        ],
        generationConfig: {
          temperature: params.temperature ?? this.defaultTemperature,
          maxOutputTokens: params.maxTokens ?? this.defaultMaxTokens,
        },
      };

      // JSON 模式
      if (params.jsonSchema) {
        (body.generationConfig as Record<string, unknown>).responseMimeType = 'application/json';
      }

      const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;
      const res = await electronFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
        timeout: params.timeout || this.defaultTimeout,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini API 错误 ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const content: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

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
        usage: data.usageMetadata ? {
          inputTokens: data.usageMetadata.promptTokenCount ?? 0,
          outputTokens: data.usageMetadata.candidatesTokenCount ?? 0,
        } : undefined,
        provider: this.name,
        model: this.model,
      };
    } catch (err) {
      if (err && (err as Error).name === 'AbortError') {
        const sec = Math.round((params.timeout || this.defaultTimeout) / 1000);
        throw new Error(`Gemini 请求超时（${sec} 秒无响应），请检查网络或更换模型`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}
