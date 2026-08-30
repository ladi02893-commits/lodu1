import React, { useEffect, useState } from 'react';
import { Coins, Sparkles, X } from 'lucide-react';
import { AuthModal } from './components/views/AuthModal';
import { GameArenaView } from './components/views/GameArenaView';
import { HomeDashboard } from './components/views/HomeDashboard';
import { LandingView } from './components/views/LandingView';
import { MatchmakingModal } from './components/views/MatchmakingModal';
import { ProfileView } from './components/views/ProfileView';
import { FriendsView } from './components/views/FriendsView';
import { LeaderboardView } from './components/views/LeaderboardView';
import { MissionsView } from './components/views/MissionsView';
import { AchievementsView } from './components/views/AchievementsView';
import { ShopView } from './components/views/ShopView';
import { SettingsView } from './components/views/SettingsView';
import { AdminView } from './components/views/AdminView';
import { RoomLobbyView } from './components/views/RoomLobbyView';
import { DailyLoginModal } from './components/views/DailyLoginModal';
import { PaymentModal } from './components/views/PaymentModal';
import { DailyRewardToast } from './components/common/DailyRewardToast';
import { sound } from './lib/audio';
import { GameMode } from './lib/ludo/types';
import { authService } from './services/authService';
import { gameService } from './services/gameService';
import { matchmakingService } from './services/matchmakingService';
import { AuthView } from './components/views/AuthView';
import { roomService } from './services/roomService';
import { rewardService, DailyLoginDay } from './services/rewardService';
import { RoomRecord, UserProfile } from './types/database';

export type AppView =
  | 'auth'
  | 'landing'
  | 'home'
  | 'game'
  | 'room_lobby'
  | 'profile'
  | 'friends'
  | 'leaderboard'
  | 'missions'
  | 'achievements'
  | 'shop'
  | 'settings'
  | 'admin';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('royal_ludo_active_match')) {
      return 'game';
    }
    return authService.isAuthenticated() ? 'home' : 'auth';
  });
  const [user, setUser] = useState<UserProfile>(authService.getCurrentUser());
  const [activeRoom, setActiveRoom] = useState<RoomRecord | null>(null);
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [showGlobalPaymentModal, setShowGlobalPaymentModal] = useState(false);
  const [dailyToast, setDailyToast] = useState<{ reward: DailyLoginDay; streak: number } | null>(null);
  const [pushNotification, setPushNotification] = useState<{
    title: string;
    message: string;
    coins?: number;
  } | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Global Room sync: if any joined player's room begins a match
  useEffect(() => {
    const unsub = roomService.subscribeGlobal(({ type, room }) => {
      if (activeRoom && activeRoom.code.toUpperCase() === room.code.toUpperCase()) {
        setActiveRoom(room);
        if (type === 'ROOM_MATCH_STARTED') {
          handleStartRoomMatch(room);
        }
      }
    });
    return () => unsub();
  }, [activeRoom]);

  // Real-time Imperial Push Notifications
  useEffect(() => {
    const handleNotification = (e: any) => {
      const detail = e.detail;
      if (detail && detail.targetUserId === user.id) {
        sound.playHomeGoal();
        setUser(authService.getCurrentUser());
        setPushNotification({
          title: detail.title || 'Imperial Dispatch',
          message: detail.message || 'You received a notification from the Emperor',
          coins: detail.coins,
        });

        setTimeout(() => {
          setPushNotification(null);
        }, 5500);
      }
    };

    window.addEventListener('royal_ludo_notification', handleNotification);
    return () => window.removeEventListener('royal_ludo_notification', handleNotification);
  }, [user.id]);

  // Auto-restore any active match on page refresh
  useEffect(() => {
    const active = gameService.restoreMatch();
    if (active) {
      setCurrentView('game');
    }
  }, []);

  // Check & Auto-Claim Daily Login Reward
  useEffect(() => {
    const timer = setTimeout(() => {
      const claimResult = rewardService.checkAndAutoClaimDailyLogin();
      if (claimResult && claimResult.success && claimResult.reward) {
        sound.playHomeGoal();
        setDailyToast({
          reward: claimResult.reward,
          streak: claimResult.streak || 1,
        });
      }
    }, 750);
    return () => clearTimeout(timer);
  }, []);

  // Listen to Auth changes
  useEffect(() => {
    const unsub = authService.subscribe((u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  // Mode Selection Handler
  const handleSelectMode = (
    mode:
      | 'quick_2'
      | 'quick_4'
      | 'vs_computer'
      | 'local_2'
      | 'local_3'
      | 'local_4'
      | 'room_create'
      | 'room_join',
    botDifficulty?: 'easy' | 'medium' | 'hard'
  ) => {
    if (mode === 'quick_2' || mode === 'quick_4') {
      setIsMatchmaking(true);
      matchmakingService.startSearch(mode);
      const unsub = gameService.subscribe((state) => {
        if (state.status === 'in_progress') {
          setIsMatchmaking(false);
          setCurrentView('game');
          unsub();
        }
      });
    } else if (mode === 'vs_computer') {
      gameService.startMatch('vs_computer', undefined, botDifficulty || 'medium');
      setCurrentView('game');
    } else if (mode.startsWith('local_')) {
      gameService.startMatch(mode as GameMode);
      setCurrentView('game');
    } else if (mode === 'room_create') {
      const room = roomService.createRoom(4, 0);
      setActiveRoom(room);
      setCurrentView('room_lobby');
    } else if (mode === 'room_join') {
      setJoinError(null);
      setJoinCodeInput('');
      setShowJoinModal(true);
    }
  };

  const handleJoinRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinCodeInput.trim().toUpperCase();
    if (!clean) return;

    sound.playClick();
    const res = roomService.joinRoom(clean);
    if (res.success && res.room) {
      setActiveRoom(res.room);
      setShowJoinModal(false);
      setCurrentView('room_lobby');
    } else {
      setJoinError(res.message);
    }
  };

  const handleStartRoomMatch = (room: RoomRecord) => {
    const players = room.players || [];
    const mapped = players.map((p) => ({
      playerId: p.user_id,
      username: p.profile?.display_name || p.user_id,
      avatar: p.profile?.avatar_url || 'avatar_1',
      seat: p.seat,
      color: p.color,
      isBot: p.user_id.startsWith('bot_'),
      isHost: p.is_host,
    }));

    gameService.startMatch('room_private', mapped, 'medium', room.bet_amount || 0);
    setCurrentView('game');
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Daily Login Reward Toast */}
      <DailyRewardToast
        reward={dailyToast?.reward || null}
        streak={dailyToast?.streak || 1}
        onClose={() => setDailyToast(null)}
        onViewCalendar={() => setShowDailyModal(true)}
      />

      {/* Real-time Admin Dispatch Push Notification Toast */}
      {pushNotification && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border-2 border-amber-400 p-4 rounded-3xl shadow-2xl animate-fade-in flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 flex-shrink-0 shadow">
              <Sparkles className="w-5 h-5 text-slate-950 animate-spin" />
            </div>
            <div>
              <h4 className="font-royal font-bold text-xs sm:text-sm text-amber-300">
                {pushNotification.title}
              </h4>
              <p className="text-xs text-slate-200">
                {pushNotification.message}
              </p>
              {pushNotification.coins && (
                <div className="flex items-center gap-1 text-xs font-black font-mono text-emerald-400 mt-0.5">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span>+{pushNotification.coins.toLocaleString()} Coins</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setPushNotification(null)}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Active View Router */}
      {currentView === 'auth' && (
        <AuthView
          onAuthenticated={() => {
            setUser(authService.getCurrentUser());
            setCurrentView('home');
          }}
          onContinueGuest={() => {
            setUser(authService.getCurrentUser());
            setCurrentView('home');
          }}
        />
      )}

      {currentView === 'landing' && (
        <LandingView
          onPlayNow={() => setCurrentView(authService.isAuthenticated() ? 'home' : 'auth')}
          onSelectMode={(mode) => {
            if (mode === 'room') {
              handleSelectMode('room_create');
            } else {
              handleSelectMode(mode);
            }
          }}
        />
      )}

      {currentView === 'home' && (
        <HomeDashboard
          user={user}
          onSelectMode={handleSelectMode}
          onNavigate={(view) => setCurrentView(view)}
          onOpenDailyLogin={() => setShowDailyModal(true)}
          onOpenPayment={() => setShowGlobalPaymentModal(true)}
        />
      )}

      {currentView === 'game' && (
        <GameArenaView onExit={() => setCurrentView('home')} />
      )}

      {currentView === 'room_lobby' && activeRoom && (
        <RoomLobbyView
          room={activeRoom}
          onStartGame={handleStartRoomMatch}
          onLeave={() => {
            setActiveRoom(null);
            setCurrentView('home');
          }}
        />
      )}

      {currentView === 'profile' && (
        <ProfileView
          onBack={() => setCurrentView('home')}
          onOpenAuth={() => setCurrentView('auth')}
          onLogout={() => {
            setUser(authService.getCurrentUser());
            setCurrentView('auth');
          }}
        />
      )}

      {currentView === 'friends' && (
        <FriendsView
          onBack={() => setCurrentView('home')}
          onInviteToRoom={() => handleSelectMode('room_create')}
        />
      )}

      {currentView === 'leaderboard' && (
        <LeaderboardView onBack={() => setCurrentView('home')} />
      )}

      {currentView === 'missions' && (
        <MissionsView onBack={() => setCurrentView('home')} />
      )}

      {currentView === 'achievements' && (
        <AchievementsView onBack={() => setCurrentView('home')} />
      )}

      {currentView === 'shop' && (
        <ShopView onBack={() => setCurrentView('home')} />
      )}

      {currentView === 'settings' && (
        <SettingsView
          onBack={() => setCurrentView('home')}
          onOpenAuth={() => setCurrentView('auth')}
          onLogout={() => {
            setUser(authService.getCurrentUser());
            setCurrentView('auth');
          }}
        />
      )}

      {currentView === 'admin' && (
        <AdminView onBack={() => setCurrentView('home')} />
      )}

      {/* Matchmaking Radar Modal */}
      {isMatchmaking && (
        <MatchmakingModal
          onCancel={() => {
            setIsMatchmaking(false);
            matchmakingService.cancelSearch();
          }}
        />
      )}

      {/* Daily Login 7-Day Calendar Modal */}
      <DailyLoginModal
        isOpen={showDailyModal}
        onClose={() => setShowDailyModal(false)}
        onRewardClaimed={(r, s) => {
          setDailyToast({ reward: r, streak: s });
        }}
      />

      {/* Join Room Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <h3 className="font-royal font-bold text-lg text-amber-300">
              Join Private Room
            </h3>
            <p className="text-xs text-slate-400">
              Enter the 6-character room code to join the chamber.
            </p>

            <form onSubmit={handleJoinRoomSubmit} className="space-y-3 pt-2">
              <input
                type="text"
                placeholder="e.g. 7K9B2X"
                maxLength={6}
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                className="w-full text-center tracking-widest font-mono text-2xl font-black bg-slate-950 border border-amber-400/60 rounded-2xl py-3 text-amber-200 uppercase outline-none focus:ring-2 focus:ring-amber-400"
                autoFocus
              />

              {joinError && (
                <div className="text-xs text-rose-300 font-semibold bg-rose-950/60 border border-rose-500/40 p-2 rounded-xl">
                  {joinError}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 font-royal font-bold text-xs uppercase tracking-wider text-slate-950 shadow cursor-pointer hover:brightness-110"
                >
                  Join Chamber
                </button>
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="w-full py-3 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs cursor-pointer hover:bg-slate-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setUser(authService.getCurrentUser())}
      />

      {/* Global Imperial Payment Modal */}
      <PaymentModal
        isOpen={showGlobalPaymentModal}
        onClose={() => setShowGlobalPaymentModal(false)}
        onSuccess={() => {
          setUser(authService.getCurrentUser());
        }}
      />
    </div>
  );
};

export default App;
