import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile, Sparkles, X } from 'lucide-react';
import { sound } from '../../lib/audio';

interface EmojiReactionPickerProps {
  onSendReaction: (emoji: string) => void;
  disabled?: boolean;
}

export const REACTION_EMOJIS = [
  { emoji: '👋', label: 'Wave / Hello' },
  { emoji: '😂', label: 'Laugh / Haha' },
  { emoji: '😡', label: 'Angry / Rage' },
  { emoji: '👑', label: 'Royal Crown' },
  { emoji: '🔥', label: 'Fire / On streak' },
  { emoji: '😱', label: 'Shocked / OMG' },
  { emoji: '🎲', label: 'Need a 6' },
  { emoji: '😎', label: 'Cool / Confident' },
  { emoji: '😭', label: 'Cry / Unlucky' },
  { emoji: '⚔️', label: 'Attack / Duel' },
  { emoji: '🛡️', label: 'Safe Zone' },
  { emoji: '👏', label: 'Applause' },
];

export const EmojiReactionPicker: React.FC<EmojiReactionPickerProps> = ({
  onSendReaction,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectEmoji = (emoji: string) => {
    sound.playClick();
    onSendReaction(emoji);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Trigger Button */}
      <button
        id="emoji-reaction-trigger-btn"
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-1.5 px-3 py-2 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer shadow-lg
          ${
            isOpen
              ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 ring-2 ring-amber-300 shadow-amber-500/40 scale-105'
              : 'bg-slate-900/90 hover:bg-slate-800 border border-amber-500/40 text-amber-300 hover:text-amber-200 hover:border-amber-400'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        title="React with Emoji"
      >
        <Smile className="w-4 h-4 text-amber-400 animate-bounce" />
        <span className="hidden sm:inline">React</span>
        <span className="text-base leading-none">✨</span>
      </button>

      {/* Floating Popup Picker */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 10 }}
            transition={{ type: 'spring', damping: 20, stiffness: 350 }}
            className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-50 w-64 sm:w-72 bg-gradient-to-b from-slate-900/98 via-slate-900/95 to-amber-950/90 border-2 border-amber-400/70 rounded-2xl p-3 shadow-[0_15px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl text-white"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-500/20">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-black text-amber-200 uppercase tracking-wider">
                  Express Emotion
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-0.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Grid of Emojis */}
            <div className="grid grid-cols-4 gap-2">
              {REACTION_EMOJIS.map(({ emoji, label }) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleSelectEmoji(emoji)}
                  title={label}
                  className="group relative flex flex-col items-center justify-center p-2 rounded-xl bg-slate-950/60 hover:bg-amber-500/20 border border-slate-800 hover:border-amber-400/60 transition-all duration-150 transform hover:scale-120 active:scale-90 cursor-pointer"
                >
                  <span className="text-2xl filter drop-shadow group-hover:animate-wiggle select-none">
                    {emoji}
                  </span>
                </button>
              ))}
            </div>

            {/* Hint footer */}
            <p className="text-[10px] text-center text-slate-400 mt-2 font-medium">
              Floating reaction appears above your avatar!
            </p>

            {/* Downward pointer triangle */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-900 border-r-2 border-b-2 border-amber-400/70 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
