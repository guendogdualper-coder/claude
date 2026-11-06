// Lv-60-Instanzen (seit 13.58). Daten: js/daten/instanzen.js (INSTANCES, Gegner, Wächter, Bosse).
// - Zwei Eingänge je Map ab Stufe 40, in den Ecken (instCornerEntrance), auf Minikarte und großer Karte.
// - Betreten nur als Gruppe aus 2–5 Spielern, alle ab Stufe 60 (empfohlen 5: 1 Tank, 1 Heiler, 3 Schaden).
// - Sperre: 60 Minuten (seit 13.92, vorher 30) je Spieler und je Instanz, ab dem Betreten (p.instLock[id] = { until, mb, done });
//   seit 13.92 auch in der Testzeit und für alle Figuren auf demselben Gerät (instDevMark).
//   Solange der Boss nicht gefallen ist, kann man in seinen Durchgang zurück (z. B. nach dem Tod); die Beute der
//   Wächter (mb) und des Bosses (done) gibt es je Sperre nur einmal. Andere Instanzen sind sofort frei.
// - Aufbau (instPlan): zwei Dungeon-Blöcke hoch, eine Schlange aus vielen Räumen von unten zur Halle oben, in jedem
//   Raum Gegner, dazwischen vier Wächter, die immer stärker werden, oben der Instanzboss. Er ist versiegelt, bis alle
//   Wächter gefallen sind. Auch der Höllenthron baut seine Räume so (mit sechs Wächtern vor Abaddor).
// - Wächter und Bosse (instBossTick, nur beim Host): Angriffe im Wechsel mit Warnzeichen am Boden – die der Endbosse
//   (Stampfer, Meteore, Linie, Tankschlag, Sprung, Sturm) und eigene je Thema (Kegel, Dornen, Hagel, Kreuz, Sog,
//   Giftlachen, Kettenblitz, Ringe, Geschossring, Brut). Bei 60 % Wutschrei mit Brut, unter 30 % Raserei. Der
//   Instanzboss hat ab der Hälfte seine Ult: der ganze Saal glüht, nur zwei bis drei Lichtkreise sind sicher.
//   Mitspieler bekommen die Angriffe wie bei den Endbosses über die Nachricht 'raid' und rechnen ihren Schaden selbst.
// - Ist eine Instanz 8 Minuten leer, beginnt sie beim nächsten Betreten von vorn (instResetCheck, Host).
// - Beute (instLoot): Instanzboss je Durchgang 2 epische Teile (Lv 60–70) in einer Fünfergruppe, sonst 1
//   (zu viert mit 30 % 2), mit 6,5 % Glück zusätzlich ein legendäres (Lv 80); dazu Verstärkungen, Switcher,
//   Seltene Verstärkung, Schmiede-Teile und Gold. Wächter: 6–12 % ein episches Teil, dazu Verstärkung und Teile.

// Testzeit (seit 13.61, fünf Tage bis einschließlich 8. 11. 2026): alle Instanzen ohne Voraussetzungen – keine
// Stufe, keine Gruppe (auch allein), keine 30-Minuten-Sperre, Beute bei jedem Sieg, und eine leere Instanz steht
// schon nach 1 Minute wieder komplett. Danach gelten automatisch wieder die normalen Regeln.
const INST_FREE_UNTIL = Date.parse('2026-11-09T00:00:00+01:00');
const instFree = () => Date.now() < INST_FREE_UNTIL;
const INST = {
  level: 60, party: [2, 5], lockMin: 60, legendary: 0.065, resetAfter: 480, respawn: 3600,
  miniEpic: [0.06, 0.08, 0.1, 0.12], htMiniEpic: 0.15, epic70: 0.35,
  stdAtk: 0.6, ultFirst: 0.5, ultEvery: 40, ultCast: 4.5, reach: 560, reachFinal: 760
};
// Schaden der eigenen Angriffe (Faktor auf den Angriff des Bosses); die der Endbosse über RAID_MUL × INST.stdAtk
const INST_MUL = { fan: 2.0, spikes: 1.9, rain: 1.7, cross: 2.1, pull: 0.8, pools: 1.2, chain: 1.6, ringout: 2.4, core: 2.4, ult: 5.5 };
const INST_KINDS = new Set(Object.keys(INST_MUL));
// Farben und Effekte je Thema
const INST_FX = {
  eis: { col: '#9fe8ff', hot: '#ffffff', spike: '#cfefff', smoke: '#dff4ff', wind: '#bfe8ff' },
  gift: { col: '#8fe36a', hot: '#e8ffb0', spike: '#4a6a2a', smoke: '#6a9a3a', wind: '#8fe36a' },
  tod: { col: '#b48cff', hot: '#f0e0ff', spike: '#e8e0cc', smoke: '#5a3a8a', wind: '#c8a8ff' },
  sturm: { col: '#9fd0ff', hot: '#ffffff', spike: '#8a8f9a', smoke: '#3a4058', wind: '#cfe8ff' },
  feuer: { col: '#ff7a2a', hot: '#ffd34d', spike: '#3a1a10', smoke: '#3a2018', wind: '#ff9a4a' }
};

// --- Instanzen finden -----------------------------------------------------------------------------------------
const instDefs = () => DUNGEONS.filter((d) => d.inst60);
const instIndex = (id) => DUNGEONS.findIndex((d) => d.id === id);
// Dungeon-Index an einem Punkt (Pixel) oder -1 außerhalb des Dungeon-Streifens
function instIndexAt(x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  return tx >= WORLD_W && ty < DUNGEON_H ? dungeonIndexAt(tx, ty) : -1;
}
// Lv-60-Instanz, in der jemand steht (oder null)
function instDefAt(e) {
  const k = e ? instIndexAt(e.x, e.y) : -1;
  return k >= 0 && DUNGEONS[k].inst60 ? DUNGEONS[k] : null;
}
const instOfMonster = (m) => (m && m.zone && m.zone.dungeon) || null;
// Stufe der Gegner und Mindeststufe einer Instanz (seit 13.85: die Lv-80-Instanzen im Kristallabgrund haben eigene)
const instMobLevel = (def) => (def && def.instLevel) || INST.level;
const instMinLevel = (def) => (def && def.minLevel) || INST.level;

// --- Grundriss (für Instanzen und Höllenthron, aus buildDungeons in welt.js) ----------------------------------
// Raster aus 4 Spalten zu 14 Kacheln unter der Halle; Weg von unten nach oben: je Reihe 2–4 Felder in eine Richtung,
// dann eine Reihe höher. Wächter liegen gleichmäßig verteilt, oft über zwei Felder. Dazu bis zu zwei Seitenräume.
function instPlan(def, rng, ox, oy, H) {
  const W = DUNGEON_COL - 4;
  const ht = !!def.instanz;
  const [hw, hh] = ht ? [44, 28] : [32, 24];
  const mk = (x, y, w, h, role, cell, shape) => ({ x: ox + x, y: oy + y, w, h, cx: ox + x + Math.floor(w / 2), cy: oy + y + Math.floor(h / 2), shape, role, cell });
  const hall = mk(Math.floor((W - hw) / 2), 1, hw, hh, 'boss', [1, -1], 'round');
  const cw = 14;
  const ch = 14;
  const cols = 4;
  const gy = hh + 5;
  const rows = Math.max(2, Math.floor((H - gy) / ch));
  // Weg: so lange würfeln, bis er lang genug ist (Instanz mindestens 24 Felder, Höllenthron 22)
  let path = [];
  for (let tries = 0; tries < 60 && path.length < (ht ? 22 : 24); tries++) {
    let col = Math.floor(rng() * cols);
    const pth = [];
    for (let r = rows - 1; r >= 0; r--) {
      const dir = col === 0 ? 1 : col === cols - 1 ? -1 : rng() < 0.5 ? 1 : -1;
      const space = dir > 0 ? cols - 1 - col : col;
      const len = 1 + Math.min(space, 1 + Math.floor(rng() * 3));
      for (let i = 0; i < len; i++) pth.push([col + dir * i, r]);
      col += dir * (len - 1);
    }
    if (pth.length > path.length) path = pth;
  }
  // Wächter: gleichmäßig auf dem Weg, mindestens zwei Felder Abstand
  const minis = def.minis || [];
  const L = path.length;
  const at = [];
  minis.forEach((_, j) => {
    let i = Math.max(2, Math.round((j + 1) * (L - 1) / (minis.length + 1)));
    if (at.length) i = Math.max(i, at[at.length - 1] + 3);
    at.push(Math.min(L - 1, i));
  });
  const used = new Set();
  const key = (c, r) => r * cols + c;
  const cellX = (c) => c * cw;
  const cellY = (r) => gy + r * ch;
  const rooms = [];
  for (let i = 0; i < L; i++) {
    const [c, r] = path[i];
    used.add(key(c, r));
    const j = at.indexOf(i);
    if (i === 0) {
      rooms.push(mk(cellX(c) + 2, cellY(r) + 2, 9, 8, 'start', [c, r], 'hall'));
      continue;
    }
    if (j >= 0) {
      // Wächterraum: über zwei Felder einer Reihe, wenn der Weg dort weiterläuft
      const nx = path[i + 1];
      const wide = nx && nx[1] === r && !at.includes(i + 1);
      const c0 = wide ? Math.min(c, nx[0]) : c;
      const room = mk(cellX(c0) + 1, cellY(r) + 1, wide ? 2 * cw - 3 : cw - 3, ch - 3, 'mini', [c0, r], wide && rng() < 0.5 ? 'hall' : 'round');
      room.mi = j;
      rooms.push(room);
      if (wide) {
        used.add(key(nx[0], r));
        i++;
      }
      continue;
    }
    const w = 9 + Math.floor(rng() * 3);
    const h = 8 + Math.floor(rng() * 3);
    const shape = DG_SHAPES[Math.floor(rng() * DG_SHAPES.length)];
    rooms.push(mk(cellX(c) + 1 + Math.floor(rng() * (12 - w)), cellY(r) + 1 + Math.floor(rng() * (12 - h)), w, h, 'mob', [c, r], shape));
  }
  // Seitenräume an freien Nachbarfeldern normaler Kampfräume (Schatzkammer, Schrein)
  const side = [];
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const order = rooms.map((r, n) => n).filter((n) => rooms[n].role === 'mob').sort(() => rng() - 0.5);
  for (const n of order) {
    if (side.length >= 2) break;
    const [c, r] = rooms[n].cell;
    const free = dirs.map(([dc, dr]) => [c + dc, r + dr]).filter(([x, y]) => x >= 0 && y >= 0 && x < cols && y < rows && !used.has(key(x, y)));
    if (!free.length) continue;
    const [sc, sr] = free[Math.floor(rng() * free.length)];
    used.add(key(sc, sr));
    const s = mk(cellX(sc) + 2, cellY(sr) + 2, 9, 9, side.length % 2 ? 'schrein' : 'schatz', [sc, sr], rng() < 0.5 ? 'round' : 'cross');
    s.from = n;
    side.push(s);
  }
  rooms.push(hall);
  const links = rooms.slice(1).map((b, n) => [rooms[n], b]).concat(side.map((s) => [rooms[s.from], s]));
  return { rooms, side, links };
}

// --- Eingang in einer Ecke der Map ------------------------------------------------------------------------------
// Von der Mitte der Map aus erreichbare Kachel möglichst nah an der Ecke (Breitensuche, einmal je Map), dort Platz
// frei räumen. corner: tl, tr, bl, br.
const _instReach = new Map();
function instCornerEntrance(entry, ground, obj, deco, zoneIdx) {
  const wm = WORLD_MAPS.find((m) => m.id === entry.map);
  const [rx, ry, rw, rh] = wm.region;
  const bottom = entry.corner[0] === 'b';
  const right = entry.corner[1] === 'r';
  const B = MAP_BORDER + 3;
  let seen = _instReach.get(wm.id);
  if (!seen) {
    seen = new Uint8Array(rw * rh);
    const open = (x, y) => {
      if (x < rx + B || y < ry + B || x >= rx + rw - B || y >= ry + rh - B) return false;
      const i = y * MAP_W + x;
      return obj[i] === OBJ.NONE && !(LIQUID.has(ground[i]) && deco[i] !== DECO.BRIDGE);
    };
    // seit 14.16: in Städten mit eigener Form (Inseln, Schlucht) vor dem Südtor auf dem Weg beginnen – draußen ist
    // dieselbe Fläche erreichbar wie früher durch die Stadt, die Eingänge bleiben, wo sie waren
    const sy = typeof townLayoutHalf === 'function' && townLayoutHalf(wm.id) != null ? wm.cy + townLayoutHalf(wm.id) + 2 : wm.cy + 2;
    const q = [[wm.cx, sy]];
    seen[(sy - ry) * rw + wm.cx - rx] = 1;
    while (q.length) {
      const [x, y] = q.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        const j = (ny - ry) * rw + nx - rx;
        if (j < 0 || j >= seen.length || seen[j] || !open(nx, ny)) continue;
        seen[j] = 1;
        q.push([nx, ny]);
      }
    }
    _instReach.set(wm.id, seen);
  }
  // Ziel: 22 Kacheln vom Rand nach innen, 16 von oben bzw. unten
  const gx = right ? rx + rw - 22 : rx + 22;
  const gyy = bottom ? ry + rh - 16 : ry + 16;
  let best = null;
  let bd = Infinity;
  for (let y = gyy - 14; y <= gyy + 14; y++) {
    for (let x = gx - 18; x <= gx + 18; x++) {
      if (x < rx + B || y < ry + B || x >= rx + rw - B || y >= ry + rh - B - 3) continue;
      if (!seen[(y - ry) * rw + x - rx]) continue;
      const d = Math.hypot(x - gx, (y - gyy) * 1.3);
      if (d < bd) { bd = d; best = { x, y }; }
    }
  }
  const e = best || { x: gx, y: gyy };
  // Platz um das Tor frei räumen (nur entfernen, nie etwas hinzufügen: der Weg dorthin bleibt frei)
  for (let y = e.y - 3; y <= e.y + 4; y++) {
    for (let x = e.x - 3; x <= e.x + 3; x++) {
      const i = y * MAP_W + x;
      obj[i] = OBJ.NONE;
      deco[i] = DECO.NONE;
      if (LIQUID.has(ground[i])) ground[i] = GROUND[ZONES[zoneIdx[i]].ground];
    }
  }
  return e;
}

// --- Bestückung -------------------------------------------------------------------------------------------------
function instFreeSpot(r, fx, fy) {
  const w = game.world;
  const t = dungeonFreeTile(r, fx, fy, w.obj, w.ground);
  return { x: (t.x + 0.5) * TILE, y: (t.y + 0.5) * TILE };
}
function instPopulate(dg, zone, groupId) {
  const def = dg.def;
  const k = DUNGEONS.indexOf(def);
  const mobs = def.mobs;
  const add = (m) => {
    m.respawnDelay = INST.respawn;
    m.instK = k;
    game.monsters.push(m);
    return m;
  };
  const pack = (r, typeId, fx, fy, n, level) => {
    const c = instFreeSpot(r, fx, fy);
    for (let j = 0; j < n; j++) {
      const pos = spotNear(c, 44);
      add(createMonster(typeId, pos.x, pos.y, { groupId, zone, level }));
    }
    groupId++;
  };
  const fights = dg.rooms.filter((r) => r.role === 'mob');
  fights.forEach((r, n) => {
    const t = n / Math.max(1, fights.length - 1);
    const lvl = instMobLevel(def) + (t > 0.55 ? 1 : 0);
    const a = mobs[n % mobs.length];
    const b = mobs[(n + 1) % mobs.length];
    if (r.w * r.h >= 90) {
      pack(r, a, 0.3, 0.5, 2 + (t > 0.5 ? 1 : 0), lvl);
      pack(r, b, 0.7, 0.5, 2, lvl);
    } else pack(r, a, 0.5, 0.5, randInt(3, 4), lvl);
  });
  for (const r of dg.side) {
    pack(r, mobs[0], 0.35, 0.5, 2, instMobLevel(def) + 1);
    pack(r, mobs[2 % mobs.length], 0.65, 0.5, 2, instMobLevel(def) + 1);
  }
  // zwei Seelensteine auf etwa einem und zwei Dritteln des Wegs
  def.stones.forEach((level, j) => {
    const r = fights[Math.min(fights.length - 1, Math.round((j + 1) * fights.length / 3))];
    if (!r) return;
    const st = createStone(zone, level, 0, 1, instFreeSpot(r, 0.5, 0.3));
    st.fixedSpot = true;
    st.stoneRespawn = [INST.respawn, INST.respawn];
    add(st);
  });
  // Wächter mit zwei Begleitern
  for (const r of dg.rooms.filter((x) => x.role === 'mini')) {
    const id = def.minis[r.mi];
    const c = instFreeSpot(r, 0.5, 0.5);
    add(createMonster(id, c.x, c.y, { zone, groupId }));
    for (let j = 0; j < 2; j++) {
      const pos = spotNear({ x: c.x + (j ? 70 : -70), y: c.y + 40 }, 30);
      add(createMonster(MONSTER_TYPES[id].boss.summon, pos.x, pos.y, { groupId, zone, level: instMobLevel(def) + 1 }));
    }
    groupId++;
  }
  const hall = dg.rooms[dg.rooms.length - 1];
  add(createMonster(def.boss, (hall.cx + 0.5) * TILE, (hall.cy + 0.5) * TILE, { zone }));
  return groupId;
}

// --- Sperre -------------------------------------------------------------------------------------------------------
// Eintrag der laufenden Sperre (oder null); create: neu anlegen, wenn keine läuft
// Seit 13.92 gilt die Sperre auch für alle Figuren auf demselben Gerät (localStorage 'seelenstein.instsperre'): wer mit
// einer Figur durch ist, kann nicht mit der nächsten Figur gleich wieder hinein. Gemerkt werden Ende, Boss und Wächter.
const INST_DEV_KEY = 'seelenstein.instsperre';
function instDevAll() {
  try { return JSON.parse(localStorage.getItem(INST_DEV_KEY) || '{}') || {}; } catch (e) { return {}; }
}
function instDevMark(id, r) {
  try {
    const all = instDevAll();
    for (const k of Object.keys(all)) if (!all[k] || all[k].until <= Date.now()) delete all[k];
    const o = all[id];
    all[id] = { until: Math.max(r.until, o ? o.until : 0), mb: (r.mb | 0) | (o ? o.mb | 0 : 0), done: r.done || (o && o.done) ? 1 : 0 };
    localStorage.setItem(INST_DEV_KEY, JSON.stringify(all));
  } catch (e) { /* ohne Speicher nur je Figur */ }
}
function instRecord(id, create) {
  const p = game.player;
  if (!p) return null;
  if (!p.instLock || typeof p.instLock !== 'object') p.instLock = {};
  let r = p.instLock[id];
  if (typeof r === 'number') r = p.instLock[id] = { until: r, mb: 0, done: 1 };
  const dev = instDevAll()[id];
  if (dev && dev.until > Date.now()) {
    // eine andere Figur auf diesem Gerät hat die Sperre schon: übernehmen (längere Zeit, Beute schon vergeben)
    if (!r || r.until <= Date.now()) r = p.instLock[id] = { until: dev.until, mb: dev.mb | 0, done: dev.done ? 1 : 0 };
    else { r.until = Math.max(r.until, dev.until); r.mb |= dev.mb | 0; if (dev.done) r.done = 1; }
  }
  if (r && r.until > Date.now()) return r;
  if (r) delete p.instLock[id];
  if (!create) return null;
  r = p.instLock[id] = { until: Date.now() + INST.lockMin * 60000, mb: 0, done: 0 };
  instDevMark(id, r);
  return r;
}
// Restzeit in Minuten (aufgerundet) oder 0
function instLockMin(id) {
  const r = instRecord(id);
  return r ? Math.max(1, Math.ceil((r.until - Date.now()) / 60000)) : 0;
}
// Text für Eingang, Gruppenfinder und Karte
function instLockText(id) {
  const r = instRecord(id);
  if (!r) return '';
  const left = instLockMin(id);
  return r.done ? `gesperrt, noch ${left} Min.` : `dein Durchgang läuft, Sperre noch ${left} Min.`;
}

// Bedingungen zum Betreten (für das Tor und den Gruppenfinder)
function instChecks(def) {
  const p = game.player;
  const party = game.party;
  const n = party ? party.members.length : 1;
  let lowName = null;
  if (party) for (const name of party.members) {
    const pm = partyMember(name);
    if (pm && pm.rp && (pm.rp.level || 0) < instMinLevel(def)) lowName = name;
  }
  const rec = instRecord(def.id);
  const left = instLockMin(def.id);
  const lockRow = { ok: !(rec && rec.done), text: rec && rec.done ? `Sperre: Du warst schon drin – wieder frei in ${left} Min.` : rec ? `Dein Durchgang läuft noch ${left} Min. – du kannst zurück` : `Keine Sperre (${INST.lockMin} Minuten ab dem Betreten)`, err: `gesperrt – für dich wieder frei in ${left} Minuten` };
  // Testzeit: ohne Stufe und Gruppe, aber seit 13.92 mit Sperre (vorher ging es beliebig oft hintereinander)
  if (instFree()) return [{ ok: true, text: 'Testzeit bis einschließlich 8. 11.: ohne Stufe, ohne Gruppe (auch allein)' }, lockRow];
  return [
    { ok: p.level >= instMinLevel(def), text: `Du bist mindestens Stufe ${instMinLevel(def)} (jetzt ${p.level})`, err: `erst ab Stufe ${instMinLevel(def)}` },
    { ok: !!party && n >= INST.party[0] && n <= INST.party[1], text: `Gruppe aus ${INST.party[0]}–${INST.party[1]} Spielern (jetzt ${party ? n : 'keine Gruppe'})`, err: party ? `nur für Gruppen aus ${INST.party[0]}–${INST.party[1]} Spielern` : 'nur als Gruppe (2–5 Spieler) betretbar' },
    { ok: !lowName, text: lowName ? `${lowName} ist noch nicht Stufe ${instMinLevel(def)}` : `Alle in der Gruppe ab Stufe ${instMinLevel(def)}`, err: `${lowName} ist noch nicht Stufe ${instMinLevel(def)}` },
    lockRow
  ];
}
// Betreten (aus enterDungeon): Fehlertext oder null; beim Erfolg beginnt die Sperre
function instTryEnter(k) {
  const def = DUNGEONS[k];
  const bad = instChecks(def).find((c) => !c.ok);
  if (bad) return `${def.name}: ${bad.err}.`;
  const fresh = !instRecord(def.id);
  instRecord(def.id, true);
  if (fresh) ui.log(`${def.name}: Deine Sperre läuft ab jetzt ${INST.lockMin} Minuten. Andere Instanzen bleiben frei.`, 'info');
  return null;
}

// --- Tor (Fenster beim Eingang) -----------------------------------------------------------------------------------
function instRenderGate(body, npc, dg) {
  const def = dg.def;
  const boss = MONSTER_TYPES[def.boss];
  const checks = instChecks(def);
  const ok = checks.every((c) => c.ok);
  const nRooms = dg.rooms.length + dg.side.length;
  const minis = def.minis.map((id) => `<b>${MONSTER_TYPES[id].name}</b>`).join(', ');
  body.innerHTML = `<p class="quest-step raid-step">Instanz · ${instFree() ? '<b>Testzeit bis 8. 11.: frei für alle, auch allein</b>' : `ab Stufe ${instMinLevel(def)} · Gruppe aus ${INST.party[0]}–${INST.party[1]} (empfohlen 5)`}</p><h3>${def.name}</h3>` +
    `<p>${def.text} ${nRooms} Räume voller Gegner, dazwischen vier Wächter, die immer stärker werden: ${minis}. Oben in der Halle wartet <b>${boss.name}</b> – versiegelt, bis alle Wächter gefallen sind.</p>` +
    '<p class="hint-text">Rote Kreise am Boden: gleich schlägt es dort ein, raus da! Grüne Kreise sind sicher. Wächter schreien bei 60 % und rufen Helfer, unter 30 % rasen sie. Ab der Hälfte seines Lebens entfesselt der Instanzboss seine Ult: Nur in den Lichtkreisen überlebt man sie.</p>' +
    '<ul class="raid-roles">' + checks.map((c) => `<li>${c.ok ? '✅' : '❌'} ${c.text}</li>`).join('') + '</ul>' +
    `<p class="inst-lock" data-instlock="${def.id}">${instLockText(def.id) ? 'Sperre: ' + instLockText(def.id) : `Für dich frei. Die Sperre (${INST.lockMin} Min.) beginnt beim Betreten und gilt nur für diese Instanz.`}</p>` +
    `<p><b class="legend-text">Beute:</b> Der Instanzboss lässt in einer Fünfergruppe 2 epische Teile fallen (${instMobLevel(def) >= 75 ? 'Lv 70–80' : 'Lv 60–70'}, in kleineren Gruppen 1), mit Glück dazu ein legendäres (Lv 80), außerdem Verstärkungen, Switcher und Schmiede-Teile. Wächter: mit etwas Glück ein episches Teil.</p>` +
    `<button type="button" class="btn btn-primary" data-dg="enter" ${ok ? '' : 'disabled'}>${ok ? 'Instanz betreten' : 'Noch nicht bereit'}</button>`;
  body.querySelector('[data-dg]').addEventListener('click', () => {
    const err = enterDungeon(npc.dungeon);
    if (err) ui.log(err, 'warn');
  });
  // Restzeit läuft sichtbar mit, solange das Fenster offen ist
  const el = body.querySelector('[data-instlock]');
  const tick = setInterval(() => {
    if (!document.body.contains(el)) { clearInterval(tick); return; }
    const t = instLockText(def.id);
    el.textContent = t ? 'Sperre: ' + t : `Für dich frei. Die Sperre (${INST.lockMin} Min.) beginnt beim Betreten und gilt nur für diese Instanz.`;
  }, 1000);
}

// --- Wächter und Bosse (Host) -----------------------------------------------------------------------------------
// Spieler nahe dem Platz des Bosses (nur in seinem Raum, nicht nebenan hinter der Wand)
function instPlayers(m) {
  const reach = m.type.inst.final ? INST.reachFinal : INST.reach;
  return raidPlayers(m).filter((pl) => Math.hypot(pl.x - m.homeX, pl.y - m.homeY) < reach);
}
// Wächter der eigenen Instanz, die noch stehen (einmal je Bild gezählt; für Host und Mitspieler gleich)
const instFrame = { t: -1, alive: new Map(), all: new Map() };
function instScan() {
  if (instFrame.t === game.time) return instFrame;
  instFrame.t = game.time;
  instFrame.alive.clear();
  instFrame.all.clear();
  for (const m of game.monsters) {
    const I = m.type && m.type.inst;
    if (!I || I.final || I.ht) continue;
    const d = instOfMonster(m);
    if (!d) continue;
    instFrame.all.set(d, (instFrame.all.get(d) || 0) + 1);
    if (!m.dead) instFrame.alive.set(d, (instFrame.alive.get(d) || 0) + 1);
  }
  return instFrame;
}
// Instanzboss versiegelt, solange ein Wächter seiner Instanz steht
function instSealed(m) {
  const I = m && m.type && m.type.inst;
  if (!I || !I.final) return false;
  const d = instOfMonster(m);
  return !!d && (instScan().alive.get(d) || 0) > 0;
}

function instBossReset(m) {
  const R = m.raid;
  if (!R) return;
  R.phase = 0;
  R.step = 0;
  R.next = 3;
  R.ultAt = 0;
  R.forced = null;
  if (m.enraged) {
    m.atk = m.enraged;
    m.enraged = 0;
  }
}

function instBossTick(m, dt) {
  const I = m.type.inst;
  if (!m.raid) m.raid = { next: 3, step: 0, phase: 0 };
  const R = m.raid;
  if (I.final && instSealed(m)) {
    // versiegelt: steht in der Mitte seiner Halle, voll geheilt, greift niemanden an
    m.hp = m.maxHp;
    m.x = m.homeX;
    m.y = m.homeY;
    m.state = 'idle';
    m.target = null;
    m.moving = false;
    m.cast = null;
    return true;
  }
  if (m.state !== 'chase') {
    if (m.hp < m.maxHp && !m.cast && game.time - (m.struckAt || -99) > 8) {
      m.hp = m.maxHp;
      instBossReset(m);
    }
    return false;
  }
  if (!m.dash && !m.cast && !instPlayers(m).length) return false;
  if (m.dash) {
    const d = m.dash;
    const k = Math.min(1, (game.time - d.t0) / d.dur);
    m.x = d.x0 + (d.x1 - d.x0) * k;
    m.y = d.y0 + (d.y1 - d.y0) * k;
    m.moving = true;
    if (k >= 1) m.dash = null;
    return true;
  }
  if (m.cast) {
    m.moving = false;
    if (game.time < m.cast.at) return true;
    const c = m.cast;
    m.cast = null;
    if (c.kind === 'leap' || c.kind === 'charge') {
      const end = c.circles[c.circles.length - 1];
      m.dash = { x0: m.x, y0: m.y, x1: end.x, y1: end.y - m.r * 0.8, t0: game.time, dur: c.kind === 'leap' ? 0.3 : 0.45 };
      later(m.dash.dur, () => raidResolve(m, c.kind, c.circles, c.inner, c.atk, m.level));
      return true;
    }
    raidResolve(m, c.kind, c.circles, c.inner, c.atk, m.level);
    // nach dem Sog folgt gleich der Stampfer
    if (c.kind === 'pull') {
      R.forced = 'slam';
      R.next = 0.4;
    }
    return true;
  }
  const hpk = m.hp / m.maxHp;
  const phase = hpk < 0.3 ? 2 : hpk < 0.6 ? 1 : 0;
  if (phase > R.phase) {
    R.phase = phase;
    instRoar(m, phase);
    return true;
  }
  if (I.final && hpk < INST.ultFirst && game.time >= (R.ultAt || 0)) {
    R.ultAt = game.time + INST.ultEvery;
    instStartCast(m, 'ult');
    return true;
  }
  R.next -= dt * (1 + R.phase * 0.3);
  if (R.next > 0) return false;
  R.next = Math.max(2.6, (I.final ? 4.4 : 5) - R.phase * 0.7);
  const kind = R.forced || I.moves[R.step++ % I.moves.length];
  R.forced = null;
  if (kind === 'volley') {
    instVolley(m);
    return false;
  }
  if (kind === 'adds') {
    raidMinions(m, 3);
    ui.banner(m.name, 'ruft ihre Brut!');
    if (net.mode === 'host') netBroadcast({ t: 'roar', id: m.id, ph: 1 });
    return false;
  }
  instStartCast(m, kind);
  return true;
}

// Wutschrei (60 %: Brut, 30 %: Raserei mit mehr Angriff) – Banner und Druckwelle auch beim Mitspieler (roar)
function instRoar(m, phase) {
  const b = m.type.boss;
  raidRoarFx(m, phase);
  const n = m.type.inst.final ? 2 + phase : 2;
  for (let k = 0; k < n; k++) {
    const pos = spotNear(m, 150);
    const add = createMonster(b.summon, pos.x, pos.y, { respawn: false, zone: m.zone, level: m.level - 2 });
    add.homeX = m.homeX;
    add.homeY = m.homeY;
    add.state = 'chase';
    add.target = m.target || game.player;
    add.raidAdd = true;
    game.monsters.push(add);
    addEffect({ type: 'pillar', x: pos.x, y: pos.y + 9, dur: 0.8, color: b.color });
  }
  if (phase >= 2 && !m.enraged) {
    m.enraged = m.atk;
    m.atk = Math.round(m.atk * 1.15);
  }
  if (net.mode === 'host') netBroadcast({ t: 'roar', id: m.id, ph: phase });
}

// Geschossring (zweimal, versetzt) – Geschosse laufen über die normale Monster-Schussbahn
function instVolley(m) {
  const b = m.type.boss;
  const n = b.volley;
  const shoot = (off) => {
    if (m.dead) return;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + off;
      game.projectiles.push({
        owner: 'monster', x: m.x, y: m.y - 10, vx: Math.cos(a), vy: Math.sin(a), speed: 250, range: 480, traveled: 0,
        radius: 8, atk: Math.round(m.atk * 0.7), source: m, color: b.shot, hit: new Set(), trail: []
      });
      if (net.mode === 'host') netBroadcastProjectile(game.projectiles[game.projectiles.length - 1], m);
    }
  };
  shoot(0);
  later(0.45, () => shoot(Math.PI / n));
  m.attackAnim = 0.25;
  addEffect({ type: 'ring', x: m.x, y: feetY(m), r: 120, dur: 0.5, color: b.color, width: 8, grow: true });
}

// Warnfelder eines Angriffs: Kreise, sicherer Innenkreis, Wartezeit
function instCastSpec(m, kind) {
  const b = m.type.boss;
  const I = m.type.inst;
  const fy = (e) => feetY(e);
  const list = raidPlayers(m).filter((pl) => Math.hypot(pl.x - m.homeX, pl.y - m.homeY) < (I.final ? INST.reachFinal : INST.reach) + 150);
  const tgt = m.target && !m.target.dead ? m.target : list[0] || m;
  const home = { x: m.homeX, y: m.homeY };
  const rnd = (rad) => spotNear(home, rad);
  const circles = [];
  let inner = 0;
  let delay = 1.6;
  switch (kind) {
    case 'slam': circles.push({ x: m.x, y: fy(m), r: b.slam }); delay = 1.6; break;
    case 'meteor':
      for (const pl of list) circles.push({ x: pl.x, y: fy(pl), r: 90 });
      for (let k = 0; k < 2 + I.rank; k++) { const s = rnd(300); circles.push({ x: s.x, y: s.y + 10, r: 80 }); }
      delay = 1.9;
      break;
    case 'line': {
      const a = Math.atan2(tgt.y - m.y, tgt.x - m.x);
      for (let k = 1; k <= 6; k++) circles.push({ x: m.x + Math.cos(a) * k * 72, y: fy(m) + Math.sin(a) * k * 72, r: 66 });
      delay = 1.5;
      break;
    }
    case 'buster':
      circles.push({ x: tgt.x, y: fy(tgt), r: 70 });
      addEffect({ type: 'ultmark', follow: tgt, ox: 0, oy: 0, dur: 1.6, color: b.color });
      delay = 1.6;
      break;
    case 'leap': {
      const v = list[randInt(0, Math.max(0, list.length - 1))] || tgt;
      circles.push({ x: v.x, y: fy(v), r: 125 });
      delay = 1.4;
      break;
    }
    case 'charge': {
      const v = list[randInt(0, Math.max(0, list.length - 1))] || tgt;
      const a = Math.atan2(v.y - m.y, v.x - m.x);
      const len = Math.min(520, Math.hypot(v.x - m.x, v.y - m.y) + 140);
      for (let s = 60; s <= len; s += 60) {
        const x = m.x + Math.cos(a) * s;
        const y = fy(m) + Math.sin(a) * s;
        if (!canStand(x, y - m.r * 0.8, 10, true)) break;
        circles.push({ x, y, r: 66 });
      }
      if (!circles.length) circles.push({ x: m.x, y: fy(m), r: 90 });
      delay = 1.3;
      break;
    }
    case 'fan': {
      // Kegel zum Ziel: drei Bögen aus Kreisen
      const a = Math.atan2(tgt.y - m.y, tgt.x - m.x);
      for (const [d, n, r] of [[95, 2, 62], [175, 3, 66], [255, 4, 70]]) {
        for (let k = 0; k < n; k++) {
          const aa = a + (k - (n - 1) / 2) * 0.32;
          circles.push({ x: m.x + Math.cos(aa) * d, y: fy(m) + Math.sin(aa) * d, r });
        }
      }
      delay = 1.5;
      break;
    }
    case 'spikes':
      for (const pl of list) circles.push({ x: pl.x, y: fy(pl), r: 78 });
      for (let k = 0; k < 2; k++) { const s = rnd(220); circles.push({ x: s.x, y: s.y + 10, r: 70 }); }
      delay = 1.4;
      break;
    case 'rain':
      for (const pl of list) circles.push({ x: pl.x, y: fy(pl), r: 82 });
      for (let k = 0; k < 4 + I.rank; k++) { const s = rnd(I.final ? 420 : 300); circles.push({ x: s.x, y: s.y + 10, r: 70 }); }
      delay = 1.9;
      break;
    case 'cross': {
      // Kreuz aus vier Armen, abwechselnd gerade und schräg
      const a0 = (m.raid.step % 2) * Math.PI / 4;
      for (let arm = 0; arm < 4; arm++) {
        const a = a0 + arm * Math.PI / 2;
        for (let s = 1; s <= 5; s++) circles.push({ x: m.x + Math.cos(a) * s * 68, y: fy(m) + Math.sin(a) * s * 68, r: 54 });
      }
      delay = 1.6;
      break;
    }
    case 'pull': circles.push({ x: m.x, y: fy(m), r: 380 }); delay = 1.5; break;
    case 'pools':
      for (const pl of list) circles.push({ x: pl.x, y: fy(pl), r: 85 });
      delay = 1.4;
      break;
    case 'chain':
      for (const pl of list) circles.push({ x: pl.x, y: fy(pl), r: 115 });
      if (!circles.length) circles.push({ x: tgt.x, y: fy(tgt), r: 115 });
      delay = 1.7;
      break;
    case 'ringout': circles.push({ x: m.x, y: fy(m), r: 380 }); inner = 125; delay = 2.0; break;
    case 'core': circles.push({ x: m.x, y: fy(m), r: 240 }); delay = 1.8; break;
    case 'ult': {
      // der ganze Saal, dazu zwei bis drei sichere Lichtkreise
      circles.push({ x: home.x, y: home.y + 10, r: 700 });
      const n = list.length > 2 ? 3 : 2;
      const safe = [];
      for (let tries = 0; safe.length < n && tries < 60; tries++) {
        const s = spotNear(home, 340);
        if (Math.hypot(s.x - home.x, s.y - home.y) < 150) continue;
        if (safe.some((o) => Math.hypot(o.x - s.x, o.y - s.y) < 220)) continue;
        safe.push({ x: s.x, y: s.y + 10, r: 85 });
      }
      for (let k = safe.length; k < n; k++) safe.push({ x: home.x + (k ? -240 : 240), y: home.y + 10, r: 85 });
      circles.push(...safe);
      delay = INST.ultCast;
      break;
    }
    default: return null;
  }
  return { circles, inner, delay };
}

function instStartCast(m, kind) {
  const spec = instCastSpec(m, kind);
  if (!spec) return;
  const atk = Math.round(m.atk * (INST_KINDS.has(kind) ? 1 : INST.stdAtk));
  // zur Ult springt der Boss in die Mitte der Halle
  if (kind === 'ult') m.dash = { x0: m.x, y0: m.y, x1: m.homeX, y1: m.homeY, t0: game.time, dur: 0.5 };
  m.cast = { kind, circles: spec.circles, inner: spec.inner, at: game.time + spec.delay, atk };
  m.attackAnim = 0.25;
  raidTelegraph(m, kind, spec.circles, spec.inner, spec.delay);
  if (net.mode === 'host') netBroadcast({ t: 'raid', id: m.id, k: kind, c: spec.circles.map((c) => [Math.round(c.x), Math.round(c.y), c.r]), in: spec.inner, d: spec.delay, atk, lvl: m.level });
}

// --- Warnzeichen und Einschlag (für alle; Haken in raidTelegraph und raidResolve) ------------------------------
const instTheme = (m) => INST_FX[(m && m.type && m.type.inst && m.type.inst.fx) || 'feuer'] || INST_FX.feuer;
// Aufladen am Boss je Thema (die „Animation“ des Angriffs)
function instWindup(m, delay) {
  const fx = m.type.inst.fx;
  const T = instTheme(m);
  if (fx === 'eis' || fx === 'tod') addEffect({ type: 'orbs3', follow: m, count: 7, dur: delay, color: T.col });
  else if (fx === 'gift') addEffect({ type: 'smoke3', follow: m, count: 9, dur: delay, color: T.smoke, op: 0.6, size: 1.4 });
  else if (fx === 'sturm') addEffect({ type: 'cloud3', x: m.x, y: feetY(m), dur: delay + 0.6, color: '#232838' });
  else addEffect({ type: 'pillar', follow: m, dur: delay, color: T.col });
}
function instTelegraph(m, kind, circles, inner, delay) {
  if (!m || !m.type || !m.type.inst) return false;
  const T = instTheme(m);
  const fx = m.type.inst.fx;
  // Endboss-Angriffe: ihr Warnzeichen wie gewohnt, dazu das Aufladen im Thema
  if (!INST_KINDS.has(kind)) {
    instWindup(m, delay);
    return false;
  }
  instWindup(m, delay);
  const warn = (c, color = '#ff3a2a', inr = 0) => addEffect({ type: 'warn', x: c.x, y: c.y, r: c.r, inner: inr, dur: delay, color });
  if (kind === 'ult') {
    const [big, ...safe] = circles;
    warn(big);
    for (const c of safe) {
      addEffect({ type: 'warn', x: c.x, y: c.y, r: c.r, dur: delay, color: '#3aff6a' });
      addEffect({ type: 'pillar', x: c.x, y: c.y, dur: delay, color: '#7aff8a' });
    }
    ui.banner(m.name, `${m.type.inst.ult || 'Vernichtung'} – rein in einen Lichtkreis!`);
    shakeScreen(6);
    return true;
  }
  if (kind === 'ringout') {
    warn(circles[0], '#ff3a2a', inner);
    ui.banner(m.name, 'nur nah bei ihm ist es sicher!');
    return true;
  }
  if (kind === 'core') {
    warn(circles[0]);
    ui.banner(m.name, 'sammelt Kraft um sich – weg von ihm!');
    return true;
  }
  if (kind === 'pull') {
    warn(circles[0], T.col);
    addEffect({ type: 'tornado', follow: m, ox: 0, oy: 0, r: 110, dur: delay, color: T.wind });
    ui.banner(m.name, 'zieht alle heran – raus aus dem Kreis!');
    return true;
  }
  for (const c of circles) warn(c);
  if (kind === 'rain') {
    for (const c of circles) {
      later(Math.max(0, delay - 0.45), () => {
        if (fx === 'eis') addEffect({ type: 'meteor3', pal: 'eis', x: c.x, y: c.y, fall: 0.45, dur: 0.5, size: 1.3 });
        else if (fx === 'feuer') addEffect({ type: 'meteor3', x: c.x, y: c.y, fall: 0.45, dur: 0.5, size: 1.2 });
      });
      if (fx === 'sturm') addEffect({ type: 'cloud3', x: c.x, y: c.y, dur: delay + 0.4, color: '#2a3048' });
    }
  }
  if (kind === 'chain') for (const c of circles) addEffect({ type: 'orbs3', x: c.x, y: c.y, count: 4, dur: delay, color: T.col });
  return true;
}

// Wirkung an einer Stelle je Thema
function instBurst(T, fx, c, big) {
  const r = c.r;
  if (fx === 'eis') addEffect({ type: 'shards3', x: c.x, y: c.y, r: r * 0.9, count: big ? 12 : 8, color: T.spike, glow: true, size: big ? 1.6 : 1.2, dur: 1.1 });
  else if (fx === 'tod') {
    addEffect({ type: 'shards3', x: c.x, y: c.y, r: r * 0.85, count: 8, color: T.spike, size: 1.3, dur: 1.1 });
    addEffect({ type: 'column3', x: c.x, y: c.y, r: r * 0.5, hgt: 2, dur: 0.7, color: T.col, core: T.hot });
  } else if (fx === 'gift') {
    addEffect({ type: 'smoke3', x: c.x, y: c.y, count: 8, dur: 1.2, color: T.smoke, op: 0.7, size: 1.3 });
    addEffect({ type: 'shards3', x: c.x, y: c.y, r: r * 0.8, count: 6, color: T.spike, size: 1, dur: 1 });
  } else if (fx === 'sturm') {
    addEffect({ type: 'bolt', x: c.x, y: c.y, dur: 0.4, color: T.col });
    addEffect({ type: 'sparks3', x: c.x, y: c.y, h: 0.3, count: 12, color: T.col, speed: 3, up: 1.2, dur: 0.6 });
  } else {
    addEffect({ type: 'column3', x: c.x, y: c.y, r: r * 0.55, hgt: big ? 3 : 2.2, dur: 0.8, color: T.col, core: T.hot });
    addEffect({ type: 'sparks3', x: c.x, y: c.y, h: 0.4, count: 12, color: T.hot, speed: 2.6, up: 1.6, dur: 0.8 });
  }
  addEffect({ type: 'ring', x: c.x, y: c.y, r, dur: 0.5, color: T.col, width: 10, grow: true });
  particles(c.x, c.y - 6, { count: big ? 26 : 14, color: [T.col, T.hot, '#ffffff'], speed: [100, 280], life: [0.3, 0.7], size: [2, 4], shape: 'ember', drag: 3 });
}

const INST_HAZ = [];
function instResolve(m, kind, circles, inner, atk, lvl) {
  if (!m || !m.type || !m.type.inst || !INST_KINDS.has(kind)) return false;
  const T = instTheme(m);
  const fx = m.type.inst.fx;
  const p = game.player;
  const fyp = p ? feetY(p) : 0;
  const inC = (c) => p && Math.hypot(p.x - c.x, (fyp - c.y) * 1.2) < c.r;
  const hurt = (mul) => {
    if (!p || p.dead) return;
    damagePlayer(calcDamage(atk, mul * levelBonus(lvl, p.level), game.stats.def, 0.05, lvl).amount, m);
  };
  shakeScreen(kind === 'ult' ? 16 : 8);
  if (kind === 'ult') {
    const [big, ...safe] = circles;
    flashScreen(T.col, 0.35);
    const rnd = mulberry32((m.id * 977 + Math.floor(game.time)) | 0);
    for (let i = 0; i < 18; i++) {
      const a = rnd() * Math.PI * 2;
      const d = 80 + rnd() * 520;
      const c = { x: big.x + Math.cos(a) * d, y: big.y + Math.sin(a) * d * 0.8, r: 90 };
      if (safe.some((s) => Math.hypot(s.x - c.x, s.y - c.y) < s.r + 40)) continue;
      instBurst(T, fx, c, true);
    }
    addEffect({ type: 'ring', x: big.x, y: big.y, r: 640, dur: 0.9, color: T.col, width: 26, grow: true });
    if (!p || p.dead || !inC(big)) return true;
    if (safe.some(inC)) {
      addText(p.x, p.y - 40, 'Sicher!', 'heal');
      return true;
    }
    hurt(INST_MUL.ult);
    return true;
  }
  if (kind === 'ringout' || kind === 'core') {
    const c = circles[0];
    const n = kind === 'core' ? 8 : 12;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const d = kind === 'core' ? c.r * 0.55 : (inner + c.r) / 2;
      instBurst(T, fx, { x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d * 0.8, r: 70 }, false);
    }
    addEffect({ type: 'ring', x: c.x, y: c.y, r: c.r, dur: 0.7, color: T.col, width: 18, grow: true });
    const d = p ? Math.hypot(p.x - c.x, (fyp - c.y) * 1.2) : 1e9;
    if (d < c.r && d >= inner) hurt(INST_MUL[kind]);
    return true;
  }
  if (kind === 'pull') {
    const c = circles[0];
    addEffect({ type: 'ring', x: c.x, y: c.y, r: c.r, dur: 0.6, color: T.wind, width: 14, grow: false });
    addEffect({ type: 'tornado', x: c.x, y: c.y, r: 140, dur: 0.6, color: T.wind });
    if (p && !p.dead && inC(c)) {
      // zum Boss gerissen (mit Kollision), dann kurzer Treffer
      const dx = m.x - p.x;
      const dy = m.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      const go = Math.max(0, d - (m.r + 40));
      for (let s = 0; s < 8; s++) moveEntity(p, (dx / d) * go / 8, (dy / d) * go / 8, false);
      addEffect({ type: 'sparks3', x: p.x, y: feetY(p), h: 0.6, count: 10, color: T.wind, speed: 2, up: 1, dur: 0.5 });
      hurt(INST_MUL.pull);
    }
    return true;
  }
  if (kind === 'chain') {
    for (let i = 0; i < circles.length; i++) {
      const c = circles[i];
      addEffect({ type: 'bolt', x: c.x, y: c.y, dur: 0.4, color: T.col });
      addEffect({ type: 'ring', x: c.x, y: c.y, r: c.r, dur: 0.45, color: T.col, width: 8, grow: true });
      const n = circles[(i + 1) % circles.length];
      if (circles.length > 1) addEffect({ type: 'chain', x: c.x, y: c.y - 16, x2: n.x, y2: n.y - 16, dur: 0.45, color: T.col });
    }
    // wer in mehreren Kreisen steht, wird mehrfach getroffen – auseinander!
    const hits = circles.filter(inC).length;
    if (hits) hurt(INST_MUL.chain * hits);
    return true;
  }
  for (const c of circles) instBurst(T, fx, c, kind === 'cross' || kind === 'fan');
  if (kind === 'pools') {
    for (const c of circles) {
      INST_HAZ.push({ x: c.x, y: c.y, r: c.r * 0.9, until: game.time + 9, atk, lvl, fx, col: T.col, next: game.time + 0.6, m });
      addEffect({ type: 'ipool', x: c.x, y: c.y, r: c.r * 0.9, dur: 9, color: T.col });
    }
  }
  if (circles.some(inC)) hurt(INST_MUL[kind]);
  return true;
}

// Lachen am Boden: Schaden über Zeit für den eigenen Spieler
function instHazardTick() {
  const p = game.player;
  for (let i = INST_HAZ.length - 1; i >= 0; i--) {
    const h = INST_HAZ[i];
    if (game.time > h.until) { INST_HAZ.splice(i, 1); continue; }
    if (game.time < h.next || !p || p.dead) continue;
    h.next = game.time + 0.5;
    if (Math.hypot(p.x - h.x, (feetY(p) - h.y) * 1.2) < h.r) damagePlayer(calcDamage(h.atk, 0.22 * levelBonus(h.lvl, p.level), game.stats.def, 0, h.lvl).amount, h.m);
  }
}
EXTRA_EFFECTS.ipool = (ctx, e, k, x, y) => {
  const t = game.time - e.start;
  const a = Math.min(1, t / 0.3) * Math.min(1, (e.dur - t) / 0.8);
  ctx.save();
  ctx.globalAlpha = 0.35 * a;
  ctx.fillStyle = e.color;
  ctx.beginPath();
  ctx.ellipse(x, y, e.r, e.r / 1.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

// --- Beute (aus rewardKill, für jeden Spieler selbst) ----------------------------------------------------------
// Mitglieder der eigenen Gruppe in derselben Instanz (mindestens man selbst)
function instGroupSize(def) {
  const k = DUNGEONS.indexOf(def);
  if (!game.party) return 1;
  let n = 0;
  for (const name of game.party.members) {
    const x = partyMember(name);
    if (!x) continue;
    const pl = x.me ? game.player : x.rp;
    if (pl && instIndexAt(pl.x, pl.y) === k) n++;
  }
  return Math.max(1, Math.min(INST.party[1], n));
}
// Zahl epischer Teile beim Instanzboss: 5 Spieler 2, zu viert 1 (30 %: 2), sonst 1
const instEpicCount = (n) => (n >= 5 ? 2 : n === 4 && Math.random() < 0.3 ? 2 : 1);

function instMats(m, mats, matN) {
  const p = game.player;
  for (const [id, n] of Object.entries(mats)) {
    if (!n) continue;
    if (id === 'splinters') { giveSplinters(n); continue; }
    p.materials[id] = (p.materials[id] || 0) + n;
    ui.loot(MATERIALS.find((x) => x.id === id).name, n, materialIconUrl(id), MATERIAL_COLORS[id]);
  }
  const mat = m.type.boss && m.type.boss.mat;
  if (mat && MOB_MATS[mat] && matN) addMobMat(mat, matN, m);
}
function instEpicItem(m, slot) {
  // Lv-80-Instanzen (seit 13.85): Lv 70 oder (mit derselben Chance wie sonst Lv 70) Lv 80
  const hi = instMobLevel(instOfMonster(m)) >= 75;
  const item = rollRarityItem(Math.random() < INST.epic70 ? (hi ? 80 : 70) : hi ? 70 : 60, 3, null, slot);
  return giveRarityItem(item, m) ? item : null;
}
function instMiniLoot(m, chance) {
  const p = game.player;
  let got = 0;
  if (Math.random() < chance && instEpicItem(m, null)) got = 1;
  instMats(m, { splinters: randInt(3, 5) }, randInt(2, 3)); // seit 14.6 Splitter statt Verstärkung/Switcher
  const gold = monsterGold(m.level * 150);
  p.gold += gold;
  ui.loot('Gold', gold, lootIconUrl('gold'), '#ffd96a');
  ui.banner(`${m.name} ist gefallen!`, got ? 'Ein episches Teil!' : 'Wächter besiegt');
}
function instFinalLoot(m, def) {
  const p = game.player;
  const size = instGroupSize(def);
  const n = instEpicCount(size);
  for (let k = 0; k < n; k++) instEpicItem(m, k === 0 && Math.random() < 0.4 ? 'waffe' : null);
  const leg = Math.random() < INST.legendary ? dropLegendary(m) : null;
  instMats(m, { splinters: randInt(10, 15) }, randInt(4, 6)); // seit 14.6 Splitter statt Boni-Materialien
  const gold = monsterGold(m.level * 800);
  p.gold += gold;
  ui.loot('Gold', gold, lootIconUrl('gold'), '#ffd96a');
  ui.banner(`${def.name} bezwungen!`, `${n} epische${n > 1 ? '' : 's'} Teil${n > 1 ? 'e' : ''}${leg ? ' und ein legendäres!' : ''}`);
  flashScreen(leg ? '#ffb21a' : '#b06cff', 0.45);
  ui.log(`${def.name}: ${m.name} besiegt (Gruppe ${size}). Wieder frei in ${instLockMin(def.id)} Min.`, 'level');
}
function instLoot(m) {
  const I = m.type.inst;
  const def = instOfMonster(m);
  // neue Wächter im Höllenthron: ohne Sperre, Beute bei jedem Sieg
  if (I.ht || !def || !def.inst60) {
    instMiniLoot(m, I.ht ? INST.htMiniEpic : INST.miniEpic[I.rank] || 0.1);
    return;
  }
  const rec = instRecord(def.id, true);
  if (I.final) {
    if (rec.done) {
      ui.log(`${def.name}: ${m.name} hast du in dieser Sperre schon besiegt – Beute wieder in ${instLockMin(def.id)} Min.`, 'warn');
      return;
    }
    rec.done = 1;
    instDevMark(def.id, rec);
    instFinalLoot(m, def);
  } else {
    const bit = 1 << Math.max(0, def.minis.indexOf(m.typeId));
    if (rec.mb & bit) {
      ui.log(`${m.name}: Seine Beute hast du in dieser Sperre schon bekommen.`, 'info');
      return;
    }
    rec.mb |= bit;
    instDevMark(def.id, rec);
    instMiniLoot(m, INST.miniEpic[I.rank] || 0.1);
  }
  saveGame();
}

// --- Laufend: Anzeige, Lachen, Torschilder, Neubeginn ---------------------------------------------------------------
const instState = { el: null, at: 0, labelAt: 0, resetAt: 0, seen: new Map(), intro: new Map(), inside: null, sealed: null };
function instWatch() {
  const p = game.player;
  if (!p || !game.running) return;
  instHazardTick();
  if (game.time >= instState.resetAt) {
    instState.resetAt = game.time + 1;
    instResetCheck();
  }
  if (game.time >= instState.labelAt) {
    instState.labelAt = game.time + 2;
    instGateLabels();
  }
  const def = instDefAt(p);
  if (!instState.el) {
    const el = document.createElement('div');
    el.id = 'instTrack';
    el.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top, 0px) + 54px);transform:translateX(-50%);z-index:30;pointer-events:none;' +
      'padding:5px 12px;border-radius:10px;background:rgba(14,10,30,.72);border:1px solid rgba(176,108,255,.6);color:#eadcff;font:600 12px/1.3 system-ui,sans-serif;text-shadow:0 1px 2px #000;white-space:nowrap';
    el.hidden = true;
    document.body.appendChild(el);
    instState.el = el;
  }
  if (!def) {
    // seit 13.74 nur bei Änderung (vorher jedes Bild neu gesetzt: unnötige Neuberechnung der Seite)
    if (!instState.el.hidden) instState.el.hidden = true;
    instState.inside = null;
    return;
  }
  // Wächter und Boss stellen sich vor, wenn man ihren Raum betritt
  for (const m of game.monsters) {
    const I = m.type && m.type.inst;
    if (!I || m.dead || Math.abs(m.x - p.x) > 420 || Math.abs(m.y - p.y) > 360) continue;
    if (Math.hypot(m.x - p.x, m.y - p.y) > 400 || game.time - (instState.intro.get(m.id) || -1e9) < 300) continue;
    instState.intro.set(m.id, game.time);
    ui.banner(m.name, I.final && instSealed(m) ? 'versiegelt – besiegt erst alle Wächter' : I.title);
  }
  if (game.time < instState.at) return;
  instState.at = game.time + 0.5;
  const sc = instScan();
  const all = sc.all.get(def) || def.minis.length;
  const alive = sc.alive.get(def) || 0;
  const boss = game.monsters.find((m) => m.typeId === def.boss);
  const sealed = alive > 0;
  if (instState.inside !== def.id) {
    instState.inside = def.id;
    instState.sealed = sealed;
    ui.banner(def.name, sealed ? `Besiegt die ${all} Wächter, dann erwacht ${MONSTER_TYPES[def.boss].name}` : `${MONSTER_TYPES[def.boss].name} ist erwacht`);
  } else if (instState.sealed && !sealed && boss && !boss.dead) {
    ui.banner(`${boss.name} erwacht!`, 'Das Siegel ist gebrochen');
    shakeScreen(10);
    flashScreen(boss.type.boss.color, 0.3);
  }
  instState.sealed = sealed;
  const bb = document.getElementById('bossBar');
  const below = bb && !bb.hidden ? Math.round(bb.getBoundingClientRect().bottom + 6) + 'px' : '';
  if (instState.el.dataset.top !== below) {
    instState.el.dataset.top = below;
    instState.el.style.top = below || 'calc(env(safe-area-inset-top, 0px) + 54px)';
  }
  const lock = instLockText(def.id);
  instState.el.textContent = `${def.name} · ` + (boss && boss.dead ? `${boss.name} besiegt` : sealed ? `Wächter ${all - alive}/${all}` : `${MONSTER_TYPES[def.boss].name} ist erwacht!`) + (lock ? ` · Sperre ${instLockMin(def.id)} Min.` : '');
  instState.el.hidden = false;
}

// Namen der Tore auf Karte und über dem Tor: mit Restzeit, wenn man gesperrt ist
function instGateLabels() {
  const w = game.world;
  if (!w) return;
  for (const n of w.npcs) {
    if (n.id !== 'eingang') continue;
    const d = DUNGEONS[n.dungeon];
    if (!d || !d.inst60) continue;
    const r = instRecord(d.id);
    const name = `Instanz: ${d.name}` + (r && r.done ? ` · ${instLockMin(d.id)} Min.` : '');
    if (n.name !== name) n.name = name;
  }
}

// Host: Ist eine Instanz lange leer gewesen, beginnt sie beim nächsten Besuch von vorn (alles lebt wieder)
function instResetCheck() {
  if (net.mode === 'client') return;
  const busy = new Set();
  for (const pl of huntablePlayers()) {
    const k = instIndexAt(pl.x, pl.y);
    if (k >= 0 && DUNGEONS[k].inst60) busy.add(k);
  }
  for (const k of busy) {
    const last = instState.seen.has(k) ? instState.seen.get(k) : -1e9;
    if (game.time - last > (instFree() ? 60 : INST.resetAfter)) instReset(k);
    instState.seen.set(k, game.time);
  }
}
function instReset(k) {
  let n = 0;
  for (const m of game.monsters) {
    if (m.instK !== k) continue;
    if (!m.respawn) {
      m.dead = true;
      continue;
    }
    if (m.dead) {
      reviveMonster(m);
      n++;
    } else if (m.type && m.type.inst) {
      m.hp = m.maxHp;
      if (m.raid) instBossReset(m);
    }
  }
  return n;
}

// --- 3D: Aura der Wächter und Bosse, Siegel um den Instanzboss, Lachen ------------------------------------------------
const FX3_INST = { parts: [], fn: fx3Inst };
FX3_HOOKS.push(FX3_INST);
function fx3Inst(h) {
  const t = game.time;
  const low = n3low();
  const p = game.player;
  if (!p) return;
  for (const m of game.monsters) {
    const I = m.type && m.type.inst;
    if (!I || m.dead || Math.abs(m.x - p.x) > 1400 || Math.abs(m.y - p.y) > 1100 || !v3InView(m.x, m.y, 200)) continue;
    const T = instTheme(m);
    const x = m.x * U3;
    const z = feetY(m) * U3;
    const R = Math.max(0.7, m.r * U3 * 1.6);
    // Bodenschein und kreisende Funken im Thema, beim Aufladen heller und schneller
    const charge = m.cast ? 1 : 0;
    const g = fx3Take(h, 'plane');
    fx3Ground(g, m.x, feetY(m), R * (1.1 + 0.06 * Math.sin(t * 3)), 0.03, 'disc');
    fx3Color(g, T.col, 0.22 + 0.15 * charge);
    const n = low ? 4 : I.final ? 12 : 8;
    for (let i = 0; i < n; i++) {
      const ph = (t * (0.35 + charge * 0.5) + i / n) % 1;
      const a = i * 2.399 + t * (0.8 + charge * 2);
      const rr = R * (0.6 + 0.35 * Math.sin(i * 1.7 + t));
      const o = fx3Take(h, 'sprite');
      fx3Map(o, I.fx === 'sturm' || I.fx === 'feuer' ? 'spark' : 'disc');
      o.position.set(x + Math.cos(a) * rr, 0.15 + ph * (I.final ? 3.2 : 2.2), z + Math.sin(a) * rr);
      const s = (0.12 + 0.08 * (1 - ph)) * (I.final ? 1.4 : 1);
      o.scale.set(s, s, 1);
      fx3Color(o, i % 3 ? T.col : T.hot, 0.9 * (1 - ph));
    }
    // Siegel: halbdurchsichtige Kuppel in der Farbe des Themas, solange Wächter stehen
    if (I.final && instSealed(m)) {
      const D = Math.max(2.4, m.r * U3 * 2.4);
      for (const [k, dir, op] of [[1, 1, 0.16], [1.06, -1, 0.08]]) {
        const d = fx3Take(h, 'dome');
        d.position.set(x, 0.02, z);
        d.scale.set(D * k, D * k * 0.9, D * k);
        d.rotation.set(0, t * 0.3 * dir, 0);
        fx3Color(d, T.col, op + 0.04 * Math.sin(t * 2));
      }
      const rim = fx3Take(h, 'plane');
      fx3Ground(rim, m.x, feetY(m), D * 1.02, 0.05, 'ring', t * 0.4);
      fx3Color(rim, T.col, 0.7);
    }
  }
  // Lachen: Schein am Boden und aufsteigende Blasen
  for (const hz of INST_HAZ) {
    if (!v3InView(hz.x, hz.y, 120)) continue;
    const left = hz.until - t;
    const a = Math.min(1, left / 0.8);
    const g = fx3Take(h, 'plane');
    fx3Ground(g, hz.x, hz.y, hz.r * U3, 0.04, 'disc');
    fx3Color(g, hz.col, 0.45 * a);
    for (let i = 0; i < (low ? 3 : 6); i++) {
      const ph = (t * 0.7 + i / 6) % 1;
      const ang = i * 2.1 + hz.x;
      const o = fx3Take(h, 'sprite');
      fx3Map(o, 'disc');
      o.position.set(hz.x * U3 + Math.cos(ang) * hz.r * U3 * 0.6, 0.1 + ph * 0.9, hz.y * U3 + Math.sin(ang) * hz.r * U3 * 0.5);
      o.scale.set(0.16, 0.16, 1);
      fx3Color(o, hz.col, 0.8 * (1 - ph) * a);
    }
  }
}

// --- Gruppenfinder: acht Einträge (Kategorie inst60), Los führt direkt hinein -------------------------------------
for (const def of instDefs()) {
  const boss = MONSTER_TYPES[def.boss];
  GROUP_ACTIVITIES.push({
    id: 'inst:' + def.id, cat: 'inst60', name: def.name, minLevel: instFree() ? 1 : instMinLevel(def), size: INST.party[1], comp: { tank: 1, heiler: 1, schaden: 3 },
    dungeon: DUNGEONS.indexOf(def), sub: `Instanz · ${WORLD_MAPS.find((w) => w.id === def.entry.map).name} · Boss: ${boss.name}`,
    status: () => instLockText(def.id),
    go: instGfGo
  });
}
function instGfGo(act) {
  const k = act.dungeon;
  const def = DUNGEONS[k];
  const dg = game.world.dungeons[k];
  const p = game.player;
  if (p.riding && typeof toggleRide === 'function') toggleRide();
  const err = enterDungeon(k, true);
  if (!err) return;
  ui.log(`Gruppenfinder: ${err}`, 'warn');
  const rec = instRecord(def.id);
  if (rec && rec.done) return;
  // sonst (z. B. Gruppe noch nicht vollständig): zum Eingang
  moveThrough(dg.entrance, def.portal);
  ui.banner(def.name, 'Eingang erreicht – sprecht mit dem Tor (F)');
}

// --- Aussehen, Speichern ---------------------------------------------------------------------------------------------
(function instSetup() {
  if (typeof SAVE_FIELDS !== 'undefined' && !SAVE_FIELDS.includes('instLock')) SAVE_FIELDS.push('instLock');
  const theme3 = { eis: 'frost', gift: 'rot', tod: 'cave', sturm: 'storm', feuer: 'fire' };
  for (const d of instDefs()) {
    if (typeof RIFT_LOOK !== 'undefined' && d.gate) RIFT_LOOK[d.id] = { ...d.gate, id: d.id };
    if (typeof MON3_ZONE_THEME !== 'undefined') MON3_ZONE_THEME[d.id] = theme3[d.theme];
    const z = ZONES.find((x) => x.dungeon === d);
    if (z) z.levels = `Instanz · ab Stufe ${instMinLevel(d)} · Gruppe`;
  }
  if (typeof MON3_ZONE_THEME !== 'undefined') MON3_ZONE_THEME.hoellenthron = 'hell';
  // Schmuck der 3D-Modelle (Stacheln, Leuchtpunkte, Schnee, Asche …) im Thema auch für Wächter und Bosse
  if (typeof monsterTheme3 === 'function' && typeof mon3ThemeOf !== 'undefined') {
    monsterTheme3('hund');
    for (const [id, t] of Object.entries(MONSTER_TYPES)) if (t.inst && mon3ThemeOf) mon3ThemeOf[id] = t.inst.ht ? 'hell' : theme3[t.inst.fx];
  }
  for (const [id, t] of Object.entries(MONSTER_TYPES)) {
    if (t.t3 && typeof MON3_LOOK !== 'undefined') MON3_LOOK[id] = { ...(MON3_LOOK[id] || {}), ...t.t3 };
    // Wächter und Bosse auch in 2D größer: die Zeichnung wird bis zum Faktor 1,8 vergrößert, den Rest macht lookScale
    if (t.inst && t.lookScale > 1 && MONSTER_ART[t.look] && !t.art2) {
      const base = MONSTER_ART[t.look];
      const s2 = Math.min(1.8, t.lookScale);
      MONSTER_ART[id] = { h: base.h * s2, draw: (ctx, f) => { ctx.scale(s2, s2); base.draw(ctx, f); } };
      t.lookScale = +(t.lookScale / s2).toFixed(3);
      t.art2 = s2;
    }
  }
})();
