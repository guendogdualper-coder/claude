# Zweite Eigenwerbung, neue Ladebilder und Ladetipps

Drei zusammengehörige Teile: eine zweite Fassung der eigenen Werbepause (Szenen aus dem Spiel mit Abschlusskarte),
acht neue Ladebilder aus dem Spiel (dieselben Bilder nutzt die Werbung) und 41 neue Tipps im Ladebild, die bei
längerem Laden alle vier Sekunden wechseln. Grundlagen der Werbung (Tagesbelohnung, Zähler, Werbenetze): `docs/werbung.md`.

## 1. Eigene Werbepause in zwei Fassungen (`js/werbung.js`)

Kommt keine echte Werbung (kein Werbenetz eingetragen oder keine Werbung da), zeigt das Spiel seine eigene Werbepause
mit 30-Sekunden-Zähler. Es gibt sie jetzt in zwei Fassungen, die sich abwechseln:

| Fassung | Inhalt |
|---|---|
| `video` | der bisherige Trailer `video/werbung.mp4` (offline: Spieltipps im Wechsel) |
| `szenen` | neu: schnelle Szenen aus dem Spiel mit kurzen Texten, Bossmusik und Abschlusskarte „Folge uns auf Instagram und TikTok“ |

- **Wechsel** (`werbungFassung`): war es zuletzt der Trailer, kommen jetzt die Szenen und umgekehrt; gemerkt im Gerät
  (`localStorage` `seelenstein.werbung.fassung`), beim ersten Mal und ohne Speicher zufällig. Fest einstellen (zum
  Ausprobieren): `WERBUNG.fassung = 'video'` bzw. `'szenen'`.
- **Rahmen für beide** (`werbungEigen`): Kopfzeile mit „Werbung“, Zähler, **Lautsprecher-Knopf** (neu, schaltet den
  Ton der Werbung stumm, gemerkt in `seelenstein.werbung.stumm`; ohne eigene Wahl stumm, wenn der Spielton in den
  Optionen auf 0 steht) und ✕ mit Abbruch-Frage; Fortschrittsbalken; „Belohnung abholen“. Regeln wie bisher: Der Zähler
  hält an, solange die Seite unsichtbar oder die Abbruch-Frage offen ist; Tasten gehen nicht ans Spiel (Escape = Frage,
  Enter = abholen); der Spielton ist stumm (`werbungTon`). Der Inhalt hängt über eine kleine Schnittstelle am Rahmen
  (`start`, `wartet`, `pause`, `weiter`, `ton`, `tick`, `fertig`, `ende`): `werbungTrailer` und `werbungSzenen`.

### Aufbau der Fassung „szenen“ (`WERBUNG_SZENEN`)

Zeiten für 30 s (bei anderer `WERBUNG.dauer` anteilig):

| Zeit | Teil | Text | Wirkung |
|---|---|---|---|
| 0–2 s | Vorspann | Schriftzug „Seelenstein“, „Das Abenteuer wartet“ | Kristallabgrund dunkel, goldener Staub, aus Schwarz |
| 2–5 s | Kristallabgrund | „Leuchtende Tiefen“ | Kristallfunken |
| 5–8 s | Lichtwacht | „Die Krone über dem Abgrund“ | Kristallfunken |
| 8–11 s | Feuerberg | „Lava, Glut und Drachen“ | aufsteigende Glut, Hitze von unten |
| 11–14 s | Drache | „Flieg mit deinem Drachen“ · „Hoch über allem“ | Windstreifen |
| 14–17 s | Turnierarena | „Kämpfe gegen Bots – jederzeit“ | Schadenszahlen mit Lichtstoß |
| 17–20 s | Endboss | „Riesige Endbosse“ · „Nur gemeinsam zu besiegen“ | Beben, rote Ränder, große Zahlen |
| 20–23 s | Frostgipfel | „Eis, Schnee und Yetis“ | Schnee |
| 23–26 s | Kazehana | „19 Städte voller Leben“ · „Handeln, Gilden, Freunde“ | Kirschblüten |
| ab 26 s | Abschlusskarte | „Folge uns auf Instagram und TikTok“, `@seelenstein.online`, Knöpfe Instagram/TikTok, „Clips, Neuigkeiten und Updates“ | Lichtwacht dunkel, Funken |

- **Bilder:** die Ladebilder `bilder/lade-<bild>.webp` (2560 × 1440, siehe 2.). Alle werden beim Start angefordert
  (zusammen etwa 1,9 MB, so viel wie der Trailer); wer die Werbung sieht, hat sie danach auch fürs Ladebild im Speicher.
  Fehlt ein Bild (offline, noch nicht da), bleibt ein dunkler Verlauf mit der Wirkung darüber.
- **Zeichnen:** eine Zeichenfläche (`.ws-leinwand`, höchstens doppelte Pixeldichte, höchstens 1920 breit) – Bild mit
  Kamerafahrt (`zoom`, `x`, `y` je Szene: Anfang → Ende), kurzer Zoom-Stoß und heller Blitz beim Schnitt, die Wirkung
  (`fx`: `funken`, `glut`, `wind`, `treffer`, `beben`, `schnee`, `blueten`), Abdunkeln am Rand und unten. Alles wird
  aus der Zeit der Werbung berechnet (`steuer.zeit`, zwischen den Zählerschritten weich weitergerechnet), nicht
  fortgeschrieben: Hält der Zähler an, steht auch das Bild. Mit „Bewegung reduzieren“ (`prefers-reduced-motion`) ohne
  Blitz, Zoom-Stoß und Beben.
- **Texte** liegen als HTML über der Fläche (scharf, vom Übersetzer erfasst): Titel unten links mit goldenem Strich,
  darunter die Zeile in Großbuchstaben; beide gleiten herein und verschwinden kurz vor dem Schnitt. Schriftgrößen
  wachsen mit der Breite der Fläche (`cqw`, sonst feste Größen). „Seelenstein“, `@seelenstein.online` und die
  Markennamen tragen `no-tr` (sonst würde „Seelenstein“ zu „Soulstone“).
- **Musik:** `snd/musik/boss.mp3` (die eigene Bossmusik, Trommeln und Chor, 40 s). Geholt und dekodiert wie die
  Spielmusik (`sndFetch`/`sndDecode`, aus dem Speicher des Service Workers, wenn schon geladen) und über den
  Audio-Kontext des Spiels gespielt – mit eigenem Regler direkt am Ausgang, weil Spielklänge und Spielmusik während der
  Werbung stumm sind. Gespielt wird ab der Stelle, die zur Zeit der Werbung passt: Die Schnitte liegen auf den Schlägen
  der Musik (ein Schlag je Sekunde, ein Takt vier Sekunden). Pause und Weiter mit dem Zähler (kurz ausgeblendet, kein
  Knacken), nach dem Zähler 3 s ausblenden; ist das Stück zu Ende (40 s), beginnt es nicht von vorn. Kein Ton (kein
  Kontext, Datei fehlt): Die Werbung läuft still. Keine Stimmaufnahmen.
- **Abschlusskarte:** echte Links (`<a href target="_blank" rel="noopener">`), Adressen aus `SOZIAL_PROFILE`
  (`js/sozial-freischalten.js`), der Name aus der TikTok-Adresse. Antippen ruft `sozialFolgen` – wie die Knöpfe an der
  Tasche (zählt auch für Seite III und IV, in den Apps über `externOeffnen`); ohne diese Datei `externOeffnen` bzw.
  `window.open`. Zeichen der Knöpfe: die vorhandenen eigenen Zeichen aus dem Spiel (`SOZIAL_GLYPHE`, mit eigener
  Verlaufs-Kennung), dazu die Namen in Schrift. Die Karte bleibt nach dem Zähler stehen, bis die Belohnung abgeholt ist.
- **Sicherheit:** keine Inline-Skripte, keine `onclick`-Attribute (nur `addEventListener`), keine fremden Skripte,
  Schriften oder Bilder; die Stile setzt das Skript wie bisher.
- **Testhaken:** `window.__werbungTest({ box, art, video, grund, rest, zeit, inhalt })`; `inhalt.zustand()` (Fassung
  „szenen“) meldet Musik, geladene Bilder, Teil und Karte.

Szenen, Texte oder Zeiten ändern: `WERBUNG_SZENEN` oben in `werbung.js`. Neue sichtbare Texte brauchen Einträge in den
Wörterbüchern (siehe 4.).

## 2. Neue Ladebilder (`bilder/lade-*.webp`, `js/kartenladen.js`)

So sind die Ladebilder eingebunden:

- **Standardbild** je Seite: `lade-licht.webp` / `lade-schatten.webp` (1920 × 1080, im Service Worker gespeichert, also
  auch offline da) und für große Bildschirme `lade-licht-4k.webp` / `lade-schatten-4k.webp` (3840 × 2160, nur bei
  Bedarf geladen).
- **Wechselnde Bilder** (`MAPLOAD_BILDER`, seit 15.36): je ein Bild in 2560 × 1440. `mapLoadVor` holt das nächste
  zufällige Bild vier Sekunden nach dem Betreten im Voraus; ist es beim nächsten Ladebild noch nicht da, bleibt das
  Standardbild. Sie stehen **nicht** in `sw.js` (wie die alten) – der Browser lädt sie bei Bedarf.

Neu (2560 × 1440, WebP):

| Datei | Szene | Seite | Größe |
|---|---|---|---:|
| `lade-kristallabgrund.webp` | Kristallhänge mit den neuen Kristallgruppen, schwebende Drusen über dem Abgrund, Monolith | beide | 247 KB |
| `lade-lichtwacht.webp` | Lichtwacht mit der Krone (goldgefasste Kristalle, Herzkristall) | beide | 285 KB |
| `lade-feuerberg.webp` | Vulkan im Lavasee mit Lavaströmen, Golems und Feuerdämonen | beide | 167 KB |
| `lade-drache.webp` | Reiter auf der Glutschwinge im hohen Flug über dem Feuerberg | beide | 143 KB |
| `lade-arena.webp` | Turnierarena, 3 gegen 3 gegen Bots, Feuerzauber | beide | 184 KB |
| `lade-endboss.webp` | Endboss Azaroth (Dämonenfürst) im Kampf mit einer Magierin, Vulkan dahinter | beide | 151 KB |
| `lade-stadt.webp` | Kazehana mit Vogelschwärmen über den Dächern, Blumenkästen, Brunnen, Weltentor | Licht | 372 KB |
| `lade-winter.webp` | Frostgipfel: Schnee, Tannen, Eiswölfe, Schlucht mit Eisschollen, Frostlager | Licht | 329 KB |

Zusammen 1,9 MB (die beiden ersetzten Bilder hatten 0,5 MB). Jedes Ladebild lädt nur sein nächstes Bild vor.

Ersetzt (gelöscht): `lade-kristall.webp` (Kristalle vor 15.82) und `lade-feuer.webp` (altes Glutlager). Weiter in der
Wechselfolge: Frostlager, Oase, Ymir, Fenris (Licht), Blutsteppe, Nachtfrost, Skarn, Ymir (Schatten).

**Neu erzeugen:** `node tools/ladebilder.js [namen] [--probe]` – startet das Spiel (Playwright, SwiftShader) in 3D
„Hoch“ mit 1280 × 720 bei doppelter Pixeldichte, setzt eine Figur der Stufe 80 an den Ort, blendet die Oberfläche aus
(nur die 3D-Fläche, ohne Namen, Balken und Wegweiser), erzwingt Tag, richtet die Szene her (Bots heranholen, Boss
rufen, Fertigkeiten wirken, Drache fliegen lassen, Vögel fast anhalten) und setzt eine freie Kamera hinter
`v3PlaceCamera`. Kristallabgrund und Frostgipfel suchen sich die Stelle selbst (`__LB.suche`: die meisten Kristalle
bzw. Tannen am Abgrund bzw. Eis). Ausgabe als WebP (Qualität 0,8). `--probe` macht schnelle Probebilder (960 × 540).

## 3. Mehr Tipps im Ladebild (`MAPLOAD_TIPPS`)

- 41 neue Tipps (zusammen 60): Zaubergeschwindigkeit und Pause zwischen Fertigkeiten, „Fähigkeiten treffen immer –
  Ausweichen und Blocken nur gegen normale Angriffe“, Rangaufstieg-Knopf an der Fertigkeitsleiste, Turnierarena gegen
  Bots und PvP-Saisons, Seelenstufen und Seelenwerte, Tages- und Wochenaufträge mit Truhen, Weltbosse, Juwelen und
  Sockel, Schwierigkeit, Pech-Schutz, Aufstieg, Erfolge, Doppel-EP, Winterfest, Erbe der Ahnen, Erfahrungsring,
  Schmied und Monster-Teile, Teilewandlerin, Endboss-Kristalle und Vernichtung, Klassensegen, Seelenstein-Karten der
  Stufe 80, Ghorvan, Ratgeberin, Weltentor, Risse, Nacht, Instanzen allein, Drachenflug, Bestenliste.
- Zahlen kommen aus den Spieldaten (`BONUS_CAPS`, `GCD_TIME`, `WB`, `PECH`, `AUFST`, `ERFOLGE` …).
- Drittes Feld je Tipp: Mindeststufe (z. B. Endgame-Tipps erst ab Stufe 60–78) oder eine Bedingung (der Tipp zu
  TikTok/Instagram nur, solange Seite III/IV gesperrt ist).
- **Wechsel:** Der erste Tipp steht gleich da. Dauert das Laden länger als gut 2 Sekunden, wechselt er alle 4 Sekunden
  (`MAPLOAD_TIPP`), alt ausblenden, neu einblenden (0,38 s). Die Tipps kommen aus einem gemischten Stapel: Erst wenn
  alle passenden dran waren, wird neu gemischt. Platz für drei Zeilen, damit nichts springt.

## 4. Übersetzungen

`neue-texte-werbung.json` (im Hauptordner): kurze Texte der Werbung in allen 14 Sprachen, die Tipps (lang) auf
Englisch. Schlüssel wie im Spiel nachgeschlagen: Zahlen als `{0}`, `{1}` …, ohne Punkt bzw. Ausrufezeichen am Ende
(der kommt beim Nachschlagen wieder dazu). Ortsnamen (Kristallabgrund, Lichtwacht, Feuerberg, Turnierarena,
Frostgipfel) und die Texte des Rahmens gab es schon.

## 5. Tests

Playwright: neue Werbung (Fassung „szenen“) über die Tagesbelohnung ganz bis zum Ende (30 s) – Ablauf Vorspann →
acht Szenen → Abschlusskarte vollständig, Texte nacheinander, Bild auf der Fläche, Musik spielt, Abbruch-Frage hält
Zeit und Musik an, „Weiter ansehen“ setzt beides fort, Abschlusskarte mit zwei Knöpfen (Adressen, `rel="noopener"`,
`target="_blank"`, keine Inline-Skripte), Antippen öffnet das Profil, Stummschalter, danach Tagesbelohnung doppelt
(Erfahrungsring 0 → 2); Fassung „video“ mit Abbruch-Frage; Wechsel der Fassungen; auch am Handy quer (844 × 390). Ladebild: alle Bilder der Wechselfolge laden, neue
Bilder in 2560 × 1440, `mapLoadVor` wählt neue, bei langem Laden wechseln die Tipps nach ~4 s und dann alle ~4 s mit
Überblenden, echter Kartenwechsel in 3D, Übersetzung (Englisch, Japanisch) greift. Keine Seitenfehler.
