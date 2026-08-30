import React, { useState } from 'react';
import { ArrowLeft, BookOpen, MessageSquare, Volume2, VolumeX } from 'lucide-react';
import { sound } from '../../lib/audio';
import { QuickChat } from './QuickChat';
import { VoiceChatControls } from './VoiceChatControls';

interface GameToolbarProps {
  onLeave: () => void;
  onSendQuickChat: (msg: string) => void;
  onOpenChat?: () => void;
  unreadChatCount?: number;
  modeTitle?: string;
}

export const GameToolbar: React.FC<GameToolbarProps> = ({
  onLeave,
  onSendQuickChat,
  onOpenChat,
  unreadChatCount = 0,
  modeTitle = 'Royal Arena',
}) => {
  const [isMuted, setIsMuted] = useState(sound.isMuted);
  const [showRules, setShowRules] = useState(false);

  const toggleSound = () => {
    sound.isMuted = !sound.isMuted;
    setIsMuted(sound.isMuted);
    sound.playClick();
  };

  return (
    <>
      <div className="w-full flex items-center justify-between px-2 sm:px-4 py-2 bg-slate-950/80 border-b border-amber-500/20 backdrop-blur-md">
        {/* Left: Back / Surrender */}
        <button
          id="toolbar-leave-btn"
          type="button"
          onClick={onLeave}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 hover:border-rose-500/50 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 text-xs font-semibold transition-all cursor-pointer shadow"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Arena</span>
        </button>

        {/* Center: Mode Title */}
        <div className="text-center font-royal font-bold text-xs sm:text-sm text-amber-300 tracking-wider">
          {modeTitle}
        </div>

        {/* Right: Voice Controls & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Live Voice Chat Controls */}
          <VoiceChatControls />

          {/* In-Game Live Chat Drawer Button */}
          {onOpenChat && (
            <button
              id="toolbar-chat-drawer-btn"
              type="button"
              onClick={() => {
                sound.playClick();
                onOpenChat();
              }}
              className="relative p-2 rounded-full bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-amber-300 transition-all shadow cursor-pointer"
              title="Open Arena Chat and Dispatch"
            >
              <MessageSquare className="w-4 h-4" />
              {unreadChatCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-amber-500 text-slate-950 font-black text-[9px] rounded-full shadow">
                  {unreadChatCount > 9 ? '9+' : unreadChatCount}
                </span>
              )}
            </button>
          )}

          {/* Quick Chat Reaction Picker */}
          <QuickChat onSendMessage={onSendQuickChat} />

          {/* Rules Guide Button */}
          <button
            id="toolbar-rules-btn"
            type="button"
            onClick={() => {
              sound.playClick();
              setShowRules(true);
            }}
            className="p-2 rounded-full bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-amber-300 transition-all shadow cursor-pointer hidden sm:flex items-center justify-center"
            title="Game Rules"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          {/* Game Sound SFX Toggle */}
          <button
            id="toolbar-sound-toggle-btn"
            type="button"
            onClick={toggleSound}
            className="p-2 rounded-full bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-amber-300 transition-all shadow cursor-pointer"
            title={isMuted ? 'Unmute Game SFX' : 'Mute Game SFX'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-amber-300" />}
          </button>
        </div>
      </div>

      {/* Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-royal font-bold text-amber-300">
                Royal Ludo Rules
              </h3>
              <button
                onClick={() => setShowRules(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-300 max-h-80 overflow-y-auto pr-1 leading-relaxed">
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="font-bold text-amber-400">1. Unlocking Tokens:</span> A roll of <strong>6</strong> is required to move a token out of your Base Camp onto the starting cell.
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="font-bold text-amber-400">2. Extra Turns:</span> Rolling a <strong>6</strong>, capturing an opponent, or reaching Home grants an extra roll!
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="font-bold text-amber-400">3. Captures:</span> Landing on a square occupied by an opponent sends their token back to Base Camp (unless on a Safe Zone).
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="font-bold text-amber-400">4. Safe Zones:</span> Cells marked with a <strong>Star ⭐️</strong> or starting <strong>Shield 🛡️</strong> are safe. Tokens cannot be captured there.
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="font-bold text-amber-400">5. Winning:</span> The first monarch to guide all 4 tokens into the central Home Sanctuary is crowned Victor!
              </div>
            </div>

            <button
              onClick={() => setShowRules(false)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 font-bold text-slate-950 hover:brightness-110 transition-all cursor-pointer shadow-lg"
            >
              Understood, My Liege
            </button>
          </div>
        </div>
      )}
    </>
  );
};
