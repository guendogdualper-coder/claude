'use strict';
// Titelbildschirm (seit 15.46): Vor dem bisherigen Startbildschirm (#startScreen mit Konto und Charakteren) steht ein
// Schlüsselbild mit allen fünf Klassen, der Schriftzug „Seelenstein“ und drei Knöpfe:
//   Spielen            blendet den Titel aus, dahinter wartet der Startbildschirm (lädt nichts extra)
//   Einstellungen      das gewohnte Fenster (optionen.js) schon vor dem Einloggen: Grafik, Audio, Sprache, Steuerung …
//   Sprache · Language Liste aus LANGS (sprache.js) – neue Sprachen erscheinen von selbst; Umschalten über setLang
// Markup und Stil stehen in index.html (#titelScreen) und css/titel.css, damit der Titel sofort beim Öffnen da ist,
// während die Spieldateien noch laden. Diese Datei läuft direkt nach sprache.js (und den Wörterbüchern) und übersetzt
// den Titel gleich, damit kein deutscher Text aufblitzt.
// Der Titel kommt einmal je Sitzung: Wer „Spielen“ gedrückt hat, landet beim Neuladen (Sprache im Spiel umgestellt,
// Charakter wechseln, 2D/3D) direkt auf dem Startbildschirm. Neuer Tab oder neuer App-Start: wieder der Titel.
// Ohne Titel: Welt-Wächter (waechter.js) und automatische Tests (navigator.webdriver, außer mit
// localStorage „seelenstein.titelTest“ = „1“) – deren Abläufe klicken direkt auf den Startbildschirm.

const TITEL = { el: null, key: 'seelenstein.titelDurch', warte: 0 };

// Titel ohne die Wörterbücher des Spiels fertig übersetzen (i18nStart läuft erst nach allen Skripten)
function titelUebersetzen(root) {
  if (typeof i18n === 'undefined' || i18n.lang === 'de' || i18n.dict || typeof trTree !== 'function') return;
  const own = window.LANG_DATA && window.LANG_DATA[i18n.lang];
  if (!own) return;
  i18n.dict = i18n.lang === 'en' ? own : Object.assign({}, window.LANG_DATA.en || {}, own);
  try { trTree(root); } finally { i18n.dict = null; }
}

// Spiel bereit (Fenster, Optionen, Welt)? Sonst kurz warten und den Knopf als „lädt“ zeigen.
function titelBereit(btn, fn) {
  const ok = () => typeof game !== 'undefined' && game.world && typeof ui !== 'undefined' && typeof options !== 'undefined' && document.readyState !== 'loading';
  if (ok()) { fn(); return; }
  btn.classList.add('warte');
  clearInterval(TITEL.warte);
  TITEL.warte = setInterval(() => {
    if (!ok()) return;
    clearInterval(TITEL.warte);
    btn.classList.remove('warte');
    if (TITEL.el && !TITEL.el.classList.contains('zu')) fn();
  }, 150);
}

function titelOffen() {
  return !!TITEL.el && !TITEL.el.classList.contains('zu');
}

// „Spielen“: Titel weich ausblenden, dahinter steht der Startbildschirm
function titelZu() {
  const el = TITEL.el;
  if (!el || el.classList.contains('zu')) return;
  clearInterval(TITEL.warte);
  try { sessionStorage.setItem(TITEL.key, '1'); } catch (e) { /* privat */ }
  titelSprachen(false);
  if (typeof ui !== 'undefined' && typeof $ === 'function' && $('panelOpts') && !$('panelOpts').hidden) ui.closePanels();
  el.classList.add('zu');
  document.body.classList.remove('titel-offen');
  setTimeout(() => { el.hidden = true; }, 500);
}

function titelSprachen(open) {
  const box = document.getElementById('titelSprachen');
  if (!box) return;
  if (!open) {
    box.hidden = true;
    return;
  }
  const list = box.querySelector('.titel-sprachliste');
  list.innerHTML = '';
  for (const [code, name] of Object.entries(typeof LANGS !== 'undefined' ? LANGS : { de: 'Deutsch' })) {
    const b = document.createElement('button');
    b.type = 'button';
    b.lang = code;
    b.textContent = name;
    if (typeof i18n !== 'undefined' && i18n.lang === code) b.className = 'on';
    b.addEventListener('click', () => {
      if (typeof i18n !== 'undefined' && i18n.lang === code) { titelSprachen(false); return; }
      list.querySelectorAll('button').forEach((x) => { x.disabled = true; });
      b.classList.add('on');
      if (typeof setLang === 'function') setLang(code);
    });
    list.append(b);
  }
  box.hidden = false;
  const on = list.querySelector('.on') || list.querySelector('button');
  if (on) on.focus({ preventScroll: true });
}

(function titelStart() {
  const el = document.getElementById('titelScreen');
  if (!el) return;
  let weg = false;
  try { weg = sessionStorage.getItem(TITEL.key) === '1'; } catch (e) { /* privat */ }
  try { if (navigator.webdriver && localStorage.getItem('seelenstein.titelTest') !== '1') weg = true; } catch (e) { /* privat */ }
  if (typeof WAECHTER !== 'undefined' && WAECHTER) weg = true;
  if (weg) {
    el.remove();
    return;
  }
  TITEL.el = el;
  document.body.classList.add('titel-offen');
  // Bild: weich einblenden, sobald es geladen ist (bis dahin der dunkle Verlauf)
  const img = el.querySelector('.titel-bild img');
  const da = () => { if (img.naturalWidth) el.classList.add('bild-da'); };
  if (img) {
    if (img.complete) da();
    else img.addEventListener('load', da, { once: true });
  }
  // „Sprache · Language“: auf Englisch reicht ein Wort
  if (typeof i18n !== 'undefined' && i18n.lang === 'en') el.querySelectorAll('.t-en').forEach((x) => { x.hidden = true; });
  titelUebersetzen(el);

  const spielen = document.getElementById('titelSpielen');
  const optionen = document.getElementById('titelOptionen');
  const sprache = document.getElementById('titelSprache');
  spielen.addEventListener('click', titelZu);
  optionen.addEventListener('click', () => titelBereit(optionen, () => {
    if ($('panelOpts').hidden) ui.toggle('panelOpts');
  }));
  sprache.addEventListener('click', () => titelSprachen(true));
  const box = document.getElementById('titelSprachen');
  box.addEventListener('click', (e) => { if (e.target === box) titelSprachen(false); });
  box.querySelector('.titel-sprachen-zu').addEventListener('click', () => titelSprachen(false));
  // Tastatur: Esc schließt die Sprachwahl, Enter startet (wenn sonst nichts den Fokus hat)
  document.addEventListener('keydown', (e) => {
    if (!titelOffen()) return;
    if (e.key === 'Escape' && !box.hidden) {
      e.preventDefault();
      e.stopPropagation();
      titelSprachen(false);
      return;
    }
    const panelOpen = typeof $ === 'function' && $('panelOpts') && !$('panelOpts').hidden;
    if (e.key === 'Enter' && box.hidden && !panelOpen && (document.activeElement === document.body || !document.activeElement)) {
      e.preventDefault();
      titelZu();
    }
  }, true);
  // Versionsnummer, sobald spiel.js geladen ist
  document.addEventListener('DOMContentLoaded', () => {
    const v = el.querySelector('.titel-version .no-tr');
    if (v && typeof GAME_VERSION !== 'undefined') {
      v.textContent = GAME_VERSION;
      v.parentElement.hidden = false;
    }
  });
})();
