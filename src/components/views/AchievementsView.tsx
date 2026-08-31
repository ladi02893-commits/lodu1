import React, { useState } from 'react';
import { ArrowLeft, Award, Check, Coins, Crown, Flame, Gift, Shield, Swords, Zap } from 'lucide-react';
import { sound } from '../../lib/audio';
import { rewardService } from '../../services/rewardService';
import { AchievementRecord } from '../../types/database';

interface AchievementsViewProps {
  onBack: () => void;
}

export const AchievementsView: React.FC<AchievementsViewProps> = ({ onBack }) => {
  const [achievements, setAchievements] = useState<AchievementRecord[]>(
    rewardService.getAchievements()
  );

  const handleClaim = (achId: string) => {
    sound.playHomeGoal();
    const success = rewardService.claimAchievement(achId);
    if (success) {
      setAchievements(rewardService.getAchievements());
    }
  };

  const renderIcon = (iconName?: string) => {
    switch (iconName) {
      case 'crown':
        return <Crown className="w-6 h-6 text-amber-400" />;
      case 'swords':
        return <Swords className="w-6 h-6 text-rose-400" />;
      case 'shield':
        return <Shield className="w-6 h-6 text-blue-400" />;
      case 'flame':
        return <Flame className="w-6 h-6 text-orange-400" />;
      default:
        return <Award className="w-6 h-6 text-amber-400" />;
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
          Imperial Trophies
        </h2>

        <div className="w-14" />
      </header>

      <main className="w-full max-w-xl px-3.5 sm:px-4 py-4 space-y-2.5 z-10">
        {achievements.map((ach) => (
          <div
            key={ach.id}
            className={`
              p-4 rounded-3xl border transition-all duration-200 flex items-center justify-between gap-3
              ${ach.unlocked && !ach.claimed ? 'bg-[#0e1424] border-amber-400 shadow-xl shadow-amber-500/10' : ach.unlocked ? 'bg-[#0e1424] border-slate-800' : 'bg-[#0e1424]/60 border-slate-900 opacity-60'}
            `}
          >
            <div className="flex items-center gap-3 text-left min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-[#070b16] border border-amber-400/30 flex items-center justify-center flex-shrink-0">
                {renderIcon(ach.icon)}
              </div>

              <div className="space-y-0.5 min-w-0">
                <h3 className="font-royal font-black text-xs sm:text-sm text-slate-100 truncate">
                  {ach.title}
                </h3>
                <p className="text-[10px] text-slate-400 line-clamp-1">
                  {ach.description}
                </p>

                <div className="flex items-center gap-2 pt-0.5">
                  <span className="flex items-center gap-1 text-[10px] font-bold text-amber-300">
                    <Coins className="w-3 h-3 text-amber-400" />
                    +{ach.reward_coins}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-purple-300">
                    <Zap className="w-3 h-3 text-purple-400" />
                    +{ach.reward_xp} XP
                  </span>
                </div>
              </div>
            </div>

            {/* Action */}
            <div className="flex-shrink-0">
              {ach.claimed ? (
                <span className="px-2.5 py-1 rounded-xl bg-[#070b16] text-slate-500 font-bold text-[10px] flex items-center gap-1 border border-slate-800">
                  <Check className="w-3 h-3" />
                  <span>Claimed</span>
                </span>
              ) : ach.unlocked ? (
                <button
                  onClick={() => handleClaim(ach.id)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 font-royal font-black text-slate-950 text-[10px] shadow active:scale-95 cursor-pointer flex items-center gap-1"
                >
                  <Gift className="w-3 h-3" />
                  <span>Claim</span>
                </button>
              ) : (
                <span className="px-2.5 py-1 rounded-xl bg-[#070b16] text-slate-600 font-semibold text-[10px] border border-slate-800">
                  Locked
                </span>
              )}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
};
