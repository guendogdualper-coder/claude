// Auktionshaus (seit 13.63): In jeder Stadt und jedem Lager steht ein Auktionator (welt.js, Bild und Stand in
// handel-npc.js). Jeder Spieler mit Konto stellt Sachen zum Sofortkauf ein (Preis in Gold, Laufzeit 12, 24 oder 48
// Stunden, kleine Einstellgebühr), alle anderen können sie kaufen – auch wenn der Verkäufer gerade nicht spielt.
// Der Gegenstand kommt per Post (post.js) zum Käufer, das Gold per Post zum Verkäufer; abgelaufene und abgebrochene
// Auktionen schickt die Post zurück.
//
// Datenbank (handel-db.js): auktion/<id> → { uid, von, vonKey, ware (Text), preis, gebuehr, dauer, at, ende, info,
//   kaeufer? { uid, name, key, art: 'kauf' | 'abbruch' | 'ablauf', at } }
// Abschluss in zwei Schritten:
//   1. Übernehmen: Die Auktion wird mit dem ETag des gelesenen Stands bedingt zurückgeschrieben, dazu „kaeufer“.
//      Kaufen zwei Spieler gleichzeitig, gewinnt nur einer (der andere bekommt 412 und eine klare Meldung).
//      Erst danach zahlt der Käufer (Gold wird abgezogen und sofort gespeichert).
//   2. Abrechnen: In einem einzigen Schreibvorgang (alles oder nichts) entstehen die Briefe (Ware an den Käufer,
//      Gold an den Verkäufer bzw. Ware zurück) und die Auktion verschwindet. Bricht das ab (Netz weg), holt es der
//      Übernehmende beim nächsten Öffnen des Auktionshauses nach, nach einer Stunde auch der Verkäufer.
// Abgelaufene Auktionen übernimmt der erste Spieler, der das Auktionshaus öffnet, und schickt die Ware zurück.

const AH_DAUER = [12, 24, 48];
const AH_FEE = { 12: 0.01, 24: 0.02, 48: 0.03 }; // Einstellgebühr: Anteil am Preis, mindestens AH_MIN_FEE
const AH_MIN_FEE = 5;
const AH_MAX_PRICE = 999999999;
const AH_MAX_OWN = 20; // so viele laufende Auktionen je Konto
const AH_STALE = 3600000; // ms: so lange darf eine Übernahme offen sein, bevor der Verkäufer sie abrechnet
const AH_PAGE = 30;

const AH_CATS = [
  { id: 'alle', name: 'Alle Angebote' },
  { id: 'waffe', name: 'Waffen', sub: () => Object.entries(WEAPON_KINDS).map(([k, v]) => [k, v.name]) },
  { id: 'ruestung', name: 'Rüstung', sub: () => [['ruestung', 'Rüstung'], ['helm', 'Helm'], ['schultern', 'Schultern'], ['umhang', 'Umhang'], ['schild', 'Schild'], ['schuhe', 'Schuhe'], ['guertel', 'Gürtel'], ['koecher', 'Köcher']] },
  { id: 'verbrauch', name: 'Verbrauchsgüter', sub: () => [['trank', 'Tränke'], ['schrift', 'Schriftrollen'], ['pfeil', 'Pfeile'], ['aufwertung', 'Aufwertung']] }
];
const AH_SORTS = [['preis', 'Preis aufsteigend'], ['preis-', 'Preis absteigend'], ['stufe', 'Stufe aufsteigend'], ['stufe-', 'Stufe absteigend'], ['neu', 'Neueste zuerst'], ['ende', 'Endet bald']];

const AH = { tab: 'kaufen', list: null, at: 0, busy: false, msg: null, arm: null, shown: AH_PAGE, house: false,
  f: { kat: 'alle', art: '', cls: '', selt: 0, lvMin: '', lvMax: '', plus: '', q: '', sort: 'preis', tragbar: false },
  sell: { pick: { sel: [], page: 0, max: 1 }, preis: '', dauer: 24 } };

const ahFee = (preis, dauer) => Math.max(AH_MIN_FEE, Math.round(preis * (AH_FEE[dauer] || AH_FEE[24])));

// Auktion aus der Datenbank prüfen; die Einordnung (Kategorie, Stufe …) wird aus der Ware neu berechnet
function ahParse(id, raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (typeof raw.uid !== 'string' || typeof raw.von !== 'string' || typeof raw.ware !== 'string') return null;
  if (!Number.isSafeInteger(raw.preis) || raw.preis < 1 || raw.preis > AH_MAX_PRICE || !Number.isFinite(raw.ende) || !Number.isFinite(raw.at)) return null;
  let w = null;
  try { w = wareClean(JSON.parse(raw.ware)); } catch { w = null; }
  if (!w) return null;
  const a = { id, uid: raw.uid, von: raw.von.slice(0, 20), preis: raw.preis, at: raw.at, ende: raw.ende, w, wareText: raw.ware, info: wareInfo(w), kaeufer: null };
  a.info.name = wareBaseName(w).toLowerCase();
  const k = raw.kaeufer;
  if (k && typeof k === 'object' && typeof k.uid === 'string' && ['kauf', 'abbruch', 'ablauf'].includes(k.art)) {
    a.kaeufer = { uid: k.uid, name: String(k.name || '').slice(0, 20), key: String(k.key || charKey(k.name)).slice(0, 20), art: k.art, at: Number(k.at) || 0 };
  }
  return a;
}

async function ahLoad() {
  const r = await hdb.get('auktion');
  AH.list = Object.entries(r.val || {}).map(([id, raw]) => ahParse(id, raw)).filter(Boolean);
  AH.at = Date.now();
  return AH.list;
}

// Übernehmen (Kauf, Abbruch durch den Verkäufer, Ablauf): bedingt schreiben, nur einer gewinnt
async function ahClaim(id, art) {
  const p = game.player;
  const r = await hdb.get('auktion/' + id, true);
  const a = ahParse(id, r.val);
  if (!a) return { ok: false, text: 'Diese Auktion gibt es nicht mehr.' };
  if (a.kaeufer) return { ok: false, text: a.kaeufer.art === 'kauf' ? 'Das hat gerade jemand anderes gekauft.' : 'Diese Auktion ist schon beendet.' };
  const now = Date.now();
  if (art === 'kauf' && now >= a.ende) return { ok: false, text: 'Diese Auktion ist abgelaufen.' };
  if (art === 'kauf' && a.uid === account.uid) return { ok: false, text: 'Eigene Angebote kannst du nicht kaufen.' };
  if (art === 'abbruch' && a.uid !== account.uid) return { ok: false, text: 'Nur der Verkäufer kann abbrechen.' };
  if (art === 'ablauf' && now < a.ende) return { ok: false, text: 'Diese Auktion läuft noch.' };
  const next = Object.assign({}, r.val, { kaeufer: { uid: account.uid, name: p.name, key: charKey(p.name), art, at: now } });
  const w = await hdb.put('auktion/' + id, next, r.etag || undefined);
  if (!w.ok) return { ok: false, text: art === 'kauf' ? 'Da war jemand schneller – das Angebot ist schon verkauft.' : 'Die Auktion hat sich gerade geändert.' };
  const done = ahParse(id, next);
  return { ok: true, a: done };
}

// Abrechnen: Briefe schreiben und Auktion löschen, alles in einem Schreibvorgang
async function ahSettle(a) {
  const k = a.kaeufer;
  if (!k) return;
  const name = wareName(a.w);
  const now = Date.now();
  const mail = (an, anKey, betreff, text, gold, ware) => ({ an, anKey, von: 'Auktionshaus', vonUid: account.uid, vonKey: '', at: now,
    betreff: betreff.slice(0, POST_SUBJECT), text: text.slice(0, POST_TEXT), gold, ware, gelesen: false, sys: 'ah' });
  const patch = { ['auktion/' + a.id]: null };
  const seller = charKey(a.von);
  if (k.art === 'kauf') {
    patch[`post/${k.uid}/a${a.id}k`] = mail(k.name, k.key, 'Gekauft: ' + name, `Du hast ${name} im Auktionshaus für ${fmtN(a.preis)} Gold gekauft.`, 0, '[' + a.wareText + ']');
    patch[`post/${a.uid}/a${a.id}e`] = mail(a.von, seller, 'Verkauft: ' + name, `${k.name} hat ${name} für ${fmtN(a.preis)} Gold gekauft. Hier ist dein Erlös.`, a.preis, '');
  } else {
    const why = k.art === 'abbruch' ? 'Du hast die Auktion abgebrochen.' : 'Niemand hat das Angebot gekauft, die Laufzeit ist vorbei.';
    patch[`post/${a.uid}/a${a.id}r`] = mail(a.von, seller, (k.art === 'abbruch' ? 'Zurück: ' : 'Abgelaufen: ') + name, `${why} Hier ist ${name} zurück.`, 0, '[' + a.wareText + ']');
  }
  await hdb.patch('', patch);
}

// Aufräumen nach dem Laden: eigene offene Übernahmen abrechnen, abgelaufene Auktionen zurückschicken
async function ahHousekeep() {
  if (!AH.list) return false;
  const now = Date.now();
  let changed = false;
  let n = 0;
  for (const a of AH.list.slice()) {
    if (n >= 6) break;
    try {
      if (a.kaeufer && (a.kaeufer.uid === account.uid || (a.uid === account.uid && now - a.kaeufer.at > AH_STALE))) {
        n++;
        await ahSettle(a);
        changed = true;
      } else if (!a.kaeufer && now >= a.ende) {
        n++;
        const c = await ahClaim(a.id, 'ablauf');
        if (c.ok) {
          await ahSettle(c.a);
          changed = true;
        }
      }
    } catch (e) { /* beim nächsten Mal */ }
  }
  return changed;
}

// --- Fenster ---------------------------------------------------------------------------------------------
function ahOpen() {
  ui.closePanels();
  AH.msg = null;
  AH.arm = null;
  AH.shown = AH_PAGE;
  document.getElementById('panelAuktion').hidden = false;
  ahRender();
  if (handelOn()) ahRefresh(Date.now() - AH.at < 20000);
}
const ahVisible = () => !document.getElementById('panelAuktion').hidden;

async function ahRefresh(quiet) {
  if (AH.house) return;
  AH.busy = !quiet;
  if (!quiet) ahRender();
  try {
    await ahLoad();
    AH.house = true;
    if (await ahHousekeep()) await ahLoad();
  } catch (e) {
    AH.msg = { ok: false, text: hdbMsg(e) };
  }
  AH.house = false;
  AH.busy = false;
  if (ahVisible()) ahRender();
}

function ahRender() {
  const p = game.player;
  const body = document.getElementById('ahBody');
  const gold = document.getElementById('ahGold');
  if (gold) gold.textContent = fmtN(p.gold);
  if (!handelOn()) {
    body.innerHTML = handelNoAccountHtml('Das Auktionshaus');
    return;
  }
  const own = (AH.list || []).filter((a) => a.uid === account.uid && !a.kaeufer).length;
  const note = AH.msg ? `<p class="${AH.msg.ok ? 'gear-msg success' : 'form-error'}">${AH.msg.text}</p>` : '';
  const tab = (id, label) => `<button type="button" class="bag-tab${AH.tab === id ? ' on' : ''}" data-atab="${id}">${label}</button>`;
  const head = `<div class="soc-tabs hd-tabs">${tab('kaufen', 'Kaufen')}${tab('verkaufen', 'Verkaufen')}` +
    `<button type="button" class="bag-tab${AH.tab === 'meine' ? ' on' : ''}" data-atab="meine">Meine Auktionen${own ? ` <small>${own}</small>` : ''}</button>` +
    `<button type="button" class="mini-btn hd-refresh" id="btnAhRefresh" ${AH.busy ? 'disabled' : ''}>Aktualisieren</button></div>`;
  let main;
  if (!AH.list) main = `<p class="hint-text">${AH.busy ? 'Angebote werden geholt …' : 'Noch nicht geladen.'}</p>`;
  else if (AH.tab === 'verkaufen') main = ahSellHtml();
  else if (AH.tab === 'meine') main = ahMineHtml();
  else main = ahBuyHtml();
  body.innerHTML = `<div class="hd-root ah-root${AH.busy ? ' hd-busy' : ''}">${head}${note}${main}</div>`;
  body.querySelectorAll('[data-atab]').forEach((b) => b.addEventListener('click', () => {
    AH.tab = b.dataset.atab;
    AH.msg = null;
    AH.arm = null;
    ahRender();
  }));
  document.getElementById('btnAhRefresh').addEventListener('click', () => ahRefresh(false));
  if (!AH.list) return;
  if (AH.tab === 'verkaufen') ahSellWire(body);
  else if (AH.tab === 'meine') ahMineWire(body);
  else ahBuyWire(body);
}

// Kaufen: Kategorien links (am Handy als Auswahlfeld), Filter oben, Liste
function ahBuyHtml() {
  const f = AH.f;
  const cat = (id, art, label, sub) => `<button type="button" class="ah-cat${sub ? ' sub' : ''}${f.kat === id && (f.art || '') === (art || '') ? ' on' : ''}" data-kat="${id}" data-art="${art || ''}">${label}</button>`;
  let nav = '';
  let opts = '';
  for (const c of AH_CATS) {
    nav += cat(c.id, '', c.name);
    opts += `<option value="${c.id}|"${f.kat === c.id && !f.art ? ' selected' : ''}>${c.name}</option>`;
    if (c.sub && f.kat === c.id) for (const [a, n] of c.sub()) nav += cat(c.id, a, n, true);
    if (c.sub) for (const [a, n] of c.sub()) opts += `<option value="${c.id}|${a}"${f.kat === c.id && f.art === a ? ' selected' : ''}>– ${n}</option>`;
  }
  const sel = (id, list, cur) => `<select id="${id}">${list.map(([v, n]) => `<option value="${v}"${String(cur) === String(v) ? ' selected' : ''}>${n}</option>`).join('')}</select>`;
  const classes = [['', 'Alle Klassen'], ['mine', 'Meine Klasse'], ...Object.entries(CLASSES).map(([k, c]) => [k, c.name])];
  const rars = [[0, 'Jede Seltenheit'], ...RARITIES.slice(1).map((r, k) => [k + 1, k + 1 < RARITIES.length - 1 ? `ab ${r.name}` : r.name])];
  return `<div class="ah-buy"><nav class="ah-cats" aria-label="Kategorien">${nav}</nav><div class="ah-main">` +
    `<div class="ah-filters">` +
    `<label class="ah-catsel"><span>Kategorie</span><select id="ahCatSel">${opts}</select></label>` +
    `<label><span>Klasse</span>${sel('ahCls', classes, f.cls)}</label>` +
    `<label><span>Seltenheit</span>${sel('ahSelt', rars, f.selt)}</label>` +
    `<label class="ah-lv"><span>Stufe</span><input id="ahLvMin" type="number" min="1" max="99" placeholder="Stufe ab" value="${f.lvMin}" inputmode="numeric"><input id="ahLvMax" type="number" min="1" max="99" placeholder="bis" value="${f.lvMax}" inputmode="numeric"></label>` +
    `<label class="ah-plus"><span>Plus ab</span><input id="ahPlus" type="number" min="0" max="${MAX_PLUS}" placeholder="Plus ab" value="${f.plus}" inputmode="numeric"></label>` +
    `<label class="ah-q"><span>Suche</span><input id="ahQ" type="search" placeholder="Name …" value="${escapeHtml(f.q)}" autocomplete="off"></label>` +
    `<label><span>Sortierung</span>${sel('ahSort', AH_SORTS, f.sort)}</label>` +
    `<label class="ah-check"><input id="ahWear" type="checkbox"${f.tragbar ? ' checked' : ''}><span>Nur für mich nutzbar</span></label>` +
    `</div><div id="ahList" class="ah-list"></div></div></div>`;
}

function ahFiltered() {
  const p = game.player;
  const f = AH.f;
  const now = Date.now();
  const q = f.q.trim().toLowerCase();
  const cls = f.cls === 'mine' ? p.classId : f.cls;
  const lo = Number(f.lvMin) || 0;
  const hi = Number(f.lvMax) || 999;
  const plus = Number(f.plus) || 0;
  const out = AH.list.filter((a) => {
    const i = a.info;
    if (a.kaeufer || now >= a.ende) return false;
    if (f.kat !== 'alle' && i.kat !== f.kat) return false;
    if (f.art && i.art !== f.art) return false;
    if (cls && i.cls && i.cls !== cls) return false;
    if (i.selt < f.selt) return false;
    if (i.stufe < lo || i.stufe > hi) return false;
    if (i.plus < plus) return false;
    if (q && !i.name.includes(q) && !wareName(a.w).toLowerCase().includes(q)) return false;
    if (f.tragbar && !ahUsable(p, a.w)) return false;
    return true;
  });
  const by = {
    preis: (a, b) => a.preis - b.preis, 'preis-': (a, b) => b.preis - a.preis,
    stufe: (a, b) => a.info.stufe - b.info.stufe || a.preis - b.preis, 'stufe-': (a, b) => b.info.stufe - a.info.stufe || a.preis - b.preis,
    neu: (a, b) => b.at - a.at, ende: (a, b) => a.ende - b.ende
  }[f.sort] || ((a, b) => a.preis - b.preis);
  return out.sort(by);
}
// kann die eigene Figur das benutzen?
function ahUsable(p, w) {
  if (w.t === 'it' && isBook(w.it)) return ownBook(p, w.it.book);
  if (w.t === 'it') return canWear(w.it, p) && p.level >= ITEM_TIERS[w.it.tier].level;
  if (w.t === 'pfeil') return p.classId === 'ninja' && p.level >= ARROW_TYPES[w.i].level;
  if (w.t === 'trank') return p.level >= warePot(w.k).sz.level;
  return true;
}
function ahLeft(a) {
  const ms = a.ende - Date.now();
  if (ms <= 0) return 'abgelaufen';
  const h = Math.floor(ms / 3600000);
  return h >= 1 ? `noch ${h} Std.` : `noch ${Math.max(1, Math.ceil(ms / 60000))} Min.`;
}
function ahSubline(a) {
  const i = a.info;
  const parts = [];
  if (a.w.t === 'it' && !isBook(a.w.it)) {
    parts.push(a.w.it.slot === 'waffe' ? WEAPON_KINDS[a.w.it.kind].name : slotNameOf(a.w.it.slot));
    parts.push(i.cls ? CLASSES[i.cls].name : 'alle Klassen');
    parts.push(RARITIES[i.selt].name);
    parts.push(`ab Stufe ${i.stufe}`);
  } else {
    parts.push({ trank: 'Trank', schrift: 'Schriftrolle', pfeil: 'Pfeile', aufwertung: 'Aufwertung' }[i.art]);
    if (i.cls) parts.push(CLASSES[i.cls].name);
    if (i.stufe > 1) parts.push(`ab Stufe ${i.stufe}`);
  }
  return parts.join(' · ');
}
function ahRowHtml(a, mode) {
  const p = game.player;
  const mine = a.uid === account.uid;
  const armed = AH.arm === a.id;
  let btn = '';
  if (mode === 'kaufen') {
    btn = mine ? '<small class="hint-text">dein Angebot</small>'
      : `<button type="button" class="mini-btn ${armed ? 'danger' : 'primary'}" data-buy="${a.id}" ${p.gold < a.preis || AH.busy ? 'disabled' : ''}>${armed ? 'Wirklich kaufen?' : 'Kaufen'}</button>`;
  } else if (!a.kaeufer && Date.now() < a.ende) {
    btn = `<button type="button" class="mini-btn ${armed ? 'danger' : ''}" data-cancel="${a.id}" ${AH.busy ? 'disabled' : ''}>${armed ? 'Wirklich abbrechen?' : 'Abbrechen'}</button>`;
  } else btn = `<small class="hint-text">${a.kaeufer ? (a.kaeufer.art === 'kauf' ? 'verkauft – Gold kommt per Post' : 'beendet – kommt per Post zurück') : 'abgelaufen – kommt per Post zurück'}</small>`;
  return `<div class="ah-row">${wareTile(a.w, '')}` +
    `<div class="ah-name"><b style="color:${wareColor(a.w)}">${wareName(a.w)}${a.w.t === 'it' ? '' : ` × ${fmtN(a.w.n)}`}</b>` +
    `<small>${ahSubline(a)}</small><small class="ah-seller">${mode === 'kaufen' ? 'von ' : 'Charakter: '}<span class="no-tr">${escapeHtml(a.von)}</span> · ${ahLeft(a)}</small></div>` +
    `<div class="ah-price"><b class="price">${fmtN(a.preis)}</b><small>Gold</small>${btn}</div></div>`;
}
function ahRenderList() {
  const el = document.getElementById('ahList');
  if (!el) return;
  const list = ahFiltered();
  const shown = list.slice(0, AH.shown);
  el.innerHTML = (shown.length ? `<p class="hint-text ah-count">${list.length} ${list.length === 1 ? 'Angebot' : 'Angebote'}</p>` + shown.map((a) => ahRowHtml(a, 'kaufen')).join('')
    : '<p class="hint-text">Keine passenden Angebote.</p>') +
    (list.length > shown.length ? `<button type="button" class="btn btn-ghost ah-more" id="btnAhMore">Mehr anzeigen (${list.length - shown.length})</button>` : '');
  el.querySelectorAll('[data-buy]').forEach((b) => b.addEventListener('click', () => {
    if (AH.arm !== b.dataset.buy) {
      AH.arm = b.dataset.buy;
      ahRenderList();
      return;
    }
    ahBuy(b.dataset.buy);
  }));
  const more = document.getElementById('btnAhMore');
  if (more) more.addEventListener('click', () => { AH.shown += AH_PAGE; ahRenderList(); });
}
function ahBuyWire(body) {
  const f = AH.f;
  const again = () => { AH.shown = AH_PAGE; AH.arm = null; ahRenderList(); };
  body.querySelectorAll('[data-kat]').forEach((b) => b.addEventListener('click', () => {
    f.kat = b.dataset.kat;
    f.art = b.dataset.art;
    AH.shown = AH_PAGE;
    ahRender();
  }));
  document.getElementById('ahCatSel').addEventListener('change', (e) => {
    [f.kat, f.art] = e.target.value.split('|');
    AH.shown = AH_PAGE;
    ahRender();
  });
  const bind = (id, key, ev, conv) => document.getElementById(id).addEventListener(ev, (e) => { f[key] = conv(e.target); again(); });
  bind('ahCls', 'cls', 'change', (t) => t.value);
  bind('ahSelt', 'selt', 'change', (t) => Number(t.value) || 0);
  bind('ahLvMin', 'lvMin', 'input', (t) => t.value);
  bind('ahLvMax', 'lvMax', 'input', (t) => t.value);
  bind('ahPlus', 'plus', 'input', (t) => t.value);
  bind('ahQ', 'q', 'input', (t) => t.value);
  bind('ahSort', 'sort', 'change', (t) => t.value);
  bind('ahWear', 'tragbar', 'change', (t) => t.checked);
  ahRenderList();
}

async function ahBuy(id) {
  const p = game.player;
  const a = (AH.list || []).find((x) => x.id === id);
  if (!a || AH.busy) return;
  AH.arm = null;
  if (p.gold < a.preis) {
    AH.msg = { ok: false, text: 'Dafür reicht dein Gold nicht.' };
    ahRender();
    return;
  }
  AH.busy = true;
  ahRender();
  try {
    const c = await ahClaim(id, 'kauf');
    if (!c.ok) AH.msg = { ok: false, text: c.text };
    else {
      // erst jetzt bezahlen (das Angebot gehört sicher uns) und gleich speichern
      p.gold = Math.max(0, p.gold - c.a.preis);
      handelSave();
      AH.msg = { ok: true, text: `Gekauft: ${wareName(c.a.w)} für ${fmtN(c.a.preis)} Gold. Es liegt in deinem Briefkasten (Post in jeder Stadt).` };
      ui.log(`Im Auktionshaus gekauft: ${wareName(c.a.w)}. Abholen bei der Post.`, 'level');
      try { await ahSettle(c.a); } catch (e) { /* holt ahHousekeep nach */ }
    }
    await ahLoad();
  } catch (e) {
    AH.msg = { ok: false, text: hdbMsg(e) };
  }
  AH.busy = false;
  if (ahVisible()) ahRender();
}

// Verkaufen: eine Sache wählen, Preis und Laufzeit
function ahSellHtml() {
  const p = game.player;
  const s = AH.sell;
  const preis = Math.floor(Number(s.preis) || 0);
  const fee = preis > 0 ? ahFee(preis, s.dauer) : 0;
  const chosen = s.pick.sel[0];
  let compare = '';
  if (chosen) {
    const name = wareBaseName(chosen.w).toLowerCase();
    const same = AH.list.filter((a) => !a.kaeufer && Date.now() < a.ende && a.info.name === name && a.w.t === chosen.w.t);
    if (same.length) {
      const per = (a) => a.preis / wareCount(a.w);
      const best = same.reduce((x, y) => (per(y) < per(x) ? y : x));
      compare = `<p class="hint-text">Günstigstes gleiches Angebot: <b class="price">${fmtN(best.preis)}</b> Gold${wareCount(best.w) > 1 ? ` für ${fmtN(wareCount(best.w))} Stück` : ''} (${same.length} ${same.length === 1 ? 'Angebot' : 'Angebote'}).</p>`;
    }
  }
  const own = AH.list.filter((a) => a.uid === account.uid && !a.kaeufer).length;
  return `<form class="hd-compose" id="ahSellForm" autocomplete="off">` +
    `<div id="ahPick">${warePickHtml(s.pick)}</div>${compare}` +
    `<div class="hd-row"><label class="hd-field"><span>Sofortkaufpreis (Gold)</span><input id="ahPreis" type="number" min="1" max="${AH_MAX_PRICE}" step="1" value="${s.preis}" inputmode="numeric" required></label>` +
    `<div class="hd-field"><span>Laufzeit</span><div class="ah-dauer">${AH_DAUER.map((h) => `<button type="button" class="bag-tab${s.dauer === h ? ' on' : ''}" data-dauer="${h}">${h} Std.</button>`).join('')}</div></div></div>` +
    `<p class="hd-porto" id="ahFee">${ahFeeHtml(fee)}</p>` +
    `<div class="hd-actions"><button type="submit" id="ahSubmit" class="btn btn-primary" ${ahSellBlocked() ? 'disabled' : ''}>Angebot einstellen</button>` +
    `<small class="hint-text">${own}/${AH_MAX_OWN} Angebote deines Kontos laufen. Den Erlös bringt die Post.</small></div></form>`;
}
const ahFeeHtml = (fee) => `Einstellgebühr <b class="price">${fmtN(fee)}</b> Gold (${Math.round(AH_FEE[AH.sell.dauer] * 100)} % des Preises, mindestens ${AH_MIN_FEE}) – sie bleibt beim Auktionshaus, auch wenn nichts verkauft wird. Dein Gold: <span class="price">${fmtN(game.player.gold)}</span>`;
function ahSellBlocked() {
  const s = AH.sell;
  const preis = Math.floor(Number(s.preis) || 0);
  const own = (AH.list || []).filter((a) => a.uid === account.uid && !a.kaeufer).length;
  return !s.pick.sel.length || preis < 1 || game.player.gold < ahFee(preis, s.dauer) || own >= AH_MAX_OWN || AH.busy;
}
function ahSellWire(body) {
  const s = AH.sell;
  warePickWire(document.getElementById('ahPick'), s.pick, () => ahRender());
  const preis = document.getElementById('ahPreis');
  // beim Tippen nur Gebühr und Knopf nachführen (kein Neuzeichnen, das den nächsten Klick verschlucken würde)
  preis.addEventListener('input', () => {
    s.preis = preis.value;
    const n = Math.floor(Number(s.preis) || 0);
    document.getElementById('ahFee').innerHTML = ahFeeHtml(n > 0 ? ahFee(n, s.dauer) : 0);
    document.getElementById('ahSubmit').disabled = ahSellBlocked();
  });
  body.querySelectorAll('[data-dauer]').forEach((b) => b.addEventListener('click', () => { s.preis = preis.value; s.dauer = Number(b.dataset.dauer); ahRender(); }));
  document.getElementById('ahSellForm').addEventListener('submit', (e) => {
    e.preventDefault();
    s.preis = preis.value;
    ahSell();
  });
}

async function ahSell() {
  const p = game.player;
  const s = AH.sell;
  if (AH.busy) return;
  const preis = Math.floor(Number(s.preis) || 0);
  const fail = (text) => { AH.msg = { ok: false, text }; ahRender(); };
  if (!(preis >= 1 && preis <= AH_MAX_PRICE)) return fail('Gib einen Preis zwischen 1 und 999.999.999 Gold an.');
  const fee = ahFee(preis, s.dauer);
  if (p.gold < fee) return fail('Für die Einstellgebühr reicht dein Gold nicht.');
  const list = warePickList(s.pick);
  if (!list || list.length !== 1) return fail('Wähle eine Sache aus deiner Tasche oder deinem Vorrat.');
  if ((AH.list || []).filter((a) => a.uid === account.uid && !a.kaeufer).length >= AH_MAX_OWN) return fail(`Du hast schon ${AH_MAX_OWN} laufende Angebote.`);
  AH.busy = true;
  ahRender();
  // Treuhand: Ware und Gebühr abgeben (noch nicht gespeichert), dann einstellen; bei einem Fehler zurück
  const held = wareEscrow(p, list);
  if (!held) {
    AH.busy = false;
    return fail('Das ist nicht mehr in deiner Tasche.');
  }
  p.gold -= fee;
  const w = held[0];
  const now = Date.now();
  const info = wareInfo(w);
  const rec = { uid: account.uid, von: p.name, vonKey: charKey(p.name), ware: JSON.stringify(w), preis, gebuehr: fee, dauer: s.dauer, at: now, ende: now + s.dauer * 3600000,
    info: { kat: info.kat, art: info.art, cls: info.cls || '', selt: info.selt, stufe: info.stufe, plus: info.plus } };
  let ok = false;
  try {
    await hdb.put('auktion/' + handelId(), rec);
    ok = true;
    handelSave();
    s.pick.sel = [];
    s.preis = '';
    AH.msg = { ok: true, text: `${wareName(w)} steht jetzt ${s.dauer} Stunden im Auktionshaus.` };
    await ahLoad();
  } catch (e) {
    if (!ok) {
      wareGive(p, w);
      p.gold += fee;
    }
    AH.msg = { ok: false, text: hdbMsg(e) + (ok ? '' : ' Das Angebot wurde nicht eingestellt.') };
  }
  AH.busy = false;
  if (ahVisible()) ahRender();
}

// Meine Auktionen (alle Charaktere des Kontos)
function ahMineHtml() {
  const mine = AH.list.filter((a) => a.uid === account.uid).sort((a, b) => a.ende - b.ende);
  return `<p class="hint-text">Deine laufenden Angebote (alle Charaktere deines Kontos). Erlös, abgebrochene und abgelaufene Sachen kommen per Post zum Charakter, der sie eingestellt hat.</p>` +
    (mine.length ? `<div class="ah-list">${mine.map((a) => ahRowHtml(a, 'meine')).join('')}</div>` : '<p class="hint-text">Du hast gerade keine Angebote im Auktionshaus.</p>');
}
function ahMineWire(body) {
  body.querySelectorAll('[data-cancel]').forEach((b) => b.addEventListener('click', () => {
    if (AH.arm !== b.dataset.cancel) {
      AH.arm = b.dataset.cancel;
      ahRender();
      return;
    }
    ahCancel(b.dataset.cancel);
  }));
}
async function ahCancel(id) {
  if (AH.busy) return;
  AH.arm = null;
  AH.busy = true;
  ahRender();
  try {
    const c = await ahClaim(id, 'abbruch');
    if (!c.ok) AH.msg = { ok: false, text: c.text };
    else {
      await ahSettle(c.a);
      AH.msg = { ok: true, text: `Abgebrochen: ${wareName(c.a.w)} kommt per Post zurück.` };
    }
    await ahLoad();
  } catch (e) {
    AH.msg = { ok: false, text: hdbMsg(e) };
  }
  AH.busy = false;
  if (ahVisible()) ahRender();
}
