// Auto-Angriff (Schalter an der Leiste unten und unter Einstellungen → Steuerung, je Gerät gemerkt in opts.autoAttack):
// Spielerwunsch „wie in klassischen MMOs“ – Ziel anklicken, die Figur läuft hin und greift es immer weiter an, der Fokus
// bleibt darauf, bis man etwas anderes anklickt. Standard ist AUS: dann ist jeder Angriff wie bisher ein Tipp bzw.
// Leertaste/Angriffsknopf halten.
//
// Ist der Schalter AN, startet ein Linksklick (PC) bzw. Antippen (Handy) auf ein Monster, einen Seelenstein oder einen
// erlaubten PvP-Gegner (Duell, Turnierarena) den Auto-Angriff (eingabe.js → autoAttackClick). Jedes Bild hält
// autoAttackTick (aus updatePlayer, spiel.js) den Angriff „gedrückt“: Die Figur läuft in Reichweite und schlägt bzw.
// schießt mit dem Grundangriff im selben Takt und nach denselben Regeln wie beim Halten der Leertaste. Fertigkeiten
// gehen auf dasselbe Ziel (bewusster Fokus, pickTarget in kampf.js).
// Ein Klick bzw. Tipp auf ein anderes Ziel wechselt den Auto-Angriff dorthin, ebenso Tab, solange er läuft. Schluss ist,
// wenn das Ziel tot oder verschwunden ist, ein anderes Ziel ohne Auto-Angriff gewählt wird (Rechtsklick wählt weiter nur
// aus), man selbst läuft (Bewegungstasten, Steuerknüppel, Klick auf den Boden), Esc das Ziel abwählt, man stirbt oder den
// Schalter ausschaltet. Mitspieler in der Stadt, die eigene Gruppe und Dorfbewohner sind nie ein Ziel (selectAt öffnet
// dort Spielerkarte bzw. Gespräch); PvP nur wie bisher (Duell, Turnierarena), in einer Stadt wird nichts angegriffen.

const AUTO_ATK = { maxDist: 1200 };
const autoAtk = { target: null, shown: null };

function autoAttackOn() {
  return !!(typeof opts !== 'undefined' && opts.autoAttack);
}

// Linksklick bzw. Antippen hat gerade ein Ziel gewählt (selectAt lieferte 'monster')
function autoAttackClick() {
  if (!autoAttackOn() || !game.running) return;
  const t = game.target;
  if (!t || t.dead || t.hidden || !targetIsManual(t)) return;
  autoAtk.target = t;
  autoAttackShow();
}

// Ist t das Ziel eines laufenden Auto-Angriffs? Dann bleibt es Fokus, auch wenn es weiter als sonst weg ist (pickTarget)
function autoAttackHolds(t) {
  return !!t && t === autoAtk.target && autoAttackOn();
}

// Tab während eines laufenden Auto-Angriffs: er geht auf das neue Ziel über
function autoAttackRetarget(t) {
  if (autoAtk.target && t && targetIsManual(t)) autoAtk.target = t;
}

// Jedes Bild (updatePlayer): Ziel des Auto-Angriffs oder null. mv = Laufrichtung aus Tasten und Steuerknüppel.
function autoAttackTick(p, mv) {
  const t = autoAtk.target;
  if (!t) return null;
  const stop = !autoAttackOn() || !p || p.dead || t.dead || t.hidden || t !== game.target || !targetIsManual(t) ||
    dist(p, t) > AUTO_ATK.maxDist || (inVillage(t.x, t.y) && !duelFighting());
  // selbst laufen beendet ihn; der Angriff gibt das Laufen sofort frei (sonst hielte der letzte „Tipp“ den Klick auf
  // den Boden noch kurz auf, siehe input.walkTo in updatePlayer)
  const walk = (mv && (mv.x || mv.y)) || input.walkTo;
  if (stop || walk) {
    autoAtk.target = null;
    clearAttack();
    autoAttackShow();
    return null;
  }
  // beim Zaubern (Feuerball) und Kanalisieren (Eisstrahl, Blutsauger) kurz aussetzen, danach geht es weiter
  if (p.mcast || p.channel) return null;
  return t;
}

// Knopf an der Leiste: an/aus, und ob gerade ein Auto-Angriff läuft
function autoAttackShow() {
  const b = document.getElementById('btnAuto');
  if (!b) return;
  const on = autoAttackOn();
  const run = on && !!autoAtk.target;
  const key = (on ? 1 : 0) + (run ? 2 : 0);
  if (autoAtk.shown === key) return;
  autoAtk.shown = key;
  b.classList.toggle('on', on);
  b.classList.toggle('run', run);
  b.setAttribute('aria-pressed', String(on));
  b.title = on ? 'Auto-Angriff an: Linksklick bzw. Antippen eines Monsters oder Seelensteins greift es immer weiter an. Antippen schaltet aus.'
    : 'Auto-Angriff aus: Antippen schaltet ihn ein – dann greift ein Linksklick bzw. Antippen eines Monsters oder Seelensteins es immer weiter an.';
}

// Schalter umlegen (Knopf an der Leiste und Einstellungen)
function autoAttackToggle(on) {
  const v = on == null ? !autoAttackOn() : !!on;
  // nur speichern (je Gerät): setOpt würde auch Grafik und Ton neu anwenden, das ruckelt mitten im Kampf
  opts.autoAttack = v;
  try { localStorage.setItem(OPT_KEY, JSON.stringify(opts)); } catch (e) { /* privat: dann nur für jetzt */ }
  if (!v) autoAtk.target = null;
  autoAtk.shown = null;
  autoAttackShow();
  const p = game.player;
  if (game.running && p) addText(p.x, p.y - 40, v ? 'Auto-Angriff an' : 'Auto-Angriff aus', 'info');
}

(function autoAttackSetup() {
  const b = document.getElementById('btnAuto');
  if (!b) return;
  const press = () => {
    // im HUD-Bearbeitungsmodus wird die Leiste nur verschoben
    if (typeof hudLayout !== 'undefined' && hudLayout.editing) return;
    autoAttackToggle();
  };
  if (typeof onPress === 'function') onPress(b, press);
  else b.addEventListener('click', press);
  b.addEventListener('contextmenu', (e) => e.preventDefault());
  autoAttackShow();
})();
