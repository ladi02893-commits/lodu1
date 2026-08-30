import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Sparkles } from 'lucide-react';
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
  const [rotation, setRotation] = useState<{ x: number; y: number; z: number }>({
    x: 0,
    y: 0,
    z: 0,
  });
  const config = COLOR_CONFIG[color];

  // Map 1-6 face values to exact 3D cube face rotations
  const getFaceRotation = (val: number) => {
    switch (val) {
      case 1:
        return { x: 0, y: 0, z: 0 }; // Front
      case 6:
        return { x: 180, y: 0, z: 0 }; // Back
      case 2:
        return { x: -90, y: 0, z: 0 }; // Top
      case 5:
        return { x: 90, y: 0, z: 0 }; // Bottom
      case 3:
        return { x: 0, y: -90, z: 0 }; // Right
      case 4:
        return { x: 0, y: 90, z: 0 }; // Left
      default:
        return { x: -20, y: 25, z: 0 }; // Idle Royal 3D Isometric View
    }
  };

  useEffect(() => {
    if (value && !isRollingAnimation) {
      setRotation(getFaceRotation(value));
    }
  }, [value, isRollingAnimation]);

  const handleRollClick = () => {
    if (!canRoll || disabled || isRollingAnimation) return;
    setIsRollingAnimation(true);
    sound.playDiceRoll();

    // High velocity multi-turn 3D tumbling tumble
    const randomRotX = 720 + Math.floor(Math.random() * 360);
    const randomRotY = 720 + Math.floor(Math.random() * 360);
    const randomRotZ = 360 + Math.floor(Math.random() * 180);
    setRotation({ x: randomRotX, y: randomRotY, z: randomRotZ });

    onRoll();

    setTimeout(() => {
      setIsRollingAnimation(false);
      if (value !== null) {
        setRotation(getFaceRotation(value));
        sound.playDiceResult(value);
      }
    }, 600);
  };

  // Render authentic 3D engraved gold gemstone pips for each face
  const renderPips = (num: number) => {
    const pipStyle =
      'w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 border border-amber-400/90 shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.9),0_1px_1px_rgba(255,255,255,0.7)]';
    const centerPipStyle =
      'w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-gradient-to-b from-amber-500 via-yellow-400 to-amber-600 border-2 border-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.95)] flex items-center justify-center';

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

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      {/* 3D Stage Container */}
      <div className="relative perspective-dice w-18 h-18 sm:w-20 sm:h-20 flex items-center justify-center">
        {/* Dynamic 3D Ground Contact Shadow */}
        <motion.div
          animate={
            isRollingAnimation
              ? {
                  scale: [1, 0.45, 1.2, 0.6, 1],
                  opacity: [0.6, 0.2, 0.8, 0.3, 0.7],
                  y: [0, 10, 0, 8, 0],
                }
              : {
                  scale: canRoll && !disabled ? [1, 1.15, 1] : 1,
                  opacity: canRoll ? 0.75 : 0.4,
                }
          }
          transition={{ duration: isRollingAnimation ? 0.6 : 1.5, repeat: isRollingAnimation ? 0 : Infinity }}
          className="absolute -bottom-2 w-14 h-4 rounded-full bg-slate-950/80 blur-sm pointer-events-none"
        />

        {/* 3D Dice Geometry Container */}
        <motion.div
          id={`dice-button-${color}`}
          onClick={handleRollClick}
          animate={{
            rotateX: rotation.x,
            rotateY: rotation.y,
            rotateZ: rotation.z,
            y: isRollingAnimation ? [0, -32, -8, -20, 0] : canRoll && !disabled ? [0, -4, 0] : 0,
            scale: canRoll && !disabled ? 1.05 : 1,
          }}
          transition={
            isRollingAnimation
              ? { duration: 0.6, ease: [0.25, 1, 0.5, 1] }
              : { duration: 0.4, ease: 'easeOut' }
          }
          className={`
            relative w-15 h-15 sm:w-16 sm:h-16 transform-style-3d cursor-pointer
            ${canRoll && !disabled ? 'cursor-pointer' : 'cursor-default'}
          `}
          style={{
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Face 1: Front */}
          <div
            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-50 via-amber-100 to-amber-300 border-2 border-amber-300/90 shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.5)] flex items-center justify-center backface-hidden"
            style={{ transform: 'translateZ(30px)' }}
          >
            {renderPips(1)}
          </div>

          {/* Face 6: Back */}
          <div
            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-50 via-amber-100 to-amber-300 border-2 border-amber-300/90 shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.5)] flex items-center justify-center backface-hidden"
            style={{ transform: 'rotateY(180deg) translateZ(30px)' }}
          >
            {renderPips(6)}
          </div>

          {/* Face 3: Right */}
          <div
            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-100 via-amber-200 to-amber-400 border-2 border-amber-300/90 shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.5)] flex items-center justify-center backface-hidden"
            style={{ transform: 'rotateY(90deg) translateZ(30px)' }}
          >
            {renderPips(3)}
          </div>

          {/* Face 4: Left */}
          <div
            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-100 via-amber-200 to-amber-400 border-2 border-amber-300/90 shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.5)] flex items-center justify-center backface-hidden"
            style={{ transform: 'rotateY(-90deg) translateZ(30px)' }}
          >
            {renderPips(4)}
          </div>

          {/* Face 2: Top */}
          <div
            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-50 via-amber-150 to-amber-300 border-2 border-amber-300/90 shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.5)] flex items-center justify-center backface-hidden"
            style={{ transform: 'rotateX(90deg) translateZ(30px)' }}
          >
            {renderPips(2)}
          </div>

          {/* Face 5: Bottom */}
          <div
            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-100 via-amber-200 to-amber-400 border-2 border-amber-300/90 shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.5)] flex items-center justify-center backface-hidden"
            style={{ transform: 'rotateX(-90deg) translateZ(30px)' }}
          >
            {renderPips(5)}
          </div>
        </motion.div>

        {/* Roll 6 Bonus Banner */}
        {value === 6 && !isRollingAnimation && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute -top-3 -right-3 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 border border-white text-[10px] font-black text-slate-950 shadow-[0_4px_12px_rgba(0,0,0,0.6)] flex items-center gap-0.5 z-30 animate-bounce"
          >
            <Sparkles className="w-3 h-3 text-slate-950" />
            <span>+1 ROLL</span>
          </motion.span>
        )}
      </div>

      {canRoll && !disabled && (
        <span className="text-[11px] font-black text-amber-300 uppercase tracking-widest animate-pulse drop-shadow">
          Tap to Roll
        </span>
      )}
    </div>
  );
};

