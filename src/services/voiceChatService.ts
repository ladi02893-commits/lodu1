import { sound } from '../lib/audio';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

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
  errorMessage: string | null;
}

type VoiceListener = (state: VoiceState) => void;

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

class VoiceChatService {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyserNode: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animFrameId: number | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private realtimeChannel: RealtimeChannel | null = null;

  // WebRTC Peer Connections for multi-device audio
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private remoteAudioElements: Map<string, HTMLAudioElement> = new Map();

  // Local Web Audio streamer for same-machine tabs
  private mediaRecorder: MediaRecorder | null = null;

  private isMicMuted: boolean = true;
  private isSpeakerMuted: boolean = false;
  private permissionState: MicPermissionState = 'prompt';
  private currentRoomId: string | null = null;
  private mySeat: number = 0;
  private myUserId: string = '';
  private myUsername: string = '';
  private myVolume: number = 0;
  private isSpeaking: boolean = false;
  private errorMessage: string | null = null;

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
          } else if (type === 'VOICE_AUDIO_CHUNK') {
            this.handleLocalAudioChunk(payload);
          } else if (type === 'WEBRTC_SIGNAL') {
            this.handleWebRTCSignal(payload);
          }
        };
      } catch (e) {
        console.warn('Voice BroadcastChannel error', e);
      }
    }
  }

  private subscribeToSupabaseVoice(roomId: string) {
    if (!isSupabaseConfigured || !roomId) return;
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
      this.realtimeChannel = null;
    }

    try {
      const cleanId = roomId.replace(/[^a-zA-Z0-9_-]/g, '_');
      this.realtimeChannel = supabase.channel(`voice_${cleanId}`, {
        config: { broadcast: { self: false } },
      });

      this.realtimeChannel
        .on('broadcast', { event: 'VOICE_SPEAKING' }, (payload) => {
          if (payload.payload) this.handleRemoteSpeaking(payload.payload);
        })
        .on('broadcast', { event: 'VOICE_MUTE_STATE' }, (payload) => {
          if (payload.payload) this.handleRemoteMuteState(payload.payload);
        })
        .on('broadcast', { event: 'WEBRTC_SIGNAL' }, (payload) => {
          if (payload.payload) this.handleWebRTCSignal(payload.payload);
        })
        .subscribe();
    } catch (e) {
      console.warn('Supabase voice channel error:', e);
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
      errorMessage: this.errorMessage,
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
    this.errorMessage = null;

    this.participants[seat] = {
      userId,
      seat,
      username,
      isMuted: this.isMicMuted,
      isSpeaking: false,
      volumeLevel: 0,
    };

    this.subscribeToSupabaseVoice(roomId);
    this.startBotVoiceSimulation();
    this.notify();
  }

  public leaveRoom(): void {
    this.stopAudioCapture();
    this.closeAllPeerConnections();

    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
      this.realtimeChannel = null;
    }
    if (this.botVoiceTimer) clearInterval(this.botVoiceTimer);
    this.botVoiceTimer = null;
    this.currentRoomId = null;
    this.participants = {};
    this.isSpeaking = false;
    this.myVolume = 0;
    this.errorMessage = null;
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
    this.errorMessage = null;

    if (!this.mediaStream) {
      const success = await this.startAudioCapture();
      if (!success) return false;
    }

    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((track) => (track.enabled = true));
    }

    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (e) {
        console.warn(e);
      }
    }

    this.isMicMuted = false;
    this.startLocalAudioStreaming();
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
    this.stopLocalAudioStreaming();
    this.broadcastMuteState(true);
    this.notify();
  }

  public toggleSpeaker(): void {
    sound.playClick();
    this.isSpeakerMuted = !this.isSpeakerMuted;

    // Apply speaker mute state to all remote audio elements
    this.remoteAudioElements.forEach((audio) => {
      audio.muted = this.isSpeakerMuted;
    });

    this.notify();
  }

  private async startAudioCapture(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.permissionState = 'unsupported';
      this.errorMessage = 'Microphone is not supported in this browser.';
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
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

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

      // Connect track to WebRTC peers if in room
      this.updatePeerAudioTracks();

      return true;
    } catch (err: any) {
      console.warn('Microphone permission error', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.permissionState = 'denied';
        this.errorMessage = 'Microphone permission was denied. Please allow microphone access in browser settings.';
      } else {
        this.permissionState = 'unsupported';
        this.errorMessage = 'Could not access audio device: ' + (err.message || 'Unknown error');
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
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (e) {
        console.warn(e);
      }
      this.audioContext = null;
    }
    this.stopLocalAudioStreaming();
  }

  private startVolumePolling() {
    const checkVolume = () => {
      if (!this.analyserNode || !this.dataArray || this.isMicMuted) {
        if (this.myVolume > 0 || this.isSpeaking) {
          this.myVolume = 0;
          this.isSpeaking = false;
          this.broadcastSpeaking(false, 0);
          this.notify();
        }
        this.animFrameId = requestAnimationFrame(checkVolume);
        return;
      }

      this.analyserNode.getByteFrequencyData(this.dataArray);
      let sum = 0;
      for (let i = 0; i < this.dataArray.length; i++) {
        sum += this.dataArray[i];
      }
      const avg = sum / this.dataArray.length;
      const normalizedVolume = Math.min(100, Math.round((avg / 128) * 100));

      const isNowSpeaking = normalizedVolume > 14;
      const changed = isNowSpeaking !== this.isSpeaking || Math.abs(normalizedVolume - this.myVolume) > 5;

      this.myVolume = normalizedVolume;
      this.isSpeaking = isNowSpeaking;

      if (changed) {
        if (this.participants[this.mySeat]) {
          this.participants[this.mySeat].isSpeaking = isNowSpeaking;
          this.participants[this.mySeat].volumeLevel = normalizedVolume;
        }
        this.broadcastSpeaking(isNowSpeaking, normalizedVolume);
        this.notify();
      }

      this.animFrameId = requestAnimationFrame(checkVolume);
    };

    this.animFrameId = requestAnimationFrame(checkVolume);
  }

  // --- Real-time Local Audio Chunk Streaming (Same machine / Multi-tab) ---
  private startLocalAudioStreaming() {
    if (!this.mediaStream || typeof MediaRecorder === 'undefined') return;
    try {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }

      const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? { mimeType: 'audio/webm;codecs=opus' }
        : undefined;

      this.mediaRecorder = new MediaRecorder(this.mediaStream, options);
      this.mediaRecorder.ondataavailable = async (e) => {
        if (e.data && e.data.size > 0 && !this.isMicMuted && this.broadcastChannel) {
          try {
            const arrayBuffer = await e.data.arrayBuffer();
            this.broadcastChannel.postMessage({
              type: 'VOICE_AUDIO_CHUNK',
              payload: {
                senderId: this.myUserId,
                seat: this.mySeat,
                data: arrayBuffer,
              },
            });
          } catch (err) {
            console.warn(err);
          }
        }
      };

      this.mediaRecorder.start(250); // 250ms chunks
    } catch (e) {
      console.warn('Local audio streamer note:', e);
    }
  }

  private stopLocalAudioStreaming() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {
        console.warn(e);
      }
    }
    this.mediaRecorder = null;
  }

  private async handleLocalAudioChunk(payload: { senderId: string; seat: number; data: ArrayBuffer }) {
    if (payload.senderId === this.myUserId || this.isSpeakerMuted) return;

    try {
      const blob = new Blob([payload.data], { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.volume = 0.85;
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch {
      // Audio playback might be prevented until user gesture
    }
  }

  // --- WebRTC Peer Signaling ---
  private updatePeerAudioTracks() {
    if (!this.mediaStream) return;
    const audioTrack = this.mediaStream.getAudioTracks()[0];
    if (!audioTrack) return;

    this.peerConnections.forEach((pc) => {
      const senders = pc.getSenders();
      const audioSender = senders.find((s) => s.track?.kind === 'audio');
      if (audioSender) {
        audioSender.replaceTrack(audioTrack);
      } else {
        pc.addTrack(audioTrack, this.mediaStream!);
      }
    });
  }

  private async createPeerConnection(remoteUserId: string): Promise<RTCPeerConnection> {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.peerConnections.set(remoteUserId, pc);

    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((track) => pc.addTrack(track, this.mediaStream!));
    }

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) {
        let audio = this.remoteAudioElements.get(remoteUserId);
        if (!audio) {
          audio = document.createElement('audio');
          audio.autoplay = true;
          (audio as any).playsInline = true;
          audio.muted = this.isSpeakerMuted;
          this.remoteAudioElements.set(remoteUserId, audio);
        }
        audio.srcObject = stream;
        audio.play().catch((e) => console.warn('Remote audio autoplay note:', e));
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendWebRTCSignal({
          type: 'candidate',
          targetUserId: remoteUserId,
          senderUserId: this.myUserId,
          candidate: event.candidate,
        });
      }
    };

    return pc;
  }

  private sendWebRTCSignal(signal: any) {
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'WEBRTC_SIGNAL', payload: signal });
    }
    if (this.realtimeChannel) {
      this.realtimeChannel
        .send({
          type: 'broadcast',
          event: 'WEBRTC_SIGNAL',
          payload: signal,
        })
        .catch(() => {});
    }
  }

  private async handleWebRTCSignal(signal: any) {
    if (signal.targetUserId !== this.myUserId && signal.targetUserId !== 'all') return;
    if (signal.senderUserId === this.myUserId) return;

    const senderId = signal.senderUserId;
    let pc = this.peerConnections.get(senderId);

    if (signal.type === 'offer') {
      if (!pc) pc = await this.createPeerConnection(senderId);
      await pc.setRemoteDescription(new RTCSessionDescription(signal.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      this.sendWebRTCSignal({
        type: 'answer',
        targetUserId: senderId,
        senderUserId: this.myUserId,
        answer,
      });
    } else if (signal.type === 'answer') {
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.answer));
      }
    } else if (signal.type === 'candidate') {
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    }
  }

  private closeAllPeerConnections() {
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    this.remoteAudioElements.forEach((audio) => {
      audio.pause();
      audio.srcObject = null;
    });
    this.remoteAudioElements.clear();
  }

  private broadcastSpeaking(isSpeaking: boolean, volumeLevel: number) {
    const payload = {
      userId: this.myUserId,
      seat: this.mySeat,
      username: this.myUsername,
      isSpeaking,
      volumeLevel,
    };

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'VOICE_SPEAKING', payload });
    }
    if (this.realtimeChannel) {
      this.realtimeChannel.send({ type: 'broadcast', event: 'VOICE_SPEAKING', payload }).catch(() => {});
    }
  }

  private broadcastMuteState(isMuted: boolean) {
    const payload = {
      userId: this.myUserId,
      seat: this.mySeat,
      isMuted,
    };

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'VOICE_MUTE_STATE', payload });
    }
    if (this.realtimeChannel) {
      this.realtimeChannel.send({ type: 'broadcast', event: 'VOICE_MUTE_STATE', payload }).catch(() => {});
    }
  }

  private handleRemoteSpeaking(payload: {
    userId: string;
    seat: number;
    username: string;
    isSpeaking: boolean;
    volumeLevel: number;
  }) {
    if (payload.userId === this.myUserId) return;
    this.participants[payload.seat] = {
      userId: payload.userId,
      seat: payload.seat,
      username: payload.username || `Player ${payload.seat + 1}`,
      isMuted: false,
      isSpeaking: payload.isSpeaking,
      volumeLevel: payload.volumeLevel,
    };
    this.notify();
  }

  private handleRemoteMuteState(payload: { userId: string; seat: number; isMuted: boolean }) {
    if (payload.userId === this.myUserId) return;
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
    // Occasional bot voice ping in vs bot modes
    this.botVoiceTimer = setInterval(() => {
      // Periodic check
    }, 5000);
  }
}

export const voiceChatService = new VoiceChatService();
