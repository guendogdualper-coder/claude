// Einstellungen (Zahnrad oben, Taste O): Ton und Lautstärke, Grafikstufe, Kamera, Bildschirmwackeln,
// Vibration, Schadenszahlen und Namen. Gespeichert im Browser, gilt für alle Figuren auf dem Gerät.
// Seit 13.62 in Reiter unterteilt (Grafik, Audio, Sprache, Steuerung, Tastenbelegung, Figur und Spiel).

const OPT_KEY = 'seelenstein.optionen';

// PC oder Handy? Maus/Touchpad als Hauptzeiger, Hover möglich und großer Bildschirm = PC.
// Auf dem PC startet das Spiel mit Ultra-Grafik.
const IS_PC = (() => {
  try {
    return matchMedia('(hover: hover) and (pointer: fine)').matches && !matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) >= 700;
  } catch (e) {
    return false;
  }
})();
const OPT_DEFAULTS = { view: '3d', volume: 0.7, music: true, musicVol: 0.5, graphics: IS_PC ? 'plus' : 'mittel', fps: IS_PC ? '60' : 'auto', camera: 'normal', fog: IS_PC ? 'wenig' : 'normal', shake: true, vibrate: true, numbers: true, names: true, selfBar: false, selfBarSize: 1, dmeter: false };

// Bildrate (seit 9.9): Auto = 60 Bilder/s, solange das Gerät es schafft, sonst gleichmäßig 30 (ruckelt nicht,
// spart Akku und hält das Handy kühler); 30 = immer Akku sparen
// seit 14.16 heißt „60“ „Max“: diese Stufe hatte nie eine Grenze, sie läuft so schnell wie der Bildschirm (60, 120, 144 Hz).
// Der Schlüssel bleibt '60', damit gespeicherte Einstellungen gelten.
const FPS_MODES = { auto: { label: 'Auto' }, 60: { label: 'Max' }, 30: { label: '30 (Akku)' } };

// Grafikstufen: Auflösung, Schlagschatten, Wolkenschatten, Menge an Partikeln.
// Ultra (für PC): volle Auflösung, scharfe große Schatten, weitere Sicht, schärfere Böden
const GRAPHICS = {
  // seit 14.11: Plus = Ultra mit Nachbearbeitung (grafik-plus.js: Leuchten, Farbstimmung, Randunschärfe, am PC Weltschatten)
  plus: { label: 'Plus', dpr: IS_PC ? 3 : 2, castShadows: true, clouds: true, particles: 1.25 },
  ultra: { label: 'Ultra', dpr: 3, castShadows: true, clouds: true, particles: 1.25 },
  hoch: { label: 'Hoch', dpr: 2, castShadows: true, clouds: true, particles: 1 },
  // seit 13.34 am Handy schärfer (2 statt 1,6): dafür läuft das Handy fest mit 30 Bildern pro Sekunde (frameCap)
  mittel: { label: 'Mittel', dpr: IS_PC ? 1.6 : 2, castShadows: true, clouds: false, particles: 0.7 },
  niedrig: { label: 'Niedrig', dpr: 1.25, castShadows: false, clouds: false, particles: 0.4 }
};
// Nebel (seit 14.17): wie weit man sieht. „Wenig“ schiebt den Nebel weit nach hinten und lädt dafür einen Ring
// Kartenblöcke mehr (v3UpdateChunks), damit kein Weltrand auftaucht. near/far = Faktor auf den Nebel der Gegend.
const FOG_MODES = { wenig: { label: 'Wenig', near: 1.7, far: 1.5, ring: 1 }, normal: { label: 'Normal', near: 1, far: 1, ring: 0 }, viel: { label: 'Viel', near: 0.8, far: 0.85, ring: 0 } };
const CAMERA = { nah: { label: 'Nah', zoom: 1.15 }, normal: { label: 'Normal', zoom: 1 }, weit: { label: 'Weit', zoom: 0.85 }, schulter: { label: 'Schulterblick', zoom: 1.25 } };

const opts = (() => {
  let o;
  try { o = { ...OPT_DEFAULTS, ...JSON.parse(localStorage.getItem(OPT_KEY) || '{}') }; } catch (e) { o = { ...OPT_DEFAULTS }; }
  // 9.9: Handys liefen auf „Hoch“ zu heiß – einmalig auf „Mittel“ (wer danach „Hoch“ wählt, behält es)
  if ((o.optsVer || 0) < 2) {
    if (!IS_PC && (o.graphics === 'hoch' || o.graphics === 'ultra')) o.graphics = 'mittel';
    o.optsVer = 2;
    try { localStorage.setItem(OPT_KEY, JSON.stringify(o)); } catch (e) { /* privat */ }
  }
  // 14.11: am PC einmalig von Ultra auf das neue Plus
  if ((o.optsVer || 0) < 3) {
    if (IS_PC && o.graphics === 'ultra') o.graphics = 'plus';
    o.optsVer = 3;
    try { localStorage.setItem(OPT_KEY, JSON.stringify(o)); } catch (e) { /* privat */ }
  }  // 14.17: neue Einstellung Nebel – am PC einmalig auf „Wenig“ (zu viel Dunst, vor allem mit Grafik Plus)
  if ((o.optsVer || 0) < 4) {
    if (!o.fog) o.fog = IS_PC ? 'wenig' : 'normal';
    o.optsVer = 4;
  }

  return o;
})();

const gfx = () => GRAPHICS[opts.graphics] || GRAPHICS.hoch;

function setOpt(key, value) {
  opts[key] = value;
  try { localStorage.setItem(OPT_KEY, JSON.stringify(opts)); } catch (e) { /* privat */ }
  applyOpts();
}

function applyOpts() {
  sfx.applyVolume();
  renderer.maxDpr = gfx().dpr;
  if (renderer.canvas) resizeRenderer();
  if (V3.on) v3ApplyGraphics();
}

// 2D oder 3D: braucht ein frisches Zeichenfeld, darum kurz neu laden (Spielstand bleibt)
const VIEWS = { '3d': { label: '3D' }, '2d': { label: '2D' } };
function switchView(v) {
  if (opts.view === v) return;
  setOpt('view', v);
  if (game.running) saveGame();
  location.reload();
}

// Vibration nur, wenn erlaubt und vom Gerät unterstützt
function buzz(pattern) {
  if (opts.vibrate && navigator.vibrate) navigator.vibrate(pattern);
}

// Vollbild (PC und Android; das iPhone kann es im Browser nicht – dort hilft „Zum Home-Bildschirm“)
const FS_OK = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
const isFullscreen = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
function toggleFullscreen() {
  const d = document;
  const el = d.documentElement;
  try {
    if (isFullscreen()) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    else {
      const r = (el.requestFullscreen || el.webkitRequestFullscreen).call(el, { navigationUI: 'hide' });
      if (r && r.catch) r.catch(() => {});
    }
  } catch (e) { /* nicht erlaubt */ }
}
for (const ev of ['fullscreenchange', 'webkitfullscreenchange']) {
  document.addEventListener(ev, () => { if (!$('panelOpts').hidden) options.render(); });
}

// Reiter der Einstellungen (seit 13.62): Jede Option gehört genau einer Kategorie an, angezeigt wird immer nur eine –
// am PC als Leiste links, am Handy als wischbare Leiste oben. Der zuletzt gewählte Reiter wird gemerkt.
const OPT_TABS = [
  { id: 'grafik', icon: '🖥', label: 'Grafik' },
  { id: 'audio', icon: '🔊', label: 'Audio' },
  { id: 'sprache', icon: '🌐', label: 'Sprache' },
  { id: 'steuerung', icon: '🎮', label: 'Steuerung' },
  { id: 'tasten', icon: '⌨', label: 'Tastenbelegung' },
  { id: 'spiel', icon: '🧩', label: 'Figur und Spiel' },
  // seit 13.77: Konto, blockierte Spieler, Datenschutz und Konto löschen (spielerschutz.js)
  { id: 'konto', icon: '👤', label: 'Konto' }
];
const OPT_TAB_KEY = 'seelenstein.optReiter';

const options = {
  // seit 13.62: gewählter Reiter (aus dem Browser, sonst Grafik)
  tab: (() => {
    let t = null;
    try { t = localStorage.getItem(OPT_TAB_KEY); } catch (e) { /* privat */ }
    return OPT_TABS.some((x) => x.id === t) ? t : OPT_TABS[0].id;
  })(),

  setTab(id) {
    if (!OPT_TABS.some((x) => x.id === id) || id === this.tab) return;
    this.tab = id;
    try { localStorage.setItem(OPT_TAB_KEY, id); } catch (e) { /* privat */ }
    // eine angefangene Tastenwahl gilt nur im Reiter Tastenbelegung
    if (keyCapture) keyCapture = null;
    this.render();
  },

  render() {
    const body = $('optsBody');
    const tab = this.tab;
    // seit 13.62: Bildlauf beim Neuzeichnen im selben Reiter behalten (z. B. nach einem Schalter weiter unten)
    const oldPane = body.querySelector('.opt-pane');
    const keepScroll = oldPane && oldPane.dataset.tab === tab ? oldPane.scrollTop : 0;
    const oldNav = body.querySelector('.opt-tabs');
    const keepNav = oldNav ? oldNav.scrollLeft : 0;
    const sw = (key, label, hint) => `<div class="opt-row"><div class="opt-text"><strong>${label}</strong>${hint ? `<small>${hint}</small>` : ''}</div>` +
      `<button type="button" class="opt-switch${opts[key] ? ' on' : ''}" data-sw="${key}" role="switch" aria-checked="${!!opts[key]}" aria-label="${label}"><i></i></button></div>`;
    const seg = (key, table, label, hint) => `<div class="opt-row"><div class="opt-text"><strong>${label}</strong>${hint ? `<small>${hint}</small>` : ''}</div>` +
      `<div class="opt-seg">${Object.entries(table).map(([id, v]) => `<button type="button" class="${opts[key] === id ? 'on' : ''}" data-seg="${key}:${id}">${v.label}</button>`).join('')}</div></div>`;
    let pane = '';
    if (tab === 'sprache') {
      // Sprache (seit 13.9): Namen in der eigenen Sprache, darum nicht übersetzen
      pane = `<section class="opt-group"><h3>Sprache · Language</h3><div class="opt-row no-tr"><div class="opt-seg opt-langs">` +
        Object.entries(LANGS).map(([id, v]) => `<button type="button" class="${i18n.lang === id ? 'on' : ''}" data-lang="${id}">${v}</button>`).join('') + `</div></div></section>`;
    } else if (tab === 'audio') {
      pane = `<section class="opt-group">` +
        `<div class="opt-row"><div class="opt-text"><strong>Klänge</strong><small>Kampf, Monster, Beute und Schmied. Der Stummschalter am iPhone schaltet Klänge und Musik ebenfalls stumm.</small></div>` +
        `<button type="button" class="opt-switch${sfx.on ? ' on' : ''}" id="optSound" role="switch" aria-checked="${sfx.on}" aria-label="Klänge"><i></i></button></div>` +
        `<div class="opt-row"><div class="opt-text"><strong>Lautstärke</strong></div><input type="range" id="optVolume" min="0" max="1" step="0.05" value="${opts.volume}" aria-label="Lautstärke"><b class="opt-val">${Math.round(opts.volume * 100)} %</b></div>` +
        sw('music', 'Musik', 'Entspannte Hintergrundmusik, passend zur Gegend (Dorf, Wald, Schnee, Wüste, Dungeon).') +
        `<div class="opt-row"><div class="opt-text"><strong>Musiklautstärke</strong></div><input type="range" id="optMusicVol" min="0" max="1" step="0.05" value="${opts.musicVol ?? 0.5}" aria-label="Musiklautstärke"><b class="opt-val">${Math.round((opts.musicVol ?? 0.5) * 100)} %</b></div></section>`;
    } else if (tab === 'grafik') {
      pane = `<section class="opt-group">` +
        seg('view', VIEWS, 'Ansicht', V3.on || opts.view === '2d' ? '3D: echte Welt mit Licht und Schatten. 2D: die klassische Ansicht, spart Akku.' : '3D wird von diesem Gerät nicht unterstützt, darum läuft 2D.') +
        seg('graphics', GRAPHICS, 'Qualität', `${IS_PC ? 'PC erkannt: Plus ist empfohlen – wie Ultra, dazu Leuchten von Feuer, Magie und Laternen, kräftigere Farben, weiche Ränder und Schatten für die ganze Welt.' : 'Handy oder Tablet erkannt: Mittel ist empfohlen. Plus (Leuchten, kräftige Farben, weiche Ränder) sieht am schönsten aus, braucht aber ein neueres Handy und mehr Akku; Hoch und Ultra sind schärfer, machen das Handy aber wärmer.'} Niedrig spart Akku und läuft auf älteren Handys flüssiger. Ruckelt es, senkt das Spiel die Auflösung und die Schatten von selbst.`) +
        seg('fps', FPS_MODES, 'Bildrate', 'Auto: am PC so viele Bilder, wie der Bildschirm zeigt (60, 120 oder 144; ist der Rechner zu langsam, gleichmäßig 30), am Handy 30 – scharfes Bild und das Handy bleibt kühl. Max: immer so viele Bilder wie der Bildschirm (auch 90 oder 120 am Handy) – flüssiger, macht das Handy aber warm.') +
        seg('fog', FOG_MODES, 'Nebel', 'Wie weit du in die Ferne siehst. Wenig: klare Sicht weit nach hinten (lädt etwas mehr Welt, am PC empfohlen). Normal: wie bisher. Viel: dichter Dunst, spart am Handy etwas Leistung.') +
        seg('camera', CAMERA, 'Kamera', 'Wie nah die Kamera an deiner Figur ist. Schulterblick (3D): tief und nah hinter der Figur wie in der 3D-Vorschau; zum Drehen auf der rechten Bildhälfte wischen oder mit gedrückter rechter Maustaste ziehen, Mausrad zoomt.') +
        sw('shake', 'Bildschirmwackeln', 'Bei kritischen Treffern, Bossen und Explosionen.') +
        sw('numbers', 'Schadenszahlen', 'Zahlen über getroffenen Monstern.') +
        sw('names', 'Namen der Bewohner', 'Namen unter Händlern und Helfern im Dorf.') +
        sw('selfBar', 'Eigener Lebensbalken', 'Ein kleiner Lebensbalken über deiner eigenen Figur (grün, bei wenig Leben gelb und rot).') +
        (opts.selfBar ? `<div class="opt-row"><div class="opt-text"><strong>Größe des Lebensbalkens</strong></div><input type="range" id="optSelfBar" min="0.5" max="2" step="0.1" value="${+opts.selfBarSize || 1}" aria-label="Größe des Lebensbalkens"><b class="opt-val">${Math.round((+opts.selfBarSize || 1) * 100)} %</b></div>` : '') +
        (FS_OK ? `<div class="opt-row"><div class="opt-text"><strong>Vollbild</strong><small>Das Spiel füllt den ganzen Bildschirm. Esc beendet das Vollbild.</small></div>` +
          `<button type="button" class="opt-switch${isFullscreen() ? ' on' : ''}" id="optFull" role="switch" aria-checked="${isFullscreen()}" aria-label="Vollbild"><i></i></button></div>` : '') + `</section>`;
    } else if (tab === 'steuerung') {
      pane = `<section class="opt-group"><h3>Steuerung</h3>` +
        sw('vibrate', 'Vibration', 'Kurzes Rütteln beim Schmieden und Tauschen (wo das Gerät es kann).') +
        (IS_PC ? `<div class="opt-row"><div class="opt-text"><strong>Maus</strong><small>Linksklick auf ein Monster greift an (gedrückt halten greift weiter an), Linksklick auf den Boden läuft dorthin (gedrückt halten folgt dem Mauszeiger), Rechtsklick wählt nur aus. Im Schulterblick dreht Ziehen mit der rechten Maustaste die Kamera, das Mausrad zoomt. Leertaste gedrückt halten greift ebenfalls an.</small></div></div>` : '') + `</section>` +
        keyOptionsHtml('quick');
    } else if (tab === 'tasten') {
      pane = keyOptionsHtml('keys');
    } else if (tab === 'konto') {
      pane = typeof legalOptionsHtml === 'function' ? legalOptionsHtml() : '';
    } else {
      // seit 14.32: Schadensanzeige (schadensmeter.js) unter „Oberfläche“ – sie gehört nicht zur Grafik
      pane = `<section class="opt-group"><h3>Oberfläche</h3>` +
        sw('dmeter', 'Schadensanzeige (Damage-Meter)', 'Kleines Fenster mit Schaden, DPS und Anteil für dich und deine Gruppe – mit den Ansichten Kampf, Dungeon/Gebiet, Gesamt (läuft weiter, bis du sie zurücksetzt) und Bosse (jeder Boss und Seelenstein einzeln). Wird gespeichert; über das Zahnrad einstellen und zurücksetzen. Am Kopf verschiebbar, mit dem Pfeil einklappbar. Zählt nur Schaden an Monstern, den der Kanal bestätigt hat.') +
        `</section>` + `<section class="opt-group"><div class="opt-btns">` +
        `<button type="button" class="btn btn-ghost" data-go="hud">🧩 HUD anpassen</button>` +
        `<button type="button" class="btn btn-ghost" data-go="look">✂ Aussehen ändern</button>` +
        `<button type="button" class="btn btn-ghost" data-go="net">🌐 Server und Kanal</button>` +
        `<button type="button" class="btn btn-ghost" data-go="help">❓ Hilfe</button>` +
        `<button type="button" class="btn btn-ghost" data-go="start">⏏ Charakter wechseln</button></div>` +
        `<p class="hint-text">HUD anpassen: alle Teile der Oberfläche (Lebensanzeige, Karte, Leiste, Chat …) verschieben und in der Größe ändern. ${IS_PC ? 'Esc öffnet und schließt diese Einstellungen.' : ''}</p>` +
        `<p class="hint-text">Version ${GAME_VERSION} · Dein Spielstand wird automatisch gespeichert.</p></section>` +
        (typeof quitGameHtml === 'function' ? quitGameHtml() : '');
    }
    body.innerHTML =
      `<nav class="opt-tabs" role="tablist" aria-label="Kategorien">` +
      OPT_TABS.map((t) => `<button type="button" role="tab" id="optTab-${t.id}" class="opt-tab${t.id === tab ? ' on' : ''}" aria-selected="${t.id === tab}" aria-controls="optPane" data-tab="${t.id}">` +
        `<span class="opt-tab-ico" aria-hidden="true">${t.icon}</span><span class="opt-tab-name">${t.label}</span></button>`).join('') +
      `</nav><div class="opt-pane" id="optPane" role="tabpanel" aria-labelledby="optTab-${tab}" data-tab="${tab}">${pane}</div>`;
    const nav = body.querySelector('.opt-tabs');
    const paneEl = body.querySelector('.opt-pane');
    nav.scrollLeft = keepNav;
    paneEl.scrollTop = keepScroll;
    // gewählten Reiter in der wischbaren Leiste (Handy) sichtbar halten, ohne das Fenster selbst zu verschieben
    const on = nav.querySelector('.opt-tab.on');
    if (on && nav.scrollWidth > nav.clientWidth) {
      if (on.offsetLeft < nav.scrollLeft) nav.scrollLeft = on.offsetLeft - 8;
      else if (on.offsetLeft + on.offsetWidth > nav.scrollLeft + nav.clientWidth) nav.scrollLeft = on.offsetLeft + on.offsetWidth - nav.clientWidth + 8;
    }
    nav.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => this.setTab(b.dataset.tab)));
    body.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
    body.querySelectorAll('[data-sw]').forEach((b) => b.addEventListener('click', () => {
      setOpt(b.dataset.sw, !opts[b.dataset.sw]);
      if (b.dataset.sw === 'dmeter' && typeof dmeterApply === 'function') dmeterApply();
      this.render();
    }));
    if (typeof wireQuitGame === 'function') wireQuitGame(body, () => this.render());
    body.querySelectorAll('[data-seg]').forEach((b) => b.addEventListener('click', () => {
      const [k, v] = b.dataset.seg.split(':');
      if (k === 'view') {
        switchView(v);
        return;
      }
      setOpt(k, v);
      this.render();
    }));
    wireKeyOptions(body, () => this.render());
    if (typeof wireLegalOptions === 'function') wireLegalOptions(body);
    if ($('optFull')) $('optFull').addEventListener('click', toggleFullscreen);
    // seit 13.62: Ton-Regler gibt es nur im Reiter Audio
    if ($('optSound')) $('optSound').addEventListener('click', () => {
      sfx.toggle();
      this.render();
    });
    const vol = $('optVolume');
    if (vol) {
      vol.addEventListener('input', () => {
        setOpt('volume', Number(vol.value));
        vol.nextElementSibling.textContent = Math.round(opts.volume * 100) + ' %';
      });
      vol.addEventListener('change', () => sfx.clang(1));
    }
    const sbar = $('optSelfBar');
    if (sbar) sbar.addEventListener('input', () => {
      setOpt('selfBarSize', Number(sbar.value));
      sbar.nextElementSibling.textContent = Math.round(opts.selfBarSize * 100) + ' %';
    });
    const mvol = $('optMusicVol');
    if (mvol) mvol.addEventListener('input', () => {
      setOpt('musicVol', Number(mvol.value));
      mvol.nextElementSibling.textContent = Math.round(opts.musicVol * 100) + ' %';
    });
    body.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', async () => {
      const go = b.dataset.go;
      if (go === 'hud') hudLayout.start();
      if (go === 'look') ui.openLookPanel();
      if (go === 'net') ui.toggle('panelNet');
      if (go === 'help') ui.toggle('panelHelp');
      if (go === 'start') {
        saveGame();
        if (netOnline()) netStop(true);
        // mit Konto: erst hochladen, dann zur Charakterauswahl
        if (accountOn()) { b.disabled = true; await cloudPush(true); }
        location.reload();
      }
    }));
  }
};

// Spiel beenden (seit 14.32): nur in der Desktop-App (Electron, desktop/main.js lädt das Spiel mit ?quelle=desktop).
// Erkannt wie in konto.js (MS_STORE_PWA) am „Electron/“ im User-Agent. Im Browser und am Handy gibt es keinen
// Knopf: Browser schließen ein selbst geöffnetes Fenster mit window.close() nicht, und Handys beenden Apps nicht selbst.
// Ablauf: Sicherheitsabfrage → Spielstand speichern (Gerät) → mit Konto hochladen (cloudPush, höchstens QUIT_WAIT ms)
// → Kanal verlassen → window.close() (in Electron schließt das das Hauptfenster, das Programm endet).
// Klappt das Hochladen nicht, wird nicht beendet, sondern ehrlich gemeldet: erneut versuchen, trotzdem beenden, abbrechen.
const IS_DESKTOP_APP = (() => { try { return /Electron\//.test(navigator.userAgent); } catch (e) { return false; } })();
const QUIT_WAIT = 10000;
const QUIT = { state: null, msg: '' }; // null | 'ask' | 'busy' | 'fail' | 'closing' | 'stuck'

function quitGameHtml() {
  if (!IS_DESKTOP_APP) return '';
  const cloud = typeof accountOn === 'function' && accountOn();
  let inner = '';
  if (!QUIT.state) inner = `<div class="opt-btns"><button type="button" class="btn btn-ghost quit-btn" data-quit="ask">⏻ Spiel beenden</button></div>`;
  else if (QUIT.state === 'ask') {
    inner = `<div class="quit-box" role="alertdialog" aria-labelledby="quitQ" aria-describedby="quitD"><strong id="quitQ">Spiel wirklich beenden?</strong>` +
      `<small id="quitD">${cloud ? 'Dein Spielstand wird vorher gespeichert und ins Konto hochgeladen.' : 'Dein Spielstand wird vorher auf diesem Gerät gespeichert.'}</small>` +
      `<div class="opt-btns"><button type="button" class="btn btn-ghost" data-quit="no">Abbrechen</button><button type="button" class="btn quit-yes" data-quit="yes">Beenden</button></div></div>`;
  } else if (QUIT.state === 'busy' || QUIT.state === 'closing') {
    inner = `<div class="quit-box" role="status"><strong>${QUIT.state === 'busy' ? 'Speichere …' : 'Beende …'}</strong><small>Bitte einen Moment warten.</small></div>`;
  } else if (QUIT.state === 'fail') {
    inner = `<div class="quit-box fail" role="alertdialog" aria-labelledby="quitQ"><strong id="quitQ">Hochladen ins Konto hat nicht geklappt</strong>` +
      `<small>${escapeHtml(QUIT.msg)}</small><small>Auf diesem Gerät ist dein Stand gespeichert. Beendest du trotzdem, wird er beim nächsten Start mit Verbindung abgeglichen.</small>` +
      `<div class="opt-btns"><button type="button" class="btn btn-ghost" data-quit="no">Abbrechen</button><button type="button" class="btn btn-ghost" data-quit="yes">Erneut versuchen</button>` +
      `<button type="button" class="btn quit-yes" data-quit="force">Trotzdem beenden</button></div></div>`;
  } else if (QUIT.state === 'stuck') {
    inner = `<div class="quit-box fail" role="alert"><strong>Das Fenster ließ sich nicht schließen</strong><small>Dein Spielstand ist gespeichert. Bitte das Fenster über das X oben rechts schließen.</small>` +
      `<div class="opt-btns"><button type="button" class="btn btn-ghost" data-quit="no">Schließen</button></div></div>`;
  }
  return `<section class="opt-group quit-group"><h3>Programm</h3>${inner}</section>`;
}

function wireQuitGame(body, rerender) {
  body.querySelectorAll('[data-quit]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.quit;
    if (k === 'ask') QUIT.state = 'ask';
    else if (k === 'no') QUIT.state = null;
    else if (k === 'yes' || k === 'force') { quitGame(k === 'force', rerender); return; }
    rerender();
    if (k === 'ask') {
      const box = document.querySelector('.quit-box');
      if (box) box.scrollIntoView({ block: 'nearest' });
      const no = document.querySelector('[data-quit="no"]');
      if (no) no.focus({ preventScroll: true });
    }
  }));
}

async function quitGame(force, rerender) {
  // mehrfaches Klicken: nur ein Ablauf
  if (QUIT.state === 'busy' || QUIT.state === 'closing') return;
  QUIT.state = 'busy';
  rerender();
  let msg = '';
  try {
    if (game.running) saveGame();
  } catch (e) { msg = 'Speichern auf dem Gerät fehlgeschlagen.'; }
  if (!msg && !force && typeof accountOn === 'function' && accountOn() && !account.stale && !account.deleting) {
    account.dirty = true;
    // ohne keepalive: das Fenster bleibt offen, bis die Antwort da ist (keepalive erlaubt nur kleine Pakete)
    const done = cloudPush().then(() => (account.dirty ? 'error' : 'ok'), () => 'error');
    const res = await Promise.race([done, new Promise((r) => setTimeout(() => r('timeout'), QUIT_WAIT))]);
    if (res === 'timeout') msg = `Das Konto hat in ${QUIT_WAIT / 1000} Sekunden nicht geantwortet.`;
    else if (res !== 'ok') msg = account.msg ? `Fehler: ${account.msg}` : 'Das Konto ist gerade nicht erreichbar.';
  }
  if (msg && !force) {
    QUIT.state = 'fail';
    QUIT.msg = msg;
    rerender();
    return;
  }
  QUIT.state = 'closing';
  rerender();
  try { if (netOnline()) netStop(true); } catch (e) { /* Verbindung ist schon weg */ }
  window.close();
  // schließt sich das Fenster nicht (alte Desktop-App, Sonderfall): ehrlich sagen statt hängen zu lassen
  setTimeout(() => { if (QUIT.state === 'closing') { QUIT.state = 'stuck'; rerender(); } }, 2000);
}
