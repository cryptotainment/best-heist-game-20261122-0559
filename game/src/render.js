// Everything the player sees: the mint floor, walls, crates, shelves, shadow zones, loot,
// the glowing escape van, the guards with their vision cones, the sweeping cameras, the
// thief — and the HUD (alarm meter, loot, lives, timer, level name, hints) plus every
// screen overlay. All art is drawn here in canvas 2D; there are no images.
import { FIELD, PALETTE } from './config.js';
import { ENTRIES } from './world.js';
import { cameraConePoints } from './camera.js';
import { conePoints } from './guard.js';

export const SCREEN_BRIEFING = 'briefing';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_LEVEL = 'level';
export const SCREEN_WIN = 'win';
export const SCREEN_OVER = 'over';

const TILE = 40;

function fmtTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function bar(ctx, x, y, w, h, frac, fill, label) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = '#2a3040';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + 6, y + h / 2 + 0.5);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth || FIELD.width;
    const h = canvas.clientHeight || FIELD.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(canvas.width / FIELD.width, 0, 0, canvas.height / FIELD.height, 0, 0);
  }

  function drawFloor(level) {
    for (let y = 0; y < FIELD.height; y += TILE) {
      for (let x = 0; x < FIELD.width; x += TILE) {
        ctx.fillStyle = ((x + y) / TILE) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
        ctx.fillRect(x, y, TILE, TILE);
      }
    }
    ctx.strokeStyle = PALETTE.floorLine;
    ctx.lineWidth = 1;
    for (let x = 0; x <= FIELD.width; x += TILE) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, FIELD.height); ctx.stroke();
    }
    for (let y = 0; y <= FIELD.height; y += TILE) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(FIELD.width, y); ctx.stroke();
    }
    // Dark shadow zones where detection is slow.
    for (const s of level.shadows) {
      ctx.fillStyle = PALETTE.shadow;
      ctx.fillRect(s.x, s.y, s.width, s.height);
      ctx.fillStyle = 'rgba(150,170,200,0.5)';
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SHADOW', s.x + s.width / 2, s.y + 14);
    }
  }

  function drawWalls(level) {
    const all = [...level.walls,
      { x: 0, y: 0, width: FIELD.width, height: 18 },
      { x: 0, y: FIELD.height - 18, width: FIELD.width, height: 18 },
      { x: 0, y: 0, width: 18, height: FIELD.height },
      { x: FIELD.width - 18, y: 0, width: 18, height: FIELD.height }];
    for (const w of all) {
      ctx.fillStyle = PALETTE.wall;
      ctx.fillRect(w.x, w.y, w.width, w.height);
      ctx.fillStyle = PALETTE.wallTop;
      ctx.fillRect(w.x, w.y, w.width, Math.min(5, w.height));
    }
    for (const c of level.crates) {
      ctx.fillStyle = PALETTE.crate;
      ctx.fillRect(c.x, c.y, c.width, c.height);
      ctx.fillStyle = PALETTE.crateTop;
      ctx.fillRect(c.x, c.y, c.width, 6);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.strokeRect(c.x + 0.5, c.y + 0.5, c.width - 1, c.height - 1);
      ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x + c.width, c.y + c.height); ctx.stroke();
    }
    for (const s of level.shelves) {
      ctx.fillStyle = PALETTE.shelf;
      ctx.fillRect(s.x, s.y, s.width, s.height);
      ctx.fillStyle = PALETTE.shelfTop;
      ctx.fillRect(s.x, s.y, s.width, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      for (let i = 0; i < 3; i += 1) ctx.fillRect(s.x + 6 + i * 14, s.y + 10, 8, 12);
    }
  }

  function drawLoot(state) {
    for (const item of state.loot) {
      if (item.taken) continue;
      const pulse = 1 + Math.sin(performance.now() / 300) * 0.12;
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = PALETTE.lootGlow;
      ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = PALETTE.loot;
      if (item.kind === 'gold') {
        ctx.fillRect(-11, -6, 22, 12);
        ctx.fillStyle = '#c9a227';
        ctx.fillRect(-11, -6, 22, 4);
      } else if (item.kind === 'jewels' || item.kind === 'crown') {
        ctx.beginPath();
        ctx.moveTo(0, -12); ctx.lineTo(11, 0); ctx.lineTo(0, 12); ctx.lineTo(-11, 0);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-3, -3, 2.5, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillRect(-10, -13, 20, 26);
        ctx.fillStyle = '#7a1f2b';
        ctx.fillRect(-10, -13, 20, 6);
        ctx.fillStyle = '#f2e6c9';
        ctx.fillRect(-6, -3, 12, 2);
        ctx.fillRect(-6, 2, 12, 2);
      }
      ctx.restore();
      ctx.fillStyle = PALETTE.text;
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.label, item.x, item.y + 36);
    }
  }

  function drawEscape(state) {
    const e = state.level.escape;
    const open = state.lootGot >= state.loot.length;
    const pulse = open ? 0.22 + Math.sin(performance.now() / 250) * 0.1 : 0.08;
    ctx.fillStyle = open ? `rgba(63,206,110,${pulse + 0.15})` : 'rgba(63,206,110,0.08)';
    ctx.fillRect(e.x, e.y, e.width, e.height);
    ctx.strokeStyle = open ? PALETTE.escape : 'rgba(63,206,110,0.4)';
    ctx.lineWidth = 3;
    ctx.strokeRect(e.x + 1, e.y + 1, e.width - 2, e.height - 2);
    // The getaway van: a simple green van drawn in canvas.
    ctx.fillStyle = open ? '#2fae5f' : '#3a4a3f';
    ctx.fillRect(e.x + 14, e.y + 22, 82, 30);
    ctx.fillRect(e.x + 60, e.y + 12, 30, 20);
    ctx.fillStyle = '#bfe3ff';
    ctx.fillRect(e.x + 66, e.y + 15, 18, 13);
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(e.x + 30, e.y + 54, 8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(e.x + 76, e.y + 54, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(open ? 'ESCAPE — GO!' : 'ESCAPE (locked)', e.x + e.width / 2, e.y + e.height - 8);
  }

  function drawBoxes(state) {
    for (const box of state.boxes) {
      ctx.fillStyle = '#8a6d3b';
      ctx.fillRect(box.x - 9, box.y - 9, 18, 18);
      ctx.fillStyle = '#f2c94c';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡', box.x, box.y + 4);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('E: cut box', box.x + 14, box.y + 4);
    }
  }

  function drawGuard(g) {
    const hot = g.state === 'chase' || g.detect > 55;
    const pts = conePoints(g);
    ctx.fillStyle = hot ? PALETTE.coneHot : PALETTE.cone;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath(); ctx.fill();
    // Guard: navy body, cap, facing tick.
    ctx.fillStyle = PALETTE.guard;
    ctx.beginPath(); ctx.arc(g.x, g.y, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.guardDark;
    ctx.beginPath(); ctx.arc(g.x, g.y, 13, Math.PI * 0.6, Math.PI * 1.4); ctx.fill();
    ctx.fillStyle = '#f2c94c';
    ctx.fillRect(g.x - 9, g.y - 15, 18, 4);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + Math.cos(g.angle) * 17, g.y + Math.sin(g.angle) * 17);
    ctx.stroke();
    // Detection meter ring above the guard.
    if (g.detect > 2) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(g.x - 15, g.y - 30, 30, 5);
      ctx.fillStyle = g.detect > 70 ? '#e5534b' : '#f2c94c';
      ctx.fillRect(g.x - 15, g.y - 30, 30 * (g.detect / 100), 5);
    }
    if (g.state === 'chase') {
      ctx.fillStyle = '#ff5a4e';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', g.x, g.y - 34);
    }
  }

  function drawCamera(cam) {
    const pts = cameraConePoints(cam);
    ctx.fillStyle = cam.disabled > 0 ? 'rgba(120,120,120,0.10)' : PALETTE.cameraCone;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = cam.disabled > 0 ? '#777' : PALETTE.camera;
    ctx.beginPath(); ctx.arc(cam.x, cam.y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cam.x + Math.cos(cam.angle) * 4, cam.y + Math.sin(cam.angle) * 4, 3, 0, Math.PI * 2); ctx.fill();
    if (cam.disabled > 0) {
      ctx.fillStyle = PALETTE.text;
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`OFF ${Math.ceil(cam.disabled)}s`, cam.x, cam.y - 16);
    }
  }

  function drawPlayer(player) {
    // Hooded thief: pale face, dark hood, direction tick, soft shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(player.x, player.y + 10, 13, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.playerHood;
    ctx.beginPath(); ctx.arc(player.x, player.y, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath(); ctx.arc(player.x + Math.cos(player.angle) * 4, player.y + Math.sin(player.angle) * 4, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.x + Math.cos(player.angle) * 18, player.y + Math.sin(player.angle) * 18);
    ctx.stroke();
    if (player.sneaking) {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('sneaking', player.x, player.y - 20);
    }
  }

  function drawHud(state, screen) {
    // Top bar.
    ctx.fillStyle = 'rgba(10,12,18,0.88)';
    ctx.fillRect(0, 0, FIELD.width, 44);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('THE MERIDIAN MINT JOB', 14, 22);
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(state.level ? state.level.name : '', 250, 22);
    // Alarm meter.
    const alarmColor = state.alarm > 70 ? '#e5534b' : state.alarm > 35 ? '#f2a54c' : '#f2c94c';
    bar(ctx, 470, 14, 150, 16, state.alarm / 100, alarmColor, state.alarmActive ? 'ALARM!' : 'ALARM');
    // Loot, lives, timer.
    ctx.fillStyle = PALETTE.loot;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(`◆ ${state.lootGot}/${state.loot.length}`, 640, 22);
    ctx.fillStyle = '#ff7a6e';
    ctx.fillText('♥'.repeat(Math.max(0, state.lives)), 720, 22);
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(fmtTime(state.elapsed), 830, 22);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('WASD move · Shift sneak · E cut box · P pause', FIELD.width - 14, 60);
    if (screen === SCREEN_PLAY && state.level) {
      // Level hint along the bottom, clear of the HUD and the loot labels.
      ctx.fillStyle = 'rgba(238,241,245,0.75)';
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(state.level.hint, FIELD.width / 2, FIELD.height - 28);
    }
  }

  function overlay(title, lines, accent) {
    ctx.fillStyle = 'rgba(8,10,16,0.78)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = accent || PALETTE.text;
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, FIELD.width / 2, FIELD.height / 2 - 60);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '16px system-ui, sans-serif';
    lines.forEach((line, i) => {
      ctx.fillText(line, FIELD.width / 2, FIELD.height / 2 - 10 + i * 28);
    });
  }

  function drawBriefing(state) {
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 40px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('THE MERIDIAN MINT JOB', FIELD.width / 2, 110);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillText('One thief. One mint. Three vaults of loot — and a getaway van waiting outside.', FIELD.width / 2, 155);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText('Dodge the guards’ vision cones. Cameras fill the ALARM meter — cut a junction box (E) to kill one for 10 s.', FIELD.width / 2, 185);
    ctx.fillText('Shadows slow detection. Sneak (Shift) to stay quiet. Grab all 3 loot, then reach the green van.', FIELD.width / 2, 208);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText('Pick your entry point:', FIELD.width / 2, 268);
    ENTRIES.forEach((entry, i) => {
      const y = 300 + i * 62;
      const selected = state.entryIndex === i;
      ctx.fillStyle = selected ? 'rgba(242,201,76,0.16)' : 'rgba(255,255,255,0.05)';
      ctx.fillRect(FIELD.width / 2 - 260, y, 520, 50);
      ctx.strokeStyle = selected ? PALETTE.gold : '#3a4356';
      ctx.lineWidth = selected ? 2 : 1;
      ctx.strokeRect(FIELD.width / 2 - 260, y, 520, 50);
      ctx.fillStyle = PALETTE.text;
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${i + 1}. ${entry.name}`, FIELD.width / 2 - 244, y + 25);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillText(entry.blurb, FIELD.width / 2 - 40, y + 25);
    });
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Press 1 / 2 / 3, or click an entry, then Space to start the job', FIELD.width / 2, 520);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('WASD / arrows move · Shift sneak · mouse click-to-move · E cut a junction box · P pause', FIELD.width / 2, 552);
  }

  function draw(state, screen, best) {
    fit();
    ctx.clearRect(0, 0, FIELD.width, FIELD.height);
    if (screen === SCREEN_BRIEFING) {
      drawBriefing(state);
      return;
    }
    const level = state.level;
    if (!level) return;
    drawFloor(level);
    drawEscape(state);
    drawBoxes(state);
    drawLoot(state);
    drawWalls(level);
    for (const cam of state.cameras) drawCamera(cam);
    for (const g of state.guards) drawGuard(g);
    drawPlayer(state.player);
    drawHud(state, screen);
    if (screen === SCREEN_PAUSED) {
      overlay('Paused', ['Press P or Space to keep the job going.']);
    } else if (screen === SCREEN_CAUGHT) {
      overlay('CAUGHT!', [
        state.lives > 0 ? `${state.lives} ${state.lives === 1 ? 'life' : 'lives'} left — the level restarts.` : 'That was your last life.',
        'Press Space to try again.',
      ], '#ff5a4e');
    } else if (screen === SCREEN_LEVEL) {
      overlay('Vault cleared!', [
        `${level.name} — loot secured.`,
        'Press Space for the next floor.',
      ], PALETTE.escape);
    } else if (screen === SCREEN_WIN) {
      overlay('Clean getaway!', [
        `All three floors of the Meridian Mint, emptied in ${fmtTime(state.elapsed)}.`,
        best ? `Best clear: ${fmtTime(best)}.` : '',
        'Press Space to run it again.',
      ], PALETTE.escape);
    } else if (screen === SCREEN_OVER) {
      overlay('The job failed', [
        'The mint keeps its gold — this time.',
        'Press Space to plan a new job.',
      ], '#ff5a4e');
    }
  }

  return { draw };
}
