import { useState, useEffect, useCallback } from 'react';
import { 
  Play, 
  RotateCcw, 
  Trophy, 
  Crosshair, 
  Image as ImageIcon, 
  Sparkles, 
  Zap, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  Timer, 
  ShieldAlert 
} from 'lucide-react';
import { GameMode, GameStats, WeaponType, CustomFaceSettings } from './types/game';
import { soundFx } from './audio/soundFx';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { PhotoUploaderModal, DEFAULT_ATTACHED_IMAGE } from './components/PhotoUploaderModal';

type GameState = 'title' | 'playing' | 'paused' | 'gameover';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('title');
  const [gameMode, setGameMode] = useState<GameMode>('arcade');
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(soundFx.getMuted());

  // Active weapon & temporary timer
  const [activeWeapon, setActiveWeapon] = useState<WeaponType>('blaster');
  const [weaponTimer, setWeaponTimer] = useState<number>(0);

  // Face settings (defaults to the user's uploaded attachment image!)
  const [faceSettings, setFaceSettings] = useState<CustomFaceSettings>(() => {
    const saved = localStorage.getItem('face_blaster_custom_face');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore parse error
      }
    }
    return {
      imageUrl: DEFAULT_ATTACHED_IMAGE,
      name: 'Default Target Face',
      zoom: 1.15,
      offsetY: 0,
      accessory: 'none',
    };
  });

  // Game stats
  const [stats, setStats] = useState<GameStats>(() => {
    const savedHighScore = localStorage.getItem('face_blaster_high_score');
    return {
      score: 0,
      highScore: savedHighScore ? parseInt(savedHighScore, 10) : 0,
      targetsHit: 0,
      shotsFired: 0,
      combo: 0,
      maxCombo: 0,
      accuracy: 100,
      timeRemaining: 60,
      lives: 3,
    };
  });

  // Start a new game session
  const startGame = useCallback((mode: GameMode = gameMode) => {
    setGameMode(mode);
    setStats((prev) => ({
      score: 0,
      highScore: prev.highScore,
      targetsHit: 0,
      shotsFired: 0,
      combo: 0,
      maxCombo: 0,
      accuracy: 100,
      timeRemaining: mode === 'arcade' ? 60 : 0,
      lives: 3,
    }));
    setActiveWeapon('blaster');
    setWeaponTimer(0);
    setGameState('playing');
  }, [gameMode]);

  // Restart active game
  const restartGame = useCallback(() => {
    startGame(gameMode);
  }, [startGame, gameMode]);

  // Game over trigger
  const handleGameOver = useCallback(() => {
    soundFx.playGameOver();
    setGameState('gameover');
    setStats((prev) => {
      const newHighScore = Math.max(prev.highScore, prev.score);
      localStorage.setItem('face_blaster_high_score', String(newHighScore));
      return { ...prev, highScore: newHighScore };
    });
  }, []);

  // Save face customization
  const handleSaveFace = (newSettings: CustomFaceSettings) => {
    setFaceSettings(newSettings);
    localStorage.setItem('face_blaster_custom_face', JSON.stringify(newSettings));
  };

  // Weapon upgrade collector
  const handleCollectWeapon = (weapon: WeaponType) => {
    setActiveWeapon(weapon);
    setWeaponTimer(10); // 10 seconds of upgraded weapon power!
  };

  // Weapon timer countdown & Arcade 60-second timer countdown
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = setInterval(() => {
      // Weapon timer
      setWeaponTimer((prev) => {
        if (prev <= 0.1) {
          if (activeWeapon !== 'blaster') setActiveWeapon('blaster');
          return 0;
        }
        return Math.max(0, prev - 0.1);
      });

      // Arcade mode time countdown
      if (gameMode === 'arcade') {
        setStats((prev) => {
          const nextTime = prev.timeRemaining - 0.1;
          if (nextTime <= 0) {
            handleGameOver();
            return { ...prev, timeRemaining: 0 };
          }
          return { ...prev, timeRemaining: nextTime };
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [gameState, gameMode, activeWeapon, handleGameOver]);

  // Global Keyboard Shortcuts (Space, Enter, Esc, M, R)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space' || e.code === 'Enter') {
        if (gameState === 'title' || gameState === 'gameover') {
          e.preventDefault();
          startGame();
        }
      } else if (e.code === 'Escape') {
        e.preventDefault();
        if (gameState === 'playing') setGameState('paused');
        else if (gameState === 'paused') setGameState('playing');
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        const nextMute = soundFx.toggleMute();
        setIsMuted(nextMute);
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        restartGame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, startGame, restartGame]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans text-slate-100 select-none">
      {/* Background Interactive Canvas (always running for live ambient background) */}
      <GameCanvas
        mode={gameMode}
        faceSettings={faceSettings}
        isPaused={gameState !== 'playing'}
        isPlaying={gameState === 'playing'}
        weapon={activeWeapon}
        onUpdateStats={setStats}
        onGameOver={handleGameOver}
        onCollectWeapon={handleCollectWeapon}
      />

      {/* IN-GAME HUD (Only visible during active play or pause) */}
      {(gameState === 'playing' || gameState === 'paused') && (
        <HUD
          mode={gameMode}
          stats={stats}
          weapon={activeWeapon}
          weaponTimer={weaponTimer}
          isPaused={gameState === 'paused'}
          isMuted={isMuted}
          onTogglePause={() => setGameState((s) => (s === 'playing' ? 'paused' : 'playing'))}
          onToggleMute={() => setIsMuted(soundFx.toggleMute())}
          onOpenPhotoModal={() => setIsPhotoModalOpen(true)}
          onRestart={restartGame}
        />
      )}

      {/* TITLE SCREEN / HERO CENTERPIECE */}
      {gameState === 'title' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-between p-6 sm:p-10 pointer-events-auto bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          {/* Top Bar: Best Score & Mute */}
          <div className="w-full max-w-4xl flex items-center justify-between">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-amber-300">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>All-Time High:</span>
              <span className="font-mono-numbers font-black text-white">{stats.highScore.toLocaleString()}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPhotoModalOpen(true)}
                className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 transition-colors shadow-[0_0_15px_rgba(6,182,212,0.2)] cursor-pointer"
              >
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                <span>Customize Face Photo</span>
              </button>

              <button
                onClick={() => setIsMuted(soundFx.toggleMute())}
                className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
              </button>
            </div>
          </div>

          {/* Hero Centerpiece: Bespoke SVG Title Lockup & Face Spotlight */}
          <div className="flex flex-col items-center text-center max-w-xl my-auto">
            {/* Target Face Avatar Badge Showcase */}
            <div 
              onClick={() => setIsPhotoModalOpen(true)}
              title="Click to change target photo"
              className="relative group cursor-pointer mb-5"
            >
              <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-fuchsia-500 opacity-60 group-hover:opacity-100 blur-lg transition duration-500 group-hover:scale-105" />
              <div className="relative w-28 h-28 rounded-full p-1 bg-slate-950 border-2 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.7)] flex items-center justify-center overflow-hidden">
                <img
                  src={faceSettings.imageUrl}
                  alt="Target Face"
                  className="w-full h-full object-cover rounded-full transition-transform duration-300 group-hover:scale-110"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = DEFAULT_ATTACHED_IMAGE;
                  }}
                />
                {/* Accessory icon preview */}
                {faceSettings.accessory !== 'none' && (
                  <div className="absolute top-1 text-2xl filter drop-shadow">
                    {faceSettings.accessory === 'sunglasses' ? '🕶️' :
                     faceSettings.accessory === 'crown' ? '👑' :
                     faceSettings.accessory === 'party_hat' ? '🎉' :
                     faceSettings.accessory === 'halo' ? '😇' : '🔴'}
                  </div>
                )}
                {/* Crosshair overlay hint */}
                <div className="absolute inset-0 rounded-full border border-cyan-400/40 pointer-events-none group-hover:border-cyan-300 flex items-center justify-center">
                  <Crosshair className="w-8 h-8 text-cyan-300/60 group-hover:text-cyan-200 transition-colors" />
                </div>
              </div>
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-cyan-950/90 border border-cyan-400/60 text-[10px] font-bold text-cyan-300 px-2 py-0.5 rounded-full whitespace-nowrap shadow">
                Custom Face Attached
              </span>
            </div>

            {/* Bespoke Inline SVG Title Lockup */}
            <div className="relative mb-2">
              <svg className="w-full max-w-md h-16 sm:h-20" viewBox="0 0 500 80" fill="none">
                <defs>
                  <linearGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="50%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#f43f5e" />
                  </linearGradient>
                  <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#06b6d4" floodOpacity="0.8" />
                  </filter>
                </defs>
                <text
                  x="50%"
                  y="55"
                  textAnchor="middle"
                  fill="url(#titleGrad)"
                  filter="url(#neonGlow)"
                  className="font-black text-4xl sm:text-5xl tracking-wider"
                  style={{ fontFamily: 'Outfit, sans-serif', textTransform: 'uppercase' }}
                >
                  Face Blaster 2D
                </text>
              </svg>
              <p className="text-xs sm:text-sm text-cyan-200/80 font-medium tracking-wide">
                Blast floating photo targets &bull; Chain insane combos &bull; Unlock power-ups
              </p>
            </div>

            {/* Mode Selection Selector Tabs */}
            <div className="grid grid-cols-3 gap-2 w-full max-w-sm mb-6 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
              <button
                onClick={() => setGameMode('arcade')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  gameMode === 'arcade'
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.6)]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Timer className="w-3.5 h-3.5" />
                <span>Arcade 60s</span>
              </button>

              <button
                onClick={() => setGameMode('survival')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  gameMode === 'survival'
                    ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.6)]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Survival 3♥</span>
              </button>

              <button
                onClick={() => setGameMode('zen')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  gameMode === 'zen'
                    ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.6)]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Zen Free</span>
              </button>
            </div>

            {/* Start CTA Button */}
            <button
              onClick={() => startGame()}
              className="group relative inline-flex items-center justify-center gap-3 px-8 sm:px-10 py-3.5 sm:py-4 rounded-2xl text-base sm:text-lg font-black text-slate-950 bg-gradient-to-r from-cyan-400 via-sky-400 to-teal-300 hover:from-cyan-300 hover:to-teal-200 shadow-[0_0_35px_rgba(6,182,212,0.7)] hover:shadow-[0_0_50px_rgba(6,182,212,0.9)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-5 h-5 fill-slate-950" />
              <span>START GAME</span>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-950/20 text-slate-950">
                SPACE
              </span>
            </button>
          </div>

          {/* Flat Control Hint Line */}
          <div className="text-[11px] sm:text-xs text-slate-400 font-mono tracking-wide flex items-center gap-2 sm:gap-4 flex-wrap justify-center border-t border-slate-800/80 pt-4 w-full max-w-lg">
            <span>🖱️ Click/Tap Shoot</span>
            <span>&bull;</span>
            <span>💥 Bullseye Crit Center</span>
            <span>&bull;</span>
            <span>Esc Pause</span>
            <span>&bull;</span>
            <span>M Mute</span>
          </div>
        </div>
      )}

      {/* PAUSE MODAL */}
      {gameState === 'paused' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center shadow-[0_0_40px_rgba(0,0,0,0.8)]">
            <h3 className="text-xl font-black text-white tracking-wide uppercase mb-1">
              Game Paused
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Take a breath and get ready to blast!
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => setGameState('playing')}
                className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                Resume (Esc)
              </button>

              <button
                onClick={restartGame}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restart Match (R)
              </button>

              <button
                onClick={() => setIsPhotoModalOpen(true)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-xs border border-cyan-500/20 transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                Change Target Photo
              </button>

              <button
                onClick={() => setGameState('title')}
                className="w-full py-2 rounded-xl text-slate-400 hover:text-white text-xs transition-colors cursor-pointer"
              >
                Exit to Title Screen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER MODAL */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-[0_0_60px_rgba(0,0,0,0.9)] relative overflow-hidden">
            {/* Top decorative badge */}
            {stats.score > 0 && stats.score >= stats.highScore && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-b-xl shadow-lg flex items-center gap-1">
                <Sparkles className="w-3 h-3 fill-slate-950" />
                New High Score!
              </div>
            )}

            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-wide uppercase mt-2 mb-1">
              Match Complete
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              {gameMode === 'arcade' ? '60 Seconds Arcade Rush Concluded' : 'Target Run Ended'}
            </p>

            {/* Final Score Showcase */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 mb-5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Final Score
              </span>
              <div className="font-mono-numbers text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-fuchsia-400">
                {stats.score.toLocaleString()}
              </div>
            </div>

            {/* Performance Stats Breakdown Grid */}
            <div className="grid grid-cols-3 gap-2.5 mb-6 text-left">
              <div className="bg-slate-950/50 border border-slate-800/80 p-3 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                  Targets Hit
                </span>
                <span className="font-mono-numbers text-lg font-black text-cyan-300">
                  {stats.targetsHit}
                </span>
              </div>

              <div className="bg-slate-950/50 border border-slate-800/80 p-3 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                  Accuracy
                </span>
                <span className={`font-mono-numbers text-lg font-black ${
                  stats.accuracy >= 70 ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {stats.accuracy}%
                </span>
              </div>

              <div className="bg-slate-950/50 border border-slate-800/80 p-3 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                  Max Streak
                </span>
                <span className="font-mono-numbers text-lg font-black text-fuchsia-400">
                  x{stats.maxCombo}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => startGame()}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-sm sm:text-base shadow-[0_0_25px_rgba(6,182,212,0.5)] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Play Again (Space)
              </button>

              <button
                onClick={() => setIsPhotoModalOpen(true)}
                className="w-full py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-cyan-300 font-semibold text-xs border border-cyan-500/30 transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                Customize Target Photo
              </button>

              <button
                onClick={() => setGameState('title')}
                className="w-full py-2 text-slate-400 hover:text-white text-xs transition-colors cursor-pointer"
              >
                Back to Title Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHOTO UPLOADER & TARGET FACE CUSTOMIZER MODAL */}
      <PhotoUploaderModal
        isOpen={isPhotoModalOpen}
        settings={faceSettings}
        onSave={handleSaveFace}
        onClose={() => setIsPhotoModalOpen(false)}
      />
    </div>
  );
}
