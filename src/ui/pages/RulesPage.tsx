import { useGameStore } from '../../store/game-store';
import { useTranslation } from '../../i18n';
import { getRulesContent } from '../../i18n/rules-content';

export default function RulesPage() {
  const setPage = useGameStore(s => s.setPage);
  const { t, currentLang } = useTranslation();
  const content = getRulesContent(currentLang);

  return (
    <div className="w-full h-full table-bg overflow-y-auto">
      <div className="max-w-3xl mx-auto p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white">{t('rules')}</h1>
          <button className="btn-secondary" onClick={() => setPage('lobby')}>{t('back')}</button>
        </div>

        <div className="space-y-6 text-gray-200">
          {content.sections.map((section, i) => (
            <section key={i} className="bg-black/30 rounded-xl p-5">
              <h2 className="text-xl font-bold text-gold mb-3">{section.heading}</h2>
              <ul className="space-y-2 text-sm leading-relaxed">
                {section.items.map((item, j) => (
                  <li key={j}>• {item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
