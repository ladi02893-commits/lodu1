import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, AlertCircle } from 'lucide-react';
import { voiceChatService, VoiceState } from '../../services/voiceChatService';

interface VoiceChatControlsProps {
  className?: string;
}

export const VoiceChatControls: React.FC<VoiceChatControlsProps> = ({ className = '' }) => {
  const [voiceState, setVoiceState] = useState<VoiceState>(() => voiceChatService.getState());
  const [showPermissionAlert, setShowPermissionAlert] = useState(false);

  useEffect(() => {
    const unsub = voiceChatService.subscribe((state) => {
      setVoiceState(state);
    });
    return () => unsub();
  }, []);

  const handleToggleMic = async () => {
    const success = await voiceChatService.toggleMic();
    if (!success && voiceChatService.getState().permissionState === 'denied') {
      setShowPermissionAlert(true);
      setTimeout(() => setShowPermissionAlert(false), 5000);
    }
  };

  const handleToggleSpeaker = () => {
    voiceChatService.toggleSpeaker();
  };

  const isMuted = voiceState.isMicMuted;
  const isSpeaking = voiceState.isSpeaking;
  const volume = voiceState.myVolume;

  return (
    <div className={`flex items-center gap-1.5 relative ${className}`}>
      {/* Mic Mute / Unmute Button with Volume Visualizer */}
      <button
        id="toolbar-mic-btn"
        type="button"
        onClick={handleToggleMic}
        className={`relative p-2 rounded-full border transition-all cursor-pointer shadow flex items-center justify-center ${
          isMuted
            ? 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            : isSpeaking
            ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 ring-2 ring-emerald-400/50 shadow-[0_0_12px_rgba(52,211,153,0.5)] scale-105 animate-pulse'
            : 'bg-amber-950/70 border-amber-400/60 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
        }`}
        title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
      >
        {isMuted ? (
          <MicOff className="w-4 h-4 text-slate-500" />
        ) : (
          <Mic className="w-4 h-4 text-emerald-400" />
        )}

        {/* Live Audio Level Meter Bar Ring */}
        {!isMuted && (
          <span
            className="absolute inset-0 rounded-full border border-emerald-400 pointer-events-none transition-all duration-75"
            style={{
              opacity: volume > 10 ? Math.min(1, volume / 60) : 0.3,
              transform: `scale(${1 + Math.min(0.3, volume / 200)})`,
            }}
          />
        )}
      </button>

      {/* Incoming Speaker Voice Toggle */}
      <button
        id="toolbar-speaker-voice-btn"
        type="button"
        onClick={handleToggleSpeaker}
        className={`p-2 rounded-full border transition-all cursor-pointer shadow flex items-center justify-center ${
          voiceState.isSpeakerMuted
            ? 'bg-slate-900/90 border-slate-800 text-slate-500'
            : 'bg-slate-900/90 border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-amber-300'
        }`}
        title={voiceState.isSpeakerMuted ? 'Unmute Player Voice Audio' : 'Mute Player Voice Audio'}
      >
        {voiceState.isSpeakerMuted ? (
          <VolumeX className="w-4 h-4 text-slate-500" />
        ) : (
          <Volume2 className="w-4 h-4 text-amber-300" />
        )}
      </button>

      {/* Permission Denied Notice Popover */}
      {showPermissionAlert && (
        <div className="absolute right-0 top-11 w-56 rounded-2xl bg-rose-950/95 border-2 border-rose-500/80 p-3 shadow-2xl z-50 text-xs text-rose-200 animate-fade-in space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-rose-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Microphone Denied</span>
          </div>
          <p className="text-[11px] leading-tight text-slate-300">
            Please allow microphone permission in your browser address bar to talk with other monarchs.
          </p>
        </div>
      )}
    </div>
  );
};
