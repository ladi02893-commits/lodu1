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
  rollSequence?: number;
  onRoll: () => void;
  disabled?: boolean;
}

export const Dice: React.FC<DiceProps> = ({
  value,
  canRoll,
  color,
  rollSequence = 0,
  onRoll,
  disabled = false,
}) => {
  const [isTumbling, setIsTumbling] = useState(false);
  const [displayValue, setDisplayValue] = useState<number | null>(value);
  const [rotation, setRotation] = useState<{ x: number; y: number; z: number }>({
    x: 0,
    y: 0,
    z: 0,
  });
  const [showImpactRipple, setShowImpactRipple] = useState(false);
  const config = COLOR_CONFIG[color];
  const lastProcessedSeqRef = useRef<number>(rollSequence);
  const tumbleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Precise 3D Cube Face Euler Angle Mapping
   * Opposites sum to 7: (1-6, 2-5, 3-4)
   */
  const getTargetFaceRotation = (val: number, spinBase: number = 0) => {
    const turnsX = Math.round(spinBase / 360) * 360;
    const turnsY = Math.round(spinBase / 360) * 360;

    switch (val) {
      case 1:
        return { x: turnsX + 0, y: turnsY + 0, z: 0 }; // Front (1)
      case 6:
        return { x: turnsX + 0, y: turnsY + 180, z: 0 }; // Back (6)
      case 2:
        return { x: turnsX - 90, y: turnsY + 0, z: 0 }; // Top (2)
      case 5:
        return { x: turnsX + 90, y: turnsY + 0, z: 0 }; // Bottom (5)
      case 3:
        return { x: turnsX + 0, y: turnsY - 90, z: 0 }; // Right (3)
      case 4:
        return { x: turnsX + 0, y: turnsY + 90, z: 0 }; // Left (4)
      default:
        return { x: 0, y: 0, z: 0 };
    }
  };

  // Synchronized Roll Trigger: Whenever rollSequence increments or value arrives
  useEffect(() => {
    if (rollSequence > lastProcessedSeqRef.current && value !== null) {
      lastProcessedSeqRef.current = rollSequence;
      triggerSynchronizedTumble(value);
    } else if (value !== null && !isTumbling) {
      setDisplayValue(value);
      setRotation(getTargetFaceRotation(value));
    }
  }, [rollSequence, value]);

  const triggerSynchronizedTumble = (targetVal: number) => {
    if (tumbleTimeoutRef.current) clearTimeout(tumbleTimeoutRef.current);

    setIsTumbling(true);
    setShowImpactRipple(false);

    // Multi-revolution angular physics
    const fullSpins = 3;
    const spinOffset = fullSpins * 360;

    // High velocity tumble
    setRotation({
      x: spinOffset + (Math.random() > 0.5 ? 180 : -180),
      y: spinOffset + (Math.random() > 0.5 ? 180 : -180),
      z: (Math.random() - 0.5) * 180,
    });

    // Land crisply onto the authoritative target face
    tumbleTimeoutRef.current = setTimeout(() => {
      setIsTumbling(false);
      setDisplayValue(targetVal);
      setShowImpactRipple(true);
      setRotation(getTargetFaceRotation(targetVal, spinOffset));
      sound.playDiceResult(targetVal);

      setTimeout(() => setShowImpactRipple(false), 550);
    }, 480);
  };

  const handleUserClick = () => {
    if (!canRoll || disabled || isTumbling) return;
    onRoll();
  };

  // Render high-precision engraved gemstone pips
  const renderPips = (num: number) => {
    const pipCommon =
      'w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 border border-amber-300/90 shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.9),0_1px_2px_rgba(255,255,255,0.7)] flex items-center justify-center';
    const pipCore = 'w-1 h-1 rounded-full bg-amber-400 shadow-sm';

    const royalSunburstCenter = (
      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-600 border-2 border-white shadow-[0_0_16px_rgba(245,158,11,1)] flex items-center justify-center animate-pulse">
        <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-950 fill-slate-950 drop-shadow" />
      </div>
    );

    switch (num) {
      case 1:
        return (
          <div className="w-full h-full flex items-center justify-center">
            {royalSunburstCenter}
          </div>
        );
      case 2:
        return (
          <div className="w-full h-full flex justify-between p-2.5">
            <div className={`${pipCommon} self-start`}>
              <div className={pipCore} />
            </div>
            <div className={`${pipCommon} self-end`}>
              <div className={pipCore} />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="w-full h-full flex justify-between p-2">
            <div className={`${pipCommon} self-start`}>
              <div className={pipCore} />
            </div>
            <div className={`${pipCommon} self-center`}>
              <div className={pipCore} />
            </div>
            <div className={`${pipCommon} self-end`}>
              <div className={pipCore} />
            </div>
          </div>
        );
      case 4:
        return (
          <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-2 p-2 place-items-center">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={pipCommon}>
                <div className={pipCore} />
              </div>
            ))}
          </div>
        );
      case 5:
        return (
          <div className="w-full h-full relative p-2">
            <div className="absolute top-2 left-2">
              <div className={pipCommon}>
                <div className={pipCore} />
              </div>
            </div>
            <div className="absolute top-2 right-2">
              <div className={pipCommon}>
                <div className={pipCore} />
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-gradient-to-tr from-rose-500 to-amber-400 border border-white shadow-[0_0_10px_rgba(244,63,94,0.9)] flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white shadow" />
              </div>
            </div>
            <div className="absolute bottom-2 left-2">
              <div className={pipCommon}>
                <div className={pipCore} />
              </div>
            </div>
            <div className="absolute bottom-2 right-2">
              <div className={pipCommon}>
                <div className={pipCore} />
              </div>
            </div>
          </div>
        );
      case 6:
        return (
          <div className="w-full h-full grid grid-cols-2 grid-rows-3 gap-1.5 p-2 place-items-center">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={pipCommon}>
                <div className={pipCore} />
              </div>
            ))}
          </div>
        );
      default:
        return (
          <div className="w-full h-full flex items-center justify-center">
            <Crown className="w-6 h-6 text-amber-500/80 animate-pulse" />
          </div>
        );
    }
  };

  const faceSharedStyle = `
    absolute inset-0 rounded-2xl
    bg-gradient-to-br from-amber-100 via-amber-200 to-amber-300
    border-2 border-amber-400/90
    shadow-[inset_0_3px_5px_rgba(255,255,255,0.9),inset_0_-4px_6px_rgba(0,0,0,0.35),0_0_12px_rgba(245,158,11,0.4)]
    backface-hidden select-none flex items-center justify-center
  `;

  // Cube half-width for 3D translateZ (72px / 2 = 36px)
  const cubeZ = 36;

  // Active authoritative number to display
  const activeNumber = displayValue ?? value;

  return (
    <div className="relative flex flex-col items-center justify-center p-2 select-none">
      {/* Dynamic 3D Ground Shadow */}
      <motion.div
        animate={
          isTumbling
            ? {
                scale: [1, 0.45, 1.25, 1],
                opacity: [0.7, 0.25, 0.9, 0.7],
              }
            : canRoll
            ? {
                scale: [1, 1.15, 1],
                opacity: [0.7, 0.9, 0.7],
              }
            : { scale: 1, opacity: 0.6 }
        }
        transition={{
          repeat: canRoll && !isTumbling ? Infinity : 0,
          duration: isTumbling ? 0.48 : 1.5,
          ease: 'easeInOut',
        }}
        className="absolute -bottom-2 w-16 h-4 sm:w-20 sm:h-5 rounded-full bg-slate-950/90 blur-[3px] pointer-events-none z-0"
      />

      {/* Impact Shockwave Ring on Landing */}
      <AnimatePresence>
        {showImpactRipple && (
          <motion.div
            initial={{ scale: 0.8, opacity: 1 }}
            animate={{ scale: 2.2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`absolute -inset-2 rounded-full border-2 border-amber-400 pointer-events-none z-0 shadow-[0_0_20px_rgba(245,158,11,0.9)]`}
          />
        )}
      </AnimatePresence>

      {/* 3D Perspective Box */}
      <div
        className="relative w-[72px] h-[72px] sm:w-[78px] sm:h-[78px] cursor-pointer"
        style={{ perspective: 700 }}
        onClick={handleUserClick}
      >
        {/* 3D Dice Geometry Cube */}
        <motion.div
          id="royal-ludo-3d-dice"
          animate={{
            rotateX: rotation.x,
            rotateY: rotation.y,
            rotateZ: rotation.z,
            scale: isTumbling ? 1.15 : canRoll ? 1.05 : 1,
            y: isTumbling ? -18 : canRoll ? -3 : 0,
          }}
          transition={{
            duration: isTumbling ? 0.48 : 0.35,
            ease: isTumbling ? [0.2, 0.8, 0.2, 1] : 'easeOut',
          }}
          style={{
            transformStyle: 'preserve-3d',
            width: '100%',
            height: '100%',
          }}
          className={`relative rounded-2xl transition-shadow ${
            canRoll
              ? 'ring-4 ring-amber-400/90 ring-offset-2 ring-offset-slate-950 shadow-[0_0_28px_rgba(245,158,11,0.8)]'
              : ''
          }`}
        >
          {/* FACE 1 (Front) */}
          <div
            className={faceSharedStyle}
            style={{ transform: `rotateY(0deg) translateZ(${cubeZ}px)` }}
          >
            {renderPips(1)}
          </div>

          {/* FACE 6 (Back) */}
          <div
            className={faceSharedStyle}
            style={{ transform: `rotateY(180deg) translateZ(${cubeZ}px)` }}
          >
            {renderPips(6)}
          </div>

          {/* FACE 2 (Top) */}
          <div
            className={faceSharedStyle}
            style={{ transform: `rotateX(90deg) translateZ(${cubeZ}px)` }}
          >
            {renderPips(2)}
          </div>

          {/* FACE 5 (Bottom) */}
          <div
            className={faceSharedStyle}
            style={{ transform: `rotateX(-90deg) translateZ(${cubeZ}px)` }}
          >
            {renderPips(5)}
          </div>

          {/* FACE 3 (Right) */}
          <div
            className={faceSharedStyle}
            style={{ transform: `rotateY(90deg) translateZ(${cubeZ}px)` }}
          >
            {renderPips(3)}
          </div>

          {/* FACE 4 (Left) */}
          <div
            className={faceSharedStyle}
            style={{ transform: `rotateY(-90deg) translateZ(${cubeZ}px)` }}
          >
            {renderPips(4)}
          </div>
        </motion.div>
      </div>

      {/* Prominent Gilded Number Badge & Roll Prompt */}
      {canRoll && !disabled ? (
        <motion.div
          animate={{ scale: [1, 1.08, 1], y: [0, -2, 0] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
          className="mt-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-royal font-black text-[11px] uppercase tracking-wider shadow-lg flex items-center gap-1 cursor-pointer border border-amber-200"
          onClick={handleUserClick}
        >
          <Sparkles className="w-3 h-3 fill-slate-950" />
          <span>ROLL DICE</span>
        </motion.div>
      ) : activeNumber !== null && !isTumbling ? (
        <div className="mt-2 px-3 py-0.5 rounded-full bg-slate-950/90 border border-amber-400/80 shadow-md flex items-center gap-1.5 text-xs font-royal font-black text-amber-300">
          <span className="text-[10px] text-amber-400/80 uppercase tracking-wider">Rolled</span>
          <span className="text-sm font-black text-amber-200 bg-amber-950/80 px-2 py-0.2 rounded border border-amber-500/40">
            {activeNumber}
          </span>
        </div>
      ) : null}
    </div>
  );
};
