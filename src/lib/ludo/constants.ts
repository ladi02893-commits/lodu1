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
  0: 0,   // Red
  1: 13,  // Green
  2: 26,  // Yellow
  3: 39,  // Blue
};

// Turn-in index on the 52-cell main track into home column
// When a player has moved 50 steps from start, their next step enters their home path.
export const HOME_ENTRY_TRACK_INDICES: Record<number, number> = {
  0: 50,  // Red turns into home column after index 50
  1: 11,  // Green turns into home column after index 11
  2: 24,  // Yellow turns into home column after index 24
  3: 37,  // Blue turns into home column after index 37
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

// Theme Color Palettes (Original Royal Aesthetic)
export const COLOR_CONFIG = {
  red: {
    name: 'Ruby Red',
    primary: '#ef4444',
    secondary: '#b91c1c',
    bg: '#450a0a',
    border: '#f87171',
    glow: 'rgba(239, 68, 68, 0.4)',
    light: '#fee2e2',
    accent: '#dc2626',
    campBg: 'from-red-950/80 to-red-900/60',
    campBorder: 'border-red-600/50',
    tokenGradient: 'from-rose-500 via-red-600 to-red-800',
  },
  green: {
    name: 'Emerald Green',
    primary: '#10b981',
    secondary: '#047857',
    bg: '#022c22',
    border: '#34d399',
    glow: 'rgba(16, 185, 129, 0.4)',
    light: '#d1fae5',
    accent: '#059669',
    campBg: 'from-emerald-950/80 to-emerald-900/60',
    campBorder: 'border-emerald-600/50',
    tokenGradient: 'from-emerald-400 via-emerald-600 to-emerald-800',
  },
  yellow: {
    name: 'Imperial Gold',
    primary: '#eab308',
    secondary: '#a16207',
    bg: '#422006',
    border: '#fde047',
    glow: 'rgba(234, 179, 8, 0.4)',
    light: '#fef9c3',
    accent: '#ca8a04',
    campBg: 'from-amber-950/80 to-yellow-900/60',
    campBorder: 'border-amber-500/50',
    tokenGradient: 'from-amber-300 via-yellow-500 to-amber-700',
  },
  blue: {
    name: 'Sapphire Blue',
    primary: '#3b82f6',
    secondary: '#1d4ed8',
    bg: '#172554',
    border: '#60a5fa',
    glow: 'rgba(59, 130, 246, 0.4)',
    light: '#dbeafe',
    accent: '#2563eb',
    campBg: 'from-blue-950/80 to-blue-900/60',
    campBorder: 'border-blue-600/50',
    tokenGradient: 'from-sky-400 via-blue-600 to-blue-800',
  },
};
