import React, { useEffect, useMemo } from 'react';
import KnockoutBracket from './components/KnockoutBracket';
import RecapModal from './components/RecapModal';
import AppHeader from './components/AppHeader';
import NavTabs from './components/NavTabs';
import ControlsBar from './components/ControlsBar';
import PredictionsView from './components/predictions/PredictionsView';
import AdminPage from './components/predictions/AdminPage';
import { useTournamentEngine } from './hooks/useTournamentEngine';
import { readInviteToken } from './utils/inviteRoute';
import { isAdminRoute } from './utils/routes';

function App() {
  // The admin tools live on a dedicated /admin page, fully separate from the
  // family app shell. The root .htaccess falls /admin back to index.html, and
  // the cookie session carries over, so no client-side router is needed.
  if (isAdminRoute()) return <AdminPage />;
  return <SimulatorApp />;
}

function SimulatorApp() {
  const engine = useTournamentEngine();
  const { setActiveTab } = engine;

  // A `/invite/<token>` link deep-links straight into the Predictions tab and a
  // name-only join form. Read once on mount (also strips the token from the URL).
  const inviteToken = useMemo(() => readInviteToken(), []);
  useEffect(() => {
    if (inviteToken) setActiveTab('predictions');
  }, [inviteToken, setActiveTab]);

  return (
    <div className="app-shell">
      <AppHeader />

      <NavTabs
        activeTab={engine.activeTab}
        onTabChange={engine.setActiveTab}
        knockoutEnabled={engine.knockoutAvailable}
      />

      {engine.activeTab !== 'predictions' && (
        <ControlsBar
          activeTab={engine.activeTab}
          champion={engine.champion}
          onSimulateKnockouts={engine.handleSimulateAllKnockouts}
          onReset={engine.handleReset}
          onShowRecap={() => engine.setShowRecap(true)}
          onRefreshResults={engine.refreshRealResults}
          resultsLoading={engine.realResultsLoading}
          resultsAt={engine.realResultsAt}
          resultsError={engine.realResultsError}
        />
      )}

      <main>
        {engine.activeTab === 'knockout' && engine.knockoutAvailable && (
          <KnockoutBracket
            knockoutMatches={engine.knockoutMatches}
            onSelectWinner={engine.handleSelectWinner}
            champion={engine.champion}
          />
        )}

        {engine.activeTab === 'predictions' && <PredictionsView inviteToken={inviteToken} />}
      </main>

      {engine.showRecap && engine.champion && (
        <RecapModal
          championId={engine.champion}
          groupTeams={engine.groupTeams}
          knockoutMatches={engine.knockoutMatches}
          onClose={() => engine.setShowRecap(false)}
        />
      )}
    </div>
  );
}

export default App;
