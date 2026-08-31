import React, { useState, useEffect } from 'react';
import {
  Award,
  Bot,
  Calendar,
  Coins,
  Crown,
  Flame,
  Gift,
  Menu,
  MessageSquare,
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
import { friendsService } from '../../services/friendsService';
import { chatSecurityService } from '../../services/chatSecurityService';
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
  onOpenMessenger?: (tab?: 'global' | 'dms' | 'friends') => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  user,
  onSelectMode,
  onNavigate,
  onOpenDailyLogin,
  onOpenLuckyWheel,
  onOpenSpectator,
  onOpenPayment,
  onOpenMessenger,
}) => {
  const [showBotModal, setShowBotModal] = useState(false);
  const [showLocalModal, setShowLocalModal] = useState(false);
  const [botDifficulty, setBotDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [dailyStatus, setDailyStatus] = useState<DailyLoginStatus>(() => rewardService.getDailyLoginStatus());
  const [wheelStatus, setWheelStatus] = useState(() => luckyWheelService.getStatus());
  const [pendingRequestsCount, setPendingRequestsCount] = useState(() => friendsService.getFollowers().length);
  const [isChatHidden, setIsChatHidden] = useState(() => chatSecurityService.isChatHidden());
  const chatClickCountRef = React.useRef(0);
  const chatClickTimerRef = React.useRef<any>(null);
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

  useEffect(() => {
    const unsub = friendsService.subscribe(() => {
      setPendingRequestsCount(friendsService.getFollowers().length);
    });
    const unsubChat = chatSecurityService.subscribe(() => {
      setIsChatHidden(chatSecurityService.isChatHidden());
    });
    return () => {
      unsub();
      unsubChat();
    };
  }, []);

  const handleMessengerButtonClick = (tab: 'global' | 'dms' | 'friends' = 'global') => {
    sound.playClick();
    chatClickCountRef.current += 1;

    if (chatClickCountRef.current >= 3) {
      if (chatClickTimerRef.current) clearTimeout(chatClickTimerRef.current);
      chatClickCountRef.current = 0;
      chatSecurityService.setChatHidden(true);
      sound.playSafeStar();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('royal_ludo_notification', {
            detail: {
              title: '🤫 Realm Chat Hidden!',
              message: 'Realm Chat button is now hidden in secret mode. You can unhide it or change PIN in Chamber Settings.',
            },
          })
        );
      }
      return;
    }

    if (chatClickTimerRef.current) clearTimeout(chatClickTimerRef.current);
    chatClickTimerRef.current = setTimeout(() => {
      if (chatClickCountRef.current > 0 && chatClickCountRef.current < 3) {
        if (onOpenMessenger) onOpenMessenger(tab);
      }
      chatClickCountRef.current = 0;
    }, 380);
  };

  // Level & XP math
  const currentLevel = user.level || 1;
  const currentXp = user.xp || 0;
  // XP formula: base required for next level
  const xpForNextLevel = currentLevel * currentLevel * 150;
  const xpProgress = Math.min(100, Math.round((currentXp / xpForNextLevel) * 100));

  return (
    <div className="w-full min-h-screen bg-[#070b16] text-slate-100 flex flex-col items-center pb-20 overflow-x-hidden font-sans">
      {/* Royal Header Bar */}
      <header className="w-full max-w-xl px-4 py-3 flex items-center justify-between sticky top-0 z-30 bg-[#070b16]/95 backdrop-blur-md border-b border-amber-500/10">
        {/* User Avatar & Level & XP */}
        <button
          id="home-profile-btn"
          type="button"
          onClick={() => {
            sound.playClick();
            onNavigate('profile');
          }}
          className="flex items-center gap-3 cursor-pointer text-left group"
        >
          <div className="relative w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 shadow-md shadow-amber-500/20">
            <img
              src="/logo.png"
              alt="Avatar"
              className="w-full h-full rounded-full object-cover bg-slate-900 border-2 border-[#070b16]"
            />
            <span className="absolute -bottom-1 -left-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-[9px] font-black text-slate-950 shadow border border-[#070b16]">
              Lv.{currentLevel}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-slate-100">{user.display_name}</span>
              <span className="text-xs text-amber-400 font-mono font-bold">#{user.player_id}</span>
            </div>
            <div className="w-24 sm:w-28 h-1.5 rounded-full bg-slate-800/80 overflow-hidden mt-1">
              <div
                className="h-full bg-amber-500 rounded-full"
                style={{ width: `${Math.max(10, xpProgress)}%` }}
              />
            </div>
          </div>
        </button>

        {/* Currency & Menu Button */}
        <div className="flex items-center gap-2.5">
          {/* Coins Wallet Pill */}
          <button
            id="home-wallet-btn"
            type="button"
            onClick={() => {
              sound.playClick();
              if (onOpenPayment) onOpenPayment();
              else onNavigate('shop');
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0e1424] border border-amber-500/60 text-amber-300 font-bold text-xs sm:text-sm hover:border-amber-400 transition-all cursor-pointer shadow-inner"
          >
            <Coins className="w-4 h-4 text-amber-400" />
            <span>{Math.max(0, Math.floor(Math.round(user.coins || 0))).toLocaleString()}</span>
            <span className="text-amber-400 font-black ml-0.5">+</span>
          </button>

          {/* Hamburger Menu Button */}
          <button
            id="home-settings-btn"
            type="button"
            onClick={() => {
              sound.playClick();
              onNavigate('settings');
            }}
            className="w-10 h-10 rounded-full bg-[#0e1424] border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center shadow"
            title="Settings & Chamber Controls"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Hub Content */}
      <main className="w-full max-w-xl px-3.5 sm:px-4 py-3.5 space-y-3.5 z-10">
        {/* Row 1: Top 3 Action Pills */}
        <div className="grid grid-cols-3 gap-2 w-full">
          <button
            id="home-lucky-wheel-btn"
            type="button"
            onClick={() => {
              sound.playClick();
              if (onOpenLuckyWheel) onOpenLuckyWheel();
            }}
            className={`py-2.5 px-2 rounded-2xl bg-[#0e1424] border border-amber-500/30 hover:border-amber-400/70 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow cursor-pointer active:scale-95 ${
              wheelStatus.canFreeSpin ? 'border-amber-400/80 shadow-[0_0_12px_rgba(245,158,11,0.3)]' : ''
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span className="truncate">Fortune Wheel</span>
          </button>

          <button
            id="home-daily-login-btn"
            type="button"
            onClick={() => {
              sound.playClick();
              if (onOpenDailyLogin) onOpenDailyLogin();
            }}
            className={`py-2.5 px-2 rounded-2xl bg-[#0e1424] border border-amber-500/30 hover:border-amber-400/70 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow cursor-pointer active:scale-95 ${
              dailyStatus.canClaim ? 'border-amber-400/80 shadow-[0_0_12px_rgba(245,158,11,0.3)]' : ''
            }`}
          >
            <Gift className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span className="truncate">Daily: Day {dailyStatus.streak || 1}</span>
          </button>

          {!isChatHidden ? (
            <button
              id="home-messenger-btn"
              type="button"
              onClick={() => handleMessengerButtonClick('global')}
              className="py-2.5 px-2 rounded-2xl bg-[#0e1424] border border-amber-500/30 hover:border-amber-400/70 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow cursor-pointer active:scale-95"
              title="Realm Chat (Click 3 times to hide)"
            >
              <MessageSquare className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span className="truncate">Realm Chat</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="py-2.5 px-2 rounded-2xl bg-[#0e1424] border border-slate-800 text-slate-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="truncate">Settings</span>
            </button>
          )}
        </div>

        {/* Private Royal Chambers Heading */}
        <div className="flex items-center gap-2 pt-1 px-1">
          <Crown className="w-4 h-4 text-amber-400" />
          <h3 className="font-royal font-black text-xs sm:text-sm text-amber-400 uppercase tracking-widest">
            PRIVATE ROYAL CHAMBERS
          </h3>
        </div>

        {/* 2 Full-width Cards (Create & Join Private Room) */}
        <div className="space-y-2.5 w-full">
          {/* Create Private Room Card */}
          <div className="w-full p-3 sm:p-3.5 rounded-3xl bg-[#0e1424] border border-amber-500/30 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 shadow flex-shrink-0">
                <Crown className="w-6 h-6 fill-slate-950 text-slate-950" />
              </div>
              <h4 className="font-royal font-black text-xs sm:text-sm text-slate-100 tracking-wide">
                CREATE PRIVATE ROOM
              </h4>
            </div>

            <button
              id="home-create-room-btn"
              type="button"
              onClick={() => {
                sound.playClick();
                onSelectMode('room_create');
              }}
              className="px-4 sm:px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-slate-950 font-royal font-black text-[11px] sm:text-xs uppercase tracking-wider shadow cursor-pointer transition-all active:scale-95 flex-shrink-0"
            >
              CREATE ROOM
            </button>
          </div>

          {/* Join Private Room Card */}
          <div className="w-full p-3 sm:p-3.5 rounded-3xl bg-[#0e1424] border border-slate-800 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow flex-shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="font-royal font-black text-xs sm:text-sm text-slate-100 tracking-wide">
                JOIN PRIVATE ROOM
              </h4>
            </div>

            <button
              id="home-join-room-btn"
              type="button"
              onClick={() => {
                sound.playClick();
                onSelectMode('room_join');
              }}
              className="px-4 sm:px-5 py-2.5 rounded-2xl bg-[#070b16] border border-amber-500/50 hover:bg-slate-800 text-amber-300 font-royal font-black text-[11px] sm:text-xs uppercase tracking-wider shadow cursor-pointer transition-all active:scale-95 flex-shrink-0"
            >
              JOIN ROOM
            </button>
          </div>
        </div>

        {/* 3 Game Modes Grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full">
          {/* Quick Match */}
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
            className="p-3 rounded-3xl bg-[#0e1424] border border-amber-500/30 hover:border-amber-400 transition-all flex flex-col items-center justify-between text-center min-h-[145px] sm:min-h-[155px] cursor-pointer shadow active:scale-95"
          >
            <div className="relative flex flex-col items-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 shadow">
                <Users className="w-6 h-6 sm:w-7 sm:h-7 text-slate-950" />
              </div>
              <span className="mt-1 px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-[9px] font-black text-amber-300">
                4P
              </span>
            </div>
            <span className="font-royal font-black text-xs sm:text-sm text-slate-100 leading-tight">
              QUICK<br />MATCH
            </span>
          </button>

          {/* Royal Duel 2P */}
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
            className="p-3 rounded-3xl bg-[#0e1424] border border-rose-500/30 hover:border-rose-400 transition-all flex flex-col items-center justify-between text-center min-h-[145px] sm:min-h-[155px] cursor-pointer shadow active:scale-95"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-rose-500 flex items-center justify-center text-white shadow">
              <Swords className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <span className="font-royal font-black text-xs sm:text-sm text-slate-100 leading-tight">
              ROYAL DUEL<br />(2P)
            </span>
          </button>

          {/* Pass & Play */}
          <button
            id="mode-local-pass"
            type="button"
            onClick={() => {
              sound.playClick();
              setShowLocalModal(true);
            }}
            className="p-3 rounded-3xl bg-[#0e1424] border border-emerald-500/30 hover:border-emerald-400 transition-all flex flex-col items-center justify-between text-center min-h-[145px] sm:min-h-[155px] cursor-pointer shadow active:scale-95"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow">
              <Play className="w-6 h-6 sm:w-7 sm:h-7 text-white fill-white" />
            </div>
            <span className="font-royal font-black text-xs sm:text-sm text-slate-100 leading-tight">
              PASS & PLAY
            </span>
          </button>
        </div>

        {/* Bottom 5 Navigation Tiles */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2 w-full pt-1">
          {/* Guilds & Clans */}
          <button
            onClick={() => {
              sound.playClick();
              onNavigate('clan');
            }}
            className="p-2 sm:p-2.5 rounded-2xl bg-[#0e1424] border border-amber-500/40 hover:border-amber-400 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer shadow text-center active:scale-95"
          >
            <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            <span className="text-[8px] sm:text-[10px] font-bold text-amber-300 leading-tight">
              Guilds<br />& Clans
            </span>
          </button>

          {/* Friends */}
          <button
            onClick={() => {
              sound.playClick();
              onNavigate('friends');
            }}
            className="relative p-2 sm:p-2.5 rounded-2xl bg-[#0e1424] border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer shadow text-center active:scale-95"
          >
            <div className="relative">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              {pendingRequestsCount > 0 && (
                <span className="absolute -top-1 -right-2 px-1 py-0.1 rounded-full bg-rose-500 text-white font-black text-[7px] border border-slate-950 animate-bounce">
                  {pendingRequestsCount}
                </span>
              )}
            </div>
            <span className="text-[8px] sm:text-[10px] font-bold text-slate-200">
              Friends
            </span>
          </button>

          {/* Missions */}
          <button
            onClick={() => {
              sound.playClick();
              onNavigate('missions');
            }}
            className="p-2 sm:p-2.5 rounded-2xl bg-[#0e1424] border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer shadow text-center active:scale-95"
          >
            <Target className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            <span className="text-[8px] sm:text-[10px] font-bold text-slate-200">
              Missions
            </span>
          </button>

          {/* Trophies */}
          <button
            onClick={() => {
              sound.playClick();
              onNavigate('achievements');
            }}
            className="p-2 sm:p-2.5 rounded-2xl bg-[#0e1424] border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer shadow text-center active:scale-95"
          >
            <Award className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            <span className="text-[8px] sm:text-[10px] font-bold text-slate-200">
              Trophies
            </span>
          </button>

          {/* Royal Bazaar */}
          <button
            onClick={() => {
              sound.playClick();
              onNavigate('shop');
            }}
            className="p-2 sm:p-2.5 rounded-2xl bg-[#0e1424] border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer shadow text-center active:scale-95"
          >
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            <span className="text-[8px] sm:text-[10px] font-bold text-slate-200 leading-tight">
              Royal<br />Bazaar
            </span>
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
      {/* Floating Lobby Messenger Action Button */}
      {!isChatHidden && (
        <button
          id="home-floating-chat-btn"
          type="button"
          onClick={() => handleMessengerButtonClick('global')}
          className="fixed bottom-5 right-5 z-40 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-[0_6px_25px_rgba(245,158,11,0.6)] hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer flex items-center justify-center border-2 border-amber-300"
          title="Open Realm Chat & DMs (Click 3 times to hide)"
        >
          <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7 fill-slate-950 text-slate-950" />
        </button>
      )}
    </div>
  );
};
