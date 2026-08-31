/**
 * Royal Ludo Realm Chat Privacy & Security Service
 * Controls visibility (3-click stealth hide / settings toggle) and 4-digit PIN lock protection.
 */

export interface ChatSecurityConfig {
  isChatHidden: boolean;
  isPinRequired: boolean;
  pinCode: string; // Default: '1234'
}

const STORAGE_KEY = 'royal_ludo_chat_security_cfg';
const DEFAULT_PIN = '1234';

class ChatSecurityService {
  private config: ChatSecurityConfig = {
    isChatHidden: false,
    isPinRequired: true,
    pinCode: DEFAULT_PIN,
  };

  private listeners: (() => void)[] = [];

  constructor() {
    this.load();
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
          this.load();
          this.notify();
        }
      });
      window.addEventListener('royal_ludo_chat_security_sync', () => {
        this.load();
        this.notify();
      });
    }
  }

  private load(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.config = {
          isChatHidden: !!parsed.isChatHidden,
          isPinRequired: parsed.isPinRequired !== undefined ? !!parsed.isPinRequired : true,
          pinCode: typeof parsed.pinCode === 'string' && parsed.pinCode.length === 4 ? parsed.pinCode : DEFAULT_PIN,
        };
        return;
      }
    } catch (e) {
      console.warn('Error reading chat security settings:', e);
    }
    this.config = {
      isChatHidden: false,
      isPinRequired: true,
      pinCode: DEFAULT_PIN,
    };
  }

  private save(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
      window.dispatchEvent(new CustomEvent('royal_ludo_chat_security_sync'));
      this.notify();
    } catch (e) {
      console.warn('Error saving chat security settings:', e);
    }
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public getConfig(): ChatSecurityConfig {
    return { ...this.config };
  }

  public isChatHidden(): boolean {
    return this.config.isChatHidden;
  }

  public setChatHidden(hidden: boolean): void {
    this.config.isChatHidden = hidden;
    this.save();
  }

  public toggleChatHidden(): boolean {
    this.config.isChatHidden = !this.config.isChatHidden;
    this.save();
    return this.config.isChatHidden;
  }

  public isPinRequired(): boolean {
    return this.config.isPinRequired;
  }

  public setPinRequired(required: boolean): void {
    this.config.isPinRequired = required;
    this.save();
  }

  public getPinCode(): string {
    return this.config.pinCode || DEFAULT_PIN;
  }

  public setPinCode(newPin: string): boolean {
    const clean = newPin.trim();
    if (/^\d{4}$/.test(clean)) {
      this.config.pinCode = clean;
      this.save();
      return true;
    }
    return false;
  }

  public verifyPin(enteredPin: string): boolean {
    const clean = enteredPin.trim();
    const currentPin = this.config.pinCode || DEFAULT_PIN;
    return clean === currentPin;
  }

  public resetToDefault(): void {
    this.config = {
      isChatHidden: false,
      isPinRequired: true,
      pinCode: DEFAULT_PIN,
    };
    this.save();
  }
}

export const chatSecurityService = new ChatSecurityService();
