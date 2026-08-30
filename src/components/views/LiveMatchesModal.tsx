import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  Crown,
  Flame,
  Sparkles,
  Trophy,
  Users,
  X,
  Coins,
  Radio,
} from 'lucide-react';
import { sound } from '../../lib/audio';

export interface LiveMatchEntry {
  matchId: string;
  roomCode?: string;
  tierName: string;
  potAmount: number;
  players: { username: string; color: string; avatar: string }[];
  mode: string;
  spectatorCount: number;
  durationMinutes: number;
}

const DEFAULT_LIVE_MATCHES: LiveMatchEntry[] = [
  {
    matchId: 'live_match_emperor_1',
    roomCode: 'EMP991',
    tierName: 'Grand Emperor Table',
    potAmount: 1000000,
    players: [
      { username: 'Emperor Aurelius', color: 'red', avatar: 'avatar_1' },
      { username: 'Lady Seraphina', color: 'green', avatar: 'avatar_4' },
      { username: 'Lord Vanguard', color: 'yellow', avatar: 'avatar_3' },
      { username: 'Morrigan Shadow', color: 'blue', avatar: 'avatar_2' },
    ],
    mode: 'Quick 4P High-Stakes',
    spectatorCount: 142,
    durationMinutes: 6,
  },
  {
    matchId: 'live_match_sovereign_2',
    roomCode: 'SOV421',
    tierName: 'Imperial Sovereign',
    potAmount: 200000,
    players: [
      { username: 'Prince Rustam', color: 'red', avatar: 'avatar_5' },
      { username: 'Queen Valeria', color: 'yellow', avatar: 'avatar_4' },
    ],
    mode: 'High-Roller Duel',
    spectatorCount: 68,
    durationMinutes: 4,
  },
  {
    matchId: 'live_match_team_3',
    roomCode: 'TEAM88',
    tierName: 'Royal Palace 2v2',
    potAmount: 80000,
    players: [
      { username: 'Lord Reginald (Team A)', color: 'red', avatar: 'avatar_2' },
      { username: 'Knight Arthur (Team B)', color: 'green', avatar: 'avatar_3' },
      { username: 'Noble Darius (Team A)', color: 'yellow', avatar: 'avatar_1' },
      { username: 'Lady Guinevere (Team B)', color: 'blue', avatar: 'avatar_4' },
    ],
    mode: '2v2 Team Battle',
    spectatorCount: 95,
    durationMinutes: 8,
  },
];

interface LiveMatchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWatchMatch: (match: LiveMatchEntry) => void;
}

export const LiveMatchesModal: React.FC<LiveMatchesModalProps> = ({
  isOpen,
  onClose,
  onSelectWatchMatch,
}) => {
  const [liveList] = useState<LiveMatchEntry[]>(DEFAULT_LIVE_MATCHES);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-xl bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950/50 border-2 border-amber-500/50 rounded-3xl p-5 sm:p-7 shadow-[0_20px_70px_rgba(0,0,0,0.85)] text-white overflow-hidden my-auto"
        >
          {/* Ambient Glow */}
          <div className="absolute -top-20 -left-20 w-60 h-60 bg-red-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-300 text-[11px] font-black uppercase tracking-wider mb-1.5 animate-pulse">
              <Radio className="w-3.5 h-3.5 text-rose-400 animate-spin" />
              Live Imperial Broadcast
              <Sparkles className="w-3 h-3 text-yellow-300" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-transparent font-serif">
              Grand Arena Spectator
            </h2>
            <p className="text-xs text-slate-300">
              Watch top monarchs and high-stakes jackpot showdowns in real time!
            </p>
          </div>

          {/* Matches List */}
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {liveList.map((match) => (
              <div
                key={match.matchId}
                className="p-4 rounded-2xl bg-slate-950/80 border border-amber-500/30 hover:border-amber-400 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full bg-rose-950 border border-rose-500/40 text-rose-300 text-[10px] font-black uppercase flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                      LIVE ({match.durationMinutes}m)
                    </span>
                    <span className="font-royal font-bold text-xs sm:text-sm text-amber-200">
                      {match.tierName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pot: <strong className="text-amber-300">🪙 {match.potAmount.toLocaleString()} Coins</strong></span>
                  </div>

                  {/* Seated Players */}
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 flex-wrap">
                    <span>Monarchs:</span>
                    {match.players.map((p, idx) => (
                      <span key={idx} className="font-semibold text-slate-200">
                        {p.username}{idx < match.players.length - 1 ? ',' : ''}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                  <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{match.spectatorCount} watching</span>
                  </div>

                  <button
                    onClick={() => {
                      sound.playClick();
                      onSelectWatchMatch(match);
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 font-bold text-xs uppercase tracking-wider text-slate-950 shadow cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Watch Live</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
