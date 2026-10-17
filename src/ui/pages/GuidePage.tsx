import { useState } from 'react';
import { useGameStore } from '../../store/game-store';
import { llmConfigManager, LLMConfig } from '../../llm';
import { fetchModels } from '../../llm/list-models';
import { useTranslation } from '../../i18n';

export default function GuidePage() {
  const setPage = useGameStore(s => s.setPage);
  const setGuideCompleted = useGameStore(s => s.setGuideCompleted);
  const { t } = useTranslation();

  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<LLMConfig>({
    providerType: 'openai_native',
    model: '',
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    temperature: 0.5,
    maxTokens: 2000,
    timeout: 15000,
  });
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const isNative = config.providerType === 'openai_native' || config.providerType === 'claude_native' || config.providerType === 'gemini';

  const handleProviderChange = (newType: LLMConfig['providerType']) => {
    const updated = { ...config, providerType: newType, model: '' };
    if (newType === 'openai_native') {
      updated.baseUrl = 'https://api.openai.com/v1';
    } else if (newType === 'claude_native') {
      updated.baseUrl = 'https://api.anthropic.com/v1';
    } else if (newType === 'gemini') {
      updated.baseUrl = '';
    } else {
      updated.baseUrl = '';
    }
    setConfig(updated);
    setModels([]);
  };

  const loadModels = async () => {
    setLoading(true);
    try {
      const list = await fetchModels(config);
      setModels(list);
      if (list.length === 0) alert(t('noModels'));
    } catch (err: any) {
      alert(t('fetchModelsError') + ': ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    llmConfigManager.setSeatConfig(0, config);
    llmConfigManager.setSeatConfig(1, config);
    llmConfigManager.setSeatConfig(2, config);
    setGuideCompleted();
    setPage('lobby');
  };

  const handleImportBackup = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const raw = ev.target?.result as string;
          const obj = JSON.parse(raw);
          if (obj && obj.app === 'landlord-ai') {
            if (obj.settings) localStorage.setItem('landlord-ai-settings', obj.settings);
            if (obj.llmConfig) localStorage.setItem('landlord-ai-llm-config', obj.llmConfig);
          } else {
            // 兼容旧版直接存 settings 的格式
            localStorage.setItem('landlord-ai-settings', raw);
          }
          setGuideCompleted();
          setPage('lobby');
        } catch { alert(t('backupError')); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="w-full h-full table-bg flex items-center justify-center">
      <div className="bg-gray-800/90 backdrop-blur rounded-2xl p-8 w-[520px] text-white">
        <div className="flex justify-center gap-2 mb-6">
          {[0, 1, 2].map(i => (
            <div key={i} className={`w-3 h-3 rounded-full ${i === step ? 'bg-gold' : i < step ? 'bg-green-500' : 'bg-gray-600'}`} />
          ))}
        </div>

        {step === 0 && (
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gold mb-4">{t('welcome')}</h1>
            <div className="bg-black/30 rounded-lg p-4 mb-6 text-left text-sm">
              <p>✓ {t('humanVsAI')}</p>
              <p>✓ OpenAI / Claude / Gemini</p>
            </div>
            <button className="btn-primary w-full" onClick={() => setStep(1)}>{t('next')}</button>
            <button className="w-full mt-3 text-white/50 hover:text-white text-sm" onClick={handleImportBackup}>
              {t('importBackup')}
            </button>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold mb-4">{t('configureModel')}</h2>
            <div className="space-y-3 text-sm">
              <label className="block">
                <span className="text-white/70">{t('provider')}</span>
                <select className="w-full mt-1 bg-gray-700 rounded px-2 py-2"
                  value={config.providerType}
                  onChange={e => handleProviderChange(e.target.value as LLMConfig['providerType'])}>
                  <option value="openai_native">{t('openaiNative')}</option>
                  <option value="openai_compatible">{t('openaiCompatible')}</option>
                  <option value="claude_native">{t('claudeNative')}</option>
                  <option value="claude_compatible">{t('claudeCompatible')}</option>
                  <option value="gemini">{t('geminiNative')}</option>
                </select>
              </label>
              <label className="block">
                <span className="flex items-center justify-between">
                  <span className="text-white/70">{t('modelName')}</span>
                  <button type="button"
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 rounded"
                    onClick={loadModels}
                    disabled={loading}>
                    {loading ? t('loading') : t('fetchModels')}
                  </button>
                </span>
                <input className="w-full mt-1 bg-gray-700 rounded px-2 py-2"
                  list="guide-models"
                  value={config.model}
                  placeholder={t('modelPlaceholder')}
                  onChange={e => setConfig({ ...config, model: e.target.value })} />
                <datalist id="guide-models">
                  {models.map(m => <option key={m} value={m} />)}
                </datalist>
              </label>
              <label className="block">
                <span className="text-white/70">{t('apiKey')}</span>
                <input type="password" className="w-full mt-1 bg-gray-700 rounded px-2 py-2"
                  value={config.apiKey}
                  onChange={e => setConfig({ ...config, apiKey: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-white/70">{t('baseUrl')}</span>
                <input className="w-full mt-1 bg-gray-700 rounded px-2 py-2 disabled:opacity-50"
                  value={config.baseUrl || ''}
                  onChange={e => setConfig({ ...config, baseUrl: e.target.value })}
                  disabled={isNative}
                  placeholder={isNative ? '' : 'http://...'} />
              </label>
              {config.providerType === 'openai_compatible' && (
                <div className="flex gap-2">
                  <button type="button" className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
                    onClick={() => setConfig({ ...config, baseUrl: 'http://localhost:11434/v1', model: '' })}>
                    Ollama
                  </button>
                  <button type="button" className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
                    onClick={() => setConfig({ ...config, baseUrl: 'http://localhost:8000/v1', model: '' })}>
                    vLLM
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button className="btn-secondary flex-1" onClick={() => setStep(0)}>{t('back')}</button>
              <button className="btn-primary flex-1" onClick={() => setStep(2)}>{t('next')}</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="text-center">
            <h2 className="text-xl font-bold mb-4">{t('finish')}</h2>
            <div className="bg-green-900/30 border border-green-600 rounded-lg p-4 mb-6">
              <p className="text-green-400">✓</p>
            </div>
            <button className="btn-primary w-full" onClick={handleFinish}>{t('enterLobby')}</button>
          </div>
        )}
      </div>
    </div>
  );
}
