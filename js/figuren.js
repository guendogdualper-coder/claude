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

// Farben je Gegenstandsstufe: Stahl, Mondsilber, Drachengold, Seelenviolett
const TIER_METAL = ['#c7ccd3', '#d4e2f2', '#e8c46a', '#b48cff'];
const TIER_ACCENT = ['#6a2a24', '#2f4f7a', '#9a2f2a', '#3a2350'];
const FAN_LEAF = ['#2f7f78', '#3a6fa8', '#c8402f', '#5a3a8a'];
const STAFF_ORB = ['#a7e37f', '#9be2ff', '#ff9a4a', '#d6a8ff'];

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

function beastArt(ctx, f, o) {
  const swing = [0, 1.8, 0, -1.8][f];
  const leg = (x, phase, back) => {
    const c = back ? darker(o.fur, 0.2) : o.fur;
    box(ctx, x + phase, -8, 3.2, 8, 1.4, c);
    box(ctx, x + phase - 0.3, -1.8, 4, 1.8, 0.8, darker(o.fur, 0.45));
  };
  leg(-8, -swing, true);
  leg(5, swing, true);
  // Schwanz
  if (o.tail !== false) poly(ctx, [[-10, -13], [-11, -10.5], [-17, -15 + swing * 0.5], [-17, -19 + swing * 0.5]], o.fur);
  oval(ctx, 0, -12, 12, o.bulky ? 8 : 6.5, o.fur);
  dot(ctx, 1, -8.4, 8.5, 2.6, o.belly);
  if (o.ridge) {
    ctx.fillStyle = darker(o.fur, 0.35);
    ctx.beginPath();
    ctx.moveTo(-10, -15);
    for (let k = 0; k <= 8; k++) ctx.lineTo(-10 + k * 2.4, -19.5 + (k % 2 ? 2.5 : 0));
    ctx.lineTo(9, -15);
    ctx.closePath();
    ctx.fill();
  }
  leg(-6, swing, false);
  leg(7, -swing, false);
  if (o.ruff) poly(ctx, [[5, -19], [8, -22], [9, -18.5], [12, -21], [11.5, -10], [5, -8]], o.ruff);
  // Kopf
  const hx = o.bulky ? 12 : 11;
  oval(ctx, hx, -15.5, 6.2, 5.6, o.fur);
  if (o.ears !== false) poly(ctx, [[hx - 3, -19.5], [hx - 1, -26], [hx + 1.8, -20]], darker(o.fur, 0.1));
  box(ctx, hx + 2.5, -16, 7, 4.6, 2.2, o.snout || o.belly);
  dot(ctx, hx + 9, -14.8, 1.3, 1.1, '#1a1210');
  if (o.tusk) poly(ctx, [[hx + 6, -12], [hx + 8.5, -16], [hx + 7.5, -11.5]], '#efe6d0');
  dot(ctx, hx + 2, -17, 1.2, o.angry ? 0.8 : 1.2, o.eye || '#1a1210');
  if (!o.angry) dot(ctx, hx + 1.6, -17.5, 0.45, 0.45, '#ffffff');
}

function humanoidMonsterArt(ctx, f, o) {
  const w = WALK[f];
  ctx.save();
  ctx.scale(o.scale || 1, o.scale || 1);
  if (o.wings) {
    const flap = [0, -1.5, 0, 1.5][f];
    poly(ctx, [[-2, -24 + w.bob], [-14, -36 + flap], [-22, -28 + flap], [-17, -26], [-20, -18 + flap], [-12, -20], [-4, -14 + w.bob]], o.wings);
  }
  if (o.belly) {
    hLegs(ctx, 'side', w, o);
    oval(ctx, 0, -17 + w.bob, 11, 10.5, o.skin);
    dot(ctx, 2, -14 + w.bob, 7, 6, lighter(o.skin, 0.12));
    box(ctx, -10, -11 + w.bob, 20, 5, 2, o.pants);
  } else {
    hLegs(ctx, 'side', w, o);
    hBody(ctx, 'side', w, o);
    if (o.belt) box(ctx, -6.5, -13.5 + w.bob, 13, 2.6, 1, o.belt);
    if (o.pauldron) oval(ctx, w.arm, -21 + w.bob, 5.5, 4, o.pauldron);
  }
  // Waffe in der vorderen Hand
  const hand = handPosition('side', f);
  if (o.weapon) heldWeapon(ctx, o.weapon, hand.x + 1, hand.y, o.weaponAngle != null ? o.weaponAngle : -1);
  hArms(ctx, 'side', w, o);
  const { cx, cy } = hHead(ctx, 'side', w, o);
  if (o.head) o.head(ctx, cx, cy, w);
  ctx.restore();
}

const MONSTER_ART = {
  hund: { h: 26, draw: (ctx, f) => beastArt(ctx, f, { fur: '#8a6748', belly: '#b89a78' }) },
  wolf: { h: 28, draw: (ctx, f) => { ctx.scale(1.08, 1.08); beastArt(ctx, f, { fur: '#7d8188', belly: '#b9bcc0', ruff: '#a4a8ad' }); } },
  alphawolf: { h: 34, draw: (ctx, f) => { ctx.scale(1.3, 1.3); beastArt(ctx, f, { fur: '#4d525a', belly: '#8d9196', ruff: '#2f3338', eye: '#e04a3a', angry: true }); } },
  wildschwein: { h: 30, draw: (ctx, f) => { ctx.scale(1.15, 1.15); beastArt(ctx, f, { fur: '#5a3f2e', belly: '#7a5a44', snout: '#b0806a', bulky: true, ridge: true, tusk: true, tail: false }); } },
  bandit: {
    h: 46, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 0.95, skin: '#d9b896', pants: '#4a3b2a', boots: '#2f2419', torso: '#6d5a3e', sleeve: '#5c4b33', belt: '#2f2419', weapon: 'sword',
      head: (ctx, cx, cy) => {
        paintShape(ctx, () => { ctx.beginPath(); ctx.arc(cx, cy - 0.5, 11.4, Math.PI * 0.9, Math.PI * 2.02); ctx.closePath(); }, '#5a3a22', cx - 11.4, cy - 12, 22.8, 12);
        box(ctx, cx - 10.5, cy - 6, 21.5, 3, 1.4, '#9a2f2a');
        poly(ctx, [[cx - 10, cy - 5], [cx - 16, cy - 2], [cx - 15, cy - 6]], '#9a2f2a');
        faceCloth(ctx, cx, cy, '#9a2f2a');
        eyes(ctx, 'side', cx, cy - 1.5, { narrow: true });
      }
    })
  },
  banditschuetze: {
    h: 46, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 0.95, skin: '#d9b896', pants: '#3e4a2e', boots: '#2f2419', torso: '#4f6a3e', sleeve: '#435a35', belt: '#2f2419', weapon: 'bow', weaponAngle: 0,
      head: (ctx, cx, cy) => {
        poly(ctx, [[cx - 12, cy + 6], [cx - 12, cy - 4], [cx - 4, cy - 12.5], [cx + 7, cy - 10], [cx + 11.5, cy - 2], [cx + 3, cy - 3], [cx - 2, cy + 6]], '#3e5530');
        faceCloth(ctx, cx, cy, '#9a2f2a');
        eyes(ctx, 'side', cx, cy - 1.5, { narrow: true });
      }
    })
  },
  ork: {
    h: 52, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.12, skin: '#6f8f45', pants: '#3e3226', boots: '#2a2018', torso: '#5a4632', sleeve: '#6f8f45', gloves: '#6f8f45', belt: '#2a2018', pauldron: '#7d848c', weapon: 'axe',
      head: (ctx, cx, cy) => {
        poly(ctx, [[cx - 3, cy - 6], [cx - 8, cy - 12], [cx - 1, cy - 9]], '#6f8f45');
        box(ctx, cx - 10, cy - 10, 20, 4, 1.8, '#3e3226');
        poly(ctx, [[cx + 7, cy + 7], [cx + 8.2, cy + 2.5], [cx + 9.2, cy + 7]], '#efe6d0');
        eyes(ctx, 'side', cx, cy - 1.2, { color: '#3a0d08', narrow: true });
        stroke(ctx, '#2a3a1a', 1, [[cx + 3, cy - 3.5], [cx + 9, cy - 2]]);
      }
    })
  },
  orkschamane: {
    h: 50, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.05, skin: '#5d8a73', boots: '#2a2018', robe: '#3e5a4f', sleeve: '#3e5a4f', gloves: '#5d8a73', wideSleeves: true, tattered: true, weapon: 'skullstaff', weaponAngle: -1.35,
      head: (ctx, cx, cy) => {
        poly(ctx, [[cx - 8, cy - 9], [cx - 14, cy - 20], [cx - 9, cy - 19]], '#c9a35a');
        poly(ctx, [[cx - 5, cy - 10], [cx - 8, cy - 23], [cx - 3, cy - 21]], '#b33a2c');
        box(ctx, cx - 10, cy - 9.5, 20, 3.4, 1.5, '#4a3a2a');
        poly(ctx, [[cx + 7, cy + 7], [cx + 8.2, cy + 2.5], [cx + 9.2, cy + 7]], '#efe6d0');
        eyes(ctx, 'side', cx, cy - 1.2, { color: '#0d2a3a', glow: '#9be2ff', narrow: true });
      }
    })
  },
  oger: {
    h: 66, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.45, belly: true, skin: '#8f897b', pants: '#4a3a2a', boots: '#3a3328', sleeve: '#8f897b', gloves: '#8f897b', weapon: 'club', weaponAngle: -1.3,
      head: (ctx, cx, cy) => {
        poly(ctx, [[cx - 2, cy - 9], [cx + 1, cy - 17], [cx + 3, cy - 9]], '#d9d0b8');
        poly(ctx, [[cx + 6, cy + 7], [cx + 7.5, cy + 2], [cx + 9, cy + 7]], '#efe6d0');
        eyes(ctx, 'side', cx, cy - 1, { narrow: true });
        stroke(ctx, '#4a443a', 1.2, [[cx + 2, cy - 3], [cx + 9, cy - 3]]);
      }
    })
  },
  daemon: {
    h: 52, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.1, skin: '#a8343f', pants: '#1f1214', boots: '#2a1416', torso: '#8e2f3a', sleeve: '#a8343f', gloves: '#2a1416', wings: '#4a1a20', belt: '#1f1214',
      head: (ctx, cx, cy) => {
        poly(ctx, [[cx - 6, cy - 8], [cx - 13, cy - 19], [cx - 2, cy - 10]], '#2a1416');
        poly(ctx, [[cx + 2, cy - 9.5], [cx + 1, cy - 21], [cx + 7, cy - 9]], '#2a1416');
        eyes(ctx, 'side', cx, cy - 1, { color: '#ffd34d', glow: '#ff9a4a', narrow: true });
        stroke(ctx, '#2a1416', 0.9, [[cx + 4, cy + 5.5], [cx + 10, cy + 5]]);
      }
    })
  }
};

function monsterSprite(typeId, frame) {
  const art = MONSTER_ART[typeId];
  const k = art.h / 30;
  const bounds = { x: -36 * Math.max(1, k), y: -art.h - 14, w: 72 * Math.max(1, k), h: art.h + 20 };
  return getSprite(`m:${typeId}:${frame}`, bounds, (ctx) => art.draw(ctx, frame));
}

// Höhe einer Figur über ihren Füßen, für Namen und Lebensbalken
function figureHeight(e) {
  if (e.isStone) return 52;
  if (e.typeId && MONSTER_ART[e.typeId]) return MONSTER_ART[e.typeId].h;
  return 47;
}

function feetY(e) {
  return e.y + e.r * 0.8;
}
