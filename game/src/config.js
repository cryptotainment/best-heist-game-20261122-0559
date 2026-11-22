// Every tuning number and colour in one place. The playfield is a fixed 960x640 logical
// area; the renderer scales it to the window, so no rule below depends on screen size.
export const FIELD = { width: 960, height: 640 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const LIVES = 3;

/** Seconds a disabled camera stays dark after its junction box is cut. */
export const CAMERA_DISABLE_SECONDS = 10;

export const PLAYER = {
  radius: 12,
  walk: 178,
  sneak: 96,
  /** How close the thief must be to grab loot or cut a junction box. */
  reach: 30,
};

export const GUARD = {
  radius: 13,
  /** Patrol speed multiplier per level is applied in world.js. */
  patrol: 76,
  chase: 158,
  coneRange: 180,
  coneHalf: 0.62, // ~35 degrees each side of the facing direction
  /** Detection points per second at point-blank range, standing, in the light. */
  detectBase: 62,
  /** Detection points per second drained while unseen. */
  drain: 34,
  /** Seconds of lost sight before a chasing guard gives up and returns to patrol. */
  loseSight: 2.2,
};

export const CAMERA = {
  range: 205,
  half: 0.5, // ~29 degrees each side
  /** Alarm points per second while a camera sees the thief. */
  fill: 44,
  drain: 16,
};

export const PALETTE = {
  backdrop: '#0b0e14',
  floorA: '#232a33',
  floorB: '#1e242e',
  floorLine: '#2b333f',
  wall: '#4a5468',
  wallTop: '#5d6a82',
  crate: '#7a5a34',
  crateTop: '#96703f',
  shelf: '#5d4a6e',
  shelfTop: '#72608a',
  shadow: 'rgba(6, 8, 14, 0.55)',
  player: '#e8e4d8',
  playerHood: '#2e3440',
  guard: '#3b6ea5',
  guardDark: '#274a73',
  cone: 'rgba(242, 201, 76, 0.20)',
  coneHot: 'rgba(242, 120, 60, 0.30)',
  camera: '#c94f4f',
  cameraCone: 'rgba(220, 70, 70, 0.18)',
  loot: '#f2c94c',
  lootGlow: 'rgba(242, 201, 76, 0.35)',
  escape: '#3fce6e',
  escapeGlow: 'rgba(63, 206, 110, 0.30)',
  alarm: '#e5534b',
  text: '#eef1f5',
  muted: '#9aa3b2',
  panel: '#171c26',
  gold: '#f2c94c',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best clear time is kept between visits (this browser only). */
export const BEST_KEY = 'meridian-mint-job.best';
