import React, { useState } from 'react';
import {
  ArrowLeft,
  Award,
  Check,
  Coins,
  Crown,
  Edit2,
  Flame,
  LayoutGrid,
  LogOut,
  Mail,
  Percent,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  User,
  Zap,
} from 'lucide-react';
import { sound } from '../../lib/audio';
import { authService } from '../../services/authService';
import { UserProfile } from '../../types/database';

interface ProfileViewProps {
  onBack: () => void;
  onLogout?: () => void;
  onOpenAuth?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onBack, onLogout, onOpenAuth }) => {
  const [user, setUser] = useState<UserProfile>(authService.getCurrentUser());
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user.display_name);

  const winRate =
    user.games_played > 0
      ? Math.round((user.wins / user.games_played) * 100)
      : 0;

  const handleSaveName = () => {
    if (!editName.trim()) return;
    const updated = authService.updateProfile({ display_name: editName.trim() });
    setUser({ ...updated });
    setIsEditing(false);
    sound.playClick();
  };

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
          Royal Monarch Profile
        </h2>

        <div className="w-16" />
      </header>

      <main className="w-full max-w-3xl px-4 py-6 space-y-6">
        {/* Profile Identity Card */}
        <div className="p-6 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-500/40 shadow-xl flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          {/* Avatar Frame */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-500 p-1 shadow-lg shadow-amber-500/30 flex items-center justify-center flex-shrink-0">
            <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
              <Crown className="w-10 h-10 sm:w-12 sm:h-12 text-amber-300" />
            </div>
            <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-amber-500 text-xs font-black text-slate-950 border-2 border-slate-900">
              Lv.{user.level}
            </span>
          </div>

          {/* User Details */}
          <div className="flex-1 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={20}
                      className="bg-slate-950 border border-amber-400 rounded-xl px-3 py-1 text-sm font-bold text-amber-200 outline-none"
                    />
                    <button
                      onClick={handleSaveName}
                      className="p-1.5 rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <h3 className="text-xl sm:text-2xl font-royal font-bold text-slate-100">
                      {user.display_name}
                    </h3>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
                      title="Edit Display Name"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="text-xs text-amber-400/80 font-mono">
                  Player Seal: #{user.player_id}
                </div>
              </div>

              {/* Wallet Purse */}
              <div className="flex items-center gap-2 justify-center sm:justify-end">
                <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300 font-bold text-sm">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span>{user.coins.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Level & XP Meter */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Imperial Experience (XP)</span>
                <span className="text-amber-300 font-semibold">{user.xp.toLocaleString()} XP</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full"
                  style={{ width: `${Math.min(100, (user.xp % 1000) / 10)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="space-y-3">
          <h4 className="font-royal font-bold text-sm text-slate-200 uppercase tracking-wider">
            Battle Honors & Statistics
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Matches & Wins */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col items-center gap-1 text-center">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span className="text-xs text-slate-400">Triumphs</span>
              <span className="text-xl font-black text-amber-300">{user.wins}</span>
            </div>

            {/* Total Matches */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col items-center gap-1 text-center">
              <Shield className="w-5 h-5 text-blue-400" />
              <span className="text-xs text-slate-400">Played</span>
              <span className="text-xl font-black text-blue-300">{user.games_played}</span>
            </div>

            {/* Win Rate */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col items-center gap-1 text-center">
              <Percent className="w-5 h-5 text-emerald-400" />
              <span className="text-xs text-slate-400">Win Rate</span>
              <span className="text-xl font-black text-emerald-300">{winRate}%</span>
            </div>

            {/* Captures */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col items-center gap-1 text-center">
              <Swords className="w-5 h-5 text-rose-400" />
              <span className="text-xs text-slate-400">Captures</span>
              <span className="text-xl font-black text-rose-300">{user.total_captures}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Current Win Streak */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-amber-950/30 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-950/60 border border-orange-500/40 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Current Win Streak</div>
                  <div className="text-lg font-black text-orange-300">{user.current_win_streak} Consecutive</div>
                </div>
              </div>
            </div>

            {/* Best Win Streak */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-amber-950/30 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-center">
                  <Award className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">All-Time Best Streak</div>
                  <div className="text-lg font-black text-amber-300">{user.best_win_streak} Victories</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Heraldry & Cosmetics Equipped */}
        <div className="space-y-3">
          <h4 className="font-royal font-bold text-sm text-slate-200 uppercase tracking-wider">
            Equipped Heraldry Loadout
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Dice Style</div>
                <div className="text-xs font-bold text-amber-200 capitalize">
                  {user.dice_skin?.replace('dice_', '') || 'Gold'}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-950/60 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Board Theme</div>
                <div className="text-xs font-bold text-blue-200 capitalize">
                  {user.board_theme?.replace('theme_', '') || 'Royal Mahogany'}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Token Model</div>
                <div className="text-xs font-bold text-purple-200 capitalize">
                  {user.token_skin?.replace('token_', '') || 'Imperial Crown'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Authentication & Logout Card */}
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 flex-shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-royal font-bold text-xs sm:text-sm text-slate-100">
                {user.email ? user.email : 'Guest Noble Session'}
              </h4>
              <p className="text-[11px] text-slate-400">
                Role: <span className="font-mono font-bold text-amber-300 uppercase">{user.role || (user.is_admin ? 'Admin' : 'User')}</span> • Player ID: #{user.player_id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user.email ? (
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  authService.logout();
                  if (onLogout) onLogout();
                }}
                className="px-4 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  if (onOpenAuth) onOpenAuth();
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-bold text-xs shadow transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Register / Sign In</span>
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
