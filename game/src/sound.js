// Synthesised sound only: every effect is built with WebAudio oscillators, no audio files.
// The context is created on the first user gesture, so browsers that block autoplay stay
// quiet until the player starts.
export function createSound() {
  let ctx = null;
  let lastBuzz = 0;
  let lastGuardStep = 0;

  function audio() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        return null;
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, gain, slideTo) {
    const ac = audio();
    if (!ac) return;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + dur);
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(g).connect(ac.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  return {
    /** Soft footstep tick, alternating pitch so walking reads as steps. */
    step(phase) {
      tone(phase % 2 < 1 ? 190 : 160, 0.05, 'sine', 0.05);
    },
    /** A guard's heavy step nearby: louder the closer he is (dist in pixels). */
    guardStep(dist) {
      const now = performance.now();
      if (now - lastGuardStep < 320) return;
      lastGuardStep = now;
      const gain = Math.max(0.02, 0.16 * (1 - dist / 420));
      tone(110, 0.09, 'triangle', gain);
    },
    /** Two-note pickup chime. */
    pickup() {
      tone(660, 0.12, 'sine', 0.12);
      setTimeout(() => tone(990, 0.18, 'sine', 0.12), 90);
    },
    /** Rising alert sting when a guard is sure or the alarm trips. */
    sting() {
      tone(220, 0.5, 'sawtooth', 0.1, 660);
    },
    /** Short camera buzz, throttled so a camera in view does not drone. */
    buzz() {
      const now = performance.now();
      if (now - lastBuzz < 700) return;
      lastBuzz = now;
      tone(140, 0.25, 'square', 0.035);
    },
    /** Junction box cut: a snip and a dying hum. */
    box() {
      tone(880, 0.08, 'square', 0.08);
      setTimeout(() => tone(440, 0.3, 'sawtooth', 0.05, 110), 80);
    },
    /** Caught: low thud. */
    caught() {
      tone(180, 0.4, 'sawtooth', 0.14, 60);
    },
    /** Clean getaway: a little major arpeggio. */
    win() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'sine', 0.1), i * 110));
    },
    click() {
      tone(520, 0.06, 'sine', 0.08);
    },
  };
}
