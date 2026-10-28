// Eingabe: Tastatur, Maus und Touch-Steuerung.

function tapAttack() {
  input.attackAt = game.time;
  input.attackWalk = false;
}
function clearAttack() {
  input.attackAt = -99;
  input.attackWalk = false;
}

const input = {
  keys: new Set(),
  // Angriff nur per Antippen: jeder Tipp (oder Tastendruck) ist genau ein Schlag. attackAt: Zeit des
  // letzten Tipps; er wartet kurz, falls der Schlag noch abklingt, oder bis die Figur beim Ziel ist.
  attack: false,
  attackAt: -99,
  attackWalk: false,
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
        if (!e.repeat) tapAttack();
        e.preventDefault();
        break;
      case 'Digit6':
        useUltimate();
        break;
      case 'Digit1': case 'Digit2': case 'Digit3': case 'Digit4': case 'Digit5':
        if (game.player) useSkill(skillOrder(game.player)[Number(e.code.slice(5)) - 1]);
        break;
      case 'KeyQ': usePotion('hp'); break;
      case 'KeyE': usePotion('mp'); break;
      case 'KeyF': interact(); break;
      case 'KeyC': if (!e.repeat) ui.toggle('panelChar'); break;
      case 'KeyH': if (!e.repeat) ui.toggle('panelHelp'); break;
      case 'KeyI': if (!e.repeat) ui.toggle('panelInv'); break;
      case 'KeyR': if (!e.repeat) toggleRide(); break;
      case 'KeyN': if (!e.repeat) ui.toggle('panelNet'); break;
      case 'KeyG': if (!e.repeat) ui.toggle('panelSocial'); break;
      case 'KeyO': if (!e.repeat) ui.toggle('panelOpts'); break;
      case 'Enter': if (netOnline()) { ui.openChat(); e.preventDefault(); } break;
      case 'KeyB': if (!e.repeat) ui.toggle('panelLoot'); break;
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
  });

  // Beim Wechsel in einen anderen Tab keine Tasten "festhalten"
  window.addEventListener('blur', () => {
    input.keys.clear();
    clearAttack();
  });

  // Mausklick oder Tippen auf ein Monster wählt es als Ziel
  renderer.canvas.addEventListener('pointerdown', (e) => selectAt(e.clientX, e.clientY));

  setupTouch();
}

// Mausklick oder Tippen: Monster als Ziel wählen oder mit einem Dorfbewohner sprechen
function selectAt(clientX, clientY) {
  if (!game.running) return;
  {
    const w = screenToWorld(clientX, clientY);
    // Mitspieler antippen: im Duell als Ziel, sonst öffnet sich oben die Spielerkarte
    const pid = remotePlayerAt(w.x, w.y);
    if (pid) {
      if (duelFighting() && game.duel.pid === pid) game.target = game.duel.proxy;
      else pcard.open(pid);
      return;
    }
    let best = null;
    let bestD = 40;
    for (const m of game.monsters) {
      if (m.dead) continue;
      const h = figureHeight(m);
      const cy = m.isStone ? m.y - 18 : feetY(m) - h / 2;
      const d = Math.hypot(m.x - w.x, cy - w.y);
      if (d < Math.max(m.r + 10, h * 0.5) && d < bestD + h * 0.2) { best = m; bestD = d; }
    }
    if (best) {
      game.target = best;
      return;
    }
    for (const n of game.world.npcs) {
      if (Math.hypot(n.x - w.x, feetY(n) - 22 - w.y) < 28 && dist(n, game.player) < 90) ui.openNpc(n);
    }
  }
}

// Knopf, der schon beim Aufsetzen des Fingers auslöst. Ein normaler Klick kommt auf dem
// iPhone nicht an, solange ein zweiter Finger (z. B. auf dem Angriffsknopf) liegt.
function onPress(el, fn) {
  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    fn(e);
  });
  // Tastatur (Enter/Leertaste auf dem Knopf) löst weiterhin über click aus
  el.addEventListener('click', (e) => { if (e.detail === 0) fn(e); });
}

function setupTouch() {
  // Schwebender Steuerknüppel: erscheint dort, wo der Daumen die linke Bildschirmhälfte berührt
  const zone = $('stickZone');
  const stick = $('stick');
  const knob = $('stickKnob');
  const RADIUS = 46;
  let stickId = null;
  let origin = null;
  let moved = false;
  let downAt = 0;

  const placeStick = (x, y) => {
    stick.style.left = x - stick.offsetWidth / 2 + 'px';
    stick.style.top = y - stick.offsetHeight / 2 + 'px';
    stick.style.bottom = 'auto';
  };
  const moveStick = (e) => {
    let dx = e.clientX - origin.x;
    let dy = e.clientY - origin.y;
    const len = Math.hypot(dx, dy);
    if (len > 10) moved = true;
    if (len > RADIUS) { dx = dx / len * RADIUS; dy = dy / len * RADIUS; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    input.stick.x = dx / RADIUS;
    input.stick.y = dy / RADIUS;
  };
  const releaseStick = (e) => {
    if (e.pointerId !== stickId) return;
    // Kurzes Antippen ohne Ziehen wählt wie gewohnt ein Monster aus
    if (!moved && performance.now() - downAt < 250) selectAt(e.clientX, e.clientY);
    stickId = null;
    knob.style.transform = '';
    input.stick.x = 0;
    input.stick.y = 0;
    stick.classList.remove('active');
    stick.removeAttribute('style');
  };
  zone.addEventListener('pointerdown', (e) => {
    if (stickId !== null) return;
    stickId = e.pointerId;
    zone.setPointerCapture(e.pointerId);
    origin = { x: e.clientX, y: e.clientY };
    moved = false;
    downAt = performance.now();
    placeStick(e.clientX, e.clientY);
    stick.classList.add('active');
    moveStick(e);
  });
  zone.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) moveStick(e); });
  zone.addEventListener('pointerup', releaseStick);
  zone.addEventListener('pointercancel', releaseStick);

  const atk = $('btnAttack');
  atk.addEventListener('pointerdown', (e) => {
    atk.setPointerCapture(e.pointerId);
    tapAttack();
    atk.classList.add('active');
  });
  const stopAttack = () => {
    atk.classList.remove('active');
  };
  atk.addEventListener('pointerup', stopAttack);
  atk.addEventListener('pointercancel', stopAttack);
  atk.addEventListener('contextmenu', (e) => e.preventDefault());

  onPress($('btnTalk'), interact);

  // Wer den Bildschirm berührt, bekommt die Touch-Steuerung
  window.addEventListener('touchstart', () => {
    if (input.touchUi) return;
    input.touchUi = true;
    if (game.running) {
      $('touchControls').hidden = false;
      $('hud').classList.add('touch');
    }
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

// Kein Zoomen mit zwei Fingern oder per Doppelklick; das Doppeltippen sperrt touch-action: manipulation im CSS
// (Safari ignoriert user-scalable=no)
document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
