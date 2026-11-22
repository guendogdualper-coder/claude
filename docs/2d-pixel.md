# 2D-Pixel: Sicht, Sterbeanimation, Drache (seit 15.67)

Dieses Blatt sammelt, was die 2D-Ansicht im Pixel-Stil seit 15.67 anders macht. Grundlagen des Pixel-Stils
(kleine Pixel-Fläche, harte Kanten, Namen in voller Auflösung) stehen oben in `js/pixel2d.js`.

## Nur noch die herausgezoomte, schräge Sicht

- Im Pixel-Stil steht der Zoom fest auf dem kleinsten Wert (`ZOOM2D.min` = 0,7). Damit ist die schräge
  „Diorama“-Sicht (`pixelRenderTilt`) immer an: Boden perspektivisch, Figuren, Bäume und Häuser aufrecht.
- `zoom2dMul()` liefert im Pixel-Stil immer `ZOOM2D.min`, `zoom2dSet()` ändert dort nichts (Mausrad und zwei
  Finger bleiben ohne Wirkung). Der gespeicherte Zoom (`seelenstein-zoom2d`) gilt nur noch für den feinen 2D-Stil.
- Kosten: im Test (Handy-Bildgröße, doppelte Pixeldichte, Grafik „Mittel“) etwa 4–5 ms je Bild statt 2–3,5 ms in der
  flachen Sicht.

## Sterbeanimation der Monster (`js/tod2d.js`)

Vorher sank ein Monster in 2D in 0,55 s weiß aufblitzend in sich zusammen. Jetzt (nur 2D; 3D unverändert):

| Phase | Dauer | Was passiert |
|---|---|---|
| Treffer | 0,12 s | weißer Blitz über der Figur |
| Flug | 0,4–0,44 s | Bogen vom Angreifer weg (24–30 px, kleine Monster weiter), nie in Mauern, Häuser oder Wasser |
| Aufschlag | 0,16–0,18 s | Staubwolke, kleines Nachfedern, kurz danach ein Zucken |
| Liegen | 1,35 s | still am Boden (Bosse 1,9 s, Endbosse 2 s) |
| Auflösen | 0,8 s | Pixel für Pixel, oben zuerst, mit hell glühendem Rand; Lichtpunkte steigen in drei Schüben auf |

Arten (`tod2dKind`):

- **fall** – Zweibeiner (Menschen, Orks, Dämonen, Brocken, Golems): kippen nach hinten um, Drehpunkt sind die Füße;
  liegt hinter ihnen kein Platz, fallen sie zur anderen Seite, sonst sacken sie zusammen.
- **roll** – Tiere, Wildschweine, Spinnen, Schlangen: überschlagen sich und landen auf dem Rücken.
- **ghost** – Geister: steigen auf, werden schmal und lang und verwehen (1,15 s).
- **slump** – Endbosse und Aelvyr: kein Flug; ein Ruck zurück, dann sacken sie schwer zur Seite (Beben, große
  Staubwolke). Dungeon-Bosse fallen wie ihre Art, aber kürzer und mit kleinem Beben.

Technik: `vfxCorpse` (effekte.js) ruft in 2D `tod2dSetup`, das Weg, Ablauf, Staub und Lichtpunkte festlegt (`e.d2`,
`e.dur` verlängert). Die Leiche zeichnet nicht mehr `drawEffect`, sondern die Szene: `collectWorldObjects` hängt sie als
Weltobjekt `tod2d` an und sortiert sie nach der Fußlinie – in der schrägen Sicht steht sie damit aufrecht im richtigen
Maßstab. Die Auflöse-Bilder (`tod2dDissolve`) werden je Sprite einmal vorgebacken (7 Stufen; sehr große Bilder
verkleinert auf höchstens ~160.000 Bildpunkte).

## Drache von vorn und von hinten (seit 15.68)

- 15.67 hatte den Drachen beim Flug nach oben/unten geneigt – gewünscht war aber, dass er in die Flugrichtung
  **schaut** wie nach links und rechts. Das Neigen ist wieder weg.
- Fliegt er nach unten, sieht man ihn von vorn (Kopf mit Hörnern und glühenden Augen zur Kamera, Flügel ausgebreitet,
  Vorderklauen darunter), nach oben von hinten (Hinterkopf mit Hörnern, Rücken mit Zacken, Hinterbeine, Schwanz zur
  Kamera). Der Reiter dreht sich mit (Figur von vorn bzw. hinten).
- Je Ansicht zwei Bilder (`dragonFrontArt`/`dragonBackArt` in figuren.js, Ebene `back` und `front`): was hinter dem
  Reiter liegt, wird vor ihm gezeichnet, Kopf (von vorn) bzw. Schwanz (von hinten) danach. Flügelschlag wie von der
  Seite (4 Bilder).
- `dragonView2d` (zeichnen.js) wählt die Ansicht mit etwas Spielraum (Wechsel erst, wenn eine Richtung um 30 %
  überwiegt), damit er schräg nicht hin- und herspringt; im Stand behält er die letzte.

## Ruckeln in 2D (seit 15.68)

- Gemessen (Handy-Bildgröße, Grafik „Mittel“): nicht die Spielwelt, sondern die Dauer-Animationen der Oberfläche
  bremsten – wandernder Glanz auf Leben/Mana/EP, pulsierende Ulti- und Segen-Ringe, Statuspunkt-Knopf. Sie halten den
  Compositor auf 60 Bildern je Sekunde und lassen die HUD-Ebene neu malen; etwa jedes zehnte Bild hing bis zu 0,2 s
  (nur ~15 Bilder je Sekunde).
- Am Handy und Tablet steht die Oberfläche jetzt immer still (Klasse `ruhig-ui` an `<html>`, waermeschutz.js; dieselben
  festen Zustände wie die Sparoptik von „Niedrig“, Vignette und Licht bleiben). Danach: gleichmäßig 60 Bilder je
  Sekunde, Zeichenzeit im Mittel ~6 ms. Am PC bleiben die Animationen.
