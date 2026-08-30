import React, { useState } from 'react';
import { MessageSquare, Smile, X } from 'lucide-react';
import { sound } from '../../lib/audio';

interface QuickChatProps {
  onSendMessage: (msg: string) => void;
}

const PRESET_PHRASES = [
  'Good luck! 👑',
  'Nice move! 👏',
  'Well played! ⚔️',
  'Oops! 😅',
  "Let's go! 🚀",
  'GG! 🏆',
  'Need a 6! 🎲',
  'Safe zone! 🛡️',
];

const EMOJIS = ['👋', '😂', '😡', '👑', '🔥', '⚔️', '🛡️', '🎲'];

export const QuickChat: React.FC<QuickChatProps> = ({ onSendMessage }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (text: string) => {
    sound.playClick();
    onSendMessage(text);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        id="quick-chat-toggle-btn"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 rounded-full bg-slate-900/90 border border-amber-500/40 text-amber-300 hover:bg-slate-800 hover:text-amber-200 transition-all shadow-lg flex items-center justify-center cursor-pointer"
        title="Quick Chat & Emojis"
      >
        <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      {isOpen && (
        <div className="absolute bottom-12 right-0 w-64 sm:w-72 rounded-2xl bg-slate-950/95 border border-amber-400/50 shadow-2xl p-3 z-50 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
              <Smile className="w-3.5 h-3.5" />
              <span>Royal Reactions</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Emoji Grid */}
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSelect(emoji)}
                className="text-xl p-1.5 rounded-xl bg-slate-900 hover:bg-amber-950/60 hover:scale-115 border border-slate-800 hover:border-amber-400/40 transition-all cursor-pointer flex items-center justify-center"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Predefined Phrases */}
          <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
            {PRESET_PHRASES.map((phrase) => (
              <button
                key={phrase}
                onClick={() => handleSelect(phrase)}
                className="text-left text-[11px] font-semibold text-slate-200 px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-amber-950/70 hover:text-amber-200 border border-slate-800 hover:border-amber-400/30 transition-all truncate cursor-pointer"
              >
                {phrase}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
