// Nusa Bay — every tuning number and colour in one place.
// The world is a 3200x2400 coastal city; the camera shows a 1280x720 window of it.
// All rules use world units, never screen pixels, so the game plays the same at any size.
export const FIELD = { width: 1280, height: 720 };
export const WORLD = { width: 3200, height: 2400 };
export const STEP = 1 / 60;

export const PLAYER = { radius: 16, walkSpeed: 230, runSpeed: 320, health: 100 };
export const CAR = { width: 46, length: 84, accel: 420, brake: 700, maxSpeed: 560, reverse: 220, turn: 2.6 };
export const POLICE = { maxSpeed: 500, accel: 380, ramDamage: 8 };
export const BULLET = { speed: 900, damage: 34, life: 0.9, rate: 0.22 };

export const WANTED_MAX = 5;
export const SAVE_KEY = 'nusa-bay.save.v1';
export const BEST_KEY = 'nusa-bay.best';

export const PALETTE = {
  backdrop: '#0e1420',
  grass: '#7fb069',
  grassDark: '#6a9a58',
  park: '#8fbf7a',
  sand: '#e8d5a3',
  water: '#2e7fa8',
  waterDeep: '#1f5f86',
  road: '#3a3f4a',
  roadEdge: '#2c303a',
  lane: '#e8d44d',
  sidewalk: '#9aa0ab',
  building: '#c98f5f',
  building2: '#7d8aa5',
  building3: '#b56a6a',
  building4: '#5f8f7a',
  roof: '#8a5a3b',
  player: '#ff7a1a',
  playerDark: '#c25a00',
  police: '#1c2733',
  policeLight: '#ff3b30',
  policeLight2: '#3b82f6',
  ped: '#e8e3d8',
  carColors: ['#d94f4f', '#4f7dd9', '#e8c547', '#7dd94f', '#9b59d0', '#e8e8e8', '#3a3a3a', '#d97b4f'],
  hud: '#101820',
  hudText: '#f2f5f7',
  gold: '#f2c94c',
  muted: '#aab3bd',
  danger: '#ff5a4e',
  good: '#5ad97a',
  marker: '#ffd23f',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
