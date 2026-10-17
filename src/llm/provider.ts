/**
 * LLM Provider 统一接口定义
 */

export interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;
  jsonSchema?: object;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export interface StreamChunk {
  type: 'text' | 'done' | 'error';
  content?: string;
  error?: string;
}

export interface LLMResponse {
  content: string;
  parsed?: object;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  provider: string;
  model: string;
}

export interface LLMProvider {
  name: string;
  model: string;
  chat(params: LLMRequest): Promise<LLMResponse>;
  chatStream?(params: LLMRequest): AsyncIterable<StreamChunk>;
}

export interface LLMConfig {
  providerType: 'openai_native' | 'openai_compatible' | 'claude_native' | 'claude_compatible' | 'gemini';
  model: string;
  apiKey: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

/** 解析 JSON 响应（处理 markdown 包裹等情况） */
export function parseJsonResponse<T = unknown>(content: string): T {
  // 尝试直接解析
  try {
    return JSON.parse(content) as T;
  } catch {
    // 尝试提取 ```json ... ``` 块
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim()) as T;
      } catch {
        // continue
      }
    }

    // 尝试找到第一个 { 到最后一个 }
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(content.slice(firstBrace, lastBrace + 1)) as T;
      } catch {
        // continue
      }
    }

    throw new Error(`无法解析 JSON 响应: ${content.slice(0, 200)}`);
  }
}
