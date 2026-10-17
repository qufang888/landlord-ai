import { useEffect, useState } from 'react';
import { useGameStore, THEME_CONFIG } from '../../store/game-store';
import { audioManager } from '../../audio/audio-manager';
import { useTranslation } from '../../i18n';

interface Props {
  onClose: () => void;
}

/**
 * 嘲讽语音编辑器（全软件内 UI，非原生窗口）。
 * - 自定义 AI 嘲讽话术（逐条增删改 + 试听）。
 * - 调整嘲讽语音的语速 / 音高。
 * - 整体跟随当前主题配色。
 */
export default function TauntEditorModal({ onClose }: Props) {
  const theme = useGameStore(s => s.theme);
  const settings = useGameStore(s => s.settings);
  const updateSettings = useGameStore(s => s.updateSettings);
  const { t } = useTranslation();

  const themeConfig = THEME_CONFIG[theme];
  const primary = themeConfig.primary;

  // 本地编辑态：列表与语速/音高
  const [taunts, setTaunts] = useState<string[]>(
    settings.customTaunts && settings.customTaunts.length ? [...settings.customTaunts] : [],
  );
  const [rate, setRate] = useState<number>(settings.tauntRate ?? 1.1);
  const [pitch, setPitch] = useState<number>(settings.tauntPitch ?? 1.0);
  const [saved, setSaved] = useState(false);

  // 关闭时按 Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const updateTaunt = (idx: number, value: string) => {
    setTaunts(prev => prev.map((v, i) => (i === idx ? value : v)));
    setSaved(false);
  };
  const removeTaunt = (idx: number) => { setTaunts(prev => prev.filter((_, i) => i !== idx)); setSaved(false); };
  const addTaunt = () => { setTaunts(prev => [...prev, '']); setSaved(false); };

  const preview = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    audioManager.speakText(trimmed, { rate, pitch });
  };

  // 试听一条随机（用于整体预览语速/音高效果）
  const previewRandom = () => {
    const pool = taunts.map(x => x.trim()).filter(Boolean);
    const text = pool.length ? pool[Math.floor(Math.random() * pool.length)] : '你的牌打得也太臭了';
    audioManager.speakText(text, { rate, pitch });
  };

  const handleSave = () => {
    // 过滤空行；完全清空则回退到默认话术
    const cleaned = taunts.map(x => x.trim()).filter(Boolean);
    updateSettings({ customTaunts: cleaned, tauntRate: rate, tauntPitch: pitch });
    setSaved(true);
  };

  const handleReset = () => {
    setTaunts([]);
    setRate(1.1);
    setPitch(1.0);
    setSaved(false);
  };

  const panelStyle: React.CSSProperties = {
    background: 'rgba(10, 12, 16, 0.96)',
    border: `1px solid ${primary}`,
    boxShadow: `0 0 40px ${primary}33`,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-[640px] max-w-[94vw] max-h-[88vh] rounded-2xl overflow-hidden flex flex-col"
        style={panelStyle}
        onClick={e => e.stopPropagation()}
      >
        {/* 标题区 */}
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${primary}55` }}>
          <h3 className="text-lg font-bold" style={{ color: primary }}>🎙 {t('tauntEditorTitle')}</h3>
          <button className="text-white/60 hover:text-white text-xl leading-none" onClick={onClose}>×</button>
        </div>

        {/* 内容区（可滚动） */}
        <div className="px-5 py-4 overflow-y-auto">
          <p className="text-white/70 text-sm mb-4">{t('tauntEditorDesc')}</p>

          {/* 话术列表 */}
          <div className="space-y-2 mb-4">
            {taunts.length === 0 && (
              <div className="text-white/40 text-sm italic py-2">
                （{t('tauntReset')} · 当前使用默认话术库）
              </div>
            )}
            {taunts.map((line, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  className="flex-1 bg-white/10 text-white rounded px-3 py-2 text-sm outline-none focus:ring-1"
                  style={{ ['--tw-ring-color' as any]: primary }}
                  value={line}
                  placeholder={`${t('tauntAdd').replace('＋ ', '')} ${idx + 1}`}
                  onChange={e => updateTaunt(idx, e.target.value)}
                />
                <button
                  className="px-2 py-2 rounded text-sm shrink-0"
                  style={{ background: `${primary}22`, color: primary }}
                  title={t('tauntPreview')}
                  onClick={() => preview(line)}
                >🔊</button>
                <button
                  className="px-2 py-2 rounded text-sm bg-white/10 text-white/70 hover:text-red-300 shrink-0"
                  title="删除"
                  onClick={() => removeTaunt(idx)}
                >🗑</button>
              </div>
            ))}
          </div>

          <button
            className="text-sm px-3 py-1.5 rounded mb-5"
            style={{ background: `${primary}22`, color: primary, border: `1px solid ${primary}66` }}
            onClick={addTaunt}
          >{t('tauntAdd')}</button>

          {/* 语速 / 音高 */}
          <div className="grid grid-cols-2 gap-4 mb-2">
            <label className="text-white/80 text-sm flex flex-col gap-1">
              <span>{t('tauntRate')}：{rate.toFixed(2)}×</span>
              <input type="range" min="0.5" max="2" step="0.05" value={rate}
                style={{ accentColor: primary }}
                onChange={e => { setRate(parseFloat(e.target.value)); setSaved(false); }} />
            </label>
            <label className="text-white/80 text-sm flex flex-col gap-1">
              <span>{t('tauntPitch')}：{pitch.toFixed(2)}×</span>
              <input type="range" min="0" max="2" step="0.05" value={pitch}
                style={{ accentColor: primary }}
                onChange={e => { setPitch(parseFloat(e.target.value)); setSaved(false); }} />
            </label>
          </div>
          <button
            className="text-sm px-3 py-1.5 rounded mb-2"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'white' }}
            onClick={previewRandom}
          >🔊 {t('tauntPreview')}（{t('tauntRate')}/{t('tauntPitch')}）</button>
        </div>

        {/* 底部操作栏 */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderTop: `1px solid ${primary}55` }}
        >
          <button className="text-xs text-white/60 hover:text-white" onClick={handleReset}>{t('tauntReset')}</button>
          <div className="flex items-center gap-3">
            {saved && <span className="text-green-400 text-sm">✅ {t('tauntSaved')}</span>}
            <button className="btn-secondary" onClick={onClose}>{t('back')}</button>
            <button
              className="px-4 py-1.5 rounded font-medium text-black"
              style={{ background: primary }}
              onClick={handleSave}
            >{t('tauntSave')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
