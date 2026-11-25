// Offizieller Start (seit 14.92): einmaliger Neustart aller Spielstände + sichere Passwörter.
//
// 1. Neustart: Alle Charaktere beginnen neu. Die Konten (Kontoname, Anmeldung) bleiben.
//    - Auf jedem Gerät beim ersten Laden dieser Version (Merker NEUSTART_LOCAL_KEY): Charaktere, Spielstand, Konto-Lager
//      ohne Konto, Instanz-Sperren, freigeschaltete Taschenseiten, Bestenlisten-Zwischenstand und Schadensmessungen weg.
//      Einstellungen, Anmeldung, Blockierliste und Regel-Bestätigung bleiben.
//    - Im Konto (konto.js, cloudExchange): Trägt konten/<uid> noch nicht die Kennung NEUSTART_ID, gilt das Konto als
//      leer. Vorher werden auf dem Server Konto-Lager, Post, eigene Angebote im Auktionshaus, reservierte
//      Charakternamen und die Einträge in der Bestenliste gelöscht (Bausteine aus konto-loeschen.js), danach wird das
//      leere Konto mit der Kennung gespeichert. Jedes Gerät, jedes Konto genau einmal.
//    - Bestenliste: Einträge von vor dem Neustart (at < NEUSTART_AT) zeigt bestenliste.js nicht mehr an – auch von
//      Konten, die sich nie wieder anmelden.
// 2. Passwörter: mindestens 8 Zeichen mit Großbuchstabe, Kleinbuchstabe, Zahl und Sonderzeichen (pwFehler).
//    Gilt beim Registrieren sofort. Bestehende Konten müssen beim nächsten Anmelden ein neues Passwort wählen,
//    bevor sie spielen können (konten/<uid>.pwNeu === NEUSTART_ID heißt: erledigt). Das neue Passwort setzt
//    Firebase Auth (accounts:update) nach einer frischen Anmeldung mit dem alten.

const NEUSTART_ID = 'start-2026-11-13';
const NEUSTART_AT = Date.parse('2026-11-13T17:00:00Z');
const NEUSTART_LOCAL_KEY = 'seelenstein.neustart';
const PW_MIN = 8;
const PW_MAX = 64;

// --- 1a. Gerät: einmal alles Spielbezogene löschen ----------------------------------------------------------------
(() => {
  try {
    if (localStorage.getItem(NEUSTART_LOCAL_KEY) === NEUSTART_ID) return;
    for (const k of ['seelenstein.charaktere.v2', 'seelenstein.spielstand.v1', 'seelenstein.kontolager.v1', 'seelenstein.instsperre',
      'seelenstein.sozial', 'seelenstein.rangliste', 'seelenstein.dmeter.daten']) localStorage.removeItem(k);
    localStorage.setItem(NEUSTART_LOCAL_KEY, NEUSTART_ID);
  } catch (e) { /* privat: nichts gespeichert, nichts zu löschen */ }
})();

// --- 1b. Konto auf dem Server leeren (vor dem ersten Abgleich mit dieser Version) ----------------------------------
async function neustartKonto(uid, token) {
  if (typeof kldDb !== 'function') return;
  // reservierte Charakternamen freigeben, eigene Angebote zurückziehen
  try {
    const names = await kldOwnNames(uid, token);
    for (const k of names) await kldDb('DELETE', 'namen/' + k, token);
  } catch (e) { /* nicht schlimm: Namen werden beim nächsten Anlegen neu geprüft */ }
  try { await kldAuctions(uid, token, account.name || ''); } catch (e) { /* weiter */ }
  const patch = {};
  for (let k = 0; k < (typeof KLD_RANK_SLOTS !== 'undefined' ? KLD_RANK_SLOTS : 8); k++) patch[`rangliste/${uid}_${k}`] = null;
  await kldDb('PATCH', '', token, { body: patch });
  // Pfade ohne Regel lehnt der Server ab – dort lag dann auch nie etwas
  for (const p of ['lager/' + uid, 'post/' + uid]) await kldDb('DELETE', p, token);
}

// --- 2. Passwortregeln ----------------------------------------------------------------------------------------------
function pwFehler(pass) {
  const p = String(pass || '');
  const fehlt = [];
  if (p.length < PW_MIN) fehlt.push(`mindestens ${PW_MIN} Zeichen`);
  if (!/[A-ZÄÖÜ]/.test(p)) fehlt.push('einen Großbuchstaben');
  if (!/[a-zäöüß]/.test(p)) fehlt.push('einen Kleinbuchstaben');
  if (!/[0-9]/.test(p)) fehlt.push('eine Zahl');
  if (!/[^A-Za-zÄÖÜäöüß0-9]/.test(p) || /\s/.test(p)) fehlt.push(/\s/.test(p) ? 'keine Leerzeichen' : 'ein Sonderzeichen (z. B. . , ! ? # -)');
  if (p.length > PW_MAX) return `Das Passwort darf höchstens ${PW_MAX} Zeichen haben.`;
  if (!fehlt.length) return '';
  return 'Das Passwort braucht ' + (fehlt.length > 1 ? fehlt.slice(0, -1).join(', ') + ' und ' + fehlt[fehlt.length - 1] : fehlt[0]) + '.';
}
const PW_HINWEIS = `Mind. ${PW_MIN} Zeichen mit Groß- und Kleinbuchstaben, Zahl und Sonderzeichen (z. B. . , ! ?)`;

// Stärke für die Anzeige beim Eintippen (0–4)
function pwStaerke(pass) {
  const p = String(pass || '');
  let s = 0;
  if (p.length >= PW_MIN) s++;
  if (/[A-ZÄÖÜ]/.test(p) && /[a-zäöüß]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-zÄÖÜäöüß0-9\s]/.test(p)) s++;
  return s;
}

const pwPflicht = () => !!(typeof accountOn === 'function' && accountOn() && account.pwNeu !== NEUSTART_ID && account.pwGeprueft);

// Neues Passwort setzen: frisch mit dem alten anmelden, dann ändern (Firebase verlangt eine frische Anmeldung)
async function pwAendern(alt, neu) {
  const fehler = pwFehler(neu);
  if (fehler) throw new Error(fehler);
  if (alt === neu) throw new Error('Das neue Passwort muss sich vom alten unterscheiden.');
  const base = typeof kldAuthBase === 'function' ? kldAuthBase() : 'https://identitytoolkit.googleapis.com';
  const key = cloudCfg().apiKey;
  let r = await fetch(`${base}/v1/accounts:signInWithPassword?key=${key}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: accountEmail(account.name), password: alt, returnSecureToken: true })
  });
  let d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(/INVALID|NOT_FOUND/.test((d.error && d.error.message) || '') ? 'Das bisherige Passwort stimmt nicht.' : accountError(d.error && d.error.message));
  r = await fetch(`${base}/v1/accounts:update?key=${key}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: d.idToken, password: neu, returnSecureToken: true })
  });
  d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(accountError(d.error && d.error.message));
  accountSession(account.name, d.localId || account.uid, d.idToken, d.refreshToken, d.expiresIn);
  account.pwNeu = NEUSTART_ID;
  account.dirty = true;
  await cloudPush();
}

// Dialog: neues Passwort (Pflicht vor dem Spielen; altes = schon bekannt nach dem Anmelden)
function pwDialog(altBekannt) {
  if (typeof ssDialog !== 'function' || !accountOn()) return;
  const dlg = ssDialog(
    `<h3 class="ss-title">Neues Passwort festlegen</h3>` +
    `<p>Seelenstein ist offiziell gestartet. Zum Schutz deines Kontos braucht jedes Konto jetzt ein <b>sicheres Passwort</b>. ` +
    `Dein Konto <b class="no-tr">${escapeHtml(account.name || '')}</b> bleibt erhalten – bitte wähle ein neues Passwort, dann geht es los.</p>` +
    `<ul class="ss-list pw-regeln"><li data-r="len">mindestens ${PW_MIN} Zeichen</li><li data-r="case">Groß- und Kleinbuchstaben</li><li data-r="num">mindestens eine Zahl</li><li data-r="sym">mindestens ein Sonderzeichen (z. B. . , ! ? # -)</li></ul>` +
    (altBekannt ? '' : `<label class="ss-field"><span>Bisheriges Passwort</span><input id="pwAlt" type="password" maxlength="${PW_MAX}" autocomplete="current-password"></label>`) +
    `<label class="ss-field"><span>Neues Passwort</span><input id="pwNeu" type="password" maxlength="${PW_MAX}" autocomplete="new-password"></label>` +
    `<div class="pw-bar" aria-hidden="true"><i></i></div>` +
    `<label class="ss-field"><span>Neues Passwort wiederholen</span><input id="pwNeu2" type="password" maxlength="${PW_MAX}" autocomplete="new-password"></label>` +
    `<p id="pwMsg" class="ss-msg" hidden></p>` +
    `<div class="ss-btns"><button type="button" class="btn btn-primary" id="pwGo" disabled>Passwort speichern</button><button type="button" class="btn btn-ghost" id="pwOut">Abmelden</button></div>`, 'pw-dlg');
  dlg.dataset.busy = '1'; // nicht wegklickbar: ohne neues Passwort kein Spiel
  const q = (s) => dlg.querySelector(s);
  const alt = q('#pwAlt');
  const neu = q('#pwNeu');
  const neu2 = q('#pwNeu2');
  const go = q('#pwGo');
  const msg = q('#pwMsg');
  const check = () => {
    const p = neu.value;
    const ok = { len: p.length >= PW_MIN, case: /[A-ZÄÖÜ]/.test(p) && /[a-zäöüß]/.test(p), num: /[0-9]/.test(p), sym: /[^A-Za-zÄÖÜäöüß0-9\s]/.test(p) };
    dlg.querySelectorAll('.pw-regeln li').forEach((li) => li.classList.toggle('ok', !!ok[li.dataset.r]));
    const s = pwStaerke(p);
    const bar = q('.pw-bar i');
    bar.style.width = (s * 25) + '%';
    bar.style.background = ['#c0392b', '#c0392b', '#e08a2a', '#d8c040', '#4caf50'][s];
    go.disabled = !!pwFehler(p) || p !== neu2.value || (alt && !alt.value);
  };
  [alt, neu, neu2].forEach((x) => x && x.addEventListener('input', check));
  (alt || neu).focus();
  go.addEventListener('click', async () => {
    if (go.disabled) return;
    dlg.querySelectorAll('button, input').forEach((x) => { x.disabled = true; });
    msg.hidden = false;
    msg.classList.remove('err');
    msg.textContent = 'Speichere …';
    try {
      await pwAendern(alt ? alt.value : altBekannt, neu.value);
      msg.classList.add('ok');
      msg.textContent = 'Neues Passwort gespeichert. Viel Spaß!';
      setTimeout(() => { delete dlg.dataset.busy; ssDialogClose(); if (typeof ui !== 'undefined' && !game.running) ui.showStart(); }, 900);
    } catch (e) {
      msg.classList.add('err');
      msg.textContent = e.message;
      dlg.querySelectorAll('button, input').forEach((x) => { x.disabled = false; });
      check();
    }
  });
  q('#pwOut').addEventListener('click', async () => {
    delete dlg.dataset.busy;
    ssDialogClose();
    await accountLogout();
    if (typeof ui !== 'undefined') ui.showStart();
  });
}
