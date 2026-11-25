'use strict';
// Gilden-Inhalte ohne Server (seit 15.83, docs/gilden-inhalte.md; Abschnitt 15 in docs/endgame-langzeit.md).
// Es gibt keinen gemeinsamen Speicher für Gilden (die Gilde steht nur in den Spielständen der Mitglieder, die
// Firebase-Regeln bleiben, wie sie sind). Darum zählt alles, was die gerade eingeloggten Mitglieder beitragen bzw.
// voneinander mitbekommen. Drei Teile:
// 1. Gildenstufen: Jedes Mitglied sammelt Gildenbeitrag im eigenen Spielstand (Monster, Seelensteine, Dungeons und
//    Bosse, Quests, Weltbosse, Gildenboss, Grenzschlacht). Mitglieder im selben Kanal schicken ihre Summe im
//    Spielerzustand mit (Feld gx) und tauschen ihre ganze Liste über den Host aus (onSocial, k: 'gxt'). Jeder merkt
//    sich die zuletzt gesehenen Werte der anderen (p.gx.t). Ein Beitrag wächst nur – zusammengeführt wird mit dem
//    größeren Wert (ein Zähler je Mitglied, der nur steigt). So kommen alle Geräte ohne Server zur selben Summe, und
//    über das Weitergeben der Listen erfährt man auch von Mitgliedern, die man nie gleichzeitig online getroffen hat.
//    Gildenstufe 1–10 aus der Summe; dazu etwas mehr Erfahrung und Gold und Zeichen über dem Namen.
// 2. Gildenhalle und Gildenboss: eine eigene Halle je Gilde (vier Hallen im Fels unter den Arenen, die Gilde wählt
//    ihre über ihren Namen). Einmal in der Woche ruft ein Mitglied dort den Eidwächter Ostrun; alle in der Halle
//    kämpfen, sein Leben wächst mit der Zahl der Kämpfer. Den Boss führt wie jedes Monster der Host des Kanals.
// 3. Grenzschlacht: zweimal am Abend (Weltzeit) 30 Minuten Licht gegen Schatten auf der Turmwiese – drei Fahnen
//    erobern, Bots füllen die Teams auf (Technik aus arena-bots.js), Belohnung in Ehre, Splittern und Gildenbeitrag.
//
// Spielstand p.gx = { g: Gilde, b: eigener Beitrag, k: { Art: Punkte }, t: { Name: [Beitrag, zuletzt gesehen] },
//   x: entfernte Mitglieder (Liste des Anführers), kw: Woche des letzten Siegs über den Gildenboss (der Gilde),
//   bw: Woche der eigenen Belohnung, lv: zuletzt angesagte Gildenstufe, ret: Rückweg aus der Halle,
//   ehre, ehreTot, gs: { i: Termin, n: belohnte Schlachten }, gsN, gsW }

if (typeof SAVE_FIELDS !== 'undefined' && !SAVE_FIELDS.includes('gx')) SAVE_FIELDS.push('gx');

const gxDe = (n) => Math.round(+n || 0).toLocaleString('de-DE');
// Wochennummer nach Weltzeit (Montag 0 Uhr): auf allen Geräten gleich
const GX_WOCHE0 = Date.UTC(2024, 0, 1); // ein Montag
const gxWoche = (t = Date.now()) => Math.floor((t - GX_WOCHE0) / 6048e5);
function gxHash(s) {
  let h = 2166136261;
  for (const ch of String(s)) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return h >>> 0;
}
// Farbton der Gilde wie guildColor (gemeinschaft.js), als Hex in beliebiger Sättigung und Helligkeit
function gxHue(name) {
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 360;
}
function gxHex(h, s, l) {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
  };
  const to = (x) => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, '0');
  return '#' + to(f(0)) + to(f(8)) + to(f(4));
}
const gxEsc = (s) => (typeof escapeHtml === 'function' ? escapeHtml(s) : String(s).replace(/[&<>"']/g, ''));
// Datum und Uhrzeit in der Sprache des Spiels (sprache.js)
const gxLoc = () => (typeof i18n !== 'undefined' && i18n.lang && i18n.lang !== 'de' ? i18n.lang : 'de-DE');

// ======================================================================================================================
// 1. Gildenstufen
// ======================================================================================================================
const GX = {
  // nötiger Beitrag der ganzen Gilde je Stufe (Index = Stufe)
  need: [0, 0, 3000, 10000, 25000, 50000, 90000, 150000, 240000, 360000, 520000],
  // Punkte je Tat: Monster höchstens gap Stufen unter einem (Elite +1), Seelenstein, Dungeon-Boss/Instanz-Wächter,
  // große Bosse (Instanz-Endboss, Endboss der Karte, Turm), Quest, Tagesauftrag, Wochenauftrag, Weltboss, Gildenboss,
  // Grenzschlacht (Sieg/Niederlage)
  pts: { mob: 1, elite: 1, stone: 8, boss: 25, big: 60, quest: 15, tag: 10, woche: 40, wb: 120, gboss: 300, gsWin: 150, gsLoss: 60 },
  gap: 10,
  // Plausibel (ohne Server lässt sich nichts beweisen, aber hochschummeln lässt sich die Gildenstufe so nicht):
  // höchstens perDay Punkte je Tag und Mitglied – beim Sammeln (eigener Zähler je Weltzeit-Tag) wie beim Übernehmen
  // fremder Werte (Zuwachs seit dem letzten bekannten Stand höchstens perDay je vergangenem Tag plus burst); insgesamt
  // nie mehr als perDay je Tag seit Beginn (GX_START). Ein sehr fleißiger Spieler kommt auf etwa 5.000 am Tag.
  perDay: 10000,
  burst: 0.25,
  capEach: 5000000,  // feste Obergrenze je Mitglied (gespeichert)
  // so viel zählt ein Mitglied höchstens für die Gildenstufe (ein Viertel von Stufe 10): Stufe 10 braucht mindestens
  // vier fleißige Mitglieder, ein einzelner (auch einer, der schummelt) bringt die Gilde höchstens auf Stufe 6
  share: 130000,
  maxNames: 40,      // so viele Namen merkt sich die Liste höchstens (eine Gilde hat bis zu 30 Mitglieder)
  nameMax: 16,       // längere Namen gibt es nicht (Charakter- und Gildennamen)
  sendEvery: 90,     // Sekunden zwischen zwei Listen an dasselbe Mitglied (nur wenn sich etwas geändert hat)
  kat: [['m', 'Monster'], ['s', 'Seelensteine'], ['d', 'Dungeons und Bosse'], ['q', 'Quests'], ['w', 'Weltbosse'], ['b', 'Gildenboss'], ['g', 'Grenzschlacht']],
  // Zeichen über dem Namen ab Stufe …
  zeichen: [[3, 'Gildenband'], [5, 'Wappen'], [8, 'Goldrand'], [10, 'Standarte']]
};
// Belohnung je Stufe: +1 % Erfahrung je zwei Stufen, Gold von Monstern ab Stufe 3 (+2 % je zwei Stufen, Stufe 10 +10 %)
const gxEp = (L) => Math.floor(Math.max(0, L) / 2) * 0.01;
const gxGold = (L) => (L >= 10 ? 0.1 : Math.floor((Math.max(1, L) - 1) / 2) * 0.02);
function gxZeichenOf(L) {
  let z = '';
  for (const [lv, name] of GX.zeichen) if (L >= lv) z = name;
  return z;
}
const gxPct = (v) => (v > 0 ? `+${Math.round(v * 100)} %` : '–');
// Beginn der Gildenstufen (Weltzeit): mehr als perDay je Tag seitdem kann niemand gesammelt haben
const GX_START = Date.UTC(2026, 10, 23);
const GX_TAG = 864e5;
const gxCapNow = (t = Date.now()) => Math.min(GX.capEach, GX.perDay * (Math.max(0, Math.floor((t - GX_START) / GX_TAG)) + 1));
const gxTagNr = (t = Date.now()) => Math.floor(t / GX_TAG);
// Name eines Mitglieds: Text, 1–16 Zeichen, keine Steuerzeichen
const gxNameOk = (n) => typeof n === 'string' && n.length >= 1 && n.length <= GX.nameMax && !/[\u0000-\u001f\u007f<>]/.test(n);
// Laufzeit (nicht gespeichert): Version der Liste (für das Verschicken), zwischengespeicherte Stufe und Mitglieder,
// zuletzt geprüfter Spielstand
const gxRun = { ver: 1, lvAt: -1e9, lv: 1, sum: 0, who: null, mem: null, memOf: null, memAt: -1e9, clean: null };
const gxDirty = () => { gxRun.ver++; gxRun.lvAt = -1e9; };
// Namen der aktuellen Mitglieder (eigene Liste der Gilde, gemeinschaft.js); höchstens alle 2 s neu (der Zustand der
// Mitspieler kommt zehnmal je Sekunde)
function gxMembers(p) {
  const g = p && p.guild;
  if (!g) return new Set();
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (gxRun.memOf === g && gxRun.mem && now - gxRun.memAt < 2000) return gxRun.mem;
  const set = new Set();
  if (Array.isArray(g.members)) for (const m of g.members) if (m && gxNameOk(m.n)) set.add(m.n);
  gxRun.mem = set;
  gxRun.memOf = g;
  gxRun.memAt = now;
  return set;
}

function gxState(p) {
  p = p || game.player;
  if (!p) return null;
  if (!p.gx || typeof p.gx !== 'object') p.gx = {};
  const s = p.gx;
  const gn = p.guild && p.guild.name ? String(p.guild.name) : '';
  // andere Gilde als bisher: Beitrag und Liste gehören der alten Gilde (dort bleiben sie bei den anderen Mitgliedern)
  if (gn && s.g !== gn) {
    s.g = gn;
    s.b = 0;
    s.k = {};
    s.t = {};
    s.x = [];
    s.kw = 0;
    s.lv = 0;
    gxDirty();
    gxRun.clean = null;
  }
  // Werte aus dem Spielstand nur einmal prüfen (danach hält gxMerge/gxAdd sie in Ordnung)
  if (gxRun.clean === s) return s;
  gxRun.clean = s;
  const num = (v) => (Number.isFinite(+v) ? +v : 0);
  s.b = Math.max(0, Math.min(GX.capEach, Math.round(num(s.b))));
  if (!s.k || typeof s.k !== 'object' || Array.isArray(s.k)) s.k = {};
  for (const k of Object.keys(s.k)) s.k[k] = Math.max(0, Math.round(num(s.k[k])));
  if (!s.t || typeof s.t !== 'object' || Array.isArray(s.t)) s.t = {};
  for (const n of Object.keys(s.t)) {
    const e = s.t[n];
    if (!gxNameOk(n) || !Array.isArray(e)) { delete s.t[n]; continue; }
    // [Beitrag, zuletzt gesehen, zuletzt gestiegen]
    s.t[n] = [Math.max(0, Math.min(GX.capEach, Math.round(num(e[0])))), Math.max(0, num(e[1])), Math.max(0, num(e[2] != null ? e[2] : e[1]))];
  }
  if (!Array.isArray(s.x)) s.x = [];
  s.x = s.x.filter(gxNameOk).slice(0, 30);
  s.kw = Math.max(0, Math.min(gxWoche(), s.kw | 0));
  s.bw = Math.max(0, s.bw | 0);
  s.dk = s.dk | 0;
  s.dn = Math.max(0, s.dn | 0);
  s.ehre = Math.max(0, s.ehre | 0);
  s.ehreTot = Math.max(0, s.ehreTot | 0);
  return s;
}

// Beitrag gutschreiben (nur in einer Gilde, höchstens GX.perDay je Weltzeit-Tag)
function gxAdd(kat, n) {
  const p = game.player;
  if (!p || !p.guild || !(n > 0) || (typeof WAECHTER !== 'undefined' && WAECHTER)) return;
  const s = gxState(p);
  const tag = gxTagNr();
  if (s.dk !== tag) { s.dk = tag; s.dn = 0; }
  n = Math.min(Math.round(n), GX.perDay - s.dn, gxCapNow() - s.b);
  if (!(n > 0)) return;
  s.dn += n;
  s.b += n;
  s.k[kat] = (s.k[kat] | 0) + n;
  gxDirty();
  if (typeof social !== 'undefined' && social.tab === 'gilde') gxRefreshSoon();
}
// Gegner nicht zu weit unter der eigenen Stufe?
const gxFair = (m) => !!m && (m.level | 0) + GX.gap >= (game.player ? game.player.level : 1);

// Summe der Beiträge der aktuellen Mitglieder (eigener + gemerkte; ohne vom Anführer entfernte)
function gxSum(p = game.player) {
  if (!p || !p.guild) return 0;
  const s = gxState(p);
  const out = new Set([...(s.x || []), ...(p.guild.left || [])]);
  const mem = gxMembers(p);
  let sum = Math.min(GX.share, s.b);
  for (const [n, e] of Object.entries(s.t)) {
    if (n === p.name || out.has(n) || !mem.has(n) || !Array.isArray(e)) continue;
    sum += Math.max(0, Math.min(GX.share, +e[0] || 0));
  }
  return sum;
}
function gxLevelOf(sum) {
  let L = 1;
  for (let i = 2; i < GX.need.length; i++) if (sum >= GX.need[i]) L = i;
  return L;
}
// Gildenstufe der eigenen Gilde (zwischengespeichert; neu nach einer Änderung oder alle 5 s)
function gxLevel(p = game.player) {
  if (!p || !p.guild) return 0;
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (gxRun.who === p && now - gxRun.lvAt < 5000) return gxRun.lv;
  gxRun.who = p;
  gxRun.lvAt = now;
  gxRun.sum = gxSum(p);
  const L = gxLevelOf(gxRun.sum);
  const was = gxRun.lv;
  gxRun.lv = L;
  if (L !== was && typeof game !== 'undefined' && game.stats && p === game.player) {
    // Gold von Monstern steckt in den Werten (playerStats unten)
    if (typeof recalcStats === 'function') recalcStats();
    else game.stats = playerStats(p);
  }
  gxAnnounce(p, L);
  return L;
}
// neue Gildenstufe ansagen (einmal je Stufe; beim ersten Laden still)
function gxAnnounce(p, L) {
  const s = gxState(p);
  if (!s || !game.running) return;
  if (!s.lv) { s.lv = L; return; }
  if (L <= s.lv) return;
  s.lv = L;
  const z = GX.zeichen.find((x) => x[0] === L);
  ui.banner('Gildenstufe ' + L, p.guild.name);
  ui.log(['Gildenstufe ' + L, p.guild.name, gxEp(L) > gxEp(L - 1) ? `Erfahrung ${gxPct(gxEp(L))}` : '', gxGold(L) > gxGold(L - 1) ? `Gold von Monstern ${gxPct(gxGold(L))}` : '', z ? `Neues Zeichen: ${z[1]}` : ''].filter(Boolean).join(' · '), 'level');
  if (typeof vfxPowerUp === 'function') vfxPowerUp(p, '#7fe8d0');
  saveGame();
}

// --- Beitrag aus dem Spiel -------------------------------------------------------------------------------------------
// Monster und Seelensteine (questEvent, wie Tages- und Wochenaufträge); Bosse zählen über ihre Beute
const _gxQuestEvent = questEvent;
// eslint-disable-next-line no-global-assign
questEvent = function (kind, m) {
  _gxQuestEvent(kind, m);
  try {
    const p = game.player;
    if (!p || !p.guild || !m || !gxFair(m)) return;
    if (kind === 'stone') gxAdd('s', GX.pts.stone);
    else if (kind === 'kill') {
      const t = m.type || {};
      if (t.boss || t.raid || t.weltboss || t.gildenboss || t.crystal) return;
      gxAdd('m', GX.pts.mob + (m.elite80 ? GX.pts.elite : 0));
    }
  } catch (err) { /* ein Fehler hier darf den Kampf nie aufhalten */ }
};
// Dungeon-Bosse (bossLoot; Weltbosse leitet weltboss.js an weltbossLoot weiter)
const _gxBossLoot = bossLoot;
// eslint-disable-next-line no-global-assign
bossLoot = function (m) {
  const r = _gxBossLoot(m);
  try { if (m && m.type && !m.type.weltboss && gxFair(m)) gxAdd('d', GX.pts.boss); } catch (err) { /* weiter */ }
  return r;
};
if (typeof weltbossLoot === 'function') {
  const _gxWbLoot = weltbossLoot;
  // eslint-disable-next-line no-global-assign
  weltbossLoot = function (m) {
    const r = _gxWbLoot(m);
    try { gxAdd('w', GX.pts.wb); } catch (err) { /* weiter */ }
    return r;
  };
}
// Wächter und Bosse der Instanzen, dazu der Endboss einer Instanz
if (typeof instLoot === 'function') {
  const _gxInstLoot = instLoot;
  // eslint-disable-next-line no-global-assign
  instLoot = function (m) {
    const r = _gxInstLoot(m);
    try { if (gxFair(m)) gxAdd('d', GX.pts.boss); } catch (err) { /* weiter */ }
    return r;
  };
}
if (typeof instFinalLoot === 'function') {
  const _gxInstFinal = instFinalLoot;
  // eslint-disable-next-line no-global-assign
  instFinalLoot = function (m, def) {
    const r = _gxInstFinal(m, def);
    try { if (gxFair(m)) gxAdd('d', GX.pts.big); } catch (err) { /* weiter */ }
    return r;
  };
}
if (typeof turmFinalLoot === 'function') {
  const _gxTurmFinal = turmFinalLoot;
  // eslint-disable-next-line no-global-assign
  turmFinalLoot = function (m) {
    const r = _gxTurmFinal(m);
    try { gxAdd('d', GX.pts.big); } catch (err) { /* weiter */ }
    return r;
  };
}
// Endbosse der Karten (raidLoot); der Gildenboss hat seine eigene Beute (gbLoot, unten)
const _gxRaidLoot = raidLoot;
// eslint-disable-next-line no-global-assign
raidLoot = function (m) {
  if (m && m.type && m.type.gildenboss) return gbLoot(m);
  const r = _gxRaidLoot(m);
  try { if (gxFair(m)) gxAdd('d', GX.pts.big); } catch (err) { /* weiter */ }
  return r;
};
// Quests: jede Abgabe (Hauptquest, Nebenquest, Jagd, Nachtjagd, Stallmeister, Endboss-Auftrag) und Tages-/Wochenaufträge
if (typeof giveReward === 'function') {
  const _gxGiveReward = giveReward;
  // eslint-disable-next-line no-global-assign
  giveReward = function (reward, xp, big) {
    const r = _gxGiveReward(reward, xp, big);
    try { gxAdd('q', GX.pts.quest); } catch (err) { /* weiter */ }
    return r;
  };
}
if (typeof aufgDone === 'function') {
  const _gxAufgDone = aufgDone;
  // eslint-disable-next-line no-global-assign
  aufgDone = function (art, e) {
    const r = _gxAufgDone(art, e);
    try { gxAdd('q', art === 'tag' ? GX.pts.tag : GX.pts.woche); } catch (err) { /* weiter */ }
    return r;
  };
}

// --- Wirkung: Erfahrung und Gold ---------------------------------------------------------------------------------------
const _gxGainXp = gainXp;
// eslint-disable-next-line no-global-assign
gainXp = function (amount) {
  const p = game.player;
  const b = amount > 0 && p && p.guild ? gxEp(gxLevel(p)) : 0;
  return _gxGainXp(b ? Math.round(amount * (1 + b)) : amount);
};
const _gxPlayerStats = playerStats;
// eslint-disable-next-line no-global-assign
playerStats = function (p) {
  const s = _gxPlayerStats(p);
  if (p && p === game.player && p.guild && gxRun.who === p) {
    const g = gxGold(gxRun.lv);
    if (g > 0) s.goldFind = (s.goldFind || 0) + g;
    s.gxGold = g;
  }
  return s;
};

// --- Netz: Summe im Spielerzustand, ganze Liste über den Host -------------------------------------------------------------
// Höchster glaubhafter Stand, wenn zuletzt `prev` (gestiegen um `setAt`) bekannt war: Zuwachs höchstens perDay je
// vergangenem Tag plus burst, insgesamt nie mehr als gxCapNow()
function gxAllowed(prev, setAt, now = Date.now()) {
  const days = Math.max(0, now - (setAt || now)) / GX_TAG;
  return Math.min(gxCapNow(now), prev + GX.perDay * (days + GX.burst));
}
// Ein Wert von außen (nur für Mitglieder): endliche Zahl ≥ 0, nur größer werden, glaubhaft begrenzt;
// „zuletzt gesehen“ höchstens einmal je Minute auffrischen
function gxMerge(s, name, b, at) {
  if (!gxNameOk(name)) return false;
  const now = Date.now();
  b = Number.isFinite(+b) ? Math.max(0, Math.round(+b)) : 0;
  at = Number.isFinite(+at) ? Math.max(0, Math.min(now, +at)) : 0;
  const e = s.t[name];
  if (!Array.isArray(e)) {
    if (Object.keys(s.t).length >= GX.maxNames) return false;
    s.t[name] = [Math.min(b, gxCapNow(now)), at, now];
    gxDirty();
    return true;
  }
  const old = +e[0] || 0;
  if (b > old) {
    const nb = Math.round(Math.min(b, gxAllowed(old, +e[2] || +e[1] || 0, now)));
    if (nb > old) {
      e[0] = nb;
      e[1] = Math.max(+e[1] || 0, at);
      e[2] = now;
      gxDirty();
      return true;
    }
  }
  if (at > (+e[1] || 0) + 60000) e[1] = at;
  return false;
}
// Ist der Mitspieler (Kennung aus der Verbindung) ein Mitglied der eigenen Gilde? Sein Zustand muss die Gilde nennen
// und sein echter Name in der eigenen Mitgliederliste stehen – wer nur den Gildennamen trägt, zählt nicht.
function gxMate(rp, p = game.player) {
  if (!rp || rp.gone || !p || !p.guild || rp.guild !== p.guild.name) return false;
  const n = rp.realName || rp.name;
  return gxNameOk(n) && n !== p.name && gxMembers(p).has(n);
}
if (typeof netPlayerState === 'function') {
  const _gxNetState = netPlayerState;
  // eslint-disable-next-line no-global-assign
  netPlayerState = function () {
    const st = _gxNetState();
    const p = game.player;
    if (p && p.guild && !(typeof WAECHTER !== 'undefined' && WAECHTER)) {
      const s = gxState(p);
      st.gx = [s.b, gxLevel(p), s.kw];
    }
    return st;
  };
}
if (typeof netApplyState === 'function') {
  const _gxNetApply = netApplyState;
  // eslint-disable-next-line no-global-assign
  netApplyState = function (rp, st) {
    const r = _gxNetApply(rp, st);
    try { if (rp && st) gxSeen(rp, st); } catch (err) { /* ältere Versionen schicken kein gx */ }
    return r;
  };
}
// Zustand eines Mitspielers: Gildenstufe für sein Zeichen, bei der eigenen Gilde seinen Beitrag merken
function gxSeen(rp, st) {
  const a = Array.isArray(st.gx) && st.gx.length <= 4 ? st.gx : null;
  // Stufe für das Zeichen über dem Kopf (nur Anzeige)
  rp.gxLv = a && rp.guild && Number.isFinite(+a[1]) ? Math.max(1, Math.min(10, a[1] | 0)) : 0;
  const p = game.player;
  if (!a || !gxMate(rp, p)) return;
  const s = gxState(p);
  gxMerge(s, rp.realName || rp.name, a[0], Date.now());
  const kw = Number.isFinite(+a[2]) ? a[2] | 0 : 0;
  if (kw > s.kw && kw <= gxWoche()) { s.kw = kw; gxDirty(); }
  // beim ersten Sehen in dieser Sitzung die eigene Liste schicken
  if (!rp.gxSent) gxSendTable(rp.peerId, rp);
}
function gxTableMsg(p) {
  const s = gxState(p);
  const mem = gxMembers(p);
  const t = {};
  t[p.name] = [s.b, Date.now()];
  let n = 1;
  for (const [name, e] of Object.entries(s.t)) {
    if (name === p.name || !mem.has(name) || !Array.isArray(e) || ++n > GX.maxNames) continue;
    t[name] = [+e[0] || 0, +e[1] || 0];
  }
  const d = { k: 'gxt', g: p.guild.name, t, kw: s.kw };
  if (p.guild.leader === p.name) d.x = (p.guild.left || []).filter(gxNameOk).slice(0, 30);
  return d;
}
function gxSendTable(pid, rp) {
  const p = game.player;
  if (!p || !p.guild || !pid || typeof netOnline !== 'function' || !netOnline()) return;
  if (rp) {
    rp.gxSent = 1;
    rp.gxVer = gxRun.ver;
    rp.gxAt = Date.now();
  }
  netSocial(pid, gxTableMsg(p));
}
// Liste eines Mitglieds (Absender aus der Verbindung, nur Mitglieder der eigenen Gilde): jeden Wert eines Mitglieds
// zusammenführen (größerer gewinnt, glaubhaft begrenzt), entfernte Mitglieder nur vom Anführer
function gxOnTable(pid, d) {
  const p = game.player;
  if (!p || !p.guild || !d || d.g !== p.guild.name || !d.t || typeof d.t !== 'object' || Array.isArray(d.t)) return;
  const rp = net.players.get(pid);
  if (!gxMate(rp, p)) return;
  const s = gxState(p);
  const mem = gxMembers(p);
  const sender = rp.realName || rp.name;
  let n = 0;
  for (const name of Object.keys(d.t)) {
    if (++n > GX.maxNames + 1) break;
    const e = d.t[name];
    // den eigenen Beitrag kennt nur das eigene Gerät (Spielstand, Cloud) – fremde Angaben dazu zählen nicht
    if (!gxNameOk(name) || !Array.isArray(e) || e.length > 3 || name === p.name || !mem.has(name)) continue;
    // den eigenen Wert meldet der Absender direkt (jetzt gesehen), die übrigen mit ihrer Zeit
    gxMerge(s, name, e[0], name === sender ? Date.now() : e[1]);
  }
  const kw = Number.isFinite(+d.kw) ? d.kw | 0 : 0;
  if (kw > s.kw && kw <= gxWoche()) { s.kw = kw; gxDirty(); }
  if (Array.isArray(d.x) && sender === p.guild.leader) s.x = d.x.filter(gxNameOk).slice(0, 30);
  // noch keine Liste von uns: zurückschicken
  if (!rp.gxSent) gxSendTable(pid, rp);
  gxRefreshSoon();
}
// alle 5 s: geänderte Liste an Mitglieder im Kanal (höchstens alle GX.sendEvery Sekunden je Mitglied)
setInterval(() => {
  try {
    const p = game.player;
    if (!p || !p.guild || !game.running || typeof netOnline !== 'function' || !netOnline()) return;
    const now = Date.now();
    for (const [pid, rp] of net.players) {
      if (!gxMate(rp, p)) continue;
      if (rp.gxSent && (rp.gxVer === gxRun.ver || now - (rp.gxAt || 0) < GX.sendEvery * 1000)) continue;
      gxSendTable(pid, rp);
    }
  } catch (err) { /* nächster Takt */ }
}, 5000);
let gxRefreshT = 0;
function gxRefreshSoon() {
  if (gxRefreshT) return;
  gxRefreshT = setTimeout(() => {
    gxRefreshT = 0;
    if (typeof social !== 'undefined' && social.refresh) social.refresh();
  }, 700);
}

// --- Zeichen über dem Namen (2D und 3D, drawLabel in zeichnen.js) -----------------------------------------------------
// Ab Stufe 3 ein Band in der Gildenfarbe hinter dem Gildennamen, ab 5 ein Wappen davor, ab 8 mit Goldrand, auf Stufe 10
// eine kleine Standarte darüber. Ein fertiges Bild je Gilde und Stufe (labelBild), am Namen ausgerichtet.
function gxBannerBild(L, gname, text) {
  return labelBild('gxb|' + L + '|' + gname + '|' + text, (m) => {
    const font = labelFont('700', 9);
    m.font = font;
    const w = m.measureText('‹' + text + '›').width;
    const hw = w / 2 + 5;
    const hue = gxHue(gname);
    const band = gxHex(hue, 42, 20);
    const shield = gxHex(hue, 60, 52);
    const shieldD = gxHex(hue, 55, 30);
    const gold = L >= 8;
    const wx = -hw - 9;
    return {
      x0: (L >= 5 ? wx - 7 : -hw - 5) - 2, y0: L >= 10 ? -30 : -14, x1: hw + 6, y1: 6,
      paint: (g) => {
        g.lineJoin = 'round';
        // Band mit Schwalbenschwanz an beiden Enden
        g.beginPath();
        g.moveTo(-hw - 4, -9);
        g.lineTo(hw + 4, -9);
        g.lineTo(hw + 1, -3);
        g.lineTo(hw + 4, 3);
        g.lineTo(-hw - 4, 3);
        g.lineTo(-hw - 1, -3);
        g.closePath();
        g.globalAlpha = 0.88;
        g.fillStyle = band;
        g.fill();
        g.globalAlpha = 1;
        g.lineWidth = gold ? 1.3 : 1;
        g.strokeStyle = gold ? '#e8c060' : 'rgba(10,8,6,0.85)';
        g.stroke();
        if (L >= 5) {
          // Wappen: Schild in der Gildenfarbe mit dunklem Sparren
          const sh = () => {
            g.beginPath();
            g.moveTo(wx - 5.5, -10);
            g.lineTo(wx + 5.5, -10);
            g.lineTo(wx + 5.5, -3);
            g.quadraticCurveTo(wx + 5, 2.5, wx, 5);
            g.quadraticCurveTo(wx - 5, 2.5, wx - 5.5, -3);
            g.closePath();
          };
          sh();
          g.fillStyle = shield;
          g.fill();
          g.save();
          sh();
          g.clip();
          g.fillStyle = shieldD;
          g.beginPath();
          g.moveTo(wx - 6, -1);
          g.lineTo(wx, -6.5);
          g.lineTo(wx + 6, -1);
          g.lineTo(wx + 6, 2.5);
          g.lineTo(wx, -3);
          g.lineTo(wx - 6, 2.5);
          g.closePath();
          g.fill();
          g.restore();
          sh();
          g.lineWidth = gold ? 1.3 : 1;
          g.strokeStyle = gold ? '#e8c060' : 'rgba(10,8,6,0.9)';
          g.stroke();
        }
        if (L >= 10) {
          // Standarte: Stange mit Knauf und Wimpel
          g.strokeStyle = 'rgba(10,8,6,0.9)';
          g.lineWidth = 2.6;
          g.beginPath();
          g.moveTo(0, -9);
          g.lineTo(0, -27);
          g.stroke();
          g.strokeStyle = '#e8c060';
          g.lineWidth = 1.2;
          g.beginPath();
          g.moveTo(0, -9);
          g.lineTo(0, -27);
          g.stroke();
          g.beginPath();
          g.moveTo(0.6, -26);
          g.quadraticCurveTo(7, -25.5, 13, -22);
          g.quadraticCurveTo(7, -19.5, 0.6, -17.5);
          g.closePath();
          g.fillStyle = shield;
          g.fill();
          g.lineWidth = 1;
          g.strokeStyle = '#e8c060';
          g.stroke();
          g.fillStyle = '#ffe7a0';
          g.beginPath();
          g.arc(0, -28, 1.7, 0, Math.PI * 2);
          g.fill();
        }
      }
    };
  });
}
function gxDrawBanner(ctx, e) {
  const p = game.player;
  if (!e || !(e === p || e.remote) || e.abot) return;
  if (e.remote && typeof remoteHidden === 'function' && remoteHidden(e)) return;
  if (e.blinkHide > game.time) return;
  const gname = (e === p ? (p.guild ? p.guild.name : '') : e.guild) || '';
  if (!gname) return;
  const L = e === p ? gxLevel(p) : e.gxLv | 0;
  if (L < 3) return;
  const ttl = typeof erfTitelOf === 'function' ? erfTitelOf(e) : '';
  const text = ttl ? `«${ttl}» · ${gname}` : gname;
  const mate = !!(e.remote && typeof inMyParty === 'function' && inMyParty(e.name));
  // dieselbe Höhe wie der Name in drawLabel (zeichnen.js)
  const y = feetY(e) - (e.classId === 'magier' ? 68 : 60) * (V3.on ? 1 : lookSize(e.look)) - (V3.on && e.riding && rideTierOf(e) === 3 ? 14 : rideHeight(e));
  const gy = y - (mate ? 14 : 11) - 10;
  const al = (e === p ? game.stats && game.stats.invisible : e.invisible) ? 0.5 : 1;
  // fertiges Bild am Spieler gemerkt (wie das Namensschild, e.__plb)
  const s = labelScale();
  let c = e.__gxb;
  if (!c || c.L !== L || c.t !== text || c.s !== s || c.gen !== LABEL_FONT.gen) c = e.__gxb = { L, t: text, s, gen: LABEL_FONT.gen, lab: gxBannerBild(L, gname, text) };
  ovImg(ctx, c.lab, e.x, gy, al);
}
if (typeof drawLabel === 'function') {
  const _gxDrawLabel = drawLabel;
  // eslint-disable-next-line no-global-assign
  drawLabel = function (ctx, e) {
    try { gxDrawBanner(ctx, e); } catch (err) { /* ohne Zeichen weiter */ }
    return _gxDrawLabel(ctx, e);
  };
}

// --- Gildenfenster (Freunde & Gilde, Reiter „Gilde“): Stufe, Beiträge, Gildenboss, Grenzschlacht ------------------------
const gxUi = { open: false };
function gxWhen(t) {
  if (!t) return 'noch nicht gesehen';
  const d = Math.floor((Date.now() - t) / GX_TAG);
  return d <= 0 ? 'heute' : d === 1 ? 'gestern' : `vor ${d} Tagen`;
}
// Meldung im offenen Gildenfenster, sonst im Chat (System)
function gxMsg(text, type = 'info') {
  const el = document.getElementById('panelSocial');
  if (el && !el.hidden && typeof social !== 'undefined' && social.message) social.message(text, type);
  ui.log(text, type);
}
function gxPanelHtml(p) {
  const s = gxState(p);
  const L = gxLevel(p);
  const sum = gxRun.sum;
  const next = L < 10 ? GX.need[L + 1] : 0;
  const prev = GX.need[L] || 0;
  const pct = L < 10 ? Math.max(0, Math.min(100, ((sum - prev) / Math.max(1, next - prev)) * 100)) : 100;
  const z = gxZeichenOf(L);
  const hue = gxHue(p.guild.name);
  let h = `<section class="gx-box gx-stufe" style="--gxc:${gxHex(hue, 60, 55)};--gxd:${gxHex(hue, 42, 20)}"><div class="gx-lv"><span class="gx-num">${L}</span><div class="gx-lvt">` +
    `<b>Gildenstufe ${L}</b><small>${L < 10 ? `Gildenbeitrag ${gxDe(sum)} / ${gxDe(next)}` : `Gildenbeitrag ${gxDe(sum)}`}</small>` +
    `<span class="gx-bar"><i style="width:${pct.toFixed(1)}%"></i></span></div></div>` +
    `<p class="gx-row"><span>Erfahrung</span> <b>${gxPct(gxEp(L))}</b> <span>Gold von Monstern</span> <b>${gxPct(gxGold(L))}</b>` +
    `${z ? ` <span>Zeichen</span> <b>${z}</b>` : ''}</p>`;
  if (L < 10) {
    const nz = GX.zeichen.find((x) => x[0] === L + 1);
    const bits = [];
    if (gxEp(L + 1) > gxEp(L)) bits.push(`<span>Erfahrung</span> <b>${gxPct(gxEp(L + 1))}</b>`);
    if (gxGold(L + 1) > gxGold(L)) bits.push(`<span>Gold von Monstern</span> <b>${gxPct(gxGold(L + 1))}</b>`);
    if (nz) bits.push(`<span>Zeichen</span> <b>${nz[1]}</b>`);
    h += `<p class="gx-next"><span>Auf Stufe ${L + 1}</span> ${bits.join(' ') || '<b>–</b>'}</p>`;
  } else h += '<p class="gx-next"><b>Höchste Gildenstufe</b></p>';
  h += '</section>';
  // Beiträge der Mitglieder, nach Größe
  const rows = [{ n: p.name, b: s.b, me: true }];
  for (const n of gxMembers(p)) {
    if (n === p.name) continue;
    const e = s.t[n];
    rows.push({ n, b: e ? +e[0] || 0 : 0, t: e ? +e[1] || 0 : 0, on: !!(typeof onlinePlayer === 'function' && onlinePlayer(n)) });
  }
  rows.sort((a, b) => b.b - a.b);
  h += `<details class="gx-det"${gxUi.open ? ' open' : ''}><summary>Beiträge der Mitglieder <small>${rows.length}</small></summary><div class="gx-list">` +
    rows.map((r, i) => `<div class="gx-li${r.me ? ' me' : ''}"><span class="gx-rk">${i + 1}</span><span class="gx-nm">${gxEsc(r.n)}${r.me ? ' <small>(du)</small>' : ''}</span>` +
      `<b class="gx-b">${gxDe(r.b)}</b><small class="gx-t">${r.me ? '' : r.on ? 'online' : gxWhen(r.t)}</small></div>`).join('') + '</div>';
  const mine = GX.kat.filter(([k]) => s.k[k] > 0).map(([k, name]) => `<span>${name}</span> <b>${gxDe(s.k[k])}</b>`);
  h += `<p class="gx-mine"><span>Dein Beitrag</span>${mine.length ? ' · ' + mine.join(' · ') : ' <b>0</b>'}</p>` +
    '<p class="hint-text">Ohne Server: Es zählt, was du von den anderen Mitgliedern weißt. Seid ihr zusammen in einem Kanal, gleichen eure Geräte die Beiträge ab – auch die von Mitgliedern, die gerade nicht da sind. Ein Mitglied sammelt höchstens 10.000 Punkte am Tag und zählt für die Gildenstufe höchstens 130.000.</p></details>';
  return h + gbPanelHtml(p) + gsPanelHtml(p);
}
function gxAfterRender(S) {
  const p = game.player;
  const body = document.getElementById('socialBody');
  if (!p || !body || S.tab !== 'gilde' || !p.guild) return;
  gxCss();
  const head = body.querySelector('.guild-head');
  if (!head) return;
  head.insertAdjacentHTML('afterend', `<div class="gx-wrap">${gxPanelHtml(p)}</div>`);
  const wrap = head.nextElementSibling;
  const det = wrap && wrap.querySelector('.gx-det');
  if (det) det.addEventListener('toggle', () => { gxUi.open = det.open; });
  if (wrap) gxBind(wrap);
}
function gxBind(root) {
  root.querySelectorAll('[data-gx]').forEach((b) => b.addEventListener('click', (ev) => {
    ev.stopPropagation();
    gxAction(b.dataset.gx);
  }));
}
function gxAction(a) {
  if (a === 'halle') ghEnter();
  else if (a === 'raus') ghLeave();
  else if (a === 'ruf') gbSummon();
  else if (a === 'gs') gsJoin();
  else if (a === 'gsinfo') { gsOpenInfo(); return; }
  if (typeof social !== 'undefined' && social.refresh) social.refresh();
  ghHudKey = '';
}
if (typeof social !== 'undefined' && typeof social.render === 'function') {
  const _gxSocialRender = social.render;
  social.render = function () {
    _gxSocialRender.call(this);
    try { gxAfterRender(this); } catch (err) { console.warn('Gilden-Inhalte:', err); }
  };
}

// ======================================================================================================================
// 2. Gildenhalle und Gildenboss
// ======================================================================================================================
// Vier Hallen im Fels unter den Hallen der Arenen (Kacheln x 1532–1848, y 1232–1267; unter den Feldern der Rissläufe, die bis y 1212 reichen). Jede Gilde hat
// ihre Halle über ihren Namen (gxHash % slots) – teilen sich zwei Gilden im selben Kanal eine Halle, stört das nicht
// (ein Boss je Halle, die Belohnung bekommt die Gilde der Halle). Die Hallen liegen 92 Kacheln auseinander: weiter als
// Endboss-Angriffe reichen (RAID_REACH, BSK.reach), damit ein Boss nie in die Nachbarhalle trifft.
const GH = {
  slots: 4, x0: WORLD_W + 452, y0: DUNGEON_H + 932, w: 41, h: 36, pitch: 92, hw: 18, hh: 13, corner: 5,
  theme: '#5a5a66|#c9a35a|#5fe0c8', fire: '#ffc86a', gate: '#7fe8d0',
  wall: { top: '#4a4a56', face: '#22222a', line: '#5fe0c8' }
};
const GH_ZONE = {
  id: 'gildenhalle', name: 'Gildenhalle', levels: 'Halle des Bundes · nur für Gildenmitglieder', ground: 'FLAGSTONE',
  ambient: { kind: 'dust', tint: [40, 70, 80, 0.05] }, wallLook: { wall: GH.wall, id: 'gildenhalle' }
};
ZONES.push(GH_ZONE);
const GH_ZI = ZONES.length - 1;
if (typeof MOOD3 !== 'undefined') MOOD3.gildenhalle = { sky: '#3a4650', sun: '#ffe8c0', sunI: 0.84, hemi: '#e0eef0', ground: '#3a3a42', hemiI: 0.64, near: 26, far: 60 };

function ghRect(s) {
  const x = GH.x0 + s * GH.pitch;
  const y = GH.y0;
  return { x, y, w: GH.w, h: GH.h, cx: x + 20.5, cy: y + 16.5 };
}
const GH_BOX = { x0: GH.x0, y0: GH.y0, x1: GH.x0 + (GH.slots - 1) * GH.pitch + GH.w, y1: GH.y0 + GH.h };
// Halle, in der der Punkt (Pixel) liegt, sonst -1
function ghSlotAt(px, py) {
  const tx = px / TILE;
  const ty = py / TILE;
  if (!(tx >= GH_BOX.x0 && ty >= GH_BOX.y0 && tx < GH_BOX.x1 && ty < GH_BOX.y1)) return -1;
  const s = Math.floor((tx - GH.x0) / GH.pitch);
  return s >= 0 && s < GH.slots && tx < GH.x0 + s * GH.pitch + GH.w ? s : -1;
}
const ghSlotOf = (name) => gxHash(name) % GH.slots;
// Kachel auf dem Boden der Halle? Rechteck mit runden Ecken, im Süden eine Nische mit dem Tor
function ghInHall(s, tx, ty) {
  const R = ghRect(s);
  const dx = Math.abs(tx + 0.5 - R.cx);
  const dy = ty + 0.5 - R.cy;
  if (dx <= 2.5 && dy > GH.hh - 1 && dy <= GH.hh + 3.6) return true;
  const ady = Math.abs(dy);
  if (dx > GH.hw || ady > GH.hh) return false;
  const k = GH.corner;
  if (dx > GH.hw - k && ady > GH.hh - k) return hyp(dx - (GH.hw - k), ady - (GH.hh - k)) <= k;
  return true;
}
// Stellen (Pixel): Ankunft, Boss, Tor
function ghSpot(s, what) {
  const R = ghRect(s);
  const dy = what === 'boss' ? -3 : what === 'portal' ? GH.hh + 2.3 : GH.hh - 3;
  return { x: R.cx * TILE, y: (R.cy + dy) * TILE };
}
function ghBuild(w) {
  const P = (x, y) => ({ x: x * TILE, y: y * TILE });
  const G = GROUND;
  const block = (x, y) => { w.obj[Math.floor(y) * MAP_W + Math.floor(x)] = OBJ.PILLAR; };
  for (let s = 0; s < GH.slots; s++) {
    const R = ghRect(s);
    for (let y = R.y; y < R.y + R.h; y++) {
      for (let x = R.x; x < R.x + R.w; x++) {
        const i = y * MAP_W + x;
        w.zoneIdx[i] = GH_ZI;
        w.deco[i] = DECO.NONE;
        if (!ghInHall(s, x, y)) {
          w.obj[i] = OBJ.CAVEWALL;
          w.ground[i] = G.CAVE;
          continue;
        }
        w.obj[i] = OBJ.NONE;
        const dx = x + 0.5 - R.cx;
        const dy = y + 0.5 - R.cy;
        // Steinplatten, ein Läufer vom Tor zur Mitte, der Platz des Bundes in der Mitte, helle Platten in der Nische
        let g = G.FLAGSTONE;
        if (Math.abs(dx) <= 1.6 && dy > 4) g = G.PATH;
        if (hyp(dx, dy * 1.2) <= 7.5 || dy > GH.hh - 0.5) g = G.PLAZA;
        w.ground[i] = g;
        if (g === G.FLAGSTONE && tileHash(x, y) % 23 === 0) w.deco[i] = DECO.CRACK;
      }
    }
    // zwei Reihen Säulen, Feuerbecken, Banner an den Wänden, Thron der Gilde im Norden, Wächterstatuen, Tor im Süden
    for (const sx of [-1, 1]) {
      for (const dy of [-8, -2, 4, 10]) {
        const tx = Math.floor(R.cx + sx * 12);
        const ty = Math.floor(R.cy + dy);
        block(tx, ty);
        w.props.push({ type: 'dpillar', roof: GH.theme, ...P(tx + 0.5, ty + 0.75) });
      }
    }
    for (const [dx, dy] of [[-8, -10], [8, -10], [-8, 8], [8, 8], [-3.5, 11.5], [3.5, 11.5]]) w.props.push({ type: 'brazier', roof: GH.fire, ...P(R.cx + dx, R.cy + dy + 0.4) });
    for (const dx of [-14, -6, 6, 14]) w.props.push({ type: 'dbanner', roof: GH.theme, ...P(R.cx + dx, R.cy - GH.hh + 0.4) });
    for (const sx of [-1, 1]) for (const dy of [-5, 7]) w.props.push({ type: 'dbanner', roof: GH.theme, ...P(R.cx + sx * (GH.hw - 0.6), R.cy + dy), rot: -sx * Math.PI / 2 });
    block(R.cx, R.cy - GH.hh + 1.2);
    w.props.push({ type: 'dthrone', roof: GH.theme, ...P(R.cx, R.cy - GH.hh + 1.6) });
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const x = R.cx + sx * (GH.hw - 2.8);
        const y = R.cy + sy * (GH.hh - 2.8);
        block(x, y);
        w.props.push({ type: 'dstatue', roof: GH.theme, ...P(x, y + 0.3) });
      }
    }
    w.props.push({ type: 'portal', ...P(R.cx, R.cy + GH.hh + 2.7) });
  }
}
const _ghGenerateWorld = generateWorld;
// eslint-disable-next-line no-global-assign
generateWorld = function () {
  const w = _ghGenerateWorld();
  try { ghBuild(w); } catch (err) { console.warn('Gildenhalle:', err); }
  return w;
};
// kleine und große Karte: die Halle als eigenes Gebiet (wie die Hallen der Arenen, karte.js)
if (typeof mapAreaAt === 'function') {
  const _ghMapAreaAt = mapAreaAt;
  // eslint-disable-next-line no-global-assign
  mapAreaAt = function (tx, ty) {
    const s = ghSlotAt(tx * TILE, ty * TILE);
    if (s >= 0) {
      const R = ghRect(s);
      return { key: 'gh' + s, x: R.x, y: R.y, w: R.w, h: R.h, wm: null, dungeon: -1 };
    }
    return _ghMapAreaAt(tx, ty);
  };
}
// Rückweg aus der Halle: dorthin, wo man hereinkam, sonst in die Stadt der eigenen Seite
function ghReturnSpot(p) {
  const r = p && p.gx && p.gx.ret;
  if (r && Number.isFinite(r.x) && Number.isFinite(r.y) && ghSlotAt(r.x, r.y) < 0 && typeof canStand === 'function' && canStand(r.x, r.y, 11, false)) return { x: r.x, y: r.y };
  const f = typeof factionOf === 'function' ? factionOf(p) : 'licht';
  const home = typeof factionHomeMap === 'function' ? factionHomeMap(f, p ? p.level : 1) : 1;
  return typeof mapSpawnSpot === 'function' ? mapSpawnSpot(home) : { x: CENTER_X * TILE, y: (CENTER_Y + 1) * TILE };
}
// Wiederbeleben „in der Stadt“ aus der Halle: zurück an den Rückweg
const _ghVillageSpawn = villageSpawn;
// eslint-disable-next-line no-global-assign
villageSpawn = function (p) {
  if (p && ghSlotAt(p.x, p.y) >= 0) return ghReturnSpot(p);
  return _ghVillageSpawn(p);
};
function ghBlock(p) {
  if (!p || !p.guild) return 'Du bist in keiner Gilde.';
  if (p.dead) return 'Erst wieder auf die Beine kommen.';
  if (game.pvpMatch) return 'Nicht während eines Kampfes in der Turnierarena.';
  if (game.arenaRun) return 'Nicht während eines Laufs in der Prüfungsarena.';
  if (game.duel) return 'Nicht während eines Duells.';
  if (game.turmRun) return 'Nicht während eines Gangs durch den Turm.';
  if (typeof MAPLOAD !== 'undefined' && MAPLOAD.on) return 'Einen Moment …';
  if (game.time - (p.lastCombat || -99) < 6) return 'Nicht mitten im Kampf.';
  return '';
}
function ghWarp(spot) {
  const p = game.player;
  p.dash = null;
  p.leap = null;
  p.x = spot.x;
  p.y = spot.y;
  if (typeof setTarget === 'function') setTarget(null);
  else game.target = null;
  game.allies.forEach((a) => { a.x = p.x; a.y = p.y; });
  ui.closePanels();
  if (typeof pcard !== 'undefined' && pcard.close) pcard.close();
  vfxPillar(p, GH.gate, 1);
  if (!V3.on) flashScreen(GH.gate, 0.2);
  if (typeof sfxFiles !== 'undefined') sfxFiles.play('portal', { vol: 0.6, rev: 0.3 });
  saveGame();
}
function ghEnter() {
  const p = game.player;
  const why = ghBlock(p);
  if (why) {
    gxMsg(why, 'warn');
    return false;
  }
  const s = ghSlotOf(p.guild.name);
  if (ghSlotAt(p.x, p.y) === s) return false;
  const g = gxState(p);
  if (ghSlotAt(p.x, p.y) < 0) g.ret = { x: Math.round(p.x), y: Math.round(p.y) };
  ghWarp(ghSpot(s, 'entry'));
  ui.banner('Gildenhalle', p.guild.name);
  ui.log(`Gildenhalle · ${p.guild.name} · Einmal in der Woche ruft ihr hier den Gildenboss · Hinaus geht es durch das Tor im Süden`, 'info');
  return true;
}
function ghLeave() {
  const p = game.player;
  if (!p || p.dead || ghSlotAt(p.x, p.y) < 0) return false;
  const at = ghReturnSpot(p);
  if (p.gx) p.gx.ret = null;
  ghWarp(at);
  return true;
}

// --- Anzeige in der Halle: Name, Stand des Gildenbosses, Rufen und Verlassen ------------------------------------------
let ghHudEl = null;
let ghHudKey = '';
const gh = { portalT: 0, noGuildT: 0, placeAt: 0 };
function ghHudPlace(el) {
  const box = (id) => {
    const e = document.getElementById(id);
    if (!e || e.hidden || e.closest('[hidden]')) return null;
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? r : null;
  };
  const touch = !!(typeof input !== 'undefined' && input.touchUi);
  const c = box('hudChar');
  let bottom = c ? c.bottom : 90;
  for (const id of ['buffList', 'partyFrame']) {
    const r = box(id);
    if (r && c && r.left < c.right) bottom = Math.max(bottom, r.bottom);
  }
  el.style.left = Math.round(Math.max(6, c ? c.left : 6)) + 'px';
  el.style.top = Math.round(bottom + (touch ? 4 : 8)) + 'px';
}
function ghHud() {
  const p = game.player;
  const s = p && game.running ? ghSlotAt(p.x, p.y) : -1;
  if (s < 0) {
    if (ghHudEl && !ghHudEl.hidden) ghHudEl.hidden = true;
    return;
  }
  gxCss();
  if (!ghHudEl) {
    ghHudEl = document.createElement('div');
    ghHudEl.id = 'gxHall';
    ghHudEl.hidden = true;
    ghHudEl.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-gx]');
      if (!b) return;
      ev.stopPropagation();
      gxAction(b.dataset.gx);
    });
    document.body.appendChild(ghHudEl);
  }
  const own = !!(p.guild && ghSlotOf(p.guild.name) === s);
  const m = gbAlive(s);
  const g = gxState(p);
  const wk = gxWoche();
  let line;
  if (m) {
    if (!m.gbSeenAt) m.gbSeenAt = Date.now();
    const left = Math.max(0, (m.gbUntil || m.gbSeenAt + GB.dur) - Date.now());
    line = `<span>${MONSTER_TYPES.gildenboss.name}</span> · <span>Kämpfer</span> <b>${gbPlayersIn(s).length}</b> · <span>noch</span> <b>${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}</b>`;
  } else if (!own) line = '<span>Fremde Gildenhalle</span>';
  else if (g.kw >= wk) line = `<span>Diese Woche besiegt</span> · <span>neu ab</span> <b>${gbNextWeekText()}</b>`;
  else line = '<span>Bereit: Ruft den Gildenboss, wenn alle da sind.</span>';
  const can = own && !m && !gbCanSummon(p);
  const key = [s, own, line, can, p.dead].join('|');
  if (key !== ghHudKey) {
    ghHudKey = key;
    ghHudEl.innerHTML = `<div class="gxh-t"><b>Gildenhalle</b>${p.guild && own ? ` <span class="gxh-g">‹${gxEsc(p.guild.name)}›</span>` : ''}</div>` +
      `<div class="gxh-l">${line}</div><div class="gxh-b">` +
      (can ? '<button type="button" class="gxh-ruf" data-gx="ruf">Gildenboss rufen</button>' : '') +
      '<button type="button" data-gx="raus">Halle verlassen</button></div>';
    gh.placeAt = 0;
  }
  if (ghHudEl.hidden) {
    ghHudEl.hidden = false;
    gh.placeAt = 0;
  }
  const now = performance.now();
  if (!gh.placeAt || now - gh.placeAt > 2000) {
    gh.placeAt = now;
    ghHudPlace(ghHudEl);
  }
}
// Viermal je Sekunde: Tor im Süden, ohne Gilde hinaus, Anzeige
function ghTick() {
  const p = game.player;
  if (!p || !game.running || (typeof WAECHTER !== 'undefined' && WAECHTER)) {
    if (ghHudEl && !ghHudEl.hidden) ghHudEl.hidden = true;
    return;
  }
  const s = ghSlotAt(p.x, p.y);
  if (s >= 0 && !p.dead) {
    // Tor: kurz darin stehen bleiben
    const t = ghSpot(s, 'portal');
    if (hyp(p.x - t.x, p.y - t.y) < 34) {
      gh.portalT += 0.25;
      if (gh.portalT >= 0.5) {
        gh.portalT = 0;
        ghLeave();
        return;
      }
    } else gh.portalT = 0;
    // nicht mehr in der Gilde (verlassen, entfernt): nach ein paar Sekunden hinaus
    if (!p.guild) {
      gh.noGuildT += 0.25;
      if (gh.noGuildT > 3) {
        gh.noGuildT = 0;
        ghLeave();
        return;
      }
    } else gh.noGuildT = 0;
  }
  ghHud();
}
setInterval(() => { try { ghTick(); } catch (err) { /* nächster Takt */ } }, 250);

// --- Gildenboss: Eidwächter Ostrun ------------------------------------------------------------------------------------
// Ein uralter Wächter aus hellem Stein und Bronze, der die Eide der Gilden prüft: Topfhelm mit Kamm und leuchtendem
// Sehschlitz, Wappenrock, Turmschild mit Sparren, lange Hellebarde, Umhang. Eigene 2D-Zeichnung und eigenes 3D-Modell
// (Baukasten der Endbosse, bosse3d.js), eigene Angriffe mit Warnflächen (bossangriffe.js). Läuft als Endboss (type.raid):
// Stampfer, Meteore, Linie, Sprung und Sturm aus dem Beutel, dazu seine eigenen; Phasen bei 60 und 30 %.
const GB = {
  dur: 15 * 60e3,    // so lange steht er in der Halle, dann zieht er sich zurück (der Ruf ist dann nicht verbraucht)
  hpPer: 0.75,       // je weiterem Kämpfer in der Halle beim Rufen +75 % Leben …
  atkPer: 0.06,      // … und +6 % Angriff
  maxN: 10, minLv: 10, wait: 7,
  legendary: 0.15,   // Chance auf ein legendäres Teil (Stufe 75+, mit Pech-Schutz)
  ep: 0.5            // Seelen-EP auf Stufe 80 (Anteil einer Stufe 80); darunter ein Viertel der eigenen Stufe
};
Object.assign(MONSTER_TYPES, {
  gildenboss: {
    name: 'Eidwächter Ostrun', level: 80, shape: 'humanoid', color: '#8a8678', size: 60, speed: 104, range: 104, cooldown: 2.2, aggressive: true,
    hpMul: 95, atkMul: 2.3, gildenboss: true, gilde: true,
    boss: { color: '#5fe0c8', slam: 220, volley: 8, shot: '#9ff0e0', summon: 'eidwache' },
    raid: { art: 'gildenboss', scale: 2.4, shieldAt: [], doomAt: [], moves: ['slam', 'meteor', 'line', 'leap', 'charge', 'meteor'] }
  },
  // Helfer: belebte Rüstungen in Bronze und Türkis
  eidwache: { name: 'Eidwache', level: 78, shape: 'humanoid', color: '#6e6a62', size: 15, speed: 108, range: 34, cooldown: 1.5, aggressive: true, hpMul: 1.8, atkMul: 1.35, gilde: true }
});
// nicht in Prüfungsarena und Jagdaufträgen
if (typeof arenaPool === 'function') {
  const _gbArenaPool = arenaPool;
  // eslint-disable-next-line no-global-assign
  arenaPool = function (L, w) {
    const list = _gbArenaPool(L, w);
    const out = list.filter((id) => !(MONSTER_TYPES[id] && MONSTER_TYPES[id].gilde));
    return out.length ? out : list;
  };
}
if (typeof huntOffers === 'function') {
  const _gbHuntOffers = huntOffers;
  // eslint-disable-next-line no-global-assign
  huntOffers = function () {
    const list = _gbHuntOffers();
    const out = list.filter((h) => !(h && MONSTER_TYPES[h.monster] && MONSTER_TYPES[h.monster].gilde));
    return out.length ? out : list;
  };
}

// 2D: Seitenansicht wie alle Monster (nach rechts), Schrittbilder aus WALK; die Größe kommt aus raid.scale
const GB_C = {
  stone: '#bdb8aa', stoneD: '#8e8a7e', bronze: '#a8803e', bronzeD: '#6e5226', gold: '#e8c060', teal: '#2a8a7c', tealD: '#17524a',
  glow: '#8ff4e2', cape: '#1c4a45', wood: '#3a2a1c', steel: '#d8dce2'
};
function gbArt2d(ctx, f) {
  const w = WALK[f] || WALK[0];
  const b = w.bob;
  const C = GB_C;
  ctx.save();
  // Umhang hinter dem Körper
  poly(ctx, [[-8, -38 + b], [2, -38 + b], [-2, -7], [-16, -4 - w.arm * 1.2]], C.cape);
  stroke(ctx, C.gold, 0.8, [[-2, -7], [-16, -4 - w.arm * 1.2]]);
  // Hellebarde in der hinteren Hand, aufrecht: Stange bis weit über den Helm, oben Axtblatt (nach vorn), Spitze, Haken
  const px = -12 + w.arm * 0.8;
  const tx = px + 4.2;
  const ty = -61 + b;
  stroke(ctx, C.wood, 2.6, [[px, -2], [tx, ty + 8], [tx + 0.4, ty - 5]]);
  const along = (y) => px + (tx - px) * ((y + 2) / (ty + 10));
  for (const y of [-30 + b, -50 + b]) stroke(ctx, C.gold, 1.4, [[along(y) - 1.7, y], [along(y) + 1.7, y]]);
  poly(ctx, [[tx + 0.5, ty - 3], [tx + 9.5, ty - 9], [tx + 14, ty - 1], [tx + 10.5, ty + 7], [tx + 0.5, ty + 4]], C.steel);
  stroke(ctx, C.gold, 1.1, [[tx + 9.5, ty - 9], [tx + 14, ty - 1], [tx + 10.5, ty + 7]]);
  poly(ctx, [[tx - 1.4, ty - 5], [tx + 0.4, ty - 13], [tx + 2.2, ty - 5]], C.steel);
  poly(ctx, [[tx - 0.6, ty - 1.5], [tx - 7.5, ty - 4.5], [tx - 0.6, ty + 2.5]], C.steel);
  // hinterer Arm zur Stange
  stroke(ctx, darker(C.stoneD, 0.12), 4.6, [[-5, -33 + b], [px + 2.2, -40 + b]]);
  oval(ctx, px + 2.6, -40 + b, 2.8, 2.6, C.bronzeD);
  // Beine (das hintere dunkler) mit Schienen, Kniekachel und Eisenschuh
  const leg = (lx, o, back) => {
    const x = lx + o * 2.2;
    box(ctx, x - 2.8, -18, 5.6, 15, 2, back ? darker(C.stoneD, 0.18) : C.stoneD);
    box(ctx, x - 3.3, -12.5, 6.6, 8.5, 2, back ? C.bronzeD : C.bronze);
    oval(ctx, x + 0.2, -13.5, 2.9, 2.2, back ? darker(C.gold, 0.25) : C.gold);
    box(ctx, x - 3.4 + o * 0.4, -4.6, 9.5, 4.6, 1.5, back ? darker(C.bronzeD, 0.2) : C.bronzeD);
  };
  leg(-3.5, w.l, true);
  leg(3.6, w.r, false);
  // Rumpf aus Stein, Plattenschurz, Brustpanzer, Wappenrock, Gürtel
  box(ctx, -9.5, -37 + b, 19, 20, 6, C.stone);
  for (const [x, c] of [[-9, C.bronzeD], [-4, C.bronze], [1, C.bronzeD]]) box(ctx, x, -19 + b, 5.2, 7, 1.4, c);
  poly(ctx, [[-8.5, -36 + b], [9.5, -36 + b], [8.5, -24 + b], [0.5, -20 + b], [-8.5, -24 + b]], C.bronze);
  stroke(ctx, C.gold, 0.9, [[-8.5, -36 + b], [9.5, -36 + b]]);
  poly(ctx, [[-1.5, -25 + b], [8.5, -25 + b], [7.5, -5], [3.5, -8], [-0.5, -5]], C.teal);
  stroke(ctx, C.gold, 0.9, [[-1.5, -25 + b], [-0.5, -5], [3.5, -8], [7.5, -5], [8.5, -25 + b]]);
  dot(ctx, 3.8, -16 + b, 1.8, 1.8, C.glow);
  box(ctx, -9.5, -21 + b, 19, 3, 1, C.wood);
  box(ctx, 1.5, -21.5 + b, 4, 4, 1, C.gold);
  // Schulterpanzer
  oval(ctx, 3 + w.arm * 0.5, -35 + b, 7.4, 4.8, C.bronze);
  stroke(ctx, C.gold, 1, [[-3.4 + w.arm * 0.5, -33 + b], [9.4 + w.arm * 0.5, -33 + b]]);
  // Turmschild in der vorderen Hand
  const sx = 10 + w.arm;
  const sy = -25 + b;
  const shield = (k, col) => poly(ctx, [[sx - 6.5 * k, sy - 10 * k], [sx + 6.5 * k, sy - 10 * k], [sx + 6.5 * k, sy + 1 * k], [sx, sy + 10 * k], [sx - 6.5 * k, sy + 1 * k]], col);
  shield(1, C.bronze);
  shield(0.78, C.teal);
  poly(ctx, [[sx - 5, sy], [sx, sy - 5.5], [sx + 5, sy], [sx + 5, sy + 2.6], [sx, sy - 2.6], [sx - 5, sy + 2.6]], C.gold);
  dot(ctx, sx, sy + 4.5, 1.4, 1.4, C.glow);
  // Topfhelm mit Kamm und leuchtendem Sehschlitz
  const cx = 2;
  const cy = -45 + b;
  box(ctx, cx - 7.5, cy - 7, 15, 14, 4, C.bronze);
  box(ctx, cx - 7.5, cy + 2, 15, 3, 1, C.bronzeD);
  box(ctx, cx - 0.5, cy - 1.6, 8, 2.4, 1, C.glow);
  if (typeof glow === 'function') glow(ctx, cx + 4, cy - 0.4, 7, C.glow, 0.45);
  poly(ctx, [[cx - 7, cy - 5], [cx - 3, cy - 13], [cx + 3, cy - 14], [cx + 6, cy - 6]], C.gold);
  stroke(ctx, C.bronzeD, 0.8, [[cx - 3, cy - 13], [cx - 1, cy - 6]]);
  ctx.restore();
}
if (typeof MONSTER_ART !== 'undefined') {
  MONSTER_ART.gildenboss = { h: 66, draw: gbArt2d };
  MONSTER_ART.eidwache = {
    h: 48,
    draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.02, skin: '#b4ae9e', pants: '#4a4a52', boots: '#5a4428', torso: '#9a7434', sleeve: '#7a766c', gloves: '#6a5a40', belt: '#3a2a1c',
      pauldron: '#b08a44', cape: '#1f6f66', weapon: 'sword',
      head: (c, cx, cy) => {
        box(c, cx - 10, cy - 11, 20, 18, 5, '#9a7434');
        box(c, cx - 2, cy - 3, 11, 2.6, 1, '#8ff4e2');
        poly(c, [[cx - 8, cy - 10], [cx - 1, cy - 19], [cx + 6, cy - 10]], '#e2bc5a');
      }
    })
  };
}
if (typeof HEAD3 !== 'undefined') HEAD3.eidwache = { helmet: '#9a7434' };

// 3D: eigenes Modell aus dem Baukasten der Endbosse (Zweibeiner, aufrecht, kaum gebeugt)
const GB_C3 = {
  skin: '#a9a496', skinTop: '#d8d4c6', bronze: '#9a7434', bronzeTop: '#d8b060', gold: '#e2bc5a', teal: '#1f6f66', tealTop: '#3aa898', tealD: '#123e3a',
  glow: '#7ff0dc', wood: '#3a2a1c', steel: '#b8bec8', steelTop: '#eef2f6', worldH: 8.2
};
const GB_J3 = {
  hipY: 1.0, hipX: 0.24, kneeY: 0.56, ankleY: 0.12, footL: 0.27, waistY: 1.24, chestY: 1.5, shY: 1.84, shX: 0.56, neckY: 1.93,
  headY: 2.03, headZ: 0.12, hunch: 0.08, upper: 0.5, fore: 0.46, hand: 0.2, armOut: 0.1, jaw: [-0.03, 0.04],
  cape: [[0, 1.86, -0.3], [0, 1.0, -0.42]]
};
const GB3 = (() => {
  if (typeof bsBipJ3 !== 'function' || typeof BB3 === 'undefined') return null;
  const P = bsBipJ3(GB_J3);
  const G = bsLerp3(P[-1].W, P[-1].Hd, 0.5);
  // Stange der Hellebarde: vom Griff schräg nach vorn oben
  const d = [0, 0.968, 0.252];
  const at = (k) => [G[0] + d[0] * k, G[1] + d[1] * k, G[2] + d[2] * k];
  const top = at(1.95);
  const pts = {
    mouth: [BB3.head, [0, 2.06, 0.32]], core: [BB3.chest, [0, 1.62, 0.36]], back: [BB3.chest, [0, 1.96, -0.22]],
    weapon: [BB3.haR, top], emit: [BB3.haR, top], sky: [BB3.haR, top], shield: [BB3.foL, bsLerp3(P[1].E, P[1].W, 0.55)]
  };
  return { P, G, d, at, top, pts };
})();
const _gbP3 = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
function gbBoss3(b, id, V) {
  const A = adder(b, null);
  const J = GB_J3;
  const { P, d, at } = GB3;
  const C = V;
  const { rig } = bsBipRig3(J);
  const rows = [
    [0.86, 0.0, 0.25, 0.2, 0.2], [0.98, 0.0, 0.31, 0.24, 0.22], [1.14, 0.02, 0.33, 0.26, 0.22], [1.32, 0.04, 0.36, 0.27, 0.23],
    [1.5, 0.06, 0.45, 0.28, 0.25], [1.66, 0.08, 0.52, 0.27, 0.27], [1.8, 0.08, 0.45, 0.21, 0.25], [1.9, 0.1, 0.18, 0.13, 0.14], [1.99, 0.11, 0.13, 0.1, 0.1]
  ];
  bsBipBody3(id, A, J, P, { C, rows, arm: [0.2, 0.18, 0.14, 0.15, 0.11], leg: [0.21, 0.19, 0.14, 0.14, 0.11], shade: 0.3 });
  const brz = { top: C.bronzeTop, topK: 0.5, shine: 0.9 };
  // Brustpanzer mit Goldkante, Bauchschienen, Halsberge
  A(roundBox(0.66, 0.44, 0.2, 0.07), C.bronze, Object.assign({ bone: BB3.chest, p: [0, 1.64, 0.2] }, brz));
  A(roundBox(0.6, 0.04, 0.06, 0.02), C.gold, { bone: BB3.chest, p: [0, 1.86, 0.27], shine: 1 });
  for (let k = 0; k < 3; k++) A(roundBox(0.5 - k * 0.04, 0.1, 0.16, 0.03), k % 2 ? C.bronze : darker(C.bronze, 0.12), Object.assign({ bone: BB3.spine, p: [0, 1.42 - k * 0.1, 0.18 - k * 0.01] }, brz));
  A(torus3(0.17, 0.05, Math.PI * 2, 5, 16), C.bronze, Object.assign({ bone: BB3.neck, p: [0, 1.9, 0.08], r: [Math.PI / 2, 0, 0] }, brz));
  // Wappenrock vorn (Türkis mit Goldsaum und leuchtendem Stein)
  bsSheetAdd3(b, A, bsSheet3(id + 'rock', 4, 6, (u, v) => [(u - 0.5) * 0.44 * (1 + 0.25 * v), 1.34 - v * 0.78, 0.3 + 0.05 * v],
    (u, v) => [[BB3.spine, Math.max(0, 1 - v * 1.6)], [BB3.pelvis, Math.min(1, v * 1.6)]],
    (u, v, s) => (s > 0 ? (v > 0.88 || u < 0.08 || u > 0.92 ? C.gold : C.teal) : C.tealD), 0.008), false);
  bsGem3(A, C.glow, [0, 1.62, 0.41], [0.055, 0.075, 0.03], [0, 0, 0], BB3.chest);
  // Umhang am Rücken
  bsSheetAdd3(b, A, bsSheet3(id + 'umhang', 6, 8, (u, v) => {
    const a = (u - 0.5) * 1.6;
    const R = 0.44 + v * 0.16;
    return [Math.sin(a) * R, 1.86 - v * 1.5, 0.02 - Math.cos(a) * R * 0.7 - 0.12];
  }, (u, v) => [[BB3.chest, Math.max(0, 1 - v * 3)], [BB3.c1, Math.min(1, v * 3) * (1 - v)], [BB3.c2, Math.min(1, v * 3) * v]],
  (u, v, s) => (s > 0 ? (v > 0.92 ? C.gold : mixColor(C.tealD, '#0c2422', v * 0.6)) : darker(C.tealD, 0.35)), 0.01), true);
  // Gürtel mit Schnalle
  A(torus3(0.36, 0.05, Math.PI * 2, 5, 22), darker(C.bronze, 0.3), { bone: BB3.pelvis, p: [0, 1.06, 0.02], r: [Math.PI / 2, 0, 0], s: [1, 0.78, 1], shine: 0.6 });
  A(roundBox(0.12, 0.1, 0.04, 0.02), C.gold, { bone: BB3.pelvis, p: [0, 1.06, 0.31], shine: 1 });
  // Schultern, Arm- und Beinschienen, Eisenschuhe, Hände
  for (const sx of [-1, 1]) {
    const [ub, fb] = bsArmB3(sx);
    const [tb, sb, fb2] = bsLegB3(sx);
    const S = P[sx].S;
    A(cap3(0.24, Math.PI * 0.5), C.bronze, Object.assign({ bone: ub, p: [S[0] + sx * 0.06, S[1] + 0.03, S[2]], s: [1.15, 0.85, 1.08], r: [0, 0, -sx * 0.45] }, brz));
    A(torus3(0.23, 0.025, Math.PI * 2, 4, 18), C.gold, { bone: ub, p: [S[0] + sx * 0.06, S[1] + 0.03, S[2]], r: [Math.PI / 2, 0, -sx * 0.45], s: [1.15, 1.08, 1], shine: 1 });
    bsSpike3(A, 0.16, 0.05, C.gold, [S[0] + sx * 0.12, S[1] + 0.2, S[2]], [sx * 0.4, 1, 0], { bone: ub, shine: 1 });
    A(cyl3(0.17, 0.15, 0.26, 14), C.bronze, Object.assign({ bone: fb, p: bsLerp3(P[sx].E, P[sx].W, 0.58) }, brz));
    const K = P[sx].K;
    A(ball(12), C.bronze, Object.assign({ bone: sb, p: [K[0], K[1] + 0.02, K[2] + 0.09], s: [0.13, 0.12, 0.1] }, brz));
    A(cyl3(0.16, 0.14, 0.3, 14), C.bronze, Object.assign({ bone: sb, p: [K[0], (K[1] + P[sx].A[1]) / 2 - 0.02, 0.01] }, brz));
    A(roundBox(0.22, 0.13, 0.36, 0.05), darker(C.bronze, 0.2), { bone: fb2, p: [P[sx].A[0], 0.08, 0.1], top: C.bronzeTop, topK: 0.4, shine: 0.7 });
    A(roundBox(0.28, 0.3, 0.16, 0.05), darker(C.bronze, 0.08), Object.assign({ bone: tb, p: [sx * 0.24, 0.86, 0.16], r: [0.1, 0, 0] }, brz));
    bsHand3(A, sx, P, 0.15, darker(C.bronze, 0.15), { top: C.bronzeTop });
  }
  // Topfhelm: Zylinder, Kuppel, Sehschlitz (leuchtet), Wangenplatten, Kamm
  const hb = BB3.head;
  const H0 = [0, 2.1, 0.13];
  A(cyl3(0.175, 0.19, 0.3, 16), C.bronze, Object.assign({ bone: hb, p: H0 }, brz));
  A(cap3(0.175, Math.PI / 2), C.bronze, Object.assign({ bone: hb, p: [H0[0], H0[1] + 0.15, H0[2]] }, brz));
  A(torus3(0.19, 0.022, Math.PI * 2, 4, 18), C.gold, { bone: hb, p: [H0[0], H0[1] - 0.13, H0[2]], r: [Math.PI / 2, 0, 0], shine: 1 });
  A(box3(), C.glow, { bone: hb, p: [0, 2.13, 0.31], s: [0.21, 0.028, 0.03], mat: 'glow', noShadow: true });
  A(box3(), '#0c0e10', { bone: hb, p: [0, 2.04, 0.305], s: [0.025, 0.1, 0.03], noShadow: true });
  for (const sx of [-1, 1]) A(roundBox(0.06, 0.18, 0.2, 0.025), darker(C.bronze, 0.1), Object.assign({ bone: hb, p: [sx * 0.17, 2.02, 0.18] }, brz));
  A(bsBlade3('gbkamm', [[-0.24, 0], [0.22, 0], [0.2, 0.08], [0.1, 0.17], [-0.06, 0.2], [-0.2, 0.12]], 0.05, 0.012), C.gold, { bone: hb, p: [0, 2.39, 0.12], shine: 1 });
  // Hellebarde in der rechten Hand: Stange, Goldringe, Axtblatt, Spitze, Haken
  const hbR = BB3.haR;
  const tilt = Math.atan2(d[2], d[1]);
  A(cyl3(0.045, 0.05, 2.5, 10), C.wood, { bone: hbR, p: at(0.7), r: [tilt, 0, 0], shade: 0.2 });
  for (const k of [0.05, 0.9, 1.35]) A(torus3(0.055, 0.016, Math.PI * 2, 4, 12), C.gold, { bone: hbR, p: at(k), r: [Math.PI / 2 + tilt, 0, 0], shine: 1, noShadow: true });
  A(bsBlade3('gbaxt', [[0.02, 0.22], [0.3, 0.3], [0.52, 0.44], [0.6, 0.18], [0.63, -0.02], [0.58, -0.22], [0.5, -0.4], [0.28, -0.26], [0.02, -0.2]], 0.035, 0.01), C.steel,
    { bone: hbR, p: at(1.55), r: [tilt, 0, 0], top: C.steelTop, topK: 0.4, shine: 1 });
  A(bsBlade3('gbaxtk', [[0.5, 0.44], [0.6, 0.18], [0.63, -0.02], [0.58, -0.22], [0.5, -0.4], [0.55, -0.2], [0.58, 0], [0.55, 0.2]], 0.04, 0.01), C.gold, { bone: hbR, p: at(1.55), r: [tilt, 0, 0], shine: 1, noShadow: true });
  bsSpike3(A, 0.42, 0.05, C.steel, at(1.95), d, { bone: hbR, top: C.steelTop, shine: 1 });
  bsSpike3(A, 0.24, 0.045, C.steel, at(1.5), [0, 0.3, -1], { bone: hbR, shine: 1 });
  // Turmschild am linken Unterarm (außen): Bronze, türkises Feld, goldener Sparren, Stein in der Mitte
  const fbL = bsArmB3(1)[1];
  const c = bsLerp3(P[1].E, P[1].W, 0.55);
  const sp = [c[0] + 0.17, c[1] + 0.02, c[2] + 0.08];
  A(bsBlade3('gbschild', [[-0.36, 0.46], [0.36, 0.46], [0.38, 0.06], [0.25, -0.3], [0, -0.52], [-0.25, -0.3], [-0.38, 0.06]], 0.06, 0.018), C.bronze,
    Object.assign({ bone: fbL, p: sp }, brz));
  A(bsBlade3('gbschildf', [[-0.28, 0.38], [0.28, 0.38], [0.3, 0.05], [0.19, -0.23], [0, -0.42], [-0.19, -0.23], [-0.3, 0.05]], 0.02, 0.006), C.teal,
    { bone: fbL, p: [sp[0] + 0.035, sp[1], sp[2]], top: C.tealTop, topK: 0.4, shine: 0.4 });
  for (const sz of [-1, 1]) A(box3(), C.gold, { bone: fbL, p: [sp[0] + 0.05, sp[1] + 0.02, sp[2] + sz * 0.11], r: [sz * 0.85, 0, 0], s: [0.02, 0.3, 0.06], shine: 1, noShadow: true });
  bsGem3(A, C.glow, [sp[0] + 0.06, sp[1] - 0.16, sp[2]], [0.03, 0.05, 0.05], [0, 0, 0], fbL);
  return bsRes3(id, rig, J, 2.5, V.worldH);
}
if (GB3 && typeof MON3_BUILD !== 'undefined' && typeof BOSS3 !== 'undefined') {
  MON3_BUILD.gildenboss = (b) => gbBoss3(b, 'gildenboss', GB_C3);
  BOSS3.gildenboss = {
    kind: 'biped', fx: 'wappen', melee: ['chop', 'thrust', 'sweep'], emit: 'weapon', cape: true, blob: 1.3, dome: 1.35,
    pts: GB3.pts, deathPts: ['core', 'back', 'weapon'], skyAt: 'sky', emi: [0.02, 0.07, 0.06], gait: 0.75,
    base: { aRx: -0.3, aRe: -0.85, aRz: 0.12, aLx: -0.6, aLe: -1.2, aLz: 0.3, lean: 0.05 },
    // ein paar türkise Funken steigen vom Wappenrock auf
    ambient(h, a, e, t, th) {
      if (!a.bones || !_gbP3 || typeof bsSprite3 !== 'function') return;
      bsPtA3(a, BOSS3.gildenboss, 'core', _gbP3);
      for (let i = 0; i < 2; i++) {
        const v = (t * 0.55 + i / 2) % 1;
        bsSprite3(h, _gbP3.x + Math.sin(i * 2.4 + t * 0.7) * 0.7, _gbP3.y - 0.6 + v * 1.8, _gbP3.z + Math.cos(i * 1.9 + t * 0.5) * 0.6, 0.18, 'spark', th.mid, 0.7 * (1 - v));
      }
    }
  };
}
// Effekt-Thema: Türkis mit hellem Kern, Brocken aus hellem Stein, Speere als Geschosse
if (typeof BS_FXT3 !== 'undefined') BS_FXT3.wappen = { beam: 'ground', core: '#f4fff8', mid: '#5fe0c8', dark: '#2a3a38', tex: 'spark', deb: 'rock', debCol: ['#8e8a7e', '#5a5448'], proj: 'spear' };
if (typeof BSK_SND !== 'undefined') BSK_SND.wappen = 'imp_erde';
// eigene Angriffe (Grundformen aus bossangriffe.js, alle mit Warnfläche)
const GB_SKILLS = [
  { id: 'eidhieb', t: 'sense', name: 'Eidhieb', say: 'schwingt die Hellebarde – erst nach vorn, dann nach hinten!', R: 300, h: 1.05, mul: 2.6 },
  { id: 'bannersturm', t: 'bahnen', name: 'Bannersturm', say: 'lässt Speere in Reihen niedergehen – wechselt die Bahn!', look: 'fall', proj: 'spear', w: 58, gap: 1.3, R: 470, mul: 2.6 },
  { id: 'wappenregen', t: 'muster', name: 'Wappenregen', say: 'lässt Schilde im Schachbrett herabstürzen!', bigSay: 'lässt einen Hagel aus Schilden niedergehen!', s: 190, r: 86, R: 470, mul: 2.4 },
  { id: 'schwursprung', t: 'hetzjagd', name: 'Schwursprung', say: 'springt auf euch – weicht den Landestellen aus!', n: 2, gap: 1.05, r: 105, knock: true, mul: 2.6, from: 0.75 },
  { id: 'eidruf', t: 'beschwoeren', name: 'Ruf der Eidwachen', say: 'ruft seine Eidwachen herbei!', bigSay: 'ruft seine Eidwachen herbei!', phaseOnly: true, n: 1, lv: 3, mob: 'eidwache', hp: 0.5 }
];
if (typeof BSK_KITS !== 'undefined') BSK_KITS.gildenboss = { fx: 'wappen', skills: GB_SKILLS, phases: [[0.6, 'eidruf'], [0.3, 'wappenregen']] };

// --- Rufen, Erscheinen, Rückzug ---------------------------------------------------------------------------------------
const gb = { pend: 0, alert: null };
function gbAlive(s) {
  for (const m of game.monsters) if (m.type && m.type.gildenboss && !m.dead && ghSlotAt(m.homeX != null ? m.homeX : m.x, m.homeY != null ? m.homeY : m.y) === s) return m;
  return null;
}
// Spieler in der Halle (die eigene Figur und Mitspieler; der Welt-Wächter zählt nicht)
function gbPlayersIn(s) {
  const out = [];
  const p = game.player;
  if (p && !(typeof WAECHTER !== 'undefined' && WAECHTER) && ghSlotAt(p.x, p.y) === s) out.push(p);
  if (typeof net !== 'undefined' && net.players) for (const rp of net.players.values()) if (rp && !rp.gone && !rp.waechter && ghSlotAt(rp.x, rp.y) === s) out.push(rp);
  return out;
}
const gbFightN = (m) => Math.max(1, m.gbN || gbPlayersIn(ghSlotAt(m.homeX != null ? m.homeX : m.x, m.homeY != null ? m.homeY : m.y)).length);
// Stufe des Bosses: die höchste Stufe in der Halle
function gbLevelFor(s) {
  let lv = GB.minLv;
  for (const pl of gbPlayersIn(s)) lv = Math.max(lv, pl.level | 0);
  return Math.min(MAX_LEVEL, lv);
}
// Montag 0 Uhr Weltzeit als Ortszeit („Mo. 1:00“)
function gbNextWeekText() {
  const t = new Date(GX_WOCHE0 + (gxWoche() + 1) * 6048e5);
  return t.toLocaleString(gxLoc(), { weekday: 'short', day: 'numeric', month: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function gbCanSummon(p) {
  if (!p || !p.guild) return 'Du bist in keiner Gilde.';
  const s = ghSlotAt(p.x, p.y);
  if (s < 0 || s !== ghSlotOf(p.guild.name)) return 'Den Gildenboss ruft ihr in eurer Gildenhalle.';
  if (p.dead) return 'Erst wieder auf die Beine kommen.';
  if (gbAlive(s)) return 'Der Gildenboss ist schon da.';
  if (gxState(p).kw >= gxWoche()) return 'Eure Gilde hat den Gildenboss diese Woche schon besiegt.';
  if (gb.pend && game.time - gb.pend < GB.wait) return 'Der Ruf ist unterwegs …';
  return '';
}
function gbSummon() {
  const p = game.player;
  const why = gbCanSummon(p);
  if (why) {
    gxMsg(why, 'warn');
    return false;
  }
  const s = ghSlotAt(p.x, p.y);
  const lv = gbLevelFor(s);
  if (typeof net !== 'undefined' && net.mode === 'client') {
    // den Boss führt der Host: ihn bitten (er prüft selbst nach)
    gb.pend = game.time;
    netSocial('host', { k: 'gbr', g: p.guild.name, s, l: lv });
    ui.log('Der Ruf geht an den Host des Kanals …', 'info');
    const at = gb.pend;
    setTimeout(() => {
      if (gb.pend !== at) return;
      gb.pend = 0;
      if (!gbAlive(s)) gxMsg('Keine Antwort vom Host des Kanals – vielleicht spielt er eine ältere Version. Versuch es gleich noch einmal.', 'warn');
    }, GB.wait * 1000);
    return true;
  }
  if (!gbSpawn(s, lv)) return false;
  gbCalled(p);
  return true;
}
// Erscheinen (nur Host oder allein): Leben und Angriff nach der Zahl der Spieler in der Halle
function gbSpawn(s, lv) {
  if (!(s >= 0 && s < GH.slots) || gbAlive(s) || !MONSTER_TYPES.gildenboss) return null;
  const at = ghSpot(s, 'boss');
  const n = Math.max(1, Math.min(GB.maxN, gbPlayersIn(s).length));
  const m = createMonster('gildenboss', at.x, at.y, { respawn: false, zone: GH_ZONE, level: Math.max(GB.minLv, Math.min(MAX_LEVEL, lv | 0)) });
  m.maxHp = m.hp = Math.round(m.maxHp * (1 + GB.hpPer * (n - 1)));
  m.atk = Math.round(m.atk * (1 + GB.atkPer * (n - 1)));
  m.gbN = n;
  m.gbUntil = Date.now() + GB.dur;
  m.homeX = at.x;
  m.homeY = at.y;
  m.bossCd = 4;
  m.summoned = 0;
  game.monsters.push(m);
  if (typeof particles === 'function') particles(at.x, at.y - 20, { count: 40, color: ['#5fe0c8', '#f4fff8', '#e2bc5a'], speed: [60, 220], life: [0.5, 1.1], size: [2, 4.5], drag: 2 });
  if (typeof shakeScreen === 'function') shakeScreen(8);
  return m;
}
// gerufen: Ansage hier und an alle Mitglieder im Kanal (eigene Nachricht, nur für die Gilde)
function gbCalled(p) {
  ui.banner('Gildenboss gerufen!', MONSTER_TYPES.gildenboss.name);
  ui.log(`Gildenboss · ${MONSTER_TYPES.gildenboss.name} erscheint in der Gildenhalle`, 'level');
  if (!p || !p.guild || typeof net === 'undefined') return;
  for (const [pid, rp] of net.players) if (gxMate(rp, p)) netSocial(pid, { k: 'gbn', g: p.guild.name });
}
// Helfer ohne Bodenring (Lichtsäule), Zahl nach den Kämpfern
function gbAdds(m, k, down) {
  for (let i = 0; i < k; i++) {
    const pos = spotNear(m, 220);
    const add = createMonster('eidwache', pos.x, pos.y, { respawn: false, zone: m.zone, level: Math.max(1, m.level - down) });
    add.raidAdd = true;
    add.hp = add.maxHp = Math.round(add.maxHp * 0.7);
    add.homeX = m.homeX;
    add.homeY = m.homeY;
    add.state = 'chase';
    const list = typeof raidPlayers === 'function' ? raidPlayers(m) : [];
    add.target = list[randInt(0, Math.max(0, list.length - 1))] || game.player;
    game.monsters.push(add);
    addEffect({ type: 'pillar', x: pos.x, y: pos.y + 9, dur: 0.8, color: '#5fe0c8' });
  }
}
// Endboss-Helfer: allein keine regelmäßigen, im Phasenwechsel einer; zu mehrt mehr (raidMinions/raidRoar, gegner.js)
if (typeof raidMinions === 'function') {
  const _gbMinions = raidMinions;
  // eslint-disable-next-line no-global-assign
  raidMinions = function (m, n) {
    if (m && m.type && m.type.gildenboss) {
      const f = gbFightN(m);
      const k = f >= 4 ? 2 : f >= 2 ? 1 : 0;
      if (k) gbAdds(m, k, 6);
      return;
    }
    return _gbMinions(m, n);
  };
}
if (typeof raidRoar === 'function') {
  const _gbRoar = raidRoar;
  // eslint-disable-next-line no-global-assign
  raidRoar = function (m, phase) {
    if (m && m.type && m.type.gildenboss) {
      raidRoarFx(m, phase);
      gbAdds(m, 1 + Math.min(2, Math.floor((gbFightN(m) - 1) / 2)), 4);
      if (net.mode === 'host') netBroadcast({ t: 'roar', id: m.id, ph: phase });
      return;
    }
    return _gbRoar(m, phase);
  };
}
// Host: nach GB.dur zieht er sich zurück (mit seinen Helfern), die Mitspieler bekommen es gemeldet ('gone', tag-nacht.js)
function gbHostTick() {
  if (!game.world || typeof net === 'undefined') return;
  if (net.mode === 'client') return;
  const now = Date.now();
  const gone = [];
  for (let k = game.monsters.length - 1; k >= 0; k--) {
    const m = game.monsters[k];
    if (!m.type || !m.type.gildenboss || m.dead) continue;
    // nach einem Hostwechsel kennt der neue Host die Zeit nicht: ab jetzt
    if (!(m.gbUntil > 0)) m.gbUntil = now + GB.dur;
    if (now < m.gbUntil) continue;
    const s = ghSlotAt(m.homeX, m.homeY);
    game.monsters.splice(k, 1);
    gone.push(m.id);
    for (let j = game.monsters.length - 1; j >= 0; j--) {
      const a = game.monsters[j];
      if (a.raidAdd && ghSlotAt(a.x, a.y) === s) {
        game.monsters.splice(j, 1);
        gone.push(a.id);
      }
    }
    const p = game.player;
    if (p && ghSlotAt(p.x, p.y) === s) {
      ui.banner(m.name, 'zieht sich zurück');
      ui.log('Der Gildenboss zieht sich zurück · ihr könnt ihn noch einmal rufen', 'info');
    }
  }
  if (gone.length && net.mode === 'host') netBroadcast({ t: 'gone', ids: gone });
  if (gone.length && game.target && gone.includes(game.target.id)) game.target = null;
}
setInterval(() => { try { gbHostTick(); } catch (err) { /* nächster Takt */ } }, 1000);

// --- Nachrichten (eigene Arten über onSocial; Absender immer aus der Verbindung) ---------------------------------------
// gxt: Liste der Beiträge (Mitglied → Mitglied) · gbr: Bitte um den Gildenboss (Mitglied → Host) · gba: Antwort des
// Hosts (nur von 'host' angenommen) · gbn: „Gildenboss gerufen“ (Mitglied → Mitglieder, nur eine Ansage)
const GB_ERR = { halle: 'Den Gildenboss ruft ihr in eurer Gildenhalle.', da: 'Der Gildenboss ist schon da.', nein: 'Der Gildenboss kommt gerade nicht – versuch es gleich noch einmal.' };
function gbOnRequest(pid, d) {
  if (typeof net === 'undefined' || net.mode !== 'host') return;
  const rp = net.players.get(pid);
  if (!rp || rp.gone) return;
  const reply = (x) => netSocial(pid, Object.assign({ k: 'gba' }, x));
  const g = typeof d.g === 'string' && d.g.length <= GX.nameMax ? d.g : '';
  const s = Number.isInteger(d.s) ? d.s : -1;
  // nur in der eigenen Halle: Gilde des Absenders (Zustand), Halle der Gilde, er steht darin
  if (!g || rp.guild !== g || s !== ghSlotOf(g) || ghSlotAt(rp.x, rp.y) !== s) { reply({ e: 'halle' }); return; }
  if (gbAlive(s)) { reply({ e: 'da' }); return; }
  // Stufe: höchstens die höchste Stufe in der Halle
  const lv = Math.min(Number.isFinite(+d.l) ? d.l | 0 : GB.minLv, gbLevelFor(s));
  reply(gbSpawn(s, lv) ? { ok: 1 } : { e: 'nein' });
}
function gbOnAnswer(pid, d) {
  if (pid !== 'host' || !gb.pend) return;
  gb.pend = 0;
  if (d.ok === 1) gbCalled(game.player);
  else gxMsg(GB_ERR[d.e] || GB_ERR.nein, 'warn');
  ghHudKey = '';
}
function gbOnNotice(pid, d) {
  const p = game.player;
  const rp = typeof net !== 'undefined' ? net.players.get(pid) : null;
  if (!p || !p.guild || !d || d.g !== p.guild.name || !gxMate(rp, p)) return;
  const by = rp.realName || rp.name;
  // höchstens eine Ansage je Minute
  if (gb.alert && Date.now() - gb.alert.at < 60000) return;
  gb.alert = { at: Date.now(), until: Date.now() + GB.dur, by };
  if (ghSlotAt(p.x, p.y) < 0) {
    ui.banner('Gildenboss gerufen!', `${by} · Gildenhalle`);
    ui.log(`Gildenboss · ${by} · ruft den Eidwächter in eurer Gildenhalle · Gildenfenster (G) → Zur Gildenhalle`, 'level');
  }
  if (ui.renderQuestTrack) ui.renderQuestTrack();
}
const GX_KINDS = new Set(['gxt', 'gbr', 'gba', 'gbn']);
const _gxOnSocial = onSocial;
// eslint-disable-next-line no-global-assign
onSocial = function (pid, d) {
  if (d && typeof d.k === 'string' && GX_KINDS.has(d.k)) {
    // blockierte Spieler: nichts von ihnen annehmen (spielerschutz.js); die Antwort des Hosts kommt immer an
    if (d.k !== 'gba' && typeof isBlocked === 'function' && typeof net !== 'undefined') {
      const rp = net.players.get(pid);
      if (rp && isBlocked(rp.realName || rp.name)) return;
    }
    try {
      if (d.k === 'gxt') gxOnTable(pid, d);
      else if (d.k === 'gbr') gbOnRequest(pid, d);
      else if (d.k === 'gba') gbOnAnswer(pid, d);
      else if (d.k === 'gbn') gbOnNotice(pid, d);
    } catch (err) { console.warn('Gilden-Inhalte:', err); }
    return;
  }
  return _gxOnSocial(pid, d);
};

// --- Beute: einmal je Woche für jedes Mitglied der Gilde dieser Halle, das mitgekämpft hat ---------------------------
function gbLoot(m) {
  const p = game.player;
  if (!p) return;
  const s = ghSlotAt(m.homeX != null ? m.homeX : m.x, m.homeY != null ? m.homeY : m.y);
  const wk = gxWoche();
  if (typeof shakeScreen === 'function') shakeScreen(10);
  if (typeof particles === 'function') particles(m.x, feetY(m) - 30, { count: 60, color: ['#5fe0c8', '#ffffff', '#e2bc5a'], speed: [80, 300], life: [0.5, 1.1], size: [2, 5], drag: 2 });
  if (!p.guild || s < 0 || s !== ghSlotOf(p.guild.name)) {
    ui.banner(`${m.name} besiegt!`, 'Die Belohnung gehört der Gilde dieser Halle');
    return;
  }
  const g = gxState(p);
  if (wk > g.kw) {
    g.kw = wk;
    gxDirty();
  }
  if (g.bw >= wk) {
    ui.banner(`${m.name} besiegt!`, 'Deine Belohnung hast du diese Woche schon');
    ui.log('Gildenboss besiegt · deine Belohnung gibt es wieder ab Montag', 'info');
    saveGame();
    return;
  }
  g.bw = wk;
  g.bossN = (g.bossN | 0) + 1;
  const lv = p.level;
  // ein Ausrüstungsteil der eigenen Klasse: ab Stufe 75 episch (Stufe 80) mit Glück legendär, ab 60 episch, darunter selten
  let leg = false;
  if (lv >= 75) {
    leg = typeof pechLeg === 'function' ? pechLeg('gildenboss', GB.legendary) : Math.random() < GB.legendary;
    if (leg) dropLegendary(m);
    else giveRarityItem(rollRarityItem(80, 3), m);
  } else giveRarityItem(rollRarityItem(lv, lv >= 60 ? 3 : 2), m);
  const gold = monsterGold(lv * 2000);
  p.gold += gold;
  ui.loot('Gold', gold, lootIconUrl('gold'), '#ffd96a');
  giveSplinters(20 + 2 * Math.max(1, gxLevel(p)));
  if (lv >= 75) {
    p.materials.aetherkern = (p.materials.aetherkern || 0) + 2;
    if (typeof materialIconUrl === 'function') ui.loot('Ätherkern', 2, materialIconUrl('aetherkern'), MATERIAL_COLORS.aetherkern);
  }
  gainXp(Math.round(lv >= MAX_LEVEL ? xpToNext(MAX_LEVEL) * GB.ep : xpToNext(lv) * 0.25));
  if (lv >= 75 && typeof aufgAdd === 'function') aufgAdd('boss80');
  gxAdd('b', GX.pts.gboss);
  ui.banner(`${m.name} besiegt!`, leg ? 'Ein legendäres Teil!' : 'Belohnung der Woche');
  ui.log(['Gildenboss besiegt', `${gxDe(gold)} Gold`, `${20 + 2 * Math.max(1, gxLevel(p))} Seelensplitter`, lv >= 75 ? '2 Ätherkerne' : '', `+${GX.pts.gboss} Gildenbeitrag`].filter(Boolean).join(' · '), 'level');
  if (typeof flashScreen === 'function' && !V3.on) flashScreen('#7fe8d0', 0.35);
  saveGame();
}

// --- Auftragsliste: Gildenboss gerufen (Ansage eines Mitglieds) --------------------------------------------------------
function gbTrackRows() {
  const p = game.player;
  const A = gb.alert;
  if (!p || !p.guild || !A || Date.now() > A.until || ghSlotAt(p.x, p.y) >= 0 || gxState(p).kw >= gxWoche()) return [];
  return [{ key: 'gildenboss', title: 'Gildenboss · ' + MONSTER_TYPES.gildenboss.name, goal: 'Gildenfenster (G) → Zur Gildenhalle', have: 0, need: 1, where: 'Gildenhalle', giver: '' }];
}

// ======================================================================================================================
// 3. Grenzschlacht: Licht gegen Schatten
// ======================================================================================================================
// Zweimal am Abend nach Weltzeit (18 und 20 Uhr UTC = 19 und 21 Uhr in Mitteleuropa, im Sommer 20 und 22 Uhr) für je
// 30 Minuten. Wer mitmacht (ab Stufe 50, Knopf im Fenster Ereignisse, beim Turniermeister oder im Gildenfenster), kämpft
// auf der Turmwiese der Turnierarena: die eigene Seite gegen die andere, je vier Kämpfer – Bots füllen auf (der
// Bot-Kampf aus arena-bots.js, ganz auf dem eigenen Gerät; echte Spieler kommen wie dort nie hinein). Drei Fahnen: im
// Norden, im Süden und der Turm in der Mitte. Wer allein (oder nur mit seinem Team) an einer Fahne steht, holt sie;
// jede eigene Fahne bringt einen Punkt je Sekunde, jeder Kill zwei. Bei 600 Punkten oder nach 10 Minuten ist Schluss.
// Ergebnisfenster mit Rangliste (Fahnen, Kills, Tode, Punkte = Kills × 10 + Fahnen × 25). Belohnung in Ehre,
// Seelensplittern, Gold und Gildenbeitrag – höchstens dreimal je Termin, nur nach einem echten Kampf.
const GS = {
  times: [[18, 0], [20, 0]],
  dur: 30 * 60e3, warn: 5 * 60e3, show: 15 * 60e3, lastJoin: 3 * 60e3,
  minLevel: 50,
  goal: 600, time: 600,
  capTime: 10, more: 0.25, r: 4, killPts: 2,
  maxLohn: 3, minFight: 60,
  flags: [{ id: 'n', name: 'Nordfahne', dy: -15 }, { id: 'm', name: 'Fahnenturm', dy: 0, mid: true }, { id: 's', name: 'Südfahne', dy: 15 }],
  lohn: { win: { ehre: 30, splitter: 25, gold: 600 }, loss: { ehre: 12, splitter: 10, gold: 250 } },
  look: {
    licht: { name: 'Licht', color: '#ffd36a', bar: '#ffbe3a', dark: '#6a4a0e' },
    schatten: { name: 'Schatten', color: '#b4a6ff', bar: '#8a78ff', dark: '#221a48' }
  }
};
const gsRun = { said: {}, at: 0, pending: null, saved: null, trackKey: '' };
const gsClock = (t) => new Date(t).toLocaleTimeString(gxLoc(), { hour: '2-digit', minute: '2-digit', hour12: false });
// laufender oder nächster Termin: Nummer, Beginn, Ende, läuft
function gsEvent(now = Date.now()) {
  const d = new Date(now);
  const day = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  for (const off of [-1, 0, 1, 2]) {
    for (let k = 0; k < GS.times.length; k++) {
      const start = day + off * GX_TAG + (GS.times[k][0] * 60 + GS.times[k][1]) * 60e3;
      if (now < start + GS.dur) return { i: Math.round((day + off * GX_TAG) / GX_TAG) * GS.times.length + k, start, end: start + GS.dur, on: now >= start };
    }
  }
  return { i: 0, start: now + GX_TAG, end: now + GX_TAG + GS.dur, on: false };
}
const gsActive = () => !!(abot.run && abot.run.grenz && game.pvpMatch && game.pvpMatch.gsx);

// Ansagen fünf Minuten vorher und zu Beginn, Auftragsliste jede Minute neu
function gsTick() {
  const p = game.player;
  if (!p || !game.running || (typeof WAECHTER !== 'undefined' && WAECHTER) || p.level < GS.minLevel) return;
  const now = Date.now();
  if (!gsRun.at) gsRun.at = now;
  const E = gsEvent(now);
  const left = E.start - now;
  if (now - gsRun.at > 8000 && !gsActive()) {
    const say = (key, title, text) => {
      if (gsRun.said[key]) return;
      gsRun.said[key] = 1;
      ui.banner(title, text);
      ui.log(`${title} · ${text}`, 'level');
    };
    if (!E.on && left > 0 && left <= GS.warn) say(E.i + 'w', 'Grenzschlacht in ' + Math.ceil(left / 60000) + ' Min.', 'Licht gegen Schatten');
    if (E.on && now < E.end - GS.lastJoin) say(E.i + 'go', 'Grenzschlacht!', `Licht gegen Schatten · bis ${gsClock(E.end)} · Ereignisse (C)`);
  }
  const key = (E.on || left <= GS.show) ? Math.floor(now / 60000) + '|' + E.on : '';
  if (key !== gsRun.trackKey) {
    gsRun.trackKey = key;
    if (ui.renderQuestTrack) ui.renderQuestTrack();
  }
  if (Object.keys(gsRun.said).length > 12) gsRun.said = {};
}
setInterval(() => { try { gsTick(); } catch (err) { /* nächster Takt */ } }, 1000);

function gsBlock(p, E) {
  const now = Date.now();
  if (!p) return 'Kein Charakter.';
  if (typeof abotStart !== 'function' || typeof PVP_MODES === 'undefined' || !PVP_MODES.f4) return 'Die Grenzschlacht gibt es hier nicht.';
  if (p.level < GS.minLevel) return `Die Grenzschlacht gibt es ab Stufe ${GS.minLevel}.`;
  if (!E.on) return `Die nächste Grenzschlacht beginnt um ${gsClock(E.start)}.`;
  if (now > E.end - GS.lastJoin) return 'Die Grenzschlacht endet gleich – die nächste kommt bald.';
  if (game.pvpMatch) return 'Du kämpfst gerade schon.';
  if (p.dead) return 'Erst wieder auf die Beine kommen.';
  if (game.arenaRun || game.duel || game.turmRun) return 'Erst den laufenden Kampf beenden.';
  return '';
}
function gsJoin() {
  const p = game.player;
  const E = gsEvent();
  const why = gsBlock(p, E);
  if (why) {
    gxMsg(why, 'warn');
    return false;
  }
  abot.pauseUntil = 0;
  gsRun.pending = E;
  // abotStart meldet „Turmschlacht mit Bots.“ – in der Grenzschlacht nicht
  const log = ui.log;
  ui.log = function (t, ty) { if (t === 'Turmschlacht mit Bots.') return; return log.call(this, t, ty); };
  let ok = false;
  try {
    ok = abotStart('f4');
  } finally {
    ui.log = log;
    gsRun.pending = null;
  }
  if (!ok || !gsActive()) {
    gsRestore();
    return false;
  }
  ui.log('Grenzschlacht · Licht gegen Schatten · Erobert die Fahnen – 600 Punkte gewinnen', 'level');
  return true;
}
// Teams als Seiten zeigen: Name und Farben (PVP_TEAM) und Art (PVP_MODES.f4) für die Dauer der Schlacht umstellen
function gsLooks(R) {
  const p = game.player;
  const F = typeof factionOf === 'function' ? factionOf(p) : 'licht';
  const O = F === 'licht' ? 'schatten' : 'licht';
  const foe = R.team === 'A' ? 'B' : 'A';
  if (!gsRun.saved) gsRun.saved = { A: Object.assign({}, PVP_TEAM.A), B: Object.assign({}, PVP_TEAM.B), f4: Object.assign({}, PVP_MODES.f4) };
  Object.assign(PVP_TEAM[R.team], GS.look[F]);
  Object.assign(PVP_TEAM[foe], GS.look[O]);
  Object.assign(PVP_MODES.f4, { name: 'Grenzschlacht', short: 'Licht gegen Schatten', tag: 'GS' });
  return { [R.team]: F, [foe]: O };
}
function gsRestore() {
  const S = gsRun.saved;
  if (!S) return;
  gsRun.saved = null;
  Object.assign(PVP_TEAM.A, S.A);
  Object.assign(PVP_TEAM.B, S.B);
  Object.assign(PVP_MODES.f4, S.f4);
}
function gsSetup(R, M, E) {
  const S = PVP_SLOTS[R.slot];
  const side = gsLooks(R);
  R.grenz = {
    E, side, pts: { A: 0, B: 0 }, caps: {}, score0: { A: 0, B: 0 }, acc: 0, lohn: null,
    flags: GS.flags.map((f) => ({ id: f.id, name: f.name, mid: !!f.mid, x: S.cx * TILE, y: (S.cy + f.dy) * TILE, r: (f.mid ? PVP.capR : GS.r) * TILE, own: '', prog: 0, a: 0, b: 0 }))
  };
  R.endAt = R.fightAt + GS.time;
  M.endAt = R.endAt;
  M.gsx = true;
  R.dirty = true;
}
// Start über abotStart → pvpOnMatch: gleich als Grenzschlacht einrichten (noch bevor die Anzeige zum ersten Mal kommt)
if (typeof pvpOnMatch === 'function') {
  const _gsPvpOnMatch = pvpOnMatch;
  // eslint-disable-next-line no-global-assign
  pvpOnMatch = function (d) {
    const r = _gsPvpOnMatch(d);
    try {
      const E = gsRun.pending;
      const M = game.pvpMatch;
      if (E && M && d && abot.run && d.id === abot.run.id && M.id === d.id && !M.gsx) gsSetup(abot.run, M, E);
    } catch (err) { console.warn('Grenzschlacht:', err); }
    return r;
  };
}

// --- Fahnen (statt des Turms der Turmschlacht, abotTower in arena-bots.js) -------------------------------------------
function gsCapture(R, f, team) {
  const G = R.grenz;
  f.own = team;
  f.prog = team === 'A' ? -100 : 100;
  for (const u of R.units) if (u.alive && u.team === team && hyp(u.e.x - f.x, u.e.y - f.y) <= f.r) G.caps[u.pid] = (G.caps[u.pid] | 0) + 1;
  const T = PVP_TEAM[team];
  if (team === R.team) ui.banner('Fahne erobert', `${f.name} · ${T.name}`);
  else ui.log(`Grenzschlacht · ${f.name} · ${T.name} hat sie erobert`, 'warn');
}
function gsFlagsTick(R, dt) {
  const G = R.grenz;
  const M = game.pvpMatch;
  // eigenes Banner zum Kampfbeginn (abotTick zeigt seins nur, solange M.shown ≠ 0)
  if (M && M.gsx && M.shown !== 0) {
    M.shown = 0;
    ui.banner('Kampf!', `Erobert die Fahnen – ${GS.goal} Punkte gewinnen`);
  }
  const rate = (100 / GS.capTime) * dt;
  for (const f of G.flags) {
    let a = 0;
    let b = 0;
    for (const u of R.units) if (u.alive && hyp(u.e.x - f.x, u.e.y - f.y) <= f.r) { if (u.team === 'A') a++; else b++; }
    f.a = a;
    f.b = b;
    const was = f.own;
    if (a && !b) f.prog = Math.max(-100, f.prog - rate * (1 + GS.more * (a - 1)));
    else if (b && !a) f.prog = Math.min(100, f.prog + rate * (1 + GS.more * (b - 1)));
    else if (!a && !b) {
      // niemand da: langsam zurück zum Stand des Besitzers bzw. auf neutral
      const goal = f.own === 'A' ? -100 : f.own === 'B' ? 100 : 0;
      f.prog += Math.sign(goal - f.prog) * Math.min(Math.abs(goal - f.prog), rate * 0.25);
    }
    if (f.prog <= -100 && f.own !== 'A') gsCapture(R, f, 'A');
    else if (f.prog >= 100 && f.own !== 'B') gsCapture(R, f, 'B');
    else if ((f.own === 'A' && f.prog > 0) || (f.own === 'B' && f.prog < 0)) f.own = '';
    if (f.own !== was) R.dirty = true;
  }
  // Punkte: je eigener Fahne einer je Sekunde, je Kill GS.killPts (R.score zählt die Kills, abotDie/abotLocal)
  G.acc += dt;
  while (G.acc >= 1) {
    G.acc -= 1;
    for (const f of G.flags) if (f.own) G.pts[f.own]++;
    R.dirty = true;
  }
  for (const t of ['A', 'B']) {
    const k = (R.score[t] | 0) - G.score0[t];
    if (k > 0) {
      G.pts[t] += k * GS.killPts;
      G.score0[t] = R.score[t] | 0;
    }
  }
  // der Kristall über dem Turm zeigt die mittlere Fahne (turnierarena.js); höchstens 98 %, sonst laufen Bots fernen
  // Gegnern nach, statt die anderen Fahnen zu holen (abotAct)
  const mid = G.flags.find((f) => f.mid);
  R.tower.pct = Math.min(98, Math.abs(mid.prog));
  R.tower.owner = mid.prog < 0 ? 'A' : mid.prog > 0 ? 'B' : '';
  R.inside = { A: mid.a, B: mid.b };
}
if (typeof abotTower === 'function') {
  const _gsAbotTower = abotTower;
  // eslint-disable-next-line no-global-assign
  abotTower = function (R, dt) {
    if (R && R.grenz) return gsFlagsTick(R, dt);
    return _gsAbotTower(R, dt);
  };
}
if (typeof abotCheckEnd === 'function') {
  const _gsCheckEnd = abotCheckEnd;
  // eslint-disable-next-line no-global-assign
  abotCheckEnd = function (R) {
    if (!R || !R.grenz) return _gsCheckEnd(R);
    const G = R.grenz;
    if (G.pts.A >= GS.goal || G.pts.B >= GS.goal) {
      abotEnd(R, G.pts.A === G.pts.B ? '' : G.pts.A > G.pts.B ? 'A' : 'B', 'fahnen');
      return;
    }
    if (game.time >= R.endAt) {
      const own = (t) => G.flags.filter((f) => f.own === t).length;
      const w = G.pts.A !== G.pts.B ? (G.pts.A > G.pts.B ? 'A' : 'B') : own('A') !== own('B') ? (own('A') > own('B') ? 'A' : 'B') : '';
      abotEnd(R, w, 'zeit');
    }
  };
}
// Bots ohne nahen Gegner: zur nächsten Fahne, die ihrem Team nicht gehört (gehören alle, verteidigen sie eine)
if (typeof abotIdle === 'function') {
  const _gsIdle = abotIdle;
  // eslint-disable-next-line no-global-assign
  abotIdle = function (b, R, dt) {
    if (!R || !R.grenz) return _gsIdle(b, R, dt);
    const G = R.grenz;
    const now = game.time;
    if (!(b.gsAt > now) || !G.flags[b.gsF]) {
      b.gsAt = now + abRand(4, 7);
      let best = 0;
      let bs = Infinity;
      G.flags.forEach((f, i) => {
        const mine = f.own === b.team && Math.abs(f.prog) >= 99;
        const foes = b.team === 'A' ? f.b : f.a;
        const sc = hyp(f.x - b.fig.x, f.y - b.fig.y) / 400 + (mine ? (foes ? 0.4 : 3) : 0) + Math.random() * 0.9;
        if (sc < bs) { bs = sc; best = i; }
      });
      b.gsF = best;
    }
    const f = G.flags[b.gsF];
    const rr = f.r * 0.6 * b.capOff.r;
    const gx = f.x + Math.cos(b.capOff.a) * rr;
    const gy = f.y + Math.sin(b.capOff.a) * rr;
    if (hyp(gx - b.fig.x, gy - b.fig.y) > 12) abotGo(b, R, gx, gy, dt, 1);
  };
}
// Ende: zuerst die Belohnung (das Ergebnisfenster zeigt sie), dann wie gewohnt; die Turmschlacht-Zähler bleiben
if (typeof abotEnd === 'function') {
  const _gsAbotEnd = abotEnd;
  // eslint-disable-next-line no-global-assign
  abotEnd = function (R, w, why) {
    const gs = R && R.grenz && R.state !== 'end';
    if (gs) { try { gsReward(R, w); } catch (err) { console.warn('Grenzschlacht:', err); } }
    const r = _gsAbotEnd(R, w, why);
    if (gs) {
      const A = pvpSave();
      A.fn = Math.max(0, (A.fn | 0) - 1);
      if (w && w === R.team) A.fw = Math.max(0, (A.fw | 0) - 1);
      saveGame();
    }
    return r;
  };
}
if (typeof abotCleanup === 'function') {
  const _gsCleanup = abotCleanup;
  // eslint-disable-next-line no-global-assign
  abotCleanup = function () {
    const r = _gsCleanup();
    if (!gsActive()) gsRestore();
    return r;
  };
}

// --- Belohnung --------------------------------------------------------------------------------------------------------
function gsReward(R, w) {
  const p = game.player;
  const G = R.grenz;
  const won = w ? w === R.team : null;
  const fought = R.fightStart != null ? game.time - R.fightStart : 0;
  const s = gxState(p);
  s.gsN = (s.gsN | 0) + 1;
  if (won === true) s.gsW = (s.gsW | 0) + 1;
  if (!s.gs || s.gs.i !== G.E.i) s.gs = { i: G.E.i, n: 0 };
  const minDealt = (typeof ABOT !== 'undefined' && ABOT.minDealt) || 0.5;
  let none = '';
  if (fought < GS.minFight) none = 'Zu kurz gekämpft – keine Belohnung.';
  else if (!(R.dealt >= minDealt * (R.foeHp || 1))) none = 'Kaum mitgekämpft – keine Belohnung.';
  else if (s.gs.n >= GS.maxLohn) none = `Belohnung gibt es höchstens ${GS.maxLohn}-mal je Grenzschlacht.`;
  if (none) {
    G.lohn = { none, won };
    return;
  }
  s.gs.n++;
  const L = won === true ? GS.lohn.win : GS.lohn.loss;
  const gold = Math.round(p.level * L.gold);
  p.gold += gold;
  ui.loot('Gold', gold, lootIconUrl('gold'), '#ffd96a');
  giveSplinters(L.splitter);
  s.ehre += L.ehre;
  s.ehreTot += L.ehre;
  ui.loot('Ehre', L.ehre, gsEhreIcon(), '#ffd36a');
  const gxp = p.guild ? (won === true ? GX.pts.gsWin : GX.pts.gsLoss) : 0;
  if (gxp) gxAdd('g', gxp);
  G.lohn = { won, gold, splitter: L.splitter, ehre: L.ehre, gx: gxp, n: s.gs.n };
  ui.log(['Grenzschlacht', won === true ? 'Sieg' : won === false ? 'Niederlage' : 'Unentschieden', `${L.ehre} Ehre`, `${L.splitter} Seelensplitter`, `${gxDe(gold)} Gold`, gxp ? `+${gxp} Gildenbeitrag` : ''].filter(Boolean).join(' · '), 'level');
}
// Zeichen der Ehre: goldener Schild mit Sparren (einmal gemalt)
let gsEhreUrl = '';
function gsEhreIcon() {
  if (gsEhreUrl) return gsEhreUrl;
  const c = document.createElement('canvas');
  c.width = c.height = 48;
  const g = c.getContext('2d');
  const sh = () => {
    g.beginPath();
    g.moveTo(10, 8);
    g.lineTo(38, 8);
    g.lineTo(38, 24);
    g.quadraticCurveTo(36, 37, 24, 43);
    g.quadraticCurveTo(12, 37, 10, 24);
    g.closePath();
  };
  sh();
  g.fillStyle = '#e8c060';
  g.fill();
  g.lineWidth = 3;
  g.strokeStyle = '#6a4a0e';
  g.stroke();
  g.fillStyle = '#fff2c0';
  g.beginPath();
  g.moveTo(14, 27);
  g.lineTo(24, 16);
  g.lineTo(34, 27);
  g.lineTo(34, 32);
  g.lineTo(24, 22);
  g.lineTo(14, 32);
  g.closePath();
  g.fill();
  gsEhreUrl = c.toDataURL();
  return gsEhreUrl;
}
// Ehrentausch (Seite „Ereignisse“): Ehre gegen Splitter, Erfahrungsring, Ätherkerne, Juwel
const GS_TAUSCH = [
  { id: 'splitter', name: 'Seelensplitter', preis: 20, info: () => '30 Stück', give: () => giveSplinters(30) },
  { id: 'ring', name: 'Erfahrungsring', preis: 40, ok: () => typeof EP_RING !== 'undefined', info: () => (typeof EP_RING !== 'undefined' ? `+${Math.round(EP_RING.mul * 100)} % Erfahrung, ${EP_RING.minutes} Min.` : ''),
    give: (p) => {
      p.materials.epring = (p.materials.epring || 0) + 1;
      if (typeof materialIconUrl === 'function') ui.loot('Erfahrungsring', 1, materialIconUrl('epring'), EP_RING.color);
    } },
  { id: 'kerne', name: 'Ätherkerne', preis: 60, min: 75, info: () => '2 Stück',
    give: (p) => {
      p.materials.aetherkern = (p.materials.aetherkern || 0) + 2;
      if (typeof materialIconUrl === 'function') ui.loot('Ätherkern', 2, materialIconUrl('aetherkern'), MATERIAL_COLORS.aetherkern);
    } },
  { id: 'juwel', name: 'Juwel', preis: 120, min: 75, ok: () => typeof juwelDrop === 'function', info: () => 'Stufe I, zufällige Art', give: () => juwelDrop(1) }
];
function gsTausch(id) {
  const p = game.player;
  const T = GS_TAUSCH.find((x) => x.id === id);
  if (!p || !T || (T.ok && !T.ok())) return false;
  const s = gxState(p);
  if (s.ehre < T.preis || (T.min && p.level < T.min)) return false;
  s.ehre -= T.preis;
  T.give(p);
  saveGame();
  return true;
}

// --- Anzeige im Kampf (statt der Karte der Turmschlacht, pvpHud in turnierarena.js) ------------------------------------
function gsHud(M, R) {
  if (!pvpUi.el) pvpHudBuild();
  gxCss();
  const el = pvpUi.el;
  const G = R.grenz;
  const p = game.player;
  const touch = !!(typeof input !== 'undefined' && input.touchUi);
  if (touch !== pvpUi.touch || !/gs-hud/.test(el.className)) {
    pvpUi.touch = touch;
    el.className = (touch ? 'touch' : 'pc') + ' gs-hud';
    pvpUi.key = '';
    pvpUi.placeAt = 0;
  }
  const t = game.time;
  const time = M.state === 'count' ? `Start in ${Math.max(0, Math.ceil(M.fightAt - t))} s` : M.state === 'end' ? 'Ende' : pvpClock(M.endAt - t);
  let info = '';
  if (M.state === 'end') info = `Zurück in ${Math.max(0, Math.ceil(M.returnAt - t))} s`;
  else if (p.dead && M.respawnAt) info = `Wiedereinstieg in ${Math.max(0, Math.ceil(M.respawnAt - t))} s`;
  const me = R.team;
  const foe = me === 'A' ? 'B' : 'A';
  const flagHtml = G.flags.map((f) => {
    const col = f.own ? PVP_TEAM[f.own].color : '#9a9aa8';
    const fill = f.prog < 0 ? PVP_TEAM.A.bar : f.prog > 0 ? PVP_TEAM.B.bar : '#9a9aa8';
    return `<span class="gs-f${f.a && f.b ? ' kampf' : ''}" style="border-color:${col}" title="${f.name}"><i style="height:${Math.round(Math.abs(f.prog))}%;background:${fill}"></i><em>${f.id === 'n' ? 'N' : f.id === 's' ? 'S' : 'M'}</em></span>`;
  }).join('');
  const caps = G.caps.me | 0;
  const mine = M.roster && M.roster.get(M.me);
  const key = [touch, time, info, G.pts.A, G.pts.B, flagHtml, pvpUi.open, M.state, caps, mine ? mine.kills : 0].join('|');
  if (key !== pvpUi.key) {
    pvpUi.key = key;
    const leaveBtn = M.state === 'end' ? '<button type="button" data-pv="home">Zurück in die Stadt</button>' : '<button type="button" data-pv="leave">Verlassen</button>';
    const pts = (tm) => `<span class="gs-p" style="color:${PVP_TEAM[tm].color}">${PVP_TEAM[tm].name}${tm === me ? ' (du)' : ''}</span>` +
      `<span class="gs-pb"><i style="width:${Math.min(100, (G.pts[tm] / GS.goal) * 100).toFixed(1)}%;background:${PVP_TEAM[tm].bar}"></i></span><b>${G.pts[tm]}</b>`;
    if (touch) {
      el.innerHTML = `<span class="md">GS</span><span>${time}</span><b><span style="color:${PVP_TEAM[me].color}">${G.pts[me]}</span>:<span style="color:${PVP_TEAM[foe].color}">${G.pts[foe]}</span></b>` +
        `<span class="gs-fl">${flagHtml}</span>${info ? `<span class="info">${info}</span>` : ''}` +
        `<button type="button" class="x" data-pv="x" aria-label="Mehr">${pvpUi.open ? '▴' : '▾'}</button>` +
        (pvpUi.open ? `<div class="det"><div class="gs-pts">${pts(me)}${pts(foe)}</div>${leaveBtn}</div>` : '');
    } else {
      el.innerHTML = `<div class="hd"><span class="md">Grenzschlacht</span><span class="tm">${time}</span></div>` +
        `<div class="bd"><div class="gs-pts">${pts(me)}${pts(foe)}</div><div class="gs-fl">${flagHtml}<small>Fahnen</small></div>` +
        (info ? `<div class="rsp">${info}</div>` : '') +
        `<div class="ft"><span class="kd">Du: <b>${mine ? mine.kills : 0}</b> Kills · <b>${caps}</b> Fahnen</span>${leaveBtn}</div></div>`;
    }
    pvpUi.placeAt = 0;
  }
  if (el.hidden) {
    el.hidden = false;
    pvpUi.placeAt = 0;
  }
  if (!pvpUi.placeAt || t - pvpUi.placeAt > 2) {
    pvpUi.placeAt = t || 0.001;
    pvpHudPlace(el);
  }
  // Anzeigetafel oben (PC): Punkte beider Seiten und Zeit
  const sc = pvpUi.score;
  if (sc) {
    if (touch) sc.hidden = true;
    else {
      const k2 = [G.pts.A, G.pts.B, time].join('|');
      if (k2 !== pvpUi.scoreKey) {
        pvpUi.scoreKey = k2;
        const box = (tm, right) => `<span class="t${tm === me ? ' me' : ''}" style="background:${PVP_TEAM[tm].dark};color:${PVP_TEAM[tm].color}">` +
          (right ? `<b>${G.pts[tm]}</b> ${PVP_TEAM[tm].name}` : `${PVP_TEAM[tm].name} <b>${G.pts[tm]}</b>`) + '</span>';
        sc.innerHTML = `<div class="sc">${box(me, false)}<span class="mid"><span class="clk">${time}</span><small>bis ${GS.goal} Punkte</small></span>${box(foe, true)}</div>`;
      }
      sc.hidden = false;
    }
  }
}
if (typeof pvpHud === 'function') {
  const _gsHud = pvpHud;
  // eslint-disable-next-line no-global-assign
  pvpHud = function () {
    const M = game.pvpMatch;
    if (M && M.gsx && abot.run && abot.run.grenz && game.running) {
      try { return gsHud(M, abot.run); } catch (err) { console.warn('Grenzschlacht:', err); }
    }
    return _gsHud();
  };
}

// --- Ergebnisfenster mit Rangliste der Schlacht -------------------------------------------------------------------------
function gsSummary(M) {
  if (typeof pvpCss === 'function') pvpCss();
  gxCss();
  let el = document.getElementById('pvpSum');
  if (el) el.remove();
  const R = abot.run && abot.run.id === M.id ? abot.run : null;
  const G = R && R.grenz;
  const res = M.result || {};
  el = document.createElement('div');
  el.id = 'pvpSum';
  el.className = 'gs-sum';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Ergebnis der Grenzschlacht');
  const title = res.won === true ? 'Sieg!' : res.won === false ? 'Niederlage' : 'Unentschieden';
  const why = { fahnen: `${GS.goal} Punkte erreicht`, zeit: 'Die Zeit ist um' }[res.why] || '';
  const me = M.team;
  const foe = me === 'A' ? 'B' : 'A';
  const pts = G ? G.pts : { A: 0, B: 0 };
  const rows = [...M.roster.values()].map((e) => {
    const caps = G ? G.caps[e.pid] | 0 : 0;
    return { e, caps, pts: (e.kills | 0) * 10 + caps * 25 };
  }).sort((a, b) => b.pts - a.pts || (b.e.kills | 0) - (a.e.kills | 0) || (a.e.deaths | 0) - (b.e.deaths | 0));
  const L = G && G.lohn;
  let lohn = '';
  if (L && L.none) lohn = `<p class="sub gs-none">${L.none}</p>`;
  else if (L) {
    lohn = `<div class="gs-lohn"><span><img src="${gsEhreIcon()}" alt=""> <b>${L.ehre}</b> Ehre</span><span><b>${L.splitter}</b> Seelensplitter</span><span><b>${gxDe(L.gold)}</b> Gold</span>` +
      (L.gx ? `<span><b>+${L.gx}</b> Gildenbeitrag</span>` : '') + '</div>' +
      `<p class="sub">Belohnung ${L.n} von ${GS.maxLohn} in dieser Grenzschlacht</p>`;
  }
  el.innerHTML = '<button class="x" type="button" aria-label="Schließen">✕</button>' +
    `<h3 style="color:${res.won === true ? '#ffd34d' : res.won === false ? '#ff8a7a' : '#eef2ff'}">${title}</h3>` +
    `<p class="sub">Grenzschlacht · Licht gegen Schatten${why ? ' · ' + why : ''}</p>` +
    `<div class="gs-end"><span style="color:${PVP_TEAM[me].color}">${PVP_TEAM[me].name} <b>${pts[me]}</b></span><i>:</i><span style="color:${PVP_TEAM[foe].color}"><b>${pts[foe]}</b> ${PVP_TEAM[foe].name}</span></div>` +
    lohn + '<p class="gs-rt">Rangliste der Schlacht</p>' +
    '<table class="gs-rang"><tr><th class="n">#</th><th>Name</th><th class="n">Fahnen</th><th class="n">Kills</th><th class="n">Tode</th><th class="n">Punkte</th></tr>' +
    rows.map((r, i) => `<tr class="${r.e.pid === M.me ? 'me' : ''}"><td class="n">${i + 1}</td><td style="color:${PVP_TEAM[r.e.team === 'B' ? 'B' : 'A'].color}">${gxEsc(r.e.name)}${r.e.left ? ' <small>(gegangen)</small>' : ''}</td>` +
      `<td class="n">${r.caps}</td><td class="n">${r.e.kills | 0}</td><td class="n">${r.e.deaths | 0}</td><td class="n"><b>${r.pts}</b></td></tr>`).join('') + '</table>' +
    '<p class="sub">Punkte: Kills × 10 + Fahnen × 25</p>' +
    '<button type="button" class="btn btn-primary go" data-pv="home">Zurück in die Stadt</button>';
  document.body.appendChild(el);
  const close = () => {
    el.classList.remove('on');
    setTimeout(() => el.remove(), 260);
  };
  el.querySelector('.x').addEventListener('click', (e) => { e.stopPropagation(); close(); });
  el.querySelector('[data-pv="home"]').addEventListener('click', (e) => { e.stopPropagation(); close(); pvpReturnHome(); });
  requestAnimationFrame(() => el.classList.add('on'));
}
if (typeof pvpSummary === 'function') {
  const _gsSummary = pvpSummary;
  // eslint-disable-next-line no-global-assign
  pvpSummary = function (M) {
    if (M && M.gsx) {
      try { return gsSummary(M); } catch (err) { console.warn('Grenzschlacht:', err); }
    }
    return _gsSummary(M);
  };
}

// --- Bild: Fahnen im Norden und Süden (die mittlere zeigt der Kristall über dem Turm) ----------------------------------
// 2D: nach allen Figuren gemalt (wie der Kristall, über drawParticles); Stange, Tuch in der Farbe des Besitzers, darüber
// ein Balken für das Erobern, ringsum sechs kleine Grenzsteine (kein Bodenring)
function gsDraw2d(ctx) {
  if (!gsActive()) return;
  const t = game.time;
  for (const f of abot.run.grenz.flags) {
    if (f.mid) continue;
    const col = f.own ? PVP_TEAM[f.own].bar : '#d8d8e0';
    ctx.save();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.3;
      const x = f.x + Math.cos(a) * f.r;
      const y = f.y + Math.sin(a) * f.r;
      ctx.fillStyle = '#5a5448';
      ctx.fillRect(x - 4, y - 9, 8, 10);
      ctx.fillStyle = '#8e8a7e';
      ctx.fillRect(x - 4, y - 9, 8, 3);
    }
    const x = f.x;
    const y = f.y;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a3a28';
    ctx.fillRect(x - 2, y - 92, 4, 92);
    ctx.fillStyle = '#e2bc5a';
    ctx.beginPath();
    ctx.arc(x, y - 94, 4, 0, Math.PI * 2);
    ctx.fill();
    // Tuch mit leichtem Wehen
    const w1 = Math.sin(t * 3 + f.y * 0.01) * 4;
    const w2 = Math.sin(t * 3 + 1.4 + f.y * 0.01) * 5;
    ctx.beginPath();
    ctx.moveTo(x + 2, y - 88);
    ctx.quadraticCurveTo(x + 22, y - 90 + w1, x + 42, y - 86 + w2);
    ctx.lineTo(x + 36, y - 74 + w2 * 0.5);
    ctx.lineTo(x + 42, y - 62 + w2);
    ctx.quadraticCurveTo(x + 22, y - 66 + w1, x + 2, y - 62);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(20,16,12,0.85)';
    ctx.stroke();
    // Erobern: Balken über der Fahne
    const k = Math.abs(f.prog) / 100;
    if (k > 0.01 && k < 0.999) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x - 24, y - 112, 48, 7);
      ctx.fillStyle = f.prog < 0 ? PVP_TEAM.A.bar : PVP_TEAM.B.bar;
      ctx.fillRect(x - 23, y - 111, 46 * k, 5);
    }
    ctx.restore();
  }
}
if (typeof drawParticles === 'function') {
  const _gsDrawParticles = drawParticles;
  // eslint-disable-next-line no-global-assign
  drawParticles = function (ctx) {
    if (!V3.on) { try { gsDraw2d(ctx); } catch (err) { /* ohne Fahnen weiter */ } }
    _gsDrawParticles(ctx);
  };
}
// 3D: zwei Fahnen als kleine eigene Gruppe (geteilte Formen), Tuchfarbe nach Besitzer, sechs Grenzsteine je Fahne
let gs3 = null;
function gsBuild3() {
  const g = new THREE.Group();
  const pole = new THREE.CylinderGeometry(0.08, 0.1, 3.6, 8);
  pole.translate(0, 1.8, 0);
  const foot = new THREE.CylinderGeometry(0.42, 0.5, 0.26, 8);
  foot.translate(0, 0.13, 0);
  const cloth = new THREE.PlaneGeometry(1.7, 1.05, 4, 1);
  cloth.translate(0.85, 0, 0);
  const knob = new THREE.SphereGeometry(0.15, 8, 6);
  const stone = new THREE.CylinderGeometry(0.13, 0.17, 0.4, 6);
  stone.translate(0, 0.2, 0);
  const wood = new THREE.MeshLambertMaterial({ color: 0x4a3a28 });
  const gold = new THREE.MeshLambertMaterial({ color: 0xe2bc5a });
  const rock = new THREE.MeshLambertMaterial({ color: 0x8e8a7e });
  const flags = [];
  for (let i = 0; i < 2; i++) {
    const f = new THREE.Group();
    f.add(new THREE.Mesh(foot, rock));
    f.add(new THREE.Mesh(pole, wood));
    const k = new THREE.Mesh(knob, gold);
    k.position.y = 3.68;
    f.add(k);
    const mat = new THREE.MeshLambertMaterial({ color: 0xd8d8e0, side: THREE.DoubleSide });
    const c = new THREE.Mesh(cloth, mat);
    c.position.y = 3.0;
    f.add(c);
    const stones = [];
    for (let s = 0; s < 6; s++) {
      const st = new THREE.Mesh(stone, rock);
      f.add(st);
      stones.push(st);
    }
    g.add(f);
    flags.push({ f, c, mat, stones, r: -1 });
  }
  return { g, flags };
}
function gsSync3() {
  const on = V3.on && gsActive();
  if (!on) {
    if (gs3) gs3.g.visible = false;
    return;
  }
  if (!gs3) gs3 = gsBuild3();
  if (gs3.g.parent !== V3.scene) V3.scene.add(gs3.g);
  gs3.g.visible = true;
  const t = game.time;
  const side = abot.run.grenz.flags.filter((f) => !f.mid);
  side.forEach((f, i) => {
    const F = gs3.flags[i];
    if (!F) return;
    F.f.position.set(f.x * U3, 0, f.y * U3);
    if (F.r !== f.r) {
      F.r = f.r;
      F.stones.forEach((st, k) => {
        const a = (k / 6) * Math.PI * 2 + 0.3;
        st.position.set(Math.cos(a) * f.r * U3, 0, Math.sin(a) * f.r * U3);
      });
    }
    F.mat.color.set(f.own ? PVP_TEAM[f.own].bar : '#d8d8e0');
    F.c.rotation.y = Math.sin(t * 2.2 + i * 1.7) * 0.3;
  });
}
if (typeof syncDuel3 === 'function') {
  const _gsSyncDuel3 = syncDuel3;
  // eslint-disable-next-line no-global-assign
  syncDuel3 = function () {
    _gsSyncDuel3();
    try { gsSync3(); } catch (err) { /* ohne Fahnen weiter */ }
  };
}

// --- Fenster: Seite „Ereignisse“, Turniermeister, Gildenfenster --------------------------------------------------------
function gsStatusHtml(p) {
  const E = gsEvent();
  // Termine in Ortszeit (heute)
  const d = new Date();
  const times = GS.times.map(([h, m]) => gsClock(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h, m))).join(' und ');
  let h = '';
  if (E.on) {
    h += `<p class="ev-now"><b>Jetzt!</b> <span>Licht gegen Schatten bis</span> <b>${gsClock(E.end)}</b></p>`;
    const why = gsBlock(p, E);
    h += `<p class="ev-row"><button type="button" class="btn ${why ? '' : 'btn-primary'}" data-gsj${why ? ' disabled' : ''}>Grenzschlacht beitreten</button>${why ? ` <span class="ev-hint">${why}</span>` : ''}</p>`;
  } else h += `<p class="ev-row"><span>Nächste Grenzschlacht</span> <b>${new Date(E.start).toLocaleString(gxLoc(), { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false })}</b></p>`;
  h += `<p class="ev-hint">Jeden Tag um ${times} Uhr für 30 Minuten (ab Stufe ${GS.minLevel}). Drei Fahnen: Jede eigene bringt einen Punkt je Sekunde, jeder Kill zwei – bei ${GS.goal} Punkten gewinnt deine Seite. Bots füllen die Teams auf.</p>`;
  return h;
}
function gsBoxHtml(p) {
  const s = gxState(p);
  let h = `<section class="ev-box gs-box${gsEvent().on ? ' ev-an' : ''}"><h3>Grenzschlacht</h3>` + gsStatusHtml(p);
  h += `<p class="ev-row"><img class="ev-ico" src="${gsEhreIcon()}" alt=""> <span>Ehre</span> <b class="gs-ehre">${gxDe(s.ehre)}</b> <span>Siege</span> <b>${s.gsW | 0}</b> <span>Schlachten</span> <b>${s.gsN | 0}</b></p>`;
  h += '<div class="ev-shop">' + GS_TAUSCH.filter((T) => !T.ok || T.ok()).map((T) => {
    const zu = T.min && p.level < T.min;
    const ok = !zu && s.ehre >= T.preis;
    return `<div class="ev-item"><b>${T.name}</b><small>${zu ? `ab Stufe ${T.min}` : T.info(p)}</small>` +
      `<button type="button" class="mini-btn" data-gst="${T.id}"${ok ? '' : ' disabled'}><img class="ev-ico-s" src="${gsEhreIcon()}" alt=""> ${T.preis}</button></div>`;
  }).join('') + '</div>';
  h += '<p class="ev-hint">Ehre gibt es in der Grenzschlacht: Sieg 30, Niederlage 12 – dazu Seelensplitter, Gold und Gildenbeitrag (höchstens dreimal je Termin).</p></section>';
  return h;
}
function gsBindBox(root) {
  const j = root.querySelector('[data-gsj]');
  if (j) j.addEventListener('click', (ev) => {
    ev.stopPropagation();
    if (gsJoin() && typeof ui !== 'undefined') ui.closePanels();
  });
  root.querySelectorAll('[data-gst]').forEach((b) => b.addEventListener('click', (ev) => {
    ev.stopPropagation();
    if (gsTausch(b.dataset.gst) && typeof ui.renderCharPanel === 'function') ui.renderCharPanel();
  }));
}
// Seite „Ereignisse“ (ereignisse.js, CHAR_TABS_EXTRA): Kasten Grenzschlacht mit Ehrentausch dazu
if (typeof CHAR_TABS_EXTRA !== 'undefined') {
  const T = CHAR_TABS_EXTRA.find((x) => x.id === 'ereignisse');
  if (T) {
    const _html = T.html;
    const _bind = T.bind;
    T.html = function (p) {
      const h = _html(p);
      try {
        const box = gsBoxHtml(p);
        return h.endsWith('</div>') ? h.slice(0, -6) + box + '</div>' : h + box;
      } catch (err) { return h; }
    };
    T.bind = function (root) {
      if (_bind) _bind(root);
      try { gsBindBox(root); } catch (err) { /* weiter */ }
    };
  }
}
function gsOpenInfo() {
  ui.charTab = 'ereignisse';
  if ($('panelChar').hidden) ui.toggle('panelChar');
  else ui.renderCharPanel();
}
// Turniermeister: Kasten oben im Fenster
if (typeof pvpRenderMaster === 'function') {
  const _gsRenderMaster = pvpRenderMaster;
  // eslint-disable-next-line no-global-assign
  pvpRenderMaster = function () {
    _gsRenderMaster();
    try {
      const body = $('npcBody');
      const p = game.player;
      if (!body || !p || game.pvpMatch || body.querySelector('.gs-box')) return;
      body.insertAdjacentHTML('afterbegin', `<section class="ev-box gs-box gs-npc${gsEvent().on ? ' ev-an' : ''}"><h3>Grenzschlacht</h3>${gsStatusHtml(p)}</section>`);
      gsBindBox(body.querySelector('.gs-npc'));
    } catch (err) { console.warn('Grenzschlacht:', err); }
  };
}
// Gildenfenster: kleiner Kasten Gildenboss und Grenzschlacht
function gbPanelHtml(p) {
  const g = gxState(p);
  const wk = gxWoche();
  const s = ghSlotOf(p.guild.name);
  const inHall = ghSlotAt(p.x, p.y) === s;
  const m = inHall ? gbAlive(s) : null;
  let st;
  if (m) st = `<span>${MONSTER_TYPES.gildenboss.name} ist in der Halle!</span>`;
  else if (g.kw >= wk) st = `<span>Diese Woche besiegt</span> · <span>neu ab</span> <b>${gbNextWeekText()}</b>`;
  else st = '<span>Diese Woche noch nicht besiegt</span>';
  const why = inHall ? gbCanSummon(p) : '';
  return `<section class="gx-box gx-boss"><h4>Gildenboss · ${MONSTER_TYPES.gildenboss.name}</h4><p class="gx-row">${st}</p><p class="gx-btns">` +
    (inHall ? `${!why ? '<button type="button" class="btn btn-primary" data-gx="ruf">Gildenboss rufen</button>' : ''}<button type="button" class="btn" data-gx="raus">Halle verlassen</button>`
      : '<button type="button" class="btn btn-primary" data-gx="halle">Zur Gildenhalle</button>') + '</p>' +
    '<p class="hint-text">Einmal in der Woche ruft ein Mitglied in der Gildenhalle den Gildenboss. Wer dabei ist, kämpft mit – er wird mit jedem Kämpfer stärker, allein ist er zu schaffen. Belohnung für jeden einmal je Woche: ein Ausrüstungsteil, Gold, Seelensplitter und Gildenbeitrag.</p></section>';
}
function gsPanelHtml(p) {
  const E = gsEvent();
  const on = E.on;
  return `<section class="gx-box gx-gs"><h4>Grenzschlacht</h4><p class="gx-row">` +
    (on ? `<b>Jetzt!</b> <span>Licht gegen Schatten bis</span> <b>${gsClock(E.end)}</b>` : `<span>Nächste</span> <b>${new Date(E.start).toLocaleString(gxLoc(), { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false })}</b>`) +
    '</p><p class="gx-btns">' + (on && !gsBlock(p, E) ? '<button type="button" class="btn btn-primary" data-gx="gs">Beitreten</button>' : '') +
    '<button type="button" class="btn" data-gx="gsinfo">Ehre und Tausch</button></p></section>';
}

// --- Auftragsliste: Grenzschlacht und Gildenboss (über die Zeile des Weltbosses, quests.js) ------------------------------
function gsTrackRows() {
  const p = game.player;
  if (!p || p.level < GS.minLevel || gsActive()) return [];
  const now = Date.now();
  const E = gsEvent(now);
  if (E.on) {
    if (now > E.end - GS.lastJoin) return [];
    return [{ key: 'grenzschlacht', title: 'Grenzschlacht', goal: `Jetzt! Noch ${Math.ceil((E.end - now) / 60000)} Min.`, have: 0, need: 1, where: 'Antippen → Ereignisse', giver: '' }];
  }
  const left = E.start - now;
  if (left > GS.show) return [];
  return [{ key: 'grenzschlacht', title: 'Grenzschlacht', goal: `beginnt in ${Math.ceil(left / 60000)} Min.`, have: 0, need: 1, where: 'Antippen → Ereignisse', giver: '' }];
}
if (typeof wbTrackRows === 'function') {
  const _gxTrackRows = wbTrackRows;
  // eslint-disable-next-line no-global-assign
  wbTrackRows = function () {
    const out = _gxTrackRows();
    try { return out.concat(gbTrackRows(), gsTrackRows()); } catch (err) { return out; }
  };
}
if (typeof ui !== 'undefined' && typeof ui.renderQuestTrack === 'function') {
  const _gxRenderTrack = ui.renderQuestTrack;
  ui.renderQuestTrack = function () {
    _gxRenderTrack.call(this);
    try {
      const el = $('questTrack');
      if (!el) return;
      const gs = el.querySelector('[data-guide="grenzschlacht"]');
      if (gs) gs.addEventListener('click', () => gsOpenInfo());
      const gbr = el.querySelector('[data-guide="gildenboss"]');
      if (gbr) gbr.addEventListener('click', () => { if (typeof social !== 'undefined') { social.tab = 'gilde'; social.open(); } });
    } catch (err) { /* weiter */ }
  };
}

// --- Erfolge (Bereich „Gilde“) -------------------------------------------------------------------------------------------
if (typeof ERFOLGE !== 'undefined' && typeof ERFOLG_BY_ID !== 'undefined') {
  const neu = [
    { id: 'gilde5', kat: 'Gilde', name: 'Bund der Treue', text: 'Erreiche mit deiner Gilde Gildenstufe {n}', need: 5, val: (p) => (p === game.player ? gxLevel(p) : 0), pts: 20 },
    { id: 'gilde10', kat: 'Gilde', name: 'Banner des Bundes', text: 'Erreiche mit deiner Gilde Gildenstufe {n}', need: 10, val: (p) => (p === game.player ? gxLevel(p) : 0), pts: 50, titel: 'Bannerträger' },
    { id: 'eidwaechter', kat: 'Gilde', name: 'Eid bestanden', text: 'Besiege {n}-mal den Gildenboss', need: 5, val: (p) => (p.gx && p.gx.bossN) | 0, pts: 30, titel: 'Eidhüter' },
    { id: 'grenze', kat: 'Gilde', name: 'Grenzwacht', text: 'Gewinne {n} Grenzschlachten', need: 25, val: (p) => (p.gx && p.gx.gsW) | 0, pts: 30, titel: 'Grenzwächter' }
  ];
  for (const E of neu) {
    if (ERFOLG_BY_ID[E.id]) continue;
    ERFOLGE.push(E);
    ERFOLG_BY_ID[E.id] = E;
  }
}

// --- Ratgeberin (Fragen und Antworten) ---------------------------------------------------------------------------------
if (typeof RATGEBER_WISSEN !== 'undefined') {
  RATGEBER_WISSEN.push(
    { c: 'zusammen', q: 'Was sind Gildenstufen?',
      a: 'Jedes Mitglied sammelt Gildenbeitrag: Monster (höchstens 10 Stufen unter dir) 1 Punkt, Elite 2, Seelensteine 8, Dungeon-Bosse und Instanz-Wächter 25, Instanz-Endbosse, Endbosse und Turm 60, jede Quest 15, Tagesauftrag 10, Wochenauftrag 40, Weltboss 120, Gildenboss 300, Grenzschlacht 150 (Sieg) bzw. 60. Aus der Summe aller Mitglieder ergibt sich die Gildenstufe 1–10: je zwei Stufen +1 % Erfahrung (bis +5 %), ab Stufe 3 mehr Gold von Monstern (bis +10 %) und Zeichen über dem Namen: Gildenband (3), Wappen (5), Goldrand (8), Standarte (10). Alles steht im Fenster Freunde &amp; Gilde ({k:social}) im Reiter „Gilde“.',
      k: 'gildenstufe gildenstufen gildenbeitrag beitrag gilde stufe level guild bonus erfahrung gold zeichen wappen banner' },
    { c: 'zusammen', q: 'Warum sieht ein Mitglied eine andere Gildenstufe als ich?',
      a: 'Gilden haben keinen eigenen Server-Speicher. Jeder merkt sich die Beiträge, die er von den anderen Mitgliedern gesehen hat. Seid ihr gleichzeitig in einem Kanal, gleichen eure Geräte die Listen ab – dann kennt jeder auch die Beiträge der Mitglieder, die gerade nicht da sind. Spielt zusammen, dann stimmt die Stufe überall. Ein Mitglied sammelt höchstens 10.000 Punkte am Tag und zählt für die Gildenstufe höchstens 130.000 – Stufe 10 schafft eine Gilde nur mit mindestens vier fleißigen Mitgliedern.',
      k: 'gildenstufe unterschiedlich anders abgleich gilde beitrag server' },
    { c: 'zusammen', q: 'Wie funktioniert der Gildenboss?',
      a: 'Im Fenster Freunde &amp; Gilde ({k:social}) bringt dich „Zur Gildenhalle“ in die Halle deiner Gilde. Einmal in der Woche (Montag bis Sonntag, Weltzeit) ruft ein Mitglied dort Eidwächter Ostrun. Alle in der Halle kämpfen mit; mit jedem Kämpfer bekommt er mehr Leben – allein ist er zu schaffen. Achte auf die Warnflächen: Eidhieb (vorn, dann hinten), Bannersturm (Bahnen), Wappenregen (Schachbrett), Schwursprung und seine Eidwachen. Jeder Teilnehmer bekommt einmal je Woche ein Ausrüstungsteil, Gold, Seelensplitter und 300 Gildenbeitrag. Nach 15 Minuten zieht er sich zurück – dann könnt ihr ihn noch einmal rufen.',
      k: 'gildenboss gildenhalle halle boss eidwaechter ostrun woche gilde rufen' },
    { c: 'pvp', q: 'Was ist die Grenzschlacht?',
      a: 'Jeden Tag zweimal am Abend (18 und 20 Uhr Weltzeit, in Deutschland 19 und 21 Uhr, im Sommer eine Stunde später) für 30 Minuten: Licht gegen Schatten auf der Turmwiese, ab Stufe 50. Beitreten über Charakter ({k:char}) → Ereignisse, beim Turniermeister oder im Gildenfenster. Bots füllen die Teams auf. Drei Fahnen: Wer allein an einer Fahne steht, erobert sie; jede eigene Fahne bringt einen Punkt je Sekunde, jeder Kill zwei – bei 600 Punkten gewinnt deine Seite. Danach zeigt das Ergebnisfenster die Rangliste der Schlacht.',
      k: 'grenzschlacht schlacht licht schatten fahne fahnen ehre abend pvp bots' },
    { c: 'pvp', q: 'Wofür ist Ehre gut?',
      a: 'Ehre bekommst du in der Grenzschlacht (Sieg 30, Niederlage 12, höchstens dreimal je Termin). Unter Charakter ({k:char}) → Ereignisse tauschst du sie: 20 Ehre gegen 30 Seelensplitter, 40 gegen einen Erfahrungsring, ab Stufe 75 60 gegen 2 Ätherkerne und 120 gegen ein Juwel.',
      k: 'ehre tausch grenzschlacht belohnung' }
  );
}

// --- Aussehen -----------------------------------------------------------------------------------------------------------
function gxCss() {
  if (document.getElementById('gxCss')) return;
  const st = document.createElement('style');
  st.id = 'gxCss';
  st.textContent =
    '.gx-wrap{display:grid;gap:8px;margin:8px 0 10px}' +
    '.gx-box{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:8px 10px}' +
    '.gx-box h4{margin:0 0 4px;font-size:14px;color:#e8e0d0}' +
    '.gx-stufe{border-color:color-mix(in srgb,var(--gxc) 55%,transparent);background:linear-gradient(135deg,color-mix(in srgb,var(--gxd) 70%,transparent),rgba(255,255,255,.03))}' +
    '.gx-lv{display:flex;gap:10px;align-items:center}.gx-num{flex:none;width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;' +
    'font:800 22px/1 system-ui,sans-serif;color:#fff6e0;background:var(--gxc);box-shadow:inset 0 -3px 0 rgba(0,0,0,.3);text-shadow:0 1px 2px rgba(0,0,0,.5)}' +
    '.gx-lvt{flex:1;display:grid;gap:3px;min-width:0}.gx-lvt b{font-size:15px;color:#fff2cf}.gx-lvt small{opacity:.8;font-size:12px}' +
    '.gx-bar{display:block;height:7px;border-radius:4px;background:rgba(0,0,0,.4);overflow:hidden}.gx-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--gxc),#ffe7a0)}' +
    '.gx-row,.gx-next,.gx-mine{margin:6px 0 0;display:flex;flex-wrap:wrap;gap:3px 6px;align-items:baseline;font-size:12.5px}.gx-row b,.gx-next b{color:#ffe7a0}' +
    '.gx-next{opacity:.85}.gx-mine{font-size:12px;opacity:.9}.gx-mine b{color:#9fe7b4}' +
    '.gx-det summary{cursor:pointer;font-weight:700;padding:4px 2px;color:#e8e0d0}.gx-det summary small{opacity:.7;margin-left:4px}' +
    '.gx-list{display:grid;gap:2px;margin:4px 0}.gx-li{display:grid;grid-template-columns:22px 1fr auto auto;gap:6px;align-items:baseline;padding:3px 6px;border-radius:6px;background:rgba(0,0,0,.18);font-size:12.5px}' +
    '.gx-li.me{background:rgba(127,232,208,.12)}.gx-rk{opacity:.6;text-align:right}.gx-nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.gx-b{color:#ffe7a0;font-variant-numeric:tabular-nums}.gx-t{opacity:.65;min-width:52px;text-align:right}' +
    '.gx-btns{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 2px}.gx-btns .btn{padding:5px 12px;font-size:13px}' +
    '.gx-boss{border-color:rgba(95,224,200,.35)}.gx-gs{border-color:rgba(255,211,106,.3)}' +
    '#gxHall{position:fixed;z-index:5;min-width:200px;max-width:min(320px,calc(100vw - 16px));padding:6px 10px 8px;border-radius:12px;color:#eef8f6;' +
    'background:linear-gradient(180deg,rgba(18,40,40,.92),rgba(10,20,22,.9));border:1px solid rgba(127,232,208,.5);box-shadow:0 4px 14px rgba(0,0,0,.5);font:600 12.5px/1.3 system-ui,sans-serif;text-shadow:0 1px 2px #000}' +
    '#gxHall .gxh-t{display:flex;gap:6px;align-items:baseline}#gxHall .gxh-t b{color:#7fe8d0;font-size:13.5px}#gxHall .gxh-g{color:#ffe7a0}' +
    '#gxHall .gxh-l{margin:3px 0 6px;opacity:.92}#gxHall .gxh-l b{color:#ffe7a0}#gxHall .gxh-b{display:flex;gap:6px;flex-wrap:wrap}' +
    '#gxHall button{cursor:pointer;font:700 12px system-ui,sans-serif;color:#fff;background:#24484a;border:1px solid #6ad8c4;border-radius:8px;padding:4px 10px}' +
    '#gxHall button.gxh-ruf{background:linear-gradient(180deg,#2f8a7c,#1d5c54);border-color:#9ff4e2}' +
    '#pvpHud.gs-hud .gs-pts{display:grid;grid-template-columns:auto 1fr auto;gap:3px 8px;align-items:center}#pvpHud.gs-hud .gs-p{font-weight:800}' +
    '#pvpHud.gs-hud .gs-pb{display:block;height:8px;min-width:60px;border-radius:4px;background:rgba(255,255,255,.15);overflow:hidden}#pvpHud.gs-hud .gs-pb i{display:block;height:100%}' +
    '#pvpHud.gs-hud .gs-pts b{font-variant-numeric:tabular-nums;min-width:28px;text-align:right}' +
    '#pvpHud.gs-hud .gs-fl{display:inline-flex;gap:4px;align-items:center}#pvpHud.gs-hud .gs-fl small{opacity:.7;margin-left:4px}' +
    '#pvpHud.gs-hud .gs-f{position:relative;display:inline-block;width:18px;height:18px;border-radius:4px;border:2px solid #9a9aa8;background:rgba(0,0,0,.35);overflow:hidden;vertical-align:middle}' +
    '#pvpHud.gs-hud .gs-f i{position:absolute;left:0;right:0;bottom:0;opacity:.85}#pvpHud.gs-hud .gs-f em{position:relative;display:block;text-align:center;font:800 10px/14px system-ui,sans-serif;font-style:normal;color:#fff}' +
    '#pvpHud.gs-hud .gs-f.kampf{animation:gsKampf .6s infinite alternate}@keyframes gsKampf{from{filter:brightness(1)}to{filter:brightness(1.7)}}' +
    '#pvpHud.touch.gs-hud .gs-f{width:15px;height:15px}#pvpHud.touch.gs-hud .gs-f em{font-size:9px;line-height:11px}' +
    '#pvpSum.gs-sum .gs-end{display:flex;justify-content:center;align-items:baseline;gap:10px;font:800 16px/1.2 system-ui,sans-serif;margin:2px 0 8px}#pvpSum.gs-sum .gs-end b{font-size:24px}#pvpSum.gs-sum .gs-end i{opacity:.6;font-style:normal}' +
    '#pvpSum.gs-sum .gs-lohn{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 12px;margin:2px 0 4px;font-size:13px}#pvpSum.gs-sum .gs-lohn b{color:#ffe7a0}#pvpSum.gs-sum .gs-lohn img{width:16px;height:16px;vertical-align:-3px}' +
    '#pvpSum.gs-sum .gs-none{color:#ffd0a0}#pvpSum.gs-sum .gs-rt{margin:8px 0 2px;font-weight:800;color:#ffe7a0;text-align:center}' +
    '#pvpSum.gs-sum table.gs-rang td,#pvpSum.gs-sum table.gs-rang th{padding:2px 6px}' +
    '.gs-box .gs-ehre{color:#ffd36a;font-size:16px}';
  document.head.appendChild(st);
}
