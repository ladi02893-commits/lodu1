import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Crown,
  Image as ImageIcon,
  MoreVertical,
  Send,
  ShieldAlert,
  Smile,
  Trash2,
  UserX,
  X,
} from 'lucide-react';
import { sound } from '../../lib/audio';
import { authService } from '../../services/authService';
import { ChatMessage, ChatTimerOption, chatService } from '../../services/chatService';
import { FriendEntry, friendsService } from '../../services/friendsService';
import { ImageViewerModal } from './ImageViewerModal';

interface DirectChatModalProps {
  friend: FriendEntry;
  onClose: () => void;
  onChallenge?: () => void;
}

const PRESET_EMOJIS = ['👑', '⚔️', '🎲', '🛡️', '🔥', '👏', '😂', '😎', '🎉', '🏆', '💯', '✨'];

export const DirectChatModal: React.FC<DirectChatModalProps> = ({
  friend,
  onClose,
  onChallenge,
}) => {
  const currentUser = authService.getCurrentUser();
  const conversationId = chatService.getConversationId(friend.id);

  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    chatService.getMessages(conversationId, currentUser.id)
  );
  const [inputText, setInputText] = useState('');
  const [activeTimer, setActiveTimer] = useState<ChatTimerOption>(() =>
    chatService.getConversationTimer(conversationId)
  );
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeDeleteMenuMsgId, setActiveDeleteMenuMsgId] = useState<string | null>(null);

  // Image preview state before sending
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<{ url: string; caption?: string; sender?: string } | null>(null);

  // Real-time blocked status
  const isBlocked = friendsService.isBlocked(friend.id);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = chatService.subscribe(conversationId, (msgs) => {
      setMessages(msgs);
    });
    return () => unsub();
  }, [conversationId]);

  useEffect(() => {
    setActiveTimer(chatService.getConversationTimer(conversationId));
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingImage]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isBlocked) return;

    if (pendingImage) {
      chatService.sendImageMessage(conversationId, pendingImage, inputText);
      setPendingImage(null);
      setInputText('');
      return;
    }

    if (!inputText.trim()) return;

    chatService.sendMessage(conversationId, inputText);
    setInputText('');
  };

  const handleImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image exceeds maximum size of 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target?.result as string;
      if (dataUrl) {
        setPendingImage(dataUrl);
        sound.playClick();
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSetTimer = (option: ChatTimerOption) => {
    sound.playClick();
    chatService.setConversationTimer(conversationId, option);
    setActiveTimer(option);
    setShowTimerMenu(false);
  };

  const handleDeleteMessage = (messageId: string, type: 'for_everyone' | 'for_me') => {
    sound.playClick();
    chatService.deleteMessage(messageId, type, currentUser.id);
    setActiveDeleteMenuMsgId(null);
  };

  const handleUnfriend = () => {
    if (confirm(`Remove ${friend.display_name} from your companions?`)) {
      sound.playClick();
      friendsService.unfriend(friend.id);
      onClose();
    }
  };

  const handleBlockUser = () => {
    if (confirm(`Block ${friend.display_name}? They will no longer be able to message or challenge you.`)) {
      sound.playClick();
      friendsService.blockUser(friend.id);
      setShowOptionsMenu(false);
    }
  };

  const handleUnblockUser = () => {
    sound.playClick();
    friendsService.unblockUser(friend.id);
  };

  const formatTimerLabel = (opt: ChatTimerOption) => {
    if (opt === 0) return 'Off';
    if (opt === 10) return '10s';
    if (opt === 60) return '1m';
    if (opt === 3600) return '1h';
    if (opt === 86400) return '24h';
    return `${opt}s`;
  };

  const getTimeRemaining = (expiresAt?: number) => {
    if (!expiresAt) return null;
    const diff = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
    if (diff <= 0) return 'Expiring...';
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    return `${Math.floor(diff / 3600)}h`;
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
        <div className="relative w-full max-w-lg h-[92vh] sm:h-[84vh] bg-slate-900 border-2 border-amber-500/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <header className="px-4 py-3 bg-slate-950/90 border-b border-amber-500/20 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full bg-slate-900 border border-amber-400/50 flex items-center justify-center">
                <Crown className="w-5 h-5 text-amber-300" />
                {friend.is_online && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-royal font-bold text-sm text-slate-100">
                    {friend.display_name}
                  </h3>
                  <span className="text-[10px] text-amber-400/80 font-mono">
                    #{friend.player_id}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {isBlocked ? (
                    <span className="text-rose-400 font-semibold">Blocked User</span>
                  ) : friend.is_online ? (
                    <span className="text-emerald-400">Online in Realm</span>
                  ) : (
                    'Offline'
                  )}
                </div>
              </div>
            </div>

            {/* Actions & Timers */}
            <div className="flex items-center gap-1.5 relative">
              {/* Auto-Delete Disappearing Timer Selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTimerMenu(!showTimerMenu)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    activeTimer > 0
                      ? 'bg-amber-950/80 border-amber-400/60 text-amber-300 shadow'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                  title="Auto-Delete / Disappearing Messages Timer"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatTimerLabel(activeTimer)}</span>
                </button>

                {showTimerMenu && (
                  <div className="absolute right-0 top-10 w-44 rounded-2xl bg-slate-950 border border-amber-500/40 p-2 shadow-2xl z-50 space-y-1">
                    <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider px-2 py-1">
                      Disappearing Timer
                    </div>
                    {([0, 10, 60, 3600, 86400] as ChatTimerOption[]).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleSetTimer(opt)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                          activeTimer === opt
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span>{opt === 0 ? 'Off (Keep Forever)' : formatTimerLabel(opt)}</span>
                        {activeTimer === opt && <span className="text-[10px]">Active</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Challenge Shortcut */}
              {onChallenge && !isBlocked && (
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    onChallenge();
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow"
                >
                  Duel
                </button>
              )}

              {/* More Options Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {showOptionsMenu && (
                  <div className="absolute right-0 top-10 w-44 rounded-2xl bg-slate-950 border border-amber-500/40 p-1.5 shadow-2xl z-50 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        chatService.clearChat(conversationId);
                        setShowOptionsMenu(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Clear Chat</span>
                    </button>

                    {isBlocked ? (
                      <button
                        type="button"
                        onClick={handleUnblockUser}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-emerald-300 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                      >
                        <Crown className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Unblock Noble</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleBlockUser}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-950/50 flex items-center gap-2 cursor-pointer font-medium"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>Block Noble</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleUnfriend}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>Unfriend</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  onClose();
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Active Disappearing Message Notice Banner */}
          {activeTimer > 0 && (
            <div className="bg-amber-950/40 border-b border-amber-500/20 px-3 py-1 flex items-center justify-center gap-1.5 text-[11px] text-amber-300">
              <Clock className="w-3 h-3" />
              <span>Disappearing messages active ({formatTimerLabel(activeTimer)})</span>
            </div>
          )}

          {/* Blocked Alert Banner */}
          {isBlocked && (
            <div className="bg-rose-950/80 border-b border-rose-500/30 p-2.5 flex items-center justify-between gap-2 text-xs text-rose-200">
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>You have blocked this noble.</span>
              </div>
              <button
                type="button"
                onClick={handleUnblockUser}
                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] cursor-pointer"
              >
                Unblock
              </button>
            </div>
          )}

          {/* Messages List */}
          <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-4 space-y-2">
                <Crown className="w-10 h-10 text-amber-500/30" />
                <p className="text-xs">No messages yet. Send a royal greeting to start chatting!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.senderId === currentUser.id;
                const isSystem = msg.type === 'system';
                const timeRemaining = getTimeRemaining(msg.expiresAt);

                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center my-2">
                      <span className="text-[10px] text-amber-400/80 bg-slate-950/60 border border-amber-500/20 px-3 py-1 rounded-full">
                        {msg.text}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} group relative`}
                  >
                    <div className="flex items-end gap-1.5 max-w-[85%] sm:max-w-[75%]">
                      {!isMine && (
                        <div className="w-6 h-6 rounded-full bg-slate-800 border border-amber-500/30 flex items-center justify-center text-xs flex-shrink-0">
                          👑
                        </div>
                      )}

                      <div className="relative group">
                        <div
                          className={`p-3 rounded-2xl text-xs sm:text-sm shadow-md ${
                            msg.isDeleted
                              ? 'bg-slate-950/60 border border-slate-800 text-slate-500 italic'
                              : isMine
                              ? 'bg-gradient-to-tr from-amber-600 to-amber-500 text-slate-950 font-medium rounded-br-none'
                              : 'bg-slate-800 text-slate-100 border border-slate-700/80 rounded-bl-none'
                          }`}
                        >
                          {/* Image content if present */}
                          {msg.imageUrl && !msg.isDeleted && (
                            <div className="mb-2 rounded-xl overflow-hidden cursor-pointer">
                              <img
                                src={msg.imageUrl}
                                alt="Shared attachment"
                                onClick={() =>
                                  setViewingImage({
                                    url: msg.imageUrl!,
                                    caption: msg.text,
                                    sender: msg.senderName,
                                  })
                                }
                                className="max-h-48 w-auto rounded-lg object-cover hover:brightness-110 transition-all border border-black/20"
                              />
                            </div>
                          )}

                          {/* Text message */}
                          {msg.text && (
                            <p className="whitespace-pre-wrap break-words leading-relaxed">
                              {msg.text}
                            </p>
                          )}

                          {/* Footer: Time & Timer expiry badge */}
                          <div
                            className={`flex items-center justify-end gap-1.5 mt-1 text-[9px] ${
                              isMine ? 'text-slate-950/70 font-bold' : 'text-slate-400'
                            }`}
                          >
                            {timeRemaining && !msg.isDeleted && (
                              <span className="flex items-center gap-0.5 text-amber-900 bg-amber-300/60 px-1 py-0.2 rounded font-mono">
                                <Clock className="w-2.5 h-2.5" />
                                {timeRemaining}
                              </span>
                            )}
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Hover Delete Action Trigger */}
                        {!msg.isDeleted && (
                          <div
                            className={`absolute top-1/2 -translate-y-1/2 ${
                              isMine ? '-left-7' : '-right-7'
                            } opacity-0 group-hover:opacity-100 transition-opacity`}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setActiveDeleteMenuMsgId(
                                  activeDeleteMenuMsgId === msg.id ? null : msg.id
                                )
                              }
                              className="p-1 rounded-full bg-slate-950/80 border border-slate-700 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                              title="Message Actions"
                            >
                              <MoreVertical className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        {/* Delete Menu Popup */}
                        {activeDeleteMenuMsgId === msg.id && (
                          <div
                            className={`absolute bottom-full mb-1 z-30 ${
                              isMine ? 'right-0' : 'left-0'
                            } w-36 bg-slate-950 border border-amber-500/40 rounded-xl p-1 shadow-2xl space-y-0.5`}
                          >
                            {isMine && (
                              <button
                                type="button"
                                onClick={() => handleDeleteMessage(msg.id, 'for_everyone')}
                                className="w-full text-left px-2 py-1 rounded text-[11px] text-rose-400 hover:bg-rose-950/50 transition-colors cursor-pointer font-semibold"
                              >
                                Delete for everyone
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(msg.id, 'for_me')}
                              className="w-full text-left px-2 py-1 rounded text-[11px] text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              Delete for me
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Pending Image Attachment Preview */}
          {pendingImage && (
            <div className="px-4 py-2 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-3">
                <img
                  src={pendingImage}
                  alt="Attachment Preview"
                  className="w-14 h-14 object-cover rounded-xl border border-amber-400/50 shadow"
                />
                <div className="text-xs text-amber-300 font-semibold">
                  <span>Image ready to send</span>
                  <span className="block text-[10px] text-slate-400">Add an optional caption below</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPendingImage(null)}
                className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Emoji Picker Popover */}
          {showEmojiPicker && (
            <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 grid grid-cols-6 gap-2">
              {PRESET_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setInputText((prev) => prev + emoji);
                    setShowEmojiPicker(false);
                    sound.playClick();
                  }}
                  className="text-xl p-1.5 rounded-xl bg-slate-900 hover:bg-amber-950/50 border border-slate-800 hover:border-amber-400/40 transition-all cursor-pointer flex items-center justify-center"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Bottom Chat Input Form */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-slate-950/95 border-t border-amber-500/20 flex items-center gap-2 flex-shrink-0"
          >
            {/* Hidden Image Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageSelected}
              className="hidden"
            />

            {/* Attach Image Button */}
            <button
              type="button"
              disabled={isBlocked}
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-slate-400 hover:text-amber-300 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Share Image"
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            {/* Emoji Button */}
            <button
              type="button"
              disabled={isBlocked}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-slate-400 hover:text-amber-300 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Add Emoji"
            >
              <Smile className="w-4 h-4" />
            </button>

            {/* Text Input */}
            <input
              type="text"
              placeholder={
                isBlocked
                  ? 'Unblock noble to send messages...'
                  : pendingImage
                  ? 'Add a caption...'
                  : 'Type a royal message...'
              }
              value={inputText}
              disabled={isBlocked}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-amber-200 placeholder-slate-500 outline-none focus:border-amber-400 disabled:opacity-50"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={isBlocked || (!inputText.trim() && !pendingImage)}
              className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-bold transition-all flex items-center justify-center cursor-pointer shadow disabled:opacity-50 disabled:cursor-not-allowed"
              title="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Image Lightbox Viewer Modal */}
      {viewingImage && (
        <ImageViewerModal
          imageUrl={viewingImage.url}
          caption={viewingImage.caption}
          senderName={viewingImage.sender}
          onClose={() => setViewingImage(null)}
        />
      )}
    </>
  );
};
