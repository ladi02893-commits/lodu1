import React, { useState, useEffect } from 'react';
import {
  Award,
  Bot,
  Calendar,
  Coins,
  Crown,
  Flame,
  Gift,
  Play,
  Plus,
  Settings,
  Shield,
  ShoppingBag,
  Sparkles,
  Swords,
  Target,
  Trophy,
  User,
  Users,
  Volume2,
  Zap,
} from 'lucide-react';
import { sound } from '../../lib/audio';
import { UserProfile } from '../../types/database';
import { rewardService, DailyLoginStatus } from '../../services/rewardService';
import { luckyWheelService } from '../../services/luckyWheelService';
import { StakeSelectorModal } from './StakeSelectorModal';

interface HomeDashboardProps {
  user: UserProfile;
  onSelectMode: (
    mode:
      | 'quick_2'
      | 'quick_4'
      | 'team_2v2'
      | 'vs_computer'
      | 'local_2'
      | 'local_3'
      | 'local_4'
      | 'room_create'
      | 'room_join',
    botDifficulty?: 'easy' | 'medium' | 'hard',
    betAmount?: number
  ) => void;
  onNavigate: (
    view:
      | 'profile'
      | 'friends'
      | 'leaderboard'
      | 'missions'
      | 'achievements'
      | 'shop'
      | 'settings'
      | 'admin'
      | 'clan'
  ) => void;
  onOpenDailyLogin?: () => void;
  onOpenLuckyWheel?: () => void;
  onOpenSpectator?: () => void;
  onOpenPayment?: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  user,
  onSelectMode,
  onNavigate,
  onOpenDailyLogin,
  onOpenLuckyWheel,
  onOpenSpectator,
  onOpenPayment,
}) => {
  const [showBotModal, setShowBotModal] = useState(false);
  const [showLocalModal, setShowLocalModal] = useState(false);
  const [botDifficulty, setBotDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [dailyStatus, setDailyStatus] = useState<DailyLoginStatus>(() => rewardService.getDailyLoginStatus());
  const [wheelStatus, setWheelStatus] = useState(() => luckyWheelService.getStatus());
  const [stakeModalConfig, setStakeModalConfig] = useState<{
    isOpen: boolean;
    mode: 'quick_2' | 'quick_4' | 'team_2v2' | 'vs_computer';
    modeTitle: string;
    playerCount: number;
    botDifficulty?: 'easy' | 'medium' | 'hard';
  } | null>(null);

  useEffect(() => {
    setDailyStatus(rewardService.getDailyLoginStatus());
  }, [user]);

  // Level & XP math
  const currentLevel = user.level || 1;
  const currentXp = user.xp || 0;
  // XP formula: base required for next level
  const xpForNextLevel = currentLevel * currentLevel * 150;
  const xpProgress = Math.min(100, Math.round((currentXp / xpForNextLevel) * 100));

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center pb-16 overflow-x-hidden">
      {/* Top Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-80 bg-amber-500/10 blur-[130px] pointer-events-none rounded-full" />

      {/* Royal Header Bar */}
      <header className="w-full max-w-5xl px-4 py-3 sm:py-4 flex items-center justify-between border-b border-amber-500/20 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        {/* User Avatar & Level Profile */}
        <button
          id="home-profile-btn"
          type="button"
          onClick={() => {
            sound.playClick();
            onNavigate('profile');
          }}
          className="flex items-center gap-3 p-1.5 rounded-2xl hover:bg-slate-900 border border-transparent hover:border-amber-500/30 transition-all cursor-pointer text-left"
        >
          <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 p-0.5 shadow-md flex items-center justify-center">
            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
              <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
            </div>
            <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-[10px] font-black text-slate-950 shadow border border-slate-900">
              Lv.{currentLevel}
            </span>
          </div>

          <div className="hidden sm:block">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-slate-100">{user.display_name}</span>
              <span className="text-[10px] text-amber-400/80 font-mono">#{user.player_id}</span>
            </div>
            <div className="w-28 h-1.5 rounded-full bg-slate-800 overflow-hidden mt-1">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
                style={{ width: `${Math.max(10, xpProgress)}%` }}
              />
            </div>
          </div>
        </button>

        {/* Currency & Quick Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Lucky Fortune Wheel Trigger */}
          <button
            id="home-lucky-wheel-btn"
            type="button"
            onClick={() => {
              sound.playClick();
              if (onOpenLuckyWheel) onOpenLuckyWheel();
            }}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-inner ${
              wheelStatus.canFreeSpin
                ? 'bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 text-slate-950 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)] animate-pulse'
                : 'bg-slate-900 border-amber-500/30 text-amber-300 hover:bg-slate-800'
            }`}
            title="Lucky Fortune Spin Wheel"
          >
            <Sparkles className={`w-4 h-4 ${wheelStatus.canFreeSpin ? 'text-slate-950' : 'text-amber-400'}`} />
            <span className="hidden sm:inline">
              {wheelStatus.canFreeSpin ? 'Free Spin!' : 'Fortune Wheel'}
            </span>
          </button>

          {/* Daily Login Tribute Shortcut */}
          <button
            id="home-daily-login-btn"
            type="button"
            onClick={() => {
              sound.playClick();
              if (onOpenDailyLogin) onOpenDailyLogin();
            }}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-inner ${
              dailyStatus.canClaim
                ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)] animate-pulse'
                : 'bg-slate-900 border-amber-500/30 text-amber-300 hover:bg-slate-800'
            }`}
            title="Daily Login Rewards"
          >
            <Gift className={`w-4 h-4 ${dailyStatus.canClaim ? 'text-slate-950 fill-slate-950' : 'text-amber-400'}`} />
            <span className="hidden sm:inline">
              {dailyStatus.canClaim ? 'Claim Tribute' : `Daily: Day ${dailyStatus.streak || 1}`}
            </span>
            {dailyStatus.canClaim && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </button>

          {/* Coins Wallet */}
          <button
            id="home-wallet-btn"
            type="button"
            onClick={() => {
              sound.playClick();
              if (onOpenPayment) {
                onOpenPayment();
              } else {
                onNavigate('shop');
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300 font-bold text-xs sm:text-sm hover:bg-amber-900/60 transition-all cursor-pointer shadow-inner"
            title="Imperial Treasury Wallet"
          >
            <Coins className="w-4 h-4 text-amber-400" />
            <span>{user.coins.toLocaleString()}</span>
            <Plus className="w-3.5 h-3.5 text-amber-400 ml-0.5" />
          </button>

          {/* Quick Sign In button if Guest */}
          {!user.email && (
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onNavigate('auth' as any);
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 font-bold text-xs text-slate-950 shadow hover:brightness-110 cursor-pointer"
              title="Sign in or register your account"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* Settings Icon */}
          <button
            id="home-settings-btn"
            type="button"
            onClick={() => {
              sound.playClick();
              onNavigate('settings');
            }}
            className="p-2 rounded-full bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-amber-300 transition-all cursor-pointer"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Admin Icon if Admin */}
          {user.is_admin && (
            <button
              id="home-admin-btn"
              type="button"
              onClick={() => {
                sound.playClick();
                onNavigate('admin');
              }}
              className="p-2 rounded-full bg-purple-950/70 border border-purple-500/50 text-purple-300 hover:text-purple-200 transition-all cursor-pointer"
              title="Admin Panel"
            >
              <Shield className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Hub Content */}
      <main className="w-full max-w-5xl px-4 py-6 space-y-6 z-10">
        {/* Banner: Daily Crown & Tribute Challenge + Live Spectate */}
        <div className="w-full p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/60 border border-amber-500/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5 text-left">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-royal font-bold text-sm sm:text-base text-amber-200">
                  Royal Grand Tournament Season
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 text-[10px] font-bold border border-amber-400/30 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-orange-400 fill-orange-400" />
                  Streak {dailyStatus.streak || 1}d
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Daily logins reward sovereign treasury coins and royal mastery XP. Climb the leaderboard!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <button
              id="home-live-spectate-btn"
              type="button"
              onClick={() => {
                sound.playClick();
                if (onOpenSpectator) onOpenSpectator();
              }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900/90 border border-rose-500/50 text-rose-300 font-bold text-xs uppercase tracking-wider transition-all shadow cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              Watch Live
            </button>

            <button
              id="home-daily-calendar-btn"
              type="button"
              onClick={() => {
                sound.playClick();
                if (onOpenDailyLogin) onOpenDailyLogin();
              }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-500/30 text-amber-300 font-bold text-xs uppercase tracking-wider transition-all shadow cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5"
            >
              <Gift className="w-3.5 h-3.5" />
              Daily Tribute
            </button>

            <button
              id="home-claim-missions-btn"
              type="button"
              onClick={() => {
                sound.playClick();
                onNavigate('missions');
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer whitespace-nowrap"
            >
              Missions
            </button>
          </div>
        </div>

        {/* Primary Play Modes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Quick Match 4P */}
          <button
            id="mode-quick-4p"
            type="button"
            onClick={() => {
              sound.playClick();
              setStakeModalConfig({
                isOpen: true,
                mode: 'quick_4',
                modeTitle: 'Quick Match (4 Monarchs)',
                playerCount: 4,
              });
            }}
            className="group relative p-5 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-500/40 hover:border-amber-400 hover:shadow-xl hover:shadow-amber-500/20 transition-all duration-300 flex flex-col items-start justify-between min-h-[160px] text-left cursor-pointer"
          >
            <div className="w-full flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md">
                <Users className="w-6 h-6 text-slate-950" />
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-950/80 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                POPULAR
              </span>
            </div>

            <div>
              <h4 className="font-royal font-bold text-base text-slate-100 group-hover:text-amber-300 transition-colors">
                Quick Match (4P)
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                4-Monarch arena with customizable bet stakes.
              </p>
            </div>
          </button>

          {/* Team 2v2 Co-op Battle */}
          <button
            id="mode-team-2v2"
            type="button"
            onClick={() => {
              sound.playClick();
              setStakeModalConfig({
                isOpen: true,
                mode: 'team_2v2',
                modeTitle: '2v2 Team Co-op Battle',
                playerCount: 4,
              });
            }}
            className="group relative p-5 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-cyan-500/40 hover:border-cyan-400 hover:shadow-xl hover:shadow-cyan-500/20 transition-all duration-300 flex flex-col items-start justify-between min-h-[160px] text-left cursor-pointer"
          >
            <div className="w-full flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-md">
                <Shield className="w-6 h-6 text-slate-950" />
              </div>
              <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 text-[10px] font-bold text-cyan-300 border border-cyan-500/30">
                2v2 TEAM
              </span>
            </div>

            <div>
              <h4 className="font-royal font-bold text-base text-slate-100 group-hover:text-cyan-300 transition-colors">
                2v2 Team Battle
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Ally pass-through safe blocks & shared victory pot.
              </p>
            </div>
          </button>

          {/* Quick Match 2P (Duel) */}
          <button
            id="mode-quick-2p"
            type="button"
            onClick={() => {
              sound.playClick();
              setStakeModalConfig({
                isOpen: true,
                mode: 'quick_2',
                modeTitle: 'Royal Duel (2 Players)',
                playerCount: 2,
              });
            }}
            className="group relative p-5 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-rose-500/50 hover:shadow-xl hover:shadow-rose-500/20 transition-all duration-300 flex flex-col items-start justify-between min-h-[160px] text-left cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-red-700 flex items-center justify-center shadow-md">
              <Swords className="w-6 h-6 text-white" />
            </div>

            <div>
              <h4 className="font-royal font-bold text-base text-slate-100 group-hover:text-rose-300 transition-colors">
                Royal Duel (2P)
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Fast 1-on-1 strategic showdown with double stakes.
              </p>
            </div>
          </button>

          {/* Vs Computer AI */}
          <button
            id="mode-vs-bot"
            type="button"
            onClick={() => {
              sound.playClick();
              setShowBotModal(true);
            }}
            className="group relative p-5 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/20 transition-all duration-300 flex flex-col items-start justify-between min-h-[160px] text-left cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-700 flex items-center justify-center shadow-md">
              <Bot className="w-6 h-6 text-white" />
            </div>

            <div>
              <h4 className="font-royal font-bold text-base text-slate-100 group-hover:text-purple-300 transition-colors">
                Vs Royal AI
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Practice offline against tactical bots.
              </p>
            </div>
          </button>

          {/* Pass & Play (Local Game) */}
          <button
            id="mode-local-pass"
            type="button"
            onClick={() => {
              sound.playClick();
              setShowLocalModal(true);
            }}
            className="group relative p-5 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/20 transition-all duration-300 flex flex-col items-start justify-between min-h-[160px] text-left cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-md">
              <Play className="w-6 h-6 text-white" />
            </div>

            <div>
              <h4 className="font-royal font-bold text-base text-slate-100 group-hover:text-emerald-300 transition-colors">
                Pass & Play
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Local multiplayer on the same phone or tablet.
              </p>
            </div>
          </button>
        </div>

        {/* Private Rooms Sub-Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="font-royal font-bold text-sm text-slate-100">Create Private Room</h4>
              <p className="text-xs text-slate-400">Generate a 6-letter room code for friends</p>
            </div>
            <button
              id="home-create-room-btn"
              type="button"
              onClick={() => {
                sound.playClick();
                onSelectMode('room_create');
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow cursor-pointer"
            >
              Create
            </button>
          </div>

          <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="font-royal font-bold text-sm text-slate-100">Join Private Room</h4>
              <p className="text-xs text-slate-400">Enter a code received from your friend</p>
            </div>
            <button
              id="home-join-room-btn"
              type="button"
              onClick={() => {
                sound.playClick();
                onSelectMode('room_join');
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-bold text-xs transition-all shadow cursor-pointer"
            >
              Join Code
            </button>
          </div>
        </div>

        {/* Navigation Shortcuts Row */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-2">
          <button
            onClick={() => {
              sound.playClick();
              onNavigate('clan');
            }}
            className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 hover:border-amber-400 hover:bg-amber-900/50 transition-all flex flex-col items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Crown className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-bold text-amber-300">Guilds & Clans</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onNavigate('friends');
            }}
            className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-amber-500/40 hover:bg-slate-800 transition-all flex flex-col items-center gap-1.5 cursor-pointer"
          >
            <Users className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-bold text-slate-200">Friends</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onNavigate('leaderboard');
            }}
            className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-amber-500/40 hover:bg-slate-800 transition-all flex flex-col items-center gap-1.5 cursor-pointer"
          >
            <Trophy className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-bold text-slate-200">Leaderboard</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onNavigate('missions');
            }}
            className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-amber-500/40 hover:bg-slate-800 transition-all flex flex-col items-center gap-1.5 cursor-pointer"
          >
            <Target className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-bold text-slate-200">Missions</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onNavigate('achievements');
            }}
            className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-amber-500/40 hover:bg-slate-800 transition-all flex flex-col items-center gap-1.5 cursor-pointer"
          >
            <Award className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-bold text-slate-200">Trophies</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onNavigate('shop');
            }}
            className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-amber-500/40 hover:bg-slate-800 transition-all flex flex-col items-center gap-1.5 cursor-pointer"
          >
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-bold text-slate-200">Royal Bazaar</span>
          </button>
        </div>
      </main>

      {/* Bot Difficulty Picker Modal */}
      {showBotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <h3 className="font-royal font-bold text-lg text-amber-300">
              Select AI Difficulty
            </h3>
            <p className="text-xs text-slate-400">
              Choose the tactical prowess of your bot rivals.
            </p>

            <div className="space-y-2 pt-2">
              {(['easy', 'medium', 'hard'] as const).map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setBotDifficulty(diff)}
                  className={`
                    w-full py-2.5 px-4 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-between
                    ${botDifficulty === diff ? 'bg-purple-950/80 border-purple-400 text-purple-200 ring-2 ring-purple-400/40' : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'}
                  `}
                >
                  <span>{diff} Mode</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    {diff === 'easy' ? 'Casual moves' : diff === 'medium' ? 'Smart captures' : 'Minimax tactics'}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowBotModal(false);
                  setStakeModalConfig({
                    isOpen: true,
                    mode: 'vs_computer',
                    modeTitle: `Vs Royal AI (${botDifficulty.toUpperCase()})`,
                    playerCount: 2,
                    botDifficulty,
                  });
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold text-xs uppercase tracking-wider transition-all shadow cursor-pointer"
              >
                Choose Stake & Play
              </button>
              <button
                type="button"
                onClick={() => setShowBotModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Local Pass & Play Modal */}
      {showLocalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <h3 className="font-royal font-bold text-lg text-amber-300">
              Local Pass & Play
            </h3>
            <p className="text-xs text-slate-400">
              Select player count for your same-device match:
            </p>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                onClick={() => {
                  setShowLocalModal(false);
                  onSelectMode('local_2');
                }}
                className="py-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/60 font-bold text-sm text-slate-200 hover:text-emerald-300 transition-all cursor-pointer"
              >
                2 Players
              </button>
              <button
                onClick={() => {
                  setShowLocalModal(false);
                  onSelectMode('local_3');
                }}
                className="py-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/60 font-bold text-sm text-slate-200 hover:text-emerald-300 transition-all cursor-pointer"
              >
                3 Players
              </button>
              <button
                onClick={() => {
                  setShowLocalModal(false);
                  onSelectMode('local_4');
                }}
                className="py-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/60 font-bold text-sm text-slate-200 hover:text-emerald-300 transition-all cursor-pointer"
              >
                4 Players
              </button>
            </div>

            <button
              onClick={() => setShowLocalModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Stake / Bet Selector Modal */}
      {stakeModalConfig && (
        <StakeSelectorModal
          isOpen={stakeModalConfig.isOpen}
          onClose={() => setStakeModalConfig(null)}
          onConfirmStake={(stake) => {
            const config = stakeModalConfig;
            setStakeModalConfig(null);
            onSelectMode(config.mode, config.botDifficulty, stake);
          }}
          onOpenBuyCoins={onOpenPayment}
          user={user}
          modeTitle={stakeModalConfig.modeTitle}
          playerCount={stakeModalConfig.playerCount}
        />
      )}
    </div>
  );
};
