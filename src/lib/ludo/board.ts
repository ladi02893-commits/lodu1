import { START_TRACK_INDICES, TOTAL_PROGRESS_STEPS } from './constants';
import { PlayerColor } from './types';

export interface GridCoord {
  row: number;
  col: number;
}

// 52 track coordinate points on a 15x15 board (0..14 row, 0..14 col)
export const TRACK_COORDINATES: GridCoord[] = [
  // 0..4 (Red starting arm moving right)
  { row: 6, col: 1 },  // 0: Red Start
  { row: 6, col: 2 },  // 1
  { row: 6, col: 3 },  // 2
  { row: 6, col: 4 },  // 3
  { row: 6, col: 5 },  // 4
  // 5..10 (Moving up to top arm)
  { row: 5, col: 6 },  // 5
  { row: 4, col: 6 },  // 6
  { row: 3, col: 6 },  // 7
  { row: 2, col: 6 },  // 8: Safe Star
  { row: 1, col: 6 },  // 9
  { row: 0, col: 6 },  // 10
  // 11..12 (Top turn)
  { row: 0, col: 7 },  // 11
  { row: 0, col: 8 },  // 12
  // 13..17 (Moving down Green arm)
  { row: 1, col: 8 },  // 13: Green Start
  { row: 2, col: 8 },  // 14
  { row: 3, col: 8 },  // 15
  { row: 4, col: 8 },  // 16
  { row: 5, col: 8 },  // 17
  // 18..23 (Moving right on top of right arm)
  { row: 6, col: 9 },  // 18
  { row: 6, col: 10 }, // 19
  { row: 6, col: 11 }, // 20
  { row: 6, col: 12 }, // 21: Safe Star
  { row: 6, col: 13 }, // 22
  { row: 6, col: 14 }, // 23
  // 24..25 (Right turn)
  { row: 7, col: 14 }, // 24
  { row: 8, col: 14 }, // 25
  // 26..30 (Moving left under right arm)
  { row: 8, col: 13 }, // 26: Yellow Start
  { row: 8, col: 12 }, // 27
  { row: 8, col: 11 }, // 28
  { row: 8, col: 10 }, // 29
  { row: 8, col: 9 },  // 30
  // 31..36 (Moving down on right of bottom arm)
  { row: 9, col: 8 },  // 31
  { row: 10, col: 8 }, // 32
  { row: 11, col: 8 }, // 33
  { row: 12, col: 8 }, // 34: Safe Star
  { row: 13, col: 8 }, // 35
  { row: 14, col: 8 }, // 36
  // 37..38 (Bottom turn)
  { row: 14, col: 7 }, // 37
  { row: 14, col: 6 }, // 38
  // 39..43 (Moving up on left of bottom arm)
  { row: 13, col: 6 }, // 39: Blue Start
  { row: 12, col: 6 }, // 40
  { row: 11, col: 6 }, // 41
  { row: 10, col: 6 }, // 42
  { row: 9, col: 6 },  // 43
  // 44..49 (Moving left under left arm)
  { row: 8, col: 5 },  // 44
  { row: 8, col: 4 },  // 45
  { row: 8, col: 3 },  // 46
  { row: 8, col: 2 },  // 47: Safe Star
  { row: 8, col: 1 },  // 48
  { row: 8, col: 0 },  // 49
  // 50..51 (Left turn)
  { row: 7, col: 0 },  // 50
  { row: 6, col: 0 },  // 51
];

// Home column coordinates for each seat (steps 52..56 + 57 goal)
export const HOME_PATHS: Record<number, GridCoord[]> = {
  0: [ // Red (seat 0)
    { row: 7, col: 1 }, // 52
    { row: 7, col: 2 }, // 53
    { row: 7, col: 3 }, // 54
    { row: 7, col: 4 }, // 55
    { row: 7, col: 5 }, // 56
    { row: 7, col: 6.5 }, // 57 Goal
  ],
  1: [ // Green (seat 1)
    { row: 1, col: 7 }, // 52
    { row: 2, col: 7 }, // 53
    { row: 3, col: 7 }, // 54
    { row: 4, col: 7 }, // 55
    { row: 5, col: 7 }, // 56
    { row: 6.5, col: 7 }, // 57 Goal
  ],
  2: [ // Yellow (seat 2)
    { row: 7, col: 13 }, // 52
    { row: 7, col: 12 }, // 53
    { row: 7, col: 11 }, // 54
    { row: 7, col: 10 }, // 55
    { row: 7, col: 9 },  // 56
    { row: 7, col: 7.5 }, // 57 Goal
  ],
  3: [ // Blue (seat 3)
    { row: 13, col: 7 }, // 52
    { row: 12, col: 7 }, // 53
    { row: 11, col: 7 }, // 54
    { row: 10, col: 7 }, // 55
    { row: 9, col: 7 },  // 56
    { row: 7.5, col: 7 }, // 57 Goal
  ],
};

// Base token coordinates (row, col) inside each corner 6x6 base
export const BASE_TOKEN_POSITIONS: Record<number, GridCoord[]> = {
  0: [ // Red (top-left)
    { row: 1.8, col: 1.8 },
    { row: 1.8, col: 4.2 },
    { row: 4.2, col: 1.8 },
    { row: 4.2, col: 4.2 },
  ],
  1: [ // Green (top-right)
    { row: 1.8, col: 10.8 },
    { row: 1.8, col: 13.2 },
    { row: 4.2, col: 10.8 },
    { row: 4.2, col: 13.2 },
  ],
  2: [ // Yellow (bottom-right)
    { row: 10.8, col: 10.8 },
    { row: 10.8, col: 13.2 },
    { row: 13.2, col: 10.8 },
    { row: 13.2, col: 13.2 },
  ],
  3: [ // Blue (bottom-left)
    { row: 10.8, col: 1.8 },
    { row: 10.8, col: 4.2 },
    { row: 13.2, col: 1.8 },
    { row: 13.2, col: 4.2 },
  ],
};

/**
 * Calculates absolute board track index (0..51) from seat and progress (1..51)
 * progress = 1 is the starting cell (e.g. Red = 0, Green = 13, Yellow = 26, Blue = 39)
 * progress = 51 is the last cell before entering home column
 */
export function getTrackIndexFromProgress(seat: number, progress: number): number {
  if (progress < 1 || progress > 51) return -1;
  const startIdx = START_TRACK_INDICES[seat];
  return (startIdx + (progress - 1)) % 52;
}

/**
 * Converts a token's progress and seat into board (row, col) coordinates.
 */
export function getTokenCoordinates(seat: number, tokenId: number, progress: number): GridCoord {
  if (progress === 0) {
    // In Base
    return BASE_TOKEN_POSITIONS[seat][tokenId];
  }

  if (progress >= 1 && progress <= 51) {
    // On the 52-cell main track
    const trackIdx = getTrackIndexFromProgress(seat, progress);
    return TRACK_COORDINATES[trackIdx];
  }

  if (progress >= 52 && progress <= 57) {
    // In Home Column or Goal
    const homeIdx = progress - 52;
    return HOME_PATHS[seat][homeIdx];
  }

  // Fallback
  return BASE_TOKEN_POSITIONS[seat][tokenId];
}

/**
 * Checks if a cell track index is safe (starts and stars)
 */
export function isTrackIndexSafe(trackIdx: number, safeCells: number[]): boolean {
  return safeCells.includes(trackIdx);
}
