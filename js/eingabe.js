// Eingabe: Tastatur, Maus und Touch-Steuerung.

const input = {
  keys: new Set(),
  attack: false,
  stick: { x: 0, y: 0 },
  touchUi: window.matchMedia('(pointer: coarse)').matches
};

const MOVE_KEYS = {
  KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0]
};

// Laufrichtung aus Tasten und Steuerknüppel, Länge höchstens 1
function moveVector() {
  let x = input.stick.x;
  let y = input.stick.y;
  for (const k of input.keys) {
    const v = MOVE_KEYS[k];
    if (v) { x += v[0]; y += v[1]; }
  }
  const len = Math.hypot(x, y);
  if (len < 0.15) return { x: 0, y: 0 };
  return len > 1 ? { x: x / len, y: y / len } : { x, y };
}

function setupInput() {
  window.addEventListener('keydown', (e) => {
    if (!game.running || e.target instanceof HTMLInputElement) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (MOVE_KEYS[e.code]) {
      input.keys.add(e.code);
      e.preventDefault();
      return;
    }
    switch (e.code) {
      case 'Space':
        input.attack = true;
        e.preventDefault();
        break;
      case 'Digit1': case 'Digit2': case 'Digit3': case 'Digit4': case 'Digit5':
        useSkill(Number(e.code.slice(5)) - 1);
        break;
      case 'KeyQ': usePotion('hp'); break;
      case 'KeyE': usePotion('mp'); break;
      case 'KeyF': interact(); break;
      case 'KeyC': if (!e.repeat) ui.toggle('panelChar'); break;
      case 'KeyH': if (!e.repeat) ui.toggle('panelHelp'); break;
      case 'Tab':
        e.preventDefault();
        cycleTarget();
        break;
      case 'Escape':
        if (ui.anyPanelOpen()) ui.closePanels();
        else game.target = null;
        break;
    }
  });

  window.addEventListener('keyup', (e) => {
    input.keys.delete(e.code);
    if (e.code === 'Space') input.attack = false;
  });

  // Beim Wechsel in einen anderen Tab keine Tasten "festhalten"
  window.addEventListener('blur', () => {
    input.keys.clear();
    input.attack = false;
  });

  // Mausklick oder Tippen auf ein Monster wählt es als Ziel
  renderer.canvas.addEventListener('pointerdown', (e) => {
    if (!game.running) return;
    const w = screenToWorld(e.clientX, e.clientY);
    let best = null;
    let bestD = 40;
    for (const m of game.monsters) {
      if (m.dead) continue;
      const d = Math.hypot(m.x - w.x, m.y - (w.y + (m.isStone ? 18 : 0)));
      if (d < m.r + 14 && d < bestD) { best = m; bestD = d; }
    }
    if (best) {
      game.target = best;
      return;
    }
    for (const n of game.world.npcs) {
      if (Math.hypot(n.x - w.x, n.y - w.y) < 24 && dist(n, game.player) < 90) ui.openNpc(n);
    }
  });

  setupTouch();
}

function setupTouch() {
  const stick = $('stick');
  const knob = $('stickKnob');
  let stickId = null;
  const RADIUS = 46;

  const moveStick = (e) => {
    const r = stick.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) { dx = dx / len * RADIUS; dy = dy / len * RADIUS; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    input.stick.x = dx / RADIUS;
    input.stick.y = dy / RADIUS;
  };
  const releaseStick = () => {
    stickId = null;
    knob.style.transform = '';
    input.stick.x = 0;
    input.stick.y = 0;
  };
  stick.addEventListener('pointerdown', (e) => {
    stickId = e.pointerId;
    stick.setPointerCapture(e.pointerId);
    moveStick(e);
  });
  stick.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) moveStick(e); });
  stick.addEventListener('pointerup', releaseStick);
  stick.addEventListener('pointercancel', releaseStick);

  const atk = $('btnAttack');
  atk.addEventListener('pointerdown', (e) => {
    atk.setPointerCapture(e.pointerId);
    input.attack = true;
    atk.classList.add('active');
  });
  const stopAttack = () => {
    input.attack = false;
    atk.classList.remove('active');
  };
  atk.addEventListener('pointerup', stopAttack);
  atk.addEventListener('pointercancel', stopAttack);
  atk.addEventListener('contextmenu', (e) => e.preventDefault());

  $('btnTalk').addEventListener('click', interact);

  // Wer den Bildschirm berührt, bekommt die Touch-Steuerung
  window.addEventListener('touchstart', () => {
    if (input.touchUi) return;
    input.touchUi = true;
    if (game.running) $('touchControls').hidden = false;
  }, { once: true, passive: true });
}

function cycleTarget() {
  const p = game.player;
  const list = aliveEnemies().filter((m) => dist(m, p) < 320).sort((a, b) => dist(a, p) - dist(b, p));
  if (!list.length) return;
  const i = list.indexOf(game.target);
  game.target = list[(i + 1) % list.length];
}

function interact() {
  if (game.nearNpc) ui.openNpc(game.nearNpc);
}
