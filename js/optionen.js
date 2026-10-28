// Einstellungen (Zahnrad oben, Taste O): Ton und Lautstärke, Grafikstufe, Kamera, Bildschirmwackeln,
// Vibration, Schadenszahlen und Namen. Gespeichert im Browser, gilt für alle Figuren auf dem Gerät.

const OPT_KEY = 'seelenstein.optionen';
const OPT_DEFAULTS = { view: '3d', volume: 0.7, graphics: 'hoch', camera: 'normal', shake: true, vibrate: true, numbers: true, names: true };

// Grafikstufen: Auflösung, Schlagschatten, Wolkenschatten, Menge an Partikeln
const GRAPHICS = {
  hoch: { label: 'Hoch', dpr: 2, castShadows: true, clouds: true, particles: 1 },
  mittel: { label: 'Mittel', dpr: 1.6, castShadows: true, clouds: false, particles: 0.7 },
  niedrig: { label: 'Niedrig', dpr: 1.25, castShadows: false, clouds: false, particles: 0.4 }
};
const CAMERA = { nah: { label: 'Nah', zoom: 1.15 }, normal: { label: 'Normal', zoom: 1 }, weit: { label: 'Weit', zoom: 0.85 } };

const opts = (() => {
  try { return { ...OPT_DEFAULTS, ...JSON.parse(localStorage.getItem(OPT_KEY) || '{}') }; } catch (e) { return { ...OPT_DEFAULTS }; }
})();

const gfx = () => GRAPHICS[opts.graphics] || GRAPHICS.hoch;

function setOpt(key, value) {
  opts[key] = value;
  try { localStorage.setItem(OPT_KEY, JSON.stringify(opts)); } catch (e) { /* privat */ }
  applyOpts();
}

function applyOpts() {
  if (sfx.master) sfx.master.gain.value = 0.8 * opts.volume;
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

const options = {
  render() {
    const body = $('optsBody');
    const sw = (key, label, hint) => `<div class="opt-row"><div class="opt-text"><strong>${label}</strong>${hint ? `<small>${hint}</small>` : ''}</div>` +
      `<button type="button" class="opt-switch${opts[key] ? ' on' : ''}" data-sw="${key}" role="switch" aria-checked="${!!opts[key]}" aria-label="${label}"><i></i></button></div>`;
    const seg = (key, table, label, hint) => `<div class="opt-row"><div class="opt-text"><strong>${label}</strong>${hint ? `<small>${hint}</small>` : ''}</div>` +
      `<div class="opt-seg">${Object.entries(table).map(([id, v]) => `<button type="button" class="${opts[key] === id ? 'on' : ''}" data-seg="${key}:${id}">${v.label}</button>`).join('')}</div></div>`;
    body.innerHTML =
      `<section class="opt-group"><h3>Ton</h3>` +
      `<div class="opt-row"><div class="opt-text"><strong>Klänge</strong><small>Schmied und weitere Effekte. Der Stummschalter am iPhone schaltet sie ebenfalls stumm.</small></div>` +
      `<button type="button" class="opt-switch${sfx.on ? ' on' : ''}" id="optSound" role="switch" aria-checked="${sfx.on}" aria-label="Klänge"><i></i></button></div>` +
      `<div class="opt-row"><div class="opt-text"><strong>Lautstärke</strong></div><input type="range" id="optVolume" min="0" max="1" step="0.05" value="${opts.volume}" aria-label="Lautstärke"><b class="opt-val">${Math.round(opts.volume * 100)} %</b></div></section>` +
      `<section class="opt-group"><h3>Grafik</h3>` +
      seg('view', VIEWS, 'Ansicht', V3.on || opts.view === '2d' ? '3D: echte Welt mit Licht und Schatten. 2D: die klassische Ansicht, spart Akku.' : '3D wird von diesem Gerät nicht unterstützt, darum läuft 2D.') +
      seg('graphics', GRAPHICS, 'Qualität', 'Niedrig spart Akku und läuft auf älteren Handys flüssiger.') +
      seg('camera', CAMERA, 'Kamera', 'Wie nah die Kamera an deiner Figur ist.') +
      sw('shake', 'Bildschirmwackeln', 'Bei kritischen Treffern, Bossen und Explosionen.') +
      sw('numbers', 'Schadenszahlen', 'Zahlen über getroffenen Monstern.') +
      sw('names', 'Namen der Bewohner', 'Namen unter Händlern und Helfern im Dorf.') + `</section>` +
      `<section class="opt-group"><h3>Steuerung</h3>` +
      sw('vibrate', 'Vibration', 'Kurzes Rütteln beim Schmieden und Tauschen (wo das Gerät es kann).') + `</section>` +
      `<section class="opt-group"><h3>Figur und Spiel</h3><div class="opt-btns">` +
      `<button type="button" class="btn btn-ghost" data-go="look">✂ Aussehen ändern</button>` +
      `<button type="button" class="btn btn-ghost" data-go="net">🌐 Server und Kanal</button>` +
      `<button type="button" class="btn btn-ghost" data-go="help">❓ Hilfe</button>` +
      `<button type="button" class="btn btn-ghost" data-go="start">⏏ Zum Startbildschirm</button></div>` +
      `<p class="hint-text">Version ${GAME_VERSION} · Dein Spielstand wird automatisch gespeichert.</p></section>`;
    body.querySelectorAll('[data-sw]').forEach((b) => b.addEventListener('click', () => {
      setOpt(b.dataset.sw, !opts[b.dataset.sw]);
      this.render();
    }));
    body.querySelectorAll('[data-seg]').forEach((b) => b.addEventListener('click', () => {
      const [k, v] = b.dataset.seg.split(':');
      if (k === 'view') {
        switchView(v);
        return;
      }
      setOpt(k, v);
      this.render();
    }));
    $('optSound').addEventListener('click', () => {
      sfx.toggle();
      this.render();
    });
    const vol = $('optVolume');
    vol.addEventListener('input', () => {
      setOpt('volume', Number(vol.value));
      vol.nextElementSibling.textContent = Math.round(opts.volume * 100) + ' %';
    });
    vol.addEventListener('change', () => sfx.clang(1));
    body.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => {
      const go = b.dataset.go;
      if (go === 'look') ui.openLookPanel();
      if (go === 'net') ui.toggle('panelNet');
      if (go === 'help') ui.toggle('panelHelp');
      if (go === 'start') {
        saveGame();
        if (netOnline()) netStop(true);
        location.reload();
      }
    }));
  }
};
