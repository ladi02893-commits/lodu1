import React, { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Check,
  Crown,
  LogOut,
  RotateCcw,
  Shield,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { sound } from '../../lib/audio';
import { authService } from '../../services/authService';

interface SettingsViewProps {
  onBack: () => void;
  onOpenAuth: () => void;
  onLogout?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onBack, onOpenAuth, onLogout }) => {
  const [user, setUser] = useState(authService.getCurrentUser());
  const [isMuted, setIsMuted] = useState(sound.isMuted);
  const [vibration, setVibration] = useState(true);
  const [autoPass, setAutoPass] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  const toggleSound = () => {
    sound.isMuted = !sound.isMuted;
    setIsMuted(sound.isMuted);
    sound.playClick();
  };

  const handleResetGuestData = () => {
    if (confirm('Are you sure you want to reset your local stats and restart as a new Noble?')) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    }
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
          Chamber Settings
        </h2>

        <div className="w-16" />
      </header>

      <main className="w-full max-w-2xl px-4 py-6 space-y-6">
        {/* Audio & Feedback Multi-Channel Controls */}
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-royal font-bold text-sm text-slate-200 uppercase tracking-wider">
              Acoustic Symphony & Audio
            </h3>
            <button
              onClick={toggleSound}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                !isMuted ? 'bg-amber-500 text-slate-950 shadow' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{isMuted ? 'UNMUTE ALL' : 'MUTE ALL'}</span>
            </button>
          </div>

          {/* Master Volume Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-slate-200">Master Realm Volume</span>
              <span className="font-mono text-amber-400 font-bold">{sound.masterVolume}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={sound.masterVolume}
              onChange={(e) => {
                const val = Number(e.target.value);
                sound.setMasterVolume(val);
                setUser({ ...user });
              }}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* SFX & Fanfare Volume Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-slate-200">Dice & Capture Sound Effects (SFX)</span>
              <span className="font-mono text-amber-400 font-bold">{sound.sfxVolume}%</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                value={sound.sfxVolume}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  sound.setSfxVolume(val);
                  setUser({ ...user });
                }}
                className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <button
                onClick={() => sound.playDiceResult(6)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-[10px] cursor-pointer"
              >
                Test SFX
              </button>
            </div>
          </div>

          {/* Music Volume Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-slate-200">Royal Ambient Music</span>
              <span className="font-mono text-amber-400 font-bold">{sound.musicVolume}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={sound.musicVolume}
              onChange={(e) => {
                const val = Number(e.target.value);
                sound.setMusicVolume(val);
                setUser({ ...user });
              }}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* Voice Chat Volume Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-slate-200">Voice Chat Output Volume</span>
              <span className="font-mono text-amber-400 font-bold">{sound.voiceVolume}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={sound.voiceVolume}
              onChange={(e) => {
                const val = Number(e.target.value);
                sound.setVoiceVolume(val);
                setUser({ ...user });
              }}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <Crown className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs sm:text-sm text-slate-100">Auto-Pass Unmovable Turns</div>
                <div className="text-[11px] text-slate-400">Automatically ends turn if no legal moves exist</div>
              </div>
            </div>

            <button
              onClick={() => setAutoPass(!autoPass)}
              className={`px-4 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                autoPass ? 'bg-purple-600 text-white shadow' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {autoPass ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Account & Profile */}
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
          <h3 className="font-royal font-bold text-sm text-slate-200 uppercase tracking-wider">
            Account Management
          </h3>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-xs sm:text-sm text-slate-100">
                {user.email ? user.email : 'Guest Session (Local Storage)'}
              </div>
              <div className="text-[11px] text-slate-400">
                Player ID: #{user.player_id}
              </div>
            </div>

            {!user.email ? (
              <button
                onClick={onOpenAuth}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow"
              >
                Sign In / Register
              </button>
            ) : (
              <button
                onClick={() => {
                  sound.playClick();
                  authService.logout();
                  setUser(authService.getCurrentUser());
                  setFeedback('Logged out of cloud session');
                  if (onLogout) onLogout();
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-rose-300 font-bold text-xs transition-all cursor-pointer border border-slate-700"
              >
                Log Out
              </button>
            )}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="p-5 rounded-3xl bg-rose-950/20 border border-rose-500/30 space-y-3">
          <h3 className="font-royal font-bold text-sm text-rose-300 uppercase tracking-wider">
            Clear Data
          </h3>
          <p className="text-xs text-slate-400">
            Reset all your locally saved matches, unlocked cosmetics, and statistics.
          </p>
          <button
            onClick={handleResetGuestData}
            className="px-4 py-2 rounded-xl bg-rose-900/80 hover:bg-rose-800 text-rose-100 font-bold text-xs transition-all cursor-pointer flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Local Profile</span>
          </button>
        </div>
      </main>
    </div>
  );
};
