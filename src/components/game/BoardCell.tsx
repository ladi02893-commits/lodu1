import React from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Shield, Sparkles, Star } from 'lucide-react';
import { COLOR_CONFIG } from '../../lib/ludo/constants';
import { PlayerColor } from '../../lib/ludo/types';

interface BoardCellProps {
  row: number;
  col: number;
  isSafe?: boolean;
  safeType?: 'star' | 'start';
  startColor?: PlayerColor;
  homeColor?: PlayerColor;
  isGoal?: boolean;
  onClick?: () => void;
}

export const BoardCell: React.FC<BoardCellProps> = ({
  row,
  col,
  isSafe,
  safeType,
  startColor,
  homeColor,
  isGoal,
  onClick,
}) => {
  // Goal Center Victory Cell (Row 6..8, Col 6..8)
  if (isGoal) {
    return (
      <div
        id={`cell-${row}-${col}`}
        className="w-full h-full relative flex items-center justify-center bg-slate-950 overflow-hidden shadow-inner border border-amber-400/50"
      >
        {/* Four colored triangles meeting precisely at center */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          {/* Top-Left Red Triangle */}
          <div className="bg-gradient-to-br from-red-600 via-rose-700 to-red-900 border-b border-r border-amber-400/60 relative overflow-hidden shadow-inner">
            <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-red-400/40" />
          </div>
          {/* Top-Right Green Triangle */}
          <div className="bg-gradient-to-bl from-emerald-500 via-emerald-700 to-green-950 border-b border-l border-amber-400/60 relative overflow-hidden shadow-inner">
            <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400/40" />
          </div>
          {/* Bottom-Left Blue Triangle */}
          <div className="bg-gradient-to-tr from-blue-600 via-indigo-700 to-blue-950 border-t border-r border-amber-400/60 relative overflow-hidden shadow-inner">
            <div className="absolute bottom-1 left-1 w-2 h-2 rounded-full bg-blue-400/40" />
          </div>
          {/* Bottom-Right Yellow Triangle */}
          <div className="bg-gradient-to-tl from-amber-400 via-yellow-600 to-amber-900 border-t border-l border-amber-400/60 relative overflow-hidden shadow-inner">
            <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-yellow-300/40" />
          </div>
        </div>

        {/* Central Crown Gem Medal */}
        <div className="relative z-10 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 border-2 border-amber-100 flex items-center justify-center shadow-[0_0_18px_rgba(245,158,11,0.9)] animate-pulse">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-950/90 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 animate-spin" style={{ animationDuration: '8s' }} />
          </div>
        </div>
      </div>
    );
  }

  // Home Path column cells (The glowing royal carpet leading directly to goal)
  if (homeColor) {
    const config = COLOR_CONFIG[homeColor];
    return (
      <div
        id={`cell-${row}-${col}`}
        onClick={onClick}
        className="w-full h-full relative flex items-center justify-center border border-amber-400/30 transition-all duration-200 shadow-inner overflow-hidden"
        style={{
          backgroundColor: `${config.primary}35`,
        }}
      >
        {/* Subtle home path directional chevron arrow */}
        {homeColor === 'red' && <ChevronRight className="w-3.5 h-3.5 opacity-60" style={{ color: config.primary }} />}
        {homeColor === 'green' && <ChevronDown className="w-3.5 h-3.5 opacity-60" style={{ color: config.primary }} />}
        {homeColor === 'yellow' && <ChevronLeft className="w-3.5 h-3.5 opacity-60" style={{ color: config.primary }} />}
        {homeColor === 'blue' && <ChevronUp className="w-3.5 h-3.5 opacity-60" style={{ color: config.primary }} />}

        <div
          className="absolute inset-0 opacity-15"
          style={{ backgroundColor: config.primary }}
        />
      </div>
    );
  }

  // Starting cell with Shield Emblazoned Crest
  if (startColor) {
    const config = COLOR_CONFIG[startColor];
    return (
      <div
        id={`cell-${row}-${col}`}
        onClick={onClick}
        className="w-full h-full relative flex items-center justify-center border border-amber-400/60 transition-all duration-200 shadow-inner"
        style={{
          backgroundColor: `${config.primary}40`,
        }}
      >
        <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 filter drop-shadow" style={{ color: config.primary }} />
        <span
          className="absolute inset-0 opacity-25"
          style={{ backgroundColor: config.primary }}
        />
      </div>
    );
  }

  // Star safe haven cell
  if (isSafe && safeType === 'star') {
    return (
      <div
        id={`cell-${row}-${col}`}
        onClick={onClick}
        className="w-full h-full relative flex items-center justify-center bg-gradient-to-br from-amber-950/60 via-slate-900 to-amber-950/60 border border-amber-400/60 transition-all duration-200 group"
      >
        <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 fill-amber-400/70 drop-shadow-[0_0_6px_rgba(245,158,11,0.6)] group-hover:scale-110 transition-transform" />
      </div>
    );
  }

  // Standard regular path cell (Engraved stone tile appearance)
  return (
    <div
      id={`cell-${row}-${col}`}
      onClick={onClick}
      className="w-full h-full relative flex items-center justify-center bg-slate-900/80 border border-slate-800/90 hover:bg-slate-800/80 transition-colors duration-150 shadow-inner"
    >
      <div className="w-1.5 h-1.5 rounded-full bg-slate-700/50" />
    </div>
  );
};
