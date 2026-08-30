import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Check,
  Compass,
  Crown,
  Heart,
  MessageSquare,
  MoreVertical,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  Swords,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  UserX,
  X,
} from 'lucide-react';
import { sound } from '../../lib/audio';
import { FriendEntry, friendsService, SocialUserCard } from '../../services/friendsService';
import { chatService } from '../../services/chatService';
import { authService } from '../../services/authService';
import { DirectChatModal } from '../chat/DirectChatModal';

interface FriendsViewProps {
  onBack: () => void;
  onInviteToRoom?: (friend: FriendEntry) => void;
}

export type FriendsTab = 'companions' | 'followers' | 'following' | 'discover' | 'blocked';

export const FriendsView: React.FC<FriendsViewProps> = ({ onBack, onInviteToRoom }) => {
  const [friends, setFriends] = useState<FriendEntry[]>(() => friendsService.getFriends());
  const [activeTab, setActiveTab] = useState<FriendsTab>('companions');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ msg: string; success: boolean } | null>(null);
  const [activeChatFriend, setActiveChatFriend] = useState<FriendEntry | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [discoverResults, setDiscoverResults] = useState<SocialUserCard[]>(() =>
    friendsService.getSuggestedNobles()
  );

  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    const unsub = friendsService.subscribe((list) => {
      setFriends(list);
      setDiscoverResults(friendsService.searchAllNobles(searchQuery));
    });
    return () => unsub();
  }, [searchQuery]);

  const showToast = (msg: string, success: boolean = true) => {
    setFeedback({ msg, success });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    sound.playClick();
    const res = friendsService.sendFriendRequest(searchQuery.trim());
    showToast(res.message, res.success);
    if (res.success) {
      setSearchQuery('');
    }
  };

  const handleFollowUser = (target: SocialUserCard | FriendEntry) => {
    sound.playClick();
    const res = friendsService.followPlayer({
      id: target.id,
      username: target.username,
      display_name: target.display_name,
      avatar_url: target.avatar_url,
      player_id: target.player_id,
      level: target.level,
      wins: target.wins,
      xp: target.xp,
    });
    showToast(res.message, res.success);
  };

  const handleAcceptAndFollowBack = (id: string, name: string) => {
    sound.playClick();
    const res = friendsService.followBackPlayer(id);
    showToast(res.message, res.success);
  };

  const handleDeclineRequest = (id: string, name: string) => {
    sound.playClick();
    const res = friendsService.declineRequest(id);
    showToast(res.message, res.success);
  };

  const handleUnfollow = (id: string, name: string) => {
    sound.playClick();
    const res = friendsService.unfollowPlayer(id);
    showToast(res.message, res.success);
    setOpenActionMenuId(null);
    if (activeChatFriend?.id === id) setActiveChatFriend(null);
  };

  const handleRemoveFollower = (id: string, name: string) => {
    sound.playClick();
    const res = friendsService.removeFollower(id);
    showToast(res.message, res.success);
    setOpenActionMenuId(null);
  };

  const handleBlock = (id: string, name: string) => {
    if (confirm(`Block ${name}? They will no longer be able to message or challenge you.`)) {
      sound.playClick();
      friendsService.blockUser(id);
      showToast(`Blocked ${name}.`, true);
      setOpenActionMenuId(null);
      if (activeChatFriend?.id === id) setActiveChatFriend(null);
    }
  };

  const handleUnblock = (id: string) => {
    sound.playClick();
    friendsService.unblockUser(id);
    showToast('Unblocked user.', true);
  };

  const companions = friends.filter((f) => f.status === 'friend');
  const following = friends.filter((f) => f.status === 'pending_sent');
  const followers = friends.filter((f) => f.status === 'pending_received');
  const blockedFriends = friends.filter((f) => f.status === 'blocked');

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center pb-20 overflow-x-hidden">
      {/* Header */}
      <header className="w-full max-w-4xl px-4 py-4 flex items-center justify-between border-b border-amber-500/20 bg-slate-950/90 sticky top-0 z-30 backdrop-blur-md">
        <button
          onClick={() => {
            sound.playClick();
            onBack();
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-300 transition-all cursor-pointer text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Court</span>
        </button>

        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h2 className="font-royal font-bold text-sm sm:text-base text-amber-300">
            Royal Companions & Follow Requests
          </h2>
        </div>

        <div className="w-16" />
      </header>

      {/* Floating Feedback Toast */}
      {feedback && (
        <div
          className={`fixed top-16 z-50 px-4 py-2.5 rounded-2xl text-xs font-bold shadow-2xl border flex items-center gap-2 animate-bounce transition-all ${
            feedback.success
              ? 'bg-gradient-to-r from-emerald-950 via-slate-900 to-amber-950 text-amber-300 border-amber-400'
              : 'bg-rose-950/90 text-rose-300 border-rose-500'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{feedback.msg}</span>
        </div>
      )}

      <main className="w-full max-w-2xl px-4 py-6 space-y-5">
        {/* Pending Follow Requests Callout Banner if user has incoming requests */}
        {followers.length > 0 && activeTab !== 'followers' && (
          <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-900/60 border-2 border-amber-400 shadow-2xl flex items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow">
                <Heart className="w-5 h-5 fill-slate-950" />
              </div>
              <div>
                <h4 className="font-royal font-bold text-xs sm:text-sm text-amber-200">
                  {followers.length} Pending Companion {followers.length > 1 ? 'Requests' : 'Request'}!
                </h4>
                <p className="text-[11px] text-slate-300">
                  {followers[0].display_name} {followers.length > 1 ? `and ${followers.length - 1} other` : ''} wants to connect with you.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                setActiveTab('followers');
              }}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-royal font-black text-xs cursor-pointer shadow hover:scale-105 transition-transform whitespace-nowrap"
            >
              View & Accept 🤝
            </button>
          </div>
        )}

        {/* Quick Search / Follow by Player ID or Username Form */}
        <form
          onSubmit={handleSearchSubmit}
          className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-slate-900/90 via-slate-900/95 to-amber-950/30 border border-amber-500/30 space-y-3 shadow-xl"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-royal font-bold text-xs sm:text-sm text-amber-200 flex items-center gap-1.5">
              <Search className="w-4 h-4 text-amber-400" />
              <span>Search & Follow Monarch</span>
            </h3>
            <span className="text-[10px] text-amber-400/80 font-mono">
              Your Seal: #{currentUser.player_id}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Enter username or Player ID (e.g. RL-7777, ammar_admin)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setDiscoverResults(friendsService.searchAllNobles(e.target.value));
              }}
              className="flex-1 bg-slate-950 border border-amber-500/40 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-amber-200 placeholder-slate-500 outline-none focus:ring-2 focus:ring-amber-400 transition-all font-medium"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 font-royal font-bold text-slate-950 text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </div>
        </form>

        {/* Tab Navigation Pill Bar */}
        <div className="flex items-center gap-1 sm:gap-2 p-1.5 bg-slate-900/80 border border-slate-800 rounded-2xl overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setActiveTab('companions');
            }}
            className={`flex-1 min-w-[105px] py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'companions'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Companions ({companions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setActiveTab('followers');
            }}
            className={`flex-1 min-w-[110px] py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 relative ${
              activeTab === 'followers'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Followers ({followers.length})</span>
            {followers.length > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 absolute top-1.5 right-1.5 animate-ping" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setActiveTab('following');
            }}
            className={`flex-1 min-w-[95px] py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'following'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Following ({following.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setActiveTab('discover');
            }}
            className={`flex-1 min-w-[85px] py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'discover'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Discover</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setActiveTab('blocked');
            }}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'blocked'
                ? 'bg-rose-600 text-white shadow font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Blocked Users"
          >
            <UserX className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* TAB 1: Mutual Companions (Friends) */}
        {activeTab === 'companions' && (
          <div className="space-y-2.5">
            <div className="text-[11px] text-slate-400 px-1 flex items-center justify-between">
              <span>Mutual companions can private chat & battle in private chambers</span>
              <span className="text-amber-400 font-bold">{companions.length} Royals</span>
            </div>

            {companions.length === 0 ? (
              <div className="p-10 text-center bg-slate-900/40 rounded-3xl border border-slate-800 text-slate-400 text-xs space-y-3">
                <Crown className="w-8 h-8 text-amber-400/50 mx-auto" />
                <p>No mutual companions yet.</p>
                <button
                  onClick={() => setActiveTab('discover')}
                  className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/40 text-xs font-bold hover:bg-amber-500/30 cursor-pointer"
                >
                  Discover Monarchs to Follow
                </button>
              </div>
            ) : (
              companions.map((friend) => {
                const conversationId = chatService.getConversationId(friend.id);
                const timer = chatService.getConversationTimer(conversationId);

                return (
                  <div
                    key={friend.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900/90 to-slate-950 border border-amber-500/20 hover:border-amber-400/50 flex items-center justify-between transition-all shadow-md group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-11 h-11 rounded-2xl bg-slate-950 border-2 border-amber-400/40 flex items-center justify-center overflow-hidden">
                        {friend.avatar_url?.startsWith('avatar_') ? (
                          <img
                            src={`/avatars/${friend.avatar_url}.png`}
                            alt={friend.display_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Crown className="w-5 h-5 text-amber-300" />
                        )}
                        {friend.is_online && (
                          <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-slate-100">
                            {friend.display_name}
                          </span>
                          <span className="text-[10px] text-amber-400/90 font-mono font-bold bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">
                            #{friend.player_id}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>Lv.{friend.level}</span>
                          <span>&bull;</span>
                          <span className="text-amber-300">{friend.wins} Wins</span>
                          <span>&bull;</span>
                          <span className="text-emerald-400 font-semibold text-[10px]">
                            🤝 Mutual Companion
                          </span>
                          {timer > 0 && (
                            <span className="text-[10px] text-amber-400/90 font-medium">
                              ⏱️ Timer
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 sm:gap-2 relative">
                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setActiveChatFriend(friend);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow"
                        title="Direct Chat"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                        <span className="hidden sm:inline">Chat</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          if (onInviteToRoom) onInviteToRoom(friend);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-royal font-bold text-xs transition-all cursor-pointer shadow flex items-center gap-1"
                      >
                        <Swords className="w-3.5 h-3.5" />
                        <span>Battle</span>
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
                          <div className="absolute right-0 top-9 w-40 rounded-2xl bg-slate-950 border border-amber-500/40 p-1.5 shadow-2xl z-30 space-y-1 backdrop-blur-md">
                            <button
                              type="button"
                              onClick={() => handleUnfollow(friend.id, friend.display_name)}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-amber-300 hover:bg-amber-950/50 flex items-center gap-2 cursor-pointer font-medium"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                              <span>Unfollow</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleBlock(friend.id, friend.display_name)}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-950/50 flex items-center gap-2 cursor-pointer font-medium"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span>Block User</span>
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

        {/* TAB 2: Followers & Incoming Requests (WITH PROMINENT ACCEPT & FOLLOW BACK!) */}
        {activeTab === 'followers' && (
          <div className="space-y-2.5">
            <div className="text-[11px] text-slate-400 px-1 flex items-center justify-between">
              <span>Monarchs who sent you a follow request. Accept to become mutual companions!</span>
              <span className="text-amber-400 font-bold">{followers.length} Requests / Followers</span>
            </div>

            {followers.length === 0 ? (
              <div className="p-10 text-center bg-slate-900/40 rounded-3xl border border-slate-800 text-slate-400 text-xs space-y-3">
                <Heart className="w-8 h-8 text-amber-400/50 mx-auto" />
                <p>No incoming follow requests right now.</p>
                <p className="text-[11px] text-slate-500">
                  Share your Player ID <strong className="text-amber-300 font-mono">#{currentUser.player_id}</strong> with friends so they can follow you!
                </p>
              </div>
            ) : (
              followers.map((follower) => (
                <div
                  key={follower.id}
                  className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900/95 to-slate-950 border-2 border-amber-400/80 flex items-center justify-between transition-all shadow-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-2xl bg-slate-950 border-2 border-amber-400 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {follower.avatar_url?.startsWith('avatar_') ? (
                        <img
                          src={`/avatars/${follower.avatar_url}.png`}
                          alt={follower.display_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Crown className="w-6 h-6 text-amber-300" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-slate-100">
                          {follower.display_name}
                        </span>
                        <span className="text-[10px] text-amber-400 font-mono font-bold bg-amber-950 px-1.5 py-0.5 rounded border border-amber-500/40">
                          #{follower.player_id}
                        </span>
                      </div>
                      <div className="text-[11px] text-amber-300/90 flex items-center gap-1.5 mt-0.5">
                        <span>Lv.{follower.level}</span>
                        <span>&bull;</span>
                        <span className="text-amber-400 font-semibold">{follower.wins} Wins</span>
                        <span>&bull;</span>
                        <span className="text-amber-400 font-bold flex items-center gap-0.5">
                          <Heart className="w-3 h-3 fill-amber-400" /> Wants to connect
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Golden Accept & Follow Back Button */}
                    <button
                      type="button"
                      onClick={() => handleAcceptAndFollowBack(follower.id, follower.display_name)}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-110 text-slate-950 font-royal font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-lg hover:scale-105 active:scale-95 animate-pulse"
                      title="Accept request & follow back as Companion"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Accept 🤝</span>
                    </button>

                    {/* Decline Button */}
                    <button
                      type="button"
                      onClick={() => handleDeclineRequest(follower.id, follower.display_name)}
                      className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-colors cursor-pointer"
                      title="Decline Request"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: Following (Monarchs You Follow) */}
        {activeTab === 'following' && (
          <div className="space-y-2.5">
            <div className="text-[11px] text-slate-400 px-1 flex items-center justify-between">
              <span>Monarchs you follow (awaiting their follow back to become companions)</span>
              <span className="text-amber-400 font-bold">{following.length} Following</span>
            </div>

            {following.length === 0 ? (
              <div className="p-10 text-center bg-slate-900/40 rounded-3xl border border-slate-800 text-slate-400 text-xs space-y-3">
                <UserCheck className="w-8 h-8 text-amber-400/50 mx-auto" />
                <p>You are not following any other monarchs yet.</p>
                <button
                  onClick={() => setActiveTab('discover')}
                  className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/40 text-xs font-bold hover:bg-amber-500/30 cursor-pointer"
                >
                  Discover Royals to Follow
                </button>
              </div>
            ) : (
              following.map((user) => (
                <div
                  key={user.id}
                  className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/30 flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-950 border border-amber-400/40 flex items-center justify-center overflow-hidden">
                      <Crown className="w-5 h-5 text-amber-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-slate-100">
                          {user.display_name}
                        </span>
                        <span className="text-[10px] text-amber-400/80 font-mono">
                          #{user.player_id}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>Lv.{user.level}</span>
                        <span>&bull;</span>
                        <span className="text-amber-400 font-medium">Request Sent (Awaiting)</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUnfollow(user.id, user.display_name)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-300 font-bold text-xs border border-slate-700 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      <span>Cancel Request</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 4: Discover Royals */}
        {activeTab === 'discover' && (
          <div className="space-y-3">
            <div className="text-[11px] text-slate-400 px-1 flex items-center justify-between">
              <span>Monarchs in the Realm ready for battle and allegiance</span>
              <span className="text-amber-400 font-bold">{discoverResults.length} Available</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {discoverResults.map((user) => (
                <div
                  key={user.id}
                  className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 flex items-center justify-between transition-all shadow"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-950 border border-amber-400/40 flex items-center justify-center flex-shrink-0">
                      <Crown className="w-5 h-5 text-amber-300" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-100 truncate">
                        {user.display_name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        #{user.player_id} &bull; Lv.{user.level}
                      </div>
                    </div>
                  </div>

                  {user.relationship === 'friend' ? (
                    <span className="text-[10px] text-emerald-400 font-bold px-2 py-1 bg-emerald-950/50 rounded-lg border border-emerald-500/30 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>Mutual</span>
                    </span>
                  ) : user.relationship === 'following' ? (
                    <button
                      onClick={() => handleUnfollow(user.id, user.display_name)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-[10px] font-bold hover:bg-rose-950 hover:text-rose-300 border border-slate-700 cursor-pointer"
                    >
                      Following
                    </button>
                  ) : user.relationship === 'follower' ? (
                    <button
                      onClick={() => handleAcceptAndFollowBack(user.id, user.display_name)}
                      className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-[10px] font-black cursor-pointer shadow flex items-center gap-1 hover:brightness-110"
                    >
                      <Heart className="w-3 h-3 fill-slate-950" />
                      <span>Accept 🤝</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleFollowUser(user)}
                      className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-royal font-bold text-[10px] cursor-pointer shadow flex items-center gap-1"
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>Follow</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: Blocked Users */}
        {activeTab === 'blocked' && (
          <div className="space-y-2.5">
            <div className="text-[11px] text-slate-400 px-1">
              Blocked players cannot follow, message, or challenge you
            </div>

            {blockedFriends.length === 0 ? (
              <div className="p-10 text-center bg-slate-900/40 rounded-3xl border border-slate-800 text-slate-400 text-xs">
                No blocked users.
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
                      <div className="text-[11px] text-slate-400">Blocked</div>
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
