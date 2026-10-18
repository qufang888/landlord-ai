# 弈牌AI

AI 驱动的智能斗地主桌面游戏 —— 严格还原《欢乐斗地主》的玩法与互动体验。

## 特性

- **三种对战模式**：人机对战 / 合作农民（人类固定农民）/ AI 观战
- **LLM 驱动的 AI 决策**，支持多种大模型接入
- **模型配置中心（R1）**：可保存大量模型配置，支持分类、贴标签、关键词搜索快速定位；支持增删改查、一键复制，并能把任意配置指派给某个 AI 座位（座位 1 / 座位 2；座位 0 为本地人类）
- **全输入框可用（R2）**：已修复此前「点击无反应、只能复制粘贴」的问题，所有输入框、文本域、下拉框现在均可正常输入与修改
- **15 套主题配色（R3）**：在原有 5 套基础上扩展到 15 套互不雷同、配色协调的主题
- **完整音效（R4）**：发牌 / 出牌 / 不出 / 炸弹 / 王炸 / 叫分 / 轮次提示 / 胜负 等全部音效已补全；报牌语音由浏览器语音合成朗读；当缺少真实音频文件时自动回退到 Web Audio 程序化合成
- **AI 催促互动（R5）**：当另一位玩家（可能是 AI，也可能是真人）超过 15 秒未出牌时，按设置项「AI 互动频率（0%~100%）」的概率触发催促音效 + AI「码字」动画 + 固定话术（如「快一点呀」）
- **AI 嘲讽（R6）**：某玩家牌打得特别臭时，AI 会发送固定话术嘲讽；AI 之间、玩家与 AI 之间只能通过固定的几个话语交流，不能直接自由聊天
- **动作系统（R7）**：玩家与 AI 可互相做动作 —— 扔番茄 🍅、倒水桶 🪣、送鲜花 🌹（严格对应《欢乐斗地主》的三种互动物品）；牌打得特别差时 AI 也会对对方做这些动作
- **严格还原（R8）**：所有话术 / 动作 / 音效均贴合《欢乐斗地主》已知公开体系，不杜撰、不瞎编
- **嘲讽语音自定义（新增）**：在「设置 → 编辑嘲讽语音」中可逐条增删改嘲讽话术，并实时试听；支持调整语速 / 音高。AI 嘲讽时用浏览器 TTS 朗读当前话术（自定义优先，留空则回退默认话术库）
- **无边框窗口 + 自定义标题栏（新增）**：桌面端采用 `frame: false` 无边框窗口，由软件自绘标题栏（最小化 / 最大化 / 关闭 + 拖拽区），配色跟随主题，不再是系统原生窗口
- **启动画面（新增）**：`index.html` 内置渐变启动屏 + 加载动画，主窗口 `show: false` 并在 `ready-to-show` 后再显示，彻底消除原生黑框 / 空白闪烁；若加载较慢也有启动画面陪你等待
- **获取模型 / 调用修复（新增）**：所有外部 LLM 请求改由 Electron 主进程 Node `fetch` 发起（IPC 桥接），彻底规避渲染进程 CORS 导致的「获取模型失败 / 点一下秒报错」问题；OpenAI / Claude / Gemini 三种提供商的获取模型与对话均已走主进程通道

## 技术栈

| 模块 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript(strict) + Tailwind CSS + Vite |
| 状态管理 | Zustand |
| 游戏引擎 | 纯 TypeScript（零依赖） |
| 音频 | Howler.js（有真实文件优先）+ Web Audio API 程序化合成回退；报牌语音用 Web Speech API |
| 桌面端 | Electron |
| AI 接入 | 自建 LLM 适配层 |

## 支持的 LLM 提供商

- **OpenAI 兼容**：OpenAI / Ollama / vLLM / LM Studio（自定义 BaseURL）
- **Claude**：Anthropic 原生 API
- **Gemini**：Google Generative AI

## 互动系统说明（R5/R6/R7）

- **交流方式**：仅限固定话术库（`src/game/interactions.ts` 的 `PHRASE_BANK`，分 urge 催促 / taunt 嘲讽 / praise 点赞三类），绝不出现自由文本聊天。
- **互动物品**：仅三种 —— 番茄🍅（负面）/ 水桶🪣（负面）/ 鲜花🌹（正面），对应 `ACTION_META`。
- **触发规则**：
  - 催促：轮到「人类接管」的座位超过 15 秒未出牌，按互动频率概率触发。
  - 嘲讽：通过规则判定「打得臭」（该压没压 / 用炸弹压小牌浪费），不调用 LLM；命中后 AI 发送嘲讽话术并补一个负面动作。
  - 点赞送花：某玩家即将获胜（仅剩 ≤2 张）时触发正面话术与送花。

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式启动
npm run dev

# 构建 Web 版本
npm run build

# 启动 Electron 桌面版
npm run electron:dev

# 打包 Windows 安装包
npm run electron:build
```

## 项目结构

```
landlord-ai/
├── src/
│   ├── core/              # 游戏引擎（纯逻辑）
│   │   ├── types.ts       # 类型定义
│   │   ├── deck.ts       # 牌堆、洗牌、发牌
│   │   ├── rules.ts       # 牌型识别 + 大小比较
│   │   ├── state-machine.ts  # 游戏状态机
│   │   ├── scorer.ts     # 计分系统
│   │   └── replay.ts     # 对局回放
│   ├── ai/               # AI 决策引擎（含 15s 催促计时器）
│   ├── llm/              # LLM 适配层
│   ├── game/
│   │   └── interactions.ts  # 互动领域层：话术库 / 动作元数据 / 打得臭判定
│   ├── audio/            # 音效系统（synth.ts 程序化合成 + audio-manager.ts 回退）
│   ├── store/
│   │   └── game-store.ts  # 状态 + 互动方法（triggerUrge/triggerTaunt/triggerAction）
│   ├── ui/
│   │   ├── pages/         # 含 ModelCenterPage（模型配置中心）
│   │   └── components/    # 含 InteractionLayer（气泡/码字/飞行动画）、OpponentPanel（动作按钮）、TauntEditorModal、TitleBar
│   └── lib/
│       └── electron-http.ts  # 渲染进程 HTTP 桥（经主进程 Node fetch 规避 CORS）
├── electron/
│   ├── main.cjs          # Electron 主进程（无边框窗口 / HTTP 桥 / 窗口控制）
│   └── preload.cjs       # 安全暴露 API 给渲染进程
├── assets/               # 音频、图片资源
├── scripts/              # 工具脚本（含 github-init / push-via-api）
└── tests/                # 单元测试
```

## 游戏规则

- 54 张牌（含大小王），3 家各 17 张，3 张底牌
- 叫分制：1/2/3 分，最高分者为地主
- 14 种牌型完整支持
- 炸弹 ×2 翻倍，王炸 ×4
- 春天 / 反春天 ×2

## 发布到 GitHub（受限网络）

`scripts/` 下提供了两种推送方式：

- **`github-init.sh` / `github-init.cmd`**：标准 git 推送流程，适用于可直连 `github.com` 的环境。
- **`push-via-api.mjs`**：当网络代理只允许 `api.github.com`、禁止 `github.com` 的 git 协议隧道（CONNECT 502）时，改用 GitHub Git Database REST API 逐文件推送。用法：

  ```bash
  export GH_PAT=ghp_你的token
  node scripts/push-via-api.mjs
  ```

> 说明：若仓库为空，脚本会先用 Contents API 播种首个 commit，再走 Git Database API。

## License

[MIT](./LICENSE) © 2026 前方
