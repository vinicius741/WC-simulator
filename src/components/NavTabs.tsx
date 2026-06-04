import React from 'react';
import { useLanguage } from '../hooks/useLanguage';

interface NavTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  knockoutEnabled: boolean;
}

const NavTabs: React.FC<NavTabsProps> = ({ activeTab, onTabChange, knockoutEnabled }) => {
  const { t } = useLanguage();

  return (
    <nav className="nav-tabs">
      <button
        className={`tab-btn ${activeTab === 'groups' ? 'active' : ''}`}
        onClick={() => onTabChange('groups')}
      >
        {t('tabGroups')}
      </button>
      <button
        className={`tab-btn ${activeTab === 'third-place' ? 'active' : ''}`}
        onClick={() => onTabChange('third-place')}
      >
        {t('tabThirdPlace')}
      </button>
      <button
        className={`tab-btn ${activeTab === 'knockout' ? 'active' : ''} ${!knockoutEnabled ? 'disabled' : ''}`}
        onClick={() => knockoutEnabled && onTabChange('knockout')}
        title={!knockoutEnabled ? t('tabKnockoutTooltip') : ''}
        style={{ opacity: !knockoutEnabled ? 0.5 : 1, cursor: !knockoutEnabled ? 'not-allowed' : 'pointer' }}
      >
        {t('tabKnockout')}
      </button>
    </nav>
  );
};

export default NavTabs;
