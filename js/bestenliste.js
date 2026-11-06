// Bestenliste: wer hat die höchste Stufe, wer die meisten Rangpunkte in der Turnierarena?
// - Fenster mit zwei Reitern (Stufe, Turnierarena) und einem Klassenfilter. Zu öffnen auf dem Startbildschirm (auch ohne
//   Anmeldung), im Spiel mit der Taste P (tasten.js), über den Menüknopf und am Handy zusätzlich über „Freunde & Gilde“.
// - Daten liegen in der Realtime Database des Kontos (wie Post und Auktionshaus, siehe handel-db.js):
//     rangliste/<uid>_<platz>   { name, cls, path, level, xp, rp, liga, at } – ein Eintrag je Charakterplatz eines Kontos
//   Lesen darf jeder (auch ohne Anmeldung), schreiben nur das eigene Konto (Regeln in docs/firebase-regeln.json).
// - Schreiben (rankSync): nach jedem erfolgreichen Hochladen ins Konto (konto.js). Stufe, Rangpunkte, Name, Klasse oder Weg
//   geändert → sofort; nur Erfahrung geändert → höchstens alle 5 Minuten. Gelöschte Charaktere (leerer Platz) verlieren
//   ihren Eintrag beim nächsten Abgleich, ein gelöschtes Konto alle (konto-loeschen.js).
// - Lesen (rankFetch): die besten 100 nach Stufe bzw. Rangpunkten (orderBy + limitToLast, braucht ".indexOn"), 60 s im
//   Speicher. Unplausible Einträge (Stufe über 80, Rangpunkte, die es nicht geben kann, unbekannte Klasse) werden nicht
//   gezeigt, Namen nur als Text (escapeHtml). Ohne Netz oder ohne eingespielte Regeln: freundliche Meldung im Fenster.

const RANK = {
  show: 50,             // so viele Plätze zeigt die Liste
  fetch: 100,           // so viele holt sie (Reserve für den Klassenfilter und um den eigenen Platz zu finden)
  cacheMs: 60000,       // Ergebnis so lange zwischenspeichern
  writeGap: 300000,     // nur Erfahrung geändert: höchstens alle 5 Minuten schreiben
  retryRules: 1800000,  // Regeln fehlen: so lange nicht erneut schreiben
  timeout: 9000,        // ms bis „nicht erreichbar“
  maxLevel: 80,
  maxRp: 50000,         // +50 je Sieg: mehr als 1.000 Siege Vorsprung gilt als unplausibel
  nameMax: 16,
  memoKey: 'seelenstein.rangliste'
};
const RANK_TABS = {
  stufe: { label: 'Stufe', field: 'level' },
  pvp: { label: 'Turnierarena', field: 'rp' }
};

const rank = { tab: 'stufe', cls: '', cache: {}, loading: {}, syncing: false, rulesAt: 0 };

// --- Klassensymbole (klein, in der Klassenfarbe) -----------------------------------------------------------
const RANK_CLS_SVG = {
  krieger: '<path class="f" d="M17.4 3.4h3.2v3.2l-9 9-3.2-3.2z"/><path d="M6.4 11.4l6.2 6.2M4.4 19.6l3.4-3.4"/>',
  ninja: '<path class="f" d="M12 2.6l2.2 7.2 7.2 2.2-7.2 2.2L12 21.4l-2.2-7.2L2.6 12l7.2-2.2z"/><circle class="d" cx="12" cy="12" r="1.8"/>',
  schamane: '<path class="f" d="M12 2.8c1.4 3.4 5.6 5.8 5.6 10.6a5.6 5.6 0 0 1-11.2 0c0-2.4 1.2-3.8 2.2-4.8.2 1.8.9 3 2 3.4C10 9 10.6 5.6 12 2.8z"/><path class="k" d="M12 19.2c-1.6 0-2.6-1.1-2.6-2.5 0-1.2.8-2 1.4-2.6.2 1 .6 1.5 1.2 1.7-.1-1.5.4-2.6 1.2-3.4.6 1.6 1.6 2.5 1.6 4.3 0 1.4-1.2 2.5-2.8 2.5z"/>',
  nekromant: '<path class="f" d="M12 3.2c-4.4 0-7.4 3-7.4 7 0 2.4 1.1 4.1 2.6 5.1v3.5h9.6v-3.5c1.5-1 2.6-2.7 2.6-5.1 0-4-3-7-7.4-7z"/><circle class="d" cx="9" cy="11" r="1.8"/><circle class="d" cx="15" cy="11" r="1.8"/><path class="k" d="M10.4 16.4v2.4M13.6 16.4v2.4"/>',
  magier: '<path class="f" d="M12 2.4l2.6 6.4 6.8.5-5.2 4.4 1.6 6.7L12 16.8l-5.8 3.6 1.6-6.7-5.2-4.4 6.8-.5z"/><circle class="d" cx="12" cy="11.6" r="1.6"/>'
};
function rankClassIcon(cls, size = 28) {
  const c = CLASSES[cls];
  if (!c) return '';
  return `<span class="rk-ico" style="--cc:${c.color};width:${size}px;height:${size}px" title="${c.name}">` +
    `<svg viewBox="0 0 24 24" aria-hidden="true">${RANK_CLS_SVG[cls] || '<circle class="f" cx="12" cy="12" r="6"/>'}</svg></span>`;
}

// --- Einträge prüfen und schreiben ---------------------------------------------------------------------------

// Rangpunkte eines Spielstands (oder der laufenden Figur)
const rankPts = (sv) => Math.max(0, Math.round((sv && sv.pvp && Number(sv.pvp.pts)) || 0));

// Eintrag aus einem Spielstand bauen (null = kein gültiger Charakter)
function rankEntryOf(sv) {
  if (!sv || sv.deleted || !CLASSES[sv.classId] || typeof sv.name !== 'string' || !sv.name.trim()) return null;
  const level = Math.max(1, Math.min(RANK.maxLevel, Math.floor(Number(sv.level) || 1)));
  const rp = Math.min(RANK.maxRp, rankPts(sv));
  const e = { name: sv.name.trim().slice(0, RANK.nameMax), cls: sv.classId, level, xp: Math.max(0, Math.floor(Number(sv.xp) || 0)), rp,
    // Zeit vom Server (eine falsch gehende Uhr am Gerät soll das Schreiben nicht verhindern)
    at: { '.sv': 'timestamp' } };
  if (sv.path != null && Number.isInteger(sv.path) && sv.path >= 0) e.path = sv.path;
  e.liga = typeof pvpTier === 'function' ? pvpTier(rp).id : 'bronze';
  return e;
}

// Eintrag aus der Datenbank prüfen: unplausibel → null (wird nicht gezeigt)
function rankClean(id, v) {
  if (!v || typeof v !== 'object' || typeof id !== 'string') return null;
  const name = typeof v.name === 'string' ? v.name.trim() : '';
  const level = Number(v.level);
  const rp = v.rp == null ? 0 : Number(v.rp);
  if (!name || name.length > RANK.nameMax || !CLASSES[v.cls]) return null;
  if (!Number.isInteger(level) || level < 1 || level > RANK.maxLevel) return null;
  if (!Number.isFinite(rp) || rp < 0 || rp > RANK.maxRp) return null;
  // Rangkämpfe gibt es erst ab Stufe 10 (PVP.minLevel)
  if (rp > 0 && level < (typeof PVP !== 'undefined' ? PVP.minLevel : 10)) return null;
  const xp = Number(v.xp);
  const paths = CLASSES[v.cls].paths || [];
  const path = Number.isInteger(v.path) && v.path >= 0 && v.path < paths.length ? v.path : null;
  return { id, name, cls: v.cls, path, level, xp: Number.isFinite(xp) && xp >= 0 ? xp : 0, rp: Math.round(rp), at: Number(v.at) || 0 };
}

// Was dieses Gerät zuletzt geschrieben hat (je Konto und Platz), damit nur Änderungen hinausgehen
function rankMemo() {
  let m = null;
  try { m = JSON.parse(localStorage.getItem(RANK.memoKey) || 'null'); } catch (e) { m = null; }
  if (!m || typeof m !== 'object' || m.uid !== account.uid) m = { uid: account.uid, at: 0, e: {} };
  if (!m.e || typeof m.e !== 'object') m.e = {};
  return m;
}
function rankMemoSave(m) {
  try {
    if (m) localStorage.setItem(RANK.memoKey, JSON.stringify(m));
    else localStorage.removeItem(RANK.memoKey);
  } catch (e) { /* privat */ }
}
// Konto gelöscht oder abgemeldet: nichts mehr merken
function rankForget() {
  rankMemoSave(null);
  rank.cache = {};
}

// Nach dem Hochladen ins Konto (konto.js cloudPush/accountSync): Einträge aller Plätze abgleichen.
// Nur angemeldet und nur der eigene uid-Pfad; Fehler stören das Spiel nie.
async function rankSync() {
  if (rank.syncing || typeof accountOn !== 'function' || !accountOn() || account.deleting || !cloudReady() || typeof hdb === 'undefined') return;
  if (rank.rulesAt && Date.now() - rank.rulesAt < RANK.retryRules) return;
  const memo = rankMemo();
  const due = Date.now() - (memo.at || 0) >= RANK.writeGap;
  const st = readSlots();
  const patch = {};
  const next = {};
  for (let k = 0; k < MAX_CHARS; k++) {
    const want = rankEntryOf(st.slots[k]);
    const had = memo.e[k];
    const key = `rangliste/${account.uid}_${k}`;
    if (!want) {
      // leerer oder gelöschter Platz: Eintrag entfernen (einmal, auch wenn dieses Gerät ihn nie geschrieben hat)
      if (had !== null) { patch[key] = null; next[k] = null; }
      continue;
    }
    const important = !had || had.level !== want.level || had.rp !== want.rp || had.name !== want.name || had.cls !== want.cls || had.path !== want.path;
    if (important || (due && had.xp !== want.xp)) {
      patch[key] = want;
      next[k] = { name: want.name, cls: want.cls, path: want.path, level: want.level, xp: want.xp, rp: want.rp };
    }
  }
  if (!Object.keys(patch).length) return;
  rank.syncing = true;
  try {
    await hdb.patch('', patch);
    const m = rankMemo();
    Object.assign(m.e, next);
    m.at = Date.now();
    rankMemoSave(m);
    rank.rulesAt = 0;
    rank.cache = {}; // eigene Änderung gleich sehen
  } catch (e) {
    // Regeln noch nicht eingespielt: eine Weile nicht wieder versuchen (Netzfehler: beim nächsten Hochladen)
    if (e && e.code === 'regeln') rank.rulesAt = Date.now();
  } finally {
    rank.syncing = false;
  }
}

// --- Lesen ---------------------------------------------------------------------------------------------------

// Basisadresse der Datenbank (für den Emulator kann die Adresse ?ns=… tragen)
function rankBase() {
  const raw = cloudCfg().databaseURL.replace(/\/$/, '');
  const q = raw.indexOf('?');
  return q >= 0 ? { base: raw.slice(0, q).replace(/\/$/, ''), more: '&' + raw.slice(q + 1) } : { base: raw, more: '' };
}

// Die besten RANK.fetch nach Stufe ('stufe') oder Rangpunkten ('pvp'); liefert sortierte, geprüfte Einträge
async function rankFetch(tab) {
  const c = rank.cache[tab];
  if (c && Date.now() - c.at < RANK.cacheMs) return c.list;
  if (typeof cloudReady !== 'function' || !cloudReady()) throw Object.assign(new Error('aus'), { code: 'aus' });
  const field = RANK_TABS[tab].field;
  const { base, more } = rankBase();
  const url = `${base}/rangliste.json?orderBy=${encodeURIComponent(JSON.stringify(field))}&limitToLast=${RANK.fetch}${more}`;
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), RANK.timeout) : 0;
  let r;
  try {
    r = await fetch(url, { cache: 'no-store', signal: ctl ? ctl.signal : undefined });
  } catch (e) {
    throw Object.assign(new Error('netz'), { code: 'netz' });
  } finally {
    clearTimeout(timer);
  }
  // 400 = Index fehlt (".indexOn"), 401/403 = Leseregel fehlt
  if (!r.ok) throw Object.assign(new Error('fehler'), { code: r.status === 400 || r.status === 401 || r.status === 403 ? 'regeln' : 'fehler', status: r.status });
  const val = await r.json().catch(() => null);
  const list = [];
  if (val && typeof val === 'object') {
    for (const [id, v] of Object.entries(val)) {
      const e = rankClean(id, v);
      if (e) list.push(e);
    }
  }
  if (tab === 'pvp') list.sort((a, b) => b.rp - a.rp || b.level - a.level || b.xp - a.xp || a.at - b.at);
  else list.sort((a, b) => b.level - a.level || b.xp - a.xp || b.rp - a.rp || a.at - b.at);
  rank.cache[tab] = { at: Date.now(), list };
  return list;
}

// --- Fenster -------------------------------------------------------------------------------------------------

// Kennung des eigenen Eintrags (laufende Figur, angemeldet) und Präfix aller Charaktere des Kontos
const rankMyId = () => (typeof accountOn === 'function' && accountOn() && game.running && saveSlot != null ? `${account.uid}_${saveSlot}` : null);
const rankMyPrefix = () => (typeof accountOn === 'function' && accountOn() ? account.uid + '_' : null);
const rankFmt = (n) => Math.round(n).toLocaleString('de-DE');

function rankOpen(tab) {
  if (typeof ui !== 'undefined' && ui.closePanels) ui.closePanels();
  if (tab && RANK_TABS[tab]) rank.tab = tab;
  $('panelRank').hidden = false;
  rankRender();
}
function rankToggle() {
  const el = $('panelRank');
  if (el && !el.hidden) {
    el.hidden = true;
    return;
  }
  rankOpen();
}

// Wert einer Zeile (rechts): Stufe bzw. Rangpunkte mit Liga
function rankValHtml(e, tab) {
  if (tab === 'pvp') {
    const badge = typeof pvpBadgeHtml === 'function' ? pvpBadgeHtml(e.rp, 15) : '';
    return `<span class="rk-val"><b>${rankFmt(e.rp)}</b><small>${badge}</small></span>`;
  }
  return `<span class="rk-val"><b>${e.level}</b><small>Stufe</small></span>`;
}
function rankWhoHtml(e) {
  const c = CLASSES[e.cls];
  const way = e.path != null ? classPath(e.cls, e.path).name : '';
  return `${rankClassIcon(e.cls)}<span class="rk-who"><b class="no-tr">${escapeHtml(e.name)}</b>` +
    `<small><span>${c.name}</span>${way ? ` · <span>${way}</span>` : ''}</small></span>`;
}
function rankRowHtml(e, place, tab, mine) {
  const medal = place <= 3 ? ` rk-top rk-top${place}` : '';
  return `<li class="rk-row${medal}${mine ? ' rk-me' : ''}"><span class="rk-place">${place}</span>${rankWhoHtml(e)}${rankValHtml(e, tab)}</li>`;
}

// Eigene Zeile unten: laufende Figur, wenn sie nicht unter den gezeigten Plätzen ist
function rankOwnHtml(full, shown, tab) {
  if (!game.running || !game.player) return '';
  const p = game.player;
  // Klassenfilter auf eine andere Klasse: keine eigene Zeile
  if (rank.cls && rank.cls !== p.classId) return '';
  const myId = rankMyId();
  if (myId && shown.some((e) => e.id === myId)) return '';
  const idx = myId ? full.findIndex((e) => e.id === myId) : -1;
  const me = idx >= 0 ? full[idx] : { id: myId, name: p.name, cls: p.classId, path: p.path != null ? p.path : null, level: p.level, xp: p.xp || 0, rp: rankPts(p) };
  const note = !myId ? '<p class="rk-note">Nur mit Konto kommst du in die Bestenliste.</p>'
    : idx < 0 && (tab !== 'pvp' || rankPts(p) > 0) ? `<p class="rk-note">Noch nicht unter den besten ${RANK.fetch}.</p>` : '';
  return `<div class="rk-own"><ol class="rk-list"><li class="rk-row rk-me"><span class="rk-place">${idx >= 0 ? idx + 1 : '–'}</span>` +
    `${rankWhoHtml(me)}${rankValHtml(me, tab)}</li></ol>${note}</div>`;
}

async function rankRender() {
  const body = $('rankBody');
  if (!body || $('panelRank').hidden) return;
  const tab = rank.tab;
  const tabs = `<div class="rk-tabs" role="tablist">` + Object.entries(RANK_TABS).map(([id, t]) =>
    `<button type="button" role="tab" class="bag-tab${id === tab ? ' on' : ''}" data-rtab="${id}" aria-selected="${id === tab}">${t.label}</button>`).join('') + '</div>';
  const chips = `<div class="rk-cls" role="group" aria-label="Klasse"><button type="button" class="rk-chip${!rank.cls ? ' on' : ''}" data-rcls="">Alle</button>` +
    CLASS_ORDER.map((id) => `<button type="button" class="rk-chip${rank.cls === id ? ' on' : ''}" data-rcls="${id}" style="--cc:${CLASSES[id].color}">` +
      `${rankClassIcon(id, 18)}<span>${CLASSES[id].name}</span></button>`).join('') + '</div>';
  const c = rank.cache[tab];
  const cached = c && Date.now() - c.at < RANK.cacheMs;
  let list = '';
  let foot = '';
  if (!cached) {
    list = '<p class="rk-msg rk-wait">Lade die Bestenliste …</p>';
  } else {
    const full = rank.cls ? c.list.filter((e) => e.cls === rank.cls) : c.list;
    const vis = tab === 'pvp' ? full.filter((e) => e.rp > 0) : full;
    const shown = vis.slice(0, RANK.show);
    const myId = rankMyId();
    const pre = rankMyPrefix();
    list = shown.length
      ? `<ol class="rk-list">${shown.map((e, i) => rankRowHtml(e, i + 1, tab, myId ? e.id === myId : !!(pre && !game.running && e.id.startsWith(pre)))).join('')}</ol>`
      : `<p class="rk-msg">${tab === 'pvp' ? 'Noch hat niemand Rangpunkte in der Turnierarena.' : 'Noch keine Einträge.'}</p>`;
    foot = rankOwnHtml(vis, shown, tab);
  }
  body.innerHTML = tabs + chips + `<div class="rk-scroll">${list}</div>` + foot +
    `<div class="rk-foot"><small>${tab === 'pvp' ? 'Rangpunkte aus den Rangkämpfen der Turnierarena.' : 'Bei gleicher Stufe zählt die Erfahrung.'}</small>` +
    (cached ? `<small class="rk-time">Stand ${new Date(c.at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</small>` : '') +
    `<button type="button" class="mini-btn" data-rfresh>Aktualisieren</button></div>`;
  body.querySelectorAll('[data-rtab]').forEach((b) => b.addEventListener('click', () => { rank.tab = b.dataset.rtab; rankRender(); }));
  body.querySelectorAll('[data-rcls]').forEach((b) => b.addEventListener('click', () => { rank.cls = b.dataset.rcls; rankRender(); }));
  const re = body.querySelector('[data-rfresh]');
  // neu geladen wird höchstens alle 60 s (sonst zeigt der Knopf den gespeicherten Stand)
  if (re) re.addEventListener('click', () => rankRender());
  if (cached || rank.loading[tab]) return;
  rank.loading[tab] = true;
  let err = null;
  try {
    await rankFetch(tab);
  } catch (e) {
    err = e;
  }
  rank.loading[tab] = false;
  if ($('panelRank').hidden || rank.tab !== tab) {
    if (!$('panelRank').hidden) rankRender();
    return;
  }
  if (err) {
    const box = body.querySelector('.rk-scroll');
    if (box) box.innerHTML = `<div class="rk-msg rk-err"><b>Bestenliste gerade nicht erreichbar</b><small>${err.code === 'aus'
      ? 'Auf diesem Spiel sind keine Konten eingerichtet.'
      : err.code === 'netz' ? 'Keine Verbindung zum Server – bitte später noch einmal versuchen.' : 'Bitte später noch einmal versuchen.'}</small></div>`;
    return;
  }
  rankRender();
}

// --- Aufbau: Knöpfe ----------------------------------------------------------------------------------------------
(function rankBuild() {
  const panel = $('panelRank');
  if (!panel) return;
  // Startbildschirm und Hinweis „Dreh dein Handy“ (die Liste lässt sich auch hochkant lesen)
  for (const id of ['btnRankStart', 'btnRankRotate']) {
    const btn = $(id);
    if (btn) btn.addEventListener('click', () => rankOpen());
  }
  const menu = $('btnRank');
  if (menu) menu.addEventListener('click', () => rankToggle());
})();
