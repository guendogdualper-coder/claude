// Seelenstufen (seit 15.75, docs/endgame-langzeit.md): Ab Stufe 80 verfällt Erfahrung nicht mehr, sie füllt Seelenstufen
// (höchstens SEELE.max). Jede Seelenstufe gibt einen Punkt für zehn Seelenwerte mit je höchstens SEELE.perWert Punkten:
// drei kleine Kampfwerte (alle zusammen höchstens +8 %, gegen Spieler zur Hälfte) und sieben Komfortwerte, die das
// Grinden angenehmer machen, aber keinen Boss leichter. Jede Seelenstufe braucht mehr Erfahrung als die davor
// (seeleNeed): die ersten kommen nach gut einer halben Stufe, die letzten dauern Wochen.
// Gespeichert in p.seele = { lv, xp, tot, pts: { wert: Punkte } }; tot ist die gesamte Seelen-Erfahrung (Bestenliste).

const SEELE = {
  max: 100,
  perWert: 10,
  // Neu verteilen beim Charakterfenster: Gold (Goldsenke), jedes weitere Mal doppelt, höchstens resetMax
  resetBase: 500000, resetMax: 8000000,
  // Erfahrung je Seelenstufe: (start + step × Seelenstufe) × Erfahrung für Stufe 80 → 100 Stufen ≈ 200 Stufen-80-Aufstiege
  start: 0.5, step: 0.03
};
// Seelenwerte: per = Wirkung je Punkt; kampf: zählt im PvP zur Hälfte
const SEELE_WERTE = [
  { id: 'kraft', name: 'Kraft', icon: '⚔', per: 0.003, kampf: true, eff: 'Schaden' },
  { id: 'ausdauer', name: 'Ausdauer', icon: '❤', per: 0.003, kampf: true, eff: 'Leben' },
  { id: 'haerte', name: 'Härte', icon: '🛡', per: 0.002, kampf: true, eff: 'Abwehr' },
  { id: 'gier', name: 'Gier', icon: '🪙', per: 0.02, eff: 'Gold von Monstern' },
  { id: 'glueck', name: 'Glück', icon: '🍀', per: 0.01, eff: 'Beute' },
  { id: 'sammler', name: 'Sammler', icon: '💠', per: 0.02, eff: 'Seelensplitter' },
  { id: 'gelehrter', name: 'Gelehrter', icon: '📖', per: 0.02, eff: 'Seelen-Erfahrung' },
  { id: 'heilkunde', name: 'Heilkunde', icon: '🧪', per: 0.02, eff: 'Trankwirkung' },
  { id: 'reiter', name: 'Reiter', icon: '🐎', per: 0.01, eff: 'Reittempo' },
  { id: 'schmied', name: 'Schmiedekunst', icon: '⚒', per: 0.02, eff: 'Gold beim Schmied', minus: true }
];

// im Spielstand (spieler.js speichert nur SAVE_FIELDS)
if (typeof SAVE_FIELDS !== 'undefined' && !SAVE_FIELDS.includes('seele')) SAVE_FIELDS.push('seele');

const seeleNeed = (lv) => Math.round(xpToNext(MAX_LEVEL) * (SEELE.start + SEELE.step * lv));
function seeleState(p) {
  p = p || game.player;
  if (!p) return null;
  if (!p.seele || typeof p.seele !== 'object') p.seele = { lv: 0, xp: 0, tot: 0, pts: {} };
  const s = p.seele;
  if (!s.pts || typeof s.pts !== 'object') s.pts = {};
  s.lv = Math.max(0, Math.min(SEELE.max, s.lv | 0));
  s.xp = Math.max(0, +s.xp || 0);
  s.tot = Math.max(0, +s.tot || 0);
  // Rest-Erfahrung aus der Zeit vor 15.75 (lag ungenutzt auf Stufe 80) einmal in Seelen-Erfahrung umwandeln
  if (p.level >= MAX_LEVEL && p.xp > 0) {
    s.xp += p.xp;
    s.tot += p.xp;
    p.xp = 0;
  }
  return s;
}
const seelePts = (p, id) => {
  const s = p && p.seele;
  return s && s.pts ? Math.max(0, Math.min(SEELE.perWert, s.pts[id] | 0)) : 0;
};
const seeleSpent = (p) => SEELE_WERTE.reduce((n, w) => n + seelePts(p, w.id), 0);
const seeleFree = (p) => Math.max(0, ((p && p.seele && p.seele.lv) | 0) - seeleSpent(p));
// Wirkung eines Wertes (Anteil, z. B. 0,03 = 3 %); nur ab Stufe 80
function seeleVal(p, id) {
  if (!p || p.level < MAX_LEVEL || !p.seele) return 0;
  const w = SEELE_WERTE.find((x) => x.id === id);
  return w ? seelePts(p, id) * w.per : 0;
}
// Seelenstufe aus der gesamten Seelen-Erfahrung (für die Bestenliste, die nur Erfahrung kennt)
function seeleLevelOf(tot) {
  let lv = 0;
  let rest = Math.max(0, +tot || 0);
  while (lv < SEELE.max && rest >= seeleNeed(lv)) {
    rest -= seeleNeed(lv);
    lv++;
  }
  return lv;
}

// --- Erfahrung ab Stufe 80 ------------------------------------------------------------------------------------------
function seeleGain(amount) {
  const p = game.player;
  const s = seeleState(p);
  if (!s || !(amount > 0)) return;
  if (typeof eventXpActive === 'function' && eventXpActive()) amount = Math.round(amount * (1 + EVENT_XP.mul));
  amount = Math.round(amount * (1 + seeleVal(p, 'gelehrter')));
  if (!(p.xpPop > 0)) later(0.18, showXpGain);
  p.xpPop = (p.xpPop || 0) + amount;
  s.tot += amount;
  if (s.lv >= SEELE.max) {
    s.xp = 0;
    return;
  }
  s.xp += amount;
  let up = 0;
  while (s.lv < SEELE.max && s.xp >= seeleNeed(s.lv)) {
    s.xp -= seeleNeed(s.lv);
    s.lv++;
    up++;
  }
  if (s.lv >= SEELE.max) s.xp = 0;
  if (!up) return;
  vfxLevelUp(p);
  snd.player('levelup', { vol: 0.5, rev: 0.6, variants: 1 });
  ui.banner('Seelenstufe ' + s.lv, s.lv >= SEELE.max ? 'Die höchste Seelenstufe!' : 'Ein neuer Seelenpunkt – Charakterfenster (C) · Seele');
  ui.log(`Seelenstufe ${s.lv}! Du hast ${up > 1 ? up + ' neue Seelenpunkte' : 'einen neuen Seelenpunkt'}. Verteile ${up > 1 ? 'sie' : 'ihn'} im Charakterfenster unter „Seele“.`, 'level');
  if (typeof ui.renderCharPanel === 'function' && $('panelChar') && !$('panelChar').hidden) ui.renderCharPanel();
  saveGame();
}
const _seeleGainXp = gainXp;
gainXp = function (amount) {
  const p = game.player;
  if (!p || p.level < MAX_LEVEL) return _seeleGainXp(amount);
  // der Erfahrungsring wirkt auch hier (seine Hülle um gainXp liegt weiter innen, erfahrungsring.js)
  if (typeof epRingLeft === 'function' && epRingLeft() > 0 && amount > 0) amount = Math.round(amount * (1 + EP_RING.mul));
  seeleGain(amount);
};

function seeleSpend(id) {
  const p = game.player;
  const w = SEELE_WERTE.find((x) => x.id === id);
  if (!p || !w || p.level < MAX_LEVEL) return false;
  const s = seeleState(p);
  if (seeleFree(p) <= 0 || seelePts(p, id) >= SEELE.perWert) return false;
  s.pts[id] = seelePts(p, id) + 1;
  if (typeof recalcStats === 'function') recalcStats();
  else if (game.stats) game.stats = playerStats(p);
  saveGame();
  return true;
}
const seeleResetCost = (p) => Math.min(SEELE.resetMax, SEELE.resetBase * 2 ** ((p.seele && p.seele.resets) | 0));
function seeleReset() {
  const p = game.player;
  const s = seeleState(p);
  if (!s || !seeleSpent(p)) return false;
  const cost = seeleResetCost(p);
  if (p.gold < cost) {
    ui.log(`Neu verteilen kostet ${cost.toLocaleString('de-DE')} Gold.`, 'warn');
    return false;
  }
  p.gold -= cost;
  s.pts = {};
  s.resets = (s.resets | 0) + 1;
  if (typeof recalcStats === 'function') recalcStats();
  else if (game.stats) game.stats = playerStats(p);
  ui.log('Seelenpunkte zurückgesetzt – verteile sie neu.', 'info');
  saveGame();
  return true;
}

// --- Wirkung auf die Werte ----------------------------------------------------------------------------------------
const _seelePlayerStats = playerStats;
playerStats = function (p) {
  const s = _seelePlayerStats(p);
  if (!p || p.level < MAX_LEVEL || !p.seele) return s;
  const dmg = seeleVal(p, 'kraft');
  const hp = seeleVal(p, 'ausdauer');
  const def = seeleVal(p, 'haerte');
  if (dmg > 0) {
    const k = 1 + dmg;
    s.atk = Math.round(s.atk * k);
    if (s.wMax) {
      s.wMin = Math.round(s.wMin * k);
      s.wMax = Math.round(s.wMax * k);
      s.wAvg = Math.round((s.wAvg || 0) * k);
    }
    s.skillPower = Math.round((s.skillPower || s.atk * (s.skillDmg || 1)) * k);
  }
  if (hp > 0) s.maxHp = Math.round(s.maxHp * (1 + hp));
  if (def > 0) s.def = Math.round(s.def * (1 + def));
  s.seeleDmg = dmg;
  s.seeleHp = hp;
  s.seeleDef = def;
  s.goldFind = (s.goldFind || 0) + seeleVal(p, 'gier');
  s.dropFind = (s.dropFind || 0) + seeleVal(p, 'glueck');
  s.potionBonus = (s.potionBonus || 0) + seeleVal(p, 'heilkunde');
  // Reiter: nur der Anteil des Reittiers wird schneller (Lauftempo zu Fuß bleibt)
  const ride = seeleVal(p, 'reiter');
  if (ride > 0 && s.rideMul > 0) {
    s.speed += CLASSES[p.classId].base.speed * s.rideMul * ride;
    s.rideMul *= 1 + ride;
  }
  return s;
};
// Seelensplitter (Sammler): im Mittel n × (1 + Bonus), zufällig gerundet
const _seeleGiveSplinters = giveSplinters;
giveSplinters = function (n) {
  const f = seeleVal(game.player, 'sammler');
  if (f > 0 && n > 0) {
    const x = n * (1 + f);
    n = Math.floor(x) + (Math.random() < x - Math.floor(x) ? 1 : 0);
  }
  return _seeleGiveSplinters(n);
};
// Schmiedekunst: weniger Gold beim Schmied (auch beim Turm-Schmied, der dieselben Kosten nimmt)
const _seeleUpgradeCost = upgradeCost;
upgradeCost = function (item) {
  const c = _seeleUpgradeCost(item);
  const f = seeleVal(game.player, 'schmied');
  if (f > 0 && c && c.gold > 0) c.gold = Math.round(c.gold * (1 - f));
  return c;
};
// PvP: Kampfwerte zählen zur Hälfte – eigener Schaden um die halbe Kraft gekürzt, erlittener Schaden um die halbe
// Ausdauer/Härte erhöht (Leben und Abwehr bleiben in der Anzeige wie im PvE)
if (typeof pvpOutgoing === 'function') {
  const _seelePvpOut = pvpOutgoing;
  pvpOutgoing = function (mul, opts) {
    const d = _seelePvpOut(mul, opts);
    const k = (game.stats && game.stats.seeleDmg) || 0;
    if (k > 0 && d && d.a > 0) d.a = Math.round((d.a * (1 + k / 2)) / (1 + k));
    return d;
  };
}
if (typeof pvpIncoming === 'function') {
  const _seelePvpIn = pvpIncoming;
  pvpIncoming = function (level, s, d, win, now) {
    const k = s ? (s.seeleHp || 0) + (s.seeleDef || 0) * 0.5 : 0;
    if (k > 0 && d && d.a > 0) d = Object.assign({}, d, { a: (d.a * (1 + k)) / (1 + k / 2) });
    return _seelePvpIn(level, s, d, win, now);
  };
}

// --- Anzeige: Seite „Seele“ im Charakterfenster ------------------------------------------------------------------------
function seeleCss() {
  if (document.getElementById('seeleCss')) return;
  const st = document.createElement('style');
  st.id = 'seeleCss';
  st.textContent =
    '.seele-kopf{display:flex;gap:12px;align-items:center;margin:4px 0 10px;flex-wrap:wrap}' +
    '.seele-stern{font:700 26px/1 system-ui,sans-serif;color:#ffd96a;text-shadow:0 0 12px rgba(255,200,80,.55);white-space:nowrap}' +
    '.seele-stern small{font-size:13px;color:#c9b88a;margin-left:3px}' +
    '.seele-info{flex:1;min-width:180px;font-size:12px;color:#d8cfbf}' +
    '.seele-info b{display:block;font-size:14px;color:#ffe9b0;margin-bottom:2px}' +
    '.seele-bar{position:relative;height:14px;margin-top:6px;border-radius:7px;background:rgba(0,0,0,.45);border:1px solid rgba(255,211,77,.35);overflow:hidden}' +
    '.seele-bar i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#8a5cff,#ffd34d)}' +
    '.seele-bar em{position:relative;display:block;text-align:center;font:600 10px/14px system-ui,sans-serif;font-style:normal;color:#fff;text-shadow:0 1px 2px #000}' +
    '.seele-frei{font-size:12px;color:#d8cfbf;text-align:center}.seele-frei b{display:block;font-size:22px;color:#7dffa8}' +
    '.seele h3 small{font-weight:400;font-size:11px;color:#b9ad95;margin-left:6px}' +
    '.seele-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px;margin-bottom:8px}' +
    '.seele-wert{display:grid;grid-template-columns:auto 1fr auto;grid-template-rows:auto auto;column-gap:6px;align-items:center;padding:6px 7px;border-radius:9px;background:rgba(255,255,255,.05);border:1px solid rgba(255,211,77,.2)}' +
    '.seele-wert .sw-ico{grid-row:1/3;font-size:20px}' +
    '.seele-wert b{font-size:12px;color:#ffe9b0}.seele-wert .sw-pts{font-size:11px;color:#c9b88a;text-align:right}' +
    '.seele-wert .sw-eff{grid-column:2/3;font-size:11px;color:#9fe7b4}' +
    '.seele-wert button{grid-column:3/4;grid-row:2/3;min-width:34px;padding:2px 6px;border-radius:7px;border:1px solid #c9a24a;background:#3a2a10;color:#ffe9b0;font-weight:700;cursor:pointer}' +
    '.seele-wert button:disabled{opacity:.35;cursor:default}' +
    '.seele-wert.voll{border-color:rgba(125,255,168,.45)}';
  document.head.appendChild(st);
}
const seelePct = (v) => (Math.round(v * 1000) / 10).toLocaleString('de-DE') + ' %';
function seeleHtml(p) {
  seeleCss();
  const s = seeleState(p);
  const need = s.lv >= SEELE.max ? 0 : seeleNeed(s.lv);
  const pct = need ? Math.min(100, (s.xp / need) * 100) : 100;
  const free = seeleFree(p);
  const card = (w) => {
    const n = seelePts(p, w.id);
    const sign = w.minus ? '−' : '+';
    return `<div class="seele-wert${n >= SEELE.perWert ? ' voll' : ''}"><span class="sw-ico">${w.icon}</span><b>${w.name}</b>` +
      `<span class="sw-pts">${n} / ${SEELE.perWert}</span><span class="sw-eff">${sign}${seelePct(n * w.per)} ${w.eff}</span>` +
      `<button type="button" data-seele="${w.id}" ${free > 0 && n < SEELE.perWert ? '' : 'disabled'} title="${sign}${seelePct(w.per)} ${w.eff} je Punkt">+1</button></div>`;
  };
  return `<div class="seele"><div class="seele-kopf"><div class="seele-stern">★ ${s.lv}<small>/ ${SEELE.max}</small></div>` +
    `<div class="seele-info"><b>Seelenstufen</b><span>Ab Stufe 80 füllt jede Erfahrung deine Seelenstufen. Jede Seelenstufe gibt einen Punkt.</span>` +
    `<div class="seele-bar"><i style="width:${pct.toFixed(1)}%"></i><em>${need ? `${Math.floor(s.xp).toLocaleString('de-DE')} / ${need.toLocaleString('de-DE')} Seelen-EP` : 'Höchste Seelenstufe'}</em></div></div>` +
    `<div class="seele-frei">Freie Punkte<b>${free}</b></div></div>` +
    `<h3>Kampf<small>zusammen höchstens +8 % · gegen Spieler zur Hälfte</small></h3><div class="seele-grid">${SEELE_WERTE.filter((w) => w.kampf).map(card).join('')}</div>` +
    `<h3>Komfort<small>macht das Grinden angenehmer, keinen Boss leichter</small></h3><div class="seele-grid">${SEELE_WERTE.filter((w) => !w.kampf).map(card).join('')}</div>` +
    (seeleSpent(p) ? `<p class="hint-text">Punkte neu verteilen: ${seeleResetCost(p).toLocaleString('de-DE')} Gold <button type="button" class="mini-btn" data-seele-reset>Zurücksetzen</button></p>` : '') +
    `</div>`;
}
function seeleBind(root) {
  if (!root) return;
  root.querySelectorAll('[data-seele]').forEach((b) => b.addEventListener('click', () => {
    if (seeleSpend(b.dataset.seele)) ui.renderCharPanel();
  }));
  const r = root.querySelector('[data-seele-reset]');
  if (r) r.addEventListener('click', () => {
    if (seeleReset()) ui.renderCharPanel();
  });
}
