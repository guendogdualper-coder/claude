# Monster-Prompts (Version 6.7)

Dieser Katalog beschreibt jedes der 76 Monster von „Seelenstein“ als Vorlage für Konzeptzeichnungen, 3D-Modelle und Animationen. Zu jedem Monster gibt es Design, Skizzenblatt, die vier Animationsphasen (Ruhe, Bewegung, Ausholen, Schlag), Treffer und Tod sowie einen fertigen englischen Bild-Prompt. Alle Werte (Stufe, Farben, Größe, Ausholzeit) stammen direkt aus den Spieldaten.

**Globale Stilregeln**

- **Look:** stilisiertes 3D im Toon-Stil, kräftiges Cel-Shading mit zwei bis drei Tonstufen, dicke dunkle Outlines, leicht überzeichnete Proportionen (großer Kopf und große Waffen bei Humanoiden, kräftige Schultern bei Bestien), keine fotorealistischen Texturen.
- **Kamera:** erhöhte Dreiviertel-Draufsicht. Gespielt wird auf dem iPhone im Querformat, ein normales Monster ist dort nur etwa daumennagelgroß. Die Silhouette muss deshalb **von oben** lesbar sein: Hörner, Hauer, Schwänze, Flügel und Waffen ragen deutlich aus dem Umriss, Rücken und Schultern tragen die wichtigste Farbe.
- **Timing:** jeder Angriff hat drei klar getrennte Phasen – Ausholen (Monster bleibt stehen, dreht sich zum Ziel, pulsiert schwach rot), Schlag (≈ 0,3 s, schnell und hart) und Erholung (kurzes Halten, dann federn zurück in die Ruhe). Der Schaden fällt erst am Ende des Ausholens; die Ausholpose muss also so deutlich sein, dass Spieler rechtzeitig ausweichen.
- **Augen:** keine großen, niedlichen Anime-Augen bei Bestien, Brutalos und Untoten. Tiere haben kleine, tierische Augen (bei Raubtieren nach vorn, bei Beutetieren seitlich), Monster schmale, glühende Schlitze.
- **Anatomie:** echte Tiere bekommen echte Tieranatomie (Gelenke, Gangarten, Hufe/Pfoten richtig). Fantasie-Wesen dürfen übertreiben, bleiben aber in sich glaubwürdig.
- **Farben:** die Hex-Werte aus den Daten sind verbindlich (Fell, Bauch, Augen, Runen). Glühende Teile (Augen, Risse, Runen) leuchten additiv und bleiben auch im Schatten hell.
- **Größe:** der Größenwert aus den Daten ist ein Richtwert (12 ≈ ein menschlicher Held, 20+ = deutlich größer als der Held, 60+ = Raid-Boss, der den Bildschirm dominiert).
- Monster mit **eigenem 3D-Modell** (Wildschwein, Dornenkeiler, Rothirsch, Donnerbock, Wollmammut) sind bereits gebaut; ihre Einträge dienen als Referenz für Feinschliff und Animation.

## Angriffsarten

Alle Arten sind im Spiel umgebaut und laufen nach demselben Muster: **Ausholen** (Zeit je Monster, siehe unten) → **Schlag** in ≈ 0,3 s → kurzes Halten (bis ≈ 0,6 der Schlagphase) → **Erholung**, in der das Monster in ≈ 0,3–0,4 s in die Ruhepose zurückfedert. Während des Ausholens bleibt das Monster stehen, dreht sich zum Ziel und pulsiert schwach rot.

| Art | Ausholen | Schlag und Effekt | Ausholzeit |
|---|---|---|---|
| **bite** (Biss) | zurückweichen, Kopf hoch, Kiefer weit auf | vorschnellen, Vorderbeine greifen, Kiefer schnappt zu; zwei leuchtende Kieferbögen über dem Ziel | 0,34 s (flinke) / 0,4 s |
| **gore** (Hauer) | Kopf tief, Vorderhuf scharrt schnell, leichtes Ducken | vorpreschen, Kopf mit Hauern hochreißen; Aufwärts-Hiebbogen + Staubwolke | 0,48 s |
| **ram** (Geweih/Hörner) | Kopf ganz tief, Geweih/Hörner nach vorn | vorstoßen und Kopf hochschleudern; Hieb + Staub | 0,48 s |
| **maul** (Bär) | Aufrichten auf die Hinterbeine, beide Pranken hoch, Maul auf | nach vorn niederkrachen mit Prankenhieb; drei Krallenspuren | 0,48 s |
| **pounce** (Katzen) | tief ducken, Schwanzspitze zuckt | Sprung mit gestreckten Vorderpranken; drei Krallenspuren | 0,34 s |
| **fang** (Spinnen) | Vorderbeine hoch, Körper kippt zurück | nach vorn schlagen und zubeißen; grüner Kieferbogen | 0,34 s / 0,4 s |
| **sting** (Skorpion) | Schwanz weit zurück, Scheren auf | Schwanz peitscht über den Kopf und sticht; dünner Hieb + Giftfunken | 0,4 s |
| **snap** (Schlangen) | Hals steigt zum S und zieht zurück | blitzschneller Vorstoß; Kieferbogen | 0,34 s / 0,4 s |
| **thrust** (Naga) | Leib rollt sich zurück | Ausfall mit dem Speer | 0,34 s / 0,4 s |
| **spit / cast / shoot** | Arme heben sich / Bogen spannt / Haube spreizt sich | Geschoss fliegt los | 0,34 s / 0,4 s |
| **breath** (Drachen) | Kopf bäumt sich, Flügel spreizen, Kiefer auf | Feueratem mit Funken | 0,55 s |
| **slam** (Oger, Yeti, Troll, Golems, Titanen) | beide Fäuste über den Kopf, Oberkörper nach hinten | Ganzkörper-Hieb auf den Boden; Schockwellenring, Felssplitter, Bildschirmwackeln | 0,55 s |
| **claw** (Dämonen, Ghul, Gargoyle) | Klaue weit zur Seite, Oberkörper dreht ein | Hieb quer durch; Krallenspuren | 0,34 s / 0,4 s |
| **charge** (Minotaurus) | Kopf runter, Hörner vor | Rammstoß | 0,55 s |
| **haunt** (Geister) | Arme heben sich, Körper schwebt hoch | beide Arme stoßen vor; violetter Rauch | 0,4 s |
| **swing** (bewaffnete Humanoide, Orks) | Waffe weit hinter den Kopf, Oberkörper dreht ein | diagonaler Hieb nach unten; Hiebbogen | 0,34 s / 0,4 s |

Faustregel: schwere Brocken (slam, charge, breath) holen am längsten aus, Huftiere und Bären mittel, flinke Tiere (Tempo ≥ 115) am kürzesten.

## Sonnenwiesen (Map 1)

Grüne, sonnige Startwiesen rund um Vlotho. Echte, bodenständige Tiere in warmen Erdtönen – die Monster sollen glaubwürdig wirken, aber noch nicht bedrohlich. Hier lernt der Spieler, die rote Ausholwarnung zu lesen.

### Wilder Hund (Stufe 1) – hund
**Design:** Ein verwilderter Hofhund, mager und hochbeinig, mit sichtbaren Rippen, eingefallenen Flanken und schlaff hängender Rute. Fell `#8a6748` mit zotteligen, ungleichmäßigen Büscheln, heller Bauch und Kehle `#c8a47e`, kleine braune Augen `#7a4a1a`. Ein Ohr steht, das andere ist eingerissen und knickt ab – das macht ihn von oben sofort vom Wolf unterscheidbar. Größe 12, also etwa hüfthoch zum Helden.
**Skizze:** Seitenansicht mit gekrümmtem Rücken und eingezogenem Bauch, Frontansicht mit schmaler Brust, Draufsicht als schmaler Keil mit Knick-Ohr. Thumbnails: schnüffelnd, knurrend mit gesträubtem Nackenfell, geduckt zurückweichend, im Sprung.
**Ruhe:** Steht unruhig, kratzt sich mit dem Hinterlauf hinter dem Ohr, schnüffelt am Boden, das Knick-Ohr wippt.
**Bewegung:** Unsauberer Trab im Diagonalpaar (vorne links mit hinten rechts), Kopf tief, Rute hängt; bei Verfolgung ein hastiger Galopp mit hüpfendem Hinterteil.
**Ausholen (0,4 s):** Weicht einen halben Schritt zurück, hebt den Kopf, zieht die Lefzen hoch und reißt das Maul weit auf; Nackenhaare stellen sich.
**Schlag:** Vorschnellen mit beiden Vorderpfoten nach vorn, Kiefer schnappt zu, zwei kurze helle Kieferbögen über dem Ziel.
**Treffer & Tod:** Jault, knickt seitlich weg und zieht den Schwanz ein; beim Tod rollt er auf die Seite, die Beine zucken einmal.
**Prompt (EN):**
```
Stylized 3D toon MMORPG creature concept sheet of a scrawny feral dog, lean and long-legged with visible ribs, shaggy brown fur #8a6748, pale belly #c8a47e, small brown eyes, one torn floppy ear, thick dark outlines, chunky cel shading. Side view, front view, elevated three-quarter top-down game view, plus wind-up pose (backing off, head raised, jaws wide open, faint red glow) and strike pose (lunging, jaws snapping shut with two glowing bite arcs). Readable silhouette at small size, white background.
```

### Rotfuchs (Stufe 2) – fuchs
**Design:** Ein echter Rotfuchs: schlanker, niedriger Körper, spitze schmale Schnauze, große dreieckige Ohren mit schwarzer Rückseite und schwarze „Socken“ an den Läufen. Fell kräftig `#c8682a`, Kehle, Bauch und Schnauze `#f4ece0`, buschige Lunte mit weißer Spitze `#f8f4ec`, bernsteinfarbene Augen `#d8a03a` mit senkrechten Schlitzpupillen. Größe 11 – kleinstes Monster der Map, die Lunte ist fast so lang wie der Körper und von oben das Erkennungsmerkmal.
**Skizze:** Seitenansicht mit waagerecht getragener Lunte, Frontansicht mit großen Ohren, Draufsicht als schmaler Strich mit dickem weißem Schwanzende. Thumbnails: lauschend mit gedrehten Ohren, Mäusesprung, geduckt schleichend, mit gefletschten Zähnen.
**Ruhe:** Sitzt halb, dreht die Ohren einzeln wie Radarschüsseln, die Lunte schlängelt sich um die Pfoten.
**Bewegung:** Schnürender Trab – die Hinterpfoten treten genau in die Spuren der Vorderpfoten, der Körper bleibt fast ruhig; die Lunte schwebt waagerecht als Gegengewicht.
**Ausholen (0,34 s):** Kurzes Zurückfedern, Ohren flach nach hinten, Kopf hoch, schmales Maul klappt weit auf.
**Schlag:** Flinker Schnappbiss aus dem Sprung, Vorderpfoten gestreckt; zwei kleine Kieferbögen, schneller als beim Hund.
**Treffer & Tod:** Keckernder Laut, Sprung zur Seite; beim Tod rollt er sich ein, die Lunte legt sich über die Schnauze.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a real red fox, slim low body, narrow pointed muzzle, large triangular ears with black backs, black leg socks, bright orange fur #c8682a, cream throat #f4ece0, huge bushy tail with white tip, amber slit-pupil eyes, no cute anime eyes. Side, front and top-down three-quarter views, wind-up pose (ears flat, jaws open) and quick snapping bite with two small glowing jaw arcs. Thick dark outlines, chunky cel shading.
```

### Wolf (Stufe 3) – wolf
**Design:** Grauer Wolf mit echter Wolfsanatomie: lange Läufe, schmaler, tiefer Brustkorb, großer Kopf mit breiter Stirn, kurze Ohren, buschige Rute, die tief hängt. Fell `#7d8188`, Bauch und Wangen `#c4c7cb`, heller Halskragen `#a4a8ad`, gelbe Augen `#d8a03a`, sichtbare Fangzähne. Größe 13, schlanker und höher als der Wilde Hund.
**Skizze:** Seitenansicht mit gerader Rückenlinie und hängender Rute, Frontansicht mit schmaler Brust und breitem Kragen, Draufsicht als langgezogene Form mit hellem Kragen-Ring. Thumbnails: heulend, witternd, im Rudel-Lauf, Biss.
**Ruhe:** Steht ruhig, Kopf leicht gesenkt, wittert mit zuckender Nase; gelegentlich ein kurzes Heulen mit gestrecktem Hals.
**Bewegung:** Ausdauernder Trab im Diagonalpaar, der Kopf bleibt waagerecht vorn, der Kragen wippt; im Rennen gestreckter Galopp, Rücken biegt sich wie eine Feder.
**Ausholen (0,4 s):** Weicht zurück, Kopf hoch, Lefzen gezogen, Kiefer weit offen, Ohren nach vorn auf das Ziel.
**Schlag:** Langer Satz nach vorn, Vorderläufe greifen, Kiefer schnappt zu; zwei leuchtende Kieferbögen.
**Treffer & Tod:** Duckt sich mit angelegten Ohren; beim Tod sackt er auf die Brust, rollt zur Seite, die Rute sinkt zuletzt.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a grey wolf with realistic wolf anatomy: long legs, narrow deep chest, broad skull, short ears, low-hanging bushy tail, fur #7d8188, pale belly #c4c7cb, light neck ruff #a4a8ad, yellow eyes, visible fangs. Side, front, elevated three-quarter top-down views; wind-up pose (backing off, head raised, jaws wide) and strike (lunging bite with two glowing jaw arcs). Thick dark outlines, chunky toon shading, readable at phone size.
```

### Rothirsch (Stufe 5) – hirsch
**Design:** Eigenes 3D-Modell. Ein echter Rothirsch: lange, dünne Läufe mit Fesseln und gespaltenen Hufen, langer, schräg aufgerichteter Hals mit dunklerer Halsmähne `#6a4a2a`, schmaler Schädel mit langer Schnauze. Fell `#9a6a3e`, heller Bauch und Spiegel am Hinterteil `#e8dcc8`, kurzer Wedel, große dunkle Augen `#2a1a10` seitlich am Kopf, blattförmige Ohren. Das Geweih `#e0d0b0` mit Aug-, Eis- und Mittelsprosse und kleiner Krone ist von oben die markanteste Form. Größe 17.
**Skizze:** Seitenansicht mit erhobenem Kopf, Frontansicht mit weit ausladendem Geweih, Draufsicht mit Geweih als „Krone“ vor dem schmalen Körper. Thumbnails: äsend, röhrend mit gestrecktem Hals, flüchtend im Sprung, Geweihstoß.
**Ruhe:** Äst mit gesenktem Kopf, hebt ihn plötzlich, die Ohren drehen; ab und zu röhrt er mit geöffnetem Maul.
**Bewegung:** Federnder Schritt im Viertakt, Hals nickt mit; bei Tempo ein hoher Trab, im Rennen ein Galopp mit weiten Sprüngen.
**Ausholen (0,48 s):** Senkt den Kopf ganz tief, Geweih zeigt nach vorn, Hinterläufe spannen, Vorderhuf scharrt.
**Schlag:** Stößt vor und schleudert den Kopf hoch; Hiebbogen nach oben und eine Staubwolke.
**Treffer & Tod:** Zuckt mit Hals und Ohren zurück; beim Tod knicken zuerst die Vorderläufe ein, dann fällt er zur Seite, das Geweih schlägt zuletzt auf.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a real red deer stag: long thin legs with cloven hooves, long raised neck with darker mane #6a4a2a, narrow skull, fur #9a6a3e, pale rump patch and belly #e8dcc8, side-set dark eyes, big branching antlers #e0d0b0. Side, front, top-down three-quarter views; wind-up (head lowered deep, antlers forward, hoof scraping) and strike (thrusting forward and flicking the head up with slash arc and dust). Thick outlines, cel shading.
```

### Alpha-Wolf (Stufe 6) – alphawolf
**Design:** Der Rudelführer: deutlich größer (Größe 16) und schwerer als der normale Wolf, mit dicker, dunkler Mähne `#25292e` über Nacken und Schultern, die den Widerrist höher wirken lässt. Fell `#43484f`, Bauch `#8d9196`, glühend rote Augen `#ff3a2a`, eine helle Narbe quer über das linke Auge, lange Fänge, dauerhaft gerunzelte Schnauze. Die Mähne bildet von oben einen dunklen Kragen – so liest man ihn im Rudel sofort als Anführer.
**Skizze:** Seitenansicht mit hohem Mähnenbuckel, Frontansicht mit breiter Brust und Narbe, Draufsicht mit dunklem Mähnenkragen und roten Augenpunkten. Thumbnails: dominantes Stehen mit erhobener Rute, Heulen, Knurren, Sprungbiss.
**Ruhe:** Steht breitbeinig, Rute erhoben, beobachtet; schüttelt die Mähne, knurrt leise mit sichtbaren Fängen.
**Bewegung:** Schwerer, selbstbewusster Trab, die Mähne schwingt bei jedem Schritt; im Rennen kraftvoller Galopp mit tiefem Kopf.
**Ausholen (0,34 s):** Sehr kurz: ein Ruck zurück, Kopf hoch, Kiefer reißt auf, die Augen glühen stärker.
**Schlag:** Wuchtiger Sprungbiss, Vorderläufe ausgestreckt, zwei rote Kieferbögen über dem Ziel.
**Treffer & Tod:** Knurrt und weicht kaum; beim Tod ein letztes Heulen, dann sackt er zusammen und das Augenglühen erlischt.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of an alpha wolf pack leader, larger and heavier than a normal wolf, dark grey fur #43484f, thick black mane #25292e over neck and shoulders, belly #8d9196, glowing red eyes #ff3a2a, scar across one eye, long fangs. Side, front and top-down three-quarter views, wind-up (jerking back, jaws wide, eyes flaring) and leaping bite with two red jaw arcs. Thick dark outlines, chunky cel shading, menacing, no cute eyes.
```

### Wildschwein (Stufe 8) – wildschwein
**Design:** Eigenes 3D-Modell, ausdrücklich **nicht** bärenartig. Niedriger Keil-Körper: mächtige Schultern vorn, hoher Widerrist mit Borstenkamm `#2a1e16`, Rücken fällt zur schmalen Hüfte ab. Langer Keilkopf schräg nach vorn unten mit flacher Rüsselscheibe `#c09080`, Unterkiefer-Hauer biegen nach oben, kleine obere Hauer. Fell `#5a3f2e` mit hellen Stichelhaaren, Bauch `#7a5a44`, kleine tiefliegende Augen `#3a1a0a`, spitze Ohren mit Büschel, dünne Beine mit gespaltenen Hufen, dünner Schwanz mit Quaste. Größe 15.
**Skizze:** Seitenansicht mit Keilprofil und Borstenkamm, Frontansicht mit Rüsselscheibe und Hauern, Draufsicht als Tropfen (breit vorn, schmal hinten). Thumbnails: wühlend, mit erhobenem Kamm, scharrend, Hauerstoß.
**Ruhe:** Wühlt mit der Rüsselscheibe im Boden, Schwanz peitscht, Ohren zucken; grunzt mit bebender Flanke.
**Bewegung:** Trippelnder Trab auf dünnen Beinen, der schwere Vorderkörper wippt kaum, der Schwanz pendelt; im Angriff ein kurzer, harter Galopp.
**Ausholen (0,48 s):** Kopf tief, ein Vorderhuf scharrt schnell den Boden, leichtes Ducken, der Borstenkamm stellt sich.
**Schlag:** Vorpreschen und Kopf mit den Hauern hochreißen; Aufwärts-Hiebbogen und Staubwolke.
**Treffer & Tod:** Quiekt, schüttelt den Kopf; beim Tod kippt er schwer auf die Seite, die Läufe strampeln kurz.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a real wild boar, explicitly not bear-like: low wedge-shaped body, massive shoulders, high bristly withers with dark crest #2a1e16, long wedge head with flat snout disc #c09080, upward-curving lower tusks, brown fur #5a3f2e with grizzled guard hairs, small deep-set eyes, thin legs with cloven hooves, thin tail with tuft. Side, front, top-down three-quarter views; wind-up (head low, hoof scraping) and strike (charging, tossing tusks up with upward slash arc and dust cloud). Thick outlines, cel shading.
```

## Dunkelwald (Map 4)

Dichter Nadelwald mit Moos, Nebel und Lichtsäulen. Erste Humanoide (Banditen) und die ersten Tiere, die wirklich gefährlich aussehen. Farben gedeckt grün-braun, Akzente in Rot (Banditenmasken, Spinnenzeichnung) und Giftgrün.

### Bandit (Stufe 11) – bandit
**Design:** Ein hagerer Wegelagerer in Menschengröße (Größe 12, Skalierung 0,95) mit tief ins Gesicht gezogener Kapuze `#5a3a22` und rotem Tuch `#9a2f2a` über Mund und Nase – nur die Augen sind sichtbar. Wams `#6d5a3e`, Ärmel `#5c4b33`, Hose `#4a3b2a`, Stiefel `#2f2419`, Kreuzgurte `#3a2a1c`, prall gefüllter Lederbeutel `#8a6a44` am Gürtel und ein kurzer, zerschlissener Umhang `#7a2a24`. In der Rechten ein schartiges Kurzschwert. Haut `#d9b896`.
**Skizze:** Seitenansicht mit vorgebeugter, lauernder Haltung, Frontansicht mit Maske und Gurten, Draufsicht: Kapuzenspitze, roter Umhang als Dreieck hinten, Schwert seitlich. Thumbnails: Münze werfend, geduckt schleichend, Ausholen, Hieb.
**Ruhe:** Wiegt das Schwert locker in der Hand, blickt sich nervös um, klopft auf den Beutel.
**Bewegung:** Federnder, geduckter Gang auf den Fußballen, der Umhang flattert, beim Rennen lehnt der Oberkörper weit nach vorn.
**Ausholen (0,4 s):** Schwert weit hinter den Kopf, Oberkörper dreht ein, linker Arm zeigt auf das Ziel.
**Schlag:** Diagonaler Hieb von rechts oben nach links unten, heller Hiebbogen, ein Ausfallschritt nach vorn.
**Treffer & Tod:** Taumelt, hält sich die Seite; beim Tod fällt er auf die Knie und dann vornüber, der Beutel platzt und Münzen rollen.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a lean forest bandit: deep brown hood #5a3a22, red cloth mask #9a2f2a over mouth and nose, brown leather tunic #6d5a3e, crossed straps, bulging coin pouch, short tattered red cape #7a2a24, notched short sword. Side, front and top-down three-quarter views, wind-up pose (sword raised far behind the head, torso twisted, faint red glow) and strike pose (diagonal downward slash with bright arc). Chunky cel shading, thick dark outlines.
```

### Dornenkeiler (Stufe 12) – dornenkeiler
**Design:** Eigenes 3D-Modell: derselbe echte Wildschwein-Körperbau wie das Wildschwein (Keil-Körper, hoher Widerrist, Rüsselscheibe `#a88a6a`, dünne Beine mit gespaltenen Hufen), aber größer (Größe 17) und vom Wald überwuchert. Statt Borsten wachsen grüne Dornen `#6a8a3a` aus dem Kamm, Moospolster `#5a7a2e` und Ranken liegen auf dem Rücken. Fell `#4a3a26`, Bauch `#6a5a3a`, lange, cremeweiße Hauer `#e8e0b8`, kleine giftgrün glühende Augen `#c8ff6a`.
**Skizze:** Seitenansicht mit Dornenkamm wie eine Säge, Frontansicht mit gewaltigen Hauern, Draufsicht: dunkler Keil mit grüner Dornenlinie auf dem Rückgrat. Thumbnails: Moos abschüttelnd, Dornen gesträubt, scharrend, Hauerstoß.
**Ruhe:** Schnaubt grüne Sporenwölkchen aus der Rüsselscheibe, die Dornen heben und senken sich mit dem Atem.
**Bewegung:** Schwerer als das Wildschwein: trippelnder Trab, Rankenenden schwingen, die Dornen klappern leicht; im Angriff kurzer, rammender Galopp.
**Ausholen (0,48 s):** Kopf tief, Vorderhuf scharrt schnell, die Dornen stellen sich fächerförmig auf, die Augen flackern grün.
**Schlag:** Vorpreschen, Kopf hochreißen; Aufwärts-Hiebbogen, Staub und ein paar fliegende Blätter.
**Treffer & Tod:** Dornen zittern, Blätter rieseln; beim Tod kippt er zur Seite, Moos und Ranken welken grau.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a thorn boar with real wild boar anatomy (low wedge body, high withers, flat snout disc, thin legs with cloven hooves, thin tufted tail), dark brown fur #4a3a26, green thorns #6a8a3a growing along the spine, moss and vines on its back, long cream tusks #e8e0b8, small glowing toxic-green eyes #c8ff6a. Side, front, top-down three-quarter views, wind-up (head low, hoof scraping, thorns raised) and upward tusk strike with slash arc and dust. Thick outlines, cel shading.
```

### Bandit-Schütze (Stufe 13) – banditschuetze
**Design:** Ein schmaler Bogenschütze (Größe 12) in Waldtarnung: Kapuze `#3e5530`, rotes Maskentuch `#9a2f2a`, Wams `#4f6a3e`, Ärmel `#435a35`, Hose `#3e4a2e`, Stiefel `#2f2419`. Langbogen aus dunklem Holz, auf dem Rücken ein Köcher `#6b4a2e` mit befiederten Pfeilen, die von oben als Fächer über die Schulter ragen. Lederner Armschutz am linken Unterarm.
**Skizze:** Seitenansicht in Schussstellung, Frontansicht mit Maske, Draufsicht: grüne Kapuze, Pfeilfächer, Bogen als langer Bogenstrich quer. Thumbnails: Pfeil ziehend, kniend zielend, Rückzugsschritt, Schuss.
**Ruhe:** Prüft die Sehne, zupft daran, lehnt sich auf den Bogen; dreht den Kopf suchend.
**Bewegung:** Leiser Seitschritt-Gang, hält Abstand; beim Rennen hält er den Bogen tief in der Linken, der Köcher hüpft.
**Ausholen (0,4 s):** Zieht einen Pfeil, legt an, spannt den Bogen voll, Oberkörper dreht seitlich, die Sehne zittert.
**Schlag:** Lässt los, der Bogen schnellt nach vorn, ein grün gefiederter Pfeil fliegt mit hellem Leuchtstreifen; die Hand bleibt kurz offen.
**Treffer & Tod:** Weicht zurück und hebt schützend den Bogen; beim Tod fällt er rücklings, Pfeile rutschen aus dem Köcher.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a bandit archer in forest camouflage: green hood #3e5530, red cloth mask #9a2f2a, green tunic #4f6a3e, leather bracer, dark wooden longbow, quiver #6b4a2e with feathered arrows fanning over the shoulder. Side, front, top-down three-quarter views; wind-up (drawing the bow fully, torso turned, faint red glow) and release pose with a glowing arrow streak. Thick dark outlines, chunky cel shading, readable at phone size.
```

### Waldspinne (Stufe 15) – waldspinne
**Design:** Eine handkarrengroße Spinne (Größe 14) mit echter Spinnenanatomie: Vorderkörper mit acht Augen in zwei Reihen, kräftige Kieferklauen, dicker, behaarter Hinterleib mit einer roten Zeichnung `#b8402a` in Form eines Keils. Körper `#3a3328`, Beine in acht Gliedern mit hellen Gelenkringen, die Augen glühen rot `#ff4a3a`. Die gespreizten Beine bilden von oben einen achtzackigen Stern – das muss klar lesbar bleiben.
**Skizze:** Seitenansicht flach am Boden, Frontansicht mit Augenreihen und Kieferklauen, Draufsicht als Stern mit rotem Keil auf dem Hinterleib. Thumbnails: an einem Faden hängend, lauernd, Vorderbeine gehoben, Biss.
**Ruhe:** Hockt flach, putzt mit den Tastern die Kieferklauen, ein Bein tippt den Boden ab.
**Bewegung:** Echter Spinnengang mit wechselnden Viererbeinen (L1, R2, L3, R4, dann die Gegenseite), der Körper gleitet ruhig, der Hinterleib wippt leicht nach.
**Ausholen (0,34 s):** Die zwei Vorderbeinpaare schnellen hoch in die Luft, der Körper kippt nach hinten, die Kieferklauen spreizen.
**Schlag:** Wirft sich nach vorn, Beine schlagen nieder, Biss; ein grüner Kieferbogen.
**Treffer & Tod:** Zieht die Beine zusammen; beim Tod dreht sie sich auf den Rücken und die Beine krümmen sich nach innen.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a large forest spider with real spider anatomy: eight eyes glowing red #ff4a3a, strong fangs, hairy dark brown body #3a3328, bulbous abdomen with a red wedge marking #b8402a, eight segmented legs forming a star from above. Side, front, top-down three-quarter views; wind-up (front legs raised high, body tilted back) and strike (slamming forward to bite, green jaw arc). Thick outlines, cel shading, creepy but readable.
```

### Luchs (Stufe 16) – luchs
**Design:** Ein echter Eurasischer Luchs: kurzer, kompakter Körper auf langen Beinen, riesige Pfoten, Stummelschwanz mit schwarzer Spitze `#1a1410`, lange schwarze Ohrpinsel `#1a1410` und ein heller Backenbart. Fell `#b08a5a` mit dunklen Flecken `#5a4630`, Kehle, Bauch und Schnauze `#efe2c8`, grün-gelbe Augen `#c8d84a`, sichtbare Eckzähne. Größe 13. Von oben erkennt man ihn an den Ohrpinseln und dem fehlenden Schwanz.
**Skizze:** Seitenansicht mit hohem Hinterteil, Frontansicht mit Backenbart und Pinselohren, Draufsicht mit runden Pfoten und Stummelschwanz. Thumbnails: auf einem Ast lauernd, putzend, geduckt, im Sprung.
**Ruhe:** Sitzt aufrecht, putzt eine Pfote, die Ohrpinsel zittern; der Stummelschwanz zuckt.
**Bewegung:** Lautloser Schleichgang mit tief getragenem Kopf, Hinterpfoten treten in die Vorderspuren; im Rennen ein federnder Sprunggalopp.
**Ausholen (0,34 s):** Duckt sich ganz tief, Hinterteil wackelt, der Stummelschwanz zuckt, die Ohren legen sich an.
**Schlag:** Weiter Satz mit gestreckten Vorderpranken; drei Krallenspuren über dem Ziel.
**Treffer & Tod:** Faucht und springt zurück; beim Tod rollt er sich zusammen, die Pfoten über der Schnauze.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a real Eurasian lynx: compact body on long legs, huge paws, short bobbed tail with black tip, long black ear tufts, pale cheek ruff, tawny fur #b08a5a with dark spots #5a4630, cream belly #efe2c8, green-yellow eyes #c8d84a. Side, front, top-down three-quarter views; wind-up (crouching very low, tail twitching) and pounce (leaping with front paws stretched, three glowing claw marks). Thick dark outlines, chunky cel shading.
```

### Braunbär (Stufe 18) – braunbaer
**Design:** Ein echter Braunbär (Größe 19): mächtiger Schulterbuckel, Sohlengänger mit breiten Pranken und langen hellen Vorderkrallen, eingedelltes Gesichtsprofil, kleine runde Ohren, kaum sichtbarer Schwanz. Fell `#6a4a30`, Bauch `#9a7a58`, hellere Schnauze `#b89a78`, kleine dunkle Augen `#3a2010`, gefletschte Fänge. Von oben bildet der Schulterbuckel die breiteste Stelle, das Hinterteil ist schmaler.
**Skizze:** Seitenansicht vierbeinig und aufgerichtet, Frontansicht mit breitem Kopf, Draufsicht als schwere Birne mit hellerer Schnauze vorn. Thumbnails: schnüffelnd, sich am Baum reibend, aufgerichtet brüllend, Prankenhieb.
**Ruhe:** Schwankt mit dem Kopf hin und her, schnüffelt, setzt sich auf das Hinterteil und kratzt sich.
**Bewegung:** Schwerer Passgang (beide Beine einer Seite fast gleichzeitig), der Schulterbuckel rollt, das Fell schwingt; im Rennen ein überraschend schneller, wogender Galopp.
**Ausholen (0,48 s):** Richtet sich auf die Hinterbeine auf, beide Pranken hoch, Maul weit offen – er überragt den Helden deutlich.
**Schlag:** Kracht nach vorn nieder und schlägt mit der Pranke; drei breite Krallenspuren.
**Treffer & Tod:** Brummt und schüttelt sich; beim Tod sackt er auf die Brust, dann langsam auf die Seite.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a real brown bear: massive shoulder hump, plantigrade broad paws with long pale front claws, dished face profile, small round ears, brown fur #6a4a30, lighter belly #9a7a58 and muzzle #b89a78, small dark eyes, bared fangs. Side, front, top-down three-quarter views; wind-up (rearing up on hind legs, both paws raised, mouth open) and strike (crashing down with a paw swipe, three claw marks). Thick outlines, cel shading.
```

## Orktal (Map 5)

Ockerfarbene Schlucht mit Palisaden, Kriegszelten und Totems. Orks sind breitschultrig, mit kurzen Beinen, langen Armen und kräftigen Hauern im Unterkiefer; ihr Grün wird mit zunehmendem Rang dunkler und ihre Rüstung goldener. Dazu Steppentiere aus der Schlucht.

### Ork-Krieger (Stufe 21) – ork
**Design:** Der Standard-Ork (Größe 15, Skalierung 1,12): breiter Oberkörper, kurzer Hals, lange Arme, krumme kurze Beine. Haut `#6f8f45`, vorstehender Unterkiefer mit zwei Hauern, flache Nase, Stirnband `#3e3226`. Lederharnisch `#5a4632`, Hose `#3e3226`, Stiefel `#2a2018`, ein einzelner Stahlschulterpanzer `#7d848c` mit Stacheln auf der Waffenschulter, Riemen und eine Kette aus Zähnen. Waffe: eine schwere, einseitige Axt.
**Skizze:** Seitenansicht mit vorgeschobenem Kopf und Buckel, Frontansicht mit Hauern und asymmetrischem Schulterpanzer, Draufsicht: breite Schultern, Stachelpanzer rechts, Axtblatt als klare Form. Thumbnails: brüllend, Axt schulternd, ausholend, Hieb.
**Ruhe:** Schultert die Axt, rollt den Nacken, schnaubt; klopft sich mit der Faust auf die Brust.
**Bewegung:** Breitbeiniges Stapfen, Schultern schaukeln stark gegen die Schritte, die Axt wippt auf der Schulter; im Rennen nach vorn gebeugt mit Axt in beiden Händen.
**Ausholen (0,4 s):** Axt weit hinter den Kopf, Oberkörper dreht ein, Maul weit auf zum Kriegsschrei.
**Schlag:** Diagonaler Axthieb von oben nach unten, schwerer Hiebbogen, ein Stampfschritt nach vorn.
**Treffer & Tod:** Knurrt und schüttelt den Kopf; beim Tod fällt er auf ein Knie, stützt sich auf die Axt und kippt dann vornüber.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of an orc warrior: broad hunched torso, long arms, short bowed legs, green skin #6f8f45, jutting jaw with two tusks, flat nose, leather headband, leather harness #5a4632, one spiked steel pauldron #7d848c, tooth necklace, heavy single-bladed axe. Side, front, top-down three-quarter views; wind-up (axe raised far behind the head, torso twisted, roaring) and diagonal downward axe strike with heavy slash arc. Thick outlines, chunky cel shading.
```

### Tüpfelhyäne (Stufe 23) – hyaene
**Design:** Eine echte Tüpfelhyäne (Größe 14): abfallende Rückenlinie, weil die Vorderbeine länger sind als die Hinterbeine, dicker, muskulöser Hals, kurze dunkle Mähne `#4a3a28` auf dem Nacken, große runde Ohren, kurzer buschiger Schwanz. Fell `#a08a62` mit dunklen Tupfen `#3a2e20`, Bauch `#c8b890`, schwarze Schnauze `#3a2e22`, gelb-braune Augen `#d8a03a`, kräftiges Gebiss. Von oben: breite Schultern, schmale Hüfte, runde Ohren.
**Skizze:** Seitenansicht mit deutlich schräger Rückenlinie, Frontansicht mit runden Ohren und schwarzer Schnauze, Draufsicht mit Tupfenmuster. Thumbnails: kichernd mit offenem Maul, Knochen kauend, geduckt schleichend, Biss.
**Ruhe:** Kaut auf einem Knochen, hebt den Kopf und „kichert“ mit zuckenden Schultern; die Mähne stellt sich kurz.
**Bewegung:** Typischer schaukelnder Hyänen-Trab mit hängendem Kopf, das Hinterteil wirkt schwach und wackelt; im Rennen ein ausdauernder, holpriger Galopp.
**Ausholen (0,34 s):** Kurzer Ruck zurück, Kopf hoch, das starke Maul klappt weit auf, Mähne gesträubt.
**Schlag:** Vorschnellen und Zuschnappen mit Kopfschütteln; zwei Kieferbögen.
**Treffer & Tod:** Jault schrill, duckt sich unterwürfig; beim Tod sackt sie zur Seite, die Zunge hängt heraus.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a real spotted hyena: sloping back (front legs longer than hind legs), thick muscular neck, short dark mane #4a3a28, big round ears, short bushy tail, sandy fur #a08a62 with dark spots #3a2e20, black muzzle #3a2e22, amber eyes, powerful jaws. Side, front, top-down three-quarter views; wind-up (jerking back, jaws wide) and lunging bite with two glowing jaw arcs. Thick dark outlines, chunky cel shading.
```

### Ork-Schamane (Stufe 24) – orkschamane
**Design:** Ein dürrerer, älterer Ork (Größe 14) mit blaugrüner Haut `#5d8a73`, gebeugtem Rücken und langen Fingern. Zerfetzte Robe `#3e5a4f` mit weiten Ärmeln, Ketten aus Knochen und Zähnen, drei Federn im Haar in Gold `#c9a35a`, Rot `#b33a2c` und Blau `#3a6a8a`. Er stützt sich auf einen krummen Stab mit einem Tierschädel an der Spitze, aus dessen Augenhöhlen grünes Licht glimmt.
**Skizze:** Seitenansicht gebeugt am Stab, Frontansicht mit Federn und Ketten, Draufsicht: Federfächer, weite Ärmel, Schädelstab schräg vor dem Körper. Thumbnails: murmelnd, Kräuter werfend, Arme hoch beim Zaubern, Geschoss loslassend.
**Ruhe:** Schwankt leicht, murmelt, schüttelt eine Knochenrassel am Stab; grüne Funken steigen aus dem Schädel.
**Bewegung:** Humpelnder Gang, der Stab setzt bei jedem zweiten Schritt auf, die Robe schleift; beim Rennen hält er den Stab quer vor sich.
**Ausholen (0,4 s):** Beide Arme mit dem Stab hoch über den Kopf, die weiten Ärmel rutschen zurück, ein grüner Wirbel sammelt sich im Schädel.
**Schlag:** Stößt die Arme nach vorn, ein giftgrüner Geisterschädel fliegt als Geschoss mit Rauchschweif auf das Ziel.
**Treffer & Tod:** Taumelt rückwärts, die Rassel klappert; beim Tod sinkt er zusammen, der Stab fällt und das grüne Licht verlischt.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of an old orc shaman: hunched, teal-green skin #5d8a73, tusks, tattered robe #3e5a4f with wide sleeves, bone and tooth necklaces, three feathers in gold, red and blue, crooked staff topped with an animal skull glowing green. Side, front, top-down three-quarter views; wind-up (both arms raising the staff overhead, green vortex gathering) and cast pose (thrusting forward, green ghost-skull projectile with smoke trail). Thick outlines, cel shading.
```

### Wüstenskorpion (Stufe 26) – skorpion
**Design:** Ein echter Skorpion in Riesengröße (Größe 15): flacher, gepanzerter Vorderkörper, zwei kräftige Scherenarme, vier Beinpaare und ein fünfgliedriger Schwanz, der über dem Rücken nach vorn gebogen ist und in einer giftgrün glänzenden Stachelblase `#9be07a` endet. Panzer `#b07a3a` in Sandtönen mit dunkleren Plattenkanten, kleine schwarze Augenpunkte oben auf dem Kopfschild. Von oben ergibt sich die typische Form aus zwei Scheren vorn und dem Schwanzbogen.
**Skizze:** Seitenansicht mit hohem Schwanzbogen, Frontansicht mit offenen Scheren, Draufsicht mit gespreizten Beinen und Schwanz als Kringel. Thumbnails: halb im Sand vergraben, Scheren klappernd, Schwanz zurück, Stich.
**Ruhe:** Öffnet und schließt die Scheren abwechselnd, der Schwanz wippt langsam, Giftfunken tropfen vom Stachel.
**Bewegung:** Achtbeiniger Wellengang, Körper bleibt flach und ruhig, die Scheren gehen vorn mit, der Schwanz pendelt kaum.
**Ausholen (0,4 s):** Schwanz weit nach hinten gespannt, Scheren weit offen und gespreizt, der Körper schiebt sich leicht zurück.
**Schlag:** Der Schwanz peitscht über den Kopf nach vorn und sticht zu; dünner Hiebstrich und grüne Giftfunken.
**Treffer & Tod:** Zieht die Scheren schützend vor den Kopf; beim Tod kippt er auf den Rücken, Beine und Schwanz krümmen sich ein.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a giant desert scorpion with real scorpion anatomy: flat armored body in sandy ochre #b07a3a, two strong pincers, four pairs of legs, five-segment tail arched over the back ending in a glossy toxic-green stinger #9be07a. Side, front, top-down three-quarter views; wind-up (tail pulled far back, pincers wide open) and strike (tail whipping over the head and stabbing, thin slash and green poison sparks). Thick outlines, cel shading.
```

### Ork-Hauptmann (Stufe 28) – orkhauptmann
**Design:** Ein größerer, schwerer Ork (Größe 17, Skalierung 1,28) mit dunklerer Haut `#5a7a38`. Dunkler Plattenharnisch `#3e3a40`, passende Panzerhandschuhe, goldener Gürtel `#c9a35a`, zwei goldene Schulterpanzer mit Stacheln `#c9a35a`, langer roter Umhang `#8a1a14` und ein goldener Helm mit Nasenschutz. Trophäenkette aus Zähnen, große zweihändige Axt. Von oben: gold leuchtende Schultern und roter Umhang – er hebt sich klar von den Kriegern ab.
**Skizze:** Seitenansicht mit wehendem Umhang, Frontansicht mit Helm und goldenen Schultern, Draufsicht: breite goldene Stachelschultern, roter Umhang-Keil. Thumbnails: Befehle brüllend, Axt in den Boden gestemmt, ausholend, Hieb.
**Ruhe:** Stützt sich auf die in den Boden gerammte Axt, blickt herrisch umher, zeigt mit der Faust auf einen Untergebenen.
**Bewegung:** Gemessener, schwerer Schritt, der Umhang schwingt, die Schultern rollen; im Rennen trägt er die Axt quer vor der Brust.
**Ausholen (0,4 s):** Hebt die Axt weit hinter den Kopf, der ganze Oberkörper dreht ein, der Umhang wirbelt.
**Schlag:** Wuchtiger Diagonalhieb mit breitem, goldenem Hiebbogen und Stampfschritt.
**Treffer & Tod:** Weicht kaum, brüllt zurück; beim Tod fällt der Helm ab, er sinkt auf die Knie und kippt auf den Umhang.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of an orc captain: big heavy orc, dark green skin #5a7a38, tusks, dark plate harness #3e3a40, golden spiked pauldrons and belt #c9a35a, golden nose-guard helmet, long red cape #8a1a14, trophy tooth necklace, huge two-handed axe. Side, front, top-down three-quarter views; wind-up (axe raised far behind the head, torso twisted, cape swirling) and powerful diagonal strike with wide golden slash arc. Thick outlines, cel shading.
```

## Ödland (Map 6)

Graue Aschenebene mit toten Bäumen, Knochen und glimmenden Rissen. Die Monster sind dunkel und angesengt; ihre Leuchtfarben (Orange, Glutrot) müssen vor dem grauen Boden besonders kräftig wirken.

### Steinoger (Stufe 32) – oger
**Design:** Ein massiger Oger (Größe 21, Skalierung 1,45) mit Hängebauch, kurzen Säulenbeinen und riesigen Händen. Haut steingrau `#8f897b`, rau wie Fels mit Flechtenflecken, ein einzelnes gelblich-weißes Horn `#e0d6bc` mitten auf der Stirn, schwere Brauenwülste, die die Augen fast verdecken, zwei Hauer aus dem Unterkiefer. Lendenschurz-Hose `#4a3a2a`, Fußwickel `#3a3328`, eine Keule aus einem ganzen Baumstamm mit eingeschlagenen Steinen.
**Skizze:** Seitenansicht mit Bauch und vorgeschobenem Kopf, Frontansicht mit Stirnhorn und Hauern, Draufsicht: runder Bauch, breite Schultern, Keule als dicker Balken. Thumbnails: Keule schleifend, gähnend, beide Arme hoch, Bodenschlag.
**Ruhe:** Kratzt sich am Bauch, gähnt mit offenem Maul, die Keule ruht auf der Schulter; ab und zu klopft er sie auf den Boden.
**Bewegung:** Langsames, schweres Watscheln mit seitlichem Gewichtsverlagern, der Bauch wackelt nach, die Keule schleift bei jedem Schritt.
**Ausholen (0,55 s):** Hebt die Keule mit beiden Fäusten hoch über den Kopf, lehnt den Oberkörper weit zurück, Bauch vorgestreckt.
**Schlag:** Schmettert mit vollem Körpergewicht auf den Boden; Schockwellenring, Felssplitter, Bildschirmwackeln.
**Treffer & Tod:** Grunzt nur, Steinsplitter springen von der Haut; beim Tod fällt er wie ein Baum nach hinten, Staub wirbelt auf.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a stone ogre: massive pot-bellied brute, short pillar legs, huge hands, rough stone-grey skin #8f897b with lichen patches, single ivory horn #e0d6bc on the forehead, heavy brow ridge, lower tusks, loincloth, tree-trunk club studded with rocks. Side, front, top-down three-quarter views; wind-up (club raised overhead in both fists, upper body leaning back) and ground slam with shockwave ring and rock shards. Thick outlines, chunky cel shading.
```

### Aschewarg (Stufe 34) – warg
**Design:** Kein normaler Wolf, sondern ein Warg (Größe 18): höher und breiter, mit hyänenartig schwerem Schädel, dickem Hals, tiefem Brustkorb und hohem Widerrist. Fell fast schwarz `#2e2a2a` mit aschgrauen Spitzen, Bauch `#4a4444`, rußschwarze Mähne `#141010`, aus der ab und zu Asche rieselt. Orange glühende Augen `#ff6a2a`, eine tiefe Narbe über der Schnauze, lange Fänge. Von oben: breiter dunkler Rücken mit grauen Ascheflecken.
**Skizze:** Seitenansicht mit hohem Widerrist und schwerem Kopf, Frontansicht mit breitem Schädel und Narbe, Draufsicht mit Mähnenkragen und orangen Augenpunkten. Thumbnails: Asche abschüttelnd, knurrend, geduckt anpirschend, Sprungbiss.
**Ruhe:** Steht mit gesenktem Kopf, die Flanken heben sich schwer, aus dem Fell steigen kleine Aschewölkchen; schüttelt sich gelegentlich.
**Bewegung:** Wuchtiger Trab, der Kopf pendelt tief, Aschepartikel bleiben in der Spur zurück; im Rennen ein stampfender Galopp.
**Ausholen (0,34 s):** Reißt den Kopf hoch, Maul weit offen, zwischen den Fängen glimmt orangenes Licht.
**Schlag:** Schwerer Sprungbiss mit beiden Vorderläufen; zwei orangene Kieferbögen und ein Aschestoß.
**Treffer & Tod:** Asche stäubt bei jedem Treffer; beim Tod zerfällt das Fell an den Rändern zu grauer Asche, bevor er umkippt.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of an ash warg: larger than a wolf, heavy hyena-like skull, thick neck, deep chest, high withers, near-black fur #2e2a2a with ashen tips, soot-black mane #141010 shedding ash, glowing orange eyes #ff6a2a, scar across the muzzle, long fangs. Side, front, top-down three-quarter views; wind-up (head jerked up, jaws wide, ember glow inside) and leaping bite with two orange jaw arcs and an ash puff. Thick outlines, cel shading.
```

### Dämon (Stufe 35) – daemon
**Design:** Ein schlanker, sehniger Dämon in Menschengröße (Größe 14, Skalierung 1,1): rote Haut `#a8343f`, dunkelroter Brustpanzer aus Chitin `#8e2f3a`, schwarze Hose `#1f1214`, Ziegenhufe `#2a1416`. Zwei nach hinten geschwungene schwarze Hörner `#2a1416`, spitze Ohren, kleine ledrige Flügel `#4a1a20` am Rücken, ein peitschender Schwanz mit Pfeilspitze und lange schwarze Krallen. Orange glühende Runen `#ffb04a` laufen über Brust und Unterarme.
**Skizze:** Seitenansicht mit vorgebeugter, lauernder Haltung, Frontansicht mit Hörnern und Runen, Draufsicht: Flügelpaar, Schwanz als S-Kurve, Hörner als zwei Haken. Thumbnails: grinsend die Krallen spreizend, Schwanz peitschend, Klaue zur Seite, Hieb.
**Ruhe:** Wippt auf den Hufen, der Schwanz peitscht, die Flügel zucken; er leckt sich über die Krallen, die Runen pulsieren.
**Bewegung:** Schneller, tänzelnder Gang auf den Hufen, Flügel halb geöffnet als Balance; beim Rennen gleitet er kurze Stücke mit gespreizten Flügeln.
**Ausholen (0,34 s):** Reißt die rechte Klaue weit zur Seite, der Oberkörper dreht ein, die Runen flammen auf.
**Schlag:** Querhieb durch das Ziel; drei orange glühende Krallenspuren.
**Treffer & Tod:** Faucht und krümmt sich; beim Tod zerfällt er von den Runen aus in glühende Asche und schwarzen Rauch.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a lean sinewy demon: red skin #a8343f, dark red chitin chest plate #8e2f3a, goat hooves, two swept-back black horns, pointed ears, small leathery wings #4a1a20, whipping arrow-tipped tail, long black claws, glowing orange runes #ffb04a on chest and forearms. Side, front, top-down three-quarter views; wind-up (claw pulled far to the side, torso twisted) and cross swipe with three glowing claw marks. Thick outlines, cel shading.
```

### Höllenhund (Stufe 37) – hoellenhund
**Design:** Ein höllischer Jagdhund (Größe 16), schlank und schnell wie ein Windhund, aber mit kantigem Schädel und übergroßem Maul. Fell `#2e2222`, Bauch `#4a3030`, eine lodernde Mähne `#d8402a` aus Flammenzungen statt Haaren, die über Nacken und Rücken bis zur Rute läuft, dazu glühende Glutdornen auf dem Rückgrat. Augen hellorange `#ffb04a`, Maul innen glutrot, lange Fänge. Von oben: dunkler Strich mit einer roten Flammenlinie – sehr gut lesbar.
**Skizze:** Seitenansicht mit gestrecktem Windhundkörper und Flammenmähne, Frontansicht mit glühendem Maul, Draufsicht mit roter Flammenspur auf dem Rücken. Thumbnails: hechelnd mit Funken, heulend, geduckt, Biss.
**Ruhe:** Hechelt, aus dem Maul fallen Funken; die Flammenmähne flackert, er scharrt mit den Krallen glühende Spuren in den Boden.
**Bewegung:** Gestreckter Doppelsprung-Galopp wie ein Windhund, der Rücken biegt sich stark, die Flammenmähne zieht einen Funkenschweif.
**Ausholen (0,34 s):** Zurückweichen, Kopf hoch, Maul weit auf – im Rachen lodert Glut, die Mähne schlägt höher.
**Schlag:** Blitzschneller Sprungbiss; zwei feurige Kieferbögen und ein Funkenregen.
**Treffer & Tod:** Die Flammen flackern bei jedem Treffer; beim Tod erlöschen sie zu Rauch und der Körper sinkt als verkohlte Hülle zusammen.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a hellhound: lean greyhound-like body with an angular skull and oversized jaws, dark fur #2e2222, a blazing mane of flame tongues #d8402a running from neck to tail, glowing ember spikes along the spine, bright orange eyes #ffb04a, glowing red mouth. Side, front, top-down three-quarter views; wind-up (backing off, jaws wide with fire inside) and leaping bite with two fiery jaw arcs and sparks. Thick outlines, cel shading.
```

## Schlangental (Map 2: Sandschlangenwüste + Nagadschungel)

Die Map hat zwei Gesichter: die helle **Sandschlangenwüste** mit Dünen und Ruinen (Sand-, Ocker- und Brauntöne, die Monster tarnen sich fast im Boden, darum brauchen sie dunkle Zeichnungen und helle Augen) und den feuchten **Nagadschungel** mit Tempelruinen, Lianen und türkisem Wasser (satte Grün-, Türkis- und Violetttöne, Gold als Rüstungsakzent). Schlangen bewegen sich mit echten Schlangen-Fortbewegungsarten, nicht einfach als gleitender Schlauch.

### Sandviper (Stufe 31) – sandviper
**Design:** Eine kurze, kräftige Viper (Größe 13) nach dem Vorbild der Hornviper: breiter dreieckiger Kopf, deutlich abgesetzter Hals, zwei kleine Hornschuppen über den Augen, kurzer, spitz zulaufender Schwanz. Schuppen sandgelb `#c8a060` mit einer Reihe dunkler Querflecken `#8a6a3a`, Bauch `#f0dca8`, gelbe Augen `#ffd34d` mit senkrechten Schlitzpupillen. Von oben: ein gekrümmtes S mit dunklem Fleckenmuster und gelben Augenpunkten.
**Skizze:** Seitenansicht flach mit erhobenem Kopf, Frontansicht mit Hornschuppen, Draufsicht als S-Kurve, dazu die Spur des Seitenwindens im Sand. Thumbnails: halb eingegraben, züngelnd, S-Hals, Vorstoß.
**Ruhe:** Liegt halb im Sand eingegraben, nur Kopf und Rückenflecken schauen heraus; die Zunge züngelt.
**Bewegung:** Echtes Seitenwinden: der Körper hebt sich in Schlaufen und setzt schräg versetzt auf, die Viper bewegt sich diagonal und hinterlässt parallele J-Spuren.
**Ausholen (0,34 s):** Der Hals steigt zum S und zieht zurück, das Maul öffnet sich, die Giftzähne klappen vor.
**Schlag:** Blitzschneller Vorstoß, der halbe Körper schnellt nach vorn; ein Kieferbogen.
**Treffer & Tod:** Windet sich und schlägt mit dem Schwanz; beim Tod streckt sie sich, dreht sich auf den hellen Bauch und versinkt halb im Sand.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a horned sand viper: short stout snake, broad triangular head, two small horn scales above the eyes, sandy scales #c8a060 with dark crossbands #8a6a3a, pale belly #f0dca8, yellow slit-pupil eyes #ffd34d. Side, front, top-down three-quarter views showing sidewinding tracks in sand; wind-up (neck rising into an S and pulling back, fangs out) and lightning-fast strike with a glowing jaw arc. Thick outlines, cel shading.
```

### Wüstenschakal (Stufe 32) – schakal
**Design:** Ein echter Schabrackenschakal (Größe 13): zierlich, hochbeinig, schmale spitze Schnauze, sehr große Ohren, buschige Rute mit dunkler Spitze. Fell sandgelb `#c8a060`, auf dem Rücken eine dunkle Schabracke `#3a3028` mit silbernen Sprenkeln, die von oben als schwarzer Sattel lesbar ist, Bauch und Kehle `#f0e0c0`, goldgelbe Augen `#e8b040`. Mager, aber drahtig – klar kleiner und leichter als jeder Wolf.
**Skizze:** Seitenansicht mit scharfer Grenze zwischen Schabracke und Flanke, Frontansicht mit riesigen Ohren, Draufsicht als schmaler Strich mit dunklem Sattel. Thumbnails: aufheulend, Ohren aufgestellt lauschend, im Rudel kreisend, Schnappbiss.
**Ruhe:** Steht hellwach, Ohren drehen, er hebt eine Vorderpfote; gelegentlich ein hohes Jaulen mit gestrecktem Hals.
**Bewegung:** Leichter, schneller Trab mit kaum bewegtem Rücken, die großen Ohren bleiben aufrecht; im Rennen ein flacher, sehr schneller Galopp.
**Ausholen (0,34 s):** Kurzes Zurückzucken, Kopf hoch, schmales Maul klappt weit auf, Ohren flach.
**Schlag:** Flinker Schnappbiss nach vorn, danach springt er sofort wieder etwas zurück; zwei kleine Kieferbögen.
**Treffer & Tod:** Jault, macht einen Satz zur Seite; beim Tod fällt er leicht wie ein Bündel, die Rute legt sich über die Pfoten.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a real black-backed jackal: slender, long-legged, narrow pointed muzzle, very large ears, sandy fur #c8a060, dark silver-flecked saddle #3a3028 on the back, cream belly #f0e0c0, golden eyes #e8b040, bushy tail with dark tip. Side, front, top-down three-quarter views; wind-up (flinching back, jaws wide, ears flat) and quick snapping bite with two jaw arcs. Thick outlines, chunky cel shading.
```

### Klapperschlange (Stufe 34) – klapperschlange
**Design:** Eine schwere Diamant-Klapperschlange (Größe 14, Skalierung 1,1): dicker Körper, breiter dreieckiger Kopf mit Grubenorganen zwischen Auge und Nase, deutlich schmaler Hals. Schuppen `#a07a4a` mit dunklen Rautenmustern `#4a3018` und hellen Rautenrändern, Bauch `#e8d0a0`, orange Augen `#ffb04a`. Am Schwanzende eine segmentierte Hornrassel, die beim Ausholen sichtbar vibriert – das wichtigste Erkennungszeichen.
**Skizze:** Seitenansicht zusammengerollt mit erhobenem Kopf und Rassel, Frontansicht mit Grubenorganen, Draufsicht als Spirale mit Rautenmuster. Thumbnails: aufgerollt, rasselnd, S-Hals, Biss.
**Ruhe:** Liegt in einer lockeren Spirale, der Kopf ruht oben, die Rassel hebt sich und zittert kurz.
**Bewegung:** Schlängelnde Seitenwellen mit deutlichem Hin-und-her des Körpers; die Rassel wird stets etwas angehoben getragen.
**Ausholen (0,4 s):** Rollt sich auf, der Hals steigt zum S und zieht zurück, die Rassel vibriert sichtbar mit kleinen Bewegungslinien.
**Schlag:** Schneller Vorstoß mit aufgerissenem Maul und ausgeklappten Giftzähnen; ein Kieferbogen.
**Treffer & Tod:** Rasselt wild, zieht den Kopf ein; beim Tod entrollt sie sich schlaff, die Rassel zittert ein letztes Mal.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a heavy diamondback rattlesnake: thick body, broad triangular head with heat pits, narrow neck, brown scales #a07a4a with dark diamond pattern #4a3018 and pale edges, cream belly #e8d0a0, orange eyes, segmented horn rattle on the tail. Side, front, top-down three-quarter views; wind-up (coiling, neck rising into an S, rattle vibrating with motion lines) and fast strike with fangs and glowing jaw arc. Thick outlines, cel shading.
```

### Königskobra (Stufe 37) – kobra
**Design:** Eine lange, elegante Königskobra (Größe 15, Skalierung 1,2), die das vordere Drittel ihres Körpers aufrecht trägt. Schuppen dunkel olivgrün `#3a4a2a` mit schwarzen Querbändern `#1e2814`, Bauch und Haube in hellem Gold `#c8b060`, rot glühende Augen `#ff3a2a`. Die Haube ist schmal, wenn sie ruht, und spreizt sich beim Ausholen zu einem breiten goldenen Schild mit dunkler Zeichnung – von oben die markanteste Form.
**Skizze:** Seitenansicht aufgerichtet mit geschlossener und mit gespreizter Haube, Frontansicht mit voller Haube, Draufsicht mit Haube als goldener Fächer. Thumbnails: aufgerichtet pendelnd, Haube gespreizt, speiend, flach gleitend.
**Ruhe:** Steht aufgerichtet und pendelt langsam hin und her, die Zunge züngelt, die Haube zuckt halb auf.
**Bewegung:** Gleitet mit hoch erhobenem Kopf in ruhigen Seitenwellen, der aufrechte Vorderkörper bleibt fast still – wie eine Lanze, die über den Sand schwebt.
**Ausholen (0,4 s):** Richtet sich noch höher auf, die Haube spreizt sich voll, der Kopf zieht zurück, das Maul öffnet sich.
**Schlag:** Speit einen Strahl giftgelb-grüner Tropfen, der als Geschoss zum Ziel fliegt; die Haube bleibt kurz gespreizt.
**Treffer & Tod:** Zischt und sackt etwas ab; beim Tod fällt der aufrechte Körper nach hinten um, die Haube klappt zu.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a king cobra: long elegant snake holding its front third upright, dark olive scales #3a4a2a with black bands #1e2814, golden belly and hood #c8b060, glowing red eyes #ff3a2a. Side, front, top-down three-quarter views with hood closed and fully flared; wind-up (rearing higher, hood spreading, head pulling back) and spit pose firing a glob of yellow-green venom. Thick outlines, cel shading, readable at small size.
```

### Riesenpython (Stufe 42) – riesenpython
**Design:** Eine gewaltige Würgeschlange (Größe 20, Skalierung 1,65), dick wie ein Baumstamm, mit stumpfem, eher schmalem Kopf, der kaum breiter als der Hals ist. Schuppen moosgrün `#4a6a3a` mit großen, dunklen, unregelmäßigen Sattelflecken `#22341a`, Bauch blass `#c8c890`, gelbe Augen `#ffd34d` mit Schlitzpupillen, Wärmegruben an der Oberlippe. Von oben: eine lange, mehrfach gebogene, dicke Linie mit Fleckenmuster.
**Skizze:** Seitenansicht mit dem schweren, dicken Körper, Frontansicht mit Lippengruben, Draufsicht als große Schlaufe. Thumbnails: um einen Baumstamm gewickelt, mit dickem Bauch nach der Mahlzeit, S-Hals, Biss.
**Ruhe:** Liegt in schweren Schlaufen, die Muskeln wandern sichtbar unter der Haut, nur die Zunge bewegt sich.
**Bewegung:** Echte Raupen-Fortbewegung: der Körper bleibt fast gerade, die Bauchschuppen schieben in Wellen von hinten nach vorn, die Python kriecht langsam, schwer und geradlinig.
**Ausholen (0,4 s):** Der vordere Körper hebt sich zum S und zieht zurück, der restliche Leib spannt sich in Schlaufen.
**Schlag:** Wuchtiger Vorstoß mit weit geöffnetem Maul voller nach hinten gebogener Zähne; ein großer Kieferbogen.
**Treffer & Tod:** Zuckt in Wellen, schlingt sich enger; beim Tod streckt sie sich langsam, die Schlaufen fallen auseinander.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a giant python: thick as a tree trunk, blunt narrow head barely wider than the neck, moss-green scales #4a6a3a with large dark irregular saddle blotches #22341a, pale belly #c8c890, yellow slit eyes, heat pits on the lip. Side, front, top-down three-quarter views showing straight caterpillar-like crawling; wind-up (front body rising into an S, coils tensing) and heavy lunging bite with a big jaw arc. Thick outlines, cel shading.
```

### Schattenpanther (Stufe 45) – panther
**Design:** Ein schwarzer Leopard (Größe 15): langer, geschmeidiger Körper, kräftige Schultern, kurze Beine, großer runder Kopf mit kleinen runden Ohren und ein sehr langer Schwanz. Fell fast schwarz `#1e1e26`, Bauch `#2a2a34`; im Streiflicht sieht man dunklere Rosetten. An Rändern der Silhouette lösen sich dünne Schattenschwaden. Goldgelbe, glühende Augen `#ffd34d` – oft das Einzige, was man im Dschungel von ihm sieht, deshalb muss die Outline ihn vom Boden trennen.
**Skizze:** Seitenansicht mit langem, tief hängendem Schwanz, Frontansicht mit glühenden Augen, Draufsicht als lange, schmale Form mit Schwanzbogen. Thumbnails: auf einem Ast liegend, schleichend, geduckt, Sprung.
**Ruhe:** Liegt flach oder sitzt, nur die Schwanzspitze schlägt; die Schattenschwaden ziehen langsam vom Rücken.
**Bewegung:** Schleichender Kreuzgang, Schulterblätter rollen sichtbar, der Kopf bleibt ruhig auf einer Linie; im Rennen ein gestreckter Sprunggalopp.
**Ausholen (0,34 s):** Duckt sich ganz tief, das Hinterteil wackelt, die Schwanzspitze zuckt, die Augen glühen auf.
**Schlag:** Weiter, flacher Sprung mit ausgestreckten Pranken; drei goldene Krallenspuren und ein Schattenschweif.
**Treffer & Tod:** Faucht mit angelegten Ohren; beim Tod löst er sich von den Rändern her in Schattenrauch auf.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a shadow panther, a black leopard: long sleek body, powerful shoulders, short legs, round head with small round ears, very long tail, near-black fur #1e1e26 with faint darker rosettes, thin shadow wisps peeling off the silhouette, glowing golden eyes #ffd34d. Side, front, top-down three-quarter views; wind-up (crouching low, tail twitching) and pounce with outstretched paws and three golden claw marks. Thick outlines, cel shading.
```

### Naga-Krieger (Stufe 46) – naga
**Design:** Oberkörper eines schlanken, muskulösen Kriegers mit Haut `#5aa890`, unten ein langer Schlangenleib `#2a7a6a` mit dunklen Bändern `#154a40` und hellem Bauch `#a8e0c8`; aufgerichtet ist er etwa so hoch wie der Held (Größe 16). Goldener Brustpanzer und Armschienen `#c9a35a` mit bronzenen Kanten `#7a5a2a`, dunkles, zurückgebundenes Haar `#1a3a4a`, gelbe Schlangenaugen `#ffd34d`, ein Rückenkamm aus Flossenhaut. Waffe: ein langer Speer mit Schlangenkopf-Spitze. Kommt auch im Dungeon Schlangentempel vor.
**Skizze:** Seitenansicht mit S-förmigem Schwanz, Frontansicht mit Panzer und Speer, Draufsicht: Schwanzschleife hinten, Speer als lange Linie nach vorn. Thumbnails: Wache stehend, Speer kreisend, zurückgerollt, Ausfall.
**Ruhe:** Steht aufgerichtet, der Schwanz schlängelt am Boden, er dreht den Speer in der Hand; die Zunge zuckt kurz.
**Bewegung:** Gleitet in Seitenwellen, der Oberkörper bleibt aufrecht und ruhig, der Speer zeigt nach vorn.
**Ausholen (0,4 s):** Der Leib rollt sich zurück wie eine gespannte Feder, der Speer wird weit zurückgezogen.
**Schlag:** Schnellt nach vorn und stößt den Speer; ein gerader Stichblitz.
**Treffer & Tod:** Der Schwanz peitscht; beim Tod sinkt der Oberkörper nach vorn, der Leib erschlafft in einer Schlaufe.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a naga warrior: muscular humanoid torso with teal skin #5aa890, long serpent tail #2a7a6a with dark bands and pale belly, golden breastplate and bracers #c9a35a, dark tied-back hair, yellow snake eyes, fin crest on the back, long spear with a serpent-head tip. Side, front, top-down three-quarter views; wind-up (body coiling back like a spring, spear drawn far back) and lunging spear thrust with a straight glowing streak. Thick outlines, cel shading.
```

### Naga-Priesterin (Stufe 49) – nagapriesterin
**Design:** Eine schlanke, hochgewachsene Naga (Größe 15) mit fliederfarbener Haut `#b890c8`, violettem Schlangenleib `#6a3a8a` mit dunklen Bändern `#3a1a5a` und hellem Bauch `#d8b8f0`. Langes, fast weißes Haar `#e8e0f0`, dunkles Gewand `#3a2a5a` mit goldenen Säumen `#e8c84a`, Schmuckreife an den Armen, ein Kopfputz wie eine kleine Kobrahaube. Sie trägt einen Stab mit einer violett leuchtenden Kugel `#c89aff`, die Augen leuchten im selben Ton. Auch im Schlangentempel.
**Skizze:** Seitenansicht mit erhobenem Stab, Frontansicht mit Haube und Haar, Draufsicht: helles Haar, violette Schwanzschlaufe, leuchtende Stabkugel. Thumbnails: meditierend aufgerollt, segnend, Arme hoch, Geschoss.
**Ruhe:** Ruht in einer Schlaufe, wiegt den Oberkörper wie in Trance, die Stabkugel pulsiert, das Haar schwebt leicht.
**Bewegung:** Langsames, sehr fließendes Gleiten, der Oberkörper aufrecht, der Stab wird wie ein Pilgerstab getragen.
**Ausholen (0,4 s):** Hebt beide Arme mit dem Stab über den Kopf, um die Kugel kreisen violette Runenringe.
**Schlag:** Stößt den Stab nach vorn, eine violette Energiekugel mit Schlangenschweif fliegt zum Ziel.
**Treffer & Tod:** Zuckt zurück, das Licht flackert; beim Tod sinkt sie in sich zusammen, die Kugel erlischt und zerspringt.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a naga priestess: slender lilac-skinned torso #b890c8, violet serpent tail #6a3a8a with dark bands, long near-white hair, dark robe #3a2a5a with gold trim #e8c84a, cobra-hood headdress, staff with a glowing violet orb #c89aff, violet glowing eyes. Side, front, top-down three-quarter views; wind-up (both arms raising the staff, rune rings orbiting) and cast pose firing a violet energy orb with a snake-shaped trail. Thick outlines, cel shading.
```

## Frostgipfel (Map 7)

Verschneite Gipfel, Eisfelder und Kiefernhaine. Fast alle Monster sind hell – Weiß, Eisblau, Grau. Damit sie sich vom Schnee abheben, brauchen sie kräftige Outlines, bläuliche Schattentöne und leuchtend blaue Augen; das Wollmammut ist der dunkle Gegenpol.

### Eiswolf (Stufe 41) – eiswolf
**Design:** Ein Polarwolf (Größe 15) mit dichtem, eisblau-weißem Fell `#c8d8e8`, fast weißem Bauch `#f4f8fc` und einem rein weißen, dicken Halskragen `#ffffff`. Kürzere, rundere Ohren und eine kürzere Schnauze als beim Grauwolf (Kälteanpassung), buschige Rute. Entlang des Rückgrats wachsen kleine Eiskristall-Zacken, die von oben eine glitzernde Linie bilden. Leuchtend blaue Augen `#3ab0ff`, lange Fänge, Raureif an den Schnurrhaaren.
**Skizze:** Seitenansicht mit Kristallkamm, Frontansicht mit breitem Kragen, Draufsicht mit blauen Augenpunkten und Kristalllinie (dunkle Schattenkante gegen den Schnee). Thumbnails: Atemwolke ausstoßend, heulend, durch Schnee pflügend, Biss.
**Ruhe:** Steht im Wind, das Fell flattert, aus dem Maul kommen kleine Frostatemwolken; die Kristalle glitzern.
**Bewegung:** Federnder Trab im Diagonalpaar, die Pfoten sinken leicht im Schnee ein und werfen Pulverschnee auf; im Rennen ein langer, flacher Galopp.
**Ausholen (0,34 s):** Zurückweichen, Kopf hoch, Kiefer weit auf, Frostnebel quillt aus dem Rachen, die Kristalle leuchten auf.
**Schlag:** Sprungbiss mit beiden Vorderläufen; zwei eisblaue Kieferbögen und kleine Eissplitter.
**Treffer & Tod:** Eissplitter springen ab; beim Tod brechen die Kristalle ab, er sinkt in den Schnee und wird von Raureif überzogen.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of an arctic ice wolf: dense icy blue-white fur #c8d8e8, near-white belly, thick pure white neck ruff, shorter rounded ears and muzzle, bushy tail, small ice crystal spikes along the spine, glowing blue eyes #3ab0ff, long fangs, frost on the whiskers, bluish shadows and strong dark outlines against snow. Side, front, top-down three-quarter views; wind-up (backing off, jaws wide, frost mist) and leaping bite with two ice-blue jaw arcs. Cel shading.
```

### Eisbär (Stufe 43) – eisbaer
**Design:** Ein echter Eisbär (Größe 20) – bewusst anders gebaut als der Braunbär: langer Hals, kleiner, langgestreckter Kopf mit gewölbter „Römernase“, winzige Ohren, kein Schulterbuckel, Hinterteil höher als die Schultern, riesige behaarte Tatzen. Fell weiß mit leichtem Gelbstich in den Schatten `#eef4f8`, Bauch `#dfe8ee`, Schnauze `#e4ecf0`, schwarze Nase und Lippen, kleine dunkle Augen `#1a2a3a`.
**Skizze:** Seitenansicht mit langem Hals und hohem Hinterteil, Frontansicht mit schmalem Kopf, Draufsicht als lange Tropfenform mit kleinem Kopf vorn. Thumbnails: schnüffelnd mit gestrecktem Hals, im Schnee wälzend, aufgerichtet, Prankenhieb.
**Ruhe:** Pendelt mit dem gestreckten Hals, schnüffelt in die Luft, schüttelt Schnee aus dem Fell.
**Bewegung:** Gemächlicher, schaukelnder Passgang, die großen Tatzen setzen flach auf, der Kopf schwingt tief vor dem Körper; im Rennen ein wogender Galopp.
**Ausholen (0,48 s):** Richtet sich hoch auf die Hinterbeine auf, beide Tatzen erhoben, schwarzer Rachen weit offen – überragt alles.
**Schlag:** Kracht nach vorn nieder mit Prankenhieb; drei Krallenspuren und eine Schneewolke.
**Treffer & Tod:** Brummt, weicht mit gesenktem Kopf; beim Tod legt er sich schwer in den Schnee, der Kopf zuletzt.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a real polar bear: long neck, small elongated head with Roman nose, tiny ears, no shoulder hump, hindquarters higher than shoulders, huge furry paws, white fur #eef4f8 with cool shadows, black nose and lips, small dark eyes. Side, front, top-down three-quarter views; wind-up (rearing high on hind legs, both paws raised, black mouth open) and crashing-down paw swipe with three claw marks and a snow puff. Thick outlines, cel shading.
```

### Yeti (Stufe 45) – yeti
**Design:** Ein riesiger, affenartiger Schneemensch (Größe 21, Skalierung 1,5): Hängebauch, sehr lange Arme, die fast bis zum Boden reichen, kurze krumme Beine, zotteliges weißes Fell `#e8eef4` am ganzen Körper, an den Beinen bläulich `#c8d4e0`. Hände, Füße und Gesicht sind dunkler, blau-grau `#9aa8b8` mit Krallen, schwere Brauenwülste über tiefliegenden Augen, Reißzähne im breiten Maul. Von oben: breiter weißer Klumpen mit langen Armen seitlich.
**Skizze:** Seitenansicht in Gorilla-Haltung, Frontansicht mit dunklem Gesicht, Draufsicht mit runden Schultern und langen Armen. Thumbnails: auf die Brust trommelnd, Schneeball formend, beide Fäuste hoch, Bodenschlag.
**Ruhe:** Hockt auf den Knöcheln, schnauft Atemwolken, kratzt sich am Kopf und trommelt ab und zu auf die Brust.
**Bewegung:** Knöchelgang wie ein Gorilla, die Arme schwingen weit voraus, das Fell wogt; beim Rennen hüpft er auf allen vieren.
**Ausholen (0,55 s):** Steht auf, reißt beide Fäuste über den Kopf, lehnt sich zurück und brüllt.
**Schlag:** Schmettert beide Fäuste in den Schnee; Schockwellenring, Eis- und Felssplitter, Bildschirmwackeln.
**Treffer & Tod:** Schüttelt sich brüllend; beim Tod kippt er nach vorn in den Schnee und bleibt mit ausgestreckten Armen liegen.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a huge ape-like yeti: pot belly, very long arms reaching nearly to the ground, short bowed legs, shaggy white fur #e8eef4 with bluish legs #c8d4e0, dark blue-grey face, hands and feet #9aa8b8 with claws, heavy brow ridge, fangs. Side, front, top-down three-quarter views; wind-up (both fists raised overhead, leaning back roaring) and two-fisted ground slam with shockwave ring and ice shards. Thick outlines, chunky cel shading.
```

### Wollmammut (Stufe 47) – mammut
**Design:** Eigenes 3D-Modell, der größte normale Gegner (Größe 26). Echte Mammut-Anatomie: hohe Stirnkuppel, hoher Schulterbuckel, nach hinten abfallender Rücken, kleine pelzige Ohren, kurzer Schwanz, Säulenbeine mit breiten Fußplatten, langer Rüssel. Zottelfell `#7a5a42`, das wie ein Rock an den Flanken hängt, darunter dunkleres Nackenfell `#5a4030`. Die Stoßzähne laufen weit nach vorn und biegen dann nach oben und innen. Kleine, eisblau schimmernde Augen `#9fe8ff`.
**Skizze:** Seitenansicht mit Buckel und Stoßzahnbogen, Frontansicht mit gekreuzten Zahnspitzen und Rüssel, Draufsicht: großer Ovalkörper, zwei weiße Bögen vorn. Thumbnails: mit dem Rüssel Schnee schaufelnd, trompetend, scharrend, Stoßzahnangriff.
**Ruhe:** Schwingt den Rüssel hin und her, schaufelt Schnee, die Ohren wedeln, das Fell weht.
**Bewegung:** Gemessener Passgang, jeder Tritt schwer, das Zottelfell schwingt verzögert nach, der Kopf nickt; im Rennen ein schwerer Trab, der Schneestaub aufwirft.
**Ausholen (0,48 s):** Kopf tief, der Rüssel rollt sich nach innen ein, ein Vorderfuß scharrt, der Körper duckt sich leicht.
**Schlag:** Stürmt vor und reißt den Kopf mit den Stoßzähnen hoch; großer Aufwärts-Hiebbogen und Schneestaubwolke.
**Treffer & Tod:** Trompetet, wirft den Kopf; beim Tod knickt es vorne ein und sinkt langsam auf die Seite.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a woolly mammoth: high domed head, tall shoulder hump, back sloping down, small furry ears, short tail, pillar legs with broad foot pads, long trunk, huge tusks curving forward then up and inward, shaggy brown fur #7a5a42 hanging like a skirt, darker neck fur #5a4030, small icy blue eyes. Side, front, top-down three-quarter views; wind-up (head low, trunk curled in, foot scraping) and tusk toss with upward slash arc and snow dust. Thick outlines, cel shading.
```

### Frostgeist (Stufe 48) – frostgeist
**Design:** Ein schwebender Geist (Größe 13) aus halbdurchsichtigem, eisblauem Nebel `#cfeeff`: Oberkörper mit dürren Armen, unten läuft er in einen zerfransten Schleier aus, der nie den Boden berührt. Auf dem Kopf eine Krone aus weißen Eiszapfen `#ffffff`, im Gesicht nur zwei blau leuchtende Augen `#3ab0ff` und ein dunkler Mundspalt. Um ihn kreisen kleine Schneeflocken. Kommt auch in der Eisgrotte vor.
**Skizze:** Seitenansicht schwebend mit wehendem Schleier, Frontansicht mit Eiskrone, Draufsicht: heller Kreis mit Zackenkrone und kurzem Schleierschweif. Thumbnails: treibend, die Arme um sich gelegt, Arme hoch, Eissplitter werfend.
**Ruhe:** Schwebt auf und ab, der Schleier weht, die Krone glitzert; Schneeflocken kreisen langsam.
**Bewegung:** Gleitet ohne Schritte, leicht nach vorn geneigt, der Schleier zieht hinterher und hinterlässt eine Frostspur auf dem Boden.
**Ausholen (0,4 s):** Hebt beide Arme, steigt etwas höher, zwischen den Händen wächst ein Eissplitter.
**Schlag:** Stößt beide Arme nach vorn, der Eissplitter fliegt mit Frostschweif zum Ziel.
**Treffer & Tod:** Flackert und wird kurz durchsichtiger; beim Tod zerstiebt er in Schneeflocken, die Eiskrone fällt und zerspringt.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a frost ghost: translucent icy blue mist body #cfeeff, thin arms, lower body fading into a ragged veil that never touches the ground, crown of white icicles, two glowing blue eyes #3ab0ff, snowflakes orbiting. Side, front, top-down three-quarter views; wind-up (both arms raised, floating higher, ice shard forming between the hands) and cast pose thrusting forward, the shard flying with a frost trail. Soft glow, thick outlines, cel shading.
```

## Totenmoor (Map 8)

Nebliger Sumpf mit Grabsteinen, Torf, toten Weiden und Irrlichtern. Die Monster sind fahl, grünlich und verrottet; ihr Leuchten (giftgrüne Augen, Hexenlicht) muss durch den Nebel stechen.

### Untoter Krieger (Stufe 51) – untoter
**Design:** Ein wiedererweckter Soldat in Menschengröße (Größe 13): blanker, vergilbter Totenschädel und knochige Hände `#cfc8b0`, darunter ein rostiges Kettenhemd `#5a5448`, ein verbeulter Schulterpanzer `#6e6a60`, vermoderte Riemen `#3a2a1c`, zerfetzte Hose `#3a3428` und Stiefel `#2a241c`. In den Augenhöhlen glimmen blasse grüne Punkte, der Unterkiefer hängt leicht schief. Waffe: ein schartiges, rostiges Langschwert. Von oben: heller Schädel, ein einzelner Schulterpanzer, Schwert als dünne Linie.
**Skizze:** Seitenansicht mit leicht schiefer, steifer Haltung, Frontansicht mit Schädel und Rippen durch Löcher im Kettenhemd, Draufsicht. Thumbnails: aus dem Moor steigend, den Kiefer zurechtrückend, ausholend, Hieb.
**Ruhe:** Steht steif, der Kopf kippt ruckartig zur Seite und zurück, Knochen klappern, Moorwasser tropft vom Saum.
**Bewegung:** Hölzerner, ungleichmäßiger Schritt, ein Bein zieht leicht nach, das Schwert schleift über den Boden.
**Ausholen (0,4 s):** Hebt das Schwert weit hinter den Kopf, der Oberkörper dreht ruckartig ein, der Unterkiefer klappt auf.
**Schlag:** Steifer, aber harter Diagonalhieb; fahlgrüner Hiebbogen.
**Treffer & Tod:** Knochensplitter springen, der Kopf kippt; beim Tod fällt er in einzelne Knochen auseinander, der Schädel rollt weg.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of an undead warrior: yellowed bare skull and bony hands #cfc8b0, faint green eye glints, crooked hanging jaw, rusty chainmail #5a5448 with holes showing ribs, dented single pauldron, rotting straps, tattered trousers, notched rusty longsword. Side, front, top-down three-quarter views; wind-up (sword raised far behind the head, jerky torso twist) and stiff diagonal strike with pale green slash arc. Thick outlines, cel shading.
```

### Moorwolf (Stufe 53) – moorwolf
**Design:** Ein ausgemergelter Sumpfwolf (Größe 15) mit nassem, verfilztem Fell `#4a5a4a`, das in Strähnen hängt, darauf Algen und Wasserlinsen, Bauch `#6a7a5a`, dunkle, triefende Mähne `#2a3a2a`. Die Augen glühen giftgrün `#9be07a` wie Irrlichter, aus dem Maul tropft grünlicher Schleim, die Rippen zeichnen sich ab. Von oben: dunkelgrüner, strähniger Umriss mit zwei grünen Lichtpunkten.
**Skizze:** Seitenansicht mit triefenden Fellsträhnen, Frontansicht mit grünen Augen und Schleim, Draufsicht. Thumbnails: sich schüttelnd mit Spritzern, im Nebel auftauchend, knurrend, Biss.
**Ruhe:** Steht mit hängendem Kopf, Wasser tropft aus dem Fell, die Augen glimmen; er schüttelt sich und versprüht Schlammtropfen.
**Bewegung:** Schleppender, lautloser Trab mit tiefem Kopf, bei jedem Schritt spritzt etwas Moorwasser; im Rennen ein flacher, schneller Galopp mit Spritzspur.
**Ausholen (0,34 s):** Zurückweichen, Kopf hoch, das schleimige Maul klappt weit auf, die Augen flammen grün auf.
**Schlag:** Vorschnellender Biss; zwei giftgrüne Kieferbögen und Schlammspritzer.
**Treffer & Tod:** Jault dumpf; beim Tod sinkt er zusammen und versinkt halb im Moor, die Augen erlöschen als letztes.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a gaunt swamp wolf: wet matted fur #4a5a4a hanging in strands with algae and duckweed, belly #6a7a5a, dripping dark mane #2a3a2a, visible ribs, toxic green glowing will-o-wisp eyes #9be07a, greenish slime dripping from the jaws. Side, front, top-down three-quarter views; wind-up (backing off, slimy jaws wide, eyes flaring) and lunging bite with two green jaw arcs and mud splashes. Thick outlines, cel shading.
```

### Sumpfhexe (Stufe 54) – sumpfhexe
**Design:** Eine krumme, alte Hexe (Größe 12) mit grünlicher Haut `#8aa070`, langer Hakennase, langem, verfilztem Haar `#5a6a4a` voller Zweige und einem breitkrempigen, eingedellten Spitzhut `#2a3a24`. Zerlumpte Robe `#3a4a2e` mit weiten, ausgefransten Ärmeln, Ketten aus Knochen, Kräuterbündeln und Fläschchen. Sie stützt sich auf einen knorrigen Stab mit einem Vogelschädel, aus dem giftgrünes Licht tropft. Von oben ist der breite Hut die dominierende Form.
**Skizze:** Seitenansicht gebückt mit Buckel und Hakennase, Frontansicht mit Hutkrempe und Haar, Draufsicht: großer Hutkreis mit Spitze, Stab daneben. Thumbnails: kichernd, in einem Fläschchen rührend, Arme hoch, Fluch schleudernd.
**Ruhe:** Kichert mit zuckenden Schultern, schüttelt ein Fläschchen, aus dem Blasen steigen; der Hut wippt.
**Bewegung:** Schlurfender, gebückter Gang, der Stab setzt auf, die Robe schleift; beim Rennen hebt sie den Saum und trippelt überraschend schnell.
**Ausholen (0,4 s):** Reißt beide Arme mit dem Stab hoch, grüner Nebel wirbelt um den Vogelschädel, der Hut fliegt fast weg.
**Schlag:** Stößt nach vorn, eine blubbernde grüne Fluchkugel mit Totenkopfrauch fliegt zum Ziel.
**Treffer & Tod:** Kreischt und hält den Hut fest; beim Tod zerfließt sie zu einer grünen Pfütze, nur Hut und Stab bleiben liegen.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a hunched old swamp witch: greenish skin #8aa070, long hooked nose, long matted hair #5a6a4a with twigs, wide dented pointed hat #2a3a24, ragged robe #3a4a2e with frayed wide sleeves, bone necklaces, herb bundles and vials, gnarled staff topped with a bird skull dripping green light. Side, front, top-down three-quarter views; wind-up (both arms raising the staff, green mist swirling) and cast pose hurling a bubbling green curse orb. Thick outlines, cel shading.
```

### Ghul (Stufe 57) – ghul
**Design:** Ein großer, aasfressender Untoter (Größe 19, Skalierung 1,35), stark nach vorn gebeugt, mit aufgeblähtem Bauch, dürren Gliedern und überlangen Armen mit langen, schmutzigen Krallen. Fahl graugrüne, fleckige Haut `#6a7a5a`, die über den Rippen spannt, große spitze Ohren, schwere Brauenwülste, ein breites Maul mit nadelspitzen Zähnen, zerrissene Hose `#3a3428`. Von oben: krummer Rücken mit vorstehender Wirbelsäule, sehr lange Arme.
**Skizze:** Seitenansicht stark gebückt, Frontansicht mit Ohren und Zahnreihe, Draufsicht mit Wirbelreihe und ausgreifenden Armen. Thumbnails: an einem Knochen nagend, schnüffelnd auf allen vieren, Klaue zur Seite, Hieb.
**Ruhe:** Hockt und nagt an einem Knochen, der Kopf ruckt witternd hoch, die Ohren zucken.
**Bewegung:** Hastiges Halb-Galoppieren auf Füßen und Knöcheln, der Kopf vorgestreckt, die langen Arme stützen sich ab wie Vorderbeine.
**Ausholen (0,4 s):** Richtet sich auf, reißt die rechte Klaue weit zur Seite, der Oberkörper dreht ein, das Maul klafft.
**Schlag:** Weiter Querhieb; drei schmutzig-grüne Krallenspuren.
**Treffer & Tod:** Kreischt und krümmt sich; beim Tod fällt er vornüber, die Arme zucken noch tastend.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a ghoul: large hunched corpse-eater, bloated belly, thin limbs, overlong arms with long dirty claws, pale grey-green blotchy skin #6a7a5a stretched over ribs, big pointed ears, heavy brow, wide mouth of needle teeth, protruding spine, torn trousers. Side, front, top-down three-quarter views; wind-up (rising up, claw pulled far to the side, torso twisted) and wide cross swipe with three claw marks. Thick outlines, cel shading.
```

## Donnerklamm (Map 3: Donnerklamm + Titanenkamm)

Eine Gewitterschlucht mit Felsnadeln, Hängebrücken und einer Festung, darüber der **Titanenkamm** mit uralten Steinruinen und Schmiedefeuern. Die Monster sind schwer, felsig und gewittergeladen: Grau, Schieferblau, Steinbraun, Akzente in Blitzblau `#9fd0ff`/`#bfe8ff` und Schmiedeorange `#ffb04a`.

### Trollkrieger (Stufe 52) – trollkrieger
**Design:** Ein großer, schlaksiger Troll (Größe 19, Skalierung 1,45) mit dickem Bauch, langen Armen und großen Krallenhänden `#4a7a5a`. Haut moosgrün `#5a8a6a` mit warzigen Flecken und Flechten auf den Schultern, lange spitze Ohren, eine lange Knollennase, schwere Brauen und zwei aufwärts gebogene Hauer. Lederschurz `#4a3a2a`, Fußwickel `#2a2018`, Knochenschmuck in den Ohren. Er kämpft mit bloßen Fäusten.
**Skizze:** Seitenansicht mit Hängebauch und Knollennase, Frontansicht mit Ohren und Hauern, Draufsicht: breite Schultern, lange Ohren als Zacken, große Hände. Thumbnails: sich am Ohr kratzend, Felsbrocken hebend, beide Fäuste hoch, Bodenschlag.
**Ruhe:** Steht krumm, schnüffelt mit der großen Nase, kratzt sich an den Warzen, die Ohren wackeln.
**Bewegung:** Schlaksiger, schlenkernder Gang, die langen Arme pendeln locker, der Bauch wippt; beim Rennen stapft er mit vorgestrecktem Kopf.
**Ausholen (0,55 s):** Verschränkt beide Fäuste über dem Kopf, lehnt sich weit zurück, das Maul klafft auf.
**Schlag:** Schmettert die Fäuste mit dem ganzen Körper in den Boden; Schockwellenring, Felssplitter, Bildschirmwackeln.
**Treffer & Tod:** Brüllt wütend, die Wunden ziehen sich sichtbar etwas zusammen; beim Tod kippt er nach hinten und versteinert langsam von den Füßen her.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a lanky troll warrior: big belly, long arms, large clawed hands, moss-green warty skin #5a8a6a with lichen on the shoulders, long pointed ears with bone rings, long bulbous nose, heavy brow, upward tusks, leather loincloth. Side, front, top-down three-quarter views; wind-up (both fists clasped overhead, leaning back, mouth gaping) and full-body ground slam with shockwave ring and rock shards. Thick outlines, cel shading.
```

### Harpyie (Stufe 55) – harpyie
**Design:** Eine Frau-Vogel-Mischung (Größe 14): menschlicher Oberkörper mit heller Haut `#d8b8a8`, langes violettes Haar `#5a3a6a`, statt Armen große Schwingen in Flieder `#8a6a9a` mit Schwungfedern in drei Tönen (`#8a6a9a`, `#c8a8d8`, `#6a4a7a`), dazu ein Federwams `#6a4a7a`. Ab den Knien Vogelbeine mit dunklen Greifkrallen `#3a2a3a`. Gelbe Raubvogelaugen, ein wildes, kreischendes Gesicht. Von oben dominieren die weit gespannten Flügel.
**Skizze:** Seitenansicht im Schwebeflug, Frontansicht mit gespreizten Flügeln, Draufsicht als breites V. Thumbnails: auf einem Felsen hockend, kreischend, Flügel hoch, Federsalve.
**Ruhe:** Schwebt mit langsamen Flügelschlägen etwas über dem Boden, die Krallen öffnen und schließen sich, Federn rieseln.
**Bewegung:** Fliegt in schnellen, flachen Bögen, der Körper wippt mit jedem Flügelschlag; Landungen mit vorgestreckten Krallen.
**Ausholen (0,34 s):** Reißt beide Flügel hoch über den Kopf, steigt etwas, die Schwungfedern spreizen sich und leuchten an den Spitzen.
**Schlag:** Schlägt die Flügel nach vorn und schleudert einen Fächer aus scharfen, violett leuchtenden Federn mit Windschleier zum Ziel.
**Treffer & Tod:** Kreischt, Federn wirbeln; beim Tod trudelt sie in einer Federwolke zu Boden.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a harpy: human upper body with pale skin #d8b8a8, long violet hair, large lilac wings #8a6a9a instead of arms with three-tone flight feathers, feather vest #6a4a7a, bird legs with dark talons, fierce yellow raptor eyes, shrieking face. Side, front, top-down three-quarter views; wind-up (wings raised high overhead, rising, feather tips glowing) and cast pose flinging a fan of glowing violet feather blades. Thick outlines, cel shading.
```

### Donnerbock (Stufe 57) – donnerbock
**Design:** Eigenes 3D-Modell: ein echter Alpensteinbock (Größe 17), gedrungener und kurzbeiniger als der Rothirsch, mit kräftiger Brust, kurzem Hals und dunkler Halsmähne `#5a5a66`. Fell grau `#8a8a92`, Bauch `#c8c8d0`, ein dunkler Kinnbart `#4a4a52`, gespaltene Hufe mit harten Rändern zum Klettern. Die mächtigen, nach hinten gebogenen Hörner `#6a6458` tragen deutliche Querwülste. Die Augen leuchten blitzblau `#9fd0ff`, und zwischen den Hörnern knistern kleine Funken in derselben Farbe.
**Skizze:** Seitenansicht mit gewaltigem Hornbogen, Frontansicht mit Bart und Hornansatz, Draufsicht: zwei Hornsicheln, die nach hinten über den Rücken zeigen. Thumbnails: auf einem Felsvorsprung stehend, meckernd, Kopf gesenkt, Hornstoß.
**Ruhe:** Steht wie aufgepflanzt, kaut wieder, schüttelt den Kopf; ab und zu knistert ein Funke zwischen den Hörnern.
**Bewegung:** Trittsicherer, kurzer Schritt; im Rennen federnde Sprünge mit allen vier Hufen gleichzeitig, beim Aufsetzen sprühen Funken.
**Ausholen (0,48 s):** Senkt den Kopf ganz tief, die Hörner zeigen nach vorn, die Funken verdichten sich zu einem Blitzbogen zwischen den Hörnern.
**Schlag:** Stößt vor und schleudert den Kopf hoch; Hiebbogen, Staub und ein kurzer blauer Blitzschlag.
**Treffer & Tod:** Meckert, Funken sprühen; beim Tod knickt er vorne ein, die Funken erlöschen, er kippt auf die Seite.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a real Alpine ibex with thunder magic: stocky, shorter legs than a deer, strong chest, dark neck mane, grey fur #8a8a92, pale belly, dark chin beard, cloven hooves, massive backward-curving ridged horns #6a6458, glowing blue eyes #9fd0ff, small sparks between the horns. Side, front, top-down three-quarter views; wind-up (head lowered deep, horns forward, lightning arc between them) and thrust with upward head flick, slash arc, dust and blue spark. Thick outlines, cel shading.
```

### Minotaurus (Stufe 58) – minotaurus
**Design:** Ein riesiger Stiermensch (Größe 21, Skalierung 1,6): Stierkopf mit breiter Schnauze `#9a6a4a`, eisernem Nasenring und gewaltigen, weit ausladenden hellen Hörnern `#e8dcc0`, ein mächtiger Nackenbuckel, breite Brust mit Fellansatz, Bauch, kräftige Arme mit Lederwickeln `#5a3418`. Fell und Haut rotbraun `#7a4a2a`, Lendenschurz `#3a2a1a`, die Beine enden in schwarzen Hufen `#1e1610`. Er kämpft ohne Waffe – die Hörner sind die Waffe und von oben die markanteste Form.
**Skizze:** Seitenansicht mit vorgeschobenem Nacken, Frontansicht mit Hornspannweite und Nasenring, Draufsicht: breiter Hornbalken vor massigen Schultern. Thumbnails: schnaubend mit Dampfwölkchen, mit dem Huf scharrend, Kopf gesenkt, Rammstoß.
**Ruhe:** Schnaubt Dampf aus den Nüstern, der Nasenring klirrt, er scharrt mit einem Huf und schüttelt den Kopf.
**Bewegung:** Schwerer, stampfender Gang auf Hufen, die Schultern rollen; im Rennen fällt er in einen vornübergebeugten Sturmlauf.
**Ausholen (0,55 s):** Senkt den Kopf tief, die Hörner zeigen nach vorn, beide Arme gehen seitlich zurück, ein Huf scharrt.
**Schlag:** Rammt mit voller Wucht nach vorn; Hiebbogen in Hornhöhe, Staubfontäne.
**Treffer & Tod:** Brüllt wie ein Stier; beim Tod fällt er auf die Knie, die Hörner bohren sich in den Boden, dann kippt er zur Seite.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a minotaur: huge bull-headed brute, broad muzzle #9a6a4a with iron nose ring, enormous wide pale horns #e8dcc0, massive neck hump, reddish-brown hide #7a4a2a, leather arm wraps, loincloth, black hooves, unarmed. Side, front, top-down three-quarter views; wind-up (head lowered, horns forward, arms drawn back, hoof scraping) and ramming charge with a horn-height slash arc and dust burst. Thick outlines, chunky cel shading.
```

### Steintitan (Stufe 64) – steintitan
**Design:** Ein lebender Felskoloss (Größe 24, Skalierung 1,85) aus aufeinandergetürmten, kantigen Steinblöcken `#8a8478`, die von orange glühenden Rissen `#ffb04a` durchzogen sind wie von Schmiedeglut. Kein Hals: der kleine, blockige Golemkopf sitzt tief zwischen riesigen Schultern, die Augen sind zwei glühende Schlitze. Beine aus dunklerem Stein `#5a544a`, Füße `#3a3630`, Hände `#6a6458` wie Hämmer. Kommt am Titanenkamm und in der Titanenschmiede vor.
**Skizze:** Seitenansicht mit Buckelschultern, Frontansicht mit Rissmuster, Draufsicht: breites Rechteck aus Schulterblöcken mit leuchtenden Fugen. Thumbnails: als Felshaufen schlafend, sich erhebend, Fäuste hoch, Bodenschlag.
**Ruhe:** Steht fast reglos, die Risse pulsieren wie Atem, kleine Kiesel rieseln von den Schultern.
**Bewegung:** Sehr langsamer, mahlender Schritt, jeder Tritt lässt den Boden beben, die Blöcke verschieben sich leicht gegeneinander.
**Ausholen (0,55 s):** Hebt beide Hammerfäuste über den Kopf, lehnt sich weit zurück, die Risse glühen hellorange auf.
**Schlag:** Ganzkörper-Schlag auf den Boden; großer Schockwellenring, Felssplitter, Funken, starkes Bildschirmwackeln.
**Treffer & Tod:** Steinsplitter platzen ab, die Glut flackert; beim Tod zerfällt er in einen Haufen Blöcke, die Risse erkalten grau.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a stone titan: living colossus of stacked angular stone blocks #8a8478 with glowing orange forge cracks #ffb04a, no neck, small blocky golem head with glowing eye slits sunk between huge shoulders, hammer-like fists. Side, front, top-down three-quarter views; wind-up (both fists raised overhead, leaning back, cracks blazing) and full-body ground slam with big shockwave ring, rock shards and sparks. Thick outlines, cel shading.
```

### Gargoyle (Stufe 68) – gargoyle
**Design:** Eine lebendig gewordene Wasserspeier-Statue (Größe 15): gedrungener, muskulöser Körper aus grauem Stein `#6a6a72` mit dunkleren Platten `#5a5a62`, kurze krumme Hörner `#3a3a40`, spitze Ohren, ein breites Fratzenmaul, große steinerne Fledermausflügel `#4a4a52`, ein Schwanz mit Steinspitze und lange Krallen. Blitzblaue Runen `#9fd0ff` sind in Brust und Flügel gemeißelt und leuchten. Kommt auch in der Titanenschmiede vor.
**Skizze:** Seitenansicht in typischer Hockpose auf einem Sockel, Frontansicht mit Fratze und Runen, Draufsicht: zwei große Flügelflächen, Schwanz als Linie. Thumbnails: als Statue erstarrt, erwachend mit abplatzendem Stein, Klaue zur Seite, Hieb.
**Ruhe:** Hockt reglos wie eine Statue, nur die Runen pulsieren; dann dreht sich ruckartig der Kopf mit knirschendem Stein.
**Bewegung:** Hüpft in kurzen Sprüngen auf allen vieren oder gleitet mit halb geöffneten Flügeln dicht über dem Boden.
**Ausholen (0,34 s):** Reißt die rechte Klaue weit zur Seite, Oberkörper und Flügel drehen ein, die Runen leuchten hell.
**Schlag:** Harter Querhieb; drei blau glimmende Krallenspuren und Steinstaub.
**Treffer & Tod:** Steinsplitter springen ab, ein Riss läuft über den Körper; beim Tod erstarrt er wieder zur Statue und zerbricht in Stücke.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a gargoyle: animated stone statue, squat muscular body of grey stone #6a6a72, short curved horns, pointed ears, wide grimacing mouth, large stone bat wings #4a4a52, tail with stone tip, long claws, glowing blue runes #9fd0ff carved into chest and wings. Side, front, top-down three-quarter views; wind-up (claw pulled far to the side, torso and wings twisted) and cross swipe with three blue claw marks and stone dust. Thick outlines, cel shading.
```

### Donnerriese (Stufe 72) – donnerriese
**Design:** Der größte Gegner der offenen Welt (Größe 25, Skalierung 1,95): ein Riese mit schieferblauer Haut `#7a8aa8`, massigem Bauch und gewaltigen Schultern, Hose `#3a4a6a`, Stiefel `#2a3248`, Handschuhe `#5a6a88`. Ein langer, buschiger Bart `#bfe8ff` aus knisternden Blitzen leuchtet hell, ebenso feine Blitzadern `#bfe8ff` auf Armen und Brust. Schwere Brauen, darunter leuchtende Augen. Von oben ist der leuchtende Bart das Erkennungszeichen.
**Skizze:** Seitenansicht mit Bauch und Bart, Frontansicht mit Blitzadern, Draufsicht: breite Schultern mit hellem Bartfleck vorn. Thumbnails: in die Wolken schauend, mit den Fingern Funken spielend, Arme hoch, Blitz schleudernd.
**Ruhe:** Steht breitbeinig, kleine Blitze springen zwischen den Fingern, der Bart flackert wie eine Gewitterwolke.
**Bewegung:** Langsamer, schwerer Gang, bei jedem Schritt zuckt ein kleiner Funke in den Boden.
**Ausholen (0,4 s):** Hebt beide Arme hoch, zwischen den Händen wächst eine gleißende Blitzkugel, der Bart lodert auf.
**Schlag:** Stößt die Arme nach vorn, ein zackiger Blitz schlägt im Ziel ein, mit hellem Bodenblitz.
**Treffer & Tod:** Der Bart flackert unruhig; beim Tod sinkt er auf die Knie, die Blitzadern erlöschen, er kippt donnernd vornüber.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a thunder giant: huge slate-blue skin #7a8aa8, massive belly and shoulders, dark blue trousers and boots, long bushy beard made of crackling glowing lightning #bfe8ff, glowing lightning veins on arms and chest, heavy brow, glowing eyes. Side, front, top-down three-quarter views; wind-up (both arms raised, a blazing lightning orb growing between the hands) and cast pose hurling a jagged lightning bolt with a bright ground flash. Thick outlines, cel shading.
```

## Feuerberg (Map 9)

Schwarzer Basalt, Lavaflüsse und Aschenregen – die letzte offene Map. Die Monster sind dunkel und glühen von innen; das Glühen (Orange `#ff8a2a`, Gelb `#ffd34d`) muss additiv leuchten, damit sie vor dem ebenfalls glühenden Boden noch lesbar bleiben. Kräftige dunkle Outlines sind hier besonders wichtig.

### Lavagolem (Stufe 62) – lavagolem
**Design:** Ein Koloss aus schwarzem, erkaltetem Basalt `#3a2a26` (Größe 22, Skalierung 1,6), anders als der Steintitan nicht aus Blöcken, sondern aus zähflüssig geformten, rundlichen Krustenplatten, zwischen denen flüssige Lava `#ff8a2a` sichtbar ist und an Ellbogen und Fingern heruntertropft. Hände `#4a3430` wie geschmolzene Klumpen, kleine Golem-Kopfkuppe mit glühendem Mundspalt, auf den Schultern wachsen orange glühende Kristalle. Von oben: dunkler Klumpen mit hell leuchtendem Adernetz.
**Skizze:** Seitenansicht mit tropfender Lava, Frontansicht mit Krustenplatten und Mundspalt, Draufsicht mit Kristallschultern. Thumbnails: aus einem Lavasee steigend, Lava abschüttelnd, Fäuste hoch, Bodenschlag mit Lavaspritzern.
**Ruhe:** Steht schwer atmend, die Risse glühen auf und ab, Lavatropfen fallen und zischen am Boden.
**Bewegung:** Sehr langsamer, schlurfender Gang, die Füße hinterlassen kurz glühende Abdrücke, die Kruste knirscht.
**Ausholen (0,55 s):** Hebt beide Fäuste über den Kopf, lehnt sich zurück, die Lava in den Rissen wird gleißend gelb.
**Schlag:** Schmettert auf den Boden; Schockwellenring, Basaltsplitter, Lavaspritzer, Bildschirmwackeln.
**Treffer & Tod:** Krustenstücke platzen ab und legen Glut frei; beim Tod erkaltet er von außen nach innen zu grauem Stein und bricht zusammen.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a lava golem: massive body of black cooled basalt #3a2a26 formed from rounded crust plates with molten lava #ff8a2a visible in the gaps and dripping from elbows and fingers, molten-lump fists, small domed head with glowing mouth slit, glowing orange crystals on the shoulders. Side, front, top-down three-quarter views; wind-up (fists raised overhead, cracks blazing yellow) and ground slam with shockwave ring, basalt shards and lava splashes. Thick outlines, cel shading.
```

### Glutkatze (Stufe 63) – glutkatze
**Design:** Eine Großkatze mit Tigerkörperbau (Größe 15): lang, muskulös, schwere Vorderbeine, langer Schwanz mit glühender Spitze `#ff7a2a`. Fell rußschwarz `#2a1a16`, Bauch `#3a2420`, darauf leuchtende Tigerstreifen `#ff6a1a`, die wie Lavaadern glühen und mit dem Atem pulsieren; glühende Augen `#ffb04a`, aus dem Maul steigen Funken. Anders als der Schattenpanther ist sie von oben an den hellen Querstreifen sofort erkennbar.
**Skizze:** Seitenansicht mit Streifenmuster, Frontansicht mit glühenden Augen und Funkenmaul, Draufsicht mit leuchtenden Querstreifen über den Rücken. Thumbnails: auf heißem Fels gähnend, schleichend, geduckt mit zuckendem Glutschwanz, Sprung.
**Ruhe:** Liegt wie eine Sphinx, gähnt mit Funkenregen, die Streifen pulsieren, die Schwanzspitze glimmt.
**Bewegung:** Schwerer Katzenschritt, Schulterblätter rollen, die Pfoten hinterlassen kurze Glutspuren; im Rennen weite Sprünge mit Funkenschweif.
**Ausholen (0,34 s):** Duckt sich flach, das Hinterteil wackelt, die Glutschwanzspitze zuckt, die Streifen flammen hell auf.
**Schlag:** Sprung mit ausgestreckten Pranken; drei feurige Krallenspuren und ein Funkenregen.
**Treffer & Tod:** Faucht, Funken stieben; beim Tod erkalten die Streifen zu grauer Asche, der Körper sinkt zusammen.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of an ember cat: tiger-built big cat, long and muscular, heavy forelegs, soot-black fur #2a1a16 with glowing lava-like tiger stripes #ff6a1a, long tail with glowing tip #ff7a2a, glowing orange eyes #ffb04a, sparks from the mouth. Side, front, top-down three-quarter views; wind-up (crouching flat, tail tip twitching, stripes flaring) and pounce with outstretched paws, three fiery claw marks and sparks. Thick outlines, cel shading.
```

### Feuerdämon (Stufe 66) – feuerdaemon
**Design:** Ein größerer, stärkerer Verwandter des Dämons (Größe 15, Skalierung 1,18): leuchtend rote Haut `#c8402f`, dunkelroter Chitinpanzer `#a82a1a`, schwarze Hufe und Klauenhände `#1a0a0a`, dunkle Fledermausflügel `#6a1a10`, Schwanz mit Pfeilspitze. Statt Haaren lodert auf dem Kopf eine Flammenkrone `#ffb04a` zwischen zwei schwarzen Hörnern `#1a0a0a`; goldgelbe Runen `#ffd34d` auf Brust und Armen, ein goldener Gürtel `#ffd34d`. Auch im Dungeon Drachenhort.
**Skizze:** Seitenansicht mit lodernder Kopfflamme, Frontansicht mit Runen und Gürtel, Draufsicht: Flügelpaar, Flammenfleck auf dem Kopf, Schwanzkurve. Thumbnails: lachend im Feuer stehend, mit Krallen Funken schlagend, Klaue zur Seite, Hieb.
**Ruhe:** Steht breitbeinig, die Kopfflamme lodert, er reibt die Krallen aneinander und schlägt Funken; die Flügel öffnen sich halb.
**Bewegung:** Aggressiver, schneller Schritt, bei jedem Hufschlag stieben Funken; im Rennen springt er mit kurzen Flügelstößen.
**Ausholen (0,34 s):** Reißt die rechte Klaue weit zur Seite, Oberkörper dreht ein, die Krallen fangen Feuer.
**Schlag:** Querhieb mit brennenden Krallen; drei flammende Krallenspuren.
**Treffer & Tod:** Die Flamme flackert; beim Tod verbrennt er in einer Stichflamme, zurück bleiben Hörner und glimmende Asche.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a fire demon: bright red skin #c8402f, dark red chitin armor #a82a1a, black hooves and clawed hands, dark bat wings #6a1a10, arrow-tipped tail, a blazing flame crown #ffb04a instead of hair between two black horns, golden runes and belt #ffd34d. Side, front, top-down three-quarter views; wind-up (claw pulled far to the side, torso twisted, claws catching fire) and cross swipe with three flaming claw marks. Thick outlines, cel shading.
```

### Feuerdrache (Stufe 69) – feuerdrache
**Design:** Ein vierbeiniger Drache mittlerer Größe (Größe 20) mit zwei großen Lederflügeln: langer Hals, keilförmiger Kopf mit zwei nach hinten gebogenen Hornzacken und vorstehenden Hauern, ein Zackenkamm vom Kopf bis zur Schwanzspitze. Schuppen tiefrot `#a82a1a`, Bauchplatten orange-gelb `#e8a050`, Schnauze `#c84a2a`, glühend gelbe Augen `#ffd34d`, lange Fänge. Die Flughäute sind dunkler und leicht durchscheinend; von oben sind die gespreizten Flügel die Hauptform.
**Skizze:** Seitenansicht mit gestrecktem Hals und angelegten Flügeln, Frontansicht mit Hornzacken, Draufsicht mit voller Flügelspannweite. Thumbnails: auf einem Felsen hockend, Rauch schnaubend, aufgebäumt, Feueratem.
**Ruhe:** Steht auf allen vieren, der Schwanz schlängelt, Rauch kräuselt aus den Nüstern, die Flügel falten sich auf und zu.
**Bewegung:** Kriechender Echsen-Gang mit schwingendem Hals und Schwanz; schnell mit kurzen Flügelschlägen, die Staub aufwirbeln.
**Ausholen (0,55 s):** Bäumt den Kopf hoch, breitet die Flügel weit aus, der Kiefer öffnet sich, im Hals glüht es auf.
**Schlag:** Senkt den Kopf und speit einen Feuerstrahl mit Funken zum Ziel.
**Treffer & Tod:** Brüllt und schlägt mit den Flügeln; beim Tod sinkt er zusammen, die Flügel legen sich wie ein Zelt über ihn, Rauch steigt auf.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a fire dragon: four-legged dragon with two large leathery wings, long neck, wedge head with swept-back horn spikes and jutting tusks, spiked ridge from head to tail tip, deep red scales #a82a1a, orange-yellow belly plates #e8a050, glowing yellow eyes #ffd34d, long fangs. Side, front, top-down three-quarter views with full wingspan; wind-up (head rearing, wings spread wide, jaw open, throat glowing) and fire breath with sparks. Thick outlines, cel shading.
```

## Dungeons

Dungeon-Monster sind enger an ihr Thema gebunden als die Monster der offenen Maps und tragen mehr Details (Rüstung, Schmuck, Leuchten), weil die Kamera in den Räumen etwas näher wirkt. Jeder Dungeon endet mit einem Boss, der etwa doppelt so groß ist wie seine Gefolgsleute und eine eigene, unverwechselbare Silhouette hat. Monster, die zusätzlich in Dungeons vorkommen (Frostgeist, Naga-Krieger, Naga-Priesterin, Steintitan, Gargoyle, Feuerdämon), stehen in ihrem Map-Abschnitt.

*Banditenkeller (Stufe 12–17): feuchte Kellergewölbe mit Fässern, Fackeln und Beutekisten.*

### Kellerwache (Stufe 12) – kellerwache
**Design:** Ein stämmiger Kerkerknecht (Größe 13) – breiter und behäbiger als der Bandit, ohne Maske, dafür mit einem verbeulten Eisenhelm `#7a828c` und einem buschigen braunen Vollbart `#5a3a22`. Gepolstertes Wams `#5a4a32`, Ärmel `#4a3c28`, Lederhandschuhe und Hose `#3a2e20`, ein grauer Schulterpanzer `#8a8e96`, Riemen `#3a2a1c` mit einem großen Schlüsselbund am Gürtel. Waffe: eine kurze, schwere Henkersaxt. Haut `#d9b896`, rote Nase, kleiner Bierbauch.
**Skizze:** Seitenansicht mit Bauch und Axt, Frontansicht mit Bart und Helm, Draufsicht: runder Helm, Schulterpanzer, Axtblatt. Thumbnails: Schlüssel klimpernd, gähnend auf einem Fass sitzend, ausholend, Hieb.
**Ruhe:** Lehnt an der Wand, spielt mit dem Schlüsselbund, gähnt und kratzt sich unter dem Helm.
**Bewegung:** Behäbiger, breitbeiniger Gang, die Schlüssel klimpern, die Axt hängt locker in der Hand; beim Rennen schnauft er sichtbar.
**Ausholen (0,4 s):** Packt die Axt mit beiden Händen, hebt sie weit hinter den Kopf, der Oberkörper dreht ein.
**Schlag:** Schwerer Diagonalhieb nach unten; breiter Hiebbogen.
**Treffer & Tod:** Der Helm verrutscht über die Augen; beim Tod fällt er rückwärts auf den Hintern und dann flach, der Schlüsselbund fliegt davon.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a stocky dungeon jailer: dented iron helmet #7a828c, bushy brown full beard #5a3a22, red nose, small beer belly, padded brown tunic #5a4a32, grey pauldron, leather straps with a big key ring, short heavy executioner's axe. Side, front, top-down three-quarter views; wind-up (axe gripped in both hands raised far behind the head, torso twisted) and heavy diagonal downward chop with wide slash arc. Thick outlines, cel shading.
```

### Armbrustschütze (Stufe 14) – armbrustschuetze
**Design:** Ein schlanker Schütze der Bande (Größe 12) mit grüner Kapuze `#3e5530`, rotem Maskentuch `#9a2f2a`, Wams `#4a5a3a`, Ärmeln `#3e4e30`, Bolzenköcher `#6b4a2e` an der Hüfte. Seine Waffe ist eine schwere, gedrungene Armbrust mit Spannhebel und Eisenbügel – kürzer und breiter als der Bogen des Bandit-Schützen, damit beide auch von oben unterscheidbar sind (im Spiel nutzt er vorerst das Bogenmodell). Eine Laterne baumelt am Gürtel.
**Skizze:** Seitenansicht im Anschlag, Frontansicht mit Maske und Armbrust, Draufsicht: Armbrust als T-Form vor dem Körper, Laterne als Lichtpunkt. Thumbnails: Armbrust spannend mit dem Fuß im Bügel, kniend zielend, Anschlag, Schuss.
**Ruhe:** Kurbelt nervös an der Armbrust, prüft den Bolzen, die Laterne schwingt.
**Bewegung:** Vorsichtiges Seitwärtsgehen mit der Armbrust in beiden Händen, er hält Abstand und sucht Deckung hinter Fässern.
**Ausholen (0,4 s):** Hebt die Armbrust in den Anschlag, die linke Hand stützt vorn, die rechte zieht zurück, der Oberkörper dreht seitlich.
**Schlag:** Der Abzug schnappt, ein kurzer, schwerer Bolzen fliegt mit hellem Leuchtstreifen; die Armbrust schlägt leicht zurück.
**Treffer & Tod:** Duckt sich hinter die Armbrust; beim Tod fällt er zur Seite, die Laterne kippt und erlischt.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a bandit crossbowman: green hood #3e5530, red cloth mask #9a2f2a, green tunic #4a5a3a, bolt quiver at the hip, small lantern on the belt, heavy stubby crossbow with lever and iron stirrup. Side, front, top-down three-quarter views; wind-up (raising the crossbow to the shoulder, aiming, torso turned, faint red glow) and shot with a glowing bolt streak and slight recoil. Thick outlines, cel shading, dim cellar lighting.
```

### Banditenfürst Raku (Stufe 17) – banditenfuerst
**Design:** Dungeon-Boss (Größe 24, Skalierung 1,75): ein hünenhafter, prahlerischer Banditenanführer. Rotes Maskentuch `#9a2f2a`, darüber stechende Augen und zurückgekämmtes schwarzes Haar `#2a1c14` mit einem gestohlenen goldenen Kronreif `#c9a35a`. Dunkles Lederwams `#3a2a22`, rote Ärmel `#5a2a24`, goldener Gürtel und goldene Stachel-Schulterpanzer `#c9a35a`, eine Kette aus Ringen und Münzen, ein langer, zerfetzter roter Umhang `#9a2f2a`, mehrere Beutel. Waffe: ein breites, geschwungenes Säbelschwert.
**Skizze:** Seitenansicht mit wehendem Umhang, Frontansicht mit Krone und Maske, Draufsicht: goldene Schultern, rotes Umhangdreieck, langer Säbel. Thumbnails: Münze schnippend, Säbel über die Schulter gelegt, ausholend, Hieb.
**Ruhe:** Schnippt eine Goldmünze in die Luft und fängt sie, rückt die Krone zurecht, lacht mit zurückgeworfenem Kopf.
**Bewegung:** Großspuriger, langsamer Schritt mit breiten Schultern, der Umhang schwingt, der Säbel ruht auf der Schulter.
**Ausholen (0,4 s):** Schwingt den Säbel weit hinter den Kopf, dreht den Oberkörper ein, der Umhang wirbelt.
**Schlag:** Breiter Diagonalhieb mit goldenem Hiebbogen, ein Stampfschritt nach vorn.
**Treffer & Tod:** Taumelt, die Krone verrutscht; beim Tod fällt er auf die Knie, die Krone rollt davon und Münzen ergießen sich aus den Beuteln.
**Prompt (EN):**
```
Stylized 3D toon MMORPG boss concept sheet of a towering bandit lord: red cloth mask #9a2f2a, slicked-back black hair with a stolen gold circlet #c9a35a, dark leather tunic #3a2a22, red sleeves, golden spiked pauldrons and belt, ring-and-coin necklace, several pouches, long tattered red cape, broad curved sabre. Side, front, top-down three-quarter views; wind-up (sabre swung far behind the head, torso twisted, cape swirling) and wide diagonal strike with golden slash arc. Thick outlines, cel shading.
```

*Spinnenhöhle (Stufe 20–25): Höhle voller Netze, Kokons und leuchtender Pilze.*

### Höhlenspinne (Stufe 20) – hoehlenspinne
**Design:** Eine bleiche, langbeinige Höhlenspinne (Größe 14): schlanker als die Waldspinne, mit dünnen, sehr langen Beinen, kleinerem Hinterleib und verkümmerten, aber glühenden magentafarbenen Augen `#ff4aff`. Körper violettgrau `#4a3a5a`, darauf eine leuchtend lila Zeichnung `#b48cff` wie Höhlenpilz-Biolumineszenz. Von oben: großer, dünner Beinstern mit einem kleinen leuchtenden Mittelpunkt.
**Skizze:** Seitenansicht mit hoch gewinkelten Knien, Frontansicht mit Augen und Kieferklauen, Draufsicht als weiter Stern. Thumbnails: kopfüber an der Decke, sich abseilend, Vorderbeine hoch, Biss.
**Ruhe:** Hängt reglos oder tastet mit den langen Vorderbeinen in die Luft; die Zeichnung pulsiert langsam.
**Bewegung:** Schneller, staksiger Spinnengang mit wechselnden Viererbeinen, der Körper schwankt hoch über dem Boden.
**Ausholen (0,34 s):** Reißt die vorderen Beinpaare hoch, kippt den Körper nach hinten, die Kieferklauen spreizen.
**Schlag:** Wirft sich nach vorn und beißt; grüner Kieferbogen.
**Treffer & Tod:** Zieht die Beine ruckartig an; beim Tod knicken die langen Beine weg und sie sinkt flach zusammen, das Leuchten erlischt.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a pale cave spider: slender with very long thin legs and high-angled knees, small abdomen, violet-grey body #4a3a5a with glowing lilac bioluminescent markings #b48cff, small glowing magenta eyes #ff4aff. Side, front, top-down three-quarter views; wind-up (front legs raised high, body tilted back, fangs spread) and forward slam with bite and green jaw arc. Thick outlines, cel shading, dark cave lighting.
```

### Giftspeierin (Stufe 22) – giftspinne
**Design:** Eine gedrungene Speispinne (Größe 14) mit kurzen, kräftigen Beinen und einem aufgeblähten, giftgrün gesprenkelten Hinterleib `#c6f08a`, der wie ein praller Giftsack wirkt. Körper dunkelgrün `#2e4a24`, die Augen leuchten gelbgrün `#d8ff6a`, an den Kieferklauen hängen Gifttropfen. Von oben: kompakter Stern mit großem, hellgrün leuchtendem Hinterleib – klar anders als die langbeinige Höhlenspinne.
**Skizze:** Seitenansicht mit hochgerecktem Hinterleib, Frontansicht mit tropfenden Kieferklauen, Draufsicht mit Giftsack-Fleckenmuster. Thumbnails: Giftblasen bildend, sich aufrichtend, Kopf zurück, Spucken.
**Ruhe:** Hockt, der Hinterleib pumpt sichtbar, an den Klauen bilden sich Giftblasen, die platzen.
**Bewegung:** Gemächlicher, schwerer Spinnengang, der dicke Hinterleib schaukelt nach; sie hält gern Abstand.
**Ausholen (0,4 s):** Hebt den Vorderkörper, zieht den Kopf zurück, der Hinterleib zieht sich zusammen und leuchtet hell.
**Schlag:** Spuckt eine Kugel giftgrünen Schleims, die in einem Bogen zum Ziel fliegt und dort zerplatzt.
**Treffer & Tod:** Gift spritzt aus der Wunde; beim Tod platzt der Hinterleib in eine grüne Pfütze, die Beine krümmen sich ein.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a venom-spitting spider: squat with short strong legs, swollen abdomen speckled toxic green #c6f08a like a venom sac, dark green body #2e4a24, glowing yellow-green eyes #d8ff6a, venom droplets on the fangs. Side, front, top-down three-quarter views; wind-up (front body raised, head pulled back, abdomen contracting and glowing) and spit pose launching an arcing glob of green slime. Thick outlines, cel shading.
```

### Spinnenkönigin (Stufe 25) – spinnenkoenigin
**Design:** Dungeon-Boss (Größe 28): eine gewaltige Spinne, doppelt so groß wie ihre Brut, mit einem riesigen, eiförmigen Hinterleib in tiefem Violett `#3a2450`, auf dem ein goldenes Kronenmuster `#ffd34d` leuchtet. Acht große, magenta glühende Augen `#ff3aff` in einer Krone aus Chitinzacken auf dem Vorderkörper, mächtige gezackte Kieferklauen, dicke, behaarte Beine mit Hakenspitzen. Am Hinterleib hängen Netzfäden und kleine Eikokons.
**Skizze:** Seitenansicht mit dem riesigen Hinterleib, Frontansicht mit Augenkrone und Kieferklauen, Draufsicht: großer Stern mit goldenem Kronenmuster in der Mitte. Thumbnails: über dem Netz thronend, Eier ablegend, Vorderbeine hoch, Biss.
**Ruhe:** Thront auf ihrem Netz, die Vorderbeine streichen über die Fäden, Spinnchen krabbeln über ihren Rücken, das Muster pulsiert.
**Bewegung:** Schwerer, majestätischer Spinnengang, der Boden zittert leicht, der Hinterleib schaukelt.
**Ausholen (0,4 s):** Richtet sich hoch auf, die beiden vorderen Beinpaare schnellen in die Luft, die Kieferklauen klaffen weit.
**Schlag:** Wirft sich nach vorn, die Beine krachen nieder, sie beißt zu; großer grüner Kieferbogen.
**Treffer & Tod:** Kreischt hoch; beim Tod bäumt sie sich auf, kippt auf den Rücken, die Beine falten sich ein, die Kokons platzen.
**Prompt (EN):**
```
Stylized 3D toon MMORPG boss concept sheet of a spider queen: enormous spider with a huge egg-shaped deep violet abdomen #3a2450 bearing a glowing golden crown pattern #ffd34d, eight glowing magenta eyes #ff3aff set in a crown of chitin spikes, massive serrated fangs, thick hairy hooked legs, web strands and egg cocoons hanging. Side, front, top-down three-quarter views; wind-up (rearing high, front legs thrust up, fangs wide) and slam-down bite with a big green jaw arc. Thick outlines, cel shading.
```

*Orkfestung (Stufe 31–36): Palisaden, Kriegstrommeln und Feuerbecken.*

### Ork-Elitewache (Stufe 31) – orkelite
**Design:** Ein disziplinierter Festungsork (Größe 16, Skalierung 1,2) – im Gegensatz zum wilden Krieger fast vollständig gepanzert: stählerner Brustpanzer und Panzerhandschuhe `#6e7680`, hellere Stachel-Schulterpanzer `#9aa1a8` auf beiden Seiten, geschlossener Stahlhelm `#6e7680` mit Sehschlitz, aus dem nur die Hauer ragen. Haut `#5a7a38`, ein kurzer dunkelblauer Umhang `#2a3a6a` mit Wappen, Gürtel `#2a2018`. Waffe: ein schweres, gerades Breitschwert, dazu ein Rundschild auf dem Rücken.
**Skizze:** Seitenansicht in Wachhaltung, Frontansicht mit Helm und symmetrischer Rüstung, Draufsicht: zwei Stachelschultern, blauer Umhang, Schwert. Thumbnails: Habachtstellung, Schwert salutierend, ausholend, Hieb.
**Ruhe:** Steht stramm, das Schwert vor sich, blickt starr geradeaus; nur gelegentlich dreht sich der Helm.
**Bewegung:** Gleichmäßiger Marschschritt, die Rüstung klirrt, der Umhang schwingt im Takt.
**Ausholen (0,4 s):** Hebt das Breitschwert weit hinter den Kopf, der Oberkörper dreht ein, der Stand ist breit und sauber.
**Schlag:** Präziser, harter Diagonalhieb; stahlblauer Hiebbogen.
**Treffer & Tod:** Funken springen von der Rüstung, er weicht kaum; beim Tod fällt er steif nach vorn, der Helm rollt ab.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of an orc elite guard: disciplined fortress orc in nearly full steel armor #6e7680, bright spiked pauldrons on both shoulders #9aa1a8, closed steel helmet with eye slit and tusks poking out, green skin #5a7a38, short dark blue cape #2a3a6a with emblem, heavy broadsword, round shield on the back. Side, front, top-down three-quarter views; wind-up (sword raised far behind the head, torso twisted) and precise diagonal strike with steel-blue slash arc. Thick outlines, cel shading.
```

### Ork-Berserker (Stufe 33) – orkberserker
**Design:** Das wilde Gegenstück zur Elitewache (Größe 16, Skalierung 1,2): nackter, sehniger Oberkörper mit gelbgrüner Haut `#7a8a40`, roter Kriegsbemalung in Streifen über Gesicht und Brust, ein hoher roter Irokesenkamm `#8a2a1a`. Nur Lederhose `#4a2a1a`, roter Gürtel `#8a2a1a`, über die Brust gekreuzte Riemen `#5a2a1a` und eine Kette aus Knochen. Waffe: eine gezackte Axt mit zwei Blättern. Weit aufgerissene, blutunterlaufene Augen, Schaum vor dem Mund.
**Skizze:** Seitenansicht vorgebeugt, Frontansicht mit Bemalung und Irokese, Draufsicht: roter Kamm als Strich, gekreuzte Riemen, Doppelaxt. Thumbnails: brüllend auf die Brust schlagend, Axt wirbelnd, ausholend, Hieb.
**Ruhe:** Kann nicht stillstehen: tritt von einem Fuß auf den anderen, schlägt sich auf die Brust, wirbelt die Axt.
**Bewegung:** Rasender Sprintschritt, weit vorgebeugt, die Axt pendelt; er wirkt immer kurz vor dem Losstürmen.
**Ausholen (0,34 s):** Sehr kurz: die Axt fliegt weit hinter den Kopf, der Oberkörper dreht hart ein, er brüllt.
**Schlag:** Wilder Diagonalhieb mit rotem Hiebbogen; oft hängt er einen zweiten, angedeuteten Schwung nach.
**Treffer & Tod:** Lacht über Treffer und wird dadurch noch wilder; beim Tod stolpert er weiter nach vorn und bricht dann zusammen.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of an orc berserker: bare sinewy torso with yellow-green skin #7a8a40, red war paint stripes on face and chest, tall red mohawk #8a2a1a, leather trousers, red belt, crossed chest straps, bone necklace, jagged double-bladed axe, wild bloodshot eyes. Side, front, top-down three-quarter views; wind-up (axe flung far behind the head, hard torso twist, roaring) and savage diagonal strike with red slash arc. Thick outlines, cel shading.
```

### Kriegsherr Gor'thak (Stufe 36) – kriegsherr
**Design:** Dungeon-Boss (Größe 26, Skalierung 1,8): ein gewaltiger Ork-Kriegsherr mit dunkelgrüner Haut `#4a6a30`, schwarzer Plattenrüstung `#2a2a30`, goldenen Panzerhandschuhen und Gürtel `#c9a35a` und riesigen, leuchtend goldenen Stachel-Schulterpanzern `#ffd34d`. Goldener Helm `#c9a35a` mit zwei großen, elfenbeinfarbenen Stierhörnern `#e0d6bc`, ein langer, blutroter Umhang `#a81a14`, Trophäenkette mit Schädeln. Waffe: eine riesige Kriegsaxt mit halbmondförmigem Blatt.
**Skizze:** Seitenansicht mit gewaltigem Umhang, Frontansicht mit Hornhelm, Draufsicht: Hörner und goldene Schultern bilden ein breites Kreuz, roter Umhang dahinter. Thumbnails: auf einem Thron sitzend, Axt in den Boden gerammt, Kriegsschrei, Hieb.
**Ruhe:** Steht breitbeinig, stützt beide Hände auf den Axtstiel, dreht langsam den gehörnten Kopf; ab und zu ein dröhnender Kriegsschrei.
**Bewegung:** Schwerer, herrischer Schritt, jeder Tritt staubt, der Umhang wogt; die Axt trägt er über der Schulter.
**Ausholen (0,4 s):** Hebt die riesige Axt weit hinter den Kopf, der ganze Körper dreht ein, der Umhang bauscht sich.
**Schlag:** Verheerender Diagonalhieb mit breitem goldenem Hiebbogen und Bodenstaub.
**Treffer & Tod:** Brüllt nur lauter; beim Tod fällt die Axt, er sinkt auf ein Knie, stützt sich auf und kippt dann schwer nach vorn.
**Prompt (EN):**
```
Stylized 3D toon MMORPG boss concept sheet of an orc warlord: enormous orc with dark green skin #4a6a30, black plate armor #2a2a30, golden gauntlets and belt, huge glowing gold spiked pauldrons #ffd34d, golden helmet with two big ivory bull horns #e0d6bc, long blood-red cape #a81a14, skull trophy chain, giant crescent war axe. Side, front, top-down three-quarter views; wind-up (axe raised far behind the head, full-body twist) and devastating diagonal strike with wide golden slash arc. Thick outlines, cel shading.
```

*Totengruft (Stufe 39–45): Gruftgewölbe mit Sarkophagen, violetten Seelenlichtern und Knochenhaufen.*

### Grabwächter (Stufe 39) – grabwaechter
**Design:** Ein besser erhaltener, adeliger Skelettritter (Größe 14, Skalierung 1,08): bleicher Knochenschädel `#ddd5bb` unter einem dunklen, gehörnten Topfhelm `#4a4454`, dunkler Waffenrock `#3a3644`, Stachel-Schulterpanzer `#6a6474`, knochige Hände. Violette Runen `#a774e0` glühen auf Rüstung und Klinge, violettes Licht in den Augenhöhlen. Waffe: ein langes, gerades Grabschwert mit Kreuzparierstange. Im Unterschied zum Untoten Krieger ist alles symmetrisch, sauber und zeremoniell.
**Skizze:** Seitenansicht in aufrechter Wächterpose, Frontansicht mit Helm und Runen, Draufsicht: Helm, zwei Stachelschultern, Schwertlinie. Thumbnails: Schwert gesenkt auf den Knauf gestützt, aus dem Sarkophag steigend, ausholend, Hieb.
**Ruhe:** Steht reglos, beide Hände auf dem Schwertknauf, die Klinge senkrecht vor sich; die Runen pulsieren.
**Bewegung:** Langsamer, gemessener Schritt wie bei einer Prozession, der Waffenrock schwingt, kein Knochenklappern.
**Ausholen (0,4 s):** Hebt das Grabschwert weit hinter den Kopf, der Oberkörper dreht ein, die Runen flammen violett auf.
**Schlag:** Sauberer Diagonalhieb mit violettem Hiebbogen.
**Treffer & Tod:** Violette Funken sprühen; beim Tod sinkt er auf ein Knie, das Licht erlischt und die Rüstung fällt leer in sich zusammen.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a tomb guardian: noble skeletal knight, pale bone skull #ddd5bb under a dark horned great helm #4a4454, dark tabard #3a3644, spiked pauldrons #6a6474, bony hands, glowing violet runes #a774e0 on armor and blade, violet eye glow, long straight cross-hilted grave sword. Side, front, top-down three-quarter views; wind-up (sword raised far behind the head, torso twisted, runes flaring) and clean diagonal strike with violet slash arc. Thick outlines, cel shading.
```

### Seelenfresser (Stufe 41) – seelenfresser
**Design:** Ein hungriger Geist (Größe 13) aus violettem Nebel `#8a6ac8`, schwebend, mit langgezogenem, hohlem Gesicht und einem riesigen, offenen Schlundmaul, in dem gefangene kleine Seelenlichter kreisen. Auf dem Kopf eine zackige, fast schwarze Krone aus Schattenfransen `#2a1a3a`, magenta glühende Augen `#ff3aff`, dürre Arme mit langen Fingern. Um ihn ziehen Ketten aus Nebel. Von oben: violetter Fleck mit dunkler Zackenkrone und magenta Punkten.
**Skizze:** Seitenansicht mit Schleierschweif, Frontansicht mit Schlundmaul, Draufsicht. Thumbnails: Seelenlicht einsaugend, um sich selbst kreisend, Arme hoch, Seelenkugel schleudernd.
**Ruhe:** Schwebt auf und ab, saugt kleine Lichtfunken aus der Luft in sein Maul, der Schleier flattert.
**Bewegung:** Gleitet hungrig nach vorn geneigt, das Maul voran, und hinterlässt violette Nebelschwaden.
**Ausholen (0,4 s):** Hebt beide Arme, steigt höher, im Maul ballt sich eine magenta leuchtende Seelenkugel.
**Schlag:** Stößt die Arme vor, die Seelenkugel schießt mit Schweif aus gequälten Gesichtern zum Ziel.
**Treffer & Tod:** Flackert und kreischt; beim Tod reißt er auf, die gefangenen Seelenlichter fliegen frei nach oben davon.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a soul eater ghost: floating violet mist body #8a6ac8, elongated hollow face with a huge gaping maw full of swirling captured soul lights, jagged near-black shadow crown #2a1a3a, glowing magenta eyes #ff3aff, thin arms with long fingers, misty chains. Side, front, top-down three-quarter views; wind-up (arms raised, floating higher, magenta soul orb gathering in the maw) and cast pose firing the orb with a trail of tormented faces. Thick outlines, cel shading.
```

### Gruftkönig Morvan (Stufe 45) – gruftkoenig
**Design:** Dungeon-Boss (Größe 26, Skalierung 1,9): ein riesiger, hagerer Skelettkönig mit bleichem Schädel `#ddd5bb` und goldener Zackenkrone `#c9a35a`, gekleidet in eine dunkle Königsrobe `#2a2434` mit violetten Ärmeln `#3a3048`, Stachel-Schulterpanzern `#4a3a5a`, goldenem Gürtel und einem schweren Umhang `#3a1a4a`. Hell violette Runen `#c89aff` leuchten auf Robe und Umhang, eine Kette mit Seelensteinen hängt um den Hals. Er führt einen langen Schädelstab, den er wie eine Kriegskeule schwingt.
**Skizze:** Seitenansicht mit langer Robe, Frontansicht mit Krone und Runen, Draufsicht: goldene Kronenzacken, violetter Umhang, Stab als lange Diagonale. Thumbnails: auf dem Thron, Stab aufstoßend, ausholend, Stabhieb.
**Ruhe:** Steht hoheitsvoll, stößt den Stab rhythmisch auf den Boden, worauf sich violette Ringe ausbreiten; der Kopf neigt sich verächtlich.
**Bewegung:** Langsames, schwebendes Schreiten, die Robe verdeckt die Füße, der Umhang schleift.
**Ausholen (0,4 s):** Hebt den Schädelstab weit hinter den Kopf, der Oberkörper dreht ein, der Schädel am Stab glüht violett.
**Schlag:** Wuchtiger Diagonalhieb mit dem Stab; violetter Hiebbogen und eine kleine Seelenwelle.
**Treffer & Tod:** Knochen knirschen, die Runen flackern; beim Tod zerfällt er zu Staub in der Robe, nur Krone und Stab fallen klirrend zu Boden.
**Prompt (EN):**
```
Stylized 3D toon MMORPG boss concept sheet of a crypt king: towering gaunt skeleton king, pale skull #ddd5bb with a jagged gold crown #c9a35a, dark royal robe #2a2434 with violet sleeves, spiked pauldrons, gold belt, heavy cape #3a1a4a, glowing pale violet runes #c89aff, soul-stone necklace, long skull-topped staff wielded like a war club. Side, front, top-down three-quarter views; wind-up (staff swung far behind the head, torso twisted, skull glowing) and heavy diagonal staff strike with violet arc. Thick outlines, cel shading.
```

*Eisgrotte (Stufe 47–52): Gletscherhöhle mit blauem Eis, Eiszapfen und gefrorenen Wasserfällen.*

### Eisgolem (Stufe 47) – eisgolem
**Design:** Ein Golem aus Gletschereis (Größe 21, Skalierung 1,5): halbdurchsichtige, kantige Eisblöcke `#a8cce6` mit tieferem Blau an den Beinen `#7aa4c8` und Füßen `#5a84a8`, fast weiße, klauenartige Eishände `#d4eaf8`. Im Inneren sind eingefrorene Steine und Luftblasen zu sehen, durch Kopf und Brust ziehen leuchtende Risse `#9fe8ff`. Kleiner kantiger Golemkopf, Eiszacken auf den Schultern. Anders als Stein- und Lavagolem glänzt er und bricht das Licht.
**Skizze:** Seitenansicht mit Zackenschultern, Frontansicht mit leuchtenden Rissen, Draufsicht: helles, kantiges Rechteck mit Eiszacken. Thumbnails: aus einer Eiswand brechend, Frost abschüttelnd, Fäuste hoch, Bodenschlag.
**Ruhe:** Steht still, aus den Fugen dampft kalter Nebel, die Risse glimmen, ab und zu knackt und splittert das Eis.
**Bewegung:** Steifer, rutschender Gang, die Füße frieren bei jedem Schritt kurz fest und reißen sich knirschend los.
**Ausholen (0,55 s):** Hebt beide Eisklauen über den Kopf, lehnt sich zurück, die Risse leuchten grell auf.
**Schlag:** Ganzkörper-Schlag auf den Boden; Schockwellenring, Eissplitter statt Felsbrocken, Bildschirmwackeln.
**Treffer & Tod:** Eisstücke platzen ab; beim Tod zerspringt er in tausend Splitter, die klirrend über den Boden rutschen.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of an ice golem: translucent angular glacier ice blocks #a8cce6, deeper blue legs and feet, near-white clawed ice hands #d4eaf8, frozen stones and air bubbles visible inside, glowing cracks #9fe8ff through head and chest, small angular golem head, ice spikes on the shoulders, glossy refraction. Side, front, top-down three-quarter views; wind-up (both ice claws raised overhead, leaning back) and ground slam with shockwave ring and ice shards. Thick outlines, cel shading.
```

### Eiskönig Hrim (Stufe 52) – eiskoenig
**Design:** Dungeon-Boss (Größe 26): ein riesiger Königsgeist aus eisblauem Licht `#9fd8ff`, doppelt so groß wie die Frostgeister. Breite, schemenhafte Schultern mit einem Mantel aus Schneesturm, ein langer, wehender Bart aus Frostnebel und eine schwere goldene Krone `#ffd34d` mit Eiszacken – das einzige feste Teil an ihm und von oben ein heller Ring. Tiefblau glühende Augen `#1a6aff`, lange geisterhafte Arme mit Eisfingern. Unten löst er sich in einen Wirbel aus Schnee auf.
**Skizze:** Seitenansicht schwebend mit Sturmmantel, Frontansicht mit Krone und Bart, Draufsicht: goldener Kronenring über blauem Nebel. Thumbnails: thronend auf einem Eisthron, Schneesturm beschwörend, Arme hoch, Vorstoß.
**Ruhe:** Schwebt langsam kreisend, der Sturmmantel wirbelt, Eiskristalle fallen aus seinem Bart, die Krone glänzt.
**Bewegung:** Gleitet majestätisch und ohne Hast, eine Frostspur breitet sich unter ihm auf dem Boden aus.
**Ausholen (0,4 s):** Hebt beide Arme, schwebt höher, der Sturm um ihn verdichtet sich.
**Schlag:** Stößt beide Arme nach vorn; eine Welle aus violett-blauem Frostrauch rollt über das Ziel.
**Treffer & Tod:** Das Licht flackert, Schnee stiebt; beim Tod zerweht er in einem letzten Schneesturm, nur die Krone fällt klirrend auf den Boden.
**Prompt (EN):**
```
Stylized 3D toon MMORPG boss concept sheet of a ghostly ice king: giant spirit of icy blue light #9fd8ff, broad shadowy shoulders draped in a cloak of blizzard, long flowing beard of frost mist, heavy gold crown #ffd34d with ice spikes, deep blue glowing eyes #1a6aff, long ghostly arms with ice fingers, lower body dissolving into a snow vortex. Side, front, top-down three-quarter views; wind-up (arms raised, floating higher) and both arms thrusting forward releasing a wave of purple-blue frost smoke. Glow, thick outlines, cel shading.
```

*Schlangentempel (Stufe 46–52): überwucherter Tempel mit Schlangenstatuen, Gold und türkisem Wasser.*

### Naga-Königin Sseth (Stufe 52) – nagakoenigin
**Design:** Dungeon-Boss (Größe 28, Skalierung 1,95): eine gewaltige Naga mit türkisgrüner Haut `#4a9a84`, dunkelgrünem Schlangenleib `#1e5a4e` mit goldenen Bändern `#c9a35a` und hellem Bauch `#e8d8a0`. Prunkvolle goldene Rüstung `#ffd34d` mit Bronzekanten `#7a5a10`, eine hohe Kobrahauben-Krone, langes, fast schwarzes Haar `#0e2a30`, rot glühende Augen `#ff4a6a`. Sie führt einen langen Dreizack mit türkis leuchtenden Spitzen `#7ad8c8`. Aufgerichtet überragt sie jeden Helden um mehr als das Doppelte.
**Skizze:** Seitenansicht mit hoch aufgerichtetem Oberkörper und langem S-Leib, Frontansicht mit Haubenkrone, Draufsicht: große Schwanzspirale, goldener Oberkörper, Dreizack als Linie. Thumbnails: auf ihrem Leib thronend, Dreizack hebend, zurückgerollt, Stoß.
**Ruhe:** Ruht auf einer Spirale ihres Leibs, wiegt sich langsam, der Schwanz peitscht träge, die Dreizackspitzen glimmen.
**Bewegung:** Mächtiges Gleiten in weiten Seitenwellen, der Oberkörper bleibt hoch und ruhig, der Leib wischt über den Boden.
**Ausholen (0,4 s):** Rollt den ganzen Leib zurück wie eine Sprungfeder, der Dreizack wird weit zurückgezogen.
**Schlag:** Schnellt vor und stößt den Dreizack; drei parallele türkise Stichblitze.
**Treffer & Tod:** Zischt, die Haube spreizt sich; beim Tod sinkt der Oberkörper nach vorn, der Leib entrollt sich langsam.
**Prompt (EN):**
```
Stylized 3D toon MMORPG boss concept sheet of a naga queen: huge naga with teal skin #4a9a84, dark green serpent tail #1e5a4e with gold bands, ornate gold armor #ffd34d with bronze trim, tall cobra-hood crown, long near-black hair, glowing red eyes #ff4a6a, long trident with glowing turquoise tips #7ad8c8. Side, front, top-down three-quarter views; wind-up (whole body coiling back like a spring, trident drawn far back) and lunging trident thrust with three turquoise streaks. Thick outlines, cel shading.
```

*Drachenhort (Stufe 65–72): Vulkanhöhle voller Gold, Knochen und Dracheneier.*

### Drachenbrut (Stufe 65) – drachenbrut
**Design:** Ein junger Drache (Größe 16) – deutlich kleiner und tapsiger als der Feuerdrache, mit großem Kopf, kurzem Hals, zu großen Pfoten und noch kleinen, unfertigen Flügeln. Schuppen orange `#c8501a`, Bauchplatten hellgelb `#f0b060`, Schnauze `#d86a2a`, kurzer Rückenkamm, gelbe Augen `#ffd34d`, kleine, spitze Zähne. Wild und bissig, aber keine niedlichen Riesenaugen – eher ein angriffslustiges Raubtierjunges.
**Skizze:** Seitenansicht mit großem Kopf und kurzen Flügeln, Frontansicht mit Zahnreihe, Draufsicht: rundlicher Körper, zwei kleine Flügeldreiecke. Thumbnails: aus einem Ei schlüpfend, Rauchwölkchen niesend, flatternd, Biss.
**Ruhe:** Hockt wie eine Katze, schlägt mit den kleinen Flügeln, niest Rauch und Funken.
**Bewegung:** Hastiges, watschelndes Rennen auf allen vieren, der Schwanz wedelt, kurze flatternde Hüpfer.
**Ausholen (0,34 s):** Weicht zurück, reißt den Kopf hoch und das Maul weit auf, die Flügel stellen sich auf.
**Schlag:** Springt vor und beißt zu; zwei orangene Kieferbögen mit Funken.
**Treffer & Tod:** Quiekt und faucht; beim Tod rollt es sich ein, die Flügel legen sich um den Körper, Rauch steigt auf.
**Prompt (EN):**
```
Stylized 3D toon MMORPG concept sheet of a dragon whelp: young dragon, smaller and clumsier than an adult, big head, short neck, oversized paws, small undeveloped wings, orange scales #c8501a, pale yellow belly plates #f0b060, short back ridge, yellow eyes, small sharp teeth, feisty predator cub, no cute big eyes. Side, front, top-down three-quarter views; wind-up (backing off, head up, jaws wide, wings raised) and leaping bite with two orange jaw arcs and sparks. Thick outlines, cel shading.
```

### Urdrache Vharak (Stufe 72) – urdrache
**Design:** Dungeon-Boss (Größe 34): ein uralter, gewaltiger Drache mit fast schwarzen, purpurstichigen Schuppen `#2a1a2a`, goldbraunen Bauchplatten `#c8902a` und einer dunklen Schnauze `#4a2a3a`. Mehrere Reihen von Hornzacken am Kopf, vorstehende Hauer, ein schwerer Zackenkamm, riesige, an den Rändern zerrissene Flügel. Eine alte Narbe zieht sich über das Gesicht, die Augen glühen orange `#ff6a2a`, zwischen den Schuppen schimmert Glut. Auf seinem Rücken kleben Goldmünzen aus seinem Hort.
**Skizze:** Seitenansicht mit gestrecktem Hals, Frontansicht mit Hornkrone und Narbe, Draufsicht mit voller, zerrissener Flügelspannweite. Thumbnails: auf dem Goldhort liegend, Rauch schnaubend, aufgebäumt, Feueratem.
**Ruhe:** Liegt schwer atmend auf dem Gold, Rauch steigt aus den Nüstern, ein Auge öffnet sich träge, der Schwanz schiebt Münzen.
**Bewegung:** Langsames, schweres Kriechen, der Boden bebt, die halb geöffneten Flügel stützen ihn wie Krücken.
**Ausholen (0,55 s):** Bäumt den Kopf weit hoch, spreizt die riesigen Flügel, der Kiefer öffnet sich, Brust und Hals glühen auf.
**Schlag:** Senkt den Kopf und speit einen breiten Feuerstrahl mit dichtem Funkenregen.
**Treffer & Tod:** Brüllt donnernd; beim Tod bricht er auf dem Hort zusammen, die Flügel sinken herab, die Glut erlischt.
**Prompt (EN):**
```
Stylized 3D toon MMORPG boss concept sheet of an ancient elder dragon: colossal dragon with near-black purple-tinged scales #2a1a2a, gold-brown belly plates #c8902a, rows of horn spikes, jutting tusks, heavy spiked ridge, huge torn wings, old scar across the face, glowing orange eyes #ff6a2a, ember glow between scales, gold coins stuck to its back. Side, front, top-down three-quarter views; wind-up (head rearing high, wings spread, throat glowing) and wide fire breath with dense sparks. Thick outlines, cel shading.
```

*Titanenschmiede (Stufe 64–70): eine Schmiede der Titanen mit Ambossen so groß wie Häuser, Lavarinnen und Ketten.*

### Titanenkönig Kroth (Stufe 70) – titanenkoenig
**Design:** Dungeon-Boss (Größe 34, Skalierung 2,5): der König der Steintitanen, dunkler und älter als seine Untertanen – dunkelgrauer Stein `#6a6458`, Beine `#3a3630`, Hände `#4a4640` wie Ambosse. Schmiedeglut `#ffb04a` leuchtet in Rissen und in eingemeißelten Runen, auf den Schultern sitzen geschmiedete Stachelpanzer `#3a3430`, auf dem kleinen Golemkopf eine Krone aus glühenden Metallzacken `#ffb04a`. Von oben: gewaltige Schultern mit leuchtendem Kronenring in der Mitte.
**Skizze:** Seitenansicht mit überbreiten Schultern, Frontansicht mit Runen und Krone, Draufsicht. Thumbnails: auf einem Amboss sitzend, die Faust auf den Amboss schlagend, beide Fäuste hoch, Bodenschlag.
**Ruhe:** Schlägt langsam eine Faust in die offene Hand, bei jedem Schlag sprühen Funken, die Runen pulsieren.
**Bewegung:** Sehr langsamer, donnernder Schritt, Kiesel springen vom Boden, Ketten an den Armen schwingen.
**Ausholen (0,55 s):** Hebt beide Amboss-Fäuste hoch über den Kopf, lehnt sich weit zurück, alle Runen glühen weiß-orange auf.
**Schlag:** Ganzkörper-Schlag auf den Boden; riesiger Schockwellenring, Felssplitter, Funkenfontäne, starkes Bildschirmwackeln.
**Treffer & Tod:** Glut spritzt aus Rissen; beim Tod erkalten die Runen nacheinander, er sinkt auf die Knie und zerbricht in Blöcke, die Krone schmilzt.
**Prompt (EN):**
```
Stylized 3D toon MMORPG boss concept sheet of a titan king: colossal ancient stone giant of dark grey stone #6a6458, anvil-like fists, glowing forge cracks and carved runes #ffb04a, forged spiked pauldrons #3a3430, small golem head with a crown of glowing metal spikes, chains on the arms. Side, front, top-down three-quarter views; wind-up (both anvil fists raised overhead, leaning back, runes blazing white-orange) and full-body ground slam with huge shockwave ring, rock shards and spark fountain. Thick outlines, cel shading.
```

## Endbosse (Raids)

Die neun Endbosse sind Raid-Gegner für fünf Spieler. Jeder baut auf dem Modell eines normalen Monsters auf, ist aber vier- bis sechsmal so groß wie ein Held (Größe 60–72), trägt eine eigene Grundfarbe und Boss-Schmuck und steht auf einem doppelten Runenring. Weil der Boss auf dem iPhone-Bildschirm fast die halbe Höhe einnimmt, muss die **Ausholpose aus jeder Entfernung** lesbar sein: große, klare Gesten, starkes rotes Pulsieren, und Effekte, die den Boden markieren. Auf jedem Skizzenblatt steht zum Größenvergleich die Silhouette eines Helden neben dem Boss.

### Fenris, der Urwolf (Stufe 14) – fenris
**Design:** Ein urzeitlicher Riesenwolf auf Basis des Alpha-Wolfs (Größe 60), Grundfarbe stahlgrau `#3a3e46`, Fell `#43484f`, Bauch `#8d9196`, eine gewaltige schwarze Mähne `#25292e`, die wie eine Gewitterwolke über Nacken und Schultern wallt. Rot glühende Augen `#ff3a2a`, eine tiefe Narbe über einem Auge, armlange Fänge. An allen vier Läufen hängen zerrissene Eisenfesseln mit Kettenresten, auf der Stirn ist eine leuchtende Rune eingebrannt. Arena: Höhle des Urwolfs.
**Skizze:** Seitenansicht mit Heldensilhouette zum Größenvergleich, Frontansicht mit Mähne und Fängen, Draufsicht: dunkler Mähnenkragen, Kettenenden, roter Augenpunkt. Thumbnails: heulend mit gestrecktem Hals, an den Ketten zerrend, Rudel herbeirufend, Sprungbiss.
**Ruhe:** Steht hechelnd, die Kettenreste klirren, die Mähne bewegt sich wie im Sturm; zwischendurch ein langes Heulen, bei dem Wölfe herbeieilen.
**Bewegung:** Schwerer, raumgreifender Trab, die Ketten schleifen Funken über den Stein; im Rennen ein bodenerschütternder Galopp.
**Ausholen (0,34 s):** Sehr kurz, aber riesig: Ruck zurück, Kopf hoch, Kiefer reißt weit auf, die Augen flammen.
**Schlag:** Gewaltiger Sprungbiss; zwei breite rote Kieferbögen, die einen ganzen Bereich abdecken, dazu Staub.
**Treffer & Tod:** Knurrt, die Mähne sträubt sich; beim Tod ein letztes Heulen, er sinkt nieder und die Fesseln fallen klirrend von ihm ab.
**Prompt (EN):**
```
Stylized 3D toon MMORPG raid boss concept sheet of Fenris the primordial wolf: colossal steel-grey wolf #3a3e46, five times the size of a hero, huge black storm-cloud mane #25292e, glowing red eyes #ff3a2a, deep scar over one eye, arm-length fangs, broken iron shackles with chain ends on all four legs, glowing rune burned into the forehead, double rune ring under its paws. Side view with hero silhouette for scale, front and top-down views; wind-up (jerking back, jaws wide) and massive leaping bite with two wide red jaw arcs. Thick outlines, cel shading.
```

### Ursus, der Waldtyrann (Stufe 24) – ursus
**Design:** Ein uralter Riesenbär auf Basis des Braunbären (Größe 64), Grundfarbe dunkles Rindenbraun `#4a3220`, Fell `#6a4a30`, Bauch `#9a7a58`, Schnauze `#b89a78`. Auf seinem gewaltigen Schulterbuckel wächst ein kleiner Wald: Moos, Farne, zwei junge Bäume und eine Krone aus knorrigen Wurzelzweigen auf dem Kopf. In seiner Flanke stecken abgebrochene Pfeile und Speere früherer Jäger, die Krallen sind lang wie Schwerter. Arena: Thron des Waldtyrannen.
**Skizze:** Seitenansicht mit Wald auf dem Rücken und Heldensilhouette, Frontansicht mit Wurzelkrone, Draufsicht: grüner Moosfleck auf braunem Rücken. Thumbnails: auf dem Wurzelthron sitzend, Baum ausreißend, aufgerichtet brüllend, Prankenhieb.
**Ruhe:** Sitzt schwer auf dem Hinterteil, kratzt sich am Baum auf seinem Rücken, Blätter rieseln, er brummt tief.
**Bewegung:** Schwerer Passgang, der ganze Rücken-Wald schaukelt, Vögel flattern auf; im Rennen ein überraschend schneller, wogender Galopp.
**Ausholen (0,48 s):** Richtet sich riesenhaft auf die Hinterbeine auf, beide Pranken hoch, Maul weit offen – sein Schatten fällt über die Gruppe.
**Schlag:** Kracht nach vorn nieder mit Prankenhieb; drei riesige Krallenspuren und Blätterwirbel.
**Treffer & Tod:** Brüllt, Rinde und Blätter fallen; beim Tod sinkt er wie ein umstürzender Hügel nieder, Moos wächst sofort über ihn.
**Prompt (EN):**
```
Stylized 3D toon MMORPG raid boss concept sheet of Ursus the forest tyrant: colossal ancient brown bear #4a3220, five times hero size, a small forest growing on its shoulder hump (moss, ferns, two young trees), crown of gnarled root branches on the head, broken arrows and spears stuck in its flank, sword-length claws, double rune ring underneath. Side view with hero silhouette for scale, front and top-down views; wind-up (rearing up on hind legs, both paws raised, mouth open) and crashing paw swipe with three huge claw marks. Thick outlines, cel shading.
```

### Großkhan Gorbag (Stufe 34) – gorbag
**Design:** Der oberste Ork-Herrscher auf Basis des Ork-Hauptmanns (Größe 64), Grundfarbe tiefes Kriegsgrün `#3a5a22`, Haut `#5a7a38`, dunkler Harnisch `#3e3a40`, goldene Stachel-Schulterpanzer und Gürtel `#c9a35a`, ein riesiger roter Umhang `#8a1a14`. Auf dem Rücken stecken zwei hohe Kriegsbanner mit Clanzeichen, im Gesicht weiße Schädelbemalung, um den Hals Ketten aus Helmen besiegter Krieger. Waffe: eine Axt so groß wie ein Tor. Arena: Kriegsarena des Großkhans.
**Skizze:** Seitenansicht mit Bannern und Heldensilhouette, Frontansicht mit Schädelbemalung, Draufsicht: zwei Bannerstangen, goldene Schultern, Axt als riesiger Halbmond. Thumbnails: Arme hoch vor jubelnder Menge, auf den Boden stampfend, ausholend, Hieb.
**Ruhe:** Reckt die Axt der Arena entgegen, brüllt, schlägt sich auf die Brust; die Banner wehen.
**Bewegung:** Siegessicherer, stampfender Schritt, jeder Tritt lässt Staub aufsteigen; im Rennen stürmt er mit der Axt quer vor der Brust.
**Ausholen (0,34 s):** Blitzschnell für seine Größe: die Axt fliegt weit hinter den Kopf, der Oberkörper dreht ein, der Umhang bauscht sich.
**Schlag:** Diagonaler Axthieb mit einem riesigen goldenen Hiebbogen, der die halbe Arena überstreicht.
**Treffer & Tod:** Lacht dröhnend; beim Tod fällt die Axt, er kniet nieder, die Banner kippen und decken ihn zu.
**Prompt (EN):**
```
Stylized 3D toon MMORPG raid boss concept sheet of Grand Khan Gorbag: gigantic orc overlord, five times hero size, war-green skin, dark harness, golden spiked pauldrons and belt #c9a35a, huge red cape #8a1a14, two tall clan war banners on his back, white skull face paint, necklace of defeated warriors' helmets, axe as big as a gate, double rune ring underneath. Side view with hero silhouette, front and top-down views; wind-up (axe flung far behind the head, torso twisted) and diagonal strike with a giant golden slash arc. Thick outlines, cel shading.
```

### Höllenfürst Azaroth (Stufe 44) – azaroth
**Design:** Ein Dämonenfürst auf Basis des Dämons (Größe 64), Grundfarbe tiefes Blutrot `#6a1a24`, Haut `#a8343f`, Chitinpanzer `#8e2f3a`, riesige ledrige Flügel `#4a1a20` mit brennenden Rändern, peitschender Schwanz, lange schwarze Krallen. Eine Krone aus sechs gebogenen Hörnern, orange glühende Runen `#ffb04a` über dem ganzen Körper, aus den Hufen steigt Feuer. Er springt gern hoch in die Luft und landet auf einem markierten Helden. Arena: Höllenschlund.
**Skizze:** Seitenansicht mit gespreizten Flügeln und Heldensilhouette, Frontansicht mit Hörnerkrone, Draufsicht: riesige Flügelflächen, Schwanz als S, Runenring. Thumbnails: aus einer Feuersäule steigend, Höllenhunde beschwörend, im Sprung, Klauenhieb.
**Ruhe:** Schwebt halb, schlägt langsam die brennenden Flügel, lächelt mit Reißzähnen, die Runen pulsieren.
**Bewegung:** Schneller, raubtierhafter Schritt mit halb geöffneten Flügeln, kurze Gleitsprünge über die Arena.
**Ausholen (0,34 s):** Reißt die rechte Klaue weit zur Seite, Oberkörper und Flügel drehen ein, die Krallen entzünden sich.
**Schlag:** Riesiger Querhieb; drei lange, brennende Krallenspuren über den Boden.
**Treffer & Tod:** Faucht, die Runen flackern; beim Tod bricht der Boden unter ihm auf und er versinkt brüllend in einer Säule aus Feuer.
**Prompt (EN):**
```
Stylized 3D toon MMORPG raid boss concept sheet of demon lord Azaroth: colossal blood-red demon #6a1a24, five times hero size, red skin, chitin chest armor, huge leathery wings with burning edges, whipping tail, long black claws, crown of six curved horns, glowing orange runes #ffb04a all over, fire rising from the hooves, double rune ring. Side view with hero silhouette, front and top-down views; wind-up (claw pulled far to the side, torso and wings twisted, claws igniting) and huge cross swipe with three burning claw marks. Thick outlines, cel shading.
```

### Frostriese Ymir (Stufe 54) – ymir
**Design:** Ein Frostriese auf Basis des Yetis (Größe 68), Grundfarbe Gletscherweiß `#d8e8f4`, zotteliges Fell `#e8eef4`, bläuliche Beine `#c8d4e0`, dunkle Hände und Gesicht `#9aa8b8` mit Eiskrallen. Er trägt eine Krone aus goldenen, nach oben gebogenen Hörnern, aus seinen Schultern wachsen Eiskristalle, die Augen glühen weiß-blau. Von seinem Bart hängen Eiszapfen, sein Atem ist eine ständige Frostwolke. Er lässt Eismeteore auf rot markierte Kreise fallen. Arena: Halle des Frostriesen.
**Skizze:** Seitenansicht mit langen Armen und Heldensilhouette, Frontansicht mit Goldhornkrone, Draufsicht: breiter weißer Rücken, Kristallschultern, goldener Kronenring. Thumbnails: auf dem Eisthron, Eismeteor herbeirufend, beide Fäuste hoch, Bodenschlag.
**Ruhe:** Steht gebeugt, stößt Frostatem aus, trommelt langsam auf die Brust; Schnee rieselt aus seinem Fell.
**Bewegung:** Gorilla-artiger Knöchelgang, jeder Schritt bebt, Eis splittert unter den Fäusten.
**Ausholen (0,55 s):** Richtet sich zu voller Höhe auf, reißt beide Fäuste über den Kopf, lehnt sich zurück und brüllt.
**Schlag:** Schmettert beide Fäuste in den Boden; riesiger Schockwellenring, Eis- und Felssplitter, starkes Bildschirmwackeln.
**Treffer & Tod:** Eissplitter fliegen; beim Tod fällt er nach vorn, sein Körper gefriert zu einem Eisblock, die Goldkrone rollt davon.
**Prompt (EN):**
```
Stylized 3D toon MMORPG raid boss concept sheet of frost giant Ymir: colossal yeti-like giant, five times hero size, glacier-white shaggy fur #d8e8f4, dark blue-grey face and hands with ice claws, crown of golden upward-curving horns, ice crystals growing from the shoulders, glowing white-blue eyes, icicles hanging from the beard, constant frost breath, double rune ring. Side view with hero silhouette, front and top-down views; wind-up (rising to full height, both fists raised overhead) and ground slam with huge shockwave ring and ice shards. Thick outlines, cel shading.
```

### Schlangengöttin Vritra (Stufe 55) – vritra
**Design:** Eine Göttin auf Basis der Naga-Königin (Größe 64), Grundfarbe tiefes Jadegrün `#1a5a4a`, Haut `#4a9a84`, Schlangenleib `#1e5a4e` mit goldenen Bändern `#c9a35a` und hellem Bauch `#e8d8a0`, prunkvolle goldene Rüstung `#ffd34d`. Hinter ihrem Kopf spreizt sich ein Strahlenkranz aus fünf Kobrahauben wie ein Heiligenschein, rot glühende Augen `#ff4a6a`, ein Dreizack mit türkis leuchtenden Spitzen `#7ad8c8`. Ihr Leib ist so lang, dass er die halbe Arena umschlingt. Arena: Tempel der Schlangengöttin.
**Skizze:** Seitenansicht mit Kobra-Strahlenkranz und Heldensilhouette, Frontansicht frontal mit Kranz, Draufsicht: lange Schwanzspirale um die Arena, goldener Kern. Thumbnails: meditierend mit erhobenem Dreizack, die Kobrahauben zischend, zurückgerollt, Stoß.
**Ruhe:** Wiegt sich hoheitsvoll, die fünf Kobrahauben bewegen sich einzeln und züngeln, der Leib gleitet langsam weiter.
**Bewegung:** Schnelles, mächtiges Gleiten in weiten Wellen, der aufrechte Oberkörper bleibt ruhig und majestätisch.
**Ausholen (0,34 s):** Der Leib rollt sich blitzschnell zurück, der Dreizack wird zurückgezogen, alle Hauben spreizen sich.
**Schlag:** Gewaltiger Dreizackstoß; drei lange türkise Stichblitze.
**Treffer & Tod:** Die Hauben zischen; beim Tod erstarrt sie und wird zu einer goldenen Tempelstatue, die von Rissen durchzogen wird.
**Prompt (EN):**
```
Stylized 3D toon MMORPG raid boss concept sheet of serpent goddess Vritra: colossal naga goddess, five times hero size, jade-green #1a5a4a, teal skin, serpent tail with gold bands coiling around half the arena, ornate gold armor #ffd34d, a halo of five cobra hoods spreading behind her head, glowing red eyes #ff4a6a, trident with turquoise tips #7ad8c8, double rune ring. Side view with hero silhouette, front and top-down views; wind-up (body coiling back fast, trident drawn back, hoods flaring) and huge trident thrust with three turquoise streaks. Thick outlines, cel shading.
```

### Lichkönig Morrak (Stufe 64) – morrak
**Design:** Ein mächtiger Lich auf Basis des Gruftkönigs (Größe 64), Grundfarbe aschfahles Graugrün `#3a3a30`, Knochenschädel `#ddd5bb`, dunkle Robe `#2a2434` mit violetten Ärmeln `#3a3048`, Stachel-Schulterpanzer `#4a3a5a`, goldener Gürtel `#c9a35a`, schwerer Umhang `#3a1a4a`. Statt einer Krone schwebt ein Ring aus violetten Seelenflammen `#c89aff` über seinem Schädel, um ihn kreisen drei Seelensteine. Sein Schädelstab ist lang wie ein Turm, er führt ihn wie eine Sense. Arena: Gruft des Lichkönigs.
**Skizze:** Seitenansicht schwebend mit Heldensilhouette, Frontansicht mit Seelenflammenring, Draufsicht: violetter Flammenring, kreisende Steine, Stab als lange Diagonale. Thumbnails: Untote beschwörend, Seelensteine kreisen lassend, ausholend, Stabhieb.
**Ruhe:** Schwebt knapp über dem Boden, die Robe weht ohne Wind, die Seelensteine kreisen, Knochenhände spielen mit violettem Licht.
**Bewegung:** Gleitet ohne Schritte, die Robe schleift, eine Spur aus violettem Nebel bleibt zurück.
**Ausholen (0,34 s):** Reißt den Stab weit hinter den Kopf, der Oberkörper dreht ein, die Seelenflammen lodern hoch.
**Schlag:** Mähender Diagonalhieb mit dem Stab; breiter violetter Hiebbogen und eine Seelenwelle.
**Treffer & Tod:** Die Seelensteine flackern; beim Tod zerspringen sie, die Robe fällt leer zusammen, ein Schrei aus violettem Licht steigt auf.
**Prompt (EN):**
```
Stylized 3D toon MMORPG raid boss concept sheet of lich king Morrak: colossal floating skeletal lich, five times hero size, ashen grey-green tone #3a3a30, bone skull #ddd5bb, dark robe with violet sleeves, spiked pauldrons, gold belt, heavy cape #3a1a4a, a ring of violet soul flames #c89aff hovering above the skull, three orbiting soul stones, tower-tall skull staff wielded like a scythe, double rune ring. Side view with hero silhouette, front and top-down views; wind-up (staff swung far behind the head, torso twisted) and sweeping diagonal strike with wide violet arc. Thick outlines, cel shading.
```

### Weltendrache Ignar (Stufe 76) – ignar
**Design:** Der mächtigste Drache auf Basis des Urdrachen (Größe 72), Grundfarbe verkohltes Blutrot `#3a1010`, Schuppen `#2a1a2a`, Bauchplatten goldbraun `#c8902a`, Schnauze `#4a2a3a`. Durch seine Schuppen ziehen glühende Magmaadern, eine Krone aus Hornzacken umrahmt den Kopf, vorstehende Hauer, eine alte Narbe. Die gigantischen Flügel sind von Glut durchscheinend, die Augen glühen orange `#ff6a2a`, sein Schwanz endet in einer Klinge aus Obsidian. Arena: Hort des Weltendrachen.
**Skizze:** Seitenansicht mit voller Flügelspannweite und winziger Heldensilhouette, Frontansicht mit Hornkrone, Draufsicht: Flügel bedecken fast das ganze Blatt. Thumbnails: aus dem Lavasee steigend, Meteore herbeirufend, aufgebäumt, Feueratem.
**Ruhe:** Liegt wie ein Berg, die Magmaadern pulsieren mit dem Atem, Funken steigen aus den Nüstern, der Schwanz schlägt glühende Furchen.
**Bewegung:** Schweres, bebendes Schreiten, die halb gespreizten Flügel fächeln Hitzewellen, Lava spritzt unter den Klauen.
**Ausholen (0,55 s):** Bäumt sich riesenhaft auf, spreizt die Flügel über die ganze Arena, der Kiefer öffnet sich, Brust und Hals glühen weiß.
**Schlag:** Senkt den Kopf und speit eine breite Feuerwalze mit dichtem Funkenregen.
**Treffer & Tod:** Magma spritzt aus Wunden; beim Tod stürzt er brüllend nieder, die Adern erkalten zu schwarzem Stein.
**Prompt (EN):**
```
Stylized 3D toon MMORPG raid boss concept sheet of world dragon Ignar: titanic dragon, six times hero size, charred blood-red #3a1010 and dark purple scales, gold-brown belly plates #c8902a, glowing magma veins through the scales, crown of horn spikes, jutting tusks, old scar, gigantic ember-translucent wings, glowing orange eyes #ff6a2a, obsidian blade tail tip, double rune ring. Side view with tiny hero silhouette, front and top-down views; wind-up (rearing up, wings spread over the arena, throat glowing white) and wide fire breath with dense sparks. Thick outlines, cel shading.
```

### Donnertitan Tarkon (Stufe 78) – tarkon
**Design:** Der stärkste Gegner des Spiels auf Basis des Donnerriesen (Größe 72), Grundfarbe gewittergrau `#5a5a66`, Haut `#7a8aa8`, Hose `#3a4a6a`, Stiefel `#2a3248`, Handschuhe `#5a6a88`. Blitzadern `#bfe8ff` ziehen über den ganzen Körper, sein Bart ist ein tobender Blitzsturm, um seinen Kopf kreist eine kleine schwarze Gewitterwolke, aus der ständig Blitze zucken. Auf den Unterarmen sitzen Armschienen aus Sturmmetall mit Runen. Arena: Gipfel des Donnertitans.
**Skizze:** Seitenansicht mit Gewitterwolke und Heldensilhouette, Frontansicht mit Blitzbart, Draufsicht: dunkle Wolke über hellem Bart, breite Schultern. Thumbnails: Blitze in den Fäusten sammelnd, in den Himmel brüllend, beide Fäuste hoch, Bodenschlag.
**Ruhe:** Steht breitbeinig, die Gewitterwolke grollt, Blitze springen zwischen Bart und Händen, der Boden um ihn knistert.
**Bewegung:** Langsamer, donnernder Schritt, bei jedem Tritt schlägt ein kleiner Blitz in den Boden.
**Ausholen (0,55 s):** Reißt beide Fäuste über den Kopf, lehnt sich zurück, Blitze aus der Wolke schlagen in seine Fäuste ein.
**Schlag:** Schmettert die Fäuste in den Boden; riesiger Schockwellenring mit Blitzbögen, Felssplitter, starkes Bildschirmwackeln.
**Treffer & Tod:** Blitze zucken unkontrolliert; beim Tod verzieht sich die Wolke, die Adern erlöschen, er fällt donnernd vornüber.
**Prompt (EN):**
```
Stylized 3D toon MMORPG raid boss concept sheet of thunder titan Tarkon: colossal storm giant, six times hero size, storm-grey #5a5a66 and slate-blue skin, glowing lightning veins #bfe8ff all over, raging lightning-storm beard, a small black thundercloud circling his head with constant bolts, rune-etched storm-metal bracers, double rune ring. Side view with hero silhouette, front and top-down views; wind-up (both fists raised overhead, leaning back, lightning striking into his fists) and ground slam with huge shockwave ring, lightning arcs and rock shards. Thick outlines, cel shading.
```
