import { authService } from './authService';
import { sound } from '../lib/audio';

export interface WheelPrize {
  id: number;
  label: string;
  sublabel: string;
  type: 'coins' | 'gems' | 'skin' | 'jackpot';
  amount: number;
  color: string;
  textColor: string;
  probability: number; // relative weight
  icon: string;
}

export const WHEEL_PRIZES: WheelPrize[] = [
  {
    id: 0,
    label: '500',
    sublabel: 'Coins',
    type: 'coins',
    amount: 500,
    color: '#1e293b',
    textColor: '#f8fafc',
    probability: 30,
    icon: '🪙',
  },
  {
    id: 1,
    label: '1,000',
    sublabel: 'Coins',
    type: 'coins',
    amount: 1000,
    color: '#b45309',
    textColor: '#fef08a',
    probability: 25,
    icon: '🪙',
  },
  {
    id: 2,
    label: '2,500',
    sublabel: 'Coins',
    type: 'coins',
    amount: 2500,
    color: '#047857',
    textColor: '#a7f3d0',
    probability: 18,
    icon: '🪙',
  },
  {
    id: 3,
    label: '5,000',
    sublabel: 'Coins',
    type: 'coins',
    amount: 5000,
    color: '#1d4ed8',
    textColor: '#bfdbfe',
    probability: 12,
    icon: '💰',
  },
  {
    id: 4,
    label: '25 Gems',
    sublabel: 'Royal Ruby',
    type: 'gems',
    amount: 25,
    color: '#be185d',
    textColor: '#fbcfe8',
    probability: 8,
    icon: '💎',
  },
  {
    id: 5,
    label: '10,000',
    sublabel: 'Imperial',
    type: 'coins',
    amount: 10000,
    color: '#6d28d9',
    textColor: '#e9d5ff',
    probability: 5,
    icon: '👑',
  },
  {
    id: 6,
    label: 'JACKPOT',
    sublabel: '25,000 Coins',
    type: 'jackpot',
    amount: 25000,
    color: '#d97706',
    textColor: '#ffffff',
    probability: 2,
    icon: '🏆',
  },
  {
    id: 7,
    label: 'Mystery',
    sublabel: 'Dice Skin',
    type: 'skin',
    amount: 1,
    color: '#0f172a',
    textColor: '#fbbf24',
    probability: 5,
    icon: '🎲',
  },
];

export interface LuckyWheelStatus {
  canFreeSpin: boolean;
  lastSpinTimestamp: number | null;
  nextFreeSpinInSeconds: number;
  totalSpins: number;
  spinCostCoins: number;
}

class LuckyWheelService {
  private lastSpinTimestamp: number | null = null;
  private totalSpins: number = 0;
  public readonly FREE_SPIN_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 Hours
  public readonly PAID_SPIN_COST_COINS = 500;

  constructor() {
    this.loadState();
  }

  private loadState() {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('royal_ludo_lucky_wheel');
      if (raw) {
        const data = JSON.parse(raw);
        this.lastSpinTimestamp = data.lastSpinTimestamp ?? null;
        this.totalSpins = data.totalSpins ?? 0;
      }
    } catch (e) {
      console.warn('Lucky wheel load error:', e);
    }
  }

  private saveState() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        'royal_ludo_lucky_wheel',
        JSON.stringify({
          lastSpinTimestamp: this.lastSpinTimestamp,
          totalSpins: this.totalSpins,
        })
      );
    } catch (e) {
      console.warn('Lucky wheel save error:', e);
    }
  }

  public getStatus(): LuckyWheelStatus {
    const now = Date.now();
    const last = this.lastSpinTimestamp || 0;
    const diff = now - last;
    const canFreeSpin = diff >= this.FREE_SPIN_COOLDOWN_MS;
    const remainingMs = Math.max(0, this.FREE_SPIN_COOLDOWN_MS - diff);

    return {
      canFreeSpin,
      lastSpinTimestamp: this.lastSpinTimestamp,
      nextFreeSpinInSeconds: Math.ceil(remainingMs / 1000),
      totalSpins: this.totalSpins,
      spinCostCoins: this.PAID_SPIN_COST_COINS,
    };
  }

  public pickRandomPrizeIndex(): number {
    const totalWeight = WHEEL_PRIZES.reduce((acc, p) => acc + p.probability, 0);
    let rand = Math.random() * totalWeight;

    for (let i = 0; i < WHEEL_PRIZES.length; i++) {
      if (rand < WHEEL_PRIZES[i].probability) {
        return i;
      }
      rand -= WHEEL_PRIZES[i].probability;
    }
    return 0;
  }

  public spin(isFreeSpin: boolean): { success: boolean; prize?: WheelPrize; prizeIndex?: number; message?: string } {
    const user = authService.getCurrentUser();
    const status = this.getStatus();

    if (isFreeSpin) {
      if (!status.canFreeSpin) {
        return {
          success: false,
          message: 'Free Daily Spin not ready yet. Come back tomorrow or spin with 500 Coins!',
        };
      }
      this.lastSpinTimestamp = Date.now();
    } else {
      if (user.coins < this.PAID_SPIN_COST_COINS) {
        return {
          success: false,
          message: `Insufficient coins. You need ${this.PAID_SPIN_COST_COINS} Coins to spin the Fortune Wheel!`,
        };
      }
      // Deduct paid spin cost
      authService.addCoinsAndXp(
        -this.PAID_SPIN_COST_COINS,
        10,
        'shop_purchase',
        'Wagered 500 Coins on Lucky Fortune Wheel Spin'
      );
    }

    this.totalSpins += 1;
    this.saveState();

    const prizeIndex = this.pickRandomPrizeIndex();
    const prize = WHEEL_PRIZES[prizeIndex];

    // Credit prize to user
    if (prize.type === 'coins' || prize.type === 'jackpot') {
      authService.addCoinsAndXp(
        prize.amount,
        prize.amount > 5000 ? 500 : 100,
        'daily_bonus',
        `👑 Won ${prize.amount.toLocaleString()} Coins on Lucky Fortune Wheel!`
      );
    } else if (prize.type === 'gems') {
      authService.addCoinsAndXp(2000, 250, 'daily_bonus', '💎 Won 25 Royal Gems on Lucky Fortune Wheel!');
    } else if (prize.type === 'skin') {
      authService.updateProfile({ dice_skin: 'dice_obsidian' });
      authService.addCoinsAndXp(1000, 300, 'daily_bonus', '🎲 Unlocked Obsidian Royal Dice Skin!');
    }

    return {
      success: true,
      prize,
      prizeIndex,
      message: `🎉 Congratulations! You won ${prize.label} ${prize.sublabel}!`,
    };
  }
}

export const luckyWheelService = new LuckyWheelService();
