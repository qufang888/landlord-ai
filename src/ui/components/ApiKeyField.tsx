import { useState } from 'react';
import { useTranslation } from '../../i18n';

interface Props {
  value: string;
  onChange: (v: string) => void;
  /** 应用到 <input> 的样式（不含 mt-1，margin 由外层 relative 容器处理） */
  className?: string;
  placeholder?: string;
}

/**
 * API Key 输入框：右侧内置小眼睛按钮，点击在「明文 / 密文(•••)」之间切换。
 */
export default function ApiKeyField({ value, onChange, className = '', placeholder }: Props) {
  const [show, setShow] = useState(false);
  const { t } = useTranslation();
  return (
    <div className="relative mt-1">
      <input
        type={show ? 'text' : 'password'}
        className={`w-full bg-gray-700 text-white rounded pr-9 ${className}`}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        autoComplete="off"
        spellCheck={false}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-base leading-none px-1"
        title={show ? t('hideApiKey') : t('showApiKey')}
        aria-label={show ? t('hideApiKey') : t('showApiKey')}
        tabIndex={-1}
      >
        {show ? '🙈' : '👁'}
      </button>
    </div>
  );
}
