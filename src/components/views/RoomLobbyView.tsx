import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Check,
  Coins,
  Copy,
  Crown,
  Play,
  Plus,
  Shield,
  Sparkles,
  Trophy,
  UserMinus,
  Users,
  Zap,
} from 'lucide-react';
import { sound } from '../../lib/audio';
import { COLOR_CONFIG, SEAT_COLORS } from '../../lib/ludo/constants';
import { PlayerColor } from '../../lib/ludo/types';
import { authService } from '../../services/authService';
import { roomService } from '../../services/roomService';
import { RoomRecord, UserProfile } from '../../types/database';
import { PaymentModal } from './PaymentModal';

interface RoomLobbyViewProps {
  room: RoomRecord;
  onStartGame: (room: RoomRecord) => void;
  onLeave: () => void;
}

export const RoomLobbyView: React.FC<RoomLobbyViewProps> = ({
  room: initialRoom,
  onStartGame,
  onLeave,
}) => {
  const [room, setRoom] = useState<RoomRecord>(initialRoom);
  const [copied, setCopied] = useState(false);
  const [botDifficulty, setBotDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => authService.getCurrentUser());
  const [showBuyCoinsModal, setShowBuyCoinsModal] = useState(false);
  const [customBetInput, setCustomBetInput] = useState<string>(String(initialRoom?.bet_amount || 0));

  // Live Subscription for multi-user real-time room updates
  useEffect(() => {
    if (!room?.code) return;
    const unsubRoom = roomService.subscribe(room.code, (updatedRoom) => {
      if (updatedRoom) {
        setRoom(updatedRoom);
        if (updatedRoom.status === 'in_game') {
          onStartGame(updatedRoom);
        }
      }
    });
    return () => unsubRoom();
  }, [room?.code, onStartGame]);

  useEffect(() => {
    const unsub = authService.subscribe((u) => {
      if (u) setCurrentUser(u);
    });
    return () => unsub();
  }, []);

  if (!room || !room.code) {
    return (
      <div className="w-full min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 gap-4 p-4 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-400" />
        <p className="font-bold text-sm">Chamber not found or code expired.</p>
        <button
          onClick={onLeave}
          className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl cursor-pointer"
        >
          Return to Court
        </button>
      </div>
    );
  }

  const isHost = room.host_id === currentUser.id;
  const players = room.players || [];
  const myPlayer = players.find((p) => p.user_id === currentUser.id);
  const currentBet = room.bet_amount || 0;
  const currentPot = currentBet * Math.max(1, players.length);
  const hasEnoughCoins = currentUser.coins >= currentBet;

  const handleCopyCode = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(room.code);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = room.code;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
    } catch (err) {
      console.error('Failed to copy room code', err);
    }
    sound.playClick();
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleToggleReady = () => {
    sound.playClick();
    const updated = roomService.toggleReady(room.code, currentUser.id);
    if (updated) setRoom(updated);
  };

  const handleAddBot = () => {
    sound.playClick();
    const updated = roomService.addBotToRoom(room.code, botDifficulty);
    if (updated) setRoom(updated);
  };

  const handleKick = (userId: string) => {
    sound.playClick();
    const updated = roomService.kickPlayer(room.code, userId);
    if (updated) setRoom(updated);
  };

  const handleSeatChange = (targetSeat: number) => {
    sound.playClick();
    const updated = roomService.changeSeat(room.code, currentUser.id, targetSeat);
    if (updated) setRoom(updated);
  };

  const handleStart = () => {
    sound.playClick();
    const updated = roomService.startRoomMatch(room.code);
    onStartGame(updated || room);
  };

  const handleUpdateBet = (newBet: number) => {
    sound.playClick();
    const res = roomService.updateRoomBet(room.code, newBet);
    if (res.success && res.room) {
      setRoom(res.room);
      setCustomBetInput(String(newBet));
    }
  };

  const handleCustomBetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Math.max(0, parseInt(customBetInput, 10) || 0);
    handleUpdateBet(parsed);
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center pb-12 overflow-x-hidden">
      {/* Header */}
      <header className="w-full max-w-4xl px-4 py-4 flex items-center justify-between border-b border-amber-500/20 bg-slate-950/80 sticky top-0 z-20 backdrop-blur-md">
        <button
          onClick={onLeave}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-300 transition-all cursor-pointer text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Room</span>
        </button>

        <div className="text-center">
          <h2 className="font-royal font-bold text-sm sm:text-base text-amber-300">
            Private Royal Chamber
          </h2>
          <span className="text-[10px] text-slate-400">
            Players ({players.length}/{room.max_players})
          </span>
        </div>

        {/* User Coin Purse + Buy Coins */}
        <button
          onClick={() => {
            sound.playClick();
            setShowBuyCoinsModal(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 border border-amber-500/40 text-amber-300 font-bold text-xs hover:border-amber-400 transition-all cursor-pointer shadow"
          title="Buy Coins"
        >
          <Coins className="w-3.5 h-3.5 text-amber-400" />
          <span>{currentUser.coins.toLocaleString()}</span>
          <Plus className="w-3 h-3 text-amber-400" />
        </button>
      </header>

      <main className="w-full max-w-2xl px-4 py-6 space-y-6">
        {/* Room Code Card */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/60 border-2 border-amber-500/40 text-center space-y-4 shadow-xl">
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-bold text-amber-300 uppercase tracking-widest">
              Royal Chamber Code
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <div className="px-6 py-2 rounded-2xl bg-slate-950/80 border border-amber-500/30">
              <span className="text-4xl sm:text-5xl font-mono font-black text-amber-200 tracking-widest drop-shadow">
                {room.code}
              </span>
            </div>

            <button
              id="copy-room-code-btn"
              type="button"
              onClick={handleCopyCode}
              className={`px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 ${
                copied
                  ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-300'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 hover:scale-105 active:scale-95'
              }`}
              title="Copy Room Code to Clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-slate-950" />
                  <span>Code Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-950" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Share this 6-character room code with your friends so they can join your private match chamber.
          </p>
        </div>

        {/* CUSTOM BET & PRIZE POT BANNER */}
        <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-yellow-950/80 border-2 border-amber-500/50 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                <Trophy className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                  Champion Prize Pot
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono font-black text-2xl text-amber-300">
                    {currentPot.toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-amber-400">Coins</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-semibold">Entry Stake</span>
              <span className="font-mono font-bold text-sm text-slate-200">
                {currentBet === 0 ? 'Free Match' : `${currentBet.toLocaleString()} Coins / player`}
              </span>
            </div>
          </div>

          {/* Host Bet Selector Controls */}
          {isHost ? (
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-200 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Set Chamber Bet (Apni Marzi Ki Bet):</span>
                </label>
                <span className="text-[10px] text-slate-400">Host Privilege</span>
              </div>

              {/* Quick Chip Presets */}
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                {[
                  { label: 'Free', val: 0 },
                  { label: '500', val: 500 },
                  { label: '1k', val: 1000 },
                  { label: '2.5k', val: 2500 },
                  { label: '5k', val: 5000 },
                  { label: '10k', val: 10000 },
                  { label: '25k', val: 25000 },
                  { label: '50k', val: 50000 },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => handleUpdateBet(chip.val)}
                    className={`py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer border ${
                      currentBet === chip.val
                        ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md font-black'
                        : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-amber-500/40'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Custom Input */}
              <form onSubmit={handleCustomBetSubmit} className="flex items-center gap-2 pt-1">
                <div className="relative flex-1">
                  <Coins className="w-4 h-4 text-amber-400 absolute left-3 top-2.5" />
                  <input
                    type="number"
                    min="0"
                    step="500"
                    placeholder="Custom coin bet amount..."
                    value={customBetInput}
                    onChange={(e) => setCustomBetInput(e.target.value)}
                    className="w-full bg-slate-950 border border-amber-500/30 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-amber-200 outline-none focus:border-amber-400"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs transition-all cursor-pointer whitespace-nowrap"
                >
                  Set Bet
                </button>
              </form>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
              <span>Host is deciding the match stake. Winner receives the full pot!</span>
              <span className="font-bold text-amber-300 font-mono">
                {currentBet > 0 ? `${currentBet.toLocaleString()} Coins` : 'Free Play'}
              </span>
            </div>
          )}

          {/* Insufficient Balance Alert */}
          {!hasEnoughCoins && (
            <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/50 flex flex-col sm:flex-row items-center justify-between gap-3 animate-pulse">
              <div className="flex items-center gap-2.5 text-rose-200 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>
                  Insufficient Coins! You need {(currentBet - currentUser.coins).toLocaleString()} more coins to stake.
                </span>
              </div>

              <button
                onClick={() => {
                  sound.playClick();
                  setShowBuyCoinsModal(true);
                }}
                className="w-full sm:w-auto px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs uppercase shadow cursor-pointer whitespace-nowrap flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Buy Coins</span>
              </button>
            </div>
          )}
        </div>

        {/* 4 Seats Grid */}
        <div className="space-y-3">
          <h3 className="font-royal font-bold text-sm text-slate-200 uppercase tracking-wider">
            Chamber Seats & Colors
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((seatIndex) => {
              const color: PlayerColor = SEAT_COLORS[seatIndex];
              const config = COLOR_CONFIG[color];
              const occupant = players.find((p) => p.seat === seatIndex);
              const isMe = occupant?.user_id === currentUser.id;

              return (
                <div
                  key={seatIndex}
                  className={`
                    p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between
                    ${occupant ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-950/50 border-dashed border-slate-800 hover:border-amber-500/40'}
                  `}
                  style={{
                    borderLeftColor: config.primary,
                    borderLeftWidth: '4px',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center border border-amber-400/30"
                      style={{ backgroundColor: `${config.primary}33` }}
                    >
                      {occupant?.profile?.is_bot || occupant?.user_id.startsWith('bot_') ? (
                        <Bot className="w-5 h-5 text-purple-300" />
                      ) : (
                        <Crown className="w-5 h-5" style={{ color: config.primary }} />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs sm:text-sm text-slate-100">
                          {occupant ? occupant.profile?.display_name || 'Noble' : 'Empty Throne'}
                        </span>
                        {occupant?.is_host && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500 text-slate-950 uppercase">
                            HOST
                          </span>
                        )}
                        {isMe && (
                          <span className="text-[10px] text-amber-300 font-semibold">(You)</span>
                        )}
                      </div>

                      <span className="text-[11px] font-medium" style={{ color: config.primary }}>
                        {config.name} Court
                      </span>
                    </div>
                  </div>

                  {/* Seat Action */}
                  <div>
                    {!occupant ? (
                      <button
                        onClick={() => handleSeatChange(seatIndex)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-xs font-bold text-amber-300 transition-all cursor-pointer"
                      >
                        Claim Seat
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        {occupant.is_ready ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold">
                            READY
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-500/40 text-[10px] font-bold">
                            WAITING
                          </span>
                        )}

                        {isHost && !occupant.is_host && (
                          <button
                            onClick={() => handleKick(occupant.user_id)}
                            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Kick player"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Host Controls */}
        {isHost && (
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-semibold text-slate-300">Add AI Bot:</span>
              <select
                value={botDifficulty}
                onChange={(e) => setBotDifficulty(e.target.value as any)}
                className="bg-slate-950 border border-slate-700 text-xs text-amber-300 rounded-lg px-2 py-1"
              >
                <option value="easy">Easy Bot</option>
                <option value="medium">Medium Bot</option>
                <option value="hard">Hard Bot</option>
              </select>
            </div>

            <button
              onClick={handleAddBot}
              disabled={players.length >= room.max_players}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-500/40 font-bold text-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              + Add Bot to Chamber
            </button>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-4">
          <button
            onClick={handleToggleReady}
            className={`
              w-full py-3.5 rounded-2xl font-royal font-bold text-sm transition-all shadow-lg cursor-pointer
              ${myPlayer?.is_ready ? 'bg-slate-800 border border-emerald-500/50 text-emerald-300 hover:bg-slate-700' : 'bg-emerald-600 hover:bg-emerald-500 text-slate-950'}
            `}
          >
            {myPlayer?.is_ready ? 'Ready (Click to unready)' : 'I am Ready!'}
          </button>

          {isHost && (
            <button
              onClick={handleStart}
              disabled={players.length < 2 || !hasEnoughCoins}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 font-royal font-extrabold text-sm text-slate-950 shadow-xl shadow-amber-500/30 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>{hasEnoughCoins ? 'Launch Match' : 'Insufficient Coins to Stake'}</span>
            </button>
          )}
        </div>
      </main>

      {/* Buy Coins Modal */}
      <PaymentModal
        isOpen={showBuyCoinsModal}
        onClose={() => setShowBuyCoinsModal(false)}
        onSuccess={() => {
          setCurrentUser(authService.getCurrentUser());
        }}
      />
    </div>
  );
};
