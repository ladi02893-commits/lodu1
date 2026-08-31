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
    <div className="w-full min-h-screen bg-[#070b16] text-slate-100 flex flex-col items-center pb-20 overflow-x-hidden font-sans">
      {/* Header */}
      <header className="w-full max-w-xl px-4 py-3 flex items-center justify-between border-b border-amber-500/10 bg-[#070b16]/95 sticky top-0 z-30 backdrop-blur-md">
        <button
          onClick={() => {
            sound.playClick();
            onBack();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0e1424] border border-slate-800 text-slate-300 hover:text-amber-300 transition-all cursor-pointer text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Court</span>
        </button>

        <h2 className="font-royal font-black text-sm sm:text-base text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
          <Crown className="w-4 h-4 text-amber-400" />
          <span>Guilds & Clans</span>
        </h2>

        <div className="w-14" />
      </header>

      <main className="w-full max-w-xl px-3.5 sm:px-4 py-4 space-y-3.5 z-10">
        {/* Tab Navigation */}
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[#0e1424] border border-slate-800">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('my_clan');
            }}
            disabled={!myClanData.clan}
            className={`py-2 rounded-xl font-royal font-black text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40 truncate ${
              activeTab === 'my_clan'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow'
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
            className={`py-2 rounded-xl font-royal font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'discover'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Discover
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('create');
            }}
            className={`py-2 rounded-xl font-royal font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Found (2k)
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
          <div className="space-y-3.5 animate-fade-in">
            {/* Clan Banner Card */}
            <div
              className="p-4 sm:p-5 rounded-3xl border border-amber-400/40 shadow-xl relative overflow-hidden text-white"
              style={{
                background: `linear-gradient(135deg, ${myClanData.clan.banner_color}30 0%, #0e1424 70%, #070b16 100%)`,
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-500 text-slate-950">
                      [{myClanData.clan.tag}]
                    </span>
                    <h3 className="font-royal font-black text-base sm:text-lg text-amber-200">
                      {myClanData.clan.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-300 max-w-md">
                    {myClanData.clan.description}
                  </p>
                  <div className="text-[10px] text-amber-400/90 font-semibold pt-0.5">
                    Leader: <strong>{myClanData.clan.leader_name}</strong> • Min Level: {myClanData.clan.min_level}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                  <div className="text-left sm:text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Total Trophies</div>
                    <div className="font-royal font-black text-base text-amber-300 flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>{myClanData.clan.trophies.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-300 font-bold bg-[#070b16] px-2.5 py-1 rounded-xl border border-slate-800">
                    👥 {myClanData.clan.member_count} / {myClanData.clan.max_members} Nobles
                  </div>
                </div>
              </div>

              {/* Weekly Clan Chest Progress Bar */}
              <div className="mt-3.5 p-3 rounded-2xl bg-[#070b16]/90 border border-amber-500/30 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-300 flex items-center gap-1">
                    <Gift className="w-3.5 h-3.5 text-amber-400" />
                    <span>Weekly Clan Vault Chest</span>
                  </span>
                  <span className="font-mono text-slate-300 font-bold text-xs">
                    {myClanData.clan.weekly_chest_score} / 5,000 Pts
                  </span>
                </div>

                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.round((myClanData.clan.weekly_chest_score / 5000) * 100))}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-[9px] text-slate-400">
                    Earn match crowns to level up the chest!
                  </span>
                  <button
                    onClick={handleClaimChest}
                    className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-slate-950 font-royal font-black text-[10px] cursor-pointer shadow"
                  >
                    Claim 2.5k Coins
                  </button>
                </div>
              </div>
            </div>

            {/* Clan Chat & Member Roster Deck */}
            <div className="grid grid-cols-1 gap-3.5">
              {/* Clan Chat Channel */}
              <div className="p-4 rounded-3xl bg-[#0e1424] border border-slate-800 flex flex-col h-72">
                <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 mb-2">
                  <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                  <h4 className="font-royal font-black text-xs text-slate-200 uppercase tracking-wider">
                    Guild Hall Dispatch
                  </h4>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
                  {chatMessages.length === 0 ? (
                    <div className="text-center text-slate-500 py-8 text-xs">
                      No messages yet. Send a greeting to your clan!
                    </div>
                  ) : (
                    chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-2.5 rounded-2xl ${
                          msg.sender_id === user.id
                            ? 'bg-amber-500/10 border border-amber-500/30 text-amber-100 ml-6'
                            : 'bg-[#070b16] border border-slate-800 text-slate-200 mr-6'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[9px] text-slate-400 mb-0.5">
                          <span className="font-bold text-amber-300">{msg.sender_name}</span>
                          <span className="font-mono">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-xs">{msg.message}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleSendChatMessage} className="flex items-center gap-2 pt-2 border-t border-slate-800 mt-2">
                  <input
                    type="text"
                    placeholder="Message clan members..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 bg-[#070b16] border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 hover:brightness-110 cursor-pointer shadow"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>

              {/* Clan Privileges & Leave Action */}
              <div className="p-4 rounded-3xl bg-[#0e1424] border border-slate-800 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <h4 className="font-royal font-black text-xs text-slate-200 uppercase tracking-wider">
                    Guild Privileges
                  </h4>
                  <div className="flex items-center gap-3 text-[10px] text-slate-300 flex-wrap">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Check className="w-3 h-3" /> Shared Chest
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Check className="w-3 h-3" /> Guild Hall Chat
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleLeaveClan}
                  className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-bold text-xs cursor-pointer transition-colors flex-shrink-0"
                >
                  Leave Guild
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DISCOVER CLANS */}
        {activeTab === 'discover' && (
          <div className="space-y-3 animate-fade-in">
            {/* Search Bar */}
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Clan by Name or Tag (e.g. DRGN)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0e1424] border border-slate-800 rounded-2xl pl-9 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-amber-400"
              />
            </div>

            {filteredClans.length === 0 ? (
              <div className="p-8 rounded-3xl bg-[#0e1424] border border-slate-800 text-center space-y-2">
                <Shield className="w-8 h-8 text-slate-600 mx-auto" />
                <h4 className="font-royal font-black text-xs sm:text-sm text-slate-300">No Clans Found</h4>
                <p className="text-[10px] text-slate-500">
                  Try searching a different tag or found your own royal clan!
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredClans.map((clan, idx) => (
                  <div
                    key={clan.id}
                    className="p-3.5 sm:p-4 rounded-3xl bg-[#0e1424] border border-slate-800 hover:border-amber-500/40 flex items-center justify-between gap-3 transition-all shadow"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs text-slate-950 shadow flex-shrink-0"
                        style={{ backgroundColor: clan.banner_color || '#d97706' }}
                      >
                        #{idx + 1}
                      </div>

                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-mono text-[9px] font-black px-1.5 py-0.2 rounded bg-[#070b16] border border-amber-500/40 text-amber-300">
                            [{clan.tag}]
                          </span>
                          <span className="font-royal font-black text-xs sm:text-sm text-slate-100 truncate">
                            {clan.name}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-1">
                          {clan.description}
                        </p>
                        <div className="text-[9px] text-slate-500">
                          Leader: <strong>{clan.leader_name}</strong> • Min Lv: {clan.min_level} • 👥 {clan.member_count}/{clan.max_members}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right font-royal font-black text-xs text-amber-300 flex items-center gap-0.5">
                        <Trophy className="w-3 h-3 text-amber-400" />
                        <span>{clan.trophies.toLocaleString()}</span>
                      </div>

                      {myClanData.clan?.id === clan.id ? (
                        <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[10px] font-bold">
                          Joined
                        </span>
                      ) : (
                        <button
                          onClick={() => handleJoinClan(clan.id)}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 font-royal font-black text-[10px] uppercase tracking-wider text-slate-950 shadow cursor-pointer transition-all"
                        >
                          Join
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
            className="p-4 sm:p-5 rounded-3xl bg-[#0e1424] border border-amber-500/40 space-y-3.5 shadow-xl animate-fade-in"
          >
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
              <Crown className="w-4 h-4 text-amber-400" />
              <h3 className="font-royal font-black text-xs sm:text-sm text-amber-300 uppercase tracking-wider">
                Found a Sovereign Clan
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Clan Name</label>
                <input
                  type="text"
                  placeholder="e.g. Royal Dragon Knights"
                  value={newClanName}
                  onChange={(e) => setNewClanName(e.target.value)}
                  maxLength={30}
                  className="w-full bg-[#070b16] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Clan Tag (2-6 chars)</label>
                <input
                  type="text"
                  placeholder="e.g. DRGN"
                  value={newClanTag}
                  onChange={(e) => setNewClanTag(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="w-full bg-[#070b16] border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-300 uppercase font-mono outline-none focus:border-amber-400 font-bold"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Motto & Description</label>
              <textarea
                placeholder="Declare your guild's code of honor and strategy..."
                value={newClanDesc}
                onChange={(e) => setNewClanDesc(e.target.value)}
                rows={2}
                maxLength={120}
                className="w-full bg-[#070b16] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-amber-400 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Banner Color</label>
                <div className="flex items-center gap-2">
                  {['#d97706', '#059669', '#2563eb', '#7c3aed', '#dc2626'].map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setNewClanColor(col)}
                      className={`w-7 h-7 rounded-xl cursor-pointer transition-all border-2 ${
                        newClanColor === col ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Minimum Level</label>
                <select
                  value={newClanMinLevel}
                  onChange={(e) => setNewClanMinLevel(Number(e.target.value))}
                  className="w-full bg-[#070b16] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none"
                >
                  <option value={1}>Level 1 (Open to all)</option>
                  <option value={2}>Level 2 (Squire)</option>
                  <option value={3}>Level 3 (Knight)</option>
                  <option value={5}>Level 5 (Baron)</option>
                  <option value={8}>Level 8 (Emperor)</option>
                </select>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#070b16] border border-amber-500/30 flex items-center justify-between text-xs text-amber-200">
              <span>Founding Fee:</span>
              <strong className="font-mono text-xs font-black text-amber-400">2,000 Coins</strong>
            </div>

            <button
              type="submit"
              disabled={isSubmittingCreate || user.coins < 2000}
              className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 font-royal font-black text-xs uppercase tracking-wider text-slate-950 shadow cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>{isSubmittingCreate ? 'Founding Guild...' : 'Found Royal Clan (-2,000 Coins)'}</span>
            </button>
          </form>
        )}
      </main>
    </div>
  );
};
