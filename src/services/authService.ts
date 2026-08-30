import { createDefaultProfile, getStoredProfile, saveStoredProfile, supabase, supabaseAdmin, isSupabaseConfigured } from '../lib/supabase';
import { TransactionRecord, TransactionType, UserProfile } from '../types/database';

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
}

export interface StoredUserAccount {
  id: string;
  email: string;
  passwordHash: string; // In-browser secure stored password
  display_name: string;
  username: string;
  player_id: string;
  is_admin: boolean;
  is_banned: boolean;
  is_vip: boolean;
  role: 'admin' | 'user' | 'moderator';
  level: number;
  xp: number;
  coins: number;
  wins: number;
  losses: number;
  games_played: number;
  total_captures: number;
  best_win_streak: number;
  current_win_streak: number;
  avatar_url: string;
  avatar_frame: string;
  dice_skin: string;
  board_theme: string;
  token_skin: string;
  created_at: string;
  updated_at: string;
  last_active: string;
}

const REGISTERED_USERS_KEY = 'royal_ludo_registered_users';
const TRANSACTIONS_KEY = 'royal_ludo_transactions';

// Initialize the master Admin account: ammaarahmd6@gmail.com / ammar123
const DEFAULT_ADMIN_ACCOUNT: StoredUserAccount = {
  id: 'admin_ammar_001',
  email: 'ammaarahmd6@gmail.com',
  passwordHash: 'ammar123',
  display_name: 'Ammar (Imperial Admin)',
  username: 'ammar_admin',
  player_id: 'RL-7777',
  is_admin: true,
  is_banned: false,
  is_vip: true,
  role: 'admin',
  level: 99,
  xp: 50000,
  coins: 999999,
  wins: 500,
  losses: 12,
  games_played: 512,
  total_captures: 1450,
  best_win_streak: 45,
  current_win_streak: 15,
  avatar_url: 'avatar_1',
  avatar_frame: 'frame_royal_crown',
  dice_skin: 'dice_obsidian',
  board_theme: 'theme_royal',
  token_skin: 'token_phoenix',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  last_active: 'Active Now',
};

class AuthService {
  private currentUser: UserProfile | null = null;
  private listeners: ((user: UserProfile | null) => void)[] = [];

  constructor() {
    this.ensureAdminExists();
    this.currentUser = getStoredProfile();

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'royal_ludo_profile' || e.key === REGISTERED_USERS_KEY) {
          this.currentUser = getStoredProfile();
          this.listeners.forEach((l) => l(this.currentUser));
        }
      });
      window.addEventListener('royal_ludo_sync', () => {
        this.currentUser = getStoredProfile();
        this.listeners.forEach((l) => l(this.currentUser));
      });

      // Listen for remote profile updates from Supabase Realtime
      if (isSupabaseConfigured) {
        try {
          supabase
            .channel('global_user_profile_sync')
            .on(
              'postgres_changes',
              { event: 'UPDATE', schema: 'public', table: 'profiles' },
              (payload) => {
                if (payload.new && this.currentUser && payload.new.id === this.currentUser.id) {
                  const updatedData = payload.new as any;
                  this.currentUser = {
                    ...this.currentUser,
                    coins: Number(updatedData.coins),
                    xp: Number(updatedData.xp || this.currentUser.xp),
                    level: Number(updatedData.level || this.currentUser.level),
                    is_admin: Boolean(updatedData.is_admin),
                    is_banned: Boolean(updatedData.is_banned),
                    role: updatedData.role || this.currentUser.role,
                  };
                  saveStoredProfile(this.currentUser);
                  this.listeners.forEach((l) => l(this.currentUser));
                  window.dispatchEvent(new CustomEvent('royal_ludo_sync'));
                }
              }
            )
            .subscribe();
        } catch (e) {
          console.warn('Profile realtime sync warning:', e);
        }
      }
    }
  }

  private getRegisteredUsersList(): StoredUserAccount[] {
    if (typeof window === 'undefined') return [DEFAULT_ADMIN_ACCOUNT];
    try {
      const raw = localStorage.getItem(REGISTERED_USERS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading registered users:', e);
    }
    const initial = [DEFAULT_ADMIN_ACCOUNT];
    this.saveRegisteredUsersList(initial);
    return initial;
  }

  private saveRegisteredUsersList(users: StoredUserAccount[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
      window.dispatchEvent(new CustomEvent('royal_ludo_sync'));
    } catch (e) {
      console.warn('Error saving registered users:', e);
    }
  }

  private ensureAdminExists(): void {
    const list = this.getRegisteredUsersList();
    const existingAdminIdx = list.findIndex(
      (u) => u.email.toLowerCase() === 'ammaarahmd6@gmail.com'
    );

    if (existingAdminIdx === -1) {
      list.unshift(DEFAULT_ADMIN_ACCOUNT);
      this.saveRegisteredUsersList(list);
    } else {
      // Ensure admin privileges & password remain accurate
      list[existingAdminIdx].is_admin = true;
      list[existingAdminIdx].role = 'admin';
      list[existingAdminIdx].passwordHash = 'ammar123';
      this.saveRegisteredUsersList(list);
    }
  }

  public getRegisteredUsers(): StoredUserAccount[] {
    return this.getRegisteredUsersList();
  }

  public getCurrentUser(): UserProfile {
    if (!this.currentUser) {
      this.currentUser = getStoredProfile();
    }
    return this.currentUser;
  }

  public subscribe(callback: (user: UserProfile | null) => void): () => void {
    this.listeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notify() {
    if (this.currentUser) {
      saveStoredProfile(this.currentUser);
      this.syncUserToRegisteredList(this.currentUser);
      this.syncProfileToSupabase(this.currentUser);
    }
    this.listeners.forEach((l) => l(this.currentUser));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('royal_ludo_sync'));
    }
  }

  private async syncProfileToSupabase(profile: UserProfile): Promise<void> {
    if (!isSupabaseConfigured || !profile?.id || profile.id.startsWith('guest_')) return;
    try {
      await supabase.from('profiles').upsert(
        {
          id: profile.id,
          username: profile.username || profile.id,
          display_name: profile.display_name,
          coins: profile.coins,
          gems: 50,
          level: profile.level,
          xp: profile.xp,
          avatar_url: profile.avatar_url,
          avatar_frame: profile.avatar_frame,
          dice_skin: profile.dice_skin,
          board_theme: profile.board_theme,
          token_skin: profile.token_skin,
          wins: profile.wins,
          losses: profile.losses,
          games_played: profile.games_played,
          total_captures: profile.total_captures,
          best_win_streak: profile.best_win_streak,
          current_win_streak: profile.current_win_streak,
          is_admin: profile.is_admin,
          is_banned: profile.is_banned,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    } catch (e) {
      console.warn('Supabase profile background sync note:', e);
    }
  }

  private syncUserToRegisteredList(profile: UserProfile): void {
    const list = this.getRegisteredUsersList();
    const idx = list.findIndex((u) => u.id === profile.id);
    if (idx !== -1) {
      list[idx] = {
        ...list[idx],
        display_name: profile.display_name,
        username: profile.username,
        level: profile.level,
        xp: profile.xp,
        coins: profile.coins,
        wins: profile.wins,
        losses: profile.losses,
        games_played: profile.games_played,
        total_captures: profile.total_captures,
        best_win_streak: profile.best_win_streak,
        current_win_streak: profile.current_win_streak,
        is_admin: !!profile.is_admin,
        is_banned: !!profile.is_banned,
        role: profile.role || (profile.is_admin ? 'admin' : 'user'),
        avatar_url: profile.avatar_url,
        avatar_frame: profile.avatar_frame,
        dice_skin: profile.dice_skin,
        board_theme: profile.board_theme,
        token_skin: profile.token_skin,
        last_active: 'Active Now',
        updated_at: new Date().toISOString(),
      };
      this.saveRegisteredUsersList(list);
    }
  }

  public loginAsGuest(customName?: string): UserProfile {
    const profile = createDefaultProfile(customName);
    this.currentUser = profile;
    this.notify();
    return profile;
  }

  public isAuthenticated(): boolean {
    if (!this.currentUser) return false;
    return !!this.currentUser.email && this.currentUser.email.length > 0;
  }

  public async login(
    identifier: string,
    password: string
  ): Promise<{ user?: UserProfile; error?: string }> {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanId || !cleanPassword) {
      return { error: 'Please enter both email/username and password' };
    }

    const list = this.getRegisteredUsersList();
    const account = list.find(
      (u) =>
        u.email.toLowerCase() === cleanId ||
        (u.username && u.username.toLowerCase() === cleanId) ||
        (u.player_id && u.player_id.toLowerCase() === cleanId)
    );

    if (!account) {
      if (
        (cleanId === 'ammaarahmd6@gmail.com' || cleanId === 'ammar_admin') &&
        cleanPassword === 'ammar123'
      ) {
        const adminAcc = { ...DEFAULT_ADMIN_ACCOUNT };
        list.unshift(adminAcc);
        this.saveRegisteredUsersList(list);
        const profile = this.accountToProfile(adminAcc);
        this.currentUser = profile;
        this.notify();
        return { user: profile };
      }
      if (!account && isSupabaseConfigured && cleanId.includes('@')) {
      try {
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email: cleanId,
          password: cleanPassword,
        });
        if (signInData?.user?.id) {
          const { data: pData } = await supabase.from('profiles').select('*').eq('id', signInData.user.id).single();
          if (pData) {
            const syncedAccount: StoredUserAccount = {
              id: pData.id,
              email: cleanId,
              passwordHash: cleanPassword,
              display_name: pData.display_name,
              username: pData.username,
              player_id: pData.player_id,
              is_admin: pData.is_admin,
              is_banned: pData.is_banned,
              is_vip: pData.is_admin,
              role: pData.is_admin ? 'admin' : 'user',
              level: pData.level || 1,
              xp: pData.xp || 0,
              coins: pData.coins || 0,
              wins: pData.wins || 0,
              losses: pData.losses || 0,
              games_played: pData.games_played || 0,
              total_captures: pData.total_captures || 0,
              best_win_streak: pData.best_win_streak || 0,
              current_win_streak: pData.current_win_streak || 0,
              avatar_url: pData.avatar_url || 'avatar_1',
              avatar_frame: pData.avatar_frame || 'frame_none',
              dice_skin: pData.dice_skin || 'dice_gold',
              board_theme: pData.board_theme || 'theme_royal',
              token_skin: pData.token_skin || 'token_royal',
              created_at: pData.created_at,
              updated_at: pData.updated_at,
              last_active: 'Active Now',
            };
            list.push(syncedAccount);
            this.saveRegisteredUsersList(list);
            const profile = this.accountToProfile(syncedAccount);
            this.currentUser = profile;
            this.notify();
            return { user: profile };
          }
        }
      } catch (err) {
        console.warn('Supabase remote signin check:', err);
      }
    }
    return { error: 'No account found with this email or username. Please register.' };
    }

    if (account.passwordHash !== cleanPassword) {
      return { error: 'Incorrect password. Please verify and try again.' };
    }

    if (account.is_banned) {
      return { error: 'This nobility account has been suspended by Imperial Command.' };
    }

    const profile = this.accountToProfile(account);
    this.currentUser = profile;
    this.notify();
    return { user: profile };
  }

  public async register(
    email: string,
    password: string,
    displayName: string
  ): Promise<{ user?: UserProfile; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanName = displayName.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { error: 'Please enter a valid email address.' };
    }
    if (!cleanPassword || cleanPassword.length < 4) {
      return { error: 'Password must be at least 4 characters.' };
    }
    if (!cleanName) {
      return { error: 'Please provide a Noble Display Name.' };
    }

    const list = this.getRegisteredUsersList();
    const existing = list.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return { error: 'An account with this email address already exists. Please sign in.' };
    }

    const isAdmin = cleanEmail === 'ammaarahmd6@gmail.com';
    const randDigits = Math.floor(1000 + Math.random() * 9000);
    const cleanUsername = cleanName.toLowerCase().replace(/[^a-z0-9_]/g, '_') + '_' + randDigits;
    
    // Generate valid UUID for PostgreSQL foreign key / UUID compatibility
    let authUid: string = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });

    // 1. Create Auth user on Supabase via admin API (bypasses email confirmation)
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data: createData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password: cleanPassword,
          email_confirm: true,
          user_metadata: { display_name: cleanName, username: cleanUsername },
        });
        if (createData?.user?.id) {
          authUid = createData.user.id;
        } else if (createErr) {
          console.warn('Supabase admin createUser note:', createErr.message);
          // Fallback: try regular signUp
          try {
            const { data: signUpData } = await supabase.auth.signUp({
              email: cleanEmail,
              password: cleanPassword,
              options: { data: { display_name: cleanName, username: cleanUsername } },
            });
            if (signUpData?.user?.id) {
              authUid = signUpData.user.id;
            }
          } catch (e2) {
            console.warn('Supabase signUp fallback note:', e2);
          }
        }
      } catch (e) {
        console.warn('Supabase createUser network error:', e);
      }
    }

    const newAccount: StoredUserAccount = {
      id: authUid,
      email: cleanEmail,
      passwordHash: cleanPassword,
      display_name: cleanName,
      username: cleanUsername,
      player_id: `RL-${randDigits}`,
      is_admin: isAdmin,
      is_banned: false,
      is_vip: isAdmin,
      role: isAdmin ? 'admin' : 'user',
      level: isAdmin ? 99 : 1,
      xp: isAdmin ? 50000 : 0,
      coins: isAdmin ? 999999 : 2500,
      wins: isAdmin ? 500 : 0,
      losses: 0,
      games_played: isAdmin ? 500 : 0,
      total_captures: isAdmin ? 1400 : 0,
      best_win_streak: isAdmin ? 45 : 0,
      current_win_streak: 0,
      avatar_url: 'avatar_1',
      avatar_frame: isAdmin ? 'frame_royal_crown' : 'frame_none',
      dice_skin: isAdmin ? 'dice_obsidian' : 'dice_gold',
      board_theme: 'theme_royal',
      token_skin: 'token_royal',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_active: 'Active Now',
    };

    list.push(newAccount);
    this.saveRegisteredUsersList(list);

    // 2. Direct upsert into Supabase profiles table (use admin client to bypass RLS/FK)
    if (isSupabaseConfigured) {
      const dbClient = supabaseAdmin || supabase;
      try {
        const { error: profileErr } = await dbClient.from('profiles').upsert({
          id: authUid,
          username: newAccount.username,
          display_name: newAccount.display_name,
          player_id: newAccount.player_id,
          avatar_url: newAccount.avatar_url,
          avatar_frame: newAccount.avatar_frame,
          dice_skin: newAccount.dice_skin,
          board_theme: newAccount.board_theme,
          token_skin: newAccount.token_skin,
          level: newAccount.level,
          xp: newAccount.xp,
          coins: newAccount.coins,
          wins: newAccount.wins,
          losses: newAccount.losses,
          games_played: newAccount.games_played,
          total_captures: newAccount.total_captures,
          best_win_streak: newAccount.best_win_streak,
          current_win_streak: newAccount.current_win_streak,
          is_online: true,
          is_admin: newAccount.is_admin,
          is_banned: newAccount.is_banned,
          created_at: newAccount.created_at,
          updated_at: newAccount.updated_at,
        });

        if (profileErr) {
          console.warn('Supabase profiles upsert warning:', profileErr.message);
        }

        // Broadcast to Realtime channel across tabs and sessions
        supabase.channel('global_users').send({
          type: 'broadcast',
          event: 'USER_REGISTERED',
          payload: { user: newAccount },
        }).catch(() => {});
      } catch (err) {
        console.warn('Supabase profiles insert error:', err);
      }
    }

    const profile = this.accountToProfile(newAccount);
    this.currentUser = profile;
    this.notify();
    return { user: profile };
  }

  private accountToProfile(acc: StoredUserAccount): UserProfile {
    return {
      id: acc.id,
      email: acc.email,
      username: acc.username,
      display_name: acc.display_name,
      avatar_url: acc.avatar_url,
      avatar_frame: acc.avatar_frame,
      dice_skin: acc.dice_skin,
      board_theme: acc.board_theme,
      token_skin: acc.token_skin,
      player_id: acc.player_id,
      level: acc.level,
      xp: acc.xp,
      coins: acc.coins,
      wins: acc.wins,
      losses: acc.losses,
      games_played: acc.games_played,
      total_captures: acc.total_captures,
      best_win_streak: acc.best_win_streak,
      current_win_streak: acc.current_win_streak,
      is_online: true,
      is_admin: acc.is_admin,
      is_banned: acc.is_banned,
      role: acc.role || (acc.is_admin ? 'admin' : 'user'),
      is_vip: acc.is_vip,
      created_at: acc.created_at,
      updated_at: acc.updated_at,
    };
  }

  public logout(): void {
    const freshGuest = createDefaultProfile();
    this.currentUser = freshGuest;
    this.notify();
  }

  public updateProfile(updates: Partial<UserProfile>): UserProfile {
    if (!this.currentUser) {
      this.currentUser = getStoredProfile();
    }
    this.currentUser = {
      ...this.currentUser,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.notify();
    return this.currentUser;
  }

  public addCoinsAndXp(coinsDelta: number, xpDelta: number, logType: TransactionType = 'admin_grant', description?: string): UserProfile {
    if (!this.currentUser) {
      this.currentUser = getStoredProfile();
    }
    const newCoins = Math.max(0, this.currentUser.coins + coinsDelta);
    const newXp = Math.max(0, this.currentUser.xp + xpDelta);
    const newLevel = Math.max(1, 1 + Math.floor(Math.sqrt(newXp / 150)));

    this.currentUser = {
      ...this.currentUser,
      coins: newCoins,
      xp: newXp,
      level: newLevel,
      updated_at: new Date().toISOString(),
    };

    if (coinsDelta !== 0) {
      this.recordTransaction({
        userId: this.currentUser.id,
        type: logType,
        amount: coinsDelta,
        balanceAfter: newCoins,
        description: description || `Wallet update: ${coinsDelta > 0 ? '+' : ''}${coinsDelta} Coins`,
      });
    }

    this.notify();
    return this.currentUser;
  }

  public recordMatchStats(won: boolean, captures: number): UserProfile {
    if (!this.currentUser) {
      this.currentUser = getStoredProfile();
    }
    const wins = this.currentUser.wins + (won ? 1 : 0);
    const losses = this.currentUser.losses + (won ? 0 : 1);
    const games_played = this.currentUser.games_played + 1;
    const total_captures = this.currentUser.total_captures + captures;
    const current_win_streak = won ? this.currentUser.current_win_streak + 1 : 0;
    const best_win_streak = Math.max(this.currentUser.best_win_streak, current_win_streak);

    this.currentUser = {
      ...this.currentUser,
      wins,
      losses,
      games_played,
      total_captures,
      current_win_streak,
      best_win_streak,
      updated_at: new Date().toISOString(),
    };
    this.notify();
    return this.currentUser;
  }

  // Admin user modification helpers
  public adminDeleteUser(userId: string): boolean {
    const list = this.getRegisteredUsersList();
    const idx = list.findIndex((u) => u.id === userId);
    if (idx === -1) return false;

    list.splice(idx, 1);
    this.saveRegisteredUsersList(list);

    if (isSupabaseConfigured) {
      supabase.from('profiles').delete().eq('id', userId).then();
    }

    return true;
  }

  public adminUpdateUser(
    userId: string,
    updates: Partial<StoredUserAccount>
  ): StoredUserAccount | null {
    const list = this.getRegisteredUsersList();
    const idx = list.findIndex((u) => u.id === userId);
    if (idx === -1) return null;

    list[idx] = {
      ...list[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.saveRegisteredUsersList(list);

    if (isSupabaseConfigured) {
      supabase.from('profiles').update({
        display_name: list[idx].display_name,
        username: list[idx].username,
        level: list[idx].level,
        xp: list[idx].xp,
        coins: list[idx].coins,
        is_admin: list[idx].is_admin,
        is_banned: list[idx].is_banned,
        role: list[idx].role,
        updated_at: new Date().toISOString(),
      }).eq('id', userId).then();
    }

    if (this.currentUser && this.currentUser.id === userId) {
      this.currentUser = this.accountToProfile(list[idx]);
      saveStoredProfile(this.currentUser);
      this.notify();
    }

    return list[idx];
  }

  public async adminGiftCoins(targetUserId: string, amount: number, note: string = 'Imperial Gift from Sovereign Admin'): Promise<boolean> {
    const list = this.getRegisteredUsersList();
    const idx = list.findIndex((u) => u.id === targetUserId);
    let newCoins = amount;

    if (idx !== -1) {
      const currentCoins = list[idx].coins || 0;
      newCoins = Math.max(0, currentCoins + amount);
      list[idx].coins = newCoins;
      list[idx].updated_at = new Date().toISOString();
      this.saveRegisteredUsersList(list);
    }

    // Always update local stored profile if target matches or if single-user session
    try {
      const storedRaw = localStorage.getItem('royal_ludo_profile');
      if (storedRaw) {
        const storedProfile = JSON.parse(storedRaw);
        if (storedProfile.id === targetUserId || idx === -1) {
          storedProfile.coins = Math.max(0, (storedProfile.coins || 0) + amount);
          storedProfile.xp = (storedProfile.xp || 0) + Math.floor(amount * 0.1);
          newCoins = storedProfile.coins;
          localStorage.setItem('royal_ludo_profile', JSON.stringify(storedProfile));
        }
      }
    } catch (e) {
      console.warn('Error updating stored profile:', e);
    }

    if (this.currentUser && (this.currentUser.id === targetUserId || idx === -1)) {
      this.currentUser = {
        ...this.currentUser,
        coins: Math.max(0, (this.currentUser.coins || 0) + amount),
      };
      saveStoredProfile(this.currentUser);
      this.notify();
    }

    // 1. Persist directly into Supabase profiles table
    if (isSupabaseConfigured && !targetUserId.startsWith('guest_')) {
      try {
        const dbClient = supabaseAdmin || supabase;
        const { data: profileData } = await dbClient
          .from('profiles')
          .select('coins')
          .eq('id', targetUserId)
          .single();

        if (profileData) {
          const updatedCoins = Math.max(0, (profileData.coins || 0) + amount);
          newCoins = updatedCoins;
          await dbClient
            .from('profiles')
            .update({
              coins: updatedCoins,
              updated_at: new Date().toISOString(),
            })
            .eq('id', targetUserId);
        }
      } catch (err) {
        console.warn('Supabase adminGiftCoins profiles update warning:', err);
      }
    }

    // 2. Record ledger transaction
    this.recordTransaction({
      userId: targetUserId,
      type: 'admin_grant',
      amount,
      balanceAfter: newCoins,
      description: note,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('royal_ludo_notification', {
          detail: {
            title: '🎁 Coins Credited!',
            message: `+${amount.toLocaleString()} Coins added to your vault! (${note})`,
            type: 'reward',
            targetUserId,
            coins: amount,
          },
        })
      );
      window.dispatchEvent(
        new CustomEvent('royal_ludo_deposit_approved', {
          detail: { targetUserId, coins: amount, note },
        })
      );
      window.dispatchEvent(new CustomEvent('royal_ludo_sync'));
    }

    return true;
  }

  public async adminDeductCoins(targetUserId: string, amount: number, reason: string = 'Administrative Adjustment'): Promise<boolean> {
    const list = this.getRegisteredUsersList();
    const idx = list.findIndex((u) => u.id === targetUserId);
    let newCoins = 0;

    if (idx !== -1) {
      const currentCoins = list[idx].coins || 0;
      newCoins = Math.max(0, currentCoins - amount);
      list[idx].coins = newCoins;
      list[idx].updated_at = new Date().toISOString();
      this.saveRegisteredUsersList(list);
    } else if (this.currentUser && this.currentUser.id === targetUserId) {
      this.addCoinsAndXp(-amount, 0, 'admin_deduct', reason);
      newCoins = this.currentUser.coins;
    }

    if (isSupabaseConfigured && !targetUserId.startsWith('guest_')) {
      try {
        const dbClient = supabaseAdmin || supabase;
        const { data: profileData } = await dbClient
          .from('profiles')
          .select('coins')
          .eq('id', targetUserId)
          .single();

        if (profileData) {
          const updatedCoins = Math.max(0, (profileData.coins || 0) - amount);
          newCoins = updatedCoins;
          await dbClient
            .from('profiles')
            .update({
              coins: updatedCoins,
              updated_at: new Date().toISOString(),
            })
            .eq('id', targetUserId);
        }
      } catch (err) {
        console.warn('Supabase adminDeductCoins profiles update warning:', err);
      }
    }

    this.recordTransaction({
      userId: targetUserId,
      type: 'admin_deduct',
      amount: -amount,
      balanceAfter: newCoins,
      description: reason,
    });

    if (this.currentUser && this.currentUser.id === targetUserId) {
      if (idx !== -1) {
        this.currentUser = this.accountToProfile(list[idx]);
      } else {
        this.currentUser = { ...this.currentUser, coins: newCoins };
      }
      saveStoredProfile(this.currentUser);
      this.notify();
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('royal_ludo_sync'));
    }

    return true;
  }

  // Transactions ledger management
  public recordTransaction(params: {
    userId: string;
    type: TransactionType;
    amount: number;
    balanceAfter: number;
    description?: string;
    referenceType?: string;
    referenceId?: string;
  }): TransactionRecord {
    const tx: TransactionRecord = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: params.userId,
      type: params.type,
      amount: params.amount,
      balance_after: params.balanceAfter,
      description: params.description,
      reference_type: params.referenceType,
      reference_id: params.referenceId,
      created_at: new Date().toISOString(),
    };

    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(TRANSACTIONS_KEY);
        const list: TransactionRecord[] = raw ? JSON.parse(raw) : [];
        list.unshift(tx);
        // Keep max 500 recent transactions
        localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(list.slice(0, 500)));
      } catch (e) {
        console.warn('Error recording transaction:', e);
      }
    }
    return tx;
  }

  public getUserTransactions(userId: string): TransactionRecord[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(TRANSACTIONS_KEY);
      if (raw) {
        const list: TransactionRecord[] = JSON.parse(raw);
        return list.filter((t) => t.user_id === userId);
      }
    } catch (e) {
      console.warn(e);
    }
    return [];
  }
}

export const authService = new AuthService();
