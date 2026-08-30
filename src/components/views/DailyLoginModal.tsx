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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950/40 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)] text-white overflow-hidden"
        >
          {/* Ambient Glows */}
          <div className="absolute -top-24 -left-24 w-60 h-60 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-yellow-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-white/10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-black uppercase tracking-wider mb-2">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              Imperial Kingdom Calendar
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-transparent font-serif">
              Daily Login Tribute
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-md mx-auto">
              Open Royal Ludo every day to unlock sovereign gold bounties, royal XP, and the 7-day Grand Treasury!
            </p>

            {/* Streak & Stats Tracker */}
            <div className="flex items-center justify-center gap-4 mt-3">
              <div className="inline-flex items-center gap-1.5 bg-slate-800/80 border border-amber-500/30 px-3 py-1 rounded-xl text-xs font-bold">
                <Flame className="w-4 h-4 text-orange-400 fill-orange-400" />
                <span>Streak: <span className="text-amber-400 font-black">{status.streak} Days</span></span>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 px-3 py-1 rounded-xl text-xs font-bold text-slate-300">
                <Award className="w-4 h-4 text-yellow-400" />
                <span>Total Logins: <span className="text-white font-black">{status.totalLogins}</span></span>
              </div>
            </div>
          </div>

          {/* 7-Day Rewards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3 mb-6">
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
                  className={`relative rounded-2xl p-3 flex flex-col items-center justify-between border transition-all text-center ${
                    isGrandVault
                      ? 'col-span-2 sm:col-span-4 lg:col-span-1 bg-gradient-to-b from-amber-600/30 via-yellow-700/20 to-slate-900 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                      : isCurrentClaimable
                      ? 'bg-gradient-to-b from-amber-500/20 to-slate-800/90 border-amber-400 ring-2 ring-amber-400/50 shadow-lg shadow-amber-500/20 animate-pulse'
                      : isClaimedPast
                      ? 'bg-slate-800/40 border-emerald-500/40 text-slate-400 opacity-90'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                  }`}
                >
                  {/* Status Badges */}
                  <div className="w-full flex items-center justify-between text-[11px] font-black mb-1.5">
                    <span className={isGrandVault ? 'text-amber-300' : 'text-slate-400'}>
                      Day {dayItem.day}
                    </span>
                    {isClaimedPast ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : isCurrentClaimable ? (
                      <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                    ) : (
                      <Lock className="w-3 h-3 text-slate-500" />
                    )}
                  </div>

                  {/* Icon */}
                  <div className="my-2 relative">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-md ${
                        isGrandVault
                          ? 'bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950'
                          : isCurrentClaimable
                          ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                          : isClaimedPast
                          ? 'bg-emerald-950 border border-emerald-500/30 text-emerald-300'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {isGrandVault ? (
                        <Crown className="w-6 h-6 animate-bounce" />
                      ) : (
                        <Gift className="w-5 h-5" />
                      )}
                    </div>
                  </div>

                  {/* Rewards summary */}
                  <div className="space-y-1 w-full">
                    <div className="flex items-center justify-center gap-1 text-xs font-black text-amber-300">
                      <Coins className="w-3 h-3 text-amber-400 flex-shrink-0" />
                      <span>+{dayItem.coins.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-blue-300">
                      <Star className="w-3 h-3 text-blue-400 flex-shrink-0" />
                      <span>+{dayItem.xp} XP</span>
                    </div>
                  </div>

                  {/* Footer tag */}
                  <div className="mt-2 text-[10px] font-bold text-slate-400 truncate max-w-full">
                    {dayItem.title}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Action Center */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 flex-shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">
                  {status.claimedToday
                    ? 'Tribute Claimed for Today!'
                    : `Day ${status.todayReward.day} Tribute Ready!`}
                </h4>
                <p className="text-xs text-slate-400">
                  {status.claimedToday
                    ? 'Your streak is secure. Next tribute unlocks at midnight!'
                    : `Claim ${status.todayReward.coins.toLocaleString()} Coins & ${status.todayReward.xp} XP now.`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {status.canClaim ? (
                <button
                  onClick={handleClaim}
                  disabled={claimAnimation}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/30 transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Gift className="w-4 h-4" />
                  Claim Day {status.todayReward.day} Tribute
                </button>
              ) : (
                <div className="w-full sm:w-auto px-5 py-2.5 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-black rounded-xl flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Claimed (Come back tomorrow)
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
