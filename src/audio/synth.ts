/**
 * 音效合成器
 * 当真实音频素材（assets/audio/*）缺失时，用 Web Audio API 程序化合成音效与 BGM，
 * 报牌语音用浏览器 speechSynthesis 朗读中文。
 * 这样即使没有任何二进制音频文件，也能"补全所有音效"真正出声。
 */

export interface SynthSpec {
  type: OscillatorType;
  freq: number;
  freqEnd?: number;   // 滑频终点（>0 上滑，<0 下滑用负值映射）
  duration: number;   // 秒
  gain?: number;      // 0~1
  noise?: boolean;    // 白噪声（洗牌/出牌甩动）
}

// 各 SFX 的合成参数
export const SFX_SYNTH: Record<string, SynthSpec> = {
  deal:          { type: 'triangle', freq: 0, duration: 0.18, gain: 0.3, noise: true },
  card_play:     { type: 'sawtooth', freq: 620, freqEnd: 180, duration: 0.12, gain: 0.35 },
  pass:          { type: 'triangle', freq: 300, duration: 0.12, gain: 0.3 },
  bomb:          { type: 'sawtooth', freq: 140, freqEnd: 40, duration: 0.55, gain: 0.5 },
  rocket:        { type: 'sawtooth', freq: 200, freqEnd: 900, duration: 0.55, gain: 0.5 },
  bid_1:         { type: 'square', freq: 523.25, duration: 0.18, gain: 0.32 },
  bid_2:         { type: 'square', freq: 659.25, duration: 0.18, gain: 0.32 },
  bid_3:         { type: 'square', freq: 783.99, duration: 0.18, gain: 0.32 },
  bid_pass:      { type: 'triangle', freq: 260, duration: 0.15, gain: 0.3 },
  turn_notify:   { type: 'sine', freq: 880, duration: 0.12, gain: 0.35 },
  win:           { type: 'triangle', freq: 523.25, freqEnd: 1046.5, duration: 0.5, gain: 0.4 },
  lose:          { type: 'triangle', freq: 523.25, freqEnd: 311.13, duration: 0.5, gain: 0.4 },
  urge:          { type: 'square', freq: 740, freqEnd: 988, duration: 0.22, gain: 0.32 },
  taunt:         { type: 'sawtooth', freq: 400, freqEnd: 240, duration: 0.3, gain: 0.32 },
  tomato:       { type: 'sine', freq: 900, freqEnd: 200, duration: 0.25, gain: 0.4 },
  water:         { type: 'triangle', freq: 1200, freqEnd: 400, duration: 0.35, gain: 0.35, noise: true },
  flower:        { type: 'sine', freq: 660, freqEnd: 1320, duration: 0.3, gain: 0.35 },
};

// 各 BGM 场景的和弦（柔和铺底），用于程序化循环
export const BGM_SYNTH: Record<string, number[]> = {
  menu:          [261.63, 329.63, 392.0],          // C E G
  balanced:      [293.66, 349.23, 440.0],          // D F A
  advantage:     [329.63, 415.3, 493.88],          // E G# B
  disadvantage:  [220.0, 261.63, 329.63],          // A C E
  win:           [392.0, 493.88, 587.33],          // G B D
  lose:          [196.0, 233.08, 293.66],          // G# low
};

export const BGM_SCENES = Object.keys(BGM_SYNTH);

/** 报牌 / 嘲讽 / 互动的中文朗读文本（与 VOICE_MAP 的 id 对应） */
export const VOICE_TEXT: Record<string, string> = {
  single_3: '三', single_4: '四', single_5: '五', single_6: '六', single_7: '七',
  single_8: '八', single_9: '九', single_10: '十', single_J: '勾', single_Q: '圈',
  single_K: 'K', single_A: '尖', single_2: '二',
  single_joker_small: '小王', single_joker_big: '大王',
  pair: '一对', triple: '三个', triple_with_one: '三带一', triple_with_pair: '三带一对',
  straight: '顺子', double_straight: '连对', plane: '飞机', plane_with_wings: '飞机带翅膀',
  bomb: '炸弹', rocket: '王炸', four_with_two: '四带二',
  taunt_bomb: '炸死你', taunt_no_play: '要不起吧', taunt_last_cards: '我就剩两张了',
  taunt_take_that: '管上',
};

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private bgmTimer: ReturnType<typeof setInterval> | null = null;
  private bgmScene: string | null = null;
  private bgmVolume = 0.4;

  private ensureCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext || (window as any).webkitAudioContext;
        if (!Ctor) return null;
        this.ctx = new Ctor();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  /** 播放单个合成音效 */
  playSFX(id: string, volume = 1): void {
    const spec = SFX_SYNTH[id];
    if (!spec) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const g = ctx.createGain();
    const peak = Math.max(0.0001, Math.min(1, (spec.gain ?? 0.3) * volume));
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + spec.duration);

    if (spec.noise) {
      const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * spec.duration), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(g);
      g.connect(ctx.destination);
      src.start(t0);
      src.stop(t0 + spec.duration);
      return;
    }

    const osc = ctx.createOscillator();
    osc.type = spec.type;
    osc.frequency.setValueAtTime(spec.freq, t0);
    if (spec.freqEnd && spec.freqEnd !== spec.freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, spec.freqEnd), t0 + spec.duration);
    }
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + spec.duration);
  }

  /** 播放程序化 BGM（柔和循环） */
  playBGM(scene: string, volume = 0.4): void {
    if (this.bgmScene === scene && this.bgmTimer) return;
    this.stopBGM();
    const chord = BGM_SYNTH[scene];
    if (!chord) return;
    this.bgmScene = scene;
    this.bgmVolume = volume;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const playChord = () => {
      const c = this.ensureCtx();
      if (!c) return;
      const t0 = c.currentTime;
      chord.forEach((f, i) => {
        const g = c.createGain();
        const peak = Math.max(0.0001, this.bgmVolume * 0.18);
        const start = t0 + i * 0.12;
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(peak, start + 0.08);
        g.gain.exponentialRampToValueAtTime(0.0001, start + 1.1);
        const osc = c.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f;
        osc.connect(g);
        g.connect(c.destination);
        osc.start(start);
        osc.stop(start + 1.2);
      });
    };
    playChord();
    this.bgmTimer = setInterval(playChord, 1400);
  }

  stopBGM(): void {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    this.bgmScene = null;
  }

  /** 用浏览器 TTS 朗读（报牌语音 / 嘲讽语音）。
   *  opts.rate：语速 0.5~2（默认 1.1）
   *  opts.pitch：音高 0~2（默认 1.0）
   */
  speak(text: string, volume = 1, opts?: { rate?: number; pitch?: number }): void {
    try {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'zh-CN';
      u.volume = Math.max(0, Math.min(1, volume));
      u.rate = opts?.rate ?? 1.1;
      u.pitch = opts?.pitch ?? 1.0;
      // 优先选择中文语音
      const voices = window.speechSynthesis.getVoices();
      const zh = voices.find(v => v.lang?.toLowerCase().startsWith('zh'));
      if (zh) u.voice = zh;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {
      // ignore
    }
  }
}

export const soundSynthesizer = new SoundSynthesizer();
