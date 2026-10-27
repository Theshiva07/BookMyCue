import React from 'react';
import { LayoutDashboard, Share2, Cpu, Radio, Trophy, Users, GitBranch, Calendar, Building2, TrendingDown, Layers, Database } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'manage', label: 'Host & Management', icon: Building2 },
    { id: 'graph', label: 'Graph Explorer', icon: Share2, badge: 'Neo4j' },
    { id: 'decay', label: 'Ranking Decay', icon: TrendingDown, badge: 'FR-04' },
    { id: 'dual', label: 'Polyglot Inspector', icon: Layers },
    { id: 'cypher', label: '10 Cypher Queries', icon: Database, badge: '10 Queries' },
    { id: 'gds', label: 'GDS Intelligence', icon: Cpu, badge: 'PageRank' },
    { id: 'live', label: 'Live Scoreboard', icon: Radio },
    { id: 'rankings', label: 'Leaderboard', icon: Trophy },
    { id: 'h2h', label: 'Head-to-Head', icon: Users },
    { id: 'tournaments', label: 'Brackets', icon: GitBranch },
    { id: 'events', label: 'Events & Venues', icon: Calendar }
  ];

  return (
    <aside className="w-64 bg-[#050505] border-r border-zinc-800/80 p-4 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-65px)]">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold tracking-wider text-zinc-500 uppercase">
          Navigation
        </div>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all duration-150 ${
                isActive
                  ? 'bg-zinc-900 text-emerald-400 border border-emerald-500/30 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-zinc-900 text-zinc-400 border border-zinc-800">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Direct Neo4j Browser Link */}
        <a
          href="http://localhost:7474"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs bg-sky-500/10 text-sky-400 border border-sky-500/30 hover:bg-sky-500/20 transition-all duration-150 mt-2 text-decoration-none"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
            <span className="font-semibold">Neo4j Browser (:7474)</span>
          </div>
          <span className="text-[10px] bg-sky-950 px-1.5 py-0.5 rounded border border-sky-800 text-sky-300 font-mono">
            Active
          </span>
        </a>
      </div>

      {/* Polyglot Database Info Card */}
      <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs space-y-1.5">
        <div className="font-semibold text-zinc-200 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          Polyglot Architecture
        </div>
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          MongoDB absorbs telemetry streams while Neo4j maintains index-free adjacency graph relationships.
        </p>
      </div>
    </aside>
  );
};
