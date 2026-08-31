import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Check,
  Crown,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogOut,
  MessageSquare,
  RotateCcw,
  Shield,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { sound } from '../../lib/audio';
import { authService } from '../../services/authService';
import { chatSecurityService } from '../../services/chatSecurityService';

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

  // Chat Privacy & PIN state
  const [isChatHidden, setIsChatHidden] = useState(() => chatSecurityService.isChatHidden());
  const [isPinRequired, setIsPinRequired] = useState(() => chatSecurityService.isPinRequired());
  const [showPinChange, setShowPinChange] = useState(false);
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [pinFeedback, setPinFeedback] = useState<{ msg: string; isError: boolean } | null>(null);

  useEffect(() => {
    const unsub = chatSecurityService.subscribe(() => {
      setIsChatHidden(chatSecurityService.isChatHidden());
      setIsPinRequired(chatSecurityService.isPinRequired());
    });
    return () => unsub();
  }, []);

  const toggleSound = () => {
    sound.isMuted = !sound.isMuted;
    setIsMuted(sound.isMuted);
    sound.playClick();
  };

  const handleToggleChatHidden = () => {
    sound.playClick();
    const nextVal = !isChatHidden;
    chatSecurityService.setChatHidden(nextVal);
    setIsChatHidden(nextVal);
    setFeedback(nextVal ? 'Realm Chat button is now hidden from Home Dashboard' : 'Realm Chat button is now visible');
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleTogglePinRequired = () => {
    sound.playClick();
    const nextVal = !isPinRequired;
    chatSecurityService.setPinRequired(nextVal);
    setIsPinRequired(nextVal);
    setFeedback(nextVal ? 'Realm Chat PIN protection enabled (Default: 1234)' : 'Realm Chat PIN protection disabled');
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleSaveNewPin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinFeedback(null);

    if (!chatSecurityService.verifyPin(currentPinInput)) {
      sound.playTimerWarning();
      setPinFeedback({ msg: 'Current PIN is incorrect! (Default: 1234)', isError: true });
      return;
    }

    if (!/^\d{4}$/.test(newPinInput.trim())) {
      sound.playTimerWarning();
      setPinFeedback({ msg: 'New PIN must be exactly 4 digits (e.g. 5678)', isError: true });
      return;
    }

    sound.playHomeGoal();
    chatSecurityService.setPinCode(newPinInput.trim());
    setPinFeedback({ msg: 'Security PIN updated successfully!', isError: false });
    setCurrentPinInput('');
    setNewPinInput('');
    setTimeout(() => {
      setShowPinChange(false);
      setPinFeedback(null);
    }, 2000);
  };

  const handleResetPinToDefault = () => {
    sound.playClick();
    chatSecurityService.setPinCode('1234');
    setPinFeedback({ msg: 'PIN reset to default "1234"', isError: false });
    setTimeout(() => setPinFeedback(null), 3000);
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

        {/* Feedback Alert */}
        {feedback && (
          <div className="p-3 rounded-2xl bg-amber-950/80 border border-amber-500/50 text-amber-200 text-xs font-semibold text-center animate-fade-in shadow-lg">
            {feedback}
          </div>
        )}

        {/* Realm Chat Privacy & Security Controls */}
        <div className="p-5 rounded-3xl bg-slate-900/90 border-2 border-amber-500/30 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-royal font-bold text-sm text-amber-300 uppercase tracking-wider">
                  Realm Chat Privacy & Lock
                </h3>
                <p className="text-[11px] text-slate-400">
                  Control chat visibility and PIN protection (ریلم چیٹ پرائیویسی)
                </p>
              </div>
            </div>
          </div>

          {/* 1. Hide / Unhide Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs sm:text-sm text-slate-100">
                  Realm Chat Button Visibility
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isChatHidden
                      ? 'bg-rose-950 border border-rose-500/40 text-rose-300'
                      : 'bg-emerald-950 border border-emerald-500/40 text-emerald-300'
                  }`}
                >
                  {isChatHidden ? 'Hidden (Secret Mode)' : 'Visible in Realm'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {isChatHidden
                  ? 'Button is hidden from Dashboard. Click below to show it again.'
                  : 'Clicking Realm Chat 3 times on dashboard will also instantly hide it.'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleToggleChatHidden}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow flex items-center gap-1.5 ${
                isChatHidden
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:brightness-110'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              {isChatHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{isChatHidden ? 'Unhide Button' : 'Hide Button'}</span>
            </button>
          </div>

          {/* 2. PIN Protection Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs sm:text-sm text-slate-100">
                  PIN Code Lock Protection
                </span>
                <span className="text-[10px] font-mono font-bold text-amber-400">
                  (Default PIN: 1234)
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Requires entering 4-digit PIN code before opening Realm Chat
              </p>
            </div>

            <button
              type="button"
              onClick={handleTogglePinRequired}
              className={`px-4 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                isPinRequired
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {isPinRequired ? 'LOCKED (ON)' : 'OFF'}
            </button>
          </div>

          {/* 3. Change PIN Code Section */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-xs sm:text-sm text-slate-200">
                  Security PIN Management
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setShowPinChange(!showPinChange);
                  setPinFeedback(null);
                }}
                className="text-xs text-amber-400 hover:underline font-bold cursor-pointer"
              >
                {showPinChange ? 'Cancel' : 'Change PIN Code →'}
              </button>
            </div>

            {showPinChange && (
              <form onSubmit={handleSaveNewPin} className="space-y-3 pt-2 border-t border-slate-800 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Current PIN (Default: 1234)
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="••••"
                      value={currentPinInput}
                      onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-center text-base tracking-widest text-amber-300 outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      New 4-Digit PIN
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="••••"
                      value={newPinInput}
                      onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-center text-base tracking-widest text-amber-300 outline-none"
                      required
                    />
                  </div>
                </div>

                {pinFeedback && (
                  <div
                    className={`p-2.5 rounded-xl text-xs font-semibold text-center ${
                      pinFeedback.isError
                        ? 'bg-rose-950 text-rose-200 border border-rose-500/40'
                        : 'bg-emerald-950 text-emerald-200 border border-emerald-500/40'
                    }`}
                  >
                    {pinFeedback.msg}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 font-royal font-bold text-xs uppercase tracking-wider text-slate-950 hover:brightness-110 transition-all cursor-pointer shadow"
                  >
                    Save New PIN Code
                  </button>
                  <button
                    type="button"
                    onClick={handleResetPinToDefault}
                    className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
                  >
                    Reset to 1234
                  </button>
                </div>
              </form>
            )}
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
