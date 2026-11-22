# Beispielvideos (22.11.) – was wir daraus übernommen haben

Die Videos dienten als Vorbild dafür, *wie* etwas aussehen oder klingen kann. Übernommen wurden Techniken und Ideen,
keine Bilder, Töne oder Figuren: alles ist selbst gebaut (Code, selbst erzeugte Klänge).

Zwei der sieben Videos (DfSZuNNoIpN, Df1WHwQhLdE) ließ Instagram ohne Anmeldung nicht laden (Abruf-Sperre). Einen Skill
namens „pixelfx“ gibt es in dieser Umgebung nicht; die 2D-Ideen sind direkt im Spielcode umgesetzt.

## 2D

| Video | Inhalt | Umsetzung |
|---|---|---|
| DfgvpraBYEv | Flache Pixel-Bäume wiegen sich im Wind: das Bild wird zeilenweise zur Seite verschoben (oben mehr, unten nichts), auf ganze Bildpunkte gerundet; Wind als Welle über die Karte, dazu Böen; der Schatten geht mit | **15.55, `js/wind2d.js`**: Bäume, Blütenbäume, Tannen und tote Bäume in der 2D-Welt wiegen sich. Versatz der Spitze bis 3 Einheiten, Verlauf Höhe^1,7, Stamm unten fest. Welle schräg über die Karte (wie die Wolkenschatten), alle 10 s eine unterschiedlich starke Böe, die durchs Bild fegt. Tannen und tote Bäume sind steifer. Die verbogenen Bilder werden einmal je Stufe gebacken (höchstens 72 im Speicher), danach ein drawImage je Baum wie vorher – gemessen +0,2 ms je Bild. Auf Grafik „Niedrig“ steht der Wind still. |
| DeIa5CwIUUi | Gesichter aus wenigen grauen Einzelteilen (Kopf, Augen, Haare, Bart, Mantel); jeder Grauton ist ein Platzhalter, der beim „Geborenwerden“ gegen eine echte Farbe getauscht wird – Völker ändern nur, was sie brauchen | Noch nicht umgesetzt. Passt für bunter gemischte 2D-Stadtbewohner und Zuschauer (Grau-Vorlage je Teil + Farbtausch je Figur). |

## 3D und Klang

| Video | Inhalt | Umsetzung |
|---|---|---|
| De8b2CcJatN | Ein Erdzauber in zehn Stufen: Steinsäule, rasender Bodenriss zum Ziel, Grollen + Wackeln, Trefferstopp, Hochschleudern + Betäuben, Brocken fliegen, Geröll bleibt liegen, Säulenspur, Krit | **15.55, `js/erdbeben.js`**: Bei den **Erdspitzen** rast zuerst ein glühender Riss (0,16 s) vom Magier zum Ziel, dann brechen die Dornen aus (3D und 2D, für Mitspieler gleich). **Geröll bleibt liegen** (3 s, dann versinkt es) nach Steinschlag, Erdspitzen, Bergsturz und Schwerkraft. **Trefferstopp** bei Steinschlag (0,05 s), Erdspitzen (0,04 s) und Bergsturz (0,07 s), wenn etwas getroffen wird. Hochschleudern, Betäuben, Brocken, Wackeln und Steinsplitter (Rang-Boni) hatte der Erdmagier schon. |
| DdyoLjxMGIn | Hammerschlag mit Blitzen, die über den Boden kriechen, Funkenregen, Lichtsäule; Klang aus elektrischem Knistern, tiefem Einschlag und zischenden Splittern | Funken und Lichtsäulen hat der Blitzmagier schon. Kriechende Bodenblitze wären möglich, aber nur ohne Bodenring/Runenkreis (Regel). Klang-Idee „in Schichten“ siehe unten. |
| Dd9Fu3vsLqp | Speer-Angriffe eines Roboters: glühende Bögen, Funken, Blendblitz; Klang aus Servomotoren, Luftzischen, schweren Metalltreffern | Glühende Bögen, Funken und Blendblitz stecken seit 15.52 im Klingenbogen des Kriegers. Servo-Klänge passen nicht zu Figuren aus Fleisch und Blut. |

**Klang in Schichten** (aus den beiden Klang-Videos): Ein Treffer klingt satter, wenn mehrere kurze Klänge übereinander
liegen – Anschlag, tiefer Schlag, Nachklang (Splitter, Zischen). Seit 15.55 bekommen die Erdspitzen ein kurzes, hohes
Grollen, das mit dem Riss läuft (`beben`, schneller abgespielt), und beim Ausbruch ein Felsknirschen (`treffer_stein`)
über dem üblichen Wirk- und Einschlagklang.

## Pixel-Stil für 2D (15.55, nach einem Bild vom 22.11.)

Wunsch: die 2D-Ansicht im Stil klassischer Pixel-Rollenspiele (scharfkantige Pixel, kräftige Umrisse, Boden mit
Struktur). Übernommen ist nur der allgemeine Stil, keine Figuren, Bilder oder Oberflächen eines bestimmten Spiels.

- **Pixel-Fläche** (`js/pixel2d.js`): Die Welt wird in eine kleine Fläche gemalt (ein Bildpunkt = 1,35 Welt-Einheiten,
  eine Spielfigur ist gut 35 Bildpunkte hoch) und ohne Glättung hochgezogen. Die Kamera rastet auf ganze Bildpunkte,
  der Rest wird beim Hochziehen ausgeglichen – kein Flimmern beim Laufen. Namen, Balken, Zahlen und Wegweiser kommen
  danach in voller Auflösung darüber.
- **Pixel-Bilder**: Figuren, Monster, Bäume, Häuser werden direkt im Pixel-Raster gebacken: harte Kanten und ein
  durchgehender, einen Bildpunkt breiter dunkler Umriss (`bakePixelSprite`).
- **Pixel-Boden**: Bodenblöcke in Pixel-Auflösung, darüber je Bodenart ein Muster (Grashalme mit hellen Spitzen,
  Kiesel auf Wegen, Sprenkel auf Sand und Schnee, Risse im Fels; weiche Flecken gestreut statt Kästchen).
- **Einstellung**: Grafik → „2D-Stil“: Pixel (Standard) oder Fein (die bisherige weiche Zeichnung). 3D ist unberührt.
- **Leistung**: gemessen 2–5 ms je Bild wie vorher; es werden viel weniger Bildpunkte gemalt.

Mögliche nächste Schritte: kräftigere Farben je Gegend, Holzzäune und Kopfsteinpflaster-Wege mit einzelnen Steinen,
Dächer mit Schindeln, Bildpunkt-Schrift für Gegenstands-Fenster.
