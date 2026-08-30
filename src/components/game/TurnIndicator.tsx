import React from 'react';
import { Crown, Sparkles, Swords, Zap } from 'lucide-react';
import { COLOR_CONFIG } from '../../lib/ludo/constants';
import { GameState } from '../../lib/ludo/types';

interface TurnIndicatorProps {
  gameState: GameState;
  currentUserPlayerSeat?: number;
}

export const TurnIndicator: React.FC<TurnIndicatorProps> = ({
  gameState,
  currentUserPlayerSeat,
}) => {
  const { turn, players, dice, lastAction } = gameState;
  const currentSeat = turn.currentSeat;
  const currentPlayer = players.find((p) => p.seat === currentSeat);
  if (!currentPlayer) return null;

  const config = COLOR_CONFIG[currentPlayer.color];
  const isMyTurn = currentUserPlayerSeat === undefined || currentUserPlayerSeat === currentSeat;

  return (
    <div className="w-full flex flex-col items-center gap-1.5 my-1">
      {/* Primary Turn Banner */}
      <div
        className={`
          px-4 py-1.5 rounded-full border flex items-center gap-2 backdrop-blur-md shadow-lg transition-all duration-300
          ${isMyTurn ? 'bg-amber-950/80 border-amber-400 ring-2 ring-amber-400/40 text-amber-200' : 'bg-slate-900/80 border-slate-700 text-slate-300'}
        `}
      >
        <Crown className="w-4 h-4" style={{ color: config.primary }} />
        <span className="text-xs sm:text-sm font-bold tracking-wide">
          {isMyTurn ? (
            <span className="text-amber-300">Your Turn! ({config.name})</span>
          ) : (
            <span>{currentPlayer.username}&apos;s Turn</span>
          )}
        </span>

        {dice.value !== null && (
          <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-950 text-amber-400 text-xs font-black border border-amber-500/30">
            Rolled: {dice.value}
          </span>
        )}

        {turn.extraTurn && (
          <span className="flex items-center gap-1 text-[11px] font-extrabold text-amber-400 bg-amber-900/60 px-2 py-0.5 rounded-full border border-amber-400/40 animate-pulse">
            <Zap className="w-3 h-3 text-amber-300" /> EXTRA ROLL!
          </span>
        )}
      </div>

      {/* Action Notification message */}
      {lastAction?.message && (
        <div className="text-[11px] font-medium text-amber-300/90 flex items-center gap-1.5 bg-slate-950/70 px-3 py-0.5 rounded-full border border-amber-500/20 animate-fade-in">
          {lastAction.capturedSeat !== undefined ? (
            <Swords className="w-3 h-3 text-rose-400" />
          ) : (
            <Sparkles className="w-3 h-3 text-amber-400" />
          )}
          <span>{lastAction.message}</span>
        </div>
      )}
    </div>
  );
};
