// Konto-Lager (seit 13.63): Den Zugang kauft weiterhin jeder Charakter selbst (1.000 Gold, spieler.js buyStorage),
// der Inhalt gehört aber dem ganzen Konto – was ein Charakter einlagert, kann jeder andere Charakter desselben Kontos
// (mit eigenem Zugang) wieder herausnehmen.
//  - Mit Konto liegt das Lager in der Datenbank unter lager/<uid> (handel-db.js). Jede Änderung wird bedingt
//    geschrieben (ETag): Haben zwei Geräte gleichzeitig etwas geändert, gewinnt das erste, das zweite liest neu
//    und versucht es noch einmal. Erst wenn der Server bestätigt, ändert sich die Tasche; danach wird sofort gespeichert.
//  - Ohne Konto liegt das Lager auf dem Gerät (localStorage) und gehört allen Charakterplätzen dieses Geräts.
//    Meldet man sich später mit einem Konto an, kommt der Inhalt einmal ins Konto-Lager.
//  - Alte Lager einzelner Charaktere (p.storage.items, bis 13.62) wandern beim Spielen des Charakters ins gemeinsame
//    Lager. Gleiche Gegenstände (gleiche Kennung) kommen nur einmal hinein. Ist dabei mehr drin, als das Lager fasst,
//    geht nichts verloren: Es gibt dann zusätzliche Seiten (Überlauf), aus denen man nur noch herausnehmen kann.
// Im Spielstand bleibt p.storage = { open: true, items: [] } als Zeichen für den gekauften Zugang.

const KL_KEY = 'seelenstein.kontolager.v1';
const KL = { owner: null, items: null, etag: null, state: 'idle', msg: '', busy: false, loading: null, migrating: false, noEtag: false, denied: 0 };
// Rückfall, solange die Datenbank-Regeln für lager/<uid> fehlen (Server lehnt ab): Jeder Charakter benutzt sein
// eigenes Lager wie bis 13.62 (p.storage.items, liegt im Spielstand und damit auch im Konto). Kein Umzug, nichts geht
// verloren; nach KL_RETRY wird der Server erneut gefragt, sind die Regeln dann da, folgt der normale Umzug.
const KL_RETRY = 60000;

// Wem gehört das Lager gerade: dem Konto (uid), dem Gerät oder (Rückfall) dem Charakter
function klOwner() {
  if (!handelOn()) return 'geraet';
  if (KL.denied && Date.now() - KL.denied < KL_RETRY) return 'figur';
  return account.uid;
}
const klShared = (owner) => owner !== 'figur';
const klPath = () => 'lager/' + account.uid;
const klCopy = (x) => JSON.parse(JSON.stringify(x));

// Inhalt aus Datenbank oder Gerät lesen (nur Gegenstände und Bücherstapel, jeder mit Kennung)
function klParse(items) {
  if (typeof items === 'string') {
    try { items = JSON.parse(items); } catch { items = null; }
  }
  if (!Array.isArray(items)) return [];
  return items.filter((it) => it && typeof it === 'object' && !Array.isArray(it) && (it.slot || it.book)).map((it) => {
    if (!it.uid) it.uid = newUid();
    // alte Buch-Namen (z. B. Frostpanzer → Eisgefängnis) auch im gemeinsamen Lager nachziehen
    if (it.book && typeof SKILL_RENAMED !== 'undefined' && SKILL_RENAMED[it.book]) it.book = SKILL_RENAMED[it.book];
    return it;
  });
}
function klLocalRead() {
  try {
    const d = JSON.parse(localStorage.getItem(KL_KEY) || 'null');
    return d ? klParse(d.items) : [];
  } catch { return []; }
}
function klLocalWrite(items) {
  localStorage.setItem(KL_KEY, JSON.stringify({ v: 1, at: Date.now(), items }));
}

// Seiten des Lagers: normal 6, bei Überlauf mehr
const klPages = (items) => Math.max(STORAGE.pages, Math.ceil((items ? items.length : 0) / STORAGE.page));

// Sachen in eine Liste legen. force: auch über die Größe hinaus (Umzug alter Lager), gleiche Kennung nur einmal.
// Gibt die Kennungen der hineingelegten Sachen zurück.
function klAdd(list, items, force) {
  const done = [];
  for (const it of items) {
    if (force && list.some((x) => x.uid === it.uid)) { done.push(it.uid); continue; }
    if (isBook(it)) {
      const stack = list.find((x) => x.book === it.book && x.count + it.count <= BOOK_STACK);
      if (stack) {
        stack.count += it.count;
        done.push(it.uid);
        continue;
      }
    }
    if (!force && list.length >= STORAGE_SIZE) break;
    list.push(klCopy(it));
    done.push(it.uid);
  }
  return done;
}

// Stand laden (mit Konto vom Server, sonst vom Gerät)
async function klFetch() {
  const owner = klOwner();
  if (owner === 'figur') {
    const p = game.player;
    KL.owner = owner;
    KL.items = p && p.storage ? (p.storage.items = Array.isArray(p.storage.items) ? p.storage.items : []) : [];
    KL.etag = null;
    return;
  }
  if (owner === 'geraet') {
    KL.owner = owner;
    KL.items = klLocalRead();
    KL.etag = null;
    return;
  }
  const r = await hdb.get(klPath(), true);
  KL.owner = owner;
  KL.items = klParse(r.val && r.val.items);
  KL.etag = r.etag || null;
  KL.noEtag = !r.etag;
}

// Änderung schreiben: mut(Liste) ändert eine Kopie und gibt { res } oder { error } zurück.
// Mit Konto bedingt (ETag); wurde zwischendurch woanders geschrieben, neu lesen und noch einmal.
async function klCommit(mut) {
  const owner = klOwner();
  if (owner === 'geraet') {
    const list = klLocalRead();
    const out = mut(list);
    if (out.error) return { ok: false, msg: out.error };
    try { klLocalWrite(list); } catch { return { ok: false, msg: 'Der Speicher des Geräts ist voll oder gesperrt.' }; }
    KL.owner = 'geraet';
    KL.items = list;
    return { ok: true, res: out.res, owner };
  }
  // Rückfall: eigenes Lager des Charakters (wird mit dem Spielstand gespeichert, den die Aufrufer gleich sichern)
  if (owner === 'figur') {
    const p = game.player;
    if (!p || !p.storage) return { ok: false, msg: '' };
    const list = klCopy(p.storage.items || []);
    const out = mut(list);
    if (out.error) return { ok: false, msg: out.error };
    p.storage.items = list;
    KL.owner = owner;
    KL.items = list;
    return { ok: true, res: out.res, owner };
  }
  try {
    return await klCommitServer(mut, owner);
  } catch (e) {
    if (e.code !== 'regeln') throw e;
    // Regeln fehlen: nichts wurde geändert; ab jetzt das eigene Lager des Charakters
    klDenied();
    return { ok: false, msg: KL_DENIED_TEXT };
  }
}
const KL_DENIED_TEXT = 'Das gemeinsame Konto-Lager ist auf dem Server noch nicht freigeschaltet – bis dahin hat jeder Charakter sein eigenes Lager.';
function klDenied() {
  KL.denied = Date.now();
  KL.owner = null;
  KL.items = null;
  KL.etag = null;
}
async function klCommitServer(mut, owner) {
  for (let k = 0; k < 4; k++) {
    if (KL.owner !== klOwner() || !KL.items || (!KL.etag && !KL.noEtag)) await klFetch();
    const list = klCopy(KL.items);
    const out = mut(list);
    if (out.error) return { ok: false, msg: out.error };
    const r = await hdb.put(klPath(), { v: 1, at: Date.now(), items: JSON.stringify(list) }, KL.etag || undefined);
    if (r.ok) {
      KL.items = list;
      KL.etag = r.etag || null;
      return { ok: true, res: out.res, owner };
    }
    // jemand anderes war schneller: seinen Stand übernehmen und noch einmal
    KL.items = klParse(r.val && r.val.items);
    KL.etag = r.etag || null;
  }
  return { ok: false, msg: 'Das Lager wurde gerade auf einem anderen Gerät geändert. Bitte noch einmal versuchen.' };
}

// Laden samt Umzug (Geräte-Lager ins Konto, altes Lager des Charakters ins gemeinsame)
function klLoad() {
  if (KL.loading) return KL.loading;
  KL.state = 'laden';
  KL.loading = (async () => {
    try {
      try {
        await klFetch();
      } catch (e) {
        // Regeln fehlen: ohne Meldung auf das eigene Lager des Charakters ausweichen
        if (e.code !== 'regeln' || !handelOn()) throw e;
        klDenied();
        await klFetch();
      }
      // Lager vom Gerät (ohne Konto gefüllt) einmal ins Konto-Lager legen (nur wenn das Konto-Lager wirklich geht)
      if (KL.owner !== 'geraet' && klShared(KL.owner)) {
        const local = klLocalRead();
        if (local.length) {
          const r = await klCommit((list) => ({ res: klAdd(list, local, true) }));
          if (r.ok && r.owner === KL.owner && klShared(r.owner)) {
            try { localStorage.removeItem(KL_KEY); } catch { /* privat */ }
            if (typeof ui !== 'undefined') ui.log(`${local.length} Sachen aus dem Lager dieses Geräts liegen jetzt im Lager deines Kontos.`, 'info');
          }
        }
      }
      const p = game.player;
      if (klShared(KL.owner) && p && p.storage && p.storage.items && p.storage.items.length) await klMigrate(p);
      if (klShared(KL.owner) && p && p.storage && p.storage.items && p.storage.items.length) throw new Error('Dein bisheriges Lager konnte noch nicht ins gemeinsame Lager umziehen. Bitte gleich noch einmal versuchen.');
      KL.state = 'ok';
      KL.msg = '';
    } catch (e) {
      KL.state = 'fehler';
      KL.msg = hdbMsg(e);
    }
    KL.loading = null;
  })();
  return KL.loading;
}

// Altes Lager eines Charakters (bis 13.62) ins gemeinsame Lager
async function klMigrate(p) {
  if (KL.migrating || !p.storage || !p.storage.items || !p.storage.items.length || !klShared(klOwner())) return;
  KL.migrating = true;
  try {
    const items = p.storage.items.filter((it) => it && (it.slot || it.book));
    for (const it of items) {
      if (!it.uid) it.uid = newUid();
      if (!isBook(it) && !(it.rarity >= 0 && it.rarity < RARITIES.length)) it.rarity = legacyRarity(it);
    }
    const r = await klCommit((list) => ({ res: klAdd(list, items, true) }));
    // nur leeren, wenn es wirklich im gemeinsamen Lager angekommen ist (nie im Rückfall auf das eigene Lager)
    if (r.ok && klShared(r.owner) && game.player === p) {
      p.storage.items = [];
      p.storage.shared = 1;
      handelSave();
      if (typeof ui !== 'undefined') ui.log(`Dein Lager gehört jetzt dem ganzen ${KL.owner === 'geraet' ? 'Gerät' : 'Konto'}: ${items.length} Sachen liegen im gemeinsamen Lager.`, 'info');
    }
  } finally {
    KL.migrating = false;
  }
}

// Beim Start eines Charakters: anderes Konto oder Gerät → Zwischenstand vergessen; altes Lager umziehen
function klStart(p) {
  if (KL.owner !== klOwner() || KL.owner === 'figur') {
    KL.items = null;
    KL.etag = null;
    KL.state = 'idle';
  }
  if (p.storage && p.storage.items && p.storage.items.length) klLoad().catch(() => {});
}

// Liegt im gemeinsamen Lager (soweit schon geladen) oder im Lager dieses Geräts etwas Passendes? (für fernninja.js)
function klHasItem(pred) {
  const loaded = KL.owner && KL.owner === klOwner() && Array.isArray(KL.items) ? KL.items : [];
  return loaded.some((it) => it && pred(it)) || klLocalRead().some((it) => it && pred(it));
}

// Gegenstände aus der Tasche einlagern (Kennungen); erst nach der Bestätigung aus der Tasche nehmen
async function klStore(p, uids) {
  const items = uids.map((u) => p.inventory.find((x) => x.uid === u)).filter(Boolean);
  if (!items.length) return { ok: false, msg: '' };
  const r = await klCommit((list) => {
    const done = klAdd(list, items, false);
    return done.length ? { res: done } : { error: 'Das Lager ist voll.' };
  });
  if (!r.ok) return r;
  const done = new Set(r.res);
  p.inventory = p.inventory.filter((x) => !done.has(x.uid));
  handelSave();
  return { ok: true, full: done.size < items.length };
}

// Gegenstand aus dem Lager in die Tasche
async function klTake(p, uid) {
  const r = await klCommit((list) => {
    const i = list.findIndex((x) => x.uid === uid);
    if (i < 0) return { error: 'Das hat inzwischen ein anderer Charakter herausgenommen.' };
    const it = list[i];
    const stack = isBook(it) && p.inventory.find((x) => x.book === it.book && x.count + it.count <= BOOK_STACK);
    if (!stack && p.inventory.length >= BAG_SIZE) return { error: 'Deine Tasche ist voll.' };
    list.splice(i, 1);
    return { res: it };
  });
  if (!r.ok) return r;
  const it = r.res;
  const stack = isBook(it) && p.inventory.find((x) => x.book === it.book && x.count + it.count <= BOOK_STACK);
  if (stack) stack.count += it.count;
  else p.inventory.push(it);
  handelSave();
  return { ok: true };
}

// --- Fenster beim Lagerverwalter (oberflaeche.js renderStorage) ---------------------------------------------
function klVisible() {
  const el = document.getElementById('klRoot');
  return !!el && !document.getElementById('panelNpc').hidden;
}
function klRender(msg) {
  const p = game.player;
  const body = document.getElementById('npcBody');
  const note = msg && msg.text ? `<p class="${msg.ok ? 'gear-msg success' : 'form-error'}">${msg.text}</p>` : '';
  const who = handelOn() ? 'allen Charakteren deines Kontos' : 'allen Charakteren auf diesem Gerät';
  if (!p.storage) {
    body.innerHTML = `<div id="klRoot"><p>„Hier lagert ganz Vlotho seine Schätze. Für einmalig ${fmtN(STORAGE.price)} Gold bekommst du Zugang zum Lager – ` +
      `bei jedem Lagerverwalter in jeder Stadt und jedem Lager kommst du an dieselben Sachen.“</p>` +
      `<p class="hint-text">Der Inhalt gehört ${who}: Was ein Charakter einlagert, kann jeder andere mit eigenem Zugang herausnehmen.</p>` + note +
      `<p>${STORAGE_SIZE} Plätze (${STORAGE.pages} Seiten zu je ${STORAGE.page}). Dein Gold: <span class="price">${fmtN(p.gold)}</span></p>` +
      `<button type="button" class="btn btn-primary" id="btnBuyStorage" ${p.gold < STORAGE.price ? 'disabled' : ''}>Lager eröffnen (${fmtN(STORAGE.price)} Gold)</button></div>`;
    document.getElementById('btnBuyStorage').addEventListener('click', () => {
      const r = buyStorage(p);
      if (r === 'ok') handelSave();
      klRender(r === 'ok' ? { ok: true, text: 'Dein Zugang zum Lager ist eröffnet.' } : { ok: false, text: 'Dafür reicht dein Gold nicht.' });
    });
    return;
  }
  const own = klOwner();
  // Rückfall: immer das Lager des gerade gespielten Charakters zeigen
  if (own === 'figur' && KL.owner === 'figur') KL.items = p.storage.items = Array.isArray(p.storage.items) ? p.storage.items : [];
  const stale = KL.owner !== own || !KL.items;
  if (stale || KL.state !== 'ok' || (klShared(own) && p.storage.items && p.storage.items.length)) {
    if (KL.state === 'fehler') {
      body.innerHTML = `<div id="klRoot" class="kl-status"><p class="form-error">${KL.msg}</p>` +
        `<button type="button" class="btn btn-primary" id="btnKlRetry">Erneut versuchen</button></div>`;
      document.getElementById('btnKlRetry').addEventListener('click', () => {
        KL.state = 'idle';
        klRender();
      });
      return;
    }
    body.innerHTML = `<div id="klRoot" class="kl-status"><p class="hint-text">Lager wird geöffnet …</p></div>`;
    klLoad().then(() => { if (klVisible()) klRender(msg); });
    return;
  }
  const items = KL.items;
  const pages = klPages(items);
  ui.stPage = Math.max(0, Math.min(pages - 1, ui.stPage || 0));
  gear.page = Math.max(0, Math.min(BAG_PAGES - 1, gear.page || 0));
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI'];
  const tabs = (n, per, list, cur, attr) => Array.from({ length: n }, (_, k) =>
    `<button type="button" class="bag-tab${k === cur ? ' on' : ''}${k >= STORAGE.pages ? ' kl-over' : ''}" ${attr}="${k}">${roman[k] || k + 1}<small>${list.slice(k * per, (k + 1) * per).length}</small></button>`).join('');
  let sGrid = '';
  for (let i = ui.stPage * STORAGE.page; i < (ui.stPage + 1) * STORAGE.page; i++) sGrid += gear.tile(items[i], items[i] ? `data-take="${items[i].uid}"` : '');
  let bGrid = '';
  for (let i = gear.page * BAG_PAGE; i < (gear.page + 1) * BAG_PAGE; i++) bGrid += gear.tile(p.inventory[i], p.inventory[i] ? `data-store="${p.inventory[i].uid}"` : '');
  const over = items.length > STORAGE_SIZE;
  const solo = own === 'figur';
  const waiting = solo ? klLocalRead().length : 0;
  body.innerHTML = `<div id="klRoot"${KL.busy ? ' class="kl-busy"' : ''}>` +
    `<p class="hint-text">Tippe in der Tasche auf einen Gegenstand, um ihn einzulagern, und im Lager, um ihn herauszuholen. ` +
    (solo ? `${KL_DENIED_TEXT}${waiting ? ` ${waiting} Sachen aus dem Lager dieses Geräts warten darauf.` : ''}</p>` : `Das Lager gehört ${who}.</p>`) + note +
    (over ? `<p class="form-error">Das Lager ist übervoll (${items.length} von ${STORAGE_SIZE} Plätzen) – beim Zusammenlegen der alten Lager kam mehr zusammen. Nimm erst etwas heraus, bevor du wieder einlagerst.</p>` : '') +
    `<section class="store-box"><h3>${handelOn() && !solo ? 'Konto-Lager' : 'Lager'} <small>${items.length}/${STORAGE_SIZE}</small><span class="bag-tabs">${tabs(pages, STORAGE.page, items, ui.stPage, 'data-spage')}</span></h3>` +
    `<div class="bag-grid">${sGrid}</div></section>` +
    `<section class="store-box"><h3>Tasche <small>${p.inventory.length}/${BAG_SIZE}</small><span class="bag-tabs">${tabs(BAG_PAGES, BAG_PAGE, p.inventory, gear.page, 'data-bpage')}</span>` +
    `<button type="button" class="mini-btn" id="btnStorePage">Ganze Seite einlagern</button></h3>` +
    `<div class="bag-grid">${bGrid}</div></section></div>`;
  const run = async (fn) => {
    if (KL.busy) return;
    KL.busy = true;
    document.getElementById('klRoot').classList.add('kl-busy');
    let m = null;
    try {
      m = await fn();
    } catch (e) {
      m = { ok: false, text: hdbMsg(e) };
    }
    KL.busy = false;
    if (klVisible()) klRender(m);
  };
  body.querySelectorAll('[data-store]').forEach((b) => b.addEventListener('click', () => run(async () => {
    const r = await klStore(p, [b.dataset.store]);
    return r.ok ? null : { ok: false, text: r.msg };
  })));
  body.querySelectorAll('[data-take]').forEach((b) => b.addEventListener('click', () => run(async () => {
    const r = await klTake(p, b.dataset.take);
    return r.ok ? null : { ok: false, text: r.msg };
  })));
  body.querySelectorAll('[data-spage]').forEach((b) => b.addEventListener('click', () => { ui.stPage = Number(b.dataset.spage); klRender(); }));
  body.querySelectorAll('[data-bpage]').forEach((b) => b.addEventListener('click', () => { gear.page = Number(b.dataset.bpage); klRender(); }));
  document.getElementById('btnStorePage').addEventListener('click', () => run(async () => {
    const uids = p.inventory.slice(gear.page * BAG_PAGE, (gear.page + 1) * BAG_PAGE).map((x) => x.uid);
    const r = await klStore(p, uids);
    if (!r.ok) return r.msg ? { ok: false, text: r.msg } : null;
    return r.full ? { ok: false, text: 'Dein Lager ist voll, nicht alles passte hinein.' } : null;
  }));
}
