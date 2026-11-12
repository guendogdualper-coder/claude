// Seite III und IV der Tasche (seit 14.84): Seite I und II hat jeder Charakter. Seite III und IV schaltet frei, wer
// Seelenstein auf TikTok und Instagram folgt – dann für alle Charaktere des Kontos (ohne Konto: für alle Charaktere
// auf diesem Gerät). Ob man wirklich folgt, lässt sich nicht prüfen; es geht auf Vertrauen: Beide Knöpfe öffnen das
// Profil, wurden beide einmal angetippt, sind die Seiten frei.
//
// - Sind die beiden Profile unten leer, gibt es keine Sperre (alle vier Seiten frei, keine Knöpfe).
// - In den Store-Apps (iPhone/iPad über Capacitor, Android-App über Google Play, Windows-App aus dem Microsoft Store
//   bzw. die Desktop-App) gibt es keine Sperre (Richtlinien der App-Stores).
// - Was schon auf Seite III/IV liegt (alte Spielstände), bleibt dort: ansehen und herausnehmen geht (anlegen,
//   verkaufen, auf Seite I/II ziehen, ins Lager legen), Neues ablegen nicht. Neue Sachen (Beute, Kauf, Post, Handel,
//   Lager, Belohnungen) passen nur auf freie Plätze von Seite I und II (bagFree in ausruestung.js).
// - Gemerkt wird je Knopf (Zeitpunkt) im Gerät (localStorage) und mit Konto zusätzlich im Konto (konto.js, Feld
//   „sozial“ neben „blockiert“); beim Abgleich gilt, was eines von beiden schon kennt.

// ► Hier die beiden Profile eintragen (ganze Adresse oder nur der Name, z. B. '@seelenstein.online').
//   Beide leer = Sperre aus.
const SOZIAL_PROFILE = {
  tiktok: 'https://www.tiktok.com/@seelenstein.online',
  instagram: 'https://www.instagram.com/seelenstein.online/'
};
const SOZIAL_SEITEN_FREI = 2; // so viele Seiten hat jeder Charakter immer
const SOZIAL_KEY = 'seelenstein.sozial';
const SOZIAL_NAMEN = { tiktok: 'TikTok', instagram: 'Instagram' };

function sozialUrl(k) {
  const v = String((SOZIAL_PROFILE && SOZIAL_PROFILE[k]) || '').trim();
  if (!v) return '';
  if (/^https:\/\//i.test(v)) return v;
  const name = encodeURIComponent(v.replace(/^@/, ''));
  return k === 'tiktok' ? `https://www.tiktok.com/@${name}` : `https://www.instagram.com/${name}/`;
}

// Läuft das Spiel in einer Store-App? (dann keine Sperre). Erkennung wie an den anderen Stellen im Spiel:
// iPhone/iPad: Capacitor (nativ.js); Android: Trusted Web Activity startet mit ?quelle=play (android/twa-manifest.json)
// und Referrer android-app://; Windows: Electron im User-Agent (desktop/, optionen.js IS_DESKTOP_APP) oder die
// Store-PWA (konto.js MS_STORE_PWA). Die Quelle bleibt für die Sitzung gemerkt (Neuladen ohne ?quelle).
let sozialStoreCache = null;
function sozialStoreApp() {
  if (sozialStoreCache) return true;
  let ja = false;
  try {
    const cap = window.Capacitor;
    if (cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) ja = true;
    if (/Electron\//.test(navigator.userAgent || '')) ja = true;
    if (typeof MS_STORE_PWA !== 'undefined' && MS_STORE_PWA) ja = true;
    if (String(document.referrer || '').startsWith('android-app://')) ja = true;
    const q = new URLSearchParams(location.search).get('quelle');
    if (q === 'play' || q === 'ios' || q === 'desktop' || q === 'msstore') ja = true;
    if (ja) sessionStorage.setItem('seelenstein.storeapp', '1');
    else if (sessionStorage.getItem('seelenstein.storeapp') === '1') ja = true;
  } catch (e) { /* privat */ }
  if (ja) sozialStoreCache = true;
  return ja;
}

// Gibt es die Sperre überhaupt? (beide Profile eingetragen, keine Store-App)
const sozialSperreAn = () => !!(sozialUrl('tiktok') && sozialUrl('instagram')) && !sozialStoreApp();

function sozialStand() {
  try {
    const s = JSON.parse(localStorage.getItem(SOZIAL_KEY) || '{}') || {};
    return { tiktok: Number(s.tiktok) || 0, instagram: Number(s.instagram) || 0, at: Number(s.at) || 0 };
  } catch (e) { return { tiktok: 0, instagram: 0, at: 0 }; }
}
function sozialSchreiben(s) {
  try { localStorage.setItem(SOZIAL_KEY, JSON.stringify(s)); } catch (e) { /* privat */ }
}
const sozialFrei = () => { const s = sozialStand(); return !!(s.tiktok && s.instagram); };

// Wie viele Seiten der Tasche nutzbar sind (ausruestung.js bagOpenSlots)
function sozialOffeneSeiten() {
  return !sozialSperreAn() || sozialFrei() ? BAG_PAGES : Math.min(BAG_PAGES, SOZIAL_SEITEN_FREI);
}
const sozialSeiteGesperrt = (page) => page >= sozialOffeneSeiten();

// Konto (konto.js cloudPut/cloudExchange): als Text wie die Blockierliste
function sozialForCloud() {
  const s = sozialStand();
  return s.at ? JSON.stringify(s) : undefined;
}
function sozialFromCloud(raw) {
  if (typeof raw !== 'string') return;
  let r = null;
  try { r = JSON.parse(raw); } catch (e) { return; }
  if (!r || typeof r !== 'object') return;
  const s = sozialStand();
  const neu = {
    tiktok: s.tiktok || Number(r.tiktok) || 0,
    instagram: s.instagram || Number(r.instagram) || 0,
    at: Math.max(s.at, Number(r.at) || 0)
  };
  if (neu.tiktok === s.tiktok && neu.instagram === s.instagram) return;
  const vorher = sozialFrei();
  sozialSchreiben(neu);
  if (!vorher && sozialFrei()) sozialNeuZeichnen();
}

// Knopf angetippt: Profil öffnen (neuer Tab; als installierte Web-App öffnet das den Browser) und merken
function sozialFolgen(k) {
  const url = sozialUrl(k);
  if (!url) return;
  try { window.open(url, '_blank', 'noopener'); } catch (e) { /* Popup blockiert: zählt trotzdem */ }
  const s = sozialStand();
  const vorher = !!(s.tiktok && s.instagram);
  if (!s[k]) s[k] = Date.now();
  s.at = Date.now();
  sozialSchreiben(s);
  const jetzt = !!(s.tiktok && s.instagram);
  if (!vorher && jetzt) {
    if (typeof ui !== 'undefined' && ui.log) ui.log('Danke fürs Folgen! Seite III und IV deiner Tasche sind jetzt frei – für alle deine Charaktere.', 'level');
    if (typeof saveGame === 'function' && typeof game !== 'undefined' && game.running) saveGame();
    if (typeof cloudSoon === 'function' && typeof accountOn === 'function' && accountOn()) cloudSoon();
  }
  sozialNeuZeichnen();
}

// Offene Fenster mit der Tasche neu zeichnen
function sozialNeuZeichnen() {
  try {
    const inv = document.getElementById('panelInv');
    if (inv && !inv.hidden && typeof gear !== 'undefined' && gear.renderInventory && game.player) gear.renderInventory();
  } catch (e) { /* egal */ }
}

// --- Aussehen ------------------------------------------------------------------------------------------------------
// Eigene, einfache Zeichen in den Markenfarben (keine fremden Logo-Dateien)
const SOZIAL_GLYPHE = {
  tiktok: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="6" fill="#111"/>' +
    '<g fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M13.2 5.2v9.6a3 3 0 1 1-3-3M13.2 5.2c.5 2.2 2 3.6 4.2 3.8" stroke="#25f4ee" transform="translate(-0.9 -0.6)"/>' +
    '<path d="M13.2 5.2v9.6a3 3 0 1 1-3-3M13.2 5.2c.5 2.2 2 3.6 4.2 3.8" stroke="#fe2c55" transform="translate(0.9 0.6)"/>' +
    '<path d="M13.2 5.2v9.6a3 3 0 1 1-3-3M13.2 5.2c.5 2.2 2 3.6 4.2 3.8" stroke="#fff"/></g></svg>',
  instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="sozIgVerlauf" x1="0" y1="1" x2="1" y2="0">' +
    '<stop offset="0" stop-color="#feda75"/><stop offset=".35" stop-color="#fa7e1e"/><stop offset=".6" stop-color="#d62976"/>' +
    '<stop offset=".85" stop-color="#962fbf"/><stop offset="1" stop-color="#4f5bd5"/></linearGradient></defs>' +
    '<rect width="24" height="24" rx="6" fill="url(#sozIgVerlauf)"/>' +
    '<rect x="5" y="5" width="14" height="14" rx="4.2" fill="none" stroke="#fff" stroke-width="2"/>' +
    '<circle cx="12" cy="12" r="3.3" fill="none" stroke="#fff" stroke-width="2"/><circle cx="16.3" cy="7.7" r="1.1" fill="#fff"/></svg>'
};
const SOZIAL_SCHLOSS = '<svg class="soz-schloss" viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 7V5.2a3.5 3.5 0 0 1 7 0V7" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
  '<rect x="3" y="7" width="10" height="7.5" rx="1.6" fill="currentColor"/><circle cx="8" cy="10.4" r="1.2" fill="#1d1712"/></svg>';

// Kasten über dem Raster einer gesperrten Seite
function sozialHinweisHtml() {
  const s = sozialStand();
  const knopf = (k) => `<button type="button" class="soz-btn soz-${k}${s[k] ? ' done' : ''}" data-sozial="${k}">` +
    `${SOZIAL_GLYPHE[k]}<span>Auf ${SOZIAL_NAMEN[k]} folgen</span>${s[k] ? '<b class="soz-ok">✓</b>' : ''}</button>`;
  const offen = ['tiktok', 'instagram'].filter((k) => !s[k]).length;
  return `<div class="soz-box">${SOZIAL_SCHLOSS}<div class="soz-text"><b>Seite III und IV sind noch gesperrt.</b>` +
    `<span>Folge uns auf TikTok und Instagram und schalte Seite III und IV frei – für alle deine Charaktere.</span>` +
    `<small>${offen === 2 ? 'Was hier schon liegt, kannst du ansehen und herausnehmen.' : 'Noch ein Knopf, dann sind beide Seiten frei.'}</small></div>` +
    `<div class="soz-knoepfe">${knopf('tiktok')}${knopf('instagram')}</div></div>`;
}
function sozialVerdrahten(root) {
  if (!root) return;
  root.querySelectorAll('[data-sozial]').forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault();
    sozialFolgen(b.dataset.sozial);
  }));
}

(function sozialCss() {
  const css = document.createElement('style');
  css.textContent =
    '.soz-box { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin: 0 0 8px; padding: 9px 12px; border-radius: 8px;' +
    ' border: 1px solid var(--brass, #c9a35a); background: linear-gradient(#2b2117, #1a140e); box-shadow: inset 0 0 18px #0008; }' +
    '.soz-box > .soz-schloss { width: 26px; height: 26px; color: var(--brass, #c9a35a); flex: none; }' +
    '.soz-text { display: flex; flex-direction: column; gap: 2px; flex: 1 1 220px; min-width: 0; font-size: 13px; line-height: 1.35; }' +
    '.soz-text b { color: #ffe9a8; font-family: var(--font-display, serif); font-weight: 400; font-size: 15px; }' +
    '.soz-text small { color: var(--muted, #a8997c); font-size: 11px; }' +
    '.soz-knoepfe { display: flex; gap: 8px; flex-wrap: wrap; }' +
    '.soz-btn { display: inline-flex; align-items: center; gap: 7px; min-height: 36px; padding: 4px 12px 4px 5px; border-radius: 8px;' +
    ' border: 1px solid var(--brass-dim, #6e5a34); background: linear-gradient(#3a2d1d, #231a11); color: #f3e3b5; font: inherit;' +
    ' font-size: 13px; font-weight: 700; cursor: pointer; }' +
    '.soz-btn:hover { border-color: var(--brass, #c9a35a); color: #fff3cf; }' +
    '.soz-btn svg { width: 26px; height: 26px; flex: none; border-radius: 6px; }' +
    '.soz-btn.done { border-color: #5f8a4a; background: linear-gradient(#2a3320, #19200f); }' +
    '.soz-ok { color: #9fdc7a; font-size: 15px; }' +
    '.bag-tab.soz-zu { color: #8c7d63; }' +
    '.bag-tab .soz-schloss { width: 10px; height: 10px; margin-left: 2px; vertical-align: -1px; }' +
    '.item-tile.soz-platz { cursor: default; opacity: 0.55; background: repeating-linear-gradient(135deg, #17120d 0 6px, #1f1811 6px 12px); }' +
    '.item-tile.soz-platz .soz-schloss { width: 40%; height: 40%; color: #6e5a34; }';
  (document.head || document.documentElement).appendChild(css);
})();
