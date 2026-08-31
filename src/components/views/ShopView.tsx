import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Check,
  Circle,
  Coins,
  Crown,
  Dice5,
  Gift,
  LayoutGrid,
  Plus,
  Shield,
  ShoppingBag,
  Sparkles,
  Tag,
  User,
  Zap,
} from 'lucide-react';
import { sound } from '../../lib/audio';
import { adminService } from '../../services/adminService';
import { authService } from '../../services/authService';
import { COIN_PACKAGES } from '../../services/paymentService';
import { SHOP_CATALOG, shopService } from '../../services/shopService';
import { ShopItem, UserProfile } from '../../types/database';
import { PaymentModal } from './PaymentModal';

interface ShopViewProps {
  onBack: () => void;
}

export const ShopView: React.FC<ShopViewProps> = ({ onBack }) => {
  const [user, setUser] = useState<UserProfile>(() => authService.getCurrentUser());
  const [ownedItems, setOwnedItems] = useState<string[]>(() => shopService.getOwnedItems());
  const [activeTab, setActiveTab] = useState<'cosmetics' | 'coins'>('cosmetics');
  const [filterType, setFilterType] = useState<ShopItem['type']>('dice');
  const [promoInput, setPromoInput] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPkgId, setSelectedPkgId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const unsub = authService.subscribe((u) => {
      if (u) setUser(u);
    });
    return () => unsub();
  }, []);

  const catalog = SHOP_CATALOG.filter((i) => i.type === filterType);

  const handleBuy = (itemId: string) => {
    sound.playClick();
    const res = shopService.buyItem(itemId);
    setFeedback(res.message);
    if (res.success) {
      sound.playHomeGoal();
      setUser(authService.getCurrentUser());
      setOwnedItems(shopService.getOwnedItems());
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleEquip = (itemId: string) => {
    sound.playClick();
    const success = shopService.equipItem(itemId);
    if (success) {
      setUser(authService.getCurrentUser());
      setFeedback('Item equipped successfully!');
    }
    setTimeout(() => setFeedback(null), 2000);
  };

  const handleRedeemPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoInput.trim()) return;

    sound.playClick();
    const res = adminService.redeemPromoCode(promoInput.trim());
    setFeedback(res.message);
    if (res.success) {
      sound.playHomeGoal();
      setUser(authService.getCurrentUser());
      setPromoInput('');
    }
    setTimeout(() => setFeedback(null), 3500);
  };

  const isEquipped = (item: ShopItem) => {
    if (item.type === 'dice') return user.dice_skin === item.id;
    if (item.type === 'board') return user.board_theme === item.id;
    if (item.type === 'token') return user.token_skin === item.id;
    if (item.type === 'avatar') return user.avatar_url === item.id;
    if (item.type === 'frame') return user.avatar_frame === item.id;
    return false;
  };

  const getRarityBadge = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return 'bg-amber-950 text-amber-300 border-amber-400';
      case 'epic':
        return 'bg-purple-950 text-purple-300 border-purple-400';
      case 'rare':
        return 'bg-blue-950 text-blue-300 border-blue-400';
      default:
        return 'bg-slate-900 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#070b16] text-slate-100 flex flex-col items-center pb-20 overflow-x-hidden font-sans">
      {/* Header */}
      <header className="w-full max-w-xl px-4 py-3 flex items-center justify-between border-b border-amber-500/10 bg-[#070b16]/95 sticky top-0 z-30 backdrop-blur-md">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0e1424] border border-slate-800 text-slate-300 hover:text-amber-300 transition-all cursor-pointer text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Court</span>
        </button>

        <h2 className="font-royal font-black text-sm sm:text-base text-amber-300 uppercase tracking-wider">
          Royal Bazaar
        </h2>

        {/* Currency Purse with Buy Coins Plus */}
        <button
          onClick={() => {
            sound.playClick();
            setSelectedPkgId(undefined);
            setShowPaymentModal(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0e1424] border border-amber-500/50 text-amber-300 font-bold text-xs hover:border-amber-400 transition-all cursor-pointer shadow-inner"
          title="Buy Coins"
        >
          <Coins className="w-4 h-4 text-amber-400" />
          <span>{Math.max(0, Math.floor(Math.round(user.coins || 0))).toLocaleString()}</span>
          <Plus className="w-3.5 h-3.5 text-amber-400 font-black ml-0.5" />
        </button>
      </header>

      <main className="w-full max-w-xl px-3.5 sm:px-4 py-4 space-y-3.5 z-10">
        {/* Feedback Alert */}
        {feedback && (
          <div className="p-3 rounded-2xl bg-amber-950/80 border border-amber-400 text-amber-200 text-xs font-bold text-center animate-fade-in shadow-xl">
            {feedback}
          </div>
        )}

        {/* Buy Coins Big Feature Card */}
        <div className="p-4 rounded-3xl bg-[#0e1424] border border-amber-500/30 shadow-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-left min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 shadow flex-shrink-0">
              <Coins className="w-6 h-6 fill-slate-950" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-royal font-black text-xs sm:text-sm text-slate-100 truncate">
                  Buy Imperial Coins
                </h3>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 text-[9px] font-black border border-amber-400/40 whitespace-nowrap">
                  +33% BONUS
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                Instant delivery via JazzCash, EasyPaisa, Bank & Raast.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              setSelectedPkgId(undefined);
              setShowPaymentModal(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 font-royal font-black text-xs uppercase tracking-wider text-slate-950 shadow active:scale-95 transition-all cursor-pointer whitespace-nowrap flex-shrink-0"
          >
            <span>Deposit</span>
          </button>
        </div>

        {/* Top Level Section Switcher (Cosmetics vs Coin Bundles) */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[#0e1424] border border-slate-800">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('cosmetics');
            }}
            className={`py-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'cosmetics'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Cosmetics & Items</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('coins');
            }}
            className={`py-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'coins'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Coin Packages</span>
          </button>
        </div>

        {/* SECTION 1: COSMETICS CATALOG */}
        {activeTab === 'cosmetics' && (
          <div className="space-y-3.5 animate-fade-in">
            {/* Promo Code Redemption Card */}
            <div className="p-3.5 rounded-3xl bg-[#0e1424] border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 flex-shrink-0">
                  <Gift className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-royal font-bold text-xs sm:text-sm text-amber-200 truncate">
                    Redeem Promo Code
                  </h3>
                  <p className="text-[10px] text-slate-400 truncate">
                    Enter your promo code to claim bonus coins.
                  </p>
                </div>
              </div>

              <form onSubmit={handleRedeemPromo} className="w-full sm:w-auto flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="ROYAL2026"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  className="w-full sm:w-32 bg-[#070b16] border border-amber-500/40 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-amber-200 uppercase outline-none focus:ring-1 focus:ring-amber-400"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 font-royal font-black text-slate-950 text-xs shadow cursor-pointer flex-shrink-0"
                >
                  Apply
                </button>
              </form>
            </div>

            {/* Category Filter Tabs */}
            <div className="grid grid-cols-5 gap-1 p-1 rounded-2xl bg-[#0e1424] border border-slate-800 text-xs">
              {(['dice', 'board', 'token', 'avatar', 'frame'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`py-1.5 rounded-xl font-bold transition-all cursor-pointer text-center capitalize ${
                    filterType === type
                      ? 'bg-amber-500 text-slate-950 font-black shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Catalog Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {catalog.map((item) => {
                const isOwned = ownedItems.includes(item.id);
                const equipped = isEquipped(item);

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-3xl border transition-all duration-200 flex flex-col justify-between gap-2.5 ${
                      equipped
                        ? 'bg-amber-950/30 border-amber-400/80 shadow'
                        : isOwned
                        ? 'bg-[#0e1424] border-slate-700'
                        : 'bg-[#0e1424] border-slate-800 hover:border-amber-500/40'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[8px] font-black uppercase px-1.5 py-0.2 rounded-full border ${
                            item.rarity === 'legendary'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : item.rarity === 'epic'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                              : item.rarity === 'rare'
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {item.rarity}
                        </span>
                        {item.previewColor && (
                          <div
                            className="w-4 h-4 rounded-full border border-amber-300/60 shadow flex-shrink-0"
                            style={{ backgroundColor: item.previewColor }}
                          />
                        )}
                      </div>
                      <h3 className="font-royal font-black text-xs text-slate-100 truncate">
                        {item.name}
                      </h3>
                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                        {item.description}
                      </p>
                    </div>

                    {/* Bottom Action */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      {isOwned ? (
                        <div className="w-full flex items-center justify-between">
                          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>Owned</span>
                          </span>

                          {equipped ? (
                            <span className="px-2.5 py-1 rounded-xl bg-amber-500 text-slate-950 font-black text-[10px]">
                              Active
                            </span>
                          ) : (
                            <button
                              onClick={() => handleEquip(item.id)}
                              className="px-2.5 py-1 rounded-xl bg-[#070b16] hover:bg-slate-800 text-amber-300 border border-slate-700 font-bold text-[10px] transition-all cursor-pointer"
                            >
                              Equip
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="w-full flex items-center justify-between">
                          <span className="flex items-center gap-1 font-black text-xs text-amber-300">
                            <Coins className="w-3.5 h-3.5 text-amber-400" />
                            <span>{item.price === 0 ? 'Free' : item.price.toLocaleString()}</span>
                          </span>

                          <button
                            onClick={() => handleBuy(item.id)}
                            className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 font-bold text-slate-950 text-[10px] shadow transition-all cursor-pointer flex items-center gap-1"
                          >
                            <ShoppingBag className="w-3 h-3" />
                            <span>Buy</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 2: COIN BUNDLES */}
        {activeTab === 'coins' && (
          <div className="space-y-2.5 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {COIN_PACKAGES.map((pkg) => (
                <div
                  key={pkg.id}
                  className="p-4 rounded-3xl bg-[#0e1424] border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between gap-2.5 relative overflow-hidden"
                >
                  {pkg.tag && (
                    <div className="absolute top-0 right-0 px-2.5 py-0.5 bg-gradient-to-l from-amber-500 to-yellow-400 text-slate-950 font-black text-[8px] uppercase tracking-wider rounded-bl-xl shadow">
                      {pkg.tag}
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
                        <Coins className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-royal font-black text-xs text-slate-100">
                          {pkg.name}
                        </h4>
                        <span className="text-[9px] text-emerald-400 font-bold">
                          +{pkg.bonusCoins.toLocaleString()} Bonus
                        </span>
                      </div>
                    </div>

                    <div className="pt-1 flex items-baseline gap-1.5">
                      <span className="text-xl font-black font-mono text-amber-300">
                        {(pkg.coins + pkg.bonusCoins).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-amber-400 font-bold">Coins</span>
                    </div>

                    <p className="text-[10px] text-slate-400 line-clamp-1">
                      {pkg.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <span className="font-black text-xs text-slate-100">
                      PKR {pkg.pricePKR.toLocaleString()}
                    </span>

                    <button
                      onClick={() => {
                        sound.playClick();
                        setSelectedPkgId(pkg.id);
                        setShowPaymentModal(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 font-royal font-black text-[10px] uppercase tracking-wider text-slate-950 shadow transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>Buy Now</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Global Payment Checkout Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        initialPackageId={selectedPkgId}
        onSuccess={() => {
          setUser(authService.getCurrentUser());
        }}
      />
    </div>
  );
};
