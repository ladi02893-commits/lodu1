import React from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Crown, Star } from 'lucide-react';
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
  // Goal Center Victory Pyramid (Row 6..8, Col 6..8)
  if (isGoal) {
    return (
      <div
        id={`cell-${row}-${col}`}
        className="w-full h-full relative overflow-hidden bg-slate-950 border border-amber-500/60 shadow-[inset_0_0_12px_rgba(0,0,0,0.9)]"
      >
        {/* 4 Realistic 3D Center Color Triangles */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          {/* Top-Left Red Triangle */}
          <div className="bg-gradient-to-br from-red-600 via-rose-600 to-red-900 border-r border-b border-amber-400/40 relative shadow-inner" />
          {/* Top-Right Green Triangle */}
          <div className="bg-gradient-to-bl from-emerald-500 via-teal-600 to-emerald-900 border-l border-b border-amber-400/40 relative shadow-inner" />
          {/* Bottom-Left Blue Triangle */}
          <div className="bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-900 border-r border-t border-amber-400/40 relative shadow-inner" />
          {/* Bottom-Right Yellow Triangle */}
          <div className="bg-gradient-to-tl from-amber-400 via-yellow-500 to-amber-800 border-l border-t border-amber-400/40 relative shadow-inner" />
        </div>

        {/* Central Imperial Sunburst Crown Medallion */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-600 border-2 border-white flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,1)] animate-pulse">
            <Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-950 fill-slate-950 drop-shadow" />
          </div>
        </div>
      </div>
    );
  }

  // Home Path column cells (Polished 3D Colored Gemstone Lane)
  if (homeColor) {
    const config = COLOR_CONFIG[homeColor];
    return (
      <div
        id={`cell-${row}-${col}`}
        onClick={onClick}
        className={`w-full h-full relative flex items-center justify-center border border-amber-300/40 select-none ${config.cellBg} ${config.cellShadow}`}
      >
        {/* Directional 3D Arrow at the entrance of Home Lane */}
        {homeColor === 'red' && col === 1 && (
          <ArrowRight className="w-3.5 h-3.5 text-white stroke-[3] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
        )}
        {homeColor === 'green' && row === 1 && (
          <ArrowDown className="w-3.5 h-3.5 text-white stroke-[3] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
        )}
        {homeColor === 'yellow' && col === 13 && (
          <ArrowLeft className="w-3.5 h-3.5 text-white stroke-[3] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
        )}
        {homeColor === 'blue' && row === 13 && (
          <ArrowUp className="w-3.5 h-3.5 text-white stroke-[3] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
        )}

        {/* Subtle center jewel pip on inner home cells */}
        {((homeColor === 'red' && col > 1) ||
          (homeColor === 'green' && row > 1) ||
          (homeColor === 'yellow' && col < 13) ||
          (homeColor === 'blue' && row < 13)) && (
          <div className="w-1.5 h-1.5 rounded-full bg-white/70 shadow-sm pointer-events-none" />
        )}
      </div>
    );
  }

  // Starting cell on the outer track
  if (startColor) {
    const config = COLOR_CONFIG[startColor];
    return (
      <div
        id={`cell-${row}-${col}`}
        onClick={onClick}
        className={`w-full h-full relative flex items-center justify-center border border-amber-300/60 select-none ${config.cellBg} ${config.cellShadow}`}
      >
        {/* Entry Arrow */}
        {startColor === 'red' && (
          <ArrowRight className="w-3.5 h-3.5 text-white stroke-[3] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]" />
        )}
        {startColor === 'green' && (
          <ArrowDown className="w-3.5 h-3.5 text-white stroke-[3] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]" />
        )}
        {startColor === 'yellow' && (
          <ArrowLeft className="w-3.5 h-3.5 text-white stroke-[3] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]" />
        )}
        {startColor === 'blue' && (
          <ArrowUp className="w-3.5 h-3.5 text-white stroke-[3] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]" />
        )}
      </div>
    );
  }

  // 3D Safe Haven Star cell
  if (isSafe && safeType === 'star') {
    return (
      <div
        id={`cell-${row}-${col}`}
        onClick={onClick}
        className="w-full h-full relative flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-amber-100 border border-amber-400/70 shadow-[inset_0_1px_3px_rgba(255,255,255,0.9),inset_0_-1px_3px_rgba(0,0,0,0.15)]"
      >
        <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full bg-amber-400/20 flex items-center justify-center border border-amber-400/40">
          <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-400 drop-shadow-[0_1px_2px_rgba(217,119,6,0.5)]" />
        </div>
      </div>
    );
  }

  // Standard regular path cell (Realistic 3D Ivory Marble Tile)
  return (
    <div
      id={`cell-${row}-${col}`}
      onClick={onClick}
      className="w-full h-full relative flex items-center justify-center bg-gradient-to-b from-amber-50/90 via-slate-100 to-amber-100/80 border border-slate-300/80 hover:bg-amber-100/90 transition-colors shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.9),inset_0_-1px_2px_rgba(0,0,0,0.12)]"
    >
      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shadow-inner" />
    </div>
  );
};
