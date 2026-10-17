/**
 * 模型配置中心 —— 数据层
 * 支持保存"许多"模型配置，按 分类 / 标签 归类，并支持关键词搜索快速定位。
 * 与按座位使用的 LLMConfig 解耦：配置中心是"库"，可把任意配置指派给某个 AI 座位。
 */
import { LLMConfig } from './provider';

export type ModelProviderType = LLMConfig['providerType'];

export interface ModelProfile {
  id: string;
  name: string;            // 配置名称（如「GPT-4o 生产」）
  category: string;        // 分类（如 OpenAI / 本地 / Claude / Gemini / 自定义）
  tags: string[];          // 标签（如 快 / 便宜 / 强 / 国产 / 长上下文）
  providerType: ModelProviderType;
  model: string;
  apiKey: string;
  baseUrl: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
  notes?: string;          // 备注
  createdAt: number;
  updatedAt: number;
}

export interface ProfileFilter {
  query?: string;          // 关键词（匹配名称/备注/模型名）
  category?: string;       // 分类筛选
  tag?: string;            // 标签筛选
}

const STORAGE_KEY = 'landlord-ai-model-profiles';

function uid(): string {
  return 'mp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** 默认内置配置（首次启动时注入，便于直接使用） */
function seedProfiles(): ModelProfile[] {
  const now = Date.now();
  const mk = (p: Partial<ModelProfile> & Pick<ModelProfile, 'name' | 'providerType' | 'model'>): ModelProfile => ({
    id: uid(),
    category: '未分类',
    tags: [],
    apiKey: '',
    baseUrl: '',
    temperature: 0.5,
    maxTokens: 2000,
    timeout: 120000,
    createdAt: now,
    updatedAt: now,
    ...p,
  });
  return [
    mk({ name: 'GPT-4o', category: 'OpenAI', tags: ['强', '通用'], providerType: 'openai_native', model: 'gpt-4o', baseUrl: 'https://api.openai.com/v1', notes: 'OpenAI 旗舰多模态模型' }),
    mk({ name: 'Claude 3.5 Sonnet', category: 'Claude', tags: ['强', '长上下文'], providerType: 'claude_native', model: 'claude-3-5-sonnet-20241022', baseUrl: 'https://api.anthropic.com/v1', notes: 'Anthropic 强推理模型' }),
    mk({ name: 'Gemini 1.5 Pro', category: 'Gemini', tags: ['强', '长上下文'], providerType: 'gemini', model: 'gemini-1.5-pro', notes: 'Google 长上下文模型' }),
    mk({ name: 'Ollama llama3.1', category: '本地', tags: ['免费', '本地'], providerType: 'openai_compatible', model: 'llama3.1', baseUrl: 'http://localhost:11434/v1', apiKey: 'ollama', notes: '本地部署，无需联网' }),
    mk({ name: 'vLLM Qwen2.5', category: '本地', tags: ['免费', '国产'], providerType: 'openai_compatible', model: 'Qwen/Qwen2.5-7B-Instruct', baseUrl: 'http://localhost:8000/v1', apiKey: 'vllm', notes: '国产开源模型' }),
  ];
}

export class ModelProfileStore {
  private profiles: ModelProfile[] = [];

  constructor() {
    this.profiles = this.load();
    if (this.profiles.length === 0) {
      this.profiles = seedProfiles();
      this.persist();
    }
  }

  private load(): ModelProfile[] {
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const arr = JSON.parse(raw) as ModelProfile[];
          if (Array.isArray(arr)) return arr;
        }
      }
    } catch { /* ignore */ }
    return [];
  }

  private persist(): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profiles));
      }
    } catch { /* ignore */ }
  }

  getAll(): ModelProfile[] {
    return [...this.profiles].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  getById(id: string): ModelProfile | undefined {
    return this.profiles.find(p => p.id === id);
  }

  /** 所有出现过的分类（去重） */
  getCategories(): string[] {
    return Array.from(new Set(this.profiles.map(p => p.category))).sort();
  }

  /** 所有出现过的标签（去重） */
  getTags(): string[] {
    const set = new Set<string>();
    this.profiles.forEach(p => p.tags.forEach(t => set.add(t)));
    return Array.from(set).sort();
  }

  add(draft: Omit<ModelProfile, 'id' | 'createdAt' | 'updatedAt'>): ModelProfile {
    const now = Date.now();
    const profile: ModelProfile = { ...draft, id: uid(), createdAt: now, updatedAt: now };
    this.profiles.push(profile);
    this.persist();
    return profile;
  }

  update(id: string, patch: Partial<ModelProfile>): ModelProfile | undefined {
    const idx = this.profiles.findIndex(p => p.id === id);
    if (idx < 0) return undefined;
    this.profiles[idx] = { ...this.profiles[idx], ...patch, id, updatedAt: Date.now() };
    this.persist();
    return this.profiles[idx];
  }

  remove(id: string): void {
    this.profiles = this.profiles.filter(p => p.id !== id);
    this.persist();
  }

  /** 搜索 / 过滤：关键词匹配名称/备注/模型名；可按分类、标签进一步筛选 */
  search(filter: ProfileFilter = {}): ModelProfile[] {
    const q = (filter.query || '').trim().toLowerCase();
    return this.getAll().filter(p => {
      if (filter.category && p.category !== filter.category) return false;
      if (filter.tag && !p.tags.includes(filter.tag)) return false;
      if (q) {
        const hay = `${p.name} ${p.model} ${p.notes || ''} ${p.category} ${p.tags.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  /** 把配置转为引擎使用的 LLMConfig */
  toLLMConfig(p: ModelProfile): LLMConfig {
    return {
      providerType: p.providerType,
      model: p.model,
      apiKey: p.apiKey,
      baseUrl: p.baseUrl,
      temperature: p.temperature,
      maxTokens: p.maxTokens,
      timeout: p.timeout,
    };
  }
}

export const modelProfileStore = new ModelProfileStore();
