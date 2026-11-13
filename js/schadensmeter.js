// Schadensanzeige / Damage-Meter (seit 14.32, Einstellungen → Figur und Spiel). Kleines Fenster mit Spieler, Schaden,
// DPS und Anteil – für die eigene Figur und die Gruppe, getrennt nach „Begegnung“ (der laufende bzw. letzte Kampf) und
// „Dungeon“ (alles seit dem Betreten des Dungeons; draußen „Gebiet“ = die aktuelle Map).
//
// Woher die Zahlen kommen (es gibt keinen Spielserver, die Monster rechnet der Host des Kanals, netz.js):
// - Gezählt wird nur in damageMonster beim Host bzw. allein – also Schaden, der dem Monster wirklich Leben abzieht:
//   ohne Überkill (höchstens das restliche Leben), ohne Treffer auf versiegelte Bosse/Kristallschild, ohne PvP
//   (Duell und Turnierarena laufen über pvpHit/duelHit und kommen nie bei damageMonster an).
// - Diener (Skelette, Hunde, Drachen, Geister) zählen für ihren Besitzer: beim Host über opts.ally, beim Mitspieler
//   laufen ihre Treffer ohnehin als seine Treffer zum Host.
// - Schaden über Zeit (Gift, Brand, Blutung, Gift aus der Ausrüstung) zählt für den, der ihn gesetzt hat (d.by in
//   tickDots) – vorher hätte der letzte Angreifer ihn bekommen. Jeder Tick läuft genau einmal beim Host.
// - Ein Mitspieler zählt seine eigenen Treffer NICHT selbst: der Host schickt ihm jede Sekunde seine bestätigte Summe
//   ({t:'dm'}), daraus entstehen die Zuwächse. Neuer Host oder neue Verbindung = neue Kennung (e), die Summe beginnt neu.
// - Gruppe: Jeder schickt seine bestätigten Zuwächse alle 2 s an die Gruppenmitglieder (netSocial, k 'dm', mit seinem
//   Bereich). Angenommen wird nur von Mitgliedern der eigenen Gruppe und nur im selben Bereich (Map/Dungeon).
// Eine Begegnung endet nach DM_IDLE Sekunden ohne Schaden (einstellbar); die nächste beginnt mit dem nächsten Treffer.
// Seit 14.92 dazu: „Gesamt“ (läuft weiter, bis man sie zurücksetzt – auch über Gebiete, Dungeons und Neuladen hinweg)
// und „Bosse“ (je Boss bzw. Seelenstein eine eigene Messung: läuft, solange ein angeschlagener Boss/Stein in der Nähe
// ist; die letzten DM_BOSS_MAX bleiben gespeichert). Zahnrad im Kopf: Einstellungen und Zurücksetzen. Gesamt, Bosse,
// Dungeon/Gebiet und die Einstellungen liegen je Charakter im Gerät (DM_DATA_KEY) und überstehen das Neuladen.
// DPS = Schaden / Kampfzeit der Begegnung (für alle Spieler dasselbe Zeitfenster); im Dungeon / Gebiet Schaden /
// Summe der Kampfzeiten dort.

const DM_KEY = 'seelenstein.dmeter';
const DM_DATA_KEY = 'seelenstein.dmeter.daten';
const DM_BOSS_MAX = 8;
const DM_BOSS_GONE = 10; // s: so lange ohne angeschlagenen Boss/Stein in der Nähe, dann ist dessen Messung zu Ende
const DMETER = {
  enc: null,       // { start, last, rows: Map(name -> row), total }
  dgn: null,       // { area, start, combat, lastT, rows, total }
  tot: null,       // { start, combat, lastT, rows, total }  – Gesamt, bis zum Zurücksetzen
  boss: [],        // [{ id, name, lvl, stone, start, combat, lastT, seen, rows, total, done }] – neueste zuerst
  bossSel: 0,      // gewählte Boss-Messung (Index)
  view: 'enc',     // enc | dgn | tot | boss
  open: true,      // ausgeklappt (am Handy standardmäßig eingeklappt)
  cfg: false,      // Einstellungen offen
  idle: 6,         // s ohne Schaden, dann endet die Begegnung
  autoArea: true,  // Dungeon/Gebiet beim Betreten neu beginnen
  pos: null,       // { x, y } verschoben
  ep: null,        // Kennung der Summe vom Host (Mitspieler)
  hostTot: 0,
  out: 0,          // eigene, noch nicht an die Gruppe geschickte Zuwächse
  el: null,
  html: '',
  who: null,       // Charakter, dem die gespeicherten Messungen gehören
  dirty: false
};
const DM_VIEWS = ['enc', 'dgn', 'tot', 'boss'];
(() => {
  try {
    const s = JSON.parse(localStorage.getItem(DM_KEY) || '{}');
    if (DM_VIEWS.includes(s.view)) DMETER.view = s.view;
    DMETER.open = typeof s.open === 'boolean' ? s.open : IS_PC;
    if ([4, 6, 10, 15].includes(s.idle)) DMETER.idle = s.idle;
    if (typeof s.autoArea === 'boolean') DMETER.autoArea = s.autoArea;
    if (s.pos && Number.isFinite(s.pos.x) && Number.isFinite(s.pos.y)) DMETER.pos = s.pos;
  } catch (e) { DMETER.open = IS_PC; }
})();
function dmeterStore() {
  try { localStorage.setItem(DM_KEY, JSON.stringify({ view: DMETER.view, open: DMETER.open, pos: DMETER.pos, idle: DMETER.idle, autoArea: DMETER.autoArea })); } catch (e) { /* privat */ }
}

// --- Messungen speichern (je Charakter) ---------------------------------------------------------------------------
// Zeiten werden als Kampfzeit (combat) gespeichert, nicht als Uhrzeit: nach dem Neuladen geht es nahtlos weiter.
const dmPack = (w) => w && { combat: w.combat, total: w.total, area: w.area, name: w.name, lvl: w.lvl, stone: w.stone, id: w.id, done: true,
  rows: [...w.rows.values()].map((r) => [r.name, r.cls, Math.round(r.dmg)]) };
function dmUnpack(o) {
  if (!o || !Array.isArray(o.rows)) return null;
  const rows = new Map();
  for (const [name, cls, dmg] of o.rows) if (typeof name === 'string' && dmg > 0) rows.set(name, { name, cls, dmg: Number(dmg) || 0 });
  return { start: 0, combat: Number(o.combat) || 0, lastT: -1e9, total: Number(o.total) || 0, rows, area: o.area, name: o.name, lvl: o.lvl,
    stone: !!o.stone, id: o.id, done: true, seen: -1e9 };
}
function dmSaveAll() {
  if (!DMETER.who) return;
  try {
    const all = JSON.parse(localStorage.getItem(DM_DATA_KEY) || '{}');
    all[DMETER.who] = { tot: dmPack(DMETER.tot), dgn: dmPack(DMETER.dgn), boss: DMETER.boss.slice(0, DM_BOSS_MAX).map(dmPack), at: Date.now() };
    // nur die zuletzt gespielten Charaktere behalten
    const keys = Object.keys(all).sort((a, b) => (all[b].at || 0) - (all[a].at || 0));
    for (const k of keys.slice(8)) delete all[k];
    localStorage.setItem(DM_DATA_KEY, JSON.stringify(all));
  } catch (e) { /* voll oder privat */ }
  DMETER.dirty = false;
}
function dmLoadFor(who) {
  DMETER.who = who;
  DMETER.enc = null; DMETER.dgn = null; DMETER.tot = null; DMETER.boss = []; DMETER.bossSel = 0;
  try {
    const d = (JSON.parse(localStorage.getItem(DM_DATA_KEY) || '{}') || {})[who];
    if (!d) return;
    DMETER.tot = dmUnpack(d.tot);
    DMETER.dgn = dmUnpack(d.dgn);
    DMETER.boss = (d.boss || []).map(dmUnpack).filter(Boolean);
  } catch (e) { /* kaputt: neu beginnen */ }
}

const dmNow = () => performance.now() / 1000;
const dmArea = () => (game.player ? areaKey(game.player.x, game.player.y) : -1);
function dmAreaName(a) {
  if (a >= 100) { const d = DUNGEONS[a - 100]; return d ? d.name : 'Dungeon'; }
  const wm = WORLD_MAPS.find((w) => w.id === a);
  return wm ? wm.name : '';
}

// Charakter gewechselt: dessen gespeicherte Messungen laden. Bereich gewechselt: neuer Zeitraum „Dungeon/Gebiet“
// (außer man hat das in den Einstellungen abgeschaltet); die Begegnung endet mit.
function dmCheckArea() {
  const p = game.player;
  if (!p) return;
  const who = p.name + '|' + p.classId;
  if (DMETER.who !== who) { dmSaveAll(); dmLoadFor(who); }
  const a = dmArea();
  if (!DMETER.tot) DMETER.tot = dmWin();
  if (DMETER.dgn && (DMETER.dgn.area === a || (!DMETER.autoArea && DMETER.dgn.area != null))) return;
  DMETER.dgn = Object.assign(dmWin(), { area: a });
  DMETER.enc = null;
  DMETER.dirty = true;
}
const dmWin = () => ({ start: dmNow(), combat: 0, lastT: -1e9, rows: new Map(), total: 0 });

// Kampfzeit eines langen Zeitraums: Lücken über der Begegnungsgrenze zählen nicht, jeder neue Kampf mindestens 1 s
function dmTick(w, t) {
  w.combat += t - w.lastT <= DMETER.idle ? t - w.lastT : 1;
  w.lastT = t;
}
function dmRow(w, name, cls, amount) {
  let r = w.rows.get(name);
  if (!r) w.rows.set(name, r = { name, cls, dmg: 0 });
  r.dmg += amount;
  if (cls) r.cls = cls;
  w.total += amount;
}

// Boss oder Seelenstein in der Nähe, der gerade bekämpft wird (angeschlagen, lebt)
const dmBig = (m) => m && !m.dead && (m.isStone || (m.type && (m.type.boss || m.type.raidBoss || m.type.raid)));
function dmBossNow(t) {
  const p = game.player;
  let best = null;
  let bd = 1e9;
  for (const m of game.monsters) {
    if (!dmBig(m) || !(m.hp < m.maxHp)) continue;
    const d = Math.hypot(m.x - p.x, m.y - p.y);
    if (d < 620 && d < bd) { bd = d; best = m; }
  }
  let cur = DMETER.boss[0] && !DMETER.boss[0].done ? DMETER.boss[0] : null;
  if (cur && (!best || best.id !== cur.id) && t - cur.seen > (best ? 0 : DM_BOSS_GONE)) { cur.done = true; cur = null; DMETER.dirty = true; }
  if (best && !cur) {
    cur = Object.assign(dmWin(), { id: best.id, name: best.name || (best.type && best.type.name) || 'Boss', lvl: best.level, stone: !!best.isStone, seen: t, done: false });
    DMETER.boss.unshift(cur);
    DMETER.boss.length = Math.min(DMETER.boss.length, DM_BOSS_MAX);
    if (DMETER.view === 'boss') DMETER.bossSel = 0;
  }
  if (cur && best && best.id === cur.id) cur.seen = t;
  return cur;
}

// Schaden eintragen (name = Spieler, cls = Klasse für die Farbe)
function dmeterAdd(name, cls, amount) {
  if (!(amount > 0) || !game.player) return;
  const t = dmNow();
  dmCheckArea();
  let e = DMETER.enc;
  if (!e || t - e.last > DMETER.idle) e = DMETER.enc = { start: t, last: t, rows: new Map(), total: 0 };
  e.last = t;
  dmRow(e, name, cls, amount);
  const b = dmBossNow(t);
  for (const w of [DMETER.dgn, DMETER.tot, b]) {
    if (!w) continue;
    if (w.__t !== t) { dmTick(w, t); w.__t = t; }
    dmRow(w, name, cls, amount);
  }
  DMETER.dirty = true;
}

// Eigener bestätigter Schaden: eintragen und für die Gruppe vormerken
function dmeterOwn(amount) {
  const p = game.player;
  if (!p || !(amount > 0)) return;
  dmeterAdd(p.name, p.classId, amount);
  DMETER.out += amount;
}

// Beim Host bzw. allein aus damageMonster: wirklich abgezogenes Leben, src = Verursacher
function dmeterHost(src, amount) {
  if (!src || !(amount > 0)) return;
  if (src === game.player || (src.ally && !src.remote)) dmeterOwn(amount);
  else if (src.remote && !src.gone) {
    if (!src.dmEp) src.dmEp = Math.random().toString(36).slice(2, 8);
    src.dmTot = (src.dmTot || 0) + amount;
  }
}

// Beim Mitspieler: bestätigte Summe vom Host
function dmeterConfirmed(d) {
  const a = Number(d && d.a);
  if (!Number.isFinite(a) || a < 0) return;
  let delta;
  if (d.e !== DMETER.ep) {
    DMETER.ep = d.e;
    delta = a;
  } else delta = a - DMETER.hostTot;
  DMETER.hostTot = a;
  if (delta > 0) dmeterOwn(delta);
}

// Zuwachs eines Gruppenmitglieds (nur eigene Gruppe, nur selber Bereich)
function dmeterParty(pid, d) {
  const rp = net.players.get(pid);
  const amount = Number(d && d.d);
  if (!rp || rp.gone || !inMyParty(rp.name)) return;
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e10) return;
  if (d.a !== dmArea()) return;
  dmeterAdd(rp.name, rp.classId, amount);
}

// Host: jedem Mitspieler seine bestätigte Summe (nur bei Änderung); alle: eigene Zuwächse an die Gruppe
let dmPartyAt = 0;
function dmeterNetTick() {
  if (net.mode === 'host') {
    for (const [id, rp] of net.players) {
      if (!rp.dmTot || rp.dmTot === rp.dmSent) continue;
      rp.dmSent = rp.dmTot;
      netSendTo(id, { t: 'dm', a: Math.round(rp.dmTot), e: rp.dmEp });
    }
  }
  const t = dmNow();
  if (t - dmPartyAt < 2 || !(DMETER.out > 0)) return;
  dmPartyAt = t;
  const party = game.party;
  const amount = Math.round(DMETER.out);
  DMETER.out = 0;
  if (!netOnline() || !party || party.members.length < 2 || !game.player) return;
  const a = dmArea();
  for (const n of party.members) {
    if (n === game.player.name) continue;
    const x = onlinePlayer(n);
    if (x) netSocial(x.pid, { k: 'dm', d: amount, a });
  }
}

// --- Anzeige ------------------------------------------------------------------------------------------------------
function dmNum(n) {
  if (n >= 1e6) return (Math.round(n / 1e5) / 10).toLocaleString('de-DE') + ' Mio.';
  return Math.round(n).toLocaleString('de-DE');
}
function dmTime(s) {
  s = Math.round(s);
  return s >= 60 ? Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') + ' min' : s + ' s';
}

const DM_TAB = { enc: 'Kampf', dgn: 'Gebiet', tot: 'Gesamt', boss: 'Bosse' };
function dmCur() {
  const v = DMETER.view;
  if (v === 'enc') return DMETER.enc;
  if (v === 'dgn') return DMETER.dgn;
  if (v === 'tot') return DMETER.tot;
  return DMETER.boss[Math.min(DMETER.bossSel, DMETER.boss.length - 1)] || null;
}
function dmDur(w) {
  if (!w) return 0;
  if (DMETER.view === 'enc') return Math.max(1, w.last - w.start);
  return Math.max(1, w.combat);
}

function dmCfgHtml() {
  const sel = (v) => (DMETER.idle === v ? ' class="on"' : '');
  return `<div class="dm-cfg"><b>Einstellungen</b>` +
    `<label class="dm-opt"><input type="checkbox" data-dmauto="1"${DMETER.autoArea ? ' checked' : ''}> Dungeon/Gebiet beim Betreten neu beginnen</label>` +
    `<div class="dm-opt">Kampf endet nach <span class="dm-seg">${[4, 6, 10, 15].map((v) => `<button type="button" data-dmidle="${v}"${sel(v)}>${v} s</button>`).join('')}</span></div>` +
    `<p class="dm-hint">„Gesamt“ zählt weiter, bis du es zurücksetzt – auch über Dungeons, Gebiete und Neuladen hinweg. „Bosse“ misst jeden Boss und Seelenstein einzeln (die letzten ${DM_BOSS_MAX} bleiben gespeichert).</p>` +
    `<div class="dm-btns"><button type="button" data-dmclr="enc">Kampf</button><button type="button" data-dmclr="dgn">Gebiet</button>` +
    `<button type="button" data-dmclr="tot">Gesamt</button><button type="button" data-dmclr="boss">Bosse</button></div>` +
    `<div class="dm-btns"><button type="button" class="dm-all" data-dmclr="all">Alles zurücksetzen</button><button type="button" data-dmcfg="1">Fertig</button></div></div>`;
}

function dmeterHtml() {
  const v = DMETER.view;
  const w = dmCur();
  const t = dmNow();
  const dur = dmDur(w);
  const live = v === 'enc' && w && t - w.last <= DMETER.idle;
  const a = DMETER.dgn ? DMETER.dgn.area : dmArea();
  const tabName = (k) => (k === 'dgn' ? (a >= 100 ? 'Dungeon' : 'Gebiet') : DM_TAB[k]);
  const tabs = '<div class="dm-tabs" role="tablist">' + DM_VIEWS.map((k) =>
    `<button type="button" role="tab" data-dmv="${k}" class="${v === k ? 'on' : ''}" aria-selected="${v === k}">${tabName(k)}</button>`).join('') + '</div>';
  const rows = w ? [...w.rows.values()].sort((x, y) => y.dmg - x.dmg) : [];
  const me = game.player ? game.player.name : '';
  const top = rows.length ? rows[0].dmg : 1;
  const sumDps = w ? w.total / dur : 0;
  const head = `<div class="dm-head" data-dmdrag="1"><button type="button" class="dm-fold" data-dmfold="1" aria-expanded="${DMETER.open}" aria-label="Schadensanzeige ein- oder ausklappen">${DMETER.open ? '▾' : '▸'}</button>` +
    `<b class="dm-title">Schaden</b><span class="dm-sum">${w ? dmNum(sumDps) : '0'} <small>DPS</small></span>` +
    (DMETER.open ? `<button type="button" class="dm-gear${DMETER.cfg ? ' on' : ''}" data-dmcfg="1" aria-label="Einstellungen der Schadensanzeige">⚙</button>` : '') + '</div>';
  if (!DMETER.open) return head;
  if (DMETER.cfg) return head + `<div class="dm-body">${dmCfgHtml()}</div>`;
  let body = tabs;
  if (v === 'boss' && DMETER.boss.length) {
    body += '<div class="dm-bosses">' + DMETER.boss.map((b, k) =>
      `<button type="button" data-dmboss="${k}" class="${k === Math.min(DMETER.bossSel, DMETER.boss.length - 1) ? 'on' : ''}${b.done ? '' : ' live'}" title="${escapeHtml(b.name)}">${b.stone ? '◆' : '☠'} ${escapeHtml(b.name)}</button>`).join('') + '</div>';
  }
  let label;
  if (v === 'enc') label = live ? 'Kampf läuft' : w ? 'Letzter Kampf' : 'Noch kein Kampf';
  else if (v === 'dgn') label = dmAreaName(a);
  else if (v === 'tot') label = 'Seit dem letzten Zurücksetzen';
  else label = w ? (w.done ? 'Beendet' : 'Kampf läuft') + (w.lvl ? ` · Stufe ${w.lvl}` : '') : 'Noch kein Boss oder Seelenstein';
  body += `<div class="dm-sub"><span>${escapeHtml(label)}</span>` +
    `<span>${w ? dmTime(dur) : ''}<button type="button" class="dm-reset" data-dmclr="${v}">Zurücksetzen</button></span></div>`;
  if (!rows.length) body += '<p class="dm-empty">Noch kein Schaden.</p>';
  else {
    body += '<ol class="dm-rows">' + rows.slice(0, 8).map((r, k) => {
      const share = w.total ? Math.round(r.dmg / w.total * 100) : 0;
      const col = (CLASSES[r.cls] && CLASSES[r.cls].color) || '#8a7a5a';
      return `<li class="${r.name === me ? 'me' : ''}"><i class="dm-bar" style="width:${Math.max(2, r.dmg / top * 100).toFixed(1)}%;background:${col}"></i>` +
        `<span class="dm-n no-tr">${k + 1}. ${escapeHtml(r.name)}</span><span class="dm-v">${dmNum(r.dmg)}</span><span class="dm-d">${dmNum(r.dmg / dur)}</span><span class="dm-p">${share} %</span></li>`;
    }).join('') + '</ol>';
    body += `<div class="dm-cols"><span>Spieler</span><span>Schaden</span><span>DPS</span><span>Anteil</span></div>`;
    body += `<small class="dm-foot">${rows.length > 1 ? 'Gruppe gesamt' : 'Gesamt'}: ${dmNum(w.total)}</small>`;
  }
  return head + `<div class="dm-body">${body}</div>`;
}

// Zurücksetzen: eine Ansicht oder alles
function dmClear(what) {
  if (what === 'enc' || what === 'all') DMETER.enc = null;
  if (what === 'dgn' || what === 'all') DMETER.dgn = null;
  if (what === 'tot' || what === 'all') DMETER.tot = null;
  if (what === 'boss' || what === 'all') { DMETER.boss = []; DMETER.bossSel = 0; }
  dmCheckArea();
  dmSaveAll();
}

function dmeterPlace() {
  const el = DMETER.el;
  if (!el || !DMETER.pos) return;
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  const x = Math.max(4, Math.min(window.innerWidth - w - 4, DMETER.pos.x));
  const y = Math.max(4, Math.min(window.innerHeight - Math.min(h, 40) - 4, DMETER.pos.y));
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.style.right = 'auto';
  el.style.bottom = 'auto';
}

function dmeterBuild() {
  const el = document.createElement('section');
  el.id = 'dmeter';
  el.className = 'dmeter';
  el.setAttribute('aria-label', 'Schadensanzeige');
  el.hidden = true;
  document.body.append(el);
  DMETER.el = el;
  el.addEventListener('pointerdown', (e) => e.stopPropagation());
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.dmv) { DMETER.view = b.dataset.dmv; DMETER.bossSel = 0; dmeterStore(); }
    else if (b.dataset.dmfold) { DMETER.open = !DMETER.open; if (!DMETER.open) DMETER.cfg = false; dmeterStore(); }
    else if (b.dataset.dmcfg) DMETER.cfg = !DMETER.cfg;
    else if (b.dataset.dmidle) { DMETER.idle = Number(b.dataset.dmidle) || 6; dmeterStore(); }
    else if (b.dataset.dmboss) DMETER.bossSel = Number(b.dataset.dmboss) || 0;
    else if (b.dataset.dmclr) {
      const what = b.dataset.dmclr;
      if (what !== 'all' || window.confirm('Alle Messungen der Schadensanzeige zurücksetzen?')) dmClear(what);
    }
    dmeterRender(true);
  });
  el.addEventListener('change', (e) => {
    const c = e.target.closest('[data-dmauto]');
    if (!c) return;
    DMETER.autoArea = !!c.checked;
    dmeterStore();
    dmeterRender(true);
  });
  // Verschieben am Kopf (Maus und Finger); kurzes Antippen klappt nicht ein, dafür ist der Pfeil da
  let drag = null;
  el.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('[data-dmdrag]') || e.target.closest('button')) return;
    const r = el.getBoundingClientRect();
    drag = { id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top };
    el.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  el.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    DMETER.pos = { x: Math.round(e.clientX - drag.dx), y: Math.round(e.clientY - drag.dy) };
    dmeterPlace();
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    dmeterStore();
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  window.addEventListener('resize', dmeterPlace);
}

function dmeterRender(force) {
  const show = !!(opts.dmeter && game.running && game.player);
  if (!DMETER.el) { if (!show) return; dmeterBuild(); }
  const el = DMETER.el;
  if (el.hidden !== !show) el.hidden = !show;
  if (!show) return;
  el.classList.toggle('folded', !DMETER.open);
  const html = dmeterHtml();
  if (!force && html === DMETER.html) return;
  DMETER.html = html;
  el.innerHTML = html;
  dmeterPlace();
}
// Einstellung umgeschaltet
function dmeterApply() { dmeterRender(true); }

// gespeicherte Messungen: alle 5 s (wenn sich etwas geändert hat) und beim Verlassen
let dmSavedAt = 0;
window.addEventListener('pagehide', () => { if (DMETER.dirty) dmSaveAll(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && DMETER.dirty) dmSaveAll(); });
setInterval(() => {
  try {
    if (!game.player) return;
    if (game.running) { dmCheckArea(); dmBossNow(dmNow()); }
    if (DMETER.dirty && dmNow() - dmSavedAt > 5) { dmSavedAt = dmNow(); dmSaveAll(); }
    dmeterNetTick();
    dmeterRender();
  } catch (e) { /* Anzeige darf das Spiel nie stören */ }
}, 500);
