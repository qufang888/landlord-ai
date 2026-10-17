/**
 * 音效 ID → 文件路径映射表
 */

export type BGMScene = 'menu' | 'balanced' | 'advantage' | 'disadvantage' | 'win' | 'lose';

export const BGM_MAP: Record<BGMScene, string> = {
  menu: 'assets/audio/bgm/menu.ogg',
  balanced: 'assets/audio/bgm/balanced.ogg',
  advantage: 'assets/audio/bgm/advantage.ogg',
  disadvantage: 'assets/audio/bgm/disadvantage.ogg',
  win: 'assets/audio/bgm/win.ogg',
  lose: 'assets/audio/bgm/lose.ogg',
};

export const SFX_MAP: Record<string, string> = {
  deal: 'assets/audio/sfx/deal.ogg',
  card_play: 'assets/audio/sfx/card_play.ogg',
  pass: 'assets/audio/sfx/pass.ogg',
  bomb: 'assets/audio/sfx/bomb.ogg',
  rocket: 'assets/audio/sfx/rocket.ogg',
  bid_1: 'assets/audio/sfx/bid_1.ogg',
  bid_2: 'assets/audio/sfx/bid_2.ogg',
  bid_3: 'assets/audio/sfx/bid_3.ogg',
  bid_pass: 'assets/audio/sfx/bid_pass.ogg',
  turn_notify: 'assets/audio/sfx/turn_notify.ogg',
  win: 'assets/audio/sfx/win.ogg',
  lose: 'assets/audio/sfx/lose.ogg',
};

export const VOICE_MAP: Record<string, string> = {
  // 单牌
  'single_3': 'assets/audio/voice/single_3.ogg',
  'single_4': 'assets/audio/voice/single_4.ogg',
  'single_5': 'assets/audio/voice/single_5.ogg',
  'single_6': 'assets/audio/voice/single_6.ogg',
  'single_7': 'assets/audio/voice/single_7.ogg',
  'single_8': 'assets/audio/voice/single_8.ogg',
  'single_9': 'assets/audio/voice/single_9.ogg',
  'single_10': 'assets/audio/voice/single_10.ogg',
  'single_J': 'assets/audio/voice/single_J.ogg',
  'single_Q': 'assets/audio/voice/single_Q.ogg',
  'single_K': 'assets/audio/voice/single_K.ogg',
  'single_A': 'assets/audio/voice/single_A.ogg',
  'single_2': 'assets/audio/voice/single_2.ogg',
  'single_joker_small': 'assets/audio/voice/single_joker_small.ogg',
  'single_joker_big': 'assets/audio/voice/single_joker_big.ogg',
  // 牌型
  'pair': 'assets/audio/voice/pair.ogg',
  'triple': 'assets/audio/voice/triple.ogg',
  'triple_with_one': 'assets/audio/voice/triple_with_one.ogg',
  'triple_with_pair': 'assets/audio/voice/triple_with_pair.ogg',
  'straight': 'assets/audio/voice/straight.ogg',
  'double_straight': 'assets/audio/voice/double_straight.ogg',
  'plane': 'assets/audio/voice/plane.ogg',
  'plane_with_wings': 'assets/audio/voice/plane_with_wings.ogg',
  'bomb': 'assets/audio/voice/bomb.ogg',
  'rocket': 'assets/audio/voice/rocket.ogg',
  'four_with_two': 'assets/audio/voice/four_with_two.ogg',
  // 嘲讽
  'taunt_bomb': 'assets/audio/voice/taunt_bomb.ogg',
  'taunt_no_play': 'assets/audio/voice/taunt_no_play.ogg',
  'taunt_last_cards': 'assets/audio/voice/taunt_last_cards.ogg',
  'taunt_take_that': 'assets/audio/voice/taunt_take_that.ogg',
};
