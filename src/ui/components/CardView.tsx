import { Card } from '../../core/types';
import { useTranslation, rankLabel as getRankLabel } from '../../i18n';

interface Props {
  card: Card;
  selected?: boolean;
  small?: boolean;
  faceDown?: boolean;
}

const SUIT_SYMBOLS: Record<string, string> = {
  spade: '♠', heart: '♥', club: '♣', diamond: '♦', joker: '',
};

export default function CardView({ card, selected, small, faceDown }: Props) {
  useTranslation(); // 订阅语言切换以重渲染
  if (faceDown) {
    return (
      <div className={`card card-back ${small ? 'scale-75' : ''}`}>
        <span>♠</span>
      </div>
    );
  }

  const isRed = card.suit === 'heart' || card.suit === 'diamond';
  const isJoker = card.suit === 'joker';
  const rankLabelText = getRankLabel(card.rank);
  const suitSymbol = SUIT_SYMBOLS[card.suit];

  return (
    <div className={`card ${selected ? 'selected' : ''} ${small ? 'scale-75' : ''}`}>
      <div className={`font-bold text-sm ${isRed ? 'card-red' : 'card-black'}`}>
        {rankLabelText}
      </div>
      <div className={`text-center ${isRed ? 'card-red' : 'card-black'} text-lg`}>
        {isJoker ? (card.rank === 17 ? '👑' : '🃏') : suitSymbol}
      </div>
      <div className={`font-bold text-sm rotate-180 ${isRed ? 'card-red' : 'card-black'}`}>
        {rankLabelText}
      </div>
    </div>
  );
}
