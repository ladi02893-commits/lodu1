import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown,
  Sparkles,
  X,
  Coins,
  Gem,
  Flame,
  Volume2,
  Trophy,
  RotateCw,
  Gift,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../lib/audio';
import { authService } from '../../services/authService';
import {
  luckyWheelService,
  LuckyWheelStatus,
  WHEEL_PRIZES,
  WheelPrize,
} from '../../services/luckyWheelService';
import { UserProfile } from '../../types/database';

interface LuckyWheelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRewardWon?: (prize: WheelPrize) => void;
}

export const LuckyWheelModal: React.FC<LuckyWheelModalProps> = ({
  isOpen,
  onClose,
  onRewardWon,
}) => {
  const [user, setUser] = useState<UserProfile>(authService.getCurrentUser());
  const [status, setStatus] = useState<LuckyWheelStatus>(() => luckyWheelService.getStatus());
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationDegrees, setRotationDegrees] = useState(0);
  const [wonPrize, setWonPrize] = useState<WheelPrize | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const tickIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      setUser(authService.getCurrentUser());
      setStatus(luckyWheelService.getStatus());
      setWonPrize(null);
      setFeedback(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const segmentAngle = 360 / WHEEL_PRIZES.length; // 45 degrees per slice

  const handleSpin = (isFree: boolean) => {
    if (isSpinning) return;
    setFeedback(null);
    setWonPrize(null);

    const res = luckyWheelService.spin(isFree);
    if (!res.success || res.prizeIndex === undefined || !res.prize) {
      setFeedback(res.message || 'Spin failed.');
      sound.playTimerWarning();
      return;
    }

    setIsSpinning(true);
    sound.playDiceRoll();

    // Calculate rotation:
    // To land on prizeIndex: The top pointer is at 270 deg or 0 deg (top).
    // Slices are laid out clockwise from 0 deg.
    // Winning angle = 360 - (prizeIndex * segmentAngle) - segmentAngle / 2
    const targetSliceAngle = (360 - res.prizeIndex * segmentAngle - segmentAngle / 2) % 360;
    const fullSpins = 5 * 360; // 5 full rotations for momentum
    const newTotalRotation = rotationDegrees + fullSpins + ((targetSliceAngle - (rotationDegrees % 360) + 360) % 360);

    setRotationDegrees(newTotalRotation);

    // Audio ticking sound during spin
    let tickCount = 0;
    if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    tickIntervalRef.current = setInterval(() => {
      tickCount++;
      if (tickCount < 30) {
        sound.playWheelTick();
      } else {
        clearInterval(tickIntervalRef.current);
      }
    }, 120);

    setTimeout(() => {
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
      setIsSpinning(false);
      setWonPrize(res.prize!);
      setStatus(luckyWheelService.getStatus());
      setUser(authService.getCurrentUser());

      if (res.prize!.type === 'jackpot' || res.prize!.amount >= 5000) {
        sound.playJackpotFanfare();
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#fbbf24', '#ffffff', '#10b981', '#6366f1'],
        });
      } else {
        sound.playHomeGoal();
      }

      if (onRewardWon) onRewardWon(res.prize!);
    }, 4000);
  };

  const formatCountdown = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950/50 border-2 border-amber-500/50 rounded-3xl p-5 sm:p-7 shadow-[0_20px_70px_rgba(0,0,0,0.85)] text-white overflow-hidden my-auto"
        >
          {/* Ambient Royal Lights */}
          <div className="absolute -top-20 -left-20 w-60 h-60 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-yellow-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            disabled={isSpinning}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-white/10 cursor-pointer disabled:opacity-30"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-black uppercase tracking-wider mb-1.5">
              <Crown className="w-3 h-3 text-amber-400" />
              Imperial Sovereign Wheel
              <Sparkles className="w-3 h-3 text-yellow-300" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-transparent font-serif">
              Lucky Fortune Wheel
            </h2>
            <p className="text-xs text-slate-300">
              Spin daily for free treasure, royal gems, and the 25,000 Gold Jackpot!
            </p>
          </div>

          {/* Wheel & Pointer Container */}
          <div className="relative flex items-center justify-center my-3 py-2">
            {/* Golden Arrow Pointer at 12 o'clock */}
            <div className="absolute top-0 z-20 flex flex-col items-center pointer-events-none -mt-2">
              <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[24px] border-t-amber-400 filter drop-shadow-[0_4px_8px_rgba(245,158,11,0.8)]" />
              <div className="w-3 h-3 rounded-full bg-amber-200 -mt-2 shadow-inner border border-amber-600" />
            </div>

            {/* Rotatable SVG Wheel */}
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 p-2 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-600 shadow-[0_0_35px_rgba(245,158,11,0.4)] border-4 border-amber-300/80">
              <div
                className="w-full h-full rounded-full overflow-hidden transition-transform duration-[4000ms] ease-[cubic-bezier(0.15,0.9,0.25,1)]"
                style={{
                  transform: `rotate(${rotationDegrees}deg)`,
                }}
              >
                <svg viewBox="0 0 300 300" className="w-full h-full">
                  <defs>
                    <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#fef08a" />
                      <stop offset="100%" stopColor="#d97706" />
                    </radialGradient>
                  </defs>

                  {/* Slices */}
                  {WHEEL_PRIZES.map((prize, idx) => {
                    const angle = 45;
                    const startAngle = idx * angle;
                    const endAngle = startAngle + angle;

                    // SVG arc coordinate math
                    const x1 = 150 + 145 * Math.cos((Math.PI * (startAngle - 90)) / 180);
                    const y1 = 150 + 145 * Math.sin((Math.PI * (startAngle - 90)) / 180);
                    const x2 = 150 + 145 * Math.cos((Math.PI * (endAngle - 90)) / 180);
                    const y2 = 150 + 145 * Math.sin((Math.PI * (endAngle - 90)) / 180);

                    const midAngle = startAngle + angle / 2;
                    const textX = 150 + 95 * Math.cos((Math.PI * (midAngle - 90)) / 180);
                    const textY = 150 + 95 * Math.sin((Math.PI * (midAngle - 90)) / 180);

                    return (
                      <g key={prize.id}>
                        <path
                          d={`M 150 150 L ${x1} ${y1} A 145 145 0 0 1 ${x2} ${y2} Z`}
                          fill={prize.color}
                          stroke="#f59e0b"
                          strokeWidth="2"
                        />
                        <g transform={`rotate(${midAngle}, ${textX}, ${textY})`}>
                          <text
                            x={textX}
                            y={textY - 8}
                            fill={prize.textColor}
                            fontSize="11"
                            fontWeight="900"
                            textAnchor="middle"
                            fontFamily="sans-serif"
                          >
                            {prize.icon} {prize.label}
                          </text>
                          <text
                            x={textX}
                            y={textY + 6}
                            fill={prize.textColor}
                            fontSize="8"
                            fontWeight="700"
                            textAnchor="middle"
                            opacity="0.9"
                          >
                            {prize.sublabel}
                          </text>
                        </g>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Center Decorative Crown Hub */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 border-2 border-amber-100 shadow-xl flex items-center justify-center pointer-events-none">
                <Crown className="w-7 h-7 text-slate-950 fill-slate-950" />
              </div>
            </div>
          </div>

          {/* Won Prize Celebration Card */}
          {wonPrize && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border-2 border-amber-400 text-center my-3 shadow-lg"
            >
              <div className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">
                Royal Treasury Tribute Unlocked!
              </div>
              <div className="text-lg font-black text-white flex items-center justify-center gap-1.5 mt-0.5">
                <span>{wonPrize.icon}</span>
                <span>+{wonPrize.label} {wonPrize.sublabel}</span>
              </div>
            </motion.div>
          )}

          {/* Feedback error or alert */}
          {feedback && (
            <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs text-center font-bold my-2">
              {feedback}
            </div>
          )}

          {/* Action Buttons: Free Daily Spin or 500 Coins Spin */}
          <div className="space-y-2.5 pt-2">
            {status.canFreeSpin ? (
              <button
                onClick={() => handleSpin(true)}
                disabled={isSpinning}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-110 font-royal font-black text-sm uppercase tracking-wider text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.5)] transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-slate-950 animate-spin" />
                <span>{isSpinning ? 'Consulting the Royal Oracle...' : 'FREE DAILY SPIN'}</span>
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => handleSpin(false)}
                  disabled={isSpinning || user.coins < status.spinCostCoins}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 font-royal font-black text-xs sm:text-sm uppercase tracking-wider text-slate-950 shadow transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Coins className="w-4 h-4 text-slate-950" />
                  <span>
                    {isSpinning
                      ? 'Spinning Fortune Wheel...'
                      : `Spin with ${status.spinCostCoins} Coins`}
                  </span>
                </button>

                <div className="flex items-center justify-between text-[11px] text-slate-400 px-2 font-mono">
                  <span>Free Spin Cooldown:</span>
                  <span className="text-amber-400 font-bold">
                    ⏳ {formatCountdown(status.nextFreeSpinInSeconds)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
