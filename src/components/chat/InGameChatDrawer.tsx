import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Image as ImageIcon,
  MessageSquare,
  MoreVertical,
  Send,
  Smile,
  Trash2,
  X,
} from 'lucide-react';
import { sound } from '../../lib/audio';
import { authService } from '../../services/authService';
import { ChatMessage, ChatTimerOption, chatService } from '../../services/chatService';
import { ImageViewerModal } from './ImageViewerModal';

interface InGameChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  matchId: string;
  onSendEmojiReaction?: (emoji: string) => void;
}

const PRESET_PHRASES = [
  'Good luck! 👑',
  'Nice move! 👏',
  'Well played! ⚔️',
  'Oops! 😅',
  "Let's go! 🚀",
  'GG! 🏆',
  'Need a 6! 🎲',
  'Safe zone! 🛡️',
  'Watch your token! 👀',
  'Victory shall be mine! 🏰',
];

const PRESET_EMOJIS = ['👋', '😂', '😡', '👑', '🔥', '⚔️', '🛡️', '🎲', '🥳', '😎', '💀', '🚀'];

export const InGameChatDrawer: React.FC<InGameChatDrawerProps> = ({
  isOpen,
  onClose,
  matchId,
  onSendEmojiReaction,
}) => {
  const currentUser = authService.getCurrentUser();
  const conversationId = chatService.getMatchConversationId(matchId);

  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    chatService.getMessages(conversationId, currentUser.id)
  );
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'phrases'>('chat');
  const [activeTimer, setActiveTimer] = useState<ChatTimerOption>(() =>
    chatService.getConversationTimer(conversationId)
  );
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<{ url: string; caption?: string; sender?: string } | null>(null);
  const [activeDeleteMenuMsgId, setActiveDeleteMenuMsgId] = useState<string | null>(null);

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
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, pendingImage]);

  if (!isOpen) return null;

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

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

  const handleSelectPhrase = (phrase: string) => {
    sound.playClick();
    chatService.sendMessage(conversationId, phrase);
    if (onSendEmojiReaction && (phrase.length <= 4 || phrase.includes('👑'))) {
      onSendEmojiReaction(phrase);
    }
  };

  const handleSelectEmoji = (emoji: string) => {
    sound.playClick();
    chatService.sendMessage(conversationId, emoji);
    if (onSendEmojiReaction) {
      onSendEmojiReaction(emoji);
    }
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

  const handleSetTimer = (opt: ChatTimerOption) => {
    sound.playClick();
    chatService.setConversationTimer(conversationId, opt);
    setActiveTimer(opt);
    setShowTimerMenu(false);
  };

  const handleDeleteMessage = (messageId: string, type: 'for_everyone' | 'for_me') => {
    sound.playClick();
    chatService.deleteMessage(messageId, type, currentUser.id);
    setActiveDeleteMenuMsgId(null);
  };

  const formatTimerLabel = (opt: ChatTimerOption) => {
    if (opt === 0) return 'Off';
    if (opt === 10) return '10s';
    if (opt === 60) return '1m';
    if (opt === 3600) return '1h';
    return `${opt}s`;
  };

  const getTimeRemaining = (expiresAt?: number) => {
    if (!expiresAt) return null;
    const diff = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
    if (diff <= 0) return 'Expiring...';
    if (diff < 60) return `${diff}s`;
    return `${Math.floor(diff / 60)}m`;
  };

  return (
    <>
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm sm:max-w-md bg-slate-950/95 border-l-2 border-amber-500/40 shadow-2xl backdrop-blur-xl flex flex-col animate-slide-left">
        {/* Drawer Header */}
        <header className="px-4 py-3 bg-slate-900/90 border-b border-amber-500/20 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber-400" />
            <h3 className="font-royal font-bold text-sm text-slate-100">
              Royal Arena Dispatch
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto-Delete Disappearing Timer Toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTimerMenu(!showTimerMenu)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${
                  activeTimer > 0
                    ? 'bg-amber-950/80 border-amber-400 text-amber-300 shadow'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
                title="Match Chat Disappearing Timer"
              >
                <Clock className="w-3 h-3" />
                <span>{formatTimerLabel(activeTimer)}</span>
              </button>

              {showTimerMenu && (
                <div className="absolute right-0 top-9 w-40 rounded-2xl bg-slate-900 border border-amber-500/40 p-2 shadow-2xl z-50 space-y-1">
                  <div className="text-[9px] font-bold text-amber-400 uppercase tracking-wider px-2 py-0.5">
                    Auto-Delete Timer
                  </div>
                  {([0, 10, 60, 3600] as ChatTimerOption[]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleSetTimer(opt)}
                      className={`w-full text-left px-2 py-1 rounded-lg text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                        activeTimer === opt
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>{opt === 0 ? 'Off (Keep)' : formatTimerLabel(opt)}</span>
                      {activeTimer === opt && <span className="text-[10px]">Active</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Tab Selector */}
        <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900'
            }`}
          >
            Live Chat ({messages.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('phrases')}
            className={`flex-1 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'phrases'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900'
            }`}
          >
            Quick Phrases & Emojis
          </button>
        </div>

        {/* Content Area */}
        {activeTab === 'chat' ? (
          <div className="flex-1 p-3 overflow-y-auto space-y-3">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-4 space-y-2">
                <MessageSquare className="w-8 h-8 text-amber-500/30" />
                <p className="text-xs">No chat messages yet in this arena match.</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.senderId === currentUser.id;
                const timeRemaining = getTimeRemaining(msg.expiresAt);

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} group relative`}
                  >
                    <div className="flex items-end gap-1.5 max-w-[85%]">
                      <div className="relative group">
                        {/* Sender name if not mine */}
                        {!isMine && (
                          <div className="text-[10px] text-amber-400/90 font-bold mb-0.5 ml-1">
                            {msg.senderName}
                          </div>
                        )}

                        <div
                          className={`p-2.5 rounded-2xl text-xs shadow-md ${
                            msg.isDeleted
                              ? 'bg-slate-900/80 border border-slate-800 text-slate-500 italic'
                              : isMine
                              ? 'bg-gradient-to-tr from-amber-600 to-amber-500 text-slate-950 font-medium rounded-br-none'
                              : 'bg-slate-850 bg-slate-900 text-slate-100 border border-slate-800 rounded-bl-none'
                          }`}
                        >
                          {/* Image */}
                          {msg.imageUrl && !msg.isDeleted && (
                            <div className="mb-1.5 rounded-lg overflow-hidden cursor-pointer">
                              <img
                                src={msg.imageUrl}
                                alt="Shared arena file"
                                onClick={() =>
                                  setViewingImage({
                                    url: msg.imageUrl!,
                                    caption: msg.text,
                                    sender: msg.senderName,
                                  })
                                }
                                className="max-h-36 w-auto rounded-lg object-cover hover:brightness-110 transition-all border border-black/20"
                              />
                            </div>
                          )}

                          {/* Text */}
                          {msg.text && (
                            <p className="whitespace-pre-wrap break-words leading-relaxed">
                              {msg.text}
                            </p>
                          )}

                          {/* Footer */}
                          <div
                            className={`flex items-center justify-end gap-1.5 mt-0.5 text-[8px] ${
                              isMine ? 'text-slate-950/70 font-bold' : 'text-slate-400'
                            }`}
                          >
                            {timeRemaining && !msg.isDeleted && (
                              <span className="flex items-center gap-0.5 text-amber-900 bg-amber-300/60 px-1 rounded font-mono">
                                <Clock className="w-2 h-2" />
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
                              isMine ? '-left-6' : '-right-6'
                            } opacity-0 group-hover:opacity-100 transition-opacity`}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setActiveDeleteMenuMsgId(
                                  activeDeleteMenuMsgId === msg.id ? null : msg.id
                                )
                              }
                              className="p-1 rounded-full bg-slate-900 border border-slate-700 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
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
                            } w-32 bg-slate-950 border border-amber-500/40 rounded-xl p-1 shadow-2xl space-y-0.5`}
                          >
                            {isMine && (
                              <button
                                type="button"
                                onClick={() => handleDeleteMessage(msg.id, 'for_everyone')}
                                className="w-full text-left px-2 py-1 rounded text-[10px] text-rose-400 hover:bg-rose-950/50 cursor-pointer font-semibold"
                              >
                                Delete for all
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(msg.id, 'for_me')}
                              className="w-full text-left px-2 py-1 rounded text-[10px] text-slate-300 hover:bg-slate-800 cursor-pointer"
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
        ) : (
          /* Quick Phrases and Emojis Panel */
          <div className="flex-1 p-3 overflow-y-auto space-y-4">
            {/* Emojis Grid */}
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                Emoji Reactions
              </h4>
              <div className="grid grid-cols-6 gap-2">
                {PRESET_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleSelectEmoji(emoji)}
                    className="text-2xl p-2 rounded-xl bg-slate-900 hover:bg-amber-950/60 hover:scale-115 border border-slate-800 hover:border-amber-400/40 transition-all cursor-pointer flex items-center justify-center"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Phrases */}
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                Arena Phrases
              </h4>
              <div className="grid grid-cols-1 gap-1.5">
                {PRESET_PHRASES.map((phrase) => (
                  <button
                    key={phrase}
                    type="button"
                    onClick={() => handleSelectPhrase(phrase)}
                    className="text-left px-3 py-2 rounded-xl bg-slate-900 hover:bg-amber-950/60 hover:text-amber-200 border border-slate-800 hover:border-amber-400/40 text-xs font-semibold text-slate-200 transition-all cursor-pointer truncate"
                  >
                    {phrase}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Pending Image Attachment Preview */}
        {pendingImage && (
          <div className="px-3 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <img
                src={pendingImage}
                alt="Preview"
                className="w-12 h-12 object-cover rounded-lg border border-amber-400/50"
              />
              <span className="text-[11px] text-amber-300 font-semibold">Image attachment ready</span>
            </div>
            <button
              type="button"
              onClick={() => setPendingImage(null)}
              className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-rose-400 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Bottom Input Area */}
        <form
          onSubmit={handleSendMessage}
          className="p-3 bg-slate-900 border-t border-amber-500/20 flex items-center gap-2 flex-shrink-0"
        >
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageSelected}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 transition-all cursor-pointer"
            title="Share Image"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          <input
            type="text"
            placeholder={pendingImage ? 'Add caption...' : 'Type in match chat...'}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-200 placeholder-slate-500 outline-none focus:border-amber-400"
          />

          <button
            type="submit"
            disabled={!inputText.trim() && !pendingImage}
            className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
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
