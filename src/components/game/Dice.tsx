import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Sparkles, Zap } from 'lucide-react';
import { sound } from '../../lib/audio';
import { COLOR_CONFIG } from '../../lib/ludo/constants';
import { PlayerColor } from '../../lib/ludo/types';

interface DiceProps {
  value: number | null;
  canRoll: boolean;
  color: PlayerColor;
  isRolling?: boolean;
  onRoll: () => void;
  disabled?: boolean;
}

export const Dice: React.FC<DiceProps> = ({
  value,
  canRoll,
  color,
  onRoll,
  disabled = false,
}) => {
  const [isRollingAnimation, setIsRollingAnimation] = useState(false);
  const [rollCount, setRollCount] = useState(0);
  const [rotation, setRotation] = useState<{ x: number; y: number; z: number }>({
    x: -20,
    y: 25,
    z: 0,
  });
  const [showImpactRipple, setShowImpactRipple] = useState(false);
  const config = COLOR_CONFIG[color];
  const lastRollValueRef = useRef<number | null>(null);

  // Map 1-6 face values to exact 3D cube face rotations (degrees)
  const getFaceRotation = (val: number, spinBase: number = 0) => {
    // Keep multiples of 360 to preserve smooth spin continuity
    const turnsX = Math.round(spinBase / 360) * 360;
    const turnsY = Math.round(spinBase / 360) * 360;
    switch (val) {
      case 1:
        return { x: turnsX + 0, y: turnsY + 0, z: 0 }; // Front
      case 6:
        return { x: turnsX + 180, y: turnsY + 0, z: 0 }; // Back
      case 2:
        return { x: turnsX - 90, y: turnsY + 0, z: 0 }; // Top
      case 5:
        return { x: turnsX + 90, y: turnsY + 0, z: 0 }; // Bottom
      case 3:
        return { x: turnsX + 0, y: turnsY - 90, z: 0 }; // Right
      case 4:
        return { x: turnsX + 0, y: turnsY + 90, z: 0 }; // Left
      default:
        return { x: -20, y: 25, z: 0 }; // Idle Royal 3D Isometric Angle
    }
  };

  useEffect(() => {
    if (value !== null && !isRollingAnimation) {
      setRotation(getFaceRotation(value));
      lastRollValueRef.current = value;
    }
  }, [value, isRollingAnimation]);

  const handleRollClick = () => {
    if (!canRoll || disabled || isRollingAnimation) return;

    setIsRollingAnimation(true);
    setShowImpactRipple(false);
    sound.playDiceRoll();

    setRollCount((c) => c + 1);

    // Multi-turn 3D tumbling rotation with high angular momentum
    const turns = 3 + Math.floor(Math.random() * 2); // 3-4 full revolutions
    const targetFace = value ?? Math.floor(1 + Math.random() * 6);

    const baseRotX = turns * 360 + (Math.random() > 0.5 ? 90 : -90);
    const baseRotY = turns * 360 + (Math.random() > 0.5 ? 90 : -90);
    const baseRotZ = (Math.random() - 0.5) * 360;

    setRotation({ x: baseRotX, y: baseRotY, z: baseRotZ });

    onRoll();

    // Settle cleanly onto the final face with impact bounce and sound
    setTimeout(() => {
      setIsRollingAnimation(false);
      setShowImpactRipple(true);

      const finalVal = value !== null ? value : targetFace;
      setRotation(getFaceRotation(finalVal, turns * 360));
      sound.playDiceResult(finalVal);

      setTimeout(() => setShowImpactRipple(false), 600);
    }, 650);
  };

  // Render authentic 3D engraved gold gemstone pips for each face
  const renderPips = (num: number) => {
    const pipStyle =
      'w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 border border-amber-400/90 shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.9),0_1px_1px_rgba(255,255,255,0.7)]';
    const centerPipStyle =
      'w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-gradient-to-b from-amber-500 via-yellow-400 to-amber-600 border-2 border-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.95)] flex items-center justify-center';

    switch (num) {
      case 1:
        return (
          <div className="w-full h-full flex items-center justify-center">
            <div className={centerPipStyle}>
              <div className="w-1.5 h-1.5 rounded-full bg-slate-950 shadow-inner" />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="w-full h-full flex justify-between p-2">
            <div className={`${pipStyle} self-start`} />
            <div className={`${pipStyle} self-end`} />
          </div>
        );
      case 3:
        return (
          <div className="w-full h-full flex justify-between p-1.5 sm:p-2">
            <div className={`${pipStyle} self-start`} />
            <div className={`${pipStyle} self-center`} />
            <div className={`${pipStyle} self-end`} />
          </div>
        );
      case 4:
        return (
          <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-1.5 p-1.5 sm:p-2 place-items-center">
            <div className={pipStyle} />
            <div className={pipStyle} />
            <div className={pipStyle} />
            <div className={pipStyle} />
          </div>
        );
      case 5:
        return (
          <div className="w-full h-full relative p-1.5 sm:p-2">
            <div className={`${pipStyle} absolute top-1.5 left-1.5 sm:top-2 sm:left-2`} />
            <div className={`${pipStyle} absolute top-1.5 right-1.5 sm:top-2 sm:right-2`} />
            <div className={`${centerPipStyle} absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`}>
              <div className="w-1 h-1 rounded-full bg-slate-950" />
            </div>
            <div className={`${pipStyle} absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2`} />
            <div className={`${pipStyle} absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2`} />
          </div>
        );
      case 6:
        return (
          <div className="w-full h-full grid grid-cols-2 grid-rows-3 gap-1 p-1 sm:p-1.5 place-items-center">
            <div className={pipStyle} />
            <div className={pipStyle} />
            <div className={pipStyle} />
            <div className={pipStyle} />
            <div className={pipStyle} />
            <div className={pipStyle} />
          </div>
        );
      default:
        return (
          <div className="w-full h-full flex items-center justify-center">
            <Crown className="w-6 h-6 text-amber-500 animate-pulse filter drop-shadow" />
          </div>
        );
    }
  };

  const faceCommonClass = `
    absolute inset-0 rounded-2xl
    bg-gradient-to-br from-amber-50 via-amber-100 to-amber-300
    border-2 border-amber-300/90
    shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.25),0_4px_12px_rgba(0,0,0,0.6)]
    flex items-center justify-center backface-hidden select-none
  `;

  return (
    <div className="flex flex-col items-center gap-1.5 select-none relative">
      {/* 3D Stage Container */}
      <div className="relative perspective-dice w-20 h-20 sm:w-22 sm:h-22 flex items-center justify-center">
        {/* Dynamic 3D Ground Contact Shadow */}
        <motion.div
          animate={
            isRollingAnimation
              ? {
                  scale: [1, 0.35, 1.3, 0.5, 1.1, 1],
                  opacity: [0.7, 0.15, 0.9, 0.25, 0.8, 0.7],
                  y: [0, 8, -2, 6, 0],
                }
              : {
                  scale: canRoll && !disabled ? [1, 1.18, 1] : 1,
                  opacity: canRoll ? 0.75 : 0.45,
                }
          }
          transition={{
            duration: isRollingAnimation ? 0.65 : 1.4,
            repeat: isRollingAnimation ? 0 : Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -bottom-2.5 w-16 h-4 rounded-full bg-slate-950/85 blur-sm pointer-events-none"
        />

        {/* Impact Shockwave Ring on Landing */}
        <AnimatePresence>
          {showImpactRipple && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0.9 }}
              animate={{ scale: 2.2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="absolute -bottom-1 w-14 h-14 rounded-full border-2 border-amber-400/80 pointer-events-none z-10"
              style={{ borderColor: config.primary }}
            />
          )}
        </AnimatePresence>

        {/* 3D Dice Geometry Container */}
        <motion.div
          id={`dice-button-${color}`}
          onClick={handleRollClick}
          animate={{
            rotateX: rotation.x,
            rotateY: rotation.y,
            rotateZ: rotation.z,
            y: isRollingAnimation
              ? [0, -42, -6, -24, 2, 0] // 3D parabolic bounce arc
              : canRoll && !disabled
              ? [0, -6, 0]
              : 0,
            scale: isRollingAnimation
              ? [1, 1.12, 0.92, 1.06, 0.98, 1]
              : canRoll && !disabled
              ? 1.06
              : 1,
          }}
          transition={
            isRollingAnimation
              ? { duration: 0.65, ease: [0.22, 1, 0.36, 1] }
              : { duration: 0.35, ease: 'easeOut' }
          }
          className={`
            relative w-16 h-16 sm:w-17 sm:h-17 transform-style-3d cursor-pointer
            ${canRoll && !disabled ? 'cursor-pointer active:scale-95' : 'cursor-default'}
          `}
          style={{
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Face 1: Front */}
          <div className={faceCommonClass} style={{ transform: 'translateZ(32px)' }}>
            {renderPips(1)}
          </div>

          {/* Face 6: Back */}
          <div className={faceCommonClass} style={{ transform: 'rotateY(180deg) translateZ(32px)' }}>
            {renderPips(6)}
          </div>

          {/* Face 3: Right */}
          <div className={faceCommonClass} style={{ transform: 'rotateY(90deg) translateZ(32px)' }}>
            {renderPips(3)}
          </div>

          {/* Face 4: Left */}
          <div className={faceCommonClass} style={{ transform: 'rotateY(-90deg) translateZ(32px)' }}>
            {renderPips(4)}
          </div>

          {/* Face 2: Top */}
          <div className={faceCommonClass} style={{ transform: 'rotateX(90deg) translateZ(32px)' }}>
            {renderPips(2)}
          </div>

          {/* Face 5: Bottom */}
          <div className={faceCommonClass} style={{ transform: 'rotateX(-90deg) translateZ(32px)' }}>
            {renderPips(5)}
          </div>
        </motion.div>

        {/* Roll 6 Bonus Banner */}
        {value === 6 && !isRollingAnimation && (
          <motion.span
            initial={{ scale: 0, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 12, stiffness: 280 }}
            className="absolute -top-3.5 -right-3 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 border border-white text-[10px] font-black text-slate-950 shadow-[0_4px_14px_rgba(0,0,0,0.8)] flex items-center gap-0.5 z-30 animate-bounce"
          >
            <Sparkles className="w-3 h-3 text-slate-950 fill-slate-950" />
            <span>+1 BONUS</span>
          </motion.span>
        )}
      </div>

      {canRoll && !disabled && (
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.9, 1, 0.9] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
          className="flex items-center gap-1 text-[11px] font-black text-amber-300 uppercase tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] bg-amber-950/70 border border-amber-400/60 px-2.5 py-0.5 rounded-full"
        >
          <Zap className="w-3 h-3 text-amber-400 fill-amber-400 animate-pulse" />
          <span>Tap to Roll</span>
        </motion.div>
      )}
    </div>
  );
};
