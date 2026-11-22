// Tiny synthesised sound: no audio files, everything is an oscillator through
// WebAudio, started only after the player's first gesture. Mute with M.
export function createAudio() {
  let ctx = null;
  let muted = false;
  let sirenTimer = 0;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    } catch {
      ctx = null;
    }
    return ctx;
  }
  function beep(freq, dur, type, vol, slideTo) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    try {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, c.currentTime);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
      g.gain.setValueAtTime(vol || 0.08, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      o.connect(g).connect(c.destination);
      o.start();
      o.stop(c.currentTime + dur);
    } catch {
      // Sound is garnish: a failure here never stops the game.
    }
  }
  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; return muted; },
    get muted() { return muted; },
    shoot() { beep(900, 0.09, 'square', 0.12, 180); },
    hit() { beep(160, 0.12, 'sawtooth', 0.1, 70); },
    pickup() { beep(660, 0.12, 'sine', 0.1, 990); },
    crash() { beep(90, 0.25, 'sawtooth', 0.14, 45); },
    steal() { beep(440, 0.1, 'square', 0.09, 660); },
    mission() { beep(523, 0.14, 'sine', 0.1); setTimeout(() => beep(784, 0.2, 'sine', 0.1), 140); },
    busted() { beep(220, 0.4, 'sawtooth', 0.12, 110); },
    siren(dt, wanted) {
      if (wanted === 0 || muted) return;
      sirenTimer -= dt;
      if (sirenTimer <= 0) {
        sirenTimer = 0.55;
        beep(720, 0.22, 'sine', 0.035, 980);
      }
    },
  };
}
