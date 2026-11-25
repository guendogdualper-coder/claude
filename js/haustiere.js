'use strict';
// Haustiere (seit 15.83, docs/garderobe-haustiere-emotes.md): kleine Begleiter ohne Kampfwerte, die einem folgen.
// Zehn eigene Entwürfe, jeder mit eigener Bewegung (laufen, hüpfen, flattern, schweben) in 2D und 3D. Mitspieler sehen
// das gerufene Tier (Netzfeld pe); jedes Gerät lässt die Tiere der anderen selbst hinter ihrer Figur herlaufen.
// Fundorte: selten von Dungeon-Bossen, Endbossen und Weltbossen, aus Erfolgen, vom Winterfest (Schneeflocken) und aus
// der Tagesbelohnungs-Serie. Sammlung mit Rufen und Wegschicken: Charakterfenster → Sammlung → Haustiere.
// Spielstand: p.haustiere = { own: { id: Zeitpunkt }, aktiv: id oder '', neu: [ids, noch nicht angesehen] }.

const HST = {
  boss: 0.02, // Dungeon-Bosse (höchstens 10 Stufen unter dir)
  raid: 0.05, // Endbosse
  welt: 0.08, // Weltbosse
  abstand: 10, // Bosse höchstens so viele Stufen unter der eigenen
  winter: 150, // so viele Schneeflocken beim Winterfest gesammelt
  // Folgen: Platz schräg hinter der Figur, Tempo, ab welcher Entfernung das Tier nachspringt
  hinten: 22, seite: 17, tempo: 430, sprung: 560,
  andere: 8, andereNiedrig: 3, // so viele Tiere von Mitspielern höchstens im Bild (Grafik „Niedrig“ weniger)
  K3: 2.5, // 3D: Modelle in 2,5-facher Größe gebaut und klein gezeigt (dünnerer Umriss)
  gross3: 1.5 // 3D: so viel größer als die Maße der Bauanleitung (neben den großen 3D-Figuren gut zu erkennen)
};
if (typeof SAVE_FIELDS !== 'undefined' && !SAVE_FIELDS.includes('haustiere')) SAVE_FIELDS.push('haustiere');

// --- 2D: die Tiere als kleine Bilder (Seitenansicht nach rechts, Füße bei 0,0) ---------------------------------------
const HST_BOUNDS = { x: -18, y: -25, w: 36, h: 27 };
const hstSchritt = (f) => [0, 1, 0, -1][f % 4];
const HST_ART2D = {
  igelchen(ctx, f) {
    const s = hstSchritt(f);
    oval(ctx, -4 - s, -1.1, 1.8, 1.2, '#4a3426');
    oval(ctx, 3 + s, -1.1, 1.8, 1.2, '#4a3426');
    oval(ctx, 0.4, -4.4, 7.2, 4.1, '#d9b48a');
    const pts = [];
    const n = 14;
    for (let k = 0; k <= n; k++) {
      const a = Math.PI * (1.08 - (k / n) * 0.86);
      const r = k % 2 ? 8.6 : 6.3;
      pts.push([-1.2 + Math.cos(a) * r, -3.6 - Math.sin(a) * r * 0.86]);
    }
    pts.push([3.4, -3.4], [-1, -2.3], [-7, -2.5]);
    poly(ctx, pts, '#5a4030');
    for (let k = 1; k < n; k += 2) {
      const a = Math.PI * (1.08 - (k / n) * 0.86);
      dot(ctx, -1.2 + Math.cos(a) * 8.1, -3.6 - Math.sin(a) * 8.1 * 0.86, 0.55, 0.55, '#ecd8b8');
    }
    poly(ctx, [[3.4, -6.4], [9.6, -3.8], [3.8, -2.2]], '#e2c49c');
    dot(ctx, 9.4, -3.85, 0.95, 0.85, '#1e1410');
    dot(ctx, 5.4, -5.3, 0.85, 0.95, '#1e1410');
    dot(ctx, 5.2, -5.6, 0.3, 0.3, '#ffffff');
    oval(ctx, 3.4, -7.1, 1.3, 1.1, '#c8a07a');
  },
  eulenkueken(ctx, f) {
    const up = f % 2 === 1;
    if (!up) {
      stroke(ctx, '#e08a2a', 0.7, [[-1.6, -0.2], [-1.2, -1.4], [-0.6, -0.2]]);
      stroke(ctx, '#e08a2a', 0.7, [[1.8, -0.2], [2.2, -1.4], [2.8, -0.2]]);
    }
    if (up) poly(ctx, [[-2.4, -8.6], [-9.4, -12], [-8.4, -7.2], [-3.4, -4.8]], '#8a7e72');
    oval(ctx, 0, -6.6, 6, 6.4, '#a49a8e');
    oval(ctx, 1.4, -5.6, 4, 4.6, '#e6ddd0');
    for (const [x, y] of [[0.4, -6.8], [2.6, -5.6], [1, -3.9]]) stroke(ctx, '#bcb2a4', 0.5, [[x - 0.8, y], [x, y + 0.6], [x + 0.8, y]]);
    if (!up) oval(ctx, -2.8, -6.2, 2.3, 3.8, '#8a7e72');
    poly(ctx, [[-1.4, -11.4], [-0.8, -14.6], [0.9, -12.2]], '#8a7e72');
    poly(ctx, [[3.4, -12.3], [5.4, -14.4], [5.8, -11.6]], '#8a7e72');
    oval(ctx, 2.4, -9.5, 4.5, 3.5, '#d8cfc2');
    for (const x of [0.6, 4.2]) {
      oval(ctx, x, -9.7, 1.8, 1.9, '#f6d24a');
      dot(ctx, x + 0.25, -9.7, 1.05, 1.15, '#1a1410');
      dot(ctx, x + 0.55, -10.2, 0.38, 0.38, '#ffffff');
    }
    poly(ctx, [[1.9, -8.5], [3.1, -8.5], [2.5, -6.8]], '#e08a2a');
  },
  laternenkaefer(ctx, f) {
    const up = f % 2 === 0;
    for (const x of [-0.6, 1.4, 3]) stroke(ctx, '#1e2a24', 0.5, [[x, -3.2], [x - 0.7, -1.4], [x - 0.3, -0.8]]);
    oval(ctx, -3.6, -4, 3.7, 3, '#ffc24a');
    oval(ctx, -3.9, -4.1, 2.3, 1.9, '#fff2a8');
    poly(ctx, [[-1.4, -7.2], [3, -6.8], [4.3, -4.4], [1, -2.6], [-2.4, -4.1]], '#2a4a3a');
    stroke(ctx, '#5a9a7a', 0.45, [[-0.6, -6.4], [2.8, -5.8]]);
    oval(ctx, 4.8, -4.6, 1.9, 1.7, '#1e2a24');
    dot(ctx, 5.8, -5, 0.6, 0.6, '#bfffd0');
    stroke(ctx, '#1e2a24', 0.45, [[5.4, -6], [6.8, -8.6], [8.2, -9]]);
    stroke(ctx, '#1e2a24', 0.45, [[4.8, -6.1], [5.2, -8.8], [6.4, -9.8]]);
    ctx.save();
    ctx.globalAlpha *= 0.6;
    if (up) poly(ctx, [[0, -6.6], [-3.6, -12.6], [2, -11.6], [2.2, -6.8]], '#d8f0ff');
    else poly(ctx, [[0, -5.8], [-6, -7.6], [-4.4, -3.8], [1.2, -4.8]], '#d8f0ff');
    ctx.restore();
  },
  fuchsjunges(ctx, f) {
    const s = hstSchritt(f);
    const fur = '#d8742c';
    const cream = '#f6ecdc';
    const sock = '#3a2418';
    const bein = (x, dark) => {
      box(ctx, x, -4.6, 2, 4.4, 0.9, dark ? darker(fur, 0.18) : fur);
      box(ctx, x - 0.1, -1.6, 2.2, 1.6, 0.7, sock);
    };
    bein(-5.2 + s * 1.3, true);
    bein(2.8 - s * 1.3, true);
    poly(ctx, [[-5.6, -6.8], [-10.8, -10.2], [-13.6, -8.2], [-11.6, -5.2], [-6.2, -4.6]], fur);
    oval(ctx, -12.8, -8.6, 1.9, 1.7, cream);
    oval(ctx, -0.8, -6.2, 6.4, 3.5, fur);
    oval(ctx, 1.2, -4.6, 4, 1.6, cream);
    bein(-3.4 - s * 1.3, false);
    bein(4.4 + s * 1.3, false);
    poly(ctx, [[3.2, -11.2], [3.6, -15.8], [6.2, -11.8]], fur);
    poly(ctx, [[5.8, -11.6], [7.6, -15.6], [8.4, -11]], fur);
    poly(ctx, [[6.4, -12], [7.5, -14.6], [7.9, -11.6]], '#3a2418');
    oval(ctx, 5.8, -9.2, 3.8, 3.3, fur);
    poly(ctx, [[7.4, -9.6], [11.8, -8.2], [7.8, -6.6]], cream);
    oval(ctx, 6.6, -7.7, 1.9, 1.2, cream);
    dot(ctx, 11.6, -8.25, 0.85, 0.75, '#1e1410');
    dot(ctx, 7.3, -9.8, 0.8, 0.95, '#1e1410');
    dot(ctx, 7.5, -10.1, 0.3, 0.3, '#ffffff');
  },
  glutsalamander(ctx, f) {
    const s = hstSchritt(f);
    const skin = '#4a1c16';
    const leg = darker(skin, 0.25);
    for (const [x, ph] of [[-4.4, 1], [4, -1]]) {
      box(ctx, x + s * ph * 1.4, -2.8, 1.6, 2.8, 0.7, leg);
      dot(ctx, x + s * ph * 1.4 + 1.6, -0.4, 0.7, 0.4, leg);
    }
    poly(ctx, [[-5, -4.8], [-9, -5.4 + s * 0.5], [-13.5, -4.2 + s], [-16, -2.6 + s], [-13, -2.8 + s * 0.8], [-8.6, -2.6], [-5, -2.4]], skin);
    oval(ctx, 0, -3.7, 6.4, 2.4, skin);
    oval(ctx, 7.2, -4.1, 3, 2.1, skin);
    for (const [x, ph] of [[-2.6, -1], [5, 1]]) {
      box(ctx, x + s * ph * 1.4, -2.6, 1.6, 2.6, 0.7, darker(skin, 0.1));
      dot(ctx, x + s * ph * 1.4 + 1.6, -0.4, 0.7, 0.4, darker(skin, 0.1));
    }
    for (const [x, y, r] of [[-3, -4.7, 1], [0.4, -5.1, 1.1], [3.4, -4.7, 0.9], [-7.8, -4.5, 0.7], [-11.4, -3.6, 0.55], [7, -5.3, 0.6]]) {
      dot(ctx, x, y, r, r * 0.8, '#ff8a2a');
      dot(ctx, x, y, r * 0.5, r * 0.4, '#ffd27a');
    }
    dot(ctx, 8.6, -4.9, 0.75, 0.75, '#ffd34d');
    dot(ctx, 8.75, -4.9, 0.3, 0.55, '#1a0a06');
    stroke(ctx, '#2a0c08', 0.4, [[8.4, -3.1], [10, -3.4]]);
  },
  kristallgeist(ctx, f) {
    const a = f % 2 ? 0.7 : -0.5;
    poly(ctx, [[-7, -9 + a], [-6, -11.6 + a], [-5.1, -9 + a], [-6, -7.2 + a]], '#a8ecff');
    poly(ctx, [[0, -17], [4.6, -10.6], [3.8, -4], [0, -0.4], [-3.8, -4], [-4.6, -10.6]], '#7fd8f0');
    poly(ctx, [[0, -17], [4.6, -10.6], [0.6, -9.4]], '#c8f4ff');
    poly(ctx, [[0, -0.4], [3.8, -4], [0.6, -9.4]], '#4aa8d0');
    stroke(ctx, '#e8fcff', 0.4, [[0, -16.6], [0.6, -9.4], [0, -0.8]]);
    dot(ctx, -1.3, -9, 0.75, 1, '#14304a');
    dot(ctx, 1.7, -9, 0.75, 1, '#14304a');
    stroke(ctx, '#14304a', 0.45, [[-0.6, -6.9], [0.25, -6.3], [1.1, -6.9]]);
    poly(ctx, [[5.4, -5 - a], [6.2, -7.2 - a], [7, -5 - a], [6.2, -3.4 - a]], '#a8ecff');
  },
  schneehase(ctx, f) {
    const sprung = f % 2 === 1;
    const white = '#f2f5fa';
    const shade = '#d6dde8';
    const tip = '#7a8698';
    const pink = '#f2b8c4';
    if (sprung) {
      oval(ctx, -5.8, -3.6, 3.8, 1.6, shade);
      oval(ctx, 0, -6.2, 6.4, 4, white);
      oval(ctx, 5.2, -3.4, 1.4, 2.4, white);
    } else {
      oval(ctx, -3, -2.2, 4.4, 2.2, shade);
      oval(ctx, -0.6, -5.6, 5.4, 5, white);
      oval(ctx, 3.4, -1.6, 1.4, 1.6, white);
    }
    oval(ctx, sprung ? -6.6 : -5.8, sprung ? -7.6 : -6.6, 1.7, 1.7, '#ffffff');
    const hx = sprung ? 6.4 : 4;
    const hy = sprung ? -9.4 : -10.8;
    const ohr = (dx, col) => {
      poly(ctx, [[hx - 1.6 + dx, hy - 2], [hx - 4.6 + dx, hy - 9.6], [hx - 2.4 + dx, hy - 10.2], [hx - 0.2 + dx, hy - 2.6]], col);
      poly(ctx, [[hx - 4.2 + dx, hy - 8.6], [hx - 4.6 + dx, hy - 9.6], [hx - 2.4 + dx, hy - 10.2], [hx - 2.3 + dx, hy - 9]], tip);
    };
    ohr(-1.2, shade);
    oval(ctx, hx, hy, 3.5, 3.1, white);
    ohr(0.6, white);
    poly(ctx, [[hx - 1.1, hy - 3], [hx - 3.4, hy - 8.4], [hx - 2.6, hy - 8.6], [hx - 0.6, hy - 3.2]], pink);
    dot(ctx, hx + 1.3, hy - 0.4, 0.9, 1.05, '#2a2430');
    dot(ctx, hx + 1.55, hy - 0.8, 0.32, 0.32, '#ffffff');
    dot(ctx, hx + 3.3, hy + 0.6, 0.6, 0.5, pink);
  },
  mondmotte(ctx, f) {
    // von vorn oben: Flügelpaare links und rechts (Bild 0 ausgebreitet, Bild 1 hochgeschlagen), Leib in der Mitte
    const auf = f % 2 === 0;
    const wing = '#cfeedd';
    const hind = '#b8dcd0';
    const spot = '#8a6ab8';
    const body = '#f4eee4';
    for (const sx of [-1, 1]) {
      const X = (x) => x * sx;
      if (auf) {
        poly(ctx, [[X(0.8), -6.6], [X(7.4), -4.6], [X(8.2), -1.6], [X(3.4), -3.4]], hind);
        poly(ctx, [[X(0.8), -8], [X(5.4), -14.2], [X(10.6), -12.8], [X(9.4), -7.6], [X(1.4), -6.6]], wing);
        oval(ctx, X(6.4), -10.6, 1.7, 1.7, spot);
        dot(ctx, X(6.4), -10.6, 0.7, 0.7, '#f4eee4');
      } else {
        poly(ctx, [[X(0.8), -6.8], [X(4.4), -5.4], [X(4.8), -2.8], [X(2), -4.2]], hind);
        poly(ctx, [[X(0.8), -8.2], [X(2.6), -16.6], [X(6.4), -16.2], [X(5.4), -9.4], [X(1.4), -6.8]], wing);
        oval(ctx, X(3.8), -12.8, 1.2, 1.5, spot);
        dot(ctx, X(3.8), -12.8, 0.5, 0.6, '#f4eee4');
      }
      stroke(ctx, '#c8a878', 0.5, [[X(0.5), -10.6], [X(1.6), -13.2], [X(3), -14]]);
      for (const [x, y] of [[1.1, -11.8], [1.6, -12.8], [2.3, -13.6]]) stroke(ctx, '#c8a878', 0.35, [[X(x), y], [X(x + 0.8), y + 0.3]]);
    }
    oval(ctx, 0, -5.2, 1.6, 3.4, body);
    for (const y of [-6.4, -5, -3.6]) stroke(ctx, '#d8ccb8', 0.4, [[-1.3, y], [1.3, y]]);
    oval(ctx, 0, -8.6, 2, 1.9, body);
    oval(ctx, 0, -10.4, 1.4, 1.3, '#e8dcc8');
    dot(ctx, -0.6, -10.5, 0.42, 0.5, '#1a1410');
    dot(ctx, 0.6, -10.5, 0.42, 0.5, '#1a1410');
  },
  pilzling(ctx, f) {
    const s = hstSchritt(f);
    oval(ctx, -1.8 + s * 0.8, -0.9, 1.7, 1, '#8a6a4a');
    oval(ctx, 2 - s * 0.8, -0.9, 1.7, 1, '#8a6a4a');
    box(ctx, -3.2, -8.2, 6.6, 7.6, 2.6, '#efe4cc');
    oval(ctx, 3.7, -4.4 + s * 0.5, 1, 1.4, '#efe4cc');
    dot(ctx, 1, -5.6, 0.6, 0.8, '#2a1e18');
    dot(ctx, 2.9, -5.6, 0.6, 0.8, '#2a1e18');
    dot(ctx, 0.2, -4.4, 0.7, 0.4, '#f0a898');
    stroke(ctx, '#2a1e18', 0.4, [[1.4, -4.2], [2, -3.8], [2.6, -4.2]]);
    paintShape(ctx, () => { ctx.beginPath(); ctx.ellipse(0, -7.4, 7.8, 6.4, 0, Math.PI, 0); ctx.closePath(); }, '#c8342a', -7.8, -13.8, 15.6, 6.4);
    for (const [x, y, r] of [[-3.8, -10.4, 1.25], [0.6, -12.2, 1.4], [4.3, -9.7, 1.1], [-1.4, -8.8, 0.8]]) dot(ctx, x, y, r, r * 0.8, '#f6eee0');
    stroke(ctx, '#8a2018', 0.6, [[-7.6, -7.5], [7.6, -7.5]]);
  },
  wolkenschaf(ctx, f) {
    const s = f % 2 ? 0.45 : -0.45;
    for (const [x, k] of [[-3.6, 1], [-1.2, -1], [1.8, 1], [4, -1]]) box(ctx, x, -3.8 + s * k, 1.2, 3.4, 0.5, '#3a3438');
    for (const [x, y, r] of [[-5, -7.2, 3.2], [-2, -9.6, 3.6], [1.8, -9.8, 3.4], [4.4, -7.6, 3], [-4, -5.2, 2.6], [3.6, -5.2, 2.6], [0, -6.2, 4.4]]) oval(ctx, x, y, r, r * 0.9, '#f4f4f8');
    oval(ctx, 6.6, -8.4, 2.6, 2.2, '#3a3438');
    oval(ctx, 5.2, -10.3, 1.3, 0.7, '#3a3438');
    dot(ctx, 7.4, -8.9, 0.65, 0.75, '#ffffff');
    dot(ctx, 7.6, -8.9, 0.32, 0.42, '#1a1418');
    oval(ctx, 5.6, -10.8, 1.7, 1.3, '#f4f4f8');
  }
};

// --- 3D: Modelle (Blick nach +z), Knochen wie unten; in HST.K3-facher Größe gebaut ------------------------------------
// 0 Wurzel, 1 Körper, 2 Kopf, 3–6 Beine (vorn links, vorn rechts, hinten links, hinten rechts), 7 Schwanz,
// 8/9 Flügel bzw. Splitter links/rechts, 10 Ohren
const HB = { root: 0, body: 1, head: 2, vl: 3, vr: 4, hl: 5, hr: 6, tail: 7, fl: 8, fr: 9, ohr: 10 };
function hstRig(o) {
  const K = HST.K3;
  const s = (v) => v.map((x) => x * K);
  const by = o.by;
  const hp = o.head;
  const lx = o.lx || 0.05;
  const ly = o.ly != null ? o.ly : by * 0.75;
  const w = o.w || [0.04, by + 0.04, 0];
  return rigOf([
    [[0, 0, 0], -1],
    [s([0, by, 0]), 0],
    [s(hp), 1],
    [s([lx, ly, o.lzf != null ? o.lzf : 0.07]), 1], [s([-lx, ly, o.lzf != null ? o.lzf : 0.07]), 1],
    [s([lx, ly, o.lzb != null ? o.lzb : -0.07]), 1], [s([-lx, ly, o.lzb != null ? o.lzb : -0.07]), 1],
    [s(o.tail || [0, by, -0.14]), 1],
    [s(w), 1], [s([-w[0], w[1], w[2]]), 1],
    [s([hp[0], hp[1] + 0.05, hp[2]]), 2]
  ]);
}
// Teile in HST.K3-facher Größe anfügen (Lage, Drehung, Größe aus o wie bei adder)
function hstAdder(b) {
  const SK = new THREE.Matrix4().makeScale(HST.K3, HST.K3, HST.K3);
  return (geo, color, o = {}) => {
    const oo = Object.assign({ noShadow: true }, o, { m: SK.clone().multiply(partMatrix(o)) });
    return b.add(geo, color, oo);
  };
}
const hstOkta = () => geo3('hst:okta', () => new THREE.OctahedronGeometry(1, 0));
const HST_BAU3 = {
  igelchen(b) {
    const A = hstAdder(b);
    const rig = hstRig({ by: 0.1, head: [0, 0.11, 0.13], lx: 0.06, lzf: 0.07, lzb: -0.07, tail: [0, 0.09, -0.15] });
    A(ball(12), '#d9b48a', { bone: HB.body, p: [0, 0.1, 0.02], s: [0.11, 0.085, 0.15] });
    A(cap3(0.16, Math.PI * 0.55), '#5a4030', { bone: HB.body, p: [0, 0.075, -0.025], s: [0.95, 0.95, 1.12], shade: 0.15 });
    for (let i = 0; i < 3; i++) {
      const th = 0.3 + i * 0.36;
      const n = 7 + i * 3;
      for (let j = 0; j < n; j++) {
        const ph = (j / n) * Math.PI * 2;
        const d = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph) - 0.25];
        if (d[2] > 0.45) continue;
        const p = [d[0] * 0.15, 0.075 + d[1] * 0.15, -0.025 + d[2] * 0.17];
        pointAt3(A, horn3(0.07, 0.016, 5), (i + j) % 3 ? '#4a3426' : '#8a6a4a', p, [d[0], d[1] + 0.2, d[2] - 0.5], { bone: HB.body });
      }
    }
    pointAt3(A, horn3(0.09, 0.045, 8), '#e2c49c', [0, 0.1, 0.12], [0, -0.15, 1], { bone: HB.head });
    A(sphere3(0.017, 6, 4), '#1e1410', { bone: HB.head, p: [0, 0.088, 0.21] });
    for (const sx of [-1, 1]) {
      A(sphere3(0.014, 6, 4), '#1e1410', { bone: HB.head, p: [sx * 0.04, 0.13, 0.15] });
      A(ball(6), '#c8a07a', { bone: HB.ohr, p: [sx * 0.06, 0.16, 0.1], s: [0.022, 0.02, 0.01] });
    }
    for (const [bn, x, z] of [[HB.vl, 0.06, 0.07], [HB.vr, -0.06, 0.07], [HB.hl, 0.06, -0.07], [HB.hr, -0.06, -0.07]]) A(ball(6), '#4a3426', { bone: bn, p: [x, 0.02, z], s: [0.026, 0.02, 0.036] });
    return { rig, height: 0.27 * HST.K3, family: 'pet', blob: 0.26 * HST.K3 };
  },
  eulenkueken(b) {
    const A = hstAdder(b);
    const plum = '#a49a8e';
    const wing = '#8a7e72';
    const rig = hstRig({ by: 0.14, head: [0, 0.25, 0.01], lx: 0.035, ly: 0.03, lzf: 0.03, lzb: 0.03, w: [0.09, 0.19, 0] });
    A(ball(14), plum, { bone: HB.body, p: [0, 0.14, 0], s: [0.105, 0.115, 0.1], top: darker(plum, 0.12), topK: 0.4 });
    A(ball(12), '#e6ddd0', { bone: HB.body, p: [0, 0.125, 0.045], s: [0.078, 0.085, 0.065] });
    A(ball(14), plum, { bone: HB.head, p: [0, 0.27, 0.01], s: [0.1, 0.088, 0.09] });
    A(ball(12), '#d8cfc2', { bone: HB.head, p: [0, 0.262, 0.055], s: [0.082, 0.064, 0.045] });
    for (const sx of [-1, 1]) {
      A(sphere3(0.027, 10, 8), '#f6d24a', { bone: HB.head, p: [sx * 0.036, 0.27, 0.088] });
      A(sphere3(0.016, 8, 6), '#1a1410', { bone: HB.head, p: [sx * 0.036, 0.27, 0.107] });
      A(sphere3(0.006, 5, 4), '#ffffff', { bone: HB.head, p: [sx * 0.03, 0.279, 0.12], mat: 'glow' });
      pointAt3(A, horn3(0.05, 0.02, 5), wing, [sx * 0.055, 0.335, 0.0], [sx * 0.35, 1, -0.05], { bone: HB.ohr });
      A(ball(10), wing, { bone: sx > 0 ? HB.fl : HB.fr, p: [sx * 0.098, 0.15, -0.01], s: [0.026, 0.07, 0.058] });
      A(ball(6), '#e08a2a', { bone: sx > 0 ? HB.vl : HB.vr, p: [sx * 0.035, 0.012, 0.035], s: [0.024, 0.01, 0.032] });
    }
    pointAt3(A, horn3(0.035, 0.012, 5), '#e08a2a', [0, 0.25, 0.098], [0, -0.7, 1], { bone: HB.head });
    return { rig, height: 0.36 * HST.K3, family: 'pet', blob: 0.2 * HST.K3 };
  },
  laternenkaefer(b) {
    const A = hstAdder(b);
    const dark = '#1e2a24';
    const rig = hstRig({ by: 0.08, head: [0, 0.085, 0.09], lx: 0.03, w: [0.025, 0.115, 0.01] });
    A(ball(10), '#2a4a3a', { bone: HB.body, p: [0, 0.095, 0.02], s: [0.052, 0.036, 0.066], shine: 0.8 });
    A(ball(10), '#ffc24a', { bone: HB.body, p: [0, 0.08, -0.066], s: [0.048, 0.042, 0.058], mat: 'glow' });
    A(ball(8), '#fff2a8', { bone: HB.body, p: [0, 0.08, -0.07], s: [0.03, 0.028, 0.038], mat: 'glow' });
    A(ball(8), dark, { bone: HB.head, p: [0, 0.087, 0.09], s: [0.028, 0.026, 0.028] });
    for (const sx of [-1, 1]) {
      A(sphere3(0.008, 6, 4), '#bfffd0', { bone: HB.head, p: [sx * 0.017, 0.096, 0.11], mat: 'glow' });
      A(tube3([[sx * 0.012, 0.105, 0.1], [sx * 0.03, 0.15, 0.14], [sx * 0.05, 0.16, 0.165]], 0.004, 0.003, 6, 4), dark, { bone: HB.head });
      A(ball(8), '#d8f0ff', { bone: sx > 0 ? HB.fl : HB.fr, p: [sx * 0.075, 0.118, -0.005], s: [0.068, 0.005, 0.034], mat: 'aura' });
      for (const z of [-0.025, 0.012, 0.045]) limbBetween(A, [sx * 0.03, 0.07, z], [sx * 0.055, 0.035, z + 0.01], 0.005, 0.004, dark, { bone: HB.body, seg: 4 });
    }
    return { rig, height: 0.2 * HST.K3, family: 'pet', blob: 0.12 * HST.K3 };
  },
  fuchsjunges(b) {
    const A = hstAdder(b);
    const fur = '#d8742c';
    const cream = '#f6ecdc';
    const sock = '#3a2418';
    const rig = hstRig({ by: 0.19, head: [0, 0.26, 0.13], lx: 0.045, ly: 0.15, lzf: 0.08, lzb: -0.08, tail: [0, 0.21, -0.12] });
    A(ball(12), fur, { bone: HB.body, p: [0, 0.19, 0], s: [0.072, 0.075, 0.14], top: darker(fur, 0.15), topK: 0.5 });
    A(ball(10), cream, { bone: HB.body, p: [0, 0.165, 0.07], s: [0.052, 0.05, 0.065] });
    for (const [bn, x, z] of [[HB.vl, 0.045, 0.08], [HB.vr, -0.045, 0.08], [HB.hl, 0.045, -0.08], [HB.hr, -0.045, -0.08]]) {
      A(limb3(0.13, 0.022, 0.019, 7), fur, { bone: bn, p: [x, 0.15, z] });
      A(ball(6), sock, { bone: bn, p: [x, 0.02, z + 0.006], s: [0.023, 0.02, 0.03] });
    }
    A(ball(12), fur, { bone: HB.head, p: [0, 0.27, 0.14], s: [0.082, 0.072, 0.078] });
    pointAt3(A, horn3(0.08, 0.038, 8), cream, [0, 0.255, 0.19], [0, -0.1, 1], { bone: HB.head });
    A(sphere3(0.014, 6, 4), '#1e1410', { bone: HB.head, p: [0, 0.248, 0.27] });
    for (const sx of [-1, 1]) {
      A(sphere3(0.014, 6, 4), '#1e1410', { bone: HB.head, p: [sx * 0.034, 0.285, 0.2] });
      A(ball(6), cream, { bone: HB.head, p: [sx * 0.045, 0.252, 0.18], s: [0.03, 0.02, 0.024] });
      pointAt3(A, horn3(0.085, 0.03, 6), fur, [sx * 0.045, 0.32, 0.12], [sx * 0.35, 1, -0.1], { bone: HB.ohr });
      pointAt3(A, horn3(0.05, 0.017, 5), sock, [sx * 0.047, 0.336, 0.13], [sx * 0.35, 1, -0.1], { bone: HB.ohr });
    }
    A(tube3([[0, 0.21, -0.12], [0, 0.27, -0.21], [0, 0.29, -0.29]], 0.04, 0.03, 10, 7), fur, { bone: HB.tail });
    A(ball(8), cream, { bone: HB.tail, p: [0, 0.295, -0.3], s: [0.034, 0.034, 0.04] });
    return { rig, height: 0.38 * HST.K3, family: 'pet', blob: 0.3 * HST.K3 };
  },
  glutsalamander(b) {
    const A = hstAdder(b);
    const skin = '#4a1c16';
    const rig = hstRig({ by: 0.06, head: [0, 0.065, 0.18], lx: 0.05, ly: 0.05, lzf: 0.1, lzb: -0.06, tail: [0, 0.06, -0.11] });
    A(ball(12), skin, { bone: HB.body, p: [0, 0.06, 0.03], s: [0.058, 0.04, 0.15], top: darker(skin, 0.12), topK: 0.5 });
    A(ball(10), skin, { bone: HB.head, p: [0, 0.065, 0.2], s: [0.048, 0.034, 0.064] });
    A(tube3([[0, 0.06, -0.1], [0.03, 0.05, -0.2], [0, 0.04, -0.3], [-0.04, 0.035, -0.36]], 0.034, 0.008, 12, 7), skin, { bone: HB.tail });
    for (const [bn, sx, z] of [[HB.vl, 1, 0.1], [HB.vr, -1, 0.1], [HB.hl, 1, -0.06], [HB.hr, -1, -0.06]]) {
      limbBetween(A, [sx * 0.045, 0.05, z], [sx * 0.1, 0.012, z + 0.02], 0.016, 0.013, darker(skin, 0.15), { bone: bn, seg: 5 });
      A(ball(6), darker(skin, 0.2), { bone: bn, p: [sx * 0.105, 0.008, z + 0.025], s: [0.022, 0.008, 0.022] });
    }
    for (const [x, y, z, r] of [[0.03, 0.09, 0.08, 0.017], [-0.03, 0.095, 0, 0.019], [0.025, 0.092, -0.07, 0.015], [0, 0.07, -0.2, 0.011], [-0.012, 0.058, -0.29, 0.008], [0.02, 0.088, 0.2, 0.011], [-0.02, 0.088, 0.19, 0.009]]) {
      A(sphere3(r, 6, 4), '#ff8a2a', { bone: z > 0.15 ? HB.head : z < -0.12 ? HB.tail : HB.body, p: [x, y, z], mat: 'glow' });
    }
    for (const sx of [-1, 1]) A(sphere3(0.011, 6, 4), '#ffd34d', { bone: HB.head, p: [sx * 0.034, 0.083, 0.235], mat: 'glow' });
    return { rig, height: 0.14 * HST.K3, family: 'pet', blob: 0.28 * HST.K3 };
  },
  kristallgeist(b) {
    const A = hstAdder(b);
    const rig = hstRig({ by: 0.2, head: [0, 0.22, 0.04], w: [0.16, 0.24, 0] });
    A(hstOkta(), '#3a9ed0', { bone: HB.body, p: [0, 0.2, 0], s: [0.09, 0.17, 0.09], shine: 1 });
    A(hstOkta(), '#1e5a80', { bone: HB.body, p: [0, 0.2, 0], s: [0.104, 0.19, 0.104], mat: 'aura' });
    A(hstOkta(), '#bff4ff', { bone: HB.body, p: [0.022, 0.25, 0.04], s: [0.02, 0.05, 0.02], mat: 'glow' });
    for (const sx of [-1, 1]) {
      A(sphere3(0.012, 6, 4), '#14304a', { bone: HB.head, p: [sx * 0.024, 0.228, 0.062] });
      A(hstOkta(), '#a8ecff', { bone: sx > 0 ? HB.fl : HB.fr, p: [sx * 0.16, 0.24, 0], s: [0.024, 0.044, 0.024], mat: 'glow' });
    }
    A(torus3(0.016, 0.004, Math.PI, 3, 8), '#14304a', { bone: HB.head, p: [0, 0.206, 0.062], r: [0, 0, Math.PI] });
    return { rig, height: 0.4 * HST.K3, family: 'pet', blob: 0.18 * HST.K3 };
  },
  schneehase(b) {
    const A = hstAdder(b);
    const white = '#f2f5fa';
    const rig = hstRig({ by: 0.12, head: [0, 0.22, 0.09], lx: 0.05, ly: 0.06, lzf: 0.08, lzb: -0.05, tail: [0, 0.14, -0.12] });
    A(ball(12), white, { bone: HB.body, p: [0, 0.125, -0.01], s: [0.092, 0.1, 0.13], shade: 0.15 });
    A(ball(12), white, { bone: HB.head, p: [0, 0.22, 0.1], s: [0.068, 0.062, 0.074] });
    for (const sx of [-1, 1]) {
      limbBetween(A, [sx * 0.028, 0.26, 0.085], [sx * 0.06, 0.42, 0.05], 0.022, 0.017, white, { bone: HB.ohr });
      A(ball(6), '#7a8698', { bone: HB.ohr, p: [sx * 0.061, 0.426, 0.05], s: [0.017, 0.024, 0.015] });
      A(sphere3(0.013, 6, 4), '#2a2430', { bone: HB.head, p: [sx * 0.044, 0.235, 0.148] });
      A(ball(8), white, { bone: sx > 0 ? HB.vl : HB.vr, p: [sx * 0.04, 0.03, 0.1], s: [0.022, 0.03, 0.026] });
      A(ball(8), '#dfe6ef', { bone: sx > 0 ? HB.hl : HB.hr, p: [sx * 0.06, 0.032, -0.04], s: [0.03, 0.03, 0.07] });
    }
    A(sphere3(0.01, 6, 4), '#f2b8c4', { bone: HB.head, p: [0, 0.22, 0.174] });
    A(ball(8), '#ffffff', { bone: HB.tail, p: [0, 0.15, -0.135], s: [0.034, 0.034, 0.034] });
    return { rig, height: 0.44 * HST.K3, family: 'pet', blob: 0.26 * HST.K3 };
  },
  mondmotte(b) {
    const A = hstAdder(b);
    const wing = '#cfeedd';
    const body = '#f4eee4';
    const rig = hstRig({ by: 0.1, head: [0, 0.11, 0.07], lx: 0.02, w: [0.022, 0.12, 0.015] });
    A(ball(10), body, { bone: HB.body, p: [0, 0.1, -0.035], s: [0.03, 0.03, 0.07] });
    A(ball(10), body, { bone: HB.body, p: [0, 0.11, 0.032], s: [0.038, 0.036, 0.036] });
    A(ball(8), '#e8dcc8', { bone: HB.head, p: [0, 0.115, 0.074], s: [0.022, 0.022, 0.022] });
    for (const sx of [-1, 1]) {
      const W = sx > 0 ? HB.fl : HB.fr;
      A(sphere3(0.008, 6, 4), '#1a1410', { bone: HB.head, p: [sx * 0.013, 0.12, 0.09] });
      A(tube3([[sx * 0.008, 0.13, 0.08], [sx * 0.03, 0.17, 0.11], [sx * 0.05, 0.18, 0.12]], 0.005, 0.003, 6, 4), '#c8a878', { bone: HB.head });
      A(ball(10), wing, { bone: W, p: [sx * 0.09, 0.125, 0.03], s: [0.085, 0.006, 0.055], r: [0, sx * 0.3, 0] });
      A(ball(8), '#8a6ab8', { bone: W, p: [sx * 0.1, 0.132, 0.035], s: [0.018, 0.003, 0.018] });
      A(ball(10), darker(wing, 0.08), { bone: W, p: [sx * 0.068, 0.12, -0.05], s: [0.06, 0.006, 0.045], r: [0, -sx * 0.4, 0] });
    }
    return { rig, height: 0.24 * HST.K3, family: 'pet', blob: 0.14 * HST.K3 };
  },
  pilzling(b) {
    const A = hstAdder(b);
    const rig = hstRig({ by: 0.1, head: [0, 0.2, 0], lx: 0.035, ly: 0.04, lzf: 0.01, lzb: 0.01, w: [0.07, 0.13, 0] });
    A(cyl3(0.06, 0.07, 0.15, 12), '#efe4cc', { bone: HB.body, p: [0, 0.105, 0] });
    A(cap3(0.13, Math.PI * 0.5), '#c8342a', { bone: HB.head, p: [0, 0.17, 0], s: [1, 0.72, 1], shade: 0.1 });
    for (const [x, y, z] of [[0.05, 0.25, 0.06], [-0.06, 0.24, 0.04], [0, 0.262, -0.02], [0.07, 0.22, -0.07], [-0.07, 0.225, -0.06], [0, 0.23, 0.095]]) {
      A(ball(6), '#f6eee0', { bone: HB.head, p: [x, y, z], s: [0.02, 0.008, 0.02] });
    }
    A(cyl3(0.125, 0.125, 0.012, 14), '#e0c8b0', { bone: HB.head, p: [0, 0.172, 0] });
    for (const sx of [-1, 1]) {
      A(sphere3(0.01, 6, 4), '#2a1e18', { bone: HB.body, p: [sx * 0.024, 0.13, 0.062] });
      A(ball(6), '#efe4cc', { bone: sx > 0 ? HB.fl : HB.fr, p: [sx * 0.075, 0.1, 0.01], s: [0.016, 0.03, 0.016] });
      A(ball(6), '#8a6a4a', { bone: sx > 0 ? HB.vl : HB.vr, p: [sx * 0.035, 0.014, 0.012], s: [0.026, 0.014, 0.034] });
    }
    return { rig, height: 0.3 * HST.K3, family: 'pet', blob: 0.2 * HST.K3 };
  },
  wolkenschaf(b) {
    const A = hstAdder(b);
    const wool = '#f4f4f8';
    const face = '#3a3438';
    const rig = hstRig({ by: 0.17, head: [0, 0.2, 0.12], lx: 0.05, ly: 0.12, lzf: 0.06, lzb: -0.06 });
    for (const [x, y, z, r] of [[0, 0.18, 0, 0.1], [0.06, 0.2, 0.05, 0.065], [-0.06, 0.2, 0.05, 0.065], [0.07, 0.19, -0.06, 0.065], [-0.07, 0.19, -0.06, 0.065], [0, 0.25, -0.03, 0.07], [0, 0.15, -0.08, 0.06]]) {
      A(ball(10), wool, { bone: HB.body, p: [x, y, z], s: r, shade: 0.12 });
    }
    A(ball(10), face, { bone: HB.head, p: [0, 0.2, 0.14], s: [0.048, 0.045, 0.05] });
    A(ball(8), wool, { bone: HB.head, p: [0, 0.245, 0.125], s: [0.038, 0.026, 0.034] });
    for (const sx of [-1, 1]) {
      A(sphere3(0.011, 6, 4), '#ffffff', { bone: HB.head, p: [sx * 0.022, 0.21, 0.183], mat: 'glow' });
      A(ball(6), face, { bone: HB.ohr, p: [sx * 0.055, 0.225, 0.12], s: [0.03, 0.012, 0.018] });
    }
    for (const [bn, x, z] of [[HB.vl, 0.05, 0.06], [HB.vr, -0.05, 0.06], [HB.hl, 0.05, -0.06], [HB.hr, -0.05, -0.06]]) A(limb3(0.07, 0.012, 0.011, 6), face, { bone: bn, p: [x, 0.12, z] });
    return { rig, height: 0.34 * HST.K3, family: 'pet', blob: 0.2 * HST.K3 };
  }
};

// --- Die Tiere ---------------------------------------------------------------------------------------------------
// art: 'lauf' (Beine), 'hops' (springt), 'flug' (flattert, Flügel), 'schweb' (schwebt); licht: Leuchten in 2D
// Fundort: erf (Erfolg), boss ('boss' Dungeon-Bosse, 'raid' Endbosse, 'welt' Weltbosse), winter, serie (Tage am Stück)
const HAUSTIERE = [
  { id: 'igelchen', name: 'Igelchen', art: 'lauf', text: 'Rollt sich bei Gefahr zur Kugel – und beim Schlafen auch.', erf: 'stufe10', quelle: 'Erfolg „Erste Schritte“ (Stufe 10)', schatten: 7 },
  { id: 'eulenkueken', name: 'Eulenküken', art: 'hops', text: 'Große Augen, kleiner Mut. Sieht nachts mehr als du.', erf: 'kills1', quelle: 'Erfolg „Jäger“ (1.000 Monster)', schatten: 6 },
  { id: 'laternenkaefer', name: 'Laternenkäfer', art: 'flug', text: 'Trägt sein eigenes Licht – praktisch in jeder Höhle.', erf: 'steine1', quelle: 'Erfolg „Steinbrecher“ (50 Seelensteine)', schatten: 4, licht: ['#ffc24a', -3.6, -4, 9] },
  { id: 'fuchsjunges', name: 'Fuchsjunges', art: 'lauf', text: 'Neugierig, flink und immer hungrig.', boss: 'boss', quelle: 'Selten von Dungeon-Bossen', schatten: 9 },
  { id: 'glutsalamander', name: 'Glutsalamander', art: 'lauf', text: 'Wärmt im Winter die Hände und im Sommer die Laune.', boss: 'raid', quelle: 'Selten von Endbossen', schatten: 10, licht: ['#ff7a2a', 0, -4, 8] },
  { id: 'kristallgeist', name: 'Kristallgeist', art: 'schweb', text: 'Ein Splitter aus der Tiefe, der lächeln gelernt hat.', boss: 'welt', quelle: 'Selten von Weltbossen', schatten: 6, licht: ['#7fe8ff', 0, -9, 11] },
  { id: 'schneehase', name: 'Schneehase', art: 'hops', text: 'Im Schnee fast unsichtbar – bis er niest.', winter: true, quelle: 'Winterfest: 150 Schneeflocken sammeln', schatten: 7 },
  { id: 'mondmotte', name: 'Mondmotte', art: 'flug', text: 'Fliegt nachts um jede Laterne – und um dich.', serie: 7, quelle: 'Tagesbelohnung: 7 Tage in Folge', schatten: 5 },
  { id: 'pilzling', name: 'Pilzling', art: 'lauf', text: 'Wächst nur, wenn ihn niemand ansieht.', serie: 14, quelle: 'Tagesbelohnung: 14 Tage in Folge', schatten: 7 },
  { id: 'wolkenschaf', name: 'Wolkenschaf', art: 'schweb', text: 'Weich wie eine Wolke und genauso schwer zu fangen.', erf: 'tierfreund', quelle: 'Erfolg „Tierfreund“ (5 Haustiere)', schatten: 7 }
];
// ohne Prototyp: Kennungen von Mitspielern wie „constructor“ finden hier nichts
const HST_BY_ID = Object.assign(Object.create(null), Object.fromEntries(HAUSTIERE.map((d) => [d.id, d])));
const hstGueltig = (id) => typeof id === 'string' && id.length < 32 && Object.prototype.hasOwnProperty.call(HST_BY_ID, id);

// --- Spielstand --------------------------------------------------------------------------------------------------
function hstState(p) {
  p = p || game.player;
  if (!p.haustiere || typeof p.haustiere !== 'object') p.haustiere = {};
  const h = p.haustiere;
  if (!h.own || typeof h.own !== 'object' || Array.isArray(h.own)) h.own = {};
  for (const id of Object.keys(h.own)) if (!hstGueltig(id)) delete h.own[id];
  if (!Array.isArray(h.neu)) h.neu = [];
  h.neu = h.neu.filter((id, i, a) => hstGueltig(id) && h.own[id] && a.indexOf(id) === i);
  if (typeof h.aktiv !== 'string' || (h.aktiv && !(hstGueltig(h.aktiv) && h.own[h.aktiv]))) h.aktiv = '';
  return h;
}
const hstHat = (p, id) => hstGueltig(id) && !!(p && p.haustiere && p.haustiere.own && Object.prototype.hasOwnProperty.call(p.haustiere.own, id));
const hstZahl = (p) => (p && p.haustiere && p.haustiere.own ? Object.keys(p.haustiere.own).filter(hstGueltig).length : 0);
const hstAktivId = (p) => {
  const id = p && p.haustiere && p.haustiere.aktiv;
  return hstGueltig(id) && hstHat(p, id) ? id : '';
};
// Ein Tier geben (einmal je Art); beim ersten Tier wird es gleich gerufen
function hstGeben(id) {
  const p = game.player;
  const D = HST_BY_ID[id];
  if (!p || !D || hstHat(p, id)) return false;
  const h = hstState(p);
  h.own[id] = Date.now();
  h.neu.push(id);
  if (!hstAktivId(p)) h.aktiv = id;
  ui.banner('Neues Haustier!', D.name);
  ui.log(`Neues Haustier · ${D.name} · Charakterfenster → Sammlung`, 'level');
  try { if (typeof sfx !== 'undefined' && sfx.success) sfx.success(); } catch (err) { /* ohne Ton */ }
  saveGame();
  return true;
}
function hstRufen(id) {
  const p = game.player;
  if (!p || !hstHat(p, id)) return false;
  hstState(p).aktiv = id;
  saveGame();
  return true;
}
function hstWegschicken() {
  const p = game.player;
  if (!p) return false;
  hstState(p).aktiv = '';
  saveGame();
  return true;
}

// --- Fundorte ----------------------------------------------------------------------------------------------------
function hstBeute(art, m) {
  const p = game.player;
  if (!p || !m || (m.level | 0) + HST.abstand < p.level) return;
  const chance = art === 'boss' ? HST.boss : art === 'raid' ? HST.raid : HST.welt;
  const frei = HAUSTIERE.filter((d) => d.boss === art && !hstHat(p, d.id));
  if (frei.length && Math.random() < chance) hstGeben(frei[Math.floor(Math.random() * frei.length)].id);
}
const _hstBossLoot = bossLoot;
// eslint-disable-next-line no-global-assign
bossLoot = function (m) {
  const r = _hstBossLoot(m);
  try { hstBeute('boss', m); } catch (err) { /* nie die Beute aufhalten */ }
  return r;
};
const _hstRaidLoot = raidLoot;
// eslint-disable-next-line no-global-assign
raidLoot = function (m) {
  const r = _hstRaidLoot(m);
  try { hstBeute('raid', m); } catch (err) { /* nie die Beute aufhalten */ }
  return r;
};
if (typeof weltbossLoot === 'function') {
  const _hstWelt = weltbossLoot;
  // eslint-disable-next-line no-global-assign
  weltbossLoot = function (m) {
    const r = _hstWelt(m);
    try { hstBeute('welt', m); } catch (err) { /* nie die Beute aufhalten */ }
    return r;
  };
}
// Tagesbelohnung: Serie aus Tagen am Stück
if (typeof claimDaily === 'function') {
  const _hstDaily = claimDaily;
  // eslint-disable-next-line no-global-assign
  claimDaily = function (mult) {
    const r = _hstDaily(mult);
    try {
      const p = game.player;
      const serie = r && p && p.daily ? p.daily.streak | 0 : 0;
      for (const d of HAUSTIERE) if (d.serie && serie >= d.serie) hstGeben(d.id);
    } catch (err) { /* die Belohnung bleibt */ }
    return r;
  };
}
// Erfolge (auch „Tierfreund“) und Winterfest: alle 3 s nachsehen
if (typeof ERFOLGE !== 'undefined' && typeof ERFOLG_BY_ID !== 'undefined') {
  for (const E of [
    { id: 'tierfreund', kat: 'Sammlung', name: 'Tierfreund', text: 'Sammle {n} Haustiere', need: 5, val: hstZahl, pts: 15 },
    { id: 'tierfluesterer', kat: 'Sammlung', name: 'Tierflüsterer', text: 'Sammle {n} Haustiere', need: HAUSTIERE.length, val: hstZahl, pts: 40, titel: 'Tierflüsterer' }
  ]) {
    if (ERFOLG_BY_ID[E.id]) continue;
    ERFOLGE.push(E);
    ERFOLG_BY_ID[E.id] = E;
  }
}
function hstTakt() {
  const p = typeof game !== 'undefined' ? game.player : null;
  if (!p || !game.running) return;
  const done = (p.erf && p.erf.done) || {};
  for (const d of HAUSTIERE) {
    if (hstHat(p, d.id)) continue;
    if (d.erf && done[d.erf]) hstGeben(d.id);
    else if (d.winter && ((p.ev && p.ev.flTot) | 0) >= HST.winter) hstGeben(d.id);
  }
}
setInterval(() => { try { hstTakt(); } catch (err) { /* nächster Takt */ } }, 3000);

// --- Folgen (jedes Bild, für die eigene Figur und für Mitspieler) -----------------------------------------------------
const HST_FIG = new Map(); // Besitzer → Tierfigur
function hstFigur(owner, id) {
  let f = HST_FIG.get(owner);
  if (!f || f.id !== id) {
    f = {
      hstPet: true, id, def: HST_BY_ID[id], owner, x: owner.x - 18, y: owner.y + 8, r: 4, dirX: 1, fx: 0, fy: 1,
      moving: false, t: Math.random() * 10, ruhe: 0, zx: 0, zy: 0, seite: Math.random() < 0.5 ? -1 : 1, neu: true
    };
    HST_FIG.set(owner, f);
  }
  f.seen = true;
  return f;
}
// Tier eines Besitzers verstecken? (tot, unsichtbar, hoch auf dem Drachen, in einer anderen Halle)
function hstVersteckt(o) {
  if (!o || o.dead) return true;
  if (o === game.player) return !!(game.stats && game.stats.invisible) || (!!o.flyHigh && o.riding);
  return !!o.invisible || !!o.flyHigh || (typeof remoteHidden === 'function' && remoteHidden(o));
}
function hstBewegen(f, dt) {
  const o = f.owner;
  f.t += dt;
  let fx = o.facing ? o.facing.x : 0;
  let fy = o.facing ? o.facing.y : 1;
  const fl = Math.hypot(fx, fy) || 1;
  fx /= fl;
  fy /= fl;
  // Seite wechseln, wenn die Figur sich dreht und das Tier auf der falschen Seite stünde (nicht im Weg laufen)
  let tx;
  let ty;
  if (o.moving || (o.swing > 0)) {
    f.ruhe = 0;
    tx = o.x - fx * HST.hinten - fy * HST.seite * f.seite;
    ty = o.y - fy * HST.hinten + fx * HST.seite * f.seite;
  } else {
    // in Ruhe: ab und zu ein Stück um die Figur herum schnuppern
    f.ruhe -= dt;
    if (f.ruhe <= 0 || f.neu) {
      const a = Math.random() * Math.PI * 2;
      const r = 20 + Math.random() * 18;
      f.zx = Math.cos(a) * r;
      f.zy = Math.sin(a) * r * 0.7 + 6;
      f.ruhe = 2.5 + Math.random() * 3.5;
    }
    tx = o.x + f.zx;
    ty = o.y + f.zy;
  }
  const dx = tx - f.x;
  const dy = ty - f.y;
  const d = Math.hypot(dx, dy);
  if (f.neu || d > HST.sprung) {
    f.x = tx;
    f.y = ty;
    f.neu = false;
    f.moving = false;
    return;
  }
  const max = HST.tempo * (o.riding ? 1.8 : 1);
  const v = d > 4 ? Math.min(max, d * 4.2) : 0;
  f.moving = v > 14;
  if (v > 0) {
    const k = Math.min(1, (v * dt) / d);
    f.x += dx * k;
    f.y += dy * k;
    f.fx = dx / d;
    f.fy = dy / d;
    if (Math.abs(dx) > 1.5) f.dirX = dx > 0 ? 1 : -1;
  } else {
    // stehen: zur Figur schauen
    const ox = o.x - f.x;
    const oy = o.y - f.y;
    const ol = Math.hypot(ox, oy) || 1;
    f.fx = ox / ol;
    f.fy = oy / ol;
    if (Math.abs(ox) > 3) f.dirX = ox > 0 ? 1 : -1;
  }
}
function hstTick(dt) {
  for (const f of HST_FIG.values()) f.seen = false;
  const p = game.player;
  const id = hstAktivId(p);
  if (p && id && !hstVersteckt(p)) hstBewegen(hstFigur(p, id), dt);
  for (const rp of net.players.values()) {
    if (!hstGueltig(rp.petId) || rp.abot || hstVersteckt(rp)) continue;
    hstBewegen(hstFigur(rp, rp.petId), dt);
  }
  for (const [o, f] of HST_FIG) if (!f.seen) HST_FIG.delete(o);
}
const _hstNetUpdate = netUpdate;
// eslint-disable-next-line no-global-assign
netUpdate = function (dt) {
  _hstNetUpdate(dt);
  try { hstTick(dt); } catch (err) { /* ein Tier darf das Spiel nie aufhalten */ }
};
// Welche Tiere gezeigt werden: das eigene immer, von Mitspielern die nächsten (Grafik „Niedrig“: weniger)
let hstShowAt = -1;
const hstShow = new Set();
function hstSichtbar(f) {
  if (f.owner === game.player) return true;
  if (hstShowAt !== game.time) {
    hstShowAt = game.time;
    hstShow.clear();
    const p = game.player;
    const niedrig = typeof sparOptik === 'function' ? sparOptik() : (typeof opts !== 'undefined' && opts.graphics === 'niedrig');
    const max = niedrig ? HST.andereNiedrig : HST.andere;
    const list = [...HST_FIG.values()].filter((g) => g.owner !== p);
    if (p && list.length > max) list.sort((a, b) => hyp(a.x - p.x, a.y - p.y) - hyp(b.x - p.x, b.y - p.y));
    for (let i = 0; i < Math.min(max, list.length); i++) hstShow.add(list[i]);
  }
  return hstShow.has(f);
}

// --- 2D: in die Szene einsortieren und zeichnen ----------------------------------------------------------------------
const hstSprite = (D, frame) => getSprite('hst:' + D.id + ':' + frame, HST_BOUNDS, (ctx) => HST_ART2D[D.id](ctx, frame));
function hstLage2d(f) {
  const D = f.def;
  const t = f.t;
  if (D.art === 'flug') return { lift: 15 + Math.sin(t * 3) * 3, frame: Math.floor(t * 12) % 2 };
  if (D.art === 'schweb') return { lift: 8 + Math.sin(t * 2) * 2.5, frame: Math.floor(t * 2.5) % 2 };
  if (D.art === 'hops') {
    const h = f.moving ? Math.abs(Math.sin(t * 9)) : 0;
    return { lift: h * 6, frame: h > 0.3 ? 1 : 0 };
  }
  return { lift: 0, frame: f.moving ? Math.floor(t * 11) % 4 : 0 };
}
// in der Welt etwas größer als das gebackene Bild (im Pixel-Stil sonst nur ein paar Bildpunkte)
const HST_GROSS2D = 1.3;
function hstZeichne2d(ctx, f) {
  const D = f.def;
  const fy = feetY(f);
  const L = hstLage2d(f);
  const k = HST_GROSS2D;
  const sh = (D.schatten || 6) * k;
  softShadow(ctx, f.x, fy, sh * (L.lift > 4 ? 0.75 : 1), sh * 0.42 * (L.lift > 4 ? 0.75 : 1), 0.36);
  const own = f.owner === game.player;
  ctx.save();
  if (own && game.stats && game.stats.invisible) ctx.globalAlpha *= 0.35;
  // Atmen im Stand
  const breathe = f.moving || D.art === 'flug' ? 1 : 1 + Math.sin(f.t * 3) * 0.03;
  ctx.translate(f.x, fy - L.lift * k);
  ctx.scale(k, k * breathe);
  blitSprite(ctx, hstSprite(D, L.frame), 0, 0, f.dirX < 0);
  ctx.restore();
  if (D.licht) {
    const [col, lx, ly, r] = D.licht;
    glow(ctx, f.x + lx * k * (f.dirX < 0 ? -1 : 1), fy + (ly - L.lift) * k, r * k, col, 0.32 + 0.12 * Math.sin(f.t * 3));
  }
}
if (typeof collectScene === 'function') {
  const _hstCollect = collectScene;
  // eslint-disable-next-line no-global-assign
  collectScene = function (view, x0, y0, x1, y1, inView) {
    const list = _hstCollect(view, x0, y0, x1, y1, inView);
    if (!HST_FIG.size || (typeof V3 !== 'undefined' && V3.on)) return list;
    for (const f of HST_FIG.values()) {
      if (!f.seen || !inView(f) || !hstSichtbar(f)) continue;
      // nach der Fußlinie einsortieren (die Liste ist schon sortiert)
      const by = feetY(f);
      let lo = 0;
      let hi = list.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (sceneBaseY(list[mid]) <= by) lo = mid + 1;
        else hi = mid;
      }
      list.splice(lo, 0, f);
    }
    return list;
  };
}
if (typeof drawSceneEntity === 'function') {
  const _hstEntity = drawSceneEntity;
  // eslint-disable-next-line no-global-assign
  drawSceneEntity = function (ctx, e) {
    if (e && e.hstPet) {
      try { hstZeichne2d(ctx, e); } catch (err) { /* nächstes Bild */ }
      return;
    }
    return _hstEntity(ctx, e);
  };
}

// --- 3D: neben der Figur mitführen (im selben Durchgang wie die Spielerfiguren, syncPlayer3) ----------------------------
function hstSync3(f, dt) {
  const D = f.def;
  const a = actorFor(entityKey(f), 'pet:' + D.id, (b) => {
    const r = HST_BAU3[D.id](b);
    r.scale = HST.gross3 / HST.K3;
    return r;
  });
  if (!a) return;
  if (!a.hstInit) {
    a.hstInit = true;
    // kleine Tiere werfen keinen echten Schatten (der weiche Bodenschatten reicht)
    if (a.meshes.lit) a.meshes.lit.castShadow = false;
  }
  resetBones(a);
  const B = a.bones;
  const K = HST.K3;
  const t = f.t;
  placeActor(a, f, feetY(f), 0);
  turnToward(a, Math.atan2(f.fx, f.fy), Math.min(1, dt * 9));
  a.group.rotation.y = a.heading;
  const own = f.owner === game.player;
  setActorAlpha(a, own && game.stats && game.stats.invisible ? 0.35 : 1);
  if (D.art === 'lauf') {
    const w = f.moving ? Math.sin(t * 15) : 0;
    B[HB.vl].rotation.x = w * 0.75;
    B[HB.hr].rotation.x = w * 0.75;
    B[HB.vr].rotation.x = -w * 0.75;
    B[HB.hl].rotation.x = -w * 0.75;
    B[HB.body].position.y += (f.moving ? Math.abs(Math.cos(t * 15)) * 0.012 : Math.sin(t * 2.2) * 0.004) * K;
    B[HB.tail].rotation.y = Math.sin(t * (f.moving ? 11 : 3)) * 0.4;
    B[HB.head].rotation.x = f.moving ? Math.sin(t * 15) * 0.06 : Math.sin(t * 1.3) * 0.08;
    B[HB.ohr].rotation.z = Math.sin(t * 2.7) * 0.06;
  } else if (D.art === 'hops') {
    const h = f.moving ? Math.abs(Math.sin(t * 9)) : 0;
    B[HB.root].position.y += h * 0.11 * K;
    B[HB.hl].rotation.x = h * 0.9;
    B[HB.hr].rotation.x = h * 0.9;
    B[HB.vl].rotation.x = -h * 0.5;
    B[HB.vr].rotation.x = -h * 0.5;
    B[HB.ohr].rotation.x = h * 0.45 + (f.moving ? 0 : Math.sin(t * 1.7) * 0.06);
    B[HB.fl].rotation.z = h * 0.8;
    B[HB.fr].rotation.z = -h * 0.8;
    if (!f.moving) B[HB.head].rotation.y = Math.sin(t * 0.9) * 0.35;
  } else if (D.art === 'flug') {
    B[HB.body].position.y += (0.42 + Math.sin(t * 3) * 0.035) * K;
    const fl = Math.sin(t * 24);
    B[HB.fl].rotation.z = 0.25 + fl * 0.75;
    B[HB.fr].rotation.z = -(0.25 + fl * 0.75);
    B[HB.body].rotation.x = f.moving ? 0.2 : Math.sin(t * 1.6) * 0.08;
  } else {
    B[HB.body].position.y += (0.24 + Math.sin(t * 2) * 0.03) * K;
    if (D.id === 'kristallgeist') {
      B[HB.body].rotation.y = Math.sin(t * 0.8) * 0.5;
      for (const [bn, ph] of [[HB.fl, 0], [HB.fr, Math.PI]]) {
        const r = B[bn];
        r.position.y += Math.sin(t * 2.4 + ph) * 0.03 * K;
        r.position.z += Math.cos(t * 1.6 + ph) * 0.05 * K;
      }
    } else {
      const w = Math.sin(t * 2);
      B[HB.vl].rotation.x = w * 0.3;
      B[HB.hr].rotation.x = w * 0.3;
      B[HB.vr].rotation.x = -w * 0.3;
      B[HB.hl].rotation.x = -w * 0.3;
      B[HB.body].rotation.z = Math.sin(t * 1.3) * 0.05;
    }
  }
}
if (typeof syncPlayer3 === 'function') {
  const _hstSyncPlayer3 = syncPlayer3;
  // eslint-disable-next-line no-global-assign
  syncPlayer3 = function (p, dt) {
    const r = _hstSyncPlayer3(p, dt);
    // nur die echten Figuren (eigene, Mitspieler), keine Doppelgänger oder Fensterfiguren
    const f = p && (p === game.player || (p.remote && !p.abot)) ? HST_FIG.get(p) : null;
    if (f && f.seen && hstSichtbar(f)) {
      try { hstSync3(f, dt); } catch (err) { /* nächstes Bild */ }
    }
    return r;
  };
}

// --- Mitspieler: gerufenes Tier --------------------------------------------------------------------------------------
if (typeof netPlayerState === 'function') {
  const _hstNet = netPlayerState;
  // eslint-disable-next-line no-global-assign
  netPlayerState = function () {
    const s = _hstNet();
    const id = hstAktivId(game.player);
    if (s && id) s.pe = id;
    return s;
  };
}
// Empfang: Kennung vor dem Original lesen (es säubert den Zustand womöglich) und nur aus der eigenen Liste übernehmen
if (typeof netApplyState === 'function') {
  const _hstApply = netApplyState;
  // eslint-disable-next-line no-global-assign
  netApplyState = function (rp, s) {
    const pe = s && typeof s === 'object' ? s.pe : undefined;
    const r = _hstApply(rp, s);
    if (rp && s) rp.petId = hstGueltig(pe) ? pe : '';
    return r;
  };
}

// --- Seite „Haustiere“ in der Sammlung ------------------------------------------------------------------------------
const HST_BILD = new Map();
function hstBildUrl(D, dunkel) {
  const k = D.id + (dunkel ? ':d' : '');
  if (HST_BILD.has(k)) return HST_BILD.get(k);
  const sp = bakeSprite(HST_BOUNDS, (ctx) => HST_ART2D[D.id](ctx, 0), 4, true);
  let url;
  if (dunkel) {
    const c = newCanvas(sp.img.width, sp.img.height);
    const x = c.getContext('2d', CPU_CANVAS);
    x.drawImage(sp.img, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = '#6a5e50';
    x.fillRect(0, 0, c.width, c.height);
    url = c.toDataURL();
  } else url = sp.img.toDataURL();
  HST_BILD.set(k, url);
  return url;
}
function hstHtml(p) {
  hstCss();
  const h = hstState(p);
  const aktiv = hstAktivId(p);
  const neu = new Set(h.neu);
  const n = hstZahl(p);
  let s = `<div class="hst"><p class="hst-kopf"><span>Haustiere</span> <b>${n} / ${HAUSTIERE.length}</b>` +
    (aktiv ? ` · <span>Bei dir:</span> <b>${HST_BY_ID[aktiv].name}</b> <button type="button" class="mini-btn" data-hstweg>Wegschicken</button>` : '') + '</p>' +
    '<p class="hst-hint">Haustiere folgen dir überallhin, kämpfen nicht und sind nur zum Liebhaben. Mitspieler sehen dein Tier.</p><div class="hst-grid">';
  for (const D of HAUSTIERE) {
    const hat = !!h.own[D.id];
    s += `<div class="hst-karte${hat ? '' : ' fehlt'}${D.id === aktiv ? ' aktiv' : ''}"><img src="${hstBildUrl(D, !hat)}" alt="">` +
      `<b>${hat ? D.name : '???'}</b>${neu.has(D.id) ? '<i class="hst-neu">Neu</i>' : ''}` +
      (hat ? `<small>${D.text}</small>` : '') + `<small class="hst-quelle"><span>Fundort:</span> <span>${D.quelle}</span></small>` +
      (hat ? (D.id === aktiv ? '<button type="button" class="mini-btn" data-hstweg>Wegschicken</button>' : `<button type="button" class="mini-btn btn-primary" data-hstruf="${D.id}">Rufen</button>`) : '') + '</div>';
  }
  h.neu = [];
  return s + '</div></div>';
}
function hstBind(root) {
  root.querySelectorAll('[data-hstruf]').forEach((b) => b.addEventListener('click', () => { if (hstRufen(b.dataset.hstruf)) ui.renderCharPanel(); }));
  root.querySelectorAll('[data-hstweg]').forEach((b) => b.addEventListener('click', () => { if (hstWegschicken()) ui.renderCharPanel(); }));
}
if (typeof SAMMLUNG_SEITEN !== 'undefined') {
  SAMMLUNG_SEITEN.push({ id: 'haustiere', label: 'Haustiere', html: hstHtml, bind: hstBind, haupt: true, dot: (p) => (p.haustiere && Array.isArray(p.haustiere.neu) ? p.haustiere.neu.length : 0) });
}
function hstCss() {
  if (document.getElementById('hstCss')) return;
  const st = document.createElement('style');
  st.id = 'hstCss';
  st.textContent =
    '.hst-kopf{display:flex;flex-wrap:wrap;gap:4px 6px;align-items:center;margin:0 0 4px}.hst-kopf b{color:#ffd96a}.hst-hint{opacity:.75;font-size:12px;margin:0 0 8px}' +
    '.hst-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:7px}' +
    '.hst-karte{position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 7px 7px;border-radius:9px;' +
    'background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);text-align:center}' +
    '.hst-karte img{width:96px;height:72px;image-rendering:auto}.hst-karte b{font-size:13px;color:#f0e6cc}.hst-karte small{font-size:11px;opacity:.8}' +
    '.hst-karte.fehlt{opacity:.7}.hst-karte.fehlt b{color:#9a907c}.hst-karte.aktiv{border-color:rgba(159,224,143,.7);box-shadow:0 0 10px rgba(120,220,120,.18) inset}' +
    '.hst-quelle{color:#c9b88a}.hst-karte .mini-btn{margin-top:auto}' +
    '.hst-neu{position:absolute;top:4px;right:5px;font-style:normal;font-size:10px;font-weight:700;padding:0 5px;border-radius:7px;background:#d8402f;color:#fff}';
  document.head.appendChild(st);
}

// --- Ratgeber ----------------------------------------------------------------------------------------------------
if (typeof RATGEBER_WISSEN !== 'undefined') {
  RATGEBER_WISSEN.push(
    {
      c: 'sinn', q: 'Wie bekomme ich ein Haustier?',
      a: 'Haustiere sind kleine Begleiter ohne Kampfwerte, die dir folgen. Es gibt zehn: aus Erfolgen (z. B. „Erste Schritte“ auf Stufe 10 das Igelchen), ' +
        'selten von Dungeon-Bossen, Endbossen und Weltbossen (nur, wenn sie höchstens 10 Stufen unter dir sind), vom Winterfest (150 Schneeflocken) ' +
        'und aus der Tagesbelohnung (7 und 14 Tage in Folge). Rufen und wegschicken kannst du sie im Charakterfenster unter <b>Sammlung</b> → Haustiere.',
      k: 'haustier haustiere begleiter tier pet pets fuchs eule igel kaefer salamander kristallgeist schneehase motte pilzling schaf rufen wegschicken sammlung'
    },
    {
      c: 'sinn', q: 'Sehen andere Spieler mein Haustier?',
      a: 'Ja – dein gerufenes Tier läuft auch bei deinen Mitspielern hinter dir her (2D und 3D). Es kämpft nicht, stört niemanden und versteckt sich, ' +
        'wenn du unsichtbar bist oder hoch auf dem Drachen fliegst. Bei der Grafik „Niedrig“ zeigt das Spiel nur die Tiere der nächsten Mitspieler.',
      k: 'haustier sichtbar mitspieler andere sehen tier zeigen grafik niedrig'
    }
  );
}
