import React from 'react';
import { 
  Volume2, 
  VolumeX, 
  Pause, 
  Play, 
  Image as ImageIcon, 
  Flame, 
  Heart, 
  Clock, 
  Crosshair, 
  Trophy, 
  Zap, 
  RotateCcw
} from 'lucide-react';
import { GameMode, GameStats, WeaponType } from '../types/game';

interface HUDProps {
  mode: GameMode;
  stats: GameStats;
  weapon: WeaponType;
  weaponTimer: number; // seconds left on special weapon
  isPaused: boolean;
  isMuted: boolean;
  onTogglePause: () => void;
  onToggleMute: () => void;
  onOpenPhotoModal: () => void;
  onRestart: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  mode,
  stats,
  weapon,
  weaponTimer,
  isPaused,
  isMuted,
  onTogglePause,
  onToggleMute,
  onOpenPhotoModal,
  onRestart,
}) => {
  // Calculate combo percentage (max combo bonus tier 20)
  const comboPercent = Math.min((stats.combo / 15) * 100, 100);
  const comboMultiplier = stats.combo >= 15 ? 4 : stats.combo >= 10 ? 3 : stats.combo >= 5 ? 2 : 1;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-4 sm:p-6 select-none overflow-hidden">
      {/* Top Bar: Perimeter Status Cluster */}
      <div className="flex items-start justify-between w-full">
        {/* Left Cluster: Score & High Score */}
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2 bg-slate-950/80 border border-cyan-500/30 px-3.5 py-1.5 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <span className="text-[10px] font-bold text-cyan-400 tracking-wider uppercase">Score</span>
            <span className="font-mono-numbers text-2xl sm:text-3xl font-black text-white tracking-tight">
              {stats.score.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 text-xs text-slate-400">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px]">Best:</span>
            <span className="font-mono-numbers font-bold text-amber-300">
              {stats.highScore.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Center Cluster: Time (Arcade) or Lives (Survival) & Combo Streak */}
        <div className="flex flex-col items-center gap-1.5">
          {mode === 'arcade' && (
            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-xl border font-mono-numbers font-extrabold text-lg sm:text-xl shadow-lg transition-colors ${
              stats.timeRemaining <= 10 
                ? 'bg-rose-950/80 border-rose-500/60 text-rose-400 animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.3)]'
                : 'bg-slate-950/80 border-slate-800 text-slate-100 shadow-[0_0_15px_rgba(0,0,0,0.5)]'
            }`}>
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>{Math.ceil(stats.timeRemaining)}s</span>
            </div>
          )}

          {mode === 'survival' && (
            <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl">
              {[1, 2, 3].map((heartIndex) => (
                <Heart
                  key={heartIndex}
                  className={`w-5 h-5 transition-transform ${
                    heartIndex <= stats.lives
                      ? 'text-rose-500 fill-rose-500 scale-100 drop-shadow-[0_0_8px_rgba(244,63,94,0.7)]'
                      : 'text-slate-700 fill-slate-800 scale-90'
                  }`}
                />
              ))}
            </div>
          )}

          {mode === 'zen' && (
            <div className="bg-slate-950/70 border border-emerald-500/30 px-3 py-1 rounded-xl text-xs text-emerald-300 font-bold tracking-wider uppercase">
              Free Play Zen Mode
            </div>
          )}

          {/* Combo Meter Pill */}
          {stats.combo > 1 && (
            <div className="flex flex-col items-center animate-bounce duration-300">
              <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border border-amber-400/50 text-amber-300 text-xs font-bold shadow-[0_0_12px_rgba(245,158,11,0.4)]">
                <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
                <span>COMBO x{stats.combo}</span>
                {comboMultiplier > 1 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-black">
                    {comboMultiplier}X PTS
                  </span>
                )}
              </div>
              {/* Mini combo progress bar */}
              <div className="w-20 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 to-rose-500 transition-all duration-150"
                  style={{ width: `${comboPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Cluster: Control Buttons */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Change Photo CTA */}
          <button
            onClick={onOpenPhotoModal}
            title="Customize Target Face"
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 hover:text-cyan-200 transition-all shadow-[0_0_12px_rgba(6,182,212,0.2)] cursor-pointer"
          >
            <ImageIcon className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Change Photo</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleMute}
            title={isMuted ? 'Unmute Sound (M)' : 'Mute Sound (M)'}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Pause Toggle */}
          <button
            onClick={onTogglePause}
            title="Pause (Esc)"
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4" />}
          </button>

          {/* Restart Button */}
          <button
            onClick={onRestart}
            title="Restart Game (R)"
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Bar: Weapon and Stats Cluster */}
      <div className="flex items-end justify-between w-full">
        {/* Active Weapon Indicator */}
        <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800/80 px-3 py-2 rounded-xl text-xs">
          <div className={`p-1.5 rounded-lg ${
            weapon === 'triple' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
            weapon === 'plasma' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
            weapon === 'laser' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
            'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
          }`}>
            <Zap className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
              Weapon
            </span>
            <span className="font-bold text-white uppercase text-xs">
              {weapon === 'triple' ? 'Triple Blast' :
               weapon === 'plasma' ? 'Plasma Cannon' :
               weapon === 'laser' ? 'Laser Beam' : 'Pulse Blaster'}
            </span>
          </div>
          {weaponTimer > 0 && (
            <div className="ml-2 pl-2 border-l border-slate-800 font-mono text-amber-400 text-xs font-bold">
              {weaponTimer.toFixed(1)}s
            </div>
          )}
        </div>

        {/* Accuracy and Target Hits */}
        <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800/80 px-3 py-2 rounded-xl text-xs font-mono-numbers">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            <span>Hits:</span>
            <span className="font-bold text-slate-200">{stats.targetsHit}</span>
          </div>
          <div className="h-3 w-[1px] bg-slate-800" />
          <div className="flex items-center gap-1 text-slate-400">
            <span>Acc:</span>
            <span className={`font-bold ${
              stats.accuracy >= 70 ? 'text-emerald-400' :
              stats.accuracy >= 40 ? 'text-amber-400' : 'text-slate-300'
            }`}>
              {stats.accuracy}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
