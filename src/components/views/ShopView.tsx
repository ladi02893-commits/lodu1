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
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center pb-16 overflow-x-hidden">
      {/* Header */}
      <header className="w-full max-w-4xl px-4 py-4 flex items-center justify-between border-b border-amber-500/20 bg-slate-950/80 sticky top-0 z-20 backdrop-blur-md">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-300 transition-all cursor-pointer text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Court</span>
        </button>

        <h2 className="font-royal font-bold text-sm sm:text-base text-amber-300">
          Royal Bazaar & Vault
        </h2>

        {/* Currency Purse with Buy Coins Plus */}
        <button
          onClick={() => {
            sound.playClick();
            setSelectedPkgId(undefined);
            setShowPaymentModal(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 border border-amber-500/40 text-amber-300 font-bold text-xs hover:border-amber-400 transition-all cursor-pointer shadow-lg"
          title="Buy Coins"
        >
          <Coins className="w-4 h-4 text-amber-400" />
          <span>{user.coins.toLocaleString()}</span>
          <Plus className="w-3.5 h-3.5 text-amber-400 ml-0.5" />
        </button>
      </header>

      <main className="w-full max-w-3xl px-4 py-6 space-y-6">
        {/* Feedback Alert */}
        {feedback && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border-2 border-amber-400 text-amber-200 text-xs font-bold text-center animate-fade-in shadow-xl">
            {feedback}
          </div>
        )}

        {/* Buy Coins Big Feature Card */}
        <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-yellow-950/80 border-2 border-amber-500/50 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 text-left">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 shadow-lg flex-shrink-0">
              <Coins className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-royal font-bold text-sm sm:text-base text-amber-200">
                  Buy Imperial Coins Treasury
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black border border-amber-400/40">
                  UP TO +33% FREE BONUS
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Instant delivery via JazzCash, EasyPaisa, Meezan Bank, Raast & UPI.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              setSelectedPkgId(undefined);
              setShowPaymentModal(true);
            }}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 font-royal font-extrabold text-xs uppercase tracking-wider text-slate-950 shadow-xl shadow-amber-500/30 active:scale-95 transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Open Coin Store</span>
          </button>
        </div>

        {/* Top Level Section Switcher (Cosmetics vs Coin Bundles) */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('cosmetics');
            }}
            className={`py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'cosmetics'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Cosmetics & Boards</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('coins');
            }}
            className={`py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'coins'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>Coin Packages & Vault</span>
          </button>
        </div>

        {/* SECTION 1: COSMETICS CATALOG */}
        {activeTab === 'cosmetics' && (
          <div className="space-y-5 animate-fade-in">
            {/* Promo Code Redemption Card */}
            <div className="p-4 rounded-3xl bg-slate-900/90 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 flex-shrink-0">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-royal font-bold text-xs sm:text-sm text-amber-200">
                    Redeem Royal Gift Code
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Got a royal promotional code? Enter below to claim bonus gold.
                  </p>
                </div>
              </div>

              <form onSubmit={handleRedeemPromo} className="w-full sm:w-auto flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. ROYAL2026"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  className="w-full sm:w-36 bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-200 uppercase outline-none focus:ring-1 focus:ring-amber-400"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 font-bold text-slate-950 text-xs shadow cursor-pointer flex-shrink-0"
                >
                  Redeem
                </button>
              </form>
            </div>

            {/* Category Filter Tabs */}
            <div className="grid grid-cols-5 gap-1.5 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 text-[11px] sm:text-xs">
              <button
                onClick={() => setFilterType('dice')}
                className={`py-2 rounded-xl font-bold transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 ${
                  filterType === 'dice'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Dice5 className="w-4 h-4" />
                <span>Dice</span>
              </button>

              <button
                onClick={() => setFilterType('board')}
                className={`py-2 rounded-xl font-bold transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 ${
                  filterType === 'board'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span>Boards</span>
              </button>

              <button
                onClick={() => setFilterType('token')}
                className={`py-2 rounded-xl font-bold transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 ${
                  filterType === 'token'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Tokens</span>
              </button>

              <button
                onClick={() => setFilterType('avatar')}
                className={`py-2 rounded-xl font-bold transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 ${
                  filterType === 'avatar'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Avatars</span>
              </button>

              <button
                onClick={() => setFilterType('frame')}
                className={`py-2 rounded-xl font-bold transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 ${
                  filterType === 'frame'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Circle className="w-4 h-4" />
                <span>Frames</span>
              </button>
            </div>

            {/* Catalog Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {catalog.map((item) => {
                const isOwned = ownedItems.includes(item.id);
                const equipped = isEquipped(item);

                return (
                  <div
                    key={item.id}
                    className={`p-5 rounded-3xl border transition-all duration-200 flex flex-col justify-between gap-4 ${
                      equipped
                        ? 'bg-amber-950/30 border-amber-400/80 shadow-lg shadow-amber-500/10'
                        : isOwned
                        ? 'bg-slate-900 border-slate-700'
                        : 'bg-slate-900/60 border-slate-800 hover:border-amber-500/40'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
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
                        <h3 className="font-royal font-bold text-sm text-slate-100 mt-1">
                          {item.name}
                        </h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      {item.previewColor && (
                        <div
                          className="w-8 h-8 rounded-full border-2 border-amber-300/60 shadow flex-shrink-0"
                          style={{ backgroundColor: item.previewColor }}
                        />
                      )}
                    </div>

                    {/* Bottom Action */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      {isOwned ? (
                        <div className="w-full flex items-center justify-between">
                          <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Owned</span>
                          </span>

                          {equipped ? (
                            <span className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs">
                              Equipped
                            </span>
                          ) : (
                            <button
                              onClick={() => handleEquip(item.id)}
                              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs transition-all cursor-pointer"
                            >
                              Equip
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="w-full flex items-center justify-between">
                          <span className="flex items-center gap-1 font-black text-sm text-amber-300">
                            <Coins className="w-4 h-4 text-amber-400" />
                            <span>{item.price === 0 ? 'Free' : item.price.toLocaleString()}</span>
                          </span>

                          <button
                            onClick={() => handleBuy(item.id)}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 font-bold text-slate-950 text-xs shadow transition-all cursor-pointer flex items-center gap-1"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Acquire</span>
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
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {COIN_PACKAGES.map((pkg) => (
                <div
                  key={pkg.id}
                  className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-all flex flex-col justify-between gap-3 relative overflow-hidden"
                >
                  {pkg.tag && (
                    <div className="absolute top-0 right-0 px-3 py-0.5 bg-gradient-to-l from-amber-500 to-amber-600 text-slate-950 font-black text-[9px] uppercase tracking-wider rounded-bl-xl shadow">
                      {pkg.tag}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
                        <Coins className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-royal font-bold text-sm text-slate-100">
                          {pkg.name}
                        </h4>
                        <span className="text-[10px] text-emerald-400 font-bold">
                          +{pkg.bonusCoins.toLocaleString()} Bonus Included
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-black font-mono text-amber-300">
                        {(pkg.coins + pkg.bonusCoins).toLocaleString()}
                      </span>
                      <span className="text-xs text-amber-400 font-bold">Coins</span>
                    </div>

                    <p className="text-xs text-slate-400">
                      {pkg.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                    <span className="font-black text-sm text-slate-100">
                      PKR {pkg.pricePKR.toLocaleString()}
                    </span>

                    <button
                      onClick={() => {
                        sound.playClick();
                        setSelectedPkgId(pkg.id);
                        setShowPaymentModal(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 font-bold text-xs uppercase tracking-wider text-slate-950 shadow transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>Buy via Jazz/Easy/Bank</span>
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
