import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Award, Coins, Crown, RotateCcw, Sparkles, Swords, Trophy, Zap } from 'lucide-react';
import { COLOR_CONFIG } from '../../lib/ludo/constants';
import { GameState } from '../../lib/ludo/types';
import { authService } from '../../services/authService';

interface ResultModalProps {
  gameState: GameState;
  onRematch: () => void;
  onExit: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  gameState,
  onRematch,
  onExit,
}) => {
  const { players, rankings, winnerSeat } = gameState;
  const user = authService.getCurrentUser();
  const userSeat = players.find((p) => p.playerId === user.id)?.seat ?? 0;
  const userRankIndex = rankings.indexOf(userSeat);
  const isWinner = userRankIndex === 0;

  useEffect(() => {
    // Launch fireworks confetti
    if (isWinner) {
      const duration = 3000;
      const animationEnd = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#eab308', '#ef4444', '#10b981', '#3b82f6'],
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#eab308', '#ef4444', '#10b981', '#3b82f6'],
        });

        if (Date.now() < animationEnd) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [isWinner]);

  const userPlayer = players.find((p) => p.seat === userSeat);
  const captures = userPlayer?.captures || 0;

  // Reward calculations
  let coinsWon = 50 + captures * 30;
  let xpGained = 40 + captures * 15;
  if (userRankIndex === 0) {
    coinsWon += 450;
    xpGained += 160;
  } else if (userRankIndex === 1) {
    coinsWon += 150;
    xpGained += 60;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl animate-fade-in">
      <div className="w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-500/60 rounded-3xl p-6 shadow-2xl space-y-6 text-center">
        {/* Crown Icon & Header */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-600 to-amber-300 p-0.5 shadow-lg shadow-amber-500/30 flex items-center justify-center animate-bounce">
            <Trophy className="w-9 h-9 text-slate-950" />
          </div>

          <h2 className="text-2xl font-royal font-black text-amber-300 tracking-wider">
            {isWinner ? 'VICTORY & GLORY!' : 'MATCH CONCLUDED'}
          </h2>
          <p className="text-xs text-slate-400">
            {isWinner
              ? 'You have conquered the arena and claimed the Royal Crown!'
              : 'Well fought in the Royal Arena! Honor is yours.'}
          </p>
        </div>

        {/* Podium Rankings */}
        <div className="space-y-2 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Final Standings
          </div>
          {rankings.map((seat, index) => {
            const player = players.find((p) => p.seat === seat);
            if (!player) return null;
            const config = COLOR_CONFIG[player.color];

            return (
              <div
                key={seat}
                className={`
                  flex items-center justify-between p-2 rounded-xl border text-xs font-semibold
                  ${index === 0 ? 'bg-amber-950/60 border-amber-400/60 text-amber-200' : 'bg-slate-900 border-slate-800 text-slate-300'}
                `}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`
                      w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px]
                      ${index === 0 ? 'bg-amber-400 text-slate-950 shadow' : index === 1 ? 'bg-slate-300 text-slate-950' : 'bg-amber-900 text-amber-200'}
                    `}
                  >
                    #{index + 1}
                  </span>
                  <Crown className="w-3.5 h-3.5" style={{ color: config.primary }} />
                  <span className="truncate max-w-[120px]">{player.username}</span>
                </div>

                <div className="flex items-center gap-3 text-slate-400">
                  <span className="flex items-center gap-1 text-rose-400">
                    <Swords className="w-3 h-3" />
                    {player.captures}
                  </span>
                  <span className="text-amber-400">{player.tokensFinished}/4 Home</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Spoils of War (Rewards) */}
        {gameState.totalPot && gameState.totalPot > 0 && isWinner && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border-2 border-amber-400 text-center space-y-1 animate-pulse shadow-xl shadow-amber-500/20">
            <div className="text-[10px] text-amber-300 font-black uppercase tracking-wider">
              🏆 Chamber Pot Champion Payout
            </div>
            <div className="flex items-center justify-center gap-2">
              <Coins className="w-6 h-6 text-amber-400" />
              <span className="text-2xl font-black font-mono text-amber-200">
                +{gameState.totalPot.toLocaleString()} Coins
              </span>
            </div>
            <div className="text-[11px] text-emerald-400 font-bold">
              Full match betting pot credited to your vault!
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex flex-col items-center gap-1">
            <Coins className="w-5 h-5 text-amber-400" />
            <span className="text-[11px] text-slate-400 font-medium">Rank & Capture Spoils</span>
            <span className="text-lg font-black text-amber-300">+{coinsWon}</span>
          </div>

          <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex flex-col items-center gap-1">
            <Zap className="w-5 h-5 text-purple-400" />
            <span className="text-[11px] text-slate-400 font-medium">XP Gained</span>
            <span className="text-lg font-black text-purple-300">+{xpGained}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            id="result-rematch-btn"
            type="button"
            onClick={onRematch}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 font-royal font-bold text-slate-950 shadow-lg shadow-amber-500/30 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again</span>
          </button>

          <button
            id="result-exit-btn"
            type="button"
            onClick={onExit}
            className="w-full py-3 rounded-xl bg-slate-900 border border-slate-700 font-semibold text-slate-200 hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
          >
            Back to Court
          </button>
        </div>
      </div>
    </div>
  );
};
