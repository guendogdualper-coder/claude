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
// Eine Begegnung endet nach DM_IDLE Sekunden ohne Schaden; die nächste beginnt mit dem nächsten Treffer.
// DPS = Schaden / Kampfzeit der Begegnung (für alle Spieler dasselbe Zeitfenster); im Dungeon / Gebiet Schaden /
// Summe der Kampfzeiten dort.

const DM_IDLE = 6;
const DM_KEY = 'seelenstein.dmeter';
const DMETER = {
  enc: null,       // { start, last, rows: Map(name -> row), total }
  dgn: null,       // { area, start, combat, rows, total }
  view: 'enc',
  open: true,      // ausgeklappt (am Handy standardmäßig eingeklappt)
  pos: null,       // { x, y } verschoben
  ep: null,        // Kennung der Summe vom Host (Mitspieler)
  hostTot: 0,
  out: 0,          // eigene, noch nicht an die Gruppe geschickte Zuwächse
  el: null,
  html: ''
};
(() => {
  try {
    const s = JSON.parse(localStorage.getItem(DM_KEY) || '{}');
    if (s.view === 'enc' || s.view === 'dgn') DMETER.view = s.view;
    DMETER.open = typeof s.open === 'boolean' ? s.open : IS_PC;
    if (s.pos && Number.isFinite(s.pos.x) && Number.isFinite(s.pos.y)) DMETER.pos = s.pos;
  } catch (e) { DMETER.open = IS_PC; }
})();
function dmeterStore() {
  try { localStorage.setItem(DM_KEY, JSON.stringify({ view: DMETER.view, open: DMETER.open, pos: DMETER.pos })); } catch (e) { /* privat */ }
}

const dmNow = () => performance.now() / 1000;
const dmArea = () => (game.player ? areaKey(game.player.x, game.player.y) : -1);
function dmAreaName(a) {
  if (a >= 100) { const d = DUNGEONS[a - 100]; return d ? d.name : 'Dungeon'; }
  const wm = WORLD_MAPS.find((w) => w.id === a);
  return wm ? wm.name : '';
}

// Bereich gewechselt: neuer Zeitraum „Dungeon/Gebiet“ (die Begegnung endet mit)
function dmCheckArea() {
  const a = dmArea();
  if (DMETER.dgn && DMETER.dgn.area === a) return;
  DMETER.dgn = { area: a, start: dmNow(), combat: 0, rows: new Map(), total: 0 };
  DMETER.enc = null;
}

// Schaden eintragen (name = Spieler, cls = Klasse für die Farbe)
function dmeterAdd(name, cls, amount) {
  if (!(amount > 0) || !game.player) return;
  const t = dmNow();
  dmCheckArea();
  let e = DMETER.enc;
  if (!e || t - e.last > DM_IDLE) {
    // die vorige Begegnung zählt mit ihrer Kampfzeit zum Dungeon/Gebiet
    if (e) DMETER.dgn.combat += Math.max(1, e.last - e.start);
    e = DMETER.enc = { start: t, last: t, rows: new Map(), total: 0 };
  }
  e.last = t;
  for (const w of [e, DMETER.dgn]) {
    let r = w.rows.get(name);
    if (!r) w.rows.set(name, r = { name, cls, dmg: 0 });
    r.dmg += amount;
    if (cls) r.cls = cls;
    w.total += amount;
  }
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

function dmeterHtml() {
  const v = DMETER.view;
  const w = v === 'enc' ? DMETER.enc : DMETER.dgn;
  const t = dmNow();
  let dur = 0;
  if (w && v === 'enc') dur = Math.max(1, w.last - w.start);
  else if (w) dur = Math.max(1, w.combat + (DMETER.enc ? Math.max(1, DMETER.enc.last - DMETER.enc.start) : 0));
  const live = v === 'enc' && w && t - w.last <= DM_IDLE;
  const a = DMETER.dgn ? DMETER.dgn.area : dmArea();
  const tabs = `<div class="dm-tabs" role="tablist"><button type="button" role="tab" data-dmv="enc" class="${v === 'enc' ? 'on' : ''}" aria-selected="${v === 'enc'}">Begegnung</button>` +
    `<button type="button" role="tab" data-dmv="dgn" class="${v === 'dgn' ? 'on' : ''}" aria-selected="${v === 'dgn'}">${a >= 100 ? 'Dungeon' : 'Gebiet'}</button></div>`;
  const rows = w ? [...w.rows.values()].sort((x, y) => y.dmg - x.dmg) : [];
  const me = game.player ? game.player.name : '';
  const top = rows.length ? rows[0].dmg : 1;
  const sumDps = w ? w.total / dur : 0;
  // eingeklappt: nur eine Zeile (eigene DPS bzw. Gruppen-DPS)
  const head = `<div class="dm-head" data-dmdrag="1"><button type="button" class="dm-fold" data-dmfold="1" aria-expanded="${DMETER.open}" aria-label="Schadensanzeige ein- oder ausklappen">${DMETER.open ? '▾' : '▸'}</button>` +
    `<b class="dm-title">Schaden</b><span class="dm-sum">${w ? dmNum(sumDps) : '0'} <small>DPS</small></span></div>`;
  if (!DMETER.open) return head;
  let body = tabs;
  body += `<div class="dm-sub"><span>${v === 'enc' ? (live ? 'Kampf läuft' : w ? 'Letzter Kampf' : 'Noch kein Kampf') : escapeHtml(dmAreaName(a))}</span>` +
    `<span>${w ? dmTime(dur) : ''}<button type="button" class="dm-reset" data-dmreset="1">Zurücksetzen</button></span></div>`;
  if (!rows.length) body += '<p class="dm-empty">Noch kein Schaden.</p>';
  else {
    body += '<ol class="dm-rows">' + rows.slice(0, 8).map((r, k) => {
      const share = w.total ? Math.round(r.dmg / w.total * 100) : 0;
      const col = (CLASSES[r.cls] && CLASSES[r.cls].color) || '#8a7a5a';
      return `<li class="${r.name === me ? 'me' : ''}"><i class="dm-bar" style="width:${Math.max(2, r.dmg / top * 100).toFixed(1)}%;background:${col}"></i>` +
        `<span class="dm-n no-tr">${k + 1}. ${escapeHtml(r.name)}</span><span class="dm-v">${dmNum(r.dmg)}</span><span class="dm-d">${dmNum(r.dmg / dur)}</span><span class="dm-p">${share} %</span></li>`;
    }).join('') + '</ol>';
    body += `<div class="dm-cols"><span>Spieler</span><span>Schaden</span><span>DPS</span><span>Anteil</span></div>`;
    if (rows.length > 1) body += `<small class="dm-foot">Gruppe gesamt: ${dmNum(w.total)}</small>`;
  }
  return head + `<div class="dm-body">${body}</div>`;
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
    if (b.dataset.dmv) { DMETER.view = b.dataset.dmv; dmeterStore(); }
    else if (b.dataset.dmfold) { DMETER.open = !DMETER.open; dmeterStore(); }
    else if (b.dataset.dmreset) { DMETER.enc = null; DMETER.dgn = null; dmCheckArea(); }
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

setInterval(() => {
  try {
    if (!game.player) return;
    if (game.running) dmCheckArea();
    dmeterNetTick();
    dmeterRender();
  } catch (e) { /* Anzeige darf das Spiel nie stören */ }
}, 500);
