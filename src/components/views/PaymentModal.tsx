import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Check,
  Clock,
  Coins,
  Copy,
  CreditCard,
  Crown,
  History,
  QrCode,
  RefreshCw,
  Shield,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { sound } from '../../lib/audio';
import { authService } from '../../services/authService';
import { COIN_PACKAGES, PAYMENT_METHODS, PaymentMethodConfig, paymentService } from '../../services/paymentService';
import { CoinPackage, DepositRequestRecord, UserProfile } from '../../types/database';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPackageId?: string;
  onSuccess?: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  initialPackageId,
  onSuccess,
}) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => authService.getCurrentUser());
  const [activeTab, setActiveTab] = useState<'packages' | 'history'>('packages');
  const [selectedPkg, setSelectedPkg] = useState<CoinPackage | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodConfig>(PAYMENT_METHODS[0]);
  const [customCoins, setCustomCoins] = useState<string>('25000');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  // Form states
  const [senderInfo, setSenderInfo] = useState('');
  const [trxId, setTrxId] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [step, setStep] = useState<'catalog' | 'checkout' | 'confirmation'>('catalog');

  // History state
  const [userDeposits, setUserDeposits] = useState<DepositRequestRecord[]>([]);
  const [isRefreshingHistory, setIsRefreshingHistory] = useState(false);

  useEffect(() => {
    const unsub = authService.subscribe((u) => {
      if (u) setCurrentUser(u);
    });
    return () => unsub();
  }, []);

  const refreshHistory = async () => {
    setIsRefreshingHistory(true);
    try {
      const latest = await paymentService.fetchUserRequests(currentUser.id);
      setUserDeposits(latest);
    } catch (e) {
      console.warn(e);
      setUserDeposits(paymentService.getUserRequests(currentUser.id));
    } finally {
      setIsRefreshingHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshHistory();
      if (initialPackageId) {
        const found = COIN_PACKAGES.find((p) => p.id === initialPackageId);
        if (found) {
          setSelectedPkg(found);
          setIsCustomMode(false);
          setStep('checkout');
        }
      }
    }
  }, [isOpen, initialPackageId, currentUser.id]);

  useEffect(() => {
    const unsub = paymentService.subscribe((requests) => {
      setUserDeposits(requests.filter((r) => r.user_id === currentUser.id));
    });

    const handleApproval = (e: any) => {
      sound.playPaymentApproved();
      refreshHistory();
      const coins = e.detail?.coins || 0;
      setFormSuccess(`🎉 Payment Approved! +${coins.toLocaleString()} Coins credited to your wallet!`);
    };

    window.addEventListener('royal_ludo_deposit_approved', handleApproval);
    window.addEventListener('royal_ludo_sync', refreshHistory);

    return () => {
      unsub();
      window.removeEventListener('royal_ludo_deposit_approved', handleApproval);
      window.removeEventListener('royal_ludo_sync', refreshHistory);
    };
  }, [currentUser.id]);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    sound.playClick();
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2500);
  };

  const handleSelectPackage = (pkg: CoinPackage) => {
    sound.playClick();
    setSelectedPkg(pkg);
    setIsCustomMode(false);
    setFormError(null);
    setStep('checkout');
  };

  const handleCustomModeSelect = () => {
    sound.playClick();
    setIsCustomMode(true);
    setSelectedPkg(null);
    setFormError(null);
    setStep('checkout');
  };

  const calculatedCustomPricePKR = () => {
    const c = parseInt(customCoins, 10) || 10000;
    return Math.round((c / 5000) * 150);
  };

  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      if (selectedMethod.isInstantSupported) {
        // Instant Sandbox Gateway auto checkout
        const pkgId = selectedPkg ? selectedPkg.id : 'pkg_custom';
        const res = paymentService.instantSandboxCheckout(pkgId);
        if (res.success) {
          sound.playHomeGoal();
          setFormSuccess(res.message);
          setStep('confirmation');
          if (onSuccess) onSuccess();
        }
      } else {
        const pkgId = selectedPkg ? selectedPkg.id : 'pkg_custom';
        const coinsVal = isCustomMode ? parseInt(customCoins, 10) || 10000 : undefined;
        const priceVal = isCustomMode ? calculatedCustomPricePKR() : undefined;

        const res = await paymentService.createDepositRequest({
          packageId: pkgId,
          paymentMethod: selectedMethod.id,
          senderAccountOrName: senderInfo,
          transactionReferenceId: trxId,
          customCoins: coinsVal,
          customPricePKR: priceVal,
        });

        if (res.success) {
          sound.playHomeGoal();
          setFormSuccess(res.message);
          setStep('confirmation');
          setSenderInfo('');
          setTrxId('');
          if (onSuccess) onSuccess();
        } else {
          setFormError(res.message);
        }
      }
    } catch (err: any) {
      setFormError(err?.message || 'Failed to submit payment request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMethodIcon = (iconName: string) => {
    switch (iconName) {
      case 'smartphone':
        return <Smartphone className="w-5 h-5" />;
      case 'building-2':
        return <Building2 className="w-5 h-5" />;
      case 'qr-code':
        return <QrCode className="w-5 h-5" />;
      case 'credit-card':
        return <CreditCard className="w-5 h-5" />;
      case 'wallet':
        return <Wallet className="w-5 h-5" />;
      default:
        return <Coins className="w-5 h-5" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xl animate-fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 p-0.5 shadow flex items-center justify-center">
              <div className="w-full h-full rounded-2xl bg-slate-950 flex items-center justify-center">
                <Coins className="w-5 h-5 text-amber-300" />
              </div>
            </div>
            <div>
              <h3 className="font-royal font-black text-base sm:text-lg text-amber-300">
                Imperial Treasury Bazaar
              </h3>
              <p className="text-[11px] text-slate-400">
                Buy coins instantly with JazzCash, EasyPaisa, Bank, UPI & Instant Gateway.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300 font-bold text-xs">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>{currentUser.coins.toLocaleString()}</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-950 border border-slate-800">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('packages');
              setStep('catalog');
            }}
            className={`py-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'packages'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Coin Packages</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('history');
            }}
            className={`py-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>My Deposit Requests ({userDeposits.length})</span>
          </button>
        </div>

        {/* TAB 1: COIN PACKAGES CATALOG */}
        {activeTab === 'packages' && step === 'catalog' && (
          <div className="space-y-4 animate-fade-in">
            {/* Packages Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {COIN_PACKAGES.map((pkg) => (
                <div
                  key={pkg.id}
                  className="p-4 rounded-3xl bg-slate-950/70 border border-slate-800 hover:border-amber-400/60 hover:bg-slate-950 transition-all flex flex-col justify-between gap-3 group relative overflow-hidden"
                >
                  {pkg.tag && (
                    <div className="absolute top-0 right-0 px-3 py-0.5 bg-gradient-to-l from-amber-500 to-amber-600 text-slate-950 font-black text-[9px] uppercase tracking-wider rounded-bl-xl shadow">
                      {pkg.tag}
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
                        <Coins className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-royal font-bold text-sm text-slate-100 group-hover:text-amber-300 transition-colors">
                          {pkg.name}
                        </h4>
                        <span className="text-[10px] text-emerald-400 font-bold">
                          +{pkg.bonusCoins.toLocaleString()} Free Bonus Coins
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-baseline gap-1.5">
                      <span className="text-xl sm:text-2xl font-black font-mono text-amber-300">
                        {(pkg.coins + pkg.bonusCoins).toLocaleString()}
                      </span>
                      <span className="text-xs text-amber-400 font-bold">Coins</span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {pkg.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-black text-slate-100">
                        PKR {pkg.pricePKR.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        ~  USD
                      </span>
                    </div>

                    <button
                      onClick={() => handleSelectPackage(pkg)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 font-royal font-bold text-xs uppercase tracking-wider text-slate-950 shadow transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>Buy Now</span>
                    </button>
                  </div>
                </div>
              ))}

              {/* Custom Coin Amount Card */}
              <div className="p-4 rounded-3xl bg-slate-950/70 border border-purple-500/40 hover:border-purple-400 transition-all flex flex-col justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-royal font-bold text-sm text-purple-200">
                        Custom Coin Amount
                      </h4>
                      <span className="text-[10px] text-purple-400 font-bold">
                        Apni marzi ki coins amount select karein
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <input
                      type="number"
                      value={customCoins}
                      onChange={(e) => setCustomCoins(e.target.value)}
                      placeholder="e.g. 50000"
                      className="w-full bg-slate-900 border border-purple-500/40 rounded-xl px-3 py-2 text-sm font-bold text-amber-200 outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-300">Estimated Cost:</span>
                    <span className="text-sm font-black text-amber-300">
                      PKR {calculatedCustomPricePKR().toLocaleString()}
                    </span>
                  </div>

                  <button
                    onClick={handleCustomModeSelect}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 font-royal font-bold text-xs uppercase tracking-wider text-white shadow transition-all cursor-pointer"
                  >
                    Proceed
                  </button>
                </div>
              </div>
            </div>

            {/* Instant Test Sandbox Banner */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/60 to-indigo-950/60 border border-purple-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-purple-300 flex-shrink-0" />
                <div className="text-left">
                  <span className="text-xs font-bold text-purple-200 block">
                    Instant Demo Test Checkout Available
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Want to test coins immediately without manual TRX? Select Instant Sandbox Gateway in checkout!
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: CHECKOUT & PAYMENT METHOD */}
        {activeTab === 'packages' && step === 'checkout' && (
          <div className="space-y-5 animate-fade-in">
            {/* Selected Package Header */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setStep('catalog')}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
                  title="Back to Packages"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h4 className="font-royal font-bold text-sm text-amber-300">
                    {selectedPkg ? selectedPkg.name : `Custom Pack (${parseInt(customCoins, 10).toLocaleString()} Coins)`}
                  </h4>
                  <span className="text-xs text-slate-400">
                    Total: {selectedPkg ? (selectedPkg.coins + selectedPkg.bonusCoins).toLocaleString() : parseInt(customCoins, 10).toLocaleString()} Coins • PKR {selectedPkg ? selectedPkg.pricePKR.toLocaleString() : calculatedCustomPricePKR().toLocaleString()}
                  </span>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-xs font-mono">
                PKR {selectedPkg ? selectedPkg.pricePKR.toLocaleString() : calculatedCustomPricePKR().toLocaleString()}
              </span>
            </div>

            {/* Payment Method Selector Grid */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Select Payment Method:
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((method) => {
                  const isSelected = selectedMethod.id === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setSelectedMethod(method);
                        setFormError(null);
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                        isSelected
                          ? 'bg-amber-950/40 border-amber-400 shadow-md ring-1 ring-amber-400/50'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center border"
                          style={{
                            backgroundColor: `${method.color}20`,
                            borderColor: `${method.color}60`,
                            color: method.color,
                          }}
                        >
                          {getMethodIcon(method.icon)}
                        </div>
                        {method.badge && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase"
                            style={{
                              backgroundColor: `${method.color}30`,
                              color: method.color,
                            }}
                          >
                            {method.badge}
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="font-bold text-xs text-slate-100 block truncate">
                          {method.name.split('/')[0]}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {method.currency}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payment Instructions Box */}
            <div className="p-4 rounded-3xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>Transfer Details ({selectedMethod.name})</span>
                </span>
                <span className="text-[10px] text-slate-400">Official Merchant</span>
              </div>

              {/* Account Details Display */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">
                    Account Title:
                  </span>
                  <div className="font-bold text-slate-100">{selectedMethod.accountTitle}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">
                      Account / Number / Till:
                    </span>
                    <div className="font-mono font-bold text-amber-300 text-sm">
                      {selectedMethod.accountNumber}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedMethod.accountNumber, 'acc')}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 cursor-pointer"
                    title="Copy Account Number"
                  >
                    {copied === 'acc' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {selectedMethod.iban && (
                  <div className="col-span-1 sm:col-span-2 p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">
                        IBAN ({selectedMethod.bankName}):
                      </span>
                      <div className="font-mono font-bold text-slate-200 text-xs break-all">
                        {selectedMethod.iban}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedMethod.iban!, 'iban')}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 cursor-pointer"
                      title="Copy IBAN"
                    >
                      {copied === 'iban' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed">
                {selectedMethod.instructions}
              </div>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-950 border border-rose-500/40 text-rose-200 text-xs font-bold text-center">
                {formError}
              </div>
            )}

            {/* Submission Form */}
            <form onSubmit={handleSubmitDeposit} className="space-y-3.5">
              {!selectedMethod.isInstantSupported ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Sender Mobile / Account Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 0301-7654321 or Ali Khan"
                        value={senderInfo}
                        onChange={(e) => setSenderInfo(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 outline-none focus:border-amber-400"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Transaction ID (TRX / UTR / Reference)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 849201938472 or TX-9921"
                        value={trxId}
                        onChange={(e) => setTrxId(e.target.value.toUpperCase())}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-amber-300 outline-none focus:border-amber-400"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 font-royal font-black text-xs uppercase tracking-wider text-slate-950 shadow-xl shadow-amber-500/20 hover:brightness-110 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Submitting Transfer Proof...' : 'Submit Deposit Request'}
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-purple-950/60 border border-purple-500/40 text-xs text-purple-200">
                    <strong>Instant Sandbox Mode:</strong> Click below to simulate instant payment clearance. Your coin balance will be updated immediately.
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 font-royal font-black text-xs uppercase tracking-wider text-white shadow-xl shadow-purple-500/30 hover:brightness-110 active:scale-98 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>{isSubmitting ? 'Processing Test Card...' : 'Instant 1-Click Test Checkout'}</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

        {/* STEP 3: CONFIRMATION */}
        {activeTab === 'packages' && step === 'confirmation' && (
          <div className="p-6 rounded-3xl bg-slate-950 border-2 border-emerald-500/40 text-center space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400/50 mx-auto flex items-center justify-center text-emerald-400 shadow-xl">
              <Check className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h4 className="font-royal font-black text-lg text-emerald-300">
                Payment Request Submitted!
              </h4>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                {formSuccess || 'Your deposit request has been logged. Admin will verify and credit your coins to your vault shortly!'}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => {
                  sound.playClick();
                  setActiveTab('history');
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs text-slate-200 transition-all cursor-pointer"
              >
                View Status in History
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 font-bold text-xs text-slate-950 transition-all cursor-pointer"
              >
                Return to Game
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: MY DEPOSIT HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
              <span>Your Recent Coin Orders ({userDeposits.length})</span>
              <button
                onClick={refreshHistory}
                disabled={isRefreshingHistory}
                className="text-amber-400 hover:text-amber-300 font-semibold cursor-pointer text-[11px] flex items-center gap-1 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg hover:border-amber-500/40 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshingHistory ? 'animate-spin' : ''}`} />
                <span>{isRefreshingHistory ? 'Syncing...' : 'Refresh Status'}</span>
              </button>
            </div>

            {userDeposits.length === 0 ? (
              <div className="p-8 rounded-3xl bg-slate-950 border border-slate-800 text-center space-y-2">
                <Coins className="w-8 h-8 text-slate-600 mx-auto" />
                <h4 className="font-royal font-bold text-sm text-slate-300">No Deposit Orders Yet</h4>
                <p className="text-xs text-slate-500">
                  Select a coin package to place your first imperial purchase.
                </p>
                <button
                  onClick={() => {
                    setActiveTab('packages');
                    setStep('catalog');
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer hover:brightness-110 mt-2"
                >
                  Browse Coin Packages
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {userDeposits.map((dep) => (
                  <div
                    key={dep.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-100">
                          +{dep.coins_amount.toLocaleString()} Coins
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-300">
                          ({dep.currency} {dep.fiat_amount})
                        </span>
                        <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                          {dep.payment_method}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 font-mono">
                        TRX ID: <strong className="text-slate-200">{dep.transaction_reference_id}</strong> • From: {dep.sender_account_or_name}
                      </div>

                      {dep.admin_note && (
                        <div className="text-[10px] text-amber-300 font-medium">
                          Note: {dep.admin_note}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold font-mono uppercase border ${
                          dep.status === 'approved'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                            : dep.status === 'rejected'
                            ? 'bg-rose-950 text-rose-300 border-rose-500/40'
                            : 'bg-amber-950 text-amber-300 border-amber-500/40 animate-pulse'
                        }`}
                      >
                        {dep.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
