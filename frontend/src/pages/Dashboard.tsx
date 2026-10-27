import React, { useEffect, useState } from 'react';
import { Users, Radio, Trophy, Cpu, Network, ArrowRight, Play, Zap, PlusCircle } from 'lucide-react';
import { api } from '../services/api';
import { Player, PageRankItem, GraphData } from '../types';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
  setSelectedPlayer: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setActiveTab, setSelectedPlayer }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [pageRank, setPageRank] = useState<PageRankItem[]>([]);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getPlayers(),
      api.getPageRank(),
      api.getGraphVisualization(),
      api.getEvents()
    ]).then(([pList, prList, gData, eList]) => {
      setPlayers(pList);
      setPageRank(prList);
      setGraphData(gData);
      setEvents(eList);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const totalMatchesCount = graphData ? graphData.links.filter(l => l.type === 'PLAYED_AGAINST' || l.type === 'WON').length : 0;

  return (
    <div className="space-y-6">
      {/* Hero Welcome & Overview Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-zinc-900/90 border border-zinc-800 p-6 md:p-8">
        <div className="relative z-10 max-w-3xl space-y-3">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight font-sans">
            Book My Cue Real-Time Platform
          </h1>
          <p className="text-zinc-400 text-xs md:text-sm leading-relaxed">
            Real-time frame & shot telemetry scoring stored in <strong className="text-zinc-200">MongoDB</strong>, linked to an index-free adjacency graph in <strong className="text-zinc-200">Neo4j</strong> for head-to-head analytics and explainable temporal ranking decay.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab('manage')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Host & Event Management
            </button>
            <button
              onClick={() => setActiveTab('live')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs border border-zinc-700 transition-colors"
            >
              <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
              Live Scoreboard
            </button>
            <button
              onClick={() => setActiveTab('graph')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs border border-zinc-700 transition-colors"
            >
              <Network className="w-4 h-4 text-zinc-400" />
              Explore Graph Network
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900/80 p-5 rounded-2xl space-y-2 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span>TOTAL PLAYERS</span>
            <Users className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">{players.length}</div>
          <p className="text-[11px] text-zinc-500">Indexed graph nodes</p>
        </div>

        <div className="bg-zinc-900/80 p-5 rounded-2xl space-y-2 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span>HISTORICAL MATCHES</span>
            <Network className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">{totalMatchesCount}</div>
          <p className="text-[11px] text-zinc-500">PLAYED_AGAINST edges</p>
        </div>

        <div className="bg-zinc-900/80 p-5 rounded-2xl space-y-2 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span>TOP PAGERANK</span>
            <Cpu className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 truncate">
            {pageRank.length > 0 ? pageRank[0].playerName : (players.length > 0 ? players[0].name : "No Data")}
          </div>
          <p className="text-[11px] text-zinc-500">
            Score: {pageRank.length > 0 ? pageRank[0].score : (players.length > 0 ? "0.075" : "0.00")}
          </p>
        </div>

        <div className="bg-zinc-900/80 p-5 rounded-2xl space-y-2 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span>TOTAL EVENTS</span>
            <Radio className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">{events.length}</div>
          <p className="text-[11px] text-zinc-500">Hosted tournament events</p>
        </div>
      </div>

      {/* Featured Match / Live Status Banner */}
      {players.length >= 2 ? (
        <div className="bg-zinc-900/90 p-6 rounded-2xl border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Tournament Match • {events.length > 0 ? events[0].title : 'Snooker Championship'}
            </div>
            <span className="text-xs bg-zinc-950 px-3 py-1 rounded-full text-zinc-400 font-mono border border-zinc-800">
              Best of 7 • Match Telemetry
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center py-2">
            {/* Player A */}
            <div className="flex items-center gap-4 bg-zinc-950 p-4 rounded-xl border border-zinc-800/80">
              <div className="w-10 h-10 rounded-full bg-zinc-800 text-zinc-200 font-bold flex items-center justify-center text-sm border border-zinc-700">
                {players[0].name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="font-extrabold text-base text-white">{players[0].name}</div>
                <div className="text-xs text-zinc-400">Rank #{players[0].currentRank} • Break {players[0].highestBreak}</div>
              </div>
            </div>

            {/* VS Center Indicator */}
            <div className="text-center space-y-1">
              <div className="text-[11px] text-zinc-500 font-semibold uppercase">Head-to-Head</div>
              <div className="text-xl font-black text-emerald-400 font-mono bg-zinc-950 py-1.5 px-4 rounded-xl inline-block border border-zinc-800">
                VS
              </div>
              <div className="text-[11px] text-zinc-400 font-mono">Index-Free Adjacency</div>
            </div>

            {/* Player B */}
            <div className="flex items-center gap-4 bg-zinc-950 p-4 rounded-xl border border-zinc-800/80">
              <div>
                <div className="font-extrabold text-base text-white">{players[1].name}</div>
                <div className="text-xs text-zinc-400">Rank #{players[1].currentRank} • Break {players[1].highestBreak}</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-zinc-800 text-zinc-200 font-bold flex items-center justify-center text-sm ml-auto border border-zinc-700">
                {players[1].name.slice(0, 2).toUpperCase()}
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setActiveTab('live')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition-colors"
            >
              Enter Referee Live Feed
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900/90 p-6 rounded-2xl border border-zinc-800 text-center space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">No Active Players In Database</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Your database is currently empty. Onboard players manually or click below to load the report sample dataset.
          </p>
          <button
            onClick={() => setActiveTab('manage')}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs inline-flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" /> Go to Host & Management
          </button>
        </div>
      )}

      {/* Leaderboard & GDS Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Graph Ranked Players */}
        <div className="bg-zinc-900/90 p-6 rounded-2xl border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-emerald-400" />
              Neo4j Player Graph Leaders
            </h3>
            <button
              onClick={() => setActiveTab('rankings')}
              className="text-xs text-emerald-400 hover:underline font-medium"
            >
              View All ({players.length}) →
            </button>
          </div>

          {players.length > 0 ? (
            <div className="divide-y divide-zinc-800/60">
              {players.slice(0, 5).map(p => (
                <div key={p.playerId} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center text-xs font-mono font-bold text-emerald-400">
                      #{p.currentRank}
                    </span>
                    <div>
                      <div className="font-semibold text-xs text-zinc-200">{p.name}</div>
                      <div className="text-[11px] text-zinc-500">
                        High Break: <strong className="text-zinc-300">{p.highestBreak}</strong> • Hand: {p.handedness || 'Right'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-extrabold text-emerald-400 text-xs font-mono">{p.winRate}%</div>
                    <div className="text-[10px] text-zinc-500">{p.wins}W - {p.losses}L</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-zinc-500 py-6 text-center">No player records available.</div>
          )}
        </div>

        {/* GDS PageRank Influencers */}
        <div className="bg-zinc-900/90 p-6 rounded-2xl border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              GDS PageRank Centrality Rankings
            </h3>
            <button
              onClick={() => setActiveTab('gds')}
              className="text-xs text-emerald-400 hover:underline font-medium"
            >
              Full GDS Report →
            </button>
          </div>

          {pageRank.length > 0 ? (
            <div className="space-y-3">
              {pageRank.slice(0, 5).map((pr, idx) => (
                <div key={pr.playerId} className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-zinc-300">
                      #{idx + 1} {pr.playerName}
                    </span>
                    <span className="font-mono text-emerald-400 font-bold">
                      Score: {pr.score}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.min(100, (pr.score / (pageRank[0]?.score || 0.1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-zinc-500 py-6 text-center">No PageRank centrality data available.</div>
          )}
        </div>
      </div>
    </div>
  );
};
