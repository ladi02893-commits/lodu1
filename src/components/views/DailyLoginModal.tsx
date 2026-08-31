import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown,
  Sparkles,
  X,
  Gift,
  Flame,
  CheckCircle2,
  Lock,
  Coins,
  Star,
  Clock,
  Award,
} from 'lucide-react';
import { rewardService, DailyLoginStatus, DailyLoginDay } from '../../services/rewardService';
import { sound } from '../../lib/audio';

interface DailyLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRewardClaimed?: (reward: DailyLoginDay, streak: number) => void;
}

export const DailyLoginModal: React.FC<DailyLoginModalProps> = ({
  isOpen,
  onClose,
  onRewardClaimed,
}) => {
  const [status, setStatus] = useState<DailyLoginStatus>(() => rewardService.getDailyLoginStatus());
  const [claimAnimation, setClaimAnimation] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStatus(rewardService.getDailyLoginStatus());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClaim = () => {
    const res = rewardService.claimDailyLoginReward();
    if (res.success && res.reward) {
      sound.playHomeGoal();
      setClaimAnimation(true);
      setStatus(rewardService.getDailyLoginStatus());
      if (onRewardClaimed) {
        onRewardClaimed(res.reward, res.streak || 1);
      }
      setTimeout(() => {
        setClaimAnimation(false);
      }, 2500);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-lg bg-[#0e1424] border border-amber-500/40 rounded-3xl p-4 sm:p-6 shadow-2xl text-white space-y-4"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#070b16] hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-800"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[10px] font-black uppercase tracking-wider">
              <Crown className="w-3 h-3 text-amber-400" />
              <span>Daily Login Tribute</span>
            </div>
            <h2 className="text-lg sm:text-xl font-royal font-black text-amber-300">
              7-Day Sovereign Rewards
            </h2>
            <div className="flex items-center justify-center gap-2 pt-1">
              <div className="inline-flex items-center gap-1 bg-[#070b16] border border-amber-500/30 px-2.5 py-0.5 rounded-xl text-[10px] font-bold">
                <Flame className="w-3 h-3 text-orange-400 fill-orange-400" />
                <span>Streak: <span className="text-amber-400 font-black">{status.streak} Days</span></span>
              </div>
              <div className="inline-flex items-center gap-1 bg-[#070b16] border border-slate-800 px-2.5 py-0.5 rounded-xl text-[10px] font-bold text-slate-300">
                <Award className="w-3 h-3 text-yellow-400" />
                <span>Total: <span className="text-white font-black">{status.totalLogins}</span></span>
              </div>
            </div>
          </div>

          {/* 7-Day Rewards Grid */}
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {status.schedule.map((dayItem) => {
              const isTodayTarget = dayItem.day === status.todayReward.day;
              const isClaimedPast =
                status.claimedToday
                  ? dayItem.day <= status.streak
                  : dayItem.day < status.todayReward.day;
              const isCurrentClaimable = isTodayTarget && status.canClaim;
              const isGrandVault = dayItem.day === 7;

              return (
                <motion.div
                  key={dayItem.day}
                  whileHover={{ scale: 1.03 }}
                  className={`relative rounded-2xl p-2 flex flex-col items-center justify-between border transition-all text-center ${
                    isGrandVault
                      ? 'col-span-2 sm:col-span-1 bg-[#070b16] border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                      : isCurrentClaimable
                      ? 'bg-[#070b16] border-amber-400 ring-1 ring-amber-400/50 shadow animate-pulse'
                      : isClaimedPast
                      ? 'bg-[#070b16] border-emerald-500/40 text-slate-400 opacity-90'
                      : 'bg-[#070b16] border-slate-800 text-slate-300'
                  }`}
                >
                  {/* Status Badges */}
                  <div className="w-full flex items-center justify-between text-[9px] font-black mb-1">
                    <span className={isGrandVault ? 'text-amber-300' : 'text-slate-400'}>
                      D{dayItem.day}
                    </span>
                    {isClaimedPast ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ) : isCurrentClaimable ? (
                      <Sparkles className="w-3 h-3 text-amber-300" />
                    ) : (
                      <Lock className="w-2.5 h-2.5 text-slate-500" />
                    )}
                  </div>

                  {/* Icon */}
                  <div className="my-1">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shadow ${
                        isGrandVault
                          ? 'bg-amber-500 text-slate-950'
                          : isCurrentClaimable
                          ? 'bg-amber-400 text-slate-950'
                          : isClaimedPast
                          ? 'bg-[#070b16] border border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {isGrandVault ? (
                        <Crown className="w-4 h-4" />
                      ) : (
                        <Gift className="w-4 h-4" />
                      )}
                    </div>
                  </div>

                  {/* Rewards summary */}
                  <div className="space-y-0.5 w-full">
                    <div className="flex items-center justify-center gap-0.5 text-[10px] font-black text-amber-300">
                      <Coins className="w-2.5 h-2.5 text-amber-400" />
                      <span>+{dayItem.coins.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-center gap-0.5 text-[9px] font-bold text-purple-300">
                      <Star className="w-2.5 h-2.5 text-purple-400" />
                      <span>+{dayItem.xp}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Action Center */}
          <div className="bg-[#070b16] border border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h4 className="text-xs font-black text-slate-100 truncate">
                {status.claimedToday
                  ? 'Tribute Claimed Today'
                  : `Day ${status.todayReward.day} Tribute Ready`}
              </h4>
              <p className="text-[10px] text-slate-400 truncate">
                {status.claimedToday
                  ? 'Next tribute unlocks tomorrow'
                  : `+${status.todayReward.coins.toLocaleString()} Coins & +${status.todayReward.xp} XP`}
              </p>
            </div>

            <div className="flex-shrink-0">
              {status.canClaim ? (
                <button
                  onClick={handleClaim}
                  disabled={claimAnimation}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-slate-950 font-royal font-black text-xs rounded-xl shadow transition-transform active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>Claim</span>
                </button>
              ) : (
                <div className="px-3 py-1.5 bg-[#0e1424] border border-emerald-500/40 text-emerald-300 text-[10px] font-bold rounded-xl flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Claimed</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
