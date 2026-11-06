// Seelenstein – Desktop-App (Electron)
//
// Ein eigenständiges Programm, das das Spiel von https://seelenstein.online/ lädt. Dadurch kommt jedes Spiel-Update
// sofort an, ohne dass die App neu installiert werden muss. Der Service Worker des Spiels arbeitet wie im Browser.
// Ohne Verbindung erscheint die eigene Seite offline/offline.html mit „Erneut versuchen“.
//
// Leistung: dedizierte Grafikkarte bevorzugen, GPU-Blockliste ignorieren, GPU-Rasterung, kein Drosseln im
// Hintergrund oder bei verdecktem Fenster. Die Bildrate folgt dem Bildschirm (60/120/144/240 Hz, V-Sync); die
// Einstellung „Bildrate: Max“ im Spiel nutzt das voll aus.
//
// Sicherheit: contextIsolation, kein Node im Fenster, Sandbox. Im App-Fenster darf nur die eigene Domain geöffnet
// werden; fremde Links öffnen sich im Standardbrowser.
//
// Umgebungsvariable SEELENSTEIN_URL (nur zum Testen): andere Startadresse, z. B. http://localhost:8000/

'use strict';

const { app, BrowserWindow, Menu, shell, screen, session } = require('electron');
const path = require('path');
const fs = require('fs');

// ---------- Startadresse und erlaubte Adressen ----------
const STANDARD_URL = 'https://seelenstein.online/';
const START_URL = (() => {
  const roh = process.env.SEELENSTEIN_URL;
  if (!roh) return STANDARD_URL;
  try {
    const u = new URL(roh);
    if (u.protocol === 'https:' || u.protocol === 'http:') return u.href;
  } catch (e) { /* ungültig */ }
  return STANDARD_URL;
})();
// Woher der Aufruf kommt (wie ?quelle=play / ?quelle=ios bei den Handy-Apps). Der Service Worker des Spiels
// sucht Dateien mit ignoreSearch, das Spiel startet damit auch offline aus dem Speicher.
const SPIEL_URL = (() => {
  const u = new URL(START_URL);
  if (!u.searchParams.has('quelle')) u.searchParams.set('quelle', 'desktop');
  return u.href;
})();
const ERLAUBTE_ORIGINS = new Set([
  new URL(START_URL).origin,
  'https://seelenstein.online',
  'https://www.seelenstein.online'
]);
const OFFLINE_DATEI = path.join(__dirname, 'offline', 'offline.html');

function istSpielAdresse(adresse) {
  try { return ERLAUBTE_ORIGINS.has(new URL(adresse).origin); } catch (e) { return false; }
}
function istOfflineSeite(adresse) {
  try {
    const u = new URL(adresse);
    return u.protocol === 'file:' && path.normalize(decodeURIComponent(u.pathname)).endsWith(path.join('offline', 'offline.html'));
  } catch (e) { return false; }
}
// Fremde Adressen nur an den Standardbrowser bzw. das Mailprogramm geben – nie file:, javascript: o. Ä.
function extern(adresse) {
  try {
    const u = new URL(adresse);
    if (u.protocol === 'https:' || u.protocol === 'http:' || u.protocol === 'mailto:') shell.openExternal(u.href);
  } catch (e) { /* ungültige Adresse: nichts tun */ }
}

// ---------- Leistung: Schalter für Chromium (müssen vor app.ready gesetzt werden) ----------
app.commandLine.appendSwitch('force_high_performance_gpu');           // dedizierte Grafikkarte (Laptops mit 2 GPUs)
app.commandLine.appendSwitch('ignore-gpu-blocklist');                 // auch „gesperrte“ Treiber mit GPU nutzen
app.commandLine.appendSwitch('enable-gpu-rasterization');             // Oberfläche auf der GPU zeichnen
app.commandLine.appendSwitch('enable-zero-copy');                     // Texturen ohne Umweg in den Grafikspeicher
app.commandLine.appendSwitch('disable-renderer-backgrounding');       // Spiel im Hintergrund nicht verlangsamen
app.commandLine.appendSwitch('disable-background-timer-throttling');  // Timer im Hintergrund nicht drosseln
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows'); // verdecktes Fenster nicht drosseln
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required'); // Musik/Klänge ohne Extra-Klick
if (process.platform === 'win32') {
  // Windows ordnet Startmenü-Eintrag, Taskleiste und Benachrichtigungen dieser App zu (wie appId im Installer)
  app.setAppUserModelId('online.seelenstein.desktop');
}

// ---------- Nur eine laufende Instanz (zweiter Start holt das vorhandene Fenster nach vorn) ----------
const ERSTE_INSTANZ = app.requestSingleInstanceLock();
if (!ERSTE_INSTANZ) app.quit();
app.on('second-instance', () => {
  const w = hauptfenster;
  if (!w) return;
  if (w.isMinimized()) w.restore();
  w.show();
  w.focus();
});

// ---------- Fenstergröße und -lage merken ----------
const ZUSTAND_DATEI = path.join(app.getPath('userData'), 'fenster.json');
function zustandLesen() {
  try {
    const z = JSON.parse(fs.readFileSync(ZUSTAND_DATEI, 'utf8'));
    return z && typeof z === 'object' ? z : {};
  } catch (e) { return {}; }
}
function zustandSchreiben(w) {
  try {
    const z = {
      bounds: w.getNormalBounds(),
      maximiert: w.isMaximized(),
      vollbild: w.isFullScreen()
    };
    fs.mkdirSync(path.dirname(ZUSTAND_DATEI), { recursive: true });
    fs.writeFileSync(ZUSTAND_DATEI, JSON.stringify(z));
  } catch (e) { /* nicht schlimm */ }
}
// Liegt das gemerkte Fenster noch sichtbar auf einem Bildschirm? (Monitor abgesteckt o. Ä.)
function boundsGueltig(b) {
  if (!b || ![b.x, b.y, b.width, b.height].every(Number.isFinite)) return false;
  if (b.width < 640 || b.height < 400) return false;
  return screen.getAllDisplays().some((d) => {
    const a = d.workArea;
    const bx = Math.max(0, Math.min(b.x + b.width, a.x + a.width) - Math.max(b.x, a.x));
    const by = Math.max(0, Math.min(b.y + b.height, a.y + a.height) - Math.max(b.y, a.y));
    return bx >= 200 && by >= 150;
  });
}

// ---------- Sichere Einstellungen für jedes Fenster ----------
const WEB_PREFS = {
  contextIsolation: true,
  nodeIntegration: false,
  nodeIntegrationInWorker: false,
  sandbox: true,
  webSecurity: true,
  allowRunningInsecureContent: false,
  webviewTag: false,
  spellcheck: false,
  backgroundThrottling: false   // auch minimiert/verdeckt volle Leistung (Kanäle, Gruppen, Musik laufen weiter)
};

// Alle Fenster und Inhalte (auch Wiki-/Datenschutz-Fenster) bekommen dieselben Regeln
app.on('web-contents-created', (_e, wc) => {
  wc.on('will-attach-webview', (ev) => ev.preventDefault());

  // Navigation im Fenster: nur eigene Domain und die eigene Offline-Seite
  const pruefen = (ev, adresse) => {
    if (istSpielAdresse(adresse) || istOfflineSeite(adresse)) return;
    ev.preventDefault();
    extern(adresse);
  };
  wc.on('will-navigate', pruefen);
  wc.on('will-redirect', pruefen);

  // Neue Fenster (Links mit target="_blank", window.open):
  // eigene Seiten (Wiki, Datenschutz, Regeln, Konto löschen) in einem App-Fenster, alles andere im Standardbrowser
  wc.setWindowOpenHandler(({ url }) => {
    if (istSpielAdresse(url)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 1200,
          height: 820,
          backgroundColor: '#12100C',
          autoHideMenuBar: true,
          icon: path.join(__dirname, 'offline', 'symbol.png'),
          webPreferences: { ...WEB_PREFS }
        }
      };
    }
    extern(url);
    return { action: 'deny' };
  });

  // Tastenkürzel (es gibt kein Menü): F11 / Alt+Enter Vollbild, F5 / Strg+R neu laden, Strg+Umschalt+I Entwicklerwerkzeuge
  wc.on('before-input-event', (ev, input) => {
    if (input.type !== 'keyDown') return;
    const w = BrowserWindow.fromWebContents(wc);
    if (!w) return;
    const strg = input.control || input.meta;
    if (input.key === 'F11' || (input.alt && input.key === 'Enter')) {
      ev.preventDefault();
      w.setFullScreen(!w.isFullScreen());
    } else if (input.key === 'F5' || (strg && !input.shift && input.key.toLowerCase() === 'r')) {
      ev.preventDefault();
      if (istOfflineSeite(wc.getURL()) && w === hauptfenster) w.loadURL(SPIEL_URL);
      else wc.reload();
    } else if (strg && input.shift && input.key.toLowerCase() === 'i') {
      ev.preventDefault();
      wc.toggleDevTools();
    }
  });
});

// ---------- Hauptfenster ----------
let hauptfenster = null;

function offlineZeigen(w) {
  w.loadFile(OFFLINE_DATEI, { query: { ziel: SPIEL_URL } }).catch(() => {});
}

function fensterOeffnen() {
  const z = zustandLesen();
  const b = boundsGueltig(z.bounds) ? z.bounds : null;
  const w = new BrowserWindow({
    title: 'Seelenstein',
    width: b ? b.width : 1600,
    height: b ? b.height : 900,
    x: b ? b.x : undefined,
    y: b ? b.y : undefined,
    minWidth: 800,
    minHeight: 500,
    show: false,
    backgroundColor: '#12100C',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'offline', 'symbol.png'), // Windows nimmt das Symbol aus der .exe
    webPreferences: { ...WEB_PREFS }
  });
  hauptfenster = w;

  // Erster Start: maximiert. Danach so, wie das Fenster zuletzt war.
  w.once('ready-to-show', () => {
    if (z.vollbild) w.setFullScreen(true);
    else if (z.maximiert !== false) w.maximize();
    w.show();
    w.focus();
  });

  // Größe merken (verzögert, damit beim Ziehen nicht ständig geschrieben wird) und beim Schließen
  let merkTimer = null;
  const merken = () => {
    clearTimeout(merkTimer);
    merkTimer = setTimeout(() => { if (!w.isDestroyed()) zustandSchreiben(w); }, 800);
  };
  for (const ev of ['resize', 'move', 'maximize', 'unmaximize', 'enter-full-screen', 'leave-full-screen']) w.on(ev, merken);
  w.on('close', () => { clearTimeout(merkTimer); zustandSchreiben(w); });
  w.on('closed', () => { if (hauptfenster === w) hauptfenster = null; });

  // Titel bleibt „Seelenstein“ (Taskleiste, Alt+Tab)
  w.on('page-title-updated', (ev) => { ev.preventDefault(); w.setTitle('Seelenstein'); });

  const wc = w.webContents;

  // Kann das Spiel nicht geladen werden (und hat auch der Service Worker nichts im Speicher): Offline-Seite
  wc.on('did-fail-load', (_ev, code, _beschreibung, adresse, hauptframe) => {
    if (!hauptframe || code === -3) return; // -3 = abgebrochen (z. B. weil neu navigiert wird)
    if (istOfflineSeite(adresse)) return;
    if (!istSpielAdresse(adresse)) return;
    offlineZeigen(w);
  });

  // Der „Als App installieren“-Kasten der Website ist in der App überflüssig
  wc.on('did-finish-load', () => {
    if (!istSpielAdresse(wc.getURL())) return;
    wc.insertCSS('#installBox, #umzugHinweis { display: none !important; }').catch(() => {});
  });

  // Absturz der Seite: neu laden statt weißes Fenster
  wc.on('render-process-gone', (_ev, details) => {
    if (details && details.reason === 'clean-exit') return;
    setTimeout(() => { if (!w.isDestroyed()) w.loadURL(SPIEL_URL).catch(() => offlineZeigen(w)); }, 1000);
  });

  w.loadURL(SPIEL_URL).catch(() => { /* did-fail-load zeigt die Offline-Seite */ });
  return w;
}

app.whenReady().then(() => {
  if (!ERSTE_INSTANZ) return;
  Menu.setApplicationMenu(null);

  // Berechtigungen: nur, was das Spiel braucht (Vollbild, Zeiger fangen, Kopieren, Bildschirm wach halten)
  const ERLAUBT = new Set(['fullscreen', 'pointerLock', 'clipboard-sanitized-write', 'screen-wake-lock']);
  const ses = session.defaultSession;
  ses.setPermissionRequestHandler((wc, recht, antwort) => {
    antwort(ERLAUBT.has(recht) && istSpielAdresse(wc.getURL()));
  });
  ses.setPermissionCheckHandler((_wc, recht, herkunft) => ERLAUBT.has(recht) && istSpielAdresse(herkunft || ''));

  fensterOeffnen();

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) fensterOeffnen(); });
});

app.on('window-all-closed', () => app.quit());
