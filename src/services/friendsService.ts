import { authService, StoredUserAccount } from './authService';
import { UserProfile } from '../types/database';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { sound } from '../lib/audio';

export type FriendshipStatus =
  | 'friend' // Mutual follow (Companions)
  | 'following' // I follow them (also aliased as pending_sent for legacy)
  | 'follower' // They follow me (also aliased as pending_received for legacy)
  | 'pending_sent' // Legacy alias for following
  | 'pending_received' // Legacy alias for follower
  | 'blocked'
  | 'none';

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
  followedAt?: number;
}

export interface SocialUserCard extends FriendEntry {
  relationship: 'friend' | 'following' | 'follower' | 'none' | 'blocked';
}

const GLOBAL_NOBLES: FriendEntry[] = [
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
  {
    id: 'friend_4',
    username: 'emperor_aurelius',
    display_name: 'Emperor Aurelius',
    avatar_url: 'avatar_1',
    player_id: 'RL-1001',
    level: 42,
    xp: 38400,
    wins: 342,
    is_online: true,
    status: 'pending_received', // Follower wanting follow-back
  },
  {
    id: 'friend_5',
    username: 'lady_seraphina',
    display_name: 'Lady Seraphina',
    avatar_url: 'avatar_4',
    player_id: 'RL-2049',
    level: 36,
    xp: 27900,
    wins: 265,
    is_online: true,
    status: 'pending_received', // Follower wanting follow-back
  },
  {
    id: 'friend_6',
    username: 'lord_vanguard',
    display_name: 'Lord Vanguard',
    avatar_url: 'avatar_3',
    player_id: 'RL-4412',
    level: 31,
    xp: 21500,
    wins: 210,
    is_online: false,
    status: 'pending_sent', // User is following Lord Vanguard
  },
  {
    id: 'friend_7',
    username: 'sorceress_morrigan',
    display_name: 'Morrigan Shadowcaster',
    avatar_url: 'avatar_2',
    player_id: 'RL-6731',
    level: 28,
    xp: 16800,
    wins: 178,
    is_online: true,
    status: 'friend',
  },
  {
    id: 'friend_8',
    username: 'archon_zephyr',
    display_name: 'Archon Zephyr',
    avatar_url: 'avatar_1',
    player_id: 'RL-8812',
    level: 25,
    xp: 14200,
    wins: 154,
    is_online: true,
    status: 'pending_received', // Follower wanting follow-back
  },
];

type FriendsListener = (friends: FriendEntry[]) => void;

class FriendsService {
  private friends: FriendEntry[] = [];
  private listeners: FriendsListener[] = [];
  private currentUserId: string = '';

  constructor() {
    this.initForCurrentUser();

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key && e.key.startsWith('royal_ludo_friends_')) {
          this.load();
        }
      });

      // Re-load when auth changes
      authService.subscribe((u) => {
        if (u && u.id !== this.currentUserId) {
          this.initForCurrentUser();
        }
      });

      // Realtime listener for cross-player follow sync
      if (isSupabaseConfigured) {
        try {
          supabase
            .channel('global_social_follows_sync')
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'friend_requests' },
              () => {
                this.syncWithSupabase();
              }
            )
            .subscribe();
        } catch (e) {
          console.warn('Supabase social follows sync channel error:', e);
        }
      }
    }
  }

  private getStorageKey(): string {
    const curr = authService.getCurrentUser();
    this.currentUserId = curr?.id || 'guest_default';
    return `royal_ludo_friends_${this.currentUserId}`;
  }

  private initForCurrentUser() {
    this.load();
    this.syncWithSupabase();
  }

  private load() {
    if (typeof window === 'undefined') return;
    try {
      const key = this.getStorageKey();
      const raw = localStorage.getItem(key);
      if (raw) {
        this.friends = JSON.parse(raw);
      } else {
        // Fallback or check global legacy key
        const legacy = localStorage.getItem('royal_ludo_friends_list');
        if (legacy) {
          this.friends = JSON.parse(legacy);
        } else {
          this.friends = [...GLOBAL_NOBLES];
        }
        this.save();
      }
    } catch (e) {
      console.warn(e);
      this.friends = [...GLOBAL_NOBLES];
    }
  }

  private save() {
    if (typeof window === 'undefined') return;
    try {
      const key = this.getStorageKey();
      localStorage.setItem(key, JSON.stringify(this.friends));
      localStorage.setItem('royal_ludo_friends_list', JSON.stringify(this.friends)); // keep legacy in sync
      this.notify();
    } catch (e) {
      console.warn(e);
    }
  }

  public subscribe(listener: FriendsListener): () => void {
    this.listeners.push(listener);
    listener([...this.friends]);
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

  /**
   * Mutual Companions (Both users follow each other)
   */
  public getCompanions(): FriendEntry[] {
    return this.friends.filter((f) => f.status === 'friend');
  }

  /**
   * Alias for backward compatibility with getActiveFriends
   */
  public getActiveFriends(): FriendEntry[] {
    return this.getCompanions();
  }

  /**
   * Users that the current user is following (sent follow request or following)
   */
  public getFollowing(): FriendEntry[] {
    return this.friends.filter((f) => f.status === 'pending_sent');
  }

  /**
   * Users that are following the current user (awaiting follow back)
   */
  public getFollowers(): FriendEntry[] {
    return this.friends.filter((f) => f.status === 'pending_received');
  }

  public getBlockedUsers(): FriendEntry[] {
    return this.friends.filter((f) => f.status === 'blocked');
  }

  public getSocialCounts(): {
    companions: number;
    following: number;
    followers: number;
    blocked: number;
  } {
    return {
      companions: this.getCompanions().length,
      following: this.getFollowing().length,
      followers: this.getFollowers().length,
      blocked: this.getBlockedUsers().length,
    };
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

  public getFriendshipStatus(
    idOrUsernameOrPlayerId: string
  ): 'none' | 'pending_sent' | 'pending_received' | 'friend' | 'blocked' {
    if (!idOrUsernameOrPlayerId) return 'none';
    const target = idOrUsernameOrPlayerId.toLowerCase();
    const currentUser = authService.getCurrentUser();
    if (
      target === currentUser.id.toLowerCase() ||
      target === currentUser.username.toLowerCase() ||
      target === (currentUser.player_id || '').toLowerCase()
    ) {
      return 'none';
    }

    const found = this.friends.find(
      (f) =>
        f.id.toLowerCase() === target ||
        f.username.toLowerCase() === target ||
        (f.player_id && f.player_id.toLowerCase() === target)
    );

    return found ? found.status : 'none';
  }

  /**
   * Follow a player
   * If the target user was already following the current player (pending_received),
   * this immediately makes them Mutual Companions ('friend')!
   */
  public followPlayer(player: {
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
    player_id?: string;
    level?: number;
    wins?: number;
    xp?: number;
  }): {
    success: boolean;
    message: string;
    status: 'friend' | 'pending_sent';
    isMutual: boolean;
  } {
    const currentUser = authService.getCurrentUser();
    if (
      player.id === currentUser.id ||
      player.username.toLowerCase() === currentUser.username.toLowerCase()
    ) {
      return {
        success: false,
        message: 'You cannot follow yourself.',
        status: 'pending_sent',
        isMutual: false,
      };
    }

    const existingIdx = this.friends.findIndex(
      (f) =>
        f.id === player.id ||
        f.username.toLowerCase() === player.username.toLowerCase() ||
        (player.player_id && f.player_id === player.player_id)
    );

    if (existingIdx !== -1) {
      const currentStatus = this.friends[existingIdx].status;
      if (currentStatus === 'pending_received') {
        // Automatically accept & follow back -> Mutual Companion!
        this.friends[existingIdx].status = 'friend';
        this.friends[existingIdx].followedAt = Date.now();
        this.save();
        sound.playFollowChime();
        this.saveFollowToSupabase(player.id, 'friend');

        return {
          success: true,
          message: `🤝 Followed back ${player.display_name || player.username}! You are now mutual Companions.`,
          status: 'friend',
          isMutual: true,
        };
      }
      if (currentStatus === 'friend') {
        return {
          success: true,
          message: `Already mutual companions with ${player.display_name || player.username}.`,
          status: 'friend',
          isMutual: true,
        };
      }
      return {
        success: true,
        message: `Already following ${player.display_name || player.username}.`,
        status: 'pending_sent',
        isMutual: false,
      };
    }

    const randDigits = Math.floor(1000 + Math.random() * 9000);
    const newEntry: FriendEntry = {
      id: player.id || `friend_${Date.now()}`,
      username: player.username,
      display_name: player.display_name || player.username,
      avatar_url: player.avatar_url || 'avatar_1',
      player_id: player.player_id || `RL-${randDigits}`,
      level: player.level || 1,
      xp: player.xp || (player.level || 1) * 250,
      wins: player.wins || 0,
      is_online: true,
      status: 'pending_sent',
      followedAt: Date.now(),
    };

    this.friends.push(newEntry);
    this.save();
    sound.playFollowChime();
    this.saveFollowToSupabase(player.id, 'pending');

    return {
      success: true,
      message: `✨ You are now following ${player.display_name || player.username}!`,
      status: 'pending_sent',
      isMutual: false,
    };
  }

  /**
   * Follow back a player who is in your followers list
   */
  public followBackPlayer(playerIdOrUsername: string): { success: boolean; message: string } {
    const target = playerIdOrUsername.toLowerCase();
    const idx = this.friends.findIndex(
      (f) =>
        f.id.toLowerCase() === target ||
        f.username.toLowerCase() === target ||
        f.player_id.toLowerCase() === target
    );

    if (idx !== -1) {
      this.friends[idx].status = 'friend';
      this.friends[idx].followedAt = Date.now();
      this.save();
      sound.playFollowChime();
      this.saveFollowToSupabase(this.friends[idx].id, 'friend');

      const name = this.friends[idx].display_name || this.friends[idx].username;
      return {
        success: true,
        message: `🤝 Followed back ${name}! You are now mutual Companions.`,
      };
    }

    return {
      success: false,
      message: 'Player not found in your realm.',
    };
  }

  /**
   * Unfollow a player
   * If they were mutual companions, target stays in followers (pending_received).
   * If only following, removes entry.
   */
  public unfollowPlayer(playerIdOrUsername: string): { success: boolean; message: string } {
    const target = playerIdOrUsername.toLowerCase();
    const idx = this.friends.findIndex(
      (f) =>
        f.id.toLowerCase() === target ||
        f.username.toLowerCase() === target ||
        f.player_id.toLowerCase() === target
    );

    if (idx !== -1) {
      const entry = this.friends[idx];
      const name = entry.display_name || entry.username;

      if (entry.status === 'friend') {
        // They still follow me, but I no longer follow them -> status becomes follower (pending_received)
        this.friends[idx].status = 'pending_received';
        this.save();
        return { success: true, message: `Unfollowed ${name}. They are still following you.` };
      } else {
        // Just remove from following
        this.friends = this.friends.filter((_, i) => i !== idx);
        this.save();
        return { success: true, message: `Unfollowed ${name}.` };
      }
    }

    return { success: false, message: 'User not found.' };
  }

  /**
   * Remove a follower from following the current user
   */
  public removeFollower(playerIdOrUsername: string): { success: boolean; message: string } {
    const target = playerIdOrUsername.toLowerCase();
    const idx = this.friends.findIndex(
      (f) =>
        f.id.toLowerCase() === target ||
        f.username.toLowerCase() === target ||
        f.player_id.toLowerCase() === target
    );

    if (idx !== -1) {
      const entry = this.friends[idx];
      const name = entry.display_name || entry.username;

      if (entry.status === 'friend') {
        // I still follow them, but they no longer follow me -> status becomes following (pending_sent)
        this.friends[idx].status = 'pending_sent';
      } else {
        this.friends = this.friends.filter((_, i) => i !== idx);
      }
      this.save();
      return { success: true, message: `Removed ${name} from your followers.` };
    }

    return { success: false, message: 'Follower not found.' };
  }

  public sendFriendRequest(query: string): { success: boolean; message: string } {
    const trimmed = query.trim();
    if (!trimmed) return { success: false, message: 'Please enter a username or Player ID' };

    const currentUser = authService.getCurrentUser();
    if (
      trimmed.toLowerCase() === currentUser.username.toLowerCase() ||
      trimmed.toUpperCase() === currentUser.player_id.toUpperCase()
    ) {
      return { success: false, message: 'You cannot add yourself.' };
    }

    // Check if player exists in registered users or global nobles
    const registered = authService.getRegisteredUsers();
    const foundReg = registered.find(
      (u) =>
        u.username.toLowerCase() === trimmed.toLowerCase() ||
        u.player_id.toUpperCase() === trimmed.toUpperCase() ||
        u.email?.toLowerCase() === trimmed.toLowerCase()
    );

    if (foundReg) {
      const res = this.followPlayer({
        id: foundReg.id,
        username: foundReg.username,
        display_name: foundReg.display_name,
        avatar_url: foundReg.avatar_url,
        player_id: foundReg.player_id,
        level: foundReg.level,
        wins: foundReg.wins,
        xp: foundReg.xp,
      });
      return { success: true, message: res.message };
    }

    const existing = this.friends.find(
      (f) =>
        f.username.toLowerCase() === trimmed.toLowerCase() ||
        f.player_id.toUpperCase() === trimmed.toUpperCase()
    );

    if (existing) {
      if (existing.status === 'blocked') {
        return {
          success: false,
          message: 'This user is currently blocked. Unblock them first.',
        };
      }
      if (existing.status === 'pending_received') {
        return this.followBackPlayer(existing.id);
      }
      return {
        success: false,
        message: 'Player is already in your companions or following list.',
      };
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
      followedAt: Date.now(),
    };

    this.friends.push(newFriend);
    this.save();
    sound.playFollowChime();

    // Query Supabase profiles asynchronously to attach real avatar & details if available
    if (isSupabaseConfigured) {
      supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.${trimmed},player_id.ilike.${trimmed}`)
        .limit(1)
        .then(({ data }) => {
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

    return { success: true, message: `✨ Follow request sent to ${trimmed}!` };
  }

  public acceptFriendRequest(id: string): void {
    this.followBackPlayer(id);
  }

  public removeFriend(id: string): void {
    this.unfollowPlayer(id);
  }

  public unfriend(id: string): void {
    this.unfollowPlayer(id);
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

  /**
   * Search across all registered users and noble characters
   */
  public searchAllNobles(query: string): SocialUserCard[] {
    const q = query.trim().toLowerCase();
    const currentUser = authService.getCurrentUser();
    const registered = authService.getRegisteredUsers();

    // Map registered users to FriendEntry cards
    const allCandidates: FriendEntry[] = [
      ...registered
        .filter((u) => u.id !== currentUser.id)
        .map((u) => ({
          id: u.id,
          username: u.username,
          display_name: u.display_name,
          avatar_url: u.avatar_url || 'avatar_1',
          player_id: u.player_id,
          level: u.level || 1,
          xp: u.xp || 0,
          wins: u.wins || 0,
          is_online: true,
          status: 'pending_sent' as const,
        })),
      ...GLOBAL_NOBLES,
    ];

    // Deduplicate by ID and username
    const uniqueMap = new Map<string, FriendEntry>();
    allCandidates.forEach((c) => {
      if (!uniqueMap.has(c.id) && !uniqueMap.has(c.username.toLowerCase())) {
        uniqueMap.set(c.id, c);
      }
    });

    const list = Array.from(uniqueMap.values());

    const filtered = q
      ? list.filter(
          (u) =>
            u.username.toLowerCase().includes(q) ||
            u.display_name.toLowerCase().includes(q) ||
            u.player_id.toLowerCase().includes(q)
        )
      : list;

    return filtered.map((u) => {
      const currentStatus = this.getFriendshipStatus(u.id);
      let relationship: SocialUserCard['relationship'] = 'none';
      if (currentStatus === 'friend') relationship = 'friend';
      else if (currentStatus === 'pending_sent') relationship = 'following';
      else if (currentStatus === 'pending_received') relationship = 'follower';
      else if (currentStatus === 'blocked') relationship = 'blocked';

      return {
        ...u,
        relationship,
      };
    });
  }

  /**
   * Suggested players to follow
   */
  public getSuggestedNobles(): SocialUserCard[] {
    const all = this.searchAllNobles('');
    return all.filter((u) => u.relationship === 'none' || u.relationship === 'follower').slice(0, 6);
  }

  private async saveFollowToSupabase(targetId: string, status: string) {
    if (!isSupabaseConfigured) return;
    const currentUser = authService.getCurrentUser();
    if (!currentUser || currentUser.id.startsWith('guest_')) return;

    try {
      if (status === 'friend') {
        await supabase.from('friends').upsert([
          { user_id: currentUser.id, friend_id: targetId },
          { user_id: targetId, friend_id: currentUser.id },
        ]);
      } else {
        await supabase.from('friend_requests').upsert({
          sender_id: currentUser.id,
          receiver_id: targetId,
          status: 'pending',
        });
      }
    } catch (e) {
      console.warn('Supabase follow sync warning:', e);
    }
  }

  private async syncWithSupabase() {
    if (!isSupabaseConfigured) return;
    const currentUser = authService.getCurrentUser();
    if (!currentUser || currentUser.id.startsWith('guest_')) return;

    try {
      // Fetch mutual friends
      const { data: friendsData } = await supabase
        .from('friends')
        .select('friend_id')
        .eq('user_id', currentUser.id);

      if (friendsData && friendsData.length > 0) {
        const friendIds = friendsData.map((f: any) => f.friend_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', friendIds);

        if (profiles && profiles.length > 0) {
          profiles.forEach((p: any) => {
            const exists = this.friends.findIndex((f) => f.id === p.id);
            if (exists !== -1) {
              this.friends[exists].status = 'friend';
              this.friends[exists].display_name = p.display_name;
              this.friends[exists].avatar_url = p.avatar_url;
              this.friends[exists].level = p.level;
              this.friends[exists].wins = p.wins;
            } else {
              this.friends.push({
                id: p.id,
                username: p.username,
                display_name: p.display_name,
                avatar_url: p.avatar_url || 'avatar_1',
                player_id: p.player_id,
                level: p.level || 1,
                xp: p.xp || 0,
                wins: p.wins || 0,
                is_online: true,
                status: 'friend',
              });
            }
          });
          this.save();
        }
      }

      // Fetch pending requests received (followers)
      const { data: reqs } = await supabase
        .from('friend_requests')
        .select('sender_id')
        .eq('receiver_id', currentUser.id)
        .eq('status', 'pending');

      if (reqs && reqs.length > 0) {
        const senderIds = reqs.map((r: any) => r.sender_id);
        const { data: senderProfiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', senderIds);

        if (senderProfiles && senderProfiles.length > 0) {
          senderProfiles.forEach((p: any) => {
            const exists = this.friends.findIndex((f) => f.id === p.id);
            if (exists !== -1) {
              if (this.friends[exists].status !== 'friend') {
                this.friends[exists].status = 'pending_received';
              }
            } else {
              this.friends.push({
                id: p.id,
                username: p.username,
                display_name: p.display_name,
                avatar_url: p.avatar_url || 'avatar_1',
                player_id: p.player_id,
                level: p.level || 1,
                xp: p.xp || 0,
                wins: p.wins || 0,
                is_online: true,
                status: 'pending_received',
              });
            }
          });
          this.save();
        }
      }
    } catch (e) {
      console.warn('Supabase social sync error:', e);
    }
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
