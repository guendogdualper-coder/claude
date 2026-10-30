# Seelenstein – Grafik-Bibel (Version 7.9)

Dieses Dokument beschreibt, wie **alles** in Seelenstein aussehen soll: Licht und Schatten, die
Spielerfigur, jedes Ausrüstungsteil in jeder Stufe, alle Monsterfamilien, Boden, Gras und Wasser
sowie jede Attacke jeder Klasse (Abschnitt 9: Grundangriffe, alle Fertigkeiten beider Wege, Buffs,
Ultimates, Ränge und Zustände).
Es ist zugleich die Bauanleitung für den Code (`js/drei-*.js`) und eine Sammlung von Prompts für
Konzeptbilder (englisch, unten in jedem Abschnitt).

Wichtigste Regel: **Jedes Teil wird an seiner Form erkannt, nicht an seiner Farbe.** Die Kamera
schaut schräg von oben, eine Figur ist auf dem Handy nur 60–120 Pixel hoch. Was man unterscheiden
soll, muss die Silhouette verändern: Hörner, Flügel, Zacken, Kronen, Schweife, Strahlenkränze.
Kleine Nieten und Muster sind nur das Sahnehäubchen.

---

## 1. Stil und Grundregeln

- **Stil:** Chibi-Proportionen (großer Kopf, kurzer Körper), weiche runde Formen, dicke dunkle
  Umrisslinie, Zeichentrick-Schattierung in drei Stufen mit kühlem blau-violettem Schatten und warmem
  Licht. Vorbild: moderne Anime-MMOs auf dem Handy.
- **Lesbarkeit aus der Draufsicht:** Wichtige Merkmale liegen **oben und außen** (Kopf, Schultern,
  Rücken, Waffe), denn die Kamera sieht vor allem die Oberseite. Füße und Gürtel sind nur kleine
  Akzente.
- **Material erkennbar machen:**
  - Metall hat Glanzpunkte (`shine`) und eine hellere Oberkante (`top`).
  - Leder und Stoff sind matt mit dunklerer Unterseite (`shade`).
  - Leuchtende Teile (Kristalle, Runen, Glut) nutzen das Leuchtmaterial (`glow`).
- **Farbe + Form + Leuchten** – jede Stufe hat alle drei:

| Stufe | Name | Material | Farbwelt | Form-Leitmotiv | Leuchten |
|---|---|---|---|---|---|
| 0 | Grund | Leder, Leinen, Eisen | Braun, Beige | schlicht, rund, Nähte und Riemen | – |
| 1 | Solide | Bronze, Kettenringe | Bronze, Rostrot | geschichtet, Nietenreihen | – |
| 2 | Gut | Mondstahl | Silberblau | geschwungene Mondsicheln, Bögen | – |
| 3 | Selten | Drachenschuppe | Blutrot, Schwarz, Gold | Hörner, Schuppen, Krallen | rote Edelsteine |
| 4 | Legendär | Seelenkristall | Violett, Nachtblau | schwebende Kristalle, Spiralrunen | violett |
| 5 | Mythisch | Obsidian, Asche | Schwarz, Glutorange | gezackte Dornen, Risse | Glut in den Rissen |
| 6 | Himmlisch | Himmelssilber, Federn | Weiß, Himmelblau | Flügel, Federn, Sternspitzen | hellblau |
| 7 | Göttlich | Göttergold | Gold, Weiß | Sonnenscheibe, Strahlenkranz, Kronen | goldweiß |

---

## 2. Licht und Schatten

- **Sonne** von Südosten, warm (`#fff0d4`). **Himmelslicht** kühl von oben, **Bodenlicht** in der
  Farbe des Gebiets (Grün auf Wiesen, Sand in der Wüste).
- **Zeichentrick-Rampe:** drei weiche Stufen. Schatten sind blau-violett getönt statt grau, das Licht
  bleibt warm.
- **Randlicht:** An den Kanten jeder Figur leuchtet auf der Sonnenseite ein warmer Rand, auf der
  Schattenseite ein kühler blauer. So heben sich Figuren vom Boden ab.
- **Echtzeit-Schatten der Figuren:**
  - Sie werden von einem **vereinfachten Schattenmodell** geworfen (grobe Körperform ohne Kleinteile).
    So kostet der Schatten nur ein Bruchteil, und das sichtbare Modell kann mehr Details haben.
  - Waffe, Umhang, Hörner und Flügel gehören mit ins Schattenmodell, damit der Schatten die Silhouette
    zeigt.
- **Kontaktschatten:** weicher dunkler Fleck direkt unter jeder Figur. So „steht“ sie auf dem Boden
  und schwebt nicht.
- **Eingebackene Weltschatten:** Bäume, Häuser und Felsen haben ihren Schatten in die Bodenfarbe
  gebacken. Das kostet keine Leistung.
- **Umgebungsverdeckung:** Am Fuß jedes Objekts liegt ein dunkler Kranz.

---

## 3. Die Spielerfigur

### Körper
- Kopf rund mit vollen Wangen, große Augen mit Iris, Pupille, zwei Glanzpunkten und Lidstrich,
  Brauen zeigen die Stimmung.
- Hals, Schultern, Oberarme, Unterarme, Hände (Fäustling mit Daumen), Taille, Hüfte, Beine mit Knien.
- **Kleidung in Schichten:** Unterkleid, Oberteil, Rüstung, Gurte, Umhang. Jede Schicht ragt etwas
  über die darunter hinaus, damit man die Schichtung als Kanten sieht.
- **Stoff:** Säume als dünne Wülste, Falten als flache Rillen. Ärmel und Hosen sind unten weiter oder
  gebunden.
- **Haare:** Strähnen mit Glanzband. Unter Helm oder Kapuze schaut bei Frauen ein Zopf heraus.

### Klassen-Grundform
- **Krieger:** breit, kräftig, Platte über Fell und Leder, Wickelbänder, schwere Stiefel.
- **Ninja:** schmal, gebunden, weite Hakama-Hose, Wickelbänder, Gurte mit Wurfmessern, Kapuze und
  Maske.
- **Schamane:** weite Robe mit Saumborte, weite Ärmel, Schärpe mit Talismanen, Perlenkette,
  Stirnschmuck.
- **Nekromant:** zerfetzte Robe, Knochen und Schädel als Schmuck, Kapuze mit leuchtenden Augen,
  grüne Seelenrunen.
- **Magier (seit 8.6):** langer geschichteter Mantel über der Robe, hoher steifer Stehkragen, schmale Ärmel mit Glockenstulpen,
  Buch an einer Kette am Gürtel, spitzer Krempenhut; Zepter mit schwebendem Kristall. Indigo und Silber, die Farbe des
  gewählten Elements nur an Kristall, Hutband, Saumrunen und Handlicht. Keine Schärpe, keine Federn, kein Gold, keine Kapuze.
  Männlich: gerade knöchellange Robe mit Mittelschlitz und kurzem Schultercape. Weiblich: Korsage mit Silberschnürung,
  A-Linie ab der Hüfte, langer silberner Zopf vor der Schulter.

### 3.x Mann und Frau, Frisuren, Bärte (seit 9.2)

**Ziel:** Auf einen Blick erkennbar, ob ein Mann oder eine Frau spielt, auch mit Helm.

- **Männer:** Bart in der Haarfarbe (Kurz, Vollbart, Zopfbart mit Goldring, Schnurrbart mit kleinem Kinnbart
  oder keiner); Kiefer etwa 8 % breiter und tiefer, Körper etwa 8 % kräftiger, dicke gerade Brauen, kein Lidstrich.
- **Frauen:** Körper schmaler (etwa 96 %), Taille, Wimpern mit zweitem Schwung, rote Lippen, kleine Gold-Ohrringe
  mit Perle; unter Helm oder Kapuze hängt ein geflochtener Zopf mit rotem Band heraus.
- **Frisuren:** Kurz, Dutt, Lang, Stachelig, Pferdeschwanz, Glatze, Zerzaust, Zurückgekämmt, Irokese,
  Haarknoten, Mähne. Alle sind aus einzelnen Strähnen gebaut, mit Glanzband und dunklen und hellen Strähnen im Wechsel.
- **Helm verstecken:** Helm, Kapuze, Hut oder Maske werden nicht gezeichnet, die Werte zählen weiter. Dann sieht
  man die Frisur, beim Ninja auch den Mund und beim Nekromanten normale Augen statt Leuchtaugen.

**Prompt (englisch):**
```
Character customization sheet for a stylized 3D toon fantasy MMORPG, chibi proportions, front three-quarter view, two rows: top row male heroes (warrior, ninja, shaman, necromancer, mage) each with a clearly visible beard in the hair colour – short beard, full beard, braided beard with a gold ring, moustache with a small chin tuft – broader jaw and slightly bulkier body; bottom row female heroes with slimmer bodies, eyelashes, red lips, small gold earrings with a pearl and a braid hanging out under the helmet. Hair styles shown without helmets: short, bun, long, spiky, ponytail, bald, messy, slicked back, mohawk, top knot, wild mane. Thick dark outlines, soft toon shading, no text.
```

---

## 4. Ausrüstung je Platz und Stufe

Jede Zeile beschreibt das **Merkmal**, also das, was die Silhouette verändert, dazu die Details.

**Umsetzung (seit 7.9):** `js/drei-ausruestung.js`. `humanoid3` baut den Körper in den Grundfarben der
Klasse und ruft danach `c.gear(A, g)` auf; `g` enthält die Maße der Figur (Hüfte, Brust, Schultern,
Hals, Kopf, Gürtelmitte). Dort entstehen:
- `armorLook3` (Grundform der Rüstung umstellen: Lederweste, Kettenhemd, Lamellen, Harnisch …) und
  `ARMOR3[klasse][stufe]` (Merkmal auf Brust, Rücken, Saum),
- `kriegerHelm3`, `ninjaHelm3`, `shamanHelm3`, `nekroHelm3` (in Kopfradien gebaut, Kopfmitte = 0),
- `gearShoulders3`, `gearBoots3`, `gearBelt3`, `gearCape3` (Länge, Weite und Saumform je Stufe),
- `shield3` (eigene Form je Stufe, Mandelschild ab Eisen) und `weapon3` (Klinge, Parierstange,
  Knauf bzw. Kopfstück je Stufe, siehe 4.11).
Hilfen für Motive: `crescent3`, `sun3`, `wing3`, `floatGem3`, `emberSpike3`, `skull3`, `star3`,
`flame3`, `curvedHorn3`; Lage auf dem Körper: `onBody3` (Rahmen auf der Rumpfoberfläche),
`bodyLine3` (Nähte, Risse, Schnürung), `bodyRing3`/`arcAt3` (Ringe und Rippen).

### 4.1 Rüstung – Krieger
| Stufe | Name | Merkmal | Details |
|---|---|---|---|
| 0 | Lederpanzer | Lederweste mit Schnürung vorn | Kreuzschnürung, aufgenähte Lederriemen, Fellkragen |
| 1 | Kettenhemd | Kettenringe über Brust und Bauch | Ringreihen als Wülste, Ledergurt quer, Bronzeschnalle |
| 2 | Lamellenpanzer | Reihen überlappender Lamellen | silberblaue Platten, Mondsichel auf der Brust |
| 3 | Drachenpanzer | Drachenkopf auf der Brust, Schuppenplatten | rote Schuppen, Dornen an den Beintaschen, rotes Auge |
| 4 | Seelenpanzer | schwebender Seelenkristall vor der Brust | violette Runenlinien, Spirale auf der Platte |
| 5 | Aschenpanzer | Dornenkranz am Kragen | schwarze gezackte Platte, glühende Risse |
| 6 | Himmelspanzer | Flügelwappen auf der Brust | Beintaschen wie Federn geschichtet |
| 7 | Götterpanzer | Sonnenscheibe auf der Brust, hoher Kragen | drei Lagen Beintaschen, goldene Strahlen |

### 4.2 Rüstung – Ninja
| Stufe | Name | Merkmal | Details |
|---|---|---|---|
| 0 | Leinenwams | schlichtes Wickelhemd mit Strickgürtel | Knoten vorn |
| 1 | Lederwams | Lederbrustschutz über dem Wams | Riemen und Schnallen |
| 2 | Schattenwams | lange Schärpenenden hinten | silberne Mondsichel am Kragen |
| 3 | Viperngewand | Schlangenkopf-Schließe | grüne Schuppenweste, Fangzähne als Schnalle |
| 4 | Nachtgewand | leuchtende violette Nähte | schwebende Seelenfunken an der Schulter |
| 5 | Aschengewand | verbrannte, gezackte Säume | Glutfäden in den Säumen |
| 6 | Sternengewand | Sternenmuster | weiße Sterne auf Nachtblau, Silbersaum |
| 7 | Göttergewand | Sonnenwappen am Rücken | goldgesäumter Kragen in zwei Lagen |

### 4.3 Robe – Schamane
| Stufe | Name | Merkmal | Details |
|---|---|---|---|
| 0 | Leinenrobe | schlichte Robe | einfache Saumborte |
| 1 | Seidenrobe | große Schleife an der Schärpe | Seidenglanz |
| 2 | Kranichrobe | Federsaum | weiße Federn am Saum, Kranich-Stickband |
| 3 | Phönixrobe | flammenförmige Saumspitzen | rot-orange, Goldborte |
| 4 | Drachenrobe | Drachenperle vor der Brust | Schuppenband um die Taille |
| 5 | Glutrobe | glühender Saum | Glutsplitter schweben auf |
| 6 | Himmelsrobe | gewellter Wolkensaum | durchscheinender Überwurf |
| 7 | Götterrobe | Sonnenmedaillon, hoher Kragen | zweite goldene Lage |

### 4.4 Robe – Nekromant
| Stufe | Name | Merkmal | Details |
|---|---|---|---|
| 0 | Grabtuch | zerfetzte Binden | lose Enden |
| 1 | Aschenrobe | graue Robe mit Aschenflocken | Strickgurt |
| 2 | Knochenrobe | Rippenkorb über der Brust | Knochenschnalle |
| 3 | Seelenrobe | leuchtender Saum | grüne Seelenflammen |
| 4 | Totenkönigsrobe | Schädelkragen | Kette mit Schädel |
| 5 | Schattenrobe | lange Rauchschwänze | Dornen am Kragen |
| 6 | Sternenrobe | Sternbilder | leuchtende Punkte verbunden |
| 7 | Götterrobe | goldene Knochenrüstung | Halbmond-Kragen, Goldsaum |

### 4.4a Robe – Magier (seit 8.6)
Die Elementfarbe (Feuer Karmin `#e8362a`, Frost Königsblau `#3a7bff`, Blitz Gelbweiß `#ffe94a` mit Violett,
Erde Bernstein `#f0a830` auf Basalt) sitzt **ab Stufe 0** an Hutband, Buchschließe und Handlicht, damit man
die vier Elemente auch in 2D auseinanderhält. Ohne bekannten Weg: Arkan-Blau `#b8c4ff`.

| Stufe | Name | Merkmal | Details |
|---|---|---|---|
| 0 | Novizenrobe | schlichte Wollrobe | Strickgürtel, Lesezeichenband, Hutband in Elementfarbe |
| 1 | Gelehrtenrobe | steifer Stehkragen | Buch an Kette, drei Silberschließen |
| 2 | Runenmantel | offener Übermantel, hoher Kragen | sechs leuchtende Dreiecksrunen am Saum |
| 3 | Kristallrobe | schwebende Kristalle über den Schultern | Kristallspitzen am Saum |
| 4 | Arkanrobe | Tabard mit Element-Dreieck | dünner Runenring dreht sich um die Taille |
| 5 | Aschenmantel | glühende Glutrisse | glimmender Saum |
| 6 | Sternenmantel | Sternbilder auf Nachtblau | Halbmondschließe, kleines Astrolabium am Rücken |
| 7 | Erzmagierornat | doppelter Stehkragen | Siegelring hinter dem Rücken, Goldsaum |

### 4.5 Helm / Kopf
| Stufe | Krieger | Ninja | Schamane | Nekromant |
|---|---|---|---|---|
| 0 | Lederkappe mit Ohrklappen | Stoffkapuze | Stirnband | zerrissene Grabkapuze |
| 1 | Bronzehelm mit Nasenschutz und Kamm | Lederkapuze mit Stirnband | Seidenhaube mit Bändern | Kapuze mit Aschenband |
| 2 | Eisenhelm mit Mondsichel-Stirnzier | lange Kapuzenschweife, Mondplatte | Kranichkamm mit weißen Federn | Knochenhelm mit Kiefer |
| 3 | Drachenhelm: Hörner, Kieferwangen, roter Busch | Viperkapuze mit Fangzähnen | Phönixkrone aus Flammenfedern | Seelenhaube mit grüner Flamme |
| 4 | Seelenhelm: Augenschlitz leuchtet, Kristallkrone | Nachtmaske mit Leuchtlinien | Drachenkrone mit Hörnern und Perle | Totenkönigskrone aus Dornen |
| 5 | Aschenhelm: Krone aus Zacken | Oni-Maske mit Hörnchen | Glutkrone mit schwebender Glut | Schattenkrone mit langen Hörnern |
| 6 | Himmelshelm mit großen Flügeln | Sternenmaske mit Stirnstern | Wolkenkrone mit Flügeln | Sternenkapuze mit Lichtpunkten |
| 7 | Götterhelm mit Sonnenscheibe und hohem Kamm | goldene Fuchsmaske mit Ohren | Götterdiadem mit Sonnenscheibe | Götterschädel mit Heiligenschein |

**Magier (seit 8.6)** – spitzer Krempenhut (Kegel auf breiter Krempe, Band in Elementfarbe), bei Frauen leicht schräg:

| Stufe | Magier |
|---|---|
| 0 | Novizenhut mit geknickter Spitze |
| 1 | Gelehrtenhut mit Silberband und Elementstein |
| 2 | Runenhut (höher) mit leuchtendem Runenband |
| 3 | Kristallhut, die Spitze endet in einem schwebenden Kristall |
| 4 | Arkanhut mit glühender Krempe und schwebendem Dreieck über der Spitze |
| 5 | Aschenhut, verkohlt, mit Glutlöchern und Rauchfaden |
| 6 | Sternenhut mit Sternpunkten, gerollter Spitze und kreisendem Stern |
| 7 | Erzmagierreif (kein Hut): Silberreif mit drei schwebenden Kristallen |

### 4.6 Schultern
Die Grundform richtet sich nach der Klasse: Krieger große Platte, Ninja kleine Lederkappe, Schamane
Stoffmantel, Nekromant Schädel. Das **Stufenmerkmal** sitzt obendrauf:

| Stufe | Merkmal |
|---|---|
| 0 | Lederkappe mit Naht und Riemen |
| 1 | zwei Lagen, Nietenreihe am Rand |
| 2 | Rand nach oben geschwungen wie eine Mondsichel |
| 3 | drei Schuppenplatten und zwei Hörner nach hinten |
| 4 | schwebender violetter Kristall darüber |
| 5 | drei gezackte Obsidianzacken mit Glut |
| 6 | kleine Flügel aus drei Federn |
| 7 | breite Goldplatte mit Strahlenkranz |

### 4.7 Umhang
| Stufe | Name | Merkmal |
|---|---|---|
| 0 | Wollumhang | kurz, schlicht |
| 1 | Reiseumhang | gerollte Kapuze am Kragen, Bronzeschließe |
| 2 | Jägerumhang | lang, unten in zwei Zipfel geteilt, Fellkragen |
| 3 | Drachenumhang | unterer Rand gebogen wie Drachenflügel, Rückenkamm |
| 4 | Seelenumhang | leuchtender Saum, Seelenfunken |
| 5 | Aschenumhang | zerfetzter Rand, glühende Brandlöcher |
| 6 | Himmelsumhang | aus Federlagen |
| 7 | Götterumhang | lang wie ein Königsmantel, Goldrand, Sonnenwappen |

### 4.8 Schuhe
| Stufe | Name | Merkmal |
|---|---|---|
| 0 | Stoffschuhe | Stoffwickel, flache Sohle |
| 1 | Lederstiefel | umgeschlagene Stulpe |
| 2 | Wanderstiefel | Schnürung, Eisenkappe |
| 3 | Drachenstiefel | Krallenzehen, Schuppenschienbein |
| 4 | Seelenstiefel | schwebender Leuchtring am Knöchel |
| 5 | Aschenstiefel | Obsidiandornen am Schienbein |
| 6 | Himmelsstiefel | kleine Flügel am Knöchel |
| 7 | Götterstiefel | goldene Beinschienen, Sonnenscheibe am Knie |

### 4.9 Gürtel
| Stufe | Name | Merkmal |
|---|---|---|
| 0 | Stoffgürtel | Knoten mit hängenden Enden |
| 1 | Ledergürtel | Schnalle und Tasche |
| 2 | Kettengürtel | hängende Kettenbögen |
| 3 | Drachengürtel | Drachenkopfschnalle |
| 4 | Seelengürtel | leuchtende Kristallschnalle |
| 5 | Aschengürtel | Schädelschnalle mit Glutaugen |
| 6 | Himmelsgürtel | Federn und Bänder hängen herab |
| 7 | Göttergürtel | Sonnenschnalle, goldene Plättchen hängen herab |

### 4.10 Schild (Krieger)
| Stufe | Name | Merkmal |
|---|---|---|
| 0 | Holzschild | rund aus Brettern, Eisenbuckel |
| 1 | Bronzeschild | Bronzeringe |
| 2 | Eisenschild | Drachenform (Mandel), Mondsichel |
| 3 | Drachenschild | Drachenkopf-Relief, Dornen am Rand |
| 4 | Seelenschild | schwebender Runenkreis davor |
| 5 | Aschenschild | gezackter Rand, Glutrisse |
| 6 | Himmelsschild | Flügel an den Seiten |
| 7 | Götterschild | Sonnenschild mit Strahlen |

### 4.11 Waffen
Jede Waffenart behält ihre Grundform. Die Stufe ändert Klinge, Parierstange und Knauf:

| Stufe | Klinge | Parierstange / Kopf | Knauf / Schaft |
|---|---|---|---|
| 0 | gerade, schlicht | einfacher Querbalken | Holzgriff |
| 1 | breit wie ein Blatt | Bronze, runde Enden | Lederwicklung |
| 2 | sichelförmig gebogen | Mondsichel | silberner Ring |
| 3 | Sägezahn-Rücken | Drachenflügel, roter Stein | Drachenklaue umfasst den Knauf |
| 4 | leuchtende Hohlkehle, Runen | Dornenkranz | schwebender Kristall |
| 5 | gezackt, Obsidian | Zackenkranz | Glutschneide |
| 6 | schlank, hell | Federflügel | Sternspitze |
| 7 | breit, golden | Sonnenscheibe mit Strahlen | Leuchtschneide |

Für die anderen Arten gilt dasselbe Muster:
- **Äxte:** Blattform je Stufe, ab Drache mit Dorn, ab Asche gezackt.
- **Bogen:** Wurfarme mit Federn (Himmel) oder Drachenköpfen (Drache).
- **Fächer:** Blattformen (Kranichfedern, Phönixflammen).
- **Glocke:** Kronenaufsatz.
- **Stab:** Kopfstück (Schädel, Kristall, Sonne).
- **Sense:** Blattform je Stufe.
- **Zepter (Magier, seit 8.6):** kurzer Schaft mit Silbermanschette, Metallkäfig mit schwebendem Oktaeder-Kristall in
  Elementfarbe; Käfigform je Stufe (Holzgabel, Silberband, Mondsichel, Kristallbündel, gekreuzte Ringe, Sechseck-Siegelplatte
  mit Glutkern, Astrolabium mit Sternspitzen, Goldhalo mit drei Kristallen). Im Stand kreist ein kleiner Elementfunke um den
  Kristall – nicht aufsteigend wie beim Nekromanten, nicht zweihändig türkis wie beim Schamanen.

---

## 5. Monster

Jede Familie bekommt mehr Tiefe durch **Schichten und Akzente**, nicht durch viele winzige Teile:
- Zweifarbiges Fell: Rücken dunkler, Bauch heller.
- Fellbüschel an Nacken, Ellbogen und Schwanzspitze.
- Glänzende Augen mit hellem Punkt, Krallen und Zähne in Elfenbein.
- Gebietsthema als Zubehör: Waldmoos, Wüstensand, Frost, Asche, Moor.

| Familie | Mehr Details |
|---|---|
| Vierbeiner (Wolf, Bär, Hirsch, Eber) | Mähne als Büschelkranz, Schulterbuckel, gestreifte Rücken, Hufe/Pfoten mit Zehen, Narben |
| Spinnen, Skorpione | glänzender Panzer mit Rillen, Haare an den Beinen, Augenpaare, Giftstachel leuchtet |
| Schlangen, Nagas | Bauchschuppenband in heller Farbe, Rückenmuster, Kopfschild, Zunge |
| Riesen, Oger, Trolle | Bauchfalte, Gürtel mit Beute, Knochenschmuck, Warzen, Kriegsbemalung |
| Orks | Rüstungsteile aus Leder und Eisen, Stammeszeichen, Hauer, Zopf |
| Dämonen | Hörner mit Ringen, Flügelhaut mit Adern, Glutrisse, Schwanzspitze |
| Geister | durchscheinender Saum, Seelenfunken, leuchtende Augenhöhlen |
| Golems, Felsen | Steinblöcke mit Kanten, Moos oder Eis oder Lava in den Fugen, Kernkristall |
| Drachen | Rückenzacken, Bauchplatten, Flügel mit Fingerknochen, Hornkrone |
| Bosse und Endbosse | größer, Krone oder Rüstung, eigener Leuchtring |

**Umsetzung (seit 8.1):** `js/drei-figuren.js` – `beast3`, `spider3`, `scorpion3`, `ghost3`, `serpent3`,
`golem3` überarbeitet; `MON3_LOOK` legt je Art die Besonderheiten fest (Endbosse erben die ihrer
Vorlage), `humanFlair3` gibt menschenartigen Monstern Zubehör, `themeAcc3` das Gebietszubehör
(`MON3_THEMES[…].acc`). Tiere (Eber, Mammut, Hirsch) in `js/drei-tiere.js`. Kleinteile ohne Schatten
(`noShadow`); Figuren mit Schattenmodell empfangen selbst keine Schatten. Gemessen: im Schnitt 8.562
Dreiecke je Monster, größtes Modell 14.152.

### 5.1 Köpfe und Haare der Menschenartigen (seit 8.4)
Banditen, Schützen, Wachen, Orks, Untote und Hexen hatten keine Haare, und die Kapuze des Banditen ließ
vorn einen Keil Kopfhaut frei. Neue Regeln:
- **Jeder Kopf ist geschlossen:** Unter Kapuze, Kopftuch und Helm schauen Pony, Seitensträhnen und
  Nackenhaare hervor; nie eine kahle Kugel unter der Kopfbedeckung.
- **Haare aus Strähnen** (spitze, leicht flache Locken) mit **Glanzband** quer über den Scheitel, keine
  glatte Kappe. Neue Frisuren: zerzaust, nach hinten gekämmt, Kamm (Irokese), Haarknoten, wilde Mähne.
- **Kopfbedeckungen mit Dicke:** Kapuze mit Saumwulst, Spitze hinten und Kragen am Hals; Kopftuch mit
  Knoten und zwei Zipfeln, die mitschwingen; Maske liegt am Kiefer an, mit Knoten im Nacken.
- **Gesicht:** Menschen haben braune, grüne oder graue Augen (rote Augen nur für Orks, Dämonen, Untote),
  manche eine Narbe; Bärte aus Strähnen mit Schnurrbart statt einer Kugel.
- **Jedes Monster etwas anders:** 2–3 Varianten je Art, fest an den Startpunkt gebunden (alle Spieler
  sehen dieselbe Variante).

| Art | Varianten |
|---|---|
| Bandit | braune Kapuze mit roter Maske und Pferdeschwanz · rotes Kopftuch mit schwarzer Maske, zerzauste Haare, Narbe · Kapuze offen, Halstuch, Vollbart |
| Banditenschütze | grüne Kapuze mit Maske und Zopf · grünes Kopftuch, zerzaust · Kapuze mit Bart |
| Armbrustschütze | breitkrempiger Hut, kurze Haare, Maske |
| Kellerwache | Helm mit Haaren darunter, langer brauner, kurzer grauer oder geflochtener Bart |
| Banditenfürst | nach hinten gekämmt, Krone, Maske |
| Ork | Stirnband mit Kamm · rotes Band mit Haarknoten · Kamm mit seitlichem Zopf |
| Untoter | dünne graue Strähnen, eingefallene Wangen, rostiger Halbhelm |
| Sumpfhexe | wilde Mähne unter dem Hut |

**Umsetzung (8.4):** `HEADKIT3`, `hair3` (neue Frisuren 6–10, Glanzband statt Glanzkappe), Strähnen aus
einer gemeinsamen Form ohne Schatten; Varianten über `monVariant3` (Startpunkt), Modellschlüssel
`'m:Art#Variante'`. Je Kopf +0,7k bis +2,8k Dreiecke.

---

## 6. Boden, Gras, Wasser

### 6.1 Boden
- Grundfarbe je Bodenart mit **großflächiger Farbvariation**, also hellere und dunklere Flecken über
  mehrere Kacheln. So wiederholt sich nichts sichtbar.
- **Feinstruktur:** Wiese mit Grasstrichen, Wege mit Kies und Trittspuren, Sand mit Rippeln, Schnee
  mit Glitzern, Asche mit Rissen.
- **Pflaster** in Städten: einzelne Steine mit Fugen, Kanten leicht heller.

### 6.2 Gras
- Büschel aus schmalen Halmen: unten dunkel, an der Spitze hell (Farbverlauf).
- **Wind:** Die Halme wiegen sich in einer langsamen Welle über die Wiese. Die Spitzen bewegen sich
  stärker als der Fuß.
- Dichter auf Wiesen, spärlich auf Wegen. Dazwischen Klee und Blumen.
- Kostet fast nichts: Die Bewegung rechnet die Grafikkarte, die Büschel sind fest gebacken.

### 6.3 Wasser
- **Tiefe:** Am Ufer flach und türkis, in der Mitte tief blau.
- **Wellen:** Wellenlinien ziehen langsam übers Wasser, dazu Glanzfunken in der Sonne.
- **Ufer:** weißer Schaumstreifen, der leicht pulsiert, und ein dunklerer nasser Rand am Ufer.
- **Spiegelung:** Je flacher man aufs Wasser schaut, desto mehr Himmelsfarbe zeigt es (Fresnel).
- **Lava:** dunkle Kruste mit hell glühenden Adern, die langsam fließen.
- **Moor:** trübes Grün mit Blasen und Algenflecken.

**Umsetzung (seit 8.2):** Gras mit Wind im Shader (`worldGrassMat`), flache Halme, Klee und Blumen
(`js/drei-welt.js`); Boden mit Bodenart-Gewichten, Feinstruktur und nassen bzw. verkohlten Rändern,
Wasser, Lava und Moor als eigene Shader (`LIQUID3` in `js/drei-kern.js`). Gemessen (Grafik „hoch“,
844×390): Dorf 608k, Wiese 277k, Wald 250k, Wasser 252k Dreiecke (vorher 746k, 304k, 329k, 710k).

### 6.4 Schmuck je Gebiet (seit 8.4)
Kleinteile am Boden müssen auf einen Blick erkennbar sein: klare Silhouette, dunkle Unterseite und helle
Oberseite, fest im Boden verankert (Büschel oder kleiner Hügel am Fuß), echte Größe statt pauschal
vergrößert. Dünne Teile (Zweige, Beeren, Pilzpunkte) bekommen keinen Umriss, sonst wirken sie wie
schwarze Striche.

| Schmuck | Neu |
|---|---|
| Busch | eine Laubwolke mit Ausbuchtungen statt drei Kugeln, Zweige unten sichtbar, Blätter am Rand; Wiese mit roten Beeren oder weißen Blüten, Dschungel mit großen Blättern und Blüte |
| Baumstumpf | Wurzelfuß, Schnittfläche mit Jahresringen, Wurzeln, die in den Boden gehen; Moos, Baumpilze oder eine Axt; im Frost mit Schneehaube statt Schneeball |
| Liegender Stamm | ganz auf der Kachel, Schnittflächen an beiden Enden, abgebrochener Ast, Moosstreifen, Baumpilze; im Moor hängendes Moos |
| Pilze | drei Pilze mit echtem Stiel und Hut, Lamellen, weiße Punkte (Fliegenpilz); im Moor leuchtende Hüte |
| Knochen | Ochsenschädel mit Hörnern halb im Sand · Brustkorb · gekreuzte Knochen mit kleinem Schädel |
| Kristalle | sechseckige, facettierte Kristalle auf Felsfuß; im Frost kräftig eisblau (undurchsichtig, durchscheinend verschwand auf Schnee), in Glutgebieten unten dunkler Obsidian, oben leuchtend |
| Toter Baum | abgebrochener Stamm mit Splittern und kahlen Ästen · liegender gegabelter Ast mit Stein und Laub · Dornbusch |
| Schneewehe (neu) | vom Wind geformte Wehe mit Steinen und trockenen Halmen (statt Schneebällen) |
| Frostfelsen | blaugrauer Fels mit Schneehaube statt weißer Kugel |

**Umsetzung (8.4):** `tplDeco` in `js/drei-welt.js`; Äste, Wurzeln und Knochen über `stick3` von Punkt zu
Punkt (vorher steckten Stämme und Pilzstiele im Boden, weil `limb3` nach unten baut); Größe je Art über
`DECO_SIZE3` statt pauschal ×1,4; Kleinteile im Material `detail` ohne Umriss; Busch aus 5–6 Laubbauschen
(`puffGeo`); Kristalle `crystalGeo`; Schneewehe `driftGeo` (`DECO.DRIFT`); bei „niedrig“ nur die Kernformen.
Gemessen (844×390, „hoch“): Wiese 309k, Wald 135k, Ödland 117k, Frost 189k, Dschungel 119k Dreiecke.

### 6.5 Kartenrand (seit 8.4)
Am Rand jeder Map darf **nie eine graue oder einfarbige Fläche** zu sehen sein. Der Rand ist eine hohe,
geschlossene Kulisse in Schichten:
1. **Saum:** die Pflanzen oder Felsen des Gebiets, dicht an dicht, mit Büschen in den Lücken.
2. **Wand:** hohe Kulisse (6–8 Einheiten; im Süden nur so hoch, dass die Figur sichtbar bleibt).
3. **Ferne:** große Massen dahinter, zur Horizontfarbe hin aufgehellt (Luftperspektive).
4. **Horizont:** ein weicher Farbverlauf vom Gebietston zur Himmelsfarbe statt flacher Deckel.

| Gebiet | Kulisse |
|---|---|
| Wiese, Dorf | Blütenhecke: gestapelte Laubkronen, jede fünfte rosa blühend |
| Dunkelwald | Tannenwall aus überlappenden Tannen |
| Schlangendschungel | Dschungelwand mit Lianen, Fächerblättern, roten Blüten |
| Orktal, Donnerklamm | Sandsteinklippe in Schichten |
| Ödland | Aschenklippe mit Felsnadeln, toten Bäumen und Glutadern |
| Frostgipfel | Eisklippe mit Schneekappen, Eiszacken und verschneiten Tannen |
| Totenmoor | Trauerweiden mit hängendem Moos und Nebelband |
| Feuerberg, Titanenkamm | Basaltsäulen mit glühenden Fugen |

Der Boden läuft unter der Kulisse weiter und steigt leicht an; Himmelsfarben sind nie grau.

**Umsetzung (8.4):** Heimatregion `V3.home` in `renderDrei` vor dem Blockaufbau, Böschung in `tileSample`,
Kulisse `BORDER3`/`tplKul` (120–380 Dreiecke je Vorlage) im Mesh `far` ohne Umriss, aber mit Durchsicht um
die Figur; Horizont mit Farbverlauf in `v3SyncBounds`; Blöcke weiter als 13 Kacheln draußen werden nicht
gebaut. Gemessen: an den Rändern meist deutlich weniger Dreiecke als vorher (Wiese Süd 335k → 203k),
höchstens +7,5 %.

### 6.6 Portale und Risse (seit 8.4)
Risse und Dungeon-Eingänge passen zur weichen Toon-Welt: **runde, glatte Formen statt Zacken**.
- **Riss:** aufrechter Ring aus neun glatten Runensteinen mit leuchtenden Runen auf einem kleinen
  Erdhügel mit Wurzeln und Grasbüscheln. Im Ring dreht sich ein Wirbel in drei Farbstufen (tief, mittel,
  helles Auge in der Mitte). Weicher Schein dahinter, Lichtfunken spiralen hinein, Kristallsplitter
  schweben um den Ring. Öffnet und schließt sich sichtbar. Der Name steht über dem Ring.
- **Thema je Dungeon:** Spinnenhöhle (violett, Spinnweben, Eiersäcke), Orkfestung (Sandstein, Eisenbänder,
  Hauer), Eisgrotte (Eissteine mit Schneekappe, Eiszapfen, Schneeflocken), Drachenhort (Basalt mit
  Lavafugen, Glut), Banditenkeller (bemooste Feldsteine, Seile, Laterne), Totengruft (Grabstein,
  Schädel-Schlussstein, Ketten), Schlangentempel (Jade mit Gold, steinerne Schlange, Ranken),
  Titanenschmiede (Eisenstein, Goldnieten, Amboss).
- **Dungeon-Eingang:** runder Sockel mit zwei Stufen, Säulen mit Schwellung, Bogen aus einzelnen
  Keilsteinen mit Schlussstein und Emblem, Efeu; im Bogen derselbe Wirbel.
- **Ausgang und Weltentor:** Runenkreis am Boden, glatte Steine, weiche Lichtsäule bzw. Wirbel im Ring.

**Umsetzung (8.4):** `buildRift3`/`buildPortal3` in `js/drei-figuren.js`, Themen `RIFT_LOOK`, Wirbel als
eigener Shader (beim Start vorgewärmt), Schein, Runenkreis und Funken über `model.extra` in `makeActor`;
2D-Ersatz in `drawRift`. Riss etwa 10–13k Dreiecke, 12 Zeichenaufrufe (höchstens 1–2 Risse gleichzeitig).

### 6.7 Karte und Wegweiser (seit 8.8)

**Ziel:** Auf der Karte erkennt man sofort, wo man ist, wo Monster, Bewohner, Gruppe und Gilde
stehen und wohin man für den Auftrag laufen muss. Nichts ist verpixelt.

**Kartengrafik (eine Leinwand je Map, von Minikarte und großer Karte geteilt):**
- **Boden:** gemalte Fläche wie eine alte Landkarte. Die Bodenfarben gehen weich ineinander über
  (3 × 3 geglättet und weich vergrößert, 6 Bildpunkte je Kachel). Wege sind hell, Wasser ist blau mit
  kleinen hellen Wellenbögen.
- **Bäume:** runde Kronen mit dunklem Rand, einem hellen Fleck oben links und einem weichen Schatten
  nach rechts unten. Laubbaum grün, Nadelbaum dunkelgrün, Blütenbaum rosa, toter Baum klein und braun.
- **Felsen:** graue runde Steine mit Glanzfleck.
- **Häuser:** Dachfläche in der Dachfarbe, die obere Hälfte heller, mit dunklem Rand und First.
- **Mauern:** dunkles Steinband mit heller Oberkante.
- **Dungeons:** scharfe Kanten. Helle Räume und Gänge liegen auf dunklem Fels.

**Zeichen (gleich auf beiden Karten):**

| Was | Zeichen |
|---|---|
| Du | heller Pfeil in Blickrichtung mit warmem Schein |
| Gruppe | großer grüner Punkt mit weißem Rand und pulsierendem Ring; außerhalb der Minikarte ein grüner Randpfeil |
| Gilde | großer lila Punkt (#d08cff) mit Ring; außerhalb ein lila Randpfeil |
| andere Spieler | kleiner hellblauer Punkt |
| Monster | kleiner roter Punkt (#e8402e), Bosse größer in Orange |
| Seelensteine | Quadrat in ihrer Leuchtfarbe |
| Bewohner | kleiner cremefarbener Punkt |
| neuer Auftrag | „!“: golden (Haupt) oder grün (Neben), mit Schein |
| Auftrag abgeben | „?“ in denselben Farben |
| Ziel des Wegweisers | goldene Nadel; außerhalb der Minikarte ein goldener Randpfeil, auf der großen Karte eine gestrichelte goldene Linie vom Spieler |
| Weltentor | hellblauer Ring |
| Dungeon | Quadrat in der Portalfarbe, auf der großen Karte mit Namen |

**Wegweiser im Spiel:**
- Ein goldener Pfeil (#ffd34d, Verlauf von Weiß nach Bernstein, dunkler Rand, weicher Schein) liegt
  etwa 70 Pixel neben der Figur in Richtung des Ziels. Nach oben steht er weiter weg, damit er Figur und
  Namen nicht verdeckt.
- Zwei kleine Pfeile laufen in Pfeilrichtung, damit man die Richtung auch aus dem Augenwinkel sieht.
- Neben dem Pfeil stehen Ziel und Entfernung, z. B. „Wolf · 47 m“.
- Ist das Ziel im Bild, schwebt über ihm ein goldener Pfeil nach unten.
- Farben: Hauptauftrag golden, Nebenauftrag grün, Weg über Weltentor oder Ausgang hellblau.

**Große Karte:** Fenster fast über den ganzen Bildschirm im Messingrahmen. Darauf stehen die Gebietsnamen in
Zierschrift mit der Stufe darunter. Unten stehen das Ziel und die Legende.

**Umsetzung (8.8):**
- Datei `js/karte.js`: `buildMapArt` und `mapArt` (Zwischenspeicher für zwei Gebiete), `drawMapMarks`,
  `renderMinimap` (60 Kacheln Ausschnitt), `renderBigMap`/`drawZoneLabels`.
- Wegweiser: `guideEntries`, `guideTarget`, `huntTarget`, `routeOut`, `drawGuide`.
- Kosten: Karte bauen etwa 35–40 ms beim ersten Betreten einer Map; Minikarte etwa 2 ms alle 10 Bilder,
  große Karte etwa 2 ms alle 6 Bilder (nur wenn sie offen ist).

---

## 7. Leistungsregeln (damit nichts ruckelt)

- **Spielerfigur:** sichtbar höchstens etwa 24.000 Dreiecke (gemessen 7.9: 8.700–23.800 je nach
  Klasse und Stufe), Schattenmodell höchstens etwa 7.000 (eine kleine Kugel je größerem Teil).
- **Monster:** im Schnitt höchstens etwa 9.000 Dreiecke, Bosse höchstens 16.000.
- **Kleinteile mit wenigen Segmenten:** Nieten 6×4, Hörner 5–6, Ringe 4×12. Kugeln mit mehr als
  12 Segmenten gibt es nur für Köpfe und große Flächen.
- **Leuchtteile** nutzen das Leuchtmaterial ohne Licht. Das ist billig.
- **Modelle und Figuren:**
  - Jede Figurenart wird nur einmal gebaut und dann geteilt.
  - Figuren kommen beim Verschwinden in einen Pool und werden wiederverwendet.
  - Schatten werfen nur die vereinfachten Schattenmodelle.
- **Gras und Wasser:** Bewegung nur im Shader, keine Rechenarbeit im Hauptprogramm pro Bild.
- **Grafikstufen:** „Niedrig“ lässt Gras, Umrisse der Welt und Schatten weg, „Hoch“ ist für Handys,
  „Ultra“ für PCs.

---

**Seit 9.9 (Handy wurde heiß und ruckelte):**
- Handys starten mit „Mittel“ (Auflösung 1,6-fach, kleine Schattenkarte, keine Wolkenschatten).
- Bildrate „Auto“: 60 Bilder/s, sonst gleichmäßig 30. Menüs und offene Fenster laufen immer mit 30.
- Anpassung bei Ruckeln: erst die Auflösung bis auf 1-fach, dann die Schatten aus, zuletzt 30 Bilder/s.
- Keine Kantenglättung (MSAA) bei 2–3-facher Pixeldichte; einfache Schattenfilterung auf Handys.

## 8. Prompts für Konzeptbilder (englisch)

### Gesamtstil
```
Stylized 3D chibi fantasy MMORPG, top-down three-quarter camera, soft toon shading with three bands, cool blue-violet shadows and warm sunlight, thick dark outlines, rim light on silhouettes, readable at small size on a phone, clean shapes, no photorealism.
```

### Ausrüstung je Stufe (eine Figur, acht Stufen nebeneinander)
```
Character equipment progression sheet, stylized 3D chibi warrior, the same character shown eight times side by side with full armor sets of increasing rarity, each set with a clearly different silhouette: (1) stitched leather vest with fur collar, leather cap with ear flaps; (2) bronze chain mail with riveted layered pauldrons and a nose-guard helmet with crest; (3) silver-blue lamellar armor with crescent moon motifs, upswept crescent pauldrons; (4) red dragon-scale armor with a dragon-head chest emblem, horned helmet with jaw cheek guards, horned scaled pauldrons; (5) violet soul armor with floating crystals above the shoulders and glowing rune lines; (6) black obsidian armor with jagged spikes and glowing ember cracks, spiked crown helmet; (7) white and sky-blue armor with feathered wings on the helmet, shoulders and boots; (8) radiant gold armor with a sun disc on the chest, a sun halo behind the helmet, triple-layered tassets and a long royal cape. Top-down three-quarter view, toon shading, thick outlines.
```

### Ninja-Sets
```
Stylized 3D chibi ninja shown in eight outfits of rising rarity, distinct silhouettes: linen wrap shirt; leather chest guard with straps; long flowing sash tails and crescent hood plate; viper hood with fangs and green scale vest; night mask with glowing violet seams; ash-burnt jagged hems and oni mask with small horns; starry navy outfit with a white star mask; golden fox mask with ears and a gold-trimmed layered kimono with a sun crest. Top-down three-quarter view.
```

### Schamanen-Sets
```
Stylized 3D chibi shaman in eight robes: plain linen robe with headband; silk robe with a big sash bow; crane robe with white feather hem and crane crest; phoenix robe with flame-shaped hem and phoenix feather crown; dragon robe with a dragon pearl and horned crown; ember robe with glowing hem and floating sparks; sky robe with cloud-scalloped hem and winged cloud crown; divine robe with a sun medallion, high collar and sun diadem. Holding a fan or bell. Top-down three-quarter view.
```

### Nekromanten-Sets
```
Stylized 3D chibi necromancer in eight robes: ragged burial wraps and torn hood; grey ash robe; bone robe with ribcage chestplate and bone helm; soul robe with glowing green hem flames; death king robe with skull collar and spiked crown; shadow robe with long smoky tails and shadow horns; star robe with connected constellation dots; golden bone armor with a halo above a golden skull mask. Staff or scythe. Top-down three-quarter view.
```

### Magier-Sets
```
Stylized 3D chibi mage in eight robes, Western high-fantasy scholar: plain grey-blue wool robe with a soft bent pointed hat; indigo scholar robe with a stiff standing collar, a book on a chain and a silver-banded pointed hat; open rune coat with glowing triangle runes on the hem; crystal robe with crystals floating above the shoulders and a hat tip ending in a floating crystal; arcane tabard with a triangle emblem and a slowly turning rune ring; charred ash coat with glowing ember cracks; night-blue star coat with a crescent clasp and a small astrolabe; white-and-silver archmage robe with a double collar, a sigil ring behind the back and a circlet of three floating crystals. Holding a short sceptre whose cage holds a floating octahedral crystal in the element colour (crimson, royal blue, yellow-white or amber). No feathers, no dragons, no gold talismans, no teal, no hood. Male and female. Top-down three-quarter view.
```

### Monster-Detailstufe
```
Stylized 3D chibi fantasy monsters, top-down three-quarter view: a wolf with two-tone fur (dark back, light belly), a mane of tufts, ivory claws and fangs; a forest spider with a glossy ridged carapace, hairy legs and a glowing venom tip; a stone golem with mossy seams and a glowing core crystal; a demon with ringed horns, veined wing membranes and ember cracks. Clean shapes, readable at small size, toon shading, thick outlines.
```

### Boden, Gras, Wasser
```
Stylized 3D game terrain close-up, top-down three-quarter camera: a lush meadow with dense swaying grass tufts (dark at the base, bright at the tips), clover and small flowers, large soft color variations across the ground; a winding dirt path with gravel and footprints; a pond with turquoise shallows, deep blue center, slow moving wave lines, sun glints, a white pulsing foam line at the shore and a darker wet bank. Toon shading, soft baked shadows under trees.
```

### Lava und Moor
```
Stylized 3D game terrain: a lava river with dark cooling crust plates and bright glowing veins flowing slowly between them, heat shimmer at the edges; a murky swamp with green water, algae patches, small rising bubbles and reeds at the edge. Top-down three-quarter view, toon shading.
```

### Menschenartige Monster: Köpfe und Haare (8.4)
```
Character head sheet for a stylized 3D chibi toon MMORPG, thick dark outlines, three-step cel shading, front, three-quarter and back views: three bandit variants – a brown hood with a soft rolled hem, a pointed tip at the back and a cowl, a red cloth mask tied at the neck with two tails, a dark-brown fringe and a ponytail with a gold tie coming out of the hood; a red bandana with a knot and two fluttering tails, a black mask, messy chestnut hair and a scar; an open hood, a red neckerchief and a full dark beard. Hair made of chunky pointed strands with a bright shine band, every head fully covered, brown, green or grey eyes. Plus orcs with a crest, a topknot or a side braid, a guard with hair under the helmet and a braided beard, an undead with thin grey strands.
```

### Schmuck am Boden (8.4)
```
Stylized 3D game props for a top-down chibi MMORPG, toon shading, thick outlines: a leafy round bush with clustered lobes, darker underside and red berries; a cut tree stump with root flare, growth rings and moss; a fallen mossy log with bracket fungi; a cluster of red-capped white-dotted mushrooms; an ox skull half buried in sand; a ribcage; a broken dead snag and a fallen forked branch with a stone; a faceted hexagonal ice crystal cluster, translucent blue; glowing ember crystals with dark obsidian bases; a wind-carved snow drift with rocks poking out; a blue-grey boulder with a snow cap. Readable at small size from above.
```

### Kartenrand (8.4)
```
Stylized 3D toon MMORPG map edge seen from a top-down three-quarter camera: the walkable meadow ends in a dense, tall, layered hedge of rounded leafy tree crowns with pink blossom clusters, behind it bigger crown masses fading into a soft blue-green haze and a gradient sky; no grey, no flat colour, the ground rises gently under the hedge. Variants in one sheet: a wall of overlapping dark pines (forest), layered sandstone cliffs (canyon), ash cliffs with dead trees and glowing veins (badlands), ice cliffs with snow caps and icicles (frost), weeping willows with hanging moss and mist (swamp), basalt columns with glowing seams (volcano).
```

### Portale und Risse (8.4)
```
Stylized 3D toon magic rift portal for a cozy anime MMORPG, top-down three-quarter view: an upright oval ring of nine smooth rounded rune stones with glowing violet runes, standing on a small grassy earth mound with roots and grass tufts, filled with a softly swirling violet vortex in three tone bands with a bright white eye in the centre, a soft glow behind it, tiny light motes spiralling in, small crystal shards floating around the ring, thin dark outlines, three-step cel shading, no sharp spikes. Variants: an ice ring with snow caps and icicles, a basalt ring with lava seams and embers, a jade ring with a coiled stone snake and vines, a mossy fieldstone ring with ropes and a lantern.
```

---

## 8b. Grundangriffe – Schlaganimationen aller Klassen (seit 9.3)

Bis 9.2 hob die Figur nur den rechten Arm. Der Treffer kam schon beim ersten Bild, Beine und Hüfte blieben steif
und die zweite Hand hing herunter. Darum passte der Schlag nicht zur Figur. Ab 9.3 gilt für jeden Grundangriff:

### Grundregeln (für alle Waffen)
1. **Vier Phasen:**
   - **Ausholen**, etwa 30–38 % der Zeit, langsam und ausgeprägt.
   - **Schlag**, etwa 12–16 %, sehr schnell.
   - **Durchziehen**, etwa 20 %, die Waffe schwingt über das Ziel hinaus.
   - **Zurück** in die Ruhe, weich.
2. **Der Treffer kommt im Schlagbild:** Schaden, Zahl, Funken und Schlagspur erscheinen erst, wenn die Klinge
   das Ziel erreicht, nicht beim Tastendruck. Pfeile und Zauber fliegen erst beim Loslassen los.
3. **Ganzer Körper:**
   - Die Hüfte dreht vor dem Oberkörper, der Oberkörper vor dem Arm.
   - Beim Schlag tritt ein Fuß nach vorn, der Körper senkt sich leicht in die Knie.
   - Der Kopf bleibt auf das Ziel gerichtet.
4. **Die zweite Hand arbeitet mit:**
   - Der Schild geht beim Ausholen nach vorn und wird beim Stoß mitgedrückt.
   - Zweihänder greifen mit beiden Händen.
   - Ninjas schlagen abwechselnd links und rechts.
   - Die freie Hand der Magier zeichnet das Siegel.
5. **Gewicht nach Waffe:** Dolch etwa 0,3 s, Schwert und Axt etwa 0,42 s, Zweihänder und Sense etwa 0,55–0,6 s.
   Mit Angriffstempo wird alles im selben Verhältnis schneller.
6. **Kombo aus drei unterschiedlichen Schlägen** je Nahkampfwaffe, damit es nicht wie eine Schleife aussieht.
7. **Schlagspur** in der Klassenfarbe nur im Schlag und Durchziehen. Beim dritten Schlag ist sie breiter und heller.

### Je Waffenart
| Waffe (Klasse) | Schlag 1 | Schlag 2 | Schlag 3 |
|---|---|---|---|
| Schwert + Schild (Krieger) | Schrägschlag von rechts oben nach links unten, der Schild deckt | Rückhand von links unten aufwärts | Stoß mit Ausfallschritt, der Schild drückt mit |
| Axt (Krieger) | Hieb von oben über den Kopf, Oberkörper lehnt zurück und kippt vor | Waagerechter Hieb | Aufwärtshaken |
| Zweihandschwert (Krieger) | Weiter waagerechter Schwung mit Hüftdrehung, beide Hände | Schräger Rückschwung | Senkrechter Spalthieb mit kleinem Sprung und Aufprall |
| Zweihandaxt (Krieger) | Schräger Hieb | Volle Drehung (Wirbel) mit ausgestreckten Armen | Schmetterschlag von oben in die Knie |
| Dolche (Ninja) | Rechter Stich | Linker Kreuzschnitt | Beide Klingen hoch, X-Schnitt nach unten mit kleinem Sprung |
| Sense (Nekromant) | Tiefe Mähbewegung von rechts nach links | Rückwärtsmähen | Bogen von oben nach unten |
| Bogen (Ninja) | Seitlich stellen, Sehne zur Wange ziehen, loslassen, Rückstoß der Zughand | | |
| Fächer (Schamane) | Fächer von rechts nach links mit Drehen des Handgelenks, Oberkörper dreht mit, Windstoß beim Loslassen | | |
| Glocke (Schamane) | Glocke hoch, zweimal schütteln, nach vorn schwingen | | |
| Stab (Nekromant) | Stab hoch, Spitze nach vorn stoßen, die freie Hand öffnet sich zum Ziel | | |
| Zepter (Magier) | Zepter kurz zurück, schnelles Vorschnellen aus dem Handgelenk, die freie Hand zieht einen Kreis | | |

### Prompt (englisch)
```
Animation key-pose sheet for a stylized 3D chibi fantasy MMORPG, top-down three-quarter camera, toon shading, thick outlines. Rows of basic attack combos, each shown as four key poses (anticipation, impact, follow-through, recovery) with motion arcs and smear trails in the class colour: (1) warrior with sword and round shield – diagonal slash with the shield raised, rising backhand, forward lunge thrust with shield push; (2) warrior with one-handed axe – overhead chop leaning back then forward, flat horizontal hack, rising hook; (3) warrior with a two-handed greatsword gripped with both hands – wide horizontal sweep driven by the hips, reverse diagonal, overhead cleave with a small hop and ground impact; (4) warrior with a great axe – diagonal chop, full 360 spin with outstretched arms, overhead smash dropping into the knees; (5) ninja with twin daggers – quick right stab, left cross slash, both blades raised then an X-cut downward with a small jump; (6) necromancer with a scythe – low reaping sweep, reverse reap, downward arc; (7) ninja with a bow – side stance, draw string to the cheek, release with hand recoil; (8) shaman with a folding fan – sweeping flick with a wrist turn and a gust of wind; shaman with a bell – raised, shaken twice, swung forward; (9) necromancer with a staff – raised, tip thrust forward, free hand opens toward the target; (10) mage with a short sceptre – wrist flick forward while the free hand traces a glowing circle. Weight shifts visible in the hips and feet, front foot steps in on impact, head stays on the target. Clean, readable at phone size, no text.
```

### Umsetzung (9.3)
- `BASIC3` in `js/drei-figuren.js` beschreibt je Waffe und Kombo Schlüsselposen für Hüfte, Oberkörper, Kopf, Arme,
  Hände und Beine.
- `poseKeys3` blendet die Posen weich ineinander: Ausholen weich, Schlag schnell, Ausklingen weich.
- In `js/kampf.js` hängt der Treffer an `p.pendingHit` und der Schuss an `p.pendingShot`. Beides löst erst im
  Schlag- bzw. Loslass-Bild aus (`BASIC_TIMING`). Mitspieler sehen dieselbe Animation (Dauer und Kombo kommen übers
  Netz).

## 9. Attacken und Effekte aller Klassen

Jede Attacke muss man **an ihrer Form** erkennen, auch ohne Farbe und ohne Zahl: ein Schlag ist eine
Sichel, ein Sprung eine Schleppe mit Aufprall, ein Zauber von oben eine Säule, eine Fläche ein Ring am
Boden, ein Fluch eine Rune. Die Kamera schaut schräg von oben; alles Wichtige liegt deshalb **am Boden**
(Ring, Rune, Riss) oder **steigt senkrecht auf** (Säule, Wirbel, Strahl).

### 9.1 Grundregeln

**Ablauf in vier Takten**
1. **Ausholen** (0,1–0,2 s): Waffe oder Hände leuchten in der Elementfarbe auf, kleiner Bodenkreis.
2. **Wirken**: die Hauptform (Sichel, Wirbel, Säule, Geschoss, Strahl, Drache …).
3. **Treffer**: Funken in der Elementfarbe am Ziel, das Ziel blinkt kurz auf und zuckt zurück,
   bei Kritisch zusätzlich ein weißer Kreuzblitz.
4. **Nachglühen** (1–3 s): Abdruck am Boden (Riss, Brandfleck, Rune, Raureif, Blutfleck), der langsam
   verblasst.

**Elemente und Farben** (wie im Code, `ELEMENT3`)

| Element | Farbe | Räumliche Form |
|---|---|---|
| Klinge | Stahlweiß `#e6eeff` | Sicheln, Klingenwirbel, Stahlfunken |
| Erde | Sand `#c8a878`, Fels `#7a6a54` | Felszacken brechen aus dem Boden, Risse, Staub |
| Feuer / Wut | Orange `#ff6a2a`, Glut `#ffb04a` | Flammensäule, Glut steigt auf, Brandfleck |
| Schatten | Violett `#8a5aff`, Rauch `#1a1224` | Rauchballen, dunkle Kugeln, Nachbilder |
| Blitz | Hellblau `#7fb8ff` | Zickzack-Blitze von oben, Ketten zwischen Zielen |
| Eis | Eisblau `#9fd8ff` | Eiszapfen, Splitter, Raureif am Boden |
| Wind | Mint `#9fe8c8` | Windhose, Streifen in Laufrichtung |
| Licht / Geist | Gold `#ffd34d` | Lichtsäule, Heiligenschein, goldene Kugeln |
| Seele | Grün `#7fe3a0` | grüne Irrlichter, Rauch, Schädel |
| Blut | Rot `#c8202a` | rote Säule, Strahl vom Ziel zur Figur |
| Knochen | Elfenbein `#e8e0c8` | Knochenzacken, kreisende Knochen |

**Ränge** (Erwacht, Heroisch, Legendär, Vollendet) legen sichtbar etwas drauf:
Erwacht – Runenkreis und Ring in der Rangfarbe · Heroisch – dazu aufsteigende Wirbelringe und ein
Kreuzschnitt beim Treffer · Legendär – dazu Lichtsäule, Blitz und kleine Ketten beim Treffer ·
Vollendet – dazu Himmelsstrahl, Glutwelle und leichtes Beben.

**Zustände am Ziel**
- **Betäubt:** drei kleine gelbe Sterne kreisen über dem Kopf, die Figur glimmt leicht gelb.
- **Verlangsamt:** Raureif-Ring an den Füßen, kleine Eiskristalle, Bewegungen sichtbar träge.
- **Brennt:** kleine Flammenzungen auf Schultern und Kopf, Glut steigt auf, orange Leiste.
- **Vergiftet:** grüne Bläschen steigen auf, grüner Schimmer, grüne Leiste.
- **Verwundbar / verflucht:** violette Rune schwebt über dem Kopf, dunkler Rauch an den Füßen.
- **Rückstoß:** Staubschleppe am Boden in Flugrichtung.
- **Eingefroren (Magier, seit 8.6):** durchscheinender königsblauer Eisblock in Sechseckform um das Ziel, weißer Rand,
  zwei Glanzlinien, die Pose bleibt stehen; statt der Sterne. Beim Zerspringen fliegen Eissplitter. Bosse frieren nie ein.

**Leistung**
- Alle 3D-Effekte sind gepoolte Körper (`FX3`): Ringe, Säulen, Sicheln, Wirbel, Splitter, Kugeln,
  Rauch, Blitze. Pro Wurf entstehen keine neuen Geometrien.
- Funken und Partikel sind begrenzt; Leuchtteile nutzen das Leuchtmaterial ohne Licht.
- Ein normaler Angriff kostet höchstens ein paar Dutzend Teilchen, eine Ultimate höchstens ein paar Hundert.

### 9.2 Grundangriffe je Waffe

| Waffe | Klasse | Grundangriff | Merkmal |
|---|---|---|---|
| Schwert | Krieger | ein Schwung vor der Figur | flache helle Sichel in Klingenfarbe, Stahlfunken |
| Axt | Krieger | schwerer Hieb von oben | kürzere, dickere Sichel, Funken und kleiner Riss |
| Zweihänder | Krieger | weiter Halbkreis | breite Sichel mit Nachbild der Klinge, weiter Reichweite |
| Streitaxt | Krieger | weiter Rundschlag | doppelte Sichel, Staub am Boden |
| Dolche | Ninja | zwei schnelle Stiche | zwei schmale Stichlinien hintereinander, violette Funken |
| Bogen | Ninja | Pfeilschuss | Pfeil mit heller Leuchtspur, Federn sichtbar, kleiner Aufprall |
| Fächer / Glocke | Schamane | Windklinge | türkisfarbene Windsichel fliegt zum Ziel, Blätter wirbeln |
| Stab | Nekromant | Seelengeschoss | grüne Kugel mit Schweif, Schädelgesicht angedeutet |
| Sense | Nekromant | Sensenhieb | lange grüne Sichel am Boden entlang, Rauch |
| Zepter | Magier (8.6) | Elementgeschoss | Feuer kleiner Komet mit Glut, Frost blaue Raute, Blitz weißer Funke mit zuckenden Zacken, Erde Bernsteinkiesel |

```
Combat VFX reference sheet, stylized 3D toon MMORPG seen from a top-down three-quarter camera: basic attacks of nine weapons side by side – a bright steel crescent slash of a sword, a short heavy axe chop with sparks and a small ground crack, a wide two-handed crescent with a blade afterimage, a double arc of a great axe kicking up dust, two quick violet stab lines of twin daggers, an arrow with a glowing trail, a turquoise wind blade with swirling leaves from a fan, a green skull-faced soul orb from a staff, a long green scythe sweep along the ground. Clean shapes, readable at phone size.
```

### 9.3 Krieger – Weg der Klinge (Flächenschaden)

| Fertigkeit | Ab Stufe | Wirkung | Merkmal |
|---|---|---|---|
| Sichelwelle (seit 8.3) | 1 | Querhieb im 140°-Kegel, dann rammt die Klinge in den Boden: eine Klingensichel läuft 180 px über den Boden, trifft alle auf der Bahn hart und stößt sie zurück | weißer Querhieb, kurzer Hüpfer, Einschlag mit Riss und Funken, aufrechte blau-weiße Sichel (40° geneigt) mit Lichtschleppe und dunkler Furche; stoppt an Wänden |
| Schwertwirbel | 3 | Rundumschlag, Betäubung | zwei volle Klingenwirbel um die Figur, Wirbelsäule, Staubring am Boden |
| Kampfrausch | 5 | Buff: Angriffs- und Lauftempo | rote Flammensäule beim Wirken; danach rote Blitze um den Körper (mehr je Rang), Glut steigt auf |
| Sprungschlag (seit 8.3) | 7 | Sprung bis 190 px nach vorn (vor das Ziel), Landung betäubt alle im Kreis r 80 für 1,6 s, wenig Schaden | Hocke, hoher Bogen mit Windstreifen, harter Fall; Boden gibt nach: Mulde in Bodenfarbe, ringsum ein Wall aus braunen Erdbrocken und hochgedrückte Schollen, Staub, Risse – keine Explosion; nach 2 s sinkt alles zurück |
| Aura des Schwertes | 10 | Buff: Angriff, Kritisch | goldene Lichtsäule und Heiligenschein; die Waffe leuchtet golden, goldene Funken steigen auf |
| **Klingenhimmel** (Ultimate) | 30 | zehn Riesenschwerter fallen, dann Explosion | goldener Runenkreis, zehn geisterhafte Riesenschwerter stürzen im Kreis in den Boden, Risse, weißer Ring und Himmelsstrahl |

```
Skill VFX sheet for a stylized 3D toon warrior (blade path), top-down three-quarter view: CRESCENT WAVE – a wide white cross slash, a short hop, the blade rammed into the ground with a crack and sparks, then an upright blue-white blade crescent (tilted 40°) racing 180 px across the ground with a light trail and a dark furrow behind it; SWORD WHIRL – two full spinning blade rings around the warrior with a dusty whirl column and a ring on the ground; BATTLE FRENZY – a red flame pillar, then small red lightning arcs crackling around the body and embers rising; LEAP SLAM – a short crouch, a high arc forward with wind streaks, a hard fall; the ground gives way under the landing: a shallow bowl in the ground colour, a ring of brown earth clods pushed up around it and a few clods tumbling outward, dust and cracks, NO explosion, enemies in the circle dazed with stars; after two seconds the earth sinks back; SWORD AURA – a golden light pillar and halo, the weapon glowing gold with sparks rising; ULTIMATE "BLADE HEAVEN" – a golden rune circle, ten huge ghostly swords plunging into the ground in a ring, cracks, then a white shock ring and a beam from the sky.
```

### 9.4 Krieger – Weg des Leibes (Verteidigung und Kontrolle)

| Fertigkeit | Ab Stufe | Wirkung | Merkmal |
|---|---|---|---|
| Felsenfaust (seit 8.3) | 1 | Einzelziel bis 120 px: Fels bricht unter dem Ziel hervor, schleudert es hoch, 1,5 s Betäubung; Ausweichfenster 0,34 s | Hopser, Faust in den Boden, dunkler Riss mit Felsdornen jagt zum Ziel, Aufwärtshaken: sechseckiger Felspfeiler mit Felsfaust, Keile im Kranz, Lichtspalt |
| Erdbeben | 3 | Erschütterung im Umkreis, Betäubung | sternförmige Risse, Felszacken brechen aus dem Boden, Staubring, Bildschirm bebt |
| Starker Körper | 5 | Buff: weniger Schaden, Rüstung | goldene Säule, Steinsplitter fallen ab; danach steinerne goldene Haut mit kleinen Plättchen um den Körper |
| Geistesschlag | 7 | harter Einzelschlag, Kritisch | blaue Geistersichel, blaue Lichtsäule am Ziel, helle Funken |
| Kriegsschrei | 10 | Fluch: Gegner verwundbar und langsam | drei orange Schallringe laufen nach außen, Gegner bekommen eine rote Rune über dem Kopf |
| **Titanenzorn** (Ultimate) | 30 | Sprung und Aufschlag, 3 s Betäubung, Titanenhaut | hoher Sprung, Aufschlag mit Rissstern, zwei Druckringe, Felszacken; danach orange Steinhaut |

```
Skill VFX sheet for a stylized 3D toon warrior (body path, shield and earth), top-down three-quarter view: ROCK FIST – the warrior hops and punches the ground, a dark crack with small rock spikes races to the target, then with an uppercut a hexagonal stone pillar topped by a chunky rock fist bursts out under the enemy and throws it up, stone wedges in a ring, a golden light gap; EARTHQUAKE – star-shaped cracks spreading from the feet, rock spikes bursting out of the ground and a dust ring; STRONG BODY – a golden pillar, stone flakes falling off, then a golden stone skin with small floating plates; SPIRIT STRIKE – a blue ghostly crescent and a blue light pillar on the target; WAR CRY – three orange sound rings rolling outward, red runes appearing above the enemies' heads; ULTIMATE "TITAN'S WRATH" – a high leap, a slam with a star of cracks, two shock rings and rock spikes, then an orange stone skin.
```

### 9.5 Ninja – Weg des Dolches (Hinterhalt und Blitzangriff)

| Fertigkeit | Ab Stufe | Wirkung | Merkmal |
|---|---|---|---|
| Hinterhalt | 1 | Stich, doppelt aus dem Hinterhalt | Rauchballen am Ziel, violetter Kreuzstich, rosa Funken |
| Tarnung | 3 | Buff: unsichtbar, schneller, nächster Treffer ×3 | violetter Ring, die Figur löst sich in Rauch auf; danach halb durchsichtig mit Schimmer |
| Wirbelklinge | 5 | Rundumschlag | zwei violette Klingenwirbel, kleine Schnitte an jedem Gegner |
| Blitzangriff | 7 | Sprung bis 300 px zum Ziel, Betäubung | Nachbild am Start, blauer Blitzstreifen bis zum Ziel, Blitz schlägt ein |
| Leichtfüßigkeit | 10 | Buff: Tempo, Ausweichen | weiße Windstreifen beim Laufen, kleiner Wirbel beim Wirken |
| **Schattendoppelgänger** (Ultimate) | 30 | sechs Doppelgänger stechen zu, Kreuzschnitt | Rauchwolke, sechs violette Schattenfiguren im Kreis um das Ziel, gleichzeitige Stiche, dann großer weißer Kreuzschnitt |

```
Skill VFX sheet for a stylized 3D toon ninja (dagger path), top-down three-quarter view: AMBUSH – a smoke puff at the target and a violet cross-shaped stab with pink sparks; STEALTH – a violet ring, the ninja dissolving into smoke and then shimmering half-transparent; WHIRLING BLADE – two violet spinning blade rings with tiny cuts on every enemy; BLITZ – an afterimage at the start, a blue lightning streak to the target and a bolt striking down; LIGHT FEET – white wind streaks behind the running ninja; ULTIMATE "SHADOW CLONES" – a cloud of smoke, six violet shadow copies surrounding the target and stabbing at once, then a huge white cross slash.
```

### 9.6 Ninja – Weg des Schattens (Hinterhalt und Ausweichen)

| Fertigkeit | Ab Stufe | Wirkung | Merkmal |
|---|---|---|---|
| Hinterhalt | 1 | wie oben | wie oben |
| Schattensprung | 3 | Sprung 180 px, Betäubung | Rauchballen am Start, Rauchschleppe, X-Schnitt am Ende |
| Lähmende Klinge | 5 | Stich, 2 s Betäubung, Gift | grüner Stich, Giftbläschen am Ziel, gelbe Betäubungssterne |
| Tarnung | 7 | wie oben, länger | wie oben |
| Schattenmantel | 10 | Buff: Ausweichen, Kritisch | dunkler Rauchmantel um die Figur, Rauch steigt auf, violetter Ring |
| **Todesmal** (Ultimate) | 30 | Mal am Ziel, Stich ×9, unter 35 % noch einmal | rotes Todesmal (Rune) schwebt über dem Ziel, Runenkreis am Boden, die Figur erscheint dahinter, roter Stich und Himmelsstrahl |

```
Skill VFX sheet for a stylized 3D toon ninja (shadow path), top-down three-quarter view: SHADOW LEAP – a smoke puff at the start, a trail of smoke and an X-shaped slash at the landing; CRIPPLING BLADE – a green stab, poison bubbles rising from the target and three small yellow stun stars circling its head; SHADOW CLOAK – a mantle of dark smoke wrapping the ninja with smoke rising and a violet ring; ULTIMATE "DEATH MARK" – a red skull-like rune hovering over the target, a red rune circle on the ground, the ninja appearing behind it and a red piercing stab with a beam of light.
```

### 9.7 Schamane – Weg des Drachen (Feuer, Blitz und Eis)

| Fertigkeit | Ab Stufe | Wirkung | Merkmal |
|---|---|---|---|
| Blitzdrache | 1 | Drache fliegt zum Ziel, Brand | ein blauer Blitzdrache aus Licht schlängelt sich zum Ziel und zerbirst in Blitzketten |
| Drachenwirbel | 3 | drei Sogwellen um die Figur, Rückstoß, Brand | feuriger Drachenwirbel am Boden, Flammenringe, Brandflecken |
| Drachenkraft | 5 | Buff: Angriff, Fertigkeitsschaden | orange Flammensäule und Ring; danach Glut steigt auf |
| Blizzard | 7 | Zielfläche: Eiszapfen fallen 4 s, Verlangsamung | Zielkreis zum Ausrichten, Schneetreiben, Eiszapfen stürzen herab, Raureif am Boden |
| Donnersturm | 10 | Blitze auf das Ziel und die Umgebung, Betäubung | dunkle Wolke über dem Ziel, mehrere Blitze, blauer Ring, verkohlter Fleck |
| **Strom der Elemente** (Ultimate, seit 9.7; vorher Drachensturm) | 30 | Wasserstrahl 5,5 s, Blitz, Brand, Erdbruch | großer Wasserstrahl, umwirbelt von Blitz, Feuer und Erde, glühende Bodenrisse (siehe Abschnitt 11) |

```
Skill VFX sheet for a stylized 3D toon shaman (dragon path), top-down three-quarter view: LIGHTNING DRAGON – a serpentine blue dragon made of light and lightning flying to the target and bursting into chain lightning; DRAGON VORTEX – a fiery dragon-shaped vortex on the ground with expanding flame rings and scorch marks; DRAGON MIGHT – an orange flame pillar and a ring, embers rising; BLIZZARD – a targeting circle, swirling snow, icicles crashing down and frost on the ground; THUNDERSTORM – a dark cloud above the target with several lightning bolts, a blue ring and a charred spot; ULTIMATE "DRAGON STORM" – a rune circle at the target, nine meteors with fire tails, scorch marks and a final big fire ring.
```

### 9.8 Schamane – Weg der Heilung (Heilung und Schutz)

| Fertigkeit | Ab Stufe | Wirkung | Merkmal |
|---|---|---|---|
| Geisterfaust | 1 | Geschoss, Betäubung | türkise Geisterfaust fliegt zum Ziel, großer Aufprallstern |
| Windfessel | 3 | Fluch: Verlangsamung im Umkreis | türkiser Windwirbel, Windbänder schlingen sich um die Gegner |
| Segen | 5 | Buff: weniger Schaden, Heilung, Kritisch | goldene Säule, Heiligenschein, Lichtflocken schweben herab |
| Heilung | 7 | heilt 45 %, danach Angriff | grüne Rune am Boden, grüne Lichtblätter steigen auf |
| Schutzgeist | 10 | Buff: Rückwurf, Rüstung | türkise Säule, ein Schutzgeist (durchscheinende Gestalt) umkreist die Figur |
| **Himmelssegen** (Ultimate) | 30 | heilt 60 %, Lichtsäulen auf 8 Gegner | Himmelsstrahl auf die Figur, Runenkreis, Lichtsäulen fahren auf die Gegner herab |

```
Skill VFX sheet for a stylized 3D toon shaman (healing path), top-down three-quarter view: SPIRIT FIST – a translucent turquoise fist flying to the target with a big star-shaped impact; WIND SHACKLES – a turquoise whirlwind with ribbons of wind wrapping around the enemies; BLESSING – a golden pillar, a halo and flakes of light drifting down; HEAL – a green rune on the ground with green leaves of light rising; GUARDIAN SPIRIT – a turquoise pillar and a translucent spirit animal circling the shaman; ULTIMATE "HEAVEN'S BLESSING" – a beam from the sky on the shaman, a rune circle, then pillars of light striking down on up to eight enemies.
```

### 9.9 Nekromant – Weg der Seelen (Beschwörung und Flächenschaden)

| Fertigkeit | Ab Stufe | Wirkung | Merkmal |
|---|---|---|---|
| Schädelsalve (seit 8.5) | 1 | drei Schädel im Fächer, suchen bis zu drei Ziele, je 0,75× | Stabstoß, drei knochenweiße Schädel mit klappernden Kiefern, grünen Augen und grüner Flammenschleppe biegen im Flug zum Ziel ab; beim Einschlag schnappt ein grüner Kiefer zu, Seelenfunken steigen auf |
| Seelenkäfig (seit 8.5) | 3 | beschworener Käfig beim Ziel, 5 Schreie in 5 s je 0,5× im Umkreis 125, verlangsamt, erster Schrei zieht heran | Stab rammt in den Boden, ein Käfig aus sechs gebogenen Rippen bricht aus der Erde; darin ein blassgrüner Geist mit Augen und Mund, der bei jedem Schrei den Mund aufreißt, die Rippen biegen sich, ein grüner Ring rollt über den Boden; zum Schluss platzen die Rippen weg und der Geist fährt als Lichtsäule auf |
| Totenbeschwörung (8.5 neu) | 5 | drei Skelettkrieger 90 s; ab E1 drei Knochenhunde mit Ansprung, H Bisse verlangsamen, L Seelenhunde zerplatzen in Seelenfeuer, V mit Alpha | grüne Rune, die Erde bricht an drei Stellen auf, Skelettkrieger (Schädel, Rippen, rostiges Kurzschwert, Knochenschild, grüne Augen) klettern heraus; erweckt: hagere Knochenhunde mit Rippen, Stachelkamm und grün glühender Mähne; weicher grüner Ring unter jedem Diener |
| Seelenschnitter (seit 8.5) | 7 | riesiger Schnitter mäht 200° vor dir (1,8×), Mal: 6 s mehr Schaden, 2 s langsamer | großer dunkler Schatten am Boden, violette Kapuzengestalt mit Knochengesicht und grünen Augenflammen steigt neben der Figur auf, eine gewaltige Sense zieht eine breite grüne Sichelspur und eine Narbe in den Boden, Seelen werden halb herausgerissen, violette Rune über jedem Gegner, die Gestalt zerfällt zu Asche |
| Dunkle Macht (8.5 neu) | 10 | Buff: Zauberschaden (Fertigkeiten, Diener, Ultimate), Angriffstempo, etwas Lauftempo | violette Säule, fünf grüne Seelenflammen steigen auf und kreisen als Krone über dem Kopf, der Stabkopf brennt grün, beim Laufen violett-grüner Rauch an den Füßen |
| **Seelenernte** (Ultimate) | 30 | Sog, sechs Treffer, Ernte heilt; Diener voll geheilt, +15 s, 8 s schneller | seit 10.3 in 3D, siehe Abschnitt 13 |

```
Skill VFX sheet for a stylized 3D toon necromancer (soul path), top-down three-quarter view, dark-fantasy mobile MMORPG, bold silhouettes readable at phone size, palette of bone white #e8e0c8, sickly soul green #7fe3a0 / #a7e37f, violet #a774e0 and black-green smoke: SKULL VOLLEY – the necromancer thrusts his staff forward and three bone-white flaming skulls with chattering jaws and glowing green eyes burst out in a narrow fan, trailing green fire and smoke, curving in flight onto three different enemies and biting down with a green jaw-snap flash and rising soul sparks; SOUL CAGE – the staff is slammed into the ground and an upright cage of six huge curved rib bones bursts out of the earth at the target over a green rune, a pale green ghost with two glowing eyes trapped inside; each second the ghost screams with its mouth wide open, the ribs flex outward and a green shock ring rolls across the ground over the enemies; finally the ribs burst apart and the ghost shoots up as a pillar of green light; RAISE DEAD – a green rune circle, the earth cracking open at three points with bone shards and green smoke, three skeleton warriors with skull heads, exposed ribs, rusty short swords, small round bone shields and glowing green eyes climbing out, each on a soft green friendly ring; AWAKENED: three lean skeletal hounds with exposed ribs, a spiked spine ridge and a glowing green flame mane leaping at enemies with green bite flashes, at the highest rank one larger alpha hound with a glowing rune on its back; SOUL REAPER – a wide dark shadow spreads on the ground and a violet-black hooded reaper with a bone face and green eye flames rises beside the necromancer, sweeping a gigantic scythe with a glowing white-green edge in one huge arc in front of him, leaving a wide luminous green crescent trail and a curved ground scar, souls half torn out of the enemies and a violet rune over each head, then the reaper crumbles into ash; DARK MIGHT – a violet pillar, five green soul flames spiral up and circle as a floating crown above the head, the staff head burning green, violet-green smoke at the feet while running; ULTIMATE "SOUL HARVEST" – a green vortex on the ground pulls enemies in, their souls fly out as green beams to the necromancer and to his summoned hounds, each flaring up with a short green pillar. No text.
```

Symbol-Prompts (je 256×256):
- Schädelsalve: `Square fantasy MMORPG skill icon, painted toon style with thick dark outlines, dark violet-black background: three bone-white flaming skulls flying in a rising fan from lower left to upper right, the middle one larger with an open jaw, glowing green eye sockets, green flame tails, readable at 48 px, no text.`
- Seelenkäfig: `Square fantasy MMORPG skill icon, painted toon style with thick dark outlines, dark violet background: an upright cage of six curved white rib bones meeting at a point, bursting from cracked dark earth, a pale green screaming ghost with two glowing eyes trapped inside, a green rune glowing beneath, readable at 48 px, no text.`
- Totenbeschwörung: `Square fantasy MMORPG skill icon, painted toon style with thick dark outlines, dark violet background: a skeleton warrior skull in front and a long-snouted bone hound skull behind it with bared fangs, both with glowing green eyes, a green rune arc below and bone fingers rising from cracked earth, readable at 48 px, no text.`
- Seelenschnitter: `Square fantasy MMORPG skill icon, painted toon style with thick dark outlines, dark background: a tall violet-black hooded reaper with a bone face and green eye flames, a huge curved scythe with a glowing green edge sweeping across the front, readable at 48 px, no text.`
- Dunkle Macht: `Square fantasy MMORPG skill icon, painted toon style with thick dark outlines, dark blue-violet background: a violet four-pointed star of dark energy with a glowing green soul core, a small crown of five green flames above it, two short violet speed streaks to the left, readable at 48 px, no text.`

### 9.10 Nekromant – Weg der Knochen (Lebensraub und Lähmung)

| Fertigkeit | Ab Stufe | Wirkung | Merkmal |
|---|---|---|---|
| Lebensentzug | 1 | Schaden und Heilung | roter Strahl vom Ziel zur Figur, rote Tropfen fließen zurück |
| Knochenspeer | 3 | Geschoss, Betäubung | weißer Knochenspeer fliegt, zersplittert am Ziel |
| Knochenpanzer | 5 | Buff: Schild, Rückwurf | Knochensplitter fliegen auf, danach kreisen Knochen um die Figur |
| Lähmender Fluch | 7 | Fluch: langsam, Betäubung | grüner Runenkreis, Knochenhände greifen aus dem Boden nach den Gegnern |
| Blutopfer | 10 | Buff: Lebensraub, Angriff | rote Blutsäule, rote Tropfen steigen auf |
| **Knochenkerker** (Ultimate) | 30 | drei Ringe Knochenspieße, festhalten, Lebensraub | roter Runenkreis, drei Ringe aus Knochenspießen brechen nacheinander aus dem Boden |

```
Skill VFX sheet for a stylized 3D toon necromancer (bone path), top-down three-quarter view: LIFE DRAIN – a red beam from the enemy to the necromancer with red droplets flowing back; BONE SPEAR – a white bone spear flying and shattering into splinters on impact; BONE ARMOR – bone splinters flying up, then bones orbiting the necromancer; CRIPPLING CURSE – a green rune circle with skeletal hands grabbing up from the ground at the enemies; BLOOD SACRIFICE – a red blood pillar with red droplets rising; ULTIMATE "BONE PRISON" – a red rune circle and three rings of bone spikes bursting out of the ground one after another, holding the enemies.
```

### 9.11 Stand und Umsetzung
- Code: Wirken und Treffer je Fertigkeit in `js/fertigkeiten.js` (`SKILL_FX`, `skillSignature3`),
  Abläufe in `js/kampf.js`, Ultimates in `js/ultimativ.js`, 3D-Körper in `js/drei-fx.js` (`FX3_DRAW`).
- Jede Fertigkeit bekommt beim Wirken ihr Element (`SKILL_ELEMENT`) und dazu das **Merkmal** aus den
  Tabellen oben. Neue Merkmale werden als gepoolte 3D-Körper gebaut, nicht als Einzelbilder.
- **Seit 8.0 umgesetzt:**
  - Zustände in 3D an jedem Monster (`fx3Status` in `js/drei-fx.js`): kreisende Sterne (Betäubung),
    Raureif-Ring mit Eiskristallen (Verlangsamung), Flammenzungen und Glut (Brand), grüne Bläschen
    (Gift), Rune in der Farbe des Fluchs über dem Kopf (verwundbar). Höchstens 24 Monster je Bild.
  - Schildstoß (bis 8.2): goldener Schildabdruck (`shield3`) · Donnersturm: Gewitterwolke mit Wetterleuchten
    (`cloud3`) · Lähmender Fluch: Knochenhände aus dem Boden (`hands3`) · Windfessel: Windbänder um
    jeden Gegner · Kriegsschrei, Fluch der Schwäche: Fluchrune in der Farbe der Fertigkeit, Rauch ·
    Totenbeschwörung: Riss, Knochenzacken und Rauch, wo die Skelette aufsteigen · Lebensentzug: rote
    Tropfen kreisen zur Figur · Knochenspeer: Splitter im Boden · Kritische Treffer: weißer Kreuzblitz.
  - Flüche rufen je Gegner `SKILL_FX[id].curseHit(m)` auf; die Farbe der Rune steht in `m.vulnerable.color`.
- **Seit 8.5 umgesetzt (Nekromant Seelen neu):** Schädelsalve (Pool-Körper `skull`, Kurvenflug `turn`), Seelenkäfig (`cage3`: Rippenkäfig, Geist, Schreiringe), Totenbeschwörung (`skeletonWarrior3`, `boneHound3`, Aufstieg aus dem Boden, numerische IDs, Netzliste `al`), Seelenschnitter (`reaper3`: Bodenschatten, Gestalt, Sichelspur), Dunkle Macht (Seelenkrone).
- **Seit 8.3 umgesetzt (Krieger neu):** Sichelwelle (`wave3`: Sichel aus vier Streifen, Lichtschleppe, Furche),
  Felsenfaust (`erupt3`: Risslinie, Dornen, Pfeiler aus dem Pool `rockcol`, Felsfaust, Keile, Mulde, Lichtspalt),
  Sprungschlag (`crater3`: Mulde in Bodenfarbe über `tileSample`, Wall aus 12 + 6 Erdbrocken aus dem Pool `rock`,
  6 Schollen, im Wasser nur Ringe, höchstens drei Krater gleichzeitig). Eigene Posen je Fertigkeit
  (`SKILL_POSE3` in `js/drei-figuren.js`), Sprunghöhe mit harter Fallkurve (`leapCurve`), Mitspieler fliegen auf
  derselben Bahn (`rp.glide`).
- **Seit 8.6 umgesetzt (Magier):** `nova3` (Front mit Takt, je Element eigene Form), `sigil3` (Dreieckssiegel `msig0–3`),
  Eisblock bei `m.frozen`, Geschoss-Stile `fireball`, `frostlance`, `arc`, `stone`, Posen `nova`, `stoss`, `zauber`,
  `schritt`; alle Magier-Effekte in `js/magier.js`. Symbole der 24 Magier-Fertigkeiten und die 2D-Buffbilder in
  `js/magier-symbole.js`, 2D-Figur, Spitzhut und Zepter in `js/figuren.js`, 2D-Eisblock in `js/zeichnen.js`.

### Magier: Grundregeln (seit 8.6)
Der Magier ist ein westlicher Gelehrtenmagier, kein Schamane. Damit man beide auf einen Blick trennt:
- **Form:** Dreiecks-Siegel (alchemistisch: △ Feuer, ▽ Frost, △ mit Balken Blitz, ▽ mit Balken Erde) statt des runden
  Hexagramms des Schamanen. **Keine** Drachen, Wirbel um die Figur, Wolken oder Meteore.
- **Richtung:** Alles läuft **flach am Boden von den Füßen nach außen** (Novas) oder **steigt aus einem Bodensiegel auf**
  bzw. zieht sich nach innen (Siegel). Nichts fällt vom Himmel, kein Teil höher als 2,6 Einheiten.
- **Farbe:** Elementfarbe nur als Akzent; Karmin statt Orange, Königsblau statt Blassblau, Gelbweiß mit Violett statt
  Hellblau, dunkler Basalt mit Bernstein statt Sand.
- **Platzschema** in allen vier Wegen: 1 Nova (ab Stufe 1) · 2 Element-Geschoss (3) · 3 Elementsprung (5) · 4 Buff (7) ·
  5 Großes Siegel mit Zielkreis (10) · Ultimate (30). Ab E1 folgt jeder Nova ein schwächerer, weiterer Nachhall.

### 9.12 Magier – Weg der Flamme (Flächenschaden und Brand)

| Fertigkeit | Ab Stufe | Wirkung | Merkmal |
|---|---|---|---|
| Feuernova | 1 | Nova um die Figur, Rückstoß, Brand, Brennende explodieren | Zepter in den Boden, karminroter Flammenring läuft am Boden nach außen, Brandring |
| Feuerball | 3 | Geschoss, Splitter 70, Brand | weißglühender Ball mit zwei Siegelringen, kleine Explosion |
| Flammenschritt | 5 | Sprung bis 170, Explosion am Startpunkt | Stichflamme, brennende Spur |
| Glutherz | 7 | Buff: Zauberschaden, Krit | glühender Kern über der Hand |
| Flammenkreis | 10 | Zielfläche, drei Pulse nach innen, Brand | Dreieckssiegel, Flammenwand zieht sich zur Mitte |
| **Inferno** (Ultimate) | 30 | drei Feuernovas, immer weiter | drei Flammenringe rollen nacheinander nach außen |

**Abgrenzung zum Schamanen:** keine Drachen, kein Wirbel um die Figur (Drachenwirbel), nichts fällt herab (Drachensturm);
ein flacher Ring aufrechter **karminroter** Flammen, der nach außen läuft, ohne Drehung. Karmin und Weiß statt Orange.

```
Skill VFX sheet for a stylized 3D toon mage (fire path), top-down three-quarter view, crimson and white-hot palette (#e8362a, #a0102e, #fff1c8): FIRE NOVA – the mage rams a crystal sceptre into the ground and a flat ring of upright crimson flame tongues races outward across the floor from a small glowing triangle sigil, leaving a burnt ring; FIREBALL – a white-hot fireball wrapped in two thin rotating sigil rings bursting into a small crimson explosion; FLAME STEP – the mage vanishes in a tall crimson flame burst, burning footprints lead away; EMBER HEART – a glowing ember core floating above an open palm; FLAME CIRCLE – a glowing upward-triangle sigil on the ground with a circular wall of flames closing inward three times; ULTIMATE "INFERNO" – three concentric crimson flame rings rolling outward one after another. No dragons, no meteors, nothing falling from the sky, no orange vortex.
```

### 9.13 Magier – Weg des Frosts (Kontrolle und Einfrieren)

| Fertigkeit | Ab Stufe | Wirkung | Merkmal |
|---|---|---|---|
| Frostnova | 1 | Nova, Einfrieren, Verlangsamung | königsblaue Sechseck-Frostplatte, flache Eisnadeln schießen nach außen, Gegner im Eisblock |
| Eisstrahl (seit 9.6, ersetzt die Frostlanze) | 3 | gedrückt halten: Strahl bis 300 weit, trifft alle in der Linie 5× pro Sekunde leicht, Verlangsamung wächst von 30 % auf 70 %, kostet laufend Mana, Gehen mit 40 % Tempo | beide Handflächen nach vorn, dreilagiger Strahl (Königsblau-Schein, Cyan, weißer Kern) mit Wellen, wandernde Frostringe, Kristallstern am Ende, Reif am Boden |
| Eisschritt | 5 | Gleiten bis 160, Eisfigur zerspringt | Eisstatue am Startpunkt, Frostbahn |
| Frostpanzer | 7 | Buff: Verteidigung, weniger Schaden, Angreifer verlangsamt | vier Sechseck-Eisplatten kreisen |
| Kristallgrab | 10 | Zielfläche, Einfrieren, Eisfeld verlangsamt | sieben Eiskristalle wachsen im Sechseck aus einem ▽-Siegel |
| **Eiszeit** (Ultimate) | 30 | alles erstarrt 2 s, dann Zerspringen | Gletscherplatte, Kristalle am Rand, alles zerbricht zugleich |

**Abgrenzung zum Schamanen:** kein Schneesturm, keine Eiszapfen von oben, kein Zielkreis mit Schneetreiben (Blizzard);
ein flaches **königsblaues Sechseck** mit waagrechten Kristallen, Cyan nur als Glanz.

```
Skill VFX sheet for a stylized 3D toon mage (frost path), top-down three-quarter view, royal blue dominant with cyan-white highlights (#3a7bff, #1a3fb0, #eafcff): FROST NOVA – a royal-blue hexagonal frost plate spreads over the ground from the mage's feet, flat ice needles shoot outward like a starburst, nearby enemies are encased in translucent hexagonal ice blocks; FROST LANCE – a long faceted ice lance pierces a line of enemies, a frozen one shatters into shards; ICE STEP – a crystalline ice statue of the mage cracks apart while a frost glide path leads away; FROST ARMOR – four thin hexagonal ice plates orbit the mage at chest height; CRYSTAL TOMB – seven tall ice crystals erupt in a hexagon from a downward-triangle sigil; ULTIMATE "ICE AGE" – a vast hexagonal glacier sheet with crystal spires, every enemy frozen, then everything shatters at once. No snowstorm, no falling icicles, nothing from the sky.
```

### 9.14 Magier – Weg des Blitzes (Ketten und Tempo)

| Fertigkeit | Ab Stufe | Wirkung | Merkmal |
|---|---|---|---|
| Blitznova | 1 | bis 8 Ziele, kurze Betäubung, Ladung | gezackte Bodenblitze kriechen nach außen, violetter Saum, zwei Kugelblitze kreisen |
| Kettenblitz | 3 | springt zu zwei weiteren, entlädt Geladene | Blitz aus dem Zepter, Funkenpaare an jedem Knoten |
| Blitzschritt | 5 | Blitz bis 200, Treffer auf der Strecke, Betäubung | Figur wird zum waagrechten Blitz, Brandlinie |
| Statische Ladung | 7 | Buff: Angriffstempo, Krit, Lauftempo | Funken knistern über die Robe |
| Kugelblitz | 10 | Zielfläche, 3 s Zaps auf drei Gegner, Betäubung | Kugel steigt aus einem Siegel, schlägt waagrecht zu |
| **Donnerkrone** (Ultimate) | 30 | sechs Blitze, dann Tempo-Buff | Blitzkrone über dem Kopf, waagrechte Blitze |

**Abgrenzung zum Schamanen:** keine Wolke, keine Blitze vom Himmel (Donnersturm), keine Blitzschlange (Blitzdrache);
nur **flache Bodenbögen** und waagrechte Zaps, Gelbweiß mit violettem Saum statt Hellblau.

```
Skill VFX sheet for a stylized 3D toon mage (lightning path), top-down three-quarter view, yellow-white with violet edges (#ffe94a, #ffffff, #8a5aff): LIGHTNING NOVA – jagged yellow-white arcs crawl outward along the ground from the mage to nearby enemies, two violet ball lightnings orbit; CHAIN LIGHTNING – a bolt leaps from a crystal sceptre to an enemy and on to two more, small spark pairs at each node; LIGHTNING STEP – the mage becomes a horizontal lightning streak with an afterimage and a scorched line; STATIC CHARGE – tiny sparks crackle over the robe; BALL LIGHTNING – a crackling sphere rises low above a triangle sigil and strikes three enemies with horizontal arcs; ULTIMATE "THUNDER CROWN" – a crown of lightning spikes above the mage firing horizontal arcs. No clouds, no bolts from the sky, no dragon.
```

### 9.15 Magier – Weg der Erde (Schutz und Schwerkraft)

| Fertigkeit | Ab Stufe | Wirkung | Merkmal |
|---|---|---|---|
| Erdnova | 1 | Nova, hochschleudern, Rückstoß, Betäubung | Basaltsplitter mit Bernsteinadern heben sich und fliegen waagrecht nach außen, Bernsteinrisse |
| Steingeschoss | 3 | schwerer Treffer, Splitter 55, Betäubung | Basaltbrocken mit Bernsteinkern |
| Erdsprung | 5 | durch die Erde bis 150, Ausbruch beim Ziel | glühender Riss, Ausbruch mit Splittern |
| Basalthaut | 7 | Buff: Schild, Verteidigung | Basaltplatten mit Bernsteinadern an Schultern und Brust |
| Schwerkraftsiegel | 10 | Zielfläche, Sog, drei Treffer, Einsturz | Bernsteinsiegel, drei Felsen kreisen nach innen |
| **Weltenbruch** (Ultimate) | 30 | Monolithen, hochschleudern, Einsturz, Steinhaut | acht Basaltmonolithen im Kreis kippen nach innen |

**Abgrenzung zum Schamanen** (der keine Erde hat) **und zum Krieger:** kein Felspfeiler, keine Mulde, kein Sand
(Felsenfaust, Sprungschlag, Erdbeben); dunkler Basalt mit Bernstein, nach außen geschleudert oder nach innen gezogen.

```
Skill VFX sheet for a stylized 3D toon mage (earth path), top-down three-quarter view, dark basalt with glowing amber (#3e3532, #f0a830, #ffd98a): EARTH NOVA – black basalt shards with glowing amber cracks rise around the mage and are flung outward horizontally by a gravity pulse, amber cracks radiate across the floor; STONE SHOT – a dark basalt boulder with an amber core hurtles forward and shatters; EARTH STEP – the mage sinks into a glowing amber fissure and erupts further away in a burst of shards; BASALT SKIN – dark basalt plates with amber seams cover shoulders and chest; GRAVITY SIGIL – an amber sigil with three boulders spiralling inward, enemies dragged to the centre; ULTIMATE "WORLD BREAK" – eight basalt monoliths with amber veins burst up in a ring and topple inward. No rock pillar, no crater, no sand colours.
```

Symbol-Prompts für alle 24 Magier-Fertigkeiten stehen in `docs/bild-prompts.md` („Der Magier (Version 8.6)“).

## 10. Fertigkeitssymbole (seit 9.6)

Die alten Symbole bestanden aus flachen Einzelformen und wirkten „wie Gekritzel“. Seit 9.6 ist jedes Symbol ein
kleines gemaltes Bild, das genau zeigt, was die Attacke tut (Schwertwirbel = Schwert in einem leuchtenden Wirbel,
Feuerball = weißglühende Kugel mit Flammenschweif, Eisstrahl = Eisstrahl aus der offenen Hand).

- **Aufbau** (`js/symbol-kunst.js`):
  - Runde Fläche mit Hintergrund je Element (`ICON_THEME`): heller Lichtkern oben links, dunkler Rand und feine
    Strahlen hinter dem Motiv.
  - Darauf das Motiv (`SKILL_ART[id]`, je Klasse in `js/symbole-*.js`).
  - Darüber Innenschatten, Glanzbogen oben und ein Metallrand aus Gold und Bronze.
  - Gezeichnet in 128 px, damit es auch auf Retina-Bildschirmen scharf ist.
- **Malregeln:**
  - Ein klares Hauptmotiv, das 60–75 % der Fläche füllt und auch bei 44 px auf dem Handy erkennbar ist.
  - Licht kommt von oben links. Verläufe statt flacher Flächen, Glanzkanten an Metall und Kristall.
  - Magie leuchtet, Schwünge bekommen Bewegungsspuren.
  - Buffs zeigen Figur, Körper oder Schild mit Aura; Flüche zeigen dunkle Zeichen und Ketten; Heilung ist grünes Licht.
  - Innerhalb einer Klasse unterscheidet sich jedes Symbol in Form und Hintergrundfarbe.
  - Magier: Glyphen △ und ▽, Wirkung flach am Boden, nichts fällt vom Himmel (Abgrenzung zum Schamanen).
- **Fertigkeitsbücher** zeigen dasselbe Bild im goldenen Ring auf dem Buchdeckel.

**Prompt (englisch, je Fertigkeit anpassen):**
```
Game skill icon for a stylized fantasy MMORPG, round, 128×128, painterly toon rendering, rich radial background in the element's colour with a bright core top-left and dark vignette, subtle light rays behind the motif, one bold central motif that shows exactly what the attack does ({motif}), strong light from top left, glossy rim highlights, glowing magic and motion trails, gold-and-bronze metal ring frame with a soft glass highlight on top, readable at 44 px, no text, no letters.
```

## 11. Schamane: spitzes Eis und Strom der Elemente (seit 9.7)

- **Blizzard:** Es fallen Eiszapfen, keine Kugeln.
  - Jeder Zapfen ist ein Bündel aus drei spitzen Eiskegeln (eisblau mit leuchtendem Kern), Spitze voran in
    Fallrichtung, dahinter eine dünne helle Fallspur.
  - Beim Aufschlag stecken drei bis fünf spitze Eiszacken schräg im Boden; nach 0,7 s zerspringen sie.
  - Die Splitter sind spitze Rauten statt Quadrate.
- **Strom der Elemente** (Ultimative Attacke, Weg des Drachen):
  - **Haltung:** Der Schamane steht still, beide Hände nach vorn. In den Händen sammelt sich 0,45 s lang
    Wasser zu einer leuchtenden Kugel.
  - **Wasserstrahl:** schießt 380 weit, 5,5 s lang, und wird zum Ende breiter. Er hat eine deckende,
    tiefblaue Hülle, darüber leuchtende türkise Lagen mit weißem Kern; zwei helle Wasserwirbel drehen sich
    schnell um die Achse.
  - **Drei Elemente** kreisen auf Spiralen um den Strahl:
    - Blitz: zuckende, jedes Bild neu gezackte Spirale, gelbweißer Kern mit violettem Schein.
    - Feuer: Flammenzungen mit hellem Kern.
    - Erde: taumelnde Felsbrocken mit Bernsteinschein.
  - **Ende des Strahls:** Gischt, Wasserring und Spritzer.
  - **Boden:** Wo der Strahl entlangfegt, reißt der Boden in glühenden, gezackten Rissen auf, abwechselnd
    Feuer, Blitz, Erde und Wasser. Die Risse wachsen in 0,25 s und verglühen in 3 s.
  - **Blitzsprünge:** Blitze springen aus dem Strahl auf Getroffene.
  - **Schluss:** Entlang des ganzen Strahls brechen Felszacken mit glühenden Adern auf. Am Ende schlagen ein
    Blitz, ein Feuerring und ein Wasserring ein.

**Prompt (englisch):**
```
Ultimate ability of a fantasy shaman, stylized 3D toon MMORPG: the shaman stands firm with both palms forward and unleashes a massive, widening torrent of water that lasts several seconds; three elements spiral around the water beam – crackling yellow-white lightning with violet glow, licking flame tongues, tumbling rocks with amber glow; the ground along the beam cracks open in glowing fissures (orange fire, yellow lightning, amber earth, cyan water); spray and a ripple ring where the beam hits; finale: jagged rock spikes erupt along the whole line with a lightning strike and fire ring at the end. Epic, colourful, readable from an isometric camera.
```

## 12. Nekromant: Totenruf und Dunkle Macht (seit 10.0)

- **Totenruf** (Weg der Seelen, Platz 4, statt Seelenschnitter):
  - **Grab:** Wo ein Monster in deiner Nähe stirbt, steht 2 Minuten lang ein schiefer grauer Grabstein mit
    hellgrünem Kreuz auf einem Erdhügel; darüber schwebt ein grünes Seelenlicht. Das Grab wächst in 0,35 s aus
    dem Boden und versinkt am Ende.
  - **Wecken:** Das Grab bricht auf (grüne Lichtsäule, Steinsplitter, bleicher Nebel, Ring).
  - **Geist:** Aus dem Grab steigt das Monster in seiner eigenen Gestalt auf: knochenweiß ohne Farben, mit
    dunklem Umriss und dünnem bläulichem Schein; es schwebt leicht. Beim Ausholen glüht es grünlich, am Ende
    verblasst es. Der Name lautet „Geist: Wolf“ usw.
- **Dunkle Macht:** Die Figur bleibt frei sichtbar (vorher verdeckten flache Flammen sie).
  - Am Boden dreht ein violetter Runenkreis mit pulsierendem grünem Innenring.
  - Drei Seelenlichter (hellgrüner Kern, violetter Schweif) kreisen auf und ab um die Figur.
  - Dünner dunkelvioletter Nebel steigt am Rand auf; die Seelenkrone schwebt über dem Kopf.

**Prompt (englisch):**
```
Necromancer skill "Call of the Dead", stylized 3D toon MMORPG: tilted grey gravestones with glowing green crosses on fresh dirt mounds mark where monsters died, a green soul light hovering above each; the necromancer raises his staff and the graves burst open with green light pillars; the slain creatures rise again in their own shapes (wolf, bear, boar, lynx) as bone-white ghosts with dark outlines and a thin cold-blue glow, floating slightly, fighting beside him. Buff "Dark Power": a slowly rotating violet rune circle on the ground with a pulsing green inner ring, three soul wisps with violet trails orbiting the character, thin dark violet mist rising at the edge, a crown of green soul flames above the head – the character stays clearly visible.
```


## 13. Nekromant: Seelenernte in 3D (seit 10.3)

Vorher lag nur eine flache 2D-Spirale am Boden. Neu ist ein echter 3D-Ablauf in drei Akten (3,1 s), umgesetzt in `js/seelenernte.js`.

**Prompt (Konzeptbild):** `Epic 3D toon MMORPG ultimate skill, top-down 50 degree camera on bright grass: a hooded necromancer stands in a darkened circle with a glowing green rune ring and an inner violet rune ring; six spiraling soul streams, alternating dark green and deep violet with bright pulses of light running upward, rise out of the ring and twist into a funnel that ends in a pulsing soul orb (black core, green glow, white heart, violet halo) above the necromancer; small grinning bone skulls with green eyes and wisps of light spiral up the funnel; every monster in the circle hangs on a sagging green soul chain pulled to the center; dark violet mist rises at the edge. Second frame: a huge spectral scythe with a dark outlined pale green blade sweeps once around the circle at waist height, leaving a dark green arc trail; souls tear out of the monsters and fly into the orb; third frame: the orb crashes into the necromancer, a green light column shoots up and a white shockwave ring rolls over the circle. Painterly toon shading, bold readable shapes, effects stay visible on bright grass (dark outlines under every glow).`

Gestaltungsregeln:
- **Ruf (0–0,4 s):** Boden verdunkelt (normal gemischte dunkle Scheibe), grüner Runenkreis (dreht langsam), violetter Innenkreis (gegenläufig), heller Randring, violetter und dunkelgrüner Nebel am Rand.
- **Strudel (bis 2,1 s):** 6 Seelenströme (Handy „niedrig“: 5) als Trichter – unten weit und flach, oben eng und steil bis zur Seelenkugel in 3,4 Einheiten Höhe. Jeder Strom: deckender dunkler Mantel (grün/violett im Wechsel) und dünner heller Kern, Lichtpulse laufen nach oben. 9 Irrlichter mit Schweif, 4 Schädel mit Kiefer und grünen Augen steigen spiralförmig auf. Seelenketten von bis zu 7 Gegnern zur Mitte, durchhängend, mit wanderndem Seelenfunken.
- **Ernte (ab 2,1 s):** Geistersense fährt in 0,42 s einmal herum (Stiel dunkel mit hellem Kern, Klinge dunkel umrandet, hell, zur Spitze nach innen gekrümmt; Schweif als deckender dunkelgrüner Bogen mit hellem Saum). Aus jedem Gegner fliegt eine Seele (heller Kopf auf dunklem Hof, Schweif) in die Kugel, die Kugel stürzt in den Nekromanten: grüne Lichtsäule und Druckwelle (hell und dunkel).
- Alles Leuchtende hat einen dunklen, normal gemischten Untergrund, damit es auf hellem Gras und Schnee nicht verschwindet.
