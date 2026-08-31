import React from 'react';
import { ArrowRight, Bot, Crown, Play, Shield, Sparkles, Swords, Trophy, Users, Zap } from 'lucide-react';
import { sound } from '../../lib/audio';

interface LandingViewProps {
  onPlayNow: () => void;
  onSelectMode: (mode: 'quick_4' | 'vs_computer' | 'local_4' | 'room') => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onPlayNow,
  onSelectMode,
}) => {
  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between pb-12 overflow-x-hidden">
      {/* Royal Crown Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-amber-500/10 blur-[120px] pointer-events-none rounded-full" />

      {/* Top Navbar */}
      <header className="w-full max-w-6xl px-4 py-4 sm:py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Royal Ludo Online Logo"
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover shadow-lg shadow-amber-500/30 border border-amber-400/40 transform hover:scale-105 transition-transform"
          />
          <div>
            <h1 className="text-xl sm:text-2xl font-royal font-black text-amber-300 tracking-wider">
              ROYAL LUDO
            </h1>
            <span className="text-[10px] font-bold text-amber-500/80 tracking-widest uppercase">
              Online Grand Realm
            </span>
          </div>
        </div>

        <button
          id="landing-enter-court-btn"
          type="button"
          onClick={() => {
            sound.playClick();
            onPlayNow();
          }}
          className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 font-royal font-bold text-xs sm:text-sm text-slate-950 shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
        >
          <span>Enter Court</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-5xl px-4 py-6 sm:py-12 flex flex-col items-center text-center space-y-6 z-10">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 rounded-3xl blur-xl opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
          <img
            src="/logo.png"
            alt="Royal Ludo Online"
            className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-3xl object-cover shadow-2xl border-2 border-amber-400/60"
          />
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-950/60 border border-amber-400/40 text-amber-300 text-xs font-bold shadow-inner">
          <Sparkles className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
          <span>Server-Authoritative Multi-Realm Ludo</span>
        </div>

        <h2 className="text-3xl sm:text-5xl md:text-6xl font-royal font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 tracking-tight max-w-3xl leading-tight drop-shadow-sm">
          Claim Your Throne in the Royal Arena
        </h2>

        <p className="text-sm sm:text-base md:text-lg text-slate-300 max-w-2xl font-medium leading-relaxed">
          Master the classic dice strategy game with authentic royal aesthetics, real-time multiplayer, tactical AI bots, and customizable heraldry.
        </p>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 w-full max-w-md">
          <button
            id="landing-quick-play-btn"
            type="button"
            onClick={() => {
              sound.playClick();
              onSelectMode('quick_4');
            }}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 font-royal font-extrabold text-base text-slate-950 shadow-2xl shadow-amber-500/40 hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-3 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            <span>Quick Match (4P)</span>
          </button>

          <button
            id="landing-vs-bot-btn"
            type="button"
            onClick={() => {
              sound.playClick();
              onSelectMode('vs_computer');
            }}
            className="w-full py-4 rounded-2xl bg-slate-900 border-2 border-amber-500/40 font-royal font-bold text-base text-amber-200 hover:bg-slate-800 hover:border-amber-400 active:scale-98 transition-all flex items-center justify-center gap-3 cursor-pointer shadow-lg"
          >
            <Bot className="w-5 h-5 text-amber-400" />
            <span>Vs Royal AI</span>
          </button>
        </div>

        {/* Game Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full pt-12 text-left">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/30 transition-all space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-royal font-bold text-sm text-slate-100">Online & Private Rooms</h3>
            <p className="text-xs text-slate-400">Create private 6-digit royal codes to battle friends across devices.</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/30 transition-all space-y-2">
            <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-royal font-bold text-sm text-slate-100">Server-Authoritative</h3>
            <p className="text-xs text-slate-400">Fair play guaranteed. Dice generation, turns, and moves verified by engine.</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/30 transition-all space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="font-royal font-bold text-sm text-slate-100">Heuristic AI Bots</h3>
            <p className="text-xs text-slate-400">Challenge Easy, Medium, or Hard bots with tactical minimax decisions.</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/30 transition-all space-y-2">
            <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Trophy className="w-5 h-5" />
            </div>
            <h3 className="font-royal font-bold text-sm text-slate-100">Quests & Leaderboard</h3>
            <p className="text-xs text-slate-400">Climb weekly rankings, complete daily missions, and customize dice heraldry.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl px-4 text-center text-xs text-slate-500 z-10">
        Royal Ludo Online &copy; {new Date().getFullYear()} &bull; Original Strategy Game &bull; Fair Play Multi-Realm
      </footer>
    </div>
  );
};
