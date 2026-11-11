// Ninja-Attacken in 3D (seit 13.2): Jede Fertigkeit bekommt einen räumlichen Auftritt zusätzlich zu den
// bisherigen Schnitten und Funken. Der Dolch in der Hand blitzt beim Zustechen grell auf (Waffenleuchten plus
// Glanzstern an der Hand), dazu je Fertigkeit:
//  Hinterhalt       – Phantomdolch sticht von hinten oben ins Ziel, Lichtstrahlen und Schattensplitter
//  Lähmende Klinge  – grüne Giftklinge, Gifttropfen und grüner Dunst
//  Blitzangriff     – zuckender Blitz vom alten zum neuen Platz, leuchtende Nachbilder auf der Strecke
//  Wirbelklinge     – zwei kreisende Klingen mit Leuchtschweif in zwei Höhen, Staubring
//  Schattensprung   – Schattenbilder und Rauch entlang der Sprungbahn
//  Tarnung          – Rauchbombe: Lichtblitz, Rauchring, aufsteigende Funken
//  Schattenmantel   – Schattenranken winden sich an der Figur hinauf
//  Schattenkette    – (seit 13.85 statt Leichtfüßigkeit) Sprünge von Gegner zu Gegner: Rauch, Schattenlinie, Nachbild, Schnitt
// Nur Optik; 2D zeigt weiter die alten Effekte. Mitspieler sehen dasselbe über remoteSkillFx.
// Am Ende: Aura des Schwertes (Krieger) als helle Lichtklinge.

const NFX3_TYPES = ['nstab3', 'nblink3', 'nwhirl3', 'ndash3', 'nvanish3', 'nshroud3', 'nchain3'];
for (const t of NFX3_TYPES) FX3_TYPES.add(t);

const _nf3a = new THREE.Vector3();
const _nf3b = new THREE.Vector3();
const _nf3c = new THREE.Vector3();
const _nf3d = new THREE.Vector3();
const _nf3u = new THREE.Vector3(1, 0, 0);
const _nf3v = new THREE.Vector3(0, 0, 1);

// Dolch in der Hand leuchtet auf (syncPlayer3 liest bladeFlash) und an der Hand blitzt ein Glanzstern
function ninjaBladeFlash(p, color, dur = 0.45) {
  p.bladeFlash = game.time + dur;
  p.bladeFlashDur = dur;
  p.bladeFlashCol = color;
}

// Weltlage der rechten Hand (Einheiten); ohne 3D-Figur ein Punkt vor der Brust
function ninjaHand3(p, out) {
  const a = typeof actors3 !== 'undefined' ? actors3.get(entityKey(p)) : null;
  if (a && a.bones && a.group.visible && a.group.parent) {
    a.bones[BH.handR].getWorldPosition(out);
    return out;
  }
  const f = p.facing || { x: 0, y: 1 };
  return out.set((p.x + f.x * 14) * U3, 0.8, (feetY(p) + f.y * 14) * U3);
}

// vierstrahliger Glanzstern (zwei gekreuzte Lichtstreifen und ein Kern)
function nfxStar(h, x, y, z, s, color, op) {
  fx3MageSprite(h, 'sprite', 'disc', x, y, z, s * 1.6, s * 0.12, '#ffffff', op);
  fx3MageSprite(h, 'sprite', 'disc', x, y, z, s * 0.12, s * 1.6, '#ffffff', op);
  n3Glow(h, x, y, z, s * 0.7, color, op * 0.9);
  n3Glow(h, x, y, z, s * 0.25, '#ffffff', op);
}

// flache Klinge von b in Richtung d (normiert): Klinge als flacher Kegel, Parierstange, Griff
function nfxBlade(h, b, d, len, w, color, op, glow = true) {
  // fester, beleuchteter Körper (bleibt auch auf hellem Gras sichtbar), darüber eine leuchtende Schneide
  const o = fx3Take(h, 'cone');
  fx3Cone(o, b, d, len, w);
  o.scale.z = w * 0.3;
  fx3Color(o, lighter(color, 0.45), op);
  const edge = fx3Take(h, 'coneG');
  fx3Cone(edge, b, d, len * 1.04, w * 1.25);
  edge.scale.z = w * 0.4;
  fx3Color(edge, color, op * 0.9);
  const core = fx3Take(h, 'coneG');
  fx3Cone(core, b, d, len * 0.92, w * 0.45);
  core.scale.z = w * 0.14;
  fx3Color(core, '#ffffff', op);
  if (glow) n3Glow(h, b.x + d.x * len * 0.5, b.y + d.y * len * 0.5, b.z + d.z * len * 0.5, len * 1.1, color, op * 0.35);
  // Parierstange quer, Griff nach hinten
  _nf3c.set(-d.z, 0, d.x);
  if (_nf3c.lengthSq() < 1e-4) _nf3c.set(1, 0, 0);
  _nf3c.normalize();
  _nf3a.copy(b).addScaledVector(_nf3c, w * 1.3);
  _nf3b.copy(b).addScaledVector(_nf3c, -w * 1.3);
  const g = fx3Take(h, 'seg');
  fx3Segment(g, _nf3a, _nf3b, w * 0.18);
  fx3Color(g, color, op * 0.9);
  _nf3a.copy(b).addScaledVector(d, -len * 0.32);
  const hd = fx3Take(h, 'seg');
  fx3Segment(hd, _nf3a, b, w * 0.16);
  fx3Color(hd, color, op * 0.6);
}

// leuchtendes Nachbild einer Figur (Körper, Kopf, Schein)
function nfxGhost(h, x, z, color, op, normal = false) {
  _nf3a.set(x, 0.25, z);
  _nf3b.set(x, 1.05, z);
  const body = fx3Take(h, normal ? 'segN' : 'seg');
  fx3Segment(body, _nf3a, _nf3b, 0.2);
  fx3Color(body, color, op);
  const head = fx3Take(h, 'ball');
  head.position.set(x, 1.32, z);
  head.scale.setScalar(0.17);
  fx3Color(head, color, op);
  if (!normal) n3Glow(h, x, 0.75, z, 1.2, color, op * 0.4);
}

// --- Hinterhalt / Lähmende Klinge ---------------------------------------------------------------------------
FX3_DRAW.nstab3 = function (h, e) {
  const t = game.time - e.start;
  const k = t / e.dur;
  if (k >= 1) return;
  const low = n3low();
  const col = e.color;
  const big = e.ambush ? 1.35 : 1;
  // Ziel (Brust) und Richtung vom Ninja zum Ziel
  const tx = e.tx * U3;
  const tz = e.ty * U3;
  const ty = 0.85;
  const o = e.follow;
  let dx = tx - (o ? o.x * U3 : tx - 1);
  let dz = tz - (o ? feetY(o) * U3 : tz);
  const dl = Math.hypot(dx, dz) || 1;
  dx /= dl;
  dz /= dl;
  // 1) Glanzstern am Dolch in der Hand
  if (o && t < 0.32) {
    ninjaHand3(o, _nf3d);
    const q = t / 0.32;
    const s = (q < 0.3 ? q / 0.3 : 1 - (q - 0.3) / 0.7) * 1.4 * big;
    nfxStar(h, _nf3d.x, _nf3d.y + 0.05, _nf3d.z, s, col, 1);
  }
  // 2) Phantomdolch(e): von hinten oben ins Ziel, kurzes Nachfedern, dann verblassen
  const stabT = 0.09;
  const reach = t < stabT ? t / stabT : 1;
  const fade = t < 0.25 ? 1 : Math.max(0, 1 - (t - 0.25) / (e.dur - 0.25));
  const blades = e.ambush ? [-1, 1] : [0];
  for (const side of blades) {
    // Stichrichtung: von oben schräg in Blickrichtung, bei zwei Klingen gekreuzt von links und rechts
    _nf3d.set(dx + side * dz * 0.9, -0.75, dz - side * dx * 0.9).normalize();
    const len = 1.5 * big;
    const back = (1 - easeOut(reach)) * 1.4 + 0.12;
    _nf3a.set(tx, ty, tz).addScaledVector(_nf3d, -len - back);
    nfxBlade(h, _nf3a.clone(), _nf3d.clone(), len, 0.3 * big, col, fade);
  }
  // 3) Einschlag: Lichtstrahlen, Kern, Bodenring
  if (t >= stabT) {
    const q = Math.min(1, (t - stabT) / 0.4);
    n3Glow(h, tx, ty, tz, (0.8 + q * 1.6) * big, col, (1 - q) * 0.9);
    n3Glow(h, tx, ty, tz, (0.4 + q * 0.6) * big, '#ffffff', 1 - q);
    const rays = low ? 5 : 9;
    for (let j = 0; j < rays; j++) {
      const a = j * (Math.PI * 2 / rays) + e.seed;
      const el = Math.sin(j * 1.7 + e.seed) * 0.7;
      _nf3c.set(Math.cos(a), el, Math.sin(a)).normalize();
      _nf3a.set(tx, ty, tz).addScaledVector(_nf3c, 0.15 + q * 0.5 * big);
      _nf3b.set(tx, ty, tz).addScaledVector(_nf3c, 0.3 + q * 1.5 * big);
      const r = fx3Take(h, 'seg');
      fx3Segment(r, _nf3a, _nf3b, 0.03 * (1 - q) + 0.005);
      fx3Color(r, j % 2 ? '#ffffff' : col, 1 - q);
    }
    if (q < 1) {
      const ring = fx3Take(h, 'plane');
      fx3Ground(ring, e.tx, e.ty, (0.5 + q * 1.8) * big, 0.05, 'ring');
      fx3Color(ring, col, 0.8 * (1 - q));
    }
  }
  // 4) Hinterhalt: Schattensplitter und Rauch; Lähmende Klinge: Gifttropfen und Dunst
  if (e.ambush && t >= stabT) {
    const q = Math.min(1, (t - stabT) / 0.5);
    for (let j = 0; j < (low ? 4 : 8); j++) {
      const a = j * 0.785 + e.seed * 2;
      _nf3c.set(Math.cos(a), 0.4 + 0.3 * Math.sin(j), Math.sin(a)).normalize();
      _nf3a.set(tx, ty, tz).addScaledVector(_nf3c, 0.3 + q * 1.6);
      _nf3a.y -= q * q * 0.6;
      const s = fx3Take(h, 'coneG');
      fx3Cone(s, _nf3a, _nf3c, 0.32, 0.07);
      fx3Color(s, '#6a4aa8', 1 - q);
    }
    for (let j = 0; j < (low ? 4 : 9); j++) {
      const a = j * 0.7 + e.seed;
      n3Smoke(h, tx + Math.cos(a) * q * 1.3, 0.3 + q * 0.6, tz + Math.sin(a) * q * 1.0, 0.7 + q, '#1a1026', 0.6 * (1 - q));
    }
  }
  if (e.venom && t >= stabT) {
    for (let j = 0; j < (low ? 4 : 9); j++) {
      const ph = ((t - stabT) * 1.3 + j / 9) % 1;
      const a = j * 2.399 + e.seed;
      const b = fx3Take(h, 'ball');
      b.position.set(tx + Math.cos(a) * 0.25, ty - ph * 0.85, tz + Math.sin(a) * 0.2);
      b.scale.set(0.045, 0.08, 0.045);
      fx3Color(b, j % 3 ? '#8fd16a' : '#d4ff8a', fade * (1 - ph * 0.6));
    }
    for (let j = 0; j < (low ? 2 : 5); j++) {
      const a = j * 1.3 + e.seed;
      n3Smoke(h, tx + Math.cos(a) * 0.5, 0.4 + k * 0.6, tz + Math.sin(a) * 0.4, 0.8 + k * 0.6, '#4a8a2a', 0.45 * fade);
    }
  }
};

// --- Blitzangriff ------------------------------------------------------------------------------------------
FX3_DRAW.nblink3 = function (h, e) {
  const t = game.time - e.start;
  const k = t / e.dur;
  if (k >= 1) return;
  const low = n3low();
  const x0 = e.x0 * U3;
  const z0 = e.y0 * U3;
  const x1 = e.tx * U3;
  const z1 = e.ty * U3;
  // zuckender Blitz auf Brusthöhe, in jedem Bild neu verzweigt
  if (t < 0.35) {
    const op = 1 - t / 0.35;
    _nf3a.set(x0, 0.85, z0);
    _nf3b.set(x1, 0.85, z1);
    n3Bolt(h, _nf3a, _nf3b, 0.07, e.color, op, low ? 6 : 10, 0.45);
    if (!low) n3Bolt(h, _nf3a, _nf3b, 0.035, '#c9b8ff', op * 0.7, 8, 0.7);
  }
  // Nachbilder auf der Strecke, das erste hält am längsten
  for (let j = 0; j < 3; j++) {
    const f = (j + 1) / 4;
    const op = Math.max(0, 0.7 - j * 0.15 - k * 1.1);
    if (op <= 0) continue;
    nfxGhost(h, x0 + (x1 - x0) * f, z0 + (z1 - z0) * f, j % 2 ? '#9fd0ff' : '#b48cff', op);
  }
  // Brandring am alten Platz, Funkenbögen am Ziel
  if (t < 0.5) {
    const w = fx3Take(h, 'plane');
    fx3Ground(w, e.x0, e.y0, 0.6 + t * 2.4, 0.04, 'ring');
    fx3Color(w, e.color, 0.9 * (1 - t / 0.5));
  }
  if (t < 0.4) {
    for (let j = 0; j < (low ? 2 : 5); j++) {
      const a = Math.random() * Math.PI * 2;
      _nf3a.set(x1 + Math.cos(a) * 0.2, 0.5 + Math.random() * 0.8, z1 + Math.sin(a) * 0.2);
      _nf3b.set(x1 + Math.cos(a) * 0.8, 0.3 + Math.random() * 1.2, z1 + Math.sin(a) * 0.8);
      n3Bolt(h, _nf3a, _nf3b, 0.03, e.color, 1 - t / 0.4, 4, 0.2);
    }
  }
};

// --- Wirbelklinge ------------------------------------------------------------------------------------------
FX3_DRAW.nwhirl3 = function (h, e) {
  const t = game.time - e.start;
  const k = t / e.dur;
  if (k >= 1) return;
  const o = e.follow;
  if (!o) return;
  const low = n3low();
  const x = o.x * U3;
  const z = feetY(o) * U3;
  const r = Math.min(1.6, e.r * U3 * 0.9);
  const fade = k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25;
  const spin = e.a0 + easeOut(Math.min(1, k * 1.15)) * Math.PI * 2 * 2.5;
  for (let j = 0; j < 2; j++) {
    const a = spin + j * Math.PI;
    const y = j ? 0.7 : 1.05;
    _nf3c.set(x, y, z);
    // Leuchtschweif hinter der Klinge
    const tail = fx3Take(h, 'strip');
    fx3Strip(tail, _nf3c, _nf3u, _nf3v, r, 0.32, a - 2.2, a, e.color, fade, false);
    const edge = fx3Take(h, 'strip');
    fx3Strip(edge, _nf3c, _nf3u, _nf3v, r + 0.02, 0.08, a - 1.0, a, '#ffffff', fade, false);
    // Klinge an der Spitze, zeigt in Drehrichtung
    const bx = x + Math.cos(a) * (r - 0.15);
    const bz = z + Math.sin(a) * (r - 0.15);
    _nf3d.set(-Math.sin(a), 0, Math.cos(a));
    nfxBlade(h, new THREE.Vector3(bx, y, bz), _nf3d.clone(), 0.75, 0.22, e.color, fade, false);
    if (!low) nfxStar(h, bx - Math.sin(a) * 0.5, y, bz + Math.cos(a) * 0.5, 0.35, e.color, fade * (0.6 + 0.4 * Math.sin(t * 40 + j)));
  }
  // Staubring und Wind am Boden
  const g = fx3Take(h, 'plane');
  fx3Ground(g, o.x, feetY(o), r * (0.8 + k * 0.6), 0.05, 'ring');
  fx3Color(g, '#d8c8f0', 0.6 * fade);
  if (!low) for (let j = 0; j < 6; j++) {
    const a = spin * 0.8 + j * 1.05;
    n3Smoke(h, x + Math.cos(a) * r * 1.1, 0.15, z + Math.sin(a) * r * 1.1, 0.5, '#8a7aa8', 0.35 * fade);
  }
};

// --- Schattensprung ----------------------------------------------------------------------------------------
FX3_DRAW.ndash3 = function (h, e) {
  const t = game.time - e.start;
  const k = t / e.dur;
  if (k >= 1) return;
  const o = e.follow;
  const low = n3low();
  // Ende der Bahn: wo die Figur gerade ist, solange sie springt, danach fest
  if (o && (!e.done || !e.x1)) {
    e.x1 = o.x;
    e.y1 = feetY(o);
    if (!o.dash) e.done = true;
  }
  const x0 = e.x0 * U3;
  const z0 = e.y0 * U3;
  const x1 = (e.x1 ?? e.x0) * U3;
  const z1 = (e.y1 ?? e.y0) * U3;
  const len = Math.hypot(x1 - x0, z1 - z0);
  const fade = 1 - k;
  // Schattenbilder alle 0,6 Einheiten, dunkel und deckend mit violettem Schein
  const n = Math.min(low ? 3 : 6, Math.floor(len / 0.6));
  for (let j = 0; j < n; j++) {
    const f = (j + 0.5) / Math.max(1, n);
    const gx = x0 + (x1 - x0) * f;
    const gz = z0 + (z1 - z0) * f;
    nfxGhost(h, gx, gz, '#2a1a40', 0.55 * fade * (0.5 + f * 0.5), true);
    n3Glow(h, gx, 0.75, gz, 1.0, '#8a6ad8', 0.35 * fade);
  }
  // violette Spur auf Brusthöhe und Rauch am Boden
  if (len > 0.2) {
    _nf3a.set(x0, 0.85, z0);
    _nf3b.set(x1, 0.85, z1);
    const s = fx3Take(h, 'seg');
    fx3Segment(s, _nf3a, _nf3b, 0.06 * fade + 0.01);
    fx3Color(s, '#c9b8ff', fade);
    const g = fx3Take(h, 'seg');
    fx3Segment(g, _nf3a, _nf3b, 0.18 * fade + 0.02);
    fx3Color(g, '#6a4aa8', 0.5 * fade);
  }
  for (let j = 0; j < (low ? 3 : 7); j++) {
    const f = j / 6;
    n3Smoke(h, x0 + (x1 - x0) * f, 0.2 + k * 0.4, z0 + (z1 - z0) * f, 0.7 + k * 0.8, '#1a1026', 0.55 * fade);
  }
};

// --- Tarnung: Rauchbombe -----------------------------------------------------------------------------------
FX3_DRAW.nvanish3 = function (h, e) {
  const t = game.time - e.start;
  const k = t / e.dur;
  if (k >= 1) return;
  const low = n3low();
  const x = e.x * U3;
  const z = e.y * U3;
  if (t < 0.15) n3Glow(h, x, 0.8, z, 1.5 + t * 8, '#e8dcff', 1 - t / 0.15);
  const q = easeOut(Math.min(1, t / 0.6));
  const fade = 1 - k;
  for (let j = 0; j < (low ? 6 : 12); j++) {
    const a = j * (Math.PI * 2 / 12) + e.seed;
    const rr = 0.2 + q * 1.5;
    n3Smoke(h, x + Math.cos(a) * rr, 0.25 + q * 0.4 + (j % 3) * 0.15, z + Math.sin(a) * rr * 0.85, 0.8 + q * 0.9, j % 2 ? '#2a2236' : '#3d3848', 0.75 * fade);
  }
  for (let j = 0; j < (low ? 2 : 5); j++) n3Smoke(h, x, 0.4 + j * 0.35 + q * 0.5, z, 1.1 - j * 0.12, '#1a1424', 0.7 * fade);
  for (let j = 0; j < (low ? 4 : 10); j++) {
    const ph = (t * 1.1 + j / 10) % 1;
    const a = j * 2.399 + e.seed;
    n3Glow(h, x + Math.cos(a) * 0.6, 0.2 + ph * 2.0, z + Math.sin(a) * 0.6, 0.12, j % 2 ? '#b48cff' : '#ffffff', fade * (1 - ph));
  }
  if (t < 0.6) {
    const w = fx3Take(h, 'plane');
    fx3Ground(w, e.x, e.y, 0.4 + q * 1.8, 0.04, 'ring');
    fx3Color(w, '#8a7aa8', 0.8 * (1 - t / 0.6));
  }
};

// --- Schattenmantel: Ranken winden sich an der Figur hinauf ---------------------------------------------------
FX3_DRAW.nshroud3 = function (h, e) {
  const t = game.time - e.start;
  const k = t / e.dur;
  if (k >= 1) return;
  const o = e.follow;
  if (!o) return;
  const low = n3low();
  const x = o.x * U3;
  const z = feetY(o) * U3;
  const fade = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
  const grow = Math.min(1, k * 1.6);
  const tend = low ? 3 : 5;
  const nodes = low ? 5 : 9;
  for (let s = 0; s < tend; s++) {
    let px = 0;
    let py = 0;
    let pz = 0;
    for (let j = 0; j <= nodes; j++) {
      const q = j / nodes;
      if (q > grow) break;
      const a = s * (Math.PI * 2 / tend) + q * 3.4 + t * 2.5;
      const rr = 1.2 - q * 0.75;
      const nx = x + Math.cos(a) * rr;
      const ny = 0.05 + q * 1.7;
      const nz = z + Math.sin(a) * rr;
      if (j) {
        _nf3a.set(px, py, pz);
        _nf3b.set(nx, ny, nz);
        const sg = fx3Take(h, 'segN');
        fx3Segment(sg, _nf3a, _nf3b, 0.07 * (1 - q * 0.6));
        fx3Color(sg, '#1e1430', 0.85 * fade);
        const gl = fx3Take(h, 'seg');
        fx3Segment(gl, _nf3a, _nf3b, 0.02);
        fx3Color(gl, '#b48cff', fade);
      }
      if (!low && j % 3 === 0) n3Smoke(h, nx, ny, nz, 0.45, '#2a1a40', 0.5 * fade);
      px = nx;
      py = ny;
      pz = nz;
    }
    // Spitze der Ranke glimmt
    n3Glow(h, px, py, pz, 0.3, '#c9b8ff', fade);
  }
  const g = fx3Take(h, 'plane');
  fx3Ground(g, o.x, feetY(o), 1.3 - grow * 0.4, 0.05, 'ring');
  fx3Color(g, '#6a4aa8', 0.7 * fade);
};

// --- Auslösen (eigener Ninja und Mitspieler) ----------------------------------------------------------------
// p: Wirker, t: Ziel (Monster oder Punkt mit x/y), remote: Mitspieler (Ziel nur als Punkt bekannt)
function nfxTargetPoint(p, t) {
  if (t && isFinite(t.x) && isFinite(t.y)) return { x: t.x, y: t.r != null ? feetY(t) : t.y };
  const f = p.facing || { x: 0, y: 1 };
  return { x: p.x + f.x * 40, y: feetY(p) + f.y * 40 };
}
const NINJA_FX3 = {
  hinterhalt(p, t) {
    const tp = nfxTargetPoint(p, t);
    const ambush = p._blinkAt != null && game.time - p._blinkAt < 0.05;
    ninjaBladeFlash(p, '#f2e8ff', ambush ? 0.6 : 0.45);
    addEffect({ type: 'nstab3', follow: p, tx: tp.x, ty: tp.y, color: '#b48cff', ambush, dur: ambush ? 0.9 : 0.7, seed: Math.random() * 6 });
  },
  laehmklinge(p, t) {
    const tp = nfxTargetPoint(p, t);
    ninjaBladeFlash(p, '#c6f08a', 0.45);
    addEffect({ type: 'nstab3', follow: p, tx: tp.x, ty: tp.y, color: '#8fd16a', venom: true, dur: 1.1, seed: Math.random() * 6 });
  },
  blitzangriff(p, t, remote) {
    const from = remote ? { x: p.x, y: feetY(p) } : p._blinkFrom || { x: p.x, y: feetY(p) };
    const tp = remote ? nfxTargetPoint(p, t) : { x: p.x, y: feetY(p) };
    ninjaBladeFlash(p, '#cfe8ff', 0.5);
    addEffect({ type: 'nblink3', x: (from.x + tp.x) / 2, y: (from.y + tp.y) / 2, x0: from.x, y0: from.y, tx: tp.x, ty: tp.y, color: '#9fd0ff', dur: 0.6 });
  },
  wirbelklinge(p, t, remote, sk) {
    ninjaBladeFlash(p, '#e8dcff', 0.6);
    addEffect({ type: 'nwhirl3', follow: p, r: (sk && sk.radius) || 95, a0: Math.random() * 6, color: '#c9b8ff', dur: 0.6 });
  },
  schattensprung(p) {
    ninjaBladeFlash(p, '#c9b8ff', 0.5);
    addEffect({ type: 'ndash3', follow: p, x0: p.x, y0: feetY(p), dur: 0.85 });
  },
  tarnung(p) {
    addEffect({ type: 'nvanish3', x: p.x, y: feetY(p), dur: 1.1, seed: Math.random() * 6 });
  },
  schattenmantel(p) {
    addEffect({ type: 'nshroud3', follow: p, dur: 1.2 });
  }
};
// zeichnet ninja-fx.js diese Fertigkeit in 3D selbst? (dann entfällt die flache 2D-Riesenklinge)
function ninjaOwns3(id) {
  return !!NINJA_FX3[id] && typeof V3 !== 'undefined' && V3.on;
}
function ninjaFx3(p, sk, t, remote) {
  const f = NINJA_FX3[sk.id];
  if (!f || typeof V3 === 'undefined' || !V3.on) return;
  f(p, t, remote, sk);
}

// Blinken merkt sich den alten Platz (für Blitzangriff und den Hinterhalt aus der Tarnung)
if (typeof blinkBehind === 'function') {
  const blinkBehind0 = blinkBehind;
  // eslint-disable-next-line no-global-assign
  blinkBehind = function (t, color) {
    const p = game.player;
    p._blinkFrom = { x: p.x, y: feetY(p) };
    p._blinkAt = game.time;
    return blinkBehind0(t, color);
  };
}

// --- Krieger: Aura des Schwertes in 3D (seit 13.2) -----------------------------------------------------------
// Die Waffe selbst leuchtet (weaponGlow), dazu eine helle Lichtklinge entlang der echten Klingenachse, die vorn
// und hinten über das Schwert hinausragt, Funken, die von der Klinge wehen, ein Glanzstern an der Spitze und ein
// goldener Lichtkranz am Boden. Die Klingenachse legt humanoid3 beim Bau ab (model.weaponAxis), hier wird sie wie
// ein Hautpunkt an der rechten Hand mitbewegt.
const _sa3b = new THREE.Vector3();
const _sa3t = new THREE.Vector3();
const _sa3h = new THREE.Vector3();
const _sa3d = new THREE.Vector3();
const _sa3p = new THREE.Vector3();
const _sa3m = new THREE.Matrix4();
// left: die Waffe in der linken Hand (seit 13.90, zwei Schwerter oder zwei Äxte)
function weaponAxis3(p, base, tip, left = false) {
  const a = typeof actors3 !== 'undefined' ? actors3.get(entityKey(p)) : null;
  const ax = a && a.model && (left ? a.model.offhandAxis : a.model.weaponAxis);
  const mesh = a && a.meshes && (a.meshes.wglow || a.meshes.lit);
  if (!ax || !mesh || !a.group.visible || !a.group.parent || !a.skeleton) return false;
  // Haut-Formel von three.js für einen Punkt, der nur an einer Hand hängt
  const hb = left ? BH.handL : BH.handR;
  _sa3m.multiplyMatrices(a.bones[hb].matrixWorld, a.skeleton.boneInverses[hb]);
  for (const [src, out] of [[ax.base, base], [ax.tip, tip]]) {
    out.copy(src).applyMatrix4(mesh.bindMatrix).applyMatrix4(_sa3m).applyMatrix4(mesh.bindMatrixInverse).applyMatrix4(mesh.matrixWorld);
  }
  return base.distanceToSquared(tip) > 1e-4;
}

function schwertaura3(h, p, b, t) {
  const low = n3low();
  // seit 14.61 wächst die Lichtklinge mit dem Rang (ohne Rang 0,7, V 1,0 – vorher immer 1,0): die Dauer-Aura
  // überstrahlte die Figur, der Rang bleibt an Breite und Helligkeit der Klinge erkennbar
  const rk = typeof skillRank === 'function' && b.lvl ? skillRank(b.lvl) : -1;
  const pulse = (0.8 + 0.2 * Math.sin(t * 7)) * (0.7 + 0.075 * (rk + 1));
  const main = weaponAxis3(p, _sa3b, _sa3t);
  if (main) schwertBlade3(h, t, pulse, low, 0);
  // seit 13.90: zweite Waffe (Schwert oder Axt in der linken Hand) bekommt dieselbe Lichtklinge
  if (weaponAxis3(p, _sa3b, _sa3t, true)) schwertBlade3(h, t + 0.37, pulse, low, 1);
  if (!main) {
    // ohne 3D-Waffe: Licht an der Hand
    ninjaHand3(p, _sa3p);
    n3Glow(h, _sa3p.x, _sa3p.y, _sa3p.z, 1.0, '#ffd36a', 0.7 * pulse);
  }
  // seit 13.83 ohne Lichtkranz am Boden und ohne eigenen Funkenkreis: um den Körper liegt die Körperaura
  // (koerperaura.js), die Klinge bleibt das Zeichen der Schwertaura
}
// Lichtklinge entlang der Achse _sa3b → _sa3t (k: 0 rechte, 1 linke Waffe, verschiebt die Funken)
function schwertBlade3(h, t, pulse, low, k) {
  {
    _sa3d.subVectors(_sa3t, _sa3b);
    const len = _sa3d.length();
    _sa3d.divideScalar(len);
    // Lichtklinge: 30 % hinter dem Ansatz bis 55 % über die Spitze hinaus, drei Schichten.
    // Seit 14.41 schlanker und weniger weiß (vorher 0,24/0,11/0,04 mit weißem Kern voll deckend, Lichtflecken 0,8–1,15
    // groß): die Klinge schwingt beim Laufen mit dem Arm, und die großen hellen Flecken zogen weiße Fetzen über die Figur
    _nf3a.copy(_sa3b).addScaledVector(_sa3d, -len * 0.2);
    _nf3b.copy(_sa3t).addScaledVector(_sa3d, len * 0.4);
    for (const [r, col, op] of [[0.12, '#ffa830', 0.32], [0.055, '#ffd36a', 0.62], [0.022, '#fff4d0', 0.8]]) {
      const s = fx3Take(h, 'seg');
      fx3Segment(s, _nf3a, _nf3b, r * (0.9 + 0.2 * pulse));
      fx3Color(s, col, op * pulse);
    }
    // Lichtflecken entlang der Klinge und ein Glanzstern an der Spitze
    for (const f of [0, 0.35, 0.7, 1]) {
      _sa3p.copy(_sa3b).addScaledVector(_sa3d, len * f);
      n3Glow(h, _sa3p.x, _sa3p.y, _sa3p.z, 0.34 + f * 0.16, '#ffb84a', 0.38 * pulse);
    }
    // seit 13.83 kein Glanzstern mehr an der Spitze, nur ein weicher Lichtfleck, der ab und zu aufglüht
    const tw = Math.pow(Math.max(0, Math.sin(t * 3.1)), 6);
    n3Glow(h, _nf3b.x, _nf3b.y, _nf3b.z, 0.28 + tw * 0.25, '#ffe9a0', 0.4 + tw * 0.3);
    // Funken wehen von der Klinge nach oben weg
    if (!low) for (let j = 0; j < 8; j++) {
      const ph = (t * 1.6 + j / 8) % 1;
      const f = ((j * 0.618) % 1) * 1.2 - 0.1;
      _sa3p.copy(_sa3b).addScaledVector(_sa3d, len * f);
      n3Glow(h, _sa3p.x + Math.sin(j * 3 + t + k) * ph * 0.3, _sa3p.y + ph * 0.7, _sa3p.z + Math.cos(j * 2 + t + k) * ph * 0.3, 0.12, j % 3 ? '#ffe9a0' : '#ffffff', 1 - ph);
    }
  }
}
if (SKILL_FX.schwertaura) SKILL_FX.schwertaura.aura3 = schwertaura3;

// --- Aura des Schwertes: Wirk-Animation (seit 14.61) ----------------------------------------------------------
// Spielerwunsch: beim Aktivieren die Waffen hochrecken, die Klingen blitzen kurz auf, dann breitet sich am Boden ein
// leuchtender Kreis aus und eine Aura steigt nach oben. Ablauf (1,5 s, Figur bleibt steuerbar):
//   0–0,3 s   Arme hoch (Pose in drei-figuren.js, SKILL_POSE3.schwertaura: zwei Waffen als V über dem Kopf,
//             Zweihänder senkrecht mit beiden Händen, Einhand mit Schild: Schwertarm hoch, Schild vor dem Körper)
//   0,15–0,8 s Lichtblitz entlang der Klinge(n) in der Rangfarbe, heller Glanzpunkt an der Spitze
//   0,3–1,5 s Lichtteich am Boden (weiche Lichtpfütze und eine sanfte Schockwelle – keine Runen, Sterne oder Zeichen)
//   0,4–1,5 s aufsteigende Aura: weicher Lichtschleier (Zylinder mit Verlaufsbild) und flammenartige Schleier
// Ohne Rang golden; E/H/L/V färben Blitz, Schockwelle und einen Teil der Schleier in der Rangfarbe und machen die
// Aura höher und dichter. Alles aus dem gemeinsamen Vorrat (fx3Take), nach Ablauf frei; etwa 25–45 Teile je Bild.
const SA_CAST_COL = [
  { main: '#ffb84a', alt: '#ffd36a', light: '#fff0c0' }, // ohne Rang
  { main: '#ffb84a', alt: '#9fd0ff', light: '#e8f8ff' }, // Erwacht
  { main: '#ffb84a', alt: '#c58cff', light: '#f4e4ff' }, // Heroisch
  { main: '#ffc23a', alt: '#ffd34d', light: '#fff6d0' }, // Legendär
  { main: '#ff8a3a', alt: '#ff5a2a', light: '#fff0c0', acc: '#c84aff' } // Vollendet
];
function schwertauraCast(p, rk) {
  if (!p) return;
  const r = Number.isInteger(rk) && rk >= 0 && rk < SA_CAST_COL.length - 1 ? rk : -1;
  const C = SA_CAST_COL[r + 1];
  // für die Pose (Klingenleuchten in drei-figuren.js) und 2D (Tönung der Kraftpose)
  p.saCast = { at: game.time, rk: r };
  p.poseColor = C.alt;
  addEffect({ type: 'sacast3', follow: p, ox: 0, oy: 0, rk: r, dur: 1.5, color: C.main });
  // seit 14.63: auf Vollendet (V) zusätzlich Bodenbruch – blauer Energiering, Schockwelle, aufsteigende Brocken
  if (r === SA_CAST_COL.length - 2) addEffect({ type: 'sabruch3', x: p.x, y: feetY(p), own: p === game.player, dur: SA_BRUCH.dur, rot: Math.random() * 6.28 });
}
FX3_TYPES.add('sacast3');
const _sac3b = new THREE.Vector3();
const _sac3t = new THREE.Vector3();
const _sac3d = new THREE.Vector3();
FX3_DRAW.sacast3 = function (h, e) {
  const t = game.time - e.start;
  if (t >= e.dur) return;
  const p = e.follow && !e.follow.gone ? e.follow : null;
  if (!p) return;
  const r1 = (e.rk | 0) + 1; // 0 ohne Rang … 4 Vollendet
  const C = SA_CAST_COL[r1] || SA_CAST_COL[0];
  const low = n3low();
  const px = p.x;
  const pz = feetY(p);
  const x = px * U3;
  const z = pz * U3;
  const end = Math.max(0, Math.min(1, (e.dur - t) / 0.5)); // weiches Ende in der letzten halben Sekunde
  // 1) Klingen blitzen auf: Lichtstreif entlang der Klinge, Glanzpunkt an der Spitze
  const fl = t < 0.15 ? 0 : t < 0.32 ? (t - 0.15) / 0.17 : Math.max(0, 1 - (t - 0.32) / 0.48);
  if (fl > 0.01) {
    for (const left of [false, true]) {
      if (!weaponAxis3(p, _sac3b, _sac3t, left)) continue;
      _sac3d.subVectors(_sac3t, _sac3b);
      const len = _sac3d.length();
      _sac3d.divideScalar(len);
      // der Blitz läuft von der Wurzel zur Spitze
      const run = Math.min(1, (t - 0.15) / 0.22);
      _nf3a.copy(_sac3b);
      _nf3b.copy(_sac3b).addScaledVector(_sac3d, len * (0.2 + 1.0 * run));
      for (const [rr, col, op] of [[0.1, C.alt, 0.4], [0.035, C.light, 0.85]]) {
        const sg = fx3Take(h, 'seg');
        fx3Segment(sg, _nf3a, _nf3b, rr * (0.8 + 0.4 * fl));
        fx3Color(sg, col, op * fl);
      }
      n3Glow(h, _nf3b.x, _nf3b.y, _nf3b.z, 0.35 + 0.45 * fl, C.light, 0.75 * fl);
      n3Glow(h, _nf3b.x, _nf3b.y, _nf3b.z, 0.8 + 0.4 * fl, C.alt, 0.3 * fl);
    }
  }
  // 2) Lichtteich am Boden: breitet sich ab 0,3 s aus, dazu eine weiche Schockwelle nach außen
  if (t > 0.28) {
    const u = Math.min(1, (t - 0.28) / 0.55);
    const eu = 1 - Math.pow(1 - u, 3);
    const R = 0.3 + eu * (0.75 + 0.08 * r1);
    const pool = fx3Take(h, 'plane');
    fx3Ground(pool, px, pz, R, 0.035, 'disc');
    fx3Color(pool, C.main, (0.55 + 0.05 * r1) * Math.min(1, u * 3) * end);
    const core = fx3Take(h, 'plane');
    fx3Ground(core, px, pz, R * 0.5, 0.04, 'disc');
    fx3Color(core, C.light, 0.45 * Math.min(1, u * 3) * end);
    if (u < 1) {
      const wave = fx3Take(h, 'plane');
      fx3Ground(wave, px, pz, 0.4 + eu * (1.2 + 0.12 * r1), 0.045, 'ring');
      fx3Color(wave, C.alt, 0.45 * (1 - u));
    }
  }
  // 3) Aura steigt auf: weicher Lichtschleier (offener Zylinder, unten hell, oben verlaufend) und flammenartige
  //    Schleier, die um den Körper nach oben ziehen und dabei schmaler werden
  if (t > 0.38) {
    const u = Math.min(1, (t - 0.38) / 0.4);
    const env = (1 - Math.pow(1 - u, 2)) * end;
    const H = (1.9 + 0.22 * r1) * (0.55 + 0.45 * u);
    const veil = fx3Take(h, 'wall');
    fx3Map(veil, 'beam');
    fx3Wall(veil, px, pz, 0.5 + 0.03 * r1, H);
    fx3Color(veil, C.main, 0.11 * env);
    const inner = fx3Take(h, 'wall');
    fx3Map(inner, 'beam');
    fx3Wall(inner, px, pz, 0.36, H * 0.8);
    fx3Color(inner, C.light, 0.08 * env);
    const n = (low ? 5 : 8) + r1 * (low ? 1 : 2);
    for (let i = 0; i < n; i++) {
      const ph = (t * 0.85 + i / n) % 1;
      const a = i * 2.399 + t * 0.9;
      const rr = (0.42 + 0.06 * Math.sin(i * 1.7)) * (1 - ph * 0.35);
      const col = i % 3 === 2 ? C.alt : i % 2 ? C.main : C.light;
      const w = (0.3 + 0.04 * r1) * (1 - ph * 0.5);
      n3Flame(h, x + Math.cos(a) * rr, 0.25 + ph * H * 0.85, z + Math.sin(a) * rr * 0.8, w, w * 2.6, C.acc && i % 4 === 3 ? C.acc : col, 0.42 * env * Math.sin(ph * Math.PI));
    }
    // ein paar Lichtfunken steigen mit
    if (!low) for (let i = 0; i < 6 + r1 * 2; i++) {
      const ph = (t * 0.7 + i * 0.137) % 1;
      const a = i * 1.9 + e.start;
      n3Glow(h, x + Math.cos(a) * 0.5 * (1 - ph * 0.4), 0.2 + ph * H, z + Math.sin(a) * 0.4, 0.09, i % 2 ? C.light : C.alt, env * (1 - ph));
    }
  }
};
// 2D: Lichtteich als Ellipse am Boden, aufsteigender Lichtschleier und Funken (Kraftpose kommt aus zeichnen.js)
EXTRA_EFFECTS.sacast3 = (ctx, e, k, x, y) => {
  const t = k * e.dur;
  const C = SA_CAST_COL[(e.rk | 0) + 1] || SA_CAST_COL[0];
  const end = Math.max(0, Math.min(1, (e.dur - t) / 0.5));
  ctx.globalCompositeOperation = 'lighter';
  if (t > 0.28) {
    const u = Math.min(1, (t - 0.28) / 0.55);
    const R = 12 + (1 - Math.pow(1 - u, 3)) * 34;
    const g = ctx.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, C.light);
    g.addColorStop(0.5, C.main);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.5 * end;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, R, R * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (t > 0.38) {
    const u = Math.min(1, (t - 0.38) / 0.4);
    const H = 70 * (0.55 + 0.45 * u);
    const g = ctx.createLinearGradient(0, y, 0, y - H);
    g.addColorStop(0, C.main);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.28 * u * end;
    ctx.fillStyle = g;
    ctx.fillRect(x - 16, y - H, 32, H);
    for (let i = 0; i < 6; i++) {
      const ph = (t * 0.85 + i / 6) % 1;
      glow(ctx, x + Math.sin(i * 2.4 + t * 2) * 13, y - 4 - ph * H, 5, i % 2 ? C.light : C.alt, 0.7 * (1 - ph) * end);
    }
  }
};

// --- Aura des Schwertes auf Vollendet (V): Bodenbruch (seit 14.63) -----------------------------------------
// Spielerwunsch: „Auf V muss der Boden einen kreisförmigen, blauen, kurzen Aura-Kreis zeichnen und Steine hochgehen.“
// Ausnahmsweise ein Bodenkreis – aber reine Energie (leuchtender Ring mit weichem Glühen und Schockwelle), keine
// Runen, Sterne oder Zeichen. Bleibt am Ort des Wirkens liegen (folgt der Figur nicht), läuft parallel zu sacast3:
//   0,05–0,3 s  blaues Licht sammelt sich unter den Füßen
//   0,3 s       Aufschlag (Klingenblitz auf dem Höhepunkt): Ring springt auf, zwei Schockwellen laufen nach außen,
//               kurzes Beben (nur eigener Krieger, nur mit „Bildschirmwackeln“), Risse im Boden leuchten blau
//   0,3–0,75 s  Brocken brechen im Kreis aus dem Boden und steigen leicht drehend auf, dazu Staub und blaue Funken
//   bis 1,2 s   Brocken schweben, Ring pulsiert und verblasst
//   1,2–1,75 s  Brocken fallen, zerbröseln zu Staub; Risse und Ring weg
// Brocken: gemeinsamer Vorrat 'rock' (eine Geometrie, Materialien je Teil wiederverwendet), höchstens 14 (Grafik
// „Niedrig“ 8). Farbe aus dem Boden der Karte wie beim Sprungschlag (crater3), auf Wasser nur Ringe.
const SA_BRUCH = { dur: 1.75, hit: 0.3, R: 1.55, n: 14, nLow: 8 };
const SA_BRUCH_COL = { glow: '#2a62ff', ring: '#6fb2ff', core: '#e4f2ff', deep: '#1838b8' };
const _sab3tile = {};
const _sab3col = new THREE.Color();
const _sab3mix = new THREE.Color('#857360');
function saBruchSeed(e) {
  if (e.rocks) return e.rocks;
  const n = SA_BRUCH.n;
  e.rocks = Array.from({ length: n }, (v, i) => {
    const big = i % 3 === 0;
    return {
      a: (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.35,
      d: (i % 2 ? 0.62 : 0.95) + Math.random() * 0.22,
      s: big ? 0.24 + Math.random() * 0.08 : 0.11 + Math.random() * 0.07,
      hm: (big ? 0.65 : 0.85) + Math.random() * 0.6,
      del: Math.random() * 0.08,
      fl: 0.78 + Math.random() * 0.14,
      rx: (Math.random() - 0.5) * 5, ry: Math.random() * 6.28, rz: (Math.random() - 0.5) * 5,
      sq: 0.65 + Math.random() * 0.3, tone: (Math.random() - 0.5) * 0.24
    };
  });
  return e.rocks;
}
// Bahn eines Brockens u Sekunden nach dem Aufschlag: Höhe (Anteil an hm), Größe 0–1, Drehtempo 0–1
function saBruchRock(q, u) {
  const t = u - q.del;
  if (t < 0) return null;
  const pop = Math.min(1, t / 0.1);
  let y;
  let spin = 1;
  if (t < 0.1) y = -0.25 * (1 - pop);
  else if (t < 0.48) y = easeOut((t - 0.1) / 0.38);
  else if (t < q.fl) { y = 1 + 0.05 * Math.sin((t - 0.48) * 7 + q.ry); spin = 0.35; }
  else y = Math.max(0, 1 - Math.pow((t - q.fl) / 0.24, 2));
  // nach dem Aufschlag zerbröseln (spätestens 1,42 s nach dem Aufschlag weg, vor Ende des Effekts)
  const land = q.fl + 0.24;
  const size = t > land ? Math.max(0, 1 - (t - land) / 0.18) : 1;
  return { y, size: size * (0.5 + 0.5 * pop), spin };
}
function saBruchShake(e, t) {
  if (e.shook || t < SA_BRUCH.hit) return;
  e.shook = true;
  if (typeof shakeScreen !== 'function') return;
  // seit 14.64 bebt der Boden auch für Mitspieler in der Nähe (bis 420 weit, nach außen schwächer)
  if (e.own) { shakeScreen(3.5); return; }
  const me = game.player;
  if (!me) return;
  const d = Math.hypot(me.x - e.x, feetY(me) - e.y);
  if (d < 420) shakeScreen(1.2 + 2.3 * (1 - d / 420));
}
FX3_TYPES.add('sabruch3');
FX3_DRAW.sabruch3 = function (h, e) {
  const t = game.time - e.start;
  if (t >= e.dur) return;
  saBruchShake(e, t);
  const B = SA_BRUCH_COL;
  const low = n3low();
  const x = e.x * U3;
  const z = e.y * U3;
  if (!e.earth) {
    tileSample(Math.floor(e.x / TILE), Math.floor(e.y / TILE), _sab3tile);
    e.liquid = _sab3tile.h < 0;
    _sab3col.setRGB(_sab3tile.r || 0.4, _sab3tile.g || 0.36, _sab3tile.b || 0.3);
    // neutral grau-braun gemischt, damit die Brocken auf Gras nicht grün und auf Schnee nicht weiß werden
    _sab3col.lerp(_sab3mix, 0.65);
    e.earth = '#' + _sab3col.getHexString();
    e.dust = lighter(e.earth, 0.2);
  }
  const T0 = SA_BRUCH.hit;
  const R0 = SA_BRUCH.R;
  // 1) Licht sammelt sich unter den Füßen
  if (t < T0 + 0.05) {
    const c = clamp01((t - 0.05) / (T0 - 0.05));
    const o = fx3Take(h, 'plane');
    fx3Ground(o, e.x, e.y, 0.25 + 0.55 * c, 0.05, 'disc');
    fx3Color(o, B.ring, 0.45 * c);
  }
  if (t < T0) return;
  const u = t - T0;
  // Stärke des Rings: Aufblitzen, kurz halten, schnell aus
  const I = u < 0.12 ? 1 : u < 0.45 ? 1 - 0.3 * (u - 0.12) / 0.33 : u < 0.9 ? 0.7 + 0.08 * Math.sin(u * 18) : Math.max(0, 0.7 * (1 - (u - 0.9) / 0.4));
  // 2) Energiering: weiches blaues Glühen, kräftiger Ring, heller Kern; springt in 0,14 s auf
  const ringR = R0 * (0.5 + 0.5 * easeOut(Math.min(1, u / 0.14)));
  if (I > 0.005) {
    const fill = fx3Take(h, 'plane');
    fx3Ground(fill, e.x, e.y, ringR * 1.2, 0.052, 'disc');
    fx3Color(fill, B.deep, 0.32 * I);
    // normal gemischt darunter: bleibt auch auf hellem Sand, Schnee und Pflaster sichtbar blau
    const tint = fx3Take(h, 'planeN');
    fx3Ground(tint, e.x, e.y, ringR * 1.06, 0.054, 'ring');
    fx3Color(tint, B.deep, 0.5 * I);
    const halo = fx3Take(h, 'plane');
    fx3Ground(halo, e.x, e.y, ringR * 1.1, 0.056, 'ring');
    fx3Color(halo, B.glow, 0.75 * I);
    const ring = fx3Take(h, 'plane');
    fx3Ground(ring, e.x, e.y, ringR, 0.06, 'ring');
    fx3Color(ring, B.ring, 0.95 * I);
    const core = fx3Take(h, 'plane');
    fx3Ground(core, e.x, e.y, ringR * 0.985, 0.064, 'ring');
    fx3Color(core, B.core, 0.55 * I * (u < 0.35 ? 1 : 0.5));
  }
  // 3) zwei Schockwellen nach außen
  for (const [del, len, far, col, op] of [[0, 0.42, 2.9, B.ring, 0.85], [0.09, 0.5, 2.3, B.core, 0.55]]) {
    const w = (u - del) / len;
    if (w < 0 || w >= 1) continue;
    const o = fx3Take(h, 'plane');
    fx3Ground(o, e.x, e.y, R0 * (0.9 + (far - 0.9) * easeOut(w)), 0.058, 'ring');
    fx3Color(o, col, op * Math.pow(1 - w, 1.4));
  }
  // Lichtschlag beim Aufschlag
  if (u < 0.22) n3Glow(h, x, 0.35, z, 2.2, B.ring, 0.4 * (1 - u / 0.22));
  // 4) Risse: dunkel im Boden, darüber blau glimmend (das Glimmen geht mit dem Ring)
  const crk = u < 0.08 ? u / 0.08 : Math.max(0, 1 - Math.max(0, u - 0.95) / 0.5);
  if (crk > 0.01 && !e.liquid) {
    const dark = fx3Take(h, 'planeN');
    fx3Ground(dark, e.x, e.y, R0 * 1.15, 0.045, 'mcracks', e.rot);
    fx3Color(dark, '#1c140c', 0.6 * crk);
    const hot = fx3Take(h, 'plane');
    fx3Ground(hot, e.x, e.y, R0 * 1.15, 0.048, 'mcracks', e.rot);
    fx3Color(hot, B.ring, 0.8 * crk * I);
  }
  if (e.liquid) return;
  // 5) Brocken: brechen aus, steigen drehend auf, schweben, fallen und zerbröseln
  const sd = saBruchSeed(e);
  const n = low ? SA_BRUCH.nLow : SA_BRUCH.n;
  for (let i = 0; i < n; i++) {
    const q = sd[i];
    const st = saBruchRock(q, u);
    if (!st || st.size <= 0.01) continue;
    const dd = R0 * q.d * (1 + 0.12 * Math.min(1, u / 0.5));
    const px = x + Math.cos(q.a) * dd;
    const pz = z + Math.sin(q.a) * dd;
    const s = q.s * st.size;
    const o = fx3Rock(h, 'rock', px, q.hm * st.y + s * 0.6, pz, s, s * q.sq, s * 0.85, q.tone > 0 ? lighter(e.earth, q.tone) : darker(e.earth, -q.tone));
    const sp = u * (0.4 + 0.6 * st.spin);
    o.rotation.set(q.rx * sp, q.ry + sp * 1.5, q.rz * sp);
    // blauer Schimmer unter aufsteigenden Brocken
    if (!low && st.y > 0.1 && u < 1.0 && i % 2 === 0) n3Glow(h, px, q.hm * st.y, pz, s * 3.2, B.glow, 0.35 * I);
  }
  // 6) Staub: beim Ausbrechen und beim Aufschlagen der Brocken
  const nd = low ? 4 : 7;
  for (let i = 0; i < nd; i++) {
    const q = sd[(i * 2) % sd.length];
    const w = u / 0.85;
    if (w < 1) {
      const dd = R0 * q.d * (1 + 0.25 * w);
      n3Smoke(h, x + Math.cos(q.a) * dd, 0.15 + 0.35 * w, z + Math.sin(q.a) * dd, 0.4 + 0.75 * w, e.dust, 0.55 * (1 - w) * Math.min(1, u / 0.05));
    }
    const lw = (u - q.fl - 0.2) / 0.5;
    if (lw > 0 && lw < 1 && i % 2 === 0) {
      const dd = R0 * q.d * 1.12;
      n3Smoke(h, x + Math.cos(q.a) * dd, 0.1 + 0.2 * lw, z + Math.sin(q.a) * dd, 0.3 + 0.45 * lw, e.dust, 0.45 * (1 - lw));
    }
  }
  // 7) blaue Funken springen aus den Rissen
  if (u < 0.85) {
    const nf = low ? 6 : 12;
    for (let i = 0; i < nf; i++) {
      const w = clamp01((u - (i % 4) * 0.05) / 0.6);
      if (w <= 0 || w >= 1) continue;
      const a = e.rot + i * 2.399;
      const dd = R0 * (0.35 + 0.55 * ((i * 0.37) % 1)) * (1 + 0.4 * w);
      n3Glow(h, x + Math.cos(a) * dd, 0.1 + 1.6 * w * (1 - 0.45 * w), z + Math.sin(a) * dd, 0.1, i % 3 ? B.ring : B.core, 0.9 * (1 - w));
    }
  }
};
// 2D: blauer Ring (Ellipse) mit Schockwelle und ein paar Brocken, die hochgehen und wieder fallen
EXTRA_EFFECTS.sabruch3 = (ctx, e, k, x, y) => {
  const t = k * e.dur;
  saBruchShake(e, t);
  const B = SA_BRUCH_COL;
  const T0 = SA_BRUCH.hit;
  const R = SA_BRUCH.R * TILE;
  ctx.globalCompositeOperation = 'lighter';
  if (t < T0) {
    const c = clamp01((t - 0.05) / (T0 - 0.05));
    glow(ctx, x, y, 8 + 18 * c, B.ring, 0.5 * c);
    return;
  }
  const u = t - T0;
  const I = u < 0.12 ? 1 : u < 0.9 ? 1 - 0.3 * Math.min(1, (u - 0.12) / 0.33) : Math.max(0, 0.7 * (1 - (u - 0.9) / 0.4));
  const rr = R * (0.5 + 0.5 * easeOut(Math.min(1, u / 0.14)));
  const ring = (r, w, col, a) => {
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.42, 0, 0, Math.PI * 2);
    ctx.stroke();
  };
  if (I > 0.005) {
    ring(rr, 12, B.glow, 0.55 * I);
    ring(rr, 4, B.ring, 0.9 * I);
    ring(rr, 1.5, B.core, 0.8 * I);
  }
  const w = u / 0.42;
  if (w < 1) ring(R * (0.9 + 2.0 * easeOut(w)), 3, B.ring, 0.8 * Math.pow(1 - w, 1.4));
  if (u < 0.2) glow(ctx, x, y, 40, B.ring, 0.5 * (1 - u / 0.2));
  ctx.globalCompositeOperation = 'source-over';
  const sd = saBruchSeed(e);
  for (let i = 0; i < 7; i++) {
    const q = sd[i * 2];
    const st = saBruchRock(q, u);
    if (!st || st.size <= 0.01) continue;
    const dd = R * q.d * (1 + 0.12 * Math.min(1, u / 0.5));
    const rx = x + Math.cos(q.a) * dd;
    const ry = y + Math.sin(q.a) * dd * 0.42 - q.hm * st.y * 40;
    const s = q.s * st.size * TILE;
    ctx.globalAlpha = 1;
    ctx.fillStyle = q.tone > 0 ? '#8a7a66' : '#6a5c4c';
    ctx.strokeStyle = '#3a3026';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let j = 0; j < 5; j++) {
      const a = q.ry + u * q.rx * 0.6 + j * 1.2566;
      const sr = s * (j % 2 ? 0.8 : 1);
      if (j) ctx.lineTo(rx + Math.cos(a) * sr, ry + Math.sin(a) * sr * q.sq);
      else ctx.moveTo(rx + Math.cos(a) * sr, ry + Math.sin(a) * sr * q.sq);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
};


// === Schattenkette (seit 13.85, Platz 5 des Dolch-Weges statt Leichtfüßigkeit) ================================
// Der Ninja springt von Gegner zu Gegner: Er beginnt beim Fokus (sonst beim nächsten Monster bis sk.range, Seelensteine
// nur, wenn kein Monster da ist), zerfällt bei jedem Sprung zu Schattenrauch, taucht hinter oder neben dem nächsten
// Gegner wieder auf und schneidet ihn. Sprünge: sk.hops, je Rang sk.rankHops (E 5, H 6, L 6, V 7), alle sk.every s.
// Jeder Sprung nimmt den nächsten noch nicht getroffenen Gegner bis sk.hopRange vom aktuellen Platz; sind alle schon
// getroffen, springt er zwischen ihnen hin und her – jeder weitere Treffer am selben Gegner macht nur sk.repeatMul.
// Während der Sprünge ist die Figur festgehalten und nimmt keinen Schaden (protectUntil); sie bleibt am letzten Platz
// stehen, der wie beim Blitzangriff nie in Wand, Wasser oder Dorf liegt. Mitspieler sehen die Sprünge über
// MAGE2_REMOTE.chainblink (Plätze und Ziele je Sprung, Rang).
const CHAIN = { lift: 0.82 };
function chainHops(sk, rk) {
  return rk >= 0 && sk.rankHops ? sk.rankHops[Math.min(rk, sk.rankHops.length - 1)] : sk.hops;
}
// freier Platz hinter dem Gegner m (von from aus gesehen), sonst seitlich; null = keiner frei
function chainSpot(p, m, from) {
  const a0 = Math.atan2(m.y - from.y, m.x - from.x);
  const r = (m.r || 14) + 16;
  for (const off of [0, 0.7, -0.7, 1.4, -1.4, 2.1, -2.1, Math.PI]) {
    const a = a0 + off;
    const x = m.x + Math.cos(a) * r;
    const y = m.y + Math.sin(a) * r;
    if (canStand(x, y, (p.r || 11) * 0.8, false) && (!inVillage(x, y) || duelFighting())) return { x, y };
  }
  return null;
}
// Reihenfolge der Sprünge (beim Wirken geplant): frische Gegner zuerst, dann hin und her
function chainPlan(p, first, n, sk) {
  const steps = [];
  const count = new Map();
  let cur = { x: p.x, y: p.y };
  let m = first;
  let last = null;
  for (let k = 0; k < n && m; k++) {
    const spot = chainSpot(p, m, cur) || { x: cur.x, y: cur.y };
    steps.push({ m, x: spot.x, y: spot.y, rep: count.get(m.id) || 0 });
    count.set(m.id, (count.get(m.id) || 0) + 1);
    last = m;
    cur = spot;
    const near = enemiesNear(cur.x, cur.y, sk.hopRange).filter((o) => !o.hidden && Math.hypot(o.x - cur.x, o.y - cur.y) - (o.r || 0) <= sk.hopRange);
    const mobs = near.filter((o) => !o.isStone);
    const pool = mobs.length ? mobs : near;
    const fresh = pool.filter((o) => !count.has(o.id)).sort((a, b) => Math.hypot(a.x - cur.x, a.y - cur.y) - Math.hypot(b.x - cur.x, b.y - cur.y));
    m = fresh[0] || pool.slice().sort((a, b) => (a === last) - (b === last) || count.get(a.id) - count.get(b.id) || dist(a, cur) - dist(b, cur))[0] || null;
  }
  return steps;
}
SKILL_TYPES.chainblink = function (sk, pw, lvl) {
  const p = game.player;
  let t = pickTarget(sk.range);
  // nie zuerst auf einen Seelenstein, solange ein Monster in Reichweite ist
  if (t && t.isStone) {
    const mob = enemiesNear(p.x, p.y, sk.range).filter((o) => !o.isStone && !o.hidden && dist(p, o) - (o.r || 0) <= sk.range).sort((a, b) => dist(a, p) - dist(b, p))[0];
    if (mob) t = mob;
  }
  if (!t) {
    addText(p.x, p.y - 34, 'Kein Ziel', 'info');
    return false;
  }
  const rk = typeof skillRank === 'function' ? skillRank(lvl || 1) : -1;
  const plan = chainPlan(p, t, chainHops(sk, rk), sk);
  const total = plan.length * sk.every;
  lockPlayer(p, total + 0.08);
  p.protectUntil = Math.max(p.protectUntil || 0, game.time + total + 0.08);
  input.walkTo = null;
  plan.forEach((st, k) => later(k * sk.every, () => {
    if (p.dead) return;
    const m = st.m;
    const from = { x: p.x, y: p.y };
    // folgt dem Gegner, falls er sich seit dem Wirken bewegt hat
    const spot = (!m.dead && chainSpot(p, m, from)) || { x: st.x, y: st.y };
    p.x = spot.x;
    p.y = spot.y;
    p.blinkHide = game.time + 0.04;
    if (!m.dead) faceTowards(m.x, m.y);
    p.combo = k % 3;
    startSwing(p, 'combo', Math.min(0.2, sk.every + 0.04));
    ninjaBladeFlash(p, sk.color, 0.18);
    chainHopFx(p, from, spot, m.dead ? spot : m, sk, k === plan.length - 1, true);
    // sk.stun: kurz taumeln (nur der erste Schnitt je Gegner)
    if (!m.dead) hitMonster(m, sk.dmg * (st.rep ? sk.repeatMul : 1) * pw, { skill: sk.id, stun: st.rep ? 0 : sk.stun, heavy: k === plan.length - 1, vfxColor: '#d8c8ff' });
  }));
  return { h: plan.map((st) => [Math.round(st.x), Math.round(st.y), Math.round(st.m.x), Math.round(st.m.y)]) };
};
// Bild eines Sprungs (für alle gleich): Nachbild und Rauch am alten Platz, Schattenlinie, Schnitt am Gegner
function chainHopFx(owner, from, to, tgt, sk, last, mine) {
  const col = fxRank >= 0 ? SKILL_RANKS[fxRank].color : sk.color;
  const dir = facingDir(owner.facing || { x: 0, y: 1 });
  addEffect({ type: 'afterimage', sprite: characterSprite(owner.classId, dir, 1, playerLook(owner)), x: from.x, y: from.y + (owner.r || 11) * 0.8, flip: dir === 'side' && owner.facing && owner.facing.x < 0, dur: 0.32, tint: sk.color });
  particles(from.x, from.y + 4, { count: 10, color: ['#0a0610', '#2a1640', '#5a2aa8'], speed: [20, 80], life: [0.25, 0.5], size: [3, 6], jitter: 6, drag: 3, glow: false });
  addEffect({ type: 'nchain3', x: to.x, y: to.y, x0: from.x, y0: from.y, x1: to.x, y1: to.y, tx: tgt.x, ty: tgt.y, a: Math.atan2(tgt.y - to.y, tgt.x - to.x), color: col, last, dur: 0.6 });
  // 2D: dünne Schattenlinie und Schnitt (in 3D zeichnet nchain3)
  const len = Math.hypot(to.x - from.x, to.y - from.y);
  if (len > 12) addEffect({ type: 'slash', x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 - 14, ang: Math.atan2(to.y - from.y, to.x - from.x), len, w: 3, dur: 0.22, color: '#3a1670' });
  const bc = tgt.r != null ? bodyCenter(tgt) : { x: tgt.x, y: tgt.y - 14 };
  const ang = Math.atan2(tgt.y - to.y, tgt.x - to.x) + Math.PI / 2 + (Math.random() - 0.5) * 0.6;
  addEffect({ type: 'slash', x: bc.x, y: bc.y, ang, len: last ? 74 : 58, w: last ? 9 : 7, dur: 0.26, color: col });
  addEffect({ type: 'slash', x: bc.x, y: bc.y, ang: ang + 0.25, len: last ? 46 : 34, w: 3, dur: 0.2, color: '#ffffff' });
  addEffect({ type: 'sparks3', x: tgt.x, y: tgt.r != null ? feetY(tgt) : tgt.y, h: 0.75, count: last ? 10 : 6, color: '#e0d0ff', speed: 2.4, up: 0.9, dur: 0.35 });
  particles(bc.x, bc.y, { count: last ? 14 : 8, color: ['#ffffff', col, '#5a2aa8'], speed: [80, 220], life: [0.15, 0.3], size: [1.2, 2.4], shape: 'spark', drag: 6 });
  if (typeof snd !== 'undefined' && snd.swing) snd.swing(owner, true);
  if (mine && last) shakeScreen(3);
}
MAGE2_REMOTE.chainblink = (rp, sk, d) => {
  // ältere Mitspieler melden noch die Leichtfüßigkeit (gleiche Kennung über SKILL_RENAMED): ohne Sprünge nichts zeigen
  if (!Array.isArray(d.h) || !d.h.length) return;
  const rk = Number.isInteger(d.rk) && d.rk >= 0 && d.rk < SKILL_RANKS.length ? d.rk : -1;
  const hops = d.h.slice(0, 12).filter((h) => Array.isArray(h) && h.length === 4 && h.every(isFinite));
  withRank(rk, () => hops.forEach(([x, y, tx, ty], k) => later(k * sk.every, () => {
    const from = { x: rp.x, y: rp.y };
    rp.x = rp.tx = x;
    rp.y = rp.ty = y;
    rp.glideHold = { x, y, until: game.time + 0.5 };
    rp.blinkHide = game.time + 0.04;
    rp.facing = unitVec(tx - x, ty - y);
    chainHopFx(rp, from, { x, y }, { x: tx, y: ty }, sk, k === hops.length - 1, false);
  })));
};

// 3D: Schattenrauch und Nachbild am alten Platz, dünne violette Linie zum neuen Platz (verblasst schnell),
// heller Klingenbogen und dunkle Schnittspur quer über den Gegner; Farbe je Rang (color)
FX3_DRAW.nchain3 = function (h, e) {
  const t = game.time - e.start;
  const k = t / e.dur;
  if (k >= 1) return;
  const low = n3low();
  const x0 = e.x0 * U3;
  const z0 = (e.y0 + 9) * U3;
  const x1 = e.x1 * U3;
  const z1 = (e.y1 + 9) * U3;
  // Schattenlinie zwischen den Plätzen: dunkler Kern mit leuchtendem Saum, wird dünner und verblasst
  {
    const op = 1 - k;
    _nf3a.set(x0, CHAIN.lift, z0);
    _nf3b.set(x1, CHAIN.lift, z1);
    const sg = fx3Take(h, 'segN');
    fx3Segment(sg, _nf3a, _nf3b, 0.05 * op + 0.01);
    fx3Color(sg, '#1a0a2a', 0.85 * op);
    const gl = fx3Take(h, 'seg');
    fx3Segment(gl, _nf3a, _nf3b, 0.075 * op + 0.02);
    fx3Color(gl, e.color, 0.7 * op);
    if (!low) for (let j = 1; j < 4; j++) n3Glow(h, x0 + (x1 - x0) * j / 4, CHAIN.lift, z0 + (z1 - z0) * j / 4, 0.35, e.color, 0.45 * op);
  }
  // Nachbild am alten Platz zerfällt zu Rauch (leuchtender Umriss, dunkler Kern)
  nfxGhost(h, x0, z0, e.color, Math.max(0, 0.55 - k * 0.8));
  nfxGhost(h, x0, z0, '#2a1640', Math.max(0, 0.8 - k * 1.1), true);
  for (let j = 0; j < (low ? 3 : 6); j++) {
    const a = j * 2.4 + e.start * 3;
    const rise = k * (0.6 + j * 0.15);
    n3Smoke(h, x0 + Math.cos(a) * (0.2 + k * 0.4), 0.3 + rise + j * 0.12, z0 + Math.sin(a) * (0.2 + k * 0.4), 0.38 + k * 0.3, j % 2 ? '#3a1e5a' : '#0a0610', 0.7 * (1 - k));
  }
  // Klingenbogen und Schnittspur am Gegner
  if (k < 0.55) {
    const op = 1 - k / 0.55;
    const tx = e.tx * U3;
    const tz = (e.ty + 9) * U3;
    _nf3c.set(tx, CHAIN.lift + 0.1, tz);
    const sw = Math.min(1, k / 0.25);
    const a0 = e.a - 1.1;
    const s = fx3Take(h, 'strip');
    fx3Strip(s, _nf3c, _nf3u, _nf3v, e.last ? 0.62 : 0.5, 0.09, a0, a0 + 2.2 * sw, '#ffffff', 0.9 * op, false);
    const s2 = fx3Take(h, 'stripN');
    fx3Strip(s2, _nf3c, _nf3u, _nf3v, e.last ? 0.7 : 0.58, 0.06, a0, a0 + 2.2 * sw, '#3a1670', 0.85 * op, false);
    n3Glow(h, tx, CHAIN.lift + 0.1, tz, e.last ? 0.9 : 0.6, e.color, 0.7 * op);
  }
};
