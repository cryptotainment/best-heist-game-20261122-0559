// Guards: patrol fixed waypoints, watch a vision cone, and chase when they are sure.
// Detection fills only inside the cone with a clear line of sight, and drains the moment
// sight breaks — so a near miss can be recovered from. Sneaking and standing in a dark
// shadow zone both slow the fill.
import { FIELD, GUARD } from './config.js';
import { inShadow, lineOfSight } from './world.js';

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function createGuard(def, speedBoost = 1) {
  const [sx, sy] = def.waypoints[0];
  return {
    x: sx,
    y: sy,
    waypoints: def.waypoints,
    wpIndex: 1 % def.waypoints.length,
    speed: GUARD.patrol * def.speed * speedBoost,
    angle: 0,
    state: 'patrol', // patrol | chase | return
    detect: 0, // 0..100; full means the guard is sure and gives chase
    loseTimer: 0,
    stepPhase: 0,
    spotted: false,
  };
}

/** True when the guard can see the thief right now: in range, inside the cone, sight clear. */
export function guardSees(g, player, solids) {
  const d = dist(g.x, g.y, player.x, player.y);
  if (d > GUARD.coneRange) return false;
  const toPlayer = Math.atan2(player.y - g.y, player.x - g.x);
  if (Math.abs(angleDiff(toPlayer, g.angle)) > GUARD.coneHalf) return false;
  return lineOfSight(g.x, g.y, player.x, player.y, solids);
}

/** Detection points per second for this sighting: closer, standing and in the light is worse. */
export function detectionRate(g, player, level) {
  const d = dist(g.x, g.y, player.x, player.y);
  let rate = GUARD.detectBase * (1 - (d / GUARD.coneRange) * 0.55);
  if (player.sneaking) rate *= 0.45;
  if (inShadow(level, player.x, player.y)) rate *= 0.5;
  return rate;
}

function moveToward(g, tx, ty, speed, dt, solids) {
  const dx = tx - g.x;
  const dy = ty - g.y;
  const d = Math.hypot(dx, dy);
  if (d < 1) return true;
  const step = Math.min(d, speed * dt);
  const nx = g.x + (dx / d) * step;
  const ny = g.y + (dy / d) * step;
  // Guards slide along walls instead of sticking on corners: try each axis alone.
  if (!circleHitsSolid(nx, g.y, GUARD.radius, solids)) g.x = nx;
  if (!circleHitsSolid(g.x, ny, GUARD.radius, solids)) g.y = ny;
  g.angle = Math.atan2(dy, dx);
  g.stepPhase += (step / 26) * Math.PI;
  return d <= step + 0.5;
}

function circleHitsSolid(x, y, r, solids) {
  if (x < r + 2 || x > FIELD.width - r - 2 || y < r + 2 || y > FIELD.height - r - 2) return true;
  for (const s of solids) {
    const cx = Math.max(s.x, Math.min(x, s.x + s.width));
    const cy = Math.max(s.y, Math.min(y, s.y + s.height));
    if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < r * r) return true;
  }
  return false;
}

/**
 * Advance one guard one step. Returns 'spotted' the step its meter fills, 'caught' when it
 * touches the thief, otherwise null.
 */
export function updateGuard(g, dt, player, solids, level, alarmActive, sound) {
  const sees = guardSees(g, player, solids);

  if (g.state === 'patrol') {
    if (sees) {
      g.detect += detectionRate(g, player, level) * dt;
      if (g.detect >= 100) {
        g.detect = 100;
        g.state = 'chase';
        g.loseTimer = 0;
        return 'spotted';
      }
    } else {
      g.detect = Math.max(0, g.detect - GUARD.drain * dt);
    }
    const target = g.waypoints[g.wpIndex];
    if (moveToward(g, target[0], target[1], g.speed, dt, solids)) {
      g.wpIndex = (g.wpIndex + 1) % g.waypoints.length;
    }
  } else if (g.state === 'chase') {
    if (sees) {
      g.loseTimer = 0;
      g.detect = 100;
    } else {
      g.loseTimer += dt;
      g.detect = Math.max(0, g.detect - GUARD.drain * 0.5 * dt);
      if (g.loseTimer > GUARD.loseSight && !alarmActive) {
        g.state = 'return';
      }
    }
    moveToward(g, player.x, player.y, GUARD.chase, dt, solids);
    if (sound && g.stepPhase % (Math.PI * 2) < 0.2) sound.guardStep(dist(g.x, g.y, player.x, player.y));
    if (dist(g.x, g.y, player.x, player.y) < GUARD.radius + 12) return 'caught';
  } else {
    // return: walk back to the nearest waypoint, then resume the patrol.
    const target = g.waypoints[g.wpIndex];
    if (moveToward(g, target[0], target[1], g.speed, dt, solids)) {
      g.state = 'patrol';
      g.detect = 0;
    }
  }
  return null;
}

/** The vision cone as a fan of points, for the renderer. */
export function conePoints(g) {
  const points = [{ x: g.x, y: g.y }];
  const steps = 14;
  for (let i = 0; i <= steps; i += 1) {
    const a = g.angle - GUARD.coneHalf + (2 * GUARD.coneHalf * i) / steps;
    points.push({ x: g.x + Math.cos(a) * GUARD.coneRange, y: g.y + Math.sin(a) * GUARD.coneRange });
  }
  return points;
}
