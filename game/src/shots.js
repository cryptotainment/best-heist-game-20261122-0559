// The screenshot scenes behind ?shot=cover|play|win. Each one stages a deterministic state
// of the real game — the same world, guards, cameras and renderer the player gets — then
// paints it twice and sets window.__shotReady for a screenshot. Nothing here is a mock:
// the frame is what the game really looks like at that moment.
import { SCREEN_PLAY, SCREEN_WIN } from './render.js';

/** Point a guard at a spot and freeze its patrol there, so its cone reads in the frame. */
function poseGuard(world, index, x, y, angle, detect) {
  const g = world.state.guards[index];
  if (!g) return;
  g.x = x;
  g.y = y;
  g.angle = angle;
  g.detect = detect;
  g.state = 'patrol';
}

function poseCamera(world, index, angle) {
  const cam = world.state.cameras[index];
  if (!cam) return;
  cam.angle = angle;
  cam.time = 0;
  cam.disabled = 0;
}

export function stageShot(name, world) {
  if (name === 'play') {
    // Level 2, mid-job: the thief is close to a guard, the alarm is half full.
    world.loadLevel(1, 1);
    const s = world.state;
    s.player.x = 560;
    s.player.y = 300;
    s.player.angle = Math.PI;
    s.loot[0].taken = true;
    s.lootGot = 1;
    s.alarm = 50;
    s.elapsed = 74;
    poseGuard(world, 0, 640, 300, Math.PI, 72);
    poseGuard(world, 1, 600, 150, Math.PI / 2, 20);
    poseGuard(world, 2, 820, 420, -Math.PI / 2, 0);
    poseCamera(world, 0, Math.PI / 2);
    poseCamera(world, 1, -Math.PI / 2);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'win') {
    // Level 3, the getaway: all loot taken, the thief at the van, clean getaway overlay.
    world.loadLevel(2, 1);
    const s = world.state;
    s.player.x = 83;
    s.player.y = 65;
    s.player.angle = -Math.PI / 2;
    for (const item of s.loot) item.taken = true;
    s.lootGot = s.loot.length;
    s.alarm = 12;
    s.elapsed = 212;
    poseGuard(world, 0, 300, 200, 0, 30);
    poseGuard(world, 3, 420, 300, Math.PI, 0);
    poseCamera(world, 0, Math.PI / 2);
    return { screen: SCREEN_WIN, best: 198 };
  }
  // cover: level 1, mid-play — the thief crossing the lobby, a guard cone and a camera
  // cone in frame, one loot already taken, the alarm meter showing.
  world.loadLevel(0, 1);
  const s = world.state;
  s.player.x = 430;
  s.player.y = 380;
  s.player.angle = -Math.PI / 4;
  s.loot[2].taken = true;
  s.lootGot = 1;
  s.alarm = 25;
  s.elapsed = 41;
  poseGuard(world, 0, 520, 300, Math.PI, 40);
  poseGuard(world, 1, 770, 300, -Math.PI / 2, 10);
  poseCamera(world, 0, Math.PI / 2);
  return { screen: SCREEN_PLAY, best: 0 };
}
