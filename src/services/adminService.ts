import { UserProfile } from '../types/database';
import { authService, StoredUserAccount } from './authService';
import { SHOP_CATALOG } from './shopService';
import { paymentService } from './paymentService';
import { saveStoredInventory, supabase, isSupabaseConfigured } from '../lib/supabase';

export interface AdminStats {
  totalUsers: number;
  onlineUsers: number;
  gamesToday: number;
  activeGames: number;
  completedGames: number;
  totalCoinsCirculating: number;
  pendingDepositsCount: number;
  totalDepositsVolumePKR: number;
  averageMatchDurationMinutes: number;
  serverHealth: 'optimal' | 'degraded' | 'maintenance';
}

export interface AdminAnnouncement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'maintenance' | 'event' | 'reward';
  createdAt: string;
}

export interface PromoCode {
  code: string;
  coins: number;
  xp: number;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  expiresAt: string;
}

export interface GameplayConfig {
  turnTimeLimitSeconds: number;
  botAggressionFactor: number; // 0.1 to 1.0
  botSixProbabilityBias: number; // 0 to 0.2
  sixRollBonusTurn: boolean;
  enableSoundEffects: boolean;
  forcedDiceValue: number | null; // For debug mode
}

export interface AdminPlayerRecord {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin' | 'moderator';
  level: number;
  coins: number;
  crowns: number;
  isBanned: boolean;
  isVip: boolean;
  lastActive: string;
}

const ANNOUNCEMENTS_KEY = 'royal_ludo_announcements';
const PROMO_CODES_KEY = 'royal_ludo_promos';
const GAMEPLAY_CONFIG_KEY = 'royal_ludo_gameplay_cfg';

class AdminService {
  private announcements: AdminAnnouncement[] = [];
  private promoCodes: PromoCode[] = [];
  private gameplayConfig: GameplayConfig = {
    turnTimeLimitSeconds: 30,
    botAggressionFactor: 0.7,
    botSixProbabilityBias: 0.05,
    sixRollBonusTurn: true,
    enableSoundEffects: true,
    forcedDiceValue: null,
  };

  constructor() {
    this.loadData();
  }

  private loadData(): void {
    if (typeof window === 'undefined') return;
    try {
      const annRaw = localStorage.getItem(ANNOUNCEMENTS_KEY);
      if (annRaw) {
        this.announcements = JSON.parse(annRaw);
      } else {
        this.announcements = [
          {
            id: 'ann_1',
            title: 'Welcome to Royal Ludo',
            message: 'Experience real-time imperial competition with custom bet private rooms and instant coin deposits!',
            type: 'event',
            createdAt: new Date().toISOString(),
          },
        ];
        this.saveAnnouncements();
      }

      const promoRaw = localStorage.getItem(PROMO_CODES_KEY);
      if (promoRaw) {
        this.promoCodes = JSON.parse(promoRaw);
      } else {
        this.promoCodes = [
          {
            code: 'ROYAL2026',
            coins: 2500,
            xp: 500,
            maxUses: 1000,
            usedCount: 0,
            isActive: true,
            expiresAt: '2026-12-31',
          },
          {
            code: 'AMMAR123',
            coins: 10000,
            xp: 2500,
            maxUses: 500,
            usedCount: 0,
            isActive: true,
            expiresAt: '2026-12-31',
          },
        ];
        this.savePromoCodes();
      }

      const cfgRaw = localStorage.getItem(GAMEPLAY_CONFIG_KEY);
      if (cfgRaw) {
        this.gameplayConfig = { ...this.gameplayConfig, ...JSON.parse(cfgRaw) };
      }
    } catch (e) {
      console.warn('Error loading admin settings:', e);
    }
  }

  private saveAnnouncements(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(this.announcements));
  }

  private savePromoCodes(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(PROMO_CODES_KEY, JSON.stringify(this.promoCodes));
  }

  private saveGameplayConfig(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(GAMEPLAY_CONFIG_KEY, JSON.stringify(this.gameplayConfig));
  }

  public getStats(): AdminStats {
    const registeredUsers = authService.getRegisteredUsers();
    const currentUser = authService.getCurrentUser();
    const totalCoins = registeredUsers.reduce((sum, u) => sum + (u.coins || 0), 0);
    const totalGames = registeredUsers.reduce((sum, u) => sum + (u.games_played || 0), 0);
    const allDeposits = paymentService.getAllRequests();
    const pendingCount = paymentService.getPendingCount();
    const approvedVolume = allDeposits
      .filter((d) => d.status === 'approved')
      .reduce((sum, d) => sum + (d.currency === 'PKR' ? d.fiat_amount : d.fiat_amount * 280), 0);

    return {
      totalUsers: registeredUsers.length,
      onlineUsers: registeredUsers.filter((u) => !u.is_banned).length,
      gamesToday: Math.max(1, Math.floor(totalGames * 0.4) + 1),
      activeGames: 1,
      completedGames: totalGames,
      totalCoinsCirculating: totalCoins || currentUser.coins,
      pendingDepositsCount: pendingCount,
      totalDepositsVolumePKR: approvedVolume,
      averageMatchDurationMinutes: 6.4,
      serverHealth: 'optimal',
    };
  }

  public getAnnouncements(): AdminAnnouncement[] {
    return this.announcements;
  }

  public createAnnouncement(
    title: string,
    message: string,
    type: 'info' | 'maintenance' | 'event' | 'reward' = 'info'
  ): void {
    const ann: AdminAnnouncement = {
      id: `ann_${Date.now()}`,
      title,
      message,
      type,
      createdAt: new Date().toISOString(),
    };
    this.announcements.unshift(ann);
    this.saveAnnouncements();
  }

  public deleteAnnouncement(id: string): void {
    this.announcements = this.announcements.filter((a) => a.id !== id);
    this.saveAnnouncements();
  }

  public grantUserCoins(amount: number): UserProfile {
    return authService.addCoinsAndXp(amount, 0, 'admin_grant', 'Admin Self Grant');
  }

  public grantUserXp(amount: number): UserProfile {
    return authService.addCoinsAndXp(0, amount, 'admin_grant', 'Admin XP Grant');
  }

  public async grantTargetUserCoins(userId: string, amount: number, note: string = 'Imperial Gift from Sovereign Admin'): Promise<boolean> {
    return await authService.adminGiftCoins(userId, amount, note);
  }

  public async deductTargetUserCoins(userId: string, amount: number, reason: string = 'Administrative Penalty / Deduction'): Promise<boolean> {
    return await authService.adminDeductCoins(userId, amount, reason);
  }

  public unlockAllCosmetics(): void {
    const allIds = SHOP_CATALOG.map((item) => item.id);
    saveStoredInventory(allIds);
  }

  public resetCurrentUserData(): void {
    try {
      localStorage.removeItem('royal_ludo_profile');
      localStorage.removeItem('royal_ludo_inventory');
      localStorage.removeItem('royal_ludo_daily_login');
      localStorage.removeItem('royal_ludo_claimed_missions');
      localStorage.removeItem('royal_ludo_claimed_achievements');
      window.location.reload();
    } catch (e) {
      console.warn(e);
    }
  }

  // Real Players Management from Registered Users
  public getPlayers(): AdminPlayerRecord[] {
    const registered = authService.getRegisteredUsers();
    const curr = authService.getCurrentUser();

    const records: AdminPlayerRecord[] = registered.map((u) => ({
      id: u.id,
      username: u.id === curr.id ? `${u.display_name} (Current Session)` : u.display_name,
      email: u.email,
      role: u.role || (u.is_admin ? 'admin' : 'user'),
      level: u.level || 1,
      coins: u.coins || 0,
      crowns: (u.wins || 0) * 10,
      isBanned: !!u.is_banned,
      isVip: !!u.is_vip,
      lastActive: u.id === curr.id ? 'Active Now' : u.last_active || 'Registered Member',
    }));

    if (isSupabaseConfigured) {
      supabase.from('profiles').select('*').then(({ data }) => {
        if (data && data.length > 0) {
          data.forEach((p: any) => {
            const exists = registered.some((u) => u.id === p.id);
            if (!exists) {
              authService.adminUpdateUser(p.id, {
                id: p.id,
                email: p.username ? `${p.username}@royal.realm` : 'noble@royal.realm',
                passwordHash: 'vault123',
                display_name: p.display_name || 'Noble Sovereign',
                username: p.username || 'noble',
                player_id: p.player_id || 'RL-1000',
                is_admin: Boolean(p.is_admin),
                is_banned: Boolean(p.is_banned),
                is_vip: Boolean(p.is_admin),
                role: p.is_admin ? 'admin' : 'user',
                level: p.level || 1,
                xp: p.xp || 0,
                coins: p.coins || 0,
                wins: p.wins || 0,
                losses: p.losses || 0,
                games_played: p.games_played || 0,
                total_captures: p.total_captures || 0,
                best_win_streak: p.best_win_streak || 0,
                current_win_streak: p.current_win_streak || 0,
                avatar_url: p.avatar_url || 'avatar_1',
                avatar_frame: p.avatar_frame || 'frame_none',
                dice_skin: p.dice_skin || 'dice_gold',
                board_theme: p.board_theme || 'theme_royal',
                token_skin: p.token_skin || 'token_royal',
                created_at: p.created_at || new Date().toISOString(),
                updated_at: p.updated_at || new Date().toISOString(),
                last_active: p.is_online ? 'Active Now' : 'Synced from Database',
              });
            }
          });
        }
      });
    }

    return records;
  }

    public deletePlayer(id: string): boolean {
    return authService.adminDeleteUser(id);
  }

  public updatePlayer(id: string, updates: {
    displayName?: string;
    coins?: number;
    level?: number;
    xp?: number;
    role?: 'user' | 'admin' | 'moderator';
    isVip?: boolean;
    isBanned?: boolean;
  }): boolean {
    const userUpdates: Partial<StoredUserAccount> = {};
    if (updates.displayName !== undefined) userUpdates.display_name = updates.displayName;
    if (updates.coins !== undefined) userUpdates.coins = updates.coins;
    if (updates.level !== undefined) userUpdates.level = updates.level;
    if (updates.xp !== undefined) userUpdates.xp = updates.xp;
    if (updates.role !== undefined) {
      userUpdates.role = updates.role;
      userUpdates.is_admin = updates.role === 'admin';
    }
    if (updates.isVip !== undefined) userUpdates.is_vip = updates.isVip;
    if (updates.isBanned !== undefined) userUpdates.is_banned = updates.isBanned;

    const res = authService.adminUpdateUser(id, userUpdates);
    return !!res;
  }

public togglePlayerBan(id: string): boolean {
    const users = authService.getRegisteredUsers();
    const u = users.find((p) => p.id === id);
    if (u) {
      const nextBanState = !u.is_banned;
      authService.adminUpdateUser(id, { is_banned: nextBanState });
      return nextBanState;
    }
    return false;
  }

  public togglePlayerRole(id: string): 'admin' | 'user' {
    const users = authService.getRegisteredUsers();
    const u = users.find((p) => p.id === id);
    if (u) {
      const nextRole = u.role === 'admin' ? 'user' : 'admin';
      authService.adminUpdateUser(id, { role: nextRole, is_admin: nextRole === 'admin' });
      return nextRole;
    }
    return 'user';
  }

  // Promo Codes Management
  public getPromoCodes(): PromoCode[] {
    return this.promoCodes;
  }

  public createPromoCode(code: string, coins: number, xp: number, maxUses: number = 500): PromoCode {
    const normalized = code.toUpperCase().trim();
    const existing = this.promoCodes.find((p) => p.code === normalized);
    if (existing) {
      existing.coins = coins;
      existing.xp = xp;
      existing.maxUses = maxUses;
      existing.isActive = true;
      this.savePromoCodes();
      return existing;
    }

    const newCode: PromoCode = {
      code: normalized,
      coins,
      xp,
      maxUses,
      usedCount: 0,
      isActive: true,
      expiresAt: '2026-12-31',
    };
    this.promoCodes.unshift(newCode);
    this.savePromoCodes();
    return newCode;
  }

  public redeemPromoCode(code: string): { success: boolean; message: string; coins?: number; xp?: number } {
    const normalized = code.toUpperCase().trim();
    const promo = this.promoCodes.find((p) => p.code === normalized);

    if (!promo) {
      return { success: false, message: 'Invalid or unrecognized royal promo code.' };
    }
    if (!promo.isActive) {
      return { success: false, message: 'This promo code is currently deactivated.' };
    }
    if (promo.usedCount >= promo.maxUses) {
      return { success: false, message: 'This promo code has reached its maximum sovereign claims limit.' };
    }

    promo.usedCount += 1;
    this.savePromoCodes();
    authService.addCoinsAndXp(promo.coins, promo.xp, 'promo_code', `Redeemed promo code: ${promo.code}`);

    return {
      success: true,
      message: `Royal Code Redeemed! +${promo.coins.toLocaleString()} Coins & +${promo.xp} XP credited to your vault!`,
      coins: promo.coins,
      xp: promo.xp,
    };
  }

  // Gameplay configuration
  public getGameplayConfig(): GameplayConfig {
    return { ...this.gameplayConfig };
  }

  public updateGameplayConfig(partial: Partial<GameplayConfig>): GameplayConfig {
    this.gameplayConfig = { ...this.gameplayConfig, ...partial };
    this.saveGameplayConfig();
    return this.gameplayConfig;
  }

  // Daily Streak Debugger
  public setDailyStreakForTesting(dayNumber: number): void {
    const day = Math.max(1, Math.min(7, dayNumber));
    const raw = {
      lastClaimDate: null,
      streak: day - 1,
      totalLogins: day,
    };
    localStorage.setItem('royal_ludo_daily_login', JSON.stringify(raw));
  }
}

export const adminService = new AdminService();
