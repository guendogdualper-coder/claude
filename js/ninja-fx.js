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
  const pulse = 0.8 + 0.2 * Math.sin(t * 7);
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
