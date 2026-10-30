# Klang-Bibel – Seelenstein (seit Version 9.4)

Alle Klänge und die Musik werden im Browser erzeugt, es gibt keine Tondateien. Der Code steht in
`js/klang.js` (Mischpult), `js/klang-welt.js` (Klänge) und `js/musik.js` (Musik). Dieses Dokument
beschreibt, wie es klingen soll. Die englischen Prompts lassen sich auch für Tonerzeuger nutzen,
falls später echte Aufnahmen dazukommen.

## 1. Grundregeln

- **Ruhig und warm, nichts kreischt.** Alle Laute laufen über einen Begrenzer, damit viele gleichzeitig nicht
  verzerren. Ein kurzer Hall (2,4 s) gibt allem einen gemeinsamen Raum.
- **Ort:** Ein Laut wird leiser, je weiter er weg ist (ab 4 Kacheln, nach 28 Kacheln still). Er kommt von
  links oder rechts, je nachdem, wo er im Bild ist; im Schulterblick zur Kamera gedreht.
- **Größe:** Große Monster und Bosse klingen tiefer, Bosse lauter und mit mehr Hall.
- **Abwechslung:** Jeder Laut hat drei Varianten und klingt beim Abspielen zufällig etwas höher oder tiefer.
- **Nicht nerven:**
  - Derselbe Laut höchstens alle 40 ms.
  - Ein Schmerzlaut je Monster höchstens alle 0,5 s.
  - Ein Schrei je Monster höchstens alle 8 s.
  - Höchstens 18 Laute gleichzeitig.
- **Leistung:** Jeder Laut wird beim ersten Gebrauch einmal vorberechnet und danach nur abgespielt. Im
  Hintergrund (andere App, anderer Tab) pausiert alles.

## 2. Monster – vier Laute je Art

Ereignisse:
- **Schrei:** Das Monster nimmt dich ins Visier.
- **Angriff:** Ausholen und Zuschlagen.
- **Schmerz:** Das Monster wird getroffen.
- **Tod:** Das Monster stirbt. Bei großen Monstern folgt ein Körperfall.

| Familie | Arten | Klang |
|---|---|---|
| Hund | Wilder Hund, Schakal | zwei kurze Beller, helles Jaulen |
| Fuchs | Rotfuchs | hohes Keckern |
| Hyäne | Tüpfelhyäne | kicherndes „Lachen“ in fallenden Silben |
| Wolf | Wolf, Alpha-, Eis-, Moorwolf, Warg, Fenris | Heulen beim Schrei, Knurren und Zuschnappen beim Angriff, Jaulen |
| Höllenhund | Höllenhund | tiefes, verzerrtes Knurren mit Feuerfauchen |
| Keiler | Wildschwein, Dornenkeiler | doppeltes Grunzen, Quieken bei Schmerz und Tod |
| Bär | Braunbär, Eisbär, Ursus | tiefes, langes Brüllen |
| Katze | Luchs, Panther, Glutkatze | Fauchen und kurzes Knurren |
| Hirsch | Rothirsch, Donnerbock | langes Röhren |
| Mammut | Wollmammut | Trompeten |
| Spinne | Wald-, Höhlenspinne, Giftspeierin, Königin | schnelles Klicken der Kiefer und Zischen, hohes Kreischen beim Tod |
| Skorpion | Wüstenskorpion | klackende Scheren, rasselnder Schwanz |
| Schlange | Sandviper, Kobra, Python | langes Zischen, beim Biss ein kurzer Schlag |
| Klapperschlange | Klapperschlange | Rassel |
| Naga | Naga, Priesterin, Königin, Vritra | zischende, gehauchte Stimme |
| Mensch | Banditen, Schützen, Kellerwachen | Ruf „Hey!“, Angriffsschrei, „Ugh“, Sterbeschrei mit Körperfall |
| Hexe | Sumpfhexe | hohes Kichern |
| Untote | Untoter, Grabwächter, Ghul, Gruftkönig, Morrak | hohles Stöhnen, klappernde Knochen beim Tod |
| Ork | alle Orks, Gor'thak, Gorbag | tiefes, raues Gebrüll |
| Riese | Oger, Troll, Minotaurus, Yeti, Donnerriese, Ymir | sehr tiefes Brüllen, schwerer Körperfall |
| Golem | Lava-, Eisgolem, Steintitan, Tarkon | mahlende Felsen, Knirschen, Steinchen, tiefes Grollen |
| Dämon | Dämon, Feuerdämon, Azaroth | verzerrtes Brüllen mit zweiter, höherer Stimme |
| Geist | Frostgeist, Seelenfresser, Eiskönig | langes Heulen mit Vibrato, Luftstoß beim Angriff |
| Harpyie | Harpyie, Gargoyle | Kreischen mit Flügelschlägen |
| Drache | Feuerdrache, Drachenbrut, Urdrache, Ignar | tiefes Brüllen, Feueratem beim Angriff |
| Seelenstein | alle Steine | Kristallklang bei Treffern, Zerspringen mit Splittern beim Tod |

**Prompt (englisch, je Familie anpassen):**
```
Game sound effects for a stylized fantasy MMORPG, warm and clean, no harsh clipping, short tails with a small room reverb. Set for one creature family ({family}): an aggro call when it notices the player ({aggro}), a short attack effort sound ({attack}), a pain yelp ({hurt}) and a death cry that fades out with a body fall ({death}). Three subtle variations each, mono, 32 kHz, peak −1 dB.
```

## 3. Spieler

- **Schwung:** Luft zischt vorbei. Der Dolch klingt leicht und hell, Schwert und Axt mittel, Zweihänder und
  Sense schwer mit tiefem Anteil. Zu hören ist er im Trefferbild der neuen Schlaganimation (9.3).
- **Treffer:** dumpfer Schlag mit kurzem Knacken; Blocken klingt metallisch.
- **Bogen:** Die Sehne schnalzt, der Pfeil zischt.
- **Zauber nach Element:**
  - Klinge: Metallklang.
  - Erde: Grollen und Schlag.
  - Feuer: Fauchen mit Knistern.
  - Schatten: tiefes Raunen.
  - Seele: geisterhafter Hauch.
  - Blitz: Zischen und Knall.
  - Eis: klirrende Kristalle.
  - Wind: Windstoß.
  - Licht: Glockenakkord.
  - Blut: nasser Schlag.
  - Knochen: Knacken.
- **Stimme:** Schmerz- und Sterbelaut, männlich tiefer, weiblich höher (nach dem Aussehen).
- **Belohnungen:**
  - Stufenaufstieg: aufsteigendes Glockenspiel.
  - Gold: klimpernde Münzen.
  - Gegenstand: weicher Glanzton.
  - Trank: Gluckern und Funkeln.

**Prompt (englisch):**
```
Player combat sound set for a stylized fantasy MMORPG: weapon swooshes in three weights (twin daggers light and airy, sword and axe medium, two-handed greatsword and scythe heavy with low end), a punchy flesh impact with a short crack, a bow string snap with arrow whistle, spell casts per element (steel ring, earth rumble, fire whoosh with crackle, shadow drone, ghostly soul whisper, lightning zap, ice crystal chimes, wind gust, holy bell chord, wet blood splash, bone cracks), male and female pain grunts, a rising bell arpeggio for level up, coin jingle, soft item chime, potion gulp with sparkle. Clean, warm, mobile friendly.
```

## 4. Musik

**Ziel:** entspannt und ruhig, man kann stundenlang zuhören. Fünftonleitern mit einem leichten fernöstlichen
Klang (passend zum Stil von Vlotho), viel Hall und keine harten Schläge.

- **Instrumente:**
  - Weiche Fläche: zwei leicht verstimmte Sägezähne, tiefpassgefiltert.
  - Gezupfte Töne wie eine Zither (FM).
  - Ab und zu eine Flöte mit spätem Vibrato.
  - Weicher Bass auf Grundton und Quinte.
  - Sanfte Rahmentrommel.
  - In Schnee und Dungeon: Glöckchen.
- **Aufbau:**
  - Vier Akkorde je Durchgang, alle 8 Takte eine neue Folge.
  - Die Zupftöne kommen zufällig aus Akkord und Tonleiter.
  - Die Flöte spielt alle zwei Takte eine kurze, schrittweise Melodie.
  - Deshalb klingt es nie ganz gleich.
- **Stimmungen nach Gegend:**

| Gegend | Tonart und Tempo | Charakter |
|---|---|---|
| Dorf, Lager, Städte | D-Dur-Pentatonik, 70 BPM | warm, hell, Flöte |
| Wiesen und offene Gebiete | C-Dur-Pentatonik, 74 BPM | offen, leicht |
| Wald | A-Moll-Pentatonik, 64 BPM | ruhig, etwas geheimnisvoll |
| Schnee und Eis | E-Moll, 58 BPM | kühl, sparsam, Glöckchen |
| Wüste und Feuerberg | D mit kleiner Sekunde (Hirajoshi-artig), 78 BPM | warm, mehr Trommel |
| Moor, Ödland, Dungeons | G-Moll, 54 BPM | dunkel, tiefe Fläche, kaum Melodie |

**Prompt (englisch):**
```
Relaxing ambient background music for a cozy East-Asian inspired fantasy MMORPG, seamless loop, 60–75 BPM, pentatonic, soft pad chords with long attack, plucked koto/guzheng-like notes, an occasional bamboo flute phrase with gentle vibrato, a warm sub bass on root and fifth, soft frame drum, lots of hall reverb, no harsh transients. Variations: village (warm D major pentatonic), meadows (open C major pentatonic), forest (calm A minor pentatonic), snow (sparse E minor with small bells), desert/volcano (D hirajoshi with more drums), swamp and dungeon (dark G minor, low drones, sparse).
```

## 5. Einstellungen

Unter „Einstellungen → Ton“ gibt es:
- Klänge an/aus.
- Lautstärke.
- Musik an/aus.
- Musiklautstärke (Standard 50 %).

Am iPhone startet der Ton erst nach der ersten Berührung (so verlangt es der Browser). Der Stummschalter
schaltet alles stumm.
