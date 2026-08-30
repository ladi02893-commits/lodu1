import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Crown, Flame, Shield, Sparkles, Swords, Trophy, Users, X } from 'lucide-react';
import { sound } from '../../lib/audio';
import { UserProfile } from '../../types/database';

export interface StakeTier {
  id: string;
  name: string;
  stake: number;
  minLevel: number;
  themeColor: string;
  badgeText: string;
}

export const STAKE_TIERS: StakeTier[] = [
  {
    id: 'tier_500',
    name: 'Rookie Arena',
    stake: 500,
    minLevel: 1,
    themeColor: 'from-amber-700 to-amber-900 border-amber-600',
    badgeText: 'STARTER',
  },
  {
    id: 'tier_2500',
    name: 'Knight Court',
    stake: 2500,
    minLevel: 2,
    themeColor: 'from-emerald-700 to-emerald-900 border-emerald-500',
    badgeText: 'POPULAR',
  },
  {
    id: 'tier_10000',
    name: 'Royal Palace',
    stake: 10000,
    minLevel: 3,
    themeColor: 'from-blue-700 to-indigo-900 border-blue-500',
    badgeText: 'HIGH STAKE',
  },
  {
    id: 'tier_50000',
    name: 'Imperial Sovereign',
    stake: 50000,
    minLevel: 5,
    themeColor: 'from-purple-700 to-purple-950 border-purple-500',
    badgeText: 'VIP COURT',
  },
  {
    id: 'tier_250000',
    name: 'Grand Emperor Table',
    stake: 250000,
    minLevel: 8,
    themeColor: 'from-rose-700 to-amber-950 border-amber-400',
    badgeText: 'LEGENDARY',
  },
];

interface StakeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmStake: (stakeAmount: number) => void;
  onOpenBuyCoins?: () => void;
  user: UserProfile;
  modeTitle: string;
  playerCount: number;
}

export const StakeSelectorModal: React.FC<StakeSelectorModalProps> = ({
  isOpen,
  onClose,
  onConfirmStake,
  onOpenBuyCoins,
  user,
  modeTitle,
  playerCount,
}) => {
  const [selectedTier, setSelectedTier] = useState<StakeTier>(STAKE_TIERS[0]);

  if (!isOpen) return null;

  const totalPrize = selectedTier.stake * playerCount;
  const hasEnoughCoins = user.coins >= selectedTier.stake;

  const handleSelect = (tier: StakeTier) => {
    sound.playClick();
    setSelectedTier(tier);
  };

  const handleConfirm = () => {
    if (!hasEnoughCoins) {
      sound.playClick();
      if (onOpenBuyCoins) onOpenBuyCoins();
      return;
    }
    sound.playClick();
    onConfirmStake(selectedTier.stake);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-2 border-amber-500/50 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
                <Crown className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-royal font-bold text-sm sm:text-base text-amber-300">
                  Select Bet Stake
                </h3>
                <p className="text-[11px] text-slate-400">{modeTitle}</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Coin Balance */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/90 border border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Your Coins:</span>
            <div className="flex items-center gap-1.5 text-amber-300 font-bold text-sm">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>{user.coins.toLocaleString()}</span>
            </div>
          </div>

          {/* Stake Tier List */}
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {STAKE_TIERS.map((tier) => {
              const isSelected = selectedTier.id === tier.id;

              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => handleSelect(tier)}
                  className={`w-full p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-amber-950/80 to-slate-900 border-amber-400 ring-2 ring-amber-400/40 shadow-lg shadow-amber-500/20'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 text-left">
                    <div
                      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tier.themeColor} flex items-center justify-center shadow`}
                    >
                      <Coins className="w-5 h-5 text-amber-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs sm:text-sm text-slate-100">
                          {tier.name}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/30">
                          {tier.badgeText}
                        </span>
                      </div>
                      <div className="text-[11px] text-amber-400/90 font-bold mt-0.5">
                        Stake: {tier.stake.toLocaleString()} Coins
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 font-semibold">Prize Pot</div>
                    <div className="text-xs sm:text-sm font-black text-amber-300">
                      {(tier.stake * playerCount).toLocaleString()}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Prize Summary Banner */}
          <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Winner Takes:</span>
            </div>
            <span className="font-black text-sm text-amber-300">
              🪙 {totalPrize.toLocaleString()} Coins
            </span>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handleConfirm}
            className={`w-full py-3.5 rounded-2xl font-royal font-extrabold text-sm uppercase tracking-wider transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer ${
              hasEnoughCoins
                ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-slate-950 hover:brightness-110 shadow-amber-500/20'
                : 'bg-rose-600 hover:bg-rose-500 text-white'
            }`}
          >
            {hasEnoughCoins ? (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Enter Table ({selectedTier.stake.toLocaleString()} Coins)</span>
              </>
            ) : (
              <span>Get Coins to Stake</span>
            )}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
