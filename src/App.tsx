import React, { useEffect, useState } from 'react';
import { Coins, Loader2, Sparkles, X } from 'lucide-react';
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
import { ClanView } from './components/views/ClanView';
import { RoomLobbyView } from './components/views/RoomLobbyView';
import { DailyLoginModal } from './components/views/DailyLoginModal';
import { LuckyWheelModal } from './components/views/LuckyWheelModal';
import { LiveMatchesModal, LiveMatchEntry } from './components/views/LiveMatchesModal';
import { PaymentModal } from './components/views/PaymentModal';
import { LobbyMessengerModal } from './components/chat/LobbyMessengerModal';
import { ChatPinModal } from './components/chat/ChatPinModal';
import { DailyRewardToast } from './components/common/DailyRewardToast';
import { sound } from './lib/audio';
import { GameMode } from './lib/ludo/types';
import { authService } from './services/authService';
import { chatSecurityService } from './services/chatSecurityService';
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
  | 'admin'
  | 'clan';

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
  const [showLuckyWheelModal, setShowLuckyWheelModal] = useState(false);
  const [showLiveSpectatorModal, setShowLiveSpectatorModal] = useState(false);
  const [showGlobalPaymentModal, setShowGlobalPaymentModal] = useState(false);
  const [showLobbyMessenger, setShowLobbyMessenger] = useState(false);
  const [showChatPinModal, setShowChatPinModal] = useState(false);
  const [pendingMessengerTarget, setPendingMessengerTarget] = useState<{
    tab: 'global' | 'dms' | 'friends';
    friendId?: string;
  } | null>(null);
  const [lobbyMessengerTab, setLobbyMessengerTab] = useState<'global' | 'dms' | 'friends'>('global');
  const [lobbyMessengerFriendId, setLobbyMessengerFriendId] = useState<string | undefined>();
  const [dailyToast, setDailyToast] = useState<{ reward: DailyLoginDay; streak: number } | null>(null);
  const [pushNotification, setPushNotification] = useState<{
    title: string;
    message: string;
    coins?: number;
  } | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);

  // Auto-detect room invite in URL parameters (e.g. ?room=XYZ123 or #room=XYZ123)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const urlCode =
        params.get('room') ||
        params.get('code') ||
        (window.location.hash.includes('room=') ? window.location.hash.split('room=')[1] : '');
      if (urlCode && urlCode.trim().length >= 4) {
        const clean = urlCode.trim().toUpperCase();
        setJoinCodeInput(clean);
        setShowJoinModal(true);
      }
    } catch (e) {
      console.warn(e);
    }
  }, []);

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
      const myId = (user?.id || '').toLowerCase();
      const targetId = (detail?.targetUserId || '').toLowerCase();

      if (detail && (!targetId || targetId === myId)) {
        sound.playFollowChime();
        setUser(authService.getCurrentUser());
        setPushNotification({
          title: detail.title || 'Imperial Dispatch',
          message: detail.message || 'You received a notification from the realm',
          coins: detail.coins,
        });

        setTimeout(() => {
          setPushNotification(null);
        }, 5500);
      }
    };

    window.addEventListener('royal_ludo_notification', handleNotification);
    return () => window.removeEventListener('royal_ludo_notification', handleNotification);
  }, [user?.id]);

  // Auto-restore any active match on page refresh
  useEffect(() => {
    const active = gameService.restoreMatch();
    if (active) {
      setCurrentView('game');
    }
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
      | 'team_2v2'
      | 'vs_computer'
      | 'local_2'
      | 'local_3'
      | 'local_4'
      | 'room_create'
      | 'room_join',
    botDifficulty?: 'easy' | 'medium' | 'hard',
    betAmount: number = 0
  ) => {
    if (mode === 'quick_2' || mode === 'quick_4' || mode === 'team_2v2') {
      setIsMatchmaking(true);
      matchmakingService.startSearch(mode, betAmount);
      const unsub = gameService.subscribe((state) => {
        if (state.status === 'in_progress') {
          setIsMatchmaking(false);
          setCurrentView('game');
          unsub();
        }
      });
    } else if (mode === 'vs_computer') {
      gameService.startMatch('vs_computer', undefined, botDifficulty || 'medium', betAmount);
      setCurrentView('game');
    } else if (mode.startsWith('local_')) {
      gameService.startMatch(mode as GameMode, undefined, undefined, betAmount);
      setCurrentView('game');
    } else if (mode === 'room_create') {
      const room = roomService.createRoom(4, betAmount);
      setActiveRoom(room);
      setCurrentView('room_lobby');
    } else if (mode === 'room_join') {
      setJoinError(null);
      setJoinCodeInput('');
      setShowJoinModal(true);
    }
  };

  const handleWatchLiveMatch = (match: LiveMatchEntry) => {
    setShowLiveSpectatorModal(false);
    gameService.startSpectatingMatch(match.matchId);
    setCurrentView('game');
  };

  const handleJoinRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinCodeInput.trim().toUpperCase();
    if (!clean || isJoiningRoom) return;

    sound.playClick();
    setIsJoiningRoom(true);
    setJoinError(null);

    try {
      const res = await roomService.joinRoom(clean);
      if (res.success && res.room) {
        setActiveRoom(res.room);
        setShowJoinModal(false);
        setJoinCodeInput('');
        setCurrentView('room_lobby');
      } else {
        setJoinError(res.message);
      }
    } catch (err: any) {
      setJoinError(err?.message || 'Failed to connect to chamber. Please check your network.');
    } finally {
      setIsJoiningRoom(false);
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
      coins: p.profile?.coins || 10000,
      isBot: p.user_id.startsWith('bot_'),
      isHost: p.is_host,
    }));

    const unifiedMatchId = `room_${room.code.toUpperCase()}`;
    gameService.startMatch('room_private', mapped, 'medium', room.bet_amount || 0, unifiedMatchId);
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
        <div className="fixed top-5 right-5 z-50 max-w-sm p-4 rounded-2xl bg-gradient-to-r from-purple-950 via-slate-900 to-amber-950 border border-amber-400 shadow-2xl animate-bounce">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-amber-400">
              <Sparkles className="w-5 h-5 text-amber-300" />
              <h4 className="font-royal font-bold text-sm text-amber-200">
                {pushNotification.title}
              </h4>
            </div>
            <button
              onClick={() => setPushNotification(null)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-300 mt-1">{pushNotification.message}</p>
          {pushNotification.coins && (
            <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-amber-300">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>+{pushNotification.coins.toLocaleString()} Coins added to treasury!</span>
            </div>
          )}
        </div>
      )}

      {/* Main Views Routing */}
      {currentView === 'auth' && (
        <AuthView
          onAuthenticated={() => {
            setUser(authService.getCurrentUser());
            setCurrentView('home');
          }}
          onSuccess={() => {
            setUser(authService.getCurrentUser());
            setCurrentView('home');
          }}
          onContinueGuest={() => {
            authService.loginAsGuest();
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
              handleSelectMode(mode as any);
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
          onOpenLuckyWheel={() => setShowLuckyWheelModal(true)}
          onOpenSpectator={() => setShowLiveSpectatorModal(true)}
          onOpenPayment={() => setShowGlobalPaymentModal(true)}
          onLogout={() => {
            authService.logout();
            setUser(authService.getCurrentUser());
            setCurrentView('auth');
          }}
          onOpenMessenger={(tab, friendId) => {
            const targetTab = tab || 'global';
            if (chatSecurityService.isPinRequired()) {
              setPendingMessengerTarget({ tab: targetTab, friendId });
              setShowChatPinModal(true);
            } else {
              setLobbyMessengerTab(targetTab);
              setLobbyMessengerFriendId(friendId);
              setShowLobbyMessenger(true);
            }
          }}
        />
      )}

      {currentView === 'game' && (
        <GameArenaView onExit={() => setCurrentView('home')} />
      )}

      {currentView === 'clan' && (
        <ClanView
          onBack={() => setCurrentView('home')}
          onOpenPayment={() => setShowGlobalPaymentModal(true)}
        />
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
          onOpenFriends={() => setCurrentView('friends')}
          onOpenAdmin={() => setCurrentView('admin')}
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
          onOpenAdmin={() => setCurrentView('admin')}
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

      {/* Lucky Fortune Spin Wheel Modal */}
      <LuckyWheelModal
        isOpen={showLuckyWheelModal}
        onClose={() => setShowLuckyWheelModal(false)}
        onRewardWon={() => {
          setUser(authService.getCurrentUser());
        }}
      />

      {/* Live Matches Spectator Modal */}
      <LiveMatchesModal
        isOpen={showLiveSpectatorModal}
        onClose={() => setShowLiveSpectatorModal(false)}
        onSelectWatchMatch={handleWatchLiveMatch}
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
                  disabled={isJoiningRoom || !joinCodeInput.trim()}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 font-royal font-bold text-xs uppercase tracking-wider text-slate-950 shadow cursor-pointer hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isJoiningRoom ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <span>Join Chamber</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  disabled={isJoiningRoom}
                  className="w-full py-3 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs cursor-pointer hover:bg-slate-700 disabled:opacity-60"
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

      {/* Realm Chat 4-Digit Security PIN Modal */}
      <ChatPinModal
        isOpen={showChatPinModal}
        onClose={() => {
          setShowChatPinModal(false);
          setPendingMessengerTarget(null);
        }}
        onSuccess={() => {
          setShowChatPinModal(false);
          if (pendingMessengerTarget) {
            setLobbyMessengerTab(pendingMessengerTarget.tab);
            setLobbyMessengerFriendId(pendingMessengerTarget.friendId);
          }
          setShowLobbyMessenger(true);
          setPendingMessengerTarget(null);
        }}
      />

      {/* Imperial Realm Messenger & Lobby Global Chat Modal */}
      <LobbyMessengerModal
        isOpen={showLobbyMessenger}
        onClose={() => setShowLobbyMessenger(false)}
        defaultTab={lobbyMessengerTab}
        initialFriendId={lobbyMessengerFriendId}
        onChallengeFriend={(friend) => {
          setShowLobbyMessenger(false);
          handleSelectMode('quick_2');
        }}
        onInviteToRoom={(friend) => {
          setShowLobbyMessenger(false);
          handleSelectMode('room_create');
        }}
      />
    </div>
  );
};

export default App;
