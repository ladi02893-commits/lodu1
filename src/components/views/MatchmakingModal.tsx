import React, { useEffect, useState } from 'react';
import { Crown, Loader2, Sparkles, Users, X } from 'lucide-react';
import { matchmakingService } from '../../services/matchmakingService';

interface MatchmakingModalProps {
  onCancel: () => void;
}

export const MatchmakingModal: React.FC<MatchmakingModalProps> = ({ onCancel }) => {
  const [status, setStatus] = useState({
    isSearching: true,
    mode: null as any,
    elapsedSeconds: 0,
    playersFound: 1,
    maxPlayers: 4,
  });

  useEffect(() => {
    const unsub = matchmakingService.subscribe((s) => {
      setStatus(s);
    });
    return () => unsub();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-fade-in">
      <div className="w-full max-w-sm bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 shadow-2xl space-y-6 text-center relative overflow-hidden">
        {/* Radar Background Pulsing Rings */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full border border-amber-500/20 animate-ping pointer-events-none" style={{ animationDuration: '3s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border border-amber-500/30 animate-pulse pointer-events-none" />

        {/* Center Emblem */}
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-500 p-0.5 shadow-xl shadow-amber-500/30 flex items-center justify-center">
            <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
              <Crown className="w-10 h-10 text-amber-300 animate-bounce" />
            </div>
          </div>

          <h3 className="font-royal font-black text-xl text-amber-200 tracking-wider">
            Seeking Worthy Rivals...
          </h3>
          <p className="text-xs text-slate-400">
            Searching the multi-realm network for noble opponents.
          </p>
        </div>

        {/* Players Found Meter */}
        <div className="relative z-10 space-y-2 bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1 text-amber-400">
              <Users className="w-4 h-4" />
              <span>Chamber Capacity</span>
            </span>
            <span>
              {status.playersFound} / {status.maxPlayers} Monarchy
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-500 rounded-full"
              style={{ width: `${(status.playersFound / status.maxPlayers) * 100}%` }}
            />
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            Elapsed: 00:{status.elapsedSeconds < 10 ? `0${status.elapsedSeconds}` : status.elapsedSeconds}
          </div>
        </div>

        {/* Cancel Button */}
        <button
          type="button"
          onClick={() => {
            matchmakingService.cancelSearch();
            onCancel();
          }}
          className="relative z-10 w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 border border-slate-700"
        >
          <X className="w-4 h-4" />
          <span>Cancel Search</span>
        </button>
      </div>
    </div>
  );
};
