import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Coins,
  Crown,
  MessageSquare,
  Mic,
  MicOff,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { sound } from '../../lib/audio';
import { COLOR_CONFIG } from '../../lib/ludo/constants';
import { GameState, PlayerState } from '../../lib/ludo/types';
import { authService } from '../../services/authService';
import { chatService } from '../../services/chatService';
import { gameService } from '../../services/gameService';
import { voiceChatService, VoiceState } from '../../services/voiceChatService';
import { InGameChatDrawer } from '../chat/InGameChatDrawer';
import { Dice } from '../game/Dice';
import { EmojiReactionPicker } from '../game/EmojiReactionPicker';
import { LudoBoard } from '../game/LudoBoard';
import { PlayerPanel } from '../game/PlayerPanel';
import { ResultModal } from '../game/ResultModal';
import { TurnIndicator } from '../game/TurnIndicator';
import { VoiceChatControls } from '../game/VoiceChatControls';

interface GameArenaViewProps {
  onExit: () => void;
}

export const GameArenaView: React.FC<GameArenaViewProps> = ({ onExit }) => {
  const [gameState, setGameState] = useState<GameState | null>(gameService.getState());
  const [seatReactions, setSeatReactions] = useState<{ [seat: number]: { emoji: string; id: number } }>({});
  const [seatChatBubbles, setSeatChatBubbles] = useState<{
    [seat: number]: { text: string; imageUrl?: string; id: number };
  }>({});
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [voiceState, setVoiceState] = useState<VoiceState>(() => voiceChatService.getState());
  const [isSoundMuted, setIsSoundMuted] = useState(sound.isMuted);

  const currentUser = authService.getCurrentUser();

  // Voice Chat Lifecycle
  useEffect(() => {
    if (gameState?.matchId) {
      const userPlayer = gameState.players.find((p) => p.playerId === currentUser.id);
      const userSeat = userPlayer?.seat ?? 0;
      voiceChatService.joinRoom(
        gameState.matchId,
        userSeat,
        currentUser.display_name,
        currentUser.id
      );
    }

    const unsubVoice = voiceChatService.subscribe((vState) => {
      setVoiceState(vState);
    });

    return () => {
      unsubVoice();
      voiceChatService.leaveRoom();
    };
  }, [gameState?.matchId, currentUser.id, currentUser.display_name]);

  // Game Engine & Emoji Reactions Subscription
  useEffect(() => {
    const unsub = gameService.subscribe((state) => {
      setGameState(state);

      if (state.lastAction?.type === 'EMOJI' && state.lastAction.message) {
        const seat = state.lastAction.seat;
        const emoji = state.lastAction.message;
        const actionId = Date.now() + Math.random();

        setSeatReactions((prev) => ({
          ...prev,
          [seat]: { emoji, id: actionId },
        }));

        setTimeout(() => {
          setSeatReactions((prev) => {
            if (prev[seat]?.id === actionId) {
              const copy = { ...prev };
              delete copy[seat];
              return copy;
            }
            return prev;
          });
        }, 3000);
      }
    });

    return () => unsub();
  }, []);

  // In-Game Live Match Chat Message Bubbles Subscription
  useEffect(() => {
    if (!gameState?.matchId) return;
    const conversationId = chatService.getMatchConversationId(gameState.matchId);

    const unsubChat = chatService.subscribe(conversationId, (msgs) => {
      if (msgs.length === 0) return;
      const latestMsg = msgs[msgs.length - 1];

      const senderPlayer = gameState.players.find(
        (p) => p.playerId === latestMsg.senderId || p.username === latestMsg.senderName
      );
      const seat = senderPlayer?.seat ?? 0;
      const bubbleId = Date.now() + Math.random();

      setSeatChatBubbles((prev) => ({
        ...prev,
        [seat]: {
          text: latestMsg.text,
          imageUrl: latestMsg.imageUrl,
          id: bubbleId,
        },
      }));

      setTimeout(() => {
        setSeatChatBubbles((prev) => {
          if (prev[seat]?.id === bubbleId) {
            const copy = { ...prev };
            delete copy[seat];
            return copy;
          }
          return prev;
        });
      }, 4000);

      if (!isChatOpen && latestMsg.senderId !== currentUser.id) {
        setUnreadChatCount((prev) => prev + 1);
      }
    });

    return () => unsubChat();
  }, [gameState?.matchId, isChatOpen, currentUser.id, gameState?.players]);

  if (!gameState) {
    return (
      <div className="w-full min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 gap-4">
        <p>No active match found.</p>
        <button
          onClick={onExit}
          className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl cursor-pointer"
        >
          Return to Court
        </button>
      </div>
    );
  }

  const { players, turn, dice, status, mode, settings } = gameState;
  const currentSeat = turn.currentSeat;
  const currentPlayer = players.find((p) => p.seat === currentSeat);

  // Current user seat
  const userPlayer = players.find((p) => p.playerId === currentUser.id);
  const userSeat = userPlayer?.seat ?? (mode.startsWith('local') ? currentSeat : players[0]?.seat ?? 0);
  const isMyTurn = mode.startsWith('local') || currentSeat === userSeat;
  const timeLeft = Math.max(0, Math.ceil((turn.expiresAt - Date.now()) / 1000));
  const betAmount = gameState.betAmount || settings?.betAmount || 0;
  const totalPrizePool = gameState.totalPot || (betAmount * Math.max(2, players.length));

  const isTwoPlayerMode = players.length === 2;
  const player1 = players[0];
  const player2 = players[1];
  const player3 = players[2];
  const player4 = players[3];

  const handleRoll = () => {
    gameService.rollCurrentDice();
  };

  const handleMoveToken = (tokenId: number) => {
    gameService.movePlayerToken(tokenId);
  };

  const handleSendReaction = (emoji: string) => {
    gameService.sendQuickChat(emoji);
  };

  const handleRematch = () => {
    gameService.startMatch(mode);
  };

  const handleLeave = () => {
    gameService.leaveMatch();
    onExit();
  };

  const handleOpenChat = () => {
    sound.playClick();
    setIsChatOpen(true);
    setUnreadChatCount(0);
  };

  const handleToggleSound = () => {
    sound.isMuted = !sound.isMuted;
    setIsSoundMuted(sound.isMuted);
    sound.playClick();
  };

  // Render player mini badge for mobile bottom dock
  const renderPlayerDock = (player: PlayerState | undefined, isRightSide: boolean = false) => {
    if (!player) return <div className="flex-1" />;
    const config = COLOR_CONFIG[player.color];
    const isTurn = currentSeat === player.seat;
    const isSpeaking = voiceState.participants[player.seat]?.isSpeaking ?? false;

    return (
      <div
        className={`flex items-center gap-2 p-1.5 rounded-2xl transition-all ${
          isTurn ? 'bg-amber-950/70 border-2 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)] scale-105' : 'bg-slate-900/80 border border-slate-800'
        } ${isRightSide ? 'flex-row-reverse text-right' : ''}`}
      >
        {/* Avatar Frame with Turn Glow & Speaking Ripple */}
        <div className="relative w-10 h-10 flex-shrink-0 flex items-center justify-center">
          {isSpeaking && (
            <span className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-75 pointer-events-none" />
          )}
          {isTurn && (
            <span className="absolute -inset-1 rounded-full border-2 border-amber-400 animate-pulse pointer-events-none" />
          )}
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center border-2 border-amber-300/80 shadow-md overflow-hidden bg-slate-950"
            style={{ backgroundColor: `${config.primary}33` }}
          >
            <Crown className="w-5 h-5 text-amber-200" />
          </div>
          {/* Color Pin Marker */}
          <span
            className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border border-white flex items-center justify-center shadow"
            style={{ backgroundColor: config.primary }}
          />
        </div>

        {/* Name & Coin Purse */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="font-bold text-xs text-slate-100 truncate max-w-[80px]">
              {player.username}
            </span>
          </div>
          <div className={`flex items-center gap-1 text-[10px] text-amber-300 font-bold ${isRightSide ? 'justify-end' : ''}`}>
            <Coins className="w-2.5 h-2.5 text-amber-400" />
            <span>{(player.coins || 1000).toLocaleString()}</span>
          </div>
          <div className={`text-[9px] font-semibold text-slate-400 ${isRightSide ? 'text-right' : ''}`}>
            {player.tokensFinished}/4 Goal
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen sm:min-h-[100dvh] bg-gradient-to-b from-[#0a1128] via-[#090d20] to-[#040814] text-slate-100 flex flex-col justify-between relative overflow-hidden select-none">
      {/* Subtle Mobile Ludo Gaming Pattern Overlay */}
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* Top Mobile Game Header */}
      <header className="w-full max-w-md mx-auto px-3 py-2 flex items-center justify-between border-b border-amber-500/20 bg-slate-950/90 z-20 backdrop-blur-md">
        {/* Left: Exit button */}
        <button
          id="toolbar-leave-btn"
          type="button"
          onClick={handleLeave}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 hover:border-rose-500/50 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 text-xs font-bold transition-all cursor-pointer shadow"
          title="Exit Arena"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit</span>
        </button>

        {/* Center: Prize Pot & Match Title */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-royal font-bold text-xs text-amber-300 uppercase tracking-wider">
              {mode === 'room_private' ? 'Private Chamber' : isTwoPlayerMode ? '2P Duel' : 'Royal Match'}
            </span>
          </div>
          {totalPrizePool > 0 && (
            <div className="flex items-center justify-center gap-1 text-[10px] font-black text-amber-400 bg-amber-950/80 px-2 py-0.2 rounded-full border border-amber-500/30">
              <Coins className="w-2.5 h-2.5 text-amber-400" />
              <span>Prize: {totalPrizePool.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Right: Live Voice Chat Controls & Chat Drawer */}
        <div className="flex items-center gap-1.5">
          <VoiceChatControls />

          {/* Chat Drawer Toggle */}
          <button
            id="toolbar-chat-btn"
            type="button"
            onClick={handleOpenChat}
            className="relative p-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-amber-300 transition-all shadow cursor-pointer"
            title="Open In-Game Chat"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1 py-0.2 bg-amber-500 text-slate-950 font-black text-[8px] rounded-full shadow">
                {unreadChatCount > 9 ? '9+' : unreadChatCount}
              </span>
            )}
          </button>

          {/* Sound Mute Toggle */}
          <button
            type="button"
            onClick={handleToggleSound}
            className="p-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-amber-300 transition-all shadow cursor-pointer"
            title={isSoundMuted ? 'Unmute SFX' : 'Mute SFX'}
          >
            {isSoundMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-500" /> : <Volume2 className="w-3.5 h-3.5 text-amber-300" />}
          </button>
        </div>
      </header>

      {/* Main Game Screen Area */}
      <main className="w-full max-w-md mx-auto px-2 py-1 flex-1 flex flex-col items-center justify-between gap-1 z-10">
        {/* Top Opponent Bar / 2-Player Header */}
        {isTwoPlayerMode ? (
          <div className="w-full px-2 py-1">
            {player2 && (
              <div
                className={`w-full p-2 rounded-2xl flex items-center justify-between border transition-all ${
                  currentSeat === player2.seat
                    ? 'bg-amber-950/70 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="relative w-9 h-9 rounded-full border-2 border-amber-300/80 flex items-center justify-center bg-slate-950 shadow">
                    <Crown className="w-4 h-4 text-amber-200" />
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-white"
                      style={{ backgroundColor: COLOR_CONFIG[player2.color].primary }}
                    />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-slate-100 truncate block max-w-[120px]">
                      {player2.username}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] text-amber-300 font-bold">
                      <Coins className="w-2.5 h-2.5 text-amber-400" />
                      <span>{(player2.coins || 1000).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-amber-300 px-2 py-0.5 rounded-full bg-slate-950 border border-amber-500/30">
                    {player2.tokensFinished}/4 Goal
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* 3 or 4 Player Top Panels */
          <div className="w-full grid grid-cols-2 gap-2 px-1">
            {player1 && (
              <PlayerPanel
                player={player1}
                isCurrentTurn={currentSeat === player1.seat}
                timeLeftSeconds={currentSeat === player1.seat ? timeLeft : 30}
                rank={gameState.rankings.indexOf(player1.seat) !== -1 ? gameState.rankings.indexOf(player1.seat) + 1 : undefined}
                activeReaction={seatReactions[player1.seat]?.emoji}
                isSpeaking={voiceState.participants[player1.seat]?.isSpeaking ?? false}
                isMicMuted={voiceState.participants[player1.seat]?.isMuted ?? true}
                activeChatBubble={seatChatBubbles[player1.seat]}
              />
            )}
            {player2 && (
              <PlayerPanel
                player={player2}
                isCurrentTurn={currentSeat === player2.seat}
                timeLeftSeconds={currentSeat === player2.seat ? timeLeft : 30}
                rank={gameState.rankings.indexOf(player2.seat) !== -1 ? gameState.rankings.indexOf(player2.seat) + 1 : undefined}
                activeReaction={seatReactions[player2.seat]?.emoji}
                isSpeaking={voiceState.participants[player2.seat]?.isSpeaking ?? false}
                isMicMuted={voiceState.participants[player2.seat]?.isMuted ?? true}
                activeChatBubble={seatChatBubbles[player2.seat]}
              />
            )}
          </div>
        )}

        {/* Turn Status Notification Banner */}
        <TurnIndicator
          gameState={gameState}
          currentUserPlayerSeat={mode.startsWith('local') ? undefined : userSeat}
        />

        {/* Central Ludo Board Frame */}
        <div className="w-full flex items-center justify-center my-0.5">
          <LudoBoard
            gameState={gameState}
            onMoveToken={handleMoveToken}
            currentUserPlayerSeat={mode.startsWith('local') ? undefined : userSeat}
          />
        </div>

        {/* Bottom Mobile Dashboard (Inspired by Ludo Star / Ludo Club Mobile Layout) */}
        <div className="w-full p-2 rounded-3xl bg-slate-950/90 border-2 border-amber-500/30 shadow-2xl flex items-center justify-between gap-2 mt-1">
          {/* Left Dock: Player 1 (You) */}
          <div className="flex-1 min-w-0">
            {renderPlayerDock(player1, false)}
          </div>

          {/* Center 3D Dice Action Box with Countdown Border */}
          <div className="flex-shrink-0 flex flex-col items-center justify-center px-1">
            {currentPlayer && (
              <Dice
                value={dice.value}
                canRoll={dice.canRoll && isMyTurn && !currentPlayer.isBot}
                color={currentPlayer.color}
                onRoll={handleRoll}
                disabled={!isMyTurn || currentPlayer.isBot}
              />
            )}
          </div>

          {/* Right Dock: Player 2 (or 4th player) */}
          <div className="flex-1 min-w-0">
            {renderPlayerDock(isTwoPlayerMode ? player2 : player4 || player3, true)}
          </div>
        </div>

        {/* Quick Floating Chat & Emoji Action Row */}
        <div className="w-full flex items-center justify-between px-2 py-1">
          {/* Floating Emoji Picker */}
          <EmojiReactionPicker
            onSendReaction={handleSendReaction}
            disabled={status === 'finished'}
          />

          {/* Quick Chat Shortcut Trigger */}
          <button
            type="button"
            onClick={handleOpenChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-amber-500/40 text-amber-300 font-bold text-xs shadow hover:bg-slate-800 transition-all cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat</span>
          </button>
        </div>
      </main>

      {/* Finished Game Result Modal */}
      {status === 'finished' && (
        <ResultModal
          gameState={gameState}
          onRematch={handleRematch}
          onExit={handleLeave}
        />
      )}

      {/* In-Game Live Chat Drawer */}
      <InGameChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        matchId={gameState.matchId}
        onSendEmojiReaction={handleSendReaction}
      />
    </div>
  );
};


