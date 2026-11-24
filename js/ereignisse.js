'use strict';
// Ereignisse (seit 15.78, Paket 3 der Langzeit-Ziele, docs/endgame-langzeit.md Abschnitte 11–14) – alles ohne Server:
// - Doppel-EP-Wochenenden: am ersten und dritten Wochenende jedes Monats (der Samstag liegt am 1.–7. oder 15.–21.)
//   von Freitag 18 Uhr bis Sonntag 24 Uhr nach der Uhr des Geräts doppelte Erfahrung. Läuft über EVENT_XP
//   (daten/quests.js), das schon in gainXp, in den Seelenstufen und in der Herausforderungs-Arena wirkt.
// - Winterfest vom 1. Dezember bis 6. Januar: Schneeflocken von Monstern, Bossen und Seelensteinen, ein Festgeschenk
//   am Tag, Tausch im Charakterfenster (Seite „Ereignisse“).
// - PvP-Saisons: je zwei Monate (Saison 1 ab 1.12.2026, Weltzeit). Am Ende gibt es eine Belohnung nach der besten
//   Rangstufe der Saison (nur wer gekämpft hat), danach werden die Rangpunkte halbiert. Die Bestenliste zeigt in der
//   Turnierarena nur Einträge der laufenden Saison (bestenliste.js).
// - Erbe der Ahnen (Bonus für weitere Charaktere): hat ein anderer Charakter auf diesem Konto Stufe 40/60/80, bekommen
//   die übrigen +15/+30/+50 % Erfahrung, solange sie unter dessen Stufe liegen.
// Spielstand p.ev = { fl: Schneeflocken, flTot: insgesamt gesammelt, gift: Tag des letzten Festgeschenks,
// sTop: beste Saisonstufe (Index in PVP_TIERS), lohn: { n, tier } letzte Saisonbelohnung }; die Saison selbst steht in
// p.pvp (sz: Saison, sg0: Kämpfe zu Saisonbeginn, sbest: beste Punkte der Saison).
const EV = {
  ep: { mul: 1, samstage: [[1, 7], [15, 21]], ab: 18 },
  winter: { chance: 0.04, stein: 3, boss: 5, geschenk: 10, abstand: 10 },
  saison: { start: Date.UTC(2026, 11, 1), monate: 2, rest: 0.5,
    gold: [100000, 250000, 500000, 1000000, 2000000, 3000000], splitter: [20, 40, 60, 80, 100, 150],
    kerne: [0, 0, 2, 4, 6, 10], juwel: [0, 0, 0, 1, 1, 2] },
  erbe: [[80, 0.5], [60, 0.3], [40, 0.15]]
};
if (typeof SAVE_FIELDS !== 'undefined' && !SAVE_FIELDS.includes('ev')) SAVE_FIELDS.push('ev');

function evState(p) {
  p = p || game.player;
  if (!p.ev || typeof p.ev !== 'object') p.ev = {};
  const e = p.ev;
  e.fl = Math.max(0, e.fl | 0);
  e.flTot = Math.max(0, e.flTot | 0);
  return e;
}
const evDe = (n) => Math.round(n).toLocaleString('de-DE');
const evTag = (t) => { const d = new Date(t); return `${d.getDate()}.${d.getMonth() + 1}.`; };
const evHeute = () => { const d = new Date(Date.now()); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

// --- Doppel-EP-Wochenende ----------------------------------------------------------------------------------------------
// Freitag 18 Uhr des Wochenendes, dessen Samstag am 1.–7. oder 15.–21. des Monats liegt, bis Montag 0 Uhr
function evEpFenster(f) {
  const sa = new Date(f.getFullYear(), f.getMonth(), f.getDate() + 1).getDate();
  if (!EV.ep.samstage.some(([a, b]) => sa >= a && sa <= b)) return null;
  return { from: f.getTime(), until: new Date(f.getFullYear(), f.getMonth(), f.getDate() + 3).getTime() };
}
function evEpWochenende(t = Date.now()) {
  const d = new Date(t);
  for (let back = 0; back <= 3; back++) {
    const f = new Date(d.getFullYear(), d.getMonth(), d.getDate() - back, EV.ep.ab);
    if (f.getDay() !== 5) continue;
    const w = evEpFenster(f);
    return w && t >= w.from && t < w.until ? w : null;
  }
  return null;
}
function evEpNaechstes(t = Date.now()) {
  const d = new Date(t);
  for (let i = 0; i < 45; i++) {
    const f = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i, EV.ep.ab);
    if (f.getDay() !== 5 || f.getTime() <= t) continue;
    const w = evEpFenster(f);
    if (w) return w;
  }
  return null;
}
// EVENT_XP (daten/quests.js) zeigt auf das laufende Wochenende; sonst bleibt der alte Startbonus stehen (abgelaufen)
const EV_XP0 = typeof EVENT_XP !== 'undefined' ? Object.assign({}, EVENT_XP) : null;
function evSyncXp() {
  if (!EV_XP0) return;
  const w = evEpWochenende();
  if (w) Object.assign(EVENT_XP, { mul: EV.ep.mul, from: w.from, until: w.until, name: 'Doppel-EP-Wochenende' });
  else if (EVENT_XP.name !== EV_XP0.name || EVENT_XP.until !== EV_XP0.until) Object.assign(EVENT_XP, EV_XP0);
}
evSyncXp();

// --- Winterfest --------------------------------------------------------------------------------------------------------
function evWinter(t = Date.now()) {
  const y = new Date(t).getFullYear();
  for (const fy of [y - 1, y]) {
    const from = new Date(fy, 11, 1).getTime(), until = new Date(fy + 1, 0, 7).getTime();
    if (t >= from && t < until) return { an: true, from, until };
  }
  return { an: false, from: new Date(y, 11, 1).getTime(), until: new Date(y + 1, 0, 7).getTime() };
}
// Symbol der Schneeflocke (Leinwand, einmal gezeichnet)
let evFlockeUrl = '';
function evFlockeIcon() {
  if (evFlockeUrl) return evFlockeUrl;
  const c = document.createElement('canvas');
  c.width = c.height = 48;
  const g = c.getContext('2d');
  g.translate(24, 24);
  const grd = g.createRadialGradient(0, 0, 2, 0, 0, 22);
  grd.addColorStop(0, 'rgba(160,210,255,0.55)');
  grd.addColorStop(1, 'rgba(160,210,255,0)');
  g.fillStyle = grd;
  g.fillRect(-24, -24, 48, 48);
  g.strokeStyle = '#eaf6ff';
  g.lineCap = 'round';
  for (let k = 0; k < 6; k++) {
    g.save();
    g.rotate((k * Math.PI) / 3);
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -18); g.stroke();
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, -9); g.lineTo(-5, -14); g.moveTo(0, -9); g.lineTo(5, -14);
    g.moveTo(0, -14); g.lineTo(-3.5, -18); g.moveTo(0, -14); g.lineTo(3.5, -18); g.stroke();
    g.restore();
  }
  g.fillStyle = '#9fd4ff';
  g.beginPath(); g.arc(0, 0, 3.2, 0, Math.PI * 2); g.fill();
  evFlockeUrl = c.toDataURL();
  return evFlockeUrl;
}
function evFlocken(n) {
  if (!(n > 0)) return;
  const e = evState();
  e.fl += n;
  e.flTot += n;
  ui.loot('Schneeflocke', n, evFlockeIcon(), '#bfe6ff');
}
// Monster, Bosse und Seelensteine (höchstens 10 Stufen unter dir) während des Winterfests
function evWinterBeute(kind, m) {
  const p = game.player;
  if (!p || !m || (kind !== 'kill' && kind !== 'stone') || !evWinter().an) return;
  if ((m.level | 0) + EV.winter.abstand < p.level) return;
  const t = m.type || {};
  if (kind === 'stone') evFlocken(EV.winter.stein);
  else if (t.boss || t.raid || t.weltboss) evFlocken(EV.winter.boss);
  else if (Math.random() < EV.winter.chance) evFlocken(1);
}
const _evQuestEvent = questEvent;
questEvent = function (kind, m) {
  _evQuestEvent(kind, m);
  try { evWinterBeute(kind, m); } catch (err) { /* ein Fehler hier darf den Kampf nie aufhalten */ }
};
const evGeschenkFrei = (p) => evWinter().an && evState(p).gift !== evHeute();
function evGeschenk() {
  const p = game.player;
  if (!p || !evGeschenkFrei(p)) return false;
  evState(p).gift = evHeute();
  evFlocken(EV.winter.geschenk);
  ui.banner('Festgeschenk', `${EV.winter.geschenk} Schneeflocken`);
  saveGame();
  return true;
}
// Tausch: Preis in Schneeflocken
const evGoldBeutel = (p) => Math.max(1, p.level) * 2500;
const EV_TAUSCH = [
  { id: 'gold', name: 'Festbeutel', preis: 10, info: (p) => `${evDe(evGoldBeutel(p))} Gold`,
    give: (p) => { const g = evGoldBeutel(p); p.gold += g; ui.log(`Festbeutel · +${evDe(g)} Gold`, 'success'); } },
  { id: 'splitter', name: 'Seelensplitter', preis: 15, info: () => '40 Stück', give: () => giveSplinters(40) },
  { id: 'kerne', name: 'Ätherkerne', preis: 25, min: 75, info: () => '3 Stück',
    give: (p) => {
      p.materials.aetherkern = (p.materials.aetherkern || 0) + 3;
      if (typeof materialIconUrl === 'function') ui.loot('Ätherkern', 3, materialIconUrl('aetherkern'), MATERIAL_COLORS.aetherkern);
    } },
  { id: 'ring', name: 'Erfahrungsring', preis: 30, info: () => `+${Math.round(EP_RING.mul * 100)} % Erfahrung, ${EP_RING.minutes} Min.`,
    give: (p) => {
      p.materials.epring = (p.materials.epring || 0) + 1;
      if (typeof materialIconUrl === 'function') ui.loot('Erfahrungsring', 1, materialIconUrl('epring'), EP_RING.color);
    } },
  { id: 'juwel', name: 'Juwel', preis: 60, min: 75, info: () => 'Stufe I, zufällige Art', give: () => juwelDrop(1) }
];
function evTausch(id) {
  const p = game.player;
  const T = EV_TAUSCH.find((x) => x.id === id);
  if (!p || !T || !evWinter().an) return false;
  const e = evState(p);
  if (e.fl < T.preis || (T.min && p.level < T.min)) return false;
  if (T.id === 'juwel' && typeof juwelDrop !== 'function') return false;
  e.fl -= T.preis;
  T.give(p);
  saveGame();
  return true;
}

// --- PvP-Saisons -------------------------------------------------------------------------------------------------------
function evSaison(t = Date.now()) {
  const S = EV.saison;
  if (t < S.start) return { n: 0, from: 0, until: S.start };
  const d = new Date(t);
  const m = (d.getUTCFullYear() - 2026) * 12 + d.getUTCMonth() - 11;
  const n = Math.floor(m / S.monate) + 1;
  return { n, from: Date.UTC(2026, 11 + (n - 1) * S.monate, 1), until: Date.UTC(2026, 11 + n * S.monate, 1) };
}
const evSaisonFrom = () => evSaison().from;
const evSaisonName = (n) => (n ? `Saison ${n}` : 'Vorsaison');
// letzter Tag der Saison (Weltzeit)
const evSaisonEnde = (S) => { const d = new Date(S.until - 1); return `${d.getUTCDate()}.${d.getUTCMonth() + 1}.${d.getUTCFullYear()}`; };
function evSaisonLohn(ti, p) {
  const S = EV.saison;
  const k = Math.max(0.1, Math.min(1, p.level / MAX_LEVEL));
  return { gold: Math.round((S.gold[ti] * k) / 1000) * 1000, splitter: S.splitter[ti], kerne: S.kerne[ti], juwel: p.level >= 75 ? S.juwel[ti] : 0 };
}
// mit „ · “ getrennt, damit jedes Stück einzeln übersetzt wird (sprache.js)
const evLohnText = (L) => [`${evDe(L.gold)} Gold`, `${L.splitter} Seelensplitter`, L.kerne ? `${L.kerne} Ätherkerne` : '', L.juwel ? `${L.juwel} ${L.juwel > 1 ? 'Juwelen' : 'Juwel'}` : ''].filter(Boolean).join(' · ');
// Saisonwechsel: Belohnung für die alte Saison, dann Rangpunkte halbieren (einmal, auch wenn Saisons übersprungen wurden)
function evSaisonCheck(p) {
  if (!p || typeof pvpSave !== 'function') return;
  const A = pvpSave(p);
  const cur = evSaison();
  const kaempfe = () => (A.w | 0) + (A.l | 0);
  // noch nie gezählt: alles bisher gehört zur Vorsaison (auch die beste Wertung, die es schon gab)
  if (A.sz == null) { A.sz = 0; A.sg0 = 0; A.sbest = Math.max(A.pts | 0, A.best | 0); }
  A.sbest = Math.max(A.sbest | 0, A.pts | 0);
  if (A.sz >= cur.n) return;
  const alt = A.sz;
  if (kaempfe() - (A.sg0 | 0) > 0) {
    const tier = pvpTier(A.sbest);
    const ti = Math.max(0, PVP_TIERS.indexOf(tier));
    const L = evSaisonLohn(ti, p);
    p.gold += L.gold;
    giveSplinters(L.splitter);
    if (L.kerne) {
      p.materials.aetherkern = (p.materials.aetherkern || 0) + L.kerne;
      if (typeof materialIconUrl === 'function') ui.loot('Ätherkern', L.kerne, materialIconUrl('aetherkern'), MATERIAL_COLORS.aetherkern);
    }
    for (let k = 0; k < L.juwel && typeof juwelDrop === 'function'; k++) juwelDrop(1);
    const e = evState(p);
    e.sTop = Math.max(e.sTop | 0, ti);
    e.lohn = { n: alt, tier: tier.id };
    ui.banner('Saisonende', `${evSaisonName(alt)} · ${tier.name}`);
    ui.log(`Saisonende · ${evSaisonName(alt)} · ${tier.name} · ${evLohnText(L)}`, 'level');
  }
  A.pts = Math.round(((A.pts | 0) * EV.saison.rest) / 25) * 25;
  A.sz = cur.n;
  A.sg0 = kaempfe();
  A.sbest = A.pts;
  if (cur.n) ui.log(`${evSaisonName(cur.n)} hat begonnen · deine Rangpunkte wurden halbiert (${evDe(A.pts)})`, 'info');
  saveGame();
}
function evSaisonHtml(A) {
  const S = evSaison();
  const best = pvpTier(Math.max(A.sbest | 0, A.pts | 0));
  return `<p class="ev-saison"><b>${evSaisonName(S.n)}</b> · <span>${S.n ? 'endet am' : 'Saison 1 beginnt am'}</span> <b>${evSaisonEnde(S.n ? S : { until: S.until + 1 })}</b>` +
    ` · <span>beste Stufe</span> <b style="color:${best.color}">${best.name}</b></p>`;
}
if (typeof pvpRankHtml === 'function') {
  const _evPvpRankHtml = pvpRankHtml;
  pvpRankHtml = function (A) {
    return _evPvpRankHtml(A) + evSaisonHtml(A);
  };
}

// --- Erbe der Ahnen (Bonus für weitere Charaktere) ---------------------------------------------------------------------
const evErbe = { at: 0, who: null, max: 0, n80: 0 };
function evErbeScan() {
  const p = game.player;
  if (!p) return evErbe;
  if (evErbe.who === p && Date.now() - evErbe.at < 60000) return evErbe;
  let max = 0, n80 = 0;
  try {
    for (const sv of listSaves()) {
      if (!sv || sv.unknown || (sv.name === p.name && sv.classId === p.classId)) continue;
      const lv = sv.level | 0;
      if (lv > max) max = lv;
      if (lv >= MAX_LEVEL) n80++;
    }
  } catch (err) { /* ohne Charakterplätze kein Erbe */ }
  return Object.assign(evErbe, { at: Date.now(), who: p, max, n80 });
}
function evErbeMul(p = game.player) {
  if (!p || p.level >= MAX_LEVEL) return 0;
  const E = evErbeScan();
  if (p.level >= E.max) return 0;
  for (const [lv, mul] of EV.erbe) if (E.max >= lv) return mul;
  return 0;
}
const _evGainXp = gainXp;
// eslint-disable-next-line no-global-assign
gainXp = function (amount) {
  const b = amount > 0 ? evErbeMul() : 0;
  return _evGainXp(b ? Math.round(amount * (1 + b)) : amount);
};

// --- Ansagen und Takt --------------------------------------------------------------------------------------------------
const evGesehen = { ep: 0, winter: 0, at: 0 };
function evTick() {
  evSyncXp();
  const p = typeof game !== 'undefined' ? game.player : null;
  if (!p || !game.running) return;
  evSaisonCheck(p);
  // Ansagen erst ein paar Sekunden nach dem Betreten (dann sind Willkommen und Tagesbelohnung durch)
  if (!evGesehen.at) evGesehen.at = Date.now();
  if (Date.now() - evGesehen.at < 8000) return;
  const w = evEpWochenende();
  if (w && evGesehen.ep !== w.from) {
    evGesehen.ep = w.from;
    ui.banner('Doppel-EP-Wochenende!', 'Doppelte Erfahrung bis Sonntag 24 Uhr');
    ui.log('Doppel-EP-Wochenende · doppelte Erfahrung für alle Charaktere bis Sonntag 24 Uhr', 'level');
  }
  const W = evWinter();
  if (W.an && evGesehen.winter !== W.from) {
    evGesehen.winter = W.from;
    ui.log('Winterfest · Monster und Seelensteine lassen Schneeflocken fallen · Festgeschenk und Tausch im Charakterfenster unter „Ereignisse“', 'info');
  }
}
setInterval(() => { try { evTick(); } catch (err) { /* nächster Takt */ } }, 5000);

// --- Seite „Ereignisse“ im Charakterfenster ----------------------------------------------------------------------------
function evHtml(p) {
  const e = evState(p);
  const w = evEpWochenende();
  const nx = w ? null : evEpNaechstes();
  const W = evWinter();
  const A = typeof pvpSave === 'function' ? pvpSave(p) : null;
  const S = evSaison();
  const mul = evErbeMul(p);
  const E = evErbeScan();
  let h = '<div class="ev-page">';
  // Doppel-EP
  h += `<section class="ev-box${w ? ' ev-an' : ''}"><h3>Doppel-EP-Wochenende</h3>` +
    (w ? `<p class="ev-now"><b>Jetzt aktiv</b> · <span>doppelte Erfahrung für alle Charaktere</span></p><p class="ev-row"><span>bis</span> <b>${evTag(w.until - 1)} 24:00</b></p>`
      : `<p class="ev-row"><span>Nächstes Wochenende</span> <b>${nx ? `${evTag(nx.from)} 18:00 – ${evTag(nx.until - 1)} 24:00` : '–'}</b></p>`) +
    '<p class="ev-hint">Am ersten und dritten Wochenende jedes Monats, von Freitag 18 Uhr bis Sonntag 24 Uhr: doppelte Erfahrung, auf Stufe 80 doppelte Seelen-Erfahrung.</p></section>';
  // Winterfest
  h += `<section class="ev-box${W.an ? ' ev-an' : ''}"><h3>Winterfest</h3>`;
  if (W.an) {
    const frei = evGeschenkFrei(p);
    h += `<p class="ev-row"><img class="ev-ico" src="${evFlockeIcon()}" alt=""> <span>Schneeflocken</span> <b class="ev-fl">${evDe(e.fl)}</b> <span>bis</span> <b>${evTag(W.until - 1)}</b></p>` +
      `<p class="ev-row"><button type="button" class="btn ${frei ? 'btn-primary' : ''}" data-evg${frei ? '' : ' disabled'}>${frei ? 'Festgeschenk abholen' : 'Festgeschenk abgeholt'}</button> <span class="ev-hint">${EV.winter.geschenk} Schneeflocken jeden Tag</span></p>` +
      '<div class="ev-shop">' + EV_TAUSCH.map((T) => {
        const zu = T.min && p.level < T.min;
        const ok = !zu && e.fl >= T.preis;
        return `<div class="ev-item"><b>${T.name}</b><small>${zu ? `ab Stufe ${T.min}` : T.info(p)}</small>` +
          `<button type="button" class="mini-btn" data-evt="${T.id}"${ok ? '' : ' disabled'}><img class="ev-ico-s" src="${evFlockeIcon()}" alt=""> ${T.preis}</button></div>`;
      }).join('') + '</div>' +
      '<p class="ev-hint">Monster lassen selten eine Schneeflocke fallen, Bosse fünf, Seelensteine drei – nur Gegner höchstens 10 Stufen unter dir.</p>';
  } else {
    h += `<p class="ev-row"><span>Beginnt am</span> <b>${evTag(W.from)}</b> <span>bis</span> <b>${evTag(W.until - 1)}</b></p>` +
      (e.fl ? `<p class="ev-row"><img class="ev-ico" src="${evFlockeIcon()}" alt=""> <span>Schneeflocken</span> <b class="ev-fl">${evDe(e.fl)}</b></p>` : '') +
      '<p class="ev-hint">Vom 1. Dezember bis 6. Januar: Schneeflocken sammeln, jeden Tag ein Festgeschenk, Tausch gegen Gold, Seelensplitter, Erfahrungsringe, Ätherkerne und Juwelen.</p>';
  }
  h += '</section>';
  // PvP-Saison
  if (A) {
    const best = pvpTier(Math.max(A.sbest | 0, A.pts | 0));
    const ti = Math.max(0, PVP_TIERS.indexOf(best));
    const kaempfe = (A.w | 0) + (A.l | 0) - (A.sg0 | 0);
    h += `<section class="ev-box"><h3>PvP-Saison</h3><p class="ev-row"><b>${evSaisonName(S.n)}</b> <span>${S.n ? 'endet am' : 'Saison 1 beginnt am'}</span> <b>${evSaisonEnde(S.n ? S : { until: S.until + 1 })}</b></p>` +
      `<p class="ev-row"><span>Beste Stufe dieser Saison</span> <b style="color:${best.color}">${best.name}</b> <span>Rangkämpfe</span> <b>${Math.max(0, kaempfe)}</b></p>` +
      `<p class="ev-row"><span>Belohnung zum Saisonende</span> <b>${kaempfe > 0 ? evLohnText(evSaisonLohn(ti, p)) : '–'}</b></p>` +
      '<p class="ev-hint">Eine Saison dauert zwei Monate. Am Ende zählt die beste Rangstufe, die du in der Saison erreicht hast (nur mit mindestens einem Rangkampf). Danach werden die Rangpunkte halbiert.</p></section>';
  }
  // Erbe der Ahnen
  h += `<section class="ev-box${mul ? ' ev-an' : ''}"><h3>Erbe der Ahnen</h3>` +
    (mul ? `<p class="ev-now"><b>+${Math.round(mul * 100)} % Erfahrung</b> · <span>bis Stufe</span> <b>${E.max}</b></p>`
      : `<p class="ev-row"><span>Stärkster anderer Charakter</span> <b>${E.max ? `Stufe ${E.max}` : '–'}</b></p>`) +
    '<p class="ev-hint">Hat ein anderer Charakter auf deinem Konto Stufe 40, 60 oder 80, bekommen alle anderen +15, +30 oder +50 % Erfahrung – bis sie seine Stufe erreichen.</p></section>';
  return h + '</div>';
}
function evBind(root) {
  const g = root.querySelector('[data-evg]');
  if (g) g.addEventListener('click', () => { if (evGeschenk()) ui.renderCharPanel(); });
  root.querySelectorAll('[data-evt]').forEach((b) => b.addEventListener('click', () => { if (evTausch(b.dataset.evt)) ui.renderCharPanel(); }));
}
if (typeof CHAR_TABS_EXTRA !== 'undefined') {
  CHAR_TABS_EXTRA.push({ id: 'ereignisse', label: 'Ereignisse', show: () => true, dot: (p) => (evGeschenkFrei(p) ? 1 : 0), html: evHtml, bind: evBind });
}
(function evCss() {
  const s = document.createElement('style');
  s.textContent =
    '.ev-page{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px}' +
    '.ev-box{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:8px 10px}' +
    '.ev-box.ev-an{border-color:rgba(255,214,110,.55);box-shadow:0 0 10px rgba(255,200,90,.15) inset}' +
    '.ev-box h3{margin:0 0 6px;font-size:15px}.ev-row,.ev-now{margin:4px 0;display:flex;flex-wrap:wrap;gap:4px 6px;align-items:center}' +
    '.ev-now b{color:#ffd66e}.ev-hint{opacity:.75;font-size:12px;margin:6px 0 0}.ev-fl{color:#bfe6ff;font-size:16px}' +
    '.ev-ico{width:22px;height:22px}.ev-ico-s{width:14px;height:14px;vertical-align:-2px}' +
    '.ev-shop{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:5px;margin-top:6px}' +
    '.ev-item{display:flex;flex-direction:column;gap:2px;background:rgba(0,0,0,.25);border-radius:6px;padding:5px 6px}' +
    '.ev-item small{opacity:.75;font-size:11px}.ev-item .mini-btn{margin-top:auto}' +
    '.ev-saison{margin:6px 0 0;font-size:13px}';
  document.head.appendChild(s);
})();
