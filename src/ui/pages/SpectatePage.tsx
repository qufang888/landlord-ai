import { useEffect } from 'react';
import { useGameStore } from '../../store/game-store';
import CardView from '../components/CardView';
import OpponentPanel from '../components/OpponentPanel';
import AIReasoningPanel from '../components/AIReasoningPanel';
import BombEffect from '../components/BombEffect';
import SettlementPanel from '../components/SettlementPanel';
import ModelErrorModal from '../components/ModelErrorModal';
import { GamePhase } from '../../core/types';
import { useTranslation, seatName, rankLabel } from '../../i18n';

export default function SpectatePage() {
  const {
    players, bottomCards, currentPlayerId, lastPlayedCards, lastPlayedBy,
    multiplier, landlordId, phase, settlement, winnerId,
    showBombEffect, showRocketEffect,
    aiThinking, aiReasoningHistory, aiDegraded,
    gameSpeed, setSpeed, isPaused, setPaused, stepOnce,
    startSpectate, endGame, setPage,
  } = useGameStore();
  const { t } = useTranslation();

  // 页面加载时自动开始观战
  useEffect(() => {
    startSpectate();
    return () => {
      endGame();
    };
  }, []);

  const isGameOver = phase === GamePhase.SETTLING;

  return (
    <div className="w-full h-full table-bg relative overflow-hidden">
      {/* 特效层 */}
      {showBombEffect && <BombEffect type="bomb" />}
      {showRocketEffect && <BombEffect type="rocket" />}

      {/* 模型错误弹窗 */}
      <ModelErrorModal />

      {/* 顶部控制栏 */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/50 backdrop-blur rounded-full px-5 py-2 z-30">
        <button
          className="text-white hover:text-gold transition-colors text-sm"
          onClick={() => setPaused(!isPaused)}
        >
          {isPaused ? `▶ ${t('resume')}` : `⏸ ${t('pause')}`}
        </button>

        <div className="w-px h-4 bg-white/30" />

        <div className="flex gap-1">
          {[1, 2, 4].map(s => (
            <button
              key={s}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                gameSpeed === s ? 'bg-gold text-white' : 'text-white/60 hover:text-white'
              }`}
              onClick={() => setSpeed(s)}
            >
              {s}×
            </button>
          ))}
        </div>

        {isPaused && (
          <>
            <div className="w-px h-4 bg-white/30" />
            <button
              className="text-white hover:text-gold transition-colors text-sm"
              onClick={stepOnce}
            >
              ⏭ {t('skip')}
            </button>
          </>
        )}

        <div className="w-px h-4 bg-white/30" />

        <button
          className="text-white/60 hover:text-white text-sm transition-colors"
          onClick={() => { endGame(); setPage('lobby'); }}
        >
          {t('exit')}
        </button>
      </div>

      {/* 顶部：底牌 + 倍数 */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-4 z-10">
        <div className="flex gap-2">
          {bottomCards.map((card, i) => (
            <div key={i} className={`w-10 h-14 rounded-md border ${
              landlordId !== null ? 'bg-card' : 'bg-gradient-to-br from-green-700 to-green-900'
            } flex items-center justify-center`}>
              {landlordId !== null ? (
                <span className={`font-bold text-sm ${
                  card.suit === 'joker'
                    ? (card.rank === 17 ? 'text-red-600' : 'text-black')
                    : (card.suit === 'heart' || card.suit === 'diamond' ? 'text-red-600' : 'text-black')
                }`}>
                  {rankLabel(card.rank)}
                </span>
              ) : ''}
            </div>
          ))}
        </div>
        <div className="text-gold text-lg font-bold bg-black/30 px-3 py-1 rounded-full">
          ×{multiplier}
        </div>
      </div>

      {/* 三个 AI 座位 */}
      {/* 下方玩家（座位0） */}
      {players[0] && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 
              flex items-center justify-center text-white font-bold
              ${aiThinking === 0 ? 'ring-4 ring-gold animate-pulse' : ''}`}>
              {seatName(0)[0]}
            </div>
            <div>
              <div className="text-white text-sm font-bold">{seatName(0)}</div>
              <div className="text-gold text-xs">
                {players[0].role === 'landlord' ? t('landlord') : players[0].role === 'farmer' ? t('farmer') : ''}
              </div>
            </div>
            <div className="bg-black/30 rounded-full px-2 py-0.5 text-white text-xs ml-2">
              {players[0].remaining} {t('cardsUnit')}
            </div>
          </div>
          {/* 背面手牌 */}
          <div className="flex">
            {Array.from({ length: players[0].remaining }).map((_, i) => (
              <div key={i} className="w-3 h-5 bg-gradient-to-br from-green-600 to-green-800 rounded-sm -ml-1 border border-green-900" style={{ zIndex: i }} />
            ))}
          </div>
        </div>
      )}

      {/* 左侧（下家 = 玩家1） */}
      {players[1] && (
        <OpponentPanel
          player={players[1]}
          isLeft={true}
          isThinking={aiThinking === 1}
          isDegraded={aiDegraded[1] || false}
        />
      )}

      {/* 右侧（上家 = 玩家2） */}
      {players[2] && (
        <OpponentPanel
          player={players[2]}
          isLeft={false}
          isThinking={aiThinking === 2}
          isDegraded={aiDegraded[2] || false}
        />
      )}

      {/* 中央出牌区 */}
      <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        {lastPlayedCards.length > 0 ? (
          <div className="flex flex-col items-center">
            <span className="text-white/60 text-sm mb-2">
              {seatName(lastPlayedBy)} {t('played')}
            </span>
            <div className="flex gap-1">
              {lastPlayedCards.map((card, i) => (
                <CardView key={i} card={card} small />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-white/30 text-lg">{t('spectating')}</div>
        )}
      </div>

      {/* AI 推理面板（右侧） */}
      {aiReasoningHistory.length > 0 && (
        <AIReasoningPanel history={aiReasoningHistory} />
      )}

      {/* 叫分阶段提示 */}
      {phase === GamePhase.BIDDING && (
        <div className="absolute bottom-40 left-1/2 -translate-x-1/2 bg-black/50 rounded-lg px-6 py-2 z-10">
          <span className="text-white">{t('biddingTurn').replace('{n}', String(currentPlayerId + 1))}</span>
        </div>
      )}

      {/* 结算面板 */}
      {settlement && (
        <SettlementPanel
          result={settlement}
          isLandlord={landlordId === 0}
          winnerId={winnerId ?? -1}
          onRestart={() => { endGame(); setTimeout(() => startSpectate(), 100); }}
          onExit={() => { endGame(); setPage('lobby'); }}
        />
      )}
    </div>
  );
}
