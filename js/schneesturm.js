// Frostmagier: Blizzard (seit 13.54, statt Kristallgrab). Am gewählten Ort ballt sich eine dunkle Sturmwolke,
// dann tobt darunter ein echter Schneesturm: dichter Schnee fällt schräg im Wind, dicke Flocken taumeln, schwere
// Schneebatzen schlagen auf und stäuben, Schneewirbel drehen sich durch den Kreis, und am Boden wächst eine
// Schneedecke. Bewusst KEIN Eis: keine Zapfen, keine Kristalle, keine Zacken – nur weiche Flocken und Pulver
// (der Blizzard des Schamanen zeigt Eisspitzen, dieser hier Schnee).
// Schaden zweimal pro Sekunde, die Verlangsamung wächst, solange ein Gegner im Sturm bleibt; der letzte Puls
// friert kurz ein (Bosse werden nur verlangsamt). Je Rang tobt der Sturm 0,5 s länger.
// Ablauf wie in feuerfeld.js: SKILL_TYPES (eigener Spieler), MAGE2_REMOTE (Mitspieler: nur Bild),
// EXTRA_EFFECTS (2D) und FX3_DRAW (3D).

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
    rg.addColorStop(0.72, 'rgba(160,180,215,0.32)');
    rg.addColorStop(1, 'rgba(160,180,215,0)');
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
    arms('rgba(70,95,140,0.45)', 3);
    arms('#ffffff', 0);
    g.save();
    g.filter = 'blur(1.6px)';
    g.drawImage(tmp, 0, 0);
    g.restore();
    g.globalAlpha = 0.6;
    g.drawImage(tmp, 0, 0);
    g.globalAlpha = 1;
  } else if (kind === 'puff' || kind === 'cloud') {
    // Schneebatzen und Wolkenbausch: viele weiche Kugeln übereinander, oben hell, unten leicht schattig (räumlich)
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
    sh.addColorStop(1, kind === 'cloud' ? 'rgba(70,80,100,0.75)' : 'rgba(120,145,190,0.6)');
    g.fillStyle = sh;
    g.fillRect(0, 0, S, S);
    g.globalCompositeOperation = 'source-over';
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
    // Schneedecke: weiche, fleckige Fläche mit unregelmäßigem Rand und leichten Verwehungen
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
      rg.addColorStop(0, 'rgba(170,195,230,0.45)');
      rg.addColorStop(1, 'rgba(170,195,230,0)');
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
          heavy: last, duelMul: sk.duelMul, vfxColor: '#d8e8ff'
        });
      }
    });
  }
}
MAGE2_REMOTE.msnow = (rp, sk, d) => snowFx(rp, d.tx ?? rp.x, d.ty ?? rp.y, sk, Number.isInteger(d.n) && d.n > 0 && d.n < 20 ? d.n : sk.ticks, d.sd || 1, false, 0, 1);

// Treffer: Schneepulver statt Eissplitter
if (SKILL_FX.schneesturm) {
  SKILL_FX.schneesturm.hit = (m) => {
    const c = bodyCenter(m);
    particles(c.x, c.y, { count: 3, color: ['#ffffff', '#eef4ff', '#d4e2f4'], speed: [30, 90], life: [0.35, 0.6], size: [2, 3.6], drag: 2.5, gravity: 60, glow: false });
  };
}

// --- 2D ----------------------------------------------------------------------------------------------------
EXTRA_EFFECTS.msnow3 = (ctx, e, k, x, y) => {
  const T = game.time - e.start;
  const on = clamp01(T / Math.max(0.05, e.delay));
  const out = clamp01((e.dur - T) / 0.8);
  const vis = on * out;
  const end = e.delay + e.ticks * e.every;
  ctx.save();
  // Schneedecke
  ctx.globalAlpha = 0.55 * vis * clamp01((T - e.delay) / 2);
  ctx.fillStyle = '#f4f8ff';
  ctx.beginPath();
  ctx.ellipse(x, y, e.R, e.R * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Sturmwolke
  ctx.globalAlpha = 0.75 * vis;
  const g = ctx.createRadialGradient(x - 20, y - 110, 4, x - 20, y - 110, e.R);
  g.addColorStop(0, 'rgba(60,68,88,0.95)');
  g.addColorStop(0.7, 'rgba(70,80,100,0.6)');
  g.addColorStop(1, 'rgba(70,80,100,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x - 20, y - 110, e.R, e.R * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Schnee schräg im Wind
  if (T > e.delay * 0.5 && T < end + 0.6) {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 60; i++) {
      const u = (T * (0.6 + 0.3 * n2h(i, 1)) + n2h(i, 2)) % 1;
      const a = n2h(i, 3) * Math.PI * 2;
      const d = Math.sqrt(n2h(i, 4)) * e.R;
      ctx.globalAlpha = 0.85 * vis * Math.min(1, u * 4);
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * d - (1 - u) * 50, y + Math.sin(a) * d * 0.7 - (1 - u) * 110, 1.5 + 2 * n2h(i, 5), 0, Math.PI * 2);
      ctx.fill();
    }
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
  const Y0 = 3.25; // Unterseite der Wolke: hier beginnt der Schneefall
  const D = 2.0; // Versatz im Wind während des Falls
  const gust = 1 + 0.3 * Math.sin(T * 1.4 + sd) + 0.15 * Math.sin(T * 3.7);
  // Schnee fällt nur, solange der Sturm tobt (Flocken in der Luft fallen noch zu Ende)
  const s0 = e.delay * 0.45;
  const s1 = end - 0.25;
  const snowK = clamp01((T - s0) / 0.5) * clamp01((end + 0.6 - T) / 0.6);

  // --- Boden: Wolkenschatten, Schneedecke, weicher Reifrand ---
  const shade = mGround(h, 'planeNSnowShade', 'disc', e.x - _snW.x * 20, e.y - _snW.z * 20, R * 1.35, 0.022, 0, '#0e1626', 0.4 * vis, true);
  shade.renderOrder = 3;
  // die Schneedecke wächst in die Höhe: Gras und Füße stecken bald im Schnee
  const cover = easeOut(clamp01((T - e.delay) / 2.4)) * out;
  const cv = snowGround(h, e.x, e.y, R * (0.55 + 0.5 * cover), 0.03 + 0.13 * cover, sd, '#f2f6fc', cover);
  if (cv) cv.renderOrder = 4;
  mGround(h, 'planeNSnowRim', 'ring', e.x, e.y, R / 0.92, 0.04, 0, '#d4e6ff', 0.4 * vis * (0.85 + 0.15 * Math.sin(T * 3)), true);

  // --- Sturmwolke: dunkle Bäusche ziehen sich zusammen und wälzen sich langsam ---
  const ccx = cx - _snW.x * 1.2;
  const ccz = cz - _snW.z * 1.2;
  const cn = low ? 10 : 22;
  for (let i = 0; i < cn; i++) {
    const top = i % 3 === 0;
    const a = n2h(i, 11) * Math.PI * 2 + T * 0.2 * (i % 2 ? 1 : -0.7) + (1 - gather) * 1.4;
    const r = Math.sqrt(n2h(i, 12)) * R * 0.95 * (1 + 0.9 * (1 - gather));
    const s = (1.9 + n2h(i, 14) * 1.5) * (0.55 + 0.45 * gather) * (1 + 0.06 * Math.sin(T * 2 + i));
    const y = 3.75 + (n2h(i, 13) - 0.5) * 0.5 + (top ? 0.45 : 0) + 0.08 * Math.sin(T * 1.5 + i);
    const col = top ? '#929eb6' : i % 2 ? '#3a4458' : '#56617a';
    snowSprite(h, 'cloud', ccx + Math.cos(a) * r, y, ccz + Math.sin(a) * r * 0.85, s, s * 0.8, col, 0.95 * vis, n2h(i, 15) * 0.6 - 0.3);
  }
  // Schneeschleier unter der Wolke (hier quillt der Schnee heraus)
  const vn = low ? 3 : 7;
  for (let i = 0; i < vn; i++) {
    const a = n2h(i, 21) * Math.PI * 2 + T * 0.35;
    const r = Math.sqrt(n2h(i, 22)) * R * 0.75;
    const s = 1.4 + n2h(i, 23) * 0.8;
    snowSprite(h, 'puff', ccx + Math.cos(a) * r + _snW.x * 0.4, 3.05 + 0.1 * Math.sin(T * 2 + i), ccz + Math.sin(a) * r * 0.8, s, s * 0.7, '#d6dfec', 0.32 * vis * snowK);
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

  // --- dichter Schneefall: zwei Punktwolken (feine und mittlere Flocken) ---
  const tanF = Math.tan(((V3.camera ? V3.camera.fov : 30) * Math.PI) / 360);
  for (const [kind, n, size, salt, tMin, tSpan, flut] of [['snowPtsA', low ? 180 : 520, 0.1, 30, 1.2, 0.5, 0.06], ['snowPtsB', low ? 60 : 170, 0.18, 40, 1.7, 0.7, 0.18]]) {
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
    pts.material.color.set('#f6f9ff').multiplyScalar(SNOW_DIM);
    pts.material.opacity = 0.95 * out;
  }

  // --- dicke, taumelnde Flocken (gefiederte Schneeflocken) ---
  const bn = low ? 12 : 30;
  for (let i = 0; i < bn; i++) {
    const f = fall(i, 50, 2.2 + 0.7 * n2h(i, 55), D * 0.85, 1.1);
    if (!f) continue;
    const s = 0.32 + 0.2 * n2h(i, 56);
    const wob = Math.sin(T * 2.2 + i * 1.7);
    // jede dritte als flauschiger Batzen statt gefiederter Flocke
    snowSprite(h, i % 3 ? 'flake' : 'puff', f.x + wob * 0.3, f.y, f.z + Math.cos(T * 1.8 + i) * 0.2, s * (i % 3 ? 1 : 0.8), s * (i % 3 ? 1 : 0.8), '#ffffff', 0.95 * Math.min(1, f.u * 6), T * (0.8 + n2h(i, 57)) * (i % 2 ? 1 : -1));
  }

  // --- schnelle Flocken als kurze Striche (zeigen den Wind) ---
  const fn = low ? 12 : 40;
  _snV.set(_snW.x * D * 1.4, -Y0, _snW.z * D * 1.4);
  const srot = snowScreenRot(_snV);
  for (let i = 0; i < fn; i++) {
    const f = fall(i, 60, 0.75 + 0.2 * n2h(i, 65), D * 1.4, 0.3);
    if (!f) continue;
    snowSprite(h, 'streak', f.x, f.y, f.z, 0.08 + 0.04 * n2h(i, 66), 0.75 + 0.3 * n2h(i, 67), '#ffffff', 0.85 * Math.min(1, f.u * 5), srot);
  }

  // --- schwere Schneebatzen: fallen schneller und stäuben beim Aufschlag ---
  const cl = low ? 4 : 10;
  for (let i = 0; i < cl; i++) {
    const fallT = 1.15 + 0.3 * n2h(i, 75);
    const f = fall(i, 70, fallT, D * 0.9, 0.5);
    if (f) {
      const s = 0.38 + 0.22 * n2h(i, 76);
      snowSprite(h, 'puff', f.x, f.y + s * 0.3, f.z, s, s, '#f4f8ff', 0.95 * Math.min(1, f.u * 5), T * 0.8 + i);
    }
    // Aufschlag des vorigen Batzens: Pulverwolke am Boden, ein paar Brocken spritzen weg
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
    snowSprite(h, 'puff', lx + _snW.x * v * 0.4, 0.18 + v * 0.35, lz, 0.5 + v * 1.3, (0.5 + v * 1.3) * 0.7, '#eef4ff', 0.8 * (1 - v));
    for (let j = 0; j < (low ? 1 : 3); j++) {
      const ja = j * 2.1 + prev;
      snowSprite(h, 'puff', lx + Math.cos(ja) * v * 0.9, 0.1 + Math.sin(v * Math.PI) * 0.4, lz + Math.sin(ja) * v * 0.6, 0.22, 0.22, '#ffffff', 0.9 * (1 - v));
    }
  }

  // --- Schneewirbel: Säulen aus wirbelndem Schnee ziehen durch den Kreis ---
  const sk = snowK * out;
  // (Bäusche, Flocken und Wischer entlang der Drehrichtung im Wechsel: so sieht man das Drehen auch im Standbild)
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
      const kind = q % 3;
      if (kind === 0) {
        _snV.set(-Math.sin(a), 0.15, Math.cos(a) * 0.8);
        snowSprite(h, 'streak', x, y, z, 0.1 + 0.05 * v, 0.45 + 0.5 * v, '#ffffff', 0.9 * op, snowScreenRot(_snV));
      } else if (kind === 1) {
        const s = 0.28 + 0.4 * v;
        snowSprite(h, 'puff', x, y, z, s, s * 0.8, '#f4f8ff', 0.85 * op, a);
      } else {
        const s = 0.28 + 0.14 * v;
        snowSprite(h, 'flake', x, y, z, s, s, '#ffffff', 0.95 * op, a);
      }
    }
  }
  // Schneeböen: weiße Wischer und Schwaden jagen dicht über dem Boden im Kreis herum
  const gn = low ? 6 : 16;
  for (let i = 0; i < gn; i++) {
    const a = n2h(i, 91) * Math.PI * 2 + T * (1.3 + 0.5 * n2h(i, 95));
    const r = R * (0.5 + 0.45 * n2h(i, 92));
    const x = cx + Math.cos(a) * r;
    const y = 0.3 + 0.7 * n2h(i, 94) + 0.1 * Math.sin(T * 3 + i);
    const z = cz + Math.sin(a) * r;
    if (i % 2) {
      _snV.set(-Math.sin(a), 0, Math.cos(a));
      snowSprite(h, 'streak', x, y, z, 0.12, 0.9 + 0.5 * n2h(i, 93), '#ffffff', 0.75 * sk, snowScreenRot(_snV));
    } else {
      const s = 0.45 + 0.35 * n2h(i, 93);
      snowSprite(h, 'puff', x, y * 0.6, z, s * 1.4, s * 0.65, '#eef4fc', 0.6 * sk);
    }
  }

  // --- letzter Puls: eine Schneewalze rollt vom Inneren nach außen (hier frieren die Gegner ein) ---
  const age = T - (e.delay + (e.ticks - 0.5) * e.every);
  if (age > 0 && age < 0.75) {
    const v = age / 0.75;
    const rr = R * (0.2 + 0.85 * easeOut(v));
    const wn = low ? 8 : 16;
    for (let i = 0; i < wn; i++) {
      const a = (i / wn) * Math.PI * 2 + sd;
      const s = 0.9 + 0.4 * n2h(i, 97);
      snowSprite(h, 'puff', cx + Math.cos(a) * rr, 0.3 + 0.25 * Math.sin(v * Math.PI), cz + Math.sin(a) * rr, s, s * 0.75, '#ffffff', 0.75 * (1 - v));
    }
  }
};

// --- Symbol ------------------------------------------------------------------------------------------------
// Blizzard: bauschige Sturmwolke (oben hell, Bauch dunkel), darunter dichter Schnee schräg im Wind mit Wischern,
// ein paar dicke, weiche Flocken und eine Schneewehe am Boden
SKILL_ART.schneesturm = function (ctx, IK) {
  IK.light(ctx, 2, 6, 20, '#9fd0ff', 0.3);
  // Schneewehe am Boden
  IK.fill(ctx, (c) => {
    c.moveTo(-21, 17);
    c.quadraticCurveTo(-13, 10, -3, 14.5);
    c.quadraticCurveTo(7, 9.5, 21, 14);
    c.lineTo(21, 24);
    c.lineTo(-21, 24);
    c.closePath();
  }, IK.lin(ctx, 0, 10, 0, 22, [[0, '#ffffff'], [0.45, '#dbe8fa'], [1, '#6f90c4']]), 1, 'rgba(8,16,40,0.85)');
  // Schnee im Wind: Wischer (schräg nach rechts unten), dann viele weiche Flocken
  const r = snowRnd(5);
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const x = -20 + r() * 34;
    const y = -5 + r() * 17;
    const L = 3 + r() * 4;
    ctx.globalAlpha = 0.35 + r() * 0.4;
    ctx.strokeStyle = '#eaf4ff';
    ctx.lineWidth = 0.7 + r() * 0.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + L * 0.55, y + L);
    ctx.stroke();
  }
  // Windböe: zwei weiße, sich verjüngende Bögen
  for (const [y0, k] of [[1, 1], [9, 0.8]]) {
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-19, y0);
    ctx.quadraticCurveTo(-6, y0 - 5 * k, 6, y0 - 1);
    ctx.quadraticCurveTo(13, y0 + 2 * k, 11, y0 + 5 * k);
    ctx.quadraticCurveTo(10, y0 + 1.2 * k, 5, y0 + 0.6);
    ctx.quadraticCurveTo(-6, y0 - 2.4 * k, -19, y0);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 34; i++) {
    const x = -20 + r() * 39;
    const y = -5 + r() * 21;
    const s = 0.55 + r() * 1.15;
    ctx.fillStyle = IK.rad(ctx, x - s * 0.35, y - s * 0.35, 0, s * 1.1, [[0, '#ffffff'], [0.6, '#f0f6ff'], [1, 'rgba(170,200,240,0.5)']]);
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // drei dicke, weiche Flocken (runde Arme, leicht geneigt)
  const flake = (x, y, s, a0) => IK.glow(ctx, '#d8ecff', 5, () => {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineCap = 'round';
    for (const [col, w] of [['rgba(30,60,120,0.55)', 0.5], ['#ffffff', 0.3]]) {
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
  flake(-11, 7, 4.2, 0.2);
  flake(10, 3, 3.4, 0.5);
  flake(0, 13, 2.6, 0.1);
  // Sturmwolke: ein Umriss aus Bäuschen (erst dunkel nachgezogen, dann gefüllt – innen keine Linien)
  const puffs = [[-12, -8, 5], [-5, -12.5, 6.2], [3.5, -13.5, 6], [10.5, -9, 5.4], [15, -5.5, 3.6], [-16, -4.8, 3.4], [0, -6.5, 6.5], [-8, -6.5, 4.5]];
  const cloud = (c) => {
    for (const [x, y, rr] of puffs) {
      c.moveTo(x + rr, y);
      c.arc(x, y, rr, 0, Math.PI * 2);
    }
    c.rect(-16, -5.5, 31, 4);
  };
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 3 * (ctx.getTransform().a || 1);
  ctx.shadowOffsetY = 1.2 * (ctx.getTransform().a || 1);
  ctx.beginPath();
  cloud(ctx);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = 'rgba(8,12,30,0.95)';
  ctx.stroke();
  ctx.restore();
  ctx.beginPath();
  cloud(ctx);
  ctx.fillStyle = IK.lin(ctx, 0, -20, 0, -1.5, [[0, '#dfe7f4'], [0.3, '#8e9cb8'], [0.65, '#4a5674'], [1, '#1e2640']]);
  ctx.fill();
  // Licht auf den oberen Bäuschen
  ctx.save();
  ctx.globalAlpha = 0.6;
  for (const [x, y, rr] of puffs.slice(0, 4)) {
    ctx.fillStyle = IK.rad(ctx, x - rr * 0.3, y - rr * 0.45, 0, rr * 0.8, [[0, 'rgba(255,255,255,0.9)'], [1, 'rgba(255,255,255,0)']]);
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Schnee quillt aus dem Bauch der Wolke
  for (let i = 0; i < 7; i++) {
    const x = -13 + i * 4.2 + r() * 1.5;
    IK.fill(ctx, (c) => c.arc(x, -0.8 + r() * 3, 0.55 + r() * 0.5, 0, Math.PI * 2), '#ffffff', 0);
  }
};
