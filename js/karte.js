// Karte und Wegweiser (seit 8.8).
// - Kartengrafik: jede Map (bzw. jeder Dungeon-Block) wird einmal fein gezeichnet – weicher Boden,
//   Bäume als runde Kronen, Felsen, Häuser mit Dach, Mauern – und von Minikarte und großer Karte benutzt.
// - Wegweiser: ein goldener Pfeil an der eigenen Figur zeigt zum Ziel des verfolgten Auftrags, daneben
//   stehen Name und Entfernung. Liegt das Ziel auf einer anderen Map, führt er zum Weltentor.
// - Große Karte: Taste M, auf dem Handy die kleine Karte antippen. Antippen der großen Karte setzt
//   eine eigene Markierung, zu der der Pfeil dann führt.

// --- Gebiet: die Map oder der Dungeon-Block, in dem eine Kachel liegt -----------------------------
let _areaLast = null;
function mapAreaAt(tx, ty) {
  const a = _areaLast;
  if (a && tx >= a.x && ty >= a.y && tx < a.x + a.w && ty < a.y + a.h) return a;
  const wm = mapOfTile(tx, ty);
  let area = null;
  if (wm) {
    const [x, y, w, h] = wm.region;
    area = { key: 'm' + wm.id, x, y, w, h, wm, dungeon: -1 };
  } else if (tx >= WORLD_W && ty < DUNGEON_H) {
    const col = Math.max(0, Math.floor((tx - WORLD_W) / DUNGEON_COL));
    const row = Math.max(0, Math.min(3, Math.floor(ty / DUNGEON_BLOCK)));
    area = { key: `d${col}_${row}`, x: WORLD_W + col * DUNGEON_COL, y: row * DUNGEON_BLOCK, w: DUNGEON_COL, h: row === 3 ? DUNGEON_H - 3 * DUNGEON_BLOCK : DUNGEON_BLOCK, wm: null, dungeon: dungeonIndexAt(tx, ty) };
  }
  if (area) _areaLast = area;
  return area;
}
const inArea = (area, x, y) => !!area && x >= area.x * TILE && y >= area.y * TILE && x < (area.x + area.w) * TILE && y < (area.y + area.h) * TILE;

// --- Kartengrafik ---------------------------------------------------------------------------------
const MAP_COLORS = {
  [GROUND.GRASS]: [96, 138, 62], [GROUND.MEADOW]: [110, 150, 68], [GROUND.FOREST]: [64, 94, 52],
  [GROUND.PATH]: [196, 168, 116], [GROUND.WATER]: [52, 112, 150], [GROUND.PLAZA]: [186, 174, 150],
  [GROUND.SAND]: [204, 172, 114], [GROUND.ASH]: [104, 94, 88], [GROUND.SNOW]: [232, 238, 246],
  [GROUND.SWAMP]: [78, 96, 64], [GROUND.LAVA]: [240, 104, 34], [GROUND.BOG]: [48, 78, 62], [GROUND.ICE]: [176, 214, 236],
  [GROUND.BASALT]: [66, 54, 54], [GROUND.CAVE]: [84, 70, 60], [GROUND.FLAGSTONE]: [136, 128, 114]
};
const MAP_ART = new Map();

function mapArt(area) {
  let a = MAP_ART.get(area.key);
  if (a && a.world === game.world) return a;
  // höchstens zwei Gebiete im Speicher (eine Map sind etwa 5 MB)
  if (MAP_ART.size >= 2) MAP_ART.delete(MAP_ART.keys().next().value);
  a = { world: game.world, S: area.wm ? 6 : 8, c: null };
  a.c = buildMapArt(area, a.S);
  MAP_ART.set(area.key, a);
  return a;
}

function buildMapArt(area, S) {
  const w = game.world;
  // 1. Boden: eine Kachel ein Bildpunkt, leicht gesprenkelt, dann weich vergrößert
  const lo = document.createElement('canvas');
  lo.width = area.w;
  lo.height = area.h;
  const lx = lo.getContext('2d');
  const img = lx.createImageData(area.w, area.h);
  const d = img.data;
  for (let y = 0; y < area.h; y++) {
    for (let x = 0; x < area.w; x++) {
      const i = (area.y + y) * MAP_W + area.x + x;
      let col = MAP_COLORS[w.ground[i]] || MAP_COLORS[GROUND.CAVE];
      const o = w.obj[i];
      if (o === OBJ.CAVEWALL) col = [30, 24, 20];
      else if (w.deco[i] === DECO.BRIDGE) col = [146, 110, 70];
      const n = (tileHash(area.x + x, area.y + y) % 7) - 3;
      const k = (y * area.w + x) * 4;
      d[k] = col[0] + n;
      d[k + 1] = col[1] + n;
      d[k + 2] = col[2] + n;
      d[k + 3] = 255;
    }
  }
  // weich zeichnen (3 × 3, Mitte doppelt), sonst sieht man beim Vergrößern die Kachelquadrate;
  // Dungeons bleiben scharf (klare Räume und Gänge)
  const src = area.wm ? d.slice() : null;
  const W = area.w;
  for (let y = 0; src && y < area.h; y++) {
    for (let x = 0; x < W; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let j = -1; j <= 1; j++) {
        const yy = y + j;
        if (yy < 0 || yy >= area.h) continue;
        for (let i = -1; i <= 1; i++) {
          const xx = x + i;
          if (xx < 0 || xx >= W) continue;
          const wt = (i === 0 ? 2 : 1) * (j === 0 ? 2 : 1);
          const k = (yy * W + xx) * 4;
          r += src[k] * wt;
          g += src[k + 1] * wt;
          b += src[k + 2] * wt;
          n += wt;
        }
      }
      const k = (y * W + x) * 4;
      d[k] = r / n;
      d[k + 1] = g / n;
      d[k + 2] = b / n;
    }
  }
  lx.putImageData(img, 0, 0);
  const c = document.createElement('canvas');
  c.width = area.w * S;
  c.height = area.h * S;
  const cx = c.getContext('2d');
  cx.imageSmoothingEnabled = !!area.wm;
  cx.imageSmoothingQuality = 'high';
  cx.drawImage(lo, 0, 0, c.width, c.height);
  // 2. Wellen auf dem Wasser
  cx.strokeStyle = 'rgba(200,230,255,0.35)';
  cx.lineWidth = 1;
  cx.beginPath();
  for (let y = 0; y < area.h; y++) {
    for (let x = 0; x < area.w; x++) {
      const i = (area.y + y) * MAP_W + area.x + x;
      if (w.ground[i] !== GROUND.WATER || tileHash(area.x + x, area.y + y) % 5) continue;
      const px = (x + 0.5) * S;
      const py = (y + 0.5) * S;
      cx.moveTo(px - S * 0.35, py);
      cx.quadraticCurveTo(px, py - S * 0.3, px + S * 0.35, py);
    }
  }
  cx.stroke();
  // 3. Bäume, Felsen, Mauern: erst alle Schatten, dann die Formen
  const R = S * 0.62;
  const kinds = [];
  for (let y = 0; y < area.h; y++) {
    for (let x = 0; x < area.w; x++) {
      const o = w.obj[(area.y + y) * MAP_W + area.x + x];
      if (o === OBJ.TREE || o === OBJ.PINE || o === OBJ.BLOSSOM || o === OBJ.ROCK || o === OBJ.DEADTREE) kinds.push(o, x, y);
    }
  }
  cx.fillStyle = 'rgba(10,16,8,0.32)';
  cx.beginPath();
  for (let k = 0; k < kinds.length; k += 3) {
    const r = kinds[k] === OBJ.DEADTREE ? R * 0.5 : kinds[k] === OBJ.ROCK ? R * 0.75 : R;
    const px = (kinds[k + 1] + 0.5) * S + S * 0.22;
    const py = (kinds[k + 2] + 0.5) * S + S * 0.26;
    cx.moveTo(px + r, py);
    cx.arc(px, py, r, 0, Math.PI * 2);
  }
  cx.fill();
  const LOOK = {
    [OBJ.TREE]: ['#2e5a24', '#4e8a38', 1],
    [OBJ.PINE]: ['#1f3e28', '#3a6a44', 0.9],
    [OBJ.BLOSSOM]: ['#c87898', '#f2b8cc', 1],
    [OBJ.ROCK]: ['#76726c', '#aaa69e', 0.72],
    [OBJ.DEADTREE]: ['#5a4232', '#7c5e48', 0.45]
  };
  for (let k = 0; k < kinds.length; k += 3) {
    const [base, hi, size] = LOOK[kinds[k]];
    const px = (kinds[k + 1] + 0.5) * S;
    const py = (kinds[k + 2] + 0.5) * S;
    const r = R * size;
    cx.fillStyle = 'rgba(12,16,10,0.55)';
    cx.beginPath();
    cx.arc(px, py, r + 0.8, 0, Math.PI * 2);
    cx.fill();
    cx.fillStyle = base;
    cx.beginPath();
    cx.arc(px, py, r, 0, Math.PI * 2);
    cx.fill();
    cx.fillStyle = hi;
    cx.beginPath();
    cx.arc(px - r * 0.3, py - r * 0.32, r * 0.45, 0, Math.PI * 2);
    cx.fill();
  }
  // Mauern als Steinband mit heller Oberkante
  for (let y = 0; y < area.h; y++) {
    for (let x = 0; x < area.w; x++) {
      if (w.obj[(area.y + y) * MAP_W + area.x + x] !== OBJ.WALL) continue;
      cx.fillStyle = '#3c3e48';
      cx.fillRect(x * S - 0.5, y * S - 0.5, S + 1, S + 1);
      cx.fillStyle = '#7a7e8e';
      cx.fillRect(x * S + 1, y * S + 1, S - 2, S * 0.4);
    }
  }
  // 4. Häuser mit Dach und First
  for (const h of w.houses || []) {
    if (h.x + h.w <= area.x || h.y + h.h <= area.y || h.x >= area.x + area.w || h.y >= area.y + area.h) continue;
    const hx = (h.x - area.x) * S;
    const hy = (h.y - area.y) * S;
    const hw = h.w * S;
    const hh = h.h * S;
    cx.fillStyle = 'rgba(0,0,0,0.35)';
    cx.fillRect(hx + 2, hy + 3, hw, hh);
    cx.fillStyle = h.roof || '#7c3a2c';
    cx.fillRect(hx, hy, hw, hh);
    cx.fillStyle = 'rgba(255,255,255,0.18)';
    cx.fillRect(hx, hy, hw, hh / 2);
    cx.strokeStyle = 'rgba(20,10,6,0.85)';
    cx.lineWidth = 1.5;
    cx.strokeRect(hx + 0.75, hy + 0.75, hw - 1.5, hh - 1.5);
    cx.beginPath();
    cx.moveTo(hx + 2, hy + hh / 2);
    cx.lineTo(hx + hw - 2, hy + hh / 2);
    cx.stroke();
  }
  // 5. leichter Schatten am Rand des Gebiets
  const vg = cx.createLinearGradient(0, 0, 0, c.height);
  vg.addColorStop(0, 'rgba(0,0,0,0.18)');
  vg.addColorStop(0.08, 'rgba(0,0,0,0)');
  vg.addColorStop(0.92, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.18)');
  cx.fillStyle = vg;
  cx.fillRect(0, 0, c.width, c.height);
  return c;
}

// --- Wegweiser ------------------------------------------------------------------------------------
// Einträge: was der Spieler gerade verfolgt. Ziel: wohin der Pfeil zeigt (x, y in Pixeln, Name, Text).
const guide = { t: -9, list: [], cur: null, entry: null, key: '', pick: null, pin: null };

function guideEntries() {
  const p = game.player;
  const q = questState();
  const out = [];
  if (guide.pin) out.push({ key: 'pin', kind: 'main', title: 'Markierung', pin: true });
  const main = currentMainQuest();
  if (main && q.accepted) {
    out.push(goalDone(main.goal, q.progress)
      ? { key: 'main', kind: 'main', title: main.title, role: 'aeltester', done: true }
      : { key: 'main', kind: 'main', title: main.title, monster: main.goal.type === 'kill' ? main.goal.monster : null, stone: main.goal.type === 'stone' ? main.goal.level : 0 });
  }
  const st = q.stable;
  if (st.state === 'done') out.push({ key: 'stable', kind: 'main', title: STABLE_QUEST.title, role: 'stallmeister', done: true });
  else if (st.state === 'active') out.push({ key: 'stable', kind: 'main', title: STABLE_QUEST.title, minLevel: STABLE_QUEST.minLevel });
  if (q.side) {
    for (const n of game.world.npcs) {
      if (n.id !== 'wanderer' || !q.side[n.key] || q.side[n.key].state !== 'active') continue;
      const done = sideDone(n, q.side[n.key]);
      out.push(done ? { key: 'side:' + n.key, kind: 'side', title: n.name, npc: n, done: true } : { key: 'side:' + n.key, kind: 'side', title: n.name, monster: n.side.monster });
    }
  }
  const h = q.hunt;
  if (h) out.push(h.progress >= h.count ? { key: 'hunt', kind: 'side', title: 'Jagd', role: 'jaegerin', done: true } : { key: 'hunt', kind: 'side', title: 'Jagd', monster: h.monster });
  // Nichts angenommen: zum nächsten Auftrag, den es abzuholen gibt
  if (!out.length) {
    if (main && p.level >= main.level) out.push({ key: 'offer', kind: 'main', title: main.title, role: 'aeltester', offer: true });
    else if (st.state === 'open' && p.level >= STABLE_QUEST.level) out.push({ key: 'offer', kind: 'main', title: STABLE_QUEST.title, role: 'stallmeister', offer: true });
  }
  return out;
}

// Verfolgter Eintrag: der angetippte, sonst eine fertige Abgabe, sonst der erste
function guideChoose(list) {
  return list.find((e) => e.key === guide.pick) || list.find((e) => e.pin) || list.find((e) => e.done) || list[0] || null;
}

// Nächstes Wesen (NPC oder Monster) im Gebiet, das test() erfüllt
function nearestIn(arr, area, p, test) {
  let best = null;
  let bd = Infinity;
  for (const e of arr) {
    if (!test(e) || !inArea(area, e.x, e.y)) continue;
    const dd = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
    if (dd < bd) {
      bd = dd;
      best = e;
    }
  }
  return best;
}

// Punkt im Ring eines Gebiets in Richtung des Spielers (falls gerade kein passendes Monster bekannt ist)
function zoneRingSpot(z, from, to, p) {
  const wm = WORLD_MAPS.find((m) => m.id === z.map) || WORLD_MAPS[0];
  const safe = wm.id === 1 ? SAFE_RING : (wm.camp || CAMP_HALF) + 7;
  const outer = Math.min(z.maxDist, Math.hypot(wm.region[2], wm.region[3]) / 2);
  const inner = Math.max(z.minDist + 2, safe);
  const r = inner + (Math.max(inner, outer) - inner) * (from + to) / 2;
  let a = Math.atan2(p.y / TILE - wm.cy, p.x / TILE - wm.cx);
  if (!isFinite(a)) a = 0;
  const pad = MAP_BORDER + 3;
  const x = Math.max(wm.region[0] + pad, Math.min(wm.region[0] + wm.region[2] - pad, wm.cx + Math.cos(a) * r));
  const y = Math.max(wm.region[1] + pad, Math.min(wm.region[1] + wm.region[3] - pad, wm.cy + Math.sin(a) * r));
  return { x: x * TILE, y: y * TILE };
}

// Wohin für ein Monster (oder einen Seelenstein einer Stufe)? Erst das nächste bekannte im Gebiet,
// dann der Ring des Gebiets auf dieser Map, dann der Dungeon-Eingang, sonst eine andere Map.
function huntTarget(e, p, area) {
  const isStone = e.stone > 0;
  const fit = isStone ? (m) => m.isStone && m.level === e.stone : e.minLevel ? (m) => !m.isStone && !m.dead && m.level >= e.minLevel : (m) => !m.isStone && m.typeId === e.monster;
  const alive = nearestIn(game.monsters, area, p, (m) => !m.dead && fit(m));
  const name = isStone ? `${stoneType(e.stone).name}` : e.minLevel ? `Monster ab Stufe ${e.minLevel}` : MONSTER_TYPES[e.monster].name;
  if (alive) return { x: alive.x, y: alive.y, name, follow: alive };
  if (e.minLevel) return null;
  const zones = isStone
    ? ZONES.filter((z) => (z.stones && z.stones.some((s) => s[0] === e.stone)) || (z.dungeon && z.dungeon.stones.includes(e.stone)))
    : monsterPlaces(e.monster);
  // Dungeon, in dem man gerade steht
  if (area.dungeon >= 0 && zones.some((z) => z.dungeon === DUNGEONS[area.dungeon])) {
    const home = nearestIn(game.monsters, area, p, (m) => fit(m));
    return home ? { x: home.homeX || home.x, y: home.homeY || home.y, name } : null;
  }
  const mapId = area.wm && area.wm.id;
  const open = zones.find((z) => !z.dungeon && z.map === mapId);
  if (open) {
    const g = isStone ? open.stones.find((s) => s[0] === e.stone) : open.groups.find((x) => x[0] === e.monster);
    const s = g ? zoneRingSpot(open, g[2], g[3], p) : zoneRingSpot(open, 0, 1, p);
    return { x: s.x, y: s.y, name: `${name} · ${open.name}` };
  }
  const dz = zones.find((z) => z.dungeon && (z.dungeon.entry ? z.dungeon.entry.map || 1 : 1) === mapId);
  if (dz) {
    const k = DUNGEONS.indexOf(dz.dungeon);
    const gate = nearestIn(game.world.npcs, area, p, (n) => n.id === 'eingang' && n.dungeon === k);
    if (gate) return { x: gate.x, y: gate.y, name: `${dz.dungeon.name} (Dungeon)` };
  }
  return { away: zones.length ? zoneMapName(zones[0]) : '' };
}

// Ausgang (im Dungeon) oder Weltentor (auf einer Map), wenn das Ziel woanders liegt
function routeOut(area, p, toName) {
  if (area.dungeon >= 0) {
    const ex = nearestIn(game.world.npcs, area, p, (n) => n.id === 'ausgang');
    return ex ? { x: ex.x, y: ex.y, name: 'Ausgang', sub: toName ? `danach weiter nach ${toName}` : '' } : null;
  }
  const gate = nearestIn(game.world.npcs, area, p, (n) => n.id === 'weltentor' && !n.to) || nearestIn(game.world.npcs, area, p, (n) => n.id === 'weltentor');
  return gate ? { x: gate.x, y: gate.y, name: 'Weltentor', sub: toName ? `Reise nach ${toName}` : '' } : null;
}

function guideTarget(e, p) {
  const area = mapAreaAt(p.x / TILE, p.y / TILE);
  if (!area) return null;
  if (e.pin) return inArea(area, guide.pin.x, guide.pin.y) ? { x: guide.pin.x, y: guide.pin.y, name: 'Markierung' } : null;
  if (e.npc) {
    if (inArea(area, e.npc.x, e.npc.y)) return { x: e.npc.x, y: e.npc.y, name: e.npc.name };
    const wm = mapOfTile(e.npc.x / TILE, e.npc.y / TILE);
    return routeOut(area, p, wm && wm.name);
  }
  if (e.role) {
    const n = nearestIn(game.world.npcs, area, p, (x) => x.id === e.role);
    return n ? { x: n.x, y: n.y, name: n.name } : routeOut(area, p, '');
  }
  const t = huntTarget(e, p, area);
  if (!t) return null;
  if (t.away !== undefined) return routeOut(area, p, t.away);
  return t;
}

// alle 0,4 Sekunden: Ziel neu bestimmen
function updateGuide() {
  const p = game.player;
  if (!p || !game.running || !game.world) {
    guide.cur = null;
    return;
  }
  if (game.time - guide.t < 0.4 && game.time >= guide.t) {
    // ein verfolgtes Monster bewegt sich: Ziel mitziehen
    const c = guide.cur;
    if (c && c.follow && !c.follow.dead) {
      c.x = c.follow.x;
      c.y = c.follow.y;
    }
    return;
  }
  guide.t = game.time;
  if (guide.pin && Math.hypot(guide.pin.x - p.x, guide.pin.y - p.y) < TILE * 2) {
    guide.pin = null;
    ui.log('Markierung erreicht.', 'info');
  }
  guide.list = guideEntries();
  guide.entry = guideChoose(guide.list);
  guide.cur = guide.entry ? guideTarget(guide.entry, p) : null;
  if (guide.cur) guide.cur.dist = Math.hypot(guide.cur.x - p.x, guide.cur.y - p.y);
  // ein anderer Auftrag wird verfolgt (z. B. einer ist erfüllt): Auftragsliste neu zeichnen
  const key = guide.entry ? guide.entry.key : '';
  if (key !== guide.key) {
    guide.key = key;
    ui.renderQuestTrack();
    return;
  }
  const el = document.getElementById('qlNav');
  if (el) el.textContent = guideText();
}

// „➜ Älteste Bao · 42 m“
function guideText() {
  const c = guide.cur;
  if (!c) return '';
  const m = Math.max(1, Math.round(c.dist / TILE));
  return `➜ ${c.name} · ${m} m${c.sub ? ` · ${c.sub}` : ''}`;
}

const _gA = {};
const _gB = {};
function guideScreen(wx, wy, out) {
  if (V3.on) return v3Project(wx, wy, 0, out);
  out.x = (wx - renderer.camX) * renderer.zoom;
  out.y = (wy - renderer.camY) * renderer.zoom;
  out.z = 0;
  return out;
}

// Goldener Pfeil neben der eigenen Figur, dazu Name und Entfernung des Ziels; ist das Ziel im Bild,
// schwebt über ihm ein goldener Pfeil nach unten
function drawGuide(ctx) {
  const p = game.player;
  const c = guide.cur;
  if (!c || !p || p.dead || !game.running || game.duel) return;
  const r = renderer;
  const dx = c.x - p.x;
  const dy = c.y - p.y;
  const dist = Math.hypot(dx, dy);
  ctx.save();
  ctx.setTransform(r.dpr, 0, 0, r.dpr, 0, 0);
  const s = Math.max(0.75, Math.min(1.3, Math.min(r.w, r.h) / 420));
  const gold = c.sub ? '#9fd8ff' : guide.entry && guide.entry.kind === 'side' && !guide.entry.done ? '#8ef08e' : '#ffd34d';
  // Ziel im Bild: Pfeil über dem Ziel
  const tz = guideScreen(c.x, c.y, _gB);
  const onScreen = tz.z < 1 && tz.x > 20 && tz.x < r.w - 20 && tz.y > 30 && tz.y < r.h - 10;
  if (onScreen && dist > TILE * 1.2) {
    let h = _gB;
    if (V3.on) h = v3Project(c.x, c.y, c.follow ? v3HeadHeight(c.follow) + 0.5 : 2.6, _gB);
    else _gB.y -= 60 * r.zoom;
    const bob = Math.sin(game.time * 5) * 4 * s;
    drawGuideChevron(ctx, h.x, h.y - 10 * s + bob, Math.PI / 2, 13 * s, gold);
  }
  if (dist < TILE * 2.5) {
    ctx.restore();
    return;
  }
  const fy = feetY(p);
  guideScreen(p.x, fy, _gA);
  guideScreen(p.x + (dx / dist) * 48, fy + (dy / dist) * 48, _gB);
  const ang = Math.atan2(_gB.y - _gA.y, _gB.x - _gA.x);
  const R = 72 * s;
  const ax = _gA.x + Math.cos(ang) * R;
  // nach oben weiter weg, damit der Pfeil nicht auf Figur und Namen liegt
  const ry = Math.sin(ang) < 0 ? 1.35 : 0.75;
  const ay = _gA.y - 6 * s + Math.sin(ang) * R * ry;
  const pulse = 1 + 0.08 * Math.sin(game.time * 6);
  // zwei kleine Vorläufer laufen in Pfeilrichtung, damit man die Richtung auch aus dem Augenwinkel sieht
  const run = (game.time * 1.4) % 1;
  for (let k = 0; k < 2; k++) {
    const f = (run + k * 0.5) % 1;
    const rr = R * (0.55 + f * 0.35);
    ctx.globalAlpha = Math.sin(f * Math.PI) * 0.7;
    drawGuideChevron(ctx, _gA.x + Math.cos(ang) * rr, _gA.y - 6 * s + Math.sin(ang) * rr * ry, ang, 8 * s, gold);
  }
  ctx.globalAlpha = 1;
  drawGuideChevron(ctx, ax, ay, ang, 19 * s * pulse, gold);
  // Name und Entfernung in kleiner Schrift neben dem Pfeil
  const txt = `${c.name} · ${Math.max(1, Math.round(dist / TILE))} m`;
  ctx.font = `700 ${Math.round(11 * s)}px "Alegreya Sans", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lx = ax + Math.cos(ang) * 22 * s;
  const ly = ay + Math.sin(ang) * 18 * s + (Math.sin(ang) > -0.3 ? 16 : -16) * s;
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(20,12,4,0.9)';
  ctx.strokeText(txt, lx, ly);
  ctx.fillStyle = '#fff0c4';
  ctx.fillText(txt, lx, ly);
  ctx.restore();
}

function drawGuideChevron(ctx, x, y, ang, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, 0, 0, size * 1.9, color, 0.5);
  ctx.globalCompositeOperation = 'source-over';
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size * 0.7, -size * 0.75);
  ctx.lineTo(-size * 0.25, 0);
  ctx.lineTo(-size * 0.7, size * 0.75);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -size, 0, size);
  g.addColorStop(0, '#fffbe0');
  g.addColorStop(0.45, color);
  g.addColorStop(1, '#a8720c');
  ctx.fillStyle = g;
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(40,24,4,0.95)';
  ctx.stroke();
  ctx.fill();
  ctx.restore();
}

// --- Zeichen auf der Karte (Minikarte und große Karte) -------------------------------------------
// v: { ox, oy } linke obere Kachel, sc Bildpunkte je Kachel, w/h Größe, big (große Karte), round (Minikarte), u Größe der Zeichen
function questGlyph(ctx, x, y, ch, color, u) {
  ctx.font = `900 ${Math.round(11 * u)}px "Alegreya Sans", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 2.6 * u;
  ctx.strokeStyle = '#1a1208';
  ctx.strokeText(ch, x, y);
  ctx.fillStyle = color;
  ctx.fillText(ch, x, y);
}

function questMarkChar(n) {
  const mark = questMarker(n.id, n);
  if (!mark) return null;
  const q = questState();
  let done = false;
  if (n.id === 'aeltester') done = q.accepted;
  else if (n.id === 'stallmeister') done = q.stable.state === 'done';
  else if (n.id === 'jaegerin') done = !!q.hunt;
  else if (n.id === 'wanderer') done = sideState(n.key).state === 'active';
  return { ch: done ? '?' : '!', color: mark === 'main' ? '#ffd34d' : '#6ae86a' };
}

function drawMapMarks(ctx, v, area) {
  const p = game.player;
  const u = v.u;
  const X = (wx) => (wx / TILE - v.ox) * v.sc;
  const Y = (wy) => (wy / TILE - v.oy) * v.sc;
  const inside = (x, y, pad) => x > -pad && y > -pad && x < v.w + pad && y < v.h + pad;
  // Monster: rote Punkte, Bosse größer und orange
  // seit 10.8: erst grob nach Weltlage aussortieren, dann alle Punkte einer Farbe in einem Pfad (statt je Monster
  // einzeln füllen und umranden) – bei über 5.000 Monstern in der Welt um ein Vielfaches schneller
  const wx0 = v.ox * TILE;
  const wy0 = v.oy * TILE;
  const wx1 = wx0 + (v.w / v.sc) * TILE;
  const wy1 = wy0 + (v.h / v.sc) * TILE;
  const seen = [];
  const stones = [];
  const bosses = [];
  for (const m of game.monsters) {
    if (m.dead || m.duelProxy || m.x < wx0 || m.y < wy0 || m.x > wx1 || m.y > wy1) continue;
    if (m.isStone) stones.push(m);
    else if (m.type && m.type.boss) bosses.push(m);
    else seen.push(m);
  }
  const dots = (list, r, fill) => {
    if (!list.length) return;
    ctx.beginPath();
    for (const m of list) {
      const x = X(m.x);
      const y = Y(m.y);
      if (!inside(x, y, 0)) continue;
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.stroke();
  };
  ctx.lineWidth = 0.8 * u;
  ctx.strokeStyle = 'rgba(30,6,4,0.9)';
  dots(seen, (v.big ? 1.9 : 1.6) * u, '#e8402e');
  dots(bosses, 3.4 * u, '#ff9a2a');
  // Seelensteine: Quadrat in ihrer Farbe
  for (const m of stones) {
    const x = X(m.x);
    const y = Y(m.y);
    if (!inside(x, y, 0)) continue;
    const s = 2.8 * u;
    ctx.fillStyle = m.stoneType.look.glow;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1 * u;
    ctx.fillRect(x - s, y - s, s * 2, s * 2);
    ctx.strokeRect(x - s, y - s, s * 2, s * 2);
  }
  // Bewohner, Tore, Risse, Auftraggeber
  const labels = v.big ? [] : null;
  for (const n of game.world.npcs) {
    if (n.silent || (n.wander && n.id !== 'wanderer')) continue;
    const x = X(n.x);
    const y = Y(n.y);
    if (!inside(x, y, 0)) continue;
    if (n.id === 'riss') {
      const r = (4 + Math.sin(game.time * 6) * 1.5) * u;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, r + 1.5 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = DUNGEONS[n.dungeon].portal;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      if (labels) labels.push([x, y + 9 * u, 'Dungeon-Riss', '#e8d0ff']);
      continue;
    }
    if (n.id === 'eingang' || n.id === 'ausgang') {
      const s = 4 * u;
      ctx.fillStyle = '#000000';
      ctx.fillRect(x - s, y - s, s * 2, s * 2);
      ctx.fillStyle = DUNGEONS[n.dungeon].portal;
      ctx.fillRect(x - s + u, y - s + u, s * 2 - 2 * u, s * 2 - 2 * u);
      if (labels) labels.push([x, y + 10 * u, n.name, '#e8d0ff']);
      continue;
    }
    if (n.id === 'weltentor') {
      ctx.strokeStyle = '#9fd8ff';
      ctx.lineWidth = 1.6 * u;
      ctx.beginPath();
      ctx.arc(x, y, 3.6 * u, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(160,220,255,0.5)';
      ctx.fill();
      if (labels) labels.push([x, y - 9 * u, 'Weltentor', '#cfeaff']);
      continue;
    }
    const mk = questMarkChar(n);
    if (mk) {
      glow(ctx, x, y, 7 * u, mk.color, 0.45);
      questGlyph(ctx, x, y, mk.ch, mk.color, u * (v.big ? 1.15 : 1));
    } else {
      ctx.fillStyle = '#f0e2b4';
      ctx.strokeStyle = '#2a1c0c';
      ctx.lineWidth = 0.8 * u;
      ctx.beginPath();
      ctx.arc(x, y, 1.6 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  // Ziel des Wegweisers: goldene Nadel; außerhalb der runden Minikarte ein Pfeil am Rand
  const c = guide.cur;
  const half = v.w / 2;
  if (c) {
    const x = X(c.x);
    const y = Y(c.y);
    const ddx = x - half;
    const ddy = y - v.h / 2;
    const d = Math.hypot(ddx, ddy);
    if (v.round && d > half - 7 * u) {
      const a = Math.atan2(ddy, ddx);
      edgeArrow(ctx, half + Math.cos(a) * (half - 7 * u), half + Math.sin(a) * (half - 7 * u), a, u, '#ffd34d');
    } else if (inside(x, y, 0)) {
      if (v.big && p) {
        // gestrichelte Linie vom Spieler zum Ziel
        ctx.save();
        ctx.setLineDash([4 * u, 4 * u]);
        ctx.strokeStyle = 'rgba(255,211,77,0.8)';
        ctx.lineWidth = 1.6 * u;
        ctx.beginPath();
        ctx.moveTo(X(p.x), Y(p.y));
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.restore();
      }
      const b = Math.sin(game.time * 5) * 1.5 * u;
      ctx.fillStyle = '#ffd34d';
      ctx.strokeStyle = '#2a1a04';
      ctx.lineWidth = 1.2 * u;
      ctx.beginPath();
      ctx.moveTo(x, y + b);
      ctx.lineTo(x - 3.6 * u, y - 7 * u + b);
      ctx.arc(x, y - 8 * u + b, 3.6 * u, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (labels) labels.push([x, y - 16 * u, c.name, '#ffe08a']);
    }
  }
  // Mitspieler: Gruppe grün, Gilde lila, andere hellblau; Gruppe außerhalb der Minikarte als Randpfeil
  const myGuild = p && p.guild && p.guild.name;
  for (const rp of net.players.values()) {
    if (rp.gone || remoteHidden(rp)) continue;
    const x = X(rp.x);
    const y = Y(rp.y);
    const mate = inMyParty(rp.name);
    const guildMate = !mate && myGuild && rp.guild === myGuild;
    const col = mate ? '#5dff6e' : guildMate ? '#d08cff' : '#9fd6ff';
    const ddx = x - half;
    const ddy = y - v.h / 2;
    const d = Math.hypot(ddx, ddy);
    if (v.round && (mate || guildMate) && d > half - 7 * u) {
      const a = Math.atan2(ddy, ddx);
      edgeArrow(ctx, half + Math.cos(a) * (half - 7 * u), half + Math.sin(a) * (half - 7 * u), a, u * (mate ? 1 : 0.8), col);
      continue;
    }
    if (v.round ? d > half : !inside(x, y, 0)) continue;
    if (mate || guildMate) {
      const pulse = (5.5 + Math.sin(game.time * 5) * 1.2) * u;
      ctx.strokeStyle = mate ? 'rgba(93,255,110,0.55)' : 'rgba(208,140,255,0.55)';
      ctx.lineWidth = 2 * u;
      ctx.beginPath();
      ctx.arc(x, y, pulse + 2 * u, 0, Math.PI * 2);
      ctx.stroke();
      if (labels) labels.push([x, y - 10 * u, rp.name, col]);
    }
    ctx.fillStyle = col;
    ctx.strokeStyle = mate || guildMate ? '#ffffff' : '#000000';
    ctx.lineWidth = (mate || guildMate ? 1.5 : 1) * u;
    ctx.beginPath();
    ctx.arc(x, y, (mate || guildMate ? 4 : 2.6) * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // eigene Figur: Pfeil in Blickrichtung mit hellem Schein
  if (p && game.running && inArea(area, p.x, p.y)) {
    const px = X(p.x);
    const py = Y(p.y);
    const glowG = ctx.createRadialGradient(px, py, 0, px, py, 9 * u);
    glowG.addColorStop(0, 'rgba(255,240,190,0.6)');
    glowG.addColorStop(1, 'rgba(255,240,190,0)');
    ctx.fillStyle = glowG;
    ctx.fillRect(px - 9 * u, py - 9 * u, 18 * u, 18 * u);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.atan2(p.facing.y, p.facing.x));
    ctx.scale(u, u);
    ctx.fillStyle = '#fff6d8';
    ctx.strokeStyle = '#1a1208';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(5.5, 0);
    ctx.lineTo(-3.5, -3.8);
    ctx.lineTo(-1.8, 0);
    ctx.lineTo(-3.5, 3.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    if (labels) labels.push([px, py + 13 * u, 'Du', '#fff6d8']);
  }
  // Namen der großen Karte zuletzt, damit nichts sie verdeckt
  if (labels) {
    ctx.font = `700 ${Math.round(10.5 * u)}px "Alegreya Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3 * u;
    ctx.strokeStyle = 'rgba(16,10,4,0.9)';
    for (const [x, y, t, col] of labels) {
      ctx.strokeText(t, x, y);
      ctx.fillStyle = col;
      ctx.fillText(t, x, y);
    }
  }
}

function edgeArrow(ctx, x, y, a, u, col) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.scale(u, u);
  ctx.fillStyle = col;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.lineTo(-4, -5);
  ctx.lineTo(-4, 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// --- Minikarte ------------------------------------------------------------------------------------
// Ausschnitt von 60 Kacheln um die Figur, gezeichnet in 120er-Einheiten (am PC und Handy feiner)
const MINIMAP_TILES = 60;

function renderMinimap() {
  updateGuide();
  const ctx = renderer.miniCtx;
  const k = renderer.mini.width / 120;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  const W = 120;
  ctx.clearRect(0, 0, W, W);
  const p = game.player;
  const cx = p && game.running ? p.x / TILE : CENTER_X;
  const cy = p && game.running ? p.y / TILE : CENTER_Y;
  const area = mapAreaAt(cx, cy);
  if (!area || !game.world) return;
  const art = mapArt(area);
  const T = MINIMAP_TILES;
  const ox = area.w <= T ? area.x + (area.w - T) / 2 : Math.max(area.x, Math.min(area.x + area.w - T, cx - T / 2));
  const oy = area.h <= T ? area.y + (area.h - T) / 2 : Math.max(area.y, Math.min(area.y + area.h - T, cy - T / 2));
  ctx.save();
  ctx.beginPath();
  ctx.arc(W / 2, W / 2, W / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#1c140c';
  ctx.fillRect(0, 0, W, W);
  ctx.imageSmoothingEnabled = true;
  const sc = W / T;
  // nur der Teil, der im Gebiet liegt (Dungeon-Blöcke sind kleiner als der Ausschnitt)
  const sx0 = Math.max(area.x, ox);
  const sy0 = Math.max(area.y, oy);
  const sx1 = Math.min(area.x + area.w, ox + T);
  const sy1 = Math.min(area.y + area.h, oy + T);
  ctx.drawImage(art.c, (sx0 - area.x) * art.S, (sy0 - area.y) * art.S, (sx1 - sx0) * art.S, (sy1 - sy0) * art.S,
    (sx0 - ox) * sc, (sy0 - oy) * sc, (sx1 - sx0) * sc, (sy1 - sy0) * sc);
  // leichter Schatten zum Rand hin, damit die Karte wie eine Linse im Messingring wirkt
  const vig = ctx.createRadialGradient(W / 2, W / 2, W * 0.3, W / 2, W / 2, W / 2);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(10,6,2,0.5)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, W);
  // auf der kleinen Handy-Karte die Zeichen größer, damit sie auffallen
  const u = Math.max(1, Math.min(2.2, 105 / (renderer.mini.clientWidth || W)));
  drawMapMarks(ctx, { ox, oy, sc, w: W, h: W, big: false, round: true, u }, area);
  ctx.restore();
}

// --- Große Karte ----------------------------------------------------------------------------------
// Seit 10.8 in zwei Ebenen: Das Gelände mit den Gebietsnamen (#bigMap) wird nur beim Öffnen, bei neuer Größe oder
// in einem anderen Gebiet gezeichnet; die Markierungen (#bigMapFx: Monster, Steine, Leute, Ziel, Mitspieler)
// jedes dritte Bild auf einer leeren Ebene darüber. Vorher wurde alles jedes sechste Bild neu gezeichnet und ruckelte.
const bigMap = { view: null, area: null, timer: 0, baseKey: '' };

function openBigMap() {
  const el = document.getElementById('panelMap');
  if (!el || !game.player) return;
  ui.toggle('panelMap');
  if (!el.hidden) {
    bigMap.timer = 0;
    bigMap.baseKey = '';
    renderBigMap();
  }
}

function bigMapOpen() {
  const el = document.getElementById('panelMap');
  return !!el && !el.hidden;
}

// jedes dritte Bild die Markierungen neu (das Gelände bleibt stehen)
function tickBigMap() {
  if (!bigMapOpen()) return;
  if (--bigMap.timer > 0) return;
  bigMap.timer = 3;
  renderBigMap();
}

function renderBigMap() {
  const p = game.player;
  const cv = document.getElementById('bigMap');
  const fx = document.getElementById('bigMapFx');
  if (!cv || !fx || !p) return;
  updateGuide();
  const area = mapAreaAt(p.x / TILE, p.y / TILE);
  if (!area) return;
  // Größe: so groß wie möglich im Fenster, Seitenverhältnis des Gebiets
  const box = cv.parentElement.parentElement.getBoundingClientRect();
  const scale = Math.max(0.5, Math.min(box.width / area.w, box.height / area.h));
  const cw = Math.floor(area.w * scale);
  const ch = Math.floor(area.h * scale);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const view = { ox: area.x, oy: area.y, sc: scale, w: cw, h: ch, big: true, round: false, u: Math.max(1, Math.min(1.6, cw / 620)) };
  // Gelände nur, wenn sich etwas geändert hat
  const key = `${area.key}|${cw}|${ch}|${dpr}`;
  if (bigMap.baseKey !== key) {
    bigMap.baseKey = key;
    for (const c of [cv, fx]) {
      c.width = Math.round(cw * dpr);
      c.height = Math.round(ch * dpr);
      c.style.width = cw + 'px';
      c.style.height = ch + 'px';
    }
    const art = mapArt(area);
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(art.c, 0, 0, cw, ch);
    drawZoneLabels(ctx, area, view);
  }
  bigMap.area = area;
  bigMap.view = view;
  const fctx = fx.getContext('2d');
  fctx.setTransform(1, 0, 0, 1, 0, 0);
  fctx.clearRect(0, 0, fx.width, fx.height);
  fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawMapMarks(fctx, view, area);
  // Kopfzeile
  const z = zoneAt(p.x, p.y);
  const title = document.getElementById('mapTitle');
  const name = area.wm ? `${area.wm.name} · ${area.wm.levels}` : `${z.name}`;
  if (title.textContent !== name) title.textContent = name;
  document.getElementById('mapClearPin').hidden = !guide.pin;
  const nav = document.getElementById('mapNav');
  const t = guide.cur ? `${guide.entry && !guide.entry.pin ? guide.entry.title + ': ' : ''}${guideText()}` : 'Kein Ziel – tippe auf die Karte, um eine Markierung zu setzen.';
  if (nav.textContent !== t) nav.textContent = t;
}

// Namen der Gebiete auf der großen Karte (Ringe um das Lager, abwechselnd links und rechts)
function drawZoneLabels(ctx, area, v) {
  if (!area.wm) return;
  const wm = area.wm;
  const zs = ZONES.filter((z) => z.map === wm.id && !z.dungeon);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let side = 1;
  for (const z of zs) {
    let x;
    let y;
    if (z.safe) {
      // Vlotho über dem Dorf, Lager und Städte darunter (über ihnen steht das Weltentor)
      x = wm.cx;
      y = wm.id === 1 ? wm.cy - VILLAGE_HALF - 2 : wm.cy + (wm.camp || CAMP_HALF) + 3;
    } else {
      const outer = Math.min(z.maxDist, wm.region[2] / 2 - MAP_BORDER - 4);
      const r = (Math.max(z.minDist, wm.id === 1 ? SAFE_RING : 0) + outer) / 2;
      x = wm.cx + side * r;
      y = wm.cy + (side > 0 ? -1 : 1) * Math.min(r * 0.35, wm.region[3] / 2 - 10);
      side = -side;
    }
    const sx = (x - v.ox) * v.sc;
    const sy = (y - v.oy) * v.sc;
    ctx.font = `700 ${Math.round((z.safe ? 13 : 14) * v.u)}px "Cinzel", "Alegreya Sans", serif`;
    ctx.lineWidth = 3.5 * v.u;
    ctx.strokeStyle = 'rgba(16,10,4,0.85)';
    ctx.strokeText(z.name, sx, sy);
    ctx.fillStyle = '#ffe6a8';
    ctx.fillText(z.name, sx, sy);
    if (z.levels && !z.safe) {
      ctx.font = `600 ${Math.round(10 * v.u)}px "Alegreya Sans", sans-serif`;
      ctx.lineWidth = 3 * v.u;
      ctx.strokeText(z.levels, sx, sy + 13 * v.u);
      ctx.fillStyle = '#e8d8b0';
      ctx.fillText(z.levels, sx, sy + 13 * v.u);
    }
  }
}

// Antippen der großen Karte: Markierung setzen (nochmal auf die Markierung: entfernen)
function bigMapTap(e) {
  const v = bigMap.view;
  const area = bigMap.area;
  if (!v || !area) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const tx = v.ox + (e.clientX - rect.left) / v.sc;
  const ty = v.oy + (e.clientY - rect.top) / v.sc;
  if (guide.pin && Math.hypot(guide.pin.x / TILE - tx, guide.pin.y / TILE - ty) < 12 / v.sc + 1.5) {
    guide.pin = null;
    if (guide.pick === 'pin') guide.pick = null;
  } else {
    guide.pin = { x: tx * TILE, y: ty * TILE };
    guide.pick = 'pin';
  }
  guide.t = -9;
  renderBigMap();
  ui.renderQuestTrack();
}

function setupBigMap() {
  const cv = document.getElementById('bigMap');
  if (cv) cv.addEventListener('click', bigMapTap);
  const clr = document.getElementById('mapClearPin');
  if (clr) clr.addEventListener('click', () => {
    guide.pin = null;
    if (guide.pick === 'pin') guide.pick = null;
    guide.t = -9;
    renderBigMap();
    ui.renderQuestTrack();
  });
  window.addEventListener('resize', () => { if (bigMapOpen()) renderBigMap(); });
}
