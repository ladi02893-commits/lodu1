import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Crown,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  MessageSquare,
  MoreVertical,
  Plus,
  Search,
  Send,
  Shield,
  Smile,
  Sparkles,
  Swords,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import { sound } from '../../lib/audio';
import { authService } from '../../services/authService';
import { ChatMessage, ChatTimerOption, chatService } from '../../services/chatService';
import { FriendEntry, friendsService } from '../../services/friendsService';
import { UserProfile } from '../../types/database';
import { ImageViewerModal } from './ImageViewerModal';

interface LobbyMessengerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'global' | 'dms' | 'friends';
  initialFriendId?: string;
  onChallengeFriend?: (friend: FriendEntry) => void;
  onInviteToRoom?: (friend: FriendEntry) => void;
}

const PRESET_EMOJIS = ['👑', '⚔️', '🎲', '🛡️', '🔥', '👏', '😂', '😎', '🎉', '🏆', '💯', '✨', '👋', '💀', '🚀'];

const PRESET_PHRASES = [
  'Who wants a 1v1 Duel? ⚔️',
  'Join my Private Room! 🏰',
  'Good luck everyone! 👑',
  'Looking for 2v2 partner! 🛡️',
  'Royal Ludo Champion here! 🏆',
  'Need players for high stakes! 💰',
];

export const LobbyMessengerModal: React.FC<LobbyMessengerModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'global',
  initialFriendId,
  onChallengeFriend,
  onInviteToRoom,
}) => {
  const currentUser = authService.getCurrentUser();
  const globalConvId = chatService.getGlobalConversationId();

  const [activeTab, setActiveTab] = useState<'global' | 'dms' | 'friends'>(defaultTab);
  const [selectedFriend, setSelectedFriend] = useState<FriendEntry | null>(null);

  // Global Chat state
  const [globalMessages, setGlobalMessages] = useState<ChatMessage[]>(() =>
    chatService.getMessages(globalConvId, currentUser.id)
  );
  const [globalInput, setGlobalInput] = useState('');
  const [globalTimer, setGlobalTimer] = useState<ChatTimerOption>(() =>
    chatService.getConversationTimer(globalConvId)
  );

  // DM Chat state
  const [dmConversationId, setDmConversationId] = useState<string>('');
  const [dmMessages, setDmMessages] = useState<ChatMessage[]>([]);
  const [dmInput, setDmInput] = useState('');
  const [dmTimer, setDmTimer] = useState<ChatTimerOption>(0);

  // Friends & Search state
  const [friendsList, setFriendsList] = useState<FriendEntry[]>(() => friendsService.getFriends());
  const [searchFriendInput, setSearchFriendInput] = useState('');
  const [friendSearchFeedback, setFriendSearchFeedback] = useState<string | null>(null);

  // Modals & Popovers
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<{ url: string; caption?: string; sender?: string } | null>(null);
  const [activeDeleteMenuMsgId, setActiveDeleteMenuMsgId] = useState<string | null>(null);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [userProfilePopover, setUserProfilePopover] = useState<{
    id: string;
    username: string;
    avatar?: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial friend selection
  useEffect(() => {
    if (initialFriendId) {
      const found = friendsList.find((f) => f.id === initialFriendId);
      if (found) {
        setSelectedFriend(found);
        setActiveTab('dms');
      }
    }
  }, [initialFriendId, friendsList]);

  // Subscribe to Global Realm Chat
  useEffect(() => {
    const unsub = chatService.subscribe(globalConvId, (msgs) => {
      setGlobalMessages(msgs);
    });
    return () => unsub();
  }, [globalConvId]);

  // Subscribe to Selected DM Chat
  useEffect(() => {
    if (!selectedFriend) return;
    const convId = chatService.getConversationId(selectedFriend.id);
    setDmConversationId(convId);
    setDmTimer(chatService.getConversationTimer(convId));

    const unsub = chatService.subscribe(convId, (msgs) => {
      setDmMessages(msgs);
    });
    return () => unsub();
  }, [selectedFriend]);

  // Subscribe to Friends updates
  useEffect(() => {
    const unsub = friendsService.subscribe((list) => {
      setFriendsList(list);
    });
    return () => unsub();
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [globalMessages, dmMessages, activeTab, selectedFriend, pendingImage]);

  if (!isOpen) return null;

  const handleSendGlobalMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (pendingImage) {
      chatService.sendImageMessage(globalConvId, pendingImage, globalInput);
      setPendingImage(null);
      setGlobalInput('');
      sound.playClick();
      return;
    }

    if (!globalInput.trim()) return;

    chatService.sendMessage(globalConvId, globalInput);
    setGlobalInput('');
    sound.playClick();
  };

  const handleSendDmMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedFriend || !dmConversationId) return;

    if (pendingImage) {
      chatService.sendImageMessage(dmConversationId, pendingImage, dmInput);
      setPendingImage(null);
      setDmInput('');
      sound.playClick();
      return;
    }

    if (!dmInput.trim()) return;

    chatService.sendMessage(dmConversationId, dmInput);
    setDmInput('');
    sound.playClick();
  };

  const handleSelectEmoji = (emoji: string) => {
    sound.playClick();
    if (activeTab === 'global') {
      setGlobalInput((prev) => prev + emoji);
    } else if (activeTab === 'dms') {
      setDmInput((prev) => prev + emoji);
    }
  };

  const handleSelectPhrase = (phrase: string) => {
    sound.playClick();
    if (activeTab === 'global') {
      chatService.sendMessage(globalConvId, phrase);
    } else if (activeTab === 'dms' && dmConversationId) {
      chatService.sendMessage(dmConversationId, phrase);
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
    const convId = activeTab === 'global' ? globalConvId : dmConversationId;
    if (!convId) return;

    chatService.setConversationTimer(convId, opt);
    if (activeTab === 'global') {
      setGlobalTimer(opt);
    } else {
      setDmTimer(opt);
    }
    setShowTimerMenu(false);
  };

  const handleDeleteMessage = (convId: string, messageId: string, type: 'everyone' | 'me') => {
    sound.playClick();
    chatService.deleteMessage(convId, messageId, type);
    setActiveDeleteMenuMsgId(null);
  };

  const handleAddFriend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchFriendInput.trim()) return;

    sound.playClick();
    const res = friendsService.sendFriendRequest(searchFriendInput.trim());
    setFriendSearchFeedback(res.message);
    if (res.success) {
      setSearchFriendInput('');
    }
    setTimeout(() => setFriendSearchFeedback(null), 3500);
  };

  const handleFollowFromPopover = (targetId: string, targetName: string) => {
    sound.playClick();
    const status = friendsService.getFriendshipStatus(targetId);
    if (status === 'pending_received') {
      friendsService.followBackPlayer(targetId);
    } else {
      friendsService.followPlayer({ id: targetId, username: targetName, display_name: targetName });
    }
    setUserProfilePopover(null);
  };

  const formatTimerLabel = (opt: ChatTimerOption) => {
    if (opt === 0) return 'Off';
    if (opt === 10) return '10s';
    if (opt === 60) return '1m';
    if (opt === 3600) return '1h';
    return `${opt}s`;
  };

  const activeFriends = friendsList.filter((f) => f.status === 'friend');
  const pendingRequests = friendsList.filter((f) => f.status === 'pending_received');

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-xl animate-fade-in select-none">
        <div className="w-full max-w-4xl h-[92vh] max-h-[780px] bg-slate-900/95 border-2 border-amber-500/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
          {/* Header Bar */}
          <header className="px-4 py-3 bg-slate-950/90 border-b border-amber-500/20 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 p-0.5 shadow">
                <div className="w-full h-full rounded-2xl bg-slate-950 flex items-center justify-center text-amber-300">
                  <MessageCircle className="w-5 h-5 fill-amber-400/20 text-amber-400" />
                </div>
              </div>
              <div>
                <h2 className="font-royal font-black text-sm sm:text-base text-slate-100 flex items-center gap-2">
                  <span>Imperial Realm Messenger</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 uppercase tracking-wider">
                    Lobby & DMs
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400">
                  Chat with companions, realm players & send battle challenges
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Disappearing Timer Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTimerMenu(!showTimerMenu)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    (activeTab === 'global' ? globalTimer : dmTimer) > 0
                      ? 'bg-amber-950 border-amber-400 text-amber-300 shadow'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                  title="Auto-Delete Disappearing Timer"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Auto-Delete: {formatTimerLabel(activeTab === 'global' ? globalTimer : dmTimer)}
                  </span>
                </button>

                {showTimerMenu && (
                  <div className="absolute right-0 top-10 w-44 rounded-2xl bg-slate-950 border border-amber-500/40 p-2 shadow-2xl z-50 space-y-1">
                    <div className="text-[9px] font-bold text-amber-400 uppercase tracking-wider px-2 py-0.5">
                      Disappearing Timer
                    </div>
                    {([0, 10, 60, 3600] as ChatTimerOption[]).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleSetTimer(opt)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                          (activeTab === 'global' ? globalTimer : dmTimer) === opt
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span>{opt === 0 ? 'Off (Permanent)' : formatTimerLabel(opt)}</span>
                        {(activeTab === 'global' ? globalTimer : dmTimer) === opt && (
                          <span className="text-[10px]">Active</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Close Modal Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Navigation Tabs */}
          <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800 flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setActiveTab('global');
              }}
              className={`flex-1 py-2 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'global'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-lg font-black'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>🌍 Realm Global Chat</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setActiveTab('dms');
              }}
              className={`flex-1 py-2 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'dms'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-lg font-black'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>💬 Direct Messages (DMs)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setActiveTab('friends');
              }}
              className={`flex-1 py-2 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 relative ${
                activeTab === 'friends'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-lg font-black'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800'
              }`}
            >
              <Crown className="w-4 h-4" />
              <span>👥 Companions & Discover</span>
              {pendingRequests.length > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-500 text-white font-black text-[9px] rounded-full shadow animate-pulse">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          </div>

          {/* Main Body Area */}
          <div className="flex-1 flex min-h-0">
            {/* TAB 1: GLOBAL REALM LOBBY CHAT */}
            {activeTab === 'global' && (
              <div className="flex-1 flex flex-col min-h-0 bg-slate-950/40">
                {/* Global Messages Feed */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {globalMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-2 py-12">
                      <MessageCircle className="w-12 h-12 text-amber-500/30 animate-pulse" />
                      <h4 className="font-royal font-bold text-sm text-slate-300">
                        Welcome to Royal Realm Global Chat!
                      </h4>
                      <p className="text-xs max-w-sm text-slate-400">
                        Talk with all online monarchs, share private room codes, challenge opponents, or make new noble friends.
                      </p>
                    </div>
                  ) : (
                    globalMessages.map((msg) => {
                      const isMine = msg.senderId === currentUser.id;
                      const friendshipStatus = !isMine ? friendsService.getFriendshipStatus(msg.senderId) : 'none';

                      return (
                        <div
                          key={msg.id}
                          className={`flex gap-3 ${isMine ? 'flex-row-reverse' : 'flex-row'} group relative`}
                        >
                          {/* Sender Avatar */}
                          <button
                            type="button"
                            onClick={() =>
                              !isMine &&
                              setUserProfilePopover({
                                id: msg.senderId,
                                username: msg.senderName,
                                avatar: msg.senderAvatar,
                              })
                            }
                            className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-500 p-0.5 flex-shrink-0 cursor-pointer shadow hover:scale-105 transition-transform"
                            title={isMine ? 'You' : `View ${msg.senderName}'s Profile`}
                          >
                            <div className="w-full h-full rounded-2xl bg-slate-950 flex items-center justify-center font-royal font-black text-amber-300 text-xs">
                              {msg.senderName.charAt(0).toUpperCase()}
                            </div>
                          </button>

                          {/* Message Bubble Container */}
                          <div className={`max-w-[75%] space-y-1 ${isMine ? 'items-end' : 'items-start'}`}>
                            {!isMine && (
                              <div className="flex items-center gap-2 px-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setUserProfilePopover({
                                      id: msg.senderId,
                                      username: msg.senderName,
                                    })
                                  }
                                  className="text-xs font-bold text-amber-300 hover:underline cursor-pointer"
                                >
                                  {msg.senderName}
                                </button>

                                {friendshipStatus === 'friend' ? (
                                  <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-0.5">
                                    <UserCheck className="w-2.5 h-2.5" />
                                    <span>Friend</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleFollowFromPopover(msg.senderId, msg.senderName)}
                                    className="px-1.5 py-0.2 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-[9px] font-bold cursor-pointer flex items-center gap-0.5 transition-colors"
                                  >
                                    <UserPlus className="w-2.5 h-2.5" />
                                    <span>Follow</span>
                                  </button>
                                )}
                              </div>
                            )}

                            <div
                              className={`p-3 rounded-2xl text-xs sm:text-sm shadow-md ${
                                isMine
                                  ? 'bg-gradient-to-tr from-amber-600 to-amber-500 text-slate-950 font-medium rounded-tr-none'
                                  : 'bg-slate-900 text-slate-100 border border-slate-800 rounded-tl-none'
                              }`}
                            >
                              {/* Image */}
                              {msg.imageUrl && (
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
                                    className="max-h-48 w-auto rounded-xl object-cover hover:brightness-110 transition-all border border-black/20"
                                  />
                                </div>
                              )}

                              {/* Text */}
                              {msg.text && (
                                <p className="whitespace-pre-wrap break-words leading-relaxed font-sans">
                                  {msg.text}
                                </p>
                              )}

                              {/* Time */}
                              <div
                                className={`text-[9px] mt-1 text-right ${
                                  isMine ? 'text-slate-950/70 font-bold' : 'text-slate-400'
                                }`}
                              >
                                {new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Phrases Bar */}
                <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto scrollbar-none flex-shrink-0">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider whitespace-nowrap">
                    Quick Phrases:
                  </span>
                  {PRESET_PHRASES.map((phrase) => (
                    <button
                      key={phrase}
                      type="button"
                      onClick={() => handleSelectPhrase(phrase)}
                      className="px-2.5 py-1 rounded-full bg-slate-900 hover:bg-amber-950/70 border border-slate-800 hover:border-amber-500/40 text-xs font-semibold text-slate-300 hover:text-amber-200 transition-all cursor-pointer whitespace-nowrap shadow"
                    >
                      {phrase}
                    </button>
                  ))}
                </div>

                {/* Pending Image Attachment */}
                {pendingImage && (
                  <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={pendingImage}
                        alt="Preview"
                        className="w-12 h-12 object-cover rounded-lg border border-amber-400/50"
                      />
                      <span className="text-xs text-amber-300 font-semibold">Image ready to dispatch</span>
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

                {/* Global Input Bar */}
                <form
                  onSubmit={handleSendGlobalMessage}
                  className="p-3 sm:p-4 bg-slate-950 border-t border-amber-500/20 flex items-center gap-2 flex-shrink-0"
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
                    className="p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-300 transition-all cursor-pointer border border-slate-800"
                    title="Attach Picture"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>

                  {/* Emojis Shortcut Bar */}
                  <div className="hidden sm:flex items-center gap-1 px-1">
                    {PRESET_EMOJIS.slice(0, 6).map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleSelectEmoji(emoji)}
                        className="text-lg p-1 hover:scale-125 transition-transform cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    placeholder={pendingImage ? 'Add caption for image...' : 'Dispatch message to Realm Global Chat...'}
                    value={globalInput}
                    onChange={(e) => setGlobalInput(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-amber-200 placeholder-slate-500 outline-none focus:border-amber-400"
                  />

                  <button
                    type="submit"
                    disabled={!globalInput.trim() && !pendingImage}
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-slate-950 font-royal font-black text-xs sm:text-sm transition-all shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: DIRECT MESSAGES (DMs) */}
            {activeTab === 'dms' && (
              <div className="flex-1 flex min-h-0">
                {/* Left Sidebar: DM Friends & Threads */}
                <div className="w-full sm:w-72 bg-slate-950/80 border-r border-slate-800 flex flex-col min-h-0">
                  <div className="p-3 border-b border-slate-800">
                    <h4 className="text-[11px] font-bold text-amber-400 uppercase tracking-wider px-1">
                      Direct Conversations ({activeFriends.length})
                    </h4>
                  </div>

                  <div className="flex-1 p-2 overflow-y-auto space-y-1">
                    {activeFriends.length === 0 ? (
                      <div className="text-center p-6 text-slate-500 text-xs space-y-2">
                        <Users className="w-8 h-8 mx-auto text-slate-600" />
                        <p>No companions yet.</p>
                        <button
                          type="button"
                          onClick={() => setActiveTab('friends')}
                          className="text-amber-400 font-bold hover:underline cursor-pointer"
                        >
                          Find & Add Friends
                        </button>
                      </div>
                    ) : (
                      activeFriends.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            setSelectedFriend(f);
                          }}
                          className={`w-full p-2.5 rounded-2xl flex items-center gap-2.5 transition-all text-left cursor-pointer ${
                            selectedFriend?.id === f.id
                              ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                              : 'hover:bg-slate-900 text-slate-200 border border-transparent hover:border-slate-800'
                          }`}
                        >
                          <div className="relative w-9 h-9 rounded-xl bg-slate-900 border border-amber-500/40 p-0.5 flex-shrink-0 flex items-center justify-center font-royal font-black text-amber-300 text-xs">
                            {f.display_name.charAt(0).toUpperCase()}
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-slate-950 ${
                                f.is_online ? 'bg-emerald-400' : 'bg-slate-600'
                              }`}
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-xs truncate">
                              {f.display_name}
                            </div>
                            <div className={`text-[10px] truncate ${selectedFriend?.id === f.id ? 'text-slate-950/80 font-medium' : 'text-slate-400'}`}>
                              {f.is_online ? 'Online now' : 'Imperial Companion'}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Right Area: Selected DM Chat */}
                <div className="hidden sm:flex flex-1 flex-col min-h-0 bg-slate-950/40">
                  {selectedFriend ? (
                    <>
                      {/* DM Header */}
                      <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-500 p-0.5 flex items-center justify-center font-royal font-black text-slate-950 text-xs">
                            {selectedFriend.display_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-slate-100">
                              {selectedFriend.display_name}
                            </div>
                            <div className="text-[10px] text-emerald-400 font-medium">
                              {selectedFriend.is_online ? '● Online' : 'Noble Companion'}
                            </div>
                          </div>
                        </div>

                        {/* Actions: Challenge / Room Invite */}
                        <div className="flex items-center gap-2">
                          {onChallengeFriend && (
                            <button
                              type="button"
                              onClick={() => {
                                sound.playClick();
                                onChallengeFriend(selectedFriend);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 text-white font-bold text-xs shadow flex items-center gap-1 hover:brightness-110 cursor-pointer"
                            >
                              <Swords className="w-3.5 h-3.5" />
                              <span>Challenge 1v1</span>
                            </button>
                          )}
                          {onInviteToRoom && (
                            <button
                              type="button"
                              onClick={() => {
                                sound.playClick();
                                onInviteToRoom(selectedFriend);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow flex items-center gap-1 cursor-pointer"
                            >
                              <Crown className="w-3.5 h-3.5" />
                              <span>Invite to Room</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* DM Messages Feed */}
                      <div className="flex-1 p-4 overflow-y-auto space-y-3">
                        {dmMessages.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-2 py-12">
                            <MessageSquare className="w-10 h-10 text-amber-500/30" />
                            <h4 className="font-royal font-bold text-sm text-slate-300">
                              Direct Message with {selectedFriend.display_name}
                            </h4>
                            <p className="text-xs max-w-sm text-slate-400">
                              Send encrypted messages, challenge to matches, or share game attachments.
                            </p>
                          </div>
                        ) : (
                          dmMessages.map((msg) => {
                            const isMine = msg.senderId === currentUser.id;

                            return (
                              <div
                                key={msg.id}
                                className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} group relative`}
                              >
                                <div className="max-w-[75%]">
                                  <div
                                    className={`p-3 rounded-2xl text-xs sm:text-sm shadow-md ${
                                      isMine
                                        ? 'bg-gradient-to-tr from-amber-600 to-amber-500 text-slate-950 font-medium rounded-tr-none'
                                        : 'bg-slate-900 text-slate-100 border border-slate-800 rounded-tl-none'
                                    }`}
                                  >
                                    {msg.imageUrl && (
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
                                          className="max-h-48 w-auto rounded-xl object-cover hover:brightness-110 transition-all border border-black/20"
                                        />
                                      </div>
                                    )}

                                    {msg.text && (
                                      <p className="whitespace-pre-wrap break-words leading-relaxed font-sans">
                                        {msg.text}
                                      </p>
                                    )}

                                    <div
                                      className={`text-[9px] mt-1 text-right ${
                                        isMine ? 'text-slate-950/70 font-bold' : 'text-slate-400'
                                      }`}
                                    >
                                      {new Date(msg.createdAt).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* DM Input Bar */}
                      <form
                        onSubmit={handleSendDmMessage}
                        className="p-3 sm:p-4 bg-slate-950 border-t border-amber-500/20 flex items-center gap-2 flex-shrink-0"
                      >
                        <input
                          type="text"
                          placeholder={`Message ${selectedFriend.display_name}...`}
                          value={dmInput}
                          onChange={(e) => setDmInput(e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-amber-200 placeholder-slate-500 outline-none focus:border-amber-400"
                        />

                        <button
                          type="submit"
                          disabled={!dmInput.trim()}
                          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-slate-950 font-royal font-black text-xs sm:text-sm transition-all shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                        >
                          <Send className="w-4 h-4" />
                          <span>Send</span>
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-2">
                      <MessageSquare className="w-12 h-12 text-slate-700" />
                      <h4 className="font-royal font-bold text-sm text-slate-300">
                        Select a Companion to Start Direct Chat
                      </h4>
                      <p className="text-xs text-slate-500 max-w-xs">
                        Pick a friend from the left sidebar or add new friends in the Companions tab.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: NOBLE COMPANIONS & DISCOVER */}
            {activeTab === 'friends' && (
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 bg-slate-950/40">
                {/* Search / Add Friend Form */}
                <form
                  onSubmit={handleAddFriend}
                  className="p-5 rounded-3xl bg-slate-900 border border-amber-500/30 space-y-3 shadow-xl"
                >
                  <h3 className="font-royal font-bold text-sm text-amber-300 flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-amber-400" />
                    <span>Invite New Companion</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Enter username or Player ID (e.g. RL-7721)..."
                      value={searchFriendInput}
                      onChange={(e) => setSearchFriendInput(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-amber-200 placeholder-slate-500 outline-none focus:border-amber-400"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-royal font-black text-xs sm:text-sm shadow hover:brightness-110 cursor-pointer transition-all"
                    >
                      Invite
                    </button>
                  </div>
                  {friendSearchFeedback && (
                    <div className="text-xs font-bold text-amber-300 px-2 py-1">
                      {friendSearchFeedback}
                    </div>
                  )}
                </form>

                {/* Companions Roster */}
                <div className="space-y-3">
                  <h4 className="text-xs font-royal font-bold text-slate-300 uppercase tracking-wider px-1">
                    Your Companions ({activeFriends.length})
                  </h4>

                  {activeFriends.length === 0 ? (
                    <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-xs">
                      No companions added yet. Share your player ID with friends to chat and play!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activeFriends.map((f) => (
                        <div
                          key={f.id}
                          className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 shadow hover:border-amber-500/30 transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-500 p-0.5 flex-shrink-0">
                              <div className="w-full h-full rounded-2xl bg-slate-950 flex items-center justify-center font-royal font-black text-amber-300 text-sm">
                                {f.display_name.charAt(0).toUpperCase()}
                              </div>
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs sm:text-sm text-slate-100 truncate">
                                {f.display_name}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                ID: {f.id.substring(0, 10)}
                              </div>
                            </div>
                          </div>

                          {/* 1-Tap Message / Challenge */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                sound.playClick();
                                setSelectedFriend(f);
                                setActiveTab('dms');
                              }}
                              className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all cursor-pointer shadow"
                              title="Direct Message"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                            {onChallengeFriend && (
                              <button
                                type="button"
                                onClick={() => {
                                  sound.playClick();
                                  onChallengeFriend(f);
                                }}
                                className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all cursor-pointer shadow"
                                title="Challenge 1v1 Duel"
                              >
                                <Swords className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Popover Profile Modal */}
      {userProfilePopover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-xs bg-slate-900 border-2 border-amber-500/60 rounded-3xl p-5 shadow-2xl space-y-4 text-center relative">
            <button
              onClick={() => setUserProfilePopover(null)}
              className="absolute top-3 right-3 p-1 rounded-full bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-400 p-0.5 mx-auto shadow-lg">
              <div className="w-full h-full rounded-2xl bg-slate-950 flex items-center justify-center font-royal font-black text-amber-300 text-xl">
                {userProfilePopover.username.charAt(0).toUpperCase()}
              </div>
            </div>

            <div>
              <h3 className="font-royal font-bold text-base text-slate-100">
                {userProfilePopover.username}
              </h3>
              <p className="text-xs text-amber-400 font-medium">Royal Monarch</p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  const found = friendsList.find((f) => f.id === userProfilePopover.id);
                  if (found) {
                    setSelectedFriend(found);
                  } else {
                    setSelectedFriend({
                      id: userProfilePopover.id,
                      username: userProfilePopover.username,
                      display_name: userProfilePopover.username,
                      status: 'friend',
                    });
                  }
                  setActiveTab('dms');
                  setUserProfilePopover(null);
                }}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Direct Message</span>
              </button>

              <button
                type="button"
                onClick={() => handleFollowFromPopover(userProfilePopover.id, userProfilePopover.username)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Follow Player</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
