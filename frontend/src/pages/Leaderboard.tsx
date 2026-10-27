import React, { useEffect, useState } from 'react';
import { Trophy, Search, Filter, ArrowUpDown } from 'lucide-react';
import { api } from '../services/api';
import { Player } from '../types';

interface LeaderboardProps {
  setSelectedPlayer: (id: string) => void;
  setActiveTab: (tab: string) => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ setSelectedPlayer, setActiveTab }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getRankings().then(data => {
      setPlayers(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const filtered = players.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            Official Player Intelligence Leaderboard
          </h2>
          <p className="text-xs text-slate-400">
            Real-time player rankings materialized and recomputed in Neo4j graph nodes.
          </p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search player name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 w-60"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px] text-slate-400 text-xs">
          Loading player rankings...
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Rank</th>
                  <th className="py-3.5 px-4">Player</th>
                  <th className="py-3.5 px-4">Handedness</th>
                  <th className="py-3.5 px-4 text-right">Win Rate</th>
                  <th className="py-3.5 px-4 text-right">Matches</th>
                  <th className="py-3.5 px-4 text-right">Highest Break</th>
                  <th className="py-3.5 px-4 text-right">Avg Break</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filtered.map(p => (
                  <tr key={p.playerId} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                      #{p.currentRank}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-white text-sm">{p.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{p.email}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {p.handedness || 'Right'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-400 font-mono">
                      {p.winRate}%
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-300 font-mono">
                      {p.wins}W - {p.losses}L ({p.totalMatches})
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-white font-mono">
                      {p.highestBreak}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-300 font-mono">
                      {p.avgBreak}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedPlayer(p.playerId);
                          setActiveTab('h2h');
                        }}
                        className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-[11px] font-semibold transition-colors"
                      >
                        Compare H2H
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
