import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Shield, Sparkles, Star, Swords } from 'lucide-react';
import { COLOR_CONFIG } from '../../lib/ludo/constants';
import { getTokenCoordinates } from '../../lib/ludo/board';
import { canMoveToken, getLegalMoves } from '../../lib/ludo/engine';
import { GameState, PlayerColor } from '../../lib/ludo/types';
import { sound } from '../../lib/audio';
import { BoardCell } from './BoardCell';
import { Token } from './Token';

interface LudoBoardProps {
  gameState: GameState;
  onMoveToken: (tokenId: number) => void;
  currentUserPlayerSeat?: number;
}

export const LudoBoard: React.FC<LudoBoardProps> = ({
  gameState,
  onMoveToken,
  currentUserPlayerSeat,
}) => {
  const { players, turn, dice, settings, lastAction } = gameState;
  const currentSeat = turn.currentSeat;
  const currentPlayer = players.find((p) => p.seat === currentSeat);
  const isMyTurn = currentUserPlayerSeat === undefined || currentUserPlayerSeat === currentSeat;

  // Track previous token progress to trigger stepping sounds & animations
  const prevProgressMap = useRef<Record<string, number>>({});
  const [movingTokenKey, setMovingTokenKey] = useState<string | null>(null);
  const [captureBlastCoord, setCaptureBlastCoord] = useState<{ row: number; col: number } | null>(null);

  // Track legal moves for current turn
  const legalMoves = dice.value !== null ? getLegalMoves(gameState, currentSeat, dice.value) : [];
  const movableTokenIds = isMyTurn ? legalMoves.map((m) => m.tokenId) : [];

  useEffect(() => {
    players.forEach((player) => {
      player.tokens.forEach((token) => {
        const key = `${player.seat}-${token.id}`;
        const prev = prevProgressMap.current[key];
        if (prev !== undefined && prev !== token.progress && token.progress > 0) {
          // Token moved
          setMovingTokenKey(key);
          const steps = Math.abs(token.progress - prev);
          for (let s = 0; s < Math.min(steps, 6); s++) {
            setTimeout(() => sound.playTokenStepHop(s), s * 55);
          }
          if (token.status === 'home') {
            setTimeout(() => sound.playHomeGoal(), 200);
          }
          setTimeout(() => setMovingTokenKey(null), 400);
        }
        prevProgressMap.current[key] = token.progress;
      });
    });
  }, [players]);

  useEffect(() => {
    if (lastAction?.type === 'CAPTURE') {
      sound.playCapture();
    }
  }, [lastAction]);

  // Group tokens that share the same grid coordinates to render stacks nicely
  interface PositionedToken {
    seat: number;
    tokenId: number;
    color: PlayerColor;
    row: number;
    col: number;
    isMovable: boolean;
    isHome: boolean;
    isHopping: boolean;
    stackCount?: number;
  }

  const activeTokensMap = new Map<string, PositionedToken[]>();

  players.forEach((player) => {
    player.tokens.forEach((token) => {
      if (token.status === 'base') return;

      const coord = getTokenCoordinates(player.seat, token.id, token.progress);
      const key = `${coord.row}-${coord.col}`;
      const isMovable = player.seat === currentSeat && movableTokenIds.includes(token.id);
      const tokenKey = `${player.seat}-${token.id}`;

      const entry: PositionedToken = {
        seat: player.seat,
        tokenId: token.id,
        color: player.color,
        row: coord.row,
        col: coord.col,
        isMovable,
        isHome: token.status === 'home',
        isHopping: movingTokenKey === tokenKey,
      };

      if (!activeTokensMap.has(key)) {
        activeTokensMap.set(key, []);
      }
      activeTokensMap.get(key)!.push(entry);
    });
  });

  // Flatten active tokens and assign stack count metadata
  const flattenedActiveTokens: PositionedToken[] = [];
  activeTokensMap.forEach((tokenGroup) => {
    const count = tokenGroup.length;
    // Prefer showing the movable token first if any
    const sorted = [...tokenGroup].sort((a, b) => (b.isMovable ? 1 : 0) - (a.isMovable ? 1 : 0));
    sorted.forEach((t, idx) => {
      flattenedActiveTokens.push({
        ...t,
        stackCount: idx === 0 && count > 1 ? count : 1,
      });
    });
  });

  // Render 6x6 Corner Base Camp
  const renderCamp = (seat: number, color: PlayerColor) => {
    const config = COLOR_CONFIG[color];
    const player = players.find((p) => p.seat === seat);
    const tokens = player?.tokens || [];
    const isTurn = currentSeat === seat;

    return (
      <div
        id={`camp-${color}`}
        className={`
          relative w-full h-full p-2 sm:p-2.5
          bg-gradient-to-br ${config.campBg}
          flex flex-col items-center justify-between
          transition-all duration-300 overflow-hidden rounded-2xl
          ${isTurn ? 'ring-4 ring-amber-400 z-10 shadow-[0_0_20px_rgba(245,158,11,0.6)]' : 'border border-black/30'}
        `}
      >
        {/* Camp Header Bar */}
        <div className="w-full flex items-center justify-between px-1 z-10">
          <div className="flex items-center gap-1 min-w-0">
            <Crown className="w-3.5 h-3.5 flex-shrink-0 text-amber-200 drop-shadow" />
            <span className="text-[10px] sm:text-xs font-black text-white tracking-wider uppercase truncate max-w-[85px] drop-shadow">
              {player ? player.username : config.name}
            </span>
          </div>
          {player && (
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-black/50 text-amber-300 font-black backdrop-blur-sm border border-amber-400/40 shadow">
              {tokens.filter((t) => t.status === 'home').length}/4 👑
            </span>
          )}
        </div>

        {/* 4 Base Pedestals White Plate (2x2 Grid) */}
        <div className="w-[85%] aspect-square rounded-2xl bg-white/95 p-1.5 sm:p-2 grid grid-cols-2 grid-rows-2 gap-1.5 place-items-center z-10 shadow-lg border-2 border-amber-300/40">
          {[0, 1, 2, 3].map((tId) => {
            const token = tokens[tId];
            const inBase = token && token.status === 'base';
            const isMovable = isTurn && movableTokenIds.includes(tId);

            return (
              <div
                key={tId}
                className="w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-full border-2 flex items-center justify-center relative shadow-inner transition-transform"
                style={{
                  borderColor: config.primary,
                  backgroundColor: `${config.primary}22`,
                }}
              >
                {inBase && (
                  <Token
                    id={tId}
                    color={color}
                    isMovable={isMovable}
                    onClick={() => onMoveToken(tId)}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Base Footer Indicator */}
        <div className="text-[8px] sm:text-[9px] text-amber-200 font-black tracking-wider uppercase z-10 drop-shadow">
          {isTurn && dice.value === 6 ? 'ROLL 6 TO DEPLOY!' : ''}
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full aspect-square max-w-[540px] mx-auto p-1.5 sm:p-2.5 rounded-3xl bg-slate-950 border-4 border-amber-500/70 shadow-[0_12px_42px_rgba(0,0,0,0.95)]">
      {/* 15x15 Grid Arena Frame */}
      <div className="relative w-full h-full grid grid-cols-15 grid-rows-15 gap-[1px] bg-slate-500 rounded-2xl overflow-hidden shadow-2xl">
        {/* Top Left: Red Camp (rows 0..5, cols 0..5) */}
        <div className="col-span-6 row-span-6 p-1">
          {renderCamp(0, 'red')}
        </div>

        {/* Top Center Track (rows 0..5, cols 6..8) */}
        <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 gap-[1px]">
          {/* Row 0 */}
          <BoardCell row={0} col={6} />
          <BoardCell row={0} col={7} />
          <BoardCell row={0} col={8} />

          {/* Row 1 */}
          <BoardCell row={1} col={6} />
          <BoardCell row={1} col={7} homeColor="green" />
          <BoardCell row={1} col={8} startColor="green" />

          {/* Row 2 */}
          <BoardCell row={2} col={6} isSafe safeType="star" />
          <BoardCell row={2} col={7} homeColor="green" />
          <BoardCell row={2} col={8} />

          {/* Row 3 */}
          <BoardCell row={3} col={6} />
          <BoardCell row={3} col={7} homeColor="green" />
          <BoardCell row={3} col={8} />

          {/* Row 4 */}
          <BoardCell row={4} col={6} />
          <BoardCell row={4} col={7} homeColor="green" />
          <BoardCell row={4} col={8} />

          {/* Row 5 */}
          <BoardCell row={5} col={6} />
          <BoardCell row={5} col={7} homeColor="green" />
          <BoardCell row={5} col={8} />
        </div>

        {/* Top Right: Green Camp (rows 0..5, cols 9..14) */}
        <div className="col-span-6 row-span-6 p-1">
          {renderCamp(1, 'green')}
        </div>

        {/* Middle Left Track (rows 6..8, cols 0..5) */}
        <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 gap-[1px]">
          {/* Row 6 */}
          <BoardCell row={6} col={0} />
          <BoardCell row={6} col={1} startColor="red" />
          <BoardCell row={6} col={2} />
          <BoardCell row={6} col={3} />
          <BoardCell row={6} col={4} />
          <BoardCell row={6} col={5} />

          {/* Row 7 */}
          <BoardCell row={7} col={0} />
          <BoardCell row={7} col={1} homeColor="red" />
          <BoardCell row={7} col={2} homeColor="red" />
          <BoardCell row={7} col={3} homeColor="red" />
          <BoardCell row={7} col={4} homeColor="red" />
          <BoardCell row={7} col={5} homeColor="red" />

          {/* Row 8 */}
          <BoardCell row={8} col={0} />
          <BoardCell row={8} col={1} />
          <BoardCell row={8} col={2} isSafe safeType="star" />
          <BoardCell row={8} col={3} />
          <BoardCell row={8} col={4} />
          <BoardCell row={8} col={5} />
        </div>

        {/* Center Victory Sanctuary (rows 6..8, cols 6..8) */}
        <div className="col-span-3 row-span-3">
          <BoardCell row={7} col={7} isGoal />
        </div>

        {/* Middle Right Track (rows 6..8, cols 9..14) */}
        <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 gap-[1px]">
          {/* Row 6 */}
          <BoardCell row={6} col={9} />
          <BoardCell row={6} col={10} />
          <BoardCell row={6} col={11} />
          <BoardCell row={6} col={12} isSafe safeType="star" />
          <BoardCell row={6} col={13} />
          <BoardCell row={6} col={14} />

          {/* Row 7 */}
          <BoardCell row={7} col={9} homeColor="yellow" />
          <BoardCell row={7} col={10} homeColor="yellow" />
          <BoardCell row={7} col={11} homeColor="yellow" />
          <BoardCell row={7} col={12} homeColor="yellow" />
          <BoardCell row={7} col={13} homeColor="yellow" />
          <BoardCell row={7} col={14} />

          {/* Row 8 */}
          <BoardCell row={8} col={9} />
          <BoardCell row={8} col={10} />
          <BoardCell row={8} col={11} />
          <BoardCell row={8} col={12} />
          <BoardCell row={8} col={13} startColor="yellow" />
          <BoardCell row={8} col={14} />
        </div>

        {/* Bottom Left: Blue Camp (rows 9..14, cols 0..5) */}
        <div className="col-span-6 row-span-6 p-1">
          {renderCamp(3, 'blue')}
        </div>

        {/* Bottom Center Track (rows 9..14, cols 6..8) */}
        <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 gap-[1px]">
          {/* Row 9 */}
          <BoardCell row={9} col={6} />
          <BoardCell row={9} col={7} homeColor="blue" />
          <BoardCell row={9} col={8} />

          {/* Row 10 */}
          <BoardCell row={10} col={6} />
          <BoardCell row={10} col={7} homeColor="blue" />
          <BoardCell row={10} col={8} />

          {/* Row 11 */}
          <BoardCell row={11} col={6} />
          <BoardCell row={11} col={7} homeColor="blue" />
          <BoardCell row={11} col={8} />

          {/* Row 12 */}
          <BoardCell row={12} col={6} />
          <BoardCell row={12} col={7} homeColor="blue" />
          <BoardCell row={12} col={8} isSafe safeType="star" />

          {/* Row 13 */}
          <BoardCell row={13} col={6} startColor="blue" />
          <BoardCell row={13} col={7} homeColor="blue" />
          <BoardCell row={13} col={8} />

          {/* Row 14 */}
          <BoardCell row={14} col={6} />
          <BoardCell row={14} col={7} />
          <BoardCell row={14} col={8} />
        </div>

        {/* Bottom Right: Yellow Camp (rows 9..14, cols 9..14) */}
        <div className="col-span-6 row-span-6 p-1">
          {renderCamp(2, 'yellow')}
        </div>

        {/* Active Tokens Overlay (Percentage coordinates with step hopping physics) */}
        <div className="absolute inset-0 pointer-events-none">
          {flattenedActiveTokens.map((t) => {
            const topPct = (t.row / 15) * 100;
            const leftPct = (t.col / 15) * 100;
            const cellSizePct = 100 / 15;

            return (
              <motion.div
                key={`${t.seat}-${t.tokenId}`}
                layout
                transition={{
                  type: 'spring',
                  damping: 18,
                  stiffness: 280,
                  mass: 0.8,
                }}
                className="absolute pointer-events-auto flex items-center justify-center"
                style={{
                  top: `${topPct}%`,
                  left: `${leftPct}%`,
                  width: `${cellSizePct}%`,
                  height: `${cellSizePct}%`,
                  zIndex: t.isMovable ? 48 : t.isHopping ? 49 : 25,
                }}
              >
                <Token
                  id={t.tokenId}
                  color={t.color}
                  isMovable={t.isMovable}
                  isHome={t.isHome}
                  isHopping={t.isHopping}
                  stackCount={t.stackCount}
                  onClick={() => onMoveToken(t.tokenId)}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
