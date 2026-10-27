import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { GraphExplorer } from './pages/GraphExplorer';
import { GDSAnalytics } from './pages/GDSAnalytics';
import { LiveScoreboard } from './pages/LiveScoreboard';
import { Leaderboard } from './pages/Leaderboard';
import { HeadToHead } from './pages/HeadToHead';
import { TournamentBracket } from './pages/TournamentBracket';
import { EventsList } from './pages/EventsList';
import { OnboardingAndManagement } from './pages/OnboardingAndManagement';
import { RankingDecay } from './pages/RankingDecay';
import { DualDatabaseInspector } from './pages/DualDatabaseInspector';
import { CypherQueriesSuite } from './pages/CypherQueriesSuite';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('P001');

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans flex flex-col">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 flex">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          {activeTab === 'dashboard' && (
            <Dashboard setActiveTab={setActiveTab} setSelectedPlayer={setSelectedPlayerId} />
          )}
          {activeTab === 'manage' && <OnboardingAndManagement />}
          {activeTab === 'graph' && (
            <GraphExplorer setSelectedPlayer={setSelectedPlayerId} setActiveTab={setActiveTab} />
          )}
          {activeTab === 'decay' && <RankingDecay />}
          {activeTab === 'dual' && <DualDatabaseInspector />}
          {activeTab === 'cypher' && <CypherQueriesSuite />}
          {activeTab === 'gds' && <GDSAnalytics />}
          {activeTab === 'live' && <LiveScoreboard />}
          {activeTab === 'rankings' && (
            <Leaderboard setSelectedPlayer={setSelectedPlayerId} setActiveTab={setActiveTab} />
          )}
          {activeTab === 'h2h' && <HeadToHead selectedPlayerId={selectedPlayerId} />}
          {activeTab === 'tournaments' && <TournamentBracket />}
          {activeTab === 'events' && <EventsList />}
        </main>
      </div>
    </div>
  );
}

export default App;
