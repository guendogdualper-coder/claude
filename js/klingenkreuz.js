// Klingenkreuz (Krieger, Weg der Klinge, Platz 1 – ersetzt die Sichelwelle; Werte in daten/klassen.js).
// Spielerwunsch: eine neue, wuchtige Krieger-Attacke, die aus dem Hieb selbst kommt – kein Wirbel (Schwertwirbel), kein
// Sprung (Sprungschlag), keine Schwerter vom Himmel (Ulti Klingenhimmel). Zwei blitzschnelle Hiebe über Kreuz: ihre
// Lichtschnitte bleiben vor dem Krieger in der Luft stehen und verschmelzen zu einem Kreuz, ein Stoß mit der Klinge
// schleudert es nach vorn. Es fliegt dicht über dem Boden, ritzt zwei Furchen hinein, durchschneidet alle Gegner auf
// seiner Bahn, stößt sie zurück und zerbirst am Ende in Klingensplitter.
//
// Ablauf (Sekunden ab dem Auslösen; die Figur steht bis sk.lock fest, Körper in SKILL_POSE3.kreuz bzw. kreuzAngle2d):
//   0–0,09    Ausholen über die rechte Schulter, Licht sammelt sich an der Klinge
//   0,13      1. Hieb von oben rechts nach unten links: trifft im Kegel vor der Figur (sk.dmg), erster Lichtschnitt
//   0,26      Ausholen über die linke Schulter (mit zwei Waffen holt die linke Hand aus)
//   0,30      2. Hieb von oben links nach unten rechts: trifft noch einmal, zweiter Schnitt – das Kreuz flammt auf
//   0,36–0,42 das Kreuz zieht sich kurz zusammen, die Figur nimmt die Klinge zum Stoß zurück
//   0,42      Stoß: das Kreuz fliegt los (KK.speed px/s, bis sk.crossLen weit; es fliegt wie der Sprungschlag über
//             Wasser, Bäume und Felsen, nur Mauern, Häuser, der Kartenrand und das Dorf halten es auf – kkReach)
//   Flug      jeder Gegner auf der Bahn wird einmal getroffen (sk.crossDmg, Rückstoß in Flugrichtung)
//   Ende      das Kreuz bricht in seine vier Arme und zerbirst in Klingensplitter, die Furchen verblassen
// Ränge (zusätzlich zu den allgemeinen Rang-Effekten aus rang-fx.js): Hülle in der Rangfarbe, je Rang 10 % größer;
// ab Heroisch Nachbilder in der Rangfarbe, ab Legendär lodernde Kanten und mehr Splitter, Vollendet mit Glutspur
// hinter dem Kreuz und Feuer im Zerbersten. Aura des Schwertes: Schnitte und Kreuz leuchten golden und lodern.
// Kein Bodenring, keine Runen, keine Sterne. Mitspieler sehen dasselbe (kreuzRemote), Treffer rechnet nur der Werfer.

const KK = { cut1: 0.13, cut2: 0.3, launch: 0.42, speed: 520, burst: 0.55, fade: 0.9, lift: 0.86, ahead: 26, step: 24 };
// main: Band, edge: Schein, deep: dunkle Kontur (passt zu den Umrisslinien der Figuren, deckt auch auf Schnee)
const KK_COL = {
  base: { main: '#a8dcff', edge: '#3a8cff', deep: '#101c48' },
  aura: { main: '#ffe08a', edge: '#ff9a1a', deep: '#3a1404' }
};
// zuletzt geschlagener Hieb (1 oder 2): Richtung des kleinen Schnitts am getroffenen Gegner (SKILL_FX.klingenkreuz)
let kkLastCut = 1;

// --- Ablauf (eigener Spieler und Mitspieler) ----------------------------------------------------------------
// o.local: eigener Spieler (trifft), sonst nur Bild und Klang; o.pw: Kraft der Fertigkeit; o.len: Flugweite;
// o.dir: Flugrichtung der Mitspieler (beim eigenen Spieler die Blickrichtung beim Stoß)
function kreuzFx(owner, sk, o) {
  const local = !!o.local;
  const pw = o.pw || 0;
  const rk = fxRank;
  const aura = !!(owner.buffs && owner.buffs.some((b) => b.id === 'schwertaura'));
  const want = Math.max(0, Math.min(sk.crossLen, o.len != null && isFinite(o.len) ? o.len : sk.crossLen));
  const e = addEffect({ type: 'kkreuz3', owner, x: owner.x, y: feetY(owner), rk, aura, len: want, dur: KK.launch + want / KK.speed + KK.fade + 0.2 });
  // für die Körperpose (Waffenleuchten in Rang- bzw. Aurafarbe)
  owner.kkCast = { at: game.time, rk, aura };
  later(KK.cut2 - 0.05, () => kkSnd(owner, 'swing'));
  for (const [at, n] of [[KK.cut1, 1], [KK.cut2, 2]]) {
    later(at, () => {
      if (owner.dead || owner.gone) return;
      if (!local) return;
      const f = owner.facing || { x: 1, y: 0 };
      kkLastCut = n;
      for (const m of enemiesInCone(owner.x, owner.y, f, sk.radius, sk.angle)) hitMonster(m, sk.dmg * pw, { skill: sk.id, vfxColor: '#e6eeff' });
      shakeScreen(n === 2 ? 2.5 : 1.5);
    });
  }
  later(KK.launch, () => {
    if (owner.dead || owner.gone) {
      e.cancel = game.time;
      e.dur = game.time - e.start + 0.2;
      return;
    }
    let dx = o.dir ? o.dir.x : owner.facing ? owner.facing.x : 1;
    let dy = o.dir ? o.dir.y : owner.facing ? owner.facing.y : 0;
    const dl = hyp(dx, dy) || 1;
    dx /= dl;
    dy /= dl;
    const x0 = owner.x + dx * KK.ahead;
    const y0 = owner.y + dy * KK.ahead;
    const len = local ? kkReach(x0, y0, dx, dy, sk.crossLen) : want;
    const oy = feetY(owner) - owner.y;
    Object.assign(e, { t0: game.time - e.start, lx: x0, ly: y0 + oy, ldx: dx, ldy: dy, len, x: x0 + dx * len / 2, y: y0 + oy + dy * len / 2 });
    e.dur = e.t0 + len / KK.speed + KK.fade;
    addEffect({ type: 'kkfurche', ground: true, src: e, x: e.x, y: e.y, dur: len / KK.speed + 1.3 });
    kkSnd(owner, 'launch');
    if (owner === game.player) {
      hitStop(0.03);
      shakeScreen(3);
    }
    const hit = new Set();
    const steps = Math.max(1, Math.ceil(len / KK.speed / 0.04));
    for (let s = 0; s <= steps; s++) {
      later(s * 0.04, () => {
        const d = Math.min(len, KK.speed * s * 0.04);
        const cx = x0 + dx * d;
        const cy = y0 + dy * d;
        if (local) {
          for (const m of enemiesInCircle(cx, cy, sk.crossWidth / 2)) {
            if (hit.has(m.id)) continue;
            hit.add(m.id);
            hitMonster(m, sk.crossDmg * pw, { skill: sk.id, knockback: sk.knockback, from: { x: cx - dx * 40, y: cy - dy * 40 }, heavy: true, vfxColor: '#e6eeff' });
          }
        }
        // 2D: Staub und Funken, wo das Kreuz über den Boden schrammt (in 3D zeichnet kkreuz3 Staub und Brocken selbst)
        if (!V3.on && s % 2 === 0) {
          particles(cx, cy + oy, { count: 3, color: ['#8a7656', '#a89878'], angle: Math.atan2(-dy, -dx), spread: 1.2, speed: [30, 80], life: [0.35, 0.6], size: [2.5, 4.5], drag: 3, glow: false });
          particles(cx, cy + oy - 4, { count: 2, color: [aura ? '#ffd36a' : '#cfe4ff', '#ffffff'], angle: Math.atan2(-dy, -dx), spread: 0.5, speed: [80, 160], life: [0.15, 0.3], size: [1.2, 2], shape: 'spark', drag: 4 });
        }
        if (s === steps) {
          kkSnd(owner, 'burst', cx, cy);
          if (owner === game.player) shakeScreen(2);
          if (!V3.on) particles(cx, cy + oy - 20, { count: 14, color: [aura ? '#ffd36a' : '#cfe4ff', '#ffffff', aura ? '#ff9a2a' : '#8fc4ff'], speed: [90, 220], life: [0.25, 0.5], size: [1.4, 2.6], shape: 'spark', drag: 3 });
        }
      });
    }
  });
  return e;
}

// Klänge aus den vorhandenen Spieldateien: zweiter Hieb (Schwung je Waffe), Stoß (Klingenklang, tiefer), Zerbersten
function kkSnd(p, what, x, y) {
  if (typeof sfxFiles === 'undefined' || typeof snd === 'undefined') return;
  const v = p === game.player ? 1 : 0.6;
  const pos = { x: x != null ? x : p.x, y: y != null ? y : p.y };
  if (what === 'swing') {
    const kind = weaponKindOf(p);
    const S = (typeof SWING_FILE !== 'undefined' && SWING_FILE[kind]) || ['schwung_mittel', 1];
    snd.file(S[0], { ...pos, vol: 0.45 * v, rate: S[1] * 1.04, vary: 0.06, grp: 'swing' }, kind === 'greatsword' || kind === 'greataxe' ? 'whoosh_h' : 'whoosh_m', { ...pos, vol: 0.4 * v });
  } else if (what === 'launch') {
    snd.file('klinge', { ...pos, vol: 0.62 * v, rate: 0.86, vary: 0.04, rev: 0.25, grp: 'skill' }, 'el_klinge', { ...pos, vol: 0.5 * v });
  } else if (what === 'burst') {
    snd.file('eis_splitter', { ...pos, vol: 0.3 * v, rate: 1.3, vary: 0.08, maxDur: 0.6, grp: 'imp' });
  }
}

// Flugweite: bis zur ersten Mauer, Höhlenwand, zum ersten Haus, zum Kartenrand oder (außerhalb des Duells) zum Dorf
// (hopBarrier wie der Sprungschlag) – über Wasser, Lava, Bäume und Felsen fliegt das Kreuz hinweg
function kkReach(x, y, dx, dy, want) {
  let len = 0;
  for (let s = 6; s <= want; s += 6) {
    const nx = x + dx * s;
    const ny = y + dy * s;
    if (hopBarrier(nx, ny) || (inVillage(nx, ny) && !duelFighting())) break;
    len = s;
  }
  return len;
}

// Eigener Spieler: Richtung zum Ziel (sonst Blickrichtung), Flugweite für die Mitspieler
SKILL_TYPES.kreuz = function (sk, pw) {
  const p = game.player;
  const dir = { ...aim(sk.crossLen) };
  lockPlayer(p, sk.lock);
  input.walkTo = null;
  const len = kkReach(p.x + dir.x * KK.ahead, p.y + dir.y * KK.ahead, dir.x, dir.y, sk.crossLen);
  kreuzFx(p, sk, { local: true, pw, len });
  return { kl: Math.round(len) };
};

// Mitspieler (remoteSkillFx): nur Bild und Klang; ältere Mitspieler melden noch die Sichelwelle (wl statt kl)
function kreuzRemote(rp, sk, d) {
  const fx = Number.isFinite(d.fx) ? d.fx : 1;
  const fy = Number.isFinite(d.fy) ? d.fy : 0;
  const dl = hyp(fx, fy) || 1;
  const len = Number.isFinite(d.kl) ? d.kl : Number.isFinite(d.wl) ? d.wl : sk.crossLen;
  kreuzFx(rp, sk, { local: false, len, dir: { x: fx / dl, y: fy / dl } });
}

// --- 3D ------------------------------------------------------------------------------------------------------
FX3_TYPES.add('kkreuz3');
FX3_TYPES.add('kkfurche');
// die Furchen zeichnet kkreuz3 selbst; kkfurche ist nur für 2D (und bleibt so aus der 2D-Ebene über der 3D-Szene)
FX3_DRAW.kkfurche = () => {};
const _kkX = new THREE.Vector3();
const _kkC = new THREE.Vector3();
const _kkU = new THREE.Vector3();
const _kkV = new THREE.Vector3();
const _kkW = new THREE.Vector3();
const _kkA = new THREE.Vector3();
const _kkB = new THREE.Vector3();
const _kkP = new THREE.Vector3();
const _kkD = new THREE.Vector3();
const _kkL = new THREE.Vector3();
const _kkT = new THREE.Vector3();
const _kkCol = new THREE.Color();
const _kkMix = new THREE.Color('#857360');
const _kkDust = new THREE.Color('#d8ccb0');

// Schnittrichtung u (vom Anfang zum Ende) und Wölbung v in der Bildebene (zur Kamera gedreht, wie die Schnitte
// der übrigen Fertigkeiten): sx/sy sind die Anteile entlang Kamera-rechts und Kamera-oben
function kkCutAxes(sx, sy, u, v) {
  const { r: R, u: Up, f: F } = FX3.cam;
  u.copy(R).multiplyScalar(sx).addScaledVector(Up, sy).normalize();
  // senkrecht dazu in der Bildebene, nach oben gewölbt, und ein Stück zur Kamera hin (räumliche Tiefe)
  let px = -sy;
  let py = sx;
  if (py < 0) {
    px = -px;
    py = -py;
  }
  v.copy(R).multiplyScalar(px).addScaledVector(Up, py).normalize().addScaledVector(F, -0.9).normalize();
}

// Lichtschnitt als schlanke Sichel um die Mitte X: halbe Länge L, Breite w, gezogen bis prog (vom Anfang her)
function kkCut3(h, X, u, v, L, w, prog, op, C, rc, core = true) {
  if (prog <= 0.01 || op <= 0.01) return;
  const span = 1.25;
  const R = L / Math.sin(span / 2);
  _kkC.copy(X).addScaledVector(v, -R * Math.cos(span / 2));
  const a0 = Math.PI / 2 - span / 2; // Ende (+u)
  const a1 = Math.PI / 2 + span / 2; // Anfang (−u)
  const head = a1 + (a0 - a1) * Math.min(1, prog);
  // Schichten mittig auf dem Hauptband (Breite w ab R nach innen)
  const lay = (ww, from, to, col, o) => fx3Strip(fx3Take(h, 'strip'), _kkC, u, v, R - w / 2 + ww / 2, ww, from, to, col, o, true);
  // dunkle Kontur (normal gemischt, vor dem Licht gezeichnet; Deckkraft über das Material, damit sie mit verblasst)
  if (core && C.deep) {
    const o = fx3Take(h, 'stripD');
    fx3Strip(o, _kkC, u, v, R - w / 2 + w * 0.75, w * 1.5, a1, head, C.deep, 1, true);
    o.material.opacity = Math.min(1, op) * 0.95;
  }
  if (rc) lay(w * 2.3, a1, head, rc, op * 0.6);
  lay(w * 1.6, a1, head, C.edge, op * 0.5);
  lay(w, a1, head, C.main, op * 0.85);
  if (core) {
    const ins = 0.08 * Math.min(1, prog);
    lay(w * 0.3, a1 - ins, head + ins, '#ffffff', op);
  }
}

// Klingenachse der Figur in diesem Bild: die Knochen stehen schon in der neuen Pose (v3SyncActors läuft vor den
// Effekten), ihre Weltmatrizen rechnet three.js aber erst beim Zeichnen – ohne Nachrechnen hinge das Licht an der
// Spitze bei den schnellen Hieben ein Bild hinterher. Einmal je Bild und Figur.
function kkAxis3(own, base, tip, left = false) {
  if (typeof weaponAxis3 !== 'function') return false;
  if (own.kkMatAt !== game.time && typeof actors3 !== 'undefined') {
    own.kkMatAt = game.time;
    const a = actors3.get(entityKey(own));
    if (a && a.group && a.group.parent) a.group.updateMatrixWorld(true);
  }
  return weaponAxis3(own, base, tip, left);
}

// Punkt entlang eines Schnitts (f −1 Anfang … 1 Ende), ohne Wölbung
function kkAlong(X, u, L, f, out) {
  return out.copy(X).addScaledVector(u, L * f);
}

FX3_DRAW.kkreuz3 = function (h, e) {
  const t = game.time - e.start;
  const low = n3low();
  const r1 = e.rk >= 0 ? e.rk + 1 : 0;
  const S = 1 + 0.1 * r1;
  const C = e.aura ? KK_COL.aura : KK_COL.base;
  const rc = e.rk >= 0 ? SKILL_RANKS[e.rk].color : null;
  const own = e.owner && !e.owner.gone ? e.owner : null;
  const launched = e.t0 != null;
  const fly = launched ? e.len / KK.speed : 0;
  const tf = launched ? t - e.t0 : -1;
  const tb = launched ? tf - fly : -1;
  const flame = r1 >= 3 || e.aura;
  // Seite der Schwerthand auf dem Bildschirm (einmal festgelegt): der erste Hieb kommt von dort
  if (e.side == null && own) {
    const f = own.facing || { x: 1, y: 0 };
    const sr = -f.y * FX3.cam.r.x + f.x * FX3.cam.r.z;
    e.side = sr < -0.05 ? -1 : 1;
  }
  const s = e.side || 1;
  // --- Mitte des Kreuzes -----------------------------------------------------------------------------------------
  let d = 0;
  if (!launched) {
    if (!own || e.cancel) return;
    const f = own.facing || { x: 1, y: 0 };
    _kkX.set((own.x + f.x * KK.ahead) * U3, KK.lift, (feetY(own) + f.y * KK.ahead) * U3);
  } else {
    d = Math.min(e.len, Math.max(0, tf) * KK.speed);
    _kkX.set((e.lx + e.ldx * d) * U3, KK.lift, (e.ly + e.ldy * d) * U3);
  }
  // Größe: zieht sich vor dem Stoß zusammen, wächst im Flug
  let sc = 1;
  if (!launched) sc = t < 0.36 ? 1 : 1 - 0.14 * easeOut(clamp01((t - 0.36) / 0.06));
  else sc = 1.1 + 0.3 * (e.len > 0 ? d / e.len : 1) - 0.12 * Math.max(0, 1 - tf / 0.06);
  const L = 1.02 * S * sc;
  const w = 0.19 * S;
  // --- Waffe: Licht sammelt sich, blitzt bei jedem Hieb und beim Stoß auf ---------------------------------------
  if (own && !launched) {
    const dual = own.equipment && isOffhand(own.equipment.schild);
    const k0 = clamp01(t / KK.cut1);
    const pk = (c, wd) => Math.max(0, 1 - Math.abs(t - c) / wd);
    const g = Math.max(t < KK.cut1 ? k0 * 0.7 : 0, pk(KK.cut1, 0.05), pk(KK.cut2, 0.05) * (dual ? 0 : 1), pk(KK.launch - 0.01, 0.05));
    if (g > 0.02 && kkAxis3(own, _kkA, _kkB)) {
      n3Glow(h, _kkB.x, _kkB.y, _kkB.z, 0.25 + 0.5 * g * S, C.edge, 0.7 * g);
      n3Glow(h, _kkB.x, _kkB.y, _kkB.z, 0.1 + 0.22 * g, '#ffffff', g);
      // Lichtpünktchen ziehen beim Ausholen zur Klingenspitze
      if (t < KK.cut1 && !low) {
        for (let i = 0; i < 6; i++) {
          const q = (k0 + i / 6) % 1;
          const a = i * 2.4 + e.start;
          const rr = 0.7 * (1 - q);
          n3Glow(h, _kkB.x + Math.cos(a) * rr, _kkB.y + Math.sin(a * 1.7) * rr * 0.6, _kkB.z + Math.sin(a) * rr, 0.09, i % 2 ? C.edge : '#ffffff', q * 0.9);
        }
      }
    }
    // zwei Waffen: die linke blitzt beim zweiten Hieb
    const g2 = dual ? Math.max(clamp01((t - 0.18) / 0.1) * (t < KK.cut2 ? 0.6 : 0), pk(KK.cut2, 0.05)) : 0;
    if (g2 > 0.02 && kkAxis3(own, _kkA, _kkB, true)) {
      n3Glow(h, _kkB.x, _kkB.y, _kkB.z, 0.25 + 0.5 * g2 * S, C.edge, 0.7 * g2);
      n3Glow(h, _kkB.x, _kkB.y, _kkB.z, 0.1 + 0.22 * g2, '#ffffff', g2);
    }
  }
  // --- die beiden Lichtschnitte -------------------------------------------------------------------------------
  const ax1 = [-s, -1];
  const ax2 = [s, -1];
  const p1 = launched ? 1 : clamp01((t - 0.1) / 0.05);
  const p2 = launched ? 1 : clamp01((t - 0.27) / 0.05);
  const shimmer = 0.9 + 0.1 * Math.sin(t * 47);
  if (tb < 0) {
    const op = launched ? 1 : shimmer;
    kkCutAxes(ax1[0], ax1[1], _kkU, _kkV);
    kkCut3(h, _kkX, _kkU, _kkV, L, w, p1, op, C, rc);
    if (flame && p1 > 0.5) kkFlames(h, _kkX, _kkU, L, t, C, rc, 0);
    // Nachbilder im Flug (ab Heroisch in der Rangfarbe, mehr davon)
    const nA = launched ? (low ? 1 : 2) + (r1 >= 2 ? 1 : 0) : 0;
    const echo = r1 >= 2 ? rc : C.edge;
    for (let k = 1; k <= nA; k++) {
      const back = k * 0.34 * S;
      if (d * U3 < back) break;
      _kkW.set(_kkX.x - e.ldx * back, _kkX.y, _kkX.z - e.ldy * back);
      kkCut3(h, _kkW, _kkU, _kkV, L * (1 - 0.06 * k), w * 0.8, 1, 0.42 / k, { main: echo, edge: echo }, null, false);
    }
    kkCutAxes(ax2[0], ax2[1], _kkU, _kkV);
    kkCut3(h, _kkX, _kkU, _kkV, L, w, p2, op, C, rc);
    if (flame && p2 > 0.5) kkFlames(h, _kkX, _kkU, L, t, C, rc, 1);
    for (let k = 1; k <= nA; k++) {
      const back = k * 0.34 * S;
      if (d * U3 < back) break;
      _kkW.set(_kkX.x - e.ldx * back, _kkX.y, _kkX.z - e.ldy * back);
      kkCut3(h, _kkW, _kkU, _kkV, L * (1 - 0.06 * k), w * 0.8, 1, 0.42 / k, { main: echo, edge: echo }, null, false);
    }
    // das Kreuz flammt auf, wenn sich die Schnitte treffen; im Flug glüht die Mitte
    const fl = !launched ? Math.max(0, 1 - Math.abs(t - 0.32) / 0.1) : 0;
    if (p2 > 0.6) {
      n3Glow(h, _kkX.x, _kkX.y, _kkX.z, (0.25 + 0.55 * fl) * S * sc, '#ffffff', 0.3 + 0.5 * fl);
      n3Glow(h, _kkX.x, _kkX.y, _kkX.z, (0.8 + 0.7 * fl) * S * sc, rc || C.edge, 0.2 + 0.3 * fl);
    }
    if (launched && tf >= 0) {
      // Lichtschein unter dem Kreuz, in Flugrichtung gestreckt
      const lit = fx3Take(h, 'plane');
      fx3Strip2(lit, _kkX.x / U3, _kkX.z / U3, 1.0 * S, 0.55 * S, 0.035, 'disc', Math.atan2(-e.ldy, e.ldx));
      fx3Color(lit, C.edge, 0.32);
      // wo die unteren Arme über den Boden schrammen: Funkenschweif; an den Armspitzen Tempo-Streifen
      if (!low) {
        kkScrape(h, e, _kkX, L, s, tf, C, rc);
        kkStreaks(h, e, _kkX, L, s, C, rc);
      }
    }
  } else if (tb < KK.burst) {
    kkBurst(h, e, _kkX, L, w, s, tb, C, rc, r1, low);
  }
  // --- Boden: Furchen, Staub, Brocken, Glutspur ------------------------------------------------------------------
  if (launched) kkGround(h, e, t, tf, d, S, C, rc, r1, low);
};

// lodernde Kanten (Aura des Schwertes, ab Legendär): Flammenzungen entlang eines Schnitts
function kkFlames(h, X, u, L, t, C, rc, k) {
  const n = n3low() ? 2 : 4;
  for (let i = 0; i < n; i++) {
    const f = -0.75 + (1.5 * i) / (n - 1);
    kkAlong(X, u, L, f, _kkP);
    const fl = 0.75 + 0.25 * Math.sin(t * 31 + i * 2.1 + k * 1.3);
    n3Flame(h, _kkP.x, _kkP.y + 0.12, _kkP.z, 0.17 * fl, 0.42 * fl, (i + k) % 2 && rc ? rc : C.edge, 0.55);
  }
}

// Funken an den unteren Armen, die über den Boden schrammen (nach hinten weggezogen)
function kkScrape(h, e, X, L, s, tf, C, rc) {
  const { r: R } = FX3.cam;
  for (const side of [-1, 1]) {
    const bx = X.x + R.x * side * L * 0.62;
    const bz = X.z + R.z * side * L * 0.62;
    for (let i = 0; i < 4; i++) {
      const q = (tf * 9 + i / 4 + (side > 0 ? 0.5 : 0)) % 1;
      const back = q * 0.7;
      n3Glow(h, bx - e.ldx * back + Math.sin(i * 7 + side) * 0.06, 0.06 + q * 0.18, bz - e.ldy * back, 0.12 * (1 - q * 0.5), i % 2 ? '#ffffff' : rc || C.edge, 0.9 * (1 - q));
    }
  }
}

// Tempo-Streifen: an jeder Armspitze ein schmaler Lichtstrich nach hinten (zur Kamera gedrehtes, gestrecktes Licht)
function kkStreaks(h, e, X, L, s, C, rc) {
  const { r: R, u: Up } = FX3.cam;
  const sx = e.ldx * R.x + e.ldy * R.z;
  const sy = e.ldx * Up.x + e.ldy * Up.z;
  const rot = Math.atan2(-sx, sy);
  const k = Math.min(1, Math.hypot(sx, sy) * 1.4);
  if (k < 0.15) return;
  for (const ax of [[-s, -1], [s, -1]]) {
    for (const sg of [-1, 1]) {
      _kkD.copy(R).multiplyScalar(ax[0] * sg).addScaledVector(Up, ax[1] * sg).normalize();
      _kkP.copy(X).addScaledVector(_kkD, L * 0.8);
      const o = fx3MageSprite(h, 'sprite', 'disc', _kkP.x - e.ldx * 0.45, _kkP.y, _kkP.z - e.ldy * 0.45, 0.09, 0.95 * k, rc || C.edge, 0.55);
      o.material.rotation = rot;
    }
  }
}

// Zerbersten: die vier Arme fliegen auseinander, Lichtblitz, Klingensplitter (3D-Kegel), Staub; Vollendet mit Feuer
function kkBurst(h, e, X, L, w, s, tb, C, rc, r1, low) {
  const q = tb / KK.burst;
  // Blitz
  if (tb < 0.2) n3Glow(h, X.x, X.y, X.z, (0.8 + 1.4 * (tb / 0.2)) * (1 + 0.1 * r1), '#ffffff', 0.85 * (1 - tb / 0.2));
  if (tb < 0.4) n3Glow(h, X.x, X.y, X.z, 2.0 * (1 + 0.1 * r1), rc || C.edge, 0.4 * (1 - tb / 0.4));
  // vier Arme: jede Hälfte jedes Schnitts fliegt nach außen weg und verblasst
  if (tb < 0.3) {
    const op = 1 - tb / 0.3;
    for (const ax of [[-s, -1], [s, -1]]) {
      kkCutAxes(ax[0], ax[1], _kkU, _kkV);
      for (const sg of [-1, 1]) {
        _kkW.copy(X).addScaledVector(_kkU, sg * (L * 0.5 + 5.5 * tb));
        kkCut3(h, _kkW, _kkU, _kkV, L * 0.55 * (1 - 0.45 * q), w * (1 - 0.3 * q), 1, op, C, rc);
      }
    }
  }
  // Klingensplitter: zum großen Teil nach vorn, entlang der Arme auseinander, fallen mit Schwerkraft
  const n = (low ? 6 : 12) + 3 * r1;
  const sd = e.kkShards || (e.kkShards = Array.from({ length: 24 }, (v, i) => ({
    arm: i % 4, j: Math.random(), up: 0.25 + Math.random() * 0.75, sp: 3 + Math.random() * 3.5, len: 0.22 + Math.random() * 0.18, a: Math.random() * 6.28
  })));
  const { r: R, u: Up } = FX3.cam;
  const op = 1 - q;
  for (let i = 0; i < n; i++) {
    const g = sd[i % sd.length];
    const ax = g.arm < 2 ? [-s, -1] : [s, -1];
    const sg = g.arm % 2 ? 1 : -1;
    // Richtung: Arm des Kreuzes (in der Bildebene), dazu nach vorn und etwas nach oben
    _kkD.copy(R).multiplyScalar(ax[0] * sg).addScaledVector(Up, ax[1] * sg).normalize();
    _kkD.x += e.ldx * 0.9 + Math.cos(g.a) * 0.35;
    _kkD.z += e.ldy * 0.9 + Math.sin(g.a) * 0.35;
    _kkD.y = Math.abs(_kkD.y) * 0.5 + g.up;
    _kkD.normalize();
    const v = g.sp;
    _kkP.copy(X).addScaledVector(_kkD, v * tb);
    _kkP.y -= 4.5 * tb * tb;
    if (_kkP.y < 0.03) _kkP.y = 0.03;
    // Flugrichtung jetzt (Geschwindigkeit samt Fall)
    _kkL.copy(_kkD).multiplyScalar(v);
    _kkL.y -= 9 * tb;
    _kkL.normalize();
    _kkT.copy(_kkP).addScaledVector(_kkL, -g.len * 0.5);
    // fester, beleuchteter Splitter (bleibt auch auf hellem Boden sichtbar) mit leuchtender Kante
    const ln = g.len * (1 + 0.1 * r1);
    const o = fx3Take(h, 'cone');
    fx3Cone(o, _kkT, _kkL, ln, 0.05);
    o.scale.z = 0.022;
    fx3Color(o, i % 2 ? '#e8f2ff' : '#b8cce8', op);
    const gl = fx3Take(h, 'coneG');
    fx3Cone(gl, _kkT, _kkL, ln * 1.08, 0.075);
    fx3Color(gl, i % 3 === 2 && rc ? rc : C.edge, op * 0.8);
    if (!low && i % 2 === 0) n3Glow(h, _kkP.x, _kkP.y, _kkP.z, 0.2, i % 4 ? C.edge : '#ffffff', op * 0.7);
  }
  // Staub, wo das Kreuz zerbirst
  if (!low && tb < 0.55) {
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9 + e.start;
      const rr = 0.25 + tb * 1.5;
      n3Smoke(h, X.x + Math.cos(a) * rr + e.ldx * tb * 0.8, 0.15 + tb * 0.6, X.z + Math.sin(a) * rr * 0.8 + e.ldy * tb * 0.8, 0.5 + tb * 1.3, e.dust || '#a89878', 0.6 * (1 - tb / 0.55) * Math.min(1, tb * 15));
    }
  }
  // Vollendet: Feuer schlägt aus dem Zerbersten hoch
  if (r1 >= 4 && tb < 0.5) {
    for (let i = 0; i < (low ? 4 : 8); i++) {
      const a = (i / (low ? 4 : 8)) * Math.PI * 2 + e.start;
      const rr = 0.25 + tb * 1.3;
      const k = 1 - tb / 0.5;
      n3Flame(h, X.x + Math.cos(a) * rr, 0.25 + tb * 0.9, X.z + Math.sin(a) * rr * 0.8, 0.3 * k + 0.1, 0.75 * k + 0.2, i % 2 ? '#ffd34d' : rc, 0.65 * k);
    }
  }
}

// Boden hinter dem Kreuz: zwei geritzte Furchen und ein Lichtstreif dazwischen, Staubwolken und Erdbrocken an den
// Seiten (Farbe aus dem Boden wie beim Sprungschlag), ab Vollendet eine Glutspur mit kleinen Flammen
function kkGround(h, e, t, tf, d, S, C, rc, r1, low) {
  if (!e.dust) {
    _kkCol.set('#8a7a62');
    if (typeof tileSample === 'function') {
      const ts = {};
      tileSample(Math.floor(e.lx / TILE), Math.floor(e.ly / TILE), ts);
      if (ts.r != null && ts.h >= 0) _kkCol.setRGB(ts.r, ts.g, ts.b).lerp(_kkMix, 0.45).lerp(_kkDust, 0.45);
    }
    e.dust = '#' + _kkCol.getHexString();
  }
  const end = Math.max(0, Math.min(1, (e.dur - t) / 0.6));
  const ang = Math.atan2(-e.ldy, e.ldx);
  const nx = -e.ldy;
  const nz = e.ldx;
  if (d > 4) {
    const mx = e.lx + e.ldx * d / 2;
    const mz = e.ly + e.ldy * d / 2;
    for (const sd of [-1, 1]) {
      const fr = fx3Take(h, 'planeN');
      fx3Strip2(fr, mx + nx * sd * 7 * S, mz + nz * sd * 7 * S, d * U3 / 2, 0.06, 0.036 + (sd > 0 ? 0.001 : 0), 'disc', ang);
      fx3Color(fr, '#24170c', 0.62 * end);
    }
    const glowK = Math.max(0, 1 - Math.max(0, tf - 0.15) / 0.8);
    if (glowK > 0) {
      const lit = fx3Take(h, 'plane');
      fx3Strip2(lit, mx, mz, d * U3 / 2, 0.22 * S, 0.04, 'disc', ang);
      fx3Color(lit, rc && r1 >= 4 ? rc : C.edge, 0.42 * glowK);
    }
  }
  // je Schritt (KK.step px) eine Staubwolke links und rechts, dazu ein Erdbrocken
  const n = Math.floor(d / KK.step);
  for (let i = 0; i <= n; i++) {
    const age = tf - (i * KK.step) / KK.speed;
    if (age < 0 || age > 0.8) continue;
    const bx = (e.lx + e.ldx * i * KK.step) * U3;
    const bz = (e.ly + e.ldy * i * KK.step) * U3;
    const k = age / 0.8;
    if (!low || i % 2 === 0) {
      for (const sd of [-1, 1]) {
        const out = 0.3 + age * 0.9;
        n3Smoke(h, bx + nx * sd * out, 0.14 + age * 0.5, bz + nz * sd * out, (0.4 + age * 1.1) * S, e.dust, 0.6 * (1 - k) * Math.min(1, age * 12));
      }
    }
    if (!low && age < 0.55) {
      const sd = i % 2 ? 1 : -1;
      const out = 0.25 + age * 1.6;
      const y = 0.05 + 2.6 * age - 5 * age * age;
      if (y > 0) {
        const sz = 0.05 + (i % 3) * 0.015;
        const o = fx3Rock(h, 'rock', bx + nx * sd * out - e.ldx * age * 0.4, y, bz + nz * sd * out - e.ldy * age * 0.4, sz, sz * 0.8, sz, i % 2 ? darker(e.dust, 0.2) : e.dust);
        o.rotation.set(age * 9, i, age * 7);
      }
    }
    // Vollendet: Glut steigt aus der Spur
    if (r1 >= 4 && age < 0.7) {
      const q = age / 0.7;
      n3Flame(h, bx + Math.sin(i * 3.1) * 0.08, 0.15 + q * 0.35, bz, 0.16 * (1 - q) + 0.06, 0.4 * (1 - q) + 0.1, i % 2 ? '#ffd34d' : rc, 0.6 * (1 - q));
    }
  }
}

// --- 2D ------------------------------------------------------------------------------------------------------
// Lichtschnitt als Sichel (lens aus effekte.js), gezogen bis prog: ang = Richtung vom Anfang zum Ende
function kkCut2(ctx, cx, cy, ang, len, w, prog, op, C, rc, core = true) {
  if (prog <= 0.01 || op <= 0.01) return;
  const Lp = len * Math.min(1, prog);
  const mx = cx + Math.cos(ang) * (-len / 2 + Lp / 2);
  const my = cy + Math.sin(ang) * (-len / 2 + Lp / 2);
  // dunkle Kontur wie die Umrisse der Figuren
  if (core && C.deep) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = op * 0.85;
    ctx.fillStyle = C.deep;
    lens(ctx, mx, my, ang, Lp * 1.04, w * 1.45);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'lighter';
  if (rc) {
    ctx.globalAlpha = op * 0.45;
    ctx.fillStyle = rc;
    lens(ctx, mx, my, ang, Lp * 1.1, w * 2.3);
    ctx.fill();
  }
  ctx.globalAlpha = op * 0.5;
  ctx.fillStyle = C.edge;
  lens(ctx, mx, my, ang, Lp * 1.05, w * 1.6);
  ctx.fill();
  ctx.globalAlpha = op;
  ctx.fillStyle = C.main;
  lens(ctx, mx, my, ang, Lp, w);
  ctx.fill();
  if (core) {
    ctx.fillStyle = '#ffffff';
    lens(ctx, mx, my, ang, Lp * 0.86, w * 0.42);
    ctx.fill();
  }
}

EXTRA_EFFECTS.kkreuz3 = (ctx, e) => {
  const t = game.time - e.start;
  const r1 = e.rk >= 0 ? e.rk + 1 : 0;
  const S = 1 + 0.1 * r1;
  const C = e.aura ? KK_COL.aura : KK_COL.base;
  const rc = e.rk >= 0 ? SKILL_RANKS[e.rk].color : null;
  const own = e.owner && !e.owner.gone ? e.owner : null;
  const launched = e.t0 != null;
  const fly = launched ? e.len / KK.speed : 0;
  const tf = launched ? t - e.t0 : -1;
  const tb = launched ? tf - fly : -1;
  if (e.side2 == null && own) {
    const f = own.facing || { x: 1, y: 0 };
    e.side2 = -f.y < -0.05 ? -1 : 1;
  }
  // Blick nach oben: vor dem Stoß steht das Kreuz hinter der Figur – dann mit den Bodeneffekten unter den Figuren
  // zeichnen (sonst läge es über Kopf und Rücken); im Flug wieder darüber
  e.ground = !launched && !!own && !!own.facing && own.facing.y < -0.35;
  const s = e.side2 || 1;
  let gx;
  let gy;
  let d = 0;
  if (!launched) {
    if (!own || e.cancel) return;
    const f = own.facing || { x: 1, y: 0 };
    gx = own.x + f.x * 24;
    gy = feetY(own) + f.y * 16;
  } else {
    d = Math.min(e.len, Math.max(0, tf) * KK.speed);
    gx = e.lx + e.ldx * d;
    gy = e.ly + e.ldy * d;
  }
  const cx = gx;
  const cy = gy - 22;
  let sc = 1;
  if (!launched) sc = t < 0.36 ? 1 : 1 - 0.14 * easeOut(clamp01((t - 0.36) / 0.06));
  else sc = 1.06 + 0.28 * (e.len > 0 ? d / e.len : 1);
  const len = 66 * S * sc;
  const w = 7.5 * S;
  const a1 = Math.atan2(1, -s);
  const a2 = Math.atan2(1, s);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 1;
  if (tb < 0) {
    const p1 = launched ? 1 : clamp01((t - 0.1) / 0.05);
    const p2 = launched ? 1 : clamp01((t - 0.27) / 0.05);
    const op = launched ? 1 : 0.9 + 0.1 * Math.sin(t * 47);
    // Lichtschein am Boden unter dem Kreuz
    if (launched || p2 > 0) {
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 30 * S);
      g.addColorStop(0, C.edge);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(gx, gy, 30 * S, 12 * S, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Nachbilder
    const nA = launched ? 2 + (r1 >= 2 ? 1 : 0) : 0;
    const echo = r1 >= 2 ? rc : C.edge;
    for (let k = nA; k >= 1; k--) {
      const back = k * 14 * S;
      if (d < back) continue;
      const ex = cx - e.ldx * back;
      const ey = cy - e.ldy * back;
      kkCut2(ctx, ex, ey, a1, len * (1 - 0.06 * k), w * 0.8, 1, 0.4 / k, { main: echo, edge: echo }, null, false);
      kkCut2(ctx, ex, ey, a2, len * (1 - 0.06 * k), w * 0.8, 1, 0.4 / k, { main: echo, edge: echo }, null, false);
    }
    kkCut2(ctx, cx, cy, a1, len, w, p1, op, C, rc);
    kkCut2(ctx, cx, cy, a2, len, w, p2, op, C, rc);
    // Aufflammen in der Mitte
    const fl = !launched ? Math.max(0, 1 - Math.abs(t - 0.32) / 0.1) : 0;
    ctx.globalAlpha = 1;
    if (p2 > 0.6) {
      glow(ctx, cx, cy, (10 + 10 * fl) * S, rc || C.edge, 0.4 + 0.35 * fl);
      glow(ctx, cx, cy, (5 + 6 * fl) * S, '#ffffff', 0.5 + 0.4 * fl);
    }
    // lodernde Kanten (Aura des Schwertes, ab Legendär)
    if ((r1 >= 3 || e.aura) && p2 > 0.5) {
      for (let i = 0; i < 6; i++) {
        const a = i < 3 ? a1 : a2;
        const f = ((i % 3) - 1) * 0.36;
        const q = (t * 2.2 + i * 0.37) % 1;
        glow(ctx, cx + Math.cos(a) * len * f, cy + Math.sin(a) * len * f - q * 10, 4 + 3 * (1 - q), i % 2 && rc ? rc : C.edge, 0.8 * (1 - q));
      }
    }
  } else if (tb < KK.burst) {
    const q = tb / KK.burst;
    // Blitz
    ctx.globalAlpha = 1;
    if (tb < 0.25) {
      glow(ctx, cx, cy, (18 + 30 * tb / 0.25) * S, rc || C.edge, 0.6 * (1 - tb / 0.25));
      glow(ctx, cx, cy, (8 + 12 * tb / 0.25) * S, '#ffffff', 0.85 * (1 - tb / 0.25));
    }
    // vier Arme fliegen auseinander
    if (tb < 0.3) {
      const op = 1 - tb / 0.3;
      for (const a of [a1, a2]) {
        for (const sg of [-1, 1]) {
          const off = sg * (len * 0.25 + 90 * tb);
          kkCut2(ctx, cx + Math.cos(a) * off, cy + Math.sin(a) * off, a, len * 0.5 * (1 - 0.4 * q), w * (1 - 0.3 * q), 1, op, C, rc);
        }
      }
    }
    // Splitter
    const sd = e.kkShards2 || (e.kkShards2 = Array.from({ length: 22 }, (v, i) => ({ arm: i % 4, sp: 90 + Math.random() * 130, j: (Math.random() - 0.5) * 0.9, up: 40 + Math.random() * 80 })));
    const n = 10 + 3 * r1;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const g = sd[i % sd.length];
      const a = (g.arm < 2 ? a1 : a2) + (g.arm % 2 ? 0 : Math.PI) + g.j;
      const vx = Math.cos(a) * g.sp + e.ldx * 120;
      const vy = Math.sin(a) * g.sp * 0.7 + e.ldy * 80 - g.up;
      const px = cx + vx * tb;
      const py = cy + vy * tb + 260 * tb * tb;
      ctx.globalAlpha = 1 - q;
      ctx.fillStyle = i % 3 === 2 && rc ? rc : i % 2 ? C.edge : C.main;
      lens(ctx, px, py, Math.atan2(vy + 520 * tb, vx), 9 * S, 1.6);
      ctx.fill();
    }
  }
  ctx.restore();
};

// 2D: zwei geritzte Furchen und ein Lichtstreif dazwischen, vom Start bis zum Kreuz
EXTRA_EFFECTS.kkfurche = (ctx, e) => {
  const src = e.src;
  if (!src || src.t0 == null) return;
  const t = game.time - e.start;
  const d = Math.min(src.len, t * KK.speed);
  if (d < 2) return;
  const C = src.aura ? KK_COL.aura : KK_COL.base;
  const fade = Math.max(0, Math.min(1, (e.dur - t) / 0.6));
  const nx = -src.ldy;
  const ny = src.ldx * 0.6;
  const x1 = src.lx + src.ldx * d;
  const y1 = src.ly + src.ldy * d;
  ctx.save();
  ctx.globalAlpha = 0.55 * fade;
  ctx.strokeStyle = '#24170c';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(src.lx + nx * sd * 6, src.ly + ny * sd * 6);
    ctx.lineTo(x1 + nx * sd * 6, y1 + ny * sd * 6);
    ctx.stroke();
  }
  const glowK = Math.max(0, 1 - Math.max(0, t - 0.1) / 0.6);
  if (glowK > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.28 * glowK;
    ctx.strokeStyle = C.edge;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(src.lx, src.ly);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  ctx.restore();
};

// --- Körper in 3D: Ausholen, zwei Hiebe über Kreuz, Stoß, Nachschwingen ----------------------------------------
// Schlüsselposen in Sekunden (Kanäle wie BASIC3 in drei-figuren.js, Umrechnung auf die Dauer der Pose in kkPoseKeys).
// one: eine Waffe (Schwert, Axt, Streitaxt) – der zweite Hieb ist ein Rückhandhieb über die linke Schulter;
// Zweihänder führen dieselben Hiebe mit beiden Händen (two); dual: zwei Waffen – den zweiten Hieb schlägt die linke Hand
// (Spiegelbild des ersten), zum Stoß gehen beide Klingen nach vorn. Mit Schild bleibt der Schild vor dem Körper.
const KK_POSE = {
  one: [
    [0.09, { cy: -0.7, cx: -0.14, hy: -0.3, rx: -2.75, rz: -0.6, lx: -1.0, lz: 0.3, gr: 0.25, gl: -0.15, hpy: 0.02, wx: 0.7 }, 'out'],
    [0.14, { cy: 0.6, cx: 0.26, hy: 0.3, rx: -0.85, rz: 0.7, lx: -1.15, lz: 0.2, gr: -0.45, gl: 0.35, hpz: 0.12, hpy: -0.06, wx: 2.35 }, 'in'],
    [0.19, { cy: 0.68, cx: 0.24, hy: 0.32, rx: -0.6, rz: 0.82, lx: -1.0, lz: 0.25, gr: -0.4, gl: 0.3, hpz: 0.1, hpy: -0.05, wx: 2.4 }, 'out'],
    [0.26, { cy: 0.7, cx: -0.12, hy: 0.32, rx: -2.55, rz: 0.65, lx: -0.85, lz: 0.4, gr: -0.15, gl: 0.2, hpz: 0.04, hpy: 0.01, wx: 0.85 }, 'out'],
    [0.31, { cy: -0.62, cx: 0.26, hy: -0.3, rx: -0.95, rz: -0.8, lx: -1.0, lz: 0.3, gr: 0.3, gl: -0.45, hpz: 0.14, hpy: -0.06, wx: 2.3 }, 'in'],
    [0.37, { cy: -0.28, cx: -0.08, hy: -0.16, rx: -0.5, rz: -0.18, lx: -1.25, lz: 0.2, gr: 0.32, gl: -0.15, hpz: -0.05, hpy: -0.03, wx: 2.3 }, 'out'],
    [0.43, { cy: 0.2, cx: 0.28, hy: 0.1, rx: -1.62, rz: 0.05, lx: -1.5, lz: 0.05, gr: -0.85, gl: 0.55, hpz: 0.3, hpy: -0.09, wx: 2.75 }, 'in'],
    [0.58, { cy: 0.22, cx: 0.24, hy: 0.1, rx: -1.55, rz: 0.05, lx: -1.35, lz: 0.1, gr: -0.75, gl: 0.5, hpz: 0.26, hpy: -0.08, wx: 2.7 }, 'out']
  ],
  dual: [
    [0.09, { cy: -0.7, cx: -0.14, hy: -0.3, rx: -2.75, rz: -0.6, lx: -0.7, lz: 0.35, gr: 0.25, gl: -0.15, hpy: 0.02, wx: 0.7, wl: 1.6 }, 'out'],
    [0.14, { cy: 0.6, cx: 0.26, hy: 0.3, rx: -0.85, rz: 0.7, lx: -0.9, lz: 0.45, gr: -0.45, gl: 0.35, hpz: 0.12, hpy: -0.06, wx: 2.35, wl: 1.6 }, 'in'],
    [0.19, { cy: 0.62, cx: 0.2, hy: 0.3, rx: -0.75, rz: 0.6, lx: -1.4, lz: 0.5, gr: -0.35, gl: 0.3, hpz: 0.1, hpy: -0.04, wx: 2.3, wl: 1.0 }, 'out'],
    [0.26, { cy: 0.72, cx: -0.14, hy: 0.3, rx: -0.7, rz: 0.25, lx: -2.75, lz: 0.6, gr: -0.15, gl: 0.25, hpz: 0.02, hpy: 0.02, wx: 2.0, wl: 0.7 }, 'out'],
    [0.31, { cy: -0.6, cx: 0.26, hy: -0.3, rx: -0.8, rz: -0.25, lx: -0.85, lz: -0.7, gr: 0.35, gl: -0.45, hpz: 0.14, hpy: -0.06, wx: 1.9, wl: 2.35 }, 'in'],
    [0.37, { cy: -0.1, cx: -0.1, hy: -0.05, rx: -0.4, rz: -0.32, lx: -0.4, lz: 0.32, gr: 0.32, gl: -0.15, hpz: -0.05, hpy: -0.03, wx: 2.45, wl: 2.45 }, 'out'],
    [0.43, { cy: 0, cx: 0.28, hy: 0, rx: -1.6, rz: 0.12, lx: -1.6, lz: -0.12, gr: -0.85, gl: 0.55, hpz: 0.3, hpy: -0.09, wx: 2.75, wl: 2.75 }, 'in'],
    [0.58, { cy: 0, cx: 0.24, hy: 0, rx: -1.52, rz: 0.12, lx: -1.52, lz: -0.12, gr: -0.75, gl: 0.5, hpz: 0.26, hpy: -0.08, wx: 2.7, wl: 2.7 }, 'out']
  ]
};
// Schild: bleibt vor dem Körper, beim Stoß nach vorn
const KK_SHIELD = { lx: -1.05, lz: 0.32 };
const KK_SHIELD_PUSH = { lx: -1.3, lz: 0.14 };
const KK_POSE_CACHE = {};
function kkPoseKeys(variant, dur) {
  const key = variant + ':' + dur;
  if (KK_POSE_CACHE[key]) return KK_POSE_CACHE[key];
  const base = variant === 'dual' ? KK_POSE.dual : KK_POSE.one;
  const keys = [[0, N3]];
  base.forEach(([s, pose, ease], i) => {
    let q = pose;
    if (variant === 'two') q = { ...pose, two: 1 };
    else if (variant === 'shield') q = { ...pose, ...(i >= 6 ? KK_SHIELD_PUSH : KK_SHIELD) };
    keys.push([Math.min(0.98, s / dur), q, ease]);
  });
  keys.push([1, N3]);
  KK_POSE_CACHE[key] = keys;
  return keys;
}

SKILL_POSE3.kreuz = function (B, sw, kind, p, a) {
  const eq = p.equipment || {};
  const dual = eq.schild && isOffhand(eq.schild);
  const variant = dual ? 'dual' : twoHanded3(kind) ? 'two' : eq.schild ? 'shield' : 'one';
  const dur = p.swingDur || 0.75;
  // läuft die Figur schon wieder (nach der Sperre), bleiben Beine und Hüfte beim Gehen
  const mv = p.moving && !p.riding;
  const gl0 = B[BH.legL].rotation.x;
  const gr0 = B[BH.legR].rotation.x;
  const hy0 = B[BH.hips].position.y;
  const hz0 = B[BH.hips].position.z;
  const iw = IDLE_WRIST3[kind] || 0;
  poseKeys3(B, kkPoseKeys(variant, dur), sw, iw ? { wx: iw, wl: dual ? iw : 0 } : null);
  if (mv) {
    B[BH.legL].rotation.x = gl0;
    B[BH.legR].rotation.x = gr0;
    B[BH.hips].position.y = hy0;
    B[BH.hips].position.z = hz0;
  }
  B[BH.cape].rotation.x = 0.2 + 0.35 * Math.max(0, Math.sin(sw * Math.PI * 1.6));
  // Waffe leuchtet auf: beim Ausholen langsam, bei beiden Hieben und beim Stoß hell
  const T = sw * dur;
  const pk = (c, wd) => Math.max(0, 1 - Math.abs(T - c) / wd);
  const g = Math.max(T < KK.cut1 ? (T / KK.cut1) * 0.6 : 0, pk(KK.cut1, 0.07), pk(KK.cut2, 0.07), pk(KK.launch, 0.09));
  const cc = p.kkCast && game.time - p.kkCast.at < 2 ? p.kkCast : null;
  const col = cc && cc.aura ? '#ffc23a' : cc && cc.rk >= 0 ? SKILL_RANKS[cc.rk].color : '#9fd0ff';
  if (g > 0.02) poseWeaponGlow(a, col, 0.25 + 0.5 * g);
};

// --- Körper in 2D: Winkel der Waffe, Ausfallschritt und Neigung über den Ablauf ---------------------------------
// Werte in Sekunden ab dem Auslösen; Winkel relativ zur Blickrichtung (null = Ruhehaltung), 'in' beschleunigt (Hieb)
const KK_ANG2 = [[0, null], [0.09, -2.45], [0.14, 1.3, 'in'], [0.19, 1.5], [0.26, -2.1], [0.31, 1.05, 'in'], [0.37, 0.45], [0.43, -0.05, 'in'], [0.58, 0.02], [0.75, null]];
// zweite Waffe (nur von der Seite): wartet tief, schlägt den zweiten Hieb, stößt mit
const KK_OFF2 = [[0, null], [0.09, 0.3], [0.14, 0.5], [0.19, -0.6], [0.26, -2.5], [0.31, 1.3, 'in'], [0.37, 0.5], [0.43, -0.1, 'in'], [0.58, 0], [0.75, null]];
const KK_LUNGE2 = [[0, 0], [0.09, -2], [0.14, 3, 'in'], [0.26, 0.5], [0.31, 4, 'in'], [0.37, 1], [0.43, 8, 'in'], [0.58, 7], [0.75, 0]];
const KK_TILT2 = [[0, 0], [0.09, -0.1], [0.14, 0.1, 'in'], [0.26, -0.06], [0.31, 0.1, 'in'], [0.37, -0.02], [0.43, 0.12, 'in'], [0.58, 0.1], [0.75, 0]];
function kkKey2(keys, T, idle) {
  let i = 0;
  while (i < keys.length - 2 && T > keys[i + 1][0]) i++;
  const [t0, va] = keys[i];
  const [t1, vb, ease] = keys[i + 1];
  const u0 = clamp01((T - t0) / Math.max(1e-4, t1 - t0));
  const u = ease === 'in' ? u0 * u0 : 1 - (1 - u0) * (1 - u0);
  const a = va == null ? idle : va;
  const b = vb == null ? idle : vb;
  return a + (b - a) * u;
}
// t: Fortschritt der Pose 0…1; off: die zweite Waffe (Beidhändigkeit)
function kreuzAngle2d(p, dir, t, off = false) {
  const fa = localFacingAngle(dir);
  const idle = (off ? WEAPON_IDLE[dir] + 0.5 : WEAPON_IDLE[dir]) - fa;
  return fa + kkKey2(off ? KK_OFF2 : KK_ANG2, t * (p.swingDur || 0.75), idle);
}
function kreuzLunge2d(p, t) {
  return kkKey2(KK_LUNGE2, t * (p.swingDur || 0.75), 0);
}
function kreuzTilt2d(p, t) {
  return kkKey2(KK_TILT2, t * (p.swingDur || 0.75), 0);
}
