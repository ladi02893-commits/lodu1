import { authService, StoredUserAccount } from './authService';
import { UserProfile } from '../types/database';
import { supabase, isSupabaseConfigured, supabaseAdmin } from '../lib/supabase';
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

export interface UniversalSocialRequest {
  id: string;
  senderId: string;
  senderUsername: string;
  senderDisplayName: string;
  senderAvatar: string;
  senderPlayerId: string;
  senderLevel: number;
  senderWins: number;
  senderXp: number;

  receiverId: string;
  receiverUsername: string;
  receiverDisplayName: string;
  receiverPlayerId: string;

  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
  updatedAt: number;
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

const UNIVERSAL_LEDGER_KEY = 'royal_ludo_universal_social_ledger';
const SOCIAL_BROADCAST_CHANNEL = 'royal_ludo_social_sync_channel';

type FriendsListener = (friends: FriendEntry[]) => void;

class FriendsService {
  private friends: FriendEntry[] = [];
  private listeners: FriendsListener[] = [];
  private currentUserId: string = '';
  private broadcastChannel: BroadcastChannel | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        if ('BroadcastChannel' in window) {
          this.broadcastChannel = new BroadcastChannel(SOCIAL_BROADCAST_CHANNEL);
          this.broadcastChannel.onmessage = (event) => {
            if (event.data?.type === 'SOCIAL_UPDATE') {
              this.load();
            }
          };
        }
      } catch (e) {
        console.warn('BroadcastChannel setup note:', e);
      }

      window.addEventListener('storage', (e) => {
        if (
          e.key &&
          (e.key.startsWith('royal_ludo_friends_') ||
            e.key === UNIVERSAL_LEDGER_KEY ||
            e.key === 'royal_ludo_friends_list')
        ) {
          this.load();
        }
      });

      window.addEventListener('royal_ludo_social_sync', () => {
        this.load();
      });

      authService.subscribe((u) => {
        if (u && u.id !== this.currentUserId) {
          this.initForCurrentUser();
        }
      });

      // Realtime listener for cross-player follow sync in Supabase
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
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'friends' },
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

    this.initForCurrentUser();
  }

  private getStorageKey(userId?: string): string {
    const curr = authService.getCurrentUser();
    const uid = userId || curr?.id || 'guest_default';
    this.currentUserId = uid;
    return `royal_ludo_friends_${uid}`;
  }

  private initForCurrentUser() {
    this.load();
    this.syncWithSupabase();
  }

  // --- Universal Cross-Account Ledger ---
  private getUniversalLedger(): UniversalSocialRequest[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(UNIVERSAL_LEDGER_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('Failed to parse universal ledger:', e);
      return [];
    }
  }

  private saveUniversalLedger(ledger: UniversalSocialRequest[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(UNIVERSAL_LEDGER_KEY, JSON.stringify(ledger));
    } catch (e) {
      console.warn('Failed to save universal ledger:', e);
    }
  }

  private broadcastChange() {
    if (typeof window === 'undefined') return;
    try {
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({ type: 'SOCIAL_UPDATE', timestamp: Date.now() });
      }
      window.dispatchEvent(new CustomEvent('royal_ludo_social_sync'));
    } catch (e) {
      console.warn(e);
    }
  }

  /**
   * Loads and integrates:
   * 1. Private User Storage (`royal_ludo_friends_${uid}`)
   * 2. Universal Requests Ledger (`royal_ludo_universal_social_ledger`)
   * 3. Default Nobles for active gameplay experience
   */
  private load() {
    if (typeof window === 'undefined') return;
    const currentUser = authService.getCurrentUser();
    this.currentUserId = currentUser?.id || 'guest_default';

    try {
      const key = this.getStorageKey(this.currentUserId);
      const raw = localStorage.getItem(key);
      let localList: FriendEntry[] = raw ? JSON.parse(raw) : [];

      // If local list is completely empty, populate with base mock nobles
      if (localList.length === 0) {
        const legacy = localStorage.getItem('royal_ludo_friends_list');
        if (legacy) {
          try {
            localList = JSON.parse(legacy);
          } catch {
            localList = [...GLOBAL_NOBLES];
          }
        } else {
          localList = [...GLOBAL_NOBLES];
        }
      }

      // Merge Universal Ledger requests for current user
      const ledger = this.getUniversalLedger();
      const myId = this.currentUserId.toLowerCase();
      const myUsername = (currentUser.username || '').toLowerCase();
      const myPlayerId = (currentUser.player_id || '').toLowerCase();

      ledger.forEach((req) => {
        const isReceiver =
          req.receiverId.toLowerCase() === myId ||
          req.receiverUsername.toLowerCase() === myUsername ||
          req.receiverPlayerId.toLowerCase() === myPlayerId;

        const isSender =
          req.senderId.toLowerCase() === myId ||
          req.senderUsername.toLowerCase() === myUsername ||
          req.senderPlayerId.toLowerCase() === myPlayerId;

        if (isReceiver) {
          // Someone sent a request / followed ME
          const senderIdx = localList.findIndex(
            (f) =>
              f.id.toLowerCase() === req.senderId.toLowerCase() ||
              f.username.toLowerCase() === req.senderUsername.toLowerCase() ||
              f.player_id.toLowerCase() === req.senderPlayerId.toLowerCase()
          );

          if (req.status === 'accepted') {
            if (senderIdx !== -1) {
              localList[senderIdx].status = 'friend';
            } else {
              localList.unshift({
                id: req.senderId,
                username: req.senderUsername,
                display_name: req.senderDisplayName,
                avatar_url: req.senderAvatar || 'avatar_1',
                player_id: req.senderPlayerId,
                level: req.senderLevel || 1,
                xp: req.senderXp || 0,
                wins: req.senderWins || 0,
                is_online: true,
                status: 'friend',
                followedAt: req.updatedAt || req.createdAt,
              });
            }
          } else if (req.status === 'pending') {
            if (senderIdx !== -1) {
              if (localList[senderIdx].status !== 'friend' && localList[senderIdx].status !== 'blocked') {
                localList[senderIdx].status = 'pending_received';
              }
            } else {
              localList.unshift({
                id: req.senderId,
                username: req.senderUsername,
                display_name: req.senderDisplayName,
                avatar_url: req.senderAvatar || 'avatar_1',
                player_id: req.senderPlayerId,
                level: req.senderLevel || 1,
                xp: req.senderXp || 0,
                wins: req.senderWins || 0,
                is_online: true,
                status: 'pending_received',
                followedAt: req.createdAt,
              });
            }
          } else if (req.status === 'rejected') {
            if (senderIdx !== -1 && localList[senderIdx].status === 'pending_received') {
              localList.splice(senderIdx, 1);
            }
          }
        } else if (isSender) {
          // I sent a request / followed SOMEONE
          const receiverIdx = localList.findIndex(
            (f) =>
              f.id.toLowerCase() === req.receiverId.toLowerCase() ||
              f.username.toLowerCase() === req.receiverUsername.toLowerCase() ||
              f.player_id.toLowerCase() === req.receiverPlayerId.toLowerCase()
          );

          if (req.status === 'accepted') {
            if (receiverIdx !== -1) {
              localList[receiverIdx].status = 'friend';
            } else {
              localList.push({
                id: req.receiverId,
                username: req.receiverUsername,
                display_name: req.receiverDisplayName,
                avatar_url: 'avatar_1',
                player_id: req.receiverPlayerId,
                level: 1,
                xp: 0,
                wins: 0,
                is_online: true,
                status: 'friend',
                followedAt: req.updatedAt || req.createdAt,
              });
            }
          } else if (req.status === 'pending') {
            if (receiverIdx !== -1) {
              if (localList[receiverIdx].status !== 'friend') {
                localList[receiverIdx].status = 'pending_sent';
              }
            } else {
              localList.push({
                id: req.receiverId,
                username: req.receiverUsername,
                display_name: req.receiverDisplayName,
                avatar_url: 'avatar_1',
                player_id: req.receiverPlayerId,
                level: 1,
                xp: 0,
                wins: 0,
                is_online: true,
                status: 'pending_sent',
                followedAt: req.createdAt,
              });
            }
          }
        }
      });

      this.friends = localList;
      this.saveLocalOnly();
    } catch (e) {
      console.warn('Friends load error:', e);
      this.friends = [...GLOBAL_NOBLES];
    }
  }

  private saveLocalOnly() {
    if (typeof window === 'undefined') return;
    try {
      const key = this.getStorageKey(this.currentUserId);
      localStorage.setItem(key, JSON.stringify(this.friends));
      localStorage.setItem('royal_ludo_friends_list', JSON.stringify(this.friends));
      this.notify();
    } catch (e) {
      console.warn(e);
    }
  }

  private save() {
    this.saveLocalOnly();
    this.broadcastChange();
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

  public getActiveFriends(): FriendEntry[] {
    return this.getCompanions();
  }

  /**
   * Users that the current user is following
   */
  public getFollowing(): FriendEntry[] {
    return this.friends.filter((f) => f.status === 'pending_sent');
  }

  /**
   * Users that are following the current user (incoming requests / followers)
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
   * Follow or Send Friend Request to another Player
   * Writes to:
   * 1. Current user's local storage (Following / pending_sent)
   * 2. Target user's local storage (Follower / pending_received)
   * 3. Universal Ledger
   * 4. Supabase DB
   * 5. Real-time Notification Dispatch
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

    const targetId = player.id;
    const targetUsername = player.username;
    const targetDisplayName = player.display_name || player.username;
    const targetPlayerId = player.player_id || `RL-${Math.floor(1000 + Math.random() * 9000)}`;

    const existingIdx = this.friends.findIndex(
      (f) =>
        f.id.toLowerCase() === targetId.toLowerCase() ||
        f.username.toLowerCase() === targetUsername.toLowerCase() ||
        (player.player_id && f.player_id.toLowerCase() === player.player_id.toLowerCase())
    );

    // Case 1: Target was already following current user -> Follow Back! (Instant Mutual Companion)
    if (existingIdx !== -1 && this.friends[existingIdx].status === 'pending_received') {
      return this.acceptAndFollowBack(this.friends[existingIdx]);
    }

    if (existingIdx !== -1 && this.friends[existingIdx].status === 'friend') {
      return {
        success: true,
        message: `Already mutual companions with ${targetDisplayName}.`,
        status: 'friend',
        isMutual: true,
      };
    }

    // Case 2: New Follow Request
    const newEntry: FriendEntry = {
      id: targetId,
      username: targetUsername,
      display_name: targetDisplayName,
      avatar_url: player.avatar_url || 'avatar_1',
      player_id: targetPlayerId,
      level: player.level || 1,
      xp: player.xp || (player.level || 1) * 250,
      wins: player.wins || 0,
      is_online: true,
      status: 'pending_sent',
      followedAt: Date.now(),
    };

    if (existingIdx !== -1) {
      this.friends[existingIdx] = newEntry;
    } else {
      this.friends.push(newEntry);
    }
    this.saveLocalOnly();

    // 1. Record in Universal Ledger
    const ledger = this.getUniversalLedger();
    const reqId = `req_${currentUser.id}_${targetId}`;
    const ledgerIdx = ledger.findIndex(
      (r) =>
        (r.senderId === currentUser.id && r.receiverId === targetId) ||
        (r.senderUsername.toLowerCase() === currentUser.username.toLowerCase() &&
          r.receiverUsername.toLowerCase() === targetUsername.toLowerCase())
    );

    const universalRecord: UniversalSocialRequest = {
      id: reqId,
      senderId: currentUser.id,
      senderUsername: currentUser.username,
      senderDisplayName: currentUser.display_name,
      senderAvatar: currentUser.avatar_url || 'avatar_1',
      senderPlayerId: currentUser.player_id,
      senderLevel: currentUser.level || 1,
      senderWins: currentUser.wins || 0,
      senderXp: currentUser.xp || 0,

      receiverId: targetId,
      receiverUsername: targetUsername,
      receiverDisplayName: targetDisplayName,
      receiverPlayerId: targetPlayerId,

      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (ledgerIdx !== -1) {
      ledger[ledgerIdx] = universalRecord;
    } else {
      ledger.unshift(universalRecord);
    }
    this.saveUniversalLedger(ledger);

    // 2. Direct update into Target User's local storage partition so Target receives it immediately
    this.injectRequestIntoTargetStorage(universalRecord);

    // 3. Supabase Cloud Sync
    this.saveFollowToSupabase(universalRecord);

    // 4. Sound & Dispatch Notification Event for Target User
    sound.playFollowChime();
    this.dispatchTargetNotification(
      targetId,
      '👑 Companion Request Received',
      `${currentUser.display_name} (#${currentUser.player_id}) sent you a follow request!`
    );

    this.broadcastChange();

    return {
      success: true,
      message: `✨ Follow request sent to ${targetDisplayName}!`,
      status: 'pending_sent',
      isMutual: false,
    };
  }

  /**
   * Helper to write incoming follow into the target user's local storage key
   */
  private injectRequestIntoTargetStorage(req: UniversalSocialRequest) {
    if (typeof window === 'undefined') return;
    try {
      const targetStorageKey = `royal_ludo_friends_${req.receiverId}`;
      const raw = localStorage.getItem(targetStorageKey);
      let targetList: FriendEntry[] = raw ? JSON.parse(raw) : [...GLOBAL_NOBLES];

      const idx = targetList.findIndex(
        (f) =>
          f.id.toLowerCase() === req.senderId.toLowerCase() ||
          f.username.toLowerCase() === req.senderUsername.toLowerCase() ||
          f.player_id.toLowerCase() === req.senderPlayerId.toLowerCase()
      );

      const incomingEntry: FriendEntry = {
        id: req.senderId,
        username: req.senderUsername,
        display_name: req.senderDisplayName,
        avatar_url: req.senderAvatar || 'avatar_1',
        player_id: req.senderPlayerId,
        level: req.senderLevel || 1,
        xp: req.senderXp || 0,
        wins: req.senderWins || 0,
        is_online: true,
        status: req.status === 'accepted' ? 'friend' : 'pending_received',
        followedAt: req.createdAt,
      };

      if (idx !== -1) {
        targetList[idx] = incomingEntry;
      } else {
        targetList.unshift(incomingEntry);
      }

      localStorage.setItem(targetStorageKey, JSON.stringify(targetList));
    } catch (e) {
      console.warn('Failed to inject request into target storage:', e);
    }
  }

  private dispatchTargetNotification(targetUserId: string, title: string, message: string) {
    if (typeof window === 'undefined') return;
    try {
      window.dispatchEvent(
        new CustomEvent('royal_ludo_notification', {
          detail: {
            targetUserId,
            title,
            message,
          },
        })
      );
    } catch (e) {
      console.warn(e);
    }
  }

  /**
   * Accept request and follow back -> Upgrades to Mutual Companions
   */
  public acceptAndFollowBack(player: FriendEntry | { id: string; username?: string; display_name?: string }): {
    success: boolean;
    message: string;
    status: 'friend';
    isMutual: true;
  } {
    const currentUser = authService.getCurrentUser();
    const targetId = player.id;

    // 1. Update current user's list
    const myIdx = this.friends.findIndex(
      (f) => f.id.toLowerCase() === targetId.toLowerCase() || (player.username && f.username.toLowerCase() === player.username.toLowerCase())
    );

    const name = player.display_name || player.username || 'Monarch';

    if (myIdx !== -1) {
      this.friends[myIdx].status = 'friend';
      this.friends[myIdx].followedAt = Date.now();
    } else {
      this.friends.unshift({
        id: targetId,
        username: player.username || `player_${targetId.slice(-4)}`,
        display_name: name,
        avatar_url: 'avatar_1',
        player_id: `RL-${Math.floor(1000 + Math.random() * 9000)}`,
        level: 1,
        xp: 0,
        wins: 0,
        is_online: true,
        status: 'friend',
        followedAt: Date.now(),
      });
    }
    this.saveLocalOnly();

    // 2. Update Universal Ledger to 'accepted'
    const ledger = this.getUniversalLedger();
    const matched = ledger.find(
      (r) =>
        (r.senderId === targetId && r.receiverId === currentUser.id) ||
        (r.senderId === currentUser.id && r.receiverId === targetId) ||
        (player.username && r.senderUsername.toLowerCase() === player.username.toLowerCase() && r.receiverUsername.toLowerCase() === currentUser.username.toLowerCase())
    );

    if (matched) {
      matched.status = 'accepted';
      matched.updatedAt = Date.now();
    } else {
      ledger.unshift({
        id: `req_${targetId}_${currentUser.id}`,
        senderId: targetId,
        senderUsername: player.username || 'noble',
        senderDisplayName: name,
        senderAvatar: 'avatar_1',
        senderPlayerId: 'RL-1000',
        senderLevel: 1,
        senderWins: 0,
        senderXp: 0,
        receiverId: currentUser.id,
        receiverUsername: currentUser.username,
        receiverDisplayName: currentUser.display_name,
        receiverPlayerId: currentUser.player_id,
        status: 'accepted',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    this.saveUniversalLedger(ledger);

    // 3. Update Sender's storage key to 'friend'
    try {
      const senderStorageKey = `royal_ludo_friends_${targetId}`;
      const raw = localStorage.getItem(senderStorageKey);
      let senderList: FriendEntry[] = raw ? JSON.parse(raw) : [...GLOBAL_NOBLES];

      const sIdx = senderList.findIndex(
        (f) =>
          f.id.toLowerCase() === currentUser.id.toLowerCase() ||
          f.username.toLowerCase() === currentUser.username.toLowerCase()
      );

      const companionEntry: FriendEntry = {
        id: currentUser.id,
        username: currentUser.username,
        display_name: currentUser.display_name,
        avatar_url: currentUser.avatar_url || 'avatar_1',
        player_id: currentUser.player_id,
        level: currentUser.level || 1,
        xp: currentUser.xp || 0,
        wins: currentUser.wins || 0,
        is_online: true,
        status: 'friend',
        followedAt: Date.now(),
      };

      if (sIdx !== -1) {
        senderList[sIdx] = companionEntry;
      } else {
        senderList.unshift(companionEntry);
      }
      localStorage.setItem(senderStorageKey, JSON.stringify(senderList));
    } catch (e) {
      console.warn('Sender storage companion sync error:', e);
    }

    // 4. Supabase Cloud Sync (Mutual friendship)
    this.saveMutualFriendshipToSupabase(currentUser.id, targetId);

    // 5. Sound & Notify Sender
    sound.playFollowChime();
    this.dispatchTargetNotification(
      targetId,
      '🤝 Request Accepted & Followed Back!',
      `${currentUser.display_name} followed you back! You are now mutual Companions.`
    );

    this.broadcastChange();

    return {
      success: true,
      message: `🤝 Followed back ${name}! You are now mutual Companions.`,
      status: 'friend',
      isMutual: true,
    };
  }

  /**
   * Follow back button handler
   */
  public followBackPlayer(playerIdOrUsername: string): { success: boolean; message: string } {
    const target = playerIdOrUsername.toLowerCase();
    const found = this.friends.find(
      (f) =>
        f.id.toLowerCase() === target ||
        f.username.toLowerCase() === target ||
        f.player_id.toLowerCase() === target
    );

    if (found) {
      const res = this.acceptAndFollowBack(found);
      return { success: res.success, message: res.message };
    }

    // Look up in registered accounts
    const registered = authService.getRegisteredUsers();
    const regUser = registered.find(
      (u) =>
        u.id.toLowerCase() === target ||
        u.username.toLowerCase() === target ||
        u.player_id.toLowerCase() === target
    );

    if (regUser) {
      const res = this.acceptAndFollowBack({
        id: regUser.id,
        username: regUser.username,
        display_name: regUser.display_name,
      });
      return { success: res.success, message: res.message };
    }

    return {
      success: false,
      message: 'Player not found in your realm.',
    };
  }

  /**
   * Accept incoming request without necessarily following back
   */
  public acceptRequest(playerId: string): { success: boolean; message: string } {
    return this.followBackPlayer(playerId);
  }

  /**
   * Decline incoming request
   */
  public declineRequest(playerId: string): { success: boolean; message: string } {
    const currentUser = authService.getCurrentUser();
    const target = playerId.toLowerCase();

    // Remove from current user's list
    this.friends = this.friends.filter(
      (f) =>
        f.id.toLowerCase() !== target &&
        f.username.toLowerCase() !== target &&
        f.player_id.toLowerCase() !== target
    );
    this.saveLocalOnly();

    // Update Universal Ledger to 'rejected'
    const ledger = this.getUniversalLedger();
    const matched = ledger.find(
      (r) =>
        (r.senderId.toLowerCase() === target && r.receiverId === currentUser.id) ||
        (r.senderUsername.toLowerCase() === target && r.receiverUsername.toLowerCase() === currentUser.username.toLowerCase())
    );

    if (matched) {
      matched.status = 'rejected';
      matched.updatedAt = Date.now();
      this.saveUniversalLedger(ledger);
    }

    if (isSupabaseConfigured) {
      supabase
        .from('friend_requests')
        .update({ status: 'rejected' })
        .eq('sender_id', playerId)
        .eq('receiver_id', currentUser.id)
        .then();
    }

    this.broadcastChange();
    return { success: true, message: 'Request declined.' };
  }

  /**
   * Unfollow a player
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
        this.friends[idx].status = 'pending_received';
        this.save();
        return { success: true, message: `Unfollowed ${name}. They are still following you.` };
      } else {
        this.friends = this.friends.filter((_, i) => i !== idx);
        this.save();
        return { success: true, message: `Unfollowed ${name}.` };
      }
    }

    return { success: false, message: 'User not found.' };
  }

  /**
   * Remove a follower
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
      trimmed.toUpperCase() === currentUser.player_id.toUpperCase() ||
      (currentUser.email && trimmed.toLowerCase() === currentUser.email.toLowerCase())
    ) {
      return { success: false, message: 'You cannot add yourself.' };
    }

    // 1. Check registered users list first
    const registered = authService.getRegisteredUsers();
    const foundReg = registered.find(
      (u) =>
        u.username.toLowerCase() === trimmed.toLowerCase() ||
        u.player_id.toUpperCase() === trimmed.toUpperCase() ||
        u.email?.toLowerCase() === trimmed.toLowerCase() ||
        u.display_name.toLowerCase() === trimmed.toLowerCase()
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

    // 2. Check global mock nobles
    const foundNoble = GLOBAL_NOBLES.find(
      (n) =>
        n.username.toLowerCase() === trimmed.toLowerCase() ||
        n.player_id.toUpperCase() === trimmed.toUpperCase() ||
        n.display_name.toLowerCase() === trimmed.toLowerCase()
    );

    if (foundNoble) {
      const res = this.followPlayer(foundNoble);
      return { success: true, message: res.message };
    }

    // 3. Fallback: Create dynamic noble card
    const randDigits = Math.floor(1000 + Math.random() * 9000);
    const newTarget = {
      id: `noble_user_${Date.now()}`,
      username: trimmed.toLowerCase().replace(/[^a-z0-9_]/g, ''),
      display_name: trimmed,
      avatar_url: `avatar_${Math.floor(1 + Math.random() * 4)}`,
      player_id: `RL-${randDigits}`,
      level: Math.floor(1 + Math.random() * 10),
      xp: Math.floor(100 + Math.random() * 2000),
      wins: Math.floor(Math.random() * 20),
    };

    const res = this.followPlayer(newTarget);
    return { success: true, message: res.message };
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

    const allCandidates: FriendEntry[] = [
      ...registered
        .filter((u) => u.id !== currentUser.id && u.username.toLowerCase() !== currentUser.username.toLowerCase())
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

  public getSuggestedNobles(): SocialUserCard[] {
    const all = this.searchAllNobles('');
    return all.filter((u) => u.relationship === 'none' || u.relationship === 'follower').slice(0, 8);
  }

  // --- Cloud Sync Helpers ---
  private async saveFollowToSupabase(req: UniversalSocialRequest) {
    if (!isSupabaseConfigured) return;
    try {
      const dbClient = supabaseAdmin || supabase;
      await dbClient.from('friend_requests').upsert({
        id: req.id,
        sender_id: req.senderId,
        receiver_id: req.receiverId,
        status: req.status,
        created_at: new Date(req.createdAt).toISOString(),
      });
    } catch (e) {
      console.warn('Supabase follow save warning:', e);
    }
  }

  private async saveMutualFriendshipToSupabase(userAId: string, userBId: string) {
    if (!isSupabaseConfigured) return;
    try {
      const dbClient = supabaseAdmin || supabase;
      await dbClient.from('friends').upsert([
        { user_id: userAId, friend_id: userBId },
        { user_id: userBId, friend_id: userAId },
      ]);
      await dbClient
        .from('friend_requests')
        .update({ status: 'accepted' })
        .or(`and(sender_id.eq.${userAId},receiver_id.eq.${userBId}),and(sender_id.eq.${userBId},receiver_id.eq.${userAId})`);
    } catch (e) {
      console.warn('Supabase mutual friendship sync warning:', e);
    }
  }

  private async syncWithSupabase() {
    if (!isSupabaseConfigured) return;
    const currentUser = authService.getCurrentUser();
    if (!currentUser || !currentUser.id) return;

    try {
      const dbClient = supabaseAdmin || supabase;

      // 1. Fetch mutual friends from DB
      const { data: friendsData } = await dbClient
        .from('friends')
        .select('friend_id')
        .eq('user_id', currentUser.id);

      if (friendsData && friendsData.length > 0) {
        const friendIds = friendsData.map((f: any) => f.friend_id);
        const { data: profiles } = await dbClient
          .from('profiles')
          .select('*')
          .in('id', friendIds);

        if (profiles && profiles.length > 0) {
          profiles.forEach((p: any) => {
            const exists = this.friends.findIndex((f) => f.id === p.id);
            if (exists !== -1) {
              this.friends[exists].status = 'friend';
              this.friends[exists].display_name = p.display_name || this.friends[exists].display_name;
              this.friends[exists].avatar_url = p.avatar_url || this.friends[exists].avatar_url;
              this.friends[exists].level = p.level || this.friends[exists].level;
              this.friends[exists].wins = p.wins || this.friends[exists].wins;
            } else {
              this.friends.unshift({
                id: p.id,
                username: p.username || 'noble',
                display_name: p.display_name || 'Noble Companion',
                avatar_url: p.avatar_url || 'avatar_1',
                player_id: p.player_id || 'RL-1000',
                level: p.level || 1,
                xp: p.xp || 0,
                wins: p.wins || 0,
                is_online: true,
                status: 'friend',
              });
            }
          });
          this.saveLocalOnly();
        }
      }

      // 2. Fetch pending requests received (Followers awaiting acceptance)
      const { data: reqs } = await dbClient
        .from('friend_requests')
        .select('*')
        .eq('receiver_id', currentUser.id)
        .eq('status', 'pending');

      if (reqs && reqs.length > 0) {
        const senderIds = reqs.map((r: any) => r.sender_id);
        const { data: senderProfiles } = await dbClient
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
              this.friends.unshift({
                id: p.id,
                username: p.username || 'noble',
                display_name: p.display_name || 'Noble Follower',
                avatar_url: p.avatar_url || 'avatar_1',
                player_id: p.player_id || 'RL-1000',
                level: p.level || 1,
                xp: p.xp || 0,
                wins: p.wins || 0,
                is_online: true,
                status: 'pending_received',
              });
            }
          });
          this.saveLocalOnly();
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
