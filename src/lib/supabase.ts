import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserProfile } from '../types/database';

export const SUPABASE_URL: string =
  (typeof process !== 'undefined' && (process.env?.NEXT_PUBLIC_SUPABASE_URL || process.env?.VITE_SUPABASE_URL)) ||
  ((import.meta as any).env?.VITE_SUPABASE_URL as string) ||
  ((import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL as string) ||
  'https://ptmwpjoxukybfqoppesz.supabase.co';

export const SUPABASE_ANON_KEY: string =
  (typeof process !== 'undefined' && (process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env?.VITE_SUPABASE_ANON_KEY)) ||
  ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string) ||
  ((import.meta as any).env?.NEXT_PUBLIC_SUPABASE_ANON_KEY as string) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0bXdwam94dWt5YmZxb3BwZXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMDgxOTQsImV4cCI6MjEwMzU4NDE5NH0.ny_RcJ_dKVbDU_FfD6zwkDkDJDFWxu1dIqprnzSzkfg';

export const SUPABASE_SERVICE_ROLE_KEY: string =
  (typeof process !== 'undefined' && (process.env?.SUPABASE_SERVICE_ROLE_KEY || process.env?.VITE_SUPABASE_SERVICE_ROLE_KEY)) ||
  ((import.meta as any).env?.VITE_SUPABASE_SERVICE_ROLE_KEY as string) ||
  '';

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('http')
);

// Initialize Supabase Client with Realtime enabled (public anon key)
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 20,
    },
  },
});

// Admin client with service role key for auth.admin operations (user creation, deletion)
export const supabaseAdmin: SupabaseClient | null = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

const STORAGE_KEYS = {
  PROFILE: 'royal_ludo_profile',
  CUSTOM_USERS: 'royal_ludo_users',
  FRIENDS: 'royal_ludo_friends',
  FRIEND_REQUESTS: 'royal_ludo_friend_reqs',
  ROOMS: 'royal_ludo_rooms',
  TRANSACTIONS: 'royal_ludo_txs',
  USER_MISSIONS: 'royal_ludo_missions',
  USER_ACHIEVEMENTS: 'royal_ludo_achievements',
  SETTINGS: 'royal_ludo_settings',
  INVENTORY: 'royal_ludo_inventory',
};

export function generatePlayerId(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `RL-${digits}`;
}

export function createDefaultProfile(username?: string): UserProfile {
  const randId = Math.random().toString(36).substring(2, 9);
  const pId = generatePlayerId();
  const name = username || `Monarch_${pId.replace('RL-', '')}`;

  return {
    id: `guest_${randId}`,
    username: name.toLowerCase().replace(/\s+/g, '_'),
    display_name: name,
    avatar_url: 'avatar_1',
    avatar_frame: 'frame_none',
    dice_skin: 'dice_gold',
    board_theme: 'theme_royal',
    token_skin: 'token_royal',
    player_id: pId,
    level: 1,
    xp: 0,
    coins: 1500,
    wins: 0,
    losses: 0,
    games_played: 0,
    total_captures: 0,
    best_win_streak: 0,
    current_win_streak: 0,
    is_online: true,
    is_admin: true,
    is_banned: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function getStoredProfile(): UserProfile {
  if (typeof window === 'undefined') return createDefaultProfile();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed) {
        parsed.coins = Math.max(0, Math.floor(Math.round(Number(parsed.coins) || 0)));
        parsed.xp = Math.max(0, Math.floor(Math.round(Number(parsed.xp) || 0)));
        parsed.level = Math.max(1, Math.floor(Math.round(Number(parsed.level) || 1)));
        parsed.wins = Math.max(0, Math.floor(Math.round(Number(parsed.wins) || 0)));
        parsed.losses = Math.max(0, Math.floor(Math.round(Number(parsed.losses) || 0)));
        parsed.games_played = Math.max(0, Math.floor(Math.round(Number(parsed.games_played) || 0)));
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse stored profile:', err);
  }

  const fresh = createDefaultProfile();
  saveStoredProfile(fresh);
  return fresh;
}

export function saveStoredProfile(profile: UserProfile): void {
  if (typeof window === 'undefined' || !profile) return;
  profile.coins = Math.max(0, Math.floor(Math.round(Number(profile.coins) || 0)));
  profile.xp = Math.max(0, Math.floor(Math.round(Number(profile.xp) || 0)));
  profile.level = Math.max(1, Math.floor(Math.round(Number(profile.level) || 1)));
  try {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  } catch (err) {
    console.error('Failed to save profile to storage:', err);
  }

  if (isSupabaseConfigured && profile && !profile.id.startsWith('guest_')) {
    syncProfileToSupabase(profile).catch((e) => {
      console.warn('Supabase profile sync background warning:', e?.message || e);
    });
  }
}

export async function syncProfileToSupabase(profile: UserProfile): Promise<boolean> {
  if (!isSupabaseConfigured || !profile || profile.id.startsWith('guest_')) return false;
  const client = supabaseAdmin || supabase;
  try {
    const { error } = await client.from('profiles').upsert({
      id: profile.id,
      username: profile.username,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url || 'avatar_1',
      avatar_frame: profile.avatar_frame || 'frame_none',
      dice_skin: profile.dice_skin || 'dice_gold',
      board_theme: profile.board_theme || 'theme_royal',
      token_skin: profile.token_skin || 'token_royal',
      player_id: profile.player_id,
      level: profile.level || 1,
      xp: profile.xp || 0,
      coins: profile.coins || 0,
      wins: profile.wins || 0,
      losses: profile.losses || 0,
      games_played: profile.games_played || 0,
      total_captures: profile.total_captures || 0,
      best_win_streak: profile.best_win_streak || 0,
      current_win_streak: profile.current_win_streak || 0,
      is_online: true,
      is_admin: Boolean(profile.is_admin),
      is_banned: Boolean(profile.is_banned),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.warn('Supabase profiles upsert warning:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Supabase sync exception:', e);
    return false;
  }
}

export function getStoredInventory(): string[] {
  if (typeof window === 'undefined') return ['dice_gold', 'theme_royal', 'token_royal', 'avatar_1', 'frame_none'];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INVENTORY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn(e);
  }
  const defaultItems = ['dice_gold', 'theme_royal', 'token_royal', 'avatar_1', 'frame_none'];
  localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(defaultItems));
  return defaultItems;
}

export function saveStoredInventory(items: string[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(items));
}
