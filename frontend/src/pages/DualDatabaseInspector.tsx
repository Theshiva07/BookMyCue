import React, { useState } from 'react';
import { Database, Network, Table, Layers, CheckCircle2 } from 'lucide-react';

export const DualDatabaseInspector: React.FC = () => {
  const [activeView, setActiveView] = useState<'matrix' | 'mongo' | 'neo4j'>('matrix');

  const mongoSampleBSON = `{
  "_id": "66f1a2b8c4d0a987654321cd",
  "match_id": "M001",
  "frame_number": 1,
  "timestamp_start": "2026-09-05T15:02:10Z",
  "players": { "p1": "P001", "p2": "P004" },
  "shots": [
    { "shot_no": 1, "player_id": "P001", "ball": "RED", "points": 1, "break_after_shot": 1, "foul": false },
    { "shot_no": 2, "player_id": "P001", "ball": "BLACK", "points": 7, "break_after_shot": 8, "foul": false },
    { "shot_no": 5, "player_id": "P004", "ball": "RED", "points": 1, "break_after_shot": 1, "foul": false }
  ],
  "score": { "p1": 72, "p2": 31 },
  "winner_id": "P001",
  "highest_break": 42
}`;

  const neo4jSampleCypher = `// Head-to-Head 1-Hop Graph Traversal
MATCH (p1:Player {playerId: "P001"})-[r:PLAYED_AGAINST]-(p2:Player {playerId: "P004"})
RETURN r.matches AS totalMatches, r.wins AS winsP1, r.losses AS lossesP1

// Explainable Ranking Provenance Path
MATCH path = (p:Player {playerId: "P001"})-[:WON]->(m:Match)<-[:HAS_MATCH]-(r:Round)
RETURN path`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-900/90 p-6 rounded-2xl border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            Polyglot NoSQL Architecture Inspector
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Comparing MongoDB high-velocity BSON telemetry vs Neo4j index-free adjacency graph traversals.
          </p>
        </div>

        <div className="flex border border-zinc-800 rounded-xl p-1 bg-zinc-950 text-xs font-semibold">
          <button
            onClick={() => setActiveView('matrix')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${activeView === 'matrix' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-zinc-400 hover:text-white'}`}
          >
            Comparison Matrix
          </button>
          <button
            onClick={() => setActiveView('mongo')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${activeView === 'mongo' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-zinc-400 hover:text-white'}`}
          >
            MongoDB Document
          </button>
          <button
            onClick={() => setActiveView('neo4j')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${activeView === 'neo4j' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-zinc-400 hover:text-white'}`}
          >
            Neo4j Graph Schema
          </button>
        </div>
      </div>

      {activeView === 'matrix' && (
        <div className="bg-zinc-900/90 p-6 rounded-2xl border border-zinc-800 space-y-4">
          <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <Table className="w-4 h-4 text-emerald-400" />
            Report Page 3 NoSQL Architecture Decision Matrix
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 font-semibold uppercase tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Feature / Criteria</th>
                  <th className="py-3 px-4">Relational DB (SQL)</th>
                  <th className="py-3 px-4">MongoDB (Document)</th>
                  <th className="py-3 px-4">Neo4j (Graph)</th>
                  <th className="py-3 px-4 text-emerald-400 font-bold">Our Polyglot Choice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-medium">
                <tr className="hover:bg-zinc-950">
                  <td className="py-3 px-4 font-bold text-white">Shot / Frame Telemetry Ingestion</td>
                  <td className="py-3 px-4 text-zinc-400">Low (schema overhead)</td>
                  <td className="py-3 px-4 text-emerald-400 font-bold">Very High (append BSON)</td>
                  <td className="py-3 px-4 text-zinc-400">Moderate</td>
                  <td className="py-3 px-4 text-white font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> MongoDB for raw match telemetry
                  </td>
                </tr>
                <tr className="hover:bg-zinc-950">
                  <td className="py-3 px-4 font-bold text-white">Schema Flexibility</td>
                  <td className="py-3 px-4 text-zinc-400">Rigid (migrations)</td>
                  <td className="py-3 px-4 text-emerald-400 font-bold">Dynamic, schema-less</td>
                  <td className="py-3 px-4 text-zinc-400">Flexible node/edge attributes</td>
                  <td className="py-3 px-4 text-white font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> MongoDB for varied event formats
                  </td>
                </tr>
                <tr className="hover:bg-zinc-950">
                  <td className="py-3 px-4 font-bold text-white">Multi-Hop Head-to-Head Traversal</td>
                  <td className="py-3 px-4 text-zinc-400">Slow (O(k^d) JOINs)</td>
                  <td className="py-3 px-4 text-zinc-400">Slow (application-side)</td>
                  <td className="py-3 px-4 text-emerald-400 font-bold">Optimal (index-free, near O(1))</td>
                  <td className="py-3 px-4 text-white font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Neo4j for player & bracket graph
                  </td>
                </tr>
                <tr className="hover:bg-zinc-950">
                  <td className="py-3 px-4 font-bold text-white">Ranking Propagation</td>
                  <td className="py-3 px-4 text-zinc-400">Complex recursive SQL</td>
                  <td className="py-3 px-4 text-zinc-400">Inefficient map-reduce</td>
                  <td className="py-3 px-4 text-emerald-400 font-bold">Native graph algorithms</td>
                  <td className="py-3 px-4 text-white font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Neo4j Cypher traversals
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeView === 'mongo' && (
        <div className="bg-zinc-900/90 p-6 rounded-2xl border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              Report Page 4 MongoDB collection schema (db.frame_telemetry)
            </h3>
            <span className="text-xs font-mono text-emerald-400 font-bold">
              High-Velocity Append Ingestion
            </span>
          </div>

          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 font-mono text-xs text-emerald-400 overflow-x-auto leading-relaxed">
            <pre>{mongoSampleBSON}</pre>
          </div>
        </div>
      )}

      {activeView === 'neo4j' && (
        <div className="bg-zinc-900/90 p-6 rounded-2xl border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Network className="w-4 h-4 text-emerald-400" />
              Report Page 5 & 8 Neo4j Graph Nodes & Relationship Edges
            </h3>
            <span className="text-xs font-mono text-emerald-400 font-bold">
              Index-Free Adjacency Traversal
            </span>
          </div>

          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 font-mono text-xs text-zinc-300 overflow-x-auto leading-relaxed">
            <pre>{neo4jSampleCypher}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
