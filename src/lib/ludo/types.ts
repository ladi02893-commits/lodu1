export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

export type TokenStatus = 'base' | 'active' | 'home';

export interface TokenState {
  id: number; // 0, 1, 2, 3
  status: TokenStatus;
  position: number; // 0..51 for track cells, 52..56 for home path, 57 for center home, -1 for base
  progress: number; // 0 (in base) to 57 (home)
  color: PlayerColor;
}

export interface PlayerState {
  playerId: string;
  seat: number; // 0: Red, 1: Green, 2: Yellow, 3: Blue
  color: PlayerColor;
  tokens: TokenState[];
  connected: boolean;
  isReady: boolean;
  teamId?: 'team_a' | 'team_b'; // For 2v2: Seat 0 & 2 = team_a, Seat 1 & 3 = team_b
  isHost?: boolean;
  isBot?: boolean;
  botDifficulty?: 'easy' | 'medium' | 'hard';
  username: string;
  avatar: string;
  coins?: number;
  tokensFinished: number;
  captures: number;
}

export interface DiceState {
  value: number | null;
  rolledAt: number | null;
  canRoll: boolean;
  rollsThisTurn: number;
}

export interface TurnState {
  currentSeat: number;
  startedAt: number;
  expiresAt: number;
  rollsThisTurn: number;
  extraTurn: boolean;
  consecutiveSixes: number;
  mustMoveToken: boolean;
}

export type GameMode =
  | 'quick_2'
  | 'quick_4'
  | 'team_2v2'
  | 'room_private'
  | 'local_2'
  | 'local_3'
  | 'local_4'
  | 'vs_computer';

export type GameStatus = 'waiting' | 'in_progress' | 'finished' | 'abandoned';

export interface GameSettings {
  players: number;
  tokensPerPlayer: number;
  unlockValue: number;
  extraTurnOnSix: boolean;
  extraTurnOnCapture: boolean;
  safeCells: number[];
  turnDurationSeconds: number;
  autoPassOnNoMove: boolean;
}

export interface GameAction {
  type: 'ROLL_DICE' | 'MOVE_TOKEN' | 'TIMEOUT' | 'LEAVE_GAME' | 'EMOJI';
  seat: number;
  tokenId?: number;
  diceValue?: number;
  fromPosition?: number;
  toPosition?: number;
  capturedSeat?: number;
  capturedTokenId?: number;
  timestamp: number;
  message?: string;
}

export interface GameState {
  matchId: string;
  version: number;
  status: GameStatus;
  mode: GameMode;
  betAmount?: number;
  totalPot?: number;
  players: PlayerState[];
  turn: TurnState;
  dice: DiceState;
  winnerSeat: number | null;
  winningTeam?: 'team_a' | 'team_b' | null;
  rankings: number[]; // seats in order of finish: [1st, 2nd, 3rd, 4th]
  moveNumber: number;
  lastAction: GameAction | null;
  settings: GameSettings;
  createdAt: number;
  updatedAt: number;
}

export interface LegalMove {
  tokenId: number;
  fromPosition: number;
  toPosition: number;
  targetProgress: number;
  isUnlock: boolean;
  isCapture: boolean;
  isHome: boolean;
  capturedTokens: { seat: number; tokenId: number }[];
}
