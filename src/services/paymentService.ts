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
  }

  private initRealtime(): void {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('royal_ludo_payments_channel');
        this.broadcastChannel.onmessage = (event) => {
          const { type, request, requestId, coins, targetUserId } = event.data || {};
          if (type === 'NEW_DEPOSIT' && request) {
            this.handleIncomingDeposit(request);
          } else if (type === 'DEPOSIT_APPROVED') {
            this.handleApprovedDeposit(requestId, targetUserId, coins);
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

  public createDepositRequest(params: {
    packageId: string;
    paymentMethod: PaymentMethodConfig['id'];
    senderAccountOrName: string;
    transactionReferenceId: string;
    customCoins?: number;
    customPricePKR?: number;
  }): { success: boolean; request?: DepositRequestRecord; message: string } {
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
      totalCoins = pkg.coins + pkg.bonusCoins;
      bonusCoins = pkg.bonusCoins;
      fiatAmount = currency === 'USD' ? pkg.priceUSD : pkg.pricePKR;
    } else if (params.customCoins && params.customCoins > 0) {
      totalCoins = params.customCoins;
      bonusCoins = Math.floor(params.customCoins * 0.1);
      fiatAmount = params.customPricePKR || Math.round((params.customCoins / 5000) * 150);
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

    // Broadcast across tabs and Supabase Realtime
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

    // Record into Supabase transactions table
    if (isSupabaseConfigured && !user.id.startsWith('guest_')) {
      supabase.from('transactions').insert({
        user_id: user.id,
        type: 'deposit_request',
        amount: totalCoins,
        balance_after: user.coins,
        reference_type: params.paymentMethod,
        reference_id: params.transactionReferenceId.trim(),
      }).then();
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

    return {
      success: true,
      coinsGranted: totalCoins,
      message: `Instant Sandbox Payment Successful! +${totalCoins.toLocaleString()} Coins added to your wallet!`,
    };
  }

  public approveDeposit(requestId: string, adminNote?: string): boolean {
    const idx = this.depositRequests.findIndex((r) => r.id === requestId);
    if (idx === -1) return false;

    const req = this.depositRequests[idx];
    if (req.status === 'approved') return false;

    req.status = 'approved';
    req.admin_note = adminNote || 'Approved and credited by Imperial Admin Command.';
    req.reviewed_at = new Date().toISOString();
    req.reviewed_by = 'admin_ammar_001';

    this.depositRequests[idx] = req;
    this.saveToStorage();
    this.notify();

    // Credit target user's balance
    authService.adminGiftCoins(
      req.user_id,
      req.coins_amount,
      `Coin Purchase: ${req.coins_amount.toLocaleString()} Coins via ${req.payment_method} (Ref: ${req.transaction_reference_id})`
    );

    // Broadcast across tabs and Supabase Realtime
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

  public rejectDeposit(requestId: string, reason: string): boolean {
    const idx = this.depositRequests.findIndex((r) => r.id === requestId);
    if (idx === -1) return false;

    const req = this.depositRequests[idx];
    req.status = 'rejected';
    req.admin_note = reason || 'Payment could not be verified.';
    req.reviewed_at = new Date().toISOString();
    req.reviewed_by = 'admin_ammar_001';

    this.depositRequests[idx] = req;
    this.saveToStorage();
    this.notify();

    return true;
  }

  private handleIncomingDeposit(request: DepositRequestRecord): void {
    if (this.depositRequests.some((r) => r.id === request.id)) return;
    this.depositRequests.unshift(request);
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
    if (targetUserId && currentUser.id === targetUserId && coins) {
      authService.addCoinsAndXp(coins, 0, 'shop_purchase', 'Deposit Approved & Credited');
    }
  }
}

export const paymentService = new PaymentService();
