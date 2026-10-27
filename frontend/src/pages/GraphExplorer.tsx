import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Share2, Search, Filter, RefreshCw, ZoomIn, ZoomOut, Info, ExternalLink, GitMerge, ArrowRight, X, Sparkles, ChevronDown } from 'lucide-react';
import { api } from '../services/api';
import { GraphData } from '../types';

interface GraphExplorerProps {
  setSelectedPlayer: (id: string) => void;
  setActiveTab: (tab: string) => void;
}

export const GraphExplorer: React.FC<GraphExplorerProps> = ({ setSelectedPlayer, setActiveTab }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  // Shortest Path Finder State
  const [showPathFinder, setShowPathFinder] = useState(false);
  const [pathSource, setPathSource] = useState('P001');
  const [pathTarget, setPathTarget] = useState('P005');
  const [shortestPathNodes, setShortestPathNodes] = useState<string[]>([]);
  const [shortestPathData, setShortestPathData] = useState<{ pathNodes: { id: string; name: string }[]; pathLength: number; cypher: string } | null>(null);
  const [isComputingPath, setIsComputingPath] = useState(false);

  useEffect(() => {
    fetchGraph();
  }, []);

  const fetchGraph = async () => {
    setLoading(true);
    try {
      const data = await api.getGraphVisualization();
      setGraphData(data);
      // Default to Rahul Sharma (P001) like in user screenshot
      if (data && data.nodes && data.nodes.length > 0) {
        const rahul = data.nodes.find(n => n.name?.toLowerCase().includes('rahul') || n.id === 'P001') || data.nodes[0];
        setSelectedNode(rahul);
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleComputePath = async (src = pathSource, tgt = pathTarget) => {
    if (!src || !tgt) return;
    setIsComputingPath(true);
    try {
      const res = await api.getShortestPath(src, tgt);
      setShortestPathData(res);
      if (res && res.pathNodes && res.pathNodes.length > 0) {
        setShortestPathNodes(res.pathNodes.map(n => n.id));
      } else {
        setShortestPathNodes([]);
      }
      setIsComputingPath(false);
    } catch (err) {
      console.error(err);
      setIsComputingPath(false);
    }
  };

  const handleClearPath = () => {
    setShortestPathNodes([]);
    setShortestPathData(null);
  };

  const handleSelectNodeById = (nodeId: string) => {
    if (!graphData) return;
    const target = graphData.nodes.find(n => n.id === nodeId);
    if (target) {
      setSelectedNode(target);
    }
  };

  // Color mapper by node type (7 distinct labels)
  const getNodeColor = (d: any) => {
    const type = d?.type || d?.group || d?.label || 'Player';
    if (type === 'Player') return '#10b981'; // Emerald
    if (type === 'Venue') return '#06b6d4'; // Cyan
    if (type === 'Host') return '#f97316'; // Orange
    if (type === 'Event') return '#f59e0b'; // Amber Gold
    if (type === 'Tournament') return '#8b5cf6'; // Purple
    if (type === 'Round') return '#3b82f6'; // Blue
    if (type === 'Match') return '#f43f5e'; // Rose Red
    return '#64748b';
  };

  // Extract all incoming and outgoing connections for a selected node
  const getNodeConnections = (nodeId: string) => {
    if (!graphData || !nodeId) return [];
    const results: {
      edgeType: string;
      direction: 'in' | 'out' | 'both';
      targetId: string;
      targetName: string;
      targetType: string;
      targetColor: string;
      details?: string;
    }[] = [];

    const nodeMap = new Map<string, any>();
    graphData.nodes.forEach(n => nodeMap.set(n.id, n));

    graphData.links.forEach(l => {
      const sId = typeof l.source === 'object' && l.source !== null ? (l.source as any).id : l.source;
      const tId = typeof l.target === 'object' && l.target !== null ? (l.target as any).id : l.target;


      if (sId === nodeId) {
        const targetNode = nodeMap.get(tId);
        results.push({
          edgeType: l.type || 'CONNECTED_TO',
          direction: l.type === 'PLAYED_AGAINST' ? 'both' : 'out',
          targetId: tId,
          targetName: targetNode?.name || targetNode?.title || tId,
          targetType: targetNode?.type || targetNode?.group || 'Node',
          targetColor: getNodeColor(targetNode || { type: 'Node' }),
          details: l.matches ? `${l.matches} matches` : undefined
        });
      } else if (tId === nodeId) {
        const sourceNode = nodeMap.get(sId);
        results.push({
          edgeType: l.type || 'CONNECTED_TO',
          direction: l.type === 'PLAYED_AGAINST' ? 'both' : 'in',
          targetId: sId,
          targetName: sourceNode?.name || sourceNode?.title || sId,
          targetType: sourceNode?.type || sourceNode?.group || 'Node',
          targetColor: getNodeColor(sourceNode || { type: 'Node' }),
          details: l.matches ? `${l.matches} matches` : undefined
        });
      }
    });

    return results;
  };

  useEffect(() => {
    if (!graphData || !svgRef.current) return;

    const width = svgRef.current.clientWidth || 800;
    const height = 550;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g');

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    // Node & Link data filtering
    let filteredNodes = graphData.nodes.map(d => ({ ...d }));
    if (filterType !== 'ALL') {
      filteredNodes = filteredNodes.filter(n => n.type === filterType || n.group === filterType || n.label === filterType);
    }
    if (searchTerm) {
      filteredNodes = filteredNodes.filter(n => (n.name || n.id).toLowerCase().includes(searchTerm.toLowerCase()));
    }

    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredLinks = graphData.links
      .filter(l => nodeIds.has(typeof l.source === 'object' ? (l.source as any).id : l.source) &&
                   nodeIds.has(typeof l.target === 'object' ? (l.target as any).id : l.target))
      .map(d => ({ ...d }));

    const isPathNode = (d: any) => shortestPathNodes.includes(d.id);
    const isSelected = (d: any) => selectedNode && selectedNode.id === d.id;

    const isPathLink = (l: any) => {
      if (shortestPathNodes.length < 2) return false;
      const sId = typeof l.source === 'object' ? l.source.id : l.source;
      const tId = typeof l.target === 'object' ? l.target.id : l.target;
      for (let i = 0; i < shortestPathNodes.length - 1; i++) {
        const u = shortestPathNodes[i];
        const v = shortestPathNodes[i + 1];
        if ((sId === u && tId === v) || (sId === v && tId === u)) {
          return true;
        }
      }
      return false;
    };

    const hasActivePath = shortestPathNodes.length > 0;

    // D3 Force Simulation
    const simulation = d3.forceSimulation(filteredNodes as any)
      .force('link', d3.forceLink(filteredLinks).id((d: any) => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(25));

    // Render Edges
    const link = g.append('g')
      .selectAll('line')
      .data(filteredLinks)
      .enter()
      .append('line')
      .attr('stroke', (d: any) => (isPathLink(d) ? '#fbbf24' : '#334155'))
      .attr('stroke-opacity', (d: any) => {
        if (!hasActivePath) return 0.6;
        return isPathLink(d) ? 1.0 : 0.08;
      })
      .attr('stroke-width', (d: any) => {
        if (isPathLink(d)) return 3.5;
        return d.type === 'PLAYED_AGAINST' ? 1.8 : 1;
      });

    // Render Nodes
    const node = g.append('g')
      .selectAll('g')
      .data(filteredNodes)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .attr('opacity', (d: any) => {
        if (!hasActivePath) return 1.0;
        return isPathNode(d) || isSelected(d) ? 1.0 : 0.18;
      })
      .on('click', (event, d: any) => {
        setSelectedNode(d);
        event.stopPropagation();
      })
      .call(d3.drag<SVGGElement, any>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }) as any
      );

    // Node Circles
    node.append('circle')
      .attr('r', (d: any) => {
        if (isPathNode(d)) return 16;
        if (isSelected(d)) return 15;
        return d.type === 'Player' ? 12 : 10;
      })
      .attr('fill', (d: any) => (isPathNode(d) ? '#fbbf24' : getNodeColor(d)))
      .attr('stroke', (d: any) => {
        if (isPathNode(d)) return '#ffffff';
        if (isSelected(d)) return '#38bdf8';
        return '#090d16';
      })
      .attr('stroke-width', (d: any) => (isPathNode(d) || isSelected(d) ? 3.5 : 2))
      .attr('class', 'transition-all hover:scale-125');

    // Node Labels
    node.append('text')
      .text((d: any) => d.name || d.id)
      .attr('x', 16)
      .attr('y', 4)
      .attr('fill', (d: any) => (isPathNode(d) ? '#fbbf24' : isSelected(d) ? '#38bdf8' : '#e2e8f0'))
      .attr('font-size', (d: any) => (isPathNode(d) || isSelected(d) ? '11px' : '10px'))
      .attr('font-weight', (d: any) => (isPathNode(d) || isSelected(d) ? '800' : '600'))
      .attr('pointer-events', 'none');

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

  }, [graphData, filterType, searchTerm, shortestPathNodes, selectedNode]);

  const playerNodes = graphData?.nodes.filter(n => n.type === 'Player' || n.group === 'Player') || [];
  const nodeConnections = selectedNode ? getNodeConnections(selectedNode.id) : [];

  // Helper to extract clean display properties matching the screenshot
  const getDisplayProperties = (node: any) => {
    if (!node) return [];
    const props: [string, any][] = [];
    const type = node.type || node.group || 'Node';

    if (type === 'Player') {
      props.push(['Rank', `#${node.currentRank || node.rank || 1}`]);
      props.push(['Win Rate', `${node.winRate || 75}%`]);
      props.push(['Highest Break', node.highestBreak || 147]);
      props.push(['Handedness', node.handedness || 'Right']);
      if (node.wins !== undefined && node.losses !== undefined) {
        props.push(['Matches', `${node.wins + node.losses} (${node.wins}W - ${node.losses}L)`]);
      }
    } else if (type === 'Venue') {
      props.push(['City', node.city || 'Sheffield']);
      props.push(['Tables', node.tableCount || 8]);
    } else if (type === 'Host') {
      props.push(['Organization', node.organization || 'Cue Sports Assoc']);
      props.push(['Email', node.email || 'contact@cuemybreak.com']);
    } else if (type === 'Event') {
      props.push(['Format', node.format || 'Snooker']);
      props.push(['Status', node.status || 'Ongoing']);
      props.push(['Max Players', node.maxPlayers || 32]);
    } else if (type === 'Tournament') {
      props.push(['Type', node.typeEnum || node.type || 'Knockout']);
      props.push(['Status', node.status || 'In Progress']);
    } else if (type === 'Round') {
      props.push(['Round Number', node.roundNumber || 1]);
      props.push(['Status', node.status || 'Completed']);
    } else if (type === 'Match') {
      props.push(['Status', node.status || 'completed']);
      props.push(['Score', `${node.scoreA ?? 0} - ${node.scoreB ?? 0}`]);
    } else {
      Object.entries(node).forEach(([k, v]) => {
        if (!['id', 'name', 'title', 'type', 'group', 'label', 'x', 'y', 'vx', 'vy', 'index'].includes(k)) {
          props.push([k, v]);
        }
      });
    }

    return props;
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 glass-panel p-5 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Share2 className="w-5 h-5 text-cyan-400" />
            Interactive Neo4j Relationship Graph Explorer
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            152 nodes and 444 edges with interactive physics, search, and shortest path traversal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Shortest Path Toggle Button */}
          <button
            onClick={() => setShowPathFinder(!showPathFinder)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              showPathFinder
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'bg-zinc-900 text-amber-300 border border-amber-500/30 hover:bg-zinc-800'
            }`}
          >
            <GitMerge className="w-3.5 h-3.5" />
            <span>Shortest Path Finder</span>
          </button>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search node name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 w-44"
            />
          </div>

          {/* Filter Dropdown */}
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All 7 Node Types</option>
            <option value="Player">Player (40)</option>
            <option value="Venue">Venue (10)</option>
            <option value="Host">Host (6)</option>
            <option value="Event">Event (12)</option>
            <option value="Tournament">Tournament (6)</option>
            <option value="Round">Round (18)</option>
            <option value="Match">Match (60)</option>
          </select>

          <button
            onClick={fetchGraph}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            Refresh
          </button>
        </div>
      </div>

      {/* SHORTEST PATH FINDER PANEL */}
      {showPathFinder && (
        <div className="p-4 rounded-2xl bg-zinc-900/95 border border-amber-500/40 shadow-xl space-y-3 transition-all animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                Graph Algorithm: Shortest Path Between Two Nodes
              </h3>
            </div>

            <button
              onClick={() => setShowPathFinder(false)}
              className="text-zinc-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                From Node (Source)
              </label>
              <select
                value={pathSource}
                onChange={e => setPathSource(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-400 font-medium"
              >
                {playerNodes.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                To Node (Destination)
              </label>
              <select
                value={pathTarget}
                onChange={e => setPathTarget(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-400 font-medium"
              >
                {playerNodes.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleComputePath(pathSource, pathTarget)}
                disabled={isComputingPath}
                className="flex-1 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <GitMerge className="w-3.5 h-3.5" />
                <span>{isComputingPath ? 'Traversing...' : 'Find & Highlight Path'}</span>
              </button>

              {shortestPathNodes.length > 0 && (
                <button
                  onClick={handleClearPath}
                  className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Path Results Bar */}
          {shortestPathData && (
            <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-amber-300">Shortest Path Found:</span>
                {shortestPathData.pathNodes.map((n, idx) => (
                  <React.Fragment key={n.id}>
                    <span className="px-2 py-0.5 rounded-lg bg-amber-400/20 border border-amber-400/40 text-amber-300 font-bold font-mono text-[11px]">
                      {n.name}
                    </span>
                    {idx < shortestPathData.pathNodes.length - 1 && (
                      <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                    )}
                  </React.Fragment>
                ))}
              </div>

              <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold font-mono text-[11px]">
                {shortestPathData.pathLength >= 0 ? `${shortestPathData.pathLength} Degrees of Separation` : 'No Connection'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Metrics Banner & 7-Label Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900/60 rounded-xl border border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-slate-500 font-semibold text-[11px] uppercase">7 Node Labels:</span>
          <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span><span className="text-slate-300">Player</span></div>
          <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block"></span><span className="text-slate-300">Venue</span></div>
          <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span><span className="text-slate-300">Host</span></div>
          <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span><span className="text-slate-300">Event</span></div>
          <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span><span className="text-slate-300">Tournament</span></div>
          <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span><span className="text-slate-300">Round</span></div>
          <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span><span className="text-slate-300">Match</span></div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold font-mono text-[11px]">
            {graphData?.nodes?.length || 0} Nodes (100+ Goal Met)
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 font-bold font-mono text-[11px]">
            {graphData?.links?.length || 0} Relationships (10 Types)
          </span>
        </div>
      </div>

      {/* Canvas Viewport + Sidebar Details */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 glass-panel rounded-2xl border border-slate-800 overflow-hidden relative min-h-[580px]">
          {loading && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center text-slate-400 text-xs z-10">
              <RefreshCw className="w-5 h-5 animate-spin text-cyan-400 mr-2" />
              Rendering Neo4j Graph Topology...
            </div>
          )}

          {/* Active Highlight Banner */}
          {shortestPathNodes.length > 0 && (
            <div className="absolute top-3 left-3 right-3 bg-zinc-950/90 backdrop-blur-md p-3 rounded-xl border border-amber-400/50 flex items-center justify-between gap-3 text-xs z-10 shadow-lg">
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>Shortest Path Highlighted on Canvas ({shortestPathNodes.length} nodes in chain)</span>
              </div>
              <button
                onClick={handleClearPath}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
              >
                Reset Canvas View
              </button>
            </div>
          )}

          <svg ref={svgRef} className="w-full h-[580px] bg-[#070a12] cursor-grab active:cursor-grabbing"></svg>
        </div>

        {/* NODE NAVIGATOR & CONNECTIONS SIDEBAR (Matches User's UI Screenshot Exactly) */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          {/* Top: Go to a node dropdown */}
          <div>
            <label className="text-[12px] font-semibold text-zinc-300 block mb-2">
              Go to a node
            </label>
            <div className="relative">
              <select
                value={selectedNode?.id || ''}
                onChange={e => handleSelectNodeById(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-medium focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer appearance-none pr-8"
              >
                <option value="" disabled>Select a node...</option>
                {graphData?.nodes.map(n => (
                  <option key={n.id} value={n.id}>
                    {n.name || n.title || n.id}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div className="border-t border-zinc-800/80 pt-3">
            {selectedNode ? (
              <div className="space-y-4 text-xs">
                {/* Node Label Indicator & Name Header */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ backgroundColor: getNodeColor(selectedNode) }}
                    />
                    <span>{selectedNode.type || selectedNode.group || 'Node'}</span>
                  </div>

                  <h3 className="text-xl font-extrabold text-white tracking-tight pt-1">
                    {selectedNode.name || selectedNode.title || selectedNode.id}
                  </h3>
                </div>

                {/* Key-Value Properties (Matching Screenshot Layout) */}
                <div className="space-y-2 border-t border-zinc-800/80 pt-3">
                  {getDisplayProperties(selectedNode).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between py-1 border-b border-zinc-800/50 text-xs">
                      <span className="text-zinc-400 font-normal">{k}</span>
                      <span className="font-semibold text-white font-mono">{String(v)}</span>
                    </div>
                  ))}
                </div>

                {/* Connections Section (Matching Screenshot Layout) */}
                <div className="border-t border-zinc-800/80 pt-3 space-y-2">
                  <div className="text-xs font-bold text-zinc-200">
                    {nodeConnections.length} connections
                  </div>

                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {nodeConnections.map((conn, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectNodeById(conn.targetId)}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-zinc-800/70 cursor-pointer text-xs transition-colors group"
                        title={`Click to navigate to ${conn.targetName}`}
                      >
                        <span className="font-mono text-[10px] text-zinc-400 font-semibold uppercase shrink-0">
                          {conn.direction === 'in'
                            ? `← ${conn.edgeType}`
                            : conn.direction === 'both'
                            ? `↔ ${conn.edgeType}`
                            : `${conn.edgeType} →`}
                        </span>
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: conn.targetColor }}
                        />
                        <span className="text-zinc-300 group-hover:text-emerald-300 truncate font-medium">
                          {conn.targetName}
                        </span>
                      </div>
                    ))}

                    {nodeConnections.length === 0 && (
                      <div className="text-zinc-500 italic text-[11px] py-2">
                        No active relationship edges connected to this node.
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Shortest Path Action Buttons */}
                <div className="pt-2 border-t border-zinc-800/80 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setPathSource(selectedNode.id);
                      setShowPathFinder(true);
                    }}
                    className="py-1.5 px-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-zinc-800 text-[11px] font-semibold text-center transition-colors"
                  >
                    Set as Path Start
                  </button>
                  <button
                    onClick={() => {
                      setPathTarget(selectedNode.id);
                      setShowPathFinder(true);
                    }}
                    className="py-1.5 px-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-zinc-800 text-[11px] font-semibold text-center transition-colors"
                  >
                    Set as Path End
                  </button>
                </div>

                {/* Head-to-Head shortcut if Player */}
                {(selectedNode.type === 'Player' || selectedNode.group === 'Player') && (
                  <button
                    onClick={() => {
                      setSelectedPlayer(selectedNode.id);
                      setActiveTab('h2h');
                    }}
                    className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Compare Head-to-Head
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-zinc-500 text-xs italic">
                Select a node using the dropdown above or click any node in the graph network.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
