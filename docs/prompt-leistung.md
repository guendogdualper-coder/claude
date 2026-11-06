# Prompt: Leistung – keine Ruckler, wenn viele Monster und Fertigkeiten im Bild sind

Arbeitsauftrag für Seelenstein (Plain-JS, three.js r128, WebGL2, Browser und App). Ziel: auch mit 30–40 Monstern im
Kampf und mehreren Fertigkeiten gleichzeitig **keine spürbaren Hänger** auf einem starken PC (z. B. RTX 3060 Ti,
120/144-Hz-Monitor) und **flüssiger** auf dem Handy. Das Aussehen soll gleich bleiben.

## Was der Spieler merkt

„Ich habe einen guten PC, aber wenn ich mehrere Mobs pulle und Fähigkeiten draufmache, gibt es kleine Lags.“

## Messung (14.16, Headless-Chromium, Software-Grafik – Verhältnisse zählen, nicht die absoluten Zahlen)

| Lage | Bild Ø | 95 % | schlechtestes Bild |
|---|---:|---:|---:|
| leer | 7,5 ms | 14 ms | 73 ms |
| 30 Orks kommen dazu | 16,6 ms | 106 ms | **206 ms** |
| 30 Orks + Fertigkeiten | 15,7 ms | 32 ms | **156 ms** |

- Zeichenaufrufe 43 → 253, Dreiecke 120.000 → **990.000**: ein Ork ≈ 7 Aufrufe und ≈ **29.000 Dreiecke**.
- Texturen 7 → 37: **jedes Monster bekommt eine eigene Textur** (vermutlich Namens-/Lebensschild oder Haut).
- `game.monsters` enthält **≈ 7.200 Monster aller Karten**; jede Schleife darüber kostet bei jedem Bild.
- Die langen Einzelbilder entstehen beim ersten Auftauchen (Modell bauen, Textur hochladen, Shader übersetzen) und beim
  ersten Einsatz eines Effekts.

## Vermutete Ursachen (prüfen, nicht raten – mit Chrome-Profiler und `renderer.info`)

1. **Erstes Auftauchen**: Modellbau, Materialien, Textur-Upload und Shader-Übersetzung im selben Bild.
2. **Zu feine Monster-Modelle**, kein Detailstufen-Wechsel (LOD) nach Entfernung, keine geteilten Geometrien.
3. **Eine Textur je Monster** statt eines gemeinsamen Atlas.
4. **Schleifen über alle Monster der Welt** (Zielwahl, Kollision, Aggro, Minikarte, Netz) statt nur über die nahen.
5. **Speicherbereinigung (GC)**: neue Objekte, Arrays, `THREE.Vector3` oder Strings in jedem Bild (Partikel,
   Schadenszahlen, Effekte) → Ruckler alle paar Sekunden.
6. **Effekte**: jede Fertigkeit baut eigene Meshes/Materialien, statt Pools wiederzuverwenden.
7. **DOM**: Schadenszahlen, Buff-Leiste, Debuff-Anzeigen, Gruppenrahmen bei jedem Bild neu schreiben.
8. **Grafik Plus**: Nachbearbeitung (Leuchten, Unschärfe) kostet je Bild extra – bei vielen Effekten messen.

## Maßnahmen (nach Wirkung sortiert)

1. **Vorwärmen**: Beim Betreten einer Karte die Modelle aller Monsterarten dieser Karte und die Effekte der eigenen
   Klasse einmal unsichtbar bauen und rendern (`renderer.compile`), verteilt über mehrere Bilder (kein großer Block).
2. **Geteilte Geometrie und Materialien** je Monsterart (nur Instanzen mit eigener Transformation), wo möglich
   `InstancedMesh` für viele gleiche Teile (Augen, Zähne, Rüstungsplatten, Partikel).
3. **LOD**: ab mittlerer Entfernung ein vereinfachtes Modell (≤ 25 % der Dreiecke), weit weg nur Silhouette.
   Zielwerte: ein normales Monster ≤ 6.000 Dreiecke nah, ≤ 1.500 fern.
4. **Ein Textur-Atlas** für Namensschilder/Lebensbalken statt je Monster eine Textur, oder die Schilder als DOM-Overlay
   mit Wiederverwendung (Pool).
5. **Räumliches Raster** (z. B. 256er-Zellen) für Monster und Spieler; alle Abfragen „wer ist in der Nähe“ nutzen es.
   Monster anderer Karten werden gar nicht erst durchlaufen.
6. **Objekt-Pools** für Partikel, Geschosse, Schadenszahlen, Effekt-Meshes; keine `new` in heißen Schleifen;
   wiederverwendete Hilfsvektoren.
7. **DOM nur bei Änderung** anfassen; Schadenszahlen gesammelt pro Bild; `transform` statt `top/left`.
8. **Fester Logik-Takt** (z. B. 60 Hz) mit Interpolation fürs Zeichnen, damit 120/144-Hz-Bildschirme die Logik nicht
   doppelt laufen lassen. Die Geschwindigkeit muss gleich bleiben (heute schon geprüft: 60/120/144 Bilder → gleicher Weg).
9. **Grafik Plus**: Leuchten in halber Auflösung, bei vielen Effekten automatisch kurz eine Stufe runter.

## Abnahme

- Messskript (Playwright, im Repo unter `tools/leistung-test.js`): Szene „leer“, „30 Monster“, „30 Monster + alle
  Fertigkeiten der Klasse dreimal“ für alle fünf Klassen; Ausgabe Ø, 95-%-Wert, schlechtestes Bild, Zeichenaufrufe,
  Dreiecke, Texturen, Anzahl GC-Pausen (über `performance.memory`, falls vorhanden).
- Ziel gegenüber 14.16: schlechtestes Bild **≤ 50 ms** beim Erscheinen von 30 Monstern (nach dem Vorwärmen),
  95-%-Wert im Kampf **halbiert**, Dreiecke mit 30 Monstern **≤ 300.000**, Texturen wachsen nicht mehr je Monster.
- Vorher/Nachher-Bilder: Monster und Effekte sehen nah gleich aus (Bildvergleich je Monsterart und Klasse).
- Handy (390×844, Grafik „mittel“): kein Rückschritt.
- Ergebnis-Tabelle vorher/nachher in `docs/leistung.md`.
