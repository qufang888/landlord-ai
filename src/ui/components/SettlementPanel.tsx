import { SettlementResult } from '../../core/types';
import { useTranslation } from '../../i18n';

interface Props {
  result: SettlementResult;
  isLandlord: boolean;
  winnerId: number;
  onRestart: () => void;
  onExit: () => void;
}

export default function SettlementPanel({ result, isLandlord, winnerId, onRestart, onExit }: Props) {
  const { t } = useTranslation();
  const myScore = isLandlord ? result.landlordScore : result.farmerScore;
  const isWin = myScore > 0;

  return (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-96 text-center shadow-2xl">
        <h2 className={`text-4xl font-bold mb-4 ${isWin ? 'text-green-600' : 'text-red-600'}`}>
          {isWin ? t('win') : t('lose')}
        </h2>

        <div className="text-2xl mb-4">
          {t('score')}: <span className={`font-bold ${isWin ? 'text-green-600' : 'text-red-600'}`}>
            {isWin ? '+' : ''}{myScore}
          </span>
        </div>

        <div className="text-sm text-gray-600 mb-6 text-left bg-gray-100 rounded-lg p-3">
          <div>{t('totalMultiplier')}: ×{result.totalMultiplier}</div>
        </div>

        <div className="flex gap-3 justify-center">
          <button className="btn-primary" onClick={onRestart}>{t('startGame')}</button>
          <button className="btn-secondary" onClick={onExit}>{t('exit')}</button>
        </div>
      </div>
    </div>
  );
}
