import { useGameStore } from '../../store/game-store';
import { useTranslation } from '../../i18n';

export default function ModelErrorModal() {
  const modelError = useGameStore(s => s.modelError);
  const reloadModel = useGameStore(s => s.reloadModel);
  const skipCurrentTurn = useGameStore(s => s.skipCurrentTurn);
  const { t } = useTranslation();

  if (!modelError) return null;

  return (
    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-96 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600 text-xl">⚠</div>
          <h3 className="text-lg font-bold text-gray-800">{t('modelError')}</h3>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
          <div className="text-xs break-all">{modelError.message}</div>
        </div>

        <div className="flex gap-3">
          <button className="btn-primary flex-1" onClick={() => reloadModel(modelError.playerId)}>{t('reloadModel')}</button>
          <button className="btn-secondary flex-1" onClick={() => skipCurrentTurn()}>{t('skipThis')}</button>
        </div>
      </div>
    </div>
  );
}
