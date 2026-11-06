// Wandernde Dungeon-Eingänge (seit 14.17): Die Eingänge der normalen Dungeons (Spinnenhöhle, Banditenkeller,
// Orkfestung …) bleiben nicht immer an derselben Stelle. Alle ENTRY_SHIFT.every (3 Stunden, nach der Uhrzeit, für
// alle Spieler gleich) zieht jeder Eingang an einen von ENTRY_SHIFT.count Plätzen seiner Karte (der ursprüngliche
// Platz zählt mit). Die Plätze werden einmal je Welt aus der Lage der Kacheln bestimmt (kein Zufallsgenerator, die
// Welt bleibt also gleich): freier Boden ohne Bäume, Felsen und Wasser, nicht in der Stadt, nicht am Kartenrand und
// mit Abstand zu Weltportalen und anderen Eingängen. Instanzen in den Ecken, Endbosse und der Höllenthron bleiben,
// wo sie sind. Risse öffnen sich ohnehin zufällig in deiner Nähe (updateRifts, quests.js).
const ENTRY_SHIFT = { every: 3 * 3600 * 1000, count: 5, gap: 24, minFromCity: 14, tries: 900 };
const entryShift = { slot: null, spots: null, world: null };

function entryHash(a, b) {
  let h = Math.imul((a | 0) + 0x5bd1e995, 0x2c1b3c6d) ^ Math.imul((b | 0) + 0x27d4eb2d, 0x165667b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return h >>> 0;
}

// Dungeons, deren Eingang wandert
function entryMovable(dg) {
  const d = dg && dg.def;
  return !!d && !!d.entry && !d.entry.corner && !d.raid && !d.instanz && !d.inst60;
}

// Plätze je Dungeon (Index → Liste von Kachelmitten), einmal je Welt
function entrySpotsAll() {
  const w = game.world;
  if (entryShift.world === w && entryShift.spots) return entryShift.spots;
  const spots = new Map();
  const taken = [];
  for (const n of w.npcs) if (n.id === 'weltentor' || n.id === 'eingang') taken.push({ x: n.x / TILE, y: n.y / TILE });
  (w.dungeons || []).forEach((dg, k) => {
    if (!entryMovable(dg)) return;
    const gate = w.npcs.find((n) => n.id === 'eingang' && n.dungeon === k);
    if (!gate) return;
    const home = { x: gate.x / TILE, y: gate.y / TILE, base: true };
    const list = [home];
    const wm = mapOfTile(home.x, home.y);
    if (!wm) { spots.set(k, list); return; }
    const [rx, ry, rw, rh] = wm.region;
    const half = (wm.id === 1 ? VILLAGE_HALF : wm.camp || CAMP_HALF) + ENTRY_SHIFT.minFromCity;
    const okTile = (tx, ty) => {
      if (tx < rx + MAP_BORDER + 10 || ty < ry + MAP_BORDER + 10 || tx >= rx + rw - MAP_BORDER - 10 || ty >= ry + rh - MAP_BORDER - 10) return false;
      if (Math.max(Math.abs(tx - wm.cx), Math.abs(ty - wm.cy)) < half) return false;
      for (let yy = ty - 2; yy <= ty + 2; yy++) for (let xx = tx - 2; xx <= tx + 2; xx++) {
        const i = yy * MAP_W + xx;
        if (w.obj[i] || LIQUID.has(w.ground[i])) return false;
      }
      return true;
    };
    for (let t = 0; t < ENTRY_SHIFT.tries && list.length < ENTRY_SHIFT.count; t++) {
      const h = entryHash(k * 7919 + 13, t);
      const tx = rx + (h % rw);
      const ty = ry + ((h >>> 12) % rh);
      if (!okTile(tx, ty)) continue;
      const c = { x: tx + 0.5, y: ty + 0.6 };
      if (taken.some((o) => Math.hypot(o.x - c.x, o.y - c.y) < ENTRY_SHIFT.gap)) continue;
      if (list.some((o) => Math.hypot(o.x - c.x, o.y - c.y) < ENTRY_SHIFT.gap)) continue;
      list.push(c);
      taken.push(c);
    }
    spots.set(k, list);
  });
  entryShift.spots = spots;
  entryShift.world = w;
  return spots;
}

function entrySlotNow() {
  return Math.floor(Date.now() / ENTRY_SHIFT.every);
}

// Jedes Bild aufgerufen (aus updateRifts): rechnet nur, wenn ein neuer Zeitabschnitt beginnt
function updateDungeonEntrances(force) {
  const w = game.world;
  if (!w || !w.npcs || !w.dungeons) return;
  const slot = entrySlotNow();
  if (!force && entryShift.slot === slot && entryShift.world === w) return;
  const first = entryShift.slot == null || entryShift.world !== w;
  entryShift.slot = slot;
  const spots = entrySpotsAll();
  const p = game.player;
  const here = p ? mapOfTile(p.x / TILE, p.y / TILE) : null;
  for (const [k, list] of spots) {
    if (list.length < 2) continue;
    const s = list[entryHash(slot, k + 101) % list.length];
    const gate = w.npcs.find((n) => n.id === 'eingang' && n.dungeon === k);
    if (!gate) continue;
    const nx = s.x * TILE;
    const ny = s.y * TILE;
    if (Math.abs(gate.x - nx) < 1 && Math.abs(gate.y - ny) < 1) continue;
    gate.x = nx;
    gate.y = ny;
    w.dungeons[k].entrance = { x: nx, y: ny + 0.8 * TILE };
    // während des Spiels: Bescheid geben, wenn der Eingang auf der eigenen Karte liegt
    if (!first && here && mapOfTile(s.x, s.y) === here && typeof ui !== 'undefined' && ui.log) {
      ui.log(`Der Eingang der ${w.dungeons[k].def.name} hat sich verlagert – die Karte zeigt, wo er jetzt ist.`, 'info');
    }
  }
}

// Zeit bis zum nächsten Umzug (für das Fenster am Eingang)
function entryNextShiftText() {
  const ms = (entrySlotNow() + 1) * ENTRY_SHIFT.every - Date.now();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h} Std. ${m} Min.` : `${m} Min.`;
}
