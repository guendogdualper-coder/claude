// Klingenbogen (Krieger, seit 15.52): Hiebe mit Wucht. Spielerwunsch nach dem Lernvideo „How to make sword swipes
// JUICY“: Schlageffekt und Klang in diese Richtung, nicht nachgebaut. Gilt für den Grundangriff des Kriegers mit
// Schwert, Axt, Zweihänder und Streitaxt (auch beidhändig bzw. mit Titanengriff), für eigene Hiebe und die der Mitspieler.
//
// Der Bogen folgt den fünf Schritten aus dem Video:
//   1. Spitze verfolgen – die Bahn der Klingenspitze kommt aus den echten Schlüsselposen dieses Kombo-Schlags (BASIC3
//      bzw. DUAL_KEYS3 in drei-figuren.js), Klingenlänge und -lage aus der Klingenachse des Modells (model.weaponAxis,
//      bei der Nebenhand offhandAxis). Nachgerechnet wird einmal je Modell, Waffe, Schlag und Hand (kb3Trace) an einem
//      kleinen Ersatz-Skelett; danach liegt die Bahn im Speicher.
//   2. Bogen – von der Spitze (etwas darüber hinaus) bis fast zum Heft (5 % der Klinge), vom Ausholen bis zum Nachschwung.
//   3. Fläche – ein Streifen aus KB.N + 1 Spalten × 2 Ecken. Netze kommen aus einem Vorrat (keine neue Geometrie je Hieb),
//      die Ecken werden einmal je Hieb geschrieben, danach ändern sich nur Zahlen im Shader. Ein Zeichenaufruf je Hieb,
//      kein Licht, kein Schatten.
//   4. Schweif ausblenden – im Shader: vor der Klinge nichts, an der Klinge voll, zum Anfang des Schwungs weich auf 0. Der Kopf
//      folgt der Klinge (auch beim Treffer-Stopp), der Schweif zieht sich danach zur Klinge hin zusammen.
//   5. Streifen × Maske – eine Schlieren-Textur (einmal per Canvas erzeugt) gekachelt entlang des Bogens und mitwandernd,
//      darüber die Maske aus 4. Dazu eine helle Vorderkante, ein kurzer Lichtblitz an der Spitze und wenige Funken.
// Farbe: stählern weiß-blau; Aura des Schwertes golden; eine Waffe mit Seltenheit tönt den Bogen in ihrer Farbe. Kein
// Bodenring, keine Runen oder Sterne am Boden: der Bogen liegt in Waffenhöhe in der Luft.
//
// 2D: dieselbe Idee als Sichel mit Verlauf und Schlieren aus vorgerechneten Bildern (je Farbe sechs Längen, bei Bedarf
// einmal gebacken; kein shadowBlur, kein ctx.filter) – ein drawImage je Hieb und Bild.
//
// Treffergefühl (nur das Bild, Spiellogik und Netz laufen weiter):
//   – Treffer-Stopp: Figur (Pose über swingProgress, zeichnen.js) und Ziel (Pose in animateCreature bzw. drawMonster)
//     stehen KB.hold s still, danach holt die Figur in KB.catchUp s auf (schneller Nachschwung)
//   – das Ziel blitzt kurz weiß auf (nur das Ziel, kein Bildschirmblitz) und ruckt ein Stück vom Krieger weg
//   – Kamerawackeln nur mit der Einstellung „Wackeln“ (shakeScreen), sehr leicht
//   – Schwung knackiger: kurzes, spätes Ausholen (kbSwingT), sehr schneller Hieb, Nachschwung
// Klang: eigene, im Rechner erzeugte Hiebe (tools/klang-synth/hiebe.py, Einträge klingenhieb_* in tools/klang-liste.json):
// Luftzischen hoch → tief, metallisches „Schhhing“, beim Treffer tiefer Schlag und knackiger Einschlag; je Waffenart
// mehrere Varianten, der letzte Kombo-Schlag (und kritische Treffer) wuchtiger.
// Mitspieler: alles kommt aus den schon gesendeten Schwungdaten (Zähler, Art, Kombo, Dauer) und der Ausrüstung – kein
// neues Netzfeld; ältere Versionen zeichnen weiter ihren alten Schwung.

const KB = {
  on: true, // nur für Messungen (vorher/nachher): false = alter Schwung, alte Klänge
  kinds: { sword: 1, axe: 1, greatsword: 1, greataxe: 1 },
  hold: 0.045, // Treffer-Stopp (s), Finisher und kritische Treffer holdFin
  holdFin: 0.06,
  catchUp: 0.05, // danach holt die Pose auf (s)
  flash: 0.11, // Ziel blitzt weiß (s)
  jolt: 4, // Rückstoß-Ruck des Ziels (Weltpixel), Finisher × 1,6
  joltBack: 0.12, // Rückweg des Rucks (s)
  life: 0.26, // Bogen nach dem Treffer-Bild sichtbar (s, ohne Treffer-Stopp)
  inner: 0.05, // innerer Rand: Anteil der Klinge ab dem Heft (fast am Heft)
  over: 0.28, // äußerer Rand: so viel über die Spitze hinaus (von schräg oben wirkt der Bogen sonst schmal)
  N: 24, // Spalten des Bogens
  last: null // letzter eigener Hieb (für die Treffer im selben Bild)
};

// Farben: deep Grund der Fläche (deckend gemischt, sichtbar auch auf hellem Sand und Schnee), main Schlieren, edge
// Außenkante, hot Vorderkante und Blitz (beide leuchtend addiert)
const KB_PAL = {
  stahl: { key: 'stahl', deep: '#10308c', main: '#3f7cff', edge: '#a6d4ff', hot: '#f4f9ff', spark: ['#ffffff', '#d8ecff', '#8cc4ff'] },
  aura: { key: 'aura', deep: '#7a3404', main: '#ff8a1a', edge: '#ffdc80', hot: '#fff8e0', spark: ['#ffffff', '#ffe9a0', '#ffc24a'] }
};

function kbMix(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}

// Farbe des Bogens: Aura des Schwertes golden, sonst Stahl – getönt mit der Seltenheit der Waffe (bzw. dem Rang)
function kbPalette(p, rk = -1) {
  if (p.buffs && p.buffs.some((b) => b.id === 'schwertaura')) return KB_PAL.aura;
  let tint = null;
  if (rk >= 0 && typeof SKILL_RANKS !== 'undefined' && SKILL_RANKS[rk]) tint = SKILL_RANKS[rk].color;
  else {
    const w = p.equipment && p.equipment.waffe;
    const r = w && typeof rarityOf === 'function' ? rarityOf(w) : 0;
    if (r > 0 && typeof RARITIES !== 'undefined' && RARITIES[r]) tint = RARITIES[r].color;
  }
  if (!tint || tint[0] !== '#' || tint.length !== 7) return KB_PAL.stahl;
  const S = KB_PAL.stahl;
  return KB_PAL[tint] || (KB_PAL[tint] = { key: tint, deep: kbMix(S.deep, kbMix(tint, '#000000', 0.45), 0.6), main: kbMix(S.main, tint, 0.6), edge: kbMix(S.edge, tint, 0.4), hot: S.hot, spark: ['#ffffff', kbMix('#ffffff', tint, 0.4), tint] });
}

// Hiebe des Kriegers mit Hiebwaffe (nicht im Sattel)
function kbActive(p) {
  if (!KB.on || !p || p.classId !== 'krieger' || p.riding) return false;
  return !!KB.kinds[weaponKindOf(p)];
}
function kbDual(p) {
  return !!(p.equipment && typeof isOffhand === 'function' && isOffhand(p.equipment.schild));
}
const kb3On = () => typeof V3 !== 'undefined' && V3.on && typeof FX3 !== 'undefined' && !!FX3.group;

// --- Auslösen (vfxSwing, effekte.js: eigener Hieb im Treffer-Bild und Mitspieler im Treffer-Bild ihrer Animation) ----
// true: der Klingenbogen zeichnet diesen Hieb (statt der alten Schwungspur)
function kbSwing(p) {
  if (!kbActive(p) || p.swingKind !== 'combo') return false;
  const kind = weaponKindOf(p);
  const dual = kbDual(p);
  const combo = (p.combo || 0) % 3;
  const dur = p.swingDur || 0.42;
  const imp = (typeof BASIC_TIMING !== 'undefined' && BASIC_TIMING[kind] ? BASIC_TIMING[kind][1] : 0.45);
  const sw0 = p.swing > 0 ? Math.max(0, Math.min(1, 1 - p.swing / dur)) : imp;
  const e = { type: 'kbogen', follow: p, kind, combo, dual, left: dual && combo === 1, fin: combo === 2, swDur: dur, sw0, pal: kbPalette(p), dur: KB.life + KB.holdFin + KB.catchUp + 0.02 };
  // 3D: Bahn der Spitze gleich bestimmen; ohne brauchbare Bahn (Figur noch nicht gebaut) bleibt der alte Schwung
  if (kb3On()) {
    const a = typeof actors3 !== 'undefined' ? actors3.get(entityKey(p)) : null;
    e.path3 = a ? kb3Path(a, e) : null;
    if (!e.path3) return false;
    e.h3 = a.heading;
  }
  // 2D: Richtung und Hand wie beim Zeichnen der Waffe (vfxSwing)
  const dir = facingDir(p.facing || { x: 1, y: 0 });
  const flip = dir === 'side' && p.facing.x < 0;
  const hand = handPosition(dir, 0, 'right');
  e.dir2 = dir;
  e.flip2 = flip;
  e.ox = flip ? -hand.x : hand.x;
  e.oy = hand.y;
  addEffect(e);
  if (p === game.player) KB.last = { p, at: game.time, e };
  // Funken in 2D am Ende der Klinge (in 3D zeichnet sie der Bogen selbst)
  if (!kb3On() && !(typeof LOAD !== 'undefined' && game.effects.length >= LOAD.fx)) {
    const a = kb2Angle(p, dir, e.sw0, e.fin);
    const wa = flip ? Math.PI - a : a;
    const r = kb2Radius(e);
    const x = p.x + e.ox + Math.cos(wa) * r;
    const y = feetY(p) + e.oy + Math.sin(wa) * r;
    particles(x, y, { count: e.fin ? 6 : 3, color: e.pal.spark, speed: [90, 210], life: [0.12, 0.26], size: [1.2, 2.2], shape: 'spark', drag: 6 });
  }
  return true;
}

// Treffer des eigenen Grundangriffs (vfxImpact, effekte.js; hitMonster setzt vorher _sKindAt im selben Bild):
// Ziel blitzt und ruckt, Figur und Ziel halten kurz an, leichtes Wackeln
function kbStruck(m, crit) {
  const L = KB.last;
  if (!L || L.at !== game.time || !m || m._sKindAt !== game.time || !m._sKind) return;
  const e = L.e;
  const p = L.p;
  const fin = e.fin || !!crit;
  if (!m.isStone) {
    m.kbHitAt = game.time;
    m.kbHold = fin ? KB.holdFin : KB.hold;
    m.kbFin = fin;
    const dx = m.x - p.x;
    const dy = m.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    m.kbDx = dx / d;
    m.kbDy = dy / d;
  }
  if (e.hit) return;
  e.hit = true;
  e.hold = fin ? KB.holdFin : KB.hold;
  p.kbHoldAt = game.time;
  p.kbHold = e.hold;
  p.kbHoldSeq = p.swingSeq;
  shakeScreen(fin ? 1.8 : 1);
}

// Verzug der Pose durch den Treffer-Stopp (s): erst steht sie, dann holt sie auf
function kbLag(age, hold) {
  if (!(age >= 0) || !(hold > 0)) return 0;
  if (age < hold) return age;
  if (age < hold + KB.catchUp) return hold * (1 - (age - hold) / KB.catchUp);
  return 0;
}

// Zeitpunkt der Ausholpose im Schlag (Anteil der Schwungzeit)
function kbWindT(p) {
  const kind = weaponKindOf(p);
  const keys = typeof BASIC3 !== 'undefined' ? kb3Keys({ kind, combo: (p.combo || 0) % 3, dual: kbDual(p) }) : null;
  if (keys && keys.length >= 4) return keys[1][0];
  const imp = typeof BASIC_TIMING !== 'undefined' && BASIC_TIMING[kind] ? BASIC_TIMING[kind][1] : 0.45;
  return imp - 0.09;
}

// Fortschritt des Schlags fürs Bild (swingProgress, zeichnen.js): Treffer-Stopp und knackiges Ausholen –
// die ersten 25 % der Ausholzeit bleibt die Figur bereit, dann holt sie schnell aus (bis 88 %) und spannt kurz
function kbSwingT(p, t) {
  if (p.swingKind !== 'combo' || !kbActive(p)) return t;
  const dur = p.swingDur || 0.42;
  if (p.kbHoldSeq === p.swingSeq) t -= kbLag(game.time - p.kbHoldAt, p.kbHold) / dur;
  const t1 = kbWindT(p);
  if (t < t1) {
    const a = t1 * 0.25;
    const b = t1 * 0.88;
    t = t <= a ? 0 : t >= b ? t1 : t1 * (t - a) / (b - a);
  }
  return t;
}

// sichtbarer Fortschritt des Schlags für den Bogen (Sekunden seit dem Treffer-Bild)
function kbSwVis(e, age) {
  return e.sw0 + (age - (e.hit ? kbLag(age, e.hold) : 0)) / e.swDur;
}

// --- Ziel: Stillstand, Aufblitzen, Ruck ---------------------------------------------------------------------
// Anteil des Aufblitzens (0 … 1) und Weite des Rucks (Weltpixel) für ein getroffenes Ziel; null: vorbei
const _kbJ = { x: 0, y: 0, f: 0, held: false };
function kbTargetFx(m) {
  const age = game.time - m.kbHitAt;
  const hold = m.kbHold || KB.hold;
  if (!(age >= 0) || age > hold + KB.joltBack + 0.02) return null;
  const J = KB.jolt * (m.kbFin ? 1.6 : 1) * (age < hold ? 1 : Math.pow(Math.max(0, 1 - (age - hold) / KB.joltBack), 2));
  _kbJ.x = (m.kbDx || 0) * J;
  _kbJ.y = (m.kbDy || 0) * J;
  _kbJ.f = age < hold ? 1 : Math.max(0, 1 - (age - hold) / Math.max(0.01, KB.flash - hold));
  _kbJ.held = age < hold;
  return _kbJ;
}

// 3D (animateCreature, drei-figuren.js): während des Stillstands keine neue Pose – nur die Lage folgt dem Monster
function kbMonHold3(a, m, fy) {
  const j = kbTargetFx(m);
  if (!j || !j.held || !a.kbPosed) return false;
  a.group.position.x = (m.x + j.x) * U3;
  a.group.position.z = (fy + j.y) * U3;
  kbFlash3(a, j.f, m.kbFin);
  return true;
}
// nach der Pose: Ruck und Aufblitzen
function kbMonFx3(a, m) {
  a.kbPosed = true;
  const j = kbTargetFx(m);
  if (!j) return;
  a.group.position.x += j.x * U3;
  a.group.position.z += j.y * U3;
  kbFlash3(a, j.f, m.kbFin);
}
function kbFlash3(a, f, fin) {
  const mat = a.mats && a.mats.lit;
  if (!mat || !(f > 0)) return;
  const k = f * (fin ? 1 : 0.85);
  mat.emissive.setRGB(0.92 * k, 0.95 * k, k);
}

// 2D (drawMonster, zeichnen.js): Ruck, Aufblitzen (weiße Silhouette) und Stillstand
function kbJolt2d(m) {
  return m.kbHitAt != null ? kbTargetFx(m) : null;
}

// --- Bahn der Spitze (3D) ---------------------------------------------------------------------------------
const KB3 = { tex: null, fake: null, paths: new WeakMap() };
const _kb3a = new THREE.Vector3();
const _kb3b = new THREE.Vector3();
const _kb3c = new THREE.Vector3();
const _kb3d = new THREE.Vector3();

function kb3Keys(e) {
  let list = typeof BASIC3 !== 'undefined' ? BASIC3[e.kind] : null;
  if (!list) return null;
  if (e.dual && typeof DUAL_MIRROR3 !== 'undefined' && DUAL_MIRROR3[e.kind] != null) list = dualKeys3(e.kind);
  return list[e.combo % list.length];
}

// Ersatz-Skelett: die ersten zehn Knochen der Menschenfigur (Wurzel, Hüfte, Brust, Kopf, Arme, Hände, Beine)
function kb3Fake(rig) {
  if (KB3.fake) return KB3.fake;
  const F = [];
  for (let i = 0; i < 10; i++) F.push(new THREE.Object3D());
  for (let i = 1; i < 10; i++) {
    const par = rig[i] ? rig[i].parent : -1;
    if (par >= 0 && par < 10) F[par].add(F[i]);
  }
  KB3.fake = F;
  return F;
}

// Bahn je Modell, Waffe, Schlag und Hand (einmal gerechnet, dann aus dem Speicher); null: kein Bogen
function kb3Path(a, e) {
  const model = a.model;
  if (!model || model.family !== 'human' || !model.rig || !a.rest) return null;
  let byModel = KB3.paths.get(model);
  if (!byModel) KB3.paths.set(model, (byModel = new Map()));
  const key = e.kind + '|' + e.combo + '|' + (e.dual ? 1 : 0);
  if (byModel.has(key)) return byModel.get(key);
  let P = null;
  try {
    P = kb3Trace(a, e);
  } catch (err) {
    P = null;
  }
  byModel.set(key, P);
  return P;
}

// Schritt 1 und 2: Pose für viele Zeitpunkte zwischen Ausholen und Nachschwung, Spitze und Heft je Zeitpunkt, dann
// gleichmäßig nach dem Weg der Spitze auf KB.N + 1 Spalten verteilt (innen fast am Heft, außen über der Spitze)
function kb3Trace(a, e) {
  const model = a.model;
  const axis = e.left ? model.offhandAxis : model.weaponAxis;
  const keys = kb3Keys(e);
  if (!axis || !keys || keys.length < 4) return null;
  const F = kb3Fake(model.rig);
  const t1 = keys[1][0];
  const t2 = keys[2][0];
  const t3 = keys[keys.length - 2][0];
  const iw = (typeof IDLE_WRIST3 !== 'undefined' && IDLE_WRIST3[e.kind]) || 0;
  const def = iw ? { wx: iw, wl: e.dual ? iw : 0 } : null;
  const hand = e.left ? BH.handL : BH.handR;
  const hp = model.rig[hand].pos;
  const M = 48;
  const M1 = 32;
  const sw = new Float32Array(M);
  const tip = new Float32Array(M * 3);
  const base = new Float32Array(M * 3);
  for (let i = 0; i < M; i++) {
    const s = i < M1 ? t1 + (t2 - t1) * (i / M1) : t2 + (t3 - t2) * ((i - M1) / (M - M1 - 1));
    for (let b = 0; b < 10; b++) {
      F[b].rotation.set(0, 0, 0);
      F[b].position.copy(a.rest[b]);
    }
    poseKeys3(F, keys, s, def);
    F[0].updateMatrixWorld(true);
    const W = F[hand].matrixWorld;
    _kb3a.set(axis.tip.x - hp[0], axis.tip.y - hp[1], axis.tip.z - hp[2]).applyMatrix4(W);
    _kb3b.set(axis.base.x - hp[0], axis.base.y - hp[1], axis.base.z - hp[2]).applyMatrix4(W);
    sw[i] = s;
    tip[i * 3] = _kb3a.x;
    tip[i * 3 + 1] = _kb3a.y;
    tip[i * 3 + 2] = _kb3a.z;
    base[i * 3] = _kb3b.x;
    base[i * 3 + 1] = _kb3b.y;
    base[i * 3 + 2] = _kb3b.z;
  }
  // Weg der Spitze
  const cum = new Float32Array(M);
  for (let i = 1; i < M; i++) {
    const dx = tip[i * 3] - tip[i * 3 - 3];
    const dy = tip[i * 3 + 1] - tip[i * 3 - 2];
    const dz = tip[i * 3 + 2] - tip[i * 3 - 1];
    cum[i] = cum[i - 1] + Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  const L = cum[M - 1];
  if (!(L > 0.35)) return null;
  const N = KB.N;
  const pos = new Float32Array((N + 1) * 2 * 3);
  const swc = new Float32Array(N + 1);
  let i = 1;
  for (let j = 0; j <= N; j++) {
    const want = (L * j) / N;
    while (i < M - 1 && cum[i] < want) i++;
    const f = cum[i] > cum[i - 1] ? Math.max(0, Math.min(1, (want - cum[i - 1]) / (cum[i] - cum[i - 1]))) : 0;
    const lerp = (A, k) => A[(i - 1) * 3 + k] + (A[i * 3 + k] - A[(i - 1) * 3 + k]) * f;
    swc[j] = sw[i - 1] + (sw[i] - sw[i - 1]) * f;
    for (let k = 0; k < 3; k++) {
      const tp = lerp(tip, k);
      const bs = lerp(base, k);
      pos[j * 6 + k] = bs + (tp - bs) * KB.inner;
      pos[j * 6 + 3 + k] = tp + (tp - bs) * KB.over;
    }
  }
  return { pos, swc, len: L };
}

// Lage der Klinge auf dem Bogen (0 … 1) zum Fortschritt s
function kb3HeadU(P, s) {
  const c = P.swc;
  const N = c.length - 1;
  if (s <= c[0]) return 0;
  if (s >= c[N]) return 1;
  let j = 1;
  while (j < N && c[j] < s) j++;
  const f = c[j] > c[j - 1] ? (s - c[j - 1]) / (c[j] - c[j - 1]) : 0;
  return (j - 1 + f) / N;
}

// --- Schritt 5: Schlieren-Textur (einmal per Canvas) ----------------------------------------------------------
// Grauwerte: lange, zur Klinge hin hellere Striche (x entlang des Bogens, nahtlos gekachelt), außen dichter;
// oben im Bild ist außen (CanvasTexture dreht y)
function kb3Tex() {
  if (KB3.tex) return KB3.tex;
  const W = 256;
  const H = 64;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  const lg = g.createLinearGradient(0, H, 0, 0);
  lg.addColorStop(0, 'rgba(255,255,255,0.06)');
  lg.addColorStop(0.65, 'rgba(255,255,255,0.22)');
  lg.addColorStop(1, 'rgba(255,255,255,0.4)');
  g.fillStyle = lg;
  g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'lighter';
  let seed = 917;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 52; i++) {
    const v = Math.pow(rnd(), 0.55);
    const y = (1 - v) * (H - 6) + 3;
    const len = 40 + rnd() * 170;
    const x0 = rnd() * W;
    const th = 0.8 + rnd() * 2.4 * (0.4 + v);
    const al = 0.2 + rnd() * 0.6;
    for (const off of [0, -W]) {
      const gr = g.createLinearGradient(x0 + off, 0, x0 + off + len, 0);
      gr.addColorStop(0, 'rgba(255,255,255,0)');
      gr.addColorStop(0.75, `rgba(255,255,255,${al.toFixed(2)})`);
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(x0 + off, y - th / 2, len, th);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  KB3.tex = t;
  return t;
}

// --- Schritt 3 und 4: Netz aus dem Vorrat, Shader mit Schweif, Schlieren und Vorderkante ------------------------
const KB3_VS = `varying vec2 vUv;
void main() {
	vUv = uv;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
// Gemischt in einem Zug (vormultipliziertes Alpha, ONE / ONE_MINUS_SRC_ALPHA): die Fläche deckt in Tiefblau mit
// helleren Schlieren (wie normal gemischt – auf dem hellen Boden der Karten verschwände ein rein addierter Bogen),
// Außenkante und Vorderkante leuchten addiert (Alpha 0)
const KB3_FS = `uniform sampler2D map;
uniform float uHead;
uniform float uTrail;
uniform float uAlpha;
uniform float uGlow;
uniform float uScroll;
uniform float uFin;
uniform vec3 uDeep;
uniform vec3 uMain;
uniform vec3 uEdge;
uniform vec3 uHot;
varying vec2 vUv;
void main() {
	float u = vUv.x;
	float v = vUv.y;
	float d = uHead - u;
	float front = smoothstep(-0.035, 0.0, d);
	float t = clamp(d / max(uTrail, 0.001), 0.0, 1.0);
	float tail = smoothstep(1.0, 0.3, t) * front;
	float s = texture2D(map, vec2(u * 1.7 - uScroll, v)).r;
	float inner = smoothstep(0.0, 0.5, v);
	float rim = smoothstep(0.8, 0.95, v) * (1.0 - 0.6 * smoothstep(0.975, 1.0, v));
	float lead = exp(-max(d, 0.0) * (22.0 - 6.0 * uFin)) * front * smoothstep(0.15, 0.85, v);
	float a = clamp(tail * inner * (0.45 + 0.8 * s) * (0.6 + 0.4 * v), 0.0, 1.0) * 0.9 * uAlpha;
	vec3 body = mix(uDeep, uMain, clamp(0.25 + 1.1 * s * v, 0.0, 1.0));
	vec3 glow = uEdge * (rim * tail * (0.55 + 0.6 * s)) + uHot * (lead * (0.9 + 0.4 * uFin) + rim * tail * tail * 0.45);
	gl_FragColor = vec4(body * a + glow * uAlpha * uGlow, a);
}`;

function kb3Make() {
  const N = KB.N;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((N + 1) * 2 * 3), 3));
  const uv = new Float32Array((N + 1) * 2 * 2);
  const idx = [];
  for (let j = 0; j <= N; j++) {
    uv[j * 4] = j / N;
    uv[j * 4 + 1] = 0;
    uv[j * 4 + 2] = j / N;
    uv[j * 4 + 3] = 1;
    if (j < N) idx.push(j * 2, j * 2 + 1, j * 2 + 2, j * 2 + 1, j * 2 + 3, j * 2 + 2);
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: kb3Tex() }, uHead: { value: 0 }, uTrail: { value: 1 }, uAlpha: { value: 0 }, uGlow: { value: 1 }, uScroll: { value: 0 }, uFin: { value: 0 },
      uDeep: { value: new THREE.Color() }, uMain: { value: new THREE.Color() }, uEdge: { value: new THREE.Color() }, uHot: { value: new THREE.Color() }
    },
    vertexShader: KB3_VS,
    fragmentShader: KB3_FS,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    side: THREE.DoubleSide
  });
  const o = new THREE.Mesh(g, mat);
  o.frustumCulled = false;
  o.renderOrder = 5;
  o.castShadow = false;
  o.receiveShadow = false;
  o.matrixAutoUpdate = true;
  o.userData.kind = 'kbogen';
  FX3.group.add(o);
  return o;
}
// aus dem Vorrat (fx3Release gibt alle Teile eines Effekts nach jedem Bild in FX3.pools zurück)
function kb3Take(h) {
  const pool = FX3.pools.kbogen || (FX3.pools.kbogen = []);
  const o = pool.pop() || kb3Make();
  o.visible = true;
  h.parts.push(o);
  return o;
}

// Punkt im Raum der Figur (beim Treffer gemerkt: Drehung und Größe) → Welt
function kb3World(out, P, j, side, e, a) {
  const q = (j * 2 + side) * 3;
  const s = a.group.scale.x;
  const x = P.pos[q] * s;
  const y = P.pos[q + 1] * s;
  const z = P.pos[q + 2] * s;
  const c = Math.cos(e.h3);
  const n = Math.sin(e.h3);
  return out.set(a.group.position.x + x * c + z * n, a.group.position.y + y, a.group.position.z - x * n + z * c);
}

FX3_TYPES.add('kbogen');
FX3_DRAW.kbogen = function (h, e) {
  const p = e.follow;
  // Vorwärmen der Shader (v3WarmFx): ein unsichtbares Netz genügt
  if (!e.kind) {
    if (!p) return;
    const o = kb3Take(h);
    o.material.uniforms.uAlpha.value = 0;
    o.position.set(p.x * U3, 1, feetY(p) * U3);
    return;
  }
  const P = e.path3;
  if (!P || !p || p.dead) return;
  const a = actors3.get(entityKey(p));
  if (!a || !a.group.visible || !a.group.parent) return;
  const age = game.time - e.start;
  const lag = e.hit ? kbLag(age, e.hold) : 0;
  const vis = age - lag;
  const q = vis / KB.life;
  if (q >= 1) return;
  const head = kb3HeadU(P, kbSwVis(e, age));
  const o = kb3Take(h);
  if (o.userData.owner !== e) {
    o.userData.owner = e;
    const attr = o.geometry.attributes.position;
    attr.array.set(P.pos);
    attr.needsUpdate = true;
  }
  o.position.copy(a.group.position);
  o.rotation.set(0, e.h3, 0);
  o.scale.setScalar(a.group.scale.x);
  const U = o.material.uniforms;
  const fin = e.fin ? 1 : 0;
  U.uHead.value = head;
  // Schweif: anfangs der ganze Weg seit dem Ausholen, dann zieht er sich zur Klinge zusammen
  U.uTrail.value = Math.max(0.05, (head + 0.02) * (1 - Math.pow(Math.max(0, q), 1.25)));
  U.uAlpha.value = q < 0.55 ? 1 : 1 - (q - 0.55) / 0.45;
  // nachts leuchtet es etwas weniger (wie alle addierten Effekte, fx3NightDim)
  U.uGlow.value = (1 - 0.3 * (V3.nightK || 0)) * (e.fin ? 1.15 : 1);
  U.uScroll.value = vis * 2.4;
  U.uFin.value = fin;
  if (U.uMain.value.__k !== e.pal.key) {
    U.uDeep.value.set(e.pal.deep);
    U.uMain.value.set(e.pal.main);
    U.uEdge.value.set(e.pal.edge);
    U.uHot.value.set(e.pal.hot);
    U.uMain.value.__k = e.pal.key;
  }
  // Lichtblitz an der Spitze und wenige Funken (gebündelte Leuchtflecken, kein eigener Zeichenaufruf)
  if (vis > 0.16) return;
  const crowd = typeof LOAD !== 'undefined' && game.effects.length >= LOAD.fx;
  const N = KB.N;
  const j = Math.max(1, Math.min(N, Math.round(head * N)));
  kb3World(_kb3c, P, j, 1, e, a);
  const fl = Math.max(0, 1 - vis / 0.1);
  if (fl > 0) {
    const sz = (e.fin ? 1.25 : 0.95) * (0.6 + 0.4 * fl);
    const s1 = fx3Take(h, 'sprite');
    fx3Map(s1, 'spark');
    s1.position.copy(_kb3c);
    s1.scale.set(sz, sz, 1);
    s1.material.rotation = e.sw0 * 9;
    fx3Color(s1, e.pal.hot, fl);
    const s2 = fx3Take(h, 'sprite');
    fx3Map(s2, 'disc');
    s2.position.copy(_kb3c);
    s2.scale.set(sz * 0.9, sz * 0.9, 1);
    fx3Color(s2, e.pal.edge, 0.55 * fl);
  }
  if (crowd || (typeof n3low === 'function' && n3low())) return;
  // Funken fliegen in Schlagrichtung von der Spitze weg
  kb3World(_kb3d, P, j - 1, 1, e, a);
  _kb3d.subVectors(_kb3c, _kb3d);
  const dl = _kb3d.length() || 1;
  _kb3d.divideScalar(dl);
  const n = e.fin ? 7 : 4;
  const seed = fx3Seed(h, n, () => [Math.random() - 0.5, Math.random() * 0.8 + 0.2, Math.random() - 0.5, 0.7 + Math.random() * 0.6]);
  const k = vis / 0.16;
  for (let i = 0; i < n; i++) {
    const r = seed[i];
    const sp = (2.2 + 2.6 * r[3]) * vis;
    const s = fx3Take(h, 'sprite');
    fx3Map(s, 'disc');
    s.position.set(_kb3c.x + (_kb3d.x + r[0] * 0.9) * sp, _kb3c.y + (_kb3d.y + r[1] * 0.7) * sp - 3 * vis * vis, _kb3c.z + (_kb3d.z + r[2] * 0.9) * sp);
    const ss = 0.09 * (1 - k * 0.6);
    s.scale.set(ss, ss, 1);
    fx3Color(s, e.pal.spark[i % e.pal.spark.length], 1 - k);
  }
};

// --- 2D: Sichel aus vorgerechneten Bildern ------------------------------------------------------------------
// Je Farbe sechs Bilder mit verschiedener Länge (Bogenmaß), Kopf bei Winkel 0, Schweif zu negativen Winkeln.
// Gebacken wird ein Bild erst, wenn es gebraucht wird (einmal je Farbe und Länge), höchstens acht Farben im Speicher.
const KB2 = { R: 64, spans: [3.3, 2.7, 2.15, 1.65, 1.15, 0.7], cache: new Map() };

function kb2Frame(pal, i) {
  let fr = KB2.cache.get(pal.key);
  if (!fr) {
    if (KB2.cache.size >= 8) KB2.cache.delete(KB2.cache.keys().next().value);
    fr = [];
    KB2.cache.set(pal.key, fr);
  }
  return fr[i] || (fr[i] = kb2Bake(pal, KB2.spans[i], i));
}

function kb2Rgba(hex, a) {
  return `rgba(${hexRgb(hex)},${a.toFixed(3)})`;
}

function kb2Bake(pal, span, fi) {
  const R = KB2.R;
  const S = R * 2 + 16;
  const c = newCanvas(S, S);
  const g = c.getContext('2d');
  g.translate(S / 2, S / 2);
  // deckend gemischt (sichtbar auch auf hellem Sand und Schnee): Tiefblau innen, Schlierenfarbe außen, helle Kante
  const rIn = R * 0.4;
  // Fläche: Verlauf von innen (durchsichtig) nach außen, zur Klinge hin deckender und breiter
  const gr = g.createRadialGradient(0, 0, rIn, 0, 0, R);
  gr.addColorStop(0, kb2Rgba(pal.deep, 0));
  gr.addColorStop(0.4, kb2Rgba(pal.deep, 0.4));
  gr.addColorStop(0.78, kb2Rgba(pal.main, 0.72));
  gr.addColorStop(0.93, kb2Rgba(pal.edge, 0.95));
  gr.addColorStop(1, kb2Rgba(pal.edge, 0));
  g.fillStyle = gr;
  const n = Math.max(8, Math.ceil(span / 0.035));
  for (let s = 0; s < n; s++) {
    const t1 = (s + 1) / n;
    const a0 = -span + (span * s) / n;
    const a1 = -span + span * t1 + 0.006;
    const ri = R - (R - rIn) * (0.55 + 0.45 * t1);
    g.globalAlpha = Math.pow(t1, 1.8);
    g.beginPath();
    g.arc(0, 0, R, a0, a1);
    g.arc(0, 0, ri, a1, a0, true);
    g.closePath();
    g.fill();
  }
  // Schlieren: Bogenstücke, zur Klinge hin heller
  let seed = 4711 + fi * 97;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  g.lineCap = 'round';
  for (let s = 0; s < 30; s++) {
    const r = rIn + (R - rIn) * (0.2 + 0.8 * Math.sqrt(rnd()));
    const end = -span * Math.pow(rnd(), 1.6) * 0.75;
    const len = span * (0.12 + 0.45 * rnd());
    const w = 0.7 + 2.2 * rnd();
    const al = 0.2 + 0.55 * rnd();
    const col = s % 3 === 0 ? pal.hot : pal.edge;
    for (let k = 0; k < 4; k++) {
      const b0 = Math.max(-span, end - len + (len * k) / 4);
      const b1 = Math.max(-span, end - len + (len * (k + 1)) / 4);
      if (b1 <= b0) continue;
      const pos = 1 + (b1 / span);
      g.globalAlpha = al * ((k + 1) / 4) * Math.pow(Math.max(0, pos), 1.2);
      g.strokeStyle = col;
      g.lineWidth = w;
      g.beginPath();
      g.arc(0, 0, r, b0, b1);
      g.stroke();
    }
  }
  // helle Außenkante
  g.strokeStyle = pal.hot;
  g.lineWidth = 2.2;
  for (let s = 0; s < n; s++) {
    const t1 = (s + 1) / n;
    g.globalAlpha = 0.8 * Math.pow(t1, 2.2);
    g.beginPath();
    g.arc(0, 0, R - 3, -span + (span * s) / n, -span + span * t1 + 0.006);
    g.stroke();
  }
  // Vorderkante an der Klinge: weißer Keil, nach hinten weich
  g.fillStyle = pal.hot;
  for (let s = 0; s < 6; s++) {
    const w = 0.03 + s * 0.035;
    g.globalAlpha = 0.34 - s * 0.05;
    g.beginPath();
    g.arc(0, 0, R, -w, 0.01);
    g.arc(0, 0, R * 0.55, 0.01, -w, true);
    g.closePath();
    g.fill();
  }
  // Lichtblitz an der Spitze (nur in den ersten, langen Bildern)
  if (fi <= 1) {
    g.globalCompositeOperation = 'lighter';
    const fx = R - 4;
    const rg = g.createRadialGradient(fx, 0, 0, fx, 0, 14);
    rg.addColorStop(0, kb2Rgba(pal.hot, 0.95));
    rg.addColorStop(0.35, kb2Rgba(pal.edge, 0.45));
    rg.addColorStop(1, kb2Rgba(pal.edge, 0));
    g.globalAlpha = fi === 0 ? 1 : 0.6;
    g.fillStyle = rg;
    g.fillRect(fx - 14, -14, 28, 28);
    g.strokeStyle = pal.hot;
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(fx - 13, 0);
    g.lineTo(fx + 13, 0);
    g.moveTo(fx, -9);
    g.lineTo(fx, 9);
    g.stroke();
  }
  return c;
}

// Reichweite der Klinge in 2D (Weltpixel ab der Hand)
function kb2Radius(e) {
  const r = { sword: 32, axe: 29, greatsword: 40, greataxe: 38 }[e.kind] || 32;
  return r * (e.fin ? 1.12 : 1);
}

// Winkel der Waffe in 2D (Figurenrichtung, nach rechts bzw. zum Betrachter; weaponAngle, zeichnen.js): kurz über den
// Anfang hinaus ausholen, sehr schnell bis 82 % des Bogens (Treffer-Bild), dann Nachschwung bis ans Ende.
// Der letzte Schlag ist ein weiter Querhieb statt des Stichs.
function kb2Arc(p, dir, fin) {
  if (!fin) return swingArc(p, dir);
  const fa = localFacingAngle(dir);
  return { a0: fa - 2.0, a1: fa + 1.6 };
}
function kb2Angle(p, dir, t, fin) {
  const { a0, a1 } = kb2Arc(p, dir, fin);
  const sg = a1 >= a0 ? 1 : -1;
  const back = 0.38 * sg;
  const kind = weaponKindOf(p);
  const ti = typeof BASIC_TIMING !== 'undefined' && BASIC_TIMING[kind] ? BASIC_TIMING[kind][1] : 0.45;
  const t1 = Math.max(0.05, ti - 0.1);
  const hit = a0 + (a1 - a0) * 0.82;
  if (t <= t1) return a0 - back * easeOut(t / t1);
  if (t <= ti) {
    const u = (t - t1) / (ti - t1);
    return a0 - back + (hit - (a0 - back)) * u * u;
  }
  return hit + (a1 - hit) * easeOut(Math.min(1, ((t - ti) / (1 - ti)) * 1.8));
}
// für weaponAngle: Winkel im Grundangriff des Kriegers mit Klingenbogen, sonst null
function kbAngle2d(p, dir, t) {
  if (p.swingKind !== 'combo' || !kbActive(p)) return null;
  return kb2Angle(p, dir, t, (p.combo || 0) % 3 === 2);
}

EXTRA_EFFECTS.kbogen = (ctx, e, k, x, y) => {
  const p = e.follow;
  if (!p || !e.kind) return;
  const age = game.time - e.start;
  const lag = e.hit ? kbLag(age, e.hold) : 0;
  const vis = age - lag;
  const q = vis / KB.life;
  if (q >= 1) return;
  const flip = e.flip2;
  const world = (a) => (flip ? Math.PI - a : a);
  // Kopf folgt der Waffe (gleicher Ablauf wie weaponAngle, ohne das Ausholen am Anfang – der Hieb ist schon da)
  const sv = Math.min(1, kbSwVis(e, age));
  const headL = kb2Angle(p, e.dir2, sv, e.fin);
  const { a0, a1 } = kb2Arc(p, e.dir2, e.fin);
  const startL = a0 - 0.38 * (a1 >= a0 ? 1 : -1);
  const head = world(headL);
  // Schweif liegt bei kleineren Winkeln, wenn der Schwung auf dem Bildschirm im Uhrzeigersinn läuft, sonst gespiegelt
  const cw = world(a1) >= world(a0);
  // Schweif: anfangs der ganze Weg seit dem Ausholen, dann zieht er sich zur Klinge zusammen
  const want = Math.abs(headL - startL) * (1 - Math.pow(Math.max(0, q), 1.25));
  let fi = KB2.spans.length - 1;
  for (let i = 0; i < KB2.spans.length; i++) {
    if (KB2.spans[i] <= want + 0.2) {
      fi = i;
      break;
    }
  }
  const img = kb2Frame(e.pal, fi);
  const sc = kb2Radius(e) / KB2.R;
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = (q < 0.55 ? 1 : 1 - (q - 0.55) / 0.45) * (e.fin ? 1 : 0.92);
  ctx.translate(x, y);
  ctx.rotate(head);
  if (!cw) ctx.scale(1, -1);
  ctx.scale(sc, sc);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
};

// --- Klang (klang-welt.js: snd.swing und snd.impact) -----------------------------------------------------------
// Datei je Waffenart (tools/klang-synth/hiebe.py) und Höhe; Rollen: hit (Hieb mit Treffer), fin (letzter Kombo-Schlag
// und kritische Treffer), swing (nur Zischen). Fehlt die Datei noch (lädt im Hintergrund), klingt der alte Hieb.
const KB_SND = { sword: ['klingenhieb_schwert', 1], axe: ['klingenhieb_axt', 1], greatsword: ['klingenhieb_wucht', 1.05], greataxe: ['klingenhieb_wucht', 0.93] };

function kbSndFile(kind) {
  const F = KB_SND[kind];
  if (!F || typeof sfxFiles === 'undefined' || !sfxFiles.has(F[0])) return null;
  if (!sfxFiles.ready(F[0])) {
    sfxFiles.load(F[0]);
    return null;
  }
  return F;
}

// Schwung: true = erledigt (ohne Treffer gezischt; mit Treffer übernimmt kbImpactSnd)
function kbSwingSnd(p, hit) {
  if (!kbActive(p)) return false;
  const F = kbSndFile(weaponKindOf(p));
  if (!F) return false;
  if (hit) return true;
  const fin = (p.combo || 0) % 3 === 2;
  const mine = p === game.player;
  sfxFiles.play(F[0], { role: 'swing', x: p.x, y: p.y, vol: (mine ? 0.42 : 0.26) * (fin ? 1.15 : 1), rate: F[1] * (fin ? 0.92 : 1), vary: 0.06, grp: 'swing' });
  return true;
}

// Treffer des eigenen Grundangriffs am Monster m (kind: Waffenart beim Treffer)
function kbImpactSnd(m, kind, crit, pos) {
  const p = game.player;
  if (!kbActive(p) || weaponKindOf(p) !== kind) return false;
  const F = kbSndFile(kind);
  if (!F) return false;
  const fin = !!crit || (p.swingKind === 'combo' && (p.combo || 0) % 3 === 2);
  sfxFiles.play(F[0], { role: fin ? 'fin' : 'hit', ...pos, vol: fin ? 0.85 : 0.72, rate: F[1], vary: 0.07, fromPeak: 0.05, grp: 'hit' });
  if (crit) sfxFiles.play('krit', { ...pos, vol: 0.28, fromPeak: 0.04, grp: 'hit2' });
  return true;
}

// Hiebe des Aderlass (adlSnd, aderlass.js): dasselbe Zischen und Klingen, der letzte Hieb tiefer und lauter
function kbSkillSnd(p, fin) {
  if (!kbActive(p)) return false;
  const F = kbSndFile(weaponKindOf(p));
  if (!F) return false;
  const v = p === game.player ? 1 : 0.6;
  sfxFiles.play(F[0], { role: 'swing', x: p.x, y: p.y, vol: (fin ? 0.55 : 0.42) * v, rate: F[1] * (fin ? 0.9 : 1.08), vary: 0.07, grp: 'swing' });
  return true;
}
