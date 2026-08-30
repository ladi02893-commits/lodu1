import { authService } from './authService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  imageUrl?: string;
  createdAt: number;
  expiresAt?: number;
  timerSeconds?: number;
  deletedForAll?: boolean;
  deletedFor?: string[];
}

export type ChatTimerOption = 0 | 10 | 60 | 3600 | 86400;
export type DisappearingTimerOption = ChatTimerOption;

export const TIMER_PRESETS: { label: string; seconds: ChatTimerOption }[] = [
  { label: 'Off (Permanent)', seconds: 0 },
  { label: '10 Seconds', seconds: 10 },
  { label: '1 Minute', seconds: 60 },
  { label: '1 Hour', seconds: 3600 },
  { label: '24 Hours', seconds: 86400 },
];

type MessageListener = (messages: ChatMessage[]) => void;

class ChatService {
  private messages: { [conversationId: string]: ChatMessage[] } = {};
  private listeners: { [conversationId: string]: MessageListener[] } = {};
  private conversationTimers: { [conversationId: string]: ChatTimerOption } = {};
  private broadcastChannel: BroadcastChannel | null = null;
  private realtimeChannels: Map<string, RealtimeChannel> = new Map();
  private cleanupInterval: any = null;

  constructor() {
    this.loadFromStorage();
    this.initBroadcastChannel();
    this.startAutoDeleteCleanup();
  }

  private initBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('royal_ludo_chat_channel');
        this.broadcastChannel.onmessage = (event) => {
          const { type, conversationId, message, messageId, timer, deletedForAll, deletedBy } = event.data || {};
          if (type === 'NEW_MESSAGE' && message && conversationId) {
            this.handleIncomingMessage(conversationId, message);
          } else if (type === 'DELETE_MESSAGE' && conversationId && messageId) {
            this.handleIncomingDelete(conversationId, messageId, deletedForAll, deletedBy);
          } else if (type === 'CLEAR_CHAT' && conversationId) {
            this.messages[conversationId] = [];
            this.saveToStorage();
            this.notify(conversationId);
          } else if (type === 'SET_TIMER' && conversationId && timer !== undefined) {
            this.conversationTimers[conversationId] = timer;
            this.saveToStorage();
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel error in ChatService', e);
      }
    }
  }

  private subscribeToSupabaseRealtime(conversationId: string) {
    if (!isSupabaseConfigured || this.realtimeChannels.has(conversationId)) return;
    try {
      const channel = supabase.channel(`chat_${conversationId}`, {
        config: { broadcast: { self: false } },
      });

      channel
        .on('broadcast', { event: 'NEW_MESSAGE' }, (payload) => {
          if (payload.payload?.message) {
            this.handleIncomingMessage(conversationId, payload.payload.message);
          }
        })
        .on('broadcast', { event: 'DELETE_MESSAGE' }, (payload) => {
          const { messageId, deletedForAll, deletedBy } = payload.payload || {};
          if (messageId) {
            this.handleIncomingDelete(conversationId, messageId, deletedForAll, deletedBy);
          }
        })
        .on('broadcast', { event: 'CLEAR_CHAT' }, () => {
          this.messages[conversationId] = [];
          this.saveToStorage();
          this.notify(conversationId);
        })
        .on('broadcast', { event: 'SET_TIMER' }, (payload) => {
          const { timer } = payload.payload || {};
          if (timer !== undefined) {
            this.conversationTimers[conversationId] = timer;
            this.saveToStorage();
          }
        })
        .subscribe();

      this.realtimeChannels.set(conversationId, channel);
    } catch (e) {
      console.warn('Supabase chat realtime error:', e);
    }
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const rawMsgs = localStorage.getItem('royal_ludo_chat_messages');
      if (rawMsgs) this.messages = JSON.parse(rawMsgs);

      const rawTimers = localStorage.getItem('royal_ludo_chat_timers');
      if (rawTimers) this.conversationTimers = JSON.parse(rawTimers);
    } catch (e) {
      console.warn('Failed to load chat from storage', e);
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('royal_ludo_chat_messages', JSON.stringify(this.messages));
      localStorage.setItem('royal_ludo_chat_timers', JSON.stringify(this.conversationTimers));
    } catch (e) {
      console.warn('Failed to save chat to storage', e);
    }
  }

  private startAutoDeleteCleanup() {
    if (typeof window === 'undefined') return;
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let changed = false;

      Object.keys(this.messages).forEach((convId) => {
        const msgs = this.messages[convId] || [];
        const filtered = msgs.filter((m) => !m.expiresAt || m.expiresAt > now);
        if (filtered.length !== msgs.length) {
          this.messages[convId] = filtered;
          changed = true;
          this.notify(convId);
        }
      });

      if (changed) {
        this.saveToStorage();
      }
    }, 1000);
  }

  public getConversationId(friendId: string): string {
    const currentUserId = authService.getCurrentUser().id;
    const sorted = [currentUserId, friendId].sort();
    return `dm_${sorted[0]}_${sorted[1]}`;
  }

  public getMatchConversationId(matchId: string): string {
    return `match_${matchId}`;
  }

  public getConversationTimer(conversationId: string): ChatTimerOption {
    return this.conversationTimers[conversationId] || 0;
  }

  public setConversationTimer(conversationId: string, seconds: ChatTimerOption): void {
    this.conversationTimers[conversationId] = seconds;
    this.saveToStorage();

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'SET_TIMER', conversationId, timer: seconds });
    }

    if (isSupabaseConfigured) {
      const channel = this.realtimeChannels.get(conversationId);
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'SET_TIMER',
          payload: { timer: seconds },
        }).catch(() => {});
      }
    }
  }

  public getMessages(conversationId: string, currentUserId?: string): ChatMessage[] {
    const userId = currentUserId || authService.getCurrentUser().id;
    const msgs = this.messages[conversationId] || [];
    const now = Date.now();

    return msgs
      .filter((m) => !m.expiresAt || m.expiresAt > now)
      .filter((m) => !(m.deletedFor && m.deletedFor.includes(userId)));
  }

  public subscribe(conversationId: string, listener: MessageListener): () => void {
    if (!this.listeners[conversationId]) {
      this.listeners[conversationId] = [];
    }
    this.listeners[conversationId].push(listener);
    this.subscribeToSupabaseRealtime(conversationId);
    listener(this.getMessages(conversationId));

    return () => {
      this.listeners[conversationId] = (this.listeners[conversationId] || []).filter((l) => l !== listener);
    };
  }

  private notify(conversationId: string) {
    const list = this.listeners[conversationId];
    if (list && list.length > 0) {
      const visible = this.getMessages(conversationId);
      list.forEach((l) => l([...visible]));
    }
  }

  public sendMessage(conversationId: string, text: string, imageUrl?: string): ChatMessage {
    const user = authService.getCurrentUser();
    const now = Date.now();
    const timer = this.getConversationTimer(conversationId);

    const message: ChatMessage = {
      id: `msg_${now}_${Math.random().toString(36).substring(2, 7)}`,
      conversationId,
      senderId: user.id,
      senderName: user.display_name,
      senderAvatar: user.avatar_url,
      text: text ? text.trim() : '',
      imageUrl,
      createdAt: now,
      timerSeconds: timer > 0 ? timer : undefined,
      expiresAt: timer > 0 ? now + timer * 1000 : undefined,
      deletedForAll: false,
      deletedFor: [],
    };

    if (!this.messages[conversationId]) {
      this.messages[conversationId] = [];
    }
    this.messages[conversationId].push(message);
    this.saveToStorage();
    this.notify(conversationId);

    // Broadcast across browser tabs
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'NEW_MESSAGE', conversationId, message });
    }

    // Broadcast across Supabase Realtime multi-device channels
    if (isSupabaseConfigured) {
      let channel = this.realtimeChannels.get(conversationId);
      if (!channel) {
        this.subscribeToSupabaseRealtime(conversationId);
        channel = this.realtimeChannels.get(conversationId);
      }
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'NEW_MESSAGE',
          payload: { message },
        }).catch(() => {});
      }
    }

    return message;
  }

  public sendImageMessage(conversationId: string, imageUrl: string, caption?: string): ChatMessage {
    return this.sendMessage(conversationId, caption || '', imageUrl);
  }

  public deleteMessage(conversationId: string, messageId: string, deleteOption: 'everyone' | 'me' | string | boolean = false): void {
    const user = authService.getCurrentUser();
    const msgs = this.messages[conversationId] || [];
    const forEveryone = deleteOption === 'everyone' || deleteOption === true;

    this.messages[conversationId] = msgs.map((m) => {
      if (m.id === messageId) {
        if (forEveryone) {
          return { ...m, deletedForAll: true, text: 'This message was deleted', imageUrl: undefined };
        } else {
          const deletedFor = m.deletedFor || [];
          return { ...m, deletedFor: [...deletedFor, user.id] };
        }
      }
      return m;
    });

    this.saveToStorage();
    this.notify(conversationId);

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'DELETE_MESSAGE',
        conversationId,
        messageId,
        deletedForAll: forEveryone,
        deletedBy: user.id,
      });
    }

    if (isSupabaseConfigured) {
      const channel = this.realtimeChannels.get(conversationId);
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'DELETE_MESSAGE',
          payload: { messageId, deletedForAll: forEveryone, deletedBy: user.id },
        }).catch(() => {});
      }
    }
  }

  public clearChat(conversationId: string): void {
    this.messages[conversationId] = [];
    this.saveToStorage();
    this.notify(conversationId);

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'CLEAR_CHAT', conversationId });
    }

    if (isSupabaseConfigured) {
      const channel = this.realtimeChannels.get(conversationId);
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'CLEAR_CHAT',
          payload: {},
        }).catch(() => {});
      }
    }
  }

  private handleIncomingMessage(conversationId: string, message: ChatMessage) {
    if (!this.messages[conversationId]) {
      this.messages[conversationId] = [];
    }
    if (this.messages[conversationId].some((m) => m.id === message.id)) return;

    this.messages[conversationId].push(message);
    this.saveToStorage();
    this.notify(conversationId);
  }

  private handleIncomingDelete(conversationId: string, messageId: string, deletedForAll?: boolean, deletedBy?: string) {
    const msgs = this.messages[conversationId] || [];
    this.messages[conversationId] = msgs.map((m) => {
      if (m.id === messageId) {
        if (deletedForAll) {
          return { ...m, deletedForAll: true, text: 'This message was deleted', imageUrl: undefined };
        } else if (deletedBy) {
          const deletedFor = m.deletedFor || [];
          return { ...m, deletedFor: [...deletedFor, deletedBy] };
        }
      }
      return m;
    });
    this.saveToStorage();
    this.notify(conversationId);
  }
}

export const chatService = new ChatService();
