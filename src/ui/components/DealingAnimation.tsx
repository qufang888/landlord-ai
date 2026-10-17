import { useEffect, useState } from 'react';
import { Card } from '../../core/types';

interface Props {
  visible: boolean;
  hands: Card[][];
  onComplete: () => void;
}

/**
 * 发牌动画：51 张牌依次飞向三个玩家
 */
export default function DealingAnimation({ visible, hands, onComplete }: Props) {
  const [dealCount, setDealCount] = useState(0);
  const totalCards = 51;

  useEffect(() => {
    if (!visible) return;

    setDealCount(0);
    const interval = setInterval(() => {
      setDealCount(prev => {
        if (prev >= totalCards) {
          clearInterval(interval);
          setTimeout(onComplete, 300);
          return totalCards;
        }
        return prev + 1;
      });
    }, 40); // 40ms 一张

    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  // 计算每张牌的目标位置
  const getTargetPosition = (index: number) => {
    const seat = index % 3;
    if (seat === 0) return { x: 0, y: 200 };    // 底部玩家
    if (seat === 1) return { x: -300, y: 0 };   // 左侧
    return { x: 300, y: 0 };                     // 右侧
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      {/* 牌堆位置 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {Array.from({ length: dealCount }).map((_, i) => {
          const target = getTargetPosition(i);
          return (
            <div
              key={i}
              className="absolute w-10 h-14 bg-gradient-to-br from-green-700 to-green-900 rounded border border-green-900"
              style={{
                animation: `dealFly 0.3s ease-out forwards`,
                ['--tx' as string]: `${target.x}px`,
                ['--ty' as string]: `${target.y}px`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
