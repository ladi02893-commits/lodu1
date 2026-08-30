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
  private broadcastChannel: BroadcastChannel | null = null;
  private realtimeChannel: RealtimeChannel | null = null;

  constructor() {
    this.initBroadcast();
  }

  private initBroadcast() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('royal_ludo_game_channel');
        this.broadcastChannel.onmessage = (event) => {
          const { type, matchId, action, state } = event.data || {};
          if (matchId && this.activeState && this.activeState.matchId === matchId) {
            if (type === 'GAME_ACTION' && action) {
              this.applyIncomingAction(action);
            } else if (type === 'SYNC_STATE' && state) {
              this.activeState = state;
              this.notify();
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
      this.realtimeChannel = supabase.channel(`match_${matchId}`, {
        config: { broadcast: { self: false } },
      });

      this.realtimeChannel
        .on('broadcast', { event: 'GAME_ACTION' }, (payload) => {
          if (payload.payload?.action && this.activeState?.matchId === matchId) {
            this.applyIncomingAction(payload.payload.action);
          }
        })
        .subscribe();
    } catch (e) {
      console.warn('Supabase match realtime error:', e);
    }
  }

  private broadcastAction(action: GameAction) {
    if (!this.activeState) return;
    const matchId = this.activeState.matchId;

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'GAME_ACTION', matchId, action });
    }

    if (this.realtimeChannel) {
      this.realtimeChannel.send({
        type: 'broadcast',
        event: 'GAME_ACTION',
        payload: { action },
      }).catch(() => {});
    }
  }

  private applyIncomingAction(action: GameAction) {
    if (!this.activeState || this.activeState.status !== 'in_progress') return;

    if (action.type === 'EMOJI' && action.message) {
      this.activeState = applyAction(this.activeState, action);
      this.notify();
      return;
    }

    if (action.type === 'ROLL_DICE') {
      sound.playDiceRoll();
      const updated = rollDice(this.activeState);
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

  private notify() {
    if (!this.activeState) return;
    this.saveStateToStorage();
    this.listeners.forEach((l) => l(this.activeState!));
    this.checkBotTurn();
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
    betAmount: number = 0
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
        },
        {
          playerId: 'bot_emperor',
          username: `Grand Emperor (${botDifficulty.toUpperCase()})`,
          avatar: 'avatar_4',
          isBot: true,
          botDifficulty,
        },
      ];
    } else if (mode === 'quick_2') {
      players = [
        {
          playerId: currentUser.id,
          username: currentUser.display_name,
          avatar: currentUser.avatar_url,
          isBot: false,
        },
        {
          playerId: 'quick_bot_1',
          username: 'Lord Reginald',
          avatar: 'avatar_2',
          isBot: true,
          botDifficulty: 'medium',
        },
      ];
    } else if (mode === 'quick_4') {
      players = [
        {
          playerId: currentUser.id,
          username: currentUser.display_name,
          avatar: currentUser.avatar_url,
          isBot: false,
        },
        {
          playerId: 'quick_bot_1',
          username: 'Lord Reginald',
          avatar: 'avatar_2',
          isBot: true,
          botDifficulty: 'medium',
        },
        {
          playerId: 'quick_bot_2',
          username: 'Lady Guinevere',
          avatar: 'avatar_4',
          isBot: true,
          botDifficulty: 'medium',
        },
        {
          playerId: 'quick_bot_3',
          username: 'Knight Arthur',
          avatar: 'avatar_3',
          isBot: true,
          botDifficulty: 'medium',
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
    this.broadcastAction({
      type: 'ROLL_DICE',
      seat: currentSeat,
      timestamp: Date.now(),
    });

    this.startTurnCountdown();
    this.notify();
    return true;
  }

  public movePlayerToken(tokenId: number): boolean {
    if (!this.activeState || this.activeState.status !== 'in_progress') return false;
    const currentSeat = this.activeState.turn.currentSeat;
    const currentDice = this.activeState.dice.value;
    if (currentDice === null) return false;

    if (!canMoveToken(this.activeState, currentSeat, tokenId, currentDice)) {
      return false;
    }

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
    this.broadcastAction({
      type: 'MOVE_TOKEN',
      seat: currentSeat,
      tokenId,
      timestamp: Date.now(),
    });

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
    const player = this.activeState.players.find((p) => p.playerId === currentUser.id) || this.activeState.players[0];

    const action: GameAction = {
      type: 'EMOJI',
      seat: player.seat,
      timestamp: Date.now(),
      message,
    };

    this.activeState = applyAction(this.activeState, action);
    this.broadcastAction(action);
    sound.playClick();
    this.notify();
  }

  private handleMatchFinished(state: GameState) {
    this.clearTimers();
    sound.playHomeGoal();

    const user = authService.getCurrentUser();
    const userSeat = state.players.find((p) => p.playerId === user.id)?.seat ?? 0;
    const rankIndex = state.rankings.indexOf(userSeat);
    const won = rankIndex === 0;

    let coinsReward = 50;
    let xpReward = 40;

    if (rankIndex === 0) {
      coinsReward = 500;
      xpReward = 200;
    } else if (rankIndex === 1) {
      coinsReward = 200;
      xpReward = 100;
    } else if (rankIndex === 2) {
      coinsReward = 100;
      xpReward = 60;
    }

    const userPlayer = state.players.find((p) => p.seat === userSeat);
    const captures = userPlayer?.captures || 0;

    coinsReward += captures * 30;
    xpReward += captures * 15;

    const bet = state.betAmount || 0;
    const pot = state.totalPot || 0;

    if (bet > 0 && pot > 0) {
      if (rankIndex === 0) {
        coinsReward += pot;
        authService.recordTransaction({
          userId: user.id,
          type: 'room_bet_win',
          amount: pot,
          balanceAfter: user.coins + coinsReward,
          description: `👑 Won ${pot.toLocaleString()} Coins Prize Pot in Private Chamber!`,
        });
      }
    }

    authService.recordMatchStats(won, captures);
    authService.addCoinsAndXp(coinsReward, xpReward, won ? 'win_reward' : 'daily_bonus', `Match conclusion: Rank #${rankIndex + 1}`);
  }

  private checkBotTurn() {
    if (!this.activeState || this.activeState.status !== 'in_progress') return;

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
          if (chosen) 
          this.movePlayerToken(chosen.tokenId);
        }
      }
    }, 900);
  }

  private startTurnCountdown() {
    if (this.turnTimer) clearTimeout(this.turnTimer);
    if (!this.activeState || this.activeState.status !== 'in_progress') return;

    const remainingMs = Math.max(0, this.activeState.turn.expiresAt - Date.now());

    this.turnTimer = setTimeout(() => {
      if (!this.activeState || this.activeState.status !== 'in_progress') return;
      sound.playClick();
      this.activeState = handleTimeout(this.activeState);
      this.startTurnCountdown();
      this.notify();
    }, remainingMs + 50);
  }

  private clearTimers() {
    if (this.botTimer) clearTimeout(this.botTimer);
    if (this.turnTimer) clearTimeout(this.turnTimer);
    this.botTimer = null;
    this.turnTimer = null;
  }

  public leaveMatch() {
    this.clearTimers();
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
