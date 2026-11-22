// Keyboard and mouse input: WASD / arrows to move, Shift to sneak, E to cut a junction box,
// Space / Enter / click to confirm, P or Escape to pause. Click-to-move sets a target the
// thief walks toward. Actions are edges: takeActions() returns what was pressed since the
// last call and clears it.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_INTERACT = 4;

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'sneak', ShiftRight: 'sneak',
};

export function createInput(canvas) {
  const held = { up: false, down: false, left: false, right: false, sneak: false };
  const input = {
    ...held,
    clickTarget: null, // {x, y} in logical field coordinates, or null
    interact: false,
    actions: 0,
  };

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / 960, rect.height / 640);
    const ox = (rect.width - 960 * scale) / 2;
    const oy = (rect.height - 640 * scale) / 2;
    return {
      x: (event.clientX - rect.left - ox) / scale,
      y: (event.clientY - rect.top - oy) / scale,
    };
  }

  window.addEventListener('keydown', (event) => {
    const name = KEYMAP[event.code];
    if (name) {
      input[name] = true;
      event.preventDefault();
      return;
    }
    if (event.code === 'Space' || event.code === 'Enter') {
      input.actions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      input.actions |= ACTION_PAUSE;
    } else if (event.code === 'KeyE') {
      input.actions |= ACTION_INTERACT;
      input.interact = true;
    } else if (event.code === 'Digit1' || event.code === 'Digit2' || event.code === 'Digit3') {
      input.entryChoice = Number(event.code.slice(-1)) - 1;
    }
  });
  window.addEventListener('keyup', (event) => {
    const name = KEYMAP[event.code];
    if (name) input[name] = false;
  });
  canvas.addEventListener('pointerdown', (event) => {
    input.clickTarget = toLogical(event);
    input.actions |= ACTION_CONFIRM;
  });
  window.addEventListener('blur', () => {
    for (const key of Object.keys(held)) input[key] = false;
  });

  input.takeActions = () => {
    const actions = input.actions;
    input.actions = 0;
    return actions;
  };
  return input;
}
