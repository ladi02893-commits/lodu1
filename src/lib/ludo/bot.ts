import { getTrackIndexFromProgress, isTrackIndexSafe } from './board';
import { getLegalMoves } from './engine';
import { GameState, LegalMove, PlayerState } from './types';

/**
 * Chooses the best token move for a bot player based on difficulty heuristic.
 */
export function chooseBotMove(
  gameState: GameState,
  botPlayer: PlayerState,
  diceValue: number
): LegalMove | null {
  const legalMoves = getLegalMoves(gameState, botPlayer.seat, diceValue);
  if (legalMoves.length === 0) return null;
  if (legalMoves.length === 1) return legalMoves[0];

  const difficulty = botPlayer.botDifficulty || 'medium';

  if (difficulty === 'easy') {
    // Easy: 70% random, 30% unlock/capture
    if (Math.random() < 0.3) {
      const captureOrUnlock = legalMoves.find((m) => m.isCapture || m.isUnlock);
      if (captureOrUnlock) return captureOrUnlock;
    }
    const randomIndex = Math.floor(Math.random() * legalMoves.length);
    return legalMoves[randomIndex];
  }

  if (difficulty === 'medium') {
    // Medium: Rank moves by simple heuristics
    let bestMove = legalMoves[0];
    let maxScore = -Infinity;

    for (const move of legalMoves) {
      let score = 0;

      // 1. Reaching goal
      if (move.isHome) score += 200;

      // 2. Capturing opponent
      if (move.isCapture) score += 150;

      // 3. Unlocking new token from base
      if (move.isUnlock) score += 100;

      // 4. Entering safe cell
      if (
        move.toPosition >= 0 &&
        move.toPosition <= 51 &&
        isTrackIndexSafe(move.toPosition, gameState.settings.safeCells)
      ) {
        score += 60;
      }

      // 5. Entering home path (>= 52)
      if (move.targetProgress >= 52) score += 80;

      // 6. Token progress advancement (prioritize moving further)
      score += move.targetProgress * 2;

      if (score > maxScore) {
        maxScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  // Hard difficulty: In-depth Tactical / Minimax evaluation
  let bestMove = legalMoves[0];
  let maxScore = -Infinity;

  for (const move of legalMoves) {
    const score = evaluateHardMoveScore(gameState, botPlayer, move);
    if (score > maxScore) {
      maxScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

/**
 * Hard Bot tactical evaluation function.
 */
function evaluateHardMoveScore(
  gameState: GameState,
  botPlayer: PlayerState,
  move: LegalMove
): number {
  let score = 0;
  const { safeCells } = gameState.settings;

  // 1. Critical Goal: Instant win or token into home (Goal is 57)
  if (move.isHome) {
    score += 1000;
    return score;
  }

  // 2. Immediate capture of an opponent token
  if (move.isCapture) {
    // High reward for capturing
    score += 650;
    // Extra reward if captured token had made significant progress
    const capturedProgressBonus = move.capturedTokens.length * 50;
    score += capturedProgressBonus;
  }

  // 3. Unlocking token from base
  if (move.isUnlock) {
    const activeTokens = botPlayer.tokens.filter((t) => t.status === 'active').length;
    // If we have 0 or 1 active tokens, unlocking is very urgent
    if (activeTokens <= 1) {
      score += 450;
    } else {
      score += 250;
    }
  }

  // 4. Entering Home Sanctuary (52..56) where opponents cannot capture
  if (move.targetProgress >= 52) {
    score += 350 + (move.targetProgress - 52) * 20;
  }

  // 5. Landing on a Safe Cell (Star or Start)
  const isDestSafe =
    move.toPosition >= 0 &&
    move.toPosition <= 51 &&
    isTrackIndexSafe(move.toPosition, safeCells);

  if (isDestSafe) {
    score += 220;
  }

  // 6. Threat Analysis: Is the destination within striking range (1..6 steps) of an opponent?
  if (!isDestSafe && move.toPosition >= 0 && move.toPosition <= 51) {
    const threatCount = countOpponentsBehindWithinSix(gameState, botPlayer.seat, move.toPosition);
    if (threatCount > 0) {
      // Destination is dangerous!
      score -= 180 * threatCount;
    }
  }

  // 7. Escape Danger: Was the moving token currently in danger on a non-safe cell?
  if (move.fromPosition >= 0 && move.fromPosition <= 51) {
    const wasSafe = isTrackIndexSafe(move.fromPosition, safeCells);
    if (!wasSafe) {
      const currentThreat = countOpponentsBehindWithinSix(gameState, botPlayer.seat, move.fromPosition);
      if (currentThreat > 0) {
        // Great to escape danger!
        score += 280 * currentThreat;
      }
    } else {
      // Leaving a safe cell has a slight risk penalty if danger is nearby
      const threatAhead = countOpponentsBehindWithinSix(gameState, botPlayer.seat, move.toPosition);
      if (threatAhead > 0) {
        score -= 120;
      }
    }
  }

  // 8. Progress weight: Favor moving tokens closer to home
  score += move.targetProgress * 3;

  return score;
}

/**
 * Counts how many active opponent tokens are 1..6 steps behind a given track cell.
 */
function countOpponentsBehindWithinSix(
  gameState: GameState,
  botSeat: number,
  destTrackIdx: number
): number {
  let threatCount = 0;

  for (const otherPlayer of gameState.players) {
    if (otherPlayer.seat === botSeat) continue;

    for (const token of otherPlayer.tokens) {
      if (token.status === 'active' && token.progress >= 1 && token.progress <= 51) {
        const otherTrackIdx = getTrackIndexFromProgress(otherPlayer.seat, token.progress);
        // Calculate distance from opponent to destination track cell
        const dist = (destTrackIdx - otherTrackIdx + 52) % 52;
        if (dist >= 1 && dist <= 6) {
          threatCount++;
        }
      }
    }
  }

  return threatCount;
}
