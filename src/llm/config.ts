/**
 * LLM 配置管理
 * 每个 AI 座位独立配置，持久化到本地
 */
import { LLMConfig } from './provider';

export interface SeatConfig {
  seatId: number;  // 座位 1 / 2（0 是人类）
  config: LLMConfig;
}

export interface AppLLMConfig {
  seats: Record<number, LLMConfig>;  // seatId -> config
  defaultConfig: LLMConfig;
}

const DEFAULT_CONFIG: LLMConfig = {
  providerType: 'openai_native',
  model: '',
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  temperature: 0.5,
  maxTokens: 2000,
  timeout: 120000,
};

export const PRESET_CONFIGS = {
  ollama: {
    providerType: 'openai_compatible' as const,
    model: 'llama3.1',
    apiKey: 'ollama',
    baseUrl: 'http://localhost:11434/v1',
    temperature: 0.5,
    maxTokens: 2000,
    timeout: 120000,
  },
  vllm: {
    providerType: 'openai_compatible' as const,
    model: 'Qwen/Qwen2.5-7B-Instruct',
    apiKey: 'vllm',
    baseUrl: 'http://localhost:8000/v1',
    temperature: 0.5,
    maxTokens: 2000,
    timeout: 120000,
  },
};

export class LLMConfigManager {
  private config: AppLLMConfig;
  private storageKey = 'landlord-ai-llm-config';

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): AppLLMConfig {
    try {
      // 浏览器环境用 localStorage
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
          return JSON.parse(saved);
        }
      }
    } catch {
      // ignore
    }

    return {
      seats: {
        0: { ...DEFAULT_CONFIG },
        1: { ...DEFAULT_CONFIG },
        2: { ...DEFAULT_CONFIG },
      },
      defaultConfig: { ...DEFAULT_CONFIG },
    };
  }

  save(): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.storageKey, JSON.stringify(this.config));
      }
    } catch {
      // ignore
    }
  }

  getSeatConfig(seatId: number): LLMConfig {
    return this.config.seats[seatId] || this.config.defaultConfig;
  }

  setSeatConfig(seatId: number, config: LLMConfig): void {
    this.config.seats[seatId] = config;
    this.save();
  }

  getAllConfigs(): AppLLMConfig {
    return this.config;
  }
}
