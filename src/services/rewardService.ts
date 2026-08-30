import { authService } from './authService';
import { AchievementRecord, MissionRecord } from '../types/database';

export interface DailyLoginDay {
  day: number;
  title: string;
  coins: number;
  xp: number;
  highlight?: boolean;
}

export const DAILY_LOGIN_SCHEDULE: DailyLoginDay[] = [
  { day: 1, title: "Squire's Purse", coins: 500, xp: 100 },
  { day: 2, title: "Knight's Allowance", coins: 750, xp: 150 },
  { day: 3, title: "Baron's Cache", coins: 1000, xp: 250 },
  { day: 4, title: "Viscount's Bounty", coins: 1500, xp: 350 },
  { day: 5, title: "Earl's Tribute", coins: 2000, xp: 500 },
  { day: 6, title: "Duke's Hoard", coins: 3000, xp: 750 },
  { day: 7, title: "Imperial Sovereign Vault", coins: 5000, xp: 1500, highlight: true },
];

export interface DailyLoginStatus {
  canClaim: boolean;
  claimedToday: boolean;
  streak: number; // Current day (1..7)
  lastClaimDate: string | null;
  totalLogins: number;
  todayReward: DailyLoginDay;
  schedule: DailyLoginDay[];
}

export interface DailyClaimResult {
  success: boolean;
  reward?: DailyLoginDay;
  streak?: number;
  message?: string;
}

const getTodayDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getYesterdayDateString = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const DEFAULT_MISSIONS: MissionRecord[] = [
  {
    id: 'daily_play_3',
    title: 'Casual Stroll',
    description: 'Play 3 Ludo matches in any mode',
    category: 'daily',
    requirement_type: 'play_games',
    requirement_value: 3,
    reward_coins: 250,
    reward_xp: 100,
  },
  {
    id: 'daily_win_1',
    title: 'Royal Triumph',
    description: 'Win 1 match against players or bots',
    category: 'daily',
    requirement_type: 'win_games',
    requirement_value: 1,
    reward_coins: 300,
    reward_xp: 150,
  },
  {
    id: 'daily_capture_4',
    title: 'Token Hunter',
    description: 'Capture 4 opponent tokens on the board',
    category: 'daily',
    requirement_type: 'captures',
    requirement_value: 4,
    reward_coins: 350,
    reward_xp: 180,
  },
  {
    id: 'weekly_win_5',
    title: 'Grand Monarch',
    description: 'Win 5 online or local matches',
    category: 'weekly',
    requirement_type: 'win_games',
    requirement_value: 5,
    reward_coins: 1000,
    reward_xp: 500,
  },
  {
    id: 'weekly_capture_15',
    title: 'Relentless Conqueror',
    description: 'Capture 15 opponent tokens across matches',
    category: 'weekly',
    requirement_type: 'captures',
    requirement_value: 15,
    reward_coins: 1200,
    reward_xp: 600,
  },
];

export const DEFAULT_ACHIEVEMENTS: AchievementRecord[] = [
  {
    id: 'first_victory',
    title: 'First Crown',
    description: 'Win your first Royal Ludo match',
    icon: 'crown',
    requirement_type: 'win_games',
    requirement_value: 1,
    reward_coins: 500,
    reward_xp: 250,
  },
  {
    id: 'ten_victories',
    title: 'Seasoned Noble',
    description: 'Win 10 matches',
    icon: 'award',
    requirement_type: 'win_games',
    requirement_value: 10,
    reward_coins: 1500,
    reward_xp: 750,
  },
  {
    id: 'fifty_victories',
    title: 'Supreme Champion',
    description: 'Win 50 matches',
    icon: 'shield',
    requirement_type: 'win_games',
    requirement_value: 50,
    reward_coins: 5000,
    reward_xp: 2500,
  },
  {
    id: 'ten_captures',
    title: 'Ruthless Strike',
    description: 'Capture 10 tokens',
    icon: 'swords',
    requirement_type: 'captures',
    requirement_value: 10,
    reward_coins: 800,
    reward_xp: 400,
  },
  {
    id: 'fifty_captures',
    title: 'Realm Protector',
    description: 'Capture 50 tokens',
    icon: 'zap',
    requirement_type: 'captures',
    requirement_value: 50,
    reward_coins: 3000,
    reward_xp: 1500,
  },
  {
    id: 'streak_3',
    title: 'Royal Streak',
    description: 'Achieve a 3-match win streak',
    icon: 'flame',
    requirement_type: 'streak',
    requirement_value: 3,
    reward_coins: 1000,
    reward_xp: 500,
  },
  {
    id: 'streak_5',
    title: 'Unstoppable Momentum',
    description: 'Achieve a 5-match win streak',
    icon: 'flame',
    requirement_type: 'streak',
    requirement_value: 5,
    reward_coins: 2500,
    reward_xp: 1200,
  },
];

class RewardService {
  private claimedMissions: Set<string> = new Set();
  private claimedAchievements: Set<string> = new Set();
  private dailyLoginData: { lastClaimDate: string | null; streak: number; totalLogins: number } = {
    lastClaimDate: null,
    streak: 0,
    totalLogins: 0,
  };

  constructor() {
    this.loadClaimed();
  }

  private loadClaimed() {
    if (typeof window === 'undefined') return;
    try {
      const mRaw = localStorage.getItem('royal_ludo_claimed_missions');
      if (mRaw) this.claimedMissions = new Set(JSON.parse(mRaw));
      const aRaw = localStorage.getItem('royal_ludo_claimed_achievements');
      if (aRaw) this.claimedAchievements = new Set(JSON.parse(aRaw));

      const dailyRaw = localStorage.getItem('royal_ludo_daily_login');
      if (dailyRaw) {
        this.dailyLoginData = JSON.parse(dailyRaw);
      }
    } catch (e) {
      console.warn(e);
    }
  }

  private saveClaimed() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('royal_ludo_claimed_missions', JSON.stringify([...this.claimedMissions]));
      localStorage.setItem('royal_ludo_claimed_achievements', JSON.stringify([...this.claimedAchievements]));
      localStorage.setItem('royal_ludo_daily_login', JSON.stringify(this.dailyLoginData));
    } catch (e) {
      console.warn(e);
    }
  }

  public getDailyLoginStatus(): DailyLoginStatus {
    const today = getTodayDateString();
    const yesterday = getYesterdayDateString();
    const { lastClaimDate, streak, totalLogins } = this.dailyLoginData;

    const claimedToday = lastClaimDate === today;
    let nextDayIndex = 1;

    if (claimedToday) {
      nextDayIndex = streak > 0 ? streak : 1;
    } else if (lastClaimDate === yesterday) {
      // Kept streak!
      nextDayIndex = (streak % 7) + 1;
    } else {
      // Streak reset or first login
      nextDayIndex = 1;
    }

    const todayReward = DAILY_LOGIN_SCHEDULE.find((s) => s.day === nextDayIndex) || DAILY_LOGIN_SCHEDULE[0];

    return {
      canClaim: !claimedToday,
      claimedToday,
      streak: claimedToday ? streak : (lastClaimDate === yesterday ? streak : 0),
      lastClaimDate,
      totalLogins,
      todayReward,
      schedule: DAILY_LOGIN_SCHEDULE,
    };
  }

  public claimDailyLoginReward(): DailyClaimResult {
    const status = this.getDailyLoginStatus();
    if (!status.canClaim) {
      return {
        success: false,
        message: 'Daily login reward already claimed for today. Return tomorrow for your next royal tribute!',
      };
    }

    const reward = status.todayReward;
    const today = getTodayDateString();
    const yesterday = getYesterdayDateString();

    const newStreak = this.dailyLoginData.lastClaimDate === yesterday
      ? (this.dailyLoginData.streak % 7) + 1
      : 1;

    this.dailyLoginData = {
      lastClaimDate: today,
      streak: newStreak,
      totalLogins: (this.dailyLoginData.totalLogins || 0) + 1,
    };

    this.saveClaimed();

    // Grant user coins and XP
    authService.addCoinsAndXp(reward.coins, reward.xp);

    return {
      success: true,
      reward,
      streak: newStreak,
      message: `Royal Daily Login Tribute claimed! +${reward.coins.toLocaleString()} Coins & +${reward.xp} XP!`,
    };
  }

  public checkAndAutoClaimDailyLogin(): DailyClaimResult | null {
    const status = this.getDailyLoginStatus();
    if (status.canClaim) {
      return this.claimDailyLoginReward();
    }
    return null;
  }

  public getMissions(): MissionRecord[] {
    const user = authService.getCurrentUser();
    return DEFAULT_MISSIONS.map((mission) => {
      let progress = 0;
      if (mission.requirement_type === 'play_games') progress = user.games_played;
      if (mission.requirement_type === 'win_games') progress = user.wins;
      if (mission.requirement_type === 'captures') progress = user.total_captures;
      if (mission.requirement_type === 'streak') progress = user.current_win_streak;

      const completed = progress >= mission.requirement_value;
      const claimed = this.claimedMissions.has(mission.id);

      return {
        ...mission,
        progress: Math.min(progress, mission.requirement_value),
        completed,
        claimed,
      };
    });
  }

  public claimMission(missionId: string): boolean {
    const missions = this.getMissions();
    const target = missions.find((m) => m.id === missionId);
    if (!target || !target.completed || target.claimed) return false;

    this.claimedMissions.add(missionId);
    this.saveClaimed();
    authService.addCoinsAndXp(target.reward_coins, target.reward_xp);
    return true;
  }

  public getAchievements(): AchievementRecord[] {
    const user = authService.getCurrentUser();
    return DEFAULT_ACHIEVEMENTS.map((ach) => {
      let stat = 0;
      if (ach.requirement_type === 'win_games') stat = user.wins;
      if (ach.requirement_type === 'captures') stat = user.total_captures;
      if (ach.requirement_type === 'streak') stat = user.best_win_streak;

      const unlocked = stat >= ach.requirement_value;
      const claimed = this.claimedAchievements.has(ach.id);

      return {
        ...ach,
        unlocked,
        claimed,
      };
    });
  }

  public claimAchievement(achievementId: string): boolean {
    const achievements = this.getAchievements();
    const target = achievements.find((a) => a.id === achievementId);
    if (!target || !target.unlocked || target.claimed) return false;

    this.claimedAchievements.add(achievementId);
    this.saveClaimed();
    authService.addCoinsAndXp(target.reward_coins, target.reward_xp);
    return true;
  }
}

export const rewardService = new RewardService();
