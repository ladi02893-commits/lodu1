import React, { useState } from 'react';
import { ArrowLeft, Award, Crown, Medal, Swords, Trophy, Users, Zap } from 'lucide-react';
import { sound } from '../../lib/audio';
import { friendsService } from '../../services/friendsService';
import { UserProfile } from '../../types/database';

interface LeaderboardViewProps {
  onBack: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ onBack }) => {
  const [tab, setTab] = useState<'global' | 'weekly' | 'friends'>('global');

  const list: UserProfile[] = friendsService.getLeaderboard(tab);
  const top3 = list.slice(0, 3);
  const rest = list.slice(3);

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center pb-16 overflow-x-hidden">
      {/* Header */}
      <header className="w-full max-w-4xl px-4 py-4 flex items-center justify-between border-b border-amber-500/20 bg-slate-950/80 sticky top-0 z-20 backdrop-blur-md">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-300 transition-all cursor-pointer text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Court</span>
        </button>

        <h2 className="font-royal font-bold text-sm sm:text-base text-amber-300">
          Imperial Hall of Fame
        </h2>

        <div className="w-16" />
      </header>

      <main className="w-full max-w-3xl px-4 py-6 space-y-6">
        {/* Tabs: Global, Weekly, Friends */}
        <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800">
          {(['global', 'weekly', 'friends'] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                sound.playClick();
                setTab(t);
              }}
              className={`
                py-2 rounded-xl font-royal font-bold text-xs capitalize transition-all cursor-pointer
                ${tab === t ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'}
              `}
            >
              {t === 'global' ? 'Global Nobility' : t === 'weekly' ? 'Weekly Crown' : 'Companions'}
            </button>
          ))}
        </div>

        {/* Top 3 Podium Cards */}
        {top3.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-4 pb-2">
            {/* Rank #2 (Silver) */}
            {top3[1] && (
              <div className="p-3 sm:p-4 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-600/60 flex flex-col items-center text-center shadow-lg order-1">
                <div className="w-6 h-6 rounded-full bg-slate-300 text-slate-950 font-black text-xs flex items-center justify-center mb-1">
                  2
                </div>
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-800 border-2 border-slate-300 flex items-center justify-center mb-1">
                  <Crown className="w-6 h-6 text-slate-300" />
                </div>
                <span className="font-bold text-xs sm:text-sm text-slate-200 truncate max-w-full">
                  {top3[1].display_name}
                </span>
                <span className="text-[10px] text-amber-300 font-bold mt-0.5">
                  {top3[1].wins} Wins
                </span>
              </div>
            )}

            {/* Rank #1 (Gold) */}
            {top3[0] && (
              <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-amber-950/80 via-slate-900 to-slate-950 border-2 border-amber-400 flex flex-col items-center text-center shadow-2xl shadow-amber-500/20 order-2 scale-105">
                <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center mb-1 shadow">
                  1
                </div>
                <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-amber-950 border-2 border-amber-300 flex items-center justify-center mb-1">
                  <Trophy className="w-8 h-8 text-amber-300" />
                </div>
                <span className="font-royal font-black text-xs sm:text-base text-amber-200 truncate max-w-full">
                  {top3[0].display_name}
                </span>
                <span className="text-xs text-amber-400 font-black mt-0.5">
                  {top3[0].wins} Wins
                </span>
              </div>
            )}

            {/* Rank #3 (Bronze) */}
            {top3[2] && (
              <div className="p-3 sm:p-4 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-800/60 flex flex-col items-center text-center shadow-lg order-3">
                <div className="w-6 h-6 rounded-full bg-amber-800 text-amber-200 font-black text-xs flex items-center justify-center mb-1">
                  3
                </div>
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-800 border-2 border-amber-700 flex items-center justify-center mb-1">
                  <Medal className="w-6 h-6 text-amber-600" />
                </div>
                <span className="font-bold text-xs sm:text-sm text-slate-200 truncate max-w-full">
                  {top3[2].display_name}
                </span>
                <span className="text-[10px] text-amber-300 font-bold mt-0.5">
                  {top3[2].wins} Wins
                </span>
              </div>
            )}
          </div>
        )}

        {/* Full Table */}
        <div className="space-y-2">
          {list.map((player, index) => (
            <div
              key={player.id}
              className={`
                p-3 sm:p-4 rounded-2xl border flex items-center justify-between transition-all
                ${index < 3 ? 'bg-slate-900/90 border-amber-500/30' : 'bg-slate-900/50 border-slate-800'}
              `}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-center font-bold text-xs text-slate-400">
                  #{index + 1}
                </span>

                <div className="w-10 h-10 rounded-full bg-slate-950 border border-amber-400/30 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-amber-300" />
                </div>

                <div>
                  <div className="font-bold text-xs sm:text-sm text-slate-100">
                    {player.display_name}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Lv.{player.level} &bull; {player.total_captures} Captures
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-black text-sm text-amber-300">
                  {player.wins} Wins
                </div>
                <div className="text-[10px] text-purple-300">
                  {player.xp.toLocaleString()} XP
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};
