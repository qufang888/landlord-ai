/**
 * 互动渲染层（R5/R6/R7）
 *
 * - 话术气泡：渲染「催促 / 嘲讽 / 点赞」固定话语，出现在发起座位旁。
 * - 码字动画：AI 出话术前先显示「…」打字气泡（typing 由 store 控制）。
 * - 飞行动作：番茄🍅 / 水桶🪣 / 鲜花🌹 从发起座位飞向目标座位。
 *
 * 座位锚点（相对于 GamePage 的 relative 容器）：
 *   seat 0 —— 人类（底部中央，手牌上方）
 *   seat 1 —— 左对手（左侧，中部）
 *   seat 2 —— 右对手（右侧，中部）
 */
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/game-store';
import { InteractionEvent, ActionType, ACTION_META } from '../../game/interactions';

const ANCHOR: Record<number, React.CSSProperties> = {
  0: { left: '50%', transform: 'translateX(-50%)', bottom: '210px' },
  1: { left: '96px', top: '30%' },
  2: { right: '96px', top: '30%' },
};

// 飞行动作方向向量（从 from 指向 to，单位：px）
const FLY_DELTA: Record<string, { dx: number; dy: number; rot: number }> = {
  '0>1': { dx: -340, dy: -120, rot: -360 },
  '0>2': { dx: 340, dy: -120, rot: 360 },
  '1>0': { dx: 340, dy: 130, rot: 360 },
  '2>0': { dx: -340, dy: 130, rot: -360 },
  '1>2': { dx: 360, dy: 0, rot: 360 },
  '2>1': { dx: -360, dy: 0, rot: -360 },
  '0>0': { dx: 0, dy: -120, rot: 0 },
  '1>1': { dx: 0, dy: -110, rot: 0 },
  '2>2': { dx: 0, dy: -110, rot: 0 },
};

const PHRASE_TTL = 4000;
const ACTION_TTL = 1200;

interface Bubble {
  key: string;
  event: InteractionEvent;
}

const CATEGORY_STYLE: Record<string, string> = {
  urge: 'bg-blue-500/90 border-blue-300',
  taunt: 'bg-red-500/90 border-red-300',
  praise: 'bg-emerald-500/90 border-emerald-300',
};

export default function InteractionLayer() {
  const interactions = useGameStore((s) => s.interactions);
  const typing = useGameStore((s) => s.typing);

  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const seen = useRef<string>('');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const last = interactions[interactions.length - 1];
    if (!last || last.id === seen.current) return;
    seen.current = last.id;
    const ttl = last.kind === 'action' ? ACTION_TTL : PHRASE_TTL;
    const b: Bubble = { key: last.id, event: last };
    setBubbles((prev) => [...prev, b].slice(-14));
    const timer = setTimeout(() => {
      setBubbles((prev) => prev.filter((x) => x.key !== b.key));
    }, ttl);
    timers.current.push(timer);
  }, [interactions]);

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      {/* 码字（typing）指示 */}
      {typing && (
        <div
          className="absolute"
          style={ANCHOR[typing.from] ?? ANCHOR[0]}
        >
          <div className="inline-flex items-center gap-1 rounded-2xl bg-black/60 border border-white/30 px-3 py-2">
            <span className="typing-dots text-white text-lg leading-none">
              <span>.</span><span>.</span><span>.</span>
            </span>
          </div>
        </div>
      )}

      {/* 话术气泡 + 飞行动作 */}
      {bubbles.map((b) => {
        const e = b.event;
        const fromAnchor = ANCHOR[e.from] ?? ANCHOR[0];

        if (e.kind === 'action') {
          const action: ActionType = e.action!;
          const meta = ACTION_META[action];
          const delta = FLY_DELTA[`${e.from}>${e.to}`] ?? FLY_DELTA['0>1'];
          const toAnchor = ANCHOR[e.to] ?? ANCHOR[1];
          // 起点落在 from 锚点，飞行向量指向 to
          return (
            <div
              key={b.key}
              className="absolute fly-action text-4xl"
              style={{
                ...fromAnchor,
                ['--dx' as any]: `${delta.dx}px`,
                ['--dy' as any]: `${delta.dy}px`,
                ['--rot' as any]: `${delta.rot}deg`,
              }}
              title={meta.label}
            >
              {meta.emoji}
            </div>
          );
        }

        // 话术气泡
        const cat = e.category ?? 'urge';
        return (
          <div
            key={b.key}
            className="absolute"
            style={fromAnchor}
          >
            <div
              className={`chat-bubble max-w-[180px] rounded-2xl border px-3 py-2 text-white text-sm shadow-lg ${CATEGORY_STYLE[cat]}`}
              style={{ ['--bubble-dur' as any]: `${PHRASE_TTL}ms` }}
            >
              {e.text}
            </div>
          </div>
        );
      })}
    </div>
  );
}
