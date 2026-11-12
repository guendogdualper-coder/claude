# Bosse in 3D – Paket 3 (seit 14.82)

Letztes Boss-Paket. Fortsetzung von Paket 1 (`docs/bosse-78.md`, 14.80) und Paket 2 (`docs/bosse-81.md`, 14.81): gleiche
Baukasten-, Animations- und Effekt-Schnittstellen (`js/bosse3d.js`), neue Modelle in `js/bosse3d-modelle3.js`.

## Umfang

| Gruppe | Bosse |
|---|---|
| Dungeon-Bosse (auch Riss-Dungeons und Wellenmeister der Arena – dieselben Arten) | Spinnenkönigin, Kriegsherr Gor'thak, Eiskönig Hrim, Urdrache Vharak, Banditenfürst Raku, Gruftkönig Morvan, Naga-Königin Sseth, Titanenkönig Kroth (Kristallseherin Vaelith seit Paket 2) |
| Wächter Gletschergruft | Skadi, Ilva, Torbjörn, Hrimfang |
| Wächter Feste des Nordlichts | Bjarki, Aurra, Sturmhorn, Jarl Hrimgar |
| Wächter Moorkrypta | Fenrik, Hexe Morgrah, Moorschlund, Der Ertrunkene Ritter |
| Wächter Knochenkathedrale | Kantor der Gebeine, Seelenfänger Varis, Der Knochenkoloss, Bischof Mortheim |
| Wächter Donnerschmiede | Raik, Blitzharpyie Kyra, Schmiedetroll Grumm, Hornbrecher Thorak |
| Wächter Sturmhorst | Windkreischerin Ssyla, Steinwächter Grom, Felsenhüter Ugrak, Sturmrufer Brontes |
| Wächter Glutkessel | Glutpranke Sahir, Schlackenfaust, Flammentänzerin Ilyra, Ignaroth |
| Wächter Aschenzitadelle | Aschewächter Kael, Brutmutter Ishra, Rußdrache Vorr, Höllenschmied Barak |
| Wächter Spiegelgruft | Glimra, Korvald Spiegelfaust, Ysolde, Brakkar Glasschwinge |
| Wächter Thron der Leere | Nachtkralle, Xul, der Hohle, Gharon, Ritter Morvaine |

48 Bosse (8 Dungeon-Bosse, 40 Wächter). Arena: Es gibt keine eigenen Mini-Bosse – der Wellenmeister ist ein Dungeon-Boss
(`arenaBossType`), bekommt also dasselbe Modell. Die Riss-Dungeons führen in dieselben Dungeons (`riftDungeon`).

## Ursache

Wie vor Paket 1/2: Die Bosse hatten kein eigenes Modell. Ihr Aussehen kam von der Vorlage (`look`, z. B. Eiswolf,
Frostgeist, Eisgolem, Yeti, Ghul, Harpyie, Gargoyle, Lavagolem, Feuerdämon, Kristallgolem), vergrößert mit `lookScale`,
gefärbt mit `t3` und bewegt mit `animateCreature`. Die Wächter zeigten ihre Angriffe mit Lichtsäule, Wirbel und Ring
beim Einschlag; alle Bosse standen in einem pulsierenden Bodenring (`a.aura`).

## Änderung

### Neue Baupläne (`js/bosse3d-modelle3.js`)
- **Spinne** (`bsSpider3`): Vorderleib mit acht Augen, Kieferklauen mit Giftfängen, Taster, großer Hinterleib mit
  Zeichnung, Spinnwarzen und Borsten, acht Beine aus drei Gliedern (weich gewichtet). Skelett: Vierbeiner (Beinpaare 1
  und 4, Hinterleib an den Schwanzknochen, Taster an den Ohrknochen) plus vier Beine (Knochen 23–34). Eigene
  Beinbewegung (`bsSpiderPost3`): Wechselgang zu je vier Beinen, Tasten in der Ruhe, Aufbäumen und Vorderbeine heben
  (Stampfer, Brüllen), Prankenhieb mit dem Vorderbein, Hinterleib atmet und hebt sich beim Spinnen, Tod: auf den Rücken
  gedreht, Beine eingerollt.
- **Wächter-Zweibeiner** (`bsWard3`): ein Baukasten aus Gestalt (Riese, Hüne, Mensch, Gewand), Kopf im eigenen Rahmen
  (Troll, Stier, Yeti, Riesengesicht, Fels/Kristall, Schädel, Schlund, Bandit), Bedeckung (Fell, Felsplatten, Kristall,
  Eis, Magma mit Glutfugen, Knochen mit Rippen und eingewachsenen Schädeln), Zubehör (Schulterstücke aus Eisen, Fell,
  Fels, Knochen oder Stoff; Jarlshelm, Kapuze, Steinkrone; Stein- und Wolkenbart; Hörner; aufgedunsener Bauch;
  Schmiedeschürze, Gurte, Umhang mit Pelzkragen, Lendentuch/Mantelschöße, Ketten; Felsbrocken, Orgelpfeifen oder Schild
  am Rücken; offenes Glutherz; Hufe, Stiefel, Felsfäuste) und Waffe (Kriegs- und Steinhammer, Doppelaxt, Säbel und
  Dolch, Keule, Stab, Glockenstab). Animation über die Zweibeiner-Animation aus Paket 1 (Gestalt bestimmt Grundpose,
  Nahkampf-Posen, Schweben beim Gewand).
- **Dauereffekte als Bausteine** (`bsAmb3`): aufsteigende Funken/Glut, Rauch/Nebel, Tropfen, Flammen, kreisende
  Splitter, kleine Blitze zwischen zwei Punkten, Bodennebel, Schnee, pulsierendes Leuchten – je Boss kombiniert.

### Abwandlungen der Baupläne aus Paket 1/2 (neue Schalter, alte Modelle bauen unverändert)
- Wolf (`bsWolf3`): `headKind` (Katze: kurze Schnauze, Säbelzähne, Schnurrhaare, Pinselohren; Bock: langer Schädel,
  Ziegenbart, Schlappohren, Widderhörner), `hooves`, `tail` ('cat', 'stub'), `mane` (0, 'small'), `extra` (Zubehör).
- Bär (`bsBear3`): `head` (eigener Kopf, Mammut), `extra`.
- Lich (`bsLich3`): `headgear` ('ice', 'mitre', 'hood', 'void'), `staff` ('ice', 'crozier', 'lantern'), `noCollar`,
  `stole`, `chains`.
- Herrin (`bsSorc3`): `crown: 'aurora'`, `hag`, `mirrorFace`, `wispHem`, `weapon: 'crook'`.
- Ritter (`bsKnight3`): `helm` ('skull', 'bucket', 'horned'), `drowned`, `blade: 'broken'`, `weapon: 'glaive'`.
- Harpyie (`bsHarpy3`): `crown` ('mask', 'crest'), `weapon` ('fan', 'claws').
- Dämon (`bsDemon3`): `gargoyle`, `helm: 'ash'`, `weapon` ('none', 'hammer', 'halberd' mit Schild, 'twin').
- Drache (`bsDrake3`): `horns` ('ram', 'crystal', 'nubs'), `spines: 'crystal'`, `tailEnd: 'crystal'`, `spineN`, `eggs`,
  `lite` (weniger Platten und Zähne für Wächter).
- Naga (`bsNaga3`): `headdress`, `trident` (Dreizack und Rundschild).
- Ork (`bsOrc3`): `mohawk`, `axe2`, `shield`.

### Modelle

| Boss | Bauplan | Wesen / Aussehen | Thema |
|---|---|---|---|
| Spinnenkönigin | Spinne | violett, Chitinkrone mit Leuchtstein, Totenkopfzeichnung, Eikokons, Spinnfäden, leuchtende Beinringe | Brut: Gift tropft, Brutnebel |
| Kriegsherr Gor'thak | Ork | Irokesenkamm, eiserne Kieferplatte, Kriegsbemalung, Doppelaxt mit Glutschneiden, Stachelschild am Rücken | Erde |
| Eiskönig Hrim | Lich | Eiskrone, Eiszapfenbart, frostblaue Robe, Eisstab | Eis: Splitter kreisen, Schnee, Frostnebel |
| Urdrache Vharak | Drache | violettschwarz, Widderhörner, Feueradern | Feuer: Glut tropft, Funken |
| Banditenfürst Raku | Mensch | Ledermantel, Hut mit Feder, Augenklappe, Tuchmaske, Gurte über Kreuz, roter Umhang, Säbel und Dolch | Staub, Goldfunken |
| Gruftkönig Morvan | Ritter | Schädel mit Krone statt Helm, rostige Rüstung, zerfetzter Umhang | Tod: Seelenfeuer |
| Naga-Königin Sseth | Naga | blau, Fächer aus Goldblättern, Dreizack, Rundschild | Gift |
| Titanenkönig Kroth | Riese | Fels mit Schmiedeglut in den Fugen, Steinkrone mit Glutsteinen, Steinbart, Steinhammer | Schmiede: Glut, Funken |
| Skadi | Wolf | weiße Eiswölfin mit Eiskristallen am Rücken | Eis: Atem, Schnee |
| Ilva | Herrin | Frostgeist mit Kapuze, Saum in Nebelschwaden, Schneekugel | Eis: Flocken kreisen |
| Torbjörn | Riese | Golem aus kantigem Gletschereis, Eiskrone, Eisfäuste | Eis |
| Hrimfang | Riese | Yeti mit Zottelfell, blauem Gesicht, Eis-Widderhörnern, Eiskeule | Eis |
| Bjarki | Bär | Eisbär mit Eispanzer | Nordlicht |
| Aurra | Herrin | Nordlichtbögen über dem Kopf, leuchtendes Haar, Kristallschultern | Nordlicht: Schleier, Blitz zum Zepter |
| Sturmhorn | Bär (Mammutkopf) | Mammut: Rüssel, Stoßzähne, Zottelfell bis zum Boden, Reif | Eis |
| Jarl Hrimgar | Hüne | Yeti-Fürst, Jarlshelm, Eisen-Schultern, Umhang mit Pelzkragen, Doppelaxt | Nordlicht |
| Fenrik | Wolf | fauliger Moorwolf, freiliegende Rippen, Moos, Pusteln | Moor: Schleim, Faulgas |
| Hexe Morgrah | Herrin | Kapuze, Hakennase, Hakenstab mit Glimmkürbis | Gift |
| Moorschlund | Riese | Ghul mit Schlund (Zahnreihen, Zunge), vier Augen, Bauch mit Pusteln | Moor |
| Der Ertrunkene Ritter | Ritter | Topfhelm, Tang, Muscheln, Rost, abgebrochene Klinge | Wasser: tropft, Moornebel |
| Kantor der Gebeine | Gewand | Skelett im Chorgewand, Kapuze, Orgelpfeifen aus Knochen, Glockenstab | Tod |
| Seelenfänger Varis | Lich | Kapuze, Ketten, Seelenlaterne | Tod: Seelen kreisen |
| Der Knochenkoloss | Riese | Rippen, Wirbel, eingewachsene Schädel, Knochen ragen heraus, Knochenkeule | Knochen |
| Bischof Mortheim | Lich | Mitra, Stola, goldener Krummstab | Tod: Seelenfeuer |
| Raik | Wolf (Bock) | Widderhörner mit Blitzadern, Ziegenbart, Hufe | Sturm: Blitze zwischen den Hörnern |
| Blitzharpyie Kyra | Harpyie | Schnabelmaske, Federkamm, blaue Flügel, leuchtende Krallen | Sturm |
| Schmiedetroll Grumm | Hüne | Troll mit Hakennase, Hängeohren, Hauern, Lederschürze, Hammer mit Blitzrunen | Sturm |
| Hornbrecher Thorak | Hüne | Minotaurus, Nasenring, Hufe, Doppelaxt mit Blitzschneiden | Sturm |
| Windkreischerin Ssyla | Harpyie | weißgrau, hoher Federkamm, Federfächer | Himmel: Federn wirbeln |
| Steinwächter Grom | Dämon (Gargoyle) | Steinhaut, Schnauze, gebogene Hörner, Steinflügel | Sturm |
| Felsenhüter Ugrak | Riese | Felsplatten, Brocken mit Moos auf Schultern und Buckel | Erde |
| Sturmrufer Brontes | Riese | Gewitterhaut, Wolkenbart mit Blitzfunken, Wolkenumhang, Sturmstab | Himmel: Wolke, Blitze |
| Glutpranke Sahir | Wolf (Katze) | schwarz mit Glutstreifen | Feuer |
| Schlackenfaust | Riese | Schlacke, stumpfe Glut, Schlackenfäuste | Glut: Glut tropft |
| Flammentänzerin Ilyra | Dämonin | Haut aus Glut, Flammenhaar, zwei Sichelklingen | Feuer: Flammen kreisen |
| Ignaroth | Riese | Basalt mit Lavaadern, Magmahörner, offenes Glutherz | Feuer |
| Aschewächter Kael | Dämon | Aschehelm mit Glutkamm, Hellebarde, Schild | Glut |
| Brutmutter Ishra | Drache | orange, glühende Eier auf dem Rücken, kleine Flügel | Feuer |
| Rußdrache Vorr | Drache | rußschwarz, Widderhörner, zerfetzte Flughaut | Glut: schwarzer Rauch |
| Höllenschmied Barak | Dämon (Gargoyle) | schiefergraue Basalthaut, Schmiedehammer mit Glutbändern | Feuer |
| Glimra | Spinne | Spiegelglas, Kristallsplitter, gläserne Beine | Spiegel |
| Korvald Spiegelfaust | Riese | Golem aus blauviolettem Spiegelkristall | Spiegel |
| Ysolde | Herrin | Spiegelscheibe statt Gesicht, Kapuze, Nebelsaum | Spiegel |
| Brakkar Glasschwinge | Drache | Kristallstacheln, Kristallhörner und -schwanz | Kristall |
| Nachtkralle | Wolf (Katze) | Schattenkatze, violette Streifen, Leerensplitter, Klingenschwanz | Leere |
| Xul, der Hohle | Lich | Kapuze ohne Gesicht (Leere, zwei Augen) | Leere |
| Gharon | Riese | Golem aus Leerenkristall, Hörner, Ketten | Leere |
| Ritter Morvaine | Ritter | Hörnerhelm, Glefe | Leere |

Unterschiede innerhalb einer Instanz: in jeder Instanz haben die vier Wächter verschiedene Baupläne oder Köpfe (z. B.
Gletschergruft: Wölfin, Frostgeist, Eisgolem, Yeti; Thron der Leere: Katze, Lich, Golem, Ritter).

### Anbindung
- `gegner.js`: `raidTelegraph` ohne Lichtsäule (Stampfer, Nova) und Wirbel (Sturm) bei eigenen Modellen in 3D;
  `raidResolve` ohne Ring beim Einschlag (Brocken, Staub, Funken kommen aus `bosse3d.js`). Gilt auch für Paket 1/2.
- `drei-figuren.js`: kein pulsierender Bodenring (`a.aura`) unter Bossen mit eigenem Modell (auch Paket 1/2).
- `ausruestung.js` (`bossLoot`, Dungeon-Bosse und Wellenmeister): kein Ring und kein Bildschirmblitz beim Sieg über
  einen Boss mit eigenem Modell in 3D (der Tod läuft im Modell, Funken bleiben).
- `instanzen.js`: kein Bildschirmblitz beim Sieg über den Instanzboss und beim Erwachen nach dem Siegel (stattdessen
  Brüllen) bei eigenen Modellen in 3D.
- `bosse3d.js`: vier neue Effekt-Themen (Brut, Wasser, Staub, Schmiede).
- Dungeon-Bosse (Stampfer, Salve, Verstärkung), Wächter (Instanz-Angriffe, Geschossring, Brut) und Wellenmeister waren
  über `isBoss3` schon angebunden (Paket 2) – sie bekommen Posen und Effekte, sobald `BOSS3[id]` existiert.
- `index.html`, `sw.js`: `js/bosse3d-modelle3.js` in der Liste (Version unverändert).
- Mechanik und Balance unverändert: gleiche Angriffe, Zeiten, Schaden, Kreise, Kampfkreis (`m.r`).

## Messwerte

Dreiecke des sichtbaren Modells, der vereinfachten Stufe (LOD) und des Schattenmodells, Weltgröße (Höhe, vorher in
Klammern), Dreiecke vorher (Familienmodell):

| Boss | Dreiecke | einfach | Schatten | Höhe | vorher |
|---|---|---|---|---|---|
| Spinnenkönigin | 17.204 | 6.868 | 6.072 | 3,2 (2,9) | 8.426 |
| Kriegsherr Gor'thak | 18.248 | 9.188 | 4.908 | 5 (3) | 14.760 |
| Eiskönig Hrim | 12.012 | 5.104 | 3.488 | 5,4 (3,9) | 6.456 |
| Urdrache Vharak | 24.524 | 12.094 | 5.792 | 5,6 (2,9) | 14.302 |
| Banditenfürst Raku | 9.468 | 4.456 | 4.508 | 3,9 (2,9) | 13.784 |
| Gruftkönig Morvan | 12.370 | 6.840 | 5.232 | 5 (3,2) | 12.144 |
| Naga-Königin Sseth | 17.650 | 5.679 | 6.184 | 5,2 (2,5) | 9.430 |
| Titanenkönig Kroth | 8.520 | 4.706 | 4.476 | 5,2 (3,7) | 6.644 |
| Skadi | 12.508 | 5.852 | 4.448 | 4,6 (3,2) | 11.866 |
| Ilva | 9.474 | 4.160 | 3.764 | 5 (3,4) | 5.972 |
| Torbjörn | 5.528 | 2.886 | 4.260 | 4,8 (4) | 6.012 |
| Hrimfang | 15.240 | 9.958 | 3.576 | 5 (4,8) | 7.836 |
| Bjarki Eispranke | 12.944 | 6.162 | 3.984 | 4,8 (3,3) | 10.750 |
| Aurra | 10.322 | 4.555 | 4.124 | 5,2 (3,6) | 5.972 |
| Sturmhorn (Mammut) | 15.896 | 9.270 | 3.588 | 5,8 (4) | 7.326 |
| Jarl Hrimgar | 17.406 | 8.860 | 4.436 | 5,8 (5) | 7.836 |
| Fenrik, der Moorwolf | 13.956 | 6.544 | 4.052 | 4,6 (3,1) | 13.222 |
| Hexe Morgrah | 10.198 | 3.886 | 3.908 | 4,8 (3,4) | 12.774 |
| Moorschlund | 10.052 | 5.306 | 3.792 | 4,8 (4,1) | 8.140 |
| Der Ertrunkene Ritter | 11.502 | 6.953 | 5.160 | 5,8 (3,7) | 11.666 |
| Kantor der Gebeine | 9.936 | 3.992 | 3.480 | 5 (3,8) | 11.092 |
| Seelenfänger Varis | 12.734 | 5.607 | 3.092 | 5,2 (3,7) | 6.224 |
| Der Knochenkoloss | 15.064 | 7.190 | 4.404 | 4,9 (4,1) | 7.780 |
| Bischof Mortheim | 11.400 | 5.022 | 3.092 | 5,4 (4,8) | 12.088 |
| Raik, der Sturmbock | 10.488 | 5.690 | 4.016 | 4,4 (3,6) | 7.688 |
| Blitzharpyie Kyra | 14.454 | 7.075 | 5.088 | 4,8 (3,5) | 9.824 |
| Schmiedetroll Grumm | 11.056 | 6.164 | 4.204 | 5 (4,4) | 7.900 |
| Hornbrecher Thorak | 10.000 | 5.628 | 4.224 | 5,6 (5,1) | 8.288 |
| Windkreischerin Ssyla | 14.140 | 7.228 | 5.052 | 5 (3,7) | 9.824 |
| Steinwächter Grom | 15.660 | 7.032 | 5.328 | 5 (4) | 10.128 |
| Felsenhüter Ugrak | 6.432 | 3.154 | 4.260 | 5 (3,6) | 5.580 |
| Sturmrufer Brontes | 10.840 | 5.958 | 4.184 | 5,2 (4,1) | 8.012 |
| Glutpranke Sahir | 11.052 | 4.954 | 4.052 | 4,4 (3,2) | 11.414 |
| Schlackenfaust | 5.736 | 2.878 | 3.972 | 4,6 (3,8) | 5.220 |
| Flammentänzerin Ilyra | 15.848 | 7.786 | 5.364 | 5 (3,8) | 10.952 |
| Ignaroth | 6.956 | 3.630 | 4.080 | 5 (4,3) | 5.220 |
| Aschewächter Kael | 17.386 | 8.561 | 5.616 | 5,4 (3,8) | 10.952 |
| Brutmutter Ishra | 19.568 | 9.696 | 5.720 | 4,4 (2,7) | 13.858 |
| Rußdrache Vorr | 19.460 | 10.092 | 5.612 | 4,8 (2,8) | 13.930 |
| Höllenschmied Barak | 16.288 | 7.606 | 5.400 | 5,4 (4,1) | 10.320 |
| Glimra | 11.376 | 4.438 | 6.216 | 2,6 (3,1) | 8.460 |
| Korvald Spiegelfaust | 5.528 | 2.886 | 4.260 | 4,8 (4,3) | 5.772 |
| Ysolde | 9.610 | 4.492 | 4.088 | 5 (4,2) | 5.828 |
| Brakkar Glasschwinge | 16.500 | 8.468 | 6.188 | 4,6 (2,7) | 14.114 |
| Nachtkralle | 10.736 | 4.758 | 4.232 | 4,6 (3,4) | 11.154 |
| Xul, der Hohle | 10.534 | 5.176 | 3.200 | 5,4 (4,2) | 5.828 |
| Gharon | 6.664 | 3.284 | 4.152 | 4,8 (4,3) | 5.616 |
| Ritter Morvaine | 12.318 | 7.422 | 5.520 | 5,8 (3,8) | 13.092 |

- Alle unter 25.000 (größter: Urdrache 24.500). Wächter meist unter 15.000; darüber liegen die Drachen-Wächter (Ishra,
  Vorr 19.500, Brakkar 16.500 – mit `lite` schon um ~4.000 gesenkt), Jarl Hrimgar und Aschewächter Kael (17.400),
  Barak, Ilyra, Grom, Sturmhorn, Hrimfang (15.200–16.300). Ihre vereinfachte Stufe liegt bei 7.000–10.000.
- Jedes Modell wird einmal gebaut und aus dem Vorrat genommen (wie Paket 1/2), die vereinfachte Stufe nebenbei; drei
  Zeichenaufrufe je Boss plus Schatten. Die Höhe ist meist größer als vorher, aber kleiner als bei den Endbossen
  (Kampfkreis `m.r` unverändert).
- **Leistung mit mehreren Wächtern gleichzeitig** (Grafik „mittel“, 900×560, Gerätefaktor 1, Software-Rendering; vier
  Wächter + Instanzboss um den Spieler gezogen, KI läuft, 15 s; `perf82.js`):

| Instanz | Stand | Dreiecke im Bild (Median) | Zeichenaufrufe Median / 90 % | Zeit je Bild Median / 90 % |
|---|---|---|---|---|
| Gletschergruft (Skadi, Ilva, Torbjörn, Hrimfang, Hjelda) | vorher | 215.000 | 105 / 113 | 9,9 / 24,4 ms |
| | nachher | 228.000 | 107 / 151 | 10,1 / 48,3 ms |
| Aschenzitadelle (Kael, Ishra, Vorr, Barak, Vulkhar) | vorher | 221.000 | 93 / 99 | 10,5 / 22,2 ms |
| | nachher | 286.000 | 91 / 150 | 9,9 / 33,1 ms |

  Die Zeichenaufrufe in Ruhe bleiben gleich; die Spitzen (90 %) kommen von den 3D-Effekten der Angriffe, die jetzt
  laufen (vorher Säulen/Ringe in 2D-Effekten). Die Messung lief im Software-Renderer (swiftshader, ~3 Bilder/s) und
  zeigt nur die Größenordnung; der Median je Bild ist unverändert.

## Tests

- **Bilder im echten Spiel** (eigener Server Port 8823, vorher aus einer Kopie von 14.81 auf Port 8824, Stufe-80-Krieger,
  normale Kamera, Gerätefaktor 1, Boss-KI angehalten und gezielt gesteuert, Zeit nach Spielzeit): je Boss vorher
  (Ruhe, ein Spezialangriff) und nachher (Ruhe, Kampfbeginn mit Brüllen und Hieb, Spezialangriff Aufladen und
  Einschlag, Tod). Übersicht: Scratchpad `bosse82/collage.jpg` (48 Zeilen × 7 Bilder), Dungeon-Bosse zusätzlich
  `bosse82/collage_dungeon.jpg`. Spezialangriffe: Dungeon-Bosse Stampfer, Wächter je einer ihrer Instanz-Angriffe
  (Kegel, Hagel, Sog, Kern, Sturm, Kettenblitz, Kreuz, Lachen, Dornen). Modellbilder (Wiki-Ansicht) aller 48 in
  `bosse82/m/`.
- **Echte Kämpfe** (KI läuft, Spieler unverwundbar, Siegel aufgehoben, Leben in Stufen 72/55/45/28 %, danach Sieg und
  Todesanimation) für alle 48: keine Seitenfehler; gesehene Angriffe z. B. Hrimfang Sprung/Kegel/Kern, Hrimgar
  Sprung/Dornen/Kreuz, Morgrah Lachen/Hagel/Geschossring, Xul Kettenblitz/Geschossring/Ring, Brakkar Kegel/Sturm/Hagel.
- `node --check` aller geänderten Dateien; s73-Prüfung (Kopie auf Port 8823, alle 12 Charaktere, 2D): ohne Fehler;
  Mechanik-Test `dungeon/tm8781.js` (Port 8823): alle OK, keine Seitenfehler.
- Die Modelle aus Paket 1 und 2 bauen unverändert (Dreiecke von Fenris, Azaroth, Ignar, Kaldor, Vritra, Morrak,
  Gorbag, Ursus, Tempestra, Hjelda gleich wie in den Dokus).

## Offene Punkte

- Wächter mit mehr als 15.000 Dreiecken (Drachen-Wächter bis 19.600, siehe Messwerte); Vorschlag: weitere `lite`-Stufe
  (Flughaut mit weniger Unterteilung, weniger Rückenstacheln) – nicht umgesetzt.
- Wie in Paket 1/2: Posen und Effekte nur in 3D (2D unverändert); beim Mitspieler zeigen Dungeon-Bosse die
  Stampf-Pose erst beim Einschlag.
- Die Spinne nutzt das Vierbeiner-Skelett plus eigene Beinbewegung; Schatten sind grob (Kugeln je Teil wie bei allen
  Monstern), die Beine werfen daher einen etwas runden Schatten.
- Riesen-Wächter teilen sich Leib und Gestalt (Riese/Hüne) und unterscheiden sich durch Kopf, Bedeckung, Zubehör,
  Waffe und Farben. Innerhalb jeder Instanz sind die vier Wächter verschieden gebaut.
- Die Größen wurden während der Aufnahmen angepasst (Riesen kleiner); Titanenkönig, Torbjörn und Hrimfang wurden
  danach neu aufgenommen, alle anderen Bilder zeigen schon die endgültige Größe. Die Modellbilder in `bosse82/m/` sind
  ein Zwischenstand (vor der Größenanpassung und kleinen Farbkorrekturen).
- Barak hat nach den Bildern eine dunklere Basalthaut bekommen (zur Unterscheidung von Kael); die Collage zeigt die
  neue Farbe.

## Dateien
js/bosse3d-modelle3.js (neu), js/bosse3d.js, js/bosse3d-modelle.js, js/bosse3d-modelle2.js, js/gegner.js,
js/drei-figuren.js, js/ausruestung.js, js/instanzen.js, index.html, sw.js, docs/bosse-82.md.
