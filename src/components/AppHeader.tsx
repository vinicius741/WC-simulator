import React from 'react';
import { useLanguage, type Language } from '../hooks/useLanguage';

const AppHeader: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <header
      className="
        relative text-center border-b-2 border-ink mb-[25px]
        pt-[25px] pb-[15px]
        phone:pt-[calc(16px+env(safe-area-inset-top))] phone:pb-[14px] phone:mb-4
      "
    >
      <div className="flex justify-end gap-2 mb-2.5">
        <button
          className={`lang-btn ${language === 'en' ? 'active' : ''} phone:min-h-10 phone:px-3 phone:py-2 phone:text-[13px]`}
          onClick={() => setLanguage('en' as Language)}
        >
          🇺🇸 EN
        </button>
        <button
          className={`lang-btn ${language === 'pt-BR' ? 'active' : ''} phone:min-h-10 phone:px-3 phone:py-2 phone:text-[13px]`}
          onClick={() => setLanguage('pt-BR' as Language)}
        >
          🇧🇷 PT-BR
        </button>
      </div>
      <div className="flex flex-col items-center">
        <h1 className="font-serif font-bold text-2xl uppercase tracking-[1.5px] text-crimson mb-1 phone:text-[clamp(18px,5vw,24px)] phone:tracking-normal phone:leading-tight">
          {t('appTitle')}
        </h1>
        <p className="text-text-secondary font-serif text-sm italic leading-snug phone:text-[13px] phone:leading-snug phone:px-2">
          {t('appSubTitle')}
        </p>
      </div>
    </header>
  );
};

export default AppHeader;
