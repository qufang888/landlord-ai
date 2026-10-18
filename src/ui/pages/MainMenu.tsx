import { useGameStore } from '../../store/game-store';
import { audioManager } from '../../audio/audio-manager';
import { useTranslation } from '../../i18n';

export default function MainMenu() {
  const setPage = useGameStore(s => s.setPage);
  const setGameMode = useGameStore(s => s.setGameMode);
  const startGame = useGameStore(s => s.startGame);
  const { t } = useTranslation();

  const handleHumanVsAI = () => {
    setGameMode('human_vs_ai');
    startGame();
    setPage('game');
    audioManager.playBGM('balanced');
  };

  const handleHumanFarmer = () => {
    setGameMode('human_farmer');
    startGame();
    setPage('game');
    audioManager.playBGM('balanced');
  };

  const handleSpectate = () => {
    setGameMode('ai_vs_ai');
    setPage('spectate');
    audioManager.playBGM('balanced');
  };

  return (
    <div className="w-full h-full table-bg flex flex-col items-center justify-center">
      <h1 className="text-6xl font-bold text-gold mb-2 tracking-wider" style={{ textShadow: '0 4px 20px rgba(212,168,67,0.3)' }}>
        {t('appName')}
      </h1>
      <p className="text-white/70 mb-12 text-lg">{t('appTagline')}</p>

      <div className="flex flex-col gap-4 w-80">
        <button
          className="btn-primary text-lg py-3 transform hover:scale-105 transition-transform"
          onClick={handleHumanVsAI}
        >
          🎮 {t('modeHumanVsAI')}
        </button>

        <button
          className="btn-primary text-lg py-3 transform hover:scale-105 transition-transform"
          onClick={handleHumanFarmer}
        >
          🤝 {t('modeCoopFarmer')}
        </button>

        <button
          className="btn-secondary text-lg py-3 transform hover:scale-105 transition-transform"
          onClick={handleSpectate}
        >
          👁 {t('modeSpectate')}
        </button>

        <div className="flex gap-4 mt-4">
          <button
            className="btn-secondary flex-1"
            onClick={() => setPage('settings')}
          >
            ⚙ {t('settings')}
          </button>
          <button
            className="btn-secondary flex-1"
            onClick={() => setPage('about')}
          >
            ℹ {t('about')}
          </button>
        </div>
      </div>

      <p className="absolute bottom-4 text-white/40 text-sm">
        {t('copyright')}
      </p>
    </div>
  );
}
