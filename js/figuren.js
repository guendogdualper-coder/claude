// Figuren: Spielfiguren, Händler, Skelette und Monster als Sprites.
//
// Jede Figur wird einmal pro Blickrichtung und Laufbild in ein eigenes Canvas gemalt
// (mit dunkler Umrisslinie) und danach nur noch kopiert. Das ist schnell und
// erlaubt viele Details. Koordinaten: (0, 0) ist der Punkt zwischen den Füßen,
// nach oben geht es ins Negative. Eine Spielfigur ist etwa 47 Einheiten groß.

const SPRITE_SCALE = 3;      // Auflösung der Sprites (3 Pixel pro Einheit)
const OUTLINE = '#1a1210';
const OUTLINE_W = 1.1;
const spriteCache = new Map();

// Laufzyklus: Beinstellung, Auf und Ab, Armschwung
const WALK = [
  { l: 0, r: 0, bob: 0, arm: 0 },
  { l: 1, r: -1, bob: -0.7, arm: 1 },
  { l: 0, r: 0, bob: 0, arm: 0 },
  { l: -1, r: 1, bob: -0.7, arm: -1 },
  // Bild 4: Kraftpose beim Buffen, beide Arme hochgerissen
  { l: 0, r: 0, bob: -1.2, arm: 0, raise: true }
];
const POSE_FRAME = 4;

// --- Farben -------------------------------------------------------------------

function mixColor(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}
const darker = (c, t = 0.3) => mixColor(c, '#000000', t);
const lighter = (c, t = 0.25) => mixColor(c, '#ffffff', t);

// --- Sprites backen und zeichnen ------------------------------------------------

function newCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function bakeSprite(bounds, draw, S = SPRITE_SCALE) {
  const w = Math.ceil(bounds.w * S);
  const h = Math.ceil(bounds.h * S);
  const base = newCanvas(w, h);
  const b = base.getContext('2d');
  b.setTransform(S, 0, 0, S, -bounds.x * S, -bounds.y * S);
  b.lineJoin = 'round';
  b.lineCap = 'round';
  draw(b);
  shadeSprite(base, b, w, h, S);
  // Umriss: Silhouette in alle Richtungen versetzt hinter die Figur legen
  const sil = newCanvas(w, h);
  const s = sil.getContext('2d');
  s.drawImage(base, 0, 0);
  s.globalCompositeOperation = 'source-in';
  s.fillStyle = OUTLINE;
  s.fillRect(0, 0, w, h);
  const out = newCanvas(w, h);
  const o = out.getContext('2d');
  const d = OUTLINE_W * S;
  for (let a = 0; a < 8; a++) o.drawImage(sil, Math.cos(a * Math.PI / 4) * d, Math.sin(a * Math.PI / 4) * d);
  o.drawImage(base, 0, 0);
  return { img: out, bounds, flash: null };
}

// Licht von oben links: ein Verlauf über die ganze Figur (oben warm, unten kühl und dunkler)
// und ein heller Saum an den Kanten oben links. Wird nur einmal beim Backen gerechnet.
function shadeSprite(base, b, w, h, S = SPRITE_SCALE) {
  b.save();
  b.setTransform(1, 0, 0, 1, 0, 0);
  b.globalCompositeOperation = 'source-atop';
  const g = b.createLinearGradient(0, 0, w * 0.3, h);
  g.addColorStop(0, 'rgba(255,244,220,0.12)');
  g.addColorStop(0.5, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(18,10,30,0.24)');
  b.fillStyle = g;
  b.fillRect(0, 0, w, h);
  const rim = newCanvas(w, h);
  const r = rim.getContext('2d');
  r.drawImage(base, 0, 0);
  r.globalCompositeOperation = 'source-in';
  r.fillStyle = '#fff6e0';
  r.fillRect(0, 0, w, h);
  r.globalCompositeOperation = 'destination-out';
  const d = S * 0.9;
  r.drawImage(base, d, d);
  b.globalAlpha = 0.3;
  b.drawImage(rim, 0, 0);
  b.restore();
}

function getSprite(key, bounds, draw, scale) {
  let sp = spriteCache.get(key);
  if (!sp) {
    sp = bakeSprite(bounds, draw, scale);
    spriteCache.set(key, sp);
  }
  return sp;
}

// Weiße Silhouette für das Aufblitzen bei Treffern
function flashOf(sp) {
  if (!sp.flash) {
    const c = newCanvas(sp.img.width, sp.img.height);
    const x = c.getContext('2d');
    x.drawImage(sp.img, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, c.width, c.height);
    sp.flash = c;
  }
  return sp.flash;
}

// Einfarbige Silhouette eines Sprites, z. B. für leuchtende Auren
function tintOf(sp, color) {
  sp.tints = sp.tints || {};
  if (!sp.tints[color]) {
    const c = newCanvas(sp.img.width, sp.img.height);
    const x = c.getContext('2d');
    x.drawImage(sp.img, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = color;
    x.fillRect(0, 0, c.width, c.height);
    sp.tints[color] = c;
  }
  return sp.tints[color];
}

function blitSprite(ctx, sp, x, y, flip, flash = 0) {
  const b = sp.bounds;
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(sp.img, b.x, b.y, b.w, b.h);
  if (flash > 0) {
    ctx.globalAlpha *= Math.min(0.8, flash * 6);
    ctx.drawImage(flashOf(sp), b.x, b.y, b.w, b.h);
  }
  ctx.restore();
}

// --- Malwerkzeuge (Cel-Shading: Licht von oben links) --------------------------------

function paintShape(ctx, path, color, bx, by, bw, bh) {
  ctx.save();
  path();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.clip();
  // Schatten als Sichel unten rechts: dunkle Fläche, darüber die Grundfarbe leicht nach oben links versetzt
  ctx.fillStyle = darker(color, 0.22);
  ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(bx + bw * 0.42, by + bh * 0.4, bw * 0.6, bh * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = lighter(color, 0.17);
  ctx.beginPath();
  ctx.ellipse(bx + bw * 0.3, by + bh * 0.24, bw * 0.22, bh * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  path();
  ctx.strokeStyle = darker(color, 0.5);
  ctx.lineWidth = 0.7;
  ctx.stroke();
}

function box(ctx, x, y, w, h, r, color) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  paintShape(ctx, () => { ctx.beginPath(); ctx.roundRect(x, y, w, h, rr); }, color, x, y, w, h);
}

function oval(ctx, cx, cy, rx, ry, color) {
  paintShape(ctx, () => { ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); }, color, cx - rx, cy - ry, rx * 2, ry * 2);
}

function poly(ctx, pts, color) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  paintShape(ctx, () => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  }, color, minX, minY, Math.max(...xs) - minX, Math.max(...ys) - minY);
}

function dot(ctx, x, y, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function stroke(ctx, color, width, pts) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
}

// --- Bausteine für Menschengestalten ----------------------------------------------------
// dir: 'down' (zum Betrachter), 'up' (vom Betrachter weg), 'side' (nach rechts)

function hLegs(ctx, dir, w, o) {
  if (o.robe) {
    if (dir === 'side') {
      box(ctx, -2 + w.l * 2, -3.2, 6.5, 3.4, 1.6, o.boots);
    } else {
      box(ctx, -6.5, -3.2 - (w.l > 0 ? 0.8 : 0), 5.5, 3.4, 1.6, o.boots);
      box(ctx, 1, -3.2 - (w.r > 0 ? 0.8 : 0), 5.5, 3.4, 1.6, o.boots);
    }
    return;
  }
  // Bein mit Naht und Kniefalte, Stiefel mit Sohle und Schnürung
  const leg = (x, y, pants, boots, bx, bw) => {
    box(ctx, x, y - 10, 5, 7.5, 2, pants);
    stroke(ctx, darker(pants, 0.25), 0.5, [[x + 2.5, y - 9.5], [x + 2.5, y - 3.5]]);
    stroke(ctx, lighter(pants, 0.18), 0.6, [[x + 1, y - 6.6], [x + 3.8, y - 6.2]]);
    box(ctx, bx, y - 4.6, bw, 4.6, 2, boots);
    box(ctx, bx + 0.3, y - 1.1, bw - 0.6, 1.1, 0.5, darker(boots, 0.45));
    stroke(ctx, lighter(boots, 0.25), 0.45, [[bx + 1.4, y - 3.8], [bx + bw - 1.6, y - 3.1]]);
    stroke(ctx, lighter(boots, 0.25), 0.45, [[bx + 1.4, y - 3.1], [bx + bw - 1.6, y - 3.8]]);
  };
  if (dir === 'side') {
    const s = w.l * 2.6;
    leg(-2.5 - s, 0, darker(o.pants, 0.18), darker(o.boots, 0.18), -3.2 - s, 7);
    leg(-2.5 + s, 0, o.pants, o.boots, -3 + s, 7.5);
  } else {
    const ly = w.l > 0 ? -1.2 : 0;
    const ry = w.r > 0 ? -1.2 : 0;
    leg(-6, ly, o.pants, o.boots, -6.6, 6.2);
    leg(1, ry, o.pants, o.boots, 0.4, 6.2);
  }
}

function torsoWidth(dir) {
  return dir === 'side' ? 13 : 18;
}

function hBody(ctx, dir, w, o) {
  const y = -24 + w.bob;
  if (o.robe) {
    const wt = dir === 'side' ? 6.5 : 9;
    const wb = dir === 'side' ? 9.5 : 12.5;
    const pts = [[-wt, y + 4], [-wt + 3, y], [wt - 3, y], [wt, y + 4], [wb, -2.5]];
    if (o.tattered) {
      for (let k = 1; k < 7; k++) pts.push([wb - (2 * wb) * k / 7, k % 2 ? -0.3 : -3.4]);
    }
    pts.push([-wb, -2.5]);
    poly(ctx, pts, o.robe);
    // Falten im Stoff
    const fold = darker(o.robe, 0.28);
    for (const fx of dir === 'side' ? [-2, 3] : [-6, -1.5, 3, 7]) stroke(ctx, fold, 0.6, [[fx * 0.55, y + 7], [fx, -3.5]]);
    dot(ctx, 0, y + 1.2, dir === 'side' ? 3.5 : 4.5, 1.4, 'rgba(0,0,0,0.22)');
    return wb;
  }
  const tw = torsoWidth(dir) * (o.wide || 1);
  box(ctx, -tw / 2, y, tw, 16, 5, o.torso);
  // Schatten unter dem Kinn und Mittelnaht
  dot(ctx, 0, y + 1.3, dir === 'side' ? 3.6 : 4.6, 1.5, 'rgba(0,0,0,0.22)');
  if (dir !== 'side') stroke(ctx, darker(o.torso, 0.3), 0.5, [[0, y + 3], [0, y + 10.5]]);
  return tw / 2;
}

function hArms(ctx, dir, w, o) {
  const y = -22.5 + w.bob;
  const arm = (x, dy) => {
    if (o.wideSleeves) {
      poly(ctx, [[x + 1, y + dy], [x + 4, y + dy], [x + 6.5, y + dy + 10], [x - 1.5, y + dy + 10]], o.sleeve);
      if (o.cuff) box(ctx, x - 1.5, y + dy + 8.6, 8, 2, 1, o.cuff);
    } else {
      box(ctx, x, y + dy, 5, 10.5, 2.5, o.sleeve);
      if (o.cuff) box(ctx, x, y + dy + 7.8, 5, 2, 1, o.cuff);
    }
    if (!o.wideSleeves) stroke(ctx, darker(o.sleeve, 0.3), 0.5, [[x + 1, y + dy + 5.2], [x + 4, y + dy + 5.6]]);
    const hand = o.gloves || o.skin;
    oval(ctx, x + 2.5, y + dy + 11.5, 2.4, 2.3, hand);
    oval(ctx, x + 4.4, y + dy + 10.6, 1, 1.2, hand);
    stroke(ctx, darker(hand, 0.3), 0.4, [[x + 1.2, y + dy + 12.4], [x + 3.6, y + dy + 12.4]]);
  };
  // Kraftpose: Arme von der Schulter aus schräg nach oben gedreht
  if (w.raise) {
    const lift = (sx, ang) => {
      ctx.save();
      ctx.translate(sx + 2.5, y + 1);
      ctx.rotate(ang);
      arm(-2.5, -y - 1);
      ctx.restore();
    };
    if (dir === 'side') lift(-2.5, -2.25);
    else {
      lift(-13.5, 2.45);
      lift(8.5, -2.45);
    }
    return;
  }
  if (dir === 'side') arm(-2.5 + w.arm * 2.2, 0);
  else {
    const spread = o.wide ? 2 : 0;
    arm(-13.5 - spread, -w.arm * 0.8);
    arm(8.5 + spread, w.arm * 0.8);
  }
}

function hHead(ctx, dir, w, o) {
  const cx = dir === 'side' ? 1.5 : 0;
  const cy = -34.5 + w.bob;
  const skin = o.skin;
  // Hals und Ohren liegen hinter dem Kopf
  box(ctx, cx - 3, cy + 7, 6, 4.5, 1.5, darker(skin, 0.12));
  const ear = (x) => {
    oval(ctx, x, cy + 1.2, 2.3, 3, skin);
    dot(ctx, x, cy + 1.4, 1, 1.6, darker(skin, 0.22));
  };
  if (dir === 'down') { ear(cx - 10.6); ear(cx + 10.6); } else if (dir === 'side') ear(cx - 2.5);
  else { ear(cx - 10.4); ear(cx + 10.4); }
  oval(ctx, cx, cy, 11, 10.5, skin);
  // kleine Nase
  if (dir === 'down') dot(ctx, cx, cy + 3.7, 0.9, 0.6, darker(skin, 0.2));
  else if (dir === 'side') poly(ctx, [[cx + 10.4, cy + 2], [cx + 12, cy + 3.6], [cx + 10.3, cy + 4.4]], skin);
  return { cx, cy };
}

function eyes(ctx, dir, cx, cy, o = {}) {
  const xs = dir === 'side' ? [cx + 6] : [cx - 4.2, cx + 4.2];
  if (o.style === 2 && !o.glow) {
    // fröhlich: geschlossene Bögen
    ctx.strokeStyle = o.color || '#21160f';
    ctx.lineWidth = 1.1;
    for (const x of xs) {
      ctx.beginPath();
      ctx.arc(x, cy + 2.4, 1.8, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
  }
  if (o.style === 1) o = { ...o, narrow: true };
  for (const x of (o.style === 2 && !o.glow ? [] : xs)) {
    if (o.glow) {
      ctx.globalAlpha = 0.4;
      dot(ctx, x, cy + 1.5, 3, 3, o.glow);
      ctx.globalAlpha = 1;
      dot(ctx, x, cy + 1.5, 1.7, o.narrow ? 1.3 : 2.4, o.color || '#21160f');
      dot(ctx, x - 0.5, cy + (o.narrow ? 1.1 : 0.6), 0.65, 0.65, '#ffffff');
      continue;
    }
    // Auge: Weiß, farbige Iris, Pupille, zwei Glanzpunkte und ein Lidstrich
    const side = dir === 'side' ? 0.55 : 0;
    const ew = dir === 'side' ? 1.6 : 2.1;
    const eh = o.narrow ? 1.35 : 2.6;
    const iris = o.color && o.color !== '#21160f' ? o.color : '#5a3a22';
    dot(ctx, x, cy + 1.5, ew, eh, '#fbf6ee');
    dot(ctx, x + side, cy + 1.75, ew * 0.78, eh * 0.84, iris);
    dot(ctx, x + side, cy + 1.9, ew * 0.4, eh * 0.45, '#120a06');
    dot(ctx, x + side - 0.6, cy + (o.narrow ? 1.2 : 0.75), 0.62, 0.62, '#ffffff');
    dot(ctx, x + side + 0.55, cy + (o.narrow ? 2 : 2.7), 0.3, 0.3, 'rgba(255,255,255,0.85)');
    ctx.strokeStyle = '#2a1810';
    ctx.lineWidth = 0.95;
    ctx.beginPath();
    ctx.ellipse(x, cy + 1.5, ew + 0.15, eh + 0.1, 0, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();
    if (o.female) {
      // Wimpern: zwei Schwünge am äußeren Lidrand
      const out = dir === 'side' ? 1 : x < cx ? -1 : 1;
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(x + out * ew * 0.85, cy + 1.5 - eh * 0.55);
      ctx.lineTo(x + out * (ew + 1.3), cy + 1.5 - eh * 0.95);
      ctx.moveTo(x + out * ew * 0.5, cy + 1.5 - eh * 0.85);
      ctx.lineTo(x + out * (ew + 0.6), cy + 1.5 - eh * 1.3);
      ctx.stroke();
    }
  }
  // Mund und Augenbrauen bei offenen Gesichtern
  if (o.blush) {
    ctx.strokeStyle = o.female ? '#b8404e' : '#6a3a2a';
    ctx.lineWidth = o.female ? 1.05 : 0.8;
    ctx.beginPath();
    if (dir === 'down') ctx.arc(cx, cy + 4.6, 1.5, 0.25 * Math.PI, 0.75 * Math.PI);
    else ctx.arc(cx + 7.6, cy + 4.6, 1.2, 0.3 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
    // Brauen: bei Männern kräftiger, bei Frauen feiner
    ctx.strokeStyle = 'rgba(58,36,24,0.7)';
    ctx.lineWidth = o.male ? 1.25 : o.female ? 0.7 : 0.9;
    for (const x of xs) {
      ctx.beginPath();
      if (o.style === 3) {
        // entschlossen: schräge Brauen zur Mitte hin
        const inward = x < cx || dir === 'side' ? 1 : -1;
        ctx.moveTo(x - 1.8, cy - 3.2 + inward * 0.6);
        ctx.lineTo(x + 1.8, cy - 3.2 - inward * 0.6);
      } else {
        ctx.moveTo(x - 1.6, cy - 2.4);
        ctx.quadraticCurveTo(x, cy - 3.3, x + 1.6, cy - 2.4);
      }
      ctx.stroke();
    }
  }
  if (o.blush && dir === 'down' && !o.male) {
    ctx.globalAlpha = 0.35;
    dot(ctx, cx - 6.5, cy + 4.6, 1.9, 1, '#e0786e');
    dot(ctx, cx + 6.5, cy + 4.6, 1.9, 1, '#e0786e');
    ctx.globalAlpha = 1;
  }
}

// --- Waffen (werden als eigenes Sprite gedreht gezeichnet; Griff liegt bei 0,0) --------------

// Farben je Gegenstandsstufe: Stahl, Bronze, Mondsilber, Drachengold, Seelenviolett
const TIER_METAL = ['#c7ccd3', '#d9a86a', '#e6eef8', '#e8c46a', '#b48cff', '#ff9a5a', '#9fe8ff', '#fff2b0'];
const TIER_ACCENT = ['#6a2a24', '#5a4030', '#2f4f7a', '#9a2f2a', '#3a2350', '#3a1a10', '#1a3a5a', '#7a5a10'];
const FAN_LEAF = ['#2f7f78', '#b0587a', '#3a6fa8', '#c8402f', '#5a3a8a', '#e0602a', '#5ab0e0', '#e8c46a'];
const STAFF_ORB = ['#a7e37f', '#e8e0a0', '#9be2ff', '#ff9a4a', '#d6a8ff', '#ff6a2a', '#bff4ff', '#fff2b0'];

// Formen je Stufe: Leder/Eisen, Bronze, Mond, Drache, Seele, Asche, Himmel, Götter
const BLADE_SHAPES = [
  { len: 21, w: 2.3, curve: 0, guard: 'bar' },
  { len: 22, w: 3.1, curve: 0, guard: 'bar' },
  { len: 22, w: 2.6, curve: 0.45, guard: 'round' },
  { len: 24, w: 3, curve: 0, guard: 'wings', serrated: true, gem: '#c8302a' },
  { len: 25, w: 2.8, curve: 0.15, guard: 'spikes', gem: '#d6a8ff', runes: true },
  { len: 25, w: 3.2, curve: 0, guard: 'spikes', serrated: true, gem: '#ff7a2a', edge: '#ff9a4a' },
  { len: 26, w: 2.9, curve: 0.1, guard: 'wings', gem: '#9fe8ff', edge: '#e8f8ff' },
  { len: 27, w: 3.4, curve: 0, guard: 'wings', gem: '#ffffff', edge: '#fff2b0', runes: true }
];

// Klinge von x0 bis zur Spitze; curve biegt sie wie einen Säbel, serrated gibt Zacken am Rücken.
// Die obere Schliffseite ist hell, die untere dunkler, in der Mitte läuft eine Blutrinne.
function bladeArt(ctx, x0, len, w, curve, serrated, color, edge) {
  const bend = (x) => -curve * 6 * Math.sin(((x - x0) / len) * Math.PI);
  const top = [];
  const bottom = [];
  const mid = [];
  for (let k = 0; k <= 8; k++) {
    const x = x0 + (len * k) / 8;
    const taper = 1 - (k / 8) * 0.3;
    const zig = serrated && k > 1 && k < 8 && k % 2 ? -1.5 : 0;
    top.push([x, bend(x) - w * taper + zig]);
    bottom.push([x, bend(x) + w * taper]);
    mid.push([x, bend(x)]);
  }
  const tip = [x0 + len + w * 2.2, bend(x0 + len) - curve * 3];
  poly(ctx, [...top, tip, ...bottom.slice().reverse()], darker(color, 0.18));
  poly(ctx, [...top, tip, ...mid.slice().reverse()], lighter(color, 0.22));
  // Blutrinne
  stroke(ctx, darker(color, 0.4), Math.max(0.7, w * 0.32), mid.slice(0, 6).map(([x, y]) => [x + 1.5, y + w * 0.12]));
  // Glanz an der Schneide und an der Spitze
  stroke(ctx, edge || '#ffffff', 0.7, top.slice(1, 8).map(([x, y]) => [x, y + 0.5]));
  dot(ctx, tip[0] - w * 1.4, tip[1] - w * 0.3, 0.8, 0.5, '#ffffff');
}

// Parierstange: Bügel, deren Enden sich zur Klinge biegen; Flügel und Dornen für höhere Stufen
function guardArt(ctx, x, style, metal) {
  const dark = darker(metal, 0.3);
  if (style === 'round') {
    oval(ctx, x, 0, 2.8, 5, metal);
    oval(ctx, x + 0.3, 0, 1.4, 2.6, dark);
  } else if (style === 'wings') {
    poly(ctx, [[x - 1.2, -2.5], [x - 4, -9], [x + 1, -7], [x + 3, -9.5], [x + 2.4, -3], [x + 2.4, 3], [x + 3, 9.5], [x + 1, 7], [x - 4, 9], [x - 1.2, 2.5]], metal);
    stroke(ctx, dark, 0.6, [[x - 2.5, -7], [x + 1, -3.5]]);
    stroke(ctx, dark, 0.6, [[x - 2.5, 7], [x + 1, 3.5]]);
  } else if (style === 'spikes') {
    poly(ctx, [[x - 1.5, -4.5], [x + 4.5, -8], [x + 1.8, -3], [x + 1.8, 3], [x + 4.5, 8], [x - 1.5, 4.5]], metal);
    poly(ctx, [[x - 1.5, -2], [x - 4, -5], [x - 1.5, -4.5]], dark);
    poly(ctx, [[x - 1.5, 2], [x - 4, 5], [x - 1.5, 4.5]], dark);
  } else {
    poly(ctx, [[x - 1.3, -2], [x - 1.3, -5.2], [x + 2.6, -6.4], [x + 1.4, -4.2], [x + 1.4, 4.2], [x + 2.6, 6.4], [x - 1.3, 5.2], [x - 1.3, 2]], metal);
  }
  // Mittelstück
  poly(ctx, [[x - 1.6, 0], [x + 0.6, -2.4], [x + 2.6, 0], [x + 0.6, 2.4]], lighter(metal, 0.25));
}

function swordArt(ctx, tier, big) {
  const sh = BLADE_SHAPES[tier] || BLADE_SHAPES[0];
  const k = big ? 1.42 : 1.08;
  const grip = big ? 10 : 6;
  const wrap = TIER_ACCENT[tier];
  // Griff mit Lederwicklung und Knauf
  box(ctx, 1 - grip, -1.6, grip, 3.2, 1, wrap);
  for (let x = 2 - grip; x < 0.5; x += 2) stroke(ctx, lighter(wrap, 0.3), 0.6, [[x, -1.6], [x + 1.2, 1.6]]);
  oval(ctx, -grip, 0, 2.3, 2.3, '#c9a35a');
  oval(ctx, -grip, 0, 1.1, 1.1, sh.gem || '#8a6a3a');
  guardArt(ctx, 2.6, sh.guard, tier >= 3 ? TIER_METAL[tier] : '#c9a35a');
  bladeArt(ctx, 4.4, sh.len * k - 4.4, sh.w * (big ? 1.4 : 1.12), sh.curve, sh.serrated, TIER_METAL[tier], sh.edge);
  if (sh.gem) oval(ctx, 2.9, 0, 1.3, 1.3, sh.gem);
  if (sh.runes) for (let x = 9; x < sh.len * k - 5; x += 5) stroke(ctx, sh.gem, 0.8, [[x, -0.7], [x + 2, 0.5]]);
}

function weaponArt(ctx, kind, tier = 0) {
  switch (kind) {
    case 'sword':
      swordArt(ctx, tier, false);
      break;
    case 'greatsword':
      swordArt(ctx, tier, true);
      break;
    case 'dagger': {
      const sh = BLADE_SHAPES[tier] || BLADE_SHAPES[0];
      box(ctx, -2.8, -1.3, 4.2, 2.6, 1, '#2a2420');
      box(ctx, 1.2, -2.8 - (tier >= 3 ? 1 : 0), 1.6, 5.6 + (tier >= 3 ? 2 : 0), 0.8, tier >= 3 ? TIER_METAL[tier] : '#8a8f96');
      bladeArt(ctx, 2.8, 9 + tier * 0.6, 1.6 + (tier % 2) * 0.3, Math.min(0.35, sh.curve * 0.8), sh.serrated, TIER_METAL[tier], sh.edge);
      if (sh.gem) oval(ctx, -1, 0, 1, 1, sh.gem);
      break;
    }
    case 'fan': {
      paintShape(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 14 + tier * 0.4, -0.8, 0.8);
        ctx.closePath();
      }, FAN_LEAF[tier], 0, -10, 14, 20);
      ctx.strokeStyle = tier >= 4 ? TIER_METAL[tier] : '#e0c36a';
      ctx.lineWidth = 0.8;
      const ribs = 5 + Math.min(4, tier);
      for (let k = 0; k <= ribs; k++) {
        const a = -0.75 + (1.5 * k) / ribs;
        ctx.beginPath();
        ctx.moveTo(1, 0);
        ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14);
        ctx.stroke();
      }
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, 13.6, -0.8, 0.8);
      ctx.stroke();
      // Muster auf dem Blatt: Kranich, Flamme, Wolke
      if (tier >= 2) oval(ctx, 9, 0, 2.2, 3.2, tier >= 5 ? '#ffb04a' : '#f4f0e0');
      if (tier >= 3) poly(ctx, [[7, -5], [11, -7], [9, -3]], lighter(FAN_LEAF[tier], 0.4));
      if (tier >= 6) for (const a of [-0.5, 0.5]) oval(ctx, Math.cos(a) * 11, Math.sin(a) * 11, 1.2, 1.2, '#ffffff');
      oval(ctx, Math.cos(0.8) * 14 + 1, Math.sin(0.8) * 14 + 2, 1.6, 1.6, '#e0c36a');
      oval(ctx, Math.cos(-0.8) * 14 + 1, Math.sin(-0.8) * 14 + 2, 1.6, 1.6, '#e0c36a');
      box(ctx, -2.5, -1.3, 4, 2.6, 1, '#e0c36a');
      if (tier >= 4) stroke(ctx, '#c8402f', 1, [[-2, 1], [-5, 5], [-4, 8]]);
      break;
    }
    case 'bell': {
      // Stiel mit Glocke am Ende, ab Stufe 3 mit Bändern
      box(ctx, -6, -1.2, 18, 2.4, 1, '#6b4a2e');
      box(ctx, 11, -2.2, 3, 4.4, 1, TIER_METAL[tier]);
      paintShape(ctx, () => { ctx.beginPath(); ctx.moveTo(14, -3); ctx.quadraticCurveTo(22, -4, 24, -8); ctx.lineTo(24, 8); ctx.quadraticCurveTo(22, 4, 14, 3); ctx.closePath(); }, TIER_METAL[tier], 14, -8, 10, 16);
      oval(ctx, 25, 0, 1.4, 1.4, STAFF_ORB[tier]);
      stroke(ctx, darker(TIER_METAL[tier], 0.35), 0.8, [[18, -4], [18, 4]]);
      if (tier >= 3) {
        stroke(ctx, FAN_LEAF[tier], 1.2, [[12, 2], [9, 7], [11, 11]]);
        stroke(ctx, lighter(FAN_LEAF[tier], 0.3), 1.2, [[13, 2], [12, 8], [15, 11]]);
      }
      break;
    }
    case 'staff': {
      const wood = tier >= 5 ? '#2a2024' : tier >= 3 ? '#4a3a3a' : '#5c4230';
      box(ctx, -14, -1.4, 35, 2.8, 1.2, wood);
      for (let k = -10; k < 18; k += 5) stroke(ctx, darker(wood, 0.35), 0.9, [[k, -1.4], [k + 2, 1.4]]);
      const head = tier % 4;
      if (head === 0) poly(ctx, [[19, -1.5], [23, -5], [24, -3], [21.5, 0], [24, 3], [23, 5], [19, 1.5]], '#3e2c1f');
      else if (head === 1) { stroke(ctx, wood, 1.6, [[19, 0], [24, -5], [27, -6]]); stroke(ctx, wood, 1.6, [[19, 0], [24, 5], [27, 6]]); }
      else if (head === 2) { oval(ctx, 21, 0, 4, 3.6, '#ddd5bb'); dot(ctx, 22, -1.2, 0.9, 0.9, '#1a1210'); dot(ctx, 22, 1.2, 0.9, 0.9, '#1a1210'); }
      else poly(ctx, [[19, -2], [24, -7], [23, -2], [28, 0], [23, 2], [24, 7], [19, 2]], TIER_METAL[tier]);
      if (tier >= 4) for (const y of [-5, 5]) poly(ctx, [[20, y * 0.4], [24, y * 1.4], [22, y * 0.3]], '#2a1416');
      oval(ctx, 25.5, 0, 3.6 + tier * 0.15, 3.6 + tier * 0.15, STAFF_ORB[tier]);
      dot(ctx, 24.5, -1.2, 1.1, 1.1, '#efffe0');
      if (tier >= 6) for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; stroke(ctx, STAFF_ORB[tier], 0.8, [[25.5 + Math.cos(a) * 5, Math.sin(a) * 5], [25.5 + Math.cos(a) * 7, Math.sin(a) * 7]]); }
      break;
    }
    case 'scythe': {
      // langer Schaft, gebogene Klinge am Ende
      box(ctx, -12, -1.3, 34, 2.6, 1.2, tier >= 5 ? '#2a2024' : '#4a3a2a');
      box(ctx, 20, -2.4, 3.4, 4.8, 1, TIER_METAL[tier]);
      paintShape(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(22, -2);
        ctx.quadraticCurveTo(26, -16, 10 - tier * 0.6, -19 - tier * 0.4);
        ctx.quadraticCurveTo(21, -13, 21.5, -2);
        ctx.closePath();
      }, TIER_METAL[tier], 10, -20, 16, 18);
      stroke(ctx, '#f4f6f8', 0.7, [[24, -6], [20, -14], [13, -17.5]]);
      if (tier >= 3) oval(ctx, 21.7, 0, 1.4, 1.4, STAFF_ORB[tier]);
      break;
    }
    case 'bow': {
      // Bogen mit gefüllten Wurfarmen, ab Stufe 2 mit geschwungenen Enden
      const wood = tier >= 3 ? TIER_ACCENT[tier] : '#6b4a2e';
      const r = 12 + Math.min(3, tier * 0.5);
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#120c08';
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.arc(-6, 0, r, -1.15, 1.15);
      ctx.stroke();
      ctx.strokeStyle = wood;
      ctx.lineWidth = 2;
      ctx.stroke();
      const tipX = -6 + Math.cos(1.15) * r;
      const tipY = Math.sin(1.15) * r;
      if (tier >= 2) for (const sgn of [-1, 1]) stroke(ctx, TIER_METAL[tier], 1.4, [[tipX, tipY * sgn], [tipX - 2.5, (tipY + 2.5) * sgn]]);
      stroke(ctx, '#e8e0cc', 0.5, [[tipX, -tipY], [tipX, tipY]]);
      box(ctx, -6 + r - 1.8, -2.2, 3, 4.4, 1, tier >= 4 ? TIER_METAL[tier] : '#3a2a1c');
      if (tier >= 4) oval(ctx, -6 + r - 0.3, 0, 1.2, 1.2, STAFF_ORB[tier]);
      break;
    }
    case 'axe': {
      // Einhandaxt: Bartklinge, ab Stufe 2 mit Dorn hinten, ab 4 mit Edelstein
      const metal = TIER_METAL[tier];
      box(ctx, -4, -1.3, 23, 2.6, 1, tier >= 3 ? TIER_ACCENT[tier] : '#5a4030');
      for (let x = -3; x < 6; x += 2) stroke(ctx, '#2a1c14', 0.6, [[x, -1.3], [x + 1, 1.3]]);
      poly(ctx, [[12, -2], [15, -10 - tier * 0.3], [21, -9 - tier * 0.3], [19.5, 0], [21, 8 + tier * 0.3], [15, 9 + tier * 0.3], [12, 2]], metal);
      stroke(ctx, lighter(metal, 0.45), 0.9, [[20.4, -7], [19, 0], [20.4, 7]]);
      if (tier >= 2) poly(ctx, [[12, -1.5], [8, -4], [12, 1.5]], metal);
      box(ctx, 11, -2.6, 3, 5.2, 0.8, darker(metal, 0.3));
      if (tier >= 4) oval(ctx, 12.5, 0, 1.2, 1.2, STAFF_ORB[tier]);
      break;
    }
    case 'greataxe': {
      // Streitaxt: langer Schaft, Doppelklinge, ab Stufe 3 mit Spitze oben
      const metal = TIER_METAL[tier];
      box(ctx, -12, -1.4, 36, 2.8, 1.2, tier >= 5 ? '#2a2024' : tier >= 3 ? TIER_ACCENT[tier] : '#5a4030');
      for (let x = -11; x < -2; x += 2) stroke(ctx, '#2a1c14', 0.6, [[x, -1.4], [x + 1, 1.4]]);
      for (const sg of [-1, 1]) {
        poly(ctx, [[18, sg * 2], [20, sg * (12 + tier * 0.3)], [26, sg * (13 + tier * 0.3)], [27.5, sg * 6], [26, sg * 2]], metal);
        stroke(ctx, lighter(metal, 0.45), 0.9, [[26.5, sg * 11], [27.2, sg * 4]]);
      }
      box(ctx, 17, -3, 10, 6, 1, darker(metal, 0.25));
      if (tier >= 3) poly(ctx, [[27, -1.5], [33, 0], [27, 1.5]], metal);
      if (tier >= 4) oval(ctx, 22, 0, 1.5, 1.5, STAFF_ORB[tier]);
      break;
    }
    case 'club':
      poly(ctx, [[-3, -1.6], [14, -3.6], [20, -4.6], [22.5, 0], [20, 4.6], [14, 3.6], [-3, 1.6]], '#6b4f34');
      dot(ctx, 15, -1.5, 0.9, 0.9, '#3e2c1f');
      dot(ctx, 18, 1.8, 0.9, 0.9, '#3e2c1f');
      break;
    case 'skullstaff':
      box(ctx, -12, -1.3, 30, 2.6, 1.2, '#4a3a2a');
      oval(ctx, 20, 0, 3.8, 3.4, '#ddd5bb');
      dot(ctx, 21, -1.2, 0.8, 0.8, '#1a1210');
      dot(ctx, 21, 1.2, 0.8, 0.8, '#1a1210');
      oval(ctx, 25.5, 0, 2.8, 2.8, '#9be2ff');
      break;
  }
}

const WEAPON_BOUNDS = { x: -14, y: -22, w: 58, h: 44 };

function weaponSprite(kind, tier = 0) {
  return getSprite(`w:${kind}:${tier}`, WEAPON_BOUNDS, (ctx) => weaponArt(ctx, kind, tier));
}

function heldWeapon(ctx, kind, x, y, angle, tier = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  weaponArt(ctx, kind, tier);
  ctx.restore();
}

// --- Die vier Klassen -------------------------------------------------------------------
// Aussehen je Rüstungs- und Helmstufe. Index -1 (keine Ausrüstung, z. B. Vorschau) = Grundfarben,
// -2 beim Helm = kein Helm. Stufen: Leder, Bronze, Eisen, Drache, Seele, Asche, Himmel, Götter
const ARMOR_LOOK = {
  krieger: {
    torso: ['#7a5a3c', '#8a6a3a', '#6a7480', '#9c3b33', '#4a2f6a', '#3a2a26', '#2a4a7a', '#c8a03a'],
    trim: ['#a88a5a', '#d9a86a', '#e6eef8', '#e8c46a', '#b48cff', '#ff9a5a', '#9fe8ff', '#fff2b0'],
    helm: ['#8a6a44', '#c08a4a', '#8f98a3', '#a8343f', '#6a4a9a', '#3a3436', '#c8dcf0', '#e8c46a'],
    crest: ['#c8402f', '#c8402f', '#c8402f', '#2a1416', '#d6a8ff', '#ff7a2a', '#ffffff', '#c8402f']
  },
  ninja: {
    torso: ['#5a5040', '#4a3a2a', '#312c3d', '#203a24', '#2a1a3a', '#3a1a14', '#1a2a4a', '#3a3010'],
    scarf: ['#8a6a4a', '#9a3a2a', '#6b4f9a', '#3a8a4a', '#9a2a4a', '#e0602a', '#4a9ae0', '#e8c46a'],
    hood: ['#4a4038', '#5a4030', '#2a2633', '#1e3a24', '#2a1440', '#2a1410', '#14203a', '#3a3010']
  },
  schamane: {
    robe: ['#7a7a6a', '#8a5a7a', '#2c6f6a', '#9a3a2a', '#3a3a8a', '#8a3a1a', '#2a6aa8', '#f0e0b0'],
    gold: ['#c8b890', '#e0c36a', '#e0c36a', '#ffd34d', '#d6a8ff', '#ffb04a', '#bfe8ff', '#ffe9a0'],
    band: ['#8a6a44', '#c8402f', '#e0c36a', '#ffd34d', '#b48cff', '#ff7a2a', '#9fe8ff', '#ffffff']
  },
  nekromant: {
    robe: ['#4a4438', '#3a3a30', '#334a31', '#4a2a2a', '#2a1a3a', '#1e1a1a', '#2a3a4a', '#3a2a10'],
    hood: ['#3a3428', '#2e2a24', '#2a3b28', '#3a1e1e', '#24143a', '#141010', '#1e2a3a', '#2e2410'],
    glow: ['#a7e37f', '#a7e37f', '#a7e37f', '#ff6a5a', '#d6a8ff', '#ff9a4a', '#9fe8ff', '#ffe9a0']
  }
};

// Welche Stufen die Figur gerade trägt: Rüstung, Helm, Schuhe, Gürtel, Schultern (der Umhang wird
// erst beim Zeichnen dazugemalt, weil er im Wind flattert)
function playerLook(p) {
  const eq = p.equipment;
  if (!eq) return { a: -1, h: -1, ap: p.look || null };
  const t = (it) => (it ? it.tier : -1);
  return { a: t(eq.ruestung), h: eq.helm ? eq.helm.tier : -2, b: t(eq.schuhe), g: t(eq.guertel), s: t(eq.schultern), ap: p.look || null };
}

// --- Sichtbare Ausrüstung: Schuhe, Gürtel, Schultern, Umhang ------------------------------------
// Je Stufe eigene Farben; ab Drache Dornen und Edelsteine, ab Himmel leuchtende Federn.
const GEAR_LOOK = {
  boots: ['#5a3e2a', '#6e4a2a', '#4a4c52', '#7a2a24', '#3a2a4a', '#2a2020', '#30507a', '#b88a2a'],
  belt: ['#6a4a30', '#7a5030', '#3e3a36', '#6a1e1a', '#2e2040', '#2a1a14', '#1e3050', '#8a6a1a'],
  plate: ['#7a5a3c', '#b07a40', '#8f98a3', '#a8343f', '#6a4a9a', '#3a3436', '#c8dcf0', '#e8c46a'],
  cape: ['#6a5a48', '#7a3a2a', '#2f5a3a', '#8a1f1f', '#3a2a6a', '#2a2220', '#2a4a8a', '#d0a63a'],
  lining: ['#4a3e30', '#a88a5a', '#c9b48a', '#2a1214', '#b48cff', '#ff7a2a', '#e6f2ff', '#fff2b0']
};
const gearTier = (t) => (t == null ? -1 : t);

// Stiefel über den Beinen aus hLegs: Schaft, Stulpe und Kappe
function gearBoots(ctx, dir, w, tier, robe) {
  tier = gearTier(tier);
  if (tier < 0) return;
  const c = GEAR_LOOK.boots[tier];
  const m = TIER_METAL[tier];
  const boot = (x, lift, wide) => {
    if (robe) {
      box(ctx, x, -3.6 - lift, wide, 3.8, 1.6, c);
      stroke(ctx, m, 0.8, [[x + 0.6, -2.6 - lift], [x + wide - 0.6, -2.6 - lift]]);
      return;
    }
    box(ctx, x + 0.4, -8.2 - lift, wide - 0.8, 5, 1.4, darker(c, 0.08));
    box(ctx, x, -4.8 - lift, wide, 4.8, 1.8, c);
    box(ctx, x + 0.3, -1.2 - lift, wide - 0.6, 1.2, 0.5, darker(c, 0.45));
    box(ctx, x - 0.2, -8.8 - lift, wide + 0.4, 1.8, 0.8, tier >= 2 ? m : lighter(c, 0.2));
    if (tier >= 1) stroke(ctx, m, 0.7, [[x + 1, -5.6 - lift], [x + wide - 1, -5.6 - lift]]);
    if (tier >= 3) poly(ctx, [[x + wide * 0.3, -9 - lift], [x + wide * 0.5, -12 - lift], [x + wide * 0.7, -9 - lift]], m);
    if (tier >= 6) poly(ctx, [[x + wide - 0.5, -8 - lift], [x + wide + 3.5, -11 - lift], [x + wide + 1.5, -6.5 - lift]], '#ffffff');
  };
  if (dir === 'side') {
    const s = w.l * (robe ? 2 : 2.6);
    if (robe) {
      boot(-2 + s, 0, 6.5);
      return;
    }
    boot(-3.2 - s, 0, 7);
    boot(-3 + s, 0, 7.5);
  } else {
    boot(-6.6, w.l > 0 ? (robe ? 0.8 : 1.2) : 0, robe ? 5.6 : 6.2);
    boot(robe ? 1 : 0.4, w.r > 0 ? (robe ? 0.8 : 1.2) : 0, robe ? 5.6 : 6.2);
  }
}

// Gürtel über der Hüfte, von vorn mit Schnalle, von der Seite mit Tasche
function gearBelt(ctx, dir, y, half, tier) {
  tier = gearTier(tier);
  if (tier < 0) return;
  const c = GEAR_LOOK.belt[tier];
  const m = TIER_METAL[tier];
  box(ctx, -half - 0.3, y, half * 2 + 0.6, 3.4, 1, c);
  stroke(ctx, darker(c, 0.35), 0.5, [[-half + 0.5, y + 1.7], [half - 0.5, y + 1.7]]);
  if (dir === 'down') {
    box(ctx, -2.6, y - 0.6, 5.2, 4.6, 1, m);
    box(ctx, -1.3, y + 0.5, 2.6, 2.4, 0.6, darker(c, 0.2));
    if (tier >= 3) oval(ctx, 0, y + 1.7, 1.1, 1.1, tier >= 4 ? '#d6a8ff' : '#c8402f');
    if (tier >= 2) for (const x of [-half + 2.5, half - 2.5]) oval(ctx, x, y + 1.7, 0.9, 0.9, m);
  } else if (dir === 'side') {
    box(ctx, -half + 0.5, y + 1.5, 4, 4.2, 1.2, darker(c, 0.1));
    stroke(ctx, m, 0.6, [[-half + 0.8, y + 2.6], [-half + 4.2, y + 2.6]]);
  }
}

// Schulterpanzer: gestufte Platten, ab Drache Dornen, ab Seele ein Juwel, ab Himmel Federn
function gearShoulders(ctx, dir, w, tier, y, spread = 11.5) {
  tier = gearTier(tier);
  if (tier < 0) return false;
  const c = GEAR_LOOK.plate[tier];
  const m = TIER_METAL[tier];
  const pad = (x, mirror) => {
    if (tier >= 6) {
      for (let k = 0; k < 3; k++) poly(ctx, [[x - 2 * mirror, y - 1], [x + (6 + k * 2.5) * mirror, y - 7 - k * 2], [x + (4 + k * 2) * mirror, y + 1]], k === 2 ? '#e6f2ff' : '#ffffff');
    }
    oval(ctx, x, y + 3.4, 6.2, 3.6, darker(c, 0.12));
    oval(ctx, x, y + 1.4, 7, 4.8, c);
    stroke(ctx, m, 1, [[x - 5.8, y + 3.6], [x + 5.8, y + 3.6]]);
    if (tier >= 1) stroke(ctx, lighter(c, 0.3), 0.6, [[x - 3.5, y - 1.6], [x + 2, y - 2.4]]);
    if (tier >= 2) for (const dx of [-3.5, 3.5]) oval(ctx, x + dx, y + 1.6, 0.8, 0.8, m);
    if (tier >= 3 && tier < 6) {
      poly(ctx, [[x - 3.2, y - 1.5], [x - 1.8 + mirror * 0.5, y - 8 - (tier >= 5 ? 2 : 0)], [x - 0.4, y - 2]], m);
      poly(ctx, [[x + 0.4, y - 2], [x + 2 + mirror * 0.5, y - 7 - (tier >= 5 ? 2 : 0)], [x + 3.2, y - 1.5]], m);
    }
    if (tier >= 4) oval(ctx, x, y + 1, 1.5, 1.5, tier === 5 ? '#ff7a2a' : tier >= 6 ? '#9fe8ff' : '#d6a8ff');
  };
  if (dir === 'side') pad(w.arm, 1);
  else {
    pad(-spread, -1);
    pad(spread, 1);
  }
  return true;
}

// Umhang: wird jedes Bild neu gezeichnet und weht beim Laufen. layer 'back' (hinter der Figur)
// oder 'front' (von hinten gesehen liegt er über dem Rücken). Koordinaten wie im Sprite.
function drawCape(ctx, tier, dir, w, moving, t, layer) {
  if (tier < 0) return;
  if ((dir === 'up') !== (layer === 'front')) return;
  const cloth = GEAR_LOOK.cape[tier];
  const lining = GEAR_LOOK.lining[tier];
  const m = TIER_METAL[tier];
  const y0 = -24.5 + w.bob;
  const y1 = -1.5;
  const flap = moving ? 1 : 0.35;
  const wave = (k) => Math.sin(t * (moving ? 9 : 2.6) + k * 1.7) * (moving ? 2.2 : 1.1);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (dir === 'side') {
    // weht nach hinten (links), je schneller, desto weiter
    const back = 4 + flap * 7;
    ctx.moveTo(-1.5, y0);
    ctx.lineTo(3, y0 + 0.5);
    ctx.quadraticCurveTo(1 - back * 0.3, (y0 + y1) / 2, -back * 0.6 + wave(0), y1 + 1);
    ctx.lineTo(-back - 4 + wave(1), y1 - 2 + wave(2) * 0.6);
    ctx.quadraticCurveTo(-back * 0.5 - 3, (y0 + y1) / 2 - 2, -5, y0 + 1.5);
    ctx.closePath();
  } else {
    const top = 7.5;
    const bot = 12 + flap * 1.5;
    ctx.moveTo(-top, y0);
    ctx.lineTo(top, y0);
    ctx.quadraticCurveTo(top + 3, (y0 + y1) / 2, bot + wave(0) * 0.5, y1);
    const n = 4;
    for (let k = n; k >= 0; k--) {
      const x = -bot + (2 * bot) * k / n;
      ctx.lineTo(x + wave(k) * 0.3, y1 + (k % 2 ? 1.2 : -0.3) + wave(k + 2) * 0.4);
    }
    ctx.quadraticCurveTo(-top - 3, (y0 + y1) / 2, -top, y0);
    ctx.closePath();
  }
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, lighter(cloth, 0.12));
  g.addColorStop(0.55, cloth);
  g.addColorStop(1, darker(cloth, 0.35));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = OUTLINE_W;
  ctx.stroke();
  ctx.clip();
  // Falten
  ctx.strokeStyle = darker(cloth, 0.3);
  ctx.lineWidth = 0.9;
  for (const fx of dir === 'side' ? [-3, -7] : [-6, -1.5, 3, 7.5]) {
    ctx.beginPath();
    ctx.moveTo(fx * 0.5, y0 + 3);
    ctx.quadraticCurveTo(fx + wave(fx) * 0.4, (y0 + y1) / 2, fx * 1.2 + wave(fx + 1) * 0.6, y1 + 2);
    ctx.stroke();
  }
  // Innenfutter blitzt an der Kante auf, ab Eisen ein Saum
  ctx.strokeStyle = lining;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  if (dir === 'side') {
    ctx.moveTo(-1.5, y0 + 1);
    ctx.quadraticCurveTo(-2, (y0 + y1) / 2, -4 + wave(0), y1);
  } else {
    ctx.moveTo(-14, y1 - 0.5);
    ctx.lineTo(14, y1 - 0.5);
  }
  ctx.stroke();
  if (tier >= 2) {
    ctx.strokeStyle = m;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-16, y1 - 2.2);
    ctx.lineTo(16, y1 - 2.2);
    ctx.stroke();
  }
  ctx.restore();
  // Wappen auf dem Rücken, Spange an den Schultern
  if (dir === 'up' && tier >= 3) {
    const ey = (y0 + y1) / 2 - 1;
    poly(ctx, [[0, ey - 5], [4, ey], [0, ey + 5], [-4, ey]], m);
    oval(ctx, 0, ey, 1.6, 1.6, tier >= 6 ? '#ffffff' : lining);
  }
  if (dir !== 'side') {
    oval(ctx, -7, y0 + 0.8, 1.6, 1.6, m);
    oval(ctx, 7, y0 + 0.8, 1.6, 1.6, m);
  }
}

// --- Aussehen (bei der Erstellung gewählt) ------------------------------------------------------
const LOOKS = {
  sex: ['Männlich', 'Weiblich'],
  hair: ['Kurz', 'Dutt', 'Lang', 'Stachelig', 'Pferdeschwanz', 'Glatze'],
  hairColor: ['#3a2418', '#1e1818', '#7a4a24', '#d0a040', '#ece0b8', '#b0382a', '#4a5aa8', '#dcdce6'],
  skin: ['#f6dcc0', '#e9c6a1', '#d8a576', '#b27a50', '#7c4e30', '#c9c4b0', '#a8c4a0'],
  eyes: ['Rund', 'Schmal', 'Fröhlich', 'Entschlossen'],
  eyeColor: ['#21160f', '#2f63b0', '#2a7a3a', '#8a5a24', '#8a3ab0', '#b82a2a'],
  mark: ['Keine', 'Sommersprossen', 'Narbe', 'Kriegsbemalung']
};
const DEFAULT_LOOKS = {
  krieger: { sex: 0, hair: 0, hc: 0, skin: 1, eyes: 0, ec: 0, mark: 0 },
  ninja: { sex: 1, hair: 4, hc: 1, skin: 1, eyes: 1, ec: 0, mark: 0 },
  schamane: { sex: 1, hair: 1, hc: 1, skin: 0, eyes: 0, ec: 0, mark: 0 },
  nekromant: { sex: 0, hair: 2, hc: 7, skin: 5, eyes: 0, ec: 0, mark: 0 }
};
function lookOf(L, classId) {
  return { ...DEFAULT_LOOKS[classId], ...((L && L.ap) || {}) };
}
function lookKey(ap) {
  return ap ? [ap.sex, ap.hair, ap.hc, ap.skin, ap.eyes, ap.ec, ap.mark].join('.') : '';
}
const skinOf = (ap) => LOOKS.skin[ap.skin] || LOOKS.skin[1];
const hairOf = (ap) => LOOKS.hairColor[ap.hc] || LOOKS.hairColor[0];
function eyeOpts(ap) {
  return { color: LOOKS.eyeColor[ap.ec] || '#21160f', style: ap.eyes, female: ap.sex === 1, male: ap.sex === 0 };
}

// Frisur. layer 'back': hinter dem Kopf (lange Haare, Zopf, Dutt von der Seite), 'front': Kappe und Rest
function drawHair(ctx, dir, cx, cy, ap, layer) {
  const style = ap.hair;
  const c = hairOf(ap);
  const dark = darker(c, 0.25);
  if (layer === 'back') {
    if (style === 2) {
      if (dir === 'down') poly(ctx, [[cx - 11, cy - 5], [cx - 13.5, cy + 6], [cx - 12, cy + 14], [cx - 6, cy + 12], [cx + 6, cy + 12], [cx + 12, cy + 14], [cx + 13.5, cy + 6], [cx + 11, cy - 5]], dark);
      else if (dir === 'side') poly(ctx, [[cx - 6, cy - 9], [cx - 12, cy - 4], [cx - 13.5, cy + 13], [cx - 3, cy + 12], [cx - 2, cy + 2]], dark);
    } else if (style === 4 && dir === 'side') {
      poly(ctx, [[cx - 9, cy - 7], [cx - 15, cy - 2], [cx - 17, cy + 11], [cx - 13, cy + 10], [cx - 11.5, cy - 1], [cx - 7, cy - 3]], c);
    } else if (style === 1 && dir === 'side') {
      oval(ctx, cx - 10, cy - 8, 4.6, 4.2, c);
    }
    return;
  }
  if (style === 5) {
    // Glatze: nur ein Glanzpunkt
    if (dir !== 'up') {
      ctx.globalAlpha = 0.35;
      dot(ctx, cx - 3.5, cy - 7, 3, 1.8, '#ffffff');
      ctx.globalAlpha = 1;
    }
    return;
  }
  if (dir === 'up') {
    oval(ctx, cx, cy - 0.5, 11.4, 11, c);
    stroke(ctx, dark, 0.7, [[cx - 4, cy - 9], [cx - 6, cy + 6]]);
    stroke(ctx, dark, 0.7, [[cx + 3, cy - 9], [cx + 5, cy + 6]]);
    if (style === 2) box(ctx, cx - 11, cy + 2, 22, 13, 4, c);
    if (style === 4) {
      box(ctx, cx - 2.2, cy + 4, 4.4, 13, 2, c);
      box(ctx, cx - 2.6, cy + 4, 5.2, 2, 1, '#c8402f');
    }
  } else if (dir === 'down') {
    paintShape(ctx, () => {
      ctx.beginPath();
      ctx.arc(cx, cy - 0.5, 11.4, Math.PI * 1.02, Math.PI * 1.98);
      if (style === 3) ctx.quadraticCurveTo(cx + 4, cy - 4, cx, cy - 6);
      else ctx.quadraticCurveTo(cx + 3, cy - 6.5, cx, cy - 4.5);
      ctx.quadraticCurveTo(cx - 3, cy - 6.5, cx - 11.3, cy - 1.5);
      ctx.closePath();
    }, c, cx - 11.4, cy - 12, 22.8, 10);
    stroke(ctx, dark, 0.6, [[cx - 5, cy - 10], [cx - 3, cy - 5.5]]);
    stroke(ctx, dark, 0.6, [[cx + 4, cy - 10], [cx + 3, cy - 5.5]]);
    if (style === 2) {
      box(ctx, cx - 11.8, cy - 4, 3.4, 13, 1.5, c);
      box(ctx, cx + 8.4, cy - 4, 3.4, 13, 1.5, c);
    }
  } else {
    paintShape(ctx, () => {
      ctx.beginPath();
      ctx.arc(cx, cy - 0.5, 11.4, Math.PI * 0.75, Math.PI * 1.9);
      ctx.quadraticCurveTo(cx + 2, cy - 5, cx - 3, cy - 1);
      ctx.lineTo(cx - 5, cy + (style === 0 || style === 3 ? 3 : 7));
      ctx.closePath();
    }, c, cx - 11.4, cy - 12, 20, 19);
    stroke(ctx, dark, 0.6, [[cx - 6, cy - 8], [cx - 8, cy + 2]]);
  }
  if (style === 0) oval(ctx, cx + (dir === 'side' ? -2 : 0), cy - 11.5, 3.6, 3, c);
  if (style === 1) oval(ctx, cx + (dir === 'side' ? -3.5 : 0), cy - 12, 4.6, 4, c);
  if (style === 3) {
    const xs = dir === 'side' ? [-8, -4, 0, 4] : [-8, -4, 0, 4, 8];
    for (const x of xs) poly(ctx, [[cx + x - 3, cy - 8], [cx + x + (dir === 'side' ? -2.5 : 0), cy - 17 + Math.abs(x) * 0.3], [cx + x + 3, cy - 8]], c);
  }
  if (style === 4 && dir !== 'up') box(ctx, cx + (dir === 'side' ? -11 : -2), cy - 11.5, dir === 'side' ? 3 : 4, 2.2, 1, '#c8402f');
}

// Zeichen im Gesicht: Sommersprossen, Narbe, Kriegsbemalung
function faceMarks(ctx, dir, cx, cy, ap) {
  if (!ap.mark || dir === 'up') return;
  const xs = dir === 'side' ? [cx + 6] : [cx - 4.2, cx + 4.2];
  if (ap.mark === 1) {
    ctx.fillStyle = 'rgba(150,80,40,0.55)';
    for (const x of xs) for (const [dx, dy] of [[-1.5, 4.2], [0.5, 4.8], [2, 4], [-0.2, 3.6]]) dot(ctx, x + dx, cy + dy, 0.45, 0.45, 'rgba(150,80,40,0.6)');
  } else if (ap.mark === 2) {
    stroke(ctx, '#9a4a3a', 0.9, [[xs[xs.length - 1] - 2, cy - 3.5], [xs[xs.length - 1] + 1.5, cy + 5]]);
  } else if (ap.mark === 3) {
    for (const x of xs) {
      stroke(ctx, '#c83a2a', 1, [[x - 2, cy + 3.6], [x + 2, cy + 3.6]]);
      stroke(ctx, '#c83a2a', 1, [[x - 1.6, cy + 5], [x + 1.6, cy + 5]]);
    }
  }
}

// Farbe aus der Tabelle, sonst die Grundfarbe
const lookColor = (list, i, fallback) => (i >= 0 ? list[i] : fallback);

const CHARACTER_ART = {
  krieger(ctx, dir, w, f, L = { a: -1, h: -1 }) {
    const A = ARMOR_LOOK.krieger;
    const crimson = lookColor(A.torso, L.a, '#9c3b33');
    const brass = lookColor(A.trim, L.a, '#c9a35a');
    const ap = lookOf(L, 'krieger');
    const o = { skin: skinOf(ap), pants: '#3b2d25', boots: '#4d3527', torso: crimson, sleeve: darker(crimson, 0.18), gloves: '#5a4030' };
    const ty = -24 + w.bob;
    hLegs(ctx, dir, w, o);
    gearBoots(ctx, dir, w, L.b);
    // Panzerrock
    const sw = dir === 'side' ? 8 : 11.5;
    poly(ctx, [[-sw + 1.5, ty + 12], [sw - 1.5, ty + 12], [sw, ty + 18.5], [-sw, ty + 18.5]], darker(crimson, 0.1));
    stroke(ctx, brass, 0.6, [[-sw + 1, ty + 15.5], [sw - 1, ty + 15.5]]);
    // Schlitze im Panzerrock
    for (const x of dir === 'side' ? [-3, 2.5] : [-5.5, 0, 5.5]) stroke(ctx, darker(crimson, 0.4), 0.6, [[x, ty + 13], [x * 1.08, ty + 18.3]]);
    const half = hBody(ctx, dir, w, o);
    for (let k = 0; k < 3; k++) stroke(ctx, brass, 0.7, [[-half + 1.5, ty + 3.5 + k * 3], [half - 1.5, ty + 3.5 + k * 3]]);
    box(ctx, -half, ty + 11.5, half * 2, 3, 1, brass);
    for (const x of [-half + 2, half - 2]) dot(ctx, x, ty + 13, 0.7, 0.7, lighter(brass, 0.4));
    if (dir === 'down') oval(ctx, 0, ty + 13, 2.3, 2, L.a >= 4 ? lookColor(A.crest, L.a, '#e0c36a') : '#e0c36a');
    gearBelt(ctx, dir, ty + 11.3, half, L.g);
    // Brustplatte ab Stufe Eisen, Schuppen ab Stufe Drache
    if (dir === 'down' && L.a >= 2) {
      box(ctx, -5, ty + 2, 10, 8, 2.5, lighter(crimson, 0.12));
      if (L.a >= 3) for (let k = 0; k < 3; k++) stroke(ctx, brass, 0.6, [[-3.5 + k * 3.5, ty + 4], [-2 + k * 3.5, ty + 8]]);
    }
    hArms(ctx, dir, w, o);
    // Schulterpanzer, ab Stufe Seele mit Dornen
    const pad = (x) => {
      oval(ctx, x, ty + 2, 6.2, 4.6, crimson);
      stroke(ctx, brass, 0.9, [[x - 5, ty + 4.5], [x + 5, ty + 4.5]]);
      if (L.a >= 4) {
        poly(ctx, [[x - 3, ty - 1], [x - 2, ty - 6], [x - 0.5, ty - 1.5]], brass);
        poly(ctx, [[x + 0.5, ty - 1.5], [x + 2, ty - 6], [x + 3, ty - 1]], brass);
      }
    };
    if (!gearShoulders(ctx, dir, w, L.s, ty)) {
      if (dir === 'side') pad(w.arm);
      else { pad(-11.5); pad(11.5); }
    }
    drawHair(ctx, dir, dir === 'side' ? 1.5 : 0, -34.5 + w.bob, ap, 'back');
    const { cx, cy } = hHead(ctx, dir, w, o);
    if (dir !== 'up') {
      eyes(ctx, dir, cx, cy, { blush: true, ...eyeOpts(ap) });
      faceMarks(ctx, dir, cx, cy, ap);
    }
    // Ohne Helm sieht man die Haare
    if (L.h === -2) {
      drawHair(ctx, dir, cx, cy, ap, 'front');
      return;
    }
    // Helm
    const steel = lookColor(A.helm, L.h, '#8f98a3');
    const plume = lookColor(A.crest, L.h, '#c8402f');
    if (dir === 'up') {
      oval(ctx, cx, cy - 1, 11.8, 11.2, steel);
      box(ctx, cx - 10.5, cy + 3, 21, 6.5, 2, darker(steel, 0.12));
      stroke(ctx, brass, 1, [[cx - 11, cy - 2], [cx + 11, cy - 2]]);
    } else {
      paintShape(ctx, () => { ctx.beginPath(); ctx.arc(cx, cy - 1, 11.8, Math.PI, 0); ctx.closePath(); }, steel, cx - 11.8, cy - 12.8, 23.6, 11.8);
      box(ctx, cx - 12.5, cy - 2.6, 25, 3.2, 1.5, brass);
      if (dir === 'down') {
        box(ctx, cx - 12, cy - 0.5, 3.2, 7.5, 1.2, steel);
        box(ctx, cx + 8.8, cy - 0.5, 3.2, 7.5, 1.2, steel);
      } else {
        box(ctx, cx - 11.5, cy - 0.5, 6, 8.5, 1.5, steel);
      }
    }
    // Helmbusch, ab Stufe Drache Hörner, ab Stufe Himmel Flügel
    if (dir === 'side') poly(ctx, [[cx - 2, cy - 11.8], [cx + 2.5, cy - 12.4], [cx - 2, cy - 18.5], [cx - 9.5, cy - 15.5]], plume);
    else poly(ctx, [[cx - 2.2, cy - 12], [cx + 2.2, cy - 12], [cx + 1.4, cy - 19], [cx - 1.4, cy - 19]], plume);
    if (L.h >= 3 && L.h < 6 && dir !== 'up') {
      poly(ctx, [[cx - 8, cy - 8], [cx - 13, cy - 16], [cx - 6, cy - 10]], '#e0d6bc');
      if (dir === 'down') poly(ctx, [[cx + 8, cy - 8], [cx + 13, cy - 16], [cx + 6, cy - 10]], '#e0d6bc');
    }
    if (L.h >= 6) {
      poly(ctx, [[cx - 9, cy - 6], [cx - 17, cy - 13], [cx - 15, cy - 7], [cx - 18, cy - 6], [cx - 10, cy - 3]], '#ffffff');
      if (dir !== 'side') poly(ctx, [[cx + 9, cy - 6], [cx + 17, cy - 13], [cx + 15, cy - 7], [cx + 18, cy - 6], [cx + 10, cy - 3]], '#ffffff');
    }
  },

  ninja(ctx, dir, w, f, L = { a: -1, h: -1 }) {
    const A = ARMOR_LOOK.ninja;
    const torso = lookColor(A.torso, L.a, '#312c3d');
    const ap = lookOf(L, 'ninja');
    const o = { skin: skinOf(ap), pants: darker(torso, 0.1), boots: '#3d3848', torso, sleeve: darker(torso, 0.1), gloves: '#3d3848' };
    const scarf = lookColor(A.scarf, L.a, '#6b4f9a');
    const hood = lookColor(A.hood, L.h, '#2a2633');
    const ty = -24 + w.bob;
    const sway = [0, 1.6, 0, -1.6, 0][f];
    // Schalenden hinter dem Körper
    if (dir === 'side') poly(ctx, [[-3, ty - 1], [-1, ty + 2.5], [-12, ty + 8 + sway], [-16, ty + 4.5 + sway]], scarf);
    if (dir === 'up') {
      poly(ctx, [[-2.5, ty - 1], [1, ty - 1], [3 + sway, ty + 15], [-1.5 + sway, ty + 15]], scarf);
      poly(ctx, [[1, ty - 1], [4, ty - 1], [8.5 + sway, ty + 11], [5.5 + sway, ty + 12.5]], darker(scarf, 0.12));
    }
    hLegs(ctx, dir, w, o);
    // Beinwickel, mit Stiefeln verdeckt
    const wrap = 'rgba(205,200,220,0.55)';
    if (dir === 'side') {
      stroke(ctx, wrap, 0.7, [[-2 + w.l * 2.6, -7.5], [2.2 + w.l * 2.6, -6.5]]);
    } else {
      stroke(ctx, wrap, 0.7, [[-5.6, -7.5], [-1.4, -6.6]]);
      stroke(ctx, wrap, 0.7, [[1.4, -7.5], [5.6, -6.6]]);
    }
    gearBoots(ctx, dir, w, L.b);
    // Tabi: geteilte Zehen
    if (dir === 'down' && gearTier(L.b) < 0) {
      stroke(ctx, '#1a1620', 0.6, [[-4.4, -2.6 + (w.l > 0 ? -1.2 : 0)], [-4.4, -0.3 + (w.l > 0 ? -1.2 : 0)]]);
      stroke(ctx, '#1a1620', 0.6, [[2.6, -2.6 + (w.r > 0 ? -1.2 : 0)], [2.6, -0.3 + (w.r > 0 ? -1.2 : 0)]]);
    }
    const half = hBody(ctx, dir, w, o);
    // Kreuzgurte
    if (dir === 'side') stroke(ctx, '#5a4030', 1.4, [[-4.5, ty + 1], [4.5, ty + 10.5]]);
    else {
      stroke(ctx, '#5a4030', 1.4, [[-half + 2, ty + 1], [half - 2, ty + 10.5]]);
      stroke(ctx, '#5a4030', 1.4, [[half - 2, ty + 1], [-half + 2, ty + 10.5]]);
    }
    box(ctx, -half, ty + 11, half * 2, 3.2, 1, scarf);
    if (dir === 'down') poly(ctx, [[3, ty + 13], [5, ty + 13], [6.5 + sway * 0.4, ty + 18.5], [4, ty + 18.5]], scarf);
    gearBelt(ctx, dir, ty + 10.8, half, L.g);
    hArms(ctx, dir, w, o);
    gearShoulders(ctx, dir, w, L.s, ty, 11);
    // Schal am Hals
    if (dir === 'side') box(ctx, -6, ty - 2.5, 12, 4.8, 2, scarf);
    else box(ctx, -8.5, ty - 2.5, 17, 4.8, 2, scarf);
    // lange Haare und Zopf schauen hinten aus der Kapuze
    if (ap.hair === 2 || ap.hair === 4) drawHair(ctx, dir === 'up' ? 'down' : dir, dir === 'side' ? 1.5 : 0, -34.5 + w.bob, ap, 'back');
    const { cx, cy } = hHead(ctx, dir, w, o);
    if (dir === 'side') poly(ctx, [[cx - 9.5, cy - 4], [cx - 8.5, cy - 0.5], [cx - 17, cy + 3 + sway], [cx - 18, cy - 1.5 + sway]], hood);
    oval(ctx, cx, cy - 0.5, 11.8, 11.2, hood);
    if (dir === 'up') {
      box(ctx, cx - 2.5, cy + 2, 5, 3, 1.2, scarf);
      return;
    }
    // Augenschlitz in der Kapuze
    if (dir === 'side') box(ctx, cx + 1.5, cy - 2, 10, 5.8, 2.6, o.skin);
    else box(ctx, cx - 8.5, cy - 2, 17, 5.8, 2.6, o.skin);
    eyes(ctx, dir, cx, cy - 0.5, { narrow: true, color: eyeOpts(ap).color });
    // Ab Stufe Nacht ein Stirnband mit Platte, ab Stufe Himmel leuchtende Augen
    if (L.h >= 4) {
      box(ctx, dir === 'side' ? cx - 1 : cx - 9, cy - 6, dir === 'side' ? 11 : 18, 2.4, 1, lookColor(A.scarf, L.h, scarf));
      if (dir === 'down') oval(ctx, cx, cy - 4.8, 1.6, 1.6, '#e8c46a');
    }
    if (L.h >= 6) eyes(ctx, dir, cx, cy - 0.5, { narrow: true, color: '#bfe8ff', glow: '#9fe8ff' });
  },

  schamane(ctx, dir, w, f, L = { a: -1, h: -1 }) {
    const A = ARMOR_LOOK.schamane;
    const robe = lookColor(A.robe, L.a, '#2c6f6a');
    const gold = lookColor(A.gold, L.a, '#e0c36a');
    const ap = lookOf(L, 'schamane');
    const o = { skin: skinOf(ap), boots: '#3a2c24', robe, sleeve: robe, cuff: gold, wideSleeves: true };
    const ty = -24 + w.bob;
    hLegs(ctx, dir, w, o);
    gearBoots(ctx, dir, w, L.b, true);
    const wb = hBody(ctx, dir, w, o);
    stroke(ctx, gold, 1.2, [[-wb + 1, -3.8], [wb - 1, -3.8]]);
    // gestickte Zacken über dem Saum
    const zig = [];
    for (let k = 0; k <= 10; k++) zig.push([-wb + 1.5 + (2 * wb - 3) * k / 10, k % 2 ? -6.4 : -5.2]);
    stroke(ctx, lighter(gold, 0.1), 0.6, zig);
    if (dir === 'down') {
      poly(ctx, [[-2.5, ty + 1], [2.5, ty + 1], [3.6, -3], [-3.6, -3]], '#e9e2cf');
      stroke(ctx, gold, 0.9, [[-2.6, ty + 1], [-3.7, -3]]);
      stroke(ctx, gold, 0.9, [[2.6, ty + 1], [3.7, -3]]);
      ctx.strokeStyle = gold;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(-7.5, -8, 2.4, 0.3, 5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(7.5, -8, 2.4, Math.PI - 5, Math.PI - 0.3);
      ctx.stroke();
    } else if (dir === 'up') {
      ctx.strokeStyle = gold;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, ty + 6, 3.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, ty + 6, 1.6, 0, Math.PI * 1.5);
      ctx.stroke();
    }
    const bw = dir === 'side' ? 13 : 18.5;
    box(ctx, -bw / 2, ty + 10.5, bw, 3, 1, gold);
    gearBelt(ctx, dir, ty + 10.3, bw / 2, L.g);
    if (dir !== 'up') {
      const talisman = (x) => {
        box(ctx, x, ty + 13.3, 3.4, 6.2, 0.5, '#efe6cc');
        stroke(ctx, '#b33a2c', 0.6, [[x + 0.8, ty + 14.5], [x + 2.6, ty + 15.6], [x + 0.8, ty + 16.8], [x + 2.6, ty + 18]]);
      };
      if (dir === 'side') talisman(-2);
      else { talisman(-7); talisman(3.6); }
    }
    hArms(ctx, dir, w, o);
    gearShoulders(ctx, dir, w, L.s, ty, 10.5);
    drawHair(ctx, dir, dir === 'side' ? 1.5 : 0, -34.5 + w.bob, ap, 'back');
    const { cx, cy } = hHead(ctx, dir, w, o);
    if (dir !== 'up') {
      eyes(ctx, dir, cx, cy, { blush: true, ...eyeOpts(ap) });
      faceMarks(ctx, dir, cx, cy, ap);
    }
    drawHair(ctx, dir, cx, cy, ap, 'front');
    if (dir === 'down') {
      oval(ctx, cx - 11, cy + 4, 1.1, 1.1, gold);
      oval(ctx, cx + 11, cy + 4, 1.1, 1.1, gold);
    }
    if (L.h === -2) return;
    const band = lookColor(A.band, L.h, gold);
    if (dir === 'up') box(ctx, cx - 11.2, cy - 6.2, 22.4, 2.6, 1.2, band);
    else if (dir === 'down') {
      box(ctx, cx - 11.2, cy - 7, 22.4, 2.6, 1.2, band);
      oval(ctx, cx, cy - 5.7, 1.5, 1.5, L.h >= 4 ? '#ffffff' : '#c8402f');
    } else box(ctx, cx - 9.5, cy - 7, 20.5, 2.6, 1.2, band);
    // Ab Stufe Phönix eine Krone mit Zacken, ab Stufe Himmel ein Heiligenschein
    if (L.h >= 3 && dir !== 'up') {
      const xs = dir === 'side' ? [cx - 6, cx - 1, cx + 4] : [cx - 7, cx - 2.5, cx + 2.5, cx + 7];
      for (const x of xs) poly(ctx, [[x - 2, cy - 7], [x, cy - 12 - (L.h >= 5 ? 2 : 0)], [x + 2, cy - 7]], band);
    }
    if (L.h >= 6) {
      ctx.strokeStyle = band;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(cx, cy - 16, 8, 2.4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  },

  nekromant(ctx, dir, w, f, L = { a: -1, h: -1 }) {
    const A = ARMOR_LOOK.nekromant;
    const bone = '#ddd5bb';
    const robe = lookColor(A.robe, L.a, '#334a31');
    const ap = lookOf(L, 'nekromant');
    const o = { skin: skinOf(ap), boots: '#2a2420', robe, sleeve: darker(robe, 0.12), wideSleeves: true, tattered: true, gloves: skinOf(ap) };
    const hood = lookColor(A.hood, L.h, '#2a3b28');
    const eyeGlow = lookColor(A.glow, L.h, '#a7e37f');
    const ty = -24 + w.bob;
    hLegs(ctx, dir, w, o);
    gearBoots(ctx, dir, w, L.b, true);
    const wb = hBody(ctx, dir, w, o);
    if (dir === 'down') {
      poly(ctx, [[-2.5, ty + 2], [2.5, ty + 2], [3.6, -3.5], [-3.6, -3.5]], '#1d281c');
      // schwach leuchtende Rune auf der Brust und geflickte Stellen
      ctx.strokeStyle = 'rgba(167,227,127,0.55)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.arc(0, ty + 6, 1.8, 0, Math.PI * 2);
      ctx.moveTo(0, ty + 3.6);
      ctx.lineTo(0, ty + 8.4);
      ctx.stroke();
      for (const [x, y] of [[-6, ty + 9], [5.5, ty + 12]]) {
        stroke(ctx, '#8a8470', 0.5, [[x - 1.2, y - 1.2], [x + 1.2, y + 1.2]]);
        stroke(ctx, '#8a8470', 0.5, [[x + 1.2, y - 1.2], [x - 1.2, y + 1.2]]);
      }
    }
    stroke(ctx, 'rgba(167,227,127,0.35)', 0.7, [[-wb + 2, -5.5], [wb - 2, -5.5]]);
    const bw = dir === 'side' ? 13 : 18.5;
    box(ctx, -bw / 2, ty + 10.5, bw, 2.6, 1, '#4a3a2a');
    gearBelt(ctx, dir, ty + 10.2, bw / 2, L.g);
    const skull = (x, y, s = 1) => {
      oval(ctx, x, y, 3.6 * s, 3.2 * s, bone);
      dot(ctx, x - 1.3 * s, y, 0.85 * s, 0.85 * s, '#1a1210');
      dot(ctx, x + 1.3 * s, y, 0.85 * s, 0.85 * s, '#1a1210');
    };
    if (dir !== 'up') skull(dir === 'side' ? 4 : 0, ty + 11.8, 0.7);
    hArms(ctx, dir, w, o);
    if (!gearShoulders(ctx, dir, w, L.s, ty, 10.5)) {
      if (dir === 'side') skull(w.arm * 1.5, ty + 1.5);
      else { skull(-10.5, ty + 1); skull(10.5, ty + 1); }
    }
    const cx = dir === 'side' ? 1.5 : 0;
    const cy = -34.5 + w.bob;
    if (dir === 'side') {
      poly(ctx, [[cx - 12, cy + 7.5], [cx - 12.5, cy - 3], [cx - 9, cy - 10], [cx - 17, cy - 16], [cx - 2, cy - 12.5], [cx + 10, cy - 5.5], [cx + 11.8, cy + 6.5]], hood);
      dot(ctx, cx + 5.8, cy + 1.5, 5, 6.5, '#0d120c');
      oval(ctx, cx + 6.5, cy + 6.4, 3, 1.8, o.skin);
      eyes(ctx, 'side', cx, cy - 1, { color: lighter(eyeGlow, 0.5), glow: eyeGlow, narrow: true });
      if (L.h >= 4) for (const [x, h] of [[cx - 4, 6], [cx + 1, 8], [cx + 6, 6]]) poly(ctx, [[x - 1.5, cy - 11], [x, cy - 11 - h], [x + 1.5, cy - 11]], bone);
      return;
    }
    poly(ctx, [[cx - 12, cy + 7.5], [cx - 12.8, cy - 4], [cx - 5, cy - 13], [cx + 1, cy - 20], [cx + 6, cy - 12.5], [cx + 12.8, cy - 4], [cx + 12, cy + 7.5]], hood);
    if (dir === 'down') {
      dot(ctx, cx, cy + 1.6, 7.6, 7.2, '#0d120c');
      // lange Haare fallen vorn aus der Kapuze
      if (ap.hair === 2 || ap.hair === 4) for (const x of [cx - 7.4, cx + 4.6]) box(ctx, x, cy - 3, 2.8, 12, 1.2, hairOf(ap));
      oval(ctx, cx, cy + 6.6, 4, 2, o.skin);
      eyes(ctx, 'down', cx, cy - 1, { color: lighter(eyeGlow, 0.5), glow: eyeGlow, narrow: true });
    }
    // Ab Stufe Totenkönig eine Knochenkrone auf der Kapuze
    if (L.h >= 4) for (const [x, h] of [[cx - 7, 5], [cx - 3.5, 7], [cx, 9], [cx + 3.5, 7], [cx + 7, 5]]) poly(ctx, [[x - 1.4, cy - 12], [x, cy - 12 - h], [x + 1.4, cy - 12]], bone);
  }
};

const FIGURE_BOUNDS = { x: -30, y: -60, w: 60, h: 66 };

function characterSprite(classId, dir, frame, look = { a: -1, h: -1 }) {
  // Spielfiguren in höherer Auflösung (4 Pixel je Einheit), damit sie auch nah scharf bleiben
  return getSprite(`c:${classId}:${dir}:${frame}:${look.a}:${look.h}:${gearTier(look.b)}:${gearTier(look.g)}:${gearTier(look.s)}:${lookKey(look.ap)}`, FIGURE_BOUNDS, (ctx) => CHARACTER_ART[classId](ctx, dir, WALK[frame], frame, look), 4);
}

// Wo die Waffenhand sitzt (relativ zu den Füßen, Figur nach rechts bzw. zum Betrachter)
function handPosition(dir, frame, side) {
  const w = WALK[frame];
  if (w.raise) {
    if (dir === 'side') return { x: 9.3, y: -29.5 + w.bob };
    return side === 'left' ? { x: -17.6, y: -33 + w.bob } : { x: 17.6, y: -33 + w.bob };
  }
  if (dir === 'side') return { x: w.arm * 2.2, y: -11 + w.bob };
  return side === 'left' ? { x: -11, y: -11 + w.bob - w.arm * 0.8 } : { x: 11, y: -11 + w.bob + w.arm * 0.8 };
}

// --- Dorfbewohner und Skelette ---------------------------------------------------------------

const NPC_ART = {
  haendler(ctx) {
    const w = WALK[0];
    const o = { skin: '#ecc9a5', boots: '#3a2c24', robe: '#6d3f7d', sleeve: '#6d3f7d', cuff: '#e0c36a', wideSleeves: true };
    hLegs(ctx, 'down', w, o);
    hBody(ctx, 'down', w, o);
    box(ctx, -6, -18, 12, 14, 3, '#efe6cc');
    box(ctx, -9.25, -13.5, 18.5, 3, 1, '#c9a35a');
    hArms(ctx, 'down', w, o);
    box(ctx, -8.5, -26.5, 17, 4.5, 2, '#c9a35a');
    const { cx, cy } = hHead(ctx, 'down', w, o);
    eyes(ctx, 'down', cx, cy, { blush: true });
    const hair = '#7a4a2a';
    paintShape(ctx, () => {
      ctx.beginPath();
      ctx.arc(cx, cy - 0.5, 11.4, Math.PI * 1.02, Math.PI * 1.98);
      ctx.quadraticCurveTo(cx, cy - 7, cx - 11.3, cy - 1.5);
      ctx.closePath();
    }, hair, cx - 11.4, cy - 12, 22.8, 10);
    box(ctx, cx - 11.6, cy - 4, 3.2, 12, 1.5, hair);
    box(ctx, cx + 8.4, cy - 4, 3.2, 12, 1.5, hair);
    oval(ctx, cx, cy - 12, 5, 4.2, hair);
    box(ctx, cx - 1.2, cy - 17, 2.4, 6, 1, '#c9a35a');
  },

  schmied(ctx) {
    const w = WALK[0];
    const o = { skin: '#d9a982', pants: '#3b2d25', boots: '#2f2419', torso: '#a8907a', sleeve: '#d9a982', wide: 1.15 };
    hLegs(ctx, 'down', w, o);
    const half = hBody(ctx, 'down', w, o);
    box(ctx, -half + 2, -21, half * 2 - 4, 19, 3, '#6b4a2e');
    stroke(ctx, '#3e2c1f', 0.8, [[-half + 2, -21], [-half + 5, -25]]);
    stroke(ctx, '#3e2c1f', 0.8, [[half - 2, -21], [half - 5, -25]]);
    hArms(ctx, 'down', w, o);
    const { cx, cy } = hHead(ctx, 'down', w, o);
    eyes(ctx, 'down', cx, cy);
    paintShape(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(cx - 9, cy + 2);
      ctx.quadraticCurveTo(cx - 8, cy + 13, cx, cy + 14);
      ctx.quadraticCurveTo(cx + 8, cy + 13, cx + 9, cy + 2);
      ctx.quadraticCurveTo(cx, cy + 6, cx - 9, cy + 2);
      ctx.closePath();
    }, '#7a4a2a', cx - 9, cy + 2, 18, 12);
    oval(ctx, cx - 3, cy - 7, 3, 1.4, lighter('#d9a982', 0.2));
    heldWeapon(ctx, 'club', 12.5, -10.5, -1.2);
  }
};

// Waffenhändler Goro: kräftig, Lederweste, Stirnband, hält ein Schwert
NPC_ART.waffen = (ctx) => {
  const w = WALK[0];
  const o = { skin: '#d9a982', pants: '#3b2d25', boots: '#2f2419', torso: '#9a3a2a', sleeve: '#d9a982', wide: 1.12 };
  hLegs(ctx, 'down', w, o);
  const half = hBody(ctx, 'down', w, o);
  poly(ctx, [[-half + 1, -23], [-3, -23], [-2, -9], [-half + 2, -9]], '#5a4030');
  poly(ctx, [[half - 1, -23], [3, -23], [2, -9], [half - 2, -9]], '#5a4030');
  box(ctx, -half, -12.5, half * 2, 3, 1, '#3a2a1c');
  heldWeapon(ctx, 'sword', 12.5, -10.5, -1.25);
  hArms(ctx, 'down', w, o);
  const { cx, cy } = hHead(ctx, 'down', w, o);
  eyes(ctx, 'down', cx, cy);
  paintShape(ctx, () => { ctx.beginPath(); ctx.arc(cx, cy - 0.5, 11.4, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); }, '#2a1c14', cx - 11.4, cy - 12, 22.8, 11);
  box(ctx, cx - 11.4, cy - 6.5, 22.8, 3, 1.2, '#c8402f');
  poly(ctx, [[cx + 10, cy - 5], [cx + 15, cy - 1], [cx + 13, cy - 6]], '#c8402f');
  paintShape(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy + 4);
    ctx.quadraticCurveTo(cx, cy + 12, cx + 7, cy + 4);
    ctx.quadraticCurveTo(cx, cy + 7, cx - 7, cy + 4);
    ctx.closePath();
  }, '#2a1c14', cx - 7, cy + 4, 14, 7);
};

// Rüstungshändlerin Mei: Lederschürze mit Metallplatten, Pferdeschwanz, hält einen Schild
NPC_ART.ruestung = (ctx) => {
  const w = WALK[0];
  const o = { skin: '#ecc9a5', pants: '#3a3f48', boots: '#2a2420', torso: '#5a6a7a', sleeve: '#5a6a7a', cuff: '#c9a35a' };
  hLegs(ctx, 'down', w, o);
  const half = hBody(ctx, 'down', w, o);
  box(ctx, -half + 3, -20, half * 2 - 6, 16, 3, '#6b4a2e');
  box(ctx, -4, -18, 8, 5, 1, '#c7ccd3');
  box(ctx, -half, -12.5, half * 2, 2.6, 1, '#c9a35a');
  hArms(ctx, 'down', w, o);
  ctx.save();
  ctx.translate(-11, -11);
  ctx.scale(0.8, 0.8);
  shieldArt(ctx, 2);
  ctx.restore();
  const { cx, cy } = hHead(ctx, 'down', w, o);
  eyes(ctx, 'down', cx, cy, { blush: true });
  const hair = '#3a2a2a';
  paintShape(ctx, () => {
    ctx.beginPath();
    ctx.arc(cx, cy - 0.5, 11.4, Math.PI * 1.02, Math.PI * 1.98);
    ctx.quadraticCurveTo(cx, cy - 7, cx - 11.3, cy - 1.5);
    ctx.closePath();
  }, hair, cx - 11.4, cy - 12, 22.8, 10);
  box(ctx, cx + 8.4, cy - 4, 3.2, 9, 1.5, hair);
  poly(ctx, [[cx + 6, cy - 10], [cx + 15, cy - 6], [cx + 13, cy + 8], [cx + 9, cy - 4]], hair);
  box(ctx, cx + 7, cy - 9, 3, 3, 1, '#c9a35a');
};

// Symbole über den Köpfen der Dorfbewohner
const NPC_ICONS = {
  haendler(ctx) {
    oval(ctx, 0, 0, 6.5, 6.5, '#e8c46a');
    oval(ctx, 0, 0, 3.8, 3.8, '#c9a35a');
  },
  waffen(ctx) {
    ctx.rotate(-Math.PI / 4);
    ctx.scale(0.6, 0.6);
    ctx.translate(-11, 0);
    weaponArt(ctx, 'sword', 3);
  },
  ruestung(ctx) {
    ctx.scale(0.62, 0.62);
    shieldArt(ctx, 3);
  },
  schmied(ctx) {
    ctx.rotate(-0.6);
    box(ctx, -1.2, -2, 2.4, 13, 1, '#6b4a2e');
    box(ctx, -6, -7, 12, 6, 1.5, '#9aa1a8');
  }
};

// Weitere Dorfbewohner -------------------------------------------------------------------

// Einfache Figur von vorn mit Haaren bzw. Kopfbedeckung (head) und Dingen in der Hand (extra)
function villagerArt(ctx, o) {
  const w = WALK[0];
  if (o.scale) ctx.scale(o.scale, o.scale);
  if (o.behind) o.behind(ctx);
  hLegs(ctx, 'down', w, o);
  const half = hBody(ctx, 'down', w, o);
  if (o.body) o.body(ctx, half);
  hArms(ctx, 'down', w, o);
  const { cx, cy } = hHead(ctx, 'down', w, o);
  eyes(ctx, 'down', cx, cy, o.eyes || {});
  if (o.head) o.head(ctx, cx, cy);
  if (o.extra) o.extra(ctx);
}

const hairCap = (ctx, cx, cy, color, long) => {
  paintShape(ctx, () => {
    ctx.beginPath();
    ctx.arc(cx, cy - 0.5, 11.4, Math.PI * 1.02, Math.PI * 1.98);
    ctx.quadraticCurveTo(cx, cy - 7, cx - 11.3, cy - 1.5);
    ctx.closePath();
  }, color, cx - 11.4, cy - 12, 22.8, 10);
  if (long) {
    box(ctx, cx - 11.6, cy - 4, 3.2, long, 1.5, color);
    box(ctx, cx + 8.4, cy - 4, 3.2, long, 1.5, color);
  }
};

Object.assign(NPC_ART, {
  // Dungeon-Eingang: Felsbogen mit dunklem Wirbel (die Farbe des Dungeons leuchtet beim Zeichnen darüber)
  eingang(ctx) {
    oval(ctx, 0, -2, 24, 6, '#3a3430');
    paintShape(ctx, () => { ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(-20, -34); ctx.quadraticCurveTo(0, -60, 20, -34); ctx.lineTo(22, 0); ctx.closePath(); }, '#6a625a', -22, -56, 44, 56);
    paintShape(ctx, () => { ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-13, -30); ctx.quadraticCurveTo(0, -48, 13, -30); ctx.lineTo(14, 0); ctx.closePath(); }, '#120c14', -14, -46, 28, 46);
    for (const [x, y, r] of [[-19, -10, 5], [18, -16, 6], [-16, -38, 5], [12, -44, 5], [-4, -50, 4.5]]) oval(ctx, x, y, r, r * 0.8, '#7e766c');
    ctx.strokeStyle = 'rgba(200,180,255,0.5)';
    ctx.lineWidth = 1.4;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.arc(0, -20, 4 + k * 3.5, k, k + 4);
      ctx.stroke();
    }
  },
  // Weltentor: großer Steinring mit leuchtendem Wirbel (bringt zu Map 1, 2 und 3)
  weltentor(ctx) {
    oval(ctx, 0, -2, 26, 7, '#5a544c');
    oval(ctx, 0, -3, 21, 5, '#7a746a');
    box(ctx, -22, -10, 8, 9, 2, '#6e685e');
    box(ctx, 14, -10, 8, 9, 2, '#6e685e');
    paintShape(ctx, () => { ctx.beginPath(); ctx.ellipse(0, -30, 20, 26, 0, 0, Math.PI * 2); ctx.ellipse(0, -30, 13.5, 19.5, 0, 0, Math.PI * 2, true); }, '#8a8478', -20, -56, 40, 52);
    oval(ctx, 0, -30, 13.5, 19.5, '#3a6ab8');
    oval(ctx, 0, -30, 9, 14, '#7ab8ff');
    oval(ctx, 0, -30, 4.5, 8, '#e8f6ff');
    for (const [x, y] of [[0, -56], [-19, -38], [19, -38], [-19, -20], [19, -20]]) oval(ctx, x, y, 3.2, 3.2, '#c9a35a');
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, -30, 7, 0.5, 3.6);
    ctx.stroke();
  },
  // Ausgang im Dungeon: leuchtender Steinkreis am Boden
  ausgang(ctx) {
    oval(ctx, 0, -2, 18, 7, '#4a4440');
    oval(ctx, 0, -3, 14, 5, '#9fd0ff');
    oval(ctx, 0, -3.5, 9, 3, '#e8f6ff');
    for (const [x, y] of [[-16, -3], [16, -3], [0, -9], [0, 3]]) box(ctx, x - 2, y - 6, 4, 7, 1, '#7e766c');
  },
  stallmeister: (ctx) => villagerArt(ctx, {
    skin: '#e2b98f', pants: '#4a3a2a', boots: '#2a1e16', torso: '#7a5a3a', sleeve: '#7a5a3a', gloves: '#5a3a22', belt: '#2a1e16',
    body: (ctx, half) => { box(ctx, -half, -12.5, half * 2, 2.6, 1, '#2a1e16'); box(ctx, -3, -22, 6, 9, 1.5, '#c9a35a'); },
    head: (ctx, cx, cy) => {
      paintShape(ctx, () => { ctx.beginPath(); ctx.ellipse(cx, cy - 7, 17, 4, 0, 0, Math.PI * 2); }, '#c8a060', cx - 17, cy - 11, 34, 8);
      paintShape(ctx, () => { ctx.beginPath(); ctx.arc(cx, cy - 8, 9, Math.PI, 0); ctx.closePath(); }, '#c8a060', cx - 9, cy - 17, 18, 9);
      box(ctx, cx - 9, cy - 10, 18, 2, 0.8, '#7a2a1a');
      stroke(ctx, '#5a3a22', 1.2, [[cx - 4, cy + 6], [cx + 4, cy + 6]]);
    },
    extra: (ctx) => {
      // Zügel in der Hand
      stroke(ctx, '#5a3a22', 1.4, [[11, -14], [16, -4], [13, 6]]);
    }
  }),
  // Dorfältester Bao: weißer Bart, Robe, Stab
  aeltester: (ctx) => villagerArt(ctx, {
    skin: '#e6c4a0', boots: '#3a2c24', robe: '#7a5a2a', sleeve: '#7a5a2a', cuff: '#e0c36a', wideSleeves: true,
    behind: (ctx) => { box(ctx, 11, -44, 2.6, 44, 1, '#6b4a2e'); oval(ctx, 12.3, -46, 3.4, 3.4, '#9be2ff'); },
    body: (ctx) => box(ctx, -9.25, -13.5, 18.5, 3, 1, '#e0c36a'),
    head: (ctx, cx, cy) => {
      paintShape(ctx, () => { ctx.beginPath(); ctx.moveTo(cx - 8, cy + 3); ctx.quadraticCurveTo(cx - 6, cy + 18, cx, cy + 20); ctx.quadraticCurveTo(cx + 6, cy + 18, cx + 8, cy + 3); ctx.quadraticCurveTo(cx, cy + 7, cx - 8, cy + 3); ctx.closePath(); }, '#f4f0e8', cx - 8, cy + 3, 16, 17);
      stroke(ctx, '#f4f0e8', 2.4, [[cx - 7, cy - 2], [cx - 3, cy - 3]]);
      stroke(ctx, '#f4f0e8', 2.4, [[cx + 3, cy - 3], [cx + 7, cy - 2]]);
      oval(ctx, cx, cy - 12, 5, 4, '#f4f0e8');
      box(ctx, cx - 1.2, cy - 18, 2.4, 6, 1, '#6b4a2e');
    }
  }),
  // Jägerin Rin: grüne Tunika, Bogen, Pferdeschwanz
  jaegerin: (ctx) => villagerArt(ctx, {
    skin: '#ecc9a5', pants: '#3a3a2a', boots: '#4a3424', torso: '#3e6a3a', sleeve: '#3e6a3a', gloves: '#6b4a2e', eyes: { blush: true },
    behind: (ctx) => { box(ctx, -15, -40, 5, 18, 1.5, '#6b4a2e'); for (const x of [-14, -12]) stroke(ctx, '#e8e0cc', 0.8, [[x, -40], [x, -44]]); },
    body: (ctx, half) => { stroke(ctx, '#6b4a2e', 1.4, [[-half + 2, -23], [half - 2, -11]]); box(ctx, -half, -12.5, half * 2, 2.6, 1, '#6b4a2e'); },
    head: (ctx, cx, cy) => {
      hairCap(ctx, cx, cy, '#7a3a1a', 0);
      poly(ctx, [[cx + 6, cy - 10], [cx + 16, cy - 4], [cx + 13, cy + 10], [cx + 9, cy - 4]], '#7a3a1a');
      box(ctx, cx - 10, cy - 7, 20, 2.4, 1, '#3e6a3a');
    },
    extra: (ctx) => heldWeapon(ctx, 'bow', 13, -12, -1.57)
  }),
  // Wegweiserin Lian: blaue Robe, leuchtende Kugel
  teleport: (ctx) => villagerArt(ctx, {
    skin: '#ecc9a5', boots: '#2a2c3a', robe: '#2f4f7a', sleeve: '#2f4f7a', cuff: '#9fd0ff', wideSleeves: true, eyes: { blush: true },
    body: (ctx) => { box(ctx, -9.25, -13.5, 18.5, 3, 1, '#9fd0ff'); poly(ctx, [[-2.5, -23], [2.5, -23], [3.6, -3], [-3.6, -3]], '#e9e2cf'); },
    head: (ctx, cx, cy) => {
      hairCap(ctx, cx, cy, '#1a1a2a', 12);
      oval(ctx, cx, cy - 12, 4.5, 4, '#1a1a2a');
      stroke(ctx, '#9fd0ff', 1.2, [[cx - 3, cy - 15], [cx + 3, cy - 15]]);
    },
    extra: (ctx) => { oval(ctx, 12, -15, 4, 4, '#bfe8ff'); dot(ctx, 11, -16.2, 1.3, 1.3, '#ffffff'); }
  }),
  // Alchemist Yun: violette Robe, Fläschchen am Gürtel
  alchemist: (ctx) => villagerArt(ctx, {
    skin: '#e9c6a1', boots: '#2a2420', robe: '#5a3a6a', sleeve: '#5a3a6a', cuff: '#c9a35a', wideSleeves: true,
    body: (ctx) => {
      box(ctx, -9.25, -13.5, 18.5, 3, 1, '#c9a35a');
      for (const [x, c] of [[-6, '#7fb8ff'], [-1, '#9fe08f'], [4, '#ff8a7a']]) { box(ctx, x, -11, 3, 4, 1, c); box(ctx, x + 0.8, -12.4, 1.4, 1.6, 0.4, '#6b4a2e'); }
    },
    head: (ctx, cx, cy) => {
      paintShape(ctx, () => { ctx.beginPath(); ctx.arc(cx, cy - 0.5, 11.4, Math.PI, 0); ctx.closePath(); }, '#3a2a4a', cx - 11.4, cy - 12, 22.8, 11.4);
      box(ctx, cx - 12, cy - 4, 24, 2.6, 1, '#c9a35a');
      for (const x of [-4.2, 4.2]) { ctx.strokeStyle = '#c9a35a'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(cx + x, cy + 1.5, 3, 0, Math.PI * 2); ctx.stroke(); }
      paintShape(ctx, () => { ctx.beginPath(); ctx.moveTo(cx - 5, cy + 6); ctx.lineTo(cx, cy + 13); ctx.lineTo(cx + 5, cy + 6); ctx.closePath(); }, '#2a2a2a', cx - 5, cy + 6, 10, 7);
    },
    extra: (ctx) => { box(ctx, 10, -18, 5, 7, 2, '#9fe08f'); box(ctx, 11.4, -20, 2.2, 2.4, 0.5, '#6b4a2e'); }
  }),
  // Torwache mit Speer und Helm
  wache: (ctx) => villagerArt(ctx, {
    skin: '#e0b896', pants: '#3a2d25', boots: '#2a1e18', torso: '#8a2a24', sleeve: '#6a2a24', gloves: '#5a4030',
    behind: (ctx) => { box(ctx, 12, -58, 2.4, 58, 1, '#6b4a2e'); poly(ctx, [[11, -58], [13.2, -66], [15.4, -58]], '#c7ccd3'); },
    body: (ctx, half) => {
      for (let k = 0; k < 3; k++) stroke(ctx, 'rgba(201,163,90,0.8)', 0.7, [[-half + 1.5, -20.5 + k * 3], [half - 1.5, -20.5 + k * 3]]);
      box(ctx, -half, -12.5, half * 2, 3, 1, '#c9a35a');
    },
    head: (ctx, cx, cy) => {
      paintShape(ctx, () => { ctx.beginPath(); ctx.arc(cx, cy - 1, 11.8, Math.PI, 0); ctx.closePath(); }, '#7a828c', cx - 11.8, cy - 12.8, 23.6, 11.8);
      box(ctx, cx - 12.5, cy - 2.6, 25, 3.2, 1.5, '#c9a35a');
      oval(ctx, cx, cy - 13.5, 2.2, 2.2, '#c8402f');
    }
  }),
  bauer: (ctx) => villagerArt(ctx, {
    skin: '#d9a982', pants: '#5a4a32', boots: '#3a2a1c', torso: '#8a7a5a', sleeve: '#8a7a5a',
    head: (ctx, cx, cy) => {
      paintShape(ctx, () => { ctx.beginPath(); ctx.moveTo(cx - 17, cy - 3); ctx.lineTo(cx, cy - 16); ctx.lineTo(cx + 17, cy - 3); ctx.closePath(); }, '#d8b86a', cx - 17, cy - 16, 34, 13);
      stroke(ctx, '#a8884a', 0.7, [[cx - 9, cy - 7], [cx + 9, cy - 7]]);
    },
    extra: (ctx) => { box(ctx, 11.5, -34, 2, 30, 1, '#6b4a2e'); poly(ctx, [[9, -36], [16, -36], [17, -32], [8, -32]], '#9aa1a8'); }
  }),
  kind: (ctx) => villagerArt(ctx, {
    scale: 0.72, skin: '#f0cfaa', pants: '#3a4a6a', boots: '#3a2a1c', torso: '#c8602a', sleeve: '#c8602a', eyes: { blush: true },
    head: (ctx, cx, cy) => { hairCap(ctx, cx, cy, '#2a1c14', 0); oval(ctx, cx - 8, cy - 9, 3.4, 3.4, '#2a1c14'); oval(ctx, cx + 8, cy - 9, 3.4, 3.4, '#2a1c14'); }
  }),
  alte: (ctx) => villagerArt(ctx, {
    skin: '#e0c0a0', boots: '#2a2420', robe: '#5a4a5a', sleeve: '#5a4a5a', wideSleeves: true,
    head: (ctx, cx, cy) => { hairCap(ctx, cx, cy, '#cfcac4', 6); oval(ctx, cx, cy - 12.5, 5, 4.2, '#cfcac4'); stroke(ctx, '#c9a35a', 1, [[cx - 4, cy - 14], [cx + 5, cy - 11]]); },
    extra: (ctx) => box(ctx, -15, -16, 2.2, 16, 1, '#6b4a2e')
  }),
  moench: (ctx) => villagerArt(ctx, {
    skin: '#e0b48a', boots: '#3a2a1c', robe: '#d8782a', sleeve: '#d8782a', wideSleeves: true,
    body: (ctx) => stroke(ctx, '#9a3a1a', 2.4, [[-7, -23], [6, -6]]),
    head: (ctx, cx, cy) => { oval(ctx, cx - 3, cy - 7, 3, 1.5, lighter('#e0b48a', 0.25)); for (let k = 0; k < 5; k++) oval(ctx, -8 + k * 4, -23.5, 1.6, 1.6, '#6b2a1a'); }
  })
});

Object.assign(NPC_ICONS, {
  aeltester(ctx) {
    box(ctx, -6, -8, 12, 16, 1.5, '#efe6cc');
    for (const y of [-4, 0, 4]) stroke(ctx, '#8a7a5a', 0.8, [[-3.5, y], [3.5, y]]);
    oval(ctx, 0, -8, 7, 1.8, '#c9a35a');
    oval(ctx, 0, 8, 7, 1.8, '#c9a35a');
  },
  jaegerin(ctx) {
    oval(ctx, 0, 0, 7.5, 7.5, '#e8d8a8');
    oval(ctx, 0, 0, 5, 5, '#c8402f');
    oval(ctx, 0, 0, 2.2, 2.2, '#e8d8a8');
    stroke(ctx, '#6b4a2e', 1.2, [[2, -2], [9, -9]]);
  },
  teleport(ctx) {
    oval(ctx, 0, 0, 7, 7, '#5a8ab0');
    oval(ctx, 0, 0, 4.4, 4.4, '#bfe8ff');
    stroke(ctx, '#2f4f7a', 1.1, [[-2.5, -2.5], [2, 0], [-2.5, 2.5]]);
  },
  alchemist(ctx) {
    oval(ctx, 0, 3, 6.5, 6, '#9fe08f');
    box(ctx, -2.5, -9, 5, 7, 1, '#c9e8d0');
    box(ctx, -3.2, -10, 6.4, 2, 0.6, '#6b4a2e');
    dot(ctx, -2, 2, 1.4, 1.4, '#ffffff');
  }
});

function npcIconSprite(id) {
  return getSprite('ni:' + id, { x: -12, y: -12, w: 24, h: 24 }, (ctx) => NPC_ICONS[id](ctx));
}

function shieldSprite(tier) {
  return getSprite('sh:' + tier, { x: -12, y: -13, w: 24, h: 26 }, (ctx) => shieldArt(ctx, tier));
}

function npcSprite(id) {
  return getSprite('n:' + id, FIGURE_BOUNDS, (ctx) => NPC_ART[id](ctx));
}

function drawSkeletonArt(ctx, w) {
  const bone = '#ddd5bb';
  const dark = '#8f8a78';
  const s = w.l * 2.6;
  box(ctx, -1.5 - s, -10, 3, 8, 1.5, dark);
  box(ctx, -1.5 + s, -10, 3, 8, 1.5, bone);
  box(ctx, -2.5 + s, -3, 6, 3, 1.4, bone);
  box(ctx, -5, -12, 10, 3, 1.5, bone);
  box(ctx, -1.2, -24 + w.bob, 2.4, 12, 1, dark);
  for (let k = 0; k < 3; k++) box(ctx, -6, -23 + w.bob + k * 3.5, 12, 2, 1, bone);
  box(ctx, -1 + w.arm * 2, -22 + w.bob, 2.6, 11, 1.3, bone);
  heldWeapon(ctx, 'sword', 0.5 + w.arm * 2, -11 + w.bob, -1);
  oval(ctx, 1.5, -33 + w.bob, 9, 8.5, bone);
  box(ctx, 2.5, -29 + w.bob, 7, 4, 1.5, bone);
  dot(ctx, 5.5, -33.5 + w.bob, 2, 2.4, '#1a1210');
  dot(ctx, 5.5, -33.5 + w.bob, 0.7, 0.7, '#a7e37f');
  stroke(ctx, '#1a1210', 0.6, [[4, -27.5 + w.bob], [9, -27.5 + w.bob]]);
}

function skeletonSprite(frame) {
  return getSprite('s:' + frame, FIGURE_BOUNDS, (ctx) => drawSkeletonArt(ctx, WALK[frame]));
}

// Tuch über der unteren Gesichtshälfte (Seitenansicht), auf die Kopfform zugeschnitten
function faceCloth(ctx, cx, cy, color) {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, 11, 10.5, 0, 0, Math.PI * 2);
  ctx.clip();
  box(ctx, cx - 3, cy + 2.6, 16, 10, 1, color);
  ctx.restore();
  ctx.beginPath();
  ctx.ellipse(cx, cy, 11, 10.5, 0, 0.05, 1.35);
  ctx.strokeStyle = darker(color, 0.5);
  ctx.lineWidth = 0.7;
  ctx.stroke();
}

// --- Monster -------------------------------------------------------------------------------
// Alle Monster sind von der Seite gezeichnet und schauen nach rechts; links wird gespiegelt.

// Auge mit Weiß, Pupille und Glanzpunkt (Blick nach rechts)
function monsterEye(ctx, x, y, r, iris, angry) {
  dot(ctx, x, y, r, r * (angry ? 0.7 : 1), '#f4efe2');
  dot(ctx, x + r * 0.25, y + (angry ? r * 0.05 : 0), r * 0.62, r * (angry ? 0.5 : 0.7), iris);
  dot(ctx, x + r * 0.35, y, r * 0.3, r * 0.34, '#120c08');
  dot(ctx, x - r * 0.05, y - r * 0.3, r * 0.22, r * 0.22, '#ffffff');
  if (angry) stroke(ctx, '#120c08', 1.2, [[x - r * 1.1, y - r * 1.1], [x + r * 0.9, y - r * 0.45]]);
}

// Vierbeiner von der Seite: Hund, Wolf, Alpha-Wolf, Wildschwein
function beastArt(ctx, f, o) {
  const swing = [0, 2.2, 0, -2.2][f];
  const fur = o.fur;
  const dark = darker(fur, 0.28);
  const leg = (x, phase, back) => {
    const c = back ? darker(fur, 0.22) : fur;
    oval(ctx, x + phase * 0.4, -7.5, 3.2, 3.6, c);
    box(ctx, x + phase - 1.5, -8, 3.2, 7.4, 1.4, c);
    oval(ctx, x + phase + 0.6, -0.9, 2.8, 1.6, darker(fur, 0.45));
    stroke(ctx, '#f4efe2', 0.6, [[x + phase + 2.4, -0.4], [x + phase + 3.2, 0.3]]);
  };
  // Schwanz
  if (o.tail !== false) {
    if (o.bushy) poly(ctx, [[-10, -13], [-12, -9], [-17, -12 + swing * 0.4], [-21, -18 + swing * 0.4], [-18, -21 + swing * 0.4], [-14, -17]], fur);
    else poly(ctx, [[-10, -13], [-11, -10.5], [-17, -15 + swing * 0.5], [-17, -19 + swing * 0.5]], fur);
    if (o.bushy) dot(ctx, -19, -19 + swing * 0.4, 2.2, 1.8, o.belly);
  }
  leg(-8, -swing, true);
  leg(5, swing, true);
  leg(-6, swing, false);
  leg(7, -swing, false);
  // Körper mit hellerem Bauch und dunklem Rücken
  oval(ctx, 0, -12, 12.5, o.bulky ? 8.5 : 7, fur);
  dot(ctx, 1, -8.2, 9, 2.8, o.belly);
  dot(ctx, -1, -17.2, 9, 2.2, dark);
  // Fellsträhnen
  for (const [x, y] of [[-6, -14], [-1, -15], [4, -14]]) stroke(ctx, dark, 0.8, [[x, y], [x - 2, y + 3]]);
  if (o.ridge) {
    ctx.fillStyle = darker(fur, 0.45);
    ctx.beginPath();
    ctx.moveTo(-11, -16);
    for (let k = 0; k <= 9; k++) ctx.lineTo(-11 + k * 2.4, -21.5 + (k % 2 ? 3 : 0));
    ctx.lineTo(10, -16);
    ctx.closePath();
    ctx.fill();
  }
  if (o.scar) stroke(ctx, '#e0c0b0', 0.9, [[-4, -15], [0, -10]]);
  // Halskrause bzw. Mähne
  if (o.ruff) poly(ctx, [[4, -20], [7, -24], [8.5, -19.5], [11, -23.5], [12.5, -18], [12, -9], [5, -7]], o.ruff);
  if (o.mane) poly(ctx, [[1, -21], [4, -27], [6.5, -21], [9, -27], [11, -21], [14, -25], [13.5, -13], [3, -9]], o.mane);
  // Kopf
  const hx = o.bulky ? 12.5 : 11.5;
  oval(ctx, hx, -15.5, 6.6, 6, fur);
  if (o.ears !== false) {
    poly(ctx, [[hx - 3.5, -19.5], [hx - 1.5, -27], [hx + 2, -20]], darker(fur, 0.1));
    poly(ctx, [[hx - 2.6, -20.5], [hx - 1.5, -25], [hx + 0.8, -20.6]], '#d89a8a');
  }
  // Schnauze mit Maul und Nase
  box(ctx, hx + 2.5, -16.5, 8, 5.4, 2.4, o.snout || o.belly);
  stroke(ctx, darker(o.snout || o.belly, 0.5), 0.8, [[hx + 4, -12.6], [hx + 9.8, -13]]);
  if (o.fangs) {
    poly(ctx, [[hx + 6, -12.8], [hx + 6.8, -10.6], [hx + 7.4, -12.9]], '#ffffff');
    poly(ctx, [[hx + 8.4, -13], [hx + 9, -11], [hx + 9.5, -13]], '#ffffff');
  }
  dot(ctx, hx + 10, -15.6, 1.5, 1.2, '#1a1210');
  dot(ctx, hx + 9.6, -16.1, 0.5, 0.4, '#ffffff');
  if (o.tusk) {
    poly(ctx, [[hx + 6, -12], [hx + 9.5, -18], [hx + 8, -11.5]], '#f4ecd8');
    stroke(ctx, '#c8b898', 0.6, [[hx + 7, -12.5], [hx + 8.8, -16]]);
  }
  monsterEye(ctx, hx + 2, -17.6, o.small ? 1.3 : 1.7, o.eye || '#6a4a2a', o.angry);
  if (o.glow) {
    ctx.globalAlpha = 0.45;
    dot(ctx, hx + 2.3, -17.6, 3.6, 3.6, o.eye);
    ctx.globalAlpha = 1;
  }
}

// Menschengestalten von der Seite: Banditen, Orks, Oger, Dämon
function humanoidMonsterArt(ctx, f, o) {
  const w = WALK[f];
  ctx.save();
  ctx.scale(o.scale || 1, o.scale || 1);
  if (o.tail) {
    const sw = [0, 1.5, 0, -1.5][f];
    stroke(ctx, o.skin, 2.6, [[-4, -12], [-12, -10 + sw], [-17, -15 + sw]]);
    poly(ctx, [[-17, -15 + sw], [-21, -19 + sw], [-15, -20 + sw]], darker(o.skin, 0.3));
  }
  if (o.wings) {
    const flap = [0, -1.5, 0, 1.5][f];
    poly(ctx, [[-2, -24 + w.bob], [-15, -38 + flap], [-24, -30 + flap], [-18, -27], [-22, -19 + flap], [-13, -21], [-4, -14 + w.bob]], o.wings);
    stroke(ctx, darker(o.wings, 0.5), 1.2, [[-2, -24 + w.bob], [-15, -38 + flap], [-18, -27]]);
    stroke(ctx, darker(o.wings, 0.5), 1, [[-15, -38 + flap], [-22, -19 + flap]]);
  }
  if (o.cape) poly(ctx, [[-4, -24 + w.bob], [3, -24 + w.bob], [0, -4], [-9, -3 - w.arm * 1.5]], o.cape);
  hLegs(ctx, 'side', w, o);
  if (o.belly) {
    oval(ctx, 0, -17 + w.bob, 11, 10.5, o.skin);
    dot(ctx, 2, -14 + w.bob, 7, 6, lighter(o.skin, 0.12));
    for (const [x, y] of [[-5, -22], [4, -9], [-2, -13]]) stroke(ctx, darker(o.skin, 0.35), 0.8, [[x, y + w.bob], [x + 2, y + 2 + w.bob], [x + 1, y + 4 + w.bob]]);
    box(ctx, -10, -11 + w.bob, 20, 5, 2, o.pants);
    stroke(ctx, '#8a7a5a', 1, [[-10, -10 + w.bob], [10, -10 + w.bob]]);
    if (o.cracks) {
      for (const pts of [[[-6, -24], [-2, -19], [-5, -14]], [[3, -22], [6, -16], [3, -12]], [[-1, -10], [2, -7]]]) {
        stroke(ctx, o.cracks, 1.4, pts.map(([x, y]) => [x, y + w.bob]));
      }
    }
  } else {
    hBody(ctx, 'side', w, o);
    if (o.straps) stroke(ctx, o.straps, 1.3, [[-5, -23 + w.bob], [5, -13 + w.bob]]);
    if (o.belt) {
      box(ctx, -6.5, -13.5 + w.bob, 13, 2.6, 1, o.belt);
      if (o.pouch) box(ctx, -6, -12 + w.bob, 4, 4, 1, o.pouch);
    }
    if (o.necklace) for (let k = 0; k < 3; k++) poly(ctx, [[k * 2.5 - 1, -23 + w.bob], [k * 2.5 + 0.2, -20 + w.bob], [k * 2.5 + 1.2, -23 + w.bob]], '#f4ecd8');
    if (o.pauldron) {
      oval(ctx, w.arm, -21 + w.bob, 5.8, 4.2, o.pauldron);
      if (o.spikes) {
        poly(ctx, [[w.arm - 3, -24 + w.bob], [w.arm - 2, -29 + w.bob], [w.arm, -24.5 + w.bob]], '#d9dde2');
        poly(ctx, [[w.arm + 1, -24.5 + w.bob], [w.arm + 3, -28.5 + w.bob], [w.arm + 3.5, -23.5 + w.bob]], '#d9dde2');
      }
    }
    if (o.runes) {
      ctx.globalAlpha = 0.8;
      stroke(ctx, o.runes, 1, [[-1, -21 + w.bob], [2, -18 + w.bob], [-1, -15 + w.bob]]);
      ctx.globalAlpha = 1;
    }
  }
  const hand = handPosition('side', f);
  if (o.weapon) heldWeapon(ctx, o.weapon, hand.x + 1, hand.y, o.weaponAngle != null ? o.weaponAngle : -1);
  hArms(ctx, 'side', w, o);
  if (o.claws) for (let k = 0; k < 3; k++) stroke(ctx, '#f4ecd8', 0.8, [[hand.x + 1 + k, hand.y + 2], [hand.x + 2 + k, hand.y + 4.2]]);
  const { cx, cy } = hHead(ctx, 'side', w, o);
  if (o.head) o.head(ctx, cx, cy, w);
  ctx.restore();
}

const MONSTER_ART = {
  hund: { h: 26, draw: (ctx, f) => beastArt(ctx, f, { fur: '#8a6748', belly: '#c8a47e', eye: '#7a4a1a' }) },
  wolf: { h: 28, draw: (ctx, f) => { ctx.scale(1.08, 1.08); beastArt(ctx, f, { fur: '#7d8188', belly: '#c4c7cb', ruff: '#a4a8ad', bushy: true, eye: '#d8a03a', fangs: true }); } },
  alphawolf: { h: 35, draw: (ctx, f) => { ctx.scale(1.32, 1.32); beastArt(ctx, f, { fur: '#43484f', belly: '#8d9196', mane: '#25292e', bushy: true, eye: '#ff3a2a', angry: true, glow: true, fangs: true, scar: true }); } },
  wildschwein: { h: 30, draw: (ctx, f) => { ctx.scale(1.15, 1.15); beastArt(ctx, f, { fur: '#5a3f2e', belly: '#7a5a44', snout: '#c09080', bulky: true, ridge: true, tusk: true, tail: false, small: true, eye: '#3a1a0a', angry: true }); } },
  bandit: {
    h: 46, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 0.95, skin: '#d9b896', pants: '#4a3b2a', boots: '#2f2419', torso: '#6d5a3e', sleeve: '#5c4b33', belt: '#2f2419', pouch: '#8a6a44', straps: '#3a2a1c', cape: '#7a2a24', weapon: 'sword',
      head: (ctx, cx, cy) => {
        paintShape(ctx, () => { ctx.beginPath(); ctx.arc(cx, cy - 0.5, 11.4, Math.PI * 0.9, Math.PI * 2.02); ctx.closePath(); }, '#5a3a22', cx - 11.4, cy - 12, 22.8, 12);
        box(ctx, cx - 10.5, cy - 6, 21.5, 3, 1.4, '#9a2f2a');
        poly(ctx, [[cx - 10, cy - 5], [cx - 17, cy - 1], [cx - 15, cy - 6]], '#9a2f2a');
        faceCloth(ctx, cx, cy, '#9a2f2a');
        monsterEye(ctx, cx + 5.6, cy - 0.8, 1.8, '#4a3a22', true);
      }
    })
  },
  banditschuetze: {
    h: 46, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 0.95, skin: '#d9b896', pants: '#3e4a2e', boots: '#2f2419', torso: '#4f6a3e', sleeve: '#435a35', belt: '#2f2419', pouch: '#8a6a44', weapon: 'bow', weaponAngle: 0,
      head: (ctx, cx, cy) => {
        poly(ctx, [[cx - 12, cy + 6], [cx - 12, cy - 4], [cx - 4, cy - 12.5], [cx + 7, cy - 10], [cx + 11.5, cy - 2], [cx + 3, cy - 3], [cx - 2, cy + 6]], '#3e5530');
        faceCloth(ctx, cx, cy, '#9a2f2a');
        monsterEye(ctx, cx + 5.6, cy - 0.8, 1.8, '#3a4a22', true);
        // Köcher auf dem Rücken
        box(ctx, cx - 16, cy + 4, 5, 14, 1.5, '#6b4a2e');
        stroke(ctx, '#e8e0cc', 0.8, [[cx - 15, cy + 4], [cx - 16.5, cy + 0.5]]);
        stroke(ctx, '#e8e0cc', 0.8, [[cx - 13, cy + 4], [cx - 12.5, cy + 0.5]]);
      }
    })
  },
  ork: {
    h: 52, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.12, skin: '#6f8f45', pants: '#3e3226', boots: '#2a2018', torso: '#5a4632', sleeve: '#6f8f45', gloves: '#6f8f45', belt: '#2a2018', pauldron: '#7d848c', spikes: true, straps: '#2a2018', necklace: true, weapon: 'axe',
      head: (ctx, cx, cy) => {
        poly(ctx, [[cx - 3, cy - 6], [cx - 9, cy - 13], [cx - 1, cy - 9]], '#6f8f45');
        box(ctx, cx - 10, cy - 10, 20, 4, 1.8, '#3e3226');
        dot(ctx, cx + 6, cy - 3.2, 4.5, 1.6, darker('#6f8f45', 0.3));
        poly(ctx, [[cx + 6.5, cy + 7], [cx + 8, cy + 1.5], [cx + 9.5, cy + 7]], '#f4ecd8');
        poly(ctx, [[cx + 3.5, cy + 7.5], [cx + 4.5, cy + 3.5], [cx + 5.8, cy + 7.5]], '#f4ecd8');
        monsterEye(ctx, cx + 6, cy - 0.6, 1.8, '#c8302a', true);
        stroke(ctx, '#2a3a1a', 0.8, [[cx - 4, cy + 1], [cx - 1, cy + 4]]);
      }
    })
  },
  orkschamane: {
    h: 50, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.05, skin: '#5d8a73', boots: '#2a2018', robe: '#3e5a4f', sleeve: '#3e5a4f', gloves: '#5d8a73', wideSleeves: true, tattered: true, necklace: true, weapon: 'skullstaff', weaponAngle: -1.35,
      head: (ctx, cx, cy) => {
        poly(ctx, [[cx - 8, cy - 9], [cx - 15, cy - 21], [cx - 9, cy - 19]], '#c9a35a');
        poly(ctx, [[cx - 5, cy - 10], [cx - 9, cy - 25], [cx - 3, cy - 22]], '#b33a2c');
        poly(ctx, [[cx - 2, cy - 10], [cx - 3, cy - 23], [cx + 2, cy - 20]], '#3a6a8a');
        box(ctx, cx - 10, cy - 9.5, 20, 3.4, 1.5, '#4a3a2a');
        for (let k = 0; k < 3; k++) dot(ctx, cx - 6 + k * 5, cy - 7.8, 1, 1, '#f4ecd8');
        poly(ctx, [[cx + 6.5, cy + 7], [cx + 8, cy + 1.5], [cx + 9.5, cy + 7]], '#f4ecd8');
        monsterEye(ctx, cx + 6, cy - 0.6, 1.8, '#5ac8ff', false);
        ctx.globalAlpha = 0.5;
        dot(ctx, cx + 6.3, cy - 0.6, 3.6, 3.6, '#9be2ff');
        ctx.globalAlpha = 1;
        stroke(ctx, '#e8e0cc', 0.9, [[cx - 1, cy + 3], [cx + 3, cy + 5]]);
      }
    })
  },
  oger: {
    h: 66, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.45, belly: true, skin: '#8f897b', pants: '#4a3a2a', boots: '#3a3328', sleeve: '#8f897b', gloves: '#8f897b', weapon: 'club', weaponAngle: -1.3,
      head: (ctx, cx, cy) => {
        poly(ctx, [[cx - 2, cy - 9], [cx + 1, cy - 18], [cx + 3.5, cy - 9]], '#e0d6bc');
        stroke(ctx, '#a89c80', 0.7, [[cx - 0.5, cy - 12], [cx + 2.5, cy - 12.5]]);
        poly(ctx, [[cx + 5.5, cy + 7], [cx + 7.5, cy + 1], [cx + 9, cy + 7]], '#f4ecd8');
        dot(ctx, cx + 5, cy - 3.2, 4.6, 1.5, darker('#8f897b', 0.35));
        monsterEye(ctx, cx + 5.2, cy - 0.4, 1.5, '#d8a03a', true);
        for (const [x, y] of [[-6, -4], [-3, 4]]) stroke(ctx, darker('#8f897b', 0.4), 0.8, [[cx + x, cy + y], [cx + x + 2, cy + y + 2]]);
      }
    })
  },
  daemon: {
    h: 52, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.1, skin: '#a8343f', pants: '#1f1214', boots: '#2a1416', torso: '#8e2f3a', sleeve: '#a8343f', gloves: '#2a1416', wings: '#4a1a20', belt: '#1f1214', tail: true, claws: true, runes: '#ffb04a',
      head: (ctx, cx, cy) => {
        poly(ctx, [[cx - 6, cy - 8], [cx - 13, cy - 16], [cx - 11, cy - 22], [cx - 2, cy - 10]], '#2a1416');
        poly(ctx, [[cx + 2, cy - 9.5], [cx + 1, cy - 19], [cx + 4, cy - 23], [cx + 7, cy - 9]], '#2a1416');
        stroke(ctx, '#4a2a2a', 0.7, [[cx - 9, cy - 13], [cx - 7, cy - 12]]);
        dot(ctx, cx + 5.6, cy - 3, 4.8, 1.4, '#5a141a');
        monsterEye(ctx, cx + 6, cy - 0.6, 1.8, '#ffd34d', true);
        ctx.globalAlpha = 0.55;
        dot(ctx, cx + 6.3, cy - 0.6, 4, 4, '#ff9a4a');
        ctx.globalAlpha = 1;
        poly(ctx, [[cx + 4, cy + 5], [cx + 10.5, cy + 4.5], [cx + 7.5, cy + 7.5]], '#2a1416');
        poly(ctx, [[cx + 6, cy + 5], [cx + 6.8, cy + 6.8], [cx + 7.4, cy + 5]], '#ffffff');
      }
    })
  }
};

// Spinne von der Seite: großer Hinterleib, acht Beine, Augenreihe
function spiderArt(ctx, f, o) {
  const sw = [0, 1.8, 0, -1.8][f];
  const legC = darker(o.body, 0.25);
  for (let k = 0; k < 4; k++) {
    const x = -4 + k * 4.5;
    const ph = (k % 2 ? sw : -sw);
    stroke(ctx, legC, 1.8, [[x, -10], [x - 4 + ph, -17], [x - 7 + ph, 0]]);
    stroke(ctx, o.body, 2, [[x + 1, -10], [x + 5 - ph, -18], [x + 8 - ph, 0]]);
  }
  oval(ctx, -9, -13, 10.5, 8.5, o.body);
  for (let k = 0; k < 3; k++) dot(ctx, -11 + k * 3.5, -16 + (k % 2) * 3, 1.8, 1.2, o.mark);
  oval(ctx, 5, -11, 7, 5.6, lighter(o.body, 0.08));
  poly(ctx, [[10, -9], [13, -4], [11, -8.5]], '#2a2018');
  poly(ctx, [[9, -8], [11.5, -3.5], [9.5, -7.5]], '#2a2018');
  for (const [x, y, r] of [[7.5, -14, 1.3], [10, -13, 1.5], [9, -11, 1], [11.5, -11, 1]]) dot(ctx, x, y, r, r, o.eye);
  ctx.globalAlpha = 0.4;
  dot(ctx, 9.5, -12.5, 4, 3, o.eye);
  ctx.globalAlpha = 1;
}

// Skorpion: Scheren vorn, Stachelschwanz über dem Rücken
function scorpionArt(ctx, f, o) {
  const sw = [0, 1.6, 0, -1.6][f];
  for (let k = 0; k < 3; k++) {
    const x = -6 + k * 5;
    stroke(ctx, darker(o.body, 0.3), 1.6, [[x, -8], [x - 3 + (k % 2 ? sw : -sw), -1]]);
    stroke(ctx, o.body, 1.8, [[x + 1, -8], [x + 4 - (k % 2 ? sw : -sw), 0]]);
  }
  // Schwanz aus Gliedern
  const seg = [[-11, -11], [-16, -16], [-17, -23], [-13, -29], [-6, -31]];
  seg.forEach(([x, y], i) => oval(ctx, x, y + (i > 2 ? sw * 0.4 : 0), 4 - i * 0.4, 3.6 - i * 0.4, i % 2 ? darker(o.body, 0.12) : o.body));
  poly(ctx, [[-4, -33 + sw * 0.4], [2, -30 + sw * 0.4], [-4, -28 + sw * 0.4]], o.sting);
  ctx.globalAlpha = 0.5;
  dot(ctx, -2, -30.5 + sw * 0.4, 4, 4, o.sting);
  ctx.globalAlpha = 1;
  oval(ctx, -2, -9, 11, 5.5, o.body);
  for (const x of [-8, -3, 2]) stroke(ctx, darker(o.body, 0.35), 0.8, [[x, -14], [x + 1, -4.5]]);
  oval(ctx, 9, -9, 5, 4.4, lighter(o.body, 0.08));
  // Scheren
  stroke(ctx, o.body, 2.2, [[10, -8], [15, -5 - sw * 0.5]]);
  poly(ctx, [[14, -8 - sw * 0.5], [21, -9 - sw * 0.5], [22, -5 - sw * 0.5], [18, -5.5 - sw * 0.5], [21, -2 - sw * 0.5], [15, -2 - sw * 0.5]], darker(o.body, 0.1));
  monsterEye(ctx, 11, -11.5, 1.2, '#2a1a0a', true);
}

// Geist: schwebt, unten ausgefranst, durchscheinend
function ghostArt(ctx, f, o) {
  const sw = [0, 1, 0, -1][f];
  ctx.globalAlpha = 0.88;
  paintShape(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-11, -28);
    ctx.quadraticCurveTo(-12, -44, 0, -46);
    ctx.quadraticCurveTo(13, -44, 12, -28);
    ctx.lineTo(13, -8);
    for (let k = 0; k < 5; k++) ctx.lineTo(13 - (k + 0.5) * 5.2, -2 - ((k + f) % 2) * 4);
    ctx.lineTo(-13, -8);
    ctx.closePath();
  }, o.body, -13, -46, 26, 44);
  ctx.globalAlpha = 1;
  // Arme
  poly(ctx, [[8, -26], [17, -20 + sw], [15, -17 + sw], [7, -21]], o.body);
  poly(ctx, [[-8, -26], [-15, -18 - sw], [-12, -16 - sw], [-7, -21]], darker(o.body, 0.1));
  // Eiszapfen-Krone
  for (const [x, h] of [[-6, 6], [0, 9], [6, 6]]) poly(ctx, [[x - 2.5, -42], [x, -42 - h], [x + 2.5, -42]], o.crown);
  dot(ctx, 3, -34, 2.2, 3, '#0d1a2a');
  dot(ctx, 9, -34, 2, 2.8, '#0d1a2a');
  ctx.globalAlpha = 0.6;
  dot(ctx, 3, -34, 3.4, 3.8, o.eye);
  dot(ctx, 9, -34, 3, 3.4, o.eye);
  ctx.globalAlpha = 1;
  dot(ctx, 6, -27, 3, 1.4, '#0d1a2a');
}

// Flügel hinter einem Vierbeiner (Feuerdrache)
function dragonWings(ctx, f, color) {
  const flap = [0, -3, 0, 3][f];
  poly(ctx, [[-2, -18], [-10, -40 + flap], [-20, -44 + flap], [-16, -34 + flap], [-26, -32 + flap], [-18, -26], [-24, -20 + flap * 0.5], [-8, -14]], color);
  stroke(ctx, darker(color, 0.5), 1.1, [[-2, -18], [-10, -40 + flap], [-16, -34 + flap]]);
  stroke(ctx, darker(color, 0.5), 1, [[-10, -40 + flap], [-18, -26]]);
}

Object.assign(MONSTER_ART, {
  waldspinne: { h: 26, draw: (ctx, f) => { ctx.scale(1.15, 1.15); spiderArt(ctx, f, { body: '#3a3328', mark: '#b8402a', eye: '#ff4a3a' }); } },
  braunbaer: { h: 42, draw: (ctx, f) => { ctx.scale(1.55, 1.55); beastArt(ctx, f, { fur: '#6a4a30', belly: '#9a7a58', snout: '#b89a78', bulky: true, tail: false, eye: '#3a2010', angry: true, fangs: true }); } },
  skorpion: { h: 32, draw: (ctx, f) => { ctx.scale(1.2, 1.2); scorpionArt(ctx, f, { body: '#b07a3a', sting: '#9be07a' }); } },
  orkhauptmann: {
    h: 60, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.28, skin: '#5a7a38', pants: '#2e261c', boots: '#1e1810', torso: '#3e3a40', sleeve: '#5a7a38', gloves: '#3e3a40', belt: '#c9a35a', pauldron: '#c9a35a', spikes: true, cape: '#8a1a14', necklace: true, weapon: 'axe',
      head: (ctx, cx, cy) => {
        paintShape(ctx, () => { ctx.beginPath(); ctx.arc(cx, cy - 1, 11.6, Math.PI, 0); ctx.closePath(); }, '#6e7680', cx - 11.6, cy - 12.6, 23.2, 11.6);
        poly(ctx, [[cx - 8, cy - 9], [cx - 15, cy - 20], [cx - 6, cy - 12]], '#e0d6bc');
        poly(ctx, [[cx + 4, cy - 11], [cx + 6, cy - 23], [cx + 9, cy - 10]], '#e0d6bc');
        poly(ctx, [[cx + 6.5, cy + 7], [cx + 8, cy + 1.5], [cx + 9.5, cy + 7]], '#f4ecd8');
        monsterEye(ctx, cx + 6, cy - 0.6, 1.8, '#ffb04a', true);
        stroke(ctx, '#e0c0b0', 0.9, [[cx + 2, cy - 4], [cx + 5, cy + 3]]);
      }
    })
  },
  hoellenhund: { h: 36, draw: (ctx, f) => { ctx.scale(1.3, 1.3); beastArt(ctx, f, { fur: '#2e2222', belly: '#4a3030', mane: '#d8402a', bushy: true, eye: '#ffb04a', angry: true, glow: true, fangs: true, ridge: true }); } },
  eiswolf: { h: 32, draw: (ctx, f) => { ctx.scale(1.2, 1.2); beastArt(ctx, f, { fur: '#c8d8e8', belly: '#f4f8fc', ruff: '#ffffff', bushy: true, eye: '#3ab0ff', glow: true, angry: true, fangs: true }); } },
  yeti: {
    h: 68, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.5, belly: true, skin: '#e8eef4', pants: '#c8d4e0', boots: '#a8b8c8', sleeve: '#e8eef4', gloves: '#9aa8b8', claws: true,
      head: (ctx, cx, cy) => {
        oval(ctx, cx + 4, cy + 1, 6.5, 5.5, '#8aa8c8');
        poly(ctx, [[cx - 4, cy - 9], [cx - 8, cy - 16], [cx - 1, cy - 10]], '#f4f8fc');
        monsterEye(ctx, cx + 5.5, cy - 0.5, 1.5, '#3a6ab8', true);
        poly(ctx, [[cx + 5, cy + 5], [cx + 6, cy + 2.5], [cx + 7, cy + 5]], '#ffffff');
        poly(ctx, [[cx + 8, cy + 5], [cx + 9, cy + 2.5], [cx + 10, cy + 5]], '#ffffff');
      }
    })
  },
  frostgeist: { h: 46, draw: (ctx, f) => ghostArt(ctx, f, { body: '#cfeeff', crown: '#ffffff', eye: '#3ab0ff' }) },
  untoter: {
    h: 46, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1, skin: '#cfc8b0', pants: '#3a3428', boots: '#2a241c', torso: '#5a5448', sleeve: '#cfc8b0', gloves: '#cfc8b0', belt: '#3a2a1c', pauldron: '#6e6a60', straps: '#3a2a1c', weapon: 'sword',
      head: (ctx, cx, cy) => {
        dot(ctx, cx + 5.5, cy - 0.5, 2.6, 2.8, '#1a1210');
        dot(ctx, cx + 5.5, cy - 0.5, 1, 1, '#a7e37f');
        ctx.globalAlpha = 0.5;
        dot(ctx, cx + 5.5, cy - 0.5, 3.6, 3.6, '#a7e37f');
        ctx.globalAlpha = 1;
        box(ctx, cx + 2, cy + 4, 8, 3.4, 1, '#ddd5bb');
        for (let k = 0; k < 4; k++) stroke(ctx, '#1a1210', 0.5, [[cx + 3 + k * 2, cy + 4], [cx + 3 + k * 2, cy + 7.4]]);
        paintShape(ctx, () => { ctx.beginPath(); ctx.arc(cx, cy - 1, 11.4, Math.PI * 0.95, Math.PI * 2.05); ctx.closePath(); }, '#6e6a60', cx - 11.4, cy - 12.4, 22.8, 11.4);
      }
    })
  },
  sumpfhexe: {
    h: 50, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.02, skin: '#8aa070', boots: '#2a2018', robe: '#3a4a2e', sleeve: '#3a4a2e', gloves: '#8aa070', wideSleeves: true, tattered: true, necklace: true, weapon: 'skullstaff', weaponAngle: -1.35,
      head: (ctx, cx, cy) => {
        poly(ctx, [[cx - 15, cy - 4], [cx + 15, cy - 5], [cx + 6, cy - 9], [cx - 2, cy - 27], [cx - 6, cy - 9]], '#2a2a22');
        box(ctx, cx - 6, cy - 11, 13, 3, 1, '#7a2a6a');
        poly(ctx, [[cx + 9, cy + 1], [cx + 14, cy + 3], [cx + 9, cy + 4]], '#7a9060');
        monsterEye(ctx, cx + 5.6, cy - 0.5, 1.7, '#c6f08a', true);
        box(ctx, cx - 12, cy - 3, 4, 12, 1.5, '#4a4a3a');
      }
    })
  },
  ghul: {
    h: 58, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.35, belly: true, skin: '#6a7a5a', pants: '#3a3428', boots: '#2a241c', sleeve: '#6a7a5a', gloves: '#6a7a5a', claws: true,
      head: (ctx, cx, cy) => {
        dot(ctx, cx + 5, cy - 2.6, 4.6, 1.4, darker('#6a7a5a', 0.4));
        monsterEye(ctx, cx + 5.4, cy - 0.4, 1.6, '#e8e04a', true);
        box(ctx, cx + 2, cy + 4, 9, 3.5, 1.5, '#3a1a14');
        for (let k = 0; k < 4; k++) poly(ctx, [[cx + 3 + k * 2, cy + 4], [cx + 4 + k * 2, cy + 6.5], [cx + 5 + k * 2, cy + 4]], '#ece4cc');
        for (const x of [-6, -2]) stroke(ctx, '#3a4a2a', 0.8, [[cx + x, cy - 8], [cx + x + 1, cy - 4]]);
      }
    })
  },
  lavagolem: {
    h: 72, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.6, belly: true, skin: '#3a2a26', pants: '#2a1e1a', boots: '#1e1614', sleeve: '#3a2a26', gloves: '#4a3430', cracks: '#ff8a2a',
      head: (ctx, cx, cy) => {
        stroke(ctx, '#ff8a2a', 1.3, [[cx - 6, cy - 8], [cx - 2, cy - 3], [cx - 5, cy + 2]]);
        dot(ctx, cx + 5.5, cy - 0.5, 2.2, 1.6, '#ffd34d');
        ctx.globalAlpha = 0.55;
        dot(ctx, cx + 5.5, cy - 0.5, 4.4, 4, '#ff7a2a');
        ctx.globalAlpha = 1;
        box(ctx, cx + 3, cy + 4, 7, 2.6, 1, '#ff7a2a');
      }
    })
  },
  feuerdaemon: {
    h: 56, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.18, skin: '#c8402f', pants: '#2a1010', boots: '#1a0a0a', torso: '#a82a1a', sleeve: '#c8402f', gloves: '#1a0a0a', wings: '#6a1a10', belt: '#ffd34d', tail: true, claws: true, runes: '#ffd34d',
      head: (ctx, cx, cy) => {
        for (const [x, h] of [[-8, 10], [-3, 15], [2, 12], [7, 9]]) poly(ctx, [[cx + x - 3, cy - 8], [cx + x, cy - 8 - h], [cx + x + 3, cy - 8]], x % 2 ? '#ffb04a' : '#ff6a1a');
        poly(ctx, [[cx - 4, cy - 8], [cx - 11, cy - 16], [cx - 1, cy - 10]], '#1a0a0a');
        monsterEye(ctx, cx + 6, cy - 0.6, 1.8, '#ffd34d', true);
        ctx.globalAlpha = 0.6;
        dot(ctx, cx + 6.3, cy - 0.6, 4.2, 4.2, '#ffb04a');
        ctx.globalAlpha = 1;
        poly(ctx, [[cx + 4, cy + 5], [cx + 10.5, cy + 4.5], [cx + 7.5, cy + 7.5]], '#1a0a0a');
      }
    })
  },
  feuerdrache: {
    h: 58, draw: (ctx, f) => {
      ctx.scale(1.55, 1.55);
      dragonWings(ctx, f, '#7a1a10');
      beastArt(ctx, f, { fur: '#a82a1a', belly: '#e8a050', snout: '#c84a2a', ridge: true, eye: '#ffd34d', angry: true, glow: true, fangs: true, tusk: true });
    }
  },

  // Map 2: Schlangen und Nagas
  sandviper: { h: 34, draw: (ctx, f) => serpentArt(ctx, f, { body: '#c8a060', belly: '#f0dca8', mark: '#8a6a3a', eye: '#ffd34d' }) },
  klapperschlange: { h: 36, draw: (ctx, f) => serpentArt(ctx, f, { scale: 1.1, body: '#a07a4a', belly: '#e8d0a0', mark: '#4a3018', eye: '#ffb04a', rattle: true }) },
  kobra: { h: 44, draw: (ctx, f) => serpentArt(ctx, f, { scale: 1.2, body: '#3a4a2a', belly: '#c8b060', mark: '#1e2814', eye: '#ff3a2a', hood: '#c8b060' }) },
  riesenpython: { h: 56, draw: (ctx, f) => serpentArt(ctx, f, { scale: 1.65, body: '#4a6a3a', belly: '#c8c890', mark: '#22341a', eye: '#ffd34d' }) },
  naga: { h: 58, draw: (ctx, f) => nagaArt(ctx, f, { scale: 1.15, body: '#2a7a6a', belly: '#a8e0c8', mark: '#154a40', skin: '#5aa890', armor: '#c9a35a', trim: '#7a5a2a', hair: '#1a3a4a', eye: '#ffd34d' }) },
  nagapriesterin: { h: 58, draw: (ctx, f) => nagaArt(ctx, f, { scale: 1.12, body: '#6a3a8a', belly: '#d8b8f0', mark: '#3a1a5a', skin: '#b890c8', armor: '#3a2a5a', trim: '#e8c84a', hair: '#e8e0f0', eye: '#c89aff', staff: '#c89aff' }) },

  // Map 3: Donnerklamm
  trollkrieger: {
    h: 64, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.45, belly: true, skin: '#5a8a6a', pants: '#4a3a2a', boots: '#2a2018', sleeve: '#5a8a6a', gloves: '#4a7a5a', claws: true,
      head: (ctx, cx, cy) => {
        poly(ctx, [[cx - 6, cy - 9], [cx - 2, cy - 17], [cx + 2, cy - 9]], '#c8302a');
        oval(ctx, cx + 8, cy + 1, 3.6, 3, '#4a7a5a');
        poly(ctx, [[cx + 5, cy + 6], [cx + 6.5, cy - 1], [cx + 8, cy + 6]], '#f4ecd8');
        monsterEye(ctx, cx + 5, cy - 2, 1.6, '#ffd34d', true);
      }
    })
  },
  harpyie: {
    h: 50, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.05, skin: '#d8b8a8', pants: '#5a3a6a', boots: '#3a2a3a', torso: '#6a4a7a', sleeve: '#8a6a9a', gloves: '#3a2a3a', wings: '#8a6a9a', claws: true,
      head: (ctx, cx, cy) => {
        for (const [dx, h] of [[-6, 14], [-2, 17], [2, 13]]) poly(ctx, [[cx + dx - 2, cy - 8], [cx + dx, cy - 8 - h], [cx + dx + 2, cy - 8]], '#c89ad8');
        monsterEye(ctx, cx + 6, cy - 0.6, 1.7, '#ff4aff', true);
        poly(ctx, [[cx + 9, cy + 1], [cx + 13, cy + 2.5], [cx + 9, cy + 4]], '#e8c84a');
      }
    })
  },
  minotaurus: {
    h: 72, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.6, belly: true, skin: '#7a4a2a', pants: '#3a2a1a', boots: '#1e1610', sleeve: '#7a4a2a', gloves: '#5a3418', claws: false,
      head: (ctx, cx, cy) => {
        poly(ctx, [[cx - 4, cy - 8], [cx - 14, cy - 12], [cx - 16, cy - 20], [cx - 10, cy - 13], [cx - 1, cy - 10]], '#e8dcc0');
        poly(ctx, [[cx + 3, cy - 9], [cx + 10, cy - 15], [cx + 9, cy - 22], [cx + 13, cy - 14], [cx + 6, cy - 7]], '#e8dcc0');
        oval(ctx, cx + 8, cy + 3, 5, 3.8, '#9a6a4a');
        stroke(ctx, '#e8c84a', 1.2, [[cx + 11, cy + 4], [cx + 11, cy + 7]]);
        monsterEye(ctx, cx + 5, cy - 2, 1.7, '#ff3a2a', true);
      }
    })
  },
  steintitan: {
    h: 82, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.85, belly: true, skin: '#8a8478', pants: '#5a544a', boots: '#3a3630', sleeve: '#8a8478', gloves: '#6a6458', cracks: '#ffb04a',
      head: (ctx, cx, cy) => {
        poly(ctx, [[cx - 9, cy - 8], [cx - 4, cy - 12], [cx + 4, cy - 12], [cx + 9, cy - 7]], '#6a6458');
        monsterEye(ctx, cx + 5, cy - 1, 2, '#ffb04a', true);
        ctx.globalAlpha = 0.6;
        dot(ctx, cx + 5, cy - 1, 4, 4, '#ff8a2a');
        ctx.globalAlpha = 1;
      }
    })
  },
  gargoyle: {
    h: 56, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.12, skin: '#6a6a72', pants: '#3a3a40', boots: '#2a2a30', torso: '#5a5a62', sleeve: '#6a6a72', gloves: '#3a3a40', wings: '#4a4a52', tail: true, claws: true, runes: '#9fd0ff',
      head: (ctx, cx, cy) => {
        poly(ctx, [[cx - 6, cy - 8], [cx - 11, cy - 19], [cx - 2, cy - 10]], '#3a3a40');
        poly(ctx, [[cx + 2, cy - 9.5], [cx + 4, cy - 20], [cx + 7, cy - 9]], '#3a3a40');
        monsterEye(ctx, cx + 6, cy - 0.6, 1.8, '#9fd0ff', true);
        poly(ctx, [[cx + 6, cy + 5], [cx + 6.8, cy + 7], [cx + 7.4, cy + 5]], '#ffffff');
      }
    })
  },
  donnerriese: {
    h: 86, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.95, belly: true, skin: '#7a8aa8', pants: '#3a4a6a', boots: '#2a3248', sleeve: '#7a8aa8', gloves: '#5a6a88', cracks: '#bfe8ff',
      head: (ctx, cx, cy) => {
        poly(ctx, [[cx - 2, cy + 2], [cx + 10, cy + 2], [cx + 6, cy + 13], [cx + 1, cy + 10]], '#f4f8fc');
        poly(ctx, [[cx - 9, cy - 8], [cx - 2, cy - 15], [cx + 6, cy - 14], [cx + 10, cy - 7]], '#e8eef8');
        monsterEye(ctx, cx + 5.5, cy - 1.5, 1.7, '#9fd0ff', true);
      }
    })
  },

  // Dungeon-Monster und Bosse
  hoehlenspinne: { h: 30, draw: (ctx, f) => { ctx.scale(1.3, 1.3); spiderArt(ctx, f, { body: '#4a3a5a', mark: '#b48cff', eye: '#ff4aff' }); } },
  giftspinne: { h: 29, draw: (ctx, f) => { ctx.scale(1.25, 1.25); spiderArt(ctx, f, { body: '#2e4a24', mark: '#c6f08a', eye: '#d8ff6a' }); } },
  spinnenkoenigin: { h: 62, draw: (ctx, f) => { ctx.scale(2.7, 2.7); spiderArt(ctx, f, { body: '#3a2450', mark: '#ffd34d', eye: '#ff3aff' }); } },
  orkelite: {
    h: 56, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.2, skin: '#5a7a38', pants: '#2e261c', boots: '#1e1810', torso: '#6e7680', sleeve: '#5a7a38', gloves: '#6e7680', belt: '#2a2018', pauldron: '#9aa1a8', spikes: true, cape: '#2a3a6a', weapon: 'sword',
      head: (ctx, cx, cy) => {
        paintShape(ctx, () => { ctx.beginPath(); ctx.arc(cx, cy - 1, 11.6, Math.PI, 0); ctx.closePath(); }, '#9aa1a8', cx - 11.6, cy - 12.6, 23.2, 11.6);
        box(ctx, cx - 1.5, cy - 16, 3, 7, 1, '#2a3a6a');
        poly(ctx, [[cx + 6.5, cy + 7], [cx + 8, cy + 1.5], [cx + 9.5, cy + 7]], '#f4ecd8');
        monsterEye(ctx, cx + 6, cy - 0.6, 1.8, '#ffd34d', true);
      }
    })
  },
  orkberserker: {
    h: 56, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.2, skin: '#7a8a40', pants: '#4a2a1a', boots: '#2a1810', torso: '#7a8a40', sleeve: '#7a8a40', gloves: '#7a8a40', belt: '#8a2a1a', straps: '#5a2a1a', necklace: true, weapon: 'axe',
      head: (ctx, cx, cy) => {
        poly(ctx, [[cx - 6, cy - 9], [cx - 2, cy - 18], [cx + 2, cy - 9]], '#c8302a');
        poly(ctx, [[cx + 6.5, cy + 7], [cx + 8, cy + 1.5], [cx + 9.5, cy + 7]], '#f4ecd8');
        stroke(ctx, '#c8302a', 1.2, [[cx + 1, cy - 4], [cx + 8, cy - 2]]);
        monsterEye(ctx, cx + 6, cy - 0.6, 2, '#ff3a2a', true);
      }
    })
  },
  kriegsherr: {
    h: 84, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.8, skin: '#4a6a30', pants: '#2a2018', boots: '#1a140e', torso: '#2a2a30', sleeve: '#4a6a30', gloves: '#c9a35a', belt: '#c9a35a', pauldron: '#ffd34d', spikes: true, cape: '#a81a14', necklace: true, weapon: 'axe',
      head: (ctx, cx, cy) => {
        paintShape(ctx, () => { ctx.beginPath(); ctx.arc(cx, cy - 1, 11.8, Math.PI, 0); ctx.closePath(); }, '#c9a35a', cx - 11.8, cy - 12.8, 23.6, 11.8);
        poly(ctx, [[cx - 9, cy - 9], [cx - 17, cy - 23], [cx - 6, cy - 12]], '#f4ecd8');
        poly(ctx, [[cx + 4, cy - 11], [cx + 7, cy - 26], [cx + 10, cy - 10]], '#f4ecd8');
        poly(ctx, [[cx - 3, cy - 12], [cx, cy - 19], [cx + 3, cy - 12]], '#ff6a3a');
        poly(ctx, [[cx + 6.5, cy + 7], [cx + 8, cy + 1], [cx + 9.5, cy + 7]], '#f4ecd8');
        monsterEye(ctx, cx + 6, cy - 0.6, 2, '#ff6a2a', true);
        stroke(ctx, '#e0c0b0', 1, [[cx + 1, cy - 5], [cx + 5, cy + 3]]);
      }
    })
  },
  eisgolem: {
    h: 68, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.5, belly: true, skin: '#a8cce6', pants: '#7aa4c8', boots: '#5a84a8', sleeve: '#a8cce6', gloves: '#d4eaf8', claws: true,
      head: (ctx, cx, cy) => {
        poly(ctx, [[cx - 8, cy - 8], [cx - 5, cy - 18], [cx - 1, cy - 9]], '#e8f6ff');
        poly(ctx, [[cx + 1, cy - 10], [cx + 5, cy - 20], [cx + 8, cy - 8]], '#e8f6ff');
        monsterEye(ctx, cx + 5.5, cy - 0.5, 1.8, '#3ab0ff', true);
      }
    })
  },
  eiskoenig: { h: 100, draw: (ctx, f) => { ctx.scale(2.2, 2.2); ghostArt(ctx, f, { body: '#9fd8ff', crown: '#ffd34d', eye: '#1a6aff' }); } },
  drachenbrut: {
    h: 40, draw: (ctx, f) => {
      ctx.scale(1.2, 1.2);
      dragonWings(ctx, f, '#a8401a');
      beastArt(ctx, f, { fur: '#c8501a', belly: '#f0b060', snout: '#d86a2a', ridge: true, eye: '#ffd34d', angry: true, fangs: true });
    }
  },
  urdrache: {
    h: 96, draw: (ctx, f) => {
      ctx.scale(2.6, 2.6);
      dragonWings(ctx, f, '#3a1a3a');
      beastArt(ctx, f, { fur: '#2a1a2a', belly: '#c8902a', snout: '#4a2a3a', ridge: true, eye: '#ff6a2a', angry: true, glow: true, fangs: true, tusk: true, scar: true });
    }
  },

  // Version 3.3: Banditenkeller
  kellerwache: {
    h: 48, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.02, skin: '#d9b896', pants: '#3a2e20', boots: '#2a2018', torso: '#5a4a32', sleeve: '#4a3c28', gloves: '#3a2e20', belt: '#2a2018', pauldron: '#8a8e96', straps: '#3a2a1c', weapon: 'axe',
      head: (ctx, cx, cy) => {
        paintShape(ctx, () => { ctx.beginPath(); ctx.arc(cx, cy - 1, 11.6, Math.PI, 0); ctx.closePath(); }, '#7a7e86', cx - 11.6, cy - 12.6, 23.2, 11.6);
        box(ctx, cx - 12, cy - 3, 24, 3, 1.2, '#5a5e66');
        faceCloth(ctx, cx, cy, '#9a2f2a');
        monsterEye(ctx, cx + 5.6, cy - 0.6, 1.8, '#4a3a22', true);
      }
    })
  },
  armbrustschuetze: {
    h: 46, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 0.96, skin: '#d9b896', pants: '#3e4a2e', boots: '#2f2419', torso: '#4a5a3a', sleeve: '#3e4e30', belt: '#2f2419', pouch: '#8a6a44', weapon: 'bow', weaponAngle: 0,
      head: (ctx, cx, cy) => {
        paintShape(ctx, () => { ctx.beginPath(); ctx.arc(cx, cy - 0.5, 11.4, Math.PI * 0.95, Math.PI * 2.05); ctx.closePath(); }, '#3a2a1c', cx - 11.4, cy - 12, 22.8, 12);
        poly(ctx, [[cx - 14, cy - 6], [cx + 14, cy - 6], [cx + 4, cy - 11], [cx - 6, cy - 11]], '#5a3a22');
        faceCloth(ctx, cx, cy, '#9a2f2a');
        monsterEye(ctx, cx + 5.6, cy - 0.8, 1.8, '#3a4a22', true);
      }
    })
  },
  banditenfuerst: {
    h: 80, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.75, skin: '#d9b896', pants: '#2a1e16', boots: '#1a120c', torso: '#3a2a22', sleeve: '#5a2a24', gloves: '#2a1e16', belt: '#c9a35a', pouch: '#8a6a44', straps: '#1a120c', pauldron: '#c9a35a', spikes: true, cape: '#9a2f2a', necklace: true, weapon: 'sword',
      head: (ctx, cx, cy) => {
        paintShape(ctx, () => { ctx.beginPath(); ctx.arc(cx, cy - 0.5, 11.4, Math.PI * 0.9, Math.PI * 2.02); ctx.closePath(); }, '#2a1a12', cx - 11.4, cy - 12, 22.8, 12);
        poly(ctx, [[cx - 15, cy - 6], [cx + 15, cy - 6], [cx + 6, cy - 12], [cx - 2, cy - 22], [cx - 7, cy - 12]], '#3a2a22');
        box(ctx, cx - 6, cy - 12, 12, 2.6, 1, '#c9a35a');
        poly(ctx, [[cx - 2, cy - 14], [cx + 4, cy - 26], [cx + 3, cy - 14]], '#e8402a');
        stroke(ctx, '#7a3a2a', 1.4, [[cx + 2, cy - 4], [cx + 6, cy + 4]]);
        monsterEye(ctx, cx + 5.6, cy - 0.6, 2, '#ffb04a', true);
        box(ctx, cx + 1, cy + 5, 9, 3, 1, '#3a2a1c');
      }
    })
  },
  // Totengruft
  grabwaechter: {
    h: 50, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.08, skin: '#ddd5bb', pants: '#2a2630', boots: '#1a1820', torso: '#3a3644', sleeve: '#ddd5bb', gloves: '#ddd5bb', belt: '#2a2018', pauldron: '#6a6474', spikes: true, runes: '#a774e0', weapon: 'sword',
      head: (ctx, cx, cy) => {
        dot(ctx, cx + 5.5, cy - 0.5, 2.6, 2.8, '#1a1210');
        dot(ctx, cx + 5.5, cy - 0.5, 1, 1, '#c89aff');
        ctx.globalAlpha = 0.5;
        dot(ctx, cx + 5.5, cy - 0.5, 3.8, 3.8, '#a774e0');
        ctx.globalAlpha = 1;
        box(ctx, cx + 2, cy + 4, 8, 3.4, 1, '#ddd5bb');
        for (let k = 0; k < 4; k++) stroke(ctx, '#1a1210', 0.5, [[cx + 3 + k * 2, cy + 4], [cx + 3 + k * 2, cy + 7.4]]);
        paintShape(ctx, () => { ctx.beginPath(); ctx.arc(cx, cy - 1, 11.6, Math.PI * 0.95, Math.PI * 2.05); ctx.closePath(); }, '#4a4458', cx - 11.6, cy - 12.6, 23.2, 11.6);
        poly(ctx, [[cx - 2, cy - 12], [cx, cy - 20], [cx + 2, cy - 12]], '#a774e0');
      }
    })
  },
  seelenfresser: { h: 50, draw: (ctx, f) => { ctx.scale(1.1, 1.1); ghostArt(ctx, f, { body: '#8a6ac8', crown: '#2a1a3a', eye: '#ff3aff' }); } },
  gruftkoenig: {
    h: 88, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.9, skin: '#ddd5bb', pants: '#1e1a24', boots: '#14101a', torso: '#2a2434', sleeve: '#3a3048', gloves: '#ddd5bb', belt: '#c9a35a', pauldron: '#4a3a5a', spikes: true, cape: '#3a1a4a', runes: '#c89aff', necklace: true, weapon: 'skullstaff', weaponAngle: -1.3,
      head: (ctx, cx, cy) => {
        dot(ctx, cx + 5.5, cy - 0.5, 2.8, 3, '#1a1210');
        ctx.globalAlpha = 0.55;
        dot(ctx, cx + 5.5, cy - 0.5, 4.4, 4.4, '#c89aff');
        ctx.globalAlpha = 1;
        dot(ctx, cx + 5.5, cy - 0.5, 1.2, 1.2, '#ffffff');
        box(ctx, cx + 2, cy + 4, 8, 3.4, 1, '#ddd5bb');
        for (let k = 0; k < 4; k++) stroke(ctx, '#1a1210', 0.5, [[cx + 3 + k * 2, cy + 4], [cx + 3 + k * 2, cy + 7.4]]);
        box(ctx, cx - 10, cy - 11, 20, 4, 1, '#c9a35a');
        for (const x of [-8, -3, 2, 7]) poly(ctx, [[cx + x - 2, cy - 11], [cx + x, cy - 19], [cx + x + 2, cy - 11]], '#c9a35a');
        oval(ctx, cx - 0.5, cy - 9, 1.4, 1.4, '#a774e0');
      }
    })
  },
  // Schlangentempel und Titanenschmiede
  nagakoenigin: { h: 104, draw: (ctx, f) => nagaArt(ctx, f, { scale: 1.95, body: '#1e5a4e', belly: '#e8d8a0', mark: '#c9a35a', skin: '#4a9a84', armor: '#ffd34d', trim: '#7a5a10', hair: '#0e2a30', eye: '#ff4a6a', staff: '#7ad8c8' }) },
  titanenkoenig: {
    h: 118, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 2.5, belly: true, skin: '#6a6458', pants: '#3a3630', boots: '#24201c', sleeve: '#6a6458', gloves: '#4a4640', cracks: '#ffb04a', pauldron: '#3a3430', spikes: true, runes: '#ffb04a',
      head: (ctx, cx, cy) => {
        poly(ctx, [[cx - 9, cy - 8], [cx - 4, cy - 12], [cx + 4, cy - 12], [cx + 9, cy - 7]], '#4a4640');
        for (const x of [-7, -2, 3, 8]) poly(ctx, [[cx + x - 2, cy - 11], [cx + x, cy - 20], [cx + x + 2, cy - 11]], '#ffb04a');
        monsterEye(ctx, cx + 5, cy - 1, 2.2, '#ffd34d', true);
        ctx.globalAlpha = 0.6;
        dot(ctx, cx + 5, cy - 1, 4.5, 4.5, '#ff8a2a');
        ctx.globalAlpha = 1;
      }
    })
  }
});

// Schlange von der Seite (Kopf rechts): Körper als Kette von Ringen, die sich schlängeln,
// der Hals richtet sich auf. o: body, belly, mark (Muster), eye, hood (Kobra), rattle, noHead
function serpentArt(ctx, f, o) {
  ctx.save();
  if (o.scale) ctx.scale(o.scale, o.scale);
  const belly = o.belly || lighter(o.body, 0.35);
  const mark = o.mark || darker(o.body, 0.35);
  const ph = f * 1.4;
  const pts = [];
  for (let k = 0; k <= 14; k++) {
    const t = k / 14;
    pts.push([-21 + t * 26, -4 - Math.sin(t * 6.5 + ph) * 3 * (1 - t * 0.5), 1.6 + t * 4.4]);
  }
  if (o.rattle) for (let k = 0; k < 3; k++) oval(ctx, -23 - k * 2.6, pts[0][1] - 1 - k, 1.9, 1.5, k % 2 ? '#c8b080' : '#e8d8a8');
  for (const [x, y, r] of pts) oval(ctx, x, y, r, r * 0.85, o.body);
  for (const [x, y, r] of pts) dot(ctx, x, y + r * 0.4, r * 0.75, r * 0.32, belly);
  pts.forEach(([x, y, r], k) => { if (k % 2 === 0 && k > 1) dot(ctx, x, y - r * 0.35, r * 0.45, r * 0.3, mark); });
  if (!o.noHead) {
    const sway = [0, 1, 0, -1][f];
    ctx.lineCap = 'round';
    ctx.strokeStyle = o.body;
    ctx.lineWidth = 8.5;
    ctx.beginPath();
    ctx.moveTo(4, -6);
    ctx.quadraticCurveTo(17, -12, 13 + sway, -24);
    ctx.stroke();
    ctx.strokeStyle = belly;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(7, -5);
    ctx.quadraticCurveTo(19, -11, 16 + sway, -22);
    ctx.stroke();
    if (o.hood) {
      oval(ctx, 13 + sway, -26, 8.5, 11, o.hood);
      dot(ctx, 10 + sway, -27, 1.8, 2.4, '#1a1a10');
      dot(ctx, 16 + sway, -27, 1.8, 2.4, '#1a1a10');
    }
    paintShape(ctx, () => { ctx.beginPath(); ctx.ellipse(17 + sway, -28, 7.2, 4.6, -0.15, 0, Math.PI * 2); }, o.body, 10, -33, 15, 10);
    dot(ctx, 21 + sway, -26.5, 3.2, 1.6, belly);
    monsterEye(ctx, 18.5 + sway, -29.5, 1.5, o.eye || '#ffd34d', true);
    if (f % 2 === 1) stroke(ctx, '#d8303a', 0.9, [[24 + sway, -26.5], [28 + sway, -26], [30 + sway, -28]]);
    if (f % 2 === 1) stroke(ctx, '#d8303a', 0.9, [[28 + sway, -26], [30 + sway, -24.5]]);
  }
  ctx.restore();
}

// Naga: Schlangenleib mit Oberkörper, Krone und Dreizack bzw. Stab
function nagaArt(ctx, f, o) {
  ctx.save();
  ctx.scale(o.scale || 1, o.scale || 1);
  serpentArt(ctx, f, { body: o.body, belly: o.belly, mark: o.mark, noHead: true });
  const bob = [0, -0.6, 0, 0.6][f];
  poly(ctx, [[0, -8], [10, -8], [9, -30 + bob], [1, -30 + bob]], o.skin);
  box(ctx, -0.5, -24 + bob, 11, 9, 2, o.armor);
  stroke(ctx, o.trim, 1.2, [[-0.5, -20 + bob], [10.5, -20 + bob]]);
  oval(ctx, 5.5, -36 + bob, 6.5, 6.5, o.skin);
  paintShape(ctx, () => { ctx.beginPath(); ctx.arc(5.5, -37 + bob, 7, Math.PI * 0.9, Math.PI * 2.1); ctx.closePath(); }, o.hair, -1.5, -44 + bob, 14, 8);
  monsterEye(ctx, 8.5, -36 + bob, 1.4, o.eye, true);
  poly(ctx, [[0.5, -42 + bob], [2, -47 + bob], [4, -43 + bob], [5.5, -48 + bob], [7, -43 + bob], [9, -47 + bob], [10.5, -42 + bob]], '#e8c84a');
  // Arm und Waffe
  stroke(ctx, o.skin, 3, [[8, -26 + bob], [14, -20 + bob]]);
  if (o.staff) {
    stroke(ctx, '#6b4a2e', 1.8, [[15, -6], [15, -40 + bob]]);
    oval(ctx, 15, -42 + bob, 3.6, 3.6, o.staff);
  } else {
    stroke(ctx, '#c9a35a', 1.6, [[15, -4], [15, -42 + bob]]);
    for (const dx of [-3, 0, 3]) stroke(ctx, '#d9dde2', 1.3, [[15 + dx, -42 + bob], [15 + dx, -47 + bob]]);
    stroke(ctx, '#d9dde2', 1.3, [[12, -42 + bob], [18, -42 + bob]]);
  }
  ctx.restore();
}

// Pferd von der Seite (Füße bei y = 0, Kopf nach rechts). frame 0–3: Galopp
function horseArt(ctx, frame, o = {}) {
  const coat = o.coat || '#8a5a36';
  const dark = darker(coat, 0.35);
  const mane = o.mane || '#3a2418';
  const hoof = '#241a14';
  const t = frame * Math.PI / 2;
  const leg = (x, phase, back) => {
    const sw = frame ? Math.sin(t + phase) * 5 : 0;
    box(ctx, x - 2 + sw * 0.4, -17, 4.2, 9, 1.8, back ? dark : coat);
    box(ctx, x - 1.6 + sw, -9, 3.4, 8, 1.4, back ? dark : coat);
    box(ctx, x - 2 + sw, -2, 4, 2.5, 1, hoof);
  };
  leg(-11, 0, true);
  leg(9, Math.PI, true);
  // Schweif
  paintShape(ctx, () => { ctx.beginPath(); ctx.moveTo(-17, -27); ctx.quadraticCurveTo(-27, -22, -24, -8 + (frame ? Math.sin(t) * 2 : 0)); ctx.quadraticCurveTo(-21, -18, -16, -22); ctx.closePath(); }, mane, -27, -27, 11, 20);
  oval(ctx, 0, -23, 18, 9.5, coat);
  oval(ctx, 2, -20, 13, 5, lighter(coat, 0.12));
  // Hals und Kopf
  poly(ctx, [[9, -30], [16, -42], [22, -42], [19, -27], [13, -18]], coat);
  paintShape(ctx, () => { ctx.beginPath(); ctx.ellipse(24, -40, 8, 4.6, 0.45, 0, Math.PI * 2); }, coat, 16, -46, 16, 12);
  oval(ctx, 29.5, -36.5, 2.6, 2.2, lighter(coat, 0.2));
  poly(ctx, [[18, -45], [19, -51], [21.5, -45]], coat);
  dot(ctx, 22.5, -41.5, 1.2, 1.2, '#1a120c');
  poly(ctx, [[8, -31], [15, -44], [19, -45], [12, -30]], mane);
  leg(-8, Math.PI / 2, false);
  leg(12, Math.PI * 1.5, false);
  if (o.saddle) {
    box(ctx, -7, -33, 14, 6, 2.5, o.saddle);
    box(ctx, -5.5, -27.5, 11, 5, 1.5, darker(o.saddle, 0.25));
    stroke(ctx, '#2a1a10', 1, [[0, -27], [0, -15]]);
    stroke(ctx, '#2a1a10', 1, [[26, -40], [14, -33]]);
  }
}

function monsterSprite(typeId, frame) {
  const art = MONSTER_ART[typeId];
  const k = art.h / 30;
  const bounds = { x: -36 * Math.max(1, k), y: -art.h - 14, w: 72 * Math.max(1, k), h: art.h + 20 };
  return getSprite(`m:${typeId}:${frame}`, bounds, (ctx) => art.draw(ctx, frame));
}

// Höhe einer Figur über ihren Füßen, für Namen und Lebensbalken
function figureHeight(e) {
  if (e.isStone) return stoneHeight(e);
  if (e.typeId && MONSTER_ART[e.typeId]) return MONSTER_ART[e.typeId].h;
  return 47;
}

function feetY(e) {
  return e.y + e.r * 0.8;
}

// Endbosse (seit 6.5) sehen aus wie ihre Vorlage, nur riesig und geschmückt
for (const [id, t] of Object.entries(MONSTER_TYPES)) if (t.raid && !MONSTER_ART[id]) MONSTER_ART[id] = MONSTER_ART[t.raid.art];
