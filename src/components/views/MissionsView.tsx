import React, { useState } from 'react';
import { ArrowLeft, Check, Coins, Flame, Gift, Sparkles, Target, Zap } from 'lucide-react';
import { sound } from '../../lib/audio';
import { rewardService, DailyLoginStatus } from '../../services/rewardService';
import { MissionRecord } from '../../types/database';

interface MissionsViewProps {
  onBack: () => void;
}

export const MissionsView: React.FC<MissionsViewProps> = ({ onBack }) => {
  const [missions, setMissions] = useState<MissionRecord[]>(rewardService.getMissions());
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');
  const [dailyStatus, setDailyStatus] = useState<DailyLoginStatus>(() => rewardService.getDailyLoginStatus());

  const filtered = missions.filter((m) => m.category === activeTab);

  const handleClaim = (missionId: string) => {
    sound.playHomeGoal();
    const success = rewardService.claimMission(missionId);
    if (success) {
      setMissions(rewardService.getMissions());
    }
  };

  const handleClaimDailyLogin = () => {
    const res = rewardService.claimDailyLoginReward();
    if (res.success) {
      sound.playHomeGoal();
      setDailyStatus(rewardService.getDailyLoginStatus());
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center pb-16 overflow-x-hidden">
      {/* Header */}
      <header className="w-full max-w-4xl px-4 py-4 flex items-center justify-between border-b border-amber-500/20 bg-slate-950/80 sticky top-0 z-20 backdrop-blur-md">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-300 transition-all cursor-pointer text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Court</span>
        </button>

        <h2 className="font-royal font-bold text-sm sm:text-base text-amber-300">
          Royal Quests & Decrees
        </h2>

        <div className="w-16" />
      </header>

      <main className="w-full max-w-2xl px-4 py-6 space-y-6">
        {/* Daily Login Tribute Banner */}
        <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border border-amber-500/50 flex items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 shadow-md flex-shrink-0">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-royal font-bold text-sm sm:text-base text-amber-200">
                  Daily Login Tribute
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[10px] font-black flex items-center gap-1">
                  <Flame className="w-3 h-3 text-orange-400 fill-orange-400" />
                  Day {dailyStatus.streak || 1} Streak
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Day {dailyStatus.todayReward.day}: +{dailyStatus.todayReward.coins.toLocaleString()} Coins, +{dailyStatus.todayReward.xp} XP ({dailyStatus.todayReward.title})
              </p>
            </div>
          </div>

          <div className="flex-shrink-0">
            {dailyStatus.canClaim ? (
              <button
                onClick={handleClaimDailyLogin}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 font-bold text-slate-950 text-xs shadow-md shadow-amber-500/30 animate-pulse cursor-pointer flex items-center gap-1.5"
              >
                <Gift className="w-4 h-4" />
                <span>Claim Tribute</span>
              </button>
            ) : (
              <span className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 font-bold text-xs flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Claimed</span>
              </span>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('daily');
            }}
            className={`
              py-2.5 rounded-xl font-royal font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2
              ${activeTab === 'daily' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}
            `}
          >
            <Target className="w-4 h-4" />
            <span>Daily Decrees</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('weekly');
            }}
            className={`
              py-2.5 rounded-xl font-royal font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2
              ${activeTab === 'weekly' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}
            `}
          >
            <Sparkles className="w-4 h-4" />
            <span>Weekly Conquests</span>
          </button>
        </div>

        {/* Missions Cards List */}
        <div className="space-y-3">
          {filtered.map((mission) => {
            const currentProgress = mission.progress || 0;
            const targetVal = mission.requirement_value;
            const pct = Math.min(100, Math.round((currentProgress / targetVal) * 100));

            return (
              <div
                key={mission.id}
                className={`
                  p-5 rounded-3xl border transition-all duration-200 space-y-3
                  ${mission.completed && !mission.claimed ? 'bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/50 border-amber-400/80 shadow-lg shadow-amber-500/10' : 'bg-slate-900/80 border-slate-800'}
                `}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="font-royal font-bold text-sm text-slate-100">
                      {mission.title}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {mission.description}
                    </p>
                  </div>

                  {/* Rewards Pills */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-300 font-bold text-xs">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      <span>+{mission.reward_coins}</span>
                    </div>

                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-300 font-bold text-xs">
                      <Zap className="w-3.5 h-3.5 text-purple-400" />
                      <span>+{mission.reward_xp} XP</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar & Claim Button */}
                <div className="flex items-center justify-between gap-4 pt-1">
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                      <span>Progress</span>
                      <span className="text-amber-300">
                        {currentProgress} / {targetVal}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Claim Status */}
                  <div className="flex-shrink-0">
                    {mission.claimed ? (
                      <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-500 font-bold text-xs flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Claimed</span>
                      </span>
                    ) : mission.completed ? (
                      <button
                        onClick={() => handleClaim(mission.id)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 font-bold text-slate-950 text-xs shadow-md shadow-amber-500/30 animate-pulse cursor-pointer flex items-center gap-1.5"
                      >
                        <Gift className="w-4 h-4" />
                        <span>Claim Reward</span>
                      </button>
                    ) : (
                      <span className="px-3 py-1.5 rounded-xl bg-slate-950 text-slate-500 font-semibold text-xs border border-slate-800">
                        In Progress
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};
