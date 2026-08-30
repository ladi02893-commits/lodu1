import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Sparkles, X, Gift, Flame, ChevronRight } from 'lucide-react';
import { DailyLoginDay } from '../../services/rewardService';

interface DailyRewardToastProps {
  reward: DailyLoginDay | null;
  streak: number;
  onClose: () => void;
  onViewCalendar?: () => void;
}

export const DailyRewardToast: React.FC<DailyRewardToastProps> = ({
  reward,
  streak,
  onClose,
  onViewCalendar,
}) => {
  useEffect(() => {
    if (!reward) return;
    const timer = setTimeout(() => {
      onClose();
    }, 7000);
    return () => clearTimeout(timer);
  }, [reward, onClose]);

  if (!reward) return null;

  return (
    <AnimatePresence>
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.95 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="pointer-events-auto bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border-2 border-amber-400/80 rounded-2xl p-4 shadow-[0_10px_35px_rgba(245,158,11,0.35)] backdrop-blur-xl relative overflow-hidden text-white"
        >
          {/* Animated decorative shine backdrop */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-400/20 via-transparent to-transparent pointer-events-none" />

          <div className="relative flex items-center gap-3.5">
            {/* Left Crown Badge */}
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-300">
                <Gift className="w-6 h-6 text-slate-950 animate-bounce" />
              </div>
              <span className="absolute -bottom-1 -right-1 bg-red-600 text-amber-100 text-[10px] font-black px-1.5 py-0.5 rounded-full border border-red-400 flex items-center gap-0.5">
                <Flame className="w-2.5 h-2.5 fill-amber-300" />
                D{streak || reward.day}
              </span>
            </div>

            {/* Content info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <h4 className="text-xs uppercase font-bold tracking-wider text-amber-300 truncate">
                  Daily Login Tribute
                </h4>
                <Sparkles className="w-3.5 h-3.5 text-yellow-300 flex-shrink-0 animate-spin" />
              </div>
              <p className="text-sm font-black text-white truncate">
                {reward.title} (Day {reward.day})
              </p>

              {/* Badges for coins and XP */}
              <div className="flex items-center gap-2 mt-1.5">
                <span className="inline-flex items-center gap-1 bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-black px-2 py-0.5 rounded-md">
                  🪙 +{reward.coins.toLocaleString()} Coins
                </span>
                <span className="inline-flex items-center gap-1 bg-blue-400/20 border border-blue-400/40 text-blue-300 text-xs font-black px-2 py-0.5 rounded-md">
                  ⭐ +{reward.xp} XP
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>

              {onViewCalendar && (
                <button
                  onClick={() => {
                    onClose();
                    onViewCalendar();
                  }}
                  className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-0.5 mt-1 hover:underline cursor-pointer"
                >
                  Calendar <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
