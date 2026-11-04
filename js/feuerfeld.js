// Feuermagier neu (seit 13.39/13.40): Glutfeld, Feuertornados und ein echter 3D-Phönix.
// Gemeinsame Flammen-Grafik (seit 13.40): Flammenzungen als farbige Bilder mit hellem Kern, oranger Mitte und
// roten Spitzen, in vier Bildern als Daumenkino animiert (flackern statt roter Kleckse). Zielkreis für Glutfeld
// und Feuertornados (Zielen wie beim Blizzard: Kreis erscheint, Ort antippen oder Fertigkeit nochmal drücken).
// Ablauf je Zauber wie in magier-neu.js: SKILL_TYPES (eigener Spieler), MAGE2_REMOTE (Mitspieler: nur Bild),
// EXTRA_EFFECTS (2D) und FX3_DRAW (3D).

// --- Flammen-Bilder -------------------------------------------------------------------------------------
const FIRE_TEX = [];
function fireTex(f) {
  if (FIRE_TEX[f]) return FIRE_TEX[f];
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d');
  // Grundglut unten
  const base = g.createRadialGradient(32, 112, 2, 32, 108, 30);
  base.addColorStop(0, 'rgba(255,240,190,0.9)');
  base.addColorStop(0.5, 'rgba(255,150,40,0.45)');
  base.addColorStop(1, 'rgba(255,90,20,0)');
  g.fillStyle = base;
  g.fillRect(0, 70, 64, 58);
  // Zungen: Mitte groß, zwei kleinere seitlich; Spitzen wiegen je Bild anders
  const sway = [0, 1, 0, -1][f];
  const tongue = (cx, top, w, bend, cols) => {
    const grad = g.createLinearGradient(0, 124, 0, top);
    cols.forEach(([s, col]) => grad.addColorStop(s, col));
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(cx - w, 120);
    g.bezierCurveTo(cx - w * 1.15, 92, cx - w * 0.35 + bend * 0.4, top + 36, cx + bend, top);
    g.bezierCurveTo(cx + w * 0.4 + bend * 0.5, top + 40, cx + w * 1.2, 94, cx + w, 120);
    g.quadraticCurveTo(cx, 128, cx - w, 120);
    g.fill();
  };
  const outer = [[0, '#ffe9a0'], [0.22, '#ffb23a'], [0.5, '#ff6a1a'], [0.8, '#d0280c'], [1, 'rgba(140,16,4,0)']];
  const inner = [[0, '#ffffff'], [0.3, '#fff2b0'], [0.7, '#ffc040'], [1, 'rgba(255,150,40,0)']];
  tongue(18 + sway, 46 + f * 3, 9, -6 + sway * 3, outer);
  tongue(46 + sway, 40 - f * 2, 9, 6 + sway * 3, outer);
  tongue(32, 6 + (f % 2) * 6, 17, sway * 5, outer);
  tongue(32, 44 + (f % 2) * 4, 9, sway * 3, inner);
  const t = new THREE.CanvasTexture(c);
  FIRE_TEX[f] = t;
  return t;
}
// eine flackernde Flamme: (x, yBase, z) Fußpunkt in 3D-Einheiten, w Breite, hh Höhe
function fire3(h, x, yBase, z, w, hh, t, seed, op, rot = 0) {
  if (op <= 0.01 || hh <= 0.01) return null;
  const f = Math.floor(t * 13 + seed * 3.7) & 3;
  const kind = 'fireN' + f;
  const o = fx3Take(h, kind);
  if (!o.userData.fireInit) {
    o.userData.fireInit = true;
    o.material.blending = THREE.NormalBlending;
    o.material.map = fireTex(f);
    o.material.needsUpdate = true;
  }
  const fl = 1 + 0.08 * Math.sin(t * 17 + seed * 5);
  o.position.set(x, yBase + hh * 0.5 * fl, z);
  o.scale.set(w * (1.04 - 0.08 * Math.sin(t * 13 + seed)), hh * fl, 1);
  o.material.rotation = rot;
  o.material.color.set('#ffffff');
  o.material.opacity = Math.min(1, op);
  return o;
}
// kleiner Funke (additiv)
function ember3(h, x, y, z, s, op, hot) {
  return n3Glow(h, x, y, z, s, hot ? FIRE3.core : FIRE3.hot, op);
}

// --- Glutfeld --------------------------------------------------------------------------------------------
SKILL_TYPES.mfield = function (sk, pw) {
  const p = game.player;
  const pt = skillAimPoint(sk);
  faceTowards(pt.x, pt.y);
  lockPlayer(p, 0.3);
  input.walkTo = null;
  const x = Math.round(pt.x);
  const y = Math.round(pt.y);
  fieldFx(p, x, y, sk, true, pw);
  return { tx: x, ty: y };
};
function fieldDur(sk) {
  return sk.delay + sk.ticks * sk.every + 0.6;
}
function fieldFx(owner, x, y, sk, local, pw) {
  addEffect({ type: 'mfield3', x, y, R: sk.radius, delay: sk.delay, every: sk.every, ticks: sk.ticks, seed: Math.floor(Math.random() * 1000), dur: fieldDur(sk) });
  if (!local) return;
  for (let k = 0; k < sk.ticks; k++) {
    later(sk.delay + k * sk.every, () => {
      const last = k === sk.ticks - 1;
      for (const m of enemiesInCircle(x, y, sk.radius)) {
        // seit 13.69 betäubt jeder Puls kurz (sk.stun): Flammensäulen werfen die Gegner aus dem Tritt
        hitMonster(m, sk.dmg * pw, { skill: sk.id, burn: last ? sk.burn : null, stun: sk.stun, vfxColor: '#ff8a4a' });
      }
      if (k === 0 && owner === game.player) shakeScreen(2.5);
    });
  }
}
MAGE2_REMOTE.mfield = (rp, sk, d) => fieldFx(rp, d.tx ?? rp.x, d.ty ?? rp.y, sk, false, 0);

// Wo und wann die Feuersäulen aus dem Boden schlagen: je Puls drei bis vier Stellen im Kreis
function fieldBursts(e) {
  if (e._bursts) return e._bursts;
  const out = [];
  for (let k = 0; k < e.ticks; k++) {
    const n = 3 + ((k + e.seed) % 2);
    for (let i = 0; i < n; i++) {
      const s = e.seed + k * 7 + i;
      const a = n2h(s, 1) * Math.PI * 2;
      const d = Math.sqrt(n2h(s, 2)) * e.R * 0.78;
      out.push({ at: e.delay + k * e.every + n2h(s, 3) * e.every * 0.6, x: e.x + Math.cos(a) * d, y: e.y + Math.sin(a) * d, big: n2h(s, 4), s });
    }
  }
  e._bursts = out;
  return out;
}

EXTRA_EFFECTS.mfield3 = (ctx, e, k, x, y) => {
  const t = game.time - e.start;
  const on = clamp01(t / Math.max(0.05, e.delay));
  const out = clamp01((e.dur - t) / 0.5);
  ctx.save();
  ctx.globalAlpha = 0.5 * on * out;
  const g = ctx.createRadialGradient(x, y, 2, x, y, e.R);
  g.addColorStop(0, 'rgba(255,200,90,0.8)');
  g.addColorStop(0.6, 'rgba(255,90,20,0.5)');
  g.addColorStop(1, 'rgba(120,20,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, e.R, e.R * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

FX3_TYPES.add('mfield3');
FX3_DRAW.mfield3 = function (h, e) {
  const t = game.time - e.start;
  const low = n3low();
  const on = clamp01(t / Math.max(0.05, e.delay));
  const out = clamp01((e.dur - t) / 0.55);
  const vis = on * out;
  const R = e.R * U3;
  const cx = e.x * U3;
  const cz = e.y * U3;
  // Rand zeigt das Feld: heller Ring, der beim Aufreißen nach außen läuft und dann ruhig glimmt
  const ringK = clamp01(t / 0.35);
  mGround(h, 'planeNFire', 'ring', e.x, e.y, R * (0.4 + 0.62 * easeOut(ringK)), 0.05, 0, '#ffb04a', (1 - ringK * 0.55) * out, true);
  // verbrannter Boden mit Glutrissen (deckend, damit es auch auf hellem Pflaster kräftig bleibt)
  const grow = 0.3 + 0.7 * easeOut(on);
  mGround(h, 'planeNScorch', 'disc', e.x, e.y, R * 1.08 * grow, 0.026, 0, '#2a0604', 0.75 * vis, true);
  mGround(h, 'planeCrk', 'mcracks', e.x, e.y, R * 0.98 * grow, 0.045, e.seed * 0.1, '#ff8a2a', 0.95 * vis);
  mGround(h, 'planeCrk', 'mcracks', e.x, e.y, R * 0.55 * grow, 0.05, -e.seed * 0.07, '#ffe08a', 0.75 * vis);
  if (vis <= 0.01) return;
  // Flammenkranz am Rand: echte Flammenzungen, die ringsum lodern
  const ring = low ? 10 : 18;
  for (let i = 0; i < ring; i++) {
    const a = (i / ring) * Math.PI * 2 + e.seed;
    const hh = (0.75 + 0.35 * n2h(i, 5)) * vis * (0.85 + 0.15 * Math.sin(t * 7 + i));
    fire3(h, cx + Math.cos(a) * R * 0.95, 0.02, cz + Math.sin(a) * R * 0.95, hh * 0.55, hh, t, i, 0.95 * vis);
  }
  // Feuersäulen: schießen hoch, lodern und sinken in Funken zusammen
  for (const b of fieldBursts(e)) {
    const age = t - b.at;
    if (age < 0 || age > 0.8) continue;
    const u = age / 0.8;
    const rise = u < 0.2 ? easeOut(u / 0.2) : 1 - ((u - 0.2) / 0.8) * 0.75;
    const H = (1.8 + 1.1 * b.big) * rise;
    const x = b.x * U3;
    const z = b.y * U3;
    const op = 1 - Math.max(0, u - 0.6) / 0.4;
    fire3(h, x, 0, z, H * 0.48, H, t, b.s, op);
    if (!low) {
      fire3(h, x - 0.22, 0, z + 0.1, H * 0.3, H * 0.6, t + 0.3, b.s + 1, op * 0.9);
      fire3(h, x + 0.24, 0, z - 0.08, H * 0.28, H * 0.55, t + 0.6, b.s + 2, op * 0.9);
    }
    n3Glow(h, x, 0.15, z, 1.6 + b.big, FIRE3.hot, 0.55 * op);
    const sp = low ? 3 : 7;
    for (let j = 0; j < sp; j++) {
      const ja = n2h(j, b.s) * Math.PI * 2;
      const jr = 0.15 + 0.5 * u * n2h(j, b.s + 3);
      ember3(h, x + Math.cos(ja) * jr, H * 0.7 + u * 1.8 + j * 0.1, z + Math.sin(ja) * jr, 0.12, 0.95 * (1 - u), j % 2);
    }
  }
  // Glut steigt über dem ganzen Feld auf
  const em = low ? 6 : 16;
  for (let i = 0; i < em; i++) {
    const ph = ((t * 0.9 + n2h(i, 8)) % 1);
    const a = n2h(i, 9) * Math.PI * 2;
    const d = Math.sqrt(n2h(i, 10)) * R * 0.9;
    ember3(h, cx + Math.cos(a) * d + Math.sin(t * 3 + i) * 0.1, 0.1 + ph * 2.2, cz + Math.sin(a) * d, 0.1 + 0.07 * (1 - ph), 0.9 * (1 - ph) * vis, i % 3 === 0);
  }
};

// --- Feuertornados (seit 13.40, statt Flammenkreis) ----------------------------------------------------
// Im gewählten Kreis wirbeln Feuertornados umher, ziehen Gegner leicht an und treffen alles, was sie berühren.
// Zahl der Tornados wächst mit der Fertigkeit: Stufe 1–7: 2, 8–15: 3, E: 4, H: 5, L: 6, V: 7.
function tornadoCount(lvl) {
  const r = typeof skillRank === 'function' ? skillRank(lvl) : -1;
  if (r >= 0) return 4 + r;
  return lvl >= 8 ? 3 : 2;
}
// Weg eines Tornados (für Treffer und Bild gleich): Schleifen im Feld, nie über den Rand
function tornadoPos(e, i, t) {
  const a0 = n2h(e.seed + i, 1) * Math.PI * 2;
  const w = 0.7 + n2h(e.seed + i, 2) * 0.6;
  const r = e.R * (0.25 + 0.45 * (0.5 + 0.5 * Math.sin(t * w * 1.3 + i * 2.1)));
  const a = a0 + t * w * (i % 2 ? 1 : -1);
  return { x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r };
}
SKILL_TYPES.mtornado = function (sk, pw, lvl) {
  const p = game.player;
  const pt = skillAimPoint(sk);
  faceTowards(pt.x, pt.y);
  lockPlayer(p, 0.35);
  input.walkTo = null;
  const x = Math.round(pt.x);
  const y = Math.round(pt.y);
  const n = tornadoCount(lvl);
  const seed = Math.floor(Math.random() * 1000);
  tornadoFx(p, x, y, sk, n, seed, true, pw);
  return { tx: x, ty: y, n, sd: seed };
};
function tornadoFx(owner, x, y, sk, n, seed, local, pw) {
  const e = addEffect({ type: 'mtornado3', x, y, R: sk.radius, n, seed, delay: sk.delay, life: sk.life, dur: sk.delay + sk.life + 0.6 });
  if (owner === game.player) shakeScreen(2);
  if (!local) return;
  const ticks = Math.round(sk.life / sk.every);
  for (let k = 0; k < ticks; k++) {
    later(sk.delay + k * sk.every, () => {
      const tt = k * sk.every;
      const last = k === ticks - 1;
      for (let i = 0; i < n; i++) {
        const c = tornadoPos(e, i, tt);
        for (const m of enemiesInCircle(c.x, c.y, sk.hitR)) {
          hitMonster(m, sk.dmg * pw, { skill: sk.id, burn: last || k % 3 === 2 ? sk.burn : null, vfxColor: '#ffb04a' });
          // leichter Sog zur Mitte des Tornados (nicht bei Steinen und Bossen)
          if (!m.isStone && !(m.type && (m.type.boss || m.type.raid))) {
            m.x += (c.x - m.x) * 0.18;
            m.y += (c.y - m.y) * 0.18;
          }
        }
      }
    });
  }
}
MAGE2_REMOTE.mtornado = (rp, sk, d) => tornadoFx(rp, d.tx ?? rp.x, d.ty ?? rp.y, sk, d.n || 2, d.sd || 1, false, 0);

EXTRA_EFFECTS.mtornado3 = (ctx, e, k, x, y) => {
  const t = game.time - e.start - e.delay;
  if (t < 0 || t > e.life) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < e.n; i++) {
    const c = tornadoPos(e, i, t);
    glow2(ctx, x + (c.x - e.x), y + (c.y - e.y) * 0.7 - 20, 18, '#ff8a2a', 0.7);
  }
  ctx.restore();
};

// Trichter des Tornados (seit 13.40): offener Kegel mit schräg laufenden Flammenbahnen, dreht sich und die
// Flammen steigen auf (Bildverschiebung); außen deckend, innen ein heller, leuchtender zweiter Kegel
let TORN_TEX = null;
function tornTex() {
  if (TORN_TEX) return TORN_TEX;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  for (let i = 0; i < 9; i++) {
    const x0 = i * 16 - 40;
    const w = 6 + (i % 3) * 3;
    const grad = g.createLinearGradient(0, 256, 0, 0);
    grad.addColorStop(0, 'rgba(255,240,180,0.95)');
    grad.addColorStop(0.3, 'rgba(255,170,50,0.9)');
    grad.addColorStop(0.7, 'rgba(240,80,20,0.75)');
    grad.addColorStop(1, 'rgba(160,24,6,0.15)');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(x0, 256);
    g.bezierCurveTo(x0 + 30, 180, x0 + 50, 90, x0 + 90, 0);
    g.lineTo(x0 + 90 + w, 0);
    g.bezierCurveTo(x0 + 52 + w, 92, x0 + 34 + w, 182, x0 + w * 1.6, 256);
    g.closePath();
    g.fill();
    // nach rechts verschoben ein zweites Mal, damit die Bahnen nahtlos umlaufen
    g.save();
    g.translate(128, 0);
    g.fill();
    g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 1);
  TORN_TEX = t;
  return t;
}
// eigene Körper aus dem Effekt-Vorrat (wie fx3Take, aber mit eigener Form)
function fx3Own(h, kind, make) {
  const pool = FX3.pools[kind] || (FX3.pools[kind] = []);
  let o = pool.pop();
  if (!o) {
    o = make();
    o.userData.kind = kind;
    o.renderOrder = 5;
    FX3.group.add(o);
  }
  o.visible = true;
  h.parts.push(o);
  return o;
}
function tornCone(h, glow) {
  return fx3Own(h, glow ? 'tornConeG' : 'tornCone', () => new THREE.Mesh(
    new THREE.CylinderGeometry(1, 0.2, 1, 28, 4, true),
    new THREE.MeshBasicMaterial({ map: tornTex(), transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide,
      blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending, fog: false })
  ));
}

FX3_TYPES.add('mtornado3');
FX3_DRAW.mtornado3 = function (h, e) {
  const T = game.time - e.start;
  const low = n3low();
  const out = clamp01((e.dur - T) / 0.6);
  const t = T - e.delay;
  // Feldrand: Ring läuft beim Wirken auf, danach glimmt der Kreis schwach
  const ringK = clamp01(T / 0.4);
  mGround(h, 'planeNFire', 'ring', e.x, e.y, e.R * U3 * (0.3 + 0.7 * easeOut(ringK)), 0.05, 0, '#ffb04a', (1 - ringK * 0.6) * out, true);
  mGround(h, 'planeNScorch', 'disc', e.x, e.y, e.R * U3 * 1.05, 0.026, 0, '#2a0604', 0.45 * out * clamp01(T / 0.5), true);
  if (t < 0) return;
  const grow = easeOut(clamp01(t / 0.45));
  const fade = clamp01((e.life - t) / 0.5);
  const vis = grow * fade;
  for (let i = 0; i < e.n; i++) {
    const c = tornadoPos(e, i, t);
    const x = c.x * U3;
    const z = c.y * U3;
    // Bodenglut unter dem Tornado
    mGround(h, 'planeGlowF', 'disc', c.x, c.y, 0.9 * vis, 0.04, 0, '#ff6a1a', 0.55 * vis);
    // Trichter: zwei Kegel (außen deckend, innen leuchtend), drehen sich, Flammenbahnen steigen auf
    const H = 3.2 * vis;
    const top = 1.25 * vis;
    const wob = Math.sin(t * 3 + i) * 0.15;
    const outer = tornCone(h, false);
    outer.position.set(x + wob, H * 0.5, z);
    outer.scale.set(top, H, top);
    outer.rotation.set(0, -t * (7 + i), wob * 0.4);
    outer.material.opacity = 0.9 * fade;
    const inner = tornCone(h, true);
    inner.position.set(x + wob * 0.8, H * 0.48, z);
    inner.scale.set(top * 0.72, H * 0.96, top * 0.72);
    inner.rotation.set(0, -t * (10 + i) + 1, wob * 0.4);
    inner.material.opacity = 0.75 * fade;
    TORN_TEX.offset.y = -t * 0.9;
    // Flammen am Fuß, wo der Wirbel den Boden aufreißt
    const fb = low ? 3 : 5;
    for (let j = 0; j < fb; j++) {
      const a = t * 8 + (j / fb) * Math.PI * 2 + i;
      fire3(h, x + Math.cos(a) * 0.45 * vis, 0, z + Math.sin(a) * 0.45 * vis, 0.5 * vis, 0.9 * vis, t + j, i * 5 + j, 0.95 * fade);
    }
    // heller Kern unten und Funken, die nach oben aus dem Trichter fliegen
    n3Glow(h, x, 0.5, z, 1.2 * vis, FIRE3.core, 0.6 * vis);
    n3Glow(h, x, 1.4 * vis, z, 1.6 * vis, FIRE3.main, 0.35 * vis);
    const sp = low ? 4 : 9;
    for (let j = 0; j < sp; j++) {
      const ph = (t * 0.8 + n2h(j, i)) % 1;
      const a = t * 6 + j * 0.9;
      const rr = 0.3 + ph * 1.3;
      ember3(h, x + Math.cos(a) * rr, ph * H * 1.15, z + Math.sin(a) * rr, 0.11, 0.9 * (1 - ph) * vis, j % 2);
    }
    if (!low) {
      const ph = (t * 0.5 + i * 0.3) % 1;
      n3Smoke(h, x, H + ph * 1.2, z, 1.2 + ph, '#2e2420', 0.3 * (1 - ph) * vis);
    }
  }
};

// --- Phönixflamme in 3D (seit 13.40) ---------------------------------------------------------------------
// Ein echter Feuervogel: flache Flügel aus Flammenfedern, die schlagen, Körper mit Kopf und Schnabel, ein langer
// Flammenschweif, eine Flammenspur hinter ihm. Am Ziel stürzt er herab, breitet die Flügel und vergeht in einem
// Feuersturm. Formen als gemalte Flächen (Flügel, Körper, Schweif) mit additivem Leuchten darüber.
const PHX_TEX = {};
function phxTex(kind) {
  if (PHX_TEX[kind]) return PHX_TEX[kind];
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  if (kind === 'wing') {
    // Flügel: links Ansatz, rechts Spitze; Vorderkante unten, Schwungfedern oben (zeigen nach hinten).
    // Eine geschlossene Flügelform mit gewellter Hinterkante, darin Federlinien und ein heller Kern am Ansatz.
    c.width = 256;
    c.height = 128;
    const fill = g.createLinearGradient(0, 0, 256, 0);
    fill.addColorStop(0, '#fff6d0');
    fill.addColorStop(0.3, '#ffcf4a');
    fill.addColorStop(0.65, '#ff7a1a');
    fill.addColorStop(1, '#d0280c');
    g.fillStyle = fill;
    g.beginPath();
    g.moveTo(0, 126);
    g.quadraticCurveTo(120, 110, 254, 92);
    // Hinterkante von der Spitze zurück zum Ansatz: runde Federenden (Bögen nach hinten), außen länger
    const tips = 8;
    let px = 254;
    for (let i = 0; i < tips; i++) {
      const v = 1 - (i + 1) / tips;
      const nx = 254 * v;
      const baseY = 30 + v * 10 + (1 - v) * 26;
      g.quadraticCurveTo((px + nx) / 2, baseY - 26, nx, baseY);
      px = nx;
    }
    g.lineTo(0, 60);
    g.closePath();
    g.fill();
    // Federlinien (dunkler) von der Vorderkante zu den Spitzen
    g.strokeStyle = 'rgba(160,30,6,0.55)';
    g.lineWidth = 2;
    for (let i = 0; i < tips; i++) {
      const v = 1 - (i + 0.5) / tips;
      const x = 254 * v;
      g.beginPath();
      g.moveTo(x * 0.9, 118 - v * 18);
      g.quadraticCurveTo(x, 70, x + 6, 20 + (1 - v) * 16);
      g.stroke();
    }
    // helle Deckfedern an der Vorderkante
    const edge = g.createLinearGradient(0, 0, 256, 0);
    edge.addColorStop(0, 'rgba(255,255,255,1)');
    edge.addColorStop(0.6, 'rgba(255,230,150,0.9)');
    edge.addColorStop(1, 'rgba(255,150,60,0.6)');
    g.fillStyle = edge;
    g.beginPath();
    g.moveTo(0, 126);
    g.quadraticCurveTo(120, 110, 254, 92);
    g.quadraticCurveTo(140, 100, 0, 100);
    g.closePath();
    g.fill();
    const core = g.createRadialGradient(20, 112, 2, 20, 112, 70);
    core.addColorStop(0, 'rgba(255,255,255,0.95)');
    core.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = core;
    g.fillRect(0, 40, 100, 88);
  } else if (kind === 'body') {
    // Körper von oben: Kopf unten (vorn), Hals, Brust, nach hinten (oben) schmaler
    c.width = 128;
    c.height = 256;
    const fill = g.createLinearGradient(0, 256, 0, 0);
    fill.addColorStop(0, '#fff6d0');
    fill.addColorStop(0.3, '#ffd050');
    fill.addColorStop(0.7, '#ff7a1a');
    fill.addColorStop(1, 'rgba(200,32,10,0)');
    g.fillStyle = fill;
    g.beginPath();
    g.moveTo(64, 250);
    g.bezierCurveTo(90, 236, 92, 200, 76, 186);
    g.bezierCurveTo(108, 160, 106, 100, 78, 40);
    g.quadraticCurveTo(64, 0, 50, 40);
    g.bezierCurveTo(22, 100, 20, 160, 52, 186);
    g.bezierCurveTo(36, 200, 38, 236, 64, 250);
    g.fill();
    // Kamm am Kopf und Schnabel
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(64, 256);
    g.lineTo(58, 238);
    g.lineTo(70, 238);
    g.closePath();
    g.fill();
    g.fillStyle = '#ffb23a';
    for (const dx of [-14, 0, 14]) {
      g.beginPath();
      g.moveTo(64 + dx * 0.4, 214);
      g.quadraticCurveTo(64 + dx * 1.4, 196, 64 + dx * 2.2, 176);
      g.quadraticCurveTo(64 + dx * 0.6, 196, 64 + dx * 0.4 + 6, 214);
      g.fill();
    }
    // Augen
    g.fillStyle = '#7a1a06';
    g.beginPath();
    g.arc(56, 226, 3.2, 0, Math.PI * 2);
    g.arc(72, 226, 3.2, 0, Math.PI * 2);
    g.fill();
  } else {
    // Schweif: drei lange, wehende Flammenbänder, vorn (unten) breit und hell
    c.width = 128;
    c.height = 256;
    for (const [dx, w, a] of [[-26, 18, -0.3], [26, 18, 0.3], [0, 26, 0]]) {
      const fill = g.createLinearGradient(0, 256, 0, 0);
      fill.addColorStop(0, '#ffe9a0');
      fill.addColorStop(0.35, '#ff9a2a');
      fill.addColorStop(0.75, '#e0400e');
      fill.addColorStop(1, 'rgba(160,20,6,0)');
      g.fillStyle = fill;
      g.beginPath();
      g.moveTo(64 - w * 0.6, 256);
      g.bezierCurveTo(64 - w + dx * 0.3, 180, 64 + dx * 1.2 - w * 0.5, 80, 64 + dx * 1.6 + a * 30, 4);
      g.bezierCurveTo(64 + dx * 1.2 + w * 0.5, 80, 64 + w + dx * 0.3, 180, 64 + w * 0.6, 256);
      g.closePath();
      g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  PHX_TEX[kind] = t;
  return t;
}
const _phM = new THREE.Matrix4();
const _phX = new THREE.Vector3();
const _phY = new THREE.Vector3();
const _phZ = new THREE.Vector3();
// gemalte Fläche: Mitte (x,y,z), Breitenrichtung X und Längsrichtung Y (Einheitsvektoren), halbe Maße
function phxPlane(h, kind, tex, x, y, z, X, Y, hw, hl, op, glow) {
  const o = fx3Take(h, kind);
  if (!o.userData.phxInit) {
    o.userData.phxInit = true;
    if (!glow) o.material.blending = THREE.NormalBlending;
    o.material.map = phxTex(tex);
    o.material.needsUpdate = true;
  }
  _phX.copy(X);
  _phY.copy(Y);
  _phZ.crossVectors(_phX, _phY).normalize();
  _phM.makeBasis(_phX, _phY, _phZ);
  o.quaternion.setFromRotationMatrix(_phM);
  o.rotation.setFromQuaternion(o.quaternion);
  o.position.set(x, y, z);
  o.scale.set(hw, hl, 1);
  o.material.color.set('#ffffff');
  o.material.opacity = Math.min(1, op);
  return o;
}

FX3_DRAW.mphoenix3 = function (h, e) {
  const t = game.time - e.start;
  const low = n3low();
  const x0 = e.x0 * U3;
  const z0 = e.y0 * U3;
  const x1 = e.x1 * U3;
  const z1 = e.y1 * U3;
  const dx = x1 - x0;
  const dz = z1 - z0;
  const L = Math.hypot(dx, dz) || 1;
  const fx = dx / L;
  const fz = dz / L;
  // Bahn: steigt aus dem Zepter auf, gleitet hoch und stürzt am Ende herab
  const yAt = (v) => 0.9 + Math.sin(Math.min(1, v) * Math.PI * 0.8) * 1.7 - Math.pow(Math.max(0, v - 0.72) / 0.28, 2) * 1.9;
  const u = Math.min(1, t / e.fly);
  if (t <= e.fly + 0.05) {
    const x = x0 + dx * u;
    const z = z0 + dz * u;
    const y = yAt(u);
    // Neigung: beim Sturz nach vorn unten
    const dive = u > 0.72 ? (u - 0.72) / 0.28 : 0;
    const fwd = new THREE.Vector3(fx, -0.9 * dive, fz).normalize();
    const back = fwd.clone().negate();
    const side = new THREE.Vector3(-fz, 0, fx);
    const up = new THREE.Vector3().crossVectors(side, fwd).normalize();
    const flap = Math.sin(t * 11);
    const span = 2.4 * (1 + 0.15 * Math.min(1, t * 3));
    const grow = clamp01(t / 0.18);
    // Leuchten unter dem Vogel und auf dem Boden
    n3Glow(h, x, y, z, 3.4 * grow, FIRE3.main, 0.35);
    mGround(h, 'planeGlowF', 'disc', x / U3, z / U3, 1.6 * grow, 0.04, 0, '#ff7a1a', 0.35 * clamp01(1 - y / 4));
    // Flügel: Ansatz an der Schulter, schlagen um die Körperachse
    for (const s of [-1, 1]) {
      const ang = (0.32 + flap * 0.5) * (dive ? 0.5 : 1) + dive * -0.2;
      const X = side.clone().multiplyScalar(s * Math.cos(ang)).addScaledVector(up, Math.sin(ang)).normalize();
      const hw = span * 0.5 * grow;
      const cxw = x + X.x * hw + back.x * 0.15;
      const cyw = y + X.y * hw;
      const czw = z + X.z * hw + back.z * 0.15;
      phxPlane(h, 'planeNPhxW', 'wing', cxw, cyw, czw, X, back, hw, 0.9 * grow, 1);
      if (!low) phxPlane(h, 'planePhxWG', 'wing', cxw, cyw + 0.02, czw, X, back, hw * 1.04, 0.95 * grow, 0.3, true);
      // Flammen an den Flügelspitzen
      fire3(h, x + X.x * hw * 2, cyw + X.y * hw, z + X.z * hw * 2, 0.5, 0.8, t, s + 3, 0.9);
    }
    // Schweif hinter dem Körper, wehend
    const sway = Math.sin(t * 6) * 0.15;
    const tailBack = back.clone().add(side.clone().multiplyScalar(sway)).normalize();
    phxPlane(h, 'planeNPhxT', 'tail', x + tailBack.x * 1.35, y + tailBack.y * 1.35 - 0.05, z + tailBack.z * 1.35, side, tailBack, 0.55 * grow, 1.15 * grow, 0.95);
    // Körper mit Kopf vorn
    phxPlane(h, 'planeNPhxB', 'body', x + fwd.x * 0.25, y + 0.05, z + fwd.z * 0.25, side, back, 0.38 * grow, 0.78 * grow, 1);
    if (!low) phxPlane(h, 'planePhxBG', 'body', x + fwd.x * 0.25, y + 0.07, z + fwd.z * 0.25, side, back, 0.44 * grow, 0.86 * grow, 0.55, true);
    n3Glow(h, x + fwd.x * 0.2, y + 0.15, z + fwd.z * 0.2, 0.7, FIRE3.core, 0.85);
    // Körper als lodernde Flamme (zur Kamera gedreht), Kopf mit Federkamm vorn
    fire3(h, x - fwd.x * 0.1, y - 0.45, z - fwd.z * 0.1, 0.75, 1.15, t, 21, 0.95);
    fire3(h, x + fwd.x * 0.65, y - 0.05, z + fwd.z * 0.65, 0.42, 0.7, t + 0.4, 22, 0.95);
    n3Glow(h, x + fwd.x * 0.7, y + 0.2, z + fwd.z * 0.7, 0.35, '#ffffff', 0.9);
    // Flammenspur entlang der Bahn
    const trail = low ? 6 : 12;
    for (let i = 1; i <= trail; i++) {
      const v = u - i * 0.03;
      if (v <= 0) break;
      const k = 1 - i / (trail + 1);
      fire3(h, x0 + dx * v, yAt(v) - 0.4, z0 + dz * v, 0.6 * k + 0.15, 0.9 * k + 0.2, t + i * 0.2, i, 0.8 * k);
      if (!low && i % 2) ember3(h, x0 + dx * v + Math.sin(t * 9 + i) * 0.3, yAt(v) + 0.2 + i * 0.05, z0 + dz * v, 0.12, 0.9 * k, i % 4 === 1);
    }
    // Start: Feuerstoß aus dem Zepter
    if (t < 0.3) {
      const k = 1 - t / 0.3;
      for (let i = 0; i < 6; i++) {
        const a = i * 1.05;
        fire3(h, x0 + Math.cos(a) * 0.4 * (1 - k), 0.8, z0 + Math.sin(a) * 0.4 * (1 - k), 0.5, 0.9 * k + 0.2, t, i, k);
      }
    }
  } else {
    // Einschlag: Flügel breiten sich als Feuersturm aus, Säule steigt auf, Glut regnet
    const v = (t - e.fly) / 0.85;
    if (v > 1) return;
    const k = 1 - v;
    const R = 0.6 + v * 2.4;
    const n = low ? 10 : 18;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      fire3(h, x1 + Math.cos(a) * R, 0, z1 + Math.sin(a) * R, 0.7 * k + 0.2, (1.4 + 0.6 * n2h(i, 3)) * k, t, i, k);
    }
    fire3(h, x1, 0, z1, 1.6 * k + 0.4, 4.2 * (1 - v * 0.6), t, 9, k);
    n3Glow(h, x1, 0.8, z1, 5 * (0.4 + v), FIRE3.hot, 0.55 * k);
    // Flügelbild am Boden: zwei Flügel aus Feuer breiten sich aus und verglühen
    const side = new THREE.Vector3(-fz, 0, fx);
    const back = new THREE.Vector3(-fx, 0, -fz);
    const upv = new THREE.Vector3(0, 1, 0);
    for (const s of [-1, 1]) {
      const X = side.clone().multiplyScalar(s).addScaledVector(upv, 0.25).normalize();
      const hw = 1.4 + v * 1.6;
      phxPlane(h, 'planeNPhxW', 'wing', x1 + X.x * hw, 0.3 + X.y * hw, z1 + X.z * hw, X, back, hw, 0.8, k);
    }
    const sp = low ? 8 : 18;
    for (let i = 0; i < sp; i++) {
      const a = n2h(i, 4) * Math.PI * 2;
      const r = v * (1.5 + 2.5 * n2h(i, 5));
      ember3(h, x1 + Math.cos(a) * r, 0.3 + Math.sin(v * Math.PI) * (1.5 + 2 * n2h(i, 6)), z1 + Math.sin(a) * r, 0.15, k, i % 3 === 0);
    }
  }
};

// --- Symbole -----------------------------------------------------------------------------------------------
// Glutfeld: aufgerissener Boden in Schrägsicht, glühende Risse, drei Feuersäulen
SKILL_ART.glutfeld = function (ctx, IK) {
  IK.light(ctx, 0, 8, 24, '#ff5a1a', 0.6);
  IK.glow(ctx, '#ff6a1a', 10, () => IK.fill(ctx, (c) => c.ellipse(0, 12, 21, 9, 0, 0, Math.PI * 2),
    IK.rad(ctx, 0, 12, 1, 21, [[0, '#fff1c8'], [0.35, '#ff8a4a'], [0.75, '#c81a0a'], [1, '#3a0a06']]), 0.9));
  ctx.save();
  ctx.strokeStyle = '#2a0806';
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  for (const pts of [[[-16, 12], [-8, 10], [-3, 13], [4, 11]], [[3, 15], [9, 13], [17, 14]], [[-6, 16], [-1, 18], [6, 17]], [[0, 7], [-2, 10], [1, 12]]]) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }
  ctx.restore();
  IK.flame(ctx, -10, 12, 22, -0.08, IKN.fire, -0.4);
  IK.flame(ctx, 10, 13, 22, 0.08, IKN.fire, 0.4);
  IK.flame(ctx, 0, 11, 34, 0, IKN.hot);
  IK.flame(ctx, -4, 12, 18, -0.15, IKN.hot, -0.3);
  IK.flame(ctx, 5, 12, 16, 0.2, IKN.hot, 0.3);
  IK.sparkles(ctx, 10, '#ffd8a0', 53, 18, 0, -6, 1.3);
};

// Feuertornados: zwei Feuertrichter mit Spiralbändern, Glut am Boden, Funken
SKILL_ART.feuertornado = function (ctx, IK) {
  IK.light(ctx, 0, 0, 24, '#ff5a1a', 0.55);
  IK.glow(ctx, '#ff6a1a', 8, () => IK.fill(ctx, (c) => c.ellipse(0, 19, 21, 5, 0, 0, Math.PI * 2),
    IK.rad(ctx, 0, 19, 1, 21, [[0, '#fff1c8'], [0.5, '#ff8a4a'], [1, 'rgba(160,20,6,0)']]), 0.9));
  const funnel = (cx, s, lean) => {
    const top = -19 * s;
    const bot = 18;
    const wT = 13 * s;
    const wB = 2.2 * s;
    // Körper des Trichters
    const g = ctx.createLinearGradient(cx - wT, 0, cx + wT, 0);
    g.addColorStop(0, '#8a1a06');
    g.addColorStop(0.35, '#ff7a1a');
    g.addColorStop(0.55, '#ffd36a');
    g.addColorStop(1, '#a8200a');
    ctx.save();
    ctx.shadowColor = '#ff8a2a';
    ctx.shadowBlur = 8;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx - wB, bot);
    ctx.quadraticCurveTo(cx - wB * 2 + lean, (top + bot) * 0.5 + 6, cx - wT + lean * 2, top);
    ctx.quadraticCurveTo(cx + lean * 2, top - 4 * s, cx + wT + lean * 2, top);
    ctx.quadraticCurveTo(cx + wB * 2 + lean, (top + bot) * 0.5 + 6, cx + wB, bot);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Spiralbänder: helle Bögen quer über den Trichter
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const v = (i + 0.5) / 6;
      const y = bot + (top - bot) * v;
      const w = wB + (wT - wB) * v;
      ctx.strokeStyle = i % 2 ? '#fff1c8' : '#ffb04a';
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = (2.2 - v) * s;
      ctx.beginPath();
      ctx.ellipse(cx + lean * 2 * v, y, w * 0.95, w * 0.28, -0.12, 0.15, Math.PI - 0.4);
      ctx.stroke();
    }
    ctx.restore();
    IK.flame(ctx, cx, bot + 1, 10 * s, 0, IKN.hot);
  };
  funnel(-9, 0.8, -1);
  funnel(7, 1, 1);
  IK.sparkles(ctx, 12, '#ffd8a0', 71, 20, 0, -6, 1.3);
};

// Phönixflamme (seit 13.40 neu): Feuervogel von vorn mit hoch geschwungenen Flügeln aus Federn, Kopf mit Kamm,
// langer Flammenschweif nach unten
SKILL_ART.phoenix = function (ctx, IK) {
  IK.light(ctx, 0, -2, 24, '#ff6a1a', 0.65);
  for (const [x, h, a] of [[-4, 16, Math.PI - 0.4], [4, 16, Math.PI + 0.4], [0, 22, Math.PI]]) IK.flame(ctx, x, 6, h, a, IKN.fire, a);
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.scale(sd, 1);
    const g = ctx.createLinearGradient(2, 0, 23, -16);
    g.addColorStop(0, '#fff6d0');
    g.addColorStop(0.45, '#ffb23a');
    g.addColorStop(1, '#d0280c');
    ctx.fillStyle = g;
    ctx.shadowColor = '#ff8a2a';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(3, 0);
    ctx.quadraticCurveTo(12, -8, 23, -20);
    // Federenden zurück zum Körper
    const pts = [[22, -12], [20, -6], [17, -1], [13, 2], [8, 4]];
    let px = 23;
    let py = -20;
    for (const [nx, ny] of pts) {
      ctx.quadraticCurveTo((px + nx) / 2 + 3, (py + ny) / 2 + 3, nx, ny);
      px = nx;
      py = ny;
    }
    ctx.lineTo(3, 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,30,6,0.6)';
    ctx.lineWidth = 0.8;
    for (const [nx, ny] of pts) {
      ctx.beginPath();
      ctx.moveTo(5, 0);
      ctx.quadraticCurveTo((5 + nx) / 2, (ny - 6) / 2, nx, ny);
      ctx.stroke();
    }
    ctx.restore();
  }
  IK.glow(ctx, '#ffd36a', 9, () => IK.fill(ctx, (c) => { c.ellipse(0, -1, 4, 7.5, 0, 0, Math.PI * 2); }, IK.rad(ctx, 0, -3, 0.5, 8, [[0, '#ffffff'], [0.4, '#fff1c8'], [0.8, '#ff8a4a'], [1, '#e8362a']]), 0.85));
  IK.flame(ctx, 0, -8, 10, 0, IKN.hot);
  IK.fill(ctx, (c) => { c.moveTo(-1.6, -12); c.lineTo(0, -15.5); c.lineTo(1.6, -12); c.closePath(); }, '#fff6d8', 0.6);
  IK.sparkles(ctx, 8, '#ffe0b0', 41, 20, 0, 0, 1.2);
};
