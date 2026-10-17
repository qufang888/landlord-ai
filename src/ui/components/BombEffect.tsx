import { useTranslation } from '../../i18n';

interface Props {
  type: 'bomb' | 'rocket';
}

export default function BombEffect({ type }: Props) {
  const { t } = useTranslation();
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-40">
      <div
        className={`text-6xl font-bold animate-bombFlash ${
          type === 'rocket' ? 'text-yellow-300' : 'text-orange-500'
        }`}
        style={{
          textShadow: '0 0 30px currentColor, 0 0 60px currentColor',
        }}
      >
        {type === 'rocket' ? t('rocket') : t('bomb')}
      </div>
      {/* 径向渐变闪光 */}
      <div
        className="absolute inset-0 animate-bombFlash"
        style={{
          background: `radial-gradient(circle, ${
            type === 'rocket' ? 'rgba(255,200,0,0.6)' : 'rgba(255,100,0,0.5)'
          } 0%, transparent 70%)`,
        }}
      />
    </div>
  );
}
