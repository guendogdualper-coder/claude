# Klang-Bibel – Seelenstein (seit Version 9.4, erweitert in 9.5 bis 9.8)

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

## 1b. Echte Tieraufnahmen (seit 9.8) und Quellen

Tiere klingen seit 9.8 wie echte Tiere: Ihre Laute sind Ausschnitte aus echten Aufnahmen, nicht mehr erzeugt.
Fremde Spielklänge werden nicht kopiert (Urheberrecht); genutzt werden nur frei verwendbare Aufnahmen:

- **National Park Service, Yellowstone Sound Library** (gemeinfrei, Quelle „NPS / Yellowstone“): Grauwölfe
  (Heulen), Grizzly (Brüllen, Schnauben, Knurren), Wapiti (Röhren und Grunzen), Kojoten (Kläffen, für Hyänen),
  Rotfuchs (Schreie), Bison (Brüllen, für Oger, Trolle, Yetis und Mammuts).
  https://www.nps.gov/yell/learn/photosmultimedia/soundlibrary.htm
- **BigSoundBank.com** (Joseph Sardin, CC0): Hunde (Bellen, Knurrbellen, Aufjaulen, Heulen), Hausschwein
  (Grunzen, höher gestimmt als Quieken), Raubkatze (Fauchen), Sikahirsch (Rufe), Zombie-Stimmen (Untote, Orks),
  Kampfgrunzer (Orks). https://bigsoundbank.com/licenses.html

**Verarbeitung:**
- Je Familie ein Klangblatt `snd/tier-<familie>.mp3` (mono, 22 kHz, 40 kbit/s); die Lage jedes Lauts steht in
  `js/klang-aufnahmen.js`.
- Naturaufnahmen aus der Ferne werden entrauscht und tiefpassgefiltert. Jeder Laut wird auf gleiche Spitze
  gebracht und bekommt kurze Ein- und Ausblendungen.
- Tonhöhe: beim Bau festgelegt (z. B. Schwein höher = Quieken, Hundeheulen tiefer = sterbender Wolf) und beim
  Abspielen leicht nach Größe und Zufall verändert.
- Familien ohne eigene Aufnahme nutzen ein anderes Blatt mit eigener Tonhöhe:
  - Höllenhund: Wolf tiefer.
  - Mammut: Wapiti sehr tief (Trompeten) und Bison.
  - Drache und Dämon: Grizzly tief.
- Spinnen, Skorpione, Schlangen, Golems, Geister, Hexen, Naga, Harpyien, Menschen und Seelensteine behalten ihre
  erzeugten Laute.

**Zuordnung je Ereignis (Beispiel Hund):**
- Schrei: Bellfolge.
- Angriff: einzelnes scharfes Bellen oder Knurrbellen.
- Schmerz: kurzes, hohes Aufjaulen.
- Tod: langgezogenes Jaulen.
- Wolf: Heulen beim Schrei, tiefes Bellen und Knurren beim Angriff, Aufjaulen, sterbendes Heulen.

## 2. Monster – vier Laute je Art

Ereignisse:
- **Schrei:** Das Monster nimmt dich ins Visier.
- **Angriff:** Ausholen und Zuschlagen.
- **Schmerz:** Das Monster wird getroffen.
- **Tod:** Das Monster stirbt. Bei großen Monstern folgt ein Körperfall.

**Natürliche Stimme (seit 9.5).** Tierlaute sollen echt klingen, nicht wie ein Synthesizer. Darum hat jede
Stimme:
- **Zittern und Vibrato:** Die Tonhöhe schwankt leicht und zufällig, wie bei einem echten Kehlkopf.
- **Unterton:** Ein zweiter Ton eine Oktave tiefer gibt Brust und Größe.
- **Rauheit:** unregelmäßig aus Rauschen, nicht gleichmäßig wie ein Motor.
- **Mundöffnung:** Die Klangfarbe gleitet beim Öffnen und Schließen des Mauls.
- **Anschlag und Atem:** ein kurzes Anschlagrauschen zu Beginn, Atem im Klang und ein leichtes Flackern der
  Lautstärke.

| Familie | Arten | Klang |
|---|---|---|
| Hund | Wilder Hund, Schakal | Bellfolge (2–4 Beller), Knurren und Zuschnappen beim Angriff, Aufjaulen, Winseln beim Tod |
| Fuchs | Rotfuchs | heiserer Fuchsschrei, Keckern |
| Hyäne | Tüpfelhyäne | aufsteigendes „Whoop“ beim Schrei, kicherndes „Lachen“ in fallenden Silben |
| Wolf | Wolf, Alpha-, Eis-, Moorwolf, Warg, Fenris | langes Heulen mit Bruch, tiefes Knurren mit Unterton und Zuschnappen, Jaulen |
| Höllenhund | Höllenhund | tiefes, verzerrtes Knurren mit Feuerfauchen |
| Keiler | Wildschwein, Dornenkeiler | nasales Grunzen in Stößen, schrilles Quieken bei Schmerz und Tod |
| Bär | Braunbär, Eisbär, Ursus | tiefes Brüllen mit Brustgrollen (Unterton) |
| Katze | Luchs, Panther, Glutkatze | Fauchen mit flatterndem Atem, kurzes Knurren |
| Hirsch | Rothirsch, Donnerbock | Brunftröhren: rau, mit Stößen am Ende |
| Mammut | Wollmammut | Trompeten |
| Spinne | Wald-, Höhlenspinne, Giftspeierin, Königin | schnelles Klicken der Kiefer und Zischen, hohes Kreischen beim Tod |
| Skorpion | Wüstenskorpion | klackende Scheren, rasselnder Schwanz |
| Schlange | Sandviper, Kobra, Python | langes Zischen, beim Biss ein kurzer Schlag |
| Klapperschlange | Klapperschlange | Rassel |
| Naga | Naga, Priesterin, Königin, Vritra | zischende, gehauchte Stimme |
| Mensch | Banditen, Schützen, Kellerwachen | Ruf „Hey!“, kurzer Kampflaut beim Angriff, „Uh!“, Sterbeschrei mit Körperfall |
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

**Prompt für echte Tierstimmen (englisch, seit 9.5):**
```
Realistic animal vocalizations for a fantasy MMORPG, recorded close and dry, then a small outdoor room reverb. Natural voice: slight pitch jitter and vibrato, irregular roughness (not a steady buzz), audible jaw opening (formant glide), a short breath or noise onset, a sub-octave chest tone for big animals. Dog: a burst of 2–4 barks, a growl that ends in a snap, a sharp yelp, a whine on death. Wolf: a long howl with a pitch break, a deep growl. Fox: a hoarse scream. Hyena: rising whoop and giggles. Boar: nasal grunts and a shrill squeal. Bear: a deep roar with chest rumble. Big cat: a fluttering hiss and snarl. Red deer: a rutting roar with grunts at the end. Three variations each, mono, 32 kHz, peak −1 dB.
```

## 3. Spieler

- **Schwung:** Luft zischt vorbei. Der Dolch klingt leicht und hell, Schwert und Axt mittel, Zweihänder und
  Sense schwer mit tiefem Anteil. Zu hören ist er im Trefferbild der neuen Schlaganimation (9.3).
- **Treffer:** dumpfer Schlag mit kurzem Knacken; Blocken klingt metallisch.
- **Bogen:** Die Sehne schnalzt, der Pfeil zischt.
- **Zauber nach Element (seit 9.6 wie echt):** Knistern, Knirschen, Splittern und Geröll entstehen aus vielen
  winzigen Einzelklängen („Körnern“). Jedes Korn ist ein kurzer, abklingender Resonanzton in zufälliger Höhe, mit
  wenigen lauten Knackern und vielen leisen.
  - **Eis:** Kristalle wachsen knirschend (das Knistern wird dichter), dazu glasige Töne und zum Schluss das
    typische Knacken von Eis (ein Ton, der in 60 ms von 5 kHz nach unten fällt).
  - **Feuer:** Fauchen beim Entzünden, ein Brausen, das flackert, und prasselnde Funken.
  - **Blitz:** knisternde Ladung, ein scharfer Knall und kurzes Donnergrollen.
  - **Erde:** Fels bricht mit tiefem Schlag, Geröll prasselt, Grollen.
  - **Wasser** (Heilung des Schamanen): Plätschern, Blasen (kurze Töne, die schnell steigen) und ein sanfter
    Glanzton.
  - **Klinge:** Stahl klingt mit unharmonischen Teiltönen nach, die Luft wird geschnitten.
  - **Schatten:** Sog rückwärts (schwillt an und reißt ab), tiefes Raunen, Flüstern.
  - **Seele:** geisterhafter Hauch, schwebender Ton, feines Glitzern.
  - **Wind:** pfeifende Böe.
  - **Licht:** Akkord, der aufblüht, mit Glitzern.
  - **Blut:** nasser Schlag, Spritzer, Tropfen.
  - **Knochen:** trockenes Knacken und Splittern.
- **Große Zauber** haben eigene Klänge:
  - Donnersturm: Knall und langes, rollendes Grollen.
  - Erdbeben und Schwerkraftsiegel: Beben.
  - Blizzard: heulender Wind voller klirrender Eiskörner.
  - Heilung: Wasser.
- **Einschlag:** Trifft eine Fertigkeit, klingt der Treffer nach ihrem Element.
  - Feuer: dumpfer Knall mit Glut.
  - Eis: Splittern wie Glas.
  - Blitz: Knall mit Knistern.
  - Erde: Schlag mit Steinchen.
  - Schatten und Seele: eigene Laute.
  - Klinge: Schlag mit Metallklang.
- **Strom der Elemente (seit 9.7):** Solange er läuft, eine Schleife aus rauschendem Wasserschwall mit
  Blasen, knisternder Ladung und Feuerfauchen. Zum Schluss ein großer Platscher, ein Donnerschlag und ein Beben.
  Treffer des Strahls klingen nach Wasser, die Blitzsprünge knallen.
- **Eisstrahl:** Solange er läuft, ein kalter, zischender Strom mit Knistern (Schleife). Er wird mit der
  Entfernung leiser und endet mit kurzem Splittern.
- **Stimme (seit 9.5):** Die Figuren stöhnen nicht. Es gibt nur kurze, schnelle Laute (0,1–0,2 s), männlich
  tiefer, weiblich höher (nach dem Aussehen):
  - **Kampflaut** beim Schlag: „Ha!“, „Hm!“, „Hyah!“ oder ein scharfer Atemzug durch die Zähne. Er kommt beim
    dritten Schlag der Kette immer (etwas kräftiger), sonst bei etwa jedem dritten Schlag und höchstens alle
    0,6 s. Beim Schuss (Bogen, Zauber) manchmal.
  - **Ruf** bei Fertigkeiten: wie der Kampflaut, aber kräftiger.
  - **Treffer:** ein kurzes, kehliges „Uh!“.
  - **Tod:** ein kurzer Ausruf mit Körperfall (0,7 s).
  - Mitspieler sind leiser zu hören als die eigene Figur.
- **Belohnungen:**
  - Stufenaufstieg: aufsteigendes Glockenspiel.
  - Gold: klimpernde Münzen.
  - Gegenstand: weicher Glanzton.
  - Trank: Gluckern und Funkeln.

**Prompt Elementzauber (englisch, seit 9.6):**
```
Realistic elemental spell sound effects for a fantasy MMORPG, made from real-world textures. Ice: crystals forming with dense crunching and crackling, glassy chimes, a sharp ice crack with the descending "pew" of lake ice; ice impact like shattering glass. Fire: ignition whoosh, flickering roar, popping and crackling embers; fire impact as a dull boom with ember crackle. Lightning: electric crackle building up, a sharp thunder crack, short rolling rumble; big thunder version with long rolling thunder. Earth: rock breaking with a deep thud, gravel and pebbles raining down, low rumble. Water/healing: splashing, rising bubble pops, soft chime. Channeled ice beam: continuous cold hiss with fine crackling, loopable, ending in a small shatter. Mono, 32 kHz, peak −1 dB, three variations each.
```

**Prompt (englisch):**
```
Player combat sound set for a stylized fantasy MMORPG: weapon swooshes in three weights (twin daggers light and airy, sword and axe medium, two-handed greatsword and scythe heavy with low end), a punchy flesh impact with a short crack, a bow string snap with arrow whistle, spell casts per element (steel ring, earth rumble, fire whoosh with crackle, shadow drone, ghostly soul whisper, lightning zap, ice crystal chimes, wind gust, holy bell chord, wet blood splash, bone cracks), short male and female combat efforts only ("Ha!", "Hm!", "Hyah!", a sharp breath through the teeth; 0.1–0.2 s, never moaning), a short throaty "Uh!" when hit, a rising bell arpeggio for level up, coin jingle, soft item chime, potion gulp with sparkle. Clean, warm, mobile friendly.
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
| Bosskampf (Boss in der Nähe) | A harmonisch Moll, 100 BPM | dramatisch, treibend, Chor (siehe unten) |

**Bosskampf (seit 9.5).** Steht ein lebender Boss in der Nähe (Boss-Raum im Dungeon oder Weltboss, ab 650 px),
wechselt die Musik sofort. Sie bleibt, bis man sich weiter als 950 px entfernt (dann noch 4 s) oder der Boss stirbt.
- **Einstieg:** ein tiefer Schlag mit Becken.
- **Puls:** treibender Achtelbass (Grundton, Oktave, Quinte), große Trommeln auf 1, 2-und, 3 und vor dem nächsten
  Takt, im vierten Takt ein Trommelwirbel.
- **Harmonie:** helle, breite Fläche; Folgen i–VI–iv–V, eine mit neapolitanischem Akkord für mehr Spannung.
- **Bläserstöße** auf der Eins.
- **Chor** „Aah“ über zwei Takte.
- **Steigerung:** In der zweiten Hälfte jeder Folge eine schnelle Harfe; alle vier Takte ein anschwellendes Rauschen.
- **Sieg:** Ist der Boss tot, erklingt ein kurzer Dur-Akkord mit aufsteigenden Glocken, danach die Musik der Gegend.

**Prompt (englisch):**
```
Relaxing ambient background music for a cozy East-Asian inspired fantasy MMORPG, seamless loop, 60–75 BPM, pentatonic, soft pad chords with long attack, plucked koto/guzheng-like notes, an occasional bamboo flute phrase with gentle vibrato, a warm sub bass on root and fifth, soft frame drum, lots of hall reverb, no harsh transients. Variations: village (warm D major pentatonic), meadows (open C major pentatonic), forest (calm A minor pentatonic), snow (sparse E minor with small bells), desert/volcano (D hirajoshi with more drums), swamp and dungeon (dark G minor, low drones, sparse).
```

**Prompt Bosskampf (englisch, seit 9.5):**
```
Epic boss battle music for a stylized fantasy MMORPG, seamless loop, 100 BPM, A harmonic minor (i–VI–iv–V, one variation with a Neapolitan chord), driving eighth-note bass ostinato (root, octave, fifth), big taiko drums with a roll every fourth bar, short brass stabs on the downbeat, a wordless choir "aah", fast harp arpeggios in the second half of each phrase, a rising noise swell into every fourth bar. Starts with a deep impact and cymbal; when the boss dies a short major chord with rising bells resolves it.
```

## 4b. Lieder (seit 9.8)

Die Musik spielt keine zufälligen Töne mehr. Jede Gegend hat ein eigenes, komponiertes Lied im Stil
fernöstlicher Volksmusik, wie man sie aus asiatischen Fantasy-MMOs kennt. Alle Melodien sind eigene
Kompositionen, nichts ist aus einem anderen Spiel übernommen.

- **Aufbau:** zwei Takte Vorspiel (nur Guzheng und Fläche), dann Strophe und Refrain, z. B. im Dorf
  A–A'–B–A' über 22 Takte. Danach beginnt das Lied von vorn.
- **Instrumente:**
  - Bambusflöte (Dizi): Grundton mit Obertönen, Atemgeräusch, Vorschlag von oben als Verzierung, spätes Vibrato.
  - Xiao: tiefe, hauchige Flöte.
  - Erhu: gestrichene Saite mit Körperresonanzen, gleitet in den Ton, ausdrucksvolles Vibrato.
  - Guzheng: gezupfte Saite (Saitensimulation), spielt den Akkord als Bogen in Achteln.
  - Dazu weiche Streicherfläche, Bass auf 1 und 3, Trommel und Holzblock.

| Gegend | Tonart, Tempo | Melodie | Charakter |
|---|---|---|---|
| Dorf, Städte | D-Dur-Pentatonik, 76 BPM | Flöte, im Refrain Erhu | heiter, warm |
| Wiesen | G-Dur-Pentatonik, 84 BPM | Flöte | leicht, offen |
| Wald | A-Moll-Pentatonik, 68 BPM | Erhu, im Refrain Flöte | ruhig, wehmütig |
| Schnee, Eis | E-Moll-Pentatonik, 58 BPM | Flöte und Xiao, Glöckchen | kühl, sparsam |
| Wüste, Feuerberg | D mit kleiner Sekunde, 80 BPM | Erhu, Flöte, Handtrommeln | fremd, warm |
| Moor, Dungeons | G-Moll, 56 BPM | Xiao, dann Erhu, tiefe Trommel | dunkel |
| Bosskampf | unverändert (siehe oben) | | dramatisch |

**Prompt (englisch):**
```
Original East Asian folk-inspired village theme for a fantasy MMORPG, peaceful and nostalgic, 76 BPM, D major pentatonic, memorable lead melody on bamboo flute (dizi) with grace notes and late vibrato, chorus answered by an erhu with expressive slides, guzheng playing flowing chord arpeggios in eighth notes, soft string pad, gentle bass on beats 1 and 3, light frame drum and woodblock, warm hall reverb, seamless loop of about 70 seconds (intro – verse – verse – chorus – verse).
```

## 5. Einstellungen

Unter „Einstellungen → Ton“ gibt es:
- Klänge an/aus.
- Lautstärke.
- Musik an/aus.
- Musiklautstärke (Standard 50 %).

Am iPhone startet der Ton erst nach der ersten Berührung (so verlangt es der Browser). Der Stummschalter
schaltet alles stumm.
