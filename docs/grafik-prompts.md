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
`bodyLine3` (Nähte, Risse, Schnürung), `ringAt3`/`arcAt3` (Ringe und Rippen).

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

---

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

```
Combat VFX reference sheet, stylized 3D toon MMORPG seen from a top-down three-quarter camera: basic attacks of nine weapons side by side – a bright steel crescent slash of a sword, a short heavy axe chop with sparks and a small ground crack, a wide two-handed crescent with a blade afterimage, a double arc of a great axe kicking up dust, two quick violet stab lines of twin daggers, an arrow with a glowing trail, a turquoise wind blade with swirling leaves from a fan, a green skull-faced soul orb from a staff, a long green scythe sweep along the ground. Clean shapes, readable at phone size.
```

### 9.3 Krieger – Weg der Klinge (Flächenschaden)

| Fertigkeit | Ab Stufe | Wirkung | Merkmal |
|---|---|---|---|
| Dreifachschlag | 1 | drei Hiebe im 120°-Kegel, Rückstoß | drei Sicheln nacheinander (links, rechts, Mitte), letzte am größten; Glut beim Treffer, Riss bei schwerem Treffer |
| Schwertwirbel | 3 | Rundumschlag, Betäubung | zwei volle Klingenwirbel um die Figur, Wirbelsäule, Staubring am Boden |
| Kampfrausch | 5 | Buff: Angriffs- und Lauftempo | rote Flammensäule beim Wirken; danach rote Blitze um den Körper (mehr je Rang), Glut steigt auf |
| Sturmangriff | 7 | Ansturm 200 px, Betäubung | Staubwolke beim Start, Glutschleppe hinter der Figur, Aufprall mit Funkenstern und Brandfleck |
| Aura des Schwertes | 10 | Buff: Angriff, Kritisch | goldene Lichtsäule und Heiligenschein; die Waffe leuchtet golden, goldene Funken steigen auf |
| **Klingenhimmel** (Ultimate) | 30 | zehn Riesenschwerter fallen, dann Explosion | goldener Runenkreis, zehn geisterhafte Riesenschwerter stürzen im Kreis in den Boden, Risse, weißer Ring und Himmelsstrahl |

```
Skill VFX sheet for a stylized 3D toon warrior (blade path), top-down three-quarter view: TRIPLE STRIKE – three crescent slashes in quick succession in a 120° cone, the last one biggest, embers on hit; SWORD WHIRL – two full spinning blade rings around the warrior with a dusty whirl column and a ring on the ground; BATTLE FRENZY – a red flame pillar, then small red lightning arcs crackling around the body and embers rising; CHARGE – a dust burst at the start, a trail of embers behind the running warrior, a star-shaped spark impact and a scorch mark; SWORD AURA – a golden light pillar and halo, the weapon glowing gold with sparks rising; ULTIMATE "BLADE HEAVEN" – a golden rune circle, ten huge ghostly swords plunging into the ground in a ring, cracks, then a white shock ring and a beam from the sky.
```

### 9.4 Krieger – Weg des Leibes (Verteidigung und Kontrolle)

| Fertigkeit | Ab Stufe | Wirkung | Merkmal |
|---|---|---|---|
| Schildstoß | 1 | Stoß nach vorn, Betäubung, Rückstoß | goldener Schildabdruck (runde Scheibe) vor der Figur, Aufprallring, Staubschleppe am Gegner |
| Erdbeben | 3 | Erschütterung im Umkreis, Betäubung | sternförmige Risse, Felszacken brechen aus dem Boden, Staubring, Bildschirm bebt |
| Starker Körper | 5 | Buff: weniger Schaden, Rüstung | goldene Säule, Steinsplitter fallen ab; danach steinerne goldene Haut mit kleinen Plättchen um den Körper |
| Geistesschlag | 7 | harter Einzelschlag, Kritisch | blaue Geistersichel, blaue Lichtsäule am Ziel, helle Funken |
| Kriegsschrei | 10 | Fluch: Gegner verwundbar und langsam | drei orange Schallringe laufen nach außen, Gegner bekommen eine rote Rune über dem Kopf |
| **Titanenzorn** (Ultimate) | 30 | Sprung und Aufschlag, 3 s Betäubung, Titanenhaut | hoher Sprung, Aufschlag mit Rissstern, zwei Druckringe, Felszacken; danach orange Steinhaut |

```
Skill VFX sheet for a stylized 3D toon warrior (body path, shield and earth), top-down three-quarter view: SHIELD BASH – a golden disc-shaped shield imprint in front of the warrior, an impact ring and the enemy sliding back with a dust trail; EARTHQUAKE – star-shaped cracks spreading from the feet, rock spikes bursting out of the ground and a dust ring; STRONG BODY – a golden pillar, stone flakes falling off, then a golden stone skin with small floating plates; SPIRIT STRIKE – a blue ghostly crescent and a blue light pillar on the target; WAR CRY – three orange sound rings rolling outward, red runes appearing above the enemies' heads; ULTIMATE "TITAN'S WRATH" – a high leap, a slam with a star of cracks, two shock rings and rock spikes, then an orange stone skin.
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
| **Drachensturm** (Ultimate) | 30 | neun Feuermeteore, Brand, Drachenschrei | Runenkreis am Ziel, neun Meteore mit Feuerschweif, Brandflecken, zum Schluss ein großer Feuerring |

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
| Seelenpfeil | 1 | Geschoss, durchbohrt | grüner Schädel mit Rauchschweif fliegt durch alle Gegner |
| Seelensturm | 3 | Fläche um die Figur | grüne Seelenwirbel, Irrlichter kreisen nach außen, grüne Rune |
| Totenbeschwörung | 5 | zwei Skelette helfen 90 s | grüne Rune, Erde bricht auf, zwei Skelette steigen aus dem Boden |
| Fluch der Schwäche | 7 | Fluch: verwundbar, langsam | violetter Runenkreis, violette Rune über jedem Gegner |
| Dunkle Macht | 10 | Buff: Angriff, Tempo | violette Säule, violette und grüne Glut steigt auf |
| **Seelenernte** (Ultimate) | 30 | Sog, sechs Treffer, Ernte heilt | grüner Strudel am Boden zieht die Gegner heran, grüne Seelen fliegen als Strahlen zur Figur |

```
Skill VFX sheet for a stylized 3D toon necromancer (soul path), top-down three-quarter view: SOUL ARROW – a green glowing skull with a smoky tail piercing through a line of enemies; SOUL STORM – green spirit whirls and wisps spiralling outward over a green rune; RAISE DEAD – a green rune, the earth cracking open and two skeleton warriors rising; CURSE OF WEAKNESS – a violet rune circle and violet runes above every enemy; DARK MIGHT – a violet pillar with violet and green embers rising; ULTIMATE "SOUL HARVEST" – a green vortex on the ground pulling enemies in, their souls flying to the necromancer as green beams.
```

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
  - Schildstoß: goldener Schildabdruck (`shield3`) · Donnersturm: Gewitterwolke mit Wetterleuchten
    (`cloud3`) · Lähmender Fluch: Knochenhände aus dem Boden (`hands3`) · Windfessel: Windbänder um
    jeden Gegner · Kriegsschrei, Fluch der Schwäche: Fluchrune in der Farbe der Fertigkeit, Rauch ·
    Totenbeschwörung: Riss, Knochenzacken und Rauch, wo die Skelette aufsteigen · Lebensentzug: rote
    Tropfen kreisen zur Figur · Knochenspeer: Splitter im Boden · Kritische Treffer: weißer Kreuzblitz.
  - Flüche rufen je Gegner `SKILL_FX[id].curseHit(m)` auf; die Farbe der Rune steht in `m.vulnerable.color`.
