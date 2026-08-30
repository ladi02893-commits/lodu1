import React from 'react';
import { Download, X } from 'lucide-react';
import { sound } from '../../lib/audio';

interface ImageViewerModalProps {
  imageUrl: string | null;
  caption?: string;
  senderName?: string;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  imageUrl,
  caption,
  senderName,
  onClose,
}) => {
  if (!imageUrl) return null;

  const handleDownload = () => {
    sound.playClick();
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `royal_ludo_image_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-lg animate-fade-in">
      <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center">
        {/* Top Control Bar */}
        <div className="w-full flex items-center justify-between px-4 py-2 bg-slate-900/90 rounded-t-2xl border-t border-x border-amber-500/30 text-slate-200">
          <div className="flex items-center gap-2">
            <span className="font-royal font-bold text-amber-300 text-sm">
              {senderName ? `${senderName}'s Shared Image` : 'Royal Gallery Image'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 transition-colors cursor-pointer"
              title="Download Image"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 hover:text-rose-300 text-slate-300 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image Content */}
        <div className="w-full bg-slate-950/95 border-x border-b border-amber-500/30 rounded-b-2xl p-4 flex flex-col items-center justify-center overflow-hidden">
          <img
            src={imageUrl}
            alt={caption || 'Shared attachment'}
            className="max-h-[70vh] w-auto max-w-full object-contain rounded-xl shadow-2xl border border-slate-800"
          />

          {caption && (
            <p className="mt-3 text-sm text-slate-200 text-center font-medium max-w-xl">
              {caption}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
