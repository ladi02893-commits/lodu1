import { GameSettings, PlayerColor } from './types';

export const SEAT_COLORS: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];

export const COLOR_SEATS: Record<PlayerColor, number> = {
  red: 0,
  green: 1,
  yellow: 2,
  blue: 3,
};

// Starting index on the 52-cell main track for each seat
export const START_TRACK_INDICES: Record<number, number> = {
  0: 0, // Red
  1: 13, // Green
  2: 26, // Yellow
  3: 39, // Blue
};

// Turn-in index on the 52-cell main track into home column
export const HOME_ENTRY_TRACK_INDICES: Record<number, number> = {
  0: 50, // Red turns into home column after index 50
  1: 11, // Green turns into home column after index 11
  2: 24, // Yellow turns into home column after index 24
  3: 37, // Blue turns into home column after index 37
};

// Total progress needed to reach center home
export const TOTAL_PROGRESS_STEPS = 57; // 1 (spawn at start cell) + 50 (track steps) + 5 (home lane) + 1 (center goal)

// 8 Safe Cells on the 52-cell main track
export const DEFAULT_SAFE_CELLS = [0, 8, 13, 21, 26, 34, 39, 47];

export const DEFAULT_GAME_RULES: GameSettings = {
  players: 4,
  tokensPerPlayer: 4,
  unlockValue: 6,
  extraTurnOnSix: true,
  extraTurnOnCapture: true,
  safeCells: DEFAULT_SAFE_CELLS,
  turnDurationSeconds: 30,
  autoPassOnNoMove: true,
};

// Realistic 3D Royal Color Palettes & Textures
export const COLOR_CONFIG = {
  red: {
    name: 'Ruby Dragon',
    primary: '#dc2626',
    secondary: '#991b1b',
    bg: '#450a0a',
    border: '#f87171',
    glow: 'rgba(239, 68, 68, 0.65)',
    light: '#fee2e2',
    accent: '#b91c1c',
    campBg: 'from-red-950 via-rose-950 to-red-900',
    campBorder: 'border-red-500/70',
    cellBg: 'bg-gradient-to-br from-red-500 via-rose-600 to-red-700',
    cellShadow: 'shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),inset_0_-2px_4px_rgba(0,0,0,0.5)]',
    tokenGradient: 'from-rose-400 via-red-600 to-red-900',
  },
  green: {
    name: 'Emerald Citadel',
    primary: '#059669',
    secondary: '#065f46',
    bg: '#022c22',
    border: '#34d399',
    glow: 'rgba(16, 185, 129, 0.65)',
    light: '#d1fae5',
    accent: '#047857',
    campBg: 'from-emerald-950 via-teal-950 to-emerald-900',
    campBorder: 'border-emerald-500/70',
    cellBg: 'bg-gradient-to-br from-emerald-500 via-green-600 to-emerald-700',
    cellShadow: 'shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),inset_0_-2px_4px_rgba(0,0,0,0.5)]',
    tokenGradient: 'from-emerald-300 via-emerald-600 to-emerald-900',
  },
  yellow: {
    name: 'Imperial Sun',
    primary: '#d97706',
    secondary: '#92400e',
    bg: '#451a03',
    border: '#fbbf24',
    glow: 'rgba(245, 158, 11, 0.65)',
    light: '#fef3c7',
    accent: '#b45309',
    campBg: 'from-amber-950 via-yellow-950 to-amber-900',
    campBorder: 'border-amber-400/80',
    cellBg: 'bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600',
    cellShadow: 'shadow-[inset_0_2px_4px_rgba(255,255,255,0.7),inset_0_-2px_4px_rgba(0,0,0,0.45)]',
    tokenGradient: 'from-yellow-200 via-amber-400 to-amber-700',
  },
  blue: {
    name: 'Sapphire Monarch',
    primary: '#2563eb',
    secondary: '#1e40af',
    bg: '#172554',
    border: '#60a5fa',
    glow: 'rgba(59, 130, 246, 0.65)',
    light: '#dbeafe',
    accent: '#1d4ed8',
    campBg: 'from-blue-950 via-indigo-950 to-blue-900',
    campBorder: 'border-blue-500/70',
    cellBg: 'bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-700',
    cellShadow: 'shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),inset_0_-2px_4px_rgba(0,0,0,0.5)]',
    tokenGradient: 'from-sky-300 via-blue-600 to-indigo-900',
  },
};
