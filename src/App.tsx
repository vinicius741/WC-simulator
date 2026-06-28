import React, { useEffect, useMemo } from 'react';
import { GROUPS } from './data/constants';
import GroupCard from './components/GroupCard';
import ThirdPlaceStandings from './components/ThirdPlaceStandings';
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
          allGroupsCompleted={engine.allGroupsCompleted}
          selectedCount={engine.selectedCurrentThirds.size}
          champion={engine.champion}
          onSimulateAllGroups={engine.handleSimulateAllGroups}
          onSimulateKnockouts={engine.handleSimulateAllKnockouts}
          onReset={engine.handleReset}
          onShowRecap={() => engine.setShowRecap(true)}
        />
      )}

      <main>
        {engine.activeTab === 'groups' && (
          <div className="groups-grid">
            {GROUPS.map(g => (
              <GroupCard
                key={g}
                groupLetter={g}
                teams={engine.groupTeams[g] || []}
                onReorderTeams={engine.handleReorderTeams}
                onMoveTeam={engine.handleMoveTeam}
                onSimulateGroup={engine.handleSimulateGroup}
              />
            ))}
          </div>
        )}

        {engine.activeTab === 'third-place' && (
          <ThirdPlaceStandings
            thirdPlaceTeams={engine.thirdPlaceTeams}
            selectedThirds={engine.selectedCurrentThirds}
            disabledThirds={engine.eliminatedTeamIds}
            onToggleSelect={engine.handleToggleSelectThird}
            onSimulateThirds={engine.handleSimulateThirds}
          />
        )}

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
