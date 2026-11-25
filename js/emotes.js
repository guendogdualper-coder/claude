'use strict';
// Emotes (seit 15.83, docs/garderobe-haustiere-emotes.md): winken, sitzen, tanzen, jubeln, verbeugen, lachen.
// Auslösen per Chat-Befehl (/winken, /sitzen, /tanzen, /jubeln, /verbeugen, /lachen und englische Kurzformen) oder über
// das kleine Emote-Menü (Knopf am Chat, rechts unter dem Schreib-Knopf). Laufen, Angreifen, Aufsitzen und Sterben brechen
// ab; winken, jubeln, verbeugen und lachen enden von selbst, sitzen und tanzen bleiben, bis man sich bewegt.
// 2D: eigene Bilder der Figur (Arme hoch, Sitzhaltung, Verbeugung von der Seite, fröhliche Augen), dazu Hüpfer, Wiegen
// und Lachen; die Waffe ist für die Geste weggesteckt. 3D: Haltung über die Knochen nach der normalen Bewegung.
// Mitspieler sehen es über das Netzfeld em = [Nummer der Geste, Zähler] – beim Empfang nur Werte aus EMOTES.
// Kein Spielstand nötig: die Geste hängt nur an der Figur (p.emote = { id, t0 }).

// befehle: deutsch zuerst, en = englische Kurzform (steht auf der Seite „Emotes“); dauer 0 = bis man sich bewegt
const EMOTES = [
  { id: 'winken', name: 'Winken', befehle: ['winken', 'wink', 'wave', 'hallo', 'hi'], en: 'wave', dauer: 2.6 },
  { id: 'sitzen', name: 'Sitzen', befehle: ['sitzen', 'setzen', 'sit'], en: 'sit', dauer: 0 },
  { id: 'tanzen', name: 'Tanzen', befehle: ['tanzen', 'tanz', 'dance'], en: 'dance', dauer: 0 },
  { id: 'jubeln', name: 'Jubeln', befehle: ['jubeln', 'jubel', 'cheer'], en: 'cheer', dauer: 2.6 },
  { id: 'verbeugen', name: 'Verbeugen', befehle: ['verbeugen', 'verbeugung', 'bow'], en: 'bow', dauer: 2.3 },
  { id: 'lachen', name: 'Lachen', befehle: ['lachen', 'lol', 'laugh', 'haha'], en: 'laugh', dauer: 2.6 }
];
const EM_BY_ID = Object.assign(Object.create(null), Object.fromEntries(EMOTES.map((e, i) => [e.id, Object.assign(e, { i })])));
const EM_BEFEHL = Object.create(null);
for (const e of EMOTES) for (const b of e.befehle) EM_BEFEHL[b] = e.id;
const EM_LACHEN = 'Haha!';
const emGueltig = (id) => typeof id === 'string' && Object.prototype.hasOwnProperty.call(EM_BY_ID, id);
const EM = { seq: 0 };

// --- Starten und beenden -------------------------------------------------------------------------------------------
function emStart(id) {
  const p = typeof game !== 'undefined' ? game.player : null;
  if (!p || !game.running || !emGueltig(id)) return false;
  if (p.dead) return false;
  if (p.riding) {
    ui.log('Steig zuerst ab, um ein Emote zu zeigen.', 'warn');
    return false;
  }
  EM.seq = (EM.seq + 1) % 1000000;
  p.emote = { id, t0: game.time, sw: p.swingSeq || 0, seq: EM.seq };
  if (id === 'lachen') {
    p.say = EM_LACHEN;
    p.sayUntil = game.time + 2.2;
  }
  emMenu(false);
  return true;
}
function emEnde(p) {
  if (p && p.emote) p.emote = null;
}
// Gerade aktive Geste einer Figur (eigene oder Mitspieler) mit Zeit seit dem Start, sonst null
function emAktiv(e) {
  const E = e && e.emote;
  if (!E || !emGueltig(E.id) || e.riding || e.dead) return null;
  const D = EM_BY_ID[E.id];
  const t = game.time - E.t0;
  if (D.dauer && t > D.dauer) return null;
  return { D, t: Math.max(0, t) };
}
// jedes Bild: Laufen, Angriffe, Sprünge und Reiten brechen die eigene Geste ab, kurze Gesten enden von selbst
function emTick() {
  const p = game.player;
  const E = p && p.emote;
  if (!E) return;
  const D = EM_BY_ID[E.id];
  const t = game.time - E.t0;
  if (!D || (D.dauer && t > D.dauer) || p.moving || p.dead || p.riding || (p.swingSeq || 0) !== E.sw || p.leap || p.dash || p.spin > 0 || p.blinkHide > game.time) emEnde(p);
}
const _emNetUpdate = netUpdate;
// eslint-disable-next-line no-global-assign
netUpdate = function (dt) {
  _emNetUpdate(dt);
  try { emTick(); } catch (err) { /* nächstes Bild */ }
};

// --- Chat-Befehle --------------------------------------------------------------------------------------------------
// true, wenn der Text ein Emote-Befehl war (dann geht nichts in den Chat)
function emBefehl(text) {
  const m = /^\s*\/([a-zäöüß]+)\s*$/i.exec(String(text || ''));
  if (!m) return false;
  const w = m[1].toLowerCase();
  if (w === 'emote' || w === 'emotes') {
    emMenu(true);
    return true;
  }
  const id = EM_BEFEHL[w];
  if (!id) return false;
  emStart(id);
  return true;
}
if (typeof netChat === 'function') {
  const _emNetChat = netChat;
  // eslint-disable-next-line no-global-assign
  netChat = function (text, c) {
    if (emBefehl(text)) return;
    return _emNetChat(text, c);
  };
}
// Befehle schon beim Absenden abfangen (vor dem Hörer in oberflaeche.js): keine Rückfrage zu den Chat-Regeln für eine
// Geste, und auch ohne Kanal, falls das Feld offen ist; netChat oben bleibt für andere Wege
(function emChatForm() {
  const form = document.getElementById('chatBar');
  const inp = document.getElementById('chatInput');
  if (!form || !inp) return;
  form.addEventListener('submit', (e) => {
    if (!emBefehl(inp.value)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    inp.value = '';
    if (typeof ui !== 'undefined' && ui.closeChat) ui.closeChat();
  }, true);
})();

// --- Mitspieler ----------------------------------------------------------------------------------------------------
if (typeof netPlayerState === 'function') {
  const _emNet = netPlayerState;
  // eslint-disable-next-line no-global-assign
  netPlayerState = function () {
    const s = _emNet();
    const p = game.player;
    const A = p && emAktiv(p);
    if (s && A) s.em = [A.D.i, p.emote.seq | 0];
    return s;
  };
}
// Empfang: vor dem Original lesen (es säubert den Zustand womöglich), nur [Nummer aus EMOTES, ganze Zahl] gilt
if (typeof netApplyState === 'function') {
  const _emApply = netApplyState;
  // eslint-disable-next-line no-global-assign
  netApplyState = function (rp, s) {
    const em = s && typeof s === 'object' ? s.em : undefined;
    const r = _emApply(rp, s);
    if (!rp || !s) return r;
    const ok = Array.isArray(em) && em.length === 2 && Number.isInteger(em[0]) && em[0] >= 0 && em[0] < EMOTES.length &&
      Number.isInteger(em[1]) && em[1] >= 0 && em[1] < 1000000;
    if (!ok) {
      rp.emote = null;
      return r;
    }
    const id = EMOTES[em[0]].id;
    if (!rp.emote || rp.emote.id !== id || rp.emSeq !== em[1]) {
      rp.emote = { id, t0: game.time };
      rp.emSeq = em[1];
      if (id === 'lachen') {
        rp.say = EM_LACHEN;
        rp.sayUntil = game.time + 2.2;
      }
    }
    return r;
  };
}

// --- 2D: eigene Bilder der Figur -------------------------------------------------------------------------------------
// Zusätzliche Bilder im Laufzyklus (WALK, figuren.js): em = Arme hoch (l/r von vorn, s von der Seite; Zahl = Drehung
// nach außen), sit = Sitzhaltung (Oberkörper tiefer, Beine vorn verschränkt)
const emBild = (w) => WALK.push(w) - 1;
const EM_F = {
  wink1: emBild({ l: 0, r: 0, bob: 0, arm: 0, em: { r: 0.42 } }),
  wink2: emBild({ l: 0, r: 0, bob: 0, arm: 0, em: { r: -0.18 } }),
  jubel1: emBild({ l: 0, r: 0, bob: -1.2, arm: 0, em: { l: 0.18, r: 0.18 } }),
  jubel2: emBild({ l: 0, r: 0, bob: -0.6, arm: 0, em: { l: -0.22, r: -0.22 } }),
  tanz1: emBild({ l: 1, r: -1, bob: -0.7, arm: 0, em: { l: 0.25 } }),
  tanz2: emBild({ l: -1, r: 1, bob: -0.7, arm: 0, em: { r: 0.25 } }),
  sitz: emBild({ l: 0, r: 0, bob: 6, arm: 0, sit: true }),
  lach1: emBild({ l: 0, r: 0, bob: 0.4, arm: 0 }),
  lach2: emBild({ l: 0, r: 0, bob: -0.8, arm: 0 })
};
// Zustand beim Zeichnen einer Figur mit Geste (nur innerhalb von drawPlayer gesetzt)
const EM2D = { frame: null, augen: null, bow: 0, stiefel: -1 };
const _emHArms = hArms;
// eslint-disable-next-line no-global-assign
hArms = function (ctx, dir, w, o) {
  if (w && w.sit) emSitzBeine(ctx, dir, w, o);
  const E = w && w.em;
  if (!E) return _emHArms(ctx, dir, w, o);
  const y = -22.5 + w.bob;
  const ruhig = { l: w.l, r: w.r, bob: w.bob, arm: 0 };
  const hoch = { l: w.l, r: w.r, bob: w.bob, arm: 0, raise: true };
  if (dir === 'side') {
    if (E.s == null) return _emHArms(ctx, dir, ruhig, o);
    ctx.save();
    ctx.translate(0, y + 1);
    ctx.rotate(E.s);
    ctx.translate(0, -(y + 1));
    _emHArms(ctx, dir, hoch, o);
    ctx.restore();
    return;
  }
  // von vorn/hinten: jede Hälfte für sich (die Kraftpose hebt sonst beide Arme)
  for (const side of [-1, 1]) {
    const a = side < 0 ? E.l : E.r;
    ctx.save();
    ctx.beginPath();
    ctx.rect(side < 0 ? -60 : 0, -100, 60, 130);
    ctx.clip();
    if (a == null) _emHArms(ctx, dir, ruhig, o);
    else {
      const px = side * 11;
      ctx.translate(px, y + 1);
      ctx.rotate(a * side);
      ctx.translate(-px, -(y + 1));
      _emHArms(ctx, dir, hoch, o);
    }
    ctx.restore();
  }
};
// Sitzen: die normalen Beine fallen weg, verschränkte Beine kommen vor den Oberkörper (vor den Armen gezeichnet)
const _emHLegs = hLegs;
// eslint-disable-next-line no-global-assign
hLegs = function (ctx, dir, w, o) {
  if (w && w.sit) return;
  return _emHLegs(ctx, dir, w, o);
};
const _emGearBoots = gearBoots;
// eslint-disable-next-line no-global-assign
gearBoots = function (ctx, dir, w, tier, robe) {
  if (w && w.sit) {
    EM2D.stiefel = gearTier(tier);
    return;
  }
  return _emGearBoots(ctx, dir, w, tier, robe);
};
function emSitzBeine(ctx, dir, w, o) {
  const st = EM2D.stiefel;
  EM2D.stiefel = -1;
  const boot = st >= 0 ? GEAR_LOOK.boots[st] : o.boots || '#4d3527';
  const cloth = o.robe || o.pants || '#3b2d25';
  if (dir === 'up') {
    // von hinten: nur die Knie seitlich
    oval(ctx, -8.6, -3.2, 3.2, 2.4, cloth);
    oval(ctx, 8.6, -3.2, 3.2, 2.4, cloth);
    return;
  }
  // Oberschenkel nach vorn zu den Knien, Unterschenkel davor verschränkt, Füße seitlich
  oval(ctx, -6.8, -4.2, 4.6, 2.9, cloth);
  oval(ctx, 6.8, -4.2, 4.6, 2.9, cloth);
  box(ctx, -8.2, -3.4, 16.4, 3.2, 1.5, darker(cloth, 0.12));
  stroke(ctx, darker(cloth, 0.35), 0.5, [[-1.2, -3.2], [1.2, -0.5]]);
  box(ctx, -10.6, -2.9, 4.4, 2.9, 1.3, boot);
  box(ctx, 6.2, -2.9, 4.4, 2.9, 1.3, boot);
}
// Verbeugung von der Seite: Beine stehen, der Oberkörper neigt sich ab der Hüfte nach vorn (k = 0,5 oder 1)
const EM_BOW = new Map();
function emBowSprite(classId, look, k) {
  const base = _emCharSprite(classId, 'side', 0, look);
  const key = classId + '|' + look.a + '|' + look.h + '|' + gearTier(look.b) + '|' + gearTier(look.g) + '|' + gearTier(look.s) + '|' + lookKey(look.ap) + '|' + (look.pt ?? '') + '|' + k;
  let sp = EM_BOW.get(key);
  if (sp && sp.base === base) return sp;
  const b = base.bounds;
  const img = base.img;
  const S = img.width / b.w;
  const extra = 22;
  const c = newCanvas(Math.ceil((b.w + extra) * S), img.height);
  const x = c.getContext('2d');
  const px = -b.x * S;
  const py = (-12 - b.y) * S;
  x.save();
  x.beginPath();
  x.rect(0, py, c.width, c.height - py);
  x.clip();
  x.drawImage(img, 0, 0);
  x.restore();
  x.save();
  x.beginPath();
  x.rect(0, 0, c.width, py + 0.6 * S);
  x.clip();
  x.translate(px, py);
  x.rotate((classId === 'magier' ? 0.52 : 0.62) * k);
  x.translate(-px, -py);
  x.drawImage(img, 0, 0);
  x.restore();
  sp = { img: c, bounds: { x: b.x, y: b.y, w: b.w + extra, h: b.h }, flash: null, base };
  if (EM_BOW.size > 40) EM_BOW.clear();
  EM_BOW.set(key, sp);
  return sp;
}
const _emCharSprite = characterSprite;
// eslint-disable-next-line no-global-assign
characterSprite = function (classId, dir, frame, look) {
  if (EM2D.frame == null) return _emCharSprite(classId, dir, frame, look);
  if (EM2D.augen != null && look) look = Object.assign({}, look, { ap: Object.assign({}, look.ap || {}, { eyes: EM2D.augen }) });
  if (EM2D.bow > 0 && dir === 'side') return emBowSprite(classId, look || { a: -1, h: -1 }, EM2D.bow);
  return _emCharSprite(classId, dir, EM2D.frame, look);
};
// Haltung einer Geste im Bild: Bild, Augen, Blick, Hüpfer, Wiegen, Zittern, Spiegeln, Umhang weg
const EM_VORN = { x: 0, y: 1 };
const EM_RECHTS = { x: 1, y: 0 };
const EM_LINKS = { x: -1, y: 0 };
function emPose2d(D, t) {
  const P = { frame: 0, augen: null, side: false, bow: 0, hop: 0, hopK: 0, hopDur: 0.5, sway: 0, shake: 0, flip: false, ohneUmhang: false };
  switch (D.id) {
    case 'winken':
      P.frame = Math.floor(t * 5) % 2 ? EM_F.wink2 : EM_F.wink1;
      break;
    case 'jubeln': {
      P.hopDur = 0.55;
      P.hopK = (t % P.hopDur) / P.hopDur;
      P.hop = 7;
      P.frame = P.hopK < 0.5 ? EM_F.jubel1 : EM_F.jubel2;
      P.augen = 2;
      break;
    }
    case 'tanzen': {
      const beat = 0.38;
      const n = Math.floor(t / beat);
      P.frame = n % 2 ? EM_F.tanz2 : EM_F.tanz1;
      P.hopDur = beat;
      P.hopK = (t % beat) / beat;
      P.hop = 3;
      P.sway = Math.sin((t / beat) * Math.PI) * 0.1;
      P.flip = Math.floor(n / 4) % 2 === 1;
      P.augen = 2;
      break;
    }
    case 'sitzen':
      P.frame = EM_F.sitz;
      P.ohneUmhang = true;
      break;
    case 'verbeugen':
      P.side = true;
      P.ohneUmhang = true;
      P.bow = t < 0.12 ? 0 : t < 0.32 ? 0.5 : t < 1.55 ? 1 : t < 1.8 ? 0.5 : 0;
      P.frame = 0;
      P.augen = P.bow >= 1 ? 2 : null;
      break;
    case 'lachen':
      P.frame = Math.floor(t * 7) % 2 ? EM_F.lach2 : EM_F.lach1;
      P.shake = Math.sin(t * 40) * 0.7;
      P.augen = 2;
      break;
  }
  return P;
}
// Ausrüstung ohne Waffe und Schild (und für Sitzen/Verbeugen ohne Umhang) – nur fürs Bild
function emOhne(eq, umhang) {
  const o = Object.create(eq);
  o.waffe = null;
  o.schild = null;
  if (umhang) o.umhang = null;
  return o;
}
const _emDrawPlayer = drawPlayer;
// eslint-disable-next-line no-global-assign
drawPlayer = function (ctx, p) {
  const A = p && !p.clone ? emAktiv(p) : null;
  if (!A) return _emDrawPlayer(ctx, p);
  const P = emPose2d(A.D, A.t);
  const keep = { facing: p.facing, moving: p.moving, spin: p.spin, leap: p.leap, eq: p.equipment };
  const f = p.facing || EM_VORN;
  p.facing = P.side ? (f.x < 0 ? EM_LINKS : EM_RECHTS) : EM_VORN;
  p.moving = false;
  p.spin = 0;
  p.leap = P.hop ? { start: game.time - P.hopK * P.hopDur, dur: P.hopDur, h: P.hop } : null;
  if (p.equipment) p.equipment = emOhne(p.equipment, P.ohneUmhang);
  EM2D.frame = P.frame;
  EM2D.augen = P.augen;
  EM2D.bow = P.bow;
  const fy = feetY(p);
  ctx.save();
  if (P.sway || P.shake || P.flip) {
    ctx.translate(p.x + P.shake, fy);
    if (P.sway) ctx.rotate(P.sway);
    if (P.flip) ctx.scale(-1, 1);
    ctx.translate(-p.x, -fy);
  }
  try {
    return _emDrawPlayer(ctx, p);
  } finally {
    ctx.restore();
    EM2D.frame = null;
    EM2D.augen = null;
    EM2D.bow = 0;
    EM2D.stiefel = -1;
    p.facing = keep.facing;
    p.moving = keep.moving;
    p.spin = keep.spin;
    p.leap = keep.leap;
    p.equipment = keep.eq;
  }
};

// --- 3D: Haltung über die Knochen (nach der normalen Bewegung in syncPlayer3) ---------------------------------------
function emPose3(a, A) {
  const B = a.bones;
  const J = a.model.joints;
  const { D, t } = A;
  // weich hinein (0,25 s) und bei kurzen Gesten weich heraus (0,3 s)
  const k = Math.min(1, t / 0.25) * (D.dauer ? Math.max(0, Math.min(1, (D.dauer - t) / 0.3)) : 1);
  if (k <= 0) return;
  const mix = (bone, x, y, z) => {
    const r = bone.rotation;
    r.set(r.x + (x - r.x) * k, r.y + (y - r.y) * k, r.z + (z - r.z) * k);
  };
  const hips = B[BH.hips];
  switch (D.id) {
    case 'winken': {
      const w = Math.sin(t * 10);
      mix(B[BH.armL], -2.55, 0, 0.42 + 0.34 * w);
      B[BH.head].rotation.y += 0.18 * k;
      B[BH.head].rotation.z += 0.05 * w * k;
      break;
    }
    case 'jubeln': {
      const hop = Math.abs(Math.sin(t * 6.4));
      hips.position.y += hop * 0.13 * k;
      const pump = Math.sin(t * 12.8) * 0.18;
      mix(B[BH.armL], -2.8 - pump, 0, 0.38);
      mix(B[BH.armR], -2.8 + pump, 0, -0.38);
      B[BH.head].rotation.x += -0.22 * k;
      B[BH.chest].rotation.x += -0.12 * k;
      B[BH.legL].rotation.x += -0.2 * (1 - hop) * k;
      B[BH.legR].rotation.x += -0.2 * (1 - hop) * k;
      break;
    }
    case 'tanzen': {
      const b = t * 5.2;
      const s = Math.sin(b);
      hips.position.y += Math.abs(Math.cos(b)) * 0.06 * k;
      hips.rotation.z += 0.12 * s * k;
      hips.rotation.y += 0.22 * s * k;
      B[BH.chest].rotation.y += -0.32 * s * k;
      mix(B[BH.armL], -1.35 - 1.15 * Math.max(0, s), 0, 0.6);
      mix(B[BH.armR], -1.35 - 1.15 * Math.max(0, -s), 0, -0.6);
      B[BH.legL].rotation.x += -0.55 * Math.max(0, s) * k;
      B[BH.legR].rotation.x += -0.55 * Math.max(0, -s) * k;
      if (J) {
        B[J.shin[0]].rotation.x += 0.9 * Math.max(0, s) * k;
        B[J.shin[1]].rotation.x += 0.9 * Math.max(0, -s) * k;
      }
      B[BH.head].rotation.z += 0.1 * Math.sin(b * 2) * k;
      a.group.rotation.y = a.heading + Math.sin(t * 0.9) * 0.9 * k;
      break;
    }
    case 'sitzen': {
      // auf dem Boden sitzen, Knie angezogen, Arme um die Knie
      const rest = a.rest[BH.hips].y;
      hips.position.y -= Math.max(0, rest - (a.model.hipY || rest) * 0.3) * k;
      mix(B[BH.legL], -1.75, 0, 0.18);
      mix(B[BH.legR], -1.75, 0, -0.18);
      if (J) {
        mix(B[J.shin[0]], 2.05, 0, 0);
        mix(B[J.shin[1]], 2.05, 0, 0);
        mix(B[J.foot[0]], -0.3, 0, 0);
        mix(B[J.foot[1]], -0.3, 0, 0);
      }
      mix(B[BH.armL], -1.05, 0, -0.12);
      mix(B[BH.armR], -1.05, 0, 0.12);
      B[BH.chest].rotation.x += 0.22 * k;
      B[BH.head].rotation.x += -0.12 * k;
      mix(B[BH.cape], 1.25, 0, 0);
      break;
    }
    case 'verbeugen': {
      const kb = (t < 0.45 ? easeInOut3(t / 0.45) : t < 1.5 ? 1 : 1 - easeInOut3(Math.min(1, (t - 1.5) / 0.55))) * k;
      B[BH.chest].rotation.x += 0.78 * kb;
      hips.rotation.x += 0.12 * kb;
      B[BH.head].rotation.x += 0.28 * kb;
      B[BH.armR].rotation.set(-0.65 * kb, 0, 0.72 * kb);
      B[BH.armL].rotation.set(0.45 * kb, 0, -0.18 * kb);
      break;
    }
    case 'lachen': {
      const sh = Math.sin(t * 24);
      B[BH.chest].rotation.x += (-0.22 + 0.06 * sh) * k;
      B[BH.head].rotation.x += (-0.26 + 0.05 * sh) * k;
      hips.position.y += Math.abs(sh) * 0.012 * k;
      mix(B[BH.armL], -0.6, 0, -0.28);
      mix(B[BH.armR], -0.6, 0, 0.28);
      break;
    }
  }
}
if (typeof syncPlayer3 === 'function') {
  const _emSyncPlayer3 = syncPlayer3;
  // eslint-disable-next-line no-global-assign
  syncPlayer3 = function (p, dt) {
    const r = _emSyncPlayer3(p, dt);
    const A = p && !p.clone && p.emote ? emAktiv(p) : null;
    if (A) {
      try {
        const a = p.__k3 ? actors3.get(p.__k3) : null;
        if (a && a.model && a.model.family === 'human' && a.bones) emPose3(a, A);
      } catch (err) { /* nächstes Bild */ }
    }
    return r;
  };
}

// --- Emote-Menü am Chat --------------------------------------------------------------------------------------------
// Kleine Strichfiguren (24 × 24) als Zeichen der Gesten
const EM_ICON = {
  winken: '<circle cx="11" cy="5" r="2.2"/><path d="M11 7.6V14M11 14l-2.6 6M11 14l2.6 6M11 9.4l-3.6 3.2M11 9.4l4.4-4.6"/><path d="M17.4 2.6q1.4 1.2 0 2.8M19.4 1.6q2.2 2.2 0 4.8"/>',
  sitzen: '<circle cx="9" cy="5" r="2.2"/><path d="M9 7.6l1 6h6.4v6M9.8 9.6l4.4 2.6"/><path d="M4 20h17"/>',
  tanzen: '<circle cx="10" cy="5" r="2.2"/><path d="M10 7.6l1 6.4M11 14l-3.6 5.6M11 14l3.4 2.6-1 3.4M10.2 9.4L6 6.2M10.4 9.6l4.4 2"/><path d="M18 3.4v6.2"/><circle cx="16.8" cy="9.8" r="1.3"/><path d="M18 3.4l2.6-.8"/>',
  jubeln: '<circle cx="12" cy="6.4" r="2.2"/><path d="M12 9v6M12 15l-2.6 5.4M12 15l2.6 5.4M12 10.6L7.4 4.2M12 10.6l4.6-6.4"/><path d="M5 2.6l-1-1M19 2.6l1-1M12 2.2V1"/>',
  verbeugen: '<circle cx="18" cy="9.6" r="2.2"/><path d="M15.8 9.2L9.4 12.6M9.4 12.6v7.4M9.4 12.6l1 7.4M13.6 10.4l-.6 5.2M11.8 11.4l-1.6-3"/>',
  lachen: '<circle cx="12" cy="12" r="8.6"/><path d="M8 9.6q1.2-1.4 2.4 0M13.6 9.6q1.2-1.4 2.4 0"/><path d="M7.6 13h8.8q-.6 4.6-4.4 4.6T7.6 13z"/>'
};
const emIcon = (id) => `<svg viewBox="0 0 24 24" aria-hidden="true">${EM_ICON[id] || ''}</svg>`;
function emMenu(open) {
  const m = document.getElementById('emoteMenu');
  const b = document.getElementById('emoteBtn');
  if (!m) return;
  const show = open == null ? m.hidden : !!open;
  m.hidden = !show;
  if (b) b.setAttribute('aria-expanded', show ? 'true' : 'false');
}
(function emMenuBauen() {
  const box = document.getElementById('chatBox');
  if (!box || document.getElementById('emoteBtn')) return;
  const btn = document.createElement('button');
  btn.id = 'emoteBtn';
  btn.type = 'button';
  btn.className = 'chat-emote';
  btn.setAttribute('aria-label', 'Emotes');
  btn.setAttribute('aria-expanded', 'false');
  btn.title = 'Emotes';
  btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.4"/><path d="M8.4 14.2q3.6 3.6 7.2 0"/><circle class="e" cx="9.3" cy="10" r="1.1"/><circle class="e" cx="14.7" cy="10" r="1.1"/></svg>';
  const menu = document.createElement('div');
  menu.id = 'emoteMenu';
  menu.className = 'emote-menu';
  menu.hidden = true;
  menu.setAttribute('role', 'menu');
  menu.innerHTML = '<b class="em-titel">Emotes</b>' + EMOTES.map((e) => `<button type="button" role="menuitem" data-emote="${e.id}">${emIcon(e.id)}<span>${e.name}</span></button>`).join('');
  box.append(btn, menu);
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    emMenu();
  });
  menu.addEventListener('click', (e) => {
    e.stopPropagation();
    const b = e.target.closest('[data-emote]');
    if (b) emStart(b.dataset.emote);
  });
  // außerhalb tippen oder Escape schließt das Menü
  document.addEventListener('pointerdown', (e) => {
    if (!menu.hidden && !menu.contains(e.target) && e.target !== btn && !btn.contains(e.target)) emMenu(false);
  }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) emMenu(false); }, true);
  const st = document.createElement('style');
  st.textContent =
    '.chat-emote{position:absolute;top:34px;right:4px;width:26px;height:26px;display:grid;place-items:center;padding:0;border:0;border-radius:50%;' +
    'background:radial-gradient(circle at 40% 35%,#8a6a3a,#2a1e10);box-shadow:0 0 0 1.5px #120c08,0 0 0 2.5px #e0c070;pointer-events:auto;cursor:var(--zeiger-hand,pointer)}' +
    '.chat-emote svg{width:16px;height:16px;fill:rgba(255,236,190,.22);stroke:#fff3d6;stroke-width:1.6;stroke-linecap:round}.chat-emote svg .e{fill:#fff3d6;stroke:none}' +
    '#hud.touch .chat-emote{top:30px;width:22px;height:22px}#hud.touch .chat-emote svg{width:14px;height:14px}' +
    '#hud:not(.touch) .chat-emote{top:42px;width:32px;height:32px}#hud:not(.touch) .chat-emote svg{width:19px;height:19px}' +
    '#chatBox.open .chat-emote,#chatBox.open .emote-menu{display:none}' +
    '.emote-menu{position:absolute;left:0;bottom:calc(100% + 6px);z-index:6;display:grid;grid-template-columns:repeat(3,auto);gap:4px;padding:6px;border-radius:10px;' +
    'background:rgba(20,14,9,.94);border:1px solid rgba(201,163,90,.6);box-shadow:0 6px 18px rgba(0,0,0,.5);pointer-events:auto}' +
    '.emote-menu[hidden]{display:none}.emote-menu .em-titel{grid-column:1/-1;font-size:12px;color:#e8d29a;margin:0 2px 2px}' +
    '.emote-menu button{display:flex;flex-direction:column;align-items:center;gap:2px;min-width:58px;padding:5px 6px;border-radius:8px;border:1px solid rgba(255,255,255,.12);' +
    'background:rgba(255,255,255,.05);color:#f0e6cc;font:inherit;font-size:11px;cursor:var(--zeiger-hand,pointer)}' +
    '.emote-menu button:hover,.emote-menu button:focus-visible{border-color:#e0c070;background:rgba(224,192,112,.16)}' +
    '.emote-menu svg,.em-liste svg{width:26px;height:26px;fill:none;stroke:#fff3d6;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}' +
    '#hud.touch .emote-menu button{min-width:50px;padding:4px;font-size:10px}#hud.touch .emote-menu svg{width:22px;height:22px}' +
    '.em-liste{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:6px}' +
    '.em-zeile{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:9px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1)}' +
    '.em-zeile div{flex:1;min-width:0;display:flex;flex-direction:column}.em-zeile small{opacity:.75;font-size:11px}.em-hint{opacity:.75;font-size:12px;margin:0 0 8px}';
  document.head.appendChild(st);
})();

// --- Seite „Emotes“ in der Sammlung -------------------------------------------------------------------------------
function emHtml() {
  return '<p class="em-hint">Emotes zeigst du über den Knopf am Chat oder mit einem Befehl im Chat. Laufen beendet sie; Mitspieler sehen sie.</p><div class="em-liste">' +
    EMOTES.map((e) => `<div class="em-zeile">${emIcon(e.id)}<div><b>${e.name}</b><small>/${e.befehle[0]} · /${e.en}</small></div>` +
      `<button type="button" class="mini-btn" data-emzeig="${e.id}">Zeigen</button></div>`).join('') + '</div>';
}
function emBind(root) {
  root.querySelectorAll('[data-emzeig]').forEach((b) => b.addEventListener('click', () => {
    ui.closePanels();
    emStart(b.dataset.emzeig);
  }));
}
if (typeof SAMMLUNG_SEITEN !== 'undefined') SAMMLUNG_SEITEN.push({ id: 'emotes', label: 'Emotes', html: emHtml, bind: emBind });

// --- Ratgeber ----------------------------------------------------------------------------------------------------
if (typeof RATGEBER_WISSEN !== 'undefined') {
  RATGEBER_WISSEN.push({
    c: 'zusammen', q: 'Wie winke, tanze oder setze ich mich hin (Emotes)?',
    a: 'Tippe auf den kleinen Knopf mit dem Gesicht rechts am Chat – dort stehen alle Emotes: Winken, Sitzen, Tanzen, Jubeln, Verbeugen und Lachen. ' +
      'Im Chat gehen auch Befehle: <b>/winken</b>, <b>/sitzen</b>, <b>/tanzen</b>, <b>/jubeln</b>, <b>/verbeugen</b>, <b>/lachen</b> ' +
      '(oder kurz /wave, /sit, /dance, /cheer, /bow, /laugh). Mitspieler sehen deine Geste; sobald du läufst oder angreifst, hört sie auf.',
    k: 'emote emotes geste gesten winken sitzen hinsetzen tanzen jubeln verbeugen lachen wave sit dance cheer bow laugh befehl chat'
  });
}
