// Nusa Bay rules and state: the player on foot or in a car, traffic, pedestrians,
// police, bullets, crates and the three missions. No drawing and no browser here:
// step() advances one fixed step and the renderer paints the state it returns.
import { WORLD, PLAYER, CAR, POLICE, BULLET, WANTED_MAX, PALETTE } from './config.js';
import { createCity, collideBuildings, clampWorld, ROAD_X, ROAD_Y, ROAD_W, LANDMARKS } from './city.js';
import { MISSIONS, missionObjective } from './missions.js';
import { pick, range } from './random.js';

export const EVENT_NONE = 0;
export const EVENT_CRIME = 1;
export const EVENT_MISSION = 2;
export const EVENT_BUSTED = 4;
export const EVENT_WON = 8;
export const EVENT_PICKUP = 16;

function dist2(a, b) { const dx = a.x - b.x; const dy = a.y - b.y; return dx * dx + dy * dy; }
function angleTo(a, b) { return Math.atan2(b.y - a.y, b.x - a.x); }

export function createWorld(random) {
  const city = createCity(random);
  const player = { x: 880, y: 760, angle: 0, health: PLAYER.health, inCar: false, car: null, speed: 0, invulnerable: 0 };
  const cars = [];
  const peds = [];
  const police = [];
  const bullets = [];
  const particles = [];
  const crates = [];
  const state = {
    player, cars, peds, police, bullets, particles, crates, city,
    wanted: 0, money: 120, missionIndex: 0, stepIndex: 0, collected: 0,
    elapsed: 0, message: '', messageTimer: 0, busted: false, won: false,
    shotsFired: 0, carsStolen: 0, quietTimer: 0, shootCooldown: 0, sirenPhase: 0,
  };

  function say(text, seconds) {
    state.message = text;
    state.messageTimer = seconds || 3;
  }
  function addWanted(n) {
    state.wanted = Math.max(0, Math.min(WANTED_MAX, state.wanted + n));
    state.quietTimer = 0;
  }
  function spawnParticles(x, y, color, n, speed) {
    for (let i = 0; i < n; i += 1) {
      const a = random() * Math.PI * 2;
      const s = range(random, 40, speed || 180);
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: range(random, 0.3, 0.7), max: 0.7, color, size: range(random, 3, 6) });
    }
  }

  function makeTrafficCar() {
    const horizontal = random() < 0.5;
    const road = horizontal ? pick(random, ROAD_Y) : pick(random, ROAD_X);
    const dir = random() < 0.5 ? 1 : -1;
    const lane = (random() < 0.5 ? -1 : 1) * 28;
    const car = {
      x: horizontal ? range(random, 100, WORLD.width - 100) : road + lane,
      y: horizontal ? road + lane : range(random, 100, WORLD.height - 100),
      angle: horizontal ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2),
      speed: range(random, 120, 200), baseSpeed: 160,
      axis: horizontal ? 'h' : 'v', dir, color: pick(random, PALETTE.carColors),
      police: false, parked: false,
    };
    car.baseSpeed = car.speed;
    return car;
  }
  function makeParkedCar() {
    const road = pick(random, ROAD_X);
    const y = range(random, 200, WORLD.height - 200);
    const side = random() < 0.5 ? -1 : 1;
    return {
      x: road + side * (ROAD_W / 2 + 34), y,
      angle: side > 0 ? Math.PI / 2 : -Math.PI / 2, speed: 0, baseSpeed: 0,
      axis: 'v', dir: 1, color: pick(random, PALETTE.carColors), police: false, parked: true,
    };
  }
  function makePed() {
    const road = pick(random, ROAD_X);
    return {
      x: road + (random() < 0.5 ? -1 : 1) * range(random, 80, 150),
      y: range(random, 150, WORLD.height - 150),
      angle: range(random, 0, Math.PI * 2), speed: range(random, 40, 80),
      tx: 0, ty: 0, color: pick(random, ['#e8e3d8', '#7fb069', '#d9a441', '#8a6fb0', '#5a8ab0']),
      flee: 0,
    };
  }
  function spawnPoliceCar() {
    const a = random() * Math.PI * 2;
    const car = {
      x: Math.max(80, Math.min(WORLD.width - 80, player.x + Math.cos(a) * 700)),
      y: Math.max(80, Math.min(WORLD.height - 80, player.y + Math.sin(a) * 700)),
      angle: 0, speed: 0, baseSpeed: POLICE.maxSpeed,
      axis: 'h', dir: 1, color: '#1c2733', police: true, parked: false,
    };
    police.push(car);
    return car;
  }
  function placeCrates() {
    // On the roads around the dock, never inside a building: every crate must be
    // reachable on foot.
    crates.length = 0;
    crates.push({ x: 2800, y: 1400, taken: false });
    crates.push({ x: 2800, y: 1560, taken: false });
    crates.push({ x: 2620, y: 1600, taken: false });
  }

  function reset() {
    player.x = 880; player.y = 760; player.angle = 0; player.health = PLAYER.health;
    player.inCar = false; player.car = null; player.speed = 0; player.invulnerable = 0;
    cars.length = 0; peds.length = 0; police.length = 0; bullets.length = 0; particles.length = 0;
    for (let i = 0; i < 14; i += 1) cars.push(makeTrafficCar());
    for (let i = 0; i < 7; i += 1) cars.push(makeParkedCar());
    for (let i = 0; i < 18; i += 1) peds.push(makePed());
    placeCrates();
    state.wanted = 0; state.money = 120; state.missionIndex = 0; state.stepIndex = 0;
    state.collected = 0; state.elapsed = 0; state.busted = false; state.won = false;
    state.shotsFired = 0; state.carsStolen = 0; state.quietTimer = 0; state.shootCooldown = 0;
    say('Nusa Bay — find Dara at Cafe Dara. Follow the gold marker.', 4);
  }

  function currentMission() { return MISSIONS[state.missionIndex] || null; }
  function currentStep() {
    const m = currentMission();
    return m ? m.steps[state.stepIndex] || null : null;
  }
  function advanceStep() {
    const m = currentMission();
    if (!m) return EVENT_NONE;
    state.stepIndex += 1;
    if (state.stepIndex >= m.steps.length) {
      state.money += m.payout;
      say(`${m.title} complete! +$${m.payout}`, 4);
      state.missionIndex += 1;
      state.stepIndex = 0;
      state.collected = 0;
      if (state.missionIndex >= MISSIONS.length) {
        state.won = true;
        state.wanted = 0;
        return EVENT_MISSION | EVENT_WON;
      }
      const next = MISSIONS[state.missionIndex];
      say(`${next.title}: ${next.story}`, 5);
      if (next.id === 'harbour-run') { addWanted(2); placeCrates(); }
      if (next.id === 'bay-getaway') addWanted(3);
      return EVENT_MISSION;
    }
    return EVENT_MISSION;
  }
  function checkMission() {
    const step = currentStep();
    if (!step) return EVENT_NONE;
    const d = Math.sqrt(dist2(player, step.target));
    if (step.kind === 'go' && d < step.radius) return advanceStep();
    if (step.kind === 'escape' && d < step.radius) return advanceStep();
    return EVENT_NONE;
  }

  function nearestCar(maxDist) {
    let best = null;
    let bestD = maxDist * maxDist;
    for (const c of cars) {
      if (c.police) continue;
      const d = dist2(player, c);
      if (d < bestD) { bestD = d; best = c; }
    }
    for (const c of police) {
      const d = dist2(player, c);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }
  function enterCar() {
    const car = nearestCar(70);
    if (!car) { say('No car close enough — walk to a car and press E.', 2); return; }
    if (car.police) { say('That is a police car!', 2); return; }
    player.inCar = true;
    player.car = car;
    player.x = car.x; player.y = car.y; player.angle = car.angle; player.speed = 0;
    car.parked = false;
    if (!car.stolen) {
      car.stolen = true;
      state.carsStolen += 1;
      addWanted(1);
      say('Car stolen! Wanted level up — the police are coming.', 3);
    }
  }
  function exitCar() {
    const car = player.car;
    player.inCar = false;
    player.car = null;
    player.speed = 0;
    player.x += Math.cos(player.angle + Math.PI / 2) * 50;
    player.y += Math.sin(player.angle + Math.PI / 2) * 50;
    clampWorld(player, 24);
    if (car) { car.speed = 0; }
  }
  function shoot() {
    if (state.shootCooldown > 0) return;
    state.shootCooldown = BULLET.rate;
    state.shotsFired += 1;
    const a = player.angle;
    bullets.push({
      x: player.x + Math.cos(a) * 26, y: player.y + Math.sin(a) * 26,
      vx: Math.cos(a) * BULLET.speed, vy: Math.sin(a) * BULLET.speed, life: BULLET.life,
    });
    spawnParticles(player.x + Math.cos(a) * 30, player.y + Math.sin(a) * 30, '#ffd23f', 4, 120);
    addWanted(0); // shooting in the open draws attention through the hit below
    if (state.wanted === 0 && random() < 0.5) addWanted(1);
  }

  function step(dt, ctrl) {
    if (state.busted || state.won) return EVENT_NONE;
    let events = EVENT_NONE;
    state.elapsed += dt;
    state.sirenPhase += dt;
    if (state.messageTimer > 0) state.messageTimer -= dt;
    if (state.shootCooldown > 0) state.shootCooldown -= dt;
    if (player.invulnerable > 0) player.invulnerable -= dt;
    state.quietTimer += dt;

    // --- player ---
    const mx = ctrl.moveX || 0;
    const my = ctrl.moveY || 0;
    if (player.inCar && player.car) {
      const car = player.car;
      const throttle = my < 0 ? 1 : my > 0 ? -0.6 : 0; // up = forward
      if (throttle > 0) car.speed = Math.min(CAR.maxSpeed, car.speed + CAR.accel * dt);
      else if (throttle < 0) car.speed = Math.max(-CAR.reverse, car.speed - CAR.brake * dt * 0.6);
      else car.speed *= Math.max(0, 1 - 1.6 * dt);
      if (Math.abs(car.speed) > 20) car.angle += mx * CAR.turn * dt * Math.sign(car.speed);
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      player.x = car.x; player.y = car.y; player.angle = car.angle; player.speed = car.speed;
      if (collideBuildings(city, car, 34)) { car.speed *= 0.5; }
      clampWorld(car, 40);
      player.x = car.x; player.y = car.y;
    } else {
      const moving = mx !== 0 || my !== 0;
      const speed = ctrl.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
      if (moving) {
        const len = Math.hypot(mx, my) || 1;
        player.x += (mx / len) * speed * dt;
        player.y += (my / len) * speed * dt;
        player.angle = Math.atan2(my, mx);
      }
      if (ctrl.aim !== undefined && ctrl.aim !== null) player.angle = ctrl.aim;
      collideBuildings(city, player, PLAYER.radius);
      clampWorld(player, 24);
    }
    // E near a crate collects the crate instead of (un)locking a car, so the two
    // uses of one key never fight each other at the docks.
    const nearCrate = currentMission() && currentMission().id === 'harbour-run' && state.stepIndex === 0
      && crates.some((c) => !c.taken && Math.sqrt(dist2(player, c)) < 60);
    if (ctrl.enter) {
      if (player.inCar) exitCar();
      else if (!nearCrate) enterCar();
    }
    if (ctrl.shoot) shoot();
    // Slow health regen when nobody is after you.
    if (state.wanted === 0 && player.health < PLAYER.health) player.health = Math.min(PLAYER.health, player.health + 4 * dt);

    // --- traffic ---
    for (const car of cars) {
      if (car.parked || car === player.car) continue;
      if (car.axis === 'h') car.x += car.dir * car.speed * dt;
      else car.y += car.dir * car.speed * dt;
      if (car.x < -60) car.x = WORLD.width + 40;
      if (car.x > WORLD.width + 60) car.x = -40;
      if (car.y < -60) car.y = WORLD.height + 40;
      if (car.y > WORLD.height + 60) car.y = -40;
    }
    // Traffic bumps the player on foot.
    for (const car of cars) {
      if (car === player.car) continue;
      const d = Math.sqrt(dist2(player, car));
      if (!player.inCar && d < 40 && player.invulnerable <= 0) {
        player.health -= 6; player.invulnerable = 1;
        spawnParticles(player.x, player.y, '#ff5a4e', 8, 200);
        if (player.health <= 0) { state.busted = true; return EVENT_BUSTED; }
      }
      if (player.inCar && d < 52 && Math.abs(car.speed) > 0 && (car.hitTimer || 0) <= 0) {
        // A shunt: both cars slow, sparks fly. Cooled down so one touch does not
        // pin the player car frame after frame.
        car.hitTimer = 0.7;
        car.speed *= 0.4;
        if (player.car) player.car.speed *= 0.85;
        spawnParticles((player.x + car.x) / 2, (player.y + car.y) / 2, '#ffd23f', 6, 160);
      }
      if (car.hitTimer > 0) car.hitTimer -= dt;
    }

    // --- pedestrians: wander, flee from gunfire and speeding cars ---
    for (const ped of peds) {
      const nearCar = player.inCar && player.car && Math.abs(player.car.speed) > 200 && Math.sqrt(dist2(ped, player)) < 160;
      const nearShot = bullets.length > 0 && Math.sqrt(dist2(ped, player)) < 220;
      if (nearCar || nearShot || ped.flee > 0) {
        ped.flee = Math.max(ped.flee, 1.2);
        const a = angleTo(player, ped);
        ped.x += Math.cos(a) * 130 * dt;
        ped.y += Math.sin(a) * 130 * dt;
      } else {
        if (!ped.tx || Math.sqrt(dist2(ped, { x: ped.tx, y: ped.ty })) < 20) {
          ped.tx = ped.x + range(random, -260, 260);
          ped.ty = ped.y + range(random, -260, 260);
        }
        const a = angleTo(ped, { x: ped.tx, y: ped.ty });
        ped.angle = a;
        ped.x += Math.cos(a) * ped.speed * dt;
        ped.y += Math.sin(a) * ped.speed * dt;
      }
      if (ped.flee > 0) ped.flee -= dt;
      collideBuildings(city, ped, 12);
      clampWorld(ped, 20);
      // Run over by the player's car: a crime, and the ped gets up and runs.
      if (player.inCar && Math.sqrt(dist2(ped, player)) < 42) {
        addWanted(1);
        spawnParticles(ped.x, ped.y, '#ff5a4e', 10, 220);
        ped.x += range(random, -160, 160);
        ped.y += range(random, -160, 160);
        ped.flee = 2;
      }
    }

    // --- police ---
    const wantPolice = state.wanted === 0 ? 0 : state.wanted <= 2 ? 2 : state.wanted <= 4 ? 3 : 4;
    while (police.length < wantPolice) spawnPoliceCar();
    while (police.length > wantPolice) police.pop();
    for (const cop of police) {
      const a = angleTo(cop, player);
      let diff = a - cop.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      cop.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
      cop.speed = Math.min(POLICE.maxSpeed, cop.speed + POLICE.accel * dt);
      cop.x += Math.cos(cop.angle) * cop.speed * dt;
      cop.y += Math.sin(cop.angle) * cop.speed * dt;
      collideBuildings(city, cop, 34);
      clampWorld(cop, 40);
      const d = Math.sqrt(dist2(cop, player));
      if (cop.ramTimer > 0) cop.ramTimer -= dt;
      if (d < 48) {
        // Keep the police car from sitting inside the player: push it back out.
        const push = (48 - d) / 2;
        const pa = Math.atan2(cop.y - player.y, cop.x - player.x);
        cop.x += Math.cos(pa) * push;
        cop.y += Math.sin(pa) * push;
        if (cop.ramTimer <= 0) {
          cop.ramTimer = 0.9;
          if (!player.inCar && player.invulnerable <= 0) {
            player.health -= POLICE.ramDamage;
            player.invulnerable = 1;
            spawnParticles(player.x, player.y, '#3b82f6', 8, 200);
            if (player.health <= 0) { state.busted = true; return EVENT_BUSTED; }
          } else if (player.inCar && player.car) {
            player.car.speed *= 0.9;
            cop.speed *= 0.6;
            spawnParticles((player.x + cop.x) / 2, (player.y + cop.y) / 2, '#ffd23f', 6, 180);
          }
        }
      }
    }
    // Wanted fades when the police lose you.
    if (state.wanted > 0 && state.quietTimer > 14) {
      state.wanted -= 1;
      state.quietTimer = 0;
      say(state.wanted === 0 ? 'You lost them. Wanted level clear.' : `Wanted level down to ${state.wanted} star${state.wanted === 1 ? '' : 's'}.`, 3);
    }

    // --- bullets ---
    for (let i = bullets.length - 1; i >= 0; i -= 1) {
      const b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      let dead = b.life <= 0 || b.x < 0 || b.y < 0 || b.x > WORLD.width || b.y > WORLD.height;
      if (!dead) {
        for (const cop of police) {
          if (Math.sqrt(dist2(b, cop)) < 34) {
            dead = true;
            spawnParticles(b.x, b.y, '#ff5a4e', 8, 200);
            cop.speed *= 0.4;
            addWanted(1);
            break;
          }
        }
      }
      if (!dead) {
        for (const ped of peds) {
          if (Math.sqrt(dist2(b, ped)) < 18) {
            dead = true;
            spawnParticles(b.x, b.y, '#ff5a4e', 8, 200);
            ped.flee = 2;
            addWanted(1);
            break;
          }
        }
      }
      if (dead) bullets.splice(i, 1);
    }
    // --- particles ---
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    // --- crates (mission 2) ---
    if (currentMission() && currentMission().id === 'harbour-run' && state.stepIndex === 0) {
      for (const crate of crates) {
        if (!crate.taken && Math.sqrt(dist2(player, crate)) < 60 && ctrl.enter) {
          crate.taken = true;
          state.collected += 1;
          spawnParticles(crate.x, crate.y, '#f2c94c', 10, 180);
          say(`Crate ${state.collected}/3 collected.`, 2);
          events |= EVENT_PICKUP;
          if (state.collected >= 3) events |= advanceStep();
        }
      }
    }
    events |= checkMission();
    return events;
  }

  function objective() {
    const m = currentMission();
    if (!m) return 'All jobs done — Nusa Bay is yours, Raka.';
    return missionObjective(m, state.stepIndex, state.collected);
  }
  function snapshot() {
    return {
      x: player.x, y: player.y, money: state.money,
      missionIndex: state.missionIndex, stepIndex: state.stepIndex, collected: state.collected,
    };
  }
  function restore(s) {
    if (!s) return false;
    player.x = s.x; player.y = s.y;
    state.money = s.money || 0;
    state.missionIndex = s.missionIndex || 0;
    state.stepIndex = s.stepIndex || 0;
    state.collected = s.collected || 0;
    state.wanted = 0;
    say('Save loaded — welcome back to Nusa Bay.', 3);
    return true;
  }

  reset();
  return { state, reset, step, objective, currentMission, currentStep, snapshot, restore, say };
}
