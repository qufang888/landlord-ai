import { useTranslation } from '../../i18n';

interface Props {
  onBid: (score: number) => void;
  onPass: () => void;
}

export default function BidPanel({ onBid, onPass }: Props) {
  const { t } = useTranslation();
  return (
    <div className="absolute bottom-32 left-1/2 -translate-x-1/2 bg-black/50 rounded-xl p-4 flex gap-3">
      <span className="text-white self-center mr-2 text-lg">{t('bid')}:</span>
      <button className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-xl" onClick={() => onBid(1)}>1</button>
      <button className="w-14 h-14 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-xl" onClick={() => onBid(2)}>2</button>
      <button className="w-14 h-14 rounded-full bg-gold hover:bg-yellow-600 text-white font-bold text-xl" onClick={() => onBid(3)}>3</button>
      <button className="px-4 h-14 rounded-full bg-gray-600 hover:bg-gray-700 text-white font-bold" onClick={onPass}>{t('notBid')}</button>
    </div>
  );
}
