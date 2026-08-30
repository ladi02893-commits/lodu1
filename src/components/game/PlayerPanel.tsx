import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Crown, Mic, MicOff, MessageSquare, Shield, Swords, UserPlus, UserCheck, WifiOff } from 'lucide-react';
import { COLOR_CONFIG } from '../../lib/ludo/constants';
import { PlayerState } from '../../lib/ludo/types';

interface PlayerPanelProps {
  player: PlayerState;
  isCurrentTurn: boolean;
  timeLeftSeconds?: number;
  totalTurnDuration?: number;
  rank?: number;
  activeReaction?: string | null;
  isSpeaking?: boolean;
  isMicMuted?: boolean;
  activeChatBubble?: { text: string; imageUrl?: string; expiresAt?: number } | null;
  onSelectPlayer?: (player: PlayerState) => void;
}

export const PlayerPanel: React.FC<PlayerPanelProps> = ({
  player,
  isCurrentTurn,
  timeLeftSeconds = 30,
  totalTurnDuration = 30,
  rank,
  activeReaction,
  isSpeaking = false,
  isMicMuted = true,
  activeChatBubble,
  onSelectPlayer,
}) => {
  const config = COLOR_CONFIG[player.color];
  const progressRatio = Math.max(0, Math.min(1, timeLeftSeconds / totalTurnDuration));

  const renderAvatar = () => {
    if (player.isBot) {
      return <Bot className="w-6 h-6 text-amber-300" />;
    }
    return <Crown className="w-6 h-6 text-amber-200" />;
  };

  return (
    <div
      id={`player-panel-${player.seat}`}
      onClick={() => onSelectPlayer?.(player)}
      className={`
        relative p-2 sm:p-2.5 rounded-2xl border transition-all duration-300
        bg-slate-900/90 backdrop-blur-md flex items-center gap-2 sm:gap-3 cursor-pointer
        ${
          isSpeaking
            ? 'border-emerald-400 ring-2 ring-emerald-400/60 shadow-lg shadow-emerald-500/20 scale-[1.02]'
            : isCurrentTurn
            ? 'border-amber-400 ring-2 ring-amber-400/50 shadow-lg shadow-amber-500/20 scale-[1.02]'
            : 'border-slate-800/80 hover:border-amber-500/40 opacity-95'
        }
      `}
      style={{
        borderLeftColor: config.primary,
        borderLeftWidth: '5px',
      }}
    >
      {/* 10-Second Active In-Game Chat Speech Bubble */}
      <AnimatePresence>
        {activeChatBubble && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: -46 }}
            exit={{ opacity: 0, scale: 0.7, y: -55 }}
            transition={{ type: 'spring', damping: 14, stiffness: 260 }}
            className="absolute -top-1 left-2 sm:left-4 z-50 pointer-events-none max-w-[220px]"
          >
            <div className="bg-slate-950/95 border-2 border-amber-400 rounded-2xl p-2 shadow-[0_8px_24px_rgba(0,0,0,0.9)] flex flex-col gap-1 backdrop-blur-md">
              <div className="flex items-center gap-1.5 min-w-0">
                <MessageSquare className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                {activeChatBubble.imageUrl && (
                  <img
                    src={activeChatBubble.imageUrl}
                    alt="Chat attachment"
                    className="w-7 h-7 rounded object-cover flex-shrink-0 border border-amber-500/40 shadow"
                  />
                )}
                <span className="text-[11px] font-bold text-slate-100 truncate leading-snug">
                  {activeChatBubble.text || 'Shared photo'}
                </span>
              </div>

              {/* 10s Countdown Progress Bar */}
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 10, ease: 'linear' }}
                  className="h-full bg-gradient-to-r from-amber-400 to-yellow-300"
                />
              </div>
            </div>
            {/* Speech Bubble Arrow Tail */}
            <div className="w-3 h-3 bg-slate-950 border-r-2 border-b-2 border-amber-400 rotate-45 ml-5 -mt-1.5 shadow" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D Floating & Bouncing Emoji Reaction Popups */}
      <AnimatePresence>
        {activeReaction && (
          <motion.div
            key={activeReaction + '-' + Date.now()}
            initial={{ opacity: 0, scale: 0.2, y: 20 }}
            animate={{
              opacity: [0, 1, 1, 0.95, 0],
              scale: [0.4, 1.45, 1.2, 1.35, 0.8],
              y: [0, -38, -50, -62, -75],
              rotate: [0, -8, 8, -4, 0],
            }}
            transition={{
              duration: 3.2,
              times: [0, 0.15, 0.45, 0.8, 1],
              ease: 'easeOut',
            }}
            className="absolute -top-3 left-4 sm:left-5 z-40 pointer-events-none filter drop-shadow-[0_6px_16px_rgba(0,0,0,0.9)]"
          >
            <div className="relative flex flex-col items-center">
              <div className="bg-slate-950/95 border-2 border-amber-400 rounded-full px-3 py-1 text-2xl sm:text-3xl shadow-2xl flex items-center justify-center">
                {activeReaction}
              </div>
              <div className="w-2.5 h-2.5 bg-slate-950 border-r-2 border-b-2 border-amber-400 rotate-45 -mt-1" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar with Circular Countdown Ring & Speaking Glow */}
      <div className="relative w-11 h-11 sm:w-12 sm:h-12 flex-shrink-0 flex items-center justify-center">
        {/* Speaking Pulsing Ring */}
        {isSpeaking && (
          <span className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-75 pointer-events-none" />
        )}

        {isCurrentTurn && (
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="24"
              cy="24"
              r="21"
              className="stroke-slate-800"
              strokeWidth="3"
              fill="none"
            />
            <circle
              cx="24"
              cy="24"
              r="21"
              className="stroke-amber-400 transition-all duration-1000 ease-linear"
              strokeWidth="3"
              strokeDasharray={132}
              strokeDashoffset={132 * (1 - progressRatio)}
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        )}

        <div
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border shadow-inner transition-all ${
            isSpeaking ? 'border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'border-amber-300/40'
          }`}
          style={{ backgroundColor: `${config.primary}33` }}
        >
          {renderAvatar()}
        </div>

        {/* Finished Rank Trophy Badge */}
        {rank !== undefined && rank > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-[10px] font-black text-slate-950 shadow">
            #{rank}
          </span>
        )}

        {/* Voice Speaking / Mute Status Indicator Icon */}
        <span
          className={`absolute -bottom-1 -left-1 p-0.5 rounded-full border border-slate-950 text-[9px] shadow ${
            isSpeaking
              ? 'bg-emerald-500 text-slate-950 animate-bounce'
              : isMicMuted
              ? 'bg-slate-800 text-slate-500'
              : 'bg-amber-500 text-slate-950'
          }`}
          title={isSpeaking ? 'Speaking Live' : isMicMuted ? 'Mic Muted' : 'Mic Active'}
        >
          {isSpeaking ? (
            <Mic className="w-2.5 h-2.5" />
          ) : isMicMuted ? (
            <MicOff className="w-2.5 h-2.5" />
          ) : (
            <Mic className="w-2.5 h-2.5" />
          )}
        </span>

        {/* Offline indicator */}
        {!player.connected && (
          <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-rose-600 text-white" title="Disconnected">
            <WifiOff className="w-2.5 h-2.5" />
          </span>
        )}
      </div>

      {/* Info & Stats */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-xs sm:text-sm text-slate-100 truncate">
            {player.username}
          </span>
          {player.isBot && (
            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-purple-900/60 text-purple-300 border border-purple-500/30 uppercase">
              {player.botDifficulty || 'AI'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
          <div className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-amber-400" />
            <span className="font-medium text-amber-300">
              {player.tokensFinished}/4 Home
            </span>
          </div>

          {player.captures > 0 && (
            <div className="flex items-center gap-1 text-rose-400">
              <Swords className="w-3 h-3" />
              <span>{player.captures}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
