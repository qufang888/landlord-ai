import { useGameStore } from '../../store/game-store';
import { useTranslation } from '../../i18n';

export default function AboutPage() {
  const setPage = useGameStore(s => s.setPage);
  const { t } = useTranslation();

  return (
    <div className="w-full h-full table-bg flex items-center justify-center">
      <div className="max-w-md bg-white/10 backdrop-blur rounded-2xl p-8 text-white">
        <h2 className="text-3xl font-bold text-gold text-center mb-6">{t('appName')}</h2>

        <div className="space-y-3 text-center mb-6">
          <p className="text-lg">Version 1.0.0</p>
        </div>

        <div className="border-t border-white/20 pt-4 mb-4">
          <p className="text-center text-white/80">
            {t('about')}: <span className="font-bold text-gold">前方</span>
          </p>
        </div>

        <div className="border-t border-white/20 pt-4 text-sm text-white/60">
          <p>{t('bye')}</p>
        </div>

        <div className="mt-6 text-center">
          <button className="btn-primary" onClick={() => setPage('lobby')}>
            {t('back')}
          </button>
        </div>
      </div>
    </div>
  );
}
