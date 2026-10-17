/**
 * LLM Provider 工厂
 */
import { LLMProvider, LLMConfig } from './provider';
import { OpenAIAdapter } from './openai-adapter';
import { ClaudeAdapter } from './claude-adapter';
import { GeminiAdapter } from './gemini-adapter';
import { LLMConfigManager } from './config';

export * from './provider';
export * from './openai-adapter';
export * from './claude-adapter';
export * from './gemini-adapter';
export * from './config';

/** 根据配置创建 Provider 实例 */
export function createLLMProvider(config: LLMConfig): LLMProvider {
  switch (config.providerType) {
    case 'openai_native':
      return new OpenAIAdapter({ ...config, baseUrl: config.baseUrl || 'https://api.openai.com/v1' });
    case 'openai_compatible':
      return new OpenAIAdapter(config);
    case 'claude_native':
      return new ClaudeAdapter({ ...config, baseUrl: config.baseUrl || 'https://api.anthropic.com/v1' });
    case 'claude_compatible':
      return new ClaudeAdapter(config);
    case 'gemini':
      return new GeminiAdapter(config);
    default:
      throw new Error(`未知的 Provider 类型: ${config.providerType}`);
  }
}

/** 全局配置管理器单例 */
export const llmConfigManager = new LLMConfigManager();
