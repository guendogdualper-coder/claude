# Eigene Figur unsichtbar / Spiel „stürzt ab“ (seit 14.69)

## Meldung

„Ab und zu stürzt das Spiel ab, und dann sehe ich meinen Charakter nicht mehr.“ Auf dem Bild (PC, 3D, Lichtwacht auf
Karte 10) sind Name, eigener Lebensbalken und Questpfeil zu sehen, das 3D-Modell der eigenen Figur fehlt. NPCs sind normal.

Name, Balken und Pfeil hängen nur an der Spielerstelle und der Modellhöhe (`drawOverlay3`, `v3HeadHeight`). Die Figur
selbst braucht dagegen ein gültiges Modell auf der Grafikkarte, eine gültige Lage und Drehung, gültige Knochen und muss
in der Szene hängen. Fällt eines davon aus, bleibt genau das Bild aus der Meldung.

## Gefundene Ursachen (mit Playwright nachgestellt)

| Ursache | Wirkung vorher | Beleg |
|---|---|---|
| **Grafikkontext verloren und zurück** (Treiber-Neustart, Speicherdruck, Grafikprozess abgestürzt; `WEBGL_lose_context`) | Alle Figurenmodelle haben ihre Daten nach dem ersten Hochladen freigegeben (`freeArray`). Nach `webglcontextrestored` lud three.js sie neu hoch und scheiterte an der ersten Figur (`Cannot read properties of null (reading 'BYTES_PER_ELEMENT')`). Die Ausnahme brach die Spielschleife ab: **Standbild, das Spiel „stürzt ab“**. | `stress.js`: „Kontext zurück → STILLSTAND (keine Bilder in 25 s)“, `game.time` blieb stehen |
| **Ausnahme in der Spielschleife** (irgendwo in `update`/`render`) | `requestAnimationFrame(frame)` wurde nie wieder gerufen – jede einzelne Ausnahme fror das Spiel ein. | wie oben |
| **Modell freigegeben, Figur noch in Gebrauch** (die Verdrängung ab 160 Modellen schonte die Figuren der Fensterbilder – Charakter, Schmied, Betrachten – nicht) | Das nächste Bild einer Figur mit freigegebenem Modell scheitert an den geleerten Daten → Ausnahme bzw. Standbild. | `fehler.js` „Modell freigegeben“ (eigene Figur künstlich freigegeben): alt STILLSTAND |
| **Abgleich der eigenen Figur wirft dauerhaft** (z. B. in einer Reit-/Drachen-/Posenfunktion) | `safe()` fing den Fehler, meldete ihn einmal – die Figur wurde aber nie mehr bewegt: nach Weltentor/Teleport stand sie am alten Ort (558 Einheiten weit weg), am neuen Ort nur Name und Balken. | `fehler.js` „Abgleich wirft + Weltentor“: alt „weit weg 558.3“ |
| **Ungültige Werte** (NaN in Blickrichtung → Drehung, Knochen) | Die Selbstheilung (7.8) prüfte die Drehung *vor* `turnToward`; kam der Wert dauerhaft ungültig an, war die Figur in jedem Bild NaN → unsichtbar. | `fehler.js` „Blickrichtung NaN“: alt „Matrix NaN, Knochen NaN“ |
| **Bau des Spielermodells wirft** (bestimmte Ausrüstung/Aussehen) | Alte Figur in den Vorrat, neue nicht baubar → **keine Figur**; der Bau lief in jedem Bild neu an (Hänger ≈ Bauzeit 20–50 ms je Bild). | `fehler.js` „Modellbau scheitert“: alt „kein Actor“. Ein Zufallstest mit 600 Kombinationen (Klasse, Weg, Stufen 0–9, Plus, Seltenheit, Sets, Legende, Aussehen) fand **keinen** echten Baufehler – der Ablauf ist abgesichert, ein konkreter Auslöser ist nicht bekannt. |

Welche dieser Ursachen beim Spieler zutraf, ist nicht sicher belegbar. Am wahrscheinlichsten ist der Grafikkontext
(„stürzt ab“ = kurzes Schwarzbild/Standbild beim Treiber- oder Grafikprozess-Neustart); die anderen Pfade führen zum
gleichen Bild und sind mit abgesichert.

Nicht reproduzierbar (alles in Ordnung, alt wie neu): Weltentor nach Lichtwacht, Teleport, Drache und Pferd auf/ab (auch
schnell hintereinander und während des Weltentors), Flughöhe hoch, Ausrüstung und Aussehen ändern, alle Grafikstufen,
Fenstergröße, Tab im Hintergrund (simuliert), Tod und Wiederbeleben, Fertigkeiten inkl. Tarnung.

## Änderungen

- **drei-kern.js**: bei `webglcontextrestored` `V3.ctxGen` hochzählen und alle Figuren verwerfen (`v3ResetFigures`).
  Das 3D-Bild läuft in `try/catch`; scheitert es (`v3RenderFailed`), werden die Figuren neu gebaut (höchstens alle 3 s,
  bei Wiederholung innerhalb von 15 s auch die Welt), die Meldung kommt je Text einmal.
- **drei-figuren.js**:
  - `v3ResetFigures()`: Figuren, Vorrat, Fensterbild-Figuren und Modelle verwerfen; Probefiguren neu vorwärmen.
  - `model3`: Modell merkt seinen Grafikkontext (`m.gen`), freigegebene Modelle `m.gone3`; die Verdrängung schont die
    Modelle der Fensterbilder.
  - `playerActor3`: scheitert der Bau, 10 s kein neuer Versuch mit diesem Schlüssel; solange ein Ersatzmodell ohne
    Ausrüstung (mit, notfalls ohne eigenes Aussehen). Meldung je Schlüssel einmal.
  - `ownGuard3` (Wächter der eigenen Figur): jedes Bild Prüfung auf NaN/∞ in Lage, Drehung, Größe, Knochen und auf die
    Lage an der Spielerstelle (sonst Grundhaltung, an die Stelle, ungültige Blickrichtung zurücksetzen); etwa jede
    Sekunde: Figurengruppe und Figur in der Szene und sichtbar, Körper nicht durchsichtig, Modell gültig (sonst neu
    bauen, höchstens alle 5 s). Je Art eine Meldung „3D-Figur (eigene): … – behoben“.
- **spiel.js**: Spielschleife mit `try/catch` – ein Fehler hält das Spiel nicht mehr an; er wird je Meldung einmal als
  ungefangener Fehler weitergegeben (sichtbar in Fehlerberichten und Tests).

## Leistung

`ownGuard3` kostet ≈ 1 µs je Bild (gemessen 1,06 µs; `v3SyncActors` gesamt ≈ 206 µs in derselben Szene).
`try/catch` kostet nichts. Neu gebaut wird nur im Fehlerfall.

## Tests (Skripte im Scratchpad `figur/`)

- `stress.js` (Ninja Dolch, Ninja Bogen, Magier): alle Schritte „ok“, auch nach Kontextverlust; einzige Meldung ist die
  WebGL-Warnung „too many errors“ beim Freigeben der Objekte aus dem alten Kontext (harmlos, gab es vorher schon für die
  Welt).
- `fehler.js` (Fehler gezielt ausgelöst): alt 5× Figur fehlt bzw. Standbild, neu alles „ok“.
- `fuzz.js`: 600 zufällige Spielerfiguren ohne Ausnahme.
- s73 (12 Charaktere): ohne Fehler. Drachentest (td8781, an die Kaufrückfrage von 14.67 angepasst): alt und neu gleich
  (65 OK; 4 Farbprüfungen scheitern an der Änderung „Drachenfarbe nur einmal wählbar“ aus 14.67, nicht an dieser).
