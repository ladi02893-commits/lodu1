import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Crown,
  Flame,
  MessageSquare,
  Plus,
  Search,
  Send,
  Shield,
  Sparkles,
  Swords,
  Trash2,
  Trophy,
  UserPlus,
  Users,
  X,
  Gift,
  Check,
} from 'lucide-react';
import { sound } from '../../lib/audio';
import { authService } from '../../services/authService';
import {
  clanService,
  ClanRecord,
  ClanMessageRecord,
} from '../../services/clanService';
import { UserProfile } from '../../types/database';

interface ClanViewProps {
  onBack: () => void;
  onOpenPayment?: () => void;
}

export const ClanView: React.FC<ClanViewProps> = ({ onBack, onOpenPayment }) => {
  const [user, setUser] = useState<UserProfile>(authService.getCurrentUser());
  const [clans, setClans] = useState<ClanRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'my_clan' | 'discover' | 'create'>('my_clan');
  const [myClanData, setMyClanData] = useState<{ clan: ClanRecord | null; myClanId: string | null }>(() =>
    clanService.getMyClan()
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Clan Creation Form State
  const [newClanName, setNewClanName] = useState('');
  const [newClanTag, setNewClanTag] = useState('');
  const [newClanDesc, setNewClanDesc] = useState('');
  const [newClanBadge, setNewClanBadge] = useState('shield_crown');
  const [newClanColor, setNewClanColor] = useState('#d97706');
  const [newClanMinLevel, setNewClanMinLevel] = useState(1);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Clan Chat State
  const [chatMessages, setChatMessages] = useState<ClanMessageRecord[]>([]);
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    loadClans();
  }, []);

  const loadClans = async () => {
    const list = await clanService.fetchClans();
    setClans(list);
    const my = clanService.getMyClan();
    setMyClanData(my);
    if (!my.clan && activeTab === 'my_clan') {
      setActiveTab('discover');
    }
  };

  useEffect(() => {
    if (myClanData.clan) {
      const unsub = clanService.subscribeClanChat(myClanData.clan.id, (msgs) => {
        setChatMessages([...msgs]);
      });
      return () => unsub();
    }
  }, [myClanData.clan?.id]);

  const showNotification = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleJoinClan = async (clanId: string) => {
    sound.playClick();
    const res = await clanService.joinClan(clanId);
    if (res.success) {
      sound.playHomeGoal();
      await loadClans();
      setActiveTab('my_clan');
      showNotification(res.message);
    } else {
      sound.playTimerWarning();
      showNotification(res.message);
    }
  };

  const handleLeaveClan = async () => {
    if (!confirm('Are you sure you want to leave your Sovereign Clan?')) return;
    sound.playClick();
    const res = await clanService.leaveClan();
    if (res.success) {
      await loadClans();
      setActiveTab('discover');
      showNotification(res.message);
    }
  };

  const handleCreateClanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingCreate) return;

    sound.playClick();
    setIsSubmittingCreate(true);

    try {
      const res = await clanService.createClan({
        name: newClanName,
        tag: newClanTag,
        description: newClanDesc,
        badge_icon: newClanBadge,
        banner_color: newClanColor,
        min_level: newClanMinLevel,
      });

      if (res.success && res.clan) {
        sound.playHomeGoal();
        setUser(authService.getCurrentUser());
        await loadClans();
        setActiveTab('my_clan');
        showNotification(res.message);
        setNewClanName('');
        setNewClanTag('');
        setNewClanDesc('');
      } else {
        sound.playTimerWarning();
        showNotification(res.message);
      }
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !myClanData.clan) return;

    sound.playClick();
    await clanService.sendClanMessage(myClanData.clan.id, chatInput.trim());
    setChatInput('');
  };

  const handleClaimChest = async () => {
    if (!myClanData.clan) return;
    sound.playHomeGoal();
    const res = await clanService.claimWeeklyChest(myClanData.clan.id);
    if (res.success) {
      setUser(authService.getCurrentUser());
      showNotification(res.message);
    }
  };

  const filteredClans = clans.filter((c) => {
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.tag.toLowerCase().includes(q);
  });

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

        <h2 className="font-royal font-bold text-sm sm:text-base text-amber-300 flex items-center gap-1.5">
          <Crown className="w-4 h-4 text-amber-400" />
          <span>Imperial Sovereign Guilds</span>
        </h2>

        <div className="w-16" />
      </header>

      <main className="w-full max-w-3xl px-4 py-6 space-y-6">
        {/* Tab Navigation */}
        <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('my_clan');
            }}
            disabled={!myClanData.clan}
            className={`py-2 rounded-xl font-royal font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40 ${
              activeTab === 'my_clan'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            My Guild {myClanData.clan ? `[${myClanData.clan.tag}]` : ''}
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('discover');
            }}
            className={`py-2 rounded-xl font-royal font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'discover'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Discover Guilds
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('create');
            }}
            className={`py-2 rounded-xl font-royal font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Found Clan (2k)
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="p-3 rounded-2xl bg-amber-950/80 border border-amber-400/60 text-amber-200 text-xs font-bold text-center animate-fade-in shadow-lg">
            {feedback}
          </div>
        )}

        {/* TAB 1: MY CLAN */}
        {activeTab === 'my_clan' && myClanData.clan && (
          <div className="space-y-5 animate-fade-in">
            {/* Clan Banner Card */}
            <div
              className="p-6 rounded-3xl border-2 border-amber-400/50 shadow-2xl relative overflow-hidden text-white"
              style={{
                background: `linear-gradient(135deg, ${myClanData.clan.banner_color}40 0%, #0f172a 70%, #090d20 100%)`,
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-amber-500 text-slate-950">
                      [{myClanData.clan.tag}]
                    </span>
                    <h3 className="font-royal font-black text-xl sm:text-2xl text-amber-200">
                      {myClanData.clan.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-300 max-w-md">
                    {myClanData.clan.description}
                  </p>
                  <div className="text-[11px] text-amber-400/90 font-semibold pt-1">
                    Leader: <strong>{myClanData.clan.leader_name}</strong> • Min Level: {myClanData.clan.min_level}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
                  <div className="text-right">
                    <div className="text-xs text-slate-400 uppercase font-bold">Total Trophies</div>
                    <div className="font-royal font-black text-lg text-amber-300 flex items-center gap-1 sm:justify-end">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <span>{myClanData.clan.trophies.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-300 font-bold bg-slate-950/60 px-3 py-1 rounded-xl border border-slate-800">
                    👥 {myClanData.clan.member_count} / {myClanData.clan.max_members} Nobles
                  </div>
                </div>
              </div>

              {/* Weekly Clan Chest Progress Bar */}
              <div className="mt-5 p-4 rounded-2xl bg-slate-950/80 border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                    <Gift className="w-4 h-4 text-amber-400" />
                    Weekly Clan Vault Chest
                  </span>
                  <span className="font-mono text-slate-300 font-bold">
                    {myClanData.clan.weekly_chest_score} / 5,000 Pts
                  </span>
                </div>

                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.round((myClanData.clan.weekly_chest_score / 5000) * 100))}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400">
                    Earn match crowns to level up the guild treasure chest!
                  </span>
                  <button
                    onClick={handleClaimChest}
                    className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow transition-colors"
                  >
                    Claim 2.5k Coins
                  </button>
                </div>
              </div>
            </div>

            {/* Clan Chat & Member Roster Deck */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Clan Chat Channel */}
              <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 flex flex-col h-80">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-3">
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                  <h4 className="font-royal font-bold text-xs text-slate-200 uppercase tracking-wider">
                    Guild Hall Dispatch
                  </h4>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
                  {chatMessages.length === 0 ? (
                    <div className="text-center text-slate-500 py-10">
                      No messages yet. Send the first greeting to your clan!
                    </div>
                  ) : (
                    chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-2.5 rounded-2xl ${
                          msg.sender_id === user.id
                            ? 'bg-amber-500/10 border border-amber-500/30 text-amber-100 ml-6'
                            : 'bg-slate-950/80 border border-slate-800 text-slate-200 mr-6'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                          <span className="font-bold text-amber-300">{msg.sender_name}</span>
                          <span className="font-mono">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p>{msg.message}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleSendChatMessage} className="flex items-center gap-2 pt-3 border-t border-slate-800 mt-2">
                  <input
                    type="text"
                    placeholder="Message clan members..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer shadow"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>

              {/* Clan Info & Actions */}
              <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <h4 className="font-royal font-bold text-xs text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2">
                    Guild Privileges
                  </h4>
                  <div className="space-y-2 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Weekly Shared Guild Chest Payouts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Exclusive Clan Hall Group Chat</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Custom Sovereign Badge on Leaderboards</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleLeaveClan}
                  className="w-full py-2.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/80 border border-rose-500/40 text-rose-300 font-bold text-xs cursor-pointer transition-colors"
                >
                  Leave Guild
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DISCOVER CLANS */}
        {activeTab === 'discover' && (
          <div className="space-y-4 animate-fade-in">
            {/* Search Bar */}
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Clan by Name or Tag (e.g. DRGN)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-9 pr-4 py-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-amber-400 shadow-inner"
              />
            </div>

            {filteredClans.length === 0 ? (
              <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-2">
                <Shield className="w-8 h-8 text-slate-600 mx-auto" />
                <h4 className="font-royal font-bold text-sm text-slate-300">No Clans Found</h4>
                <p className="text-xs text-slate-500">
                  Try searching a different tag or found your own royal clan!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredClans.map((clan, idx) => (
                  <div
                    key={clan.id}
                    className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-lg"
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm text-slate-950 shadow flex-shrink-0"
                        style={{ backgroundColor: clan.banner_color || '#d97706' }}
                      >
                        #{idx + 1}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-950 border border-amber-500/40 text-amber-300">
                            [{clan.tag}]
                          </span>
                          <span className="font-royal font-bold text-sm sm:text-base text-slate-100">
                            {clan.name}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-1">
                          {clan.description}
                        </p>
                        <div className="text-[11px] text-slate-500">
                          Leader: <strong>{clan.leader_name}</strong> • Min Level: {clan.min_level} • 👥 {clan.member_count}/{clan.max_members}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="text-right font-royal font-black text-xs sm:text-sm text-amber-300 flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5 text-amber-400" />
                        <span>{clan.trophies.toLocaleString()}</span>
                      </div>

                      {myClanData.clan?.id === clan.id ? (
                        <span className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/40 text-xs font-bold">
                          Joined
                        </span>
                      ) : (
                        <button
                          onClick={() => handleJoinClan(clan.id)}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 font-bold text-xs uppercase tracking-wider text-slate-950 shadow cursor-pointer transition-all"
                        >
                          Join Guild
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CREATE CLAN */}
        {activeTab === 'create' && (
          <form
            onSubmit={handleCreateClanSubmit}
            className="p-6 rounded-3xl bg-slate-900/90 border border-amber-500/40 space-y-4 shadow-xl animate-fade-in"
          >
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Crown className="w-5 h-5 text-amber-400" />
              <h3 className="font-royal font-bold text-base text-amber-300">
                Found a Sovereign Clan
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-bold">Clan Name</label>
                <input
                  type="text"
                  placeholder="e.g. Royal Dragon Knights"
                  value={newClanName}
                  onChange={(e) => setNewClanName(e.target.value)}
                  maxLength={30}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-bold">Clan Tag (2-6 chars)</label>
                <input
                  type="text"
                  placeholder="e.g. DRGN"
                  value={newClanTag}
                  onChange={(e) => setNewClanTag(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-amber-300 uppercase font-mono outline-none focus:border-amber-400 font-bold"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-300 font-bold">Motto & Description</label>
              <textarea
                placeholder="Declare your guild's code of honor and strategy..."
                value={newClanDesc}
                onChange={(e) => setNewClanDesc(e.target.value)}
                rows={2}
                maxLength={120}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 outline-none focus:border-amber-400 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-bold">Banner Color</label>
                <div className="flex items-center gap-2">
                  {['#d97706', '#059669', '#2563eb', '#7c3aed', '#dc2626'].map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setNewClanColor(col)}
                      className={`w-8 h-8 rounded-xl cursor-pointer transition-all border-2 ${
                        newClanColor === col ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-bold">Minimum Level Requirement</label>
                <select
                  value={newClanMinLevel}
                  onChange={(e) => setNewClanMinLevel(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 outline-none"
                >
                  <option value={1}>Level 1 (Open to all)</option>
                  <option value={2}>Level 2 (Squire)</option>
                  <option value={3}>Level 3 (Knight)</option>
                  <option value={5}>Level 5 (Baron)</option>
                  <option value={8}>Level 8 (Emperor)</option>
                </select>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-between text-xs text-amber-200">
              <span>Founding Fee:</span>
              <strong className="font-mono text-sm text-amber-400">2,000 Coins</strong>
            </div>

            <button
              type="submit"
              disabled={isSubmittingCreate || user.coins < 2000}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-110 font-royal font-black text-xs uppercase tracking-wider text-slate-950 shadow cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              <Crown className="w-4 h-4" />
              <span>{isSubmittingCreate ? 'Founding Guild...' : 'Found Royal Clan (-2,000 Coins)'}</span>
            </button>
          </form>
        )}
      </main>
    </div>
  );
};
