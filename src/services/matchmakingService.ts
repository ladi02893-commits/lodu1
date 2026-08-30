import { authService } from './authService';
import { gameService } from './gameService';
import { GameMode } from '../lib/ludo/types';

type MatchmakingListener = (status: {
  isSearching: boolean;
  mode: GameMode | null;
  elapsedSeconds: number;
  playersFound: number;
  maxPlayers: number;
}) => void;

class MatchmakingService {
  private isSearching: boolean = false;
  private currentMode: GameMode | null = null;
  private searchTimer: NodeJS.Timeout | null = null;
  private elapsedSeconds: number = 0;
  private listeners: MatchmakingListener[] = [];

  private betAmount: number = 0;

  public subscribe(callback: MatchmakingListener): () => void {
    this.listeners.push(callback);
    this.notify();
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notify() {
    const maxPlayers = this.currentMode === 'quick_2' ? 2 : 4;
    const playersFound = this.isSearching
      ? Math.min(maxPlayers, 1 + Math.floor(this.elapsedSeconds / 1.5))
      : 0;

    this.listeners.forEach((l) =>
      l({
        isSearching: this.isSearching,
        mode: this.currentMode,
        elapsedSeconds: this.elapsedSeconds,
        playersFound,
        maxPlayers,
      })
    );
  }

  public startSearch(mode: GameMode = 'quick_4', betAmount: number = 0): void {
    this.cancelSearch();
    this.isSearching = true;
    this.currentMode = mode;
    this.betAmount = betAmount;
    this.elapsedSeconds = 0;
    this.notify();

    this.searchTimer = setInterval(() => {
      this.elapsedSeconds++;
      this.notify();

      const targetDuration = mode === 'quick_2' ? 3 : 4;
      if (this.elapsedSeconds >= targetDuration) {
        this.matchFound(mode);
      }
    }, 1000);
  }

  public cancelSearch(): void {
    if (this.searchTimer) clearInterval(this.searchTimer);
    this.searchTimer = null;
    this.isSearching = false;
    this.currentMode = null;
    this.betAmount = 0;
    this.elapsedSeconds = 0;
    this.notify();
  }

  private matchFound(mode: GameMode): void {
    if (this.searchTimer) clearInterval(this.searchTimer);
    const bet = this.betAmount;
    this.searchTimer = null;
    this.isSearching = false;
    this.notify();

    // Start match via gameService
    gameService.startMatch(mode, undefined, 'medium', bet);
  }
}

export const matchmakingService = new MatchmakingService();
