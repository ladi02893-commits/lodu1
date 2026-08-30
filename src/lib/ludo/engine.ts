import { DEFAULT_GAME_RULES, SEAT_COLORS, START_TRACK_INDICES, TOTAL_PROGRESS_STEPS } from './constants';
import { getTrackIndexFromProgress, isTrackIndexSafe } from './board';
import {
  GameAction,
  GameMode,
  GameSettings,
  GameState,
  LegalMove,
  PlayerColor,
  PlayerState,
  TokenState,
  TokenStatus,
  TurnState,
} from './types';

export interface CreateGameOptions {
  matchId?: string;
  mode?: GameMode;
  playersCount?: number;
  players?: Partial<PlayerState>[];
  settings?: Partial<GameSettings>;
}

/**
 * Creates a fresh initial game state.
 */
export function createInitialGameState(options: CreateGameOptions = {}): GameState {
  const mode = options.mode || 'local_4';
  const customPlayers = options.players;
  const isCustomList = Array.isArray(customPlayers) && customPlayers.length > 0;

  const playersCount = isCustomList
    ? customPlayers.length
    : options.playersCount || (mode === 'quick_2' || mode === 'local_2' ? 2 : mode === 'local_3' ? 3 : 4);

  const settings: GameSettings = { ...DEFAULT_GAME_RULES, ...options.settings, players: playersCount };
  const matchId = options.matchId || `match_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  let players: PlayerState[] = [];

  if (isCustomList) {
    players = customPlayers.map((override, index) => {
      const seat = override.seat !== undefined ? override.seat : index;
      const color = override.color || SEAT_COLORS[seat] || 'red';
      const tokens: TokenState[] = [0, 1, 2, 3].map((id) => ({
        id,
        status: 'base',
        position: -1,
        progress: 0,
        color,
      }));

      return {
        playerId: override.playerId || `player_${seat}_${Math.random().toString(36).substring(2, 7)}`,
        seat,
        color,
        tokens,
        connected: override.connected ?? true,
        isReady: override.isReady ?? true,
        isHost: override.isHost ?? (index === 0),
        isBot: override.isBot ?? false,
        botDifficulty: override.botDifficulty || 'medium',
        username: override.username || (override.isBot ? `Royal Bot ${seat + 1}` : `Player ${seat + 1}`),
        avatar: override.avatar || (override.isBot ? 'bot' : `avatar_${(seat % 6) + 1}`),
        coins: override.coins ?? (override.isBot ? 5000 : 12450),
        tokensFinished: 0,
        captures: 0,
      };
    });
  } else {
    // Determine active seats based on player count
    // 2 players: Seats 0 (Red) and 2 (Yellow) for diagonal classic balance, or 0 and 1
    const activeSeats = playersCount === 2 ? [0, 2] : playersCount === 3 ? [0, 1, 2] : [0, 1, 2, 3];

    players = activeSeats.map((seat, index) => {
      const color = SEAT_COLORS[seat];
      const tokens: TokenState[] = [0, 1, 2, 3].map((id) => ({
        id,
        status: 'base',
        position: -1,
        progress: 0,
        color,
      }));

      return {
        playerId: `player_${seat}_${Math.random().toString(36).substring(2, 7)}`,
        seat,
        color,
        tokens,
        connected: true,
        isReady: true,
        isHost: index === 0,
        isBot: false,
        botDifficulty: 'medium',
        username: `Player ${seat + 1}`,
        avatar: `avatar_${(seat % 6) + 1}`,
        coins: 10000,
        tokensFinished: 0,
        captures: 0,
      };
    });
  }

  const firstSeat = players[0]?.seat ?? 0;
  const now = Date.now();

  const turn: TurnState = {
    currentSeat: firstSeat,
    startedAt: now,
    expiresAt: now + settings.turnDurationSeconds * 1000,
    rollsThisTurn: 0,
    extraTurn: false,
    consecutiveSixes: 0,
    mustMoveToken: false,
  };

  return {
    matchId,
    version: 1,
    status: 'in_progress',
    mode,
    players,
    turn,
    dice: {
      value: null,
      rolledAt: null,
      canRoll: true,
      rollsThisTurn: 0,
    },
    winnerSeat: null,
    rankings: [],
    moveNumber: 0,
    lastAction: null,
    settings,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Calculates all legal moves for a given seat and dice value.
 */
export function getLegalMoves(gameState: GameState, seat: number, diceValue: number): LegalMove[] {
  const player = gameState.players.find((p) => p.seat === seat);
  if (!player) return [];

  const moves: LegalMove[] = [];
  const { unlockValue, safeCells } = gameState.settings;

  for (const token of player.tokens) {
    if (token.status === 'home') {
      // Already in goal
      continue;
    }

    if (token.status === 'base') {
      // Token is in base - needs unlock value (default 6)
      if (diceValue === unlockValue) {
        const startTrackIdx = START_TRACK_INDICES[seat];
        // Check if landing on opponent to capture
        const capturedTokens = findCapturesOnCell(gameState, seat, startTrackIdx, safeCells);

        moves.push({
          tokenId: token.id,
          fromPosition: -1,
          toPosition: startTrackIdx,
          targetProgress: 1,
          isUnlock: true,
          isCapture: capturedTokens.length > 0,
          isHome: false,
          capturedTokens,
        });
      }
      continue;
    }

    if (token.status === 'active') {
      const targetProgress = token.progress + diceValue;

      // Exact count required to enter goal (57)
      if (targetProgress > TOTAL_PROGRESS_STEPS) {
        continue;
      }

      if (targetProgress === TOTAL_PROGRESS_STEPS) {
        // Enters Goal
        moves.push({
          tokenId: token.id,
          fromPosition: token.position,
          toPosition: 57,
          targetProgress: 57,
          isUnlock: false,
          isCapture: false,
          isHome: true,
          capturedTokens: [],
        });
      } else if (targetProgress >= 52) {
        // Enters Home Column (safe, no captures possible)
        moves.push({
          tokenId: token.id,
          fromPosition: token.position,
          toPosition: targetProgress,
          targetProgress,
          isUnlock: false,
          isCapture: false,
          isHome: false,
          capturedTokens: [],
        });
      } else {
        // On Outer Track (progress 1..51)
        const targetTrackIdx = getTrackIndexFromProgress(seat, targetProgress);
        const capturedTokens = findCapturesOnCell(gameState, seat, targetTrackIdx, safeCells);

        moves.push({
          tokenId: token.id,
          fromPosition: token.position,
          toPosition: targetTrackIdx,
          targetProgress,
          isUnlock: false,
          isCapture: capturedTokens.length > 0,
          isHome: false,
          capturedTokens,
        });
      }
    }
  }

  return moves;
}

/**
 * Checks if opponent tokens are present on a track cell and eligible for capture.
 */
function findCapturesOnCell(
  gameState: GameState,
  movedPlayerSeat: number,
  trackIdx: number,
  safeCells: number[]
): { seat: number; tokenId: number }[] {
  // If track cell is a safe cell (start or star), no captures can happen
  if (isTrackIndexSafe(trackIdx, safeCells)) {
    return [];
  }

  const captures: { seat: number; tokenId: number }[] = [];

  for (const otherPlayer of gameState.players) {
    if (otherPlayer.seat === movedPlayerSeat) continue;

    for (const token of otherPlayer.tokens) {
      if (token.status === 'active' && token.progress >= 1 && token.progress <= 51) {
        const otherTrackIdx = getTrackIndexFromProgress(otherPlayer.seat, token.progress);
        if (otherTrackIdx === trackIdx) {
          captures.push({ seat: otherPlayer.seat, tokenId: token.id });
        }
      }
    }
  }

  return captures;
}

/**
 * Validates if a specific token can be moved with the given dice value.
 */
export function canMoveToken(gameState: GameState, seat: number, tokenId: number, diceValue: number): boolean {
  const legalMoves = getLegalMoves(gameState, seat, diceValue);
  return legalMoves.some((m) => m.tokenId === tokenId);
}

/**
 * Rolls the dice on server / engine, returns updated GameState.
 */
export function rollDice(gameState: GameState, forcedValue?: number): GameState {
  if (gameState.status !== 'in_progress') return gameState;
  if (!gameState.dice.canRoll) return gameState;

  // Generate fair random 1..6 or use forced value (for testing)
  const value = forcedValue && forcedValue >= 1 && forcedValue <= 6
    ? forcedValue
    : Math.floor(Math.random() * 6) + 1;

  const now = Date.now();
  const consecutiveSixes = value === 6 ? gameState.turn.consecutiveSixes + 1 : 0;
  const currentSeat = gameState.turn.currentSeat;

  // Anti-stalling rule: 3 consecutive 6s forfeits turn
  if (consecutiveSixes >= 3) {
    const nextSeat = getNextActiveSeat(gameState, currentSeat);
    const updatedTurn: TurnState = {
      currentSeat: nextSeat,
      startedAt: now,
      expiresAt: now + gameState.settings.turnDurationSeconds * 1000,
      rollsThisTurn: 0,
      extraTurn: false,
      consecutiveSixes: 0,
      mustMoveToken: false,
    };

    return {
      ...gameState,
      version: gameState.version + 1,
      turn: updatedTurn,
      dice: {
        value,
        rolledAt: now,
        canRoll: true,
        rollsThisTurn: 0,
      },
      moveNumber: gameState.moveNumber + 1,
      lastAction: {
        type: 'ROLL_DICE',
        seat: currentSeat,
        diceValue: value,
        timestamp: now,
        message: '3 consecutive sixes! Turn passed.',
      },
      updatedAt: now,
    };
  }

  // Calculate legal moves for this roll
  const legalMoves = getLegalMoves(gameState, currentSeat, value);

  if (legalMoves.length === 0) {
    // No legal moves possible
    const hasExtraTurnOnSix = value === 6 && gameState.settings.extraTurnOnSix;

    if (hasExtraTurnOnSix) {
      // Player rolled 6 but couldn't move any token - they still get their extra roll
      return {
        ...gameState,
        version: gameState.version + 1,
        turn: {
          ...gameState.turn,
          rollsThisTurn: gameState.turn.rollsThisTurn + 1,
          consecutiveSixes,
          mustMoveToken: false,
        },
        dice: {
          value,
          rolledAt: now,
          canRoll: true,
          rollsThisTurn: gameState.dice.rollsThisTurn + 1,
        },
        moveNumber: gameState.moveNumber + 1,
        lastAction: {
          type: 'ROLL_DICE',
          seat: currentSeat,
          diceValue: value,
          timestamp: now,
          message: 'No legal moves with 6, roll again!',
        },
        updatedAt: now,
      };
    }

    // Pass turn to next player
    const nextSeat = getNextActiveSeat(gameState, currentSeat);
    return {
      ...gameState,
      version: gameState.version + 1,
      turn: {
        currentSeat: nextSeat,
        startedAt: now,
        expiresAt: now + gameState.settings.turnDurationSeconds * 1000,
        rollsThisTurn: 0,
        extraTurn: false,
        consecutiveSixes: 0,
        mustMoveToken: false,
      },
      dice: {
        value,
        rolledAt: now,
        canRoll: true,
        rollsThisTurn: 0,
      },
      moveNumber: gameState.moveNumber + 1,
      lastAction: {
        type: 'ROLL_DICE',
        seat: currentSeat,
        diceValue: value,
        timestamp: now,
        message: 'No legal moves. Turn passed.',
      },
      updatedAt: now,
    };
  }

  // Player has legal moves to choose from
  return {
    ...gameState,
    version: gameState.version + 1,
    turn: {
      ...gameState.turn,
      rollsThisTurn: gameState.turn.rollsThisTurn + 1,
      consecutiveSixes,
      mustMoveToken: true,
    },
    dice: {
      value,
      rolledAt: now,
      canRoll: false,
      rollsThisTurn: gameState.dice.rollsThisTurn + 1,
    },
    moveNumber: gameState.moveNumber + 1,
    lastAction: {
      type: 'ROLL_DICE',
      seat: currentSeat,
      diceValue: value,
      timestamp: now,
    },
    updatedAt: now,
  };
}

/**
 * Moves a token based on player's chosen move and current dice value.
 */
export function moveToken(gameState: GameState, seat: number, tokenId: number, diceValue?: number): GameState {
  if (gameState.status !== 'in_progress') return gameState;
  if (gameState.turn.currentSeat !== seat) return gameState;

  const currentDice = diceValue ?? gameState.dice.value;
  if (!currentDice) return gameState;

  const legalMoves = getLegalMoves(gameState, seat, currentDice);
  const selectedMove = legalMoves.find((m) => m.tokenId === tokenId);
  if (!selectedMove) return gameState; // Illegal move attempt

  const now = Date.now();
  let extraTurn = false;

  // Clone players to update token positions and captures
  const updatedPlayers = gameState.players.map((p) => {
    if (p.seat === seat) {
      // Update moving player's token
      const updatedTokens = p.tokens.map((t) => {
        if (t.id === tokenId) {
          const newStatus: TokenStatus = selectedMove.isHome ? 'home' : 'active';
          return {
            ...t,
            status: newStatus,
            position: selectedMove.toPosition,
            progress: selectedMove.targetProgress,
          };
        }
        return t;
      });

      const tokensFinished = updatedTokens.filter((t) => t.status === 'home').length;
      const newCaptures = p.captures + selectedMove.capturedTokens.length;

      return {
        ...p,
        tokens: updatedTokens,
        tokensFinished,
        captures: newCaptures,
      };
    }

    // Reset captured opponent tokens back to base
    const capturedForPlayer = selectedMove.capturedTokens.filter((c) => c.seat === p.seat);
    if (capturedForPlayer.length > 0) {
      const capturedTokenIds = capturedForPlayer.map((c) => c.tokenId);
      const updatedTokens = p.tokens.map((t) => {
        if (capturedTokenIds.includes(t.id)) {
          return {
            ...t,
            status: 'base' as const,
            position: -1,
            progress: 0,
          };
        }
        return t;
      });
      return {
        ...p,
        tokens: updatedTokens,
      };
    }

    return p;
  });

  // Check if moving player unlocked an extra turn (rolled 6, captured opponent, or reached home)
  if (currentDice === gameState.settings.unlockValue && gameState.settings.extraTurnOnSix) {
    extraTurn = true;
  }
  if (selectedMove.isCapture && gameState.settings.extraTurnOnCapture) {
    extraTurn = true;
  }
  if (selectedMove.isHome) {
    // Reaching goal also rewards an extra roll in standard rules
    extraTurn = true;
  }

  // Check if moving player has completed all 4 tokens
  const movingPlayer = updatedPlayers.find((p) => p.seat === seat)!;
  const isWinner = isPlayerWinner(movingPlayer);
  let updatedRankings = [...gameState.rankings];
  let winnerSeat = gameState.winnerSeat;
  let gameStatus: GameState['status'] = gameState.status;

  if (isWinner && !updatedRankings.includes(seat)) {
    updatedRankings.push(seat);
    if (winnerSeat === null) {
      winnerSeat = seat; // 1st Place Winner!
    }

    // Check if game should end (e.g. 2 player match or all but 1 player finished)
    const activePlayersRemaining = updatedPlayers.filter(
      (p) => !updatedRankings.includes(p.seat)
    );

    if (activePlayersRemaining.length <= 1) {
      // Add last remaining player to rankings
      if (activePlayersRemaining.length === 1) {
        updatedRankings.push(activePlayersRemaining[0].seat);
      }
      gameStatus = 'finished';
    }
  }

  // Determine next turn
  let nextSeat = seat;
  if (gameStatus === 'finished') {
    // Game ended
    nextSeat = seat;
  } else if (isWinner) {
    // If the player just finished, switch to next active player regardless of extra turn
    nextSeat = getNextActiveSeat({ ...gameState, rankings: updatedRankings }, seat);
    extraTurn = false;
  } else if (!extraTurn) {
    // Switch to next active player
    nextSeat = getNextActiveSeat({ ...gameState, rankings: updatedRankings }, seat);
  }

  const updatedTurn: TurnState = {
    currentSeat: nextSeat,
    startedAt: now,
    expiresAt: now + gameState.settings.turnDurationSeconds * 1000,
    rollsThisTurn: extraTurn ? gameState.turn.rollsThisTurn : 0,
    extraTurn,
    consecutiveSixes: extraTurn && currentDice === 6 ? gameState.turn.consecutiveSixes : 0,
    mustMoveToken: false,
  };

  return {
    ...gameState,
    version: gameState.version + 1,
    status: gameStatus,
    players: updatedPlayers,
    turn: updatedTurn,
    dice: {
      value: null,
      rolledAt: null,
      canRoll: true,
      rollsThisTurn: 0,
    },
    winnerSeat,
    rankings: updatedRankings,
    moveNumber: gameState.moveNumber + 1,
    lastAction: {
      type: 'MOVE_TOKEN',
      seat,
      tokenId,
      diceValue: currentDice,
      fromPosition: selectedMove.fromPosition,
      toPosition: selectedMove.toPosition,
      capturedSeat: selectedMove.capturedTokens[0]?.seat,
      capturedTokenId: selectedMove.capturedTokens[0]?.tokenId,
      timestamp: now,
      message: selectedMove.isCapture
        ? `Player ${seat + 1} captured Player ${selectedMove.capturedTokens[0].seat + 1}!`
        : selectedMove.isHome
        ? `Player ${seat + 1}'s token reached Home!`
        : undefined,
    },
    updatedAt: now,
  };
}

/**
 * Handles turn timeout (when timer expires).
 */
export function handleTimeout(gameState: GameState): GameState {
  if (gameState.status !== 'in_progress') return gameState;

  const currentSeat = gameState.turn.currentSeat;
  const now = Date.now();

  // If player hadn't rolled dice yet, auto-roll or pass turn
  const nextSeat = getNextActiveSeat(gameState, currentSeat);

  return {
    ...gameState,
    version: gameState.version + 1,
    turn: {
      currentSeat: nextSeat,
      startedAt: now,
      expiresAt: now + gameState.settings.turnDurationSeconds * 1000,
      rollsThisTurn: 0,
      extraTurn: false,
      consecutiveSixes: 0,
      mustMoveToken: false,
    },
    dice: {
      value: null,
      rolledAt: null,
      canRoll: true,
      rollsThisTurn: 0,
    },
    moveNumber: gameState.moveNumber + 1,
    lastAction: {
      type: 'TIMEOUT',
      seat: currentSeat,
      timestamp: now,
      message: `Player ${currentSeat + 1} timed out. Turn passed.`,
    },
    updatedAt: now,
  };
}

/**
 * Checks if a player has moved all 4 tokens to home goal.
 */
export function isPlayerWinner(player: PlayerState): boolean {
  return player.tokens.every((t) => t.status === 'home' && t.progress === TOTAL_PROGRESS_STEPS);
}

/**
 * Gets the next active seat in clockwise rotation, skipping finished players.
 */
export function getNextActiveSeat(gameState: GameState, currentSeat: number): number {
  const seats = gameState.players.map((p) => p.seat).sort((a, b) => a - b);
  if (seats.length === 0) return 0;

  const currentIdx = seats.indexOf(currentSeat);
  for (let i = 1; i <= seats.length; i++) {
    const nextCandidate = seats[(currentIdx + i) % seats.length];
    // Check if player in this seat has not yet finished
    if (!gameState.rankings.includes(nextCandidate)) {
      return nextCandidate;
    }
  }

  return seats[0];
}

/**
 * Applies a generic game action to the state.
 */
export function applyAction(gameState: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'ROLL_DICE':
      return rollDice(gameState, action.diceValue);
    case 'MOVE_TOKEN':
      if (action.tokenId === undefined) return gameState;
      return moveToken(gameState, action.seat, action.tokenId, action.diceValue);
    case 'TIMEOUT':
      return handleTimeout(gameState);
    case 'EMOJI':
      return {
        ...gameState,
        version: gameState.version + 1,
        lastAction: action,
        updatedAt: Date.now(),
      };
    default:
      return gameState;
  }
}
