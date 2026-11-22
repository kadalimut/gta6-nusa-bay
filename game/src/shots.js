// The screenshot scenes behind ?shot=start|foot|chase|mission. Each one plays
// the real rules forward from a fresh world for a fixed number of steps, so the
// frame is what a short game really looks like and the same seed gives the same
// frame. The view object adds the mission fields the renderer reads.
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { LANDMARKS } from './city.js';

export function makeView(world) {
  return {
    ...world.state,
    mission: world.currentMission(),
    missionStep: world.currentStep(),
    objective: world.objective(),
  };
}

function idle(world, seconds) {
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i += 1) world.step(1 / 60, { moveX: 0, moveY: 0 });
}
function drive(world, seconds, steer) {
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i += 1) {
    world.step(1 / 60, { moveX: steer(i), moveY: -1 });
  }
}
function putPlayerInCar(world, x, y, angle) {
  const st = world.state;
  const car = st.cars.find((c) => c.parked) || st.cars[0];
  car.parked = false;
  car.x = x; car.y = y; car.angle = angle; car.speed = 0;
  st.player.inCar = true;
  st.player.car = car;
  st.player.x = x; st.player.y = y; st.player.angle = angle; st.player.speed = 0;
  car.stolen = true;
  return car;
}

export function stageShot(name, world) {
  world.reset();
  const st = world.state;
  if (name === 'foot') {
    // On foot in the market streets, first job on the HUD, traffic and peds around.
    st.player.x = 1480; st.player.y = 940;
    st.player.angle = -Math.PI / 2;
    idle(world, 6);
    st.player.x = 1480; st.player.y = 940;
    return { screen: SCREEN_PLAY, view: makeView(world) };
  }
  if (name === 'chase') {
    // Stolen car on the straight coast road, wanted 3, police cars closing in.
    putPlayerInCar(world, 1100, 1000, 0);
    st.wanted = 3;
    st.money = 640;
    st.player.health = 82;
    st.message = 'Wanted! Police chase — lose them!';
    st.messageTimer = 4;
    drive(world, 4, () => 0);
    return { screen: SCREEN_PLAY, view: makeView(world) };
  }
  if (name === 'mission') {
    // Job 2 at the docks: one crate in, police watching, gold marker on the HUD.
    st.missionIndex = 1; st.stepIndex = 0; st.collected = 1;
    st.crates.forEach((c, i) => { c.taken = i === 0; });
    st.wanted = 2;
    st.money = 920;
    st.message = 'Job 2 — Harbour Run: grab the crates at Dermaga Timur.';
    st.messageTimer = 4;
    putPlayerInCar(world, LANDMARKS.dock.x - 260, LANDMARKS.dock.y + 120, -Math.PI / 2);
    drive(world, 3, () => 0.1);
    return { screen: SCREEN_PLAY, view: makeView(world) };
  }
  // start (default): title screen over the living city at Cafe Dara.
  st.player.x = 880; st.player.y = 760;
  idle(world, 5);
  return { screen: SCREEN_TITLE, view: makeView(world) };
}
