import React, { useState, useEffect } from 'react';
import { Lock, Shield, Sparkles, X, Check, KeyRound } from 'lucide-react';
import { sound } from '../../lib/audio';
import { chatSecurityService } from '../../services/chatSecurityService';

interface ChatPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ChatPinModal: React.FC<ChatPinModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(null);
      setShake(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigitInput(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pin]);

  if (!isOpen) return null;

  const handleDigitInput = (digit: string) => {
    if (pin.length >= 4) return;
    sound.playClick();
    const newPin = pin + digit;
    setPin(newPin);
    setError(null);

    if (newPin.length === 4) {
      validatePin(newPin);
    }
  };

  const handleBackspace = () => {
    if (pin.length > 0) {
      sound.playClick();
      setPin(pin.slice(0, -1));
      setError(null);
    }
  };

  const handleClear = () => {
    sound.playClick();
    setPin('');
    setError(null);
  };

  const validatePin = (inputPin: string) => {
    const isCorrect = chatSecurityService.verifyPin(inputPin);
    if (isCorrect) {
      sound.playHomeGoal();
      onSuccess();
      onClose();
    } else {
      sound.playTimerWarning();
      setError('Incorrect Security PIN! Try default "1234" or your custom PIN.');
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setPin('');
      }, 700);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl animate-fade-in">
      <div
        className={`w-full max-w-sm bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950/40 border-2 border-amber-500/50 rounded-3xl p-6 shadow-2xl space-y-5 relative text-center transition-all ${
          shake ? 'animate-bounce border-rose-500 shadow-rose-500/30' : ''
        }`}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 cursor-pointer p-1 rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Security Shield Icon */}
        <div className="relative mx-auto w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-300 p-0.5 shadow-xl shadow-amber-500/30 flex items-center justify-center">
          <div className="w-full h-full rounded-3xl bg-slate-950 flex items-center justify-center">
            <Lock className="w-8 h-8 text-amber-300 animate-pulse" />
          </div>
        </div>

        {/* Header Title */}
        <div className="space-y-1">
          <h3 className="font-royal font-black text-xl text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-400">
            Realm Chat Security
          </h3>
          <p className="text-xs text-slate-300">
            Enter 4-digit security PIN to access the Imperial Court
          </p>
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold">
            Default Code: 1234
          </span>
        </div>

        {/* 4 PIN Dots */}
        <div className="flex items-center justify-center gap-4 py-2">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'bg-gradient-to-tr from-amber-400 to-yellow-300 scale-125 shadow-lg shadow-amber-400/60 ring-2 ring-amber-400/80'
                    : 'bg-slate-800 border border-slate-700'
                }`}
              />
            );
          })}
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-semibold text-center animate-pulse">
            {error}
          </div>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigitInput(digit)}
              className="h-12 rounded-2xl bg-slate-950/80 hover:bg-amber-500/20 border border-slate-800 hover:border-amber-500/50 text-slate-100 hover:text-amber-300 font-royal font-bold text-lg transition-all active:scale-95 cursor-pointer shadow flex items-center justify-center"
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={handleClear}
            className="h-12 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 font-bold text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer flex items-center justify-center"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={() => handleDigitInput('0')}
            className="h-12 rounded-2xl bg-slate-950/80 hover:bg-amber-500/20 border border-slate-800 hover:border-amber-500/50 text-slate-100 hover:text-amber-300 font-royal font-bold text-lg transition-all active:scale-95 cursor-pointer shadow flex items-center justify-center"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            className="h-12 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 font-bold text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer flex items-center justify-center"
          >
            ⌫
          </button>
        </div>

        {/* Footer info */}
        <p className="text-[11px] text-slate-500 pt-1">
          You can change or disable this PIN in Chamber Settings.
        </p>
      </div>
    </div>
  );
};
