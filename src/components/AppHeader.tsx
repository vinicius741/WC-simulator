import React from 'react';
import { useLanguage, type Language } from '../hooks/useLanguage';

const AppHeader: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="app-header">
      <div className="lang-switcher">
        <button
          className={`lang-btn ${language === 'en' ? 'active' : ''}`}
          onClick={() => setLanguage('en' as Language)}
        >
          🇺🇸 EN
        </button>
        <button
          className={`lang-btn ${language === 'pt-BR' ? 'active' : ''}`}
          onClick={() => setLanguage('pt-BR' as Language)}
        >
          🇧🇷 PT-BR
        </button>
      </div>
      <div className="app-title-container">
        <h1>{t('appTitle')}</h1>
        <p>{t('appSubTitle')}</p>
      </div>
    </header>
  );
};

export default AppHeader;
