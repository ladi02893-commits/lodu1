import { CoinPackage, DepositRequestRecord } from '../types/database';
import { authService } from './authService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface PaymentMethodConfig {
  id: 'jazzcash' | 'easypaisa' | 'bank_transfer' | 'upi' | 'card' | 'crypto';
  name: string;
  category: 'mobile_wallet' | 'bank' | 'instant' | 'crypto';
  currency: 'PKR' | 'USD' | 'INR' | 'USDT';
  accountTitle: string;
  accountNumber: string;
  bankName?: string;
  iban?: string;
  raastId?: string;
  upiId?: string;
  walletAddress?: string;
  network?: string;
  badge?: string;
  icon: string;
  instructions: string;
  color: string;
  isInstantSupported?: boolean;
}

export const COIN_PACKAGES: CoinPackage[] = [
  {
    id: 'pkg_5k',
    name: 'Novice Pouch',
    coins: 5000,
    bonusCoins: 500,
    pricePKR: 150,
    priceUSD: 0.99,
    tag: 'STARTER',
    badgeColor: 'emerald',
    icon: 'coins',
    description: 'Perfect for joining casual private matches and low stake duels.',
  },
  {
    id: 'pkg_15k',
    name: 'Noble Satchel',
    coins: 15000,
    bonusCoins: 2500,
    pricePKR: 400,
    priceUSD: 2.49,
    tag: 'POPULAR',
    badgeColor: 'amber',
    icon: 'shield',
    description: 'Generous royal allowance for tournaments and custom board stakes.',
  },
  {
    id: 'pkg_50k',
    name: 'Royal Chest',
    coins: 50000,
    bonusCoins: 12000,
    pricePKR: 1000,
    priceUSD: 5.99,
    tag: '+24% BONUS',
    badgeColor: 'purple',
    icon: 'crown',
    description: 'Master tier coin treasury for imperial champions and high-rollers.',
  },
  {
    id: 'pkg_120k',
    name: 'Imperial Treasury',
    coins: 120000,
    bonusCoins: 35000,
    pricePKR: 2000,
    priceUSD: 11.99,
    tag: 'BEST VALUE',
    badgeColor: 'yellow',
    icon: 'sparkles',
    description: 'Enormous vault of gold to dominate all high-stake private tables.',
  },
  {
    id: 'pkg_300k',
    name: 'Monarch Sovereign Vault',
    coins: 300000,
    bonusCoins: 100000,
    pricePKR: 4500,
    priceUSD: 24.99,
    tag: 'VIP MONARCH',
    badgeColor: 'rose',
    icon: 'flame',
    description: 'Uncapped sovereign reserves with lifetime VIP nobility recognition.',
  },
];

export const PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    id: 'jazzcash',
    name: 'JazzCash Wallet / Till ID',
    category: 'mobile_wallet',
    currency: 'PKR',
    accountTitle: 'Royal Ludo Imperial Treasury',
    accountNumber: '0300-1234567',
    badge: 'PAKISTAN',
    icon: 'smartphone',
    instructions: 'Send money to JazzCash Mobile Account: 0300-1234567. After sending, enter your Sender Name/Number and 12-digit TRX ID below.',
    color: '#ef4444',
  },
  {
    id: 'easypaisa',
    name: 'EasyPaisa Mobile Account',
    category: 'mobile_wallet',
    currency: 'PKR',
    accountTitle: 'Royal Ludo Official Vault',
    accountNumber: '0345-9876543',
    badge: 'PAKISTAN',
    icon: 'smartphone',
    instructions: 'Transfer funds to EasyPaisa Account: 0345-9876543. Copy the Transaction ID from the SMS/App receipt and paste below.',
    color: '#10b981',
  },
  {
    id: 'bank_transfer',
    name: 'Bank Transfer / Raast Instant',
    category: 'bank',
    currency: 'PKR',
    bankName: 'Meezan Bank Ltd (Islamic Banking)',
    accountTitle: 'Royal Ludo Gaming Services (Pvt) Ltd',
    accountNumber: '0101-0105678901',
    iban: 'PK99MEZN0001010105678901',
    raastId: '03001234567',
    badge: 'RAAST / IBAN',
    icon: 'building-2',
    instructions: 'Transfer via your mobile banking app or Raast to the Meezan Bank IBAN above. Submit your bank payment reference number.',
    color: '#3b82f6',
  },
  {
    id: 'upi',
    name: 'UPI / Google Pay / Paytm',
    category: 'mobile_wallet',
    currency: 'INR',
    accountTitle: 'Royal Ludo International',
    accountNumber: 'royalludo@okaxis',
    upiId: 'royalludo@okaxis',
    badge: 'INDIA / UPI',
    icon: 'qr-code',
    instructions: 'Scan QR or send payment to UPI ID: royalludo@okaxis. Submit your 12-digit UTR reference number.',
    color: '#f59e0b',
  },
  {
    id: 'card',
    name: 'Instant Sandbox Gateway (Demo/Card)',
    category: 'instant',
    currency: 'USD',
    accountTitle: 'Instant Sovereign Payment Gateway',
    accountNumber: 'AUTO-SANDBOX-TEST',
    badge: 'INSTANT CREDIT',
    icon: 'credit-card',
    instructions: 'Instant Test Sandbox Gateway: Automatically approves payment and delivers coins instantly to your wallet for testing.',
    color: '#8b5cf6',
    isInstantSupported: true,
  },
  {
    id: 'crypto',
    name: 'USDT (TRC20 / Binance Pay)',
    category: 'crypto',
    currency: 'USDT',
    accountTitle: 'Royal Ludo Crypto Vault',
    accountNumber: 'TFw1R9y4Xo92KqmN38ZsLtPe7BvU6aQ1aX',
    walletAddress: 'TFw1R9y4Xo92KqmN38ZsLtPe7BvU6aQ1aX',
    network: 'TRC20',
    badge: 'CRYPTO / USDT',
    icon: 'wallet',
    instructions: 'Transfer USDT TRC20 to the wallet address above. Paste your Binance Transaction Hash / Internal Transfer ID below.',
    color: '#06b6d4',
  },
];

const DEPOSIT_STORAGE_KEY = 'royal_ludo_deposit_requests';

class PaymentService {
  private depositRequests: DepositRequestRecord[] = [];
  private listeners: ((requests: DepositRequestRecord[]) => void)[] = [];
  private realtimeChannel: RealtimeChannel | null = null;
  private broadcastChannel: BroadcastChannel | null = null;

  constructor() {
    this.loadFromStorage();
    this.initRealtime();
    // Eagerly fetch from Supabase in background
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        this.fetchAllRequests().catch(() => {});
      }, 500);
    }
  }

  private initRealtime(): void {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('royal_ludo_payments_channel');
        this.broadcastChannel.onmessage = (event) => {
          const { type, request, requestId, coins, targetUserId, status, note } = event.data || {};
          if (type === 'NEW_DEPOSIT' && request) {
            this.handleIncomingDeposit(request);
          } else if (type === 'DEPOSIT_APPROVED') {
            this.handleApprovedDeposit(requestId, targetUserId, coins);
          } else if (type === 'DEPOSIT_REJECTED') {
            this.handleRejectedDeposit(requestId, note);
          }
        };
      } catch (e) {
        console.warn(e);
      }
    }

    if (isSupabaseConfigured) {
      try {
        this.realtimeChannel = supabase.channel('global_payments', {
          config: { broadcast: { self: false } },
        });

        // 1. Listen for Broadcast Events (Cross-client notification)
        this.realtimeChannel
          .on('broadcast', { event: 'NEW_DEPOSIT' }, (payload) => {
            if (payload.payload?.request) {
              this.handleIncomingDeposit(payload.payload.request);
            }
          })
          .on('broadcast', { event: 'DEPOSIT_APPROVED' }, (payload) => {
            const { requestId, targetUserId, coins } = payload.payload || {};
            this.handleApprovedDeposit(requestId, targetUserId, coins);
          })
          .on('broadcast', { event: 'DEPOSIT_REJECTED' }, (payload) => {
            const { requestId, note } = payload.payload || {};
            this.handleRejectedDeposit(requestId, note);
          });

        // 2. Listen for Postgres Changes on deposit_requests table
        this.realtimeChannel
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'deposit_requests' },
            (payload) => {
              if (payload.eventType === 'INSERT' && payload.new) {
                this.handleIncomingDeposit(payload.new as DepositRequestRecord);
              } else if (payload.eventType === 'UPDATE' && payload.new) {
                const updated = payload.new as DepositRequestRecord;
                const idx = this.depositRequests.findIndex((r) => r.id === updated.id);
                if (idx !== -1) {
                  this.depositRequests[idx] = updated;
                } else {
                  this.depositRequests.unshift(updated);
                }
                this.saveToStorage();
                this.notify();

                if (updated.status === 'approved') {
                  this.handleApprovedDeposit(updated.id, updated.user_id, updated.coins_amount);
                }
              }
            }
          )
          .subscribe();
      } catch (e) {
        console.warn('Supabase payments channel warning:', e);
      }
    }
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(DEPOSIT_STORAGE_KEY);
      if (raw) {
        this.depositRequests = JSON.parse(raw);
      } else {
        const sample: DepositRequestRecord = {
          id: 'dep_init_sample_01',
          user_id: 'guest_noble_01',
          username: 'monarch_77',
          display_name: 'Duke William',
          package_id: 'pkg_15k',
          coins_amount: 15000,
          bonus_coins: 2500,
          fiat_amount: 400,
          currency: 'PKR',
          payment_method: 'jazzcash',
          sender_account_or_name: '0301-8899776 (William)',
          transaction_reference_id: 'JC-9928172648',
          status: 'pending',
          created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
        };
        this.depositRequests = [sample];
        this.saveToStorage();
      }
    } catch (e) {
      console.warn('Error loading deposit requests:', e);
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(DEPOSIT_STORAGE_KEY, JSON.stringify(this.depositRequests));
      window.dispatchEvent(new CustomEvent('royal_ludo_sync'));
    } catch (e) {
      console.warn('Error saving deposit requests:', e);
    }
  }

  public subscribe(callback: (requests: DepositRequestRecord[]) => void): () => void {
    this.listeners.push(callback);
    callback(this.depositRequests);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => l([...this.depositRequests]));
  }

  public getPackages(): CoinPackage[] {
    return COIN_PACKAGES;
  }

  public getPaymentMethods(): PaymentMethodConfig[] {
    return PAYMENT_METHODS;
  }

  public getAllRequests(status?: 'pending' | 'approved' | 'rejected'): DepositRequestRecord[] {
    if (status) {
      return this.depositRequests.filter((r) => r.status === status);
    }
    return [...this.depositRequests];
  }

  public getUserRequests(userId: string): DepositRequestRecord[] {
    return this.depositRequests.filter((r) => r.user_id === userId);
  }

  public getPendingCount(): number {
    return this.depositRequests.filter((r) => r.status === 'pending').length;
  }

  /**
   * Asynchronously fetch latest deposit requests from Supabase cloud database
   */
  public async fetchAllRequests(): Promise<DepositRequestRecord[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('deposit_requests')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          // Merge remote records with local records
          const remoteMap = new Map<string, DepositRequestRecord>();
          data.forEach((item: any) => {
            remoteMap.set(item.id, {
              id: item.id,
              user_id: item.user_id,
              username: item.username,
              display_name: item.display_name,
              package_id: item.package_id,
              coins_amount: Number(item.coins_amount),
              bonus_coins: Number(item.bonus_coins || 0),
              fiat_amount: Number(item.fiat_amount),
              currency: item.currency || 'PKR',
              payment_method: item.payment_method,
              sender_account_or_name: item.sender_account_or_name,
              transaction_reference_id: item.transaction_reference_id,
              screenshot_url: item.screenshot_url,
              status: item.status || 'pending',
              admin_note: item.admin_note,
              created_at: item.created_at,
              reviewed_at: item.reviewed_at,
              reviewed_by: item.reviewed_by,
            });
          });

          // Keep any local requests not yet in remote
          this.depositRequests.forEach((local) => {
            if (!remoteMap.has(local.id)) {
              remoteMap.set(local.id, local);
            }
          });

          this.depositRequests = Array.from(remoteMap.values()).sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );

          this.saveToStorage();
          this.notify();
          return this.depositRequests;
        }
      } catch (err) {
        console.warn('Supabase fetchAllRequests note:', err);
      }
    }
    return this.depositRequests;
  }

  /**
   * Asynchronously fetch specific user's requests from Supabase
   */
  public async fetchUserRequests(userId: string): Promise<DepositRequestRecord[]> {
    await this.fetchAllRequests();
    return this.getUserRequests(userId);
  }

  public async createDepositRequest(params: {
    packageId: string;
    paymentMethod: PaymentMethodConfig['id'];
    senderAccountOrName: string;
    transactionReferenceId: string;
    customCoins?: number;
    customPricePKR?: number;
  }): Promise<{ success: boolean; request?: DepositRequestRecord; message: string }> {
    const user = authService.getCurrentUser();
    const pkg = COIN_PACKAGES.find((p) => p.id === params.packageId);

    let totalCoins = 0;
    let bonusCoins = 0;
    let fiatAmount = 0;
    let currency: 'PKR' | 'USD' | 'INR' | 'USDT' = 'PKR';

    const method = PAYMENT_METHODS.find((m) => m.id === params.paymentMethod);
    if (method) {
      currency = method.currency;
    }

    if (pkg) {
      totalCoins = Math.max(0, Math.floor(Math.round(pkg.coins + pkg.bonusCoins)));
      bonusCoins = Math.max(0, Math.floor(Math.round(pkg.bonusCoins)));
      fiatAmount = Math.max(0, Math.floor(Math.round(currency === 'USD' ? pkg.priceUSD : pkg.pricePKR)));
    } else if (params.customCoins && params.customCoins > 0) {
      const cleanCustom = Math.max(100, Math.floor(Math.round(Number(params.customCoins))));
      totalCoins = cleanCustom;
      bonusCoins = Math.floor(cleanCustom * 0.1);
      fiatAmount = Math.max(10, Math.floor(Math.round(params.customPricePKR || (cleanCustom / 5000) * 150)));
    } else {
      return { success: false, message: 'Invalid coin package selected.' };
    }

    if (!params.senderAccountOrName.trim()) {
      return { success: false, message: 'Please provide sender name or mobile account number.' };
    }
    if (!params.transactionReferenceId.trim()) {
      return { success: false, message: 'Please enter transaction ID (TRX/UTR/Reference).' };
    }

    const newRequest: DepositRequestRecord = {
      id: `dep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: user.id,
      username: user.username,
      display_name: user.display_name,
      package_id: params.packageId,
      coins_amount: totalCoins,
      bonus_coins: bonusCoins,
      fiat_amount: fiatAmount,
      currency,
      payment_method: params.paymentMethod,
      sender_account_or_name: params.senderAccountOrName.trim(),
      transaction_reference_id: params.transactionReferenceId.trim(),
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    this.depositRequests.unshift(newRequest);
    this.saveToStorage();
    this.notify();

    // 1. Broadcast across tabs and Supabase Realtime
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'NEW_DEPOSIT', request: newRequest });
    }
    if (this.realtimeChannel) {
      this.realtimeChannel.send({
        type: 'broadcast',
        event: 'NEW_DEPOSIT',
        payload: { request: newRequest },
      }).catch(() => {});
    }

    // 2. Persist directly into Supabase deposit_requests table
    if (isSupabaseConfigured) {
      try {
        await supabase.from('deposit_requests').upsert({
          id: newRequest.id,
          user_id: newRequest.user_id,
          username: newRequest.username,
          display_name: newRequest.display_name,
          package_id: newRequest.package_id,
          coins_amount: newRequest.coins_amount,
          bonus_coins: newRequest.bonus_coins,
          fiat_amount: newRequest.fiat_amount,
          currency: newRequest.currency,
          payment_method: newRequest.payment_method,
          sender_account_or_name: newRequest.sender_account_or_name,
          transaction_reference_id: newRequest.transaction_reference_id,
          status: newRequest.status,
          created_at: newRequest.created_at,
        });
      } catch (dbErr) {
        console.warn('Supabase deposit_requests insert warning:', dbErr);
      }

      // Record into Supabase transactions ledger
      if (!user.id.startsWith('guest_')) {
        supabase.from('transactions').insert({
          user_id: user.id,
          type: 'deposit_request',
          amount: totalCoins,
          balance_after: user.coins,
          reference_type: params.paymentMethod,
          reference_id: params.transactionReferenceId.trim(),
          description: `Deposit Request: ${totalCoins.toLocaleString()} Coins via ${params.paymentMethod}`,
        }).then();
      }
    }

    return {
      success: true,
      request: newRequest,
      message: 'Deposit request submitted successfully! Admin will verify and credit your coins shortly.',
    };
  }

  public instantSandboxCheckout(packageId: string): { success: boolean; coinsGranted: number; message: string } {
    const user = authService.getCurrentUser();
    const pkg = COIN_PACKAGES.find((p) => p.id === packageId) || COIN_PACKAGES[0];
    const totalCoins = pkg.coins + pkg.bonusCoins;

    const request: DepositRequestRecord = {
      id: `dep_sandbox_${Date.now()}`,
      user_id: user.id,
      username: user.username,
      display_name: user.display_name,
      package_id: pkg.id,
      coins_amount: totalCoins,
      bonus_coins: pkg.bonusCoins,
      fiat_amount: pkg.priceUSD,
      currency: 'USD',
      payment_method: 'card',
      sender_account_or_name: 'Instant Test Card (VISA)',
      transaction_reference_id: `SANDBOX-TX-${Date.now()}`,
      status: 'approved',
      admin_note: 'Instant Sandbox Test Gateway Auto-Approved',
      created_at: new Date().toISOString(),
      reviewed_at: new Date().toISOString(),
      reviewed_by: 'Auto-Gateway',
    };

    this.depositRequests.unshift(request);
    this.saveToStorage();
    this.notify();

    // Credit coins directly to active user
    authService.addCoinsAndXp(totalCoins, Math.floor(totalCoins * 0.1), 'shop_purchase', 'Instant Sandbox Payment');

    // Persist to Supabase if configured
    if (isSupabaseConfigured) {
      supabase.from('deposit_requests').upsert({
        id: request.id,
        user_id: request.user_id,
        username: request.username,
        display_name: request.display_name,
        package_id: request.package_id,
        coins_amount: request.coins_amount,
        bonus_coins: request.bonus_coins,
        fiat_amount: request.fiat_amount,
        currency: request.currency,
        payment_method: request.payment_method,
        sender_account_or_name: request.sender_account_or_name,
        transaction_reference_id: request.transaction_reference_id,
        status: request.status,
        admin_note: request.admin_note,
        reviewed_at: request.reviewed_at,
        reviewed_by: request.reviewed_by,
        created_at: request.created_at,
      }).then();
    }

    return {
      success: true,
      coinsGranted: totalCoins,
      message: `Instant Sandbox Payment Successful! +${totalCoins.toLocaleString()} Coins added to your wallet!`,
    };
  }

  public async approveDeposit(requestId: string, adminNote?: string): Promise<boolean> {
    const idx = this.depositRequests.findIndex((r) => r.id === requestId);
    if (idx === -1) return false;

    const req = this.depositRequests[idx];
    if (req.status === 'approved') return false;

    const note = adminNote || 'Approved and credited by Imperial Admin Command.';
    const nowStr = new Date().toISOString();

    req.status = 'approved';
    req.admin_note = note;
    req.reviewed_at = nowStr;
    req.reviewed_by = 'admin_ammar_001';

    this.depositRequests[idx] = req;
    this.saveToStorage();
    this.notify();

    // 1. Credit target user's balance in local state and Supabase profiles table
    await authService.adminGiftCoins(
      req.user_id,
      req.coins_amount,
      `Coin Purchase: ${req.coins_amount.toLocaleString()} Coins via ${req.payment_method} (Ref: ${req.transaction_reference_id})`
    );

    // 2. Update status in Supabase deposit_requests table
    if (isSupabaseConfigured) {
      try {
        await supabase.from('deposit_requests').update({
          status: 'approved',
          admin_note: note,
          reviewed_at: nowStr,
          reviewed_by: 'admin_ammar_001',
          updated_at: nowStr,
        }).eq('id', requestId);
      } catch (err) {
        console.warn('Supabase deposit update error:', err);
      }
    }

    // 3. Broadcast across tabs and Supabase Realtime
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'DEPOSIT_APPROVED',
        requestId,
        targetUserId: req.user_id,
        coins: req.coins_amount,
      });
    }
    if (this.realtimeChannel) {
      this.realtimeChannel.send({
        type: 'broadcast',
        event: 'DEPOSIT_APPROVED',
        payload: { requestId, targetUserId: req.user_id, coins: req.coins_amount },
      }).catch(() => {});
    }

    return true;
  }

  public async rejectDeposit(requestId: string, reason: string): Promise<boolean> {
    const idx = this.depositRequests.findIndex((r) => r.id === requestId);
    if (idx === -1) return false;

    const req = this.depositRequests[idx];
    const note = reason || 'Payment could not be verified.';
    const nowStr = new Date().toISOString();

    req.status = 'rejected';
    req.admin_note = note;
    req.reviewed_at = nowStr;
    req.reviewed_by = 'admin_ammar_001';

    this.depositRequests[idx] = req;
    this.saveToStorage();
    this.notify();

    // Update in Supabase deposit_requests
    if (isSupabaseConfigured) {
      try {
        await supabase.from('deposit_requests').update({
          status: 'rejected',
          admin_note: note,
          reviewed_at: nowStr,
          reviewed_by: 'admin_ammar_001',
          updated_at: nowStr,
        }).eq('id', requestId);
      } catch (err) {
        console.warn('Supabase deposit reject error:', err);
      }
    }

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'DEPOSIT_REJECTED',
        requestId,
        note,
      });
    }
    if (this.realtimeChannel) {
      this.realtimeChannel.send({
        type: 'broadcast',
        event: 'DEPOSIT_REJECTED',
        payload: { requestId, note },
      }).catch(() => {});
    }

    return true;
  }

  private handleIncomingDeposit(request: DepositRequestRecord): void {
    const existingIdx = this.depositRequests.findIndex((r) => r.id === request.id);
    if (existingIdx !== -1) {
      this.depositRequests[existingIdx] = request;
    } else {
      this.depositRequests.unshift(request);
    }
    this.saveToStorage();
    this.notify();
  }

  private handleApprovedDeposit(requestId?: string, targetUserId?: string, coins?: number): void {
    if (requestId) {
      const idx = this.depositRequests.findIndex((r) => r.id === requestId);
      if (idx !== -1) {
        this.depositRequests[idx].status = 'approved';
        this.saveToStorage();
        this.notify();
      }
    }
    const currentUser = authService.getCurrentUser();
    if (targetUserId && (currentUser.id === targetUserId || targetUserId.startsWith('guest_')) && coins) {
      authService.addCoinsAndXp(coins, Math.floor(coins * 0.1), 'shop_purchase', 'Deposit Approved & Credited');
    }
  }

  private handleRejectedDeposit(requestId?: string, note?: string): void {
    if (requestId) {
      const idx = this.depositRequests.findIndex((r) => r.id === requestId);
      if (idx !== -1) {
        this.depositRequests[idx].status = 'rejected';
        if (note) this.depositRequests[idx].admin_note = note;
        this.saveToStorage();
        this.notify();
      }
    }
  }
}

export const paymentService = new PaymentService();
