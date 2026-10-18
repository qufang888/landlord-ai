/**
 * 全局游戏状态管理 (Zustand)
 */
import { create } from 'zustand';
import { GameStateMachine } from '../core/state-machine';
import { Card, GamePhase, SettlementResult, CardType, CardTypeResult, BidRecord, PlayRecord } from '../core/types';
import { identifyCardType } from '../core/rules';
import { audioManager } from '../audio/audio-manager';
import { AIController, AIThinkingInfo } from '../ai/ai-controller';
import { LLMConfig } from '../llm';
import {
  InteractionEvent, ActionType, detectBadPlay, pickPhrase,
  randomNegativeAction, ACTION_META, newInteractionId,
} from '../game/interactions';

export type Page = 'menu' | 'game' | 'settings' | 'spectate' | 'about' | 'guide' | 'rules' | 'lobby' | 'modelCenter';
export type GameMode = 'human_vs_ai' | 'human_farmer' | 'ai_vs_ai';
export type GameHall = 'beginner' | 'low' | 'mid' | 'high' | 'custom';
export type ThemeName =
  | 'classic' | 'dark' | 'blue' | 'wood' | 'neon'
  | 'jade' | 'rose' | 'sunset' | 'midnight' | 'aurora'
  | 'sand' | 'plum' | 'ocean' | 'ember' | 'frost';

interface PlayerState {
  id: number;
  name: string;
  hand: Card[];
  role: string | null;
  remaining: number;
  isAI: boolean;
  isManaged: boolean;
}

interface ModelError {
  playerId: number;
  message: string;
  timestamp: number;
}

interface PlayerAccount {
  name: string;
  coins: number;
  totalGames: number;
  totalWins: number;
}

interface AppSettings {
  theme: ThemeName;
  backupPath: string;
  soundEnabled: boolean;
  gameHall: GameHall;
  defaultSpeed: number;
  mockEnabled: boolean;
  aiInteractionFreq: number;   // AI 互动频率 0~100：15 秒未出牌时触发催促/嘲讽动作的概率
  customTaunts: string[];      // 自定义嘲讽话术；为空或清空则使用默认话术库
  tauntRate: number;           // 嘲讽语音语速 0.5~2
  tauntPitch: number;          // 嘲讽语音音高 0~2
}

// 游戏场配置
export const HALL_CONFIG: Record<GameHall, { name: string; minCoins: number; multiplier: number; desc: string }> = {
  beginner: { name: '初级场', minCoins: 0, multiplier: 1, desc: '无准入要求，娱乐为主' },
  low: { name: '低级场', minCoins: 100, multiplier: 2, desc: '小赌怡情，输赢不大' },
  mid: { name: '中级场', minCoins: 500, multiplier: 5, desc: '有一定门槛，输赢适中' },
  high: { name: '高级场', minCoins: 2000, multiplier: 10, desc: '高风险高回报，适合高手' },
  custom: { name: '自定义场', minCoins: 0, multiplier: 1, desc: '自由设置，无上限' },
};

// 主题配置（共 15 套，互不雷同、配色协调）。name 字段为 i18n key，由界面用 t() 渲染
export const THEME_CONFIG: Record<ThemeName, { name: string; bg: string; tableBg: string; primary: string }> = {
  classic: { name: 'themeClassic', bg: 'radial-gradient(ellipse at center, #1a6b3c 0%, #0f4d2a 100%)', tableBg: '#1a6b3c', primary: '#d4a843' },
  dark: { name: 'themeDark', bg: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0f0f1a 100%)', tableBg: '#16213e', primary: '#e94560' },
  blue: { name: 'themeBlue', bg: 'radial-gradient(ellipse at center, #0f3460 0%, #0a2647 100%)', tableBg: '#0f3460', primary: '#00d9ff' },
  wood: { name: 'themeWood', bg: 'radial-gradient(ellipse at center, #4a3728 0%, #2d1f14 100%)', tableBg: '#5c4033', primary: '#ffd700' },
  neon: { name: 'themeNeon', bg: 'radial-gradient(ellipse at center, #1a0a2e 0%, #0d021a 100%)', tableBg: '#16213e', primary: '#00ffcc' },
  // —— 新增 10 套 ——
  jade: { name: 'themeJade', bg: 'radial-gradient(ellipse at center, #0f3d3a 0%, #06231f 100%)', tableBg: '#0f3d3a', primary: '#34d399' },
  rose: { name: 'themeRose', bg: 'radial-gradient(ellipse at center, #4a1d3a 0%, #2a0e22 100%)', tableBg: '#4a1d3a', primary: '#f472b6' },
  sunset: { name: 'themeSunset', bg: 'radial-gradient(ellipse at center, #7a3b2e 0%, #3a1f3d 100%)', tableBg: '#7a3b2e', primary: '#fb923c' },
  midnight: { name: 'themeMidnight', bg: 'radial-gradient(ellipse at center, #1e1b4b 0%, #0b0a1f 100%)', tableBg: '#1e1b4b', primary: '#818cf8' },
  aurora: { name: 'themeAurora', bg: 'radial-gradient(ellipse at center, #2a1a4a 0%, #0d2b3a 100%)', tableBg: '#2a1a4a', primary: '#a78bfa' },
  sand: { name: 'themeSand', bg: 'radial-gradient(ellipse at center, #5c4a32 0%, #2e2417 100%)', tableBg: '#5c4a32', primary: '#fbbf24' },
  plum: { name: 'themePlum', bg: 'radial-gradient(ellipse at center, #3b1d4f 0%, #1a0d2e 100%)', tableBg: '#3b1d4f', primary: '#c084fc' },
  ocean: { name: 'themeOcean', bg: 'radial-gradient(ellipse at center, #0c4a6e 0%, #062436 100%)', tableBg: '#0c4a6e', primary: '#38bdf8' },
  ember: { name: 'themeEmber', bg: 'radial-gradient(ellipse at center, #5c1a1a 0%, #2b0d0d 100%)', tableBg: '#5c1a1a', primary: '#f87171' },
  frost: { name: 'themeFrost', bg: 'radial-gradient(ellipse at center, #243b53 0%, #0f1c2e 100%)', tableBg: '#243b53', primary: '#bae6fd' },
};

// 当前"被压"的领出牌线索（用于判定"该压没压 / 浪费炸弹"），随对局推进维护
let lastLeadRef: { cards: Card[]; type: CardTypeResult } | null = null;

// 从 localStorage 加载持久化数据
function loadPersisted() {
  try {
    const saved = localStorage.getItem('landlord-ai-settings');
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

const persisted = loadPersisted();

interface GameStore {
  currentPage: Page;
  setPage: (page: Page) => void;

  guideCompleted: boolean;
  setGuideCompleted: () => void;

  gameMode: GameMode;
  setGameMode: (mode: GameMode) => void;
  gameHall: GameHall;
  setGameHall: (hall: GameHall) => void;

  gameMachine: GameStateMachine | null;
  aiController: AIController | null;

  phase: GamePhase;
  players: PlayerState[];
  bottomCards: Card[];
  currentPlayerId: number;
  lastPlayedCards: Card[];
  lastPlayedBy: number;
  multiplier: number;
  landlordId: number | null;

  settlement: SettlementResult | null;
  winnerId: number | null;

  selectedCards: Card[];
  setSelectedCards: (cards: Card[]) => void;

  aiThinking: number | null;
  aiReasoningHistory: AIThinkingInfo[];
  aiDegraded: Record<number, boolean>;

  showBombEffect: boolean;
  showRocketEffect: boolean;

  gameSpeed: number;
  isPaused: boolean;
  setSpeed: (speed: number) => void;
  setPaused: (paused: boolean) => void;
  stepOnce: () => void;

  modelError: ModelError | null;
  showModelError: (err: ModelError) => void;
  clearModelError: () => void;
  reloadModel: (playerId: number) => void;
  skipCurrentTurn: () => void;

  // 由人类接管的座位集合（这些座位 AI 不自动行动）；activeSeat 为当前人类操控视角
  controlledSeats: number[];
  activeSeat: number;
  toggleControl: (playerId: number) => void;
  setActiveSeat: (playerId: number) => void;
  skipTurn: () => void;

  accounts: Record<string, PlayerAccount>;
  updateCoins: (playerName: string, delta: number) => void;

  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;

  settings: AppSettings;
  updateSettings: (s: Partial<AppSettings>) => void;

  startGame: () => void;
  startSpectate: () => void;
  makeBid: (action: 'bid' | 'pass', score?: number) => void;
  playCards: (cards: Card[] | null) => void;
  passTurn: () => void;
  endGame: () => void;

  // 互动系统（R5 催促 / R6 嘲讽 / R7 番茄·倒水·送花）
  interactions: InteractionEvent[];
  typing: { from: number; to: number } | null;
  pushInteraction: (e: Omit<InteractionEvent, 'id' | 'ts'>) => void;
  setTyping: (t: { from: number; to: number } | null) => void;
  triggerUrge: (from: number, to: number, text: string) => void;
  triggerTaunt: (from: number, to: number) => void;
  triggerAction: (from: number, to: number, action: ActionType) => void;
  clearInteractions: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  currentPage: persisted?.guideCompleted ? 'lobby' : 'guide',
  setPage: (page) => set({ currentPage: page }),

  guideCompleted: persisted?.guideCompleted ?? false,
  setGuideCompleted: () => { set({ guideCompleted: true }); persist(); },

  gameMode: 'human_vs_ai',
  setGameMode: (mode) => set({ gameMode: mode }),

  gameHall: persisted?.settings?.gameHall ?? 'beginner',
  setGameHall: (hall) => { set({ gameHall: hall }); persist(); },

  gameMachine: null,
  aiController: null,

  phase: GamePhase.DEALING,
  players: [],
  bottomCards: [],
  currentPlayerId: 0,
  lastPlayedCards: [],
  lastPlayedBy: -1,
  multiplier: 1,
  landlordId: null,

  settlement: null,
  winnerId: null,

  selectedCards: [],
  setSelectedCards: (cards) => set({ selectedCards: cards }),

  // 互动系统状态
  interactions: [],
  typing: null,

  aiThinking: null,
  aiReasoningHistory: [],
  aiDegraded: {},

  showBombEffect: false,
  showRocketEffect: false,

  gameSpeed: 1,
  isPaused: false,
  setSpeed: (speed) => { set({ gameSpeed: speed }); get().aiController?.setSpeed(speed); },
  setPaused: (paused) => { set({ isPaused: paused }); get().aiController?.setPaused(paused); },
  stepOnce: () => { get().aiController?.stepOnce(); },

  modelError: null,
  showModelError: (err) => { set({ modelError: err }); get().setPaused(true); },
  clearModelError: () => set({ modelError: null }),
  reloadModel: (playerId) => {
    get().aiController?.reloadEngine(playerId);
    set({ modelError: null });
    get().setPaused(false);
  },

  skipCurrentTurn: () => {
    const controller = get().aiController;
    // 先用规则兜底完成当前 AI 本回合，再恢复
    controller?.forceFallbackStep();
    set({ modelError: null });
    get().setPaused(false);
  },

  controlledSeats: [0],
  activeSeat: 0,
  toggleControl: (playerId) => {
    set((s) => {
      const has = s.controlledSeats.includes(playerId);
      const controlledSeats = has
        ? s.controlledSeats.filter(id => id !== playerId)
        : [...s.controlledSeats, playerId];
      // 接管时把视角切到该座位；交还时若视角正是它则切回 0
      const activeSeat = has ? (s.activeSeat === playerId ? 0 : s.activeSeat) : playerId;
      return { controlledSeats, activeSeat };
    });
  },
  setActiveSeat: (playerId) => set({ activeSeat: playerId }),
  skipTurn: () => {
    const machine = get().gameMachine;
    if (machine && machine.getGameState().phase === GamePhase.PLAYING) {
      try { machine.playCards(null); } catch (e) { console.error('跳过失败:', e); }
    }
  },

  accounts: persisted?.accounts ?? {
    '前方': { name: '前方', coins: 1000, totalGames: 0, totalWins: 0 },
    'AI-下家': { name: 'AI-下家', coins: 1000, totalGames: 0, totalWins: 0 },
    'AI-上家': { name: 'AI-上家', coins: 1000, totalGames: 0, totalWins: 0 },
  },
  updateCoins: (playerName, delta) => {
    set((s) => {
      const acc = s.accounts[playerName];
      if (!acc) return s;
      return { accounts: { ...s.accounts, [playerName]: { ...acc, coins: acc.coins + delta } } };
    });
    persist();
  },

  theme: persisted?.settings?.theme ?? 'classic',
  setTheme: (theme) => { set({ theme }); persist(); },

  settings: {
    theme: 'classic', backupPath: '', soundEnabled: true, gameHall: 'beginner',
    defaultSpeed: 1, mockEnabled: true, aiInteractionFreq: 60,
    customTaunts: [], tauntRate: 1.1, tauntPitch: 1.0,
    ...(persisted?.settings ?? {}),
  },
  updateSettings: (s) => {
    set((prev) => ({ settings: { ...prev.settings, ...s } }));
    persist();
  },

  // ---------- 互动系统方法 ----------
  pushInteraction: (e) => set(s => ({
    interactions: [...s.interactions, { ...e, id: newInteractionId(), ts: Date.now() }].slice(-40),
  })),

  setTyping: (t) => set({ typing: t }),

  triggerUrge: (from, to, text) => {
    // 受 AI 互动频率（0~100）控制：概率性触发
    const freq = get().settings.aiInteractionFreq ?? 60;
    if (freq <= 0) return;
    if (Math.random() * 100 >= freq) return;
    get().setTyping({ from, to });
    setTimeout(() => {
      get().setTyping(null);
      get().pushInteraction({ from, to, kind: 'phrase', category: 'urge', text });
      audioManager.playSFX('urge');
    }, 900);
  },

  triggerTaunt: (from, to) => {
    const freq = get().settings.aiInteractionFreq ?? 60;
    if (freq <= 0) return;
    if (Math.random() * 100 >= freq) return;
    // 优先使用用户自定义话术，否则回退到默认话术库
    const settings = get().settings;
    const custom = (settings.customTaunts && settings.customTaunts.length)
      ? settings.customTaunts.map(t => t?.trim()).filter(Boolean)
      : null;
    const text = custom && custom.length
      ? custom[Math.floor(Math.random() * custom.length)]
      : pickPhrase('taunt');
    get().setTyping({ from, to });
    setTimeout(() => {
      get().setTyping(null);
      get().pushInteraction({ from, to, kind: 'phrase', category: 'taunt', text });
      audioManager.playSFX('taunt');
      // 用 TTS 朗读嘲讽话术（语速/音高可自定义）
      audioManager.speakText(text, { rate: settings.tauntRate, pitch: settings.tauntPitch });
      // 牌打得臭：扔番茄 / 倒水（负面动作）
      const action = randomNegativeAction();
      get().pushInteraction({ from, to, kind: 'action', action });
      audioManager.playSFX(ACTION_META[action].sound);
    }, 900);
  },

  triggerAction: (from, to, action) => {
    get().pushInteraction({ from, to, kind: 'action', action });
    audioManager.playSFX(ACTION_META[action].sound);
  },

  clearInteractions: () => set({ interactions: [], typing: null }),

  startGame: () => {
    const mode = get().gameMode;
    const playerNames = ['前方', 'AI-下家', 'AI-上家'];
    const machine = new GameStateMachine(playerNames);

    if (mode === 'ai_vs_ai') {
      machine.setPlayerAI(0, true);
    }
    // 人类固定农民模式：禁止座位0成为地主
    machine.setBannedLandlord(mode === 'human_farmer' ? [0] : []);

    const controller = new AIController(machine, {
      onAIThinkStart: (playerId) => set({ aiThinking: playerId }),
      onAIThinkEnd: (info) => set({
        aiThinking: null,
        aiReasoningHistory: [...get().aiReasoningHistory.slice(-20), info],
      }),
      onAIDegraded: (playerId, degraded) =>
        set((s) => ({ aiDegraded: { ...s.aiDegraded, [playerId]: degraded } })),
      onModelError: (playerId, message) => {
        get().showModelError({ playerId, message, timestamp: Date.now() });
      },
      isHumanControlled: (playerId) => useGameStore.getState().controlledSeats.includes(playerId),
      // 互动系统回调（R5/R6/R7）
      onUrge: (from, to, text) => get().triggerUrge(from, to, text),
      onTaunt: (from, to) => get().triggerTaunt(from, to),
      onAction: (from, to, action) => get().triggerAction(from, to, action),
      getInteractionFreq: () => get().settings.aiInteractionFreq ?? 60,
    });

    controller.setSpeed(get().settings.defaultSpeed ?? 1);
    controller.setTimeout(120000); // 120秒超时

    machine.on((event, data) => {
      const state = machine.getGameState();
      if (event === 'dealt') {
        audioManager.playSFX('deal');
      }
      if (event === 'bid') {
        const rec = data as BidRecord;
        if (rec.action === 'pass') {
          audioManager.playSFX('bid_pass');
        } else {
          audioManager.playSFX(`bid_${rec.score}`);
        }
      }
      if (event === 'landlordAssigned') {
        audioManager.playSFX('deal');
      }
      if (event === 'play') {
        const rec = data as PlayRecord;
        if (rec.type === CardType.Pass) {
          audioManager.playSFX('pass');
        } else {
          // 炸弹/火箭的特效音已在专属事件播放；普通出牌甩出音
          if (rec.type !== CardType.Bomb && rec.type !== CardType.Rocket) {
            audioManager.playSFX('card_play');
          }
          // 报牌语音
          audioManager.playCardVoice(rec.type, rec.cards[0]?.rank);
        }

        // 动态 BGM：根据人类玩家（座位0）剩余牌数判断顺风/逆风
        if (!state.players[0].isAI && state.phase === GamePhase.PLAYING) {
          const mine = state.players[0].hand.length;
          const oppMin = Math.min(state.players[1].hand.length, state.players[2].hand.length);
          if (mine > oppMin * 1.5) {
            audioManager.playBGM('disadvantage');
          } else if (mine < oppMin * 0.5) {
            audioManager.playBGM('advantage');
          } else {
            audioManager.playBGM('balanced');
          }
        }

        // —— 互动（R6/R7）：判定"打得臭"触发嘲讽+动作；即将获胜触发点赞送花 ——
        if (state.phase === GamePhase.PLAYING) {
          const actor = state.players[state.currentPlayerIndex];
          const hand = actor?.hand ?? [];
          const beaten = lastLeadRef;
          const res = detectBadPlay(hand, rec, beaten?.cards ?? null, beaten?.type ?? null);
          if (res.bad) {
            const taunter = state.players.find(p => p.id !== actor.id && p.isAI)
              ?? state.players.find(p => p.id !== actor.id);
            if (taunter) get().triggerTaunt(taunter.id, actor.id);
          } else if (rec.type !== CardType.Pass && hand.length > 0 && hand.length <= 2) {
            const praiser = state.players.find(p => p.id !== actor.id && p.isAI)
              ?? state.players.find(p => p.id !== actor.id);
            if (praiser) {
              get().pushInteraction({ from: praiser.id, to: actor.id, kind: 'phrase', category: 'praise', text: pickPhrase('praise') });
              audioManager.playSFX('taunt');
              get().triggerAction(praiser.id, actor.id, 'flower');
            }
          }
        }

        // 维护"被压领出牌"线索（pass 时线索不变；出牌后更新为本次出牌）
        if (rec.type !== CardType.Pass && rec.cards.length > 0) {
          const t = identifyCardType(rec.cards);
          if (t) lastLeadRef = { cards: rec.cards, type: t };
        }
      }
      if (event === 'bomb') {
        audioManager.playSFX('bomb');
        set({ showBombEffect: true });
        setTimeout(() => set({ showBombEffect: false }), 800);
      }
      if (event === 'rocket') {
        audioManager.playSFX('rocket');
        set({ showRocketEffect: true });
        setTimeout(() => set({ showRocketEffect: false }), 1000);
      }
      if (event === 'turnChange') {
        const st = machine.getGameState();
        if (st.lastPlayedBy === -1) lastLeadRef = null; // 新一圈开始，清空领出线索
      }
      if (event === 'gameOver') {
        const { result, winnerId } = data as { winnerId: number; result: SettlementResult };
        set({ settlement: result, winnerId });
        const hallConfig = HALL_CONFIG[get().gameHall];
        const unit = result.totalMultiplier * hallConfig.multiplier * 10;
        const winnerRole = state.players[winnerId]?.role;
        state.players.forEach(p => {
          let delta = 0;
          if (p.role === 'landlord') {
            // 地主输赢都是两份
            delta = (winnerRole === 'landlord') ? 2 * unit : -2 * unit;
          } else {
            // 农民：地主赢则输一份，农民赢则赢一份
            delta = (winnerRole === 'landlord') ? -unit : unit;
          }
          if (delta !== 0) get().updateCoins(p.name, delta);
        });

        // 人类玩家（座位0）胜负音效；观战模式统一播放胜利
        const humanRole = state.players[0].role;
        const humanWin = state.players[0].isAI || winnerRole === humanRole;
        audioManager.playBGM(humanWin ? 'win' : 'lose');
        audioManager.playSFX(humanWin ? 'win' : 'lose');
      }
      set({
        phase: state.phase,
        players: state.players.map(p => ({
          id: p.id, name: p.name, hand: p.hand, role: p.role,
          remaining: p.hand.length, isAI: p.isAI,
          isManaged: get().controlledSeats.includes(p.id),
        })),
        bottomCards: state.bottomCards,
        currentPlayerId: state.players[state.currentPlayerIndex].id,
        lastPlayedCards: state.lastPlayedCards,
        lastPlayedBy: state.lastPlayedBy,
        multiplier: state.multiplier,
        landlordId: state.landlordId,
      });
    });

    machine.deal();
    lastLeadRef = null;
    audioManager.playBGM('balanced');

    set({
      gameMachine: machine, aiController: controller,
      settlement: null, winnerId: null, selectedCards: [],
      showBombEffect: false, showRocketEffect: false,
      aiReasoningHistory: [], aiDegraded: {}, aiThinking: null,
      controlledSeats: mode === 'ai_vs_ai' ? [] : [0],
      activeSeat: 0, modelError: null,
      gameSpeed: get().settings.defaultSpeed ?? 1,
    });
    controller.start();
  },

  startSpectate: () => { set({ gameMode: 'ai_vs_ai' }); get().startGame(); },

  makeBid: (action, score = 0) => {
    const { gameMachine } = get();
    if (!gameMachine) return;
    try {
      gameMachine.bid(action, score);
      audioManager.playSFX(action === 'bid' ? `bid_${score}` : 'bid_pass');
    } catch (err) { console.error('叫分失败:', err); }
  },

  playCards: (cards) => {
    const { gameMachine } = get();
    if (!gameMachine) return;
    try {
      gameMachine.playCards(cards);
      audioManager.playSFX('card_play');
      set({ selectedCards: [] });
    } catch (err) { console.error('出牌失败:', err); }
  },

  passTurn: () => get().playCards(null),

  endGame: () => {
    get().aiController?.stop();
    set({
      gameMachine: null, aiController: null,
      settlement: null, winnerId: null,
      phase: GamePhase.DEALING, players: [], bottomCards: [],
      aiThinking: null, aiReasoningHistory: [], modelError: null,
    });
    audioManager.playBGM('menu');
  },
}));

function persist() {
  const s = useGameStore.getState();
  const data = {
    guideCompleted: s.guideCompleted,
    settings: s.settings,
    accounts: s.accounts,
  };
  try { localStorage.setItem('landlord-ai-settings', JSON.stringify(data)); } catch {}
}
