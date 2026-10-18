import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/game-store';
import CardView from '../components/CardView';
import OpponentPanel from '../components/OpponentPanel';
import BidPanel from '../components/BidPanel';
import SettlementPanel from '../components/SettlementPanel';
import BombEffect from '../components/BombEffect';
import AIReasoningPanel from '../components/AIReasoningPanel';
import ModelErrorModal from '../components/ModelErrorModal';
import InteractionLayer from '../components/InteractionLayer';
import { Card, GamePhase } from '../../core/types';
import { useTranslation, seatName, rankLabel } from '../../i18n';

export default function GamePage() {
  const {
    players, bottomCards, currentPlayerId, lastPlayedCards, lastPlayedBy,
    multiplier, landlordId, phase, settlement, showBombEffect, showRocketEffect,
    selectedCards, setSelectedCards, makeBid, playCards, passTurn, endGame, startGame, setPage,
    aiThinking, aiReasoningHistory, aiDegraded, gameSpeed,
    controlledSeats, activeSeat, toggleControl, setActiveSeat,
    skipTurn, isPaused, setPaused,
  } = useGameStore();
  const { t } = useTranslation();

  const myHand = players[activeSeat]?.hand || [];
  const isMyTurn = currentPlayerId === activeSeat;
  const isBidding = phase === GamePhase.BIDDING;
  const isGameOver = phase === GamePhase.SETTLING;

  // 固定农民模式：人类（座位0）叫分阶段自动不叫，由 AI 争夺地主
  const gameMode = useGameStore(s => s.gameMode);
  useEffect(() => {
    if (gameMode === 'human_farmer' && activeSeat === 0 && isBidding && isMyTurn) {
      makeBid('pass');
    }
  }, [gameMode, activeSeat, isBidding, isMyTurn, makeBid]);

  const toggleCard = (card: Card) => {
    if (!isMyTurn || isBidding || isGameOver) return;

    const isSelected = selectedCards.some(c => c.suit === card.suit && c.rank === card.rank);
    if (isSelected) {
      setSelectedCards(selectedCards.filter(c => !(c.suit === card.suit && c.rank === card.rank)));
    } else {
      setSelectedCards([...selectedCards, card]);
    }
  };

  const handlePlay = () => {
    if (selectedCards.length > 0) {
      playCards(selectedCards);
    }
  };

  const handlePass = () => {
    passTurn();
  };

  // 扇形手牌角度计算
  const getCardStyle = (index: number, total: number) => {
    const mid = (total - 1) / 2;
    const offset = index - mid;
    const angle = offset * 2.5;
    const translateY = Math.abs(offset) * 1.5;
    return {
      transform: `rotate(${angle}deg) translateY(${translateY}px)`,
      zIndex: index,
      marginLeft: index === 0 ? 0 : -22,
    };
  };

  // 轮到我的提示音
  useEffect(() => {
    if (isMyTurn && !isGameOver) {
      // 可以播放 turn_notify 音效
    }
  }, [isMyTurn, isGameOver]);

  return (
    <div className="w-full h-full table-bg relative overflow-hidden">
      {/* 特效层 */}
      {showBombEffect && <BombEffect type="bomb" />}
      {showRocketEffect && <BombEffect type="rocket" />}

      {/* 顶部：底牌 + 倍数 */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-6 z-10">
        <div className="flex gap-2">
          {bottomCards.map((card, i) => (
            <div key={i} className={`w-12 h-16 rounded-md border ${
              landlordId !== null ? 'bg-card' : 'bg-gradient-to-br from-green-700 to-green-900'
            } flex items-center justify-center text-xs text-white/70`}>
              {landlordId !== null ? (
                <span className={`font-bold text-xs ${
                  card.suit === 'joker'
                    ? (card.rank === 17 ? 'text-red-600' : 'text-black')
                    : (card.suit === 'heart' || card.suit === 'diamond' ? 'text-red-600' : 'text-black')
                }`}>
                  {rankLabel(card.rank)}
                </span>
              ) : t('bottomCards')}
            </div>
          ))}
        </div>
        <div className="text-gold text-xl font-bold bg-black/30 px-3 py-1 rounded-full">
          ×{multiplier}
        </div>
      </div>

      {/* 右上角：控制栏 */}
      <div className="absolute top-4 right-4 flex gap-2 z-10 items-center">
        {/* 视角切换：点击即接管该座位 */}
        <div className="flex gap-1 bg-black/30 rounded-full px-1 py-1">
          {[0, 1, 2].map(id => (
            <button
              key={id}
              className={`px-2 py-1 rounded-full text-xs transition-colors ${
                activeSeat === id ? 'bg-gold text-white' : 'text-white/70 hover:text-white'
              }`}
              onClick={() => controlledSeats.includes(id) ? setActiveSeat(id) : toggleControl(id)}
              title={controlledSeats.includes(id) ? t('switchView') : t('takeOver')}
            >
              {id === 0 ? t('you') : seatName(id)}
            </button>
          ))}
        </div>

        {/* 交还当前接管的 AI 座位（座位0不能交还） */}
        {activeSeat !== 0 && (
          <button
            className="px-3 py-1 rounded text-sm bg-orange-600 hover:bg-orange-700 text-white"
            onClick={() => toggleControl(activeSeat)}
          >
            {t('giveBack')}
          </button>
        )}

        {/* 跳过回合 */}
        <button className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded text-sm transition-colors"
          onClick={skipTurn}>
          ⏭ {t('skip')}
        </button>

        {/* 暂停 */}
        <button className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded text-sm transition-colors"
          onClick={() => setPaused(!isPaused)}>
          {isPaused ? '▶' : '⏸'}
        </button>

        <button
          className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded text-sm transition-colors"
          onClick={() => setPage('settings')}
        >
          {t('settings')}
        </button>
        <button
          className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded text-sm transition-colors"
          onClick={() => { endGame(); setPage('lobby'); }}
        >
          {t('exit')}
        </button>
      </div>

      {/* 左侧对手（下家 = 玩家1） */}
      {players[1] && (
        <OpponentPanel
          player={players[1]}
          isLeft={true}
          isThinking={aiThinking === 1}
          isDegraded={aiDegraded[1] || false}
        />
      )}

      {/* 右侧对手（上家 = 玩家2） */}
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
        {lastPlayedCards.length > 0 && (
          <div className="flex flex-col items-center">
            <span className="text-white/60 text-sm mb-2">
              {lastPlayedBy != null ? seatName(lastPlayedBy) : ''}
            </span>
            <div className="flex gap-1">
              {lastPlayedCards.map((card, i) => (
                <CardView key={i} card={card} small />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI 推理面板（右侧） */}
      {aiReasoningHistory.length > 0 && (
        <AIReasoningPanel history={aiReasoningHistory} />
      )}

      {/* 叫分面板 */}
      {isBidding && isMyTurn && !(gameMode === 'human_farmer' && activeSeat === 0) && (
        <BidPanel onBid={(score) => makeBid('bid', score)} onPass={() => makeBid('pass')} />
      )}
      {isBidding && isMyTurn && gameMode === 'human_farmer' && activeSeat === 0 && (
        <div className="absolute bottom-48 left-1/2 -translate-x-1/2 bg-black/60 rounded-lg px-6 py-3 text-white z-20">
          {t('farmerModeDesc')}
        </div>
      )}

      {/* 当前操控玩家信息 */}
      <div className="absolute bottom-4 left-4 text-white z-10">
        <div className="font-bold flex items-center gap-2">
          {seatName(activeSeat)}
          {landlordId === activeSeat && <span className="text-gold text-xs bg-gold/20 px-2 py-0.5 rounded">{t('landlord')}</span>}
          {aiThinking === activeSeat && <span className="text-blue-300 text-xs animate-pulse">{t('thinking')}</span>}
        </div>
        <div className="text-sm opacity-70">{t('remaining')}: {myHand.length}</div>
      </div>

      {/* 游戏速度指示器（右下角） */}
      <div className="absolute bottom-4 right-4 text-white/50 text-xs z-10">
        {t('speedLabel')} {gameSpeed}×
      </div>

      {/* 我的手牌区 */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 pb-3 z-20">
        <div className="flex items-end justify-center">
          {myHand.map((card, i) => {
            const isSelected = selectedCards.some(c => c.suit === card.suit && c.rank === card.rank);
            return (
              <div
                key={`${card.suit}-${card.rank}-${i}`}
                style={getCardStyle(i, myHand.length)}
                onClick={() => toggleCard(card)}
                className="transition-transform"
              >
                <CardView card={card} selected={isSelected} />
              </div>
            );
          })}
        </div>

        {/* 出牌按钮 */}
        {isMyTurn && !isBidding && !isGameOver && (
          <div className="flex justify-center gap-4 mt-2">
            <button className="btn-primary" onClick={handlePlay} disabled={selectedCards.length === 0}>
              {t('playCards')} ({selectedCards.length})
            </button>
            {lastPlayedBy !== activeSeat && lastPlayedCards.length > 0 && (
              <button className="btn-secondary" onClick={handlePass}>{t('pass')}</button>
            )}
          </div>
        )}
      </div>

      {/* 模型错误弹窗 */}
      <ModelErrorModal />

      {/* 互动层（R5/R6/R7）：话术气泡 / 码字动画 / 飞行动作 */}
      <InteractionLayer />

      {/* 结算面板 */}
      {settlement && (
        <SettlementPanel
          result={settlement}
          isLandlord={landlordId === 0}
          winnerId={-1}
          onRestart={() => { endGame(); setTimeout(() => startGame(), 100); }}
          onExit={() => { endGame(); setPage('lobby'); }}
        />
      )}
    </div>
  );
}
