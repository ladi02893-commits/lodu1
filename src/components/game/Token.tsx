import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Sparkles } from 'lucide-react';
import { COLOR_CONFIG } from '../../lib/ludo/constants';
import { PlayerColor } from '../../lib/ludo/types';

interface TokenProps {
  id: number;
  color: PlayerColor;
  isMovable: boolean;
  isHome?: boolean;
  stackCount?: number;
  onClick?: () => void;
}

export const Token: React.FC<TokenProps> = ({
  id,
  color,
  isMovable,
  isHome,
  stackCount = 1,
  onClick,
}) => {
  const config = COLOR_CONFIG[color];

  // Token in Goal / Home state
  if (isHome) {
    return (
      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 border-2 border-white flex items-center justify-center shadow-[0_2px_8px_rgba(245,158,11,0.9)] animate-pulse">
        <Crown className="w-3 h-3 text-slate-950 fill-slate-950" />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center">
      {/* 3D Dynamic Radial Ground Shadow */}
      <motion.div
        animate={
          isMovable
            ? {
                scale: [1, 0.65, 1.15, 0.75, 1],
                opacity: [0.8, 0.4, 0.9, 0.5, 0.8],
              }
            : { scale: 1, opacity: 0.6 }
        }
        transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
        className="absolute -bottom-1 w-6 h-2 sm:w-7 sm:h-2.5 rounded-full bg-slate-950/90 blur-[1px] pointer-events-none z-10"
      />

      {/* 3D Realistic Sculpted Royal Pawn */}
      <motion.button
        id={`token-${color}-${id}`}
        type="button"
        onClick={isMovable ? onClick : undefined}
        disabled={!isMovable && !onClick}
        animate={
          isMovable
            ? {
                y: [0, -12, 0],
                scale: [1, 1.12, 1],
              }
            : {
                y: 0,
                scale: 1,
              }
        }
        transition={
          isMovable
            ? {
                repeat: Infinity,
                duration: 1.4,
                ease: 'easeInOut',
              }
            : { duration: 0.2 }
        }
        className={`
          relative w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-full flex flex-col items-center justify-center
          bg-gradient-to-b ${config.tokenGradient}
          border-2 border-amber-300/90
          select-none cursor-pointer z-30 transition-transform
          ${
            isMovable
              ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 scale-110 shadow-[0_0_22px_rgba(245,158,11,0.95)] hover:scale-125 active:scale-95'
              : 'hover:scale-105 cursor-default'
          }
        `}
        style={{
          boxShadow: isMovable
            ? `0 0 24px ${config.primary}, 0 6px 14px rgba(0,0,0,0.85), inset 0 2px 4px rgba(255,255,255,0.7), inset 0 -3px 5px rgba(0,0,0,0.5)`
            : '0 4px 10px rgba(0,0,0,0.75), inset 0 2px 3px rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.4)',
        }}
      >
        {/* 3D Glass Specular Reflection Highlight */}
        <div className="absolute top-0.5 left-1 w-3 h-1.5 rounded-full bg-white/60 blur-[0.4px] pointer-events-none" />

        {/* 3D Pawn Gem / Crown Core */}
        <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-slate-950/40 border border-amber-300/60 flex items-center justify-center shadow-inner">
          <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
        </div>

        {/* Movable Pulsing Beacon */}
        {isMovable && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 border border-white flex items-center justify-center shadow-md animate-ping">
            <Sparkles className="w-2 h-2 text-slate-950" />
          </span>
        )}

        {/* Multi-Token Stack Count Indicator Badge */}
        {stackCount > 1 && (
          <span className="absolute -bottom-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-slate-950 border border-amber-400 text-[9px] font-black text-amber-300 flex items-center justify-center shadow-lg">
            +{stackCount}
          </span>
        )}
      </motion.button>
    </div>
  );
};

