import React, { useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import '../styles/LanguageSwitcher.css';

function LanguageSwitcher() {
  const { language, changeLanguage } = useContext(LanguageContext);

  return (
    <div className="language-switcher">
      <button
        className={`lang-btn ${language === 'fr' ? 'active' : ''}`}
        onClick={() => changeLanguage('fr')}
        title="Français"
      >
        FR
      </button>
      <button
        className={`lang-btn ${language === 'en' ? 'active' : ''}`}
        onClick={() => changeLanguage('en')}
        title="English"
      >
        EN
      </button>
    </div>
  );
}

export default LanguageSwitcher;
