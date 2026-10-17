import { describe, it, expect } from 'vitest';
import { GameStateMachine } from '../src/core/state-machine';
import { GamePhase } from '../src/core/types';
import { identifyCardType } from '../src/core/rules';

/**
 * 简易出牌策略：只出单牌。
 * 自由出牌出最小单牌；跟牌时出能压过的最小单牌，否则 pass。
 */
function simplePlay(machine: GameStateMachine) {
  const state = machine.getGameState();
  const cur = state.players[state.currentPlayerIndex];
  const hand = [...cur.hand].sort((a, b) => a.rank - b.rank);

  // 自由出牌
  if (state.lastPlayedCards.length === 0) {
    machine.playCards([hand[0]]);
    return;
  }
  // 跟牌：找更大的单牌
  const lastType = identifyCardType(state.lastPlayedCards);
  const lastRank = lastType?.mainRank ?? 0;
  const bigger = hand.find(c => c.rank > lastRank);
  if (lastType?.type === 'single' && bigger) {
    machine.playCards([bigger]);
  } else {
    machine.playCards(null);
  }
}

/** 跑完一整局出牌阶段 */
function playUntilEnd(machine: GameStateMachine, maxSteps = 500) {
  let steps = 0;
  while (machine.getGameState().phase !== GamePhase.SETTLING && steps < maxSteps) {
    const state = machine.getGameState();
    if (state.phase === GamePhase.BIDDING) {
      // 都不叫，触发强制地主
      machine.bid('pass');
    } else if (state.phase === GamePhase.PLAYING) {
      simplePlay(machine);
    }
    steps++;
  }
  return steps;
}

describe('GameStateMachine 叫分', () => {
  it('三家都不叫时首家强制1分，倍数为1', () => {
    const m = new GameStateMachine();
    m.deal();
    const first = m.getGameState().currentPlayerIndex;

    for (let i = 0; i < 3; i++) m.bid('pass');

    const state = m.getGameState();
    expect(state.phase).toBe(GamePhase.PLAYING);
    expect(state.landlordId).toBe(first);
    expect(state.highestBid).toBe(1);
    expect(state.multiplier).toBe(1);
  });

  it('叫3分立即结束且叫分者为地主', () => {
    const m = new GameStateMachine();
    m.deal();
    const first = m.getGameState().currentPlayerIndex;
    m.bid('bid', 3);

    const state = m.getGameState();
    expect(state.phase).toBe(GamePhase.PLAYING);
    expect(state.landlordId).toBe(first);
    expect(state.multiplier).toBe(3);
  });

  it('地主是叫出最高分的玩家（不是最后行动者）', () => {
    const m = new GameStateMachine();
    m.deal();
    const first = m.getGameState().currentPlayerIndex;
    const second = (first + 1) % 3;
    const third = (first + 2) % 3;

    // 首家叫1，第二家pass，第三家pass → 地主=首家
    m.bid('bid', 1);
    m.bid('pass');
    m.bid('pass');

    const state = m.getGameState();
    expect(state.landlordId).toBe(first);
    expect(state.multiplier).toBe(1);
  });

  it('后叫的更高分者成为地主', () => {
    const m = new GameStateMachine();
    m.deal();
    const first = m.getGameState().currentPlayerIndex;
    const second = (first + 1) % 3;

    // 首家叫1，第二家叫2，第三家pass → 地主=第二家
    m.bid('bid', 1);
    m.bid('bid', 2);
    m.bid('pass');

    const state = m.getGameState();
    expect(state.landlordId).toBe(second);
    expect(state.multiplier).toBe(2);
  });

  it('拒绝叫比当前最高分低的分', () => {
    const m = new GameStateMachine();
    m.deal();
    m.bid('bid', 2);
    expect(() => m.bid('bid', 1)).toThrow();
  });

  it('固定农民模式：人类即使叫3分也被强制不叫，地主必为AI', () => {
    for (let g = 0; g < 30; g++) {
      const m = new GameStateMachine();
      m.setBannedLandlord([0]);
      m.deal();
      for (let i = 0; i < 3; i++) {
        const idx = m.getGameState().currentPlayerIndex;
        if (idx === 0) {
          // 人类试图叫3分，应被强制转为不叫
          m.bid('bid', 3);
        } else {
          m.bid('pass');
        }
      }
      const state = m.getGameState();
      expect(state.phase).toBe(GamePhase.PLAYING);
      expect(state.landlordId).not.toBe(0);
      expect([1, 2]).toContain(state.landlordId);
      // 座位0必为农民
      expect(state.players[0].role).toBe('farmer');
    }
  });

  it('地主拿到3张底牌（20张），农民各17张', () => {
    const m = new GameStateMachine();
    m.deal();
    m.bid('bid', 3);
    const state = m.getGameState();
    const landlord = state.players.find(p => p.id === state.landlordId)!;
    expect(landlord.hand.length).toBe(20);
    state.players.filter(p => p.id !== state.landlordId).forEach(p => {
      expect(p.hand.length).toBe(17);
    });
  });
});

describe('GameStateMachine 完整对局', () => {
  it('能从发牌流转到结算，且牌被全部出完', () => {
    const m = new GameStateMachine();
    m.deal();
    const steps = playUntilEnd(m);

    const state = m.getGameState();
    expect(steps).toBeLessThan(500);

    const end = m.getGameState();
    expect(end.phase).toBe(GamePhase.SETTLING);
    // 至少有一个人牌出完
    const empty = end.players.filter(p => p.hand.length === 0);
    expect(empty.length).toBeGreaterThan(0);
  });

  it('连续运行多局都能正常结束', () => {
    for (let g = 0; g < 10; g++) {
      const m = new GameStateMachine();
      m.deal();
      playUntilEnd(m);
      expect(m.getGameState().phase).toBe(GamePhase.SETTLING);
    }
  });
});
