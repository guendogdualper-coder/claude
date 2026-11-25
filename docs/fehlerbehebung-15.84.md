# Fehlerbehebungen in Version 15.84

Ergebnis der großen Fehlersuche (alle Systeme, 2D und 3D). Abstürze gab es keine, aber fünf echte Logikfehler und
einen möglichen Ruckler. Alle sind behoben.

## Behoben

| # | Fehler | Ursache | Lösung |
|---|---|---|---|
| 1 | Schwierigkeit mitten in Instanz oder Turm umstellbar: leicht kämpfen, auf Mythisch plündern | `diffSet` prüfte nur die Stufe | `diffSet` lehnt ab, solange `diffZone(p)` gilt oder `game.turmRun` läuft (Meldung in 14 Sprachen) |
| 2 | Turm auf Mythisch: Wer ohne Öffnen der Truhe hinausging, bekam nur Normal-Beute | Die Truhe geht beim Hinausgehen auf. Dann steht man nicht mehr in der Halle, `diffNow` liefert Normal | Neues `diffLoot` (`schwierigkeit.js`): während eines Turmlaufs die Stufe der Figur. Genutzt in `turmFinalLoot` (`turm.js`), im Bonus-Wrapper und bei den Erfolgen (`erfolge.js`) |
| 3 | „Sammler“ (Seelenstufen) und Amethyst (Juwelen) wirkten nicht auf Splitter aus Seelensteinen und Monstern | Die Splitter wurden direkt addiert, die Boni hängen an `giveSplinters` | `kampf.js` (Stein, Monster) und `ausruestung.js` (Monster) rufen `giveSplinters` auf |
| 4 | Neue Charaktere bekamen „Saison … hat begonnen · Rangpunkte halbiert (0)“ | Die Meldung kam bei jedem ersten Saison-Abgleich | Nur noch, wenn vorher Punkte da waren (`ereignisse.js`, `evSaisonCheck`) |
| 5 | Zwei Bosse falsch gebaut: Grimmholt und der Ertrunkene Ritter mit ungültiger Klingenfarbe (`THREE.Color`-Warnung); Haldor, Hrodmar, Titanenkönig und Brontes ohne Stein- bzw. Wolkenbart | Doppelte Schlüssel im selben Objekt: `blade`/`beard` waren Form und Farbe zugleich, der spätere Wert gewann | Formen heißen jetzt `bladeForm`/`beardForm` (`instanzen82.js`, `bosse3d-modelle3.js`), abgefragt in `bosse3d-modelle2.js` und `bosse3d-modelle3.js` |
| 6 | Möglicher Ruckler in 2D beim Vorbereiten der Pixelbilder | `glow()` malte ein Leuchtbild der Grafikkarte in eine Leinwand im Arbeitsspeicher, die danach gelesen wird (Zurücklesen) | `glowSprite(hex, cpu)` hat eine eigene Fassung im Arbeitsspeicher. `bakePixelSprite` markiert seine Leinwand (`_cpu`), `glow()` wählt danach |

Die Splitter aus festen Belohnungen (Quests, Tages-/Wochenaufträge, Tagesbelohnung) bleiben fest. Dort steht die Zahl
vorher im Fenster und soll stimmen.

## Geprüft, kein Fehler

- **Bots nutzen `sk.cooldown` statt `skillCooldown`:** Die Fertigkeiten der Bots sind schon beim Erstellen mit Rang
  gerechnet (`rankSk` in `abotSkills`). `skillCooldown` würde zusätzlich die Zaubergeschwindigkeit des eigenen Spielers
  anrechnen, das wäre falsch.
- **Gerätezeit:** Tagesbelohnung und Aufträge folgen der Uhr des Geräts. Das ist gewollt (ohne eigenen Server).
- **Winterfest:** drei Schneeflocken je Seelenstein, großzügig, aber gewollt.
- **Juwelen beim Verkauf:** Ein Teil mit Juwelen wird ohne Rückfrage verkauft, die Juwelen sind dann weg. Bleibt
  vorerst so; das Infofeld zeigt die Sockel.

## Test

Playwright, 2D und 3D, Lv 1 und Lv 80:

| Fall | Ergebnis |
|---|---|
| Wechsel auf Mythisch während eines Turmlaufs | abgelehnt, Stufe bleibt Normal, Meldung erscheint |
| gleiche Stufe erneut wählen | erlaubt |
| Mythisch, Turmlauf, außerhalb der Halle | `diffLoot` = Mythisch, `diffNow` = Normal |
| ohne Turmlauf | `diffLoot` = Normal außerhalb, Wechsel erlaubt |
| Seelenstein zerstört | 1 Aufruf von `giveSplinters` |
| Monster mit Splitter-Fund | 1 Aufruf von `giveSplinters` |
| Amethyst 100 %, 10 Splitter | 20 Splitter |
| 3D: alle sechs betroffenen Bosse gebaut | keine Farbwarnung, kein Seitenfehler |
