import React, { useEffect, useState } from 'react';
import { Cpu, Users, Share2, TrendingUp, GitMerge, ArrowRight, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { PageRankItem, LouvainCommunity, SimilarityPair, Player } from '../types';

export const GDSAnalytics: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'pagerank' | 'louvain' | 'similarity' | 'shortestpath'>('pagerank');
  const [pageRank, setPageRank] = useState<PageRankItem[]>([]);
  const [communities, setCommunities] = useState<LouvainCommunity[]>([]);
  const [similarity, setSimilarity] = useState<SimilarityPair[]>([]);
  const [playersList, setPlayersList] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  // Shortest Path state
  const [sourcePlayerId, setSourcePlayerId] = useState<string>('P001');
  const [targetPlayerId, setTargetPlayerId] = useState<string>('P005');
  const [pathResult, setPathResult] = useState<{ pathNodes: { id: string; name: string }[]; pathLength: number; cypher: string } | null>(null);
  const [computingPath, setComputingPath] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getPageRank(),
      api.getLouvainCommunities(),
      api.getNodeSimilarity(),
      api.getRankings()
    ]).then(([pr, louv, sim, players]) => {
      setPageRank(pr);
      setCommunities(louv);
      setSimilarity(sim);
      setPlayersList(players);
      setLoading(false);
      // Run initial shortest path
      runShortestPath('P001', 'P005');
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const runShortestPath = async (p1: string, p2: string) => {
    setComputingPath(true);
    try {
      const res = await api.getShortestPath(p1, p2);
      setPathResult(res);
      setComputingPath(false);
    } catch (err) {
      console.error(err);
      setComputingPath(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Banner */}
      <div className="bg-zinc-900/90 p-6 rounded-2xl border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1 font-mono">
            Neo4j Graph Data Science (GDS) Engine
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Graph Analytics & Algorithms</h2>
          <p className="text-xs text-zinc-400 mt-1">
            4 Core Graph Algorithms: PageRank Centrality, Louvain Community Clustering, Jaccard Similarity, and Shortest Path.
          </p>
        </div>

        {/* Subtab Selector */}
        <div className="flex flex-wrap items-center gap-1.5 bg-zinc-950 p-1.5 rounded-xl border border-zinc-800">
          <button
            onClick={() => setActiveSubTab('pagerank')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeSubTab === 'pagerank'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            PageRank Centrality
          </button>
          <button
            onClick={() => setActiveSubTab('louvain')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeSubTab === 'louvain'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Louvain Communities
          </button>
          <button
            onClick={() => setActiveSubTab('similarity')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeSubTab === 'similarity'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Node Similarity
          </button>
          <button
            onClick={() => setActiveSubTab('shortestpath')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeSubTab === 'shortestpath'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Shortest Path (Degrees)
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px] text-zinc-400 text-xs">
          <Cpu className="w-5 h-5 animate-spin text-emerald-400 mr-2" />
          Computing Neo4j GDS algorithms across graph nodes...
        </div>
      ) : (
        <>
          {/* PageRank View */}
          {activeSubTab === 'pagerank' && (
            <div className="bg-zinc-900/90 p-6 rounded-2xl border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  PageRank Centrality Leaderboard (Prestige from High-Quality Wins)
                </h3>
                <span className="text-xs font-mono text-zinc-500">
                  gds.pageRank.stream('playerGraph')
                </span>
              </div>

              <div className="space-y-2.5">
                {pageRank.map((pr) => (
                  <div key={pr.playerId} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center font-mono">
                        #{pr.rank}
                      </span>
                      <div>
                        <div className="font-bold text-white text-sm">{pr.playerName}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">ID: {pr.playerId}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold font-mono text-emerald-400">
                        {pr.score.toFixed(4)}
                      </div>
                      <div className="text-[10px] text-zinc-500">PageRank Influence</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Louvain Communities View */}
          {activeSubTab === 'louvain' && (
            <div className="bg-zinc-900/90 p-6 rounded-2xl border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Louvain Modular Communities (Circuit Clustering)
                </h3>
                <span className="text-xs font-mono text-zinc-500">
                  gds.louvain.stream('playerGraph')
                </span>
              </div>

              <div className="space-y-2.5">
                {communities.map((c) => (
                  <div key={c.playerId} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex items-center justify-between gap-4">
                    <div>
                      <div className="font-bold text-white text-sm">{c.playerName}</div>
                      <div className="text-[10px] text-zinc-500">{c.communityName}</div>
                    </div>

                    <span className="text-emerald-400 font-mono text-xs font-bold">
                      Cluster #{c.communityId}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Node Similarity View */}
          {activeSubTab === 'similarity' && (
            <div className="bg-zinc-900/90 p-6 rounded-2xl border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-emerald-400" />
                  Jaccard Node Similarity (Shared Opponents & Venues)
                </h3>
                <span className="text-xs font-mono text-zinc-500">
                  gds.nodeSimilarity.stream(...)
                </span>
              </div>

              <div className="space-y-2.5">
                {similarity.map((s, idx) => (
                  <div key={idx} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-white text-xs">{s.player1Name}</span>
                      <span className="text-xs text-zinc-500 font-mono">↔</span>
                      <span className="font-bold text-white text-xs">{s.player2Name}</span>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-bold text-emerald-400 text-xs">
                        {(s.similarity * 100).toFixed(0)}% Match
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {s.sharedOpponents} Shared Opponents
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shortest Path View */}
          {activeSubTab === 'shortestpath' && (
            <div className="bg-zinc-900/90 p-6 rounded-2xl border border-zinc-800 space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <GitMerge className="w-4 h-4 text-emerald-400" />
                  Shortest Path & Degrees of Separation (Dijkstra / BFS Graph Algorithm)
                </h3>
                <span className="text-xs font-mono text-zinc-500">
                  shortestPath((p1)-[:PLAYED_AGAINST*]-(p2))
                </span>
              </div>

              {/* Selector Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                    Starting Player (Node 1)
                  </label>
                  <select
                    value={sourcePlayerId}
                    onChange={e => setSourcePlayerId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    {playersList.map(p => (
                      <option key={p.playerId} value={p.playerId}>{p.name} (#{p.currentRank})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                    Destination Player (Node 2)
                  </label>
                  <select
                    value={targetPlayerId}
                    onChange={e => setTargetPlayerId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    {playersList.map(p => (
                      <option key={p.playerId} value={p.playerId}>{p.name} (#{p.currentRank})</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => runShortestPath(sourcePlayerId, targetPlayerId)}
                  disabled={computingPath}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {computingPath ? 'Computing Traversal...' : 'Find Shortest Path'}
                </button>
              </div>

              {/* Cypher Query Box */}
              {pathResult && (
                <div className="space-y-4">
                  <div>
                    <span className="text-[11px] font-mono text-zinc-400 font-bold uppercase">Executed Cypher Traversal:</span>
                    <pre className="mt-1 p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-emerald-300 font-mono text-xs overflow-x-auto">
                      <code>{pathResult.cypher}</code>
                    </pre>
                  </div>

                  {/* Path Visualizer */}
                  <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                        Rivalry Connection Chain:
                      </span>
                      <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold font-mono text-xs">
                        {pathResult.pathLength >= 0 ? `${pathResult.pathLength} Degrees of Separation` : 'No Path Found'}
                      </span>
                    </div>

                    {pathResult.pathNodes && pathResult.pathNodes.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        {pathResult.pathNodes.map((node, nIdx) => (
                          <React.Fragment key={node.id}>
                            <div className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                              <div>
                                <div className="text-xs font-bold text-white">{node.name}</div>
                                <div className="text-[9px] text-zinc-500 font-mono">{node.id}</div>
                              </div>
                            </div>

                            {nIdx < pathResult.pathNodes.length - 1 && (
                              <div className="flex items-center gap-1 text-zinc-500 text-[10px] font-mono">
                                <ArrowRight className="w-4 h-4 text-emerald-400" />
                                <span>PLAYED_AGAINST</span>
                                <ArrowRight className="w-4 h-4 text-emerald-400" />
                              </div>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-zinc-500 italic">No connection path found within 6 degrees of separation.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
