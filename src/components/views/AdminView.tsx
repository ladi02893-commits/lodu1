import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Banknote,
  Bot,
  Check,
  Coins,
  Copy,
  Crown,
  Database,
  Edit,
  Flame,
  Gift,
  HelpCircle,
  Key,
  Layers,
  Lock,
  LogOut,
  Mail,
  Megaphone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings2,
  Shield,
  Sliders,
  Sparkles,
  Tag,
  Trash2,
  Trophy,
  Unlock,
  UserCheck,
  UserX,
  Users,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import { sound } from '../../lib/audio';
import {
  AdminAnnouncement,
  AdminPlayerRecord,
  AdminStats,
  GameplayConfig,
  PromoCode,
  adminService,
} from '../../services/adminService';
import { authService } from '../../services/authService';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { paymentService } from '../../services/paymentService';
import { rewardService } from '../../services/rewardService';
import { DepositRequestRecord } from '../../types/database';

interface AdminViewProps {
  onBack: () => void;
}

type AdminTab = 'overview' | 'payments' | 'users' | 'economy' | 'bots' | 'sandbox';

export const AdminView: React.FC<AdminViewProps> = ({ onBack }) => {
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<AdminStats>(() => adminService.getStats());
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>(() =>
    adminService.getAnnouncements()
  );
  const [players, setPlayers] = useState<AdminPlayerRecord[]>(() => adminService.getPlayers());
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>(() => adminService.getPromoCodes());
  const [gameplayConfig, setGameplayConfig] = useState<GameplayConfig>(() =>
    adminService.getGameplayConfig()
  );

  // Deposits state
  const [depositRequests, setDepositRequests] = useState<DepositRequestRecord[]>(() =>
    paymentService.getAllRequests()
  );
  const [depositFilter, setDepositFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [paymentSearchQuery, setPaymentSearchQuery] = useState('');
  const [isRefreshingPayments, setIsRefreshingPayments] = useState(false);
  const [copiedTx, setCopiedTx] = useState<string | null>(null);

  // Gift modal state
  const [giftTargetUser, setGiftTargetUser] = useState<AdminPlayerRecord | null>(null);
  const [giftAmount, setGiftAmount] = useState('10000');
  const [giftNote, setGiftNote] = useState('Imperial Royal Gift from Sovereign Admin');
  const [isDeductMode, setIsDeductMode] = useState(false);

  // Edit User modal state
  const [editTargetUser, setEditTargetUser] = useState<AdminPlayerRecord | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editCoins, setEditCoins] = useState('0');
  const [editLevel, setEditLevel] = useState('1');
  const [editXp, setEditXp] = useState('0');
  const [editRole, setEditRole] = useState<'user' | 'admin' | 'moderator'>('user');
  const [editIsVip, setEditIsVip] = useState(false);
  const [editIsBanned, setEditIsBanned] = useState(false);

  // Rejection modal state
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('Invalid Transaction ID / payment not received');

  // Form states
  const [annTitle, setAnnTitle] = useState('');
  const [annMsg, setAnnMsg] = useState('');
  const [annType, setAnnType] = useState<AdminAnnouncement['type']>('event');

  const [coinGrantAmount, setCoinGrantAmount] = useState('5000');
  const [xpGrantAmount, setXpGrantAmount] = useState('1000');
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoCoins, setNewPromoCoins] = useState('3000');
  const [newPromoXp, setNewPromoXp] = useState('500');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilterRole, setUserFilterRole] = useState<'all' | 'admin' | 'user'>('all');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Check if current session is authenticated as Admin
  const isMasterAdmin =
    Boolean(
      currentUser.is_admin ||
      currentUser.role === 'admin' ||
      currentUser.email === 'ammaarahmd6@gmail.com' ||
      (currentUser.username && currentUser.username.toLowerCase().includes('ammar'))
    );

  const showNotification = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleCopyText = (text: string, id: string) => {
    sound.playClick();
    navigator.clipboard?.writeText(text);
    setCopiedTx(id);
    setTimeout(() => setCopiedTx(null), 2500);
  };

  const refreshAllPayments = async () => {
    setIsRefreshingPayments(true);
    try {
      const latest = await paymentService.fetchAllRequests();
      setDepositRequests([...latest]);
      setStats(adminService.getStats());
    } catch (e) {
      console.warn('Payment fetch error:', e);
      setDepositRequests([...paymentService.getAllRequests()]);
    } finally {
      setIsRefreshingPayments(false);
    }
  };

  const refreshAllPlayers = async () => {
    setPlayers(adminService.getPlayers());
    setStats(adminService.getStats());

    if (isSupabaseConfigured) {
      try {
        const { data: dbProfiles } = await supabase.from('profiles').select('*');
        if (dbProfiles && dbProfiles.length > 0) {
          const registeredList = authService.getRegisteredUsers();
          const curr = authService.getCurrentUser();
          
          const mergedRecords: AdminPlayerRecord[] = dbProfiles.map((p: any) => ({
            id: p.id,
            username: p.id === curr.id ? `${p.display_name} (Current Session)` : p.display_name || p.username,
            email: p.username ? `${p.username}@royal.realm` : 'noble@royal.realm',
            role: p.is_admin ? 'admin' : 'user',
            level: p.level || 1,
            coins: p.coins || 0,
            crowns: (p.wins || 0) * 10,
            isBanned: Boolean(p.is_banned),
            isVip: Boolean(p.is_admin),
            lastActive: p.is_online ? 'Active Now' : 'Synced from Database',
          }));

          // Add any local accounts not yet in supabase
          registeredList.forEach((u) => {
            if (!mergedRecords.some((r) => r.id === u.id)) {
              mergedRecords.push({
                id: u.id,
                username: u.id === curr.id ? `${u.display_name} (Current Session)` : u.display_name,
                email: u.email,
                role: u.role || (u.is_admin ? 'admin' : 'user'),
                level: u.level || 1,
                coins: u.coins || 0,
                crowns: (u.wins || 0) * 10,
                isBanned: !!u.is_banned,
                isVip: !!u.is_vip,
                lastActive: u.id === curr.id ? 'Active Now' : u.last_active || 'Registered Member',
              });
            }
          });

          setPlayers(mergedRecords);
        }
      } catch (e) {
        console.warn('Database profiles fetch note:', e);
      }
    }
  };

  useEffect(() => {
    refreshAllPlayers();
    refreshAllPayments();

    const unsubPayments = paymentService.subscribe((reqs) => {
      setDepositRequests(reqs);
      setStats(adminService.getStats());
    });

    const handleSync = () => {
      refreshAllPlayers();
      refreshAllPayments();
    };

    window.addEventListener('royal_ludo_sync', handleSync);
    window.addEventListener('storage', handleSync);

    let realtimeChannel: any = null;
    if (isSupabaseConfigured) {
      try {
        realtimeChannel = supabase
          .channel('admin_live_users')
          .on('broadcast', { event: 'USER_REGISTERED' }, () => {
            refreshAllPlayers();
          })
          .on('broadcast', { event: 'NEW_DEPOSIT' }, () => {
            refreshAllPayments();
          })
          .subscribe();
      } catch (e) {
        console.warn(e);
      }
    }

    return () => {
      unsubPayments();
      window.removeEventListener('royal_ludo_sync', handleSync);
      window.removeEventListener('storage', handleSync);
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, [activeTab]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAuthError(null);
    setIsAuthLoading(true);

    try {
      const res = await authService.login(adminEmailInput, adminPasswordInput);
      if (res.error) {
        setAdminAuthError(res.error);
        sound.playTimerWarning();
      } else if (res.user) {
        sound.playHomeGoal();
        setCurrentUser(res.user);
        setPlayers(adminService.getPlayers());
        setStats(adminService.getStats());
        refreshAllPayments();
        showNotification('Sovereign Administrator Verified! Welcome, Ammar.');
      }
    } catch (err: any) {
      setAdminAuthError(err?.message || 'Authentication error');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGrantCoins = async (amount?: number, targetUserId?: string) => {
    const val = amount !== undefined ? amount : parseInt(coinGrantAmount, 10);
    if (isNaN(val) || val <= 0) return;

    sound.playHomeGoal();
    if (targetUserId) {
      await adminService.grantTargetUserCoins(targetUserId, val);
    } else {
      adminService.grantUserCoins(val);
    }
    refreshAllPlayers();
    setStats(adminService.getStats());
    showNotification(`Successfully credited +${val.toLocaleString()} Coins!`);
  };

  const handleGrantXp = (amount?: number) => {
    const val = amount !== undefined ? amount : parseInt(xpGrantAmount, 10);
    if (isNaN(val) || val <= 0) return;

    sound.playHomeGoal();
    adminService.grantUserXp(val);
    setPlayers(adminService.getPlayers());
    setStats(adminService.getStats());
    showNotification(`Successfully granted +${val.toLocaleString()} Royal XP!`);
  };

  const handleUnlockAllSkins = () => {
    sound.playClick();
    adminService.unlockAllCosmetics();
    showNotification('All 20+ Board Themes, Dice Skins, and Token Frames unlocked in your inventory!');
  };

  const handlePostAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annMsg.trim()) return;

    sound.playClick();
    adminService.createAnnouncement(annTitle.trim(), annMsg.trim(), annType);
    setAnnouncements([...adminService.getAnnouncements()]);
    setAnnTitle('');
    setAnnMsg('');
    showNotification('Imperial Announcement broadcasted to all active players!');
  };

  const handleDeleteAnnouncement = (id: string) => {
    sound.playClick();
    adminService.deleteAnnouncement(id);
    setAnnouncements([...adminService.getAnnouncements()]);
    showNotification('Announcement removed.');
  };

  const handleCreatePromoCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromoCode.trim()) return;

    sound.playClick();
    const c = parseInt(newPromoCoins, 10) || 1000;
    const x = parseInt(newPromoXp, 10) || 200;
    adminService.createPromoCode(newPromoCode.trim(), c, x);
    setPromoCodes([...adminService.getPromoCodes()]);
    setNewPromoCode('');
    showNotification(`Promo code "${newPromoCode.toUpperCase()}" created with +${c} Coins and +${x} XP!`);
  };

  const handleTogglePlayerBan = (id: string, name: string) => {
    sound.playClick();
    const isBanned = adminService.togglePlayerBan(id);
    setPlayers(adminService.getPlayers());
    setStats(adminService.getStats());
    showNotification(`Player "${name}" is now ${isBanned ? 'BANNED' : 'UNBANNED'}.`);
  };

  const handleTogglePlayerRole = (id: string, name: string) => {
    sound.playClick();
    const nextRole = adminService.togglePlayerRole(id);
    setPlayers(adminService.getPlayers());
    setStats(adminService.getStats());
    showNotification(`Player "${name}" role changed to ${nextRole.toUpperCase()}.`);
  };

  const handleDeletePlayer = (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete player "${name}" from the realm database?`)) {
      return;
    }
    sound.playClick();
    const success = adminService.deletePlayer(id);
    if (success) {
      setPlayers(adminService.getPlayers());
      setStats(adminService.getStats());
      showNotification(`Player "${name}" has been permanently deleted.`);
    }
  };

  const handleOpenEditUser = (player: AdminPlayerRecord) => {
    sound.playClick();
    setEditTargetUser(player);
    setEditDisplayName(player.username.replace(' (Current Session)', '').replace(' (Guest Session)', ''));
    setEditCoins(player.coins.toString());
    setEditLevel(player.level.toString());
    setEditXp('1000');
    setEditRole(player.role);
    setEditIsVip(player.isVip);
    setEditIsBanned(player.isBanned);
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTargetUser) return;

    sound.playHomeGoal();
    adminService.updatePlayer(editTargetUser.id, {
      displayName: editDisplayName.trim(),
      coins: Math.max(0, parseInt(editCoins, 10) || 0),
      level: Math.max(1, parseInt(editLevel, 10) || 1),
      xp: Math.max(0, parseInt(editXp, 10) || 0),
      role: editRole,
      isVip: editIsVip,
      isBanned: editIsBanned,
    });

    setPlayers(adminService.getPlayers());
    setStats(adminService.getStats());
    setEditTargetUser(null);
    showNotification(`Updated profile for "${editDisplayName}" successfully!`);
  };

  const handleExecuteGift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!giftTargetUser) return;

    const val = parseInt(giftAmount, 10);
    if (isNaN(val) || val <= 0) return;

    sound.playHomeGoal();
    if (isDeductMode) {
      await adminService.deductTargetUserCoins(giftTargetUser.id, val, giftNote);
      showNotification(`Deducted -${val.toLocaleString()} Coins from ${giftTargetUser.username}.`);
    } else {
      await adminService.grantTargetUserCoins(giftTargetUser.id, val, giftNote);
      showNotification(`Gifted +${val.toLocaleString()} Coins to ${giftTargetUser.username}!`);
    }

    setGiftTargetUser(null);
    refreshAllPlayers();
    setStats(adminService.getStats());
  };

  // Payment Approvals execution
  const handleApproveDeposit = async (depId: string) => {
    sound.playHomeGoal();
    const success = await paymentService.approveDeposit(depId, 'Approved by Imperial Admin Command');
    if (success) {
      await refreshAllPayments();
      refreshAllPlayers();
      setStats(adminService.getStats());
      showNotification('Deposit Approved! Coins credited to user wallet in real time.');
    }
  };

  const handleRejectDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTargetId) return;

    sound.playClick();
    await paymentService.rejectDeposit(rejectTargetId, rejectReason);
    await refreshAllPayments();
    setRejectTargetId(null);
    showNotification('Deposit Request Rejected and user notified.');
  };

  const handleUpdateConfig = (partial: Partial<GameplayConfig>) => {
    sound.playClick();
    const updated = adminService.updateGameplayConfig(partial);
    setGameplayConfig(updated);
    showNotification('Gameplay engine settings updated.');
  };

  const filteredPlayers = players.filter((p) => {
    const matchesSearch =
      p.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(userSearchQuery.toLowerCase());

    const matchesRole =
      userFilterRole === 'all' || p.role === userFilterRole;

    return matchesSearch && matchesRole;
  });

  const filteredDeposits = depositRequests.filter((d) => {
    const matchesFilter = depositFilter === 'all' || d.status === depositFilter;
    const matchesSearch =
      !paymentSearchQuery.trim() ||
      d.display_name.toLowerCase().includes(paymentSearchQuery.toLowerCase()) ||
      d.username.toLowerCase().includes(paymentSearchQuery.toLowerCase()) ||
      d.transaction_reference_id.toLowerCase().includes(paymentSearchQuery.toLowerCase()) ||
      d.sender_account_or_name.toLowerCase().includes(paymentSearchQuery.toLowerCase()) ||
      d.payment_method.toLowerCase().includes(paymentSearchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const pendingDepositsCount = depositRequests.filter((d) => d.status === 'pending').length;

  // If user is not authenticated as Master Admin, show the Imperial Admin Login Gate
  if (!isMasterAdmin) {
    return (
      <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-purple-500 selection:text-white relative">
        <button
          onClick={onBack}
          className="absolute top-6 left-6 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 hover:text-purple-300 transition-all cursor-pointer text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit to Court</span>
        </button>

        <div className="w-full max-w-md bg-slate-900 border-2 border-purple-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-purple-500/20 space-y-6 text-center animate-fade-in relative">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-700 via-indigo-600 to-purple-400 p-0.5 mx-auto flex items-center justify-center shadow-xl">
            <div className="w-full h-full rounded-3xl bg-slate-950 flex items-center justify-center">
              <Shield className="w-8 h-8 text-purple-300" />
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="font-royal font-black text-xl text-purple-300 tracking-wide">
              Imperial Admin Gateway
            </h2>
            <p className="text-xs text-slate-400">
              Restricted Area • Authorized Personnel Only. Enter your administrator credentials.
            </p>
          </div>

          {adminAuthError && (
            <div className="p-3 rounded-xl bg-rose-950 border border-rose-500/50 text-rose-200 text-xs font-bold">
              {adminAuthError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-3.5 text-left">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Admin Email
              </label>
              <div className="flex items-center gap-2 bg-slate-950 border border-purple-500/40 rounded-xl px-3.5 py-2.5 text-xs">
                <Mail className="w-4 h-4 text-purple-400" />
                <input
                  type="email"
                  placeholder="admin@example.com"
                  value={adminEmailInput}
                  onChange={(e) => setAdminEmailInput(e.target.value)}
                  className="w-full bg-transparent border-none text-slate-100 placeholder-slate-600 outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Security Password
              </label>
              <div className="flex items-center gap-2 bg-slate-950 border border-purple-500/40 rounded-xl px-3.5 py-2.5 text-xs">
                <Key className="w-4 h-4 text-purple-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  className="w-full bg-transparent border-none text-slate-100 placeholder-slate-600 outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isAuthLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 font-royal font-bold text-sm text-white shadow-lg shadow-purple-500/30 hover:brightness-110 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isAuthLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              <span>Verify Sovereign Authorization</span>
            </button>
          </form>

          <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-[11px] text-purple-200">
            👑 <strong>Master Admin:</strong> <span className="font-mono text-purple-300">ammaarahmd6@gmail.com</span> / <span className="font-mono text-purple-300">ammar123</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center pb-16 selection:bg-purple-500 selection:text-white">
      {/* Header Bar */}
      <header className="w-full max-w-5xl px-4 py-3.5 sm:py-4 flex items-center justify-between border-b border-purple-500/20 bg-slate-950/90 backdrop-blur sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500/40 text-slate-300 hover:text-purple-300 transition-colors cursor-pointer"
            title="Back to Court"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-xl bg-purple-950/80 border border-purple-400/60 flex items-center justify-center text-purple-300 shadow-md">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-royal font-black text-sm sm:text-base text-purple-300 tracking-wide">
              Imperial Command Center
            </h2>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Authenticated: {currentUser.display_name} • {currentUser.email || 'Root Admin'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-purple-900/50 border border-purple-400/40 text-purple-200 text-xs font-bold font-mono">
            ADMIN ROOT
          </span>
          <button
            onClick={() => {
              authService.logout();
              setCurrentUser(authService.getCurrentUser());
            }}
            className="p-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            title="Logout Admin"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-5xl px-4 py-6 space-y-6">
        {/* Toast Feedback Notification */}
        {feedback && (
          <div className="p-3.5 rounded-2xl bg-purple-950/90 border-2 border-purple-400 text-purple-200 text-xs font-bold text-center animate-fade-in shadow-2xl flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-300 animate-spin" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Tab Navigation Pill Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-purple-500/20 backdrop-blur">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('overview');
            }}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('payments');
            }}
            className={`relative flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'payments'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Banknote className="w-3.5 h-3.5" />
            <span>Payments</span>
            {pendingDepositsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono text-[9px] font-black animate-pulse">
                {pendingDepositsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('users');
            }}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Real Players ({players.length})</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('economy');
            }}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'economy'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Economy</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('bots');
            }}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'bots'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Bot Engine</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('sandbox');
            }}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'sandbox'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Sandbox</span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW & TELEMETRY */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            {/* Live Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-purple-500/30 space-y-1 shadow-lg">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Registered Users</span>
                  <Users className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl font-black text-slate-100">
                  {stats.totalUsers}
                </div>
                <div className="text-[10px] text-emerald-400 font-bold">Live database synced</div>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-emerald-500/30 space-y-1 shadow-lg">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Pending Deposits</span>
                  <Banknote className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-emerald-300">
                  {pendingDepositsCount}
                </div>
                <div className="text-[10px] text-slate-400">Needs Admin Approval</div>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-amber-500/30 space-y-1 shadow-lg">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Approved Volume</span>
                  <Trophy className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-amber-300">
                  PKR {stats.totalDepositsVolumePKR.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400">Real coin purchases</div>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-yellow-500/30 space-y-1 shadow-lg">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Coins in Vaults</span>
                  <Coins className="w-4 h-4 text-yellow-400" />
                </div>
                <div className="text-2xl font-black text-yellow-300">
                  {stats.totalCoinsCirculating.toLocaleString()}
                </div>
                <div className="text-[10px] text-amber-400">Imperial gold reserves</div>
              </div>
            </div>

            {/* Quick Admin Action Presets */}
            <div className="p-5 rounded-3xl bg-slate-900/90 border border-purple-500/20 space-y-3">
              <h3 className="font-royal font-bold text-sm text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>One-Click Super Admin Grants</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  onClick={() => handleGrantCoins(5000)}
                  className="p-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs flex flex-col items-center gap-1 transition-all cursor-pointer"
                >
                  <Coins className="w-5 h-5 text-amber-400" />
                  <span>+5,000 Coins</span>
                </button>

                <button
                  onClick={() => handleGrantCoins(50000)}
                  className="p-3 rounded-2xl bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 font-bold text-xs flex flex-col items-center gap-1 transition-all cursor-pointer"
                >
                  <Crown className="w-5 h-5 text-yellow-400" />
                  <span>+50,000 Vault</span>
                </button>

                <button
                  onClick={() => handleGrantXp(2000)}
                  className="p-3 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold text-xs flex flex-col items-center gap-1 transition-all cursor-pointer"
                >
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  <span>+2,000 XP (Level Up)</span>
                </button>

                <button
                  onClick={handleUnlockAllSkins}
                  className="p-3 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/40 text-purple-300 font-bold text-xs flex flex-col items-center gap-1 transition-all cursor-pointer"
                >
                  <Unlock className="w-5 h-5 text-purple-400" />
                  <span>Unlock All Cosmetics</span>
                </button>
              </div>
            </div>

            {/* Broadcast Announcements */}
            <div className="p-5 rounded-3xl bg-slate-900/90 border border-purple-500/20 space-y-4">
              <h3 className="font-royal font-bold text-sm text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-purple-400" />
                <span>Realm System Broadcast</span>
              </h3>

              <form onSubmit={handlePostAnnouncement} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Announcement Title..."
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 outline-none focus:border-purple-400"
                  />
                  <select
                    value={annType}
                    onChange={(e) => setAnnType(e.target.value as any)}
                    className="bg-slate-950 border border-slate-700 text-xs text-purple-300 rounded-xl px-3 py-2.5"
                  >
                    <option value="event">Event Celebration</option>
                    <option value="info">System Update</option>
                    <option value="reward">Bonus Reward</option>
                    <option value="maintenance">Maintenance Alert</option>
                  </select>
                </div>

                <textarea
                  placeholder="Announcement message content for all players..."
                  value={annMsg}
                  onChange={(e) => setAnnMsg(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-slate-100 outline-none focus:border-purple-400"
                />

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-white text-xs shadow transition-all cursor-pointer flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Broadcast Announcement</span>
                </button>
              </form>

              {/* Announcements Feed */}
              <div className="space-y-2 pt-2">
                {announcements.map((a) => (
                  <div
                    key={a.id}
                    className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-purple-300">{a.title}</span>
                        <span className="text-[10px] text-purple-400 font-mono uppercase px-2 py-0.5 rounded-full bg-purple-950 border border-purple-800">
                          {a.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{a.message}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteAnnouncement(a.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition-colors cursor-pointer"
                      title="Delete Announcement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PAYMENTS & DEPOSIT REQUESTS */}
        {activeTab === 'payments' && (
          <div className="space-y-5 animate-fade-in">
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs w-full sm:w-auto overflow-x-auto">
                {(['all', 'pending', 'approved', 'rejected'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => {
                      sound.playClick();
                      setDepositFilter(filter);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-bold uppercase transition-all cursor-pointer whitespace-nowrap ${
                      depositFilter === filter
                        ? 'bg-purple-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {filter} {filter === 'pending' && pendingDepositsCount > 0 ? `(${pendingDepositsCount})` : ''}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search TRX ID, User, or Method..."
                    value={paymentSearchQuery}
                    onChange={(e) => setPaymentSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-purple-400"
                  />
                </div>

                <button
                  onClick={refreshAllPayments}
                  disabled={isRefreshingPayments}
                  className="px-3.5 py-2 rounded-xl bg-purple-950/60 border border-purple-500/40 text-purple-300 hover:bg-purple-900 font-bold text-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50 flex-shrink-0 transition-colors"
                  title="Sync latest requests from cloud database"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingPayments ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{isRefreshingPayments ? 'Syncing...' : 'Sync Cloud Orders'}</span>
                </button>
              </div>
            </div>

            {filteredDeposits.length === 0 ? (
              <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-2">
                <Banknote className="w-8 h-8 text-slate-600 mx-auto" />
                <h4 className="font-royal font-bold text-sm text-slate-300">No Deposit Requests Found</h4>
                <p className="text-xs text-slate-500">
                  User coin purchase orders via JazzCash, EasyPaisa, Bank, and UPI will appear here in real time.
                </p>
                <button
                  onClick={refreshAllPayments}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer transition-all mt-2"
                >
                  Refresh Database
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDeposits.map((dep) => (
                  <div
                    key={dep.id}
                    className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg hover:border-purple-500/30 transition-all"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
                          <Coins className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-base text-slate-100">
                          +{dep.coins_amount.toLocaleString()} Coins
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40">
                          {dep.currency} {dep.fiat_amount}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-purple-300 px-2 py-0.5 rounded bg-purple-950 border border-purple-800">
                          {dep.payment_method}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                            dep.status === 'approved'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                              : dep.status === 'rejected'
                              ? 'bg-rose-950 text-rose-300 border-rose-500/40'
                              : 'bg-amber-950 text-amber-300 border-amber-500/40 animate-pulse'
                          }`}
                        >
                          {dep.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-300 space-y-1">
                        <div>
                          User: <strong className="text-slate-100">{dep.display_name}</strong> (@{dep.username}) • ID: <span className="font-mono text-slate-400">{dep.user_id}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap font-mono">
                          <span>Sender: <strong className="text-amber-200">{dep.sender_account_or_name}</strong></span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            TRX ID: <strong className="text-purple-300 bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-800/60 select-all">{dep.transaction_reference_id}</strong>
                            <button
                              onClick={() => handleCopyText(dep.transaction_reference_id, dep.id)}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-300 cursor-pointer"
                              title="Copy Transaction ID"
                            >
                              {copiedTx === dep.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Submitted: {new Date(dep.created_at).toLocaleString()}
                        </div>
                        {dep.admin_note && (
                          <div className="text-[11px] text-amber-300 font-semibold pt-1">
                            Admin Note: {dep.admin_note}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {dep.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleApproveDeposit(dep.id)}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-slate-950 font-black text-xs shadow cursor-pointer flex items-center gap-1.5"
                          >
                            <Check className="w-4 h-4" />
                            <span>Approve & Credit Coins</span>
                          </button>

                          <button
                            onClick={() => {
                              sound.playClick();
                              setRejectTargetId(dep.id);
                            }}
                            className="px-3 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-bold text-xs cursor-pointer flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </>
                      ) : (
                        <div className="text-xs text-slate-500 font-mono">
                          Reviewed: {dep.reviewed_at ? new Date(dep.reviewed_at).toLocaleTimeString() : 'N/A'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: REAL USER MANAGEMENT & AUTH */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-fade-in">
            {/* Search & Role Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center gap-3 w-full sm:flex-1">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search registered players by username, royal ID, or email..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none text-xs sm:text-sm text-slate-100 placeholder-slate-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs self-start sm:self-center">
                {(['all', 'admin', 'user'] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => {
                      sound.playClick();
                      setUserFilterRole(role);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-bold uppercase transition-all cursor-pointer ${
                      userFilterRole === role
                        ? 'bg-purple-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* Players Table / Cards */}
            <div className="space-y-3">
              <h3 className="font-royal font-bold text-sm text-slate-200 uppercase tracking-wider">
                Registered Imperial Accounts ({filteredPlayers.length})
              </h3>

              <div className="grid grid-cols-1 gap-3">
                {filteredPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-purple-500/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-900 to-indigo-900 border border-purple-500/40 flex items-center justify-center font-royal font-bold text-amber-300 text-lg shadow-md flex-shrink-0">
                        {player.username.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-100">{player.username}</span>
                          {player.email && (
                            <span className="text-xs text-purple-300 font-mono">
                              ({player.email})
                            </span>
                          )}
                          {player.isVip && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/30">
                              VIP
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-mono font-bold uppercase">
                            {player.role}
                          </span>
                          {player.isBanned && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                              BANNED
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                          <span className="flex items-center gap-1 text-amber-300 font-bold">
                            <Coins className="w-3.5 h-3.5" />
                            {player.coins.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1 text-purple-300 font-bold">
                            <Crown className="w-3.5 h-3.5" />
                            {player.crowns}
                          </span>
                          <span>Lvl {player.level}</span>
                          <span className="text-slate-500">• {player.lastActive}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                      {/* Gift Coins */}
                      <button
                        onClick={() => {
                          sound.playClick();
                          setGiftTargetUser(player);
                          setIsDeductMode(false);
                          setGiftAmount('10000');
                          setGiftNote('Imperial Gift from Sovereign Admin');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 font-bold text-slate-950 text-xs shadow cursor-pointer flex items-center gap-1"
                        title="Gift or Deduct Coins"
                      >
                        <Gift className="w-3.5 h-3.5" />
                        <span>Coins</span>
                      </button>

                      {/* Edit Profile */}
                      <button
                        onClick={() => handleOpenEditUser(player)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold cursor-pointer flex items-center gap-1"
                        title="Edit User Details"
                      >
                        <Edit className="w-3.5 h-3.5 text-purple-400" />
                        <span>Edit</span>
                      </button>

                      {/* Toggle Role */}
                      {player.id !== 'admin_ammar_001' && (
                        <button
                          onClick={() => handleTogglePlayerRole(player.id, player.username)}
                          className="px-2.5 py-1.5 rounded-xl bg-purple-950/60 border border-purple-500/40 text-purple-300 hover:bg-purple-900 text-xs font-bold cursor-pointer"
                          title="Toggle Role"
                        >
                          {player.role === 'admin' ? 'Make User' : 'Make Admin'}
                        </button>
                      )}

                      {/* Toggle Ban */}
                      <button
                        onClick={() => handleTogglePlayerBan(player.id, player.username)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          player.isBanned
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                            : 'bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30'
                        }`}
                      >
                        {player.isBanned ? 'Unban' : 'Ban'}
                      </button>

                      {/* Delete Player */}
                      {player.id !== 'admin_ammar_001' && (
                        <button
                          onClick={() => handleDeletePlayer(player.id, player.username)}
                          className="p-1.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-400 hover:bg-rose-900/60 transition-colors cursor-pointer"
                          title="Delete Account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ECONOMY & PROMO CODES */}
        {activeTab === 'economy' && (
          <div className="space-y-6 animate-fade-in">
            {/* Custom Coin & XP Granter */}
            <div className="p-5 rounded-3xl bg-slate-900/90 border border-purple-500/20 space-y-4">
              <h3 className="font-royal font-bold text-sm text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>Direct Treasury Dispatch</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 font-bold">Imperial Coins Amount</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={coinGrantAmount}
                      onChange={(e) => setCoinGrantAmount(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm font-bold text-amber-200 outline-none"
                    />
                    <button
                      onClick={() => handleGrantCoins()}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 font-bold text-slate-950 text-xs shadow hover:brightness-110 cursor-pointer"
                    >
                      Credit Coins
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-slate-400 font-bold">Royal XP Amount</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={xpGrantAmount}
                      onChange={(e) => setXpGrantAmount(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm font-bold text-indigo-200 outline-none"
                    />
                    <button
                      onClick={() => handleGrantXp()}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 font-bold text-white text-xs shadow hover:brightness-110 cursor-pointer"
                    >
                      Credit XP
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Promo Code Generator */}
            <div className="p-5 rounded-3xl bg-slate-900/90 border border-purple-500/20 space-y-4">
              <h3 className="font-royal font-bold text-sm text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Tag className="w-4 h-4 text-purple-400" />
                <span>Create Royal Promo Codes</span>
              </h3>

              <form onSubmit={handleCreatePromoCode} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="CODE (e.g. KING2026)"
                  value={newPromoCode}
                  onChange={(e) => setNewPromoCode(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-purple-300 uppercase outline-none focus:border-purple-400"
                />
                <input
                  type="number"
                  placeholder="Coins Value"
                  value={newPromoCoins}
                  onChange={(e) => setNewPromoCoins(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-amber-200 outline-none focus:border-amber-400"
                />
                <input
                  type="number"
                  placeholder="XP Value"
                  value={newPromoXp}
                  onChange={(e) => setNewPromoXp(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-indigo-200 outline-none focus:border-indigo-400"
                />
                <button
                  type="submit"
                  className="py-2 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-white text-xs shadow cursor-pointer"
                >
                  Generate Code
                </button>
              </form>

              {/* Promo codes table */}
              <div className="space-y-2 pt-2">
                {promoCodes.map((promo) => (
                  <div
                    key={promo.code}
                    className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-purple-300 bg-purple-950/60 px-2 py-1 rounded border border-purple-800">
                        {promo.code}
                      </span>
                      <span className="text-amber-400 font-bold">+{promo.coins.toLocaleString()} Coins</span>
                      <span className="text-indigo-400 font-bold">+{promo.xp} XP</span>
                      <span className="text-slate-400">Claims: {promo.usedCount}/{promo.maxUses}</span>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      promo.isActive ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-900 text-slate-500'
                    }`}>
                      {promo.isActive ? 'Active' : 'Expired'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: BOT ENGINE CONFIGURATION */}
        {activeTab === 'bots' && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-5 rounded-3xl bg-slate-900/90 border border-purple-500/20 space-y-4">
              <h3 className="font-royal font-bold text-sm text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Bot className="w-4 h-4 text-purple-400" />
                <span>Autonomous AI Tactical Heuristics</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-300">Bot Aggressiveness (Capture Priority)</span>
                    <span className="text-purple-300">{Math.round(gameplayConfig.botAggressionFactor * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={gameplayConfig.botAggressionFactor}
                    onChange={(e) => handleUpdateConfig({ botAggressionFactor: parseFloat(e.target.value) })}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-500">Controls how aggressively bots hunt down opponent pieces over advancing home.</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-300">Turn Duration Time Limit</span>
                    <span className="text-purple-300">{gameplayConfig.turnTimeLimitSeconds}s</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    step="5"
                    value={gameplayConfig.turnTimeLimitSeconds}
                    onChange={(e) => handleUpdateConfig({ turnTimeLimitSeconds: parseInt(e.target.value, 10) })}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-500">Time allowed per turn before automated server forfeit passes the dice.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: SANDBOX & DEBUGGER */}
        {activeTab === 'sandbox' && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-5 rounded-3xl bg-slate-900/90 border border-purple-500/20 space-y-4">
              <h3 className="font-royal font-bold text-sm text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                <span>Developer Sandbox & State Simulator</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    adminService.setDailyStreakForTesting(7);
                    showNotification('Daily Login streak artificially bumped to Day 7 (Imperial Sovereign Vault)!');
                  }}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-purple-500/40 text-left space-y-1 transition-all cursor-pointer"
                >
                  <div className="text-xs font-bold text-purple-300">Simulate 7-Day Login Streak</div>
                  <p className="text-[10px] text-slate-400">Instantly make Day 7 Grand Tribute claimable in Daily Login dialog.</p>
                </button>

                <button
                  onClick={() => {
                    if (window.confirm('Reset all local caches and test data?')) {
                      adminService.resetCurrentUserData();
                    }
                  }}
                  className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/30 hover:bg-rose-950/60 text-left space-y-1 transition-all cursor-pointer"
                >
                  <div className="text-xs font-bold text-rose-400">Purge Storage Cache</div>
                  <p className="text-[10px] text-slate-400">Clear profile cache and reset to default nobility state.</p>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: Gift / Deduct Coins Modal */}
      {giftTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border-2 border-purple-500/50 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                  <Gift className="w-4 h-4" />
                </div>
                <h3 className="font-royal font-bold text-base text-slate-100">
                  {isDeductMode ? 'Deduct Coins' : 'Gift Imperial Coins'}
                </h3>
              </div>
              <button
                onClick={() => setGiftTargetUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
              Target User: <strong className="text-amber-200">{giftTargetUser.username}</strong> ({giftTargetUser.email}) • Current Vault: <strong className="text-amber-400">{giftTargetUser.coins.toLocaleString()} Coins</strong>
            </div>

            <form onSubmit={handleExecuteGift} className="space-y-4">
              <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setIsDeductMode(false)}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${!isDeductMode ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
                >
                  Gift (Credit)
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeductMode(true)}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${isDeductMode ? 'bg-rose-500 text-white' : 'text-slate-400'}`}
                >
                  Penalty (Deduct)
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-bold">Coin Amount</label>
                <input
                  type="number"
                  value={giftAmount}
                  onChange={(e) => setGiftAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-amber-300 outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-bold">Imperial Reason / Ledger Note</label>
                <input
                  type="text"
                  value={giftNote}
                  onChange={(e) => setGiftNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                className={`w-full py-3 rounded-xl font-bold text-xs shadow-lg transition-all cursor-pointer ${
                  isDeductMode
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-slate-950'
                }`}
              >
                {isDeductMode ? 'Execute Coin Deduction' : 'Dispatch Coin Gift'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit User Profile Modal */}
      {editTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border-2 border-purple-500/50 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  <Edit className="w-4 h-4" />
                </div>
                <h3 className="font-royal font-bold text-base text-slate-100">
                  Edit User Account Details
                </h3>
              </div>
              <button
                onClick={() => setEditTargetUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-bold">Display Name</label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none focus:border-purple-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold">Coin Balance</label>
                  <input
                    type="number"
                    value={editCoins}
                    onChange={(e) => setEditCoins(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 font-bold text-amber-300 outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-bold">Level</label>
                  <input
                    type="number"
                    value={editLevel}
                    onChange={(e) => setEditLevel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 font-bold text-slate-100 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold">Account Role</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-purple-300 outline-none"
                  >
                    <option value="user">User</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-bold">VIP Nobility</label>
                  <select
                    value={editIsVip ? 'yes' : 'no'}
                    onChange={(e) => setEditIsVip(e.target.value === 'yes')}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-amber-300 outline-none"
                  >
                    <option value="no">Standard Member</option>
                    <option value="yes">VIP Nobility</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-bold">Ban Status</label>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <input
                    type="checkbox"
                    id="ban-toggle"
                    checked={editIsBanned}
                    onChange={(e) => setEditIsBanned(e.target.checked)}
                    className="accent-rose-500 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="ban-toggle" className="text-slate-300 cursor-pointer font-bold">
                    Suspend / Ban this user from Imperial Realm
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 font-bold text-white text-xs shadow-lg transition-all cursor-pointer"
              >
                Save Profile Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Rejection Reason Modal */}
      {rejectTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border-2 border-rose-500/50 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <h3 className="font-royal font-bold text-base text-slate-100">
                  Reject Deposit Request
                </h3>
              </div>
              <button
                onClick={() => setRejectTargetId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRejectDeposit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-bold">Select Preset Reason</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    'Invalid / Unrecognized TRX ID',
                    'Payment Not Received in Bank / Wallet',
                    'Duplicate Transaction ID submitted',
                    'Incorrect Amount / Short Payment',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRejectReason(preset)}
                      className={`p-2 rounded-xl text-left text-xs transition-all border ${
                        rejectReason === preset
                          ? 'bg-rose-950 border-rose-500/60 text-rose-200 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-bold">Custom Reason / Notes</label>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-rose-400"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 font-bold text-xs text-white shadow-lg transition-all cursor-pointer"
              >
                Confirm Rejection
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
