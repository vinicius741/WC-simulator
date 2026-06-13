import React from 'react';
import { GROUPS } from './data/constants';
import GroupCard from './components/GroupCard';
import ThirdPlaceStandings from './components/ThirdPlaceStandings';
import KnockoutBracket from './components/KnockoutBracket';
import RecapModal from './components/RecapModal';
import AppHeader from './components/AppHeader';
import NavTabs from './components/NavTabs';
import ControlsBar from './components/ControlsBar';
import PredictionsView from './components/predictions/PredictionsView';
import { useTournamentEngine } from './hooks/useTournamentEngine';

function App() {
  const engine = useTournamentEngine();

  return (
    <div className="app-shell">
      <AppHeader />

      <NavTabs
        activeTab={engine.activeTab}
        onTabChange={engine.setActiveTab}
        knockoutEnabled={engine.allGroupsCompleted}
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
            onToggleSelect={engine.handleToggleSelectThird}
            onSimulateThirds={engine.handleSimulateThirds}
          />
        )}

        {engine.activeTab === 'knockout' && engine.allGroupsCompleted && (
          <KnockoutBracket
            knockoutMatches={engine.knockoutMatches}
            onSelectWinner={engine.handleSelectWinner}
            champion={engine.champion}
          />
        )}

        {engine.activeTab === 'predictions' && <PredictionsView />}
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
