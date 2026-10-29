// Fertigkeits-Effekte als echte 3D-Körper (seit Version 6.4): Schockwellen als Ring am Boden mit
// leuchtender Wand, Lichtsäulen als Zylinder, Blitze aus dem Himmel, Schnitte als gewölbte Sicheln im Raum,
// Schwünge als waagrechte Bögen um die Figur, Runenkreise am Boden, Strahlen und Ketten zwischen Figuren.
// Die 2D-Ebene über der 3D-Szene zeichnet diese Arten dann nicht mehr (FX3_TYPES).
// Ränge (E, H, L, V) bekommen eine zweite Hülle in der Rangfarbe, ab Legendär zusätzlich Runen und Funken.

const FX3_TYPES = new Set(['ring', 'pillar', 'bolt', 'slash', 'impact', 'runes', 'warn', 'beam', 'chain', 'tornado', 'swoosh', 'lightbeam', 'ultbeam', 'ultsigil',
  'sparks3', 'shards3', 'orbs3', 'column3', 'smoke3', 'bite3', 'claw3']);
const FX3 = { group: null, tex: {}, pools: {}, live: new Set(), cam: { r: null, u: null, f: null } };

// --- Texturen (weiß, die Farbe kommt vom Material) ----------------------------------------------
function fx3Texture(kind) {
  if (FX3.tex[kind]) return FX3.tex[kind];
  const c = document.createElement('canvas');
  c.width = kind === 'beam' ? 8 : 128;
  c.height = kind === 'beam' ? 128 : 128;
  const g = c.getContext('2d');
  const m = 64;
  if (kind === 'ring') {
    const rg = g.createRadialGradient(m, m, 0, m, m, m);
    rg.addColorStop(0, 'rgba(255,255,255,0)');
    rg.addColorStop(0.62, 'rgba(255,255,255,0)');
    rg.addColorStop(0.82, 'rgba(255,255,255,0.35)');
    rg.addColorStop(0.92, 'rgba(255,255,255,1)');
    rg.addColorStop(0.97, 'rgba(255,255,255,0.55)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, 128, 128);
  } else if (kind === 'disc') {
    const rg = g.createRadialGradient(m, m, 0, m, m, m);
    rg.addColorStop(0, 'rgba(255,255,255,1)');
    rg.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, 128, 128);
  } else if (kind === 'spark') {
    const rg = g.createRadialGradient(m, m, 0, m, m, 34);
    rg.addColorStop(0, 'rgba(255,255,255,1)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) {
      g.save();
      g.translate(m, m);
      g.rotate(i * Math.PI / 4);
      g.globalAlpha = i % 2 ? 0.5 : 1;
      g.beginPath();
      g.moveTo(-62, 0);
      g.quadraticCurveTo(0, -4, 62, 0);
      g.quadraticCurveTo(0, 4, -62, 0);
      g.fill();
      g.restore();
    }
  } else if (kind === 'rune') {
    g.strokeStyle = '#ffffff';
    g.fillStyle = '#ffffff';
    g.lineWidth = 3;
    for (const r of [60, 46, 30]) {
      g.beginPath();
      g.arc(m, m, r, 0, Math.PI * 2);
      g.stroke();
    }
    // Zeichen zwischen den Ringen
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.save();
      g.translate(m + Math.cos(a) * 53, m + Math.sin(a) * 53);
      g.rotate(a + Math.PI / 2);
      g.beginPath();
      g.moveTo(-4, 3);
      g.lineTo(0, -4);
      g.lineTo(4, 3);
      g.moveTo(0, -4);
      g.lineTo(0, 4);
      g.stroke();
      g.restore();
    }
    // Stern
    g.beginPath();
    for (let i = 0; i <= 6; i++) {
      const a = -Math.PI / 2 + (i * 2 / 6) * Math.PI * 2;
      const x = m + Math.cos(a) * 44;
      const y = m + Math.sin(a) * 44;
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.stroke();
    const rg = g.createRadialGradient(m, m, 0, m, m, m);
    rg.addColorStop(0, 'rgba(255,255,255,0.25)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, 128, 128);
  } else if (kind === 'beam') {
    // senkrecht: unten hell, nach oben ausblendend (oben im Bild = oben am Zylinder)
    const lg = g.createLinearGradient(0, 0, 0, 128);
    lg.addColorStop(0, 'rgba(255,255,255,0)');
    lg.addColorStop(0.55, 'rgba(255,255,255,0.45)');
    lg.addColorStop(1, 'rgba(255,255,255,1)');
    g.fillStyle = lg;
    g.fillRect(0, 0, 8, 128);
  }
  const t = new THREE.CanvasTexture(c);
  FX3.tex[kind] = t;
  return t;
}

function fx3Mat(map, vertexColors) {
  return new THREE.MeshBasicMaterial({
    map: map || null, color: 0xffffff, transparent: true, opacity: 1, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, vertexColors: !!vertexColors
  });
}

// --- Bausteine aus dem Vorrat -------------------------------------------------------------------
// plane: flach am Boden; wall: offener Zylinder; seg: dünner Zylinder für Blitze und Strahlen;
// strip: gebogener Streifen (Schnitte, Schwünge); sprite: Lichtfleck zur Kamera gedreht
const FX3_STRIP_N = 18;
function fx3Make(kind) {
  let o;
  if (kind === 'plane' || kind === 'planeN') {
    o = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), fx3Mat(fx3Texture('ring')));
    // planeN: normal gemischt – Warnkreise bleiben auch auf hellem Schnee und Eis sichtbar
    if (kind === 'planeN') o.material.blending = THREE.NormalBlending;
    o.rotation.x = -Math.PI / 2;
  } else if (kind === 'wall') {
    o = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 28, 1, true), fx3Mat(fx3Texture('beam')));
  } else if (kind === 'seg') {
    o = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 6, 1, true), fx3Mat(null));
  } else if (kind === 'strip') {
    const geo = new THREE.BufferGeometry();
    const n = (FX3_STRIP_N + 1) * 2;
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const idx = [];
    for (let i = 0; i < FX3_STRIP_N; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    geo.setIndex(idx);
    o = new THREE.Mesh(geo, fx3Mat(null, true));
    o.frustumCulled = false;
  } else if (kind === 'cone' || kind === 'coneG') {
    // Zacken aus dem Boden: Fels/Knochen (fest) oder Kristall/Glut (leuchtend)
    const mat = kind === 'cone'
      ? new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 1 })
      : fx3Mat(null);
    o = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 5), mat);
  } else if (kind === 'smoke') {
    o = new THREE.Sprite(new THREE.SpriteMaterial({ map: fx3Texture('disc'), color: 0x000000, transparent: true, depthWrite: false, fog: false }));
  } else {
    o = new THREE.Sprite(new THREE.SpriteMaterial({ map: fx3Texture('spark'), color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  }
  o.renderOrder = 5;
  o.castShadow = false;
  o.receiveShadow = false;
  o.userData.kind = kind;
  FX3.group.add(o);
  return o;
}

function fx3Take(h, kind) {
  const pool = FX3.pools[kind] || (FX3.pools[kind] = []);
  const o = pool.pop() || fx3Make(kind);
  o.visible = true;
  h.parts.push(o);
  return o;
}

function fx3Release(h) {
  for (const o of h.parts) {
    o.visible = false;
    FX3.pools[o.userData.kind].push(o);
  }
  h.parts.length = 0;
}

// --- Hilfen --------------------------------------------------------------------------------------
const _x3fa = new THREE.Vector3();
const _x3fb = new THREE.Vector3();
const _x3fy = new THREE.Vector3(0, 1, 0);

function fx3Map(o, kind) {
  const t = kind ? fx3Texture(kind) : null;
  if (o.material.map !== t) { o.material.map = t; o.material.needsUpdate = true; }
}

function fx3Color(o, color, op) {
  o.material.color.set(color);
  o.material.opacity = Math.max(0, Math.min(1, op));
}

// flach am Boden: Mitte (Welt-Pixel), Radius (Einheiten), Höhe, Textur, Drehung
function fx3Ground(o, x, z, r, h, tex, rot = 0) {
  fx3Map(o, tex);
  o.position.set(x * U3, h, z * U3);
  o.scale.set(r, r, 1);
  o.rotation.set(-Math.PI / 2, 0, rot);
}

// Zylinder zwischen zwei Punkten (Einheiten)
function fx3Segment(o, a, b, r) {
  _x3fa.subVectors(b, a);
  const len = _x3fa.length() || 0.001;
  o.position.copy(a).addScaledVector(_x3fa, 0.5);
  o.scale.set(r, len, r);
  o.quaternion.setFromUnitVectors(_x3fy, _x3fa.divideScalar(len));
}

function fx3Wall(o, x, z, r, h, y0 = 0) {
  o.position.set(x * U3, y0 + h / 2, z * U3);
  o.scale.set(r, h, r);
  o.quaternion.identity();
}

// gebogener Streifen: Mitte c, Ebene (u, v), Radius, Breite, Winkel von a0 bis a1;
// lens: Sichel (in der Mitte am breitesten), sonst vorn breit und hell (Schweif)
function fx3Strip(o, c, u, v, r, w, a0, a1, color, op, lens) {
  const pos = o.geometry.attributes.position.array;
  const col = o.geometry.attributes.color.array;
  const cc = new THREE.Color(color);
  for (let i = 0; i <= FX3_STRIP_N; i++) {
    const t = i / FX3_STRIP_N;
    const a = a0 + (a1 - a0) * t;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const ww = lens ? w * Math.sin(Math.PI * t) : w * Math.pow(t, 0.8);
    const br = (lens ? Math.pow(Math.sin(Math.PI * t), 0.6) : 0.25 + 0.75 * t) * op;
    for (let s = 0; s < 2; s++) {
      const rr = s ? r - ww : r;
      const j = (i * 2 + s) * 3;
      pos[j] = c.x + (u.x * ca + v.x * sa) * rr;
      pos[j + 1] = c.y + (u.y * ca + v.y * sa) * rr;
      pos[j + 2] = c.z + (u.z * ca + v.z * sa) * rr;
      const b = s ? br * 0.75 : br;
      col[j] = cc.r * b;
      col[j + 1] = cc.g * b;
      col[j + 2] = cc.b * b;
    }
  }
  o.geometry.attributes.position.needsUpdate = true;
  o.geometry.attributes.color.needsUpdate = true;
  o.material.opacity = 1;
}

// Körpermitte eines Effekts in Einheiten (Schnitte und Treffer liegen auf Höhe des Körpers)
function fx3Body(e, out) {
  if (e.follow) {
    const f = e.follow;
    out.set((f.x + (e.ox || 0)) * U3, Math.max(0.25, -(e.oy || 0) * U3 * 1.4), (feetY(f) + Math.max(0, e.oy || 0)) * U3);
  } else {
    out.set(e.x * U3, 0.65, (e.y + 16) * U3);
  }
  return out;
}

// Bodenpunkt eines Effekts (Pixel) und Höhe über dem Boden (Einheiten)
function fx3Foot(e) {
  if (e.follow) return { x: e.follow.x + (e.ox || 0), z: feetY(e.follow), h: Math.max(0.04, -(e.oy || 0) * U3 * 1.2) };
  return { x: e.x, z: e.y, h: 0.04 };
}

// --- Je Effektart --------------------------------------------------------------------------------
const _x3c = new THREE.Vector3();
const _x3u = new THREE.Vector3();
const _x3v = new THREE.Vector3();
const _x3p = new THREE.Vector3();
const _x3q = new THREE.Vector3();

// Zufallswerte je Effekt einmal festlegen (gleiche Flugbahn in jedem Bild)
function fx3Seed(h, n, make) {
  if (!h.seed) h.seed = Array.from({ length: n }, make);
  return h.seed;
}

const FX3_DRAW = {
  // Funken im Raum: fliegen vom Körper weg, fallen mit Schwerkraft
  sparks3(h, e, k) {
    const n = e.count || 14;
    const sd = fx3Seed(h, n, () => ({ a: Math.random() * Math.PI * 2, up: 0.4 + Math.random() * (e.up || 1.2), sp: (0.6 + Math.random()) * (e.speed || 2.6), s: 0.08 + Math.random() * 0.12 }));
    const t = (game.time - e.start);
    const bx = e.x * U3;
    const bz = (e.y) * U3;
    for (const q of sd) {
      const o = fx3Take(h, 'sprite');
      const x = bx + Math.cos(q.a) * q.sp * t;
      const z = bz + Math.sin(q.a) * q.sp * t * 0.8;
      const y = (e.h || 0.7) + q.up * 3 * t - 4.5 * t * t * (e.grav != null ? e.grav : 1);
      o.position.set(x, Math.max(0.05, y), z);
      const s = q.s * (1 - k * 0.6) * (e.size || 1);
      o.scale.set(s, s, 1);
      fx3Map(o, 'spark');
      fx3Color(o, e.color, 1 - k);
    }
  },
  // Zacken brechen im Kreis aus dem Boden und versinken wieder
  shards3(h, e, k) {
    const n = e.count || 9;
    const r = (e.r || 60) * U3;
    const sd = fx3Seed(h, n, (v, i) => ({ a: (i / n) * Math.PI * 2 + Math.random() * 0.4, d: r * (0.55 + Math.random() * 0.45), hgt: 0.5 + Math.random() * 0.6, tilt: 0.2 + Math.random() * 0.3 }));
    const up = k < 0.25 ? easeOut(k / 0.25) : k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
    for (const q of sd) {
      const o = fx3Take(h, e.glow ? 'coneG' : 'cone');
      const hh = q.hgt * (e.size || 1) * up;
      o.position.set(e.x * U3 + Math.cos(q.a) * q.d, hh / 2 - 0.05, e.y * U3 + Math.sin(q.a) * q.d);
      o.scale.set(0.12 * (e.size || 1), Math.max(0.01, hh), 0.12 * (e.size || 1));
      o.rotation.set(Math.sin(q.a) * q.tilt, 0, -Math.cos(q.a) * q.tilt);
      o.material.color.set(e.color);
      o.material.opacity = e.glow ? 0.9 * (1 - k * 0.5) : 1;
    }
  },
  // Monsterbiss (seit 6.7): Ober- und Unterkiefer als leuchtende Bögen, die über dem Ziel zuschnappen
  bite3(h, e, k) {
    const c = fx3Body(e, _x3c);
    const { r: R, u: Up } = FX3.cam;
    const sz = 0.42 * (e.size || 1);
    const close = easeOut(Math.min(1, k * 3.5));
    const gap = sz * 0.75 * (1 - close) - sz * 0.15;
    const fade = k < 0.45 ? 1 : 1 - (k - 0.45) / 0.55;
    for (const sg of [1, -1]) {
      _x3p.copy(c).addScaledVector(Up, sg * gap);
      const mid = sg * Math.PI / 2;
      const o = fx3Take(h, 'strip');
      fx3Strip(o, _x3p, R, Up, sz, sz * 0.3, mid - 1.15, mid + 1.15, e.color, fade, true);
      const core = fx3Take(h, 'strip');
      fx3Strip(core, _x3p, R, Up, sz - sz * 0.05, sz * 0.1, mid - 1.0, mid + 1.0, '#ffffff', fade, true);
    }
  },
  // Prankenhieb: drei Krallenspuren schräg durch das Ziel, kurz nacheinander
  claw3(h, e, k) {
    const c = fx3Body(e, _x3c);
    const { r: R, u: Up, f: F } = FX3.cam;
    const sz = e.size || 1;
    const ang = e.flip ? -0.95 : 0.95;
    _x3u.copy(R).multiplyScalar(Math.cos(ang)).addScaledVector(Up, -Math.sin(ang)).normalize();
    _x3v.copy(R).multiplyScalar(Math.sin(ang)).addScaledVector(Up, Math.cos(ang)).addScaledVector(F, -0.6).normalize();
    const span = 1.1;
    for (let i = -1; i <= 1; i++) {
      const kk = clamp01((k - (i + 1) * 0.06) / 0.94);
      if (kk <= 0) continue;
      const L = 0.95 * sz * Math.min(1, kk * 5) * (i ? 0.85 : 1);
      const W = 0.1 * sz * (1 - kk * 0.6);
      const rr = Math.max(0.05, L / (2 * Math.sin(span / 2)));
      _x3q.copy(R).multiplyScalar(Math.sin(ang)).addScaledVector(Up, Math.cos(ang));
      _x3p.copy(c).addScaledVector(_x3q, i * 0.16 * sz).addScaledVector(_x3v, -rr * Math.cos(span / 2));
      const fade = 1 - kk;
      const o = fx3Take(h, 'strip');
      fx3Strip(o, _x3p, _x3u, _x3v, rr, W, Math.PI / 2 - span / 2, Math.PI / 2 + span / 2, e.color, fade, true);
      const core = fx3Take(h, 'strip');
      fx3Strip(core, _x3p, _x3u, _x3v, rr - W * 0.2, W * 0.35, Math.PI / 2 - span / 2 + 0.1, Math.PI / 2 + span / 2 - 0.1, '#ffffff', fade, true);
    }
  },
  // Lichtkugeln kreisen aufsteigend um die Figur
  orbs3(h, e, k) {
    const n = e.count || 5;
    const f = e.follow || e;
    const cx = f.x * U3;
    const cz = (e.follow ? feetY(f) : f.y) * U3;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (game.time - e.start) * 5;
      const r = 0.55 * (1 - k * 0.3);
      const o = fx3Take(h, 'sprite');
      o.position.set(cx + Math.cos(a) * r, 0.3 + k * 1.6 + Math.sin(a * 2) * 0.1, cz + Math.sin(a) * r);
      o.scale.set(0.32, 0.32, 1);
      fx3Map(o, 'disc');
      fx3Color(o, e.color, 1 - k);
    }
  },
  // Säule aus Flammen, Licht oder Blut: zwei gedrehte Wände und ein heller Kern
  column3(h, e, k) {
    const f = e.follow || e;
    const x = f.x;
    const z = e.follow ? feetY(f) : f.y;
    const grow = k < 0.2 ? k / 0.2 : 1;
    const ht = (e.hgt || 2.4) * grow;
    const r = (e.r || 30) * U3 * (1 - k * 0.4);
    const outer = fx3Take(h, 'wall');
    fx3Wall(outer, x, z, r, ht);
    fx3Color(outer, e.color, (1 - k) * 0.8);
    const inner = fx3Take(h, 'wall');
    fx3Wall(inner, x, z, r * 0.55, ht * 1.15);
    fx3Color(inner, e.core || '#ffffff', (1 - k) * 0.7);
    const base = fx3Take(h, 'plane');
    fx3Ground(base, x, z, r * 2.4, 0.05, 'disc');
    fx3Color(base, e.color, (1 - k) * 0.7);
  },
  // dunkle Rauchwolken, die sich ausbreiten
  smoke3(h, e, k) {
    const n = e.count || 8;
    const f = e.follow || e;
    const cx = f.x * U3;
    const cz = (e.follow ? feetY(f) : f.y) * U3;
    const sd = fx3Seed(h, n, () => ({ a: Math.random() * Math.PI * 2, d: 0.2 + Math.random() * 0.6, y: 0.2 + Math.random() * 1.0, s: 0.5 + Math.random() * 0.5 }));
    for (const q of sd) {
      const o = fx3Take(h, 'smoke');
      const d = q.d * (0.5 + k);
      o.position.set(cx + Math.cos(q.a) * d, q.y + k * 0.4, cz + Math.sin(q.a) * d * 0.8);
      const s = q.s * (0.6 + k) * (e.size || 1);
      o.scale.set(s, s, 1);
      o.material.color.set(e.color);
      o.material.opacity = 0.7 * (1 - k);
    }
  },

  ring(h, e, k) {
    const f = fx3Foot(e);
    const r = e.r * (e.grow ? 0.3 + 0.9 * k : 0.4 + 0.6 * k) * U3;
    const ground = fx3Take(h, 'plane');
    fx3Ground(ground, f.x, f.z, r * 1.05, f.h, 'ring');
    fx3Color(ground, e.color, (1 - k) * 0.85);
    // niedrige leuchtende Wand: die Schockwelle steht im Raum
    const wall = fx3Take(h, 'wall');
    fx3Wall(wall, f.x, f.z, r, (0.25 + (e.width || 4) * 0.035) * (1 - k * 0.7), f.h);
    fx3Color(wall, e.color, (1 - k) * 0.4);
    if (e.rank >= 0) {
      const shell = fx3Take(h, 'plane');
      fx3Ground(shell, f.x, f.z, r * 1.22, f.h + 0.01, 'ring');
      fx3Color(shell, e.rankColor, (1 - k) * 0.85);
      if (e.rank >= 2) {
        const rune = fx3Take(h, 'plane');
        fx3Ground(rune, f.x, f.z, r * 0.9, f.h + 0.02, 'rune', game.time * 2);
        fx3Color(rune, e.rankColor, (1 - k) * 0.7);
      }
      if (e.rank >= 3) {
        const wall2 = fx3Take(h, 'wall');
        fx3Wall(wall2, f.x, f.z, r * 1.08, 0.9 * (1 - k), f.h);
        fx3Color(wall2, '#ff6a2a', (1 - k) * 0.5);
      }
    }
  },
  runes(h, e, k) {
    const f = fx3Foot(e);
    const o = fx3Take(h, 'plane');
    fx3Ground(o, f.x, f.z, e.r * (0.6 + 0.4 * easeOut(k)) * U3, f.h, 'rune', k * 2);
    fx3Color(o, e.color, 1 - k);
  },
  ultsigil(h, e, k) {
    const f = fx3Foot(e);
    const a = Math.min(1, k * 6) * Math.min(1, (1 - k) * 4);
    const r = e.r * (0.85 + 0.15 * easeOut(Math.min(1, k * 4))) * U3;
    const o = fx3Take(h, 'plane');
    fx3Ground(o, f.x, f.z, r, 0.05, 'rune', (game.time - e.start) * 0.8);
    fx3Color(o, e.color, a);
    const o2 = fx3Take(h, 'plane');
    fx3Ground(o2, f.x, f.z, r * 0.62, 0.06, 'rune', -(game.time - e.start) * 1.3);
    fx3Color(o2, e.color, a * 0.8);
    const glow = fx3Take(h, 'plane');
    fx3Ground(glow, f.x, f.z, r * 1.1, 0.03, 'disc');
    fx3Color(glow, e.color, a * 0.35);
  },
  warn(h, e, k) {
    const f = fx3Foot(e);
    const r = e.r * U3;
    const o = fx3Take(h, 'planeN');
    fx3Ground(o, f.x, f.z, r, 0.05, 'ring', game.time);
    fx3Color(o, e.color, 0.9);
    const fill = fx3Take(h, 'planeN');
    fx3Ground(fill, f.x, f.z, r * Math.max(0.05, k), 0.04, 'disc');
    fx3Color(fill, e.color, 0.5 + 0.2 * Math.sin(game.time * 20));
    if (e.inner) {
      // sicherer Bereich direkt beim Boss
      const safe = fx3Take(h, 'planeN');
      fx3Ground(safe, f.x, f.z, e.inner * U3, 0.06, 'disc');
      fx3Color(safe, '#3aff6a', 0.55);
      const edge = fx3Take(h, 'planeN');
      fx3Ground(edge, f.x, f.z, e.inner * U3 * 1.05, 0.07, 'ring');
      fx3Color(edge, '#7aff8a', 1);
    }
  },
  pillar(h, e, k) {
    const f = fx3Foot(e);
    const ht = 2.6 * easeOut(Math.min(1, k * 2));
    const r = 15 * (1 - k * 0.6) * U3 * 1.2;
    const o = fx3Take(h, 'wall');
    fx3Wall(o, f.x, f.z, r, ht);
    fx3Color(o, e.color, (1 - k) * 0.9);
    const core = fx3Take(h, 'wall');
    fx3Wall(core, f.x, f.z, r * 0.4, ht * 1.1);
    fx3Color(core, '#ffffff', (1 - k) * 0.6);
    const base = fx3Take(h, 'plane');
    fx3Ground(base, f.x, f.z, r * 2.2, 0.04, 'disc');
    fx3Color(base, e.color, (1 - k) * 0.6);
    if (e.rank >= 0) {
      const shell = fx3Take(h, 'wall');
      fx3Wall(shell, f.x, f.z, r * 1.6, ht * 0.8);
      fx3Color(shell, e.rankColor, (1 - k) * 0.5);
    }
  },
  lightbeam(h, e, k) {
    const f = fx3Foot(e);
    const grow = k < 0.12 ? k / 0.12 : 1 - (k - 0.12) / 0.88;
    const o = fx3Take(h, 'wall');
    fx3Wall(o, f.x, f.z, 0.9 * grow + 0.05, 14);
    o.rotation.x = Math.PI; // hell oben (Licht kommt vom Himmel)
    fx3Color(o, '#ffe9a0', grow);
    const base = fx3Take(h, 'plane');
    fx3Ground(base, f.x, f.z, 2.4 * grow + 0.3, 0.04, 'disc');
    fx3Color(base, '#ffe9a0', grow * 0.8);
  },
  ultbeam(h, e, k) {
    const f = fx3Foot(e);
    const a = Math.min(1, k * 8) * (1 - k);
    const w = e.w * (1 - k * 0.5) * U3;
    const o = fx3Take(h, 'wall');
    fx3Wall(o, f.x, f.z, w / 2, 14);
    o.rotation.x = Math.PI;
    fx3Color(o, e.color, a);
    const core = fx3Take(h, 'wall');
    fx3Wall(core, f.x, f.z, w * 0.1, 14);
    core.rotation.x = Math.PI;
    fx3Color(core, '#ffffff', a * 0.8);
    const base = fx3Take(h, 'plane');
    fx3Ground(base, f.x, f.z, w * 1.6, 0.04, 'disc');
    fx3Color(base, e.color, a * 0.8);
  },
  tornado(h, e, k) {
    const f = fx3Foot(e);
    const grow = 0.6 + 0.4 * easeOut(Math.min(1, k * 3));
    for (let i = 0; i < 4; i++) {
      const o = fx3Take(h, 'plane');
      fx3Ground(o, f.x, f.z, e.r * U3 * (1 - i * 0.18) * grow, 0.2 + i * 0.45, 'ring', game.time * 10 + i * 1.7);
      fx3Color(o, e.color, (1 - k) * 0.9);
    }
    const wall = fx3Take(h, 'wall');
    fx3Wall(wall, f.x, f.z, e.r * U3 * 0.55 * grow, 1.8);
    fx3Color(wall, e.color, (1 - k) * 0.35);
  },
  bolt(h, e, k) {
    const a = 1 - k;
    const pts = e.points;
    const z = e.y * U3;
    const top = 8;
    const P = (pt, i, n) => _x3p.set(pt.x * U3, top * (1 - i / n), z + (e.zj ? e.zj[i] : 0));
    if (!e.zj) e.zj = pts.map(() => (Math.random() - 0.5) * 0.6);
    for (let i = 0; i < pts.length - 1; i++) {
      const A = P(pts[i], i, pts.length - 1).clone();
      const B = P(pts[i + 1], i + 1, pts.length - 1).clone();
      const core = fx3Take(h, 'seg');
      fx3Segment(core, A, B, 0.045);
      fx3Color(core, '#ffffff', a);
      const glow = fx3Take(h, 'seg');
      fx3Segment(glow, A, B, 0.16);
      fx3Color(glow, e.color, a * 0.55);
    }
    const flash = fx3Take(h, 'plane');
    fx3Ground(flash, e.x, e.y, 1.4, 0.04, 'disc');
    fx3Color(flash, e.color, a);
  },
  chain(h, e, k) {
    const a = 1 - k;
    let prev = _x3q.set(e.x * U3, 0.7, (e.y + 16) * U3).clone();
    for (let i = 1; i <= 6; i++) {
      const t = i / 6;
      const next = i === 6 ? _x3p.set(e.x2 * U3, 0.7, (e.y2 + 16) * U3).clone()
        : _x3p.set((e.x + (e.x2 - e.x) * t) * U3 + rand(-0.22, 0.22), 0.7 + rand(-0.25, 0.25), (e.y + 16 + (e.y2 - e.y) * t) * U3 + rand(-0.22, 0.22)).clone();
      const core = fx3Take(h, 'seg');
      fx3Segment(core, prev, next, 0.035);
      fx3Color(core, '#ffffff', a);
      const glow = fx3Take(h, 'seg');
      fx3Segment(glow, prev, next, 0.12);
      fx3Color(glow, e.color, a * 0.6);
      prev = next;
    }
  },
  beam(h, e, k) {
    const a = 1 - k;
    const A = fx3Body(e, new THREE.Vector3());
    const t2 = e.follow2;
    const B = t2 ? new THREE.Vector3(t2.x * U3, 0.7, feetY(t2) * U3) : new THREE.Vector3(e.x2 * U3, 0.7, (e.y2 + 16) * U3);
    let prev = A;
    for (let i = 1; i <= 6; i++) {
      const t = i / 6;
      const next = new THREE.Vector3().lerpVectors(A, B, t);
      next.y += Math.sin(Math.PI * t) * 0.7 + Math.sin(game.time * 30 + i) * 0.06;
      const core = fx3Take(h, 'seg');
      fx3Segment(core, prev, next, 0.05);
      fx3Color(core, '#ffffff', a);
      const glow = fx3Take(h, 'seg');
      fx3Segment(glow, prev, next, 0.17);
      fx3Color(glow, e.color, a * 0.6);
      prev = next;
    }
  },
  impact(h, e, k) {
    const c = fx3Body(e, _x3c);
    const s = (e.big ? 26 : 15) * easeOut(k) * U3 * 3.2 + 0.2;
    const o = fx3Take(h, 'sprite');
    o.position.copy(c);
    o.scale.set(s, s, 1);
    o.material.rotation = e.start * 7;
    fx3Map(o, 'spark');
    fx3Color(o, '#ffffff', 1 - k);
    const g = fx3Take(h, 'sprite');
    g.position.copy(c);
    g.scale.set(s * 1.4, s * 1.4, 1);
    fx3Map(g, 'disc');
    fx3Color(g, e.rank >= 0 ? e.rankColor : e.color, (1 - k) * 0.8);
  },
  slash(h, e, k) {
    const c = fx3Body(e, _x3c);
    const L = (e.len || 30) * Math.min(1, k * 5) * U3 * 1.15;
    const W = (e.w || 6) * (1 - k * 0.6) * U3 * 1.3;
    const ang = e.ang || 0;
    const { r: R, u: Up, f: F } = FX3.cam;
    // Richtung der Schnittlinie wie im Bild, die Sichel wölbt sich zur Kamera hin (räumliche Tiefe)
    _x3u.copy(R).multiplyScalar(Math.cos(ang)).addScaledVector(Up, -Math.sin(ang)).normalize();
    _x3v.copy(R).multiplyScalar(Math.sin(ang)).addScaledVector(Up, Math.cos(ang)).addScaledVector(F, -0.9).normalize();
    const span = 1.9;
    const rr = Math.max(0.05, L / (2 * Math.sin(span / 2)));
    _x3p.copy(c).addScaledVector(_x3v, -rr * Math.cos(span / 2));
    // Strip: Punkt = Mitte + (u·cos a + v·sin a)·r → Winkel um π/2 drehen, damit die Wölbung in v liegt
    const a0 = Math.PI / 2 - span / 2;
    const a1 = Math.PI / 2 + span / 2;
    const fade = 1 - k;
    if (e.rank >= 0) {
      const shell = fx3Take(h, 'strip');
      fx3Strip(shell, _x3p, _x3u, _x3v, rr + W * 0.35, W * 2.2, a0, a1, e.rankColor, fade * 0.9, true);
    }
    const o = fx3Take(h, 'strip');
    fx3Strip(o, _x3p, _x3u, _x3v, rr, W, a0, a1, e.color, fade, true);
    const core = fx3Take(h, 'strip');
    fx3Strip(core, _x3p, _x3u, _x3v, rr - W * 0.15, W * 0.35, a0 + 0.1, a1 - 0.1, '#ffffff', fade, true);
  },
  swoosh(h, e, k) {
    const head = e.a0 + (e.a1 - e.a0) * easeOut(Math.min(1, k * 2.2));
    const tail = e.a0 + (head - e.a0) * clamp01((k - 0.12) / 0.88);
    const f = e.follow;
    if (!f) return;
    _x3c.set(f.x * U3, Math.max(0.45, -(e.oy || 0) * U3 * 1.6), feetY(f) * U3);
    _x3u.set(1, 0, 0);
    _x3v.set(0, 0, 1);
    const r = e.r * U3 * 1.25;
    const w = e.width * U3 * 1.3;
    const fade = 1 - k * 0.75;
    if (e.rank >= 0) {
      const shell = fx3Take(h, 'strip');
      fx3Strip(shell, _x3c, _x3u, _x3v, r + w * 0.3, w * 1.8, tail, head, e.rankColor, fade * 0.8, false);
    }
    const o = fx3Take(h, 'strip');
    fx3Strip(o, _x3c, _x3u, _x3v, r, w, tail, head, e.color, fade, false);
    const edge = fx3Take(h, 'strip');
    fx3Strip(edge, _x3c, _x3u, _x3v, r + 0.02, w * 0.18, tail + (head - tail) * 0.4, head, '#ffffff', 1 - k, false);
  }
};

// Leuchtende Geschosse: Lichtkugel und kurzer Schweif im Raum (das gezeichnete Geschoss bleibt darüber)
function fx3Projectiles(h) {
  for (const pr of game.projectiles) {
    if (pr.owner !== 'player' || !v3InView(pr.x, pr.y, 40)) continue;
    const s = (pr.radius || 6) * U3 * 4;
    const o = fx3Take(h, 'sprite');
    o.position.set(pr.x * U3, PROJECTILE_LIFT * U3 * 1.3, pr.y * U3);
    o.scale.set(s, s, 1);
    fx3Map(o, 'disc');
    fx3Color(o, pr.rank >= 0 ? SKILL_RANKS[pr.rank].color : pr.color || '#ffffff', 0.9);
    const tr = pr.trail || [];
    for (let i = 0; i < tr.length; i += 2) {
      const t = tr[i];
      const q = fx3Take(h, 'sprite');
      q.position.set(t.x * U3, PROJECTILE_LIFT * U3 * 1.3, t.y * U3);
      const ss = s * (0.3 + 0.6 * (i / Math.max(1, tr.length)));
      q.scale.set(ss, ss, 1);
      fx3Map(q, 'disc');
      fx3Color(q, pr.color || '#ffffff', 0.5 * (i / Math.max(1, tr.length)));
    }
  }
}

const FX3_PROJ = { parts: [] };
function v3SyncFx() {
  if (!FX3.group) {
    FX3.group = new THREE.Group();
    FX3.cam.r = new THREE.Vector3();
    FX3.cam.u = new THREE.Vector3();
    FX3.cam.f = new THREE.Vector3();
    V3.scene.add(FX3.group);
  }
  const m = V3.camera.matrixWorld.elements;
  FX3.cam.r.set(m[0], m[1], m[2]).normalize();
  FX3.cam.u.set(m[4], m[5], m[6]).normalize();
  FX3.cam.f.set(-m[8], -m[9], -m[10]).normalize();
  // Alles vom letzten Bild zurück in den Vorrat, dann neu verteilen (Effekte leben nur Sekundenbruchteile)
  for (const h of FX3.live) fx3Release(h);
  FX3.live.clear();
  fx3Release(FX3_PROJ);
  for (const e of game.effects) {
    if (!FX3_TYPES.has(e.type)) continue;
    const o = effectOrigin(e);
    if (!v3InView(o.x, o.y, 160)) continue;
    const k = Math.min(1, (game.time - e.start) / e.dur);
    const h = e.__fx3 || (e.__fx3 = { parts: [] });
    FX3_DRAW[e.type](h, e, k);
    FX3.live.add(h);
  }
  fx3Projectiles(FX3_PROJ);
}

// --- Rand der aktuellen Map (seit 6.6) -----------------------------------------------------------
// Um die Map bzw. die Dungeon-Halle, in der man steht, liegt ein Kasten aus Nebel: hohe Wände im Norden,
// Osten und Westen, eine niedrige im Süden (dort steht die Kamera), darüber Deckel. So sieht man die
// Nachbarkarte hinter dem Rand nicht mehr, nur Nebel in der Farbe des Gebiets.
const BOUNDS3 = { key: '', walls: null, mat: null };
function regionRect3(x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  const wm = mapOfTile(tx, ty);
  if (wm) return { r: wm.region, inset: MAP_BORDER - 1, key: 'm' + wm.id };
  if (tx >= WORLD_W && ty < DUNGEON_H) {
    const col = Math.floor((tx - WORLD_W) / DUNGEON_COL);
    const row = Math.floor(ty / DUNGEON_BLOCK);
    return { r: [WORLD_W + col * DUNGEON_COL, row * DUNGEON_BLOCK, DUNGEON_COL, DUNGEON_BLOCK], inset: 1, key: 'd' + col + ':' + row };
  }
  return null;
}
function v3SyncBounds() {
  const p = game.player;
  if (!p || !game.running) return;
  if (!BOUNDS3.walls) {
    BOUNDS3.mat = new THREE.MeshBasicMaterial({ color: 0x000000, fog: false, side: THREE.FrontSide });
    const lidMat = new THREE.MeshBasicMaterial({ color: 0x000000, fog: false, side: THREE.DoubleSide });
    BOUNDS3.lidMat = lidMat;
    BOUNDS3.walls = [];
    for (let k = 0; k < 8; k++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), k < 4 ? BOUNDS3.mat : lidMat);
      m.renderOrder = -1;
      V3.scene.add(m);
      BOUNDS3.walls.push(m);
    }
  }
  // Nebelfarbe übernehmen (wechselt mit dem Gebiet)
  BOUNDS3.mat.color.copy(V3.scene.fog.color);
  BOUNDS3.lidMat.color.copy(V3.scene.fog.color);
  const rr = regionRect3(p.x, p.y);
  const key = rr ? rr.key : '';
  if (key === BOUNDS3.key) return;
  BOUNDS3.key = key;
  for (const w of BOUNDS3.walls) w.visible = !!rr;
  if (!rr) return;
  const [rx, ry, rw, rh] = rr.r;
  const x0 = rx + rr.inset;
  const x1 = rx + rw - rr.inset;
  const z0 = ry + rr.inset;
  const z1 = ry + rh - rr.inset;
  const H = 9;
  const HS = 1.4;
  const FAR = 260;
  const [wn, ws, ww, we, ln, ls, lw, le] = BOUNDS3.walls;
  // Wände: Vorderseite zeigt nach innen (von außen unsichtbar)
  wn.scale.set(x1 - x0 + 2, H + 1, 1); wn.position.set((x0 + x1) / 2, H / 2 - 0.5, z0); wn.rotation.set(0, 0, 0);
  ws.scale.set(x1 - x0 + 2, HS + 1, 1); ws.position.set((x0 + x1) / 2, HS / 2 - 0.5, z1); ws.rotation.set(0, Math.PI, 0);
  ww.scale.set(z1 - z0, H + 1, 1); ww.position.set(x0, H / 2 - 0.5, (z0 + z1) / 2); ww.rotation.set(0, Math.PI / 2, 0);
  we.scale.set(z1 - z0, H + 1, 1); we.position.set(x1, H / 2 - 0.5, (z0 + z1) / 2); we.rotation.set(0, -Math.PI / 2, 0);
  // Deckel über allem außerhalb
  const lid = (m, cx, cz, sx, sz, h) => { m.scale.set(sx, sz, 1); m.position.set(cx, h, cz); m.rotation.set(-Math.PI / 2, 0, 0); };
  lid(ln, (x0 + x1) / 2, z0 - FAR / 2, x1 - x0 + FAR * 2, FAR, H);
  lid(ls, (x0 + x1) / 2, z1 + FAR / 2, x1 - x0 + FAR * 2, FAR, HS);
  lid(lw, x0 - FAR / 2, (z0 + z1) / 2, FAR, z1 - z0, H);
  lid(le, x1 + FAR / 2, (z0 + z1) / 2, FAR, z1 - z0, H);
}
