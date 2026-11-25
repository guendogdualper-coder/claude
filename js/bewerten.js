// Bewerten und Feedback: Wer schon eine Weile spielt und noch nicht bewertet oder Feedback gegeben hat, bekommt einmal
// einen kleinen Hinweis mit zwei Knöpfen. Außerdem gibt es beide Wege jederzeit unter Einstellungen → Konto.
//
// - „Bewerten“ öffnet die Store-Seite der App, aus der gerade gespielt wird: iPhone/iPad → App Store, Android-App →
//   Google Play, Windows-App (Desktop-App bzw. Store-PWA) → Microsoft Store. Im normalen Browser gibt es den Knopf
//   nicht (dort kann man nicht bewerten). Für das Bewerten gibt es KEINE Belohnung (Richtlinien von Apple und Google:
//   Bewertungen dürfen nicht belohnt werden) – der Hinweis nennt auch keine.
// - „Feedback senden“: Formular im Spiel (Art Fehler/Wunsch/Lob, freiwillig 1–5 Sterne, Text 10–1000 Zeichen). Geht
//   nur mit Konto, wie das Melden (spielerschutz.js): Es schreibt nach feedback/<uid>/<id> und im selben Schreibvorgang
//   die Serverzeit nach feedbackzeit/<uid>. Die Regeln (docs/firebase-regeln.json) erlauben nur eigene, neue Einträge,
//   prüfen Felder und Längen und höchstens ein Feedback je 10 Minuten; lesen kann nur der Betreiber (Firebase-Konsole).
//   Als Dank einmal je Charakter ein paar Tränke und eine Segensschriftrolle (p.feedbackDank, FEEDBACK_DANK).
// - Hinweis (BEWERTEN_HINWEIS): ab Stufe 10 und 3 Stunden Spielzeit des Charakters, nur in einer Stadt, ohne Kampf, ohne
//   offenes Fenster, frühestens 3 Minuten nach dem Einloggen; danach frühestens wieder nach 4 Tagen, höchstens dreimal.
//   Nie wieder nach „Bewerten“, nach gesendetem Feedback oder „Nicht mehr fragen“. Gemerkt auf dem Gerät.

// ► Store-Seiten. Android und Windows aus android/twa-manifest.json (packageId) und docs/microsoft-store/.
//   Die Apple-ID der iPhone-App (eine Zahl, App Store Connect → App → App-Informationen → „Apple-ID“) steht noch nirgends
//   im Repo: Bis sie hier eingetragen ist, zeigt die iPhone/iPad-App keinen „Bewerten“-Knopf (Feedback geht trotzdem).
const BEWERTEN = {
  appStoreId: '', // z. B. '6740000000'
  android: 'https://play.google.com/store/apps/details?id=de.seelenstein.spiel',
  windows: 'https://apps.microsoft.com/detail/9PH1C6WDZMK3'
};
const BEWERTEN_HINWEIS = { stufe: 10, stunden: 3, abstandTage: 4, maxMal: 3, ruhe: 20, sitzungSek: 180 };
const FEEDBACK = { min: 10, max: 1000, abstand: 10 * 60 * 1000 };
const FEEDBACK_ARTEN = [['fehler', '🐞', 'Fehler'], ['wunsch', '💡', 'Wunsch'], ['lob', '❤', 'Lob']];
const FEEDBACK_DANK = { potions: 5, scrolls: 1 };
const BEWERTEN_KEY = 'seelenstein.bewerten';
const FEEDBACK_ZEIT_KEY = 'seelenstein.feedbackzeit';
const STORE_NAMEN = { ios: 'App Store', android: 'Google Play', windows: 'Microsoft Store' };
const STORE_ORT = { ios: 'im App Store', android: 'bei Google Play', windows: 'im Microsoft Store' };

if (typeof SAVE_FIELDS !== 'undefined' && !SAVE_FIELDS.includes('feedbackDank')) SAVE_FIELDS.push('feedbackDank');

// --- Wo läuft das Spiel? -------------------------------------------------------------------------------------------
// Erkennung wie in sozial-freischalten.js: Capacitor (iPhone/iPad), ?quelle=play bzw. Referrer android-app:// (TWA),
// Electron im User-Agent oder Store-PWA (Windows). Bleibt für die Sitzung gemerkt (Neuladen ohne ?quelle).
let bwPlattformCache = null;
function bewertenPlattform() {
  if (bwPlattformCache) return bwPlattformCache;
  let pf = 'web';
  try {
    const cap = window.Capacitor;
    const q = new URLSearchParams(location.search).get('quelle');
    if (cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) pf = typeof cap.getPlatform === 'function' && cap.getPlatform() === 'android' ? 'android' : 'ios';
    else if (q === 'ios') pf = 'ios';
    else if (q === 'play' || String(document.referrer || '').startsWith('android-app://')) pf = 'android';
    else if (/Electron\//.test(navigator.userAgent || '') || q === 'desktop' || q === 'msstore' || (typeof MS_STORE_PWA !== 'undefined' && MS_STORE_PWA)) pf = 'windows';
    if (pf === 'web') pf = sessionStorage.getItem('seelenstein.plattform') || 'web';
    else sessionStorage.setItem('seelenstein.plattform', pf);
  } catch (e) { /* privat */ }
  bwPlattformCache = pf;
  return pf;
}
// Adresse der Store-Seite zum Bewerten ('' = kein Knopf)
function bewertenLink() {
  const pf = bewertenPlattform();
  if (pf === 'ios') return /^\d{6,12}$/.test(String(BEWERTEN.appStoreId || '')) ? `https://apps.apple.com/app/id${BEWERTEN.appStoreId}?action=write-review` : '';
  if (pf === 'android') return BEWERTEN.android || '';
  if (pf === 'windows') return BEWERTEN.windows || '';
  return '';
}
const bewertenStore = () => STORE_NAMEN[bewertenPlattform()] || 'Store';
const bewertenStoreOrt = () => STORE_ORT[bewertenPlattform()] || 'im Store'; // „im App Store“, „bei Google Play“

// --- Gemerkter Stand (Gerät) ---------------------------------------------------------------------------------------
// { bewertet, feedback, nie, zuletzt, mal }
function bwStand() {
  try { return JSON.parse(localStorage.getItem(BEWERTEN_KEY) || '{}') || {}; } catch (e) { return {}; }
}
function bwMerken(neu) {
  const s = Object.assign(bwStand(), neu);
  try { localStorage.setItem(BEWERTEN_KEY, JSON.stringify(s)); } catch (e) { /* privat */ }
  return s;
}

// Store-Seite öffnen (keine Belohnung!)
function bewertenOeffnen() {
  const url = bewertenLink();
  if (!url) return false;
  if (typeof externOeffnen === 'function') externOeffnen(url);
  else { try { window.open(url, '_blank', 'noopener'); } catch (e) { /* egal */ } }
  bwMerken({ bewertet: Date.now() });
  if (typeof ui !== 'undefined' && ui.log) ui.log(`Danke, dass du Seelenstein ${bewertenStoreOrt()} bewertest!`, 'level');
  return true;
}

// --- Hinweis -------------------------------------------------------------------------------------------------------
const bwStart = Date.now();
function bewertenFaellig() {
  if (typeof game === 'undefined' || !game.running || !game.player) return false;
  const p = game.player;
  const H = BEWERTEN_HINWEIS;
  const s = bwStand();
  if (s.nie || s.bewertet || s.feedback || (s.mal || 0) >= H.maxMal) return false;
  if (Date.now() - (s.zuletzt || 0) < H.abstandTage * 86400000) return false;
  if ((p.level || 0) < H.stufe || (p.playTime || 0) < H.stunden * 3600) return false;
  if (Date.now() - bwStart < H.sitzungSek * 1000) return false;
  // nicht im Kampf: tot, gerade getroffen/angegriffen, verfolgt, im Handel
  if (p.dead || p.__chased || game.time - (p.lastCombat == null ? -99 : p.lastCombat) < H.ruhe || game.trade) return false;
  // nur in einer Stadt (sichere Fläche)
  try { const z = typeof zoneAt === 'function' ? zoneAt(p.x, p.y) : null; if (!z || !z.safe) return false; } catch (e) { return false; }
  // nichts anderes offen, niemand tippt gerade
  if (typeof ui !== 'undefined' && ui.anyPanelOpen && ui.anyPanelOpen()) return false;
  if (document.getElementById('ssDialog') || document.querySelector('.nativ-frage')) return false;
  const a = document.activeElement;
  if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) return false;
  if (document.hidden) return false;
  return true;
}
function bewertenPruefen() {
  try { if (bewertenFaellig()) bewertenHinweis(); } catch (e) { /* nie das Spiel stören */ }
}
setInterval(bewertenPruefen, 15000);

function bewertenHinweis() {
  if (typeof ssDialog !== 'function') return;
  const s = bwStand();
  bwMerken({ zuletzt: Date.now(), mal: (s.mal || 0) + 1 });
  const link = bewertenLink();
  const dlg = ssDialog(
    `<h3 class="ss-title">Gefällt dir Seelenstein?</h3>` +
    `<p>Du bist schon eine ganze Weile dabei – danke! Seelenstein entsteht in einem ganz kleinen Team, und jede Rückmeldung hilft uns, das Spiel besser zu machen.</p>` +
    (link ? `<p>Wenn es dir gefällt, freuen wir uns über eine Bewertung ${bewertenStoreOrt()}. Hast du einen Fehler gefunden oder einen Wunsch, schreib uns direkt im Spiel.</p>`
      : `<p>Hast du einen Fehler gefunden, einen Wunsch oder einfach Lob? Schreib uns direkt im Spiel.</p>`) +
    `<div class="ss-btns bw-knoepfe">` +
    (link ? `<button type="button" class="btn btn-primary" data-bw="bewerten">⭐ Bewerten</button>` : '') +
    `<button type="button" class="btn ${link ? 'btn-ghost' : 'btn-primary'}" data-bw="feedback">✉ Feedback senden</button></div>` +
    `<p class="bw-unten"><button type="button" class="bw-link" data-bw="spaeter">Später</button><span aria-hidden="true">·</span>` +
    `<button type="button" class="bw-link" data-bw="nie">Nicht mehr fragen</button></p>`, 'bw-dlg');
  dlg.querySelectorAll('[data-bw]').forEach((b) => b.addEventListener('click', () => {
    const was = b.dataset.bw;
    ssDialogClose();
    if (was === 'bewerten') bewertenOeffnen();
    else if (was === 'feedback') openFeedback();
    else if (was === 'nie') bwMerken({ nie: true });
  }));
}

// --- Feedback-Formular ---------------------------------------------------------------------------------------------
const feedbackOn = () => typeof handelOn === 'function' && handelOn() && typeof hdb !== 'undefined';
function feedbackWait() {
  let last = 0;
  try { last = Number(localStorage.getItem(FEEDBACK_ZEIT_KEY)) || 0; } catch (e) { /* privat */ }
  last = Math.max(last, feedbackWait.mem || 0);
  return Math.max(0, FEEDBACK.abstand - (Date.now() - last));
}
// Dank noch offen? (einmal je Charakter)
const feedbackDankOffen = (p = game.player) => !!p && !p.feedbackDank;
function feedbackDankText(p = game.player) {
  const sz = potionSizeFor(p ? p.level : 1).id;
  return `${FEEDBACK_DANK.potions} × ${potionInfo('hp').name}, ${FEEDBACK_DANK.potions} × ${potionInfo('mp').name} (${sz}) und ${FEEDBACK_DANK.scrolls} × ${BLESSING.name}`;
}
// Gerät, Ansicht und Bildschirm (hilft bei Fehlern)
function feedbackGeraet() {
  const pf = bewertenPlattform();
  const view = typeof opts !== 'undefined' && opts.view ? String(opts.view).toUpperCase() : '';
  const ua = String(navigator.userAgent || '').replace(/\s+/g, ' ');
  return [pf === 'web' ? 'Browser' : pf + '-App', view, `${window.innerWidth}×${window.innerHeight}`, ua].filter(Boolean).join(' · ').slice(0, 160);
}

function openFeedback() {
  if (typeof ssDialog !== 'function') return;
  if (!feedbackOn()) {
    const ready = typeof cloudReady === 'function' && cloudReady();
    ssDialog(`<h3 class="ss-title">Feedback senden</h3>` +
      `<p>${ready ? 'Feedback geht nur mit Konto. Melde dich auf dem Startbildschirm an (Einstellungen → „Figur und Spiel“ → „Charakter wechseln“) und schick uns dann deine Nachricht direkt aus dem Spiel.'
        : 'Auf diesem Spiel sind keine Konten eingerichtet, deshalb geht Feedback hier nicht.'}</p>` +
      `<div class="ss-btns"><button type="button" class="btn btn-primary" data-dlg-close>OK</button></div>`, 'ss-small');
    return;
  }
  const p = game.player;
  const dank = feedbackDankOffen(p);
  const dlg = ssDialog(
    `<h3 class="ss-title">Feedback senden</h3>` +
    `<fieldset class="ss-reasons bw-arten"><legend>Worum geht es?</legend>` +
    FEEDBACK_ARTEN.map(([id, ico, label], i) => `<label><input type="radio" name="bwArt" value="${id}"${i === 0 ? ' checked' : ''}><span>${ico} ${label}</span></label>`).join('') +
    `</fieldset>` +
    `<div class="bw-sterne-zeile"><span>Wie gefällt dir das Spiel? <small>(freiwillig)</small></span><span class="bw-sterne" role="radiogroup">` +
    [1, 2, 3, 4, 5].map((n) => `<button type="button" class="bw-stern" data-stern="${n}" role="radio" aria-checked="false" aria-label="${n} ${n === 1 ? 'Stern' : 'Sterne'}">★</button>`).join('') +
    `</span></div>` +
    `<label class="ss-field"><span>Deine Nachricht <small>(mindestens ${FEEDBACK.min} Zeichen)</small></span>` +
    `<textarea id="bwText" maxlength="${FEEDBACK.max}" rows="4" placeholder="Was ist dir aufgefallen? Was wünschst du dir?"></textarea><small class="bw-zahl" id="bwZahl">0/${FEEDBACK.max}</small></label>` +
    `<p class="hint-text">Mitgeschickt werden: dein Konto- und Charaktername, Klasse und Stufe, Gerät (App oder Browser, Bildschirm, 2D/3D) und Spielversion. Lesen kann das nur der Betreiber.</p>` +
    (dank ? `<p class="bw-dank">🎁 Als Dankeschön: ${feedbackDankText(p)} – einmal je Charakter.</p>` : '') +
    `<p id="bwMsg" class="ss-msg" hidden></p>` +
    `<div class="ss-btns"><button type="button" class="btn btn-primary" id="bwSend">Feedback senden</button><button type="button" class="btn btn-ghost" data-dlg-close>Abbrechen</button></div>`, 'bw-dlg');
  let sterne = 0;
  const sternKnoepfe = [...dlg.querySelectorAll('.bw-stern')];
  sternKnoepfe.forEach((b) => b.addEventListener('click', () => {
    const n = Number(b.dataset.stern);
    sterne = sterne === n ? 0 : n; // nochmal tippen nimmt die Sterne weg
    sternKnoepfe.forEach((x) => { const an = Number(x.dataset.stern) <= sterne; x.classList.toggle('an', an); x.setAttribute('aria-checked', String(Number(x.dataset.stern) === sterne)); });
  }));
  const text = dlg.querySelector('#bwText');
  const zahl = dlg.querySelector('#bwZahl');
  text.addEventListener('input', () => { zahl.textContent = `${text.value.length}/${FEEDBACK.max}`; });
  const msg = dlg.querySelector('#bwMsg');
  const send = dlg.querySelector('#bwSend');
  const show = (t, ok) => { msg.hidden = false; msg.textContent = t; msg.classList.toggle('ok', !!ok); };
  send.addEventListener('click', async () => {
    if (send.disabled) return;
    const wait = feedbackWait();
    if (wait > 0) { show(`Bitte warte noch ${Math.ceil(wait / 60000)} ${Math.ceil(wait / 60000) === 1 ? 'Minute' : 'Minuten'} bis zum nächsten Feedback.`); return; }
    const t = text.value.trim().slice(0, FEEDBACK.max);
    if (t.replace(/\s/g, '').length < FEEDBACK.min) { show(`Schreib bitte mindestens ${FEEDBACK.min} Zeichen.`); text.focus(); return; }
    const art = (dlg.querySelector('input[name="bwArt"]:checked') || {}).value || 'wunsch';
    send.disabled = true;
    dlg.dataset.busy = '1';
    show('Wird gesendet …', true);
    const rec = {
      von: String(account.name || '').slice(0, 40), figur: game.player ? String(game.player.name).slice(0, 40) : '',
      klasse: game.player ? String(game.player.classId).slice(0, 20) : '', stufe: game.player ? Math.max(1, Math.min(80, game.player.level | 0)) : 1,
      art, text: t, geraet: feedbackGeraet(),
      version: String(typeof GAME_VERSION !== 'undefined' ? GAME_VERSION : '').slice(0, 20), zeit: { '.sv': 'timestamp' }
    };
    if (sterne) rec.sterne = sterne;
    try {
      await hdb.patch('', { [`feedback/${account.uid}/f${handelId()}`]: rec, [`feedbackzeit/${account.uid}`]: { '.sv': 'timestamp' } });
    } catch (e) {
      delete dlg.dataset.busy;
      send.disabled = false;
      show(e && e.code === 'regeln' ? 'Der Server hat das Feedback abgelehnt. Hast du gerade schon eins geschickt? Dann bitte ein paar Minuten warten.' : hdbMsg(e));
      return;
    }
    feedbackWait.mem = Date.now();
    try { localStorage.setItem(FEEDBACK_ZEIT_KEY, String(feedbackWait.mem)); } catch (e) { /* privat */ }
    bwMerken({ feedback: Date.now() });
    delete dlg.dataset.busy;
    const belohnt = feedbackBelohnen();
    dlg.querySelector('.ss-dlg-box').innerHTML = `<h3 class="ss-title">Danke für dein Feedback!</h3>` +
      `<p>Wir lesen jede Nachricht. Antworten können wir im Spiel leider nicht – aber was du schreibst, fließt in die nächsten Updates ein.</p>` +
      (belohnt ? `<p class="bw-dank">🎁 Als Dankeschön hast du bekommen: ${belohnt}.</p>` : '') +
      (bewertenLink() && !bwStand().bewertet ? `<p class="hint-text">Gefällt dir das Spiel? Eine Bewertung ${bewertenStoreOrt()} hilft uns sehr.</p>` : '') +
      `<div class="ss-btns">${bewertenLink() && !bwStand().bewertet ? '<button type="button" class="btn btn-ghost" data-bw="bewerten">⭐ Bewerten</button>' : ''}` +
      `<button type="button" class="btn btn-primary" data-dlg-close>OK</button></div>`;
    dlg.querySelector('[data-dlg-close]').addEventListener('click', ssDialogClose);
    const bw = dlg.querySelector('[data-bw="bewerten"]');
    if (bw) bw.addEventListener('click', () => { ssDialogClose(); bewertenOeffnen(); });
  });
  text.focus();
}

// Dank für das Feedback: einmal je Charakter (gespeichert in p.feedbackDank). Rückgabe: Text oder ''
function feedbackBelohnen() {
  const p = game.player;
  if (!feedbackDankOffen(p)) return '';
  const sz = potionSizeFor(p.level).id;
  for (const k of ['hp', 'mp']) {
    p.potions[potKey(k, sz)] = (p.potions[potKey(k, sz)] || 0) + FEEDBACK_DANK.potions;
    if (ui.loot) ui.loot(`${potionInfo(k).name} ${sz}`, FEEDBACK_DANK.potions, potionIconUrl(k, sz), potionInfo(k).color);
  }
  p.scrolls = (p.scrolls || 0) + FEEDBACK_DANK.scrolls;
  if (ui.loot) ui.loot(BLESSING.name, FEEDBACK_DANK.scrolls, scrollIconUrl(), '#ffe08a');
  p.feedbackDank = Date.now();
  const text = feedbackDankText(p);
  ui.log(`Danke für dein Feedback! Dafür bekommst du ${text}.`, 'level');
  if (typeof saveGame === 'function') saveGame();
  return text;
}

// --- Einstellungen → Konto: Abschnitt „Feedback und Bewertung“ (spielerschutz.js legalOptionsHtml) ----------------
function bewertenOptionenHtml() {
  const link = bewertenLink();
  return `<section class="opt-group"><h3>Feedback und Bewertung</h3>` +
    `<div class="opt-row"><div class="opt-text"><strong>Feedback senden</strong><small>Fehler, Wünsche oder Lob direkt an uns (mit Konto).` +
    (game.player && feedbackDankOffen(game.player) ? ' Als Dankeschön gibt es einmal je Charakter ein paar Tränke und eine Segensschriftrolle.' : '') + `</small></div>` +
    `<button type="button" class="btn btn-ghost" data-bw-opt="feedback">✉ Feedback senden</button></div>` +
    (link ? `<div class="opt-row"><div class="opt-text"><strong>Spiel bewerten</strong><small>Öffnet Seelenstein ${bewertenStoreOrt()}.</small></div>` +
      `<button type="button" class="btn btn-ghost" data-bw-opt="bewerten">⭐ Bewerten</button></div>` : '') +
    `</section>`;
}
if (typeof legalOptionsHtml === 'function' && typeof wireLegalOptions === 'function') {
  const htmlAlt = legalOptionsHtml;
  const wireAlt = wireLegalOptions;
  legalOptionsHtml = function () { return htmlAlt.apply(this, arguments) + bewertenOptionenHtml(); };
  wireLegalOptions = function (body) {
    const r = wireAlt.apply(this, arguments);
    if (body) {
      body.querySelectorAll('[data-bw-opt]').forEach((b) => b.addEventListener('click', () => {
        if (b.dataset.bwOpt === 'bewerten') bewertenOeffnen();
        else openFeedback();
      }));
    }
    return r;
  };
}

(function bewertenCss() {
  const css = document.createElement('style');
  css.textContent =
    '.bw-dlg .bw-knoepfe { justify-content: center; }' +
    '.bw-unten { display: flex; justify-content: center; align-items: center; gap: 8px; margin: 10px 0 0 !important; font-size: 13px; color: var(--muted, #a8997c); }' +
    '.bw-link { background: none; border: 0; padding: 4px 2px; color: var(--muted, #a8997c); font: inherit; text-decoration: underline; cursor: pointer; }' +
    '.bw-link:hover { color: #f3e2b0; }' +
    '.bw-arten { grid-template-columns: repeat(3, auto); justify-content: start; column-gap: 14px; }' +
    '.bw-sterne-zeile { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px 10px; margin: 0 0 8px; font-size: 13px; color: var(--muted, #a8997c); }' +
    '.bw-sterne { display: inline-flex; gap: 2px; }' +
    '.bw-stern { width: 34px; height: 34px; padding: 0; border: 0; background: none; font-size: 26px; line-height: 1; color: #5a4a30; cursor: pointer; }' +
    '.bw-stern.an { color: #ffd34d; text-shadow: 0 0 8px rgba(255, 211, 77, 0.6); }' +
    '.bw-zahl { align-self: flex-end; font-size: 11px; }' +
    '.bw-dank { padding: 6px 10px; border-radius: 8px; background: rgba(90, 140, 70, 0.22); color: #cdeeb0; font-size: 13px; }' +
    '@media (max-height: 480px) { .bw-dlg textarea { height: 62px; } .bw-dlg .hint-text { font-size: 11px; } .bw-dlg .ss-title { margin-bottom: 6px; } }';
  (document.head || document.documentElement).appendChild(css);
})();
