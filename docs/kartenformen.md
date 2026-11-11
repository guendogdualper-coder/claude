# Kartenformen (seit 14.68)

Wunsch des Spielers: Jede Karte außer Kazehana soll anders aussehen – nicht nur Boden und Farbe, sondern die ganze
Gestalt: Inseln, zu denen man nur von Teleportstein zu Teleportstein kommt, ein Himmelsgebiet, und jede Stadt eine eigene
Anlage. Bis 14.66 entstanden alle Karten aus demselben Rauschen mit Seen; sie unterschieden sich vor allem durch Boden,
Farbe und Bäume.

Phase 1 (dieser Stand): Baukasten und die Lichtkarten 4, 5, 6, 2, 7 samt Städten. Phase 2: Schattenkarten 11–16 und die
gemeinsamen Karten 8, 3, 9, 10 (Vorschläge unten). Kazehana (Map 1) bleibt unverändert.

## Die fünf Karten

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

## Spielstände und Mehrspieler

- `WORLD_VERSION` bleibt 15: Städte liegen, wo sie waren. Wer auf jetzt unbegehbarem Gelände steht (Meer, Wolken,
  Schlucht, dichter Wald), kommt wie bisher über `canStand` → `townRescue`/`villageSpawn` in die Stadt dieser Karte.
- Alles aus festen Startwerten: alle Mitspieler haben dieselbe Welt. Kazehana, die Schattenkarten, die gemeinsamen
  Karten 8, 3, 9, 10 und der Dungeon-Streifen sind bitgenau wie vorher (Boden, Objekte, Schmuck, Gebiete, Helligkeit,
  Leute, Bauten, Wege – geprüft per Rastervergleich).

## Tests

- Erreichbarkeit (`mapFormReport()` im Spiel): Flutfüllung ab der Ankunft in der Stadt über begehbare Kacheln
  (`tileBlocked`) und Teleportsteine; geprüft werden alle Leute und Tore, Steine, Wanderer, Hausbewohner, je Monstergruppe
  und Seelenstein-Stufe 20 Erscheinungsorte, dazu die Zahl begehbarer, aber unerreichbarer Kacheln.

## Vorschläge für Phase 2 (jede Karte eine andere Form, Schatten ≠ Lichtgegenstück)

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

Hinweise für Phase 2: Die Schattenstädte entstehen beim Laden als Spiegel der Lichtstädte (`SHADOW_TOWNS`); vor dem
Ersetzen einer Lichtstadt wurden die Kopien schon gemacht, für neue Schattenstädte einfach `KF_TOWNS[11 …]` setzen.
`KF_OLD_WANDER` enthält schon die Zahlen aller Karten. Instanz-Ecken (Maps 7, 8, 3, 9, 10, 15) brauchen Land in den
Ecken (`mapFormTargets` sorgt dafür).
