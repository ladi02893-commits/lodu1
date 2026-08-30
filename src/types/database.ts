export interface UserProfile {
  id: string;
  email?: string;
  username: string;
  display_name: string;
  avatar_url: string;
  avatar_frame: string;
  dice_skin: string;
  board_theme: string;
  token_skin: string;
  player_id: string;
  level: number;
  xp: number;
  coins: number;
  wins: number;
  losses: number;
  games_played: number;
  total_captures: number;
  best_win_streak: number;
  current_win_streak: number;
  is_online: boolean;
  is_admin?: boolean;
  is_banned?: boolean;
  role?: 'user' | 'admin' | 'moderator';
  is_vip?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
  profile?: UserProfile;
}

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  sender?: UserProfile;
}

export interface RoomRecord {
  id: string;
  code: string;
  host_id: string;
  mode: string;
  max_players: number;
  bet_amount: number; // Entry bet per player (0 = Free)
  total_pot: number; // Total pot to be won by victor
  status: 'open' | 'in_game' | 'closed';
  settings: {
    turnDurationSeconds?: number;
    betAmount?: number;
    [key: string]: unknown;
  };
  created_at: string;
  players?: RoomPlayerRecord[];
}

export interface RoomPlayerRecord {
  id: string;
  room_id: string;
  user_id: string;
  seat: number;
  color: 'red' | 'green' | 'yellow' | 'blue';
  is_ready: boolean;
  is_host: boolean;
  joined_at: string;
  profile?: UserProfile;
}

export interface MatchRecord {
  id: string;
  room_id?: string;
  mode: string;
  bet_amount?: number;
  total_pot?: number;
  status: 'waiting' | 'in_progress' | 'finished' | 'abandoned';
  winner_user_id?: string;
  started_at: string;
  ended_at?: string;
  duration_seconds: number;
}

export interface MatchPlayerRecord {
  id: string;
  match_id: string;
  user_id: string;
  seat: number;
  color: 'red' | 'green' | 'yellow' | 'blue';
  final_position?: number;
  tokens_finished: number;
  captures: number;
  result: 'won' | 'lost' | 'abandoned' | 'playing';
}

export interface GameMoveRecord {
  id: string;
  match_id: string;
  move_number: number;
  user_id?: string;
  action_type: string;
  token_id?: number;
  dice_value?: number;
  from_position?: number;
  to_position?: number;
  payload: Record<string, unknown>;
  created_at: string;
}

export type TransactionType =
  | 'win_reward'
  | 'daily_bonus'
  | 'mission_reward'
  | 'achievement_reward'
  | 'shop_purchase'
  | 'admin_grant'
  | 'admin_deduct'
  | 'coin_purchase'
  | 'room_bet_stake'
  | 'room_bet_win'
  | 'room_bet_refund'
  | 'promo_code';

export interface TransactionRecord {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number; // positive for gain, negative for deduction
  balance_after: number;
  reference_type?: string;
  reference_id?: string;
  description?: string;
  created_at: string;
}

export interface DepositRequestRecord {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  package_id: string;
  coins_amount: number;
  bonus_coins: number;
  fiat_amount: number;
  currency: 'PKR' | 'USD' | 'INR' | 'USDT';
  payment_method: 'jazzcash' | 'easypaisa' | 'bank_transfer' | 'upi' | 'card' | 'crypto';
  sender_account_or_name: string;
  transaction_reference_id: string; // TRX ID / UTR / Proof
  screenshot_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note?: string;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export interface MissionRecord {
  id: string;
  title: string;
  description: string;
  category: 'daily' | 'weekly';
  requirement_type: string;
  requirement_value: number;
  reward_coins: number;
  reward_xp: number;
  progress?: number;
  completed?: boolean;
  claimed?: boolean;
}

export interface AchievementRecord {
  id: string;
  title: string;
  description: string;
  icon: string;
  requirement_type: string;
  requirement_value: number;
  reward_coins: number;
  reward_xp: number;
  unlocked?: boolean;
  claimed?: boolean;
}

export interface ShopItem {
  id: string;
  name: string;
  type: 'dice' | 'board' | 'token' | 'avatar' | 'frame';
  price: number;
  icon: string;
  previewColor?: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface CoinPackage {
  id: string;
  name: string;
  coins: number;
  bonusCoins: number;
  pricePKR: number;
  priceUSD: number;
  tag?: string;
  badgeColor?: string;
  icon: string;
  description: string;
}
