import { sound } from '../lib/audio';
import { chooseBotMove } from '../lib/ludo/bot';
import {
  applyAction,
  canMoveToken,
  createInitialGameState,
  getLegalMoves,
  handleTimeout,
  moveToken,
  rollDice,
} from '../lib/ludo/engine';
import { GameAction, GameMode, GameState, PlayerState } from '../lib/ludo/types';
import { authService } from './authService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

type GameListener = (state: GameState) => void;

class GameService {
  private activeState: GameState | null = null;
  private listeners: GameListener[] = [];
  private botTimer: NodeJS.Timeout | null = null;
  private turnTimer: NodeJS.Timeout | null = null;
  private autoMoveTimer: NodeJS.Timeout | null = null;
  private noMoveTurnTimer: NodeJS.Timeout | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private realtimeChannel: RealtimeChannel | null = null;
  private isSpectator: boolean = false;

  constructor() {
    this.initBroadcast();
  }

  private initBroadcast() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('royal_ludo_game_channel');
        this.broadcastChannel.onmessage = (event) => {
          const { type, matchId, action, fullState } = event.data || {};
          if (matchId && this.activeState && this.activeState.matchId === matchId) {
            if (type === 'GAME_ACTION' && action) {
              this.applyIncomingAction(action, fullState);
            } else if (type === 'SYNC_STATE' && fullState) {
              this.activeState = fullState;
              this.saveStateToStorage();
              this.notifyListenersOnly();
            }
          }
        };
      } catch (e) {
        console.warn('Game BroadcastChannel error:', e);
      }
    }
  }

  private subscribeToSupabaseMatch(matchId: string) {
    if (!isSupabaseConfigured) return;
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
      this.realtimeChannel = null;
    }

    try {
      const cleanId = matchId.replace(/[^a-zA-Z0-9_-]/g, '_');
      this.realtimeChannel = supabase.channel(`match_${cleanId}`, {
        config: { broadcast: { self: false } },
      });

      this.realtimeChannel
        .on('broadcast', { event: 'GAME_ACTION' }, (payload) => {
          if (payload.payload?.action && this.activeState?.matchId === matchId) {
            this.applyIncomingAction(payload.payload.action, payload.payload.fullState);
          }
        })
        .subscribe();
    } catch (e) {
      console.warn('Supabase match realtime error:', e);
    }
  }

  private broadcastAction(action: GameAction, fullState?: GameState) {
    if (!this.activeState) return;
    const matchId = this.activeState.matchId;
    const stateToSend = fullState || this.activeState;

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'GAME_ACTION',
        matchId,
        action,
        fullState: stateToSend,
      });
    }

    if (this.realtimeChannel) {
      this.realtimeChannel
        .send({
          type: 'broadcast',
          event: 'GAME_ACTION',
          payload: { action, fullState: stateToSend },
        })
        .catch(() => {});
    }
  }

  /**
   * Helper to determine if current client is the room / game Host
   */
  public isHostClient(): boolean {
    if (!this.activeState) return false;
    const currentUser = authService.getCurrentUser();
    const hostPlayer = this.activeState.players.find((p) => p.isHost) || this.activeState.players[0];
    return hostPlayer?.playerId === currentUser.id;
  }

  /**
   * Helper to determine if current client controls the current active seat
   */
  public isMyTurn(): boolean {
    if (!this.activeState) return false;
    const currentUser = authService.getCurrentUser();
    const currentSeat = this.activeState.turn.currentSeat;
    const currentPlayer = this.activeState.players.find((p) => p.seat === currentSeat);

    if (!currentPlayer) return false;

    // In local / pass-and-play matches, current client controls all seats
    if (this.activeState.mode.startsWith('local_')) return true;

    // If it's a Bot, only the Host client controls it
    if (currentPlayer.isBot) {
      return this.isHostClient();
    }

    // Otherwise must match user ID
    return currentPlayer.playerId === currentUser.id;
  }

  /**
   * Applies incoming network action from another player
   */
  private applyIncomingAction(action: GameAction, fullState?: GameState) {
    if (!this.activeState || this.activeState.status !== 'in_progress') return;

    if (action.type === 'EMOJI' && action.message) {
      this.activeState = applyAction(this.activeState, action);
      this.notify();
      return;
    }

    // If an authoritative fullState snapshot was provided by the action owner, reconcile directly!
    if (fullState && fullState.version >= this.activeState.version) {
      if (action.type === 'ROLL_DICE') {
        sound.playDiceRoll();
        if (action.diceValue) {
          setTimeout(() => sound.playDiceResult(action.diceValue!), 150);
        }
      } else if (action.type === 'MOVE_TOKEN') {
        const lastAction = fullState.lastAction;
        if (lastAction?.capturedSeat !== undefined) {
          sound.playCapture();
        } else if (lastAction?.toPosition === 57) {
          sound.playHomeGoal();
        } else {
          sound.playTokenMove();
        }
      }

      this.activeState = fullState;

      if (fullState.status === 'finished') {
        this.handleMatchFinished(fullState);
      } else {
        this.startTurnCountdown();
      }

      this.saveStateToStorage();
      this.notifyListenersOnly();

      // Only check bot turns if this client is the Host
      if (this.isHostClient()) {
        this.checkBotTurn();
      }
      return;
    }

    // Fallback manual deterministic step if snapshot wasn't included
    if (action.type === 'ROLL_DICE') {
      sound.playDiceRoll();
      const forcedValue = (action as any).diceValue;
      const updated = rollDice(this.activeState, forcedValue);
      const rolledVal = updated.dice.value;
      if (rolledVal !== null) {
        setTimeout(() => sound.playDiceResult(rolledVal), 150);
      }
      this.activeState = updated;
      this.startTurnCountdown();
      this.notify();
      return;
    }

    if (action.type === 'MOVE_TOKEN' && action.tokenId !== undefined) {
      const currentSeat = this.activeState.turn.currentSeat;
      const currentDice = this.activeState.dice.value;
      if (currentDice !== null && canMoveToken(this.activeState, currentSeat, action.tokenId, currentDice)) {
        const nextState = moveToken(this.activeState, currentSeat, action.tokenId, currentDice);
        if (nextState.lastAction?.capturedSeat !== undefined) {
          sound.playCapture();
        } else if (nextState.lastAction?.toPosition === 57) {
          sound.playHomeGoal();
        } else {
          sound.playTokenMove();
        }
        this.activeState = nextState;
        if (nextState.status === 'finished') {
          this.handleMatchFinished(nextState);
        } else {
          this.startTurnCountdown();
        }
        this.notify();
      }
    }
  }

  public getState(): GameState | null {
    return this.activeState;
  }

  public subscribe(callback: GameListener): () => void {
    this.listeners.push(callback);
    if (this.activeState) {
      callback(this.activeState);
    }
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notifyListenersOnly() {
    if (!this.activeState) return;
    this.listeners.forEach((l) => l(this.activeState!));
  }

  private notify() {
    if (!this.activeState) return;
    this.saveStateToStorage();
    this.notifyListenersOnly();

    // ONLY the Host client runs bot AI
    if (this.isHostClient()) {
      this.checkBotTurn();
    }
  }

  private saveStateToStorage() {
    if (typeof window === 'undefined' || !this.activeState) return;
    try {
      sessionStorage.setItem('royal_ludo_active_match', JSON.stringify(this.activeState));
    } catch (e) {
      console.warn(e);
    }
  }

  public restoreMatch(): GameState | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem('royal_ludo_active_match');
      if (raw) {
        const state: GameState = JSON.parse(raw);
        if (state.status === 'in_progress') {
          this.activeState = state;
          this.subscribeToSupabaseMatch(state.matchId);
          this.startTurnCountdown();
          this.notify();
          return state;
        }
      }
    } catch (e) {
      console.warn(e);
    }
    return null;
  }

  public startMatch(
    mode: GameMode,
    customPlayers?: Partial<PlayerState>[],
    botDifficulty: 'easy' | 'medium' | 'hard' = 'medium',
    betAmount: number = 0,
    customMatchId?: string
  ): GameState {
    this.clearTimers();
    const currentUser = authService.getCurrentUser();

    let players: Partial<PlayerState>[] = [];

    if (customPlayers && customPlayers.length > 0) {
      players = customPlayers;
    } else if (mode === 'vs_computer') {
      players = [
        {
          playerId: currentUser.id,
          username: currentUser.display_name,
          avatar: currentUser.avatar_url,
          isBot: false,
          isHost: true,
        },
        {
          playerId: 'bot_emperor',
          username: `Grand Emperor (${botDifficulty.toUpperCase()})`,
          avatar: 'avatar_4',
          isBot: true,
          botDifficulty,
          isHost: false,
        },
      ];
    } else if (mode === 'quick_2') {
      players = [
        {
          playerId: currentUser.id,
          username: currentUser.display_name,
          avatar: currentUser.avatar_url,
          isBot: false,
          isHost: true,
        },
        {
          playerId: 'quick_bot_1',
          username: 'Lord Reginald',
          avatar: 'avatar_2',
          isBot: true,
          botDifficulty: 'medium',
          isHost: false,
        },
      ];
    } else if (mode === 'quick_4') {
      players = [
        {
          playerId: currentUser.id,
          username: currentUser.display_name,
          avatar: currentUser.avatar_url,
          isBot: false,
          isHost: true,
        },
        {
          playerId: 'quick_bot_1',
          username: 'Lord Reginald',
          avatar: 'avatar_2',
          isBot: true,
          botDifficulty: 'medium',
          isHost: false,
        },
        {
          playerId: 'quick_bot_2',
          username: 'Lady Guinevere',
          avatar: 'avatar_4',
          isBot: true,
          botDifficulty: 'medium',
          isHost: false,
        },
        {
          playerId: 'quick_bot_3',
          username: 'Knight Arthur',
          avatar: 'avatar_3',
          isBot: true,
          botDifficulty: 'medium',
          isHost: false,
        },
      ];
    } else if (mode === 'team_2v2') {
      players = [
        {
          playerId: currentUser.id,
          username: `${currentUser.display_name} (Team A)`,
          avatar: currentUser.avatar_url,
          seat: 0,
          teamId: 'team_a',
          isBot: false,
          isHost: true,
        },
        {
          playerId: 'quick_bot_arthur',
          username: 'Knight Arthur (Team B)',
          avatar: 'avatar_3',
          seat: 1,
          teamId: 'team_b',
          isBot: true,
          botDifficulty: 'medium',
          isHost: false,
        },
        {
          playerId: 'quick_bot_reginald',
          username: 'Lord Reginald (Team A)',
          avatar: 'avatar_2',
          seat: 2,
          teamId: 'team_a',
          isBot: true,
          botDifficulty: 'medium',
          isHost: false,
        },
        {
          playerId: 'quick_bot_guinevere',
          username: 'Lady Guinevere (Team B)',
          avatar: 'avatar_4',
          seat: 3,
          teamId: 'team_b',
          isBot: true,
          botDifficulty: 'medium',
          isHost: false,
        },
      ];
    }

    const actualBet = Math.max(0, betAmount);
    const totalPot = actualBet * (players.length || 2);

    if (actualBet > 0) {
      authService.addCoinsAndXp(
        -actualBet,
        0,
        'room_bet_stake',
        `Staked ${actualBet.toLocaleString()} coins in chamber match.`
      );
    }

    const state = createInitialGameState({
      mode,
      players,
      matchId: customMatchId,
    });

    state.betAmount = actualBet;
    state.totalPot = totalPot;

    this.activeState = state;
    this.subscribeToSupabaseMatch(state.matchId);
    this.startTurnCountdown();
    this.notify();
    return state;
  }

  public rollCurrentDice(): boolean {
    if (!this.activeState || this.activeState.status !== 'in_progress') return false;
    if (!this.activeState.dice.canRoll) return false;

    // Check authority: Only current player (or Host if bot) can roll
    if (!this.isMyTurn()) {
      return false;
    }

    const currentSeat = this.activeState.turn.currentSeat;
    sound.playDiceRoll();
    const updated = rollDice(this.activeState);
    const rolledVal = updated.dice.value;

    if (rolledVal !== null) {
      setTimeout(() => {
        sound.playDiceResult(rolledVal);
      }, 150);
    }

    this.activeState = updated;

    // Broadcast authoritative roll with fullState
    this.broadcastAction(
      {
        type: 'ROLL_DICE',
        seat: currentSeat,
        diceValue: rolledVal || undefined,
        timestamp: Date.now(),
      },
      this.activeState
    );

    this.startTurnCountdown();
    this.notify();

    // Auto-move algorithm: Only run if this client is the current player / host
    if (rolledVal !== null && this.isMyTurn()) {
      const legalMoves = getLegalMoves(this.activeState, currentSeat, rolledVal);
      if (legalMoves.length === 1 && this.activeState.status === 'in_progress') {
        if (this.autoMoveTimer) clearTimeout(this.autoMoveTimer);
        this.autoMoveTimer = setTimeout(() => {
          if (
            this.activeState &&
            this.activeState.turn.currentSeat === currentSeat &&
            this.activeState.dice.value === rolledVal
          ) {
            this.movePlayerToken(legalMoves[0].tokenId);
          }
        }, 450);
      }
    }

    return true;
  }

  public movePlayerToken(tokenId: number): boolean {
    if (!this.activeState || this.activeState.status !== 'in_progress') return false;

    // Check authority
    if (!this.isMyTurn()) {
      return false;
    }

    const currentSeat = this.activeState.turn.currentSeat;
    const currentDice = this.activeState.dice.value;
    if (currentDice === null) return false;

    if (!canMoveToken(this.activeState, currentSeat, tokenId, currentDice)) {
      return false;
    }

    if (this.autoMoveTimer) clearTimeout(this.autoMoveTimer);

    const nextState = moveToken(this.activeState, currentSeat, tokenId, currentDice);
    const lastAction = nextState.lastAction;

    if (lastAction?.capturedSeat !== undefined) {
      sound.playCapture();
    } else if (lastAction?.toPosition === 57) {
      sound.playHomeGoal();
    } else {
      sound.playTokenMove();
    }

    this.activeState = nextState;

    // Broadcast authoritative move with fullState
    this.broadcastAction(
      {
        type: 'MOVE_TOKEN',
        seat: currentSeat,
        tokenId,
        timestamp: Date.now(),
      },
      this.activeState
    );

    if (nextState.status === 'finished') {
      this.handleMatchFinished(nextState);
    } else {
      this.startTurnCountdown();
    }

    this.notify();
    return true;
  }

  public sendQuickChat(message: string): void {
    if (!this.activeState) return;
    const currentUser = authService.getCurrentUser();
    const player =
      this.activeState.players.find((p) => p.playerId === currentUser.id) ||
      this.activeState.players[0];

    const action: GameAction = {
      type: 'EMOJI',
      seat: player.seat,
      timestamp: Date.now(),
      message,
    };

    this.activeState = applyAction(this.activeState, action);
    this.broadcastAction(action, this.activeState);
    sound.playClick();
    this.notify();
  }

  private handleMatchFinished(state: GameState) {
    this.clearTimers();
    sound.playHomeGoal();

    const user = authService.getCurrentUser();
    const userPlayer = state.players.find((p) => p.playerId === user.id);
    const userSeat = userPlayer?.seat ?? 0;
    const rankIndex = state.rankings.indexOf(userSeat);

    const is2v2 = state.mode === 'team_2v2';
    const isTeamWinner = is2v2 && userPlayer?.teamId && state.winningTeam === userPlayer.teamId;
    const won = is2v2 ? isTeamWinner : rankIndex === 0;

    let coinsReward = 50;
    let xpReward = 40;

    if (won) {
      coinsReward = 500;
      xpReward = 200;
    } else if (rankIndex === 1) {
      coinsReward = 200;
      xpReward = 100;
    } else if (rankIndex === 2) {
      coinsReward = 100;
      xpReward = 60;
    }

    const captures = userPlayer?.captures || 0;
    coinsReward += captures * 30;
    xpReward += captures * 15;

    const bet = state.betAmount || 0;
    const pot = state.totalPot || 0;

    if (bet > 0 && pot > 0 && won) {
      const payout = is2v2 ? Math.floor(pot / 2) : pot;
      coinsReward += payout;
      authService.recordTransaction({
        userId: user.id,
        type: 'room_bet_win',
        amount: payout,
        balanceAfter: user.coins + coinsReward,
        description: `👑 Won ${payout.toLocaleString()} Coins Prize Pot in ${is2v2 ? '2v2 Team Match' : 'Match'}!`,
      });
    }

    authService.recordMatchStats(won, captures);
    authService.addCoinsAndXp(
      coinsReward,
      xpReward,
      won ? 'win_reward' : 'daily_bonus',
      `Match conclusion: ${is2v2 ? (won ? 'Team Victory' : 'Team Defeat') : `Rank #${rankIndex + 1}`}`
    );
  }

  private checkBotTurn() {
    if (!this.activeState || this.activeState.status !== 'in_progress') return;
    if (!this.isHostClient()) return; // ONLY the host client drives bot AI

    const currentSeat = this.activeState.turn.currentSeat;
    const currentPlayer = this.activeState.players.find((p) => p.seat === currentSeat);

    if (!currentPlayer || !currentPlayer.isBot) return;

    if (this.botTimer) clearTimeout(this.botTimer);

    this.botTimer = setTimeout(() => {
      if (!this.activeState || this.activeState.status !== 'in_progress') return;
      if (this.activeState.turn.currentSeat !== currentSeat) return;

      if (this.activeState.dice.canRoll) {
        this.rollCurrentDice();
      } else if (this.activeState.dice.value !== null) {
        const legalMoves = getLegalMoves(this.activeState, currentSeat, this.activeState.dice.value);
        if (legalMoves.length > 0) {
          const chosen = chooseBotMove(this.activeState, currentPlayer, this.activeState.dice.value);
          if (chosen) {
            this.movePlayerToken(chosen.tokenId);
          }
        }
      }
    }, 850);
  }

  private startTurnCountdown() {
    if (this.turnTimer) clearTimeout(this.turnTimer);
    if (!this.activeState || this.activeState.status !== 'in_progress') return;

    // In multiplayer online matches, only the Host client or the current player issues authoritative timeout
    const isAuthority = this.isHostClient() || this.isMyTurn();
    const remainingMs = Math.max(0, this.activeState.turn.expiresAt - Date.now());

    this.turnTimer = setTimeout(() => {
      if (!this.activeState || this.activeState.status !== 'in_progress') return;
      if (!isAuthority) return;

      sound.playClick();
      this.activeState = handleTimeout(this.activeState);

      // Broadcast timeout state to all peers
      this.broadcastAction(
        {
          type: 'TIMEOUT',
          seat: this.activeState.turn.currentSeat,
          timestamp: Date.now(),
          message: 'Turn timed out.',
        },
        this.activeState
      );

      this.startTurnCountdown();
      this.notify();
    }, remainingMs + 50);
  }

  private clearTimers() {
    if (this.botTimer) clearTimeout(this.botTimer);
    if (this.turnTimer) clearTimeout(this.turnTimer);
    if (this.autoMoveTimer) clearTimeout(this.autoMoveTimer);
    if (this.noMoveTurnTimer) clearTimeout(this.noMoveTurnTimer);
    this.botTimer = null;
    this.turnTimer = null;
    this.autoMoveTimer = null;
    this.noMoveTurnTimer = null;
  }

  public isSpectating(): boolean {
    return this.isSpectator;
  }

  public startSpectatingMatch(matchId: string, customState?: GameState): GameState {
    this.clearTimers();
    this.isSpectator = true;
    if (customState) {
      this.activeState = customState;
    } else {
      this.activeState = createInitialGameState({
        matchId,
        mode: 'quick_4',
      });
    }
    this.subscribeToSupabaseMatch(matchId);
    this.notify();
    return this.activeState;
  }

  public leaveMatch() {
    this.clearTimers();
    this.isSpectator = false;
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
      this.realtimeChannel = null;
    }
    this.activeState = null;
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('royal_ludo_active_match');
    }
    this.listeners.forEach((l) => l(null as any));
  }
}

export const gameService = new GameService();
