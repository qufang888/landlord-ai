# 弈牌AI — 架构设计规格（需求 R1–R9）

> 作者：软件架构师（高见远）　|　目标读者：工程实现团队　|　状态：待评审
> 技术栈：React 18 + TypeScript(strict) + Vite + Tailwind + Zustand + Howler.js + Electron；游戏引擎为纯 TS。
> 约束：`npm run build` = `tsc && vite build`，必须 **tsc 零错误**（strict=true / noFallthroughCasesInSwitch）。

---

## 0. 现状与关键发现（基于源码通读）

| 项 | 现状 | 影响的需求 |
|---|---|---|
| 输入框失效 | `src/index.css` 中 `body { user-select: none }` 全局禁用文本选择/光标；**未发现**全局 `keydown` 拦截、未发现遮挡层、`pointer-events` 未被禁用 | R2 |
| 主题应用 | `THEME_CONFIG` 仅 5 套；且 `index.css` 的 `.table-bg` 类**硬编码绿色渐变**，会覆盖主题背景，导致切主题不生效（隐藏 bug） | R3 |
| 音频素材 | `public/` 与 `assets/audio/` 均无音频文件；`audio-manager` 对 `onloaderror` 静默忽略——天然形成"文件缺失→兜底"接缝 | R4 |
| 模型配置 | `llm/config.ts` 仅按座位存 `LLMConfig`（`seats`/`defaultConfig`），无"配置库/标签/搜索/复制"概念 | R1 |
| 互动系统 | 无催促/嘲讽/动作；`OpponentPanel` 仅有"思考中🤔"和"降级⚠"标记；`GameStateMachine` 事件（`turnChange`/`play`/`bid`）已暴露，是集成点 | R5/R6/R7 |
| 报牌语音 | `scripts/generate-voice.ts` 已有 `VOICE_TEXT_MAP`（如 `'三'`/`'一对'`/`'炸弹！'`），是语音文本的唯一权威来源 | R4/R8 |

---

## 1. 整体方案（各需求实现思路与关键技术决策）

### R1【模型配置中心】
**思路**：把"按座位配置"升级为"配置库（Profile）+ 座位绑定（Assignment）"两层。
- 新增 `ModelProfile`（`id/name/category/tags/config/isFavorite/notes/时间戳`），由新类 `ModelProfileManager` 统一做 CRUD、复制（duplicate）、按 `name/tag/category` 搜索，持久化到 `localStorage['landlord-ai-model-profiles']`。
- 座位绑定：`AppSettings` 新增 `seatProfiles: Record<number, string|null>`（座位→profileId），座位 1/2 为 AI（座位 0 在 `ai_vs_ai` 观战模式下也是 AI，同样支持）。
- 解析：`AIController.buildEngines()` 当前调用 `llmConfigManager.getSeatConfig(seatId)`；改为经 `resolveSeatConfig(seatId)` → 优先取 `seatProfiles[seatId]` 对应 Profile 的 `config`，回退到 `defaultConfig`。**保证向后兼容**（旧存档无 `seatProfiles` 时回退原逻辑）。
- UI：新增独立页面 `ModelLibraryPage`（不塞进 `SettingsPage` 以免文件过大、冲突集中），提供：搜索框、标签/分类筛选、增删改查表单、复制按钮、以及每条 Profile 的"指派给座位1/座位2"下拉。

### R2【修复所有输入框】
**根因确认**：唯一根因是 `body { user-select: none }`。经 Grep 确认：无全局 `keydown` 拦截、无全屏遮挡层、`pointer-events` 未被禁用、`overflow:hidden` 不影响输入。
**修复方案**（仅改 `src/index.css`）：对表单元素放开选择/光标——
```css
input, textarea, select, [contenteditable="true"], [contenteditable=""] {
  user-select: text;
  -webkit-user-select: text;
  cursor: text;
}
```
> 说明：Electron/Chromium 下 `user-select:none` 会令 `<input>` 无法定位光标、表现为"点了没反应、只能粘贴"，放开后即恢复。若后续仍异常，再排查是否存在 `z-index` 遮挡（本次未发现）。

### R3【15 套主题配色】
- 扩展 `ThemeName` 类型至 15 个（保留原 5 个 + 新增 10 个：`emerald/ crimson/ sunset/ purple/ mint/ rose/ slate/ gold/ ocean/ lavender`）。
- 扩展 `THEME_CONFIG`（类型 `Record<ThemeName, ThemeConfig>`，字段 `name/bg/tableBg/primary`），给出互不雷同的配色（见 §3 表）。
- **必须修复 `.table-bg` 硬编码**：改为读取 CSS 变量 `var(--table-bg)`，并在 `App.tsx` 根节点按当前主题写入 `--table-bg`/`--app-bg`/`--app-primary` 三个变量；`GamePage`/`SettingsPage` 的 `table-bg` 类改为只设置 `background: var(--table-bg)`。否则新主题不会真正显示。
- `SettingsPage` 主题网格当前 `grid-cols-5`：15 个 → 3 行，保留 `grid-cols-5`（或改 `grid-cols-3` 让卡片更大，二选一，建议保留 5 列）。
- i18n：为 10 个新主题名在 10 种语言各补一条 key（键名即 ThemeName，如 `t('crimson')`）。

### R4【补全所有音效 — 运行时合成】
**策略**：保留"有真实文件用文件、没有用合成"的回退；新增两条合成通道。
- 新增 `src/audio/synth.ts`：`SynthEngine` 持有共享 `AudioContext`，用振荡器程序化合成：
  - **SFX**（短促音效）：`deal/card_play/pass/bomb/rocket/bid_1/2/3/bid_pass/turn_notify/win/lose`，以及互动新增的 `urge/taunt/action_tomato/action_water/action_flower/applause/boo`。用不同波形（sine/square/triangle/noise）+ 包络（attack/decay）区分。
  - **BGM**（循环场景）：`menu/balanced/advantage/disadvantage/win/lose`，用少量振荡器按预设音序循环（轻量，避免高 CPU）。
- 新增 `src/audio/voice-synth.ts`：`VoiceSynth` 用 `window.speechSynthesis` 朗读中文报牌文本；文本来源直接复用 `scripts/generate-voice.ts` 的 `VOICE_TEXT_MAP`（`'三'`/`'一对'`/`'炸弹！'`…）。需：异步 `getVoices()` 后选定 `zh-CN` 语音；不支持时静默 no-op；暴露 `speakCard(type, rank?)` 与 `speakText(text)`。
- 修改 `audio-manager.ts`：用 `loadedHowls: Set<string>` 在 Howl `'load'` 事件登记成功加载的项；`playSFX/playBGM` 若未成功加载则转调 `SynthEngine`；`playCardVoice` 若语音 Howl 未加载则转调 `VoiceSynth`。**回退逻辑完全保留**。
- `sound-map.ts`：为互动新增的 SFX id 补占位路径（可为空串，合成兜底）。

### R5【AI 催促互动】
- `AppSettings` 新增 `interactionFrequency: number`（0–100，默认 60）。
- 在"互动模块"（`src/interaction/engine.ts`）内维护**回合计时器**：订阅状态机 `turnChange`→对当前玩家起 15s 计时；若 15s 内无任何出牌/叫分/换手事件，则按概率 `Math.random()*100 < interactionFrequency` 触发催促。
- 触发表现：① 播放 `urge` 音效；② 令某个 AI 座位显示"码字中…"打字动画（`typingId`）约 1.5s；③ 弹出固定催促话术气泡（取自 `URGE_PHRASES`）。
- 适用对象：人类或 AI 超过 15s 未行动都会触发（需求明确"可能是 AI 也可能是真人"）；催促方取"另一名 AI/对手"。

### R6【AI 嘲讽】
- 纯规则判定（**不调 LLM**），放在 `src/interaction/play-judge.ts` 的 `judgePlay(state, playerId, decision)`，返回 `PlayJudgement`：
  - `should_press_but_pass`：该玩家本可压过上家（`FallbackAI.findMinBeat` 思想/公开辅助）却选择 pass，且受益方为其**对手阵营**。
  - `let_opponent_go`：该玩家手牌很多（≥10）却 pass，而下家是手牌很少（≤5）的对手（放走濒临获胜的对手）。
  - `wasted_bomb` / `broke_combo`（可选、低优先级、标 `derived`）：过早炸、拆顺子等，阈值保守。
- 判定为 `bad` 时：从嘲讽方发出一条固定话术（`TAUNT_PHRASES`）+ 一个负面动作（番茄/水）。`good` 时发赞赏话术 + 送花。
- **约束**：所有交流只能走 `InteractionPhrase` 固定集合，严禁自由文本。

### R7【动作系统】
- 严格对应《欢乐斗地主》三种互动动作：`tomato`(扔番茄🍅)、`water`(倒水桶🪣)、`flower`(送花🌹)。
- 数据：`PlayerAction { type, fromId, toId, timestamp }`；触发后产生一条 `InteractionEvent`（`kind:'action'`）驱动飞行动画。
- 人机双向：① AI 在 R6 判定后自动对"打得差"的玩家做番茄/水、对"打得好"的做送花；② 人类可在 `OpponentPanel` 上对每个对手点出三个动作按钮主动发起。
- UI：新增 `ActionAnimation.tsx`，从中线向目标座位飞出 🍅/🪣/🌹 的 CSS 动画（~1s），并播放对应合成音效。

### R8【严格还原】
- 话术/动作/音效必须贴合《欢乐斗地主》真实体系；所有条目在 §4 标注来源：`given`（需求示例明确给出）、`hl-known`（欢乐斗地主公开预设聊天/表情体系公认条目）、`derived`（基于上述体系的合理派生，已注明）。
- 三动作（番茄/水/花）为游戏公认表情动作，直接采用；话术优先采用游戏公开"快捷消息"与"文字表情"集合（如"要不起""和你合作真愉快""你的牌打得也太好了""该你出牌了"）。不确定内容一律标 `derived` 并建议在实现前由产品核对官方素材。

### R9【GitHub 新项目】
- **更新 README**：在现有 README 基础上补充 R1–R8 新增特性（模型库、15 主题、运行时合成音效、催促/嘲讽/动作互动）、技术栈与项目结构微调。
- **建库脚本**（网络受限时退化为"可直接 push 的说明"）：新增 `scripts/github-init.sh`（及 Windows `scripts/github-init.cmd`），流程：`git init` → `git add -A` → `git commit` → 通过 `gh repo create` 或 GitHub REST API（`curl -X POST`）建私有/公开仓 → `git push -u origin main`。脚本内置"若 `gh`/网络不可用则打印手动 push 指令"的降级分支。
- 本规格**只设计不执行**；实际建库与 README 改写归入实现阶段（见 §3 任务 T-R9）。

---

## 2. 数据模型（TS 接口，仅签名/类型，不含实现）

```ts
// ===== R1 模型配置中心 =====
import type { LLMConfig } from '../llm/provider';

export interface ModelProfile {
  id: string;                 // 唯一 id（crypto.randomUUID）
  name: string;               // 用户命名，如 "本地 Qwen2.5-7B"
  category: string;           // 分类："本地推理" | "云端商用" | "免费试用" | 自定义
  tags: string[];             // 标签：["快","便宜","多模态"]
  config: LLMConfig;          // 实际连接配置
  isFavorite: boolean;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export type SeatAssignment = Record<number, string | null>; // seatId -> profileId

// ===== R3 主题 =====
export type ThemeName =
  | 'classic' | 'dark' | 'blue' | 'wood' | 'neon'
  | 'emerald' | 'crimson' | 'sunset' | 'purple' | 'mint'
  | 'rose' | 'slate' | 'gold' | 'ocean' | 'lavender';
export interface ThemeConfig { name: string; bg: string; tableBg: string; primary: string; }

// ===== R5/R6/R7 互动 =====
export type InteractionKind = 'urge' | 'taunt' | 'applaud' | 'boo' | 'action';
export type ActionType = 'tomato' | 'water' | 'flower';

export interface InteractionPhrase {
  id: string;
  kind: InteractionKind;       // urge/taunt/applaud 用于话术；action 用于动作
  text: string;                // 固定话术（中文）
  source: 'given' | 'hl-known' | 'derived'; // 来源标注（R8）
}

export interface PlayerAction {
  type: ActionType;
  fromId: number;
  toId: number;
  timestamp: number;
}

export interface InteractionEvent {
  id: string;
  kind: InteractionKind;
  fromId: number;
  toId?: number;               // action 必填；纯话术可空
  text?: string;               // 话术内容
  action?: ActionType;         // 动作类型
  timestamp: number;
}

export interface PlayJudgement {
  quality: 'good' | 'neutral' | 'bad';
  reason?: 'should_press_but_pass' | 'let_opponent_go' | 'wasted_bomb' | 'broke_combo';
  suggestedAction?: ActionType;      // bad→tomato/water；good→flower
  suggestedPhraseKind?: 'taunt' | 'applaud';
}
```

`AppSettings`（在 `game-store.ts` 现有接口内扩展）新增字段：
```ts
export interface AppSettings {
  // 现有字段保留…
  theme: ThemeName;
  // —— 新增 ——
  interactionFrequency: number;     // 0–100，AI 互动频率（R5）
  seatProfiles: SeatAssignment;     // 座位→模型 Profile 绑定（R1）
}
```

`game-store` 新增互动相关 state（集中一处，避免散落）：
```ts
interactions: InteractionEvent[];   // 最近若干条气泡/动作事件
typingId: number | null;            // 正在"码字中…"的座位
actionAnim: PlayerAction | null;    // 当前正在播放的飞行动画
pushInteraction: (e: InteractionEvent) => void;
clearTyping: () => void;
setTyping: (id: number | null) => void;
playAction: (a: PlayerAction) => void;
```

---

## 3. 文件清单与改动点（含依赖、实现顺序、冲突规避）

### 3.1 文件改动表

| 文件 | 操作 | 归属 | 依赖 | 说明 |
|---|---|---|---|---|
| `src/index.css` | 改 | R2/R3/R5/R7 | — | R2：放开表单 `user-select:text`；R3：`.table-bg` 改用 `var(--table-bg)`；R5/R7：新增 `typing` 与飞行动画 keyframes |
| `src/store/game-store.ts` | 改 | R1/R3/R5/R6/R7 | 互动模块、model-profile | 扩 `AppSettings`（+`interactionFrequency`/`seatProfiles`）；新增互动 state 切片；`startGame` 内接入互动引擎；新增 `resolveSeatConfig()` 解析 Profile |
| `src/llm/model-profile.ts` | **新** | R1 | provider.ts | `ModelProfile` + `ModelProfileManager`（CRUD/复制/搜索/持久化） |
| `src/llm/config.ts` | 改 | R1 | model-profile | 保留 `LLMConfigManager`；新增读 `seatProfiles` 的解析方法 |
| `src/llm/index.ts` | 改 | R1 | model-profile | 导出 `ModelProfileManager` 单例与类型 |
| `src/ui/pages/ModelLibraryPage.tsx` | **新** | R1 | model-profile、game-store | 模型库 UI（搜索/标签/增删改/复制/指派座位） |
| `src/App.tsx` | 改 | R3 | game-store | 按主题写入 `--table-bg/--app-bg/--app-primary` CSS 变量 |
| `src/audio/synth.ts` | **新** | R4/R5/R7 | — | `SynthEngine`：振荡器合成 SFX/BGM |
| `src/audio/voice-synth.ts` | **新** | R4 | — | `VoiceSynth`：`speechSynthesis` 中文报牌 |
| `src/audio/audio-manager.ts` | 改 | R4/R5/R7 | synth、voice-synth | 加 `loadedHowls` 登记；缺失时回退合成 |
| `src/audio/sound-map.ts` | 改 | R4/R5/R7 | — | 为互动 SFX id 补占位键 |
| `src/interaction/phrases.ts` | **新** | R5/R6/R7/R8 | — | `InteractionPhrase` 固定库（§4） |
| `src/interaction/play-judge.ts` | **新** | R6/R7 | core/types、rules | `judgePlay()` 规则判定 |
| `src/interaction/engine.ts` | **新** | R5/R6/R7 | phrases、play-judge、audio | `InteractionEngine`：回合计时/催促概率/嘲讽派发/动作，向 store 推送事件 |
| `src/ui/components/SpeechBubble.tsx` | **新** | R5/R6 | game-store | 话术气泡（含"码字中…"打字态） |
| `src/ui/components/ActionAnimation.tsx` | **新** | R7 | game-store | 番茄/水/花 飞行动画 |
| `src/ui/components/OpponentPanel.tsx` | 改 | R5/R6/R7 | game-store、SpeechBubble、ActionAnimation | 显示 typing 标记 + 话术气泡 + 三个动作按钮 |
| `src/ui/pages/SettingsPage.tsx` | 改 | R3/R4 | game-store | 主题网格扩至 15；新增"AI 互动频率"滑块；可选"合成音效"提示 |
| `src/i18n/index.ts` | 改 | R1/R3/R5/R6/R7 | — | 新增 10 主题名（×10 语言）+ 互动/模型库标签（按 §3.3 分区） |
| `README.md` | 改 | R9 | — | 补充 R1–R8 特性与结构 |
| `scripts/github-init.sh` / `.cmd` | **新** | R9 | — | 建库+push 脚本（含网络受限降级） |

### 3.2 多人改动冲突规避（重点）
- **`game-store.ts`** 是最大冲突点。原则：**先冻结接口，再分区填空**。
  1. 先合入"数据模型与 state 接口"的纯类型/字段声明（§2），不改行为；
  2. R1 只动 `resolveSeatConfig()` 与 `seatProfiles` 读取；R5/R6/R7 只动"互动 state 切片 + `startGame` 内 `interactionEngine` 接线"，彼此用注释分块（`// === R1 ===` `// === Interaction ===`），互不动对方函数体。
- **`index.css`** 同理：R2（表单选择）、R3（`table-bg` 变量）、R5/R7（keyframes）各自追加独立规则块，不修改彼此选择器。
- **`i18n/index.ts`** 单文件易冲突：按 `// === R3 themes ===` / `// === R1 model ===` / `// === Interaction ===` 三个注释区块分别由对应负责人追加；合并前各自 `git pull --rebase`。
- **`SettingsPage.tsx`** 用"R1 拆到独立 `ModelLibraryPage`"把最大块移走，本文件仅承担 R3 主题网格 + R4/R5 设置项，降低冲突面。
- **互动逻辑全部收敛到 `src/interaction/`**：页面（`OpponentPanel`/`GamePage`）只做"读 store → 渲染"，不写判定/概率逻辑，避免逻辑散落多人重复实现。

### 3.3 推荐实现顺序（降低耦合、便于并行）
1. **T-R2**（孤立，先行，立竿见影）：`index.css` 放开表单选择。
2. **T-R3**（基础视觉）：主题类型/配置 + `App` 变量 + `index.css` 变量化 + `SettingsPage` 网格 + i18n 主题名。
3. **T-R4**（被 R5/R7 依赖）：`synth.ts`/`voice-synth.ts` + `audio-manager` 回退 + `sound-map` 占位。
4. **T-R5/6/7**（互动一体化，依赖 R3/R4）：建 `src/interaction/`（phrases/play-judge/engine）→ 改 `game-store` 互动切片 → 新增 `SpeechBubble`/`ActionAnimation` → 改 `OpponentPanel` → 加互动音效。
5. **T-R1**（独立模块）：`model-profile.ts` → 改 `config.ts`/`index.ts` → `ModelLibraryPage` → `game-store` 解析 → i18n。
6. **T-R8**：在 §4 库定稿时由产品/架构核对来源标注（无新文件，依附 R5/R6/R7 的 phrases.ts）。
7. **T-R9**：更 README + 写 `github-init` 脚本（最后，不阻塞功能）。

---

## 4. 固定话术 / 动作库草案（R5/R6/R7 唯一可选集合）

> 来源标注：`given`=需求示例明确给出；`hl-known`=欢乐斗地主公开"快捷消息/文字表情/表情动作"公认条目；`derived`=基于上述体系的合理派生（实现前建议核对官方素材）。

### 4.1 催促话术 `URGE_PHRASES`（kind: urge）
| 文本 | 来源 |
|---|---|
| 快一点 | hl-known |
| 该你出牌了 | given（示例） |
| 怎么还不打？ | derived |
| 别犹豫啦 | derived |
| 轮到你咯 | derived |
| 快点出牌~ | derived |

### 4.2 嘲讽话术 `TAUNT_PHRASES`（kind: taunt）
| 文本 | 来源 |
|---|---|
| 你的牌打得也太好了 | given（示例） |
| 和你合作真愉快 | given（示例） |
| 要不起吧？ | hl-known |
| 就这？ | derived |
| 牌技有待提高哦 | derived |
| 这都能放走 | derived |

### 4.3 赞赏话术 `APPLAUD_PHRASES`（kind: applaud）
| 文本 | 来源 |
|---|---|
| 打得不错 | derived |
| 配合得真好 | derived |
| 这手漂亮 | derived |
| 好牌！ | hl-known |

### 4.4 互动动作 `ACTION_EMOTES`（kind: action，严格三动作）
| 动作 | 表情 | 语义 | 来源 |
|---|---|---|---|
| `tomato` | 🍅 扔番茄 | 不满/嘲讽 | hl-known |
| `water` | 🪣 倒水桶 | 不满/浇凉水 | hl-known |
| `flower` | 🌹 送花 | 赞赏 | hl-known |

> 备注：欢乐斗地主还存在鼓掌👏、砸鸡蛋🥚、握手🤝、睡觉😴 等表情，但需求**仅指定**番茄/水/花三动作，故动作系统只实现这三种；若未来扩展，可在 `ActionType` 增加并在 `phrases.ts` 增补，不影响现有结构。

---

## 5. 待明确事项（假设与需主理人确认的取舍）

1. **R4 接受合成音而非真实素材吗？** 当前 `public/`/`assets/` 无任何音频文件。本设计默认"运行时合成（Web Audio + speechSynthesis）"即最终方案；若产品坚持要真实音效素材，需另提供素材或走 `npm run generate:voice`（依赖 `edge-tts` + 网络）生成——请确认以合成为准。
2. **R9 建库方式**：本机网络大概率受限，默认交付"README 更新 + `github-init` 脚本 + 手动 push 说明"，**不**在本地自动 `gh`/REST 建库。是否允许我（或脚本）尝试真实 API 调用，还是仅产出脚本？
3. **`interactionFrequency` 默认值**：暂定 60（%）。是否合适？是否需要在设置页提供 0–100 滑块（默认是）。
4. **R6 判定阈值**：`let_opponent_go` 采用"手牌≥10 且下家≤5"、`should_press_but_pass` 仅当受益方为对手阵营——阈值是否需产品微调？是否要避免"嘲讽人类玩家"引发体验问题（建议：对人类也照常，但频率受 `interactionFrequency` 约束）。
5. **R3 主题命名/配色**：15 套名称与配色为我拟定，是否需 UI/产品确认具体色值（§3.1 表提供初稿）。
6. **语音可用性**：Electron Chromium 支持 `speechSynthesis`，但中文语音依赖宿主机；若宿主机无中文 TTS 语音，报牌语音将静默。是否接受"无中文语音时自动降级为无声"（默认接受）？
7. **i18n 工作量**：R3（10 主题名 ×10 语言）+ R1/R5/R6/R7 标签量较大，是否允许非中文语言先用占位/机翻，后续补译？
8. **座位 0 是否纳入模型库指派**：默认仅 AI 座位 1/2 可指派；`ai_vs_ai` 观战模式下座位 0 也是 AI，是否一并放开指派（建议放开）？

---

## 附录：互动模块集成时序（R5/R6/R7）

```
状态机事件 ──▶ game-store 订阅 ──▶ interactionEngine.onEvent(event, data, state)
                                        │
                ┌───────────────────────┼───────────────────────┐
            turnChange               play (出牌)              bid
                │                        │                        │
         起 15s 计时              judgePlay(decision)       清除计时
                │                   quality=bad/good?              │
       15s 未行动？                  │ 是 → 选嘲讽/赞赏方            │
                │                   push InteractionEvent            │
       概率<frequency?              （话术 + 动作 tomato/water/flower）
                │                        │
          typingId=AI, 1.5s              ▼
          播放 urge 音效          game-store.interactions 更新
                │                        │
          弹催促气泡              OpponentPanel/SpeechBubble/ActionAnimation 渲染
```

> 所有判定/概率/选词逻辑只在 `src/interaction/` 内；`game-store` 仅转发事件与持有 state；页面只消费 state 渲染——这是避免多人改动冲突的核心架构约束。
