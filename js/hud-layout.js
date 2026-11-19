// HUD anpassen (seit 13.2): wie in großen MMOs lassen sich die Teile der Oberfläche verschieben und
// vergrößern/verkleinern – Lebensanzeige, Ziel, Karte, Aufträge, Leiste unten, Chat, Menü, Gruppe und Bossleiste.
// Einstellungen → „HUD anpassen“: Teile mit der Maus oder dem Finger ziehen, Mausrad oder − / + ändert die Größe,
// „Fertig“ speichert. PC und Handy haben getrennte Anordnungen (Bildschirme sind zu verschieden).
// Umgesetzt mit den CSS-Eigenschaften translate und scale, damit das bestehende Layout unberührt bleibt.

const HUD_PARTS = [
  ['char', '#hudChar', 'Lebensanzeige'],
  ['target', '#targetFrame', 'Ziel'],
  ['party', '#partyFrame', 'Gruppe'],
  ['map', '.hud-map', 'Karte'],
  ['quests', '#questTrack', 'Aufträge'],
  ['bar', '.hud-bottom', 'Leiste'],
  ['chat', '#chatBox', 'Chat'],
  ['menu', '#hud > .menu', 'Menü'],
  ['boss', '#bossBar', 'Bossleiste'],
  // seit 14.39: Steigen/Sinken auf dem Drachen (nur Handy)
  ['fly', '#flyPad', 'Drachenflug']
];
const HUD_SCALE = [0.6, 1.8];
const hudLayout = {
  data: {},
  editing: false,
  shown: [],

  key() {
    return 'seelenstein.hud.' + (input.touchUi ? 'touch' : 'pc');
  },
  load() {
    try {
      this.data = JSON.parse(localStorage.getItem(this.key()) || '{}') || {};
    } catch (e) {
      this.data = {};
    }
  },
  save() {
    try { localStorage.setItem(this.key(), JSON.stringify(this.data)); } catch (e) { /* privat: dann nur für jetzt */ }
  },
  el(sel) {
    return document.querySelector(sel);
  },
  apply() {
    for (const [id, sel] of HUD_PARTS) {
      const el = this.el(sel);
      if (!el) continue;
      const d = this.data[id];
      el.style.translate = d && (d.x || d.y) ? `${Math.round(d.x || 0)}px ${Math.round(d.y || 0)}px` : '';
      el.style.scale = d && d.s && d.s !== 1 ? String(d.s) : '';
    }
  },
  // beim Spielstart und wenn das Gerät auf Touch wechselt
  init() {
    this.load();
    this.apply();
  },
  reset() {
    this.data = {};
    this.save();
    this.apply();
  },

  start() {
    if (this.editing || !game.running) return;
    ui.closePanels();
    this.editing = true;
    document.body.classList.add('hud-edit');
    // versteckte Teile zum Anfassen zeigen
    this.shown = [];
    for (const [id, sel, label] of HUD_PARTS) {
      const el = this.el(sel);
      if (!el) continue;
      if (el.hidden) {
        el.hidden = false;
        this.shown.push(el);
      }
      el.dataset.hudpart = id;
      const ctl = document.createElement('div');
      ctl.className = 'hud-edit-ctl';
      ctl.innerHTML = `<span>${label}</span><button type="button" data-hs="-1" aria-label="kleiner">−</button><button type="button" data-hs="1" aria-label="größer">+</button>`;
      el.appendChild(ctl);
      ctl.querySelectorAll('[data-hs]').forEach((b) => b.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.scaleBy(id, Number(b.dataset.hs) * 0.1);
      }));
      el.addEventListener('pointerdown', this.onDown);
      el.addEventListener('wheel', this.onWheel, { passive: false });
    }
    // ohne Gruppe zeigt die Gruppenanzeige Beispiel-Mitglieder, damit man sieht, was man verschiebt (gruppe.js)
    if (typeof partyHud === 'function') partyHud(true);
    const bar = document.createElement('div');
    bar.id = 'hudEditBar';
    bar.innerHTML = `<b>HUD anpassen</b><small>${input.touchUi ? 'Teile mit dem Finger ziehen, − / + ändert die Größe.' : 'Teile mit der Maus ziehen, Mausrad oder − / + ändert die Größe.'}</small>` +
      `<button type="button" class="btn btn-ghost" id="hudEditReset">Zurücksetzen</button><button type="button" class="btn btn-primary" id="hudEditDone">Fertig</button>`;
    document.body.appendChild(bar);
    $('hudEditDone').addEventListener('click', () => this.stop());
    $('hudEditReset').addEventListener('click', () => this.reset());
  },
  stop() {
    if (!this.editing) return;
    this.editing = false;
    document.body.classList.remove('hud-edit');
    for (const [, sel] of HUD_PARTS) {
      const el = this.el(sel);
      if (!el) continue;
      delete el.dataset.hudpart;
      el.removeEventListener('pointerdown', this.onDown);
      el.removeEventListener('wheel', this.onWheel);
      const ctl = el.querySelector(':scope > .hud-edit-ctl');
      if (ctl) ctl.remove();
    }
    for (const el of this.shown) el.hidden = true;
    this.shown = [];
    // seit 14.39: Steigen/Sinken gleich wieder nach dem Flugzustand zeigen (oberflaeche.js, updateFlyButton)
    const fb = document.getElementById('btnFly');
    if (fb) fb.dataset.st = '?';
    if (typeof partyHud === 'function') partyHud(true);
    if ($('hudEditBar')) $('hudEditBar').remove();
    this.save();
    // Ziel, Gruppe und Bossleiste zeigt die Oberfläche beim nächsten Bild wieder richtig an
    ui.cache = {};
  },
  scaleBy(id, ds) {
    const d = this.data[id] || (this.data[id] = { x: 0, y: 0, s: 1 });
    d.s = Math.max(HUD_SCALE[0], Math.min(HUD_SCALE[1], Math.round(((d.s || 1) + ds) * 100) / 100));
    this.apply();
  },
  onDown: (e) => {
    const el = e.currentTarget;
    const id = el.dataset.hudpart;
    if (!id || e.button > 0) return;
    e.preventDefault();
    e.stopPropagation();
    const d = hudLayout.data[id] || (hudLayout.data[id] = { x: 0, y: 0, s: 1 });
    const sx = e.clientX - (d.x || 0);
    const sy = e.clientY - (d.y || 0);
    el.classList.add('hud-drag');
    const move = (ev) => {
      d.x = ev.clientX - sx;
      d.y = ev.clientY - sy;
      hudLayout.apply();
    };
    const up = () => {
      el.classList.remove('hud-drag');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  },
  onWheel: (e) => {
    const id = e.currentTarget.dataset.hudpart;
    if (!id) return;
    e.preventDefault();
    hudLayout.scaleBy(id, e.deltaY < 0 ? 0.05 : -0.05);
  }
};

// Im Bearbeitungsmodus lösen HUD-Teile nichts aus (z. B. öffnet die Karte beim Ziehen nicht die große Karte)
document.addEventListener('click', (e) => {
  if (!hudLayout.editing || !e.target.closest) return;
  if (e.target.closest('.hud-edit-ctl') || e.target.closest('#hudEditBar')) return;
  if (e.target.closest('[data-hudpart]')) {
    e.stopPropagation();
    e.preventDefault();
  }
}, true);
