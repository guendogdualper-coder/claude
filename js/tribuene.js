// Zuschauerränge für den Turm der Verdammten und die Prüfungsarena (Umbau „Turm und Arena mit Zuschauern“).
// Wunsch: „Wenn man nach rechts und links schaut, ist die Halle einfach zu Ende – man sieht das kleine Viereck und danach
// gar nichts mehr. Da soll etwas sein. Bei der Arena Zuschauer, die hüpfen/jubeln, beim Turm ein Rund mit Ungeheuern.“
// - Um jede Halle ein Rund aus Rängen (Stufen), oben eine Mauer, an den Toren Torhäuser. Auf den Rängen Zuschauer:
//   im Turm Ungeheuer (Gehörnte, Kapuzenschatten, Knochenwichte mit glühenden Augen), in der Arena Bewohner in bunten
//   Kitteln. Sie wippen, hüpfen und reißen die Arme hoch – stärker, wenn eine Ebene oder Welle geschafft ist, ein
//   Hüter/Wellenmeister erscheint oder fällt (tribJubel aus turm.js und herausforderung.js). Rein örtlich, nichts geht
//   übers Netz.
// - Dahinter statt Leere: im Turm ein Glutschlund (verbrannter Grund mit Lavaadern und Felsnadeln, ringsum steigen
//   Felswände an), in der Arena ein Platz, Wiesen, Bäume und Hügel. In 3D über die Bodenkacheln des Felds (tileSample)
//   und die Mauer der Ränge; der schwarze Kasten um die Halle (BOUNDS3, drei-fx.js) ist dort aus. Der Boden bleibt
//   über −0,1 (tiefer füllt drei-kern.js jede Senke mit Wasser). In 2D in die Bodenblöcke gemalt (renderGroundChunk).
// - Leistung: In 3D ein Mesh für Ränge und Mauer, eins für Glut und Feuer, je Zuschauerform ein InstancedMesh (Wippen
//   und Jubeln im Shader, die CPU tut nichts je Zuschauer). In 2D sind Ränge und Hintergrund fest in die Bodenblöcke
//   gemalt; die Zuschauer kommen aus einem vorgezeichneten Bildbogen (ein drawImage je sichtbarem Zuschauer). Grafik
//   „Niedrig“: 40 % der Zuschauer, „Mittel“ 75 %.
// - Keine Bodenringe, Runen oder Sterne; die Glutspalten im Turmboden sind nur Schmuck (keine Falle, kein Schaden).
// Einhängepunkte: renderGroundChunk und drawGround (umgebung.js), tileSample, v3UpdateHome-Folgen und v3SyncBounds
// (drei-kern.js, drei-fx.js). Die Hallen selbst (Lage, Größe, Spielablauf) gehören turm.js und herausforderung.js.

// --- Arten -----------------------------------------------------------------------------------------------------------
// rows Reihen, d0 Abstand der ersten Reihe vom Hallenrand, rowD Tiefe einer Reihe, rise Höhe je Reihe, h0 Höhe der
// ersten Reihe, sued Absenkung im Süden (dort steht die Kamera: die Ränge verdecken weniger), wallW/wallH Mauer oben,
// seat Abstand der Zuschauer, gap halbe Breite der Torlücken, gates Richtungen der Tore, gateIn Abstand der Torhäuser
const TRIB_ART = {
  turm: {
    rows: 7, d0: 1.15, rowD: 1.0, rise: 0.55, h0: 1.75, sued: 0.45, wallW: 1.3, wallH: 2.4, seat: 0.8, fill: 0.93, gap: 3.3,
    gates: [[0, -1], [1, 0], [0, 1], [-1, 0]], gateIn: [1.05, 1.05, 2.55, 1.05], bottom: -0.5,
    stone: ['#3e3439', '#4a3e44', '#352c31'], riser: '#1e1719', wall: '#2c2327', top: '#5a4a50', glut: '#ff6a2a',
    crowd: 'ungeheuer',
    colors: ['#3a1e22', '#2c2232', '#4a2a1e', '#302a2c', '#5a2420', '#26202e', '#3e2a3a', '#1e1a1c']
  },
  arena: {
    rows: 6, d0: 1.0, rowD: 1.0, rise: 0.5, h0: 1.7, sued: 0.4, wallW: 1.2, wallH: 2.0, seat: 0.78, fill: 0.95, gap: 3.4,
    gates: [[0, 1]], gateIn: [1.0], bottom: 0,
    stone: ['#b09676', '#c0a682', '#a48a6a'], riser: '#7a6448', wall: '#8e7656', top: '#d4bc94', glut: '#ffb04a',
    crowd: 'volk',
    colors: ['#c0392b', '#2e6fb0', '#3a8a4a', '#d8a02a', '#8a4ab0', '#d86a2a', '#e8e0d0', '#2a8a8a', '#b03a6a', '#5a6a8a']
  }
};
const TRIB_DICHTE = { niedrig: 0.4, mittel: 0.75 };
const tribDichte = () => (typeof opts !== 'undefined' && TRIB_DICHTE[opts.graphics]) || 1;

// --- Form der Halle: konvexes Vieleck + Rundung (Minkowski), Kurven im Abstand d ---------------------------------------
// Kanten { nx, ny, c } (Punkt p liegt innen, wenn nx·x + ny·y ≤ c), Ecken V[i] zwischen Kante i−1 und i, Rundung rc.
function tribEdgesTurm() {
  const hw = TURM.hw;
  const hh = TURM.hh;
  const dl = Math.hypot(1 / hw, 1 / hh);
  const e = [[1, 0, hw], [1 / hw / dl, 1 / hh / dl, 1.5 / dl], [0, 1, hh], [-1 / hw / dl, 1 / hh / dl, 1.5 / dl],
    [-1, 0, hw], [-1 / hw / dl, -1 / hh / dl, 1.5 / dl], [0, -1, hh], [1 / hw / dl, -1 / hh / dl, 1.5 / dl]];
  return { edges: e, rc: 3 };
}
function tribEdgesArena() {
  const k = ARENA.corner;
  return { edges: [[1, 0, ARENA.hallW / 2], [0, 1, ARENA.hallH / 2], [-1, 0, ARENA.hallW / 2], [0, -1, ARENA.hallH / 2]], rc: k };
}
function tribShape(kind) {
  const raw = kind === 'turm' ? tribEdgesTurm() : tribEdgesArena();
  const rc = raw.rc;
  // Kanten nach innen versetzen (um die Rundung), Ecken als Schnittpunkte
  const E = raw.edges.map(([nx, ny, c]) => ({ nx, ny, c: c - rc, a: Math.atan2(ny, nx) }));
  const n = E.length;
  const V = [];
  for (let i = 0; i < n; i++) {
    const A = E[(i + n - 1) % n];
    const B = E[i];
    const det = A.nx * B.ny - A.ny * B.nx;
    V.push([(A.c * B.ny - B.c * A.ny) / det, (A.nx * B.c - B.nx * A.c) / det]);
  }
  return { kind, E, V, rc };
}
// Abstand eines Punkts (Kacheln, relativ zur Mitte) vom Rand der Halle: < 0 innen
function tribDist(P, x, y) {
  const { E, V, rc } = P;
  let inside = true;
  let mx = -Infinity;
  for (const e of E) {
    const s = e.nx * x + e.ny * y - e.c;
    if (s > 0) inside = false;
    if (s > mx) mx = s;
  }
  if (inside) return mx - rc;
  let best = Infinity;
  for (let i = 0; i < V.length; i++) {
    const [ax, ay] = V[i];
    const [bx, by] = V[(i + 1) % V.length];
    const vx = bx - ax;
    const vy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy || 1)));
    const d = Math.hypot(x - ax - vx * t, y - ay - vy * t);
    if (d < best) best = d;
  }
  return best - rc;
}
// Abtastung der Kurve: je Ecke ein Bogen, je Kante ein gerades Stück; feste Zahl von Punkten je Stück (so liegen die
// Punkte verschiedener Abstände genau hintereinander). Ergebnis je Punkt: Grundpunkt (bx, by) auf dem Vieleck, Normale
function tribSamples(P, step, dMax) {
  const { E, V, rc } = P;
  const n = E.length;
  const out = [];
  const R = rc + dMax;
  for (let i = 0; i < n; i++) {
    const a0 = E[(i + n - 1) % n].a;
    let da = E[i].a - a0;
    while (da <= 0) da += Math.PI * 2;
    const na = Math.max(2, Math.ceil((R * da) / step));
    for (let k = 0; k < na; k++) {
      const a = a0 + (da * k) / na;
      out.push({ bx: V[i][0], by: V[i][1], nx: Math.cos(a), ny: Math.sin(a) });
    }
    const [ax, ay] = V[i];
    const [bx, by] = V[(i + 1) % n];
    const L = Math.hypot(bx - ax, by - ay);
    const ne = Math.max(1, Math.ceil(L / step));
    for (let k = 0; k < ne; k++) {
      const t = k / ne;
      out.push({ bx: ax + (bx - ax) * t, by: ay + (by - ay) * t, nx: E[i].nx, ny: E[i].ny });
    }
  }
  return out;
}

// --- Aufbau einer Art (einmal, in Kacheln relativ zur Hallenmitte; alle Hallen einer Art sind gleich) ----------------
const TRIB = { kinds: {} };
function tribRand(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function tribKind(kind) {
  if (TRIB.kinds[kind]) return TRIB.kinds[kind];
  const A = TRIB_ART[kind];
  const P = tribShape(kind);
  const dW = A.d0 + A.rows * A.rowD;
  const S = tribSamples(P, 0.5, dW + A.wallW);
  const R = P.rc;
  // Torlücken: Grundpunkt vor einem Tor (Normale zeigt zum Tor, seitlich höchstens gap)
  const gateOf = (s) => {
    for (let g = 0; g < A.gates.length; g++) {
      const [gx, gy] = A.gates[g];
      if (s.nx * gx + s.ny * gy > 0.97 && Math.abs(s.bx * gy - s.by * gx) < A.gap) return g;
    }
    return -1;
  };
  // Höhe einer Reihe an einem Punkt (im Süden flacher)
  const hs = (ny) => 1 - A.sued * Math.max(0, Math.min(1, (ny - 0.25) / 0.65));
  for (const s of S) {
    s.gate = gateOf(s);
    s.hs = hs(s.ny);
  }
  const rowH = (k, s) => A.h0 + k * A.rise * s.hs;
  const top = (s) => rowH(A.rows - 1, s) + A.wallH * (0.75 + 0.25 * s.hs);
  // Zuschauer: entlang der Mitte jeder Reihe, gleichmäßig mit etwas Zufall, nicht in den Torlücken
  const rnd = tribRand(kind === 'turm' ? 9173 : 4421);
  const fans = [];
  const variants = kind === 'turm' ? 3 : 2;
  for (let k = 0; k < A.rows; k++) {
    const d = A.d0 + (k + 0.45) * A.rowD;
    let acc = rnd() * A.seat;
    for (let j = 0; j < S.length; j++) {
      const a = S[j];
      const b = S[(j + 1) % S.length];
      const ax = a.bx + a.nx * (R + d);
      const ay = a.by + a.ny * (R + d);
      const bx = b.bx + b.nx * (R + d);
      const by = b.by + b.ny * (R + d);
      const L = Math.hypot(bx - ax, by - ay);
      let t = acc;
      while (t < L) {
        const u = t / L;
        if (a.gate < 0 && b.gate < 0 && rnd() < A.fill) {
          const nx = a.nx + (b.nx - a.nx) * u;
          const ny = a.ny + (b.ny - a.ny) * u;
          const hsU = a.hs + (b.hs - a.hs) * u;
          const jit = (rnd() - 0.5) * 0.16;
          fans.push({
            x: ax + (bx - ax) * u + nx * jit, y: ay + (by - ay) * u + ny * jit, h: A.h0 + k * A.rise * hsU,
            nx, ny, v: Math.floor(rnd() * variants), c: Math.floor(rnd() * A.colors.length), seed: rnd(), keep: rnd(), row: k,
            sc: kind === 'turm' ? 0.88 + rnd() * 0.3 : (rnd() < 0.12 ? 0.72 : 0.9 + rnd() * 0.18)
          });
        }
        t += A.seat * (0.86 + rnd() * 0.28);
      }
      acc = t - L;
    }
  }
  const K = { kind, A, P, S, dW, rowH, top, fans, g3: null };
  TRIB.kinds[kind] = K;
  return K;
}

// --- Welche Halle? ------------------------------------------------------------------------------------------------------
// { kind, s, key, cx, cy, R (Feld) } der Halle, in deren Feld der Punkt (Pixel) liegt, sonst null
function tribVenueAt(px, py) {
  if (typeof turmSlotAt === 'function') {
    const s = turmSlotAt(px, py);
    if (s >= 0) return tribVenue('turm', s);
  }
  if (typeof arenaSlotAt === 'function') {
    const s = arenaSlotAt(px, py);
    if (s >= 0) return tribVenue('arena', s);
  }
  return null;
}
const TRIB_V = new Map();
function tribVenue(kind, s) {
  const key = kind + s;
  let v = TRIB_V.get(key);
  if (!v) {
    const R = kind === 'turm' ? turmSlotRect(s) : arenaSlotRect(s);
    v = { kind, s, key, cx: R.cx, cy: R.cy, R };
    TRIB_V.set(key, v);
  }
  return v;
}
// Alle Hallen (für die Bodenblöcke in 2D)
function tribVenues() {
  if (TRIB.all) return TRIB.all;
  const out = [];
  if (typeof TURM !== 'undefined') for (let s = 0; s < TURM.slots; s++) out.push(tribVenue('turm', s));
  if (typeof ARENA !== 'undefined') for (let s = 0; s < ARENA.slots; s++) out.push(tribVenue('arena', s));
  TRIB.all = out;
  return out;
}

// --- Stimmung: wie laut die Menge gerade ist ---------------------------------------------------------------------------
// tribJubel(k, dauer): k 0–1, so lange (s). Danach sinkt es auf den Grundwert (im Kampf etwas lebhafter).
const TRIBH = { k: 0.12, want: 0, until: 0, at: 0 };
function tribJubel(k, dur) {
  if (typeof game === 'undefined') return;
  const now = game.time;
  TRIBH.want = Math.max(TRIBH.until > now ? TRIBH.want : 0, Math.max(0, Math.min(1, +k || 0)));
  TRIBH.until = Math.max(TRIBH.until, now + (+dur || 3));
}
function tribKampf() {
  const t = game.turmRun;
  if (t && t.st && t.st.ph === 'f') return true;
  const a = game.arenaRun;
  return !!(a && a.phase === 'fight');
}
function tribHype() {
  const now = game.time;
  const dt = Math.max(0, Math.min(0.25, now - TRIBH.at));
  TRIBH.at = now;
  const base = tribKampf() ? 0.2 : 0.1;
  const want = TRIBH.until > now ? Math.max(base, TRIBH.want) : base;
  TRIBH.k += (want - TRIBH.k) * Math.min(1, dt * (want > TRIBH.k ? 5 : 0.7));
  return TRIBH.k;
}
// Bewegung eines Zuschauers (2D; in 3D dieselbe Rechnung im Shader): Sprunghöhe (Kacheln) und Arme (0 unten … 1 oben)
function tribMove(f, t, hype) {
  const ph = f.seed * 6.2832;
  const rate = 2.4 + ((f.seed * 7.13) % 1) * 1.8;
  const mine = Math.max(0, Math.min(1, hype * (0.55 + ((f.seed * 3.71) % 1) * 0.9)));
  const idle = ((f.seed * 11.3 + Math.floor(t * 0.25 + f.seed * 7) * 0.618) % 1) > 0.86 ? 0.45 : 0;
  const ex = Math.max(mine, idle);
  const s = Math.max(0, Math.sin(t * rate + ph));
  const up = Math.max(0, Math.min(1, ex * 1.4 - 0.25 + 0.35 * Math.sin(t * rate * 0.5 + ph * 1.7)));
  return { hop: s * s * (0.03 + 0.42 * ex), up };
}

// =====================================================================================================================
// 2D
// =====================================================================================================================
// Ränge, Mauer, Torhäuser und Hintergrund werden in die Bodenblöcke gemalt (einmal je Block), in Kacheln relativ zur
// Hallenmitte. Die Zuschauer kommen jedes Bild aus dem Bildbogen dazu.
function tribPathCurve(ctx, K, d, rev) {
  const S = K.S;
  const R = K.P.rc + d;
  const n = S.length;
  for (let k = 0; k < n; k++) {
    const s = S[rev ? n - 1 - k : k];
    const x = s.bx + s.nx * R;
    const y = s.by + s.ny * R;
    if (k) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.closePath();
}
// Band zwischen d0 und d1 entlang der Kurve, nur die Stücke außerhalb der Torlücken (Trapeze je Abschnitt)
// Fenster des Bodenblocks, der gerade gemalt wird (Mitte und halbe Größe in Kacheln relativ zur Hallenmitte): was
// weiter weg liegt, wird gar nicht erst gezeichnet (ein Block ist 8 × 8 Kacheln, die Ränge laufen ganz herum)
const TRIB2_WIN = { x: 0, y: 0, r: 1e9 };
const trib2Near = (x, y, pad = 0) => Math.abs(x - TRIB2_WIN.x) < TRIB2_WIN.r + pad && Math.abs(y - TRIB2_WIN.y) < TRIB2_WIN.r + pad;
function tribBand(ctx, K, d0, d1, color) {
  const S = K.S;
  const R = K.P.rc;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let j = 0; j < S.length; j++) {
    const a = S[j];
    const b = S[(j + 1) % S.length];
    if (a.gate >= 0 || b.gate >= 0) continue;
    if (!trib2Near(a.bx + a.nx * (R + d0), a.by + a.ny * (R + d0), d1 - d0 + 1)) continue;
    ctx.moveTo(a.bx + a.nx * (R + d0), a.by + a.ny * (R + d0));
    ctx.lineTo(b.bx + b.nx * (R + d0), b.by + b.ny * (R + d0));
    ctx.lineTo(b.bx + b.nx * (R + d1), b.by + b.ny * (R + d1));
    ctx.lineTo(a.bx + a.nx * (R + d1), a.by + a.ny * (R + d1));
    ctx.closePath();
  }
  ctx.fill();
}
// kleine Pseudo-Zufallszahl aus zwei ganzen Zahlen
const tribHash = (x, y) => (((x * 73856093) ^ (y * 19349663) ^ 0x5bd1e995) >>> 0) / 4294967296;
function tribNoise(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = tribHash(ix, iy);
  const b = tribHash(ix + 1, iy);
  const c = tribHash(ix, iy + 1);
  const d = tribHash(ix + 1, iy + 1);
  return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
}
// Lavaadern im Abgrund und Glutspalten im Turmboden: feste Linienzüge (Kacheln, relativ zur Mitte)
function tribLinien(K) {
  if (K.linien) return K.linien;
  const rnd = tribRand(K.kind === 'turm' ? 3311 : 7);
  const adern = [];
  const spalten = [];
  if (K.kind === 'turm') {
    // Adern im Abgrund: Zufallswege von der Mauer nach außen
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + rnd() * 0.2;
      let r = K.dW + K.A.wallW + 2 + rnd() * 6;
      let x = Math.cos(a) * (TURM.hw + r);
      let y = Math.sin(a) * (TURM.hh + r);
      const pts = [[x, y]];
      let dir = a + (rnd() - 0.5) * 0.8;
      for (let k = 0; k < 9; k++) {
        dir += (rnd() - 0.5) * 0.9;
        x += Math.cos(dir) * (2 + rnd() * 2.5);
        y += Math.sin(dir) * (2 + rnd() * 2.5);
        if (tribDist(K.P, x, y) < K.dW + K.A.wallW + 1.5) break;
        pts.push([x, y]);
      }
      if (pts.length > 2) adern.push({ pts, w: 0.35 + rnd() * 0.5 });
    }
    // Glutspalten im Boden: von der Wand ein Stück hinein, nicht vor den Toren, nicht in die Mitte (dort wird gekämpft,
    // die Warnflächen der Bosse sollen gut zu sehen bleiben)
    for (let i = 0; i < 16; i++) {
      const a = (i + 0.5) * (Math.PI * 2 / 16) + (rnd() - 0.5) * 0.2;
      const g = ((a % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2);
      if (g < 0.2 || g > Math.PI / 2 - 0.2) continue;
      let x = Math.cos(a) * TURM.hw * 0.95;
      let y = Math.sin(a) * TURM.hh * 0.95;
      while (tribDist(K.P, x, y) > -0.4) { x *= 0.97; y *= 0.97; }
      const pts = [[x, y]];
      let dir = Math.atan2(-y, -x) + (rnd() - 0.5) * 0.6;
      const n = 3 + Math.floor(rnd() * 4);
      for (let k = 0; k < n; k++) {
        dir += (rnd() - 0.5) * 1.1;
        x += Math.cos(dir) * (0.9 + rnd() * 1.1);
        y += Math.sin(dir) * (0.9 + rnd() * 1.1);
        if (Math.hypot(x / TURM.hw, y / TURM.hh) < 0.56) break;
        pts.push([x, y]);
        // kleine Verzweigung
        if (rnd() < 0.3) spalten.push({ pts: [[x, y], [x + Math.cos(dir + 1.2) * 0.9, y + Math.sin(dir + 1.2) * 0.9]], w: 0.06 });
      }
      if (pts.length > 1) spalten.push({ pts, w: 0.09 + rnd() * 0.05 });
    }
  }
  K.linien = { adern, spalten };
  return K.linien;
}
function tribLine(ctx, pts) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
}
// Feste Kulisse einer Halle in einen Bodenblock malen (ctx: Weltpixel des Blocks)
function trib2Bake(ctx, V, win) {
  const K = tribKind(V.kind);
  const A = K.A;
  const turm = V.kind === 'turm';
  const L = tribLinien(K);
  TRIB2_WIN.x = win.x - V.cx;
  TRIB2_WIN.y = win.y - V.cy;
  TRIB2_WIN.r = win.r;
  // Block ganz in der Halle (nur Boden): höchstens Glutspalten
  let dMax = -Infinity;
  for (const [ox, oy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) dMax = Math.max(dMax, tribDist(K.P, TRIB2_WIN.x + ox * win.r, TRIB2_WIN.y + oy * win.r));
  const nurBoden = dMax < 0.4;
  ctx.save();
  ctx.beginPath();
  ctx.rect(V.R.x * TILE, V.R.y * TILE, V.R.w * TILE, V.R.h * TILE);
  ctx.clip();
  ctx.translate(V.cx * TILE, V.cy * TILE);
  ctx.scale(TILE, TILE);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Glutspalten im Boden der Halle (nur Turm)
  if (L.spalten.length) {
    ctx.save();
    ctx.beginPath();
    tribPathCurve(ctx, K, -0.15);
    ctx.clip();
    for (const sp of L.spalten) {
      if (!sp.pts.some(([x, y]) => trib2Near(x, y, 3))) continue;
      tribLine(ctx, sp.pts);
      ctx.strokeStyle = 'rgba(16,8,6,0.8)';
      ctx.lineWidth = sp.w * 1.3;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(232,84,28,0.75)';
      ctx.lineWidth = sp.w * 0.55;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,200,120,0.7)';
      ctx.lineWidth = sp.w * 0.2;
      ctx.stroke();
    }
    ctx.restore();
  }
  if (nurBoden) {
    ctx.restore();
    return;
  }
  // alles außerhalb der Halle (die erste Reihe Wandkacheln bleibt als Brüstung sichtbar)
  ctx.beginPath();
  ctx.rect(-300, -300, 600, 600);
  tribPathCurve(ctx, K, 0.6, true);
  ctx.clip('evenodd');
  const dOut = K.dW + A.wallW;
  // Hintergrund
  if (turm) {
    ctx.fillStyle = '#140b0c';
    ctx.fillRect(-300, -300, 600, 600);
    // dunkle Felsbuckel im Abgrund
    const rnd = tribRand(77);
    for (let i = 0; i < 70; i++) {
      const a = rnd() * Math.PI * 2;
      const r = dOut + 3 + rnd() * 26;
      const x = Math.cos(a) * (TURM.hw + r);
      const y = Math.sin(a) * (TURM.hh + r);
      const c = rnd() < 0.5 ? '#21151a' : '#1a1013';
      const ex = 1 + rnd() * 2.5;
      const ey = 0.7 + rnd() * 1.6;
      const er = rnd() * 3;
      if (!trib2Near(x, y, 4)) continue;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.ellipse(x, y, ex, ey, er, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const ad of L.adern) {
      if (!ad.pts.some(([x, y]) => trib2Near(x, y, 5))) continue;
      tribLine(ctx, ad.pts);
      ctx.strokeStyle = 'rgba(120,24,8,0.55)';
      ctx.lineWidth = ad.w * 3.2;
      ctx.stroke();
      ctx.strokeStyle = '#d8501a';
      ctx.lineWidth = ad.w * 1.3;
      ctx.stroke();
      ctx.strokeStyle = '#ffd08a';
      ctx.lineWidth = ad.w * 0.45;
      ctx.stroke();
    }
    // Schein der Glut am Fuß der Mauer
    tribBand(ctx, K, dOut, dOut + 1.6, 'rgba(255,90,30,0.10)');
  } else {
    // Platz aus Steinplatten, dahinter Wiese
    ctx.fillStyle = '#5f8a3e';
    ctx.fillRect(-300, -300, 600, 600);
    const rnd = tribRand(19);
    for (let i = 0; i < 160; i++) {
      const a = rnd() * Math.PI * 2;
      const r = dOut + 7 + rnd() * 26;
      const c = rnd() < 0.5 ? '#557e36' : '#6a9646';
      const x = Math.cos(a) * (ARENA.hallW / 2 + r);
      const y = Math.sin(a) * (ARENA.hallH / 2 + r);
      const ex = 0.8 + rnd() * 2;
      const ey = 0.6 + rnd() * 1.2;
      const er = rnd() * 3;
      if (!trib2Near(x, y, 3)) continue;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.ellipse(x, y, ex, ey, er, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    tribPathCurve(ctx, K, dOut + 6.5);
    ctx.fillStyle = '#b49c78';
    ctx.fill();
    // Fugen der Platten: kurze Querstriche (keine Ringe)
    ctx.strokeStyle = 'rgba(90,70,50,0.35)';
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    for (let j = 0; j < K.S.length; j += 2) {
      const sm = K.S[j];
      for (let k = 0; k < 6; k++) {
        const r0 = K.P.rc + dOut + k + ((j >> 1) % 2) * 0.5;
        const x = sm.bx + sm.nx * r0;
        const y = sm.by + sm.ny * r0;
        if (!trib2Near(x, y, 2)) continue;
        ctx.moveTo(x, y);
        ctx.lineTo(x + sm.nx * 0.9, y + sm.ny * 0.9);
      }
    }
    ctx.stroke();
    // Bäume auf der Wiese
    for (let i = 0; i < 46; i++) {
      const a = rnd() * Math.PI * 2;
      const r = dOut + 9 + rnd() * 22;
      const x = Math.cos(a) * (ARENA.hallW / 2 + r);
      const y = Math.sin(a) * (ARENA.hallH / 2 + r);
      const s = 0.9 + rnd() * 0.8;
      if (!trib2Near(x, y, 3)) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.ellipse(x + 0.35 * s, y + 0.2, 1.1 * s, 0.55 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5a3e26';
      ctx.fillRect(x - 0.12, y - 0.9 * s, 0.24, 0.9 * s);
      for (const [ox, oy, rr, c] of [[0, -1.5, 0.9, '#3e6e30'], [-0.45, -1.2, 0.6, '#4a7e38'], [0.4, -1.3, 0.65, '#356428'], [0.1, -1.9, 0.5, '#5a9046']]) {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(x + ox * s, y + oy * s, rr * s, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // Brüstung zwischen Hallenrand und erster Reihe
  tribBand(ctx, K, 0.6, A.d0, A.stone[2]);
  tribBand(ctx, K, A.d0 - 0.12, A.d0, A.riser);
  // Reihen: Stufenkante (dunkel) und Sitzfläche, abwechselnd hell und dunkel
  for (let k = 0; k < A.rows; k++) {
    const d = A.d0 + k * A.rowD;
    tribBand(ctx, K, d, d + 0.3, A.riser);
    tribBand(ctx, K, d + 0.3, d + A.rowD, A.stone[k % 2]);
    tribBand(ctx, K, d + A.rowD - 0.08, d + A.rowD, darker(A.stone[k % 2], 0.25));
  }
  // Mauer oben: Wehrgang und Zinnen
  tribBand(ctx, K, K.dW, K.dW + 0.3, A.riser);
  tribBand(ctx, K, K.dW + 0.3, dOut, A.wall);
  {
    const S = K.S;
    const R = K.P.rc + dOut - 0.25;
    for (let j = 0; j < S.length; j += 3) {
      const s = S[j];
      if (s.gate >= 0) continue;
      ctx.fillStyle = turm ? '#3a2e34' : '#a08866';
      const x = s.bx + s.nx * R;
      const y = s.by + s.ny * R;
      ctx.fillRect(x - 0.22, y - 0.22, 0.44, 0.44);
    }
    // Außenseite der Mauer, wo sie zur Kamera zeigt (Süden): senkrechte Wand nach unten
    const tief = turm ? 2.6 : 1.4;
    ctx.beginPath();
    for (let j = 0; j < S.length; j++) {
      const a = S[j];
      const b = S[(j + 1) % S.length];
      if (a.ny < 0.15 || b.ny < 0.15 || a.gate >= 0 || b.gate >= 0) continue;
      const Ro = K.P.rc + dOut;
      ctx.moveTo(a.bx + a.nx * Ro, a.by + a.ny * Ro);
      ctx.lineTo(b.bx + b.nx * Ro, b.by + b.ny * Ro);
      ctx.lineTo(b.bx + b.nx * Ro, b.by + b.ny * Ro + tief * b.ny);
      ctx.lineTo(a.bx + a.nx * Ro, a.by + a.ny * Ro + tief * a.ny);
      ctx.closePath();
    }
    ctx.fillStyle = turm ? '#1c1416' : '#7a6448';
    ctx.fill();
  }
  // Torhäuser in den Lücken
  for (let g = 0; g < A.gates.length; g++) {
    const [gx, gy] = A.gates[g];
    const px = -gy;
    const py = gx;
    const half = A.gap + 0.5;
    const base = (gx ? (turm ? TURM.hw : ARENA.hallW / 2) : (turm ? TURM.hh : ARENA.hallH / 2));
    const d0 = base + A.gateIn[g] - 0.35;
    const d1 = base + dOut + 0.3;
    const q = (d, s) => [gx * d + px * s, gy * d + py * s];
    const quad = (pts, c) => { ctx.fillStyle = c; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); };
    quad([q(d0, -half), q(d0, half), q(d1, half), q(d1, -half)], turm ? '#2a2025' : '#9a8260');
    quad([q(d0, -half + 0.9), q(d0, half - 0.9), q(d0 + 1.1, half - 1.3), q(d0 + 1.1, -half + 1.3)], turm ? '#0c0708' : '#4a3a2a');
    for (let k = 1; k < 4; k++) { const dd = d0 + 1.1 + k * (d1 - d0 - 1.1) / 4; quad([q(dd - 0.08, -half), q(dd - 0.08, half), q(dd + 0.08, half), q(dd + 0.08, -half)], turm ? '#3a2e34' : '#b8a07c'); }
    for (const s of [-half, half]) quad([q(d0, s - 0.45), q(d0, s + 0.45), q(d1, s + 0.45), q(d1, s - 0.45)], turm ? '#3e3238' : '#b8a07c');
    if (turm) for (const s of [-half, half]) { ctx.fillStyle = A.glut; const [x, y] = q(d0 + 0.6, s); ctx.fillRect(x - 0.08, y - 0.3, 0.16, 0.6); }
  }
  // Feuerbecken auf der Mauer
  {
    const S = K.S;
    const R = K.P.rc + K.dW + A.wallW * 0.55;
    for (let j = 4; j < S.length; j += 14) {
      const s = S[j];
      if (s.gate >= 0) continue;
      const x = s.bx + s.nx * R;
      const y = s.by + s.ny * R;
      ctx.fillStyle = '#2a2224';
      ctx.beginPath();
      ctx.ellipse(x, y, 0.34, 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = A.glut;
      ctx.beginPath();
      ctx.moveTo(x - 0.26, y - 0.05);
      ctx.lineTo(x - 0.1, y - 0.62);
      ctx.lineTo(x, y - 0.32);
      ctx.lineTo(x + 0.12, y - 0.7);
      ctx.lineTo(x + 0.26, y - 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff0c0';
      ctx.beginPath();
      ctx.ellipse(x, y - 0.18, 0.08, 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
// Bodenblock fertig gemalt: liegt er im Feld einer Halle, die Kulisse darübermalen
if (typeof renderGroundChunk === 'function') {
  const _tribChunk = renderGroundChunk;
  renderGroundChunk = function (cx, cy) {
    const c = _tribChunk(cx, cy);
    try {
      const x0 = cx * CHUNK;
      const y0 = cy * CHUNK;
      for (const V of tribVenues()) {
        const R = V.R;
        if (x0 + CHUNK <= R.x || y0 + CHUNK <= R.y || x0 >= R.x + R.w || y0 >= R.y + R.h) continue;
        const ctx = c.getContext('2d');
        const size = CHUNK * TILE;
        ctx.setTransform(CHUNK_SCALE, 0, 0, CHUNK_SCALE, -cx * size * CHUNK_SCALE, -cy * size * CHUNK_SCALE);
        trib2Bake(ctx, V, { x: x0 + CHUNK / 2, y: y0 + CHUNK / 2, r: CHUNK / 2 });
      }
    } catch (e) { /* nur Schmuck */ }
    return c;
  };
}

// --- Zuschauer in 2D: Bildbogen (Formen × Farben × Haltung × vorn/hinten), je Zuschauer ein drawImage ---------------
const TRIB2 = { atlas: {}, cell: { w: 26, h: 40, s: 2 }, grid: {} };
function trib2Figure(ctx, kind, v, col, pose, back) {
  // Ursprung: Füße unten in der Mitte; Arme: pose 0 unten, 1 halb, 2 oben
  const skin = ['#f0c8a0', '#d8a878', '#a87850', '#8a5a3a'][(v * 3 + col.length) % 4];
  const armY = [0, -5, -11][pose];
  const arm = (sx, c) => {
    if (pose === 0) box(ctx, sx * 6.2 - 1.6, -17, 3.2, 9, 1.4, c);
    else if (pose === 1) box(ctx, sx * 6.8 - 1.6, -21 + armY * 0.3, 3.2, 8, 1.4, c);
    else box(ctx, sx * 6 - 1.6, -29, 3.2, 10, 1.4, c);
  };
  if (kind === 'ungeheuer') {
    if (v === 0) {
      // Gehörnter: breite Schultern, Hörner, glühende Augen
      arm(-1, col); arm(1, col);
      poly(ctx, [[-6, 0], [6, 0], [8, -17], [-8, -17]], col);
      oval(ctx, 0, -20.5, 5, 4.6, darker(col, 0.25));
      poly(ctx, [[-4, -23], [-8, -30], [-2.5, -24.5]], '#d8cfbc');
      poly(ctx, [[4, -23], [8, -30], [2.5, -24.5]], '#d8cfbc');
      if (!back) for (const x of [-1.9, 1.9]) dot(ctx, x, -21, 1.2, 1, '#ff8a3a');
    } else if (v === 1) {
      // Kapuzenschatten
      arm(-1, darker(col, 0.15)); arm(1, darker(col, 0.15));
      poly(ctx, [[-7, 0], [7, 0], [4.5, -18], [-4.5, -18]], col);
      poly(ctx, [[-5.2, -15], [5.2, -15], [3.5, -25], [0, -27], [-3.5, -25]], darker(col, 0.1));
      if (!back) {
        dot(ctx, 0, -20, 3, 3.2, '#0c0808');
        for (const x of [-1.3, 1.3]) dot(ctx, x, -20.5, 0.9, 0.8, '#9cff6a');
      }
    } else {
      // Knochenwicht: schmal, Schädel
      arm(-1, '#b8ae9c'); arm(1, '#b8ae9c');
      poly(ctx, [[-4.5, 0], [4.5, 0], [5.5, -16], [-5.5, -16]], col);
      oval(ctx, 0, -20.5, 4.4, 4.6, '#d8cfbc');
      if (!back) for (const x of [-1.6, 1.6]) dot(ctx, x, -21, 1.1, 1.1, '#ff4a3a');
    }
  } else {
    // Bewohner: Kittel in Farbe, Kopf, Haare oder Mütze
    arm(-1, col); arm(1, col);
    poly(ctx, [[-6, 0], [6, 0], [6.5, -16], [-6.5, -16]], col);
    box(ctx, -6.5, -9, 13, 2, 0.8, darker(col, 0.3));
    oval(ctx, 0, -20.5, 4.6, 4.8, skin);
    if (v === 0) poly(ctx, [[-4.8, -21], [-4, -25.5], [0, -26.8], [4, -25.5], [4.8, -21], [3, -23.5], [-3, -23.5]], ['#3a2a1e', '#6a4a2a', '#d8b060', '#2a2a2a'][col.length % 4]);
    else poly(ctx, [[-5.6, -22], [5.6, -22], [3.4, -27.5], [-3.4, -27.5]], lighter(col, 0.35));
    if (back) oval(ctx, 0, -21.5, 4.4, 4.2, ['#3a2a1e', '#6a4a2a', '#d8b060', '#2a2a2a'][col.length % 4]);
    else for (const x of [-1.6, 1.6]) dot(ctx, x, -20.5, 0.6, 0.7, '#2a1a10');
  }
}
function trib2Atlas(kind) {
  if (TRIB2.atlas[kind]) return TRIB2.atlas[kind];
  const A = TRIB_ART[kind];
  const C = TRIB2.cell;
  const nv = kind === 'turm' ? 3 : 2;
  const nc = A.colors.length;
  const cols = 6;
  const rows = nv * nc;
  const cv = newCanvas(cols * C.w * C.s, rows * C.h * C.s);
  const ctx = cv.getContext('2d');
  for (let v = 0; v < nv; v++) {
    for (let c = 0; c < nc; c++) {
      for (let pose = 0; pose < 3; pose++) {
        for (let back = 0; back < 2; back++) {
          ctx.save();
          ctx.translate(((pose * 2 + back) * C.w + C.w / 2) * C.s, ((v * nc + c) * C.h + C.h - 2) * C.s);
          ctx.scale(C.s, C.s);
          trib2Figure(ctx, A.crowd, v, A.colors[c], pose, back);
          ctx.restore();
        }
      }
    }
  }
  const at = { cv, nc };
  TRIB2.atlas[kind] = at;
  return at;
}
// Zuschauer nach Feldern (8 × 8 Kacheln) einsortiert, je Feld nach y (wer weiter unten sitzt, wird später gemalt)
function trib2Grid(K) {
  if (K.grid2 && K.grid2.dichte === tribDichte()) return K.grid2;
  const dichte = tribDichte();
  const cells = new Map();
  for (const f of K.fans) {
    if (f.keep > dichte) continue;
    const k = Math.floor(f.x / 8) + ':' + Math.floor(f.y / 8);
    let a = cells.get(k);
    if (!a) cells.set(k, (a = []));
    a.push(f);
  }
  for (const a of cells.values()) a.sort((p, q) => p.y - q.y);
  K.grid2 = { dichte, cells };
  return K.grid2;
}
function trib2Draw(ctx, x0, y0, x1, y1) {
  const p = game.player;
  if (!p) return;
  const V = tribVenueAt(renderer.camX + renderer.w / renderer.zoom / 2, renderer.camY + renderer.h / renderer.zoom / 2) || tribVenueAt(p.x, p.y);
  if (!V) return;
  const K = tribKind(V.kind);
  // Ränge im Bild? (Kacheln relativ zur Mitte)
  const lx0 = x0 - V.cx - 2;
  const lx1 = x1 - V.cx + 2;
  const ly0 = y0 - V.cy - 2;
  const ly1 = y1 - V.cy + 3;
  const G = trib2Grid(K);
  const at = trib2Atlas(V.kind);
  const C = TRIB2.cell;
  const t = game.time;
  const hype = tribHype();
  const sx = C.w * C.s;
  const sy = C.h * C.s;
  for (let cy = Math.floor(ly0 / 8); cy <= Math.floor(ly1 / 8); cy++) {
    for (let cx = Math.floor(lx0 / 8); cx <= Math.floor(lx1 / 8); cx++) {
      const list = G.cells.get(cx + ':' + cy);
      if (!list) continue;
      for (const f of list) {
        if (f.x < lx0 || f.x > lx1 || f.y < ly0 || f.y > ly1) continue;
        const m = tribMove(f, t, hype);
        const pose = m.up > 0.66 ? 2 : m.up > 0.3 ? 1 : 0;
        const back = f.ny > 0.35 ? 1 : 0;
        const w = C.w * f.sc;
        const h = C.h * f.sc;
        const px = (V.cx + f.x) * TILE;
        // Füße etwas über der Mitte der Reihe (sitzt auf der Stufe), dazu der Sprung
        const py = (V.cy + f.y) * TILE - 6 - m.hop * TILE * 0.9;
        ctx.drawImage(at.cv, (pose * 2 + back) * sx, (f.v * at.nc + f.c) * sy, sx, sy, px - w / 2, py - h + 2, w, h);
      }
    }
  }
}
if (typeof drawGround === 'function') {
  const _tribDrawGround = drawGround;
  drawGround = function (ctx, x0, y0, x1, y1) {
    _tribDrawGround(ctx, x0, y0, x1, y1);
    if (V3.on || !game.running) return;
    try { trib2Draw(ctx, x0, y0, x1, y1); } catch (e) { /* nur Schmuck */ }
  };
}

// =====================================================================================================================
// 3D
// =====================================================================================================================
const TRIB3 = { homeRef: undefined, venue: null, group: null, groupKind: '', dichte: 0, uTime: { value: 0 }, uHype: { value: 0.1 } };
// Höhenlinie der Ränge sinkt im Streifen zwischen Figur und Kamera wie die Felswände (CUT3, drei-kern.js)
const TRIB_CUT_GLSL = `
	{
		vec4 tbW = modelMatrix * vec4(transformed, 1.0);
		if (uCutP.x > 0.0 && tbW.y > 0.14) {
			vec2 cRel = tbW.xz - uCut.xy;
			float cAl = dot(cRel, uCut.zw);
			float cLa = abs(cRel.x * uCut.w - cRel.y * uCut.z);
			float cK = uCutP.x * smoothstep(-0.9, 0.6, cAl) * (1.0 - smoothstep(uCutP.z, uCutP.z + 2.2, cLa - max(cAl, 0.0) * uCutP.w)) * (1.0 - smoothstep(uCutP.y, uCutP.y + 3.0, cAl));
			transformed.y += (0.14 + tbW.y * 0.1 - tbW.y) * cK;
		}
	}`;
function tribStandMat() {
  return mat3('tribStand', () => {
    const m = toonMat();
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uCut = CUT3_UNIFORMS.uCut;
      sh.uniforms.uCutP = CUT3_UNIFORMS.uCutP;
      sh.vertexShader = sh.vertexShader
        .replace('void main() {', 'uniform vec4 uCut;\nuniform vec4 uCutP;\nvoid main() {')
        .replace('#include <begin_vertex>', '#include <begin_vertex>' + TRIB_CUT_GLSL);
    };
    m.customProgramCacheKey = () => 'tribStand';
    return addFade(m, 0.45);
  });
}
function tribGlowMat() {
  return mat3('tribGlow', () => {
    const m = new THREE.MeshBasicMaterial({ vertexColors: true });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uCut = CUT3_UNIFORMS.uCut;
      sh.uniforms.uCutP = CUT3_UNIFORMS.uCutP;
      sh.vertexShader = sh.vertexShader
        .replace('void main() {', 'uniform vec4 uCut;\nuniform vec4 uCutP;\nvoid main() {')
        .replace('#include <begin_vertex>', '#include <begin_vertex>' + TRIB_CUT_GLSL);
    };
    m.customProgramCacheKey = () => 'tribGlow';
    return m;
  });
}
// Zuschauer: Toon-Material, Farbe je Zuschauer (instanceColor), Haut/Hörner aus der Eckfarbe (aPart 1), Arme beweglich
// (aPart 2), Augen leuchten (aPart 3). Wippen und Jubeln aus uTime/uHype und dem Zufallswert je Zuschauer (aSeed).
function tribFanMat(armLen) {
  return mat3('tribFan' + armLen, () => {
    const m = toonMat();
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = TRIB3.uTime;
      sh.uniforms.uHype = TRIB3.uHype;
      sh.uniforms.uCut = CUT3_UNIFORMS.uCut;
      sh.uniforms.uCutP = CUT3_UNIFORMS.uCutP;
      sh.vertexShader = sh.vertexShader
        .replace('void main() {', 'attribute float aPart;\nattribute float aSeed;\nuniform float uTime;\nuniform float uHype;\nuniform vec4 uCut;\nuniform vec4 uCutP;\nvarying float vGlow;\nvoid main() {')
        .replace('#include <color_vertex>', `
#ifdef USE_INSTANCING_COLOR
	vColor = (aPart > 0.5 && aPart < 1.5) ? color * (0.82 + 0.36 * fract(aSeed * 17.0)) : (aPart > 2.5 ? color : color * instanceColor.xyz);
#else
	vColor = color;
#endif
	vGlow = aPart > 2.5 ? 1.0 : 0.0;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
	float tPh = aSeed * 6.2832;
	float tRate = 2.4 + fract(aSeed * 7.13) * 1.8;
	float tMine = clamp(uHype * (0.55 + fract(aSeed * 3.71) * 0.9), 0.0, 1.0);
	float tIdle = step(0.86, fract(aSeed * 11.3 + floor(uTime * 0.25 + aSeed * 7.0) * 0.618)) * 0.45;
	float tEx = max(tMine, tIdle);
	float tS = max(0.0, sin(uTime * tRate + tPh));
	transformed.y += tS * tS * (0.03 + 0.42 * tEx);
	transformed.x += sin(uTime * 1.1 + tPh) * 0.025;
	if (aPart > 1.5 && aPart < 2.5) {
		float tUp = clamp(tEx * 1.4 - 0.25 + 0.35 * sin(uTime * tRate * 0.5 + tPh * 1.7), 0.0, 1.0);
		transformed.y += tUp * ${armLen.toFixed(2)};
	}
	{
		vec4 tbW = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
		if (uCutP.x > 0.0 && tbW.y > 0.14) {
			vec2 cRel = tbW.xz - uCut.xy;
			float cAl = dot(cRel, uCut.zw);
			float cLa = abs(cRel.x * uCut.w - cRel.y * uCut.z);
			float cK = uCutP.x * smoothstep(-0.9, 0.6, cAl) * (1.0 - smoothstep(uCutP.z, uCutP.z + 2.2, cLa - max(cAl, 0.0) * uCutP.w)) * (1.0 - smoothstep(uCutP.y, uCutP.y + 3.0, cAl));
			transformed.y += (0.14 + tbW.y * 0.1 - tbW.y) * cK / max(0.3, length(instanceMatrix[0].xyz));
		}
	}`);
      sh.fragmentShader = sh.fragmentShader
        .replace('void main() {', 'varying float vGlow;\nvoid main() {')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += vColor * vGlow * 1.6;');
    };
    m.customProgramCacheKey = () => 'tribFan' + armLen;
    return m;
  });
}

// Baukasten: flache Vierecke und Quader mit Farbe (und Teil-Kennung für Zuschauer)
class TribBuf {
  constructor() { this.p = []; this.n = []; this.c = []; this.a = []; this.i = []; this.col = new THREE.Color(); }
  setCol(hex) { this.col.set(hex); return this; }
  vert(x, y, z, nx, ny, nz, part) {
    this.p.push(x, y, z);
    this.n.push(nx, ny, nz);
    this.c.push(this.col.r, this.col.g, this.col.b);
    this.a.push(part || 0);
    return this.p.length / 3 - 1;
  }
  // Viereck a-b-c-d (je [x, y, z]) mit Flächennormale n; Umlauf passend zur Normale
  quad(a, b, c, d, n, part) {
    const ux = b[0] - a[0]; const uy = b[1] - a[1]; const uz = b[2] - a[2];
    const vx = c[0] - a[0]; const vy = c[1] - a[1]; const vz = c[2] - a[2];
    const flip = (uy * vz - uz * vy) * n[0] + (uz * vx - ux * vz) * n[1] + (ux * vy - uy * vx) * n[2] < 0;
    const i0 = this.vert(a[0], a[1], a[2], n[0], n[1], n[2], part);
    this.vert(b[0], b[1], b[2], n[0], n[1], n[2], part);
    this.vert(c[0], c[1], c[2], n[0], n[1], n[2], part);
    this.vert(d[0], d[1], d[2], n[0], n[1], n[2], part);
    if (flip) this.i.push(i0, i0 + 2, i0 + 1, i0, i0 + 3, i0 + 2);
    else this.i.push(i0, i0 + 1, i0 + 2, i0, i0 + 2, i0 + 3);
  }
  // Quader um (x, y, z), Größe w × h × d, um die Hochachse gedreht (ry), oben schmaler (taper)
  box(x, y, z, w, h, d, ry = 0, part = 0, taper = 1, skipBottom = true) {
    const c = Math.cos(ry);
    const s = Math.sin(ry);
    const P = (lx, ly, lz) => [x + lx * c + lz * s, y + ly, z - lx * s + lz * c];
    const N = (lx, ly, lz) => [lx * c + lz * s, ly, -lx * s + lz * c];
    const hw = w / 2; const hd = d / 2; const hh = h / 2;
    const tw = hw * taper; const td = hd * taper;
    const b0 = P(-hw, -hh, -hd); const b1 = P(hw, -hh, -hd); const b2 = P(hw, -hh, hd); const b3 = P(-hw, -hh, hd);
    const t0 = P(-tw, hh, -td); const t1 = P(tw, hh, -td); const t2 = P(tw, hh, td); const t3 = P(-tw, hh, td);
    this.quad(t0, t1, t2, t3, N(0, 1, 0), part);
    if (!skipBottom) this.quad(b0, b1, b2, b3, N(0, -1, 0), part);
    this.quad(b3, b2, t2, t3, N(0, 0, 1), part);
    this.quad(b1, b0, t0, t1, N(0, 0, -1), part);
    this.quad(b2, b1, t1, t2, N(1, 0, 0), part);
    this.quad(b0, b3, t3, t0, N(-1, 0, 0), part);
  }
  // Dreieck a-b-c mit Flächennormale n
  tri(a, b, c, n, part) {
    const ux = b[0] - a[0]; const uy = b[1] - a[1]; const uz = b[2] - a[2];
    const vx = c[0] - a[0]; const vy = c[1] - a[1]; const vz = c[2] - a[2];
    const flip = (uy * vz - uz * vy) * n[0] + (uz * vx - ux * vz) * n[1] + (ux * vy - uy * vx) * n[2] < 0;
    const i0 = this.vert(a[0], a[1], a[2], n[0], n[1], n[2], part);
    this.vert(b[0], b[1], b[2], n[0], n[1], n[2], part);
    this.vert(c[0], c[1], c[2], n[0], n[1], n[2], part);
    if (flip) this.i.push(i0, i0 + 2, i0 + 1);
    else this.i.push(i0, i0 + 1, i0 + 2);
  }
  // flaches Rechteck (Augen), Blick nach +z, um (x, y, z)
  plate(x, y, z, w, h, part) {
    this.quad([x - w / 2, y - h / 2, z], [x + w / 2, y - h / 2, z], [x + w / 2, y + h / 2, z], [x - w / 2, y + h / 2, z], [0, 0, 1], part);
  }
  // vierseitige Spitze (Horn, Dorn) von (x, y, z) nach oben, geneigt um (lx, lz)
  spike(x, y, z, r, len, lx = 0, lz = 0, part = 0) {
    const tip = [x + lx * len, y + len, z + lz * len];
    const b = [[x - r, y, z - r], [x + r, y, z - r], [x + r, y, z + r], [x - r, y, z + r]];
    for (let k = 0; k < 4; k++) {
      const a = b[k];
      const c = b[(k + 1) % 4];
      const mx = (a[0] + c[0]) / 2 - x;
      const mz = (a[2] + c[2]) / 2 - z;
      const l = Math.hypot(mx, mz) || 1;
      this.tri(a, c, tip, [mx / l * 0.8, 0.6, mz / l * 0.8], part);
    }
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    if (this.a.some((v) => v)) g.setAttribute('aPart', new THREE.Float32BufferAttribute(this.a, 1));
    g.setIndex(this.i);
    g.computeBoundingSphere();
    return g;
  }
}

// Ränge, Mauer, Torhäuser (lit) und Feuer (glow) einer Art
function trib3Stands(K, lit, glow) {
  const { A, S, P } = K;
  const R = P.rc;
  const pt = (s, d, h) => [s.bx + s.nx * (R + d), h, s.by + s.ny * (R + d)];
  const n = S.length;
  const shade = (hex, k) => darker(hex, k);
  for (let j = 0; j < n; j++) {
    const a = S[j];
    const b = S[(j + 1) % n];
    if (a.gate >= 0 || b.gate >= 0) continue;
    const nIn = [-(a.nx + b.nx) / 2, 0, -(a.ny + b.ny) / 2];
    const nOut = [-nIn[0], 0, -nIn[2]];
    const var1 = ((j * 7) % 5) * 0.025;
    // Brüstung vom Wandrand zur ersten Reihe
    lit.setCol(shade(A.stone[2], var1));
    lit.quad(pt(a, 0.45, 1.64), pt(b, 0.45, 1.64), pt(b, A.d0, 1.64), pt(a, A.d0, 1.64), [0, 1, 0]);
    lit.setCol(A.riser);
    lit.quad(pt(a, 0.45, 1.3), pt(b, 0.45, 1.3), pt(b, 0.45, 1.64), pt(a, 0.45, 1.64), nIn);
    let ha = 1.4;
    let hb = 1.4;
    for (let k = 0; k < A.rows; k++) {
      const d0 = A.d0 + k * A.rowD;
      const d1 = d0 + A.rowD;
      const na = K.rowH(k, a);
      const nb = K.rowH(k, b);
      lit.setCol(A.riser);
      lit.quad(pt(a, d0, ha), pt(b, d0, hb), pt(b, d0, nb), pt(a, d0, na), nIn);
      lit.setCol(shade(A.stone[k % 2], var1));
      lit.quad(pt(a, d0, na), pt(b, d0, nb), pt(b, d1, nb), pt(a, d1, na), [0, 1, 0]);
      ha = na;
      hb = nb;
    }
    // Mauer: Innenseite, Wehrgang, Außenseite bis in die Tiefe
    const ta = K.top(a);
    const tb = K.top(b);
    const dW = K.dW;
    const dO = dW + A.wallW;
    lit.setCol(A.wall);
    lit.quad(pt(a, dW, ha), pt(b, dW, hb), pt(b, dW, tb), pt(a, dW, ta), nIn);
    lit.setCol(A.top);
    lit.quad(pt(a, dW, ta), pt(b, dW, tb), pt(b, dO, tb), pt(a, dO, ta), [0, 1, 0]);
    lit.setCol(shade(A.wall, 0.25));
    lit.quad(pt(a, dO, ta), pt(b, dO, tb), pt(b, dO, A.bottom), pt(a, dO, A.bottom), nOut);
    // Zinnen außen
    if (j % 3 === 0) {
      const m = pt(a, dO - 0.25, ta + 0.3);
      lit.setCol(A.top);
      lit.box(m[0], m[1], m[2], 0.5, 0.6, 0.42, Math.atan2(a.nx, a.ny));
      if (K.kind === 'turm' && j % 6 === 0) {
        lit.setCol('#5a4a50');
        lit.spike(m[0], m[1] + 0.3, m[2], 0.13, 0.7, a.nx * 0.25, a.ny * 0.25);
      }
    }
    // Feuerbecken auf dem Wehrgang
    if ((j - 4) % 14 === 0) {
      const m = pt(a, dW + A.wallW * 0.55, ta);
      lit.setCol('#2a2224');
      lit.box(m[0], m[1] + 0.15, m[2], 0.5, 0.3, 0.5, 0, 0, 1.3);
      glow.setCol(A.glut);
      glow.spike(m[0], m[1] + 0.3, m[2], 0.18, 0.75);
      glow.setCol('#fff0c0');
      glow.spike(m[0], m[1] + 0.3, m[2], 0.08, 0.45);
    }
  }
  // Torhäuser
  for (let g = 0; g < A.gates.length; g++) {
    const [gx, gy] = A.gates[g];
    const turm = K.kind === 'turm';
    const base = gx ? (turm ? TURM.hw : ARENA.hallW / 2) : (turm ? TURM.hh : ARENA.hallH / 2);
    const d0 = base + A.gateIn[g];
    const d1 = base + K.dW + A.wallW + 0.4;
    const half = A.gap + 0.5;
    const hTop = A.h0 + (A.rows - 1) * A.rise + A.wallH + 1.0;
    const ry = Math.atan2(gx, gy);
    const cx = gx * (d0 + d1) / 2;
    const cz = gy * (d0 + d1) / 2;
    const depth = d1 - d0;
    lit.setCol(turm ? '#2a2025' : '#9a8260');
    lit.box(cx, (hTop + A.bottom) / 2, cz, half * 2 + 0.2, hTop - A.bottom, depth, ry);
    // Türme an den Seiten, dunkle Öffnung zur Halle
    for (const s of [-1, 1]) {
      const px = cx + -gy * s * half;
      const pz = cz + gx * s * half;
      lit.setCol(turm ? '#3a2e34' : '#b8a07c');
      lit.box(px, (hTop + 1.4) / 2, pz, 1.2, hTop + 1.4, depth + 0.3, ry, 0, 0.92);
      if (turm) {
        lit.setCol('#4a3a40');
        lit.spike(px, hTop + 1.4, pz, 0.32, 1.3);
        glow.setCol(A.glut);
        glow.box(px + gx * -(depth / 2 + 0.16), hTop * 0.55, pz + gy * -(depth / 2 + 0.16), 0.14, 0.9, 0.06, ry);
      } else {
        lit.setCol('#c84a3a');
        lit.box(px, hTop + 2.2, pz, 0.06, 1.6, 0.06, ry);
        lit.box(px + -gy * s * 0.35, hTop + 2.7, pz + gx * s * 0.35, 0.7, 0.45, 0.04, ry);
      }
    }
    lit.setCol(turm ? '#080405' : '#3a2c20');
    const ox = gx * (d0 - 0.02);
    const oz = gy * (d0 - 0.02);
    lit.quad([ox + gy * (half - 0.7), 0, oz - gx * (half - 0.7)], [ox - gy * (half - 0.7), 0, oz + gx * (half - 0.7)],
      [ox - gy * (half - 0.7), 3.6, oz + gx * (half - 0.7)], [ox + gy * (half - 0.7), 3.6, oz - gx * (half - 0.7)], [-gx, 0, -gy]);
  }
  // Glutspalten im Turmboden (flach, leuchtend)
  if (K.kind === 'turm') {
    const L = tribLinien(K);
    for (const sp of L.spalten) {
      for (let k = 0; k + 1 < sp.pts.length; k++) {
        const [x0, z0] = sp.pts[k];
        const [x1, z1] = sp.pts[k + 1];
        const dx = x1 - x0;
        const dz = z1 - z0;
        const l = Math.hypot(dx, dz) || 1;
        const w = sp.w * 0.32;
        const px = (-dz / l) * w;
        const pz = (dx / l) * w;
        glow.setCol('#d8501c');
        glow.quad([x0 + px, 0.05, z0 + pz], [x1 + px, 0.05, z1 + pz], [x1 - px, 0.05, z1 - pz], [x0 - px, 0.05, z0 - pz], [0, 1, 0]);
      }
    }
  }
}
// Kulisse in der Ferne: Arena – Bäume auf den Hügeln; Turm – Felsnadeln und Lavaadern im Glutschlund
function trib3Ferne(K, lit, glow) {
  if (K.kind === 'turm') {
    // dieselben Adern wie in 2D, als leuchtende Bänder knapp über dem Grund
    for (const ad of tribLinien(K).adern) {
      for (let k = 0; k + 1 < ad.pts.length; k++) {
        const [x0, z0] = ad.pts[k];
        const [x1, z1] = ad.pts[k + 1];
        const h0 = tribGround('turm', tribDist(K.P, x0, z0), x0, z0).h + 0.12;
        const h1 = tribGround('turm', tribDist(K.P, x1, z1), x1, z1).h + 0.12;
        const l = Math.hypot(x1 - x0, z1 - z0) || 1;
        const w = ad.w * 0.8;
        const px = (-(z1 - z0) / l) * w;
        const pz = ((x1 - x0) / l) * w;
        glow.setCol('#e2541c');
        glow.quad([x0 + px, h0, z0 + pz], [x1 + px, h1, z1 + pz], [x1 - px, h1, z1 - pz], [x0 - px, h0, z0 - pz], [0, 1, 0]);
        glow.setCol('#ffc070');
        glow.quad([x0 + px * 0.3, h0 + 0.02, z0 + pz * 0.3], [x1 + px * 0.3, h1 + 0.02, z1 + pz * 0.3], [x1 - px * 0.3, h1 + 0.02, z1 - pz * 0.3], [x0 - px * 0.3, h0 + 0.02, z0 - pz * 0.3], [0, 1, 0]);
      }
    }
  }
  const rnd = tribRand(K.kind === 'turm' ? 515 : 616);
  const dO = K.dW + K.A.wallW;
  const turm = K.kind === 'turm';
  const hw = turm ? TURM.hw : ARENA.hallW / 2;
  const hh = turm ? TURM.hh : ARENA.hallH / 2;
  const low = typeof opts !== 'undefined' && opts.graphics === 'niedrig';
  const n = low ? 24 : 70;
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2;
    const r = dO + (turm ? 6 : 12) + rnd() * (turm ? 26 : 40);
    const x = Math.cos(a) * (hw + r);
    const z = Math.sin(a) * (hh + r);
    const y = tribGround(K.kind, tribDistLocal(K, x, z), x, z).h;
    const s = 0.8 + rnd() * 1.1;
    if (turm) {
      lit.setCol(rnd() < 0.5 ? '#2a1c1e' : '#352428');
      lit.box(x, y + 1.6 * s, z, 1.1 * s, 3.2 * s, 1.1 * s, rnd() * 3, 0, 0.45);
      lit.spike(x, y + 3.2 * s, z, 0.22 * s, 1.6 * s, (rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.3);
      if (rnd() < 0.3) { glow.setCol('#ff5a1a'); glow.box(x, y + 0.6 * s, z, 0.12, 1.0 * s, 1.15 * s, rnd() * 3); }
    } else {
      lit.setCol('#5a3e26');
      lit.box(x, y + 0.6 * s, z, 0.25 * s, 1.2 * s, 0.25 * s);
      lit.setCol(rnd() < 0.5 ? '#3e6e30' : '#4a7e38');
      lit.spike(x, y + 0.9 * s, z, 0.9 * s, 2.4 * s);
      lit.spike(x, y + 1.9 * s, z, 0.65 * s, 1.8 * s);
    }
  }
}
// Zuschauerformen (Kacheln = Einheiten, Füße bei y = 0, Blick nach +z)
function trib3FanGeo(kind, v) {
  const b = new TribBuf();
  if (kind === 'turm') {
    if (v === 0) {
      // Gehörnter
      b.setCol('#ffffff').box(0, 0.36, 0, 0.5, 0.72, 0.34, 0, 0, 1.25);
      b.setCol('#ffffff');
      for (const s of [-1, 1]) b.box(s * 0.33, 0.5, 0, 0.13, 0.42, 0.13, 0, 2);
      b.setCol('#4a3438').box(0, 0.9, 0.02, 0.32, 0.3, 0.3, 0, 1);
      b.setCol('#d8cfbc');
      for (const s of [-1, 1]) b.spike(s * 0.12, 1.02, 0.02, 0.05, 0.28, s * 0.5, 0, 1);
      b.setCol('#ff8a3a');
      for (const s of [-1, 1]) b.plate(s * 0.07, 0.93, 0.172, 0.06, 0.04, 3);
    } else if (v === 1) {
      // Kapuzenschatten
      b.setCol('#ffffff').box(0, 0.42, 0, 0.5, 0.84, 0.36, 0, 0, 0.62);
      b.setCol('#ffffff');
      for (const s of [-1, 1]) b.box(s * 0.25, 0.55, 0.02, 0.1, 0.38, 0.1, 0, 2);
      b.setCol('#ffffff').box(0, 0.95, 0, 0.32, 0.32, 0.32, 0, 0, 0.55);
      b.setCol('#0c0808').box(0, 0.92, 0.12, 0.18, 0.16, 0.1, 0, 1);
      b.setCol('#9cff6a');
      for (const s of [-1, 1]) b.plate(s * 0.045, 0.94, 0.172, 0.04, 0.03, 3);
    } else {
      // Knochenwicht
      b.setCol('#ffffff').box(0, 0.34, 0, 0.36, 0.68, 0.26, 0, 0, 1.1);
      b.setCol('#b8ae9c');
      for (const s of [-1, 1]) b.box(s * 0.25, 0.48, 0, 0.08, 0.4, 0.08, 0, 2);
      b.setCol('#d8cfbc').box(0, 0.86, 0.01, 0.28, 0.28, 0.28, 0, 1);
      b.setCol('#ff4a3a');
      for (const s of [-1, 1]) b.plate(s * 0.065, 0.88, 0.152, 0.06, 0.05, 3);
    }
  } else if (v === 0) {
    // Bewohner mit Haaren
    b.setCol('#ffffff').box(0, 0.36, 0, 0.46, 0.72, 0.3, 0, 0, 1.05);
    b.setCol('#ffffff');
    for (const s of [-1, 1]) b.box(s * 0.29, 0.5, 0, 0.12, 0.42, 0.12, 0, 2);
    b.setCol('#e8c09a').box(0, 0.88, 0, 0.28, 0.28, 0.28, 0, 1);
    b.setCol('#5a3a22').box(0, 1.04, -0.02, 0.3, 0.08, 0.3, 0, 1);
  } else {
    // Bewohner mit Mütze
    b.setCol('#ffffff').box(0, 0.36, 0, 0.46, 0.72, 0.3, 0, 0, 1.05);
    b.setCol('#ffffff');
    for (const s of [-1, 1]) b.box(s * 0.29, 0.5, 0, 0.12, 0.42, 0.12, 0, 2);
    b.setCol('#d8a878').box(0, 0.88, 0, 0.28, 0.28, 0.28, 0, 1);
    b.setCol('#e8e0d0').box(0, 1.06, 0, 0.3, 0.12, 0.3, 0, 1, 0.6);
  }
  return b.geometry();
}
// alles einer Art bauen (lokal um die Hallenmitte)
function trib3Build(K) {
  const g = new THREE.Group();
  g.name = 'tribuene';
  const lit = new TribBuf();
  const glow = new TribBuf();
  trib3Stands(K, lit, glow);
  trib3Ferne(K, lit, glow);
  const ml = new THREE.Mesh(lit.geometry(), tribStandMat());
  ml.receiveShadow = true;
  g.add(ml);
  if (glow.i.length) g.add(new THREE.Mesh(glow.geometry(), tribGlowMat()));
  // Zuschauer: je Form ein InstancedMesh
  const dichte = tribDichte();
  const nv = K.kind === 'turm' ? 3 : 2;
  const M = new THREE.Matrix4();
  const Q = new THREE.Quaternion();
  const Y = new THREE.Vector3(0, 1, 0);
  const Pv = new THREE.Vector3();
  const Sv = new THREE.Vector3();
  const C = new THREE.Color();
  let total = 0;
  for (let v = 0; v < nv; v++) {
    const list = K.fans.filter((f) => f.v === v && f.keep <= dichte);
    if (!list.length) continue;
    const geo = trib3FanGeo(K.kind, v);
    const seeds = new Float32Array(list.length);
    const im = new THREE.InstancedMesh(geo, tribFanMat(K.kind === 'turm' ? 0.36 : 0.34), list.length);
    list.forEach((f, i) => {
      Q.setFromAxisAngle(Y, Math.atan2(-f.nx, -f.ny));
      Pv.set(f.x, f.h, f.y);
      Sv.setScalar(f.sc);
      M.compose(Pv, Q, Sv);
      im.setMatrixAt(i, M);
      im.setColorAt(i, C.set(K.A.colors[f.c]));
      seeds[i] = f.seed;
    });
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.frustumCulled = false;
    g.add(im);
    total += list.length;
  }
  g.userData.fans = total;
  return g;
}
function trib3Free(g) {
  if (!g) return;
  if (g.parent) g.parent.remove(g);
  g.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
}

// --- Boden um die Halle in 3D (tileSample): Glutschlund mit Felswänden bzw. Platz, Wiese und Hügel -----------------
function tribDistLocal(K, x, y) { return tribDist(K.P, x, y); }
const _tribC = typeof THREE !== 'undefined' ? new THREE.Color() : null;
function tribGround(kind, d, x, y) {
  const K = tribKind(kind);
  const dO = K.dW + K.A.wallW;
  const out = { h: 1.5, c: '#2a2226', hot: 0, soil: -1 };
  // Höhen nie unter −0,08: tiefer läge in 3D eine Wasserfläche darüber (Flüssigkeiten füllen jede Senke, drei-kern.js)
  if (kind === 'turm') {
    if (d < dO + 0.6) { out.h = 1.5; out.c = '#2a2226'; return out; }
    const n1 = tribNoise(x * 0.18, y * 0.18);
    const n2 = tribNoise(x * 0.07 + 31, y * 0.07 + 7);
    const t = Math.max(0, Math.min(1, (d - dO - 20) / 30));
    const cliff = t * t * (3 - 2 * t);
    // verbrannter Grund mit Buckeln, Lavaadern (Grat im Rauschen), nach außen Felswände
    out.h = Math.max(0, n1 - 0.55) * 1.2 + cliff * (24 + n2 * 14);
    const ader = 1 - Math.abs(tribNoise(x * 0.11 + 5, y * 0.11 + 13) * 2 - 1);
    if (cliff < 0.15 && ader > 0.9) { out.hot = 1; out.c = ader > 0.95 ? '#ffb04a' : '#e2541c'; out.h = -0.05; } else out.c = cliff > 0.5 ? (n1 > 0.5 ? '#4a3034' : '#3a2629') : n1 > 0.6 ? '#2c1c1e' : '#21161a';
    return out;
  }
  if (d < dO + 0.3) { out.h = 1.5; out.c = '#8e7656'; return out; }
  const n1 = tribNoise(x * 0.12, y * 0.12);
  const n2 = tribNoise(x * 0.05 + 11, y * 0.05 + 3);
  if (d < dO + 6.5) { out.h = 0; out.c = n1 > 0.5 ? '#b8a07c' : '#ac9472'; out.soil = 3; return out; }
  const t = Math.max(0, Math.min(1, (d - dO - 22) / 40));
  const hill = t * t * (3 - 2 * t);
  out.h = n1 * 0.5 + hill * (5 + n2 * 9);
  out.c = hill > 0.6 && n2 > 0.55 ? '#3e6a34' : n1 > 0.55 ? '#6a9a48' : '#5c8a3e';
  out.soil = 0;
  return out;
}
function tribHomeVenue() {
  const H = typeof V3 !== 'undefined' ? V3.home : null;
  if (H === TRIB3.homeRef) return TRIB3.venue;
  TRIB3.homeRef = H;
  TRIB3.venue = null;
  const key = H && H.key;
  if (key && (key.startsWith('dv') || key.startsWith('da'))) {
    const s = +key.slice(2);
    if (key[1] === 'v' && typeof TURM !== 'undefined' && s >= 0 && s < TURM.slots) TRIB3.venue = tribVenue('turm', s);
    if (key[1] === 'a' && typeof ARENA !== 'undefined' && s >= 0 && s < ARENA.slots) TRIB3.venue = tribVenue('arena', s);
  }
  return TRIB3.venue;
}
if (typeof tileSample === 'function') {
  const _tribTileSample = tileSample;
  tileSample = function (x, y, out) {
    const r = _tribTileSample(x, y, out);
    const V = tribHomeVenue();
    if (!V) return r;
    const R = V.R;
    const inSlot = x >= R.x && y >= R.y && x < R.x + R.w && y < R.y + R.h;
    // Boden der Halle bleibt; Fels (Wand) und alles außerhalb des Felds wird zur Kulisse
    if (inSlot && out.h < 1.2) return r;
    const lx = x + 0.5 - V.cx;
    const ly = y + 0.5 - V.cy;
    const d = tribDist(tribKind(V.kind).P, lx, ly);
    if (inSlot && d < 0.9) return r;
    const G = tribGround(V.kind, d, lx, ly);
    _tribC.set(G.c);
    out.h = G.h;
    out.r = _tribC.r; out.g = _tribC.g; out.b = _tribC.b;
    out.wet = 0;
    out.hot = G.hot;
    out.soil = G.soil;
    return out;
  };
}

// --- jedes Bild in 3D (aus v3SyncBounds): Gruppe zur Halle, schwarzen Kasten aus, Stimmung in die Shader ------------
function trib3Frame() {
  const V = tribHomeVenue();
  const dichte = tribDichte();
  if (!V) {
    if (TRIB3.group) TRIB3.group.visible = false;
    return;
  }
  const K = tribKind(V.kind);
  if (!TRIB3.group || TRIB3.groupKind !== V.kind || TRIB3.dichte !== dichte) {
    trib3Free(TRIB3.group);
    TRIB3.group = trib3Build(K);
    TRIB3.groupKind = V.kind;
    TRIB3.dichte = dichte;
    V3.scene.add(TRIB3.group);
  }
  TRIB3.group.visible = true;
  TRIB3.group.position.set(V.cx, 0, V.cy);
  // der Kasten um Dungeon-Hallen (Wände und Deckel) und der gemalte Horizont sind hier aus
  if (typeof BOUNDS3 !== 'undefined') {
    if (BOUNDS3.walls) for (const w of BOUNDS3.walls) w.visible = false;
    if (BOUNDS3.horizon) BOUNDS3.horizon.visible = false;
  }
  // die Grundfläche unter der Welt tief unter den Abgrund (im Turm), in der Arena knapp unter den Boden
  if (V3.under) V3.under.position.y = V.kind === 'turm' ? -16 : -0.9;
  TRIB3.uTime.value = game.time;
  TRIB3.uHype.value = tribHype();
}
if (typeof v3SyncBounds === 'function') {
  const _tribSyncBounds = v3SyncBounds;
  v3SyncBounds = function () {
    _tribSyncBounds();
    try { trib3Frame(); } catch (e) { /* nur Schmuck */ }
  };
}
