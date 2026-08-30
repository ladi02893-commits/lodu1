import React from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Star } from 'lucide-react';
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
        className="w-full h-full relative overflow-hidden bg-slate-950 border border-slate-700 shadow-inner"
      >
        {/* Four colored triangles meeting precisely at center */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          {/* Top-Left Red Triangle */}
          <div className="bg-gradient-to-br from-red-500 to-rose-600 border-r border-b border-slate-900/40 relative" />
          {/* Top-Right Green Triangle */}
          <div className="bg-gradient-to-bl from-emerald-500 to-green-600 border-l border-b border-slate-900/40 relative" />
          {/* Bottom-Left Blue Triangle */}
          <div className="bg-gradient-to-tr from-sky-500 to-blue-600 border-r border-t border-slate-900/40 relative" />
          {/* Bottom-Right Yellow Triangle */}
          <div className="bg-gradient-to-tl from-amber-400 to-yellow-500 border-l border-t border-slate-900/40 relative" />
        </div>

        {/* Central Victory Gem Badge */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-300 border-2 border-white flex items-center justify-center shadow-lg animate-pulse">
            <Star className="w-3 h-3 text-slate-950 fill-slate-950" />
          </div>
        </div>
      </div>
    );
  }

  // Home Path column cells (Solid vibrant colored path)
  if (homeColor) {
    const config = COLOR_CONFIG[homeColor];
    return (
      <div
        id={`cell-${row}-${col}`}
        onClick={onClick}
        className="w-full h-full relative flex items-center justify-center border border-slate-300/40 shadow-inner"
        style={{
          backgroundColor: config.primary,
        }}
      >
        {/* Directional arrow at start of home column */}
        {homeColor === 'red' && col === 1 && <ArrowRight className="w-3 h-3 text-white stroke-[3]" />}
        {homeColor === 'green' && row === 1 && <ArrowDown className="w-3 h-3 text-white stroke-[3]" />}
        {homeColor === 'yellow' && col === 13 && <ArrowLeft className="w-3 h-3 text-white stroke-[3]" />}
        {homeColor === 'blue' && row === 13 && <ArrowUp className="w-3 h-3 text-white stroke-[3]" />}
      </div>
    );
  }

  // Starting cell with Color & Entry Arrow
  if (startColor) {
    const config = COLOR_CONFIG[startColor];
    return (
      <div
        id={`cell-${row}-${col}`}
        onClick={onClick}
        className="w-full h-full relative flex items-center justify-center border border-slate-300/60 shadow-inner"
        style={{
          backgroundColor: config.primary,
        }}
      >
        {/* Entry Arrow to the track */}
        {startColor === 'red' && <ArrowRight className="w-3.5 h-3.5 text-white stroke-[3] drop-shadow" />}
        {startColor === 'green' && <ArrowDown className="w-3.5 h-3.5 text-white stroke-[3] drop-shadow" />}
        {startColor === 'yellow' && <ArrowLeft className="w-3.5 h-3.5 text-white stroke-[3] drop-shadow" />}
        {startColor === 'blue' && <ArrowUp className="w-3.5 h-3.5 text-white stroke-[3] drop-shadow" />}
      </div>
    );
  }

  // Star safe haven cell
  if (isSafe && safeType === 'star') {
    return (
      <div
        id={`cell-${row}-${col}`}
        onClick={onClick}
        className="w-full h-full relative flex items-center justify-center bg-white border border-slate-300 shadow-sm"
      >
        <Star className="w-4 h-4 text-slate-800 fill-slate-300 stroke-[1.5]" />
      </div>
    );
  }

  // Standard regular path cell (Clean White Tile like Ludo Club / Star)
  return (
    <div
      id={`cell-${row}-${col}`}
      onClick={onClick}
      className="w-full h-full relative flex items-center justify-center bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
    >
      <div className="w-1 h-1 rounded-full bg-slate-200" />
    </div>
  );
};

