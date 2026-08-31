import React, { useState, useEffect } from 'react';
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
import { friendsService } from '../../services/friendsService';
import { UserProfile } from '../../types/database';

interface ProfileViewProps {
  onBack: () => void;
  onLogout?: () => void;
  onOpenAuth?: () => void;
  onOpenFriends?: () => void;
  onOpenAdmin?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  onBack,
  onLogout,
  onOpenAuth,
  onOpenFriends,
  onOpenAdmin,
}) => {
  const [user, setUser] = useState<UserProfile>(authService.getCurrentUser());
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user.display_name);
  const [socialCounts, setSocialCounts] = useState(() => friendsService.getSocialCounts());

  useEffect(() => {
    const unsubFriends = friendsService.subscribe(() => {
      setSocialCounts(friendsService.getSocialCounts());
    });
    const unsubAuth = authService.subscribe((u) => {
      if (u) {
        setUser(u);
        setSocialCounts(friendsService.getSocialCounts());
      }
    });
    return () => {
      unsubFriends();
      unsubAuth();
    };
  }, []);

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
    <div className="w-full min-h-screen bg-[#070b16] text-slate-100 flex flex-col items-center pb-20 overflow-x-hidden font-sans">
      {/* Header */}
      <header className="w-full max-w-xl px-4 py-3 flex items-center justify-between border-b border-amber-500/10 bg-[#070b16]/95 sticky top-0 z-30 backdrop-blur-md">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0e1424] border border-slate-800 text-slate-300 hover:text-amber-300 transition-all cursor-pointer text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Court</span>
        </button>

        <h2 className="font-royal font-black text-sm sm:text-base text-amber-300 uppercase tracking-wider">
          Monarch Profile
        </h2>

        <div className="w-14" />
      </header>

      <main className="w-full max-w-xl px-3.5 sm:px-4 py-4 space-y-3.5 z-10">
        {/* Profile Identity Card */}
        <div className="p-4 sm:p-5 rounded-3xl bg-[#0e1424] border border-amber-500/30 shadow-xl flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          {/* Avatar Frame */}
          <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 p-0.5 shadow-md shadow-amber-500/20 flex items-center justify-center flex-shrink-0">
            <img
              src="/logo.png"
              alt="Avatar"
              className="w-full h-full rounded-full object-cover bg-slate-900 border-2 border-[#070b16]"
            />
            <span className="absolute -bottom-1 -left-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-[9px] font-black text-slate-950 shadow border border-[#070b16]">
              Lv.{user.level}
            </span>
          </div>

          {/* User Details */}
          <div className="flex-1 space-y-2 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                {isEditing ? (
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={20}
                      className="bg-[#070b16] border border-amber-400 rounded-xl px-3 py-1 text-sm font-bold text-amber-200 outline-none"
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
                    <h3 className="text-lg sm:text-xl font-royal font-black text-slate-100">
                      {user.display_name}
                    </h3>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
                      title="Edit Display Name"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <div className="text-xs text-amber-400 font-mono font-bold">
                  Seal: #{user.player_id}
                </div>
              </div>

              {/* Wallet Purse */}
              <div className="flex items-center gap-1.5 justify-center sm:justify-end">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#070b16] border border-amber-500/50 text-amber-300 font-bold text-xs sm:text-sm shadow-inner">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span>{Math.max(0, Math.floor(Math.round(user.coins || 0))).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Level & XP Meter */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>XP Progress</span>
                <span className="text-amber-300 font-bold">{user.xp.toLocaleString()} XP</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800/80 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${Math.min(100, (user.xp % 1000) / 10)}%` }}
                />
              </div>
            </div>

            {/* Social Followers Bar */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  if (onOpenFriends) onOpenFriends();
                }}
                className="py-1.5 px-2 rounded-xl bg-[#070b16] hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-center transition-all cursor-pointer"
              >
                <div className="text-xs font-black text-amber-300">
                  {socialCounts.followers}
                </div>
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                  Followers
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  if (onOpenFriends) onOpenFriends();
                }}
                className="py-1.5 px-2 rounded-xl bg-[#070b16] hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-center transition-all cursor-pointer"
              >
                <div className="text-xs font-black text-amber-300">
                  {socialCounts.following}
                </div>
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                  Following
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  if (onOpenFriends) onOpenFriends();
                }}
                className="py-1.5 px-2 rounded-xl bg-[#070b16] hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-center transition-all cursor-pointer"
              >
                <div className="text-xs font-black text-emerald-400">
                  {socialCounts.companions}
                </div>
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                  Companions
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="space-y-2.5">
          <h4 className="font-royal font-black text-xs sm:text-sm text-amber-400 uppercase tracking-wider px-1">
            Battle Honors & Statistics
          </h4>

          <div className="grid grid-cols-4 gap-2">
            <div className="p-3 rounded-2xl bg-[#0e1424] border border-amber-500/20 flex flex-col items-center gap-1 text-center">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-[10px] text-slate-400">Wins</span>
              <span className="text-base sm:text-lg font-black text-amber-300">{user.wins}</span>
            </div>

            <div className="p-3 rounded-2xl bg-[#0e1424] border border-slate-800 flex flex-col items-center gap-1 text-center">
              <Shield className="w-4 h-4 text-blue-400" />
              <span className="text-[10px] text-slate-400">Played</span>
              <span className="text-base sm:text-lg font-black text-blue-300">{user.games_played}</span>
            </div>

            <div className="p-3 rounded-2xl bg-[#0e1424] border border-slate-800 flex flex-col items-center gap-1 text-center">
              <Percent className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] text-slate-400">Win Rate</span>
              <span className="text-base sm:text-lg font-black text-emerald-300">{winRate}%</span>
            </div>

            <div className="p-3 rounded-2xl bg-[#0e1424] border border-slate-800 flex flex-col items-center gap-1 text-center">
              <Swords className="w-4 h-4 text-rose-400" />
              <span className="text-[10px] text-slate-400">Captures</span>
              <span className="text-base sm:text-lg font-black text-rose-300">{user.total_captures}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-2xl bg-[#0e1424] border border-slate-800 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-orange-950/60 border border-orange-500/40 flex items-center justify-center flex-shrink-0">
                <Flame className="w-4 h-4 text-orange-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400">Win Streak</div>
                <div className="text-sm font-black text-orange-300 truncate">{user.current_win_streak} Consec.</div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#0e1424] border border-slate-800 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
                <Award className="w-4 h-4 text-amber-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400">Best Streak</div>
                <div className="text-sm font-black text-amber-300 truncate">{user.best_win_streak} Wins</div>
              </div>
            </div>
          </div>
        </div>

        {/* Heraldry Loadout */}
        <div className="space-y-2.5">
          <h4 className="font-royal font-black text-xs sm:text-sm text-amber-400 uppercase tracking-wider px-1">
            Equipped Heraldry Loadout
          </h4>

          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-2xl bg-[#0e1424] border border-slate-800 flex flex-col items-center text-center gap-1.5">
              <div className="w-9 h-9 rounded-xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[9px] text-slate-400 uppercase">Dice</div>
                <div className="text-xs font-bold text-amber-200 capitalize truncate">
                  {user.dice_skin?.replace('dice_', '') || 'Gold'}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#0e1424] border border-slate-800 flex flex-col items-center text-center gap-1.5">
              <div className="w-9 h-9 rounded-xl bg-blue-950/60 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <LayoutGrid className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[9px] text-slate-400 uppercase">Board</div>
                <div className="text-xs font-bold text-blue-200 capitalize truncate">
                  {user.board_theme?.replace('theme_', '') || 'Mahogany'}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#0e1424] border border-slate-800 flex flex-col items-center text-center gap-1.5">
              <div className="w-9 h-9 rounded-xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[9px] text-slate-400 uppercase">Token</div>
                <div className="text-xs font-bold text-purple-200 capitalize truncate">
                  {user.token_skin?.replace('token_', '') || 'Imperial'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Quick Action for Admin Users */}
        {(user.is_admin || user.role === 'admin' || user.role === 'moderator') && onOpenAdmin && (
          <div className="p-3.5 rounded-3xl bg-[#0e1424] border border-amber-500/40 flex items-center justify-between gap-3 shadow">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <span className="font-royal font-black text-xs text-amber-300 uppercase tracking-wider">
                Imperial Admin Chamber
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onOpenAdmin();
              }}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-royal font-black text-xs cursor-pointer shadow hover:brightness-110"
            >
              Access Console
            </button>
          </div>
        )}

        {/* Account Authentication & Logout Card */}
        <div className="p-4 rounded-3xl bg-[#0e1424] border border-slate-800 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 flex-shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="font-royal font-bold text-xs sm:text-sm text-slate-100 truncate">
                {user.email ? user.email : 'Guest Noble Session'}
              </h4>
              <p className="text-[10px] text-slate-400 truncate">
                Role: <span className="font-mono font-bold text-amber-300 uppercase">{user.role || (user.is_admin ? 'Admin' : 'User')}</span> • ID: #{user.player_id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {user.email ? (
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  authService.logout();
                  if (onLogout) onLogout();
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
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
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-bold text-xs shadow transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
