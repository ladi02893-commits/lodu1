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
          Imperial Trophies
        </h2>

        <div className="w-16" />
      </header>

      <main className="w-full max-w-2xl px-4 py-6 space-y-4">
        {achievements.map((ach) => (
          <div
            key={ach.id}
            className={`
              p-5 rounded-3xl border transition-all duration-200 flex flex-col sm:flex-row items-center justify-between gap-4
              ${ach.unlocked && !ach.claimed ? 'bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/50 border-amber-400 shadow-xl shadow-amber-500/10' : ach.unlocked ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-950/40 border-slate-900 opacity-60'}
            `}
          >
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-amber-400/30 flex items-center justify-center flex-shrink-0">
                {renderIcon(ach.icon)}
              </div>

              <div className="space-y-0.5">
                <h3 className="font-royal font-bold text-sm text-slate-100">
                  {ach.title}
                </h3>
                <p className="text-xs text-slate-400">
                  {ach.description}
                </p>

                <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                  <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                    <Coins className="w-3 h-3" />
                    +{ach.reward_coins} Coins
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-bold text-purple-400">
                    <Zap className="w-3 h-3" />
                    +{ach.reward_xp} XP
                  </span>
                </div>
              </div>
            </div>

            {/* Action */}
            <div className="flex-shrink-0">
              {ach.claimed ? (
                <span className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-500 font-bold text-xs flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Claimed</span>
                </span>
              ) : ach.unlocked ? (
                <button
                  onClick={() => handleClaim(ach.id)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 font-bold text-slate-950 text-xs shadow-md shadow-amber-500/30 animate-pulse cursor-pointer flex items-center gap-1.5"
                >
                  <Gift className="w-4 h-4" />
                  <span>Claim</span>
                </button>
              ) : (
                <span className="px-3 py-1.5 rounded-xl bg-slate-950 text-slate-600 font-semibold text-xs border border-slate-900">
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
