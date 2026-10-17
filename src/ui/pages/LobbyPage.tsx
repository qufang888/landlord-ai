import { useState } from 'react';
import { useGameStore, HALL_CONFIG, GameHall } from '../../store/game-store';
import type { GameMode } from '../../store/game-store';
import { useTranslation } from '../../i18n';

export default function LobbyPage() {
  const setPage = useGameStore(s => s.setPage);
  const gameHall = useGameStore(s => s.gameHall);
  const setGameHall = useGameStore(s => s.setGameHall);
  const accounts = useGameStore(s => s.accounts);
  const startGame = useGameStore(s => s.startGame);
  const setGameMode = useGameStore(s => s.setGameMode);
  const { t } = useTranslation();
  const [mode, setMode] = useState<GameMode>('human_vs_ai');

  const myCoins = accounts['前方']?.coins ?? 1000;

  const handleEnterHall = (hall: GameHall) => {
    setGameHall(hall);
    setGameMode(mode);
    startGame();
    setPage('game');
  };

  return (
    <div className="w-full h-full table-bg p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gold">{t('appName')}</h1>
          <div className="flex items-center gap-4">
            <div className="bg-black/30 rounded-full px-4 py-1.5 text-white">
              💰 {myCoins} {t('coins')}
            </div>
            <button className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded text-sm"
              onClick={() => setPage('settings')}>
              ⚙ {t('settings')}
            </button>
            <button className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded text-sm"
              onClick={() => setPage('about')}>
              ℹ {t('about')}
            </button>
          </div>
        </div>

        <h2 className="text-2xl text-white mb-4">{t('lobby')}</h2>

        {/* 对局模式选择 */}
        <div className="flex gap-2 mb-6">
          <button
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              mode === 'human_vs_ai' ? 'bg-gold text-white' : 'bg-black/30 text-white/70 hover:bg-black/40'
            }`}
            onClick={() => setMode('human_vs_ai')}>
            🎯 {t('humanVsAI')}
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              mode === 'human_farmer' ? 'bg-gold text-white' : 'bg-black/30 text-white/70 hover:bg-black/40'
            }`}
            onClick={() => setMode('human_farmer')}>
            🌾 {t('farmerMode')}
          </button>
        </div>
        {mode === 'human_farmer' && (
          <div className="text-white/60 text-xs mb-4 -mt-3">{t('farmerModeDesc')}</div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {(Object.keys(HALL_CONFIG) as GameHall[]).map(key => {
            const hall = HALL_CONFIG[key];
            const locked = myCoins < hall.minCoins;
            const selected = gameHall === key;
            return (
              <div key={key}
                className={`rounded-xl p-6 cursor-pointer transition-all ${
                  selected ? 'bg-gold/20 border-2 border-gold'
                    : locked ? 'bg-black/20 opacity-50'
                    : 'bg-black/30 hover:bg-black/40 border-2 border-transparent'
                }`}
                onClick={() => !locked && handleEnterHall(key)}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-white">{t(key)}</h3>
                  {locked && <span className="text-red-400 text-sm">🔒</span>}
                </div>
                <div className="flex gap-4 text-sm mt-3">
                  <span className="text-white/70">{t('minEntry')}: <span className="text-gold">{hall.minCoins}</span></span>
                  <span className="text-white/70">{t('multiplier')}: <span className="text-gold">×{hall.multiplier}</span></span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex gap-3 justify-center">
          <button className="btn-secondary" onClick={() => setPage('rules')}>📖 {t('rules')}</button>
          <button className="btn-secondary" onClick={() => setPage('spectate')}>👁 {t('spectate')}</button>
        </div>
      </div>
    </div>
  );
}
