// Keyboard and mouse input. Held keys steer; one-shot presses (start, enter a
// car, shoot, pause, save, mute) are queued as flags and taken once by the loop,
// so a press between frames is never lost or counted twice.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_SHOOT = 8;
export const ACTION_SAVE = 16;
export const ACTION_MUTE = 32;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(canvas) {
  const keys = { up: false, down: false, left: false, right: false, run: false };
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;

  function codeOf(e) { return e.code; }
  window.addEventListener('keydown', (event) => {
    const c = codeOf(event);
    if (UP.has(c)) keys.up = true;
    else if (DOWN.has(c)) keys.down = true;
    else if (LEFT.has(c)) keys.left = true;
    else if (RIGHT.has(c)) keys.right = true;
    else if (c === 'ShiftLeft' || c === 'ShiftRight') keys.run = true;
    else if (c === 'KeyE') { if (!event.repeat) actions |= ACTION_ENTER; }
    else if (c === 'KeyF') { if (!event.repeat) actions |= ACTION_SHOOT; }
    else if (c === 'KeyM') { if (!event.repeat) actions |= ACTION_MUTE; }
    else if (c === 'KeyQ') { if (!event.repeat) actions |= ACTION_SAVE; }
    else if (CONFIRM.has(c)) { if (!event.repeat) actions |= ACTION_CONFIRM; }
    else if (PAUSE.has(c)) { if (!event.repeat) actions |= ACTION_PAUSE; }
    else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    const c = codeOf(event);
    if (UP.has(c)) keys.up = false;
    else if (DOWN.has(c)) keys.down = false;
    else if (LEFT.has(c)) keys.left = false;
    else if (RIGHT.has(c)) keys.right = false;
    else if (c === 'ShiftLeft' || c === 'ShiftRight') keys.run = false;
  });
  window.addEventListener('blur', () => {
    keys.up = keys.down = keys.left = keys.right = keys.run = false;
    mouseDown = false;
  });
  canvas.addEventListener('pointermove', (event) => {
    const r = canvas.getBoundingClientRect();
    mouseX = event.clientX - r.left;
    mouseY = event.clientY - r.top;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const r = canvas.getBoundingClientRect();
    mouseX = event.clientX - r.left;
    mouseY = event.clientY - r.top;
    mouseDown = true;
    actions |= ACTION_SHOOT;
  });
  canvas.addEventListener('pointerup', () => { mouseDown = false; });

  return {
    keys,
    mouse() { return { x: mouseX, y: mouseY, down: mouseDown }; },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
