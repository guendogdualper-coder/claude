// Post (seit 13.63): Briefe an andere Charaktere, auch an Spieler, die gerade nicht online sind. In einen Brief kann
// man Gold und bis zu sechs Sachen legen (Ausrüstung, Schriftrollen, Tränke, Pfeile, Material). Briefkasten ist die
// Postmeisterin in jeder Stadt und jedem Lager (welt.js, Bild und Stand in handel-npc.js).
// Gespeichert wird in der Datenbank des Kontos (handel-db.js):
//   namen/<name klein>  → { uid, name, cls, at }   Wer einen Charakter mit Konto spielt, meldet seinen Namen an.
//   post/<uid>/<id>     → { an, anKey, von, vonUid, vonKey, at, betreff, text, gold, ware (Text), gelesen, sys }
// Briefe gehen an das Konto des Empfängers; angezeigt werden sie beim Charakter mit dem Namen in „an“.
// Ablauf beim Senden: Gold und Sachen gehen erst in Treuhand (nicht gespeichert), dann wird der Brief geschrieben;
// erst wenn der Server bestätigt, wird gespeichert – sonst bekommt man alles zurück. Abholen: Der Brief wird bedingt
// (ETag) ohne Anhänge zurückgeschrieben; nur wer dabei gewinnt, bekommt die Anhänge (nie doppelt, auch nicht auf
// zwei Geräten). Ohne Konto gibt es keine Post.

const POST_PORTO = 10; // Gold je Brief
const POST_MAX_WARE = 6;
const POST_TEXT = 500;
const POST_SUBJECT = 40;
const POST_POLL = 180000; // ms: so oft beim Spielen nach neuen Briefen sehen

const POST = { tab: 'ein', list: null, sel: null, busy: false, msg: null, nameState: null, loadedFor: null, unread: 0, timer: 0,
  compose: { an: '', betreff: '', text: '', gold: 0, pick: { sel: [], page: 0, max: POST_MAX_WARE } } };

const postPath = (uid, id) => `post/${uid}` + (id ? '/' + id : '');
const postMine = (m) => m.anKey === charKey(game.player.name);
const postDate = (t) => new Date(t).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
const postStr = (s, max) => (typeof s === 'string' ? s.slice(0, max) : '');

// Brief aus der Datenbank prüfen (nur bekannte Felder, Längen begrenzt); Anhänge über wareClean
function postClean(id, raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const m = {
    id, an: postStr(raw.an, 20), anKey: postStr(raw.anKey, 20), von: postStr(raw.von, 20), vonUid: postStr(raw.vonUid, 64),
    at: Number.isFinite(raw.at) ? raw.at : 0, betreff: postStr(raw.betreff, POST_SUBJECT), text: postStr(raw.text, POST_TEXT),
    gold: Number.isSafeInteger(raw.gold) && raw.gold > 0 ? raw.gold : 0, gelesen: raw.gelesen === true, sys: raw.sys === 'ah' ? 'ah' : null
  };
  if (!m.anKey) m.anKey = charKey(m.an);
  m.ware = waresParse(typeof raw.ware === 'string' ? raw.ware : '');
  m.kaputt = m.ware === null;
  if (m.kaputt) m.ware = [];
  return m;
}
const postHasStuff = (m) => m.gold > 0 || m.ware.length > 0;

// Briefe des Kontos laden (alle Charaktere), neueste zuerst
async function postLoad() {
  const r = await hdb.get(postPath(account.uid));
  const all = Object.entries(r.val || {}).map(([id, raw]) => postClean(id, raw)).filter(Boolean).sort((a, b) => b.at - a.at);
  POST.list = all;
  POST.loadedFor = account.uid;
  POST.unread = all.filter((m) => postMine(m) && !m.gelesen).length;
  return all;
}

// Namen anmelden, damit andere einem schreiben können (nur, wenn er frei ist oder schon diesem Konto gehört)
async function postRegister(p) {
  const key = charKey(p.name);
  try {
    const r = await hdb.get('namen/' + key);
    const v = r.val;
    if (v && v.uid && v.uid !== account.uid) {
      POST.nameState = 'belegt';
      return;
    }
    if (!v || v.name !== p.name || v.cls !== p.classId) await hdb.put('namen/' + key, { uid: account.uid, name: p.name, cls: p.classId, at: Date.now() });
    POST.nameState = 'ok';
  } catch (e) {
    POST.nameState = null;
  }
}

// neue Briefe melden (beim Start und alle paar Minuten)
async function postPoll(start) {
  if (!handelOn() || !game.running) return;
  const before = POST.unread;
  try { await postLoad(); } catch { return; }
  if (POST.unread && (start || POST.unread > before)) {
    ui.log(POST.unread === 1 ? 'Du hast einen ungelesenen Brief. Hol ihn bei der Post in jeder Stadt ab.' : `Du hast ${POST.unread} ungelesene Briefe. Hol sie bei der Post in jeder Stadt ab.`, 'info');
  }
}

function postStart(p) {
  POST.list = null;
  POST.sel = null;
  POST.nameState = null;
  POST.unread = 0;
  postRegister(p);
  setTimeout(() => postPoll(true), 4000);
  if (!POST.timer) POST.timer = setInterval(() => postPoll(false), POST_POLL);
}

// --- Fenster ---------------------------------------------------------------------------------------------
function postOpen(tab) {
  ui.closePanels();
  POST.tab = tab || 'ein';
  POST.sel = null;
  POST.msg = null;
  document.getElementById('panelPost').hidden = false;
  postRender();
  if (handelOn()) postRefresh();
}
const postVisible = () => !document.getElementById('panelPost').hidden;

async function postRefresh() {
  POST.busy = true;
  postRender();
  try {
    await postLoad();
  } catch (e) {
    POST.msg = { ok: false, text: hdbMsg(e) };
  }
  POST.busy = false;
  if (postVisible()) postRender();
}

function postRender() {
  const p = game.player;
  const body = document.getElementById('postBody');
  const gold = document.getElementById('postGold');
  if (gold) gold.textContent = fmtN(p.gold);
  if (!handelOn()) {
    body.innerHTML = handelNoAccountHtml('Post');
    return;
  }
  const mine = (POST.list || []).filter(postMine);
  const unread = mine.filter((m) => !m.gelesen).length;
  const note = POST.msg ? `<p class="${POST.msg.ok ? 'gear-msg success' : 'form-error'}">${POST.msg.text}</p>` : '';
  const tabs = `<div class="soc-tabs hd-tabs">` +
    `<button type="button" class="bag-tab${POST.tab === 'ein' ? ' on' : ''}" data-ptab="ein">Posteingang${unread ? ` <small>${unread}</small>` : ''}</button>` +
    `<button type="button" class="bag-tab${POST.tab === 'neu' ? ' on' : ''}" data-ptab="neu">Brief schreiben</button>` +
    `<button type="button" class="mini-btn hd-refresh" id="btnPostRefresh" ${POST.busy ? 'disabled' : ''}>Aktualisieren</button></div>`;
  const warn = POST.nameState === 'belegt'
    ? `<p class="form-error">Den Namen <span class="no-tr">${escapeHtml(p.name)}</span> hat schon ein Charakter eines anderen Kontos angemeldet – Briefe an diesen Namen bekommt er, nicht du. Schreiben kannst du trotzdem.</p>` : '';
  let main;
  if (POST.tab === 'neu') main = postComposeHtml();
  else if (POST.sel) main = postReadHtml(mine.find((m) => m.id === POST.sel));
  else main = postListHtml(mine);
  body.innerHTML = `<div class="hd-root${POST.busy ? ' hd-busy' : ''}">${tabs}${warn}${note}${main}</div>`;
  body.querySelectorAll('[data-ptab]').forEach((b) => b.addEventListener('click', () => {
    POST.tab = b.dataset.ptab;
    POST.sel = null;
    POST.msg = null;
    postRender();
  }));
  document.getElementById('btnPostRefresh').addEventListener('click', () => postRefresh());
  if (POST.tab === 'neu') postComposeWire(body);
  else if (POST.sel) postReadWire(body);
  else body.querySelectorAll('[data-mail]').forEach((b) => b.addEventListener('click', () => postSelect(b.dataset.mail)));
}

function postListHtml(mine) {
  if (!POST.list) return `<p class="hint-text">${POST.busy ? 'Briefe werden geholt …' : 'Noch nicht geladen.'}</p>`;
  const others = POST.list.length - mine.length;
  const rows = mine.map((m) => {
    const stuff = [m.ware.length ? `<span class="hd-chip">${m.ware.length} ${m.ware.length === 1 ? 'Anhang' : 'Anhänge'}</span>` : '',
      m.gold ? `<span class="hd-chip gold">${fmtN(m.gold)} Gold</span>` : ''].join('');
    return `<button type="button" class="hd-mail${m.gelesen ? '' : ' unread'}" data-mail="${m.id}">` +
      `<span class="hd-env" aria-hidden="true"></span>` +
      `<span class="hd-mail-main"><b class="hd-from${m.sys ? '' : ' no-tr'}">${escapeHtml(m.von)}</b><span class="hd-subj no-tr">${escapeHtml(m.betreff || '(ohne Betreff)')}</span></span>` +
      `<span class="hd-mail-side">${stuff}<small>${postDate(m.at)}</small></span></button>`;
  }).join('');
  return (rows ? `<div class="hd-mails">${rows}</div>` : `<p class="hint-text">Dein Briefkasten ist leer.</p>`) +
    (others > 0 ? `<p class="hint-text">${others} ${others === 1 ? 'Brief liegt' : 'Briefe liegen'} für deine anderen Charaktere bereit.</p>` : '');
}

function postSelect(id) {
  POST.sel = id;
  POST.msg = null;
  POST.armDel = false;
  const m = (POST.list || []).find((x) => x.id === id);
  // als gelesen markieren (ohne zu warten)
  if (m && !m.gelesen) {
    m.gelesen = true;
    POST.unread = Math.max(0, POST.unread - 1);
    hdb.patch(postPath(account.uid, id), { gelesen: true }).catch(() => {});
  }
  postRender();
}

function postReadHtml(m) {
  if (!m) return '<p class="hint-text">Diesen Brief gibt es nicht mehr.</p>';
  const tiles = m.ware.map((w, k) => wareTile(w, `data-pw="${k}"`)).join('');
  const has = postHasStuff(m);
  return `<article class="hd-letter">` +
    `<button type="button" class="mini-btn" id="btnPostBack">← Zurück</button>` +
    `<header><span>Von <b class="${m.sys ? '' : 'no-tr'}">${escapeHtml(m.von)}</b></span><small>${postDate(m.at)}</small></header>` +
    `<h3 class="no-tr">${escapeHtml(m.betreff || '(ohne Betreff)')}</h3>` +
    (m.text ? `<p class="hd-text${m.sys ? '' : ' no-tr'}">${escapeHtml(m.text)}</p>` : '') +
    (m.kaputt ? `<p class="form-error">Die Anhänge dieses Briefs sind beschädigt und können nicht abgeholt werden.</p>` : '') +
    (has ? `<section class="hd-attach"><h4>Anhänge</h4><div class="bag-grid">${tiles}</div>` +
      (m.gold ? `<p class="hd-gold-line"><img src="${lootIconUrl('gold')}" alt=""> <b class="price">${fmtN(m.gold)}</b> Gold</p>` : '') + `</section>` : '') +
    `<div class="hd-actions">` +
    (has ? `<button type="button" class="btn btn-primary" id="btnPostTake" ${POST.busy ? 'disabled' : ''}>Anhänge abholen</button>` : '') +
    (m.sys ? '' : `<button type="button" class="btn" id="btnPostReply">Antworten</button>`) +
    `<button type="button" class="btn ${POST.armDel ? 'btn-danger' : 'btn-ghost'}" id="btnPostDel" ${has || POST.busy ? 'disabled' : ''}>${POST.armDel ? 'Wirklich löschen?' : 'Löschen'}</button>` +
    `</div>` + (has ? '<small class="hint-text">Löschen geht erst, wenn die Anhänge abgeholt sind.</small>' : '') + `</article>`;
}

function postReadWire(body) {
  const m = (POST.list || []).find((x) => x.id === POST.sel);
  document.getElementById('btnPostBack').addEventListener('click', () => { POST.sel = null; POST.msg = null; postRender(); });
  if (!m) return;
  const take = document.getElementById('btnPostTake');
  if (take) take.addEventListener('click', () => postTake(m.id));
  const reply = document.getElementById('btnPostReply');
  if (reply) reply.addEventListener('click', () => {
    const c = POST.compose;
    c.an = m.von;
    c.betreff = (m.betreff.startsWith('Re: ') ? m.betreff : 'Re: ' + m.betreff).slice(0, POST_SUBJECT);
    c.text = '';
    POST.tab = 'neu';
    POST.sel = null;
    postRender();
  });
  document.getElementById('btnPostDel').addEventListener('click', () => {
    if (!POST.armDel) {
      POST.armDel = true;
      postRender();
      return;
    }
    postDelete(m.id);
  });
}

// Anhänge abholen: Brief bedingt ohne Anhänge zurückschreiben, dann erst bekommt man sie
async function postTake(id) {
  const p = game.player;
  if (POST.busy) return;
  POST.busy = true;
  postRender();
  let msg;
  try {
    const r = await hdb.get(postPath(account.uid, id), true);
    const m = postClean(id, r.val);
    if (!m || !postHasStuff(m)) msg = { ok: false, text: 'Die Anhänge wurden schon abgeholt.' };
    else if (m.kaputt) msg = { ok: false, text: 'Die Anhänge sind beschädigt.' };
    else if (!wareRoom(p, m.ware)) msg = { ok: false, text: 'In deiner Tasche ist nicht genug Platz.' };
    else {
      const next = Object.assign({}, r.val, { ware: '', gold: 0, abgeholt: Date.now(), gelesen: true });
      const w = await hdb.put(postPath(account.uid, id), next, r.etag || undefined);
      if (!w.ok) msg = { ok: false, text: 'Die Anhänge wurden gerade schon abgeholt.' };
      else {
        for (const x of m.ware) wareGive(p, x);
        p.gold += m.gold;
        handelSave();
        const parts = [m.ware.length ? `${m.ware.length} ${m.ware.length === 1 ? 'Sache' : 'Sachen'}` : '', m.gold ? `${fmtN(m.gold)} Gold` : ''].filter(Boolean).join(' und ');
        msg = { ok: true, text: `Abgeholt: ${parts}.` };
        ui.log(`Aus dem Briefkasten: ${parts}.`, 'level');
      }
    }
    await postLoad();
  } catch (e) {
    msg = { ok: false, text: hdbMsg(e) };
  }
  POST.busy = false;
  POST.msg = msg;
  if (postVisible()) postRender();
}

async function postDelete(id) {
  if (POST.busy) return;
  POST.busy = true;
  postRender();
  try {
    const r = await hdb.get(postPath(account.uid, id), true);
    const m = postClean(id, r.val);
    if (m && postHasStuff(m)) POST.msg = { ok: false, text: 'Erst die Anhänge abholen.' };
    else {
      await hdb.del(postPath(account.uid, id), r.etag || undefined);
      POST.sel = null;
      POST.msg = { ok: true, text: 'Brief gelöscht.' };
    }
    await postLoad();
  } catch (e) {
    POST.msg = { ok: false, text: hdbMsg(e) };
  }
  POST.busy = false;
  POST.armDel = false;
  if (postVisible()) postRender();
}

// --- Brief schreiben -----------------------------------------------------------------------------------------
function postComposeHtml() {
  const p = game.player;
  const c = POST.compose;
  const friends = (p.friends || []).map((f) => (typeof f === 'string' ? f : f && (f.n || f.name))).filter(Boolean);
  const total = POST_PORTO + (Number(c.gold) || 0);
  return `<form class="hd-compose" id="postForm" autocomplete="off">` +
    `<div class="hd-row"><label class="hd-field"><span>An (Name des Charakters)</span><input id="postAn" maxlength="14" list="postFriends" value="${escapeHtml(c.an)}" required spellcheck="false" class="no-tr"></label>` +
    `<label class="hd-field"><span>Betreff</span><input id="postBetreff" maxlength="${POST_SUBJECT}" value="${escapeHtml(c.betreff)}" class="no-tr"></label></div>` +
    `<datalist id="postFriends">${friends.map((f) => `<option value="${escapeHtml(f)}">`).join('')}</datalist>` +
    `<label class="hd-field"><span>Text</span><textarea id="postText" maxlength="${POST_TEXT}" rows="3" class="no-tr">${escapeHtml(c.text)}</textarea></label>` +
    `<div class="hd-row"><label class="hd-field hd-gold-in"><span>Gold mitschicken</span><input id="postGoldIn" type="number" min="0" max="${Math.max(0, p.gold - POST_PORTO)}" step="1" value="${c.gold || 0}" inputmode="numeric"></label>` +
    `<p class="hd-porto" id="postPorto">${postPortoHtml(total)}</p></div>` +
    `<h4>Anhänge <small>bis zu ${POST_MAX_WARE}</small></h4><div id="postPick">${warePickHtml(c.pick)}</div>` +
    `<div class="hd-actions"><button type="submit" class="btn btn-primary" ${POST.busy ? 'disabled' : ''}>Brief abschicken</button></div></form>`;
}
const postPortoHtml = (total) => `Porto <b class="price">${POST_PORTO}</b> Gold · zusammen <b class="price">${fmtN(total)}</b> von <span class="price">${fmtN(game.player.gold)}</span> Gold`;
function postComposeWire(body) {
  const c = POST.compose;
  const keep = () => {
    c.an = document.getElementById('postAn').value;
    c.betreff = document.getElementById('postBetreff').value;
    c.text = document.getElementById('postText').value;
    c.gold = Math.max(0, Math.floor(Number(document.getElementById('postGoldIn').value) || 0));
  };
  warePickWire(document.getElementById('postPick'), c.pick, () => { keep(); postRender(); });
  // nur die Summe nachführen (ein Neuzeichnen beim Verlassen des Feldes würde den nächsten Klick verschlucken)
  document.getElementById('postGoldIn').addEventListener('input', () => {
    keep();
    document.getElementById('postPorto').innerHTML = postPortoHtml(POST_PORTO + c.gold);
  });
  document.getElementById('postForm').addEventListener('submit', (e) => {
    e.preventDefault();
    keep();
    postSend();
  });
}

async function postSend() {
  const p = game.player;
  const c = POST.compose;
  if (POST.busy) return;
  const an = c.an.trim();
  const gold = Math.max(0, Math.floor(Number(c.gold) || 0));
  const fail = (text) => { POST.msg = { ok: false, text }; postRender(); };
  if (!/^[\p{L}\p{N} _-]{2,14}$/u.test(an)) return fail('Gib den Namen eines Charakters an (2 bis 14 Zeichen).');
  if (p.gold < gold + POST_PORTO) return fail(`Dafür reicht dein Gold nicht (Porto ${POST_PORTO} Gold).`);
  const wares = warePickList(c.pick);
  if (!wares) return fail('Ein Anhang ist nicht mehr in deiner Tasche.');
  if (!c.text.trim() && !c.betreff.trim() && !wares.length && !gold) return fail('Der Brief ist leer.');
  POST.busy = true;
  postRender();
  let held = null;
  try {
    const r = await hdb.get('namen/' + charKey(an));
    const to = r.val;
    if (!to || typeof to.uid !== 'string') {
      POST.busy = false;
      return fail('Einen Charakter mit diesem Namen gibt es nicht (oder er hat noch nie mit Konto gespielt).');
    }
    // Treuhand: erst abgeben (nicht gespeichert), dann schreiben; bei einem Fehler zurück
    held = wareEscrow(p, wares);
    if (!held) {
      POST.busy = false;
      return fail('Ein Anhang ist nicht mehr in deiner Tasche.');
    }
    p.gold -= gold + POST_PORTO;
    const msg = { an: typeof to.name === 'string' ? to.name : an, anKey: charKey(an), von: p.name, vonUid: account.uid, vonKey: charKey(p.name), at: Date.now(),
      betreff: c.betreff.trim().slice(0, POST_SUBJECT), text: c.text.trim().slice(0, POST_TEXT), gold, ware: held.length ? waresText(held) : '', gelesen: false };
    await hdb.put(postPath(to.uid, handelId()), msg);
    held = null;
    handelSave();
    POST.compose = { an: '', betreff: '', text: '', gold: 0, pick: { sel: [], page: c.pick.page, max: POST_MAX_WARE } };
    POST.msg = { ok: true, text: `Brief an ${msg.an} ist unterwegs.` };
    ui.log(`Brief an ${msg.an} abgeschickt.`, 'info');
  } catch (e) {
    POST.msg = { ok: false, text: hdbMsg(e) + ' Der Brief wurde nicht verschickt.' };
  }
  // Fehler beim Schreiben: alles zurück
  if (held) {
    for (const w of held) wareGive(p, w);
    p.gold += gold + POST_PORTO;
  }
  POST.busy = false;
  if (postVisible()) postRender();
}
