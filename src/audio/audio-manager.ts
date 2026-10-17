/**
 * 音效管理器
 * 基于 Howler.js，三条独立通道：BGM / SFX / Voice
 * 补全策略：若真实音频素材（assets/audio/*）缺失，则回退到程序化合成（Web Audio）
 * 或浏览器 TTS（报牌语音），保证所有音效都能真正出声。
 */
import { Howl, Howler } from 'howler';
import { BGM_MAP, SFX_MAP, VOICE_MAP, BGMScene } from './sound-map';
import { soundSynthesizer, VOICE_TEXT } from './synth';

export interface VolumeSettings {
  bgm: number;    // 0~1
  sfx: number;    // 0~1
  voice: number;  // 0~1
}

export class AudioManager {
  private bgmCurrent: Howl | null = null;
  private bgmCurrentName: BGMScene | null = null;
  private sfxCache: Map<string, Howl> = new Map();
  private voiceCache: Map<string, Howl> = new Map();
  private volumes: VolumeSettings = { bgm: 0.5, sfx: 0.8, voice: 1.0 };
  private muted = false;
  private preloaded = false;

  // 素材实际可用性（预加载时探测；缺失则回退到合成/语音）
  private sfxAvailable = new Set<string>();
  private bgmAvailable = new Set<string>();
  private voiceAvailable = new Set<string>();

  // ---------- 预加载 ----------
  preload(): void {
    if (this.preloaded) return;

    // 预加载 SFX（音频素材缺失时静默，标记不可用）
    for (const [id, src] of Object.entries(SFX_MAP)) {
      try {
        const sound = new Howl({
          src: [src],
          volume: this.volumes.sfx,
          onload: () => this.sfxAvailable.add(id),
          onloaderror: () => this.sfxAvailable.delete(id),
        });
        this.sfxCache.set(id, sound);
      } catch {
        // ignore
      }
    }

    // 预加载语音
    for (const [id, src] of Object.entries(VOICE_MAP)) {
      try {
        const sound = new Howl({
          src: [src],
          volume: this.volumes.voice,
          onload: () => this.voiceAvailable.add(id),
          onloaderror: () => this.voiceAvailable.delete(id),
        });
        this.voiceCache.set(id, sound);
      } catch {
        // 语音文件可能不存在，忽略
      }
    }

    this.preloaded = true;
  }

  // ---------- BGM 管理 ----------
  playBGM(scene: BGMScene): void {
    const src = BGM_MAP[scene];
    if (src && this.bgmAvailable.has(scene)) {
      // 真实素材可用：走 Howler
      this.playBGMViaHowler(scene, src);
      return;
    }
    // 回退：程序化合成 BGM
    soundSynthesizer.playBGM(scene, this.volumes.bgm);
  }

  private playBGMViaHowler(scene: BGMScene, src: string): void {
    if (this.bgmCurrentName === scene && this.bgmCurrent?.playing()) {
      return; // 已经在播放了
    }

    // 停止当前 BGM（淡出）
    if (this.bgmCurrent) {
      const old = this.bgmCurrent;
      old.fade(this.volumes.bgm, 0, 2000); // 2秒淡出
      setTimeout(() => old.unload(), 2000);
    }

    // 播放新 BGM（淡入）
    try {
      const newBgm = new Howl({
        src: [src],
        loop: true,
        volume: 0,
        onloaderror: () => {},
      });
      newBgm.once('load', () => {
        newBgm.fade(0, this.volumes.bgm, 2000); // 2秒淡入
      });
      newBgm.play();

      this.bgmCurrent = newBgm;
      this.bgmCurrentName = scene;
    } catch {
      // BGM 素材缺失时静默
    }
  }

  stopBGM(): void {
    if (this.bgmCurrent) {
      this.bgmCurrent.fade(this.volumes.bgm, 0, 1000);
      const old = this.bgmCurrent;
      setTimeout(() => old.unload(), 1000);
      this.bgmCurrent = null;
      this.bgmCurrentName = null;
    }
    soundSynthesizer.stopBGM();
  }

  // ---------- SFX 播放 ----------
  playSFX(id: string): void {
    const sound = this.sfxCache.get(id);
    if (sound && this.sfxAvailable.has(id)) {
      sound.volume(this.volumes.sfx);
      sound.play();
      return;
    }
    // 回退：程序化合成
    soundSynthesizer.playSFX(id, this.volumes.sfx);
  }

  // ---------- 语音播放 ----------
  playVoice(id: string): void {
    const sound = this.voiceCache.get(id);
    if (sound && this.voiceAvailable.has(id)) {
      sound.volume(this.volumes.voice);
      sound.play();
      return;
    }
    // 回退：浏览器 TTS 朗读中文
    const text = VOICE_TEXT[id];
    if (text) soundSynthesizer.speak(text, this.volumes.voice);
  }

  // 根据牌型播放对应语音
  playCardVoice(cardType: string, rank?: number): void {
    // 单牌
    if (cardType === 'single' && rank !== undefined) {
      const rankNames: Record<number, string> = {
        3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
        11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2',
      };
      if (rank === 16) this.playVoice('single_joker_small');
      else if (rank === 17) this.playVoice('single_joker_big');
      else if (rankNames[rank]) this.playVoice(`single_${rankNames[rank]}`);
      return;
    }

    // 其他牌型
    const typeVoiceMap: Record<string, string> = {
      pair: 'pair',
      triple: 'triple',
      triple_with_one: 'triple_with_one',
      triple_with_pair: 'triple_with_pair',
      straight: 'straight',
      double_straight: 'double_straight',
      plane: 'plane',
      plane_with_wings: 'plane_with_wings',
      bomb: 'bomb',
      rocket: 'rocket',
      four_with_two_singles: 'four_with_two',
      four_with_two_pairs: 'four_with_two',
    };

    const voiceId = typeVoiceMap[cardType];
    if (voiceId) this.playVoice(voiceId);
  }

  // ---------- 音量控制 ----------
  setVolumes(v: Partial<VolumeSettings>): void {
    this.volumes = { ...this.volumes, ...v };
    if (this.bgmCurrent && this.bgmCurrentName) {
      this.bgmCurrent.volume(this.volumes.bgm);
    }
  }

  getVolumes(): VolumeSettings {
    return { ...this.volumes };
  }

  muteAll(): void {
    this.muted = true;
    Howler.mute(true);
  }

  unmuteAll(): void {
    this.muted = false;
    Howler.mute(false);
  }

  isMuted(): boolean {
    return this.muted;
  }
}

// 单例
export const audioManager = new AudioManager();
