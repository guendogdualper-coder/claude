// Spielzustand und Hauptschleife. Diese Datei wird als letzte geladen und startet alles.

const GAME_VERSION = '11.2';

const game = {
  world: null,
  player: null,
  stats: null,
  monsters: [],
  allies: [],
  clones: [],
  projectiles: [],
  effects: [],
  particles: [],
  texts: [],
  shake: 0,
  hitStop: 0,
  hurtFlash: 0,
  timers: [],
  time: 0,
  running: false,
  target: null,
  nearNpc: null,
  zoneId: null,
  saveTimer: 0
};

function startGame(save, slot) {
  // Platz des Charakters merken (neue Figur: erster freier Platz)
  saveSlot = slot != null ? slot : slotFor(save);
  // mit Konto: dieser Charakter wird jetzt hier gespielt
  if (typeof accountClaim === 'function') accountClaim(saveSlot);
  game.party = null;
  game.player = makePlayer(save);
  game.stats = playerStats(game.player);
  game.allies = [];
  game.clones = [];
  game.projectiles = [];
  game.target = null;
  game.running = true;
  game.zoneId = null;
  keepScreenOn();
  ui.closePanels();
  ui.enterGame();
  refreshKeyLabels();
  const c = CLASSES[game.player.classId];
  // Begrüßung im Chat statt mitten im Bild
  if (game.player.statNotice) {
    game.player.statNotice = false;
    ui.log(`Neu: 1 Statuspunkt pro Stufe. Deine Statuspunkte wurden zurückgesetzt – verteile jetzt ${game.player.statPoints} Punkte neu (kostenlos).`, 'level');
  }
  ui.chat('', input.touchUi ? `Willkommen, ${game.player.name}! Hilfe findest du unter dem Buch-Knopf oben.` : `Willkommen, ${game.player.name}! Drücke H für die Steuerung.`);
  if (game.player.level === 1 && game.player.xp === 0) {
    ui.log(`Als ${c.name} nutzt du Taste ${keyLabel(actionKey('skill1'))} für ${classSkills(game.player)[0].name}. Jage zuerst Wilde Hunde vor dem Dorf.`, 'info');
  }
}

function updatePlayer(dt) {
  const p = game.player;
  if (p.dead) return;
  p.playTime += dt;
  p.attackCd = Math.max(0, p.attackCd - dt);
  if (p.potCd) for (const k of ['hp', 'mp']) p.potCd[k] = Math.max(0, p.potCd[k] - dt);
  p.swing = Math.max(0, p.swing - dt);
  p.spin = Math.max(0, (p.spin || 0) - dt);
  basicTick(p);
  updateBuffAuras(dt);
  for (let i = 0; i < 5; i++) p.skillCd[i] = Math.max(0, p.skillCd[i] - dt);
  p.ultCd = Math.max(0, (p.ultCd || 0) - dt);
  // Staubwölkchen bei jedem Schritt
  if (p.moving && !p.riding) {
    const step = Math.floor(game.time * 9) % 4;
    if ((step === 1 || step === 3) && step !== p.lastStep) {
      particles(p.x - p.facing.x * 4, feetY(p), { count: 3, color: ['#b8a888', '#9a8a6a'], angle: Math.atan2(-p.facing.y, -p.facing.x), spread: 1.2, speed: [15, 45], life: [0.3, 0.5], size: [1.5, 3], drag: 4, glow: false });
    }
    p.lastStep = step;
  }

  // abgelaufene Buffs entfernen
  const before = p.buffs.length;
  p.buffs = p.buffs.filter((b) => b.until > game.time);
  if (p.buffs.length < before) game.stats = playerStats(p);
  if (p.shield > 0 && game.time > p.shieldUntil) p.shield = 0;

  const s = game.stats;
  p.moving = false;
  if (p.dash) {
    updateDash(dt);
  } else {
    const mv = moveVector();
    let approaching = false;
    if (mv.x || mv.y) {
      const spd = s.speed * (p.channel ? BEAM_WALK : 1);
      p.moving = moveEntity(p, mv.x * spd * dt, mv.y * spd * dt, false);
      const len = Math.hypot(mv.x, mv.y);
      p.facing = { x: mv.x / len, y: mv.y / len };
    }
    // Leertaste, linke Maustaste auf einem Monster (PC) oder Angriffsknopf (Handy) gehalten: jeder Frame ist ein neuer Tipp
    if (input.keys.has('Space') || input.mouseAttack || input.touchAttack) input.attackAt = game.time;
    // Mausklick auf den Boden: dorthin laufen, bis Tasten, Steuerknüppel oder ein Angriff übernehmen
    if (mv.x || mv.y || game.time - input.attackAt < 0.45) input.walkTo = null;
    else if (input.walkTo) {
      const wt = input.walkTo;
      if (Math.hypot(wt.x - p.x, wt.y - p.y) < 6 || !moveToward(p, wt.x, wt.y, s.speed * (p.channel ? BEAM_WALK : 1) * dt, false)) input.walkTo = input.mouseWalk ? wt : null;
      else p.moving = true;
      faceTowards(wt.x, wt.y);
    }
    // offener Tipp: kurz gültig, beim Hinlaufen zum Ziel bis zu 3 Sekunden
    const tapAge = game.time - input.attackAt;
    const wantAttack = tapAge >= 0 && tapAge < (input.attackWalk ? 3 : 0.45);
    if (!wantAttack) input.attackWalk = false;
    if (!(mv.x || mv.y) && wantAttack) {
      // Angriff gedrückt, aber nichts in Reichweite: zum Ziel laufen
      const c = CLASSES[p.classId];
      const t = (game.target && !game.target.dead && dist(game.target, p) < 420) ? game.target : nearestEnemy(p, 260);
      if (t && (dist(t, p) - t.r > basicAttack(p).range || inVillage(p.x, p.y))) {
        game.target = t;
        p.moving = moveToward(p, t.x, t.y, s.speed * dt, false);
        faceTowards(t.x, t.y);
        approaching = true;
        input.attackWalk = true;
      }
    }
    // Läuft die Figur gerade zu einem Gegner, schlägt sie erst bei ihm zu; sonst auch ins Leere.
    // Ein Tipp ist genau ein Schlag.
    if (wantAttack && !approaching && tryBasicAttack()) clearAttack();
  }

  // Eisstrahl halten (nach dem Laufen, damit er der neuen Stelle folgt)
  channelTick(p, dt);
  // Gräber für den Totenruf (Nekromant)
  graveTick();

  // Regeneration: außerhalb des Kampfes deutlich schneller
  const calm = game.time - p.lastCombat > 5;
  p.hp = Math.min(s.maxHp, p.hp + s.maxHp * ((calm ? 0.02 : 0.003) + s.regen) * dt);
  p.mp = Math.min(s.maxMp, p.mp + s.maxMp * (calm ? 0.03 : 0.012) * dt);

  // Händlerin oder Schmied in der Nähe?
  // nächste Person in Reichweite (in den Lagern stehen mehrere dicht beieinander)
  let near = null;
  let nd = 70;
  for (const n of game.world.npcs) {
    const d = dist(n, p);
    if (d < nd) { near = n; nd = d; }
  }
  game.nearNpc = near;

  // Zonenwechsel ankündigen
  const zone = zoneAt(p.x, p.y);
  if (zone.id !== game.zoneId) {
    if (game.zoneId !== null) ui.banner(zone.name, zone.levels);
    game.zoneId = zone.id;
  }
}

function update(dt) {
  // Kurzes Einfrieren bei harten Treffern
  if (game.hitStop > 0) {
    game.hitStop -= dt;
    return;
  }
  game.time += dt;
  game.stats = playerStats(game.player);
  updateTimers();
  updateAim();
  updatePlayer(dt);
  // Beim Mitspieler führt der Host die Monster (netUpdate zieht sie nur nach)
  if (net.mode !== 'client') updateMonsters(dt);
  netUpdate(dt);
  updateAllies(dt);
  updateClones(dt);
  updateVillagers(dt);
  updateAmbient(dt);
  updateProjectiles(dt);
  updateEffects(dt);
  questTick();
  updateRifts();
  updateDuel();
  snd.update();
  pcard.update();
  partyTick();
  if (game.target && game.target.dead) game.target = null;
  raidWatch();

  game.saveTimer += dt;
  if (game.saveTimer > 10) {
    game.saveTimer = 0;
    saveGame();
  }
  ui.update();
}

// Auf Touch-Geräten wird nur im Querformat gespielt; im Hochformat pausiert das Spiel
const portraitQuery = window.matchMedia('(orientation: portrait) and (pointer: coarse)');

let lastFrame = 0;
// Bildrate begrenzen (seit 9.9): bei 30 wird jedes zweite Bild übersprungen; Menüs und offene Fenster laufen
// immer mit 30 – das spart Grafikarbeit, Akku und Wärme
function frameCap() {
  if (opts.fps === '30' || !game.running || (typeof ui !== 'undefined' && ui.anyPanelOpen && ui.anyPanelOpen())) return 30;
  if (opts.fps === 'auto' && quality.cap30) return 30;
  return 0;
}
let mapSkip = 0;
function frame(ts) {
  const cap = frameCap();
  if (cap && ts - lastFrame < 1000 / cap - 4) {
    requestAnimationFrame(frame);
    return;
  }
  const raw = ts - lastFrame;
  const dt = Math.min(0.05, raw / 1000 || 0);
  lastFrame = ts;
  if (renderer.resizeDue) resizeRenderer();
  adaptQuality(raw, cap);
  updateScreenEffects(dt);
  if (game.running && !portraitQuery.matches) update(dt);
  else if (!game.running) game.time += dt;
  // Große Karte offen (seit 10.8): Sie bedeckt fast den ganzen Bildschirm, die Welt dahinter nur jedes dritte Bild
  // zeichnen (die Karte selbst läuft weiter) – spart viel Grafikleistung, die Karte bleibt flüssig
  if (game.running && typeof bigMapOpen === 'function' && bigMapOpen() && ++mapSkip % 3) tickBigMap();
  else render();
  requestAnimationFrame(frame);
}

function boot() {
  game.world = generateWorld();
  populateWorld();
  setupRenderer();
  ui.init();
  setupInput();
  ui.showStart();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) saveGame();
    else if (game.running) keepScreenOn();
  });
  window.addEventListener('pagehide', saveGame);
  registerApp();
  lockLandscape();
  portraitQuery.addEventListener('change', () => {
    input.keys.clear();
    clearAttack();
    if (portraitQuery.matches) saveGame();
  });
  requestAnimationFrame(frame);
}

// Neue Version online? Beim Start und alle 5 Minuten nachsehen; dann oben ein Knopf zum Neuladen.
// Wichtig im Kanal: Monster rechnet der Host – spielt er eine alte Version, gelten für alle die alten Werte.
function versionNewer(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  }
  return false;
}
function showUpdateBar(v, why) {
  let bar = document.getElementById('updateBar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'updateBar';
    bar.className = 'update-bar';
    document.body.append(bar);
  }
  bar.innerHTML = `<span>${why || `Neue Version ${v} ist da.`}</span><button type="button" class="btn btn-primary">Jetzt neu laden</button>`;
  bar.querySelector('button').addEventListener('click', () => {
    if (game.running) saveGame();
    location.reload();
  });
}
function checkForUpdate() {
  fetch('js/spiel.js?v=' + Date.now(), { cache: 'no-store' })
    .then((r) => r.text())
    .then((t) => {
      const m = t.match(/GAME_VERSION = '([\d.]+)'/);
      if (m && versionNewer(m[1], GAME_VERSION)) showUpdateBar(m[1]);
    })
    .catch(() => {});
}
setTimeout(checkForUpdate, 8000);
setInterval(checkForUpdate, 5 * 60 * 1000);

// Als App installiert: Dateien für den Offline-Start speichern
function registerApp() {
  if (!document.querySelector('link[rel="manifest"]')) return;
  try {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  } catch {
    // nicht erlaubt, das Spiel läuft trotzdem
  }
}

// Android: Querformat festhalten (auf dem iPhone übernimmt das der Hinweis zum Drehen)
function lockLandscape() {
  try {
    if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
  } catch {
    // nicht unterstützt
  }
}

// Bildschirm beim Spielen nicht abschalten (wo das Gerät es erlaubt)
function keepScreenOn() {
  try {
    if ('wakeLock' in navigator) navigator.wakeLock.request('screen').catch(() => {});
  } catch {
    // nicht unterstützt
  }
}

boot();
