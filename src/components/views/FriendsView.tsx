import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Check,
  Crown,
  MessageSquare,
  MoreVertical,
  Send,
  ShieldAlert,
  Trash2,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react';
import { sound } from '../../lib/audio';
import { FriendEntry, friendsService } from '../../services/friendsService';
import { chatService } from '../../services/chatService';
import { authService } from '../../services/authService';
import { DirectChatModal } from '../chat/DirectChatModal';

interface FriendsViewProps {
  onBack: () => void;
  onInviteToRoom?: (friend: FriendEntry) => void;
}

export const FriendsView: React.FC<FriendsViewProps> = ({ onBack, onInviteToRoom }) => {
  const [friends, setFriends] = useState<FriendEntry[]>(friendsService.getFriends());
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'blocked'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ msg: string; success: boolean } | null>(null);
  const [activeChatFriend, setActiveChatFriend] = useState<FriendEntry | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    const unsub = friendsService.subscribe((list) => {
      setFriends(list);
    });
    return () => unsub();
  }, []);

  const handleSendRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    sound.playClick();
    const res = friendsService.sendFriendRequest(searchQuery.trim());
    setFeedback({ msg: res.message, success: res.success });
    if (res.success) {
      setSearchQuery('');
    }
  };

  const handleAccept = (id: string) => {
    sound.playClick();
    friendsService.acceptFriendRequest(id);
  };

  const handleUnfriend = (id: string, name: string) => {
    if (confirm(`Remove ${name} from your companions?`)) {
      sound.playClick();
      friendsService.unfriend(id);
      setOpenActionMenuId(null);
      if (activeChatFriend?.id === id) setActiveChatFriend(null);
    }
  };

  const handleBlock = (id: string, name: string) => {
    if (confirm(`Block ${name}? They will no longer be able to message or challenge you.`)) {
      sound.playClick();
      friendsService.blockUser(id);
      setOpenActionMenuId(null);
      if (activeChatFriend?.id === id) setActiveChatFriend(null);
    }
  };

  const handleUnblock = (id: string) => {
    sound.playClick();
    friendsService.unblockUser(id);
  };

  const activeFriends = friends.filter((f) => f.status === 'friend');
  const requestFriends = friends.filter((f) => f.status === 'pending_sent' || f.status === 'pending_received');
  const blockedFriends = friends.filter((f) => f.status === 'blocked');

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center pb-16 overflow-x-hidden">
      {/* Header */}
      <header className="w-full max-w-4xl px-4 py-4 flex items-center justify-between border-b border-amber-500/20 bg-slate-950/80 sticky top-0 z-20 backdrop-blur-md">
        <button
          onClick={() => {
            sound.playClick();
            onBack();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-300 transition-all cursor-pointer text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Court</span>
        </button>

        <h2 className="font-royal font-bold text-sm sm:text-base text-amber-300">
          Noble Companions & Guild
        </h2>

        <div className="w-16" />
      </header>

      <main className="w-full max-w-2xl px-4 py-6 space-y-6">
        {/* Add Friend Form */}
        <form
          onSubmit={handleSendRequest}
          className="p-5 rounded-3xl bg-slate-900/90 border border-amber-500/30 space-y-3 shadow-xl"
        >
          <h3 className="font-royal font-bold text-sm text-slate-200">
            Invite Royal Companion
          </h3>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Enter username or Player ID (e.g. RL-7721)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-amber-200 placeholder-slate-500 outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 font-bold text-slate-950 text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow whitespace-nowrap"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </div>

          {feedback && (
            <div
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl ${
                feedback.success
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
              }`}
            >
              {feedback.msg}
            </div>
          )}
        </form>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setActiveTab('friends');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'friends'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Companions ({activeFriends.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setActiveTab('requests');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'requests'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Requests ({requestFriends.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setActiveTab('blocked');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'blocked'
                ? 'bg-rose-600 text-white shadow'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserX className="w-3.5 h-3.5" />
            <span>Blocked ({blockedFriends.length})</span>
          </button>
        </div>

        {/* Tab 1: Active Friends (Companions) */}
        {activeTab === 'friends' && (
          <div className="space-y-2">
            {activeFriends.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 rounded-3xl border border-slate-800 text-slate-400 text-xs">
                No companions added yet. Enter a username or Player ID above to invite friends!
              </div>
            ) : (
              activeFriends.map((friend) => {
                const conversationId = chatService.getConversationId(friend.id);
                const timer = chatService.getConversationTimer(conversationId);

                return (
                  <div
                    key={friend.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/30 flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-full bg-slate-950 border border-amber-400/40 flex items-center justify-center">
                        <Crown className="w-5 h-5 text-amber-300" />
                        {friend.is_online && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-slate-100">
                            {friend.display_name}
                          </span>
                          <span className="text-[10px] text-amber-400/80 font-mono">
                            #{friend.player_id}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Lv.{friend.level} &bull; {friend.wins} Wins
                          {timer > 0 && (
                            <span className="ml-2 text-[10px] text-amber-400/80 font-medium">
                              ⏱️ Timer Active
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions: Chat, Challenge & More Menu */}
                    <div className="flex items-center gap-2 relative">
                      {/* 1-on-1 Direct Chat Button */}
                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setActiveChatFriend(friend);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow"
                        title="Open Direct Messages"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                        <span className="hidden sm:inline">Chat</span>
                      </button>

                      {/* Challenge Button */}
                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          if (onInviteToRoom) onInviteToRoom(friend);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow"
                      >
                        Challenge
                      </button>

                      {/* Dropdown Options */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenActionMenuId(openActionMenuId === friend.id ? null : friend.id)
                          }
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openActionMenuId === friend.id && (
                          <div className="absolute right-0 top-9 w-36 rounded-2xl bg-slate-950 border border-amber-500/40 p-1.5 shadow-2xl z-30 space-y-1">
                            <button
                              type="button"
                              onClick={() => handleBlock(friend.id, friend.display_name)}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-950/50 flex items-center gap-2 cursor-pointer font-medium"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span>Block User</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUnfriend(friend.id, friend.display_name)}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Unfriend</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Requests (Sent & Received) */}
        {activeTab === 'requests' && (
          <div className="space-y-2">
            {requestFriends.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 rounded-3xl border border-slate-800 text-slate-400 text-xs">
                No pending companion requests.
              </div>
            ) : (
              requestFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-950 border border-amber-400/40 flex items-center justify-center">
                      <Crown className="w-5 h-5 text-amber-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-slate-100">
                          {friend.display_name}
                        </span>
                        <span className="text-[10px] text-amber-400/80 font-mono">
                          #{friend.player_id}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {friend.status === 'pending_sent' ? 'Request Sent' : 'Request Received'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {friend.status === 'pending_received' ? (
                      <button
                        onClick={() => handleAccept(friend.id)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition-all flex items-center gap-1 cursor-pointer shadow"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-amber-400/80 font-medium px-2 py-1 bg-amber-950/40 rounded-lg border border-amber-500/20">
                        Pending
                      </span>
                    )}

                    <button
                      onClick={() => handleUnfriend(friend.id, friend.display_name)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 cursor-pointer"
                      title="Cancel Request"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Blocked Users */}
        {activeTab === 'blocked' && (
          <div className="space-y-2">
            {blockedFriends.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 rounded-3xl border border-slate-800 text-slate-400 text-xs">
                No blocked users. You can block any player from their companion card or direct chat.
              </div>
            ) : (
              blockedFriends.map((blockedUser) => (
                <div
                  key={blockedUser.id}
                  className="p-3.5 sm:p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-950 border border-rose-500/40 flex items-center justify-center">
                      <ShieldAlert className="w-5 h-5 text-rose-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-slate-200">
                          {blockedUser.display_name}
                        </span>
                        <span className="text-[10px] text-rose-400/80 font-mono">
                          #{blockedUser.player_id}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Blocked from chat & invites
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleUnblock(blockedUser.id)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow"
                  >
                    Unblock
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* 1-on-1 Direct Chat Modal */}
      {activeChatFriend && (
        <DirectChatModal
          friend={activeChatFriend}
          onClose={() => setActiveChatFriend(null)}
          onChallenge={() => {
            if (onInviteToRoom) onInviteToRoom(activeChatFriend);
            setActiveChatFriend(null);
          }}
        />
      )}
    </div>
  );
};

