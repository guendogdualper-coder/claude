// Frostmagier: Blizzard (seit 13.54, statt Kristallgrab). Am gewählten Ort tobt ein echter Schneesturm.
// Seit 13.64 ohne Sturmwolke und eisiger: dichter blauweißer Schnee fällt schräg im Wind, Eissplitter wirbeln
// und funkeln, schwere Eisbrocken schlagen auf und zerspringen, Schneewirbel drehen sich durch den Kreis,
// frostblaues Leuchten liegt über dem Feld und Frostnebel kriecht über den Boden (kein Bodensymbol, kein Ring).
// Schaden zweimal pro Sekunde, die Verlangsamung wächst, solange ein Gegner im Sturm bleibt; der letzte Puls
// friert kurz ein (Bosse werden nur verlangsamt). Je Rang tobt der Sturm 0,5 s länger.
// Ablauf wie in feuerfeld.js: SKILL_TYPES (eigener Spieler), MAGE2_REMOTE (Mitspieler: nur Bild),
// EXTRA_EFFECTS (2D) und FX3_DRAW (3D). Der Ort wird wie bei allen Ortszaubern mit dem Zielkreis gewählt
// (sk.aim, kampf.js: startAim/aimFire – Klick oder Tippen auf den Boden, Esc oder Rechtsklick bricht ab).

// --- Schnee-Bilder ---------------------------------------------------------------------------------------
// weiß gemalt, die Farbe kommt vom Material; alles weich (kein harter Rand), normal gemischt statt leuchtend
const SNOW_TEX = {};
function snowRnd(seed) {
  let s = seed * 9301 + 49297;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}
function snowTex(kind) {
  if (SNOW_TEX[kind]) return SNOW_TEX[kind];
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  const blob = (x, y, r, a) => {
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, `rgba(255,255,255,${a})`);
    rg.addColorStop(0.55, `rgba(255,255,255,${a * 0.75})`);
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  };
  if (kind === 'dot') {
    // feine Flocke: weicher, runder Punkt mit zartem, kühlem Saum (bleibt auch über Schnee sichtbar)
    c.width = c.height = 32;
    const rg = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    rg.addColorStop(0, 'rgba(255,255,255,1)');
    rg.addColorStop(0.45, 'rgba(255,255,255,0.92)');
    rg.addColorStop(0.72, 'rgba(120,170,235,0.38)');
    rg.addColorStop(1, 'rgba(120,170,235,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, 32, 32);
  } else if (kind === 'flake') {
    // dicke Schneeflocke: sechs weiche, gefiederte Arme mit runden Enden, weich verwischt, mit hellem Hof
    c.width = c.height = 64;
    blob(32, 32, 28, 0.2);
    const tmp = document.createElement('canvas');
    tmp.width = tmp.height = 64;
    const t = tmp.getContext('2d');
    t.lineCap = 'round';
    t.translate(32, 32);
    // weicher, kühler Schatten unter den Armen, dann die weißen Arme darüber
    const arms = (col, w) => {
      t.strokeStyle = col;
      t.fillStyle = col;
      for (let i = 0; i < 6; i++) {
        t.save();
        t.rotate((i * Math.PI) / 3);
        t.lineWidth = 4 + w;
        t.beginPath();
        t.moveTo(0, 0);
        t.lineTo(0, -20);
        t.stroke();
        t.lineWidth = 3 + w;
        for (const [v, l] of [[-9, 7], [-15, 5.5]]) {
          t.beginPath();
          t.moveTo(-l * 0.8, v - l * 0.7);
          t.lineTo(0, v);
          t.lineTo(l * 0.8, v - l * 0.7);
          t.stroke();
        }
        t.restore();
      }
      t.beginPath();
      t.arc(0, 0, 6 + w * 0.5, 0, Math.PI * 2);
      t.fill();
    };
    arms('rgba(40,90,190,0.5)', 3);
    arms('#ffffff', 0);
    g.save();
    g.filter = 'blur(1.6px)';
    g.drawImage(tmp, 0, 0);
    g.restore();
    g.globalAlpha = 0.6;
    g.drawImage(tmp, 0, 0);
    g.globalAlpha = 1;
  } else if (kind === 'puff' || kind === 'cloud') {
    // Nebelbausch: viele weiche Kugeln übereinander, oben hell, unten leicht schattig (räumlich)
    const S = kind === 'cloud' ? 128 : 64;
    c.width = c.height = S;
    const r = snowRnd(kind === 'cloud' ? 7 : 3);
    const k = S / 64;
    const lobes = kind === 'cloud'
      ? [[32, 36, 17], [19, 38, 12], [45, 38, 13], [25, 27, 12], [39, 26, 13], [32, 22, 10], [13, 42, 8], [51, 42, 8]]
      : [[32, 34, 16], [21, 37, 11], [43, 37, 12], [26, 25, 11], [39, 25, 10], [32, 44, 10]];
    for (const [x, y, rr] of lobes) blob((x + (r() - 0.5) * 3) * k, (y + (r() - 0.5) * 3) * k, rr * k * 1.15, 0.95);
    // Schatten unten, Licht oben (nur auf dem Bausch)
    g.globalCompositeOperation = 'source-atop';
    const sh = g.createLinearGradient(0, 14 * k, 0, 54 * k);
    sh.addColorStop(0, 'rgba(255,255,255,0)');
    sh.addColorStop(1, 'rgba(110,150,215,0.6)');
    g.fillStyle = sh;
    g.fillRect(0, 0, S, S);
    g.globalCompositeOperation = 'source-over';
  } else if (kind === 'shard') {
    // Eissplitter (seit 13.64): länglicher, facettierter Kristall – helle und blaue Seite, weiße Kante, kalter Hof
    c.width = 32;
    c.height = 64;
    const hof = g.createRadialGradient(16, 32, 0, 16, 32, 22);
    hof.addColorStop(0, 'rgba(150,215,255,0.45)');
    hof.addColorStop(1, 'rgba(150,215,255,0)');
    g.fillStyle = hof;
    g.fillRect(0, 0, 32, 64);
    const P = [[16, 3], [24, 18], [21, 52], [16, 61], [11, 52], [8, 18]];
    // linke Seite hell, rechte Seite tiefblau
    g.beginPath();
    P.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    const lg = g.createLinearGradient(8, 0, 24, 0);
    lg.addColorStop(0, '#f4fdff');
    lg.addColorStop(0.48, '#b8ecff');
    lg.addColorStop(0.52, '#5aa2ff');
    lg.addColorStop(1, '#1e4fc8');
    g.fillStyle = lg;
    g.fill();
    g.strokeStyle = 'rgba(10,30,90,0.75)';
    g.lineWidth = 1.2;
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.95)';
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(16, 6);
    g.lineTo(16, 58);
    g.stroke();
  } else if (kind === 'streak') {
    // schnelle Flocke im Wind: weicher, länglicher Strich
    c.width = 32;
    c.height = 128;
    g.translate(16, 64);
    g.scale(1, 4);
    const rg = g.createRadialGradient(0, 0, 0, 0, 0, 15);
    rg.addColorStop(0, 'rgba(255,255,255,0.95)');
    rg.addColorStop(0.5, 'rgba(255,255,255,0.45)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.beginPath();
    g.arc(0, 0, 15, 0, Math.PI * 2);
    g.fill();
  } else if (kind === 'cover') {
    // Schnee- und Reifdecke: weiche, fleckige Fläche mit unregelmäßigem Rand und leichten Verwehungen
    c.width = c.height = 256;
    const r = snowRnd(11);
    const base = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    base.addColorStop(0, 'rgba(255,255,255,1)');
    base.addColorStop(0.62, 'rgba(255,255,255,0.97)');
    base.addColorStop(0.8, 'rgba(255,255,255,0.4)');
    base.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = base;
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 46; i++) {
      const a = r() * Math.PI * 2;
      const d = (0.55 + r() * 0.35) * 118;
      blob(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, 10 + r() * 18, 0.5 + r() * 0.4);
    }
    // Verwehungen: bläuliche Schattenstreifen in Windrichtung
    g.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < 14; i++) {
      const x = 40 + r() * 176;
      const y = 40 + r() * 176;
      g.save();
      g.translate(x, y);
      g.rotate(0.38);
      g.scale(3, 1);
      const rg = g.createRadialGradient(0, 0, 0, 0, 0, 9);
      rg.addColorStop(0, 'rgba(140,185,240,0.5)');
      rg.addColorStop(1, 'rgba(140,185,240,0)');
      g.fillStyle = rg;
      g.beginPath();
      g.arc(0, 0, 9, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
    g.globalCompositeOperation = 'source-over';
  }
  const t = new THREE.CanvasTexture(c);
  SNOW_TEX[kind] = t;
  return t;
}

// Farbe dämpfen (nachts weniger grell)
let SNOW_DIM = 1;
// weiches, normal gemischtes Bild zur Kamera gedreht (eigener Vorrat je Bildart)
function snowSprite(h, tex, x, y, z, sx, sy, color, op, rot = 0) {
  if (op <= 0.01) return null;
  const o = fx3Take(h, 'snowS_' + tex);
  if (!o.userData.snowInit) {
    o.userData.snowInit = true;
    o.material.blending = THREE.NormalBlending;
    o.material.map = snowTex(tex);
    o.material.needsUpdate = true;
  }
  o.position.set(x, y, z);
  o.scale.set(sx, sy, 1);
  o.material.rotation = rot;
  o.material.color.set(color).multiplyScalar(SNOW_DIM);
  o.material.opacity = Math.min(1, op);
  return o;
}
// leuchtender Funke (additiv): Glitzern der Eiskristalle
function snowGlint(h, x, y, z, s, color, op) {
  if (op <= 0.01) return null;
  const o = fx3Take(h, 'sprite');
  fx3Map(o, 'spark');
  o.position.set(x, y, z);
  o.scale.set(s, s, 1);
  o.material.rotation = 0;
  fx3Color(o, color, op);
  return o;
}
// flach am Boden (Mitte in Welt-Pixeln, Radius in Einheiten), eigene Schneedecken-Textur
function snowGround(h, x, z, r, y, rot, color, op) {
  if (op <= 0.01) return null;
  const o = fx3Take(h, 'planeNSnowCover');
  if (!o.userData.snowInit) {
    o.userData.snowInit = true;
    o.material.map = snowTex('cover');
    o.material.needsUpdate = true;
  }
  o.position.set(x * U3, y, z * U3);
  o.scale.set(r, r, 1);
  o.rotation.set(-Math.PI / 2, 0, rot);
  o.material.color.set(color).multiplyScalar(SNOW_DIM);
  o.material.opacity = Math.min(1, op);
  return o;
}
// dichter Schneefall als Punktwolke: ein Zeichenaufruf für Hunderte Flocken
const SNOW_PTS_MAX = 600;
function snowPoints(h, kind) {
  return fx3Own(h, kind, () => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SNOW_PTS_MAX * 3), 3));
    const o = new THREE.Points(geo, new THREE.PointsMaterial({ map: snowTex('dot'), size: 0.05, sizeAttenuation: true, transparent: true, depthWrite: false, fog: false, color: 0xffffff }));
    o.frustumCulled = false;
    return o;
  });
}

// --- Ablauf ------------------------------------------------------------------------------------------------
// Pulse je Rang: normal sk.ticks (4 s), erweckt +1, heroisch +2, legendär +3, vollendet +4 (je 0,5 s länger)
function snowTicks(sk, lvl) {
  const r = typeof skillRank === 'function' ? skillRank(lvl || 1) : -1;
  return sk.ticks + (r >= 0 ? r + 1 : 0);
}
SKILL_TYPES.msnow = function (sk, pw, lvl) {
  const p = game.player;
  const pt = skillAimPoint(sk);
  faceTowards(pt.x, pt.y);
  lockPlayer(p, 0.35);
  input.walkTo = null;
  const x = Math.round(pt.x);
  const y = Math.round(pt.y);
  const n = snowTicks(sk, lvl);
  const seed = Math.floor(Math.random() * 1000);
  snowFx(p, x, y, sk, n, seed, true, pw, lvl);
  return { tx: x, ty: y, n, sd: seed };
};
function snowFx(owner, x, y, sk, n, seed, local, pw, lvl) {
  addEffect({ type: 'msnow3', x, y, R: sk.radius, delay: sk.delay, every: sk.every, ticks: n, seed, dur: sk.delay + n * sk.every + 1.1 });
  if (owner === game.player) shakeScreen(1.5);
  if (!local) return;
  // wie lange jeder Gegner schon im Sturm steht (Pulse): daraus wächst die Verlangsamung
  const stay = new Map();
  for (let k = 0; k < n; k++) {
    later(sk.delay + (k + 0.5) * sk.every, () => {
      const last = k === n - 1;
      for (const m of enemiesInCircle(x, y, sk.radius)) {
        const c = (stay.get(m) || 0) + 1;
        stay.set(m, c);
        const amount = Math.min(sk.slow.max, sk.slow.amount + sk.slow.build * (c - 1));
        // letzter Puls: kurz einfrieren (Bosse, Steine und Duell-Gegner nur verlangsamt)
        const fz = last && sk.freeze && canFreeze(m) ? mageDur(sk.freeze, lvl) : 0;
        hitMonster(m, sk.dmg * pw, {
          skill: sk.id, slow: { amount, duration: sk.slow.duration + fz }, stun: fz, freeze: fz > 0,
          heavy: last, duelMul: sk.duelMul, vfxColor: '#bfe6ff'
        });
      }
    });
  }
}
MAGE2_REMOTE.msnow = (rp, sk, d) => snowFx(rp, d.tx ?? rp.x, d.ty ?? rp.y, sk, Number.isInteger(d.n) && d.n > 0 && d.n < 20 ? d.n : sk.ticks, d.sd || 1, false, 0, 1);

// Treffer: Schneepulver und blaue Eissplitter (seit 13.64 eisiger)
if (SKILL_FX.schneesturm) {
  SKILL_FX.schneesturm.hit = (m) => {
    const c = bodyCenter(m);
    particles(c.x, c.y, { count: 3, color: ['#ffffff', '#d8eeff', '#9fd4ff'], speed: [30, 90], life: [0.35, 0.6], size: [2, 3.6], drag: 2.5, gravity: 60, glow: false });
    particles(c.x, c.y, { count: 2, color: ['#9ff6ff', '#3a7bff'], speed: [50, 120], life: [0.25, 0.45], size: [1.5, 2.6], shape: 'square', drag: 3, gravity: 260 });
  };
}

// --- 2D ----------------------------------------------------------------------------------------------------
// seit 13.64: statt Sturmwolke frostblaues Leuchten und Frostnebel, blauweißer Schnee und fallende Eissplitter
EXTRA_EFFECTS.msnow3 = (ctx, e, k, x, y) => {
  const T = game.time - e.start;
  const on = clamp01(T / Math.max(0.05, e.delay));
  const out = clamp01((e.dur - T) / 0.8);
  const vis = on * out;
  const end = e.delay + e.ticks * e.every;
  const R = e.R;
  ctx.save();
  // frostblaues Leuchten über dem Feld
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.5 * vis * (0.85 + 0.15 * Math.sin(T * 3));
  const gl = ctx.createRadialGradient(x, y, 4, x, y, R * 1.1);
  gl.addColorStop(0, 'rgba(90,160,255,0.75)');
  gl.addColorStop(0.6, 'rgba(58,123,255,0.35)');
  gl.addColorStop(1, 'rgba(58,123,255,0)');
  ctx.fillStyle = gl;
  ctx.beginPath();
  ctx.ellipse(x, y, R * 1.1, R * 0.78, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  // Reifdecke
  ctx.globalAlpha = 0.5 * vis * clamp01((T - e.delay) / 2);
  ctx.fillStyle = '#e4f0ff';
  ctx.beginPath();
  ctx.ellipse(x, y, R * 0.95, R * 0.66, 0, 0, Math.PI * 2);
  ctx.fill();
  // Frostnebel: weiche, hellblaue Schwaden ziehen dicht über dem Boden
  for (let i = 0; i < 9; i++) {
    const a = n2h(i, 101) * Math.PI * 2 + T * 0.35 * (i % 2 ? 1 : -1);
    const d = (0.3 + 0.65 * n2h(i, 102)) * R;
    const fx = x + Math.cos(a) * d;
    const fy = y + Math.sin(a) * d * 0.68;
    const r = R * (0.32 + 0.18 * n2h(i, 103));
    ctx.globalAlpha = 0.32 * vis;
    const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, r);
    g.addColorStop(0, 'rgba(205,228,255,0.9)');
    g.addColorStop(1, 'rgba(170,205,250,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(fx, fy, r, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (T > e.delay * 0.3 && T < end + 0.6) {
    // blauweißer Schnee schräg im Wind
    for (let i = 0; i < 80; i++) {
      const u = (T * (0.6 + 0.3 * n2h(i, 1)) + n2h(i, 2)) % 1;
      const a = n2h(i, 3) * Math.PI * 2;
      const d = Math.sqrt(n2h(i, 4)) * R;
      ctx.globalAlpha = 0.9 * vis * Math.min(1, u * 4);
      ctx.fillStyle = i % 3 ? '#ffffff' : '#bfe0ff';
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * d - (1 - u) * 50, y + Math.sin(a) * d * 0.7 - (1 - u) * 110, 1.4 + 2 * n2h(i, 5), 0, Math.PI * 2);
      ctx.fill();
    }
    // fallende Eissplitter: längliche Kristalle, die sich drehen und funkeln
    ctx.lineJoin = 'round';
    for (let i = 0; i < 14; i++) {
      const u = (T * (0.8 + 0.4 * n2h(i, 11)) + n2h(i, 12)) % 1;
      const a = n2h(i, 13) * Math.PI * 2;
      const d = Math.sqrt(n2h(i, 14)) * R * 0.95;
      const sx = x + Math.cos(a) * d - (1 - u) * 45;
      const sy = y + Math.sin(a) * d * 0.7 - (1 - u) * 100;
      const L = 5 + 4 * n2h(i, 15);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(T * (3 + 3 * n2h(i, 16)) * (i % 2 ? 1 : -1));
      ctx.globalAlpha = 0.95 * vis * Math.min(1, u * 5);
      ctx.fillStyle = '#9fdcff';
      ctx.strokeStyle = 'rgba(20,60,160,0.85)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, -L);
      ctx.lineTo(L * 0.3, -L * 0.45);
      ctx.lineTo(L * 0.22, L * 0.7);
      ctx.lineTo(0, L);
      ctx.lineTo(-L * 0.22, L * 0.7);
      ctx.lineTo(-L * 0.3, -L * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    // Glitzern in der Luft
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 16; i++) {
      const tw = Math.pow(Math.max(0, Math.sin(T * 6 + i * 2.3)), 4);
      if (tw < 0.05) continue;
      const a = n2h(i, 21) * Math.PI * 2;
      const d = Math.sqrt(n2h(i, 22)) * R;
      ctx.globalAlpha = tw * vis;
      glow2(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7 - 20 - 60 * n2h(i, 23), 6, '#bfefff', 1);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
};

// --- 3D ----------------------------------------------------------------------------------------------------
const _snW = new THREE.Vector3(0.92, 0, 0.38).normalize(); // Windrichtung (schräg von links hinten)
const _snV = new THREE.Vector3();
// Drehung eines länglichen Bildes, damit es auf dem Bildschirm in Richtung v zeigt
function snowScreenRot(v) {
  const R = FX3.cam.r;
  const Up = FX3.cam.u;
  return Math.atan2(-(v.x * R.x + v.y * R.y + v.z * R.z), v.x * Up.x + v.y * Up.y + v.z * Up.z);
}

FX3_TYPES.add('msnow3');
FX3_DRAW.msnow3 = function (h, e) {
  const T = game.time - e.start;
  const low = n3low();
  const life = e.ticks * e.every;
  const end = e.delay + life;
  const gather = easeOut(clamp01(T / Math.max(0.05, e.delay)));
  const out = clamp01((e.dur - T) / 0.8);
  const vis = gather * out;
  if (vis <= 0.01) return;
  SNOW_DIM = 1 - 0.32 * (V3.nightK || 0);
  const R = e.R * U3;
  const cx = e.x * U3;
  const cz = e.y * U3;
  const sd = e.seed;
  const Y0 = 3.4; // hier oben setzt der Schneefall ein (seit 13.64 ohne Wolke darüber)
  const D = 2.0; // Versatz im Wind während des Falls
  const gust = 1 + 0.3 * Math.sin(T * 1.4 + sd) + 0.15 * Math.sin(T * 3.7);
  // Schnee fällt nur, solange der Sturm tobt (Flocken in der Luft fallen noch zu Ende)
  const s0 = e.delay * 0.3;
  const s1 = end - 0.25;
  const snowK = clamp01((T - s0) / 0.5) * clamp01((end + 0.6 - T) / 0.6);
  const pulse = 0.85 + 0.15 * Math.sin(T * 3.1 + sd);

  // --- Boden: frostblaues Leuchten, Reifdecke, Frostnebel (seit 13.64 kein Wolkenschatten und kein Rand-Ring) ---
  const glow = mGround(h, 'planeSnowGlow', 'disc', e.x, e.y, R * 1.2, 0.028, 0, '#2f6fff', 0.34 * vis * pulse, false);
  glow.renderOrder = 3;
  // die Reifdecke wächst in die Höhe: Gras und Füße stecken bald im Schnee
  const cover = easeOut(clamp01((T - e.delay) / 2.4)) * out;
  const cv = snowGround(h, e.x, e.y, R * (0.55 + 0.5 * cover), 0.03 + 0.12 * cover, sd, '#dcebff', 0.92 * cover);
  if (cv) cv.renderOrder = 4;
  // Reif glitzert auf der Decke
  if (cover > 0.2) {
    const rn = low ? 5 : 14;
    for (let i = 0; i < rn; i++) {
      const tw = Math.pow(Math.max(0, Math.sin(T * 4.5 + i * 2.1 + sd)), 6);
      const a = n2h(i + sd, 131) * Math.PI * 2;
      const r = Math.sqrt(n2h(i + sd, 132)) * R * 0.9;
      snowGlint(h, cx + Math.cos(a) * r, 0.06 + 0.12 * cover, cz + Math.sin(a) * r, 0.22, '#cfefff', tw * cover);
    }
  }
  // Frostnebel: breite, hellblaue Schwaden kriechen dicht über dem Boden im Kreis herum
  const fogK = clamp01((T - e.delay * 0.3) / 0.8) * out;
  const fn0 = low ? 6 : 14;
  for (let i = 0; i < fn0; i++) {
    const a = n2h(i, 101) * Math.PI * 2 + T * (0.18 + 0.12 * n2h(i, 105)) * (i % 2 ? 1 : -1);
    const r = R * (0.2 + 0.8 * Math.sqrt(n2h(i, 102)));
    const s = (1.3 + 1.1 * n2h(i, 103)) * (0.7 + 0.3 * gather);
    snowSprite(h, 'puff', cx + Math.cos(a) * r, 0.24 + 0.16 * n2h(i, 104) + 0.05 * Math.sin(T * 1.3 + i), cz + Math.sin(a) * r * 0.9,
      s * 1.55, s * 0.5, i % 3 ? '#c8def8' : '#a8c6f2', 0.46 * fogK);
  }
  // weicher Nebelsaum am Rand statt eines Rings
  const rimN = low ? 8 : 16;
  for (let i = 0; i < rimN; i++) {
    const a = (i / rimN) * Math.PI * 2 + T * 0.12 + n2h(i, 107) * 0.3;
    const s = 0.9 + 0.5 * n2h(i, 108);
    snowSprite(h, 'puff', cx + Math.cos(a) * R * 0.98, 0.2 + 0.08 * Math.sin(T * 1.7 + i), cz + Math.sin(a) * R * 0.98, s * 1.3, s * 0.48, '#bcd6f6', 0.4 * fogK);
  }
  // frostblauer Schein in der Luft über dem Feld
  const hn = low ? 2 : 4;
  for (let i = 0; i < hn; i++) {
    const a = n2h(i, 109) * Math.PI * 2 + T * 0.3;
    const r = R * 0.35 * n2h(i, 110);
    const o = fx3Take(h, 'sprite');
    fx3Map(o, 'disc');
    o.position.set(cx + Math.cos(a) * r, 0.7 + 0.5 * i / hn, cz + Math.sin(a) * r);
    const s = R * (1.0 + 0.3 * n2h(i, 111));
    o.scale.set(s, s * 0.6, 1);
    o.material.rotation = 0;
    fx3Color(o, '#4a8cff', 0.12 * vis * pulse);
  }

  // Lage einer fallenden Flocke: i Nummer, fallT Fallzeit, drift Windversatz; null, wenn gerade keine fällt
  const fall = (i, salt, fallT, drift, swirl) => {
    const ph = T / fallT + n2h(i, salt);
    const cyc = Math.floor(ph);
    const u = ph - cyc;
    const spawn = (cyc - n2h(i, salt)) * fallT;
    if (spawn < s0 || spawn > s1) return null;
    const a = n2h(i * 3 + cyc * 7 + sd, salt + 1) * Math.PI * 2 + swirl * (1 - u);
    const d = Math.sqrt(n2h(i * 5 + cyc * 3 + sd, salt + 2)) * R * 0.97;
    const off = drift * gust * (1 - u);
    return { u, cyc, x: cx + Math.cos(a) * d - _snW.x * off, y: Y0 * (1 - u) + 0.04, z: cz + Math.sin(a) * d - _snW.z * off };
  };

  // --- dichter Schneefall: zwei Punktwolken (feine weiße und mittlere hellblaue Flocken) ---
  const tanF = Math.tan(((V3.camera ? V3.camera.fov : 30) * Math.PI) / 360);
  for (const [kind, n, size, salt, tMin, tSpan, flut, col] of [['snowPtsA', low ? 200 : 560, 0.1, 30, 1.2, 0.5, 0.06, '#f2f8ff'], ['snowPtsB', low ? 70 : 200, 0.17, 40, 1.6, 0.7, 0.18, '#c2dcff']]) {
    const pts = snowPoints(h, kind);
    const arr = pts.geometry.attributes.position.array;
    let m = 0;
    for (let i = 0; i < n; i++) {
      const f = fall(i, salt, tMin + tSpan * n2h(i, salt + 5), D, 0.8);
      if (!f) continue;
      arr[m * 3] = f.x + Math.sin(T * 2.6 + i) * flut;
      arr[m * 3 + 1] = f.y;
      arr[m * 3 + 2] = f.z + Math.cos(T * 2.1 + i * 1.3) * flut;
      m++;
    }
    pts.geometry.setDrawRange(0, m);
    pts.geometry.attributes.position.needsUpdate = true;
    pts.material.size = size / tanF;
    pts.material.color.set(col).multiplyScalar(SNOW_DIM);
    pts.material.opacity = 0.95 * out;
  }

  // --- dicke, taumelnde Flocken (gefiederte Schneeflocken, kühl getönt) ---
  const bn = low ? 10 : 26;
  for (let i = 0; i < bn; i++) {
    const f = fall(i, 50, 2.2 + 0.7 * n2h(i, 55), D * 0.85, 1.1);
    if (!f) continue;
    const s = 0.3 + 0.2 * n2h(i, 56);
    const wob = Math.sin(T * 2.2 + i * 1.7);
    snowSprite(h, 'flake', f.x + wob * 0.3, f.y, f.z + Math.cos(T * 1.8 + i) * 0.2, s, s, i % 2 ? '#ffffff' : '#d4e8ff', 0.95 * Math.min(1, f.u * 6), T * (0.8 + n2h(i, 57)) * (i % 2 ? 1 : -1));
  }

  // --- Eissplitter: wirbeln im Wind, drehen sich und funkeln ---
  const sn = low ? 8 : 24;
  _snV.set(_snW.x * D, -Y0, _snW.z * D);
  for (let i = 0; i < sn; i++) {
    const f = fall(i, 110, 1.3 + 0.5 * n2h(i, 111), D * 0.95, 0.7);
    if (!f) continue;
    const s = 0.15 + 0.13 * n2h(i, 112);
    const spin = T * (2 + 2.5 * n2h(i, 113)) * (i % 2 ? 1 : -1);
    const op = 0.95 * Math.min(1, f.u * 5);
    snowSprite(h, 'shard', f.x, f.y + s * 0.5, f.z, s * 0.55, s * 1.25, '#ffffff', op, spin);
    const tw = Math.pow(Math.max(0, Math.sin(T * 9 + i * 1.9)), 5);
    snowGlint(h, f.x, f.y + s * 0.6, f.z, 0.2 + 0.12 * tw, '#d8f6ff', op * (0.25 + 0.75 * tw));
  }

  // --- schnelle Flocken als kurze Striche (zeigen den Wind) ---
  const fn = low ? 12 : 40;
  _snV.set(_snW.x * D * 1.4, -Y0, _snW.z * D * 1.4);
  const srot = snowScreenRot(_snV);
  for (let i = 0; i < fn; i++) {
    const f = fall(i, 60, 0.75 + 0.2 * n2h(i, 65), D * 1.4, 0.3);
    if (!f) continue;
    snowSprite(h, 'streak', f.x, f.y, f.z, 0.08 + 0.04 * n2h(i, 66), 0.75 + 0.3 * n2h(i, 67), i % 3 ? '#ffffff' : '#cfe4ff', 0.85 * Math.min(1, f.u * 5), srot);
  }

  // --- schwere Eisbrocken: fallen schneller und zerspringen beim Aufschlag in glitzernde Splitter ---
  const cl = low ? 4 : 9;
  for (let i = 0; i < cl; i++) {
    const fallT = 1.15 + 0.3 * n2h(i, 75);
    const f = fall(i, 70, fallT, D * 0.9, 0.5);
    if (f) {
      const s = 0.34 + 0.18 * n2h(i, 76);
      snowSprite(h, 'shard', f.x, f.y + s * 0.4, f.z, s * 0.62, s * 1.15, '#eaf6ff', 0.95 * Math.min(1, f.u * 5), T * 1.6 + i);
      snowGlint(h, f.x, f.y + s * 0.4, f.z, s * 1.1, '#6aa8ff', 0.35 * Math.min(1, f.u * 5));
    }
    // Aufschlag des vorigen Brockens: Splitter springen weg, blaues Aufblitzen, eine Frostwolke
    const ph = T / fallT + n2h(i, 70);
    const age = (ph - Math.floor(ph)) * fallT;
    const prev = Math.floor(ph) - 1;
    const spawnPrev = (prev - n2h(i, 70)) * fallT;
    if (age > 0.6 || spawnPrev < s0 || spawnPrev > s1) continue;
    const a = n2h(i * 3 + prev * 7 + sd, 71) * Math.PI * 2;
    const d = Math.sqrt(n2h(i * 5 + prev * 3 + sd, 72)) * R * 0.97;
    const lx = cx + Math.cos(a) * d;
    const lz = cz + Math.sin(a) * d;
    const v = age / 0.6;
    snowSprite(h, 'puff', lx + _snW.x * v * 0.4, 0.16 + v * 0.3, lz, 0.45 + v * 1.1, (0.45 + v * 1.1) * 0.6, '#d6e8ff', 0.7 * (1 - v));
    snowGlint(h, lx, 0.2, lz, 0.9 * (1 - v * 0.5), '#7ab8ff', 0.8 * (1 - v));
    for (let j = 0; j < (low ? 2 : 4); j++) {
      const ja = j * 1.7 + prev;
      snowSprite(h, 'shard', lx + Math.cos(ja) * v * 0.9, 0.1 + Math.sin(v * Math.PI) * 0.45, lz + Math.sin(ja) * v * 0.6, 0.08, 0.17, '#ffffff', 0.95 * (1 - v), ja + v * 6);
    }
  }

  // --- Schneewirbel: Säulen aus wirbelndem Schnee und Eissplittern ziehen durch den Kreis ---
  const sk = snowK * out;
  // (Wischer, Nebelbäusche, Flocken und Splitter entlang der Drehrichtung im Wechsel: so sieht man das Drehen auch im Standbild)
  const en = low ? 2 : 3;
  const ep = low ? 9 : 18;
  for (let j = 0; j < en; j++) {
    const ea = n2h(sd + j, 81) * Math.PI * 2 + T * 0.7 * (j % 2 ? 1 : -1);
    const er = R * (0.35 + 0.25 * n2h(sd + j, 82));
    const ex = cx + Math.cos(ea) * er;
    const ez = cz + Math.sin(ea) * er;
    for (let q = 0; q < ep; q++) {
      const v = (T * 0.55 + q / ep) % 1;
      const a = T * 6.5 + q * 2.4 + j;
      const r = 0.25 + 0.95 * v;
      const x = ex + Math.cos(a) * r + _snW.x * v * 0.6;
      const y = 0.15 + v * 2.2;
      const z = ez + Math.sin(a) * r * 0.8;
      const op = Math.sin(v * Math.PI) * sk;
      const kind = q % 4;
      if (kind === 0) {
        _snV.set(-Math.sin(a), 0.15, Math.cos(a) * 0.8);
        snowSprite(h, 'streak', x, y, z, 0.1 + 0.05 * v, 0.45 + 0.5 * v, '#ffffff', 0.9 * op, snowScreenRot(_snV));
      } else if (kind === 1) {
        const s = 0.28 + 0.4 * v;
        snowSprite(h, 'puff', x, y, z, s, s * 0.8, '#dceaff', 0.8 * op, a);
      } else if (kind === 2) {
        const s = 0.26 + 0.14 * v;
        snowSprite(h, 'flake', x, y, z, s, s, '#eef6ff', 0.95 * op, a);
      } else {
        const s = 0.14 + 0.1 * v;
        snowSprite(h, 'shard', x, y, z, s * 0.55, s * 1.25, '#ffffff', 0.95 * op, a * 1.3);
      }
    }
  }
  // Schneeböen: weiße Wischer und Frostschwaden jagen dicht über dem Boden im Kreis herum
  const gn = low ? 6 : 16;
  for (let i = 0; i < gn; i++) {
    const a = n2h(i, 91) * Math.PI * 2 + T * (1.3 + 0.5 * n2h(i, 95));
    const r = R * (0.5 + 0.45 * n2h(i, 92));
    const x = cx + Math.cos(a) * r;
    const y = 0.3 + 0.7 * n2h(i, 94) + 0.1 * Math.sin(T * 3 + i);
    const z = cz + Math.sin(a) * r;
    if (i % 2) {
      _snV.set(-Math.sin(a), 0, Math.cos(a));
      snowSprite(h, 'streak', x, y, z, 0.12, 0.9 + 0.5 * n2h(i, 93), '#f0f7ff', 0.75 * sk, snowScreenRot(_snV));
    } else {
      const s = 0.45 + 0.35 * n2h(i, 93);
      snowSprite(h, 'puff', x, y * 0.6, z, s * 1.4, s * 0.65, '#d2e4fb', 0.55 * sk);
    }
  }
  // Glitzern: Eiskristalle in der Luft blitzen kurz auf
  const gl = low ? 8 : 22;
  for (let i = 0; i < gl; i++) {
    const tw = Math.pow(Math.max(0, Math.sin(T * 6 + i * 2.3 + sd)), 4);
    if (tw < 0.03) continue;
    const a = n2h(i, 121) * Math.PI * 2 + T * 0.4;
    const r = Math.sqrt(n2h(i, 122)) * R * 0.95;
    snowGlint(h, cx + Math.cos(a) * r, 0.3 + 2.2 * n2h(i, 123), cz + Math.sin(a) * r, 0.18 + 0.2 * tw, '#d8f6ff', tw * snowK * out);
  }

  // --- letzter Puls: eine Frostwelle mit Eissplittern rollt nach außen (hier frieren die Gegner ein) ---
  const age = T - (e.delay + (e.ticks - 0.5) * e.every);
  if (age > 0 && age < 0.75) {
    const v = age / 0.75;
    const rr = R * (0.2 + 0.85 * easeOut(v));
    const wn = low ? 8 : 16;
    for (let i = 0; i < wn; i++) {
      const a = (i / wn) * Math.PI * 2 + sd;
      const s = 0.8 + 0.4 * n2h(i, 97);
      snowSprite(h, 'puff', cx + Math.cos(a) * rr, 0.28 + 0.2 * Math.sin(v * Math.PI), cz + Math.sin(a) * rr, s, s * 0.7, '#e2efff', 0.7 * (1 - v));
      snowSprite(h, 'shard', cx + Math.cos(a + 0.2) * rr * 0.92, 0.3 + 0.6 * Math.sin(v * Math.PI), cz + Math.sin(a + 0.2) * rr * 0.92, 0.12, 0.28, '#ffffff', 0.95 * (1 - v), a + v * 8);
    }
    const fl = fx3Take(h, 'sprite');
    fx3Map(fl, 'disc');
    fl.position.set(cx, 0.6, cz);
    fl.scale.set(R * 2.2, R * 1.3, 1);
    fl.material.rotation = 0;
    fx3Color(fl, '#7ab4ff', 0.45 * (1 - v));
  }
};

// --- Symbol ------------------------------------------------------------------------------------------------
// Blizzard (seit 13.64 ohne Wolke): frostblaues Leuchten, ein Wirbel aus blauweißem Schnee schräg im Wind mit
// Eissplittern, ein paar dicke Flocken und eine Schneewehe mit Frostnebel am Boden
SKILL_ART.schneesturm = function (ctx, IK) {
  IK.light(ctx, 0, -2, 22, '#3a7bff', 0.55);
  IK.light(ctx, -2, -6, 12, '#9fe0ff', 0.45);
  // Schneewehe am Boden
  IK.fill(ctx, (c) => {
    c.moveTo(-21, 17);
    c.quadraticCurveTo(-13, 10, -3, 14.5);
    c.quadraticCurveTo(7, 9.5, 21, 14);
    c.lineTo(21, 24);
    c.lineTo(-21, 24);
    c.closePath();
  }, IK.lin(ctx, 0, 10, 0, 22, [[0, '#ffffff'], [0.45, '#cfe4ff'], [1, '#4a78c8']]), 1, 'rgba(8,16,40,0.85)');
  // Frostnebel über der Wehe
  ctx.save();
  for (const [x, y, rx] of [[-12, 12, 9], [3, 11, 10], [15, 12.5, 7]]) {
    ctx.fillStyle = IK.rad(ctx, x, y, 0, rx, [[0, 'rgba(210,232,255,0.85)'], [1, 'rgba(170,205,250,0)']]);
    ctx.beginPath();
    ctx.ellipse(x, y, rx, rx * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Sturmwirbel: zwei helle Bögen drehen sich um die Mitte
  IK.swirl(ctx, 0, -4, 3, 16, 1.25, 'rgba(220,240,255,0.85)', 1.8, 0.4);
  IK.swirl(ctx, 0, -4, 2, 11, 1.1, 'rgba(160,215,255,0.8)', 1.2, 2.6);
  // Schnee im Wind: Wischer (schräg nach rechts unten), dann viele weiche Flocken
  const r = snowRnd(5);
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 16; i++) {
    const x = -20 + r() * 34;
    const y = -16 + r() * 28;
    const L = 3 + r() * 4;
    ctx.globalAlpha = 0.35 + r() * 0.4;
    ctx.strokeStyle = i % 3 ? '#eaf4ff' : '#9fd0ff';
    ctx.lineWidth = 0.7 + r() * 0.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + L * 0.55, y + L);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 34; i++) {
    const x = -20 + r() * 39;
    const y = -18 + r() * 32;
    const s = 0.55 + r() * 1.05;
    ctx.fillStyle = IK.rad(ctx, x - s * 0.35, y - s * 0.35, 0, s * 1.1, [[0, '#ffffff'], [0.6, '#e4f2ff'], [1, 'rgba(120,180,250,0.5)']]);
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Eissplitter im Sturm (schräg, wie vom Wind getragen)
  const P = ['#f4fdff', '#a8e4ff', '#3a7bff', '#1a3fb0'];
  for (const [x, y, len, w, a] of [[-14, -12, 8, 3, 0.9], [12, -15, 7, 2.6, 2.4], [16, 2, 6, 2.4, 1.9], [-17, 3, 6, 2.4, 0.5], [4, -18, 5, 2, 1.2]]) {
    IK.glow(ctx, '#9fe0ff', 4, () => IK.crystal(ctx, x, y, len, w, a, P));
  }
  // drei dicke, weiche Flocken (runde Arme, leicht geneigt)
  const flake = (x, y, s, a0) => IK.glow(ctx, '#bfe4ff', 5, () => {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineCap = 'round';
    for (const [col, w] of [['rgba(20,60,140,0.6)', 0.5], ['#ffffff', 0.3]]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = s * w;
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 + a0;
        const ex = Math.cos(a) * s;
        const ey = Math.sin(a) * s;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(ex, ey);
        // kleine Seitenzweige
        ctx.moveTo(ex * 0.6, ey * 0.6);
        ctx.lineTo(ex * 0.6 + Math.cos(a + 0.9) * s * 0.3, ey * 0.6 + Math.sin(a + 0.9) * s * 0.3);
        ctx.moveTo(ex * 0.6, ey * 0.6);
        ctx.lineTo(ex * 0.6 + Math.cos(a - 0.9) * s * 0.3, ey * 0.6 + Math.sin(a - 0.9) * s * 0.3);
        ctx.stroke();
      }
    }
    ctx.restore();
  });
  flake(-9, -3, 4.6, 0.2);
  flake(9, 6, 3.6, 0.5);
  flake(1, -14, 2.8, 0.1);
  IK.sparkles(ctx, 7, '#ffffff', 23, 19, 0, -3, 1.1);
};
