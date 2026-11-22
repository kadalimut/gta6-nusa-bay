// Nusa Bay boot and the one loop: input is read every frame, the world advances
// in fixed 1/60 s steps, and the renderer paints what is there. Screens: title,
// play, paused, busted and won. Progress saves to localStorage with Q.
// ?shot=start|foot|chase|mission (with &seed=N) stages that scene instead of
// running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { STEP, SAVE_KEY, BEST_KEY } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_BUSTED, EVENT_WON, EVENT_MISSION } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_ENTER, ACTION_SHOOT, ACTION_SAVE, ACTION_MUTE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WON } from './render.js';
import { stageShot, makeView } from './shots.js';
import { createAudio } from './audio.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function writeSave() {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(world.snapshot()));
    world.say('Progress saved — press Q any time to save again.', 3);
  } catch { /* storage can be off; the game still plays */ }
}

function runShot(name) {
  const staged = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(staged.view, staged.screen, { hasSave: false });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();
  const save = readSave();
  let best = 0;
  try { best = Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0; } catch { best = 0; }

  function announce(message) { status.textContent = message; }
  function startGame(fresh) {
    world.reset();
    if (!fresh && save) world.restore(save);
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Playing Nusa Bay. Follow the gold marker.');
  }
  function endGame(won) {
    screen = won ? SCREEN_WON : SCREEN_OVER;
    if (world.state.money > best) {
      best = world.state.money;
      try { window.localStorage.setItem(BEST_KEY, String(best)); } catch { /* ignore */ }
    }
    announce(won ? 'Debt paid. Nusa Bay is yours.' : 'Busted. The police caught Raka.');
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    const mouse = input.mouse();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      world.say(muted ? 'Sound off.' : 'Sound on.', 2);
    }
    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM) startGame(false);
      else if (actions & ACTION_ENTER) startGame(true);
    } else if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) { screen = SCREEN_PAUSED; announce('Paused.'); }
      else if (actions & ACTION_SAVE) writeSave();
    } else if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) { screen = SCREEN_PLAY; announce('Playing.'); }
    } else if (screen === SCREEN_OVER || screen === SCREEN_WON) {
      if (actions & ACTION_CONFIRM) startGame(true);
    }
    if (screen === SCREEN_PLAY) {
      const view = renderer.camera(makeView(world));
      const aimWorld = {
        x: view.x + (mouse.x / window.innerWidth) * view.w,
        y: view.y + (mouse.y / window.innerHeight) * view.h,
      };
      const pl = world.state.player;
      const aim = Math.atan2(aimWorld.y - pl.y, aimWorld.x - pl.x);
      const ctrl = {
        moveX: (input.keys.right ? 1 : 0) - (input.keys.left ? 1 : 0),
        moveY: (input.keys.down ? 1 : 0) - (input.keys.up ? 1 : 0),
        run: input.keys.run,
        aim: pl.inCar ? undefined : aim,
        shoot: Boolean(actions & ACTION_SHOOT) || mouse.down,
        enter: Boolean(actions & ACTION_ENTER),
      };
      while (accumulator >= STEP) {
        const events = world.step(STEP, ctrl);
        accumulator -= STEP;
        audio.siren(STEP, world.state.wanted);
        if (events & EVENT_BUSTED) { endGame(false); break; }
        if (events & EVENT_WON) { endGame(true); break; }
        if (events & EVENT_MISSION) audio.mission();
      }
    } else {
      accumulator = 0;
      // The title screen still shows the living city behind its panel.
      while (accumulator < 0) { /* no-op */ }
    }
    renderer.draw(makeView(world), screen, { hasSave: Boolean(save) });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
  });
  announce('Nusa Bay. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
