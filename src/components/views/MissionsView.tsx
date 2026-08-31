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
    <div className="w-full min-h-screen bg-[#070b16] text-slate-100 flex flex-col items-center pb-20 overflow-x-hidden font-sans">
      {/* Header */}
      <header className="w-full max-w-xl px-4 py-3 flex items-center justify-between border-b border-amber-500/10 bg-[#070b16]/95 sticky top-0 z-30 backdrop-blur-md">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0e1424] border border-slate-800 text-slate-300 hover:text-amber-300 transition-all cursor-pointer text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Court</span>
        </button>

        <h2 className="font-royal font-black text-sm sm:text-base text-amber-300 uppercase tracking-wider">
          Royal Missions
        </h2>

        <div className="w-14" />
      </header>

      <main className="w-full max-w-xl px-3.5 sm:px-4 py-4 space-y-3.5 z-10">
        {/* Daily Login Tribute Banner */}
        <div className="p-4 rounded-3xl bg-[#0e1424] border border-amber-500/30 flex items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 shadow flex-shrink-0">
              <Gift className="w-6 h-6 fill-slate-950" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-royal font-black text-xs sm:text-sm text-slate-100 truncate">
                  Daily Login Tribute
                </h3>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[9px] font-black flex items-center gap-0.5 whitespace-nowrap">
                  <Flame className="w-2.5 h-2.5 text-orange-400 fill-orange-400" />
                  Day {dailyStatus.streak || 1}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                Day {dailyStatus.todayReward.day}: +{dailyStatus.todayReward.coins.toLocaleString()} Coins, +{dailyStatus.todayReward.xp} XP
              </p>
            </div>
          </div>

          <div className="flex-shrink-0">
            {dailyStatus.canClaim ? (
              <button
                onClick={handleClaimDailyLogin}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 font-royal font-black text-slate-950 text-xs shadow active:scale-95 cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
              >
                <Gift className="w-3.5 h-3.5" />
                <span>Claim</span>
              </button>
            ) : (
              <span className="px-2.5 py-1.5 rounded-xl bg-[#070b16] border border-slate-800 text-slate-400 font-bold text-xs flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Claimed</span>
              </span>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[#0e1424] border border-slate-800">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('daily');
            }}
            className={`
              py-2 rounded-xl font-royal font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5
              ${activeTab === 'daily' ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}
            `}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Daily Decrees</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('weekly');
            }}
            className={`
              py-2 rounded-xl font-royal font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5
              ${activeTab === 'weekly' ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}
            `}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Weekly Conquests</span>
          </button>
        </div>

        {/* Missions Cards List */}
        <div className="space-y-2.5">
          {filtered.map((mission) => {
            const currentProgress = mission.progress || 0;
            const targetVal = mission.requirement_value;
            const pct = Math.min(100, Math.round((currentProgress / targetVal) * 100));

            return (
              <div
                key={mission.id}
                className={`
                  p-4 rounded-3xl border transition-all duration-200 space-y-2.5
                  ${mission.completed && !mission.claimed ? 'bg-[#0e1424] border-amber-400/80 shadow-lg shadow-amber-500/10' : 'bg-[#0e1424] border-slate-800'}
                `}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="space-y-0.5 min-w-0">
                    <h3 className="font-royal font-black text-xs sm:text-sm text-slate-100 truncate">
                      {mission.title}
                    </h3>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      {mission.description}
                    </p>
                  </div>

                  {/* Rewards Pills */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-xl bg-[#070b16] border border-amber-500/40 text-amber-300 font-bold text-[10px]">
                      <Coins className="w-3 h-3 text-amber-400" />
                      <span>+{mission.reward_coins}</span>
                    </div>

                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-xl bg-[#070b16] border border-purple-500/40 text-purple-300 font-bold text-[10px]">
                      <Zap className="w-3 h-3 text-purple-400" />
                      <span>+{mission.reward_xp} XP</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar & Claim Button */}
                <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800/80">
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                      <span>Progress</span>
                      <span className="text-amber-300 font-bold">
                        {currentProgress} / {targetVal}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800/80 overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Claim Status */}
                  <div className="flex-shrink-0">
                    {mission.claimed ? (
                      <span className="px-2.5 py-1 rounded-xl bg-[#070b16] text-slate-500 font-bold text-[10px] flex items-center gap-1 border border-slate-800">
                        <Check className="w-3 h-3" />
                        <span>Claimed</span>
                      </span>
                    ) : mission.completed ? (
                      <button
                        onClick={() => handleClaim(mission.id)}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 font-royal font-black text-slate-950 text-[10px] shadow active:scale-95 cursor-pointer flex items-center gap-1"
                      >
                        <Gift className="w-3 h-3" />
                        <span>Claim</span>
                      </button>
                    ) : (
                      <span className="px-2.5 py-1 rounded-xl bg-[#070b16] text-slate-500 font-semibold text-[10px] border border-slate-800">
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
