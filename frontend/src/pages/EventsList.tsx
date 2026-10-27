import React, { useEffect, useState } from 'react';
import { Calendar, MapPin, Users, Plus, CheckCircle } from 'lucide-react';
import { api } from '../services/api';
import { Event } from '../types';

export const EventsList: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [registeredEvents, setRegisteredEvents] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.getEvents().then(data => {
      setEvents(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const handleRegister = async (eventId: string) => {
    try {
      await api.registerForEvent(eventId, 'plr-1');
      setRegisteredEvents(prev => new Set(prev).add(eventId));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-emerald-400" />
            Events & Venues Directory
          </h2>
          <p className="text-xs text-slate-400">
            Registered players and venue hosting mapped in Neo4j graph nodes.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px] text-slate-400 text-xs">
          Loading events...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map(e => {
            const isReg = registeredEvents.has(e.eventId);
            return (
              <div key={e.eventId} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      e.status === 'Ongoing' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      e.status === 'Completed' ? 'bg-slate-800 text-slate-400' : 'bg-cyan-500/20 text-cyan-400'
                    }`}>
                      {e.status}
                    </span>
                    <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {e.format}
                    </span>
                  </div>

                  <h3 className="text-lg font-extrabold text-white leading-snug">{e.title}</h3>

                  <div className="space-y-1.5 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Crucible Theatre / Alex Palace Venue</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Max Players: <strong>{e.maxPlayers}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800">
                  {isReg ? (
                    <button disabled className="w-full py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 border border-emerald-500/30">
                      <CheckCircle className="w-3.5 h-3.5" /> Registered in Graph
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRegister(e.eventId)}
                      className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/20"
                    >
                      Register Player in Neo4j
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
