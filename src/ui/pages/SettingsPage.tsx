import { useEffect, useState } from 'react';
import { useGameStore, THEME_CONFIG, ThemeName } from '../../store/game-store';
import { llmConfigManager, LLMConfig } from '../../llm';
import { fetchModels, testConnection } from '../../llm/list-models';
import { audioManager } from '../../audio/audio-manager';
import { LANGUAGES, setLanguage, useTranslation } from '../../i18n';
import TauntEditorModal from '../components/TauntEditorModal';

const isDesktop = typeof window !== 'undefined' && !!(window as any).electronAPI;

export default function SettingsPage() {
  const setPage = useGameStore(s => s.setPage);
  const theme = useGameStore(s => s.theme);
  const setTheme = useGameStore(s => s.setTheme);
  const settings = useGameStore(s => s.settings);
  const updateSettings = useGameStore(s => s.updateSettings);
  const { t } = useTranslation();

  const [seat0Config, setSeat0Config] = useState<LLMConfig>(llmConfigManager.getSeatConfig(0));
  const [seat1Config, setSeat1Config] = useState<LLMConfig>(llmConfigManager.getSeatConfig(1));
  const [seat2Config, setSeat2Config] = useState<LLMConfig>(llmConfigManager.getSeatConfig(2));
  const [models0, setModels0] = useState<string[]>([]);
  const [models1, setModels1] = useState<string[]>([]);
  const [models2, setModels2] = useState<string[]>([]);
  const [loading0, setLoading0] = useState(false);
  const [loading1, setLoading1] = useState(false);
  const [loading2, setLoading2] = useState(false);
  const [testStatus, setTestStatus] = useState<Record<number, string>>({});
  const [testing, setTesting] = useState<Record<number, boolean>>({});
  const [volumes, setVolumesState] = useState(audioManager.getVolumes());
  const [backupFolder, setBackupFolder] = useState(settings.backupPath || '');
  const [showTauntEditor, setShowTauntEditor] = useState(false);

  useEffect(() => {
    setBackupFolder(settings.backupPath || '');
  }, [settings.backupPath]);

  const setVolumes = (v: Partial<typeof volumes>) => {
    audioManager.setVolumes(v);
    setVolumesState(audioManager.getVolumes());
  };

  const handleSave = () => {
    llmConfigManager.setSeatConfig(0, seat0Config);
    llmConfigManager.setSeatConfig(1, seat1Config);
    llmConfigManager.setSeatConfig(2, seat2Config);
    alert(t('configSaved'));
  };

  // ---------- 备份（含设置与全部模型配置） ----------
  const buildBackup = (): string => {
    const settingsData = localStorage.getItem('landlord-ai-settings') || '{}';
    const llmData = localStorage.getItem('landlord-ai-llm-config') || '{}';
    return JSON.stringify({
      app: 'landlord-ai',
      version: 1,
      timestamp: new Date().toISOString(),
      settings: settingsData,
      llmConfig: llmData,
    }, null, 2);
  };

  const restoreBackup = (raw: string): boolean => {
    try {
      const obj = JSON.parse(raw);
      if (obj && obj.app === 'landlord-ai') {
        if (obj.settings) localStorage.setItem('landlord-ai-settings', obj.settings);
        if (obj.llmConfig) localStorage.setItem('landlord-ai-llm-config', obj.llmConfig);
      } else {
        // 兼容旧版直接存 settings 的格式
        localStorage.setItem('landlord-ai-settings', raw);
      }
      return true;
    } catch {
      return false;
    }
  };

  const handleExportBackup = async () => {
    const content = buildBackup();
    const stamp = new Date().toISOString().slice(0, 10);
    // 桌面端：若设置了备份目录则直接写入该目录
    if (isDesktop && backupFolder) {
      try {
        const savedPath = await (window as any).electronAPI.exportBackup(backupFolder, content);
        alert(`${t('savedToFolder')} ${savedPath}`);
        return;
      } catch (e: any) {
        alert(`${t('connectFail')}: ${e.message}`);
        return;
      }
    }
    // 浏览器端：走下载
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `landlord-ai-backup-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = () => {
    if (isDesktop) {
      (window as any).electronAPI.importBackup().then((raw: string | null) => {
        if (!raw) return;
        if (restoreBackup(raw)) alert(t('backupRestored'));
        else alert(t('backupError'));
      });
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const ok = restoreBackup(ev.target?.result as string);
        alert(ok ? t('backupRestored') : t('backupError'));
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleChooseFolder = async () => {
    if (!isDesktop) return;
    const dir = await (window as any).electronAPI.chooseBackupDir();
    if (dir) {
      setBackupFolder(dir);
      updateSettings({ backupPath: dir });
    }
  };

  const handleProviderChange = (current: LLMConfig, newType: LLMConfig['providerType']): LLMConfig => {
    const updated = { ...current, providerType: newType, model: '' };
    if (newType === 'openai_native') {
      updated.baseUrl = 'https://api.openai.com/v1';
    } else if (newType === 'claude_native') {
      updated.baseUrl = 'https://api.anthropic.com/v1';
    } else {
      updated.baseUrl = '';
    }
    return updated;
  };

  const loadModels = async (seat: number, config: LLMConfig) => {
    const setLoading = [setLoading0, setLoading1, setLoading2][seat];
    const setModels = [setModels0, setModels1, setModels2][seat];
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

  const handleTest = async (seat: number, config: LLMConfig) => {
    setTesting(s => ({ ...s, [seat]: true }));
    setTestStatus(s => ({ ...s, [seat]: '' }));
    try {
      const r = await testConnection(config);
      setTestStatus(s => ({ ...s, [seat]: `✅ ${t('connectSuccess')}` }));
      void r;
    } catch (err: any) {
      setTestStatus(s => ({ ...s, [seat]: `❌ ${t('connectFail')}: ${err.message}` }));
    } finally {
      setTesting(s => ({ ...s, [seat]: false }));
    }
  };

  const renderSeatSettings = (
    seat: number,
    config: LLMConfig,
    onChange: (c: LLMConfig) => void,
    models: string[],
    loading: boolean,
  ) => {
    const isNative = config.providerType === 'openai_native' || config.providerType === 'claude_native' || config.providerType === 'gemini';
    return (
      <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
        <h3 className="text-white font-bold mb-3">
          {seat === 0 ? t('seat0Config') : `${t('seat')} ${seat} ${t('aiConfig')}`}
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <label className="text-white/70">{t('provider')}
            <select className="w-full mt-1 bg-gray-700 text-white rounded px-2 py-1"
              value={config.providerType}
              onChange={e => onChange(handleProviderChange(config, e.target.value as LLMConfig['providerType']))}>
              <option value="openai_native">{t('openaiNative')}</option>
              <option value="openai_compatible">{t('openaiCompatible')}</option>
              <option value="claude_native">{t('claudeNative')}</option>
              <option value="claude_compatible">{t('claudeCompatible')}</option>
              <option value="gemini">{t('geminiNative')}</option>
            </select>
          </label>
          <label className="text-white/70">
            <span className="flex items-center justify-between">
              {t('modelName')}
              <button type="button"
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 rounded"
                onClick={() => loadModels(seat, config)}
                disabled={loading}>
                {loading ? t('loading') : t('fetchModels')}
              </button>
            </span>
            <input className="w-full mt-1 bg-gray-700 text-white rounded px-2 py-1"
              list={`models-seat-${seat}`}
              value={config.model}
              placeholder={t('modelPlaceholder')}
              onChange={e => onChange({ ...config, model: e.target.value })} />
            <datalist id={`models-seat-${seat}`}>
              {models.map(m => <option key={m} value={m} />)}
            </datalist>
          </label>
          <label className="text-white/70">{t('apiKey')}
            <input type="password" className="w-full mt-1 bg-gray-700 text-white rounded px-2 py-1"
              value={config.apiKey}
              onChange={e => onChange({ ...config, apiKey: e.target.value })} />
          </label>
          <label className="text-white/70">{t('baseUrl')}
            <input className="w-full mt-1 bg-gray-700 text-white rounded px-2 py-1 disabled:opacity-50"
              value={config.baseUrl || ''}
              onChange={e => onChange({ ...config, baseUrl: e.target.value })}
              disabled={isNative} />
          </label>
        </div>
        {config.providerType === 'openai_compatible' && (
          <div className="mt-3 flex gap-2">
            <button type="button" className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
              onClick={() => onChange({ ...config, baseUrl: 'http://localhost:11434/v1', model: '' })}>
              Ollama
            </button>
            <button type="button" className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
              onClick={() => onChange({ ...config, baseUrl: 'http://localhost:8000/v1', model: '' })}>
              vLLM
            </button>
          </div>
        )}
        <div className="mt-3 flex items-center gap-2">
          <button type="button"
            className="text-xs bg-green-700 hover:bg-green-800 text-white px-3 py-1 rounded"
            onClick={() => handleTest(seat, config)}
            disabled={testing[seat]}>
            {testing[seat] ? t('testing') : t('testConnection')}
          </button>
          {testStatus[seat] && (
            <span className="text-xs text-white/80 break-all">{testStatus[seat]}</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full table-bg p-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-white">{t('settings')}</h2>
          <button className="btn-secondary" onClick={() => setPage('lobby')}>{t('back')}</button>
        </div>

        {/* 语言选择 */}
        <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
          <h3 className="text-white font-bold mb-3">{t('language')}</h3>
          <div className="grid grid-cols-5 gap-2">
            {LANGUAGES.map(lang => (
              <button key={lang.code}
                className="bg-gray-700 hover:bg-gray-600 text-white text-xs rounded px-2 py-2 transition-colors"
                onClick={() => setLanguage(lang.code)}>
                {lang.nativeName}
              </button>
            ))}
          </div>
        </div>

        {/* 主题选择 */}
        <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
          <h3 className="text-white font-bold mb-3">{t('theme')}（{Object.keys(THEME_CONFIG).length}）</h3>
          <div className="grid grid-cols-5 gap-2">
            {(Object.keys(THEME_CONFIG) as ThemeName[]).map(key => (
              <div key={key}
                className={`rounded-lg p-2 cursor-pointer text-center transition-all ${theme === key ? 'ring-2 ring-gold' : 'opacity-70 hover:opacity-100'}`}
                style={{ background: THEME_CONFIG[key].bg }}
                onClick={() => setTheme(key)}
                title={THEME_CONFIG[key].name}>
                <div className="text-white text-xs font-medium truncate">{THEME_CONFIG[key].name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 音效设置 */}
        <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
          <h3 className="text-white font-bold mb-3">{t('sound')}</h3>
          <div className="space-y-3">
            {(['bgm', 'sfx', 'voice'] as const).map(key => (
              <label key={key} className="text-white/70 flex items-center gap-3 text-sm">
                <span className="w-20">{t(key)}</span>
                <input type="range" min="0" max="1" step="0.1"
                  value={volumes[key]}
                  onChange={e => setVolumes({ [key]: parseFloat(e.target.value) })}
                  className="flex-1" />
                <span className="w-10 text-right">{Math.round(volumes[key] * 100)}%</span>
              </label>
            ))}
          </div>
        </div>

        {/* 嘲讽语音设置 */}
        <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
          <h3 className="text-white font-bold mb-3">{t('tauntEditorTitle')}</h3>
          <p className="text-white/60 text-sm mb-3">
            {t('tauntEditorDesc')}
          </p>
          <button
            className="text-sm bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded"
            onClick={() => setShowTauntEditor(true)}
          >
            🎙 {t('openTauntEditor')}
          </button>
        </div>

        {/* 对局设置 */}
        <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
          <h3 className="text-white font-bold mb-3">{t('gameSettings')}</h3>
          <div className="flex items-center gap-3 text-sm mb-3">
            <span className="text-white/70 w-28">{t('defaultSpeed')}</span>
            {[1, 2, 4].map(sp => (
              <button key={sp}
                className={`px-3 py-1 rounded ${settings.defaultSpeed === sp ? 'bg-gold text-white' : 'bg-gray-700 text-white/70'}`}
                onClick={() => updateSettings({ defaultSpeed: sp })}>
                {sp}×
              </button>
            ))}
          </div>
          <label className="flex items-center gap-3 text-sm text-white/70">
            <input type="checkbox" checked={settings.mockEnabled}
              onChange={e => updateSettings({ mockEnabled: e.target.checked })} />
            {t('mockVoice')}
          </label>
        </div>

        {/* AI 配置 */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-bold">{t('aiConfig')}</h3>
          <button className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded"
            onClick={() => setPage('modelCenter')}>
            🗂 {t('modelCenter')}
          </button>
        </div>
        {renderSeatSettings(0, seat0Config, setSeat0Config, models0, loading0)}
        {renderSeatSettings(1, seat1Config, setSeat1Config, models1, loading1)}
        {renderSeatSettings(2, seat2Config, setSeat2Config, models2, loading2)}
        <button className="btn-primary w-full mt-2" onClick={handleSave}>{t('save')}</button>

        {/* 备份还原 */}
        <div className="bg-gray-800/50 rounded-lg p-4 mt-6">
          <h3 className="text-white font-bold mb-3">{t('backup')}</h3>
          {isDesktop && (
            <div className="flex items-center gap-2 mb-3 text-sm">
              <span className="text-white/70 w-28">{t('backupFolder')}</span>
              <input className="flex-1 bg-gray-700 text-white rounded px-2 py-1"
                value={backupFolder}
                placeholder={t('notSet')}
                readOnly
              />
              <button type="button" className="btn-secondary whitespace-nowrap"
                onClick={handleChooseFolder}>
                {t('chooseFolder')}
              </button>
            </div>
          )}
          <div className="flex gap-3">
            <button className="btn-secondary flex-1" onClick={handleExportBackup}>{t('exportBackup')}</button>
            <button className="btn-secondary flex-1" onClick={handleImportBackup}>{t('importBackup')}</button>
          </div>
        </div>

        {/* 其他入口 */}
        <div className="flex gap-3 mt-6">
          <button className="btn-secondary flex-1" onClick={() => setPage('rules')}>{t('rules')}</button>
          <button className="btn-secondary flex-1" onClick={() => setPage('about')}>{t('about')}</button>
        </div>
      </div>

      {showTauntEditor && <TauntEditorModal onClose={() => setShowTauntEditor(false)} />}
    </div>
  );
}
