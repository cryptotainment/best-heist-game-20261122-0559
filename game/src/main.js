// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between briefing, play, paused, caught, level-clear, win and game
// over. ?shot=cover|play|win stages a deterministic scene instead of running the loop,
// paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { FIELD } from './config.js';
import { createWorld, EVENT_ALARM, EVENT_BOX, EVENT_CAUGHT, EVENT_LEVEL, EVENT_PICKUP, EVENT_SPOTTED } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_BRIEFING, SCREEN_CAUGHT, SCREEN_LEVEL, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_WIN } from './render.js';
import { createSound } from './sound.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld();
const renderer = createRenderer(canvas);
const sound = createSound();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best time then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_BRIEFING;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let totalTime = 0; // across all three levels, for the win screen
  let lastStepPhase = 0;

  // Exposed for automated play-testing (headless Chromium driving real input).
  window.__game = { world, get screen() { return screen; }, input };

  function announce(message) {
    status.textContent = message;
  }

  function startJob() {
    world.reset(world.state.entryIndex);
    totalTime = 0;
    accumulator = 0;
    screen = SCREEN_PLAY;
    sound.click();
    announce(`Playing ${world.state.level.name}. Grab 3 loot, then reach the van.`);
  }

  function nextLevel() {
    if (world.state.levelIndex + 1 >= 3) {
      screen = SCREEN_WIN;
      if (best === 0 || totalTime < best) {
        best = Math.round(totalTime);
        saveBest(best);
      }
      announce(`Clean getaway in ${Math.round(totalTime)} seconds.`);
      return;
    }
    world.loadLevel(world.state.levelIndex + 1, world.state.entryIndex);
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Playing ${world.state.level.name}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (screen === SCREEN_BRIEFING) {
      if (typeof input.entryChoice === 'number') {
        world.state.entryIndex = input.entryChoice;
        input.entryChoice = undefined;
        sound.click();
      }
      // A click on an entry card selects it; a click anywhere else starts the job.
      if (input.clickTarget) {
        const t = input.clickTarget;
        let picked = -1;
        for (let i = 0; i < 3; i += 1) {
          const y = 300 + i * 62;
          if (t.x >= FIELD.width / 2 - 260 && t.x <= FIELD.width / 2 + 260 && t.y >= y && t.y <= y + 50) picked = i;
        }
        input.clickTarget = null;
        if (picked >= 0) {
          world.state.entryIndex = picked;
          sound.click();
          return;
        }
      }
      if (actions & ACTION_CONFIRM) startJob();
      return;
    }
    if (actions & ACTION_CONFIRM) {
      if (screen === SCREEN_CAUGHT) {
        if (world.state.lives <= 0) {
          screen = SCREEN_OVER;
        } else {
          world.restartLevel();
          screen = SCREEN_PLAY;
        }
        sound.click();
      } else if (screen === SCREEN_LEVEL) {
        nextLevel();
        sound.click();
      } else if (screen === SCREEN_WIN || screen === SCREEN_OVER) {
        screen = SCREEN_BRIEFING;
        sound.click();
      }
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step() {
    if (screen !== SCREEN_PLAY) return;
    totalTime += STEP;
    const events = world.step(STEP, input, sound);
    // Footsteps: a soft tick each half-step of the thief's stride.
    if (world.state.player.moving && Math.floor(world.state.player.stepPhase) !== Math.floor(lastStepPhase)) {
      sound.step(world.state.player.stepPhase);
    }
    lastStepPhase = world.state.player.stepPhase;
    if (events & EVENT_PICKUP) announce(`Loot ${world.state.lootGot} of 3.`);
    if (events & EVENT_BOX) announce('Junction box cut — a camera is dark for 10 seconds.');
    if (events & EVENT_SPOTTED) announce('Spotted! A guard is chasing you — break line of sight!');
    if (events & EVENT_ALARM) announce('ALARM! Lockdown — every guard is hunting you.');
    if (events & EVENT_CAUGHT) {
      if (world.state.lives <= 0) {
        screen = SCREEN_OVER;
        announce('Caught. The job failed.');
      } else {
        screen = SCREEN_CAUGHT;
        announce(`Caught! ${world.state.lives} ${world.state.lives === 1 ? 'life' : 'lives'} left.`);
      }
    } else if (events & EVENT_LEVEL) {
      screen = SCREEN_LEVEL;
      announce(`${world.state.level.name} cleared.`);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  world.reset(1);
  announce('The Meridian Mint Job. Pick an entry point, then press Space to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
