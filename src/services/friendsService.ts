import { authService } from './authService';
import { UserProfile } from '../types/database';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface FriendEntry {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  player_id: string;
  level: number;
  xp: number;
  wins: number;
  is_online: boolean;
  status: 'friend' | 'pending_sent' | 'pending_received' | 'blocked';
  blockedAt?: number;
}

const DEFAULT_MOCK_FRIENDS: FriendEntry[] = [
  {
    id: 'friend_1',
    username: 'queen_valeria',
    display_name: 'Valeria the Bold',
    avatar_url: 'avatar_4',
    player_id: 'RL-7721',
    level: 14,
    xp: 4200,
    wins: 48,
    is_online: true,
    status: 'friend',
  },
  {
    id: 'friend_2',
    username: 'sir_galahad',
    display_name: 'Sir Galahad',
    avatar_url: 'avatar_3',
    player_id: 'RL-3390',
    level: 8,
    xp: 1800,
    wins: 22,
    is_online: true,
    status: 'friend',
  },
  {
    id: 'friend_3',
    username: 'mage_elys',
    display_name: 'Elysia the Mystic',
    avatar_url: 'avatar_2',
    player_id: 'RL-9104',
    level: 19,
    xp: 7600,
    wins: 89,
    is_online: false,
    status: 'friend',
  },
];

type FriendsListener = (friends: FriendEntry[]) => void;

class FriendsService {
  private friends: FriendEntry[] = [];
  private listeners: FriendsListener[] = [];

  constructor() {
    this.load();
  }

  private load() {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('royal_ludo_friends_list');
      if (raw) {
        this.friends = JSON.parse(raw);
      } else {
        this.friends = DEFAULT_MOCK_FRIENDS;
        this.save();
      }
    } catch (e) {
      console.warn(e);
      this.friends = DEFAULT_MOCK_FRIENDS;
    }
  }

  private save() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('royal_ludo_friends_list', JSON.stringify(this.friends));
      this.notify();
    } catch (e) {
      console.warn(e);
    }
  }

  public subscribe(listener: FriendsListener): () => void {
    this.listeners.push(listener);
    listener(this.friends);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l([...this.friends]));
  }

  public getFriends(): FriendEntry[] {
    return this.friends;
  }

  public getActiveFriends(): FriendEntry[] {
    return this.friends.filter((f) => f.status === 'friend');
  }

  public getBlockedUsers(): FriendEntry[] {
    return this.friends.filter((f) => f.status === 'blocked');
  }

  public isBlocked(idOrUsernameOrPlayerId: string): boolean {
    const target = idOrUsernameOrPlayerId.toLowerCase();
    return this.friends.some(
      (f) =>
        f.status === 'blocked' &&
        (f.id.toLowerCase() === target ||
          f.username.toLowerCase() === target ||
          f.player_id.toLowerCase() === target)
    );
  }

  public sendFriendRequest(query: string): { success: boolean; message: string } {
    const trimmed = query.trim();
    if (!trimmed) return { success: false, message: 'Please enter a username or Player ID' };

    const currentUser = authService.getCurrentUser();
    if (
      trimmed.toLowerCase() === currentUser.username.toLowerCase() ||
      trimmed.toUpperCase() === currentUser.player_id.toUpperCase()
    ) {
      return { success: false, message: 'You cannot add yourself as a friend' };
    }

    const existing = this.friends.find(
      (f) =>
        f.username.toLowerCase() === trimmed.toLowerCase() ||
        f.player_id.toUpperCase() === trimmed.toUpperCase()
    );

    if (existing) {
      if (existing.status === 'blocked') {
        return { success: false, message: 'This user is currently blocked. Unblock them first to send a request.' };
      }
      return { success: false, message: 'Player is already in your companions or pending requests' };
    }

    const randDigits = Math.floor(1000 + Math.random() * 9000);
    const newFriend: FriendEntry = {
      id: `friend_${Date.now()}`,
      username: trimmed.toLowerCase().replace(/[^a-z0-9_]/g, ''),
      display_name: trimmed,
      avatar_url: `avatar_${Math.floor(1 + Math.random() * 4)}`,
      player_id: `RL-${randDigits}`,
      level: Math.floor(1 + Math.random() * 10),
      xp: Math.floor(100 + Math.random() * 2000),
      wins: Math.floor(Math.random() * 20),
      is_online: true,
      status: 'pending_sent',
    };

    this.friends.push(newFriend);
    this.save();

    // Query Supabase profiles asynchronously to attach real avatar if exists
    if (isSupabaseConfigured) {
      supabase.from('profiles').select('*').or(`username.ilike.${trimmed},player_id.ilike.${trimmed}`).limit(1).then(({ data }) => {
        if (data && data.length > 0) {
          const profile = data[0];
          this.friends = this.friends.map((f) =>
            f.id === newFriend.id
              ? {
                  ...f,
                  display_name: profile.display_name,
                  avatar_url: profile.avatar_url,
                  level: profile.level,
                  xp: profile.xp,
                  wins: profile.wins,
                }
              : f
          );
          this.save();
        }
      });
    }

    return { success: true, message: `Friend request sent to ${trimmed}!` };
  }

  public acceptFriendRequest(id: string): void {
    this.friends = this.friends.map((f) =>
      f.id === id ? { ...f, status: 'friend' as const } : f
    );
    this.save();
  }

  public removeFriend(id: string): void {
    this.friends = this.friends.filter((f) => f.id !== id);
    this.save();
  }

  public unfriend(id: string): void {
    this.removeFriend(id);
  }

  public blockUser(id: string): void {
    const existing = this.friends.find((f) => f.id === id);
    if (existing) {
      this.friends = this.friends.map((f) =>
        f.id === id ? { ...f, status: 'blocked' as const, blockedAt: Date.now() } : f
      );
    } else {
      this.friends.push({
        id,
        username: `noble_${id.slice(-4)}`,
        display_name: `Noble Sovereign`,
        avatar_url: 'avatar_1',
        player_id: `RL-${id.slice(-4)}`,
        level: 1,
        xp: 0,
        wins: 0,
        is_online: false,
        status: 'blocked',
        blockedAt: Date.now(),
      });
    }
    this.save();
  }

  public unblockUser(id: string): void {
    this.friends = this.friends.filter((f) => f.id !== id);
    this.save();
  }

  public getLeaderboard(type: 'global' | 'weekly' | 'friends'): UserProfile[] {
    const currentUser = authService.getCurrentUser();

    if (type === 'friends') {
      const list = [
        currentUser,
        ...this.friends
          .filter((f) => f.status === 'friend')
          .map((f) => ({
            id: f.id,
            username: f.username,
            display_name: f.display_name,
            avatar_url: f.avatar_url,
            avatar_frame: 'frame_none',
            dice_skin: 'dice_gold',
            board_theme: 'theme_royal',
            token_skin: 'token_royal',
            player_id: f.player_id,
            level: f.level,
            xp: f.xp,
            coins: f.wins * 100 + 500,
            wins: f.wins,
            losses: Math.floor(f.wins * 0.6),
            games_played: Math.floor(f.wins * 1.6),
            total_captures: f.wins * 3,
            best_win_streak: Math.min(f.wins, 5),
            current_win_streak: 1,
            is_online: f.is_online,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })),
      ];
      return list.sort((a, b) => b.wins - a.wins || b.xp - a.xp);
    }

    const globalNobles: UserProfile[] = [
      {
        id: 'noble_1',
        username: 'emperor_aurelius',
        display_name: 'Emperor Aurelius',
        avatar_url: 'avatar_1',
        avatar_frame: 'frame_royal_crown',
        dice_skin: 'dice_obsidian',
        board_theme: 'theme_celestial_void',
        token_skin: 'token_phoenix',
        player_id: 'RL-1001',
        level: 42,
        xp: 38400,
        coins: 145000,
        wins: 342,
        losses: 48,
        games_played: 390,
        total_captures: 980,
        best_win_streak: 21,
        current_win_streak: 7,
        is_online: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'noble_2',
        username: 'lady_seraphina',
        display_name: 'Lady Seraphina',
        avatar_url: 'avatar_4',
        avatar_frame: 'frame_gold_laurel',
        dice_skin: 'dice_sapphire',
        board_theme: 'theme_emerald_citadel',
        token_skin: 'token_gem',
        player_id: 'RL-2049',
        level: 36,
        xp: 27900,
        coins: 89000,
        wins: 265,
        losses: 54,
        games_played: 319,
        total_captures: 740,
        best_win_streak: 15,
        current_win_streak: 3,
        is_online: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'noble_3',
        username: 'lord_vanguard',
        display_name: 'Lord Vanguard',
        avatar_url: 'avatar_3',
        avatar_frame: 'frame_draconic_aura',
        dice_skin: 'dice_ruby',
        board_theme: 'theme_marble',
        token_skin: 'token_royal',
        player_id: 'RL-4412',
        level: 31,
        xp: 21500,
        coins: 62000,
        wins: 210,
        losses: 62,
        games_played: 272,
        total_captures: 590,
        best_win_streak: 12,
        current_win_streak: 0,
        is_online: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'noble_4',
        username: 'sorceress_morrigan',
        display_name: 'Morrigan Shadowcaster',
        avatar_url: 'avatar_2',
        avatar_frame: 'frame_none',
        dice_skin: 'dice_obsidian',
        board_theme: 'theme_royal',
        token_skin: 'token_royal',
        player_id: 'RL-6731',
        level: 28,
        xp: 16800,
        coins: 43000,
        wins: 178,
        losses: 69,
        games_played: 247,
        total_captures: 460,
        best_win_streak: 9,
        current_win_streak: 4,
        is_online: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      currentUser,
    ];

    return globalNobles.sort((a, b) => b.wins - a.wins || b.xp - a.xp);
  }
}

export const friendsService = new FriendsService();
