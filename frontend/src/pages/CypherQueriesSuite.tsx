import React, { useEffect, useState } from 'react';
import { Database, Play, CheckCircle2, Copy, Sparkles, Terminal, Code2, AlertTriangle, RefreshCw, Send, BookOpen } from 'lucide-react';
import { api } from '../services/api';

interface CypherQueryItem {
  id: number;
  title: string;
  category: string;
  cypher: string;
  explanation: string;
  previewData: any[];
}

export const CypherQueriesSuite: React.FC = () => {
  const [queries, setQueries] = useState<CypherQueryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [executedResults, setExecutedResults] = useState<{ [key: number]: any[] }>({});
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Custom Query Console State
  const [customQuery, setCustomQuery] = useState<string>(
    'MATCH (p:Player)\nRETURN p.name, p.currentRank, p.winRate, p.highestBreak\nORDER BY p.currentRank ASC\nLIMIT 5;'
  );
  const [runningCustom, setRunningCustom] = useState(false);
  const [customResult, setCustomResult] = useState<{
    success: boolean;
    query: string;
    executionTimeMs: number;
    recordCount: number;
    columns: string[];
    records: any[];
  } | null>(null);
  const [customError, setCustomError] = useState<string | null>(null);

  useEffect(() => {
    api.getCypherSuite()
      .then(data => {
        setQueries(data);
        const init: { [key: number]: any[] } = {};
        data.forEach((q: CypherQueryItem) => {
          init[q.id] = q.previewData;
        });
        setExecutedResults(init);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });

    // Run initial custom query
    handleRunCustom(
      'MATCH (p:Player)\nRETURN p.name, p.currentRank, p.winRate, p.highestBreak\nORDER BY p.currentRank ASC\nLIMIT 5;'
    );
  }, []);

  const handleCopy = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExecutePreset = async (id: number) => {
    try {
      const res = await api.runCypherQuery(id);
      if (res && res.results) {
        setExecutedResults(prev => ({ ...prev, [id]: res.results }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunCustom = async (queryToRun = customQuery) => {
    if (!queryToRun.trim()) return;
    setRunningCustom(true);
    setCustomError(null);
    try {
      const res = await api.executeCustomCypher(queryToRun.trim());
      if (res && res.success === false) {
        setCustomError(res.error || 'SyntaxError: Invalid Cypher statement');
        setCustomResult(null);
      } else {
        setCustomResult(res);
      }
      setRunningCustom(false);
    } catch (err: any) {
      setCustomError(err.response?.data?.error || err.message || 'Error executing Cypher query');
      setCustomResult(null);
      setRunningCustom(false);
    }
  };


  const loadQueryIntoEditor = (cypherText: string) => {
    setCustomQuery(cypherText);
    handleRunCustom(cypherText);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const quickTemplates = [
    {
      label: 'Top 5 Players',
      query: `MATCH (p:Player)
RETURN p.name, p.currentRank, p.winRate, p.highestBreak
ORDER BY p.currentRank ASC
LIMIT 5;`
    },
    {
      label: '150+ Graph Labels Count',
      query: `MATCH (n)
RETURN labels(n)[0] AS Label, count(n) AS Count;`
    },
    {
      label: 'All 10 Venues & Tables',
      query: `MATCH (v:Venue)
RETURN v.name, v.city, v.tableCount
ORDER BY v.tableCount DESC;`
    },
    {
      label: 'Head-to-Head Rivalry',
      query: `MATCH (p1:Player {playerId: "P001"})-[r:PLAYED_AGAINST]-(p2:Player {playerId: "P004"})
RETURN p1.name AS Player1, p2.name AS Player2, r.matches, r.wins, r.losses;`
    },
    {
      label: 'Century Makers Club',
      query: `MATCH (p:Player)
WHERE p.highestBreak >= 100
RETURN p.name, p.highestBreak, p.winRate;`
    },
    {
      label: 'Tournament Brackets',
      query: `MATCH (t:Tournament)
RETURN t.name, t.type, t.status, t.numRounds;`
    }
  ];

  const categories = ['ALL', ...Array.from(new Set(queries.map(q => q.category)))];
  const filteredQueries = selectedCategory === 'ALL'
    ? queries
    : queries.filter(q => q.category === selectedCategory);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-zinc-900/90 p-6 rounded-2xl border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1 font-mono flex items-center gap-2">
            <Database className="w-4 h-4" />
            Interactive Cypher Console & Evaluator Suite
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Cypher Query Studio</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Write, edit, and execute arbitrary Cypher queries directly on the live property graph with real-time tabular output.
          </p>
        </div>

        {/* Criteria Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold font-mono text-xs">
            ✓ Live Cypher Editor
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 font-bold font-mono text-xs">
            ✓ 10 Curated Queries
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 font-bold font-mono text-xs">
            ✓ 152 Graph Nodes
          </span>
        </div>
      </div>

      {/* SECTION 1: INTERACTIVE CYPHER QUERY WRITER */}
      <div className="bg-zinc-900/90 rounded-2xl border border-zinc-800 overflow-hidden shadow-xl space-y-0">
        <div className="p-4 bg-zinc-950/80 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-white text-sm font-extrabold">
            <Terminal className="w-4 h-4 text-emerald-400" />
            Write Custom Cypher Query
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCustomQuery('')}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs border border-zinc-800 transition-colors"
            >
              Clear Editor
            </button>
            <button
              onClick={() => handleRunCustom()}
              disabled={runningCustom}
              className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              <span>{runningCustom ? 'Executing...' : 'Execute Query'}</span>
            </button>
          </div>
        </div>

        {/* Query Template Chips */}
        <div className="px-5 py-3 bg-zinc-950/40 border-b border-zinc-800/80 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-zinc-500 font-semibold text-[11px] uppercase mr-1">Templates:</span>
          {quickTemplates.map((t, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCustomQuery(t.query);
                handleRunCustom(t.query);
              }}
              className="px-2.5 py-1 rounded-lg bg-zinc-900/90 border border-zinc-800 hover:border-emerald-500/40 hover:text-emerald-400 text-zinc-300 text-[11px] font-mono transition-colors"
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Textarea Editor */}
        <div className="p-5">
          <div className="relative">
            <textarea
              value={customQuery}
              onChange={e => setCustomQuery(e.target.value)}
              rows={5}
              placeholder="Enter your Cypher query here, e.g. MATCH (p:Player) RETURN p.name, p.winRate LIMIT 10;"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 font-mono text-xs text-emerald-300 focus:outline-none focus:border-emerald-500 transition-colors resize-y leading-relaxed shadow-inner"
            />
          </div>
        </div>

        {/* Error Alert */}
        {customError && (
          <div className="mx-5 mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{customError}</span>
          </div>
        )}

        {/* Custom Execution Output */}
        {customResult && (
          <div className="border-t border-zinc-800 bg-zinc-950/70 p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white">Execution Succeeded</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono text-[10px]">
                  {customResult.executionTimeMs}ms
                </span>
                <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono text-[10px]">
                  {customResult.recordCount} records
                </span>
              </div>
            </div>

            {/* Results Table */}
            {customResult.records && customResult.records.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-zinc-800/80 bg-zinc-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800 font-mono text-[11px]">
                    <tr>
                      {customResult.columns.map(col => (
                        <th key={col} className="py-2.5 px-3.5 font-bold uppercase tracking-wider">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50 font-mono text-[11px]">
                    {customResult.records.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-zinc-900/40 transition-colors">
                        {customResult.columns.map(col => {
                          const val = row[col];
                          return (
                            <td key={col} className="py-2 px-3.5 text-emerald-200">
                              {typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val ?? '')}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-zinc-500 text-xs italic py-2">Query completed with 0 records returned.</div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 2: 10 CURATED CYPHER QUERIES LIBRARY */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              Pre-built 10 Meaningful Cypher Queries
            </h3>
            <p className="text-xs text-zinc-400">
              Click any query below to run it live or load it into the editor above.
            </p>
          </div>

          {/* Category Pills Filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedCategory === cat
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Query Cards */}
        {loading ? (
          <div className="p-8 text-center text-zinc-400 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-400 mx-auto mb-2" />
            Loading query suite...
          </div>
        ) : (
          <div className="space-y-4">
            {filteredQueries.map(q => {
              const results = executedResults[q.id] || q.previewData;
              return (
                <div key={q.id} className="bg-zinc-900/90 rounded-2xl border border-zinc-800 overflow-hidden shadow-lg">
                  {/* Header */}
                  <div className="p-4 bg-zinc-950/60 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center">
                        #{q.id}
                      </span>
                      <div>
                        <h4 className="text-sm font-extrabold text-white">{q.title}</h4>
                        <span className="text-[10px] font-mono uppercase text-zinc-400 font-semibold">{q.category}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => loadQueryIntoEditor(q.cypher)}
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono flex items-center gap-1.5 border border-zinc-800 transition-colors"
                        title="Load into Query Editor above"
                      >
                        <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Edit in Terminal</span>
                      </button>

                      <button
                        onClick={() => handleCopy(q.id, q.cypher)}
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono flex items-center gap-1.5 border border-zinc-800 transition-colors"
                      >
                        {copiedId === q.id ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleExecutePreset(q.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                      >
                        <Play className="w-3 h-3 fill-slate-950" />
                        <span>Execute Live</span>
                      </button>
                    </div>
                  </div>

                  {/* Explanation */}
                  <div className="px-5 pt-3 pb-2 text-xs text-zinc-300 leading-relaxed bg-zinc-900/40">
                    <span className="font-semibold text-emerald-400">Purpose: </span>
                    {q.explanation}
                  </div>

                  {/* Cypher Code Box */}
                  <div className="px-5 py-3">
                    <pre className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/90 text-emerald-300 font-mono text-xs overflow-x-auto leading-relaxed shadow-inner">
                      <code>{q.cypher}</code>
                    </pre>
                  </div>

                  {/* Live Results Preview */}
                  {results && results.length > 0 && (
                    <div className="px-5 pb-5 pt-1">
                      <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                        Live Query Output ({results.length} records):
                      </div>
                      <div className="overflow-x-auto rounded-xl border border-zinc-800/80 bg-zinc-950/80">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-zinc-900/90 text-zinc-400 border-b border-zinc-800 font-mono text-[11px]">
                            <tr>
                              {Object.keys(results[0]).map(key => (
                                <th key={key} className="py-2 px-3">{key}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/50 font-mono text-[11px] text-zinc-300">
                            {results.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-zinc-900/40">
                                {Object.values(row).map((val: any, vIdx) => (
                                  <td key={vIdx} className="py-2 px-3 text-emerald-200">
                                    {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
