import React, { useState } from 'react';
import {
  ArrowRight,
  Check,
  Crown,
  Eye,
  EyeOff,
  Flame,
  Gift,
  Lock,
  Mail,
  Shield,
  Sparkles,
  User,
  Users,
  Zap,
} from 'lucide-react';
import { sound } from '../../lib/audio';
import { authService } from '../../services/authService';

interface AuthViewProps {
  onAuthenticated: () => void;
  onContinueGuest: () => void;
}

const AVATAR_OPTIONS = [
  { id: 'avatar_1', name: 'Emperor Gold', color: '#f59e0b', icon: '👑' },
  { id: 'avatar_2', name: 'Grand Knight', color: '#3b82f6', icon: '⚔️' },
  { id: 'avatar_3', name: 'Imperial Sorcerer', color: '#8b5cf6', icon: '🔮' },
  { id: 'avatar_4', name: 'Dragon Vanguard', color: '#ef4444', icon: '🐉' },
  { id: 'avatar_5', name: 'Forest Sentinel', color: '#10b981', icon: '🏹' },
  { id: 'avatar_6', name: 'Crown Princess', color: '#ec4899', icon: '👸' },
];

export const AuthView: React.FC<AuthViewProps> = ({ onAuthenticated, onContinueGuest }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('avatar_1');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await authService.login(identifier, password);
      if (res.error) {
        setError(res.error);
        sound.playTimerWarning();
      } else {
        sound.playHomeGoal();
        onAuthenticated();
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!displayName.trim()) {
        setError('Please enter a Noble Display Name');
        setLoading(false);
        return;
      }

      const res = await authService.register(email, password, displayName.trim());
      if (res.error) {
        setError(res.error);
        sound.playTimerWarning();
      } else {
        if (res.user) {
          authService.updateProfile({ avatar_url: selectedAvatar });
        }
        sound.playHomeGoal();
        onAuthenticated();
      }
    } catch (err: any) {
      setError(err?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestEntry = () => {
    sound.playClick();
    onContinueGuest();
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 overflow-x-hidden relative">
      {/* Background Ambient Glows */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-amber-500/10 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 left-1/4 w-80 h-80 bg-purple-500/10 blur-[130px] pointer-events-none rounded-full" />

      {/* Main Authentication Container */}
      <div className="w-full max-w-md bg-slate-900/90 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 backdrop-blur-xl relative z-10 animate-fade-in">
        {/* Imperial Logo & Title */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-300 p-0.5 mx-auto flex items-center justify-center shadow-xl shadow-amber-500/30">
            <div className="w-full h-full rounded-3xl bg-slate-950 flex items-center justify-center">
              <Crown className="w-8 h-8 text-amber-300 animate-pulse" />
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-royal font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 tracking-wider">
              ROYAL LUDO
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Imperial Grand Chamber • Sign In to Your Court
            </p>
          </div>
        </div>

        {/* Tab Switcher: Login vs Register */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-950 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setTab('login');
              setError(null);
            }}
            className={`py-2.5 rounded-xl font-royal font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === 'login'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Sign In (لاگ اِن)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setTab('register');
              setError(null);
            }}
            className={`py-2.5 rounded-xl font-royal font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === 'register'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Register (رجسٹر)</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-semibold text-center animate-pulse shadow">
            {error}
          </div>
        )}

        {/* TAB 1: LOGIN FORM */}
        {tab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-amber-400" />
                <span>Email or Royal Username</span>
              </label>
              <input
                type="text"
                placeholder="e.g. noble@court.com or ammar_admin"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-2xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 outline-none transition-colors"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Secret Password</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-2xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 outline-none transition-colors pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 font-royal font-extrabold text-sm uppercase tracking-wider text-slate-950 shadow-xl shadow-amber-500/30 hover:brightness-110 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Enter Imperial Realm'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* TAB 2: REGISTER FORM */}
        {tab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span>Noble Display Name</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Prince Ali or Sultan Khan"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-2xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 outline-none transition-colors"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-amber-400" />
                <span>Email Address</span>
              </label>
              <input
                type="email"
                placeholder="e.g. noble@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-2xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 outline-none transition-colors"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Create Password</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 4 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-2xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 outline-none transition-colors pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Choose Heraldic Avatar */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Choose Heraldic Avatar
              </label>
              <div className="grid grid-cols-6 gap-2">
                {AVATAR_OPTIONS.map((av) => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setSelectedAvatar(av.id);
                    }}
                    className={`h-11 rounded-2xl border text-lg flex items-center justify-center transition-all cursor-pointer ${
                      selectedAvatar === av.id
                        ? 'bg-amber-500/30 border-amber-400 ring-2 ring-amber-400/50 scale-105 shadow-md'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                    title={av.name}
                  >
                    {av.icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Starter Gift Box */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-950 to-amber-950/60 border border-amber-500/40 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 flex-shrink-0">
                <Gift className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-amber-300 block">Starter Gift Included:</span>
                <span className="text-slate-300">2,500 Gold Coins + Level 1 Nobility</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 font-royal font-extrabold text-sm uppercase tracking-wider text-slate-950 shadow-xl shadow-amber-500/30 hover:brightness-110 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? 'Enlisting...' : 'Enlist Noble & Claim Bonus'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Guest Mode Option */}
        <div className="pt-2 border-t border-slate-800 text-center">
          <button
            type="button"
            onClick={handleGuestEntry}
            className="text-xs text-slate-400 hover:text-amber-300 transition-colors font-semibold cursor-pointer underline underline-offset-4"
          >
            Or play immediately as Guest Noble without an account →
          </button>
        </div>
      </div>
    </div>
  );
};

