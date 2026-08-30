import { sound } from '../lib/audio';

export type MicPermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported';

export interface VoiceParticipant {
  userId: string;
  seat: number;
  username: string;
  isMuted: boolean;
  isSpeaking: boolean;
  volumeLevel: number;
}

export interface VoiceState {
  isMicMuted: boolean;
  isSpeakerMuted: boolean;
  permissionState: MicPermissionState;
  myVolume: number;
  isSpeaking: boolean;
  currentRoomId: string | null;
  participants: { [seat: number]: VoiceParticipant };
}

type VoiceListener = (state: VoiceState) => void;

class VoiceChatService {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyserNode: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animFrameId: number | null = null;
  private broadcastChannel: BroadcastChannel | null = null;

  private isMicMuted: boolean = true;
  private isSpeakerMuted: boolean = false;
  private permissionState: MicPermissionState = 'prompt';
  private currentRoomId: string | null = null;
  private mySeat: number = 0;
  private myUserId: string = '';
  private myUsername: string = '';
  private myVolume: number = 0;
  private isSpeaking: boolean = false;

  private participants: { [seat: number]: VoiceParticipant } = {};
  private listeners: VoiceListener[] = [];
  private botVoiceTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.initBroadcast();
    this.checkPermissionStatus();
  }

  private initBroadcast() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('royal_ludo_voice_channel');
        this.broadcastChannel.onmessage = (event) => {
          const { type, payload } = event.data || {};
          if (type === 'VOICE_SPEAKING') {
            this.handleRemoteSpeaking(payload);
          } else if (type === 'VOICE_MUTE_STATE') {
            this.handleRemoteMuteState(payload);
          }
        };
      } catch (e) {
        console.warn('Voice BroadcastChannel error', e);
      }
    }
  }

  private async checkPermissionStatus() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      this.permissionState = 'unsupported';
      this.notify();
      return;
    }
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        this.permissionState = (status.state as MicPermissionState) || 'prompt';
        status.onchange = () => {
          this.permissionState = (status.state as MicPermissionState) || 'prompt';
          this.notify();
        };
      } catch {
        // Fallback
      }
    }
  }

  public getState(): VoiceState {
    return {
      isMicMuted: this.isMicMuted,
      isSpeakerMuted: this.isSpeakerMuted,
      permissionState: this.permissionState,
      myVolume: this.myVolume,
      isSpeaking: this.isSpeaking,
      currentRoomId: this.currentRoomId,
      participants: { ...this.participants },
    };
  }

  public subscribe(listener: VoiceListener): () => void {
    this.listeners.push(listener);
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((l) => l(state));
  }

  public async joinRoom(roomId: string, seat: number, username: string, userId: string): Promise<void> {
    this.currentRoomId = roomId;
    this.mySeat = seat;
    this.myUsername = username;
    this.myUserId = userId;

    this.participants[seat] = {
      userId,
      seat,
      username,
      isMuted: this.isMicMuted,
      isSpeaking: false,
      volumeLevel: 0,
    };

    this.startBotVoiceSimulation();
    this.notify();
  }

  public leaveRoom(): void {
    this.stopAudioCapture();
    if (this.botVoiceTimer) clearInterval(this.botVoiceTimer);
    this.botVoiceTimer = null;
    this.currentRoomId = null;
    this.participants = {};
    this.isSpeaking = false;
    this.myVolume = 0;
    this.notify();
  }

  public async toggleMic(): Promise<boolean> {
    if (this.isMicMuted) {
      return await this.unmuteMic();
    } else {
      this.muteMic();
      return true;
    }
  }

  public async unmuteMic(): Promise<boolean> {
    sound.playClick();
    if (!this.mediaStream) {
      const success = await this.startAudioCapture();
      if (!success) return false;
    }

    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((track) => (track.enabled = true));
    }

    this.isMicMuted = false;
    this.broadcastMuteState(false);
    this.notify();
    return true;
  }

  public muteMic(): void {
    sound.playClick();
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((track) => (track.enabled = false));
    }
    this.isMicMuted = true;
    this.isSpeaking = false;
    this.myVolume = 0;
    this.broadcastMuteState(true);
    this.notify();
  }

  public toggleSpeaker(): void {
    sound.playClick();
    this.isSpeakerMuted = !this.isSpeakerMuted;
    this.notify();
  }

  private async startAudioCapture(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.permissionState = 'unsupported';
      this.notify();
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      this.mediaStream = stream;
      this.permissionState = 'granted';

      // Setup Web Audio Analyser
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }

        const source = this.audioContext.createMediaStreamSource(stream);
        this.analyserNode = this.audioContext.createAnalyser();
        this.analyserNode.fftSize = 256;
        this.analyserNode.smoothingTimeConstant = 0.5;

        source.connect(this.analyserNode);
        this.dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);

        this.startVolumePolling();
      }

      return true;
    } catch (err: any) {
      console.warn('Microphone permission error', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.permissionState = 'denied';
      } else {
        this.permissionState = 'unsupported';
      }
      this.notify();
      return false;
    }
  }

  private stopAudioCapture() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyserNode = null;
    this.dataArray = null;
  }

  private startVolumePolling() {
    const update = () => {
      if (!this.analyserNode || !this.dataArray || this.isMicMuted) {
        this.myVolume = 0;
        if (this.isSpeaking) {
          this.isSpeaking = false;
          this.broadcastSpeakingState(false, 0);
          this.notify();
        }
        if (!this.isMicMuted && this.mediaStream) {
          this.animFrameId = requestAnimationFrame(update);
        }
        return;
      }

      this.analyserNode.getByteFrequencyData(this.dataArray);
      let sum = 0;
      for (let i = 0; i < this.dataArray.length; i++) {
        sum += this.dataArray[i];
      }
      const avg = sum / this.dataArray.length;
      // Convert to percentage (0 - 100)
      const volumePercent = Math.min(100, Math.round((avg / 128) * 100));
      this.myVolume = volumePercent;

      const wasSpeaking = this.isSpeaking;
      const nowSpeaking = volumePercent > 12;

      if (wasSpeaking !== nowSpeaking || Math.abs(volumePercent - (this.participants[this.mySeat]?.volumeLevel || 0)) > 15) {
        this.isSpeaking = nowSpeaking;
        if (this.participants[this.mySeat]) {
          this.participants[this.mySeat].isSpeaking = nowSpeaking;
          this.participants[this.mySeat].volumeLevel = volumePercent;
        }
        this.broadcastSpeakingState(nowSpeaking, volumePercent);
        this.notify();
      }

      this.animFrameId = requestAnimationFrame(update);
    };

    this.animFrameId = requestAnimationFrame(update);
  }

  private broadcastSpeakingState(isSpeaking: boolean, volumeLevel: number) {
    if (this.broadcastChannel && this.currentRoomId) {
      this.broadcastChannel.postMessage({
        type: 'VOICE_SPEAKING',
        payload: {
          roomId: this.currentRoomId,
          seat: this.mySeat,
          userId: this.myUserId,
          username: this.myUsername,
          isSpeaking,
          volumeLevel,
        },
      });
    }
  }

  private broadcastMuteState(isMuted: boolean) {
    if (this.broadcastChannel && this.currentRoomId) {
      this.broadcastChannel.postMessage({
        type: 'VOICE_MUTE_STATE',
        payload: {
          roomId: this.currentRoomId,
          seat: this.mySeat,
          userId: this.myUserId,
          isMuted,
        },
      });
    }
  }

  private handleRemoteSpeaking(payload: {
    roomId: string;
    seat: number;
    userId: string;
    username: string;
    isSpeaking: boolean;
    volumeLevel: number;
  }) {
    if (!payload || payload.roomId !== this.currentRoomId || payload.seat === this.mySeat) return;

    if (!this.participants[payload.seat]) {
      this.participants[payload.seat] = {
        userId: payload.userId,
        seat: payload.seat,
        username: payload.username,
        isMuted: false,
        isSpeaking: payload.isSpeaking,
        volumeLevel: payload.volumeLevel,
      };
    } else {
      this.participants[payload.seat].isSpeaking = payload.isSpeaking;
      this.participants[payload.seat].volumeLevel = payload.volumeLevel;
    }

    this.notify();
  }

  private handleRemoteMuteState(payload: { roomId: string; seat: number; userId: string; isMuted: boolean }) {
    if (!payload || payload.roomId !== this.currentRoomId || payload.seat === this.mySeat) return;

    if (this.participants[payload.seat]) {
      this.participants[payload.seat].isMuted = payload.isMuted;
      if (payload.isMuted) {
        this.participants[payload.seat].isSpeaking = false;
        this.participants[payload.seat].volumeLevel = 0;
      }
      this.notify();
    }
  }

  private startBotVoiceSimulation() {
    if (this.botVoiceTimer) clearInterval(this.botVoiceTimer);

    // Randomly pulse bot speaking for immersion in AI / quick matches
    this.botVoiceTimer = setInterval(() => {
      if (!this.currentRoomId) return;

      const botSeats = [1, 2, 3];
      const randomSeat = botSeats[Math.floor(Math.random() * botSeats.length)];

      if (Math.random() > 0.65) {
        if (!this.participants[randomSeat]) {
          this.participants[randomSeat] = {
            userId: `bot_${randomSeat}`,
            seat: randomSeat,
            username: `AI Rival ${randomSeat}`,
            isMuted: false,
            isSpeaking: true,
            volumeLevel: 45,
          };
        } else {
          this.participants[randomSeat].isSpeaking = true;
          this.participants[randomSeat].volumeLevel = 50 + Math.floor(Math.random() * 30);
        }
        this.notify();

        setTimeout(() => {
          if (this.participants[randomSeat]) {
            this.participants[randomSeat].isSpeaking = false;
            this.participants[randomSeat].volumeLevel = 0;
            this.notify();
          }
        }, 1800 + Math.random() * 1500);
      }
    }, 9000);
  }
}

export const voiceChatService = new VoiceChatService();
