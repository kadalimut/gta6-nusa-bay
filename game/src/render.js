// Drawing only: the world state and the current screen in, pixels out.
// The camera follows the player across the 3200x2400 city; the HUD, the
// minimap and the mission banner are drawn in screen space on top.
import { FIELD, WORLD, PALETTE, FONT, WANTED_MAX } from './config.js';
import { ROAD_X, ROAD_Y, ROAD_W } from './city.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WON = 'won';

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0, w: 1280, h: 720 };
  const fonts = new Map();
  function font(size, bold) {
    const key = `${bold ? '700 ' : ''}${size}`;
    if (!fonts.has(key)) fonts.set(key, `${bold ? '700 ' : ''}${size}px ${FONT}`);
    return fonts.get(key);
  }
  function text(value, x, y, size, color, align, bold) {
    context.font = font(size, bold);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }
  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const w = Math.round(window.innerWidth * ratio);
    const h = Math.round(window.innerHeight * ratio);
    canvas.width = w;
    canvas.height = h;
    view.scale = Math.min(w / FIELD.width, h / FIELD.height);
    view.w = w / view.scale;
    view.h = h / view.scale;
    view.x = (w - FIELD.width * view.scale) / 2;
    view.y = (h - FIELD.height * view.scale) / 2;
  }
  function camera(state) {
    const p = state.player;
    return {
      x: clamp(p.x - view.w / 2, 0, WORLD.width - view.w),
      y: clamp(p.y - view.h / 2, 0, WORLD.height - view.h),
    };
  }
  function drawCar(x, y, angle, color, police, w, l) {
    context.save();
    context.translate(x, y);
    context.rotate(angle);
    context.fillStyle = 'rgba(0,0,0,0.3)';
    context.fillRect(-l / 2 + 3, -w / 2 + 4, l, w);
    context.fillStyle = color;
    context.beginPath();
    context.roundRect(-l / 2, -w / 2, l, w, 9);
    context.fill();
    context.fillStyle = 'rgba(180,220,255,0.85)';
    context.fillRect(-l / 6, -w / 2 + 6, l / 3, w - 12);
    context.fillStyle = '#ffd23f';
    context.fillRect(l / 2 - 4, -w / 2 + 5, 4, 8);
    context.fillRect(l / 2 - 4, w / 2 - 13, 4, 8);
    if (police) {
      context.fillStyle = '#fff';
      context.fillRect(-l / 2 + 8, -w / 2 + 4, l - 16, 10);
      context.fillStyle = '#111';
      text('POLICE', 0, 2, 11, '#111', 'center', true);
      const flash = Math.floor(performance.now() / 280) % 2 === 0;
      context.fillStyle = flash ? '#ff3b30' : '#3b82f6';
      context.beginPath(); context.arc(-8, 0, 7, 0, Math.PI * 2); context.fill();
      context.fillStyle = flash ? '#3b82f6' : '#ff3b30';
      context.beginPath(); context.arc(8, 0, 7, 0, Math.PI * 2); context.fill();
    }
    context.restore();
  }
  function drawPerson(x, y, angle, color, radius) {
    context.save();
    context.translate(x, y);
    context.fillStyle = 'rgba(0,0,0,0.25)';
    context.beginPath(); context.ellipse(2, 3, radius, radius * 0.7, 0, 0, Math.PI * 2); context.fill();
    context.fillStyle = color;
    context.beginPath(); context.arc(0, 0, radius, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#f2c9a0';
    context.beginPath(); context.arc(Math.cos(angle) * 5, Math.sin(angle) * 5, radius * 0.55, 0, Math.PI * 2); context.fill();
    context.restore();
  }

  function drawCity(state, cam) {
    const city = state.city;
    // Grass base, sand beach and water along the south shore.
    context.fillStyle = PALETTE.grass;
    context.fillRect(0, 0, WORLD.width, WORLD.height);
    context.fillStyle = PALETTE.sand;
    context.fillRect(0, 2120, WORLD.width, 130);
    context.fillStyle = PALETTE.water;
    context.fillRect(0, 2250, WORLD.width, 150);
    context.fillStyle = PALETTE.waterDeep;
    for (let x = 0; x < WORLD.width; x += 260) {
      context.beginPath();
      context.arc(x + 80, 2320, 26, 0, Math.PI, false);
      context.fill();
    }
    // Parks.
    for (const park of city.parks) {
      context.fillStyle = PALETTE.park;
      context.fillRect(park.x, park.y, park.w, park.h);
      context.fillStyle = '#5d8a4a';
      for (let i = 0; i < 5; i += 1) {
        const tx = park.x + 40 + i * ((park.w - 80) / 4);
        const ty = park.y + park.h / 2 + (i % 2 === 0 ? -30 : 30);
        context.beginPath(); context.arc(tx, ty, 22, 0, Math.PI * 2); context.fill();
      }
      text(park.name, park.x + park.w / 2, park.y + park.h / 2 + 6, 20, '#2f4a24', 'center', true);
    }
    // Roads.
    context.fillStyle = PALETTE.road;
    for (const rx of ROAD_X) context.fillRect(rx - ROAD_W / 2, 0, ROAD_W, WORLD.height);
    for (const ry of ROAD_Y) context.fillRect(0, ry - ROAD_W / 2, WORLD.width, ROAD_W);
    context.strokeStyle = PALETTE.lane;
    context.lineWidth = 4;
    context.setLineDash([26, 22]);
    context.beginPath();
    for (const rx of ROAD_X) { context.moveTo(rx, 0); context.lineTo(rx, WORLD.height); }
    for (const ry of ROAD_Y) { context.moveTo(0, ry); context.lineTo(WORLD.width, ry); }
    context.stroke();
    context.setLineDash([]);
    // Buildings with roofs, windows and names.
    for (const b of city.buildings) {
      context.fillStyle = 'rgba(0,0,0,0.25)';
      context.fillRect(b.x + 5, b.y + 6, b.w, b.h);
      context.fillStyle = b.color;
      context.fillRect(b.x, b.y, b.w, b.h);
      context.fillStyle = 'rgba(255,255,255,0.16)';
      context.fillRect(b.x, b.y, b.w, 12);
      context.fillStyle = 'rgba(20,30,50,0.55)';
      for (let wx = b.x + 14; wx < b.x + b.w - 18; wx += 30) {
        for (let wy = b.y + 26; wy < b.y + b.h - 16; wy += 30) context.fillRect(wx, wy, 14, 12);
      }
      if (b.name) text(b.name, b.x + b.w / 2, b.y + b.h / 2 + 6, 17, '#fff', 'center', true);
    }
    // Mission target ring.
    const step = state.missionStep;
    if (step && step.target) {
      const pulse = 1 + Math.sin(performance.now() / 300) * 0.12;
      context.strokeStyle = PALETTE.marker;
      context.lineWidth = 5;
      context.beginPath();
      context.arc(step.target.x, step.target.y, step.radius * pulse, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = PALETTE.marker;
      context.beginPath();
      context.moveTo(step.target.x, step.target.y - 52);
      context.lineTo(step.target.x - 14, step.target.y - 24);
      context.lineTo(step.target.x + 14, step.target.y - 24);
      context.closePath();
      context.fill();
    }
    // Crates.
    for (const crate of state.crates) {
      if (crate.taken) continue;
      context.fillStyle = '#8a5a2b';
      context.fillRect(crate.x - 16, crate.y - 16, 32, 32);
      context.strokeStyle = '#f2c94c';
      context.lineWidth = 3;
      context.strokeRect(crate.x - 16, crate.y - 16, 32, 32);
      text('$', crate.x, crate.y + 6, 18, '#f2c94c', 'center', true);
    }
  }

  function drawWorld(state, cam) {
    context.save();
    context.translate(-cam.x, -cam.y);
    drawCity(state, cam);
    for (const car of state.cars) drawCar(car.x, car.y, car.angle, car.color, false, 46, 84);
    for (const cop of state.police) drawCar(cop.x, cop.y, cop.angle, cop.color, true, 46, 84);
    for (const ped of state.peds) drawPerson(ped.x, ped.y, ped.angle, ped.color, 11);
    for (const b of state.bullets) {
      context.fillStyle = '#ffd23f';
      context.beginPath(); context.arc(b.x, b.y, 4, 0, Math.PI * 2); context.fill();
    }
    for (const p of state.particles) {
      context.globalAlpha = Math.max(0, p.life / p.max);
      context.fillStyle = p.color;
      context.beginPath(); context.arc(p.x, p.y, p.size, 0, Math.PI * 2); context.fill();
      context.globalAlpha = 1;
    }
    const pl = state.player;
    if (pl.inCar && pl.car) {
      drawCar(pl.car.x, pl.car.y, pl.car.angle, pl.car.color, false, 46, 84);
    } else {
      if (pl.invulnerable <= 0 || Math.floor(pl.invulnerable * 8) % 2 === 0) {
        drawPerson(pl.x, pl.y, pl.angle, PALETTE.player, 15);
        // Aim line when the mouse is down over the game.
        context.strokeStyle = 'rgba(255,255,255,0.5)';
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(pl.x, pl.y);
        context.lineTo(pl.x + Math.cos(pl.angle) * 44, pl.y + Math.sin(pl.angle) * 44);
        context.stroke();
      }
    }
    context.restore();
  }

  function drawMinimap(state) {
    const mw = 200;
    const mh = 150;
    const mx = FIELD.width - mw - 16;
    const my = 16;
    const sx = mw / WORLD.width;
    const sy = mh / WORLD.height;
    context.fillStyle = 'rgba(10,16,24,0.85)';
    context.fillRect(mx - 6, my - 6, mw + 12, mh + 12);
    context.fillStyle = '#3f6b4a';
    context.fillRect(mx, my, mw, mh);
    context.fillStyle = '#3a3f4a';
    for (const rx of ROAD_X) context.fillRect(mx + rx * sx - 2, my, 4, mh);
    for (const ry of ROAD_Y) context.fillRect(mx, my + ry * sy, mw, 4);
    context.fillStyle = '#2e7fa8';
    context.fillRect(mx, my + 2250 * sy, mw, mh - 2250 * sy);
    const step = state.missionStep;
    if (step && step.target) {
      context.fillStyle = PALETTE.marker;
      context.beginPath(); context.arc(mx + step.target.x * sx, my + step.target.y * sy, 6, 0, Math.PI * 2); context.fill();
    }
    for (const cop of state.police) {
      context.fillStyle = '#3b82f6';
      context.beginPath(); context.arc(mx + cop.x * sx, my + cop.y * sy, 4, 0, Math.PI * 2); context.fill();
    }
    const pl = state.player;
    context.fillStyle = '#fff';
    context.beginPath(); context.arc(mx + pl.x * sx, my + pl.y * sy, 5, 0, Math.PI * 2); context.fill();
    context.strokeStyle = PALETTE.player;
    context.lineWidth = 2;
    context.beginPath(); context.arc(mx + pl.x * sx, my + pl.y * sy, 5, 0, Math.PI * 2); context.stroke();
    text('NUSA BAY', mx + mw / 2, my + mh + 22, 13, '#fff', 'center', true);
  }

  function drawHud(state) {
    const pl = state.player;
    context.fillStyle = 'rgba(10,16,24,0.82)';
    context.fillRect(0, 0, FIELD.width, 64);
    // Wanted stars.
    for (let i = 0; i < WANTED_MAX; i += 1) {
      context.fillStyle = i < state.wanted ? PALETTE.gold : 'rgba(255,255,255,0.25)';
      context.font = font(26, true);
      context.textAlign = 'center';
      context.fillText('★', 30 + i * 30, 40);
    }
    text(`$${state.money}`, 200, 40, 26, PALETTE.hudText, 'left', true);
    // Health bar.
    context.fillStyle = '#333';
    context.fillRect(330, 22, 160, 18);
    context.fillStyle = pl.health > 40 ? PALETTE.good : PALETTE.danger;
    context.fillRect(330, 22, 160 * Math.max(0, pl.health / 100), 18);
    text(`HP ${Math.max(0, Math.round(pl.health))}`, 500, 40, 20, PALETTE.hudText, 'left', true);
    // Mission title sits between the health bar and the minimap, never over them.
    const m = state.mission;
    if (m) text(m.title, 810, 40, 22, PALETTE.gold, 'center', true);
    if (pl.inCar) {
      context.fillStyle = 'rgba(10,16,24,0.7)';
      context.fillRect(FIELD.width - 150, FIELD.height - 112, 134, 34);
      text(`${Math.round(Math.abs(pl.speed) * 0.18)} km/h`, FIELD.width - 16, FIELD.height - 88, 20, PALETTE.gold, 'right', true);
    }
    // Objective line under the bar.
    context.fillStyle = 'rgba(10,16,24,0.7)';
    context.fillRect(16, FIELD.height - 58, FIELD.width - 232, 42);
    text(`► ${state.objective}`, 28, FIELD.height - 30, 20, '#fff', 'left');
    if (state.message && state.messageTimer > 0) {
      context.fillStyle = 'rgba(242,201,76,0.95)';
      context.fillRect(16, 76, Math.min(860, 24 + state.message.length * 9), 36);
      text(state.message, 28, 101, 19, '#111', 'left', true);
    }
    text('WASD drive / walk · E enter car / collect · Click shoot · P pause · Q save', FIELD.width - 16, FIELD.height - 30, 15, PALETTE.muted, 'right');
    drawMinimap(state);
  }

  function drawPanel(title, lines, prompt) {
    const w = 680;
    const h = 150 + lines.length * 34;
    const x = (FIELD.width - w) / 2;
    const y = (FIELD.height - h) / 2;
    context.fillStyle = 'rgba(10,16,24,0.92)';
    context.fillRect(x, y, w, h);
    context.strokeStyle = PALETTE.gold;
    context.lineWidth = 3;
    context.strokeRect(x, y, w, h);
    text(title, FIELD.width / 2, y + 72, 46, PALETTE.gold, 'center', true);
    for (let i = 0; i < lines.length; i += 1) text(lines[i], FIELD.width / 2, y + 122 + i * 34, 21, '#e8eef2', 'center');
    text(prompt, FIELD.width / 2, y + h - 28, 21, PALETTE.gold, 'center', true);
  }

  function draw(state, screen, extra) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const cam = camera(state);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    // The HUD is drawn in 1280x720 space: translate the camera only for the world.
    context.save();
    context.translate(-cam.x, -cam.y);
    drawCity(state, cam);
    for (const car of state.cars) drawCar(car.x, car.y, car.angle, car.color, false, 46, 84);
    for (const cop of state.police) drawCar(cop.x, cop.y, cop.angle, cop.color, true, 46, 84);
    for (const ped of state.peds) drawPerson(ped.x, ped.y, ped.angle, ped.color, 11);
    for (const b of state.bullets) {
      context.fillStyle = '#ffd23f';
      context.beginPath(); context.arc(b.x, b.y, 4, 0, Math.PI * 2); context.fill();
    }
    for (const p of state.particles) {
      context.globalAlpha = Math.max(0, p.life / p.max);
      context.fillStyle = p.color;
      context.beginPath(); context.arc(p.x, p.y, p.size, 0, Math.PI * 2); context.fill();
      context.globalAlpha = 1;
    }
    const pl = state.player;
    if (pl.inCar && pl.car) drawCar(pl.car.x, pl.car.y, pl.car.angle, pl.car.color, false, 46, 84);
    else if (pl.invulnerable <= 0 || Math.floor(pl.invulnerable * 8) % 2 === 0) drawPerson(pl.x, pl.y, pl.angle, PALETTE.player, 15);
    context.restore();
    // HUD / panels in screen space.
    if (screen === SCREEN_TITLE) {
      drawPanel('NUSA BAY', [
        'An open-world crime story on a sun-soaked coast.',
        'Raka came home owing a debt. Drive, steal, run — and pay it back.',
        'City on foot and by car · traffic · police · 3 missions · combat',
        'WASD move / drive · E enter car · Click shoot · P pause · Q save',
      ], extra && extra.hasSave ? 'Press Enter — Continue, or N — New game' : 'Press Enter or click to start');
      return;
    }
    drawHud(state);
    if (screen === SCREEN_PAUSED) drawPanel('Paused', ['The city waits for you.'], 'Press P to resume');
    else if (screen === SCREEN_OVER) drawPanel('BUSTED', [`The Nusa Bay police caught Raka.`, `Money kept: $${state.money} · Jobs done: ${state.missionIndex} of 3`], 'Press Enter to try again');
    else if (screen === SCREEN_WON) drawPanel('DEBT PAID — NUSA BAY IS YOURS', [`Raka sailed out of Marina Teluk a free driver.`, `Money: $${state.money} · Cars stolen: ${state.carsStolen} · Shots fired: ${state.shotsFired}`], 'Press Enter to play again');
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, camera };
}
