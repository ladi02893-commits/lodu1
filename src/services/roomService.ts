import { SEAT_COLORS } from '../lib/ludo/constants';
import { PlayerColor } from '../lib/ludo/types';
import { RoomPlayerRecord, RoomRecord } from '../types/database';
import { authService } from './authService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

type RoomListener = (room: RoomRecord | null) => void;
type GlobalRoomListener = (event: { type: 'ROOM_UPDATED' | 'ROOM_MATCH_STARTED' | 'ROOM_DELETED'; room: RoomRecord }) => void;

class RoomService {
  private activeRooms: Map<string, RoomRecord> = new Map();
  private listeners: { [roomCode: string]: RoomListener[] } = {};
  private globalListeners: GlobalRoomListener[] = [];
  private broadcastChannel: BroadcastChannel | null = null;
  private realtimeChannels: Map<string, RealtimeChannel> = new Map();

  constructor() {
    this.load();
    this.initBroadcast();
  }

  private initBroadcast() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('royal_ludo_room_channel');
        this.broadcastChannel.onmessage = (event) => {
          const { type, room } = event.data || {};
          if (room && room.code) {
            this.activeRooms.set(room.code.toUpperCase(), room);
            this.notifyRoom(room.code.toUpperCase());
            this.notifyGlobal(type || 'ROOM_UPDATED', room);
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel error in RoomService', e);
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'royal_ludo_rooms_cache') {
          this.load();
          this.notifyAll();
        }
      });
    }
  }

  private load() {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('royal_ludo_rooms_cache');
      if (raw) {
        const parsed = JSON.parse(raw);
        this.activeRooms = new Map();
        Object.entries(parsed).forEach(([key, val]) => {
          this.activeRooms.set(key.toUpperCase(), val as RoomRecord);
        });
      }
    } catch (e) {
      console.warn('Failed to load rooms cache', e);
    }
  }

  private save() {
    if (typeof window === 'undefined') return;
    try {
      const obj = Object.fromEntries(this.activeRooms.entries());
      localStorage.setItem('royal_ludo_rooms_cache', JSON.stringify(obj));
    } catch (e) {
      console.warn('Failed to save rooms cache', e);
    }
  }

  public generateRoomCode(): string {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    return code;
  }

  /**
   * Subscribe to Supabase Realtime Channel for a room
   */
  private subscribeToSupabaseRealtime(code: string) {
    const cleanCode = code.toUpperCase();
    if (!isSupabaseConfigured || this.realtimeChannels.has(cleanCode)) return;

    try {
      const channel = supabase.channel(`room_${cleanCode}`, {
        config: { broadcast: { self: false } },
      });

      channel
        .on('broadcast', { event: 'ROOM_UPDATED' }, (payload) => {
          if (payload.payload?.room) {
            const updated = payload.payload.room as RoomRecord;
            this.activeRooms.set(cleanCode, updated);
            this.save();
            this.notifyRoom(cleanCode);
            this.notifyGlobal('ROOM_UPDATED', updated);
          }
        })
        .on('broadcast', { event: 'ROOM_MATCH_STARTED' }, (payload) => {
          if (payload.payload?.room) {
            const updated = payload.payload.room as RoomRecord;
            this.activeRooms.set(cleanCode, updated);
            this.save();
            this.notifyRoom(cleanCode);
            this.notifyGlobal('ROOM_MATCH_STARTED', updated);
          }
        })
        .subscribe();

      this.realtimeChannels.set(cleanCode, channel);
    } catch (e) {
      console.warn('Supabase Realtime Channel creation error:', e);
    }
  }

  /**
   * Broadcast an event via both Supabase Realtime and browser BroadcastChannel
   */
  private broadcastEvent(type: 'ROOM_UPDATED' | 'ROOM_MATCH_STARTED' | 'ROOM_DELETED', room: RoomRecord) {
    const cleanCode = room.code.toUpperCase();

    // 1. Cross-tab BroadcastChannel
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type, room });
      } catch (e) {
        console.warn(e);
      }
    }

    // 2. Global Multi-device Supabase Realtime Broadcast
    if (isSupabaseConfigured) {
      let channel = this.realtimeChannels.get(cleanCode);
      if (!channel) {
        this.subscribeToSupabaseRealtime(cleanCode);
        channel = this.realtimeChannels.get(cleanCode);
      }
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: type,
          payload: { room },
        }).catch((e) => console.warn('Supabase Realtime send error:', e));
      }
    }
  }

  public createRoom(maxPlayers: number = 4, betAmount: number = 0): RoomRecord {
    this.load();
    const user = authService.getCurrentUser();
    const code = this.generateRoomCode().toUpperCase();
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const hostPlayer: RoomPlayerRecord = {
      id: `p_${Date.now()}_host`,
      room_id: roomId,
      user_id: user.id,
      seat: 0,
      color: 'red',
      is_ready: true,
      is_host: true,
      joined_at: new Date().toISOString(),
      profile: user,
    };

    const initialPot = (betAmount || 0) * 1;

    const room: RoomRecord = {
      id: roomId,
      code,
      host_id: user.id,
      mode: 'room_private',
      max_players: maxPlayers || 4,
      bet_amount: Math.max(0, betAmount || 0),
      total_pot: initialPot,
      status: 'open',
      settings: {
        turnDurationSeconds: 30,
        betAmount: Math.max(0, betAmount || 0),
        totalPot: initialPot,
      },
      created_at: new Date().toISOString(),
      players: [hostPlayer],
    };

    this.activeRooms.set(code, room);
    this.save();
    this.subscribeToSupabaseRealtime(code);
    this.broadcastEvent('ROOM_UPDATED', room);
    this.notifyRoom(code);

    // Asynchronously save to Supabase Database
    if (isSupabaseConfigured) {
      supabase.from('rooms').upsert({
        id: roomId.startsWith('room_') ? undefined : roomId,
        code,
        host_id: user.id,
        mode: 'room_private',
        status: 'open',
        max_players: maxPlayers,
        settings: { betAmount: betAmount || 0, totalPot: initialPot },
      }).then(({ error }) => {
        if (error) console.warn('Supabase rooms insert warning:', error.message);
      });
    }

    return room;
  }

  public updateRoomBet(code: string, betAmount: number): { success: boolean; room?: RoomRecord; message: string } {
    this.load();
    const cleanCode = code.trim().toUpperCase();
    const room = this.activeRooms.get(cleanCode);
    if (!room) return { success: false, message: 'Room not found.' };

    const user = authService.getCurrentUser();
    if (room.host_id !== user.id) {
      return { success: false, message: 'Only chamber host can change the bet.' };
    }

    if (betAmount > user.coins) {
      return {
        success: false,
        message: `Insufficient coins in your vault (You have ${user.coins.toLocaleString()} coins). Please buy coins.`,
      };
    }

    room.bet_amount = Math.max(0, betAmount);
    room.total_pot = room.bet_amount * (room.players?.length || 1);
    room.settings = { ...room.settings, betAmount: room.bet_amount, totalPot: room.total_pot };

    this.activeRooms.set(cleanCode, room);
    this.save();
    this.broadcastEvent('ROOM_UPDATED', room);
    this.notifyRoom(cleanCode);

    // Update in Supabase
    if (isSupabaseConfigured) {
      supabase.from('rooms').update({
        settings: { betAmount: room.bet_amount, totalPot: room.total_pot },
      }).eq('code', cleanCode).then();
    }

    return { success: true, room, message: `Bet updated to ${room.bet_amount.toLocaleString()} Coins!` };
  }

  public joinRoom(code: string): { success: boolean; room?: RoomRecord; message: string } {
    this.load();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, message: 'Please enter a valid room code.' };
    }

    const room = this.activeRooms.get(cleanCode);
    if (!room) {
      return { success: false, message: `Room "${cleanCode}" not found. Check code and try again.` };
    }

    if (room.status !== 'open') {
      return { success: false, message: 'Match already in progress or closed.' };
    }

    const user = authService.getCurrentUser();
    const players = room.players || [];

    // If already joined
    const existing = players.find((p) => p.user_id === user.id);
    if (existing) {
      this.subscribeToSupabaseRealtime(cleanCode);
      return { success: true, room, message: 'Rejoined room' };
    }

    if (players.length >= room.max_players) {
      return { success: false, message: 'Room is already full.' };
    }

    if (room.bet_amount > 0 && user.coins < room.bet_amount) {
      return {
        success: false,
        message: `This chamber has a bet of ${room.bet_amount.toLocaleString()} Coins. Your balance is ${user.coins.toLocaleString()} Coins. Please buy coins to enter.`,
      };
    }

    // Find first available seat 0..3
    const takenSeats = new Set(players.map((p) => p.seat));
    let freeSeat = 0;
    for (let s = 0; s < 4; s++) {
      if (!takenSeats.has(s)) {
        freeSeat = s;
        break;
      }
    }

    const color = SEAT_COLORS[freeSeat];

    const newPlayer: RoomPlayerRecord = {
      id: `p_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      room_id: room.id,
      user_id: user.id,
      seat: freeSeat,
      color,
      is_ready: false,
      is_host: false,
      joined_at: new Date().toISOString(),
      profile: user,
    };

    room.players = [...players, newPlayer];
    room.total_pot = (room.bet_amount || 0) * room.players.length;
    this.activeRooms.set(cleanCode, room);
    this.save();
    this.subscribeToSupabaseRealtime(cleanCode);
    this.broadcastEvent('ROOM_UPDATED', room);
    this.notifyRoom(cleanCode);

    return { success: true, room, message: 'Joined room successfully' };
  }

  public addBotToRoom(code: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium'): RoomRecord | null {
    this.load();
    const cleanCode = code.trim().toUpperCase();
    const room = this.activeRooms.get(cleanCode);
    if (!room || (room.players?.length || 0) >= room.max_players) return null;

    const players = room.players || [];
    const takenSeats = new Set(players.map((p) => p.seat));
    let freeSeat = 0;
    for (let s = 0; s < 4; s++) {
      if (!takenSeats.has(s)) {
        freeSeat = s;
        break;
      }
    }

    const color: PlayerColor = SEAT_COLORS[freeSeat];
    const botId = `bot_${Date.now()}_${freeSeat}`;

    const botPlayer: RoomPlayerRecord = {
      id: `p_${Date.now()}_bot`,
      room_id: room.id,
      user_id: botId,
      seat: freeSeat,
      color,
      is_ready: true,
      is_host: false,
      joined_at: new Date().toISOString(),
      profile: {
        id: botId,
        username: `bot_${freeSeat + 1}`,
        display_name: `Royal Bot ${freeSeat + 1} (${difficulty.toUpperCase()})`,
        avatar_url: 'avatar_3',
        avatar_frame: 'frame_none',
        dice_skin: 'dice_gold',
        board_theme: 'theme_royal',
        token_skin: 'token_royal',
        player_id: `BOT-${Math.floor(1000 + Math.random() * 9000)}`,
        level: difficulty === 'hard' ? 20 : difficulty === 'medium' ? 10 : 5,
        xp: 1500,
        coins: 100000,
        wins: 15,
        losses: 10,
        games_played: 25,
        total_captures: 40,
        best_win_streak: 3,
        current_win_streak: 1,
        is_online: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };

    room.players = [...players, botPlayer];
    room.total_pot = (room.bet_amount || 0) * room.players.length;
    this.activeRooms.set(cleanCode, room);
    this.save();
    this.broadcastEvent('ROOM_UPDATED', room);
    this.notifyRoom(cleanCode);
    return room;
  }

  public kickPlayer(code: string, userId: string): RoomRecord | null {
    this.load();
    const cleanCode = code.trim().toUpperCase();
    const room = this.activeRooms.get(cleanCode);
    if (!room) return null;

    room.players = (room.players || []).filter((p) => p.user_id !== userId);
    room.total_pot = (room.bet_amount || 0) * (room.players.length || 1);
    this.activeRooms.set(cleanCode, room);
    this.save();
    this.broadcastEvent('ROOM_UPDATED', room);
    this.notifyRoom(cleanCode);
    return room;
  }

  public toggleReady(code: string, userId: string): RoomRecord | null {
    this.load();
    const cleanCode = code.trim().toUpperCase();
    const room = this.activeRooms.get(cleanCode);
    if (!room) return null;

    const user = authService.getCurrentUser();
    if (userId === user.id && (room.bet_amount || 0) > 0 && user.coins < room.bet_amount) {
      return null;
    }

    room.players = (room.players || []).map((p) =>
      p.user_id === userId ? { ...p, is_ready: !p.is_ready } : p
    );
    this.activeRooms.set(cleanCode, room);
    this.save();
    this.broadcastEvent('ROOM_UPDATED', room);
    this.notifyRoom(cleanCode);
    return room;
  }

  public changeSeat(code: string, userId: string, targetSeat: number): RoomRecord | null {
    this.load();
    const cleanCode = code.trim().toUpperCase();
    const room = this.activeRooms.get(cleanCode);
    if (!room) return null;

    const players = room.players || [];
    const isOccupied = players.some((p) => p.seat === targetSeat && p.user_id !== userId);
    if (isOccupied) return null;

    const color = SEAT_COLORS[targetSeat];
    room.players = players.map((p) =>
      p.user_id === userId ? { ...p, seat: targetSeat, color } : p
    );
    this.activeRooms.set(cleanCode, room);
    this.save();
    this.broadcastEvent('ROOM_UPDATED', room);
    this.notifyRoom(cleanCode);
    return room;
  }

  public startRoomMatch(code: string): RoomRecord | null {
    this.load();
    const cleanCode = code.trim().toUpperCase();
    const room = this.activeRooms.get(cleanCode);
    if (!room) return null;

    room.status = 'in_game';
    this.activeRooms.set(cleanCode, room);
    this.save();
    this.broadcastEvent('ROOM_MATCH_STARTED', room);
    this.notifyRoom(cleanCode);

    // Update in Supabase
    if (isSupabaseConfigured) {
      supabase.from('rooms').update({ status: 'in_game' }).eq('code', cleanCode).then();
    }

    return room;
  }

  public getRoom(code: string): RoomRecord | null {
    this.load();
    const cleanCode = (code || '').trim().toUpperCase();
    return this.activeRooms.get(cleanCode) || null;
  }

  public subscribe(code: string, listener: RoomListener): () => void {
    const cleanCode = (code || '').trim().toUpperCase();
    if (!this.listeners[cleanCode]) {
      this.listeners[cleanCode] = [];
    }
    this.listeners[cleanCode].push(listener);
    this.subscribeToSupabaseRealtime(cleanCode);
    listener(this.getRoom(cleanCode));

    return () => {
      this.listeners[cleanCode] = (this.listeners[cleanCode] || []).filter((l) => l !== listener);
    };
  }

  public subscribeGlobal(listener: GlobalRoomListener): () => void {
    this.globalListeners.push(listener);
    return () => {
      this.globalListeners = this.globalListeners.filter((l) => l !== listener);
    };
  }

  private notifyRoom(code: string) {
    const cleanCode = (code || '').trim().toUpperCase();
    const list = this.listeners[cleanCode];
    const room = this.getRoom(cleanCode);
    if (list && list.length > 0) {
      list.forEach((l) => l(room ? { ...room } : null));
    }
  }

  private notifyAll() {
    Object.keys(this.listeners).forEach((code) => {
      this.notifyRoom(code);
    });
  }

  private notifyGlobal(type: 'ROOM_UPDATED' | 'ROOM_MATCH_STARTED' | 'ROOM_DELETED', room: RoomRecord) {
    this.globalListeners.forEach((l) => l({ type, room }));
  }
}

export const roomService = new RoomService();
