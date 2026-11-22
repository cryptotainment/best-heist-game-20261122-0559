// Cameras: wall-mounted, sweeping back and forth with a red vision cone. Being seen by one
// fills the shared ALARM meter (the HUD bar); a full meter is a lockdown and every guard
// hunts. Cutting a camera's junction box (stand next to it, press E) kills that camera for
// 10 seconds.
import { CAMERA } from './config.js';
import { lineOfSight } from './world.js';

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function createCamera(def) {
  return {
    x: def.x,
    y: def.y,
    baseAngle: def.baseAngle,
    sweep: def.sweep,
    speed: def.speed,
    angle: def.baseAngle,
    time: 0,
    disabled: 0, // seconds left dark
  };
}

/** True when this camera sees the thief right now. */
export function cameraSees(cam, player, solids) {
  if (cam.disabled > 0) return false;
  const d = Math.hypot(player.x - cam.x, player.y - cam.y);
  if (d > CAMERA.range) return false;
  const toPlayer = Math.atan2(player.y - cam.y, player.x - cam.x);
  if (Math.abs(angleDiff(toPlayer, cam.angle)) > CAMERA.half) return false;
  return lineOfSight(cam.x, cam.y, player.x, player.y, solids);
}

/** Advance the sweep; returns whether the thief is seen this step. */
export function updateCamera(cam, dt, player, solids, _level) {
  cam.time += dt;
  cam.angle = cam.baseAngle + Math.sin(cam.time * cam.speed) * cam.sweep;
  if (cam.disabled > 0) cam.disabled = Math.max(0, cam.disabled - dt);
  return cameraSees(cam, player, solids);
}

/** The camera's red cone as a fan of points, for the renderer. */
export function cameraConePoints(cam) {
  const points = [{ x: cam.x, y: cam.y }];
  const steps = 12;
  for (let i = 0; i <= steps; i += 1) {
    const a = cam.angle - CAMERA.half + (2 * CAMERA.half * i) / steps;
    points.push({ x: cam.x + Math.cos(a) * CAMERA.range, y: cam.y + Math.sin(a) * CAMERA.range });
  }
  return points;
}
