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
  // Maus am PC: walkTo Laufziel, mouseWalk/mouseAttack linke Taste gedrückt
  walkTo: null,
  mouseWalk: false,
  mouseAttack: false,
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
  const len = hyp(x, y);
  if (len < 0.15) return { x: 0, y: 0 };
  if (len > 1) { x /= len; y /= len; }
  // Schulterblick: „nach oben“ heißt „von der Kamera weg“, die Kamera kann gedreht sein
  if (V3.on && V3.yaw) {
    const c = Math.cos(V3.yaw);
    const s = Math.sin(V3.yaw);
    return { x: c * x + s * y, y: -s * x + c * y };
  }
  return { x, y };
}

function setupInput() {
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;
    // Einstellungen: neue Taste für eine Aktion abfangen (tasten.js)
    if (captureKey(e)) return;
    if (!game.running) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (MOVE_KEYS[e.code]) {
      input.keys.add(e.code);
      e.preventDefault();
      return;
    }
    if (e.code === 'Escape') {
      // seit 13.2: Esc schließt der Reihe nach HUD-Bearbeitung, Auswahl, Zielen, Fenster und Ziel –
      // ist nichts davon offen, öffnet Esc die Einstellungen
      if (hudLayout.editing) hudLayout.stop();
      else if ($('quickPick')) closeQuickPicker();
      else if (game.aim) cancelAim();
      else if (ui.anyPanelOpen()) ui.closePanels();
      else if (game.target) game.target = null;
      else ui.toggle('panelOpts');
      return;
    }
    // seit 14.39: Bild↑/Bild↓ steigen bzw. sinken auf dem fliegenden Drachen (zusätzlich zur Leertaste, tasten.js)
    if ((e.code === 'PageUp' || e.code === 'PageDown') && !keyAction(e.code)) {
      if (!e.repeat) setFlyHigh(e.code === 'PageUp');
      e.preventDefault();
      return;
    }
    // seit 10.5 frei belegbar (tasten.js, Einstellungen → Tastenbelegung)
    const act = keyAction(e.code);
    if (act) runAction(act, e);
  });

  window.addEventListener('keyup', (e) => {
    input.keys.delete(e.code);
    const act = keyAction(e.code);
    if (act === 'attack') input.keys.delete('Space');
    // Eisstrahl: Taste loslassen beendet ihn
    const m = act && /^skill(\d)$/.exec(act);
    const slot = m ? Number(m[1]) - 1 : act === 'ult' ? 5 : -1;
    const i = slot >= 0 && game.player ? skillOrder(game.player)[slot] : null;
    if (i != null && i !== ULT_BAR) releaseChannel(i);
  });

  // Beim Wechsel in einen anderen Tab keine Tasten "festhalten"
  window.addEventListener('blur', () => {
    input.keys.clear();
    releaseChannel();
    input.mouseAttack = false;
    input.mouseWalk = false;
    document.body.classList.remove('cam-drag');
    clearAttack();
  });

  // Tippen auf ein Monster wählt es als Ziel. Im Schulterblick dreht Ziehen die Kamera
  // (Finger auf der rechten Bildhälfte), kurzes Tippen wählt weiter aus.
  // Maus am PC: Linksklick auf ein Monster greift an (gedrückt halten = weiter angreifen), Linksklick auf
  // den Boden läuft dorthin (gedrückt halten = dem Mauszeiger folgen), Rechtsklick wählt nur aus,
  // im Schulterblick dreht Ziehen mit der rechten Maustaste die Kamera.
  const cv = renderer.canvas;
  let camDrag = null;
  let oneTouch = null; // seit 14.52: erster Finger in der festen Kamera (für das Zoomen mit zwei Fingern)
  cv.addEventListener('pointerdown', (e) => {
    // Zielkreis offen (Blizzard): Tippen oder Linksklick auf den Boden wirkt dort
    if (game.aim && game.running && (e.pointerType !== 'mouse' || e.button === 0)) {
      const w = screenToWorld(e.clientX, e.clientY);
      if (w && isFinite(w.x) && isFinite(w.y)) aimFire(w.x, w.y);
      return;
    }
    if (e.pointerType === 'mouse') {
      mouseDown(e);
      return;
    }
    if (!v3Shoulder()) {
      // seit 14.52: auch in der festen Kamera mit zwei Fingern zoomen – liegt schon ein Finger auf dem Bild, beginnt
      // der zweite das Zoomen (der erste hat beim Aufsetzen wie bisher ausgewählt)
      // seit 15.57 auch in 2D (zoom2dSet, pixel2d.js)
      if (oneTouch && oneTouch.id !== e.pointerId && !pinch) {
        camDrag = { id: oneTouch.id, x: oneTouch.x, y: oneTouch.y, moved: true, fixed: true };
        pinch = { id: e.pointerId, x: e.clientX, y: e.clientY, d0: hyp(e.clientX - oneTouch.x, e.clientY - oneTouch.y) || 1, z0: V3.on ? V3.zoomMul || 1 : zoom2dMul() };
        try { cv.setPointerCapture(e.pointerId); } catch (err) { /* Finger schon weg */ }
        return;
      }
      oneTouch = { id: e.pointerId, x: e.clientX, y: e.clientY };
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* Finger schon weg */ }
      if (selectAt(e.clientX, e.clientY) === 'monster' && typeof autoAttackClick === 'function') autoAttackClick();
      return;
    }
    // seit 14.32: ein zweiter Finger auf dem Bild übernimmt das Drehen nicht (vorher riss er es dem ersten ab, und
    // beim Loslassen des zweiten blieb die Drehung des ersten stehen)
    if (camDrag) {
      // seit 14.44: zweiter Finger auf dem Bild = Zoomen mit zwei Fingern (auseinander = näher, zusammen = weiter weg)
      if (!pinch && V3.on) {
        pinch = { id: e.pointerId, x: e.clientX, y: e.clientY, d0: hyp(e.clientX - camDrag.x, e.clientY - camDrag.y) || 1, z0: V3.zoomMul || 1 };
        camDrag.moved = true;
        cv.setPointerCapture(e.pointerId);
      }
      return;
    }
    camDrag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    cv.setPointerCapture(e.pointerId);
  });
  // seit 14.44: Zoomen mit zwei Fingern im Schulterblick (der erste Finger dreht wie bisher, solange er allein ist)
  let pinch = null;
  const pinchMove = (e) => {
    if (e.pointerId === pinch.id) { pinch.x = e.clientX; pinch.y = e.clientY; } else { camDrag.x = e.clientX; camDrag.y = e.clientY; }
    const d = hyp(pinch.x - camDrag.x, pinch.y - camDrag.y) || 1;
    // 3D: Abstand der Kamera (zusammen = weiter weg); 2D: Vergrößerung (auseinander = näher)
    if (V3.on) v3SetZoom(pinch.z0 * pinch.d0 / d);
    else zoom2dSet(pinch.z0 * d / pinch.d0);
  };
  const mouseDown = (e) => {
    cv.setPointerCapture(e.pointerId);
    // Rechtsklick bricht einen offenen Zielkreis ab (seit 13.42)
    if (e.button === 2 && game.aim) {
      cancelAim();
      addText(game.player.x, game.player.y - 40, 'Abgebrochen', 'info');
      return;
    }
    if (e.button === 2) {
      // seit 15.31: in jeder 3D-Kamera dreht und neigt Ziehen mit der rechten Maustaste die Sicht (kurzer Klick wählt
      // weiter nur aus); der Mauszeiger wird dabei zur Greifhand (body.cam-drag, style.css)
      if (V3.on) {
        camDrag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false, right: true };
        document.body.classList.add('cam-drag');
      } else selectAt(e.clientX, e.clientY);
      return;
    }
    // mittlere Maustaste: feste Kamera zurück auf die gewohnte Sicht
    if (e.button === 1 && V3.on && !v3Shoulder()) {
      v3OrbitReset();
      return;
    }
    if (e.button !== 0 || !game.running) return;
    const hit = selectAt(e.clientX, e.clientY);
    if (hit === 'monster') {
      input.walkTo = null;
      input.mouseAttack = true;
      tapAttack();
      // Auto-Angriff an (autoangriff.js): das Ziel wird weiter angegriffen, auch nach dem Loslassen
      if (typeof autoAttackClick === 'function') autoAttackClick();
    } else if (!hit) {
      input.mouseWalk = true;
      walkToScreen(e.clientX, e.clientY, true);
    }
  };
  cv.addEventListener('pointermove', (e) => {
    // Am PC folgt der Zielkreis der Maus
    if (game.aim && e.pointerType === 'mouse') {
      const w = screenToWorld(e.clientX, e.clientY);
      if (w && isFinite(w.x) && isFinite(w.y)) aimAt(w.x, w.y);
    }
    if (input.mouseWalk && e.pointerType === 'mouse') walkToScreen(e.clientX, e.clientY, false);
    if (oneTouch && e.pointerId === oneTouch.id) { oneTouch.x = e.clientX; oneTouch.y = e.clientY; }
    if (pinch && camDrag && (e.pointerId === pinch.id || e.pointerId === camDrag.id)) return pinchMove(e);
    if (!camDrag || e.pointerId !== camDrag.id) return;
    const dx = e.clientX - camDrag.x;
    const dy = e.clientY - camDrag.y;
    if (!camDrag.moved && Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
    camDrag.moved = true;
    V3.yawGoal = (V3.yawGoal != null ? V3.yawGoal : V3.yaw || 0) - dx * 0.008;
    // seit 14.48: senkrecht wischen kippt den Schulterblick – nach unten = Kamera höher, mehr von oben (über Häuser
    // und Mauern hinweg), nach oben = wieder flacher (V3.tilt 0…1, drei-kern.js v3PlaceCamera)
    if (v3Shoulder()) V3.tilt = Math.max(0, Math.min(1, (V3.tilt || 0) + dy * 0.004));
    else V3.orbitTilt = Math.max(ORBIT3.min, Math.min(ORBIT3.max, (V3.orbitTilt || 0) + dy * 0.004));
    camDrag.x = e.clientX;
    camDrag.y = e.clientY;
  });
  const endCamDrag = (e) => {
    if (camDrag && camDrag.right && e.pointerId === camDrag.id) document.body.classList.remove('cam-drag');
    if (oneTouch && e.pointerId === oneTouch.id) oneTouch = null;
    if (e.pointerType === 'mouse') {
      input.mouseAttack = false;
      input.mouseWalk = false;
    }
    if (pinch && (e.pointerId === pinch.id || (camDrag && e.pointerId === camDrag.id))) {
      // Zoomen beendet: nichts auswählen; der verbleibende Finger dreht nicht weiter (sonst spränge das Bild)
      pinch = null;
      camDrag = null;
      return;
    }
    if (!camDrag || e.pointerId !== camDrag.id) return;
    // Rechtsklick wählt nur aus; Antippen (Schulterblick) startet wie ein Linksklick den Auto-Angriff
    if (!camDrag.moved && selectAt(e.clientX, e.clientY) === 'monster' && !camDrag.right && typeof autoAttackClick === 'function') autoAttackClick();
    camDrag = null;
  };
  cv.addEventListener('pointerup', endCamDrag);
  cv.addEventListener('pointercancel', endCamDrag);
  // Kein Browser-Menü (Bild speichern, Untersuchen …) im Spiel: die rechte Maustaste gehört dem Spiel
  document.addEventListener('contextmenu', (e) => {
    if (game.running && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) e.preventDefault();
  });
  // mittlere Maustaste gehört dem Spiel (kein Rollkreuz des Browsers)
  cv.addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault(); });
  // Mausrad: näher oder weiter weg (3D)
  cv.addEventListener('wheel', (e) => {
    // seit 15.57 auch in 2D: herauszoomen kippt im Pixel-Stil die Sicht (pixel2d.js)
    if (!V3.on) {
      e.preventDefault();
      zoom2dSet(zoom2dMul() * (e.deltaY > 0 ? 1 / 1.06 : 1.06));
      return;
    }
    e.preventDefault();
    // seit 14.44 mit eigener Grenze je Kamera (v3SetZoom, drei-kern.js): im Schulterblick weiter hinaus
    v3SetZoom((V3.zoomMul || 1) * (e.deltaY > 0 ? 1.08 : 1 / 1.08));
  }, { passive: false });

  setupTouch();
}

// Mausklick am PC auf den Boden: Ziel zum Hinlaufen setzen (mit kleinem Ring beim ersten Klick)
function walkToScreen(clientX, clientY, mark) {
  const w = screenToWorld(clientX, clientY);
  if (!w || !isFinite(w.x) || !isFinite(w.y)) return;
  input.walkTo = { x: w.x, y: w.y };
  if (mark) addEffect({ type: 'ring', x: w.x, y: w.y, r: 16, dur: 0.45, color: '#ffe08a', width: 3, grow: true });
}

// Monster oder Seelenstein unter dem Finger bzw. Mauszeiger – nach seinem Bild auf dem Schirm: eine Achse vom Fuß bis
// zum Kopf, so breit wie die Figur (am Handy etwas großzügiger). Vorher zählte nur der Bodenpunkt unter dem Zeiger:
// In 3D liegt der Boden hinter dem oberen Teil einer Figur aber weit hinter ihr – wer in der festen Kamera die obere
// Hälfte eines Seelensteins antippte, wählte nichts aus (am PC lief die Figur stattdessen dorthin), im Schulterblick
// traf nur das unterste Zehntel des Steins, und ein Tipp auf den Kopf eines Monsters wählte den Stein dahinter.
// Rückgabe { m, s }: s = Abstand zur Achse im Verhältnis zur halben Breite (0 = mitten drauf, unter 1 = getroffen).
const PICK_SCREEN = { far: 2200, minW: 10, minWTouch: 16, wide: 0.28 };
function monsterAtScreen(sx, sy) {
  const p = game.player;
  const touch = input.touchUi;
  const r = renderer;
  // 3D: Bildpunkte je Weltpixel entlang der Bildwaagerechten (wie v3Anchor) an der Stelle der Figur
  const yaw = V3.on ? V3.yaw || 0 : 0;
  const ex = Math.cos(yaw) * 32;
  const ey = -Math.sin(yaw) * 32;
  const a = {};
  const b = {};
  const c = {};
  let best = null;
  let bestS = 1;
  for (const m of game.monsters) {
    if (m.dead || m.hidden) continue;
    if (p && (Math.abs(m.x - p.x) > PICK_SCREEN.far || Math.abs(m.y - p.y) > PICK_SCREEN.far)) continue;
    const h = figureHeight(m);
    // Fußpunkt: Seelensteine stehen auf ihrer Mitte (zeichnen.js drawStone, drei-figuren.js syncStone3), Monster auf feetY
    const fy = m.isStone ? m.y + 8 : feetY(m);
    let k;
    if (V3.on) {
      v3Project(m.x, fy, 0, a);
      v3Project(m.x, fy, h * U3 * (m.isStone ? 1.05 : 1), b);
      if (!(a.z > -1 && a.z < 1 && b.z > -1 && b.z < 1)) continue;
      v3Project(m.x + ex, fy + ey, 0, c);
      k = hyp(c.x - a.x, c.y - a.y) / 32;
    } else {
      // seit 15.57 über worldToScreen2d (pixel2d.js): stimmt auch in der schrägen Sicht beim Herauszoomen
      worldToScreen2d(m.x, fy, a);
      k = r.zoom * a.s;
      b.x = a.x;
      b.y = a.y - h * k;
    }
    const half = Math.max(touch ? PICK_SCREEN.minWTouch : PICK_SCREEN.minW, k * Math.max((m.r || 12) + 4, h * PICK_SCREEN.wide));
    // Abstand zur Strecke Fuß–Kopf
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const L2 = vx * vx + vy * vy;
    const u = L2 > 0 ? Math.max(0, Math.min(1, ((sx - a.x) * vx + (sy - a.y) * vy) / L2)) : 0;
    const s = hyp(sx - (a.x + vx * u), sy - (a.y + vy * u)) / half;
    if (s < bestS) { best = m; bestS = s; }
  }
  return best ? { m: best, s: bestS } : null;
}

// Mausklick oder Tippen: Monster als Ziel wählen oder mit einem Dorfbewohner sprechen.
// Gibt zurück, was getroffen wurde: 'monster', 'player', 'npc' oder nichts.
function selectAt(clientX, clientY) {
  if (!game.running) return null;
  {
    const w = screenToWorld(clientX, clientY);
    const pick = monsterAtScreen(clientX, clientY);
    // Mitspieler antippen: im Duell als Ziel, sonst öffnet sich oben die Spielerkarte
    // (ein Monster oder Seelenstein, das genau unter dem Finger liegt, geht der Spielerkarte vor)
    const pid = remotePlayerAt(w.x, w.y);
    if (pid && !(pick && pick.s < 0.5 && !(duelFighting() && game.duel.pid === pid) && !(typeof pvpProxyFor === 'function' && pvpProxyFor(pid)))) {
      if (duelFighting() && game.duel.pid === pid) {
        setTarget(game.duel.proxy, true);
        return 'monster';
      }
      // seit 13.86: in der Turnierarena wird ein Gegner zum Ziel (Mitspieler im eigenen Team nie)
      const foe = typeof pvpProxyFor === 'function' ? pvpProxyFor(pid) : null;
      if (foe) {
        setTarget(foe, true);
        return 'monster';
      }
      pcard.open(pid);
      return 'player';
    }
    // Wer am besten unter dem Zeiger liegt, gewinnt (monsterAtScreen: nach dem Bild der Figur, auch in 3D und im
    // Schulterblick). Vorher gewann der Letzte in der Liste, der knapp in Reichweite lag – ein Klick auf einen
    // Seelenstein wählte so oft ein Monster daneben oder dahinter.
    if (pick) {
      // seit 13.85 als bewusster Fokus (setTarget, kampf.js)
      setTarget(pick.m, true);
      return 'monster';
    }
    // seit 14.16: Teleportstein antippen (nah dran: sofort, sonst hinlaufen; teleportsteine.js)
    if (typeof tpTap === 'function' && tpTap(w.x, w.y)) return 'npc';
    for (const n of game.world.npcs) {
      // seit 13.91 nur im selben Raum (begehbare Häuser, sameRoom in welt.js)
      if (hyp(n.x - w.x, feetY(n) - 22 - w.y) < 28 && dist(n, game.player) < 90 && sameRoom(n, game.player)) {
        ui.openNpc(n);
        return 'npc';
      }
    }
  }
  return null;
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
  // Zeitpunkt des Ereignisses selbst (nicht, wann es abgearbeitet wird): Ruckelt das Spiel (warmes Handy, langsame
  // Bilder), kamen Aufsetzen und Loslassen eines schnellen Tipps oft erst 300 ms und mehr auseinander an – der Tipp auf
  // ein Monster oder einen Seelenstein in der linken Bildhälfte wählte dann nichts aus (und startete keinen Auto-Angriff)
  const evAt = (e) => {
    const now = performance.now();
    return e && e.timeStamp > 0 && e.timeStamp <= now + 50 && e.timeStamp > now - 60000 ? e.timeStamp : now;
  };

  const placeStick = (x, y) => {
    stick.style.left = x - stick.offsetWidth / 2 + 'px';
    stick.style.top = y - stick.offsetHeight / 2 + 'px';
    stick.style.bottom = 'auto';
  };
  const moveStick = (e) => {
    let dx = e.clientX - origin.x;
    let dy = e.clientY - origin.y;
    const len = hyp(dx, dy);
    if (len > 10) moved = true;
    if (len > RADIUS) { dx = dx / len * RADIUS; dy = dy / len * RADIUS; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    input.stick.x = dx / RADIUS;
    input.stick.y = dy / RADIUS;
  };
  const releaseStick = (e) => {
    if (e.pointerId !== stickId) return;
    // Kurzes Antippen ohne Ziehen (unter 350 ms nach den Zeitstempeln der Ereignisse) wählt wie gewohnt ein Monster aus
    // (seit 14.2: bei offenem Zielkreis wirkt es dort – die linke Bildhälfte gehört sonst ganz dem Knüppel)
    if (!moved && evAt(e) - downAt < 350) {
      const w = game.aim ? screenToWorld(e.clientX, e.clientY) : null;
      if (w && isFinite(w.x) && isFinite(w.y)) aimFire(w.x, w.y);
      else if (selectAt(e.clientX, e.clientY) === 'monster' && typeof autoAttackClick === 'function') autoAttackClick();
    }
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
    downAt = evAt(e);
    placeStick(e.clientX, e.clientY);
    stick.classList.add('active');
    moveStick(e);
  });
  zone.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) moveStick(e); });
  zone.addEventListener('pointerup', releaseStick);
  zone.addEventListener('pointercancel', releaseStick);

  const atk = $('btnAttack');
  // Gedrückt halten greift immer weiter an (wie die Leertaste am PC), Tippen bleibt ein einzelner Angriff
  atk.addEventListener('pointerdown', (e) => {
    try { atk.setPointerCapture(e.pointerId); } catch (x) { /* ohne Fangen geht es auch */ }
    tapAttack();
    input.touchAttack = true;
    atk.classList.add('active');
  });
  const stopAttack = () => {
    input.touchAttack = false;
    atk.classList.remove('active');
  };
  atk.addEventListener('pointerup', stopAttack);
  atk.addEventListener('pointercancel', stopAttack);
  atk.addEventListener('lostpointercapture', stopAttack);
  // App im Hintergrund: nicht ewig weiter angreifen
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopAttack(); });
  atk.addEventListener('contextmenu', (e) => e.preventDefault());

  onPress($('btnTalk'), interact);

  // Mehrere Finger (seit 13.25): iPhones lösen kein „click“ aus, solange ein anderer Finger liegt – wer mit dem
  // Steuerkreuz lief, konnte Aufträge, Menüs und Fenster nicht antippen. Ein kurzes Tippen mit einem zweiten Finger
  // wird darum selbst als Klick weitergegeben (Leiste, Steuerkreuz, Angriff und die Spielfläche reagieren schon beim
  // Aufsetzen und bleiben außen vor). Kommt doch noch ein echter Klick nach, wird er verworfen.
  const touches = new Map();
  let synth = null;
  const SKIP = '#skillBar, #touchControls, canvas, .potion, #quick1, #quick2, input, textarea, select, label';
  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now(), target: e.target });
  }, true);
  const endTouch = (e, cancel) => {
    if (e.pointerType !== 'touch') return;
    const t = touches.get(e.pointerId);
    touches.delete(e.pointerId);
    if (cancel || !t || !(t.target instanceof Element)) return;
    const others = touches.size > 0 || stickId !== null || input.touchAttack;
    if (!others) return;
    if (hyp(e.clientX - t.x, e.clientY - t.y) > 14 || performance.now() - t.t > 700) return;
    if (t.target.closest(SKIP) || !t.target.isConnected) return;
    synth = { el: t.target, at: performance.now(), x: e.clientX, y: e.clientY };
    t.target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window, detail: 1, clientX: e.clientX, clientY: e.clientY }));
  };
  document.addEventListener('pointerup', (e) => endTouch(e, false), true);
  document.addEventListener('pointercancel', (e) => endTouch(e, true), true);
  document.addEventListener('click', (e) => {
    // seit 14.5 auch nach Ort: schließt der weitergegebene Klick ein Fenster (z. B. × der großen Karte), trifft der echte
    // Klick danach das, was darunter liegt (die kleine Karte) – und öffnete das Fenster sofort wieder
    if (e.isTrusted && synth && performance.now() - synth.at < 600 &&
        (e.target === synth.el || synth.el.contains(e.target) || hyp(e.clientX - synth.x, e.clientY - synth.y) < 30)) {
      e.stopImmediatePropagation();
      e.preventDefault();
      synth = null;
    }
  }, true);

  // Wer den Bildschirm berührt, bekommt die Touch-Steuerung
  window.addEventListener('touchstart', () => {
    if (input.touchUi) return;
    input.touchUi = true;
    if (game.running) {
      $('touchControls').hidden = false;
      $('hud').classList.add('touch');
      ui.placeLootBtn();
      hudLayout.init();
    }
  }, { once: true, passive: true });
}

// Tab: nächstes Ziel (seit 13.62 stabil und weiter): reicht so weit wie der Angriff plus Rand (mindestens 560, mit
// Bogen weiter). Jeder Druck nimmt das nächstgelegene Monster, das in dieser Runde noch nicht dran war – vorher wurde
// bei jedem Druck neu nach Entfernung sortiert, und weil die Monster laufen, sprang Tab oft auf dasselbe zurück.
// Sind alle einmal dran gewesen, beginnt die Runde von vorn (beim nächsten zum aktuellen).
const TAB = { seen: new Set(), at: 0 };
function cycleTarget() {
  const p = game.player;
  if (!p) return;
  const reach = Math.max(560, (typeof basicAttack === 'function' ? basicAttack(p).range : 0) + 200);
  // seit 13.85: Seelensteine kommen erst nach den Monstern dran
  // seit 13.86 auch die Gegner in der Turnierarena (m.pvp), aber weiter nicht der Duellgegner
  const list = enemiesNear(p.x, p.y, reach).filter((m) => !m.hidden && !(m.duelProxy && !m.pvp) && dist(m, p) < reach).sort((a, b) => (a.isStone ? 1 : 0) - (b.isStone ? 1 : 0) || dist(a, p) - dist(b, p));
  if (!list.length) return;
  // nach einer Pause von 4 s beginnt eine neue Runde
  if (game.time - TAB.at > 4) TAB.seen.clear();
  TAB.at = game.time;
  if (game.target) TAB.seen.add(game.target.id);
  let next = list.find((m) => !TAB.seen.has(m.id));
  if (!next) {
    TAB.seen.clear();
    if (game.target) TAB.seen.add(game.target.id);
    next = list.find((m) => m !== game.target) || list[0];
  }
  TAB.seen.add(next.id);
  setTarget(next, true);
  faceTowards(next.x, next.y);
  // läuft gerade ein Auto-Angriff, geht er mit Tab auf das neue Ziel über (sonst wählt Tab wie bisher nur aus)
  if (typeof autoAttackRetarget === 'function') autoAttackRetarget(next);
}

function interact() {
  if (game.nearNpc) ui.openNpc(game.nearNpc);
}

// Kein Zoomen mit zwei Fingern oder per Doppelklick; das Doppeltippen sperrt touch-action: manipulation im CSS
// (Safari ignoriert user-scalable=no)
document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
