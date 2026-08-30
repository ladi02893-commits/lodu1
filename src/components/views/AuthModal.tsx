import React, { useState } from 'react';
import { Crown, Lock, Mail, User, X } from 'lucide-react';
import { sound } from '../../lib/audio';
import { authService } from '../../services/authService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await authService.login(email, password);
        if (res.error) {
          setError(res.error);
        } else {
          sound.playHomeGoal();
          onSuccess();
          onClose();
        }
      } else {
        if (!username.trim()) {
          setError('Please provide a display name for your nobility profile.');
          setLoading(false);
          return;
        }
        const res = await authService.register(email, password, username.trim());
        if (res.error) {
          setError(res.error);
        } else {
          sound.playHomeGoal();
          onSuccess();
          onClose();
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl animate-fade-in">
      <div className="w-full max-w-sm bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 shadow-2xl space-y-5 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 p-0.5 mx-auto flex items-center justify-center shadow-lg">
            <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
              <Crown className="w-6 h-6 text-amber-300" />
            </div>
          </div>
          <h3 className="font-royal font-black text-lg text-amber-300">
            {mode === 'login' ? 'Royal Court Sign In' : 'Enlist as New Noble'}
          </h3>
          <p className="text-xs text-slate-400">
            Save your level, unlocked cosmetics, and stats to cloud.
          </p>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-950 border border-rose-500/40 text-rose-200 text-xs font-semibold text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Noble Name
              </label>
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs">
                <User className="w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="e.g. Duke Sterling"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-transparent text-amber-200 outline-none w-full"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Email Address
            </label>
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs">
              <Mail className="w-4 h-4 text-slate-500" />
              <input
                type="email"
                placeholder="noble@royal-ludo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-transparent text-amber-200 outline-none w-full"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Secret Password
            </label>
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs">
              <Lock className="w-4 h-4 text-slate-500" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-transparent text-amber-200 outline-none w-full"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 font-royal font-bold text-xs uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : mode === 'login' ? 'Enter Royal Court' : 'Join Realm'}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="text-center pt-2 border-t border-slate-800">
          {mode === 'login' ? (
            <p className="text-xs text-slate-400">
              New to Royal Ludo?{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                className="text-amber-400 hover:underline font-bold cursor-pointer"
              >
                Create Account
              </button>
            </p>
          ) : (
            <p className="text-xs text-slate-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-amber-400 hover:underline font-bold cursor-pointer"
              >
                Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
