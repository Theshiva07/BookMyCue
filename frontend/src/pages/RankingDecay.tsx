import React, { useState, useEffect } from 'react';
import { TrendingDown, GitCommit, Sliders, Info, ShieldCheck, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

export const RankingDecay: React.FC = () => {
  const [lambda, setLambda] = useState(0.05);
  const [decayData, setDecayData] = useState<any>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('P001');
  const [pathData, setPathData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getRankingDecay(lambda).then(res => {
      setDecayData(res);
      setLoading(false);
    }).catch(console.error);
  }, [lambda]);

  useEffect(() => {
    if (selectedPlayerId) {
      api.getExplainablePath(selectedPlayerId).then(setPathData).catch(console.error);
    }
  }, [selectedPlayerId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-900/90 p-6 rounded-2xl border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-emerald-400" />
            Temporal Graph Ranking Decay & Provenance Model
          </h2>
          <p className="text-xs text-zinc-400">
            Computes time-decayed rating contributions and explainable Cypher graph paths.
          </p>
        </div>

        <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex items-center gap-3">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <div className="text-xs">
            <span className="text-zinc-400 font-medium">Decay Constant (λ): </span>
            <span className="text-emerald-400 font-mono font-bold">{lambda}</span>
          </div>
          <input
            type="range"
            min="0.01"
            max="0.20"
            step="0.01"
            value={lambda}
            onChange={e => setLambda(parseFloat(e.target.value))}
            className="w-28 accent-emerald-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Formula Display Box */}
      <div className="bg-zinc-900/90 p-5 rounded-2xl border border-zinc-800 flex items-start gap-3">
        <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Report Page 5 Ranking Equation</h4>
          <code className="block font-mono text-xs text-emerald-400 py-1 font-bold">
            R(p, t) = R_base(p) + Σ [ points_earned(m) × w(round(m)) × e^(-λ(t - t_match)) ]
          </code>
          <p className="text-[11px] text-zinc-400">
            Base rating carries over while match contributions decay exponentially over time using factor <code className="text-emerald-400 font-mono">e^(-λ * dt)</code>.
          </p>
        </div>
      </div>

      {/* Two Column Layout: Decayed Rankings vs Explainable Cypher Path */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Decayed Player Rankings Table */}
        <div className="bg-zinc-900/90 p-6 rounded-2xl border border-zinc-800 space-y-4">
          <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Time-Decayed Dynamic Standings
          </h3>

          {loading ? (
            <div className="text-xs text-zinc-400 py-8 text-center">Calculating decay factors...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950 text-zinc-400 font-semibold uppercase tracking-wider border-b border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-3">Player</th>
                    <th className="py-2.5 px-3 text-right">Base R(p)</th>
                    <th className="py-2.5 px-3 text-right">Raw Earned</th>
                    <th className="py-2.5 px-3 text-right">Decay Factor</th>
                    <th className="py-2.5 px-3 text-right">Final Score</th>
                    <th className="py-2.5 px-3 text-center">Trace</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-medium">
                  {decayData?.rankings?.map((item: any) => (
                    <tr
                      key={item.playerId}
                      className={`hover:bg-zinc-950 transition-colors ${selectedPlayerId === item.playerId ? 'bg-zinc-950' : ''}`}
                    >
                      <td className="py-2.5 px-3 font-bold text-white">
                        {item.name}
                        <span className="text-[10px] text-zinc-500 block font-mono">{item.playerId}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-zinc-400 font-mono">{item.baseRating}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-400 font-mono">+{item.rawEarnedPoints}</td>
                      <td className="py-2.5 px-3 text-right text-zinc-300 font-mono">{(item.decayFactor * 100).toFixed(1)}%</td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-white font-mono">{item.computedScore}</td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => setSelectedPlayerId(item.playerId)}
                          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold text-emerald-400 transition-colors"
                        >
                          Path
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Node-by-Node Cypher Path Visualizer (FR-04) */}
        <div className="bg-zinc-900/90 p-6 rounded-2xl border border-zinc-800 space-y-4">
          <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <GitCommit className="w-4 h-4 text-emerald-400" />
            FR-04 Explainable Cypher Path Traversal
          </h3>

          {pathData ? (
            <div className="space-y-4">
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 font-mono text-[11px] text-zinc-300 overflow-x-auto">
                <span className="text-zinc-500 uppercase text-[9px] block mb-1">Generated Cypher Path Query</span>
                {pathData.cypherQuery}
              </div>

              {/* Node-by-Node Step Traversal */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-300">Graph Node & Relationship Provenance:</h4>
                <div className="space-y-2">
                  {pathData.pathNodes.map((node: any, idx: number) => (
                    <div key={node.id} className="flex items-center gap-3 p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                      <div className="w-6 h-6 rounded-lg bg-zinc-800 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">{node.name}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-zinc-900 text-zinc-400 border border-zinc-800">
                            :{node.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400">{node.details}</p>
                      </div>
                      {idx < pathData.pathNodes.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-zinc-600 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-zinc-400 bg-zinc-950 p-3 rounded-xl border border-zinc-800 leading-relaxed">
                {pathData.explanation}
              </p>
            </div>
          ) : (
            <div className="text-xs text-zinc-400 py-8 text-center">Select a player to generate Cypher path.</div>
          )}
        </div>
      </div>
    </div>
  );
};
