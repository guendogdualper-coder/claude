# Seelenstein – Grafik-Bibel (Version 7.9)

Dieses Dokument beschreibt, wie **alles** in Seelenstein aussehen soll: Licht und Schatten, die
Spielerfigur, jedes Ausrüstungsteil in jeder Stufe, alle Monsterfamilien, Boden, Gras und Wasser.
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

- **Spielerfigur:** sichtbar höchstens etwa 24.000 Dreiecke, Schattenmodell höchstens 3.000.
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
