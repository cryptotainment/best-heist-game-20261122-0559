// The game's rules and state, with no drawing and no browser in it: the three levels of the
// Meridian Mint, the thief, the guards, the cameras, the loot and the getaway. step() advances
// one fixed step and returns what happened as bit flags, so the caller can react (sound,
// announcements) without the world knowing about screens. Walls, crates and shelves are plain
// rectangles; a rectangle blocks both movement and line of sight.
import { CAMERA_DISABLE_SECONDS, FIELD, GUARD, LIVES, PLAYER } from './config.js';
import { createCamera, updateCamera } from './camera.js';
import { createGuard, updateGuard } from './guard.js';
import { movePlayer, tryInteract } from './player.js';

export const EVENT_PICKUP = 1;
export const EVENT_SPOTTED = 2; // a guard's meter hit full: the chase is on
export const EVENT_CAUGHT = 4;
export const EVENT_LEVEL = 8; // escaped with all the loot: level complete
export const EVENT_ALARM = 16; // the camera alarm meter hit full
export const EVENT_BOX = 32; // a junction box was cut: a camera goes dark

const BORDER = 18; // outer wall thickness

function rect(x, y, w, h) {
  return { x, y, width: w, height: h };
}

/**
 * One level: walls and cover (all block sight and movement), dark shadow zones (slow
 * detection), guards with patrol waypoints, cameras with sweep, junction boxes that cut
 * them, the three loot pieces, the thief's start and the glowing escape.
 */
export const LEVELS = [
  {
    name: '1 · Mint Lobby',
    hint: 'Grab 3 loot, then reach the green van. Shift = sneak. E cuts a junction box.',
    playerStart: { x: 70, y: 570 },
    escape: rect(28, 28, 110, 74),
    walls: [
      rect(300, 0, 24, 210), rect(300, 420, 24, 80),
      rect(620, 150, 24, 250),
      rect(430, 340, 60, 24),
    ],
    crates: [rect(150, 130, 52, 52), rect(430, 120, 52, 52), rect(700, 470, 52, 52), rect(830, 300, 52, 52)],
    shelves: [rect(480, 560, 130, 30), rect(820, 90, 30, 130)],
    shadows: [rect(60, 300, 170, 120), rect(660, 250, 160, 110)],
    guards: [
      { waypoints: [[200, 300], [520, 300], [520, 520], [200, 520]], speed: 1.0 },
      { waypoints: [[770, 150], [770, 470]], speed: 1.05 },
    ],
    cameras: [{ x: 480, y: 26, baseAngle: Math.PI / 2, sweep: 0.85, speed: 0.55 }],
    boxes: [{ x: 452, y: 44 }],
    loot: [
      { kind: 'gold', x: 880, y: 110, label: 'Gold bars' },
      { kind: 'jewels', x: 700, y: 555, label: 'Jewel case' },
      { kind: 'ledger', x: 430, y: 250, label: 'Mint ledger' },
    ],
  },
  {
    name: '2 · Vault Floor',
    hint: 'Two cameras now. Cut a box (E) to kill a camera for 10 s.',
    playerStart: { x: 70, y: 570 },
    escape: rect(28, 28, 110, 74),
    walls: [
      rect(220, 0, 24, 110), rect(220, 500, 24, 140),
      rect(500, 120, 24, 300), rect(500, 520, 24, 120),
      rect(700, 0, 24, 60), rect(700, 420, 24, 60),
    ],
    crates: [rect(90, 420, 52, 52), rect(330, 250, 52, 52), rect(660, 330, 52, 52), rect(740, 470, 52, 52), rect(850, 180, 52, 52)],
    shelves: [rect(300, 560, 130, 30), rect(660, 60, 130, 30)],
    shadows: [rect(60, 200, 130, 110), rect(560, 430, 150, 110), rect(760, 300, 130, 100)],
    guards: [
      { waypoints: [[160, 150], [440, 150], [440, 470], [160, 470]], speed: 1.1 },
      { waypoints: [[600, 130], [600, 470]], speed: 1.15 },
      { waypoints: [[820, 120], [820, 560], [640, 560], [640, 120]], speed: 1.1 },
    ],
    cameras: [
      { x: 360, y: 26, baseAngle: Math.PI / 2, sweep: 0.8, speed: 0.65 },
      { x: 820, y: 614, baseAngle: -Math.PI / 2, sweep: 0.8, speed: 0.6 },
    ],
    boxes: [{ x: 332, y: 44 }, { x: 848, y: 596 }],
    loot: [
      { kind: 'gold', x: 880, y: 90, label: 'Gold bars' },
      { kind: 'jewels', x: 380, y: 480, label: 'Jewel case' },
      { kind: 'ledger', x: 580, y: 200, label: 'Mint ledger' },
    ],
  },
  {
    name: '3 · The Crown Vault',
    hint: 'Four guards, three cameras, fast patrols. Patience wins the crown.',
    playerStart: { x: 70, y: 570 },
    escape: rect(28, 28, 110, 74),
    walls: [
      rect(200, 0, 24, 110), rect(200, 330, 24, 140),
      rect(420, 140, 24, 110), rect(420, 500, 24, 140),
      rect(640, 0, 24, 220), rect(640, 500, 24, 140),
      rect(800, 140, 24, 260),
    ],
    crates: [rect(60, 300, 52, 52), rect(300, 470, 52, 52), rect(470, 210, 52, 52), rect(720, 520, 52, 52), rect(760, 330, 52, 52), rect(330, 60, 52, 52)],
    shelves: [rect(260, 180, 30, 90), rect(700, 90, 130, 30), rect(560, 560, 130, 30)],
    shadows: [rect(60, 180, 120, 100), rect(470, 330, 140, 100), rect(740, 250, 120, 100)],
    guards: [
      { waypoints: [[150, 140], [380, 140], [380, 560], [150, 560]], speed: 1.25 },
      { waypoints: [[540, 130], [540, 470], [760, 470]], speed: 1.3 },
      { waypoints: [[880, 110], [880, 560]], speed: 1.25 },
      { waypoints: [[300, 300], [600, 300]], speed: 1.35 },
    ],
    cameras: [
      { x: 320, y: 26, baseAngle: Math.PI / 2, sweep: 0.75, speed: 0.8 },
      { x: 740, y: 26, baseAngle: Math.PI / 2, sweep: 0.75, speed: 0.7 },
      { x: 480, y: 614, baseAngle: -Math.PI / 2, sweep: 0.7, speed: 0.75 },
    ],
    boxes: [{ x: 292, y: 44 }, { x: 712, y: 44 }, { x: 508, y: 596 }],
    loot: [
      { kind: 'crown', x: 880, y: 90, label: 'Crown jewels' },
      { kind: 'gold', x: 480, y: 430, label: 'Gold bars' },
      { kind: 'ledger', x: 130, y: 480, label: 'Mint ledger' },
    ],
  },
];

/**
 * Entry points picked on the briefing screen. Each moves the thief's start and nudges one
 * guard's patrol, so the plan changes the job slightly.
 */
export const ENTRIES = [
  { name: 'Roof', blurb: 'Drop in top-right. Guard 1 patrols faster.', start: { x: 880, y: 70 }, guardBoost: 1.12 },
  { name: 'Service Tunnel', blurb: 'Crawl in bottom-left. The quiet way.', start: { x: 70, y: 570 }, guardBoost: 1.0 },
  { name: 'Front Lobby', blurb: 'Walk in the front door, bottom-centre.', start: { x: 480, y: 580 }, guardBoost: 1.06 },
];

export function borderWalls() {
  return [
    rect(0, 0, FIELD.width, BORDER),
    rect(0, FIELD.height - BORDER, FIELD.width, BORDER),
    rect(0, 0, BORDER, FIELD.height),
    rect(FIELD.width - BORDER, 0, BORDER, FIELD.height),
  ];
}

/** Every rectangle that blocks movement and sight in a level. */
export function solidRects(level) {
  return [...borderWalls(), ...level.walls, ...level.crates, ...level.shelves];
}

export function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height;
}

export function inShadow(level, x, y) {
  return level.shadows.some((s) => pointInRect(x, y, s));
}

/** True when the segment from (x1,y1) to (x2,y2) is not cut by any solid rectangle. */
export function lineOfSight(x1, y1, x2, y2, solids) {
  for (const r of solids) {
    if (segmentHitsRect(x1, y1, x2, y2, r)) return false;
  }
  return true;
}

function segmentHitsRect(x1, y1, x2, y2, r) {
  // Quick reject: segment entirely on one side of the rectangle.
  if (Math.max(x1, x2) < r.x || Math.min(x1, x2) > r.x + r.width) return false;
  if (Math.max(y1, y2) < r.y || Math.min(y1, y2) > r.y + r.height) return false;
  if (pointInRect(x1, y1, r) || pointInRect(x2, y2, r)) return true;
  const dx = x2 - x1;
  const dy = y2 - y1;
  // Check each edge of the rectangle for a crossing.
  const edges = [
    [r.x, r.y, r.x + r.width, r.y],
    [r.x + r.width, r.y, r.x + r.width, r.y + r.height],
    [r.x + r.width, r.y + r.height, r.x, r.y + r.height],
    [r.x, r.y + r.height, r.x, r.y],
  ];
  for (const [ex1, ey1, ex2, ey2] of edges) {
    if (segmentsCross(x1, y1, x2, y2, ex1, ey1, ex2, ey2)) return true;
  }
  return dx === 0 && dy === 0;
}

function segmentsCross(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
  if (d === 0) return false;
  const t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / d;
  const u = ((x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

export function createWorld() {
  const state = {
    levelIndex: 0,
    level: null,
    solids: [],
    player: { x: 0, y: 0, angle: -Math.PI / 2, moving: false, sneaking: false, stepPhase: 0 },
    guards: [],
    cameras: [],
    loot: [],
    boxes: [],
    alarm: 0, // camera alarm meter, 0..100; full = lockdown, every guard hunts
    alarmActive: false,
    lootGot: 0,
    lives: LIVES,
    elapsed: 0,
    entryIndex: 1,
    caughtFlash: 0,
  };

  function loadLevel(index, entryIndex) {
    const level = LEVELS[index];
    state.levelIndex = index;
    state.level = level;
    state.solids = solidRects(level);
    state.entryIndex = entryIndex;
    const entry = ENTRIES[entryIndex];
    state.player.x = entry.start.x;
    state.player.y = entry.start.y;
    state.player.angle = -Math.PI / 2;
    state.player.moving = false;
    state.guards = level.guards.map((g) => createGuard(g, entry.guardBoost));
    state.cameras = level.cameras.map((c) => createCamera(c));
    state.boxes = level.boxes.map((b) => ({ ...b, cut: 0 }));
    state.loot = level.loot.map((l) => ({ ...l, taken: false }));
    state.alarm = 0;
    state.alarmActive = false;
    state.lootGot = 0;
    state.elapsed = 0;
  }

  function reset(entryIndex = 1) {
    state.lives = LIVES;
    loadLevel(0, entryIndex);
  }

  function restartLevel() {
    loadLevel(state.levelIndex, state.entryIndex);
  }

  function step(dt, input, sound) {
    let events = 0;
    state.elapsed += dt;
    if (state.caughtFlash > 0) state.caughtFlash -= dt;
    const level = state.level;
    const player = state.player;

    movePlayer(state, input, dt);

    // Junction boxes: E next to one cuts its camera for CAMERA_DISABLE_SECONDS.
    const box = tryInteract(state, input);
    if (box) {
      events |= EVENT_BOX;
      const cam = state.cameras[state.boxes.indexOf(box)];
      if (cam) cam.disabled = CAMERA_DISABLE_SECONDS;
      if (sound) sound.box();
    }

    // Loot pickup.
    for (const item of state.loot) {
      if (item.taken) continue;
      const dx = item.x - player.x;
      const dy = item.y - player.y;
      if (dx * dx + dy * dy < PLAYER.reach * PLAYER.reach) {
        item.taken = true;
        state.lootGot += 1;
        events |= EVENT_PICKUP;
        if (sound) sound.pickup();
      }
    }

    // Cameras fill the shared alarm meter; a full meter is a lockdown.
    for (const cam of state.cameras) {
      const seen = updateCamera(cam, dt, player, state.solids, state.level);
      if (seen) {
        state.alarm = Math.min(100, state.alarm + 44 * dt);
        if (sound) sound.buzz();
      } else {
        state.alarm = Math.max(0, state.alarm - 16 * dt);
      }
    }
    if (state.alarm >= 100 && !state.alarmActive) {
      state.alarmActive = true;
      events |= EVENT_ALARM;
      if (sound) sound.sting();
      for (const g of state.guards) g.state = 'chase';
    }
    if (state.alarmActive && state.alarm <= 25) state.alarmActive = false;

    // Guards patrol, spot, chase and catch.
    for (const g of state.guards) {
      const result = updateGuard(g, dt, player, state.solids, state.level, state.alarmActive, sound);
      if (result === 'spotted') {
        events |= EVENT_SPOTTED;
        if (sound) sound.sting();
      } else if (result === 'caught') {
        state.lives -= 1;
        state.caughtFlash = 1.4;
        events |= EVENT_CAUGHT;
        if (sound) sound.caught();
        return events;
      }
    }

    // Escape: only open once every loot piece is taken.
    if (state.lootGot >= state.loot.length && pointInRect(player.x, player.y, level.escape)) {
      events |= EVENT_LEVEL;
      if (sound) sound.win();
    }
    return events;
  }

  return { state, reset, loadLevel, restartLevel, step };
}
