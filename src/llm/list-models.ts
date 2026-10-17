/**
 * 从服务器获取可用模型列表
 * 支持 OpenAI 原生/兼容、Claude 原生/兼容、Gemini
 */
import { LLMConfig } from './provider';
import { createLLMProvider } from './index';
import { electronFetch } from '../lib/electron-http';

/** 测试连接：发送一条最小请求，验证鉴权与连通性 */
export async function testConnection(config: LLMConfig): Promise<{ ok: boolean; message: string }> {
  const provider = createLLMProvider(config);
  const res = await provider.chat({
    systemPrompt: 'ping',
    userPrompt: 'Reply with the single word: ok',
    maxTokens: 5,
    temperature: 0,
    timeout: 12000,
  });
  return { ok: true, message: res.content?.slice(0, 50) || 'ok' };
}

export async function fetchModels(config: LLMConfig): Promise<string[]> {
  const { providerType, apiKey, baseUrl } = config;
  const timeout = 15000;

  // OpenAI 原生 + 兼容（OpenAI 协议）
    if (providerType === 'openai_native' || providerType === 'openai_compatible') {
      const url = `${baseUrl}/models`.replace(/\/+$/, '');
      const res = await electronFetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const data = await res.json();
      const list: any[] = data.data || data.models || [];
      return list.map(m => m.id || m.name || m.model).filter(Boolean).sort();
    }

    // Claude 原生 + 兼容（Anthropic 协议，兼容端点使用自定义 baseUrl）
    if (providerType === 'claude_native' || providerType === 'claude_compatible') {
      const base = (baseUrl || 'https://api.anthropic.com/v1').replace(/\/+$/, '');
      const url = `${base}/models`;
      const res = await electronFetch(url, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        timeout,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const data = await res.json();
      const list: any[] = data.data || [];
      return list.map(m => m.id || m.display_name).filter(Boolean).sort();
    }

    // Gemini 原生
    if (providerType === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      const res = await electronFetch(url, { timeout });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const data = await res.json();
      const list: any[] = data.models || [];
      return list
        .map(m => m.name?.replace('models/', ''))
        .filter(n => n && (n.includes('gemini') || n.includes('flash') || n.includes('pro')))
        .sort();
    }

    return [];
}
