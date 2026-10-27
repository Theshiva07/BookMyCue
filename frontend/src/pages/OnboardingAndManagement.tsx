import React, { useState, useEffect } from 'react';
import { UserPlus, Building2, CalendarPlus, Trophy, RefreshCw, Database, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export const OnboardingAndManagement: React.FC = () => {
  const [activeForm, setActiveForm] = useState<'venue' | 'event' | 'player' | 'register'>('player');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Venues state
  const [venues, setVenues] = useState<any[]>([]);
  const [vName, setVName] = useState('');
  const [vCity, setVCity] = useState('');
  const [vTables, setVTables] = useState(6);

  // Player state
  const [pName, setPName] = useState('');
  const [pEmail, setPEmail] = useState('');
  const [pHand, setPHand] = useState<'Right' | 'Left' | 'Ambidextrous'>('Right');
  const [pVenue, setPVenue] = useState('');

  // Event state
  const [eTitle, setETitle] = useState('');
  const [eType, setEType] = useState<'Competition' | 'Friendly'>('Competition');
  const [eFormat, setEFormat] = useState('Snooker');
  const [eVenue, setEVenue] = useState('');
  const [eFee, setEFee] = useState(500);

  // Register state
  const [events, setEvents] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [regPlayer, setRegPlayer] = useState('');
  const [regEvent, setRegEvent] = useState('');

  const loadAll = () => {
    api.getVenues().then(setVenues).catch(() => {});
    api.getEvents().then(setEvents).catch(() => {});
    api.getPlayers().then(setPlayers).catch(() => {});
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vName || !vCity) return;
    try {
      await api.createVenue({ name: vName, city: vCity, tableCount: vTables });
      setMsg({ type: 'success', text: `Venue "${vName}" created in Neo4j graph!` });
      setVName(''); setVCity('');
      loadAll();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to create venue' });
    }
  };

  const handleCreatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName) return;
    try {
      const res = await api.createPlayer({ name: pName, email: pEmail, handedness: pHand, homeVenueId: pVenue });
      setMsg({ type: 'success', text: `Player "${res.name}" (${res.playerId}) onboarded!` });
      setPName(''); setPEmail('');
      loadAll();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to create player' });
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eTitle || !eVenue) return;
    try {
      const res = await api.createEvent({ title: eTitle, type: eType, format: eFormat, venueId: eVenue, entry_fee: eFee });
      setMsg({ type: 'success', text: `Event "${res.title}" created successfully!` });
      setETitle('');
      loadAll();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to create event' });
    }
  };

  const handleRegisterPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regPlayer || !regEvent) return;
    try {
      await api.registerForEvent(regEvent, regPlayer);
      setMsg({ type: 'success', text: `Player registered for event edge updated in Neo4j!` });
      loadAll();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to register player' });
    }
  };

  const handleResetDb = async () => {
    if (!window.confirm('Are you sure you want to clear all data to an empty state?')) return;
    try {
      await api.resetDatabase();
      setMsg({ type: 'success', text: 'Database reset to clean state (0 nodes).' });
      loadAll();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleSeedReport = async () => {
    try {
      await api.seedReportData();
      setMsg({ type: 'success', text: 'Loaded Report Sample Data (Rahul Sharma, Vellore Open 2026, VIT Snooker Hall).' });
      loadAll();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & DB Actions */}
      <div className="bg-zinc-900/90 p-6 rounded-2xl border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-400" />
            Host & Event Management Portal
          </h2>
          <p className="text-xs text-zinc-400">
            Create Hosts, Venues, Events, Players, and Registrations dynamically.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResetDb}
            className="px-3 py-2 rounded-xl bg-zinc-950 text-red-400 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset DB (Clean State)
          </button>

          <button
            onClick={handleSeedReport}
            className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Database className="w-3.5 h-3.5" />
            Load Report Dataset (VIT Open 2026)
          </button>
        </div>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl border text-xs flex items-center gap-2 ${msg.type === 'success' ? 'bg-zinc-950 border-emerald-800/80 text-emerald-400' : 'bg-zinc-950 border-red-800/80 text-red-400'}`}>
          {msg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 text-xs font-semibold gap-2">
        <button
          onClick={() => setActiveForm('player')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all ${activeForm === 'player' ? 'border-emerald-400 text-emerald-400 font-bold' : 'border-transparent text-zinc-400 hover:text-white'}`}
        >
          <UserPlus className="w-4 h-4" /> Onboard Player
        </button>
        <button
          onClick={() => setActiveForm('venue')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all ${activeForm === 'venue' ? 'border-emerald-400 text-emerald-400 font-bold' : 'border-transparent text-zinc-400 hover:text-white'}`}
        >
          <Building2 className="w-4 h-4" /> Add Venue
        </button>
        <button
          onClick={() => setActiveForm('event')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all ${activeForm === 'event' ? 'border-emerald-400 text-emerald-400 font-bold' : 'border-transparent text-zinc-400 hover:text-white'}`}
        >
          <CalendarPlus className="w-4 h-4" /> Create Event
        </button>
        <button
          onClick={() => setActiveForm('register')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all ${activeForm === 'register' ? 'border-emerald-400 text-emerald-400 font-bold' : 'border-transparent text-zinc-400 hover:text-white'}`}
        >
          <Trophy className="w-4 h-4" /> Event Registration
        </button>
      </div>

      {/* Form Content */}
      <div className="bg-zinc-900/90 p-6 rounded-2xl border border-zinc-800 max-w-2xl">
        {activeForm === 'player' && (
          <form onSubmit={handleCreatePlayer} className="space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Onboard New Player</h3>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Full Name</label>
              <input
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={pName}
                onChange={e => setPName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Email Address</label>
              <input
                type="email"
                placeholder="rahul@cuemybreak.com"
                value={pEmail}
                onChange={e => setPEmail(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Handedness</label>
                <select
                  value={pHand}
                  onChange={e => setPHand(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Right">Right Handed</option>
                  <option value="Left">Left Handed</option>
                  <option value="Ambidextrous">Ambidextrous</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Home Venue</label>
                <select
                  value={pVenue}
                  onChange={e => setPVenue(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">None / Select Venue</option>
                  {venues.map(v => (
                    <option key={v.venueId} value={v.venueId}>{v.name} ({v.city})</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-bold text-xs text-slate-950 transition-colors"
            >
              Add Player to Graph Database
            </button>
          </form>
        )}

        {activeForm === 'venue' && (
          <form onSubmit={handleCreateVenue} className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Add New Tournament Venue</h3>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Venue Name</label>
              <input
                type="text"
                placeholder="e.g. VIT Snooker Hall"
                value={vName}
                onChange={e => setVName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">City</label>
                <input
                  type="text"
                  placeholder="e.g. Vellore"
                  value={vCity}
                  onChange={e => setVCity(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Number of Snooker Tables</label>
                <input
                  type="number"
                  value={vTables}
                  onChange={e => setVTables(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-bold text-xs text-slate-950 transition-colors shadow-lg shadow-emerald-500/20"
            >
              Add Venue Node to Neo4j
            </button>
          </form>
        )}

        {activeForm === 'event' && (
          <form onSubmit={handleCreateEvent} className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Create New Snooker Event</h3>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Event Title</label>
              <input
                type="text"
                placeholder="e.g. Vellore Open 2026"
                value={eTitle}
                onChange={e => setETitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Event Type</label>
                <select
                  value={eType}
                  onChange={e => setEType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Competition">Competition</option>
                  <option value="Friendly">Friendly</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Format</label>
                <select
                  value={eFormat}
                  onChange={e => setEFormat(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Snooker">Snooker</option>
                  <option value="8-ball">8-ball</option>
                  <option value="9-ball">9-ball</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Venue</label>
                <select
                  value={eVenue}
                  onChange={e => setEVenue(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  required
                >
                  <option value="">Select Venue</option>
                  {venues.map(v => (
                    <option key={v.venueId} value={v.venueId}>{v.name} ({v.city})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Entry Fee (₹)</label>
                <input
                  type="number"
                  value={eFee}
                  onChange={e => setEFee(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-bold text-xs text-slate-950 transition-colors shadow-lg shadow-emerald-500/20"
            >
              Create Event & Link Venue
            </button>
          </form>
        )}

        {activeForm === 'register' && (
          <form onSubmit={handleRegisterPlayer} className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Register Player for Event</h3>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Select Event</label>
              <select
                value={regEvent}
                onChange={e => setRegEvent(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                required
              >
                <option value="">Select Event</option>
                {events.map(ev => (
                  <option key={ev.eventId} value={ev.eventId}>{ev.title} ({ev.type})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Select Player</label>
              <select
                value={regPlayer}
                onChange={e => setRegPlayer(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                required
              >
                <option value="">Select Player</option>
                {players.map(p => (
                  <option key={p.playerId} value={p.playerId}>{p.name} (#{p.currentRank})</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-bold text-xs text-slate-950 transition-colors shadow-lg shadow-emerald-500/20"
            >
              Create [:REGISTERED_FOR] Relationship Edge
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
