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

  const tabClass = (isActive: boolean) =>
    'tab-btn phone:min-h-11 phone:px-3.5 phone:py-3 phone:text-xs phone:tracking-[0.5px] phone:whitespace-nowrap phone:flex-shrink-0' +
    (isActive ? ' active' : '');

  return (
    <nav
      ref={navRef}
      className="
        nav-tabs flex justify-center border-b border-border bg-bg-secondary mb-[25px] p-0
        tablet:mb-[18px]
        phone:justify-start phone:overflow-x-auto phone:[scrollbar-width:none] phone:phone-no-scrollbar
      "
    >
      <button className={tabClass(activeTab === 'predictions')} onClick={() => onTabChange('predictions')}>
        {t('tabPredictions')}
      </button>
      <button className={tabClass(activeTab === 'groups')} onClick={() => onTabChange('groups')}>
        {t('tabGroups')}
      </button>
      <button className={tabClass(activeTab === 'third-place')} onClick={() => onTabChange('third-place')}>
        {t('tabThirdPlace')}
      </button>
      <button
        className={`${tabClass(activeTab === 'knockout')} ${!knockoutEnabled ? 'disabled' : ''}`}
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
