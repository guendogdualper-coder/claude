# Kartenformen (seit 14.70, Phase 2 seit 14.73)

Wunsch des Spielers: Jede Karte außer Kazehana soll anders aussehen – nicht nur Boden und Farbe, sondern die ganze
Gestalt: Inseln, zu denen man nur von Teleportstein zu Teleportstein kommt, ein Himmelsgebiet, und jede Stadt eine eigene
Anlage. Bis 14.66 entstanden alle Karten aus demselben Rauschen mit Seen; sie unterschieden sich vor allem durch Boden,
Farbe und Bäume.

Phase 1 (14.70): Baukasten und die Lichtkarten 4, 5, 6, 2, 7 samt Städten. Phase 2 (14.71): die Schattenkarten 11–16
und die gemeinsamen Karten 8, 3, 9, 10, jede mit eigener Form und neuer Stadt (Abschnitt „Phase 2“). Kazehana (Map 1)
bleibt unverändert. Damit hat jede der 15 Karten außer Kazehana eine andere Grundform und jede Stadt eine eigene Anlage –
keine Schattenstadt ist mehr eine gespiegelte Lichtstadt.

## Phase 1: die fünf Lichtkarten

| Map | Form | Stadt |
|---|---|---|
| 4 Dunkelwald | **Lichtungswald**: undurchdringlicher Nadelwald, darin rund 35 Lichtungen mit Teichen und Hainen, verbunden durch gewundene Waldpfade (aufspannender Baum plus Schleifen). | **Wurzelhof**: runde Palisade in der größten Lichtung, ein Bach quer durch den Norden mit Holzsteg, ein Hain alter Tannen (neues Rasterzeichen `Y`), zwei Blockhäuser. |
| 5 Rostschlucht | **Schlucht mit Hochplateaus**: eine tiefe Schlucht (neuer Boden `KLUFT`) quer über die Karte, drei Seitenschluchten, Sackgassen-Klüfte und runde Einbrüche teilen das Land in fünf Plateaus. Sechs Hängebrücken, fünf natürliche Felsbrücken. | **Kluftwacht**: Steinfeste mit abgeschrägten Ecken; ein Riss im Fels läuft von Südwesten bis in die Unterstadt (Hängebrücke am Südweg), eine Stützmauer mit zwei Treppen trennt die Oberstadt mit den Lehmhäusern. |
| 6 Ödland | **Ascheinseln**: zehn Inseln im dunklen Meer, dazu Felsnadeln mit toten Bäumen. Keine Insel hat einen Landweg zur anderen – alle sind über Teleportstein-Paare verbunden (9 Paare). Der Kartenrand liegt im offenen Meer. | **Aschenhafen**: Hafenstadt am Ostufer der Stadtinsel – Palisade, Lagerhäuser und Markt an Land, drei Stege ins Meer zu Plattformen mit Ständen. |
| 2 Schlangental | **Schlangenfluss mit Delta**: ein breiter Fluss windet sich durch die Wüste, ein Zufluss kommt von Westen, im Dschungel teilt er sich in drei Arme und eine Lagune. Neun Sandfurten, die Wege bauen dazu Brücken; Oasenteiche in der Wüste. | **Kanalstadt Sahra**: Lehmmauer mit runden Ecken, je zwei Kanäle in beiden Richtungen teilen die Stadt in neun Viertel, Brücken an den Straßen und in jedem Kanalstück. Die Stube der Teppichknüpferin bleibt (gleiche Nebenaufgabe). |
| 7 Frostgipfel | **Himmelsinseln**: zehn verschneite Gipfel über einem Wolkenmeer (neuer Boden `WOLKEN`), sechs Eisbrücken, vier Teleportstein-Paare, Felsnadeln mit Tannen. Der Kartenrand liegt im Wolkenmeer, in 3D bis zum Horizont. | **Wolkenhorst**: runde Steinfeste auf dem höchsten Gipfel; ein Spalt, in dem die Wolken stehen, trennt den Marktplatz von zwei Felsplattformen im Norden, Eisbrücken führen hinüber. |

Die Texte der Karten (Weltentor, Wegweiser) beschreiben die neue Form (`MAP_FORM_TEXT`, englisch in `sprachen/en.js`).

## Baukasten

- `js/daten/kartenformen.js`: `MAP_FORMS` (welche Karte welche Form mit welchen Angaben) und die neuen Städte
  (`KF_TOWNS`, Raster über `kfTownGrid`, überschreiben `TOWN_LAYOUTS` erst nach den gespiegelten Schattenstädten – die
  bleiben genau, wie sie waren).
- `js/kartenformen.js`: die Formen (`FORM_BUILDERS`: `inseln`, `schlucht`, `fluss`, `lichtungen`), die Werkzeuge
  (`blob`, `stroke`, `meander`, `bridge`, `ford`, `stone`, `shoreToward`), der Ablauf und das Aussehen.
- Rastercodes (`KF`): Land, Abgrund/Meer (`void`), dichter Wald, Teich, Furt, Brücke.

Ablauf (`mapFormShape`, aus `buildWorldMaps` gleich nach dem Erzeugen jeder Karte, vor den Wegen):

1. Die Karte entsteht wie bisher (gleiche Zufallszahlen – die übrigen Karten bleiben gleich).
2. Die Form füllt ein Raster (eigener Zufallsgenerator `WORLD_SEED + 6800 + 131 · Map`).
3. Stadt mit Ring (je Seite einstellbar, `ring`) und alle Ziele kommen sicher auf Land: Dungeon-Eingänge
   (auch `entry2`), Endboss-Tore, Instanz-Ecken (`mapFormTargets`).
4. Zusammenhang (`kfConnect`): Splitter unter `minIsland` Kacheln werden Felsnadel/Meer/Wald; jede übrige Insel ohne
   Landweg wird mit der nächstgelegenen schon verbundenen Fläche verbunden – je nach `link` über ein Teleportstein-Paar
   (Stein mit 5 × 5 festem Land rundherum, Abstand zu Stadt, Zielen und anderen Steinen), eine Furt oder einen Waldpfad.
5. Das Raster wird in die Karte geschrieben; alte Seen aus dem Rauschen werden Land.
6. Wege (`layRoads`) halten sich an die Form: kein Weg über Abgrund, Meer oder dichten Wald (außer `roadsCross` beim
   Fluss, dort baut der Weg Brücken), Tore ohne Weg nach draußen (`gates`), auf Inseln beginnen die Wege an den
   Teleportsteinen. Brücken der Form (`FORM_BRIDGE`) lässt `tidyBridges` unverändert.
7. Nach den Städten: Teleportsteine der Form kommen zu denen der Stadt (`mapFormAfterTown`, gleiche Steine, Effekte,
   Kartenzeichen und Linien wie in Blutwacht/Glutlager). Danach (`mapFormCleanup`) wird alles, was von der Stadt aus zu
   Fuß und über Steine nicht erreichbar ist, zu Meer/Abgrund bzw. Wald – so steht kein Monster, Wanderer, Seelenstein
   oder wandernder Dungeon-Eingang unerreichbar.

Weitere Haken: Wanderer würfeln auf Karten mit Form mit eigenem Generator, der gemeinsame rückt danach um genau so viele
Zahlen weiter wie früher (`KF_OLD_WANDER`, gemessen mit 14.66 – für alle Karten eingetragen, auch die von Phase 2; je
Karte immer 3 Wanderer, Licht `wk`, Schatten `swk`). Instanz-Ecken suchen ab der Ankunft in der Stadt und über die
Steine (`mapFormCornerStart`). Die Stadtmauer-Freifläche lässt Meer/Abgrund der Form stehen (`mapFormKeepsTile`, für
den Hafen).

**Neue Form ergänzen**: Funktion in `FORM_BUILDERS` (bekommt `ctx` und die Angaben), Eintrag in `MAP_FORMS`, neue
Stadt in `KF_TOWNS`. Bei einer Schattenkarte zuerst prüfen, dass die Vorlage ihrer gespiegelten Stadt nicht mehr
gebraucht wird (`SHADOW_TOWNS` in `daten/stadtformen.js`).

## Phase 2 (14.71): Schattenkarten und gemeinsame Karten

| Map | Form | Stadt |
|---|---|---|
| 11 Mondfall | **Kraterseen** (`krater`): Dämmerwiesen voller runder Mondkrater, um jeden ein Rand aus Geröll (neuer Rastercode `RIM`: Land mit Felsbrocken), in den großen ein See mit Insel, zu der ein Teleportstein führt; kleine Krater bleiben trockene Mulden. | **Mondsichel**: die Stadt liegt wie eine Sichel um den Mondsee im Osten; im Westen der Platz mit dem Weltentor, eine Uferpromenade, ein Steg über den See zum Osttor, Häuser in den Spitzen, die Stube der Mondweberin. |
| 12 Aschewald | **Brandschneisen** (`schneisen`): verkohlter, undurchdringlicher Tannenwald; acht gerade Schneisen laufen strahlenförmig von der Stadt weg, vier Ringschneisen (Vielecke) kreuzen sie – ein Spinnennetz. An den Kreuzungen Brandflächen mit Glutfeldern (Lava) und Aschegruben. | **Palisadenstern**: achtzackiger Stern aus Kohlholz-Palisaden, die Tore in den Zacken der Achsen, in den schrägen Zacken Stände und verkohlte Tannen. |
| 13 Knochenwüste | **Dünenmeer** (`duenen`): sieben lange Dünentäler voller Treibsand (neuer Boden `TREIBSAND`) quer über die Karte, dazwischen begehbare Kämme; Pässe aus festem Grund, Oasen mit Teich und Bäumen auf den Kämmen. | **Dünenlinse**: linsenförmige Mauer aus Gebeinkalk zwischen zwei Dünentälern (der Treibsand reicht in die Stadt), Tore nur im Westen und Osten, Oasenteich mit Palmen (neues Rasterzeichen `w`: Wasser), Platz mit dem Weltentor. |
| 14 Blutsteppe | **Kraterkessel** (`kessel`): ein riesiger elliptischer Kessel; außen die Steppe, dann ein Graben aus Blut (neuer Boden `BLUTSEE`) mit vier Steinbrücken, innen zwei Stützmauer-Ringe mit Rampen (neuer Rastercode `WALL`, Mauerart `terrasse`) als Stufen hinab zum Blutsee, die Insel darin nur per Stein. | **Kesselrand**: Feste in D-Form am Rand des Kessels; eine Stützmauer mit zwei Treppen teilt sie, unten (zum Kessel) ein Becken voller Blut, Häuser und der Rat, oben der Platz und die Stände. |
| 15 Nachtfrost | **Terrassenhang** (`terrassen`): vier Stützmauern ziehen sich in Wellen quer über die Karte, Lücken aus Geröll sind die Rampen; fünf Gletscherspalten (neuer Boden `EISSPALTE`) schneiden quer durch, Schneebrücken führen hinüber. | **Kreuzfeste**: Feste in Kreuzform, in der Mitte ein zugefrorener See als Platz (neues Rasterzeichen `i`: Eis, begehbar), das Weltentor steht auf dem Eis, die Stände in den vier Armen. |
| 16 Schattenklippen | **Fjordküste** (`fjorde`): im Norden das Meer mit Schären, neun Fjorde und Seitenarme schneiden tief ins Land, Brücken über die Mündungen, Klippenfelsen an der Kante (`cliffRocks`); draußen im Schwarzmoor Moortümpel. | **Fjordhafen**: Klippenstadt, durch deren Nordmauer der Fjord bis in ein Hafenbecken reicht; eine Brücke führt über den Fjord, der Kai in der Mitte des Beckens nur per Teleportstein (Auktion und Lager stehen dort), die Werkstatt des Klippenschmieds. |
| 8 Totenmoor | **Moorlabyrinth** (`moor`): schwarzes Moor, darin 40 Torfinseln, verbunden durch schmale Knüppeldämme (L-förmige Stege, nie durch die Stadt), mit Schleifen und Sackgassen; ein Teil der fernen Inseln ist versunken und nur über Teleportsteine zu erreichen. | **Stegdorf**: offenes Pfahldorf mitten im Moor – neun Plattformen im Raster, verbunden durch Stege; Dämme laufen aus jedem Tor geradeaus ins Moor, schiefe Hütten auf Pfählen auf den Eckplattformen. |
| 3 Donnerklamm | **Grat und Klamm** (`grate`): fast alles ist Klamm (`KLUFT`), begehbar sind schmale, gewundene Grate zwischen Felskuppen, außen am Titanenkamm breitere Kämme und größere Kuppen; Hängebrücken zwischen nahen Kuppen. | **Gratfeste**: lange Feste auf dem Grat zwischen zwei Klammen, Tore im Westen und Osten, nach Norden und Süden Hängebrücken über die Klamm; die Werkstatt des Braumeisters. |
| 9 Feuerberg | **Vulkankegel** (`vulkan`): im Norden der Krater mit Lavasee und Geröllrand, acht Lavaströme laufen strahlenförmig bis an den Rand und teilen das Land in Keile; je Strom zwei Basaltbrücken und eine erkaltete Furt. Das Höllenthron-Portal liegt am Südhang. | **Basaltsechseck**: sechseckige Basaltfeste, innen ein zweites Sechseck aus einem Lavagraben mit vier Steinbrücken um den Platz mit dem Weltentor. |
| 10 Kristallabgrund | **Splitterfeld** (`splitter`): kantige Kristallplattformen (Vielecke) im Raster über dem Abgrund, verbunden durch Lichtbrücken; außen im Leerenschlund lose Splitter nur per Stein, kleine Kristallnadeln im Abgrund; der Kartenrand liegt im Abgrund (`voidEdge`). | **Oktogon** (Lichtwacht): achteckige Kristallfeste mit einer inneren Zitadelle (Rat, Auktion, Stube des Lichtmönchs), im Süden der Platz, zwei Abgrundspalten mit Lichtbrücken. |

Die Vorschläge aus Phase 1 wurden so umgesetzt, mit diesen Abweichungen: Im Kraterkessel laufen keine Lavarinnen
strahlenförmig (das wäre dem Vulkankegel zu ähnlich), sondern Ringe; in der Fjordküste ist das Schwarzmoor kein Labyrinth
(das hat das Totenmoor), sondern voller Moortümpel; Mondfall hat keine Insel-Stadt mehr (die alte gespiegelte Stadt war
schon „Mondsee mit Insel“), sondern die Mondsichel; die Städte von 8, 3, 9 und 10 sind neu statt „bleiben“.

Neues im Baukasten (`js/kartenformen.js`):
- Rastercodes `RIM` (Land mit Felsbrocken: Kraterrand, Rampe, Geröllhang) und `WALL` (Stützmauer, `F.wallStyle`).
- Werkzeuge `poly` (Vieleck), `taper` (Linienzug mit wachsender Breite: Lavastrom, Fjord), `at`/`cross` (Brücke oder
  Furt quer über einen Lauf), `townHit`/`lbridge` (L-förmige Brücke, nie durch das Quadrat der Stadt).
- Angaben `townClear` (Karten der Phase 2: keine Furt, kein Pfad, kein Stein direkt an der Stadt, rund um jeden Stein
  keine Bäume), `anchors` (feste Inseln/Plattformen für Instanz-Ecken und Eingänge abseits, mit Damm bzw. Lichtbrücke
  angebunden), `town`/`stubs` (Grat: die Stadt als Quergrat, Kuppen vor den Toren, damit die Grate genau an den Toren
  ankommen), `cliffRocks`/`rimRocks`.
- Teleportsteine stehen nie in einem Baum (auf allen Karten die Steinkachel selbst; die Phase-1-Karten hatten dort nie
  einen, ihr Raster bleibt gleich).
- Dichter Wald (`fill: 'trees'`) wird jetzt bei jeder Form sparsam gezeichnet, mit der Tannenkulisse des Gebiets
  (Aschewald: verkohlte Tannen).
- Stadtraster: `i` (zugefrorener See, begehbar) und `w` (Wasser, wenn die Stadt eine andere Flüssigkeit hat).
- Wichtig beim Bauen: das Rauschen (`makeNoise`) gilt nur für Lagen ab 0 – Linienzüge, die über den Kartenrand hinaus
  laufen, an der Kante enden lassen (sonst NaN-Breiten; `taper` überspringt solche Punkte).

## Neue Böden und Aussehen

- `GROUND.WOLKEN` (24) und `GROUND.KLUFT` (25), beide in `LIQUID` (nicht begehbar; der fliegende Drache darf drüber).
- 3D: eigene Oberflächen `LIQUID3.clouds` (weiche ziehende Wolkenballen, Sonnenseite heller, nachts gedämpft, einfache
  Fassung auf niedriger Grafik) und `LIQUID3.kluft` (warmer Dunst mit treibendem Staub), tiefer als Wasser
  (`LIQUID3_DEPTH`: Wolken 1,7, Schlucht 2,2; Oberfläche bei -0,62 bzw. -1,25), damit eine Absturzkante zu sehen ist; die
  Kante unter den Himmelsinseln in dunklem Fels (`LIQUID3_UNDER`). Kartenrand im Wolkenmeer/Meer (`voidEdge`): keine
  Randwand, die Fläche läuft bis zum Horizont (`V3.home.voidG`).
- Brücken: Eisbrücke (`'eis'`) über den Wolken, Hängebrücke (`'seil'`) über der Schlucht.
- 2D: ziehende Wolkenfetzen bzw. Staub, dunkle Felskante statt Sandufer. Große Karte und Minikarte: eigene Farben
  (`MAP_LIQ`, `MAP_COLORS`).
- Dichter Wald (Dunkelwald) in 3D: im Inneren nur auf jeder vierten Kachel ein Tannenpaar der Randkulisse (sparsame
  Kegel ohne Umriss) statt eines Baums je Kachel.
- Seit 14.71: `GROUND.TREIBSAND` (26), `GROUND.BLUTSEE` (27), `GROUND.EISSPALTE` (28), alle in `LIQUID`. 3D:
  `LIQUID3.treibsand` (träge, vom Wind geriffelte Fläche, wandernde dunkle Mulden; Tiefe 0,55), `LIQUID3.blutsee`
  (dickflüssig, langsame Wellen, matter Glanz, dunkle Kruste am Ufer; Tiefe 0,9), `LIQUID3.eisspalte` (tief, blau ins
  Schwarze, kalter Dunst, helle Eiskante; Tiefe 2,3, Wände aus Eis). Brücken: Steg über Treibsand, Steinbrücke über
  Blut, Schneebrücke (Eis) über der Spalte. 2D: wandernde Riefen, träge Blasen, Dunst; eigener Saum am Ufer. Große
  Karte und Minikarte: eigene Farben.

## Monster und Leistung

- Weniger begehbares Land als früher (Lichtungswald rund 26 000, Ascheinseln 30 000, Himmelsinseln 24 000 begehbare
  Kacheln statt rund 70 000): damit es nicht zu gedrängt wird, bekommen diese Karten weniger Monstergruppen
  (`mobScale` 0,7 / 0,7 / 0,65 in `populateWorld`); Seelensteine bleiben gleich. Dichte ist trotzdem etwa doppelt so
  hoch wie früher – die Gruppen liegen auf allen Inseln und Lichtungen.
- 3D, Dreiecke je Bild (Grafik mittel wie am Handy, Kamera normal, gleiche fünf Stellen je Karte – Stadt und vier
  Stellen draußen –, vorher → nachher, gemessen mit `renderer.info`):
  - Dunkelwald: 479/100/139/106/123 → 417/126/150/125/99 Tausend (Summe 947 → 917 Tausend). Der dichte Wald wird
    sparsam gezeichnet: Inneres nur jede 16. Kachel ein Tannenpaar der Randkulisse (Kegel ohne Umriss), zweite Reihe
    jede vierte Kachel ein kleineres Paar, der Waldrand auf mittel/niedrig jede zweite Kachel ein Paar (auf hoch/plus
    ein Baum je Kachel). Ohne diese Ausdünnung wären es an einer Stelle 590 statt 150 Tausend.
  - Rostschlucht, Ödland, Schlangental, Frostgipfel: draußen meist gleich oder weniger (Meer, Wolken und Schlucht
    kosten kaum etwas; Summen 868 → 782, 760 → 779, 934 → 871, 744 → 837 Tausend). Mehr: die Stadt Wolkenhorst
    (413 statt 326 Tausend, runde Mauer) und im Ödland die Stelle am Hafen (148 statt 80). Alle Städte bleiben im
    üblichen Rahmen (380–420 Tausend, Kazehana-Niveau 479).
- Welt erzeugen dauert so lange wie vorher (im Test 2,4–3,2 s gegenüber 2,4–2,9 s, Schwankung des Testrechners).
- Seit 14.71 (Phase 2): begehbare Kacheln und `mobScale` – Mondfall 65 000 (0,85), Aschewald 23 500 (0,7), Knochenwüste
  52 000 (0,85), Blutsteppe 67 000 (0,85), Nachtfrost 69 000 (0,9), Schattenklippen 60 000 (0,85), Totenmoor 19 000
  (0,45), Donnerklamm 22 000 (0,6), Feuerberg 65 000 (0,85), Kristallabgrund 24 000 (0,55) statt rund 70 000. Die Dichte
  liegt damit bei höchstens etwa dem Doppelten von früher, wie in Phase 1.
- Dreiecke je Bild (gleiche Messung wie oben, Tausend, Stadt/vier Stellen draußen, vorher → nachher):
  Mondfall 324/157/188/143/346 → 444/88/188/130/271, Aschewald 346/94/105/86/199 → 433/110/97/129/221,
  Knochenwüste 408/321/90/84/89 → 409/393/81/84/85, Blutsteppe 378/101/78/70/383 → 433/125/78/70/436,
  Nachtfrost 344/116/97/111/107 → 473/139/128/117/99, Schattenklippen 307/138/103/123/220 → 281/146/139/125/228,
  Totenmoor 311/115/89/95/221 → 252/77/145/141/218, Donnerklamm 296/66/61/158/86 → 425/136/59/191/81,
  Feuerberg 370/57/62/58/58 → 377/57/67/59/60, Kristallabgrund 292/58/180/74/81 → 303/66/254/75/94.
  Draußen meist gleich (Moor, Klamm, Lava, Abgrund, Treibsand kosten kaum etwas; Stützmauern, Stege und Hängebrücken
  ein wenig). Die Städte liegen alle unter Kazehana (479): Die neuen Städte sind kompakter, man sieht vom Ankunftsplatz
  mehr der 16 Stadtleute auf einmal (sie machen allein 200–290 Tausend aus; im Palisadenstern stehen deshalb vier von
  ihnen in den Zacken an den Toren – vorher 542, jetzt 433). Die Kreuzfeste (473) und der Palisadenstern haben keine
  Bäume in den Zwickeln.
- Welt erzeugen: im Test 2,4 s gegenüber 2,0–2,4 s mit 14.70 (Testrechner, drei Läufe).

## Spielstände und Mehrspieler

- `WORLD_VERSION` bleibt 15: Städte liegen, wo sie waren. Wer auf jetzt unbegehbarem Gelände steht (Meer, Wolken,
  Schlucht, dichter Wald), kommt wie bisher über `canStand` → `townRescue`/`villageSpawn` in die Stadt dieser Karte.
  Seit 14.71 geprüft auf allen zehn Karten der Phase 2 (je eine Stelle draußen in Moor, Klamm, Lava, Abgrund,
  Treibsand, Blut, Spalte, Meer, Wald und je drei in der alten Stadt auf Mauer, Haus oder Wasser: alle landen auf dem
  Ankunftsplatz der Stadt und stehen frei).
- Alles aus festen Startwerten: alle Mitspieler haben dieselbe Welt. 14.70: Kazehana, die Schattenkarten, die gemeinsamen
  Karten 8, 3, 9, 10 und der Dungeon-Streifen bitgenau wie vorher. 14.71: Kazehana, die Phase-1-Karten 2, 4, 5, 6, 7
  und der Dungeon-Streifen bitgenau wie 14.70 (Boden, Objekte, Schmuck, Gebiete, Helligkeit, Leute, Bauten, Wege,
  Steine – geprüft per Rastervergleich). Die Wanderer der übrigen Karten bleiben dank `KF_OLD_WANDER`.
- Fraktionsregeln (offener Kampf ab 50 auf den gemeinsamen Karten) und Städte als sichere Orte sind unverändert: sicher
  ist genau die Fläche des Stadtrasters (`TOWN_SAFE`), auch Stege, Becken und Eis darin.

## Tests

- Erreichbarkeit (`mapFormReport()` im Spiel): Flutfüllung ab der Ankunft in der Stadt über begehbare Kacheln
  (`tileBlocked`) und Teleportsteine; geprüft werden alle Leute und Tore, Steine, Wanderer, Hausbewohner, je Monstergruppe
  und Seelenstein-Stufe 20 Erscheinungsorte, dazu die Zahl begehbarer, aber unerreichbarer Kacheln.
- 14.71: `mapFormReport()` für alle 16 Karten: auf allen Karten mit Form 0 unerreichbare Kacheln, kein Mensch, Tor,
  Eingang (auch `entry2`, Endboss-Tore, Instanz-Ecken, Höllenthron-Portal) oder Stein unerreichbar, alle
  Erscheinungsorte erreichbar (Kazehana unverändert 9 Kacheln, wie in 14.70). Dazu für jede neue Stadt: alle Plätze
  begehbar und sicher, der Stand daneben frei, Häuser nur auf Stadtboden, Tore an der Mitte jeder Seite offen oder
  ausdrücklich zu (`gates`), keine eingeschlossenen Taschen im Stadtraster.

## Vorschläge aus Phase 1 (umgesetzt in 14.71, siehe oben)

| Map | Vorschlag Form | Stadt |
|---|---|---|
| 11 Mondfall | **Kraterseen**: Felder runder Mondkrater-Seen, begehbarer Kraterrand, in den großen Kratern Inseln (Teleportsteine), Furten zwischen den Kratern | Stadt am Kraterrand, Weltentor auf einer Insel im Kratersee |
| 12 Aschewald | **Brandschneisen**: verkohlter Wald mit langen geraden Schneisen strahlenförmig von der Stadt, dazwischen Glutfelder (kleine Lavaflecken) und Aschegräben | Palisadenstern an der Kreuzung der Schneisen |
| 13 Knochenwüste | **Dünenmeer mit Oasen**: lange, unbegehbare Dünenkämme (neuer fester Boden oder Dünen-Objekt) bilden Täler, Pässe dazwischen, Oasen mit Teichen | Oasenstadt zwischen zwei Dünen, Stände unter Sonnensegeln |
| 14 Blutsteppe | **Kraterkessel**: riesiger Vulkankessel mit Blutsee in der Mitte, Ringplateau, strahlenförmige Lavarinnen mit Steinbrücken, Insel im See nur per Stein | Kesselrandstadt mit Treppen in den Krater |
| 15 Nachtfrost | **Terrassenhang mit Gletscherspalten**: die Karte steigt in Stufen an (Stützmauern mit Rampen), quer laufen Gletscherspalten (Abgrund) mit Schneebrücken | Stadt auf der obersten Terrasse |
| 16 Schattenklippen | **Fjordküste**: vom Rand schneiden tiefe Meeresarme ins Land, Klippen, Brücken über die Fjordmündungen; außen das Schwarzmoor als Labyrinth aus Moorpfaden | Klippenstadt über einem Fjord, Hafen unten per Stein |
| 8 Totenmoor | **Moorlabyrinth**: Torfinseln, verbunden durch schmale Knüppeldämme (Furten im Moor), Sackgassen, versunkene Inseln nur per Stein | Pfahldorf bleibt oder wird größer |
| 3 Donnerklamm | **Grat und Klamm**: zwei Gebirgsgrate mit schmalen Gratpfaden entlang tiefer Klammen (Kluft), außen der Titanenkamm als Stufenplateaus | Klammfeste (zweigeteilt) bleibt passend |
| 9 Feuerberg | **Vulkankegel mit Lavaströmen**: Krater mit Lavasee in der Mitte, radiale Lavaströme teilen das Land in Keile, Basaltbrücken | Inselring im Lavasee bleibt passend |
| 10 Kristallabgrund | **Splitterfeld**: kantige, vieleckige Kristallplattformen (statt runder Inseln) im violetten Abgrund, Lichtbrücken im Raster, äußere Splitter nur per Stein | Kristallplattformen bleiben |

Die gespiegelten Schattenstädte (`SHADOW_TOWNS` in `daten/stadtformen.js`) entstehen beim Laden noch, werden aber seit
14.71 alle von `KF_TOWNS` ersetzt. Instanz-Ecken (Maps 7, 8, 3, 9, 10, 15) brauchen Land in den Ecken
(`mapFormTargets`); liegt die Ecke auf einer Form mit Teleportsteinen mitten im Nichts, braucht sie einen `anchor`
(Steine dürfen nicht direkt an einem Ziel stehen).
