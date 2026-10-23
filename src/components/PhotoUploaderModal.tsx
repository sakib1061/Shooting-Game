import React, { useRef, useState } from 'react';
import { Upload, Sparkles, Check, RotateCcw, X, Smile, Sliders } from 'lucide-react';
import { CustomFaceSettings, AccessoryType } from '../types/game';

interface PhotoUploaderModalProps {
  settings: CustomFaceSettings;
  onSave: (newSettings: CustomFaceSettings) => void;
  onClose: () => void;
  isOpen: boolean;
}

export const DEFAULT_ATTACHED_IMAGE = '/assets/aistudio/saiful_99435e5e.png';

const ACCESSORIES: { id: AccessoryType; label: string; icon: string }[] = [
  { id: 'none', label: 'None', icon: '👤' },
  { id: 'sunglasses', label: 'Cool Shades', icon: '🕶️' },
  { id: 'crown', label: 'King Crown', icon: '👑' },
  { id: 'party_hat', label: 'Party Hat', icon: '🎉' },
  { id: 'halo', label: 'Angel Halo', icon: '😇' },
  { id: 'laser_eyes', label: 'Cyber Visor', icon: '🔴' },
];

const PRESETS = [
  { name: 'Player Photo (Default)', url: DEFAULT_ATTACHED_IMAGE },
  { name: 'Neon Cyberpunk', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80' },
  { name: 'Arcade Pilot', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80' },
  { name: 'Pixel Hero', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80' },
];

export const PhotoUploaderModal: React.FC<PhotoUploaderModalProps> = ({
  settings,
  onSave,
  onClose,
  isOpen,
}) => {
  const [current, setCurrent] = useState<CustomFaceSettings>({ ...settings });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCurrent((prev) => ({
            ...prev,
            imageUrl: event.target!.result as string,
            name: file.name.substring(0, 18),
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCurrent((prev) => ({
            ...prev,
            imageUrl: event.target!.result as string,
            name: file.name.substring(0, 18),
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetToDefault = () => {
    setCurrent({
      imageUrl: DEFAULT_ATTACHED_IMAGE,
      name: 'Default Face',
      zoom: 1.15,
      offsetY: 0,
      accessory: 'none',
    });
  };

  const handleSave = () => {
    onSave(current);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-xl bg-slate-900/95 border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.25)] p-6 text-slate-100 max-h-[90vh] overflow-y-auto"
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Smile className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-wide text-white flex items-center gap-2">
                Target Face Customizer
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Custom Photo
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Upload your photo or use presets to put faces on floating arcade targets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Target Preview & Uploader in 2 Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 mb-6">
          {/* Target Preview */}
          <div className="sm:col-span-5 flex flex-col items-center justify-center p-4 rounded-xl bg-slate-950/60 border border-slate-800 relative">
            <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider mb-2">
              In-Game Target Preview
            </span>
            <div className="relative w-36 h-36 flex items-center justify-center">
              {/* Pulsing neon target rings */}
              <div className="absolute inset-0 rounded-full border-2 border-cyan-500/40 animate-ping opacity-25" />
              <div className="absolute inset-1 rounded-full border border-cyan-400/60 shadow-[0_0_20px_rgba(6,182,212,0.6)]" />
              
              {/* Clipped circular face */}
              <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-cyan-300 relative bg-slate-900 shadow-inner flex items-center justify-center">
                <img
                  src={current.imageUrl}
                  alt="Custom Face"
                  className="w-full h-full object-cover transition-transform duration-100"
                  style={{
                    transform: `scale(${current.zoom}) translateY(${current.offsetY}%)`,
                  }}
                  onError={(e) => {
                    // Fallback to default attached photo
                    (e.target as HTMLImageElement).src = DEFAULT_ATTACHED_IMAGE;
                  }}
                />

                {/* Overlaid Accessory in Preview */}
                {current.accessory === 'sunglasses' && (
                  <div className="absolute top-[32%] text-2xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] pointer-events-none">
                    🕶️
                  </div>
                )}
                {current.accessory === 'crown' && (
                  <div className="absolute -top-1 text-3xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] pointer-events-none">
                    👑
                  </div>
                )}
                {current.accessory === 'party_hat' && (
                  <div className="absolute -top-1.5 text-3xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] pointer-events-none">
                    🎉
                  </div>
                )}
                {current.accessory === 'halo' && (
                  <div className="absolute -top-2 text-2xl filter drop-shadow-[0_0_8px_rgba(250,204,21,0.9)] pointer-events-none">
                    😇
                  </div>
                )}
                {current.accessory === 'laser_eyes' && (
                  <div className="absolute top-[34%] text-2xl filter drop-shadow-[0_0_10px_rgba(239,68,68,1)] pointer-events-none">
                    🔴
                  </div>
                )}
              </div>

              {/* Crosshair indicator */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-full h-[1px] bg-cyan-400/20" />
                <div className="h-full w-[1px] bg-cyan-400/20 absolute" />
              </div>
            </div>
            <span className="text-[10px] text-slate-400 mt-2 text-center">
              Target face will wobble & explode into neon particles!
            </span>
          </div>

          {/* Upload Dropzone */}
          <div className="sm:col-span-7 flex flex-col justify-between gap-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`flex-1 border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-cyan-400 bg-cyan-500/10 scale-[1.02]'
                  : 'border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-12 h-12 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-2">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-200">
                Choose a photo from your device
              </p>
              <p className="text-xs text-slate-400 mt-1">
                PNG, JPG, WebP supported &middot; Click or Drag & Drop
              </p>
            </div>

            {/* Presets */}
            <div>
              <span className="text-[11px] font-medium text-slate-400 mb-1.5 block">
                Quick Presets:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() =>
                      setCurrent((p) => ({
                        ...p,
                        imageUrl: preset.url,
                        name: preset.name,
                      }))
                    }
                    className={`text-xs px-2.5 py-1.5 rounded-lg border text-left truncate transition-colors ${
                      current.imageUrl === preset.url
                        ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 font-semibold'
                        : 'border-slate-800 bg-slate-800/50 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sliders: Zoom & Vertical Alignment */}
        <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 mb-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300 uppercase tracking-wider">
            <Sliders className="w-3.5 h-3.5" />
            Fit & Alignment Adjustments
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Face Zoom</span>
                <span className="font-mono text-cyan-400">{Math.round(current.zoom * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="2.5"
                step="0.05"
                value={current.zoom}
                onChange={(e) =>
                  setCurrent((prev) => ({ ...prev, zoom: parseFloat(e.target.value) }))
                }
                className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Vertical Position</span>
                <span className="font-mono text-cyan-400">{current.offsetY}%</span>
              </div>
              <input
                type="range"
                min="-40"
                max="40"
                step="2"
                value={current.offsetY}
                onChange={(e) =>
                  setCurrent((prev) => ({ ...prev, offsetY: parseInt(e.target.value, 10) }))
                }
                className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Fun Accessories */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 uppercase tracking-wider mb-2.5">
            <Sparkles className="w-3.5 h-3.5" />
            Face Accessories & Props
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {ACCESSORIES.map((acc) => (
              <button
                key={acc.id}
                onClick={() => setCurrent((p) => ({ ...p, accessory: acc.id }))}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                  current.accessory === acc.id
                    ? 'border-amber-400 bg-amber-500/20 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                    : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="text-xl mb-1">{acc.icon}</span>
                <span className="text-[11px] font-medium truncate w-full text-center">
                  {acc.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4">
          <button
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Default Photo
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-xs px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 text-xs font-bold px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Apply to Targets
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
