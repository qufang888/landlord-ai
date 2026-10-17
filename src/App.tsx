import { useGameStore, THEME_CONFIG } from './store/game-store';
import LobbyPage from './ui/pages/LobbyPage';
import GamePage from './ui/pages/GamePage';
import SettingsPage from './ui/pages/SettingsPage';
import SpectatePage from './ui/pages/SpectatePage';
import AboutPage from './ui/pages/AboutPage';
import GuidePage from './ui/pages/GuidePage';
import RulesPage from './ui/pages/RulesPage';
import ModelCenterPage from './ui/pages/ModelCenterPage';

export default function App() {
  const currentPage = useGameStore(s => s.currentPage);
  const theme = useGameStore(s => s.theme);
  const themeConfig = THEME_CONFIG[theme];

  // 将当前主题的背景注入 CSS 变量，供 .table-bg 等类跟随切换（修复切主题不生效的隐藏 bug）
  const styleVars = {
    background: themeConfig.bg,
    ['--table-bg' as any]: themeConfig.bg,
    ['--theme-primary' as any]: themeConfig.primary,
  } as React.CSSProperties;

  return (
    <div
      className="w-screen h-screen overflow-hidden"
      style={styleVars}
    >
      {currentPage === 'guide' && <GuidePage />}
      {currentPage === 'lobby' && <LobbyPage />}
      {currentPage === 'game' && <GamePage />}
      {currentPage === 'settings' && <SettingsPage />}
      {currentPage === 'spectate' && <SpectatePage />}
      {currentPage === 'about' && <AboutPage />}
      {currentPage === 'rules' && <RulesPage />}
      {currentPage === 'modelCenter' && <ModelCenterPage />}
    </div>
  );
}
