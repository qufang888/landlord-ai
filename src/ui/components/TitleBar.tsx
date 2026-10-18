import { useEffect, useState } from 'react';
import { useGameStore, THEME_CONFIG } from '../../store/game-store';
import { useTranslation } from '../../i18n';

/**
 * 自定义标题栏（仅 Electron 桌面端渲染）。
 * 软件窗口使用无边框（frame: false），此组件提供拖拽区与最小/最大/关闭按钮，
 * 配色跟随当前主题，适配自身 UI 而非系统原生窗口。
 */
export default function TitleBar() {
  const theme = useGameStore(s => s.theme);
  const themeConfig = THEME_CONFIG[theme];
  const primary = themeConfig.primary;
  const [maximized, setMaximized] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (api?.windowIsMaximized) {
      api.windowIsMaximized().then((m: boolean) => setMaximized(!!m)).catch(() => {});
    }
  }, []);

  const api = (window as any).electronAPI;
  const btnStyle = { WebkitAppRegion: 'no-drag' as any } as React.CSSProperties;

  return (
    <div
      className="h-8 w-full flex items-center select-none shrink-0"
      style={{
        WebkitAppRegion: 'drag' as any,
        background: 'rgba(0,0,0,0.55)',
        borderBottom: `1px solid ${primary}55`,
      } as React.CSSProperties}
    >
      <div className="px-3 text-sm font-semibold tracking-wide" style={{ color: primary }}>
        🃏 {t('appName')}
      </div>
      <div className="flex-1" />
      <div className="flex items-center h-full">
        <button
          className="h-full w-11 flex items-center justify-center text-white/80 hover:bg-white/10"
          style={btnStyle}
          title={t('minimize')}
          onClick={() => api?.windowMinimize?.()}
        >—</button>
        <button
          className="h-full w-11 flex items-center justify-center text-white/80 hover:bg-white/10"
          style={btnStyle}
          title={maximized ? t('restore') : t('maximize')}
          onClick={() => {
            api?.windowMaximize?.();
            setTimeout(() => api?.windowIsMaximized?.().then((m: boolean) => setMaximized(!!m)).catch(() => {}), 120);
          }}
        >{maximized ? '🗗' : '▢'}</button>
        <button
          className="h-full w-11 flex items-center justify-center text-white/80 hover:bg-red-600 hover:text-white"
          style={btnStyle}
          title={t('close')}
          onClick={() => api?.windowClose?.()}
        >✕</button>
      </div>
    </div>
  );
}
