// Erdmagier: Bodenriss und liegen bleibendes Geröll (seit 15.55)
//
// Nach dem Vorbild „ein Erdzauber, zehn Verbesserungen“: Bei den Erdspitzen rast zuerst ein glühender Riss vom Magier
// über den Boden zum Ziel, erst dann brechen dort die Dornen heraus. Nach den großen Einschlägen (Steinschlag,
// Erdspitzen, Bergsturz, Schwerkraft) bleibt Geröll ein paar Sekunden liegen und versinkt dann (mdebris3 mit rest,
// magier.js). Auf Grafik „Niedrig“ (Sparoptik) bleibt kein Geröll liegen und der Riss leuchtet nicht.

const RISS_T = 0.16;     // so lange braucht der Riss bis zum Ziel (s)
const RISS_HOLD = 1.1;   // so lange bleibt er sichtbar, danach schließt er sich in 0,4 s
const GEROELL_REST = 3;  // so lange liegt das Geröll (s)

function erdSpar() {
  return typeof sparOptik === 'function' ? sparOptik() : opts.graphics === 'niedrig';
}

function erdKlang(id, x, y, vol, rate, maxDur) {
  if (typeof sfxFiles === 'undefined' || !sfxFiles.has || !sfxFiles.has(id)) return;
  sfxFiles.play(id, { x, y, vol, rate, vary: 0.06, maxDur, grp: 'imp', rev: 0.2 });
}

// Geröll, das nach dem Einschlag liegen bleibt (n Brocken, Größe in Einheiten)
function geroell(x, y, n, size) {
  const rest = erdSpar() ? 0 : GEROELL_REST;
  addEffect({ type: 'mdebris3', x, y, n, size, dur: 0.9 + rest, rest });
}

// Zickzack-Punkte des Risses (Welt-Pixel), fest je Effekt
function rissPunkte(e) {
  if (e.pts) return e.pts;
  const dx = e.x - e.ox;
  const dy = e.y - e.oy;
  const len = hyp(dx, dy) || 1;
  const n = Math.max(5, Math.min(22, Math.round(len / 20)));
  const nx = -dy / len;
  const ny = dx / len;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    // seitlicher Versatz: an den Enden null, dazwischen gezackt
    const j = i === 0 || i === n ? 0 : mHash(i, e.seed) * 2 * Math.min(9, len * 0.04);
    pts.push(e.ox + dx * f + nx * j, e.oy + dy * f + ny * j);
  }
  return (e.pts = pts);
}

addEffectTypeRiss();
function addEffectTypeRiss() {
  FX3_TYPES.add('mriss3');
}

const _rissA = new THREE.Vector3();
const _rissB = new THREE.Vector3();
FX3_DRAW.mriss3 = function (h, e) {
  const t = game.time - e.start;
  const pts = rissPunkte(e);
  const n = pts.length / 2 - 1;
  const head = Math.min(n, (t / RISS_T) * n);
  const close = clamp01((t - RISS_T - RISS_HOLD) / 0.4);
  const w = 0.06 * (1 - close);
  if (w <= 0.002) return;
  const low = n3low();
  for (let i = 0; i < Math.ceil(head); i++) {
    const f = Math.min(1, head - i);
    _rissA.set(pts[i * 2] * U3, 0.03, pts[i * 2 + 1] * U3);
    _rissB.set((pts[i * 2] + (pts[i * 2 + 2] - pts[i * 2]) * f) * U3, 0.03, (pts[i * 2 + 1] + (pts[i * 2 + 3] - pts[i * 2 + 1]) * f) * U3);
    // dunkle Spalte, zur Mitte hin breiter
    const mid = 1 - Math.abs(i / n - 0.5) * 0.8;
    const dark = fx3Take(h, 'segD');
    fx3Segment(dark, _rissA, _rissB, w * (0.7 + 0.6 * mid));
    fx3Color(dark, '#140e0a', 0.95);
    if (low) continue;
    // Bernsteinglut in der Spalte, an der Spitze am hellsten, dahinter verglüht sie
    const age = t - (i / n) * RISS_T;
    const hot = Math.max(0, 1 - age / 0.7) * (1 - close);
    if (hot > 0.02) {
      const g = fx3Take(h, 'seg');
      _rissA.y = _rissB.y = 0.05;
      fx3Segment(g, _rissA, _rissB, w * 0.7);
      fx3Color(g, '#ffb04a', 0.9 * hot);
    }
  }
  // an der Spitze springt Staub und Glut aus dem Boden
  if (head < n && !low) {
    const i = Math.floor(head);
    const f = head - i;
    const hx = pts[i * 2] + (pts[i * 2 + 2] - pts[i * 2]) * f;
    const hz = pts[i * 2 + 1] + (pts[i * 2 + 3] - pts[i * 2 + 1]) * f;
    n3Glow(h, hx * U3, 0.15, hz * U3, 0.7, '#f0a830', 0.85);
    n3Smoke(h, hx * U3, 0.25, hz * U3, 0.5, '#6a5a50', 0.5);
  }
};

EXTRA_EFFECTS.mriss3 = (ctx, e) => {
  const t = game.time - e.start;
  const pts = rissPunkte(e);
  const n = pts.length / 2 - 1;
  const head = Math.min(n, (t / RISS_T) * n);
  const close = clamp01((t - RISS_T - RISS_HOLD) / 0.4);
  if (close >= 1) return;
  const draw = (color, width, alpha) => {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 1; i <= Math.ceil(head); i++) {
      const f = Math.min(1, head - i + 1);
      ctx.lineTo(pts[i * 2 - 2] + (pts[i * 2] - pts[i * 2 - 2]) * f, pts[i * 2 - 1] + (pts[i * 2 + 1] - pts[i * 2 - 1]) * f);
    }
    ctx.stroke();
  };
  draw('#140e0a', 3 * (1 - close), 0.9);
  const hot = Math.max(0, 1 - (t - RISS_T) / 0.7);
  if (hot > 0.02) {
    ctx.globalCompositeOperation = 'lighter';
    draw('#ffb04a', 1.4, 0.8 * hot);
  }
};

// Erdspitzen: erst der Riss vom Magier zum Ziel, dann die Dornen (Bild und Treffer für alle gleich verzögert)
if (typeof spikesFx === 'function') {
  const _spikesFx = spikesFx;
  spikesFx = function (owner, x, y, sk, local, pw) {
    let ox = owner ? owner.x : x;
    let oy = owner ? feetY(owner) : y;
    const d = hyp(x - ox, y + 9 - oy);
    if (d < 40) return _spikesFx(owner, x, y, sk, local, pw);
    // der Riss beginnt ein Stück vor den Füßen
    ox += ((x - ox) / d) * 14;
    oy += ((y + 9 - oy) / d) * 14;
    addEffect({ type: 'mriss3', ground: true, ox, oy, x, y: y + 9, seed: Math.random() * 100, dur: RISS_T + RISS_HOLD + 0.4 });
    // Klang in Schichten: ein kurzes, hohes Grollen läuft mit dem Riss, beim Ausbruch knirscht Fels
    erdKlang('beben', x, y, 0.42, 1.55, 0.55);
    later(RISS_T, () => {
      if (owner && owner.dead && local) return;
      _spikesFx(owner, x, y, sk, local, pw);
      geroell(x, y + 9, 7, 0.14);
      erdKlang('treffer_stein', x, y, 0.55, 0.78, 0.6);
    });
  };
}
