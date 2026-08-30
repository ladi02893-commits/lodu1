import { describe, expect, it } from 'vitest';
import {
  canMoveToken,
  createInitialGameState,
  getLegalMoves,
  handleTimeout,
  moveToken,
  rollDice,
} from './engine';

describe('Royal Ludo Pure Logic Engine', () => {
  it('should initialize game state correctly with 4 players and empty track', () => {
    const state = createInitialGameState({ mode: 'vs_computer' });
    expect(state.players.length).toBe(4);
    expect(state.turn.currentSeat).toBe(0);
    expect(state.dice.canRoll).toBe(true);
    expect(state.dice.value).toBe(null);

    // Each player has 4 tokens in base
    state.players.forEach((p) => {
      expect(p.tokens.length).toBe(4);
      p.tokens.forEach((t) => {
        expect(t.status).toBe('base');
        expect(t.progress).toBe(0);
      });
    });
  });

  it('should roll dice between 1 and 6 and update legal moves', () => {
    // 1. Test roll 6 with base tokens
    let state = createInitialGameState({ mode: 'local_4' });
    state = rollDice(state, 6);
    expect(state.dice.value).toBe(6);
    expect(state.dice.canRoll).toBe(false); // Must select token to move
    const moves = getLegalMoves(state, 0, 6);
    expect(moves.length).toBe(4);

    // 2. Test roll 3 with all tokens in base (passes turn to next seat)
    let state2 = createInitialGameState({ mode: 'local_4' });
    state2 = rollDice(state2, 3);
    expect(state2.dice.value).toBe(3);
    expect(state2.turn.currentSeat).toBe(1); // Turn advanced
    expect(state2.dice.canRoll).toBe(true);
  });


  it('should advance token from base (0) to track start (1) on roll 6', () => {
    let state = createInitialGameState({ mode: 'local_4' });
    // Force dice value to 6
    state = {
      ...state,
      dice: {
        value: 6,
        rolledAt: Date.now(),
        canRoll: false,
        rollsThisTurn: 1,
      },
      turn: {
        ...state.turn,
        mustMoveToken: true,
      },
    };

    expect(canMoveToken(state, 0, 0, 6)).toBe(true);
    const next = moveToken(state, 0, 0, 6);
    const movedToken = next.players[0].tokens[0];
    expect(movedToken.status).toBe('active');
    expect(movedToken.progress).toBe(1);
    // Rolling 6 grants extra turn
    expect(next.turn.currentSeat).toBe(0);
    expect(next.dice.canRoll).toBe(true);
  });

  it('should advance token along the track on subsequent rolls', () => {
    let state = createInitialGameState({ mode: 'local_4' });
    // Place red token 0 at progress 10
    state.players[0].tokens[0] = {
      id: 0,
      color: 'red',
      position: 10,
      progress: 10,
      status: 'active',
    };

    state = {
      ...state,
      dice: {
        value: 4,
        rolledAt: Date.now(),
        canRoll: false,
        rollsThisTurn: 1,
      },
      turn: {
        ...state.turn,
        mustMoveToken: true,
      },
    };

    expect(canMoveToken(state, 0, 0, 4)).toBe(true);
    const next = moveToken(state, 0, 0, 4);
    expect(next.players[0].tokens[0].progress).toBe(14);
    // Non-6 move without capture or goal passes turn to next player
    expect(next.turn.currentSeat).toBe(1);
  });

  it('should handle timeout cleanly by advancing turn', () => {
    const state = createInitialGameState({ mode: 'vs_computer' });
    const next = handleTimeout(state);
    expect(next.turn.currentSeat).toBe(1);
  });
});
