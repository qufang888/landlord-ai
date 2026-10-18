import { useState, useMemo } from 'react';
import { useGameStore } from '../../store/game-store';
import { useTranslation } from '../../i18n';
import { modelProfileStore, ModelProfile, ModelProviderType } from '../../llm/model-profiles';
import { llmConfigManager } from '../../llm';
import ApiKeyField from '../components/ApiKeyField';

type Draft = Omit<ModelProfile, 'id' | 'createdAt' | 'updatedAt'>;

const PROVIDER_I18N_KEYS: Record<ModelProviderType, string> = {
  openai_native: 'openaiNative',
  openai_compatible: 'openaiCompatible',
  claude_native: 'claudeNative',
  claude_compatible: 'claudeCompatible',
  gemini: 'geminiNative',
};

function emptyDraft(t: (k: string) => string): Draft {
  return {
    name: '', category: t('categoryDefault'), tags: [], providerType: 'openai_native',
    model: '', apiKey: '', baseUrl: 'https://api.openai.com/v1',
    temperature: 0.5, maxTokens: 2000, timeout: 120000, notes: '',
  };
}

export default function ModelCenterPage() {
  const setPage = useGameStore(s => s.setPage);
  const { t } = useTranslation();

  const [profiles, setProfiles] = useState<ModelProfile[]>(() => modelProfileStore.getAll());
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState<string>('');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [editing, setEditing] = useState<ModelProfile | null>(null);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(t));
  const [tagInput, setTagInput] = useState('');
  const [toast, setToast] = useState('');

  const categories = useMemo(() => modelProfileStore.getCategories(), [profiles]);
  const tags = useMemo(() => modelProfileStore.getTags(), [profiles]);

  const refresh = () => setProfiles(modelProfileStore.getAll());

  const filtered = useMemo(
    () => modelProfileStore.search({ query, category: catFilter || undefined, tag: tagFilter || undefined }),
    [query, catFilter, tagFilter, profiles],
  );

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 1800);
  };

  const openNew = () => {
    setEditing(null);
    setDraft(emptyDraft(t));
    setTagInput('');
  };

  const openEdit = (p: ModelProfile) => {
    setEditing(p);
    setDraft({
      name: p.name, category: p.category, tags: p.tags, providerType: p.providerType,
      model: p.model, apiKey: p.apiKey, baseUrl: p.baseUrl,
      temperature: p.temperature, maxTokens: p.maxTokens, timeout: p.timeout, notes: p.notes || '',
    });
    setTagInput(p.tags.join('、'));
  };

  const commitTags = (raw: string): string[] =>
    raw.split(/[,，、\s]+/).map(s => s.trim()).filter(Boolean);

  const saveDraft = () => {
    if (!draft.name.trim()) { flash(t('mcNameRequired')); return; }
    const finalDraft: Draft = { ...draft, tags: commitTags(tagInput), name: draft.name.trim() };
    if (editing) {
      modelProfileStore.update(editing.id, finalDraft);
      flash(t('mcSaved'));
    } else {
      modelProfileStore.add(finalDraft);
      flash(t('mcCreated'));
    }
    setEditing(null);
    refresh();
  };

  const removeProfile = (p: ModelProfile) => {
    if (!confirm(t('confirmDelete'))) return;
    modelProfileStore.remove(p.id);
    refresh();
    flash(t('mcDeleted'));
  };

  const assignToSeat = (p: ModelProfile, seat: number) => {
    llmConfigManager.setSeatConfig(seat, modelProfileStore.toLLMConfig(p));
    flash(`${p.name} ${t('mcAssigned')} ${seat}`);
  };

  const duplicate = (p: ModelProfile) => {
    const { id, createdAt, updatedAt, ...rest } = p;
    modelProfileStore.add({ ...rest, name: p.name + ' ' + t('copyProfile') });
    refresh();
  };

  return (
    <div className="w-full h-full table-bg p-6 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        {/* 顶部栏 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button className="btn-secondary" onClick={() => setPage('settings')}>{t('back')}</button>
            <h2 className="text-2xl font-bold text-white">{t('modelCenter')}</h2>
            <span className="text-white/50 text-sm">{profiles.length} {t('profilesCount')}</span>
          </div>
          <button className="btn-primary" onClick={openNew}>＋ {t('newProfile')}</button>
        </div>

        {/* 搜索 + 筛选 */}
        <div className="flex flex-wrap gap-3 items-center mb-4">
          <input
            className="flex-1 min-w-[220px] bg-gray-700 text-white rounded px-3 py-2"
            placeholder={t('searchProfile')}
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <select
            className="bg-gray-700 text-white rounded px-2 py-2"
            value={catFilter}
            onChange={e => setCatFilter(e.target.value)}>
            <option value="">{t('allCategories')}</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            className="bg-gray-700 text-white rounded px-2 py-2"
            value={tagFilter}
            onChange={e => setTagFilter(e.target.value)}>
            <option value="">{t('allTags')}</option>
            {tags.map(tg => <option key={tg} value={tg}>{tg}</option>)}
          </select>
        </div>

        {/* 标签快捷筛选条 */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {tags.map(tg => (
              <button key={tg}
                className={`text-xs px-2 py-1 rounded-full transition-colors ${tagFilter === tg ? 'bg-gold text-white' : 'bg-gray-700/70 text-white/80 hover:bg-gray-600'}`}
                onClick={() => setTagFilter(tagFilter === tg ? '' : tg)}>
                #{tg}
              </button>
            ))}
          </div>
        )}

        {/* 配置列表 */}
        {filtered.length === 0 ? (
          <div className="text-center text-white/50 py-16">{t('noProfiles')}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map(p => (
              <div key={p.id} className="bg-gray-800/60 rounded-lg p-4 border border-white/5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-white font-bold text-lg">{p.name}</div>
                    <div className="text-xs text-white/50">{t(PROVIDER_I18N_KEYS[p.providerType])} · {p.model || '—'}</div>
                  </div>
                  <span className="text-xs bg-gray-700 text-white/80 px-2 py-0.5 rounded">{p.category}</span>
                </div>
                {p.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {p.tags.map(tg => (
                      <span key={tg} className="text-[11px] bg-gold/20 text-gold px-2 py-0.5 rounded-full">#{tg}</span>
                    ))}
                  </div>
                )}
                {p.notes && <div className="text-white/60 text-xs mt-2 line-clamp-2">{p.notes}</div>}
                <div className="flex flex-wrap gap-2 mt-3">
                  <button className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded" onClick={() => openEdit(p)}>{t('edit')}</button>
                  <button className="text-xs bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded" onClick={() => duplicate(p)}>{t('copyProfile')}</button>
                  <button className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded" onClick={() => removeProfile(p)}>{t('delete')}</button>
                  <div className="ml-auto flex items-center gap-1">
                    <span className="text-xs text-white/60">{t('assignToSeat')}:</span>
                    {[0, 1, 2].map(s => (
                      <button key={s} className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white px-2 py-1 rounded"
                        onClick={() => assignToSeat(p, s)} title={`${t('seat')} ${s}`}>{s}</button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 编辑 / 新建 弹窗 */}
      {editing !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setEditing(null)}>
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4">{editing ? t('edit') + ' · ' + editing.name : t('newProfile')}</h3>
            <div className="space-y-3 text-sm">
              <label className="block text-white/70">{t('profileName')}
                <input className="w-full mt-1 bg-gray-700 text-white rounded px-2 py-1.5"
                  value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder={t('profileName')} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-white/70">{t('category')}
                  <input className="w-full mt-1 bg-gray-700 text-white rounded px-2 py-1.5"
                    value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })} list="cat-list" />
                </label>
                <label className="block text-white/70">{t('provider')}
                  <select className="w-full mt-1 bg-gray-700 text-white rounded px-2 py-1.5"
                    value={draft.providerType}
                    onChange={e => setDraft({ ...draft, providerType: e.target.value as ModelProviderType })}>
                    {Object.entries(PROVIDER_I18N_KEYS).map(([k, key]) => <option key={k} value={k}>{t(key)}</option>)}
                  </select>
                </label>
              </div>
              <datalist id="cat-list">
                {categories.map(c => <option key={c} value={c} />)}
              </datalist>
              <label className="block text-white/70">{t('modelName')}
                <input className="w-full mt-1 bg-gray-700 text-white rounded px-2 py-1.5"
                  value={draft.model} onChange={e => setDraft({ ...draft, model: e.target.value })} placeholder={t('modelPlaceholder')} />
              </label>
              <label className="block text-white/70">{t('apiKey')}
                <ApiKeyField
                  className="text-white rounded px-2 py-1.5"
                  value={draft.apiKey} onChange={v => setDraft({ ...draft, apiKey: v })}
                />
              </label>
              <label className="block text-white/70">{t('baseUrl')}
                <input className="w-full mt-1 bg-gray-700 text-white rounded px-2 py-1.5"
                  value={draft.baseUrl} onChange={e => setDraft({ ...draft, baseUrl: e.target.value })} />
              </label>
              <div className="grid grid-cols-3 gap-3">
                <label className="block text-white/70">{t('temperature')}
                  <input type="number" step="0.1" min="0" max="2" className="w-full mt-1 bg-gray-700 text-white rounded px-2 py-1.5"
                    value={draft.temperature} onChange={e => setDraft({ ...draft, temperature: parseFloat(e.target.value) || 0 })} />
                </label>
                <label className="block text-white/70">{t('maxTokens')}
                  <input type="number" step="100" min="1" className="w-full mt-1 bg-gray-700 text-white rounded px-2 py-1.5"
                    value={draft.maxTokens} onChange={e => setDraft({ ...draft, maxTokens: parseInt(e.target.value) || 0 })} />
                </label>
                <label className="block text-white/70">{t('timeout')}
                  <input type="number" step="1000" min="1000" className="w-full mt-1 bg-gray-700 text-white rounded px-2 py-1.5"
                    value={draft.timeout} onChange={e => setDraft({ ...draft, timeout: parseInt(e.target.value) || 0 })} />
                </label>
              </div>
              <label className="block text-white/70">{t('tagsInput')}
                <input className="w-full mt-1 bg-gray-700 text-white rounded px-2 py-1.5"
                  value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder={t('tagPlaceholder')} />
              </label>
              <label className="block text-white/70">{t('notes')}
                <textarea className="w-full mt-1 bg-gray-700 text-white rounded px-2 py-1.5 h-16 resize-none"
                  value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} />
              </label>
            </div>
            <div className="flex gap-3 mt-5 justify-end">
              <button className="btn-secondary" onClick={() => setEditing(null)}>{t('cancel')}</button>
              <button className="btn-primary" onClick={saveDraft}>{t('saveProfile')}</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full z-[60]">
          {toast}
        </div>
      )}
    </div>
  );
}
