import React from 'react';
import { Activity, Radio, Target, Database } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <header className="sticky top-0 z-50 bg-[#050505]/95 backdrop-blur-md border-b border-zinc-800/80 px-4 lg:px-8 py-3">
      <div className="flex items-center justify-between">
        {/* Brand Logo */}
        <div 
          onClick={() => setActiveTab('dashboard')} 
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-700/60 flex items-center justify-center text-emerald-400 group-hover:border-emerald-500/50 transition-colors">
            <Target className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white font-sans">
                Book My Cue <span className="text-emerald-400 text-xs font-normal font-mono ml-1">v1.0</span>
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-medium">Real-Time Tournament & Event Graph Engine</p>
          </div>
        </div>

        {/* Database Quick Status Badges */}
        <div className="hidden md:flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800 text-zinc-300">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>MongoDB: <strong className="text-zinc-200 font-sans font-medium">Live Telemetry</strong></span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800 text-zinc-300">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Neo4j Graph: <strong className="text-zinc-200 font-sans font-medium">Index-Free Adjacency</strong></span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('live')}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition-colors"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>Live Scoreboard</span>
          </button>

          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800">
            <div className="w-6 h-6 rounded-full bg-zinc-800 text-emerald-400 font-bold flex items-center justify-center text-xs">
              R
            </div>
            <div className="hidden sm:block text-left text-xs">
              <div className="font-semibold text-zinc-200">Referee / Host</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
