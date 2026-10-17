import { AIThinkingInfo } from '../../ai/ai-controller';
import { useTranslation } from '../../i18n';

interface Props {
  history: AIThinkingInfo[];
}

export default function AIReasoningPanel({ history }: Props) {
  const { t } = useTranslation();
  const recent = history.slice(-5);

  // 动作编码（ai-controller 生成）：bid:N / bid:pass / play:N / play:pass
  const formatAction = (action: string): string => {
    if (action === 'bid:pass') return t('bidPass');
    if (action.startsWith('bid:')) return t('bidScore').replace('{n}', action.slice(4));
    if (action === 'play:pass') return t('pass');
    if (action.startsWith('play:')) return t('playCount').replace('{n}', action.slice(5));
    return action;
  };

  // 兜底 AI 推理编码（fallback-ai 生成）：fbXxx；LLM 自由文本则原样显示
  const formatReasoning = (r: string): string => {
    if (r === 'fbWeakPass') return t('fbWeakPass');
    if (r === 'fbFreePlay') return t('fbFreePlay');
    if (r === 'fbMinBeat') return t('fbMinBeat');
    if (r === 'fbCannotBeat') return t('fbCannotBeat');
    if (r.startsWith('fbEvalBid:')) {
      const [, big, bomb, score] = r.split(':');
      const bombText = bomb === '1' ? t('fbHasBomb') : t('fbNoBomb');
      return t('fbEvalBid')
        .replace('{big}', big)
        .replace('{bomb}', bombText)
        .replace('{score}', score);
    }
    return r;
  };

  return (
    <div className="absolute right-4 top-24 w-64 bg-black/50 backdrop-blur rounded-lg p-3 z-20 max-h-80 overflow-y-auto">
      <h4 className="text-white/80 text-xs font-bold mb-2 border-b border-white/20 pb-1">
        AI {t('thinking')}
      </h4>
      <div className="space-y-2">
        {recent.map((item, i) => (
          <div key={item.timestamp + i} className="text-xs">
            <div className="text-gold font-bold">
              {item.playerId}: {formatAction(item.action)}
            </div>
            {item.reasoning && (
              <div className="text-white/60 mt-0.5 line-clamp-2">
                {formatReasoning(item.reasoning)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
