import React, { useEffect, useRef } from 'react';
import { useLanguage } from '../hooks/useLanguage';

interface NavTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  knockoutEnabled: boolean;
}

const NavTabs: React.FC<NavTabsProps> = ({ activeTab, onTabChange, knockoutEnabled }) => {
  const { t } = useLanguage();
  const navRef = useRef<HTMLElement>(null);

  // The tab strip scrolls horizontally on phones; keep the active tab in view
  // so switching tabs never leaves the selection scrolled off-screen.
  useEffect(() => {
    const active = navRef.current?.querySelector<HTMLElement>('.tab-btn.active');
    active?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }, [activeTab]);

  return (
    <nav className="nav-tabs" ref={navRef}>
      <button
        className={`tab-btn ${activeTab === 'predictions' ? 'active' : ''}`}
        onClick={() => onTabChange('predictions')}
      >
        {t('tabPredictions')}
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
