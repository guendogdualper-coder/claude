# Leistung: viele Monster und Fertigkeiten (Messung und Maßnahmen, 14.17)

Auftrag: `docs/prompt-leistung.md`. Gemessen in Headless-Chromium mit Software-Grafik (SwiftShader) auf einer stark
ausgelasteten Maschine (4 Kerne, Systemlast 10–30 durch parallele Läufe). **Absolute Zeiten sind darum viel höher und
stark gestreut** (einzelne Bilder von 250 ms tauchen vorher wie nachher zufällig auf). Belastbar sind die Zähler
(Zeichenaufrufe, Dreiecke, Texturen, Geometrien, Programme, angelegter Speicher) und die Verhältnisse.

Werkzeuge:

- `tools/leistung-test.js` – Abnahme-Messung mit echter Bildwiederholung (requestAnimationFrame, keine virtuelle Uhr):
  je Klasse „leer“, „30 Monster“, „30 Monster + alle Fertigkeiten dreimal“; Bild Ø / 95 % / schlechtestes, Rechenzeit
  im Spieltakt, Zeichenaufrufe, Dreiecke, Texturen, Geometrien, Programme, Speicherbereinigungen (`performance.memory`).
  `node tools/leistung-test.js [--klassen …] [--grafik plus] [--handy] [--groesse 960x540] [--root <ordner>] [--json datei]`
- Zusätzlich (nicht im Repo) Läufe mit virtueller Uhr: Chrome-CPU-Profil (`Profiler.start/stop`), Heap-Stichproben
  (`HeapProfiler.startSampling`), Zähler je Bild, Zählung der Effektteile nach Art, Bildvergleiche.

## Was der Profiler als Ursache gezeigt hat

1. **Fertigkeiten: tausende Zeichenaufrufe je Bild.** Im Kampf mit 30 Orks (alle Fertigkeiten, Rang-Effekte an jedem
   Treffer) zeichnete jedes Licht-Sprite und jedes Blitz-Stück einzeln: Spitze **5.434 (Krieger), 5.429 (Ninja),
   7.981 (Schamane), 2.471 (Nekromant), 6.878 (Magier)** Aufrufe je Bild – davon 3.000–4.900 additive Sprites
   (Funken, Glut, Sterne) und 1.300–2.600 additive Stäbe (Blitze, Strahlen). Jeder Aufruf mit eigener Material- und
   Programmprüfung in three.js. Das ist der Hänger „Mobs pullen und Fähigkeiten draufmachen“ – auf einer schnellen
   Grafikkarte ebenso, denn die Kosten liegen auf dem Prozessor. Dazu bekam jedes Effektteil eine eigene Geometrie
   (2.919 Geometrien im Kampf).
2. **Speicherbereinigung:** 1,2 MB neuer Speicher je Bild schon ohne Kampf, 6,0 MB im Kampf (Magier). Größte Quellen:
   `game.monsters.filter(...)` kopierte **jedes Bild alle ~7.200 Monster**, wodurch sich auch das Gebietsverzeichnis
   (`monsterIndex`) jedes Bild neu aufbaute (gedacht war alle 2 s); `THREE.Color.set('#…')` zerlegte Farb-Zeichenketten
   mit regulären Ausdrücken (Lichter, Effekte, hundertfach je Bild); Wechsel der Textur an Effektteilen setzte
   `needsUpdate` und löste jedes Bild die volle Programmprüfung aus (`getParameters`, `getProgramCacheKey`).
3. **Erstes Auftauchen:** 30 neue Figuren (Skelett, drei Materialien, Shader-Prüfung) entstanden in einem einzigen Bild.
4. **Schleifen über alle Monster der Welt:** Figuren, Namen, Zustandsanzeigen und Vorwärmen gingen jedes Bild alle
   ~7.200 Monster durch (im Profil ≈ 1,7 ms je Bild allein für die Sichtprüfung).
5. **Monstermodelle:** ein Ork ≈ 12.100 Dreiecke, dazu der Umriss mit noch einmal 12.100, Schattenmodell 3.100,
   Gesicht, Leuchten – 7 Zeichenaufrufe je Ork, einer davon das nie leuchtende Waffenleuchten.
6. **„Eine Textur je Monster“** ist keine Namensschild-Textur, sondern die Knochen-Textur des Skeletts (8×8 Gleitkomma,
   1 KB, three.js r128). Kein Hänger-Grund; siehe „bewusst nicht gemacht“.

## Maßnahmen

| # | Maßnahme | Datei |
|---|---|---|
| 1 | Additive Sprites gebündelt: alle in einem Aufruf je Textur (InstancedBufferGeometry, gleicher Shader-Inhalt wie SpriteMaterial; Licht addiert sich, die Reihenfolge ändert nichts) | `js/drei-fx.js` |
| 2 | Additive Stäbe, Wände, Scheiben, Kegel gebündelt (InstancedMesh je Form/Textur/Seite, Farbe × Deckkraft je Teil) | `js/drei-fx.js` |
| 3 | Feste Effekt-Formen geteilt statt je Teil eine eigene Geometrie | `js/drei-fx.js` |
| 4 | Texturwechsel an Effektteilen ohne `needsUpdate` (nur bei „Textur ja/nein“) | `js/drei-fx.js` |
| 5 | Farb-Zeichenketten gemerkt (`THREE.Color.setStyle`) | `js/drei-kern.js` |
| 6 | Monsterliste nur neu, wenn wirklich eines wegfällt (kein 7.200er-Kopieren je Bild, Gebietsverzeichnis wieder alle 2 s) | `js/gegner.js` |
| 7 | Nur Monster der Gebiete in der Nähe durchgehen (`v3Monsters`, Rechteck je Gebiet + größte Verfolgungsstrecke) | `js/drei-kern.js`, `js/drei-figuren.js`, `js/drei-fx.js` |
| 8 | Höchstens 6 neue Monsterfiguren je Bild (aus dem Vorrat zählt nicht), Name/Balken erst mit der Figur | `js/drei-figuren.js`, `js/drei-kern.js` |
| 9 | Gesicht und Körper in einem Aufruf (Umriss weiter nur über den Körper, gemeinsame Daten), Waffenleuchten erst sichtbar, wenn es leuchtet | `js/drei-figuren.js`, `js/nekro-totenruf.js` |
| 10 | Vereinfachtes Monstermodell, wenn die Figur im Bild unter 170 Bildpunkte hoch ist: kleine Teile mit halb so vielen Unterteilungen, große Teile (Rumpf, Kopf, Ringe, Platten) bleiben voll; gebaut beim Vorwärmen | `js/drei-kern.js`, `js/drei-figuren.js` |

## Ergebnisse

ERGEBNISSE
