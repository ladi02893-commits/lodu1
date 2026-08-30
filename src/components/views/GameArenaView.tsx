import React, { useEffect, useState } from 'react';
import { Dice } from '../game/Dice';
import { EmojiReactionPicker } from '../game/EmojiReactionPicker';
import { GameToolbar } from '../game/GameToolbar';
import { LudoBoard } from '../game/LudoBoard';
import { PlayerPanel } from '../game/PlayerPanel';
import { ResultModal } from '../game/ResultModal';
import { TurnIndicator } from '../game/TurnIndicator';
import { InGameChatDrawer } from '../chat/InGameChatDrawer';
import { GameState } from '../../lib/ludo/types';
import { gameService } from '../../services/gameService';
import { authService } from '../../services/authService';
import { chatService, ChatMessage } from '../../services/chatService';
import { voiceChatService, VoiceState } from '../../services/voiceChatService';

interface GameArenaViewProps {
  onExit: () => void;
}

export const GameArenaView: React.FC<GameArenaViewProps> = ({ onExit }) => {
  const [gameState, setGameState] = useState<GameState | null>(gameService.getState());
  // Per-seat active transient emoji reaction map
  const [seatReactions, setSeatReactions] = useState<{ [seat: number]: { emoji: string; id: number } }>({});
  // Per-seat active transient chat message bubbles
  const [seatChatBubbles, setSeatChatBubbles] = useState<{
    [seat: number]: { text: string; imageUrl?: string; id: number };
  }>({});
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [voiceState, setVoiceState] = useState<VoiceState>(() => voiceChatService.getState());

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

        // Clear after 3 seconds
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

      // Find seat corresponding to sender
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

      // Auto-clear bubble after 4 seconds
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

      // Increment unread count if drawer is closed and message is from someone else
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

  const { players, turn, dice, status, mode } = gameState;
  const currentSeat = turn.currentSeat;
  const currentPlayer = players.find((p) => p.seat === currentSeat);

  // Seat determination for current user
  const userPlayer = players.find((p) => p.playerId === currentUser.id);
  const userSeat = userPlayer?.seat ?? (mode.startsWith('local') ? currentSeat : 0);
  const isMyTurn = mode.startsWith('local') || currentSeat === userSeat;

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
    setIsChatOpen(true);
    setUnreadChatCount(0);
  };

  // 4 Player Slots (Seats 0, 1, 2, 3)
  const player0 = players.find((p) => p.seat === 0);
  const player1 = players.find((p) => p.seat === 1);
  const player2 = players.find((p) => p.seat === 2);
  const player3 = players.find((p) => p.seat === 3);

  const timeLeft = Math.max(0, Math.ceil((turn.expiresAt - Date.now()) / 1000));

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-x-hidden relative">
      {/* Top Game Toolbar */}
      <GameToolbar
        onLeave={handleLeave}
        onSendQuickChat={handleSendReaction}
        onOpenChat={handleOpenChat}
        unreadChatCount={unreadChatCount}
        modeTitle={
          mode === 'vs_computer'
            ? 'Vs Royal AI'
            : mode === 'quick_2'
            ? 'Royal Duel (2P)'
            : mode === 'quick_4'
            ? 'Quick Match (4P)'
            : mode === 'room_private'
            ? 'Private Royal Chamber'
            : 'Pass & Play Arena'
        }
      />

      {/* Main Playing Arena */}
      <main className="w-full max-w-4xl mx-auto px-2 sm:px-4 py-2 flex-1 flex flex-col items-center justify-center gap-2">
        {/* Turn Status Banner */}
        <TurnIndicator
          gameState={gameState}
          currentUserPlayerSeat={mode.startsWith('local') ? undefined : userSeat}
        />

        {/* Top 2 Player Panels */}
        <div className="w-full grid grid-cols-2 gap-2 sm:gap-4 max-w-[560px]">
          {player0 ? (
            <PlayerPanel
              player={player0}
              isCurrentTurn={currentSeat === 0}
              timeLeftSeconds={currentSeat === 0 ? timeLeft : 30}
              rank={gameState.rankings.indexOf(0) !== -1 ? gameState.rankings.indexOf(0) + 1 : undefined}
              activeReaction={seatReactions[0]?.emoji}
              isSpeaking={voiceState.participants[0]?.isSpeaking ?? false}
              isMicMuted={voiceState.participants[0]?.isMuted ?? true}
              activeChatBubble={seatChatBubbles[0]}
            />
          ) : <div />}

          {player1 ? (
            <PlayerPanel
              player={player1}
              isCurrentTurn={currentSeat === 1}
              timeLeftSeconds={currentSeat === 1 ? timeLeft : 30}
              rank={gameState.rankings.indexOf(1) !== -1 ? gameState.rankings.indexOf(1) + 1 : undefined}
              activeReaction={seatReactions[1]?.emoji}
              isSpeaking={voiceState.participants[1]?.isSpeaking ?? false}
              isMicMuted={voiceState.participants[1]?.isMuted ?? true}
              activeChatBubble={seatChatBubbles[1]}
            />
          ) : <div />}
        </div>

        {/* Central Ludo Board */}
        <div className="w-full flex items-center justify-center my-1 relative">
          <LudoBoard
            gameState={gameState}
            onMoveToken={handleMoveToken}
            currentUserPlayerSeat={mode.startsWith('local') ? undefined : userSeat}
          />
        </div>

        {/* Bottom 2 Player Panels */}
        <div className="w-full grid grid-cols-2 gap-2 sm:gap-4 max-w-[560px]">
          {player3 ? (
            <PlayerPanel
              player={player3}
              isCurrentTurn={currentSeat === 3}
              timeLeftSeconds={currentSeat === 3 ? timeLeft : 30}
              rank={gameState.rankings.indexOf(3) !== -1 ? gameState.rankings.indexOf(3) + 1 : undefined}
              activeReaction={seatReactions[3]?.emoji}
              isSpeaking={voiceState.participants[3]?.isSpeaking ?? false}
              isMicMuted={voiceState.participants[3]?.isMuted ?? true}
              activeChatBubble={seatChatBubbles[3]}
            />
          ) : <div />}

          {player2 ? (
            <PlayerPanel
              player={player2}
              isCurrentTurn={currentSeat === 2}
              timeLeftSeconds={currentSeat === 2 ? timeLeft : 30}
              rank={gameState.rankings.indexOf(2) !== -1 ? gameState.rankings.indexOf(2) + 1 : undefined}
              activeReaction={seatReactions[2]?.emoji}
              isSpeaking={voiceState.participants[2]?.isSpeaking ?? false}
              isMicMuted={voiceState.participants[2]?.isMuted ?? true}
              activeChatBubble={seatChatBubbles[2]}
            />
          ) : <div />}
        </div>

        {/* Bottom Board Action Deck: Dice & Emoji Reaction Picker */}
        <div className="w-full max-w-md flex items-center justify-center gap-4 py-2">
          {/* Reaction Picker Button */}
          <div className="flex-shrink-0">
            <EmojiReactionPicker
              onSendReaction={handleSendReaction}
              disabled={status === 'finished'}
            />
          </div>

          {/* Dice Action */}
          {currentPlayer && (
            <div className="flex-1 max-w-[220px]">
              <Dice
                value={dice.value}
                canRoll={dice.canRoll && isMyTurn && !currentPlayer.isBot}
                color={currentPlayer.color}
                onRoll={handleRoll}
                disabled={!isMyTurn || currentPlayer.isBot}
              />
            </div>
          )}
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

