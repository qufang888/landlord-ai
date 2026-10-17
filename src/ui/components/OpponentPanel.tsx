import { Card } from '../../core/types';
import { useTranslation, seatName } from '../../i18n';
import { useGameStore } from '../../store/game-store';
import { ActionType, ACTION_META } from '../../game/interactions';

interface Props {
  player: { id: number; name: string; hand: Card[]; role: string | null; remaining: number };
  isLeft: boolean;
  isThinking?: boolean;
  isDegraded?: boolean;
}

export default function OpponentPanel({ player, isLeft, isThinking, isDegraded }: Props) {
  const position = isLeft ? 'left-4' : 'right-4';
  const { t } = useTranslation();
  const triggerAction = useGameStore((s) => s.triggerAction);

  const onAction = (action: ActionType) => triggerAction(0, player.id, action);

  return (
    <div className={`absolute ${position} top-[30%] -translate-y-1/2 flex flex-col items-center z-10`}>
      <div className={`relative w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600
        flex items-center justify-center text-white text-xl font-bold mb-2
        ${isThinking ? 'ring-4 ring-gold animate-pulse' : ''} transition-all`}>
        {player.id}
        {isThinking && <div className="absolute -bottom-1 -right-1 bg-gold rounded-full w-5 h-5 flex items-center justify-center"><span className="text-xs">🤔</span></div>}
        {isDegraded && <div className="absolute -top-1 -right-1 bg-orange-500 rounded-full w-4 h-4 flex items-center justify-center"><span className="text-[10px]">⚠</span></div>}
      </div>

      <div className="text-white text-sm font-bold">{seatName(player.id)}</div>

      {player.role && (
        <div className="text-gold text-xs mt-1 bg-gold/20 px-2 rounded">
          {player.role === 'landlord' ? t('landlord') : t('farmer')}
        </div>
      )}

      <div className="bg-black/30 rounded-full px-3 py-1 mt-2 text-white text-sm">
        {player.remaining} {t('remaining')}
      </div>

      <div className="flex mt-2 h-8 items-end">
        {Array.from({ length: Math.min(player.remaining, 12) }).map((_, i) => (
          <div key={i} className="w-3 h-5 bg-gradient-to-br from-green-600 to-green-800 rounded-sm -ml-1 border border-green-900"
            style={{ zIndex: i, height: `${18 + (i % 3) * 2}px` }} />
        ))}
      </div>

      {/* 玩家对 AI 的互动作（R7）：扔番茄 / 倒水桶 / 送花 */}
      <div className="flex gap-1 mt-2 pointer-events-auto">
        {(['tomato', 'water', 'flower'] as ActionType[]).map((a) => (
          <button
            key={a}
            title={ACTION_META[a].label}
            onClick={() => onAction(a)}
            className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-base leading-none flex items-center justify-center transition-colors"
          >
            {ACTION_META[a].emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
