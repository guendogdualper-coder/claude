// Kartenformen (seit 14.68, docs/kartenformen.md): Jede Karte bekommt eine eigene Grundform statt Rauschen mit Seen –
// Inseln im Meer, Himmelsinseln über dem Wolkenmeer, eine tiefe Schlucht mit Plateaus, ein Fluss mit Delta, ein Wald
// aus Lichtungen. Welche Karte welche Form hat, steht in daten/kartenformen.js (MAP_FORMS, dort auch die neuen
// Städte). Hier steht der Baukasten:
//   - FORM_BUILDERS: je Form eine Funktion, die ein Raster der Karte füllt (KF: Land, Abgrund/Meer, dichter Wald,
//     Teich, Furt, Brücke). Neue Formen: eine Funktion hier ergänzen und in MAP_FORMS eintragen.
//   - mapFormShape (aus buildWorldMaps, welt.js): baut die Form, sorgt dafür, dass Stadt, Dungeon-Eingänge,
//     Endboss-Tore und Instanz-Ecken auf Land liegen, verbindet jede Insel ohne Landweg über ein Teleportstein-Paar
//     (bzw. eine Furt oder einen Pfad) mit der Stadt und schreibt das Ergebnis in die Karte.
//   - Hooks für Wege (layRoads), Brücken (tidyBridges), Wanderer, Instanz-Ecken, Aufräumen (mapFormCleanup) und 3D.
//   - mapFormReport: Erreichbarkeitstest (Flutfüllung über begehbare Kacheln und Teleportsteine ab der Stadt).
// Gleiche Welt für alle: Die Form hat je Karte einen eigenen Zufallsgenerator (WORLD_SEED + 6800 + 131 · Map); die
// Zufallszahlen aller anderen Karten bleiben unverändert (Kazehana und die Schattenkarten bitgenau wie vorher).
// Keine Bodenringe, Runen oder Sterne als Schmuck.

// Rastercodes einer Form
const KF = { LAND: 0, VOID: 1, TREES: 2, POND: 3, FORD: 4, BRIDGE: 5 };
const MAP_FORM_INFO = new Map(); // Map-Id -> Ergebnis der Form (für Wege, Steine, Aufräumen, Test)
let FORM_DENSE = null;           // Kacheln im Inneren eines dichten Waldes (3D zeichnet dort nur jeden dritten Baum)
// Zufallszahlen, die die Wanderer einer Karte früher (vor 14.68) aus dem gemeinsamen Generator verbraucht haben:
// So bleiben die Wanderer aller übrigen Karten, wo sie waren. Gemessen mit Stand 14.66 (siehe docs/kartenformen.md).
const KF_OLD_WANDER = { 4: 8, 5: 12, 6: 8, 2: 8, 7: 6, 8: 12, 3: 8, 9: 6, 10: 6, 11: 8, 12: 10, 13: 10, 14: 8, 15: 6, 16: 6 };

const mapFormOf = (id) => (typeof MAP_FORMS !== 'undefined' && MAP_FORMS[id]) || null;
function mapFormReset() {
  MAP_FORM_INFO.clear();
  FORM_BRIDGE.clear();
  FORM_DENSE = null;
}
function mapFormInfo(id) {
  return MAP_FORM_INFO.get(id) || null;
}
function formDense3(i) {
  return FORM_DENSE ? FORM_DENSE[i] : 0;
}
// Liegt der Rand der Karte (Region ab rx, ry) im Wolkenmeer oder Meer? Bodenart oder null (3D, drei-kern.js)
function mapFormVoidEdge(rx, ry) {
  const wm = WORLD_MAPS.find((m) => m.region[0] === rx && m.region[1] === ry);
  const F = wm && mapFormOf(wm.id);
  return F && F.voidEdge ? GROUND[F.void] : null;
}
// Höhe der Grundfläche unter der 3D-Welt (drei-kern.js): unter der tiefsten Flüssigkeit der Karte, sonst wie bisher
function mapFormUnderY(rx, ry) {
  const wm = WORLD_MAPS.find((m) => m.region[0] === rx && m.region[1] === ry);
  const F = wm && mapFormOf(wm.id);
  const towns = wm && townLayout(wm.id);
  let depth = 0;
  for (const g of [F && F.void, towns && towns.liquid]) if (g && LIQUID3_DEPTH[GROUND[g]]) depth = Math.max(depth, LIQUID3_DEPTH[GROUND[g]]);
  return depth ? -depth - 0.4 : -0.9;
}
// Gehört (x, y) zum Abgrund/Meer der Form? (buildWorldMaps lässt diese Kacheln vor der Stadtmauer, wie sie sind)
function mapFormKeepsTile(id, x, y) {
  const info = MAP_FORM_INFO.get(id);
  if (!info) return false;
  const k = (y - info.ry) * info.W + (x - info.rx);
  return k >= 0 && k < info.mask.length && (info.mask[k] === KF.VOID || info.mask[k] === KF.POND);
}

// --- Werkzeuge für die Formen ----------------------------------------------------------------------------------
// Alle Lagen in Kacheln ab der linken oberen Ecke der Karte (0 … 359, 0 … 219).
function kfContext(wm, F, rng) {
  const [rx, ry, W, H] = wm.region;
  const mask = new Uint8Array(W * H);
  const bdir = new Uint8Array(W * H); // 1: Brücke waagrecht, 2: senkrecht
  const ctx = {
    wm, F, rx, ry, W, H, rng, mask, bdir,
    cx: wm.cx - rx, cy: wm.cy - ry, camp: wm.camp || CAMP_HALF,
    noise: makeNoise(rng, F.cell || 9),
    fine: makeNoise(rng, 4),
    stones: [], keep: [],
    inside: (x, y) => x >= MAP_BORDER && y >= MAP_BORDER && x < W - MAP_BORDER && y < H - MAP_BORDER,
    get: (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? KF.VOID : mask[y * W + x]),
    set(x, y, c) {
      if (x >= 0 && y >= 0 && x < W && y < H) mask[y * W + x] = c;
    },
    fill(c) {
      mask.fill(c);
    },
    // Scheibe mit Radius r (nur Kacheln, für die only(alterCode) gilt)
    disc(x, y, r, c, only) {
      for (let ty = Math.floor(y - r); ty <= Math.ceil(y + r); ty++) {
        for (let tx = Math.floor(x - r); tx <= Math.ceil(x + r); tx++) {
          if (Math.hypot(tx + 0.5 - x, ty + 0.5 - y) > r) continue;
          if (only && !only(ctx.get(tx, ty))) continue;
          ctx.set(tx, ty, c);
        }
      }
    },
    // unregelmäßige Ellipse: Rand mit Rauschen (wob = Anteil des Radius), jede Form mit eigenem Versatz im Rauschen
    blob(x, y, rx0, ry0, c, wob = 0.3, only) {
      const ox = rng() * 400;
      const oy = rng() * 400;
      const R = 1 + wob;
      for (let ty = Math.floor(y - ry0 * R); ty <= Math.ceil(y + ry0 * R); ty++) {
        for (let tx = Math.floor(x - rx0 * R); tx <= Math.ceil(x + rx0 * R); tx++) {
          const d = Math.hypot((tx + 0.5 - x) / rx0, (ty + 0.5 - y) / ry0);
          const n = ctx.noise(tx * 1.6 + ox, ty * 1.6 + oy) * 0.7 + ctx.fine(tx + ox, ty + oy) * 0.3;
          if (d > 1 + (n - 0.5) * 2 * wob) continue;
          if (only && !only(ctx.get(tx, ty))) continue;
          ctx.set(tx, ty, c);
        }
      }
    },
    // Linienzug mit wechselnder Breite (w0 … w1 nach dem Rauschen)
    stroke(pts, w0, w1, c, only) {
      for (let k = 1; k < pts.length; k++) {
        const [ax, ay] = pts[k - 1];
        const [bx, by] = pts[k];
        const len = Math.hypot(bx - ax, by - ay);
        const steps = Math.max(1, Math.ceil(len / 0.5));
        for (let s = 0; s <= steps; s++) {
          const px = ax + ((bx - ax) * s) / steps;
          const py = ay + ((by - ay) * s) / steps;
          const w = w0 + (w1 - w0) * ctx.noise(px * 1.3 + 50, py * 1.3 + 90);
          ctx.disc(px, py, w / 2, c, only);
        }
      }
    },
    // gewundener Lauf von a nach b: Punkte alle ~4 Kacheln, seitlich versetzt (amp Kacheln, Rauschen)
    meander(pts, amp = 8, step = 4) {
      const out = [];
      const ox = rng() * 300;
      for (let k = 1; k < pts.length; k++) {
        const [ax, ay] = pts[k - 1];
        const [bx, by] = pts[k];
        const len = Math.hypot(bx - ax, by - ay);
        const n = Math.max(1, Math.round(len / step));
        const nx = -(by - ay) / (len || 1);
        const ny = (bx - ax) / (len || 1);
        for (let s = k === 1 ? 0 : 1; s <= n; s++) {
          const t = s / n;
          const fade = Math.min(1, t * 3, (1 - t) * 3);
          const off = (ctx.noise(ox + (ax + (bx - ax) * t) * 0.35, (ay + (by - ay) * t) * 0.35) - 0.5) * 2 * amp * fade;
          out.push([ax + (bx - ax) * t + nx * off, ay + (by - ay) * t + ny * off]);
        }
      }
      return out;
    },
    // Brücke (achsparallel, Breite w) – nur über Abgrund/Wasser, Land darunter bleibt Land
    bridge(x0, y0, x1, y1, w = 3) {
      const horiz = Math.abs(x1 - x0) >= Math.abs(y1 - y0);
      const a0 = Math.round(horiz ? Math.min(x0, x1) : Math.min(y0, y1));
      const a1 = Math.round(horiz ? Math.max(x0, x1) : Math.max(y0, y1));
      const c0 = Math.round((horiz ? (y0 + y1) / 2 : (x0 + x1) / 2) - (w - 1) / 2);
      for (let a = a0; a <= a1; a++) {
        for (let c = c0; c < c0 + w; c++) {
          const x = horiz ? a : c;
          const y = horiz ? c : a;
          const m = ctx.get(x, y);
          if (m !== KF.VOID && m !== KF.POND) continue;
          ctx.set(x, y, KF.BRIDGE);
          bdir[y * W + x] = horiz ? 1 : 2;
        }
      }
    },
    // gerade Furt (Land, das durch Wasser führt) oder Pfad (Land durch dichten Wald), Breite w
    ford(x0, y0, x1, y1, w = 4, c = KF.FORD) {
      ctx.stroke([[x0, y0], [x1, y1]], w, w, c, (m) => m !== KF.LAND && m !== KF.BRIDGE);
    },
    // Teleportstein-Paar (Kacheln der beiden Steine), um jeden Stein ein Stück Land
    stone(ax, ay, bx, by) {
      for (const [x, y] of [[ax, ay], [bx, by]]) ctx.disc(x + 0.5, y + 0.5, 1.6, KF.LAND, (m) => m !== KF.BRIDGE);
      ctx.stones.push([ax, ay, bx, by]);
    },
    // Kachel auf Land kurz vor dem Ufer, von (ax, ay) in Richtung (bx, by)
    shoreToward(ax, ay, bx, by, inset = 3) {
      const len = Math.hypot(bx - ax, by - ay) || 1;
      let last = [Math.round(ax), Math.round(ay)];
      const trail = [];
      for (let s = 0; s <= len; s += 0.5) {
        const x = Math.floor(ax + ((bx - ax) * s) / len);
        const y = Math.floor(ay + ((by - ay) * s) / len);
        if (ctx.get(x, y) !== KF.LAND) break;
        trail.push([x, y]);
      }
      if (trail.length) last = trail[Math.max(0, trail.length - 1 - inset * 2)];
      return last;
    }
  };
  return ctx;
}

// Ziele einer Karte, die auf Land liegen müssen (wie placeDungeonEntrance / instCornerEntrance / layRoads sie legen)
function mapFormTargets(wm) {
  const [rx, ry, rw, rh] = wm.region;
  const out = [];
  for (const d of DUNGEONS) {
    for (const e of [d.entry, d.entry2]) {
      if (!e || (e.map || 1) !== wm.id) continue;
      if (e.corner) {
        out.push({ x: (e.corner[1] === 'r' ? rw - 22 : 22), y: (e.corner[0] === 'b' ? rh - 16 : 16), r: 7, corner: true });
        continue;
      }
      const [dx, dy] = e.dir;
      const x = Math.round(wm.cx + dx * e.dist + (dy ? 1 : 0) * e.side) - rx;
      const y = Math.round(wm.cy + dy * e.dist + (dx ? 1 : 0) * e.side) - ry;
      out.push({ x, y, r: 4.5 }, { x, y: y + 3, r: 3.5 });
    }
  }
  return out;
}

// Stadt und Ziele auf Land
function kfKeep(ctx, F) {
  const H = ctx.camp;
  const ring = Object.assign({ n: 3, s: 3, w: 3, e: 3 }, F.ring || {});
  for (let dy = -H - 3; dy <= H + 3; dy++) {
    for (let dx = -H - 3; dx <= H + 3; dx++) {
      const c = Math.max(Math.abs(dx), Math.abs(dy));
      if (c > H) {
        const side = Math.abs(dy) >= Math.abs(dx) ? (dy < 0 ? 'n' : 's') : dx < 0 ? 'w' : 'e';
        if (c > H + ring[side]) continue;
      }
      ctx.set(ctx.cx + dx, ctx.cy + dy, KF.LAND);
    }
  }
  for (const t of mapFormTargets(ctx.wm)) {
    ctx.disc(t.x + 0.5, t.y + 0.5, t.r, KF.LAND);
    ctx.keep.push(t);
  }
}

// Zusammenhang: kleine Splitter weg, jede übrige Insel ohne Landweg zur Stadt bekommt eine Verbindung (F.link:
// 'stone' Teleportstein-Paar, 'ford' Furt, 'pfad' Pfad durch den Wald), immer zur nächstgelegenen schon verbundenen
// Fläche (wie ein aufspannender Baum ab der Stadt)
function kfConnect(ctx, F) {
  const { W, H, mask } = ctx;
  const B = MAP_BORDER + 1;
  const walk = (k) => mask[k] === KF.LAND || mask[k] === KF.FORD || mask[k] === KF.BRIDGE;
  const label = () => {
    const comp = new Int32Array(W * H).fill(-1);
    const sizes = [];
    const stack = [];
    for (let y = B; y < H - B; y++) {
      for (let x = B; x < W - B; x++) {
        const k0 = y * W + x;
        if (comp[k0] >= 0 || !walk(k0)) continue;
        const id = sizes.length;
        let n = 0;
        comp[k0] = id;
        stack.push(k0);
        while (stack.length) {
          const k = stack.pop();
          n++;
          const kx = k % W;
          const ky = (k - kx) / W;
          for (const [nx, ny] of [[kx + 1, ky], [kx - 1, ky], [kx, ky + 1], [kx, ky - 1]]) {
            if (nx < B || ny < B || nx >= W - B || ny >= H - B) continue;
            const j = ny * W + nx;
            if (comp[j] >= 0 || !walk(j)) continue;
            comp[j] = id;
            stack.push(j);
          }
        }
        sizes.push(n);
      }
    }
    return { comp, sizes };
  };
  // Rand der Karte gehört nie zu einer Insel
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!ctx.inside(x, y) && walk(y * W + x)) mask[y * W + x] = F.edgeCode != null ? F.edgeCode : KF.VOID;
  let { comp, sizes } = label();
  const keepIds = new Set();
  const townId = comp[ctx.cy * W + ctx.cx];
  keepIds.add(townId);
  for (const t of ctx.keep) { const id = comp[t.y * W + t.x]; if (id >= 0) keepIds.add(id); }
  for (const [ax, ay, bx, by] of ctx.stones) for (const [x, y] of [[ax, ay], [bx, by]]) keepIds.add(comp[y * W + x]);
  // Splitter: zu klein zum Spielen – je nach Form Felsnadel mit Bäumen oder wieder Abgrund/Meer/Wald
  const minIsland = F.minIsland || 90;
  let changed = false;
  for (let k = 0; k < W * H; k++) {
    const id = comp[k];
    if (id < 0 || keepIds.has(id) || sizes[id] >= minIsland) continue;
    mask[k] = F.islet === 'trees' ? KF.TREES : F.fillCode != null ? F.fillCode : KF.VOID;
    changed = true;
  }
  if (changed) ({ comp, sizes } = label());
  // Gruppen (Union-Find über die Inseln), Teleportsteine der Form verbinden schon
  const parent = sizes.map((_, i) => i);
  const root = (i) => { while (parent[i] !== i) i = parent[i] = parent[parent[i]]; return i; };
  const join = (a, b) => { a = root(a); b = root(b); if (a !== b) parent[b] = a; };
  for (const [ax, ay, bx, by] of ctx.stones) join(comp[ay * W + ax], comp[by * W + bx]);
  const town = comp[ctx.cy * W + ctx.cx];
  // Kandidaten je Insel: Kacheln nah am Ufer; für Steine nur mit festem Land rundherum (5 × 5) und Abstand zur Stadt,
  // zu den Zielen und zu anderen Steinen
  const mode = F.link || 'stone';
  const shore = (x, y) => {
    for (let r = 1; r <= (mode === 'stone' ? 6 : 1); r++) {
      for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r]]) if (!walk((y + dy) * W + x + dx)) return true;
    }
    return false;
  };
  const solid = (x, y) => {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (mask[(y + dy) * W + x + dx] !== KF.LAND) return false;
    return true;
  };
  const used = () => ctx.stones.flatMap(([ax, ay, bx, by]) => [[ax, ay], [bx, by]]);
  const okStone = (x, y, taken) => {
    if (Math.max(Math.abs(x - ctx.cx), Math.abs(y - ctx.cy)) <= ctx.camp + 4) return false;
    if (ctx.keep.some((t) => Math.hypot(t.x - x, t.y - y) < t.r + 5)) return false;
    return !taken.some(([sx, sy]) => Math.hypot(sx - x, sy - y) < 9);
  };
  const cand = new Map();
  const S = mode === 'stone' ? 2 : 1;
  for (let y = B + 2; y < H - B - 2; y += S) {
    for (let x = B + 2; x < W - B - 2; x += S) {
      const k = y * W + x;
      if (!walk(k) || !shore(x, y)) continue;
      if (mode === 'stone' && !solid(x, y)) continue;
      const id = comp[k];
      if (!cand.has(id)) cand.set(id, []);
      cand.get(id).push([x, y]);
    }
  }
  for (let guard = 0; guard < 80; guard++) {
    const groups = new Set();
    for (let i = 0; i < sizes.length; i++) if (sizes[i] && root(i) !== root(town)) groups.add(i);
    if (!groups.size) break;
    const taken = used();
    const mine = [];
    const theirs = [];
    for (const [id, list] of cand) {
      if (root(id) === root(town)) mine.push(...list);
      else if (groups.has(id)) for (const p of list) theirs.push([p[0], p[1], id]);
    }
    let best = null;
    let bd = Infinity;
    for (const [ax, ay] of mine) {
      if (mode === 'stone' && !okStone(ax, ay, taken)) continue;
      for (const [bx, by, id] of theirs) {
        const d = (ax - bx) ** 2 + (ay - by) ** 2;
        if (d >= bd) continue;
        if (mode === 'stone' && !okStone(bx, by, taken)) continue;
        bd = d;
        best = [ax, ay, bx, by, id];
      }
    }
    if (!best) {
      // keine Verbindung möglich: die übrigen Inseln wieder zu Abgrund/Meer/Wald
      for (let k = 0; k < W * H; k++) if (comp[k] >= 0 && root(comp[k]) !== root(town)) mask[k] = F.fillCode != null ? F.fillCode : KF.VOID;
      break;
    }
    const [ax, ay, bx, by, id] = best;
    if (mode === 'stone') ctx.stones.push([ax, ay, bx, by]);
    else ctx.ford(ax + 0.5, ay + 0.5, bx + 0.5, by + 0.5, F.fordWidth || 4, mode === 'pfad' ? KF.LAND : KF.FORD);
    join(town, id);
  }
}

// Form in die Karte schreiben
function kfApply(ctx, F, ground, obj, deco, zoneIdx) {
  const { wm, W, H, mask, rx, ry } = ctx;
  const voidG = GROUND[F.void || 'WATER'];
  const pondG = GROUND[F.pond || 'WATER'];
  const H0 = ctx.camp;
  if (!FORM_DENSE && F.form === 'lichtungen') FORM_DENSE = new Uint8Array(MAP_W * MAP_H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = y * W + x;
      const i = (ry + y) * MAP_W + rx + x;
      const zone = ZONES[zoneIdx[i]];
      const border = !ctx.inside(x, y);
      const m = mask[k];
      if (border) {
        // Rand: im Wolkenmeer bzw. offenen Meer ohne Felsen (rockSolid hält trotzdem auf)
        if (F.voidEdge) {
          ground[i] = voidG;
          obj[i] = OBJ.NONE;
          deco[i] = DECO.NONE;
        }
        continue;
      }
      // die Stadt selbst legt applyTownLayout (danach)
      if (Math.max(Math.abs(x - ctx.cx), Math.abs(y - ctx.cy)) <= H0) continue;
      const h = townTileHash(rx + x, ry + y);
      if (m === KF.VOID) {
        ground[i] = voidG;
        obj[i] = OBJ.NONE;
        deco[i] = DECO.NONE;
      } else if (m === KF.TREES) {
        if (LIQUID.has(ground[i])) ground[i] = GROUND[zone.ground];
        obj[i] = OBJ[F.wallTree || zone.treeObj] || OBJ.PINE;
        deco[i] = DECO.NONE;
        // 1: ringsum (5 × 5) Wald – Inneres; 2: die zweite Reihe vom Waldrand (3 × 3 Wald); 3: der Waldrand selbst
        if (FORM_DENSE) {
          let r = 0;
          while (r < 2) {
            let all = true;
            for (let dy = -(r + 1); dy <= r + 1 && all; dy++) for (let dx = -(r + 1); dx <= r + 1; dx++) if (mask[k + dy * W + dx] !== KF.TREES) { all = false; break; }
            if (!all) break;
            r++;
          }
          FORM_DENSE[i] = r === 2 ? 1 : r === 1 ? 2 : 3;
        }
      } else if (m === KF.POND) {
        ground[i] = pondG;
        obj[i] = OBJ.NONE;
        deco[i] = DECO.NONE;
      } else if (m === KF.FORD) {
        ground[i] = GROUND[F.fordGround || 'SAND'];
        obj[i] = OBJ.NONE;
        deco[i] = h % 100 < 22 ? DECO.PEBBLE : DECO.NONE;
      } else if (m === KF.BRIDGE) {
        // unter der Brücke liegt, was vorher da war (Abgrund bzw. Wasser)
        if (!LIQUID.has(ground[i]) || ground[i] !== voidG) ground[i] = voidG;
        obj[i] = OBJ.NONE;
        deco[i] = DECO.BRIDGE;
        FORM_BRIDGE.add(i);
        BRIDGE_DIR.set(i, ctx.bdir[k] === 1);
      } else if (LIQUID.has(ground[i]) && !F.keepLakes) {
        // alte Seen aus dem Rauschen werden Land (die Form bringt ihre eigenen Gewässer mit)
        ground[i] = GROUND[zone.alt && h % 3 === 0 ? zone.alt : zone.ground];
        deco[i] = h % 100 < 10 ? DECO.TUFT : DECO.NONE;
      }
      // Land am Abgrund: keine Bäume direkt an der Kante (sonst stehen sie halb in der Luft)
      if ((m === KF.LAND || m === KF.FORD) && F.clearEdge && obj[i] !== OBJ.NONE && obj[i] !== OBJ.ROCK) {
        for (const j of [k - 1, k + 1, k - W, k + W]) if (mask[j] === KF.VOID) { obj[i] = OBJ.NONE; break; }
      }
    }
  }
  // Ergebnis für Wege, Steine und Test
  const block = new Uint8Array(W * H);
  const bridge = new Uint8Array(W * H);
  const voidBlocks = F.roadsCross ? 0 : 1;
  for (let k = 0; k < W * H; k++) {
    const m = mask[k];
    if ((m === KF.VOID && voidBlocks) || m === KF.TREES || m === KF.POND) block[k] = 1;
    if (m === KF.BRIDGE) bridge[k] = 1;
  }
  const stones = ctx.stones.map(([ax, ay, bx, by]) => [rx + ax, ry + ay, rx + bx, ry + by]);
  const g = F.gates || {};
  MAP_FORM_INFO.set(wm.id, {
    id: wm.id, F, rx, ry, W, H, mask, block, bridge, stones, voidG,
    // Reihenfolge wie DIRS in layRoads: Ost, West, Süd, Nord
    gates: [g.e !== false, g.w !== false, g.s !== false, g.n !== false],
    seeds: stones.flatMap(([ax, ay, bx, by]) => [[ax, ay], [bx, by]]),
    cleaned: 0
  });
}

// Einstieg aus buildWorldMaps (welt.js)
function mapFormShape(wm, ground, obj, deco, zoneIdx) {
  const F = mapFormOf(wm.id);
  const build = F && FORM_BUILDERS[F.form];
  if (!build) return;
  const ctx = kfContext(wm, F, mulberry32(WORLD_SEED + 6800 + wm.id * 131));
  build(ctx, F);
  kfKeep(ctx, F);
  kfConnect(ctx, F);
  kfApply(ctx, F, ground, obj, deco, zoneIdx);
}

// Nach applyTownLayout: Teleportsteine der Form zu denen der Stadt (welt.js generateWorld)
function mapFormAfterTown(mp) {
  const info = MAP_FORM_INFO.get(mp.id);
  if (!info) return;
  if (!mp.stones) mp.stones = [];
  for (const [ax, ay, bx, by] of info.stones) {
    const a = mp.stones.length;
    mp.stones.push({ map: mp.id, tx: ax, ty: ay, x: (ax + 0.5) * TILE, y: (ay + 0.5) * TILE, to: a + 1, form: true });
    mp.stones.push({ map: mp.id, tx: bx, ty: by, x: (bx + 0.5) * TILE, y: (by + 0.5) * TILE, to: a, form: true });
  }
}

// Flutfüllung ab der Ankunft in der Stadt über begehbare Kacheln und Teleportsteine (auf den Kartenfeldern)
function kfFlood(wm, mp, pass) {
  const [rx, ry, rw, rh] = wm.region;
  const seen = new Uint8Array(rw * rh);
  const hop = new Map();
  for (const s of mp && mp.stones ? mp.stones : []) {
    const t = mp.stones[s.to];
    if (t) hop.set(s.ty * MAP_W + s.tx, [t.tx, t.ty]);
  }
  const sx = Math.floor((mp ? mp.spawn.x : wm.cx * TILE) / TILE);
  const sy = Math.floor((mp ? mp.spawn.y : wm.cy * TILE) / TILE);
  const q = [[sx, sy]];
  seen[(sy - ry) * rw + sx - rx] = 1;
  while (q.length) {
    const [x, y] = q.pop();
    const h = hop.get(y * MAP_W + x);
    const next = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
    if (h) next.push(h);
    for (const [nx, ny] of next) {
      if (nx < rx || ny < ry || nx >= rx + rw || ny >= ry + rh) continue;
      const j = (ny - ry) * rw + nx - rx;
      if (seen[j] || !pass(nx, ny)) continue;
      seen[j] = 1;
      q.push([nx, ny]);
    }
  }
  return seen;
}

// Nach allen Wegen und Städten: Unerreichbares wird Abgrund/Meer bzw. dichter Wald (nur außerhalb der Stadt)
function mapFormCleanup(maps, ground, obj, deco) {
  kfMapsNow = maps;
  for (const mp of maps) {
    const info = MAP_FORM_INFO.get(mp.id);
    if (!info) continue;
    const wm = WORLD_MAPS.find((m) => m.id === mp.id);
    const [rx, ry, rw, rh] = wm.region;
    const pass = (x, y) => {
      if (x < rx + MAP_BORDER || y < ry + MAP_BORDER || x >= rx + rw - MAP_BORDER || y >= ry + rh - MAP_BORDER) return false;
      const i = y * MAP_W + x;
      if (LIQUID.has(ground[i]) && deco[i] !== DECO.BRIDGE) return false;
      return obj[i] === OBJ.NONE || obj[i] === OBJ.ROCK;
    };
    const seen = kfFlood(wm, mp, pass);
    const H = mp.half != null ? mp.half : wm.camp || CAMP_HALF;
    const trees = info.F.fill === 'trees';
    const tree = OBJ[info.F.wallTree || 'PINE'];
    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        if (seen[(y - ry) * rw + x - rx] || !pass(x, y)) continue;
        if (Math.max(Math.abs(x - wm.cx), Math.abs(y - wm.cy)) <= H) continue;
        const i = y * MAP_W + x;
        if (trees) obj[i] = tree;
        else {
          ground[i] = info.voidG;
          obj[i] = OBJ.NONE;
          deco[i] = DECO.NONE;
        }
        info.cleaned++;
      }
    }
  }
}

// Anteil der Monstergruppen auf einer Karte mit Form (gegner.js populateWorld; 1 ohne Angabe)
function mapFormMobScale(id) {
  const F = mapFormOf(id);
  return F && F.mobScale ? F.mobScale : 1;
}
// Wanderer (welt.js): eigener Zufallsgenerator je Karte mit Form, danach rückt der gemeinsame wie früher weiter
function mapFormWanderRng(id) {
  if (!MAP_FORM_INFO.has(id)) return null;
  return { rng: mulberry32(WORLD_SEED + 6900 + id * 7), skip: KF_OLD_WANDER[id] || 0, found: 3 };
}
// Instanz-Ecken (instanzen.js): Suche ab der Ankunft in der Stadt, über die Teleportsteine hinweg
function mapFormCornerStart(wm) {
  if (!MAP_FORM_INFO.has(wm.id)) return null;
  const mp = (kfMapsNow || []).find((m) => m.id === wm.id);
  if (!mp) return null;
  const links = new Map();
  for (const s of mp.stones || []) {
    const t = mp.stones[s.to];
    if (t) links.set(s.ty * MAP_W + s.tx, [t.tx, t.ty]);
  }
  return { start: [Math.floor(mp.spawn.x / TILE), Math.floor(mp.spawn.y / TILE)], links };
}
// Städte der laufenden Erzeugung (generateWorld setzt sie, bevor die Eingänge gelegt werden)
let kfMapsNow = null;

// --- Die Formen -----------------------------------------------------------------------------------------------
// Jede Form bekommt ctx (Werkzeuge oben) und ihre Angaben aus MAP_FORMS. Lagen in Kacheln ab der linken oberen Ecke.
const FORM_BUILDERS = {
  // Inseln im Meer bzw. Himmelsinseln über dem Wolkenmeer: islands [x, y, rx, ry, (wob)], links [a, b, 'bruecke' |
  // 'stein'], islets: Anzahl kleiner Felsnadeln (unbegehbar, mit Bäumen), lakes: Teiche auf den Inseln
  inseln(ctx, F) {
    ctx.fill(KF.VOID);
    F.islands.forEach(([x, y, rx0, ry0, wob]) => ctx.blob(x, y, rx0, ry0, KF.LAND, wob == null ? 0.32 : wob));
    // Buchten: ein paar Einschnitte vom Meer her (nur am Rand großer Inseln)
    for (let k = 0; k < (F.bays || 0); k++) {
      const [x, y, rx0, ry0] = F.islands[Math.floor(ctx.rng() * F.islands.length)];
      const a = ctx.rng() * Math.PI * 2;
      const bx = x + Math.cos(a) * rx0 * 0.95;
      const by = y + Math.sin(a) * ry0 * 0.95;
      if (Math.hypot(bx - ctx.cx, by - ctx.cy) < ctx.camp + 12) continue;
      ctx.blob(bx, by, 4 + ctx.rng() * 4, 3 + ctx.rng() * 3, KF.VOID, 0.35);
    }
    for (const [x, y, r] of F.lakes || []) ctx.blob(x, y, r, r * 0.8, KF.POND, 0.3);
    // Felsnadeln: winzige Inseln, die man nicht betreten kann (der Zusammenhang macht sie zu Wald/Fels)
    let n = 0;
    for (let tries = 0; tries < 400 && n < (F.islets || 0); tries++) {
      const x = 8 + ctx.rng() * (ctx.W - 16);
      const y = 8 + ctx.rng() * (ctx.H - 16);
      let free = true;
      for (let dy = -5; dy <= 5 && free; dy++) for (let dx = -5; dx <= 5; dx++) if (ctx.get(Math.floor(x + dx), Math.floor(y + dy)) !== KF.VOID) { free = false; break; }
      if (!free) continue;
      ctx.disc(x, y, 1.2 + ctx.rng() * 1.6, KF.LAND);
      n++;
    }
    const centre = (i) => F.islands[i];
    for (const [a, b, kind] of F.links || []) {
      const [ax, ay, arx, ary] = centre(a);
      const [bx, by, brx, bry] = centre(b);
      if (kind === 'bruecke') {
        // achsparallel auf der Mitte der Überlappung
        if (Math.abs(bx - ax) >= Math.abs(by - ay)) {
          const y = Math.round((Math.max(ay - ary, by - bry) + Math.min(ay + ary, by + bry)) / 2);
          ctx.bridge(ax, y, bx, y, F.bridgeWidth || 3);
        } else {
          const x = Math.round((Math.max(ax - arx, bx - brx) + Math.min(ax + arx, bx + brx)) / 2);
          ctx.bridge(x, ay, x, by, F.bridgeWidth || 3);
        }
      } else {
        const [sx, sy] = ctx.shoreToward(ax, ay, bx, by, 3);
        const [tx, ty] = ctx.shoreToward(bx, by, ax, ay, 3);
        ctx.stone(sx, sy, tx, ty);
      }
    }
  },

  // Tiefe Schlucht mit Plateaus: main/branches Linienzüge (gewunden), Breite width [min, max], spurs kurze
  // Seitenschluchten, bridges [x0, y0, x1, y1] Hängebrücken (achsparallel), arches Felsbrücken (Land, Breite)
  schlucht(ctx, F) {
    ctx.fill(KF.LAND);
    const [w0, w1] = F.width || [8, 13];
    ctx.stroke(ctx.meander(F.main, F.amp || 7), w0, w1, KF.VOID);
    for (const br of F.branches || []) ctx.stroke(ctx.meander(br, (F.amp || 7) * 0.7), w0 * 0.75, w1 * 0.75, KF.VOID);
    for (const sp of F.spurs || []) ctx.stroke(ctx.meander(sp, 3), w0 * 0.45, w1 * 0.55, KF.VOID);
    // Kolke: runde Einbrüche am Rand der Schlucht
    for (const [x, y, r] of F.sinks || []) ctx.blob(x, y, r, r * 0.85, KF.VOID, 0.3);
    for (const [x0, y0, x1, y1, w] of F.arches || []) ctx.ford(x0, y0, x1, y1, w || 5, KF.FORD);
    for (const [x0, y0, x1, y1, w] of F.bridges || []) ctx.bridge(x0, y0, x1, y1, w || 3);
  },

  // Fluss mit Delta: river Linienzug, arms Mündungsarme, lagoon [x, y, rx, ry] Lagune, fords Furten, ponds Oasen
  fluss(ctx, F) {
    ctx.fill(KF.LAND);
    const [w0, w1] = F.width || [7, 10];
    ctx.stroke(ctx.meander(F.river, F.amp || 6), w0, w1, KF.VOID);
    for (const arm of F.arms || []) ctx.stroke(ctx.meander(arm, (F.amp || 6) * 0.6), w0 * 0.55, w1 * 0.6, KF.VOID);
    for (const tr of F.tributaries || []) ctx.stroke(ctx.meander(tr, 4), w0 * 0.45, w1 * 0.5, KF.VOID);
    for (const [x, y, rx0, ry0] of F.lagoons || []) ctx.blob(x, y, rx0, ry0, KF.VOID, 0.3);
    for (const [x, y, r] of F.ponds || []) ctx.blob(x, y, r, r * 0.75, KF.POND, 0.3);
    for (const [x0, y0, x1, y1, w] of F.fords || []) ctx.ford(x0, y0, x1, y1, w || 4, KF.FORD);
  },

  // Lichtungswald: dichter Wald (unbegehbar), darin Lichtungen, verbunden durch gewundene Waldpfade
  // clearings [x, y, r] fest, dazu count weitere (Abstand gap), extra: zusätzliche Querverbindungen (Schleifen)
  lichtungen(ctx, F) {
    ctx.fill(KF.TREES);
    const C = (F.clearings || []).map(([x, y, r]) => ({ x, y, r }));
    C.unshift({ x: ctx.cx, y: ctx.cy, r: ctx.camp + 9 });
    const pad = MAP_BORDER + 10;
    for (let tries = 0; tries < 3000 && C.length < (F.count || 18) + 1; tries++) {
      const r = (F.rMin || 8) + ctx.rng() * ((F.rMax || 18) - (F.rMin || 8));
      const x = pad + r + ctx.rng() * (ctx.W - 2 * (pad + r));
      const y = pad + r * 0.8 + ctx.rng() * (ctx.H - 2 * (pad + r * 0.8));
      if (C.some((c) => Math.hypot(c.x - x, c.y - y) < c.r + r + (F.gap || 10))) continue;
      C.push({ x, y, r });
    }
    for (const c of C) ctx.blob(c.x, c.y, c.r, c.r * 0.85, KF.LAND, 0.28);
    // Pfade: aufspannender Baum über die Mittelpunkte, dazu ein paar Schleifen
    const inTree = [0];
    const edges = [];
    while (inTree.length < C.length) {
      let best = null;
      let bd = Infinity;
      for (const a of inTree) {
        for (let b = 0; b < C.length; b++) {
          if (inTree.includes(b)) continue;
          const d = Math.hypot(C[a].x - C[b].x, C[a].y - C[b].y) - C[a].r - C[b].r;
          if (d < bd) { bd = d; best = [a, b]; }
        }
      }
      edges.push(best);
      inTree.push(best[1]);
    }
    for (let k = 0; k < (F.extra || 4); k++) {
      const a = Math.floor(ctx.rng() * C.length);
      let b = -1;
      let bd = Infinity;
      for (let j = 0; j < C.length; j++) {
        if (j === a || edges.some(([p, q]) => (p === a && q === j) || (p === j && q === a))) continue;
        const d = Math.hypot(C[a].x - C[j].x, C[a].y - C[j].y);
        if (d < bd) { bd = d; b = j; }
      }
      if (b >= 0) edges.push([a, b]);
    }
    const [p0, p1] = F.pathWidth || [4, 6];
    for (const [a, b] of edges) ctx.stroke(ctx.meander([[C[a].x, C[a].y], [C[b].x, C[b].y]], F.amp || 6, 3), p0, p1, KF.LAND);
    // Teiche und Haine in manchen Lichtungen (nicht in der der Stadt)
    C.slice(1).forEach((c, k) => {
      if (k % 3 === 0 && c.r > 10) ctx.blob(c.x + c.r * 0.3, c.y - c.r * 0.2, c.r * 0.3, c.r * 0.24, KF.POND, 0.3);
      else if (k % 3 === 1 && c.r > 11) ctx.disc(c.x, c.y, 1.6, KF.TREES);
    });
    ctx.clearings = C;
  }
};

// --- Erreichbarkeitstest (im Spiel aufrufbar: mapFormReport()) ---------------------------------------------------
// Je Karte: Flutfüllung ab der Ankunft in der Stadt über begehbare Kacheln (tileBlocked) und Teleportsteine. Geprüft
// werden alle Leute und Tore (Weltentor, Dungeon-Eingänge mit zweitem Eingang, Endboss-Tore, Instanz-Ecken), die
// Teleportsteine, die Wanderer und Hausbewohner und je Monstergruppe und Seelenstein-Stufe 20 Stellen, an denen sie
// erscheinen können. unreachable: begehbare Kacheln der Karte, die man nicht erreicht (Karten mit Form: 0).
function mapFormReport() {
  const w = game.world;
  const out = [];
  for (const wm of WORLD_MAPS) {
    const [rx, ry, rw, rh] = wm.region;
    const mp = wm.id === 1 ? { spawn: villageSpawn(), stones: [] } : w.maps.find((m) => m.id === wm.id);
    const stones = (w.tpStones || []).filter((s) => s.map === wm.id);
    const mpS = { spawn: mp.spawn, stones: stones.map((s) => ({ ...s, to: stones.indexOf(w.tpStones[s.to]) })) };
    const seen = kfFlood(wm, mpS, (x, y) => !tileBlocked(x, y));
    const ok = (px, py, R = 1) => {
      const tx = Math.floor(px / TILE);
      const ty = Math.floor(py / TILE);
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        const x = tx + dx;
        const y = ty + dy;
        if (x >= rx && y >= ry && x < rx + rw && y < ry + rh && seen[(y - ry) * rw + x - rx]) return true;
      }
      return false;
    };
    const inMap = (n) => n.x / TILE >= rx && n.x / TILE < rx + rw && n.y / TILE >= ry && n.y / TILE < ry + rh;
    const bad = [];
    for (const n of w.npcs) {
      if (!inMap(n) || n.id === 'riss') continue;
      if (!ok(n.x, n.y, n.id === 'eingang' ? 2 : 1)) bad.push(`${n.id}:${n.name}`);
    }
    for (const s of stones) if (!ok(s.x, s.y, 0)) bad.push(`stein ${s.tx},${s.ty}`);
    let walk = 0;
    let lost = 0;
    for (let y = ry + MAP_BORDER; y < ry + rh - MAP_BORDER; y++) {
      for (let x = rx + MAP_BORDER; x < rx + rw - MAP_BORDER; x++) {
        if (tileBlocked(x, y)) continue;
        walk++;
        if (!seen[(y - ry) * rw + x - rx] && !houseAt((x + 0.5) * TILE, (y + 0.5) * TILE)) lost++;
      }
    }
    // Monster und Seelensteine: je Gruppe 20 Stellen wie beim Erscheinen
    let spots = 0;
    let spotsBad = 0;
    let spotsNone = 0;
    for (const z of ZONES.filter((z) => z.map === wm.id && !z.safe && z.groups)) {
      for (const [, , from, to] of [...z.groups, ...(z.stones || [])]) {
        for (let k = 0; k < 20; k++) {
          const s = randomSpotInZone(z, from, to);
          if (!s) { spotsNone++; continue; }
          spots++;
          if (!ok(s.x, s.y, 0)) spotsBad++;
        }
      }
    }
    out.push({ map: wm.id, name: wm.name, form: (mapFormOf(wm.id) || {}).form || '', walk, unreachable: lost, npcBad: bad, stones: stones.length,
      spots, spotsBad, spotsNone, cleaned: (MAP_FORM_INFO.get(wm.id) || {}).cleaned || 0 });
  }
  return out;
}

// --- Aussehen: Wolkenmeer und Schlucht (2D, 3D, Karten) -----------------------------------------------------------
(function kfGround() {
  const add = (g, a, b, map) => {
    GROUND_SHADES[g] = [a, b];
    GROUND_PALETTE[g] = Array.from({ length: 8 }, (_, i) => mixColor(a, b, i / 7));
    if (typeof MAP_COLORS !== 'undefined') MAP_COLORS[g] = map;
  };
  // 2D: Wolken von oben (hell, leicht bläulich), Schlucht dunkel rostbraun; in 3D sind das die Farben der Kante
  add(GROUND.WOLKEN, '#b8c8e4', '#eef4ff', [214, 226, 244]);
  add(GROUND.KLUFT, '#2a1610', '#6a3c26', [58, 34, 24]);
  if (typeof MAP_LIQ !== 'undefined') {
    MAP_LIQ[GROUND.WOLKEN] = [[120, 132, 150, 0.85], [222, 232, 248], [196, 212, 238]];
    MAP_LIQ[GROUND.KLUFT] = [[150, 96, 60, 0.9], [74, 42, 28], [30, 16, 12]];
  }
  if (typeof LIQUID3_GROUND !== 'undefined') {
    LIQUID3_GROUND[GROUND.WOLKEN] = 'clouds';
    LIQUID3_GROUND[GROUND.KLUFT] = 'kluft';
    LIQUID3_DEPTH[GROUND.WOLKEN] = 1.7;
    LIQUID3_DEPTH[GROUND.KLUFT] = 2.2;
    // Felskante unter den Himmelsinseln: dunkler, kühler Fels; Schlucht: die eigene Farbe (Rostfels)
    LIQUID3_UNDER[GROUND.WOLKEN] = GROUND.BASALT;
  }
})();

// 3D: Wolkenmeer – weiche, langsam ziehende Wolkenballen in Weiß und zartem Blau, Sonnenseite heller, in den Tälern
// dazwischen ein Hauch Himmelsfarbe; nachts gedämpft. Schlucht: tiefer, warmer Dunst mit treibendem Staub.
if (typeof LIQUID3 !== 'undefined') {
  LIQUID3.clouds = {
    shallow: '#f6f9ff', deep: '#a9bddc', foam: '#ffffff', alpha: 1, level: -0.62, frag: `
          vec2 q = p * 0.085 + vec2(t * 0.008, t * 0.003);
          q += vec2(sin(q.y * 2.3 + t * 0.02), cos(q.x * 1.9 - t * 0.015)) * 0.35;
          float c1 = sin(q.x * 2.1 + sin(q.y * 1.7) * 1.3) * sin(q.y * 1.9 - sin(q.x * 1.3) * 1.1);
          float c2 = sin((q.x + q.y) * 4.3 + t * 0.03) * sin((q.x - q.y) * 3.7 - t * 0.02);
          float c3 = sin(q.x * 9.1 + q.y * 3.7 + t * 0.05) * sin(q.y * 8.3 - q.x * 4.1);
          float puff = 0.52 + 0.3 * c1 + 0.14 * c2 + 0.05 * c3;
          vec3 col = mix(uDeep, uShallow, smoothstep(0.25, 0.8, puff));
          col = mix(col, uSky * 1.05, (1.0 - smoothstep(0.1, 0.45, puff)) * 0.35);
          col += vec3(1.0, 0.97, 0.9) * smoothstep(0.7, 0.95, puff) * 0.12;
          col = mix(col, col * vec3(0.55, 0.6, 0.78), uNight * 0.6);
          col = mix(col * 0.82, col, smoothstep(0.0, 0.6, d));
          float alpha = 1.0;`,
    fragLow: `
          vec2 q = p * 0.085 + vec2(t * 0.008, t * 0.003);
          float puff = 0.52 + 0.35 * sin(q.x * 2.1 + q.y * 0.6) * sin(q.y * 1.9 - q.x * 0.4);
          vec3 col = mix(uDeep, uShallow, smoothstep(0.25, 0.8, puff));
          col = mix(col, col * vec3(0.55, 0.6, 0.78), uNight * 0.6);
          float alpha = 1.0;`
  };
  LIQUID3.kluft = {
    shallow: '#8a5232', deep: '#1c0e0a', foam: '#e8b884', alpha: 1, level: -1.25, frag: `
          vec2 q = p * 0.5 + vec2(t * 0.03, -t * 0.012);
          float haze = 0.5 + 0.3 * sin(q.x * 1.7 + sin(q.y * 1.3 + t * 0.08) * 1.4) * sin(q.y * 1.5 - t * 0.05) + 0.15 * sin((q.x - q.y) * 3.3 + t * 0.1);
          vec3 col = mix(uDeep, uShallow * 0.55, haze * 0.6);
          vec2 dq = p * 2.6 + vec2(t * 0.25, t * 0.06);
          float dh = fract(sin(dot(floor(dq), vec2(41.3, 289.1))) * 43758.5453);
          col += uFoam * smoothstep(0.12, 0.0, length(fract(dq) - 0.5)) * step(0.9, dh) * 0.18;
          col = mix(col, uShallow * 0.8, smoothstep(0.35, 0.0, d) * 0.4);
          col = mix(col, col * 0.6, uNight * 0.5);
          float alpha = 1.0;`
  };
}

// Brücken: Eisbrücke über dem Wolkenmeer (helle Eisplatten, Geländer aus Eiszapfen-Pfosten und Seil), Hängebrücke
// über der Schlucht (Holzbretter auf zwei Seilen, Pfosten an den Seiten)
if (typeof WORLD3 !== 'undefined') {
  const baseBridge = WORLD3.bridge;
  WORLD3.bridge = function (b, x, z, vertical, style) {
    if (style === 'eis') {
      const M = placeAt(x, z, vertical ? Math.PI / 2 : 0);
      b.add(wbox(1.06, 0.14, 1.04, 0.04), '#cfe6f4', { parent: M, p: [0, 0.03, 0], shade: 0.25, top: '#f2faff', topK: 0.7 });
      b.add(wbox(1.06, 0.16, 0.9, 0.04), '#8fb4cc', { parent: M, p: [0, -0.12, 0], shade: 0.35 });
      for (const sz of [-1, 1]) {
        b.add(tinyBox(1.06, 0.04, 0.04), '#e8f4ff', { parent: M, p: [0, 0.4, sz * 0.49] });
        b.add(crystalGeo('body'), '#bfe2f6', { parent: M, p: [0.42, 0.06, sz * 0.49], s: [0.06, 0.34, 0.06] });
      }
      return;
    }
    if (style === 'seil') {
      const M = placeAt(x, z, vertical ? Math.PI / 2 : 0);
      for (let k = -2; k <= 2; k++) b.add(wbox(0.19, 0.06, 1.0, 0.02), k % 2 ? '#7a5636' : '#8a6440', { parent: M, p: [k * 0.21, 0.03, 0], shade: 0.3 });
      for (const sz of [-1, 1]) {
        b.add(tinyBox(1.08, 0.035, 0.035), '#c8a878', { parent: M, p: [0, 0.46, sz * 0.5] });
        b.add(tinyBox(1.08, 0.03, 0.03), '#b89868', { parent: M, p: [0, 0.02, sz * 0.5] });
        b.add(tinyBox(0.04, 0.46, 0.04), '#5a3a22', { parent: M, p: [0.48, 0.23, sz * 0.5] });
      }
      return;
    }
    return baseBridge.call(this, b, x, z, vertical, style);
  };
}

// 2D: ziehende Wolkenfetzen über dem Wolkenmeer, Staub in der Schlucht; am Rand eine dunkle Felskante statt Sand
if (typeof drawMagmaTile === 'function') {
  const baseMagma = drawMagmaTile;
  drawMagmaTile = function (ctx, g, x, y, px, py, h, t) {
    if (g === GROUND.WOLKEN) {
      const k = (t * 0.05 + (h % 97) / 97) % 1;
      ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.15 * Math.sin(t * 0.6 + x * 0.4 + y * 0.3)})`;
      ctx.beginPath();
      ctx.ellipse(px + ((h % 13) + k * 18) % TILE, py + 10 + ((h >> 4) % 12), 9, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (g === GROUND.KLUFT) {
      const k = (t * 0.3 + (h % 89) / 89) % 1;
      ctx.fillStyle = `rgba(232,184,132,${0.25 * (1 - k)})`;
      ctx.fillRect(px + 4 + (h % 20), py + TILE - 4 - k * 24, 2, 2);
      return;
    }
    return baseMagma(ctx, g, x, y, px, py, h, t);
  };
}
if (typeof drawShore === 'function') {
  const baseShore = drawShore;
  drawShore = function (ctx, x, y, px, py, g = GROUND.WATER) {
    if (g !== GROUND.WOLKEN && g !== GROUND.KLUFT) return baseShore(ctx, x, y, px, py, g);
    ctx.fillStyle = g === GROUND.WOLKEN ? 'rgba(70,78,96,0.95)' : 'rgba(96,52,30,0.95)';
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const n = groundAt(x + dx, y + dy);
      if (LIQUID.has(n) || n === -1) continue;
      if (dy === -1) ctx.fillRect(px, py, TILE, 7);
      if (dy === 1) ctx.fillRect(px, py + TILE - 4, TILE, 4);
      if (dx === -1) ctx.fillRect(px, py, 4, TILE);
      if (dx === 1) ctx.fillRect(px + TILE - 4, py, 4, TILE);
    }
  };
}
