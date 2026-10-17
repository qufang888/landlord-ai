import { describe, it, expect } from 'vitest';
import { identifyCardType, canBeat } from '../src/core/rules';
import { Card, CardType } from '../src/core/types';

// 辅助函数：快速构造牌
function c(rank: number, suit: Card['suit'] = 'spade'): Card {
  return { suit, rank };
}

describe('牌型识别', () => {
  it('识别火箭（双王）', () => {
    const cards = [c(16, 'joker'), c(17, 'joker')];
    const result = identifyCardType(cards);
    expect(result?.type).toBe(CardType.Rocket);
  });

  it('识别炸弹（四张同点）', () => {
    const cards = [c(5), c(5, 'heart'), c(5, 'club'), c(5, 'diamond')];
    const result = identifyCardType(cards);
    expect(result?.type).toBe(CardType.Bomb);
    expect(result?.mainRank).toBe(5);
  });

  it('识别单牌', () => {
    expect(identifyCardType([c(10)])?.type).toBe(CardType.Single);
    expect(identifyCardType([c(17, 'joker')])?.type).toBe(CardType.Single);
  });

  it('识别对子', () => {
    const cards = [c(8), c(8, 'heart')];
    expect(identifyCardType(cards)?.type).toBe(CardType.Pair);
  });

  it('识别三张', () => {
    const cards = [c(11), c(11, 'heart'), c(11, 'club')];
    expect(identifyCardType(cards)?.type).toBe(CardType.Triple);
  });

  it('识别三带一', () => {
    const cards = [c(13), c(13, 'heart'), c(13, 'club'), c(5, 'diamond')];
    expect(identifyCardType(cards)?.type).toBe(CardType.TripleWithOne);
  });

  it('识别三带对', () => {
    const cards = [
      c(14), c(14, 'heart'), c(14, 'club'),
      c(6, 'diamond'), c(6),
    ];
    expect(identifyCardType(cards)?.type).toBe(CardType.TripleWithPair);
  });

  it('识别顺子（5张）', () => {
    const cards = [c(3), c(4, 'heart'), c(5, 'club'), c(6, 'diamond'), c(7)];
    const result = identifyCardType(cards);
    expect(result?.type).toBe(CardType.Straight);
    expect(result?.length).toBe(5);
  });

  it('顺子不能含2', () => {
    const cards = [c(11), c(12), c(13), c(14), c(15)]; // J Q K A 2
    expect(identifyCardType(cards)).toBeNull();
  });

  it('识别连对（3对）', () => {
    const cards = [
      c(3), c(3, 'heart'),
      c(4, 'club'), c(4, 'diamond'),
      c(5), c(5, 'heart'),
    ];
    expect(identifyCardType(cards)?.type).toBe(CardType.DoubleStraight);
  });

  it('识别飞机（2组三张）', () => {
    const cards = [
      c(3), c(3, 'heart'), c(3, 'club'),
      c(4, 'diamond'), c(4), c(4, 'heart'),
    ];
    expect(identifyCardType(cards)?.type).toBe(CardType.Plane);
  });

  it('识别飞机带翅膀（带单牌）', () => {
    const cards = [
      c(3), c(3, 'heart'), c(3, 'club'),
      c(4, 'diamond'), c(4), c(4, 'heart'),
      c(7), c(9, 'club'),
    ];
    expect(identifyCardType(cards)?.type).toBe(CardType.PlaneWithWings);
  });

  it('识别飞机带翅膀（带对子）', () => {
    const cards = [
      c(3), c(3, 'heart'), c(3, 'club'),
      c(4, 'diamond'), c(4), c(4, 'heart'),
      c(8), c(8, 'heart'),
      c(9, 'club'), c(9, 'diamond'),
    ];
    expect(identifyCardType(cards)?.type).toBe(CardType.PlaneWithWings);
  });

  it('识别四带二单', () => {
    const cards = [
      c(10), c(10, 'heart'), c(10, 'club'), c(10, 'diamond'),
      c(5), c(7, 'heart'),
    ];
    expect(identifyCardType(cards)?.type).toBe(CardType.FourWithTwoSingles);
  });

  it('识别四带二对', () => {
    const cards = [
      c(10), c(10, 'heart'), c(10, 'club'), c(10, 'diamond'),
      c(5), c(5, 'heart'),
      c(7, 'club'), c(7, 'diamond'),
    ];
    expect(identifyCardType(cards)?.type).toBe(CardType.FourWithTwoPairs);
  });

  it('非法牌型返回 null', () => {
    // 3+2+1 = 6张，不是四带二也不是其他
    const cards = [c(5), c(5, 'heart'), c(5, 'club'), c(8), c(8, 'diamond'), c(11)];
    expect(identifyCardType(cards)).toBeNull();
  });
});

describe('大小比较', () => {
  it('火箭压一切', () => {
    const rocket = identifyCardType([c(16, 'joker'), c(17, 'joker')])!;
    const bomb = identifyCardType([c(5), c(5, 'heart'), c(5, 'club'), c(5, 'diamond')])!;
    expect(canBeat(rocket, bomb)).toBe(true);
    expect(canBeat(bomb, rocket)).toBe(false);
  });

  it('炸弹压普通牌型', () => {
    const bomb = identifyCardType([c(3), c(3, 'heart'), c(3, 'club'), c(3, 'diamond')])!;
    const straight = identifyCardType([c(5), c(6), c(7), c(8), c(9)])!;
    expect(canBeat(bomb, straight)).toBe(true);
  });

  it('同型同张数比大小', () => {
    const pair5 = identifyCardType([c(5), c(5, 'heart')])!;
    const pair8 = identifyCardType([c(8), c(8, 'club')])!;
    expect(canBeat(pair8, pair5)).toBe(true);
    expect(canBeat(pair5, pair8)).toBe(false);
  });

  it('不同牌型不能压（炸弹除外）', () => {
    const single = identifyCardType([c(14)])!;
    const pair = identifyCardType([c(3), c(3, 'heart')])!;
    expect(canBeat(single, pair)).toBe(false);
  });

  it('不同张数的顺子不能互压', () => {
    const s5 = identifyCardType([c(3), c(4), c(5), c(6), c(7)])!;
    const s6 = identifyCardType([c(3), c(4), c(5), c(6), c(7), c(8)])!;
    expect(canBeat(s6, s5)).toBe(false);
  });
});
