// Nusa Bay itself: the road grid, the blocks between them, and every building,
// park and landmark in the city. Pure data — no drawing, no browser — so the
// world, the renderer and the screenshots all read the same city.
import { WORLD, PALETTE } from './config.js';
import { pick, range } from './random.js';

// Roads run down these x lines and across these y lines, 120 wide.
export const ROAD_X = [400, 1000, 1600, 2200, 2800];
export const ROAD_Y = [400, 1000, 1600, 2000];
export const ROAD_W = 120;

export const LANDMARKS = {
  cafe: { x: 880, y: 880, name: 'Cafe Dara', kind: 'cafe' },
  market: { x: 1480, y: 880, name: 'Pasar Senja', kind: 'market' },
  dock: { x: 2680, y: 1480, name: 'Dermaga Timur', kind: 'dock' },
  marina: { x: 520, y: 2080, name: 'Marina Teluk', kind: 'marina' },
  hotel: { x: 2080, y: 880, name: 'Hotel Cahaya', kind: 'hotel' },
  garage: { x: 880, y: 1480, name: 'Bengkel Jaya', kind: 'garage' },
  plaza: { x: 1480, y: 1480, name: 'Alun-Alun Nusa', kind: 'plaza' },
  hospital: { x: 2080, y: 1480, name: 'Klinik Bayu', kind: 'clinic' },
};

const BUILDING_COLORS = [PALETTE.building, PALETTE.building2, PALETTE.building3, PALETTE.building4];

export function createCity(random) {
  const buildings = [];
  const parks = [];
  // One building (or park) per city block between the roads.
  for (let bx = 0; bx < ROAD_X.length - 1; bx += 1) {
    for (let by = 0; by < ROAD_Y.length - 1; by += 1) {
      const x0 = ROAD_X[bx] + ROAD_W / 2 + 24;
      const y0 = ROAD_Y[by] + ROAD_W / 2 + 24;
      const x1 = ROAD_X[bx + 1] - ROAD_W / 2 - 24;
      const y1 = ROAD_Y[by + 1] - ROAD_W / 2 - 24;
      if (x1 - x0 < 120 || y1 - y0 < 120) continue;
      // The centre block is the plaza park, the south-west block is a beach park.
      if (bx === 1 && by === 1) {
        parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, name: 'Alun-Alun Nusa' });
        continue;
      }
      if (bx === 0 && by === 2) {
        parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, name: 'Taman Kelapa' });
        continue;
      }
      const w = range(random, 150, Math.min(260, x1 - x0));
      const h = range(random, 130, Math.min(220, y1 - y0));
      const x = x0 + range(random, 0, Math.max(0, x1 - x0 - w));
      const y = y0 + range(random, 0, Math.max(0, y1 - y0 - h));
      buildings.push({
        x, y, w, h,
        color: pick(random, BUILDING_COLORS),
        floors: 1 + Math.floor(random() * 4),
        name: '',
      });
    }
  }
  // Landmark buildings sit on the plaza and dock corners, named on the map.
  for (const key of Object.keys(LANDMARKS)) {
    const lm = LANDMARKS[key];
    buildings.push({
      x: lm.x - 70, y: lm.y - 55, w: 140, h: 110,
      color: key === 'cafe' ? '#c98f5f' : key === 'marina' ? '#5f8f7a' : '#7d8aa5',
      floors: key === 'hotel' ? 5 : 2, name: lm.name, landmark: key,
    });
  }
  return { buildings, parks, roadsX: ROAD_X, roadsY: ROAD_Y, roadW: ROAD_W };
}

export function isOnRoad(x, y) {
  for (const rx of ROAD_X) if (Math.abs(x - rx) < ROAD_W / 2) return true;
  for (const ry of ROAD_Y) if (Math.abs(y - ry) < ROAD_W / 2) return true;
  return false;
}

// Push a circle out of every building it overlaps; returns true if it hit one.
export function collideBuildings(city, p, radius) {
  let hit = false;
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(p.x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(p.y, b.y + b.h));
    const dx = p.x - cx;
    const dy = p.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      hit = true;
      if (d2 > 0.01) {
        const d = Math.sqrt(d2);
        p.x = cx + (dx / d) * radius;
        p.y = cy + (dy / d) * radius;
      } else {
        p.y = b.y - radius;
      }
    }
  }
  return hit;
}

export function clampWorld(p, margin) {
  p.x = Math.max(margin, Math.min(WORLD.width - margin, p.x));
  p.y = Math.max(margin, Math.min(WORLD.height - margin, p.y));
}
