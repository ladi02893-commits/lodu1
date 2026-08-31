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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-sm bg-[#0e1424] border border-amber-500/40 rounded-3xl p-4 sm:p-5 shadow-2xl text-white my-auto space-y-3"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            disabled={isSpinning}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#070b16] hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-800 cursor-pointer disabled:opacity-30"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="text-center space-y-0.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300 text-[10px] font-black uppercase tracking-wider">
              <Crown className="w-3 h-3 text-amber-400" />
              <span>Fortune Wheel</span>
            </div>
            <h2 className="text-base sm:text-lg font-royal font-black text-amber-300">
              Spin for Royal Treasure
            </h2>
            <p className="text-[10px] text-slate-400">
              Win up to 25,000 Coins Jackpot
            </p>
          </div>

          {/* Wheel & Pointer Container */}
          <div className="relative flex items-center justify-center py-1">
            {/* Golden Arrow Pointer at 12 o'clock */}
            <div className="absolute top-0 z-20 flex flex-col items-center pointer-events-none -mt-1.5">
              <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-t-amber-400 filter drop-shadow-[0_2px_6px_rgba(245,158,11,0.8)]" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-200 -mt-1.5 shadow-inner border border-amber-600" />
            </div>

            {/* Rotatable SVG Wheel */}
            <div className="relative w-52 h-52 sm:w-60 sm:h-60 p-1.5 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-600 shadow-[0_0_25px_rgba(245,158,11,0.3)] border-2 border-amber-300">
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
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 border-2 border-amber-100 shadow-xl flex items-center justify-center pointer-events-none">
                <Crown className="w-5 h-5 text-slate-950 fill-slate-950" />
              </div>
            </div>
          </div>

          {/* Won Prize Celebration Card */}
          {wonPrize && (
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="p-2.5 rounded-2xl bg-[#070b16] border border-amber-400 text-center shadow"
            >
              <div className="text-[9px] uppercase font-bold text-amber-300">
                Reward Unlocked!
              </div>
              <div className="text-sm font-black text-white flex items-center justify-center gap-1 mt-0.5">
                <span>{wonPrize.icon}</span>
                <span>+{wonPrize.label} {wonPrize.sublabel}</span>
              </div>
            </motion.div>
          )}

          {/* Feedback alert */}
          {feedback && (
            <div className="p-2 rounded-xl bg-rose-950 text-rose-300 text-[10px] text-center font-bold border border-rose-500/40">
              {feedback}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-1">
            {status.canFreeSpin ? (
              <button
                onClick={() => handleSpin(true)}
                disabled={isSpinning}
                className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 font-royal font-black text-xs uppercase tracking-wider text-slate-950 shadow transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                <span>{isSpinning ? 'Spinning...' : 'FREE DAILY SPIN'}</span>
              </button>
            ) : (
              <div className="space-y-1.5">
                <button
                  onClick={() => handleSpin(false)}
                  disabled={isSpinning || user.coins < status.spinCostCoins}
                  className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 font-royal font-black text-xs uppercase tracking-wider text-slate-950 shadow transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Coins className="w-3.5 h-3.5 text-slate-950" />
                  <span>
                    {isSpinning
                      ? 'Spinning...'
                      : `Spin for ${status.spinCostCoins} Coins`}
                  </span>
                </button>

                <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 font-mono">
                  <span>Free Spin in:</span>
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
