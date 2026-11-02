// Welt-Wächter (seit 13.33): das Spiel läuft ohne Bild und ohne sichtbare Figur auf dem Seelenstein-Server als
// dauerhafter Host eines Kanals (Aufruf: …/?waechter=1&kanal=1). Monster, Seelensteine, Bosse und ihre
// Wiederkehr laufen so weiter, auch wenn kein Spieler online ist, und niemand fliegt mehr raus, wenn ein Spieler geht.
// Ist beim Start des Wächters ein Spieler Host, gibt dieser ihm den Kanal ab und spielt als Mitspieler weiter
// (netHandOver in netz.js). Fällt der Wächter aus, übernimmt wie bisher ein Spieler.
// Auf dem Server: server/waechter.sh (Chromium ohne Bildschirm, ein Dienst je Kanal).
const WAECHTER = (() => {
  try { return new URLSearchParams(location.search).has('waechter'); } catch (e) { return false; }
})();
const WAECHTER_NAME = 'Welt-Wächter';
// weit außerhalb der Welt: dort sieht ihn niemand und kein Monster läuft zu ihm
const WAECHTER_SPOT = { x: -60000, y: -60000 };
const WAECHTER_SERVER = 'erfoo';

function waechterKanal() {
  const ch = Number(new URLSearchParams(location.search).get('kanal'));
  return ch >= 1 && ch <= 99 ? ch : 1;
}

function waechterLog(msg) {
  try { console.log('[waechter k' + waechterKanal() + '] ' + msg); } catch (e) { /* egal */ }
}

function waechterHold() {
  const p = game.player;
  if (!p) return;
  p.x = WAECHTER_SPOT.x;
  p.y = WAECHTER_SPOT.y;
  p.dead = false;
  p.hp = p.maxHp || 1e6;
  p.moving = false;
  p.riding = false;
}

function waechterStart() {
  const ch = waechterKanal();
  document.title = `Welt-Wächter · Kanal ${ch}`;
  // keine Spielstände, keine Fenster, kein Beitrittsfenster
  window.saveGame = () => {};
  net.autoTried = true;
  const s = newCharacter(WAECHTER_NAME, 'krieger', 0);
  s.daily = { last: dailyKey(), streak: 1 };
  startGame(s, 97);
  game.player.waechter = true;
  waechterHold();
  try { ui.closePanels(); } catch (e) { /* egal */ }
  netJoinChannel(WAECHTER_SERVER, ch);
  waechterLog('gestartet, Version ' + GAME_VERSION);

  // eigene Schleife ohne Zeichnen (statt requestAnimationFrame): 20 Schritte pro Sekunde
  let last = performance.now();
  setInterval(() => {
    const now = performance.now();
    let left = Math.min(1, (now - last) / 1000);
    last = now;
    try {
      while (left > 0 && game.running) {
        const dt = Math.min(0.05, left);
        left -= dt;
        update(dt);
        waechterHold();
      }
      // Monster, die (z. B. als Ersatzziel) die unsichtbare Figur jagen, gehen nach Hause
      for (const m of game.monsters) {
        if (m.target === game.player) {
          m.target = null;
          if (m.state && m.state !== 'idle') m.state = 'return';
        }
      }
    } catch (e) {
      waechterLog('Fehler: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e));
    }
  }, 50);

  // Kanal verloren (Netz weg, nach Abgabe): wieder beitreten
  setInterval(() => {
    if (net.mode === 'off') {
      waechterLog('nicht im Kanal – trete wieder bei');
      netJoinChannel(WAECHTER_SERVER, ch);
    }
  }, 10000);

  // Lebenszeichen für das Server-Protokoll (journalctl)
  setInterval(() => {
    const alive = game.monsters.filter((m) => !m.dead).length;
    waechterLog(`Modus ${net.mode}, Spieler ${net.players.size}, Monster ${alive}/${game.monsters.length}`);
  }, 60000);
}

// Neue Spielversion: neu laden (mit der Version in der Adresse, damit nichts Altes aus dem Zwischenspeicher kommt)
function waechterReload(v) {
  waechterLog('neue Version ' + v + ' – lade neu');
  if (net.mode === 'host') netBroadcast({ t: 'bye', w: 1 });
  setTimeout(() => location.replace(location.pathname + `?waechter=1&kanal=${waechterKanal()}&v=${v}`), 400);
}
