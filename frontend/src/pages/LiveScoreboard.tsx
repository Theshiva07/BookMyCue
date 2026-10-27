import React, { useEffect, useState } from 'react';
import { Radio, Trophy, CheckCircle, ShieldAlert, AlertOctagon, RotateCcw, ArrowRightLeft } from 'lucide-react';
import { api } from '../services/api';
import { socket, joinMatchRoom, leaveMatchRoom } from '../services/socket';
import { LiveScoringDoc } from '../types';

export const LiveScoreboard: React.FC = () => {
  const [activeMatchId, setActiveMatchId] = useState<string>('M001');
  const [matchDoc, setMatchDoc] = useState<LiveScoringDoc | null>(null);
  const [availableMatches, setAvailableMatches] = useState<any[]>([]);
  const [playersList, setPlayersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [breakTracker, setBreakTracker] = useState<number>(0);
  const [showFoulModal, setShowFoulModal] = useState(false);
  const [foulPoints, setFoulPoints] = useState(4);
  const [foulType, setFoulType] = useState('In-Off Cue Ball');
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // New match creation form state
  const [pA, setPA] = useState('');
  const [pB, setPB] = useState('');

  useEffect(() => {
    loadMatchesAndPlayers();
  }, []);

  useEffect(() => {
    if (!activeMatchId) return;

    fetchMatchData(activeMatchId);
    joinMatchRoom(activeMatchId);

    socket.on('score:update', (updatedDoc: LiveScoringDoc) => {
      if (updatedDoc.matchId === activeMatchId) {
        setMatchDoc(updatedDoc);
      }
    });

    socket.on('match:completed', ({ doc, syncSuccess }: { doc: LiveScoringDoc; syncSuccess: boolean }) => {
      if (doc.matchId === activeMatchId) {
        setMatchDoc(doc);
        if (syncSuccess) {
          setSyncStatus('✅ Polyglot Sync Completed: Neo4j graph updated with final scores & PLAYED_AGAINST edges!');
        }
      }
    });

    return () => {
      leaveMatchRoom(activeMatchId);
      socket.off('score:update');
      socket.off('match:completed');
    };
  }, [activeMatchId]);

  const loadMatchesAndPlayers = async () => {
    setLoading(true);
    try {
      const [matches, players] = await Promise.all([
        api.getMatches(),
        api.getPlayers()
      ]);
      setAvailableMatches(matches || []);
      setPlayersList(players || []);

      if (matches && matches.length > 0) {
        const targetId = matches[0].matchId;
        setActiveMatchId(targetId);
        await fetchMatchData(targetId);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const fetchMatchData = async (mId: string) => {
    try {
      const data = await api.getMatchDetails(mId);
      setMatchDoc(data.liveScoringDoc);
      if (data.liveScoringDoc?.playerA?.id) {
        setSelectedPlayerId(data.liveScoringDoc.playerA.id);
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setMatchDoc(null);
      setLoading(false);
    }
  };

  const handleStartNewMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pA || !pB) return;
    try {
      const res = await api.createMatch({ playerAId: pA, playerBId: pB, format: 'Snooker', bestOf: 7 });
      setSyncStatus(`New match ${res.match.matchId} created in live scoring engine!`);
      loadMatchesAndPlayers();
    } catch (err: any) {
      alert(err.message || 'Error creating match');
    }
  };

  const handleSeedReport = async () => {
    try {
      await api.seedReportData();
      await loadMatchesAndPlayers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRecordShot = async (
    type: 'pot' | 'safety' | 'foul' | 'miss',
    ballsPotted: string[] = [],
    foulInfo: any = null
  ) => {
    if (!matchDoc) return;
    let newBreak = breakTracker;
    if (type === 'pot') {
      const pts = ballsPotted.length > 0 ? (ballsPotted[0] === 'black' ? 7 : (ballsPotted[0] === 'pink' ? 6 : (ballsPotted[0] === 'blue' ? 5 : (ballsPotted[0] === 'brown' ? 4 : (ballsPotted[0] === 'green' ? 3 : (ballsPotted[0] === 'yellow' ? 2 : 1)))))) : 1;
      newBreak += pts;
      setBreakTracker(newBreak);
    } else {
      setBreakTracker(0);
      newBreak = 0;
    }

    try {
      const updated = await api.recordShot(activeMatchId, {
        playerId: selectedPlayerId,
        shotType: type,
        ballsPotted,
        breakValue: newBreak,
        foulInfo
      });
      setMatchDoc(updated);
      socket.emit('shot:recorded', {
        matchId: activeMatchId,
        playerId: selectedPlayerId,
        shotType: type,
        ballsPotted,
        breakValue: newBreak,
        foulInfo
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleEndFrame = async () => {
    if (!matchDoc) return;
    try {
      const updated = await api.endFrame(activeMatchId);
      setMatchDoc(updated);
      setBreakTracker(0);
      setSyncStatus(`Frame concluded! Running score: ${updated.playerA.name} ${updated.runningScoreA} - ${updated.runningScoreB} ${updated.playerB.name}.`);
    } catch (err: any) {
      alert(err.message || 'Error ending frame');
    }
  };

  const handleCompleteMatch = async () => {
    if (!matchDoc) return;
    try {
      const res = await api.completeMatch(activeMatchId);
      setMatchDoc(res.doc);
      setSyncStatus('✅ Polyglot Sync Completed: Neo4j graph updated with final scores & PLAYED_AGAINST edges!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAbandonMatch = async () => {
    if (!matchDoc) return;
    if (!window.confirm('Are you sure you want to abandon/forfeit this active match session?')) return;
    try {
      const res = await api.abandonMatch(activeMatchId);
      setMatchDoc(res);
      setSyncStatus('Match session abandoned.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-zinc-400 text-xs">
        <Radio className="w-5 h-5 animate-spin text-emerald-400 mr-2" />
        Connecting to MongoDB live scoring stream...
      </div>
    );
  }

  if (!matchDoc) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="bg-zinc-900/90 p-8 rounded-2xl border border-zinc-800 text-center space-y-4">
          <Radio className="w-10 h-10 text-emerald-400 mx-auto" />
          <h2 className="text-xl font-extrabold text-white">No Active Live Match Scoring Session</h2>
          <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
            There is currently no live match doc loaded. You can start a new match below using your onboarded players, or load the report dataset (VIT Vellore Open 2026).
          </p>

          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={handleSeedReport}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-600 transition-colors"
            >
              Load Report Dataset (Match M001: Rahul vs Rohan)
            </button>
          </div>
        </div>

        {/* Start New Match Form */}
        <div className="bg-zinc-900/90 p-6 rounded-2xl border border-zinc-800 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Start New Live Match Session</h3>
          <form onSubmit={handleStartNewMatch} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Player A</label>
                <select
                  value={pA}
                  onChange={e => setPA(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none"
                  required
                >
                  <option value="">Select Player A</option>
                  {playersList.map(p => (
                    <option key={p.playerId} value={p.playerId}>{p.name} (#{p.currentRank})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Player B</label>
                <select
                  value={pB}
                  onChange={e => setPB(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none"
                  required
                >
                  <option value="">Select Player B</option>
                  {playersList.map(p => (
                    <option key={p.playerId} value={p.playerId}>{p.name} (#{p.currentRank})</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-bold text-xs text-slate-950 transition-colors"
            >
              Initialize MongoDB Live Scoring Session
            </button>
          </form>
        </div>
      </div>
    );
  }

  const isCompleted = matchDoc.status === 'completed';
  const playerA = matchDoc.playerA;
  const playerB = matchDoc.playerB;
  const currentFrame = matchDoc.frames[matchDoc.frames.length - 1] || { frameScoreA: 0, frameScoreB: 0, shots: [] };

  // Calculate Snooker Red Balls & Table State
  const totalRedPots = currentFrame.shots ? currentFrame.shots.filter((s: any) => s.type === 'pot' && s.ballsPotted.includes('red')).length : 0;
  const redsRemaining = Math.max(0, 15 - totalRedPots);
  const pointsOnTable = redsRemaining > 0 ? (redsRemaining * 8 + 27) : 27;

  return (
    <div className="space-y-6">
      {/* Status & Sync Banner */}
      {syncStatus && (
        <div className="p-4 rounded-xl bg-zinc-950 border border-emerald-800/80 text-emerald-400 text-xs font-semibold flex items-center gap-3">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{syncStatus}</span>
        </div>
      )}

      {/* Main Scoreboard Header Card */}
      <div className="bg-zinc-900/90 p-6 rounded-2xl border border-zinc-800 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <span className={`w-2.5 h-2.5 rounded-full ${isCompleted ? 'bg-zinc-500' : 'bg-emerald-400'}`} />
            <div>
              <h2 className="text-lg font-extrabold text-white tracking-tight">
                {matchDoc.format.toUpperCase()} MATCH SCOREBOARD
              </h2>
              <p className="text-xs text-zinc-400 font-mono">Match ID: {matchDoc.matchId} • Frame {matchDoc.currentFrame}</p>
            </div>
          </div>

          {/* Action Buttons: End Frame, Conclude Match, Abandon Match */}
          <div className="flex items-center gap-3 flex-wrap">
            {!isCompleted && (
              <>
                <button
                  onClick={handleEndFrame}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  End Frame {matchDoc.currentFrame}
                </button>

                <button
                  onClick={handleCompleteMatch}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs transition-colors border border-zinc-700 flex items-center gap-1.5"
                >
                  <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                  Conclude Match
                </button>

                <button
                  onClick={handleAbandonMatch}
                  className="px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-red-400 border border-zinc-800 font-bold text-xs transition-colors flex items-center gap-1.5"
                >
                  <AlertOctagon className="w-3.5 h-3.5" />
                  Abandon Match
                </button>
              </>
            )}
          </div>
        </div>

        {/* Players & Live Score Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Player A Card */}
          <div 
            onClick={() => setSelectedPlayerId(playerA.id)}
            className={`cursor-pointer p-5 rounded-2xl border transition-all ${
              selectedPlayerId === playerA.id
                ? 'bg-zinc-950 border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">PLAYER A {selectedPlayerId === playerA.id ? '(STRIKER)' : ''}</span>
                <h3 className="text-lg font-extrabold text-white">{playerA.name}</h3>
              </div>
              <div className="text-3xl font-black text-emerald-400 font-mono">
                {matchDoc.runningScoreA}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800/80 flex justify-between items-center text-xs">
              <span className="text-zinc-400">Current Frame Score:</span>
              <span className="font-bold text-white text-base font-mono">{currentFrame.frameScoreA}</span>
            </div>
          </div>

          {/* VS Center Status & Snooker Ball Tracking */}
          <div className="text-center space-y-3">
            <div className="text-xs text-zinc-400 font-semibold tracking-wider uppercase">Frame {matchDoc.currentFrame} Status</div>
            <div className="text-3xl font-black text-white font-mono bg-zinc-950 py-2.5 px-6 rounded-2xl border border-zinc-800 inline-block">
              <span className="text-emerald-400">{currentFrame.frameScoreA}</span>
              <span className="text-zinc-600 px-2">:</span>
              <span className="text-zinc-300">{currentFrame.frameScoreB}</span>
            </div>

            <div className="space-y-1 text-xs font-mono">
              <div className="text-zinc-400">
                Active Break: <strong className="text-emerald-400 font-bold">{breakTracker}</strong>
              </div>
              <div className="text-zinc-500 text-[11px]">
                Reds Remaining: <strong className="text-red-400 font-bold">{redsRemaining} / 15</strong> • Points On Table: <strong className="text-zinc-300 font-bold">{pointsOnTable}</strong>
              </div>
            </div>
          </div>

          {/* Player B Card */}
          <div 
            onClick={() => setSelectedPlayerId(playerB.id)}
            className={`cursor-pointer p-5 rounded-2xl border transition-all ${
              selectedPlayerId === playerB.id
                ? 'bg-zinc-950 border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">PLAYER B {selectedPlayerId === playerB.id ? '(STRIKER)' : ''}</span>
                <h3 className="text-lg font-extrabold text-white">{playerB.name}</h3>
              </div>
              <div className="text-3xl font-black text-zinc-300 font-mono">
                {matchDoc.runningScoreB}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800/80 flex justify-between items-center text-xs">
              <span className="text-zinc-400">Current Frame Score:</span>
              <span className="font-bold text-white text-base font-mono">{currentFrame.frameScoreB}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scorer / Referee Control Panel */}
      {!isCompleted && (
        <div className="bg-zinc-900/90 p-6 rounded-2xl border border-zinc-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400" />
              Referee Shot Logging Console
            </h3>

            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-400">
                Striker: <strong className="text-emerald-400">{selectedPlayerId === playerA.id ? playerA.name : playerB.name}</strong>
              </span>

              <button
                onClick={() => setSelectedPlayerId(selectedPlayerId === playerA.id ? playerB.id : playerA.id)}
                className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-zinc-700"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Switch Turn
              </button>
            </div>
          </div>

          {/* Snooker Ball Picker Grid */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-zinc-400 font-semibold">
              <span>POTTED BALL ACTION:</span>
              <span className="font-mono text-[11px] text-red-400 font-bold">{redsRemaining} Reds Left on Table</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {[
                { name: 'red', label: `Red (1) [${redsRemaining} left]`, bg: redsRemaining > 0 ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-zinc-800 opacity-50 text-zinc-500' },
                { name: 'yellow', label: 'Yellow (2)', bg: 'bg-yellow-600 hover:bg-yellow-500 text-slate-950 font-bold' },
                { name: 'green', label: 'Green (3)', bg: 'bg-emerald-700 hover:bg-emerald-600 text-white' },
                { name: 'brown', label: 'Brown (4)', bg: 'bg-amber-900 hover:bg-amber-800 text-white' },
                { name: 'blue', label: 'Blue (5)', bg: 'bg-blue-700 hover:bg-blue-600 text-white' },
                { name: 'pink', label: 'Pink (6)', bg: 'bg-pink-600 hover:bg-pink-500 text-white' },
                { name: 'black', label: 'Black (7)', bg: 'bg-zinc-950 hover:bg-zinc-900 border border-zinc-700 text-white' }
              ].map(ball => (
                <button
                  key={ball.name}
                  onClick={() => handleRecordShot('pot', [ball.name])}
                  className={`py-3 px-2 rounded-xl text-xs font-bold transition-transform active:scale-95 shadow-sm ${ball.bg}`}
                >
                  {ball.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tactical & Foul Buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => handleRecordShot('safety')}
              className="flex-1 min-w-[120px] py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors border border-zinc-700"
            >
              Safety Shot
            </button>
            <button
              onClick={() => handleRecordShot('miss')}
              className="flex-1 min-w-[120px] py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-bold transition-colors border border-zinc-700"
            >
              Miss / End Turn
            </button>
            <button
              onClick={() => setShowFoulModal(true)}
              className="flex-1 min-w-[120px] py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-red-400 text-xs font-bold transition-colors border border-zinc-800"
            >
              Record Foul
            </button>
          </div>
        </div>
      )}

      {/* Frame Shot Feed & Timeline */}
      <div className="bg-zinc-900/90 p-6 rounded-2xl border border-zinc-800 space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
          Frame Shot Log & Break Stream (MongoDB Telemetry)
        </h3>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
          {currentFrame.shots && currentFrame.shots.length > 0 ? (
            currentFrame.shots.map((shot: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-zinc-500 text-[11px]">Shot #{shot.shotNumber}</span>
                  <span className="font-semibold text-zinc-200">
                    {shot.playerId === playerA.id ? playerA.name : playerB.name}
                  </span>
                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                    shot.type === 'pot' ? 'text-emerald-400' :
                    shot.type === 'safety' ? 'text-blue-400' :
                    shot.type === 'foul' ? 'text-red-400' : 'text-zinc-400'
                  }`}>
                    {shot.type.toUpperCase()} {shot.ballsPotted.length > 0 ? `(${shot.ballsPotted.join(', ')})` : ''}
                  </span>
                </div>
                <div className="font-mono text-zinc-400 text-[11px]">
                  Break: {shot.breakValue}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-zinc-500 text-xs italic">
              No shots logged yet for Frame {matchDoc.currentFrame}. Use control panel above to begin live scoring!
            </div>
          )}
        </div>
      </div>

      {/* Foul Modal */}
      {showFoulModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 p-6 rounded-2xl max-w-md w-full border border-zinc-800 space-y-4">
            <h3 className="text-base font-bold text-red-400 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" />
              Record Foul Event
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Foul Type:</label>
                <select
                  value={foulType}
                  onChange={e => setFoulType(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-200"
                >
                  <option value="In-Off Cue Ball">In-Off Cue Ball (4 pts)</option>
                  <option value="Foul on Black">Foul on Black (7 pts)</option>
                  <option value="Hit Wrong Ball First">Hit Wrong Ball First (4 pts)</option>
                  <option value="Push Shot">Push Shot (4 pts)</option>
                </select>
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Points Awarded to Opponent:</label>
                <input
                  type="number"
                  min="4"
                  max="7"
                  value={foulPoints}
                  onChange={e => setFoulPoints(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-200 font-mono"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowFoulModal(false)}
                className="flex-1 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleRecordShot('foul', [], { type: foulType, pointsAwarded: foulPoints });
                  setShowFoulModal(false);
                }}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
              >
                Submit Foul
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
