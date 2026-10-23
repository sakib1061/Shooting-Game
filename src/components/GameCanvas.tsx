import React, { useEffect, useRef, useCallback } from 'react';
import { 
  GameMode, 
  GameStats, 
  Target, 
  TargetType, 
  Particle, 
  FloatingText, 
  ShotEffect, 
  Shockwave, 
  PowerUpItem, 
  WeaponType, 
  CustomFaceSettings 
} from '../types/game';
import { soundFx } from '../audio/soundFx';

interface GameCanvasProps {
  mode: GameMode;
  faceSettings: CustomFaceSettings;
  isPaused: boolean;
  isPlaying: boolean;
  weapon: WeaponType;
  onUpdateStats: (updater: (prev: GameStats) => GameStats) => void;
  onGameOver: () => void;
  onCollectWeapon: (weapon: WeaponType) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  mode,
  faceSettings,
  isPaused,
  isPlaying,
  weapon,
  onUpdateStats,
  onGameOver,
  onCollectWeapon,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game state stored in refs to prevent React re-renders from interrupting the 60fps loop
  const targetsRef = useRef<Target[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const shotEffectsRef = useRef<ShotEffect[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const powerUpsRef = useRef<PowerUpItem[]>([]);
  
  // Input & Reticle tracking
  const mousePosRef = useRef<{ x: number; y: number; active: boolean }>({ x: -100, y: -100, active: false });
  const isMouseDownRef = useRef<boolean>(false);
  const lastShotTimeRef = useRef<number>(0);
  
  // Feedback FX refs
  const traumaRef = useRef<number>(0);
  const hitStopRemainingRef = useRef<number>(0);
  const nextTargetIdRef = useRef<number>(1);
  const nextTextIdRef = useRef<number>(1);
  const spawnTimerRef = useRef<number>(0);
  const animationFrameIdRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  
  // Image cache
  const faceImageRef = useRef<HTMLImageElement | null>(null);
  const imageLoadedRef = useRef<boolean>(false);

  // Background stars
  const starsRef = useRef<{ x: number; y: number; size: number; alpha: number; speed: number }[]>([]);

  // Load target face image whenever faceSettings.imageUrl changes
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = faceSettings.imageUrl;
    img.onload = () => {
      faceImageRef.current = img;
      imageLoadedRef.current = true;
    };
    img.onerror = () => {
      // Fallback if custom image fails
      const fallback = new Image();
      fallback.src = '/assets/aistudio/saiful_99435e5e.png';
      fallback.onload = () => {
        faceImageRef.current = fallback;
        imageLoadedRef.current = true;
      };
    };
  }, [faceSettings.imageUrl]);

  // Initialize background star dust
  const initStars = (width: number, height: number) => {
    starsRef.current = Array.from({ length: 60 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 0.8,
      alpha: Math.random() * 0.7 + 0.2,
      speed: Math.random() * 0.4 + 0.1,
    }));
  };

  // Helper to spawn a new floating target
  const spawnTarget = useCallback((width: number, height: number) => {
    const types: TargetType[] = ['standard', 'standard', 'speedy', 'golden', 'shielded'];
    if (mode === 'survival') {
      types.push('bomb');
    }
    // Occasionally spawn a giant boss target
    if (Math.random() < 0.08) {
      types.push('giant');
    }

    const type = types[Math.floor(Math.random() * types.length)];
    let radius = 38;
    let maxHp = 1;
    let color = '#06b6d4'; // cyan
    let points = 100;
    let vx = (Math.random() - 0.5) * 1.8;
    let vy = -(Math.random() * 1.2 + 0.8); // float upwards

    if (type === 'speedy') {
      radius = 30;
      color = '#f43f5e'; // rose/magenta
      points = 200;
      vx = (Math.random() - 0.5) * 4.0;
      vy = -(Math.random() * 2.2 + 1.2);
    } else if (type === 'golden') {
      radius = 34;
      color = '#fbbf24'; // amber gold
      points = 350;
      vx = (Math.random() - 0.5) * 2.8;
      vy = -(Math.random() * 1.8 + 1.0);
    } else if (type === 'shielded') {
      radius = 42;
      maxHp = 3;
      color = '#3b82f6'; // cobalt blue
      points = 300;
      vx = (Math.random() - 0.5) * 1.2;
      vy = -(Math.random() * 0.9 + 0.6);
    } else if (type === 'giant') {
      radius = 58;
      maxHp = 5;
      color = '#a855f7'; // purple
      points = 600;
      vx = (Math.random() - 0.5) * 0.9;
      vy = -(Math.random() * 0.6 + 0.4);
    } else if (type === 'bomb') {
      radius = 35;
      color = '#ef4444'; // hazard red
      points = -200;
      vx = (Math.random() - 0.5) * 2.0;
      vy = -(Math.random() * 1.4 + 0.8);
    }

    // Spawn from bottom or bottom edges
    const spawnPadding = radius + 20;
    const x = Math.random() * (width - spawnPadding * 2) + spawnPadding;
    const y = height + radius + 10;

    targetsRef.current.push({
      id: nextTargetIdRef.current++,
      x,
      y,
      radius,
      baseRadius: radius,
      vx,
      vy,
      type,
      maxHp,
      hp: maxHp,
      bobPhase: Math.random() * Math.PI * 2,
      bobSpeed: Math.random() * 2 + 1.5,
      rotation: 0,
      rotSpeed: (Math.random() - 0.5) * 0.04,
      wobbleX: 1,
      wobbleY: 1,
      hitFlash: 0,
      squashX: 1,
      squashY: 1,
      color,
      points,
    });
  }, [mode]);

  // Particle explosion creator
  const createExplosion = useCallback((x: number, y: number, color: string, count: number = 30, isGolden: boolean = false) => {
    // 1. Shards & Sparks
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 7 + 2;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 4 + 2,
        color: isGolden ? ['#fbbf24', '#f59e0b', '#fef08a', '#ffffff'][i % 4] : color,
        alpha: 1,
        decay: Math.random() * 0.02 + 0.015,
        gravity: 0.15,
        drag: 0.98,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        shape: Math.random() > 0.4 ? 'shard' : 'spark',
      });
    }

    // 2. Expanding shockwave ring
    shockwavesRef.current.push({
      x,
      y,
      radius: 5,
      maxRadius: count * 1.8,
      alpha: 0.9,
      color: isGolden ? '#fde047' : color,
      lineWidth: 4,
    });

    // 3. Extra star confetti if golden
    if (isGolden) {
      for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 3;
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          radius: Math.random() * 6 + 3,
          color: '#ffffff',
          alpha: 1,
          decay: 0.012,
          gravity: 0.1,
          drag: 0.96,
          rotation: Math.random() * Math.PI,
          rotSpeed: 0.1,
          shape: 'star',
        });
      }
    }
  }, []);

  // Spawn floating score text
  const addFloatingText = useCallback((text: string, x: number, y: number, color: string = '#22d3ee', isCrit: boolean = false) => {
    floatingTextsRef.current.push({
      id: nextTextIdRef.current++,
      text,
      x: x + (Math.random() - 0.5) * 15,
      y,
      vx: (Math.random() - 0.5) * 1.2,
      vy: isCrit ? -3.5 : -2.4,
      color,
      fontSize: isCrit ? 24 : 18,
      alpha: 1,
      scale: isCrit ? 1.4 : 1.1,
      duration: 1.0,
      age: 0,
      isCrit,
    });
  }, []);

  // Handle firing shot
  const handleFire = useCallback((clientX: number, clientY: number) => {
    if (isPaused || !isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Throttle fire rate
    const now = performance.now();
    const fireInterval = weapon === 'laser' ? 120 : weapon === 'triple' ? 220 : 180;
    if (now - lastShotTimeRef.current < fireInterval) return;
    lastShotTimeRef.current = now;

    // Web Audio shot sound
    soundFx.playShoot(weapon);

    // Muzzle flash / laser line from bottom barrel
    const startX = rect.width / 2;
    const startY = rect.height;

    // Shot visual effects
    if (weapon === 'triple') {
      [-25, 0, 25].forEach((offset) => {
        shotEffectsRef.current.push({
          startX: startX + offset * 2,
          startY,
          endX: x + offset,
          endY: y,
          alpha: 1,
          color: '#f59e0b',
          width: 3.5,
        });
      });
    } else {
      shotEffectsRef.current.push({
        startX,
        startY,
        endX: x,
        endY: y,
        alpha: 1,
        color: weapon === 'plasma' ? '#a855f7' : weapon === 'laser' ? '#10b981' : '#06b6d4',
        width: weapon === 'plasma' ? 6 : weapon === 'laser' ? 4.5 : 3,
      });
    }

    // Click shockwave
    shockwavesRef.current.push({
      x,
      y,
      radius: 4,
      maxRadius: 28,
      alpha: 0.8,
      color: '#ffffff',
      lineWidth: 2,
    });

    let hitAnyTarget = false;
    let hitCount = 0;

    // Check collision with targets (reverse iteration for top-most)
    for (let i = targetsRef.current.length - 1; i >= 0; i--) {
      const target = targetsRef.current[i];
      const dx = x - target.x;
      const dy = y - target.y;
      const dist = Math.hypot(dx, dy);

      // Hitbox radius: slightly generous for responsive arcade feel
      const effectiveHitRadius = target.radius + (weapon === 'plasma' ? 22 : 6);

      if (dist <= effectiveHitRadius) {
        hitAnyTarget = true;
        hitCount++;

        // Calculate critical bullseye (center 35% of face)
        const isBullseye = dist <= target.radius * 0.38;
        const damage = weapon === 'plasma' ? 2 : 1;

        target.hp -= damage;
        target.hitFlash = 1.0;
        target.squashX = 1.35;
        target.squashY = 0.65;
        target.vy += 1.5; // pushback impact

        // Small screen shake
        traumaRef.current = Math.min(traumaRef.current + 0.35, 1.0);

        if (target.type === 'bomb') {
          // Hit hazard bomb!
          soundFx.playExplosion();
          createExplosion(target.x, target.y, '#ef4444', 45);
          addFloatingText('BOOM! -200', target.x, target.y, '#ef4444', true);
          targetsRef.current.splice(i, 1);

          onUpdateStats((prev) => {
            const newLives = Math.max(0, prev.lives - 1);
            if (newLives === 0 && mode === 'survival') {
              onGameOver();
            }
            return {
              ...prev,
              score: Math.max(0, prev.score - 200),
              combo: 0,
              lives: newLives,
              shotsFired: prev.shotsFired + 1,
            };
          });
          continue;
        }

        if (target.hp <= 0) {
          // Target destroyed!
          const isGolden = target.type === 'golden';
          const isGiant = target.type === 'giant';

          if (isGolden) {
            soundFx.playGoldenHit();
          } else {
            // Hit sound with pitch rising with combo
            onUpdateStats((prev) => {
              const nextCombo = prev.combo + 1;
              soundFx.playTargetHit(nextCombo, isBullseye);
              if (nextCombo > 0 && nextCombo % 5 === 0) {
                soundFx.playComboFanfare();
              }
              return prev;
            });
          }

          // Hitstop on giant or critical for immense game feel
          if (isGiant || isBullseye) {
            hitStopRemainingRef.current = 45; // 45ms micro pause
            traumaRef.current = 0.8;
          }

          // Spawn particle explosion
          createExplosion(
            target.x, 
            target.y, 
            target.color, 
            isGiant ? 50 : isGolden ? 40 : 26, 
            isGolden
          );

          // Calculate final score
          onUpdateStats((prev) => {
            const nextCombo = prev.combo + 1;
            const multiplier = nextCombo >= 15 ? 4 : nextCombo >= 10 ? 3 : nextCombo >= 5 ? 2 : 1;
            const critBonus = isBullseye ? 2 : 1;
            const pointsGained = target.points * multiplier * critBonus;

            const scoreText = isBullseye 
              ? `BULLSEYE! +${pointsGained}` 
              : isGolden 
              ? `GOLDEN! +${pointsGained}`
              : `+${pointsGained}`;

            addFloatingText(
              scoreText, 
              target.x, 
              target.y, 
              isBullseye ? '#f43f5e' : isGolden ? '#fbbf24' : '#22d3ee', 
              isBullseye || isGolden
            );

            // Chance to spawn weapon powerup capsule from destroyed target
            if (Math.random() < 0.16) {
              const weaponDrops: WeaponType[] = ['triple', 'plasma', 'laser'];
              const dropped = weaponDrops[Math.floor(Math.random() * weaponDrops.length)];
              powerUpsRef.current.push({
                id: Math.random(),
                x: target.x,
                y: target.y,
                radius: 18,
                vy: 1.2,
                weapon: dropped,
                bobPhase: 0,
                collected: false,
              });
            }

            const newHits = prev.targetsHit + 1;
            const newShots = prev.shotsFired + 1;
            const newScore = prev.score + pointsGained;

            return {
              ...prev,
              score: newScore,
              highScore: Math.max(prev.highScore, newScore),
              targetsHit: newHits,
              shotsFired: newShots,
              combo: nextCombo,
              maxCombo: Math.max(prev.maxCombo, nextCombo),
              accuracy: Math.round((newHits / newShots) * 100),
            };
          });

          targetsRef.current.splice(i, 1);
        } else {
          // Target hit but still alive (shielded or giant)
          soundFx.playShieldHit();
          createExplosion(target.x, target.y, '#93c5fd', 12);
          addFloatingText(`HIT! (${target.hp} HP)`, target.x, target.y, '#60a5fa', false);

          onUpdateStats((prev) => ({
            ...prev,
            shotsFired: prev.shotsFired + 1,
            score: prev.score + 50,
          }));
        }

        // Single projectile doesn't pierce unless plasma or laser
        if (weapon !== 'plasma' && weapon !== 'laser') {
          break;
        }
      }
    }

    // Check weapon power-up pickup clicks
    for (let i = powerUpsRef.current.length - 1; i >= 0; i--) {
      const p = powerUpsRef.current[i];
      const dist = Math.hypot(x - p.x, y - p.y);
      if (dist <= p.radius + 15) {
        soundFx.playPowerup();
        createExplosion(p.x, p.y, '#a855f7', 20);
        addFloatingText(`${p.weapon.toUpperCase()} ACTIVATED!`, p.x, p.y, '#e879f9', true);
        onCollectWeapon(p.weapon);
        powerUpsRef.current.splice(i, 1);
        hitAnyTarget = true;
      }
    }

    // If missed everything
    if (!hitAnyTarget) {
      onUpdateStats((prev) => {
        const newShots = prev.shotsFired + 1;
        return {
          ...prev,
          shotsFired: newShots,
          combo: 0, // reset combo on miss
          accuracy: Math.round((prev.targetsHit / newShots) * 100),
        };
      });
    }
  }, [isPaused, isPlaying, weapon, mode, onUpdateStats, onGameOver, onCollectWeapon, createExplosion, addFloatingText]);

  // Main 60fps Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI resizing
    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect() || { width: window.innerWidth, height: window.innerHeight };
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.resetTransform();
      ctx.scale(dpr, dpr);

      if (starsRef.current.length === 0) {
        initStars(rect.width, rect.height);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Game loop tick
    const loop = (currentTime: number) => {
      if (!lastFrameTimeRef.current) lastFrameTimeRef.current = currentTime;
      const rawDt = (currentTime - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = currentTime;

      // Clamp delta time to 50ms to prevent simulation explosion on tab switch
      const dt = Math.min(rawDt, 0.05);

      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // Hit stop handler
      if (hitStopRemainingRef.current > 0) {
        hitStopRemainingRef.current -= dt * 1000;
        animationFrameIdRef.current = requestAnimationFrame(loop);
        return;
      }

      // Update Spawning if playing and not paused
      if (isPlaying && !isPaused) {
        spawnTimerRef.current += dt;
        const spawnInterval = mode === 'zen' ? 1.5 : mode === 'survival' ? 1.1 : 0.95;
        if (spawnTimerRef.current >= spawnInterval) {
          spawnTimerRef.current = 0;
          if (targetsRef.current.length < 12) {
            spawnTarget(width, height);
          }
        }
      }

      // Decay camera shake trauma
      traumaRef.current = Math.max(0, traumaRef.current - dt * 2.2);
      const shakeIntensity = traumaRef.current * traumaRef.current * 12;
      const shakeX = (Math.random() - 0.5) * shakeIntensity;
      const shakeY = (Math.random() - 0.5) * shakeIntensity;

      // CLEAR & RENDER CANVAS
      ctx.save();
      ctx.translate(shakeX, shakeY);

      // 1. Dark atmospheric space/arcade background
      ctx.fillStyle = '#05070f';
      ctx.fillRect(-10, -10, width + 20, height + 20);

      // Draw subtle neon grid at the bottom
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.06)';
      ctx.lineWidth = 1;
      const gridSpacing = 40;
      for (let gx = 0; gx < width; gx += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, height);
        ctx.stroke();
      }
      for (let gy = 0; gy < height; gy += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
        ctx.stroke();
      }

      // 2. Star dust particles
      starsRef.current.forEach((star) => {
        if (!isPaused) {
          star.y -= star.speed;
          if (star.y < 0) {
            star.y = height;
            star.x = Math.random() * width;
          }
        }
        ctx.fillStyle = `rgba(186, 230, 253, ${star.alpha})`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
      });

      // 3. Update & Draw PowerUps
      for (let i = powerUpsRef.current.length - 1; i >= 0; i--) {
        const p = powerUpsRef.current[i];
        if (!isPaused) {
          p.y += p.vy;
          p.bobPhase += dt * 3;
        }

        // Draw glowing orb
        const pulse = Math.sin(p.bobPhase) * 3;
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y + pulse, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(168, 85, 247, 0.25)';
        ctx.fill();
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.weapon === 'triple' ? '3X' : p.weapon === 'plasma' ? 'PLS' : 'LAS', p.x, p.y + pulse);
        ctx.restore();

        if (p.y > height + 50) {
          powerUpsRef.current.splice(i, 1);
        }
      }

      // 4. Update & Draw Floating Targets
      for (let i = targetsRef.current.length - 1; i >= 0; i--) {
        const t = targetsRef.current[i];

        if (!isPaused) {
          // Bobbing & drifting physics
          t.bobPhase += dt * t.bobSpeed;
          t.rotation += t.rotSpeed;

          t.x += t.vx + Math.sin(t.bobPhase) * 0.8;
          t.y += t.vy;

          // Screen edge bounce horizontally
          if (t.x - t.radius < 10) {
            t.x = 10 + t.radius;
            t.vx = Math.abs(t.vx);
          } else if (t.x + t.radius > width - 10) {
            t.x = width - 10 - t.radius;
            t.vx = -Math.abs(t.vx);
          }

          // Squash and stretch return to 1.0
          t.squashX += (1 - t.squashX) * 0.12;
          t.squashY += (1 - t.squashY) * 0.12;
          t.hitFlash = Math.max(0, t.hitFlash - dt * 5);

          // Escaped off top of screen
          if (t.y + t.radius < -10) {
            if (mode === 'survival' && t.type !== 'bomb') {
              // Missed target in survival mode loses a heart
              onUpdateStats((prev) => {
                const nextLives = Math.max(0, prev.lives - 1);
                if (nextLives === 0) onGameOver();
                return { ...prev, lives: nextLives, combo: 0 };
              });
            }
            targetsRef.current.splice(i, 1);
            continue;
          }
        }

        // RENDER TARGET
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.scale(t.squashX, t.squashY);
        ctx.rotate(t.rotation);

        // A. Pulsing Outer Glow Aura
        const pulseRadius = t.radius + Math.sin(t.bobPhase * 2) * 2;
        ctx.beginPath();
        ctx.arc(0, 0, pulseRadius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = t.color;
        ctx.lineWidth = t.type === 'golden' ? 4 : 2.5;
        ctx.shadowColor = t.color;
        ctx.shadowBlur = t.type === 'golden' ? 20 : 12;
        ctx.stroke();
        ctx.shadowBlur = 0; // reset shadow for crisp image

        // B. Target Face Portrait (Circular Clip)
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, t.radius, 0, Math.PI * 2);
        ctx.clip();

        if (faceImageRef.current && imageLoadedRef.current) {
          // Draw customized face with zoom and vertical offset
          const zoom = faceSettings.zoom || 1.1;
          const offsetYPercent = (faceSettings.offsetY || 0) / 100;

          const size = t.radius * 2 * zoom;
          const drawX = -size / 2;
          const drawY = -size / 2 + t.radius * 2 * offsetYPercent;

          ctx.drawImage(faceImageRef.current, drawX, drawY, size, size);
        } else {
          // Fallback arcade face silhouette
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(-t.radius, -t.radius, t.radius * 2, t.radius * 2);
          ctx.fillStyle = t.color;
          ctx.beginPath();
          ctx.arc(0, 0, t.radius * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }

        // C. Hit Flash Overlay
        if (t.hitFlash > 0) {
          ctx.fillStyle = `rgba(255, 255, 255, ${t.hitFlash * 0.75})`;
          ctx.fillRect(-t.radius, -t.radius, t.radius * 2, t.radius * 2);
        }

        ctx.restore(); // end circular clip

        // D. Inner Target Crosshair / Reticle Marks on Face
        ctx.strokeStyle = t.color;
        ctx.lineWidth = 1.5;
        const tickLength = 6;
        // Top tick
        ctx.beginPath();
        ctx.moveTo(0, -t.radius);
        ctx.lineTo(0, -t.radius + tickLength);
        ctx.stroke();
        // Bottom tick
        ctx.beginPath();
        ctx.moveTo(0, t.radius);
        ctx.lineTo(0, t.radius - tickLength);
        ctx.stroke();
        // Left tick
        ctx.beginPath();
        ctx.moveTo(-t.radius, 0);
        ctx.lineTo(-t.radius + tickLength, 0);
        ctx.stroke();
        // Right tick
        ctx.beginPath();
        ctx.moveTo(t.radius, 0);
        ctx.lineTo(t.radius - tickLength, 0);
        ctx.stroke();

        // Central Bullseye pip (for high accuracy critical rewards)
        ctx.beginPath();
        ctx.arc(0, 0, t.radius * 0.35, 0, Math.PI * 2);
        ctx.strokeStyle = `${t.color}66`;
        ctx.stroke();

        // E. Face Accessory Overlays
        if (faceSettings.accessory === 'sunglasses') {
          // Cool dark pixel shades
          ctx.fillStyle = '#0f172a';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          const glassW = t.radius * 0.55;
          const glassH = t.radius * 0.3;
          // Left lens
          ctx.beginPath();
          ctx.roundRect(-t.radius * 0.65, -t.radius * 0.15, glassW, glassH, 3);
          ctx.fill();
          ctx.stroke();
          // Right lens
          ctx.beginPath();
          ctx.roundRect(t.radius * 0.1, -t.radius * 0.15, glassW, glassH, 3);
          ctx.fill();
          ctx.stroke();
          // Bridge
          ctx.beginPath();
          ctx.moveTo(-t.radius * 0.1, -t.radius * 0.05);
          ctx.lineTo(t.radius * 0.1, -t.radius * 0.05);
          ctx.stroke();
        } else if (faceSettings.accessory === 'crown') {
          // Golden King Crown
          ctx.fillStyle = '#f59e0b';
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-t.radius * 0.7, -t.radius * 0.8);
          ctx.lineTo(-t.radius * 0.8, -t.radius * 1.35);
          ctx.lineTo(-t.radius * 0.3, -t.radius * 1.05);
          ctx.lineTo(0, -t.radius * 1.45);
          ctx.lineTo(t.radius * 0.3, -t.radius * 1.05);
          ctx.lineTo(t.radius * 0.8, -t.radius * 1.35);
          ctx.lineTo(t.radius * 0.7, -t.radius * 0.8);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (faceSettings.accessory === 'halo') {
          // Angel Halo
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#facc15';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.ellipse(0, -t.radius * 1.15, t.radius * 0.65, t.radius * 0.22, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else if (faceSettings.accessory === 'party_hat') {
          // Party Cone Hat
          ctx.fillStyle = '#ec4899';
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-t.radius * 0.5, -t.radius * 0.85);
          ctx.lineTo(0, -t.radius * 1.6);
          ctx.lineTo(t.radius * 0.5, -t.radius * 0.85);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          // Pom-pom on top
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.arc(0, -t.radius * 1.6, 5, 0, Math.PI * 2);
          ctx.fill();
        } else if (faceSettings.accessory === 'laser_eyes') {
          // Cyber Visor
          ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.roundRect(-t.radius * 0.75, -t.radius * 0.15, t.radius * 1.5, t.radius * 0.25, 4);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // F. Shield overlay if shielded target
        if (t.type === 'shielded' && t.hp > 1) {
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.85)';
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.arc(0, 0, t.radius + 8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // G. Bomb Warning Icon
        if (t.type === 'bomb') {
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 20px Outfit, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('💣', 0, 0);
        }

        ctx.restore();
      }

      // 5. Draw Laser Shots
      for (let i = shotEffectsRef.current.length - 1; i >= 0; i--) {
        const shot = shotEffectsRef.current[i];
        if (!isPaused) {
          shot.alpha -= dt * 6;
        }

        ctx.save();
        ctx.strokeStyle = shot.color;
        ctx.lineWidth = shot.width;
        ctx.globalAlpha = Math.max(0, shot.alpha);
        ctx.shadowColor = shot.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(shot.startX, shot.startY);
        ctx.lineTo(shot.endX, shot.endY);
        ctx.stroke();
        ctx.restore();

        if (shot.alpha <= 0) {
          shotEffectsRef.current.splice(i, 1);
        }
      }

      // 6. Draw Shockwaves
      for (let i = shockwavesRef.current.length - 1; i >= 0; i--) {
        const sw = shockwavesRef.current[i];
        if (!isPaused) {
          sw.radius += (sw.maxRadius - sw.radius) * (dt * 15);
          sw.alpha -= dt * 2.5;
        }

        ctx.save();
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = sw.lineWidth;
        ctx.globalAlpha = Math.max(0, sw.alpha);
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        if (sw.alpha <= 0) {
          shockwavesRef.current.splice(i, 1);
        }
      }

      // 7. Update & Draw Particles (Shards & Confetti)
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        if (!isPaused) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += p.gravity;
          p.vx *= p.drag;
          p.vy *= p.drag;
          p.alpha -= p.decay;
          p.rotation += p.rotSpeed;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;

        if (p.shape === 'shard') {
          ctx.beginPath();
          ctx.moveTo(-p.radius, -p.radius);
          ctx.lineTo(p.radius, -p.radius * 0.4);
          ctx.lineTo(p.radius * 0.6, p.radius);
          ctx.closePath();
          ctx.fill();
        } else if (p.shape === 'star') {
          ctx.beginPath();
          ctx.arc(0, 0, p.radius * 0.6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();

        if (p.alpha <= 0) {
          particlesRef.current.splice(i, 1);
        }
      }

      // 8. Update & Draw Floating Score Popups
      for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
        const ft = floatingTextsRef.current[i];
        if (!isPaused) {
          ft.x += ft.vx;
          ft.y += ft.vy;
          ft.vy *= 0.96;
          ft.age += dt;
          ft.alpha = Math.max(0, 1 - (ft.age / ft.duration));
        }

        ctx.save();
        ctx.globalAlpha = ft.alpha;
        ctx.font = `900 ${ft.fontSize}px Outfit, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Outer glow & outline
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = ft.isCrit ? 15 : 8;
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#05070f';
        ctx.strokeText(ft.text, ft.x, ft.y);

        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();

        if (ft.age >= ft.duration) {
          floatingTextsRef.current.splice(i, 1);
        }
      }

      // 9. Draw Custom High-Tech Dynamic Crosshair Reticle
      if (mousePosRef.current.active) {
        const mx = mousePosRef.current.x;
        const my = mousePosRef.current.y;
        const reticleColor = weapon === 'plasma' ? '#c084fc' : weapon === 'laser' ? '#34d399' : '#22d3ee';

        ctx.save();
        ctx.strokeStyle = reticleColor;
        ctx.lineWidth = 1.5;

        // Outer rotating ticks
        const rot = currentTime * 0.002;
        ctx.translate(mx, my);
        ctx.rotate(rot);

        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, -26);
        ctx.lineTo(0, -20);
        ctx.moveTo(0, 26);
        ctx.lineTo(0, 20);
        ctx.moveTo(-26, 0);
        ctx.lineTo(-20, 0);
        ctx.moveTo(26, 0);
        ctx.lineTo(20, 0);
        ctx.stroke();

        // Center dot
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      ctx.restore(); // end camera shake transform

      animationFrameIdRef.current = requestAnimationFrame(loop);
    };

    animationFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameIdRef.current);
    };
  }, [isPlaying, isPaused, mode, faceSettings, spawnTarget, onGameOver, onUpdateStats, weapon]);

  // Mouse & Touch events on canvas
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isMouseDownRef.current = true;
    mousePosRef.current = { x: e.clientX, y: e.clientY, active: true };
    handleFire(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    mousePosRef.current = { x: e.clientX, y: e.clientY, active: true };
    // Continuous fire for laser weapon
    if (isMouseDownRef.current && weapon === 'laser') {
      handleFire(e.clientX, e.clientY);
    }
  };

  const handlePointerUp = () => {
    isMouseDownRef.current = false;
  };

  const handlePointerLeave = () => {
    isMouseDownRef.current = false;
    mousePosRef.current.active = false;
  };

  return (
    <div className="relative w-full h-full cursor-crosshair overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        className="w-full h-full block"
      />
    </div>
  );
};
