// The thief: keyboard movement (WASD / arrows), Shift to sneak, mouse click-to-move, and
// collision against every solid rectangle. E next to a junction box cuts it.
import { FIELD, PLAYER } from './config.js';

function circleHitsSolid(x, y, r, solids) {
  if (x < r + 2 || x > FIELD.width - r - 2 || y < r + 2 || y > FIELD.height - r - 2) return true;
  for (const s of solids) {
    const cx = Math.max(s.x, Math.min(x, s.x + s.width));
    const cy = Math.max(s.y, Math.min(y, s.y + s.height));
    if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < r * r) return true;
  }
  return false;
}

export function movePlayer(state, input, dt) {
  const player = state.player;
  const solids = state.solids;
  let dx = 0;
  let dy = 0;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  // Click-to-move: steer toward the clicked point when no key is held.
  if (dx === 0 && dy === 0 && input.clickTarget) {
    const cx = input.clickTarget.x - player.x;
    const cy = input.clickTarget.y - player.y;
    const d = Math.hypot(cx, cy);
    if (d < 8) {
      input.clickTarget = null;
    } else {
      dx = cx / d;
      dy = cy / d;
    }
  }
  const len = Math.hypot(dx, dy);
  player.sneaking = !!input.sneak;
  player.moving = len > 0;
  if (len > 0) {
    const speed = player.sneaking ? PLAYER.sneak : PLAYER.walk;
    const vx = (dx / len) * speed * dt;
    const vy = (dy / len) * speed * dt;
    player.angle = Math.atan2(dy, dx);
    // Slide along walls: try each axis alone so corners do not stick.
    if (!circleHitsSolid(player.x + vx, player.y, PLAYER.radius, solids)) player.x += vx;
    if (!circleHitsSolid(player.x, player.y + vy, PLAYER.radius, solids)) player.y += vy;
    player.stepPhase += (Math.hypot(vx, vy) / 22) * Math.PI;
  }
}

/**
 * The E key next to a junction box: cut it. Returns the box that was cut, or null.
 * A box already cut stays cut (its timer is in the camera), so cutting again is free.
 */
export function tryInteract(state, input) {
  if (!input.interact) return null;
  input.interact = false; // consume the edge
  for (const box of state.boxes) {
    const d = Math.hypot(box.x - state.player.x, box.y - state.player.y);
    if (d < PLAYER.reach + 14) return box;
  }
  return null;
}
