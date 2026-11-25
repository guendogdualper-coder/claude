// Seelenstein – Desktop-App: Erinnerungen als Windows-Systemmeldung
//
// Das Spiel (js/benachrichtigung.js, Einstellung „Benachrichtigungen“) schickt über die Brücke in preload.js eine
// Liste [{ id, at, title, body }] – at in Millisekunden, Texte schon in der Spielsprache. Hier stehen die Zeitgeber im
// Hauptprozess: Sie laufen weiter, wenn das Fenster minimiert oder verdeckt ist, aber nur, solange das Programm läuft.
// Jede neue Liste ersetzt die alte, „loeschen“ entfernt alle. Ist das Spielfenster gerade vorn (jemand spielt), wird
// eine fällige Meldung still verworfen – wie auf dem iPhone. Ein Klick auf die Meldung holt das Fenster nach vorn.
//
// Ohne Abhängigkeit von Electron (Notification und Fenster werden übergeben), damit es sich in Node prüfen lässt.

'use strict';

const MAX = 12;               // mehr plant das Spiel nie (fünf Arten)
const TEXT_MAX = 300;         // Zeichen je Titel und Text
const TAGE_MAX = 60;          // weiter voraus wird nichts angenommen
const SPANNE = 2147483647;    // längste Wartezeit eines setTimeout (etwa 24,8 Tage) – längere werden gestückelt

function meldungenAnlegen(o) {
  const Notification = o.Notification;
  const fenster = o.fenster;
  const icon = o.icon;
  const jetzt = o.jetzt || (() => Date.now());
  const warte = o.setTimeout || setTimeout;
  const stopp = o.clearTimeout || clearTimeout;
  const timer = new Map();
  const offen = new Set(); // gezeigte Meldungen festhalten, sonst räumt die Speicherbereinigung sie samt Klick weg

  function loeschen() {
    for (const t of timer.values()) stopp(t);
    timer.clear();
  }

  function spielVorn() {
    const w = fenster();
    return !!(w && !w.isDestroyed() && w.isVisible() && !w.isMinimized() && w.isFocused());
  }

  function zeigen(m) {
    if (spielVorn() || !Notification.isSupported()) return false;
    const n = new Notification({ title: m.title, body: m.body, icon, silent: false });
    offen.add(n);
    const weg = () => offen.delete(n);
    n.on('click', () => {
      weg();
      const w = fenster();
      if (!w || w.isDestroyed()) return;
      if (w.isMinimized()) w.restore();
      w.show();
      w.focus();
    });
    n.on('close', weg);
    n.on('failed', weg);
    n.show();
    return true;
  }

  function stellen(m) {
    const warten = m.at - jetzt();
    if (warten > SPANNE) {
      timer.set(m.id, warte(() => stellen(m), SPANNE));
      return;
    }
    timer.set(m.id, warte(() => {
      timer.delete(m.id);
      zeigen(m);
    }, Math.max(0, warten)));
  }

  // Eingang prüfen: nur Zahlen und kurze Texte, nur in der Zukunft und höchstens TAGE_MAX Tage voraus
  function pruefen(roh, t0) {
    if (!roh || typeof roh !== 'object') return null;
    const id = Number(roh.id);
    const at = Number(roh.at);
    const text = (s) => (typeof s === 'string' ? s.trim().slice(0, TEXT_MAX) : '');
    const title = text(roh.title);
    const body = text(roh.body);
    if (!Number.isInteger(id) || !Number.isFinite(at) || !title) return null;
    if (at <= t0 || at > t0 + TAGE_MAX * 864e5) return null;
    return { id, at, title, body };
  }

  // Neue Liste: alte Zeitgeber weg, neue stellen. Rückgabe: Anzahl der angenommenen Meldungen
  function planen(liste) {
    loeschen();
    if (!Array.isArray(liste)) return 0;
    const t0 = jetzt();
    for (const roh of liste.slice(0, MAX)) {
      const m = pruefen(roh, t0);
      if (m && !timer.has(m.id)) stellen(m);
    }
    return timer.size;
  }

  return { planen, loeschen, zeigen, anzahl: () => timer.size };
}

module.exports = { meldungenAnlegen };
