// Spielerschutz (seit 13.77, Vorgaben von Google Play für Spiele mit Chat und Konten):
//  - Blockieren: Nachrichten und Sprechblasen blockierter Spieler werden ausgeblendet, ihre Einladungen (Handel,
//    Duell, Gruppe, Freundschaft, Gilde, Gruppenfinder, Betrachten) automatisch abgelehnt. Die Liste liegt auf dem
//    Gerät (localStorage) und mit Konto zusätzlich im Konto (konten/<uid>/blockiert, siehe konto.js), damit sie auf
//    jedem Gerät gilt. Aufheben: Spielerkarte, Chat oder Einstellungen → Konto.
//  - Melden: Grund + eigener Text, dazu die letzten Chatnachrichten des Spielers; geht an die Datenbank unter
//    meldungen/<id> (nur schreiben, lesen kann nur der Betreiber in der Firebase-Konsole). Höchstens eine Meldung pro
//    Minute (auch vom Server erzwungen über meldezeit/<uid>, Regeln in docs/konten-einrichten.md). Ohne Konto: Hinweis
//    und – sobald eingetragen – eine E-Mail an den Betreiber.
//  - Konto löschen: Dialog mit Bestätigung (Kontoname und Passwort), Ablauf in konto-loeschen.js.
//  - Links zu Datenschutzerklärung und Konto-Löschseite (Startbildschirm, Einstellungen → Konto).

// Kontakt des Betreibers für Meldungen ohne Konto – bitte eintragen (wie in datenschutz.html).
// Solange hier der Platzhalter steht, erscheint statt der E-Mail nur der Verweis auf die Datenschutzerklärung.
const KONTAKT_EMAIL = '[E-MAIL-ADRESSE]';
const BLOCK_KEY = 'seelenstein.blockiert';
const MELDE_KEY = 'seelenstein.meldezeit';
const MELDE_GAP = 60000; // ms zwischen zwei Meldungen
const MELDE_CHAT = 10;   // so viele Chatnachrichten des Spielers gehen mit
const MELDE_GRUENDE = [
  ['beleidigung', 'Beleidigung/Belästigung'],
  ['betrug', 'Betrug'],
  ['spam', 'Spam'],
  ['name', 'Unangemessener Name'],
  ['sonstiges', 'Sonstiges']
];
const LINK_DATENSCHUTZ = 'datenschutz.html';
const LINK_KONTO_LOESCHEN = 'konto-loeschen.html';

// --- Blockierliste ------------------------------------------------------------------------------------
// { at: Zeit der letzten Änderung, names: [Charakternamen] } – beim Abgleich mit dem Konto gilt die neuere Liste
function blockRead() {
  try {
    const st = JSON.parse(localStorage.getItem(BLOCK_KEY) || 'null');
    if (st && Array.isArray(st.names)) return { at: Number(st.at) || 0, names: st.names.filter((n) => typeof n === 'string').slice(0, 500) };
  } catch (e) { /* privat oder kaputt */ }
  return { at: 0, names: [] };
}
let blockCache = null;
const blockState = () => blockCache || (blockCache = blockRead());
function blockWrite(st) {
  blockCache = st;
  try { localStorage.setItem(BLOCK_KEY, JSON.stringify(st)); } catch (e) { /* privat */ }
}
const blockKey = (name) => String(name || '').trim().toLowerCase();

function isBlocked(name) {
  const k = blockKey(name);
  return !!k && blockState().names.some((n) => blockKey(n) === k);
}
function blockedNames() {
  return blockState().names.slice();
}

function setBlocked(name, on) {
  name = String(name || '').trim().slice(0, 40);
  if (!name || (game.player && name === game.player.name)) return;
  const st = blockState();
  const names = st.names.filter((n) => blockKey(n) !== blockKey(name));
  if (on) names.push(name);
  blockWrite({ at: Date.now(), names });
  if (on) {
    // Sprechblase sofort weg
    const o = typeof onlinePlayer === 'function' && typeof net !== 'undefined' ? onlinePlayer(name) : null;
    if (o) o.rp.say = '';
    ui.log(`${name} ist blockiert. Seine Nachrichten und Einladungen siehst du nicht mehr.`, 'info');
  } else ui.log(`${name} ist nicht mehr blockiert.`, 'info');
  if (typeof ui !== 'undefined' && ui.renderChat) ui.renderChat();
  if (typeof pcard !== 'undefined' && pcard.pid) pcard.render();
  if (typeof options !== 'undefined' && $('panelOpts') && !$('panelOpts').hidden) options.render();
  // mit Konto: bald hochladen
  if (typeof accountOn === 'function' && accountOn() && typeof cloudSoon === 'function') cloudSoon();
}

// für konto.js: Liste als Text ins Konto, neuere Liste aus dem Konto übernehmen
function blockForCloud() {
  const st = blockState();
  return st.at ? JSON.stringify(st) : undefined;
}
function blockFromCloud(raw) {
  if (typeof raw !== 'string') return;
  let r = null;
  try { r = JSON.parse(raw); } catch (e) { return; }
  if (!r || !Array.isArray(r.names) || !(Number(r.at) > blockState().at)) return;
  blockWrite({ at: Number(r.at), names: r.names.filter((n) => typeof n === 'string').slice(0, 500) });
  if (typeof ui !== 'undefined' && ui.renderChat && game.running) ui.renderChat();
}

// Eingang einer Nachricht von einem blockierten Spieler (gemeinschaft.js onSocial): Einladungen und Anfragen
// höflich ablehnen (der andere wartet sonst), sonst ignorieren. true = Nachricht ist erledigt.
const BLOCK_INVITES = { tq: ['tn', 'hat abgelehnt'], dq: ['dn', 'hat das Duell abgelehnt'], pi: ['pn', 'hat die Gruppe abgelehnt'], lfj: ['lfn', 'Anfrage abgelehnt.'] };
const BLOCK_IGNORE = ['fr', 'gi', 'iq'];
function blockedSocial(pid, d) {
  if (!d || typeof net === 'undefined') return false;
  const rp = net.players.get(pid);
  if (!isBlocked(rp && rp.name) && !isBlocked(d.n)) return false;
  const inv = BLOCK_INVITES[d.k];
  if (inv) {
    netSocial(pid, { k: inv[0], n: game.player.name, why: inv[1] });
    return true;
  }
  return BLOCK_IGNORE.includes(d.k);
}

// --- Kleines Dialogfenster (über allem, auch über dem Startbildschirm) ----------------------------------
function ssDialog(html, cls = '') {
  ssDialogClose();
  const wrap = document.createElement('div');
  wrap.id = 'ssDialog';
  wrap.className = 'ss-dlg';
  wrap.innerHTML = `<div class="ss-dlg-box frame ${cls}" role="dialog" aria-modal="true">${html}</div>`;
  // Tippen auf den dunklen Rand schließt (nicht während etwas läuft)
  wrap.addEventListener('click', (e) => { if (e.target === wrap && !wrap.dataset.busy) ssDialogClose(); });
  // Tasten im Dialog nicht an das Spiel weitergeben (Fertigkeiten, Chat …)
  wrap.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape' && !wrap.dataset.busy) ssDialogClose();
  });
  wrap.addEventListener('keyup', (e) => e.stopPropagation());
  document.body.append(wrap);
  wrap.querySelectorAll('[data-dlg-close]').forEach((b) => b.addEventListener('click', ssDialogClose));
  return wrap;
}
function ssDialogClose() {
  const old = document.getElementById('ssDialog');
  if (old) old.remove();
}
const ssIcon = (sym) => `<span class="ss-ico" aria-hidden="true">${sym}</span>`;

// --- Name im Chat antippen -------------------------------------------------------------------------------
function chatNameMenu(name) {
  if (!name || (game.player && name === game.player.name)) return;
  const online = typeof onlinePlayer === 'function' ? onlinePlayer(name) : null;
  const blocked = isBlocked(name);
  const dlg = ssDialog(
    `<h3 class="ss-title no-tr">${escapeHtml(name)}</h3>` +
    `<div class="ss-btns">` +
    (online ? `<button type="button" class="btn btn-ghost" data-act="card">${ssIcon('👤')}<span>Spielerkarte</span></button>` : '') +
    `<button type="button" class="btn btn-ghost" data-act="block">${ssIcon('⛔')}<span>${blocked ? 'Blockierung aufheben' : 'Blockieren'}</span></button>` +
    `<button type="button" class="btn btn-ghost" data-act="report">${ssIcon('⚑')}<span>Melden</span></button>` +
    `<button type="button" class="btn btn-ghost" data-dlg-close>Schließen</button></div>`, 'ss-small');
  dlg.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => {
    const a = b.dataset.act;
    ssDialogClose();
    if (a === 'card' && online) pcard.open(online.pid);
    if (a === 'block') setBlocked(name, !blocked);
    if (a === 'report') openReport(name);
  }));
}

// --- Melden ----------------------------------------------------------------------------------------------
const reportOn = () => typeof handelOn === 'function' && handelOn();
const kontaktSet = () => KONTAKT_EMAIL && !KONTAKT_EMAIL.startsWith('[');
function reportWait() {
  let last = 0;
  try { last = Number(localStorage.getItem(MELDE_KEY)) || 0; } catch (e) { /* privat */ }
  last = Math.max(last, reportWait.mem || 0);
  return Math.max(0, MELDE_GAP - (Date.now() - last));
}
function reportMailHref(name) {
  const body = `Spieler: ${name}\nGrund: \nWas ist passiert: \n`;
  return `mailto:${KONTAKT_EMAIL}?subject=${encodeURIComponent('Seelenstein: Meldung ' + name)}&body=${encodeURIComponent(body)}`;
}
// letzte Chatnachrichten des Spielers aus dem Verlauf (auch ausgeblendete eines blockierten Spielers)
function reportChat(name) {
  const k = blockKey(name);
  return (ui.chatLines || []).filter((l) => l.name && blockKey(l.name) === k).slice(-MELDE_CHAT)
    .map((l) => `[${l.c || 'g'}] ${String(l.text).slice(0, 200)}`);
}

function openReport(name) {
  name = String(name || '').trim();
  if (!name) return;
  if (!reportOn()) {
    const ready = typeof cloudReady === 'function' && cloudReady();
    ssDialog(`<h3 class="ss-title">Spieler melden</h3>` +
      `<p>${ready ? 'Melden geht nur mit Konto. Melde dich auf dem Startbildschirm an (Charakter wechseln → Konto), dann kannst du Spieler direkt aus dem Spiel melden.' : 'Auf diesem Spiel sind keine Konten eingerichtet.'}</p>` +
      (kontaktSet() ? `<p>Ohne Konto kannst du uns auch eine E-Mail schreiben:</p><p><a class="btn btn-ghost" href="${reportMailHref(name)}" target="_blank" rel="noopener">✉ E-Mail an den Betreiber</a></p>`
        : `<p>Die Kontaktadresse des Betreibers steht in der <a href="${LINK_DATENSCHUTZ}" target="_blank" rel="noopener">Datenschutzerklärung</a>.</p>`) +
      `<p class="hint-text">Blockieren geht auch ohne Konto: Dann siehst du seine Nachrichten und Einladungen nicht mehr.</p>` +
      `<div class="ss-btns">${isBlocked(name) ? '' : '<button type="button" class="btn btn-ghost" data-act="block">⛔ Blockieren</button>'}<button type="button" class="btn btn-primary" data-dlg-close>OK</button></div>`);
    const b = document.querySelector('#ssDialog [data-act="block"]');
    if (b) b.addEventListener('click', () => { ssDialogClose(); setBlocked(name, true); });
    return;
  }
  const lines = reportChat(name);
  const dlg = ssDialog(
    `<h3 class="ss-title">Spieler melden</h3>` +
    `<p class="ss-who no-tr">${escapeHtml(name)}</p>` +
    `<fieldset class="ss-reasons"><legend>Grund</legend>` +
    MELDE_GRUENDE.map(([id, label], i) => `<label><input type="radio" name="ssGrund" value="${id}"${i === 0 ? ' checked' : ''}><span>${label}</span></label>`).join('') +
    `</fieldset>` +
    `<label class="ss-field"><span>Was ist passiert? (freiwillig)</span><textarea id="ssText" maxlength="500" rows="3"></textarea></label>` +
    `<label class="ss-check"><input type="checkbox" id="ssBlock"${isBlocked(name) ? ' checked disabled' : ''}><span>Spieler auch blockieren</span></label>` +
    `<p class="hint-text">Mitgeschickt werden: dein Konto- und Charaktername, der gemeldete Name, Grund und Text, Server und Kanal sowie die letzten Chatnachrichten dieses Spielers, die du gesehen hast (${lines.length}). Gelesen wird die Meldung nur vom Betreiber.</p>` +
    `<p id="ssMsg" class="ss-msg" hidden></p>` +
    `<div class="ss-btns"><button type="button" class="btn btn-danger" id="ssSend">Meldung senden</button><button type="button" class="btn btn-ghost" data-dlg-close>Abbrechen</button></div>`);
  const msg = dlg.querySelector('#ssMsg');
  const send = dlg.querySelector('#ssSend');
  const show = (t, ok) => {
    msg.hidden = false;
    msg.textContent = t;
    msg.classList.toggle('ok', !!ok);
  };
  send.addEventListener('click', async () => {
    const wait = reportWait();
    if (wait > 0) {
      show(`Bitte warte noch ${Math.ceil(wait / 1000)} Sekunden bis zur nächsten Meldung.`);
      return;
    }
    const grund = (dlg.querySelector('input[name="ssGrund"]:checked') || {}).value || 'sonstiges';
    const text = dlg.querySelector('#ssText').value.trim().slice(0, 500);
    const alsoBlock = dlg.querySelector('#ssBlock').checked && !isBlocked(name);
    send.disabled = true;
    dlg.dataset.busy = '1';
    show('Wird gesendet …', true);
    const id = 'm' + handelId();
    const rec = {
      vonUid: account.uid, von: String(account.name || '').slice(0, 40), figur: game.player ? String(game.player.name).slice(0, 40) : '',
      gegen: name.slice(0, 40), grund, chat: JSON.stringify(lines).slice(0, 3000),
      ort: typeof netOnline === 'function' && netOnline() ? `${serverName(net.server)} · Kanal ${net.channel}`.slice(0, 60) : 'offline',
      version: String(typeof GAME_VERSION !== 'undefined' ? GAME_VERSION : '').slice(0, 20), zeit: { '.sv': 'timestamp' }
    };
    if (text) rec.text = text;
    try {
      await hdb.patch('', { ['meldungen/' + id]: rec, ['meldezeit/' + account.uid]: { '.sv': 'timestamp' } });
      reportWait.mem = Date.now();
      try { localStorage.setItem(MELDE_KEY, String(reportWait.mem)); } catch (e) { /* privat */ }
      delete dlg.dataset.busy;
      if (alsoBlock) setBlocked(name, true);
      dlg.querySelector('.ss-dlg-box').innerHTML = `<h3 class="ss-title">Danke für deine Meldung</h3>` +
        `<p>Wir sehen sie uns an und gehen gegen Verstöße vor (Verwarnung, Sperre des Kontos).</p>` +
        `<p class="hint-text">Du kannst den Spieler jederzeit blockieren: Spielerkarte oder Name im Chat antippen.</p>` +
        `<div class="ss-btns"><button type="button" class="btn btn-primary" data-dlg-close>OK</button></div>`;
      dlg.querySelector('[data-dlg-close]').addEventListener('click', ssDialogClose);
    } catch (e) {
      delete dlg.dataset.busy;
      send.disabled = false;
      show(e && e.code === 'regeln'
        ? 'Der Server hat die Meldung abgelehnt. Hast du gerade schon gemeldet? Dann bitte eine Minute warten.' + (kontaktSet() ? ' Sonst schreib uns eine E-Mail.' : '')
        : hdbMsg(e));
      if (e && e.code === 'regeln' && kontaktSet() && !dlg.querySelector('.ss-mail')) {
        msg.insertAdjacentHTML('afterend', `<p class="ss-mail"><a class="btn btn-ghost" href="${reportMailHref(name)}" target="_blank" rel="noopener">✉ E-Mail an den Betreiber</a></p>`);
      }
    }
  });
}

// --- Konto löschen (Dialog im Spiel) ------------------------------------------------------------------
function openDeleteAccount() {
  if (typeof accountOn !== 'function' || !accountOn()) return;
  const own = account.name || '';
  const dlg = ssDialog(
    `<h3 class="ss-title">Konto löschen</h3>` +
    `<p>Damit löschst du dein Konto <b class="no-tr">${escapeHtml(own)}</b> endgültig.</p><p>Gelöscht werden:</p>` +
    `<ul class="ss-list"><li>alle Charaktere im Konto (auf dem Server)</li><li>das Konto-Lager mit allen Sachen darin</li>` +
    `<li>alle Briefe in der Post, auch nicht abgeholtes Gold und Sachen</li><li>deine Angebote im Auktionshaus (die Sachen darin gehen verloren)</li>` +
    `<li>die Reservierung deiner Charakternamen</li><li>deine Blockierliste im Konto und das Konto selbst (Kontoname und Passwort)</li></ul>` +
    `<p>Die Charaktere auf diesem Gerät bleiben erhalten, gehören dann aber zu keinem Konto mehr und liegen nur noch auf diesem Gerät. Willst du sie auch hier nicht mehr, lösche sie danach in der Charakterauswahl.</p>` +
    `<p><b>Das lässt sich nicht rückgängig machen.</b></p>` +
    `<label class="ss-field"><span>Zur Bestätigung deinen Kontonamen eingeben</span><input id="ssDelName" type="text" maxlength="20" autocomplete="off" spellcheck="false"></label>` +
    `<label class="ss-field"><span>Passwort</span><input id="ssDelPass" type="password" maxlength="64" autocomplete="current-password"></label>` +
    `<p id="ssMsg" class="ss-msg" hidden></p>` +
    `<div class="ss-btns"><button type="button" class="btn btn-danger" id="ssDelGo" disabled>Konto endgültig löschen</button><button type="button" class="btn btn-ghost" data-dlg-close>Abbrechen</button></div>`);
  const nameIn = dlg.querySelector('#ssDelName');
  const passIn = dlg.querySelector('#ssDelPass');
  const go = dlg.querySelector('#ssDelGo');
  const msg = dlg.querySelector('#ssMsg');
  const check = () => { go.disabled = nameIn.value.trim().toLowerCase() !== own.toLowerCase() || !passIn.value; };
  nameIn.addEventListener('input', check);
  passIn.addEventListener('input', check);
  nameIn.focus();
  go.addEventListener('click', async () => {
    if (go.disabled) return;
    dlg.dataset.busy = '1';
    dlg.querySelectorAll('button, input').forEach((x) => { x.disabled = true; });
    msg.hidden = false;
    msg.classList.add('ok');
    // laufendes Spiel: erst auf dem Gerät speichern, dann nichts mehr ins Konto hochladen
    if (game.running && typeof saveGame === 'function') saveGame();
    account.deleting = true;
    try {
      // nur das angemeldete Konto: der eingegebene Name muss dazu passen (konto-loeschen.js meldet sich damit an)
      await kontoLoeschen(own, passIn.value, (t) => { msg.textContent = t; });
      accountDeleted();
      delete dlg.dataset.busy;
      dlg.querySelector('.ss-dlg-box').innerHTML = `<h3 class="ss-title">Dein Konto wurde gelöscht</h3>` +
        `<p>Alle Daten deines Kontos auf dem Server sind gelöscht, du bist abgemeldet.</p>` +
        `<p>Deine Charaktere auf diesem Gerät kannst du ohne Konto weiterspielen.</p>` +
        `<div class="ss-btns"><button type="button" class="btn btn-primary" id="ssDelOk">OK</button></div>`;
      dlg.querySelector('#ssDelOk').addEventListener('click', () => {
        ssDialogClose();
        if (game.running) location.reload();
        else ui.showStart();
      });
    } catch (e) {
      account.deleting = false;
      delete dlg.dataset.busy;
      msg.classList.remove('ok');
      msg.textContent = (e && e.message) || 'Das hat nicht geklappt.';
      dlg.querySelectorAll('button, input').forEach((x) => { x.disabled = false; });
      check();
    }
  });
}

// --- Einstellungen → Reiter Konto ------------------------------------------------------------------------
function legalOptionsHtml() {
  const names = blockedNames();
  const ready = typeof cloudReady === 'function' && cloudReady();
  const on = typeof accountOn === 'function' && accountOn();
  return `<section class="opt-group"><h3>Konto</h3>` +
    (on ? `<div class="opt-row"><div class="opt-text"><strong>Angemeldet als</strong><small class="no-tr">${escapeHtml(account.name || '')}</small></div></div>` +
      `<div class="opt-row"><div class="opt-text"><strong>Konto löschen</strong><small>Löscht dein Konto mit allen Charakteren im Konto, Konto-Lager, Post und Auktionen. Die Charaktere auf diesem Gerät bleiben (ohne Konto).</small></div>` +
      `<button type="button" class="btn btn-danger" data-legal="delete">Konto löschen …</button></div>`
      : `<p class="hint-text">${ready ? 'Du bist nicht angemeldet. Anmelden und Registrieren geht auf dem Startbildschirm (Figur und Spiel → Charakter wechseln).' : 'Auf diesem Spiel sind keine Konten eingerichtet; deine Charaktere liegen nur auf diesem Gerät.'}</p>`) +
    `</section>` +
    `<section class="opt-group"><h3>Blockierte Spieler</h3>` +
    (names.length ? `<ul class="ss-blocklist">${names.map((n) => `<li><span class="no-tr">${escapeHtml(n)}</span><button type="button" class="btn btn-ghost" data-unblock="${escapeHtml(n)}">Blockierung aufheben</button></li>`).join('')}</ul>`
      : '<p class="hint-text">Du hast niemanden blockiert.</p>') +
    `<p class="hint-text">Blockieren: Spieler antippen (Spielerkarte) oder seinen Namen im offenen Chat antippen. Von blockierten Spielern siehst du keine Nachrichten und Sprechblasen; Einladungen zu Handel, Duell, Gruppe, Freundschaft und Gilde werden automatisch abgelehnt. Dort kannst du Spieler auch melden.</p></section>` +
    `<section class="opt-group"><h3>Rechtliches</h3><div class="opt-btns">` +
    `<a class="btn btn-ghost" href="${LINK_DATENSCHUTZ}" target="_blank" rel="noopener">🔒 Datenschutzerklärung</a>` +
    `<a class="btn btn-ghost" href="${LINK_KONTO_LOESCHEN}" target="_blank" rel="noopener">🗑 Konto löschen (Webseite)</a></div></section>`;
}
function wireLegalOptions(body) {
  body.querySelectorAll('[data-unblock]').forEach((b) => b.addEventListener('click', () => setBlocked(b.dataset.unblock, false)));
  const del = body.querySelector('[data-legal="delete"]');
  if (del) del.addEventListener('click', openDeleteAccount);
}
