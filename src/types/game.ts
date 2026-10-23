export type GameMode = 'arcade' | 'survival' | 'zen';

export type TargetType = 
  | 'standard' 
  | 'speedy' 
  | 'golden' 
  | 'shielded' 
  | 'giant'
  | 'bomb';

export type WeaponType = 'blaster' | 'triple' | 'plasma' | 'laser';

export type AccessoryType = 'none' | 'sunglasses' | 'crown' | 'party_hat' | 'halo' | 'laser_eyes';

export interface Target {
  id: number;
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  baseRadius: number;
  type: TargetType;
  maxHp: number;
  hp: number;
  bobPhase: number;
  bobSpeed: number;
  rotation: number;
  rotSpeed: number;
  wobbleX: number;
  wobbleY: number;
  hitFlash: number; // 0 to 1
  squashX: number;
  squashY: number;
  color: string;
  points: number;
  shieldRadius?: number;
  isEscaped?: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
  gravity: number;
  drag: number;
  rotation: number;
  rotSpeed: number;
  shape: 'circle' | 'shard' | 'spark' | 'star' | 'ring';
}

export interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  fontSize: number;
  alpha: number;
  scale: number;
  duration: number;
  age: number;
  isCrit?: boolean;
}

export interface ShotEffect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  alpha: number;
  color: string;
  width: number;
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
  lineWidth: number;
}

export interface PowerUpItem {
  id: number;
  x: number;
  y: number;
  radius: number;
  vy: number;
  weapon: WeaponType;
  bobPhase: number;
  collected: boolean;
}

export interface GameStats {
  score: number;
  highScore: number;
  targetsHit: number;
  shotsFired: number;
  combo: number;
  maxCombo: number;
  accuracy: number;
  timeRemaining: number;
  lives: number;
}

export interface CustomFaceSettings {
  imageUrl: string;
  name: string;
  zoom: number; // 0.8 - 2.5
  offsetY: number; // -50 to 50
  accessory: AccessoryType;
}
