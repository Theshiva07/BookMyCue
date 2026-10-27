import React, { useEffect, useState } from 'react';
import { GitBranch, Trophy } from 'lucide-react';
import { api } from '../services/api';

export const TournamentBracket: React.FC = () => {
  const [rounds, setRounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const tournamentId = 'T001';

  useEffect(() => {
    api.getTournamentBracket(tournamentId).then(data => {
      setRounds(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-900/90 p-6 rounded-2xl border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1 font-mono">
            Neo4j NEXT_MATCH Progression Tree
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Tournament Bracket Engine</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Traversing Neo4j <code className="text-zinc-300 font-mono">(:Round)-[:HAS_MATCH]➔(:Match)-[:NEXT_MATCH]➔(:Match)</code> graph hierarchy.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px] text-zinc-400 text-xs">
          Traversing Neo4j tournament graph...
        </div>
      ) : (
        /* Interactive Bracket Tree Grid */
        <div className="bg-zinc-900/90 p-6 rounded-2xl border border-zinc-800 overflow-x-auto">
          {rounds.length > 0 ? (
            <div className="flex gap-8 min-w-[900px]">
              {rounds.map((r, rIdx) => (
                <div key={r.roundId} className="flex-1 space-y-6">
                  <div className="text-center bg-zinc-950 py-2.5 px-4 rounded-xl border border-zinc-800">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Round {r.roundNumber} {rIdx === rounds.length - 1 ? '• FINAL' : (rIdx === rounds.length - 2 ? '• SEMI-FINALS' : '• QUARTER-FINALS')}
                    </span>
                  </div>

                  <div className="space-y-4 my-auto">
                    {r.matches.map((m: any) => (
                      <div
                        key={m.matchId}
                        className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2"
                      >
                        <div className="flex justify-between items-center text-[11px] text-zinc-500 font-mono pb-1 border-b border-zinc-800">
                          <span>Match ID: {m.matchId}</span>
                          <span className="text-emerald-400 font-bold uppercase">{m.status}</span>
                        </div>

                        <div className="space-y-1 text-xs">
                          <div className={`flex justify-between items-center font-medium ${m.winnerId === m.playerAId ? 'text-emerald-400 font-bold' : 'text-zinc-300'}`}>
                            <span>Player A ({m.playerAId})</span>
                            <span className="font-mono">{m.scoreA}</span>
                          </div>
                          <div className={`flex justify-between items-center font-medium ${m.winnerId === m.playerBId ? 'text-emerald-400 font-bold' : 'text-zinc-300'}`}>
                            <span>Player B ({m.playerBId})</span>
                            <span className="font-mono">{m.scoreB}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-zinc-500 py-8 text-center">No active tournament bracket tree found. Create a tournament from Host & Event Management to generate a bracket.</div>
          )}
        </div>
      )}
    </div>
  );
};
