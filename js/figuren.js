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
  { l: -1, r: 1, bob: -0.7, arm: -1 }
];

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

function bakeSprite(bounds, draw) {
  const S = SPRITE_SCALE;
  const w = Math.ceil(bounds.w * S);
  const h = Math.ceil(bounds.h * S);
  const base = newCanvas(w, h);
  const b = base.getContext('2d');
  b.setTransform(S, 0, 0, S, -bounds.x * S, -bounds.y * S);
  b.lineJoin = 'round';
  b.lineCap = 'round';
  draw(b);
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

function getSprite(key, bounds, draw) {
  let sp = spriteCache.get(key);
  if (!sp) {
    sp = bakeSprite(bounds, draw);
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
  if (dir === 'side') {
    const s = w.l * 2.6;
    box(ctx, -2.5 - s, -10, 5, 7.5, 2, darker(o.pants, 0.18));
    box(ctx, -3.2 - s, -4.2, 7, 4.2, 1.8, darker(o.boots, 0.18));
    box(ctx, -2.5 + s, -10, 5, 7.5, 2, o.pants);
    box(ctx, -3 + s, -4.2, 7.5, 4.2, 1.8, o.boots);
  } else {
    const ly = w.l > 0 ? -1.2 : 0;
    const ry = w.r > 0 ? -1.2 : 0;
    box(ctx, -6, -10 + ly, 5, 7.5, 2, o.pants);
    box(ctx, -6.6, -4.6 + ly, 6.2, 4.6, 2, o.boots);
    box(ctx, 1, -10 + ry, 5, 7.5, 2, o.pants);
    box(ctx, 0.4, -4.6 + ry, 6.2, 4.6, 2, o.boots);
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
    return wb;
  }
  const tw = torsoWidth(dir) * (o.wide || 1);
  box(ctx, -tw / 2, y, tw, 16, 5, o.torso);
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
    oval(ctx, x + 2.5, y + dy + 11.5, 2.4, 2.3, o.gloves || o.skin);
  };
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
  oval(ctx, cx, cy, 11, 10.5, o.skin);
  return { cx, cy };
}

function eyes(ctx, dir, cx, cy, o = {}) {
  const xs = dir === 'side' ? [cx + 6] : [cx - 4.2, cx + 4.2];
  for (const x of xs) {
    if (o.glow) {
      ctx.globalAlpha = 0.4;
      dot(ctx, x, cy + 1.5, 3, 3, o.glow);
      ctx.globalAlpha = 1;
    }
    dot(ctx, x, cy + 1.5, 1.7, o.narrow ? 1.3 : 2.4, o.color || '#21160f');
    dot(ctx, x - 0.5, cy + (o.narrow ? 1.1 : 0.6), 0.65, 0.65, '#ffffff');
  }
  if (o.blush && dir === 'down') {
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

function weaponArt(ctx, kind, tier = 0) {
  switch (kind) {
    case 'sword':
      box(ctx, -3.5, -1.5, 5.5, 3, 1, TIER_ACCENT[tier]);
      oval(ctx, -4, 0, 1.9, 1.9, '#c9a35a');
      box(ctx, 1.5, -4.2, 2.4, 8.4, 1, '#c9a35a');
      poly(ctx, [[3.8, -2.3], [21, -2.3], [25.5, 0], [21, 2.3], [3.8, 2.3]], TIER_METAL[tier]);
      stroke(ctx, '#f4f6f8', 0.8, [[5, -0.6], [21, -0.6]]);
      break;
    case 'dagger':
      box(ctx, -2.8, -1.3, 4.2, 2.6, 1, '#2a2420');
      box(ctx, 1.2, -2.8, 1.6, 5.6, 0.8, '#8a8f96');
      poly(ctx, [[2.8, -1.7], [11, -1.4], [14.5, 0.6], [2.8, 1.7]], TIER_METAL[tier]);
      break;
    case 'fan': {
      paintShape(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 14, -0.8, 0.8);
        ctx.closePath();
      }, FAN_LEAF[tier], 0, -10, 14, 20);
      ctx.strokeStyle = '#e0c36a';
      ctx.lineWidth = 0.8;
      for (let k = -3; k <= 3; k++) {
        const a = k * 0.25;
        ctx.beginPath();
        ctx.moveTo(1, 0);
        ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14);
        ctx.stroke();
      }
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, 13.6, -0.8, 0.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 7, -0.8, 0.8);
      ctx.stroke();
      oval(ctx, Math.cos(0.8) * 14 + 1, Math.sin(0.8) * 14 + 2, 1.6, 1.6, '#e0c36a');
      oval(ctx, Math.cos(-0.8) * 14 + 1, Math.sin(-0.8) * 14 + 2, 1.6, 1.6, '#e0c36a');
      box(ctx, -2.5, -1.3, 4, 2.6, 1, '#e0c36a');
      break;
    }
    case 'staff':
      box(ctx, -14, -1.4, 35, 2.8, 1.2, '#5c4230');
      for (let k = -10; k < 18; k += 5) stroke(ctx, '#3e2c1f', 0.9, [[k, -1.4], [k + 2, 1.4]]);
      poly(ctx, [[19, -1.5], [23, -5], [24, -3], [21.5, 0], [24, 3], [23, 5], [19, 1.5]], '#3e2c1f');
      oval(ctx, 25, 0, 3.6, 3.6, STAFF_ORB[tier]);
      dot(ctx, 24, -1.2, 1.1, 1.1, '#efffe0');
      break;
    case 'axe':
      box(ctx, -4, -1.2, 22, 2.4, 1, '#5a4030');
      poly(ctx, [[12, -2], [17, -9], [21, -7], [19.5, 0], [21, 7], [17, 9], [12, 2]], '#9aa1a8');
      stroke(ctx, '#d9dde2', 0.8, [[19.6, -5.5], [18.5, 0], [19.6, 5.5]]);
      break;
    case 'club':
      poly(ctx, [[-3, -1.6], [14, -3.6], [20, -4.6], [22.5, 0], [20, 4.6], [14, 3.6], [-3, 1.6]], '#6b4f34');
      dot(ctx, 15, -1.5, 0.9, 0.9, '#3e2c1f');
      dot(ctx, 18, 1.8, 0.9, 0.9, '#3e2c1f');
      break;
    case 'bow':
      ctx.strokeStyle = '#6b4a2e';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(-6, 0, 12, -1.15, 1.15);
      ctx.stroke();
      stroke(ctx, '#e8e0cc', 0.5, [[-6 + Math.cos(1.15) * 12, -Math.sin(1.15) * 12], [-6 + Math.cos(1.15) * 12, Math.sin(1.15) * 12]]);
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

const WEAPON_BOUNDS = { x: -8, y: -12, w: 38, h: 24 };

function weaponSprite(kind, tier = 0) {
  return getSprite(`w:${kind}:${tier}`, WEAPON_BOUNDS, (ctx) => weaponArt(ctx, kind, tier));
}

function heldWeapon(ctx, kind, x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  weaponArt(ctx, kind);
  ctx.restore();
}

// --- Die vier Klassen -------------------------------------------------------------------

const CHARACTER_ART = {
  krieger(ctx, dir, w) {
    const o = { skin: '#e9c6a1', pants: '#3b2d25', boots: '#4d3527', torso: '#9c3b33', sleeve: '#7f2f29', gloves: '#5a4030' };
    const ty = -24 + w.bob;
    const crimson = '#9c3b33';
    const brass = '#c9a35a';
    hLegs(ctx, dir, w, o);
    // Panzerrock
    const sw = dir === 'side' ? 8 : 11.5;
    poly(ctx, [[-sw + 1.5, ty + 12], [sw - 1.5, ty + 12], [sw, ty + 18.5], [-sw, ty + 18.5]], '#8a332c');
    stroke(ctx, 'rgba(201,163,90,0.7)', 0.6, [[-sw + 1, ty + 15.5], [sw - 1, ty + 15.5]]);
    const half = hBody(ctx, dir, w, o);
    for (let k = 0; k < 3; k++) stroke(ctx, 'rgba(201,163,90,0.75)', 0.7, [[-half + 1.5, ty + 3.5 + k * 3], [half - 1.5, ty + 3.5 + k * 3]]);
    box(ctx, -half, ty + 11.5, half * 2, 3, 1, brass);
    if (dir === 'down') oval(ctx, 0, ty + 13, 2.3, 2, '#e0c36a');
    hArms(ctx, dir, w, o);
    // Schulterpanzer
    const pad = (x) => {
      oval(ctx, x, ty + 2, 6.2, 4.6, crimson);
      stroke(ctx, brass, 0.9, [[x - 5, ty + 4.5], [x + 5, ty + 4.5]]);
    };
    if (dir === 'side') pad(w.arm);
    else { pad(-11.5); pad(11.5); }
    const { cx, cy } = hHead(ctx, dir, w, o);
    if (dir !== 'up') eyes(ctx, dir, cx, cy, { blush: true });
    // Helm
    const steel = '#8f98a3';
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
    // Helmbusch
    if (dir === 'side') poly(ctx, [[cx - 2, cy - 11.8], [cx + 2.5, cy - 12.4], [cx - 2, cy - 18.5], [cx - 9.5, cy - 15.5]], '#c8402f');
    else poly(ctx, [[cx - 2.2, cy - 12], [cx + 2.2, cy - 12], [cx + 1.4, cy - 19], [cx - 1.4, cy - 19]], '#c8402f');
  },

  ninja(ctx, dir, w, f) {
    const o = { skin: '#e9c6a1', pants: '#2c2935', boots: '#3d3848', torso: '#312c3d', sleeve: '#2c2935', gloves: '#3d3848' };
    const scarf = '#6b4f9a';
    const hood = '#2a2633';
    const ty = -24 + w.bob;
    const sway = [0, 1.6, 0, -1.6][f];
    // Schalenden hinter dem Körper
    if (dir === 'side') poly(ctx, [[-3, ty - 1], [-1, ty + 2.5], [-12, ty + 8 + sway], [-16, ty + 4.5 + sway]], scarf);
    if (dir === 'up') {
      poly(ctx, [[-2.5, ty - 1], [1, ty - 1], [3 + sway, ty + 15], [-1.5 + sway, ty + 15]], scarf);
      poly(ctx, [[1, ty - 1], [4, ty - 1], [8.5 + sway, ty + 11], [5.5 + sway, ty + 12.5]], darker(scarf, 0.12));
    }
    hLegs(ctx, dir, w, o);
    // Beinwickel
    const wrap = 'rgba(205,200,220,0.55)';
    if (dir === 'side') {
      stroke(ctx, wrap, 0.7, [[-2 + w.l * 2.6, -7.5], [2.2 + w.l * 2.6, -6.5]]);
    } else {
      stroke(ctx, wrap, 0.7, [[-5.6, -7.5], [-1.4, -6.6]]);
      stroke(ctx, wrap, 0.7, [[1.4, -7.5], [5.6, -6.6]]);
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
    hArms(ctx, dir, w, o);
    // Schal am Hals
    if (dir === 'side') box(ctx, -6, ty - 2.5, 12, 4.8, 2, scarf);
    else box(ctx, -8.5, ty - 2.5, 17, 4.8, 2, scarf);
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
    eyes(ctx, dir, cx, cy - 0.5, { narrow: true });
  },

  schamane(ctx, dir, w) {
    const o = { skin: '#ecc9a5', boots: '#3a2c24', robe: '#2c6f6a', sleeve: '#2c6f6a', cuff: '#e0c36a', wideSleeves: true };
    const gold = '#e0c36a';
    const hair = '#231c1c';
    const ty = -24 + w.bob;
    hLegs(ctx, dir, w, o);
    const wb = hBody(ctx, dir, w, o);
    stroke(ctx, gold, 1.2, [[-wb + 1, -3.8], [wb - 1, -3.8]]);
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
    if (dir !== 'up') {
      const talisman = (x) => {
        box(ctx, x, ty + 13.3, 3.4, 6.2, 0.5, '#efe6cc');
        stroke(ctx, '#b33a2c', 0.6, [[x + 0.8, ty + 14.5], [x + 2.6, ty + 15.6], [x + 0.8, ty + 16.8], [x + 2.6, ty + 18]]);
      };
      if (dir === 'side') talisman(-2);
      else { talisman(-7); talisman(3.6); }
    }
    hArms(ctx, dir, w, o);
    const { cx, cy } = hHead(ctx, dir, w, o);
    if (dir === 'up') {
      oval(ctx, cx, cy - 0.5, 11.4, 11, hair);
    } else if (dir === 'down') {
      eyes(ctx, dir, cx, cy, { blush: true });
      paintShape(ctx, () => {
        ctx.beginPath();
        ctx.arc(cx, cy - 0.5, 11.4, Math.PI * 1.02, Math.PI * 1.98);
        ctx.quadraticCurveTo(cx + 3, cy - 6.5, cx, cy - 4.5);
        ctx.quadraticCurveTo(cx - 3, cy - 6.5, cx - 11.3, cy - 1.5);
        ctx.closePath();
      }, hair, cx - 11.4, cy - 12, 22.8, 10);
      box(ctx, cx - 11.6, cy - 4, 3.2, 10.5, 1.5, hair);
      box(ctx, cx + 8.4, cy - 4, 3.2, 10.5, 1.5, hair);
      oval(ctx, cx - 11, cy + 4, 1.1, 1.1, gold);
      oval(ctx, cx + 11, cy + 4, 1.1, 1.1, gold);
    } else {
      eyes(ctx, dir, cx, cy);
      paintShape(ctx, () => {
        ctx.beginPath();
        ctx.arc(cx, cy - 0.5, 11.4, Math.PI * 0.75, Math.PI * 1.9);
        ctx.quadraticCurveTo(cx + 2, cy - 5, cx - 3, cy - 1);
        ctx.lineTo(cx - 5, cy + 7);
        ctx.closePath();
      }, hair, cx - 11.4, cy - 12, 20, 19);
    }
    oval(ctx, cx + (dir === 'side' ? -3.5 : 0), cy - 12, 4.6, 4, hair);
    if (dir === 'up') box(ctx, cx - 11.2, cy - 6.2, 22.4, 2.6, 1.2, gold);
    else if (dir === 'down') {
      box(ctx, cx - 11.2, cy - 7, 22.4, 2.6, 1.2, gold);
      oval(ctx, cx, cy - 5.7, 1.5, 1.5, '#c8402f');
    } else box(ctx, cx - 9.5, cy - 7, 20.5, 2.6, 1.2, gold);
  },

  nekromant(ctx, dir, w) {
    const bone = '#ddd5bb';
    const o = { skin: '#c9c4b0', boots: '#2a2420', robe: '#334a31', sleeve: '#2c402a', wideSleeves: true, tattered: true, gloves: '#c9c4b0' };
    const hood = '#2a3b28';
    const ty = -24 + w.bob;
    hLegs(ctx, dir, w, o);
    const wb = hBody(ctx, dir, w, o);
    if (dir === 'down') poly(ctx, [[-2.5, ty + 2], [2.5, ty + 2], [3.6, -3.5], [-3.6, -3.5]], '#1d281c');
    stroke(ctx, 'rgba(167,227,127,0.35)', 0.7, [[-wb + 2, -5.5], [wb - 2, -5.5]]);
    const bw = dir === 'side' ? 13 : 18.5;
    box(ctx, -bw / 2, ty + 10.5, bw, 2.6, 1, '#4a3a2a');
    const skull = (x, y, s = 1) => {
      oval(ctx, x, y, 3.6 * s, 3.2 * s, bone);
      dot(ctx, x - 1.3 * s, y, 0.85 * s, 0.85 * s, '#1a1210');
      dot(ctx, x + 1.3 * s, y, 0.85 * s, 0.85 * s, '#1a1210');
    };
    if (dir !== 'up') skull(dir === 'side' ? 4 : 0, ty + 11.8, 0.7);
    hArms(ctx, dir, w, o);
    if (dir === 'side') skull(w.arm * 1.5, ty + 1.5);
    else { skull(-10.5, ty + 1); skull(10.5, ty + 1); }
    const cx = dir === 'side' ? 1.5 : 0;
    const cy = -34.5 + w.bob;
    if (dir === 'side') {
      poly(ctx, [[cx - 12, cy + 7.5], [cx - 12.5, cy - 3], [cx - 9, cy - 10], [cx - 17, cy - 16], [cx - 2, cy - 12.5], [cx + 10, cy - 5.5], [cx + 11.8, cy + 6.5]], hood);
      dot(ctx, cx + 5.8, cy + 1.5, 5, 6.5, '#0d120c');
      oval(ctx, cx + 6.5, cy + 6.4, 3, 1.8, o.skin);
      eyes(ctx, 'side', cx, cy - 1, { color: '#d6ffb0', glow: '#a7e37f', narrow: true });
      return;
    }
    poly(ctx, [[cx - 12, cy + 7.5], [cx - 12.8, cy - 4], [cx - 5, cy - 13], [cx + 1, cy - 20], [cx + 6, cy - 12.5], [cx + 12.8, cy - 4], [cx + 12, cy + 7.5]], hood);
    if (dir === 'down') {
      dot(ctx, cx, cy + 1.6, 7.6, 7.2, '#0d120c');
      oval(ctx, cx, cy + 6.6, 4, 2, o.skin);
      eyes(ctx, 'down', cx, cy - 1, { color: '#d6ffb0', glow: '#a7e37f', narrow: true });
    }
  }
};

const FIGURE_BOUNDS = { x: -30, y: -60, w: 60, h: 66 };

function characterSprite(classId, dir, frame) {
  return getSprite(`c:${classId}:${dir}:${frame}`, FIGURE_BOUNDS, (ctx) => CHARACTER_ART[classId](ctx, dir, WALK[frame], frame));
}

// Wo die Waffenhand sitzt (relativ zu den Füßen, Figur nach rechts bzw. zum Betrachter)
function handPosition(dir, frame, side) {
  const w = WALK[frame];
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
  }
});

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
