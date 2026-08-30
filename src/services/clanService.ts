import { authService } from './authService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface ClanRecord {
  id: string;
  name: string;
  tag: string;
  description: string;
  badge_icon: string;
  banner_color: string;
  leader_id: string;
  leader_name: string;
  min_level: number;
  trophies: number;
  weekly_chest_score: number;
  member_count: number;
  max_members: number;
  is_open: boolean;
  created_at: string;
}

export interface ClanMemberRecord {
  id: string;
  clan_id: string;
  user_id: string;
  username: string;
  avatar_url: string;
  role: 'leader' | 'co_leader' | 'elder' | 'member';
  trophies_contributed: number;
  joined_at: string;
}

export interface ClanMessageRecord {
  id: string;
  clan_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string;
  sender_role: string;
  message: string;
  created_at: string;
}

const DEFAULT_MOCK_CLANS: ClanRecord[] = [
  {
    id: 'clan_royal_dragons',
    name: 'Imperial Royal Dragons',
    tag: 'DRGN',
    description: 'Elite competitive sovereigns dominating the high-stakes Ludo arena.',
    badge_icon: 'shield_crown',
    banner_color: '#d97706',
    leader_id: 'leader_ammar',
    leader_name: 'Emperor Ammar',
    min_level: 3,
    trophies: 14850,
    weekly_chest_score: 4200,
    member_count: 38,
    max_members: 50,
    is_open: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'clan_lahore_kings',
    name: 'Lahore Kings & Knights',
    tag: 'LHRK',
    description: 'Friendly royal companions sharing daily tribute chests & strategies.',
    badge_icon: 'swords',
    banner_color: '#059669',
    leader_id: 'leader_valeria',
    leader_name: 'Lady Valeria',
    min_level: 1,
    trophies: 8900,
    weekly_chest_score: 2800,
    member_count: 24,
    max_members: 50,
    is_open: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'clan_celestial_guard',
    name: 'Celestial Void Guardians',
    tag: 'VOID',
    description: 'Grand Emperor table conquerors and strategic dice masters.',
    badge_icon: 'trophy',
    banner_color: '#7c3aed',
    leader_id: 'leader_aurelius',
    leader_name: 'Lord Aurelius',
    min_level: 5,
    trophies: 21400,
    weekly_chest_score: 8900,
    member_count: 45,
    max_members: 50,
    is_open: true,
    created_at: new Date().toISOString(),
  },
];

class ClanService {
  private clans: ClanRecord[] = [];
  private myClanId: string | null = null;
  private clanMessages: { [clanId: string]: ClanMessageRecord[] } = {};
  private chatListeners: { [clanId: string]: ((msgs: ClanMessageRecord[]) => void)[] } = {};
  private realtimeChannel: RealtimeChannel | null = null;

  constructor() {
    this.loadLocal();
  }

  private loadLocal() {
    if (typeof window === 'undefined') return;
    try {
      const rawClans = localStorage.getItem('royal_ludo_clans_cache');
      this.clans = rawClans ? JSON.parse(rawClans) : DEFAULT_MOCK_CLANS;

      const myClan = localStorage.getItem('royal_ludo_my_clan_id');
      this.myClanId = myClan || null;

      const rawMsgs = localStorage.getItem('royal_ludo_clan_messages');
      if (rawMsgs) this.clanMessages = JSON.parse(rawMsgs);
    } catch (e) {
      console.warn('Clan load error:', e);
      this.clans = DEFAULT_MOCK_CLANS;
    }
  }

  private saveLocal() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('royal_ludo_clans_cache', JSON.stringify(this.clans));
      if (this.myClanId) {
        localStorage.setItem('royal_ludo_my_clan_id', this.myClanId);
      } else {
        localStorage.removeItem('royal_ludo_my_clan_id');
      }
      localStorage.setItem('royal_ludo_clan_messages', JSON.stringify(this.clanMessages));
    } catch (e) {
      console.warn('Clan save error:', e);
    }
  }

  public async fetchClans(): Promise<ClanRecord[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('clans').select('*').order('trophies', { ascending: false });
        if (!error && data && data.length > 0) {
          this.clans = data;
          this.saveLocal();
          return this.clans;
        }
      } catch (e) {
        console.warn('Supabase fetch clans note:', e);
      }
    }
    return this.clans;
  }

  public getMyClan(): { clan: ClanRecord | null; myClanId: string | null } {
    if (!this.myClanId) return { clan: null, myClanId: null };
    const found = this.clans.find((c) => c.id === this.myClanId) || null;
    return { clan: found, myClanId: this.myClanId };
  }

  public async createClan(params: {
    name: string;
    tag: string;
    description: string;
    badge_icon: string;
    banner_color: string;
    min_level: number;
  }): Promise<{ success: boolean; clan?: ClanRecord; message: string }> {
    const user = authService.getCurrentUser();
    const cleanName = params.name.trim();
    const cleanTag = params.tag.trim().toUpperCase();

    if (!cleanName || cleanName.length < 3) {
      return { success: false, message: 'Clan name must be at least 3 characters.' };
    }
    if (!cleanTag || cleanTag.length < 2 || cleanTag.length > 6) {
      return { success: false, message: 'Clan Tag must be between 2 and 6 characters.' };
    }

    if (user.coins < 2000) {
      return { success: false, message: 'Creating a Royal Clan requires 2,000 Coins.' };
    }

    // Deduct clan founding fee
    authService.addCoinsAndXp(-2000, 250, 'shop_purchase', `Founded Royal Clan [${cleanTag}] ${cleanName}`);

    const newClan: ClanRecord = {
      id: `clan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: cleanName,
      tag: cleanTag,
      description: params.description.trim() || 'A prestigious sovereign guild.',
      badge_icon: params.badge_icon || 'shield_crown',
      banner_color: params.banner_color || '#d97706',
      leader_id: user.id,
      leader_name: user.display_name,
      min_level: Math.max(1, params.min_level || 1),
      trophies: user.wins * 10,
      weekly_chest_score: 500,
      member_count: 1,
      max_members: 50,
      is_open: true,
      created_at: new Date().toISOString(),
    };

    this.clans.unshift(newClan);
    this.myClanId = newClan.id;
    this.saveLocal();

    if (isSupabaseConfigured) {
      try {
        await supabase.from('clans').insert(newClan);
        await supabase.from('clan_members').insert({
          clan_id: newClan.id,
          user_id: user.id,
          username: user.display_name,
          avatar_url: user.avatar_url,
          role: 'leader',
          trophies_contributed: user.wins * 10,
        });
      } catch (e) {
        console.warn('Supabase clan insert note:', e);
      }
    }

    return {
      success: true,
      clan: newClan,
      message: `👑 Sovereign Clan [${cleanTag}] "${cleanName}" founded successfully!`,
    };
  }

  public async joinClan(clanId: string): Promise<{ success: boolean; message: string }> {
    const user = authService.getCurrentUser();
    const targetClan = this.clans.find((c) => c.id === clanId);

    if (!targetClan) {
      return { success: false, message: 'Clan not found.' };
    }
    if (user.level < targetClan.min_level) {
      return { success: false, message: `Your level (${user.level}) is below the required level ${targetClan.min_level}.` };
    }
    if (targetClan.member_count >= targetClan.max_members) {
      return { success: false, message: 'This Clan is currently full (50/50 members).' };
    }

    targetClan.member_count += 1;
    targetClan.trophies += user.wins * 5;
    this.myClanId = clanId;
    this.saveLocal();

    if (isSupabaseConfigured) {
      try {
        await supabase.from('clan_members').insert({
          clan_id: clanId,
          user_id: user.id,
          username: user.display_name,
          avatar_url: user.avatar_url,
          role: 'member',
          trophies_contributed: user.wins * 5,
        });
        await supabase.from('clans').update({ member_count: targetClan.member_count }).eq('id', clanId);
      } catch (e) {
        console.warn('Supabase join clan note:', e);
      }
    }

    return {
      success: true,
      message: `Welcome to [${targetClan.tag}] ${targetClan.name}!`,
    };
  }

  public async leaveClan(): Promise<{ success: boolean; message: string }> {
    if (!this.myClanId) return { success: false, message: 'You are not in a clan.' };
    const user = authService.getCurrentUser();
    const clanId = this.myClanId;
    const targetClan = this.clans.find((c) => c.id === clanId);

    if (targetClan) {
      targetClan.member_count = Math.max(0, targetClan.member_count - 1);
    }
    this.myClanId = null;
    this.saveLocal();

    if (isSupabaseConfigured) {
      try {
        await supabase.from('clan_members').delete().eq('clan_id', clanId).eq('user_id', user.id);
      } catch (e) {
        console.warn('Supabase leave clan note:', e);
      }
    }

    return { success: true, message: 'You left the clan.' };
  }

  public getClanMessages(clanId: string): ClanMessageRecord[] {
    return this.clanMessages[clanId] || [];
  }

  public async sendClanMessage(clanId: string, text: string): Promise<boolean> {
    const clean = text.trim();
    if (!clean) return false;
    const user = authService.getCurrentUser();

    const msg: ClanMessageRecord = {
      id: `cmsg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      clan_id: clanId,
      sender_id: user.id,
      sender_name: user.display_name,
      sender_avatar: user.avatar_url,
      sender_role: 'member',
      message: clean,
      created_at: new Date().toISOString(),
    };

    if (!this.clanMessages[clanId]) this.clanMessages[clanId] = [];
    this.clanMessages[clanId].push(msg);
    this.saveLocal();

    // Notify chat listeners
    const listeners = this.chatListeners[clanId] || [];
    listeners.forEach((l) => l(this.clanMessages[clanId]));

    if (isSupabaseConfigured) {
      try {
        await supabase.from('clan_messages').insert(msg);
      } catch (e) {
        console.warn('Supabase clan msg note:', e);
      }
    }

    return true;
  }

  public subscribeClanChat(clanId: string, callback: (msgs: ClanMessageRecord[]) => void): () => void {
    if (!this.chatListeners[clanId]) this.chatListeners[clanId] = [];
    this.chatListeners[clanId].push(callback);
    callback(this.getClanMessages(clanId));

    return () => {
      this.chatListeners[clanId] = (this.chatListeners[clanId] || []).filter((cb) => cb !== callback);
    };
  }

  public async claimWeeklyChest(clanId: string): Promise<{ success: boolean; coins?: number; message: string }> {
    const clan = this.clans.find((c) => c.id === clanId);
    if (!clan) return { success: false, message: 'Clan not found' };

    const rewardCoins = 2500;
    const rewardXp = 500;
    authService.addCoinsAndXp(rewardCoins, rewardXp, 'daily_bonus', `👑 Claimed Weekly Clan Chest for [${clan.tag}]`);

    return {
      success: true,
      coins: rewardCoins,
      message: `🎉 Claimed Clan Chest! +${rewardCoins.toLocaleString()} Coins & +${rewardXp} XP!`,
    };
  }
}

export const clanService = new ClanService();
