# Drachenfarbe: einmalige Wahl und echte 3D-Vorschaubilder (seit 14.67)

Wunsch eines Spielers (Fenster „Stallmeisterin/Stallmeister“, Abschnitt „Farbe deiner Glutschwinge – Kostenlos,
jederzeit änderbar.“):

1. Die Farbe des Drachen soll man nur **einmal** wählen können, nicht beliebig wechseln.
2. Die gezeichneten 2D-Vorschaubilder sahen dem Drachen nicht ähnlich – sie sollen den echten Drachen zeigen.

## 1. Farbe nur einmal wählbar

Neues Spielstandfeld `dragonColorLocked` (true = Farbe endgültig gewählt), in `SAVE_FIELDS` (js/spieler.js),
beim Laden `p.dragonColorLocked = !!save.dragonColorLocked` – ältere Spielstände ohne das Feld gelten als „noch nicht
festgelegt“. Das Feld reist mit dem ganzen Spielstand in die Cloud (js/konto.js speichert die Spielstände als
Ganzes); eine Änderung der Sperre ändert den Kern des Spielstands und bekommt damit einen neuen Zeitstempel
(`saveCore`), wird also beim Abgleich übernommen. Die Netzanzeige für Mitspieler ist unverändert (Feld `dc` nur bei
einer anderen Farbe als Rot).

Stallmeister (`renderStable` in js/quests.js), drei Fälle:

| Lage | Anzeige |
|---|---|
| Noch kein Drache, ab Stufe 60 | Vier Farbkarten, Antippen merkt nur vor. „Glutschwinge kaufen“ öffnet eine **Rückfrage** mit der gewählten Farbe groß und „Diese Wahl ist endgültig …“; „Ja, kaufen – 500.000 Gold“ kauft und sperrt die Farbe, „Andere Farbe“ führt zurück. |
| Drache gekauft vor 14.67 (`dragonColorLocked` fehlt) | Hinweis „Du darfst die Farbe noch ein einziges Mal festlegen …“, vier Karten mit der **jetzigen Farbe vorgewählt**. Antippen färbt nicht mehr sofort um. „Farbe festlegen“ → Rückfrage → „Ja, diese Farbe festlegen“ setzt Farbe und Sperre; „Zurück“ bricht ab. |
| Farbe endgültig | Nur noch die gewählte Farbe als große Karte, darunter „Die Farbe ist endgültig gewählt.“ – keine Knöpfe. |

Vorwahl und Rückfrage (`ui.dragonPick`, `ui.dragonConfirm`) beginnen bei jedem Öffnen des Stallmeisters neu
(js/oberflaeche.js). Der Ratgeber-Eintrag „Kann ich die Farbe meines Drachen ändern?“ ist angepasst. Alle neuen
Texte stehen in js/sprachen/en.js (Farbnamen stehen in eigenen Elementen und werden einzeln übersetzt).

## 2. Vorschaubilder aus dem echten 3D-Modell

Statt der 2D-Zeichnung (`dragonMountArt`, Canvas zur Laufzeit) zeigt das Fenster jetzt fertige Bilder des
3D-Reittiers: **`bilder/drache-rot.webp`, `bilder/drache-blau.webp`, `bilder/drache-schwarz.webp`,
`bilder/drache-weiss.webp`** (je 320 × 216, durchsichtiger Hintergrund, 11–15 KB). `dragonPreviewUrl(color)` in
js/figuren.js gibt nur noch diesen Pfad zurück. Die vier Bilder stehen in der Liste von sw.js (offline verfügbar).

Erzeugt mit `tools/drache-farbbilder.js` (Playwright): eigene WebGL-Bühne mit durchsichtigem Hintergrund, dasselbe
Modell wie im Spiel (`dragonMount3(b, { color })`, Haltung `dragonMountPose3` in der Luft, Flügel beim Schlag oben
ausgebreitet), Dreiviertelansicht von der Seite, Licht wie beim Figurenbild im Inventar plus schwaches Gegenlicht;
groß gerendert (1600 × 1100), am Alphakanal eng ausgeschnitten, eingepasst und schrittweise verkleinert.

```
python3 -m http.server 8795        # im Projektordner
node tools/drache-farbbilder.js http://localhost:8795/
PROBE=1 node tools/drache-farbbilder.js http://localhost:8795/   # Probebilder verschiedener Haltungen (./drache-proben)
```

Warum fertige Bilder statt Rendern zur Laufzeit: gleich im 2D-Modus und ohne WebGL, kein zweiter WebGL-Kontext und
kein Rendern beim Öffnen am Handy (kein Ruckeln), 4 × ~13 KB. Nachteil: ändert sich das Drachenmodell oder eine
Farbe (DRACHE3_FARBEN), muss das Werkzeug neu laufen.

Der 2D-Drache in der Spielwelt (2D-Modus, `horseSprite`/`dragonMountArt`) bleibt unverändert – das ist die
Spielgrafik der 2D-Ansicht, kein Vorschaubild. Andere Stellen mit dem alten Vorschaubild gab es nicht
(`dragonPreviewUrl` wurde nur beim Stallmeister benutzt; Charakterfenster und Pferdeknopf zeigen nur Text).

## Tests

- Funktionstest Drache (Kopie von drache-hoehe/td8781.js, angepasst): 88 Prüfungen OK, keine Seitenfehler – u. a.
  Kauf → Wahl → Rückfrage → „Andere Farbe“ → Kauf → gesperrt; alter Spielstand mit schwarzem Drachen → jetzige Farbe
  vorgewählt → Antippen färbt nicht um → Rückfrage → Zurück → festlegen (Weiß) → gesperrt; Neuladen der Seite →
  Spielstand hat `dragonColorLocked: true`, Fenster zeigt nur noch Weiß; Netzfeld `dc` unverändert; Bilder geladen.
- s73 (12 Charaktere, alle Fertigkeiten): ohne Fehler.
- Bilder vorher/nachher (2D, 3D, Englisch) im Scratchpad-Ordner drachenfarbe/.

## Offene Punkte

- Ein Spieler mit einer noch zwischengespeicherten älteren Version (vor 14.67) kann dort weiter frei umfärben; speichert
  diese Version, fällt das ihr unbekannte Feld weg und er darf einmal neu festlegen. Mit einem eigenen Spielserver
  ließe sich das sperren, hier nicht.
