// Teilewandlerin (seit 14.86): eine Person nur in der letzten Stadt (Lichtwacht im Kristallabgrund, Map 10 – beide
// Seiten kommen dorthin). Sie nimmt Monster-Teile von schwachen Monstern (unter Stufe TW.maxLevel), die man unterwegs
// massenhaft aufhebt und später nicht mehr braucht, und macht daraus Teile für Ausrüstung ab Stufe 60:
//   je TW.rate Teile (beliebig gemischt) → 1 Teil für Göttlich (Lv 60), Abgründig (Lv 70) oder Ewig (Lv 80),
//   oder 1 Ätherkern (das Schmiede-Teil für Ausrüstung ab Stufe 45 ab +4, auch für die Lv-80-Teile).
// - Welche Teile sie nimmt, wählt man im Fenster an und ab (Antippen). Verbraucht wird von den schwächsten Monstern
//   zuerst. Teile, die nur Bosse fallen lassen, nimmt sie nie.
// - Schattenseite: Die Ziel-Teile sind die der eigenen Seite (matForSide, seiten.js).
// - Platz: wie die Ratgeberin (rgFreeAt in ratgeber.js) die nächste freie Stelle zu einem festen Punkt neben dem
//   Schmied der Stadt; feste Zahlen, alle Mitspieler sehen sie an derselben Stelle.

const TW = {
  id: 'wandler',
  name: 'Teilewandlerin Akane',
  map: 10,         // nur in der Stadt dieser Map
  maxLevel: 50,    // Teile von Monstern unter dieser Stufe nimmt sie
  rate: 10,        // so viele Teile für ein neues
  // [Gegenstandsstufe, Überschrift] – die Ziel-Teile sind UPGRADE_MAT_MONSTERS dieser Stufen
  tiers: [[7, 'Für Göttlich · Stufe 60'], [8, 'Für Abgründig · Stufe 70'], [9, 'Für Ewig · Stufe 80']],
  off: new Set()   // abgewählte Teile (nur solange das Spiel läuft)
};

// Teile, die nur ein Boss selbst fallen lässt – nie wandeln. (Die Teile für legendäre Endboss-Ausrüstung sind meist
// Teile normaler Monster der Map; die nimmt sie, man kann sie im Fenster aber abwählen.)
function twBossMats() {
  const s = new Set();
  for (const [id, t] of Object.entries(MONSTER_TYPES)) if (t.boss) s.add(id);
  return s;
}
// Teile, die sie nimmt: [{ id, n, level }] nach Stufe sortiert (schwächste zuerst)
function twSources(p) {
  const boss = twBossMats();
  return Object.entries(p.upmats || {})
    .filter(([id, n]) => n > 0 && MOB_MATS[id] && MONSTER_TYPES[id] && !boss.has(id) && MONSTER_TYPES[id].level < TW.maxLevel)
    .map(([id, n]) => ({ id, n, level: MONSTER_TYPES[id].level }))
    .sort((a, b) => a.level - b.level || a.id.localeCompare(b.id));
}
const twPool = (p) => twSources(p).filter((s) => !TW.off.has(s.id)).reduce((a, s) => a + s.n, 0);
// Ziel-Teile je Stufe (eigene Seite), ohne doppelte
function twTargets() {
  const seen = new Set();
  return TW.tiers.map(([tier, head]) => {
    const ids = [];
    for (const id of UPGRADE_MAT_MONSTERS[tier] || []) {
      const own = typeof matForSide === 'function' ? matForSide(id) : id;
      if (MOB_MATS[own] && !seen.has(own)) { seen.add(own); ids.push(own); }
    }
    return { head, ids };
  }).filter((g) => g.ids.length);
}
function twIsTarget(id) {
  if (id === 'aetherkern') return true;
  return twTargets().some((g) => g.ids.includes(id));
}

// count-mal wandeln (je TW.rate Teile) – gibt die Anzahl der neuen Teile zurück
function twConvert(target, count) {
  const p = game.player;
  if (!p || !twIsTarget(target)) return 0;
  count = Math.max(0, Math.min(count | 0, Math.floor(twPool(p) / TW.rate)));
  if (!count) return 0;
  let need = count * TW.rate;
  for (const s of twSources(p)) {
    if (!need) break;
    if (TW.off.has(s.id)) continue;
    const take = Math.min(s.n, need);
    p.upmats[s.id] -= take;
    if (!p.upmats[s.id]) delete p.upmats[s.id];
    need -= take;
  }
  if (target === 'aetherkern') {
    p.materials.aetherkern = (p.materials.aetherkern || 0) + count;
    ui.loot(matDef('aetherkern').name, count, materialIconUrl('aetherkern'), MATERIAL_COLORS.aetherkern);
  } else {
    p.upmats[target] = (p.upmats[target] || 0) + count;
    ui.loot(MOB_MATS[target].name, count, mobMatIconUrl(target), MOB_MATS[target].color);
  }
  try { sfx.success(); } catch (e) { /* ohne Ton */ }
  if (typeof saveGame === 'function') saveGame();
  return count;
}

// --- Fenster ---------------------------------------------------------------------------------------------------
function twCss() {
  if (document.getElementById('twCss')) return;
  const st = document.createElement('style');
  st.id = 'twCss';
  st.textContent = `
.tw { display: flex; flex-direction: column; gap: 8px; }
.tw p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.35; }
.tw h3 { margin: 6px 0 0; font-size: 15px; }
.tw h3 small { font-weight: 400; color: var(--muted); font-size: 12px; }
.tw-pool { display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,.28); border: 1px solid rgba(201,162,74,.35); border-radius: 8px; padding: 7px 10px; }
.tw-pool b { font-size: 22px; color: #f3e3b5; }
.tw-pool span { font-size: 13px; color: var(--muted); }
.tw-src .mat-tile { cursor: pointer; font: inherit; color: inherit; text-align: left; }
.tw-src .mat-tile.off { opacity: .35; filter: grayscale(.8); }
.tw-src .mat-tile.off span::after { content: ' · aus'; color: #ff9a8a; }
.tw-tgt { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 6px; }
.tw-row { display: grid; grid-template-columns: 34px 1fr auto; column-gap: 7px; align-items: center; background: rgba(0,0,0,.25);
  border: 1px solid rgba(201,162,74,.3); border-radius: 8px; padding: 5px 7px; }
.tw-row img { width: 34px; height: 34px; }
.tw-row div { display: flex; flex-direction: column; min-width: 0; }
.tw-row b { font-size: 13px; color: #f3e3b5; }
.tw-row small { font-size: 11px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tw-row small i { font-style: normal; color: #f3e3b5; }
.tw-row .tw-btns { display: flex; flex-direction: row; gap: 4px; }
.tw-msg { color: #b8f0a0; font-size: 13px; min-height: 1em; }`;
  document.head.appendChild(st);
}

function twRender(msg) {
  const p = game.player;
  const body = $('npcBody');
  if (!p || !body) return;
  twCss();
  const fmt = (n) => (n || 0).toLocaleString('de-DE');
  const src = twSources(p);
  const pool = twPool(p);
  const can = Math.floor(pool / TW.rate);
  const srcHtml = src.length
    ? `<div class="mat-tiles tw-src">` + src.map((s) =>
      `<button type="button" class="mat-tile${TW.off.has(s.id) ? ' off' : ''}" data-tw-src="${s.id}" title="Antippen: ${TW.off.has(s.id) ? 'wieder geben' : 'behalten'}">` +
      `<img src="${mobMatIconUrl(s.id)}" alt=""><b>${fmt(s.n)}</b><span>${MOB_MATS[s.id].name} · Lv ${s.level}</span></button>`).join('') + `</div>`
    : `<p>Du hast gerade keine Teile von Monstern unter Stufe ${TW.maxLevel}.</p>`;
  const row = (id, icon, name, have, sub) =>
    `<div class="tw-row"><img src="${icon}" alt=""><div><b>${name}</b><small>${sub}</small><small>du hast <i>${fmt(have)}</i></small></div>` +
    `<span class="tw-btns">` +
    `<button type="button" class="mini-btn" data-tw-to="${id}" data-n="1" ${can >= 1 ? '' : 'disabled'}>1×</button>` +
    `<button type="button" class="mini-btn" data-tw-to="${id}" data-n="5" ${can >= 5 ? '' : 'disabled'}>5×</button>` +
    `<button type="button" class="mini-btn" data-tw-to="${id}" data-n="max" ${can >= 2 ? '' : 'disabled'}>Alle</button></span></div>`;
  const tgtHtml = twTargets().map((g) =>
    `<h3>${g.head}</h3><div class="tw-tgt">` +
    g.ids.map((id) => {
      const t = MONSTER_TYPES[id];
      return row(id, mobMatIconUrl(id), MOB_MATS[id].name, p.upmats[id] || 0, t ? `von ${t.name} (Lv ${t.level})` : '');
    }).join('') + `</div>`).join('') +
    `<h3>Schmiede-Teil <small>für Ausrüstung ab Stufe 45 ab +4, auch Stufe 80</small></h3><div class="tw-tgt">` +
    row('aetherkern', materialIconUrl('aetherkern'), matDef('aetherkern').name, p.materials.aetherkern || 0, 'seltenes Schmiede-Teil') + `</div>`;
  body.innerHTML =
    `<div class="tw">` +
    `<p>„Die vielen Zähne, Felle und Abzeichen aus den ersten Gebieten brauchst du hier oben nicht mehr. Gib mir je <b>${TW.rate}</b> davon – ` +
    `ganz gleich welche – und ich mache dir <b>eins</b> der Teile, die der Schmied für die starke Ausrüstung will.“</p>` +
    `<div class="tw-pool"><b>${fmt(pool)}</b><span>Teile zum Wandeln (von Monstern unter Stufe ${TW.maxLevel})<br>` +
    `reicht für <b>${fmt(can)}</b> neue${can === 1 ? 's' : ''} Teil${can === 1 ? '' : 'e'}</span></div>` +
    `<h3>Deine Teile <small>Antippen: behalten oder geben · die schwächsten gehen zuerst</small></h3>` + srcHtml +
    tgtHtml +
    `<div class="tw-msg">${msg || ''}</div></div>`;
  body.querySelectorAll('[data-tw-src]').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.twSrc;
    if (TW.off.has(id)) TW.off.delete(id); else TW.off.add(id);
    twRender();
  }));
  body.querySelectorAll('[data-tw-to]').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.twTo;
    const max = Math.floor(twPool(game.player) / TW.rate);
    const n = b.dataset.n === 'max' ? max : Number(b.dataset.n);
    const got = twConvert(id, n);
    const name = id === 'aetherkern' ? matDef('aetherkern').name : MOB_MATS[id].name;
    twRender(got ? `Fertig: ${got} × ${name} für ${got * TW.rate} alte Teile.` : 'Dafür reichen deine Teile nicht.');
  }));
}

// --- In die Welt -----------------------------------------------------------------------------------------------
// Startpunkt: neben dem Schmied der Stadt, dann die nächste freie Stelle (rgFreeAt aus ratgeber.js)
function twPlace(w) {
  const sm = townPlace(TW.map, 'schmied');
  if (!sm) return null;
  const S = { x: sm.x + (sm.stand === 'e' ? -2.6 : 2.6), y: sm.y + 2.2 };
  const props = w.props.filter((pr) => Math.abs(pr.x / TILE - S.x) < 12 && Math.abs(pr.y / TILE - S.y) < 12);
  const free = typeof rgFreeAt === 'function' ? rgFreeAt : () => true;
  const wm = WORLD_MAPS.find((m) => m.id === TW.map);
  for (let r = 0; r <= 10; r += 0.5) {
    const steps = r ? Math.max(8, Math.round(r * 8)) : 1;
    for (let k = 0; k < steps; k++) {
      const a = (k / steps) * Math.PI * 2;
      const x = Math.round((S.x + Math.cos(a) * r) * 20) / 20;
      const y = Math.round((S.y + Math.sin(a) * r) * 20) / 20;
      // in der Stadt bleiben (nicht über die Mauer hinaus)
      if (wm && Math.hypot(x - wm.cx, y - wm.cy) > 17) continue;
      if (free(w, x, y, props)) return { x, y };
    }
  }
  return S;
}
const _twGenerateWorld = generateWorld;
generateWorld = function () {
  const w = _twGenerateWorld.apply(this, arguments);
  try {
    const at = twPlace(w);
    if (at) w.npcs.push({ id: TW.id, name: TW.name, x: at.x * TILE, y: at.y * TILE, r: 11, restYaw: 0.4 });
  } catch (e) {
    console.warn('Teilewandlerin: kein Platz gefunden', e);
  }
  return w;
};

// --- Aussehen: Alchemistin in dunkelvioletter Robe mit Kristall-Akzenten, kurzes silbernes Haar, Mörser (2D) ---
NPC_ART[TW.id] = (ctx) => villagerArt(ctx, {
  skin: '#f0cfae', boots: '#241a28', robe: '#4a2a6a', torso: '#4a2a6a', sleeve: '#4a2a6a', cuff: '#7fe0d0', wideSleeves: true, eyes: { blush: true },
  body: (ctx, half) => {
    poly(ctx, [[-5, -25], [0, -19], [5, -25], [3, -26], [0, -22], [-3, -26]], '#7fe0d0');
    box(ctx, -half, -12.8, half * 2, 2.6, 1, '#2a1a30');
    dot(ctx, 0, -11.5, 1.6, 1.6, '#7fe0d0');
  },
  head: (ctx, cx, cy) => {
    hairCap(ctx, cx, cy, '#d8dce8', 11);
    dot(ctx, cx + 6, cy - 7, 1.8, 1.8, '#7fe0d0');
  },
  extra: (ctx) => {
    // Mörser mit leuchtendem Inhalt vor dem Bauch
    poly(ctx, [[-6, -13], [6, -13], [4.5, -6], [-4.5, -6]], '#6a6470');
    oval(ctx, 0, -13, 6, 1.6, '#7fe0d0');
    stroke(ctx, '#b8b0a0', 1.4, [[2, -18], [-1, -12]]);
  }
});
NPC3[TW.id] = {
  skin: '#f0cfae', robe: '#4a2a6a', torso: '#4a2a6a', sleeve: '#4a2a6a', pants: '#2a1a30', boots: '#241a28',
  hemTrim: '#7fe0d0', cuff: '#7fe0d0', collar: '#7fe0d0', wideSleeves: true, female: true,
  hair: { style: 1, color: '#d8dce8' }, sash: '#7fe0d0', belt: '#2a1a30', beads: '#7fe0d0', earrings: '#7fe0d0',
  weapon: { kind: 'rod', tier: 4 }, eyeShape: 2
};
NPC_TALK_LABEL[TW.id] = 'Wandeln';
NPC_LINES[TW.id] = ['Alte Teile? Gib her – ich mache etwas Brauchbares daraus.'];
// Zeichen über dem Kopf (wie die Händler): ein Kristall
NPC_ICONS[TW.id] = (ctx) => {
  poly(ctx, [[0, -9], [6, -2], [0, 9], [-6, -2]], '#7fe0d0');
  poly(ctx, [[0, -9], [6, -2], [0, 0]], '#c8fff4');
  poly(ctx, [[-6, -2], [0, 0], [0, 9]], '#3aa89a');
};

// Ins NPC-Fenster einhängen
const _twOpenNpc = ui.openNpc;
ui.openNpc = function (npc) {
  const r = _twOpenNpc.call(this, npc);
  if (npc && npc.id === TW.id) twRender();
  return r;
};
