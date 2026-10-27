import React, { useEffect, useState } from 'react';
import { Users, Trophy, Flame, Calendar, ArrowRight, Swords } from 'lucide-react';
import { api } from '../services/api';
import { Player, HeadToHeadData } from '../types';

interface HeadToHeadProps {
  selectedPlayerId?: string;
}

export const HeadToHead: React.FC<HeadToHeadProps> = ({ selectedPlayerId }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerAId, setPlayerAId] = useState<string>(selectedPlayerId || 'plr-1');
  const [playerBId, setPlayerBId] = useState<string>('plr-2');
  const [h2hData, setH2hData] = useState<HeadToHeadData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPlayers().then(list => {
      setPlayers(list);
      if (list.length >= 2) {
        if (!selectedPlayerId) setPlayerAId(list[0].playerId);
        setPlayerBId(list[1].playerId);
      }
    });
  }, [selectedPlayerId]);

  useEffect(() => {
    if (playerAId && playerBId && playerAId !== playerBId) {
      setLoading(true);
      api.getHeadToHead(playerAId, playerBId).then(data => {
        setH2hData(data);
        setLoading(false);
      }).catch(err => {
        console.error(err);
        setLoading(false);
      });
    }
  }, [playerAId, playerBId]);

  return (
    <div className="space-y-6">
      {/* Title & Player Selectors */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Swords className="w-6 h-6 text-amber-400" />
            Head-to-Head Rivalry Intelligence
          </h2>
          <p className="text-xs text-slate-400">
            Querying materialized Neo4j `PLAYED_AGAINST` aggregate edges and historic match logs.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-emerald-400 mb-1.5 uppercase">Select Player A:</label>
            <select
              value={playerAId}
              onChange={e => setPlayerAId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-emerald-500 font-semibold"
            >
              {players.map(p => (
                <option key={p.playerId} value={p.playerId}>{p.name} (Rank #{p.currentRank})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-cyan-400 mb-1.5 uppercase">Select Player B:</label>
            <select
              value={playerBId}
              onChange={e => setPlayerBId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-cyan-500 font-semibold"
            >
              {players.map(p => (
                <option key={p.playerId} value={p.playerId}>{p.name} (Rank #{p.currentRank})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading || !h2hData ? (
        <div className="flex items-center justify-center min-h-[300px] text-slate-400 text-xs">
          Loading Neo4j PLAYED_AGAINST edge data...
        </div>
      ) : (
        <>
          {/* Edge Summary Card */}
          <div className="glass-panel p-6 rounded-2xl felt-bg border border-emerald-900 shadow-2xl space-y-6">
            <div className="flex items-center justify-between text-xs border-b border-emerald-800 pb-3">
              <span className="text-emerald-300 font-bold uppercase tracking-wider">Neo4j PLAYED_AGAINST Materialized Edge</span>
              <span className="text-slate-300 font-mono">
                Last Encounter: {new Date(h2hData.headToHead.lastPlayed).toLocaleDateString()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Player A Stats */}
              <div className="bg-slate-900/80 p-5 rounded-2xl border border-emerald-500/30 text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xl flex items-center justify-center mx-auto border-2 border-emerald-400">
                  {h2hData.playerA.name.slice(0, 2).toUpperCase()}
                </div>
                <h3 className="text-lg font-extrabold text-white">{h2hData.playerA.name}</h3>
                <div className="text-xs text-slate-400">Rank #{h2hData.playerA.currentRank} • High Break {h2hData.playerA.highestBreak}</div>
                <div className="pt-2 text-3xl font-black text-emerald-400 font-mono">
                  {h2hData.headToHead.wins} <span className="text-xs font-normal text-slate-400">H2H Wins</span>
                </div>
              </div>

              {/* Edge Center Score */}
              <div className="text-center space-y-2">
                <div className="text-xs text-slate-400 font-semibold uppercase">Total Head-to-Head Matches</div>
                <div className="text-4xl font-black text-white font-mono bg-slate-900/90 py-3 px-6 rounded-2xl border border-slate-800 inline-block">
                  {h2hData.headToHead.matches}
                </div>
                <div className="text-xs text-amber-400 font-semibold flex items-center justify-center gap-1">
                  <Flame className="w-4 h-4" /> Direct Rivalry Edge Active
                </div>
              </div>

              {/* Player B Stats */}
              <div className="bg-slate-900/80 p-5 rounded-2xl border border-cyan-500/30 text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-xl flex items-center justify-center mx-auto border-2 border-cyan-400">
                  {h2hData.playerB.name.slice(0, 2).toUpperCase()}
                </div>
                <h3 className="text-lg font-extrabold text-white">{h2hData.playerB.name}</h3>
                <div className="text-xs text-slate-400">Rank #{h2hData.playerB.currentRank} • High Break {h2hData.playerB.highestBreak}</div>
                <div className="pt-2 text-3xl font-black text-cyan-400 font-mono">
                  {h2hData.headToHead.losses} <span className="text-xs font-normal text-slate-400">H2H Wins</span>
                </div>
              </div>
            </div>
          </div>

          {/* Side-by-Side Stat Breakdown */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Stat Comparison Breakdown
            </h3>

            <div className="space-y-4">
              {[
                { label: 'Overall Win Rate', valA: `${h2hData.playerA.winRate}%`, valB: `${h2hData.playerB.winRate}%`, numA: h2hData.playerA.winRate, numB: h2hData.playerB.winRate },
                { label: 'Highest Break', valA: h2hData.playerA.highestBreak, valB: h2hData.playerB.highestBreak, numA: h2hData.playerA.highestBreak, numB: h2hData.playerB.highestBreak },
                { label: 'Average Break', valA: h2hData.playerA.avgBreak, valB: h2hData.playerB.avgBreak, numA: h2hData.playerA.avgBreak, numB: h2hData.playerB.avgBreak },
                { label: 'Total Career Matches', valA: h2hData.playerA.totalMatches, valB: h2hData.playerB.totalMatches, numA: h2hData.playerA.totalMatches, numB: h2hData.playerB.totalMatches }
              ].map((item, idx) => (
                <div key={idx} className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-extrabold text-emerald-400 font-mono">{item.valA}</span>
                    <span className="font-bold text-slate-300">{item.label}</span>
                    <span className="font-extrabold text-cyan-400 font-mono">{item.valB}</span>
                  </div>

                  <div className="flex gap-2 h-2">
                    <div className="flex-1 bg-slate-800 rounded-full overflow-hidden flex justify-end">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, (item.numA / (item.numA + item.numB || 1)) * 100)}%` }}></div>
                    </div>
                    <div className="flex-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${Math.min(100, (item.numB / (item.numA + item.numB || 1)) * 100)}%` }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
